import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from urllib.parse import quote_plus


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    DATABASE_URL: Optional[str] = None
    # WebPush (optional initially)
    VAPID_PRIVATE_KEY: str | None = None
    VAPID_PUBLIC_KEY: str | None = None
    VAPID_SUBJECT: str = "mailto:ops@example.com"

    # Polling/dispatch (A-plan)
    POLL_INTERVAL_SEC: int = 30
    POLL_BATCH_SIZE: int = 200
    MAX_RETRY_PUSH: int = 3

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Debug: enable HTTP request/response logging globally
    DEBUG_HTTP_LOGS: bool = False
    # Debug log formatting: 'json' (default) or 'pretty'
    DEBUG_HTTP_STYLE: str = "json"
    # Include selected headers in logs
    DEBUG_HTTP_HEADERS: bool = True
    # Max bytes to preview from bodies
    DEBUG_HTTP_MAX_PREVIEW: int = 1024

    # Optional individual Postgres parts (for ops environments)
    IS_POSTGRES_HOST: Optional[str] = None
    IS_POSTGRES_PORT: Optional[int] = 5432
    IS_POSTGRES_USER: Optional[str] = None
    IS_POSTGRES_PASSWORD: Optional[str] = None
    IS_POSTGRES_DB: Optional[str] = None

    # Database pool & timeout
    DB_POOL_MIN: int = 1
    DB_POOL_MAX: int = 10
    # Per-query timeout (seconds) to prevent hanging requests
    DB_QUERY_TIMEOUT: float = 5.0


settings = Settings()  # loads from .env and environment

# Backfill DATABASE_URL if not provided, by assembling from parts.
if not settings.DATABASE_URL:
    # First, try custom IS_POSTGRES_* variables
    if (
        settings.IS_POSTGRES_HOST
        and settings.IS_POSTGRES_DB
        and settings.IS_POSTGRES_USER
        and settings.IS_POSTGRES_PASSWORD is not None
    ):
        host = settings.IS_POSTGRES_HOST
        port = settings.IS_POSTGRES_PORT or 5432
        user = settings.IS_POSTGRES_USER
        pwd = settings.IS_POSTGRES_PASSWORD or ""
        db = settings.IS_POSTGRES_DB
        enc_user = quote_plus(user, safe="")
        enc_pwd = quote_plus(pwd, safe="")
        settings.DATABASE_URL = f"postgresql+asyncpg://{enc_user}:{enc_pwd}@{host}:{port}/{db}"
    else:
        # Fallback to standard PG* environment variables
        host = os.getenv("PGHOST")
        port = os.getenv("PGPORT") or "5432"
        user = os.getenv("PGUSER")
        pwd = os.getenv("PGPASSWORD") or ""
        db = os.getenv("PGDATABASE")
        if host and user and db and pwd is not None:
            enc_user = quote_plus(user, safe="")
            enc_pwd = quote_plus(pwd, safe="")
            settings.DATABASE_URL = f"postgresql+asyncpg://{enc_user}:{enc_pwd}@{host}:{port}/{db}"

# Normalize CORS_ORIGINS if provided as comma-separated string
if isinstance(settings.CORS_ORIGINS, str):
    settings.CORS_ORIGINS = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
