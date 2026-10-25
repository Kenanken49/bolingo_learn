"""Mascot characters and Web Push reminders for inactive learners.

Bongo is the white owl and the main mascot. The others play roles in the
path: Pendo sends the guilt-trip reminders, Lingo guides the first level,
Bingo and Dingo guide the middle levels, and Mambo celebrates.

A learner gets at most one reminder per day per subscribed device. Subscriptions
the push service reports as gone (404/410) are deleted.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import date, datetime

from pywebpush import WebPushException, webpush
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..models import PushSubscription, User

logger = logging.getLogger(__name__)

INACTIVE_AFTER_DAYS = 2


@dataclass(frozen=True)
class Character:
    name: str
    role: str
    tone: str


CHARACTERS: dict[str, Character] = {
    "bongo": Character("Bongo", "Main owl mascot, the calm voice of the app", "gentle"),
    "pendo": Character("Pendo", "Guilt-trip reminders", "guilt"),
    "lingo": Character("Lingo", "Guides the first level", "encouraging"),
    "bingo": Character("Bingo", "Guides the middle levels", "playful"),
    "dingo": Character("Dingo", "Guides the advanced levels", "dramatic"),
    "mambo": Character("Mambo", "Celebrates your wins", "celebratory"),
}

# Reminder lines per tone. Pendo is the only one who guilt-trips.
REMINDERS: dict[str, list[tuple[str, str]]] = {
    "guilt": [
        ("pendo", "Pendo here. Your streak is sitting alone in the dark. Just saying."),
        ("pendo", "I saved you a seat in today's lesson. It is getting cold."),
        ("pendo", "A whole week. Even Bongo has stopped counting. Open the app."),
    ],
    "gentle": [
        ("bongo", "Bongo says: a few minutes today keeps the streak alive."),
    ],
    "dramatic": [
        ("dingo", "The advanced levels miss you. Dramatically. Come back."),
    ],
    "playful": [
        ("bingo", "Bingo found a puzzle with your name on it. Come solve it!"),
    ],
}


def pick_reminder(days_inactive: int) -> tuple[Character, str]:
    """Choose a character and line. Longer absences get a stronger tone."""
    if days_inactive >= 7:
        tone = "guilt"
    elif days_inactive >= 4:
        tone = "dramatic"
    else:
        tone = "gentle" if days_inactive % 2 else "playful"
    options = REMINDERS[tone]
    key, line = options[days_inactive % len(options)]
    return CHARACTERS[key], line


def is_inactive(user: User, today: date) -> bool:
    if user.last_active_day is None:
        return True
    return (today - user.last_active_day).days >= INACTIVE_AFTER_DAYS


def send_due_reminders(db: Session, today: date | None = None) -> int:
    """Push one reminder to every inactive learner who has not had one today.

    Returns the number of pushes accepted by the push service.
    """
    if not settings.vapid_private_key:
        return 0
    today = today or datetime.now().date()
    subs = db.scalars(select(PushSubscription)).all()
    sent = 0
    for sub in subs:
        user = db.get(User, sub.user_id)
        if user is None or not is_inactive(user, today):
            continue
        if sub.last_reminded_on == today:
            continue
        days = (today - user.last_active_day).days if user.last_active_day else 0
        character, line = pick_reminder(days)
        payload = json.dumps(
            {"title": character.name, "body": line, "icon": f"/mascots/{character.name.lower()}.svg"}
        )
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={"sub": settings.vapid_subject},
            )
        except WebPushException as exc:
            status = getattr(exc.response, "status_code", None)
            if status in (404, 410):
                db.delete(sub)
            else:
                logger.warning("Push to subscription %s failed: %s", sub.id, exc)
            continue
        sub.last_reminded_on = today
        sent += 1
    db.commit()
    return sent


__all__ = [
    "CHARACTERS",
    "INACTIVE_AFTER_DAYS",
    "pick_reminder",
    "is_inactive",
    "send_due_reminders",
]
