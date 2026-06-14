# Tallyman Master V7.98-10 인계서

## 이번 변경 (V7.98-10) — 베이상세 격자를 카고플랜과 완전 동일 함수로 (rowMax 사전 폴백 해결)
**문제**: ATRP 등 rowMax 사전(deckCells/holdCells 없고 rowMaxEven/Odd만 있는 사전)이 베이상세 편집·인쇄에서 STD_ROWS 폴백으로 깨졌음. cells만 보는 buildEmptyBayRenderData를 써서 rowMax 사전을 못 그림.

**핵심 통찰 (사용자 지적)**: ATRP는 이미 "매트릭스 확정" 등록됨(source:user, verified). cells가 없어도 rowMaxEven=8/rowMaxOdd=7로 매트릭스가 지정돼 있고, 카고플랜이 쓰는 computeBayRenderData가 이미 그걸 읽음. 새로 만들 게 아니라 같은 함수를 쓰면 됨.

**수정**:
- cargoPlanCore.js: `buildBayGridForDetail(shipBayDef, shipCode, bayKey)` 추가. dictData에서 matrixBays/pdfBays 구성 → computeBayRenderData 호출(빈 posMap, 컨은 호출측 cellMap 주입). cells 사전·rowMax 사전 모두 처리.
- ChiefBayEdit.jsx: matrixRender를 buildBayGridForDetail로. hasCells 분기 제거(rowMax 사전도 그림).
- PrintableBayDetail.jsx: matrixRender를 buildBayGridForDetail로. BayDetailPage에 shipBayDef/shipCode props 추가, 본체에서 dictData.bayDef/code 전달.
- buildEmptyBayRenderData import 제거(orphan 정리).

**결과**: 카고플랜·베이상세 편집·베이상세 인쇄가 모두 computeBayRenderData(via buildBayGridForDetail) 사용 → 그림 100% 일치. rowMax 사전(ATRP)·cells 사전(MCSN) 모두 정상.

**검증 (시각 PNG PASS)**:
- ATRP bay01/(02)03 (rowMax): deck 8칸/hold 7칸 전부 active — 카고플랜과 동일. (이전 폴백 깨짐 해결)
- MCSN bay01/bay09 (cells): cells대로 피라미드.
- 빈 active 칸도 선 유지("빈자리도 자리"). 0.5칸 정렬 % padding 자동.

## 일원화 완료 (V7.98-07~10)
- 격자: BayBoxV2 단일 컴포넌트(카고플랜/편집/인쇄 공유). 셀 내용만 renderCellContent 주입.
- 격자 데이터: buildBayGridForDetail→computeBayRenderData 단일 함수.
- BayBoxV2 래퍼는 명시적 height+flex 필수(셀 flex:1 1 0 높이 상속). 편집=72vh, 인쇄=204mm.

## 핵심 원칙 (REF 승격 후보)
- 베이상세 격자는 카고플랜과 같은 함수(computeBayRenderData)로 그린다. cells 사전·rowMax 사전 모두 자동. cells만 보는 buildEmptyBayRenderData는 rowMax 사전을 폴백시키므로 베이상세에 쓰지 말 것.
- ATRP류 PDF 자동본도 rowMaxEven/Odd로 매트릭스가 지정돼 있으면 정상 렌더됨. cells 유무로 판단 금지.
- BayBoxV2 단일 컴포넌트 + 명시적 height 필수. "빈자리도 자리"(active 빈칸 선 유지).

## 다음 세션 (미해결)
1. 끝자리 4자리 조회를 베이상세/3D 하이라이트.
2. rowMax도 cells도 없는 사전(있다면)만 STD_ROWS 폴백 — 해당 선박 확인되면 매트릭스 보강.

## 버전
V7.98-10 (src/utils.js, sw.js, public/sw.js 동기화)
