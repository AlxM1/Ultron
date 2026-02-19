import re
import json
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy import text

from config import DATABASE_URL

logger = logging.getLogger("database")

engine = create_async_engine(DATABASE_URL, pool_size=5, max_overflow=10)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


async def create_persona_agent(name: str, source_url: str, platform: str, max_videos: int) -> dict:
    slug = slugify(name)
    async with async_session() as session:
        result = await session.execute(
            text("""
                INSERT INTO persona_agents (name, slug, source_url, platform, max_videos)
                VALUES (:name, :slug, :source_url, :platform, :max_videos)
                RETURNING id, name, slug, status
            """),
            {"name": name, "slug": slug, "source_url": source_url, "platform": platform, "max_videos": max_videos},
        )
        row = result.mappings().one()
        await session.commit()
        return dict(row)


async def get_all_personas() -> list[dict]:
    async with async_session() as session:
        result = await session.execute(
            text("SELECT id, name, slug, platform, status, total_content, total_words, created_at FROM persona_agents ORDER BY created_at DESC")
        )
        return [dict(r) for r in result.mappings().all()]


async def get_persona_by_slug(slug: str) -> Optional[dict]:
    async with async_session() as session:
        result = await session.execute(
            text("SELECT * FROM persona_agents WHERE slug = :slug"),
            {"slug": slug},
        )
        row = result.mappings().first()
        return dict(row) if row else None


async def get_persona_by_id(persona_id: int) -> Optional[dict]:
    async with async_session() as session:
        result = await session.execute(
            text("SELECT * FROM persona_agents WHERE id = :id"),
            {"id": persona_id},
        )
        row = result.mappings().first()
        return dict(row) if row else None


async def update_persona_status(persona_id: int, status: str, error_message: str = None):
    async with async_session() as session:
        await session.execute(
            text("UPDATE persona_agents SET status = :status, error_message = :error, updated_at = NOW() WHERE id = :id"),
            {"status": status, "error": error_message, "id": persona_id},
        )
        await session.commit()


async def update_persona_profile(
    persona_id: int,
    system_prompt: str,
    personality_summary: str,
    speaking_style: dict,
    topics: list,
    catchphrases: list,
    vocabulary: list,
    tone_descriptors: list,
    total_content: int,
    total_words: int,
):
    async with async_session() as session:
        await session.execute(
            text("""
                UPDATE persona_agents SET
                    system_prompt = :system_prompt,
                    personality_summary = :personality_summary,
                    speaking_style = :speaking_style,
                    topics = :topics,
                    catchphrases = :catchphrases,
                    vocabulary = :vocabulary,
                    tone_descriptors = :tone_descriptors,
                    total_content = :total_content,
                    total_words = :total_words,
                    updated_at = NOW()
                WHERE id = :id
            """),
            {
                "system_prompt": system_prompt,
                "personality_summary": personality_summary,
                "speaking_style": json.dumps(speaking_style),
                "topics": json.dumps(topics),
                "catchphrases": json.dumps(catchphrases),
                "vocabulary": json.dumps(vocabulary),
                "tone_descriptors": json.dumps(tone_descriptors),
                "total_content": total_content,
                "total_words": total_words,
                "id": persona_id,
            },
        )
        await session.commit()


async def create_content_record(
    persona_id: int,
    source_url: str,
    content_type: str,
    title: str = None,
    transcript: str = None,
    metadata: dict = None,
    duration_secs: int = None,
    word_count: int = None,
) -> dict:
    async with async_session() as session:
        result = await session.execute(
            text("""
                INSERT INTO persona_content (persona_id, source_url, content_type, title, transcript, metadata, duration_secs, word_count)
                VALUES (:persona_id, :source_url, :content_type, :title, :transcript, :metadata, :duration_secs, :word_count)
                RETURNING id
            """),
            {
                "persona_id": persona_id,
                "source_url": source_url,
                "content_type": content_type,
                "title": title,
                "transcript": transcript,
                "metadata": json.dumps(metadata or {}),
                "duration_secs": duration_secs,
                "word_count": word_count,
            },
        )
        row = result.mappings().one()
        await session.commit()
        return dict(row)


async def update_content_status(content_id: int, status: str, error_message: str = None, transcript: str = None, word_count: int = None):
    async with async_session() as session:
        if transcript is not None:
            await session.execute(
                text("UPDATE persona_content SET status = :status, error_message = :error, transcript = :transcript, word_count = :word_count WHERE id = :id"),
                {"status": status, "error": error_message, "transcript": transcript, "word_count": word_count, "id": content_id},
            )
        else:
            await session.execute(
                text("UPDATE persona_content SET status = :status, error_message = :error WHERE id = :id"),
                {"status": status, "error": error_message, "id": content_id},
            )
        await session.commit()


async def get_existing_source_urls(persona_id: int) -> set[str]:
    async with async_session() as session:
        result = await session.execute(
            text("SELECT source_url FROM persona_content WHERE persona_id = :pid"),
            {"pid": persona_id},
        )
        return {row["source_url"] for row in result.mappings().all()}


async def get_content_for_persona(persona_id: int, content_type: str = None, limit: int = 1000) -> list[dict]:
    async with async_session() as session:
        if content_type:
            result = await session.execute(
                text("SELECT * FROM persona_content WHERE persona_id = :pid AND content_type = :ct ORDER BY created_at LIMIT :limit"),
                {"pid": persona_id, "ct": content_type, "limit": limit},
            )
        else:
            result = await session.execute(
                text("SELECT * FROM persona_content WHERE persona_id = :pid ORDER BY created_at LIMIT :limit"),
                {"pid": persona_id, "limit": limit},
            )
        return [dict(r) for r in result.mappings().all()]


async def get_persona_content(slug: str, limit: int = 20, offset: int = 0) -> dict:
    async with async_session() as session:
        persona = await session.execute(text("SELECT id FROM persona_agents WHERE slug = :slug"), {"slug": slug})
        row = persona.mappings().first()
        if not row:
            return {"content": [], "total": 0}
        pid = row["id"]
        count_result = await session.execute(text("SELECT COUNT(*) as cnt FROM persona_content WHERE persona_id = :pid"), {"pid": pid})
        total = count_result.mappings().one()["cnt"]
        result = await session.execute(
            text("SELECT id, source_url, content_type, title, status, word_count, duration_secs, created_at FROM persona_content WHERE persona_id = :pid ORDER BY created_at LIMIT :limit OFFSET :offset"),
            {"pid": pid, "limit": limit, "offset": offset},
        )
        return {"content": [dict(r) for r in result.mappings().all()], "total": total}


async def get_relevant_content(persona_id: int, query: str, limit: int = 3) -> list[dict]:
    """Simple keyword-based content retrieval."""
    keywords = [w.lower() for w in query.split() if len(w) > 3]
    if not keywords:
        async with async_session() as session:
            result = await session.execute(
                text("SELECT title, transcript FROM persona_content WHERE persona_id = :pid AND transcript IS NOT NULL ORDER BY created_at DESC LIMIT :limit"),
                {"pid": persona_id, "limit": limit},
            )
            return [dict(r) for r in result.mappings().all()]

    like_clauses = " OR ".join(f"LOWER(transcript) LIKE :kw{i}" for i in range(len(keywords)))
    params = {"pid": persona_id, "limit": limit}
    for i, kw in enumerate(keywords):
        params[f"kw{i}"] = f"%{kw}%"

    async with async_session() as session:
        result = await session.execute(
            text(f"SELECT title, transcript FROM persona_content WHERE persona_id = :pid AND transcript IS NOT NULL AND ({like_clauses}) LIMIT :limit"),
            params,
        )
        rows = [dict(r) for r in result.mappings().all()]
        if not rows:
            result = await session.execute(
                text("SELECT title, transcript FROM persona_content WHERE persona_id = :pid AND transcript IS NOT NULL ORDER BY created_at DESC LIMIT :limit"),
                {"pid": persona_id, "limit": limit},
            )
            rows = [dict(r) for r in result.mappings().all()]
        return rows


async def save_output(persona_id: int, prompt: str, output: str, output_type: str):
    async with async_session() as session:
        await session.execute(
            text("INSERT INTO persona_outputs (persona_id, prompt, output, output_type) VALUES (:pid, :prompt, :output, :otype)"),
            {"pid": persona_id, "prompt": prompt, "output": output, "otype": output_type},
        )
        await session.commit()


async def delete_persona_by_slug(slug: str) -> bool:
    async with async_session() as session:
        result = await session.execute(text("DELETE FROM persona_agents WHERE slug = :slug RETURNING id"), {"slug": slug})
        row = result.mappings().first()
        await session.commit()
        return row is not None
