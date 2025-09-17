from pydantic import BaseModel
from fastapi import Query


class Page(BaseModel):
    limit: int = 50
    offset: int = 0


def get_page(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> Page:
    return Page(limit=limit, offset=offset)
