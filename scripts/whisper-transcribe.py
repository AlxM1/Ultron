#!/usr/bin/env python3
"""
GPU Whisper Transcription Script
Transcribes YouTube videos without subtitles using GPU Whisper API
"""

import os
import sys
import time
import logging
import psycopg2
import requests
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# Configuration
WHISPER_API = "http://10.25.10.60:8765/transcribe"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "raiser"
DB_USER = "postgres"
DB_PASSWORD = "caf23a27b826a8f1d95a2a150fb2cf8fe5812d95854991af"
MAX_CONCURRENT = 1  # VPN throttles YouTube - sequential to avoid timeouts
LOG_FILE = "/home/eternity/.openclaw/workspace/Ultron/scripts/whisper-progress.log"
BATCH_SIZE = 100  # Process in batches to commit progress

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

def get_videos_without_transcripts(limit=None):
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
    
    if limit:
        query += f" LIMIT {limit}"
    
    cursor.execute(query)
    videos = cursor.fetchall()
    cursor.close()
    conn.close()
    
    return videos

def download_audio(video_id, output_path):
    """Download audio from YouTube video using yt-dlp inside Docker container (bypasses VPN SSL issues)"""
    try:
        url = f"https://www.youtube.com/watch?v={video_id}"
        container_tmp = f"/tmp/audio_{video_id}"
        
        # Run yt-dlp INSIDE the Docker container where YouTube HTTPS works
        cmd = [
            "docker", "exec", "raiser-youtubedl",
            "yt-dlp",
            "--extract-audio",
            "--audio-format", "wav",
            "--audio-quality", "0",
            "--postprocessor-args", "ffmpeg:-ar 16000 -ac 1",
            "--no-playlist",
            "--no-cookies",
            "--extractor-args", "youtube:player_client=android_vr",
            "--socket-timeout", "60",
            "--retries", "5",
            "-o", container_tmp,
            url
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        if result.returncode != 0:
            logger.error(f"yt-dlp failed for {video_id}: {result.stderr[-200:]}")
            return None
        
        # Copy the WAV file out of the container
        container_wav = container_tmp + ".wav"
        local_wav = output_path + ".wav" if not output_path.endswith('.wav') else output_path
        
        cp_result = subprocess.run(
            ["docker", "cp", f"raiser-youtubedl:{container_wav}", local_wav],
            capture_output=True, text=True, timeout=30
        )
        
        # Clean up inside container
        subprocess.run(["docker", "exec", "raiser-youtubedl", "rm", "-f", container_wav, container_tmp],
                       capture_output=True, timeout=10)
        
        if cp_result.returncode == 0 and os.path.exists(local_wav):
            return local_wav
        else:
            logger.error(f"Failed to copy WAV from container for {video_id}")
            return None
            
    except subprocess.TimeoutExpired:
        logger.error(f"Timeout downloading audio for {video_id}")
        return None
    except Exception as e:
        logger.error(f"Error downloading audio for {video_id}: {e}")
        return None

def transcribe_audio(audio_file):
    """Send audio to GPU Whisper API for transcription"""
    try:
        with open(audio_file, 'rb') as f:
            files = {'audio': f}
            response = requests.post(WHISPER_API, files=files, timeout=600)
        
        if response.status_code == 200:
            result = response.json()
            return result.get('text', '').strip()
        else:
            logger.error(f"Whisper API error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        logger.error(f"Error transcribing audio: {e}")
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
    """Process a single video: download, transcribe, update DB"""
    db_id, video_id, title = video_data
    
    logger.info(f"Processing: {video_id} - {title[:50]}...")
    
    # Create temporary file for audio
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        audio_path = tmp.name
    
    try:
        # Download audio
        logger.info(f"Downloading audio for {video_id}...")
        wav_file = download_audio(video_id, audio_path.replace('.wav', ''))
        
        if not wav_file:
            logger.warning(f"Failed to download audio for {video_id}, marking as failed")
            update_transcript(db_id, "[no audio available]")
            return {"status": "failed", "video_id": video_id, "reason": "download_failed"}
        
        # Transcribe
        logger.info(f"Transcribing {video_id}...")
        transcript = transcribe_audio(wav_file)
        
        if not transcript:
            logger.warning(f"Failed to transcribe {video_id}")
            update_transcript(db_id, "[transcription failed]")
            return {"status": "failed", "video_id": video_id, "reason": "transcription_failed"}
        
        # Update database
        if update_transcript(db_id, transcript):
            logger.info(f"✓ Successfully transcribed {video_id} ({len(transcript)} chars)")
            return {"status": "success", "video_id": video_id, "length": len(transcript)}
        else:
            logger.error(f"Failed to update database for {video_id}")
            return {"status": "failed", "video_id": video_id, "reason": "db_update_failed"}
    
    except Exception as e:
        logger.error(f"Unexpected error processing {video_id}: {e}")
        return {"status": "failed", "video_id": video_id, "reason": str(e)}
    
    finally:
        # Cleanup temporary files
        for f in [audio_path, audio_path.replace('.wav', '') + '.wav']:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except:
                    pass

def main():
    logger.info("=" * 80)
    logger.info("Starting GPU Whisper Transcription")
    logger.info("=" * 80)
    
    # Get videos without transcripts
    logger.info("Querying database for videos without transcripts...")
    videos = get_videos_without_transcripts()
    total_videos = len(videos)
    
    logger.info(f"Found {total_videos} videos to transcribe")
    
    if total_videos == 0:
        logger.info("No videos to process. Exiting.")
        return
    
    # Estimate time (rough estimate: 1-2 minutes per video)
    estimated_minutes = (total_videos * 1.5) / MAX_CONCURRENT
    logger.info(f"Estimated time: ~{estimated_minutes:.1f} minutes ({estimated_minutes/60:.1f} hours)")
    
    # Process videos with thread pool
    success_count = 0
    failed_count = 0
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=MAX_CONCURRENT) as executor:
        futures = {executor.submit(process_video, video): video for video in videos}
        
        for i, future in enumerate(as_completed(futures), 1):
            result = future.result()
            
            if result["status"] == "success":
                success_count += 1
            else:
                failed_count += 1
            
            # Progress update every 10 videos
            if i % 10 == 0:
                elapsed = time.time() - start_time
                rate = i / elapsed * 60  # videos per minute
                remaining = total_videos - i
                eta_minutes = remaining / rate if rate > 0 else 0
                
                logger.info(f"Progress: {i}/{total_videos} ({i/total_videos*100:.1f}%) | "
                           f"Success: {success_count} | Failed: {failed_count} | "
                           f"Rate: {rate:.1f}/min | ETA: {eta_minutes:.1f}min")
    
    # Final report
    elapsed_total = time.time() - start_time
    logger.info("=" * 80)
    logger.info(f"Transcription Complete!")
    logger.info(f"Total: {total_videos} | Success: {success_count} | Failed: {failed_count}")
    logger.info(f"Time: {elapsed_total/60:.1f} minutes ({elapsed_total/3600:.1f} hours)")
    logger.info(f"Success Rate: {success_count/total_videos*100:.1f}%")
    logger.info("=" * 80)

if __name__ == "__main__":
    main()
