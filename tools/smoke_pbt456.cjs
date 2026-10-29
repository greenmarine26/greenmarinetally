// 4.56 속성 연막검사 — 양하 칸 추정(inferDischargePos)·양하 정확도(dischargeAccuracyOf)·자동 맞교환(applyAutoSwap)을 무작위 입력 수천 개로 시험하고, 시험이 실제로 버그를 잡는지(변이 3종)도 같이 잰다. 외부 패키지 없음(고정 씨앗 난수).
const path = require('path'); const fs = require('fs'); const esbuild = require('esbuild');
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const STUB = fs.readFileSync(path.join(__dirname, 'smoke_bayfirst.cjs'), 'utf8').match(/const stub = '([^']*)'/)[1];
const pad = (n) => String(n).padStart(2, '0');
// 고정 씨앗 난수 — 실패하면 같은 입력이 다시 나온다
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const stackKey = (e) => `${parseInt(e.bay, 10)}_${pad(e.row)}_${parseInt(e.tier, 10) >= 80 ? 'D' : 'H'}`;
// 항차 만들기 — 열 1~6개(베이 1~3 × 줄 1~3 × 홀드/데크), 열마다 컨 1~5대, 완료 순서는 뒤섞고 일부만 완료, 일부는 사람이 칸을 찍음(서로 돌려 찍어 겹침 없음)
const makeVoyage = (R) => {
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1)); const edi = {}, comp = {}, records = {}; let t = 1000, k = 0; const seen = new Set(); const grp = {};
  for (let q = ri(1, 6); q > 0; q--) {
    const bay = ri(1, 3), row = ri(1, 3), deck = R() < 0.5, n = ri(1, 5); const key = `${bay}_${row}_${deck}`; if (seen.has(key)) continue; seen.add(key);
    const tiers = Array.from({ length: n }, (_, i) => (deck ? 82 : 2) + 2 * i); const order = tiers.map((x, i) => [R(), i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    for (const ti of order) {
      const cn = `C${pad(k++)}`; edi[cn] = { cn, bay, row: pad(row), tier: pad(tiers[ti]), pol: 'P' + (ti % 2) };
      if (R() < 0.7) { comp[cn] = { at: (t += 7) }; const km = ri(0, 2); if (km === 1) records[cn] = { bay_actual: String(bay), row_actual: pad(row), tier_actual: pad(tiers[ti]) }; else if (km === 2) (grp[key] = grp[key] || []).push([cn, bay, row, tiers[ti]]); }
    }
  }
  for (const list of Object.values(grp)) list.forEach(([cn, bay, row], i) => { records[cn] = { bay_actual: String(bay), row_actual: pad(row), tier_actual: pad(list[(i + 1) % list.length][3]) }; });
  return { discharge: { ediContainers: edi, completed: comp, records } };
};
const slotOf = (r) => `${parseInt(r.bay_actual, 10)}_${r.row_actual}_${parseInt(r.tier_actual, 10)}`;
const PROPS = [
  ['입력을 바꾸지 않는다', (U, v) => { const s = JSON.stringify(v); U.inferDischargePos(v); return JSON.stringify(v) === s; }],
  ['추정 칸은 같은 열의 계획 칸이고 열 안에서 겹치지 않는다', (U, v) => { const out = U.inferDischargePos(v); const edi = v.discharge.ediContainers; const used = {};
    for (const [cn, r] of Object.entries(out.discharge.records || {})) { if (r._pos_src !== 'infer') continue; const e = edi[cn]; const sl = slotOf(r);
      if (!Object.values(edi).some((x) => stackKey(x) === stackKey(e) && `${x.bay}_${x.row}_${parseInt(x.tier, 10)}` === sl) || used[sl]) return false; used[sl] = 1; } return true; }],
  ['사람이 찍은 칸은 그대로 남고 한 칸에 두 대가 앉지 않는다', (U, v) => { const rs = U.inferDischargePos(v).discharge.records || {}; for (const [cn, r] of Object.entries(v.discharge.records)) if (JSON.stringify(rs[cn]) !== JSON.stringify(r)) return false;
    const by = {}; for (const r of Object.values(rs)) { const sl = slotOf(r); by[sl] = (by[sl] || 0) + 1; } return Object.values(by).every((n) => n === 1); }],
  ['두 번 돌려도 같다', (U, v) => { const a = U.inferDischargePos(v); return JSON.stringify(a) === JSON.stringify(U.inferDischargePos(a)); }],
  ['정확도 숫자끼리 맞는다(0<=다름<=비교<=완료 · 출발항 합 = 비교)', (U, v) => { const a = U.dischargeAccuracyOf(v, null); const s = a.byPol.reduce((t, x) => t + x.n, 0), d = a.byPol.reduce((t, x) => t + x.diff, 0); return a.diff >= 0 && a.diff <= a.n && a.n <= a.done && s === a.n && d === a.diff && a.same + a.diff === a.n && a.stacks <= a.diff; }],
  ['정확도 독립 셈 — 열 안 완료 n번째가 n번째 높은 단이 아니면 다름(사람 칸 없는 입력)', (U, v0) => { const v = { discharge: { ...v0.discharge, records: {} } }; const edi = v.discharge.ediContainers, comp = v.discharge.completed; const a = U.dischargeAccuracyOf(v, null);
    const by = {}; for (const cn of Object.keys(edi)) (by[stackKey(edi[cn])] = by[stackKey(edi[cn])] || []).push(cn); let n = 0, diff = 0;
    for (const list of Object.values(by)) { const done = list.filter((cn) => comp[cn]).sort((x, y) => comp[x].at - comp[y].at); if (done.length < 2) continue; const slots = list.map((cn) => parseInt(edi[cn].tier, 10)).sort((x, y) => y - x); done.forEach((cn, i) => { n++; if (slots[i] !== parseInt(edi[cn].tier, 10)) diff++; }); }
    return a.n === n && a.diff === diff; }],
  ['사람 칸이 있는 컨은 계획과 같으면 같음 · 다르면 다름으로 정확도에 든다', (U, v) => { const edi = v.discharge.ediContainers; const a = U.dischargeAccuracyOf(v, null); let same = 0, diff = 0; for (const [cn, r] of Object.entries(v.discharge.records)) { if (parseInt(r.tier_actual, 10) === parseInt(edi[cn].tier, 10)) same++; else diff++; } return a.diff >= diff && a.n >= same + diff; }],
];
// 선적 한 해치 — 자리 2~8개, 컨 한 대가 한 자리(규격 둘 중 하나), 일부는 서로 자리를 바꿔 실리고(순열) 일부는 아직 안 실림, 계획에 없는 초과 컨이 앉기도 함
const makeLoading = (R) => {
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1)); const n = ri(2, 8); const edi = {}, recs = {}, comp = {}; const slots = Array.from({ length: n }, (_, i) => ({ bay: 1, row: pad(1 + (i % 2)), tier: pad(2 + 2 * Math.floor(i / 2)) }));
  slots.forEach((sl, i) => { edi['C' + i] = { cn: 'C' + i, ...sl, iso: R() < 0.5 ? '22G1' : '45G1', fe: 'F', pol: 'A', pod: 'B' }; });
  const order = slots.map((x, i) => [R(), i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]); let t = 100;
  order.forEach((si, j) => { if (R() < 0.6) { const sl = slots[si]; recs['C' + j] = { cn: 'C' + j, bay_actual: String(sl.bay), row_actual: sl.row, tier_actual: sl.tier }; comp['C' + j] = { at: (t += 5) }; } });
  if (R() < 0.3) { const sl = slots[0]; recs.X = { cn: 'X', bay_actual: '1', row_actual: sl.row, tier_actual: sl.tier }; comp.X = { at: 9999 }; }
  return { loading: { ediContainers: edi, records: recs, completed: comp } };
};
const effSlot = (r) => (r.bay_actual != null && r.bay_actual !== '' ? `${parseInt(r.bay_actual, 10)}_${r.row_actual}_${r.tier_actual}` : r.bay_assign != null ? `${parseInt(r.bay_assign, 10)}_${r.row_assign}_${r.tier_assign}` : null);
const noAt = (o) => JSON.stringify(o, (k, x) => (k === 'assign_at' ? undefined : x));   // 배정 시각은 시계라 비교에서 뺀다
const LPROPS = [
  ['맞교환: 입력을 바꾸지 않는다', (U, v) => { const s = JSON.stringify(v); U.applyAutoSwap(v); return JSON.stringify(v) === s; }],
  ['맞교환: 실린 컨의 실제 자리는 안 바뀐다', (U, v) => { const o = U.applyAutoSwap(v); return Object.entries(v.loading.records).every(([cn, r]) => JSON.stringify(o.loading.records[cn]) === JSON.stringify(r) || (o.loading.records[cn].bay_actual === r.bay_actual && o.loading.records[cn].row_actual === r.row_actual && o.loading.records[cn].tier_actual === r.tier_actual)); }],
  ['맞교환: 자동 배정된 컨은 다른 컨(실린 컨·다른 배정)과 같은 자리에 겹치지 않는다', (U, v) => { const rs = U.applyAutoSwap(v).loading.records; const used = {}; for (const r of Object.values(rs)) if (r.bay_actual) { const k = effSlot(r); used[k] = (used[k] || 0) + 1; }
    for (const r of Object.values(rs)) if (r._assign_src === 'autoswap') { const k = effSlot(r); if (used[k]) return false; used[k] = 1; } return true; }],
  ['맞교환: 두 번 돌려도 같다(배정 시각 제외)', (U, v) => { const a = U.applyAutoSwap(v); return noAt(a) === noAt(U.applyAutoSwap(a)); }],
];
const run = (U, runs = 3000) => { const bad = []; for (const [name, f, gen] of [...PROPS, ...LPROPS.map((x) => [x[0], x[1], makeLoading])]) { const R = rng(456); let bro = null; for (let i = 0; i < runs && !bro; i++) { const v = (gen || makeVoyage)(R); try { if (!f(U, v)) bro = v; } catch (e) { bro = { error: String(e), v }; } } if (bro) bad.push([name, bro]); } return bad; };
(async () => {
  console.log('속성 시험(4.56) — 양하 칸 추정·양하 정확도, 무작위 입력 3000개씩(맞교환 포함)');
  const build = async () => (await esbuild.build({
    stdin: { contents: "export { inferDischargePos, dischargeAccuracyOf, applyAutoSwap } from './src/utils.js';", resolveDir: path.join(__dirname, '..'), loader: 'js' },
    bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent',
    plugins: [{ name: 'fb', setup(b) { b.onResolve({ filter: /^firebase\// }, a => ({ path: a.path, namespace: 'fb' })); b.onLoad({ filter: /.*/, namespace: 'fb' }, () => ({ contents: STUB, loader: 'js' })); } }]
  })).outputFiles[0].text;
  global.window = global.window || {}; global.document = global.document || { createElement: () => ({}) };
  const load = (code) => { const m = { exports: {} }; new Function('module', 'exports', 'require', code)(m, m.exports, require); return m.exports; };
  const code = await build();
  const bad = run(load(code));
  for (const [name] of [...PROPS, ...LPROPS]) { const b = bad.find((x) => x[0] === name); ok(!b, name); if (b) console.log('    반례', JSON.stringify(b[1]).slice(0, 500)); }
  //  시험에 힘이 있는가 — 일부러 망가뜨린 코드를 최소 한 규칙이 잡아야 한다(못 잡으면 시험이 허술한 것)
  const MUT = [['높은 단부터 채우는 정렬을 뒤집음', '.sort((a, b) => b.tier - a.tier)', '.sort((a, b) => a.tier - b.tier)'], ['제 칸에서 나온 컨도 바뀐 것으로 셈', 'if (s.tier === m.tier) return;', 'if (false) return;'], ['사람이 찍은 칸을 빈 칸으로 셈', '!claimed.has(', 'claimed.has('], ['맞교환이 빈 자리 확인 없이 아무 자리로 보냄', 'if (isFree(pA)) {', 'if (true) {']];
  for (const [what, from, to] of MUT) { const n = code.split(from).length - 1; if (n !== 1) { ok(false, `변이 «${what}» — 바꿀 자리가 ${n}곳(1곳이어야 함: 소스가 바뀌었으면 이 시험도 고친다)`); continue; } ok(run(load(code.replace(from, to)), 800).length > 0, `변이 «${what}» 를 시험이 잡는다`); }
  console.log(fail ? `\n✗ 속성 연막검사 ${fail}건 실패` : '\n✔ 속성 연막검사 전부 통과'); process.exit(fail ? 1 : 0);
})();
