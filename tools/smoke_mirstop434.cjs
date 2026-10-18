// 미르가 «강풍대기 상태야 쉬고 있어» 같은 작업 멈춤 알림을 알아듣고(중단 사유로 적는다), «왜 작업 안 해?» 에 그 사유를 답하는지 재는 연막검사 (TallyOne 4.34-01·02 / ConeOne 같은 mir-core 한 벌).
//   검수사 2026-10-18 14:49 «미르가 작업신호가 없으면 불안해 합니다. 그래서 쉬고 있으라고 알려준것이고. 다른 사용자가 왜 작업또는 일 안해 하고 물으면 중단사유를 알려줘야 합니다.»
//   검수사 2026-10-18 14:07 화면 — MCAT 640N «미르야 강풍대기 상태야 쉬고 있어» → «네, 미르예요 뭐 확인해 드릴까요?» 로 되물음.
//   node tools/smoke_mirstop434.cjs <mirCore 번들> <저장소 루트>
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
let n = 0, bad = 0;
const T = (cond, name, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const NOW = Date.now();
const mk = (voy) => () => {
  const D = voy.discharge || {}, L = voy.loading || {};
  const comp = Object.assign({}, D.completed || {}, L.completed || {});
  const cs = M.toMirContainers(Object.values(D.ediContainers || {}), 'discharge').concat(M.toMirContainers(Object.values(L.ediContainers || {}), 'loading'));
  return { app: 'tally', smallTalkLast: true, execDevice: true, modeChoice: 'both', countFallback: true, inspector: '연막', isChief: true, chiefData: null, voyageKey: FX.voyageKey, voyage: voy, info: voy.info, vsl: voy.info.vsl, vslFull: voy.info.vslFull || '', pier: voy.info.pier, mode: 'discharge', containers: cs, compMap: comp, shiftMap: null, bayPairs: null, rfSkip: false, diagAlerts: [], accepted: true, _trace: {}, _now: NOW, _utterAt: NOW };
};
function ask(q, ctxFn) {
  const c = ctxFn(); const t = {}; c._trace = t; c._now = NOW; c._utterAt = NOW;
  let a = null; try { a = M.answerOneRaw(q, c); } catch (e) { a = 'ERR ' + e.message; }
  return { a: norm(a), via: t.via || '' };
}
const base = JSON.parse(JSON.stringify(FX.voyage));
delete base.reports;
const withPause = (reason) => { const v = JSON.parse(JSON.stringify(base)); v.reports = { [String(NOW - 600000)]: { type: 'external_pause', reason, ts: NOW - 600000, message: 'x' } }; return v; };
console.log('■ 말 파서(parseNaturalQuery.pauseSet) — 사유 이름은 작업 보고 칩과 같다');
for (const [q, want] of [['미르야 강풍대기 상태야 쉬고 있어', '강풍 대기'], ['미르야 안개 때문에 대기중이야', '안개 대기'], ['미르야 지금 우천으로 작업 중단됐어', '우천 대기'], ['미르야 장비 고장으로 멈췄어', '장비 고장'], ['미르야 야드 혼잡해서 쉬고 있어', '야드 혼잡'], ['미르야 점심 먹느라 작업 중단', '점심 식사']]) {
  const p = M.parseNaturalQuery(q);
  T(p.pauseSet && p.pauseSet.reason === want, `«${q}» → 사유 «${want}»`, JSON.stringify(p.pauseSet));
}
for (const q of ['미르야 강풍 때문에 왜 늦어?', '미르야 안개 걷혔어', '미르야 3426 온도', '미르야 강풍 풀렸어 다시 시작']) {
  T(!M.parseNaturalQuery(q).pauseSet, `«${q}» 는 멈춤 알림이 아니다`);
}
console.log('■ 미르 칸(부름말 없음) · 사유 없는 멈춤 알림 — 화면 2026-10-18 15:12 «작업중단 이라고 했잖아 쉬고있어»');
{
  const mb = (voy) => () => Object.assign(mk(voy)(), { mirBox: true });
  const r = ask('작업중단 이라고 했잖아 쉬고있어', mb(base));
  T(r.via === 'workStop' && /쉬는 중/.test(r.a) && /적을게요/.test(r.a) && !/자료에 없어요/.test(r.a), '사유 없이 «작업중단» → «쉬는 중» 으로 적는다', `${r.a} · ${r.via}`);
  const r2 = ask('작업중단 이라고 했잖아 쉬고있어', mb(withPause('강풍 대기')));
  T(r2.via === 'workStop' && /앱에도/.test(r2.a) && /강풍 대기/.test(r2.a), '이미 사유가 있으면 덮지 않고 그 사유로 확인', `${r2.a}`);
  const r3 = ask('강풍대기 쉬고있어', mb(base));
  T(r3.via === 'workStop' && /강풍 대기로/.test(r3.a), '부름말 없이도 미르 칸이면 사유까지 읽는다', `${r3.a}`);
  const r4 = ask('작업중단 이라고 했잖아 쉬고있어', mk(base));
  T(r4.via !== 'workStop', '미르 칸도 부름말도 아니면(통합검색 등) 가로채지 않는다', `${r4.via}`);
  const p = M.parseNaturalQuery('작업중단 이라고 했잖아 쉬고있어');
  T(p.pauseSet && p.pauseSet.reason === '쉬는 중' && p.pauseSet.known === false && p.pauseSet.called === false, '파서: 사유 미상 · 부름 아님', JSON.stringify(p.pauseSet));
}
console.log('■ 알림 → 적을게요 / 이미 같은 사유면 앱에도 기록돼 있어요');
{
  const r = ask('미르야 강풍대기 상태야 쉬고 있어', mk(base));
  T(r.via === 'workStop' && /강풍 대기로 작업이 멈춘 걸로 적을게요/.test(r.a) && !/뭐 확인해 드릴까요/.test(r.a), '보고가 없으면 «적을게요»(저장은 화면이 한다)', `${r.a} · ${r.via}`);
  const r2 = ask('미르야 강풍대기 상태야 쉬고 있어', mk(withPause('강풍 대기')));
  T(r2.via === 'workStop' && /앱에도/.test(r2.a) && /사유 강풍 대기/.test(r2.a), '같은 사유로 이미 중단 중이면 «앱에도 기록돼 있어요»', `${r2.a} · ${r2.via}`);
  const r3 = ask('미르야 안개 대기중이야', mk(withPause('강풍 대기')));
  T(r3.via === 'workStop' && /적을게요/.test(r3.a), '다른 사유면 새로 적는다', `${r3.a}`);
  const r4 = ask('미르야 강풍대기 쉬고 있어', () => Object.assign(mk(base)(), { app: 'cone' }));
  T(r4.via === 'workStop' && /콘앱은 적는 손이 없어요/.test(r4.a), '콘앱은 적지 않고 검수앱으로 안내', `${r4.a}`);
}
console.log('■ «왜 작업 안 해?» — 다른 사용자가 물으면 중단 사유를 알려 준다');
for (const q of ['왜 작업 안해?', '미르야 왜 일 안 해', '왜 작업이 멈췄어?', '작업 안하는 이유가 뭐야']) {
  const r = ask(q, mk(withPause('강풍 대기')));
  T(r.via === 'workStop' && /중단 중이에요/.test(r.a) && /사유는 강풍 대기/.test(r.a), `«${q}» → 사유 답`, `${r.a} · ${r.via}`);
}
{
  const r = ask('왜 작업 안해?', mk(base));
  T(r.via !== 'workStop', '중단 보고가 없으면 가로채지 않는다(옛 길)', `${r.a.slice(0, 60)} · ${r.via}`);
  const r2 = ask('작업 왜 느려?', mk(withPause('강풍 대기')));
  T(r2.via !== 'workStop', '«왜 느려» 는 야드·속도 질문이라 그대로', `${r2.via}`);
  const r3 = ask('미르야', mk(base));
  T(/뭐 확인해 드릴까요/.test(r3.a) && r3.via !== 'workStop', '«미르야» 단독은 그대로 인사');
}
console.log(`\n${bad ? '✗ ' + bad + '건 실패' : '✔ 전부 통과'} (${n}건)`);
process.exit(bad ? 1 : 0);
