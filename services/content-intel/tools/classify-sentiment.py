#!/usr/bin/env python3
"""Classify comments sentiment (positive/negative/neutral) using keyword matching."""

import psycopg2

DB = dict(host="127.0.0.1", port=5432, dbname="content_intel", user="content_intel", password="content_intel")

POSITIVE = {"love","amazing","great","awesome","excellent","brilliant","best","incredible",
            "fantastic","thank","helpful","insightful","genius","powerful","groundbreaking",
            "revolutionary","perfect","beautiful","outstanding","impressive"}
NEGATIVE = {"hate","terrible","worst","awful","garbage","trash","scam","useless","stupid",
            "horrible","disappointed","overrated","waste","boring","misleading","fake",
            "clickbait","annoying","cringe","sucks"}

def classify(text):
    if not text:
        return "neutral"
    words = set(text.lower().split())
    pos = len(words & POSITIVE)
    neg = len(words & NEGATIVE)
    if pos > neg:
        return "positive"
    elif neg > pos:
        return "negative"
    return "neutral"

def main():
    conn = psycopg2.connect(**DB)
    conn.autocommit = False
    cur = conn.cursor()

    total = 0
    dist = {"positive": 0, "negative": 0, "neutral": 0}

    while True:
        cur.execute("SELECT id, text FROM comments WHERE sentiment IS NULL LIMIT 5000")
        rows = cur.fetchall()
        if not rows:
            break

        batch = []
        for cid, text in rows:
            s = classify(text)
            dist[s] += 1
            batch.append((s, cid))

            if len(batch) >= 1000:
                _update(cur, batch)
                batch = []

        if batch:
            _update(cur, batch)

        conn.commit()
        total += len(rows)
        print(f"Processed {total} comments so far | pos={dist['positive']} neg={dist['negative']} neu={dist['neutral']}")

    conn.close()
    print(f"\nDone. Total classified: {total}")
    print(f"Distribution: positive={dist['positive']}, negative={dist['negative']}, neutral={dist['neutral']}")

def _update(cur, batch):
    for sentiment in ("positive", "negative", "neutral"):
        ids = [cid for s, cid in batch if s == sentiment]
        if ids:
            cur.execute(f"UPDATE comments SET sentiment = %s WHERE id = ANY(%s)", (sentiment, ids))

if __name__ == "__main__":
    main()
