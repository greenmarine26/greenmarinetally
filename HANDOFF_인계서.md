# Tallyman Master V7.98-06 인계서

## 이번 변경 (V7.98-06) — 인쇄 베이상세 0.5칸 단위 데크/홀드 중심정렬
**증상**: 인쇄 베이상세에서 데크와 홀드 중심선이 반 칸 어긋남. (V7.98-04에서 matrixRender를 Math.floor로 정수 중앙정렬해 0.5칸 규칙 위반.)

**기본 규칙 (사용자 지시)**: 데크(00 없음)·홀드(00 가운데)를 각자 동적 중심정렬하되 **1칸이 아니라 0.5칸 단위로 이동**. 데크 02|01 경계와 홀드 00이 같은 세로선.

**수정 (src/components/PrintableBayDetail.jsx)**: BayPlan pageCoordLayout 로직 이식.
- mrLayout: 데크 축·홀드 축을 각자 만들고 `(nCols-축길이)/2`로 offset(0.5칸 단위, Math.floor 안 씀).
- CSS grid를 half-column(2배)으로 깔아 0.5칸을 정수 half-col로 표현. 각 셀 span 2, offset은 round(off*2) half-col.
- 검증: bay01 deck off=0/hold off=2.5 → 홀드 00이 데크 02|01 경계 아래 정확히 정렬(시각 PNG PASS).

**되돌림**: V7.98-06 초안에서 빈 셀 테두리를 제거(border:none)했으나 **철회**. "빈자리도 자리" — 컨테이너가 들어갈 수 있는 active 빈 슬롯은 반드시 선이 있어야 함. `.bd-cell.empty`는 테두리 유지(배경 white).
- 진짜 "안 쓰는 곳"(매트릭스상 비active 칸)은 이미 border:none 처리됨. active 빈칸은 선 유지가 맞음.

## 누적 이력 (V7.95~)
- V7.98-05: 베이상세 편집 드래그-투-창고 다중 이동 버그 수정.
- V7.98-04: 인쇄 베이상세 매트릭스 격자 통일 (← 이번에 0.5칸 정렬로 정정).
- V7.98-03: 베이상세 편집(ChiefBayEdit) 매트릭스 통일 (695베이 폴백 수정).
- V7.97: 3D 입체 베이뷰 + 수석/관리자 전용 권한.
- V7.96: 통계 탭 모순 수정. V7.95: buildBayGrid3D/fillBayGrid3D.

## 핵심 원칙 (REF 승격 후보)
- 데크/홀드 중심정렬은 0.5칸 단위. offset=(nCols-축길이)/2, Math.floor 금지. half-column grid로 표현.
- "빈자리도 자리": active 빈 슬롯은 선 유지. 비active(매트릭스 미사용)만 선 제거.
- 모든 베이 격자는 buildEmptyBayRenderData 단일 진실원.

## 다음 세션 (미해결)
1. ChiefBayEdit(편집 화면)도 0.5칸 정렬 적용 여부 점검 (인쇄와 동일 규칙 필요).
2. cells 없는 PDF 자동본(ATRP 등)은 여전히 STD_ROWS 폴백 — tier별 row 폭 모름. 근본은 매트릭스(cells) 확보.
3. 끝자리 4자리 조회를 베이상세/3D에서 하이라이트.

## 버전
V7.98-06 (src/utils.js, sw.js, public/sw.js 동기화)
