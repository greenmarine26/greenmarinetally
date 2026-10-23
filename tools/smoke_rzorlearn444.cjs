// 미르 «RZOR 학습 현황»(TallyOne 4.44) 연막검사 — 실소스(mir.js·chiefAnswers.js)를 묶어 실 보관소 요약(2026-10-23 씨앗 17항차)으로 답을 잰다.
//   검수사 2026-10-23 «앱이 스스로 테스트 하고 마감텔리에서 실제작업 파일이 오면 그걸로 테스트한 결과 채점을 받아야 할것입니다».
//   재는 것 — ① 수석이 물으면 보관소 항차 수·최근 평균·항차별 채점이 나온다 ② 검수원·콘앱에는 수석 유도(수석 전용 정보)
//           ③ 아직 안 읽었으면 «읽는 중», 읽기 실패면 «읽지 못했습니다» ④ 다른 RZOR 질문(브리핑·수집기)은 가로채지 않는다
//           ⑤ 미르 시트·홈 통합검색이 같은 정규식으로 rzor_learn/summary 만 1회 읽는다 ⑥ 매뉴얼에 예시가 있다
//   node tools/smoke_rzorlearn444.cjs <저장소 루트>
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(process.argv[2] || process.cwd());

global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {}, __mirLexicon: {}, __mirLexiconWrite() {} };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
const store = {};
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
global.fetch = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke444_'));
const entry = path.join(tmp, 'entry.js');
const out = path.join(tmp, 'bundle.cjs');
fs.writeFileSync(entry, `
export { answerOneRaw, RZOR_LEARN_RE } from ${JSON.stringify(path.join(ROOT, 'src/mir.js'))};
export { answerRzorLearn } from ${JSON.stringify(path.join(ROOT, 'src/chiefAnswers.js'))};
`);
execFileSync('npx', ['esbuild', entry, '--bundle', '--platform=node', '--format=cjs', `--outfile=${out}`, '--loader:.js=jsx', '--jsx=automatic', '--log-level=error'], { cwd: ROOT, stdio: 'inherit' });

let n = 0, bad = 0;
const T = (cond, name, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const B = require(out);
const FIX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/rzor_learn_summary_20261023.json'), 'utf8'));
const base = (extra) => Object.assign({ app: 'tally', smallTalkLast: true, modeChoice: 'both', inspector: '연막', isChief: true, chiefData: { rzorLearn: FIX }, heartbeat: { at: Date.now() - 60000, cycleMin: 5, version: 'MailPilot 2.45' }, portMisData: {}, voyages: {}, flat: [], containers: [], diagAlerts: [] }, extra || {});
const ask = (q, ctx) => String(B.answerOneRaw(q, ctx) || '');

console.log('① 답 — 실 보관소 요약(씨앗 17항차)');
const a = B.answerRzorLearn(FIX);
T(/보관소 17항차/.test(a) && /마지막 R115W/.test(a), '보관소 항차 수와 마지막 항차', a.slice(0, 80));
T(/최근 5항차 평균.*구역 65% · 칸 16%/.test(a), '최근 5항차 평균(그 항차를 빼고 배운 예측)', a.split('\n')[1]);
T(/· R115W — 학습 예측 구역 80% · 칸 23% \(146대\)/.test(a), '항차별 채점 — R115W 구역 80% 칸 23%', a);
T(/구역은 배워서 맞히고 칸은 검수원 입력이 정답/.test(a), '맺음말');
T(/아직 없습니다/.test(B.answerRzorLearn({ n: 0 })) && /읽는 중/.test(B.answerRzorLearn(null)), '빈 보관소·읽는 중');
const live = B.answerRzorLearn({ n: 18, last: 'R116W', avg5: { zone5: 70, slot: 18, voys: 5 }, recent: [{ voy: 'R116W', learn: { zone5: 72, slot: 20, n: 150 }, live: { slot: 12, deck: 61, n: 180, lolo: { n: 30, hit: 30 } } }] });
T(/실시간 자가 테스트 칸 12% 덱 61% · LOLO 30\/30/.test(live), '실시간 자가 테스트 줄(마감텔리 뒤 채점)');

console.log('② 미르 길 — 수석·검수원·콘앱·읽기 상태');
for (const q of ['RZOR 학습 현황', '덱플랜 학습 어때', '리자오 채점 결과', '미르야 RZOR 학습 채점 어때']) {
  const r = ask(q, base());
  T(/보관소 17항차/.test(r), `수석 «${q}» → 학습 현황 답`, r.slice(0, 70));
}
T(/수석 전용 정보/.test(ask('RZOR 학습 현황', base({ isChief: false, chiefData: null }))), '검수원이 물으면 수석 유도');
T(/읽는 중/.test(ask('RZOR 학습 현황', base({ chiefData: { rzorLearn: null } }))), '아직 안 읽었으면 «읽는 중»');
T(/읽지 못했습니다/.test(ask('RZOR 학습 현황', base({ chiefData: { rzorLearn: { __error: true } } }))), '읽기 실패면 «읽지 못했습니다»');
T(!/보관소 17항차/.test(ask('수집기 상태 어때', base())) && /MailPilot 2\.45/.test(ask('수집기 상태 어때', base())), '«수집기 상태»는 그대로 하트비트 답');
T(!/보관소 17항차/.test(ask('RZOR 브리핑', base())), '«RZOR 브리핑»은 학습 답으로 안 샌다');
T(B.RZOR_LEARN_RE.test('RZOR 학습 현황') && B.RZOR_LEARN_RE.test('학습 현황 RZOR') && !B.RZOR_LEARN_RE.test('RZOR 몇 대') && !B.RZOR_LEARN_RE.test('씰 모양 학습'), '정규식 — 배·덱플랜 닻 + 학습·채점 말');
for (const q of ['미르 학습 어때', '학습 결과', '채점 결과 알려줘', '미르 사전 학습 현황', '학습 얼마나 했어']) {
  T(!B.RZOR_LEARN_RE.test(q) && !/보관소 17항차/.test(ask(q, base())), `수석 «${q}» — 배 닻이 없으면 RZOR 학습 답으로 가로채지 않는다(감사 경①)`);
}

console.log('③ 배선 — 두 읽기 자리·매뉴얼');
const fab = fs.readFileSync(path.join(ROOT, 'src/components/MirFab.jsx'), 'utf8');
const gsp = fs.readFileSync(path.join(ROOT, 'src/pages/GlobalSearchPage.jsx'), 'utf8');
T(/RZOR_LEARN_RE\.test\(text\)[^\n]*fbGetSimple\('rzor_learn\/summary'\)/.test(fab), '미르 시트 — 물었을 때 rzor_learn/summary 1회');
T(/RZOR_LEARN_RE\.test\(q\)[^\n]*fbGetSimple\('rzor_learn\/summary'\)/.test(gsp), '홈 통합검색 — 같은 식');
T(!/fbGetSimple\('rzor_learn'\)/.test(fab + gsp), '항차 원자료(rzor_learn 통째)는 읽지 않는다');
const help = fs.readFileSync(path.join(ROOT, 'src/data/helpData.js'), 'utf8');
T((help.match(/RZOR 학습 현황/g) || []).length >= 2, '매뉴얼 — 미르·통합검색 예시 둘');
const utils = fs.readFileSync(path.join(ROOT, 'src/utils.js'), 'utf8');
T(/APP_VERSION = 'TallyOne 4\.44'/.test(utils) && /APP_NOTE = '4\.44 [^']*RZOR 학습 현황/.test(utils), '버전 4.44 · 배너 문구');

console.log(`\n${bad ? '✘ 실패' : '✔ 통과'} ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
