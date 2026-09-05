// 콘앱 «콘 타이밍»(2.25) + 홀드콘·작업량(2.26) 연막검사 — 소스에서 CT 블록을 **그대로** 꺼내(베껴 적지 않는다) DJCT 0223E 양하 실데이터 사본으로 돌린다.
//   ① 홀드 20ft → «홀드콘 빼기», 홀드 40ft(컨테이너선) → «40ft 홀드콘 없음», 복합선은 40ft 도 «홀드콘 빼기 (곳당 N개)»
//   ② 선적은 역순 — 홀드 20ft «홀드콘 꽂기», 데크 2단 «데크콘 꽂기», 1단 «콘 없음»
//   ③ 작업량 — 대수·호기별·콘 작업 종류별이 픽스처에서 독립 계산한 수와 같다
//   ④ 화면 말에 «회수»·«장착»이 없다(검수사 «빼기 꽂기» · «회수는 다른 용도»)
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.resolve(__dirname, '..', 'public', 'cone.html');
const html = fs.readFileSync(SRC, 'utf8');
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'conetiming_djct.json'), 'utf8'));
let bad = 0; const T = (ok, why) => { console.log((ok ? '  ✓ ' : '  ✗ ') + why); if (!ok) bad++; };

// 소스에서 꺼내기 — holdConeCount + CT 블록(const CT … ctCountLine 끝)
const hcc = html.match(/function holdConeCount\(size, shipType, multiCount\)\{[\s\S]*?\n\}\n/);
const ct = html.match(/const CT = \{[\s\S]*?\nfunction ctCountLine\([\s\S]*?\n\}\n/);
T(!!hcc && !!ct, 'holdConeCount · CT 블록을 소스에서 꺼냈다');
if (!hcc || !ct) { console.log('✗ 콘 타이밍 연막검사 실패'); process.exit(1); }
// ediContainers → 계획 rows (fbFetchEdiContainers 와 같은 모양)
const toRows = (obj) => Object.values(obj || {}).filter(c => c.bay != null && c.tier != null && c.bay !== '' && c.tier !== '').map(c => {
  const iso = String(c.iso || c.tp || ''); const size = c.size ? String(c.size) : (iso && iso[0] === '2' ? '20' : '40');
  return { bay: String(c.bay), row: String(c.row || '').padStart(2, '0'), tier: String(c.tier).padStart(2, '0'), size, cn: String(c.cn || '').toUpperCase(), iso };
});
function run(opts) {
  const ctx = { console, Date, Math, Set, Map, Object, Array, String, Number, parseInt, JSON, setInterval: () => 1, clearInterval: () => {},
    document: { addEventListener: () => {}, getElementById: () => null, querySelector: () => null, documentElement: { style: { setProperty: () => {} } } },
    window: {}, state: { shipType: opts.shipType || 'container', multiCount: opts.multiCount || 4, _bayDictBays: null,
      disch: { ediRows: toRows(FX.ediContainers), ediRowsAll: opts.noAll ? null : FX.ediRowsAll }, stow: { ediRows: toRows(FX.loadingEdi) } },   // ediRowsAll = 통과화물 포함 전체(BAPLIE 453대) — 받침은 이것으로
    fbFetch: async () => ({ ok: false, status: 0 }), ensureConeBayDict: async () => {} };
  vm.createContext(ctx);
  vm.runInContext(hcc[0] + '\n' + ct[0] + '\nthis.__ctCompute = ctCompute; this.__ctCountLine = ctCountLine; this.__CT = CT;', ctx, { filename: 'cone.html#ct' });
  ctx.__CT.tw = { discharge: opts.tw || {}, loading: opts.twL || {} }; ctx.__CT.comp = { discharge: opts.comp || {}, loading: {} };
  ctx.__CT.pier = 'PCTC';
  const r = ctx.__ctCompute();
  return { r, line: (m) => ctx.__ctCountLine(m, r.count[m]) };
}
const NOW = Date.now();
// 픽스처 시각을 «지금»으로 밀어 stale(30분) 판정을 피한다 — 신호를 보려는 검사라 시각은 상대만 유지
const shift = (() => { let mx = 0; for (const r of Object.values(FX.termWork)) if (r && r.at > mx) mx = r.at; return NOW - mx; })();
const tw = {}; for (const [cn, r] of Object.entries(FX.termWork)) tw[cn] = r && r.at ? { ...r, at: r.at + shift } : r;

console.log('콘 타이밍 — 홀드콘·작업량 (DJCT 0223E 양하 사본)');
// ── 독립 기대값(코드가 아니라 픽스처에서)
const plan = toRows(FX.ediContainers); const pair = (b) => (b % 2 === 0 ? b : b - 1);
const t1 = {}; for (const c of plan) { const t = +c.tier; if (t >= 80) { const p = pair(+c.bay); t1[p] = Math.min(t1[p] || 99, t); } }
// 받침(콘 계산 V7.59·V7.65 규칙을 픽스처에서 독립 구현) — 같은 베이 아래 · 짝 베이 아래 40ft · 양쪽 20ft 트윈
const sizeAt = new Map(); for (const c of FX.ediRowsAll) sizeAt.set(+c.bay + '_' + c.row + '_' + c.tier, c.size);   // 받침은 전체 화물(통과화물 포함)로
const below = (b, row, tier) => { const bt = String(tier - 2).padStart(2, '0'); const is40 = (z) => z === '40' || z === 'O40';
  return sizeAt.has(b + '_' + row + '_' + bt) || is40(sizeAt.get((b - 1) + '_' + row + '_' + bt)) || is40(sizeAt.get((b + 1) + '_' + row + '_' + bt)) || (sizeAt.has((b - 1) + '_' + row + '_' + bt) && sizeAt.has((b + 1) + '_' + row + '_' + bt)); };
const exp = { n: 0, byEq: {}, deck: 0, deck1: 0, hold: 0, hold0: 0, holdB: 0 }; const last = {}; let bottomCn = null;
for (const [cn, r] of Object.entries(FX.termWork)) {
  if (!r || !r.at) continue; const p = String(r.pos || ''); if (p.length !== 6) continue;
  const b = +p.slice(0, 2), t = +p.slice(4, 6), row = p.slice(2, 4); const eq = r.equip.replace(/^GC10(\d)$/, '$1호기'); exp.n++; exp.byEq[eq] = (exp.byEq[eq] || 0) + 1;
  const pl = plan.find(x => x.cn === cn); const sz = pl ? pl.size : '40';
  if (t >= 80) { if (t > (t1[pair(b)] || 82)) exp.deck++; else exp.deck1++; }
  else if (sz === '20') { if (below(b, row, t)) exp.hold++; else { exp.holdB++; bottomCn = bottomCn || cn; } }
  else exp.hold0++;
  if (!last[eq] || r.at > last[eq].at) last[eq] = { at: r.at, b, t, sz, cn, below: below(b, row, t) };
}
const { r, line } = run({ tw });
const k = r.count.discharge;
T(k.n === exp.n && k.n === 172, `양하 대수 ${k.n} = 픽스처 ${exp.n}`);
T(JSON.stringify(k.byEq) === JSON.stringify(exp.byEq), `호기별 ${JSON.stringify(k.byEq)} = 픽스처 ${JSON.stringify(exp.byEq)}`);
T(k.deck === exp.deck && k.deck1 === exp.deck1 && k.hold === exp.hold && k.hold0 === exp.hold0 && k.holdB === exp.holdB && k.holdCones === exp.hold && exp.holdB > 0,
  `콘 작업 종류 데크콘 빼기 ${k.deck}/${exp.deck} · 1단 ${k.deck1}/${exp.deck1} · 홀드콘 빼기 ${k.hold}/${exp.hold}(콘 ${k.holdCones}) · 홀드 바닥 ${k.holdB}/${exp.holdB} · 40ft 홀드 ${k.hold0}/${exp.hold0}`);
for (const c of r.cranes) {
  const e = last[c.eq];
  T(c.n === exp.byEq[c.eq] && c.bay === e.b && c.tier === e.t, `${c.eq} 지금 베이 ${c.bay} ${c.tier}단 · ${c.n}대 = 픽스처`);
  if (e.t < 80) T(e.sz === '20' ? (e.below ? /홀드콘 빼기/.test(c.sig) && c.cls === 'act' : /홀드 바닥.*콘 없음/.test(c.sig) && c.cls === 'ok') : /40ft 홀드콘 없음/.test(c.sig) && c.cls === 'ok', `${c.eq} 홀드 ${e.sz}ft ${e.below ? '받침 있음' : '바닥'} → «${c.sig}»`);
}
// 바닥 20ft 만 마지막으로 두고 다시 — «홀드 바닥 내리는 중 — 콘 없음»(받침 없는 컨에 콘을 빼라 하지 않는다)
{ const b = FX.termWork[bottomCn]; const twB = { ...tw, [bottomCn]: { ...b, at: NOW + 1000 } };
  const rb = run({ tw: twB }); const cb = rb.r.cranes.find(c => c.cn === bottomCn);
  T(!!cb && /홀드 바닥\(\d\d단\) 내리는 중 — 콘 없음/.test(cb.sig) && cb.cls === 'ok' && cb.holdCone === 0, `바닥 20ft ${bottomCn} → «${cb && cb.sig}»`); }
const l = line('discharge');
T(/양하 172\/251대/.test(l) && /1호기 81/.test(l) && /2호기 91/.test(l) && new RegExp(`홀드콘 빼기 ${exp.hold}\\(콘 ${exp.hold}개\\)`).test(l) && new RegExp(`홀드 바닥 ${exp.holdB}`).test(l) && /40ft 홀드 19/.test(l), `작업량 줄: ${l.replace(/<[^>]+>/g, '')}`);
// 통과화물이 받치는 컨 — 평택분에는 없는 아래 컨을 전체 화물에 넣으면 «홀드콘 빼기»로 바뀐다(ediRowsAll 우선)
{ const b = FX.termWork[bottomCn]; const pos = String(b.pos); const bb = pos.slice(0, 2), rr = pos.slice(2, 4), tt = String(+pos.slice(4, 6) - 2).padStart(2, '0');
  const saveAll = FX.ediRowsAll; FX.ediRowsAll = saveAll.concat([{ bay: String(+bb), row: rr, tier: tt, size: '20', cn: 'THRU0000001', pod: 'CNTAO' }]);
  const rt = run({ tw: { ...tw, [bottomCn]: { ...b, at: NOW + 1000 } } }); FX.ediRowsAll = saveAll; const ct2 = rt.r.cranes.find(c => c.cn === bottomCn);
  T(!!ct2 && /홀드콘 빼기/.test(ct2.sig) && ct2.cls === 'act', `통과화물이 아래 받치면 ${bottomCn} → «${ct2 && ct2.sig}»`); }
// 동방(pnct) — 자리 없는 termWork 도 작업량에 센다
{ const rp = run({ tw: { AAAU1111111: { at: NOW - 1000, src: 'pnct' }, BBBU2222222: { at: NOW - 2000, src: 'pnct' } } });
  T(rp.r.cranes.length === 0 && rp.r.count.discharge.term === 2 && /양하 2\/251대 · 터미널 2대\(자리 없음\)/.test(rp.line('discharge').replace(/<[^>]+>/g, '')) && rp.r.noPos === 0, `동방 자리 없는 실적 2대 → «${rp.line('discharge').replace(/<[^>]+>/g, '')}» · 신호 없음`); }
// ── 복합선(곳당 4) — 40ft 홀드도 홀드콘 빼기
const rm = run({ tw, shipType: 'multi', multiCount: 4 });
const c1 = rm.r.cranes.find(c => c.tier < 80 && c.size === '40');
const expM = exp.hold + exp.hold0;   // 복합선: 받침 있는 홀드는 크기 무관 콘(40ft 도) — 바닥은 여전히 0
const holdAll = Object.entries(FX.termWork).filter(([cn, r]) => r && r.at && String(r.pos || '').length === 6 && +String(r.pos).slice(4, 6) < 80);
const expMB = holdAll.filter(([cn, r]) => !below(+String(r.pos).slice(0, 2), String(r.pos).slice(2, 4), +String(r.pos).slice(4, 6))).length;
T(!!c1 && (c1.below ? /홀드콘 빼기 \(곳당 4개\)/.test(c1.sig) : /바닥/.test(c1.sig)) && rm.r.count.discharge.hold0 === 0 && rm.r.count.discharge.hold === holdAll.length - expMB && rm.r.count.discharge.holdCones === (holdAll.length - expMB) * 4,
  `복합선 곳당 4 → 40ft 홀드도 «${c1 && c1.sig}» · 홀드콘 ${rm.r.count.discharge.holdCones}개(받침 있는 ${holdAll.length - expMB}곳×4, 바닥 ${expMB} 제외)`);
// ── 선적(역순) — 계획에서 실제 자리를 골라 합성: 홀드 20ft · 홀드 40ft · 데크 1단 · 데크 2단
const lp = toRows(FX.loadingEdi);
const pick = (f) => lp.find(f);
const lsizeAt = new Map(); for (const c of lp) lsizeAt.set(+c.bay + '_' + c.row + '_' + c.tier, c.size);
const lbelow = (c) => lsizeAt.has(+c.bay + '_' + c.row + '_' + String(+c.tier - 2).padStart(2, '0'));
const h20 = pick(c => +c.tier < 80 && c.size === '20' && lbelow(c)), h40 = pick(c => +c.tier < 80 && c.size === '40');
const h20b = pick(c => +c.tier < 80 && c.size === '20' && !lbelow(c) && !lsizeAt.has((+c.bay - 1) + '_' + c.row + '_' + String(+c.tier - 2).padStart(2, '0')) && !lsizeAt.has((+c.bay + 1) + '_' + c.row + '_' + String(+c.tier - 2).padStart(2, '0')));
const lt1 = {}; for (const c of lp) { const t = +c.tier; if (t >= 80) { const p = pair(+c.bay); lt1[p] = Math.min(lt1[p] || 99, t); } }
const d1 = pick(c => +c.tier >= 80 && +c.tier === lt1[pair(+c.bay)]), d2 = pick(c => +c.tier >= 80 && +c.tier > lt1[pair(+c.bay)]);
T(!!(h20 && h40 && d1 && d2), `선적 계획에서 표본 넷(홀드 20ft ${h20 && h20.cn} · 홀드 40ft ${h40 && h40.cn} · 데크 1단 ${d1 && d1.cn} · 2단 ${d2 && d2.cn})`);
const pos = (c) => String(c.bay).padStart(2, '0') + c.row + c.tier;
const mk = (c, eq, dt) => ({ pos: pos(c), at: NOW - dt, equip: eq, status: 'Loaded' });
const twL = { [h20.cn]: mk(h20, 'GC101', 60000), [h40.cn]: mk(h40, 'GC102', 60000), [d1.cn]: mk(d1, 'GC103', 60000), [d2.cn]: mk(d2, 'GC104', 60000) };
if (h20b) twL[h20b.cn] = mk(h20b, 'GC105', 60000);
const rl = run({ tw: {}, twL });
const by = {}; for (const c of rl.r.cranes) by[c.eq] = c;
T(by['1호기'] && /홀드콘 꽂기/.test(by['1호기'].sig) && by['1호기'].cls === 'act', `선적 홀드 20ft → «${by['1호기'] && by['1호기'].sig}»`);
T(by['2호기'] && /40ft 홀드콘 없음/.test(by['2호기'].sig), `선적 홀드 40ft → «${by['2호기'] && by['2호기'].sig}»`);
T(by['3호기'] && /콘 없음/.test(by['3호기'].sig) && !/꽂기/.test(by['3호기'].sig.split('—')[1] || ''), `선적 데크 1단 → «${by['3호기'] && by['3호기'].sig}»`);
T(by['4호기'] && /데크콘 꽂기/.test(by['4호기'].sig) && by['4호기'].cls === 'act', `선적 데크 2단 → «${by['4호기'] && by['4호기'].sig}»`);
T(!h20b || (by['5호기'] && /홀드 바닥\(\d\d단\) 실는 중 — 콘 없음/.test(by['5호기'].sig)), `선적 홀드 바닥 20ft → «${by['5호기'] ? by['5호기'].sig : '(표본 없음)'}»`);
const ll = rl.line('loading');
T(new RegExp(`선적 ${h20b ? 5 : 4}/\\d+대`).test(ll) && /홀드콘 꽂기 1\(콘 1개\)/.test(ll) && /데크콘 꽂기 1/.test(ll) && (!h20b || /홀드 바닥 1/.test(ll)), `선적 작업량 줄: ${ll.replace(/<[^>]+>/g, '')}`);
// ── 말 — 회수·장착 금지
const said = r.cranes.concat(rl.r.cranes).map(c => c.sig + ' ' + c.sub).join(' ') + l + ll;
T(!/회수|장착/.test(said), '화면 말에 «회수»·«장착» 없음(빼기·꽂기)');
// ── 자료 없음
const r0 = run({ tw: {} });
T(r0.r.cranes.length === 0 && r0.r.count.discharge.n === 0 && r0.line('discharge') === '', '실적 없으면 빈 배열·작업량 빈 줄');
console.log(bad ? `✗ 콘 타이밍 연막검사 실패 ${bad}건` : '✓ 콘 타이밍 홀드콘·작업량 연막검사 통과');
process.exit(bad ? 1 : 0);
