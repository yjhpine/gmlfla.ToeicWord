스크린샷 넣는 방법
==================

권장: 프로젝트 루트 `단어장/` 폴더에 이미지를 둡니다.
(이미 KakaoTalk_... 20장이 들어 있으면 추가 복사 불필요)

또는 이 inbox 폴더에 넣어도 됩니다.

실행:
  python3 scripts/organize_by_date.py
  # → data/screenshots/manifest.csv 생성 (DAY ↔ 파일 매핑)

  python3 scripts/extract_words.py   # OCR 재추출이 필요할 때만
