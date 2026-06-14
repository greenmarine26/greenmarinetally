# Tallyman Master V7.98-05 인계서

## 이번 변경 (V7.98-05) — 베이상세 편집 드래그-투-창고 다중 이동 버그 수정
**증상**: rubber-band로 여러 개 선택은 되는데, 창고로 드래그하면 1개만 이동.

**원인 (데이터 확정)**: `onStoreDrop`이 dataTransfer의 단일 cn만 읽어 `moveToStorage([cn])` 처리.
- rubber 선택(selected)과 무관하게 드래그한 1개만 이동. (selected는 정상으로 여러 개 담김.)
- "선택분 → 임시창고" 버튼은 `[...selected]` 전부 넘기므로 원래 정상 — 드래그 경로만 버그.

**수정 (외과적, src/components/ChiefBayEdit.jsx)**:
- onStoreDrop: 드래그한 컨이 selected에 포함되면 `[...selected]` 전체 이동, 아니면 그 1개만.
- cellDragStart: 선택 밖 컨을 끌면 기존 선택 해제(그 1개만 대상 명확화). 선택 안 컨이면 선택 유지.

**검증 (로직 시뮬)**:
- A) rubber 4개 선택 후 그 중 하나 창고 드래그 → 4개 전부 이동 ✅
- B) 선택 없이 단일 드래그 → 1개만 ✅
- C) "선택분 → 임시창고" 버튼 → 전체 ✅ (기존 동작 유지)

## 누적 이력 (V7.95~)
- V7.98-04: 인쇄 베이상세(PrintableBayDetail) 매트릭스 격자 통일.
- V7.98-03: 베이상세 편집(ChiefBayEdit) 매트릭스 통일 — 695베이(36%) 폴백 버그 수정.
- V7.97: 3D 입체 베이뷰 + 수석/관리자 전용 권한.
- V7.96: 통계 탭 "베이사전 미등록" 모순 수정.
- V7.95: buildBayGrid3D/fillBayGrid3D/resolveBayEntry.

## 다음 세션 (미해결)
1. 끝자리 4자리 조회를 베이상세/3D에서 하이라이트.
2. 인쇄 폭 다른 deck/hold에서 row 라벨 상하단 정렬 미세 점검.
3. 빈 칸(active 슬롯)에 여러 개 드롭 시 동작 정의(현재 단일 칸이라 1개만이 정상).

## 버전
V7.98-05 (src/utils.js, sw.js, public/sw.js 동기화)
