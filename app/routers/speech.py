"""Text-to-speech endpoint for listening/speaking exercise audio."""

from __future__ import annotations

import base64
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from ..ai import GenerationError
from ..ai import NotConfigured
from ..ai.speech import synthesize
from ..deps import get_current_user
from ..models import User
from ..schemas import TtsIn, TtsOut
from ..services.storage import get_storage

router = APIRouter(prefix="/api", tags=["speech"])


@router.post("/tts", response_model=TtsOut)
async def text_to_speech(
    body: TtsIn,
    user: User = Depends(get_current_user),
) -> TtsOut:
    try:
        audio, content_type, provider = await synthesize(body.text)
    except NotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except GenerationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    # Cache the generated audio into Supabase Storage when configured and return
    # the public URL alongside the base64 payload.
    storage = get_storage()
    audio_url = None
    if hasattr(storage, "save"):
        try:
            audio_url = storage.save(f"tts/{provider}/{uuid4().hex}.mp3", audio)
        except Exception:
            # Storage is optional metadata; the base64 payload is the source of truth.
            audio_url = None

    return TtsOut(
        text=body.text,
        provider=provider,
        audio_base64=base64.b64encode(audio).decode("ascii"),
        audio_url=audio_url,
        content_type=content_type,
    )
