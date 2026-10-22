// 4.42-04 연막검사 — 양하에서 다른 컨이 카드 칸에 내리면 칸 주인(EDI 컨)이 비운 칸으로 자동 맞바꿈된다(한 대 들어오면 한 대 나간다). 실소스 utils.applyAutoSwap 그대로(Firebase 만 스텁). 자료 = DJCF 0152N 양하 실데이터 4대.
const path = require('path'); const fs = require('fs'); const esbuild = require('esbuild');
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const STUB = fs.readFileSync(path.join(__dirname, 'smoke_bayfirst.cjs'), 'utf8').match(/const stub = '([^']*)'/)[1];
(async () => {
  console.log('양하 실제 내린 자리 맞바꿈(4.42-04)');
  const out = path.join(require('os').tmpdir(), '_smoke_dischargeswap442_' + process.pid + '.cjs');
  await esbuild.build({
    stdin: { contents: "export { applyAutoSwap, effectivePos } from './src/utils.js';", resolveDir: path.join(__dirname, '..'), loader: 'js' },
    bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
    plugins: [{ name: 'fb', setup(b) { b.onResolve({ filter: /^firebase\// }, a => ({ path: a.path, namespace: 'fb' })); b.onLoad({ filter: /.*/, namespace: 'fb' }, () => ({ contents: STUB, loader: 'js' })); } }],
  });
  const U = require(out); fs.unlinkSync(out);
  const edi = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'djcf_0152n_swap.json'), 'utf8')).ediContainers;
  const run = (recs) => U.applyAutoSwap({ discharge: { ediContainers: edi, records: recs, completed: {} } }).discharge.records;
  const act = (c) => ({ bay_actual: String(parseInt(edi[c].bay, 10)), row_actual: edi[c].row, tier_actual: edi[c].tier });
  const asg = (r) => `${r.bay_assign}-${r.row_assign}-${r.tier_assign}`;
  const plan = (c) => `${parseInt(edi[c].bay, 10)}-${edi[c].row}-${edi[c].tier}`;
  // ① 실측 사고 — BMOU1395416(EDI 19-01-04)이 SKLU2300550 칸(17-05-08)에 내렸다. SKLU 는 19-01-04 로 간다.
  let o = run({ BMOU1395416: { ...act('SKLU2300550') } });
  ok(asg(o.SKLU2300550) === '19-01-04' && !o.SKLU2300550._assign_warn, '① SKLU2300550 → 19-01-04 (BMOU 가 비운 칸 · 속성 같아 경고 없음)');
  ok(U.effectivePos({ ...edi.SKLU2300550, ...o.SKLU2300550 }).bay === '19', '① 화면 자리(effectivePos)도 19번 베이');
  // ② 한 번 더 — 다른 두 컨(BMOU1392783 이 BMOU1393645 칸에 내림) 도 같은 규칙
  o = run({ BMOU1392783: { ...act('BMOU1393645') } });
  ok(asg(o.BMOU1393645) === plan('BMOU1392783').replace(/^(\d+)-/, '$1-'), '② 두 번째 어긋남도 칸 주인이 비운 칸으로 (' + asg(o.BMOU1393645) + ')');
  // ③ 두 건 동시 — 한 대 들어오면 한 대 나가므로 베이별 대수가 변하지 않는다
  o = run({ BMOU1395416: { ...act('SKLU2300550') }, BMOU1392783: { ...act('BMOU1393645') } });
  const cnt = {}; const pos = (c) => { const r = o[c] || {}; const e = edi[c]; return r.bay_actual ? String(parseInt(r.bay_actual, 10)) : r.bay_assign ? String(parseInt(r.bay_assign, 10)) : String(parseInt(e.bay, 10)); };
  const before = {}; Object.keys(edi).forEach(c => { before[parseInt(edi[c].bay, 10)] = (before[parseInt(edi[c].bay, 10)] || 0) + 1; });
  Object.keys(edi).forEach(c => { const b = pos(c); cnt[b] = (cnt[b] || 0) + 1; });
  ok(JSON.stringify(Object.entries(cnt).sort()) === JSON.stringify(Object.entries(before).sort()), '③ 베이별 대수 불변 ' + JSON.stringify(cnt));
  const slots = Object.keys(edi).map(c => { const r = o[c] || {}; return r.bay_actual ? `${parseInt(r.bay_actual, 10)}-${r.row_actual}-${r.tier_actual}` : r.bay_assign ? `${parseInt(r.bay_assign, 10)}-${r.row_assign}-${r.tier_assign}` : plan(c); });
  ok(new Set(slots).size === slots.length, '③ 한 칸에 두 대 없음');
  // ④ 배선 — 화면 코드가 양하 완료 때 실제 내린 자리를 기록한다
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'GuidedWorkPanel.jsx'), 'utf8');
  ok(/markDischargeSlot\(actual, slot\)/.test(src) && /markDischargeSlot\(pf, card\.main\)/.test(src) && /markDischargeSlot\(pb, card\.twin\)/.test(src) && /mode !== 'discharge'/.test(src), '④ GuidedWorkPanel 양하 완료 3길(단독·트윈 앞·뒤)이 자리를 기록한다');
  if (fail) { console.log(`✗ ${fail}건 실패`); process.exit(1); }
  console.log('✓ 통과');
})().catch(e => { console.error(e); process.exit(1); });
