# Tallyman Master V7.98-09 인계서

## 이번 변경 (V7.98-09) — 편집 베이상세 격자 찌부러짐 버그 수정
**증상**: V7.98-07에서 ChiefBayEdit을 BayBoxV2로 바꾼 뒤, 편집화면 격자가 한 줄로 납작하게 눌림(셀 높이 0).

**원인 (데이터 확정)**: BayBoxV2의 모든 영역(deck-area/hold-area/tier-row/cell)이 `flex:1 1 0`로 높이를 부모에서 상속. 인쇄는 cpv2-page(height:195mm) 또는 bd-cargo-wrap(height:204mm)이 높이를 주지만, 편집 래퍼 cbe-cargo-wrap엔 height가 없어 전체가 0 높이로 collapse.

**수정 (src/components/ChiefBayEdit.jsx CSS)**:
- .cbe-cargo-wrap에 `height:72vh; display:flex; flex-direction:column` 부여.
- .cbe-cargo-wrap .cpv2-bay-section{flex:1 1 0} 보강(높이 체인 연결).
- 검증: cbe-cargo-wrap 높이 부여 후 데크 10칸/홀드 피라미드/0.5칸 정렬 정상 렌더(시각 PNG PASS).

**인쇄(PrintableBayDetail)는 영향 없음**: bd-cargo-wrap에 height:204mm 명시 + CARGO_V2_CSS의 cpv2-bay-section{flex:1 1 0} 전역 → 높이 체인 정상.

## 일원화 상태 (V7.98-07/08/09)
카고플랜·베이상세 편집·베이상세 인쇄 모두 BayBoxV2 단일 컴포넌트 사용.
- 그림(격자/정렬/0.5칸/해치)은 BayBoxV2. 셀 내용만 renderCellContent로 주입(카고플랜=마크, 편집=컨번호, 인쇄=5줄).
- **중요**: BayBoxV2를 쓰는 래퍼는 반드시 명시적 height + flex column 필요(셀이 flex:1 1 0로 높이 상속). height 없으면 0높이 collapse.

## 누적 이력 (V7.95~)
- V7.98-08: 인쇄 베이상세 BayBoxV2 통일.
- V7.98-07: 편집 베이상세 BayBoxV2 통일 + renderCellContent prop.
- V7.98-05: 드래그-투-창고 다중 이동 수정.
- V7.98-03/04: 베이상세 매트릭스 통일.

## 핵심 원칙 (REF 승격 후보)
- 베이 격자는 BayBoxV2 단일 컴포넌트. 셀 내용만 주입. 격자 재구현 금지.
- **BayBoxV2 래퍼는 명시적 height + display:flex;flex-direction:column 필수** (셀 flex:1 1 0 높이 상속). 화면 모달은 vh, 인쇄는 mm.
- BayBoxV2 정렬은 % padding → 0.5칸 자동.
- "빈자리도 자리": active 빈 슬롯 선 유지, 비active만 cpv2-cell-empty(hidden).

## 다음 세션 (미해결)
1. 끝자리 4자리 조회를 베이상세/3D 하이라이트.
2. cells 없는 PDF 자동본(ATRP) 매트릭스 확보.

## 버전
V7.98-09 (src/utils.js, sw.js, public/sw.js 동기화)
