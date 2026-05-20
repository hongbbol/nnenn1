"""Open Pet Food Facts dump fetcher + JSONL stream parser.

The OPFF dump is a gzipped JSONL where each line is a product. We never load the
entire file into memory — we stream chunks to disk and then iterate line by line.
"""

from __future__ import annotations

import gzip
import json
import logging
from collections.abc import Iterator
from pathlib import Path

import httpx

log = logging.getLogger(__name__)

CHUNK_SIZE = 1024 * 1024  # 1 MiB


def fetch_dump(url: str, dest_path: str | Path, user_agent: str) -> Path:
    """Stream-download `url` to `dest_path`. Returns the path.

    Stores ETag (if present) next to the file at `<dest_path>.etag`.
    Caller is responsible for cleanup.
    """
    dest = Path(dest_path)
    dest.parent.mkdir(parents=True, exist_ok=True)
    headers = {"User-Agent": user_agent}

    log.info("fetching dump url=%s dest=%s", url, dest)
    with httpx.stream("GET", url, headers=headers, follow_redirects=True, timeout=None) as resp:
        resp.raise_for_status()
        etag = resp.headers.get("etag")
        with dest.open("wb") as fp:
            for chunk in resp.iter_bytes(CHUNK_SIZE):
                fp.write(chunk)

    if etag:
        (dest.with_suffix(dest.suffix + ".etag")).write_text(etag, encoding="utf-8")
        log.info("etag=%s saved", etag)

    log.info("dump fetched size=%d bytes", dest.stat().st_size)
    return dest


def stream_items(path: str | Path) -> Iterator[dict]:
    """Yield one parsed JSON dict per line from a gzipped or plain JSONL file.

    Skips empty lines and lines that fail to parse (with a WARN log).
    """
    p = Path(path)
    opener = gzip.open if p.suffix == ".gz" else open
    count = 0
    with opener(p, "rt", encoding="utf-8") as fp:  # type: ignore[arg-type]
        for line in fp:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError as exc:
                log.warning("skipping malformed line: %s", exc)
                continue
            count += 1
            if count % 10_000 == 0:
                log.info("streamed rows=%d", count)
    log.info("stream complete rows=%d", count)
