// 5.28-05 미르 오답 수리 연막검사 — 클로드2 실앱 시험 320문(2026-11-27, TMPZ 2041E)에서 나온 오답이 실자료로 다시 안 나오는지 잰다.
//   검수사 2026-11-27 «아직도 테스트중이나 결과 나온후에 해주세요 건건이 수정하지 마시고» · «테스터는 익히지 않음»
//   번들 ① mirCore.entry(answerOneRaw — 두 앱 같은 엔진) ② src/mir.js 직접(사전 학습 함수 — mirCore 는 내보내지 않는다)
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const ROOT = process.argv[3] || process.cwd();
const OUT_MIR = process.argv[4];
if (!OUT || !OUT_MIR) { console.error('✗ 번들 경로가 없다(mirCore · mir)'); process.exit(1); }
const store = {}; const writes = [];
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {}, __mirLexicon: store, __mirLexiconWrite: (k, e) => { writes.push([k, e]); store[k] = e; } };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
global.fetch = () => Promise.reject(new Error('연막: 네트워크 없음'));
const M = require(path.resolve(OUT));
const L = require(path.resolve(OUT_MIR));
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/field526_tmpz.json'), 'utf8'));
const vk = FX.voyageKey, v = FX.voyage, info = v.info;
let n = 0, bad = 0;
const check = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const cs = M.flattenVoyages({ [vk]: v });
const comp = Object.assign({}, (v.discharge || {}).completed || {}, (v.loading || {}).completed || {});
//  PORT-MIS 실자료(2026-11-27 RTDB port_mis_data/BOPY4 — 신고 출항 11-29 08:00 · 차항지 NINGBO)
const PM = { BOPY4: { berth: '동부두 15번선석', berthNo: 15, callsign: 'BOPY4', eta: '2026-11-27 10:30', etd: '2026-11-29 08:00', ibobprtSe: '입항', mrn: '26TJMS2041I', mrnIn: '26TJMS2041I', mrnOut: '26TJMS2041E', nextPort: 'NINGBO', nextPortOut: 'NINGBO', pier: 'PNCT', port: '평택', updatedAt: 1795767504262, vesselName: 'TIAN HAI PING ZE', vesselType: '풀컨테이너선', voyageInOut: '외항', voyageType: '최종' } };
const tally = (extra = {}) => Object.assign({ app: 'tally', smallTalkLast: true, execDevice: false, modeChoice: 'both', countFallback: true, inspector: '홍길동', isChief: false, pilotForecast: FX.pilotForecast, shipSpeed: null,
  voyages: { [vk]: v }, flat: cs, voyageKey: vk, voyage: v, info: Object.assign({ callsign: 'BOPY4' }, info), vsl: info.vsl, mode: 'discharge', containers: cs, compMap: comp, shiftMap: null, bayPairs: null, rfSkip: false, diagAlerts: [], portMisData: PM, _trace: {} }, extra);
const ask = (q) => { const c = tally(); const a = M.answerOneRaw(q, c); const s = a == null ? '' : String(a); return { a: s, via: (c._trace && c._trace.via) || '', weak: M.isWeakAnswer(q, s, c._trace) }; };

console.log('■ 5.28-05 미르 오답 수리 — TMPZ 2041E 실자료 · 클로드2 시험 320문');
//  ① 사전 학습 — 조건을 잃는 짝 · 토씨 잘림 · 테스터
{
  check('조건을 잃는 짝 «이번 배 40피트 양하 총 몇 대» → «양하 몇 대» 는 거절', /조건/.test(L.mirAutoAliasReject('이번 배 40피트 양하 총 몇 대야?', '양하 몇 대')), L.mirAutoAliasReject('이번 배 40피트 양하 총 몇 대야?', '양하 몇 대'));
  check('«영하 18도 리퍼만 따로 뽑아줄래요» → «리퍼 몇 대» 거절(온도)', L.mirCondLost('영하 18도 리퍼만 따로 뽑아줄래요?', '리퍼 몇 대').includes('temp'));
  check('«14번 베이 양하 몇대 남았는지» → «양하 몇 대 남았어» 거절(베이)', L.mirCondLost('14번 베이 양하 몇대 남았는지', '양하 몇 대 남았어').includes('bay'));
  check('조건을 지키는 짝은 통과 «4403 컨 이번 항차 평택 양하분에 있어요» → «4403 양하»', L.mirAutoAliasReject('4403 컨 이번 항차 평택 양하분에 있어요?', '4403 양하') === '', L.mirAutoAliasReject('4403 컨 이번 항차 평택 양하분에 있어요?', '4403 양하'));
  check('되쓸 말은 토씨를 안 뗀다(베이·온도·엑스레이 그대로)', L.mirTokensRaw('22번 베이 데크 온도 엑스레이').join(' ') === '22번 베이 데크 온도 엑스레이', L.mirTokensRaw('22번 베이 데크 온도 엑스레이').join(' '));
  writes.length = 0;
  check('테스터(«클로드2») 말은 사전에 안 적는다', L.mirLearnAlias('리퍼 온도 설정 다 보여줄 수 있어요', '리퍼 온도', '클로드2') === null && writes.length === 0);
  check('테스터(«클로드») 말도 안 적는다', L.mirLearnAlias('리퍼 온도 설정 다 보여줄 수 있어요', '리퍼 온도', '클로드') === null && writes.length === 0);
  const k = L.mirLearnAlias('끝자리 6627 리퍼 몇 도로 맞춰져 있어야 돼요', '6627 온도', '김성일');
  check('검수원 말은 적고, 되쓸 말이 «{n} 온도»(«온» 아님)', !!k && writes.length === 1 && writes[0][1].to === '{n} 온도', writes.length ? writes[0][1].to : '');
  //  예전 잘린 별칭(«22번 베 데크»)과 조건을 잃는 별칭(«양하 몇 대») — 되쓰기에서 걸러 낸다
  store[L.mirKey('이번 배 40피트 양하 총 몇 대야?')] = { kind: 'alias', from: '이번 배 40피트 양하 총 몇 대야?', to: '양하 몇 대', ok: '양하 몇 대', auto: true, src: 'model' };
  check('사전에 남은 «조건을 잃는 별칭» 은 되쓰지 않는다', L.mirRewrite('이번 배 40피트 양하 총 몇 대야?') === null, String(L.mirRewrite('이번 배 40피트 양하 총 몇 대야?')));
  store[L.mirKey('베이 22 갑판 위에 뭐 실려 있어요?')] = { kind: 'alias', from: '베이 22 갑판 위에 뭐 실려 있어요?', to: '22번 베 데크', ok: '22번 베이 데크', auto: true, src: 'model' };
  check('예전 잘린 별칭(«베»)은 원래 말(ok)로 되쓴다 → «22번 베이 데크»', L.mirRewrite('베이 22 갑판 위에 뭐 실려 있어요?') === '22번 베이 데크', String(L.mirRewrite('베이 22 갑판 위에 뭐 실려 있어요?')));
  for (const kk of Object.keys(store)) delete store[kk];
}
//  ② 맞는 답에 «맞게 알아들었나요?»(약한 답)를 붙이지 않는다 · 조건을 지킨 답
{
  const r1 = ask('이번 배 40피트 양하 총 몇 대야?');
  check('«이번 배 40피트 양하 총 몇 대» = 40피트 135대 · 강한 답', /40피트 양하: 135대/.test(r1.a) && !r1.weak, r1.a.slice(0, 60));
  const r2 = ask('영하 18도 리퍼만 따로 뽑아줄래요?');
  check('«영하 18도 리퍼만 따로 뽑아줄래요» = 목록 2대(컨번호) · 강한 답', /SEGU9034356/.test(r2.a) && /TTNU8534356/.test(r2.a) && !r2.weak, r2.a.slice(0, 60));
  const r3 = ask('14번 베이 양하 몇대 남았는지 알수있나요? 지금까지 한거 빼고요');
  check('«14번 베이 양하 몇대 남았는지 …» = 14번 베이 양하 남은 수 · 강한 답', /14번 베이 양하 남은 작업/.test(r3.a) && !r3.weak, r3.a.slice(0, 60));
  const r4 = ask('베이 22 갑판 위에 뭐 실려 있어요?');
  check('«베이 22 갑판 위에 뭐 실려 있어요» = 컨 목록(9552)', /9552 @ 21-01-84/.test(r4.a) && !r4.weak, r4.a.slice(0, 60));
  const r5 = ask('리퍼 몇 대인지 어느 자료 몇 시 판으로 셌는지 같이 말해줘');
  check('«리퍼 몇 대인지 어느 자료 몇 시 판으로 셌는지» = 리퍼 대수 + 근거 줄(지금 시각 아님)', /리퍼: 2대/.test(r5.a) && /🗂 근거/.test(r5.a) && !/지금은/.test(r5.a) && !r5.weak, r5.a.slice(0, 80));
  check('«지금 몇 시야» 는 그대로 시각', /지금은/.test(ask('지금 몇 시야').a));
  const r6 = ask('끝자리 4721 컨 어디 실려 있어요?');
  check('없는 번호 «4721» — 없다는 답은 강한 답(되묻기 안 붙음)', /4721/.test(r6.a) && /없/.test(r6.a) && !r6.weak, `${r6.weak} ${r6.a.slice(0, 60)}`);
}
//  ③ 작업 중단 오인 — 부탁은 멈춤 알림이 아니다(2026-11-27 22:33 TMPZ 에 실제로 적혔다)
{
  const p1 = M.parseNaturalQuery('미르야 쉬는 시간이니까 베이 위치 읽기 연습 문제 세 개 내줘');
  check('«쉬는 시간이니까 … 연습 문제 세 개 내줘» 는 중단 보고가 아니다', !p1.pauseSet);
  const p2 = M.parseNaturalQuery('미르야 강풍대기 상태야 쉬고 있어');
  check('«미르야 강풍대기 상태야 쉬고 있어» 는 그대로 중단 보고(강풍 대기)', !!(p2.pauseSet && p2.pauseSet.reason === '강풍 대기' && p2.pauseSet.sure));
  const p3 = M.parseNaturalQuery('작업 중단 점심 식사');
  check('«작업 중단 점심 식사» 도 그대로', !!(p3.pauseSet && p3.pauseSet.reason === '점심 식사'));
}
//  ④ 컨 속성 물음 · 없는 번호 · 없는 베이 · 빈칸 · 0대 진행 · 없는 호기
{
  const a1 = ask('BOMU 8200071 이거 하이큐브 맞아요?');
  check('«BOMU 8200071 이거 하이큐브 맞아요?» = 그 컨 규격(40HC) — 검산 아님', /BOMU8200071/.test(a1.a) && /40HC/.test(a1.a) && !/검산/.test(a1.a), a1.a.slice(0, 80));
  check('«BOMU 8200071 맞아요?» 는 그대로 검산', /검산\(ISO 6346\)이 맞는 번호/.test(ask('BOMU 8200071 맞아요?').a));
  const a2 = ask('8846 POD 어디로 찍혀있어 부산 경유야?');
  check('없는 번호 «8846 POD … 부산 경유야» = 번호가 없다(«부산행» 거르기 아님)', /끝네자리 8846 — 이 항차 자료/.test(a2.a) && !/부산행/.test(a2.a), a2.a);
  check('있는 번호 «6278 POD … 부산 경유야» = POL·POD·부산 안 거침', /POD KRPTK/.test(ask('6278 POD 어디로 찍혀있어 부산 경유야?').a));
  for (const q of ['82베이 데크 리퍼 몇 대', '34베이 40피트인데 33 35 짝으로 20 들어간 데 있어?', '46베이 로우별로 티어 몇 단까지 올라가 있어']) {
    const x = ask(q);
    check(`없는 베이 «${q}» = «📭 N번 베이 없음» + 있는 베이`, x.via === 'noBay' && /📭 \d+번 베이 없음 — 이 항차 자료\(EDI·리스트\)에 그 베이 컨이 한 대도 없어요/.test(x.a) && /01·02·03/.test(x.a) && !x.weak, x.a.slice(0, 60));
  }
  check('있는 베이 «14번 베이 양하 몇 대» 는 그대로 37대', /14번 베이 양하: 37대/.test(ask('14번 베이 양하 몇 대').a));
  const b1 = ask('14베이 홀드 03로우 빈칸 맞아? 베이플랜엔 비어있는데');
  check('«14베이 홀드 03로우 빈칸 맞아» = 그 줄 컨을 모드별로(양하 6 · 선적 3)', /14베이 홀드 03로우 — 이번 항차 컨 9대/.test(b1.a) && /양하 6대/.test(b1.a) && /선적 3대/.test(b1.a), b1.a.slice(0, 80));
  const b2 = ask('14번 베이 빈 슬롯');
  check('«14번 베이 빈 슬롯» 에 모순 수(적재 60 > 슬롯 45) 없음', !/관측 슬롯/.test(b2.a) && /양하 37칸 · 선적 23칸/.test(b2.a), b2.a.slice(0, 80));
  const o1 = ask('미르야 OOG 데크 최상단 아닌 데 들어간 거 있어');
  check('대상 0대 진행 답은 «없음»(«완료 0대 / 전체 0대 (0%)» 아님)', /없음/.test(o1.a) && !/0%/.test(o1.a), o1.a);
  const c1 = ask('3호 크레인 담당 베이 양하 총 몇 밴');
  check('이 배에서 안 일하는 «3호기» = 2·4호기만 있다', /3호기는 이 배/.test(c1.a) && /2·4호기/.test(c1.a), c1.a.slice(0, 80));
}
//  ⑤ 뜻 · 원장 · 콘 셈 · 다음 기항
{
  const d1 = ask('미르야 베이 로우 티어 뜻을 그림이랑 같이 보여줘');
  check('«베이 로우 티어 뜻을 그림이랑 같이 보여줘» = 뜻풀이(목록 아님)', /베이·로우·티어/.test(d1.a) && !/318대/.test(d1.a), d1.a.slice(0, 60));
  const l1 = ask('검수앱 처음 깔았는데 로그인이 안돼요 아이디는 누가 만들어 주는거에요');
  check('로그인 답에 본인 비밀번호(4.43) — «비밀번호 없음» 아님', /비밀번호는 내가 정해요/.test(l1.a) && !/아이디·비밀번호가 따로 없어요/.test(l1.a), l1.a.slice(0, 80));
  const r1 = ask('리퍼 컨 전원 꽂혀있는지는 검수사가 확인하는 건가요? 온도 다르면 어떻게 해요');
  check('두 가지를 이어 물은 말 = 리퍼 전원(관여 안 함) + 온도 다를 때 둘 다', /리퍼 전원/.test(r1.a) && /관여하지 않아요/.test(r1.a) && /리퍼 온도가 리스트와 다를 때/.test(r1.a), r1.a.slice(0, 80));
  const k1 = ask('20피트 갑판 3단이면 콘 몇 개 필요해요?');
  check('«20피트 갑판 3단이면 콘 몇 개» = 8개', /\(3−1\)×4 = 8개/.test(k1.a), k1.a.slice(0, 60));
  const k2 = ask('선적 20피트 12대 갑판 2단 쌓으면 콘 몇 개 깔아야 돼?');
  check('«12대 갑판 2단» = 6줄 × 4 = 24개(원장 예와 같은 수)', /6줄 × 4 = 24개/.test(k2.a), k2.a.slice(0, 80));
  check('트윈 가운데 콘은 세지 않고 원장 설명', !/콘 셈/.test(ask('트윈 20 데크 4단이면 미들콘 몇 개').a));
  const n1 = ask('이 배 다음 기항지 어디예요?');
  check('다음 기항 = PORT-MIS 차항지 NINGBO(출항 답과 같은 칸) + 화물 참고', /NINGBO \(PORT-MIS 차항지\)/.test(n1.a) && /참고 — 배에 남는 화물로는/.test(n1.a), n1.a);
  const e1 = ask('오늘 이 배 몇 시 출항 예정이에요?');
  check('출항 답의 다음 항구도 NINGBO(두 답 같음)', /다음 항구: NINGBO/.test(e1.a), e1.a);
}
//  ⑥ 감사(다른 클로드) 재현 — 진짜 중단 알림 · 부정·비교 말 · 위치 없는 자료 · 홀수 베이 로우 · 수집 전 진행 · 검산 · 목록 넓힘
{
  for (const q of ['미르야 작업 중단해 줘', '미르야 강풍대기 알려줘', '미르야 우천 대기 들어갔어 수석한테 알려줘', '미르야 점심 식사로 작업 중단 등록해줘', '미르야 크레인 고장으로 작업 중단 보고 좀 해주세요', '미르야 비 와서 멈췄어 기록해줘']) {
    const p = M.parseNaturalQuery(q);
    check(`진짜 중단 알림 «${q}» 은 그대로 중단 보고`, !!p.pauseSet, JSON.stringify(p.pauseSet || null));
  }
  for (const q of ['40피트 빼고 양하 몇 대', '40피트 아닌 거 양하 몇 대', '부산 안 가는 선적 몇 대', '리퍼 아닌 40피트 몇 대', '40피트 외에 양하', '40피트 나머지 몇 대', '지난 항차 40피트 양하 몇 대', '20피트 위에 40피트 실린 거', '리퍼 중에 제일 차가운 거', '14번 베이 40피트 비율', '14번 베이 짝수 로우만']) {
    const x = ask(q);
    check(`부정·비교 말 «${q}» 은 종전처럼 약한 답(모델이 고칠 수 있게)`, x.weak, `${x.via} ${x.a.slice(0, 50)}`);
  }
  //  위치 없는 행만 있는 자료(선적 리스트뿐) — 없는 베이로 단정하지 않는다
  {
    const rows = cs.filter((x) => x._mode === 'loading').map((x) => Object.assign({}, x, { bay: '', row: '', tier: '' }));
    const c = tally({ containers: rows, flat: rows });
    const a = String(M.answerOneRaw('선적 17베이 몇 대', c) || '');
    check('선적 위치가 아직 없는 자료에서 «선적 17베이 몇 대» 는 «베이 없음» 이 아니다', c._trace.via !== 'noBay' && !/베이 없음/.test(a), `${c._trace.via} ${a.slice(0, 60)}`);
  }
  const o1 = ask('13베이 갑판 02로우 비었어?');
  check('홀수 베이 로우 «13베이 갑판 02로우» 는 겹치는 40피트(14-02-84) 컨을 본다', /14-02-84/.test(o1.a) && !/빈칸이에요/.test(o1.a), o1.a.slice(0, 80));
  {
    const rows = cs.filter((x) => x._mode !== 'loading');
    const c = tally({ containers: rows, flat: rows });
    const a = String(M.answerOneRaw('선적 몇 대 남았어', c) || '');
    check('선적 자료가 아직 없는 배의 «선적 몇 대 남았어» 는 «선적 없음 — 해당 컨이 없어요» 가 아니다', !/선적 없음 — 이 항차 자료/.test(a), a.slice(0, 80));
  }
  const w1 = ask('WFHU5205488 하이큐브 맞아요?');
  check('자료에 없는 번호 «WFHU5205488 하이큐브 맞아요?» 는 검산 답(끝자리 고침)', /검산/.test(w1.a) && /WFHU5205487/.test(w1.a), w1.a.slice(0, 80));
  check('«리퍼 몇 대 뽑아줄래» 는 대수 답', /리퍼: 2대|리퍼 총 2대|2대/.test(ask('리퍼 몇 대 뽑아줄래').a));
  check('«WFHU5205487 안에 뭐 들어 있어» 는 넓힌 목록 말로 안 바뀐다', !M.parseNaturalQuery('WFHU5205487 안에 뭐 들어 있어').listQuery || /[A-Z]{4}\d{7}/.test(ask('WFHU5205487 안에 뭐 들어 있어').a));
  check('«냉장고에 뭐 들어 있어» 는 리퍼 목록 말이 아니다(자리 낱말 없음)', !M.parseNaturalQuery('냉장고에 뭐 들어 있어').listQuery);
  for (const q of ['같은 베이 리퍼 몇 대']) check(`묶기·나누기 말 «${q}» 은 약한 답`, ask(q).weak, ask(q).a.slice(0, 40));
  check('«몇 시 기준이야 이 자료» 는 시각 물음 그대로', !!M.parseNaturalQuery('몇 시 기준이야 이 자료').timeQuery);
  {
    const rows = cs.filter((x) => x._mode !== 'loading').map((x) => Object.assign({}, x, { bay: '', row: '', tier: '' }));
    const c = tally({ containers: rows, flat: rows });
    const a = String(M.answerOneRaw('14번 베이 양하 남았어?', c) || '');
    check('위치 없는 자료의 «14번 베이 양하 남았어?» = «아직 위치(베이)가 없어요»', /아직 위치\(베이\)가 없어요/.test(a), a.slice(0, 80));
  }
  {
    const T0 = { totals: { dis: { n: 318, F: {}, E: {} }, load: { n: 297, F: {}, E: {} } }, osIn: { rows: [1, 2, 3, 4] }, osOut: { rows: [1, 2, 3, 4, 5, 6, 7, 8] }, rfIn: [], rfOut: [], damage: {} };
    const c = tally({ computeTallyData: () => T0 });
    const a = String(M.answerOneRaw('마감텔리 수치', c) || '');
    check('마감텔리 답 — OS 집계표 줄 수를 «OOG» 라 부르지 않고 규격초과 대수(0)를 따로', /OS 집계표 줄 수 — OS-IN 4줄 · OS-OUT 8줄/.test(a) && /규격초과\(OOG·FR·OT\) 양하 0대 · 선적 0대/.test(a) && !/OOG in 4/.test(a), a.slice(0, 160));
  }
  check('«지금 몇 시 거 같아» 는 시각 물음 그대로', !!M.parseNaturalQuery('지금 몇 시 거 같아').timeQuery);
  check('«84단 콘 몇 개» 를 4단으로 세지 않는다', !/\(4−1\)×4/.test(ask('84단 콘 몇 개').a));
}
console.log(`✔ 5.28-05 미르 오답 수리 연막검사 ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
