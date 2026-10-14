// 회귀 기준표 R38 — 검수리스트 실번호 칸: 엠티는 엠티실(eseal)도 본다(4.25-02). smoke_regress.cjs 가 부른다.
//   검수사 2026-10-14 09:17 «TNJP 엠티 실번호가 검수리스트에는 나오지 않았습니다. 엠티실 리스트에 별도로는 실번호가 기록되어 있었지만 검수리스트에는 공백으로 나옴»
//   · 김성일 메모 2026-10-13 07:42 «TNJP 엠티실번호가 검수선적 리스트에는 표기가 안되어 있음, 따로 엠티 리스트 출력하면 표기 되어 있는데».
//   실소스(inspectionList.buildInspectionListDoc · utils.inspectionSealOf)를 esbuild 로 묶어 보관소 TNJP 26367W 선적 자료로 종이를 만든다(쓰기 없음).
//   ⚠ 기대값은 코드에서 베끼지 않는다 — 각 컨의 실번호는 원자료(records sl · eseal)에서 이 파일이 따로 고른다.
//   실행: smoke_regress.cjs 안에서 — require('./regress_r38_eseal.cjs')({ ROOT, TMP, ok, head, fx })
//         단독 — node tools/regress_r38_eseal.cjs <저장소 루트>
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

module.exports = async function r38({ ROOT, TMP, ok, head, fx }) {
  head('R38 검수리스트 실번호 칸 — 엠티는 엠티실(eseal) · 풀은 실번호(sl) 그대로 · 규격 꼴 글자는 거름 (4.25-02)',
    '검수사 2026-10-14 09:17 «TNJP 엠티 실번호가 검수리스트에는 나오지 않았습니다 … 검수리스트에는 공백으로 나옴» · 김성일 메모 2026-10-13 07:42');
  const F = fx('esealinsp_tnjp26367.json');
  const e = path.join(TMP, 'r38.mjs'), o = path.join(TMP, 'r38.cjs');
  fs.writeFileSync(e, `export { buildInspectionListDoc } from "${ROOT}/src/inspectionList.js";\nexport { inspectionSealOf } from "${ROOT}/src/utils.js";\n`);
  execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --log-level=error --external:firebase --external:firebase/* --loader:.js=jsx --jsx=automatic --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
  const M = require(o);
  //  화면·출력 센터와 같은 꼴 — EDI 위에 리스트(records) 칸을 얹는다(엠티실은 리스트에만 있다)
  const R = F.loading.records, E = F.loading.ediContainers;
  const conts = Object.keys(E).map((cn) => ({ ...E[cn], ...(R[cn] || {}), cn, _mode: 'loading', _inList: !!R[cn] }));
  const rowsOf = (html) => { const m = new Map(); const re = /<td class="cn">([A-Z]{4}\d{7})<\/td>\s*<td class="sl[^"]*">([^<]*)<\/td>/g; let x; while ((x = re.exec(html))) m.set(x[1], x[2]); return m; };
  const html = M.buildInspectionListDoc(conts, 'loading', F.info, []).html;
  const rows = rowsOf(html);
  //  기대 — 원자료에서 따로: 풀 = records sl(없으면 EDI sl) · 엠티 = records eseal
  const empties = Object.keys(R).filter((cn) => String(R[cn].fe).toUpperCase() === 'E');
  const fulls = Object.keys(R).filter((cn) => String(R[cn].fe).toUpperCase() === 'F');
  const eBad = empties.filter((cn) => rows.get(cn) !== String(R[cn].eseal || '').trim());
  const fBad = fulls.filter((cn) => rows.get(cn) !== String(R[cn].sl || (E[cn] || {}).sl || '').trim());
  ok(`①-1 TNJP 26367W 선적 검수리스트 ${rows.size}줄 — 엠티 ${empties.length}대 실번호 칸 = 엠티실(records.eseal) ${empties.length - eBad.length}/${empties.length} (예 ${empties[0]} «${rows.get(empties[0])}») · 종전엔 전부 빈칸`,
    rows.size === Object.keys(E).length && empties.length === 42 && eBad.length === 0, JSON.stringify({ size: rows.size, eBad: eBad.slice(0, 5).map((cn) => [cn, rows.get(cn), R[cn].eseal]) }));
  ok(`①-2 풀 ${fulls.length}대 실번호 칸 = 실번호(sl) 그대로 ${fulls.length - fBad.length}/${fulls.length} (예 ${fulls[0]} «${rows.get(fulls[0])}»)`,
    fulls.length === 50 && fBad.length === 0, JSON.stringify({ fBad: fBad.slice(0, 5).map((cn) => [cn, rows.get(cn), R[cn].sl]) }));
  //  ①-3 거름·우선 — 엠티 칸에 규격 꼴(45GP)이 들어온 컨은 빈칸(엠티실 리스트 V7.43 과 같은 거름) · 엠티라도 sl 이 있으면 sl(종전) · 풀은 eseal 이 있어도 sl
  const c0 = empties[0], c1 = empties[1], f0 = fulls[0];
  const v = (cn, patch) => conts.map((c) => (c.cn === cn ? { ...c, ...patch } : c));
  let cc = v(c0, { eseal: '45GP' }); cc = cc.map((c) => (c.cn === c1 ? { ...c, sl: 'SL0000001' } : c)); cc = cc.map((c) => (c.cn === f0 ? { ...c, eseal: '999999' } : c));
  const rows3 = rowsOf(M.buildInspectionListDoc(cc, 'loading', F.info, []).html);
  ok(`①-3 엠티 칸 규격 꼴 «45GP» → 빈칸(«${rows3.get(c0)}») · 엠티라도 sl 있으면 sl(«${rows3.get(c1)}») · 풀은 eseal 이 있어도 sl(«${rows3.get(f0)}»)`,
    rows3.get(c0) === '' && rows3.get(c1) === 'SL0000001' && rows3.get(f0) === String(R[f0].sl).trim(), JSON.stringify({ a: rows3.get(c0), b: rows3.get(c1), c: rows3.get(f0) }));
  //  ①-4 CSV(인쇄 창 «엑셀») 도 같은 한 벌 — 소스 배선(종이 칸과 CSV 가 같은 함수를 부른다)
  const src = fs.readFileSync(path.join(ROOT, 'src/inspectionList.js'), 'utf8');
  ok('①-4 배선 — 종이 실번호 칸과 CSV 실번호가 utils.inspectionSealOf 한 벌을 부른다(따로 셈 0)',
    (src.match(/inspectionSealOf\(c\)/g) || []).length === 2 && !/String\(c\.sl \|\| c\.seal/.test(src) && M.inspectionSealOf({ fe: 'E', eseal: '177057' }) === '177057');
};

//  단독 실행 — node tools/regress_r38_eseal.cjs <저장소 루트>
if (require.main === module) {
  process.env.TZ = 'Asia/Seoul';
  const ROOT = path.resolve(process.argv[2] || process.cwd());
  const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'r38_'));
  global.window = global.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, open: () => null, location: { href: '' }, __fbShipBayDict: {} };
  global.localStorage = global.localStorage || { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
  global.document = global.document || { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, createElement: () => ({ style: {} }), documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
  let n = 0, bad = 0;
  const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
  const head = (t, f) => { console.log(`■ ${t}`); console.log(`  (출처 ${f})`); };
  const fx = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures', f), 'utf8'));
  module.exports({ ROOT, TMP, ok, head, fx })
    .then(() => { console.log(`\nR38 ${n - bad}/${n}`); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (er) { /* 임시 */ } process.exit(bad ? 1 : 0); })
    .catch((er) => { console.error('✗ R38 오류', er && er.stack || er); process.exit(1); });
}
