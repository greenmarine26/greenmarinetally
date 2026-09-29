// 미르 야드 상황 연막검사 (3.69 / ConeOne 2.58) — 실소스 번들(mirCore.entry) + 실데이터(2026-09-29 17:01 PCTC·PNCT 야드 현황 스냅샷, KBTR 2606E 보관본, DJCF/PCSZ 컨 대조)로 [mirYard] 절을 잰다.
//   검수사 2026-09-29 «미르에게 질문 야드 바빠(뻐)?, 야드 복잡해?,왜 차 안와? 반입 반출 차량등 확인하고 알려주기» · «야드 상황을 알고 작업이 느린 이유 설명등» · «그건 그시간이후의 추이상황입니다».
//   node tools/smoke_yard.cjs <mirCore 번들> <저장소 루트>
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
const YD = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/yard_status_20260929.json'), 'utf8'));
const OWN = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/yard_owner_20260929.json'), 'utf8'));
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mirsame_kbtr.json'), 'utf8'));
const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let n = 0, bad = 0;
const T = (cond, name, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const AT = Number(YD.PCTC.at);   // 스냅샷 시각(ms) — 연막검사의 «지금» 은 이 시각 + 1분
const NOW = AT + 60 * 1000;
const mkCtx = (voy, vk, extra = {}) => {
  const D = voy.discharge || {}, L = voy.loading || {};
  const comp = Object.assign({}, D.completed || {}, L.completed || {});
  const cs = M.toMirContainers(Object.values(D.ediContainers || {}), 'discharge').concat(M.toMirContainers(Object.values(L.ediContainers || {}), 'loading'));
  return () => Object.assign({ app: 'tally', smallTalkLast: true, execDevice: true, modeChoice: 'both', countFallback: true, inspector: '연막', isChief: true, chiefData: null, heartbeat: null, portMisData: {}, pilotForecast: {},
    voyageKey: vk, voyage: voy, info: voy.info, vsl: voy.info.vsl, vslFull: voy.info.vslFull || '', pier: voy.info.pier, mode: 'discharge', containers: cs, compMap: comp, shiftMap: null, bayPairs: null, rfSkip: false, diagAlerts: [], accepted: true, _trace: {}, _now: NOW, _utterAt: NOW }, extra);
};
function ask(q, ctxFn, now = NOW) {
  const c = ctxFn(); const t = {}; c._trace = t; c._now = now; c._utterAt = now;
  let a = null; try { a = M.answerOneRaw(q, c); } catch (e) { a = 'ERR ' + e.message; }
  const fo = M.mirThreadCommit(q, a, t.via || '', c, now);
  return { a: norm(a), via: t.via || '', fo, weak: M.isWeakAnswer(q, a, t) };
}

console.log('■ ① 내보내기 · 말귀(parseNaturalQuery yardQuery)');
T(typeof M.answerYard === 'function' && typeof M.setMirYard === 'function' && typeof M.readMirYard === 'function', 'mirCore 가 answerYard·setMirYard·readMirYard 를 내보낸다');
const P = (q) => { try { return M.parseNaturalQuery(q).yardQuery || null; } catch (e) { return 'ERR'; } };
const YES = { busy: ['야드 바빠?', '미르 야드 바빠', '미르 야드 어때', '야드 바뻐', '야드 바쁜가?', '야드 복잡해?', '야드 어때', '야드 상황', '지금 야드 혼잡해', '야드 괜찮아?', '야드 적체야?', '야드 막혔어?', '야드 밀렸어?', '야드 꽉 찼어?', '야드 확인해줘', '야드는?', '야드', '미르야 야드 상황 알려줘', 'KBTR 야드 바빠'],
  why: ['왜 차 안와?', '왜 차 안 와', '왜차안와', '차가 안 오는데', '차 안 옴', '차 언제 와', '샤시 안 와', '야드 샤시가 늦어', '트럭이 왜 안 와', '와이티 안 와', '작업 왜 느려', '작업이 왜 이렇게 느려', '왜 이렇게 느리지', 'KBTR 왜 느려', '지금 왜 이렇게 느려', '느린 이유가 뭐야', '양하가 더뎌', '야드 때문에 늦는 이유'],
  count: ['반입 반출 몇 대', '반입 몇 대야', '반출 차량 몇 대', '반출입 현황', '회전 시간 어때', '트럭 몇 대 들어왔어', '반입 반출 차량 확인해줘', '반입반출 알려줘', '야드 차 몇 대', '야드 대기 물량'],
  block: ['야드 어느 블록', '야드 장비 어디 붙었어', '야드 RT 몇 대'], trend: ['야드 추이', '야드 앞으로 어때', '야드 3시간 뒤', '야드 좋아져?'] };
for (const k of Object.keys(YES)) for (const q of YES[k]) T(P(q) === k, `«${q}» → ${k}`, String(P(q)));
const NO = ['반입후검사 몇 대', '반입 시각 알려줘', '3426 온도', '작업 속도', '몇 시에 끝나', '남은 대수', 'KBTR 브리핑', '배가 왜 늦어', '리퍼 몇 대', '20피트 몇 대', '커트씰', '도선 언제야', '반출입 구분',
  '수집기 왜 느려', '수집기 왜 이렇게 느려', '앱 왜 느려', '화면 왜 느려', '미르 왜 느려', '미르야 왜 이렇게 느려', '2차 없어?', '선적 2차가 없어', '3차 늦어', '내일 늦어', '일 안 나가', '1호기 왜 느려', '크레인 왜 느려', '갱 왜 느려', '야드가 뭐야', '마샬링 야드 뜻',
  '폰이 왜 이렇게 느려', '인터넷 왜 느려', '업데이트가 왜 이렇게 느려', '사진이 왜 이렇게 느리게 올라가', '수석이 왜 이렇게 느려', '케빈 왜 느려'];
for (const q of NO) T(P(q) === null, `«${q}» 는 야드 질문이 아니다`, String(P(q)));

console.log('■ ② answerYard 순수 함수(실 스냅샷 2026-09-29 17:01)');
{
  const pc = YD.PCTC, pn = YD.PNCT;
  const a = M.answerYard('busy', YD, { piers: ['PCTC'], now: NOW });
  T(new RegExp(`^PCTC 야드는 지금 ${pc.level}예요 — 반입 ${pc.inCnt}대 · 반출 ${pc.outCnt}대\\.$`).test(a), 'busy — 터미널 판정어 + 반입/반출 그대로', a);
  T(pc.level === (pc.inCnt + pc.outCnt < 60 ? '양호' : pc.inCnt + pc.outCnt < 80 ? '혼잡' : '적체'), '스냅샷 판정어 = 터미널 규칙(60/80)');
  const c = M.answerYard('count', YD, { piers: ['PCTC'], now: NOW });
  const gSum = Object.values(pc.gate).reduce((s, x) => s + x, 0), vSum = Object.values(pc.vssl).reduce((s, x) => s + x, 0);
  T(c.includes(`반출입 ${gSum}대(`) && c.includes(`본선 ${vSum}대(`) && /일반 \d+/.test(c), 'count — 대기 물량 합·종류(일반·냉동·위험물·장척·공컨)', c);
  const w = M.answerYard('why', YD, { piers: ['PCTC'], now: NOW });
  T(w.includes(`반출이 막힌 블록이 ${pc.locked.length}곳이에요.`) && !w.includes(pc.locked[0] + ' ' + pc.locked[1]), 'why — COPINO LOCK 블록 수만(코드 목록은 «야드 어느 블록» 칩 — 음성 길이)', w);
  const rtN = pc.work.filter((x) => x.rt).length;
  T(w.includes(`야드 장비는 ${rtN}대예요.`) && !w.includes('RT204'), 'why — 배 없이 물으면 장비 대수만(번호 목록·우리 몫 없음)', w);
  T(/예상 — 1시간 뒤엔 본선 41대쯤, 2시간 뒤엔 본선 24대쯤, 3시간 뒤엔 본선 12대쯤 될 것 같아요\./.test(w) && !/4시간 뒤/.test(w), 'why — 예상치(1~5시간 뒤, 0 인 쪽·시간대는 생략, «몇 대쯤 될 것 같아요»)', w);
  T(w.length < 260, 'why 길이 — 음성으로 읽을 만한 길이(260자 미만)', String(w.length));
  T(/샤시가 늦으면 1차로 기다리고, 2차로 포맨에게 독촉해요/.test(w), 'why — 대처(지식 «야드 샤시 안 왔어요» 와 같은 말)');
  const b = M.answerYard('block', YD, { piers: ['PCTC'], now: NOW });
  T(b.includes('1A RT204 9937 16:58') && b.includes('1D RT209') && b.includes(`반출 막힌 블록 ${pc.locked.length}곳`), 'block — 블록·장비·마지막 컨 끝네자리·시각, 장비만 붙은 블록도', b);
  const t = M.answerYard('trend', YD, { piers: ['PCTC'], now: NOW });
  T(/예상 — 1시간 뒤엔 본선 41대쯤, 2시간 뒤엔 본선 24대쯤, 3시간 뒤엔 본선 12대쯤 될 것 같아요\./.test(t) && !/4시간 뒤/.test(t), 'trend — 예상치(블록 표 h1~h5 합계, 3.69-02)', t);
  T(M.YARD_SPEAK && M.YARD_SPEAK.rate === 0.9 && M.YARD_SPEAK.conversational === true, 'YARD_SPEAK 한 벌(rate 0.9·conversational)');
  const hon = M.answerYard('busy', { PCTC: Object.assign({}, pc, { level: '혼잡' }) }, { piers: ['PCTC'], now: NOW });
  T(/^PCTC 야드는 지금 혼잡이에요 — /.test(hon), '받침 있는 판정어 «혼잡이에요»(감사 2)', hon);
  const pw = M.answerYard('why', { PCTC: Object.assign({}, pc, { partialWork: true, work: [], locked: [] }) }, { piers: ['PCTC'], now: NOW });
  T(/장비·잠금 표는 이번에 못 읽었어요/.test(pw), 'partialWork → «못 읽었어요»(빈 표를 «없어요» 로 말하지 않는다, 감사 7)', pw);
  const nd = M.answerYard('why', null, { piers: ['PCTC'], now: NOW });
  T(/포맨에게 독촉/.test(nd), '자료 없는 why 에도 대처(감사 6)', nd);
  const part = M.answerYard('why', { PCTC: Object.assign({}, pc, { partial: true, gate: {}, vssl: {}, blocks: {}, work: [], locked: [] }) }, { piers: ['PCTC'], now: NOW });
  T(/표\(대기 물량·블록·장비\)는 이번에 못 읽었어요/.test(part) && !/대기 — 반출입 0대/.test(part), 'partial(표 못 읽음) → 빈 표를 «대기 없음» 으로 말하지 않는다', part);
  const nolvl = M.answerYard('busy', { PCTC: Object.assign({}, pc, { level: '' }) }, { piers: ['PCTC'], now: NOW });
  T(/^PCTC 야드는 지금 판정 없음이에요 — /.test(nolvl), 'level 없음 → «판정 없음»(깨진 문장 없음)', nolvl);
  const nocnt = M.answerYard('busy', { PCTC: Object.assign({}, pc, { inCnt: undefined }) }, { piers: ['PCTC'], now: NOW });
  T(/못 읽었어요\(반입\/반출 대수 없음\)/.test(nocnt), 'inCnt 없음 → «못 읽었어요»(undefined 대 없음)', nocnt);
  const p1 = M.answerYard('busy', YD, { piers: ['PNCT'], now: NOW });
  T(p1 === `PNCT 야드 — 반입 ${pn.inCnt}대 · 반출 ${pn.outCnt}대. 회전시간은 반입 ${pn.tatIn}분 · 반출 ${pn.tatOut}분이에요. (동방은 혼잡 등급을 안 줘서 대수와 회전시간만 말해요.)`, 'PNCT — 대수·회전시간만, 판정어 지어내지 않음', p1);
  const p2 = M.answerYard('why', YD, { piers: ['PNCT'], now: NOW });
  T(/블록별 자료는 동방 정보서비스에 없어요/.test(p2) && /포맨/.test(p2), 'PNCT why — 없는 자료는 없다고, 대처는 같이', p2);
  const both = M.answerYard('busy', YD, { piers: [], now: NOW });
  T(both.split('\n').length === 2 && /^PCTC/.test(both) && /\nPNCT/.test(both), '부두를 모르면 두 터미널 두 줄', both);
  const stale = M.answerYard('busy', YD, { piers: ['PCTC'], now: AT + 15 * 60 * 1000 });
  T(/\(15분 전 자료\)\./.test(stale), '10분 넘게 낡은 자료엔 «(N분 전 자료)»', stale);
  const fresh = M.answerYard('busy', YD, { piers: ['PCTC'], now: AT + 9 * 60 * 1000 });
  T(!/전 자료/.test(fresh), '10분 안이면 나이 표시 없음', fresh);
  const dead = M.answerYard('busy', YD, { piers: ['PCTC'], now: AT + 61 * 60 * 1000 });
  T(/61분째 안 들어와요 — 수집기를 확인해 주세요/.test(dead) && dead.includes(`반입 ${pc.inCnt}대`), '1시간 넘으면 수집기 확인 + 마지막 자료', dead);
  T(/59분 전 자료/.test(M.answerYard('busy', YD, { piers: ['PCTC'], now: AT + 59.4 * 60 * 1000 })), '59.4분은 아직 «전 자료»(ms 기준 한 벌)');
  T(/25시간째 안 들어와요/.test(M.answerYard('busy', YD, { piers: ['PCTC'], now: AT + 1500 * 60 * 1000 })), '두 시간 넘으면 «N시간째»');
  T(/자료가 아직 안 왔어요/.test(M.answerYard('busy', null, { piers: ['PCTC'], now: NOW })), '노드 없음 → «자료가 아직 안 왔어요»');
  T(/PNCT 야드 자료가 아직 안 왔어요/.test(M.answerYard('busy', { PCTC: pc }, { piers: ['PNCT'], now: NOW })), '한 터미널만 없음 → 그 터미널만 없다고');
  //  우리 배 몫 — DJCF(DJLU2160277 1대) · PCSZ 1대 · 나머지 5대는 항차 목록 밖 → «다른 배»
  const djcf = OWN.DJCF_0151N;
  const mine = M.answerYard('why', YD, { piers: ['PCTC'], ship: 'DJCF', containers: Object.values(djcf.discharge.ediContainers), voyages: OWN, now: NOW });
  T(mine.includes('우리 배(DJCF) 컨을 받는 건 1대예요(PCSZ 1대 · 다른 배 5대 · 아직 안 놓인 3대)'), 'why — 우리 배 몫(EDI 대조) · 다른 배 코드별 · 목록 밖은 «다른 배» · 셈이 장비 10대와 맞는다', mine);
  T(mine.includes('마지막으로 놓인 우리 컨은 4B DJLU2160277(16:59)이에요'), 'why — 마지막 놓인 우리 컨과 시각', mine);
  const flat = [{ cn: 'TCNU7028896', voyageKey: 'PCSZ_2630E' }];
  const mine2 = M.answerYard('why', YD, { piers: ['PCTC'], ship: 'DJCF', containers: Object.values(djcf.discharge.ediContainers), flat, voyages: OWN, now: NOW });
  T(mine2.includes('우리 배(DJCF) 컨을 받는 건 1대예요(PCSZ 1대 · 다른 배 5대 · 아직 안 놓인 3대)'), 'why — flat(전 항차 컨) 으로 대조해도 같은 답', mine2);
  const mine3 = M.answerYard('why', YD, { piers: ['PCTC'], ship: 'DJCF', containers: Object.values(djcf.discharge.ediContainers), flat: [], voyages: OWN, now: NOW });
  T(mine3.includes('(PCSZ 1대 · 다른 배 5대 · 아직 안 놓인 3대)'), 'why — flat 이 비어도 항차 원본으로 대조한다(2차 시뮬 14)', mine3);
  const ld = M.answerYard('why', YD, { piers: ['PCTC'], ship: 'DJCF', containers: Object.values(djcf.discharge.ediContainers), voyages: OWN, mode: 'loading', now: NOW });
  T(/게이트 반출 차량이 89대예요/.test(ld) && !/야드 장비는/.test(ld), '선적 탭에서는 양하 장비·우리 컨을 말하지 않는다(2차 시뮬 16)', ld);
  //  자정 넘김 — 야간 작업 00:05 에 «16:59» 와 «00:02» 중 지금 기준 가장 가까운 과거는 00:02
  const midnight = JSON.parse(JSON.stringify(YD)); midnight.PCTC.work.push({ blk: '1A', rt: 'RT204', cn: 'DJLU2160277', at: '00:02' });
  const nm = new Date(NOW); nm.setHours(0, 5, 0, 0); const mnAt = nm.getTime() + 24 * 3600 * 1000;
  const mid = M.answerYard('why', { PCTC: Object.assign({}, midnight.PCTC, { at: mnAt - 60000 }) }, { piers: ['PCTC'], ship: 'DJCF', containers: Object.values(djcf.discharge.ediContainers), voyages: OWN, now: mnAt });
  T(/마지막으로 놓인 우리 컨은 1A DJLU2160277\(00:02\)/.test(mid), '자정 넘긴 뒤 «마지막» 은 00:02(문자열 비교가 아니라 지금 기준 가장 가까운 과거)', mid);
}

console.log('■ ③ answerOneRaw 배선 — 열린 항차(KBTR·PCTC) · DJCF 대조 · 홈(항차 없음) · 콘앱(ctx.yard)');
M.setMirYard(null);
const kbtr = mkCtx(FX.voyage, FX.voyageKey);
{
  M._mirThreadReset();
  const r0 = ask('야드 바빠?', kbtr);
  T(/야드 자료가 아직 안 왔어요/.test(r0.a) && r0.via === 'yard', '자료를 넣기 전 — «아직 안 왔어요»(via yard, 모델로 안 감)', `${r0.a} · ${r0.via} · weak=${r0.weak}`);
  T(r0.weak === false, '«아직 안 왔어요» 는 약한 답이 아니다(AI 로 안 간다)');
  T(r0.fo && r0.fo.kind === 'answer' && !(r0.fo.chips || []).length, '자료 없음 답에는 제안 칩이 없다', JSON.stringify(r0.fo && r0.fo.chips));
  M.setMirYard(YD);
  T(M.readMirYard() === YD, 'setMirYard → readMirYard');
  M._mirThreadReset();
  const r1 = ask('야드 바빠?', kbtr);
  T(/^PCTC 야드는 지금/.test(r1.a) && !/PNCT/.test(r1.a) && r1.via === 'yard' && r1.weak === false, '열린 항차(PCTC) → PCTC 한 줄만', `${r1.a} · ${r1.via}`);
  T(r1.fo && r1.fo.chips.length && r1.fo.chips.includes('야드 추이'), '답 뒤 한 마디 — 칩(다 끝난 KBTR 은 «야드 추이»만)', JSON.stringify(r1.fo));
  const r2 = ask('응', kbtr, NOW + 5000);
  T(r2.via === 'yard' && /예상 — /.test(r2.a) && r2.weak === false, '«응» → 첫 칩(야드 추이) 답(강함)', `${r2.a.slice(0, 80)} · ${r2.via}`);
  //  일하는 배(DJCF 실물 info — RTDB 2026-09-29) — «작업 속도»·«남은 대수» 칩
  M._mirThreadReset();
  const djcfW = mkCtx(OWN.DJCF_0151N, 'DJCF_0151N', { voyages: OWN });
  const rw = ask('야드 바빠?', djcfW);
  T(rw.fo && rw.fo.chips[0] === '작업 속도' && /작업 속도도 볼까요/.test(rw.fo.line), '일하는 배(DJCF)에선 «작업 속도» 칩이 먼저', JSON.stringify(rw.fo));
  const rw2 = ask('응', djcfW, NOW + 5000);
  T(rw2.via !== 'yard' && rw2.weak === false, '«응» → 작업 속도 답(강함)', `${rw2.a.slice(0, 80)} · ${rw2.via}`);
  M._mirThreadReset();
  const r3 = ask('왜 차 안 와?', kbtr);
  T(/반출이 막힌 블록이 24곳/.test(r3.a) && /우리 배\(KBTR\)/.test(r3.a), '«왜 차 안 와?» → 느린 이유(막힌 블록·장비·우리 몫)', r3.a);
  T(/우리 배\(KBTR\) 컨을 받는 건 0대예요\(다른 배 7대 · 아직 안 놓인 3대\)/.test(r3.a), 'KBTR 보관본엔 야드 컨이 없다 → 0대(다른 배 7대 — 항차 목록을 안 준 ctx)', r3.a);
  T(r3.fo && (r3.fo.chips || []).includes('야드 어느 블록'), 'why 답 뒤 칩에 «야드 어느 블록»(목록은 칩이 낸다)', JSON.stringify(r3.fo && r3.fo.chips));
  const r3c = ask('야드 어느 블록', kbtr, NOW + 3000);
  T(/야드 장비가 붙은 블록: 1A RT204 9937 16:58/.test(r3c.a) && /반출 막힌 블록 24곳\(1A 1C/.test(r3c.a), '칩 «야드 어느 블록» → 목록 답', r3c.a.slice(0, 100));
  M._mirThreadReset();
  const rp = ask('PNCT 야드 어때', kbtr);
  T(/^PNCT 야드 — /.test(rp.a) && !/PCTC/.test(rp.a), 'KBTR(PCTC) 항차에서 «PNCT 야드 어때» → 질문이 지목한 터미널(2차 시뮬 5)', rp.a);
  const rp2 = ask('동방 야드 바빠', kbtr, NOW + 2000);
  T(/^PNCT 야드 — /.test(rp2.a), '«동방 야드» → PNCT', rp2.a);
  const r3b = ask('야드 추이', kbtr, NOW + 5000);
  T(/예상 — /.test(r3b.a) && r3b.via === 'yard' && r3b.weak === false, '칩 «야드 추이» → 추이 답(강함)', r3b.a);
  M._mirThreadReset();
  const rl = ask('선적 왜 안 나가', kbtr);
  T(/게이트 반출 차량이/.test(rl.a) && !/야드 장비는/.test(rl.a), '양하 탭에서 «선적 왜 안 나가» → 질문의 모드(선적)로(감사 12)', rl.a.slice(0, 120));
  for (const q of ['야드 다녀올게', '야드 갔다 올게', '트럭 기사한테 고마워']) { const st = M.mirSmallTalk(q); T(!!st, `잡담 «${q}» 는 그대로 받는다(감사 3)`, String(st)); }
  for (const q of ['야드 바빠?', '야드 어때', '야드 왜 막혔어']) { T(M.mirSmallTalk(q) === null, `«${q}» 는 잡담이 아니다`); }
  M._mirThreadReset();
  const r4 = ask('작업 왜 느려', kbtr);
  T(r4.via === 'yard' && /야드 작업 대기/.test(r4.a), '«작업 왜 느려» 는 속도(pace)가 아니라 야드 갈래', `${r4.via} · ${r4.a.slice(0, 60)}`);
  const r5 = ask('반입 반출 몇 대', kbtr);
  T(/반입 27대 · 반출 89대/.test(r5.a) && /야드 작업 대기/.test(r5.a), '«반입 반출 몇 대» → 대수 + 대기 물량', r5.a);
  //  DJCF — 우리 배 몫이 센다(voyages 재료)
  M._mirThreadReset();
  const djcfCtx = mkCtx(OWN.DJCF_0151N, 'DJCF_0151N', { voyages: OWN });
  const r6 = ask('작업이 왜 이렇게 느려', djcfCtx);
  T(/우리 배\(DJCF\) 컨을 받는 건 1대예요\(PCSZ 1대 · 다른 배 5대 · 아직 안 놓인 3대\)/.test(r6.a) && /4B DJLU2160277\(16:59\)/.test(r6.a), 'DJCF 항차에서 «왜 느려» → 우리 몫 1대·마지막 우리 컨', r6.a);
  //  홈(항차 없음) — 일하는 배가 없으면 두 터미널
  M._mirThreadReset();
  const home = () => ({ app: 'tally', smallTalkLast: true, modeChoice: 'both', inspector: '연막', isChief: true, chiefData: null, heartbeat: null, portMisData: {}, pilotForecast: {}, voyages: {}, flat: [], accepted: true, _trace: {}, _now: NOW, _utterAt: NOW });
  const r7 = ask('야드 바빠', home);
  T(r7.a.split(' PNCT ').length === 2 || /PCTC 야드는[\s\S]*PNCT 야드 —/.test(r7.a), '홈에서 일하는 배가 없으면 두 터미널 다', r7.a);
  T(r7.fo && !(r7.fo.chips || []).includes('작업 속도') && (r7.fo.chips || []).includes('야드 추이'), '배 없는 답의 칩은 «야드 추이» 뿐(«작업 속도» 는 배가 있어야 강한 답)', JSON.stringify(r7.fo));
  //  콘앱 — ctx.yard(GET 한 것)가 엔진 캐시보다 먼저
  M.setMirYard(null);
  const cone = mkCtx(FX.voyage, FX.voyageKey, { app: 'cone', smallTalkLast: false, cone: { rows: [], dischRows: [], stowRows: [] }, yard: YD });
  M._mirThreadReset();
  const r8 = ask('야드 바빠?', cone);
  T(/^PCTC 야드는 지금 적체예요 — 반입 27대 · 반출 89대\.$/.test(r8.a) && r8.via === 'yard', '콘앱 ctx.yard 로 같은 답(엔진 캐시 비어 있어도)', r8.a);
  const r9 = ask('야드 바빠?', kbtr);
  T(/야드 자료가 아직 안 왔어요/.test(r9.a), '캐시를 비우면 검수앱은 «아직 안 왔어요»(ctx.yard 없음)', r9.a);
  M.setMirYard(YD);
  //  지식 «야드 샤시 안 왔어요» 와 겹치는 말 — 자료 답이 먼저, 대처는 같이
  M._mirThreadReset();
  const r10 = ask('야드 샤시가 안 왔어요', kbtr);
  T(r10.via === 'yard' && /포맨에게 독촉/.test(r10.a) && /반입 27대/.test(r10.a), '«야드 샤시 안 왔어요» → 야드 자료 + 같은 대처(지식 답을 잃지 않는다)', r10.a.slice(0, 120));
  //  콘앱 ① 갈래(브리핑)보다 야드가 먼저 — 두 앱 같은 답(2차 시뮬 1)
  M._mirThreadReset();
  const cone2 = mkCtx(FX.voyage, FX.voyageKey, { app: 'cone', smallTalkLast: false, cone: { rows: [], dischRows: [], stowRows: [] }, yard: YD });
  for (const q of ['야드 상황 어때', '야드 상황 알려줘', '미르야 야드 상황 알려줘']) { const rc = ask(q, cone2, NOW + 1000); T(rc.via === 'yard' && /^PCTC 야드는 지금/.test(rc.a), `콘앱 «${q}» → 야드 답(브리핑이 가로채지 않는다)`, `${rc.via} · ${rc.a.slice(0, 60)}`); }
  //  다 끝난 배 — 속도·잔여 칩을 권하지 않는다(KBTR 보관본은 완료 항차)
  M._mirThreadReset();
  const rd = ask('야드 바빠?', kbtr);
  T(rd.fo && !(rd.fo.chips || []).includes('작업 속도') && !(rd.fo.chips || []).includes('남은 대수'), '다 끝난 배(KBTR 보관본)엔 «작업 속도»·«남은 대수» 칩이 없다(2차 시뮬 16)', JSON.stringify(rd.fo && rd.fo.chips));
}

console.log('■ ③-B 앱 중단 보고(3.69-01) — 실측 PCSZ 2630E 17:01 양하 중단(야드혼잡) · DJCF 0151N 15:23 중단(타선박이동)');
{
  const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/yard_pause_20260929.json'), 'utf8'));
  const tNow = 1790668893268 + 30 * 60 * 1000;   // 중단 보고 30분 뒤
  const wp = M.workPauseOf(PZ.PCSZ_2630E, tNow);
  T(wp && wp.mode === 'discharge' && wp.reason === '야드혼잡' && wp.equip === '3호기' && wp.ko === '양하', 'workPauseOf — 마지막 보고가 중단이면 {mode, reason, equip}', JSON.stringify(wp));
  T(M.workPauseOf(PZ.DJCF_0151N, tNow) === null, 'DJCF — 15:23 중단(타선박이동) 뒤 15:54 완료 기록(실측) → 재개로 본다(중단 아님)');
  const resumed = JSON.parse(JSON.stringify(PZ.PCSZ_2630E)); resumed.reports['1790669000000'] = { type: 'work_status', action: 'discharge_resume', mode: 'discharge', equip: '3호기', ts: 1790669000000 };
  T(M.workPauseOf(resumed, tNow) === null, '재개 보고가 뒤에 있으면 중단 아님');
  const ext = JSON.parse(JSON.stringify(PZ.PCSZ_2630E)); ext.reports['1790669000000'] = { type: 'external_pause', reason: '우천', ts: 1790669000000 };
  T(M.workPauseOf(ext, tNow) && M.workPauseOf(ext, tNow).reason === '우천' && M.workPauseOf(ext, tNow).ko === '작업', 'external_pause 도 중단(모드 없음 → «작업»)');
  T(M.workPauseOf(PZ.PCSZ_2630E, tNow + 13 * 3600000) === null, '12시간 지난 중단 보고는 안 본다');
  const _r = new Date(wp.resumeAt); T(wp.breakKo === '석식' && _r.getHours() === 19 && _r.getMinutes() === 0 && (wp.resumeAt - wp.ts) < 3 * 3600000, '17:01 야드혼잡 중단 → 석식과 겹쳐 재개 예상 19:00(근무표 다음 창 시작 — 검수사 «17시에 중단하면 19시에 재개»)', JSON.stringify(wp));
  const noon = JSON.parse(JSON.stringify(PZ.PCSZ_2630E)); const nts = new Date('2026-09-29T10:10:00+09:00').getTime(); noon.reports = { [String(nts)]: { type: 'work_status', action: 'discharge_pause', mode: 'discharge', reason: '야드혼잡', equip: '3호기', ts: nts } };
  const wpn = M.workPauseOf(noon, nts + 600000); T(wpn && wpn.resumeAt && new Date(wpn.resumeAt).getHours() === 13 && wpn.breakKo === '중식', '10:10 중단 → 다음 창 13:00(중식)까지 3시간 안이면 그것이 재개 예상', JSON.stringify(wpn));
  const early = JSON.parse(JSON.stringify(PZ.PCSZ_2630E)); const ets = new Date('2026-09-29T08:10:00+09:00').getTime(); early.reports = { [String(ets)]: { type: 'work_status', action: 'discharge_pause', mode: 'discharge', reason: '야드혼잡', ts: ets } };
  T(M.workPauseOf(early, ets + 600000).resumeAt === 0, '08:10 중단 → 3시간 안에 창 시작이 없으면 재개 예상 없음(지어내지 않는다)');
  //  초조함은 실작업 분으로 — 석식(17:30~19:00)은 세지 않는다(검수사 «그 시간대엔 작업자도 작업중인 장비도 없는상태 … 대기시간도 아닙니다»)
  const vv = { info: Object.assign({}, PZ.PCSZ_2630E.info, { planStart: '2026-09-29 15:00', planEnd: '2026-09-30 06:00' }), discharge: { ediContainers: { A: { cn: 'A' } }, completed: { A: { cn: 'A', at: new Date('2026-09-29T16:59:00+09:00').getTime() } } }, loading: { ediContainers: { B: { cn: 'B' } } } };
  T(!M.anxiousReasons({ X: vv }, null, new Date('2026-09-29T19:05:00+09:00').getTime()).some((x) => /완료 기록/.test(x)), '16:59 마지막 완료 · 19:05 — 실작업 31분이라 초조하지 않다(벽시계 126분)');
  T(M.anxiousReasons({ X: vv }, null, new Date('2026-09-29T20:30:00+09:00').getTime()).some((x) => /완료 기록이 실작업 121분째 없어요/.test(x)), '20:30 — 실작업 121분 → 초조(문구에 «실작업»)');
  T(M.workPauseOf({ info: {} }, tNow) === null && M.workPauseOf(null, tNow) === null, '보고 없음 → null');
  const doneAfter = JSON.parse(JSON.stringify(PZ.PCSZ_2630E)); doneAfter.discharge = { completed: { XXXU0000001: { cn: 'XXXU0000001', at: 1790668893268 + 10 * 60 * 1000 } } };
  T(M.workPauseOf(doneAfter, tNow) === null, '중단 뒤 완료 기록이 찍히면 재개로 본다(재감사 2)');
  //  초조함 — isWorkingNow 는 utils 한 벌이라 여기서는 workPauseOf 가 anxiousReasons 안에서 불리는지를 소스로 확인하고, 완료 기록 없음 문장이 중단 중엔 안 나오는지 본다
  T(/if \(workPauseOf\(v, now\)\) continue;/.test(src('src/mir.js')), 'anxiousReasons — 중단 보고가 있으면 «완료 기록 없음» 을 세지 않는다(소스)');
  const anx = M.anxiousReasons({ PCSZ_2630E: Object.assign({}, PZ.PCSZ_2630E, { info: Object.assign({}, PZ.PCSZ_2630E.info, { planStart: '2026-09-29 15:00', planEnd: '2026-09-30 06:00' }) }) }, null, tNow);
  T(!anx.some((x) => /완료 기록/.test(x)), '중단 중인 PCSZ 에 «완료 기록이 N분째 없어요» 없음', JSON.stringify(anx));
  //  야드 why 머리에 중단 보고
  const pzCtx = mkCtx(Object.assign({}, OWN.PCSZ_2630E, { reports: PZ.PCSZ_2630E.reports }), 'PCSZ_2630E', { voyages: OWN, _now: tNow, _utterAt: tNow });
  M.setMirYard(YD); M._mirThreadReset();
  const rw = ask('작업 왜 느려', pzCtx, tNow);
  const _d = new Date(1790668893268); const _hm = `${String(_d.getHours()).padStart(2, '0')}:${String(_d.getMinutes()).padStart(2, '0')}`;   // 시계에 따라(KST 17:01) — TZ 무관 핀(재감사 3)
  T(new RegExp(`앱 보고로는 3호기 양하 ${_hm} 중단\\(사유 야드혼잡\\) 중이에요\\. 석식과 겹쳐 보통 \\d\\d:\\d\\d에 재개돼요\\.`).test(rw.a) && rw.a.indexOf('앱 보고로는') < rw.a.indexOf('야드 작업 대기'), 'PCSZ «작업 왜 느려» → 중단 보고 + 재개 예상이 대기 물량보다 먼저', rw.a.slice(0, 200));
  const t1920 = 1790676000000 + 20 * 60000; M.setMirYard({ PCTC: Object.assign({}, YD.PCTC, { at: t1920 - 60000 }), PNCT: YD.PNCT });
  const rwl = ask('왜 차 안 와', pzCtx, t1920);   // 19:20 — 재개 예상 지난 뒤(야드 자료는 1분 전 것으로)
  T(/보통 \d\d:\d\d 재개인데 아직 재개·완료 기록이 없어요/.test(rwl.a), '재개 예상 시각이 지나도 기록이 없으면 그렇게 말한다', rwl.a.slice(0, 200));
  M.setMirYard(YD);
  const rb = ask('야드 바빠?', pzCtx, tNow + 1000);
  T(!/앱 보고로는/.test(rb.a), 'busy 답에는 중단 보고를 붙이지 않는다', rb.a);
}

console.log('■ ④ 배선·매뉴얼·버전');
T(/fbSubscribeYardStatus\(setMirYard\)/.test(src('src/App.jsx')) && /u6y\(\)/.test(src('src/App.jsx')), 'App.jsx 가 yard_status 를 구독해 setMirYard 로 넣고 해제한다');
T(/ref\(db, 'yard_status'\)/.test(src('src/firebase.js')), 'firebase.js fbSubscribeYardStatus(yard_status)');
T(/answerYard, setMirYard, readMirYard/.test(src('src/mirCore.entry.js')), 'mirCore.entry 가 [mirYard] 를 내보낸다');
T(/coneYardStatus\(\)/.test(src('public/cone.html')) && /yard: _yard,/.test(src('public/cone.html')) && /fbFetch\('yard_status\.json'\)/.test(src('public/cone.html')), 'cone.html mirAsk 가 yard_status.json 을 GET 해 ctx.yard 로 넣는다');
T(/야드 상황\(3\.69\)/.test(src('src/data/helpData.js')) && /왜 차 안 와\?/.test(src('src/data/helpData.js')), '매뉴얼 미르 절에 야드 상황(3.69)');
T(/APP_VERSION = 'TallyOne 3\.(69|[7-9]\d)/.test(src('src/utils.js')), 'APP_VERSION 3.69 이상');
T(/APP_NOTE = '[^']*야드/.test(src('src/utils.js')), 'APP_NOTE 가 이번 판(야드) 문구');
T(/__CONEV='ConeOne 2\.(5[89]|[6-9]\d)/.test(src('public/cone.html')), 'ConeOne 2.58 이상');
T(/_yardA \? YARD_SPEAK/.test(src('src/components/MirFab.jsx')) && /parsed\.yardQuery \? YARD_SPEAK/.test(src('src/components/SearchPanel.jsx')) && /parsed\.yardQuery \? YARD_SPEAK/.test(src('src/pages/GlobalSearchPage.jsx')) && /__mirYardSlow/.test(src('public/cone.html')), '야드 답 느린 낭독 — 네 창구·콘앱이 YARD_SPEAK 한 벌(3.69-01)');
T(/smoke_yard\.cjs/.test(src('build.sh')), 'build.sh 가 이 연막검사를 부른다');
T(/yardQuery/.test(src('src/nlSearch.js')) && (src('src/nlSearch.js').match(/result\.yardQuery = '/g) || []).length === 7, 'nlSearch yardQuery 다섯 갈래(why 두 줄·busy 두 줄)');

console.log(`\n미르 야드 상황 연막검사: ${n - bad}/${n} 통과${bad ? ` — 실패 ${bad}` : ''}`);
process.exit(bad ? 1 : 0);
