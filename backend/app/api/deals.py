from typing import Optional, List, Any, Dict
from fastapi import APIRouter, Depends
from app.utils.pagination import get_page, Page
from app.repos.deal_repo import list_deals

router = APIRouter()


@router.get("/deals")
async def get_deals(
    model: Optional[str] = None,
    carrier: Optional[str] = None,
    city: Optional[str] = None,
    move_type: Optional[str] = None,
    contract: Optional[str] = None,
    payment: Optional[str] = None,
    channel: Optional[str] = None,
    sort: str = "latest",
    page: Page = Depends(get_page),
) -> List[Any]:
    rows = await list_deals(
        model=model,
        carrier=carrier,
        city=city,
        move_type=move_type,
        contract=contract,
        payment=payment,
        channel=channel,
        sort=sort,
        limit=page.limit,
        offset=page.offset,
    )
    # Back-compat transform: derive support_cash from legacy cash_delta and remove cash_delta
    out: List[Dict[str, Any]] = []
    for d in rows:
        d = dict(d)
        if "support_cash" not in d:
            cd = d.get("cash_delta")
            if isinstance(cd, (int, float)) and cd < 0:
                d["support_cash"] = int(abs(cd))
            else:
                d["support_cash"] = None
        # Remove legacy field
        if "cash_delta" in d:
            d.pop("cash_delta", None)
        out.append(d)
    return out
