// 콘앱 «완료 화면·완료/전체·쉬는 시간»(2.27) 연막검사 — 소스에서 CT 블록을 **그대로** 꺼내(베껴 적지 않는다) DJCT 0223E 실데이터 사본으로 돌린다.
//   검수사 2026-09-06 «양하 123/251 선적 12/274 이런식으로» · «완료된 선박이라는걸 표시» · «완료가 되면 … 완료처리 화면으로».
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.resolve(__dirname, '..', 'public', 'cone.html');
const html = fs.readFileSync(SRC, 'utf8');
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'conedone_djct.json'), 'utf8'));
let bad = 0; const T = (ok, why) => { console.log((ok ? '  ✓ ' : '  ✗ ') + why); if (!ok) bad++; };
const hcc = html.match(/function holdConeCount\(size, shipType, multiCount\)\{[\s\S]*?\n\}\n/);
const ct = html.match(/const CT = \{[\s\S]*?\nfunction ctCountLine\([\s\S]*?\n\}\n/);
T(!!hcc && !!ct, 'holdConeCount · CT 블록(const CT ~ ctCountLine)을 소스에서 꺼냈다');
if (!hcc || !ct) { console.log('✗ 콘앱 완료 화면 연막검사 실패'); process.exit(1); }
function run(opts) {
  const ctx = { console, Date, Math, Set, Map, Object, Array, String, Number, parseInt, JSON, setInterval: () => 1, clearInterval: () => {},
    document: { addEventListener: () => {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], documentElement: { style: { setProperty: () => {} } } },
    window: {}, state: { shipType: 'container', multiCount: 4, _bayDictBays: null, voyageKey: 'DJCT_0223E',
      disch: { ediRows: FX.discharge_ediRows }, stow: { ediRows: FX.loading_ediRows } },
    fbFetch: async () => ({ ok: false }), ensureConeBayDict: async () => {} };
  vm.createContext(ctx);
  vm.runInContext(hcc[0] + '\n' + ct[0] + '\nthis.__ctCompute = ctCompute; this.__CT = CT; this.__rest = ctRestNow; this.__pierOf = ctPierOf; this.__pierTw = ctPierFromTw;', ctx);
  const C = ctx.__CT;
  C.key = 'DJCT_0223E'; C.pier = 'PCTC'; C.vsl = 'DJCT'; C.voy = '0224W'; C.at = Date.now();
  C.tw = { discharge: opts.twD || {}, loading: opts.twL || {} };
  C.comp = { discharge: opts.cpD || {}, loading: opts.cpL || {} };
  return { r: ctx.__ctCompute(), rest: ctx.__rest, pierOf: ctx.__pierOf, pierTw: ctx.__pierTw };
}
console.log('콘앱 완료 화면·완료/전체·쉬는 시간 (DJCT 0223E 실데이터 사본)');
const D = FX.discharge_ediRows.length, L = FX.loading_ediRows.length;
T(D === 251 && L === 274, `픽스처 — 양하 계획 ${D} · 선적 계획 ${L}`);
//  ① 다 찼으면 완료
const full = run({ cpD: FX.discharge_completed, cpL: FX.loading_completed, twD: FX.discharge_termWork, twL: FX.loading_termWork });
T(full.r.done.discharge === D && full.r.done.loading === L, `완료 수 양하 ${full.r.done.discharge}/${D} · 선적 ${full.r.done.loading}/${L}`);
T(full.r.finished === true, '양하·선적이 다 찼으면 finished');
//  ② 하나라도 남으면 완료가 아니다
const one = Object.fromEntries(Object.entries(FX.loading_completed).slice(0, L - 1));
T(run({ cpD: FX.discharge_completed, cpL: one }).r.finished === false, '선적 한 대라도 남으면 완료가 아니다');
T(run({ cpD: {}, cpL: {} }).r.finished === false, '아무것도 안 했으면 완료가 아니다');
//  ③ 양하만 있는 배 — 양하만 차면 완료
{
  const ctx = run({ cpD: FX.discharge_completed, cpL: {} });
  T(ctx.r.finished === false, '선적 계획이 있는 배는 선적이 비면 완료가 아니다');
}
//  ④ 쉬는 시간(PCTC 근무시간표 — 검수사 2026-09-06 원문)
const rest = full.rest;
const at = (h, m) => new Date(2026, 8, 6, h, m).getTime();
T(rest('PCTC', at(12, 30)).rest === true && rest('PCTC', at(12, 30)).until === '13:00', 'PCTC 12:30 은 중식 — 13:00 재개');
T(rest('PCTC', at(0, 30)).rest === true && rest('PCTC', at(0, 30)).until === '01:00', 'PCTC 00:30 은 야식 — 01:00 재개');
T(rest('PCTC', at(3, 45)).rest === true && rest('PCTC', at(3, 45)).until === '04:00', 'PCTC 03:45 는 티타임 — 04:00 재개');
T(rest('PCTC', at(7, 0)).rest === true && rest('PCTC', at(7, 0)).until === '08:00', 'PCTC 07:00 은 아침 — 08:00 재개');
T(rest('PCTC', at(10, 0)).rest === false && rest('PCTC', at(20, 0)).rest === false && rest('PCTC', at(5, 0)).rest === false, 'PCTC 작업 시간(10:00·20:00·05:00)은 쉬는 시간이 아니다');
T(rest('PNCT', at(12, 0)).rest === true && rest('PNCT', at(12, 0)).until === '13:00', 'PNCT 12:00 은 중식(11:30~13:00)');
T(rest('PNCT', at(3, 0)).rest === false && rest('PNCT', at(0, 30)).rest === true, 'PNCT 야간 후반 01:00~05:30 · 00:30 은 야식');
//  ⑤ 완료 화면 문구가 소스에 있다(그림은 렌더 검사에서)
for (const need of ['작업 완료된 선박입니다', '수석 완료 처리 대기', '쉬는 시간 — ', 'ct-done'])
  T(html.includes(need), `문구 «${need}» 가 있다`);
//  ★ 2.27 **부두 문지기** — 검수사 «동방도 같이 넣어주세요 검수앱 사용할껄 대비해서».
//    `info.pier` 는 배가 다가와야 채워진다(실측 활성 18척 중 다섯). 그것만 보면 동방이 PCTC 시간표로 쉬고 PCTC 가 «동방»으로 적힌다.
const P = run({}).pierOf, PT = run({}).pierTw;
const CS = FX.pierCases || [];
let pWrong = 0, pNone = 0;
for (const c of CS) {
  const got = P(c);
  if (c.pier && got !== String(c.pier).toUpperCase()) { pWrong++; console.log(`    ⚠ ${c.key} 정답 ${c.pier} → ${got || '(못가림)'}`); }
  if (!got) pNone++;
}
T(CS.length >= 20, `부두 사례 ${CS.length}건(실데이터 사본)`);
T(pWrong === 0, `정답(pier) 있는 ${CS.filter((c) => c.pier).length}건과 어긋남 ${pWrong}`);
//  pier 를 가려도(모르는 척) 같은 답이 나와야 한다 — 활성 항차 대부분이 그 상태다
let hWrong = 0, hGot = 0;
for (const c of CS) {
  if (!c.pier) continue;
  const got = P({ ...c, pier: '' });
  if (got) { hGot++; if (got !== String(c.pier).toUpperCase()) { hWrong++; console.log(`    ⚠ ${c.key} pier 가림 → ${got} (정답 ${c.pier})`); } }
}
T(hWrong === 0, `pier 를 가려도 어긋남 ${hWrong} (가려서 판정된 것 ${hGot}건)`);
T(P({ lane: 'YTFF' }) === 'PNCT' && P({ lane: 'NTX' }) === 'PCTC', '항로표 — YTFF 동방 · NTX 평택컨');
T(P({ termVoy: 'OBWH104' }) === 'PNCT' && P({ termVoy: 'DJCF-0011' }) === 'PCTC', '항차 표기 — 하이픈 없으면 동방');
T(P({ berth: '동부두 15번선석' }) === 'PNCT' && P({ berth: '동부두 7번선석' }) === 'PCTC', '선석 — 13~16 동방 · 6~9 평택컨');
T(P({ berth: '신항 한진인천컨테이너터미널 7번선석' }) === '', '타항 선석은 평택 부두로 읽지 않는다(1.26-01 사고 자리)');
T(P({}) === '' && P(null) === '', '근거가 없으면 빈 문자열 — 지어내지 않는다');
//  자료 표식이 표기 관습보다 세다
T(PT({ discharge: { A: { src: 'pnct' } }, loading: {} }) === 'PNCT', 'termWork 가 전부 pnct 면 동방');
T(PT({ discharge: { A: { src: 'catos' } }, loading: {} }) === 'PCTC', 'termWork 에 pnct 가 없으면 평택컨');
T(PT({ discharge: { A: { src: 'pnct' }, B: {} }, loading: {} }) === '', '섞여 있으면 다지지 않는다(종전 판정 유지)');
//  부두를 못 가리면 쉬는 시간을 지어내지 않는다
const RN = run({}).rest;
const unk = RN('', new Date(2026, 8, 6, 12, 30).getTime());
T(unk.rest === false && unk.unknown === true, '부두 미상이면 «쉬는 시간»을 지어내지 않고 모른다고 한다');
T(RN('PCTC', new Date(2026, 8, 6, 12, 30).getTime()).rest === true, '부두를 알면 종전대로 판정한다');

console.log(bad ? `✗ 콘앱 완료 화면 검사 실패 ${bad}건` : '✓ 콘앱 완료 화면·완료/전체·쉬는 시간 검사 통과');
process.exit(bad ? 1 : 0);
