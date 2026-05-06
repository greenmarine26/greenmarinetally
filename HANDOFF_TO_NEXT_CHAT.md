# 새 채팅 인계 지침 (M3.70 시점, 2026.05.06 KST)

> 새 채팅에서 Claude가 이 문서 먼저 읽고 즉시 이어가도록.

---

## 사용자 / 프로젝트 정보

**김성일** — 평택항(KRPTK) 화물 검수원
**Tallyman Master 앱** (greenmarinetally) 개발 중

| 항목 | 정보 |
|---|---|
| GitHub | greenmarine26/greenmarinetally |
| 사이트 | https://greenmarine26.github.io/greenmarinetally/ |
| Firebase | greenmarinetally (asia-southeast1, Spark 무료) |
| Firebase URL | https://greenmarinetally-default-rtdb.asia-southeast1.firebasedatabase.app |
| Gemini API | AIzaSyDPRM3bRGusAwhyhjGGka2K1m2r6c5gJKY (2.5 Pro, 무료) |
| Open-Meteo | 인증키 X (평택항 36.98°N, 126.82°E) |
| 운영 규모 | 4척 동시, 척당 ~1000대, 검수원 최대 15명 |

---

## 현재 버전 / 정책

**현재: M3.70** (2026.05.06 KST 작성)
- 사용자 측 저장: M3.66 부터 정식 카운트
- 매 수정 +0.01 → 다음 수정 시 **M3.71**부터
- ZIP 파일명에 정확한 버전 표기 필수

---

## 절대 원칙

### 작업 원칙
1. **EDI 우선**, ASC는 검증용
2. **추론 금지** — 실제 데이터 검증 후 답변
3. "만들지 마세요" 명령 시 **즉시 중단**
4. records 수정 시 ediContainers도 함께
5. **위법성 우려 시 즉시 보류**
6. **개인 명의 인증키 회피** (회사 인계 안전)
7. 매 수정마다 **버전 +0.01**, ZIP에 정확히 표기
8. **시간 표기 KST 통일** (UTC 사용 금지)
9. ZIP 배포 시 항상 HANDOFF_TO_NEXT_CHAT.md 함께
10. **검수원이 본 실물이 정답** — 앱은 보조 도구
11. 데이터 우선순위: 검수원 실물 > EDI/ASC/리스트 명시값 > 무게 추정

### UI 원칙 (현장 폰 환경)
- 풀 화면 모달 + 풀 너비 큰 버튼 (44px+)
- prompt() / confirm() 금지 (모달 사용)
- capture="environment" (후면 카메라)
- 카드형 세로 스크롤
- 음성: pitch 1.4, rate 1.1 (밝고 청아하게), 한국어 여성 음성 우선
- 인사에서 이름/검수원님 모두 제거 ("안녕하세요!" "수고하셨어요!")

---

## 핵심 도메인 지식 (사용자가 알려준 것 — 절대 잊지 말 것)

### ISO 6346 길이 코드 (절대 원칙)
```
첫 자리: 2 = 20피트
        4 = 40피트 (45피트 절대 X)
        L = 45피트
```

### 함정 표기
- **45G0 = 40피트 Hi-Cube** (45피트 아님!)
- **45R0 = 40피트 Hi-Cube Reefer**
- **4500/4510/4530 = 40피트 Hi-Cube**
- **L5G0/L0G1 = 45피트 GP/HC**

### 4510 의미 (사용자 설명)
- 4 = 40피트
- 5 = Hi-Cube
- 1 = 변형 (통풍구 유무)
- 0 = 추가 변형

### 45피트 현실
- **드라이(GP/HC)만 존재**
- 45피트 리퍼/FR/OT/TK **실존 X**
- 45RF/L5R 같은 표기는 모두 40RF로 자동 변환

### 0°C는 실제 온도
- 신선 채소(양배추 등), 일부 의약품 운반
- "0", "0.0", "+0" 모두 **실제 0°C**로 인식
- 진짜 미입력은 빈 값 / "-" 만

### 무게 vs 풀/엠티
- **1톤 차이는 정상 범위** (서류 vs 실측)
- 무게 차이 경고 임계값: **5톤 이상**
- 무게는 **fe 빈 값일 때만** 추정 (명시값 절대 덮지 않음)

### EDI Status 코드
- F = Full
- E = Empty
- 5 = Full
- 4 = Empty
- 미명시 → **빈 값** (기본 'F' 사용 금지)

### 표기 차이 사례 (STSE 2633E 514대 검증)
```
EDI 형식    ASC 형식   통일 결과   수량
20G0       20GP       20DC        249대
45G0       40HC       40HC        228대
45R0       40HR       40RF         36대
45G0       45GP       40HC vs 45HC  1대 (선사 모순)
```

### 선박별 엠티 실 정책 (M3.5.5)
- TNJP/RZOR: verify (모든 엠티 확인)
- ATRP: attach (POD=CNWEH인 엠티만 실 부착)
- 새 선박 자동 ShipPolicyModal 띄움

---

## 시스템 구조

### 신규 파일 (M3.5.5+)
```
src/kakaoShare.js              - 카톡 공유 + 사진 합성
src/greeting.js                - 인사 + Open-Meteo 날씨/예보
src/shipPolicies.js            - 선박별 엠티 실 정책
src/diagnostics.js             - 자동 진단/경고
src/components/WorkReportModal.jsx
src/components/PhotoReportModal.jsx
src/components/GreetingModal.jsx
src/components/ContainerPhrasebook.jsx  - 영어 회화집 v2 (사용자 제공)
src/components/ShipPolicyModal.jsx
src/components/EmptySealReport.jsx
```

### Firebase 데이터 구조
```
voyages/{voyageKey}/
  info: {vsl, voy_d, voy_l, voy}      // 항차 정보
  ediContainers/{cn}                   // EDI 파싱 결과
  records/{cn}                         // 검수원 입력
  reports/{ts}                         // 작업 보고 (M3.5.6)
  photos/{ts}                          // 사진 보고

activeWork/{voyageKey}/{equipNo}/
  discharge: {status, startedAt, ...}
  load: {status, startedAt, ...}

shipLib/{imo}                          // 선박 라이브러리
shipPolicies/{vsl}                     // 선박별 정책
inspectors/{name}                      // 활동 검수원
```

### 항차 패턴
- 패턴A: 1항차 = 1번호 (양하/선적 같이)
- 패턴B: 양하/선적 분리 (예: 2608N/2608S)
- info: voy_d / voy_l / voy 3필드

### 데미지 표준 용어 (M3.5.6)
**종류 16**: DENTED, BENT, BULGED, PUSHED IN, HOLE, TORN, CUT, SCRATCH, CRACKED, BROKEN, LOOSE, MISSING, RUST, DIRTY, WET, CONTAMINATED
**부위 13**: ROOF, FLOOR, LEFT/RIGHT SIDE, FRONT/BACK END, DOOR HANDLE, DOOR LATCH, DOOR HINGE, DOOR GASKET, CORNER POST, LOCK ROD, SEAL

---

## 완성된 기능 체크리스트 (M3.70)

### 검수 본업
- ✅ EDI(BAPLIE) 파싱
- ✅ 엑셀 리스트 매칭
- ✅ ISO 6346 정확 변환 (4=40피트 절대 원칙)
- ✅ 알 수 없는 ISO → 사진 보고 유도 + 빨간 배너
- ✅ 0°C 리퍼 정상 인식
- ✅ 트윈 짝꿍 자동 분석
- ✅ 자동 진단/음성 경고 (리퍼/위험물/실/규격)
- ✅ 무게 명시값 절대 안 덮음 (M3.69)

### 작업 보고
- ✅ 카톡 양하/선적 시작/중단/재개/완료
- ✅ 한 장비 양하+선적 동시 진행
- ✅ 해치커버 OPEN/CLOSE
- ✅ 콘박스 (20자/40자, 1~3개)
- ✅ 사진 + 정보 자막 합성 (Canvas)
- ✅ 실오류/데미지 사진 보고
- ✅ 메시지 맨 앞 [🏗 N호기] 표시

### 인사 시스템 (M3.6)
- ✅ 자동 로그인 제거
- ✅ 시간대 6단계 (새벽/오전/점심/오후/저녁/야간)
- ✅ Open-Meteo 평택항 실시간 날씨
- ✅ 12시간 예보 + 근무 시간대 4슬롯 표시
- ✅ 위험 기상 우선 (천둥/강풍/호우/눈)
- ✅ 음성 (TTS, 한국어 여성, 밝고 청아)
- ✅ 로그아웃 [🚪] 보라 버튼 강제

### 영어 회화집 (사용자 제공 v2)
- ✅ 13개 카테고리 (인사/양하/선적/출항/컨테이너/손상/위치/리퍼/특수화물/크레인/X-RAY/안전/마무리)
- ✅ 'p' 단일 + 'q' 질문+답변 두 타입
- ✅ TTS 음성 / 검색 / 즐겨찾기 / 속도 조절

### 대시보드
- ✅ 장비별 통계 (1~4호기)
- ✅ 최근 보고 30건 실시간
- ✅ 개별/전체 삭제 (테스트용)

---

## 다음 작업 후보 (M3.71+)

### 최우선
1. **현장 야간 투입 결과** (사용자 모레 보고 예정)
2. 검수원 도메인 추가 발견사항 반영

### 통계/관리
3. 검수원/장비별 작업량 통계
4. 시간대별/일/주/월 통계
5. Firebase 자동 백업/아카이브 (1GB 대비)

### UI 개선
6. ISO 변경 추적 UI (M3.5.5 미완)
7. 베이플랜 다중 적재 ⊕N 표시
8. 특수화물 그룹 필터
9. 통합 검색 항차별 분리

### 항차 관리
10. 항차 삭제 양하/선적 분리 (fbDeleteSection 미완)

### 회사 인계 준비
11. 시스템 구조도
12. 정식 운영 매뉴얼
13. 회사 명의 Gemini API 키 교체 가이드

---

## 보류된 기능 (다시 꺼내지 말 것)

- PORT-MIS 평택 스케줄 (개인 명의 인증키 회피, 회사 결정 사항)
- 카카오 알림톡 자동 (사업자등록 필요)
- 명단 시스템 (사용자 결정 보류)
- DG/무게 1항사 결정 영역 (검수원 의견 제기 도구만 검토)

---

## 트러블슈팅 가이드

### 화면이 이전 버전
1. Ctrl+Shift+R (강제 새로고침)
2. 헤더 버전 확인 (M3.70 등 표시 확인)

### 카톡 발송 안 됨
- Android Chrome: Web Share API 정상
- iPhone Safari: 정상 (iOS 15+)
- PC: 클립보드 자동 복사 폴백

### 사진 보고 [전송] 버튼 안 눌려 보임
- 검증 상태 카드 확인 (빨간색이면 입력 필요)
- 버튼 항상 활성화 (sending 중일 때만 비활성)

### 0°C 리퍼 "온도 미입력" 경고
- M3.66+에서 수정 (이전 버전이면 새로고침)

### 리퍼 엠티가 풀로 잘못 분류
- M3.69에서 수정 (무게 명시값 안 덮음)

### 진단 메시지 중복/잘못
- M3.66에서 중복 제거 (40HR 표기 누락 등)

### JSX 코드가 화면에 노출
- M3.70에서 수정 (`)}`  → 제거)

---

## 새 채팅 시작 시 Claude 행동 지침

1. **사용자 마지막 메시지** → 문제/요청 파악
2. **메모리 + 이 문서**로 컨텍스트 즉시 복원
3. **처음부터 설명 X** — 즉시 작업 모드로
4. 새로운 문제면 신중히 검증 후 코드 수정
5. 수정 시 **버전 +0.01 후 ZIP 생성** + present_files
6. HANDOFF에 변경 사항 기록 (이 문서 업데이트)
7. 시간 언급 시 **KST**로 통일

---

## 마지막 빌드

- **파일**: `greenmarinetally-M3.70.zip`
- **크기**: 258KB
- **빌드**: 43/43 모든 파일 통과
- **시간**: 2026-05-06 KST 새벽

---

*이 문서는 매 세션에 ZIP과 함께 업데이트됩니다.*
*다음 채팅에서 이 문서를 보면 즉시 컨텍스트가 복원됩니다.*
