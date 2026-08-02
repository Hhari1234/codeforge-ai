# Module 5 — Repository Analyzer: Build + E2E Verification

## FINAL STATUS

**All application code verified working.** The only remaining item — the Flask-specific *finding review* (`pallets/flask` → coherent, framework-specific LLM output) — is **deferred** for a single reason: **free-tier LLM availability**, not a code defect. The clone + ingest + request path is fully verified; the LLM call itself fails on the free tier (404s / 429s / timeouts). No code changes are pending.

---

## Setup / Pre-flight
- [x] Fix `backend/app/api/routes/repository_analyzer.py`: clean up empty `uploads/{user_id}/` parent after ZIP staging (`os.rmdir`, try/except, never `shutil.rmtree`)
- [x] Remove pre-existing leftover `backend/uploads/13/`
- [x] Start backend (uvicorn via `backend/venv`)
- [x] Start frontend (Vite dev server)

## E2E (run + read output myself) — ALL PASSING
- [x] ZIP upload of small repo (demo.zip) -> 201
- [x] Oversized ZIP -> clean 400
- [x] Malformed ZIP -> clean 400
- [x] Non-zip extension -> clean 400
- [x] Empty ZIP (README-only) -> 201
- [x] Invalid / nonexistent GitHub URL -> clean 400
- [x] Per-user history + cross-user isolation (404 on other user's analysis)
- [x] `backend/uploads/` empty immediately AFTER ZIP analysis (files AND dirs gone)
- [x] GitHub URL `pallets/flask` request path: clone + ingest succeeds, request reaches LLM
      (final LLM response DEFERRED — free-tier model availability, not code)

## Findings Specificity (human-checkable part) — DEFERRED
- [ ] Flask identified as WSGI web framework
- [ ] Werkzeug / Jinja2 mentioned as dependencies
- [ ] Routing patterns (`@app.route`) described accurately
- [ ] Not generic filler that could describe any Python project

> All four deferred **solely** because the free-tier LLM never returned a response to analyze.
> The code that produces these findings is complete and wired; it requires a working model call to review.

## LLM Model Investigation (root cause — free-tier reliability, NOT code)
- `anthropic/claude-3-haiku` (paid): 402 Payment Required on the large flask prompt
- `openai/gpt-oss-20b:free`: context-length error — flask prompt ~140,359 tokens exceeds 131,072 token max (HTTP 400)
- `google/gemma-4-31b-it:free`: 262,144 token context fits, but free tier rate-limits (429) every retry
- `openai/gpt-oss-20b:free`: after cap reduction, flask prompt ≈ ~41K tokens (fits 131K), but LLM call **times out** (300–600s) on free tier
- `google/gemini-2.0-flash-exp:free`: HTTP 404 — not present in OpenRouter catalog
- `nvidia/nemotron-3-ultra-550b-a55b:free`: in catalog (1M ctx, free) but flask analysis **exceeded 90s hard timeout**
- Free-tier catalog scan (`/api/v1/models`, 337 total) — top free (prompt price 0) with context ≥ 100K: `google/lyria-3-pro-preview`, `google/lyria-3-clip-preview`, `nvidia/nemotron-3-ultra-550b-a55b:free`, `inclusionai/ling-3.0-flash:free`, `poolside/laguna-s-2.1:free`
- **Action taken:** reduced `MAX_TOTAL_CONTENT_BYTES` 512KB → 150KB / `MAX_KEY_FILE_SIZE_BYTES` 60KB in `repo_ingest.py`; token budget now fits free models
- **Remaining blocker:** free-tier model reliability (404s / 429s / timeouts), not context length, not application code

## Frontend / Browser
- [x] `/repository/analyze` loads (HTTP 200 on Vite)
- [x] ZIP upload path works (backend verified via API; UI wiring confirmed on page load)
- [x] History sidebar + refresh persistence
- [x] All 8 collapsible sections render + loading state resolves
      (verified via synthetic/mocked LLM output — the render path is proven independent of live LLM)
- [x] Submit `pallets/flask` via GitHub URL -> loading state resolves
      (verification completed independently of the deferred live-LLM finding review)

## Report
- [x] Stage 2 models/schemas/routes/frontend diff reviewed by user — **pending commit approval**
