"""Storage backends: local defaults and the Supabase SDK call shapes."""

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest

from app.services import storage as storage_module
from app.services.storage import LocalStorage, SupabaseStorage, get_storage


class _FakeBucket:
    def __init__(self) -> None:
        self.uploads: list[tuple[str, bytes, dict]] = []
        self.downloads: list[str] = []
        self.public_calls: list[str] = []
        self.fail_upload = False

    def upload(self, path: str, file: bytes, options: dict) -> dict:
        if self.fail_upload:
            raise RuntimeError("bucket policy denied")
        self.uploads.append((path, file, options))
        return {"path": path}

    def get_public_url(self, path: str) -> str:
        self.public_calls.append(path)
        return f"https://cdn.test/{path}"

    def download(self, path: str) -> bytes:
        self.downloads.append(path)
        return b"audio-bytes"


class _FakeClient:
    def __init__(self) -> None:
        self.bucket = _FakeBucket()
        self.storage = self

    def from_(self, bucket: str) -> _FakeBucket:
        assert bucket == "bolingo"
        return self.bucket


def test_supabase_save_uploads_bytes_and_returns_the_public_url() -> None:
    client = _FakeClient()
    backend = SupabaseStorage(client=client, bucket="bolingo", prefix="/lessons")

    url = backend.save("answer.mp3", b"abc")

    path, data, options = client.bucket.uploads[0]
    assert path.startswith("lessons/")
    assert path.endswith("_answer.mp3")
    assert data == b"abc"
    assert options == {"content-type": "audio/mpeg", "upsert": "true"}
    assert client.bucket.public_calls == [path]
    assert url == f"https://cdn.test/{path}"


def test_supabase_errors_are_wrapped_with_context() -> None:
    client = _FakeClient()
    client.bucket.fail_upload = True
    backend = SupabaseStorage(client=client, bucket="bolingo", prefix="lessons")

    with pytest.raises(RuntimeError, match="Supabase Storage"):
        backend.save("answer.webm", b"abc")


def test_supabase_read_downloads_from_the_configured_prefix() -> None:
    client = _FakeClient()
    backend = SupabaseStorage(client=client, bucket="bolingo", prefix="lessons")

    assert backend.read("https://cdn.test/lessons/voice.mp3") == b"audio-bytes"
    assert client.bucket.downloads == ["lessons/voice.mp3"]


def test_supabase_requires_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(storage_module, "_supabase_client", lambda: None)
    with pytest.raises(RuntimeError, match="SUPABASE_URL"):
        SupabaseStorage()


def test_local_storage_round_trip(tmp_path: Path) -> None:
    backend = LocalStorage(tmp_path)
    path = backend.save("notes.txt", b"hello")
    assert Path(path).read_bytes() == b"hello"
    assert backend.read(path) == b"hello"


def test_get_storage_defaults_to_local_without_supabase(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(
        storage_module,
        "settings",
        SimpleNamespace(
            supabase_url=None,
            supabase_key=None,
            supabase_storage_bucket=None,
            upload_dir=tmp_path,
        ),
    )

    assert isinstance(get_storage(), LocalStorage)
