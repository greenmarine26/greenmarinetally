# Tallyman Master M6.94.43 — 콘앱 카고플랜 컨테이너 빈칸 누락 수정

## 버전
M6.94.42 → M6.94.43.

## 변경 (콘앱 cone.html)
- 카고플랜 컨테이너 표시에서 일부가 빈 칸으로 빠지던 문제 수정:
  1) 페어 베이 "(EE)OO"의 격자를 홀수 베이만으로 그려서 짝수 베이(EE)의 넓은 row가 누락 →
     baysSummaryToMatrixBays가 페어면 짝수+홀수 베이 row를 합산(_deckRows/_holdRows).
  2) getRowPositions의 균등 분배가 비대칭 row(짝수 max≠홀수 max)에서 바깥 row 누락 →
     buildBayRenderData를 실제 컨테이너 row 집합으로 직접 라벨 생성(_rowLabelsFromSet).
     폭 추정 제거 → 모든 컨테이너가 칸을 가짐.
- 진단 배너 유지: 정상이면 초록("모두 표시됨"), 누락 있으면 주황 + 미매칭 좌표 표시.
- 좌표 키 순서는 bay|tier|row (posMap·조회 일관). 배너 라벨은 "베이|단|열".

## 검증
- 현실 데이터(홀수베이=홀수row, 짝수베이=짝수row, 00 포함) 28대 → 미매칭 0, 전부 표시.
- 페어 (08)09에서 짝수 row(08,06,04,02)와 홀수 row(01,03,05) 모두 채워짐(캡처 확인).
- APP_VERSION 빌드 JS 박힘, 루트 빌드본.

## 배포
ZIP을 저장소 루트에 덮어쓰고 commit & push.

## 남은 점
- 점(●/▪) 크기 작을 수 있음 — 실폰 확인 후 조정 가능.
- 홀수 베이에 짝수 row가 섞인 비표준 케이스는 미검증.
