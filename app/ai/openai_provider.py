"""GPT-4o lesson generator: strict JSON out, Pydantic-validated, one retry."""

from __future__ import annotations

import json
import re

import httpx
from pydantic import ValidationError

from ..config import settings
from . import GenerationError

SYSTEM_PROMPT = """You are Bolingo, an expert curriculum designer creating ONE lesson.
Respond with RAW JSON ONLY — no markdown fences, no commentary — matching exactly:

{"title": string, "language": string|null, "items": [item, ...]}

Each item has EXACTLY these keys (unknown keys are forbidden):
- {"question_type": "multiple_choice", "prompt": string, "options": [2-6 unique strings], "correct_answer": string, "explanation": string|null}
  -> correct_answer MUST be one of options.
- {"question_type": "fill_in_blank", "prompt": string (use ____ for the gap), "correct_answer": string, "options": [strings]|null, "explanation": string|null}
  -> if "options" is present it must include correct_answer (word bank).
- {"question_type": "translate", "prompt": string, "correct_answer": string, "accepted_answers": [strings], "explanation": string|null}
  -> prompt is a sentence to translate into the lesson language.
- {"question_type": "listening", "prompt": string, "options": [2-6 unique strings], "correct_answer": string, "explanation": string|null}
  -> prompt is the sentence that will be spoken aloud by text-to-speech; learner picks what they heard.
- {"question_type": "speak", "prompt": string, "correct_answer": string, "explanation": string|null}
  -> prompt is the sentence the learner should say aloud; correct_answer is the reference transcript.

Rules: 4-8 items, all answers unique per item, every exercise answerable purely
from the source excerpt, no duplicated options, no markdown."""

_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)


class OpenAIGenerator:
    name = "openai"

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        timeout: float = 60.0,
    ) -> None:
        self.api_key = api_key if api_key is not None else settings.openai_api_key
        self.model = model or settings.openai_model
        self.timeout = timeout

    def generate(
        self,
        *,
        chunk: str,
        index: int,
        total: int,
        language: str | None,
        title_hint: str,
    ):
        from ..schemas import LessonPayload

        if not self.api_key:
            raise GenerationError("OPENAI_API_KEY is not set")

        user_prompt = (
            f"Lesson language: {language or 'auto-detect from the text'}\n"
            f"Title hint: {title_hint}\n"
            f"Chunk {index + 1} of {total}:\n\n{chunk}"
        )
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        raw = self._complete(messages)
        try:
            return LessonPayload.model_validate(self._loads(raw))
        except (ValidationError, json.JSONDecodeError) as first_exc:
            # One corrective retry — the model sees its own output and the error.
            retry_messages = messages + [
                {"role": "assistant", "content": raw},
                {
                    "role": "user",
                    "content": (
                        "Your JSON failed validation:\n"
                        f"{first_exc}\n"
                        "Return the corrected lesson as raw JSON only."
                    ),
                },
            ]
            raw_retry = self._complete(retry_messages)
            try:
                return LessonPayload.model_validate(self._loads(raw_retry))
            except (ValidationError, json.JSONDecodeError) as second_exc:
                raise GenerationError(
                    f"OpenAI returned invalid lesson JSON: {second_exc}"
                ) from second_exc

    def _complete(self, messages: list[dict]) -> str:
        try:
            response = httpx.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "temperature": 0.6,
                    "response_format": {"type": "json_object"},
                    "messages": messages,
                },
                timeout=self.timeout,
            )
        except httpx.HTTPError as exc:
            raise GenerationError(f"OpenAI request failed: {exc}") from exc
        if response.status_code != 200:
            raise GenerationError(
                f"OpenAI error {response.status_code}: {response.text[:300]}"
            )
        try:
            return response.json()["choices"][0]["message"]["content"]
        except (KeyError, IndexError, json.JSONDecodeError) as exc:
            raise GenerationError("OpenAI returned an unexpected response shape") from exc

    @staticmethod
    def _loads(raw: str) -> dict:
        text = raw.strip()
        fenced = _FENCE_RE.search(text)
        if fenced:
            text = fenced.group(1).strip()
        return json.loads(text)
