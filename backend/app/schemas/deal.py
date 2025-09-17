from typing import Literal, Optional, List, Any
from pydantic import BaseModel


class Badge(BaseModel):
    label: str
    tone: Optional[Literal["neutral", "brand", "warn", "danger", "good"]] = None


class DealOut(BaseModel):
    id: str
    post_id: Optional[str] = None
    url: Optional[str] = None
    model: str
    # union schema: capacity may be null (no imputation)
    capacity: Optional[str] = None
    carrier: Literal["SKT", "KT", "LGU+", "MVNO", "미상"]
    move_type: Optional[Literal["번호이동", "기기변경", "자급"]] = None
    contract: Optional[Literal["공시지원", "선택약정", "무약정"]] = None
    contract_type: Optional[str] = None
    contract_months: Optional[int] = None
    contract_extra_support: Optional[bool] = None
    payment: Optional[Literal["현금완납", "할부"]] = None
    channel: Optional[Literal["online", "offline", "unknown"]] = None
    city: Optional[str] = None
    upfront: int
    plan_high_fee: Optional[int] = None
    plan_high_months: Optional[int] = None
    plan_after_fee: Optional[int] = None
    plan_after_months: Optional[int] = None
    mvno_tail_fee: Optional[int] = None
    mvno_tail_months: Optional[int] = None
    addons_monthly: Optional[int] = None
    addons_months: Optional[int] = None
    addons_detail: Optional[list] = None
    addons_count: Optional[int] = None
    device_finance_total: Optional[int] = None
    device_finance_months: Optional[int] = None
    device_finance_monthly: Optional[int] = None
    support_cash: Optional[int] = None
    store: Optional[str] = None
    baseline_unlocked: Optional[dict] = None
    advertorial_score: Optional[float] = None
    flags: Optional[List[str]] = None
    badges: Optional[List[Badge]] = None
    parsed_at: Optional[str] = None
    # Optional calculated hints
    tco_total: Optional[int] = None
    tco_monthly_24m: Optional[int] = None
    tco_net: Optional[int] = None
    tco_net_monthly_24m: Optional[int] = None

    retention_line_months: Optional[int] = None
    retention_plan_months: Optional[int] = None
    retention_addons_months: Optional[int] = None


class DealRow(BaseModel):
    # For raw passthrough when reading from JSONB views
    deal: Any
