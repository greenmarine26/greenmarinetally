# Tallyman Master V7.98-10 인계서

## 이번 변경 (V7.98-10) — 인쇄 베이상세 백지/페이지 미분리 버그 수정 (M7.989 회귀)
**증상**: 베이상세 인쇄 미리보기가 헛돌고(백지), 페이지 구분이 안 됨(여러 베이가 1페이지로 뭉개짐).

**원인 (데이터 확정 — print-to-pdf A/B로 검증)**:
1. **(주원인) CARGO_V2_CSS 인쇄 격리 누수.** M7.989가 PrintableBayDetail에 `import {BayBoxV2, CARGO_V2_CSS}` + `<style>{CARGO_V2_CSS}</style>`를 추가. CARGO_V2_CSS의 @media print에 `body > *:not(.cpv2-overlay){display:none}`(카고플랜 격리)가 있는데, 카고플랜 모달은 body로 portal돼 `.cpv2-overlay`가 body 직속이라 살아남지만, **PrintableBayDetail 모달(.bd-print-modal)은 portal 없이 #root 안에 렌더** → `body>*`=#root가 display:none → 베이상세 인쇄 통째 백지(1페이지). 화면엔 무영향(@media print만).
2. **(부차) bd-cargo-wrap 이중 페이지.** bd-cargo-wrap이 `height:204mm; page-break-after:always`인 풀페이지 블록인데 `bd-page`(204mm+page-break) 안에 들어가 제목+헤더와 겹쳐 넘침 + 이중 페이지브레이크.

**검증**: M7.989 직전 PrintableBayDetail은 print-to-pdf 5페이지 정상. M7.989는 1페이지 백지. 수정 후 다시 **5페이지·내용 가득·베이별 분리**(pdftoppm 이미지 PASS).

**수정 (3곳, 최소 수술)**:
- `src/components/PrintableCargoPlanV2.jsx`(135행): `body>*:not(.cpv2-overlay)` → `body>*:not(.cpv2-overlay):not(.bd-print-modal)`. 카고플랜 인쇄엔 무영향(인쇄 시 .bd-print-modal 부재).
- `src/components/PrintableBayDetail.jsx`: 메인 모달을 **createPortal(…, document.body)**로 portal(카고플랜과 동일 패턴) → .bd-print-modal이 body 직속 → 격리 규칙 통과.
- `src/components/PrintableBayDetail.jsx`(bd-cargo-wrap CSS): 고정 `width:291mm;height:204mm;page-break-after:always` 제거 → `width:100%; flex:1 1 0; min-height:0` (bd-page 안에서 채움). `.bd-cargo-wrap .cpv2-bay-section{flex:1 1 0;min-height:0}` 보강(높이 체인).

## 일원화 상태 (V7.98-07/08/10)
카고플랜·베이상세 편집·베이상세 인쇄 모두 BayBoxV2 단일 컴포넌트. 그림은 BayBoxV2, 셀 내용만 주입(카고=마크, 편집=컨번호, 인쇄=5줄).
- **중요**: BayBoxV2 래퍼는 display:flex;flex-direction:column + 높이 확보 필요(셀이 flex:1 1 0 높이 상속). 화면 모달=vh, 인쇄=부모 bd-page(204mm) 안에서 flex:1로 채움(고정 height 금지 — 넘침 유발).
- **중요**: 인쇄용 전체화면 모달은 body로 portal해야 CARGO_V2_CSS 인쇄 격리(body>* display:none)를 통과한다.

## 누적 이력 (V7.95~)
- V7.98-10: 인쇄 베이상세 백지/페이지 미분리 수정(M7.989 회귀).
- V7.98-09: 편집 베이상세 격자 찌부러짐 수정(cbe-cargo-wrap height:72vh).
- V7.98-08: 인쇄 베이상세 BayBoxV2 통일.
- V7.98-07: 편집 베이상세 BayBoxV2 통일 + renderCellContent prop.

## 다음 세션 (미해결)
1. 끝자리 4자리 조회를 베이상세/3D 하이라이트.
2. cells 없는 PDF 자동본(ATRP) 매트릭스 확보.
3. 앱 내 신규 선박 입력 + PDF 자동 파싱.

## 버전
V7.98-10 (src/utils.js, sw.js, public/sw.js, public/cone.html 동기화 — build.sh 자동)
