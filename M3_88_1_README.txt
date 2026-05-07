M3.88.1 변경 사항 (2026-05-08 새벽 hotfix)
============================================

[1] 카드/리스트/상세모달: 엠티 + 의심 sl 무시
  - 상황: 선적 모드 PHRU8705374 등이 sl="1" 표시됨
  - 진단: 선적 EDI(BAPLIE) 시뮬상 sl="" (빈값) 정상
    → Firebase records에 저장된 옛 데이터의 sl="1"/"EAS"가 머지됨
    → 추정: 이전 LIST 양식에서 sl 컬럼 잘못 매핑되어 저장
    → TJM 컨 모두 sl="1" (BL 번호 1을 잘못 매핑)
    → EAS 컨 sl="EAS" (Operator를 잘못 매핑)
  - 표시 fix: c.fe='E' && c.sl.length < 5 → sl 무시하고 "📦 엠티" 표시
  - 적용 컴포넌트:
    a) BigResultCard.jsx (검색 결과 거대 카드)
    b) ContainerList.jsx (리스트 항목 "실: 1" 표시)
    c) ContainerDetailModal.jsx (상세 모달 "엠티 (실번호 없음)" 표시)
  - 부가: 짧은 sl이 있으면 작게 "(데이터 sl='1' 무시 - 의심값)" 표시
    → 사용자가 어느 컨에 잘못 데이터가 들어있는지 알 수 있음

진짜 원인은 Firebase에 저장된 옛 records 데이터.
사용자 결정 사항 (다음 세션):
  A. 표시 fix만 (현재) - 데이터는 그대로
  B. Firebase의 잘못된 sl 일괄 정리 함수 추가

빌드: 793.97 KB / gzip 216.51 KB
