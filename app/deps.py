"""Shared FastAPI dependencies."""

from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import AuthToken, User
from .security import hash_token


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1].strip()
    row = db.scalar(select(AuthToken).where(AuthToken.token_hash == hash_token(token)))
    if row is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    expires_at = row.created_at + timedelta(seconds=settings.token_ttl_seconds)
    if expires_at <= datetime.now():
        # Revoke on first use so an expired token cannot keep hitting the DB.
        db.delete(row)
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.get(User, row.user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user
