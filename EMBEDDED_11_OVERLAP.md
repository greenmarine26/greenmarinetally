# 임베드 11척 ↔ M4.4 일괄 분석 중복 검사

## 매칭 결과

### 11척 중 일괄 분석에 포함된 선박: 10척

| 코드 | 선박명 | CASP 버전 | 베이 | 등급 |
|------|--------|-----------|------|------|
| ATPR | ATPRATLANTIC PIONEER    D5RR5 | 6.10 | 21 | semi-verified |
| DJCF | DJCFDONGJIN CONFIDENT   D7XF  444003139 | 6.10 | 28 | semi-verified |
| DPRT | DPRTPEGASUS PROTO                 V7A5459 | 6.50 | 29 | partial |
| DXQD | DXQDXIN QUN DAO                   H3OI | 6.50 | 19 | verified |
| NBTD | NBTDNINGBO TRADER                 V7A4949 | 6.50 | 23 | verified |
| NSFR | NSFRSTAR FRONTIER                 V7A2849 | 6.50 | 22 | verified |
| SWSP | SWSPSAWASDEE SPICA                V7A623 | 6.50 | 28 | verified |
| TMPZ | TMPZTIANHAI PINGZE      5LAD3 | 6.10 | 28 | partial |
| LYTJ | LYTJTEN JUPITER                   3E84709 | 6.50 | 25 | verified |
| XTPG | XTPGXIN TAI PING        BSDU | 6.10 | 20 | semi-verified |

### 11척 중 일괄 분석에 없는 선박: 1척

S639

### 일괄 분석에서 새로 추가된 선박: 313척

→ **순수 신규 등록 가능 선박: 313척**
→ **베이사전 총 갯수: 11(기존) + 313(신규) = 324척으로 확장 가능**

(단, 임베드 11척은 미검증이므로 v2.0 이행 시 verified 등급 데이터로 덮어쓰기 권장)

## 권장 이행 경로

### Plan A: 점진적 (안전)
1. 기존 `shipBayDict.js` (v1.1) 그대로 유지
2. `userBayDict.js`에 일괄 import (323척 → localStorage)
3. `shipStructure.js`는 이미 userDict 우선 → 자동으로 검증된 데이터 사용

### Plan B: 임베드 갱신 (권장, 더 안정적)
1. `shipBayDict_v2.js`로 교체 (verified 109척만 임베드)
2. localStorage 한도 부담 제거
3. 앱 재배포 1회 → 모든 검수원 폰에 즉시 반영
