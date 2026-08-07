FROM python:3.11-slim as builder

RUN pip install --no-cache-dir --upgrade pip

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim

# git is required at runtime by GitPython (GitHub cloning for Repository
# Analyzer, Code Review, Bug Debugger, API Documentation, and Repository Chat).
# curl is required by the Docker healthcheck.
RUN apt-get update && apt-get install -y --no-install-recommends git curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY app/ ./app/
COPY alembic.ini ./
COPY alembic/ ./alembic/

EXPOSE 8000

# Run Alembic migrations (no-op if already applied) then start the app.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
