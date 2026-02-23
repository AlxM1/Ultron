#!/usr/bin/env python3
"""
Retry Subtitle Extraction Script
Attempts to extract auto-generated subtitles from YouTube videos without transcripts
No cookies needed for auto-generated subs
"""

import os
import sys
import logging
import psycopg2
from youtube_transcript_api import YouTubeTranscriptApi
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

# Configuration
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "raiser"
DB_USER = "postgres"
DB_PASSWORD = "caf23a27b826a8f1d95a2a150fb2cf8fe5812d95854991af"
MAX_CONCURRENT = 5  # Subtitle extraction is lightweight
LOG_FILE = "/home/eternity/.openclaw/workspace/Ultron/scripts/subtitle-retry.log"

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

def get_videos_without_transcripts():
    """Query database for videos without transcripts"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT id, external_id, title 
        FROM content.content 
        WHERE platform = 'youtube' 
        AND (description IS NULL OR description = '' OR description = '[no transcript]')
        ORDER BY id
    """
    
    cursor.execute(query)
    videos = cursor.fetchall()
    cursor.close()
    conn.close()
    
    return videos

def extract_transcript(video_id):
    """Extract transcript using youtube-transcript-api"""
    try:
        # Try to get transcript (will fetch auto-generated if available)
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        
        # Combine all text segments
        full_transcript = ' '.join([entry['text'] for entry in transcript_list])
        return full_transcript.strip()
    
    except Exception as e:
        logger.debug(f"No transcript available for {video_id}: {e}")
        return None

def update_transcript(video_db_id, transcript):
    """Update database with transcript"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "UPDATE content.content SET description = %s WHERE id = %s",
            (transcript, video_db_id)
        )
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Error updating database for video {video_db_id}: {e}")
        conn.rollback()
        cursor.close()
        conn.close()
        return False

def process_video(video_data):
    """Process a single video: try to extract subtitles"""
    db_id, video_id, title = video_data
    
    logger.debug(f"Checking: {video_id} - {title[:50]}...")
    
    try:
        # Try to extract transcript
        transcript = extract_transcript(video_id)
        
        if transcript and len(transcript) > 50:  # Require at least 50 chars
            # Update database
            if update_transcript(db_id, transcript):
                logger.info(f"✓ Found subtitle for {video_id} ({len(transcript)} chars)")
                return {"status": "success", "video_id": video_id, "length": len(transcript)}
            else:
                logger.error(f"Failed to update DB for {video_id}")
                return {"status": "failed", "video_id": video_id, "reason": "db_error"}
        else:
            # No subtitle available - leave for Whisper processing
            return {"status": "no_subtitle", "video_id": video_id}
    
    except Exception as e:
        logger.error(f"Error processing {video_id}: {e}")
        return {"status": "error", "video_id": video_id, "reason": str(e)}

def main():
    logger.info("=" * 80)
    logger.info("Starting Subtitle Retry Extraction")
    logger.info("=" * 80)
    
    # Get videos without transcripts
    logger.info("Querying database for videos without transcripts...")
    videos = get_videos_without_transcripts()
    total_videos = len(videos)
    
    logger.info(f"Found {total_videos} videos to check for subtitles")
    
    if total_videos == 0:
        logger.info("No videos to process. Exiting.")
        return
    
    # Process videos with thread pool
    success_count = 0
    no_subtitle_count = 0
    failed_count = 0
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=MAX_CONCURRENT) as executor:
        futures = {executor.submit(process_video, video): video for video in videos}
        
        for i, future in enumerate(as_completed(futures), 1):
            result = future.result()
            
            if result["status"] == "success":
                success_count += 1
            elif result["status"] == "no_subtitle":
                no_subtitle_count += 1
            else:
                failed_count += 1
            
            # Progress update every 100 videos
            if i % 100 == 0:
                elapsed = time.time() - start_time
                rate = i / elapsed * 60  # videos per minute
                remaining = total_videos - i
                eta_minutes = remaining / rate if rate > 0 else 0
                
                logger.info(f"Progress: {i}/{total_videos} ({i/total_videos*100:.1f}%) | "
                           f"Found: {success_count} | None: {no_subtitle_count} | "
                           f"Rate: {rate:.1f}/min | ETA: {eta_minutes:.1f}min")
    
    # Final report
    elapsed_total = time.time() - start_time
    logger.info("=" * 80)
    logger.info(f"Subtitle Extraction Complete!")
    logger.info(f"Total: {total_videos} | Found: {success_count} | None: {no_subtitle_count} | Failed: {failed_count}")
    logger.info(f"Time: {elapsed_total/60:.1f} minutes")
    logger.info(f"Videos remaining for Whisper: {no_subtitle_count + failed_count}")
    logger.info("=" * 80)

if __name__ == "__main__":
    main()
