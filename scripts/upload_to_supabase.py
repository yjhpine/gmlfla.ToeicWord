#!/usr/bin/env python3
"""
data/words/supabase_seed.json 을 Supabase에 업로드합니다.

필요 환경변수 (.env.local):
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY   # 서버 전용 (절대 클라이언트에 노출 금지)

사용:
  python3 scripts/upload_to_supabase.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "data" / "words" / "supabase_seed.json"


def load_env() -> None:
    env_path = ROOT / ".env.local"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def request(method: str, url: str, key: str, body: dict | list | None = None) -> dict | list:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation,resolution=merge-duplicates",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else []
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {e.code} {url}\n{detail}") from e


def main() -> None:
    load_env()
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit(
            "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다. (.env.local)"
        )
    if not SEED.exists():
        raise SystemExit(f"시드 파일 없음: {SEED} — 먼저 extract_words.py 를 실행하세요.")

    seed = json.loads(SEED.read_text(encoding="utf-8"))
    base = url.rstrip("/") + "/rest/v1"

    for book in seed:
        day = book["day"]
        title = book.get("title") or f"Day {day}"
        date = book.get("date")
        rows = request(
            "POST",
            f"{base}/wordbooks?on_conflict=day",
            key,
            [{"day": day, "date": date, "title": title}],
        )
        if not rows:
            raise SystemExit(f"wordbook day={day} upsert 실패")
        wordbook_id = rows[0]["id"]

        # 기존 단어 삭제 후 재삽입 (단순·멱등)
        request(
            "DELETE",
            f"{base}/words?wordbook_id=eq.{wordbook_id}",
            key,
            None,
        )

        word_rows = [
            {
                "wordbook_id": wordbook_id,
                "word": w["word"],
                "meaning": w.get("meaning") or "",
                "example": w.get("example") or "",
                "sort_order": idx,
            }
            for idx, w in enumerate(book.get("words") or [])
        ]
        if word_rows:
            request("POST", f"{base}/words", key, word_rows)
        print(f"Day {day}: {len(word_rows)}단어 업로드 완료")

    print("전체 업로드 완료")


if __name__ == "__main__":
    main()
