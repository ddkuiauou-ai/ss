from typing import List
from fastapi import APIRouter
from app.schemas.rule import RuleOut
from app.repos.rule_repo import list_rules, create_rule, delete_rule

router = APIRouter()


@router.get("/users/{user_id}/alerts")
async def get_rules(user_id: str) -> List[RuleOut]:
    rows = await list_rules(user_id)
    return [RuleOut(**r) for r in rows]


@router.post("/users/{user_id}/alerts")
async def post_rule(user_id: str, payload: dict) -> dict:
    rid = await create_rule(user_id, payload)
    return {"id": rid}


@router.delete("/users/{user_id}/alerts/{rule_id}")
async def delete_rule_route(user_id: str, rule_id: int) -> dict:
    await delete_rule(user_id, rule_id)
    return {"ok": True}

