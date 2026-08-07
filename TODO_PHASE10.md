# CodeForge AI — Phase 10 (Small Subset)

Scope agreed with user (out of the full Phase 10 list):
Alembic migrations, Postgres connection pooling, Docker healthcheck fix.
Refresh tokens, rate limiting, structured logging, Sentry, and a full test
suite are explicitly OUT of scope for this session.

## Steps
- [x] 1. Add `alembic` to `backend/requirements.txt`
- [x] 2. Install alembic into `backend/venv`
- [x] 3. `alembic init` scaffolding under `backend/`
- [x] 4. Configure `alembic.ini` + `env.py` (URL from app settings, metadata from all models)
- [x] 5. Generate initial migration from all 9 models
- [x] 6. Update `app/main.py` — gate `create_all` behind a dev-only setting
- [x] 7. Update `app/database/session.py` — `pool_pre_ping=True`, pool sizing for Postgres
- [x] 8. Update `backend/Dockerfile` — install `curl` for healthcheck + copy alembic + CMD runs migrations
- [x] 9. Update `docker-compose.yml` — fix healthcheck URL to `/api/health`, add `AUTO_CREATE_TABLES: false`
- [x] 10. Verify migration applies cleanly on fresh DB (9 tables + alembic_version ✓)
- [x] 11. Update `render.yaml` — add `AUTO_CREATE_TABLES: false`
- [x] 12. Update CORS origins in `main.py` — add port 5175
- [x] 13. Verify backend imports cleanly with all changes

