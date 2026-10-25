"""Supabase (Google) sign-in: new accounts, linking to password accounts, rejects."""

from __future__ import annotations

import time

import pytest

from tests.conftest import PASSWORD, signup

ENDPOINT = "/api/auth/supabase"


@pytest.fixture()
def fake_supabase(monkeypatch):
    """Replace the Supabase token check; maps access tokens to emails."""
    from app.routers import auth

    tokens: dict[str, str] = {}

    def verify(access_token: str):
        return tokens.get(access_token)

    monkeypatch.setattr(auth, "_verify_supabase_token", verify)
    return tokens


def test_google_login_creates_account(client, fake_supabase):
    email = f"google-{time.monotonic_ns()}@bolingo.app"
    fake_supabase["good-token"] = email

    response = client.post(ENDPOINT, json={"access_token": "good-token"})

    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    me = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email


def test_google_login_links_existing_password_account(client, fake_supabase):
    email = f"linked-{time.monotonic_ns()}@bolingo.app"
    original = signup(client, email)
    original_id = client.get("/api/me", headers=original).json()["id"]
    fake_supabase["good-token"] = email

    response = client.post(ENDPOINT, json={"access_token": "good-token"})

    assert response.status_code == 200, response.text
    linked = client.get(
        "/api/me", headers={"Authorization": f"Bearer {response.json()['access_token']}"}
    ).json()
    assert linked["id"] == original_id

    # The existing password still works, so nothing was locked out.
    password_login = client.post(
        "/api/auth/login", json={"email": email, "password": PASSWORD}
    )
    assert password_login.status_code == 200


def test_invalid_supabase_token_is_rejected(client, fake_supabase):
    response = client.post(ENDPOINT, json={"access_token": "bogus"})

    assert response.status_code == 401
