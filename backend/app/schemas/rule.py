from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel


class RuleBase(BaseModel):
    type: Literal["STRICT_MATCH", "CHEAPEST", "BIG_DROP", "BEST_DISCOUNT"]
    models: Optional[List[str]] = None
    carriers: Optional[List[str]] = None
    channels: Optional[List[Literal["online", "offline"]]] = None
    city: Optional[str] = None
    frequency: Literal["immediate", "daily"] = "immediate"
    cooldown_hours: Optional[int] = 3
    enabled: bool = True


class RuleStrict(RuleBase):
    type: Literal["STRICT_MATCH"] = "STRICT_MATCH"
    constraints: Optional[Dict[str, Any]] = None
    thresholds: Optional[Dict[str, Any]] = None


class RuleCheapest(RuleBase):
    type: Literal["CHEAPEST"] = "CHEAPEST"
    scope: Optional[Literal["per_model", "global"]] = None


class RuleBigDrop(RuleBase):
    type: Literal["BIG_DROP"] = "BIG_DROP"
    drop_pct_min: int = 10


class RuleBestDiscount(RuleBase):
    type: Literal["BEST_DISCOUNT"] = "BEST_DISCOUNT"
    discount_pct_min: int = 20


class RuleOut(BaseModel):
    id: int
    user_id: str
    type: str
    frequency: str
    cooldown_hours: int
    enabled: bool
    constraints: Dict[str, Any]
    thresholds: Dict[str, Any]
    filters: Dict[str, Any]
    created_at: str
    updated_at: str

