"""Load compliance config (User-Agent, contact email, rate limits, source metadata).

The YAML may contain `${VAR}` placeholders that are expanded from environment variables.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

DEFAULT_PATH = Path(__file__).resolve().parent.parent / "config" / "compliance.yaml"

_VAR_RE = re.compile(r"\$\{([A-Z0-9_]+)\}")


def _expand(value: Any) -> Any:
    """Recursively expand ${ENV_VAR} placeholders in strings."""
    if isinstance(value, str):
        def repl(match: re.Match[str]) -> str:
            name = match.group(1)
            return os.environ.get(name, match.group(0))

        return _VAR_RE.sub(repl, value)
    if isinstance(value, dict):
        return {k: _expand(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_expand(v) for v in value]
    return value


@dataclass(frozen=True)
class ComplianceConfig:
    user_agent: str
    contact_email: str
    sources: dict[str, Any] = field(default_factory=dict)

    def source(self, name: str) -> dict[str, Any]:
        return self.sources.get(name, {})


def load(path: str | Path | None = None) -> ComplianceConfig:
    p = Path(path) if path else DEFAULT_PATH
    with p.open("r", encoding="utf-8") as fp:
        raw = yaml.safe_load(fp) or {}
    raw = _expand(raw)
    return ComplianceConfig(
        user_agent=raw.get("user_agent", ""),
        contact_email=raw.get("contact_email", ""),
        sources=raw.get("sources", {}) or {},
    )


if __name__ == "__main__":  # pragma: no cover
    print(load())
