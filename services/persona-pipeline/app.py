import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from config import REFRESH_CRON
from auth import require_api_key, limiter

logger = logging.getLogger("app")

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: schedule refresh jobs for all ready personas
    from database import get_all_personas
    try:
        parts = REFRESH_CRON.split()
        trigger = CronTrigger(
            minute=parts[0], hour=parts[1], day=parts[2],
            month=parts[3], day_of_week=parts[4],
        )
        personas = await get_all_personas()
        for persona in personas:
            if persona["status"] == "ready":
                scheduler.add_job(
                    _run_refresh,
                    trigger=trigger,
                    args=[persona["id"]],
                    id=f"refresh-{persona['slug']}",
                    name=f"Refresh {persona['name']}",
                    replace_existing=True,
                )
                logger.info(f"Scheduled refresh for {persona['name']} ({REFRESH_CRON})")
        scheduler.start()
        logger.info(f"Scheduler started with {len(scheduler.get_jobs())} jobs")
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")
    yield
    # Shutdown
    scheduler.shutdown(wait=False)


async def _run_refresh(persona_id: int):
    from pipeline import run_incremental_update
    await run_incremental_update(persona_id)


app = FastAPI(title="Persona Pipeline", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


class CreatePersonaRequest(BaseModel):
    name: str
    source_url: str
    platform: str = "youtube"
    max_videos: int = 50
    twitter_url: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    output_type: str = "chat"


class GenerateScriptRequest(BaseModel):
    topic: str
    duration_minutes: int = 10
    style: str = "monologue"


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "persona-pipeline"}


@app.post("/api/personas")
@limiter.limit("10/minute")
async def create_persona(request: Request, req: CreatePersonaRequest, background_tasks: BackgroundTasks, _auth=Depends(require_api_key)):
    from pipeline import run_full_pipeline
    from database import create_persona_agent

    persona = await create_persona_agent(
        name=req.name,
        source_url=req.source_url,
        platform=req.platform,
        max_videos=req.max_videos,
    )

    background_tasks.add_task(run_full_pipeline, persona["id"], req.twitter_url)

    return {
        "id": persona["id"],
        "name": persona["name"],
        "slug": persona["slug"],
        "status": "pending",
        "message": f"Pipeline started. Processing up to {req.max_videos} videos.",
    }


@app.get("/api/personas")
@limiter.limit("30/minute")
async def list_personas(request: Request, _auth=Depends(require_api_key)):
    from database import get_all_personas

    personas = await get_all_personas()
    return {"personas": personas}


@app.get("/api/personas/{slug}")
@limiter.limit("30/minute")
async def get_persona(request: Request, slug: str, _auth=Depends(require_api_key)):
    from database import get_persona_by_slug

    persona = await get_persona_by_slug(slug)
    if not persona:
        raise HTTPException(404, "Persona not found")
    return persona


@app.get("/api/personas/{slug}/content")
@limiter.limit("30/minute")
async def get_persona_content(request: Request, slug: str, limit: int = 20, offset: int = 0, _auth=Depends(require_api_key)):
    from database import get_persona_content

    return await get_persona_content(slug, limit, offset)


@app.post("/api/personas/{slug}/chat")
@limiter.limit("30/minute")
async def chat_with_persona(request: Request, slug: str, req: ChatRequest, _auth=Depends(require_api_key)):
    from persona_chat import chat
    from database import get_persona_by_slug, save_output

    persona = await get_persona_by_slug(slug)
    if not persona:
        raise HTTPException(404, "Persona not found")
    if persona["status"] != "ready":
        raise HTTPException(400, f"Persona not ready. Status: {persona['status']}")

    response = await chat(persona, req.message, req.output_type)
    await save_output(persona["id"], req.message, response, req.output_type)

    return {"response": response, "persona": persona["name"]}


@app.post("/api/personas/{slug}/generate-script")
@limiter.limit("10/minute")
async def generate_script(request: Request, slug: str, req: GenerateScriptRequest, _auth=Depends(require_api_key)):
    from persona_chat import generate_script
    from database import get_persona_by_slug, save_output

    persona = await get_persona_by_slug(slug)
    if not persona:
        raise HTTPException(404, "Persona not found")

    script = await generate_script(persona, req.topic, req.duration_minutes, req.style)
    await save_output(persona["id"], f"Script: {req.topic}", script, "script")

    return {"script": script, "persona": persona["name"], "topic": req.topic}


@app.post("/api/personas/{slug}/reanalyze")
@limiter.limit("5/minute")
async def reanalyze_persona(request: Request, slug: str, background_tasks: BackgroundTasks, _auth=Depends(require_api_key)):
    from pipeline import run_analysis
    from database import get_persona_by_slug

    persona = await get_persona_by_slug(slug)
    if not persona:
        raise HTTPException(404, "Persona not found")

    background_tasks.add_task(run_analysis, persona["id"])
    return {"message": "Re-analysis started"}


@app.delete("/api/personas/{slug}")
async def delete_persona(request: Request, slug: str, _auth=Depends(require_api_key)):
    from database import delete_persona_by_slug

    deleted = await delete_persona_by_slug(slug)
    if not deleted:
        raise HTTPException(404, "Persona not found")
    return {"message": f"Persona '{slug}' deleted"}


@app.post("/api/personas/{slug}/refresh")
@limiter.limit("5/minute")
async def refresh_persona(request: Request, slug: str, background_tasks: BackgroundTasks, _auth=Depends(require_api_key)):
    from pipeline import run_incremental_update
    from database import get_persona_by_slug

    persona = await get_persona_by_slug(slug)
    if not persona:
        raise HTTPException(404, "Persona not found")
    if persona["status"] not in ("ready", "error"):
        raise HTTPException(400, f"Persona not available for refresh. Status: {persona['status']}")

    background_tasks.add_task(run_incremental_update, persona["id"])

    # Ensure this persona has a scheduled job
    job_id = f"refresh-{slug}"
    if not scheduler.get_job(job_id):
        parts = REFRESH_CRON.split()
        trigger = CronTrigger(
            minute=parts[0], hour=parts[1], day=parts[2],
            month=parts[3], day_of_week=parts[4],
        )
        scheduler.add_job(
            _run_refresh,
            trigger=trigger,
            args=[persona["id"]],
            id=job_id,
            name=f"Refresh {persona['name']}",
            replace_existing=True,
        )

    return {"message": f"Refresh started for '{persona['name']}'", "persona_id": persona["id"]}


@app.get("/api/scheduler")
async def get_scheduler_status(request: Request, _auth=Depends(require_api_key)):
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            "trigger": str(job.trigger),
        })
    return {"running": scheduler.running, "cron": REFRESH_CRON, "jobs": jobs}
