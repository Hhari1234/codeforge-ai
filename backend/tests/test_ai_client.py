"""Tests for the OpenRouter client: error classification and bounded retries."""

import json as jsonlib

import httpx
import pytest

from app.ai.client import (
    OpenRouterAuthError,
    OpenRouterConfigError,
    OpenRouterEmptyResponseError,
    OpenRouterError,
    OpenRouterPaymentRequired,
    OpenRouterRateLimitError,
    OpenRouterServerError,
    OpenRouterTimeoutError,
    OpenRouterTruncatedError,
    openrouter_client,
)


def _completion(content):
    return {
        "choices": [
            {"message": {"role": "assistant", "content": content}, "finish_reason": "stop"}
        ]
    }


def install_transport(monkeypatch, handler):
    """Route the client's HTTP calls into a MockTransport driven by ``handler``."""
    calls: list[httpx.Request] = []
    original_async_client = httpx.AsyncClient

    def factory(*args, **kwargs):
        def route(request):
            calls.append(request)
            return handler(request)

        # Use the saved original class — httpx.AsyncClient is patched below,
        # so referencing it here would recurse forever.
        return original_async_client(transport=httpx.MockTransport(route))

    monkeypatch.setattr("app.ai.client.httpx.AsyncClient", factory)
    return calls


def ok_handler(request):
    return httpx.Response(200, json=_completion("hello world"))


@pytest.fixture(autouse=True)
def _fast_retries(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "OPENROUTER_RETRY_BASE_DELAY_SECONDS", 0.0)


@pytest.mark.asyncio
async def test_success_returns_content(monkeypatch):
    calls = install_transport(monkeypatch, ok_handler)
    reply = await openrouter_client.chat([{"role": "user", "content": "hi"}])
    assert reply == "hello world"
    assert len(calls) == 1
    body = jsonlib.loads(calls[0].content)
    assert body["max_tokens"] > 0


@pytest.mark.asyncio
async def test_missing_api_key_raises_config_error(monkeypatch):
    monkeypatch.setattr(openrouter_client, "api_key", "")
    with pytest.raises(OpenRouterConfigError, match="OPENROUTER_API_KEY"):
        await openrouter_client.chat([{"role": "user", "content": "hi"}])


@pytest.mark.asyncio
async def test_placeholder_api_key_raises_config_error(monkeypatch):
    monkeypatch.setattr(openrouter_client, "api_key", "sk-or-v1-your-key-here")
    with pytest.raises(OpenRouterConfigError):
        await openrouter_client.chat([{"role": "user", "content": "hi"}])


@pytest.mark.asyncio
async def test_401_is_auth_error_and_never_retries(monkeypatch):
    calls = install_transport(
        monkeypatch, lambda r: httpx.Response(401, text="invalid key")
    )
    with pytest.raises(OpenRouterAuthError):
        await openrouter_client.chat([{"role": "user", "content": "hi"}])
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_402_is_payment_error_and_never_retries(monkeypatch):
    calls = install_transport(
        monkeypatch, lambda r: httpx.Response(402, text="no credits")
    )
    with pytest.raises(OpenRouterPaymentRequired, match="credits"):
        await openrouter_client.chat([{"role": "user", "content": "hi"}])
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_429_retries_then_succeeds(monkeypatch):
    state = {"n": 0}

    def handler(request):
        state["n"] += 1
        if state["n"] == 1:
            return httpx.Response(429, headers={"Retry-After": "0"}, text="slow down")
        return httpx.Response(200, json=_completion("recovered"))

    calls = install_transport(monkeypatch, handler)
    reply = await openrouter_client.chat([{"role": "user", "content": "hi"}])
    assert reply == "recovered"
    assert len(calls) == 2


@pytest.mark.asyncio
async def test_429_exhausts_retries_with_rate_limit_error(monkeypatch):
    calls = install_transport(
        monkeypatch,
        lambda r: httpx.Response(429, headers={"Retry-After": "0"}, text="always"),
    )
    with pytest.raises(OpenRouterRateLimitError):
        await openrouter_client.chat([{"role": "user", "content": "hi"}])
    # initial attempt + OPENROUTER_MAX_RETRIES (2) retries
    assert len(calls) == 3


@pytest.mark.asyncio
async def test_500_retries_then_fails_with_server_error(monkeypatch):
    calls = install_transport(monkeypatch, lambda r: httpx.Response(500, text="boom"))
    with pytest.raises(OpenRouterServerError):
        await openrouter_client.chat([{"role": "user", "content": "hi"}])
    assert len(calls) == 3


@pytest.mark.asyncio
async def test_400_does_not_retry(monkeypatch):
    calls = install_transport(
        monkeypatch, lambda r: httpx.Response(400, text="bad request")
    )
    with pytest.raises(OpenRouterError) as excinfo:
        await openrouter_client.chat([{"role": "user", "content": "hi"}])
    assert excinfo.value.status_code == 400
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_timeout_retries_then_raises(monkeypatch):
    calls = install_transport(
        monkeypatch,
        lambda r: (_ for _ in ()).throw(httpx.ConnectTimeout("timed out")),
    )
    with pytest.raises(OpenRouterTimeoutError, match="did not respond"):
        await openrouter_client.chat([{"role": "user", "content": "hi"}])
    assert len(calls) == 3


@pytest.mark.asyncio
async def test_empty_content_raises(monkeypatch):
    install_transport(monkeypatch, lambda r: httpx.Response(200, json=_completion("")))
    with pytest.raises(OpenRouterEmptyResponseError, match="empty response"):
        await openrouter_client.chat([{"role": "user", "content": "hi"}])


@pytest.mark.asyncio
async def test_null_content_raises(monkeypatch):
    install_transport(
        monkeypatch, lambda r: httpx.Response(200, json=_completion(None))
    )
    with pytest.raises(OpenRouterEmptyResponseError):
        await openrouter_client.chat([{"role": "user", "content": "hi"}])


@pytest.mark.asyncio
async def test_no_choices_raises(monkeypatch):
    install_transport(monkeypatch, lambda r: httpx.Response(200, json={"choices": []}))
    with pytest.raises(OpenRouterEmptyResponseError, match="no choices"):
        await openrouter_client.chat([{"role": "user", "content": "hi"}])


@pytest.mark.asyncio
async def test_truncated_completion_still_returns_content(monkeypatch):
    def handler(request):
        return httpx.Response(
            200,
            json={
                "choices": [
                    {"message": {"content": "partial"}, "finish_reason": "length"}
                ]
            },
        )

    install_transport(monkeypatch, handler)
    reply = await openrouter_client.chat([{"role": "user", "content": "hi"}])
    assert reply == "partial"


@pytest.mark.asyncio
async def test_reasoning_only_response_raises_actionable_error(monkeypatch):
    """Reasoning models may fill reasoning_content but leave content null."""
    install_transport(
        monkeypatch,
        lambda r: httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": None,
                            "reasoning_content": "let me think about this...",
                        },
                        "finish_reason": "stop",
                    }
                ],
                "usage": {"completion_tokens": 512},
            },
        ),
    )
    with pytest.raises(OpenRouterEmptyResponseError, match="reasoning only"):
        await openrouter_client.chat([{"role": "user", "content": "hi"}])


@pytest.mark.asyncio
async def test_empty_content_with_length_finish_raises_truncated(monkeypatch):
    """Token budget exhausted before any content was produced."""
    install_transport(
        monkeypatch,
        lambda r: httpx.Response(
            200,
            json={
                "choices": [
                    {"message": {"content": ""}, "finish_reason": "length"}
                ],
                "usage": {"completion_tokens": 8192},
            },
        ),
    )
    with pytest.raises(OpenRouterTruncatedError, match="output token limit"):
        await openrouter_client.chat([{"role": "user", "content": "hi"}])


@pytest.mark.asyncio
async def test_reasoning_burned_budget_raises_truncated_not_empty(monkeypatch):
    """Regression: reasoning tokens ate the whole budget (finish_reason=
    'length', empty content). Must report truncation, not "empty response",
    because the fix is a shorter input / bounded reasoning, not a retry."""
    install_transport(
        monkeypatch,
        lambda r: httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "content": "",
                            "reasoning_content": "thinking..." * 100,
                        },
                        "finish_reason": "length",
                    }
                ],
                "usage": {"completion_tokens": 8192},
            },
        ),
    )
    with pytest.raises(OpenRouterTruncatedError, match="on reasoning"):
        await openrouter_client.chat([{"role": "user", "content": "hi"}])


@pytest.mark.asyncio
async def test_payload_includes_reasoning_effort(monkeypatch):
    """Regression: reasoning effort must be sent so chain-of-thought cannot
    consume the whole completion budget on large prompts (production 502s)."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "OPENROUTER_REASONING_EFFORT", "low")
    calls = install_transport(monkeypatch, ok_handler)
    await openrouter_client.chat([{"role": "user", "content": "hi"}])
    body = jsonlib.loads(calls[0].content)
    assert body["reasoning"] == {"effort": "low"}


@pytest.mark.asyncio
async def test_payload_omits_reasoning_when_effort_empty(monkeypatch):
    """An empty OPENROUTER_REASONING_EFFORT must not send the parameter
    (for models that reject reasoning controls)."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "OPENROUTER_REASONING_EFFORT", "")
    calls = install_transport(monkeypatch, ok_handler)
    await openrouter_client.chat([{"role": "user", "content": "hi"}])
    body = jsonlib.loads(calls[0].content)
    assert "reasoning" not in body
