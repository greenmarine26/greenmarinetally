// 4.05 연막검사(4.04-05) — RZOR 선적(마감텔리 STOWAGE PLAN) 출력·Excel 의 CHASSIS 대수 = 마감텔리 파일 자신의 CHASSIS 표 · 생성(예측) 덱플랜은 크레인 몫을 샤시에서 뺀다.
//   검수사 2026-10-05 «샤시 카운트가 틀리다» — 앱이 40피트 칸 수로 샤시를 어림해 파일의 표(빈 섀시 포함·크레인 LO/LO 제외)와 어긋났다(실물 37개 중 8개만 맞았다).
//   기대값은 앱 코드가 아니라 **실물 파일 자신의 CHASSIS 표 칸**에서 따로 읽는다 — tools/fixtures/rzor_plan_R106W·R079W·R075W·R091W·R070W.xlsx(마감텔리 실물).
//   생성 덱플랜은 tools/fixtures/rzor_termwork_R107E.json(RTDB 실적 211대·터미널 베이 22 = 49대)·R106E.json(189대·45대).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'chassis405_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const fx = (p) => path.join(ROOT, 'tools', 'fixtures', p);
const stub = './tools/stub_fbdb_mem.js';

const ENTRY = path.join(TMP, 'entry.js');
fs.writeFileSync(ENTRY, `export { parseDeckPlanWorkbook } from "${ROOT}/src/rzorPlan.js";
export { buildPrintModel } from "${ROOT}/src/rzorPrintModel.js";
export { buildCheckerPlanWorkbook } from "${ROOT}/src/rzorPlanExcel.js";
export { buildRzorLoadingDeckPlan } from "${ROOT}/src/rzorDeckPredict.js";\n`);
const OUT = path.join(TMP, 'ch.cjs');
execSync(`npx esbuild "${ENTRY}" --bundle --platform=node --format=cjs --loader:.js=jsx --jsx=automatic --alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} `
  + `--external:react --external:react-dom --external:react/jsx-runtime --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${OUT}"`, { cwd: ROOT, stdio: 'pipe' });
process.env.NODE_PATH = path.join(ROOT, 'node_modules'); require('module').Module._initPaths();
global.window = global.window || { __mirLexicon: {}, __fbShipBayDict: {}, dispatchEvent: () => true, addEventListener: () => {} };
global.localStorage = global.localStorage || { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = global.document || { addEventListener() {}, querySelector() { return null; }, documentElement: { style: {} }, body: { style: {} } };
const M = require(OUT);
const XLSX = require(path.join(ROOT, 'node_modules', 'xlsx'));
const readWb = (p) => XLSX.read(fs.readFileSync(p), { type: 'buffer', cellStyles: true });

//  시트 자신의 CHASSIS 표 — «CHASSIS» 머리 오른쪽 8칸 안의 20'·40' 칸 아래, «C-DECK/D-DECK/U-DECK» 줄의 칸 값을 앱 코드와 무관하게 읽는다.
function sheetChassis(ws) {
  const rg = XLSX.utils.decode_range(ws['!ref']);
  const g = (r, c) => { const x = ws[XLSX.utils.encode_cell({ r, c })]; return x && x.v != null ? x.v : null; };
  for (let r = rg.s.r; r <= rg.e.r; r++) for (let c = rg.s.c; c <= rg.e.c; c++) {
    if (String(g(r, c)).trim().toUpperCase() !== 'CHASSIS') continue;
    let c20 = -1, c40 = -1;
    for (let k = 1; k <= 8; k++) { const t = String(g(r, c + k) || '').trim(); if (t === "20'") c20 = c + k; if (t === "40'") c40 = c + k; }
    if (c20 < 0 || c40 < 0) continue;
    const out = {};
    for (let rr = r + 1; rr <= r + 6; rr++) { const m = String(g(rr, c) || '').trim().toUpperCase().match(/^([CDU])-DECK$/); if (m) out[m[1]] = [Number(g(rr, c20)), Number(g(rr, c40))]; }
    if (Object.keys(out).length) return out;
  }
  return null;
}
const norm = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? Object.keys(o).sort().map((k) => [k, o[k]]) : o);
const same = (a, b) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));   // 덱 순서(D·C·U / C·D·U)는 상관없다

(async () => {
  console.log('■ ① 마감텔리 실물 5개 — 파서·출력 집계·Excel 표 = 파일 자신의 CHASSIS 표');
  const fixtures = ['R106W', 'R079W', 'R075W', 'R091W', 'R070W'];
  const wantAll = {};
  for (const k of fixtures) {
    const wb = readWb(fx(`rzor_plan_${k}.xlsx`));
    const want = sheetChassis(wb.Sheets[wb.SheetNames[0]]);
    wantAll[k] = want;
    ok(`${k} 기대값 — 파일에 CHASSIS 표가 C·D·U 세 덱 모두 있다`, !!want && ['C', 'D', 'U'].every((d) => Array.isArray(want[d])), JSON.stringify(want));
    const plan = M.parseDeckPlanWorkbook(wb, XLSX);
    const cap = {}; for (const d of plan.decks) cap[d.deck] = d.capacity || null;
    ok(`${k} 파서 — 덱마다 capacity 로 파일의 표 값을 가져온다`, same(cap, want), `${JSON.stringify(cap)} ≠ ${JSON.stringify(want)}`);
    const pm = M.buildPrintModel({ plan, containers: [], xrayMap: {}, termWork: {}, mode: 'loading', vsl: 'RIZHAO ORIENT', date: '2026-10-05' });
    const got = {}; for (const pg of pm.pages) got[pg.deck] = [pg.totals.ch20, pg.totals.ch40];
    ok(`${k} 출력 집계 — 덱마다 CHASSIS 20'·40' = 파일의 표 (출처 file)`, same(got, want) && pm.pages.every((pg) => pg.totals.chFrom === 'file'), `${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
    const wx = M.buildCheckerPlanWorkbook(XLSX, { plan, vsl: 'RIZHAO ORIENT', voy: k, date: '2026-10-05', inspector: '검수원' });
    const gx = sheetChassis(wx.Sheets[wx.SheetNames[0]]);
    ok(`${k} Excel — 내보낸 파일 맨 아래 CHASSIS 표도 파일의 표와 같다`, same(gx, want), `${JSON.stringify(gx)} ≠ ${JSON.stringify(want)}`);
  }
  //  이 다섯 개는 옛 계산(40피트 칸 수)으로는 어긋나던 파일을 골랐다 — 실제로 값이 다른 덱이 있는지(고친 효과가 보이는 검사인지) 확인.
  ok('검사 대상에 옛 어림값과 다른 덱이 있다(R075W D 20\' 2 · R091W C 20\' 6 — 빈 섀시·크레인 때문에 칸 수로는 못 센다)', wantAll.R075W.D[0] === 2 && wantAll.R091W.C[0] === 6);

  console.log('■ ② capacity 가 없는 플랜 — 칸 수 어림으로 돌아간다(저장된 옛 플랜·자동 예측 플랜)');
  {
    const plan = M.parseDeckPlanWorkbook(readWb(fx('rzor_plan_R106W.xlsx')), XLSX);
    const stripped = { ...plan, decks: plan.decks.map((d) => { const { capacity, ...rest } = d; return rest; }) };
    const pm = M.buildPrintModel({ plan: stripped, containers: [], xrayMap: {}, termWork: {}, mode: 'loading', vsl: 'RIZHAO ORIENT', date: '2026-10-05' });
    ok('capacity 를 떼도 죽지 않고 출력 모델이 나온다 · 출처가 file 이 아니다', pm.pages.length === 3 && pm.pages.every((pg) => pg.totals.chFrom !== 'file' && Number.isFinite(pg.totals.ch40)), JSON.stringify(pm.pages.map((p) => p.totals.chFrom)));
    const bad1 = { ...plan, decks: plan.decks.map((d) => ({ ...d, capacity: ['x', null] })) };
    let pm2 = null; try { pm2 = M.buildPrintModel({ plan: bad1, containers: [], xrayMap: {}, termWork: {}, mode: 'loading', vsl: 'RIZHAO ORIENT', date: '2026-10-05' }); } catch (e) { pm2 = null; }
    ok('capacity 가 숫자가 아니면 무시하고 어림으로 간다(NaN 이 종이에 안 찍힌다)', !!pm2 && pm2.pages.every((pg) => pg.totals.chFrom !== 'file' && Number.isFinite(pg.totals.ch20) && Number.isFinite(pg.totals.ch40)));
    //  방어 — 값이 정수·0 이상 숫자가 아니면(음수·소수·문자열·null) 파일 값으로 안 받는다 · 표 칸이 오류 셀(#N/A)이면 그 덱은 읽지 않는다(수집기 파이썬과 같게).
    const bad2 = { ...plan, decks: plan.decks.map((d) => ({ ...d, capacity: [-1, 2.5] })) };
    const pm3 = M.buildPrintModel({ plan: bad2, containers: [], xrayMap: {}, termWork: {}, mode: 'loading', vsl: 'RIZHAO ORIENT', date: '2026-10-05' });
    ok('capacity 가 음수·소수면 무시하고 어림으로 간다', pm3.pages.every((pg) => pg.totals.chFrom !== 'file'));
    const wbE = readWb(fx('rzor_plan_R106W.xlsx'));
    const wsE = wbE.Sheets[wbE.SheetNames[0]];
    //  C덱 줄의 20' 칸을 오류 셀로 바꾼다(SheetJS 는 오류 셀의 v 에 오류 코드 숫자를 담는다).
    const rg0 = XLSX.utils.decode_range(wsE['!ref']);
    const at = (r, c) => wsE[XLSX.utils.encode_cell({ r, c })];
    let cellC20 = null;
    for (let r = rg0.s.r; r <= rg0.e.r && !cellC20; r++) for (let c = rg0.s.c; c <= rg0.e.c && !cellC20; c++) {
      if (!(at(r, c) && String(at(r, c).v).trim().toUpperCase() === 'CHASSIS')) continue;
      let c20 = -1; for (let k = 1; k <= 8; k++) { const t = at(r, c + k); if (t && String(t.v).trim() === "20'") c20 = c + k; }
      if (c20 < 0) continue;
      for (let rr = r + 1; rr <= r + 6; rr++) if (at(rr, c) && String(at(rr, c).v).trim().toUpperCase() === 'C-DECK') cellC20 = XLSX.utils.encode_cell({ r: rr, c: c20 });
    }
    ok('오류 셀 준비 — 표의 C-DECK 20\' 칸이 숫자였다', !!cellC20 && wsE[cellC20] && wsE[cellC20].t === 'n', cellC20);
    wsE[cellC20] = { t: 'e', v: 42, w: '#N/A' };
    const pE = M.parseDeckPlanWorkbook(wbE, XLSX);
    const capE = {}; for (const d of pE.decks) capE[d.deck] = d.capacity || null;
    ok('표 칸이 오류 셀(#N/A)이면 그 덱(C)만 읽지 않고 나머지 덱은 그대로 읽는다', capE.C == null && same({ D: capE.D, U: capE.U }, { D: wantAll.R106W.D, U: wantAll.R106W.U }), JSON.stringify(capE));
  }

  console.log('■ ③ 생성(예측) 덱플랜 — 터미널 베이 22 크레인 몫은 «crane» 로 표시되고 샤시에서 빠진다');
  for (const [k, craneN, ch40D] of [['R107E', 49, 49], ['R106E', 45, 48]]) {
    const F = JSON.parse(fs.readFileSync(fx(`rzor_termwork_${k}.json`), 'utf8'));
    const g = M.buildRzorLoadingDeckPlan({ containers: F.containers, termWork: F.termWork, bayWork: F.bayWork, assign: null, voy: 'R10XW' });
    const sl = g.decks.flatMap((d) => d.slots.filter((s) => !s.empty));
    const bw22 = F.bayWork && F.bayWork['22'] ? Number(F.bayWork['22'].deck || 0) + Number(F.bayWork['22'].hold || 0) : -1;
    ok(`${k} — crane 표시 ${craneN}대 = 터미널 베이 22 몫(${bw22}) · LO/LO 칸(45)에 놓인 것 + 넘친 것 모두`, sl.filter((s) => s.crane).length === craneN && bw22 === craneN, `crane${sl.filter((s) => s.crane).length} bw22 ${bw22}`);
    ok(`${k} — LO/LO 칸(D 10~15)에 놓인 컨은 전부 crane 으로 표시된다`, sl.filter((s) => s.lolo).every((s) => s.crane));
    const pm = M.buildPrintModel({ plan: g, containers: [], xrayMap: {}, termWork: {}, mode: 'loading', vsl: 'RIZHAO ORIENT', date: '2026-10-05' });
    const dpg = pm.pages.find((p) => p.deck === 'D');
    const d40 = g.decks.find((d) => d.deck === 'D').slots.filter((s) => !s.empty && !s.crane && /^4/.test(String(s.iso))).length;
    ok(`${k} — D덱 CHASSIS 40' = 크레인을 뺀 40피트 컨 수(${d40}) = ${ch40D}`, dpg.totals.ch40 === d40 && d40 === ch40D, `print${dpg.totals.ch40} d40 ${d40}`);
  }

  console.log(`\n${bad ? '✘' : '✔'} RZOR 선적 CHASSIS 대수(4.04-05) ${n - bad}/${n}`);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { console.log(`  ⚠ 임시 폴더를 못 치웠다 — ${TMP}`); }
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('✘ 연막검사 예외', (e && e.stack) || e); process.exit(1); });
