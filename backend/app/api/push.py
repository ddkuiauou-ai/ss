from fastapi import APIRouter
from pydantic import BaseModel
from app.repos.push_repo import upsert_subscription


class PushSubscriptionIn(BaseModel):
    user_id: str
    endpoint: str
    p256dh: str
    auth: str


router = APIRouter()


@router.post("/push/subscribe")
async def subscribe_push(body: PushSubscriptionIn) -> dict:
    await upsert_subscription(body.user_id, body.endpoint, body.p256dh, body.auth)
    return {"ok": True}

