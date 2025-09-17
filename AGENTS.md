# Repository Guidelines

## Project Structure & Module Organization
- `backend/` — FastAPI service (Python 3.12, Poetry). App code in `backend/app`, SQL in `backend/sql`.
- `frontend/` — Next.js 15 (TypeScript, PWA). App router under `frontend/app`, shared code in `frontend/lib`, static assets in `frontend/public`.
- Top-level tooling: `Makefile` (dev helpers), `docker-compose.yml` (dev orchestration).

## Build, Test, and Development Commands
- Install deps: `make install` (runs Poetry + pnpm).
- Run both apps (dev): `make dev` → frontend `:3000`, backend `:8000`.
- Run individually: `make dev-backend` or `make dev-frontend`.
- Docker (dev): `docker compose up --build`.
- Lint (frontend): `cd frontend && pnpm lint`.
- Backend server (direct): `cd backend && poetry run uvicorn app.main:app --reload`.

## Coding Style & Naming Conventions
- Python: 4‑space indent, PEP8, type hints required for public functions. Modules `snake_case`, classes `PascalCase`, functions/vars `snake_case`.
- TypeScript/React: follow ESLint (Next + TS) rules. Components `PascalCase.tsx`; hooks `useX.ts`; utilities `camelCase.ts` under `frontend/lib`.
- Imports: prefer absolute TS paths via `@/*` (see `tsconfig.json`).
- Env files: `backend/.env` and `frontend/.env.local` (never commit secrets).

## Testing Guidelines
- Currently no formal test suite. Prefer:
  - Backend: `pytest` with async tests; place under `backend/tests/` mirroring `app/` (e.g., `tests/api/test_deals.py`).
  - Frontend: unit tests with React Testing Library; e2e via Playwright under `frontend/tests/`.
- Aim for critical-path coverage (API handlers, data parsing, hooks). Add `make test` when suites are introduced.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`. Scope optional (e.g., `feat(frontend): add debug console`).
- Keep commits small and focused. Include rationale in body when non-obvious.
- PRs: clear description, linked issues, steps to validate, and screenshots for UI changes. Ensure `pnpm lint` passes and app boots with `make dev`.

## Security & Configuration Tips
- Backend CORS: restrict `CORS_ORIGINS` in `backend/.env` for production.
- Database credentials: prefer URL-encoded password in `DATABASE_URL`.
- PWA requires HTTPS in prod; use reverse proxy for `/api` to avoid CORS. Set `API_PROXY_TARGET` and `NEXT_PUBLIC_API_BASE=/api`.

