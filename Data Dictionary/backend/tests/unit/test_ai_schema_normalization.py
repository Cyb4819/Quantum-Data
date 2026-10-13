import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api.routes.ai import _fallback_postgres_sql, _normalize_schema
from app.main import app


def test_normalize_schema_from_metadata_extraction_response():
    extracted_schema = [
        {
            "sourceName": "postgresql",
            "tablesList": [
                {
                    "tableName": "customers",
                    "tableType": "TABLE",
                    "columns": [
                        {"columnName": "email", "dataType": "varchar"},
                    ],
                }
            ],
        }
    ]

    schema = _normalize_schema(extracted_schema)

    assert list(schema) == ["customers"]
    assert schema["customers"]["columns"][0]["columnName"] == "email"
    assert _fallback_postgres_sql(schema, "Show client information") == (
        'SELECT * FROM "customers" LIMIT 100'
    )


def test_normalize_schema_preserves_already_normalized_schema():
    schema = {"customers": {"columns": [{"columnName": "email"}]}}

    assert _normalize_schema(schema) == schema


@pytest.mark.parametrize(
    ("db_type", "pipeline_method"),
    [
        ("postgresql", "analyze_postgresql_request"),
        ("mysql", "analyze_request"),
        ("mongodb", "analyze_mongodb_request"),
    ],
)
def test_ai_endpoint_passes_extracted_tables_to_provider_pipeline(
    monkeypatch, db_type, pipeline_method
):
    class SchemaAwarePipeline:
        async def analyze_postgresql_request(self, schema, conversation):
            return self._check_schema(schema, conversation)

        async def analyze_request(self, schema, conversation):
            return self._check_schema(schema, conversation)

        async def analyze_mongodb_request(self, schema, conversation):
            return self._check_schema(schema, conversation)

        @staticmethod
        def _check_schema(schema, conversation):
            assert "customers" in schema
            assert schema["customers"]["columns"][0]["columnName"] == "email"
            assert "qa.client@example.invalid" in conversation
            return json.dumps(
                {"intent": "SCHEMA", "sql": None, "response": "Schema received"}
            )

    monkeypatch.setattr("app.api.routes.ai.LangChainPipeline", SchemaAwarePipeline)

    response = TestClient(app).post(
        "/api/ai/query",
        json={
            "messages": [
                {
                    "role": "user",
                    "content": "Info about client with email: qa.client@example.invalid",
                }
            ],
            "schema": [
                {
                    "sourceName": db_type,
                    "tablesList": [
                        {
                            "tableName": "customers",
                            "columns": [{"columnName": "email"}],
                        }
                    ],
                }
            ],
            "db_type": db_type,
            "execute_query": False,
        },
    )

    assert response.status_code == 200
    assert response.json()["response"] == "Schema received"


def test_postgresql_empty_schema_returns_actionable_400():
    response = TestClient(app).post(
        "/api/ai/query",
        json={
            "messages": [
                {
                    "role": "user",
                    "content": "Info about client with email: qa.client@example.invalid",
                }
            ],
            "schema": [{"sourceName": "postgresql", "tablesList": []}],
            "db_type": "postgresql",
        },
    )

    assert response.status_code == 400
    assert "No PostgreSQL tables were found" in response.json()["detail"]


def test_ai_provider_rate_limit_is_returned_as_429(monkeypatch):
    class RateLimitedPipeline:
        async def analyze_postgresql_request(self, schema, conversation):
            request = httpx.Request(
                "POST", "https://api.groq.com/openai/v1/chat/completions"
            )
            response = httpx.Response(429, request=request)
            raise httpx.HTTPStatusError(
                "Too Many Requests", request=request, response=response
            )

    monkeypatch.setattr("app.api.routes.ai.LangChainPipeline", RateLimitedPipeline)

    response = TestClient(app).post(
        "/api/ai/query",
        json={
            "messages": [{"role": "user", "content": "Show client information"}],
            "schema": {"customers": {"columns": []}},
            "db_type": "postgresql",
        },
    )

    assert response.status_code == 429
    assert response.json()["detail"] == (
        "AI provider rate limit reached. Please wait and try again."
    )
