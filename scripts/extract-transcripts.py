#!/usr/bin/env python3
"""
Bulk transcript extractor for Creator Intelligence Platform.
Pulls transcripts for all videos in the raiser DB using yt-dlp with cookies.
"""

import subprocess
import json
import sys
import time
import re
import os

DB_USER = "content_intel"
DB_NAME = "raiser"
COOKIES_PATH = "/tmp/cookies.txt"
BATCH_SIZE = 10
SLEEP_BETWEEN = 2  # seconds between batches to avoid rate limiting

def run_sql(query):
    """Run SQL and return rows as list of dicts."""
    result = subprocess.run(
        ["docker", "exec", "raiser-postgres", "psql", "-U", DB_USER, "-d", DB_NAME,
         "-t", "-A", "-F", "|", "-c", query],
        capture_output=True, text=True, timeout=30
    )
    if result.returncode != 0:
        print(f"SQL Error: {result.stderr}", file=sys.stderr)
        return []
    rows = []
    for line in result.stdout.strip().split('\n'):
        if line.strip():
            rows.append(line.strip())
    return rows

def get_video_url_from_id(video_id):
    """Construct YouTube URL from video ID or URL."""
    if video_id.startswith('http'):
        return video_id
    return f"https://www.youtube.com/watch?v={video_id}"

def extract_transcript(video_url):
    """Extract transcript using yt-dlp. Returns transcript text or None."""
    try:
        result = subprocess.run(
            ["docker", "exec", "raiser-youtubedl", "yt-dlp",
             "--cookies", COOKIES_PATH,
             "--write-subs", "--write-auto-subs",
             "--sub-langs", "en*", "--sub-format", "vtt",
             "--skip-download",
             "-o", "/tmp/transcript_%(id)s",
             video_url],
            capture_output=True, text=True, timeout=60
        )
        
        # Find the subtitle file
        ls_result = subprocess.run(
            ["docker", "exec", "raiser-youtubedl", "sh", "-c",
             "ls /tmp/transcript_*.vtt 2>/dev/null"],
            capture_output=True, text=True, timeout=10
        )
        
        if not ls_result.stdout.strip():
            return None
        
        vtt_file = ls_result.stdout.strip().split('\n')[0]
        
        # Read the VTT content
        cat_result = subprocess.run(
            ["docker", "exec", "raiser-youtubedl", "cat", vtt_file],
            capture_output=True, text=True, timeout=10
        )
        
        # Clean up the file
        subprocess.run(
            ["docker", "exec", "raiser-youtubedl", "sh", "-c",
             "rm -f /tmp/transcript_*"],
            capture_output=True, timeout=10
        )
        
        if cat_result.stdout:
            return vtt_to_text(cat_result.stdout)
        return None
        
    except subprocess.TimeoutExpired:
        print(f"  Timeout extracting {video_url}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  Error: {e}", file=sys.stderr)
        return None

def vtt_to_text(vtt_content):
    """Convert VTT subtitle content to clean text."""
    lines = vtt_content.split('\n')
    text_lines = []
    seen = set()
    
    for line in lines:
        line = line.strip()
        # Skip VTT headers, timestamps, and empty lines
        if not line or line.startswith('WEBVTT') or line.startswith('Kind:') or line.startswith('Language:'):
            continue
        if '-->' in line:
            continue
        if line.startswith('NOTE'):
            continue
        # Remove HTML tags
        clean = re.sub(r'<[^>]+>', '', line)
        clean = clean.strip()
        if clean and clean not in seen:
            seen.add(clean)
            text_lines.append(clean)
    
    return ' '.join(text_lines)

def update_transcript(content_id, transcript):
    """Update the transcript in the database."""
    # Escape single quotes for SQL
    safe_transcript = transcript.replace("'", "''")
    # Truncate if too long (PostgreSQL text type is unlimited but be sensible)
    if len(safe_transcript) > 500000:
        safe_transcript = safe_transcript[:500000]
    
    query = f"UPDATE content.content SET description = '{safe_transcript}' WHERE id = {content_id};"
    result = subprocess.run(
        ["docker", "exec", "raiser-postgres", "psql", "-U", "postgres", "-d", DB_NAME,
         "-c", query],
        capture_output=True, text=True, timeout=30
    )
    return result.returncode == 0

def main():
    # Get all videos without transcripts
    print("Fetching videos without transcripts...")
    rows = run_sql("""
        SELECT id || '|' || url || '|' || title 
        FROM content.content 
        WHERE (description IS NULL OR description = '' OR description = '[no transcript]')
        ORDER BY id
    """)
    
    total = len(rows)
    print(f"Found {total} videos needing transcripts")
    
    success = 0
    failed = 0
    
    for i, row in enumerate(rows):
        parts = row.split('|', 2)
        if len(parts) < 2:
            continue
        
        content_id = parts[0]
        url = parts[1]
        title = parts[2] if len(parts) > 2 else "Unknown"
        
        print(f"\n[{i+1}/{total}] {title[:60]}...")
        
        transcript = extract_transcript(url)
        
        if transcript and len(transcript) > 50:
            if update_transcript(int(content_id), transcript):
                success += 1
                print(f"  ✅ Saved ({len(transcript)} chars)")
            else:
                failed += 1
                print(f"  ❌ DB update failed")
        else:
            failed += 1
            print(f"  ⏭️  No transcript available")
        
        # Rate limiting
        if (i + 1) % BATCH_SIZE == 0:
            print(f"\n--- Batch complete. {success} success, {failed} failed. Sleeping {SLEEP_BETWEEN}s ---")
            time.sleep(SLEEP_BETWEEN)
    
    print(f"\n{'='*50}")
    print(f"DONE: {success} transcripts extracted, {failed} failed/unavailable")
    print(f"Total: {success}/{total} ({success/total*100:.1f}%)")

if __name__ == "__main__":
    main()
