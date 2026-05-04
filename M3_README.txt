═══════════════════════════════════════════════════════════════════
  GREENMARINE TALLY — M3.5.5 (2026-05-05)
  엠티 실 작업 시스템 통합 + Gemini 2.5 Pro
  🌊 그린마린 검수팀 전용
═══════════════════════════════════════════════════════════════════

■ M3.5.5 신규 기능 (엠티 실 작업)

[1] 선박별 정책 사전
    하드코딩 3척:
    - TEN JUPITER (TNJP/LYTJ): 모든 엠티 실 확인 (verify)
    - RIZHAO ORIENT (RZOR):    모든 엠티 실 확인 (verify)
    - ATLANTIC PIONEER (ATRP/ATPR): 위해(CNWEH/CNWEI)행 엠티 실 부착 (attach)
    
    선박명 변형 표기 자동 처리 (ATPR/ATRP, LYTJ/TNJP)
    POD 코드 변형 자동 처리 (CNWEI/CNWEH)

[2] 자동 매칭 + 새 선박 등록
    EDI 업로드 → 정책 자동 적용
    처음 보는 선박 → ShipPolicyModal 자동 등장
    검수원이 선택 → Firebase 영구 저장 → 다음부터 자동

[3] 엠티 실 입력 UI (ContainerDetailModal)
    🔧 attach 모드 (ATRP):
       - 빨강 강조 + 점멸 (미부착 시)
       - 실번호 입력 → 저장
    
    🔍 verify 모드 (TNJP/RZOR):
       - 시안색 강조
       - 엠티실번호 입력 (원래 부착된 실)
       - 수정 시 라디오 버튼:
         * 🔄 리씰 (손상 등으로 재부착) → reseal 필드
         * ⚠️ 틀린실 (예상과 다른 번호 발견) → eseal_wrong 필드
       - 3개 컬럼 모두 표시 (기존/틀린실/리씰)

[4] 항차 페이지 정책 배너
    엠티 실 작업 모드 진입 시 상단에 큰 배너:
    - 모드 (부착/확인) + 정책 라벨
    - 진행 카운트 (35/50)
    - 엑셀 다운로드 버튼

[5] 자동 진단 + 음성 (diagnostics.js)
    "ATRP 위해행 엠티 50대 중 5대 미부착. 작업 필요"
    누락 컨번호 클릭 → 모달 즉시 열림

[6] 수석 대시보드 실시간 부착 현황 ★ 핵심
    모든 활성 항차 중 정책 매칭되는 것 자동 표시
    실시간 표:
    ┌────┬──────────────┬──────────┬──────┬────┐
    │ No │ 컨번호       │ 엠티실   │ 검수자 │ 시각│
    ├────┼──────────────┼──────────┼──────┼────┤
    │  1 │ BEAU4211950  │ ABC1234  │ 성일  │14:23│
    │  2 │ BMOU5404178  │ ABC1235  │ 성일  │14:25│
    │  3 │ BMOU5909787  │ ⏳ 대기  │  -   │  - │
    └────┴──────────────┴──────────┴──────┴────┘
    Firebase 실시간 구독 → 부착할 때마다 자동 갱신

[7] 엑셀 보고서 (사용자 형식)
    상단: 선박이름 / 항차수 / 선적일자 / 총 대수
    
    attach 모드 (ATRP):
      순번 | 컨번호 | 규격 | E | 엠티실번호 | 검수자 | 시각
    
    verify 모드 (TNJP/RZOR):
      순번 | 컨번호 | 규격 | E | 엠티실번호 | 틀린실 | 리씰 | 검수자 | 시각

■ 검증 데이터 (실제 EDI/엑셀)

  ATRP 2621W (BAPLIE + Excel):
    - 평택 선적 474대 (Full 23 / Empty 451)
    - 위해행 엠티: 50대 (정책 적용 대상) ✅
    - 대련행 엠티: 401대 (일반 검수, 정책 X) ✅
    - 컨번호: 엑셀에서 자동 매칭 (BEAU4211950 등)
    - 실번호: 빈칸 (현장 부착 후 입력)

  TNJP 25333W (ASC):
    - 평택 선적 275대 (Full 62 / Empty 213)
    - 엠티 213대 모두 LYG행 (정책 적용 대상) ✅
    - 컨번호: ASC에 모두 있음
    - 실번호: 검수원이 현장 확인/리씰

■ 보강 사항 (이전 채팅 미해결)

[A] 규격(ISO) 수정 화면 반영 ✅
    fbUpdateRecordField → records + ediContainers 둘 다 업데이트
    모든 진단 경고에서 수정한 것 즉시 반영

[B] 리퍼 온도 수정 UI ✅
    -25/-18/-15/0/4 빠른 선택 + 자유 입력
    빈칸 = 미입력 처리 자동

[C] Gemini 2.5 Pro 업그레이드 ✅
    자연어 답변 + 사진 OCR 둘 다
    무료 한도 충분

■ 변경 파일

  src/utils.js                          → APP_VERSION='M3.5.5', parseAscFile 빈 컨번호 허용
  src/firebase.js                       → fbSetEmptySeal (eseal/eseal_wrong/reseal)
  src/diagnostics.js                    → 엠티 실 누락 검사 + 음성
  src/shipPolicies.js                   → ★ 신규 (정책 사전 + 매칭 + Firebase)
  src/components/ShipPolicyModal.jsx    → ★ 신규 (새 선박 등록)
  src/components/EmptySealReport.jsx    → ★ 신규 (엑셀 보고서)
  src/components/ContainerDetailModal.jsx → 엠티 실 입력 UI (attach/verify)
  src/components/DiagnosticsPanel.jsx   → 엠티 실 경고 + 컨번호 클릭
  src/pages/VoyagePage.jsx              → 정책 자동 적용 + 배너
  src/pages/ChiefDashboard.jsx          → ★ 실시간 부착 현황

■ 누적 이력

  M3.5.5 ★ 엠티 실 작업 시스템 + 실시간 모니터링
  M3.5.4-fix3   규격/온도 수정 + Gemini 2.5 Pro
  M3.5.4-fix2   ISO 수정 UI + 중복 처리 + EDI 진실 원칙
  M3.5.4-fix1   양하 검정 에러
  M3.5.4         자동 진단 + 음성 경고 + 리퍼 강조
  M3.5.3         믹서 제거 + Firebase 청크 + 모든 형식
  M3.5           믹서 (롤백)
  M3.4           EDI 핫픽스 + 오답 신고

═══════════════════════════════════════════════════════════════════
