#!/usr/bin/env python3
"""Substack/Blog RSS scraper for board members."""

import re
import xml.etree.ElementTree as ET
from datetime import datetime
from html import unescape

import psycopg2
import requests

DB = dict(host="127.0.0.1", port=5432, dbname="content_intel", user="content_intel", password="257e1ec5c3243072d2c639ab384f2993")

CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS substack_posts (
  id SERIAL PRIMARY KEY,
  author_name TEXT,
  author_handle TEXT,
  title TEXT,
  url TEXT UNIQUE,
  published_at TIMESTAMP,
  content_preview TEXT,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  board_member TEXT,
  scraped_at TIMESTAMP DEFAULT NOW()
);
"""

ADD_BOARD_MEMBER_COL = "ALTER TABLE substack_posts ADD COLUMN IF NOT EXISTS board_member TEXT;"

# Map author_name to board member name for cross-referencing
AUTHOR_TO_BOARD_MEMBER = {
    "Naval Ravikant": "Naval Ravikant",
    "Balaji Srinivasan": "Balaji Srinivasan",
    "Marc Andreessen": "Marc Andreessen",
    "Greg Isenberg": "Greg Isenberg",
    "Sam Altman": "Sam Altman",
    "Chamath Palihapitiya": "Chamath Palihapitiya",
    "Pieter Levels": "Pieter Levels",
    "Patrick Bet-David": "Patrick Bet-David",
    "Jensen Huang": "Jensen Huang",
    "Andrej Karpathy": "Andrej Karpathy",
}

UPSERT = """
INSERT INTO substack_posts (author_name, author_handle, title, url, published_at, content_preview, board_member)
VALUES (%s, %s, %s, %s, %s, %s, %s)
ON CONFLICT (url) DO UPDATE SET
  title = EXCLUDED.title,
  content_preview = EXCLUDED.content_preview,
  board_member = EXCLUDED.board_member,
  scraped_at = NOW()
"""

# (name, handle, list of feed URLs to try)
AUTHORS = [
    ("Naval Ravikant", "naval", ["https://nav.al/feed", "https://navalmanack.com/feed"]),
    ("Balaji Srinivasan", "balajis", ["https://balajis.com/feed", "https://balajispace.substack.com/feed"]),
    ("Marc Andreessen", "pmarca", ["https://pmarca.substack.com/feed"]),
    ("Greg Isenberg", "gregisenberg", ["https://gregisenberg.substack.com/feed", "https://www.gregisenberg.com/feed"]),
    ("Sam Altman", "samaltman", ["https://blog.samaltman.com/feed", "https://blog.samaltman.com/posts.atom"]),
    ("Chamath Palihapitiya", "chamath", ["https://chamath.substack.com/feed"]),
    ("Pieter Levels", "levelsio", ["https://levels.io/feed", "https://levelsio.substack.com/feed", "https://levelsiofeed.substack.com/feed"]),
    ("Patrick Bet-David", "patrickbetdavid", ["https://patrickbetdavid.substack.com/feed", "https://www.patrickbetdavid.com/feed"]),
    ("Jensen Huang", "jensenhuang", ["https://jensenhuang.substack.com/feed"]),
    ("Andrej Karpathy", "karpathy", ["https://karpathy.substack.com/feed", "https://karpathy.github.io/feed.xml"]),
]

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; SubstackScraper/1.0)"}

def strip_html(text):
    if not text:
        return ""
    text = unescape(text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:500]

def parse_date(ds):
    if not ds:
        return None
    for fmt in ("%a, %d %b %Y %H:%M:%S %z", "%a, %d %b %Y %H:%M:%S %Z",
                "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(ds.strip(), fmt).replace(tzinfo=None)
        except ValueError:
            continue
    return None

def fetch_feed(url):
    try:
        r = requests.get(url, headers=HEADERS, timeout=15, allow_redirects=True)
        if r.status_code == 200 and ("<rss" in r.text[:500] or "<feed" in r.text[:500] or "<channel" in r.text[:500]):
            return r.text
    except Exception:
        pass
    return None

def parse_rss(xml_text):
    """Parse RSS or Atom feed, return list of (title, link, published, content_preview)."""
    items = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return items

    ns = {"atom": "http://www.w3.org/2005/Atom", "content": "http://purl.org/rss/1.0/modules/content/"}

    # RSS 2.0
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub = item.findtext("pubDate") or item.findtext("published") or ""
        desc = item.findtext("{http://purl.org/rss/1.0/modules/content/}encoded") or item.findtext("description") or ""
        items.append((title, link, parse_date(pub), strip_html(desc)))

    # Atom
    if not items:
        for entry in root.iter("{http://www.w3.org/2005/Atom}entry"):
            title = (entry.findtext("{http://www.w3.org/2005/Atom}title") or "").strip()
            link_el = entry.find("{http://www.w3.org/2005/Atom}link[@rel='alternate']")
            if link_el is None:
                link_el = entry.find("{http://www.w3.org/2005/Atom}link")
            link = link_el.get("href", "") if link_el is not None else ""
            pub = entry.findtext("{http://www.w3.org/2005/Atom}published") or entry.findtext("{http://www.w3.org/2005/Atom}updated") or ""
            content = entry.findtext("{http://www.w3.org/2005/Atom}content") or entry.findtext("{http://www.w3.org/2005/Atom}summary") or ""
            items.append((title, link, parse_date(pub), strip_html(content)))

    return items

def main():
    conn = psycopg2.connect(**DB)
    cur = conn.cursor()
    cur.execute(CREATE_TABLE)
    cur.execute(ADD_BOARD_MEMBER_COL)
    conn.commit()

    # Backfill board_member for existing rows
    for author_name, board_name in AUTHOR_TO_BOARD_MEMBER.items():
        cur.execute("UPDATE substack_posts SET board_member = %s WHERE author_name = %s AND board_member IS NULL", (board_name, author_name))
    conn.commit()

    total = 0
    results = []

    for name, handle, urls in AUTHORS:
        feed_text = None
        used_url = None
        for url in urls:
            feed_text = fetch_feed(url)
            if feed_text:
                used_url = url
                break

        if not feed_text:
            results.append(f"  {name} ({handle}): NO FEED FOUND (tried {len(urls)} URLs)")
            continue

        items = parse_rss(feed_text)
        board_member = AUTHOR_TO_BOARD_MEMBER.get(name)
        count = 0
        for title, link, pub, preview in items:
            if not link:
                continue
            cur.execute(UPSERT, (name, handle, title, link, pub, preview, board_member))
            count += 1
        conn.commit()
        total += count
        results.append(f"  {name} ({handle}): {count} posts from {used_url}")

    print("=== Substack Scraper Results ===")
    for r in results:
        print(r)
    print(f"\nTotal posts scraped: {total}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
