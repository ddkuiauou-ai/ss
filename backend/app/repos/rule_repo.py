from typing import Sequence, Any
from app.db.session import db


async def list_rules(user_id: str) -> Sequence[dict[str, Any]]:
    rows = await db.fetch_all(
        """
        SELECT id, user_id, type, frequency, cooldown_hours, enabled,
               constraints, thresholds, filters, created_at, updated_at
          FROM rules
         WHERE user_id = :user_id
         ORDER BY id DESC
        """,
        {"user_id": user_id},
    )
    return [dict(r) for r in rows]


async def create_rule(user_id: str, payload: dict) -> int:
    row = await db.fetch_one(
        """
        INSERT INTO rules (user_id, type, frequency, cooldown_hours, enabled, constraints, thresholds, filters)
        VALUES (:user_id, :type, COALESCE(:frequency,'immediate'), COALESCE(:cooldown_hours,3), COALESCE(:enabled,true),
                COALESCE(:constraints,'{}'::jsonb), COALESCE(:thresholds,'{}'::jsonb),
                jsonb_build_object('models', :models, 'carriers', :carriers, 'channels', :channels, 'city', :city))
        RETURNING id
        """,
        {
            "user_id": user_id,
            "type": payload.get("type"),
            "frequency": payload.get("frequency"),
            "cooldown_hours": payload.get("cooldown_hours"),
            "enabled": payload.get("enabled", True),
            "constraints": payload.get("constraints"),
            "thresholds": payload.get("thresholds"),
            "models": payload.get("models"),
            "carriers": payload.get("carriers"),
            "channels": payload.get("channels"),
            "city": payload.get("city"),
        },
    )
    return int(row["id"])  # type: ignore


async def delete_rule(user_id: str, rule_id: int) -> int:
    return await db.execute(
        "DELETE FROM rules WHERE id = :id AND user_id = :user_id",
        {"id": rule_id, "user_id": user_id},
    )

