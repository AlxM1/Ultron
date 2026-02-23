#!/usr/bin/env python3
"""Scrape ALL comments using YouTube Data API v3 (free, 10k quota/day)."""
import subprocess, json, time, os, urllib.request, urllib.parse

API_KEY = "AIzaSyBBAV0OoAHGpz1ti8_4NCNZTYzxT9en4rI"
LOG = "/home/eternity/.openclaw/workspace/Ultron/scripts/comments-api.log"

def sql_rows(q, user="content_intel"):
    r = subprocess.run(["docker","exec","raiser-postgres","psql","-U",user,"-d","raiser",
                        "-t","-A","-F","\t","-c",q], capture_output=True, text=True, timeout=30)
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

def get_comments(video_id, max_pages=20):
    """Fetch all comment threads for a video."""
    comments = []
    page_token = None
    
    for _ in range(max_pages):
        params = {
            'part': 'snippet',
            'videoId': video_id,
            'maxResults': 100,
            'order': 'relevance',
            'textFormat': 'plainText',
            'key': API_KEY,
        }
        if page_token:
            params['pageToken'] = page_token
        
        url = f"https://www.googleapis.com/youtube/v3/commentThreads?{urllib.parse.urlencode(params)}"
        
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read())
        except Exception as e:
            if '403' in str(e) or 'commentsDisabled' in str(e):
                return comments  # Comments disabled
            if '404' in str(e):
                return comments
            log(f"  API error: {e}")
            break
        
        for item in data.get('items', []):
            snippet = item['snippet']['topLevelComment']['snippet']
            comments.append({
                'text': snippet.get('textOriginal', ''),
                'author': snippet.get('authorDisplayName', 'Unknown'),
                'likes': snippet.get('likeCount', 0),
                'reply_count': item['snippet'].get('totalReplyCount', 0),
                'published': snippet.get('publishedAt', ''),
            })
        
        page_token = data.get('nextPageToken')
        if not page_token:
            break
        time.sleep(0.5)  # Rate limiting
    
    return comments

def save_comments(content_id, comments):
    saved = 0
    for c in comments:
        text = c['text'].replace("$$", "$ $")[:10000]
        author = c['author'].replace("'", "''")[:255]
        if not text.strip(): continue
        
        sql_exec(f"""INSERT INTO content.comments (content_id, text, author, likes, reply_count)
                VALUES ({content_id}, $${text}$$, '{author}', {c['likes']}, {c['reply_count']})
                ON CONFLICT DO NOTHING""")
        saved += 1
    return saved

def main():
    rows = sql_rows("""SELECT c.id, c.external_id, c.title 
        FROM content.content c 
        LEFT JOIN content.comments cm ON cm.content_id = c.id
        WHERE c.platform = 'youtube' AND cm.id IS NULL
        ORDER BY COALESCE((c.metrics->>'viewCount')::bigint, 0) DESC
        LIMIT 2000""")
    
    total = len(rows)
    log(f"Comment scraping via API: {total} videos queued")
    
    success, total_comments, quota_used = 0, 0, 0
    
    for i, row in enumerate(rows):
        parts = row.split('\t')
        if len(parts) < 2: continue
        cid, ext_id = int(parts[0]), parts[1]
        title = parts[2][:50] if len(parts) > 2 else '?'
        
        comments = get_comments(ext_id)
        quota_used += 1  # Each commentThreads.list = 1 unit (+ pages)
        
        if comments:
            saved = save_comments(cid, comments)
            total_comments += saved
            success += 1
            if saved > 50:
                log(f"  🔥 {title}... → {saved} comments")
        
        if (i+1) % 50 == 0:
            log(f"[{i+1}/{total}] {success} videos, {total_comments} comments, ~{quota_used} API calls")
        
        # YouTube API quota: 10,000 units/day. commentThreads.list = 1 unit per call.
        # With pagination, ~5 calls per video average. So ~2000 videos/day max.
        if quota_used > 9000:
            log(f"Approaching quota limit ({quota_used} calls). Stopping.")
            break
        
        time.sleep(0.3)
    
    log(f"COMPLETE: {success}/{total} videos, {total_comments} comments, {quota_used} API calls")

if __name__ == "__main__":
    main()
