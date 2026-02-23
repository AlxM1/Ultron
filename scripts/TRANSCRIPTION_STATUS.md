# Transcript Extraction Status

**Date:** 2026-02-21 09:46 PST

## Summary

- **Total YouTube videos:** 8,299
- **Videos WITH transcripts:** 1,202 (14.5%)
- **Videos WITHOUT transcripts:** 7,097 (85.5%)

## Scripts Created

### 1. retry-subtitles.py
- **Purpose:** Extract auto-generated YouTube subtitles
- **Status:** ✅ COMPLETED
- **Results:** 0 subtitles found (all 7,097 videos need Whisper)
- **Runtime:** < 1 minute
- **Log:** `/home/eternity/.openclaw/workspace/Ultron/scripts/subtitle-retry.log`

### 2. whisper-transcribe.py
- **Purpose:** Transcribe videos using GPU Whisper API
- **Status:** 🔴 RUNNING BUT FAILING
- **Issue:** SSL connection timeout to YouTube
- **GPU Whisper API:** http://10.25.10.60:8765/transcribe (confirmed working)
- **Concurrency:** 3 parallel downloads/transcriptions
- **Estimated time:** ~59 hours (if network works)
- **Log:** `/home/eternity/.openclaw/workspace/Ultron/scripts/whisper-progress.log`

## Current Issue: Network Connectivity

**Problem:** SSL handshake timeout when connecting to YouTube
```
ERROR: [youtube] Unable to download API page: _ssl.c:983: The handshake operation timed out
```

**Testing:**
```bash
curl -I https://www.youtube.com/ --connect-timeout 10
# Result: curl: (28) SSL connection timeout
```

## Videos Processed So Far

- **Marked as "[no audio available]":** 3 videos
- **Remaining:** 7,094 videos

## Next Steps

### Option 1: Fix Network Connectivity (RECOMMENDED)
- Check if YouTube is blocked or rate-limited
- Verify DNS resolution: `nslookup youtube.com`
- Try using a proxy or VPN
- Check firewall rules

### Option 2: Use Existing Audio Files
- If audio files were previously downloaded, use those
- Modify script to skip download step and use local files

### Option 3: Use Alternative Download Method
- Try using docker container with different network namespace
- Use yt-dlp with different options (--proxy, --force-ipv4, etc.)

### Option 4: Use WhisperFlow Docker Container
- The WhisperFlow container at localhost:8766 might have different network access
- Could be used as an alternative to the GPU Whisper API

## Script Locations

- **Whisper transcription:** `/home/eternity/.openclaw/workspace/Ultron/scripts/whisper-transcribe.py`
- **Subtitle retry:** `/home/eternity/.openclaw/workspace/Ultron/scripts/retry-subtitles.py`
- **Logs:** `/home/eternity/.openclaw/workspace/Ultron/scripts/*.log`

## Database Info

- **Host:** localhost:5432
- **Database:** raiser
- **User:** postgres
- **Table:** content.content
- **Filter:** `platform = 'youtube' AND (description IS NULL OR description = '' OR description = '[no transcript]')`

## Commands

### Check script status
```bash
ps aux | grep -E '(whisper-transcribe|retry-subtitles)' | grep -v grep
```

### View logs
```bash
tail -f /home/eternity/.openclaw/workspace/Ultron/scripts/whisper-progress.log
tail -f /home/eternity/.openclaw/workspace/Ultron/scripts/subtitle-retry.log
```

### Check database
```bash
docker exec raiser-postgres psql -U postgres -d raiser -c \
  "SELECT COUNT(*) FROM content.content WHERE platform = 'youtube' AND (description IS NULL OR description = '' OR description = '[no transcript]');"
```

### Kill processes
```bash
pkill -f whisper-transcribe
pkill -f retry-subtitles
```
