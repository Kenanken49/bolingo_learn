"""Deterministic offline lesson generator (no API keys required).

Builds multiple-choice and fill-in-blank exercises straight from the source
text: blank a content word in a sentence, use other vocabulary from the same
chunk as distractors. Seeded RNG keeps output stable for the same input, and
every payload passes the same strict Pydantic contract as LLM output.
"""

from __future__ import annotations

import random
import re

from pydantic import ValidationError

from ..config import settings
from ..ingest.chunk import split_sentences
from ..schemas import LessonPayload
from . import GenerationError

_WORD_RE = re.compile(r"[^\W\d_][\w'’\-]*", re.UNICODE)

STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "if", "then", "so", "of", "to", "in",
    "on", "at", "for", "with", "as", "by", "from", "is", "are", "was", "were",
    "be", "been", "being", "it", "its", "this", "that", "these", "those", "you",
    "your", "we", "our", "they", "their", "he", "she", "his", "her", "them",
    "not", "no", "can", "will", "would", "could", "should", "may", "might",
    "do", "does", "did", "have", "has", "had", "than", "there", "here", "what",
    "which", "who", "when", "where", "why", "how", "all", "any", "some", "more",
    "most", "other", "into", "over", "under", "about", "also", "very", "just",
    "like", "one", "two", "three", "up", "down", "out", "off", "again", "then",
    "only", "own", "same", "too", "because", "while", "during", "after",
    "before", "between", "through", "such", "each", "both", "few", "own",
}


def _words(text: str) -> list[str]:
    return _WORD_RE.findall(text)


def _content_words(text: str) -> list[str]:
    return [w for w in _words(text) if w.lower() not in STOPWORDS and len(w) >= 3]


def _title_from(sentences: list[str]) -> str:
    first = sentences[0]
    words = first.split()
    title = " ".join(words[:7])
    if len(words) > 7:
        title += "…"
    title = title.rstrip(",;:.")
    return (title or "Untitled lesson").strip()[:80]


class OfflineGenerator:
    name = "offline"

    def generate(
        self,
        *,
        chunk: str,
        index: int,
        total: int,
        language: str | None,
        title_hint: str,
    ) -> LessonPayload:
        sentences = split_sentences(chunk)
        if not sentences:
            raise GenerationError("Chunk has no sentences to build exercises from")

        rng = random.Random(f"{index}|{total}|{language or ''}|{chunk[:80]}")
        vocabulary = list(dict.fromkeys(_content_words(chunk)))
        if len(vocabulary) < 2:
            raise GenerationError(
                "Not enough recognizable vocabulary in this excerpt to build "
                "exercises (offline generator). Add OPENAI_API_KEY for the LLM path."
            )

        max_items = settings.max_items_per_lesson
        items: list[dict] = []
        used_targets: set[str] = set()

        for position, sentence in enumerate(sentences):
            if len(items) >= max_items:
                break
            target = self._pick_target(sentence, used_targets, vocabulary)
            if target is None:
                continue
            blanked = re.sub(
                rf"\b{re.escape(target)}\b", "____", sentence, flags=re.IGNORECASE
            )
            if blanked == sentence:
                continue

            distractors = self._pick_distractors(target, vocabulary, used_targets)
            surface = re.search(
                rf"\b{re.escape(target)}\b", sentence, flags=re.IGNORECASE
            )
            surface_form = surface.group(0) if surface else target

            # Alternate exercise styles; fall back to fill-in-blank when the
            # chunk lacks enough distinct vocabulary for plausible distractors.
            want_mcq = position % 2 == 0 and len(distractors) >= 3
            if want_mcq:
                options = [surface_form] + distractors[:3]
                rng.shuffle(options)
                items.append(
                    {
                        "question_type": "multiple_choice",
                        "prompt": blanked,
                        "options": options,
                        "correct_answer": surface_form,
                        "explanation": f"“{surface_form}” fits the sentence.",
                    }
                )
            else:
                entry: dict = {
                    "question_type": "fill_in_blank",
                    "prompt": blanked,
                    "correct_answer": surface_form,
                    "explanation": f"“{surface_form}” completes the sentence.",
                }
                if len(distractors) >= 3:
                    bank = [surface_form] + distractors[:3]
                    rng.shuffle(bank)
                    entry["options"] = bank
                items.append(entry)
            used_targets.add(surface_form.lower())

        if not items:
            raise GenerationError(
                "Could not derive exercises from this excerpt (offline generator)."
            )

        payload = {
            "title": _title_from(sentences) or title_hint,
            "language": language,
            "items": items,
        }
        try:
            return LessonPayload.model_validate(payload)
        except ValidationError as exc:
            raise GenerationError(
                f"Offline generator produced an invalid payload: {exc}"
            ) from exc

    @staticmethod
    def _pick_target(
        sentence: str, used: set[str], vocabulary: list[str]
    ) -> str | None:
        in_sentence = [
            w
            for w in _content_words(sentence)
            if w.lower() not in used and w.lower() in {v.lower() for v in vocabulary}
        ]
        if in_sentence:
            return max(in_sentence, key=len)
        return None

    @staticmethod
    def _pick_distractors(
        target: str, vocabulary: list[str], used: set[str]
    ) -> list[str]:
        forbidden = {target.lower(), *(u.lower() for u in used)}
        seen: set[str] = set()
        distractors: list[str] = []
        for word in vocabulary:
            key = word.lower()
            if key in forbidden or key in seen:
                continue
            seen.add(key)
            distractors.append(word)
        return distractors
