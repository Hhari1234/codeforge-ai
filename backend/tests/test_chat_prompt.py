"""Tests for the repository-chat prompt builder (follow-up history support)."""

from app.ai.prompts.repository_chat_prompt import (
    MAX_HISTORY_TURNS,
    build_chat_user_prompt,
)


def test_prompt_without_history_is_unchanged_shape():
    prompt = build_chat_user_prompt("Where is auth?", ["def login(): ..."])
    assert "Question: Where is auth?" in prompt
    assert "def login(): ..." in prompt
    assert "Conversation so far" not in prompt


def test_prompt_includes_prior_turns():
    history = [
        {"role": "user", "content": "Where is login implemented?"},
        {"role": "assistant", "content": "In src/auth.py per the chunks."},
    ]
    prompt = build_chat_user_prompt("And logout?", ["def logout(): ..."], history)
    assert "Where is login implemented?" in prompt
    assert "In src/auth.py" in prompt
    assert "Question: And logout?" in prompt


def test_prompt_does_not_duplicate_current_question():
    history = [{"role": "user", "content": "What does main do?"}]
    prompt = build_chat_user_prompt("What does main do?", ["x = main()"], history)
    # Appears once as the rendered question, not twice.
    assert prompt.count("What does main do?") == 1


def test_prompt_bounds_history_length():
    history = [
        {"role": "user" if i % 2 == 0 else "assistant", "content": f"turn {i}"}
        for i in range(MAX_HISTORY_TURNS * 3)
    ]
    prompt = build_chat_user_prompt("now?", ["chunk"], history)
    # Only the most recent MAX_HISTORY_TURNS user/assistant turns are rendered.
    assert "turn 0" not in prompt
    assert f"turn {len(history) - 1}" in prompt


def test_prompt_truncates_very_long_history_messages():
    history = [{"role": "assistant", "content": "x" * 5000}]
    prompt = build_chat_user_prompt("q?", ["chunk"], history)
    assert "… (truncated)" in prompt
    assert "x" * 5000 not in prompt


def test_prompt_with_no_chunks_still_reports_no_context():
    prompt = build_chat_user_prompt("q?", [], None)
    assert "I don't have enough context" in prompt


def test_prompt_ignores_unknown_roles():
    history = [{"role": "system", "content": "secret system note"}]
    prompt = build_chat_user_prompt("q?", ["chunk"], history)
    assert "secret system note" not in prompt
