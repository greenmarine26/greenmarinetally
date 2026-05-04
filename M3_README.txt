═══════════════════════════════════════════════════════════════════
  GREENMARINE TALLY — M3.4 (2026.05.04)
  EDI 선박 정보 파싱 핫픽스 + 답변 오답 신고 기능
  🌊 그린마린 검수팀 전용
═══════════════════════════════════════════════════════════════════

■ M3.4 변경 사항 (2건)

[1] 🐛 EDI 선박 정보 파싱 버그 수정 (핫픽스)

  증상:
    EDI 업로드해도 수석 대시보드 "선박 라이브러리"가 비어있음
    → 표준 IMO EDI도 마찬가지로 안 되고 있었음 (미발견)

  발견 경위:
    KSKM2608NCNXMNB.edi (SUNNY KALMIA) 분석 중 발견

  원인 — 버그 2건:
    [버그 1] extractShipInfo가 parts[7]을 봤음 (실제는 parts[8])
       TDT+20+VOY+++CARRIER:172:20+++IMO:146:11:NAME
            split('+'):
       [0]TDT [1]20 [2]VOY [3]'' [4]'' [5]CARRIER [6]'' [7]'' [8]IMO:...
                                                          ↑ 봄    ↑ 실제
       → 모든 EDI에서 IMO 추출 실패

    [버그 2] IMO 정규식 /^\d{7}$/ — 7자리 숫자만 허용
       Lloyd's Register 번호("3E8980" 등) 영숫자 거부

  수정:
    src/shipStructure.js extractShipInfo:
    ✓ parts[7] → 끝에서부터 비어있지 않은 part 자동 검색
    ✓ /^\d{7}$/ → /^[A-Z0-9]{5,9}$/i (영숫자 허용)
    ✓ 빈 토큰 안전 처리

  검증:
    ✓ 표준 7자리 ("9388417")  → ATLANTIC PIONEER
    ✓ Lloyd's ("3E8980")       → SUNNY KALMIA
    ✓ 영숫자 7자리 ("ABC1234") → SHIP B

  영향:
    - 신규 EDI 업로드 시 정상 저장 (즉시 적용)
    - 기존 항차: 다음 EDI 재업로드 또는 별도 마이그레이션
    - 검수 작업 자체는 영향 없음


[2] ✨ 답변 오답 신고 기능 (신규)

  목적:
    검수원이 잘못된 답변에 ❌ 오답 버튼 → 수석 대시보드에 모음
    → 다음 버전에서 패턴 보강 근거로 활용

  신규 컴포넌트:
    src/components/WrongAnswerModal.jsx
    - 질문 + 답변 미리보기
    - 메모 입력창 (500자, 예시 placeholder)
    - 자동 기록: 검수자/항차/앱버전/시각/parsed
    - 제출 후 1.5초 ✅ → 자동 닫기

  버튼 추가:
    AI 답변 카드(보라색) 우측 상단     → ❌ 오답
    즉답 카드(에메랄드색) 우측 상단    → ❌ 오답

  Firebase 함수 (firebase.js):
    fbReportWrongAnswer(data)     — 신고 저장
    fbSubscribeFeedback(callback) — 실시간 구독
    fbResolveFeedback(ts, true)   — 해결됨 표시
    fbDeleteFeedback(ts)          — 삭제

  데이터 구조:
    /feedback/{ts}
      ├ ts, inspector, voyageKey, voyageVsl
      ├ query, answerType (local|ai), answerText (1000자)
      ├ parsedSummary (핵심 플래그만)
      ├ userNote (500자), appVersion, resolved

  수석 대시보드 (ChiefDashboard):
    ✓ 새 섹션: 📋 오답 리포트 (선박 라이브러리 다음)
    ✓ 미해결 빨강 배지 카운트
    ✓ 각 항목:
      - 시각/검수자/[AI/즉답]/항차/앱버전
      - 질문 (전체)
      - 사용자 메모 (있으면)
      - "▶ 앱 답변 보기" 펼침
    ✓ 액션:
      - ✓ 해결됨 표시 (또는 ↩ 되돌리기)
      - 🗑 삭제 (확인 후)
    ✓ 토글: "미해결만" / "해결된 것도"
    ✓ 정렬: 미해결 우선, 그 안에서 최신순


■ 변경 파일 (M3.4)

  src/utils.js                       → APP_VERSION = 'M3.4'
  src/shipStructure.js               → extractShipInfo 버그 2건 수정
  src/firebase.js                    → 오답 신고 함수 4개 추가
  src/components/WrongAnswerModal.jsx → ★ 신규
  src/components/SearchPanel.jsx     → 답변 카드에 ❌ 오답 버튼
  src/pages/ChiefDashboard.jsx       → 📋 오답 리포트 섹션


■ 사용 워크플로

  검수원:
    1) 검색 → 답변 받음
    2) 이상하면 카드 우측 상단 ❌ 오답 클릭
    3) 메모 작성 (선택) → 오답 신고
    4) ✅ 1.5초 표시 후 자동 닫힘

  수석 검수자:
    1) 수석 대시보드 진입
    2) 📋 오답 리포트 (미해결 N건 배지) 확인
    3) 각 신고 검토 → ✓ 해결됨 표시 또는 🗑 삭제
    4) 미해결 리스트를 다음 버전 개선 근거로 정리


■ 누적 이력

  M3.4 ★ EDI 파싱 버그 2건 수정 + 오답 신고 기능
  M3.3   진행/단수/바닥/꼭대기/용량/빈자리 + 그린마린 전용
  M3.2   자연어 대폭 확장 + 인앱 매뉴얼
  M3.1   베이 좌표 정규화 + 음성 한국어화
  M3.0   AI 도메인 지식 + IMDG
  M2.6   선박 라이브러리 (IMO 기반)
  M2.x   트윈 짝꿍/온도/F·E 매핑/Gemini

═══════════════════════════════════════════════════════════════════
