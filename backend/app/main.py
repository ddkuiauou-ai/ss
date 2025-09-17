import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import db
from app.services.polling_service import start_polling_task, stop_polling_task

from app.api import deals, reports, users, alerts, push, health
from app.middleware.debug import DebugLoggingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    poll_task = asyncio.create_task(start_polling_task())
    try:
        yield
    finally:
        await stop_polling_task(poll_task)
        await db.disconnect()


app = FastAPI(lifespan=lifespan, title="Service API", version="v1")

# CORS configuration from settings (defaults allow localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(deals.router, tags=["deals"])
app.include_router(reports.router, tags=["reports"])
app.include_router(users.router, tags=["users"])
app.include_router(alerts.router, tags=["alerts"])
app.include_router(push.router, tags=["push"])
app.include_router(health.router, tags=["health"])

# HTTP debug logging middleware (controlled via env/header)
app.add_middleware(
    DebugLoggingMiddleware,
    debug=settings.DEBUG_HTTP_LOGS,
    style=settings.DEBUG_HTTP_STYLE,
    include_headers=settings.DEBUG_HTTP_HEADERS,
    max_body_preview=settings.DEBUG_HTTP_MAX_PREVIEW,
)
