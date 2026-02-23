"""YouTube scraper for persona-pipeline.

Calls raiser-apify (APIFY_URL) for channel metadata scraping,
and raiser-youtubedl (YOUTUBEDL_URL) for audio downloading.
"""

import asyncio
import logging
import os
import tempfile
from typing import Optional

import httpx

logger = logging.getLogger("scrapers.youtube")

APIFY_URL = os.getenv("APIFY_URL", "http://raiser-apify:8000")
YOUTUBEDL_URL = os.getenv("YOUTUBEDL_URL", "http://raiser-youtubedl:8000")
YOUTUBEDL_API_KEY = os.getenv("YOUTUBEDL_API_KEY", "")

# Apify job poll settings
POLL_INTERVAL = 3.0     # seconds between status checks
MAX_WAIT_SECS = 300.0   # 5 min max for a scrape job


async def scrape_youtube_channel(url: str, max_videos: int = 50) -> list[dict]:
    """Scrape YouTube channel metadata via the apify service.

    Args:
        url: YouTube channel URL (e.g. https://youtube.com/@ChannelName)
        max_videos: Maximum number of videos to fetch

    Returns:
        List of dicts with keys: url, title, metadata, duration
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Launch scrape job
        try:
            resp = await client.post(
                f"{APIFY_URL}/api/scrapes",
                json={
                    "platform": "youtube",
                    "action": "posts",
                    "target": url,
                    "max_results": max_videos,
                },
            )
            resp.raise_for_status()
            job = resp.json()
            job_id = job["id"]
            logger.info(f"Apify scrape job {job_id} launched for {url}")
        except Exception as e:
            logger.error(f"Failed to launch apify scrape job: {e}")
            return []

        # Poll until done
        elapsed = 0.0
        while elapsed < MAX_WAIT_SECS:
            await asyncio.sleep(POLL_INTERVAL)
            elapsed += POLL_INTERVAL
            try:
                status_resp = await client.get(f"{APIFY_URL}/api/scrapes/{job_id}")
                status_resp.raise_for_status()
                job_data = status_resp.json()
                status = job_data.get("status", "unknown")
                logger.debug(f"Job {job_id} status: {status} ({job_data.get('result_count', 0)} results)")
                if status == "completed":
                    break
                if status in ("failed", "cancelled"):
                    logger.error(f"Apify job {job_id} failed: {job_data.get('error')}")
                    return []
            except Exception as e:
                logger.warning(f"Error polling job {job_id}: {e}")
                continue
        else:
            logger.error(f"Apify job {job_id} timed out after {MAX_WAIT_SECS}s")
            return []

        # Transform results
        results = []
        for item in job_data.get("results", []):
            data = item.get("data", {})
            video_url = item.get("url") or data.get("webpage_url", "")
            if not video_url:
                continue
            results.append({
                "url": video_url,
                "title": data.get("title", ""),
                "duration": data.get("duration"),
                "metadata": {
                    "video_id": data.get("video_id", ""),
                    "channel_name": data.get("channel_name", ""),
                    "upload_date": data.get("upload_date", ""),
                    "view_count": data.get("view_count"),
                    "like_count": data.get("like_count"),
                    "thumbnail": data.get("thumbnail", ""),
                    "tags": data.get("tags", []),
                    "description": data.get("description", ""),
                },
            })

        logger.info(f"Scraped {len(results)} videos from {url}")
        return results


async def download_audio(video_url: str) -> Optional[str]:
    """Download audio from a YouTube video via the youtubedl service.

    Args:
        video_url: YouTube video URL

    Returns:
        Path to a temporary audio file, or None on failure.
        Caller is responsible for deleting the file after use.
    """
    headers = {}
    if YOUTUBEDL_API_KEY:
        headers["X-API-Key"] = YOUTUBEDL_API_KEY

    async with httpx.AsyncClient(timeout=60.0) as client:
        # Step 1: Extract available formats
        try:
            resp = await client.post(
                f"{YOUTUBEDL_URL}/api/extract",
                json={"url": video_url},
                headers=headers,
            )
            resp.raise_for_status()
            info = resp.json()
        except Exception as e:
            logger.error(f"Failed to extract formats for {video_url}: {e}")
            return None

        # Step 2: Pick the best audio-only format (prefer m4a)
        formats = info.get("formats", [])
        audio_formats = [
            f for f in formats
            if f.get("has_audio") and not f.get("has_video")
        ]
        if not audio_formats:
            # Fallback: lowest resolution video+audio (smallest file)
            audio_formats = [f for f in formats if f.get("has_audio")]

        if not audio_formats:
            logger.error(f"No audio formats found for {video_url}")
            return None

        # Prefer m4a audio-only, then any audio-only, then smallest video+audio
        m4a = [f for f in audio_formats if f.get("ext") == "m4a"]
        chosen = (m4a or audio_formats)[0]
        format_id = chosen["format_id"]
        format_note = chosen.get("note", "")
        logger.info(f"Downloading audio for {video_url}: format {format_id} ({format_note})")

        # Step 3: Start download
        try:
            resp = await client.post(
                f"{YOUTUBEDL_URL}/api/download",
                json={"url": video_url, "format_id": format_id, "format_note": format_note},
                headers=headers,
            )
            resp.raise_for_status()
            dl = resp.json()
            dl_id = dl["id"]
        except Exception as e:
            logger.error(f"Failed to start download for {video_url}: {e}")
            return None

        # Step 4: Poll until download completes
        async with httpx.AsyncClient(timeout=600.0) as long_client:
            deadline = 480.0  # 8 min max for download
            elapsed = 0.0
            while elapsed < deadline:
                await asyncio.sleep(5.0)
                elapsed += 5.0
                try:
                    prog_resp = await long_client.get(
                        f"{YOUTUBEDL_URL}/api/downloads",
                        headers=headers,
                    )
                    prog_resp.raise_for_status()
                    downloads = prog_resp.json()
                    dl_info = next((d for d in downloads if d["id"] == dl_id), None)
                    if not dl_info:
                        logger.error(f"Download {dl_id} not found in list")
                        return None
                    dl_status = dl_info.get("status", "")
                    logger.debug(f"Download {dl_id} status: {dl_status} ({dl_info.get('progress', 0):.0f}%)")
                    if dl_status == "completed":
                        break
                    if dl_status == "failed":
                        logger.error(f"Download {dl_id} failed: {dl_info.get('error')}")
                        return None
                except Exception as e:
                    logger.warning(f"Error polling download {dl_id}: {e}")
                    continue
            else:
                logger.error(f"Download {dl_id} timed out")
                return None

            # Step 5: Fetch the file
            try:
                file_resp = await long_client.get(
                    f"{YOUTUBEDL_URL}/api/downloads/{dl_id}/file",
                    headers=headers,
                )
                file_resp.raise_for_status()
            except Exception as e:
                logger.error(f"Failed to fetch downloaded file {dl_id}: {e}")
                return None

        # Determine extension from Content-Disposition or format
        ext = "." + (chosen.get("ext") or "m4a")
        tmp = tempfile.NamedTemporaryFile(
            suffix=ext,
            delete=False,
            prefix="persona_audio_",
        )
        try:
            tmp.write(file_resp.content)
            tmp.flush()
            tmp.close()
        except Exception as e:
            logger.error(f"Failed to write audio temp file: {e}")
            try:
                os.unlink(tmp.name)
            except Exception:
                pass
            return None

        # Optionally clean up the download record on the youtubedl service
        try:
            async with httpx.AsyncClient(timeout=10.0) as cleanup_client:
                await cleanup_client.delete(
                    f"{YOUTUBEDL_URL}/api/downloads/{dl_id}",
                    headers=headers,
                )
        except Exception:
            pass  # Non-fatal

        logger.info(f"Audio downloaded to {tmp.name} ({len(file_resp.content)} bytes)")
        return tmp.name
