// src/pdfBayParser.js
// PDF STOWAGE INSTRUCTION → 베이 매트릭스 추출 (pdf.js 기반) — M6.93.1
// 
// Python v3 프로토타입 포팅. PDF 자동 추출 한계:
//   - 베이 발견/페어 100%
//   - rowCount/hasZero 70-95%
//   - cells 마크 카운트만 가능 (빈 셀 PDF에 없음)
// → 사용자 검증 폼에서 보강 필수.

import * as pdfjsLib from 'pdfjs-dist/build/pdf';
// worker는 빌드 시 vite로 처리 (필요시 별도 설정)
// ★ TallyOne 1.61-02: 워커 경로를 **문서 기준 절대 URL**로 만든다.
//   사고 2026-08-13 — 검수사가 CASP 플랜 PDF 를 열자
//     `Failed to fetch dynamically imported module: .../greenmarinetally/assets/pdf.worker.min.mjs`
//   V7.94-13 이 `BASE_URL + 'pdf.worker.min.mjs'` 로 바꿔 놨는데, vite.config 의 `base: './'` 때문에
//   번들에 박히는 문자열이 **`"./pdf.worker.min.mjs"`(상대)** 다. 그 번들은 `/assets/` 안에 있으므로
//   브라우저가 `assets/pdf.worker.min.mjs` 로 풀어 404 가 났다. **파일을 루트에 둬도 안 낫는다.**
//   `document.baseURI` 는 문서(index.html·cone.html)의 위치라 Pages 하위 경로에서도 정확히 루트를 가리킨다.
pdfjsLib.GlobalWorkerOptions.workerSrc = (() => {
  try {
    const base = (typeof document !== 'undefined' && document.baseURI)
      || (typeof window !== 'undefined' && window.location?.href) || '/';
    return new URL('pdf.worker.min.mjs', base).href;
  } catch (e) {
    console.warn('[pdfBayParser] 워커 경로 계산 실패 — 상대 경로로 진행', e);
    return (import.meta.env?.BASE_URL || '/') + 'pdf.worker.min.mjs';
  }
})();

// ★ TallyOne 1.62: 베이 표기가 선사마다 앞뒤가 다르다 — **둘 다 받는다.**
//   실측 2026-08-13 (HAYN 9001E STOWAGE.PDF): `Bay 01 (02)` · `Bay 17 (18)` — 홀수 먼저, 짝수가 괄호로 뒤.
//   종전 정규식은 `(04) 05` 처럼 **짝수가 앞**인 표기만 받았고, 뒤에 `(.+)` 를 강제해
//   `01 (02)` 는 베이 번호만 겨우 잡고 **페어(02)를 통째로 놓쳤다.**
const RE_BAY_EVEN_FIRST = /^\((\d+)\)\s+(\d+)\b/;   // (02) 01
const RE_BAY_ODD_FIRST  = /^(\d+)\s+\((\d+)\)/;      // 01 (02)
const RE_BAY_PLAIN      = /^(\d+)\b/;                 // 01

function parseBayTail(tokens) {
  const s = tokens.join(' ').trim();
  if (!s) return null;
  let m = s.match(RE_BAY_ODD_FIRST);
  if (m) return { bayNum: m[1], pairEven: m[2] };
  m = s.match(RE_BAY_EVEN_FIRST);
  if (m) return { bayNum: m[2], pairEven: m[1] };
  m = s.match(RE_BAY_PLAIN);
  if (m) return { bayNum: m[1], pairEven: null };
  return null;
}

function isTwoDigit(t) { return /^\d{1,2}$/.test(t); }
function isMark(t) { return /^[XPKSBLHo]$/.test(t); }
function isTierLabel(t) { return /^\d{1,3}$/.test(t) && parseInt(t) >= 2; }

function cluster1D(values, tol) {
  if (!values.length) return [];
  const vs = [...new Set(values.map(v => Math.round(v * 10) / 10))].sort((a, b) => a - b);
  const groups = [[vs[0]]];
  for (let i = 1; i < vs.length; i++) {
    const v = vs[i];
    const last = groups[groups.length - 1];
    if (v - last[last.length - 1] <= tol) last.push(v);
    else groups.push([v]);
  }
  return groups.map(g => g.reduce((a, b) => a + b, 0) / g.length);
}

/**
 * PDF 파일 → 단어 + 좌표 배열
 * pdf.js의 좌표는 PDF 기준 (왼아래 원점), 위→아래로 변환
 */
async function extractWords(pdfFile) {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const textContent = await page.getTextContent();
  
  const words = [];
  for (const item of textContent.items) {
    if (!item.str || !item.str.trim()) continue;
    // transform: [a, b, c, d, e, f] - e=x, f=y (PDF: 좌하단 원점)
    const x = item.transform[4];
    // top = pageHeight - y - height (위→아래 변환)
    const top = viewport.height - item.transform[5] - (item.height || 8);
    const text = item.str.trim();
    // 공백 포함된 텍스트 → 분할
    const parts = text.split(/\s+/);
    if (parts.length === 1) {
      words.push({ text, x0: x, x1: x + (item.width || 8), top });
    } else {
      // 단순 추정: 공백 위치마다 분할 (정확한 좌표는 모름)
      const w = (item.width || 8) / text.length;
      let cx = x;
      for (const p of parts) {
        words.push({ text: p, x0: cx, x1: cx + p.length * w, top });
        cx += (p.length + 1) * w;
      }
    }
  }
  return { words, pageWidth: viewport.width, pageHeight: viewport.height };
}

function findAnchors(words) {
  const out = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    // 1.62: `BAY` 완전 일치 + `top >= 50` 두 조건이 이 PDF 를 통째로 걸렀다(실측 앵커 17 → 0).
    //   · 표기가 `Bay` 였다(첫 글자만 대문자). 선사마다 다르므로 대소문자를 보지 않는다.
    //   · `top >= 50` 은 헤더를 거르려던 좌표 하드코딩인데, 이 PDF 의 top 은 -148~509 라
    //     정상 베이 8개를 같이 버렸다. 'Bay' 라는 낱말은 헤더에 나오지 않으므로 좌표로 거를 이유가 없다.
    if (!/^bay$/i.test(w.text)) continue;
    const tail = [];
    for (let j = i + 1; j < Math.min(i + 8, words.length); j++) {
      const w2 = words[j];
      if (Math.abs(w2.top - w.top) < 3 && (w2.x0 - w.x1) < 100) {
        tail.push(w2.text);
      } else break;
    }
    const p = parseBayTail(tail);
    if (!p) continue;
    out.push({ x: w.x0, y: w.top, bayNum: p.bayNum, pairEven: p.pairEven });
  }
  return out;
}

function computeBoxBounds(anchors, pageWidth, pageHeight) {
  // y 행 그룹 (30px tolerance)
  const sortedY = anchors.map(a => a.y).sort((a, b) => a - b);
  const rowYs = [];
  for (const y of sortedY) {
    if (!rowYs.length || y - rowYs[rowYs.length - 1] > 30) rowYs.push(y);
  }
  // x 열 그룹 (40px tolerance)
  const sortedX = anchors.map(a => a.x).sort((a, b) => a - b);
  const colXs = [];
  for (const x of sortedX) {
    if (!colXs.length || x - colXs[colXs.length - 1] > 40) colXs.push(x);
  }
  const colStep = colXs.length >= 2 ? (colXs[colXs.length - 1] - colXs[0]) / (colXs.length - 1) : pageWidth / 5;
  const rowStep = rowYs.length >= 2 ? (rowYs[rowYs.length - 1] - rowYs[0]) / (rowYs.length - 1) : pageHeight / 4;
  return { colStep, rowStep };
}

function findTierColumn(inbox, bx0, bx1) {
  const nums = inbox.filter(w => isTierLabel(w.text));
  const groups = {};
  for (const w of nums) {
    let matched = null;
    for (const k of Object.keys(groups)) {
      if (Math.abs(w.x0 - parseFloat(k)) < 3) { matched = k; break; }
    }
    const key = matched || w.x0.toFixed(1);
    if (!groups[key]) groups[key] = [];
    groups[key].push(w);
  }
  let best = null;
  let bestCount = 0;
  for (const k of Object.keys(groups)) {
    const ws = groups[k];
    if (ws.length < 4) continue;
    const kx = parseFloat(k);
    if (kx < bx0 + 50 || kx > bx1 - 15) continue;
    const wsSorted = [...ws].sort((a, b) => a.top - b.top);
    const vals = wsSorted.map(w => parseInt(w.text));
    let resets = 0;
    for (let i = 1; i < vals.length; i++) if (vals[i] > vals[i - 1]) resets++;
    if (resets > 1) continue;
    if (ws.length > bestCount) {
      best = kx;
      bestCount = ws.length;
    }
  }
  return { tierColX: best, tierWords: best ? groups[best.toFixed(1)] || Object.values(groups).find(g => Math.abs(g[0].x0 - best) < 1) : [] };
}

function estimateRowCount(inbox, tierColX) {
  const labelWords = inbox.filter(w => 
    isTwoDigit(w.text) && !(tierColX && Math.abs(w.x0 - tierColX) < 5)
  );
  const byY = {};
  for (const w of labelWords) {
    const ykey = Math.round(w.top);
    if (!byY[ykey]) byY[ykey] = [];
    byY[ykey].push(w);
  }
  const labelRows = Object.entries(byY)
    .filter(([_, ws]) => ws.length >= 5)
    .map(([y, ws]) => ({ y: parseInt(y), ws }))
    .sort((a, b) => a.y - b.y);
  if (!labelRows.length) return { rowCount: 0, hasZero: false };
  
  const linesToUse = labelRows.length >= 2 
    ? [labelRows[0].ws, labelRows[labelRows.length - 1].ws]
    : [labelRows[0].ws];
  
  const labelXs = [];
  let hasZero = false;
  for (const ws of linesToUse) {
    for (const w of ws) {
      labelXs.push(w.x0);
      if (w.text === '00') hasZero = true;
    }
  }
  // 마크 위치도 추가 (라벨 누락 보완)
  const markXs = inbox.filter(w => isMark(w.text)).map(w => w.x0);
  let allXs = [...labelXs, ...markXs];
  if (tierColX) allXs = allXs.filter(x => Math.abs(x - tierColX) > 5);
  const clusters = cluster1D(allXs, 4);
  return { rowCount: clusters.length, hasZero };
}

function extractBay(words, anchor, colStep, rowStep) {
  const bx0 = anchor.x - 13;
  const bx1 = bx0 + colStep - 4;
  const by0 = anchor.y + 8;
  const by1 = anchor.y + rowStep - 12;
  const inbox = words.filter(w => w.x0 >= bx0 && w.x0 < bx1 && w.top >= by0 && w.top < by1);
  if (!inbox.length) return null;
  
  const { tierColX, tierWords } = findTierColumn(inbox, bx0, bx1);
  const deckTiers = [];
  const holdTiers = [];
  if (tierWords && tierWords.length) {
    const sorted = [...tierWords].sort((a, b) => a.top - b.top);
    for (const w of sorted) {
      const n = parseInt(w.text);
      if (n >= 82) deckTiers.push(n);
      else if (n <= 12) holdTiers.push(n);
    }
  }
  
  const { rowCount, hasZero } = estimateRowCount(inbox, tierColX);
  
  // cells (tier별 가로 마크 카운트, 0이면 rowCount로 기본값)
  const marks = inbox.filter(w => isMark(w.text));
  const tierYs = {};
  if (tierWords) for (const w of tierWords) tierYs[parseInt(w.text)] = w.top;
  const deckCells = deckTiers.map(t => {
    const ty = tierYs[t];
    const cnt = marks.filter(m => Math.abs(m.top - ty) < 5).length;
    return cnt > 0 ? cnt : rowCount;
  });
  const holdCells = holdTiers.map(t => {
    const ty = tierYs[t];
    const cnt = marks.filter(m => Math.abs(m.top - ty) < 5).length;
    return cnt > 0 ? cnt : rowCount;
  });
  
  return {
    bayNum: anchor.bayNum,
    pairEven: anchor.pairEven,
    rowCount,
    hasZero,
    deckTiers,
    holdTiers,
    deckCells,
    holdCells,
  };
}

/**
 * PDF File → 베이 매트릭스
 * @param {File} pdfFile - 사용자가 업로드한 PDF
 * @returns {Promise<{shipName, voy, bays: [...]}>}
 */
// ★ TallyOne 1.62: 페어 표기를 **정본 방향으로 되돌린다** (검수사 교정 2026-08-13).
//   검수사 원문: *"`01(02) · 03 · 05(06) · 07 · 09(10)` 는 **기본 구조가 아닙니다.**
//     자동으로 **(2)3 으로 바꿔야** 합니다."*
//
//   도메인 정본(지침서): **베이 페어링 = 짝수 + 뒤 홀수. 방향은 항상 `(작은 짝수)(큰 홀수)`.**
//   그런데 선사 PDF 는 `Bay 01 (02)` 처럼 **홀수 뒤에 짝수**를 적어 온다(HAYN 9001E 실측).
//   같은 40ft 자리를 반대로 쓴 것이라, 그대로 두면 앱의 페어 판정이 통째로 어긋난다.
//   `01` 에 붙은 `02` 는 실제로 **`03` 의 페어**다 — 02 는 01 과 03 사이에 있기 때문이다.
//   → 짝수 E 가 자기 베이 번호 +1 이면 E+1 홀수 베이로 옮긴다. 그 홀수가 목록에 없으면 그대로 둔다
//     (없는 자리를 지어내지 않는다).
function normalizePairs(bays) {
  if (!Array.isArray(bays) || bays.length === 0) return;
  const byNum = new Map(bays.map(b => [parseInt(b.bayNum, 10), b]));
  for (const b of bays) {
    const self = parseInt(b.bayNum, 10);
    const even = parseInt(b.pairEven, 10);
    if (!Number.isFinite(self) || !Number.isFinite(even)) continue;
    if (even !== self + 1) continue;              // 이미 정본 방향이거나 무관 — 건드리지 않는다
    const target = byNum.get(even + 1);
    if (!target) continue;                        // 짝이 될 홀수 베이가 없다 — 그대로 둔다
    target.pairEven = b.pairEven;
    b.pairEven = null;
  }
}

export async function parsePdfStowage(pdfFile) {
  const { words, pageWidth, pageHeight } = await extractWords(pdfFile);
  
  // 헤더 (선박명/항차)
  //   1.62: 종전엔 `top 40~50` 이라는 좌표를 박아 뒀다 — 이 PDF 에서는 그 범위가 **비어 있어**
  //     선박명이 통째로 안 잡혔다(화면에 코드만 떴다). 좌표 대신 **`VOY` 가 있는 줄**을 찾는다.
  let shipName = '';
  let voy = '';
  const voyWord = words.find(w => /^VOY$/i.test(w.text));
  if (voyWord) {
    const line = words.filter(w => Math.abs(w.top - voyWord.top) < 4).sort((a, b) => a.x0 - b.x0);
    const lineText = line.map(w => w.text).join(' ');
    const idxVoy = lineText.toUpperCase().indexOf('VOY');
    if (idxVoy > 0) shipName = lineText.substring(0, idxVoy).trim();
    const m = lineText.match(/NO\s*:?\s*(\S+)/i);
    if (m) voy = m[1];
  }
  
  const anchors = findAnchors(words);
  const { colStep, rowStep } = computeBoxBounds(anchors, pageWidth, pageHeight);
  
  const bays = [];
  for (const a of anchors) {
    const b = extractBay(words, a, colStep, rowStep);
    if (b) bays.push(b);
  }

  normalizePairs(bays);
  return { shipName, voy, bays, _meta: { colStep, rowStep, anchorCount: anchors.length } };
}
