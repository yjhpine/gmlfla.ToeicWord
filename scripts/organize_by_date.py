#!/usr/bin/env python3
"""
스크린샷을 날짜/일차별로 정리합니다.

사용법:
  1. 이미지 20장을 data/screenshots/inbox/ 에 넣는다
  2. python3 scripts/organize_by_date.py

파일명에서 날짜를 추출하거나(수정시각 폴백),
날짜 오름차순으로 day-01 ~ day-20 폴더에 복사합니다.
"""

from __future__ import annotations

import argparse
import re
import shutil
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = ROOT / "data" / "screenshots"
INBOX = SCREENSHOTS / "inbox"
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".heic"}

# Screenshot_20240901_123456.png, IMG_20240901_123456.jpg, 2024-09-01 ...
DATE_PATTERNS = [
    re.compile(r"(20\d{2})[-_]?(\d{2})[-_]?(\d{2})"),
]


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
    # EXIF 없이도 mtime으로 대략 정렬
    return datetime.fromtimestamp(path.stat().st_mtime)


def list_images(folder: Path) -> list[Path]:
    return sorted(
        [p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS],
        key=lambda p: (extract_date(p), p.name.lower()),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="스크린샷을 day-XX 폴더로 날짜순 정리")
    parser.add_argument(
        "--source",
        type=Path,
        default=INBOX,
        help="원본 이미지 폴더 (기본: data/screenshots/inbox)",
    )
    parser.add_argument(
        "--move",
        action="store_true",
        help="복사 대신 이동",
    )
    parser.add_argument(
        "--max-days",
        type=int,
        default=20,
        help="최대 일차 수 (기본 20)",
    )
    args = parser.parse_args()

    source: Path = args.source
    if not source.exists():
        raise SystemExit(f"소스 폴더 없음: {source}")

    images = list_images(source)
    if not images:
        raise SystemExit(
            f"이미지가 없습니다. {source} 에 png샷을 넣은 뒤 다시 실행하세요."
        )

    if len(images) > args.max_days:
        print(
            f"경고: 이미지 {len(images)}장이 max-days={args.max_days}보다 많습니다. "
            f"앞에서 {args.max_days}장만 사용합니다."
        )
        images = images[: args.max_days]

    manifest_lines: list[str] = ["day,date,filename,source"]

    for idx, path in enumerate(images, start=1):
        day_dir = SCREENSHOTS / f"day-{idx:02d}"
        day_dir.mkdir(parents=True, exist_ok=True)
        dest = day_dir / path.name
        if args.move:
            shutil.move(str(path), str(dest))
        else:
            shutil.copy2(path, dest)

        dt = extract_date(path)
        date_str = dt.strftime("%Y-%m-%d")
        manifest_lines.append(f"{idx},{date_str},{path.name},{path}")
        print(f"day-{idx:02d}  [{date_str}]  <- {path.name}")

    manifest = SCREENSHOTS / "manifest.csv"
    manifest.write_text("\n".join(manifest_lines) + "\n", encoding="utf-8")
    print(f"\n정리 완료: {len(images)}장")
    print(f"매니페스트: {manifest}")


if __name__ == "__main__":
    main()
