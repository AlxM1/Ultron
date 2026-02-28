#!/usr/bin/env python3
"""Scrape board member tweets via bird CLI and insert into content_intel.x_posts."""

import json
import subprocess
import time
import os
from datetime import datetime
import psycopg2

HANDLES = [
    "elonmusk", "AlexHormozi", "chamath", "DavidSacks", "Jason", "JeffBezos",
    "lexfridman", "sama", "Jensen_Huang", "karpathy", "balajis", "naval",
    "PatrickBetDavid", "levelsio", "GregIsenberg", "pmarca", "garyvee", "rileyybrown"
]

BOARD_MEMBERS = [
    "Elon Musk", "Alex Hormozi", "Chamath Palihapitiya", "David Sacks",
    "Jason Calacanis", "Jeff Bezos", "Lex Fridman", "Sam Altman",
    "Jensen Huang", "Balaji Srinivasan", "Kevin O'Leary", "Naval Ravikant",
    "Patrick Bet-David", "Pieter Levels", "Greg Isenberg", "Andrej Karpathy",
    "Marc Andreessen", "Gary Vaynerchuk", "Riley Brown", "Joe Rogan",
]

ENV = {
    **os.environ,
    "AUTH_TOKEN": "7e7c37d791925f09b43e6e21e2977726dc202048",
    "CT0": "c6f252252c451d675da339cefcd652e429faf78845b3269b4b1bd89820f9ee7e504b5b828c9228f0ff62fd123f7f4c7cc238c1839124d72e5678447ac704ee8f100b4aa1bc2c5ef59171e86daa8040bc",
}

DB = dict(host="127.0.0.1", dbname="content_intel", user="content_intel", password="content_intel")

UPSERT = """
INSERT INTO x_posts (tweet_id, author_handle, author_name, text, likes, retweets, replies, created_at, url, search_keyword, scraped_at)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
ON CONFLICT (tweet_id) DO UPDATE SET
    text = EXCLUDED.text, likes = EXCLUDED.likes, retweets = EXCLUDED.retweets,
    replies = EXCLUDED.replies, search_keyword = COALESCE(EXCLUDED.search_keyword, x_posts.search_keyword),
    scraped_at = NOW()
"""

def parse_date(s):
    """Parse Twitter date like 'Fri Feb 27 23:08:47 +0000 2026'."""
    try:
        return datetime.strptime(s, "%a %b %d %H:%M:%S %z %Y").replace(tzinfo=None)
    except Exception:
        return None

def scrape_handle(handle):
    """Run bird CLI for a handle, return list of tweet dicts."""
    cmd = f"npx @steipete/bird user-tweets @{handle} -n 200 --max-pages 10 --json --plain"
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120, env=ENV)
        if result.returncode != 0:
            print(f"  bird error for {handle}: {result.stderr[:200]}")
            return []
        tweets = json.loads(result.stdout)
        if isinstance(tweets, list):
            return tweets
        return []
    except json.JSONDecodeError:
        print(f"  JSON parse error for {handle}")
        return []
    except subprocess.TimeoutExpired:
        print(f"  Timeout for {handle}")
        return []

def main():
    conn = psycopg2.connect(**DB)
    cur = conn.cursor()
    total = 0
    results = {}

    for i, handle in enumerate(HANDLES):
        print(f"[{i+1}/{len(HANDLES)}] Scraping @{handle}...")
        tweets = scrape_handle(handle)
        count = 0
        for t in tweets:
            tid = t.get("id")
            if not tid:
                continue
            author = t.get("author", {})
            cur.execute(UPSERT, (
                tid,
                author.get("username", handle),
                author.get("name", ""),
                t.get("text", ""),
                t.get("likeCount", 0),
                t.get("retweetCount", 0),
                t.get("replyCount", 0),
                parse_date(t.get("createdAt", "")),
                f"https://x.com/{author.get('username', handle)}/status/{tid}",
                None,  # search_keyword is null for handle-based scraping
            ))
            count += 1
        conn.commit()
        results[handle] = count
        total += count
        print(f"  -> {count} tweets inserted/updated")
        if i < len(HANDLES) - 1:
            time.sleep(3)

    cur.close()
    conn.close()

    # --- Board member name search ---
    print(f"\n--- Board Member Search ---")
    for name in BOARD_MEMBERS:
        print(f"  Searching for '{name}'...")
        cmd = f'npx @steipete/bird search "{name}" -n 50 --json --plain'
        try:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120, env=ENV)
            if result.returncode != 0:
                print(f"    bird search error: {result.stderr[:200]}")
                results[f"search:{name}"] = 0
                continue
            search_tweets = json.loads(result.stdout)
            if not isinstance(search_tweets, list):
                search_tweets = []
        except (json.JSONDecodeError, subprocess.TimeoutExpired) as e:
            print(f"    Error: {e}")
            results[f"search:{name}"] = 0
            continue

        count = 0
        for t in search_tweets:
            tid = t.get("id")
            if not tid:
                continue
            author = t.get("author", {})
            cur.execute(UPSERT, (
                tid,
                author.get("username", ""),
                author.get("name", ""),
                t.get("text", ""),
                t.get("likeCount", 0),
                t.get("retweetCount", 0),
                t.get("replyCount", 0),
                parse_date(t.get("createdAt", "")),
                f"https://x.com/{author.get('username', '')}/status/{tid}",
                name,  # search_keyword = board member name
            ))
            count += 1
        conn.commit()
        results[f"search:{name}"] = count
        total += count
        print(f"    -> {count} search results inserted")
        time.sleep(3)

    cur.close()
    conn.close()

    print(f"\n{'='*50}")
    print(f"TOTAL: {total} tweets across {len(HANDLES)} handles + {len(BOARD_MEMBERS)} searches")
    print(f"{'='*50}")
    for h, c in results.items():
        print(f"  {h}: {c}")

if __name__ == "__main__":
    main()
