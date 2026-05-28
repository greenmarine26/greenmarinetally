# Tallyman Master 핸드오프 — M6.94.16

## 📌 현재 상태 (2026-05-28)

- **최신 버전**: **M6.94.16** (홀드 없는 베이 셀 세로 길어짐 수정 — globalMaxTier spacer)

- **최신 버전**: **M6.94.15**
- **이전 핸드오프**: M6.94.5
- 오늘 진행: **M6.94.8 → M6.94.15** (카고플랜 레이아웃 정밀화 + 매트릭스 보호 강화 + 해치커버 신규)

---

## 🎯 오늘 작업 요약

카고플랜을 CASPI 정답 양식에 맞추는 작업이 주축. 사용자가 DXQD·SWDN의 CASPI PDF와 Tallyman 출력을 비교 제공 → 단계별로 정렬·셀 크기·여백을 맞춤. 동시에 "수정한 매트릭스 절대 보호" 원칙을 강화하고, 해치커버 표시 기능을 신규 추가.

---

## ✅ 버전별 변경

### M6.94.8 — 전체 베이 누락(orphanEvens) + deck/hold 셀 높이
- **버그①**: `autoPairBays`가 trio에 못 묶인 짝수 단독 베이를 `orphanEvens`로 반환하는데, 호출처가 `{trios, singles}`만 받고 버려서 짝수 단독 베이가 카고플랜에 통째 누락.
  - **fix**: `autoPairBays`가 `unusedOdds + orphanEvens`를 합쳐 `singles`로 반환.
- **버그②**: M6.94.5에서 STANDARD_HOLD를 5→7 tier로 확장했는데 deck/hold area flex가 옛 `6:4` → deck 셀이 hold의 1.5배 높이.
  - **fix**: `cpv2-deck-area`/`cpv2-hold-area` flex `6:4 → 1:1`.

### M6.94.9 — 매트릭스 절대 보호 강화 + 카고플랜 CASPI 정렬
- **보호**: EDI tier union·inferredMax 차단을 `isUserOwnedBay`(=isUserSource && userBay) → **`isUserSource`**(dict 전체) 기준으로. userBay 베이번호 매칭이 실패해도 user dict면 절대 불변. "저장 직후 맞다가 나중에 바뀜"의 원인이 매칭 실패 시 보호가 풀려 EDI tier가 union되던 것.
- **정렬**: invisible tier 행/라벨 `visibility:hidden → display:none`(여백 제거), tier 라벨 span에 `flex:1 1 0`(셀 행과 1:1 정렬), deck/hold area flex를 tier 수 비례로.

### M6.94.10 — 핫픽스: nDeck is not defined
- M6.94.9에서 deck-area flex에 `nDeck`을 썼는데 BayBoxV2 스코프엔 없음(computeBayRenderData 지역변수). → `deckTiers.length`/`holdTiers.length`로 대체.

### M6.94.11 — (폐기) 박스 폭 칸 수 비례
- 베이 셀 폭 통일을 위해 박스 flex를 nDeckCols 비례로 시도. **방향 오판** — 사용자 요구는 "박스 크기 동일". M6.94.12에서 폐기.

### M6.94.12 — 박스 크기 동일 + 박스 내 셀 크기 동일
- 박스 flex `1 1 0` 복원(박스 동일). 전체 베이 최대 칸 수(`globalMaxCols`) 계산 → 모든 베이를 그 칸 수 grid로, 칸 적은 베이는 빈 칸 패딩. CASPI식.
- ※ 이때 `padCenter`(정수 칸 패딩) 사용 → M6.94.14에서 중앙정렬 회귀 발견됨.

### M6.94.13 — 해치커버 수 입력 + 3곳 경계 등분 (신규)
- 검수앱 작업보고의 해치 오픈/클로즈 수 대응. 매트릭스 빌더 베이별 입력에 **"해치: 1/2/3"** 추가. `baysSummary.hatchCount`로 저장(기본 1)·복원.
- 카고플랜(`cpv2-hatch-break`)·베이상세(`bd-hatch`)·베이플랜(해치커버 div)의 deck/hold 경계 굵은선을 해치 수만큼 flex 등분(사이 gap). 1=통선, 2=2조각, 3=3조각.

### M6.94.14 — 중앙정렬 복구 + hold 없는 베이 보호 + 셀 폰트
- **중앙정렬**: M6.94.12 `padCenter`(정수)는 deck/hold 패딩 칸 홀짝이 다르면 중심 0.5칸 어긋남. → padCenter 폐기, deck/hold 모두 **gridCols 기준 % padding**(M6.94.6 방식 확장). 셀 폭 통일 + 0.5칸 정중앙 동시 달성.
- **hold 보호**: `computeBayRenderData`가 user holdTiers 빈 배열을 null로 보고 pdf.hold_t로 자동 채움 → hold 없는 베이에 hold 그려짐. → `isUserSource`면 user가 비운 tier를 그대로 존중(pdf 채움 금지), `nHold=0`이면 hatch+hold 영역 자체 생략.
- **폰트**: 셀 font-size `clamp(7,0.9vw,12) → clamp(6,0.55vw,8)`(별첨 8px 수준). 셀 크기 결정 속성(flex)은 불변.

### M6.94.15 — 미리보기 크래시 수정 + 해치 적용 대상 제한
- **크래시**: M6.94.13에서 `buildEmptyBayRenderData`(미리보기용) return에 `userBay?.hatchCount`를 잘못 넣음 — 이 함수엔 userBay가 없어 ReferenceError로 미리보기 검은 화면. → `bayEntry?.hatchCount`.
- **해치 대상**: BayBoxV2 `applyHatch` prop 추가. trio top(홀수)=false(경계선 1개), pair(짝수)·single(단독)=true(등분). hold 없으면 제외. 베이상세·베이플랜은 해치 수를 even(짝수) 우선으로.

---

## 🔑 유지 원칙 (변함 없음)

1. **userBayDict 절대 보호** — user 소스(매트릭스 빌더 dict)면 EDI tier union·inferred·pdf 자동 채움 전부 차단. M6.94.9·14에서 강화.
2. **6단계 fuzzy 매칭** — lookupUserBayDict 2-Phase (user-source 우선).
3. **검증 순서** — 코드 → 실데이터 시뮬 → PASS → 빌드 → 빌드JS 확인 → ZIP.
4. **React Rules of Hooks** — Hook 최상단, 조기 반환은 Hook 이후.
5. **DXQD 카고플랜 정답 출처 = CASPI**.

---

## 📂 핵심 파일·위치

- `src/cargoPlanCore.js`
  - `autoPairBays`(orphanEvens→singles), `computeBayRenderData`(tier union·inferred isUserSource 차단, user 빈 tier 존중, hatchCount 반환), `buildEmptyBayRenderData`(미리보기, bayEntry 기준)
- `src/components/PrintableCargoPlanV2.jsx`
  - `BayBoxV2`(gridCols·applyHatch prop, % padding, nHold=0 hold 생략, 셀 폰트), `globalMaxCols` useMemo, `cpv2-hatch-break`/`cpv2-hatch-seg` CSS, deck/hold area flex 비례
- `src/components/PrintableBayDetail.jsx` — `bd-hatch` 등분, hatchCount even 우선
- `src/components/BayPlan.jsx` — 해치커버 div 등분, even 우선
- `src/components/ShipMatrixBuilderModal.jsx` — 해치 1/2/3 select
- `src/shipMatrixBuilder.js` — `baysSummary.hatchCount` 저장/복원

---

## ⏳ 다음 세션 확인 사항 (사용자 테스트 대기)

1. 미리보기가 검은 화면 없이 뜨는지
2. 매트릭스 tier/cells가 입력값 그대로 유지되는지 (보호 동작 확인)
3. 해치가 단독/짝수 베이에만, hold 있는 베이에만 등분되는지
4. 카고플랜 셀 정렬·크기·폰트가 CASPI와 일치하는지
5. SWDN처럼 베이별 tier 수가 다른 선박에서 셀 높이 — 행 사이 미세 차이 가능성(필요 시 셀 높이 완전 고정 방식으로 추가 다듬기)
