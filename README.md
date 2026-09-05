# 희림 토익 단어장

날짜별 영단어 학습 + Day 선택 시험 앱.

## 이미지 → DB용 JSON 변환

```bash
# 1) 스크린샷 20장을 data/screenshots/inbox/ 에 넣기
# 2) 날짜순으로 day-01~20 배치
npm run words:organize

# 3) OCR로 영단어/뜻/예문 추출
npm run words:extract

# 4) (선택) Supabase 업로드 — .env.local 필요
npm run words:upload
```

## 앱 실행

```bash
npm install
npm run dev
```
