// 5.28 미르 건의 1차 연막검사 — 검수사가 준 건의 120 중 «미르 답» 묶음이 실자료(TMPZ 2041E)에서 확정한 대로 답하는지 잰다.
//   검수사 2026-11-27 «중복은 제외하고 되던 기능인데 보충할것이 있는지 없는기능인데 추가 할만한 것인지를 구분하여 적용 바랍니다» · 관문 4 확정(보고 문장 고침 포함).
//   번들 = mirCore.entry(node cjs) · 고정본 = tools/fixtures/field526_tmpz.json(이 항차) + tools/fixtures/sugg528_tmpz.json(선박 통계·앞 항차·베이사전)
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
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/field526_tmpz.json'), 'utf8'));
const FX2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/sugg528_tmpz.json'), 'utf8'));
const vk = FX.voyageKey, v = FX.voyage, info = v.info;
let n = 0, bad = 0;
const check = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const cs = M.flattenVoyages({ [vk]: v });
const comp = Object.assign({}, (v.discharge || {}).completed || {}, (v.loading || {}).completed || {});
const tally = (extra = {}) => Object.assign({ app: 'tally', smallTalkLast: true, execDevice: false, modeChoice: 'both', countFallback: true, inspector: '홍길동', isChief: false, pilotForecast: FX.pilotForecast, shipSpeed: null,
  voyages: { [vk]: v }, flat: cs, voyageKey: vk, voyage: v, info, vsl: info.vsl, mode: 'discharge', containers: cs, compMap: comp, shiftMap: null, bayPairs: null, rfSkip: false, diagAlerts: [], _trace: {} }, extra);
const cone = () => ({ app: 'cone', containers: cs, cone: { rows: [], dischRows: [], stowRows: [] }, execDevice: false, shiftN: 0, mode: 'discharge', modeLabel: '양하', info, compMap: comp, shiftMap: null,
  voyage: v, vsl: info.vsl, vslFull: info.vslFull, pier: info.pier, pilotForecast: FX.pilotForecast, voyageKey: vk, voyages: { [vk]: v }, _trace: {} });
const ask = (q, mk = tally) => { const c = typeof mk === 'function' ? mk() : mk; const a = M.answerOneRaw(q, c); return { a: a == null ? '' : String(a), via: (c._trace && c._trace.via) || '', field: (c._trace && c._trace.field) || '', weak: M.isWeakAnswer(q, a, c._trace) }; };

console.log('■ 5.28 미르 건의 1차 — TMPZ 2041E 실자료');
//  ① 자료에 없는 배(질문 300 #98 · 건의 19·28·53)
{
  const r = ask('MV HANA STAR 0247W 이번 항차 입항 예정 대수 대충 얼마야');
  check('없는 배 «MV HANA STAR 0247W» → «자료에 없는 배» · 지금 배 이름', r.via === 'unknownShip' && /HANA STAR» 는 자료에 없는 배/.test(r.a) && /TMPZ TIAN HAI PING ZE 2041E/.test(r.a) && !r.weak, r.a.slice(0, 120));
  const r2 = ask('HANA STAR호 언제 들어와');
  check('«HANA STAR호» 처럼 배 표기가 붙으면 같은 답', r2.via === 'unknownShip', `${r2.via} · ${r2.a.slice(0, 60)}`);
  //  감사 2026-11-27 — 배 표기 없는 영문 두 낱말(선사·항구·품명·인사말)은 판정하지 않는다
  for (const q of ['HANA STAR 언제 들어와', 'TIAN HAI PING ZE 양하 몇 대', 'TMPZ 양하 몇 대', 'TMPZ KBTR 비교', 'WAN HAI 양하 몇 대', 'PAN OCEAN 몇 대', 'Dangerous Goods 몇 대', 'Thank you', 'Good morning',
    'Kakao Talk 으로 보내줘', 'FLAT RACK 위치', '양하 20피트 몇 대', 'OPEN TOP 있어?', 'TJM 선사 몇 대', 'MV TIAN HAI PING ZE 양하 몇 대']) {
    const x = ask(q);
    check(`있는 배·업무 낱말 «${q}» 은 «자료 없음» 이 아니다`, x.via !== 'unknownShip', x.a.slice(0, 60));
  }
}
//  ② 대수 답 근거 줄(건의 19 · 2차 18) — 답의 모드만
{
  //  고정본에는 EDI 원문 칸(raw)이 없어 실자료(2026-11-27 RTDB) 값을 얹는다 — 받은 시각 recvAt(선적) · 올린 시각 uploadedAt(양하)
  v.discharge.raw = { edi: { fileName: 'baplie.f_817253115824309_CKJZXPCCT_TIAN HAI PING ZE_2041E_e.', uploadedAt: '1795738525451' } };
  v.loading.raw = { edi: { fileName: 'TMPZ 041.EDI', recvAt: '1795738200000', uploadedAt: '1795738528004' } };
  const r = ask('양하 20피트 몇 대');
  check('«양하 20피트 몇 대» 183대 + 양하 근거 줄(EDI 올린 시각 11-27 09:15 · 리스트 파일)', /183대/.test(r.a) && /🗂 근거 — 양하 EDI 11-27 09:15 올림 · 리스트 Excel_20261126122132\.xls 외 1$/.test(r.a) && !/선적 EDI/.test(r.a), r.a.split('\n').pop());
  const r2 = ask('양하 선적 합쳐서 오늘 전체 물량 몇 대예요?');
  check('양하·선적 합친 답은 두 모드 근거(선적은 받은 시각 09:10)', /합계 615대/.test(r2.a) && /양하 EDI 11-27 09:15 올림/.test(r2.a) && /선적 EDI 11-27 09:10 받음 · 리스트 2041WLOADLIST\.xlsx/.test(r2.a), r2.a.split('\n').pop());
  const sub = ask('양하 20풀 40풀 45 엠티 따로 총대수');
  check('묶음 답에도 근거 줄은 한 번만', (sub.a.match(/🗂 근거/g) || []).length === 1, sub.a);
  const cn = ask('6278 어디');
  check('컨 한 대 위치 답에는 근거 줄을 붙이지 않는다(📊 대수 답만)', !/🗂 근거/.test(cn.a), cn.a.slice(0, 80));
}
//  ③ 지난 항차와 견주기(건의 20 · 2차 20·25·52)
{
  const noLib = ask('지난 항차랑 비교해줘');
  check('선박 통계가 없으면 종전 원장 안내(보관소)', noLib.via === 'fieldQA' && /보관소/.test(noLib.a), noLib.a.slice(0, 60));
  const lib = ask('지난 항차랑 비교해줘', tally({ shipLib: { voyages: FX2.voys } }));
  check('선박 통계만 있으면 대수 견주기 — 양하 318·지난 2039E 306(+12) · 선적 297·253(+44)', lib.field === 'prevCmp' && /양하 이번 318대 · 지난 2039E 306대\(\+12\)/.test(lib.a) && /선적 이번 297대 · 지난 2039E 253대\(\+44\)/.test(lib.a), lib.a);
  check('그 앞 항차 줄(2038E·2037E·2035E)', /그 앞 항차 — 2038E 양하 355·선적 276/.test(lib.a), lib.a.split('\n').pop());
  const full = ask('지난 항차랑 비교해줘', tally({ _prevCmp: { voys: FX2.voys, prevKey: FX2.prevKey, prevVoy: FX2.prevVoy } }));
  check('보관 자료가 있으면 규격·리퍼까지 — 양하 20풀 183/147 · 40 135/159 · 리퍼 2/0', /양하 이번 2041E 318대 · 지난 2039E 306대\(\+12\) — 20풀 183\/147 · 20엠티 0\/0 · 40 135\/159 · 리퍼 2\/0/.test(full.a), full.a);
  check('선적 20엠티 140/120 · 40 147/122', /선적 이번 2041E 297대 · 지난 2039E 253대\(\+44\) — 20풀 10\/11 · 20엠티 140\/120 · 40 147\/122/.test(full.a), full.a);
}
//  ④ 시프팅 따로 — 미르 시프팅 답과 같은 수(판정 한 벌)
{
  const one = ask('시프팅 몇 대').a.split('\n')[0];
  const r = ask('양하 선적 시프팅 따로 몇 대');
  const n1 = (one.match(/(\d+)대/) || [])[1];
  check('«양하 선적 시프팅 따로» → 합계 + 시프팅 줄(단일 답과 같은 수)', /합계 615대/.test(r.a) && new RegExp(`시프팅 ${n1}대 — 양하·선적 대수에 넣지 않고 따로`).test(r.a), `${one} · ${r.a}`);
}
//  ⑤ 체크디지트 — O 오독 · 계산 과정(신입 43·57)
{
  const r = ask('BOMU22O6278 맞아?');
  check('«BOMU22O6278» → O 를 0 으로 읽고 검산 맞음', /✅ BOMU2206278/.test(r.a) && /O 는 숫자로 읽었어요/.test(r.a), r.a);
  check('계산 과정 한 줄 — 합 5376 · 나머지 8', /🧮 계산 — B=12×1 \+ O=26×2/.test(r.a) && /= 5376 → 11로 나눈 나머지 8 → 끝자리 8/.test(r.a), r.a);
  const w = ask('BOMU2206275 체크디지트 맞아?');
  check('틀린 번호에도 계산 과정(끝자리 8)', /⚠ BOMU2206275/.test(w.a) && /끝자리 8/.test(w.a), w.a);
  { const t = ask('TCLU 123456 8 이거 번호가 맞는 번호인가요'); check('계산 과정의 끝자리 = 검산 체크디지트(TCLU1234568 → 8)', /✅ TCLU1234568/.test(t.a) && /끝자리 8$/.test(t.a.split('\n').pop()), t.a); }
}
//  ⑥ 보고 대상 + 보고 문장(검수사 고침 «수석» · «사진 3장 컨번호·끊긴 씰·리씰한 씰 · 리씰 후 카톡 전송 보고»)
{
  const r = ask('6278 실 끊겼어');
  check('«6278 실 끊겼어» → 컨 카드 + 수석 보고 + 보고 문장', /BOMU2206278/.test(r.a) && /📣 수석에게 보고할 일이에요/.test(r.a)
    && /«TMPZ 2041E 양하, BOMU2206278, 19-03-06, 실 끊김 — 사진 3장\(컨번호·끊긴 씰·리씰한 씰\) 찍고 리씰 후 카톡 전송 보고»/.test(r.a), r.a);
  const q2 = ask('6278 어디');
  check('그냥 위치 물음에는 보고 줄 없음', !/📣/.test(q2.a), q2.a.slice(0, 60));
  const q3 = ask('실 끊겼으면 어떻게 해');
  check('컨 없는 대처 물음에는 보고 문장 없음(원장 대처)', !/보고 문장/.test(q3.a), q3.a.slice(0, 60));
  for (const q of ['6278 데미지 있어?', '6278 파손됐었나요', '6278 실 끊긴 적 있어?', '6278 실 끊기면 어떻게 돼']) {
    const x = ask(q); check(`물음·가정·과거 «${q}» 에는 보고 문장 없음(감사)`, !/📣/.test(x.a), x.a.slice(-80));
  }
  const dm = ask('6278 데미지 났어');
  check('«6278 데미지 났어» → 수석 보고 + 데미지 보고 문장', /📣 수석에게 보고할 일이에요/.test(dm.a) && /데미지 — 손상 부위 사진 찍고 📷 데미지 보고로 카톡 전송 보고/.test(dm.a), dm.a.slice(-120));
  //  홈·떠 있는 미르가 질문 속 배를 고른 길(shipCtx — 실제 pickShipCtx) — 근거 줄도 붙는다(감사)
  const sc = M.pickShipCtx('TMPZ 양하 20피트 몇 대', { [vk]: v });
  const sx = ask('TMPZ 양하 20피트 몇 대', () => ({ app: 'tally', smallTalkLast: true, inspector: '홍길동', voyages: { [vk]: v }, flat: cs, shipCtx: sc, _trace: {} }));
  check('shipCtx 길(홈)에서도 📊 답에 근거 줄', /183대/.test(sx.a) && /🗂 근거 — 양하/.test(sx.a), sx.a.slice(-100));
}
//  ⑦ 담당 베이 = 갱 배분 구간(검수사 «갱배분 기능이 있습니다. 그거랑 연결시켜 보세요»)
{
  window.__fbShipBayDict = { TMPZ: FX2.bayDict };
  const r = ask('2호기 담당 베이');
  check('«2호기 담당 베이» → 갱 배분 구간(터미널 호기 2대로 2갱)', r.field === 'craneBay' && /담당 베이 — 갱 배분 기준\(2갱/.test(r.a) && /1번 갱 — 베이 01~15/.test(r.a) && /2번 갱 — 베이 19~29/.test(r.a), r.a);
  check('호기를 모르면 짐작하지 않고 시작을 알려 달라고 한다', /2호기가 어느 갱인지는 아직 몰라요/.test(r.a) && /포맨 지시가 우선/.test(r.a), r.a);
  window.__fbShipBayDict = {};
  const r2 = ask('2호기 담당 베이');
  check('베이사전이 없으면 호기별 대수 + «베이사전이 없어»', r2.field === 'craneBay' && /베이사전이 없어/.test(r2.a), r2.a.slice(-80));
}
//  ⑧ 강풍·리퍼 전원 — 검수사 확정 업무 규칙(통합운영지침서 7.4-P)
{
  const w = ask('바람 세면 작업 멈춰?');
  check('강풍 — 초속 8m 권고 · 9m 이상 멈춤', w.via === 'fieldQA' && /초속 8m 이상이면 작업을 멈출 수도/.test(w.a) && /초속 9m 이상/.test(w.a), w.a.slice(0, 100));
  const w2 = ask('미르야 강풍 대기 중이야');
  check('«강풍 대기 중이야» 는 원장이 아니라 작업 멈춤 기록 말', w2.via !== 'fieldQA', `${w2.via} · ${w2.a.slice(0, 60)}`);
  const p = ask('리퍼는 양하 후 몇 분 안에 전원 연결해야 해요?');
  check('리퍼 전원 — 검수원은 관여하지 않음 · 선적 때 선원에게 전원 전달', /관여하지 않아요/.test(p.a) && /선원에게 전달/.test(p.a) && !/몇 분 안에 꽂아야/.test(p.a), p.a.slice(0, 100));
}
//  ⑨ 리퍼 온도 리스트↔EDI · 무게 차이(물을 때만)
{
  const t = ask('리퍼 온도 리스트랑 EDI 다른 거 있어');
  check('리퍼 온도 리스트↔EDI — TMPZ 리퍼 2대 대조, 다른 것 없음', t.field === 'rfTempSrc' && /다른 리퍼 없어요 — 풀 리퍼 2대 대조/.test(t.a), t.a);
  const wt = ask('무게 차이 큰 컨 뽑아줘');
  check('무게 차이 — 자체 무게(중앙값) 빼고 1톤 넘게 벗어난 컨만(316대 아님)', wt.field === 'wtDiff' && /자체 무게\(차이 중앙값\) 3\.7t/.test(wt.a) && /FCIU8104819 리스트 35\.9t · EDI 21\.9t/.test(wt.a) && !/EAXU2042016/.test(wt.a), wt.a.slice(0, 160));
  const tot = Number((wt.a.match(/무게 차이 큰 컨 (\d+)대/) || [])[1]);
  check('무게 차이 대수가 양하 318 의 일부(10~40대)', tot >= 10 && tot <= 40, String(tot));
  const one = ask('6278 무게 VGM이랑 리스트 같아');
  check('컨 한 대 무게 물음은 목록이 아니라 그 컨(5.27 그대로)', one.field !== 'wtDiff', one.a.slice(0, 60));
}
//  ⑨-2 콘앱 실제 모양(cone.html mirAsk — EDI 원본·베이사전 없음): EDI 가 있어야 하는 대조는 거짓 «없음» 대신 콘앱 사유를 말한다(감사)
{
  const coneReal = () => ({ app: 'cone', containers: M.toMirContainers(Object.values(v.discharge.records || {}), 'discharge'), cone: { rows: [], dischRows: [], stowRows: [] }, mode: 'discharge', modeLabel: '양하', info, compMap: comp,
    voyage: { info, discharge: { records: v.discharge.records || {}, completed: v.discharge.completed || {} }, loading: { records: v.loading.records || {}, completed: v.loading.completed || {} } }, vsl: info.vsl, voyageKey: vk, _trace: {} });
  const w = ask('무게 차이 큰 컨 뽑아줘', coneReal);
  check('콘앱 무게 차이 → «검수앱 미르에서» (거짓 «없음» 아님)', /검수앱 미르에서 해요/.test(w.a) && !/없어요\.$/.test(w.a), w.a);
  const t = ask('리퍼 온도 리스트랑 EDI 다른 거 있어', coneReal);
  check('콘앱 리퍼 온도 대조 → «검수앱 미르에서»', /검수앱 미르에서 해요/.test(t.a), t.a);
  const b = ask('2호기 담당 베이', coneReal);
  check('콘앱 담당 베이 → «콘앱은 베이사전을 싣지 않아요»', /콘앱은 베이사전을 싣지 않아요/.test(b.a), b.a.slice(-80));
}
//  ⑨-3 5.28-01 라이브 실측 — 배 코드를 붙여 물어도(«미르야 TMPZ …») 같은 답(배 코드를 컨 앞자리로 읽지 않는다)
{
  for (const [q, f] of [['TMPZ 무게 차이 큰 컨 뽑아줘', 'wtDiff'], ['TMPZ 리퍼 온도 리스트랑 EDI 다른 거 있어', 'rfTempSrc'], ['TMPZ 지난 항차랑 비교해줘', 'prevCmp'], ['TMPZ 2호기 담당 베이', 'craneBay']]) {
    const x = ask(q, tally({ shipLib: { voyages: FX2.voys } }));
    check(`«${q}» → ${f}(앞자리 찾기 아님)`, x.field === f && !/앞자리로 찾기/.test(x.a), `${x.field} · ${x.a.slice(0, 60)}`);
  }
  const pf = ask('BOMU 로 시작하는 거 찾아줘');
  check('컨 앞자리 찾기는 그대로(BOMU…)', pf.field === 'prefix' && /BOMU… — \d+대/.test(pf.a), pf.a.slice(0, 60));
}
//  ⑩ 두 앱 같은 답
{
  for (const q of ['양하 20피트 몇 대', 'BOMU22O6278 맞아?', '바람 세면 작업 멈춰?', 'MV HANA STAR 양하 몇 대']) {
    const a = ask(q).a, b = ask(q, cone).a;
    check(`«${q}» 두 앱 같은 답`, a === b, `${a.slice(0, 60)} | ${b.slice(0, 60)}`);
  }
}
//  ⑪ 미르 마이크 한글 숫자(voice.spokenDigitsInText) — 화면 배선은 소스 확인
{
  const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  check('voice.js 에 spokenDigitsInText(4~11자 숫자 낱말만)', /export function spokenDigitsInText/.test(src('src/voice.js')) && /\{4,11\}/.test(src('src/voice.js')));
  check('미르·검색창·통합검색 마이크가 spokenDigitsInText 를 거친다', /spokenDigitsInText\(text\)/.test(src('src/components/MirFab.jsx')) && /spokenDigitsInText\(pickSpeechAlternative/.test(src('src/components/SearchPanel.jsx')) && /spokenDigitsInText\(text\.trim\(\)\)/.test(src('src/pages/GlobalSearchPage.jsx')));
  check('🔊 다시 읽기는 답 전체(400자 자르기 없음)', /aria-label="다시 읽어 주기\(답 전체\)"/.test(src('src/components/MirFab.jsx')) && !/speak\(plain\.slice\(0, 400\), \{ conversational: true \}\); \} catch \(e\) \{ \/\* \*\/ \} \}\}/.test(src('src/components/MirFab.jsx')));
  check('인계서에 데미지 보고 줄(handoverInfo.damage)', /━━ 데미지 보고 ━━/.test(src('src/nlSearch.js')) && /damage: \(\(\) => \{ try \{ return Object\.values\(\{ \.\.\.\(\(v && v\.photoIndex\)/.test(src('src/mir.js')));
}
console.log(bad ? `✗ 5.28 미르 건의 1차 연막검사 ${n - bad}/${n}` : `✔ 5.28 미르 건의 1차 연막검사 ${n}/${n}`);
process.exit(bad ? 1 : 0);
