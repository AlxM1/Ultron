#!/usr/bin/env python3
"""Reddit scraper using public JSON endpoints. No API key needed."""

import time
import sys
import requests
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime, timezone

DB_CONFIG = dict(host="localhost", dbname="content_intel", user="content_intel", password="content_intel")
USER_AGENT = "Mozilla/5.0 (compatible; ContentIntel/1.0)"
DELAY = 6  # seconds between requests

KEYWORDS = [
    "OpenClaw", "AI agents", "AI tools", "AI startups", "voice cloning",
    "creator economy", "AI skills", "GEO optimization", "generative engine optimization",
    "AI SaaS", "persona AI", "AI personas", "content intelligence",
    "creator intelligence", "World Mobile", "World Mobile Token",
    "AI automation", "LLM agents", "autonomous agents",
]
SUBREDDITS = [
    "artificial", "MachineLearning", "LocalLLaMA", "ChatGPT", "OpenAI",
    "nvidia", "startups", "Entrepreneur", "SaaS", "singularity",
    "StableDiffusion", "selfhosted", "ArtificialIntelligence",
]
BOARD_MEMBERS = [
    "Elon Musk", "Alex Hormozi", "Chamath Palihapitiya", "David Sacks",
    "Jason Calacanis", "Jeff Bezos", "Lex Fridman", "Sam Altman",
    "Jensen Huang", "Balaji Srinivasan", "Kevin O'Leary", "Naval Ravikant",
    "Patrick Bet-David", "Pieter Levels", "Greg Isenberg", "Andrej Karpathy",
    "Marc Andreessen", "Gary Vaynerchuk", "Riley Brown", "Joe Rogan",
]

CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS reddit_posts (
    id SERIAL PRIMARY KEY,
    reddit_id TEXT UNIQUE,
    subreddit TEXT,
    title TEXT,
    body TEXT,
    author TEXT,
    score INTEGER,
    num_comments INTEGER,
    url TEXT,
    permalink TEXT,
    created_utc TIMESTAMP,
    search_keyword TEXT,
    scraped_at TIMESTAMP DEFAULT NOW()
);
"""

session = requests.Session()
session.headers.update({"User-Agent": USER_AGENT})


def fetch_json(url, params=None, retries=3):
    """Fetch JSON from Reddit with backoff on 429."""
    for attempt in range(retries):
        try:
            r = session.get(url, params=params, timeout=30)
            if r.status_code == 429:
                wait = DELAY * (2 ** attempt)
                print(f"  429 rate limited, waiting {wait}s...")
                time.sleep(wait)
                continue
            if r.status_code == 403:
                print(f"  403 Forbidden for {url}, skipping")
                return None
            r.raise_for_status()
            return r.json()
        except Exception as e:
            print(f"  Error fetching {url}: {e}")
            if attempt < retries - 1:
                time.sleep(DELAY * (2 ** attempt))
    return None


def parse_posts(data, keyword=None):
    """Extract posts from Reddit JSON listing."""
    if not data:
        return []
    listing = data.get("data", {}) if isinstance(data, dict) else {}
    posts = []
    for child in listing.get("children", []):
        d = child.get("data", {})
        posts.append((
            d.get("name", ""),           # reddit_id (fullname like t3_xxx)
            d.get("subreddit", ""),
            d.get("title", ""),
            d.get("selftext", "")[:10000],
            d.get("author", ""),
            d.get("score", 0),
            d.get("num_comments", 0),
            d.get("url", ""),
            d.get("permalink", ""),
            datetime.fromtimestamp(d.get("created_utc", 0), tz=timezone.utc) if d.get("created_utc") else None,
            keyword,
        ))
    return posts


def store_posts(conn, posts):
    """Upsert posts into DB."""
    if not posts:
        return 0
    with conn.cursor() as cur:
        execute_values(cur, """
            INSERT INTO reddit_posts (reddit_id, subreddit, title, body, author, score, num_comments, url, permalink, created_utc, search_keyword)
            VALUES %s
            ON CONFLICT (reddit_id) DO UPDATE SET
                score = EXCLUDED.score,
                num_comments = EXCLUDED.num_comments,
                body = EXCLUDED.body,
                scraped_at = NOW()
        """, posts)
    conn.commit()
    return len(posts)


def search_keyword(keyword, limit=25):
    """Search Reddit for a keyword, top posts from last week."""
    url = "https://www.reddit.com/search.json"
    params = {"q": keyword, "sort": "top", "t": "week", "limit": limit}
    print(f"[keyword] Searching: {keyword}")
    time.sleep(DELAY)
    data = fetch_json(url, params)
    return parse_posts(data, keyword=keyword)


def scrape_subreddit(sub, limit=25):
    """Scrape top posts from a subreddit for last week."""
    url = f"https://www.reddit.com/r/{sub}/top.json"
    params = {"t": "week", "limit": limit}
    print(f"[subreddit] Scraping: r/{sub}")
    time.sleep(DELAY)
    data = fetch_json(url, params)
    return parse_posts(data, keyword=f"r/{sub}")


def search_board_member(name):
    """Search for board member mentions."""
    return search_keyword(name)


def run(keywords=None, subreddits=None, board_members=None):
    keywords = keywords if keywords is not None else KEYWORDS
    subreddits = subreddits if subreddits is not None else SUBREDDITS
    board_members = board_members if board_members is not None else BOARD_MEMBERS

    conn = psycopg2.connect(**DB_CONFIG)
    with conn.cursor() as cur:
        cur.execute(CREATE_TABLE)
    conn.commit()

    total = 0

    # Keywords
    for kw in keywords:
        posts = search_keyword(kw)
        n = store_posts(conn, posts)
        print(f"  -> Stored {n} posts for '{kw}'")
        total += n

    # Subreddits
    for sub in subreddits:
        posts = scrape_subreddit(sub)
        n = store_posts(conn, posts)
        print(f"  -> Stored {n} posts for r/{sub}")
        total += n

    # Board members
    for name in board_members:
        posts = search_board_member(name)
        n = store_posts(conn, posts)
        print(f"  -> Stored {n} posts for board member '{name}'")
        total += n

    conn.close()
    print(f"\nDone. Total posts stored/updated: {total}")
    return total


if __name__ == "__main__":
    if "--test" in sys.argv:
        print("=== TEST MODE: 1 keyword + 1 subreddit ===\n")
        conn = psycopg2.connect(**DB_CONFIG)
        with conn.cursor() as cur:
            cur.execute(CREATE_TABLE)
        conn.commit()

        posts = search_keyword("AI agents")
        n = store_posts(conn, posts)
        print(f"  -> Stored {n} posts for 'AI agents'\n")

        posts = scrape_subreddit("artificial")
        n = store_posts(conn, posts)
        print(f"  -> Stored {n} posts for r/artificial\n")

        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM reddit_posts")
            print(f"Total rows in reddit_posts: {cur.fetchone()[0]}")
            cur.execute("SELECT reddit_id, subreddit, score, LEFT(title,80) FROM reddit_posts ORDER BY score DESC LIMIT 5")
            print("\nTop 5 by score:")
            for row in cur.fetchall():
                print(f"  [{row[1]}] score={row[2]} | {row[3]}")
        conn.close()
    else:
        run()
