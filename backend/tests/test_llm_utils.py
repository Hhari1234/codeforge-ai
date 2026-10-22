"""Unit tests for app.ai.llm_utils — parsing pipeline and error mapping."""

import pytest
from pydantic import BaseModel

from app.ai.client import (
    OpenRouterAuthError,
    OpenRouterConfigError,
    OpenRouterEmptyResponseError,
    OpenRouterError,
    OpenRouterPaymentRequired,
    OpenRouterRateLimitError,
    OpenRouterServerError,
    OpenRouterTimeoutError,
)
from app.ai.llm_utils import (
    chat_json,
    escape_json_control_chars,
    extract_json_object,
    map_openrouter_error,
    parse_llm_json,
    strip_markdown_fences,
)


class SampleResult(BaseModel):
    title: str
    items: list[str]


class SampleError(Exception):
    pass


# ---------------------------------------------------------------------------
# strip_markdown_fences
# ---------------------------------------------------------------------------


def test_strip_fences_json_block():
    assert strip_markdown_fences('```json\n{"a": 1}\n```') == '{"a": 1}'


def test_strip_fences_plain_block():
    assert strip_markdown_fences('```\n{"a": 1}\n```') == '{"a": 1}'


def test_strip_fences_no_fence_unchanged():
    assert strip_markdown_fences('{"a": 1}') == '{"a": 1}'


# ---------------------------------------------------------------------------
# escape_json_control_chars
# ---------------------------------------------------------------------------


def test_escape_raw_newline_inside_string():
    text = '{"a": "line1\nline2"}'
    assert escape_json_control_chars(text) == '{"a": "line1\\nline2"}'


def test_escape_raw_tab_inside_string():
    text = '{"a": "x\ty"}'
    assert escape_json_control_chars(text) == '{"a": "x\\ty"}'


def test_escaped_sequences_pass_through():
    text = '{"a": "x\\ny"}'
    assert escape_json_control_chars(text) == '{"a": "x\\ny"}'


# ---------------------------------------------------------------------------
# extract_json_object
# ---------------------------------------------------------------------------


def test_extract_from_surrounding_prose():
    text = 'Sure! Here is the analysis:\n{"title": "t", "items": ["a"]}\nHope that helps.'
    assert extract_json_object(text) == '{"title": "t", "items": ["a"]}'


def test_extract_nested_objects():
    text = 'prefix {"outer": {"inner": 1}, "list": [1, 2]} suffix'
    assert extract_json_object(text) == '{"outer": {"inner": 1}, "list": [1, 2]}'


def test_extract_respects_braces_in_strings():
    text = 'x {"a": "close } brace", "b": 2}'
    assert extract_json_object(text) == '{"a": "close } brace", "b": 2}'


def test_extract_respects_escaped_quotes():
    text = 'x {"a": "he said \\"hi\\" }", "b": 2}'
    assert extract_json_object(text) == '{"a": "he said \\"hi\\" }", "b": 2}'


def test_extract_returns_none_without_object():
    assert extract_json_object("no json here at all") is None


# ---------------------------------------------------------------------------
# parse_llm_json
# ---------------------------------------------------------------------------


def test_parse_valid_json():
    result = parse_llm_json('{"title": "t", "items": ["a"]}', SampleResult)
    assert result.title == "t"
    assert result.items == ["a"]


def test_parse_fenced_json():
    result = parse_llm_json('```json\n{"title": "t", "items": []}\n```', SampleResult)
    assert result.title == "t"


def test_parse_prose_wrapped_json():
    raw = 'Here you go:\n{"title": "wrapped", "items": ["x"]}\nDone!'
    result = parse_llm_json(raw, SampleResult)
    assert result.title == "wrapped"


def test_parse_json_with_raw_newlines_in_strings():
    raw = '{"title": "line1\nline2", "items": []}'
    result = parse_llm_json(raw, SampleResult)
    assert result.title == "line1\nline2"


def test_parse_empty_reply_raises():
    with pytest.raises(ValueError, match="empty response"):
        parse_llm_json("   ", SampleResult)


def test_parse_non_json_raises():
    with pytest.raises(ValueError, match="valid JSON"):
        parse_llm_json("I cannot answer that question.", SampleResult)


def test_parse_schema_mismatch_raises():
    with pytest.raises(ValueError, match="schema"):
        parse_llm_json('{"title": 123, "items": "not-a-list"}', SampleResult)


def test_parse_json_array_raises_not_object():
    with pytest.raises(ValueError, match="JSON object"):
        parse_llm_json('[1, 2, 3]', SampleResult)


# ---------------------------------------------------------------------------
# map_openrouter_error
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("exc", "expected_fragment"),
    [
        (OpenRouterConfigError("not configured"), "not configured"),
        (OpenRouterAuthError("bad key"), "bad key"),
        (OpenRouterPaymentRequired("no credits"), "credits"),
        (OpenRouterRateLimitError("rate limited"), "rate-limited"),
        (OpenRouterTimeoutError("timed out after 5s"), "timed out"),
        (OpenRouterServerError("HTTP 503"), "temporary server error"),
        (OpenRouterEmptyResponseError("model returned an empty response"), "empty response"),
        (OpenRouterError("weird"), "AI provider error"),
    ],
)
def test_map_openrouter_error_messages(exc, expected_fragment):
    mapped = map_openrouter_error(exc, SampleError)
    assert isinstance(mapped, SampleError)
    assert expected_fragment.lower() in str(mapped).lower()


# ---------------------------------------------------------------------------
# chat_json pipeline (monkeypatched provider)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_chat_json_success(monkeypatch):
    from app.ai.client import openrouter_client

    async def fake_chat(messages, model=None, **kwargs):
        return '{"title": "ok", "items": ["a"]}'

    monkeypatch.setattr(openrouter_client, "chat", fake_chat)
    result = await chat_json(
        messages=[{"role": "user", "content": "hi"}],
        schema=SampleResult,
        error_cls=SampleError,
    )
    assert result.title == "ok"


@pytest.mark.asyncio
async def test_chat_json_repairs_malformed_first_reply(monkeypatch):
    from app.ai.client import openrouter_client

    replies = iter(
        [
            "Sorry, I cannot produce JSON right now.",
            '{"title": "repaired", "items": []}',
        ]
    )

    async def fake_chat(messages, model=None, **kwargs):
        return next(replies)

    monkeypatch.setattr(openrouter_client, "chat", fake_chat)
    result = await chat_json(
        messages=[{"role": "user", "content": "hi"}],
        schema=SampleResult,
        error_cls=SampleError,
    )
    assert result.title == "repaired"


@pytest.mark.asyncio
async def test_chat_json_raises_module_error_after_exhausted_repair(monkeypatch):
    from app.ai.client import openrouter_client

    async def fake_chat(messages, model=None, **kwargs):
        return "never any json"

    monkeypatch.setattr(openrouter_client, "chat", fake_chat)
    with pytest.raises(SampleError):
        await chat_json(
            messages=[{"role": "user", "content": "hi"}],
            schema=SampleResult,
            error_cls=SampleError,
        )


@pytest.mark.asyncio
async def test_chat_json_maps_provider_error(monkeypatch):
    from app.ai.client import openrouter_client

    async def fake_chat(messages, model=None, **kwargs):
        raise OpenRouterRateLimitError("slow down")

    monkeypatch.setattr(openrouter_client, "chat", fake_chat)
    with pytest.raises(SampleError, match="rate-limited"):
        await chat_json(
            messages=[{"role": "user", "content": "hi"}],
            schema=SampleResult,
            error_cls=SampleError,
        )
