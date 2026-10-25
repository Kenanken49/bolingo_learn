"""File storage backends for uploaded material audio.

Surface: :meth:`save` returns a storage path / URL; :meth:`read` returns bytes.
The backend layer swaps providers by calling :func:`get_storage`.
"""

from __future__ import annotations

import mimetypes
import re
from pathlib import Path
from uuid import uuid4

from supabase import Client, create_client

from ..config import settings


def _safe_filename(filename: str) -> str:
    name = Path(filename or "material").name
    name = re.sub(r"[^\w.\- ]+", "_", name).strip() or "material"
    return name[:120]


def _content_type(filename: str) -> str:
    guessed, _encoding = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"


class LocalStorage:
    """Local directory backend (default in zero-config development)."""

    def __init__(self, root: Path) -> None:
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, filename: str, data: bytes) -> str:
        key = f"{uuid4().hex}_{_safe_filename(filename)}"
        path = self.root / key
        path.write_bytes(data)
        return str(path)

    def read(self, storage_path: str) -> bytes:
        return Path(storage_path).read_bytes()


# Module-level Supabase client shared across the app.
_SUPABASE_CLIENT: Client | None = None


def _supabase_client() -> Client | None:
    if settings.supabase_url and settings.supabase_key:
        global _SUPABASE_CLIENT
        if _SUPABASE_CLIENT is None:
            _SUPABASE_CLIENT = create_client(
                settings.supabase_url, settings.supabase_key
            )
        return _SUPABASE_CLIENT
    return None


def _bucket_name() -> str:
    return settings.supabase_storage_bucket or "bolingo"


def _object_prefix() -> str:
    return (settings.supabase_storage_path or "/lessons").strip("/")


class SupabaseStorage:
    """Supabase Storage backend: uploads bytes and returns a public URL.

    The client, bucket, and prefix are injectable so the SDK call shapes are
    testable without network access.
    """

    def __init__(
        self,
        client: Client | None = None,
        bucket: str | None = None,
        prefix: str | None = None,
    ) -> None:
        resolved_client = client if client is not None else _supabase_client()
        if resolved_client is None:
            raise RuntimeError(
                "Supabase Storage requires SUPABASE_URL and SUPABASE_ANON_KEY. "
                "Configure both, or leave them unset to keep using local storage."
            )
        self._client = resolved_client
        self._bucket = bucket or _bucket_name()
        self._prefix = (prefix or _object_prefix()).strip("/")

    @property
    def client(self) -> Client:
        return self._client

    def _object_path(self, key: str) -> str:
        return f"{self._prefix}/{key}" if self._prefix else key

    def save(self, filename: str, data: bytes) -> str:
        key = f"{uuid4().hex}_{_safe_filename(filename)}"
        object_path = self._object_path(key)
        try:
            bucket = self._client.storage.from_(self._bucket)
            bucket.upload(
                object_path,
                data,
                {"content-type": _content_type(filename), "upsert": "true"},
            )
            return str(bucket.get_public_url(object_path))
        except Exception as exc:  # network / auth / bucket policy
            raise RuntimeError(
                f"Could not upload {object_path!r} to Supabase Storage: {exc}"
            ) from exc

    def read(self, storage_path: str) -> bytes:
        object_path = self._object_path(Path(storage_path).name)
        try:
            return self._client.storage.from_(self._bucket).download(object_path)
        except Exception as exc:
            raise RuntimeError(
                f"Could not download {object_path!r} from Supabase Storage: {exc}"
            ) from exc


# Module-level local storage instance used by the routers and generation pipeline.
storage = LocalStorage(Path(settings.upload_dir))


def get_storage():
    """Return the active storage backend, preferring Supabase when configured."""
    if (
        settings.supabase_url
        and settings.supabase_key
        and settings.supabase_storage_bucket
    ):
        return SupabaseStorage()
    return LocalStorage(Path(settings.upload_dir))
