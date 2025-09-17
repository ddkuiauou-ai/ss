from typing import Optional, Sequence, Any
import asyncio
import json
from app.db.session import db
from app.core.config import settings


async def list_deals(
    model: Optional[str] = None,
    carrier: Optional[str] = None,
    city: Optional[str] = None,
    move_type: Optional[str] = None,
    contract: Optional[str] = None,
    payment: Optional[str] = None,
    channel: Optional[str] = None,
    sort: str = "latest",
    limit: int = 20,
    offset: int = 0,
) -> Sequence[dict[str, Any]]:
    # Read JSONB rows from the view and return the JSON payload as-is
    base = """
    SELECT deal
      FROM api_deals_json
     WHERE 1=1
    """
    params: dict[str, Any] = {}
    if model:
        base += " AND (deal->>'model') = :model"
        params["model"] = model
    if carrier:
        base += " AND (deal->>'carrier') = :carrier"
        params["carrier"] = carrier
    if city:
        base += " AND (deal->>'city') = :city"
        params["city"] = city
    if move_type:
        base += " AND (deal->>'move_type') = :move_type"
        params["move_type"] = move_type
    if contract:
        base += " AND (deal->>'contract') = :contract"
        params["contract"] = contract
    if payment:
        base += " AND (deal->>'payment') = :payment"
        params["payment"] = payment
    if channel:
        base += " AND (deal->>'channel') = :channel"
        params["channel"] = channel

    if sort == "tco_asc":
        order = "(deal->>'tco_total')::numeric ASC NULLS LAST, (deal->>'parsed_at')::timestamptz DESC"
    else:  # default latest
        order = "(deal->>'parsed_at')::timestamptz DESC"

    base += f" ORDER BY {order} LIMIT :limit OFFSET :offset"
    params.update({"limit": limit, "offset": offset})

    rows = await asyncio.wait_for(db.fetch_all(base, params), timeout=settings.DB_QUERY_TIMEOUT)
    # rows are Records with a single key 'deal'. Decode strings if needed.
    deals: list[dict[str, Any]] = []
    for row in rows:
        value = row["deal"]
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError as e:
                # Surface decoding errors instead of silently falling back
                raise e
        deals.append(value)
    return deals
