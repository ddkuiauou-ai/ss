# Backend (FastAPI + Poetry)

## Setup
- cd backend
- poetry config virtualenvs.in-project true
- poetry install
- cp .env.example .env  # or point docker-compose to repo root .env

## Run (local)
- poetry run uvicorn app.main:app --reload

## Docker (dev)
- docker compose up --build backend
  - mounts ./backend/app for live reload
  - reads env from repo root .env (mounted at /app/.env)

## HTTP debug logging
- Global: set `DEBUG_HTTP_LOGS=true` in `.env`
- Per-request: send header `X-Debug: 1` (the PWA adds this automatically when its debug console is enabled)
- Correlation: logs include `req_id` and optional `dbg_id`, and responses include `X-Request-ID`
