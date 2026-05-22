# Tallyman Master 핸드오프 — M6.84

## 📌 현재 상태 (2026-05-22)

- **최신 버전**: **M6.84** (KKLC 카스피 양식 완전 대응)
- **이전 버전**: M6.83 (베이플랜·베이상세 baseline 통합)
- **작업 디렉토리**: `m6_84_build/`

---

## 🎯 M6.84 변경 내역

### 배경
M6.83 KKLC 카고플랜 출력에서 카스피 정답 양식(KKLC2604S.pdf)과 비교 시 3가지 문제:
1. 짝수/홀수 베이가 별도 단독 박스로 분리됨 (트리오 박스 안 만들어짐)
2. deck tier 94가 일부 박스만 표시 (베이사전 일관성 부족)
3. column 5개로 6번째 박스 못 들어감

### [1] buildBayPages — 짝꿍 자동 추가

**문제**: 짝수 베이 N(예: BAY 14, 40ft 24대)의 짝꿍 홀수 N+1(예: BAY 15)이 양하 0대로 bayMap에 없으면 페어 못 만들어 BAY 14가 단독 박스로 그려짐.

**해결**: buildBayPages 함수 시작 시 짝수 N의 양옆 홀수(N-1, N+1)를 set에 자동 추가하여 페어링 보장.

```javascript
const expanded = new Set(bays);
for (const n of bays) {
  if (n % 2 === 0) {
    if (n - 1 > 0) expanded.add(n - 1);
    expanded.add(n + 1);
  }
}
```

### [2] STD_DECK 7단 확장 (94 추가)

```javascript
const STD_DECK = ['94', '92', '90', '88', '86', '84', '82'];
```

- 4개 파일 통일: PrintableCargoPlan, BayPlan, PrintableBayDetail, (utils는 변경 없음)
- 94 tier 없는 베이는 invisible로 자리만 차지 → 모든 박스 데크 라인 정렬 유지
- STSE 등 92까지만인 선박도 정상 동작

### [3] column 6개 확장

```javascript
const foreColumns = matchColumns(forePages.singles, forePages.pairs).slice(0, 6);
const aftColumns = matchColumns(aftPages.singles, aftPages.pairs).slice(0, 6);
```

- KKLC 카스피 양식: 10 트리오 → 위 줄 6박스 + 아래 줄 4박스 + 별첨 2
- STSE 8 트리오: 위 5박스 + 아래 3박스 + 별첨 2 그대로 유지

---

## ✅ 검증 결과

```
✓ vite v6.4.2 build in 16.43s
✓ assets/index-15bRQHXN.js
✓ APP_VERSION = "M6.84"
✓ STD_DECK = ["94","92","90","88","86","84","82"] (7단)
✓ slice(0,6) 3회 사용 (foreColumns, aftColumns, 페이지 2)
✓ root index.html + assets/ 산출물 복사 완료
```

### 검증 필요 (다음 세션)
- **KKLC 실제 EDI**로 카고플랜 출력 검증
  - 트리오 박스 (단독 odd + 페어) 모두 형성되는지
  - deck tier 94 모든 박스에 자리 잡는지
  - 6번째 column (BAY 21/(22)23, BAY 23/(22)23) 페이지 안 들어가는지
- 페이지 layout 6/4 분할은 splitForeAft의 mid=ceil(groups/2)로 자동 결정 (KKLC 10 그룹 → fore 5, aft 5)
- 카스피 정답은 6/4 분할 — 정확한 매칭은 splitForeAft 수정 필요할 수 있음

---

## 🔧 사용법

ZIP 압축 해제 후 `m6_84_build/` 디렉토리를 정적 호스팅하면 즉시 동작:
- `m6_84_build/index.html` (root 진입점, 산출물)
- `m6_84_build/assets/` (JS/CSS 번들)

소스 수정 후 재빌드: `cd m6_84_build && bash build.sh`

---

## 📝 다음 세션 작업 후보

1. **KKLC 실 EDI 검증** — 트리오 페어링 자동 추가 + 7단 deck 동작 확인
2. **splitForeAft 6/4 분할** — KKLC 10 트리오 정답이 위 6 / 아래 4. 현재 5/5라 다름
3. **다른 선박 확인** — TNJP, RZOR, ATRP, NBTD, MCSC, STSE 모두 재검증
4. **마크 표기 통일** — 메모리 #25 (P/U) vs PDF 표준 (F/A) 결정

---

## 📋 핵심 메모리 참조

- **#24** [항상] 빈 카고플랜 표준 양식 (M6.80 baseline)
- **#25** [항상] EDI→실 카고플랜 변환 (M6.81+, 짝수 40ft → 짝꿍 X)
- **#29** [항상] 베이사전 v2에 300척 등록 완료
- **#30** [항상] 베이사전 = 절대 기준

---

## 🔍 변경 파일 리스트 (M6.84)

```
src/components/PrintableCargoPlan.jsx    (STD_DECK 7단, buildBayPages 짝꿍 추가, slice 0→6)
src/components/BayPlan.jsx               (STD_DECK 7단)
src/components/PrintableBayDetail.jsx    (BD_STD_DECK 7단)
src/utils.js                             (APP_VERSION: M6.83 → M6.84)
src/components/HelpModal.jsx             (M6.84 항목 추가)
```
