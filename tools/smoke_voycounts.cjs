// 항차 총 잔여 연막검사 (3.53-12) — «몇 시에 끝나»·«작업 속도»·«얼마나 남았어» 가 쓰는 총 잔여(양하+선적 평택분)가 화면마다·앱마다 같은 수인가
//   검수사 2026-09-21 «총 잔여갯수를 그날 시간당 처리갯수와 갱수로 나눠서 답해야 한다.»
//   감사가 잡은 세 구멍을 실데이터로 지킨다 —
//     C1 예약 자리(부킹 슬롯)와 그 자리를 채운 실번호를 둘 다 세면 총 잔여가 부푼다(SWBT: 356대 다 했는데 «316대 남았어요»).
//     C2 콘앱이 주는 voyage 에는 ediContainers 가 없다 — 리스트 행만 세면 검수앱과 갈린다(STSE 2673E 699 ↔ 343).
//     E1 엔진이 총 잔여를 ctx 에 싣지 않아도 아무 검사도 안 빨개졌다.
//   node tools/smoke_voycounts.cjs <src/mir.js 번들.cjs> <저장소 루트>
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {} };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 이미 있음 */ }
global.fetch = () => Promise.reject(new Error('연막: 네트워크 없음'));
const M = require(path.resolve(OUT));
let n = 0, bad = 0;
const T = (ok, why) => { n += 1; if (ok) console.log('  ✔ ' + why.split(' — ')[0]); else { bad += 1; console.log('  ✘ ' + why); } };
const first = (s) => String(s == null ? '(null)' : s).split('\n')[0];
const clone = (o) => JSON.parse(JSON.stringify(o));

// ── 실데이터 ① KBTR 2606E(양하 102 · 선적 235, 전량 완료 보관본) — 끝에서 몇 대를 «아직 안 한 것»으로 되돌려 작업 중 상태를 만든다
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mirsame_kbtr.json'), 'utf8'));
const v = clone(FX.voyage);
const undo = (mode, k) => { const comp = v[mode].completed; const keys = Object.keys(comp).sort((a, b) => (comp[a].at || 0) - (comp[b].at || 0)); keys.slice(-k).forEach((cn) => { delete comp[cn]; }); };
undo('discharge', 20); undo('loading', 50);
const NOW = Math.max(...['discharge', 'loading'].flatMap((m) => Object.values(v[m].completed).map((c) => c.at || 0))) + 10 * 60000;
const _D = Date; global.Date = class extends _D { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } };
const flat = M.flattenVoyages({ [FX.voyageKey]: v });
const vc = M.voyageCountsOf(v);
T(vc.total > 300 && vc.total - vc.done === 70 && vc.byMode.discharge.total - vc.byMode.discharge.done === 20 && vc.byMode.loading.total - vc.byMode.loading.done === 50,
  `총 잔여 70대(양하 20 · 선적 50) — 실제 ${JSON.stringify(vc)}`);
const base = { app: 'tally', smallTalkLast: true, execDevice: false, modeChoice: 'both', countFallback: true, inspector: '연막', voyageKey: FX.voyageKey, voyage: v, info: v.info,
  terminalWork: FX.terminalWork, shipSpeed: FX.shipSpeed };
const mk = (containers, mode, extra) => ({ ...base, containers, mode, compMap: { ...v.discharge.completed, ...v.loading.completed }, _trace: {}, ...(extra || {}) });
const all = () => mk(flat, 'discharge');
const tabD = () => mk(flat.filter((c) => c._mode !== 'loading'), 'discharge');   // 양하선적 탭 카드 — 열린 탭 것만 온다
const tabL = () => mk(flat.filter((c) => c._mode === 'loading'), 'loading');
const coneVoyage = { info: v.info, reports: v.reports || {}, discharge: { completed: v.discharge.completed, records: v.discharge.records || {} }, loading: { completed: v.loading.completed, records: v.loading.records || {} } };
const cone = () => ({ app: 'cone', containers: flat, cone: { rows: [], dischRows: [], stowRows: [] }, execDevice: false, shiftN: 0, mode: 'discharge', modeLabel: '양하', info: v.info,
  compMap: { ...v.discharge.completed, ...v.loading.completed }, voyage: coneVoyage, terminalWork: FX.terminalWork, shipSpeed: FX.shipSpeed, voyageKey: FX.voyageKey, _trace: {} });

// ── E1 엔진이 총 잔여를 스스로 싣는가(호출부는 voyageCounts 를 안 준다) · 화면마다 같은 수인가
for (const [nm, c] of [['떠 있는 미르(양하+선적 컨)', all], ['양하 탭 카드(양하 컨만)', tabD], ['선적 탭 카드(선적 컨만)', tabL], ['콘앱(voyage 에 EDI 없음)', cone]]) {
  const eta = M.answerOneRaw('몇 시에 끝나', c());
  T(/^70대 남았어요/.test(String(eta)), `${nm} «몇 시에 끝나» 가 총 잔여 70대로 답한다 — ${first(eta)}`);
  T(/\(양하 20 · 선적 50\)/.test(String(eta)), `${nm} «몇 시에 끝나» 가 양하·선적으로 갈라 보인다 — ${(String(eta).match(/남은 작업.*/) || [''])[0]}`);
  const sp = M.answerOneRaw('작업 속도', c());
  T(/남은 70대/.test(String(sp)), `${nm} «작업 속도» 도 같은 총 잔여 70대 — ${(String(sp).match(/남은.*/) || [first(sp)])[0]}`);
}
{
  const a = String(M.answerOneRaw('얼마나 남았어', tabD()));
  T(/남은 작업: 20대/.test(a) && /항차 전체로는 남은 70대 \(양하 20 · 선적 50\)/.test(a), `양하 탭 «얼마나 남았어» 가 탭 잔여 20대와 항차 전체 70대를 같이 말한다 — ${a.split('\n').slice(0, 3).join(' / ')}`);
  const b = String(M.answerOneRaw('얼마나 남았어', all()));
  T(/남은 작업: 70대/.test(b) && !/항차 전체로는/.test(b), `컨을 다 가진 화면은 한 줄로 끝난다(같은 수를 두 번 말하지 않는다) — ${first(b)}`);
  T(!/터미널 실적|실제\(터미널\)|두 가지/.test(a + b), '합계 피드 문구가 새지 않는다 — ⛔ «터미널 실적·실제(터미널)·두 가지» 중 하나가 답에 있다');
}

// ── C2 콘앱 모양(voyage 에 EDI 없음)이 검수앱과 같은 수를 센다
{
  const c1 = M.voyageCountsOf(v, flat), c2 = M.voyageCountsOf(coneVoyage, flat);
  T(c1.total === c2.total && c1.done === c2.done, `콘앱 모양 voyage 도 같은 총 대수 — 검수앱 ${c1.done}/${c1.total} · 콘앱 ${c2.done}/${c2.total}`);
  const c3 = M.voyageCountsOf(coneVoyage, null);
  T(c3.total === 0, `EDI 도 넘겨받은 컨도 없으면 모른다고 한다(total 0 — 리스트 행만 세어 지어내지 않는다) — ${JSON.stringify(c3)}`);
}

// ── C1 실데이터 ② SWBT — 예약 자리를 채운 배. 실번호를 다 끝냈으면 «다 끝났어요» 여야 한다
{
  const B = clone(JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/bookingfill_swbt.json'), 'utf8')).swbt);
  const f0 = M.flattenVoyages({ SWBT: B });
  const slots = f0.filter((c) => c._ptk && (c.isBooking || c.pendingCn)).length;
  T(slots > 0, `fixture 에 예약 자리 컨이 있다(${slots}대)`);
  const real = M.voyageCountsOf(B);
  const raw = f0.filter((c) => c._ptk).length;
  T(real.total < raw, `채워진 예약 자리를 총 대수에서 뺀다 — 편 것 ${raw}대 → 센 것 ${real.total}대`);
  //  평택분 «실번호» 컨(예약 자리 `__BOOK_…` 를 뺀 것)을 전부 터미널 반영 완료로 찍는다
  const at0 = NOW - 6 * 3600000;
  let i = 0;
  for (const m of ['discharge', 'loading']) if (B[m]) B[m].completed = B[m].completed || {};
  for (const c of f0) {
    if (!c._ptk || c.isBooking || !c.cn) continue;
    B[c._mode === 'loading' ? 'loading' : 'discharge'].completed[c.cn] = { by: '', src: 'term', at: at0 + (i++) * 30000 };
  }
  const after = M.voyageCountsOf(B);
  T(after.total === real.total && after.total - after.done === 0, `실번호를 다 끝내면 총 잔여 0 — 채워진 자리가 영영 «남은 일»로 남지 않는다 (완료 ${after.done} / 전체 ${after.total})`);
  const fl = M.flattenVoyages({ SWBT: B });
  const eta = String(M.answerOneRaw('몇 시에 끝나', { app: 'tally', smallTalkLast: true, modeChoice: 'both', voyage: B, info: B.info, voyageKey: 'SWBT', containers: fl, mode: 'loading', compMap: { ...((B.discharge || {}).completed || {}), ...((B.loading || {}).completed || {}) }, _trace: {} }));
  T(/다 끝났어요/.test(eta) && !/\d+대 남았어요/.test(eta), `SWBT 를 다 끝낸 뒤 «몇 시에 끝나» — ${first(eta)}`);
}

global.Date = _D;
console.log(`\n항차 총 잔여 연막검사 — ${n}항 중 실패 ${bad}`);
process.exit(bad ? 1 : 0);
