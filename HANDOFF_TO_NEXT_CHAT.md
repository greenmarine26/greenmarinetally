# 새 채팅 인계 지침 (M3.74 시점, 2026.05.06 KST)

> 새 채팅에서 Claude가 이 문서를 먼저 읽고 즉시 이어가도록 만든 인계 문서.

---

## 사용자 / 프로젝트 정보

**김성일** — 평택항(KRPTK) 화물 검수원
**Tallyman Master 앱** (greenmarinetally) 개발 중

| 항목 | 정보 |
|---|---|
| GitHub | greenmarine26/greenmarinetally |
| 사이트 | https://greenmarine26.github.io/greenmarinetally/ |
| Firebase | greenmarinetally (asia-southeast1, Spark 무료) |
| Gemini API | gemini-2.5-pro (무료 한도) |
| 운영 규모 | 4척 동시, 척당 ~1000대, 검수원 최대 15명 |

---

## 현재 버전 / 정책

**현재: M3.74** (2026.05.06 KST)
- 매 수정 +0.01 → 다음 수정 시 **M3.75**부터
- ZIP 파일명에 정확한 버전 표기 필수
- ZIP 한 번 받으면 이전 버전 따로 적용할 필요 X (누적)

---

## 🆕 M3.74 변경 사항 (이번 빌드)

### 🔴 데이터 정확도 수정
1. **EDI 파싱 FR 분류 fix** (`utils.js`)
   - 이전: `cur.iso[2] === 'P'` → `cur.oog = true`만 (fr=false 유지)
   - 변경: `cur.fr = true; cur.oog = true;` 둘 다 set
   - 컨테이너 객체 초기화에 `fr: false` 필드 추가
   - 4자리 숫자 코드 4583/4584/2283/2284 = FR 처리 추가
   - **영향**: 베이플랜에서 FR이 "OOG" 대신 "FR"로 정확히 표시, 상세모달/카드에 FR 배지 정상 표시

2. **무게 추정 완전 제거** (`utils.js` parseListExcel)
   - 이전: 라인 829-839, fe 명시값 없으면 wgt > 5000kg → fe='F' 강제
   - 변경: 무게 기반 추정 코드 통째 삭제 (M3.73 정책과 일치)
   - **영향**: VGM 같은 F/E 미명시 파일에서 빈컨도 강제 Full로 잘못 판정되던 케이스 제거

### 🟡 UX 모달화 (UI 원칙: prompt/confirm 금지)
3. **신규 컴포넌트** `src/components/`
   - `ChoiceModal.jsx` + `useChoice` 훅 — prompt() 대체 (3택 카드)
   - `ConfirmModal.jsx` + `useConfirm` 훅 — confirm() 대체 (예/아니오 풀너비)

4. **prompt() 2건 → ChoiceModal** (`VoyagePage.jsx`)
   - EDI 업로드 충돌 처리 (1=교체 2=병합 3=신규)
   - 리스트 업로드 충돌 처리 (1=교체 2=병합 3=신규)

5. **confirm() 11건 → ConfirmModal**
   - `BigResultCard.jsx`: 완료 취소
   - `ContainerDetailModal.jsx`: 완료 취소, 규격(ISO) 변경
   - `ContainerList.jsx`: 완료 취소
   - `WorkReportModal.jsx`: 작업 완료 보고
   - `ChiefDashboard.jsx`: 전체 보고 삭제 (2단계 → 1단계로 간소화), 단일 보고 삭제, FeedbackRow 삭제
   - `Header.jsx`: 앱 종료
   - `backHandler.js`: exitApp confirm 제거 (호출자에서 사전 확인)

### 🟡 색깔 일관성
6. **HomePage 삭제 모달 색깔 통일** (`HomePage.jsx`)
   - 이전: 양하=amber, 선적=blue (앱 표준과 반대)
   - 변경: 양하=blue, 선적=amber (VoyagePage 모드 탭과 일치)
   - **영향**: 4척 동시 작업 시 색깔 혼동으로 양하/선적 잘못 삭제 위험 제거

### 🔵 베이플랜 다중 적재
7. **신규 컴포넌트** `SlotPickerModal.jsx`
   - 같은 슬롯에 컨테이너 2개 이상 (FR 4개 다중 적재) 선택 모달

8. **베이플랜 셀 ⊕N 표시** (`BayPlan.jsx`)
   - `getCell` → `getCellAll` (배열 반환)으로 변경, 평택 화물 우선 정렬
   - 셀 우상단에 `⊕N` 배지 (N = 추가 컨 수)
   - 다중 셀 클릭 시 SlotPickerModal로 컨테이너 선택 → 기존 ContainerDetailModal로 진입
   - 단일 적재 동작은 변경 없음 (배지 안 뜸)

### 빌드 결과
- ✅ npm install 성공
- ✅ vite build 성공 (1631 modules, 8.25초)
- ✅ EDI 테스트 데이터로 FR 분류/ISO 동기화/status 변환 모두 정상 동작 확인

---

## 절대 원칙 (반드시 지킬 것)

### 작업 원칙
1. **EDI 우선**, ASC는 검증용
2. **추론 금지** — 실제 데이터 검증 후 답변
3. "만들지 마세요" 명령 시 **즉시 중단**
4. **위법성 우려 시 즉시 보류**
5. **개인 명의 인증키 회피** (회사 인계 안전)
6. 매 수정마다 **버전 +0.01**, ZIP에 정확히 표기
7. **시간 표기 KST 통일** (UTC 사용 금지)
8. ZIP 배포 시 항상 HANDOFF_TO_NEXT_CHAT.md 함께
9. **검수원이 본 실물이 정답** — 앱은 보조 도구
10. **데이터 우선순위: 검수원 실물 > EDI/ASC/리스트 명시값 > (무게 추정 X)**
11. **수정 후 사용자에게 ZIP 주기 전에 제가 먼저 검증** (사용자 테스트 반복 X)

### UI 원칙 (현장 폰 환경)
- **prompt() / confirm() 금지** (모달 사용) — M3.74에서 잔존 11건 모두 제거
- 풀 화면 모달 + 풀 너비 큰 버튼 (44px+)
- capture="environment" (후면 카메라)
- 카드형 세로 스크롤
- 음성: pitch 1.4, rate 1.1 (밝고 청아하게), 한국어 여성 음성 우선
- 인사에서 이름/검수원님 모두 제거 ("안녕하세요!" "수고하셨어요!")
- **모드 색깔 표준: 양하 = blue, 선적 = amber** (M3.74 통일)

---

## 핵심 도메인 지식

### ISO 6346 길이 코드 (절대 원칙)
```
첫 자리: 2 = 20피트
        4 = 40피트 (45피트 절대 X)
        L = 45피트
```

### 함정 표기
- 45G0 = 40피트 Hi-Cube (45피트 아님!)
- 45R0 = 40피트 Hi-Cube Reefer
- L5G0/L0G1 = 45피트 GP/HC

### FR (Flat Rack) 표기 (M3.74 정립)
- **3번째 글자 P/F = FR** (예: 22P1, 42P1, 45P1)
- **4자리 숫자 4583/4584/2283/2284 = FR**
- 46P3 = 45피트 FR / 42PC = 40피트 FR
- M3.74부터 EDI 파싱 시 `cur.fr = true` 명시 + `cur.oog = true` 호환성 유지

### 0°C는 실제 온도
- 신선 채소, 의약품 등 "0", "0.0", "+0" 모두 실제 0°C
- 진짜 미입력은 빈 값 / "-" 만

### F/E 판정 (M3.73~M3.74 정립)
- **무게 추정 절대 사용 X** (M3.74에서 parseListExcel 잔존분 마저 제거)
- EDI status 코드 / 리스트 명시값만이 진실
- 명시값 없으면 빈 값 (검수원 현장 확인)

### EDI BAPLIE Status 코드
```
EQD+CN+컨번호+ISO+++STATUS
M3.71: 가장 마지막 비어있지 않은 요소를 status로 사용
F/5 = Full,  E/4 = Empty
```

### ISO 끝자리 E = Empty 표시 (선사 관행)
- 22RE/45RE = Empty 자동 인식 (M3.72)
- fe와 ISO 끝자리 자동 동기화 (M3.73)

### 다중 적재 (M3.74 신규 지원)
- 같은 베이-row-tier에 컨테이너 2개 이상 가능 (FR 다중 적재)
- 베이플랜 셀에 `⊕N` 배지로 추가 컨 수 표시
- 클릭 시 SlotPickerModal로 컨테이너 선택

### 선박별 엠티 실 정책 (M3.5.5)
- TNJP/RZOR: verify (모든 엠티 확인)
- ATRP: attach (POD=CNWEH인 엠티만 실 부착)

---

## 시스템 구조

### 신규 파일 (M3.74)
```
src/components/ConfirmModal.jsx   - confirm() 대체 + useConfirm 훅
src/components/ChoiceModal.jsx    - prompt() 대체 (3택 카드) + useChoice 훅
src/components/SlotPickerModal.jsx - 다중 적재 슬롯 컨 선택 모달
```

### Firebase 데이터 구조
```
voyages/{voyageKey}/
  info: {vsl, voy_d, voy_l, voy}
  discharge/                          ← 양하 모드
    ediContainers/{cn}                 - EDI 파싱 결과
    records/{cn}                       - 검수원 입력
    xrayList/{cn}                      - X-RAY 대상
  loading/                            ← 선적 모드 (별도)
  reports/{ts}                         - 작업 보고
  photos/{ts}                          - 사진 보고

activeWork/{voyageKey}/{equipNo}/      - 장비별 활성 작업
shipLib/{imo}                          - 선박 라이브러리
shipPolicies/{vsl}                     - 선박별 정책
inspectors/{name}                      - 활동 검수원
```

**중요**: 양하/선적은 같은 항차 안에서 별도 노드. 새 항차 만들면 동시 작업 안 됨!

### EDI vs records 병합
```
ALLOWED_LIST_FIELDS = ['sl', 'sl_orig', 'sl_history', 'wt', 'bl', 'sh', 'gi', 'op', 'tmp']
- 리스트는 위 필드만 EDI에 보강 가능
- fe, iso, rf, fr, ot, tk, dg 등 핵심 필드는 EDI만
- tmp: EDI에 이미 있으면 리스트가 못 덮음 (EDI 우선)
- wt: EDI 값이 0일 때만 리스트로 채움
```

---

## 완성된 기능 체크리스트 (M3.74)

### 검수 본업
- ✅ EDI(BAPLIE) 파싱 (status 코드 정확 추출 - M3.71)
- ✅ 엑셀 리스트 매칭
- ✅ ISO 6346 정확 변환 (4=40피트 절대 원칙)
- ✅ ISO 끝자리 E ↔ fe 자동 동기화 (M3.73)
- ✅ FR 정확 분류 (fr=true 명시) **(M3.74)**
- ✅ 무게 추정 완전 제거 (M3.74로 잔존분 모두 제거)
- ✅ 알 수 없는 ISO → 사진 보고 유도 + 빨간 배너
- ✅ 0°C 리퍼 정상 인식
- ✅ 트윈 짝꿍 자동 분석
- ✅ 자동 진단/음성 경고
- ✅ 베이플랜 다중 적재 ⊕N 표시 **(M3.74)**

### UI/UX
- ✅ 모든 prompt()/confirm() 모달화 **(M3.74)**
- ✅ 양하/선적 색깔 통일 (양하=blue, 선적=amber) **(M3.74)**
- ✅ 풀 너비 큰 버튼 (44px+) 정책 일관 적용

### 작업 보고/인사/대시보드
- ✅ 카톡 양하/선적 시작/중단/재개/완료
- ✅ 한 장비 양하+선적 동시 진행
- ✅ Open-Meteo 평택항 실시간 날씨
- ✅ 12시간 예보 + 근무 시간대 4슬롯
- ✅ 음성 (TTS, 한국어 여성)
- ✅ 영어 회화집 (13개 카테고리)
- ✅ 장비별 통계 (1~4호기)

---

## M3.6 → M3.74 핵심 수정 히스토리

- M3.6: 0°C 인식, ISO 6346 정확화, 알 수 없는 ISO 유도
- M3.66: 진단 중복 제거
- M3.67: 리퍼 엠티 풀 잘못 분류 시도 1
- M3.69: 무게 명시값 절대 안 덮음 시도 2
- M3.70: 화면 ")}" 노출 버그 수정
- M3.71: EDI status 위치 버그 수정 ⭐ 핵심
- M3.72: ISO 끝 E도 Empty 인식
- M3.73: 무게 추정 완전 제거 (EDI/ASC만) + ISO/fe 동기화
- **M3.74: parseListExcel 무게 추정 잔존분 제거 + FR 분류 fix + UI 모달화 11건 + 색깔 통일 + 다중 적재 ⊕N** ⭐ 정밀화

---

## 다음 작업 후보 (M3.75+)

### 최우선
1. **현장 야간 투입 결과** (M3.74 적용 후 결과 받기)

### 통계/관리
2. 검수원/장비별 작업량 통계
3. 시간대별/일/주/월 통계
4. Firebase 자동 백업/아카이브 (1GB 대비)

### UI 개선
5. ISO 변경 추적 UI (M3.5.5 미완)
6. 특수화물 그룹 필터
7. 통합 검색 항차별 분리

### 회사 인계 준비 (보류 중)
8. API 키 노출 해소 (Firebase config / Gemini key)
9. Firebase 보안 규칙 설정 (현재 인증 없이 읽기/쓰기 가능)
10. 시스템 구조도, 정식 운영 매뉴얼

---

## 보류된 기능 (다시 꺼내지 말 것)

- PORT-MIS 평택 스케줄 (개인 명의 인증키 회피)
- 카카오 알림톡 자동 (사업자등록 필요)
- 명단 시스템 (사용자 결정 보류)
- DG/무게 1항사 결정 영역

---

## 트러블슈팅 가이드

### 화면이 이전 버전 그대로
1. Ctrl+Shift+R (강제 새로고침)
2. 헤더 버전 확인 (M3.74)
3. 시크릿 창에서 열기

### 데이터 그대로 (코드 바뀌었는데)
- EDI 다시 업로드 필수 (이전 파싱 결과 갱신)
- 변경된 모드(예: 선적)만 다시 업로드 가능
- 새 항차 생성 X (동시 작업 불가능해짐)

### FR 컨테이너가 베이플랜에 "OOG"로 표시
- **M3.74에서 fix됨** — `cur.fr = true` 명시
- 이전 빌드 데이터는 EDI 재업로드 필요

### 같은 슬롯 컨테이너가 1개만 보임
- **M3.74에서 fix됨** — 베이플랜 셀에 `⊕N` 배지 표시
- 다중 셀 클릭 시 SlotPickerModal로 선택

### 리퍼 엠티가 풀로 잘못 분류
- M3.71: EDI status 추출 수정
- M3.73: 무게 추정 EDI/ASC 제거
- **M3.74: parseListExcel 잔존분도 제거 → 100% 명시값만**

### 카톡 발송 안 됨
- Android Chrome / iPhone Safari (iOS 15+) 정상
- PC: 클립보드 자동 복사 폴백

### 0°C 리퍼 "온도 미입력" 경고
- M3.66+에서 수정됨

---

## 새 채팅 시작 시 Claude 행동 지침

1. 사용자 마지막 메시지 → 문제/요청 파악
2. 메모리 + 이 문서로 컨텍스트 즉시 복원
3. 처음부터 설명 X — 즉시 작업 모드로
4. 새로운 문제면 신중히 검증 후 코드 수정
5. 수정 후 직접 테스트 → ZIP 생성 + present_files
6. HANDOFF에 변경 사항 기록
7. 시간 언급 시 KST로 통일

### 절대 금지
- ❌ 추측만으로 코드 수정
- ❌ "캐시 문제일 수 있다" 같은 변명
- ❌ 사용자에게 반복 테스트 요청
- ❌ 같은 버전 번호로 ZIP 두 번 보내기
- ❌ UTC 시간 표기
- ❌ **prompt()/confirm() 새로 추가** (M3.74에서 모두 제거됨)

---

## 마지막 빌드

- **파일**: `greenmarinetally-M3.74.zip`
- **빌드**: 1631 modules transformed, 8.25초 (vite v6.4.2)
- **시간**: 2026-05-06 KST

### M3.74 자체 검증 (가짜 EDI 4컨)
```
HJSU1234567 (45P1, F)        → fr:true ✅ oog:true ✅ rf:false
HJSU1234568 (46P3, E)        → fr:true ✅ oog:true ✅ ISO 자동 동기화 → 46PE ✅
TLLU8765432 (22P1, status=5) → fr:true ✅ fe:F (5→F 변환) ✅
HJSU9999999 (45R1, F)        → rf:true ✅ fr:false ✅ tmp:-18 ✅ (리퍼 정상)
```

### M3.74에서 제거된 잔존 코드
```
src/utils.js:829-839 (이전): 무게 5톤 초과 → fe='F' 강제 ❌ 삭제
src/backHandler.js:31 (이전): confirm('검수앱을 종료하시겠습니까?') ❌ 삭제
```

### M3.74 신규 파일
- `src/components/ConfirmModal.jsx` (~95줄)
- `src/components/ChoiceModal.jsx` (~100줄)
- `src/components/SlotPickerModal.jsx` (~95줄)

---

## 사용자 측 주의사항

### 야간 투입
- 검수업 본업이 최우선
- 앱은 보조 도구
- 위험 상황 시 무조건 안전 우선
- 현장에서 디버깅 X (메모만 하고 넘어가기)
- 새 채팅에서 결과 보고

### 새 채팅 시작 방법
**방법 A: 메모리만 활용 (간단)**
```
"성일이에요. M3.74 야간 결과 보고할게요."
```

**방법 B: 인계 문서 첨부 (확실)**
이 HANDOFF_TO_NEXT_CHAT.md 첨부 + 한 줄:
```
"이거 먼저 읽고 시작합시다. M3.74 야간 결과:..."
```

---

*이 문서는 매 세션마다 ZIP과 함께 업데이트됩니다.*
*다음 채팅에서 이 문서를 보면 즉시 컨텍스트 복원 가능.*
