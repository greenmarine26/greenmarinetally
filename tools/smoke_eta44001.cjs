// «몇 시에 끝나» 두 앱 같은 답 — 사전에 없는 낱말이 붙어도 끝나는 시각 답을 모델로 보내지 않는다 (TallyOne 4.40-01 · ConeOne 2.70-03)
//   검수사 2026-10-20 20:07 «그리고 몇시에 끝나 같은 질문을 검수앱과 콘앱에 하면 답변이 틀리게 나옵니다 검수앱은 자세히 시간 설명까지 콘앱은 남은 갯수만».
//   실측 — 같은 날 콘앱 «집에 몇 시에 끝나»(15:22)는 규칙이 약한 답으로 보고 모델로 넘겨 남은 대수만 답했고, 검수앱 «몇 시쯤에 끝나»는 규칙이 시각까지 답했다.
//   고침 — nlSearch.formatEta 가 답을 내면 미르가 via 'eta'(강한 답)로 친다 · «언제 마쳐/마무리»·«다 하면 몇 시» 도 끝나는 시각 질문.
//   실소스 번들(mirCore.entry) + 실데이터(KBTR 2606E 보관본 — 완료를 반으로 잘라 «작업 중» 시각으로 둔다).
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
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mirsame_kbtr.json'), 'utf8'));
const vk = FX.voyageKey, ss = FX.shipSpeed, pf = FX.pilotForecast;
//  «작업 중» 으로 자른다 — 완료 시각 가운데 값까지만 남기고 그 1분 뒤를 «지금»으로. 터미널 본선현황(끝난 값)은 빼서 완료 기록으로 재게 한다.
const v = JSON.parse(JSON.stringify(FX.voyage));
const ats = [];
for (const m of ['discharge', 'loading']) for (const c of Object.values((v[m] && v[m].completed) || {})) if (c && c.at) ats.push(c.at);
ats.sort((a, b) => a - b);
const CUT = ats[Math.floor(ats.length / 2)];
for (const m of ['discharge', 'loading']) { const c = (v[m] && v[m].completed) || {}; for (const k of Object.keys(c)) if (!(c[k] && c[k].at <= CUT)) delete c[k]; }
const info = v.info || {}; delete info.termStat; delete info.qcWork;
const NOW = CUT + 60 * 1000; Date.now = () => NOW;
const M = require(path.resolve(OUT));
let n = 0, bad = 0;
const check = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const norm = (s) => String(s == null ? '(null)' : s).replace(/\s+/g, ' ').trim();
const D = v.discharge || {}, L = v.loading || {};
const comp = Object.assign({}, D.completed || {}, L.completed || {});
const paint = (rows, mode) => M.toMirContainers(rows, mode).map((c) => { const w = c && c.cn ? comp[c.cn] : null; return (w && !c._comp) ? Object.assign({}, c, { _comp: w }) : c; });
const cs = paint(Object.values(D.ediContainers || {}), 'discharge').concat(paint(Object.values(L.ediContainers || {}), 'loading'));
check(`실데이터 — KBTR 2606E 작업 중으로 자름(완료 ${Object.keys(comp).length}대 / 컨 ${cs.length}대)`, Object.keys(comp).length > 50 && cs.length > Object.keys(comp).length);
const tallyCtx = () => ({ app: 'tally', smallTalkLast: true, execDevice: true, modeChoice: 'both', countFallback: true, inspector: '연막', isChief: true, chiefData: null, heartbeat: null, portMisData: {}, pilotForecast: pf, shipSpeed: ss, voyages: { [vk]: v }, flat: cs,
  voyageKey: vk, voyage: v, info, mode: 'discharge', containers: cs, compMap: comp, shiftMap: null, bayPairs: null, rfSkip: false, esealBrief: null, photos: null, diagAlerts: [] });
const coneVoyage = { info, reports: v.reports || {}, discharge: { completed: D.completed || {}, records: D.records || {}, termWork: D.termWork || {}, xrayList: D.xrayList || {}, xraySeals: D.xraySeals || {}, held: D.held || {}, luggConfirm: D.luggConfirm || {} }, loading: { completed: L.completed || {}, records: L.records || {}, held: L.held || {} } };
const coneCtx = () => ({ app: 'cone', containers: cs, cone: { rows: [], dischRows: [], stowRows: [] }, accepted: true, execDevice: true, shiftN: 0, mode: 'discharge', modeLabel: '양하', info, compMap: comp, shiftMap: null, voyage: coneVoyage,
  vsl: info.vsl || '', vslFull: info.vslFull || '', pier: String(info.pier || '').toUpperCase(), shipSpeed: ss, pilotForecast: pf, voyageKey: vk, records: { discharge: D.records || {}, loading: L.records || {} } });
const ask = (q, ctx) => { const t = {}; const a = M.answerOneRaw(q, Object.assign(ctx, { _trace: t })); return { a, via: t.via, weak: M.isWeakAnswer(q, a, t) }; };

//  ① 끝나는 시각을 묻는 말 — 두 앱 같은 답 · 시각까지 · 강한 답(모델로 안 감)
console.log('① 끝나는 시각 — 두 앱 같은 답, 모델로 안 보냄');
const ETA = ['몇시에 끝나', '몇 시쯤에 끝나', '몇 시쯤 끝나', '몇 시에 끝날까', '몇 시에 끝날 것 같아', '몇 시에 마쳐', '언제 마쳐', '언제 마무리돼', '다 하면 몇 시야',
  '집에 몇 시에 끝나', '집에 몇 시에가', '집에 언제 가냐', '오늘 언제 끝나', '미르야 몇 시에 끝나',
  //  2차 시뮬이 찾은 실입력(콘 10-04 SWMM · 콘 10-15) — «몇 시에 작업» · «작업시간 몇» 이 도선 갈래로 새던 말 · «이 속도면» 이 속도 표로 새던 말
  '몇시에 작업이 끝날거 같니?', '몇 시에 작업 끝날까', '작업시간 몇시간 걸릴거같아?', '작업시간 몇 시간 걸려', '이 속도면 언제 끝나', '이 속도면 몇 시에 끝나', '몇 시에 다 끝날까', '몇 시간 걸려'];
for (const q of ETA) {
  const x = ask(q, tallyCtx()), y = ask(q, coneCtx());
  check(`«${q}» → 두 앱 같은 답 · via eta · 강한 답 · 끝나는 시각까지`,
    norm(x.a) === norm(y.a) && x.via === 'eta' && y.via === 'eta' && !x.weak && !y.weak && /⏱ 예상 완료: 오[전후] \d+시 \d\d분쯤|\d\d:\d\d\*\* 쯤 끝납니다/.test(String(x.a)),   // «몇 시간 걸려» 류는 작업 속도 답(chiefAnswers.answerShipSpeed — 남은 대수·끝나는 시각까지)
    `검수앱 via=${x.via} 약=${x.weak} · 콘앱 via=${y.via} 약=${y.weak}\n      검수앱: ${norm(x.a).slice(0, 110)}\n      콘앱: ${norm(y.a).slice(0, 110)}`);
}
//  ② 다른 질문은 끝나는 시각 답이 아니다(가로채지 않는다)
console.log('② 다른 질문은 그대로');
for (const [q, bad_] of [['지금 몇 시야', /예상 완료/], ['얼마나 남았어', /예상 완료/], ['리퍼 몇 대', /예상 완료/], ['도선 언제야', /예상 완료/], ['작업 속도', null], ['작업 속도 어때', null]]) {
  const x = ask(q, tallyCtx()), y = ask(q, coneCtx());
  check(`«${q}» 는 via eta 가 아니다${bad_ ? ' · 예상 완료 답 아님' : ''} · 두 앱 같은 답`,
    x.via !== 'eta' && y.via !== 'eta' && (!bad_ || !bad_.test(String(x.a))) && norm(x.a) === norm(y.a), `검수앱 via=${x.via} · 콘앱 via=${y.via} · ${norm(x.a).slice(0, 80)}`);
}
//  «끝나» 만 있고 시각을 묻지 않는 말은 강한 답으로 굳히지 않는다 — 종전대로 모르는 낱말이 남으면 모델이 다시 읽는다(감사 지적 대비 — etaQuery 는 «끝나» 만 있어도 선다)
for (const q of ['인쇄가 끝나면 복제한 장이 치워진다', '8초 시간 끝이 안 먹어 받기가 끝나지 않는다', '연결이 끝나면 늦게 온 답을 버린다',
  //  감사 지적 — 배 작업이 아닌 것의 끝 · 섞인 말 · 남에게 전하라는 말은 강한 답으로 굳히지 않는다(종전대로)
  '쉬는 시간 언제 끝나', '강풍 언제 끝나', '인쇄 언제 끝나', '회의 몇 시에 끝나', '야드 작업 언제 끝나', '몇 시에 끝나 그리고 리퍼 몇 대야', '몇 시에 끝나는지 수석한테 알려줘', '몇 시에 끝나는지 카톡 보내줘']) {
  const x = ask(q, tallyCtx()), y = ask(q, coneCtx());
  check(`«${q}» 는 via eta 가 아니다(시각을 묻는 말이 아님)`, x.via !== 'eta' && y.via !== 'eta', `검수앱 via=${x.via} · 콘앱 via=${y.via}`);
}
//  도선·작업개시 갈래는 그대로 — 시작·도선·접안을 묻는 말
for (const q of ['몇 시에 작업 시작해', '작업시간 몇 시야', '도선 몇 시야', '도선 끝나고 작업 언제 시작해']) {
  const p = M.parseNaturalQuery(q);
  check(`«${q}» 는 종전대로 도선·작업개시 갈래(pilotQuery)`, !!p.pilotQuery, JSON.stringify({ pilot: p.pilotQuery, eta: p.etaQuery }));
}
{
  const p = M.parseNaturalQuery('시간당 몇 대 해야 몇 시에 끝나'), p2 = M.parseNaturalQuery('작업 속도 어때');
  check('«시간당 …» · «작업 속도 어때» 는 종전대로 속도 답(paceQuery)', !!p.paceQuery && !!p2.paceQuery);
}
{
  const p = M.parseNaturalQuery('지금 몇 시야'), q2 = M.parseNaturalQuery('다 하면 몇 시야');
  check('«지금 몇 시야» 는 현재 시각(timeQuery) · «다 하면 몇 시야» 는 끝나는 시각(etaQuery)', p.timeQuery && !p.etaQuery && q2.etaQuery && !q2.timeQuery);
}
//  ③ 소스 — 표식 한 벌
{
  const ns = fs.readFileSync(path.join(ROOT, 'src/nlSearch.js'), 'utf8'), mir = fs.readFileSync(path.join(ROOT, 'src/mir.js'), 'utf8');
  check('nlSearch.formatEta 가 답을 낸 표식(_etaAnswered)을 남기고 미르가 «시각을 묻는 말»(ETA_ASK_RE)일 때만 via eta 를 단다', /function formatEta\([^)]*\) \{[\s\S]{0,900}ctx\._etaAnswered = true/.test(ns) && /if \(_gctx\._etaAnswered && ETA_ASK_RE\.test\(q\) && !ETA_OTHER_RE\.test\(q\)\) _via\('eta'\)/.test(mir) && /^const ETA_ASK_RE = /m.test(mir) && /^const ETA_OTHER_RE = /m.test(mir));
  check('isWeakAnswer 가 via eta 를 강한 답으로 본다 · 작업 속도 답(몇 시간 걸려)도 같은 문으로 via eta', /if \(via === 'eta'\) return false;/.test(mir) && /answerShipSpeed\(v, c\.shipSpeed, ship, _vcOf\(\)\); if \(a && !\/못 불러왔\/\.test\(a\)\) \{ if \(ETA_ASK_RE\.test\(Q\) && !ETA_OTHER_RE\.test\(Q\)\) _via\('eta'\)/.test(mir));
}
console.log(`\n${bad ? '✘' : '✔'} «몇 시에 끝나» 두 앱 같은 답 연막검사 ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
