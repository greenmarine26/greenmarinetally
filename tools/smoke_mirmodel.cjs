// 미르 모델 창구 연막검사 (3.42 판 B) — 실소스 번들(mirCore.entry → mirModel·mirAnswer)에 실데이터(KBTR 2606E)를 물리고, 모델·보관소는 fetch 스텁으로 흉내 내 «언제 부르고 무엇을 막는가»를 잰다.
//   검수사 확정 2026-09-10 «어떤질문이 들어 올지는 저도 모릅니다. 제가 원하는건 그질문들에 적당한 답을 해주길 원합니다» — 규칙이 약할 때만 모델, 답 속 숫자가 자료에 없으면 버린다.
//   ⚠ 모델 응답은 스텁(관문 4 실호출 결과에서 베낀 JSON)이다 — 모델 품질이 아니라 **배선·문지기**를 잰다. 진짜 모델 품질은 관문 4 시뮬(sim/simB_model.mjs)이 쟀다.
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }

global.window = { __mirLexicon: {}, __mirLexiconWrite: (k, e) => { calls.lexicon.push({ k, e }); }, __fbShipBayDict: {}, dispatchEvent: (ev) => { calls.events.push(ev); return true; }, addEventListener: () => {} };
global.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
global.AbortController = global.AbortController || class { constructor() { this.signal = {}; } abort() {} };

const calls = { fetch: [], lexicon: [], events: [] };
let cfg = { aiKey: 'TEST-KEY', model: 'gemini-3.5-flash-lite', dailyCap: 300, enabled: true };
let todayLog = {};
//  모델 스텁 — 프롬프트를 보고 «번역»인지 «자료 답»인지 갈라 관문 4 실호출과 같은 모양으로 답한다
const TRANSLATE = {
  '스무 피트짜리 몇 대': { canonical: '20피트 몇 대', window: '대수', confidence: 1 },
  '배 어느 쪽으로 붙었어': { canonical: '접안 현측', window: '항차 사실', confidence: 1 },
  '오늘 몇 시부터 했어': { canonical: '작업 몇 시에 시작했어', window: '항차 사실', confidence: 0.95 },
  '제일 무거운 컨 뭐야': { canonical: '', window: '', confidence: 0 },
  '이 배 선장 이름이 뭐야': { canonical: '', window: '', confidence: 0 },
  '수고했어 미르야': { canonical: '', window: '잡담', confidence: 1 },
  '0230 이거 몇 킬로 나가': { canonical: '0230 중량', window: '컨 한 대', confidence: 1 },
  '리퍼 몇 대 탔어': { canonical: '리퍼 몇 대 탔어', window: '대수', confidence: 1 },   // identity 번역(«탔어» 는 모르는 낱말)
  '화면 좀 밝게 해줘': { canonical: '화면 밝게', window: '기기', confidence: 1 },
};
let dataText = null;   // 자료 답 스텁(문장) — 검사마다 바꾼다
global.fetch = async (url, opts = {}) => {
  calls.fetch.push({ url: String(url), method: opts.method || 'GET' });
  const ok = (j) => ({ ok: true, status: 200, json: async () => j });
  const u = String(url);
  if (u.includes('/mir_config.json')) return ok(cfg);
  if (u.includes('/mir_model_log/') && u.includes('shallow=true')) return ok(todayLog);
  if (u.includes('/mir_model_log/')) { const k = 'k' + Object.keys(todayLog).length; todayLog[k] = true; return ok({ name: k }); }
  if (u.includes('/mir_misses/')) return ok({ name: 'm' });
  if (u.includes('/mir_lexicon/')) return ok({});
  if (u.includes('generativelanguage.googleapis.com')) {
    const body = JSON.parse(opts.body || '{}'); const prompt = body.contents[0].parts[0].text;
    const m = prompt.match(/질문: "([^"]*)"\s*$/); const q = m ? m[1] : '';
    if (/번역기다/.test(prompt)) { const t = TRANSLATE[q] || { canonical: '', window: '', confidence: 0 }; return ok({ candidates: [{ content: { parts: [{ text: JSON.stringify(t) }] } }], usageMetadata: { promptTokenCount: 1200, candidatesTokenCount: 20 } }); }
    return ok({ candidates: [{ content: { parts: [{ text: dataText == null ? '자료에 없어요.' : dataText }] } }], usageMetadata: { promptTokenCount: 1500, candidatesTokenCount: 40 } });
  }
  return { ok: false, status: 404, json: async () => null };
};

const M = require(path.resolve(OUT));
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mirone_live_260910.json'), 'utf8'));
let bad = 0; const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };
const has = (a, s) => String(a || '').includes(s);
function ctxOf(key) {
  const v = FX[key];
  const comp = Object.assign({}, (v.discharge || {}).completed || {}, (v.loading || {}).completed || {});
  const rows = (m) => Object.values(((v[m] || {}).ediContainers) || {}).map((c) => {
    const r = (((v[m] || {}).records) || {})[c.cn] || {};
    const o = Object.assign({}, c); ['sl', 'bl', 'tmp', 'wt'].forEach((f) => { if (r[f] != null && r[f] !== '' && (o[f] == null || o[f] === '')) o[f] = r[f]; });
    o._mode = m; o.mode = m; if (comp[c.cn]) { o._comp = comp[c.cn]; o.comp = comp[c.cn]; } return o;
  });
  const cs = [...rows('discharge'), ...rows('loading')];
  return { app: 'tally', smallTalkLast: true, execDevice: false, modeChoice: 'both', voyageKey: key, voyage: v, info: v.info, containers: cs, mode: 'discharge', inspector: '김성일', isChief: true, terminalWork: {}, portMisData: {} };
}
const K = ctxOf('KBTR_2606E');
const rules = (ctx) => (cq, trace) => M.answerOneRaw(cq, Object.assign({}, ctx, { _trace: trace || {} }));
const gemCalls = () => calls.fetch.filter((f) => f.url.includes('generativelanguage')).length;

(async () => {
  // ① 약한 답 판정 — 잡아채는 길·모르는 낱말·null
  const tr = {}; const a1 = M.answerOneRaw('제일 무거운 컨 뭐야', Object.assign({}, K, { _trace: tr }));
  T(tr.via === 'howTo', `«제일 무거운 컨 뭐야» 는 사용법 매뉴얼로 잡힌다(_trace.via=howTo) — 실측 ${tr.via}`);
  T(M.isWeakAnswer('제일 무거운 컨 뭐야', a1, tr) === true, '사용법 매뉴얼 답은 약한 답');
  const tr2 = {}; const a2 = M.answerOneRaw('오늘 몇 시부터 했어', Object.assign({}, K, { _trace: tr2 }));
  T(tr2.via === 'time' && M.isWeakAnswer('오늘 몇 시부터 했어', a2, tr2), `«오늘 몇 시부터 했어» 는 현재 시각 잡답(time) → 약함 — 실측 ${tr2.via}`);
  const tr3 = {}; const a3 = M.answerOneRaw('20피트 몇 대', Object.assign({}, K, { _trace: tr3 }));
  T(!!a3 && !M.isWeakAnswer('20피트 몇 대', a3, tr3), '«20피트 몇 대» 는 강한 규칙 답 — 모델을 부르지 않는다');
  T(M.mirLeftover('0230 이거 몇 킬로 나가').includes('킬로'), '«킬로» 는 미르가 모르는 낱말');
  T(M.mirLeftover('리퍼 몇 대야').length === 0, '«리퍼 몇 대야» 는 모르는 낱말 0');
  T(M.isWeakAnswer('3426 온도', null, {}) === true, 'null 은 약한 답');
  T(M.isWeakAnswer('리퍼 어디', '양하인가요, 선적인가요? 🐱 아래 버튼으로 골라 주세요', { via: 'modeChoice' }) === false, '되묻기(단추)는 약하지 않다');

  // ② 강한 답 — 모델 0회
  let r = await M.askMir('20피트 몇 대', K, rules(K), { who: '김성일' });
  T(r.via === 'rules' && has(r.text, '17대') && gemCalls() === 0, `강한 규칙 답은 그대로·모델 0회 — via=${r.via} 호출 ${gemCalls()}`);

  // ③ 번역 → 규칙 답 + 사전 등록 + 못 알아들은 말 기록
  r = await M.askMir('스무 피트짜리 몇 대', K, rules(K), { who: '김성일' });
  T(r.via === 'translate' && has(r.text, '20피트: 17대'), `번역→규칙: «스무 피트짜리 몇 대» → «20피트 몇 대» → 17대 — via=${r.via} text=${String(r.text).slice(0, 60)}`);
  T(calls.lexicon.length === 1 && calls.lexicon[0].e && calls.lexicon[0].e.auto === true && calls.lexicon[0].e.ok === '20피트 몇 대', '번역이 답으로 이어지면 mir_lexicon 에 auto 별칭이 적힌다');
  T(calls.events.some((ev) => ev.type === 'gm-mir-miss' && ev.detail && ev.detail.q === '스무 피트짜리 몇 대') || calls.fetch.some((f) => f.url.includes('/mir_misses/')), '못 알아들은 말이 mir_misses 로 간다');
  T(calls.fetch.some((f) => f.url.includes('/mir_model_log/') && f.method === 'POST'), '호출마다 mir_model_log 에 한 줄');

  // ④ 잡아채는 길 + 번역 → 규칙이 «다른» 답을 낸다(현재 시각 → 작업 시작 시각)
  r = await M.askMir('오늘 몇 시부터 했어', K, rules(K), { who: '김성일' });
  T(r.via === 'translate' && has(r.text, '작업 시작'), `현재 시각 잡답이 «작업 몇 시에 시작했어» 로 바로잡힌다 — ${String(r.text).slice(0, 80)}`);

  // ⑤ 모르는 낱말인데 번역이 같은 답 → 확인된 것(규칙 답 그대로, 자료 답 안 감)
  const before = gemCalls();
  r = await M.askMir('0230 이거 몇 킬로 나가', K, rules(K), { who: '김성일' });
  T(r.via === 'translate' && has(r.text, '18,000kg') && gemCalls() - before === 1, `«킬로» 는 번역 한 번으로 확인 — 자료 답으로 안 간다(호출 ${gemCalls() - before}회)`);

  // ⑥ 번역 없음 → 자료 답(AI 표시) — 숫자가 자료에 있으면 통과
  dataText = '제일 무거운 컨테이너는 HLHU8512530이며 30520kg이고 선적 작업이에요. 위치는 14-06-84예요.';
  r = await M.askMir('제일 무거운 컨 뭐야', K, rules(K), { who: '김성일' });
  T(r.via === 'model' && has(r.text, 'HLHU8512530') && has(r.text, '(AI)'), `자료 답: 사용법 매뉴얼 대신 제일 무거운 컨 — ${String(r.text).slice(0, 80)}`);
  // ⑦ 숫자 문지기 — 자료에 없는 숫자(24100)는 버린다
  dataText = 'BMOU5190230 컨테이너는 18000kg, HALU2540230 컨테이너는 24100kg이에요.';
  r = await M.askMir('이 배 선장 이름이 뭐야', K, rules(K), { who: '김성일' });
  T(r.via === 'model' && has(r.text, '확실한 답을 못 만들었어요') && !has(r.text, '24100') && !has(r.text, '내 이름 고르기'), `자료에 없는 숫자가 든 답은 버리고 엉뚱한 매뉴얼로도 안 돌아간다 — ${String(r.text).slice(0, 80)}`);
  // ⑧ 잡담은 자료 답으로 안 간다
  const b8 = gemCalls();
  r = await M.askMir('수고했어 미르야', K, rules(K), { who: '김성일' });
  T(gemCalls() - b8 <= 1, `잡담은 번역 한 번뿐, 자료 답 안 부름(호출 ${gemCalls() - b8})`);
  // ⑨ 같은 문장 재호출 없음
  const b9 = gemCalls();
  await M.askMir('제일 무거운 컨 뭐야', K, rules(K), { who: '김성일' });
  T(gemCalls() === b9, '같은 문장은 한 세션에 한 번만 부른다');
  // ⑩ 하루 상한
  cfg = Object.assign({}, cfg, { dailyCap: 1 });
  const c2 = await M.getMirConfig(true); T(c2.dailyCap === 1, 'mir_config 다시 읽기');
  const b10 = gemCalls();
  r = await M.askMir('배 어느 쪽으로 붙었어', K, rules(K), { who: '김성일' });
  T(gemCalls() === b10 && r.reason === 'cap', `상한에 닿으면 모델 0회·이유 cap — ${r.reason}`);
  // ⑪ 키 없음 → 침묵(규칙 답만)
  cfg = { aiKey: '', model: 'gemini-3.5-flash-lite', dailyCap: 300, enabled: true };
  await M.getMirConfig(true);
  const b11 = gemCalls();
  r = await M.askMir('창고에 뭐 넣어놨어', K, rules(K), { who: '김성일' });
  T(gemCalls() === b11 && r.reason === 'nokey' && has(r.text, '임시창고'), `키가 없으면 모델 0회·규칙 답 그대로 — ${r.reason}`);
  // ⑫ 끝네자리만·숫자만은 모델을 안 부른다
  cfg = { aiKey: 'TEST-KEY', model: 'gemini-3.5-flash-lite', dailyCap: 300, enabled: true }; await M.getMirConfig(true); todayLog = {};
  const b12 = gemCalls();
  r = await M.askMir('9999', K, rules(K), { who: '김성일' });
  T(gemCalls() === b12, '숫자만은 모델을 안 부른다(화면 카드 몫)');
  // ⑮ 창구 예시는 전부 «아는 말» — 모르는 낱말이 남으면 안 된다(감사 실측: 첫 판은 84개 중 22개가 남았다)
  const exs = (M.MIR_CATALOG.match(/"([^"]+)"/g) || []).map((x) => x.replace(/"/g, ''));
  const badEx = exs.filter((ex) => M.mirLeftover(ex).length > 0);
  T(exs.length >= 60 && badEx.length === 0, `창구 예시 ${exs.length}개 전부 모르는 낱말 0 — 남은 것: ${badEx.slice(0, 6).map((e) => e + '→' + M.mirLeftover(e).join(',')).join(' | ')}`);
  T(M.mirLeftover('시프팅이 뭐야').length === 0 && JSON.stringify(M.mirLeftover('코베 트레이더 아이엠오 번호')) === JSON.stringify(['코베', '트레이더']), `낱말을 조각내지 않는다(«시프팅» 0 · «코베 트레이더» 는 통째로 남는다) — ${JSON.stringify(M.mirLeftover('코베 트레이더 아이엠오 번호'))}`);
  T(M.mirLeftover('위험물 클래스별로 몇 개씩이야').length > 0, '«클래스별로 몇 개씩» 은 모르는 낱말이 남아야 모델이 받는다');
  // ⑯ 시각·진행 길이 정답인 질문은 강하다
  const trT = {}; const aT = M.answerOneRaw('지금 몇 시야', Object.assign({}, K, { _trace: trT }));
  T(trT.via === 'time' && !M.isWeakAnswer('지금 몇 시야', aT, trT), '«지금 몇 시야» 는 시각 답이 정답 — 약하지 않다');
  // ⑰ identity 번역(원문 그대로) + 모르는 낱말뿐이던 답 → 규칙 답 «확인», 자료 답 안 감
  const b17 = gemCalls();
  r = await M.askMir('리퍼 몇 대 탔어', K, rules(K), { who: '김성일' });
  T(r.via === 'confirmed' && has(r.text, '리퍼') && gemCalls() - b17 === 1, `모르는 낱말뿐인 답은 번역이 같으면 «확인된 것» — via=${r.via} 호출 ${gemCalls() - b17}`);
  // ⑱ 항차별 memo — 같은 문장이라도 다른 항차면 다시 돌린다(답 문장을 항차 없이 캐시하던 것)
  const N = ctxOf('NSFR_2617N'); dataText = '자료에 없어요.';
  const b18 = gemCalls();
  r = await M.askMir('제일 무거운 컨 뭐야', N, rules(N), { who: '김성일' });
  T(gemCalls() - b18 >= 1 && !has(r.text, 'HLHU8512530'), `다른 항차에서는 KBTR 답을 재사용하지 않는다 — ${String(r.text).slice(0, 60)}`);
  // ⑲ 조작 말은 번역문으로 두 번 실행하지 않는다(밝기 두 칸 사고)
  let bright = 0; global.document.documentElement.setAttribute = () => { bright++; };
  const b19 = gemCalls();
  r = await M.askMir('화면 좀 밝게 해줘', Object.assign({}, K, { execDevice: true }), (cq, tr) => M.answerOneRaw(cq, Object.assign({}, K, { execDevice: true, _trace: tr || {} })), { who: '김성일' });
  T(gemCalls() === b19 && r.via === 'rules', `조작 말(deviceCmd)은 모델을 안 부른다 — via=${r.via} 호출 ${gemCalls() - b19}`);
  // ⑬ startSet 는 «베이사전이 필요» 대신 적는 답
  const a13 = M.answerOneRaw('2호기 11:15 시작했어', Object.assign({}, K, { _trace: {} }));
  T(has(a13, '2호기 11:15') && has(a13, '시작으로 적을게요'), `«2호기 11:15 시작했어» → 적는 답 — ${String(a13).slice(0, 80)}`);
  // ⑭ 콘앱 꼴(app:cone) — CONE_QA_HELP 는 약한 답(coneHelp)
  const trC = {}; const aC = M.answerOneRaw('선장 이름', Object.assign({}, K, { app: 'cone', smallTalkLast: false, _trace: trC }));
  T(trC.via === 'coneHelp' && M.isWeakAnswer('선장 이름', aC, trC), `콘 안내는 약한 답 — via=${trC.via}`);

  if (bad) { console.error(`✗ 미르 모델 창구 연막검사 실패 ${bad}건`); process.exit(1); }
  console.log('✓ 미르 모델 창구 연막검사 통과 (약한 답 판정 · 강한 답 모델 0회 · 번역→규칙+사전+기록 · 잡답 바로잡기 · 확인 경로 · 자료 답(AI) · 숫자 문지기 · 잡담 · 재호출 없음 · 하루 상한 · 키 없음 침묵 · 숫자만 · startSet · 콘 안내 · 창구 예시 전수 · 시각 정답 · identity 확인 · 항차별 memo · 조작 한 번)');
  process.exit(0);
})().catch((e) => { console.error('✗ 연막검사 자체가 죽었다:', e && e.stack || e); process.exit(1); });
