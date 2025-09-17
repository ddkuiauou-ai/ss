from fastapi import APIRouter
from app.db.session import db

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    try:
        # lightweight ping
        await db.execute("SELECT 1")
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}

