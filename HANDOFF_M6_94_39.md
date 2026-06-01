# Tallyman Master M6.94.39 — 버전업 + 콘앱 카고플랜

## 버전
- M6.94.36 → M6.94.39 (utils.js APP_VERSION + sw.js + public/sw.js 3곳 동기).

## 이번 변경
1. (콘앱) cone.html에 **카고플랜 보기** 추가 — 검수앱 cargoPlanCore + PrintableCargoPlanV2 포팅.
   - CASPI 방식: 컨테이너 좌표 → baysSummary 역산 → 레이아웃 → 격자. 외부 베이사전 불필요.
   - 양하/선적 각각 별도 카고플랜. 검수앱과 동일 골격(표기 없는 빈 격자).
   - 폰: 원본 크기 유지 + 가로 스크롤 + 핀치 줌(카고플랜 볼 때만 viewport 줌 허용, 나갈 때 원복).
   - 인쇄: @media print에서 277mm 원본.
2. (콘앱) EDI/ASC 자동 판별 — ASC도 EDI 대체 (검수앱이 raw/edi에 ASC도 보관).
3. (검수앱) M6.94.37 베이사전 fix 유지 — 매트릭스 빌더 baysSummary 폴백.

## 배포 (ZIP을 저장소 루트에 덮어쓰고 commit & push)
- 루트에 빌드본 포함 (index.html 빌드본 + assets/ + cone.html). push만 하면 검수앱+콘앱 동시 배포.
- 검수앱: 폰 새로고침 → 자동 업데이트(sw.js VERSION 변경 감지).
- 콘앱: …/greenmarinetally/cone.html 링크. 한 번 열면 끝(웹페이지, 재설치 불필요).

## 검증
- APP_VERSION(M6.94.39) 빌드 JS에 박힘 / 루트 index.html 빌드본 / cone.html 루트=public 동일.
- 카고플랜: 콘앱 rowsToBaysSummary ↔ 검수앱 ascToBayDictEntry 골격 완전 일치.
- 폰 가로/세로 캡처로 글씨 가독성 확인.

## 변경 파일
- src/utils.js (APP_VERSION), sw.js, public/sw.js (VERSION)
- public/cone.html, 루트 cone.html (콘앱)
- (M6.94.37 유지) src/shipStructure.js, src/components/BayPlan.jsx
