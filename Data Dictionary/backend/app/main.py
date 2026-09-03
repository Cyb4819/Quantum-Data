from fastapi import FastAPI
from app.core.logging import setup_logging
from app.api.routes import ai

setup_logging()

app = FastAPI(
    title="Data Dictionary Backend API",
    description="Extract, analyze, and document enterprise database schemas with AI",
    version="1.0.0",
)

app.include_router(ai.router, prefix="/api/ai", tags=["ai-features"])


@app.get("/healthz", tags=["health"])
async def healthz():
    return {"status": "ok", "service": "data-dictionary-backend"}
