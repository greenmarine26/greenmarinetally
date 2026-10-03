// 미르 «언제 끝나»·작업 계산이 터미널 본선현황(PCTC termStat · 동방 qcWork)으로 나가는지 재는 연막검사(3.74)
//  실데이터 — 2026-10-03 라이브 보관소 DPRT_2611N(PCTC) · RZOR_R108E(동방) info. 검수사 2026-10-03 12:41 «미르는 언제끝나 라는 질문과 작업계산은 각 터미널 본선현황보고 계산».
const fs = require('fs'), path = require('path');
const OUT = process.argv[2], ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {} };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
global.fetch = () => Promise.reject(new Error('연막: 네트워크 없음'));
const M = require(path.resolve(OUT));
const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures', f), 'utf8'));
let n = 0, bad = 0;
const check = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const norm = (s) => String(s == null ? '(null)' : s).replace(/\s+/g, ' ').trim();
const tally = (vk, info) => ({ app: 'tally', smallTalkLast: true, execDevice: true, modeChoice: 'both', countFallback: true, inspector: '연막', isChief: true, portMisData: {}, pilotForecast: {}, shipSpeed: {}, voyages: { [vk]: { info } }, flat: CS,
  voyageKey: vk, voyage: { info }, info, mode: 'discharge', containers: CS, compMap: {}, vsl: info.vsl, pier: info.pier, _trace: {} });
const cone = (vk, info) => ({ app: 'cone', containers: CS, cone: { rows: [], dischRows: [], stowRows: [] }, execDevice: true, shiftN: 0, mode: 'discharge', modeLabel: '양하', info, compMap: {}, voyage: { info, reports: {}, discharge: {}, loading: {} },
  vsl: info.vsl, vslFull: '', pier: info.pier, shipSpeed: {}, pilotForecast: {}, voyageKey: vk, records: { discharge: {}, loading: {} }, _trace: {} });
//  컨 목록은 있어야 «자료 아직 안 왔어요» 문지기를 지난다 — 모양만 실데이터(KBTR 2606E EDI)에서 빌리고 완료 표시는 뺀다(숫자는 터미널 본선현황이 정한다).
const KB = J('mirsame_kbtr.json').voyage;
const CS = M.toMirContainers(Object.values((KB.discharge || {}).ediContainers || {}), 'discharge');
const Q = ['몇시에 끝나', '얼마나 남았어', '작업 속도'];
const run = (vk, info, q) => [norm(M.answerOneRaw(q, tally(vk, info))), norm(M.answerOneRaw(q, cone(vk, info)))];

const P = J('termeta_dprt.json'); P.termStat.at = Date.now() - 60000;   // 방금 받은 것으로 — 낡음 문지기 기준
const Z = J('termeta_rzor.json');
//  ① 모아 읽기 — 숫자
{
  const t = M.termProgressOf ? M.termProgressOf(P) : null;
  if (!M.termProgressOf) console.log('  (termProgressOf 번들 미노출 — 답 문장으로만 잰다)');
  if (t) check('PCTC 합계 — 총 411 · 완료 235 · 잔여 176', t.total === 411 && t.done === 235 && t.rest === 176 && t.byMode.discharge.done === 235 && t.byMode.loading.total === 159, JSON.stringify(t));
}
for (const q of Q) {
  const [a, b] = run('DPRT_2611N', P, q);
  check(`PCTC «${q}» 본선현황 기준 표시 + 두 앱 같은 답`, /본선현황/.test(a) && a === b, `\n    ${a.slice(0, 200)}\n    ${b.slice(0, 200)}`);
}
{
  const [a] = run('DPRT_2611N', P, '얼마나 남았어');
  check('PCTC «얼마나 남았어» — 잔여 176 · 완료 235', /176/.test(a) && /235/.test(a), a.slice(0, 220));
}
for (const q of Q) {
  const [a, b] = run('RZOR_R108E', Z, q);
  check(`동방 «${q}» 본선현황 기준 + 두 앱 같은 답`, /본선현황/.test(a) && a === b, `\n    ${a.slice(0, 200)}\n    ${b.slice(0, 200)}`);
}
{
  const [a] = run('RZOR_R108E', Z, '얼마나 남았어');
  check('동방 «얼마나 남았어» — 총 358 · 잔여 14', /358/.test(a) && /\b14\b/.test(a), a.slice(0, 220));
}
//  ② 자료 없음·낡음 → 종전 계산(📡 줄 없음)
{
  const P0 = JSON.parse(JSON.stringify(P)); delete P0.termStat;
  const [a] = run('DPRT_2611N', P0, '몇시에 끝나');
  check('termStat 없으면 본선현황 줄이 없다(완료 기록 계산으로)', !/본선현황/.test(a), a.slice(0, 160));
  const P1 = JSON.parse(JSON.stringify(P)); P1.termStat.at = Date.now() - 4 * 3600 * 1000;
  const [c] = run('DPRT_2611N', P1, '몇시에 끝나');
  check('PCTC 3시간 넘게 안 갱신이면 낡은 숫자를 쓰지 않는다', !/본선현황/.test(c), c.slice(0, 160));
}
{
  const Z1 = JSON.parse(JSON.stringify(Z)); Z1.planDis = 100; Z1.planLod = 100;   // 크레인별 합이 평택 계획을 크게 웃돌면(배 전체 합) 쓰지 않는다
  const [a] = run('RZOR_R108E', Z1, '몇시에 끝나');
  check('동방 합계가 평택 계획을 5% 넘게 웃돌면 본선현황을 쓰지 않는다', !/본선현황/.test(a), a.slice(0, 160));
  const [c] = run('RZOR_R108E', Z, '진행 상황 어때');
  check('«진행 상황» 라벨도 본선현황 기준', /본선현황 기준/.test(c) && !/완료 기록 기준/.test(c), c.slice(0, 160));
}
console.log(`\n미르 본선현황 연막검사 — ${n}항 중 ${bad}건 실패`);
if (bad) process.exit(1);
console.log('✓ 미르 본선현황 연막검사 통과');
