"""Auth: signup, login, and the current-user profile."""

from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import get_current_user
from ..models import Attempt, AuthToken, User
from ..schemas import LoginIn, SignUpIn, TokenOut, UserOut
from ..security import hash_password, hash_token, new_token, verify_password
from ..services.progress import (
    active_days,
    apply_streak_decay,
    league_status,
    refill_hearts,
    seconds_until_next_heart,
    sync_daily_quest,
    sync_league,
)

router = APIRouter(prefix="/api", tags=["auth"])


def _issue_token(db: Session, user: User) -> TokenOut:
    token = new_token()
    db.add(AuthToken(user_id=user.id, token_hash=hash_token(token)))
    db.commit()
    return TokenOut(access_token=token, user_id=user.id)


@router.post("/auth/signup", response_model=TokenOut, status_code=201)
def signup(body: SignUpIn, db: Session = Depends(get_db)) -> TokenOut:
    existing = db.execute(select(User).where(User.email == body.email)).scalars().first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(email=body.email, password_hash=hash_password(body.password))
    db.add(user)
    db.flush()
    return _issue_token(db, user)


@router.post("/auth/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)) -> TokenOut:
    user = db.execute(select(User).where(User.email == body.email)).scalars().first()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return _issue_token(db, user)


class SupabaseLoginIn(BaseModel):
    access_token: str


def _verify_supabase_token(access_token: str) -> str | None:
    """Return the verified email behind a Supabase access token, or None."""
    if not settings.supabase_url or not settings.supabase_key:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")
    try:
        response = httpx.get(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "apikey": settings.supabase_key,
            },
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Could not reach Supabase") from exc
    if response.status_code != 200:
        return None
    email = response.json().get("email")
    return email.lower() if isinstance(email, str) and email else None


@router.post("/auth/supabase", response_model=TokenOut)
def supabase_login(body: SupabaseLoginIn, db: Session = Depends(get_db)) -> TokenOut:
    """Sign in with a Supabase (Google) session.

    If a password account already uses this email, it is linked: the learner
    signs into that same account instead of getting a duplicate.
    """
    email = _verify_supabase_token(body.access_token)
    if email is None:
        raise HTTPException(status_code=401, detail="Google sign-in could not be verified")
    user = db.execute(select(User).where(User.email == email)).scalars().first()
    if user is None:
        # Social-only account: a random hash nobody knows, so password login stays closed.
        user = User(email=email, password_hash=hash_password(new_token()))
        db.add(user)
        db.flush()
    return _issue_token(db, user)


@router.post("/auth/logout", status_code=204)
def logout(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> None:
    """Revoke every bearer token for the caller (log out on all devices)."""
    db.execute(delete(AuthToken).where(AuthToken.user_id == user.id))
    db.commit()


@router.get("/me", response_model=UserOut)
def me(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    refill_hearts(user)
    # Loss aversion: a skipped calendar day breaks the streak the moment the
    # learner next looks at their profile, before they earn it back.
    apply_streak_decay(user)

    completed = (
        db.execute(
            select(func.count(func.distinct(Attempt.lesson_id))).where(
                Attempt.user_id == user.id,
                Attempt.passed == 1,
            )
        ).scalar()
        or 0
    )

    daily_quest = sync_daily_quest(user, db)
    league = sync_league(user, db)
    league_rank, league_zone, league_next_in = league_status(db, user, league)
    db.commit()

    return UserOut(
        id=user.id,
        email=user.email,
        xp=user.xp,
        streak=user.streak,
        hearts=user.hearts,
        hearts_refill_seconds=seconds_until_next_heart(user),
        gems=user.gems,
        lessons_completed=completed,
        daily_quest=daily_quest,
        activity_days=active_days(user, db),
        league_tier=league.league_tier,
        league_points=league.league_points,
        league_next_in=league_next_in,
        league_rank=league_rank,
        league_zone=league_zone,
        created_at=user.created_at.isoformat(),
    )
