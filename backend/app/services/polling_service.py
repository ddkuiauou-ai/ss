import asyncio
import json
from app.core.config import settings
from app.db.session import db
from app.services.push_service import send_webpush

_RUN = True


async def start_polling_task():
    async def _loop():
        while _RUN:
            await dispatch_pending_alerts()
            await asyncio.sleep(settings.POLL_INTERVAL_SEC)

    return asyncio.create_task(_loop())


async def stop_polling_task(task):
    global _RUN
    _RUN = False
    task.cancel()


async def dispatch_pending_alerts():
    rows = await db.fetch_all(
        """
        SELECT ae.id, ae.user_id, ae.deal_id, s.endpoint, s.p256dh, s.auth
          FROM alert_events ae
          JOIN push_subscriptions s ON s.user_id = ae.user_id
         WHERE ae.sent_at IS NULL
         ORDER BY ae.id ASC
         LIMIT :N
        """,
        {"N": settings.POLL_BATCH_SIZE},
    )
    for r in rows:
        payload = json.dumps({"type": "deal_alert", "deal_id": r["deal_id"]})
        ok = await send_webpush(r["endpoint"], r["p256dh"], r["auth"], payload)
        if ok:
            await db.execute("UPDATE alert_events SET sent_at = NOW() WHERE id = :id", {"id": r["id"]})

