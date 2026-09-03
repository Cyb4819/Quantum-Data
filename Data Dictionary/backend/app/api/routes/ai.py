from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any
import json
from app.ai.langchain_pipeline import LangChainPipeline
from app.core.logging import logger

router = APIRouter()


class QueryRequest(BaseModel):
    messages: list[dict]
    schema: Any


@router.post("/query")
async def query(req: QueryRequest):
    try:
        user_message = next(
            (
                msg.get("content")
                for msg in reversed(req.messages)
                if msg.get("role") == "user"
            ),
            None,
        )

        if not user_message:
            raise HTTPException(status_code=400, detail="No user message found")

        pipeline = LangChainPipeline()
        result = await pipeline.analyze_request(req.schema, user_message)

        if isinstance(result, str) and result.startswith("[LOCAL STUB"):
            logger.warning(f"Using stub response: {result}")
            return {
                "status": "ok",
                "intent": "SCHEMA",
                "sql": None,
                "response": "GROQ_API_KEY not configured. Using stub response.",
            }

        try:
            result = json.loads(result)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail="LLM returned invalid JSON")
        return {"status": "ok", **result}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error in /query: {e}")
        raise HTTPException(status_code=500, detail=str(e))
