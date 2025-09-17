from typing import Optional

try:
    from pywebpush import webpush, WebPushException
except Exception:  # pragma: no cover - optional dependency in local dev
    webpush = None  # type: ignore
    WebPushException = Exception  # type: ignore

from app.core.config import settings


async def send_webpush(endpoint: str, p256dh: str, auth: str, payload: str) -> bool:
    if webpush is None:
        # Library not available in current environment
        return False
    try:
        webpush(
            subscription_info={"endpoint": endpoint, "keys": {"p256dh": p256dh, "auth": auth}},
            data=payload,
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_SUBJECT},
        )
        return True
    except WebPushException:
        return False

