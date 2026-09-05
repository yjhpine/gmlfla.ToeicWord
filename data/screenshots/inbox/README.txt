스크린샷 넣는 방법
==================

1. 바탕화면 "희림" 폴더의 날짜별 영단어 스크린샷 20장을
   이 inbox 폴더에 복사/업로드한다.

2. 프로젝트 루트에서 실행:
   python3 scripts/organize_by_date.py

   → 파일명(또는 수정일) 기준 날짜 오름차순으로
     day-01 ~ day-20 폴더에 자동 배치
     data/screenshots/manifest.csv 생성

3. OCR 추출:
   python3 scripts/extract_words.py

   → data/words/day-XX.json
   → data/words/supabase_seed.json

4. (선택) Supabase 업로드:
   python3 scripts/upload_to_supabase.py
