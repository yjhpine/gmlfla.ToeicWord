#!/usr/bin/env python3
"""
날짜별 스크린샷에서 영단어 / 뜻 / 예문을 추출해 DB 업로드용 JSON으로 저장합니다.

사용법:
  # day-01 ~ day-20 전체
  python3 scripts/extract_words.py

  # 특정 day만
  python3 scripts/extract_words.py --day 3

출력:
  data/words/day-01.json ...
  data/words/index.json
  data/words/supabase_seed.json  (upsert용 flat 배열)
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import pytesseract
from PIL import Image, ImageOps, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = ROOT / "data" / "screenshots"
WORDS_DIR = ROOT / "data" / "words"
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}

# 흔한 OCR 노이즈 / UI 문구 스킵
SKIP_LINE = re.compile(
    r"^(희림|toeic|토익|day\s*\d+|단어|예문|뜻|meaning|example|"
    r"page\s*\d+|\d+\s*/\s*\d+)$",
    re.I,
)

# 영단어 후보: 알파벳(+하이픈/아포스트로피), 1~40자
WORD_RE = re.compile(r"^[A-Za-z][A-Za-z\-']{0,39}$")
# 한글이 포함된 줄 = 뜻 후보
HAS_HANGUL = re.compile(r"[\uac00-\ud7a3]")
# 예문: 영문 문장(공백 포함) 또는 따옴표
EXAMPLE_HINT = re.compile(r"[.!?]|^\s*[\"'“‘]")


def preprocess(img: Image.Image) -> Image.Image:
    gray = ImageOps.grayscale(img)
    # 대비 강화 + 약간의 샤픈
    gray = ImageOps.autocontrast(gray)
    gray = gray.filter(ImageFilter.SHARPEN)
    # OCR 품질용으로 너무 작으면 확대
    w, h = gray.size
    if w < 900:
        scale = 900 / w
        gray = gray.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    return gray


def ocr_image(path: Path) -> str:
    img = Image.open(path)
    img = preprocess(img)
    # kor+eng: 영단어 + 한글 뜻
    text = pytesseract.image_to_string(img, lang="kor+eng", config="--psm 6")
    return text


def clean_lines(text: str) -> list[str]:
    lines: list[str] = []
    for raw in text.splitlines():
        line = raw.strip()
        line = re.sub(r"\s+", " ", line)
        if not line:
            continue
        if SKIP_LINE.match(line):
            continue
        # 숫자만 있는 줄 스킵
        if re.fullmatch(r"[\d\W]+", line):
            continue
        lines.append(line)
    return lines


def looks_like_word(line: str) -> bool:
    # "1. abandon" / "abandon" / "abandon (v)"
    cleaned = re.sub(r"^\d+[\.)]\s*", "", line)
    cleaned = re.sub(r"\s*[\(\[][^)\]]*[\)\]]$", "", cleaned).strip()
    # 품사 표기 제거
    cleaned = re.sub(r"\s+(n\.|v\.|adj\.|adv\.|prep\.|conj\.)\s*$", "", cleaned, flags=re.I)
    if " " in cleaned:
        # 짧은 구동사 허용 (give up 등) — 단어 2개까지
        parts = cleaned.split()
        if len(parts) <= 3 and all(WORD_RE.match(p.replace(".", "")) for p in parts):
            return True
        return False
    return bool(WORD_RE.match(cleaned.replace(".", "")))


def normalize_word(line: str) -> str:
    cleaned = re.sub(r"^\d+[\.)]\s*", "", line)
    cleaned = re.sub(r"\s*[\(\[][^)\]]*[\)\]]$", "", cleaned).strip()
    cleaned = re.sub(r"\s+(n\.|v\.|adj\.|adv\.|prep\.|conj\.)\s*$", "", cleaned, flags=re.I)
    return cleaned.strip()


def parse_entries(lines: list[str]) -> list[dict]:
    """
    휴리스틱:
      [영단어]
      [한글 뜻]
      [영문 예문] (선택, 여러 줄 가능)
    """
    entries: list[dict] = []
    i = 0
    n = len(lines)

    while i < n:
        line = lines[i]
        if not looks_like_word(line):
            i += 1
            continue

        word = normalize_word(line)
        meaning = ""
        example_parts: list[str] = []
        i += 1

        # 다음 한글 줄을 뜻으로
        if i < n and HAS_HANGUL.search(lines[i]):
            meaning = lines[i]
            i += 1
        elif i < n and not looks_like_word(lines[i]):
            # 한글 OCR 실패 시 다음 비단어 줄을 뜻으로 임시 저장
            meaning = lines[i]
            i += 1

        # 예문: 다음 단어가 나오기 전까지 영문/혼합 줄
        while i < n and not looks_like_word(lines[i]):
            cand = lines[i]
            # 다음 단어 블록의 뜻처럼 보이는 순수 한글만 있고 예문도 없으면 break는 하지 않음
            # 단, 이미 example이 있고 새 한글-only가 오면 다음 엔트리 뜻일 수 있어 중단
            if example_parts and HAS_HANGUL.search(cand) and not re.search(r"[A-Za-z]", cand):
                break
            example_parts.append(cand)
            i += 1

        example = " ".join(example_parts).strip()
        entries.append(
            {
                "word": word,
                "meaning": meaning,
                "example": example,
            }
        )

    return entries


def day_date_from_manifest(day: int) -> str | None:
    manifest = SCREENSHOTS / "manifest.csv"
    if not manifest.exists():
        return None
    for line in manifest.read_text(encoding="utf-8").splitlines()[1:]:
        if not line.strip():
            continue
        parts = line.split(",")
        if len(parts) >= 2 and parts[0].strip() == str(day):
            return parts[1].strip() or None
    return None


def first_image(day_dir: Path) -> Path | None:
    images = sorted(
        [p for p in day_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS],
        key=lambda p: p.name.lower(),
    )
    return images[0] if images else None


def extract_day(day: int) -> dict | None:
    day_dir = SCREENSHOTS / f"day-{day:02d}"
    if not day_dir.exists():
        print(f"[skip] day-{day:02d} 폴더 없음")
        return None

    image = first_image(day_dir)
    if not image:
        print(f"[skip] day-{day:02d} 이미지 없음")
        return None

    print(f"[ocr] day-{day:02d} <- {image.name}")
    raw = ocr_image(image)
    lines = clean_lines(raw)
    words = parse_entries(lines)

    # OCR 원문도 보관 (검수용)
    raw_path = WORDS_DIR / f"day-{day:02d}.ocr.txt"
    raw_path.write_text(raw, encoding="utf-8")

    payload = {
        "day": day,
        "date": day_date_from_manifest(day),
        "sourceImage": image.name,
        "words": words,
    }
    out = WORDS_DIR / f"day-{day:02d}.json"
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"  -> {len(words)}단어 저장: {out.relative_to(ROOT)}")
    return payload


def write_index(days: list[dict]) -> None:
    index = {
        "totalDays": len(days),
        "totalWords": sum(len(d["words"]) for d in days),
        "days": [
            {
                "day": d["day"],
                "date": d.get("date"),
                "wordCount": len(d["words"]),
                "file": f"day-{d['day']:02d}.json",
            }
            for d in days
        ],
    }
    path = WORDS_DIR / "index.json"
    path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # Supabase seed용 flat 구조
    seed = []
    for d in days:
        seed.append(
            {
                "day": d["day"],
                "date": d.get("date"),
                "title": f"Day {d['day']}",
                "words": d["words"],
            }
        )
    seed_path = WORDS_DIR / "supabase_seed.json"
    seed_path.write_text(json.dumps(seed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"index: {path.relative_to(ROOT)} ({index['totalWords']} words)")
    print(f"seed:  {seed_path.relative_to(ROOT)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="스크린샷 OCR → 단어 JSON")
    parser.add_argument("--day", type=int, help="특정 일차만 추출")
    parser.add_argument("--max-days", type=int, default=20)
    args = parser.parse_args()

    WORDS_DIR.mkdir(parents=True, exist_ok=True)

    if args.day:
        result = extract_day(args.day)
        days = [result] if result else []
    else:
        days = []
        for day in range(1, args.max_days + 1):
            result = extract_day(day)
            if result:
                days.append(result)

    if not days:
        raise SystemExit(
            "추출된 단어가 없습니다.\n"
            "1) 스크린샷을 data/screenshots/inbox/ 에 넣고\n"
            "2) python3 scripts/organize_by_date.py\n"
            "3) python3 scripts/extract_words.py\n"
            "순서로 실행하세요."
        )

    write_index(days)


if __name__ == "__main__":
    main()
