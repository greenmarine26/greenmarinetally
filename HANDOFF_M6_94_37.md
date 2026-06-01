# Tallyman Master M6.94.37 — 매트릭스 빌더 저장 후 베이 안 보임 fix

## 증상
매트릭스 빌더로 베이를 수정·저장·동기화까지 했는데, 카고플랜에서 그 선박의 베이가 안 보임.
베이사전 매칭(코드/IMO/콜사인)은 정상으로 잡힘. (예: TNJP)

## 근본 원인
- 매트릭스 빌더(`shipMatrixBuilder.js`의 `matrixToBayDictEntry`)는 베이 정의를
  `bayDef.baysSummary` 배열로만 저장한다. `bayList`/`bays` 필드는 만들지 않는다.
- 그런데 "그릴 베이 목록"을 산출하는 발원지 `shipStructure.js`의 `getShipBayDictData`는
  `bayDef.bayList` → `bayDef.bays` 두 경로만 보고 `baysSummary`는 보지 않았다.
- 결과: 매칭은 성공하고 tier 등 세부정보(M6.19 dictBaysSummary)는 읽히지만,
  베이 목록이 빈 배열로 반환됨 → `BayPlan.jsx`의 `dictBayList`가 null →
  화면이 EDI 폴백 베이 목록으로 떨어져, 방금 정의한 베이가 안 그려짐.

## 수정
### 1) `src/shipStructure.js` (발원지 — 모든 화면 공통 수정)
`getShipBayDictData`의 bayList 추출에 `baysSummary` 폴백 추가:
`bayList` 없음 + `bays` 없음 → `baysSummary`의 `bay`(3자리) 또는 `bayNo`(2자리)에서 목록 생성.
이 한 곳 수정으로 BayPlan·인쇄(PrintableCargoPlan/BayDetail)·twin 등
`bayList`를 쓰는 모든 경로가 함께 정상화됨.

### 2) `src/components/BayPlan.jsx` (이중 안전망)
`dictBayList` useMemo의 list 소스에도 동일 `baysSummary` 폴백 추가
(`bayList || bays?.map(bayNo) || baysSummary?.map(bay ?? bayNo)`).

## 검증
- 시뮬: baysSummary만 있는 매트릭스 출력 → 정규화 bayList `["001","003","005"]`,
  BayPlan dictBayList `[1,3,5]` 정상 산출. (수정 전엔 [] → null → 빈 화면)
- 빌드: `vite build` 0 에러.
- 이미 저장된 매트릭스도 재업로드 없이 즉시 반영됨(읽는 쪽만 고쳤으므로).

## 배포
- `dist/`·`node_modules/`는 이 ZIP에 미포함(완성 누락본). 받는 쪽에서 빌드.
- `npm install` → `npm run build` → `dist/` 푸시 (기존 파이프라인 동일).

## 변경 파일
- `src/shipStructure.js`
- `src/components/BayPlan.jsx`
