// 미르가 화났을 때 배 이름 없이 «아무래도 강풍대기 인듯 하네» 라고 알려 주면 화난 그 배들에 멈춤을 적는가 · 기쁨 이유에 배 이름이 붙는가 (TallyOne 4.42-02)
//   검수사 2026-10-21 13:25 «시간상 작업중인데 작업량이 없어서 미르가 화남 상태 상황을 알려줬저니 미르가 한 답변. 그리고 미르가 1대 처리 되었다고 알리는데 오히려 그한대가 어느 선박인지 안알려줌».
//   화면 — 미르 «DJCF·STSE 터미널은 작업 중인데 앱 완료 기록이 실작업 75분째 없어요» · 홈 미르 칸 «아무래도 강풍대기 인듯 하네» → (AI) «열린 항차 정보가 없어서 …».
//   원인 — 규칙은 멈춤 알림(workStop)으로 알아들었지만 배가 없어 «어느 배인지 몰라 적지 못했어요» · 군말(아무래도·인듯·하네)이 남아 약한 답 → 모델.
//   재료는 RTDB GET 사본(fixtures/mirpause44202.json). node tools/smoke_mirpause44202.cjs <mirCore 번들> <저장소 루트>
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
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mirpause44202.json'), 'utf8'));
let n = 0, bad = 0;
const T = (cond, name, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const KST = (s) => Date.parse(s + ':00+09:00');
const AT = KST('2026-10-21T13:25');
const V = FX.voyages, HB = FX.heartbeat;
//  떠 있는 미르(홈 — 열린 항차 없음) 재료 — MirFab ctx 모양(mirBox · voyages · heartbeat)
const fab = (voy, now, extra) => Object.assign({ app: 'tally', mirBox: true, smallTalkLast: true, execDevice: true, modeChoice: 'both', countFallback: true, accepted: true, inspector: '연막', isChief: true,
  heartbeat: HB, voyages: voy, flat: M.flattenVoyages(voy), _now: now, _utterAt: now }, extra || {});
const ask = (q, ctx) => { const t = {}; const a = M.answerOneRaw(q, Object.assign(ctx, { _trace: t })); return { a: norm(a), via: t.via || '', weak: M.isWeakAnswer(q, a, t) }; };

console.log('① 재료 — 13:25 미르 화남(검수사 화면과 같은 두 배)');
{
  const r = M.angryReasons(V, HB, AT);
  T(r.length === 2 && /^DJCF 터미널은 작업 중인데 앱 완료 기록이 실작업 7\d분째 없어요$/.test(r[0]) && /^STSE /.test(r[1]), `화남 이유 ${r.length}건`, JSON.stringify(r));
  const tg = M.pauseTargetsOf(V, HB, AT);
  T(JSON.stringify(tg) === JSON.stringify([{ key: 'DJCF_0152N', vsl: 'DJCF' }, { key: 'STSE_2681E', vsl: 'STSE' }]), 'pauseTargetsOf = 화남 이유의 그 두 배(판정 한 벌)', JSON.stringify(tg));
}

console.log('② 홈 미르 칸 — 배 이름 없이 화남에 답한 멈춤 알림 → 화난 배들에 적는다(강한 답 — 모델로 안 감)');
const askT = (q, ctx) => { const t = {}; const a = M.answerOneRaw(q, Object.assign(ctx, { _trace: t })); return { a: norm(a), via: t.via || '', weak: M.isWeakAnswer(q, a, t), tg: t.pauseTargets || null }; };
const BOTH = JSON.stringify(['DJCF_0152N', 'STSE_2681E']);
for (const [q, why] of [['아무래도 강풍대기 인듯 하네', '강풍 대기로'], ['강풍 대기야', '강풍 대기로'], ['안개 때문에 다들 대기 중이야', '안개 대기로'], ['미르야 비 와서 우천으로 작업 중단됐어', '우천 대기로'],
  //  2차 시뮬 3·5 — 쉬운 말 날씨 · 우리 현장 소식 전함 · 이어지는 대기
  ['바람 불어서 작업 멈췄어', '강풍 대기로'], ['비 와서 쉬고 있어', '우천 대기로'], ['포맨이 강풍대기래', '강풍 대기로'], ['터미널에서 강풍대기라는데', '강풍 대기로'], ['안개 때문에 대기 중이래요', '안개 대기로'],
  ['강풍대기중 같은데', '강풍 대기로'], ['태풍 때문에 작업 중단', '강풍 대기로'], ['앱 입력은 강풍 대기라 없어', '강풍 대기로'],
  ['아까부터 강풍대기였어', '강풍 대기로'], ['강풍대기 시작해서 쉬는 중', '강풍 대기로'], ['강풍 풀려야 시작할 듯 지금은 대기', '강풍 대기로'], ['바람이 안 잦아들어서 계속 대기', '강풍 대기로'], ['바람 때문에 작업 멈춘 지 오래', '강풍 대기로']]) {
  const r = askT(q, fab(V, AT));
  T(r.via === 'workStop' && !r.weak && r.a.startsWith(`⏸ DJCF·STSE — ${why} 작업이 멈춘 걸로 적을게요`) && JSON.stringify(r.tg) === BOTH && !/어느 배|열린 항차/.test(r.a), `날씨 «${q}» → 두 배 다 «⏸ DJCF·STSE — ${why} …» · 적을 대상 넘김`, `${r.via} 약=${r.weak} tg=${JSON.stringify(r.tg)} · ${r.a}`);
}
//  감사 권고 — 날씨가 아닌 사유(장비 고장·사유 없음 …)는 한 배 일일 수 있어 여럿이면 되묻는다(적지 않는다)
for (const q of ['장비 고장으로 멈췄어', '다들 쉬고 있어', '야드 혼잡으로 작업 중단', '크레인 고장으로 멈췄어', '작업 중단이야']) {
  const r = askT(q, fab(V, AT));
  T(r.via === 'workStop' && !r.weak && /DJCF·STSE 중 어느 배요\?/.test(r.a) && !r.tg && !/적을게요\./.test(r.a.split('?')[0]), `날씨가 아닌 «${q}» → «DJCF·STSE 중 어느 배요?» · 적지 않음`, `${r.a} · tg=${JSON.stringify(r.tg)}`);
}
{
  //  화난 배가 한 척이면 사유와 무관하게 그 배에 적는다
  const V1 = JSON.parse(JSON.stringify(V)); delete V1.STSE_2681E;
  const r = askT('장비 고장으로 멈췄어', fab(V1, AT));
  T(r.via === 'workStop' && r.a.startsWith('⏸ DJCF — 장비 고장으로 작업이 멈춘 걸로 적을게요') && JSON.stringify(r.tg) === JSON.stringify(['DJCF_0152N']), '화난 배가 한 척이면 그 배에 «장비 고장으로»(조사 으로)', `${r.a} · tg=${JSON.stringify(r.tg)}`);
  const r2 = askT('작업 중단이야', fab(V1, AT));
  T(r2.a.startsWith('⏸ DJCF — 쉬는 중으로 작업이 멈춘 걸로 적을게요') && !r2.weak && JSON.stringify(r2.tg) === JSON.stringify(['DJCF_0152N']), '한 척 · 사유 없이 «작업 중단» 을 분명히 말하면 «쉬는 중» 으로 적는다', `${r2.a} · tg=${JSON.stringify(r2.tg)}`);
  //  2차 시뮬 1 — 잘못 잡았을 수 있는 말(작업 멈춤을 분명히 말하지 않음)은 한 척이어도 적지 않는다 · 종전처럼 약한 답(모델이 도움 답)
  for (const q of ['소리 멈춰', '미르 멈춰', '멈춰', '스캔 못 해', '로그인 못 해', '사진 못 해', '입력 못 해', '못하겠어', '잠깐 쉬고 올게', '화장실 가서 쉬고 올게', '미르도 쉬어', '푹 쉬어',
    '쉬는 시간이야', '나 오늘 쉬는 날이야', 'YT 대기', '게이트 대기', '출항 대기', '접안 대기', '도선 대기', '선석 대기']) {
    const r3 = askT(q, fab(V1, AT));
    T(!r3.tg && !/적을게요/.test(r3.a) && (r3.via !== 'workStop' || r3.weak), `한 척 · «${q}» → 적지 않음(약한 답)`, `via=${r3.via} 약=${r3.weak} tg=${JSON.stringify(r3.tg)} · ${r3.a.slice(0, 60)}`);
  }
}
{
  //  2차 시뮬(재) — 날씨 낱말이 섞인 불평·명령·내 볼일·조건은 화난 배에 날씨로 적지 않는다(멈춤을 지금 상태로 말하지 않았거나 폰·트럭 일)
  for (const q of ['비 와서 사진 못 해', '비 와서 스캔 못 해', '비 와서 입력 못 하겠어', '비 와서 폰이 멈췄어', '바람 때문에 사진 못 해', '바람 때문에 소리 멈춰', '바람 불어서 모자 날아가서 못 해',
    '비 와서 잠깐 쉬고 올게', '비 와서 화장실 가서 쉬고 올게', '비 와서 트럭 대기 중', '비 오면 대기해', '타이어 바람 빠져서 멈췄어']) {
    const r = askT(q, fab(V, AT));
    T(!r.tg && !/적을게요/.test(r.a), `두 척 · «${q}» → 적지 않음`, `via=${r.via} tg=${JSON.stringify(r.tg)} · ${r.a.slice(0, 60)}`);
  }
  const V1 = JSON.parse(JSON.stringify(V)); delete V1.STSE_2681E;
  for (const q of ['기계 고장으로 입력 못 해', '점심 먹고 올게 쉬고 있어']) {
    const r = askT(q, fab(V1, AT));
    T(!r.tg && !/적을게요/.test(r.a), `한 척 · «${q}» → 적지 않음`, `via=${r.via} tg=${JSON.stringify(r.tg)} · ${r.a.slice(0, 60)}`);
  }
  //  배 코드 꼴은 영문 네 글자만 — «TOS» 는 배 이름이 아니다
  const r6 = askT('TOS 멈춰서 작업 중단', fab(V, AT));
  T(!/찾지 못해/.test(r6.a) && /DJCF·STSE 중 어느 배요\?/.test(r6.a) && !r6.tg, '«TOS 멈춰서 작업 중단» → 배 이름으로 안 봄 · 사유 없음 두 척이라 되묻기', r6.a);
}
{
  //  2차 시뮬 2 — 영문 배 이름을 댔는데 앱 항차에 없으면 화난 다른 배로 돌리지 않는다(실입력 «MCAT 작업중단 이라고 했잖아 쉬고있어»)
  for (const q of ['MCAT 작업중단 이라고 했잖아 쉬고있어', 'MCAT 강풍대기야']) {
    const r = askT(q, fab(V, AT));
    T(!r.tg && /^MCAT — 앱 항차 목록에서 그 배를 찾지 못해 적지 못했어요/.test(r.a), `«${q}» → 화난 DJCF·STSE 로 돌리지 않음 · «MCAT — … 찾지 못해»`, `${r.a} · tg=${JSON.stringify(r.tg)}`);
  }
}
console.log('②-2 멈춤 알림이 아닌 말 — 적지 않는다(감사 상-1·권고 — 재개·해제·바람·남의 말·지난·앞날·방법·한 호기·차량 대기)');
for (const q of ['강풍대기 해제됐어', '강풍 대기 해제', '강풍 대기 해제됐으니 작업 시작해', '강풍 대기 풀림', '강풍 대기 종료', '중단 해제', '작업 중단 해제', '이제 대기 끝', '바람 잦아들어서 대기 해제',
  '다른 배는 강풍 대기래', '옆 터미널은 강풍 대기래', '어제 강풍 대기였어', '내일 강풍 대기래', '나 쉬고 싶어', '졸려서 쉬고 싶어', '너무 힘들어 쉬고 싶다', '강풍 대기 보고 어떻게 해',
  '2호기만 장비 고장으로 멈췄어', '리퍼 작업 대기 중', '트럭 대기 중', '차가 안 와서 대기 중이야', '야드 대기', '작업 중단 보고 어떻게 해']) {
  const r = askT(q, fab(V, AT));
  T(!r.tg && !M.parseNaturalQuery(q).pauseSet && !/작업이 멈춘 걸로 적을게요/.test(r.a), `«${q}» → 멈춤 알림 아님 · 적지 않음`, `via=${r.via} tg=${JSON.stringify(r.tg)} · ${r.a.slice(0, 70)}`);
}
{
  //  감사 중-2 — 미르 칸(mirBox)이 아니면(홈 통합검색 «미르야 …») 적는 손이 없으니 대상을 고르지 않는다 — 종전 정직한 문구
  const r = askT('미르야 강풍대기 상태야 쉬고 있어', fab(V, AT, { mirBox: false }));
  T(r.via === 'workStop' && /어느 배인지 몰라 적지 못했어요/.test(r.a) && !r.tg, '미르 칸이 아니면 «어느 배인지 몰라 적지 못했어요»(적는다고 말하지 않는다)', `${r.a} · tg=${JSON.stringify(r.tg)}`);
}
{
  //  답 뒤 한 마디 — 멈춘 배에 «이 속도면 몇 시에 끝나는지도 볼까요?» 를 붙이지 않는다(화면 2026-10-21 13:25 뒤 칩)
  const c = fab(V, AT); const t = {}; const a = M.answerOneRaw('아무래도 강풍대기 인듯 하네', Object.assign(c, { _trace: t }));
  const fo = M.mirThreadCommit('아무래도 강풍대기 인듯 하네', a, t.via || '', c);
  T(fo && !fo.line && !(fo.chips && fo.chips.length) && !fo.confirm, '멈춤 알림 답 뒤에는 속도·끝나는 시각 제안 칩을 달지 않는다', JSON.stringify(fo));
}
console.log('③ 그대로인 것');
{
  //  화나지 않았을 때(11:30 — 앱 완료가 막 있었다) 배 없이 말하면 종전대로 배를 묻는다 — 다만 이제 약한 답이 아니라 규칙 답이 그대로 나간다
  const r = ask('아무래도 강풍대기 인듯 하네', fab(V, KST('2026-10-21T11:30')));   // 화남 없음
  T(r.via === 'workStop' && !r.weak && /어느 배인지 몰라 적지 못했어요/.test(r.a), '화남이 없으면 종전대로 «어느 배인지 몰라» — 모델로 안 보낸다', `${r.via} 약=${r.weak} · ${r.a}`);
  //  배 화면(열린 항차)이면 그 배에 — 종전 그대로(배 이름을 붙이지 않는다)
  const v = V.DXQD_2641E;
  const r2 = ask('강풍대기 쉬고있어', fab(V, AT, { voyageKey: 'DXQD_2641E', voyage: v, info: v.info, vsl: v.info.vsl }));
  T(r2.via === 'workStop' && /^⏸ 강풍 대기로 작업이 멈춘 걸로 적을게요/.test(r2.a), '열린 항차가 있으면 그 배에 — 종전 문구', r2.a);
  //  미르 칸도 부름말도 아니면(통합검색 등) 가로채지 않는다
  const r3 = ask('아무래도 강풍대기 인듯 하네', fab(V, AT, { mirBox: false }));
  T(r3.via !== 'workStop', '미르 칸·부름말이 아니면 가로채지 않는다', r3.via);
  //  적은 뒤 — 중단 보고가 있으면 화내지 않는다(종전 규칙) → 대상도 없다
  const V2 = JSON.parse(JSON.stringify(V));
  for (const k of ['DJCF_0152N', 'STSE_2681E']) V2[k].reports = Object.assign({}, V2[k].reports, { [String(AT + 60000)]: { type: 'external_pause', reason: '강풍 대기', ts: AT + 60000, message: 'x', via: 'mir' } });
  T(M.angryReasons(V2, HB, AT + 120000).length === 0 && M.pauseTargetsOf(V2, HB, AT + 120000).length === 0, '적은 뒤엔 화남이 풀리고 대상도 없다(workPauseOf 한 벌)');
  //  2차 시뮬 4 — 적은 뒤 같은 알림을 또 하면(다른 기기 포함) «이미 적혀 있어요»(«어느 배인지 몰라» 가 아니다)
  const r5 = askT('아무래도 강풍대기 인듯 하네', fab(V2, AT + 120000));
  T(!r5.tg && !r5.weak && /DJCF 13:26 중단\(사유 강풍 대기\) · STSE 13:26 중단\(사유 강풍 대기\) — 이미 앱에 적혀 있어요/.test(r5.a), '같은 알림을 다시 하면 «DJCF·STSE … 이미 앱에 적혀 있어요»', `${r5.a} · tg=${JSON.stringify(r5.tg)}`);
  //  «왜 작업 안 해?» — 그 배 화면에서는 그 사유를 답한다(종전 길)
  const r4 = ask('왜 작업 안 해?', fab(V2, AT + 120000, { voyageKey: 'DJCF_0152N', voyage: V2.DJCF_0152N, info: V2.DJCF_0152N.info, vsl: 'DJCF' }));
  T(r4.via === 'workStop' && /사유는 강풍 대기/.test(r4.a) && !r4.weak, '«왜 작업 안 해?» → 사유 강풍 대기(강한 답)', r4.a);
}

console.log('④ 기쁨 이유 — 어느 배가 몇 대 완료했는지');
{
  const prev = { DXQD_2641E: 263, OBWH_2771E: 96, DJCF_0152N: 22 };
  T(M.mirDoneUpWhy(prev, { DXQD_2641E: 264, OBWH_2771E: 96, DJCF_0152N: 22 }, V) === 'DXQD 1대 완료했어요!', '한 배 1대 → «DXQD 1대 완료했어요!»', M.mirDoneUpWhy(prev, { DXQD_2641E: 264, OBWH_2771E: 96, DJCF_0152N: 22 }, V));
  T(M.mirDoneUpWhy(prev, { DXQD_2641E: 264, OBWH_2771E: 98, DJCF_0152N: 22 }, V) === 'DXQD 1대 · OBWH 2대 완료했어요!', '두 배 → «DXQD 1대 · OBWH 2대 완료했어요!»');
  T(M.mirDoneUpWhy(prev, { DXQD_2641E: 263, OBWH_2771E: 96, DJCF_0152N: 22, NEW_0001E: 5 }, V) === '', '새 항차 첫 등장은 완료가 아니다(3.56 감사 규칙 그대로)');
  T(M.mirDoneUpWhy(null, { DXQD_2641E: 264 }, V) === '' && M.mirDoneUpWhy(prev, { DXQD_2641E: 262 }, V) === '', '기준이 없거나 줄었으면 없음');
  T(M.mirDoneUpWhy({ ABCD_0001E: 1 }, { ABCD_0001E: 2 }, {}) === 'ABCD 1대 완료했어요!', '항차 자료가 아직 없으면 항차키 앞(선박 코드)으로');
}

console.log('⑤ 배선 — 떠 있는 미르가 같은 판정으로 적고 같은 함수로 기쁨을 말한다');
{
  const fabSrc = fs.readFileSync(path.join(ROOT, 'src/components/MirFab.jsx'), 'utf8');
  T(/const _ptg = \(r && r\.via === 'rules' && r\.trace && r\.trace\.via === 'workStop' && Array\.isArray\(r\.trace\.pauseTargets\)\) \? r\.trace\.pauseTargets : null;/.test(fabSrc) && /if \(!vk && _pq && _pq\.pauseSet && _ptg\)/.test(fabSrc) && /for \(const key of _ptg\) applySideEffects\(\{ pauseSet: _pq\.pauseSet \}, key, voyages && voyages\[key\], t\)/.test(fabSrc), '열린 항차가 없으면 엔진이 고른 배(trace.pauseTargets)에만 중단 기록 — 엔진이 다른 갈래로 답하면 안 적음(감사 중-1)');
  T(/const why = mirDoneUpWhy\(prev, cur, voyages\); if \(why\) mirMoodEvent\('workDone', why\)/.test(fabSrc) && !/\$\{up\}대 완료했어요/.test(fabSrc), '기쁨 이유는 mirDoneUpWhy 한 벌(«N대 완료했어요» 만 말하던 줄 없음)');
}
console.log(`\n${bad ? '✘' : '✔'} 미르 4.42-02(화난 배에 멈춤 알림 · 기쁨에 배 이름) 연막검사 ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
