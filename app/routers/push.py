"""Web Push: VAPID public key and per-device reminder subscriptions."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import get_current_user
from ..models import PushSubscription, User

router = APIRouter(prefix="/api/push", tags=["push"])


class PushKeysIn(BaseModel):
    p256dh: str
    auth: str


class PushSubscribeIn(BaseModel):
    endpoint: str
    keys: PushKeysIn


class PushUnsubscribeIn(BaseModel):
    endpoint: str


@router.get("/vapid-public-key")
def vapid_public_key() -> dict:
    if not settings.vapid_public_key:
        raise HTTPException(status_code=503, detail="Push reminders are not configured")
    return {"public_key": settings.vapid_public_key}


@router.post("/subscribe")
def subscribe(
    body: PushSubscribeIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    row = db.scalar(select(PushSubscription).where(PushSubscription.endpoint == body.endpoint))
    if row is None:
        row = PushSubscription(endpoint=body.endpoint, created_at=datetime.now())
        db.add(row)
    row.user_id = user.id
    row.p256dh = body.keys.p256dh
    row.auth = body.keys.auth
    db.commit()
    return {"subscribed": True}


@router.post("/unsubscribe")
def unsubscribe(
    body: PushUnsubscribeIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    db.execute(
        delete(PushSubscription).where(
            PushSubscription.endpoint == body.endpoint,
            PushSubscription.user_id == user.id,
        )
    )
    db.commit()
    return {"subscribed": False}
