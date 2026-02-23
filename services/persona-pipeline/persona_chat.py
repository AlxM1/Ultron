"""Persona chat and script generation for persona-pipeline.

Uses Ollama (OLLAMA_URL) to power conversations and content generation
in the style of the analyzed persona.
"""

import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger("persona_chat")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://10.25.10.60:11434")
DEFAULT_LLM_MODEL = os.getenv("DEFAULT_LLM_MODEL", "llama3.2")
CHAT_TIMEOUT = 120.0
SCRIPT_TIMEOUT = 300.0


async def _ollama_generate(prompt: str, system: str = "", timeout: float = CHAT_TIMEOUT) -> str:
    """Call Ollama /api/generate and return the response text."""
    payload = {
        "model": DEFAULT_LLM_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.7,
            "num_predict": 2048,
        },
    }
    if system:
        payload["system"] = system

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(f"{OLLAMA_URL}/api/generate", json=payload)
            resp.raise_for_status()
            return resp.json().get("response", "").strip()
    except Exception as e:
        logger.error(f"Ollama generate failed: {e}")
        raise RuntimeError(f"LLM generation failed: {e}")


async def chat(persona: dict, message: str, output_type: str = "chat") -> str:
    """Chat with a persona.

    Args:
        persona: Persona dict from database (includes system_prompt)
        message: User's message
        output_type: "chat" or other type

    Returns:
        Response text from the persona
    """
    system_prompt = persona.get("system_prompt") or (
        f"You are {persona['name']}, a content creator. "
        "Respond as this person would, in their characteristic voice and style."
    )

    # Optionally pull in relevant content context
    try:
        from database import get_relevant_content
        relevant = await get_relevant_content(persona["id"], message, limit=3)
        if relevant:
            context_parts = []
            for item in relevant:
                if item.get("transcript"):
                    context_parts.append(
                        f"[From '{item['title']}']: {item['transcript'][:500]}..."
                    )
            if context_parts:
                context = "\n\nRelevant content context:\n" + "\n".join(context_parts)
                system_prompt = system_prompt + context
    except Exception as e:
        logger.warning(f"Could not fetch relevant content: {e}")

    response = await _ollama_generate(message, system=system_prompt, timeout=CHAT_TIMEOUT)
    return response


async def generate_script(
    persona: dict,
    topic: str,
    duration_minutes: int = 10,
    style: str = "monologue",
) -> str:
    """Generate a script in the persona's style.

    Args:
        persona: Persona dict from database
        topic: Topic for the script
        duration_minutes: Approximate duration
        style: "monologue", "tutorial", "review", etc.

    Returns:
        Generated script text
    """
    name = persona["name"]
    system_prompt = persona.get("system_prompt") or (
        f"You are {name}, a content creator. Write in their characteristic voice."
    )

    word_count = duration_minutes * 130  # ~130 words/minute

    prompt = (
        f"Write a {style} script about '{topic}' in the style of {name}. "
        f"The script should be approximately {word_count} words (~{duration_minutes} minutes when spoken). "
        f"Include natural speech patterns, transitions, and any characteristic phrases or expressions. "
        f"Format it as a script with clear sections. Do not include stage directions or timestamps."
    )

    script = await _ollama_generate(prompt, system=system_prompt, timeout=SCRIPT_TIMEOUT)
    return script
