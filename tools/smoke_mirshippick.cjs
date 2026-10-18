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

console.log(`\n${bad ? '✗' : '✔'} 미르 배 고르기·관문·용어 연막검사 ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
