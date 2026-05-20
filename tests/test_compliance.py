"""Compliance config loader."""

from __future__ import annotations

import os

from scripts import compliance


def test_load_expands_env(monkeypatch):
    monkeypatch.setenv("CONTACT_EMAIL", "ops@example.com")
    monkeypatch.setenv("OPFF_DUMP_URL", "https://example.org/x.gz")
    cfg = compliance.load()
    assert "ops@example.com" in cfg.user_agent
    assert cfg.contact_email == "ops@example.com"
    assert "opff" in cfg.sources
    assert cfg.source("opff")["dump_url"] == "https://example.org/x.gz"


def test_load_leaves_unset_placeholder_intact(monkeypatch):
    monkeypatch.delenv("CONTACT_EMAIL", raising=False)
    cfg = compliance.load()
    # The literal ${CONTACT_EMAIL} should remain since unset.
    assert "${CONTACT_EMAIL}" in cfg.contact_email or os.environ.get("CONTACT_EMAIL") == cfg.contact_email
