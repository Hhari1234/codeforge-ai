# CodeForge AI — Phase 8 (Bug Debugger) + Phase 9 (API Documentation Generator)

## Plan (approved)

Mirror the Repository Analyzer / Code Reviewer architecture for two new modules.
Reuse: auth, cloning, ZIP ingestion, AI provider, history management, shared UI.

---

## PHASE 8 — BUG DEBUGGER (/api/debug + /debug)

### Backend
- [x] `app/schemas/bug_debug.py` — request / code-request / DebugBug / result / out / list-item schemas
- [x] `app/models/bug_debug.py` — `bug_debug_sessions` model (user_id FK, JSON result)
- [x] `app/services/bug_debug_service.py` — save / list / get / delete (per-user scoped)
- [x] `app/ai/prompts/bug_debug_prompt.py` — system prompt + repo builder (reuses tree/key-file formatters) + source builder
- [x] `app/ai/bug_debug/debugger.py` — `debug_repository()` + `debug_source()` LLM engine
- [x] `app/ai/bug_debug/__init__.py`
- [x] `app/api/routes/bug_debug.py` — POST /analyze-github, /analyze-zip, /analyze-file, /analyze-code; GET "", GET /{id}, DELETE /{id}
- [x] `app/main.py` — register model + router under `/api/debug`
- [x] `app/ai/llm_utils.py` — shared LLM JSON parsing helper (extracted, reused by both modules)

### Frontend
- [ ] `src/types/bugDebug.ts`
- [ ] `src/services/bugDebugService.ts`
- [ ] `src/hooks/useBugDebug.ts`
- [ ] `src/components/DebugHistoryList.tsx` (search + delete)
- [ ] `src/components/DebugResultView.tsx` (health score, severity dist, grouped by file, expandable bugs, copy fixed code, download JSON)
- [ ] `src/pages/BugDebuggerPage.tsx` (GitHub / ZIP / File / Paste tabs)
- [ ] `src/App.tsx` — `/debug` route
- [ ] `src/components/AppLayout.tsx` — "Bug Debugger" nav link

### Verification
- [ ] Backend imports + table creation
- [ ] Frontend lint + build
- [ ] E2E: GitHub, ZIP, single file, code paste
- [ ] History list / reload / delete / search
- [ ] Fix all TS/lint/runtime errors

---

## PHASE 9 — API DOCUMENTATION GENERATOR (/api/documentation + /documentation)

### Backend
- [ ] `app/schemas/api_documentation.py` — request / openapi-request / endpoint / auth / result / out / list-item schemas
- [ ] `app/models/api_documentation.py` — model (user_id FK, JSON result)
- [ ] `app/services/api_documentation_service.py` — save / list / get / delete
- [ ] `app/ai/prompts/api_documentation_prompt.py` — system prompt + repo builder + source builder + openapi builder (framework detection)
- [ ] `app/ai/api_documentation/generator.py` — `generate_documentation()` / `generate_documentation_from_source()` / `generate_documentation_from_openapi()`
- [ ] `app/ai/api_documentation/__init__.py`
- [ ] `app/api/routes/api_documentation.py` — POST /analyze-github, /analyze-zip, /analyze-file, /analyze-openapi; GET "", GET /{id}, DELETE /{id}
- [ ] `app/main.py` — register model + router

### Frontend
- [ ] `src/types/apiDocumentation.ts`
- [ ] `src/services/apiDocumentationService.ts`
- [ ] `src/hooks/useApiDocumentation.ts`
- [ ] `src/components/DocumentationHistoryList.tsx` (search + delete)
- [ ] `src/components/DocumentationResultView.tsx` (overview, framework, base URL, auth, endpoint search/filter, expandable details, copy endpoint/curl/json, export Markdown/HTML/PDF)
- [ ] `src/pages/ApiDocumentationPage.tsx` (GitHub / ZIP / File / OpenAPI tabs)
- [ ] `src/App.tsx` — `/documentation` route
- [ ] `src/components/AppLayout.tsx` — "API Docs" nav link

### Verification
- [ ] Backend imports + table creation
- [ ] Frontend lint + build
- [ ] E2E: GitHub, ZIP, single file, OpenAPI, framework detection
- [ ] Export functionality (Markdown / HTML / PDF)
- [ ] History list / reload / delete / search
- [ ] Fix all TS/lint/runtime errors

---

## FINAL
- [ ] Backend logs
- [ ] Frontend build output
- [ ] Runtime verification
- [ ] Files created / modified report
- [ ] Final verification checklist for both phases
