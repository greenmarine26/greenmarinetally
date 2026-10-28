// 4.55-03 연막검사 — 양하 완료 순서로 먼저 나온 컨의 실제 칸을 추정하고 밀려난 컨을 비운 칸으로 보낸다(NSFR 2620N 실데이터).
const path = require('path'); const fs = require('fs'); const esbuild = require('esbuild');
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const STUB = fs.readFileSync(path.join(__dirname, 'smoke_bayfirst.cjs'), 'utf8').match(/const stub = '([^']*)'/)[1];
(async () => {
  console.log('양하 내린 순서로 실제 칸 추정(4.55-03) — NSFR 2620N 실데이터');
  const out = path.join(require('os').tmpdir(), '_smoke_dischargeinfer455_' + process.pid + '.cjs');
  await esbuild.build({
    stdin: { contents: "export { inferDischargePos, applyAutoSwap, stripCatosPos } from './src/utils.js'; export { buildGuidedQueue } from './src/guidedQueue.js';", resolveDir: path.join(__dirname, '..'), loader: 'js' },
    bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
    plugins: [{ name: 'fb', setup(b) { b.onResolve({ filter: /^firebase\// }, a => ({ path: a.path, namespace: 'fb' })); b.onLoad({ filter: /.*/, namespace: 'fb' }, () => ({ contents: STUB, loader: 'js' })); } }],
  });
  global.window = global.window || {}; global.document = global.document || { createElement: () => ({}) };
  const U = require(out); fs.unlinkSync(out);
  const F = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'nsfr_2620n_discharge_swap.json'), 'utf8'));
  const full = (s) => Object.keys(F.ediContainers).find((c) => c.endsWith(s));
  const at = (s) => F.completed[full(s)].at;
  const run = (cut, extra) => {
    const comp = {}; for (const [k, v] of Object.entries(F.completed)) if (v.at <= cut) comp[k] = v;
    return { discharge: { ediContainers: F.ediContainers, completed: comp, records: { ...(extra || {}) } } };
  };
  const slot = (r) => `${parseInt(r.bay_actual, 10)}-${r.row_actual}-${r.tier_actual}`;
  // ① 실측 사고 — 4972 가 5128(16-06-86) 자리에서 나옴
  let v = U.inferDischargePos(run(at('4972')));
  const rec = v.discharge.records;
  ok(rec[full('4972')] && slot(rec[full('4972')]) === '16-06-86' && rec[full('4972')]._pos_src === 'infer', '① 4972 의 실제 칸 = 16-06-86 (추정 표식)');
  const sw = U.applyAutoSwap(v).discharge.records[full('5128')];
  ok(sw && `${sw.bay_assign}-${sw.row_assign}-${sw.tier_assign}` === '16-06-84', '① 5128 은 4972 가 비운 16-06-84 로');
  // ② 다음 차례 — 86단 안에서 8757 다음에 5128 을 기다리지 않는다
  const rem = (rs) => Object.values(F.ediContainers).filter((e) => !v.discharge.completed[e.cn] && parseInt(e.bay, 10) === 16).map((e) => {
    const r = rs[e.cn] || {}; return r.bay_assign ? { ...e, bay: r.bay_assign, row: r.row_assign, tier: r.tier_assign } : e; });
  const order = (rs) => U.buildGuidedQueue({ containers: rem(rs), mode: 'discharge', evenRowsSeaSide: true }).map((c) => c.main.cn.slice(-4));
  const q0 = order(v.discharge.records), q1 = order(U.applyAutoSwap(v).discharge.records);
  ok(q0.indexOf('5128') > q0.indexOf('8757'), '② 추정만 있고 맞교환 전: 8757 이 5128 앞');
  ok(q1.indexOf('8757') >= 0 && q1.indexOf('8757') < q1.indexOf('5128') && q1.indexOf('5128') > q1.indexOf('2838'), '② 맞교환 뒤 5128 은 84단 차례로 이동 (86단 안에서 기다리지 않음)');
  // ③ 끝까지 — 여섯 건(열두 대)만, 한 칸에 두 대 없음
  v = U.inferDischargePos(run(9e15));
  const inf = Object.entries(v.discharge.records).filter(([, r]) => r._pos_src === 'infer');
  ok(inf.length === 12, `③ 추정 12대(여섯 건) — 실제 ${inf.length}`);
  const plan = (c) => `${parseInt(F.ediContainers[c].bay, 10)}-${F.ediContainers[c].row}-${F.ediContainers[c].tier}`;
  const planSet = new Set(inf.map(([c]) => plan(c))); const actSet = new Set(inf.map(([, r]) => slot(r)));
  ok(planSet.size === 12 && actSet.size === 12 && [...planSet].every((s) => actSet.has(s)), '③ 열두 대가 서로 칸을 맞바꿈 (칸 합집합 불변·겹침 없음)');
  // ④ 사람이 찍은 칸은 안 덮는다
  v = U.inferDischargePos(run(at('4972'), { [full('4972')]: { bay_actual: '16', row_actual: '06', tier_actual: '84' } }));
  ok(!v.discharge.records[full('4972')]._pos_src, '④ 사람이 찍은 칸(_pos_src 없음)은 그대로');
  v = U.inferDischargePos(run(at('4972'), { [full('4972')]: { bay_actual: '16', row_actual: '06', tier_actual: '84', _pos_src: 'pnct' } }));
  ok(v.discharge.records[full('4972')]._pos_src === 'pnct' && slot(v.discharge.records[full('4972')]) === '16-06-84', '④ 터미널이 준 실측 칸(pnct·catos)도 추정이 덮지 않는다');
  // ⑤ 같은 시각이면 순서를 지어내지 않는다
  const same = run(9e15); for (const k of Object.keys(same.discharge.completed)) same.discharge.completed[k] = { at: 1 };
  ok(Object.values(U.inferDischargePos(same).discharge.records).filter((r) => r._pos_src).length === 0, '⑤ 완료 시각이 모두 같으면 추정 0');
  // ⑥ 보관 직전 벗긴다
  v = U.inferDischargePos(run(9e15));
  const stripped = U.stripCatosPos(v).discharge.records;
  ok(Object.values(stripped).every((r) => !r._pos_src && r.bay_actual === undefined), '⑥ stripCatosPos 가 추정 칸을 벗긴다(DB 에 안 굳음)');
  // ⑦ 배선 — 검수앱 구독·콘앱이 같은 차례로 돈다
  const fbs = fs.readFileSync(path.join(__dirname, '..', 'src', 'firebase.js'), 'utf8');
  ok(/applyCatosPos\(v\)[\s\S]{0,200}inferDischargePos\(v\)[\s\S]{0,200}applyAutoSwap\(v\)/.test(fbs), '⑦ firebase 구독: applyCatosPos → inferDischargePos → applyAutoSwap');
  const cone = fs.readFileSync(path.join(__dirname, '..', 'public', 'cone.html'), 'utf8');
  ok(/P\.applyAutoSwap\(P\.inferDischargePos\(P\.applyCatosPos\(voy\)\)\)/.test(cone), '⑦ 콘앱: 같은 차례');
  ok(/inferDischargePos/.test(fs.readFileSync(path.join(__dirname, '..', 'src', 'coneCargoPlan.entry.jsx'), 'utf8')), '⑦ 콘앱 번들이 inferDischargePos 를 내보냄');
  if (fail) { console.log(`✗ ${fail}건 실패`); process.exit(1); }
  console.log('✓ 통과');
})().catch((e) => { console.error(e); process.exit(1); });
