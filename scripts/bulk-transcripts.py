#!/usr/bin/env python3
"""Bulk transcript extractor — runs in background, logs progress."""
import subprocess, re, sys, time, os

LOG = "/home/eternity/.openclaw/workspace/Ultron/scripts/transcript-progress.log"
COOKIES = "/tmp/cookies.txt"

def sql(q, user="content_intel"):
    r = subprocess.run(["docker","exec","raiser-postgres","psql","-U",user,"-d","raiser","-t","-A","-F","|","-c",q], capture_output=True, text=True, timeout=30)
    return [l.strip() for l in r.stdout.strip().split('\n') if l.strip()]

def vtt_to_text(vtt):
    lines, seen, out = vtt.split('\n'), set(), []
    for l in lines:
        l = l.strip()
        if not l or l.startswith('WEBVTT') or l.startswith('Kind:') or l.startswith('Language:') or '-->' in l or l.startswith('NOTE'):
            continue
        c = re.sub(r'<[^>]+>', '', l).strip()
        if c and c not in seen:
            seen.add(c)
            out.append(c)
    return ' '.join(out)

def log(msg):
    ts = time.strftime('%Y-%m-%d %H:%M:%S')
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    with open(LOG, 'a') as f:
        f.write(line + '\n')

def extract_one(ext_id):
    url = f"https://www.youtube.com/watch?v={ext_id}"
    try:
        r = subprocess.run(["docker","exec","raiser-youtubedl","yt-dlp","--cookies",COOKIES,
            "--write-subs","--write-auto-subs","--sub-langs","en*","--sub-format","vtt",
            "--skip-download","--no-warnings","-o",f"/tmp/t_{ext_id}",url],
            capture_output=True, text=True, timeout=60)
        
        ls = subprocess.run(["docker","exec","raiser-youtubedl","sh","-c",f"ls /tmp/t_{ext_id}*.vtt 2>/dev/null"],
            capture_output=True, text=True, timeout=10)
        
        text = None
        if ls.stdout.strip():
            vtt_file = ls.stdout.strip().split('\n')[0]
            cat = subprocess.run(["docker","exec","raiser-youtubedl","cat",vtt_file], capture_output=True, text=True, timeout=10)
            text = vtt_to_text(cat.stdout)
        
        subprocess.run(["docker","exec","raiser-youtubedl","sh","-c",f"rm -f /tmp/t_{ext_id}*"], capture_output=True, timeout=10)
        return text if text and len(text) > 50 else None
    except:
        subprocess.run(["docker","exec","raiser-youtubedl","sh","-c",f"rm -f /tmp/t_{ext_id}*"], capture_output=True, timeout=10)
        return None

def main():
    rows = sql("SELECT id || '|' || external_id || '|' || title FROM content.content WHERE platform='youtube' AND (description IS NULL OR description = '' OR description = '[no transcript]') ORDER BY creator_id, id")
    total = len(rows)
    log(f"Starting bulk extraction: {total} videos")
    
    success, failed, batch_start = 0, 0, time.time()
    
    for i, row in enumerate(rows):
        parts = row.split('|', 2)
        if len(parts) < 2: continue
        cid, ext_id = parts[0], parts[1]
        title = parts[2][:60] if len(parts) > 2 else '?'
        
        text = extract_one(ext_id)
        
        if text:
            # Use dollar-quoting to handle any special chars
            safe = text.replace("$$", "$ $")[:500000]
            sql(f"UPDATE content.content SET description = $${safe}$$ WHERE id = {cid};", user="postgres")
            success += 1
            if success % 50 == 0:
                elapsed = time.time() - batch_start
                rate = success / (elapsed/60) if elapsed > 0 else 0
                log(f"Progress: {success}/{total} success ({success/total*100:.1f}%), {failed} failed, {rate:.1f}/min")
        else:
            failed += 1
            sql(f"UPDATE content.content SET description = '[no transcript]' WHERE id = {cid};", user="postgres")
        
        # Progress every 100
        if (i+1) % 100 == 0:
            elapsed = time.time() - batch_start
            rate = (i+1) / (elapsed/60) if elapsed > 0 else 0
            log(f"[{i+1}/{total}] {title}... | ✅{success} ❌{failed} | {rate:.1f} vids/min")
        
        # Small sleep every 10 to avoid rate limiting
        if (i+1) % 10 == 0:
            time.sleep(1)
    
    log(f"COMPLETE: {success}/{total} transcripts ({success/total*100:.1f}%), {failed} failed")

if __name__ == "__main__":
    main()
