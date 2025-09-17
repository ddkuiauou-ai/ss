from pydantic import BaseModel


class ProfileIn(BaseModel):
    current_plan_fee: int | None = None
    addons_monthly: int | None = None
    mvno_flag: bool | None = None
    channel_pref: str | None = None  # online_only | offline_ok
    city: str | None = None


class ProfileOut(ProfileIn):
    user_id: str
    updated_at: str | None = None

