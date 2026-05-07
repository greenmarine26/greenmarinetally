M3.86.1 변경 사항 (2026-05-07 현장 작업 후 hotfix)
================================================

현장 검증 후 5개 이슈 중 4개 처리 (1, 2, 3, 5번)

[1] EDI 분석 1번 베이 누락 (TIAN HAI PING ZE V-2012E)
  - 원인: BayPlan.jsx 페이지 구성 루프가 n=2부터 시작
    → 1번 베이는 페이지에 절대 추가 안 됨
  - 진단: parseBAPLIE는 1번 베이 4대 정확히 추출 (DWSU2400257,
    DWSU3000548, EAXU2018339, WFHU1408470). 표시 단계 버그.
  - 수정: BayPlan.jsx 119라인 for (let n = 2; ...) → for (let n = 1; ...)
  - 결과: 1번 베이가 "BAY 01 (20ft)" 단독 페이지로 추가됨

[2] 트윈 짝꿍 매칭 실패 (SLSU2042639 ↔ DWSU2405238)
  - 증상: 위창에 SLSU2042639 잡히는데 짝꿍 못 찾는다는 메시지
  - 원인: twin.js 매칭 시 c.bay === pairBayStr 비교
    pairBayStr는 정수 String("25"), c.bay는 zero-padded("025")일 수 있음
    → "025" === "25" → false → 매칭 실패
  - 수정: twin.js의 buildBayPairs/findTwinCandidate/findStackMates
    모두 c.bay를 parseInt 후 비교 (Firebase 옛 데이터 호환)
  - 검증 (3 케이스 모두 통과):
    A) 정수 "23"+"25" → 매칭 ✓
    B) zero-padded "023"+"025" → 매칭 ✓
    C) 섞임 "23"+"025" → 매칭 ✓

[3] 앱 자주 나가짐 (화면 내리다 리프레쉬)
  - 원인: 모바일 브라우저의 Pull-to-Refresh 동작
  - 수정: src/index.css에 overscroll-behavior-y: contain 한 줄 추가
  - 결과: 화면 위로 당기거나 스크롤 끝에서 더 당겨도 새로고침 트리거 안 됨

[4] 틀린 컨테이너 선적 시 위치 수정
  - 보류 (사용자 지시: 선적 방법 자체를 한 번도 상의한 적 없으니
    심도 있게 따로 상의해야 함)

[5] 카드 컨번호/실번호 글자 크게
  - BigResultCard.jsx 수정
  - 컨번호 줄을 별도로 분리:
    - 끝4자리: text-base → text-3xl
    - 컨번호 전체: text-[11px] → text-lg sm:text-xl
  - 실번호 거대(text-4xl/5xl)는 기존 그대로

빌드: 779.76 KB / gzip 213.01 KB
