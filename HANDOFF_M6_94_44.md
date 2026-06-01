# Tallyman Master M6.94.44 — 콘앱 베이플랜 좌우비교 + 해치 0 수정

## 버전
M6.94.36/43 → M6.94.44 (utils.js + sw.js + public/sw.js).

## 변경 1 — 콘앱 (cone.html)
- 카고플랜 기능 전부 제거 (반복된 골격 어긋남 문제로 포기).
- 베이플랜(베이 위치 보기)을 **양하(좌)·선적(우) 좌우 분할**로 — 같은 베이를 나란히 비교.
  - 폰에서 잘 보이던 점(●40/○20) 방식 유지, deck/hold 구분, 베이별 양하·선적 대수 표시.
  - tier/row 범위는 양하+선적 합집합 → 좌우 같은 위치 정렬되어 비교 쉬움.
  - ediContainers 직접 읽기 유지(기존 데이터 재업로드 불필요).

## 변경 2 — 검수앱 해치커버 버그 3건 (매트릭스 빌더)
- (a) 저장한 해치 수가 다시 열면 1로 초기화 → bayDictEntryToMatrix에 hatchCount 복원 추가.
- (b) 해치 개수에 **0 옵션 추가** (상시 개방 = 해치 없음).
- (c) **홀드 없는 베이는 자동 0** (저장·복원·미리보기 일관). 0 값이 `||1`에 죽지 않게 typeof 체크로 보존.
- 파일: src/shipMatrixBuilder.js, src/components/ShipMatrixBuilderModal.jsx, src/cargoPlanCore.js, src/components/PrintableCargoPlanV2.jsx

## 검증
- 해치: 저장→복원 왕복 보존(2,3 유지), 홀드없음 자동0, 해치0 보존 — 시뮬 PASS.
- 콘앱: 카고플랜 잔재 0, 좌우분할 렌더 OK(폰 캡처), 문법 OK.
- 빌드: APP_VERSION 박힘, 루트 index 빌드본, cone 루트=public 동일, 재현 빌드 0에러.

## 배포
ZIP을 저장소 루트에 덮어쓰고 commit & push. 검수앱+콘앱 동시.
