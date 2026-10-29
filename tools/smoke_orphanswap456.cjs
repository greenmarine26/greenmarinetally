// 4.56-03 연막검사 — 실린 컨이 계획에 없는 칸·사람 칸과 겹친 칸에 앉았을 때 사슬이 닫히는 빈 계획 칸으로 돌린다(NSDC 2611S 선적 실데이터).
const path = require('path'); const fs = require('fs'); const esbuild = require('esbuild');
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const STUB = fs.readFileSync(path.join(__dirname, 'smoke_bayfirst.cjs'), 'utf8').match(/const stub = '([^']*)'/)[1];
(async () => {
  console.log('실린 컨의 계획 밖 칸 사슬 닫기(4.56-03) — NSDC 2611S 선적 실데이터');
  const out = path.join(require('os').tmpdir(), '_smoke_orphanswap456_' + process.pid + '.cjs');
  await esbuild.build({
    stdin: { contents: "export { applyAutoSwap, stripCatosPos } from './src/utils.js';", resolveDir: path.join(__dirname, '..'), loader: 'js' },
    bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
    plugins: [{ name: 'fb', setup(b) { b.onResolve({ filter: /^firebase\// }, a => ({ path: a.path, namespace: 'fb' })); b.onLoad({ filter: /.*/, namespace: 'fb' }, () => ({ contents: STUB, loader: 'js' })); } }],
  });
  global.window = global.window || {}; global.document = global.document || { createElement: () => ({}) };
  const U = require(out); fs.unlinkSync(out);
  const F = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'nsdc_2611s_loading_orphan.json'), 'utf8'));
  const clone = () => JSON.parse(JSON.stringify(F));
  const slot = (r) => `${parseInt(r.bay_actual, 10)}-${r.row_actual}-${r.tier_actual}`;
  const run = (f) => U.applyAutoSwap({ loading: { ediContainers: f.ediContainers, records: f.records, completed: f.completed } }).loading.records;
  const rs = run(clone());
  // ① 실측 사고 — 계획에 없는 14-02-86 에 앉은 TEMU6518190 이 사슬이 닫히는 30-10-84 로
  ok(slot(rs.TEMU6518190) === '30-10-84' && rs.TEMU6518190._swap_src === 'orphan', '① TEMU6518190 14-02-86 → 30-10-84 (원래 칸 보존)');
  // ② 사람 칸과 겹친 터미널 값 — NSSU0166120 은 13-06-82 에서 비켜 13-04-82 로, 사람이 찍은 BEAU2935999 는 그대로
  ok(slot(rs.NSSU0166120) === '13-04-82' && slot(rs.BEAU2935999) === '13-06-82' && !rs.BEAU2935999._swap_src, '② NSSU0166120 → 13-04-82 · 사람 BEAU2935999 는 13-06-82 그대로');
  // ③ 한 칸에 두 대 0 · 30번 베이 계획 칸 빈칸 0 (완료 컨 기준)
  const occ = {}; for (const r of Object.values(rs)) if (r.bay_actual) (occ[slot(r)] = occ[slot(r)] || []).push(r.cn);
  ok(Object.values(occ).every((v) => v.length === 1), '③ 한 칸에 두 대 없음');
  const planKey = (e) => `${parseInt(e.bay, 10)}-${e.row}-${e.tier}`;
  const hole = Object.values(F.ediContainers).filter((e) => e.bay === '30' && !occ[planKey(e)] && F.completed[e.cn]);
  const emptyPlanSlots = [...new Set(Object.values(F.ediContainers).filter((e) => e.bay === '30').map(planKey))].filter((k) => !occ[k] && !Object.values(F.ediContainers).some((e) => planKey(e) === k && !F.completed[e.cn]));
  ok(emptyPlanSlots.length === 0 && hole.length === 0, '③ 30번 베이 빈 계획 칸 0');
  // ④ 나머지는 한 칸도 안 바뀐다 — 바뀐 컨은 정확히 둘
  const changed = Object.keys(rs).filter((k) => F.records[k] && slot(rs[k]) !== slot(F.records[k]));
  ok(changed.length === 2, `④ 바뀐 컨 2대(TEMU6518190 · NSSU0166120) — 실제 ${changed.length}`);
  // ⑤ 보관 직전 벗기면 터미널이 준 원래 칸으로 돌아간다(DB 에 안 굳는다)
  const back = U.stripCatosPos({ loading: { ediContainers: F.ediContainers, records: rs, completed: F.completed } }).loading.records;
  ok(slot(back.TEMU6518190) === '14-02-86' && slot(back.NSSU0166120) === '13-06-82' && !back.TEMU6518190._swap_orig, '⑤ stripCatosPos 가 원래 칸으로 되돌림');
  // ⑥ 사람이 찍은 칸은 안 건드린다
  const h = clone(); h.records.TEMU6518190.actual_by = '박진우';
  ok(slot(run(h).TEMU6518190) === '14-02-86', '⑥ 사람이 찍은 14-02-86 은 그대로');
  // ⑦ 규격이 다르면 앱이 짐작하지 않는다
  const a = clone(); a.ediContainers.KMTU9517498.iso = '4300';
  ok(slot(run(a).TEMU6518190) === '14-02-86', '⑦ 빈 칸 주인과 규격이 다르면 그대로');
  // ⑧ 두 번 돌려도 같다(덧칠본 위에 또 돌려도 안 흔들린다)
  const r2 = U.applyAutoSwap({ loading: { ediContainers: F.ediContainers, records: rs, completed: F.completed } }).loading.records;
  ok(slot(r2.TEMU6518190) === '30-10-84' && slot(r2.NSSU0166120) === '13-04-82', '⑧ 두 번 돌려도 같은 칸');
  // ⑨ 감사 지적 — 사람 칸과 겹친 터미널 컨은 기록 키 순서가 바뀌어도 같은 칸으로 간다
  const mk = (order, mode) => {
    const e = (cn, tier) => ({ cn, bay: '10', row: '01', tier, iso: '45GE', fe: 'E', pod: 'KRKAN', pol: 'KRPTK' });
    const edi = { HUMN0000001: e('HUMN0000001', '86'), TERM0000001: e('TERM0000001', '82') };
    const rec = { HUMN0000001: { cn: 'HUMN0000001', bay_actual: '10', row_actual: '01', tier_actual: '82', actual_by: '박진우', moves: [{ to: '10-01-82' }] },
                  TERM0000001: { cn: 'TERM0000001', bay_actual: '10', row_actual: '01', tier_actual: '82', actual_by: '' } };
    const comp = { HUMN0000001: { at: 1 }, TERM0000001: { at: 2 } };
    const recs = {}; for (const k of order) recs[k] = rec[k];
    return U.applyAutoSwap({ [mode]: { ediContainers: edi, records: recs, completed: comp } })[mode].records;
  };
  const o1 = mk(['HUMN0000001', 'TERM0000001'], 'loading'), o2 = mk(['TERM0000001', 'HUMN0000001'], 'loading');
  ok(slot(o1.TERM0000001) === '10-01-86' && slot(o2.TERM0000001) === '10-01-86' && slot(o1.HUMN0000001) === '10-01-82', '⑨ 키 순서를 뒤집어도 터미널 컨이 10-01-86 으로 · 사람 칸 그대로');
  // ⑩ 양하에서는 이 규칙이 돌지 않는다(4.55-03 추정이 맡는다)
  const d1 = mk(['HUMN0000001', 'TERM0000001'], 'discharge');
  ok(slot(d1.TERM0000001) === '10-01-82' && !d1.TERM0000001._swap_src, '⑩ 양하는 손대지 않는다');
  // ⑪ 사슬 없이 제 계획 칸이 비었을 때는 같은 베이·같은 데크/홀드 안에서만 돌아간다
  const solo = (planBay, planTier, actBay, actTier) => {
    const edi = { SOLO0000001: { cn: 'SOLO0000001', bay: planBay, row: '02', tier: planTier, iso: '45GE', fe: 'E', pod: 'KRKAN', pol: 'KRPTK' } };
    const recs = { SOLO0000001: { cn: 'SOLO0000001', bay_actual: actBay, row_actual: '02', tier_actual: actTier, actual_by: '' } };
    return U.applyAutoSwap({ loading: { ediContainers: edi, records: recs, completed: { SOLO0000001: { at: 1 } } } }).loading.records.SOLO0000001;
  };
  ok(slot(solo('10', '84', '10', '86')) === '10-02-84', '⑪ 같은 베이·같은 데크 안이면 제 칸으로');
  ok(slot(solo('10', '84', '18', '84')) === '18-02-84' && slot(solo('10', '04', '10', '86')) === '10-02-86', '⑪ 다른 베이나 홀드↔데크면 짐작하지 않는다');
  if (fail) { console.log(`\n실패 ${fail}건`); process.exit(1); }
  console.log('\n전부 통과');
})();
