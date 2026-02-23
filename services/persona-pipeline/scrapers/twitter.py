"""Twitter/X scraper for persona-pipeline.

Calls raiser-apify (APIFY_URL) for profile scraping.
"""

import asyncio
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger("scrapers.twitter")

APIFY_URL = os.getenv("APIFY_URL", "http://raiser-apify:8000")

# Apify job poll settings
POLL_INTERVAL = 3.0     # seconds
MAX_WAIT_SECS = 300.0   # 5 min max


async def scrape_twitter_profile(url: str, max_tweets: int = 100) -> list[dict]:
    """Scrape Twitter/X profile posts via the apify service.

    Args:
        url: Twitter/X profile URL or username

    Returns:
        List of dicts with keys: url, text, metadata
    """
    # Normalize target: extract username from URL if needed
    target = url
    if "twitter.com/" in url or "x.com/" in url:
        # Keep as-is; apify accepts URLs
        pass

    async with httpx.AsyncClient(timeout=60.0) as client:
        # Launch scrape job
        try:
            resp = await client.post(
                f"{APIFY_URL}/api/scrapes",
                json={
                    "platform": "twitter",
                    "action": "posts",
                    "target": target,
                    "max_results": max_tweets,
                },
            )
            resp.raise_for_status()
            job = resp.json()
            job_id = job["id"]
            logger.info(f"Apify Twitter scrape job {job_id} launched for {url}")
        except Exception as e:
            logger.error(f"Failed to launch Twitter apify scrape job: {e}")
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
                if status == "completed":
                    break
                if status in ("failed", "cancelled"):
                    logger.error(f"Twitter apify job {job_id} failed: {job_data.get('error')}")
                    return []
            except Exception as e:
                logger.warning(f"Error polling Twitter job {job_id}: {e}")
                continue
        else:
            logger.error(f"Twitter apify job {job_id} timed out")
            return []

        # Transform results
        results = []
        for item in job_data.get("results", []):
            data = item.get("data", {})
            tweet_url = item.get("url") or data.get("url", "")
            text = data.get("text", "") or data.get("content", "") or data.get("tweet_text", "")
            if not text:
                continue
            results.append({
                "url": tweet_url,
                "text": text,
                "metadata": {
                    "author": data.get("author", "") or data.get("username", ""),
                    "like_count": data.get("like_count", 0),
                    "retweet_count": data.get("retweet_count", 0),
                    "timestamp": data.get("timestamp") or data.get("created_at", ""),
                },
            })

        logger.info(f"Scraped {len(results)} tweets from {url}")
        return results
