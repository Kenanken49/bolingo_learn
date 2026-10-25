"""Gamification: streaks, daily quests, and weekly league seasons."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta

from starlette.testclient import TestClient

from app.db import SessionLocal
from app.jobs import rollover_league_seasons
from app.models import Attempt, LeagueSeason, Lesson, User, UserLeague
from app.services import progress as progress_module
from app.services.progress import (
    LEAGUE_DEMOTION_ZONE,
    LEAGUE_MIN_XP,
    LEAGUE_PROMOTION_ZONE,
    apply_streak_decay,
    league_tier_for_xp,
    roll_over_seasons,
    update_streak,
    week_start,
)
from tests.conftest import (
    PASSWORD,
    SAMPLE_TEXT,
    signup,
    upload_text,
    wait_for_material,
)


def _first_lesson(client: TestClient, headers: dict) -> int:
    material = upload_text(client, headers, SAMPLE_TEXT)
    client.post(f"/api/materials/{material['id']}/lessons", headers=headers)
    wait_for_material(client, headers, material["id"])
    response = client.post(f"/api/materials/{material['id']}/lessons", headers=headers)
    return response.json()["lesson_ids"][0]


def _correct_answers(lesson_id: int) -> list[str]:
    with SessionLocal() as db:
        lesson = db.get(Lesson, lesson_id)
        assert lesson is not None
        return [item["correct_answer"] for item in lesson.payload.get("items", [])]





# ------------------------------------------------------------ tier ladder


def test_tier_boundaries_match_the_starting_ladder() -> None:
    ordered = sorted(LEAGUE_MIN_XP.items(), key=lambda item: item[1])
    for tier, start in ordered:
        assert league_tier_for_xp(start) == tier
        if start > 0:
            assert league_tier_for_xp(start - 1) != tier


def test_week_start_is_monday() -> None:
    # 2026-10-24 is a Saturday.
    assert week_start(date(2026, 10, 24)) == date(2026, 10, 19)
    assert week_start(date(2026, 10, 19)) == date(2026, 10, 19)
    assert week_start(date(2026, 10, 26)) == date(2026, 10, 26)


# ---------------------------------------------------------------- streaks


def _streak_user(streak: int, last_active_day: date | None) -> User:
    return User(
        email=f"streak-{streak}@bolingo.app",
        password_hash="unused",
        streak=streak,
        last_active_day=last_active_day,
    )


def test_update_streak_counts_once_per_day_and_extends_yesterday() -> None:
    user = _streak_user(4, date(2026, 10, 23))

    update_streak(user, day=date(2026, 10, 24))
    assert user.streak == 5
    assert user.last_active_day == date(2026, 10, 24)

    update_streak(user, day=date(2026, 10, 24))
    assert user.streak == 5


def test_update_streak_restarts_after_a_gap() -> None:
    user = _streak_user(9, date(2026, 10, 20))
    update_streak(user, day=date(2026, 10, 24))
    assert user.streak == 1
    assert user.last_active_day == date(2026, 10, 24)


def test_streak_decay_only_after_a_fully_skipped_day() -> None:
    user = _streak_user(3, date(2026, 10, 22))

    assert apply_streak_decay(user, day=date(2026, 10, 23)) is False
    assert user.streak == 3

    assert apply_streak_decay(user, day=date(2026, 10, 24)) is True
    assert user.streak == 0

    assert apply_streak_decay(user, day=date(2026, 10, 25)) is False


def test_me_applies_streak_decay(client: TestClient) -> None:
    headers = signup(client, "decay@bolingo.app")
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == "decay@bolingo.app").one()
        user.streak = 6
        user.last_active_day = date.today() - timedelta(days=2)
        db.commit()

    me = client.get("/api/me", headers=headers).json()
    assert me["streak"] == 0


# ------------------------------------------------------------ daily quest


def test_me_exposes_daily_quest_and_league_bootstrap(client: TestClient) -> None:
    headers = signup(client, "quest@bolingo.app")

    me = client.get("/api/me", headers=headers).json()
    assert me["daily_quest"]["quest_type"] == "earn_xp"
    assert me["daily_quest"]["target"] == 20
    assert me["daily_quest"]["current"] == 0
    assert me["league_tier"] == "bronze"
    assert me["league_points"] == 0
    assert me["league_next_in"] == 0
    assert me["league_rank"] == 1
    assert me["league_zone"] == "safe"

    # Lifetime XP only seeds a learner's *first* tier.
    veteran = signup(client, "veteran@bolingo.app")
    with SessionLocal() as db:
        db.query(User).filter(User.email == "veteran@bolingo.app").one().xp = 4200
        db.commit()
    assert client.get("/api/me", headers=veteran).json()["league_tier"] == "silver"

    # Once a league row exists, XP alone no longer promotes anyone.
    with SessionLocal() as db:
        db.query(User).filter(User.email == "quest@bolingo.app").one().xp = 4200
        db.commit()
    assert client.get("/api/me", headers=headers).json()["league_tier"] == "bronze"


def test_weekly_league_points_track_this_weeks_xp(client: TestClient) -> None:
    headers = signup(client, "weekly@bolingo.app")
    lesson_id = _first_lesson(client, headers)
    attempt = client.post(
        f"/api/lessons/{lesson_id}/attempt",
        headers=headers,
        json={"answers": _correct_answers(lesson_id)},
    ).json()

    me = client.get("/api/me", headers=headers).json()
    assert attempt["xp_awarded"] > 0
    assert me["league_points"] == attempt["xp_awarded"]
    assert me["daily_quest"]["current"] == me["daily_quest"]["target"]
    assert me["daily_quest"]["completed"] is True


# ------------------------------------------------------------ leaderboard


def test_leaderboard_is_weekly_and_scoped_to_my_tier(client: TestClient) -> None:
    alpha = signup(client, "alpha@bolingo.app")
    signup(client, "beta@bolingo.app")
    with SessionLocal() as db:
        db.query(User).filter(User.email == "alpha@bolingo.app").one().xp = 4200
        db.query(User).filter(User.email == "beta@bolingo.app").one().xp = 100
        db.commit()

    response = client.get("/api/leaderboard", headers=alpha)
    assert response.status_code == 200
    board = response.json()
    assert board["tier"] == "silver"
    assert board["week_start"] == week_start().isoformat()
    assert [entry["name"] for entry in board["entries"]] == ["alpha"]
    assert board["me"]["user_id"] == board["entries"][0]["user_id"]
    assert board["me"]["xp"] == 0  # no XP earned this week yet
    assert board["me"]["zone"] == "safe"

    assert client.get("/api/leaderboard").status_code == 401


def test_leaderboard_tier_filter_survives_a_crowded_top_ten(client: TestClient) -> None:
    bronze = signup(client, "bronze@bolingo.app")
    for index in range(12):
        signup(client, f"gold{index}@bolingo.app")
    with SessionLocal() as db:
        db.query(User).filter(User.email == "bronze@bolingo.app").one().xp = 500
        for index in range(12):
            db.query(User).filter(User.email == f"gold{index}@bolingo.app").one().xp = (
                7000 + index
            )
        db.commit()

    board = client.get("/api/leaderboard", headers=bronze).json()
    assert board["tier"] == "bronze"
    assert [entry["name"] for entry in board["entries"]] == ["bronze"]


# --------------------------------------------------------------- seasons


def _seed_season(
    client: TestClient,
    headers: dict,
    tier: str,
    points: list[int],
) -> tuple[list[int], int]:
    """Create len(points) learners in `tier` who scored `points` last week."""
    lesson_id = _first_lesson(client, headers)
    user_ids: list[int] = []
    for index, _xp in enumerate(points):
        response = client.post(
            "/api/auth/signup",
            json={"email": f"{tier}{index}@bolingo.app", "password": PASSWORD},
        )
        assert response.status_code == 201, response.text
        user_ids.append(response.json()["user_id"])

    previous = week_start() - timedelta(days=7)
    played_at = datetime.combine(previous + timedelta(days=1), time(hour=12))
    with SessionLocal() as db:
        for user_id, xp in zip(user_ids, points):
            db.add(
                UserLeague(
                    user_id=user_id,
                    league_tier=tier,
                    league_points=0,
                )
            )
            if xp > 0:
                db.add(
                    Attempt(
                        user_id=user_id,
                        lesson_id=lesson_id,
                        correct=1,
                        total=1,
                        passed=1,
                        xp_awarded=xp,
                        created_at=played_at,
                    )
                )
        db.commit()
    return user_ids, lesson_id


def test_zones_and_promotion_hint_come_from_this_weeks_standings(
    client: TestClient,
) -> None:
    headers = signup(client, "zonehost@bolingo.app")
    lesson_id = _first_lesson(client, headers)
    players: list[tuple[dict, int]] = []
    for index, xp in enumerate((10, 20, 30, 40, 50, 60, 70)):
        player_headers = signup(client, f"zone{index}@bolingo.app")
        players.append((player_headers, xp))

    with SessionLocal() as db:
        for index, (_headers, xp) in enumerate(players):
            user = db.query(User).filter(User.email == f"zone{index}@bolingo.app").one()
            db.add(UserLeague(user_id=user.id, league_tier="gold", league_points=0))
            db.add(
                Attempt(
                    user_id=user.id,
                    lesson_id=lesson_id,
                    correct=1,
                    total=1,
                    passed=1,
                    xp_awarded=xp,
                    created_at=datetime.now(),
                )
            )
        db.commit()

    board = client.get("/api/leaderboard", headers=players[3][0]).json()
    assert board["tier"] == "gold"
    assert [entry["xp"] for entry in board["entries"]] == [70, 60, 50, 40, 30, 20, 10]
    assert [entry["zone"] for entry in board["entries"]] == [
        "promotion",
        "promotion",
        "promotion",
        "safe",
        "demotion",
        "demotion",
        "demotion",
    ]
    assert board["me"]["zone"] == "safe"

    # 4th place needs 11 XP to catch the 3rd-place cutoff (50 + 1 - 40).
    me = client.get("/api/me", headers=players[3][0]).json()
    assert me["league_rank"] == 4
    assert me["league_zone"] == "safe"
    assert me["league_next_in"] == 11


def test_rollover_promotes_top_three_and_demotes_bottom_three(
    client: TestClient,
) -> None:
    headers = signup(client, "host@bolingo.app")
    user_ids, _ = _seed_season(client, headers, "gold", [70, 60, 50, 40, 30, 20, 10])

    with SessionLocal() as db:
        assert roll_over_seasons(db) is True
        db.commit()

    with SessionLocal() as db:
        tiers = {
            league.user_id: league.league_tier
            for league in db.query(UserLeague).all()
        }
    assert [tiers[user_id] for user_id in user_ids] == [
        "diamond",
        "diamond",
        "diamond",
        "gold",
        "silver",
        "silver",
        "silver",
    ]

    # The week marker makes rollover idempotent.
    with SessionLocal() as db:
        assert roll_over_seasons(db) is False
        assert db.get(LeagueSeason, week_start()) is not None
        db.commit()
    with SessionLocal() as db:
        tiers = {
            league.user_id: league.league_tier
            for league in db.query(UserLeague).all()
        }
    assert [tiers[user_id] for user_id in user_ids] == [
        "diamond",
        "diamond",
        "diamond",
        "gold",
        "silver",
        "silver",
        "silver",
    ]


def test_rollover_skips_small_tiers_and_inactive_learners(client: TestClient) -> None:
    headers = signup(client, "host@bolingo.app")
    user_ids, _ = _seed_season(client, headers, "gold", [30, 20, 10, 0, 0, 0, 0])

    with SessionLocal() as db:
        assert roll_over_seasons(db) is True
        db.commit()

    # Only three learners earned XP: too few to move anyone, and the quiet
    # accounts are never demoted.
    with SessionLocal() as db:
        tiers = [
            db.query(UserLeague)
            .filter(UserLeague.user_id == user_id)
            .one()
            .league_tier
            for user_id in user_ids
        ]
    assert tiers == ["gold"] * 7


class _FrozenDate(date):
    """Freeze `progress.date.today()` so a test can walk across weeks."""

    current = date(2026, 10, 21)

    @classmethod
    def today(cls) -> date:
        return cls.current


def test_two_week_season_cycle_over_the_http_api(
    client: TestClient, monkeypatch
) -> None:
    host = signup(client, "cyclehost@bolingo.app")
    lesson_id = _first_lesson(client, host)
    players = [signup(client, f"cycle{index}@bolingo.app") for index in range(14)]

    week_one_start = week_start(date(2026, 10, 21))
    week_one_played = datetime.combine(
        week_one_start - timedelta(days=5), time(hour=12)
    )
    with SessionLocal() as db:
        for index in range(14):
            user = db.query(User).filter(User.email == f"cycle{index}@bolingo.app").one()
            db.add(UserLeague(user_id=user.id, league_tier="gold", league_points=0))
            db.add(
                Attempt(
                    user_id=user.id,
                    lesson_id=lesson_id,
                    correct=1,
                    total=1,
                    passed=1,
                    xp_awarded=(index + 1) * 10,
                    created_at=week_one_played,
                )
            )
        db.commit()

    monkeypatch.setattr(progress_module, "date", _FrozenDate)

    # Week 1 read: the top three promote, the bottom three demote.
    _FrozenDate.current = date(2026, 10, 21)
    board = client.get("/api/leaderboard", headers=players[0]).json()
    assert board["week_start"] == "2026-10-19"
    with SessionLocal() as db:
        tiers = {
            user.email: league.league_tier
            for user, league in db.query(User, UserLeague)
            .join(UserLeague, UserLeague.user_id == User.id)
            .all()
            if user.email.startswith("cycle")
        }
    assert [tiers[f"cycle{i}@bolingo.app"] for i in (13, 12, 11)] == [
        "diamond",
        "diamond",
        "diamond",
    ]
    assert [tiers[f"cycle{i}@bolingo.app"] for i in (0, 1, 2)] == [
        "silver",
        "silver",
        "silver",
    ]

    # Week 2: the eight learners still in gold are ranked again; three more go
    # up and three more go down. Diamond and silver now have only three ranked
    # learners each, so their members stay put.
    _FrozenDate.current = date(2026, 10, 28)
    week_two_start = week_start(_FrozenDate.current)
    week_two_played = datetime.combine(
        week_two_start - timedelta(days=5), time(hour=12)
    )
    with SessionLocal() as db:
        for offset, index in enumerate(range(3, 11), start=1):
            user = db.query(User).filter(User.email == f"cycle{index}@bolingo.app").one()
            db.add(
                Attempt(
                    user_id=user.id,
                    lesson_id=lesson_id,
                    correct=1,
                    total=1,
                    passed=1,
                    xp_awarded=offset * 10,
                    created_at=week_two_played,
                )
            )
        db.commit()

    board = client.get("/api/leaderboard", headers=players[6]).json()
    assert board["week_start"] == "2026-10-26"
    with SessionLocal() as db:
        tiers = {
            user.email: league.league_tier
            for user, league in db.query(User, UserLeague)
            .join(UserLeague, UserLeague.user_id == User.id)
            .all()
            if user.email.startswith("cycle")
        }
    assert [tiers[f"cycle{i}@bolingo.app"] for i in (10, 9, 8)] == [
        "diamond",
        "diamond",
        "diamond",
    ]
    assert [tiers[f"cycle{i}@bolingo.app"] for i in (3, 4, 5)] == [
        "silver",
        "silver",
        "silver",
    ]
    assert [tiers[f"cycle{i}@bolingo.app"] for i in (6, 7)] == ["gold", "gold"]


def test_scheduled_job_commits_a_rollover(client: TestClient) -> None:
    host = signup(client, "jobhost@bolingo.app")
    user_ids, _ = _seed_season(client, host, "gold", [70, 60, 50, 40, 30, 20, 10])

    assert rollover_league_seasons() is True

    with SessionLocal() as db:
        assert db.get(LeagueSeason, week_start()) is not None
        tiers = [
            db.query(UserLeague).filter(UserLeague.user_id == user_id).one().league_tier
            for user_id in user_ids
        ]
    assert tiers[:3] == ["diamond"] * 3
    assert tiers[-3:] == ["silver"] * 3

    # A second run (another worker or the next cron tick) is a no-op.
    assert rollover_league_seasons() is False


def test_rollover_respects_the_top_and_bottom_tier_caps(client: TestClient) -> None:
    headers = signup(client, "host@bolingo.app")
    master_ids, _ = _seed_season(client, headers, "master", [70, 60, 50, 40, 30, 20, 10])
    bronze_ids, _ = _seed_season(client, headers, "bronze", [70, 60, 50, 40, 30, 20, 10])

    with SessionLocal() as db:
        roll_over_seasons(db)
        db.commit()

    with SessionLocal() as db:
        master_tiers = [
            db.query(UserLeague).filter(UserLeague.user_id == uid).one().league_tier
            for uid in master_ids
        ]
        bronze_tiers = [
            db.query(UserLeague).filter(UserLeague.user_id == uid).one().league_tier
            for uid in bronze_ids
        ]

    assert master_tiers[:LEAGUE_PROMOTION_ZONE] == ["master"] * 3
    assert master_tiers[-LEAGUE_DEMOTION_ZONE:] == ["diamond"] * 3
    assert bronze_tiers[:LEAGUE_PROMOTION_ZONE] == ["silver"] * 3
    assert bronze_tiers[-LEAGUE_DEMOTION_ZONE:] == ["bronze"] * 3
