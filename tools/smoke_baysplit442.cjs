// 4.42 연막검사 — 자동 가이드 «23번 / (24)25번» 나눠 고르기. 실소스 utils.bayPageSplitOf · guidedQueue.buildGuidedQueue 를 그대로 돌린다(Firebase 만 스텁). 자료 = ATPR 2646E 보관본(tools/fixtures/mirgoto_atpr2646e.json).
//   기준표는 코드가 아니라 검수원이 실제로 내린 순서(완료 at)다 — 13:30 뒤 25번 16대를 먼저, 그다음 23번 15대.
const path = require('path'); const fs = require('fs'); const esbuild = require('esbuild'); const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
global.window = dom.window; global.document = dom.window.document; global.localStorage = dom.window.localStorage;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const STUB = fs.readFileSync(path.join(__dirname, 'smoke_bayfirst.cjs'), 'utf8').match(/const stub = '([^']*)'/)[1];   // 3.77 연막과 같은 Firebase 스텁(한 벌)
(async () => {
  console.log('자동 가이드 «23번 / (24)25번» 나눠 고르기(4.42)');
  const out = path.join(require('os').tmpdir(), '_smoke_baysplit442_' + process.pid + '.cjs');
  await esbuild.build({
    stdin: { contents: "export { buildGuidedQueue } from './src/guidedQueue.js'; export { findTwinCandidate, getBayPairs } from './src/twin.js'; export { bayGroupCenter } from './src/swapGrade.js'; export { buildBayPagesFromSummary } from './src/cargoPlanCore.js'; export { bayPageSplitOf } from './src/utils.js';", resolveDir: path.join(__dirname, '..'), loader: 'js' },
    bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
    plugins: [{ name: 'fb', setup(b) { b.onResolve({ filter: /^firebase\// }, a => ({ path: a.path, namespace: 'fb' })); b.onLoad({ filter: /.*/, namespace: 'fb' }, () => ({ contents: STUB, loader: 'js' })); } }],
  });
  const Q = require(out); fs.unlinkSync(out);
  const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'mirgoto_atpr2646e.json'), 'utf8'));
  window.__fbShipBayDict = { ATPR: fx.dict };
  const sec = fx.voyage.discharge, comp = sec.completed || {};
  const all = Object.values(sec.ediContainers || {}).filter(c => c && c.cn).map(c => ({ ...c, bay: String(c.bay).padStart(2, '0'), _mode: c._mode || 'discharge' }));
  const imo = fx.voyage.info.imo, vsl = fx.voyage.info.vsl;
  const pairs = Q.getBayPairs(all, imo, vsl);
  const pages = Q.buildBayPagesFromSummary(fx.dict.bayDef) || [];
  const center = (b) => Q.bayGroupCenter(parseInt(b, 10), pairs);
  const at = (hm) => new Date(`2026-10-20T${hm}:00+09:00`).getTime();
  const left = (t) => all.filter(c => !(comp[c.cn] && comp[c.cn].at <= t));

  // ① 나누기 — 사전 쪽 그대로(홀로 선 앞 홀수 / 짝수+뒤홀수). 기준: 사전 baysSummary 키(023 단독 · 025 pairEven 24) — REF_베이페어링 «짝수+뒤홀수»
  const g24 = (t, tier) => left(t).filter(c => center(c.bay) === 24 && (tier ? (tier === 'deck' ? +c.tier >= 80 : +c.tier < 80) : true));
  const sp = Q.bayPageSplitOf(g24(at('13:30'), 'hold'), pages);
  ok(sp.map(p => p.lab).join('|') === '23번|(24)25번', `13:30 B23·24·25 홀드 → ${sp.map(p => `${p.lab} ${p.n}대`).join(' · ')}`);
  ok(sp[0].bay === 23 && sp[1].bay === 25, `넘기는 베이 — 23번 → 23 · (24)25번 → 25(20피트가 25번에 남음) — ${sp.map(p => p.bay)}`);
  ok(sp[0].n + sp[1].n === g24(at('13:30'), 'hold').length && sp[0].n === g24(at('13:30'), 'hold').filter(c => +c.bay === 23).length, '대수 — 두 쪽 합 = 장 남은 대수 · 23번 쪽 = 23번 베이 남은 대수');
  ok(Q.bayPageSplitOf(g24(at('13:30'), 'hold'), null).length === 0 && Q.bayPageSplitOf(g24(at('13:30'), 'hold'), []).length === 0, '사전 없으면 나누지 않는다(없는 베이를 지어내지 않는다)');
  ok(Q.bayPageSplitOf(g24(at('15:03'), 'hold'), pages).length === 0, '15:03 — 25번이 다 끝나 23번만 남으면 나눌 것이 없다(단추 없음)');
  ok(Q.bayPageSplitOf(left(at('09:00')).filter(c => center(c.bay) === 14), pages).length === 0, 'B13·14·15 — 이 항차엔 13번 컨이 없어 (14)15 쪽만 — 단추 없음');
  const sp2 = Q.bayPageSplitOf(left(at('09:00')).filter(c => center(c.bay) === 2), pages);
  ok(sp2.map(p => p.lab).join('|') === '01번|(02)03번', `1(2)3 → «01번 / (02)03번» — ${sp2.map(p => p.lab).join(' · ')}`);
  //  40피트만 남은 쪽은 짝수를 넘긴다(뒤홀수 20피트가 없으면 그 베이는 «먼저» 로 당길 카드가 없다)
  const only40 = Q.bayPageSplitOf([{ cn: 'A', bay: '23', tier: '06' }, { cn: 'B', bay: '24', tier: '06' }], pages);
  ok(only40.length === 2 && only40[1].lab === '(24)25번' && only40[1].bay === 24, '(24)25 쪽에 40피트(24)만 남으면 넘기는 베이는 24');

  // ② 어제 24번 홀드 다시 걷기 — 13:30 뒤 실제 내린 순서 31대. 지금 가이드 vs «(24)25번» 을 13:32 에 누른 가이드(그 베이가 끝나면 저절로 풂 — 패널과 같다)
  const grp = all.filter(c => center(c.bay) === 24 && +c.tier < 80);
  const order = grp.filter(c => comp[c.cn]).sort((a, b) => comp[a.cn].at - comp[b.cn].at || a.cn.localeCompare(b.cn));
  const findTwin = (t, al, used) => Q.findTwinCandidate(t, al, used, imo, vsl);
  const build = (rem, bf) => Q.buildGuidedQueue({ containers: rem, mode: 'discharge', evenRowsSeaSide: fx.voyage.info.berthSide === '우현', findTwin, streamPref: null, frontCns: null, rowFrom: null, planAll: all, bayFirst: bf });
  const walk = (pickAt) => {
    const rem = new Set(grp.map(c => c.cn)); let bf = null, picked = false; const hits = [];
    for (const c of order) {
      if (pickAt && !picked && comp[c.cn].at >= pickAt) { const p = Q.bayPageSplitOf(grp.filter(x => rem.has(x.cn)), pages).find(x => x.lab === '(24)25번'); bf = p ? p.bays : null; picked = true; }   // 패널과 같이 그 쪽의 베이들
      let q = build(grp.filter(x => rem.has(x.cn)), bf);
      if (bf && !q.some(k => [k.main, k.twin].some(x => x && [].concat(bf).includes(+x.bay)))) { bf = null; q = build(grp.filter(x => rem.has(x.cn)), null); }
      if (comp[c.cn].at >= at('13:30')) hits.push(!!q[0] && [q[0].main, q[0].twin].some(x => x && +x.bay === +c.bay));
      rem.delete(c.cn);
    }
    return hits;
  };
  const base = walk(null), split = walk(at('13:32'));
  const real25 = order.filter(c => comp[c.cn].at >= at('13:30') && +c.bay === 25).length, real23 = order.filter(c => comp[c.cn].at >= at('13:30') && +c.bay === 23).length;
  ok(base.length === 31 && real25 === 16 && real23 === 15, `기준표 — 13:30 뒤 실제로 내린 것 ${base.length}대(25번 ${real25} → 23번 ${real23})`);
  ok(base.filter(Boolean).length < 20, `[대조군] 지금 가이드는 그 31대 중 ${base.filter(Boolean).length}대만 실제 베이를 가리킨다`);
  ok(split.every(Boolean), `«(24)25번» 을 누르면 31대 전부 가이드가 실제 베이를 가리킨다(${split.filter(Boolean).length}/31) — 25번이 끝나면 저절로 23번`);

  // ③ «(24)25번» 은 그 쪽 전부(24 40피트 + 25 20피트) — 11:00 홀드 시작(24번 40피트 2대가 위). 기준 — 실제로 처음 내린 두 대(완료 at) = 24번 40피트.
  //    감사 2026-10-21 — 25번 하나만 당기면 첫 8장이 25번 20피트, 40피트가 밀렸다(1.76-05 «40피트 먼저» 와 어긋남).
  {
    const t11 = at('11:00');
    const rem11 = grp.filter(c => !(comp[c.cn] && comp[c.cn].at <= t11));
    const real = grp.filter(c => comp[c.cn] && comp[c.cn].at > t11).sort((a, b) => comp[a.cn].at - comp[b.cn].at || a.cn.localeCompare(b.cn)).map(c => `${+c.bay}-${c.row}-${c.tier}`);
    const p = Q.bayPageSplitOf(rem11, pages).find(x => x.lab === '(24)25번');
    ok(!!p && p.bays.join(',') === '24,25', `11:00 «(24)25번» 쪽 베이 = ${p && p.bays.join('·')}(24 40피트 · 25 20피트)`);
    const q = build(rem11, p.bays).map(k => `${+k.main.bay}-${k.main.row}-${k.main.tier}${k.twin ? '+' + (+k.twin.bay) : ''}`);
    const last25 = q.map((x, i) => (/^25-/.test(x) ? i : -1)).reduce((a, b) => Math.max(a, b), -1), first23 = q.findIndex(x => /^23-/.test(x));
    ok(q[0] === real[0] && q[1] === real[1] && /^24-/.test(real[0]) && /^24-/.test(real[1]), `첫 두 카드 ${q.slice(0, 2).join(' · ')} = 실제 처음 내린 ${real.slice(0, 2).join(' · ')}(24번 40피트)`);
    ok(last25 >= 0 && first23 > last25 && !q.some(x => /\+/.test(x)), `그다음 25번 ${q.filter(x => /^25-/.test(x)).length}장 → 23번(첫 23번 ${first23 + 1}번째 > 마지막 25번 ${last25 + 1}번째) · 트윈 없음(한 대씩)`);
    //  3.77·미르 [이동] 은 베이 하나 — 숫자 하나와 [그 숫자] 는 같은 큐
    const sig = (bf) => build(rem11, bf).map(k => `${k.main.cn}${k.twin ? '+' + k.twin.cn : ''}`).join(',');
    ok(sig(25) === sig([25]) && sig(23) === sig([23]) && sig(null) !== sig(25), '베이 하나(3.77 숫자)와 [그 베이] 는 같은 큐 — 종전 «N번 베이 먼저» 그대로');
  }

  // ④ 선적 — 쪼갠 짝은 20싱글이 아니다. 짝수 베이 40피트를 싣는 중에 «(02)03번» 을 눌러도 첫 카드는 그 40피트(트윈은 40피트 한 개와 같다 — 검수사 2026-08-13).
  //    기준 — 검수원이 실제로 다음에 실은 컨(완료 at). 2차 시뮬 2026-10-21 — 쪼갠 3-02-82 한 대가 40피트 전부보다 앞에 섰다(28걸음 23 → 0).
  {
    const BG = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'baygrid_dicts.json'), 'utf8'));
    const cases = [
      ['KBTR 2606E', JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'mirsame_kbtr.json'), 'utf8')).voyage, 'KBTR', '2026-09-10T13:33', 2, '(02)03번'],
      ['OBWH 2762W', JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'closingedi_obwh2762.json'), 'utf8')), 'OBWH', '2026-10-09T18:10', 10, '(10)11번'],   // 18:13~18:17 10번 40피트 3대 → 18:19 9+11-02-82 트윈
    ];
    for (const [name, v, code, hm, ce, lab] of cases) {
      window.__fbShipBayDict = { [code]: BG[code] };
      const L = v.loading, lc = L.completed || {};
      const t = new Date(`${hm}:00+09:00`).getTime();
      const vimo = (v.info && v.info.imo) || '', vv = (v.info && v.info.vsl) || code;
      const allL = Object.entries(L.ediContainers || {}).map(([k, c]) => ({ ...c, cn: c.cn || k })).filter(c => c.bay && c.row && c.tier).map(c => ({ ...c, bay: String(parseInt(c.bay, 10)).padStart(2, '0'), _mode: 'loading' }));
      const prs = Q.getBayPairs(allL, vimo, vv), pg = Q.buildBayPagesFromSummary(BG[code].bayDef) || [];
      const ctr = (b) => Q.bayGroupCenter(parseInt(b, 10), prs);
      const rem = allL.filter(c => ctr(c.bay) === ce && +c.tier >= 80 && !(lc[c.cn] && lc[c.cn].at < t));
      const next = rem.filter(c => lc[c.cn]).sort((a, b) => lc[a.cn].at - lc[b.cn].at || a.cn.localeCompare(b.cn))[0];
      const p = Q.bayPageSplitOf(rem, pg).find(x => x.lab === lab);
      const q = Q.buildGuidedQueue({ containers: rem, mode: 'loading', evenRowsSeaSide: (v.info && v.info.berthSide) === '우현', findTwin: (a, al, used) => Q.findTwinCandidate(a, al, used, vimo, vv), streamPref: null, frontCns: null, rowFrom: null, planAll: allL, bayFirst: p && p.bays });
      const f = q[0] && q[0].main, np = next && `${+next.bay}-${next.row}-${next.tier}`, fp = f && `${+f.bay}-${f.row}-${f.tier}`;
      //  같은 단의 40피트끼리는 로우 순서가 현장마다 달라(OBWH 18:13 은 08 로우부터) 베이·단까지만 본다 — 잴 것은 «쪼갠 20피트가 40피트보다 앞서지 않는다»
      ok(!!p && !!next && !!f && +f.bay === +next.bay && f.tier === next.tier && +next.bay % 2 === 0, `${name} 선적 ${hm.slice(11)} 데크 «${lab}» → 첫 카드 ${fp || '-'} · 실제 다음에 실은 ${np || '-'}(같은 ${next && +next.bay}번 40피트 ${next && next.tier}단 — 쪼갠 20피트가 앞서지 않음)`);
    }
  }

  if (fail) { console.log(`✗ ${fail}건 실패`); process.exit(1); }
  console.log('✓ 자동 가이드 «23번 / (24)25번» 연막 통과');
})().catch((e) => { console.error('✗ 검사 중 오류:', e && e.stack || e); process.exit(1); });
