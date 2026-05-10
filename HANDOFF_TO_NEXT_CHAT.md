# M5.15 → 다음 세션 인계 (HANDOFF)

## 현재 상태 (M5.15) — ATRP alias 추가 (긴급 hotfix)

M5.14 배포 후 사용자가 ATRP 항차에서 매칭 실패 보고. 사진으로 확인 결과 **EDI에 ATRP 코드로 들어옴** (사용자 메모리 정책 시스템에도 ATRP 명시) — 같은 선박이지만 ATPR ↔ ATRP 평택항 시스템마다 다른 코드.

## ✅ 이번 빌드 변경 사항 (M5.14 → M5.15)

### ATRP entry 추가 (ATPR alias)

- 같은 선박 ATLANTIC PIONEER, 콜사인 D5RR5
- ATPR: M5.12 추가 (.def 파일 코드)
- ATRP: M5.15 추가 (EDI 시스템 코드)
- 동일한 21개 베이: `01, 02, 03, 05, 06, 07, 09, 10, 11, 13, 14, 15, 19, 20, 21, 23, 24, 25, 27, 28, 29`

### 사용자가 보고한 버그의 진짜 원인

사용자 메시지: "베이 메인화면 우측 베이 누르면 구분이 틀렸고 인쇄 누르면 정확"

진단 (사진 1, 2 비교):
- **사진 1 (메인)**: ⚠️ 베이사전 매칭 실패 → BayPlan의 EDI 폴백 로직(line 276~) 사용 → 1~28까지 모든 짝수/홀수 페어 표시 (잘못된 표시)
- **사진 2 (인쇄)**: 인쇄 미리보기는 다른 로직 — EDI 컨테이너의 실제 적치 베이만 추출. 우연히 ATPR 베이 패턴과 일치해서 정확해 보임

→ 진짜 root cause: **ATRP 매칭 실패** (M5.12에 ATPR만 있었음)
→ M5.15: ATRP 추가 → 매칭 성공 → dictBayList 사용 → 두 화면 모두 21개 정확한 베이로 통일

### 매칭 강화 enhanced lookup이 안 잡은 이유

M5.11 강화한 4가지 매칭 (IMO/콜사인/코드/이름) 모두 실패:
1. **코드 매칭 실패**: `SHIP_BAY_DICT_V2["ATRP"]` 없음 (ATPR만 있음)
2. **IMO 매칭 실패**: ATPR entry callsign이 "D5RR5"라 IMO 9388417 같은 숫자 없음
3. **콜사인 매칭 실패**: EDI 추출 vsl에 D5RR5 콜사인 없을 가능성
4. **이름 fuzzy 매칭 실패**: EDI vsl이 "ATRP" 또는 "ATLANTIC PIONEER" → 후자라면 매칭됐어야 하는데, fuzzy 로직의 prefix 4글자 제거 로직이 ATRP에 안 맞았을 가능성

→ 가장 안전한 fix: alias entry 추가 (즉시 코드 매칭 성공)

## 검증 결과

- 버전 M5.15: 4회 ✓
- ATRP 10회 / ATPR 15회 (둘 다 v2에) ✓
- M5.15-alias 1회 ✓
- 기존 기능 모두 잔존 (재처리 9회, 4척 추가 잔존)

## 변경 파일

| 파일 | 변경 |
|---|---|
| src/utils.js | APP_VERSION 'M5.15' |
| src/data/shipBayDict_v2.js | ATRP entry 추가 (ATPR alias) |
| src/components/HelpModal.jsx | M5.15 변경사항 |

## ⚠️ 잠재 동일 케이스

- **DJCT/S639**: 이미 두 키로 같은 데이터 등록 (M5.13/M5.14)
- **TMPZ/DJCT/DPRT/XTPG**: EDI 시스템에서 다른 코드로 들어올 가능성 — 발견 시 alias 추가
- **다른 선박**: 미래에 같은 패턴 발견되면 즉시 alias 추가

## 🔜 다음 세션

### 미래 fix 후보

1. **enhanced 매칭 알고리즘 더 보강**: ATRP/ATPR 같은 글자 순서 다른 케이스도 fuzzy로 잡히게 (Levenshtein distance 등)
2. **인쇄 vs 메인 베이 표시 로직 통일**: 베이사전 매칭 실패 시에도 EDI 컨테이너의 실제 적치 베이를 사용하는 폴백 추가 (인쇄 로직과 일치)

### 영구 규칙 (메모리)

1. 빌드 전 체크리스트: APP_VERSION + HelpModal + HANDOFF
2. 컨선 베이 구조: 짝수 단독 = BOW/STERN/선원건물 앞뒤 (정상)
3. **선박 코드 alias**: 같은 선박이 EDI 시스템마다 다른 코드 사용할 수 있음. 매칭 실패 보고되면 alias entry 추가

## 사용자 시점 핵심 메시지

1. **ATRP 작업 즉시 정상화** — 새 빌드 받으면 ⚠️ 매칭 실패 → 🟢 verified 매칭으로 변함
2. **메인 화면 vs 인쇄 화면 베이 일치** — 둘 다 21개 정확한 베이로 표시
3. **다른 선박도 같은 케이스 발생 가능** — 매칭 실패 보고하시면 즉시 alias 추가
