// 미르 한 벌 연막검사 (3.41) — 실소스 번들(mirCore.entry → mirAnswer)로 실데이터(KBTR 2606E·NSFR 2617N, 2026-09-10 RTDB)를 돌려 창구 15건·어디서나 배선·회귀를 잰다
//   검수사 확정 2026-09-10: «미르를 하나로» · «앱 어디에든 항상 띄워서 모든 질문을» · «앱이 갖고 있는 자료를 막힘없이»
//   ⚠ 손으로 적은 기대값이 아니라 픽스처 값에서 끌어낸 기대값이다(인계함 3.35-01 교훈 — «항 수·대수는 손으로 적지 마라»).
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }

//  창 흉내 — 엔진은 window.__fbShipBayDict·__mirLexicon 만 본다
global.window = { __mirLexicon: {}, __mirLexiconWrite: () => {}, __fbShipBayDict: {}, dispatchEvent: () => true, addEventListener: () => {} };
global.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };

const M = require(path.resolve(OUT));
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mirone_live_260910.json'), 'utf8'));
let bad = 0; const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };
const has = (a, s) => String(a || '').includes(s);

//  컨은 콘앱이 하는 방식(toMirContainers + 완료·X-RAY 입히기)으로 — 콘앱 배선이 곧 검사 대상이다
function ctxOf(key, mode) {
  const v = FX[key];
  const comp = Object.assign({}, (v.discharge || {}).completed || {}, (v.loading || {}).completed || {});
  const xl = (v.discharge || {}).xrayList || {}; const xs = (v.discharge || {}).xraySeals || {};
  const rows = (m) => Object.values(((v[m] || {}).ediContainers) || {}).map((c) => {
    const r = (((v[m] || {}).records) || {})[c.cn] || {};
    const o = Object.assign({}, c);
    for (const f of ['sl', 'sl_orig', 'sl_src', '_source', 'bl', 'sh', 'tmp', 'rfSet', 'rfAct', 'rfSrc', 'eseal', 'mkcon', 'rfdry', 'bay_actual', 'row_actual', 'tier_actual']) if (r[f] != null && r[f] !== '' && (o[f] == null || o[f] === '')) o[f] = r[f];
    if (!o.wt && r.wt) o.wt = r.wt;
    return o;
  });
  const cs = M.toMirContainers(rows('discharge'), 'discharge').concat(M.toMirContainers(rows('loading'), 'loading')).map((c) => {
    let o = c;
    if (comp[c.cn]) o = Object.assign({}, o, { _comp: comp[c.cn] });
    if (o._mode !== 'loading' && xl[c.cn]) o = Object.assign({}, o, { _xray: true, _xraySeal: xs[c.cn] || null });
    return o;   // ⚠ _ptk 를 여기서 찍지 않는다 — 탭 카드·콘앱 실제 모양(없음)을 그대로 넣어 엔진(_normalize)이 찍는지 잰다(감사 지적)
  });
  return { app: 'tally', smallTalkLast: true, modeChoice: 'both', voyageKey: key, voyage: v, info: v.info, mode, containers: cs, compMap: comp, terminalWork: {}, portMisData: {}, isChief: true };
}
const K = ctxOf('KBTR_2606E', 'discharge'), N = ctxOf('NSFR_2617N', 'discharge');
const ask = (q, c) => { try { return M.answerOne(q, Object.assign({}, c)); } catch (e) { return '⚠ ' + (e && e.stack || e); } };

//  ── 기대값은 픽스처에서 끌어낸다 ──
const kRf = K.containers.find((c) => c.cn === 'FBIU5093426');
T(!!kRf, '픽스처에 FBIU5093426(양하 리퍼) 이 있어야 시험이 선다');
const k0230 = K.containers.filter((c) => String(c.cn).slice(-4) === '0230');
T(k0230.length === 2, `끝네자리 0230 은 두 대여야 한다 (${k0230.length})`);
const nX = Object.keys((FX.NSFR_2617N.discharge || {}).xrayList || {});
T(nX.length === 2, `NSFR xrayList 는 2대 (${nX.length})`);
const kE = K.containers.filter((c) => c._mode === 'loading' && c.fe === 'E').length;

// ── ① 개체 창구 — 끝네자리 + 속성 ─────────────────────────────────────────
{ const a = ask('3426 온도', K); T(has(a, 'FBIU5093426') && has(a, '세팅 온도 기록 없음'), `«3426 온도» → 컨번호와 온도 상태 (${String(a).slice(0, 80)})`); }
{ const a = ask('3426 몇 도야', K); T(has(a, 'FBIU5093426'), '«3426 몇 도야» 도 같은 답'); }
{ const p = M.parseNaturalQuery('3426 온도'); T(p.digits === '3426' && p.entityAttr === 'temp', `온도 낱말이 끝네자리를 지우면 안 된다 (digits=${p.digits} attr=${p.entityAttr})`); }
{ const a = ask('0230 실번호', K); T(has(a, 'BMOU5190230') && has(a, k0230[0].sl || '568854') && has(a, 'HALU2540230'), `«0230 실번호» → 두 대 다, 실번호 포함 (${String(a).slice(0, 100)})`); }
{ const a = ask('0230 중량', K); const w = Number(k0230.find((c) => c.cn === 'BMOU5190230').wt).toLocaleString(); T(has(a, w + 'kg'), `«0230 중량» → ${w}kg`); }
{ const a = ask('0230 비엘 번호', K); const bl = k0230.find((c) => c.cn === 'BMOU5190230').bl; T(bl && has(a, bl), `«0230 비엘 번호» → B/L ${bl}`); }
{ const a = ask('7758 다음 항 어디야', K); T(has(a, 'BEAU2347758') && /환적항|다음 양하항|최종 목적지/.test(String(a)), '«7758 다음 항» → 환적·다음 항'); }
{ const a = ask('0686 엑스레이 대상이야', N); T(has(a, 'NSSU0170686') && has(a, 'X-RAY 대상'), `«0686 엑스레이 대상이야» → 대상 (${String(a).slice(0, 80)})`); }
{ const a = ask('0230 완료했어', K); T(has(a, '완료 ') && !has(a, '호기호기'), `«0230 완료했어» → 완료 시각, «호기호기» 중복 없음 (${String(a).slice(0, 80)})`); }
{ const a = ask('9999 온도', K); T(has(a, '9999') && has(a, '없어요'), '없는 끝네자리는 «없어요»'); }
{ const p = M.parseNaturalQuery('0230'); T(p.digits === '0230' && !p.entityAttr && !p.factQuery, '끝네자리만 치면 창구가 아니다(큰 카드 그대로)'); }

// ── ② 항차 창구 ────────────────────────────────────────────────────────────
{ const a = ask('접안 현측', K); T(has(a, '접안 현측 기록 없음'), `«접안 현측» → 기록 없음(입출항 갈래에 먹히면 안 된다) (${String(a).slice(0, 80)})`); }
{ const a = ask('우현이야 좌현이야', N); T(has(a, '접안 현측'), '«우현이야 좌현이야» → 현측 답'); }
{ const a = ask('작업 몇 시에 시작했어', K); T(has(a, '10:05') && !has(a, '지금은'), `«작업 몇 시에 시작했어» → 터미널 시작 10:05, 현재 시각 아님 (${String(a).slice(0, 80)})`); }
{ const a = ask('양하 언제 끝났어', K); T(has(a, '양하 완료'), '«양하 언제 끝났어» → 실적(양하 완료 시각)'); }
{ const a = ask('몇 시쯤에 끝나', K); T(/예상 완료|끝났|남은/.test(String(a)), '«몇 시쯤에 끝나» 는 종전대로 예측(ETA)'); }
{ const a = ask('마감텔리 수치', Object.assign({}, K, { computeTallyData: (v) => ({ totals: { dis: { n: 102, F: { 20: 37, 40: 0, HC: 65, 45: 0 }, E: { 20: 0, 40: 0, HC: 0 } }, load: { n: 232, F: { 20: 202, 40: 0, HC: 0, 45: 0 }, E: { 20: 30, 40: 0, HC: 0 } }, shift: { n: 0 } }, osIn: { rows: [] }, osOut: { rows: [] }, rfIn: [], rfOut: [], damage: { dmIn: [], dmOut: [] } }) })); T(has(a, '양하 102대') && has(a, '선적 232대'), `«마감텔리 수치» → 양하 102·선적 232 (${String(a).slice(0, 80)})`); }
{ const a = ask('마감텔리 수치', K); T(has(a, '검수앱 미르에게'), '계산 함수를 안 실은 앱(콘앱)은 검수앱으로 안내'); }
{ const a = ask('엠티실 몇 대 남았어', K); T(has(a, `엠티 ${kE}대`) && has(a, '남은 것'), `«엠티실 몇 대 남았어» → 엠티 ${kE}대·남은 것 (${String(a).slice(0, 80)})`); }
{ const a = ask('해치커버 열었어', K); T(/해치/.test(String(a)), '«해치커버 열었어» → 해치 답(홈에만 있던 것)'); }
{ const a = ask('커트씰 기록', N); T(has(a, 'X-RAY 대상 2대') && has(a, 'NSSU0170686'), '«커트씰 기록» → 대상 2대 나열'); }
{ const a = ask('보류 뭐 있어', K); T(has(a, '보류'), '«보류 뭐 있어» → 보류 답'); }
{ const a = ask('임시창고 뭐 있어', K); T(has(a, '임시창고'), '«임시창고 뭐 있어» → 창고 답'); }
{ const a = ask('환적 화물 몇 대', K); T(/환적항|다음 양하항|없음/.test(String(a)), '«환적 화물 몇 대» → 환적 집계'); }
{ const a = ask('규격초과 치수', K); T(has(a, '규격초과'), '«규격초과 치수» → OOG 답'); }
{ const a = ask('특수제작컨 있어', K); T(has(a, '특수제작컨'), '«특수제작컨 있어» → 답'); }

// ── ②-B 감사·2차 시뮬이 잡은 것 — 고친 뒤 다시 새지 않게 ────────────────────────
{ const a = ask('얼마나 했어', K); T(!has(a, '앱 검수 기록 없음') && /102|양하/.test(String(a)), `_ptk 없는 컨(탭 카드·콘앱 모양)에서도 진행 답이 산다 (${String(a).slice(0, 80)})`); }
{ const a = ask('UN 1805', K); T(has(a, 'UN1805') && !/없음/.test(String(a)), `«UN 1805» 는 위험물 유엔번호다 — 끝네자리로 새면 안 된다 (${String(a).slice(0, 80)})`); }
{ const a = ask('미르 점심 먹었어?', K); T(a && !has(a, '미르예요'), `«미르 점심 먹었어?» 는 인사가 아니라 잡담이다 (${String(a).slice(0, 60)})`); }
{ const a = ask('시간당 몇 대 했어', K); T(has(a, '시간당'), `«시간당 몇 대 했어» 는 페이스 답 (${String(a).slice(0, 60)})`); }
{ const a = ask('데미지 현황', K); T(!/앱 검수 기록 기준|완료 \d+ \/ 전체/.test(String(a)), `«데미지 현황» 이 진행률로 새면 안 된다 (${String(a).slice(0, 60)})`); }
{ const a = ask('브리핑', N); T(has(a, '통과화물'), `NSFR 브리핑에 «통과화물 혼재» 경고가 살아 있다 (${String(a).slice(0, 120)})`); }
{ const a = ask('40피트 풀', K); T(a == null, `카드 화면(작업창)에서 조건만 있는 말은 null — 카드가 답한다 (${String(a).slice(0, 60)})`); }
{ const a = ask('40피트 풀', Object.assign({}, K, { countFallback: true })); T(has(a, '📊'), '떠 있는 미르는 개수로 답한다'); }
{ const a = ask('마감텔리 어디서 만들어', K); T(!has(a, '마감텔리 수치(지금 기준)'), `«어디서 만들어» 는 기능 위치 질문 — 창구가 가로채면 안 된다 (${String(a).slice(0, 60)})`); }
{ const a = ask('KBTR 자료 다 있어', Object.assign({}, K, { isChief: false })); T(/수석 검수사에게/.test(String(a)) && !/자료가 아직입니다|출력만 하면/.test(String(a)), `검수원에게는 유무 한 줄 + 수석 유도만(1.69) — 수석용 전문이 나가면 안 된다 (${String(a).slice(0, 80)})`); }
{ const home = { app: 'tally', smallTalkLast: true, modeChoice: 'both', countFallback: true, voyages: FX, flat: [...K.containers.map((c) => Object.assign({}, c, { voyageKey: 'KBTR_2606E', vsl: 'KBTR', voy: '2606E' }))], isChief: true, chiefData: {} };
  const a = ask('0230', home); T(has(a, 'BMOU5190230') && has(a, 'KBTR'), `떠 있는 미르는 배 없이 끝네자리를 전 항차에서 찾는다 (${String(a).slice(0, 80)})`);
  const b = ask('0230', Object.assign({}, home, { countFallback: false })); T(b == null, '홈 통합검색은 끝네자리에 글을 안 낸다 — 카드가 답한다'); }

{ const home = { app: 'tally', smallTalkLast: true, modeChoice: 'both', countFallback: true, voyages: FX, flat: [...K.containers.map((c) => Object.assign({}, c, { voyageKey: 'KBTR_2606E', vsl: 'KBTR', voy: '2606E' }))], isChief: true, chiefData: {} };
  const a = ask('3426 온도', home); T(has(a, 'FBIU5093426') && has(a, '세팅 온도 기록 없음'), `떠 있는 미르는 배 없이도 «3426 온도» 를 전 항차에서 찾아 답한다 (${String(a).slice(0, 80)})`); }
{ const p = M.parseNaturalQuery('FBIU5093426 온도'); T(p.digits === '3426' && p.entityAttr === 'temp', `컨번호 전체+속성도 창구다 (digits=${p.digits})`); }
{ const a = ask('해치 보고 어디서 해', K); T(!/해치 개폐 보고가 아직|열림|닫힘/.test(String(a)), `«해치 보고 어디서 해» 는 기능 위치 질문 (${String(a).slice(0, 60)})`); }

// ── ③ 회귀 — 종전 답이 그대로인가 · 오답이 사라졌는가 ───────────────────────
{ const a = ask('리퍼 몇 대야', K); T(has(a, '리퍼: 1대'), `«리퍼 몇 대야» 그대로 (${String(a).slice(0, 40)})`); }
{ const a = ask('XRAY 몇 대야', N); T(has(a, 'X-RAY: 2대'), `«XRAY 몇 대야» → 2대(콘앱 ctx 구멍 메움) (${String(a).slice(0, 40)})`); }
{ const p = M.parseNaturalQuery('OWBH 1호기 선수 2호기 선미'); T(p.digits !== '12' && !p.digits, `«N호기» 숫자가 끝네자리로 새면 안 된다 (digits=${p.digits})`); }
{ const a = ask('OWBH 1호기 선수 2호기 선미', K); T(!has(a, '끝네자리 12'), '«1호기 선수 2호기 선미» 가 끝네자리 12 로 답하면 안 된다'); }
{ const a = ask('브리핑', K); T(has(a, '양하 평택'), '«브리핑» 그대로'); }
{ const a = ask('얼마나 남았어', K); T(/남은|완료/.test(String(a)), '«얼마나 남았어» 그대로'); }
{ const a = ask('미르야', K); T(has(a, '미르예요'), '«미르야» 인사'); }
{ const a = ask('코너캐스팅이 뭐야', K); T(has(a, 'Corner Casting'), '뜻 질문 그대로'); }
{ const a = ask('1호기 김판석 2호기 이종부', K); T(has(a, '김판석'), '호기–검수원 등록 확인 글'); }
{ const a = ask('실번호 의심', K); T(a && !/못 배웠/.test(String(a)), '«실번호 의심» → 실 점검 답(작업창만 되던 것)'); }
{ const a = ask('점심 먹었어', Object.assign({}, K)); T(a && /먹었|참치|츄르|열빙어/.test(String(a)), '잡담 그대로'); }
{ const p = M.parseNaturalQuery('20피트 몇 대야'); T(p.size === '20' && !p.digits, '단위 붙은 숫자(20피트)는 끝네자리가 아니다'); }
{ const p = M.parseNaturalQuery('-18도 리퍼'); T(!p.digits, '«-18도» 는 끝네자리가 아니다'); }
{ const p = M.parseNaturalQuery('도선이 08시 30분인데 작업시간이 08시 30분 가능한가요?'); T(!p.digits, '시각(0830)은 끝네자리가 아니다(1.22 그대로)'); }
{ const p = M.parseNaturalQuery('MCSC 633N 0320'); T(p.digits === '0320', '항차 토큰 뒤 끝네자리는 그대로'); }

// ── ④ 배선 — 다섯 입구가 같은 함수를 부르는가(소스) ─────────────────────────
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
T(/answerOneRaw\(query,/.test(src('src/components/SearchPanel.jsx')), '작업창(SearchPanel)이 answerOneRaw 를 부른다');
T(/answerOneRaw\(q,/.test(src('src/pages/VoyagePage.jsx')), '양하선적 탭 카드(VoyagePage)가 answerOneRaw 를 부른다');
T(/answerOneRaw\(Q,/.test(src('src/pages/GlobalSearchPage.jsx')), '홈(GlobalSearchPage)이 answerOneRaw 를 부른다');
T(/askMir\(t, ctx, \(cq, trace\) => answerOneRaw\(cq/.test(src('src/components/MirFab.jsx')), '떠 있는 미르(MirFab)가 askMir(규칙 → 약하면 모델) 를 부르고 규칙은 answerOneRaw 한 벌이다(3.42)');
T(/<MirFab /.test(src('src/App.jsx')), 'App 이 MirFab 을 띄운다(어디서나)');
T(/publishMirCtx\(\{/.test(src('src/pages/VoyagePage.jsx')), '항차 화면이 떠 있는 미르에게 재료를 놓는다');
T(/export \{ answerOne, answerOneRaw \} from '\.\/mirAnswer\.js'/.test(src('src/mirCore.entry.js')), '콘앱 번들 진입점이 mirAnswer 한 벌을 낸다');
T(/voyages\/'\+k\+'\/discharge\/xrayList\.json/.test(src('public/cone.html')) && /_xray:true/.test(src('public/cone.html')), '콘앱이 xrayList 를 받아 컨에 입힌다');
T(/const voyage=\{ info:info, reports:/.test(src('public/cone.html')), '콘앱이 항차 원본 모양(voyage)을 미르에게 넘긴다');
T(!/generateLocalAnswer\(/.test(src('src/pages/GlobalSearchPage.jsx')) && !/generateBriefing\(/.test(src('src/pages/GlobalSearchPage.jsx')), '홈에 옛 답 갈래(본체·브리핑 직접 호출)가 남지 않았다');
T(!/generateBriefing\(modeCs/.test(src('src/components/SearchPanel.jsx')), '작업창에 옛 브리핑 갈래가 남지 않았다');

if (bad) { console.error(`✗ 미르 한 벌 연막검사 ${bad}건 실패`); process.exit(1); }
console.log('✓ 미르 한 벌 연막검사 통과 — 창구 15건·회귀·배선 (실데이터 KBTR 2606E·NSFR 2617N)');
