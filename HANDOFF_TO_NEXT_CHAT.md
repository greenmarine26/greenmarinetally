# Tallyman Master 핸드오프 — M6.55

## 📌 현재 상태 (2026-05-20)

- **최신 버전**: **M6.55** (.def 매트릭스 디코드 + 베이사전 v5 통합)
- **이전 버전**: M6.54 (점선 위치 통일)
- **작업 디렉토리**: `/home/claude/app/m6_55_build/`

---

## 🎯 M6.55 변경 요약

329개 .def 원본 파일을 정밀 분석해서 **베이사전 v5를 자동 추출** → v2에 없던 **신규 13척**을 보조 사전에 추가하고, **311척에 row 폭/매트릭스 정보 보강** 첨부.

---

## 🎯 .def 파일 분석 Phase 6/7/8 완료

### Phase 6 — 베이 매트릭스 정밀 디코드 ✅
각 베이 record 안 uint16 LE 스트림이 row × cell 매트릭스를 인코딩:
- 값 `0` = 빈 슬롯
- 값 `1` = 일반 슬롯
- 값 `3` = hatch cover 경계 marker (가설)
- 값 `5`, `7` = 특수 marker (KSKM 일부에만, 의미 가설)
- 연속 non-zero cluster = 한 row
- 큰 zero gap (>100 bytes) = deck/hold 분리 (6.50 포맷)

**KSKM baseline 검증:** Hold 베이 = bay 11, 12, 13, 15 정확히 4개 ✅

### Phase 7 — STSE 6.10 변형 검증 ✅
STSE는 표준 6.10 포맷. 별도 처리 불필요.

⚠ 6.10 포맷 181척은 zero gap이 작아 hold 분리 미검출. 다음 세션 후속 작업.

### Phase 8 — 베이 번호 자동 추출 ✅ (큰 돌파)
**이전 결론 정정:** "베이 번호가 파일에 없음" → 실제로는 **ASCII 영역에 명시 저장**.
- 위치: 6.50 포맷 offset ~135,900 / 6.10 포맷 offset ~60,000
- 형식: `' NN    '` (공백+2자리+4공백)
- record 간격: 189 bytes

**Baseline 검증:**
- KSKM 22 베이: 정답 `1,3,4,5,7,8,9,11,12,13,15,16,17,19,20,21,23,24,25,27,28,29` **100% 일치 ✅**
- NBTD 24 베이: `1,2,3,5,6,7,11,12,13,15,16,17,19,20,21,23,24,25,29,30,31,33,34,35`
- STSE 22 베이: `1,3,4,5,7,8,9,11,12,13,15,16,17,19,20,21,23,24,25,27,28,29`

**전체: 306/311척 = 98.4%** (6.50 100%, 6.10 98%)

---

## 📁 변경 / 신규 파일

### 신규 (M6.55)
- **`src/data/shipBayDict_v5_supplement.js`** (97 KB)
  - v2에 없는 13척: DAP, DBM, DHA, ESTM, FN7, FSR, HAHM, HECN, MDB, MEB, ORT, PCBS, WBC
  - grade: `matrix-decoded` (verified 아님)
  - export: `SHIP_BAY_DICT_V5_SUPPLEMENT`, `lookupBayDictV5SupplementEnhanced`
- **`src/data/shipBayDict_v5_matrix.js`** (1,221 KB)
  - 311척의 row 폭 / cells_per_row / rows / maxRow / hasHold 매트릭스
  - v2 verified를 override하지 않는 보조 데이터
  - export: `SHIP_MATRIX_V5`, `getMatrixV5`, `getBayMatrix`, `getRowMaxFromMatrix`

### 수정 (M6.55)
- **`src/shipStructure.js`** — import 2개 + lookup 우선순위 정밀화 + `_v5Matrix` 첨부
- **`src/utils.js`** — APP_VERSION M6.54 → M6.55
- **`src/components/HelpModal.jsx`** — M6.55 항목 추가

### 절대 건들지 않음
- **`src/data/shipBayDict_v2.js`** — 312척 v2 일체 미수정 (NBTD/MCSC 보호)

---

## 🔍 Lookup 우선순위 (M6.55 정밀화)

```
1.  Firebase ship_bay_dict_v3 (모든 검수원 공유)
2.  userBayDict (localStorage)
2a. v2 정확 매칭 (code/IMO/callsign)           ← M6.55: 분리
2b. v5-supplement 정확 코드 (M6.55 신규)         ← M6.55: 추가
2c. v2 fuzzy 매칭 (name-fuzzy)                  ← M6.55: 분리
2d. v5-supplement fuzzy (M6.55 신규)            ← M6.55: 추가
3.  v1 사전 (legacy)
```

**정밀화 이유:** 이전엔 v2 fuzzy가 v5보다 먼저 잡혀서 `DHA → CNGS` 같은 오매칭 발생. 이제 정확 매칭이 fuzzy보다 우선 — 자동 해결.

---

## ✅ 시뮬레이션 검증 (8개 케이스)

| 선박 | 결과 | 비고 |
|---|---|---|
| KSKM | v2 verified + matrix(22 bays) | ✅ |
| NBTD | v2 verified + matrix(24 bays) | ✅ 보호 |
| MCSC | v2 verified, matrix 없음 | ✅ PDF 기반 정상 |
| PAVA | v2 verified + matrix(22 bays) | ✅ |
| DHA | v5-supplement 정확 매칭 | ★ M6.55 개선 |
| DAP | v5-supplement | ✅ 신규 |
| PCBS | v5-supplement | ✅ 신규 |
| UNKNOWN | null | ✅ 안전 fallback |

---

## ✅ 빌드 검증

| 키워드 | 회수 |
|---|---|
| M6.55 | 3 |
| v5-supplement | 2 |
| _v5Matrix | 2 |
| DBM, PCBS | 2 |

빌드 크기: M6.54 1.7 MB → M6.55 **2.6 MB (gzip 432 KB)**

---

## 🛡 보호 규칙 준수

| 규칙 | 상태 |
|---|---|
| shipBayDict_v2.js 일체 미수정 | ✅ |
| NBTD / MCSC v2 그대로 | ✅ |
| 새 데이터는 별도 파일 + fall-through | ✅ |
| Firebase 최우선 유지 | ✅ |

---

## 🚦 다음 세션 권장 작업 (우선순위)

### 1. 💡 v5 매트릭스 활용 (수확 단계)
현재 `_v5Matrix`는 첨부만 되고 표시에 사용 안 됨. 다음:
- 카고플랜 row 폭: default 8/7 → `getRowMaxFromMatrix(code, bayNum)` 실측값
- BayDictVerifyWidget: v5 매트릭스 보강 표시
- 진단: v2 verified vs v5 매트릭스 cross-check

### 2. ⚠ 6.10 포맷 hold 분리 검출 (181척 영향)
zero gap 알고리즘이 6.10에 안 통함. 다른 알고리즘 필요.

### 3. ⚠ 누락 5척 베이 번호
HAHM, KANP, RZIN, SDHI, SWIC, TSPS — 별도 분석

### 4. row 번호 ASCII 영역 디코드 (STSE @89,000)
EDI 좌표 BBBRRTT의 RR 부분. 디코드 시 EDI 좌표 검증 마지막 퍼즐.

### 5. value 3/5/7 의미 검증 (가설 단계)
KSKM STOWAGE PDF로 hatch cover 위치 대조.

---

## 🗂 영구 작업 규칙 (누적)

1. 빌드 전 시뮬레이션 절대 원칙
2. 폴더명: `m{버전없는점}_build`
3. ZIP 파일명: `M{X}_{Y}_FEATURE.zip`
4. 기준/기본을 흔들지 말 것
5. 베이사전 변경은 영구적
6. NBTD/MCSC 정밀 등록 보호
7. 카고플랜: 오른쪽 = BAY 01 (BOW)
8. ZIP 배포 = 누적 완성본
9. 모든 배포 시: APP_VERSION + HelpModal + HANDOFF
10. 큰 파일 한 번에 끝까지
11. "만들지 마세요" 시 즉시 중단
12. **M6.55: shipBayDict_v2.js 일체 미수정**

---

## 🛠 빌드 명령

```bash
cd /home/claude/app/m6_55_build
bash build.sh
```

---

## 📞 다음 세션 권장 시작 메시지

```
M6.56 인계받습니다. M6.55 베이사전 v5 통합 완료.

현 상태:
- 311척 .def 매트릭스 자동 추출 (98.4%)
- v2(312척) + v5_supplement(13척) + v5_matrix(311척) 통합
- KSKM 22 베이 정답 100% 일치 검증

권장 다음 작업:
1. v5 _v5Matrix 활용 — 카고플랜 row 폭 default(8/7) 대체
2. 6.10 포맷 hold 분리 검출 (181척)
3. 누락 5척 베이 번호 (HAHM, KANP, RZIN, SDHI, SWIC, TSPS)
4. row 번호 ASCII 영역 디코드 (STSE @89,000)

원칙 유지: 추론 금지, 실데이터 기반, NBTD/MCSC 보호.
```

---

생성일: 2026-05-20  
세션: M6.54 → M6.55
