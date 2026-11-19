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

- **해커스** 블록에는 20일차의 Day 단어와 직접 등록한 일반 단어가 함께 표시됩니다. Day 목록을 펼쳐 일차를 고르거나 기존 이름의 등록 블록을 열어 학습할 수 있습니다.
- **LC**의 `문장 등록`에서 영어 문장과 한국어 뜻을 입력합니다. 등록한 문장은 같은 LC 블록에서 듣고 학습하거나 시험에 포함할 수 있습니다. 기존 `단어 등록`도 함께 사용할 수 있습니다.
- **RC**에서는 읽기 단어를 등록하고 학습합니다. 같은 단어도 그룹별로 따로 저장됩니다.
- 등록 블록을 펼친 뒤 원하는 항목 옆의 `수정`을 누르면 목록에서 바로 편집할 수 있습니다. `수정 저장`을 누르면 원래 등록일의 시험과 중요 목록에도 반영됩니다. `카드 학습`에서는 한 장씩 보며 학습할 수 있습니다.
- 블럭당 최대 20개이며, 가득 차면 같은 그룹에 다음 블럭을 만듭니다. 등록 데이터는 현재 브라우저의 localStorage에 저장됩니다.

등록 데이터 보존·그룹 분리·블럭 생성 테스트는 Node.js 22.6 이상에서 `npm test`로 실행할 수 있습니다.

## 시험 범위 선택

시험 탭에서 해커스·LC·RC 중 한 영역을 고른 뒤 시험에 넣을 날짜를 선택합니다. 해커스 기본 단어는 Day 단위로, 직접 등록한 단어와 문장은 한국 시간 기준 등록 날짜로 묶입니다. 여러 날짜를 함께 선택할 수 있고, 같은 날 여러 블록에 등록했다면 블록별로 범위를 좁힐 수 있습니다. 중요 단어 시험은 첫 화면에서 바로 시작합니다.

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
