# 희림 토익 단어장

Day별 영단어 학습 + 다중 Day 선택 시험 앱 (Next.js).

## 앱 실행

```bash
npm install
npm run dev
```

- 단어: http://localhost:3000/words  
- 시험: http://localhost:3000/quiz  

## Vercel 배포

`vercel.json` 포함. GitHub → Vercel 연동 시 `main` push마다 자동 배포됩니다.

### 처음 한 번 (대시보드)

1. https://vercel.com/new 접속 후 GitHub 로그인  
2. 저장소 `yjhpine/Heelim.ToeicWord` Import  
3. Framework: **Next.js** (기본값) → Deploy  

이미 클레임한 임시 배포가 있다면:

1. Vercel Dashboard → 해당 프로젝트  
2. **Settings → Git → Connect Repository** → 위 저장소 연결  
3. **Domains** 에서 Production URL 확인  

### CLI (토큰 있을 때)

```bash
npx vercel login
npx vercel --prod
```

## 단어 데이터

`data/words/day-01.json` ~ `day-20.json` (영단어 / 뜻 / 예문 / 예문 한글)

```bash
npm run words:organize   # 스크린샷 Day 정리
npm run words:extract    # OCR 추출
npm run words:upload     # Supabase 업로드 (.env.local)
```
