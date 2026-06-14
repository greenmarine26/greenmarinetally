# Tallyman Master V7.98-12 인계서

## 베이스: 최신 GitHub(V7.98-10, 다른 Claude의 페이지 인쇄 해결본) 위에 작업.
다른 Claude가 해결한 페이지 처리(bd-page = width 291mm/height 204mm/page-break)는 그대로 유지. 건드리지 않음.

## 이번 변경 (V7.98-12) — 셀 크기 통일 + ATRP rowMax 사전 통일 + 내용 중앙정렬
**사용자 지시**: (1) 모든 베이 셀 크기 동일, (2) tier 높아 페이지 넘칠 때만 동적 축소, (3) 셀 안 내용 중앙정렬. (페이지 문제는 이미 다른 Claude가 해결.)

**수정 1 — ATRP rowMax 사전 통일**:
- cargoPlanCore.js: buildBayGridForDetail 추가(computeBayRenderData 래퍼). cells 사전·rowMax 사전 모두 처리.
- ChiefBayEdit.jsx / PrintableBayDetail.jsx: matrixRender를 buildEmptyBayRenderData(cells 전용, hasCells 분기) → buildBayGridForDetail로. ATRP(rowMaxEven=8/Odd=7) 등 PDF 자동본이 폴백 안 하고 카고플랜과 동일하게 그려짐.
- PrintableBayDetail BayDetailPage에 shipBayDef/shipCode props 추가(본체 dictData.bayDef/code 전달).

**수정 2 — 셀 고정 크기 + 동적 축소**:
- BayBoxV2에 fixedCell prop 추가 → cpv2-fixed-cell 클래스 + CSS변수(--cell-w/h). deck/hold 영역 flex:none, 셀/tier-row/라벨 고정 크기(23x12mm).
- PrintableBayDetail: bd-page(페이지)는 유지, bd-cargo-wrap 안에 scale 계산. (행수×12+헤더26)>190 또는 (칸수×23)>277이면 transform:scale로 그 페이지만 축소. bd-cargo-scaler.

**수정 3 — 내용 중앙정렬**: bd-cell-lines text-align:center + justify-content:center (기존 left 쏠림 해결).

**검증 (실제 BayBoxV2 컴포넌트 렌더 PASS, react alias 방식)**:
- ATRP bay01(rowMax): 카고플랜과 동일 격자(deck8/hold7), 고정 셀, 중앙정렬, scale 1.00.
- MCSN bay17(13행): scale 1.00.
- KMTC bay01(15행): scale 0.95 자동 축소, 한 페이지 안.

## 핵심 원칙 (REF 승격 후보)
- 베이상세 격자는 카고플랜과 같은 함수(buildBayGridForDetail→computeBayRenderData). cells/rowMax 사전 모두. buildEmptyBayRenderData(cells 전용)는 rowMax 사전(ATRP) 폴백시키므로 베이상세에 쓰지 말 것.
- 인쇄 베이상세: 셀 고정(23x12mm), 페이지 넘칠 때만 transform:scale. 내용 중앙정렬. bd-page 페이지 구조와 별개(셀만 고정).
- BayBoxV2 fixedCell prop: cpv2-fixed-cell로 flex 무력화+고정 크기.
- 검증 시 실제 컴포넌트 렌더는 gm3 react로 alias 강제 esbuild 번들(jsx-runtime 충돌 회피).

## 다음 세션 (미해결)
1. 끝자리 4자리 조회를 베이상세/3D 하이라이트.

## 버전
V7.98-12 (src/utils.js, sw.js, public/sw.js 동기화)
