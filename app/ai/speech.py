"""Speech services: Whisper transcription and text-to-speech.

Each capability resolves from whatever key is configured (ElevenLabs preferred,
then Deepgram for TTS) and raises NotConfigured with instructions when none is.
"""

from __future__ import annotations

from pathlib import Path

import httpx

from ..config import settings
from ..services import storage
from . import GenerationError, NotConfigured

ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # "Rachel" default voice
TTS_TIMEOUT = 60.0


async def transcribe_audio(path: str | Path) -> str:
    """Speech-to-text via OpenAI Whisper. Requires OPENAI_API_KEY."""
    if not settings.openai_api_key:
        raise NotConfigured(
            "Speech transcription requires OPENAI_API_KEY (Whisper). "
            "Add the key, or upload a transcript with the audio file."
        )
    file_path = Path(path)
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                files={"file": (file_path.name, file_path.read_bytes())},
                data={"model": "whisper-1"},
            )
    except httpx.HTTPError as exc:
        raise GenerationError(f"Whisper request failed: {exc}") from exc
    if response.status_code != 200:
        raise GenerationError(
            f"Whisper error {response.status_code}: {response.text[:300]}"
        )
    text = (response.json().get("text") or "").strip()
    if not text:
        raise GenerationError("Whisper returned no transcript for this audio")
    return text


async def synthesize(text: str) -> tuple[bytes, str, str]:
    """Text-to-speech -> (audio bytes, content type, provider name)."""
    if settings.elevenlabs_api_key:
        return await _elevenlabs(text)
    if settings.deepgram_api_key:
        return await _deepgram(text)
    raise NotConfigured(
        "Text-to-speech requires ELEVENLABS_API_KEY or DEEPGRAM_API_KEY. "
        "Add one of them to enable listening and speaking exercises."
    )


async def _elevenlabs(text: str) -> tuple[bytes, str, str]:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
    try:
        async with httpx.AsyncClient(timeout=TTS_TIMEOUT) as client:
            response = await client.post(
                url,
                headers={
                    "xi-api-key": settings.elevenlabs_api_key or "",
                    "Content-Type": "application/json",
                },
                json={
                    "text": text,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
                },
            )
    except httpx.HTTPError as exc:
        raise GenerationError(f"ElevenLabs request failed: {exc}") from exc
    if response.status_code != 200:
        raise GenerationError(
            f"ElevenLabs error {response.status_code}: {response.text[:300]}"
        )
    return response.content, "audio/mpeg", "elevenlabs"


async def _deepgram(text: str) -> tuple[bytes, str, str]:
    url = "https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=mp3"
    try:
        async with httpx.AsyncClient(timeout=TTS_TIMEOUT) as client:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"Token {settings.deepgram_api_key}",
                    "Content-Type": "application/json",
                },
                json={"text": text},
            )
    except httpx.HTTPError as exc:
        raise GenerationError(f"Deepgram request failed: {exc}") from exc
    if response.status_code != 200:
        raise GenerationError(
            f"Deepgram error {response.status_code}: {response.text[:300]}"
        )
    return response.content, "audio/mpeg", "deepgram"
