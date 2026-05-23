# Tallyman Master M6.86.6 — HANDOFF

**Date**: 2026-05-22
**Previous**: M6.86.5
**Build**: `vite v6.4.2` · 성공 · `dist/assets/index-Clw6nld2.js` (2,451 kB / gzip 436 kB)

---

## 🎯 사용자 보고

KKLC2605S 양하 카고플랜 PDF 보고 후 2건 지적:

1. **"평택것만 색칠해야 하는데 다른데것(통과)도 색칠되어 양하분 구분 안 됨"**
   - 113대 양하인데 글자(특수화물)만 약 75개 보이고 38개 일반 양하분이 색 안 보임
   - BAY (34)35는 양하 2대인데 E(엠티) 글자가 31개 → 통과 엠티까지 글자로 표시되어 양하/통과 구분 불가
   - BAY 25는 양하 5대인데 PDF에 X만 보임

2. **"통과화물에 X 표시하면 짝수40ft 홀수 shadow X와 겹쳐 자체로 버그"**
   - X 기호가 두 가지 의미로 쓰임 (shadow + 통과) → 검수원이 식별 불가

3. **"베이마다 양끝 잘림 - 동적 크기 변환 필요"**
   - `.cell { width: 16px }` 고정. KKLC BAY 21 20컬럼 × 16px = 320px > 박스폭(~183px)
   - 더 큰 선박(베이 35+)이면 더 심각

---

## 🔧 수정 내역 (M6.86.6)

### [1] getMark에 isThrough 플래그 추가

**파일**: `src/components/PrintableCargoPlan.jsx` 약 252행, 309행

```js
const ptk = isPtk(c, mode);
const isThrough = mode === 'discharge' && !ptk;  // 양하 모드 + PTK 아님 = 통과
// ...
// 양하 일반 컨: PTK일 때만 opCode 잡음 (통과는 색 없음)
if (ptk) {
  const op = String(c.op || '').toUpperCase().trim();
  if (op) opCode = op;
}
return { letter, type, isXray, pod3, podFirst, opCode, isThrough };
```

### [2] renderCell 4분기 (PTK 컬러 / 통과 회색)

**파일**: 같은 파일 약 598행

```jsx
const renderCell = (c, keyR) => {
  if (!c) return <span key={keyR} className="cell"></span>;
  if (c._shadow40) return <span key={keyR} className="cell mark-shadow">X</span>;
  const m = getMark(c, mode, xrayMap);
  // 특수화물 (R/D/F/T/A/E): 글자 + 색. 양하 통과면 through 클래스 회색.
  if (m.type) {
    const throughCls = m.isThrough ? 'through' : '';
    const cls = `cell mark-${m.letter} type-${m.type} ${m.isXray ? 'xray' : ''} ${throughCls}`;
    return <span key={keyR} className={cls}>{m.letter}</span>;
  }
  if (mode === 'loading') {
    // 선적: POD 첫 글자 + 글자색
  } else {
    if (m.isThrough) return <span key={keyR} className="cell mark-through">&nbsp;</span>;
    // PTK 양하: opColor || 기본 파랑 (#3b82f6) — 무조건 색 표시
    const opColor = (m.opCode && opColorMap[m.opCode]) || '#3b82f6';
    const style = { background: opColor + '55', borderColor: opColor, color: opColor };
    return <span key={keyR} className={cls} style={style}>&nbsp;</span>;
  }
};
```

### [3] CSS 셀 동적 폭 (A4 양끝 잘림 해결)

**파일**: 같은 파일 약 1545-1605행

```css
/* 이전 (M6.86.5): 고정 16px */
.cell { flex: 0 0 16px; width: 16px; }

/* M6.86.6: 동적 균등 분할 */
.cell {
  flex: 1 1 0; min-width: 0; width: auto;
  overflow: hidden;
}
.tier-row { display: flex; width: 100%; box-sizing: border-box; }
.grid { flex: 1 1 0; min-width: 0; }
.grid-row-wrap { width: 100%; }
.row-labels { width: calc(100% - 14px); }
.row-labels > span { flex: 1 1 0; min-width: 0; }
.hatch-break { width: 100%; }  /* 이전: 160px */

/* M6.86.6: 통과 회색 */
.cell.mark-through {
  background: #e8e8e8; border-color: #aaa;
}
.cell.through {
  background: #ececec !important;
  color: #888 !important;
  border-color: #bbb !important;
  font-weight: normal !important;
}
```

### [4] APP_VERSION + HelpModal
- `src/utils.js`: `APP_VERSION = 'M6.86.6'`
- `src/components/HelpModal.jsx`: M6.86.6 tips 최상단 추가

---

## ✅ 검증 체크리스트 (KKLC2605S 양하 113대)

- [ ] BAY (34)35: 양하 2대만 컬러, 통과 엠티 29개는 회색 E
- [ ] BAY (30)31: 양하 30대 컬러 (R 6 + 일반 24 = 30)
- [ ] BAY (26)27: 양하 52대 컬러 (R 7 + 일반 45 = 52)
- [ ] BAY 25: 양하 5대 컬러 (전부 일반 → 파랑 색 5개)
- [ ] BAY (14)15: 양하 24대 컬러 (D 1 + 일반 23 = 24)
- [ ] 합계 113대 컬러 카운트 일치
- [ ] X 표시는 짝수40ft shadow에만 (홀수 베이 양옆 슬롯 점유)
- [ ] 양끝 잘림 없이 A4 한 장 fit
- [ ] 회색(통과) + 컬러(양하) 시각 구분 명확

---

## 📁 변경 파일

```
src/components/PrintableCargoPlan.jsx  (getMark + renderCell + CSS)
src/utils.js                            (APP_VERSION M6.86.5 → M6.86.6)
src/components/HelpModal.jsx           (M6.86.6 tips 추가)
```

다른 파일 무변경.

---

## 🚀 배포 방법

**Tallyman_Master_M6866_FULL.zip** = 평소 받던 구조 (소스 + dist + 루트 빌드본). 평소처럼 풀어서 GitHub Pages에 업로드.

**Tallyman_Master_M6866_DEPLOY.zip** = 빌드본만 (index.html + assets/ + sw.js + manifest). GitHub Pages 루트에 바로 업로드용.

---

## 📝 다음 세션 작업 후보

1. **deck/hold 셀 정렬 통일** — 현재 deck/hold 컬럼 수 다르면 셀 폭 달라짐. M6.54 점선 정렬 약속 위배 가능. maxCols 기준 strict로 정렬.
2. **박스 수 동적 분배** — 베이 35+ 선박 (MCAT 등) 6열 → 7열 자동 결정.
3. **선적 카고플랜 검증** — M6.86.6은 선적 로직 무변경. 같은 원리로 정정 필요한지 PDF 검증.
4. **KKLC 양하 EDI 실제 검증** — 사용자 113대 카운트가 컬러 셀 카운트와 정확히 일치하는지 확인.
