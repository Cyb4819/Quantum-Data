import os
import json
import httpx
from app.config import settings
from app.core.logging import logger


class GroqClient:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.model = getattr(settings, "MODEL_NAME", "groq-small")

    async def generate_summary(self, text: str) -> str:
        logger.debug("GroqClient.generate_summary called")
        if not self.api_key:
            logger.warning("GROQ_API_KEY not configured — using local stub summary")
            try:
                marker = "SAMPLE_EMPLOYEES:"
                if marker in text:
                    payload = text.split(marker, 1)[1].strip()
                    try:
                        data = json.loads(payload)
                    except Exception:
                        start = payload.find("{")
                        if start == -1:
                            start = payload.find("[")
                        if start != -1:
                            substring = payload[start:]
                            try:
                                data = json.loads(substring)
                            except Exception:
                                data = None
                        else:
                            data = None

                    if isinstance(data, list):
                        count = len(data)
                        keys = sorted(
                            list(
                                {
                                    k
                                    for item in data
                                    if isinstance(item, dict)
                                    for k in item.keys()
                                }
                            )
                        )
                        examples = json.dumps(data[:3], ensure_ascii=False)
                        return f"[LOCAL STUB SUMMARY] employees={count} | columns={keys} | examples={examples}"
                    elif isinstance(data, dict):
                        keys = sorted(list(data.keys()))
                        return f"[LOCAL STUB SUMMARY] object_keys={keys} | sample={json.dumps(data, ensure_ascii=False)[:400]}"

                preview = text if len(text) < 1000 else text[:1000] + "..."
                return (
                    f"[LOCAL STUB SUMMARY] preview={preview[:200]} | length={len(text)}"
                )
            except Exception:
                return "[LOCAL STUB SUMMARY] (unable to summarize input)"

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {"Authorization": f"Bearer {self.api_key}"}
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": text}],
            "temperature": 0.7,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                try:
                    resp.raise_for_status()
                except httpx.HTTPStatusError:
                    logger.error("Groq API error: %s %s", resp.status_code, resp.text)
                    raise
                data = resp.json()
                choices = data.get("choices")
                if isinstance(choices, list) and choices:
                    message = choices[0].get("message")
                    if message:
                        return message.get("content", "")
                return data.get("text", "")
        except (httpx.RequestError, OSError) as e:
            logger.error("Groq network error: %s", str(e))
            try:
                sample_path = os.path.normpath(
                    os.path.join(os.path.dirname(__file__), "..", "data", "sample.json")
                )
                if os.path.exists(sample_path):
                    with open(sample_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    if isinstance(data, list):
                        count = len(data)
                        keys = sorted(
                            list(
                                {
                                    k
                                    for item in data
                                    if isinstance(item, dict)
                                    for k in item.keys()
                                }
                            )
                        )
                        examples = json.dumps(data[:3], ensure_ascii=False)
                        return f"[LOCAL STUB SUMMARY] employees={count} | columns={keys} | examples={examples}"
                    elif isinstance(data, dict):
                        keys = sorted(list(data.keys()))
                        return f"[LOCAL STUB SUMMARY] object_keys={keys} | sample={json.dumps(data, ensure_ascii=False)[:400]}"
            except Exception:
                logger.exception("Failed to load local sample for fallback")

            return f"[LOCAL STUB SUMMARY due to network error: {str(e)}]"
