# Tallyman Master M6.94.1 — 카고플랜 그리드 fix (최종)

**버전**: M6.94.1
**일자**: 2026-05-27
**기반**: M6.94.0 + 두 단계 fix

## 카고플랜 3대 버그 fix

사용자 보고된 증상:
1. Hold 3 tier만 표시 (정상 4 tier)
2. Deck row 7개만 (정상 8개)
3. Deck-Hold 좌우 비대칭

## 변경 파일 3개

### 1. `src/utils.js` (다른 클로드 작업)
- APP_VERSION: 'M6.94.0' → 'M6.94.1'

### 2. `src/components/BayPlan.jsx` (다른 클로드 작업)
- `pageBayDictGrid` useMemo 추가 — 페이지(짝수+홀수 쌍)별 통일 그리드 계산
- `buildGridRowsFromCells` 함수 — cells 수로 row 번호 배열 생성
- `sliceWithAlign` 함수 — align/padding 기준 own 영역 배치
- `deckRowsArr`/`holdRowsArr` 결정: 사전 있으면 그리드+align, 없으면 기존 EDI 동작 (회귀 방어)
- 헤더 row: 사전 있으면 그리드 풀폭

**사용자 정정 모델 적용** (사용자 통찰):
> "deck 5 + hold 8 양쪽 8칸 통일은 잘못. 중앙선(2.5와 4)이 같아야 대칭"
- 그리드 폭 = max(deckCells, holdCells)
- 좁은 쪽은 align/padding으로 위치 결정

### 3. `src/cargoPlanCore.js` (이번 클로드 추가)
- `computeBayRenderData`에서 deck/hold 그리드 통일
- 변경: `gridRowMax = Math.max(deckRowMax, holdRowMax)`
- deckRowPos/holdRowPos 모두 gridRowMax 기반
- nDeckCols = nHoldCols (통일 그리드)
- 좌우 대칭 보장

**적용 영향**:
- `BayPlan` (메인 카고플랜 화면): #2 fix 적용 (자체 로직)
- `PrintableCargoPlanV2` (인쇄 모드): #3 fix 적용 (computeBayRenderData 호출)
- `PrintableBayDetail` (베이 상세 인쇄): #3 fix 적용 (computeBayRenderData 호출)

## 적용 원칙

- userBayDict 읽기만 (수정/추론/union 없음)
- 6단계 fuzzy 매칭은 dictBaysSummary 결정 단계에서 이미 처리됨 (lookupUserBayDict)
- 회귀 방어: 사전 없는 선박은 기존 EDI 동작 (조건부 분기)

## 빌드 결과

```
dist/index.html        0.83 kB
dist/assets/index.css 69.41 kB
dist/assets/index.js  2,890.91 kB (gzip 567 kB)
```

빌드 성공, 0 에러.

## 배포 방법

### 옵션 A. Firebase CLI (권장)
```bash
# 압축 푼 폴더로 이동
cd Tallyman_Master_M6_94_1

# Firebase 로그인 (한 번만)
firebase login

# 배포 (dist 폴더 → greenmarinetally Firebase Hosting)
firebase deploy --only hosting
```

### 옵션 B. Firebase Console (웹)
1. https://console.firebase.google.com/project/greenmarinetally/hosting 접속
2. "Get started" 또는 "Deploy" 클릭
3. dist 폴더 통째로 업로드 (드래그)

## 사용자 테스트 우선순위

배포 후 다음 순서로 확인:

1. **BayPlan 메인 카고플랜 화면** (검수 → 베이 탭) — fix 적용됨
   - Hold 4 tier 모두 표시되는지
   - Deck row 8개 모두 표시되는지
   - Deck-Hold 좌우 대칭인지

2. **인쇄 모드 카고플랜** (인쇄 버튼 → 미리보기) — fix 적용됨
   - 동일 확인

3. **베이 상세 인쇄** — fix 적용됨
   - 동일 확인

만약 여전히 틀리면:
- 매트릭스 빌더에서 베이사전 등록 자체가 정확한지 확인 필요
- localStorage `master_user_bay_dict_v1` 키에 데이터가 있는지 확인 (없으면 EDI 분석 결과 사용 → 사용자 의도와 다를 수 있음)

## 미적용 작업 (대기 중)

### CSV export 버튼 (매트릭스 빌더)
- 사용자가 베이 구조를 CSV로 다운로드 → 진단/현장 활용
- 이 채팅에서 일부 코드 작성됨 (handleDownloadCsv 함수)
- 다른 채팅에서 추가 작업 진행 가능

