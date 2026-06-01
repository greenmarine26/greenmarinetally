# Tallyman Master M6.94.41 — 콘앱: 기존 데이터 즉시 표시 + 셀 표시 수정

## 버전
- M6.94.40 → M6.94.41 (utils.js + sw.js + public/sw.js).

## 변경 (콘앱 cone.html)
1. **기존 항차 재업로드 불필요**: 콘앱이 raw EDI 대신 이미 저장된 ediContainers(좌표)를 직접 읽음.
   - 항차 판정: raw.edi 또는 ediContainers 둘 중 하나라도 있으면 목록에 포함.
   - 데이터: ediContainers 우선(검수앱과 동일 데이터) → 없으면 raw EDI/ASC 파싱 폴백.
   - 효과: M5.11 이전 업로드분 등 raw 없는 기존 항차도 카고플랜·콘계산 바로 가능.
2. **카고플랜 셀 안 보임 수정**: 베이사전에 deckCells/holdCells 없을 때(흔함)
   활성 셀이 0개라 박스만 나오고 격자 비던 문제 → cells 없거나 0이면 tier 폭만큼 가득 채움(폴백).
3. (유지) 베이사전(ship_bay_dict_v3) 매칭 시 검수앱과 동일 골격, 없으면 좌표 역산.
4. (유지) 폰: 가로 스크롤 + 핀치 줌. EDI/ASC 자동 판별.

## 검증
- ediContainers만 있는(raw 없는) 항차 → 목록 잡힘, 카고플랜 셀 정상 렌더 확인.
- 좌표 역산/베이사전 양쪽 모두 셀 그려짐(캡처 확인).
- APP_VERSION(M6.94.41) 빌드 JS에 박힘. 루트 index.html 빌드본.

## 배포
- ZIP을 저장소 루트에 덮어쓰고 commit & push. 검수앱+콘앱 동시.
- Firebase read 권한 필요: voyages(ediContainers 포함), ship_bay_dict_v3.

## 변경 파일
- src/utils.js, sw.js, public/sw.js (버전)
- public/cone.html, 루트 cone.html
- (유지) src/shipStructure.js, src/components/BayPlan.jsx
