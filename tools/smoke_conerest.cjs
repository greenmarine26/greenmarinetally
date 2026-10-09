// 2.64-01 연막검사 — 미르가 «24번 홀드에 콘이 몇개 남았어» 에 그 베이의 남은 콘만 세어 답하는가 (실항차 PCSZ 2631E · XTPG 543E).
//   검수사 2026-10-08 18:28 «오늘 미르가 24번 홀드에 콘이 몇개 남았어 하고 물어 보니 전체 홀드에 있는 콘을 불러 줬습니다» ·
//   18:30 «특정 베이를 지정하면 남은 갯수를 정확히 알려 줄수 있도록 .... 두 검수사 실데이터를 입력 하면서 했으니 콘 정보도 정확히 알수 있었을 것입니다».
//   픽스처 = 헤드리스 콘앱이 실항차 자료로 낸 «남은 콘 표»(tools/fixtures/conerest_real.json). 기준값은 코드가 아니라 완료 기록 516건을 따로 센 값이다 —
//   PCSZ 2631E 양하는 베이 1·2·3 홀드 16대와 15·16·17 홀드 29대만 미완이고 나머지 홀드는 전부 끝났다(24번 홀드 14/14 완료).
const fs = require('fs'); const path = require('path');
//  엔진(mir.js)이 화면 전역을 건드려도 서도록 최소 전역을 둔다 — 네트워크는 없고, 부르면 기록한다(모델 창구로 새는지 보려고).
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {} };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
const FETCHES = []; global.fetch = (u) => { FETCHES.push(String(u)); return Promise.reject(new Error('연막: 네트워크 없음')); };
const E = require(path.resolve(process.argv[2] || ''));
const ROOT = path.join(__dirname, '..');
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'conerest_real.json'), 'utf8'));
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('미르 «N번 홀드 콘 몇 개 남았어» (ConeOne 2.64-01)');

const P = { rows: FX.pcsz.rows, restRows: FX.pcsz.restRows, dischRows: [], stowRows: [] };
const H = { rows: FX.pcsz.rows, restRows: FX.pcsz_half.restRows, dischRows: [], stowRows: [] };
const X = { rows: FX.xtpg.rows, restRows: FX.xtpg.restRows, dischRows: [], stowRows: [] };
const NR = { rows: FX.pcsz.rows, dischRows: [], stowRows: [] };   // 완료 기록을 못 읽은 경우
const A = (q, c) => E.coneAnswer(q, c) || '';

// ① 검수사 실제 말 — 그 베이(23-25)의 홀드콘만, 남은 0개
const a1 = A('24번 홀드에 콘이 몇개 남았어', P);
ok(/베이 23-25/.test(a1) && /홀드콘 양하 빼기 0개 남음\(전체 14개 모두 끝\)/.test(a1), `24번 홀드 → 23-25 홀드콘 0/14 — ${a1}`);
ok(!/베이 01-03|베이 15-17|전체 86/.test(a1), '다른 베이·배 전체 홀드콘을 섞어 부르지 않는다(종전 사고)');
ok(A('24번 베이 홀드콘 남은거', P) === a1, '«24번 베이 홀드콘 남은거» 도 같은 답');
ok(A('홀드 24번 콘 몇개 남았어', P) === a1, '«홀드 24번» 어순도 같은 답');
ok(A('베이 24 홀드콘 몇 개 남았어', P) === a1, '«베이 24» 어순도 같은 답');

// ② 중간까지 한 베이 — 남은 수가 정확히 나온다(홀드 컨 42대 중 21대를 미완으로 둔 실항차 변형)
const a2 = A('24번 홀드에 콘이 몇개 남았어', H);
ok(/홀드콘 양하 빼기 9개 남음\(전체 14개 중 5개 끝\)/.test(a2), `절반만 한 베이 → 9개 남음 — ${a2}`);

// ③ 번호 없이 «몇 개 남았어» — 배 전체 남은 수와 남은 베이 (PCSZ 1-3·15-17 홀드만 미완: 6+4)
const a3 = A('홀드콘 몇개 남았어', P);
ok(/홀드콘 양하 빼기 10개\(전체 86개\)/.test(a3), `번호 없는 말 → 배 전체 홀드콘 10/86 — ${a3.split('\n')[0]}`);
ok(/베이 01-03 홀드콘 양하 6/.test(a3) && /베이 15-17 홀드콘 양하 4/.test(a3) && !/베이 23-25/.test(a3), '남은 베이는 01-03·15-17 뿐이다(독립 집계와 같다)');
ok(/24번 홀드 콘 몇 개 남았어/.test(a3), '번호를 같이 말하면 그 베이만 알려 준다는 안내를 붙인다');

// ④ 선적 꽂기 — XTPG 543E(아직 아무것도 안 함)는 선적 꽂기 19개 전부 남음
const a4 = A('홀드콘 몇개 남았어', X);
ok(/홀드콘 선적 꽂기 19개\(전체 19개\)/.test(a4), `선적 쪽 — ${a4.split('\n')[0]}`);
const a4b = A('3번 홀드 콘 몇 개 남았어', X);
ok(/베이 03-05/.test(a4b) && /선적 꽂기 18개 남음\(전체 18개, 아직 안 함\)/.test(a4b), `03-05 베이 홀드 18개 아직 안 함 — ${a4b}`);

// ⑤ 완료 기록을 못 읽었으면 0 으로 지어내지 않는다
const a5 = A('24번 홀드에 콘이 몇개 남았어', NR);
ok(/못 읽어서/.test(a5) && !/0개 남음/.test(a5) && /홀드콘 양하 14개/.test(a5), `기록 없음 → «못 세요» + 계획만 — ${a5}`);
ok(/못 읽어서/.test(A('홀드콘 몇개 남았어', NR)), '번호 없는 말도 못 읽었으면 못 센다고 한다');

// ⑥ 다른 말은 종전 그대로
ok(/콘이 남는 곳\(반납\)/.test(A('남는 데', P)), '«남는 데» 는 종전 반납 목록');
ok(/베이 23-25\. 데크콘 곳당 36에서 0개로, 총 144개 남음\(반납\)\. 홀드콘 곳당 14에서 0개로, 총 14개 남음\(반납\)\./.test(A('24번 베이', P)), '«24번 베이» 는 종전 계획 가감 답 그대로(번호만 말하면 «남은» 이 아니라 계획 가감)');
ok(/양하 0대, 선적 0대/.test(A('24번 베이 컨테이너 몇 대', P)), '«컨테이너 몇 대» 는 대수 답(남은 콘 답으로 안 간다)');
const a6 = A('홀드콘 14개 남았어', P);
ok(!/14번 베이는 작업표에 없습니다|^베이 14\b/.test(a6), '«홀드콘 14개» 의 14 를 베이 번호로 읽지 않는다');
ok(A('이 배 홀드콘 개수 남은 곳', P) !== '', '번호 없이 개수를 묻는 다른 말투도 답한다');

// ⑥-2 감사(2.64-01) — 단위어 숫자를 베이 번호로 읽지 않고, 컨테이너 대수·반납·모자람 질문은 가로채지 않는다
for (const q of ['홀드콘 4곳 남았어', '코끼리콘 2곳 몇 개 남았어', '홀드콘 2호기 남았어', '홀드콘 3열 남았어', '홀드 3군데 몇 개 남았어', '홀드콘 1단 몇 개 남았어', '홀드콘 2 호기 몇 개 남았어', '홀드콘 14개 몇 개 남았어', '20ft 홀드콘 몇개 남았어']) {
  const x = A(q, P);
  ok(!/번 베이는 작업표에 없습니다|^베이 \d/.test(x), `«${q}» 의 숫자는 베이 번호가 아니다 — ${x.split('\n')[0].slice(0, 60)}`);
}
for (const q of ['베이 24에 홀드콘 몇 개 남았어', '홀드콘 24 몇 개 남았어', '24번 홀드 콘 몇 개 빼야 돼', '24번 홀드 콘 끝났어?', '24번 홀드 콘 얼마나 했어']) {
  ok(/^베이 23-25\. 홀드콘 양하 빼기 0개 남음/.test(A(q, P)), `«${q}» → 23-25 홀드 남은 수로 답한다`);
}
ok(E.coneAnswer('24번 홀드 컨테이너 몇 대 남았어', P) === null, '«24번 홀드 컨테이너 몇 대 남았어» 는 콘 답이 아니다 — null 로 넘겨 완료를 아는 진행 답이 한다');
ok(E.coneAnswer('5번 베이 컨테이너 몇 대 남았어', P) === null, '«5번 베이 컨테이너 몇 대 남았어» 도 계획 대수(완료 무시)로 답하지 않는다');
ok(/콘이 남는 곳\(반납\)/.test(A('반납할 콘 몇 개 남았어', P)), '«반납할 콘 몇 개 남았어» 는 종전 반납 목록');
ok(!/남은 콘\(완료 기록 기준\)/.test(A('모자란 콘 몇 개 남았어', P)), '«모자란 콘 몇 개 남았어» 는 종전 부족 답');

// ⑥-3 감사(2.64-01 재감사) — 같은 뜻의 흔한 말투도 남은 콘 답으로 간다(안 가면 종전 «총 N개 남음(반납)» 계획 답이 나가 사고가 되풀이된다)
for (const [q, re] of [
  ['1번 홀드 콘 몇 개 빼면 돼', /^베이 01-03\. 홀드콘 양하 빼기 6개 남음/], ['1번 홀드 콘 아직 몇개야', /^베이 01-03\. 홀드콘 양하 빼기 6개 남음/], ['1번 홀드 콘 잔량', /^베이 01-03\. 홀드콘 양하 빼기 6개 남음/],
  ['1번 홀드 콘 몇 개 안 뺐어', /^베이 01-03\. 홀드콘 양하 빼기 6개 남음/], ['24번 홀드 콘 남음?', /^베이 23-25\. 홀드콘 양하 빼기 0개 남음/], ['24번 홀드콘 얼마 남음?', /^베이 23-25\. 홀드콘 양하 빼기 0개 남음/],
  ['홀드콘 남았어?', /^남은 콘\(완료 기록 기준\) — 홀드콘 양하 빼기 10개\(전체 86개\)/], ['남은 홀드콘 알려줘', /^남은 콘\(완료 기록 기준\) — 홀드콘 양하 빼기 10개/], ['홀드콘 남았나요', /^남은 콘\(완료 기록 기준\) — 홀드콘 양하 빼기 10개/],
  ['데크콘 남았어?', /^남은 콘\(완료 기록 기준\) — 데크콘 양하 빼기 0개\(전체 858개\)\. 남은 곳이 없습니다/], ['코끼리콘 남았어', /^남은 콘\(완료 기록 기준\) — 코끼리콘 양하 빼기 0개/],
  ['콘 남았어', /^남은 콘\(완료 기록 기준\) — 데크콘 .*홀드콘 양하 빼기 10개/], ['남은 콘', /^남은 콘\(완료 기록 기준\)/], ['콘 남은거', /^남은 콘\(완료 기록 기준\)/], ['콘 몇 개 남았는지 알려줘', /^남은 콘\(완료 기록 기준\)/]]) {
  ok(re.test(A(q, P)), `«${q}» → 남은 콘(완료 기록 기준) 답 — ${A(q, P).split('\n')[0].slice(0, 70)}`);
}
for (const q of ['남는 콘', '남는 데', '홀드콘 남은 시간', '홀드콘 몇 시에 끝나', '모자란 콘 몇 개 남았어', '반납할 콘 남은 거']) {
  ok(!/\(완료 기록 기준\)/.test(A(q, P)), `«${q}» 는 남은 콘 답이 아니다(종전 답 그대로)`);
}
ok(E.coneAnswer('엠티실 몇 대 남았어', P) === null, '«엠티실 몇 대 남았어» 는 null');

// ⑦ 배선 — 콘앱이 완료 기록 기준 남은 콘 표를 만들어 미르에 넘기는가
const html = fs.readFileSync(path.join(ROOT, 'public', 'cone.html'), 'utf8');
const stripC = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
const fn = (html.match(/async function coneRestRowsNow\(\)\{[\s\S]*?\n\}\n/) || [''])[0];
ok(fn.length > 400, 'coneRestRowsNow 가 있다');
ok(!/__coneQA/.test(stripC(fn)), '남은 콘 표는 계획 표를 읽는 곳 한 벌(coneQaRowsNow)로만 읽는다(앞 배 표가 새지 않는다)');
ok(/restPlan\(pl\.disch, mc\.compD\)/.test(fn) && /restPlan\(pl\.stow, mc\.compL\)/.test(fn) && /ediRowsAll:all/.test(fn), '완료 기록(compD·compL)에 없는 컨 행만으로 다시 센다 — 받침 판정용 전체 행(ediRowsAll)은 그대로 싣는다');
ok(/planToGroups\(/.test(fn) && /mergeTrioRows\(/.test(fn) && /pl\.ctx/.test(fn), '계획 표와 같은 계산 함수·같은 구조 정보로 센다(합이 어긋나지 않는다)');
ok(/pl\.sepDis \? \{\}/.test(fn), '양하 분리 작업 배(양하 콘 0 처리)는 계획 표와 똑같이 처리한다');
ok(/tot\.length!==qaRows\.length \|\| rst\.length!==tot\.length \|\| \(rlo && rlo\.length!==tot\.length\)\) return null/.test(fn) && /tot\[i\]\.bay!==qaRows\[i\]\.bay/.test(fn), '행 수·이름·순서가 계획 표와 다르면 지어내지 않고 null');
ok(/mc\.compOk\.D \|\| !mc\.compOk\.L\) return null/.test(fn) && /gOk\('voyages\/'\+k\+'\/discharge\/completed\.json'\)/.test(html) && /gOk\('voyages\/'\+k\+'\/loading\/completed\.json'\)/.test(html), '완료 기록을 읽지 못했으면(compOk) 센 척하지 않는다');
ok(/state\._conePlan=\{ key:__calcKey, sg, dg, ctx:__ctx, sepDis:__sepDis, groups,[\s\S]*?dLen:[\s\S]*?sLen:[^}]*\};[^\n]*\n\s*renderResults\(groups\)/.test(html), 'runCalc 가 계획(그룹·ctx·분리 표식·자료 지문)을 남기고 바로 표를 그린다');
ok(/try\{ cone\.restRows = await coneRestRowsNow\(\); \}catch/.test(html) && !/test\(String\(q\|\|''\)\)\) cone\.restRows/.test(html), 'mirAsk 가 말 낱말 게이트 없이 cone.restRows 를 미르에 넘긴다(게이트가 엔진의 REST 진입보다 좁으면 «못 읽어서» 거짓 안내가 난다)');
ok(/\(\/콘\/\.test\(String\(q\|\|''\)\) && \/남았\|남은/.test(html), '표 없이 «콘 몇 개 남았어» 를 물어도 미르가 대신 계산한다(mirEnsureCalc)');
ok(/window\.__CONEV='ConeOne 2\.(64-01|65|66|67)(-\d\d)?'/.test(html), '콘앱 판 번호 ConeOne 2.64-01 이상(2.65 포함)');


// ⑧ 실함수 — cone.html 에서 coneRestRowsNow·planToGroups·ediToBayGroups·mergeTrioRows 를 **그대로** 꺼내(베끼지 않는다) 실항차 EDI 행(PCSZ 2631E·XTPG 543E)
//    위에서 돌린다. 기준은 코드가 낸 값이 아니라 완료 기록을 따로 센 값(24번 홀드 14/14 끝, 미완은 1-3·15-17 홀드뿐)과 «많이 끝내면 남는 건 줄어든다» 는 성질이다.
const vm = require('vm');
const RX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'conerest_rows.json'), 'utf8'));
const grab = (re, name) => { const m = html.match(re); if (!m) { console.log('  ✗ 소스에서 못 꺼냄 ' + name); fail++; process.exit(1); } return m[0]; };
const SRC8 = [
  /function holdConeCount\([\s\S]*?\n\}\n/, /function distribute\([\s\S]*?\n\}\n/, /function mergeTrioRows\([\s\S]*?\n\}\n/, /function ediToBayGroups\([\s\S]*?\n\}\n/,
  /function bayGroupLabel\([\s\S]*?\n\}\n/, /function buildConeCtx\([\s\S]*?\n\}\n/, /function planToGroups\([\s\S]*?\n\}\n/, /function coneQaRowsNow\(\)\{[\s\S]*?\n\}\n/,
  /async function coneRestRowsNow\(\)\{[\s\S]*?\n\}\n/,
].map((re, i) => grab(re, 'fn' + i)).join('\n');
// 계획 표(renderResults 가 만드는 것과 같은 모양) — runCalc 의 그룹 병합·mergeTrioRows 를 같은 순서로 밟는다
function mk(fx, o) {
  o = o || {};
  const compD = {}, compL = {}; for (const c of (o.compD || fx.compD)) compD[c] = true; for (const c of (o.compL || fx.compL)) compL[c] = true;
  const ctx = { console: { log() {}, warn() {}, error() {} }, Promise, setTimeout, String, Array, Object, Set, Number, Math, parseInt, JSON, Map, window: {} };
  const isD = fx.dRows.length > 0, isS = fx.sRows.length > 0;
  ctx.state = { voyageKey: fx.key, shipType: fx.shipType, multiCount: fx.multiCount,
    disch: { isEDI: isD, ediRows: fx.dRows, ediRowsAll: o.noAll ? [] : fx.dAll },
    stow: { isEDI: isS, ediRows: fx.sRows, ediRowsAll: o.noAll ? [] : fx.sAll } };
  ctx.__load = () => {};
  ctx.loadMirCtx = async () => { ctx.__load(ctx); return o.mc === undefined ? { info: {}, compD, compL, compOk: { D: true, L: true } } : o.mc; };
  vm.createContext(ctx);
  vm.runInContext(SRC8 + '\nthis.__p=planToGroups; this.__b=buildConeCtx; this.__m=mergeTrioRows; this.__rest=coneRestRowsNow; this.__lbl=bayGroupLabel;', ctx);
  const c = ctx.__b(null);
  const sg = ctx.__p(ctx.state.stow, c); let dg = ctx.__p(ctx.state.disch, c);
  if (o.sepDis) dg = {};
  const groups = {};
  for (const k of new Set([...Object.keys(sg), ...Object.keys(dg)].map(Number))) {
    const s = sg[k], d = dg[k]; const bays = [...new Set([...(s && s.bays || []), ...(d && d.bays || [])])].sort((a, b) => a - b);
    groups[k] = { stow: s || { deck: 0, ele: 0, hold: 0 }, disch: d || { deck: 0, ele: 0, hold: 0 }, labels: [bays.length ? ctx.__lbl(bays) : String(k)] };
  }
  ctx.state._conePlan = { key: fx.key, sg, dg, ctx: c, sepDis: !!o.sepDis, groups, shipType: ctx.state.shipType, multiCount: ctx.state.multiCount, disch: ctx.state.disch, stow: ctx.state.stow,
    dRows: ctx.state.disch.ediRows, sRows: ctx.state.stow.ediRows, dLen: ctx.state.disch.ediRows.length, sLen: ctx.state.stow.ediRows.length };
  const keys = Object.keys(groups).map(Number).sort((a, b) => a - b).filter(k => { const g = groups[k]; return (g.stow.deck + g.stow.ele + g.stow.hold + g.disch.deck + g.disch.ele + g.disch.hold) > 0; });
  const kind = (g, side, x) => ({ need: g.stow[x] || 0, have: g.disch[x] || 0, diff: (g.stow[x] || 0) - (g.disch[x] || 0) });
  const base = keys.map(k => { const g = groups[k]; return { bay: g.labels.join(','), deck: kind(g, 0, 'deck'), ele: kind(g, 0, 'ele'), hold: kind(g, 0, 'hold') }; });
  ctx.window.__coneQA = { rows: ctx.__m(base, keys), key: fx.key };
  return ctx;
}
const hold = (R, bay, side) => { const r = (R || []).find(x => x.bay === bay); return r ? r.rest.hold[side] : undefined; };
const holdTot = (R, bay, side) => { const r = (R || []).find(x => x.bay === bay); return r ? r.tot.hold[side] : undefined; };
const sumRest = (R, side) => (R || []).reduce((a, r) => a + r.rest.hold[side], 0);
const sumTot = (R, side) => (R || []).reduce((a, r) => a + r.tot.hold[side], 0);
const sumAny = (R, part, side) => (R || []).reduce((a, r) => a + r[part].deck[side] + r[part].ele[side] + r[part].hold[side], 0);   // 데크·코끼리·홀드 합

(async () => {
  const PC = RX.PCSZ_2631E, XT = RX.XTPG_543E;
  console.log('⑧ 실함수 — 실항차 행 위에서 coneRestRowsNow');
  // 8-1 PCSZ 2631E 양하 — 24번(23-25) 홀드는 다 끝났다(독립 집계: 완료 516건, 미완 1-3·15-17 홀드)
  { const c = mk(PC); const R = await c.__rest();
    ok(Array.isArray(R) && R.length === c.window.__coneQA.rows.length, `PCSZ 남은 콘 표가 계획 표와 같은 행 수(${R && R.length})`);
    ok(hold(R, '23-25', 'dis') === 0 && holdTot(R, '23-25', 'dis') === 14, `PCSZ 23-25 홀드 양하 0/14 — ${hold(R, '23-25', 'dis')}/${holdTot(R, '23-25', 'dis')}`);
    ok(hold(R, '01-03', 'dis') === 6 && hold(R, '15-17', 'dis') === 4 && sumRest(R, 'dis') === 10 && sumTot(R, 'dis') === 86, `PCSZ 홀드 미완은 01-03 에 6, 15-17 에 4, 전체 10/86 — ${sumRest(R, 'dis')}/${sumTot(R, 'dis')}`);
    ok(R.every(r => ['deck', 'ele', 'hold'].every(k => r.rest[k].dis <= r.tot[k].dis && r.rest[k].load <= r.tot[k].load)), '남은 수는 어느 칸에서도 전체보다 크지 않다');
    // 엔진까지 이어서 — 검수사 말 그대로
    const ans = E.coneAnswer('24번 홀드에 콘이 몇개 남았어', { rows: c.window.__coneQA.rows, restRows: R, dischRows: [], stowRows: [] });
    ok(/^베이 23-25\. 홀드콘 양하 빼기 0개 남음\(전체 14개 모두 끝\)/.test(ans || ''), `콘앱이 만든 표 → 미르 답 — ${ans}`);
  }
  // 8-2 완료 기록 키 표기가 달라도(공백·하이픈·소문자) 같은 컨으로 본다
  { const c = mk(PC, { compD: PC.compD.map((k, i) => i % 3 === 0 ? k.toLowerCase() : (i % 3 === 1 ? k.slice(0, 4) + ' ' + k.slice(4) : k.slice(0, 4) + '-' + k.slice(4))) });
    const R = await c.__rest(); ok(R && sumRest(R, 'dis') === 10 && hold(R, '23-25', 'dis') === 0, '완료 기록 키의 공백·하이픈·소문자는 무시하고 센다'); }
  // 8-3 받침 판정용 전체 행(ediRowsAll)이 비어 있어도 위 단 콘이 통째로 0 이 되지 않는다
  { const c = mk(PC, { noAll: true }); const R = await c.__rest();
    ok(R && sumRest(R, 'dis') === 10 && sumTot(R, 'dis') === 86 && hold(R, '23-25', 'dis') === 0, `ediRowsAll 이 비어도 같은 답 — ${R && sumRest(R, 'dis')}/${R && sumTot(R, 'dis')}`); }
  // 8-3-A 전체 행(ediRowsAll)이 비어 있으면 «전체 행 = 계획 행» 이다 — 같은 행을 ediRowsAll 로 명시한 경우와 어떤 부분 완료에서도 똑같이 세야 한다
  //   (전체 행을 빼먹고 미완 행만으로 받침을 세면 위 단 콘이 줄어든다 — 실데이터 임의 완료 60벌 중 60벌에서 어긋났다)
  { const eq = Object.assign({}, PC, { dAll: PC.dRows }); let same = true, detail = '';
    for (const sub of [PC.compD.filter((_, i) => i % 2 === 0), PC.compD.filter((_, i) => i % 3 !== 0), PC.compD.slice(0, 379)]) {
      const A = await mk(eq, { compD: sub }).__rest(), B = await mk(PC, { noAll: true, compD: sub }).__rest();
      if (!A || !B || JSON.stringify(A) !== JSON.stringify(B)) { same = false; detail = `${sub.length}건 완료에서 어긋남`; } }
    ok(same, `ediRowsAll 이 비어도 «같은 행을 명시한 경우» 와 부분 완료 3벌에서 똑같이 센다 ${detail}`); }
  // 8-3-B 받침(아래 단) 판정은 완료와 상관없이 전체 행 기준 — 아래 홀드 컨이 다 끝나도 아직 안 한 데크 컨의 콘은 계획대로 남는다(전체 행을 빼면 위 단 콘이 사라진다)
  for (const noAll of [false, true]) {
    const deckUndone = PC.dRows.filter(r => { const b = parseInt(r.bay, 10); return b >= 23 && b <= 25 && parseInt(r.tier, 10) >= 80; }).map(r => r.cn);
    const left = new Set(deckUndone); const R = await mk(PC, { noAll, compD: PC.compD.filter(k => !left.has(k)) }).__rest();
    const r = (R || []).find(x => x.bay === '23-25');
    ok(r && deckUndone.length > 0 && r.rest.deck.dis === r.tot.deck.dis && r.tot.deck.dis > 0, `${noAll ? '(전체 행 없음) ' : ''}아래 홀드는 끝나고 데크 컨 ${deckUndone.length}대가 남으면 데크콘은 계획대로 ${r && r.tot.deck.dis} 남는다 — ${r && r.rest.deck.dis}`);
  }
  // 8-3-C 컨번호 없는 예약 자리(__BOOK_·__SLOT_) — 실번호로 쌓이는 완료 기록과 맞출 수 없다. 실항차 KBTR 2608E 선적 272칸·KKLC 2609N 선적 89칸이 전부 이 모양이다.
  //   PCSZ 23-25 홀드 컨 42대를 예약 자리로 바꾸고 완료 기록은 실번호로 둔 시나리오(재감사 실측 «끝난 홀드를 아직 안 함 14개 남음» 으로 틀리게 답하던 것).
  { const hr = PC.dRows.filter(r => { const b = parseInt(r.bay, 10); return b >= 23 && b <= 25 && parseInt(r.tier, 10) < 80; });
    const realOf = new Set(hr.map(r => r.cn));
    const fxB = JSON.parse(JSON.stringify(PC));
    fxB.dRows = fxB.dRows.map(r => realOf.has(r.cn) ? Object.assign({}, r, { cn: `__BOOK_${r.bay}_${r.row}_${r.tier}_${r.cn.slice(-4)}` }) : r);
    fxB.dAll = fxB.dAll.map(r => realOf.has(r.cn) ? Object.assign({}, r, { cn: `__BOOK_${r.bay}_${r.row}_${r.tier}_${r.cn.slice(-4)}` }) : r);
    const R = await mk(fxB).__rest(); const r = (R || []).find(x => x.bay === '23-25');
    ok(r && r.rest.hold.dis === 14 && r.lo && r.lo.hold.dis === 0, `완료 기록의 실번호(예약 자리와 안 맞음)가 있으면 «0~14» 범위로 — 최대 ${r && r.rest.hold.dis} · 최소 ${r && r.lo && r.lo.hold.dis}`);
    const ans = E.coneAnswer('24번 홀드에 콘이 몇개 남았어', { rows: PC && FX.pcsz.rows, restRows: R, dischRows: [], stowRows: [] });
    ok(/홀드콘 양하 빼기 0~14개 남음\(전체 14개\)/.test(ans || '') && /컨번호가 아직 없는 예약 자리/.test(ans || ''), `엔진 답이 범위와 이유를 말한다 — ${(ans || '').replace(/\n/g, ' / ')}`);
    ok(!/모두 끝|아직 안 함/.test(ans || ''), '예약 자리 때문에 알 수 없는 베이를 «모두 끝»·«아직 안 함» 으로 단정하지 않는다');
    const R0 = await mk(fxB, { compD: PC.compD.filter(k => !realOf.has(k)) }).__rest(); const r0 = (R0 || []).find(x => x.bay === '23-25');
    ok(r0 && r0.rest.hold.dis === 14 && !r0.lo, '맞지 않는 완료 기록이 하나도 없으면 예약 자리는 확실히 안 한 것 — 범위 없이 14');
    const t = await mk(fxB).__rest(); ok(t && t.every(x => !x.lo || ['deck', 'ele', 'hold'].every(k => x.lo[k].dis <= x.rest[k].dis && x.lo[k].load <= x.rest[k].load)), '최소는 최대보다 클 수 없다');
    ok(!/예약 자리/.test(E.coneAnswer('24번 홀드에 콘이 몇개 남았어', { rows: FX.pcsz.rows, restRows: (await mk(PC).__rest()), dischRows: [], stowRows: [] }) || ''), '(대조) 예약 자리가 없는 배는 범위 문구가 붙지 않는다');
    const tot = E.coneAnswer('홀드콘 몇개 남았어', { rows: FX.pcsz.rows, restRows: R, dischRows: [], stowRows: [] });
    ok(/홀드콘 양하 빼기 \d+~\d+개\(전체 86개\)/.test(tot || ''), `번호 없는 답도 합을 범위로 말한다 — ${(tot || '').split('\n')[0].slice(0, 90)}`); }
  // 8-3-D «최소» 는 안 맞는 완료 건수로 조인다 — 예약 자리뿐인 선적(KBTR·KKLC 류)에서 첫 완료 한 건 뒤부터 계속 «0~N» 이면 쓸모가 없다(감사 2차).
  //   XTPG 543E 선적 홀드 19곳을 전부 예약 자리(__SLOT_)로 바꾸고 실번호 완료를 n건 둔다 — 한 건은 한 자리만 채울 수 있으므로 (19-n)~19 이다.
  { const mkSlot = (fx, how) => { const f = JSON.parse(JSON.stringify(fx)); const conv = (r) => Object.assign({}, r, { cn: how(r) }); f.sRows = f.sRows.map(conv); f.sAll = f.sAll.map(conv); return f; };
    const fxS = mkSlot(XT, (r) => `__SLOT_${r.bay}_${r.row}_${r.tier}`);
    const realKeys = (n) => Array.from({ length: n }, (_, i) => 'TEST' + String(1000000 + i));
    const head = async (fx, n) => { const c = mk(fx, { compL: realKeys(n) }); const R = await c.__rest(); return { R, ans: E.coneAnswer('홀드콘 몇개 남았어', { rows: c.window.__coneQA.rows, restRows: R, dischRows: [], stowRows: [] }) || '' }; };
    for (const [n, lo] of [[1, 18], [5, 14], [19, 0], [40, 0]]) {
      const { R, ans } = await head(fxS, n); const tot = sumTot(R, 'load');
      ok(tot === 19 && new RegExp(`선적 꽂기 ${lo}~19개\\(전체 19개\\)`).test(ans), `예약 자리뿐인 선적에서 실번호 완료 ${n}건 → ${lo}~19 — ${ans.split('\n')[0].slice(0, 80)}`);
      ok((R || []).every(x => !x.lo || ['deck', 'ele', 'hold'].every(k => x.lo[k].dis <= x.rest[k].dis && x.lo[k].load <= x.rest[k].load && x.lo[k].load >= 0)), `완료 ${n}건: 줄마다 최소 ≤ 최대, 최소 ≥ 0`);
    }
    const none = await head(fxS, 0); ok(sumRest(none.R, 'load') === 19 && !/~/.test(none.ans) && !/예약 자리/.test(none.ans), `안 맞는 완료가 없으면 범위 없이 19/19 — ${none.ans.split('\n')[0].slice(0, 60)}`);
    //  베이 지정 답도 같은 한도 — 한 건이면 그 베이에서 최대 1개만 줄었다(최소 = 최대-1)
    { const c = mk(fxS, { compL: realKeys(1) }); const R = await c.__rest(); const r = (R || []).find(x => x.rest.hold.load > 1);
      ok(!!r && r.lo && r.lo.hold.load === r.rest.hold.load - 1, `베이 지정 답: 완료 1건이면 최소 = 최대-1 (${r && r.bay} ${r && r.lo && r.lo.hold.load}~${r && r.rest.hold.load})`); }
    //  컨번호가 빈 자리(ASC PRE 류)도 예약 자리다 — 실번호 완료가 있으면 «정확한 수» 로 단정하지 않는다
    const fxE = mkSlot(XT, () => '');
    const ee = await head(fxE, 3); ok(sumRest(ee.R, 'load') === 19 && /선적 꽂기 16~19개\(전체 19개\)/.test(ee.ans) && /예약 자리/.test(ee.ans), `컨번호가 빈 자리 + 실번호 완료 3건 → 16~19 (정확한 수로 단정 안 함) — ${ee.ans.split('\n')[0].slice(0, 70)}`);
    const e0 = await head(fxE, 0); ok(/선적 꽂기 19개\(전체 19개/.test(e0.ans) && !/~/.test(e0.ans), '컨번호가 빈 자리여도 안 맞는 완료가 없으면 범위 없이 19'); }
  // 8-3-E 말 — 시간 낱말은 콘 개수 질문이 아니다(null 로 넘겨 예상 완료 답이 받는다) · 단위어가 붙은 «베이 N곳» 은 베이 번호가 아니다
  for (const q of ['24번 홀드 콘 언제 끝나', '24번 홀드 콘 몇 시에 끝나', '24번 홀드 콘 남은 시간', '5번 베이 콘 언제 끝나', '24번 홀드 콘 작업 속도']) ok(E.coneAnswer(q, P) === null, `«${q}» → null (시간 답으로)`);
  for (const q of ['남은 베이 3곳', '남은 베이 2개 알려줘', '베이 5개 남았어', '베이 1대 남았어']) ok(!/^베이 \d/.test(A(q, P)), `«${q}» 는 단위어라 베이 번호로 읽지 않는다 — ${A(q, P).slice(0, 40)}`);
  ok(/^베이 23-25\. .*홀드콘 양하 빼기 0개 남음/.test(A('베이 24에서 콘 몇개 남았어', P)) && /^베이 23-25\. 홀드콘 양하 빼기 0개 남음/.test(A('베이 24는 홀드콘 몇개 남았어', P)), '«베이 24에서/는» 는 그대로 베이 번호');
  // 8-4 성질 — 23-25 홀드 컨을 하나씩 미완으로 돌리면 남은 수는 늘기만 하고 전체를 넘지 않는다. 전부 미완이면 전체와 같다
  { const hr = PC.dRows.filter(r => { const b = parseInt(r.bay, 10); return b >= 23 && b <= 25 && parseInt(r.tier, 10) < 80; });
    const undo = (n) => { const s = new Set(hr.slice(0, n).map(r => r.cn)); return PC.compD.filter(k => !s.has(k)); };
    let prev = 0, mono = true, inRange = true;
    for (const n of [0, 5, 10, 20, hr.length]) { const R = await mk(PC, { compD: undo(n) }).__rest(); const v = hold(R, '23-25', 'dis'); if (v < prev) mono = false; if (v > 14) inRange = false; prev = v; }
    ok(mono && inRange, `미완을 늘릴수록 남은 수가 줄지 않는다(0→${prev}) 14 를 넘지 않는다`);
    ok(prev === 14, `홀드 컨 ${hr.length}대를 전부 미완으로 두면 14/14 — ${prev}`);
    const Rh = await mk(PC, { compD: undo(Math.floor(hr.length / 2)) }).__rest(); const v = hold(Rh, '23-25', 'dis');
    ok(v > 0 && v < 14, `절반만 끝내면 0 도 14 도 아니다 — ${v}`); }
  // 8-5 XTPG 543E 선적 — 아직 아무것도 안 했다: 꽂을 콘 전체가 남음. 일부 끝내면 줄어든다
  { const R = await mk(XT).__rest();
    ok(R && sumRest(R, 'load') === 19 && sumTot(R, 'load') === 19, `XTPG 선적 홀드 꽂기 19/19 — ${R && sumRest(R, 'load')}/${R && sumTot(R, 'load')}`);
    const some = XT.sRows.filter(r => parseInt(r.tier, 10) < 80).slice(0, 40).map(r => r.cn);
    const R2 = await mk(XT, { compL: some }).__rest();
    ok(R2 && sumRest(R2, 'load') < 19 && sumRest(R2, 'load') >= 0, `선적 40대를 끝내면 꽂기가 줄어든다 — ${R2 && sumRest(R2, 'load')}`); }
  // 8-6 양하 분리 작업 배 — 계획 표처럼 양하 콘을 0 으로 본다
  { const N = await mk(XT).__rest(); const R = await mk(XT, { sepDis: true }).__rest();
    ok(N && sumAny(N, 'tot', 'dis') > 0, `(대조) 분리 아닌 XTPG 는 양하 콘이 있다 — ${N && sumAny(N, 'tot', 'dis')}`);
    ok(R && sumAny(R, 'rest', 'dis') === 0 && sumAny(R, 'tot', 'dis') === 0 && sumRest(R, 'load') === 19, `분리 작업(양하 반납 끝) 배는 양하 쪽 남은 콘을 0 으로, 선적은 그대로 — 양하 ${R && sumAny(R, 'rest', 'dis')}/${R && sumAny(R, 'tot', 'dis')} · 선적 홀드 ${R && sumRest(R, 'load')}`);
    ok((await mk(PC, { sepDis: true }).__rest()) === null, '표에 행이 하나도 없으면(양하만 있고 분리 처리됨) 지어내지 않고 null'); }
  // 8-7 못 읽었으면 센 척하지 않는다 — null
  for (const [nm, o] of [['정보(info) 없음', { mc: { compD: {}, compL: {}, compOk: { D: true, L: true } } }], ['양하 기록 못 읽음', { mc: { info: {}, compD: {}, compL: {}, compOk: { D: false, L: true } } }],
    ['선적 기록 못 읽음', { mc: { info: {}, compD: {}, compL: {}, compOk: { D: true, L: false } } }], ['읽기 결과 자체가 없음', { mc: null }], ['compOk 없음', { mc: { info: {}, compD: {}, compL: {} } }]]) {
    const R = await mk(PC, o).__rest(); ok(R === null, `완료 기록 ${nm} → null(0 으로 지어내지 않는다)`); }
  // 8-8 받는 사이 상태가 바뀌면 null — 배·선종·자료·설정이 계산 때와 같을 때만 센다
  for (const [nm, f] of [
    ['배를 바꿈', c => { c.state.voyageKey = 'XTPG_543E'; }],
    ['선종을 바꿈', c => { c.state.shipType = 'ro-ro'; }],
    ['다중 설정을 바꿈', c => { c.state.multiCount = 2; }],
    ['양하 자료를 다시 올림', c => { c.state.disch = Object.assign({}, c.state.disch); }],
    ['선적 자료를 다시 올림', c => { c.state.stow = Object.assign({}, c.state.stow); }],
    ['양하 행이 늘어남', c => { c.state.disch.ediRows.push({ cn: 'ZZZU0000000', bay: '24', row: '01', tier: '02', size: '20' }); }],
    ['표를 다시 그림(새 배열)', c => { c.window.__coneQA = { rows: c.window.__coneQA.rows.slice(), key: c.state.voyageKey }; }],
    ['표가 지워짐', c => { c.window.__coneQA = null; }],
    ['계획이 지워짐', c => { c.state._conePlan = null; }],
  ]) {
    const fx = JSON.parse(JSON.stringify(PC)); const c = mk(fx); c.__load = f; const R = await c.__rest(); ok(R === null, `받는 사이 «${nm}» → null`); }
  // 8-9 받기 전에 이미 어긋난 상태 — 표가 다른 배 것이면 null
  { const c = mk(PC); c.window.__coneQA.key = 'XTPG_543E'; ok((await c.__rest()) === null, '표가 다른 배 것이면(배 표식 불일치) null'); }
  { const c = mk(PC); c.state._conePlan.key = 'XTPG_543E'; ok((await c.__rest()) === null, '계획이 다른 배 것이면 null'); }
  // 8-10 표 이름·순서가 계획과 다르면 지어내지 않는다
  { const c = mk(PC); c.window.__coneQA.rows[0] = Object.assign({}, c.window.__coneQA.rows[0], { bay: '99' }); ok((await c.__rest()) === null, '계획 표 행 이름이 다르면 null'); }
  { const c = mk(PC); c.window.__coneQA.rows.pop(); ok((await c.__rest()) === null, '계획 표 행 수가 다르면 null'); }
  // ⑨ 미르 창구 — 콘앱이 부르는 순서(askMir → answerOneRaw)로 돌린다. «몇개»·«콘이» 는 미르 사전에 없는 낱말이라 규칙 답이 «약한 답» 으로 보이면
  //    모델이 질문을 고쳐 써(콘 낱말을 떼고) 컨테이너 대수 답으로 덮어쓴다 — 실측(2.64-01 헤드리스): «1번·2번·16번 홀드 콘 몇개 남았어» 가 «남은 작업 16대» 로 나갔다.
  console.log('⑨ 미르 창구 — 약한 답으로 새지 않는다');
  const mkM = (restRows) => ({ app: 'cone', containers: [], accepted: true, mode: 'discharge', modeLabel: '양하', voyageKey: 'PCSZ_2631E', vsl: 'PCSZ', info: { vsl: 'PCSZ' }, voyage: { info: { vsl: 'PCSZ' } }, inspector: '연막',
    cone: { rows: FX.pcsz.rows, restRows, dischRows: [], stowRows: [] } });
  const askM = async (q, restRows) => { const ctx = mkM(restRows); FETCHES.length = 0; const r = await E.askMir(q, ctx, (cq, trace) => E.answerOneRaw(cq, Object.assign({}, ctx, { _trace: trace })), { who: '연막' }); return { r, f: FETCHES.length }; };
  for (const [q, re] of [['24번 홀드에 콘이 몇개 남았어', /^베이 23-25\. 홀드콘 양하 빼기 0개 남음\(전체 14개 모두 끝\)/], ['1번 홀드에 콘이 몇개 남았어', /^베이 01-03\. 홀드콘 양하 빼기 6개 남음/],
    ['2번 홀드 콘 몇개 남았어', /^베이 01-03\. 홀드콘 양하 빼기 6개 남음/], ['16번 홀드에 콘이 몇개 남았어', /^베이 15-17\. 홀드콘 양하 빼기 4개 남음/], ['홀드콘 몇개 남았어', /^남은 콘\(완료 기록 기준\)/],
    ['홀드콘 남았어?', /^남은 콘\(완료 기록 기준\)/], ['1번 홀드 콘 잔량', /^베이 01-03\. 홀드콘 양하 빼기 6개 남음/], ['24번 홀드 콘 남음?', /^베이 23-25\. 홀드콘 양하 빼기 0개 남음/], ['코끼리콘 남았어', /^남은 콘\(완료 기록 기준\) — 코끼리콘/]]) {
    const { r, f } = await askM(q, FX.pcsz.restRows);
    ok(r && re.test(r.text || '') && r.weak === false && r.via === 'rules' && f === 0, `«${q}» → 자료 답 그대로(약하지 않음·모델/네트워크 안 감) — ${(r && r.text || '').split('\n')[0].slice(0, 50)} · weak=${r && r.weak} · 네트워크 ${f}회`);
  }
  { const { r, f } = await askM('2번 홀드 콘 몇개 남았어', undefined);
    ok(r && /못 읽어서/.test(r.text || '') && r.weak === false && f === 0, `완료 기록을 못 읽은 때의 정직한 답도 모델로 안 보낸다 — ${(r && r.text || '').slice(0, 40)}`); }
  //  다른 말은 종전 그대로 — «콘 몇 개 남았어» 가 아닌 컨테이너 진행 질문은 콘 답이 가로채지 않는다
  { const { r } = await askM('2번 홀드 컨테이너 몇 대 남았어', FX.pcsz.restRows); ok(!/홀드콘 양하 빼기/.test((r && r.text) || ''), '«컨테이너 몇 대 남았어» 는 콘 남은 답으로 안 간다'); }
  ok(E.isWeakAnswer('2번 홀드 콘 몇개 남았어', '아무 답', { via: 'coneRest' }) === false, 'isWeakAnswer: via=coneRest 는 약하지 않다');
  ok(E.isWeakAnswer('2번 홀드 콘 몇개 남았어', '아무 답', { via: 'x' }) === true, '(대조) via 표시가 없으면 «몇개» 가 모르는 낱말이라 약하다 — 이 표시가 없으면 새는 것을 보인다');
  console.log(fail ? `\n✗ ${fail}건 실패` : '\n✓ 전부 통과');
  process.exit(fail ? 1 : 0);
})();
