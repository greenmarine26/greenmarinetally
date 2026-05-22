# Tallyman Master M6.86.4 — HANDOFF

**Date**: 2026-05-22
**Previous**: M6.86.3
**Build**: `vite v6.4.2` · 성공 · `dist/assets/index-DvvizN0d.js` (2,444 kB / gzip 432 kB)

---

## 🎯 사용자 보고

> "이파일들이 잘못되었습니다. 뭐가 잘못되었는지 분석 바랍니다. 약속된 플랜 작업방식을 무시하고 만듬"

KKLC 카스피 469컨 카고플랜 (M6.86.3) 출력에서 다음 6건이 약속(메모리 #2 + #24) 위반.

| # | 위반 항목 | 약속 |
|---|---|---|
| 1 | 모든 베이 카운트 0/0/0 | 베이당 실제 컨 수 표시 |
| 2 | "총 0대" 표시 (실제 469대) | 전체 컨 수가 한눈에 |
| 3 | PUS/MIP/SGN/PTK/BS POD 3자가 셀에 박힘 (legend엔 없음) | 마크는 o/X/R/D/F/T/A/E 표준만 |
| 4 | BAY 33, 37 박스 높이가 BAY 21과 달라 정렬 깨짐 | "실제 없는 자리는 invisible (자리만, 모든 박스 정렬)" |
| 5 | 마크 letter (F=FR, A=OT) | 메모리 #24 원본 P/U와 다름 — 사용자 위임으로 F/A 유지 |
| 6 | 별첨1 (선사별), 별첨2 (화물종류별) 부재 | 별첨 영역 필수 |

---

## 🔧 수정 내역 (M6.86.4)

### [1] 베이 카운트 = 전체 컨 (PTK + 통과)

**파일**: `src/components/PrintableCargoPlan.jsx` (BayBox 내부, 약 538행)

```jsx
// 이전 (M6.86.3 회귀 버그)
const cnt = { c20: 0, c40: 0, c45: 0 };
allConts.forEach(c => {
  if (!isPtk(c, mode)) return;   // ← 통과 컨은 제외 → KKLC 전부 0
  const sz = sizeOf(c);
  cnt[sz === '45' ? 'c45' : sz === '40' ? 'c40' : 'c20']++;
});

// M6.86.4
const cnt = { c20: 0, c40: 0, c45: 0 };
const cntPtk = { c20: 0, c40: 0, c45: 0 };
allConts.forEach(c => {
  const sz = sizeOf(c);
  const k = sz === '45' ? 'c45' : sz === '40' ? 'c40' : 'c20';
  cnt[k]++;
  if (isPtk(c, mode)) cntPtk[k]++;
});
```

**효과**: 베이 헤더에 베이 전체 컨 수 표시. PTK/통과 구분 정보는 좌측 하단 통계 박스에서 별도 표시.

### [2] 좌측 하단 "총 N대" = grandTotal

**파일**: 같은 파일, statsBox 블록 (약 983행)

```jsx
// M6.86.4
const totalPtk     = totalCounts.total.c20 + totalCounts.total.c40 + totalCounts.total.c45;
const totalTransit = totalCounts.transitTotal;
const totalAll     = totalCounts.grandTotal;
```

표시:
```
20'/40'/45'
총 N대                                ← grandTotal
적재 X / 통과 Y                       ← 신규 stats-breakdown
20DC ... 40HC ...
o 적재  X 통과  R 리퍼 ... E 엠티
```

`stats-transit` 블록은 제거 (정보 중복 회피).

### [3] POD 3자 셀 표기 제거 (메모리 #24 표준 마크 복귀)

**파일**: 같은 파일, `getMark` 함수 (약 260행)

```js
// 이전 (M6.65~M6.86.3)
} else {
    if (mode === 'loading' && c.pod) {
      baseLetter = POD 3자 (PUS/MIP/SGN/PTK/BS);   // ← legend에 없음
    } else {
      baseLetter = 'X';
    }
}

// M6.86.4
} else {
    // 통과(평택 미관여)는 항상 'X' 단일. POD 3자 표기 제거.
    baseLetter = 'X';
}
```

**유지**: PTK 적재 컨의 `pod3` (POD 색상용)은 그대로. 즉 평택 출발 컨은 'L' 글자 + POD 색상으로 목적지 가독성 유지. 통과만 깔끔한 X.

### [4] 박스 정렬 회복 (M6.86.1 동작 복원)

**파일**: 같은 파일

(a) `STD_HOLD` baseline 복귀 (약 444행):
```js
const allTiersSet = Array.from(new Set([
  ...STD_DECK,
  ...STD_HOLD,   // ← M6.86.4 복귀. 모든 박스 동일 deck 7단 + hold 4단.
  ...pageBayDictTiers.deck,
  ...pageBayDictTiers.hold,
  ...
]));
```

(b) `area-invisible` 클래스 적용 제거 (약 576, 606행):
```jsx
// 이전: <div className={`hold-area ${!hasHold ? 'area-invisible' : ''}`}>
// M6.86.4: <div className="hold-area">
```

**효과**: BAY 33, 37 단독 박스도 BAY 21과 동일한 deck 7단 + hold 4단 구조. 컨 없는 자리는 셀 border만 (visibility:hidden 없음).

**M6.86.3 변경과의 관계**: M6.86.3은 "가짜 hold 자리(33-39)" 문제 해결을 위해 `STD_HOLD`를 제거했으나, 영역 통째 invisible은 메모리 #24 "모든 박스 정렬" 원칙 위배. M6.86.4의 해법은 "영역은 항상 보이되 셀은 비어있는 border만"이라 정렬도 유지하고 가짜 컨테이너 자리 환상도 없음 (실 컨테이너 없으면 마크 없음).

### [5] F=FR, A=OT 유지

Legend에 이미 정착한 letter 그대로. 메모리 #24의 P/U와는 다르지만 사용자 위임("5는 어느것이든 문제 없음").

### [6] 별첨1·별첨2 페이지 신설

**파일**: 같은 파일, 메모 + JSX + CSS 모두 추가.

(a) 메모 (약 906행):
- `carrierBreakdown` — `c.op` (NAD+CA / NAD+CF / 엑셀 operator) 별로 `{ '20F', '20E', '40F', '40E', '45F', '45E', total, ptk, transit }`
- `cargoTypeBreakdown` — 우선순위(DG > Reefer > FR > Tank > OT > 엠티 > 일반)별로 `{ ptk, transit, total }`. mark 키 포함(R/D/F/T/A/E/o)으로 베이마크 셀 색상과 동일 표시.

(b) JSX (특수화물 페이지 뒤, 별첨 페이지 추가):
- 별첨1 — `<table className="appendix-carrier">`. 행: 선사별 + 합계 행
- 별첨2 — `<table className="appendix-type">`. 행: 종류별(7행) + 합계 행. mark 셀은 `<span className="cell mark-X">`로 베이마크 색상 그대로

(c) CSS:
- `.appendix-page` — A4 landscape 291mm × 204mm
- `.appendix-grid` — 2fr 1fr (별첨1 넓게, 별첨2 좁게)
- `.appendix-table` — 9pt, border-collapse, totals-row 강조
- `.appendix-page @media print` — page-break-before

### 버전 + HelpModal

- `src/utils.js`: `APP_VERSION = 'M6.86.4'`
- `src/components/HelpModal.jsx`: M6.86.4 tips 최상단 항목 추가 (M6.86.3 이전 항목 그대로 유지)

---

## ✅ 검증 체크리스트 (KKLC2605S 469컨)

다음 항목은 카고플랜 출력으로 확인:

- [ ] 베이 헤더에 0 아닌 실제 컨 수 표시 (예: `BAY (22)23 5/12/0` 같은 형태)
- [ ] 좌측 하단 "총 469대" 표시 + 그 아래 "적재 0 / 통과 469"
- [ ] 셀에 PUS/MIP/SGN/PTK/BS 안 박혀 있음 — 모두 X 또는 R/D/F/T/A/E
- [ ] BAY 33, 37 단독 박스 높이가 BAY 21 단독 박스와 동일
- [ ] BAY 33, 37 hold 영역에 빈 셀 4단 보임 (자리만, 컨 없음)
- [ ] 2페이지 별첨 — 선사별 표 + 화물종류별 표
- [ ] 인쇄 시 별첨 페이지가 새 페이지로 분리 (page-break-before)

일반 평택 항차(STSE, TNJP 등)에서도 동작 동일:
- [ ] PTK 적재 컨은 'L' + POD 색상으로 표시
- [ ] PTK 양하 컨은 'o' 마크
- [ ] 베이 카운트는 베이 전체 컨 (PTK 비중 다수)
- [ ] 통과 0대면 좌측 하단 "적재 N / 통과 0"

---

## 📁 변경 파일

```
src/components/PrintableCargoPlan.jsx  (6건 모두 — getMark, BayBox cnt, area-invisible 제거, statsBox, 별첨 페이지, CSS)
src/utils.js                            (APP_VERSION M6.86.3 → M6.86.4)
src/components/HelpModal.jsx           (M6.86.4 tips 추가)
```

다른 파일 무변경.

---

## 🚀 배포 방법

ZIP 풀면 `tallyman_m6864/` 한 디렉토리에 **소스 + 빌드 산출물(dist) + build.sh + HANDOFF**가 모두 들어있습니다.

### A. 빌드 산출물 즉시 배포

`tallyman_m6864/dist/` 디렉토리를 정적 호스팅(Firebase Hosting 등)에 그대로 업로드:
- `dist/index.html`
- `dist/assets/index-DvvizN0d.js`
- `dist/assets/index-DpKEwH0I.css`
- `dist/manifest.webmanifest`
- `dist/sw.js`

별도 빌드 없이 즉시 배포 가능.

### B. 소스 수정 후 재빌드

`tallyman_m6864/` 안에서:
```bash
bash build.sh
```

산출물은 `dist/`에 새로 생성됨. `dist/` 통째로 정적 호스팅에 업로드.

수동 빌드는:
```bash
npm install
npx vite build
```

---

## 📝 다음 세션 작업 후보

1. **별첨 페이지 페이지 분리 미세조정** — 선사 수가 많을 때(50+) 별첨1이 한 페이지 넘칠 수 있음. `page-break-inside: avoid` 또는 자동 분할.
2. **별첨2 mark 셀 표시 검증** — `.cell.mark-X` 등이 인라인 span에 적용될 때 색상이 정확히 나오는지 인쇄 결과로 확인.
3. **KKLC LAEM CHABANG (D5MP9) .def 등록** — M6.86.3 한계 보완. 정확한 hold/deck 구조 + row 분포 학습.
4. **빈 컬럼 placeholder 시각화** — 현재 col-placeholder는 빈 공간. 가능하면 가벼운 dashed border로 자리 표시.
5. **마크 P=FR, U=OT 복귀 검토** — 메모리 #24 원본 letter로 복귀할지 (현재 F/A 정착). 향후 사용자 확인 시 변경.
