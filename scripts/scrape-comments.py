#!/usr/bin/env python3
"""Scrape ALL comments from YouTube videos using yt-dlp."""
import subprocess, json, time, os

LOG = "/home/eternity/.openclaw/workspace/Ultron/scripts/comments-scrape.log"

def sql_rows(q, user="content_intel"):
    """Run SQL and return raw rows (tab-separated)."""
    r = subprocess.run(["docker","exec","raiser-postgres","psql","-U",user,"-d","raiser",
                        "-t","-A","-F","\t","-c",q],
                       capture_output=True, text=True, timeout=30)
    return [l.strip() for l in r.stdout.strip().split('\n') if l.strip()]

def sql_exec(q, user="postgres"):
    subprocess.run(["docker","exec","raiser-postgres","psql","-U",user,"-d","raiser","-c",q],
                   capture_output=True, text=True, timeout=30)

def log(msg):
    ts = time.strftime('%Y-%m-%d %H:%M:%S')
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    with open(LOG, 'a') as f:
        f.write(line + '\n')

def scrape_comments(ext_id):
    url = f"https://www.youtube.com/watch?v={ext_id}"
    r = subprocess.run(
        ["docker","exec","raiser-youtubedl","yt-dlp",
         "--write-comments","--skip-download",
         "--extractor-args","youtube:max_comments=all,all,all",
         "-o",f"/tmp/cmt_{ext_id}",
         "--write-info-json","--no-write-thumbnail",
         url],
        capture_output=True, text=True, timeout=180
    )
    
    cat_r = subprocess.run(
        ["docker","exec","raiser-youtubedl","cat",f"/tmp/cmt_{ext_id}.info.json"],
        capture_output=True, text=True, timeout=30
    )
    
    subprocess.run(["docker","exec","raiser-youtubedl","sh","-c",f"rm -f /tmp/cmt_{ext_id}*"],
                   capture_output=True, timeout=10)
    
    if cat_r.stdout:
        try:
            data = json.loads(cat_r.stdout)
            return data.get('comments', [])
        except:
            return []
    return []

def save_comments(content_id, comments):
    saved = 0
    for c in comments:
        text = c.get('text', '').replace("$$", "$ $")[:10000]
        author = c.get('author', 'Unknown').replace("'", "''")[:255]
        likes = int(c.get('like_count', 0))
        reply_count = int(c.get('reply_count', 0) or 0)
        if not text.strip(): continue
        
        sql_exec(f"""INSERT INTO content.comments (content_id, text, author, likes, reply_count)
                VALUES ({content_id}, $${text}$$, '{author}', {likes}, {reply_count})
                ON CONFLICT DO NOTHING""")
        saved += 1
    return saved

def main():
    rows = sql_rows("""SELECT c.id, c.external_id, c.title 
        FROM content.content c 
        LEFT JOIN content.comments cm ON cm.content_id = c.id
        WHERE c.platform = 'youtube' AND cm.id IS NULL
        ORDER BY COALESCE((c.metrics->>'viewCount')::bigint, 0) DESC
        LIMIT 1000""")
    
    total = len(rows)
    log(f"Comment scraping: {total} videos queued (ALL comments per video)")
    
    success, total_comments = 0, 0
    for i, row in enumerate(rows):
        parts = row.split('\t')
        if len(parts) < 2: continue
        cid, ext_id = int(parts[0]), parts[1]
        title = parts[2][:50] if len(parts) > 2 else '?'
        
        comments = scrape_comments(ext_id)
        if comments:
            saved = save_comments(cid, comments)
            total_comments += saved
            success += 1
            if saved > 0:
                log(f"  {title}... → {saved} comments")
        
        if (i+1) % 5 == 0:
            time.sleep(2)
        
        if (i+1) % 25 == 0:
            log(f"[{i+1}/{total}] {success} videos, {total_comments} total comments")
    
    log(f"COMPLETE: {success}/{total} videos with comments, {total_comments} total comments")

if __name__ == "__main__":
    main()
