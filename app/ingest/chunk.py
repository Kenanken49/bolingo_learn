"""Sentence-aware text chunking: one chunk becomes one lesson."""

from __future__ import annotations

import re

_SENTENCE_BREAK = re.compile(r"(?<=[.!?。！？;；])\s+")


def split_sentences(text: str) -> list[str]:
    """Split on blank lines first (paragraphs), then sentence punctuation."""
    sentences: list[str] = []
    for paragraph in text.split("\n\n"):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        for line in paragraph.splitlines():
            line = line.strip()
            if not line:
                continue
            for piece in _SENTENCE_BREAK.split(line):
                piece = piece.strip()
                if piece:
                    sentences.append(piece)
    return sentences


def chunk_text(
    text: str,
    target_chars: int = 1200,
    max_chunks: int | None = None,
) -> list[str]:
    """Group sentences into chunks of roughly `target_chars`.

    Long sentences are hard-split so no chunk blow past the target by much.
    """
    if target_chars < 100:
        raise ValueError("target_chars must be at least 100")
    if not text or not text.strip():
        return []

    pieces: list[str] = []
    for sentence in split_sentences(text):
        if len(sentence) > target_chars:
            pieces.extend(
                sentence[i : i + target_chars]
                for i in range(0, len(sentence), target_chars)
            )
        else:
            pieces.append(sentence)

    chunks: list[str] = []
    current = ""
    for piece in pieces:
        candidate = f"{current} {piece}".strip() if current else piece
        if current and len(candidate) > target_chars:
            chunks.append(current)
            current = piece
        else:
            current = candidate
    if current:
        chunks.append(current)

    if max_chunks is not None:
        chunks = chunks[:max_chunks]
    return chunks
