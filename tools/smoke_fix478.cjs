// 4.78 연막검사 — ① 갈림 칩·양하 순서 조건 «트윈부터/싱글부터»(TW·SG) 판정과 물리 종속 ② 보류 기록 보관(hold_event) 쓰기와 소비처 ③ 미르 배 코드는 대문자만
//   검수사 2026-11-07 KKLC 2610N 마지막 데크 «트윈으로 내려야 하는데 트윈으로 갈 방법이 없었습니다. 그래서 보류 내용에 트윈모드라고 하고 보류 시키니 트윈모드가 켜졌습니다.»
//   실자료 tools/fixtures/kklc2610n_lastdeck.json = 보관소 archive/KKLC_2610N 읽기 사본(GET 만 — 쓰기 없음). 실소스 번들 둘 — 순서·미르 한 벌(OUT) · 실소스 firebase.js 메모리 RTDB(FB).
//   실행 — node tools/smoke_fix478.cjs <번들 OUT.cjs> <루트> <firebase 번들 FB.cjs>
process.env.TZ = 'Asia/Seoul';
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2], ROOT = process.argv[3] || process.cwd(), FBB = process.argv[4];
if (!OUT || !FBB) { console.error('✗ 번들 경로가 없다'); process.exit(1); }

const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/kklc2610n_lastdeck.json'), 'utf8'));
global.window = { __mirLexicon: {}, __mirLexiconWrite: () => {}, __fbShipBayDict: { KKLC: FX.shipDict }, dispatchEvent: () => true, addEventListener() {}, removeEventListener() {} };
global.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 이미 있음 */ }
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };

const cfg = { aiKey: 'TEST-KEY', model: 'gemini-3.5-flash-lite', dailyCap: 300, enabled: true };
let chatCalls = 0; let todayLog = {};
global.fetch = async (url, opts = {}) => {
  const ok = (j) => ({ ok: true, status: 200, json: async () => j });
  const u = String(url);
  if (u.includes('/mir_config.json')) return ok(cfg);
  if (u.includes('/mir_model_log/') && u.includes('shallow=true')) return ok(todayLog);
  if (u.includes('/mir_model_log/')) { const k = 'k' + Object.keys(todayLog).length; todayLog[k] = true; return ok({ name: k }); }
  if (u.includes('/mir_misses/') || u.includes('/mir_lexicon/')) return ok({});
  if (u.includes('generativelanguage.googleapis.com')) {
    const prompt = JSON.parse(opts.body || '{}').contents[0].parts[0].text;
    const wrap = (t) => ok({ candidates: [{ content: { parts: [{ text: t }] } }], usageMetadata: { promptTokenCount: 1500, candidatesTokenCount: 40 } });
    if (/번역기다/.test(prompt)) return wrap(JSON.stringify({ canonical: '', window: '', confidence: 0 }));
    if (/일 자료\(컨번호·대수·시각·베이·씰·진행\)는 네가 모른다/.test(prompt)) { chatCalls++; return wrap('같이 놀아 드릴게요.'); }
    return wrap('이 배의 호기는 1호기부터 4호기까지 쓰여요.');
  }
  return { ok: false, status: 404, json: async () => null };
};

const M = require(path.resolve(OUT));
const F = require(path.resolve(FBB));
let bad = 0, pass = 0;
const T = (c, why) => { if (c) pass++; else { bad++; console.error('  ✗ ' + why); } };
const has = (a, s) => String(a || '').includes(s);

(async () => {
  // ① 판정 한 벌 — cardMatchesPref TW·SG
  const mk = (cn, bay, row, tier, tp = "20'GP", iso = '2200') => ({ cn, bay, row, tier, tp, iso, fe: 'F', _mode: 'discharge' });
  const twin = { main: mk('A1', '37', '07', '84'), twin: mk('A2', '39', '07', '84') };
  const single = { main: mk('S1', '39', '05', '84'), twin: null };
  const big = { main: mk('B1', '38', '09', '84', "40'HC", '4500'), twin: null };
  const split = { main: mk('P1', '37', '07', '82'), twin: null, bfSplit: true };
  T(M.cardMatchesPref(twin, 'TW') && !M.cardMatchesPref(single, 'TW') && !M.cardMatchesPref(big, 'TW'), 'TW = 짝이 있는 카드만');
  T(M.cardMatchesPref(single, 'SG') && !M.cardMatchesPref(twin, 'SG') && !M.cardMatchesPref(big, 'SG') && !M.cardMatchesPref(split, 'SG'), 'SG = 짝 없는 20피트만(트윈·40피트·«베이 먼저» 로 쪼갠 짝 제외)');
  T(M.cardMatchesPref(single, 'SG') === M.cardMatchesPref(single, '20SINGLE') && M.cardMatchesPref(split, 'SG') === M.cardMatchesPref(split, '20SINGLE'), 'SG 는 기존 20SINGLE 판정과 같은 한 벌');
  T(M.cardMatchesPref(twin, '20') && M.cardMatchesPref(single, '20'), '기존 «20» 칩은 트윈과 싱글을 함께 잡는다(그대로)');

  // ② 양하 순서 조건(workOrder) — 키·라벨·함께 못 거는 짝·미르 문장
  T(M.ORDER_PREF_KEYS.includes('TW') && M.ORDER_PREF_KEYS.includes('SG') && M.ORDER_PREF_LABEL.TW === '트윈' && M.ORDER_PREF_LABEL.SG === '싱글', 'ORDER_PREF_KEYS·LABEL 에 TW·SG');
  T(M.togglePref(['TW'], 'SG').join() === 'SG' && M.togglePref(['SG'], 'TW').join() === 'TW', '트윈↔싱글은 함께 못 건다(새로 누른 쪽)');
  T(M.togglePref(['RF', '20'], 'TW').join() === 'RF,20,TW' && M.togglePref(['RF', 'TW'], 'TW').join() === 'RF', '다른 조건과는 겹쳐 걸고 다시 누르면 푼다');
  T(M.normalizePrefs('RF,TW,XX,SG,TW').join() === 'RF,TW,SG', '저장된 문자열을 읽을 때 새 키를 받고 모르는 키는 버린다');
  const wo = M.workOrderOf({ workOrder: { '1호기': { rowFrom: 'land', prefs: 'SG,20' } } }, '1호기');
  T(wo.prefs.join() === 'SG,20' && /싱글부터 → 20부터/.test(M.workOrderText(wo)), `workOrderText = «${M.workOrderText(wo)}»`);

  // ③ 실데이터 — KKLC 2610N 마지막 데크(B37·B38·B39)를 완료 전으로 되돌려 실소스 buildGuidedQueue
  const E = FX.discharge.ediContainers;
  const last = ['SEKU1370180', 'TEMU0398517', 'BEAU2297940', 'SEKU1384558', 'SEKU5844409', 'KMTU9483037', 'GCXU5888197'];
  const pool = Object.values(E).filter((c) => last.includes(c.cn)).map((c) => ({ ...c, _mode: 'discharge' }));
  T(pool.length === 7, `마지막 데크 컨 7대 — ${pool.length}`);
  const find = M.guideTwinOf((t, all, used) => M.findTwinCandidate(t, all, used, FX.info.imo || '', FX.info.vsl || 'KKLC'));
  const run = (cs, o = {}) => M.buildGuidedQueue(Object.assign({ containers: cs, mode: 'discharge', evenRowsSeaSide: FX.info.berthSide === '우현', findTwin: find }, o));
  const lab = (c) => (c.twin ? `${c.main.bay}+${c.twin.bay}` : c.main.bay) + `-${c.main.row}-${c.main.tier}`;
  const show = (q) => q.map(lab).join(' → ');
  const depBad = (q, dir) => { // 같은 스택에서 양하는 위(높은 티어) 먼저 · 선적은 아래 먼저
    const pos = []; q.forEach((c, i) => [c.main, c.twin].filter(Boolean).forEach((p) => pos.push({ i, bay: parseInt(p.bay, 10), row: p.row, tier: parseInt(p.tier, 10), deck: parseInt(p.tier, 10) >= 80 })));
    let n = 0;
    for (const a of pos) for (const b of pos) { if (a.i === b.i || a.deck !== b.deck) continue; const same = a.row === b.row && (a.bay === b.bay || a.bay % 2 === 0 || b.bay % 2 === 0); if (!same || a.tier === b.tier) continue; const first = dir === 'below' ? (a.tier < b.tier) : (a.tier > b.tier); if (first && a.i > b.i) n++; }
    return n;
  };
  const base = run(pool);
  T(show(base) === '38-09-88 → 38-09-86 → 38-09-84 → 39-07-86 → 37+39-07-84 → 39-05-84', `(가) 기본 순서 — ${show(base)}`);
  const sg = run(pool, { streamPref: 'SG' });
  T(show(sg) === '39-07-86 → 39-05-84 → 38-09-88 → 38-09-86 → 38-09-84 → 37+39-07-84', `(다) SG — 싱글이 앞으로 — ${show(sg)}`);
  T(depBad(base, 'above') === 0 && depBad(sg, 'above') === 0, `기본·SG 모두 위 칸이 아래 칸보다 먼저 — 위반 ${depBad(base, 'above')}·${depBad(sg, 'above')}`);
  // 트윈 37+39-07-84 는 39-07-86 싱글 밑에 깔려 있어 처음엔 못 당긴다 → TW 를 줘도 기본과 같다(물리 종속). 위 싱글을 내린 뒤에는 TW 가 트윈을 앞으로(해상부터일 때 기본은 싱글이 먼저).
  const tw0 = run(pool, { streamPref: 'TW' });
  T(show(tw0) === show(base) && depBad(tw0, 'above') === 0, `(나-1) TW — 위 싱글 밑 트윈은 못 당긴다(물리 종속 유지) — ${show(tw0)}`);
  const two = pool.filter((c) => ['BEAU2297940', 'SEKU1384558', 'TEMU0398517'].includes(c.cn));
  const seaBase = run(two, { rowFrom: 'sea' }), seaTw = run(two, { rowFrom: 'sea', streamPref: 'TW' }), seaSg = run(two, { rowFrom: 'sea', streamPref: 'SG' });
  T(show(seaBase) === '39-05-84 → 37+39-07-84' && show(seaTw) === '37+39-07-84 → 39-05-84' && show(seaSg) === show(seaBase), `(나-2) 해상부터에서 기본은 싱글 먼저 → TW 는 트윈이 앞 — ${show(seaBase)} | ${show(seaTw)} | ${show(seaSg)}`);
  const orderTw = run(two, { rowFrom: 'sea', orderPrefs: ['TW'] }), orderSg = run(two, { orderPrefs: ['SG'] });
  T(show(orderTw) === show(seaTw) && show(orderSg) === '39-05-84 → 37+39-07-84', `양하 순서 창(orderPrefs) TW·SG 도 같은 결과 — ${show(orderTw)} | ${show(orderSg)}`);
  // 칩이 뜨는 때 — 지금 할 수 있는 카드에 트윈과 싱글이 둘 다 있을 때만(화면 forkChips 와 같은 availableCardsOf + cardMatchesPref)
  const chipsOf = (q, dir) => { const av = M.availableCardsOf(q, dir); const tw = av.filter((c) => M.cardMatchesPref(c, 'TW')).length, sgN = av.filter((c) => M.cardMatchesPref(c, 'SG')).length; return tw && sgN ? [tw, sgN] : null; };
  T(chipsOf(base, 'above') === null, '처음(트윈이 싱글 밑에 깔림) — 칩이 안 뜬다');
  const after4 = run(pool.filter((c) => c.cn !== 'SEKU5844409' && c.cn !== 'KMTU9483037' && c.cn !== 'GCXU5888197' && c.cn !== 'SEKU1370180'));
  const c5 = chipsOf(after4, 'above');
  T(c5 && c5.join() === '1,1', `위 싱글까지 내린 뒤 — 칩 «트윈부터 1 · 싱글부터 1» — ${c5}`);

  // ④ 폭넓은 종속 검사 — 보관본 전체(137대)를 베이 그룹·단별로 양하/선적 큐로 만들어 TW·SG 가 종속을 깨지 않는다(기본 위반 0 이 기준)
  const all = Object.values(E).map((c) => ({ ...c, _mode: 'discharge' }));
  const centerOf = (bay) => { const b = parseInt(bay, 10); return b % 2 === 0 ? b : (b % 4 === 1 ? b + 1 : b - 1); };
  const groups = {}; for (const c of all) { const k = `${centerOf(c.bay)}|${parseInt(c.tier, 10) >= 80 ? 'd' : 'h'}`; (groups[k] ||= []).push(c); }
  let nGroups = 0, viol = 0, twinGroups = 0;
  for (const [k, cs] of Object.entries(groups)) {
    for (const [mode, dir] of [['discharge', 'above'], ['loading', 'below']]) {
      const pool2 = cs.map((c) => ({ ...c, _mode: mode }));
      const b0 = M.buildGuidedQueue({ containers: pool2, mode, evenRowsSeaSide: true, findTwin: find, planAll: pool2 });
      if (mode === 'discharge' && b0.some((c) => c.twin)) twinGroups++;
      for (const sp of [null, 'TW', 'SG']) for (const rf of ['land', 'sea']) {
        const q = M.buildGuidedQueue({ containers: pool2, mode, evenRowsSeaSide: true, findTwin: find, streamPref: sp, rowFrom: rf, planAll: pool2 });
        nGroups++;
        const v = depBad(q, dir), v0 = depBad(M.buildGuidedQueue({ containers: pool2, mode, evenRowsSeaSide: true, findTwin: find, streamPref: null, rowFrom: rf, planAll: pool2 }), dir);
        if (v > v0 || q.length !== b0.length) { viol++; console.error(`    그룹 ${k} ${mode} ${sp} ${rf} — 위반 ${v} (기본 ${v0}) · ${q.length}/${b0.length}장`); }
      }
    }
  }
  T(viol === 0 && nGroups >= 60 && twinGroups > 0, `보관본 전체 ${Object.keys(groups).length}무리 × 양하·선적 × TW·SG·없음 × 육상·해상 = ${nGroups}큐 — 종속 위반이 기본보다 늘어난 곳 ${viol} · 카드 수 불변 (트윈 든 양하 무리 ${twinGroups})`);

  // ⑤ 보류 기록 보관 — 실소스 firebase.js(메모리 RTDB)
  const VK = 'KKLC_2610N';
  const mem = () => global.__memdb.voyages[VK];
  global.__memdb = { voyages: { [VK]: { info: { vsl: 'KKLC', voy: '2610N' }, discharge: { ediContainers: {}, completed: {} }, reports: {} } } };
  global.__memlog = [];
  const reps = () => Object.values(mem().reports || {});
  const writes = () => global.__memlog.filter((l) => l.op === 'update' || l.op === 'set').length;
  const warn0 = console.warn; const warned = []; console.warn = (...a) => { warned.push(a.map(String).join(' ')); };
  try {
    await F.fbHoldContainers(VK, 'discharge', ['seku1384558', 'BEAU2297940'], '트윈모드', '김성일', '1호기', 130);
    T(Object.keys(mem().discharge.held).join() === 'SEKU1384558,BEAU2297940' || Object.keys(mem().discharge.held).sort().join() === 'BEAU2297940,SEKU1384558', '보류 노드는 종전대로 컨마다 적힌다');
    let r = reps();
    T(r.length === 1 && writes() === 1, `보류 한 번 = 쓰기 한 번(보류 노드와 기록이 같은 update) — 보고 ${r.length}건·쓰기 ${writes()}번`);
    const h = r[0] || {};
    T(h.type === 'hold_event' && h.action === 'hold' && h.cns.join() === 'SEKU1384558,BEAU2297940' && h.reason === '트윈모드' && h.by === '김성일' && h.equip === '1호기' && h.mode === 'discharge' && h.voyage === VK && Number.isFinite(h.ts) && Object.keys(mem().reports).join() === String(h.ts),
      `hold_event 필드 — ${JSON.stringify(h).slice(0, 220)}`);
    T(!/work_status/.test(h.type) && !/_(pause|start|resume|done)$/.test(h.action) && !('bays' in h) && has(h.message, '보류 2대') && has(h.message, '트윈모드') && has(h.message, '김성일'), '작업 상태 꼴(work_status·*_pause)을 피하고 읽기 쉬운 한 줄(message)이 있다');
    const heldAt = mem().discharge.held.SEKU1384558.at;
    await F.fbReleaseHold(VK, 'discharge', ['SEKU1384558', 'BEAU2297940'], '박진우', '2호기');
    r = reps().sort((a, b) => a.ts - b.ts);
    const rel = r[1] || {};
    T(r.length === 2 && Object.keys(mem().discharge.held || {}).length === 0 && rel.type === 'hold_event' && rel.action === 'release' && rel.reason === '트윈모드' && rel.heldBy === '김성일' && rel.heldAt === heldAt && rel.by === '박진우' && rel.equip === '2호기' && rel.ts > h.ts && writes() === 2,
      `해제 기록 — 푼 사람·풀리는 보류의 사유·건 사람·건 시각 — ${JSON.stringify(rel).slice(0, 240)}`);
    // 읽기가 막혀도 해제는 된다 — 경고만 남는다
    await F.fbHoldContainers(VK, 'discharge', ['TEMU0398517'], '콘 잠김', '김성일', '1호기', 131);
    global.__memfail = (p) => /held\//.test(p); warned.length = 0;
    await F.fbReleaseHold(VK, 'discharge', ['TEMU0398517'], '김성일', '1호기');
    global.__memfail = null;
    const r3 = reps().sort((a, b) => a.ts - b.ts);
    T(Object.keys(mem().discharge.held || {}).length === 0 && r3.length === 4 && r3[3].action === 'release' && r3[3].reason === '' && warned.some((w) => /사유를 읽지 못했습니다/.test(w)), `사유를 읽지 못해도 해제는 되고 기록(사유 빈칸)과 경고가 남는다 — 보고 ${r3.length}건 · 경고 ${warned.length}`);
    // 같은 밀리초에 연달아 걸어도 키가 겹치지 않는다
    const n0 = reps().length;
    await Promise.all([F.fbHoldContainers(VK, 'loading', ['X1'], 'a', '김성일'), F.fbHoldContainers(VK, 'loading', ['X2'], 'b', '김성일')]);
    T(reps().length === n0 + 2, '같은 밀리초 두 보류 — 기록 키가 겹치지 않는다');
    // 선적 모드·호기 없음도 쓴다
    const lastLoad = reps().filter((x) => x.mode === 'loading').pop();
    T(lastLoad && lastLoad.equip === '' && has(lastLoad.message, '선적 보류'), '선적 보류 기록 — 호기 없음 빈칸 · 문구 «선적 보류»');
  } finally { console.warn = warn0; }

  // ⑥ 소비처 — hold_event 를 작업 중단·타임시트·호기 보고 판·고치기로 읽지 않는다
  const now = Date.parse('2026-11-08T10:00:00+09:00');
  const holdRep = { type: 'hold_event', action: 'hold', cns: ['SEKU1384558'], reason: '트윈모드', by: '김성일', equip: '1호기', mode: 'discharge', voyage: VK, ts: now - 60000, message: '양하 보류 1대' };
  const workRep = { type: 'work_status', action: 'discharge_resume', equip: '1호기', mode: 'discharge', by: '김성일', ts: now - 3600000, message: '재개' };
  const v0 = { info: { vsl: 'KKLC', voy: '2610N', pier: 'PNCT' }, reports: { [workRep.ts]: workRep } };
  const v1 = { info: v0.info, reports: { [workRep.ts]: workRep, [holdRep.ts]: holdRep } };
  T(M.workPauseOf(v0, now) === null && M.workPauseOf(v1, now) === null, '보류 기록이 «작업 중단 중» 을 만들지 않는다(미르 workPauseOf)');
  const pz = { type: 'work_status', action: 'discharge_pause', equip: '1호기', mode: 'discharge', reason: '장비 고장', by: '김성일', ts: now - 1800000 };
  const v2 = { info: v0.info, reports: { [workRep.ts]: workRep, [pz.ts]: pz, [holdRep.ts]: holdRep } };
  const p2 = M.workPauseOf(v2, now);
  T(p2 && p2.reason === '장비 고장', `중단 보고 뒤에 보류 기록이 와도 중단 사유가 그대로 — ${p2 && p2.reason}`);
  //  열린 해치 + 양하 완료 → 마감 텔리가 «완료 = 커버 닫힘» 줄을 만든다(자리는 마지막 보고 시각 뒤). 뒤늦은 보류 기록이 그 시각을 끌고 가면 안 된다.
  const hatchOpen = { type: 'hatch', action: 'open', bays: ['14'], equip: '1호기', mode: 'discharge', by: '김성일', ts: now - 7200000 };
  const doneRep = { type: 'work_status', action: 'discharge_done', equip: '1호기', mode: 'discharge', by: '김성일', ts: now - 3000000 };
  const tsRows = (reports) => M.buildTimeSheet(reports, { doneModes: ['discharge'], groupOf: (b) => parseInt(b, 10) });
  const tA = JSON.stringify(tsRows({ a: hatchOpen, b: doneRep })), tB = JSON.stringify(tsRows({ a: hatchOpen, b: doneRep, c: holdRep }));
  T(tA === tB && /inferred/.test(tA), '타임시트(마감 텔리)가 보류 기록 때문에 달라지지 않는다(추정 줄 시각 포함)');
  const bA = M.equipReportBoard([workRep], { [VK]: v0 }, 0), bB = M.equipReportBoard([workRep, { ...holdRep, voyageKey: VK }], { [VK]: v0 }, 0);
  T(bA.total === 1 && bB.total === 1, `수석 호기 보고 판의 건수가 그대로 — ${bA.total}·${bB.total}`);
  T(M.canEditReport({ type: 'work_status', by: '김성일' }, '김성일') === true && M.canEditReport(holdRep, '김성일') === false, '내가 보낸 보고 고치기·지우기에서 보류 기록은 비켜 간다(보관용) · 다른 보고는 그대로');
  // 소스에 박힌 비켜 가기(마감 점검의 호기 근거·수석 최근 보고·마지막 보고)
  const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  T(/type === 'hold_event'\) return;/.test(rd('src/components/WorkClosingChecklist.jsx')), '마감 점검 — 호기가 일했다는 근거에서 보류 기록 제외');
  T(/r\.type !== 'hold_event'/.test(rd('src/pages/ChiefDashboard.jsx')) && /r\.type === 'hold_event'\) return/.test(rd('src/pages/ChiefDashboard.jsx')), '수석 최근 작업 보고(삭제 단추 있는 목록)·항차별 마지막 보고에서 제외');
  T(/hold_event:'보류 기록'/.test(rd('src/pages/VoyagePage.jsx')), '항차 작업 보고 이력 목록에는 «보류 기록» 으로 보인다');
  T(/fbReleaseHold\(voyageKey, mode, cns, inspector, equip\)/.test(rd('src/components/GuidedWorkPanel.jsx')), '해제 단추가 푼 사람·호기를 함께 넘긴다');

  // ⑦ 미르 — 배 코드는 원문이 전부 대문자인 것만(소문자 영어 낱말 ball ≠ 베이사전 코드 BALL)
  const v00 = { info: { vsl: 'DJCT', voy: '2610N' } };
  const mkv = (vsl) => ({ info: { vsl, voy: '2610N' } });
  const voyages = { DJCT_2610N: v00, MCSC_2610N: mkv('MCSC'), BALL_2610N: mkv('BALL') };
  const ctx = { app: 'tally', voyageKey: 'DJCT_2610N', voyage: v00, info: v00.info, containers: [], mode: 'discharge', inspector: '김성일', isChief: true, portMisData: {}, voyages };
  const rules = (c) => (cq, trace) => M.answerOneRaw(cq, Object.assign({}, c, { _trace: trace || {} }));
  for (const code of ['DJCT', 'MCSC', 'BALL']) {
    chatCalls = 0;
    const r = await M.askMir(code + ' 장비 번호가 뭐야', ctx, rules(ctx), { who: '김성일' });
    T(chatCalls === 0 && r.via !== 'chat', `«${code} 장비 번호가 뭐야» (대문자) 는 여전히 일 질문 — via=${r.via} chat=${chatCalls}`);
  }
  //  소문자 낱말 ball 은 베이사전 코드 BALL 과 글자가 같아 종전엔 배 코드로 잡혀 생활회화로 못 갔다(4.77-01 독립 감사 «play ball with me»).
  chatCalls = 0;
  const rb = await M.askMir('ball 장비 번호가 뭐야', ctx, rules(ctx), { who: '김성일' });
  T(chatCalls >= 1 && rb.via === 'chat', `«ball 장비 번호가 뭐야» (소문자 낱말) 는 배 코드로 안 잡혀 생활회화로 간다 — via=${rb.via} chat=${chatCalls}`);

  if (bad) { console.error(`✗ 4.78 연막검사 ${bad}건 실패 (통과 ${pass})`); process.exit(1); }
  console.log(`✓ 4.78 연막검사 통과 ${pass}`); process.exit(0);
})().catch((e) => { console.error('시험 자체가 죽었다:', e); process.exit(1); });
