// 두 앱 같은 답 연막검사 (3.43-01) — 실소스 번들(mirCore.entry)에 실데이터(KBTR 2606E 보관본 + 터미널 실적·배 속도·도선 예보)를 물려, 검수앱(항차 열린 떠 있는 미르)과 콘앱(cone.html mirAsk 모양) ctx 로 같은 문장을 던져 답이 같은지 잰다.
//   검수사 2026-09-11 «검수앱과 콘앱에 공통되는 질문이라면 답은 같아야 합니다» · «미르 하나로 통합 했는데 답이 다르면 통합이 안되었다는 이야기 일테니까요».
//   ⚠ 콘앱 ctx 는 cone.html 의 mirAsk 를 그대로 베낀다 — 콘앱이 재료를 하나라도 빼먹으면 여기서 갈린다(2.49 실측: terminalWork 가 늘 null).
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
const vk = FX.voyageKey, v = FX.voyage, info = v.info, tw = FX.terminalWork, ss = FX.shipSpeed, pf = FX.pilotForecast;
let n = 0, bad = 0;
const check = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const norm = (s) => String(s == null ? '(null)' : s).replace(/\s+/g, ' ').trim();

//  컨 — 두 앱 다 «항차 원본 → 미르 컨» 한 벌(toMirContainers)로 편다. 콘앱은 EDI 행에서, 검수앱은 flattenVoyages 로 — 여기서는 같은 원본을 쓴다.
const D = v.discharge || {}, L = v.loading || {};
const comp = Object.assign({}, D.completed || {}, L.completed || {});
const paint = (rows, mode) => M.toMirContainers(rows, mode).map((c) => { const w = c && c.cn ? comp[c.cn] : null; return (w && !c._comp) ? Object.assign({}, c, { _comp: w }) : c; });
const rowsOf = (sec) => Object.values(sec.ediContainers || {});
const cs = paint(rowsOf(D), 'discharge').concat(paint(rowsOf(L), 'loading'));
check('실데이터 — KBTR 2606E 컨 양하+선적', cs.length > 300 && cs.some((c) => c._comp), String(cs.length));

//  검수앱 — 항차 화면이 놓은 재료(VoyagePage publishMirCtx) + 떠 있는 미르 공통 재료(MirFab)
const tallyCtx = () => ({ app: 'tally', smallTalkLast: true, execDevice: true, modeChoice: 'both', countFallback: true, inspector: '연막', isChief: true, chiefData: null, heartbeat: null, portMisData: {}, terminalWork: tw, pilotForecast: pf, shipSpeed: ss, voyages: { [vk]: v }, flat: cs,
  voyageKey: vk, voyage: v, info, mode: 'discharge', containers: cs, compMap: comp, shiftMap: null, bayPairs: null, rfSkip: false, esealBrief: null, photos: null, diagAlerts: [], _trace: {} });
//  콘앱 — cone.html mirAsk 그대로(2.49-01: terminalWork {배코드: 피드}·shipSpeed·pilotForecast)
const coneVoyage = { info, reports: v.reports || {}, discharge: { completed: D.completed || {}, records: D.records || {}, xrayList: D.xrayList || {}, xraySeals: D.xraySeals || {}, held: D.held || {}, luggConfirm: D.luggConfirm || {} }, loading: { completed: L.completed || {}, records: L.records || {}, held: L.held || {} } };
const coneCtx = (extra) => Object.assign({ app: 'cone', containers: cs, cone: { rows: [], dischRows: [], stowRows: [] }, execDevice: true, shiftN: 0, mode: 'discharge', modeLabel: '양하', info, compMap: comp, shiftMap: null, voyage: coneVoyage, vsl: info.vsl || '', vslFull: info.vslFull || '', pier: info.pier || '',
  terminalWork: tw, shipSpeed: ss, pilotForecast: pf, voyageKey: vk, records: { discharge: D.records || {}, loading: L.records || {} }, _trace: {} }, extra || {});

//  ① 공통 질문 — 같은 답이어야 한다(브리핑은 콘앱이 배 이름·【콘】 절을 덧붙이므로 【양하】 본문으로 비교)
const SAME = ['몇시에 끝나', '얼마나 했어', '얼마나 남았어', '실제 진행 상황', '진행 상태', '도선 언제야', '작업 속도', '몇 시간 걸릴까', '리퍼 몇 대', '엑스레이 몇 대', '20피트 몇 대', '접안 현측', '작업 몇 시에 시작했어', '다음 항구 어디야', '해치 몇 개', '시프팅 몇 대', '위험물 몇 대', '마감텔리 수치'];
for (const q of SAME) {
  const a = norm(M.answerOneRaw(q, tallyCtx())), b = norm(M.answerOneRaw(q, coneCtx()));
  check(`«${q}» 두 앱 같은 답`, a === b, `\n      검수앱: ${a.slice(0, 140)}\n      콘앱: ${b.slice(0, 140)}`);
}
{
  const a = norm(M.answerOneRaw('브리핑', tallyCtx())), b = norm(M.answerOneRaw('브리핑', coneCtx()));
  //  검수앱은 열린 탭(양하) 하나, 콘앱은 양하·선적·콘 절을 다 낸다 — 【양하】 본문이 같은지 본다.
  const body = (s) => s.replace(/^.*?【양하】/, '').replace(/【(선적|콘)】.*$/, '').trim();
  check('«브리핑» 【양하】 본문이 같다(콘앱은 배 이름·【선적】·【콘】 절을 덧붙인다)', body(a) && body(a) === body(b), `\n      검수앱: ${body(a).slice(0, 120)}\n      콘앱: ${body(b).slice(0, 120)}`);
}
//  ② 내용 — 터미널 실적을 봤는가(옛 콘앱은 앱 기록만 보고 «아직 시작 전»·앱 대수)
{
  const b = norm(M.answerOneRaw('몇시에 끝나', coneCtx()));
  check('콘앱 «몇시에 끝나» 가 터미널 실적(600대)으로 답한다', /터미널 실적/.test(b) && /600대/.test(b), b.slice(0, 120));
  const t = {}; const p = norm(M.answerOneRaw('실제 진행 상황', coneCtx({ _trace: t })));
  check('콘앱 «실제 진행 상황» 은 브리핑이 아니라 터미널 실황(진행 두 갈래)', t.via === 'progress' && /터미널 실황/.test(p) && !/【양하】/.test(p), `via=${t.via} · ${p.slice(0, 100)}`);
  const b0 = norm(M.answerOneRaw('몇시에 끝나', coneCtx({ terminalWork: null })));
  check('재료를 빼면 갈린다(검사가 헛돌지 않는다)', !/터미널 실적/.test(b0), b0.slice(0, 100));
}
//  ③ cone.html 배선 — 재료 셋을 실제로 넘기는가
const H = fs.readFileSync(path.join(ROOT, 'public/cone.html'), 'utf8');
check('cone.html mirAsk 가 terminalWork·shipSpeed·pilotForecast 를 mc(loadMirCtx) 에서 넘긴다', /terminalWork: \(mc&&mc\.terminalWork\)\|\|null/.test(H) && /shipSpeed: \(mc&&mc\.shipSpeed\)\|\|null/.test(H) && /pilotForecast: \(mc&&mc\.pilotForecast\)\|\|null/.test(H));
check('cone.html 에 옛 길(info.termWork) 이 없다', !/terminalWork: info\.termWork/.test(H));
check('cone.html loadMirCtx 가 terminal_work/{배}·shipSpeed·pilot_forecast/{배} 를 받는다', /g\('terminal_work\/'/.test(H) && /g\('shipSpeed\.json'\)/.test(H) && /g\('pilot_forecast\/'/.test(H));
//  ④ cone.html 의 **실제 loadMirCtx** 를 Response 스텁으로 돌린다 — 2.48~2.49 는 g 가 Response 를 그대로 돌려줘 재료가 전부 빈 객체였다(감사 재현).
//    ctx 를 손으로 베낀 ①~③ 은 이 층을 못 본다. 여기서 mirAsk 가 받는 mc 그대로를 만들어 엔진까지 돌린다.
(async () => {
  const start = H.indexOf('async function loadMirCtx(');
  const end = H.indexOf('\n}\n', start);
  check('cone.html 에서 loadMirCtx 를 찾았다', start > 0 && end > start);
  const fnSrc = H.slice(start, end + 2);
  const code = String(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mirsame_kbtr.json'), 'utf8'));
  const routes = {
    [`voyages/${vk}/info.json`]: info, [`voyages/${vk}/discharge/completed.json`]: D.completed || {}, [`voyages/${vk}/loading/completed.json`]: L.completed || {},
    [`voyages/${vk}/discharge/records.json`]: D.records || {}, [`voyages/${vk}/loading/records.json`]: L.records || {}, [`voyages/${vk}/reports.json`]: v.reports || null,
    [`voyages/${vk}/discharge/xrayList.json`]: D.xrayList || {}, [`voyages/${vk}/discharge/xraySeals.json`]: D.xraySeals || {}, [`voyages/${vk}/discharge/held.json`]: D.held || {},
    [`voyages/${vk}/loading/held.json`]: L.held || {}, [`voyages/${vk}/discharge/luggConfirm.json`]: D.luggConfirm || {},
    'terminal_work/KBTR.json': tw.KBTR, 'shipSpeed.json': ss, 'pilot_forecast/KBTR.json': pf.KBTR || null,
  };
  const hits = [];
  const fbFetchStub = async (p) => { hits.push(p); const d = routes[p]; return (d === undefined) ? { ok: false, status: 404, json: async () => null } : { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(d)) }; };
  const stateStub = { voyageKey: vk, terminalWork: null, pilotForecast: null };
  let mc = null, err = '';
  try {
    const mk = new Function('state', 'fbFetch', 'console', 'let _mirCtxCache=null,_mirCtxKey=null,_mirCtxAt=0;\n' + fnSrc + '\nreturn loadMirCtx;');
    mc = await mk(stateStub, fbFetchStub, { warn() {}, log() {} })();
  } catch (e) { err = e && e.message; }
  check('실제 loadMirCtx 가 돈다', !!mc && !err, err);
  check('재료가 JSON 으로 풀려 있다(Response 아님) — info.vsl·완료·터미널 실적', !!(mc && mc.info && mc.info.vsl === 'KBTR' && Object.keys(mc.compD || {}).length > 50 && mc.terminalWork && mc.terminalWork.KBTR && mc.terminalWork.KBTR.disDone === 371), mc ? JSON.stringify({ vsl: mc.info && mc.info.vsl, compD: Object.keys(mc.compD || {}).length, tw: mc.terminalWork }).slice(0, 160) : '(없음)');
  check('shipSpeed·pilotForecast 도 받는다', !!(mc && mc.shipSpeed && typeof mc.shipSpeed === 'object' && mc.pilotForecast && typeof mc.pilotForecast === 'object'));
  check('요청 14건(항차 11 + 재료 3)', hits.length === 14 && hits.includes('terminal_work/KBTR.json') && hits.includes('shipSpeed.json') && hits.includes('pilot_forecast/KBTR.json'), hits.join(','));
  if (mc) {
    //  mirAsk 3592~ 그대로 ctx 를 짠다(cs 는 위 paint 와 같은 한 벌)
    const comp2 = Object.assign({}, mc.compD || {}, mc.compL || {});
    const voyage2 = { info: mc.info, reports: mc.reports || {}, discharge: { completed: mc.compD || {}, records: mc.recD || {}, xrayList: mc.xrayList || {}, xraySeals: mc.xraySeals || {}, held: mc.heldD || {}, luggConfirm: mc.luggD || {} }, loading: { completed: mc.compL || {}, records: mc.recL || {}, held: mc.heldL || {} } };
    const ctx2 = { app: 'cone', containers: cs, cone: { rows: [], dischRows: [], stowRows: [] }, execDevice: true, shiftN: 0, mode: 'discharge', modeLabel: '양하', info: mc.info, compMap: comp2, shiftMap: null, voyage: voyage2, vsl: mc.info.vsl || '', vslFull: mc.info.vslFull || '', pier: mc.info.pier || '', terminalWork: (mc && mc.terminalWork) || null, shipSpeed: (mc && mc.shipSpeed) || null, pilotForecast: (mc && mc.pilotForecast) || null, voyageKey: vk, records: { discharge: mc.recD || {}, loading: mc.recL || {} }, _trace: {} };
    for (const q of ['몇시에 끝나', '얼마나 했어', '실제 진행 상황']) {
      const a = norm(M.answerOneRaw(q, tallyCtx())), b = norm(M.answerOneRaw(q, ctx2));
      check(`실제 loadMirCtx 재료로 «${q}» 검수앱과 같은 답`, a === b, `\n      검수앱: ${a.slice(0, 120)}\n      콘앱: ${b.slice(0, 120)}`);
    }
  }
  //  ⑤ 콘 작업표가 있을 때 진행 물음이 콘 계산 답에 가로채이지 않는다(감사 실측 «얼마나 남았어» → «콘이 남는 곳(반납)»)
  const coneRows = [{ bay: 5, deck: 8, ele: 0, hold: 2 }, { bay: 7, deck: 4, ele: 2, hold: 0 }];
  for (const q of ['얼마나 남았어', '다 했어', '전체 진행 상황']) {
    const t = {}; const b = norm(M.answerOneRaw(q, coneCtx({ cone: { rows: coneRows, dischRows: [], stowRows: [] }, _trace: t })));
    check(`콘 작업표가 있어도 «${q}» 는 진행 답`, t.via === 'progress' || /터미널|앱 기록|완료/.test(b), `via=${t.via} · ${b.slice(0, 100)}`);
  }
  //  ⑥ 그러면서 콘앱의 정당한 콘 질문은 그대로 콘 답(재감사 — 낱말 게이트가 «전체»·«가져갈 거» 를 잃었었다)
  for (const q of ['전체', '가져갈 거', '돌려줄 거', '5번 베이', '모자란 데', '남는 데']) {
    const t = {}; const b = norm(M.answerOneRaw(q, coneCtx({ cone: { rows: coneRows, dischRows: [], stowRows: [] }, _trace: t })));
    check(`콘 작업표가 있으면 «${q}» 는 콘 답`, t.via !== 'progress' && t.via !== 'coneHelp' && /콘|가감|베이|반납|필요/.test(b) && !/이렇게 물어보세요/.test(b), `via=${t.via} · ${b.slice(0, 100)}`);
  }
  console.log(`\n${bad ? '✗' : '✔'} 두 앱 같은 답 연막검사 ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('✗ 연막검사 자체가 죽었다:', e && e.stack); process.exit(1); });
