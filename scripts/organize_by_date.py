#!/usr/bin/env python3
"""
스크린샷을 DAY 순서로 매핑하고 manifest를 만듭니다.

지원 소스:
  - 단어장/          (KakaoTalk_YYYYMMDD_HHMMSSmmm[_NN].jpg)
  - data/screenshots/inbox/

사용법:
  python3 scripts/organize_by_date.py
  python3 scripts/organize_by_date.py --source 단어장
"""

from __future__ import annotations

import argparse
import csv
import re
import shutil
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = ROOT / "data" / "screenshots"
INBOX = SCREENSHOTS / "inbox"
WORDS_DIR = ROOT / "단어장"
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".heic"}

# KakaoTalk_20260905_142042762.jpg -> day 1
# KakaoTalk_20260905_142042762_01.jpg -> day 2
KAKAO_SEQ = re.compile(r"^KakaoTalk_\d+_(\d+)(?:_(\d+))?$", re.I)
DATE_PATTERNS = [
    re.compile(r"(20\d{2})[-_]?(\d{2})[-_]?(\d{2})"),
]


def kakao_day(path: Path) -> int | None:
    m = KAKAO_SEQ.match(path.stem)
    if not m:
        return None
    return 1 if m.group(2) is None else int(m.group(2)) + 1


def extract_date(path: Path) -> datetime:
    name = path.stem
    for pattern in DATE_PATTERNS:
        m = pattern.search(name)
        if m:
            y, mo, d = map(int, m.groups())
            try:
                return datetime(y, mo, d)
            except ValueError:
                pass
    return datetime.fromtimestamp(path.stat().st_mtime)


def list_images(folder: Path) -> list[Path]:
    return [p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS]


def sort_images(images: list[Path]) -> list[Path]:
    # Prefer KakaoTalk sequence when all files match that pattern
    if images and all(kakao_day(p) is not None for p in images):
        return sorted(images, key=lambda p: kakao_day(p) or 0)
    return sorted(images, key=lambda p: (extract_date(p), p.name.lower()))


def main() -> None:
    parser = argparse.ArgumentParser(description="스크린샷을 day 순서로 정리/매핑")
    parser.add_argument(
        "--source",
        type=Path,
        default=None,
        help="원본 폴더 (기본: 단어장/ 있으면 사용, 없으면 inbox)",
    )
    parser.add_argument(
        "--copy-to-day-folders",
        action="store_true",
        help="data/screenshots/day-XX 로도 복사 (기본은 manifest만, 원본은 유지)",
    )
    parser.add_argument("--max-days", type=int, default=20)
    args = parser.parse_args()

    if args.source is not None:
        source = args.source
    elif WORDS_DIR.exists() and list_images(WORDS_DIR):
        source = WORDS_DIR
    else:
        source = INBOX

    if not source.exists():
        raise SystemExit(f"소스 폴더 없음: {source}")

    images = sort_images(list_images(source))
    if not images:
        raise SystemExit(f"이미지가 없습니다: {source}")

    if len(images) > args.max_days:
        print(f"경고: {len(images)}장 중 앞 {args.max_days}장만 사용")
        images = images[: args.max_days]

    rows = [["day", "date", "filename", "source", "title"]]
    for idx, path in enumerate(images, start=1):
        day = kakao_day(path) or idx
        date_str = extract_date(path).strftime("%Y-%m-%d")
        title = ""
        word_json = ROOT / "data" / "words" / f"day-{day:02d}.json"
        if word_json.exists():
            try:
                import json

                title = json.loads(word_json.read_text(encoding="utf-8")).get("title") or ""
            except Exception:
                title = ""

        if args.copy_to_day_folders:
            day_dir = SCREENSHOTS / f"day-{day:02d}"
            day_dir.mkdir(parents=True, exist_ok=True)
            for old in day_dir.iterdir():
                if old.is_file() and old.suffix.lower() in IMAGE_EXTS:
                    old.unlink()
            shutil.copy2(path, day_dir / path.name)

        rel = path.relative_to(ROOT) if path.is_relative_to(ROOT) else path
        rows.append([str(day), date_str, path.name, str(rel).replace("\\", "/"), title])
        print(f"day-{day:02d}  [{date_str}]  <- {path.name}")

    SCREENSHOTS.mkdir(parents=True, exist_ok=True)
    manifest = SCREENSHOTS / "manifest.csv"
    with manifest.open("w", encoding="utf-8", newline="") as f:
        csv.writer(f).writerows(rows)

    print(f"\n정리 완료: {len(images)}장")
    print(f"매니페스트: {manifest}")


if __name__ == "__main__":
    main()
