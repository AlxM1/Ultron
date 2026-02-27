#!/usr/bin/env python3
"""Scrape ALL comments using YouTube Data API v3 via content-intel container."""
import subprocess, json, time

API_KEY = "AIzaSyBBAV0OoAHGpz1ti8_4NCNZTYzxT9en4rI"
LOG = "/home/eternity/.openclaw/workspace/Ultron/scripts/comments-api.log"

def sql_rows(q, user="content_intel"):
    r = subprocess.run(["docker","exec","raiser-postgres","psql","-U",user,"-d","content_intel",
                        "-t","-A","-F","\t","-c",q], capture_output=True, text=True, timeout=30)
    return [l.strip() for l in r.stdout.strip().split('\n') if l.strip()]

def sql_exec(q, user="content_intel"):
    subprocess.run(["docker","exec","raiser-postgres","psql","-U",user,"-d","content_intel","-c",q],
                   capture_output=True, text=True, timeout=30)

def log(msg):
    ts = time.strftime('%Y-%m-%d %H:%M:%S')
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    with open(LOG, 'a') as f:
        f.write(line + '\n')

def api_fetch(url):
    """Fetch URL via content-intel container (has network access)."""
    js = f"""
    fetch('{url}')
      .then(r => r.json())
      .then(d => console.log(JSON.stringify(d)))
      .catch(e => console.log(JSON.stringify({{error: e.message}})))
    """
    r = subprocess.run(
        ["docker","exec","raiser-content-intel","node","-e",js],
        capture_output=True, text=True, timeout=30
    )
    try:
        return json.loads(r.stdout.strip())
    except:
        return None

def get_comments(video_id, max_pages=20):
    comments = []
    page_token = ""
    
    for _ in range(max_pages):
        url = f"https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId={video_id}&maxResults=100&order=relevance&textFormat=plainText&key={API_KEY}"
        if page_token:
            url += f"&pageToken={page_token}"
        
        data = api_fetch(url)
        if not data or 'error' in data:
            break
        
        for item in data.get('items', []):
            s = item['snippet']['topLevelComment']['snippet']
            comments.append({
                'text': s.get('textOriginal', ''),
                'author': s.get('authorDisplayName', 'Unknown'),
                'likes': s.get('likeCount', 0),
                'reply_count': item['snippet'].get('totalReplyCount', 0),
            })
        
        page_token = data.get('nextPageToken', '')
        if not page_token:
            break
        time.sleep(0.3)
    
    return comments

def save_comments(content_id, comments):
    saved = 0
    for c in comments:
        text = c['text'].replace("$$", "$ $")[:10000]
        author = c['author'].replace("'", "''")[:255]
        if not text.strip(): continue
        sql_exec(f"""INSERT INTO comments (content_id, text, author, likes, reply_count)
                VALUES ({content_id}, $${text}$$, '{author}', {c['likes']}, {c['reply_count']})
                ON CONFLICT DO NOTHING""")
        saved += 1
    return saved

def main():
    rows = sql_rows("""SELECT c.id, c.external_id, c.title 
        FROM content c 
        LEFT JOIN comments cm ON cm.content_id = c.id
        WHERE c.platform = 'youtube' AND cm.id IS NULL
        ORDER BY COALESCE((c.metrics->>'viewCount')::bigint, 0) DESC
        LIMIT 100""")
    
    total = len(rows)
    log(f"Comment scraping via API (through container): {total} videos")
    
    success, total_comments, api_calls = 0, 0, 0
    
    for i, row in enumerate(rows):
        parts = row.split('\t')
        if len(parts) < 2: continue
        cid, ext_id = int(parts[0]), parts[1]
        title = parts[2][:50] if len(parts) > 2 else '?'
        
        comments = get_comments(ext_id)
        api_calls += 1
        
        if comments:
            saved = save_comments(cid, comments)
            total_comments += saved
            success += 1
            if saved > 50:
                log(f"  🔥 {title}... → {saved} comments")
        
        if (i+1) % 25 == 0:
            log(f"[{i+1}/{total}] {success} videos, {total_comments} comments")
        
        if api_calls > 9000:
            log(f"Quota limit approaching. Stopping.")
            break
        
        time.sleep(0.5)
    
    log(f"COMPLETE: {success}/{total} videos, {total_comments} comments")

if __name__ == "__main__":
    main()
