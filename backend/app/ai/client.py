import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class OpenRouterClient:
    def __init__(self):
        self.base_url = settings.OPENROUTER_BASE_URL
        self.api_key = settings.OPENROUTER_API_KEY
        self.model = settings.OPENROUTER_MODEL

    async def chat(self, messages: list[dict], model: str | None = None) -> str:
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model or self.model,
            "messages": messages,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, json=payload)

        if response.status_code != 200:
            raise RuntimeError(
                f"OpenRouter HTTP {response.status_code} for model "
                f"'{model or self.model}': {response.text[:500]}"
            )

        data = response.json()

        if not data.get("choices"):
            logger.error(
                "OpenRouter returned no choices for model '%s'. "
                "Full response: %s",
                model or self.model,
                response.text[:1000],
            )
            raise RuntimeError(
                f"OpenRouter returned no choices for model "
                f"'{model or self.model}'. Response: {response.text[:500]}"
            )

        return data["choices"][0]["message"]["content"]


openrouter_client = OpenRouterClient()
