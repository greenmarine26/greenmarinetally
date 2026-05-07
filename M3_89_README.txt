M3.89 변경 사항 (2026-05-08 새벽 - 베이플랜 근본 fix)
========================================================

사용자 비판: "EDI 받아서 임시방편으로 해결한 거냐, 매번 EDI 줄까?"
→ 정당. 매번 patch 대신 어떤 EDI가 와도 대응하는 근본 구조 변경

== 진짜 구조 문제 ==

이전 흐름:
  EDI(전체 N대)
    → VoyagePage isPtk(c) 필터 → containers (평택만 M대, M < N)
    → BayPlan에 containers만 전달
    → 평택 화물 0대 베이 = 페이지에 추가 안 됨 → 베이 누락

베이플랜은 "선박 적부도"여야지 "내 작업 컨만 보는 화면"이 아님.
M3.86.1, M3.87 fix는 이 구조 그대로 두고 표면만 patch.
다른 EDI 오면 다시 누락.

== 근본 fix ==

VoyagePage에 두 가지 useMemo:
  containers (평택만)        - 검색/검수/통계용
  allEdiContainers (전체)    - 베이플랜용 (NEW)

BayPlan은 allEdiContainers를 받아서 모든 컨 표시:
  - 평택 화물: cellColor에서 노랑 ring 강조 (이미 있음)
  - 다른 항구 화물: 회색/POL색 (이미 있음)

결과:
  - 어떤 EDI가 와도 베이 누락 X
  - 평택 양하/선적은 자동으로 강조
  - 다른 컴포넌트(검색/통계) 영향 X (containers 그대로)

== 보호 로직 ==

allEdiContainers 머지 시 List가 EDI 핵심 필드 안 덮음:
  - EDI에 매칭된 컨 → sl, sl_orig, wt(EDI=0일 때)만 보강
  - bay/row/tier/iso/fe/pol/pod 등 핵심 필드는 EDI 절대 우선
  - List만 있는 컨 (EDI에 없음) → 그대로 포함 (참고용)

빌드: 794.31 KB / gzip 216.59 KB
