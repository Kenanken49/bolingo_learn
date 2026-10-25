"""Scheduled maintenance jobs.

Run the weekly league rollover from cron/systemd with:

    .venv/Scripts/python -m app.jobs

The in-process scheduler calls the same function, and the marker table makes
concurrent runs safe (the first writer wins; everyone else follows through).
"""

from __future__ import annotations

import logging
from datetime import date

from .db import SessionLocal, init_db
from .services.progress import roll_over_seasons, week_start

logger = logging.getLogger(__name__)


def rollover_league_seasons(today: date | None = None) -> bool:
    """Apply the weekly season rollover in its own session. Returns True if this
    call performed it, False when the week was already processed."""
    db = SessionLocal()
    try:
        applied = roll_over_seasons(db, today)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("League season rollover failed")
        raise
    finally:
        db.close()

    if applied:
        logger.info("League rollover applied for week of %s", week_start(today))
    return applied


def send_learner_reminders(today: date | None = None) -> int:
    """Push the daily character reminder to inactive learners. Returns pushes sent."""
    from .services.reminders import send_due_reminders

    db = SessionLocal()
    try:
        return send_due_reminders(db, today)
    except Exception:
        db.rollback()
        logger.exception("Learner reminder job failed")
        raise
    finally:
        db.close()


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    init_db()
    applied = rollover_league_seasons()
    print(
        "League season rolled over."
        if applied
        else "League season already current."
    )


if __name__ == "__main__":
    main()
