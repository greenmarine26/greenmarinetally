# Tallyman Master V7.98-07 인계서

## 이번 변경 (V7.98-07) — 베이상세 편집을 카고플랜과 동일 그림(BayBoxV2 재사용)
**사용자 핵심 지시**: 베이상세 그림(격자/정렬/셀크기)은 카고플랜 베이와 100% 같아야 한다. 셀 안 내용만 다르다(카고플랜=마크, 베이상세=컨번호).

**문제**: 이전엔 ChiefBayEdit이 자체 격자(flex 고정폭 또는 half-column)를 그려 카고플랜과 형태가 달랐음. 셀 크기가 행마다 달라 데크/홀드가 같게 보임.

**수정 (외과적)**:
- ChiefBayEdit이 카고플랜의 `BayBoxV2`(PrintableCargoPlanV2.jsx)를 그대로 사용. 격자/정렬/셀크기/해치/0.5칸 중심정렬 전부 BayBoxV2가 담당 → 카고플랜과 100% 동일 그림.
- BayBoxV2에 `renderCellContent`/`cellExtra` prop 추가: 셀 내용만 주입. 없으면 기존 마크(카고플랜), 있으면 컨번호(베이상세). deck/hold 양쪽 셀 렌더에 분기.
- view.matrixRender(buildEmptyBayRenderData 결과)를 BayBoxV2 data로 그대로 전달 — 두 함수가 같은 구조(deckRowPos/deckRows/deckAlign 등) 반환이라 호환.
- 컨번호(cbe-cn)+POL/POD줄(cbe-sub) 표시, 드래그/선택/pending은 cellExtra로 span에 주입.
- 제거: 직접 만든 mrLayout/renderMatrixLayer(half-column) — BayBoxV2가 대체.

**핵심**: BayBoxV2 하나를 카고플랜·베이상세 편집이 공유 → 격자가 영원히 갈라지지 않음.
- BayBoxV2 정렬은 % 단위 padding((diff/2)/biggerN*100%)이라 홀수 diff도 0.5칸 좌우 균등 = 진짜 정중앙.

**검증 (MCSN bay01)**: 데크 10칸/홀드 % 가운데 정렬, 홀드 00이 데크 02|01 경계 아래, 홀드 피라미드, 셀 크기 데크/홀드 동일, 컨번호 표시 — 카고플랜 이미지와 일치(시각 PNG PASS).

## 누적 이력 (V7.95~)
- V7.98-06: 인쇄 베이상세 0.5칸 정렬 (← 인쇄는 별도 half-column. 추후 인쇄도 BayBoxV2 통일 검토 가능).
- V7.98-05: 드래그-투-창고 다중 이동 수정.
- V7.98-03/04: 베이상세 편집/인쇄 매트릭스 통일(695베이 폴백 수정).
- V7.97: 3D 베이뷰+권한. V7.95: buildBayGrid3D/fillBayGrid3D.

## 핵심 원칙 (REF 승격 후보)
- 베이상세 그림 = 카고플랜 BayBoxV2 그대로. 셀 내용만 renderCellContent로 주입. 격자 재구현 금지(갈라짐 방지).
- BayBoxV2 정렬은 % padding → 0.5칸 자동. 별도 half-column 불필요.

## 다음 세션 (미해결)
1. 인쇄 PrintableBayDetail도 BayBoxV2로 통일 검토 (현재 별도 half-column 0.5칸). 통일하면 인쇄/편집/카고플랜 완전 일원화.
2. 끝자리 4자리 조회를 베이상세/3D 하이라이트.
3. cells 없는 PDF 자동본(ATRP)은 tier별 row폭 모름 — 매트릭스 확보 과제.

## 버전
V7.98-07 (src/utils.js, sw.js, public/sw.js 동기화)
