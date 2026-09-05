# 희림 토익 단어장

Day별 영단어 학습 + 다중 Day 선택 시험 앱 (Next.js).

**라이브:** https://temporary-zippy-aspen-fuhixjr.vercel.app

## 앱 실행

```bash
npm install
npm run dev
```

- 단어: http://localhost:3000/words  
- 시험: http://localhost:3000/quiz  

## Vercel 배포

- Production: https://temporary-zippy-aspen-fuhixjr.vercel.app  
- `vercel.json` 포함. GitHub 저장소와 연결하면 `main` push마다 자동 배포됩니다.

### Git 자동 배포 연결 (권장)

1. https://vercel.com/dashboard → 해당 프로젝트  
2. **Settings → Git → Connect Repository**  
3. `yjhpine/Heelim.ToeicWord` 선택  

원하면 **Settings → Domains** 에서 프로젝트 이름을 바꿔  
`heelim-toeic.vercel.app` 같은 주소로도 쓸 수 있습니다.

### 새로 Import 할 때

1. https://vercel.com/new  
2. 저장소 `yjhpine/Heelim.ToeicWord` Import  
3. Framework: **Next.js** → Deploy  

## 단어 데이터

`data/words/day-01.json` ~ `day-20.json` (영단어 / 뜻 / 예문 / 예문 한글)

```bash
npm run words:organize   # 스크린샷 Day 정리
npm run words:extract    # OCR 추출
npm run words:upload     # Supabase 업로드 (.env.local)
```
