from fastapi import APIRouter
from app.schemas.user import ProfileIn, ProfileOut
from app.repos.profile_repo import upsert_profile, get_profile

router = APIRouter()


@router.post("/users/{user_id}/profile")
async def save_profile(user_id: str, profile: ProfileIn) -> ProfileOut:
    await upsert_profile(user_id, profile.model_dump(exclude_unset=True))
    row = await get_profile(user_id)
    assert row is not None
    return ProfileOut(**row)

