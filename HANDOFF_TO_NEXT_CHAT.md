# Tallyman Master 핸드오프 — M6.94.1

## 📌 현재 상태 (2026-05-27)

- **최신 버전**: **M6.94.1** (카고플랜 row 그리드 사용자 매트릭스 빌더 우선)
- **이전 버전**: M6.94.0 (데크-홀드 시각 정렬 새 필드 6개)
- **작업 디렉토리**: `/home/claude/m6_94_1/`

---

## 🎯 M6.94.1 — 카고플랜이 베이매트릭스대로 표시되도록 fix

성일님 지적: **"베이매트릭스 대로 카고플랜이 만들어지는 것"**

어제 새벽 진단된 카고플랜 3대 버그:
- ① Hold 3 tier (정상 4)
- ② Deck row 7개 (정상 8)
- ③ Deck-Hold 좌우 비대칭

### Root cause

`BayPlan.jsx`의 `globalRowRange`/`globalTiers`가 EDI 적재 컨테이너만 보고 row/tier 폭 결정.
매트릭스 빌더에 등록한 `rowCount`/`hasZero`/`deckCells`/`holdCells` 무시.

### Fix

`BayPlan.jsx`에 새 useMemo `pageBayDictGrid` 추가:
- 페이지 베이의 사전 entry에서 `deckCells`/`holdCells`/`rowCount`/`hasZero` + M6.94.0 align/padding 추출
- 그리드 폭 = `max(deckCells, holdCells, rowCount)` (deck/hold 통일)
- deck/hold 각자 own width 영역을 align 기준 위치에 배치
- 영역 밖은 `null` padding → 빈 placeholder 셀로 시각 중앙선 자동 일치

### 사용자 정정 도메인 모델 (중요)

❌ 잘못된 모델: deck 5 + hold 8 → 양쪽 8칸 통일
✅ 올바른 모델: 폭은 유지, **중앙선이 일치**하도록 시각 정렬
  - hold 8칸 중앙 = 4번째 위치
  - deck 5칸 중앙 = 2.5번째 위치
  - 이 두 중앙선이 같은 column에 와야 대칭

---

## ✅ M6.94.1 변경

### 1. 새 useMemo `pageBayDictGrid` (BayPlan.jsx)
- 페이지 베이의 사전 데이터에서 그리드 폭 + align/padding 추출
- 사전 없으면 `null` → 기존 EDI fallback 그대로 (회귀 없음)

### 2. 헬퍼 함수 2개 (BayPlan.jsx)
- `buildGridRowsFromCells(cells, hasZero)`: cells 수 → row 번호 배열
- `sliceWithAlign(gridRowsArr, ownCells, align, padLeftAdj, padRightAdj)`: 영역 내 위치 배치

### 3. row 배열 결정 변경 (BayPlan.jsx)
- `deckRowsArr`/`holdRowsArr`: 사전 있으면 그리드+align 적용, 없으면 기존 동작
- 새 변수 `deckHeaderRowsArr`/`holdHeaderRowsArr`: 헤더용 (그리드 풀폭)

### 4. 헤더 렌더링 2곳 변경 (BayPlan.jsx)
- DECK 헤더: `deckRowsArr` → `deckHeaderRowsArr`
- HOLD 헤더: `holdRowsArr` → `holdHeaderRowsArr`

---

## 📊 시뮬레이션 검증 결과

총 20개 케이스 PASS:

| 케이스 | 결과 |
|---|---|
| CASE 1 정상 베이 (8 row 대칭) | ✅ PASS |
| CASE 2 사용자 정정 (deck 5 + hold 8, 중앙선 일치) | ✅ PASS |
| CASE 3 hasZero=true (9 row + 00) | ✅ PASS |
| CASE 4 회귀 방지 (사전 미등록 → EDI fallback) | ✅ PASS |
| CASE 5 align=left/right + padLeftAdj | ✅ PASS |
| CASE 6 어제 진단 3대 버그 종합 | ✅ PASS |

---

## 🛡 회귀 방지 (verified 보호)

- 사전 미등록 선박 → `pageBayDictGrid=null` → 슬라이싱 로직 미발동 → 기존 동작 그대로
- 사전 등록 선박 → 사전 우선 (사용자 매트릭스 빌더 데이터 그대로)
- `userBayDict` 절대 보호: 사용자 데이터 *읽기만* 함, 수정/추론/union 없음

---

## 📁 변경 파일 (M6.94.1)

- **`src/components/BayPlan.jsx`** — 새 useMemo + 헬퍼 2개 + row 배열 결정 변경 + 헤더 2곳
- **`src/utils.js`** — APP_VERSION M6.94.0 → M6.94.1

### 절대 건들지 않음
- 다른 모든 파일 (shipStructure.js, bayDictAutoEnrich.js, userBayDict.js, shipMatrixBuilder.js, ShipMatrixBuilderModal.jsx, PrintableCargoPlanV2.jsx 등 모두 미수정)
- 매트릭스 빌더 데이터 구조 (M6.94.0 그대로)
- 6단계 fuzzy 매칭 (M6.93.12 그대로)

---

## ✅ 빌드 검증

| 키워드 | 회수 |
|---|---|
| M6.94.1 (APP_VERSION) | 1 |
| deckAlign / holdAlign | 6 / 6 |
| deckPadLeft / holdPadLeft | 6 / 6 |
| deckCells / holdCells | 7 / 7 |

빌드 산출물 hash: `index-CdfWauNy.js` (이전 M6.94.0과 다름 = src 변경 정상 반영)

---

## 🚦 다음 세션 권장 작업

### 1. 실선박 데이터 검증
- PACIFICSHENZHEN-2609E 등 실제 등록된 베이사전으로 카고플랜 표시 확인
- 어제 진단 3대 버그 모두 해결됐는지 사용자 확인

### 2. align/padding UI 개선 (M6.94.0 기존 + M6.94.1 활용)
- 매트릭스 빌더에서 deck/hold align 시각적으로 미리보기 가능

### 3. tier별 cells 다양화 (계단식 베이)
- 현재: max(deckCells) 사용 (가장 넓은 tier 기준)
- 정밀화: tier별로 다른 폭 (계단식 베이 정확 표시)

---

## 📞 다음 세션 권장 시작 메시지

```
M6.94.2 인계받습니다. M6.94.1 카고플랜 row 그리드 사용자 매트릭스 빌더 우선 완료.

현 상태:
- BayPlan.jsx pageBayDictGrid + 헬퍼 2개 추가
- 사전 등록 선박 → 매트릭스 빌더 데이터 그대로 표시
- 사전 미등록 선박 → 기존 EDI fallback (회귀 없음)
- 시뮬레이션 20/20 PASS, 빌드 검증 통과

권장 다음 작업:
1. 실선박 카고플랜 사용자 확인
2. tier별 cells 다양화 (계단식 베이)

원칙 유지: userBayDict 절대 보호, 6단계 fuzzy 매칭, 시뮬→PASS→빌드→ZIP.
```

---

생성일: 2026-05-27  
세션: M6.94.0 → M6.94.1  
키워드: "베이매트릭스 대로 카고플랜이 만들어지는 것" — 성일님 목표 직접 적용
