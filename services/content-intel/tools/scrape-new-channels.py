#!/usr/bin/env python3
"""Scrape newest videos from YouTube channels and insert into content_intel DB."""

import subprocess
import psycopg2

DB = dict(host="127.0.0.1", port=5432, dbname="content_intel", user="content_intel", password="content_intel")

CREATORS = [
    ("Jason Calacanis", "@allin", 200),
    ("Patrick Bet-David", "@valuetainment", 200),
    ("Naval Ravikant", "@NavalR", 200),
]

def get_videos(handle, limit):
    cmd = [
        "yt-dlp", "--flat-playlist", "--playlist-end", str(limit),
        "--print", "%(id)s\t%(title)s\t%(upload_date)s",
        f"https://www.youtube.com/{handle}/videos"
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    videos = []
    for line in r.stdout.strip().split("\n"):
        if not line.strip():
            continue
        parts = line.split("\t", 2)
        if len(parts) == 3:
            vid_id, title, date = parts
            pub = f"{date[:4]}-{date[4:6]}-{date[6:8]}" if date and date != "NA" else None
            videos.append((vid_id, title, pub))
    return videos

def main():
    conn = psycopg2.connect(**DB)
    cur = conn.cursor()

    for name, handle, limit in CREATORS:
        cur.execute("SELECT id FROM creators WHERE name = %s", (name,))
        row = cur.fetchone()
        if not row:
            print(f"Creator '{name}' not found in DB, skipping")
            continue
        creator_id = row[0]

        print(f"Fetching videos for {name} ({handle})...")
        videos = get_videos(handle, limit)
        print(f"  Found {len(videos)} videos from yt-dlp")

        added = 0
        for vid_id, title, pub in videos:
            cur.execute(
                """INSERT INTO content (creator_id, external_id, title, published_at, platform)
                   VALUES (%s, %s, %s, %s, 'youtube')
                   ON CONFLICT DO NOTHING""",
                (creator_id, vid_id, title, pub)
            )
            if cur.rowcount > 0:
                added += 1
        conn.commit()
        print(f"  Inserted {added} new videos for {name}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
