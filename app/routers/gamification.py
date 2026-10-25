"""Gamification routes: the weekly league leaderboard."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import LeaderboardOut
from ..services.progress import season_standings, sync_league

router = APIRouter(prefix="/api", tags=["gamification"])


@router.get("/leaderboard", response_model=LeaderboardOut)
def get_leaderboard(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LeaderboardOut:
    """Top 10 learners in the caller's tier, ranked by XP earned this week."""
    league = sync_league(user, db)
    entries, week = season_standings(db, league.league_tier, today=None)
    me = next(entry for entry in entries if entry["user_id"] == user.id)
    db.commit()
    return LeaderboardOut(
        tier=league.league_tier,
        week_start=week.isoformat(),
        entries=entries[:10],
        me=me,
    )
