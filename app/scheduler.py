"""In-process background scheduler for the weekly league rollover.

Every worker runs a loop, but `roll_over_seasons` claims the week atomically,
so only one actually applies the season. Disable with
`BOLINGO_SCHEDULER_ENABLED=0` when an external cron runs `python -m app.jobs`.
"""

from __future__ import annotations

import asyncio
import logging

from .config import settings
from .jobs import rollover_league_seasons, send_learner_reminders

logger = logging.getLogger(__name__)

SchedulerHandle = tuple[asyncio.Event, asyncio.Task]


async def _rollover_loop(stop: asyncio.Event) -> None:
    while not stop.is_set():
        try:
            await asyncio.to_thread(rollover_league_seasons)
        except Exception:
            # The job logs the traceback; keep the loop alive for the next tick.
            logger.error("League rollover tick failed; will retry")
        try:
            await asyncio.to_thread(send_learner_reminders)
        except Exception:
            logger.error("Learner reminder tick failed; will retry")
        try:
            await asyncio.wait_for(
                stop.wait(), timeout=settings.league_rollover_check_seconds
            )
        except asyncio.TimeoutError:
            continue


def start_scheduler() -> SchedulerHandle | None:
    if not settings.scheduler_enabled:
        return None
    stop = asyncio.Event()
    task = asyncio.create_task(_rollover_loop(stop), name="league-rollover")
    logger.info(
        "League rollover scheduler started (check every %ss)",
        settings.league_rollover_check_seconds,
    )
    return stop, task


async def stop_scheduler(handle: SchedulerHandle) -> None:
    stop, task = handle
    stop.set()
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
