#!/usr/bin/env python3
"""Second pass: Use GPU Whisper to transcribe videos that had no YouTube subtitles."""
import subprocess, json, time, os, re

GPU_STT_URL = "http://10.25.10.60:8765/transcribe"
LOG = "/home/eternity/.openclaw/workspace/Ultron/scripts/whisper-fallback.log"

def sql(q, user="content_intel"):
    r = subprocess.run(["docker","exec","raiser-postgres","psql","-U",user,"-d","raiser","-t","-A","-F","|","-c",q],
                       capture_output=True, text=True, timeout=30)
    return [l.strip() for l in r.stdout.strip().split('\n') if l.strip()]

def log(msg):
    ts = time.strftime('%Y-%m-%d %H:%M:%S')
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    with open(LOG, 'a') as f:
        f.write(line + '\n')

def download_audio(ext_id):
    """Download audio from YouTube video using yt-dlp."""
    out_path = f"/tmp/whisper_{ext_id}.wav"
    url = f"https://www.youtube.com/watch?v={ext_id}"
    r = subprocess.run(
        ["docker","exec","raiser-youtubedl","yt-dlp",
         "-x","--audio-format","wav",
         "--postprocessor-args","-ar 16000 -ac 1",
         "-o",f"/tmp/whisper_{ext_id}.%(ext)s",
         "--max-filesize","50M",
         "--download-sections","*0:00-15:00",  # First 15 min max
         url],
        capture_output=True, text=True, timeout=120
    )
    # Copy from container
    subprocess.run(["docker","cp",f"raiser-youtubedl:/tmp/whisper_{ext_id}.wav",out_path],
                   capture_output=True, timeout=30)
    subprocess.run(["docker","exec","raiser-youtubedl","sh","-c",f"rm -f /tmp/whisper_{ext_id}*"],
                   capture_output=True, timeout=10)
    return out_path if os.path.exists(out_path) else None

def transcribe_gpu(wav_path):
    """Transcribe using GPU WhisperFlow."""
    r = subprocess.run(
        ["curl","-s","-X","POST",GPU_STT_URL,"-F",f"audio=@{wav_path}"],
        capture_output=True, text=True, timeout=300
    )
    try:
        data = json.loads(r.stdout)
        return data.get("text", "")
    except:
        return None

def main():
    # Get videos marked as [no transcript]
    rows = sql("SELECT id || '|' || external_id || '|' || title FROM content.content WHERE description = '[no transcript]' ORDER BY id")
    total = len(rows)
    log(f"Whisper fallback: {total} videos without subtitles")
    
    success, failed = 0, 0
    for i, row in enumerate(rows):
        parts = row.split('|', 2)
        if len(parts) < 2: continue
        cid, ext_id = parts[0], parts[1]
        title = parts[2][:50] if len(parts) > 2 else '?'
        
        wav = download_audio(ext_id)
        if not wav:
            failed += 1
            continue
        
        text = transcribe_gpu(wav)
        os.remove(wav) if os.path.exists(wav) else None
        
        if text and len(text) > 50:
            safe = text.replace("$$", "$ $")[:500000]
            sql(f"UPDATE content.content SET description = $${safe}$$ WHERE id = {cid};", user="postgres")
            success += 1
            if success % 10 == 0:
                log(f"Progress: {success}/{total} transcribed via GPU Whisper, {failed} failed")
        else:
            failed += 1
        
        if (i+1) % 5 == 0:
            time.sleep(2)
    
    log(f"COMPLETE: {success}/{total} via GPU Whisper, {failed} failed")

if __name__ == "__main__":
    main()
