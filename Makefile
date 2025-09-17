SHELL := /bin/bash

.PHONY: dev dev-backend dev-frontend install install-backend install-frontend stop

# Run backend (uvicorn) and frontend (next dev) together.
dev:
	@set -m; \
	trap 'echo "\nStopping..."; kill 0' INT TERM EXIT; \
	( cd backend && poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload ) & \
	( cd frontend && pnpm dev ) & \
	wait

dev-backend:
	cd backend && poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

dev-frontend:
	cd frontend && pnpm dev

install: install-backend install-frontend

install-backend:
	cd backend && poetry install

install-frontend:
	cd frontend && pnpm install

# Best-effort stop if something is left running (usually not needed).
stop:
	-lsof -ti:8000 | xargs kill -9 || true
	-lsof -ti:3000 | xargs kill -9 || true

