from typing import Optional, List, Any
from fastapi import APIRouter, Depends
from app.utils.pagination import get_page, Page
from app.repos.report_repo import (
    list_daily_reports,
    list_daily_latest_reports,
    list_daily_reports_by_date,
)

router = APIRouter()


@router.get("/reports/daily")
async def get_reports_daily(
    date: str,
    page: Page = Depends(get_page),
) -> List[Any]:
    # History by date
    return await list_daily_reports_by_date(date=date, limit=page.limit, offset=page.offset)


@router.get("/reports/daily/latest")
async def get_reports_daily_latest() -> List[Any]:
    # Latest snapshot for all models
    return await list_daily_latest_reports()
