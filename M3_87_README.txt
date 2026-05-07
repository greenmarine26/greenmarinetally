M3.87 변경 사항 (2026-05-07 저녁 - 선적 위치 수정 + 베이플랜 완전 표시)
======================================================================

[A] 베이플랜 완전 표시 (사용자 강조 원칙)
  원칙: "베이는 풀로 차있다고 생각하고 다 보여줘야 함"
        "비었다고 티어도 지우고 달랑 한 줄만 보여주거나 베이를 누락시키면 안 됨"

  - 원인: BayPage 내부에서 그 페이지의 컨테이너만 보고 tier 추출
    → 베이에 컨이 1대만 있으면 tier 1개 → 한 줄만 그려짐
  - 수정: BayPlan top-level에 globalTiers (선박 전체 tier 풀) 계산
    BayPage에 prop으로 전달, allTiers를 globalTiers 기반으로 변경
  - 검증 (TIAN HAI PING ZE V-2012E):
    globalTiers = [02, 04, 06, 08, 82, 84, 86, 88] = 8개
    베이 1번 (이전 2줄) → 8줄 모두 그려짐 ✓
    베이 19번 (이전 2줄) → 8줄
    베이 25번 (이전 2줄) → 8줄
    빈 슬롯도 dashed border로 표시

[B] 선적 위치 수정 신규 기능 (사용자 4번 요청)
  사용자 시나리오:
    - 14-00-02에 SKHU6828989 지정인데 다른 컨이 들어가야 할 때
    - 컨번호 조회 → 위치 지정 → 선적 버튼 → 베이에 새 컨 표시
    - 원래 컨은 베이플랜에서 빠지고 선적대상으로 분류

  구현:
  1) src/firebase.js → fbReassignContainerPosition 함수 신규
     - bay/row/tier 동시 업데이트 (records + ediContainers 양쪽)
     - 충돌 검사: 같은 자리 다른 컨 있으면 그 컨 미배정 처리 + 완료 취소
     - 이력 추적 (edits.bay/row/tier)

  2) src/components/PositionEditModal.jsx 신규
     - bay/row/tier 직접 입력 (또는 모두 비우면 미배정)
     - 충돌 검사 표시 ("이미 배정된 자리. X 컨이 거기 있음")
     - 풀 컨테이너: 빨강 배경 + 큰 경고 + 깜빡 강조
     - 엠티 컨테이너: 일반 확인
     - 이미 선적 완료된 컨: "이미 선적 완료. 변경?" 모달

  3) src/components/UnassignedListModal.jsx 신규
     - 베이플랜에서 빠진(bay 없는) 컨테이너 목록
     - 각 컨에 풀/엠티 표시 + "위치 지정" 버튼

  4) src/components/BigResultCard.jsx 수정
     - 선적 모드일 때 "위치 수정 / 다른 자리에 배정" 버튼 추가
     - 검수 완료 버튼은 그대로

  5) src/components/ContainerDetailModal.jsx 수정
     - 선적 모드일 때 위치 옆에 "위치 수정" 버튼 추가
     - 미배정 컨이면 "선적대상" 배지 표시

  6) src/components/BayPlan.jsx 수정
     - 컨트롤 바에 "🚛 선적대상 N대" 배지 (선적 모드만)
     - 누르면 UnassignedListModal 열림 → 컨 클릭 → ContainerDetailModal → 위치 지정

  7) src/App.jsx, src/pages/VoyagePage.jsx 수정
     - ContainerDetailModal에 allContainers prop 전달 (충돌 검사용)

흐름 정리:
  케이스 A (같은 컨 위치만 옮김):
    검색 → 결과 카드 → "위치 수정" → 새 위치 → 풀이면 강조 확인 → 저장

  케이스 B (다른 컨이 그 자리에 들어가야):
    새 컨 검색 → 결과 카드 → "위치 수정" → 14-00-02 입력
    → "이미 SKHU6828989 있음. 그 컨 미배정 처리?" 확인
    → 저장 시: 새 컨 → 14-00-02, SKHU6828989 → 미배정(선적대상)

  케이스 C (미배정 컨 다시 배정):
    베이플랜 → "선적대상 N대" 배지 → 목록 모달 → 컨 선택
    → ContainerDetailModal → "위치 수정" → 새 위치 입력 → 저장

빌드: 793.52 KB / gzip 216.45 KB
