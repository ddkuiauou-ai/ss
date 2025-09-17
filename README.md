# Monorepo: Backend (FastAPI) + Frontend (Next.js PWA)

Structure
- `backend/` — FastAPI app (Poetry)
- `frontend/` — Next.js 15 app (PWA)
- `docker-compose.yml` — dev orchestration
- `Makefile` — local dev helpers

Quickstart (local)
- Backend env: `cp backend/.env.example backend/.env` and edit
- Frontend env: `cp frontend/.env.local.example frontend/.env.local` and edit
- Install deps: `make install`
- Run both: `make dev`
  - Frontend: http://localhost:3000
  - Backend: http://localhost:8000

Docker (dev)
- `docker compose up --build` (runs both, with live reload)

Backend config
- DB URL (choose one):
  - `DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/DBNAME`
    - If password has special chars (`/ : @ # ? &`), URL-encode only the password.
  - Or parts (auto-assembled): `IS_POSTGRES_HOST, IS_POSTGRES_PORT, IS_POSTGRES_USER, IS_POSTGRES_PASSWORD, IS_POSTGRES_DB`
- Optional: `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`
- CORS: `CORS_ORIGINS` (comma-separated). Defaults include `http://localhost:3000`.
- Create DB views: `psql "$DATABASE_URL" -f backend/sql/views.sql`

Frontend config
- API proxy (dev) via Next rewrites: requests to `/api/*` are proxied to backend
  - Defaults to `http://127.0.0.1:8000`
  - Override with `API_PROXY_TARGET` or `NEXT_PUBLIC_API_BASE`
- PWA: manifest, SW, and registration already included
  - Manifest route: `frontend/app/manifest.ts` (served at `/manifest.webmanifest`)
  - Service worker: `frontend/public/sw.js` (registered only in production builds)
  - Icons: replace with real PNGs at 192x192 and 512x512 and reference them in manifest

Endpoints (backend)
- `GET /health` — DB ping
- `GET /deals` — deals from `api_deals_json`
- `GET /reports/daily` — aggregates from `api_reports_daily_json`
- `POST /users/{id}/profile` — upsert profile
- `GET|POST|DELETE /users/{id}/alerts` — rules CRUD
- `POST /push/subscribe` — save WebPush subscription

Notes
- Backend reads settings from `backend/.env`; environment variables take precedence.
- PWA install requires HTTPS in production (localhost is ok without HTTPS). For iOS, include proper Apple meta tags and test on Safari.

Debugging data flow
- Frontend in-app console: append `?debug=1` to the PWA URL or set `localStorage.setItem('ssf_debug','1')` in DevTools, then reload. A floating "Debug" console appears showing fetch requests/responses, timings, and previews. Hide with the "Hide" button; disable via `?debug=0` or removing the localStorage key.
- Headers: when enabled, the client adds `X-Debug: 1` and a session `X-Debug-Id` to all requests to help correlate.
- Backend logs: enable globally with `DEBUG_HTTP_LOGS=true` in `backend/.env` or per-request by sending `X-Debug: 1`. Logs include request/response previews, status, and duration. Each response includes `X-Request-ID`.
