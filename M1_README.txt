==================================================
  Tallyman Master V1 (M1) — 2026.05.03
  greenmarinetally
==================================================

【프로젝트 개요】
  3개 앱 (양하/선적/수석) → 1개 통합 마스터
  단일 PWA · 단일 GitHub repo · 새 Firebase 프로젝트
  다크 테마 고정 (야간 작업용)

【구조 변경 핵심】
  V37: tallyman-discharge / tallyman-loading / tallyman-chief (3개 분리)
  M1 : greenmarinetally (통합) — 항차 안에 [양하][선적] 탭

  1 항차 = 양하 + 선적 동시 가능
  데이터: voyages/{key}/discharge/  +  voyages/{key}/loading/
  → 같은 컨번호여도 모드별 검수 완료가 따로 저장 (충돌 0)

【Firebase 정보】
  프로젝트: greenmarinetally
  Realtime DB: asia-southeast1 (Singapore)
  databaseURL: https://greenmarinetally-default-rtdb.asia-southeast1.firebasedatabase.app

【포함 기능】
  ✅ EDI BAPLIE / ASC 파서 (V38 강화 버전)
  ✅ Excel 9개 양식 호환 (V38 검증)
  ✅ 시트 ref 자동 보정 (V38 핵심 수정)
  ✅ 컨번호 끝 4자리 검색 + 음성 한 글자씩
  ✅ 검수 완료 / 취소 (시간 제한 없음)
  ✅ 5명 검수원 실시간 동기화
  ✅ 베이별 진행도 표시
  ✅ EDI ↔ 리스트 검증 + 선사별 누락 표시
  ✅ CSV 내보내기 (결재용)
  ✅ X-RAY 처리 (양하 전용)
  ✅ PWA (홈 화면 설치, 다크)
  ✅ M1 우측 상단 뱃지

【배포】
  GitHub: greenmarine26/greenmarinetally
  사이트: https://greenmarine26.github.io/greenmarinetally/
  자동 빌드: GitHub Actions (push 시 자동)

【사용 흐름】
  1. 사이트 접속 → 검수원 이름 선택 (5명 등록 가능)
  2. 홈 → [+ 양하] 또는 [+ 선적] 버튼 → 선박명·항차 입력
  3. 항차 카드 클릭 → 자료 탭에서 EDI/엑셀 업로드
  4. 양하리스트 탭 → 컨테이너 검수 (✓ 완료 버튼)
  5. 검색 탭 → 4자리 입력 → 자동 음성 출력
  6. 베이플랜 탭 → 베이별 진행도 시각화
  7. CSV 버튼 → 결재용 보고서 다운로드

【기술 스택】
  React 18 + Vite 6 + Tailwind 3
  Firebase Realtime Database 11
  Lucide React 아이콘
  SheetJS (CDN, 자동 로드)

【다음 버전 계획 (M2)】
  - 사진 첨부 (Firebase Storage)
  - 검수원별 일일 통계
  - 음성 명령 ("리퍼 몇 대?")
  - PWA 자동 업데이트 알림
