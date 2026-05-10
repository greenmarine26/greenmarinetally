# M5.14 → 다음 세션 인계 (HANDOFF)

## 현재 상태 (M5.14) — PDF STOWAGE INSTRUCTION으로 정확 정정

M5.13의 ⚠️ 검토필요 2척(DJCT, TMPZ)을 사용자가 보낸 PDF로 정확 정정. 자동 추출 알고리즘이 둘 다 틀렸음을 확인.

## ✅ 이번 빌드 변경 사항 (M5.13 → M5.14)

### 두 척 정정 (PDF STOWAGE INSTRUCTION 기반)

#### TMPZ (TIANHAI PINGZE)
| 항목 | M5.13 (자동 추출) | M5.14 (PDF 검증) |
|---|---|---|
| 베이 수 | 19개 | **21개** ✓ |
| 변화 | — | BAY 5, 7 추가 |
| grade | needs-review | **verified** |
| methodology | ASCII_PATTERN_EXTRACTION | PDF_STOWAGE_INSTRUCTION |

**전체 bayList**: `01, 02, 03, 05, 06, 07, 09, 10, 11, 13, 14, 15, 19, 20, 21, 23, 24, 25, 27, 28, 29`
- BAY 17, 18 (선원건물) 빠짐
- 나머지 짝수 (4, 8, 12, 16, 22, 26, 30) 통로

**원인**: 자동 추출 시 BAY 5, 7이 cell code 등에서 고빈도(19/22회)로 등장해 노이즈로 잘못 분류됨. 실제 PDF STOWAGE에서는 정상 베이.

#### DJCT/S639 (DONGJIN CONTINENTAL)
| 항목 | M5.13 (자동 추출) | M5.14 (PDF 검증) |
|---|---|---|
| 베이 수 | 71개 (10-80) | **22개** ✓ |
| 변화 | — | 1-29 범위 정상 컨선 |
| grade | needs-review | **verified** |
| methodology | ASCII_PATTERN_EXTRACTION (delta=80) | PDF_STOWAGE_INSTRUCTION |

**전체 bayList**: `01, 03, 04, 05, 07, 08, 09, 11, 12, 13, 15, 16, 17, 19, 20, 21, 23, 24, 25, 27, 28, 29`
- BAY 02, 06, 10, 14, 18, 22, 26 (BOW/통로/선원건물) 빠짐
- BAY 17 단독 (선원건물 위치 추정)

**원인**: CASP 6.30 형식에서 delta=80 시퀀스가 베이 정의가 아닌 다른 영역(70개 섹션)을 잡았음. 실제는 일반 컨선 22 베이.

### grade 격상

- 두 entry 모두 `grade: 'verified'` + `verified: true`
- BayDictStatusWidget에 ✅ 검증 배지 표시 (이전 🟠 검토필요 → 🟢 검증)

### 검증 결과

- 버전 M5.14: 6회 ✓
- M5.14-pdf-verified 3회 (DJCT, S639, TMPZ 3개 entry)
- DJCT entry에 BAY 80 사라짐 ✓ / BAY 29 정상 ✓
- 기존 ATPR/DPRT/XTPG (정확) 모두 잔존
- 기존 모든 기능 (재처리/보관함/마감 점검) 잔존

## 변경 파일

| 파일 | 변경 |
|---|---|
| src/utils.js | APP_VERSION 'M5.14' |
| src/data/shipBayDict_v2.js | DJCT/S639/TMPZ entry 정정 (verified로 격상) |
| src/components/HelpModal.jsx | M5.14 정정 안내 |

## 사용자 시점 핵심 메시지

1. **TMPZ 작업 시**: BAY 5, 7도 정상 표시됨 (이전 빠져있던 것)
2. **DJCT 작업 시**: 22개 베이로 정상 표시 (이전 80베이 폴백 패턴 X)
3. **위젯 ✅ 검증 배지**: 두 선박 모두 PDF로 영구 검증됨
4. **베이사전 110+5=115척** (DJCT/S639 같은 선박 다른 키 = 1척으로 카운트하면 114척)

## 🔜 다음 세션

### 추가 .def 파일 받으면 같은 방식으로 등록
- 사용자가 새 선박의 .def + STOWAGE PDF 같이 보내주면 정확하게 추가 가능
- ASC 파일은 컨테이너 데이터지만 실제 적치된 베이를 보고 검증 보조 가능

### M5.2 후보 (큰 변화)
- `analyzeDefFile`에 CASP 6.10/6.30 지원 추가 (자동 등록 흐름이 모든 형식 처리)
- PDF STOWAGE 자동 파싱 → 베이사전 자동 등록

## 영구 규칙 (메모리)

1. 빌드 전 체크리스트: APP_VERSION + HelpModal + HANDOFF
2. 버전 표기: 큰 변화 = M5.0 → M5.1, 작은 수정 = M5.0 → M5.01 → M5.02
3. 컨선 베이 구조: 짝수 단독 = BOW/STERN/선원건물 앞뒤 (정상)
4. .def 자동 추출보다 PDF STOWAGE INSTRUCTION이 검증 신뢰도 높음
