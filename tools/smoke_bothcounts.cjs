// 두 숫자 연막검사 — **대수를 물으면 실제(터미널)와 앱 기록이 둘 다 나온다.**
//
// 왜 있는가 (검수사 지시 2026-08-26).
//   *«이제 작업한 갯수를 물어보거나 남은갯수를 물어보면 두가지 답이 나와야 합니다.
//     실제로 작업한거와 앱에 기록된거»* · *«당분간은 그렇게 가야합니다 앱으로 전부 작업할때까지는»*
//
//   실측이 그 말을 뒷받침한다 — STSE 2665E(08-26 10:00): 터미널 181대 · 앱 116대. 65대가 안 찍혀 있다.
//   검수사 말고는 앱에 완료를 거의 안 찍으니, 한 숫자만 내면 어느 쪽을 내도 틀린 답이 된다.
//
// ⚠ 이 검사가 지키는 것은 «새로 되는 것»만이 아니다. **가로채지 않는 것**을 같이 잰다 —
//   겹을 넓히는 판은 새 기능보다 남의 답을 먹는 쪽이 위험하다(2.47 에서 겪은 병).
const path = require('path');
const OUT = process.argv[2];
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
const NS = require(path.resolve(OUT));

let bad = 0;
const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };

// 실데이터 모양 그대로 — STSE 2665E 08-26 (records 449 · 앱 completed 116 · 터미널 181/449)
const TW = { startAt: '2026-08-26 04:50', updatedAt: Date.now() - 5 * 60000,
             disDone: 181, disPlan: 449, lodDone: 0, lodPlan: 456, pct: 20 };
const comp = {};
const conts = [];
for (let i = 0; i < 449; i++) {
  const cn = 'TEST' + String(1000000 + i);
  const done = i < 116;
  if (done) comp[cn] = { by: '김성일', at: Date.now() - 3600000 };
  conts.push({ cn, _mode: 'discharge', _ptk: true, pod: 'KRPTK', bay: 24, _comp: done ? comp[cn] : null });
}
const contsNoComp = conts.map((c) => { const d = { ...c }; delete d._comp; return d; });   // 항차 화면 모양
const ctx = { compMap: comp, terminalWork: { STSE: TW }, vsl: 'STSE', vslFull: 'SITC SENDAI',
              pier: 'PCTC', info: { vsl: 'STSE', vslFull: 'SITC SENDAI', pier: 'PCTC' }, mode: 'discharge' };

const ask = (q, pool, c) => {
  const p = NS.parseNaturalQuery(q, pool);
  const r = NS.applyNLFilter(pool, p);
  return NS.generateLocalAnswer(p, r, pool, c === undefined ? ctx : c) || '';
};

// ── ① 함수가 있는가 · 두 숫자를 내는가 ──────────────────────────────
T(typeof NS.bothCounts === 'function', 'bothCounts 가 없다');
T(typeof NS.twOfCtx === 'function', 'twOfCtx 가 없다');
if (typeof NS.bothCounts !== 'function') { console.error('✗ 두 숫자 연막검사 — 함수가 없어 더 못 잰다'); process.exit(1); }
{
  const L = NS.bothCounts(conts, ctx, 'discharge');
  T(Array.isArray(L) && L.length >= 3, 'bothCounts 가 줄을 못 낸다');
  const s = (L || []).join('\n');
  T(/실제\(터미널\)\s*181대\s*\/\s*449대/.test(s), '터미널 실적 181/449 를 안 낸다');
  T(/앱 기록 116대\s*\/\s*449대/.test(s), '앱 기록 116/449 를 안 낸다');
  T(/남은 268대/.test(s), '터미널 기준 남은 268대를 안 낸다');
  T(/남은 333대/.test(s), '앱 기준 남은 333대를 안 낸다');
  T(/65대는 실제로 작업했는데 앱에 안 찍혔/.test(s), '⛔ 차이 65대를 말로 안 짚는다 — 숫자 두 줄만 던지면 검수사가 판단해야 한다');
}

// ── ② 검수사 표준 표현이 걸리는가 (종전에는 답 자체가 없었다) ─────────
for (const q of ['몇 대 했어', '작업한 갯수', '몇 대 작업했어', '몇 대 처리했어']) {
  const a = ask(q, conts);
  T(/181대/.test(a) && /116대/.test(a), `«${q}» 에 두 숫자가 안 나온다 — 검수사 표준 표현이다`);
}
for (const q of ['얼마나 남았어', '남은 갯수', '몇 대 남았어']) {
  const a = ask(q, conts);
  T(/268대/.test(a) && /333대/.test(a), `«${q}» 에 두 숫자가 안 나온다`);
}

// ── ③ ★ 항차 화면(_comp 없음)에서도 앱 수가 맞는가 ──────────────────
//   2.52-01 이 mirEyes 에서만 메운 구멍이 nlSearch 본체에 그대로 있었다.
//   검수사가 실제로 쓰는 양하 탭에서 «완료 0대» 가 나왔다(앱에 116대가 찍혀 있는데).
{
  const a = ask('몇 대 했어', contsNoComp);
  T(/앱 기록 116대/.test(a), '⛔ 항차 화면(_comp 없음)에서 앱 완료가 0 으로 나온다 — compMap 을 안 읽는다');
  T(!/앱 기록 0대 \/ 449대/.test(a), '⛔ 앱 기록이 0대로 나온다');
  const b = ask('얼마나 남았어', contsNoComp);
  T(/남은 333대/.test(b), '⛔ 항차 화면에서 앱 잔여가 449 로 나온다(완료를 못 봤다)');
}

// ── ④ ★ 판정이 한 벌인가 — 어느 경로로 물어도 같은 수가 나와야 한다 ──
//   화면마다 다른 수가 나오면 검수사가 어느 것을 믿을지 판단해야 한다(무게·완료판정에서 이미 겪은 병).
{
  const nums = (s) => (String(s).match(/\d+대/g) || []).join(',');
  const a1 = NS.formatAppTallyAnswer('STSE', conts, TW, 'discharge');
  const a2 = NS.formatTerminalWorkAnswer('STSE', TW, conts, 'discharge');
  const a3 = ask('몇 대 했어', conts);
  for (const [nm, s] of [['앱 갈래', a1], ['터미널 갈래', a2], ['진행 답', a3]]) {
    T(/181대/.test(s), `${nm} 에 터미널 181대가 없다 — 두 갈래가 서로의 숫자를 안 싣는다`);
    T(/116대/.test(s), `${nm} 에 앱 116대가 없다`);
  }
  T(nums(a1).includes('181대') && nums(a3).includes('181대'), '경로마다 다른 수를 낸다');
}

// ── ⑤ 지어내지 않는가 ──────────────────────────────────────────────
{
  //  터미널 피드가 없으면 «모른다»고 말한다
  const noTw = { ...ctx, terminalWork: {} };
  const a = ask('몇 대 했어', conts, noTw);
  T(/터미널 실적 피드가 아직 없어/.test(a), '⛔ 터미널 피드가 없는데 실적을 지어낸다');
  T(!/실제\(터미널\)/.test(a), '⛔ 피드가 없는데 터미널 줄을 낸다');
  //  앱 기록이 없어도 터미널로는 답한다 (검수사가 앱을 안 쓴 항차가 대부분이다)
  const empty = conts.map((c) => ({ ...c, _comp: null }));
  const b = NS.formatAppTallyAnswer('STSE', empty, TW, 'discharge');
  T(/181대/.test(b), '⛔ 앱 기록이 없으면 터미널 실적도 안 낸다 — 실제로 몇 대 내려갔는지 아무 데서도 못 본다');
  T(!/앱 검수 기록 없음\(이 항차는 앱 검수 미사용\)\.$/m.test(b) || /181대/.test(b), '앱 없음 한 줄로 끝난다');
}

// ── ⑥ ★ 가로채지 않는가 — 이 검사의 절반이 여기다 ──────────────────
//   «했어» 는 흔한 말이다. 대수를 묻는 맥락이 아니면 진행 질문으로 보면 안 된다.
{
  const noProg = (q) => { const p = NS.parseNaturalQuery(q, conts); return !p.progressQuery; };
  for (const q of ['1918 어디 했어', '엑스레이 어디 했어', '어디까지 했어', '커버 몇 장 했어']) {
    T(noProg(q), `⛔ «${q}» 를 진행 질문으로 가로챈다`);
  }
  //  제 답이 따로 있는 것들 — 씰·트윈·커버·시프팅·무게·온도
  for (const q of ['씰 몇 개 했어', '트윈 몇 대 했어', '봉인 몇 개 했어', '무게 몇 대 했어', '온도 몇 대 했어']) {
    T(noProg(q), `⛔ «${q}» 를 컨 대수 질문으로 가로챈다 — 물어본 것은 그게 아니다`);
  }
}

// ── ⑦ 조건이 붙으면 두 숫자를 내지 않는가 ────────────────────────────
//   터미널 실적에는 베이·규격 구분이 없다. 나란히 놓으면 «20번 베이 실제 181대» 같은 거짓말이 된다.
{
  for (const q of ['20번 베이 남은 거', '24번 베이 몇 대 남았어']) {
    const a = ask(q, conts);
    T(!/실제\(터미널\)/.test(a), `⛔ «${q}» 에 터미널 실적을 나란히 낸다 — 그 자료에는 베이 구분이 없다`);
  }
}

// ── ⑧ 선적은 선적 수를 보는가 ────────────────────────────────────────
{
  const load = conts.map((c) => ({ ...c, _mode: 'loading', pol: 'KRPTK', pod: 'CNSHA' }));
  const L = NS.bothCounts(load, ctx, 'loading');
  const s = (L || []).join('\n');
  T(/실제\(터미널\) 0대 \/ 456대/.test(s), '⛔ 선적인데 양하 수(181/449)를 낸다');
}

if (bad) { console.error(`\n✗ 두 숫자 연막검사 ${bad}건 실패`); process.exit(1); }
console.log('✅ 두 숫자 연막검사 통과 — 실제·앱 두 숫자 · compMap 구멍 · 판정 한 벌 · 가로채지 않음');
