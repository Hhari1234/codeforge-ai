# AGENTS.md — CodeForge AI

## Project Overview

CodeForge AI is a full-stack AI developer platform with two independently
run applications in one repo:

- `backend/` — FastAPI (Python) REST API. Handles auth, database, and all
  LLM calls via OpenRouter. Frontend never calls the LLM directly.
- `frontend/` — React + TypeScript + Vite SPA. Talks to the backend only
  through `frontend/src/services/api.ts` (a single Axios instance).

Backend and frontend are separate applications with separate dependency
managers, separate `.env` files, and separate dev servers. They are NOT
a single Node/Python hybrid workspace — do not try to unify them.

## Primary Commands

### Backend (run from `backend/`)

```bash
source venv/bin/activate          # activate venv (create with: python -m venv venv)
pip install -r requirements.txt   # install/update deps
uvicorn app.main:app --reload     # run dev server (http://localhost:8000)
```

API docs: http://localhost:8000/docs

### Frontend (run from `frontend/`)

```bash
npm install       # install deps
npm run dev       # run dev server (http://localhost:5173)
npm run lint      # ESLint
npm run build     # production build
```

## Environment & Secrets

- `backend/.env` — SECRET_KEY, OPENROUTER_API_KEY, DATABASE_URL, etc.
  Never committed. Copy from `backend/.env.example`.
- `frontend/.env` — VITE_API_URL only. Never put secrets here — anything
  prefixed `VITE_` is bundled into client-side JS and publicly visible.
- Agents must never print, log, or commit `.env` contents. If a task
  requires a secret value, ask the user to supply/verify it manually.

## Package Management Rules

- Do NOT create a root-level `package.json`, `pnpm-workspace.yaml`, or
  any monorepo tooling (Turborepo, Nx, Lerna, etc.) unless explicitly
  instructed. This repo is intentionally two standalone apps sharing a
  Git history — not a JS monorepo.
- Do NOT install frontend deps from the repo root. Always `cd frontend`
  first.
- Do NOT install backend deps outside the `backend/venv` virtual
  environment.
- If a task seems to require shared tooling across both folders (e.g.
  a shared linter config), flag it to the user rather than adding it
  unilaterally.

## Backend Conventions

- Layering: `api/routes/` (HTTP layer, thin) → `services/` (business
  logic) → `models/` (SQLAlchemy ORM) / `schemas/` (Pydantic I/O shapes).
  Route handlers should not contain business logic directly — call a
  service function.
- New endpoints go in `app/api/routes/<feature>.py` and are registered
  in `app/main.py` via `app.include_router(...)`.
- Auth: JWT via `app/core/security.py`. Protected routes depend on
  `get_current_user` from `app/api/deps.py`.
- Config: all env-driven values go through `app/core/config.py`
  (`Settings`), never `os.getenv()` scattered in route/service files.
- AI calls: only `app/ai/client.py` (`OpenRouterClient`) is allowed to
  call the OpenRouter API. Feature modules under `app/ai/<module>/`
  import and use this client — they never call `httpx`/OpenRouter
  directly themselves.

## Frontend Conventions

- All backend calls go through `frontend/src/services/api.ts`
  (the shared Axios instance). Do not instantiate `axios` directly in
  components or hooks.
- API base URL comes from `VITE_API_URL` in `frontend/.env` — never
  hardcode `http://localhost:8000` in component code.
- Auth token is read/attached via the Axios request interceptor in
  `api.ts`. Components should not manually set the `Authorization`
  header.
- New features: colocate by domain under `src/pages/` or
  `src/components/`, with API calls extracted into `src/services/`
  and shared logic into `src/hooks/`.

## Scoped agent/skill concepts

- `backend-auth-fix`
  - Scoped agent for debugging/extending the JWT auth flow
    (`core/security.py`, `api/deps.py`, `services/auth_service.py`,
    `models/user.py`). Useful for auth bugs like expired tokens, 401s on
    valid tokens, or password/hash mismatches.
- `frontend-api-integration`
  - Scoped agent for wiring a new backend endpoint into the frontend:
    adding the typed request/response in `services/`, a hook if needed,
    and the component that consumes it — always going through the
    shared `api.ts` instance and `VITE_API_URL`, never a one-off
    `fetch`/`axios` call.
