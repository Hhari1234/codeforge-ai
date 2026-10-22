"""OpenRouter chat client — the ONLY module allowed to call the OpenRouter API.

Reliability design:

- Typed error hierarchy so callers can distinguish auth, payment, rate-limit,
  server, timeout, network, configuration and empty-response failures.
- Bounded retries with exponential backoff + jitter for *transient* failures
  only (429 / 5xx / timeouts / connection errors). The provider's ``Retry-After``
  header is honoured when present. Permanent errors (401/403/402/4xx) are never
  retried.
- Explicit per-request timeout from settings, and a ``max_tokens`` bound so
  output length stays predictable.
- Empty / missing completions are detected here (instead of surfacing later as
  confusing JSON parse errors downstream).
"""

from __future__ import annotations

import asyncio
import logging
import random

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# HTTP statuses that indicate a transient failure worth retrying.
_RETRYABLE_STATUSES = {408, 429, 500, 502, 503, 504}


class OpenRouterError(Exception):
    """Base class for all OpenRouter client failures."""

    status_code: int | None = None
    retryable: bool = False

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        if status_code is not None:
            self.status_code = status_code


class OpenRouterConfigError(OpenRouterError):
    """The provider is not configured (missing/placeholder API key)."""


class OpenRouterAuthError(OpenRouterError):
    """401/403 — invalid API key or forbidden."""


class OpenRouterPaymentRequired(OpenRouterError):
    """402 — the API key has no credits remaining."""


class OpenRouterRateLimitError(OpenRouterError):
    """429 — rate limited by the provider (transient)."""

    retryable = True

    def __init__(self, message: str, *, retry_after: float | None = None) -> None:
        super().__init__(message, status_code=429)
        self.retry_after = retry_after


class OpenRouterServerError(OpenRouterError):
    """5xx — provider-side failure (transient)."""

    retryable = True


class OpenRouterTimeoutError(OpenRouterError):
    """The request exceeded the configured timeout (transient)."""

    retryable = True


class OpenRouterUnavailableError(OpenRouterError):
    """Network-level failure such as DNS or connection errors (transient)."""

    retryable = True


class OpenRouterEmptyResponseError(OpenRouterError):
    """The provider returned 200 but with no usable completion content."""


class OpenRouterTruncatedError(OpenRouterError):
    """The completion was cut off by the output token limit."""


def _is_configured(api_key: str | None) -> bool:
    if not api_key or not api_key.strip():
        return False
    # Treat the documented placeholder as unconfigured.
    return api_key.strip() != "sk-or-v1-your-key-here"


class OpenRouterClient:
    def __init__(self):
        self.base_url = settings.OPENROUTER_BASE_URL
        self.api_key = settings.OPENROUTER_API_KEY
        self.model = settings.OPENROUTER_MODEL

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def chat(
        self,
        messages: list[dict],
        model: str | None = None,
        *,
        max_tokens: int | None = None,
        timeout: float | None = None,
    ) -> str:
        """Send a chat-completion request and return the assistant text.

        Raises an ``OpenRouterError`` subclass on failure; only transient
        failures are retried, with bounded exponential backoff and jitter.
        """
        if not _is_configured(self.api_key):
            raise OpenRouterConfigError(
                "The AI provider is not configured. Set OPENROUTER_API_KEY in "
                "backend/.env (get a key at https://openrouter.ai/keys) and "
                "restart the backend."
            )

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            # OpenRouter etiquette headers (optional, improves routing/UX).
            "HTTP-Referer": settings.FRONTEND_URL,
            "X-Title": "CodeForge AI",
        }
        payload = {
            "model": model or self.model,
            "messages": messages,
        }
        if max_tokens is None:
            max_tokens = settings.OPENROUTER_MAX_TOKENS
        if max_tokens and max_tokens > 0:
            payload["max_tokens"] = max_tokens

        request_timeout = timeout if timeout is not None else settings.OPENROUTER_TIMEOUT_SECONDS
        max_retries = max(0, settings.OPENROUTER_MAX_RETRIES)

        attempt = 0
        while True:
            try:
                response = await self._post(url, headers, payload, request_timeout)
            except OpenRouterError as exc:
                if exc.retryable and attempt < max_retries:
                    delay = self._backoff_delay(attempt, retry_after=None)
                    logger.warning(
                        "OpenRouter transient error (attempt %d/%d): %s — retrying in %.1fs",
                        attempt + 1,
                        max_retries + 1,
                        exc,
                        delay,
                    )
                    await asyncio.sleep(delay)
                    attempt += 1
                    continue
                raise

            if response.status_code == 200:
                return self._extract_content(response, model or self.model)

            error = self._status_error(response, model or self.model)
            if error.retryable and attempt < max_retries:
                retry_after = getattr(error, "retry_after", None)
                delay = self._backoff_delay(attempt, retry_after=retry_after)
                logger.warning(
                    "OpenRouter HTTP %d (attempt %d/%d) for model '%s' — retrying in %.1fs",
                    response.status_code,
                    attempt + 1,
                    max_retries + 1,
                    model or self.model,
                    delay,
                )
                await asyncio.sleep(delay)
                attempt += 1
                continue
            raise error

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    @staticmethod
    async def _post(
        url: str, headers: dict, payload: dict, timeout: float
    ) -> httpx.Response:
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                return await client.post(url, headers=headers, json=payload)
        except httpx.TimeoutException as exc:
            raise OpenRouterTimeoutError(
                f"The AI provider did not respond within {timeout:.0f}s. "
                "Try again, or use a smaller input."
            ) from exc
        except httpx.TransportError as exc:
            raise OpenRouterUnavailableError(
                f"Could not reach the AI provider: {exc}"
            ) from exc

    @staticmethod
    def _backoff_delay(attempt: int, retry_after: float | None) -> float:
        """Exponential backoff with full jitter, honouring Retry-After."""
        if retry_after is not None and retry_after > 0:
            # Provider told us how long to wait; add a little jitter.
            return min(retry_after + random.uniform(0, 0.5), 60.0)
        base = settings.OPENROUTER_RETRY_BASE_DELAY_SECONDS
        return min(base * (2**attempt) + random.uniform(0, 0.5), 60.0)

    @staticmethod
    def _parse_retry_after(response: httpx.Response) -> float | None:
        value = response.headers.get("Retry-After")
        if not value:
            return None
        try:
            return max(0.0, float(value))
        except ValueError:
            # HTTP-date form — not worth parsing precisely; fall back to backoff.
            return None

    @classmethod
    def _status_error(cls, response: httpx.Response, model: str) -> OpenRouterError:
        status = response.status_code
        body = response.text[:500]
        if status in (401, 403):
            return OpenRouterAuthError(
                f"OpenRouter rejected the API key (HTTP {status}). Check "
                f"OPENROUTER_API_KEY in backend/.env. Response: {body}",
                status_code=status,
            )
        if status == 402:
            return OpenRouterPaymentRequired(
                "The OpenRouter API key has no credits remaining (HTTP 402 "
                "Payment Required). Top it up and try again.",
                status_code=status,
            )
        if status == 429:
            retry_after = cls._parse_retry_after(response)
            message = "OpenRouter rate limit hit (HTTP 429)."
            if retry_after is not None:
                message += f" Retry after {retry_after:.0f}s."
            return OpenRouterRateLimitError(message, retry_after=retry_after)
        if status in _RETRYABLE_STATUSES:
            return OpenRouterServerError(
                f"OpenRouter returned HTTP {status}: {body}", status_code=status
            )
        # Other 4xx: request/config problem — never retry.
        return OpenRouterError(
            f"OpenRouter returned HTTP {status}: {body}", status_code=status
        )

    @staticmethod
    def _extract_content(response: httpx.Response, model: str) -> str:
        try:
            data = response.json()
        except ValueError as exc:
            raise OpenRouterEmptyResponseError(
                f"OpenRouter returned a non-JSON response for model '{model}'."
            ) from exc

        choices = data.get("choices")
        if not choices:
            logger.error(
                "OpenRouter returned no choices for model '%s'. Full response: %s",
                model,
                response.text[:1000],
            )
            raise OpenRouterEmptyResponseError(
                f"OpenRouter returned no choices for model '{model}'."
            )

        choice = choices[0]
        message = choice.get("message") or {}
        content = message.get("content")
        finish_reason = choice.get("finish_reason")
        usage = data.get("usage") or {}
        completion_tokens = usage.get("completion_tokens")
        # Reasoning models (o-style, deepseek-r1, etc.) may put their whole
        # answer in `reasoning_content` and leave `content` null/empty. That is
        # a real provider failure mode for us — we need final content, not
        # chain-of-thought — so detect it explicitly instead of reporting a
        # generic "empty response".
        reasoning = message.get("reasoning_content") or message.get("reasoning")

        if content is None or not str(content).strip():
            logger.error(
                "OpenRouter returned empty content for model '%s' "
                "(finish_reason=%s, completion_tokens=%s, has_reasoning=%s). "
                "Response prefix: %s",
                model,
                finish_reason,
                completion_tokens,
                bool(reasoning),
                response.text[:300],
            )
            if reasoning and str(reasoning).strip():
                raise OpenRouterEmptyResponseError(
                    f"The model '{model}' returned reasoning only, with no "
                    "final answer. Pick a different model (set "
                    "OPENROUTER_MODEL) or try again."
                )
            if finish_reason == "length":
                raise OpenRouterTruncatedError(
                    f"The model '{model}' hit the output token limit "
                    f"({completion_tokens} tokens generated) before producing "
                    "any usable content. Try a shorter input."
                )
            raise OpenRouterEmptyResponseError(
                f"The model '{model}' returned an empty response. "
                "Try again, or rephrase with a more specific input."
            )

        if finish_reason == "length":
            # Content exists but was cut off by the token limit; callers that
            # need complete JSON will fail schema validation with a clear error.
            logger.warning(
                "OpenRouter completion for model '%s' was truncated at the "
                "output token limit (backend cap %d, completion_tokens=%s).",
                model,
                settings.OPENROUTER_MAX_TOKENS,
                completion_tokens,
            )

        logger.info(
            "OpenRouter completion model='%s' finish_reason=%s "
            "completion_tokens=%s content_chars=%d",
            model,
            finish_reason,
            completion_tokens,
            len(str(content)),
        )
        return str(content)


openrouter_client = OpenRouterClient()
