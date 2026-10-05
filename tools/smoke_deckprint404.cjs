// 4.04 연막검사 — RZOR 카고플랜 덱플랜 출력(인쇄·PDF·Excel)과 앱 덱플랜 화면: 출력 집계 = 선사·마감텔리 파일의 자기 집계 · 병합 칸 겹침 없음 · 집계표 빈줄 없음 · 서명란은 출력에만.
//   검수사 2026-10-05 «RZOR도 카고플랜 출력 누르면 덱플랜이 위 PDF랑 똑같이 나오게» · «앱의 덱플랜도 PDF처럼 다 그려져 있었으면» · «서명란은 출력양식에만» · «셀 병합자리도 잘 봐주시기 바랍니다. 안그러면 빈줄이 생길수 있습니다.»
//   기대값은 앱 코드가 아니라 **실물 파일 자신의 집계표 칸**에서 따로 읽는다 — tools/fixtures/rzor_rzdf_R109E.xls(선사 원본 2026-10-05) · rzor_rzdf_R106E.xlsx(선사) · rzor_plan_R106W.xlsx(마감텔리).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'deckprint_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const fx = (p) => path.join(ROOT, 'tools', 'fixtures', p);
const stub = './tools/stub_fbdb_mem.js';

const ENTRY = path.join(TMP, 'entry.jsx');
fs.writeFileSync(ENTRY, `import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
export { React, renderToStaticMarkup };
export { parseDeckPlanWorkbook } from "${ROOT}/src/rzorPlan.js";
export { buildPrintModel, CARRIER_GRID_BOTTOM, CARRIER_GRID_BOTTOM_SCREEN, CARRIER_SIGN_Y, CHECKER_GRID_BOTTOM, CHECKER_SIGN_Y } from "${ROOT}/src/rzorPrintModel.js";
export { buildCarrierPlanWorkbook } from "${ROOT}/src/rzorPlanExcelCarrier.js";
export { buildCheckerPlanWorkbook } from "${ROOT}/src/rzorPlanExcel.js";
export { buildRzorLoadingDeckPlan } from "${ROOT}/src/rzorDeckPredict.js";
export { default as PrintableDeckPlan, PageView } from "${ROOT}/src/components/PrintableDeckPlan.jsx";
export { SPECIAL_FILL } from "${ROOT}/src/components/PrintableCargoPlanV2.jsx";\n`);
const OUT = path.join(TMP, 'dp.cjs');
execSync(`npx esbuild "${ENTRY}" --bundle --platform=node --format=cjs --loader:.js=jsx --jsx=automatic --alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} `
  + `--external:react --external:react-dom --external:react/jsx-runtime --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${OUT}"`, { cwd: ROOT, stdio: 'pipe' });
process.env.NODE_PATH = path.join(ROOT, 'node_modules'); require('module').Module._initPaths();   // 번들 밖 react 를 저장소 것으로 읽는다(복사본이 둘이면 훅이 죽는다)
const M = require(OUT);
const XLSX = require(path.join(ROOT, 'node_modules', 'xlsx'));
const readWb = (p) => XLSX.read(fs.readFileSync(p), { type: 'buffer', cellStyles: true });
const cellAt = (ws, r, c) => ws[XLSX.utils.encode_cell({ r, c })];

//  선사 파일 자신의 집계표(CHASSIS 머리 아래 줄들) — 칸 값을 왼쪽부터 순서대로 읽는다.
function fileChassis(wb) {
  for (const sn of wb.SheetNames) {
    const ws = wb.Sheets[sn]; if (!ws['!ref']) continue;
    const rng = XLSX.utils.decode_range(ws['!ref']);
    for (let r = rng.s.r; r <= rng.e.r; r++) for (let c = rng.s.c; c <= rng.e.c; c++) {
      const v = cellAt(ws, r, c);
      if (!(v && v.v === 'CHASSIS')) continue;
      const rows = {};
      for (let rr = r + 1; rr <= r + 6; rr++) {
        const vals = [];
        for (let cc = c; cc <= rng.e.c; cc++) { const x = cellAt(ws, rr, cc); if (x && x.v !== '' && x.v != null) vals.push(x.v); }
        if (vals[0] === 'B-DECK' || vals[0] === 'C-DECK' || vals[0] === 'D-DECK' || vals[0] === 'TTL') rows[`${vals[0]}${rows[vals[0]] ? '2' : ''}`] = vals;
      }
      return { rows, headRow: r };
    }
  }
  return null;
}
//  병합 칸 겹침 수 — 겹친 병합이 있으면 엑셀이 파일을 «복구» 하겠냐고 묻는다.
const overlaps = (ws) => { const mg = ws['!merges'] || []; let o = 0; for (let i = 0; i < mg.length; i++) for (let j = i + 1; j < mg.length; j++) { const a = mg[i], b = mg[j]; if (a.s.r <= b.e.r && b.s.r <= a.e.r && a.s.c <= b.e.c && b.s.c <= a.e.c) o += 1; } return o; };
const yOf = (html, txt) => { const m = html.match(new RegExp(`<text[^>]*?\\sy="([\\d.]+)"[^>]*>${txt.replace(/[.*+?^${}()|[\]\\']/g, '\\$&')}</text>`)); return m ? Number(m[1]) : NaN; };
const feRow = (f) => [f[20].D + f[20].R, f[20].D, f[20].R, f[40].D + f[40].R, f[40].D, f[40].R, f[45].D + f[45].R, f[45].D, f[45].R, f.L20, f.L40, f.n];

const stubScreen = { cellState: () => ({}), titleOf: () => '', onCell() {}, emptyState: () => ({}), emptyTitle: () => '', onEmpty() {} };

(async () => {
  const R109 = JSON.parse(fs.readFileSync(fx('rzor_discharge_R109E_print.json'), 'utf8'));
  const CASES = [
    { name: 'R109E', wb: readWb(fx('rzor_rzdf_R109E.xls')), containers: R109.containers, xrayMap: R109.xrayMap, info: R109.info },
    { name: 'R106E', wb: readWb(fx('rzor_rzdf_R106E.xlsx')), containers: [], xrayMap: {}, info: { vslFull: 'RIZHAO ORIENT', voy: 'R106E', planDate: '2026-09-28 10:00' } },
  ];

  for (const cs of CASES) {
    console.log(`■ 양하(선사 덱플랜) ${cs.name} — 출력 집계 = 선사 파일의 자기 집계표`);
    const plan = M.parseDeckPlanWorkbook(cs.wb, XLSX);
    const want = (fileChassis(cs.wb) || {}).rows;
    ok(`${cs.name} 선사 파일에서 집계표(CHASSIS)를 읽었다`, !!want && !!want['B-DECK'] && !!want['C-DECK'] && !!want['D-DECK'] && !!want.TTL, want ? Object.keys(want).join(',') : '없음');
    const model = M.buildPrintModel({ plan, containers: cs.containers, xrayMap: cs.xrayMap, termWork: {}, vsl: cs.info.vslFull, date: '2026-10-05', mode: 'discharge' });
    const T = model.totals;
    const w3 = (v) => Number(model.fmtWt(v, false));
    ok(`${cs.name} 선사 파일의 덱 머리 CAPACITY(샤시 20'·40' 대수)를 덱마다 읽었다`, ['B', 'C', 'D'].every((k) => { const d = plan.decks.find((x) => x.deck === k); const f = want[`${k}-DECK`]; return d && d.capacity && d.capacity[0] === Number(f[1]) && d.capacity[1] === Number(f[2]); }), JSON.stringify(plan.decks.map((d) => [d.deck, d.capacity])));
    if (cs.name === 'R106E') {
      //  옛 방식으로 올린 플랜(CAPACITY 를 안 읽은 것)은 추정으로 그린다 — 이 항차는 추정식이 선사 집계표와 정확히 맞는다.
      const planOld = { ...plan, decks: plan.decks.map(({ capacity, ...d }) => d) };
      const mOld = M.buildPrintModel({ plan: planOld, containers: cs.containers, xrayMap: cs.xrayMap, termWork: {}, vsl: cs.info.vslFull, date: '2026-10-05', mode: 'discharge' });
      ok(`${cs.name} CAPACITY 없는 옛 플랜 — 추정 샤시 대수(덱마다·TTL)가 선사 집계표와 같다`, ['B', 'C', 'D'].every((k) => mOld.totals.decks[k].chFrom === 'est' && mOld.totals.decks[k].ch20 === Number(want[`${k}-DECK`][1]) && mOld.totals.decks[k].ch40 === Number(want[`${k}-DECK`][2])) && mOld.totals.ch20 === Number(want.TTL[1]) && mOld.totals.ch40 === Number(want.TTL[2]), ['B', 'C', 'D'].map((k) => `${k} ${mOld.totals.decks[k].ch20}/${mOld.totals.decks[k].ch40}`).join(' '));
    }
    for (const k of ['B', 'C', 'D']) {
      const f = want[`${k}-DECK`];
      const dk = T.decks[k];
      ok(`${cs.name} ${k}-DECK 샤시 20'·40' 대수·무게가 선사 집계표와 같다`, !!f && !!dk && dk.ch20 === Number(f[1]) && dk.ch40 === Number(f[2]) && Math.abs(w3(dk.wt) - Number(f[3])) < 0.0006, `앱 ${dk && dk.ch20}/${dk && dk.ch40}/${dk && w3(dk.wt)} · 파일 ${f && f.slice(1, 4)}`);
    }
    ok(`${cs.name} TTL 줄(20'·40'·무게)이 선사 집계표와 같다`, T.ch20 === Number(want.TTL[1]) && T.ch40 === Number(want.TTL[2]) && Math.abs(w3(T.wt) - Number(want.TTL[3])) < 0.0006, `앱 ${T.ch20}/${T.ch40}/${w3(T.wt)} · 파일 ${want.TTL.slice(1, 4)}`);
    const sideOf = (vals) => vals.slice(4, 17);   // [라벨, 12칸]
    const fF = sideOf(want['C-DECK']), fE = sideOf(want['D-DECK']), fT = sideOf(want.TTL);
    const same = (a, b) => a.length === b.length && a.every((x, i) => x === Number(b[i]));
    ok(`${cs.name} F·E·TTL 줄(20'·D·R·40'·D·R·45'·D·R·LUG·TTL)이 선사 집계표와 같다`, fF[0] === 'F' && fE[0] === 'E' && fT[0] === 'TTL' && same(feRow(T.F), fF.slice(1)) && same(feRow(T.E), fE.slice(1)) && same(feRow(T.TTL), fT.slice(1)),
       `앱 F ${feRow(T.F)} · 파일 F ${fF.slice(1)}`);

    //  엑셀 — 병합 겹침 · 머리 병합 · 빈줄
    const wbx = M.buildCarrierPlanWorkbook(XLSX, { plan, containers: cs.containers, xrayMap: cs.xrayMap, vsl: cs.info.vslFull, date: '2026-10-05', fills: M.SPECIAL_FILL });
    ok(`${cs.name} 엑셀 — 덱마다 시트 하나(B·C·D)이고 병합 칸이 서로 겹치지 않는다`, wbx.SheetNames.join(',') === 'B-DECK,C-DECK,D-DECK' && wbx.SheetNames.every((s) => overlaps(wbx.Sheets[s]) === 0), wbx.SheetNames.map((s) => `${s}:${overlaps(wbx.Sheets[s])}`).join(' '));
    const ws = wbx.Sheets['B-DECK'];
    let r0 = -1; for (const a of Object.keys(ws)) if (a[0] !== '!' && ws[a].v === 'CHASSIS') r0 = XLSX.utils.decode_cell(a).r;
    const mg = (ws['!merges'] || []);
    const hasMerge = (r1, c1, r2, c2) => mg.some((m) => m.s.r === r1 && m.s.c === c1 && m.e.r === r2 && m.e.c === c2);
    ok(`${cs.name} 엑셀 집계표 — 첫 자료 줄(B-DECK)이 머리 바로 아래 줄이다(빈줄 없음 · 선사 파일과 같다)`, r0 > 0 && (cellAt(ws, r0 + 1, 1) || {}).v === 'B-DECK' && Number((cellAt(ws, r0 + 1, 2) || {}).v) === Number(want['B-DECK'][1]));
    ok(`${cs.name} 엑셀 집계표 머리 — LUG 는 가로로 합쳐 아래 줄에 20'·40' 가 따로 서고, 나머지 칸 이름은 두 줄이 세로로 합쳐진다`, hasMerge(r0, 15, r0, 16) && (cellAt(ws, r0 + 1, 15) || {}).v === "20'" && (cellAt(ws, r0 + 1, 16) || {}).v === "40'"
       && hasMerge(r0, 5, r0 + 1, 5) && hasMerge(r0, 6, r0 + 1, 6) && hasMerge(r0, 14, r0 + 1, 14) && hasMerge(r0, 17, r0 + 1, 17));
    const rowsFilled = []; for (let r = r0; r <= r0 + 4; r++) { let any = false; for (let c = 1; c <= 17; c++) { const x = cellAt(ws, r, c); if (x && x.v !== '' && x.v != null) any = true; } rowsFilled.push(any); }
    ok(`${cs.name} 엑셀 집계표 — 머리부터 TTL 까지 다섯 줄이 모두 차 있다(빈줄 없음)`, rowsFilled.every(Boolean), rowsFilled.join(','));
    const allTxt = (w) => Object.keys(w).filter((a) => a[0] !== '!').map((a) => String(w[a].v));
    ok(`${cs.name} 엑셀 — 서명란(Chief Checker · Chief Officer)이 있다(출력양식)`, wbx.SheetNames.every((s) => allTxt(wbx.Sheets[s]).includes('Chief Checker') && allTxt(wbx.Sheets[s]).includes('Chief Officer')));
    {   // 4.04-03 엑셀도 서명줄 위에 사인할 자리 — 마지막 컨 줄(칸 위 줄)부터 «Chief Checker» 줄까지 10행 이상(종전 8행)
      const cn1 = /^([A-Z]{4}\d{7}|[A-Z]{6}\d{3})$/;
      const gaps = wbx.SheetNames.map((sn) => { const w = wbx.Sheets[sn]; let lastCn = -1, label = -1; for (const a of Object.keys(w)) { if (a[0] === '!') continue; const rr = XLSX.utils.decode_cell(a).r; const t = String(w[a].v); if (cn1.test(t.split('\n')[0]) && rr > lastCn) lastCn = rr; if (t === 'Chief Checker') label = rr; } return label - lastCn; });
      ok(`${cs.name} 엑셀 — 모든 시트에서 마지막 컨 줄과 «Chief Checker» 줄 사이가 10행 이상(사인할 자리)`, gaps.length > 0 && gaps.every((g) => g >= 10), gaps.join(','));
    }
    //  칸 수 — 엑셀의 컨 칸(병합 4행 × 칸 폭) 수 = 플랜의 컨 수
    const cnRe = /^([A-Z]{4}\d{7}|[A-Z]{6}\d{3})$/;   // 선사 파일의 일부 칸은 번호가 9자(SAWTBP007) — 그것도 한 칸이다
    const inXls = wbx.SheetNames.reduce((a, s) => a + allTxt(wbx.Sheets[s]).filter((t) => cnRe.test(t.split('\n')[0])).length, 0);
    ok(`${cs.name} 엑셀 — 컨 칸 수 = 선사 덱플랜 컨 수(${plan.total}대)`, inXls === plan.total, `엑셀 ${inXls} · 플랜 ${plan.total}`);

    //  인쇄(SVG) — 집계표 빈줄 · 서명란 · 화면에는 서명란 없음
    const html = M.renderToStaticMarkup(M.React.createElement(M.PrintableDeckPlan, { plan, containers: cs.containers, xrayMap: cs.xrayMap, voyageInfo: cs.info, mode: 'discharge', staticPreview: true, initialBw: false, dateOverride: '2026-10-05' }));
    const yC = yOf(html, 'CHASSIS'), yB = yOf(html, 'B-DECK'), yL = yOf(html, 'LUG');
    ok(`${cs.name} 인쇄 집계표 — B-DECK 가 CHASSIS 머리 바로 아래 줄(한 줄 14)이고 LUG 아래 20'·40' 줄과 같은 높이`, Math.abs((yB - yC) - 14) < 0.5 && yL < yB, `CHASSIS ${yC} · B-DECK ${yB} · LUG ${yL}`);
    ok(`${cs.name} 인쇄 — 서명란(Chief Checker · Chief Officer)이 덱마다 있다`, (html.match(/Chief Checker/g) || []).length === model.pages.length && (html.match(/Chief Officer/g) || []).length === model.pages.length, `${(html.match(/Chief Checker/g) || []).length}/${model.pages.length}`);
    //  4.04-03 사인할 자리 — 검수사 2026-10-05 «사인란이 없는게 아니고 있는데 사인할 공간이 없음»(C·D덱은 그림이 서명줄 위 2~4mm 까지 내려왔다)
    {
      const svgs = html.split('<svg').slice(1);
      const lowest = (pg) => { let mx = 0; const up = (y) => { if (Number.isFinite(y) && y > mx) mx = y; }; pg.cells.forEach((c) => up(c.y + c.h)); pg.empties.forEach((e) => up(e.y + e.h)); pg.xmarks.forEach((e) => up(e.y + e.h)); if (pg.art) { pg.art.hull.forEach(([, y]) => up(y)); if (pg.art.ramp) up(pg.art.ramp.y + pg.art.ramp.h); } return mx; };
      const rows = model.pages.map((pg, i) => { const m = /<line x1="50" y1="([\d.]+)" x2="200"/.exec(svgs[i] || ''); const ly = m ? Number(m[1]) : NaN; const lb = /y="([\d.]+)"[^>]*>Chief Checker</.exec(svgs[i] || ''); return { deck: pg.deck, line: ly, room: ly - lowest(pg), label: lb ? Number(lb[1]) : NaN }; });
      ok(`${cs.name} 인쇄 — 모든 덱 쪽에서 서명줄 위에 사인할 자리가 48단위(약 12mm) 이상 비어 있다`, rows.length === model.pages.length && rows.every((r) => Number.isFinite(r.line) && r.room >= 48), JSON.stringify(rows.map((r) => [r.deck, Math.round(r.room)])));
      ok(`${cs.name} 인쇄 — 서명줄은 모델 상수(CARRIER_SIGN_Y)에 서고 직책 글자는 맨 아래 범례줄(y 744)과 겹치지 않는다`, rows.every((r) => r.line === M.CARRIER_SIGN_Y && r.label + 4 < 738), JSON.stringify(rows));
      const mScr = M.buildPrintModel({ plan, containers: cs.containers, xrayMap: cs.xrayMap, vsl: cs.info.vslFull, date: '2026-10-05', mode: 'discharge', forScreen: true });
      ok(`${cs.name} 앱 화면 — 그림 높이는 종전 그대로(격자가 ${M.CARRIER_GRID_BOTTOM_SCREEN} 까지) · DeckPlanView 가 forScreen 을 넘긴다`, mScr.pages.filter((pg) => pg.px.rows === 8).every((pg) => Math.abs(pg.px.y0 + pg.px.rows * pg.px.uh - M.CARRIER_GRID_BOTTOM_SCREEN) < 0.01) && /buildPrintModel\([^\n]*forScreen: true/.test(fs.readFileSync(path.join(ROOT, 'src/components/DeckPlanView.jsx'), 'utf8')) && !/forScreen/.test(fs.readFileSync(path.join(ROOT, 'src/components/PrintableDeckPlan.jsx'), 'utf8').replace(/\/\/.*$/gm, '')));
      ok(`${cs.name} 인쇄 — 칸 그림 격자는 CARRIER_GRID_BOTTOM(${M.CARRIER_GRID_BOTTOM}) 에서 끝난다`, model.pages.every((pg) => pg.px.y0 + pg.px.rows * pg.px.uh <= M.CARRIER_GRID_BOTTOM + 0.01));
    }
    const pg0 = model.pages[0];
    const screenHtml = model.pages.map((pg, i) => M.renderToStaticMarkup(M.React.createElement(M.PageView, { pg, model, bw: false, isFirst: i === 0, isLast: i === model.pages.length - 1, screen: stubScreen }))).join('');
    ok(`${cs.name} 앱 화면 — 서명란이 없다(Chief Checker · Chief Officer · 서명선)`, !/Chief (Checker|Officer)/i.test(screenHtml) && !/stroke-width="1.2"/.test(screenHtml) && /SUB TOTAL/.test(screenHtml) && /CHASSIS/.test(screenHtml));
    ok(`${cs.name} 앱 화면 — 종이와 같은 그림(선체 윤곽·집계표·칸 번호)이 다 그려진다`, /dp-hull/.test(screenHtml) && (screenHtml.match(/dp-cell/g) || []).length >= plan.total);

    //  특수화물(컬러만) · X-RAY(두 쪽 다)
    const planCns = new Set(plan.decks.flatMap((d) => d.slots).filter((s) => s.cn && !s.empty).map((s) => s.cn));
    const xrayIn = Object.keys(cs.xrayMap || {}).filter((cn) => planCns.has(cn)).length;
    const htmlBw = M.renderToStaticMarkup(M.React.createElement(M.PrintableDeckPlan, { plan, containers: cs.containers, xrayMap: cs.xrayMap, voyageInfo: cs.info, mode: 'discharge', staticPreview: true, initialBw: true, dateOverride: '2026-10-05' }));
    const cntX = (h) => (h.match(/class="dp-xray"/g) || []).length;
    ok(`${cs.name} X-RAY — 컬러·흑백 둘 다 빨간 ★ 가 X-RAY 대상 수(${xrayIn})와 같다`, cntX(html) === xrayIn && cntX(htmlBw) === xrayIn, `컬러 ${cntX(html)} · 흑백 ${cntX(htmlBw)} · 기대 ${xrayIn}`);
    const spCells = (h) => (h.match(/class="dp-cell[^"]*\bsp-(DG|RF|FR|OT|TK)\b/g) || []).length;
    const wantSp = model.pages.reduce((a, pg) => a + pg.cells.filter((c) => c.fill).length, 0);
    ok(`${cs.name} 특수화물 — 컬러는 칸 바탕색 클래스가 서고, 흑백은 바탕색을 지운다(.dp-bw .dp-cell fill #fff)`, spCells(html) === wantSp && /class="dp-svg"/.test(html) && /class="dp-svg dp-bw"/.test(htmlBw) && !/class="dp-svg dp-bw"/.test(html), `컬러 ${spCells(html)} · 모델 ${wantSp}`);
    ok(`${cs.name} 특수화물 — 흑백에서도 종류 글자(DG·RF·FR·OT·TK)가 칸 아래에 남는다`, model.pages.some((pg) => pg.cells.some((c) => c.fill && c.letter)) && /\.dp-bw \.dp-cell \{ fill: #fff !important; \}/.test(fs.readFileSync(path.join(ROOT, 'src/components/PrintableDeckPlan.jsx'), 'utf8')));
    if (cs.name === 'R109E') {
      const dpg = model.pages.find((p) => p.deck === 'D');
      ok('R109E LOLO — D덱에만 굵은 선 구역이 서고 기본 구역은 45칸(구역 안 컨은 9대)', !!dpg.zone && dpg.zone.cells === 45 && dpg.zone.count === 9 && model.pages.filter((p) => p.zone).length === 1, dpg.zone && `${dpg.zone.cells}칸 · ${dpg.zone.count}대`);
      ok('R109E 합계 — 컨 149대 · D덱 무게 1440.741t · 전체 3405.665t (선사 PDF 인쇄본 숫자)', T.TTL.n === 149 && w3(T.decks.D.wt) === 1440.741 && w3(T.wt) === 3405.665, `${T.TTL.n} · ${w3(T.decks.D.wt)} · ${w3(T.wt)}`);
      ok('R109E 수화물 LUG 1대 · 긴급 ▲ 표시용 목록과 별개로 칸에 LUG 가 선다', T.F.L20 + T.F.L40 + T.E.L20 + T.E.L40 === 1 && model.pages.some((p) => p.cells.some((c) => c.lug)));
    }
    //  4.04 감사 지적 — 가짜 컨 번호 · 긴급/활어 · 추정 표시 · 그림 무늬 id
    const allSlots = plan.decks.flatMap((d) => d.slots).filter((s) => s.cn && !s.empty);
    const rawNo = (() => { const out = []; for (const sn of cs.wb.SheetNames) { const ws0 = cs.wb.Sheets[sn]; for (const a of Object.keys(ws0)) { if (a[0] === '!') continue; const v0 = ws0[a].v; if (typeof v0 === 'string' && /^SAWTBP\d+\s*[\r\n]/.test(v0)) out.push(v0.split(/[\r\n]+/)[0].trim()); } } return out; })();
    ok(`${cs.name} 칸 번호 — 번호가 9자인 칸(SAWTBP…)은 파일 첫 줄 그대로이고 중량 앞자리가 붙은 가짜 번호가 없다(파일 ${rawNo.length}칸)`, rawNo.every((no) => allSlots.some((s) => s.cn === no)) && !allSlots.some((s) => /^WTBP\d{7}$/.test(s.cn)) && allSlots.every((s) => /^[A-Z]{4}\d{7}$/.test(s.cn) || rawNo.includes(s.cn)), JSON.stringify(allSlots.filter((s) => !/^[A-Z]{4}\d{7}$/.test(s.cn)).map((s) => s.cn)));
    const flagTxt = (w) => { const out = { 긴급: 0, 활어: 0 }; for (const sn of w.SheetNames) { const ws0 = w.Sheets[sn]; for (const a of Object.keys(ws0)) { if (a[0] === '!') continue; const v0 = ws0[a].v; if (typeof v0 !== 'string') continue; const l3 = v0.split(/[\r\n]+/); if (/^[A-Z]{4}\d{7}$/.test(l3[0] || '')) { if (/긴급/.test(l3.slice(1).join(' '))) out.긴급 += 1; if (/활어/.test(l3.slice(1).join(' '))) out.활어 += 1; } } } return out; };
    const fileFlags = flagTxt(cs.wb);
    const svgFlags = { 긴급: (html.match(/[> ]긴급</g) || []).length, 활어: (html.match(/[> ]활어</g) || []).length };
    const xlFlags = flagTxt(wbx);
    ok(`${cs.name} 긴급·활어 — 선사 파일 칸 글자(긴급 ${fileFlags.긴급} · 활어 ${fileFlags.활어})가 종이 그림과 엑셀 칸에 그대로 나온다`, svgFlags.긴급 === fileFlags.긴급 && svgFlags.활어 === fileFlags.활어 && xlFlags.긴급 === fileFlags.긴급 && xlFlags.활어 === fileFlags.활어, `종이 ${JSON.stringify(svgFlags)} · 엑셀 ${JSON.stringify(xlFlags)} · 파일 ${JSON.stringify(fileFlags)}`);
    ok(`${cs.name} 긴급 ▲ — 파일 칸 글자 «긴급»(${fileFlags.긴급}칸)이 칸 모서리 ▲ 로도 선다`, (html.match(/>▲</g) || []).length === fileFlags.긴급 && model.pages.reduce((a, p) => a + p.cells.filter((c) => c.urgent).length, 0) === fileFlags.긴급);
    const planNoCap = { ...plan, decks: plan.decks.map(({ capacity, ...d }) => d) };
    const htmlEst = M.renderToStaticMarkup(M.React.createElement(M.PrintableDeckPlan, { plan: planNoCap, containers: cs.containers, xrayMap: cs.xrayMap, voyageInfo: cs.info, mode: 'discharge', staticPreview: true, initialBw: false, dateOverride: '2026-10-05' }));
    ok(`${cs.name} 샤시 대수 추정 표시 — 파일 CAPACITY 로 그린 종이엔 없고, CAPACITY 없는 옛 플랜 종이엔 «추정» 이 적힌다`, !/샤시 대수는 추정/.test(html) && /샤시 대수는 추정/.test(htmlEst));
    const patIds = (h) => [...h.matchAll(/<pattern id="([^"]+)"/g)].map((x) => x[1]);
    const pa = patIds(M.renderToStaticMarkup(M.React.createElement(M.PageView, { pg: model.pages[0], model, bw: false, isFirst: true, isLast: false })));
    const pb = patIds(M.renderToStaticMarkup(M.React.createElement(M.PageView, { pg: model.pages[0], model, bw: false, isFirst: true, isLast: false, screen: stubScreen })));
    const both = M.renderToStaticMarkup(M.React.createElement('div', null, M.React.createElement(M.PageView, { pg: model.pages[0], model, bw: false, isFirst: true, isLast: false }), M.React.createElement(M.PageView, { pg: model.pages[0], model, bw: false, isFirst: true, isLast: false, screen: stubScreen })));
    const idsBoth = patIds(both);
    ok(`${cs.name} 그림 무늬(빗금·회색) id — 그림 한 장마다 따로라서 화면 그림과 출력 그림이 함께 떠도 겹치지 않고, 쓰는 id 가 그림 안에 있다`, pa.length === 2 && pb.length === 2 && idsBoth.length === 4 && new Set(idsBoth).size === 4 && [...both.matchAll(/url\(#([^)]+)\)/g)].every((x) => idsBoth.includes(x[1])), `${idsBoth}`);
    void pg0;
  }

  console.log('■ 선적(마감텔리 덱플랜) R106W — 출력 집계 = 마감텔리 파일의 자기 집계 · 엑셀 병합 · 서명란');
  const wb106 = readWb(fx('rzor_plan_R106W.xlsx'));
  const p106 = M.parseDeckPlanWorkbook(wb106, XLSX);
  const ws1 = wb106.Sheets[wb106.SheetNames[0]];
  const v = (a) => (ws1[a] || {}).v;
  const m106 = M.buildPrintModel({ plan: p106, containers: [], xrayMap: {}, termWork: {}, vsl: 'RIZHAO ORIENT', date: '2026-09-28', mode: 'loading' });
  const pgOf = (k) => m106.pages.find((p) => p.deck === k);
  ok('마감텔리 파일의 자기 집계(C덱 CONT 20/40/45/TTL · D덱 TTL · F/E/TTL)를 읽는다', v('BR5') === 2 && v('BU5') === 60 && v('BX5') === 4 && v('CA5') === 66 && v('CA54') === 110 && v('BZ150') === 55 && v('BZ151') === 135 && v('BZ152') === 190);
  ok('출력 모델 — C덱 20\'=2·40\'=60·45\'=4·TTL 66 · D덱 TTL 110 이 마감텔리 파일과 같다', pgOf('C').totals.n[20] === v('BR5') && pgOf('C').totals.n[40] === v('BU5') && pgOf('C').totals.n[45] === v('BX5') && pgOf('C').totals.ttl === v('CA5') && pgOf('D').totals.ttl === v('CA54'), JSON.stringify([pgOf('C').totals, pgOf('D').totals.ttl]));
  ok('출력 모델 — 맨 아래 F 55 · E 135 · TTL 190 이 마감텔리 파일과 같다', m106.totals.F.n === v('BZ150') && m106.totals.E.n === v('BZ151') && m106.totals.TTL.n === v('BZ152'), `${m106.totals.F.n}/${m106.totals.E.n}/${m106.totals.TTL.n}`);
  ok('LOLO 구역 — D덱에만 굵은 선, 칸 수 45(마감텔리 크레인 45대)', !!pgOf('D').zone && pgOf('D').zone.cells === 45 && pgOf('D').zone.count === 45 && p106.lolo === 45 && m106.pages.filter((p) => p.zone).length === 1, pgOf('D').zone && pgOf('D').zone.count);
  const htmlL = M.renderToStaticMarkup(M.React.createElement(M.PrintableDeckPlan, { plan: p106, containers: [], xrayMap: {}, termWork: {}, voyageInfo: { vslFull: 'RIZHAO ORIENT', planDate: '2026-09-28 10:00' }, mode: 'loading', staticPreview: true, initialBw: false, inspector: '김성일' }));
  //  4.04-04 선적(마감텔리 양식)도 양하처럼 모든 덱 쪽에 서명줄 + 사인할 자리 — 검수사 2026-10-05 «둘다 서명이 필요합니다.» «양하 선적 동일 합니다»
  ok('선적 인쇄 — 서명란(검수원 이름 · CHIEF CHECKER · CHIEF OFFICER)이 덱 쪽마다 있다(C·D·UNDER 3쪽)', m106.pages.length === 3 && (htmlL.match(/CHIEF CHECKER/g) || []).length === 3 && (htmlL.match(/CHIEF OFFICER/g) || []).length === 3 && (htmlL.match(/>김성일</g) || []).length === 3, `${(htmlL.match(/CHIEF CHECKER/g) || []).length}/${(htmlL.match(/CHIEF OFFICER/g) || []).length}/${(htmlL.match(/>김성일</g) || []).length}`);
  {
    const svgs = htmlL.split('<svg').slice(1);
    const lowest = (pg) => { let mx = 0; const up = (y) => { if (Number.isFinite(y) && y > mx) mx = y; }; pg.cells.forEach((c) => up(c.y + c.h)); pg.empties.forEach((e) => up(e.y + e.h)); pg.xmarks.forEach((e) => up(e.y + e.h)); up(pg.px.y0 + pg.px.rows * pg.px.uh + 14); return mx; };   // 맨 아래 칸 번호 줄(격자 끝 + 14)도 센다
    const rows = m106.pages.map((pg, i) => { const sv = svgs[i] || ''; const m = new RegExp(`<line x1="50" y1="([\\d.]+)" x2="200" y2="\\1"`).exec(sv); const ly = m ? Number(m[1]) : NaN; const lb = /y="([\d.]+)"[^>]*>CHIEF CHECKER</.exec(sv); const lo = /<line x1="240" y1="([\d.]+)" x2="390"/.exec(sv); const nm = /y="([\d.]+)"[^>]*>김성일</.exec(sv); return { deck: pg.deck, line: ly, room: ly - lowest(pg), label: lb ? Number(lb[1]) : NaN, officer: lo ? Number(lo[1]) : NaN, name: nm ? Number(nm[1]) : NaN }; });
    ok('선적 인쇄 — 모든 덱 쪽에서 서명줄 위에 사인할 자리가 48단위(약 12mm) 이상 비어 있다(칸 · 빈 칸 · X 표식 · 칸 번호 줄 아래부터)', rows.length === 3 && rows.every((r) => Number.isFinite(r.line) && r.room >= 48), JSON.stringify(rows.map((r) => [r.deck, Math.round(r.room)])));
    ok('선적 인쇄 — 서명줄은 모델 상수(CHECKER_SIGN_Y)에 서고 Chief Officer 줄과 같은 높이 · 이름과 직책 글자는 맨 아래 범례줄(y 744)과 겹치지 않는다', rows.every((r) => r.line === M.CHECKER_SIGN_Y && r.officer === M.CHECKER_SIGN_Y && r.name > r.line && r.label > r.name && r.label + 4 < 738), JSON.stringify(rows));
    ok(`선적 인쇄 — 8줄 덱(C·D)의 칸 그림은 CHECKER_GRID_BOTTOM(${M.CHECKER_GRID_BOTTOM}) 에서 끝나고 UNDER(3줄)는 종전 칸 높이 66`, m106.pages.every((pg) => pg.px.y0 + pg.px.rows * pg.px.uh <= M.CHECKER_GRID_BOTTOM + 0.01) && m106.pages.filter((pg) => pg.px.rows === 8).length === 2 && m106.pages.filter((pg) => pg.px.rows === 3).every((pg) => pg.px.uh === 66));
    const mScrL = M.buildPrintModel({ plan: p106, containers: [], xrayMap: {}, termWork: {}, vsl: 'RIZHAO ORIENT', date: '2026-09-28', mode: 'loading', forScreen: true });
    ok('선적 앱 화면 — 칸 높이는 종전 그대로 66(forScreen) · 출력만 낮아진다', mScrL.pages.every((pg) => pg.px.uh === 66) && m106.pages.some((pg) => pg.px.uh < 66));
    //  칸 안 글자(맨 아래 줄 baseline)와 종류 글자(RF·DG, 칸 맨 아래)가 겹치지 않는다 — 값은 모델(칸 높이 c.h · 글자 줄 수)에서 읽고 CellView 의 배치 상수(첫 줄 +10 · 줄 간격 10.4 · 종류 글자 = 칸 높이 -5 안쪽 아래 3.2)를 쓴다.
    const gaps = m106.pages.flatMap((pg) => pg.cells.filter((c) => c.letter).map((c) => ((1 + (c.h - 5) - 3.2 - 6.8 * 0.72) - (1 + 10 + (c.lines.length - 1) * 10.4 + 1.5))));
    ok('선적 인쇄 — 낮아진 칸(C·D 높이 61)에서도 칸 글자 맨 아래 줄과 종류 글자(RF·DG)가 3단위 이상 떨어져 겹치지 않는다', gaps.length > 20 && gaps.every((g) => g >= 3), `칸 ${gaps.length} · 최소 ${Math.min(...gaps).toFixed(1)}`);
    //  UNDER 덱 컨이 없어(파서가 컨 0대 덱을 버린다) 8줄 덱(D)이 마지막 쪽이면 집계표가 서명줄 높이까지 내려온다 — 감사 지적: 서명줄(x 50~390)과 겹치지 않게 집계표를 오른쪽으로 민다
    const pNoU = { ...p106, decks: p106.decks.filter((d) => d.deck !== 'U') };
    const htmlNoU = M.renderToStaticMarkup(M.React.createElement(M.PrintableDeckPlan, { plan: pNoU, containers: [], xrayMap: {}, termWork: {}, voyageInfo: { vslFull: 'RIZHAO ORIENT', planDate: '2026-09-28 10:00' }, mode: 'loading', staticPreview: true, initialBw: false, inspector: '김성일' }));
    const tblMinX = (h) => { const sv = h.split('<svg').slice(1).pop() || ''; return Math.min(...[...sv.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="[\d.]+" height="[\d.]+" class="dp-tb"/g)].filter((m) => Number(m[2]) > 300).map((m) => Number(m[1]))); };
    ok('선적 인쇄 — UNDER 컨이 없어 D덱이 마지막 쪽이어도 집계표(x 400~)가 서명줄(x 50~390)과 겹치지 않고 서명이 둘 다 있다 · UNDER 가 있으면 집계표는 종전 자리(x 300)', (htmlNoU.split('<svg').length - 1) === 2 && tblMinX(htmlNoU) >= 400 && (htmlNoU.match(/CHIEF CHECKER/g) || []).length === 2 && tblMinX(htmlL) === 300, `${tblMinX(htmlNoU)} / ${tblMinX(htmlL)}`);
  }
  const htmlLs = m106.pages.map((pg, i) => M.renderToStaticMarkup(M.React.createElement(M.PageView, { pg, model: m106, bw: false, isFirst: i === 0, isLast: i === m106.pages.length - 1, screen: stubScreen, signer: '김성일' }))).join('');
  ok('선적 앱 화면 — 서명란(CHIEF CHECKER · CHIEF OFFICER · 이름 · 서명선)이 없다', !/CHIEF (CHECKER|OFFICER)/.test(htmlLs) && !/>김성일</.test(htmlLs) && !/<line x1="50" y1="710"/.test(htmlLs) && /CHASSIS/.test(htmlLs));
  const wbc = M.buildCheckerPlanWorkbook(XLSX, { plan: p106, vsl: 'RIZHAO ORIENT', voy: 'R106W', date: '2026-09-28', inspector: '김성일' });
  const wsc = wbc.Sheets[wbc.SheetNames[0]];
  {   // 4.04-04 선적 엑셀도 덱 블록(C·D)마다 서명 3줄 · UNDER 는 집계표 왼쪽 빈 칸 — 줄(맨 위 사인할 자리) · 이름 · 직책
    const txtAt = (r, c) => String(((cellAt(wsc, r, c) || {}).v) ?? '');
    const found = (t) => Object.keys(wsc).filter((a) => a[0] !== '!' && String(wsc[a].v) === t).map((a) => XLSX.utils.decode_cell(a));
    const cc = found('CHIEF CHECKER').map((x) => x.r).sort((a, b) => a - b), co = found('CHIEF OFFICER').map((x) => x.r).sort((a, b) => a - b), nm = found('김성일').map((x) => x.r).sort((a, b) => a - b);
    ok('선적 엑셀(마감텔리 양식) — 병합 칸이 서로 겹치지 않는다', overlaps(wsc) === 0, `겹침 ${overlaps(wsc)}`);
    ok('선적 엑셀 — 서명란(이름 · CHIEF CHECKER · CHIEF OFFICER)이 덱 블록마다 하나씩 3벌이고 같은 열(C 열~)에 선다', cc.join() === '51,103,158' && co.join() === '51,103,158' && nm.join() === '50,102,157' && found('CHIEF CHECKER').every((x) => x.c === 3) && found('CHIEF OFFICER').every((x) => x.c === 15), `${cc} / ${co} / ${nm}`);
    const rh = (r) => { const x = (wsc['!rows'] || [])[r]; return x && x.hpx ? x.hpx : 0; };   // 행 높이는 파일에 줄마다 적혀 있어야 한다(없으면 0 으로 쳐서 걸린다)
    const roomOf = (a, b) => { let t = 0; for (let r = a; r <= b; r++) t += rh(r); return t; };
    ok('선적 엑셀 — 칸 번호 줄 아래 서명줄까지 사인할 자리가 C·D 블록 64pt · UNDER 쪽 60pt 이상(배율 51~60 에서 약 11~13mm)', roomOf(49, 49) >= 64 && roomOf(101, 101) >= 64 && roomOf(153, 156) >= 60, [roomOf(49, 49), roomOf(101, 101), roomOf(153, 156)].join());
    ok('선적 엑셀 — 서명줄(아래 테두리)이 줄 칸 전체에 있다(병합 열 3~11 · 15~23)', [49, 101, 156].every((r) => [3, 11, 15, 23].every((c) => { const x = cellAt(wsc, r, c); return !!(x && x.s && x.s.border && x.s.border.bottom); })));
    ok('선적 엑셀 — UNDER 쪽 서명은 집계표(AB 열~)와 겹치지 않는다(서명 열 3~23 < 집계표 첫 열 27)', (wsc['!merges'] || []).filter((m) => m.s.r >= 154 && m.s.r <= 158).every((m) => (m.e.c <= 23) === (m.s.c <= 23)) && txtAt(154, 27) === 'CHASSIS');
    ok('선적 엑셀 — 서명 3줄을 넣어도 한 블록이 52줄 안에 들어 쪽 나눔(52·104)이 블록 경계다(다음 블록 제목이 그 다음 줄)', /STOW/.test(txtAt(52, 24)) && /STOW/.test(txtAt(104, 24)) && /STOW/.test(txtAt(0, 24)), `${txtAt(52, 24)}|${txtAt(104, 24)}`);
    //  쪽 높이 — 블록(52줄)·마지막 쪽(집계표까지)의 행 높이 합(pt) × 배율이 A4 가로 여백 안 높이(190mm)에 들어간다. 배율 60(상한)에서도 · 라이브러리 열 너비 때문에 낮아지는 배율(약 51)에서도 — 넘치면 서명 줄이 다음 쪽(빈 쪽)으로 밀린다.
    const lastRow = Math.max(...Object.keys(wsc).filter((a) => a[0] !== '!').map((a) => XLSX.utils.decode_cell(a).r));   // 값·서식이 있는 마지막 줄(인쇄되는 끝)
    const sumH = (a, b) => { let t = 0; for (let r = a; r <= b; r++) t += rh(r); return t; };
    const mm = (pt, sc) => pt * sc / 100 * 25.4 / 72;
    const heights = [sumH(0, 51), sumH(52, 103), sumH(104, lastRow)];
    ok('선적 엑셀 — 덱 블록 한 쪽 높이가 배율 60 에서 188mm 이하 · 배율 51 에서 170mm 이하(A4 가로 여백 안 190mm)', heights.every((h) => mm(h, 60) <= 188 && mm(h, 51) <= 170) && Array.from({ length: lastRow + 1 }, (_, r) => rh(r)).every((x) => x > 0), heights.map((h) => `${h}pt→${mm(h, 60).toFixed(0)}/${mm(h, 51).toFixed(0)}mm`).join(' '));
  }
  const termWork = JSON.parse(fs.readFileSync(fx('rzor_termwork_R106E.json'), 'utf8'));
  const gen = M.buildRzorLoadingDeckPlan({ containers: (termWork.containers || []).map((c) => ({ ...c, pod: 'CNRZH' })), termWork: {}, bayWork: termWork.bayWork || null, assign: null, voy: 'R106W' });
  const mg2 = M.buildPrintModel({ plan: gen, containers: [], xrayMap: {}, termWork: {}, vsl: 'RIZHAO ORIENT', date: '2026-09-28', mode: 'loading' });
  const zd = mg2.pages.find((p) => p.deck === 'D');
  ok('앱이 그린 선적 덱플랜도 같은 출력 — D덱에만 LOLO 구역(45~67칸, 보통 49 이내, 시프팅 최대 67)', !!zd && !!zd.zone && zd.zone.cells >= 45 && zd.zone.cells <= 67 && mg2.pages.filter((p) => p.zone).length === 1, zd && zd.zone && zd.zone.cells);
  const wbg = M.buildCheckerPlanWorkbook(XLSX, { plan: gen, vsl: 'RIZHAO ORIENT', voy: 'R106W', date: '2026-09-28', inspector: '김성일' });
  ok('앱이 그린 선적 덱플랜의 엑셀도 병합이 겹치지 않는다', overlaps(wbg.Sheets[wbg.SheetNames[0]]) === 0);

  //  4.04 감사 지적 — 지정(📌)된 X 칸과 빈 칸이 화면에서 끝 4자리로 보인다(옛 화면과 같다) · 엑셀 제목·날짜는 출력 허브와 같은 한 벌 · 로드 타임아웃
  const srcDp = fs.readFileSync(path.join(ROOT, 'src/components/PrintableDeckPlan.jsx'), 'utf8');
  const srcVp = fs.readFileSync(path.join(ROOT, 'src/pages/VoyagePage.jsx'), 'utf8');
  const srcXl = fs.readFileSync(path.join(ROOT, 'src/rzorPlanExcel.js'), 'utf8');
  ok('화면 — 지정(📌)된 X 칸도 빈 칸처럼 📌 끝4자리가 보인다', /pg\.xmarks\.map\(\(m, i\) => \{ const xs = sc && m\.slot \? sc\.emptyState\(m\) : null;/.test(srcDp) && /xs\.asg \? <text[^>]*>📌/.test(srcDp) && /st\.asg \? <text[^>]*>📌/.test(srcDp));
  const stubAsg = { ...stubScreen, emptyState: () => ({ asg: { cn: 'ABCD1234567' } }) };
  const genPg = mg2.pages.map((pg, i) => M.renderToStaticMarkup(M.React.createElement(M.PageView, { pg, model: mg2, bw: false, isFirst: i === 0, isLast: i === mg2.pages.length - 1, screen: stubAsg }))).join('');
  ok('화면 — 지정된 빈 칸(생성 덱플랜 빈자리 291칸)이 전부 📌 끝4자리로 보인다', (genPg.match(/📌4567/g) || []).length === mg2.pages.reduce((a, p) => a + p.empties.filter((e) => e.slot).length, 0), `${(genPg.match(/📌4567/g) || []).length}`);
  ok('엑셀 제목·날짜 — 화면 단추와 출력 허브가 같은 값(제목 vslFull 또는 RIZHAO ORIENT · 날짜 deckPlanDate)', /vsl: String\(voyage\?\.info\?\.vslFull \|\| 'RIZHAO ORIENT'\)\.toUpperCase\(\)/.test(srcVp) && /date: _deckPlanDate\(voyage\?\.info \|\| \{\}\)/.test(srcVp));
  ok('엑셀 도구 로드 — 15초 넘으면 포기하고 알린다(«만드는 중…» 이 끝나지 않지 않게)', /setTimeout\(\(\) => reject\(new Error\('xlsx-js-style 로드 시간 초과/.test(srcXl) && /clearTimeout\(tm\)/.test(srcXl));
  ok('출력 허브 — 화면(LOLO 탭)의 자동 덱플랜을 그대로 받아 종이와 화면의 예측 자리가 한 벌이다', /viewDeckPlan=\{_deckPlanEff\}/.test(srcVp) && /rzDeckPlan = viewDeckPlan;/.test(fs.readFileSync(path.join(ROOT, 'src/components/PrintHubModal.jsx'), 'utf8')));
  ok('출력 모델 — containers 가 null 이어도 죽지 않는다', (() => { try { M.buildPrintModel({ plan: p106, containers: null, xrayMap: {}, termWork: {}, vsl: 'R', date: '2026-09-28', mode: 'loading' }); return true; } catch (e) { return false; } })());

  console.log(`\n${bad ? '✘' : '✔'} RZOR 덱플랜 출력·화면(4.04) ${n - bad}/${n}`);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { console.log(`  ⚠ 임시 폴더를 못 치웠다 — ${TMP}`); }
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('✘ 연막검사 예외', (e && e.stack) || e); process.exit(1); });
