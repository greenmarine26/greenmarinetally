# Tallyman Master V7.98-04 인계서

## 이번 변경 (V7.98-04) — 인쇄 베이상세(PrintableBayDetail) 매트릭스 격자 통일
V7.98-03(편집 ChiefBayEdit)에 이어, 인쇄용 베이상세도 같은 매트릭스 진실원으로 통일.

**증상**: 인쇄 베이상세도 rowMax 기반 STD_ROWS를 써서, matrix_builder본(rowMax 없음) 695베이가 매트릭스 미적용.

**수정 (외과적, src/components/PrintableBayDetail.jsx)**:
- matrixRender 추가: deckCells/holdCells 유효하면 `buildEmptyBayRenderData`(3D·편집·카고플랜과 동일)로 격자.
- 인쇄 grid 호환: 전체 폭(mrMaxCols) 고정 grid에 active cell을 가운데 정렬 배치. 좁아지는 tier=양끝 비active 빈칸, deck/hold 폭차=leftpad 가운데.
- 컨번호 유지(renderCell 재사용). cells 없는 PDF 자동본은 기존 STD_ROWS 폴백.
- tier 라벨·row 라벨·해치도 matrixRender 분기 반영.

**검증 (MCSN 624S 실 EDI)**:
- bay01(deck 10칸/hold 6칸): hold가 deck 폭 안에서 가운데 정렬, holdCells 좁아짐(피라미드) 정확, 컨번호 표시 — 시각 PNG PASS.
- bay44(deck T80만 10칸 좁아짐): active cell 정확.
- 빌드 JS에 matrixRender 박힘(ChiefBayEdit+PrintableBayDetail 양쪽).

**일관성 완성**: 베이상세 편집·인쇄·3D 뷰·카고플랜·베이플랜 모두 buildEmptyBayRenderData 단일 진실원(발견②③ 원칙 완전 충족).

## 누적 이력 (V7.95~)
- V7.98-03: 베이상세 편집(ChiefBayEdit) 매트릭스 통일 — 695베이(36%) 폴백 버그 수정. rowMax 대신 deckCells 사용.
- V7.97: 3D 입체 베이뷰 + 수석/관리자 전용 권한(isChief + 대시보드 경유).
- V7.96: 통계 탭 "베이사전 미등록" 모순 수정.
- V7.95: buildBayGrid3D/fillBayGrid3D/resolveBayEntry (EDI row↔rowPos 810/810=100%).

## 핵심 원칙 (REF 승격 후보)
- 베이상세 격자는 rowMax가 아니라 deckCells/holdCells로 그려야 함. matrix_builder본은 rowMax 미저장 → rowMax 기반은 695베이(36%) 폴백.
- 모든 베이 격자(편집/인쇄/3D/카고플랜/베이플랜)는 buildEmptyBayRenderData 단일 진실원.
- "deckCells 균일" 판단 시 Firebase 실사전 전수 필수(로컬 정적사전만 보면 비균일 79베이 누락).

## 다음 세션 (미해결)
1. rubber-band 영역 선택 검증 (ChiefBayEdit 일부 구현됨).
2. 끝자리 4자리 조회를 베이상세/3D에서 하이라이트.
3. 인쇄 폭 다른 deck/hold에서 row 라벨 상하단 정렬 미세 점검(현재 deck 기준 라벨).

## 버전
V7.98-04 (src/utils.js, sw.js, public/sw.js 동기화)
