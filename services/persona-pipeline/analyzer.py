"""Persona analyzer for persona-pipeline.

Analyzes transcripts using the Ollama LLM (OLLAMA_URL) to extract:
- Personality summary
- Speaking style
- Key topics
- Catchphrases and vocabulary
- Tone descriptors
- A system prompt for chat roleplay
"""

import json
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger("analyzer")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://10.25.10.60:11434")
DEFAULT_LLM_MODEL = os.getenv("DEFAULT_LLM_MODEL", "llama3.2")
ANALYZE_TIMEOUT = 300.0  # 5 min for LLM generation


_ANALYSIS_PROMPT_TEMPLATE = """You are an expert content analyst. Analyze the following transcripts from a content creator named "{name}" and extract key characteristics of their persona.

TRANSCRIPTS (sample of {count} pieces of content):
{transcript_sample}

Based on these transcripts, provide a detailed analysis in the following JSON format (respond ONLY with valid JSON, no extra text):

{{
  "personality_summary": "2-3 sentence summary of this person's personality and what makes them unique as a creator",
  "speaking_style": "Detailed description of how they speak: sentence structure, pacing, directness, humor, etc.",
  "topics": ["topic1", "topic2", "topic3", "..."],
  "catchphrases": ["phrase1", "phrase2", "..."],
  "vocabulary": ["distinctive_word1", "distinctive_word2", "..."],
  "tone_descriptors": ["tone1", "tone2", "tone3"],
  "system_prompt": "A detailed system prompt (2-4 paragraphs) instructing an AI to roleplay as this creator. Include their communication style, topics they focus on, personality traits, and how they engage with their audience. Write it as instructions to the AI (e.g., 'You are [Name], a content creator known for...')"
}}

Focus on patterns that consistently appear across multiple pieces of content. Extract actual phrases and words they use frequently."""


def _truncate_transcripts(transcripts: list[dict], max_chars: int = 15000) -> str:
    """Select a representative sample of transcripts within char limit."""
    parts = []
    total = 0
    for t in transcripts:
        header = f"\n--- {t['type'].upper()}: {t['title']} ---\n"
        body = t["transcript"]
        # Truncate individual transcript if too long
        if len(body) > 3000:
            body = body[:3000] + "...[truncated]"
        chunk = header + body
        if total + len(chunk) > max_chars:
            break
        parts.append(chunk)
        total += len(chunk)

    if not parts and transcripts:
        # At least include one truncated
        t = transcripts[0]
        parts.append(f"\n--- {t['type'].upper()}: {t['title']} ---\n" + t["transcript"][:max_chars])

    return "\n".join(parts)


async def analyze_persona(name: str, transcripts: list[dict]) -> dict:
    """Analyze a persona from their transcripts using Ollama.

    Args:
        name: Creator's name
        transcripts: List of dicts with keys: title, transcript, type

    Returns:
        Dict with: system_prompt, personality_summary, speaking_style,
                   topics, catchphrases, vocabulary, tone_descriptors
    """
    if not transcripts:
        raise ValueError("No transcripts provided for analysis")

    transcript_sample = _truncate_transcripts(transcripts)
    prompt = _ANALYSIS_PROMPT_TEMPLATE.format(
        name=name,
        count=len(transcripts),
        transcript_sample=transcript_sample,
    )

    logger.info(f"Analyzing persona '{name}' from {len(transcripts)} transcripts using {DEFAULT_LLM_MODEL}")

    try:
        async with httpx.AsyncClient(timeout=ANALYZE_TIMEOUT) as client:
            resp = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": DEFAULT_LLM_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "num_predict": 2048,
                    },
                },
            )
            resp.raise_for_status()
            result = resp.json()
            raw_text = result.get("response", "").strip()
    except httpx.TimeoutException:
        logger.error(f"Ollama analysis timed out for {name}")
        raise RuntimeError("LLM analysis timed out")
    except Exception as e:
        logger.error(f"Ollama API error for {name}: {e}")
        raise RuntimeError(f"LLM analysis failed: {e}")

    # Parse JSON from response
    profile = _parse_analysis_json(raw_text, name)
    logger.info(f"Analysis complete for '{name}'")
    return profile


def _parse_analysis_json(text: str, name: str) -> dict:
    """Extract and parse JSON from LLM response, with fallback."""
    # Try direct parse
    try:
        data = json.loads(text)
        return _validate_profile(data, name)
    except json.JSONDecodeError:
        pass

    # Try to find JSON block in the response
    import re
    # Look for ```json ... ``` blocks
    json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group(1))
            return _validate_profile(data, name)
        except json.JSONDecodeError:
            pass

    # Try to find bare JSON object
    obj_match = re.search(r"\{.*\}", text, re.DOTALL)
    if obj_match:
        try:
            data = json.loads(obj_match.group(0))
            return _validate_profile(data, name)
        except json.JSONDecodeError:
            pass

    # Final fallback: construct a minimal profile from the raw text
    logger.warning(f"Could not parse JSON from LLM response for {name}, using fallback")
    return _fallback_profile(name, text)


def _validate_profile(data: dict, name: str) -> dict:
    """Ensure all required fields exist with correct types."""
    def ensure_list(val, default=None):
        if isinstance(val, list):
            return val
        if isinstance(val, str) and val:
            return [val]
        return default or []

    return {
        "system_prompt": str(data.get("system_prompt", f"You are {name}, a content creator. Respond in their characteristic style.")),
        "personality_summary": str(data.get("personality_summary", f"{name} is a content creator.")),
        "speaking_style": str(data.get("speaking_style", "Conversational and engaging.")),
        "topics": ensure_list(data.get("topics")),
        "catchphrases": ensure_list(data.get("catchphrases")),
        "vocabulary": ensure_list(data.get("vocabulary")),
        "tone_descriptors": ensure_list(data.get("tone_descriptors")),
    }


def _fallback_profile(name: str, raw_text: str) -> dict:
    """Minimal fallback profile when LLM parsing fails."""
    return {
        "system_prompt": f"You are {name}, a content creator. Speak in their characteristic style based on their content.",
        "personality_summary": f"{name} is a content creator whose transcripts have been analyzed.",
        "speaking_style": "Conversational and engaging.",
        "topics": [],
        "catchphrases": [],
        "vocabulary": [],
        "tone_descriptors": ["authentic", "engaging"],
    }
