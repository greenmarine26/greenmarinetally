// 3.60-20 연막검사 — 마감텔리 = 수석검수사 실물(검수사 2026-09-25 «마감텔리는 현재 수석검수사들의 방법 그대로 합니다. 선박별로 비교해서 같게 만들면 됩니다»)
//   실물 TALLY REPORT 38항차 대조에서 남은 차이 둘: ① 배별 선사 별칭(NSFR·DPRT·SWDN·NSDC) ② 같은 칸에 겹친 엠티 플랫랙 묶음(BUNDLE) = Final Work FULL 1대(ATPR 2632E·2633E).
//   픽스처 tools/fixtures/tally_atpr2632e.json = 보관소 ATPR_2632E 양하 실자료(EDI 222 · 실물 Final Work 20F 115 · HCF 101 = 216).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix36020_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {}, location: { href: '' } };
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} }, createElement: () => ({ style: {} }) };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
(async () => {
  try {
    const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
    fs.writeFileSync(e, `export { computeTallyData, ptkContainers, buildMatrix, buildOS } from "${ROOT}/src/tallyReport.js";\nexport { shipOp, getTallyFormat } from "${ROOT}/src/data/tallyFormats.js";\n`);
    execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
    const T = require(o);
    const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/tally_atpr2632e.json'), 'utf8'));
    const voyage = { info: FX.info, reports: {}, discharge: { ediContainers: FX.discharge.ediContainers, records: FX.discharge.records, completed: {} }, loading: { ediContainers: {}, records: {}, completed: {} } };

    console.log('■ ② 엠티 플랫랙 번들 = Final Work FULL 1대 (ATPR 2632E 양하 실자료 · 실물 20F 115 · 20E 0 · HCF 101 = 216)');
    {
      const cs = T.ptkContainers(voyage, 'discharge');
      ok('평택분 222대(EDI 전부 — 실물 OS-IN 222 와 같음)', cs.length === 222, String(cs.length));
      const mat = T.buildMatrix(cs, 'discharge');
      const sum = (fe, sz) => Object.values(mat).reduce((a, ports) => a + Object.values(ports).reduce((b, x) => b + (((x[fe] || {})[sz]) || 0), 0), 0);
      ok(`Final Work 20'F = 115 (113 + 번들 2)`, sum('F', '20') === 115, String(sum('F', '20')));
      ok(`Final Work 20'E = 0 (종전 8 — 낱개 엠티 플랫랙)`, sum('E', '20') === 0, String(sum('E', '20')));
      ok(`Final Work HC F = 101 · 총 216 = 실물`, sum('F', 'HC') === 101 && sum('F', '20') + sum('F', 'HC') + sum('E', '20') + sum('E', 'HC') + sum('F', '40') + sum('E', '40') + sum('F', '45') + sum('E', '45') === 216);
      const frs = cs.filter((c) => c.fr && c.fe === 'E');
      ok('번들 재료 — 엠티 플랫랙 8대, 자리 bay1/01/08 ×4 · bay3/01/08 ×4 (22PE)', frs.length === 8 && frs.filter((c) => c.bay === '1').length === 4 && frs.filter((c) => c.bay === '3').length === 4);
      //  혼자 있는 엠티 플랫랙은 종전대로 E 1대 — 자리를 하나만 다른 곳으로 옮겨 본다
      const alone = cs.map((c) => (c.cn === 'CRTU7517377' ? { ...c, bay: '9', row: '05', tier: '82' } : c));
      const m2 = T.buildMatrix(alone, 'discharge');
      const s2 = (fe, sz) => Object.values(m2).reduce((a, ports) => a + Object.values(ports).reduce((b, x) => b + (((x[fe] || {})[sz]) || 0), 0), 0);
      ok(`홀로 선 엠티 플랫랙은 E 1대 (20'E 1 · 20'F 115 = 113 + 3대 묶음 1 + 4대 묶음 1)`, s2('E', '20') === 1 && s2('F', '20') === 115, `${s2('E', '20')} / ${s2('F', '20')}`);
      //  자리 없는 엠티 플랫랙은 묶을 수 없다 — 종전대로 E
      const noPos = cs.map((c) => (c.fr && c.fe === 'E' ? { ...c, bay: '', row: '', tier: '', bay_actual: undefined } : c));
      const m3 = T.buildMatrix(noPos, 'discharge');
      const s3 = (fe, sz) => Object.values(m3).reduce((a, ports) => a + Object.values(ports).reduce((b, x) => b + (((x[fe] || {})[sz]) || 0), 0), 0);
      ok('자리를 모르는 엠티 플랫랙은 종전대로 E 8대', s3('E', '20') === 8 && s3('F', '20') === 113, `${s3('E', '20')} / ${s3('F', '20')}`);
      //  자리 문자열 모양이 달라도 같은 자리('01'/'1' — 감사 중 2)
      const mixed = cs.map((c) => (c.cn === 'CRTU7517377' ? { ...c, bay_actual: '01', row_actual: '1', tier_actual: '8' } : c));
      const m4 = T.buildMatrix(mixed, 'discharge');
      const s4 = (fe, sz) => Object.values(m4).reduce((a, ports) => a + Object.values(ports).reduce((b, x) => b + (((x[fe] || {})[sz]) || 0), 0), 0);
      ok(`bay_actual '01'/row '1'/tier '8' 로 적힌 한 대도 같은 묶음(20'E 0 · 20'F 115)`, s4('E', '20') === 0 && s4('F', '20') === 115, `${s4('E', '20')} / ${s4('F', '20')}`);
      //  OS 시트는 낱개 그대로
      const R = T.computeTallyData(voyage);
      const osTxt = JSON.stringify(R.osIn);
      ok('computeTallyData 총 216 (Final Work 합 = 실물 · 종전 222)', R && R.totals && R.totals.dis && R.totals.dis.n === 216, JSON.stringify(R.totals && R.totals.dis));
      const pf = R.perf && R.perf.inbound && R.perf.inbound.SKR;
      ok('Performance 시트도 같은 목록 — SKR 20F 115 · 20E 없음 (실물 IN BOUND SKR 115·101·216, 감사 중 1)', pf && pf.F && pf.F['20'] === 115 && !(pf.E && pf.E['20']), JSON.stringify(pf));
      const osE20 = (R.osIn && R.osIn.rows ? R.osIn.rows : (Array.isArray(R.osIn) ? R.osIn : [])).filter((r) => r.size === "20'" && r.fe === 'EMPTY').reduce((a, r) => a + (r.manifested || 0), 0);
      ok('OS-IN 시트는 낱개 그대로 — 20 EMPTY manifested 8 (실물 OS-IN «20E 8 · FR x 8»)', osE20 === 8, `${osE20} · ${osTxt.slice(0, 120)}`);
    }

    console.log('■ ① 배별 선사 별칭 — 실물 Final Work 코드');
    {
      const cases = [['NSFR', 'KMD', 'KMT'], ['NSFR', 'NSL', 'NSS'], ['DPRT', 'HAL', 'HAS'], ['DPRT', 'NSL', 'NSS'], ['SWDN', 'NAM', 'NSL'], ['NSDC', 'KM', 'KMD'], ['NSDC', 'KMT', 'KMD'], ['NSDC', 'NSMS', 'NSL'], ['NSDC', 'NSS', 'NSL']];
      for (const [v, a, b] of cases) ok(`${v} ${a} → ${b}`, T.shipOp(v, a) === b, T.shipOp(v, a));
      ok('남의 배에는 안 씌운다 — STSE KMD 그대로 · SWAT NAM 그대로', T.shipOp('STSE', 'KMD') === 'KMD' && T.shipOp('SWAT', 'NAM') === 'NAM');
      ok('종전 별칭 그대로 — STSE DWS→DSL · DXQD NOL→DWS · TMPZ SOC→TJM', T.shipOp('STSE', 'DWS') === 'DSL' && T.shipOp('DXQD', 'NOL') === 'DWS' && T.shipOp('TMPZ', 'SOC') === 'TJM');
    }
    console.log('■ ③ L2G1 은 HC 로 센다(검수사 2026-09-25 · 수석 방식) — 진짜 45피트는 그대로');
    {
      fs.writeFileSync(path.join(TMP, 'e2.mjs'), `export { tallySizeCol } from "${ROOT}/src/tallyReport.js";\n`);
      execSync(`npx esbuild "${path.join(TMP, 'e2.mjs')}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${path.join(TMP, 'b2.cjs')}"`, { cwd: ROOT, stdio: 'pipe' });
      const S = require(path.join(TMP, 'b2.cjs'));
      ok('L2G1 → HC (TMPZ 2020E 양하 47대 실물 HC 칸)', S.tallySizeCol({ iso: 'L2G1' }) === 'HC', S.tallySizeCol({ iso: 'L2G1' }));
      ok('L5G1 · L5GP · 9500 · 45G1(라벨 40HC) — L5G1/9500 은 45\', 45G1 은 HC 종전 그대로', S.tallySizeCol({ iso: 'L5G1' }) === '45' && S.tallySizeCol({ iso: '9500' }) === '45' && S.tallySizeCol({ iso: '45G1' }) === 'HC' && S.tallySizeCol({ iso: '4500' }) === 'HC', [S.tallySizeCol({ iso: 'L5G1' }), S.tallySizeCol({ iso: '9500' }), S.tallySizeCol({ iso: '45G1' })].join('/'));
      ok('22G1 · 4310 · 2230 종전 그대로(20 · 40 · 20)', S.tallySizeCol({ iso: '22G1' }) === '20' && S.tallySizeCol({ iso: '4310' }) === '40' && S.tallySizeCol({ iso: '2230' }) === '20');
    }
    ok('APP_VERSION 이 3.60-20 이상', /APP_VERSION = 'TallyOne 3\.60-20'|\s3\.60-20 \*\*/.test(fs.readFileSync(path.join(ROOT, 'src/utils.js'), 'utf8')));

    console.log(`\n3.60-20 연막검사: ${n - bad}/${n}`);
    process.exit(bad ? 1 : 0);
  } catch (err) {
    console.error('연막검사 자체 실패:', err && err.stack || err);
    process.exit(1);
  }
})();
