// 미르 대화 연막검사 (3.68 / ConeOne 2.57) — 실소스 번들(mirCore.entry) + 실데이터(KBTR 2606E 보관본)로 [mirThread] 절을 잰다.
//   검수사 2026-09-29 «미르가 답한게 원하는건지 다른 대답을 했는지 확인을 안합니다» · «미르가 대화를 끝내는게 아니고 사용자가 끝낼수 있게».
//   관문 4 시뮬(scratch mirq/sim_follow.cjs, 13:35 «네» 확정)의 대화 15건 + 작업 중 시점 3건 + 칩 전수를 여기서 실소스로 다시 돈다.
//   node tools/smoke_mirthread.cjs <mirCore 번들> <저장소 루트>
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {} };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
global.fetch = () => Promise.reject(new Error('연막: 네트워크 없음'));
const M = require(path.resolve(OUT));
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mirsame_kbtr.json'), 'utf8'));
const vk = FX.voyageKey, v = FX.voyage, ss = FX.shipSpeed, pf = FX.pilotForecast;
let n = 0, bad = 0;
const T = (cond, name, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const first = (s) => norm(s).split(/(?<=[.!?요다])\s|\n/)[0];

const mkCtx = (voy) => {
  const D = voy.discharge || {}, L = voy.loading || {};
  const comp = Object.assign({}, D.completed || {}, L.completed || {});
  const paint = (rows, mode) => M.toMirContainers(rows, mode).map((c) => { const w = c && c.cn ? comp[c.cn] : null; return (w && !c._comp) ? Object.assign({}, c, { _comp: w }) : c; });
  const cs = paint(Object.values(D.ediContainers || {}), 'discharge').concat(paint(Object.values(L.ediContainers || {}), 'loading'));
  return () => ({ app: 'tally', smallTalkLast: true, execDevice: true, modeChoice: 'both', countFallback: true, inspector: '연막', isChief: true, chiefData: null, heartbeat: null, portMisData: {}, pilotForecast: pf, shipSpeed: ss, voyages: { [vk]: voy }, flat: cs,
    voyageKey: vk, voyage: voy, info: voy.info, mode: 'discharge', containers: cs, compMap: comp, shiftMap: null, bayPairs: null, rfSkip: false, esealBrief: null, photos: null, diagAlerts: [], accepted: true, _trace: {} });
};
const tallyCtx = mkCtx(v);
//  화면과 같은 차례 — 풀기(answerOneRaw) → 기록(mirThreadCommit). 떠 있는 미르·검색창·통합검색·탭 카드·콘앱이 이 두 호출로 돈다.
function ask(q, ctxFn, now) {
  const c = ctxFn(); const t = {}; c._trace = t; c._now = now; c._utterAt = now;   // _now — 대화 시계(3분 창) · _utterAt — 접수 표(화면 askedAt) 를 연막검사가 준다
  let a = null; try { a = M.answerOneRaw(q, c); } catch (e) { a = 'ERR ' + e.message; }
  const fo = M.mirThreadCommit(q, a, t.via || '', c, now);
  return { a, via: t.via || '', fo };
}
const NOON = new Date('2026-09-29T12:10:00+09:00').getTime();

console.log('■ ① 내보내기·문지기');
T(typeof M.mirThreadResolve === 'function' && typeof M.mirThreadCommit === 'function' && typeof M.mirThreadAlive === 'function', 'mirCore 가 mirThreadResolve·mirThreadCommit·mirThreadAlive 를 내보낸다');
T(M.isWeakAnswer('됐어 고마워', '네, 언제든 부르세요 😺', { via: 'thread' }) === false, 'via=thread 는 약한 답이 아니다(모델·miss 로 안 간다)');
M._mirThreadReset();
{
  const r = ask('응', tallyCtx, NOON);
  T(/뭐 확인해 드릴까요/.test(r.a) && r.via === 'thread' && r.fo.kind === 'prompt' && r.fo.chips.length === 3, '대화 밖 «응» → 되물음 + 칩 3개(못 배움 아님)', `${first(r.a)} · ${r.fo.kind}`);
  const r2 = ask('응', tallyCtx, NOON + 5000);
  T(/작업 다 끝났어요/.test(r2.a) && r2.fo.kind === 'answer', '되물음 뒤 «응» → 첫 칩 «몇 시에 끝나»', first(r2.a));
  M._mirThreadReset();
  const r3 = ask('그만', tallyCtx, NOON);
  T(/부르세요|부르시면/.test(r3.a) && r3.fo.kind === 'close', '대화 밖 «그만» → 끝맺음 문구(엔진은 null 이던 말)', first(r3.a));
  const r4 = ask('고마워', tallyCtx, NOON);
  T(r4.via !== 'thread' && /덕분|고마|감사|😺|배울게요/.test(r4.a || ''), '대화 밖 «고마워» → 엔진 잡담 그대로(종전 동작)', first(r4.a));
  M._mirThreadReset();
  const g = ask('몇 시에 끝나', tallyCtx, NOON);
  T(M.mirThreadAlive({ voyageKey: vk, inspector: '연막' }, NOON + 1000) === true && M.mirThreadAlive({ voyageKey: vk, inspector: '연막' }, NOON + 4 * 60 * 1000) === false, '대화는 3분 산다(mirThreadAlive)', String(!!g.a));
  const late = ask('응', tallyCtx, NOON + 4 * 60 * 1000);
  T(late.fo.kind === 'prompt', '3분 지난 «응» 은 되물음(옛 제안을 잇지 않는다)', late.fo.kind);
  M._mirThreadReset();
  //  «KBTR 몇 시에 끝나»(질문 속 배 → 다른 키) 뒤의 «응»(배 이름 없음) — 같은 검수원의 최근 대화를 잇는다
  const c1 = tallyCtx(); c1.voyageKey = 'OTHER_KEY'; c1._now = NOON; const t1 = {}; c1._trace = t1; const a1 = M.answerOneRaw('몇 시에 끝나', c1); M.mirThreadCommit('몇 시에 끝나', a1, t1.via || '', c1, NOON);
  const c2 = tallyCtx(); c2.voyageKey = ''; c2._now = NOON + 5000; const t2 = {}; c2._trace = t2; const a2 = M.answerOneRaw('응', c2);
  T(a2 != null && !/뭐 확인해 드릴까요/.test(a2), '다른 항차 키로 물은 뒤 배 이름 없는 «응» 도 같은 검수원의 최근 대화를 잇는다', first(a2));
  M._mirThreadReset();
  {
    M._mirThreadReset();
    ask('카고', tallyCtx, NOON);   // 얼버무림 → 확인 질문(칩 없음)
    const p2 = ask('두 번째', tallyCtx, NOON + 5000);
    T(p2.fo.kind === 'prompt' && p2.via === 'thread', '확인 질문 뒤 «두 번째» 는 못 배움·모델이 아니라 되물음(3차 감사 4)', `${first(p2.a)} [${p2.fo.kind}]`);
    M._mirThreadReset();
  }
}

console.log('■ ①-B 감사 회귀 — 끝맺음은 낱말만 있는 말 · 되쓴 말은 모델로 안 샘 · 리퍼는 재료로 · 홈의 «응» 은 배를 잇는다');
{
  //  끝맺음 오탐(감사 9) — 업무 말은 3.67 과 같은 답
  const BIZ = [['0230 완료됐어', /완료|기록|0230/], ['양하 다 됐어', /양하/], ['다 됐어', /완료|남은|전체|끝/], ['OK 3426', /3426/], ['출항 준비 됐어', /출항|KOBE|준비|계획/], ['선적 됐어', /선적/]];
  const bad = [];
  for (const [q, re] of BIZ) { M._mirThreadReset(); ask('몇 시에 끝나', tallyCtx, NOON); const r = ask(q, tallyCtx, NOON + 5000); if (r.via === 'thread' || !re.test(r.a || '')) bad.push(`${q}→${first(r.a).slice(0, 30)}[${r.via}]`); }
  T(bad.length === 0, '대화 중 «0230 완료됐어»·«양하 다 됐어»·«다 됐어»·«OK 3426»·«출항 준비 됐어»·«선적 됐어» 는 끝맺음이 아니라 업무 답', bad.join(' · '));
  const CL = ['됐어', '됐어 고마워', '아니 됐어', '네 됐어요', '그만', '수고했어', '수고', '괜찮아', '오케이', 'ok', '끝', '고마워 미르야', '감사합니다'];
  const notClosed = [];
  for (const q of CL) { M._mirThreadReset(); ask('몇 시에 끝나', tallyCtx, NOON); const r = ask(q, tallyCtx, NOON + 5000); if (r.fo.kind !== 'close' || !/😺/.test(r.a || '')) notClosed.push(q); }
  T(notClosed.length === 0, `끝맺음 ${CL.length}가지 전부 접는다`, notClosed.join(' · '));
  //  되쓴 말의 약함 판정(감사 3) — 원문의 «아니»·«번째»·«아까» 가 아니라 되쓴 말로 잰다 → 모델로 안 간다
  const leak = [];
  for (const q of ['아니 작업 속도', '두 번째', '아까 그 컨 무게', '그래']) {
    M._mirThreadReset(); ask('0230 어디', tallyCtx, NOON);
    const c = tallyCtx(); c._now = NOON + 5000; c._utterAt = NOON + 5000; const t = {}; c._trace = t; const a = M.answerOneRaw(q, c);
    if (a == null || M.isWeakAnswer(q, a, t)) leak.push(`${q}→weak(rq=${t.rq || '-'} via=${t.via || '-'})`);
  }
  T(leak.length === 0, '«아니 작업 속도»·«두 번째»·«아까 그 컨 무게»·«그래» 는 되쓴 말로 약함을 재서 모델로 새지 않는다(_trace.rq)', leak.join(' · '));
  //  리퍼 단정(감사 4) — TRHU(소유주 코드) 드라이 컨은 리퍼가 아니다
  M._mirThreadReset();
  const d = ask('8175', tallyCtx, NOON);
  T(/TRHU3728175/.test(d.a || '') && !/리퍼네요|온도/.test(d.fo.line) && !d.fo.chips.some((x) => /온도/.test(x)), 'TRHU3728175(20DC) 는 «리퍼네요» 로 단정하지 않는다(컨 재료 isReeferContainer 한 벌)', `${d.fo.line} ${JSON.stringify(d.fo.chips)}`);
  const rf = ask('3426', tallyCtx, NOON + 20000);
  T(/리퍼네요/.test(rf.fo.line) && rf.fo.chips[0] === '3426 온도', 'FBIU5093426(45RF) 는 리퍼 — 온도 제안', rf.fo.line);
  //  홈(배 재료 없음)에서 배 이름 붙인 질문 뒤의 «응» — 되쓴 말에 배 코드가 붙는다(감사 5)
  M._mirThreadReset();
  //  홈 재료 — 떠 있는 미르(MirFab)가 싣는 모양: voyage 없음 · flat(항차 키 붙은 전 항차 컨) · 질문 속 배(shipCtx)
  const home = () => { const c = tallyCtx(); c.voyage = null; c.voyageKey = ''; c.info = null; c.compMap = null; c.flat = c.containers.map((x) => Object.assign({}, x, { voyageKey: vk })); delete c.containers; c.shipCtx = { key: vk, info: v.info, v, has: true }; return c; };
  const h1 = ask('KBTR 몇 시에 끝나', home, NOON);
  const hc = tallyCtx(); hc.voyage = null; hc.voyageKey = ''; hc.info = null; hc.vsl = ''; hc.containers = []; hc.compMap = null; hc._now = NOON + 5000; hc._utterAt = NOON + 5000; delete hc.shipCtx;
  const r2 = M.mirThreadResolve('응', hc, NOON + 5000);
  T(/작업 다 끝났어요/.test(h1.a || '') && h1.fo.chips[0] === '출항 언제' && r2.q === 'KBTR 출항 언제', '홈에서 «KBTR 몇 시에 끝나» 뒤 «응» → 되쓴 말 «KBTR 출항 언제»(화면이 이 말로 배를 고른다)', `${first(h1.a)} ${JSON.stringify(h1.fo.chips)} → ${r2.q}`);
  const h2c = home(); h2c._now = NOON + 5000; h2c._utterAt = NOON + 5000; delete h2c.shipCtx; h2c.shipCtx = { key: vk, info: v.info, v, has: true };   // 화면이 되쓴 말로 배를 골라 shipCtx 를 실은 뒤
  const h2 = ask('응', () => h2c, NOON + 5000);
  T(h2.a != null && !/어느 배 말씀인지/.test(h2.a) && !h2.fo.confirm, '그 «응» 을 배 재료와 함께 다시 풀면 확인 질문이 아니라 답(출항 일정)', first(h2.a));
  const r3 = M.mirThreadResolve('응', Object.assign(tallyCtx(), { _now: NOON + 5000, _utterAt: NOON + 5000 }), NOON + 5000);
  T(!/^KBTR /.test(r3.q || ''), '항차가 열려 있으면(재료 있음) 배 코드를 붙이지 않는다', r3.q);
  //  3.68-01: 홈에서 칩을 눌러 그 말 그대로 온 것(«호기별 진행»)도 배를 잇는다(라이브 실측 — 칩 클릭이 배를 잃고 모델까지 감)
  const hc2 = tallyCtx(); hc2.voyage = null; hc2.voyageKey = ''; hc2.info = null; hc2.vsl = ''; hc2.containers = []; hc2.compMap = null; hc2._now = NOON + 5500; hc2._utterAt = NOON + 5500; delete hc2.shipCtx;
  const chipQ = (h2.fo.chips || [])[0] || '';
  const r2b = M.mirThreadResolve(chipQ, hc2, NOON + 5500);
  T(!!chipQ && r2b.kind === 'pick' && r2b.q === 'KBTR ' + chipQ, `홈에서 칩 «${chipQ}» 을 누르면(그 말 그대로) 배 코드를 붙여 «KBTR ${chipQ}»`, `${r2b.kind} ${r2b.q}`);
  M._mirThreadReset();
  //  «이거 몇 시에 끝나»(실제 로그) 는 직전 컨으로 바뀌지 않는다
  ask('0230 어디', tallyCtx, NOON);
  const r4 = M.mirThreadResolve('이거 몇 시에 끝나', Object.assign(tallyCtx(), { _now: NOON + 5000, _utterAt: NOON + 5000 }), NOON + 5000);
  T(r4.kind !== 'ref' && !/0230/.test(r4.q), '«이거 몇 시에 끝나» 는 컨 참조로 바꾸지 않는다(«이거»·«그 배» 제외)', r4.q);
  //  «그 컨테이너 무게»·«그거야 뭐» 부분일치(재감사 D)
  const r4b = M.mirThreadResolve('그 컨테이너 무게', Object.assign(tallyCtx(), { _now: NOON + 5500, _utterAt: NOON + 5500 }), NOON + 5500);
  T(r4b.q === '0230 무게', '«그 컨테이너 무게» → «0230 무게»(«0230테이너» 아님)', r4b.q);
  //  일정 제안이 자기 자신을 반복하지 않는다(재감사 A)
  {
    M._mirThreadReset();
    //  기억은 최근 5턴 — 그 안에서는 같은 말을 두 번 제안하지 않는다(일정 갈래가 «다음 배 언제» 를 자기 자신에게 무한 제안하던 것 — 재감사 A)
    let t = NOON; const seq = ['몇 시에 끝나', '응', '응', '응', '응', '응'];
    const asked = []; const chipsSeen = [];
    for (const q of seq) { t += 20000; const r = ask(q, tallyCtx, t); asked.push(r.fo.q); chipsSeen.push(r.fo.chips.join('/')); }
    const dupQ = asked.filter((c, i) => c && c !== '응' && asked.indexOf(c) !== i);
    T(dupQ.length === 0 && chipsSeen[2] === '' && asked[3] === '응', '«응» 을 다섯 번 이어도(기억 5턴) 같은 말을 두 번 묻지 않고, 일정 제안이 소진되면 칩이 비고 되물음으로 넘어간다', asked.join(' → ') + ' ‖ ' + chipsSeen.join(' → '));
  }
  //  항차 ZZZZ 가 열린 채(라이브 재료) KBTR 를 이름으로 물은 대화의 «응» 은 KBTR 로 이어진다(재감사 C)
  {
    M._mirThreadReset();
    const kb = ask('KBTR 몇 시에 끝나', home, NOON);
    const live = tallyCtx(); live.voyageKey = 'ZZZZ_9999E'; live.vsl = 'ZZZZ'; live.info = Object.assign({}, v.info, { vsl: 'ZZZZ' }); live._now = NOON + 5000; live._utterAt = NOON + 5000;
    const rr = M.mirThreadResolve('응', live, NOON + 5000);
    T(kb.a != null && rr.q === 'KBTR 출항 언제', '열린 항차(ZZZZ)와 대화의 배(KBTR)가 다르면 되쓴 말에 KBTR 를 붙인다', rr.q);
    const same = tallyCtx(); same._now = NOON + 6000; same._utterAt = NOON + 6000;   // 재료가 KBTR 이면 안 붙인다
    const rs = M.mirThreadResolve('응', same, NOON + 6000);
    T(rs.q === '출항 언제', '재료가 같은 배(KBTR)면 붙이지 않는다', rs.q);
  }
  M._mirThreadReset();
  //  대화 밖 «1번/2번/3번» 은 베이 번호다(2차 시뮬 재검증 회귀) · 대화 밖 «그거 온도» 는 되물음
  {
    M._mirThreadReset();
    const b2 = ask('2번', tallyCtx, NOON);
    T(/2번 베이/.test(b2.a || '') && b2.via !== 'thread', '대화 밖 «2번» 은 2번 베이 답(되물음 아님)', first(b2.a));
    M._mirThreadReset();
    const g0 = ask('그거 온도', tallyCtx, NOON);
    T(/어느 컨 말씀이세요/.test(g0.a || '') && g0.via === 'thread', '대화 밖 «그거 온도» 는 «어느 컨 말씀이세요?»(모델·메모로 안 샘)', first(g0.a));
    M._mirThreadReset();
    ask('16번 베이', tallyCtx, NOON);   // 📭 없음
    const g1 = M.mirThreadResolve('그거 온도', Object.assign(tallyCtx(), { _now: NOON + 5000, _utterAt: NOON + 5000 }), NOON + 5000);
    T(g1.kind === 'prompt' && /어느 컨/.test(g1.direct || ''), '📭 없음 답의 번호는 개체가 아니다 — 뒤의 «그거 온도» 는 되물음', `${g1.kind} ${g1.q}`);
    M._mirThreadReset();
  }
  //  검색창에 숫자를 치기 시작한 «2» 는 접수 표가 없으면 제안 번호가 아니다
  const r5 = M.mirThreadResolve('2', Object.assign(tallyCtx(), { _now: NOON + 6000 }), NOON + 6000);
  T(r5.kind === 'pass', '접수 표 없는 맨숫자 «2» 는 제안 번호로 풀지 않는다(검색창 타이핑)', r5.kind);
  M._mirThreadReset();
}
console.log('■ ①-D 2차 시뮬 회귀 — 호기 등록 칩은 적은 호기 · 식사 «응»=돌림판 · 못 배운 말 뒤 «응» 은 되물음 · 완료 배엔 ETA 안 권함 · 콘앱 거절엔 한 마디 없음');
{
  M._mirThreadReset();
  const cr = ask('미르야 주간 근무자 MCAP 1호기 송제욱 2호기 김석 DJCF 3호기 이인철 4호기 고현석 기록해줘', tallyCtx, NOON);
  T(/📝/.test(cr.a || '') && cr.fo.chips[0] === '2호기 누구야', '호기 등록 — 확인 칩은 질문의 첫 호기(1호기 명단 밖)가 아니라 답이 적은 첫 호기(2호기)', `${first(cr.a)} ${JSON.stringify(cr.fo.chips)}`);
  M._mirThreadReset();
  const ml = ask('점심 먹었어?', tallyCtx, NOON);
  T(/돌림판 돌려 드릴까요/.test(ml.fo.line) && ml.fo.chips[0] === '점심 뭐 먹지', '식사 한 마디는 «돌림판 돌려 드릴까요?» — «응» 이 돌림판과 같은 뜻', ml.fo.line);
  M._mirThreadReset();
  ask('3426', tallyCtx, NOON); ask('베이화면 크게', tallyCtx, NOON + 20000);   // 못 배운 말(null)
  const am = ask('응', tallyCtx, NOON + 40000);
  T(am.fo.kind === 'prompt' && !/온도/.test(am.fo.q || ''), '못 배운 말 뒤의 «응» 은 두 턴 전 칩(3426 온도)을 실행하지 않고 되묻는다', `${am.fo.kind} ${am.fo.q}`);
  M._mirThreadReset();
  const pc = ask('시간당 몇 개 했어', tallyCtx, NOON);
  T(!pc.fo.chips.some((c) => /끝나|남은 대수|작업 속도/.test(c)), '끝난 배의 속도 답 뒤에는 ETA·잔여를 권하지 않는다(완료는 재료 info 로 판정)', JSON.stringify(pc.fo.chips));
  M._mirThreadReset();
  const w46 = ask('여기를 46', tallyCtx, NOON);
  const g46 = M.mirThreadResolve('그거 온도', Object.assign(tallyCtx(), { _now: NOON + 5000, _utterAt: NOON + 5000 }), NOON + 5000);
  T(/DJLU2230646/.test(w46.a || '') && g46.q === '0646 온도', '«여기를 46» 뒤 «그거 온도» → «0646 온도»(46 이 아니라 컨 끝 네 자리)', g46.q);
  M._mirThreadReset();
  //  콘앱 거절 답에는 한 마디가 없다
  const coneCtx = () => Object.assign(tallyCtx(), { app: 'cone', smallTalkLast: false, cone: { rows: [], dischRows: [], stowRows: [] } });
  const cc = ask('STMJ 야간 1호기 최원형 2호기 송제욱', coneCtx, NOON);
  T(/검수앱에서 적어 주세요/.test(cc.a || '') && !cc.fo.line && !cc.fo.chips.length, '콘앱 «호기 검수원은 검수앱에서» 거절 답에는 한 마디·칩이 없다', `${first(cc.a)} ${cc.fo.line}`);
  M._mirThreadReset();
  //  «아니» 는 칩만 거두고 대화는 남긴다
  ask('0230 어디', tallyCtx, NOON); const dn = ask('아니', tallyCtx, NOON + 5000); const after = ask('그거 무게', tallyCtx, NOON + 10000);
  T(dn.fo.kind === 'decline' && /18,000kg/.test(after.a || ''), '제안 뒤 «아니» 는 칩만 거두고 대화는 남긴다 — 이어서 «그거 무게» 가 0230 으로 풀린다', `${dn.fo.kind} → ${first(after.a)}`);
  M._mirThreadReset();
  const ym = ask('카고', tallyCtx, NOON); const ym2 = ask('응 맞아', tallyCtx, NOON + 5000);
  T(ym.fo.confirm && ym2.fo.kind === 'confirmYes', '확인 질문 뒤 «응 맞아» 도 «그대로 둘게요»', ym2.fo.kind);
  M._mirThreadReset();
  const nt = ask('아니 남은 대수', tallyCtx, NOON);
  T(nt.a != null && /남은 작업/.test(nt.a) && !M.isWeakAnswer('아니 남은 대수', nt.a, { via: nt.via, rq: '남은 대수' }), '대화 밖 «아니 남은 대수» 도 «남은 대수» 로 풀려 모델로 새지 않는다', first(nt.a));
  M._mirThreadReset();
}
console.log('■ ①-C askMir 경로 — 되쓴 말은 규칙 답(via rules)으로 곧장, 모델 호출 0');
(async () => {
  M._mirThreadReset(); ask('몇 시에 끝나', tallyCtx, NOON);
  let fetched = 0; const _f = global.fetch; global.fetch = () => { fetched += 1; return Promise.reject(new Error('연막')); };
  const c = tallyCtx(); c._now = NOON + 5000; c._utterAt = NOON + 5000;
  let r = null;
  try { r = await M.askMir('두 번째', c, (cq, tr) => M.answerOneRaw(cq, Object.assign({}, c, { _trace: tr })), { who: '연막' }); } catch (e) { r = { err: String(e && e.message) }; }
  global.fetch = _f;
  T(r && r.via === 'rules' && fetched === 0 && /호기별/.test(r.text || ''), 'askMir(«두 번째») 는 규칙 답(via rules) · 모델 호출 0', `via=${r && r.via} fetch=${fetched} ${r && r.err ? r.err : ''}`);
  M._mirThreadReset();
  part2();
})();
function part2() {
console.log('■ ② 같은 말을 다시 풀어도 같은 답(검색창은 다시 그릴 때마다 answerOneRaw 를 부른다)');
{
  M._mirThreadReset();
  ask('3426', tallyCtx, NOON);
  const UT = NOON + 5000;   // 같은 접수 표(askedAt) — 화면이 다시 그린 것
  const c = tallyCtx(); c._now = UT; c._utterAt = UT; const before = M.answerOneRaw('응', c);
  const fo = M.mirThreadCommit('응', before, '', c, UT);
  const after1 = M.answerOneRaw('응', Object.assign(tallyCtx(), { _now: NOON + 6000, _utterAt: UT }));
  const after2 = M.answerOneRaw('응', Object.assign(tallyCtx(), { _now: NOON + 7000, _utterAt: UT }));
  T(norm(before) === norm(after1) && norm(after1) === norm(after2) && /온도/.test(fo.q), '«응»(=3426 온도) 을 기록한 뒤 같은 접수를 다시 풀어도 같은 답(기록 전·후 3회 동일)', `${first(before)} | ${first(after1)}`);
  const again = M.answerOneRaw('응', Object.assign(tallyCtx(), { _now: NOON + 8000, _utterAt: NOON + 8000 }));
  T(/실번호 없음/.test(again || ''), '새 접수의 «응» 은 다음 제안(3426 실번호)으로 — 글자가 같아도 같은 발화가 아니다', first(again));
  const UT2 = NOON + 9000;
  const cc = Object.assign(tallyCtx(), { _now: UT2, _utterAt: UT2 });
  const cl = M.answerOneRaw('됐어', cc); M.mirThreadCommit('됐어', cl, 'thread', cc, UT2);
  const cl2 = M.answerOneRaw('됐어', Object.assign(tallyCtx(), { _now: NOON + 10000, _utterAt: UT2 }));
  T(norm(cl) === norm(cl2) && /부르세요|부르시면/.test(cl), '접은 뒤 같은 «됐어» 를 다시 풀어도 같은 끝맺음 문구', `${first(cl)} | ${first(cl2)}`);
  M._mirThreadReset();
}

console.log('■ ③ 대화 흐름(관문 4 확정본 그대로 — 말은 전부 실제 로그 문장)');
//  [질문, 기대: {a: 답 정규식 | null, kind, chip0: 첫 칩 정규식, how: 풀이}]
const DIALOGS = [
  [['몇시쯤에 끝날까?', { a: /작업 다 끝났어요/, kind: 'answer', chip0: /출항 언제/ }], ['응', { a: /KOBE TRADER — 작업 계획|PORT-MIS|출항/, kind: 'answer' }], ['아니 작업 속도', { a: /작업 속도/, kind: 'answer' }], ['됐어 고마워', { kind: 'close' }]],
  [['비 오기 몇 개 남았어', { a: /남은 작업: 0대/, kind: 'answer', chip0: /출항 언제/ }], ['두 번째', { a: /호기별 검수원·작업량/, kind: 'answer' }], ['그만', { kind: 'close' }]],
  [['3426', { a: /FBIU5093426/, chip0: /3426 온도/ }], ['응', { a: /세팅 온도/, chip0: /3426 실번호/ }], ['응', { a: /실번호 없음/, chip0: /3426 무게/ }], ['응', { a: /27,300kg/, chip0: /3426 규격/ }], ['고마워', { kind: 'close' }]],
  [['0230 어디', { a: /0230/, chip0: /0230 실번호/ }], ['응', { a: /BMOU5190230/ }], ['그거 무게', { a: /18,000kg/ }], ['됐어', { kind: 'close' }]],
  [['STMJ 야간 1호기 최원형 2호기 송제욱', { a: /📝/, chip0: /1호기 누구야/ }], ['응', { a: /1호기 검수원/ }], ['괜찮아', { kind: 'close' }]],
  [['미래야 화면 어둡게 해 줘', { a: /이미 제일 어두워요/, chip0: /^밝게$/ }], ['응', { a: /화면을/ }], ['됐어', { kind: 'close' }]],
  [['브리핑', { a: /📋/, chip0: /리퍼 목록/ }], ['위험물 목록', { a: /위험물 총 5대/, chip0: /리퍼 목록/ }], ['아니 리퍼 목록', { a: /리퍼 총 1대/, chip0: /엠티 몇 대/ }], ['오케이', { kind: 'close' }]],
  [['너 저녁 뭐 먹었어', { a: /츄르|먹었|아직/, chip0: /저녁 뭐 먹지/ }], ['응', { a: /돌림판/ }], ['수고했어', { kind: 'close' }]],
  [['씰이 잘려있을때 처리방법?', { a: /씰이 없거나 잘려/, chip0: /커트씰/ }], ['응', { a: /커트씰/ }], ['됐습니다', { kind: 'close' }]],
  [['디지가 몇 개 있어', { a: /위험물: 5대/, chip0: /위험물 목록/ }], ['응', { a: /위험물 총 5대/ }], ['끝', { kind: 'close' }]],
  [['sp', { a: /뭐 확인해 드릴까요/, kind: 'prompt' }], ['몇 시에 끝나', { a: /작업 다 끝났어요/ }], ['sp', { a: /작업 계획|입항 예정/ }], ['그만', { kind: 'close' }]],
  [['카고', { a: /Cargo/, confirm: true }], ['응', { a: /그대로 둘게요/, kind: 'confirmYes' }], ['고마워', { kind: 'close' }]],
  [['1억이 다음 작업은 어디야', { a: /베이뷰 작업/, confirm: true }], ['아니', { a: /한 마디만 더/, kind: 'confirmNo' }], ['남은 대수', { a: /남은 작업/ }], ['수고', { kind: 'close' }]],
  [['6배의 작업 현황 좀 알려 줘', { a: /📭 6번 베이 없음/, chips0: true }], ['아니 26번 베이 현황', { a: /26번 베이: 총 70대/, chip0: /26번 베이 남은/ }], ['응', { a: /26번 베이 남은 작업/ }], ['고마워', { kind: 'close' }]],
  [['미르야', { a: /네, 미르예요/, chip0: /몇 시에 끝나/ }], ['응', { a: /작업 다 끝났어요/ }], ['아니요', { a: /두고 볼게요/, kind: 'decline' }], ['그거 온도', { a: /어느 컨 말씀이세요/, kind: 'prompt' }], ['3426', { a: /FBIU5093426/ }], ['그거 무게', { a: /27,300kg/ }], ['고마워', { kind: 'close' }]],
];
for (const dl of DIALOGS) {
  M._mirThreadReset();
  let t = NOON;
  const log = [];
  let ok = true;
  for (const [q, ex] of dl) {
    t += 20 * 1000;
    const r = ask(q, tallyCtx, t);
    const a = r.a == null ? '' : r.a;
    let good = true;
    if (ex.a && !ex.a.test(a)) good = false;
    if (ex.kind && r.fo.kind !== ex.kind) good = false;
    if (ex.chip0 && !(r.fo.chips[0] && ex.chip0.test(r.fo.chips[0]))) good = false;
    if (ex.chips0 && r.fo.chips.length !== 0) good = false;
    if (ex.confirm && !r.fo.confirm) good = false;
    if ((ex.kind === 'close' || ex.kind === 'decline') && !/😺/.test(a)) good = false;
    if (!good) ok = false;
    log.push(`${good ? '·' : '✘'} «${q}» → ${first(a).slice(0, 50) || '(null)'} [${r.fo.kind}${r.fo.chips.length ? ' ' + JSON.stringify(r.fo.chips) : ''}${r.fo.confirm ? ' ❓' : ''}]`);
  }
  T(ok, `대화 «${dl[0][0]}» ${dl.length}턴`, '\n      ' + log.join('\n      '));
}

console.log('■ ④ 작업 중 시점 — 완료 기록을 09-10 15:00 까지만(192/337) · 시계 15:00');
{
  const T0 = new Date('2026-09-10T15:00:00+09:00').getTime();
  const _now = Date.now; Date.now = () => T0;
  const v2 = JSON.parse(JSON.stringify(v));
  for (const m of ['discharge', 'loading']) { const c = (v2[m] || {}).completed || {}; for (const k of Object.keys(c)) if (!(c[k].at <= T0)) delete c[k]; }
  delete v2.info.dischargeDone; delete v2.info.dischargeDoneAt; delete v2.info.loadingDone; delete v2.info.loadingDoneAt; delete v2.info.departBadgeAt;
  const midCtx = mkCtx(v2);
  M._mirThreadReset();
  const a = ask('몇 시에 끝나', midCtx, T0 + 1000);
  T(/145대 남았어요/.test(a.a) && a.fo.chips[0] === '남은 대수' && /남은 대수도 볼까요/.test(a.fo.line), '진행 중 ETA → 남은 대수·갱별 진행·작업 속도 제안', `${first(a.a)} ${JSON.stringify(a.fo.chips)}`);
  const b = ask('응', midCtx, T0 + 21000);
  T(/남은 작업: 145대/.test(b.a) && b.fo.chips[0] === '갱별 진행' && !b.fo.chips.includes('몇 시에 끝나'), '«응» → 남은 대수 · 이미 본 ETA 는 다시 권하지 않는다', `${first(b.a)} ${JSON.stringify(b.fo.chips)}`);
  const c = ask('두 번째', midCtx, T0 + 41000);
  T(/작업 속도/.test(c.a) && c.fo.chips[0] === '갱별 진행', '«두 번째» → 작업 속도 · 남은 제안은 갱별·다음 배', `${first(c.a)} ${JSON.stringify(c.fo.chips)}`);
  const d = ask('됐어 고마워', midCtx, T0 + 61000);
  T(d.fo.kind === 'close' && /😺/.test(d.a), '«됐어 고마워» 로 접는다');
  Date.now = _now;
  M._mirThreadReset();
}

console.log('■ ⑤ 칩 전수 — 한 마디에 붙는 제안은 전부 엔진이 강한 답을 낸다');
{
  M._mirThreadReset();
  const rf = '3426', dg = '1843', any = '0230';
  const CHIPS = ['몇 시에 끝나', '남은 대수', '갱별 진행', '작업 속도', '다음 배 언제', '호기별 진행', '1호기 누구야', '3호기 누구야', `${rf} 온도`, `${rf} 실번호`, `${any} 무게`, `${any} 규격`, `${dg} 위험물`,
    '리퍼 목록', '위험물 목록', '엠티 몇 대', '20피트 몇 대', '씰 목록', '커트씰', '도선 언제야', '26번 베이 남은', '26번 베이 리퍼', '더 어둡게', '밝게', '브리핑', '아침 뭐 먹지', '점심 뭐 먹지', '저녁 뭐 먹지'];
  const weakOnes = [];
  for (const ch of CHIPS) { const c = tallyCtx(); const t = {}; c._trace = t; let a = null; try { a = M.answerOneRaw(ch, c); } catch (e) { a = null; } const hedged = a == null || (M.isWeakAnswer(ch, a, t) && (t.via && !/^(time|progress)$/.test(t.via) ? true : /못 배웠|이렇게 물어보세요|무슨 뜻인지 못 알아|어느 배 말씀인지/.test(String(a)))); if (hedged) weakOnes.push(`${ch}→${t.via || '-'}:${first(a).slice(0, 30)}`); }
  T(weakOnes.length === 0, `칩 ${CHIPS.length}개 전부 강한 답(얼버무림 0)`, weakOnes.join(' · '));
}

console.log('■ ⑥ 배선 — 다섯 창구·콘앱 포장·매뉴얼·판');
{
  const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
  const mir = read('src/mir.js');
  T(/^export function mirThreadCommit\(/m.test(mir) && /^export function mirThreadResolve\(/m.test(mir) && /^export function mirThreadAlive\(/m.test(mir), 'mir.js [mirThread] 절이 셋을 내보낸다');
  T(/mirThreadResolve\(q0, ctx \|\| \{\}/.test(mir) && /_trace\.via = 'thread'/.test(mir), 'answerOneRaw 머리에서 풀고 직접 답은 via=thread');
  T(!/_threads\[[^\]]+\]\s*=/.test(mir.slice(mir.indexOf('export function mirThreadResolve'), mir.indexOf('export function mirThreadCommit'))), '풀기(mirThreadResolve)는 기억을 쓰지 않는다(순수)');
  const entry = read('src/mirCore.entry.js');
  T(/mirThreadCommit/.test(entry) && /mirThreadAlive/.test(entry), '콘앱 포장(mirCore.entry)이 mirThreadCommit·mirThreadAlive 를 내보낸다');
  for (const [f, needCommit, needAlive] of [['src/components/MirFab.jsx', true, true], ['src/components/SearchPanel.jsx', true, true], ['src/pages/GlobalSearchPage.jsx', true, true], ['src/pages/VoyagePage.jsx', true, true], ['public/cone.html', true, false]]) {
    const s = read(f);
    T((!needCommit || /mirThreadCommit\(/.test(s)) && (!needAlive || /mirThreadAlive\(/.test(s)), `${f} — 접수 시점 기록(mirThreadCommit)${needAlive ? ' · 1글자 문지기(mirThreadAlive)' : ''}`);
  }
  const help = read('src/data/helpData.js');
  T(/미르 대화|대화\(3\.68\)/.test(help) && /응/.test(help) && /됐어|그만/.test(help), '매뉴얼(helpData)에 미르 대화 설명(응·끝맺음)');
  const utils = read('src/utils.js');
  T(/APP_VERSION = 'TallyOne (3\.(6[89]|[7-9]\d)|[4-9]\.\d\d)/.test(utils), 'APP_VERSION 3.68 이상');
  T(/APP_NOTE = '[^']*(대화|터미널 본선 현황|콘앱 첫 화면|예상 작업 시간|야드|출력물|베이상세|끼니|덱플랜|수화물|검수 리스트|엠티실|선적 자동 가이드|리퍼 체크|화난 얼굴|화내고|실사 미르|PORT-MIS 를 수집기가|공컨 개정판|해치커버 장수)/.test(utils), 'APP_NOTE 가 이번 판(4.07-02 공컨 개정판 · 4.07 실사 미르 · 4.06 미르 화난 얼굴 · 4.02 콘앱 첫 화면 · 4.01 예상 작업 시간 · 3.72-02 리퍼 체크 안 함 · 3.72-01 선적 자동 가이드 · 3.72 덱플랜 완료 표시 · 3.71 엠티실 음성 · 3.70-02 검수 리스트 · 대화·3.69 야드·3.69-03 출력물·3.69-04 베이상세·3.69-05 끼니·3.70 덱플랜 · 3.70-01 수화물) 문구');
  const cone = read('public/cone.html');
  T(/__CONEV\s*=\s*['"]ConeOne 2\.(5[7-9]|[6-9]\d)/.test(cone), 'ConeOne 2.57 이상');
}

console.log(`\n미르 대화 연막검사 — ${n}항 중 ${bad}건 실패`);
process.exit(bad ? 1 : 0);
}
