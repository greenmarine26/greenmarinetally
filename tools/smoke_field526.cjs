// 5.27 미르 질문 300 연막검사 — 현장 문답 원장·묶음 대수 답이 실자료(TMPZ 2041E)에서 맞게 받고, 업무 집계를 가로채지 않고, 두 앱이 같은 답인지 잰다.
//   검수사 2026-11-27 «지금 올려주는 자료로 미르가 충실히 답할수 있게 만들어 주세요» · «대략 질문의 의도를 파악하고 적용하기 바랍니다».
//   번들 = mirCore.entry(node cjs) · 고정본 = tools/fixtures/field526_tmpz.json(2026-11-27 11:35 RTDB GET)
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
const vk = FX.voyageKey, v = FX.voyage, info = v.info;
let n = 0, bad = 0;
const check = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const cs = M.flattenVoyages({ [vk]: v });
const comp = Object.assign({}, (v.discharge || {}).completed || {}, (v.loading || {}).completed || {});
const tally = () => ({ app: 'tally', smallTalkLast: true, execDevice: false, modeChoice: 'both', countFallback: true, inspector: '홍길동', isChief: false, pilotForecast: FX.pilotForecast, shipSpeed: null,
  voyages: { [vk]: v }, flat: cs, voyageKey: vk, voyage: v, info, mode: 'discharge', containers: cs, compMap: comp, shiftMap: null, bayPairs: null, rfSkip: false, diagAlerts: [], _trace: {} });
const cone = () => ({ app: 'cone', containers: cs, cone: { rows: [], dischRows: [], stowRows: [] }, execDevice: false, shiftN: 0, mode: 'discharge', modeLabel: '양하', info, compMap: comp, shiftMap: null,
  voyage: v, vsl: info.vsl, vslFull: info.vslFull, pier: info.pier, pilotForecast: FX.pilotForecast, voyageKey: vk, _trace: {} });
const ask = (q, mk = tally) => { const c = mk(); const a = M.answerOneRaw(q, c); return { a: a == null ? '' : String(a), via: c._trace.via || '', field: c._trace.field || '', weak: M.isWeakAnswer(q, a, c._trace) }; };
const num = (s, re) => { const m = String(s).match(re); return m ? Number(m[1]) : null; };

check('실자료 — TMPZ 2041E 양하+선적 615대 펼침', cs.filter((c) => c._ptk !== false).length === 615, String(cs.length));

//  ① 묶음 대수 = 단일 답(판정 한 벌)
{
  const one = (q) => num(ask(q).a, /:\s*(\d+)대/);
  const f20 = one('양하 20피트 풀 몇 대'), f40 = one('양하 40피트 풀 몇 대');
  const r = ask('양하 20풀 40풀 45 엠티 따로 총대수');
  check('«양하 20풀 40풀 45 엠티 따로 총대수» → 묶음 답(sizeSplit)', r.via === 'fieldSplit' && r.field === 'sizeSplit', `${r.via}/${r.field}`);
  check('묶음 답의 20피트 풀·40피트 풀이 단일 답과 같은 수', r.a.includes(`20피트 풀 ${f20}`) && r.a.includes(`40피트 풀 ${f40}`) && f20 === 183 && f40 === 135, `${f20}/${f40} · ${r.a.slice(0, 120)}`);
  const r2 = ask('오늘 배 양하 총 몇대에요? 20이랑 40 나눠서요');
  check('«20이랑 40 나눠서» 를 끝네자리 2040 으로 읽지 않는다', r2.field === 'sizeSplit' && !/2040/.test(r2.a), r2.a.slice(0, 80));
  const dk = one('갑판 양하 몇 대'), hd = one('홀드 양하 몇 대');
  const r3 = ask('갑판 위 양하분이랑 홀드 안 양하분 대수 따로 알려줘요');
  check('갑판·홀드 따로 = 단일 답 두 개', r3.field === 'deckHold' && r3.a.includes(`갑판(데크) ${dk}대`) && r3.a.includes(`홀드 ${hd}대`), r3.a);
  const r4 = ask('양하 선적 합쳐서 오늘 전체 물량 몇 대예요?');
  check('양하·선적 합쳐서 = 318 + 297 = 615', r4.field === 'modeSplit' && /합계 615대/.test(r4.a), r4.a);
  const r5 = ask('TEU 로 하면 오늘 양하 몇 TEU 에요? TEU 계산법도 같이 알려주세요');
  check('양하 TEU = 183 + 135×2 = 453 + 계산법', r5.field === 'teu' && /453 TEU/.test(r5.a) && /계산법/.test(r5.a), r5.a.slice(0, 80));
  const r6 = ask('POD 별로 선적 대수 좀 정리해 주세요 부산 광양 이런식으로');
  check('선적 POD별 — 상해·닝보로 297대', r6.field === 'podSplit' && /총 297대/.test(r6.a) && /CNSHA 상해/.test(r6.a), r6.a.slice(0, 100));
  const r7 = ask('선적 40HC 는 전부 몇개인가요');
  check('선적 40피트 하이큐브 대수(엔진은 하이큐브를 못 걸렀다 — 297)', r7.field === 'hc' && /선적 40피트 하이큐브: 147대/.test(r7.a), r7.a);
  const r8 = ask('X-RAY 대상 총 몇 대고 그중 데크 몇 대');
  check('X-RAY 총 3대 그중 데크 2대', r8.field === 'xrayDeck' && /총 3대/.test(r8.a) && /데크\(갑판\) 2대/.test(r8.a), r8.a);
}

//  ② 컨 한 대 — 끝 4자리·11자리·위치 6자리·실번호
{
  const a = ask('1548 POD 어디로 찍혀있냐 부산 경유야?');
  check('«1548 POD … 부산 경유야» → POD 상해 · 부산은 안 거침(종전 «부산행 없음»)', a.field === 'cnAttr2' && /CNSHA 상해/.test(a.a) && /부산은 거치지 않아요/.test(a.a), a.a);
  const b = ask('6278 무게 VGM이랑 리스트 무게 같아?');
  check('«6278 무게 VGM이랑 리스트» → 리스트·EDI 두 무게(원장 VGM 뜻풀이로 가지 않는다)', b.field === 'cnAttr2' && /리스트 21,080kg/.test(b.a) && /EDI\(VGM\) 23,380kg/.test(b.a), b.a);
  const c = ask('끝번호 2297 풀이에요 엠티에요?');
  check('없는 끝 4자리 + 풀/엠티 → «없어요»(종전 «풀: 404대»)', c.field === 'cnAttr' && /2297 — 이 항차에 없어요/.test(c.a), c.a);
  const d = ask('190306 누구 컨이야');
  check('위치 6자리 190306 → 그 칸의 컨', d.field === 'posLookup' && /BOMU2206278/.test(d.a), d.a);
  const e = ask('BOMU 220627 8 이 컨테이너 몇번 베이에 있어요?');
  check('띄어 쓴 컨번호를 붙여 묻는다 → 19번 베이', e.field === 'cnJoin' && /19/.test(e.a), e.a);
  const f = ask('체크디지트 계산 해보니 안맞는거 같은데 BOMU 220627 8 이거 번호가 맞는 번호인가요?');
  check('11자리 검산 — BOMU2206278 맞음', f.field === 'cdOne' && /맞는 번호/.test(f.a), f.a);
  const g = ask('끝번호 7590 로 조회하면 두개가 나오는데 어떤게 맞는건지 어떻게 알아요');
  check('같은 끝 4자리 둘 — 둘 다 보이고 가리는 법', g.field === 'dup4' && /BOMU2227590/.test(g.a) && /TLLU5857590/.test(g.a) && /앞 영문 4글자/.test(g.a), g.a.slice(0, 120));
  const h = ask('트윈 20 몇 쌍이야 홀수베이 기준으로');
  check('트윈 몇 쌍 — 트윈 판정 한 벌(twinSplitOf)', h.field === 'twin' && /양하 \d+쌍/.test(h.a), h.a.slice(0, 80));
}

//  ③ 묻는 말 → 원장(지어낸 수치 없음)
{
  const want = [
    ['리퍼는 양하 후 몇 분 안에 전원 연결해야 해요?', 'rf_plug_time', /터미널·선사 규정/],
    ['실이 아예 없는 컨 나왔는데 그냥 내려도 돼?', 'seal_cut', /리씰/],
    ['45피트 데크에 실리면 콘 위치 다르지?', 'f45_cone', /45피트/],
    ['DG 컨 플래카드 없으면 선적 보류야', 'dg_label_diff', /수석에게 바로 보고/],
    ['바람이 세면 작업 중지 한다는데 기준이 몇 미터에요? 검수사도 철수 하나요', 'safe_wind', /터미널 안전 규정/],
    ['오버랜드 숏랜드 가 뭐에요? 마감할때 그거 쓰라고 하시던데', 'shortover', /초과 컨 추가/],
    ['콘앱 계산이랑 검수앱 계산 콘 숫자 다른데 왜 그래', 'cone_diff', /같은 EDI/],
    ['20피트 두개를 40 자리에 실을때 가운데는 무슨 콘 써요?', 'cone_center', /코끼리콘/],
    ['검수봇이 틀린 답을 한 것 같은데 어디에 알려야 하나요', 'app_wrong', /오답/],
    ['실번호 불일치 발견하면 세관 통보까지 가야 돼?', 'seal_customs', /SLN/],
    ['베이 로우 티어가 각각 뭔지 아직도 헷갈립니다 쉽게 설명해 주실 수 있나요', 'brt', /베이 = 앞뒤/],
    ['글씨가 너무 작은데 크게 할 수 있어요?', 'app_font', /글자 크기/],
  ];
  for (const [q, id, re] of want) { const r = ask(q); check(`«${q.slice(0, 26)}…» → 원장 ${id}`, r.via === 'fieldQA' && r.field === id && re.test(r.a) && !r.weak, `${r.via}/${r.field} · ${r.a.slice(0, 80)}`); }
  //  바람 기준 수치를 지어내지 않는다
  check('강풍 답에 풍속 숫자(m/s)를 지어내지 않는다', !/\d+\s*(?:m\/s|미터)/.test(ask('오늘 바람 세면 데크 고단 작업 중지 기준 몇 미터야').a));
  check('원장 답에 «카토스» 낱말이 없다(2026-11-23)', !M.mirKnowledge || ['리스트에 없는 컨이 나왔어요 어떻게 해요?', '작업 완료 처리 어디서 해요?'].every((q) => !/카토스/.test(ask(q).a)));
}

//  ④ 업무 집계·조회는 원장이 가로채지 않는다(종전 답 그대로)
{
  for (const q of ['리퍼 몇 대', '양하 20피트 풀 몇 대', '6278 어디', 'X-RAY 몇 대', '몇 시에 끝나', '실번호 점검', '14번 베이 양하 몇 대 남았어', '시프팅 몇 대']) {
    const r = ask(q);
    check(`«${q}» 는 원장·묶음 답이 아니다(엔진 몫)`, r.via !== 'fieldQA' && r.via !== 'fieldSplit', `${r.via}/${r.field} · ${r.a.slice(0, 60)}`);
  }
}

//  ④-2 2차 감사(2026-11-27)에서 찾은 가로채기 — 종전 길(작업 멈춤 기록·목록·콘 작업표·항차 번호·실번호·남은 수·담당 검수원·끝나는 시각)이 그대로여야 한다
{
  const keep = [
    ['미르야 강풍 대기 중이야', (r) => r.via !== 'fieldQA'],
    ['강풍으로 작업 중지', (r) => r.via !== 'fieldQA'],
    ['OOG 있어요?', (r) => r.via !== 'fieldQA'],
    ['환적 컨 위치 알려줘', (r) => r.via !== 'fieldQA'],
    ['TMPZ 2041E 양하 20피트 풀 엠티 알려줘', (r) => !/끝네자리 2041/.test(r.a)],
    ['실번호 123456 붙은 컨 누구 거야', (r) => r.field !== 'posLookup'],
    ['20피트랑 40피트 중 남은 거 몇 대', (r) => r.field !== 'sizeSplit'],
    ['리퍼 TJM 거 몇 대', (r) => r.field !== 'opCount'],
    ['양하 선적 합쳐서 남은 거 몇 대', (r) => r.field !== 'modeSplit'],
    ['1호기 담당이 누구야', (r) => r.field !== 'craneBay'],
    ['출항까지 몇 시간 남았어', (r) => r.field !== 'depart'],
    ['하이큐브 어떻게 구분하는지 알려 주세요', (r) => r.via !== 'fieldSplit'],
    ['NSFR 엑스레이 대상 위치', (r) => r.field !== 'specialPos' && !/FR 없음/.test(r.a)],   // 배 코드의 FR 을 플랫랙으로 읽지 않는다(smoke_mirfab 회귀)
    ['DJCF FR 위치', (r) => r.field === 'specialPos'],
    ['포트별 정확도', (r) => r.field !== 'podSplit' && !/목적지\(POD\)별/.test(r.a)],   // 미르 양하 정확도(4.56) 몫
  ];
  {   //  콘 작업표가 있는 콘앱 — 베이별 실수치(coneAnswer)가 일반 설명에 덮이지 않는다
    const c = cone(); c.cone = { rows: [{ bay: '05', deck: { need: 2, have: 1, diff: 1 } }], dischRows: [], stowRows: [] };
    const a = M.answerOneRaw('5번 베이 콘 몇 개 필요해', c);
    check('콘 작업표가 있으면 «5번 베이 콘 몇 개» 는 콘 계산 답(원장 일반 설명 아님)', c._trace.field !== 'cone_calc' && !/콘 개수 세는 법/.test(String(a)), String(a).slice(0, 80));
  }
  for (const [q, ok] of keep) { const r = ask(q); check(`«${q}» 를 원장·묶음 답이 가로채지 않는다`, ok(r), `${r.via}/${r.field} · ${r.a.slice(0, 70)}`); }
}

//  ⑤ 두 앱 같은 답(검수사 2026-09-11)
{
  for (const q of ['양하 20풀 40풀 45 엠티 따로 총대수', '실이 아예 없는 컨 나왔는데 그냥 내려도 돼?', '1548 POD 어디로 찍혀있냐 부산 경유야?', '트윈 20 몇 쌍이야 홀수베이 기준으로', '콘이 뭔지 정확히 모르겠어요 컨테이너 모서리에 끼우는 쇳덩이 말하는건가요']) {
    const a = ask(q).a, b = ask(q, cone).a;
    check(`«${q.slice(0, 24)}…» 두 앱 같은 답`, a && a === b, `\n      검수앱: ${a.slice(0, 100)}\n      콘앱: ${b.slice(0, 100)}`);
  }
}

console.log(`\n${bad ? '✘' : '✔'} 5.27 미르 질문 300 연막검사 ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
