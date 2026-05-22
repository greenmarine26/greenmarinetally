# Tallyman Master 핸드오프 — M6.85

## 📌 현재 상태 (2026-05-22)

- **최신 버전**: **M6.85** (BAY (00)01 잘못 페어링 버그 수정)
- **이전 버전**: M6.84 (KKLC 카스피 양식 + STD_DECK 7단)
- **작업 디렉토리**: `m6_85_build/`

---

## 🚨 M6.84 버그 수정

### 사용자 발견 증상
KKLC 카고플랜 출력에서:
1. BAY (00)01 페어가 셋째 줄에 별도 박스로 표시됨 (존재하지 않는 베이)
2. 상단 짝꿍 베이 (BAY (18)19, (14)15, (10)11, (06)07, (02)03)가 새 row로 분리되어 박스 높이 절반으로 줄어듦
3. BAY 01 single이 사라짐 (column 매칭 깨짐)

### 원인
- `dictBayList` 또는 `bayMap`에 BAY 0이 포함됨
- `buildBayPages`가 BAY 0을 짝수로 처리 → 짝꿍 BAY 1과 페어 `{even: 0, odd: 1}` 생성
- `used.add(1)`로 BAY 01 single이 후속 loop에서 제외
- `matchColumns` 결과 column 6개 → render `.five-col`과 불일치로 6번째 다음 row로 밀림

### M6.84의 부수 문제
- `slice(0, 6)` 시도가 `.bay-row.five-col` CSS와 불일치
- 6번째 column이 다음 row로 밀려 layout 추가 깨짐

---

## 🔧 M6.85 수정 내역

### [1] BAY 0 무효 베이 차단 (3곳)

**`bayList` useMemo:**
```javascript
if (dictBayList && dictBayList.length > 0) {
  return [...dictBayList].filter(n => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
}
return Object.keys(bayMap).map(b => parseInt(b, 10)).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b);
```

**`splitForeAft`:**
```javascript
const validBayList = bayList.filter(n => Number.isFinite(n) && n > 0);
if (validBayList.length === 0) return { fore: [], aft: [] };
```

**`buildBayPages`:**
```javascript
const validBays = bays.filter(n => Number.isFinite(n) && n > 0);
const expanded = new Set(validBays);
...
const expandedBays = [...expanded].filter(n => n > 0).sort((a, b) => a - b);
```

### [2] column slice 5로 되돌림

M6.84의 `slice(0, 6)` 시도는 `.bay-row.five-col` CSS와 불일치. BAY 0 필터링 후 BAY 01이 정상 single로 분류되어 5 column 안에 들어감.

```javascript
const foreColumns = matchColumns(forePages.singles, forePages.pairs).slice(0, 5);
const aftColumns = matchColumns(aftPages.singles, aftPages.pairs).slice(0, 5);
```

### [3] APP_VERSION + HelpModal

- `APP_VERSION = 'M6.85'`
- HelpModal에 M6.85 항목 추가

---

## ✅ 유지된 M6.84 변경 사항

- **STD_DECK 7단** `['94','92','90','88','86','84','82']` (PrintableCargoPlan, BayPlan, PrintableBayDetail)
- **buildBayPages 짝꿍 자동 추가** (양하 0대 짝꿍 홀수도 페어 박스 만듦)
- **STD_HOLD 4단** `['08','06','04','02']` 그대로

---

## ✅ 검증 결과

```
✓ vite v6.4.2 build success
✓ assets/index-CG9dGuSs.js
✓ APP_VERSION = "M6.85"
✓ n>0 필터링 2회 (bayList, validBays/validBayList)
✓ root index.html + assets/ 산출물 복사 완료
```

### 검증 필요 (다음 세션)
- **KKLC 실 EDI**로 카고플랜 재출력 확인
  - BAY (00)01 사라졌는지
  - BAY 01 single이 우측 마지막 column에 정상 표시되는지
  - 상단 짝꿍 베이들 (BAY 18/19, 14/15 등) 박스 높이 정상인지
- **STSE 재검증** (BAY 0 필터링이 STSE 기존 동작 안 깨뜨리는지)

### 미파악
- BAY 0이 어떻게 dictBayList/bayMap에 들어갔는지 정확한 출처
- EDI 측 (LOC+147+0000XXX) 가능성 or 베이사전 v2 등록 오류
- 별도 진단 시 console.log 추가 권장 (dictBayList 직접 확인)

---

## 🔧 사용법

ZIP 압축 해제 후 `m6_85_build/` 디렉토리를 정적 호스팅:
- `m6_85_build/index.html` (산출물)
- `m6_85_build/assets/index-CG9dGuSs.js`

소스 수정 후 재빌드: `cd m6_85_build && bash build.sh`

---

## 📝 다음 세션 작업 후보

1. **KKLC 실 EDI 검증** — BAY 0 필터링 효과 직접 확인
2. **다른 선박 재검증** — STSE, TNJP, RZOR, ATRP, NBTD, MCSC
3. **카스피 정답 분할 매칭** — splitForeAft mid를 KKLC 양식(6/4)에 맞게 수정 검토
4. **BAY 0 출처 진단** — EDI 파싱 또는 베이사전 v2 데이터 확인

---

## 🔍 변경 파일 리스트 (M6.85)

```
src/components/PrintableCargoPlan.jsx   (bayList/splitForeAft/buildBayPages 3곳 BAY 0 필터링 + slice 6→5)
src/utils.js                            (APP_VERSION: M6.84 → M6.85)
src/components/HelpModal.jsx            (M6.85 항목 추가)
```
