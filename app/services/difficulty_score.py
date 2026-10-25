"""Course difficulty scores for generated lessons.

The built-in catalog scores lessons 1-5 and rises across a track. Generated
courses use the same scale: the score climbs from 1 at the first lesson to 5
at the last, so a course's Birdbrain level follows its real progression.
"""

from __future__ import annotations

MIN_SCORE = 1
MAX_SCORE = 5


def course_score(index: int, total: int) -> int:
    """Score for the lesson at 0-based `index` out of `total` lessons."""
    if total <= 1:
        return MIN_SCORE
    fraction = index / (total - 1)
    return MIN_SCORE + round(fraction * (MAX_SCORE - MIN_SCORE))
