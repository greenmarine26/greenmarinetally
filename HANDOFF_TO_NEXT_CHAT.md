# M5.1 → 다음 세션 인계 (HANDOFF)

## 현재 상태 (M5.1) — 신규 기능 + 베이 fix 흡수

M5.0 검증 중 사용자가 베이 점프 select에서 "BAY 01 중복" 버그 발견. M5.01 hotfix를 별도 배포하지 않고 M5.1에 흡수해서 한 빌드로 통합.

## ✅ 이번 빌드 변경 사항 (M5.0 → M5.1)

### G. 작업 마감 체크리스트 (양/선적 모두)
- 신규 컴포넌트: `src/components/WorkClosingChecklist.jsx`
- 진입: 항차 페이지 [📤 작업 보고] 옆 [🏁 마감 점검] 큰 버튼 (2-grid)
- 모든 미완 항목 한 화면 표시 — 클릭 시 해당 탭/필터로 점프
- 모두 0이면 큰 ✅ "마감 가능" 화면
- ListTab에 `externalFilter` prop 추가 — 마감 점프 시 자동 필터 적용

**점검 항목**:
- 미완료 컨 (모드 무관)
- 리퍼 온도 미입력 (Full만)
- ISO403 사진 미촬영
- X-RAY 미처리 (양하만)
- 자리 뺏긴 컨 미해결 (선적만)
- 풀씰 미입력 (선적만)

### I. 보관함 + 영역 선택 (선적 전용)

#### 보관함 (StorageBox)
- 신규 컴포넌트: `src/components/StorageBox.jsx`
- 신규 Firebase 함수: `fbBatchMoveToStorage` / `fbBatchClearActual`
- 데이터 모델: `bay_actual = '__STG__'` 마킹
- VoyagePage `allEdiContainers` effective 변환 시 STG 컨은 `bay=''` 처리 → 베이 그리드에서 자동 숨김
- StorageBox에서만 표시, 카드 [📦 이동]으로 다시 그리드로 (자리 뺏긴 컨과 동일 패턴 재사용)
- 헤더 [↻ 일괄 복원]: 모든 보관 컨이 계획 위치로 복원

#### 영역 선택 (PC + 선적 전용)
- BayPlan에 `selectionMode` state + `selectedCns` Set 추가
- 컨트롤 바 [🔲 선택] 토글 (모바일/이동중 자동 비활성)
- 컨 셀 클릭 시 토글 (모달 안 열림) — 파란 ring 시각 표시
- 선택분 ≥ 1 시 상단 sticky 진행 바: [📦 보관함으로] / [해제]
- 일괄 처리: `fbBatchMoveToStorage` 한 번 호출

### 베이 fix (M5.01 흡수)
- `dictBayList` 중복 제거 (`new Set()`) — "BAY 01 중복" 표시 버그 해결
- 짝수 단독 베이는 그대로 표시 (사용자 도메인 지식: BOW/STERN/선원건물 앞뒤 정상)
- 코드 주석에 도메인 지식 보강

### 검증 결과 (산출물 grep)
- 버전: M5.1: 3회 ✓
- G: 작업 마감 점검 / 마감 가능 / 미완료 컨 / ISO403 사진 미촬영 모두 정상
- I: 보관함 12회 / __STG__ 3회 / 일괄 복원 / 선택 모드 / 🔲 / 보관함으로 모두 정상
- M4.9f / M5.0 기존 기능 잔존 ✓

## 변경 파일

| 파일 | 변경 |
|---|---|
| src/utils.js | APP_VERSION 'M5.1' |
| src/firebase.js | fbBatchMoveToStorage / fbBatchClearActual / STORAGE_BAY 상수 |
| src/components/WorkClosingChecklist.jsx | **신규** |
| src/components/StorageBox.jsx | **신규** |
| src/components/BayPlan.jsx | dictBayList 중복 제거 / 짝수 단독 도메인 코멘트 / 영역 선택 모드 / [🔲 선택] 토글 / 선택 진행 바 / 컨 셀 ring 시각화 |
| src/components/HelpModal.jsx | tips 탭에 M5.1 변경사항 |
| src/pages/VoyagePage.jsx | 마감 점검 모달 + 진입 버튼 / StorageBox 표시 / effective 변환 STG 처리 / ListTab externalFilter |
| SHIPMENT_MANUAL.md | M5.1 신규 기능 섹션 / 버전 헤더 |

## ⚠️ 잠재 이슈 (실데이터 검증 시 확인)

1. **VoyageSummaryCard의 displaced 검출** vs **VoyagePage 베이 탭 displaced 검출** 로직이 약간 다름. 실 카운트가 일치하는지 확인.
2. **WorkClosingChecklist의 sealMissing** — 풀씰 검출 조건이 `c.fe === 'F' && !c.sl` 단순 비교. 선박별 엠티 실 정책(shipPolicies)과 별개라 정상이지만, 사용자 의도와 맞는지 확인 필요.
3. **영역 선택**: 현재 컨 셀 단일 클릭으로 토글. 마우스 드래그(사각형)는 미구현 — M5.2에 HTML5 DnD와 함께 추가 예정.
4. **STG 컨이 검색/통계에 어떻게 보이는지** — `bay=''`로 처리됐으니 미배정과 같이 분류될 수 있음. 사용자가 검수원 시점에서 헷갈리면 별도 처리 필요.

## 🔜 다음 세션 (M5.2 또는 hotfix)

### M5.11 hotfix 후보 (M5.1 검증 중 발견되는 버그용)
- 새 버전 규칙: M5.1의 작은 수정 = M5.11

### M5.2 신규 기능 후보
1. **HTML5 Drag & Drop** — 보관함 ↔ 베이 그리드 셀 (PC). 폰은 long-press로 동일
2. 사용자 피드백에 따른 추가 개선
3. 추가 통계/보고서 양식

## 영구 규칙 (메모리)
1. 빌드 전 체크리스트: APP_VERSION + HelpModal 사용법 + HANDOFF.md 갱신
2. 버전 표기: 큰 변화 = M5.0 → M5.1, 작은 수정 = M5.0 → M5.01 → M5.02
3. 컨선 베이 구조: 짝수 단독 = BOW/STERN/선원건물 앞뒤 (정상)

## 사용자 환경 (불변)
- 성일, 평택항 검수, TNJP/SWSP 등
- 핸드폰 PWA(메인) + PC 둘 다
- 영역 선택은 PC에서만, 마감 체크리스트/보관함은 폰/PC 모두
- 보관함은 선적 전용 (양하는 EDI=실체라 위치 변경 의미 없음)
