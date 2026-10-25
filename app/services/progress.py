"""Gamification engine: hearts refill, XP awards, daily streaks, scoring, quests, leagues."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from ..config import settings
from ..models import (
    Attempt,
    LeagueSeason,
    SpeechAttempt,
    User,
    UserLeague,
    UserQuest,
)


def normalize_answer(value: str) -> str:
    """Case-insensitive, whitespace-collapsed, punctuation-tolerant compare key."""
    value = (value or "").strip().casefold()
    value = " ".join(value.split())
    return value.rstrip(".!?。！？")


def refill_hearts(user: User, at: datetime | None = None) -> None:
    """Lazily regenerate hearts based on elapsed time since the last refill tick."""
    cfg = settings
    current = at or datetime.now()
    if user.hearts_updated_at is None:
        user.hearts_updated_at = current
        return
    if user.hearts >= cfg.hearts_max:
        user.hearts = cfg.hearts_max
        user.hearts_updated_at = current
        return
    elapsed = (current - user.hearts_updated_at).total_seconds()
    if elapsed < cfg.heart_refill_seconds:
        return
    gained = int(elapsed // cfg.heart_refill_seconds)
    user.hearts = min(cfg.hearts_max, user.hearts + gained)
    user.hearts_updated_at = user.hearts_updated_at + timedelta(
        seconds=gained * cfg.heart_refill_seconds
    )
    if user.hearts >= cfg.hearts_max:
        user.hearts_updated_at = current


def seconds_until_next_heart(user: User) -> int:
    cfg = settings
    if user.hearts >= cfg.hearts_max:
        return 0
    assert user.hearts_updated_at is not None
    elapsed = (datetime.now() - user.hearts_updated_at).total_seconds()
    remaining = cfg.heart_refill_seconds - (elapsed % cfg.heart_refill_seconds)
    return max(1, int(remaining))


def update_streak(user: User, day: date | None = None) -> None:
    """Consecutive-day passing streak: yesterday -> +1, older/none -> 1."""
    today = day or date.today()
    if user.last_active_day == today:
        return
    if user.last_active_day is not None and user.last_active_day == today - timedelta(
        days=1
    ):
        user.streak += 1
    else:
        user.streak = 1
    user.last_active_day = today


def apply_streak_decay(user: User, day: date | None = None) -> bool:
    """Break the streak when the learner skipped a whole calendar day.

    Loss aversion: reading the profile shows the streak already at zero, so the
    cost of stopping is visible immediately. Returns True when it was reset.
    """
    today = day or date.today()
    if (
        user.streak > 0
        and user.last_active_day is not None
        and user.last_active_day < today - timedelta(days=1)
    ):
        user.streak = 0
        return True
    return False


def is_answer_correct(expected: str, given: str, accepted: list[str] | None = None) -> bool:
    normalized_given = normalize_answer(given)
    if not normalized_given:
        return False
    candidates = [expected, *(accepted or [])]
    return any(normalize_answer(c) == normalized_given for c in candidates)


def consume_heart(user: User) -> None:
    refill_hearts(user)
    if user.hearts > 0:
        user.hearts -= 1


def award_lesson_xp(correct: int, passed: bool, perfect: bool) -> int:
    cfg = settings
    xp = correct * cfg.xp_per_correct
    if perfect:
        xp += cfg.xp_perfect_bonus
    elif passed:
        xp += cfg.xp_perfect_bonus // 2
    return xp


# ------------------------------------------------------------- leagues

LEAGUE_TIERS: tuple[str, ...] = ("bronze", "silver", "gold", "diamond", "master")

# Starting tiers for learners who have never played a season: every 1000 XP
# is a level and the leagues unlock at levels 1, 5, 7, 10 and 12. Once a
# learner has a league row, promotion/demotion (not lifetime XP) moves them.
LEAGUE_MIN_XP: dict[str, int] = {
    "bronze": 0,
    "silver": 4000,
    "gold": 6000,
    "diamond": 9000,
    "master": 11000,
}

LEAGUE_PROMOTION_ZONE = 3
LEAGUE_DEMOTION_ZONE = 3
# A tier needs enough ranked learners for both zones plus a safe middle.
LEAGUE_MIN_RANKED_FOR_MOVES = 7


def league_tier_for_xp(xp: int) -> str:
    """Starting league tier for a learner's lifetime XP (bronze by default)."""
    tier = LEAGUE_TIERS[0]
    for candidate in LEAGUE_TIERS:
        if xp >= LEAGUE_MIN_XP[candidate]:
            tier = candidate
    return tier


def week_start(day: date | None = None) -> date:
    """Monday of the week containing `day` (server-local calendar)."""
    today = day or date.today()
    return today - timedelta(days=today.weekday())


def _weekly_xp(db, start: date, end: date) -> dict[int, int]:
    """XP earned per user in [start, end), across lessons and speaking."""
    totals: dict[int, int] = {}
    start_at = datetime.combine(start, time.min)
    end_at = datetime.combine(end, time.min)
    for model in (Attempt, SpeechAttempt):
        rows = db.execute(
            select(
                model.user_id,
                func.coalesce(func.sum(model.xp_awarded), 0),
            )
            .where(model.created_at >= start_at, model.created_at < end_at)
            .group_by(model.user_id)
        ).all()
        for user_id, xp in rows:
            totals[user_id] = totals.get(user_id, 0) + int(xp or 0)
    return totals


def ensure_league_rows(db) -> None:
    """Give every learner a league row, seeded from lifetime XP (no commit)."""
    missing = db.execute(
        select(User)
        .outerjoin(UserLeague, UserLeague.user_id == User.id)
        .where(UserLeague.id.is_(None))
    ).scalars().all()
    for user in missing:
        db.add(
            UserLeague(
                user_id=user.id,
                league_tier=league_tier_for_xp(user.xp),
                league_points=0,
            )
        )
    if missing:
        db.flush()


def roll_over_seasons(db, today: date | None = None) -> bool:
    """Apply last week's promotion/demotion once, then mark the week processed.

    Rollover is lazy: the first league read after Monday 00:00 performs it.
    Only learners who earned XP last week are ranked, so a quiet account is
    never demoted. A tier with fewer than LEAGUE_MIN_RANKED_FOR_MOVES ranked
    learners keeps its members put.
    """
    current = week_start(today)
    if db.get(LeagueSeason, current) is not None:
        return False

    # Claim the week before touching tiers. The marker's primary key is the
    # cross-process lock: if another worker or the cron job got here first,
    # the insert fails and we leave the caller's transaction untouched.
    try:
        with db.begin_nested():
            db.add(LeagueSeason(week_start=current, processed_at=datetime.now()))
            db.flush()
    except IntegrityError:
        return False

    previous = current - timedelta(days=7)
    ensure_league_rows(db)
    points = _weekly_xp(db, previous, current)
    users = {
        user.id: user for user in db.execute(select(User)).scalars().all()
    }
    by_tier: dict[str, list[UserLeague]] = {}
    for league in db.execute(select(UserLeague)).scalars().all():
        by_tier.setdefault(league.league_tier, []).append(league)

    for tier, members in by_tier.items():
        if tier not in LEAGUE_TIERS:
            continue
        ranked = [
            member
            for member in members
            if points.get(member.user_id, 0) > 0 and member.user_id in users
        ]
        if len(ranked) < LEAGUE_MIN_RANKED_FOR_MOVES:
            continue
        ranked.sort(
            key=lambda member: (
                -points[member.user_id],
                -users[member.user_id].xp,
                member.user_id,
            )
        )
        index = LEAGUE_TIERS.index(tier)
        promoted = (
            ranked[:LEAGUE_PROMOTION_ZONE]
            if index + 1 < len(LEAGUE_TIERS)
            else []
        )
        demoted = (
            ranked[-LEAGUE_DEMOTION_ZONE:] if index > 0 else []
        )
        now = datetime.now()
        for member in promoted:
            member.league_tier = LEAGUE_TIERS[index + 1]
            member.updated_at = now
        for member in demoted:
            member.league_tier = LEAGUE_TIERS[index - 1]
            member.updated_at = now

    db.flush()
    return True


def season_standings(
    db, tier: str, today: date | None = None
) -> tuple[list[dict], date]:
    """Ranked weekly standings for one tier plus the season's week start."""
    current = week_start(today)
    roll_over_seasons(db, today)
    ensure_league_rows(db)

    rows = db.execute(
        select(User, UserLeague)
        .join(UserLeague, UserLeague.user_id == User.id)
        .where(UserLeague.league_tier == tier)
    ).all()
    points = _weekly_xp(db, current, current + timedelta(days=7))
    ranked = sorted(
        rows,
        key=lambda pair: (
            -points.get(pair.User.id, 0),
            -pair.User.xp,
            pair.User.id,
        ),
    )

    active = [pair for pair in ranked if points.get(pair.User.id, 0) > 0]
    zone_by_user: dict[int, str] = {}
    if len(active) >= LEAGUE_MIN_RANKED_FOR_MOVES and tier in LEAGUE_TIERS:
        index = LEAGUE_TIERS.index(tier)
        if index + 1 < len(LEAGUE_TIERS):
            for user, _ in active[:LEAGUE_PROMOTION_ZONE]:
                zone_by_user[user.id] = "promotion"
        if index > 0:
            for user, _ in active[-LEAGUE_DEMOTION_ZONE:]:
                zone_by_user[user.id] = "demotion"

    entries = [
        {
            "user_id": user.id,
            "name": user.email.split("@")[0],
            "xp": points.get(user.id, 0),
            "streak": user.streak,
            "zone": zone_by_user.get(user.id, "safe"),
        }
        for user, _ in ranked
    ]
    return entries, current


def league_status(
    db, user: User, league: UserLeague, today: date | None = None
) -> tuple[int | None, str, int]:
    """(rank, zone, weekly XP still needed for the promotion zone)."""
    entries, _ = season_standings(db, league.league_tier, today)
    rank = next(
        (index + 1 for index, entry in enumerate(entries) if entry["user_id"] == user.id),
        None,
    )
    mine = next((entry for entry in entries if entry["user_id"] == user.id), None)
    if mine is None:
        return None, "safe", 0

    zone = mine["zone"]
    index = LEAGUE_TIERS.index(league.league_tier)
    active = [entry for entry in entries if entry["xp"] > 0]
    promote_in = 0
    if (
        zone != "promotion"
        and index + 1 < len(LEAGUE_TIERS)
        and len(active) >= LEAGUE_MIN_RANKED_FOR_MOVES
    ):
        cutoff = entries[LEAGUE_PROMOTION_ZONE - 1]["xp"]
        promote_in = max(0, cutoff + 1 - mine["xp"])
    return rank, zone, promote_in


def active_days(user: User, db, days: int = 7, today: date | None = None) -> list[str]:
    """ISO dates inside the trailing window on which the learner earned XP.

    Drives the 7-day activity strip. Dates are ascending and only include
    days with at least one scored attempt, so the window may be shorter.
    """
    end = today or date.today()
    start = end - timedelta(days=days - 1)
    since = datetime.combine(start, time.min)
    rows = [
        *db.execute(
            select(Attempt.created_at).where(
                Attempt.user_id == user.id, Attempt.created_at >= since
            )
        ).scalars(),
        *db.execute(
            select(SpeechAttempt.created_at).where(
                SpeechAttempt.user_id == user.id,
                SpeechAttempt.created_at >= since,
            )
        ).scalars(),
    ]
    active = {row.date() for row in rows if start <= row.date() <= end}
    return [day.isoformat() for day in sorted(active)]


def sync_league(user: User, db, today: date | None = None) -> UserLeague:
    """Ensure a league row exists, apply rollover, and refresh weekly points."""
    league = db.execute(
        select(UserLeague).where(UserLeague.user_id == user.id)
    ).scalars().first()
    if league is None:
        league = UserLeague(
            user_id=user.id,
            league_tier=league_tier_for_xp(user.xp),
            league_points=0,
        )
        db.add(league)
        db.flush()

    roll_over_seasons(db, today)

    current = week_start(today)
    points = _weekly_xp(db, current, current + timedelta(days=7))
    league.league_points = points.get(user.id, 0)
    league.updated_at = datetime.now()
    return league


def leaderboard(
    db, tier: str, limit: int = 10, today: date | None = None
) -> list[dict]:
    """Top learners in one league tier, ranked by XP earned this week."""
    entries, _ = season_standings(db, tier, today)
    return entries[:limit]


# --------------------------------------------------------------- quests


def xp_earned_today(user: User, db, day: date | None = None) -> int:
    today = day or date.today()
    start = datetime.combine(today, time.min)
    lesson_xp = db.execute(
        select(func.coalesce(func.sum(Attempt.xp_awarded), 0)).where(
            Attempt.user_id == user.id,
            Attempt.created_at >= start,
        )
    ).scalar()
    speech_xp = db.execute(
        select(func.coalesce(func.sum(SpeechAttempt.xp_awarded), 0)).where(
            SpeechAttempt.user_id == user.id,
            SpeechAttempt.created_at >= start,
        )
    ).scalar()
    return int((lesson_xp or 0) + (speech_xp or 0))


def sync_daily_quest(user: User, db, target: int = 20) -> dict:
    """Daily "earn XP" micro-quest, recomputed from today's scored attempts."""
    today = date.today()
    quest = db.execute(
        select(UserQuest).where(
            UserQuest.user_id == user.id,
            UserQuest.quest_type == "earn_xp",
            UserQuest.date == today,
        )
    ).scalars().first()
    if quest is None:
        quest = UserQuest(
            user_id=user.id,
            quest_type="earn_xp",
            target=target,
            current=0,
            date=today,
        )
        db.add(quest)
        db.flush()

    quest.current = min(xp_earned_today(user, db, today), quest.target)
    if quest.current >= quest.target and not quest.completed:
        quest.completed = 1
        quest.completed_at = datetime.now()

    percent = (quest.current / quest.target * 100) if quest.target else 0
    return {
        "id": quest.id,
        "quest_type": quest.quest_type,
        "target": quest.target,
        "current": quest.current,
        "progress_percent": min(percent, 100),
        "completed": bool(quest.completed),
    }
