"""Extract plain text from uploaded materials (PDF / text / audio)."""

from __future__ import annotations

import io
from pathlib import Path

TEXT_EXTENSIONS = {".txt", ".md", ".markdown", ".csv"}
PDF_EXTENSIONS = {".pdf"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".webm", ".flac"}


class UnsupportedMaterial(Exception):
    """Raised for file types Bolingo cannot ingest."""


class ExtractError(Exception):
    """Raised when a file yields no usable text."""


def classify(filename: str) -> str:
    """Return 'pdf' | 'text' | 'audio' for a filename, or raise."""
    ext = Path(filename or "").suffix.lower()
    if ext in PDF_EXTENSIONS:
        return "pdf"
    if ext in TEXT_EXTENSIONS:
        return "text"
    if ext in AUDIO_EXTENSIONS:
        return "audio"
    raise UnsupportedMaterial(
        f"Unsupported file type {ext or '(no extension)'!r}. "
        f"Accepted: {', '.join(sorted(PDF_EXTENSIONS | TEXT_EXTENSIONS | AUDIO_EXTENSIONS))}"
    )


def extract_text(filename: str, data: bytes) -> str:
    """Extract text from a PDF or text file. Raises ExtractError if empty."""
    kind = classify(filename)
    if kind == "audio":
        raise ExtractError("Audio materials need a transcript (see upload API)")
    if not data:
        raise ExtractError("File is empty")

    if kind == "text":
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            text = data.decode("latin-1", errors="replace")
    else:
        text = _extract_pdf(data)

    text = _tidy(text)
    if len(text) < 20:
        raise ExtractError(
            "No usable text found in this file. Scanned/image-only PDFs are not "
            "supported yet — upload the text or a text-based PDF."
        )
    return text


def _extract_pdf(data: bytes) -> str:
    from pypdf import PdfReader

    try:
        reader = PdfReader(io.BytesIO(data))
    except Exception as exc:  # pypdf raises many parse error types
        raise ExtractError(f"Could not read PDF: {exc}") from exc
    parts: list[str] = []
    for page in reader.pages:
        try:
            page_text = page.extract_text() or ""
        except Exception:  # a single bad page should not sink the file
            page_text = ""
        if page_text.strip():
            parts.append(page_text.strip())
    return "\n\n".join(parts)


def _tidy(text: str) -> str:
    lines = [line.rstrip() for line in text.splitlines()]
    out: list[str] = []
    blank = False
    for line in lines:
        if line.strip():
            out.append(line)
            blank = False
        elif not blank:
            out.append("")
            blank = True
    return "\n".join(out).strip()
