// 미르가 «강풍대기 상태야 쉬고 있어» 같은 작업 멈춤 알림을 알아듣는지 재는 연막검사 (TallyOne 4.34-01 / ConeOne 같은 mir-core 한 벌).
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
console.log('■ 작업 멈춤 알림 — 앱 보고가 없을 때');
for (const q of ['미르야 강풍대기 상태야 쉬고 있어', '미르야 안개 때문에 대기중이야', '미르야 지금 우천으로 작업 중단됐어']) {
  const r = ask(q, mk(base));
  T(r.via === 'workStop' && /^알겠어요/.test(r.a) && /중단 보고가 없어요/.test(r.a) && !/뭐 확인해 드릴까요/.test(r.a), `«${q}» → 알아듣고 앱에 보고가 없다고 알려 준다`, `${r.a} · ${r.via}`);
}
console.log('■ 앱에 중단 보고가 있을 때');
{
  const v = JSON.parse(JSON.stringify(base));
  v.reports = { [String(NOW - 600000)]: { type: 'work_status', action: 'discharge_pause', mode: 'discharge', reason: '강풍 대기', equip: '3호기', ts: NOW - 600000 } };
  const r = ask('미르야 강풍대기 상태야 쉬고 있어', mk(v));
  T(r.via === 'workStop' && /앱에도/.test(r.a) && /강풍 대기/.test(r.a), '중단 보고가 있으면 사유까지 확인해 준다', `${r.a} · ${r.via}`);
}
console.log('■ 다른 말은 가로채지 않는다');
{
  const r1 = ask('미르야', mk(base));
  T(/뭐 확인해 드릴까요/.test(r1.a) && r1.via !== 'workStop', '«미르야» 단독은 그대로 인사');
  const r2 = ask('미르야 강풍 때문에 왜 늦어?', mk(base));
  T(r2.via !== 'workStop', '질문(왜·?)은 가로채지 않는다', `${r2.a} · ${r2.via}`);
  const r3 = ask('강풍대기 상태야 쉬고 있어', mk(base));
  T(r3.via !== 'workStop', '미르를 부르지 않은 말은 가로채지 않는다', `${r3.via}`);
}
console.log(`\n${bad ? '✗ ' + bad + '건 실패' : '✔ 전부 통과'} (${n}건)`);
process.exit(bad ? 1 : 0);
