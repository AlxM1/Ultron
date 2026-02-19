import logging
import os
from database import (
    update_persona_status, get_persona_by_id,
    create_content_record, update_content_status,
    get_content_for_persona, update_persona_profile,
    get_existing_source_urls
)

logger = logging.getLogger("pipeline")


async def run_full_pipeline(persona_id: int, twitter_url: str = None):
    try:
        persona = await get_persona_by_id(persona_id)
        logger.info(f"Starting pipeline for: {persona['name']} ({persona['source_url']})")

        # Step 1: Scrape
        await update_persona_status(persona_id, "scraping")

        if persona["platform"] in ("youtube", "both"):
            from scrapers.youtube import scrape_youtube_channel
            videos = await scrape_youtube_channel(
                persona["source_url"],
                max_videos=persona["max_videos"],
            )
            for video in videos:
                await create_content_record(
                    persona_id=persona_id,
                    source_url=video["url"],
                    content_type="youtube_video",
                    title=video["title"],
                    metadata=video.get("metadata", {}),
                    duration_secs=video.get("duration"),
                )
            logger.info(f"Found {len(videos)} YouTube videos")

        if persona["platform"] in ("twitter", "both") and twitter_url:
            from scrapers.twitter import scrape_twitter_profile
            tweets = await scrape_twitter_profile(twitter_url)
            for tweet in tweets:
                await create_content_record(
                    persona_id=persona_id,
                    source_url=tweet["url"],
                    content_type="tweet",
                    title=tweet.get("text", "")[:100],
                    transcript=tweet.get("text", ""),
                    metadata=tweet.get("metadata", {}),
                    word_count=len(tweet.get("text", "").split()),
                )
            logger.info(f"Found {len(tweets)} tweets")

        # Step 2 & 3: Download + Transcribe
        await update_persona_status(persona_id, "transcribing")

        content_items = await get_content_for_persona(persona_id, content_type="youtube_video")
        total = len(content_items)

        for i, item in enumerate(content_items):
            if item["status"] == "analyzed":
                continue

            logger.info(f"Processing {i+1}/{total}: {item['title']}")

            try:
                await update_content_status(item["id"], "downloading")
                from scrapers.youtube import download_audio
                audio_path = await download_audio(item["source_url"])

                if not audio_path:
                    await update_content_status(item["id"], "error", "Download failed")
                    continue

                await update_content_status(item["id"], "transcribing")
                from transcriber import transcribe_audio
                transcript = await transcribe_audio(audio_path)

                if not transcript:
                    await update_content_status(item["id"], "error", "Transcription failed")
                    continue

                word_count = len(transcript.split())
                await update_content_status(
                    item["id"], "analyzed",
                    transcript=transcript,
                    word_count=word_count,
                )
                logger.info(f"  Transcribed: {word_count} words")

                if audio_path and os.path.exists(audio_path):
                    os.remove(audio_path)

            except Exception as e:
                logger.error(f"  Error processing {item['title']}: {e}")
                await update_content_status(item["id"], "error", str(e))
                continue

        # Step 4 & 5: Analyze + Generate system prompt
        await run_analysis(persona_id)

        logger.info(f"Pipeline complete for: {persona['name']}")

    except Exception as e:
        logger.error(f"Pipeline failed for persona {persona_id}: {e}")
        await update_persona_status(persona_id, "error", str(e))


async def run_analysis(persona_id: int):
    from analyzer import analyze_persona

    await update_persona_status(persona_id, "analyzing")
    persona = await get_persona_by_id(persona_id)
    content = await get_content_for_persona(persona_id)

    transcripts = []
    for item in content:
        if item.get("transcript"):
            transcripts.append({
                "title": item["title"],
                "transcript": item["transcript"],
                "type": item["content_type"],
            })

    if not transcripts:
        await update_persona_status(persona_id, "error", "No transcripts to analyze")
        return

    profile = await analyze_persona(persona["name"], transcripts)

    total_words = sum(len(t["transcript"].split()) for t in transcripts)

    await update_persona_profile(
        persona_id,
        system_prompt=profile["system_prompt"],
        personality_summary=profile["personality_summary"],
        speaking_style=profile["speaking_style"],
        topics=profile["topics"],
        catchphrases=profile["catchphrases"],
        vocabulary=profile["vocabulary"],
        tone_descriptors=profile["tone_descriptors"],
        total_content=len(transcripts),
        total_words=total_words,
    )

    await update_persona_status(persona_id, "ready")


async def run_incremental_update(persona_id: int):
    try:
        persona = await get_persona_by_id(persona_id)
        if not persona or persona["status"] not in ("ready", "updating"):
            logger.warning(f"Skipping incremental update for persona {persona_id}: status={persona['status'] if persona else 'not found'}")
            return

        logger.info(f"Starting incremental update for: {persona['name']}")
        await update_persona_status(persona_id, "updating")

        # Scrape current videos
        existing_urls = await get_existing_source_urls(persona_id)

        new_videos = []
        if persona["platform"] in ("youtube", "both"):
            from scrapers.youtube import scrape_youtube_channel
            videos = await scrape_youtube_channel(
                persona["source_url"],
                max_videos=persona["max_videos"],
            )
            new_videos = [v for v in videos if v["url"] not in existing_urls]

        if not new_videos:
            logger.info(f"No new content found for {persona['name']}, skipping update")
            await update_persona_status(persona_id, "ready")
            return

        logger.info(f"Found {len(new_videos)} new videos for {persona['name']}")

        # Create content records for new videos
        new_content_ids = []
        for video in new_videos:
            record = await create_content_record(
                persona_id=persona_id,
                source_url=video["url"],
                content_type="youtube_video",
                title=video["title"],
                metadata=video.get("metadata", {}),
                duration_secs=video.get("duration"),
            )
            new_content_ids.append(record["id"])

        # Download + transcribe new videos
        await update_persona_status(persona_id, "transcribing")
        content_items = await get_content_for_persona(persona_id, content_type="youtube_video")
        new_id_set = set(new_content_ids)
        new_items = [item for item in content_items if item["id"] in new_id_set]

        new_words = 0
        for i, item in enumerate(new_items):
            logger.info(f"Processing new {i+1}/{len(new_items)}: {item['title']}")
            try:
                await update_content_status(item["id"], "downloading")
                from scrapers.youtube import download_audio
                audio_path = await download_audio(item["source_url"])

                if not audio_path:
                    await update_content_status(item["id"], "error", "Download failed")
                    continue

                await update_content_status(item["id"], "transcribing")
                from transcriber import transcribe_audio
                transcript = await transcribe_audio(audio_path)

                if not transcript:
                    await update_content_status(item["id"], "error", "Transcription failed")
                    continue

                word_count = len(transcript.split())
                new_words += word_count
                await update_content_status(
                    item["id"], "analyzed",
                    transcript=transcript,
                    word_count=word_count,
                )
                logger.info(f"  Transcribed: {word_count} words")

                if audio_path and os.path.exists(audio_path):
                    os.remove(audio_path)

            except Exception as e:
                logger.error(f"  Error processing {item['title']}: {e}")
                await update_content_status(item["id"], "error", str(e))
                continue

        # Re-analyze with all content (old + new)
        await run_analysis(persona_id)

        logger.info(f"Updated {persona['name']}: +{len(new_videos)} new videos, {new_words} new words")

    except Exception as e:
        logger.error(f"Incremental update failed for persona {persona_id}: {e}")
        await update_persona_status(persona_id, "error", str(e))
