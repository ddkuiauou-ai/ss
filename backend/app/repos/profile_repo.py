from typing import Optional
from app.db.session import db


async def upsert_profile(user_id: str, payload: dict) -> None:
    # Simple upsert into profiles keyed by user_id
    await db.execute(
        """
        INSERT INTO profiles (user_id, current_plan_fee, addons_monthly, mvno_flag, channel_pref, city)
        VALUES (:user_id, :current_plan_fee, :addons_monthly, COALESCE(:mvno_flag, false), :channel_pref, :city)
        ON CONFLICT (user_id)
        DO UPDATE SET
            current_plan_fee = EXCLUDED.current_plan_fee,
            addons_monthly = EXCLUDED.addons_monthly,
            mvno_flag = EXCLUDED.mvno_flag,
            channel_pref = EXCLUDED.channel_pref,
            city = EXCLUDED.city,
            updated_at = NOW()
        """,
        {
            "user_id": user_id,
            "current_plan_fee": payload.get("current_plan_fee"),
            "addons_monthly": payload.get("addons_monthly"),
            "mvno_flag": payload.get("mvno_flag"),
            "channel_pref": payload.get("channel_pref"),
            "city": payload.get("city"),
        },
    )


async def get_profile(user_id: str) -> Optional[dict]:
    row = await db.fetch_one(
        "SELECT user_id, current_plan_fee, addons_monthly, mvno_flag, channel_pref, city, updated_at FROM profiles WHERE user_id = :user_id",
        {"user_id": user_id},
    )
    return dict(row) if row else None

