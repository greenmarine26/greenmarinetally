// 엑셀 파일 안에 인쇄 설정(용지·방향·한 쪽 맞춤·쪽 나눔 줄)을 직접 써 넣는다 — 쓰는 라이브러리(SheetJS·xlsx-js-style)가 pageSetup 을 파일에 안 쓰기 때문이다.
//   검수사 2026-10-05 «엑셀에서도 한장으로 나오게끔 맞춰주세요» — 종전엔 `ws['!pageSetup']` 을 넣어도 시트 XML 에 안 들어가 엑셀이 세로 A4 11쪽으로 찍었다(라이브 R109E 실측).
//   방법 — 만든 파일(zip)을 열어 시트 XML 에 «sheetPr/pageSetUpPr · printOptions · pageMargins · pageSetup · rowBreaks» 를 스키마 순서대로 넣고 다시 묶는다.
//   · 한 쪽 맞춤(fit) — 선사 덱플랜(rzdf) 실물과 같다: sheetPr/pageSetUpPr fitToPage=1 + pageSetup paperSize=9 orientation=landscape(맞춤 쪽 수 1×1).
//   · 배율(scale)+쪽 나눔(breaks) — 마감텔리 STOWAGE PLAN 실물(R106W)과 같다: scale=60 · 가로 A4 · 여백 0.39인치 · 가운데 맞춤 · 덱 블록 사이 쪽 나눔(엑셀은 «맞춤» 을 쓰면 쪽 나눔 줄을 무시한다).
//     scale 은 «상한» 이다(fitWidth) — 쓰는 라이브러리(xlsx-js-style)는 칸 너비를 실물(R106W)보다 넓게 써서(같은 그림이 1.3배) 배율 60 이면 가로로 두 쪽에 걸린다. 시트 XML 의 열 너비 합으로 «가로 한 쪽에 들어가는 배율» 을 구해 60 과 작은 쪽을 쓴다(2026-10-05 LibreOffice 실측 6쪽 → 3쪽).
//   순수 문자열 함수(sheetXmlWithPrintSetup)와 zip 을 다루는 함수(applyXlsxPrintSetup)를 나눠 노드 시험이 같은 코드를 그대로 부른다.

const AFTER_PAGESETUP = ['<headerFooter', '<rowBreaks', '<colBreaks', '<customProperties', '<cellWatches', '<ignoredErrors', '<smartTags', '<drawing',
  '<legacyDrawing', '<legacyDrawingHF', '<picture', '<oleObjects', '<controls', '<webPublishItems', '<tableParts', '<extLst', '</worksheet>'];

/**
 * 열 너비 합(시트 XML 의 <col width>)이 가로 한 쪽에 들어가는 배율(%) — A4(9) 가로·세로만 안다. 모르면 null.
 *  엑셀은 열 너비(글자 수) × 7(기본 글꼴 Calibri 11 의 한 글자 폭 px) = 화면 픽셀, 96dpi 로 인치를 구한다. 1%p 는 여유로 뺀다.
 */
export function widthFitScale(xml, o = {}) {
  const paper = Number.isInteger(o.paper) ? o.paper : 9;
  if (paper !== 9) return null;
  const m = Number.isFinite(o.margin) ? o.margin : 0.3937;
  const pageW = o.orientation === 'portrait' ? 8.27 : 11.69;
  let sum = 0, any = false;
  for (const c of String(xml).matchAll(/<col\b[^>]*>/g)) {
    const mn = /\bmin="(\d+)"/.exec(c[0]), mx = /\bmax="(\d+)"/.exec(c[0]), w = /\bwidth="([\d.]+)"/.exec(c[0]);
    if (!mn || !mx || !w) continue;
    sum += (Number(mx[1]) - Number(mn[1]) + 1) * Number(w[1]); any = true;
  }
  if (!any || !(sum > 0)) return null;
  return Math.max(10, Math.floor(((pageW - 2 * m) / (sum * 7 / 96)) * 100) - 1);
}

/**
 * 시트 XML 한 장에 인쇄 설정을 넣어 돌려준다.
 * @param {string} xml  xl/worksheets/sheetN.xml 글자
 * @param {object} o    { orientation:'landscape'|'portrait', paper:9(A4), margin:인치, centered:bool,
 *                        fit:true(한 쪽 맞춤) | scale:정수(%)[+fitWidth:true — 열 너비 합이 가로 한 쪽을 넘으면 배율을 낮춘다(scale 이 상한)], breaks:[행번호…](1부터, 그 행 아래에서 쪽을 나눈다) }
 */
export function sheetXmlWithPrintSetup(xml, o = {}) {
  let s = String(xml);
  const orient = o.orientation === 'portrait' ? 'portrait' : 'landscape';
  const paper = Number.isInteger(o.paper) ? o.paper : 9;
  const m = Number.isFinite(o.margin) ? o.margin : 0.3937;
  const breaks = (Array.isArray(o.breaks) ? o.breaks : []).filter((r) => Number.isInteger(r) && r > 0).sort((a, b) => a - b);
  // 1 라이브러리가 이미 쓴 쪽 설정 요소는 걷어낸다(pageMargins 하나만 쓴다 — 두 번 있으면 엑셀이 «복구» 창을 띄운다)
  s = s.replace(/<printOptions\b[^>]*\/>/g, '').replace(/<pageMargins\b[^>]*\/>/g, '').replace(/<pageSetup\b[^>]*\/>/g, '').replace(/<rowBreaks\b[\s\S]*?<\/rowBreaks>/g, '');
  // 2 한 쪽 맞춤은 sheetPr 안 pageSetUpPr — 시트 XML 맨 앞(dimension 앞)
  if (o.fit) {
    if (/<sheetPr\b[^>]*\/>/.test(s)) s = s.replace(/<sheetPr\b([^>]*)\/>/, '<sheetPr$1><pageSetUpPr fitToPage="1"/></sheetPr>');
    else if (/<sheetPr\b/.test(s)) { if (!/<pageSetUpPr\b/.test(s)) s = s.replace('</sheetPr>', '<pageSetUpPr fitToPage="1"/></sheetPr>'); else s = s.replace(/<pageSetUpPr\b[^>]*\/>/, '<pageSetUpPr fitToPage="1"/>'); }
    else s = s.replace(/(<worksheet\b[^>]*>)/, '$1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
  }
  // 3 넣을 요소(스키마 순서: printOptions → pageMargins → pageSetup → … → rowBreaks)
  let pre = '';
  if (o.centered) pre += '<printOptions horizontalCentered="1"/>';
  pre += `<pageMargins left="${m}" right="${m}" top="${m}" bottom="${m}" header="0" footer="0"/>`;
  let scale = Number.isInteger(o.scale) ? o.scale : null;
  if (!o.fit && scale && o.fitWidth) { const w = widthFitScale(s, { paper, margin: m, orientation: orient }); if (w && w < scale) scale = w; }   // 열이 넓으면 가로 한 쪽에 맞게 낮춘다(상한은 scale)
  pre += `<pageSetup paperSize="${paper}"${o.fit ? '' : (scale ? ` scale="${scale}"` : '')} orientation="${orient}"${o.fit ? ' fitToWidth="1" fitToHeight="1"' : ''}/>`;
  const brk = breaks.length ? `<rowBreaks count="${breaks.length}" manualBreakCount="${breaks.length}">${breaks.map((r) => `<brk id="${r}" max="16383" man="1"/>`).join('')}</rowBreaks>` : '';
  // 4 넣는 자리 — 병합·하이퍼링크 뒤, headerFooter·ignoredErrors·drawing 등 앞
  const at = (list) => { let best = -1; for (const t of list) { const i = s.indexOf(t); if (i >= 0 && (best < 0 || i < best)) best = i; } return best; };
  const iPre = at(AFTER_PAGESETUP);
  if (iPre < 0) throw new Error('시트 XML 에 넣을 자리를 못 찾음(</worksheet> 없음)');
  s = s.slice(0, iPre) + pre + s.slice(iPre);
  if (brk) {
    const hf = /<headerFooter\b[^>]*?(?:\/>|>[\s\S]*?<\/headerFooter>)/.exec(s);
    if (hf) s = s.slice(0, hf.index + hf[0].length) + brk + s.slice(hf.index + hf[0].length);
    else { const iBrk = at(AFTER_PAGESETUP.slice(2)); s = s.slice(0, iBrk) + brk + s.slice(iBrk); }   // headerFooter 가 없으면 방금 넣은 pageSetup 바로 뒤
  }
  return s;
}

/**
 * 만든 엑셀(XLSX.write(wb,{bookType:'xlsx',type:'array'}) 결과)의 시트마다 인쇄 설정을 넣어 새 바이트(Uint8Array)로 돌려준다.
 * @param {object} XLSX    SheetJS 계열(CFB 를 가진 것 — xlsx · xlsx-js-style)
 * @param {ArrayBuffer|Uint8Array|number[]} bytes
 * @param {object[]} sheets 시트 순서대로의 설정(sheetXmlWithPrintSetup 의 o). 시트가 더 많으면 마지막 설정을 쓴다.
 */
export function applyXlsxPrintSetup(XLSX, bytes, sheets) {
  const CFB = XLSX && XLSX.CFB;
  if (!CFB || !CFB.read || !CFB.write) throw new Error('엑셀 라이브러리에 CFB(zip) 가 없습니다 — 인쇄 설정을 못 넣었습니다');
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const cfb = CFB.read(u8, { type: 'array' });
  const dec = new TextDecoder('utf-8'), enc = new TextEncoder();
  let n = 0;
  for (;;) {
    const f = CFB.find(cfb, `/xl/worksheets/sheet${n + 1}.xml`);
    if (!f) break;
    const cfg = (sheets && sheets[Math.min(n, sheets.length - 1)]) || {};
    const next = enc.encode(sheetXmlWithPrintSetup(dec.decode(Uint8Array.from(f.content)), cfg));
    f.content = next; f.size = next.length;
    n += 1;
  }
  if (!n) throw new Error('시트 XML 을 못 찾았습니다 — 인쇄 설정을 못 넣었습니다');
  const out = CFB.write(cfb, { fileType: 'zip', type: 'array' });
  return out instanceof Uint8Array ? out : new Uint8Array(out);
}

/** 바이트를 .xlsx 파일로 내려받는다(브라우저). */
export function downloadXlsxBytes(bytes, name) {
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
}
