from typing import Optional
from app.db.session import db


async def upsert_subscription(user_id: str, endpoint: str, p256dh: str, auth: str) -> None:
    await db.execute(
        """
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
        VALUES (:user_id, :endpoint, :p256dh, :auth)
        ON CONFLICT (endpoint)
        DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
        """,
        {"user_id": user_id, "endpoint": endpoint, "p256dh": p256dh, "auth": auth},
    )

