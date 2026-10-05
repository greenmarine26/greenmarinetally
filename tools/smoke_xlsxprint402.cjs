// 4.04-02 연막검사 — RZOR 엑셀(양하 카고플랜 · 선적 마감텔리 양식)이 파일 안에 인쇄 설정을 갖는다: 가로 A4 · 덱마다 한 쪽(양하) · 쪽 나눔(선적).
//   검수사 2026-10-05 «엑셀에서도 한장으로 나오게끔 맞춰주세요» — 쓰는 라이브러리(SheetJS·xlsx-js-style)가 pageSetup 을 파일에 안 써서 세로 A4 11쪽으로 찍혔다(라이브 R109E 실측).
//   기대값은 앱 함수가 아니라 **선사·마감텔리 실물 파일의 시트 XML**(R106E 선사 rzdf: fitToPage · 가로 A4 / R106W 마감텔리: scale 60 · 가로 A4 · 쪽 나눔 49·98)에서 따로 읽는다.
//   실파일 tools/fixtures/rzor_rzdf_R109E.xls(선사 원본) · rzor_plan_R106W.xlsx(마감텔리) 를 앱 파서로 읽어 앱이 쓰는 그대로 만들고, 만든 파일(zip)을 열어 시트 XML 을 직접 잰다.
//   ⚠ 엑셀(Microsoft)이 «복구» 창을 띄우는지는 여기서 못 잰다 — 요소 순서(스키마)·중복·XML 짜임까지 잰다. 쪽 수는 LibreOffice 로 따로 확인했다(인계함).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'xlsxprint_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const fx = (p) => path.join(ROOT, 'tools', 'fixtures', p);

const ENTRY = path.join(TMP, 'entry.js');
fs.writeFileSync(ENTRY, `export { parseDeckPlanWorkbook, parseCheckerPlanWorkbook } from "${ROOT}/src/rzorPlan.js";
export { sheetXmlWithPrintSetup, applyXlsxPrintSetup, widthFitScale } from "${ROOT}/src/xlsxPrintSetup.js";
export { buildCarrierPlanWorkbook, CARRIER_XLSX_PRINT } from "${ROOT}/src/rzorPlanExcelCarrier.js";
export { buildCheckerPlanWorkbook, CHECKER_XLSX_PRINT } from "${ROOT}/src/rzorPlanExcel.js";\n`);
const OUT = path.join(TMP, 'xp.cjs');
const stub = './tools/stub_fbdb_mem.js';
execSync(`npx esbuild "${ENTRY}" --bundle --platform=node --format=cjs --loader:.js=jsx --jsx=automatic --alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} `
  + `--define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${OUT}"`, { cwd: ROOT, stdio: 'pipe' });
const M = require(OUT);
const XLSX = require(path.join(ROOT, 'node_modules', 'xlsx'));
const { JSDOM } = require(path.join(ROOT, 'node_modules', 'jsdom'));
const readWb = (p) => XLSX.read(fs.readFileSync(p), { type: 'buffer', cellStyles: true });

//  OOXML 스키마가 정한 worksheet 자식 순서(앞쪽만 — 여기서 만나는 것들)
const ORDER = ['sheetPr', 'dimension', 'sheetViews', 'sheetFormatPr', 'cols', 'sheetData', 'sheetCalcPr', 'sheetProtection', 'protectedRanges', 'scenarios', 'autoFilter', 'sortState', 'dataConsolidate', 'customSheetViews',
  'mergeCells', 'phoneticPr', 'conditionalFormatting', 'dataValidations', 'hyperlinks', 'printOptions', 'pageMargins', 'pageSetup', 'headerFooter', 'rowBreaks', 'colBreaks', 'customProperties', 'cellWatches', 'ignoredErrors',
  'smartTags', 'drawing', 'legacyDrawing', 'legacyDrawingHF', 'picture', 'oleObjects', 'controls', 'webPublishItems', 'tableParts', 'extLst'];
const unzip = (bytes) => {
  const cfb = XLSX.CFB.read(Buffer.from(bytes), { type: 'buffer' });
  const sheets = [];
  for (let i = 1; ; i++) { const f = XLSX.CFB.find(cfb, `/xl/worksheets/sheet${i}.xml`); if (!f) break; sheets.push(Buffer.from(f.content).toString('utf8')); }
  return sheets;
};
//  시트 XML → 맨 위 자식 요소 이름 순서 + 요소 글자(DOMParser 로 짜임까지 잰다)
const parseSheet = (xml) => {
  const dom = new JSDOM('', { contentType: 'text/html' });
  const doc = new dom.window.DOMParser().parseFromString(xml, 'application/xml');
  const perr = doc.getElementsByTagName('parsererror');
  const root = doc.documentElement;
  const kids = [...root.children].map((e) => e.localName);
  const get = (name) => [...root.children].filter((e) => e.localName === name);
  return { wellFormed: perr.length === 0 && root.localName === 'worksheet', kids, get };
};
const inOrder = (kids) => { let last = -1; for (const k of kids) { const i = ORDER.indexOf(k); if (i < 0) return false; if (i < last) return false; last = i; } return true; };
const attrs = (el) => Object.fromEntries([...el.attributes].map((a) => [a.name, a.value]));

console.log('■ ① 시트 XML 한 장에 넣는 규칙(순수 함수)');
{
  const base = '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:B2"/><sheetData/><mergeCells count="1"><mergeCell ref="A1:B1"/></mergeCells><ignoredErrors><ignoredError sqref="A1:B2" numberStoredAsText="1"/></ignoredErrors></worksheet>';
  const f = M.sheetXmlWithPrintSetup(base, { orientation: 'landscape', paper: 9, margin: 0.3937, centered: true, fit: true });
  const p = parseSheet(f);
  ok('한 쪽 맞춤 — 결과가 올바른 XML 이고 자식 순서가 스키마대로', p.wellFormed && inOrder(p.kids), p.kids.join('>'));
  ok('sheetPr 이 맨 앞 · pageSetUpPr fitToPage=1', p.kids[0] === 'sheetPr' && /<sheetPr><pageSetUpPr fitToPage="1"\/><\/sheetPr>/.test(f));
  ok('pageSetup = A4(9) 가로 · fitToWidth=1 fitToHeight=1 · scale 없음', (() => { const a = attrs(p.get('pageSetup')[0]); return a.paperSize === '9' && a.orientation === 'landscape' && a.fitToWidth === '1' && a.fitToHeight === '1' && !('scale' in a); })());
  ok('pageMargins 하나뿐 · 여백 0.3937인치(1cm)', p.get('pageMargins').length === 1 && attrs(p.get('pageMargins')[0]).left === '0.3937' && attrs(p.get('pageMargins')[0]).bottom === '0.3937');
  ok('가운데 맞춤(printOptions horizontalCentered)', p.get('printOptions').length === 1 && attrs(p.get('printOptions')[0]).horizontalCentered === '1');
  ok('병합·무시 오류 요소는 그대로(mergeCells 1 · ignoredErrors 1) — 병합 자리를 건드리지 않는다', p.get('mergeCells').length === 1 && /<mergeCell ref="A1:B1"\/>/.test(f) && p.get('ignoredErrors').length === 1);
  ok('sheetData 는 한 글자도 안 바뀐다', f.includes('<sheetData/>') && f.includes('<dimension ref="A1:B2"/>'));
  const e = M.sheetXmlWithPrintSetup(M.sheetXmlWithPrintSetup(base, { fit: true }), { fit: true });
  const pe = parseSheet(e);
  ok('두 번 넣어도 중복 없다(pageMargins·pageSetup·sheetPr 각 하나) — 엑셀 «복구» 창 원인', pe.get('pageMargins').length === 1 && pe.get('pageSetup').length === 1 && pe.get('sheetPr').length === 1 && (e.match(/pageSetUpPr/g) || []).length === 1);
  const pre = '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><tabColor rgb="FF0000"/></sheetPr><dimension ref="A1"/><sheetData/><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><pageSetup orientation="portrait"/></worksheet>';
  const g = M.sheetXmlWithPrintSetup(pre, { fit: true, centered: true });
  const pg = parseSheet(g);
  ok('라이브러리가 이미 쓴 pageMargins·pageSetup 은 걷어내고 하나만 — 세로 지정이 가로로 바뀐다', pg.wellFormed && inOrder(pg.kids) && pg.get('pageMargins').length === 1 && pg.get('pageSetup').length === 1 && attrs(pg.get('pageSetup')[0]).orientation === 'landscape' && attrs(pg.get('pageMargins')[0]).left === '0.3937');
  ok('이미 있던 sheetPr(탭 색) 은 보존하고 pageSetUpPr 만 더한다', /<sheetPr><tabColor rgb="FF0000"\/><pageSetUpPr fitToPage="1"\/><\/sheetPr>/.test(g));
  const s = M.sheetXmlWithPrintSetup(base, { scale: 60, breaks: [98, 49], centered: true });
  const ps = parseSheet(s);
  ok('배율 60 + 쪽 나눔 — 맞춤(fit)을 쓰지 않는다(엑셀은 맞춤이면 쪽 나눔 줄을 무시한다)', ps.wellFormed && inOrder(ps.kids) && !/fitToPage|fitToWidth|fitToHeight/.test(s) && attrs(ps.get('pageSetup')[0]).scale === '60' && ps.get('sheetPr').length === 0);
  ok('쪽 나눔 줄은 오름차순 · count=manualBreakCount=2 · pageSetup 다음 ignoredErrors 앞', /<rowBreaks count="2" manualBreakCount="2"><brk id="49" max="16383" man="1"\/><brk id="98" max="16383" man="1"\/><\/rowBreaks>/.test(s) && ps.kids.indexOf('rowBreaks') > ps.kids.indexOf('pageSetup') && ps.kids.indexOf('rowBreaks') < ps.kids.indexOf('ignoredErrors'));
  const hf = base.replace('<ignoredErrors>', '<headerFooter><oddFooter>&amp;P</oddFooter></headerFooter><ignoredErrors>');
  const h = M.sheetXmlWithPrintSetup(hf, { scale: 60, breaks: [49] });
  ok('머리말·꼬리말이 있으면 순서 pageSetup → headerFooter → rowBreaks', inOrder(parseSheet(h).kids) && parseSheet(h).kids.join('>').includes('pageSetup>headerFooter>rowBreaks'));
  let thrown = false; try { M.sheetXmlWithPrintSetup('<worksheet>', { fit: true }); } catch (_) { thrown = true; }
  ok('넣을 자리를 못 찾으면 조용히 넘어가지 않고 멈춘다', thrown);
  let thrown2 = false; try { M.applyXlsxPrintSetup(XLSX, new Uint8Array([1, 2, 3]), [{ fit: true }]); } catch (_) { thrown2 = true; }
  ok('zip 이 아닌 바이트도 조용히 통과하지 않는다', thrown2);
}

console.log('■ ② 앱이 쓰는 설정 상수 — 실물 파일 자신의 인쇄 설정에서 따로 읽은 값과 같다');
{
  //  기대값은 앱 상수가 아니라 선사·마감텔리 **실물 파일의 시트 XML** 에서 읽는다(상수끼리 비교하면 헛통과).
  const sheetsOf = (f) => unzip(fs.readFileSync(fx(f)));
  const r106e = sheetsOf('rzor_rzdf_R106E.xlsx');   // 선사 덱플랜(rzdf) 원본 — 시트 2~4 가 덱 그림(B·C·D)
  const deckSheets = r106e.filter((x) => /fitToPage="1"/.test(x) && /orientation="landscape"/.test(x));
  const ps = (x) => attrs(parseSheet(x).get('pageSetup')[0]);
  ok('실물 선사 R106E 덱 그림 시트 세 장은 한 쪽 맞춤(fitToPage) · 가로 · A4(9)', deckSheets.length === 3 && deckSheets.every((x) => ps(x).paperSize === '9'), String(deckSheets.length));
  ok('앱 양하 설정 = 선사 R106E 덱 시트와 같은 방식(한 쪽 맞춤 · 가로 · A4) — 여백 0.39인치·가운데는 마감텔리 R106W 를 따른다(R106E 는 여백 1인치·가운데 없음, R109E .xls 는 맞춤 없이 배율 95·96 — 둘 다 결과는 덱 하나 = 가로 A4 한 쪽)', M.CARRIER_XLSX_PRINT.fit === true && M.CARRIER_XLSX_PRINT.orientation === 'landscape' && M.CARRIER_XLSX_PRINT.paper === 9 && M.CARRIER_XLSX_PRINT.centered === true && M.CARRIER_XLSX_PRINT.margin === 0.3937);
  const r106w = sheetsOf('rzor_plan_R106W.xlsx')[0]; const pw = parseSheet(r106w);
  const wBreaks = [...r106w.matchAll(/<brk id="(\d+)"/g)].map((m) => Number(m[1]));
  ok('실물 마감텔리 R106W: 가로 A4 · 배율 60 · 가운데 맞춤 · 쪽 나눔 49·98 · 맞춤(fitToPage) 없음', ps(r106w).paperSize === '9' && ps(r106w).orientation === 'landscape' && ps(r106w).scale === '60' && JSON.stringify(wBreaks) === '[49,98]' && pw.get('printOptions').length === 1 && attrs(pw.get('printOptions')[0]).horizontalCentered === '1' && !/fitToPage/.test(r106w));
  ok('앱 선적 설정 = 그 실물: 가로 A4 · 배율 60(상한 — 칸이 넓으면 가로 한 쪽까지 낮춘다) · 가운데 · 쪽 나눔 49·98 · 맞춤 아님', M.CHECKER_XLSX_PRINT.orientation === 'landscape' && M.CHECKER_XLSX_PRINT.paper === 9 && M.CHECKER_XLSX_PRINT.scale === 60 && M.CHECKER_XLSX_PRINT.fitWidth === true && !M.CHECKER_XLSX_PRINT.fit && M.CHECKER_XLSX_PRINT.centered === true && JSON.stringify(M.CHECKER_XLSX_PRINT.breaks) === JSON.stringify(wBreaks), JSON.stringify(M.CHECKER_XLSX_PRINT));
}

console.log('■ ③ 양하 카고플랜 엑셀 — 실물 R109E(선사 원본)로 만든 3시트');
const R109 = JSON.parse(fs.readFileSync(fx('rzor_discharge_R109E_print.json'), 'utf8'));
const plan109 = M.parseDeckPlanWorkbook(readWb(fx('rzor_rzdf_R109E.xls')), XLSX);
const wbC = M.buildCarrierPlanWorkbook(XLSX, { plan: plan109, containers: R109.containers, xrayMap: R109.xrayMap, vsl: 'RIZHAO ORIENT', date: '2026-10-05', fills: {} });
const rawC = XLSX.write(wbC, { bookType: 'xlsx', type: 'array' });
const rawSheetsC = unzip(rawC);
ok('라이브러리가 만든 원본에는 인쇄 설정이 없다(고치기 전 상태 재현 — 이 설정이 비면 시험이 의미 없다)', rawSheetsC.length === 3 && rawSheetsC.every((x) => !/<pageSetup\b|fitToPage|<pageMargins\b/.test(x)));
const fixC = M.applyXlsxPrintSetup(XLSX, rawC, [M.CARRIER_XLSX_PRINT]);
const shC = unzip(fixC);
ok('시트 3장(B·C·D 덱)이 그대로 3장', shC.length === 3, String(shC.length));
shC.forEach((x, i) => {
  const p = parseSheet(x);
  ok(`시트 ${i + 1}: 올바른 XML · 자식 순서가 스키마대로`, p.wellFormed && inOrder(p.kids), p.kids.join('>'));
  const a = p.get('pageSetup').length === 1 ? attrs(p.get('pageSetup')[0]) : {};
  ok(`시트 ${i + 1}: 가로 A4 한 쪽 맞춤(pageSetUpPr fitToPage + fitToWidth/Height 1) · pageMargins 하나`, /<sheetPr><pageSetUpPr fitToPage="1"\/><\/sheetPr>/.test(x) && a.paperSize === '9' && a.orientation === 'landscape' && a.fitToWidth === '1' && a.fitToHeight === '1' && p.get('pageMargins').length === 1);
});
//  병합 칸·셀 값은 한 글자도 안 바뀐다 — 서명란·병합 자리를 지킨다(검수사 «셀 병합자리도 잘 봐주시기 바랍니다»)
const mergesOf = (x) => (x.match(/<mergeCell ref="[^"]+"\/>/g) || []);
const dataOf = (x) => (/<sheetData>[\s\S]*<\/sheetData>/.exec(x) || [''])[0];
ok('병합 칸·셀 데이터가 원본과 똑같다(시트마다 mergeCell 줄 · sheetData 글자 동일)', rawSheetsC.every((x, i) => JSON.stringify(mergesOf(x)) === JSON.stringify(mergesOf(shC[i])) && dataOf(x) === dataOf(shC[i])));
ok('병합 칸끼리 겹치지 않는다(겹치면 엑셀 «복구» 창)', shC.every((x) => {
  const rs = mergesOf(x).map((m) => XLSX.utils.decode_range(/ref="([^"]+)"/.exec(m)[1]));
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i], b = rs[j]; if (a.s.r <= b.e.r && b.s.r <= a.e.r && a.s.c <= b.e.c && b.s.c <= a.e.c) return false; }
  return true;
}));
const reC = XLSX.read(Buffer.from(fixC), { type: 'buffer', cellStyles: true });
ok('고친 파일을 다시 읽으면 시트 이름·덱플랜 컨이 원본과 같다(왕복)', JSON.stringify(reC.SheetNames) === JSON.stringify(wbC.SheetNames)
  && (() => { const p2 = M.parseDeckPlanWorkbook(reC, XLSX); const cn = (pl) => pl.decks.flatMap((d) => d.slots.filter((s) => !s.empty && s.cn).map((s) => `${d.deck}|${s.cn}|${s.line}|${s.col}`)).sort().join(','); return cn(p2) === cn(M.parseDeckPlanWorkbook(XLSX.read(Buffer.from(rawC), { type: 'buffer', cellStyles: true }), XLSX)) && cn(p2).length > 0; })());
ok('시트 개수보다 설정이 적으면 마지막 설정을 모든 시트에 쓴다(한 설정 → 3시트)', shC.every((x) => /fitToPage="1"/.test(x)));

console.log('■ ④ 선적 마감텔리 양식 엑셀 — 실물 R106W로 만든 1시트(덱 블록 셋)');
const planW = M.parseCheckerPlanWorkbook(readWb(fx('rzor_plan_R106W.xlsx')), XLSX);
const wbK = M.buildCheckerPlanWorkbook(XLSX, { plan: planW, vsl: 'RIZHAO ORIENT', voy: 'R106W', date: '2026-10-05', inspector: '김성일' });
const rawK = XLSX.write(wbK, { bookType: 'xlsx', type: 'array' });
const rawSheetsK = unzip(rawK);
ok('원본에는 인쇄 설정이 없다(재현)', rawSheetsK.length === 1 && !/<pageSetup\b|<pageMargins\b|<rowBreaks\b/.test(rawSheetsK[0]));
const fixK = M.applyXlsxPrintSetup(XLSX, rawK, [M.CHECKER_XLSX_PRINT]);
const shK = unzip(fixK);
{
  const x = shK[0]; const p = parseSheet(x); const a = p.get('pageSetup').length === 1 ? attrs(p.get('pageSetup')[0]) : {};
  ok('올바른 XML · 자식 순서가 스키마대로', p.wellFormed && inOrder(p.kids), p.kids.join('>'));
  ok('가로 A4 · 배율 60 · 맞춤 없음', a.paperSize === '9' && a.orientation === 'landscape' && a.scale === '60' && !/fitToPage|fitToWidth/.test(x));
  const brks = [...x.matchAll(/<brk id="(\d+)"/g)].map((m) => Number(m[1]));
  ok('쪽 나눔 = 49 · 98 (덱 블록 C·D·UNDER 사이)', JSON.stringify(brks) === '[49,98]' && /<rowBreaks count="2" manualBreakCount="2">/.test(x), brks.join(','));
  ok('쪽 나눔 줄 49·98(1부터) = 덱 블록 마지막 행(칸 번호 26·25·24… 줄) 아래 — 다음 쪽은 블록 제목(M/V … STOW)에서 시작한다', (() => {
    const ws = wbK.Sheets[wbK.SheetNames[0]];
    const rowTxt = (r0) => { const out = []; for (let c = 0; c < 90; c++) { const v = ws[XLSX.utils.encode_cell({ r: r0, c })]; if (v && v.v !== undefined && v.v !== '') out.push(String(v.v)); } return out.join('|'); };
    return /^26\|25\|24/.test(rowTxt(48)) && /STOW/.test(rowTxt(49)) && /^26\|25\|24/.test(rowTxt(97)) && /STOW/.test(rowTxt(98));
  })());
  ok('병합 칸·셀 데이터가 원본과 똑같다', JSON.stringify(mergesOf(rawSheetsK[0])) === JSON.stringify(mergesOf(x)) && dataOf(rawSheetsK[0]) === dataOf(x));
}
const reK = XLSX.read(Buffer.from(fixK), { type: 'buffer', cellStyles: true });
ok('고친 파일을 다시 읽으면 마감텔리 양식 파서가 같은 플랜을 읽는다(왕복)', (() => {
  const key = (pl) => pl.decks.flatMap((d) => d.slots.filter((s) => !s.empty && s.cn).map((s) => `${d.deck}|${s.cn}|${s.line}|${s.col}`)).sort().join(',');
  const a = key(M.parseCheckerPlanWorkbook(reK, XLSX)); const b = key(M.parseCheckerPlanWorkbook(XLSX.read(Buffer.from(rawK), { type: 'buffer', cellStyles: true }), XLSX));
  return a.length > 0 && a === b;
})());

console.log('■ ④-B 칸이 실물보다 넓은 라이브러리(xlsx-js-style)로 만들어도 덱 한 장이 가로 한 쪽 — 배율을 열 너비 합으로 낮춘다');
{
  //  쓰는 라이브러리(xlsx-js-style 1.2.0)는 같은 그림의 칸 너비를 실물(R106W)의 약 1.33배로 쓴다(13px → 2.164글자 vs 실물 1.625). 그대로 배율 60 이면 LibreOffice 실측 덱마다 가로 두 쪽(6쪽)이 됐다.
  const colsSum = (x) => [...x.matchAll(/<col\b[^>]*>/g)].reduce((t, c) => { const m = /min="(\d+)" max="(\d+)" width="([\d.]+)"/.exec(c[0]); return m ? t + (Number(m[2]) - Number(m[1]) + 1) * Number(m[3]) : t; }, 0);
  const AVAIL_IN = 11.69 - 2 * 0.3937;   // A4 가로 − 좌우 여백
  const inches = (x, sc) => colsSum(x) * 7 / 96 * sc / 100;   // 열 너비(글자) × 7px ÷ 96dpi × 배율
  const scaleOf = (x) => Number(/<pageSetup[^>]*\bscale="(\d+)"/.exec(x)[1]);
  const wide = (x, f) => x.replace(/(<col\b[^>]*?width=")([\d.]+)(")/g, (_, a, w, c) => a + (Number(w) * f).toFixed(6) + c);   // 실제 라이브러리처럼 칸을 넓힌 사본
  const plain = shK[0];
  ok('실물 폭(R106W 와 같은 칸 너비) — 배율 60 그대로(상한)', scaleOf(plain) === 60 && inches(plain, 60) <= AVAIL_IN, `${scaleOf(plain)} ${inches(plain, 60).toFixed(2)}in`);
  const rawWide = wide(rawSheetsK[0], 287.359375 / 215.640625);   // xlsx-js-style 실측 합 287.36 / 실물 합 215.64
  const w1 = M.sheetXmlWithPrintSetup(rawWide, M.CHECKER_XLSX_PRINT);
  ok(`1.33배 넓은 칸(합 ${colsSum(rawWide).toFixed(1)}) — 배율이 60 아래로 내려가 가로 한 쪽에 들어간다`, scaleOf(w1) < 60 && inches(w1, scaleOf(w1)) <= AVAIL_IN, `${scaleOf(w1)} ${inches(w1, scaleOf(w1)).toFixed(2)}in ≤ ${AVAIL_IN.toFixed(2)}in`);
  ok('필요 이상으로 줄이지 않는다(배율 +3 이면 넘친다 — 가능한 가장 큰 배율 근처)', inches(w1, scaleOf(w1) + 3) > AVAIL_IN, String(scaleOf(w1)));
  const w0 = M.sheetXmlWithPrintSetup(rawWide, { ...M.CHECKER_XLSX_PRINT, fitWidth: false });
  ok('(대조) fitWidth 를 끄면 배율 60 이 그대로라 가로로 넘친다 — 위 통과는 fitWidth 덕이다', scaleOf(w0) === 60 && inches(w0, 60) > AVAIL_IN, `${inches(w0, 60).toFixed(2)}in`);
  ok('widthFitScale — 열 정보가 없으면 null(조용히 지어내지 않는다) · A4 가 아닌 용지도 null', M.widthFitScale('<worksheet><sheetData/></worksheet>', {}) === null && M.widthFitScale(rawWide, { paper: 8 }) === null);
  ok('세로 지정이면 가로보다 작은 배율(쪽 너비 8.27인치)', M.widthFitScale(rawWide, { orientation: 'portrait' }) < M.widthFitScale(rawWide, { orientation: 'landscape' }));
  ok('배율은 쪽 나눔 설정과 같이 쓰인다 — rowBreaks 49·98 그대로', /<brk id="49"/.test(w1) && /<brk id="98"/.test(w1) && !/fitToPage/.test(w1));
}

console.log('■ ⑤ 내려받기 배선 — 종전 XLSX.writeFile(인쇄 설정을 안 쓴다)을 더 부르지 않는다');
const srcC = fs.readFileSync(path.join(ROOT, 'src/rzorPlanExcelCarrier.js'), 'utf8');
const srcK = fs.readFileSync(path.join(ROOT, 'src/rzorPlanExcel.js'), 'utf8');
const body = (src, name) => { const i = src.indexOf(`export async function ${name}`); return i < 0 ? '' : src.slice(i, src.indexOf('\n}\n', i) + 3).replace(/\/\/.*$/gm, ''); };   // 주석은 뺀다(주석에 옛 함수 이름을 적어도 걸리지 않게)
const bC = body(srcC, 'exportCarrierPlanXlsx'), bK = body(srcK, 'exportCheckerPlanXlsx');
ok('exportCarrierPlanXlsx — writeFile 없음 · XLSX.write → applyXlsxPrintSetup(CARRIER_XLSX_PRINT) → downloadXlsxBytes', bC && !/writeFile/.test(bC) && /XLSX\.write\(wb, \{ bookType: 'xlsx', type: 'array' \}\)/.test(bC) && /applyXlsxPrintSetup\([\s\S]*\[CARRIER_XLSX_PRINT\]\)/.test(bC) && /downloadXlsxBytes\(bytes, name\)/.test(bC));
ok('exportCheckerPlanXlsx — writeFile 없음 · XLSX.write → applyXlsxPrintSetup(CHECKER_XLSX_PRINT) → downloadXlsxBytes', bK && !/writeFile/.test(bK) && /XLSX\.write\(wb, \{ bookType: 'xlsx', type: 'array' \}\)/.test(bK) && /applyXlsxPrintSetup\([\s\S]*\[CHECKER_XLSX_PRINT\]\)/.test(bK) && /downloadXlsxBytes\(bytes, name\)/.test(bK));
ok('파일 이름은 종전 그대로(STOWAGE_PLAN_<항차>_DISCHARGE.xlsx · STOWAGE_PLAN_<항차>.xlsx)', /STOWAGE_PLAN_\$\{[^}]+\}_DISCHARGE\.xlsx/.test(bC) && /STOWAGE_PLAN_\$\{String\(p\.voy/.test(bK));
ok('쪽 나눔 상수는 덱 블록 높이 한 벌(BLOCK_ROWS)에서 나온다 — 따로 숫자를 두지 않는다', /breaks: \[BLOCK_ROWS, BLOCK_ROWS \* 2\]/.test(srcK) && /^const BLOCK_ROWS = 49;/m.test(srcK));
ok('엑셀 두 곳의 동작하지 않던 ws[\'!pageSetup\'] 줄은 없다(거짓 단서 제거)', !/ws\['!pageSetup'\]/.test(srcC) && !/ws\['!pageSetup'\]/.test(srcK));
const callers = ['src/components/PrintHubModal.jsx', 'src/pages/VoyagePage.jsx'].map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
ok('부르는 곳(출력 허브·항차 화면)은 종전 이름 그대로 부른다(exportCarrierPlanXlsx · exportCheckerPlanXlsx)', /exportCarrierPlanXlsx/.test(callers) && /exportCheckerPlanXlsx/.test(callers));

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) { /* */ }
console.log(`\n${bad ? '✘' : '✔'} 엑셀 인쇄 설정 연막검사 ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
