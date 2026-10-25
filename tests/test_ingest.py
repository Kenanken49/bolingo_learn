"""Material extraction (PDF/text) and sentence-aware chunking."""

from __future__ import annotations

import pytest

from app.ingest.chunk import chunk_text, split_sentences
from app.ingest.extract import (
    ExtractError,
    UnsupportedMaterial,
    classify,
    extract_text,
)


def make_pdf(text: str) -> bytes:
    """Hand-build a minimal single-page PDF containing `text`."""
    escaped = text.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")
    content = f"BT /F1 12 Tf 72 720 Td ({escaped}) Tj ET\n".encode("latin-1")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        (
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            b"/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>"
        ),
        b"<< /Length "
        + str(len(content)).encode()
        + b" >>\nstream\n"
        + content
        + b"endstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets: list[int] = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{number} 0 obj\n".encode() + body + b"\nendobj\n"
    xref_pos = len(out)
    out += f"xref\n0 {len(objects) + 1}\n".encode()
    out += b"0000000000 65535 f \n"
    for offset in offsets:
        out += f"{offset:010d} 00000 n \n".encode()
    out += (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF\n"
    ).encode()
    return bytes(out)


def test_classify_kinds() -> None:
    assert classify("lesson.pdf") == "pdf"
    assert classify("notes.txt") == "text"
    assert classify("READING.MD") == "text"
    assert classify("lecture.mp3") == "audio"
    assert classify("interview.m4a") == "audio"


def test_classify_rejects_unknown() -> None:
    with pytest.raises(UnsupportedMaterial, match="Unsupported file type"):
        classify("image.png")


def test_extract_text_file() -> None:
    text = extract_text("notes.txt", (b"Bolingo turns your documents into " * 4))
    assert "Bolingo turns your documents" in text


def test_extract_pdf() -> None:
    source = "Bolingo reads PDF documents and chunks them into lessons."
    text = extract_text("deck.pdf", make_pdf(source))
    assert "Bolingo reads PDF documents" in text


def test_extract_rejects_empty_file() -> None:
    with pytest.raises(ExtractError, match="empty"):
        extract_text("notes.txt", b"")


def test_extract_rejects_text_without_content() -> None:
    with pytest.raises(ExtractError, match="No usable text"):
        extract_text("notes.txt", b"hi")


def test_audio_needs_transcript_route() -> None:
    with pytest.raises(ExtractError, match="transcript"):
        extract_text("talk.mp3", b"\x00\x01\x02")


def test_split_sentences_handles_paragraphs() -> None:
    sentences = split_sentences("First one. Second one!\n\nThird one?")
    assert sentences == ["First one.", "Second one!", "Third one?"]


def test_chunks_respect_target_size() -> None:
    text = " ".join(f"Sentence number {i} about learning." for i in range(120))
    chunks = chunk_text(text, target_chars=300, max_chunks=None)
    assert len(chunks) > 3
    assert all(len(chunk) <= 300 for chunk in chunks)


def test_chunker_keeps_all_content() -> None:
    text = " ".join(f"Unique content word{i} appears here." for i in range(60))
    chunks = chunk_text(text, target_chars=250)
    joined = " ".join(chunks)
    for i in range(60):
        assert f"content word{i}" in joined


def test_max_chunks_limits_lessons() -> None:
    text = " ".join(f"Sentence {i} of a very long document." for i in range(200))
    assert len(chunk_text(text, target_chars=200, max_chunks=4)) == 4


def test_empty_text_yields_no_chunks() -> None:
    assert chunk_text("   \n  ") == []
