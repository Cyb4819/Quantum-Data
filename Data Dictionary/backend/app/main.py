from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.logging import setup_logging
from app.api.routes import ai
from app.api.routes import extract

setup_logging()

app = FastAPI(
    title="Data Dictionary Backend API",
    description="Extract, analyze, and document enterprise database schemas with AI",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(ai.router, prefix="/api/ai", tags=["ai-features"])
app.include_router(extract.router, prefix="/api/extract", tags=["schema-extraction"])


@app.get("/healthz", tags=["health"])
async def healthz():
    return {"status": "ok", "service": "data-dictionary-backend"}
