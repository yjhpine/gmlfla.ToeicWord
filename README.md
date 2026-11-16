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

## 단어 학습 그룹

- **Day 단어**: 기존 20일차 단어장을 펼치거나 접을 수 있습니다. 처음에는 접혀 있습니다.
- **등록 단어**: 기존에 직접 등록한 단어와 블럭 이름을 그대로 유지합니다.
- **LC / RC**: 각각 빈 `등록 1` 블럭에서 시작하며, 기존 등록 화면으로 단어를 추가하고 학습합니다. 같은 단어도 그룹별로 따로 저장됩니다.
- 블럭당 최대 20개이며, 가득 차면 같은 그룹에 다음 블럭을 만듭니다. 등록 데이터는 현재 브라우저의 localStorage에 저장됩니다.

등록 데이터 보존·그룹 분리·블럭 생성 테스트는 Node.js 22.6 이상에서 `npm test`로 실행할 수 있습니다.

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
