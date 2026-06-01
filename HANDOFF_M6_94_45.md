# Tallyman Master M6.94.45 — 콘앱 베이플랜 검수앱화(컨테이너 박스) + 해치 0 수정

## 버전
M6.94.36 → M6.94.45 (utils.js + sw.js + public/sw.js).

## 변경 1 — 콘앱 베이플랜 (cone.html), 검수앱 베이플랜과 동일하게
- 점(○●) → **컨테이너 박스 셀** (검수앱 셀 모양):
  - 박스 내용: POL/POD★(평택분 별표), 컨번호, "size+F/E" 또는 특수화물 라벨/온도.
  - 색 구분: 양하 평택(파랑 ptk-d), 선적 평택(초록 ptk-l), 통과/타항(흐림 oth),
    리퍼(청록 sp-rf+온도), DG(빨강 sp-dg ⚠), FR(보라 sp-fr ▭), TK(주황 sp-tk ▣), OT/OOG(자홍 sp-ot △).
  - row 라벨(상단), tier 라벨(좌측), 빈 슬롯 점선, 갑판/선창 구분.
  - **양하(좌)·선적(우) 좌우 분할** 유지 — 같은 베이 나란히 비교. 각 패널 가로 스크롤.
- parseEDI 확장: cn(컨번호)·fe·온도(TMP)·iso·특수타입(reefer/dg/fr/ot) 추출.
- fbFetchEdiContainers 확장: 검수앱 ediContainers의 cn/iso/fe/op/wt/temp/rf/dg/fr/tk/oog/pol/pod 전부 로드.
  → 기존 항차 재업로드 불필요(검수앱이 저장한 데이터 그대로 사용).
- 카고플랜 기능 완전 제거(골격 어긋남 문제로 포기). 콘 계산 함수(runCalc 등) 보존 확인.

## 변경 2 — 검수앱 해치커버 버그 3건 (매트릭스 빌더)
- (a) 저장한 해치 수가 다시 열면 1로 초기화 → bayDictEntryToMatrix에 hatchCount 복원.
- (b) 해치 개수 **0 옵션 추가**(상시 개방).
- (c) **홀드 없는 베이 자동 0**. 0이 `||1`에 안 죽게 typeof 체크.
- 파일: src/shipMatrixBuilder.js, components/ShipMatrixBuilderModal.jsx, cargoPlanCore.js, components/PrintableCargoPlanV2.jsx

## 검증 (시뮬레이션)
- 콘앱 문법 OK, 실제 브라우저 초기화 오류 없음(runCalc 보존 확인).
- 베이뷰 8케이스 PASS: 20ft섞임/특수5종/00row/양하만/선적만/빈데이터/hold만/타항통과 — 크래시 0.
- 검수앱 BAY01 26대 재현 → 검수앱 이미지와 동일 배치/색/내용 확인(캡처).
- 특수화물 5종 색 구분 확인(캡처). 폰 폭 양하+선적 좌우 표시 확인(캡처).
- 해치: 저장→복원 왕복 보존(2,3), 홀드없음 자동0, 해치0 보존 — PASS.
- 빌드: APP_VERSION 박힘, 루트 index 빌드본, cone 루트=public 동일, 재현 빌드 0에러.

## 배포
ZIP을 저장소 루트에 덮어쓰고 commit & push. 검수앱+콘앱 동시 갱신.

## 남은 점 / 확인 필요 (실폰)
- 박스가 정보 다 담느라 폰에서 가로 스크롤됨(검수앱도 동일). 각 패널 독립 스크롤.
- EDI의 fe(Full/Empty)·온도는 파일 형식 따라 누락 가능 — 실데이터 확인 권장.
- 평택분 판정은 pod/pol의 PTK/PYT/PYOTM 기준 + 빈값 관대 처리.
