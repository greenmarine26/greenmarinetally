// 미르 배 고르기·기능 이름 관문·항만 용어 연막검사 (TallyOne 4.35-02) — 실소스 번들(mirCore.entry) + 실제 항차 info 13건(2026-10-19 07:27 읽기 전용 GET)으로 잰다.
//   검수사 2026-10-19 «사용자에게 선박명을 치라고 가끔 그러는데 갑자기 생각이 안날수도 있습니다. 그때 대상들을 보여주면 바로 알수 있습니다» ·
//   «메뉴얼에 있는데 질문 위치가 어디냐에 따라 답을 하기도 하고 못하기도 합니다» · «항만 기본 지식도 마찬가지로 알려줄수 있어야 합니다».
//   node tools/smoke_mirshippick.cjs <mirCore 번들> <저장소 루트>
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {}, __mirLexicon: {}, __mirLexiconWrite() {} };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
global.fetch = () => Promise.reject(new Error('연막: 네트워크 없음'));
const M = require(path.resolve(OUT));
const voyages = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/voyages_info_261019.json'), 'utf8'));
const NOW = new Date('2026-10-19T07:30:00+09:00').getTime();
let n = 0, bad = 0;
const T = (cond, name, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

console.log('① 배 목록 — 일하는 배 먼저, 곧 시작할 배 그다음');
const codes = M.shipPickCodes(voyages, NOW);
T(codes[0] === 'MCAT', '일하는 배(MCAT)가 맨 앞', codes.join(','));
T(codes.length >= 2 && codes.length <= 6, '대기 중인 배가 뒤따르고 6척을 넘지 않는다', codes.join(','));
T(M.shipPickCodes({}, NOW).length === 0 && M.shipPickCodes(null, NOW).length === 0, '항차가 없으면 빈 목록(터지지 않는다)');

console.log('② 배를 되묻는 말마다 단추 — 홈(떠 있는 미르·통합검색)');
const ASKS = ['남은 대수 알려줘', '출항 언제야', '접안 현측', '3426 온도', '갱 2개로 분배', '김성일 몇 개 했어', '우리가 작업해야해', '브리핑해줘'];
for (const q of ASKS) {
  M._mirThreadReset();
  const ctx = { app: 'tally', voyages, flat: [], voyageKey: '', inspector: '연막', accepted: true, _now: NOW, _utterAt: NOW };
  const t = {}; let a = null; try { a = M.answerOneRaw(q, { ...ctx, _trace: t }); } catch (e) { a = 'ERR ' + e.message; }
  const fo = M.mirThreadCommit(q, a, t.via || '', ctx, NOW);
  T(M.isShipAskText(a), `«${q}» 는 배를 되묻는다`, norm(a).slice(0, 40));
  T(fo.chips.length >= 2 && fo.chips[0].startsWith('MCAT '), `«${q}» 단추가 붙는다 — MCAT 먼저`, fo.chips.join(' / '));
  T(fo.confirm === '' && /생각 안 나/.test(fo.line), `«${q}» «맞게 알아들었나요?» 를 붙이지 않고 고르라고 말한다`, fo.line);
  const r = M.mirThreadResolve(fo.chips[0], ctx, NOW + 1000);
  T(r.kind === 'pick' && r.direct == null && r.q === fo.chips[0], `«${q}» 단추를 누르면 그 말 그대로 묻는다`, `${r.kind} ${r.q}`);
}

console.log('③ 단추 없는 자리는 종전 그대로');
{
  M._mirThreadReset();
  const ctx = { app: 'tally', voyageKey: '', inspector: '연막', _now: NOW };   // 항차 목록이 없는 창구(항차 화면 안) — 단추 없음
  const fo = M.mirThreadCommit('남은 대수 알려줘', '어느 배 말씀인지 배 이름을 붙여 주시면 바로 답합니다.', '', ctx, NOW);
  T(!(fo.chips || []).some((c) => /^MCAT /.test(c)), '항차 목록이 없으면 배 단추를 만들지 않는다(종전 한 마디)', (fo.chips || []).join('/'));
  M._mirThreadReset();
  const c2 = { app: 'tally', voyages, voyageKey: '', inspector: '연막', _now: NOW };
  const fo2 = M.mirThreadCommit('몇 시에 끝나', '📭 ARTOTINA — 컨 자료가 아직 안 왔어요.', '', c2, NOW);
  T(!(fo2.chips || []).some((c) => /^MCAT /.test(c)), '배를 되묻지 않은 답에는 배 단추를 붙이지 않는다', (fo2.chips || []).join('/'));
  const pc = M.shipPickChips('OBWH·ATPR 중 어느 배요?', '출항 언제야', voyages, NOW);
  T(pc[0] === 'OBWH 출항 언제야' && pc[1] === 'ATPR 출항 언제야', '같은 거리 두 배를 되물으면 그 두 배가 먼저', pc.join('/'));
  const pw = M.shipPickChips('x', '작업중인 선박 언제 끝나', voyages, NOW);
  T(pw[0] === 'MCAT 언제 끝나', '«작업중인 선박» 말은 배 코드로 바꿔 단추를 만든다', pw[0]);
}

console.log('④ 기능 이름 관문 — 항차를 열었든 아니든 같은 매뉴얼 답');
{
  const home = { app: 'tally', voyages, flat: [], voyageKey: '', inspector: '연막', accepted: true, smallTalkLast: true, isChief: true };
  const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mirsame_kbtr.json'), 'utf8'));
  const inShip = { app: 'tally', voyages, flat: [], voyageKey: FX.voyageKey, voyage: FX.voyage, info: FX.voyage.info, vsl: FX.voyage.info.vsl, mode: 'discharge', containers: [], inspector: '연막', accepted: true, smallTalkLast: true, isChief: true };
  const first = (s) => norm(s).split(' 헤더|  ')[0].slice(0, 30);
  for (const q of ['LOLO 탭 어디 있어', 'X-RAY 탭 어디 있어', '진행·마감 사용법 알려줘', '콜사인 겹침 사용법 알려줘', '카고플랜 어떻게 써', '풀 리퍼 사진 촬영 어디 있어']) {
    const t1 = {}, t2 = {};
    const a1 = M.answerOneRaw(q, { ...home, _trace: t1 }), a2 = M.answerOneRaw(q, { ...inShip, _trace: t2 });
    T(a1 === a2 && /^📍/.test(norm(a1)) && t1.via === 'featureHelp', `«${q}» 홈과 항차 화면이 같은 매뉴얼 답`, `${first(a1)} | ${first(a2)}`);
  }
  for (const q of ['FR 어디 있어', '리퍼 몇 대']) {
    const a2 = M.answerOneRaw(q, { ...inShip, _trace: {} });
    T(a2 == null || !/^📍 (FR|리퍼|LOLO)/.test(norm(a2)) || /\d/.test(norm(a2)), `«${q}» 컨 조회는 관문이 가로채지 않는다`, norm(a2).slice(0, 50));
  }
}

console.log('⑤ 항만 기본 용어 — 어디서 물어도 정의가 나온다');
{
  const home = { app: 'tally', voyages, flat: [], voyageKey: '', inspector: '연막', accepted: true, smallTalkLast: true, isChief: true };
  const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mirsame_kbtr.json'), 'utf8'));
  const inShip = { app: 'tally', voyages, flat: [], voyageKey: FX.voyageKey, voyage: FX.voyage, info: FX.voyage.info, vsl: FX.voyage.info.vsl, mode: 'discharge', containers: [], inspector: '연막', accepted: true, smallTalkLast: true, isChief: true };
  const TERMS = ['FEU 뭐야', '안벽이 뭐야', '예선이란', 'QC 뭐야', 'YT 뭐야', '탠덤이 뭐야', '하역이 뭐야', '스토위지 뭐야', '벌크선 뭐야', '컨테이너선 뭐야', '피더선 뭐야', '모선이 뭐야', 'ATB 뭐야', '게이트 뭐야', '통관이 뭐야', '검역이 뭐야', '제상이 뭐야', '위험물 뭐야', '홀드가 뭐야', '4.1 인화성 고체 뭐야', '도선사가 뭐야', '도선이 뭐야', '도선이란'];
  for (const q of TERMS) {
    const t1 = {}, t2 = {};
    const a1 = M.answerOneRaw(q, { ...home, _trace: t1 }), a2 = M.answerOneRaw(q, { ...inShip, _trace: t2 });
    T(/^📖/.test(norm(a1)) && norm(a1) === norm(a2) && !M.isWeakAnswer(q, a1, t1), `«${q}» 홈과 항차 화면이 같은 정의`, `${norm(a1).slice(0, 24)} | ${norm(a2).slice(0, 24)} | via=${t1.via}`);
  }
  const t3 = {}; const a3 = M.answerOneRaw('도선 몇 시야', { ...home, _trace: t3 });
  T(M.isShipAskText(a3), '«도선 몇 시야» 는 종전대로 배를 묻는다(시각 질문은 그대로)', norm(a3).slice(0, 40));
  const t4 = {}; const a4 = M.answerOneRaw('사용법 알려줘', { ...home, _trace: t4 });
  T(/^📍 사용 매뉴얼/.test(norm(a4)) && !M.isWeakAnswer('사용법 알려줘', a4, t4), '«사용법 알려줘» 홀로는 매뉴얼 안내이고 모델로 새지 않는다', norm(a4).slice(0, 30));
}

console.log('⑥ 4.37-01 — 배를 안 댄 «지금 항차 …» 는 일하는 배 · 번역문으로 다시 돌릴 때도 엔진이 배를 고른다');
{
  //  검수사 2026-10-19 13:08 «지금 항차 작업시간이 얼마나 될꺼 같아? 미르가 답변이 전과 같네요. 지정된 선박을 모르면 작업중인 선박이 우선이고 대상이 여러대 이면 선박을 선택할수있는 버튼…»
  //  실측 13:05 — 번역 «몇 시쯤에 끝나»(0.8)인데 배를 몰라 자료 답(AI)으로 빠졌다. 일하는 배가 한 척(픽스처 07:30 = MCAT)이면 그 배, 여럿이면 되묻고 단추.
  const _realNow = Date.now; Date.now = () => NOW;
  try {
    const home = { app: 'tally', voyages, flat: [], voyageKey: '', inspector: '연막', accepted: true, smallTalkLast: true, _now: NOW, _utterAt: NOW };
    const ORIG = '지금 항차 작업시간이 얼마나 될꺼 같아?';
    const sc = M.pickShipCtx(ORIG, voyages, null);
    T(sc && sc.key && /^MCAT_/.test(sc.key), '«지금 항차 작업시간이 얼마나 될꺼 같아?» — 화면이 일하는 배 MCAT 를 고른다', sc ? sc.key : 'null');
    for (const q of ['작업시간이 얼마나 걸려', '언제쯤 끝날까', '이번 항차 몇 시에 끝나']) {
      const s2 = M.pickShipCtx(q, voyages, null);
      T(s2 && /^MCAT_/.test(s2.key), `«${q}» — 일하는 배 MCAT`, s2 ? s2.key : 'null');
    }
    M._mirThreadReset();
    const t1 = {}; const a1 = M.answerOneRaw('몇 시쯤에 끝나', { ...home, _trace: t1 });
    //  감사 — 픽스처가 info 뿐이라 «📭» 로도 통과하지 않게, 화면이 배를 골라 넘긴 «MCAT 몇 시쯤에 끝나» 답과 글자까지 같은지 잰다
    const qx = 'MCAT 몇 시쯤에 끝나'; const ax = M.answerOneRaw(qx, { ...home, shipCtx: M.pickShipCtx(qx, voyages, null), _trace: {} });
    T(a1 && ax && norm(a1) === norm(ax) && !M.isShipAskText(a1), '번역문 «몇 시쯤에 끝나» 를 배 없이 돌려도 엔진 답 = 화면이 MCAT 를 골라 물은 답(종전엔 «어느 배 말씀인지»)', norm(a1).slice(0, 60));
    //  감사 오탐 — 근무 시간·다른 «얼마나 걸려»·지난 일·«선박이 항차» 는 일하는 배를 고르지 않는다
    for (const q of ['작업 시간 몇 시간이야', '작업시간이 몇 시간이야', '점심 작업 시간 몇 시부터야', '오늘 작업 시간 몇 시까지야', '서울까지 얼마나 걸려', '집까지 차로 얼마나 걸려', '라면 끓이는데 얼마나 걸려', '어제 작업 얼마나 걸렸어', '지난 항차 얼마나 걸렸어', '선박이 항차 바뀌었어']) {
      const sx = M.pickShipCtx(q, voyages, null);
      const ay = M.answerOneRaw(q, { ...home, _trace: {} });
      T(sx === null && !/^(?:📭\s*)?(?:MCAT|ARTOTINA)\b|남은\s*\d+\s*대/.test(norm(ay)), `«${q}» — 일하는 배 한 척으로 답하지 않는다(감사 오탐 · «오늘 작업 선박 5척» 같은 여러 배 답은 종전 그대로)`, `${sx ? sx.key : 'null'} | ${norm(ay).slice(0, 40)}`);
    }
    for (const q of ['얼마나 걸려', '작업 얼마나 걸릴까', '얼마나 더 걸려']) {
      const sx = M.pickShipCtx(q, voyages, null);
      T(sx && /^MCAT_/.test(sx.key), `«${q}» — 일하는 배 MCAT`, sx ? sx.key : 'null');
    }
    //  콘앱 ctx 는 엔진이 배를 고르지 않는다(콘앱 배 고르기는 cone.html mirEnsureShip 한 벌)
    const ac = M.answerOneRaw('몇 시쯤에 끝나', { ...home, app: 'cone', _trace: {} });
    T(!/MCAT|ARTOTINA/.test(norm(ac)), '콘앱 ctx(app cone) 에서는 엔진이 일하는 배를 고르지 않는다', norm(ac).slice(0, 40));
    //  감사 — 엔진이 고른 배도 화면 경로처럼 «… 로 답했어요» 한 줄이 붙는다(선박코드 고치기보다 먼저 고른다)
    const ak = M.answerOneRaw('KBTR 출항 언제야', { ...home, _trace: {} });
    const sk = M.pickShipCtx('KBTR 출항 언제야', voyages, null);
    const akS = M.answerOneRaw('KBTR 출항 언제야', { ...home, shipCtx: sk, _trace: {} });
    T(/로 답했어요/.test(norm(ak)) && norm(ak) === norm(akS), '«KBTR 출항 언제야» — 엔진 경로도 화면 경로와 같은 답 · «… 로 답했어요» 한 줄', norm(ak).slice(-30));
    //  단추 문구에서 «이번 항차는» 의 토씨까지 뺀다
    const pp = M.shipPickChips('어느 배 말씀인지', '이번 항차는 언제 끝나', voyages, NOW);
    T(pp[0] === 'MCAT 언제 끝나', '«이번 항차는 언제 끝나» 단추는 «MCAT 언제 끝나»', pp[0]);
    for (const q of ['남은 대수 알려줘', '출항 언제야', '도선 몇 시야']) {
      const a2 = M.answerOneRaw(q, { ...home, _trace: {} });
      T(M.isShipAskText(a2), `«${q}» 는 종전대로 배를 묻는다(일하는 배를 마음대로 고르지 않는다)`, norm(a2).slice(0, 40));
    }
    T(M.isShipAskText('일 자료는 배 이름을 붙여서 물어봐 주세요.') && M.isShipAskText('배 이름을 붙여 물어봐 주세요'), '모델 답 «배 이름을 붙여서 물어봐 주세요» 도 배를 되묻는 답이다(단추가 붙는다)');
    const pc = M.shipPickChips('배 이름을 붙여서 물어봐 주세요.', ORIG, voyages, NOW);
    T(pc[0] === 'MCAT 작업시간이 얼마나 될꺼 같아?', '단추는 «MCAT 작업시간이 얼마나 될꺼 같아?» — «지금 항차» 를 배 코드로 바꾼다', pc.join(' / '));
    //  일하는 배가 둘이면 고르지 않고 되묻는다 + 두 배 단추
    const mk = Object.entries(voyages).find(([k]) => /^MCAT_/.test(k));
    const two = { ...voyages, ZZTS_0001E: { ...mk[1], info: { ...mk[1].info, vsl: 'ZZTS', vslFull: 'ZZ TEST' } } };
    T(M.pickShipCtx(ORIG, two, null) === null, '일하는 배가 둘이면 화면이 고르지 않는다');
    M._mirThreadReset();
    const c2 = { ...home, voyages: two };
    const t3 = {}; const a3 = M.answerOneRaw('몇 시쯤에 끝나', { ...c2, _trace: t3 });
    const fo3 = M.mirThreadCommit(ORIG, a3, t3.via || '', c2, NOW);
    T(M.isShipAskText(a3) && fo3.chips.length >= 2 && fo3.chips.some((c) => /^MCAT /.test(c)) && fo3.chips.some((c) => /^ZZTS /.test(c)), '둘이면 «어느 배» 로 되묻고 두 배 단추를 붙인다', `${norm(a3).slice(0, 30)} | ${fo3.chips.join(' / ')}`);
    //  열린 항차가 있으면 그 항차 — 엔진이 덮지 않는다
    const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mirsame_kbtr.json'), 'utf8'));
    const t4 = {}; const a4 = M.answerOneRaw('몇 시쯤에 끝나', { ...home, voyageKey: FX.voyageKey, voyage: FX.voyage, info: FX.voyage.info, vsl: FX.voyage.info.vsl, mode: 'discharge', containers: [], _trace: t4 });
    T(!/MCAT|ARTOTINA/.test(norm(a4)), '항차 화면 안(열린 항차 KBTR)에서는 그 항차로 답한다(일하는 배로 바꾸지 않는다)', norm(a4).slice(0, 50));
  } finally { Date.now = _realNow; }
}

console.log('⑦ 4.37-02 — «어디다 올려» 입말 · 두 글자 기능 이름(«예보») 도 어느 화면에서든 매뉴얼 답 · 자료 질문은 가로채지 않는다');
{
  //  검수사 2026-10-19 16:56 «일조나 연태 예보는 어디다 올려야 하지?» → 규칙 답 없음 → 클로드 자료 답(설명서 안 봄) — 17:01 «분명있는기능은 다 답하게 해놓지 않았나요»
  //  항차 ctx 는 실컨을 싣는다(감사 — 컨이 비어 있으면 «FR·DG 어디다 넣어» 같은 자료 답 가로채기를 못 잡는다)
  const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mirsame_kbtr.json'), 'utf8'));
  const D = FX.voyage.discharge || {}, L = FX.voyage.loading || {};
  const rowsOf = (sec) => Object.values(sec.ediContainers || {});
  const kcs = M.toMirContainers(rowsOf(D), 'discharge').concat(M.toMirContainers(rowsOf(L), 'loading'));
  const homeC = { app: 'tally', voyages, flat: [], voyageKey: '', inspector: '연막', accepted: true };
  const voyC = { app: 'tally', smallTalkLast: true, modeChoice: 'both', countFallback: true, voyages: { [FX.voyageKey]: FX.voyage }, flat: kcs, voyageKey: FX.voyageKey, voyage: FX.voyage, info: FX.voyage.info, vsl: FX.voyage.info.vsl, mode: 'discharge', containers: kcs, compMap: {}, diagAlerts: [], inspector: '연막', accepted: true };
  const ask = (q, c) => { M._mirThreadReset(); const t = {}; const a = M.answerOneRaw(q, { ...c, _trace: t }); return { a, t, first: String(a == null ? '' : a).split('\n')[0] }; };
  for (const q of ['일조나 연태 예보는 어디다 올려야 하지?', 'RZOR 일조나 연태 예보는 어디다 올려야 하지?', '예보 어디다 넣어', '연태 예보 어디 올려', '카톡 예보 어디에 올려', '물량 예보 어디에다 붙여']) {
    for (const [nm, c] of [['홈', homeC], ['항차', voyC]]) {
      const r = ask(q, c);
      T(r.t.via === 'featureHelp' && /물량 예보 붙여넣기/.test(r.first) && !M.isWeakAnswer(q, r.a, r.t), `${nm} «${q}» — 📋 물량 예보 붙여넣기 매뉴얼(강한 답 · 모델로 안 감)`, `${r.t.via} | ${norm(r.a).slice(0, 40)}`);
    }
  }
  //  자료 질문·다른 기능 이름이 든 말은 매뉴얼 강한 답으로 가로채지 않는다(감사 A-1·A-2) — 실컨 항차(KBTR) · FR 11대 항차(SWTD 9013E)
  for (const q of ['FR 어디다 넣어', 'DG 어디 올려', 'DG 어디다 넣어', 'XRAY 어디 올려', '리퍼 어디다가 실어', '엠티 어디다 넣어', '4777 어디다 올려', '위험물 어디다 넣어']) {
    const r = ask(q, voyC);
    T(!(r.t.via === 'featureHelp' && !M.isWeakAnswer(q, r.a, r.t)) && r.t.via !== 'howTo', `항차 «${q}» — 자료 질문은 종전 자료 길(매뉴얼로 가로채지 않음)`, `${r.t.via || ''} | ${norm(r.a).slice(0, 34)}`);
  }
  for (const q of ['장비 보고 어디다 올려', '도선 예보 어디다 올려', '취소 리스트 어디다 올려', '일기 예보 어디다 올려', '마감텔리 어디다 올려', '보류 어디다 넣어']) {
    for (const [nm, c] of [['홈', homeC], ['항차', voyC]]) {
      const r = ask(q, c);
      T(!(r.t.via === 'featureHelp' && !M.isWeakAnswer(q, r.a, r.t)), `${nm} «${q}» — 강한 매뉴얼 답으로 단정하지 않는다(모델이 다시 본다)`, `${r.t.via || ''} | ${norm(r.a).slice(0, 34)}`);
    }
  }
  {
    const fr = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/frmark_swtd.json'), 'utf8'));
    const rows = (x) => Array.isArray(x) ? x : Object.values(x || {});
    const cs = M.toMirContainers(rows(fr.discharge), 'discharge').concat(M.toMirContainers(rows(fr.loading), 'loading'));
    const info = { vsl: 'SWTD', vslFull: 'SWTD', voy: '9013E' };
    const v = { info, discharge: { ediContainers: fr.discharge }, loading: { ediContainers: fr.loading } };
    const c = { app: 'tally', smallTalkLast: true, modeChoice: 'both', countFallback: true, inspector: '연막', voyages: { SWTD_9013E: v }, flat: cs, voyageKey: 'SWTD_9013E', voyage: v, info, mode: 'loading', containers: cs, compMap: {}, diagAlerts: [] };
    const r = ask('FR 어디다 넣어', c);
    T(/FR\s*11대/.test(r.first), 'SWTD 9013E «FR 어디다 넣어» — 종전 자료 답 «FR 11대 — 베이 …» 그대로', norm(r.a).slice(0, 40));
  }
  //  재감사 C-1 — 느슨한 관문이 매뉴얼로 답한 말은 «못 알아들은 말»(gm-mir-miss → mir_misses)로 적히지 않는다(접수된 질문 accepted)
  {
    const ev = []; const _d = global.window.dispatchEvent;
    global.window.dispatchEvent = (e) => { ev.push(e && e.type); return true; };
    try {
      for (const q of ['일조나 연태 예보는 어디다 올려야 돼?', '연태 예보는 어디 올려', '일조 예보는 어디다 올려야 해']) {   // 앞에서 안 물은 말 — 같은 말은 미답 기록이 한 번만 나간다
        ev.length = 0; const r = ask(q, { ...homeC, accepted: true });
        T(r.t.via === 'featureHelp' && !ev.includes('gm-mir-miss'), `홈 «${q}» — 매뉴얼로 답하고 미답 기록(gm-mir-miss)은 남기지 않는다`, `${r.t.via} | 사건 ${ev.join(',') || '없음'}`);
      }
    } finally { global.window.dispatchEvent = _d; }
  }
  { const r = ask('예보 어디서 봐', homeC);
    T(r.t.via === 'howTo', '«예보 어디서 봐» 는 종전 그대로 약한 답(howTo) — 두 글자 열쇠는 «올려·넣어» 꼴만', `${r.t.via} | ${norm(r.a).slice(0, 30)}`); }
}

console.log(`\n${bad ? '✗' : '✔'} 미르 배 고르기·관문·용어 연막검사 ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
