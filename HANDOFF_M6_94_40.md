# Tallyman Master M6.94.40 — 콘앱 카고플랜: 검수앱 베이사전 연동 (방법 A)

## 버전
- M6.94.39 → M6.94.40 (utils.js + sw.js + public/sw.js).

## 문제
- 콘앱 카고플랜이 검수앱과 다르게 나옴. 원인: 콘앱은 좌표만으로 골격을 역산했는데,
  검수앱은 베이사전(매트릭스 빌더 등록본)의 baysSummary(tier별 deckCells/holdCells)로 그림.
  → 베이사전 있는 배는 골격(칸 수·통로·빈칸)이 달라짐.

## 해결 (방법 A)
- 콘앱이 Firebase ship_bay_dict_v3를 함께 읽어, 검수앱과 동일 매칭(code/imo/name/callsign).
- 매칭되면 그 baysSummary + 검수앱 buildEmptyBayRenderData 정확 포팅(buildBayRenderDataFromSummary)으로
  렌더 → 검수앱과 픽셀 단위로 동일한 골격.
- 미등록 배는 기존 좌표 역산으로 폴백. 화면에 출처 표시("검수앱 베이사전 기준" / "좌표 자동 골격").

## 검증
- 검수앱 buildEmptyBayRenderData ↔ 콘앱 buildBayRenderDataFromSummary 결과 완전 일치
  (nDeckCols, tier별 활성칸 수, row 라벨 — 동일 baysSummary 입력 시).
- APP_VERSION(M6.94.40) 빌드 JS에 박힘. 루트 index.html 빌드본. cone.html 베이사전 연동 포함.

## 폰 표시 (M6.94.39 유지)
- 원본 크기 + 가로 스크롤 + 핀치 줌(카고플랜 볼 때만). 가로로 돌리면 한눈에.

## 배포
- ZIP을 저장소 루트에 덮어쓰고 commit & push. 검수앱+콘앱 동시 배포.
- 콘앱 항차 목록·베이사전 읽기는 Firebase read 권한(voyages, ship_bay_dict_v3) 필요.

## 변경 파일
- src/utils.js, sw.js, public/sw.js (버전)
- public/cone.html, 루트 cone.html (베이사전 연동 + buildBayRenderDataFromSummary)
- (유지) src/shipStructure.js, src/components/BayPlan.jsx (M6.94.37)
