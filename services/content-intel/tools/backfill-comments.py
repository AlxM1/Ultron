#!/usr/bin/env python3
"""Backfill YouTube comments for creators with zero comments."""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

import psycopg2

DB = dict(host="127.0.0.1", port=5432, dbname="content_intel", user="content_intel", password="content_intel")

POSITIVE = {"love", "amazing", "great", "awesome", "excellent", "brilliant", "best", "incredible", "fantastic", "thank", "helpful", "insightful"}
NEGATIVE = {"hate", "terrible", "worst", "awful", "garbage", "trash", "scam", "useless", "stupid", "horrible"}

CREATORS = ['Jason Calacanis', 'Patrick Bet-David', 'Naval Ravikant', 'Andrej Karpathy',
            'Pieter Levels', 'Riley Brown', 'Marc Andreessen', 'Balaji Srinivasan']

def classify(text):
    words = set(re.findall(r'\w+', text.lower()))
    p = len(words & POSITIVE)
    n = len(words & NEGATIVE)
    if p > n: return "positive"
    if n > p: return "negative"
    return "neutral"

def get_videos(conn, creator=None):
    """Get videos with 0 comments."""
    names = [creator] if creator else CREATORS
    placeholders = ','.join(['%s'] * len(names))
    cur = conn.cursor()
    cur.execute(f"""
        SELECT cr.name, co.id, co.external_id, co.title
        FROM content co
        JOIN creators cr ON co.creator_id = cr.id
        LEFT JOIN comments cm ON cm.content_id = co.id
        WHERE cr.name IN ({placeholders})
        GROUP BY cr.name, co.id, co.external_id, co.title
        HAVING count(cm.id) = 0
        ORDER BY cr.name
        LIMIT 50
    """, names)
    return cur.fetchall()

def download_comments(video_id):
    """Download comments via yt-dlp, return list of comment dicts."""
    outpath = f"/tmp/comments/{video_id}"
    json_file = f"{outpath}.info.json"
    # Clean up old file
    if os.path.exists(json_file):
        os.remove(json_file)
    
    result = subprocess.run(
        ["yt-dlp", "--skip-download", "--write-comments", "--no-write-thumbnail",
         "-o", outpath, f"https://www.youtube.com/watch?v={video_id}"],
        capture_output=True, timeout=120
    )
    
    if not os.path.exists(json_file):
        return []
    
    with open(json_file) as f:
        data = json.load(f)
    
    # Clean up
    os.remove(json_file)
    return data.get("comments", [])

def insert_comments(conn, content_id, comments):
    """Insert comments into DB. Returns count inserted."""
    if not comments:
        return 0
    cur = conn.cursor()
    count = 0
    for c in comments:
        text = (c.get("text") or "").strip()
        if not text:
            continue
        author = c.get("author", "Unknown")[:255]
        likes = c.get("like_count", 0) or 0
        # Parse timestamp
        pub = None
        ts = c.get("timestamp")
        if ts:
            try:
                pub = datetime.fromtimestamp(ts, tz=timezone.utc)
            except Exception:
                pass
        sentiment = classify(text)
        is_reply = bool(c.get("parent", "root") != "root")
        try:
            cur.execute(
                "INSERT INTO comments (content_id, text, author, likes, published_at, sentiment, is_reply) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (content_id, text, author, likes, pub, sentiment, is_reply)
            )
            count += 1
        except Exception as e:
            conn.rollback()
            print(f"  Error inserting comment: {e}")
            continue
    conn.commit()
    return count

def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--creator", type=str)
    group.add_argument("--all", action="store_true")
    args = parser.parse_args()

    conn = psycopg2.connect(**DB)
    creator = args.creator if args.creator else None
    videos = get_videos(conn, creator)
    
    if not videos:
        print("No videos found with 0 comments.")
        return

    print(f"Found {len(videos)} videos with 0 comments")
    total = 0
    
    for i, (name, content_id, video_id, title) in enumerate(videos, 1):
        short_title = (title or "")[:60]
        print(f"[{i}/{len(videos)}] {name} - {short_title}... (vid={video_id})")
        
        try:
            comments = download_comments(video_id)
        except subprocess.TimeoutExpired:
            print(f"  Timeout downloading comments, skipping")
            continue
        except Exception as e:
            print(f"  Error: {e}, skipping")
            continue
        
        if not comments:
            print(f"  No comments found")
            continue
        
        inserted = insert_comments(conn, content_id, comments)
        total += inserted
        print(f"  Inserted {inserted} comments (of {len(comments)} downloaded)")
    
    print(f"\nDone. Total comments inserted: {total}")
    conn.close()

if __name__ == "__main__":
    main()
