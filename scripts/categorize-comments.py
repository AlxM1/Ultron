#!/usr/bin/env python3
"""
Categorize comments into sentiment and topic buckets using Ollama on GPU.
Buckets:
- Sentiment: positive, negative, neutral, question, constructive_criticism
- Category: praise, complaint, question, suggestion, debate, personal_story, 
            humor, request, industry_insight, technical, spam
"""
import subprocess, json, time, os

GPU_OLLAMA = "http://10.25.10.60:11434"
MODEL = "llama3.2"
LOG = "/home/eternity/.openclaw/workspace/Ultron/scripts/categorize-comments.log"
BATCH_SIZE = 20  # Comments per Ollama call

def sql(q, user="content_intel"):
    r = subprocess.run(["docker","exec","raiser-postgres","psql","-U",user,"-d","raiser","-t","-A","-F","|||","-c",q],
                       capture_output=True, text=True, timeout=30)
    return [l.strip() for l in r.stdout.strip().split('\n') if l.strip()]

def log(msg):
    ts = time.strftime('%Y-%m-%d %H:%M:%S')
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    with open(LOG, 'a') as f:
        f.write(line + '\n')

def categorize_batch(comments):
    """Send batch of comments to Ollama for categorization."""
    prompt = """Categorize each comment with a sentiment and category. Return JSON array.

Sentiments: positive, negative, neutral, question, constructive_criticism
Categories: praise, complaint, question, suggestion, debate, personal_story, humor, request, industry_insight, technical, spam

Comments:
"""
    for i, (cid, text) in enumerate(comments):
        prompt += f"{i+1}. [{cid}] {text[:200]}\n"
    
    prompt += """
Return ONLY a JSON array like: [{"id": 123, "sentiment": "positive", "category": "praise"}, ...]"""

    import urllib.request
    data = json.dumps({
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.1, "num_predict": 2000}
    }).encode()
    
    req = urllib.request.Request(f"{GPU_OLLAMA}/api/generate", data=data, 
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read())
            response_text = result.get("response", "")
            # Extract JSON from response
            import re
            match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if match:
                return json.loads(match.group())
    except Exception as e:
        log(f"Ollama error: {e}")
    return []

def main():
    uncategorized = sql("""SELECT id ||| LEFT(text, 200) FROM content.comments 
                          WHERE sentiment IS NULL ORDER BY likes DESC LIMIT 5000""")
    total = len(uncategorized)
    log(f"Categorizing {total} comments")
    
    processed = 0
    for i in range(0, total, BATCH_SIZE):
        batch = []
        for row in uncategorized[i:i+BATCH_SIZE]:
            parts = row.split('|||', 1)
            if len(parts) == 2:
                batch.append((int(parts[0]), parts[1]))
        
        if not batch: continue
        
        results = categorize_batch(batch)
        for r in results:
            cid = r.get('id')
            sentiment = r.get('sentiment', 'neutral')
            category = r.get('category', 'other')
            if cid:
                sql(f"UPDATE content.comments SET sentiment = '{sentiment}', category = '{category}' WHERE id = {cid}", user="postgres")
                processed += 1
        
        if (i // BATCH_SIZE + 1) % 10 == 0:
            log(f"Progress: {processed}/{total} categorized")
        
        time.sleep(1)
    
    log(f"COMPLETE: {processed}/{total} comments categorized")

if __name__ == "__main__":
    main()
