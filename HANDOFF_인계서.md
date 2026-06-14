# Tallyman Master V7.98-11 인계서

## 이번 변경 (V7.98-11) — 카고플랜 베이 페어 표시 버그 수정 (pairEven 비대칭)
**증상**: 카고플랜에서 "3 (4)5"로 표기돼야 할 페어가 "3 5"로 나옴(가운데 짝수 누락). 같은 선박인데 "7 (8)9"는 정상, 어떤 건 안 됨.

**원인 (데이터 확정 — 실 함수 시뮬로 재현)**:
- 매트릭스 빌더는 페어를 **홀수 베이 + `pairEven`(짝수번호)**로 저장하고 짝수 베이는 별도 엔트리를 안 만듦((04)05 = 홀수 05에 pairEven='04', 04 키 없음).
- `cargoPlanCore.js autoPairBays`는 트리오를 **짝수 베이의 별도 존재**(`byNum.has(e-1)&&byNum.has(e+1)`)로만 판단 → pairEven 무시.
- 짝수가 별도 엔트리(.def/v5)면 트리오 성립("7 (8)9"). pairEven으로만 묶이면 matrixBays에 짝수가 없어 트리오 붕괴 → 홀수 둘이 단독 → "3 5".
- 추가로 `PrintableCargoPlanV2` matrixBays 생성부가 `pairEven`을 안 가져옴(직렬화엔 존재).
- **핵심**: `detectMissingBays`는 M6.94.36에서 이미 pairEven 인식 보정을 받았는데 `autoPairBays`만 안 받은 비대칭. 경고 로직(detectMissingBays)은 정상 작동 확인.

**검증 (실 함수 node 시뮬, ALL PASS)**: 재현 — [3,5]는 단독 "03|05", [7,8,9]는 "07 (08)09"(비대칭 CONFIRMED). 수정 후 — pairEven 경로로 "03 (04)05" 형성, "07 (08)09" 불변, 단독 붕괴 해소, generatePdfBays/autoPageLayout 정상 소비, 레거시(순수 짝수-별도) 회귀 없음, 짝수 양방향 저장 시 중복 트리오 없음.

**수정 (2곳, 최소 수술)**:
- `src/cargoPlanCore.js` autoPairBays: 기존 짝수-별도 루프 뒤에 **pairEven 기반 페어 루프** 추가. 홀수 o의 pairEven=e면 반대편 홀수(e-1)와 트리오 [(e-1), (e)o] 형성. `usedEvens` 가드로 중복 방지, 반대편 홀수 없으면 기존 동작 보존.
- `src/components/PrintableCargoPlanV2.jsx` matrixBays map 반환부: `pairEven: summary?.pairEven || b.pairEven || null` 전파.

## 이전 변경 (V7.98-10) — 인쇄 베이상세 백지/페이지 미분리 버그 수정 (M7.989 회귀)
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
- V7.98-11: 카고플랜 베이 페어 "3 (4)5"→"3 5" 붕괴 수정(autoPairBays pairEven 비대칭).
- V7.98-10: 인쇄 베이상세 백지/페이지 미분리 수정(M7.989 회귀).
- V7.98-09: 편집 베이상세 격자 찌부러짐 수정(cbe-cargo-wrap height:72vh).
- V7.98-08: 인쇄 베이상세 BayBoxV2 통일.
- V7.98-07: 편집 베이상세 BayBoxV2 통일 + renderCellContent prop.

## 다음 세션 (미해결)
1. 끝자리 4자리 조회를 베이상세/3D 하이라이트.
2. cells 없는 PDF 자동본(ATRP) 매트릭스 확보.
3. 앱 내 신규 선박 입력 + PDF 자동 파싱.

## 버전
V7.98-11 (src/utils.js, sw.js, public/sw.js, public/cone.html 동기화 — build.sh 자동)
