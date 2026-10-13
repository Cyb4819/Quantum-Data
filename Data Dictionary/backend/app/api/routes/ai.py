from fastapi import APIRouter, HTTPException
import httpx
from pydantic import BaseModel
from typing import Any, Optional
import json
import re
from app.ai.langchain_pipeline import LangChainPipeline
from app.core.logging import logger

router = APIRouter()


class QueryRequest(BaseModel):
    messages: list[dict]
    schema: Any
    db_type: Optional[str] = None
    execute_query: bool = True
    database: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    user: Optional[str] = None
    password: Optional[str] = None


@router.post("/query")
async def query(req: QueryRequest):
    try:
        schema = _normalize_schema(req.schema)

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

        if req.db_type == "postgresql" and not schema:
            raise HTTPException(
                status_code=400,
                detail=(
                    "No PostgreSQL tables were found in the extracted schema. "
                    "Check the selected database and the connected user's table permissions."
                ),
            )

        conversation = "\n".join(
            f"{msg.get('role', 'user')}: {msg.get('content', '')}"
            for msg in req.messages
            if msg.get("content")
        )

        pipeline = LangChainPipeline()
        result = await (
            pipeline.analyze_mongodb_request(schema, conversation)
            if req.db_type == "mongodb"
            else pipeline.analyze_postgresql_request(schema, conversation)
            if req.db_type == "postgresql"
            else pipeline.analyze_request(schema, conversation)
        )

        if isinstance(result, str) and result.startswith("[LOCAL STUB"):
            logger.warning(f"Using stub response: {result}")
            return {
                "status": "ok",
                "intent": "SCHEMA",
                "sql": None,
                "response": "GROQ_API_KEY not configured. Using stub response.",
            }

        try:
            if isinstance(result, str):
                result = result.strip()
                if result.startswith("```"):
                    result = re.sub(r"^```(?:json)?\s*|\s*```$", "", result, flags=re.IGNORECASE).strip()
            result = json.loads(result)
        except (json.JSONDecodeError, TypeError):
            raise HTTPException(status_code=400, detail="LLM returned invalid JSON")

        if req.execute_query and req.db_type == "mongodb" and result.get("intent") in {"QUERY", "MIXED"}:
            collection = _find_collection(result.get("collection"), schema, user_message)
            email = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", conversation)
            if email:
                customer_collection = next(
                    (name for name in schema if name.lower() == "customers"),
                    None,
                )
                if customer_collection:
                    collection = customer_collection
            if email and re.search(r"\b(where|address|stay|lives?)\b", user_message, re.I):
                customer_collection = next(
                    (name for name in schema if name.lower() == "customers"),
                    None,
                )
                if customer_collection:
                    collection = customer_collection
            if not collection:
                raise HTTPException(status_code=400, detail="MongoDB collection was not identified")

            query_filter = result.get("filter") or {}
            email = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", conversation)
            if email and not query_filter:
                query_filter = {"email": email.group(0)}
            if email and re.search(r"\b(where|address|stay|lives?)\b", user_message, re.I):
                query_filter = {"email": email.group(0)}

            from app.connectors.mongodb import MongoDBConnector

            connector = MongoDBConnector(database=req.database)
            await connector.connect()
            result["results"] = await connector.fetch_rows(
                collection,
                limit=min(max(int(result.get("limit", 100)), 1), 1000),
                query_filter=query_filter,
                projection=result.get("projection"),
            )
        elif req.execute_query and req.db_type == "postgresql" and result.get("intent") in {"QUERY", "MIXED"}:
            from app.connectors.postgresql import PostgresConnector

            connector = PostgresConnector(dsn=_postgres_dsn(req))
            await connector.connect()
            if not result.get("sql"):
                result["sql"] = _fallback_postgres_sql(schema, user_message)
            result["results"] = await connector.execute_sql(
                _normalize_postgres_sql(result.get("sql"))
            )
        return {"status": "ok", **result}

    except HTTPException:
        raise
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail="AI provider rate limit reached. Please wait and try again.",
            ) from e
        logger.exception("AI provider returned an HTTP error")
        raise HTTPException(
            status_code=502, detail="AI provider request failed."
        ) from e
    except Exception as e:
        logger.exception(f"Error in /query: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _normalize_schema(schema: Any) -> dict:
    if isinstance(schema, dict):
        if "tablesList" not in schema:
            return schema
        sources = [schema]
    elif isinstance(schema, list):
        sources = schema
    else:
        return {}

    normalized = {}
    for source in sources:
        if not isinstance(source, dict):
            continue

        tables = source.get("tablesList")
        if not isinstance(tables, list):
            tables = [source] if source.get("tableName") else []

        for table in tables:
            if not isinstance(table, dict):
                continue
            name = table.get("tableName")
            if isinstance(name, str) and name:
                normalized[name] = table

    return normalized


def _find_collection(candidate: Any, schema: Any, message: str) -> Optional[str]:
    names = list(schema) if isinstance(schema, dict) else []
    for name in names:
        if candidate and str(candidate).lower() == name.lower():
            return name
    lowered = message.lower()
    for name in names:
        if name.lower() in lowered or name.lower().rstrip("s") in lowered:
            return name
        if any(field in str(schema[name]).lower() for field in ("email", "customer")):
            if "email" in lowered or "customer" in lowered:
                return name
    return names[0] if len(names) == 1 else None


def _postgres_dsn(req: QueryRequest) -> str:
    from urllib.parse import quote

    host = req.host or "localhost"
    port = req.port or 5432
    user = quote(req.user or "postgres", safe="")
    password = quote(req.password or "", safe="")
    database = req.database or "postgres"
    return f"postgresql://{user}:{password}@{host}:{port}/{database}"


def _normalize_postgres_sql(sql: Any) -> str:
    if not isinstance(sql, str):
        raise HTTPException(status_code=400, detail="PostgreSQL query was not generated")

    normalized = sql.strip()
    normalized = re.sub(
        r"^```(?:sql)?\s*|\s*```$", "", normalized, flags=re.IGNORECASE
    ).strip()
    select_start = re.search(r"\bselect\b", normalized, flags=re.IGNORECASE)
    if select_start:
        normalized = normalized[select_start.start():].strip()
    return normalized


def _fallback_postgres_sql(schema: Any, message: str) -> str:
    if not isinstance(schema, dict) or not schema:
        raise HTTPException(status_code=400, detail="PostgreSQL schema is empty")

    names = list(schema)
    lowered_message = message.lower()
    table = next(
        (
            name
            for name in names
            if name.lower() in lowered_message
            or name.lower().rstrip("s") in lowered_message
        ),
        None,
    )
    if table is None and ("customer" in lowered_message or "email" in lowered_message):
        table = next(
            (
                name
                for name in names
                if any(
                    field in str(schema[name]).lower()
                    for field in ("customer", "email")
                )
            ),
            None,
        )
    table = table or (names[0] if len(names) == 1 else None)
    if table is None:
        raise HTTPException(status_code=400, detail="PostgreSQL table was not identified")

    safe_table = '"' + table.replace('"', '""') + '"'
    return f"SELECT * FROM {safe_table} LIMIT 100"
