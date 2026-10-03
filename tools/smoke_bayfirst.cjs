// 3.77 연막검사 — 양하·선적 자동가이드 «베이 먼저». 실소스 guidedQueue.buildGuidedQueue 를 그대로 돌린다(Firebase 만 스텁). 자료 = DPRT 2611N 3호기 33·34·35번 베이 실제 EDI 칸과 기사의 실제 완료 순서(양하). 선적은 실제 선적 순서 자료가 없어 같은 칸으로 물리 종속·짝 처리 불변식만 확인한다(실제 선적 순서와의 일치는 증명하지 못한다). 한계 — 패널의 자동 감지·자동 해제는 증명하지 않는다(bayFirst 를 직접 넣는다). 픽스처가 전부 데크라 홀드 분리·FR·streamPref 경로는 이 검사가 돌지 않는다(감사 퍼저로 따로 확인).
const path = require('path'); const fs = require('fs'); const esbuild = require('esbuild'); const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
global.window = dom.window; global.document = dom.window.document; global.localStorage = dom.window.localStorage;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const stub = 'export const initializeApp=()=>({});export const getDatabase=()=>({});export const getStorage=()=>({});export const ref=()=>({});export const get=async()=>({exists:()=>false});export const set=async()=>{};export const update=async()=>{};export const remove=async()=>{};export const push=()=>({});export const onValue=()=>()=>{};export const off=()=>{};export const goOffline=()=>{};export const goOnline=()=>{};export const child=()=>({});export const storageRef=()=>({});export const uploadBytes=async()=>({});export const getDownloadURL=async()=>"";export const deleteObject=async()=>{};export const listAll=async()=>({items:[]});';
(async () => {
  const out = path.join(require('os').tmpdir(), '_smoke_bayfirst_' + process.pid + '.cjs');
  await esbuild.build({
    stdin: { contents: "export { buildGuidedQueue } from './src/guidedQueue.js';", resolveDir: path.join(__dirname, '..'), loader: 'js' },
    bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
    plugins: [{ name: 'fb', setup(b) { b.onResolve({ filter: /^firebase\// }, a => ({ path: a.path, namespace: 'fb' })); b.onLoad({ filter: /.*/, namespace: 'fb' }, () => ({ contents: stub, loader: 'js' })); } }],
  });
  const Q = require(out); fs.unlinkSync(out);
  const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'dprt2611n_bays33_35.json'), 'utf8'));
  const grp = fx.containers, byCn = Object.fromEntries(grp.map(c => [c.cn, c]));
  const PAIR = { 33: 35, 35: 33, 37: 39, 39: 37 };
  const findTwin = (t, all, used) => { const pb = PAIR[parseInt(t.bay, 10)]; if (!pb) return null; return all.find(c => !used.has(c.cn) && c.cn !== t.cn && parseInt(c.bay, 10) === pb && c.row === t.row && c.tier === t.tier) || null; };
  const build = (rem, mode, bayFirst) => Q.buildGuidedQueue({ containers: rem, mode, evenRowsSeaSide: false, findTwin, streamPref: null, frontCns: null, rowFrom: null, planAll: grp, bayFirst });
  const bayOf = (c) => parseInt(c.bay, 10);
  ok(grp.length === 39 && fx.order.length === 39, '자료 39대 · 실제 완료 순서 39대');

  // ① 양하 재현 — 기사는 35번 베이 11대를 먼저 싱글로 내린 뒤 33번 베이를 내렸다(실제 순서의 16번째부터).
  const idx35 = fx.order.findIndex(cn => bayOf(byCn[cn]) === 35);
  const replay = (bayFirst) => {
    const rem = new Set(grp.map(c => c.cn)); const res = [];
    fx.order.forEach((cn, i) => {
      const q = build(grp.filter(c => rem.has(c.cn)), 'discharge', i >= idx35 + 2 ? bayFirst : null);   // bayFirst 를 직접 넣는다(자동 감지는 같은 베이 싱글 두 번 뒤부터라고 가정 — 패널의 자동 감지·해제는 이 검사가 증명하지 않고, 픽스처가 전부 데크라 홀드 분리·FR·streamPref 경로도 돌지 않는다)
      const card = q[0]; res.push({ i, bayOk: [card.main, card.twin].filter(Boolean).some(c => bayOf(c) === bayOf(byCn[cn])), card });
      rem.delete(cn);
    });
    return res;
  };
  const base = replay(null), fixed = replay(35);
  const span = (r) => r.filter(x => x.i >= idx35 + 2 && x.i < idx35 + 11);   // 35번 베이를 내리는 동안
  const baseBad = span(base).filter(x => !x.bayOk).length, fixBad = span(fixed).filter(x => !x.bayOk).length;
  ok(baseBad >= 8, `[대조군] 베이 먼저 없이는 35번 베이를 내리는 동안 가이드가 다른 베이를 ${baseBad}번 가리킨다(구간 ${span(base).length}대)`);
  ok(fixBad === 0, `베이 먼저(35) — 같은 구간 가이드가 35번 베이를 벗어난 횟수 ${fixBad}`);
  ok(fixed.slice(idx35 + 2).every(x => x.bayOk), `베이 먼저(35) — 실제 순서 ${idx35 + 3}번째부터 끝까지 가이드의 베이가 기사의 베이와 전부 같다`);
  ok(fixed.slice(idx35 + 2).every(x => !x.card.twin), '베이 먼저 중에는 33·35 베이 카드가 트윈이 아니라 한 대씩 나온다');

  // ② 물리 종속 — 어느 베이를 먼저 골라도, 카드를 하나씩 내려도, 위에 남은 칸이 있는 칸이 앞서지 않는다(양하) / 아래가 남은 칸이 앞서지 않는다(선적)
  const sameStack = (a, b) => a.row === b.row && (bayOf(a) === bayOf(b) || bayOf(a) % 2 === 0 || bayOf(b) % 2 === 0);
  const isDeck = (c) => parseInt(c.tier, 10) >= 80;
  const violates = (card, remAll, mode) => [card.main, card.twin].filter(Boolean).some(p => remAll.some(o => o.cn !== p.cn && ![card.main, card.twin].filter(Boolean).some(x => x.cn === o.cn) && isDeck(o) === isDeck(p) && sameStack(o, p) && (mode === 'discharge' ? parseInt(o.tier, 10) > parseInt(p.tier, 10) : parseInt(o.tier, 10) < parseInt(p.tier, 10))));
  for (const mode of ['discharge', 'loading']) for (const bf of [33, 35]) {
    const rem = new Set(grp.map(c => c.cn)); let bad = 0, steps = 0, headBay = 0;
    while (rem.size) {
      const remAll = grp.filter(c => rem.has(c.cn)); const q = build(remAll, mode, bf);
      if (!q.length) { bad += 1000; break; }
      if (violates(q[0], remAll, mode)) bad++;
      if ([q[0].main, q[0].twin].filter(Boolean).some(c => bayOf(c) === bf)) headBay++;
      for (const c of [q[0].main, q[0].twin].filter(Boolean)) rem.delete(c.cn);
      steps++;
    }
    ok(bad === 0 && steps > 0, `${mode === 'discharge' ? '양하' : '선적'} 베이 먼저(${bf}) — ${steps}장을 끝까지 내려도 적재 종속 위반 ${bad}건 (고른 베이가 맨 앞이던 장 ${headBay})`);
  }

  // ③ 고른 베이와 상관없는 짝(37↔39)은 계속 트윈으로 나온다 · 베이 먼저가 없으면 33↔35 짝은 종전대로 트윈이다
  const syn = [{ ...grp.find(c => bayOf(c) === 35), cn: 'SYNA0000001', bay: '37', row: '03', tier: '82' }, { ...grp.find(c => bayOf(c) === 35), cn: 'SYNB0000002', bay: '39', row: '03', tier: '82' }];
  const qs = build([...syn, ...grp.filter(c => bayOf(c) === 33 || bayOf(c) === 35)], 'discharge', 35);
  ok(qs.some(c => c.twin && [c.main, c.twin].some(x => x.cn === 'SYNA0000001')), '베이 먼저(35) 중에도 37↔39 짝은 트윈 카드 그대로');
  const qn = build(grp, 'discharge', null);
  ok(qn.some(c => c.twin && bayOf(c.main) === 33), '베이 먼저 없으면 33↔35 짝은 종전대로 트윈 카드');
  console.log(fail ? '✗ 베이 먼저 연막검사 실패 ' + fail : '✓ 베이 먼저 연막검사 통과');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
