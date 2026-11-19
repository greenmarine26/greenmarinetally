// 5.14 연막검사 — 호기가 다른 배로 옮김(«2호기 04:00 KSKM으로 이동»)을 미르가 직접 읽고, 앱 자료와 시각이 어긋나면 왜 다른지 묻는다.
//   검수사 2026-11-19 07:28 «앱은 세명이 스타트 선박이 뭔질 알고 있고 몇시에 작업 선박이 바뀐걸 알수 있었을 것입니다» · 07:36 «앱 자료와 틀릴시에 왜 틀리는지는 물어 볼수 있습니다»
//   실데이터 — 2026-11-18 야간 PCTC(YKTD 2618W 선적 2호기 최원형·3호기 김성일 → 2호기 KSKM 04:25 · 3호기 DPRT 05:05). tools/fixtures/crewfollow514.json(RTDB GET).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'shipmove514_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = global.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, location: { href: '' } };
global.localStorage = global.localStorage || { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {} };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 있음 */ }
process.env.TZ = 'Asia/Seoul';
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const _cw = console.warn; console.warn = (...a) => { if (/베이사전/.test(String(a[0]))) return; _cw(...a); };

(async () => {
  try {
    const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
    fs.writeFileSync(e, [
      `export { shipMovePlanOf, shipMoveAnswerOf, spokenTimeMs, shipMoveWritable } from "${ROOT}/src/craneShipMove.js";`,
      `export { parseNaturalQuery } from "${ROOT}/src/nlSearch.js";`,
      `export { answerOneRaw, isWeakAnswer, isWriteParse, mirRewriteIsAuto } from "${ROOT}/src/mir.js";`,
      `export { gangsOfShift } from "${ROOT}/src/utils.js";`,
    ].join('\n'));
    execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
    const B = require(o);
    const FX = JSON.parse(rd('tools/fixtures/crewfollow514.json')).voyages;
    const T = (s) => Date.parse(`2026-11-19T${s}:00+09:00`);
    const clone = (x) => JSON.parse(JSON.stringify(x));
    // ① 말 읽기
    const P = (q) => B.parseNaturalQuery(q).moveSet;
    const m1 = P('2호기 04:00 KSKM으로 이동');
    ok('① «2호기 04:00 KSKM으로 이동» → ship · 2호기 · KSKM · 04:00', m1 && m1.kind === 'ship' && m1.equip === '2호기' && m1.toShip === 'KSKM' && m1.hh === '04' && m1.mm === '00', JSON.stringify(m1));
    const m2 = P('3호기 5시 DPRT로 옮겼어');
    ok('① «3호기 5시 DPRT로 옮겼어» → ship · 05시', m2 && m2.kind === 'ship' && m2.toShip === 'DPRT' && m2.hh === '5', JSON.stringify(m2));
    ok('① 시각 없이 «2호기 KSKM으로 갔어» 도 읽는다', (P('2호기 KSKM으로 갔어') || {}).kind === 'ship');
    ok('① 종전 말은 그대로 — «2호기로 이동»(move) · «1호기 철수»(withdraw) · «1호기에서 2호기로 장비교체»(move)', P('2호기로 이동').kind === 'move' && P('1호기 철수').kind === 'withdraw' && P('1호기에서 2호기로 장비교체').kind === 'move');
    ok('① «2호기 KSKM으로 이동 해야돼?» 같은 물음·예정은 기록 말이 아니다', !P('2호기 KSKM으로 이동할 예정') && !P('2호기 KSKM으로 이동했어?'));
    ok('① 되묻기가 안내한 «2호기 04:00 KSKM으로 이동 맞아» 는 다시 확인한 말(force)', (P('2호기 04:00 KSKM으로 이동 맞아') || {}).force === true);
    ok('① «… 이동 안 맞아»·«아니» 는 force 가 아니다', !(P('2호기 04:00 KSKM으로 이동 안 맞아') || {}).force);
    const _not = ['2호기 KSKM으로 가야 돼', '2호기 KSKM으로 가지마', '2호기 KSKM으로 가면 돼', '2호기 KSKM으로 옮길게', '2호기 KSKM으로 이동해', '2호기 KSKM으로 이동 예정', '2호기 06:00 KSKM으로 넘어갈 거야', '2호기 KSKM에 붙일까', '2호기 KSKM에 붙여야 하나'];
    ok('① 예정·부정·명령·물음은 기록 말이 아니다(감사 상1)', _not.every((q) => !P(q) || P(q).kind !== 'ship'), _not.filter((q) => P(q) && P(q).kind === 'ship').join(' / '));
    ok('① 지난 일 꼴은 받는다 — 옮겼어·넘어갔어·이동했어·투입됐어·갔어', ['2호기 KSKM으로 옮겼어', '2호기 KSKM으로 넘어갔어', '2호기 KSKM으로 이동했어', '2호기 KSKM에 투입됐어', '2호기 KSKM으로 갔어'].every((q) => (P(q) || {}).kind === 'ship'));
    ok('① «2호기 4시반 KSKM으로 이동» → 04:30', (P('2호기 4시반 KSKM으로 이동') || {}).mm === '30');
    // ② 판정 — 실데이터
    //  (가) 04:20, YKTD 가 아직 작업 목록에 있을 때 «2호기 04:00 KSKM으로 이동» → 떠난 배 YKTD · 최원형 · YKTD 마지막 04:07 > 04:00 → 어긋남
    const V1 = clone(FX);
    const now1 = T('04:20');
    const pl1 = B.shipMovePlanOf(V1, 'KSKM_2621N', 2, B.spokenTimeMs('04', '00', now1), now1, 'KSKM');
    ok('② (가) 떠난 배 YKTD · 검수원 최원형', pl1.ok && pl1.originKey === 'YKTD_2617E' && pl1.name === '최원형', JSON.stringify({ o: pl1.originKey, n: pl1.name }));
    ok('② (가) YKTD 2호기 마지막 완료 04:07 · KSKM 2호기 첫 완료 04:25(그 조)', new Date(pl1.lastAtOrigin).toTimeString().slice(0, 5) === '04:07' && new Date(pl1.firstAtTarget).toTimeString().slice(0, 5) === '04:25');
    ok('② (가) 말한 04:00 은 YKTD 마지막 완료보다 앞 — 어긋남(묻는다)', pl1.conflict === true);
    const a1 = B.shipMoveAnswerOf(pl1, false);
    ok('② (가) 답 — 왜 다른지 묻고 «아직 적지 않았어요»', /왜 다른지/.test(a1) && /아직 적지 않았어요/.test(a1) && /04:07/.test(a1), a1);
    //  (나) 04:30 으로 말했으면 자료와 맞는다(04:07 뒤 · 04:25+5분 안) → 적는다 · 새 배 KSKM 에 2호기 최원형을 따라 적고 YKTD 에 떠난 시각
    const pl2 = B.shipMovePlanOf(V1, 'KSKM_2621N', 2, B.spokenTimeMs('04', '20', now1), now1);
    ok('② (나) «04:20» 은 자료와 맞음 — 적는다 · 2호기 최원형 따라 적음 · YKTD 에 떠남 표시', !pl2.conflict && pl2.needCrew && pl2.name === '최원형' && pl2.leftOrigin, JSON.stringify({ c: pl2.conflict, nc: pl2.needCrew, l: pl2.leftOrigin }));
    ok('② (나) 답 «2호기 최원형 YKTD → KSKM 04:20 이동으로 적을게요»', /2호기 최원형 YKTD → KSKM 04:20 이동으로 적을게요/.test(B.shipMoveAnswerOf(pl2)), B.shipMoveAnswerOf(pl2));
    ok('② (나) «맞아» 로 다시 확인하면 어긋나도 적는 답', /적을게요/.test(B.shipMoveAnswerOf(pl1, true)));
    //  (다) 실제 04:56 — YKTD 는 04:24 에 보관소로 빠짐. 수집기가 새 배에 남긴 따라 적은 등록(from·fromLastAt)으로 같은 판정
    const V3 = clone(FX); delete V3.YKTD_2617E;
    V3.KSKM_2621N.info.craneCrew['11-18 야간']['2호기'] = { name: '최원형', at: T('04:25'), by: '자동', src: 'follow', from: 'YKTD_2617E', fromLastAt: T('04:07') };
    const now3 = T('04:56');
    const pl3 = B.shipMovePlanOf(V3, 'KSKM_2621N', 2, B.spokenTimeMs('04', '00', now3), now3);
    ok('② (다) 보관소로 빠진 YKTD 도 따라 적은 등록으로 알아본다 · 04:00 어긋남', pl3.originKey === 'YKTD_2617E' && pl3.name === '최원형' && pl3.conflict && !pl3.needCrew, JSON.stringify({ o: pl3.originKey, c: pl3.conflict }));
    //  (라) 3호기 김성일 DPRT — 등록이 이미 있으면(04:57 말로 등록) 따라 적지 않는다(직접 등록이 이긴다)
    const pl4 = B.shipMovePlanOf(clone(FX), 'DPRT_2613N', 3, B.spokenTimeMs('05', '00', T('05:10')), T('05:10'));
    ok('② (라) DPRT 3호기 이미 등록(김성일) — 새로 적지 않음 · 05:00 은 자료와 맞음', !pl4.needCrew && pl4.name === '김성일' && !pl4.conflict, JSON.stringify({ nc: pl4.needCrew, c: pl4.conflict }));
    //  감사 중4 — 아직 안 온 시각(04:56 에 «05:02»)은 하루 전으로 넘기지 않고 묻는다
    const plF = B.shipMovePlanOf(V3, 'KSKM_2621N', 2, B.spokenTimeMs('05', '02', now3), now3, 'KSKM');
    ok('② (마) 아직 안 온 시각 — 같은 날 05:02 · 묻는다 · 적지 않음', new Date(plF.ms).getDate() === 19 && plF.future && !B.shipMoveWritable(plF, false) && /아직 안 온 시각/.test(B.shipMoveAnswerOf(plF)));
    //  감사 하10 — 비슷한 코드로 고쳐 짐작하지 않는다
    const plM = B.shipMovePlanOf(V3, 'KSKM_2621N', 2, 0, now3, 'KSKS');
    ok('② (바) «KSKS» 는 KSKM 으로 짐작해 적지 않고 되묻는다', plM.shipMismatch && !B.shipMoveWritable(plM, true) && /KSKM 말씀인가요/.test(B.shipMoveAnswerOf(plM)));
    //  감사 하10 — 이미 그 배에 그 호기가 있고 시각도 없으면 «바꿀 것이 없어요»
    const plN = B.shipMovePlanOf(V3, 'KSKM_2621N', 2, 0, now3, 'KSKM');
    ok('② (사) 바꿀 것 없음 — 적는다고 하지 않는다', plN.nothing && !B.shipMoveWritable(plN) && /바꿀 것이 없어/.test(B.shipMoveAnswerOf(plN)), JSON.stringify({ nothing: plN.nothing, l: plN.leftOrigin }));
    //  감사 중6 — «맞아» 로 넘겨 적어도 떠난 배에 표시 · 떠난 시각 = max(말한 시각, 떠난 배 마지막)
    ok('② (아) 어긋남을 «맞아» 로 넘겨도 YKTD 에 떠남 표시 · 04:07', pl1.leftOrigin && new Date(pl1.leftAtOrigin).toTimeString().slice(0, 5) === '04:07' && B.shipMoveWritable(pl1, true));
    //  감사 중7 — 돌아옴(A→B→A)
    const VR = clone(FX);
    VR.YKTD_2617E.info.craneCrew['11-18 야간']['2호기'].leftAt = T('04:25'); VR.YKTD_2617E.info.craneCrew['11-18 야간']['2호기'].to = 'KSKM_2621N';
    VR.KSKM_2621N.info.craneCrew['11-18 야간']['2호기'] = { name: '최원형', at: T('04:25'), src: 'follow', from: 'YKTD_2617E' };
    const plR = B.shipMovePlanOf(VR, 'YKTD_2617E', 2, B.spokenTimeMs('04', '30', T('04:31')), T('04:31'), 'YKTD');
    ok('② (자) 돌아옴 — YKTD 떠난 표시를 지우고 KSKM 에 떠남 표시', plR.returning && plR.leftOrigin && plR.originKey === 'KSKM_2621N', JSON.stringify({ r: plR.returning, o: plR.originKey, c: plR.conflict }));
    // ③ 엔진 답 — 떠 있는 미르(전 항차) · 적는 손 있음
    const ctx = (vs, now) => ({ voyages: vs, app: 'tally', mirBox: true, moveRecorder: true, _now: now });
    const e1 = String(B.answerOneRaw('2호기 04:00 KSKM으로 이동', ctx(V3, now3)) || '');
    ok('③ 엔진 답 — 04:56 실제 말에 «왜 다른지 알려 주세요»(시작으로 적는다고 하지 않음)', /왜 다른지/.test(e1) && !/시작으로 적을게요/.test(e1), e1);
    const tr = {}; const e2 = B.answerOneRaw('2호기 04:00 KSKM으로 이동', { ...ctx(V3, now3), _trace: tr });
    ok('③ 엔진 답은 강한 답(모델·번역으로 안 감)', B.isWeakAnswer('2호기 04:00 KSKM으로 이동', e2, tr) === false, tr.via);
    //  재감사 상1 — 엔진도 비슷한 코드를 고쳐 «적을게요» 하지 않는다(화면은 원말로 읽어 안 적음)
    const eK = String(B.answerOneRaw('2호기 KSKS으로 이동', ctx(V3, now3)) || '');
    ok('③ «2호기 KSKS으로 이동» — 엔진도 짐작하지 않고 되묻는다(적을게요 없음)', !/적을게요/.test(eK) && /말씀인가요|못 찾/.test(eK), eK);
    //  재감사 중2 — 돌아옴의 첫 완료는 떠난 표시 뒤만
    const VR2 = clone(FX);
    VR2.YKTD_2617E.info.craneCrew['11-18 야간']['2호기'].leftAt = 1795028848000;   // YKTD 2호기 마지막 완료(04:07:28) — 수집기가 붙이는 값 VR2.YKTD_2617E.info.craneCrew['11-18 야간']['2호기'].to = 'KSKM_2621N';
    VR2.KSKM_2621N.info.craneCrew['11-18 야간']['2호기'] = { name: '최원형', at: T('04:25'), src: 'follow', from: 'YKTD_2617E' };
    const plR2 = B.shipMovePlanOf(VR2, 'YKTD_2617E', 2, B.spokenTimeMs('06', '25', T('06:26')), T('06:26'), 'YKTD');   // KSKM 2호기 마지막 06:19 뒤 돌아옴
    ok('③ 돌아옴 — 처음 일하던 때(20:00) 기록 때문에 어긋남으로 묻지 않는다', plR2.returning && !plR2.firstAtTarget && !plR2.conflict && plR2.leftOrigin && plR2.originKey === 'KSKM_2621N', JSON.stringify({ f: plR2.firstAtTarget, c: plR2.conflict }));
    //  재감사 하4 — 아침 06:00 의 «17:45» 는 어제 17:45
    const t1745 = B.spokenTimeMs('17', '45', T('06:00'));
    ok('③ 아침 06:00 에 «17:45» → 어제 17:45(지난 조)', new Date(t1745).getDate() === 18 && new Date(t1745).getHours() === 17);
    ok('③ 아직 안 온 시각은 «맞아» 로도 적지 않는다', !B.shipMoveWritable({ ...plF }, true));
    //  5.14-01 라이브 확인 — 09:25 «2호기 23:59 KSKM으로 이동» 은 어젯밤(지난 조) 시각 · KSKM 2호기 첫 완료 04:25 보다 4시간 넘게 이름 → 묻고 안 적는다
    const now925 = T('09:25');
    const pl925 = B.shipMovePlanOf(V3, 'KSKM_2621N', 2, B.spokenTimeMs('23', '59', now925), now925, 'KSKM');
    ok('③ 5.14-01 지난 조 시각(23:59 at 09:25) — 묻고 적지 않음', pl925.otherShift && !B.shipMoveWritable(pl925, false) && /지금 조가 아니라/.test(B.shipMoveAnswerOf(pl925)), B.shipMoveAnswerOf(pl925));
    const e925 = String(B.answerOneRaw('2호기 23:59 KSKM으로 이동', ctx(V3, now925)) || '');
    ok('③ 5.14-01 엔진 답에 «적을게요» 없음', !/적을게요/.test(e925), e925);
    const plE = B.shipMovePlanOf(V3, 'KSKM_2621N', 2, B.spokenTimeMs('03', '00', now3), now3, 'KSKM');
    ok('③ 5.14-01 새 배 첫 완료(04:25)보다 한 시간 넘게 이른 03:00 — 묻는다', plE.tooEarly && plE.conflict && !B.shipMoveWritable(plE, false));
    ok('③ 다른 배 자료 없는 화면 — 적지 못했다고 말한다', /적지 못했어요/.test(String(B.answerOneRaw('2호기 04:00 KSKM으로 이동', { app: 'tally', mirBox: true, moveRecorder: true }) || '')));
    // ④ 번역·자동 별칭은 기록 말을 만들지 않는다
    ok('④ «2호기 04:00 KSKM 시작했어» 는 기록 말(isWriteParse)', B.isWriteParse(B.parseNaturalQuery('2호기 04:00 KSKM 시작했어')));
    window.__mirLexicon = { '2호기04:00 {ship} 이동': { kind: 'alias', auto: true, src: 'model', from: '2호기 04:00 KSKM으로 이동', to: '2호기 04:00 {ship} 시작했어' } };
    ok('④ 자동 별칭(옛 학습 «이동→시작했어»)이 있어도 원말은 이동으로 읽는다(시작 시각 아님)', (B.parseNaturalQuery('2호기 04:00 KSKM으로 이동').moveSet || {}).kind === 'ship' && !B.parseNaturalQuery('2호기 04:00 KSKM으로 이동').startSet);
    window.__mirLexicon = { '1호기04:00 {ship} 투입': { kind: 'alias', auto: true, src: 'model', from: '1호기 04:00 KSKM 투입', to: '1호기 04:00 {ship} 시작했어' } };
    ok('④ 못 읽는 말의 자동 별칭이 기록 말로 되쓰면 되쓰지 않는다', !B.isWriteParse(B.parseNaturalQuery('1호기 04:00 KSKM 투입')) && B.mirRewriteIsAuto('1호기 04:00 KSKM 투입'));
    window.__mirLexicon = {};
    //  감사 상3 — askMir 별칭 갈래도 같은 문지기
    ok('④ askMir 별칭 되쓰기 갈래도 기록 말이면 쓰지 않는다', /_rwWrite = !!\(rw && mirRewriteIsAuto\(q\) && isWriteParse\(parseNaturalQuery\(rw\)\)\)/.test(rd('src/mir.js')) && /&& !_rwWrite\)/.test(rd('src/mir.js')));
    const mi = rd('src/mir.js');
    ok('④ askMir — 번역문이 기록 말이면 그 답을 쓰지 않는다(translateWrite)', /isWriteParse\(parseNaturalQuery\(rec\.canonical\)\)/.test(mi) && /out\.via = 'translateWrite'/.test(mi));
    // ⑤ 갱 수 — 떠난 호기는 그 시각부터 빼고 센다
    const I = clone(FX.KSKM_2621N.info); I.craneCrew['11-18 야간']['2호기'] = { name: '최원형', at: T('04:25') };
    ok('⑤ KSKM 야간 갱 2(1호기 김판석·2호기 최원형)', B.gangsOfShift(I, T('05:00')).n === 2);
    I.craneCrew['11-18 야간']['2호기'].leftAt = T('05:30');
    ok('⑤ 2호기가 05:30 에 떠났으면 05:40 갱 1 · 05:20 갱 2', B.gangsOfShift(I, T('05:40')).n === 1 && B.gangsOfShift(I, T('05:20')).n === 2);
    I.craneCrew['11-18 야간']['1호기'].leftAt = T('05:35');
    ok('⑤ 등록 호기가 전부 떠났으면 0 갱(항차 기본으로 돌아가지 않음)', B.gangsOfShift({ ...I, gangs: 3 }, T('05:40')).n === 0);
    // ⑥ 배선
    const mf = rd('src/components/MirFab.jsx'), fb = rd('src/firebase.js');
    ok('⑥ 떠 있는 미르가 같은 판정으로 적고, 어긋나면 안 적는다', /shipMovePlanOf\(vs, tk,/.test(mf) && /if \(!shipMoveWritable\(pl, M\.force\)\) return;/.test(mf) && /fbMirCraneShipMove\(pl, inspector/.test(mf));
    ok('⑥ 쓰기는 루트 update 한 번 · 시작 시각은 그 호기만(craneStart/N) · workStartManual 안 건드림', /export async function fbMirCraneShipMove/.test(fb) && /craneStart\/\$\{plan\.no\}/.test(fb) && !/workStartManual/.test(fb.slice(fb.indexOf('export async function fbMirCraneShipMove'), fb.indexOf('export async function fbSetVoyageCraneCrew'))));
    ok('⑥ 매뉴얼에 다른 배로 옮김', /KSKM으로 이동|배로 이동/.test(rd('src/data/helpData.js')));
  } catch (err) { bad += 1; console.log('  ✘ 실행 오류 — ' + (err && err.stack || err)); }
  console.log(`\n5.14 호기 다른 배로 옮김 연막검사 — ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})();
