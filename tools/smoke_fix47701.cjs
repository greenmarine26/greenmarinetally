// 4.77-01 연막검사 — ① 미르 말투 «쌓여요» ② 배 코드가 든 설명형 질문은 생활회화로 가지 않는다(검수앱·콘앱 같은 번들) ③ 속도·예상 시각 숫자 한 벌(뒤에 이어 붙인다)
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }

global.window = { __mirLexicon: {}, __mirLexiconWrite: () => {}, __fbShipBayDict: {}, dispatchEvent: () => true, addEventListener() {}, removeEventListener() {} };
global.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };

const cfg = { aiKey: 'TEST-KEY', model: 'gemini-3.5-flash-lite', dailyCap: 300, enabled: true };
let chatCalls = 0, dataCalls = 0; let todayLog = {};
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
    if (/일 자료\(컨번호·대수·시각·베이·씰·진행\)는 네가 모른다/.test(prompt)) { chatCalls++; return wrap('배 이름이 아니라 터미널 이름 같아요.'); }
    dataCalls++; return wrap('이 배의 호기는 1호기부터 4호기까지 쓰여요.');
  }
  return { ok: false, status: 404, json: async () => null };
};

const M = require(path.resolve(OUT));
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mirone_live_260910.json'), 'utf8'));
let bad = 0; const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };
const has = (a, s) => String(a || '').includes(s);

(async () => {
  // ① 말투 — «이» 풀이말 입니다 가 «이에요» 로 틀리지 않는다
  const tone = M.mirTone;
  T(has(tone('이미 찍은 것은 안 따라옵니다. 그때부터 새 갱으로 쌓입니다.'), '쌓여요') && !has(tone('그때부터 쌓입니다.'), '쌓이에요'), '«쌓입니다» → «쌓여요»');
  T(has(tone('화면에 보입니다.'), '보여요') && !has(tone('화면에 보입니다.'), '보이에요'), '«보입니다» → «보여요»');
  T(has(tone('마감 서류가 같이 움직입니다.'), '움직여요') && !has(tone('같이 움직입니다.'), '움직이에요'), '«움직입니다» → «움직여요»');
  T(has(tone('353대입니다.'), '353대예요'), '«353대입니다» 는 그대로 «353대예요»');
  T(has(tone('초보입니다.'), '초보예요'), '«초보입니다» 는 «초보예요»(보 로 끝나는 이름씨)');

  // ② 배 코드가 든 설명형 질문 — 생활회화(chat)로 가지 않는다
  const v0 = FX.KBTR_2606E;
  const mk = (vsl) => ({ info: { vsl, voy: '2610N' } });
  const voyages = { KBTR_2606E: v0, DJCT_2610N: mk('DJCT'), MCSC_2610N: mk('MCSC') };
  const ctx = { app: 'tally', voyageKey: 'KBTR_2606E', voyage: v0, info: v0.info, containers: [], mode: 'discharge', inspector: '김성일', isChief: true, portMisData: {}, voyages };
  const rules = (c) => (cq, trace) => M.answerOneRaw(cq, Object.assign({}, c, { _trace: trace || {} }));
  for (const code of ['DJCT', 'MCSC']) {
    chatCalls = 0;
    const r = await M.askMir(code + ' 장비 번호가 뭐야', ctx, rules(ctx), { who: '김성일' });
    T(chatCalls === 0 && r.via !== 'chat' && !has(r.text, '터미널 이름') && !has(r.text, '확실히 모르'), `«${code} 장비 번호가 뭐야» 가 생활회화로 가지 않는다 — via=${r.via} chat=${chatCalls} · ${String(r.text).slice(0, 60)}`);
  }
  // 콘앱 ctx(voyages 없이 shipCodes 만)도 같은 답
  for (const code of ['DJCT', 'MCSC']) {
    chatCalls = 0;
    const cctx = Object.assign({}, ctx, { app: 'cone', voyages: undefined, shipCodes: ['KBTR', 'DJCT', 'MCSC'] });
    const rc = await M.askMir(code + ' 장비 번호가 뭐야', cctx, rules(cctx), { who: '김성일' });
    T(chatCalls === 0 && rc.via !== 'chat', `콘앱 ctx 에서도 «${code} 장비 번호가 뭐야» 가 생활회화로 가지 않는다 — via=${rc.via}`);
  }
  // 대조 — 배 코드가 없는 순수 잡담은 그대로 생활회화
  chatCalls = 0;
  const r2 = await M.askMir('오늘 날씨 어때 장비', Object.assign({}, ctx), rules(ctx), { who: '김성일' });
  T(r2 && true, '대조 호출이 죽지 않는다');

  // ③ 같은 시각·같은 자료면 어느 질문·어느 앱이든 갱 수·갱당 속도·창 분이 한 글자도 안 다르다 (KKLC 2610N 지난밤 실기록)
  const KK = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/kklc_2610n_476.json'), 'utf8'));
  const KST = (x) => new Date(`${x}:00+09:00`).getTime();
  const cutAt = (t) => { const v = JSON.parse(JSON.stringify(KK)); for (const m of ['discharge', 'loading']) { const c = v[m].completed; for (const k of Object.keys(c)) if (!(c[k].at <= t)) delete c[k]; } for (const k of Object.keys(v.reports)) { const r = v.reports[k]; if ((Number(r.ts) || Number(k)) > t) delete v.reports[k]; } return v; };
  const ctxAt = (t, app) => { const v = cutAt(t); const cs = []; for (const m of ['discharge', 'loading']) for (const k of Object.keys(KK[m].completed)) { const w = v[m].completed[k]; cs.push({ cn: k, _mode: m, mode: m, size: '40', pol: m === 'discharge' ? 'XXXXX' : 'KRPTK', pod: m === 'discharge' ? 'KRPTK' : 'XXXXX', ...(w ? { _comp: w, comp: w } : {}) }); }
    return { app, voyageKey: 'KKLC_2610N', voyage: v, info: v.info, containers: cs, mode: 'discharge', inspector: '김성일', isChief: true, portMisData: {} }; };
  const realNow = Date.now;
  const lineOf = (a) => { const t = String(a); return { gang: (t.match(/갱당 시간당 ([\d.]+)대/) || [])[1] || '', win: (t.match(/최근 실작업 (\d+)분/) || [])[1] || '', n: (t.match(/(\d+)갱\(/) || [])[1] || '' }; };
  const QS = ['이 배 몇 시에 끝나', '시간당 몇 대', '작업 속도'];
  for (const at of ['2026-11-07T22:57', '2026-11-08T00:30', '2026-11-08T03:55']) {
    const t = KST(at);
    try {
      Date.now = () => t;
      const R = M.recentPaceOf(cutAt(t), t);
      T(!!R, `${at} — 최근 속도를 잰다`);
      if (!R) continue;
      const want = { gang: R.perGangHour.toFixed(1), win: String(R.windowMin), n: String(R.gangs) };
      for (const app of ['tally', 'cone']) {
        for (const q of QS) {
          const a = M.answerOneRaw(q, Object.assign({}, ctxAt(t, app), { _trace: {} })); const g = lineOf(a);
          T(g.gang === want.gang && g.win === want.win && g.n === want.n, `${at} ${app} «${q}» — 갱 ${g.n}·갱당 ${g.gang}·${g.win}분 (기대 ${want.n}·${want.gang}·${want.win}분)`);
        }
      }
      const vv = cutAt(t); const sp = M.speedFromRecords(vv); const st = M.paceNowOf(M.voyageDoneAts(vv), vv.info, vv);
      T(sp && sp.perGangHour === R.perGangHour && sp.gangs === R.gangs, `${at} speedFromRecords 가 같은 갱 수·속도`);
      T(st && st.ok && st.perGangHour === R.perGangHour && st.recent && st.recent.windowMin === R.windowMin, `${at} 통계탭 호출(paceNowOf)이 같은 갱당 속도·창 분`);
      const sh = M.answerShipSpeed(vv, null, 'KKLC', null); const gs = lineOf(sh);
      T(!sh || gs.gang === '' || gs.gang === want.gang, `${at} answerShipSpeed 가 같은 갱당 속도 — ${gs.gang}`);
      // 같은 분 안(+25초)에 다시 물어도 같다
      Date.now = () => t + 25000;
      const a2 = M.answerOneRaw('이 배 몇 시에 끝나', Object.assign({}, ctxAt(t, 'tally'), { _trace: {} })); const g2 = lineOf(a2);
      T(g2.gang === want.gang && g2.win === want.win, `${at} 25초 뒤에도 같은 수 — ${g2.gang}·${g2.win}분`);
      T(/쉬는 시간 뺀 시간/.test(M.recentPaceLine(R)) && !/쉬는 시간 포함/.test(M.recentPaceLine(R)), `${at} 근거 줄의 창이 «쉬는 시간 뺀 시간» 으로 적힌다`);
    } finally { Date.now = realNow; }
  }

  //  ③ (아래에 숫자 한 벌 검사를 잇는다)
  if (bad) { console.error(`✗ 4.77-01 연막검사 ${bad}건 실패`); process.exit(1); }
  console.log('✓ 4.77-01 연막검사 통과'); process.exit(0);
})().catch((e) => { console.error('✗ 연막검사 예외', e); process.exit(1); });
