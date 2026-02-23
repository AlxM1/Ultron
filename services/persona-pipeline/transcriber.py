"""Audio transcription for persona-pipeline.

Uses the GPU Whisper service (WHISPERFLOW_GPU_URL) to transcribe audio files.
Falls back to returning None on failure rather than raising.
"""

import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger("transcriber")

WHISPERFLOW_GPU_URL = os.getenv("WHISPERFLOW_GPU_URL", "http://10.25.10.60:8765")
TRANSCRIBE_ENDPOINT = f"{WHISPERFLOW_GPU_URL}/transcribe"
TRANSCRIBE_TIMEOUT = 600.0  # 10 min (long videos)


async def transcribe_audio(audio_path: str) -> Optional[str]:
    """Transcribe an audio file using the GPU Whisper service.

    Args:
        audio_path: Local path to the audio file.

    Returns:
        Transcription text string, or None on failure.
    """
    if not audio_path or not os.path.exists(audio_path):
        logger.error(f"Audio file not found: {audio_path}")
        return None

    file_size = os.path.getsize(audio_path)
    logger.info(f"Transcribing {audio_path} ({file_size / 1024:.1f} KB)")

    try:
        with open(audio_path, "rb") as f:
            audio_bytes = f.read()
    except Exception as e:
        logger.error(f"Failed to read audio file {audio_path}: {e}")
        return None

    # Determine MIME type from extension
    ext = os.path.splitext(audio_path)[1].lower()
    mime_map = {
        ".m4a": "audio/mp4",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".flac": "audio/flac",
        ".webm": "audio/webm",
        ".mp4": "video/mp4",
    }
    mime = mime_map.get(ext, "application/octet-stream")
    filename = os.path.basename(audio_path)

    try:
        async with httpx.AsyncClient(timeout=TRANSCRIBE_TIMEOUT) as client:
            resp = await client.post(
                TRANSCRIBE_ENDPOINT,
                files={"audio": (filename, audio_bytes, mime)},
            )
            resp.raise_for_status()
            result = resp.json()
            text = result.get("text", "").strip()
            if text:
                logger.info(f"Transcribed {len(text.split())} words from {filename}")
                return text
            else:
                logger.warning(f"Whisper returned empty transcription for {filename}")
                return None
    except httpx.TimeoutException:
        logger.error(f"Whisper transcription timed out for {filename}")
        return None
    except httpx.HTTPStatusError as e:
        logger.error(f"Whisper API error {e.response.status_code} for {filename}: {e.response.text[:200]}")
        return None
    except Exception as e:
        logger.error(f"Transcription failed for {filename}: {e}")
        return None
