from typing import Optional, Sequence, Any
import asyncio
import json
from app.db.session import db
from app.core.config import settings


async def list_daily_reports(model: Optional[str] = None, limit: int = 200, offset: int = 0) -> Sequence[dict[str, Any]]:
    base = """
    SELECT report
      FROM api_reports_daily_json
     WHERE 1=1
    """
    params: dict[str, Any] = {}
    if model:
        base += " AND (report->>'model') = :model"
        params["model"] = model

    base += " ORDER BY (report->>'ts')::date DESC, (report->>'model') ASC, (report->>'capacity') NULLS LAST LIMIT :limit OFFSET :offset"
    params.update({"limit": limit, "offset": offset})

    rows = await asyncio.wait_for(db.fetch_all(base, params), timeout=settings.DB_QUERY_TIMEOUT)
    out: list[dict[str, Any]] = []
    for row in rows:
        value = row["report"]
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError as e:
                raise e
        out.append(value)
    return out


async def list_daily_reports_by_date(date: str, limit: int = 200, offset: int = 0) -> Sequence[dict[str, Any]]:
    query = (
        """
        SELECT report
          FROM api_reports_daily_json
         WHERE (report->>'ts') = :date
         ORDER BY (report->>'model') ASC, (report->>'capacity') NULLS LAST
         LIMIT :limit OFFSET :offset
        """
    )
    params = {"date": date, "limit": limit, "offset": offset}
    rows = await asyncio.wait_for(db.fetch_all(query, params), timeout=settings.DB_QUERY_TIMEOUT)
    out: list[dict[str, Any]] = []
    for row in rows:
        value = row["report"]
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError as e:
                raise e
        out.append(value)
    return out


async def list_daily_latest_reports(limit: int = 1000) -> Sequence[dict[str, Any]]:
    query = (
        """
        SELECT report
          FROM api_reports_daily_latest_json
         LIMIT :limit
        """
    )
    rows = await asyncio.wait_for(db.fetch_all(query, {"limit": limit}), timeout=settings.DB_QUERY_TIMEOUT)
    out: list[dict[str, Any]] = []
    for row in rows:
        value = row["report"]
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError as e:
                raise e
        out.append(value)
    return out
