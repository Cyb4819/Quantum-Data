import pytest
from httpx import AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_ai_query_endpoint(monkeypatch):
    async def fake_generate(self, text: str) -> str:
        return "stubbed:" + text[:20]

    from app.ai.groq_client import GroqClient

    monkeypatch.setattr(GroqClient, "generate_summary", fake_generate)

    async with AsyncClient(app=app, base_url="http://test") as ac:
        payload = {"data": {"foo": "bar"}}
        r = await ac.post("/api/ai/query", json=payload)
        assert r.status_code == 200
        assert "stubbed:" in r.json().get("output", "")
