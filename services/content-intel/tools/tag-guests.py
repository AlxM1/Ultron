#!/usr/bin/env python3
"""Tag content with guest board members based on title and transcript intro."""

import psycopg2
import re
from collections import defaultdict

DB = dict(host="127.0.0.1", port=5432, dbname="content_intel", user="content_intel", password="content_intel")

BOARD_MEMBERS = {
    "Elon Musk": ["Elon Musk", "Elon"],
    "Alex Hormozi": ["Alex Hormozi", "Hormozi"],
    "Chamath Palihapitiya": ["Chamath Palihapitiya", "Chamath"],
    "David Sacks": ["David Sacks", "Sacks"],
    "Jason Calacanis": ["Jason Calacanis", "Calacanis", "J-Cal"],
    "Jeff Bezos": ["Jeff Bezos", "Bezos"],
    "Lex Fridman": ["Lex Fridman", "Lex"],
    "Sam Altman": ["Sam Altman", "Altman"],
    "Jensen Huang": ["Jensen Huang", "Jensen"],
    "Balaji Srinivasan": ["Balaji Srinivasan", "Balaji"],
    "Naval Ravikant": ["Naval Ravikant", "Naval"],
    "Patrick Bet-David": ["Patrick Bet-David", "PBD", "Pat"],
    "Pieter Levels": ["Pieter Levels", "Levelsio"],
    "Greg Isenberg": ["Greg Isenberg"],
    "Andrej Karpathy": ["Andrej Karpathy", "Karpathy"],
    "Marc Andreessen": ["Marc Andreessen", "Andreessen", "a16z"],
    "Gary Vaynerchuk": ["Gary Vaynerchuk", "Gary Vee", "GaryVee"],
    "Riley Brown": ["Riley Brown"],
}

# Pre-compile patterns: word-boundary match, case-insensitive
PATTERNS = {}
for name, aliases in BOARD_MEMBERS.items():
    combined = "|".join(re.escape(a) for a in aliases)
    PATTERNS[name] = re.compile(rf"\b({combined})\b", re.IGNORECASE)


def main():
    conn = psycopg2.connect(**DB)
    cur = conn.cursor()

    # Load content
    cur.execute("SELECT id, title FROM content")
    content_rows = cur.fetchall()
    print(f"Loaded {len(content_rows)} content rows")

    # Load transcripts (first 500 chars)
    cur.execute("SELECT content_id, LEFT(text, 500) FROM transcripts")
    transcript_map = {}
    for cid, text in cur.fetchall():
        if text:
            transcript_map[cid] = text
    print(f"Loaded {len(transcript_map)} transcripts")

    tags_to_insert = []  # (content_id, tag_type, tag_value, confidence)
    title_counts = defaultdict(int)
    transcript_counts = defaultdict(int)

    # Title-based tagging
    for cid, title in content_rows:
        if not title:
            continue
        for name, pattern in PATTERNS.items():
            if pattern.search(title):
                tags_to_insert.append((cid, "guest", name, 1.0))
                title_counts[name] += 1

    # Transcript-based tagging
    for cid, intro in transcript_map.items():
        for name, pattern in PATTERNS.items():
            if pattern.search(intro):
                tags_to_insert.append((cid, "guest", name, 0.7))
                transcript_counts[name] += 1

    # Bulk insert
    inserted = 0
    for content_id, tag_type, tag_value, confidence in tags_to_insert:
        cur.execute(
            """INSERT INTO content_tags (content_id, tag_type, tag_value, confidence)
               VALUES (%s, %s, %s, %s)
               ON CONFLICT (content_id, tag_type, tag_value) DO NOTHING""",
            (content_id, tag_type, tag_value, confidence),
        )
        if cur.rowcount > 0:
            inserted += 1

    conn.commit()

    # Summary
    print(f"\n{'='*50}")
    print(f"Total tags attempted: {len(tags_to_insert)}")
    print(f"New tags inserted: {inserted}")
    print(f"\n--- Title-based tags ---")
    for name in sorted(title_counts, key=title_counts.get, reverse=True):
        print(f"  {name}: {title_counts[name]} videos")
    print(f"\n--- Transcript-based tags (confidence=0.7) ---")
    for name in sorted(transcript_counts, key=transcript_counts.get, reverse=True):
        print(f"  {name}: {transcript_counts[name]} videos")

    # Final totals
    cur.execute("SELECT tag_value, COUNT(*) FROM content_tags WHERE tag_type='guest' GROUP BY tag_value ORDER BY COUNT(*) DESC")
    print(f"\n--- Total tags in DB ---")
    for name, count in cur.fetchall():
        print(f"  {name}: {count}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
