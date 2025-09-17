from databases import Database
from app.core.config import settings


# Configure connection pool; timeout is handled per-query
db = Database(
    settings.DATABASE_URL,
    min_size=settings.DB_POOL_MIN,
    max_size=settings.DB_POOL_MAX,
)
