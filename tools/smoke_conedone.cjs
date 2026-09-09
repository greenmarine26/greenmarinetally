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
  if (opts.state) Object.assign(ctx.state, opts.state);   // 2.47: 리스트만 있는 배는 stow 를 통째로 바꿔 넣는다
  vm.createContext(ctx);
  vm.runInContext(hcc[0] + '\n' + ct[0] + '\nthis.__ctCompute = ctCompute; this.__CT = CT; this.__rest = ctRestNow; this.__pierOf = ctPierOf; this.__pierTw = ctPierFromTw;'
    + '\nthis.__virt = ctVirtualApply; this.__total = ctPlanTotal; this.__plan1 = ctPlan1; this.__planRows = ctPlanRows; this.__holdBelow = ctHoldBelow; this.__state = state;', ctx);
  const C = ctx.__CT;
  C.key = opts.key || 'DJCT_0223E'; C.pier = opts.pier || 'PCTC'; C.vsl = 'DJCT'; C.voy = '0224W'; C.at = Date.now();
  C.tw = { discharge: opts.twD || {}, loading: opts.twL || {} };
  C.comp = { discharge: opts.cpD || {}, loading: opts.cpL || {} };
  //  2.39-01: «앱이 가진 대수»(목록의 ediD·ediL). 안 주면 «모른다»로 둔다 — 경고를 지어내지 않는지 본다.
  C.edi = (opts.edi === null) ? undefined : (opts.edi || { discharge: FX.discharge_ediRows.length, loading: FX.loading_ediRows.length });
  if (opts.virt) ctx.__virt();   // 2.47: 실적 자리를 리스트 행에 붙인 뒤 계산한다(ctFetch 의 차례와 같다)
  return { r: ctx.__ctCompute(), rest: ctx.__rest, pierOf: ctx.__pierOf, pierTw: ctx.__pierTw,
           total: ctx.__total, plan1: ctx.__plan1, planRows: ctx.__planRows, holdBelow: ctx.__holdBelow, state: ctx.__state };
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
//  ②-2 2.39-01: 계획을 아직 못 받은 모드가 도는 중이면 «완료»가 아니다 (2026-09-07 OBWH 18:30 실제 장면)
{
  const half = Object.fromEntries(Object.entries(FX.loading_termWork).slice(0, 121));
  const g = run({ cpD: FX.discharge_completed, cpL: {}, twD: FX.discharge_termWork, twL: half,
                  edi: { discharge: FX.discharge_ediRows.length, loading: 0 } });
  T(g.r.finished === false, '선적 자료가 아직 안 왔는데 실적이 돌면 완료가 아니다');
  T(JSON.stringify(g.r.needReload) === JSON.stringify(['loading']), '그때 선적을 «자료 미도착»으로 짚는다');
}
//  ②-3 2.39-01 회귀: 자료는 다 있는데 이 화면이 EDI 를 아직 안 읽었을 뿐이면 경고하지 않는다
//      (2.39 가 RZOR R097W — 양하 208·선적 197 이 다 있는 배에 경고를 띄운 자리)
T(run({ cpD: FX.discharge_completed, cpL: FX.loading_completed,
        twD: FX.discharge_termWork, twL: FX.loading_termWork }).r.needReload.length === 0,
  '자료가 있으면 «아직 안 읽음»을 «자료 미도착»이라 하지 않는다');
//  ②-4 «모른다»를 «없다»로 읽지 않는다 — CT.edi 가 없으면 경고를 지어내지 않는다
T(run({ cpD: FX.discharge_completed, cpL: FX.loading_completed,
        twD: FX.discharge_termWork, twL: FX.loading_termWork, edi: null }).r.needReload.length === 0,
  '«앱이 가진 대수»를 모르면 경고를 지어내지 않는다');
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

//  ★ 2.47 **리스트만 있는 배(동방 OBWH 2735E 실데이터 사본 2026-09-09 16:5x)** — 검수사 «항차선적 리스트갖고 동방자료에서 위치를 찾아 가상EDI를 만들어 주세요».
//    사고 장면: 선적 리스트 230대(가상 EDI, 자리 0) · 양하 267/267 · 선적 실적 36대 진행 중인데 화면은 «✅ 작업 완료 · 수석 완료 처리 대기».
{
  const OB = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'conedone_obwh.json'), 'utf8'));
  const rowOf = html.match(/function _ediRowOf\(c\)\{[\s\S]*?\n\}\n/);
  T(!!rowOf, '_ediRowOf(ediContainers 한 건 → 콘앱 행)를 소스에서 꺼냈다');
  const vmr = { console }; vm.createContext(vmr); vm.runInContext(rowOf[0] + '\nthis.__rowOf = _ediRowOf;', vmr);
  const listL = Object.values(OB.loading_ediContainers).map(vmr.__rowOf);
  const rowsD = Object.values(OB.discharge_ediContainers).map(vmr.__rowOf).filter(r => r.bay && r.tier);
  T(listL.length === 230 && listL.every(r => !r.bay && !r.tier), `선적 리스트 ${listL.length}대 — 자리 있는 행 0(가상 EDI)`);
  T(rowsD.length === 267, `양하 계획 ${rowsD.length}대(자리 있음)`);
  const twN = Object.keys(OB.loading_termWork).length, cpN = Object.keys(OB.loading_completed).length;
  const posN = Object.values(OB.loading_termWork).filter(t => t && t.at && String(t.pos || '').length === 6).length;
  T(twN >= 20 && posN === twN, `동방 선적 실적 ${twN}대 — 전부 자리(pos) 있음`);
  const mk = () => ({ ediRows: [], listRows: listL.map(r => ({ ...r })), total: listL.length, virtual: true, isEDI: true });
  //  ① 종전 사고 재현 — 가상 조립 전(선택 직후)에도 완료가 아니다: 분모가 리스트 230 이라 선적이 모드에 든다
  const g0 = run({ key: 'OBWH_2735E', pier: 'PNCT', state: { voyageKey: 'OBWH_2735E', disch: { ediRows: rowsD }, stow: mk() },
                   twD: {}, twL: OB.loading_termWork, cpD: OB.discharge_completed, cpL: OB.loading_completed, edi: { discharge: 267, loading: 230 } });
  T(g0.r.total.loading === 230 && g0.r.total.discharge === 267, `분모 — 양하 ${g0.r.total.discharge} · 선적 ${g0.r.total.loading}(리스트 대수)`);
  T(g0.r.done.discharge === 267 && g0.r.done.loading === cpN, `완료 수 — 양하 267 · 선적 ${g0.r.done.loading}`);
  T(g0.r.finished === false, '양하가 다 찼어도 선적 리스트가 남았으면 완료가 아니다(2026-09-09 OBWH 사고 자리)');
  T(g0.r.needReload.length === 0, '리스트가 있으니 «자료 미도착» 경고도 없다');
  //  ② 가상 조립 — 실적 자리를 리스트 행에 붙인다. 붙은 행 = 실적 있는 리스트 컨, 표식 _virtual
  const g1 = run({ key: 'OBWH_2735E', pier: 'PNCT', state: { voyageKey: 'OBWH_2735E', disch: { ediRows: rowsD }, stow: mk() },
                   twD: {}, twL: OB.loading_termWork, cpD: OB.discharge_completed, cpL: OB.loading_completed, edi: { discharge: 267, loading: 230 }, virt: true });
  const vr = g1.planRows('loading');
  const inList = new Set(listL.map(r => r.cn));
  const expect = Object.keys(OB.loading_termWork).filter(cn => inList.has(cn) && OB.loading_termWork[cn].at && String(OB.loading_termWork[cn].pos || '').length === 6).length;
  T(vr.length === expect && vr.length > 0, `가상 EDI 행 ${vr.length}대 = 리스트에 있고 실적 자리가 있는 컨 ${expect}대`);
  T(vr.every(r => r._virtual && r.bay && r.row && r.tier && r.cn && r.iso), '가상 행마다 _virtual·베이·열·단·컨번호·규격이 있다');
  const one = vr[0]; const tw1 = OB.loading_termWork[one.cn];
  T(String(tw1.pos) === `${String(one.bay).padStart(2, '0')}${one.row}${one.tier}`, `자리는 동방 pos 그대로 — ${one.cn} ${tw1.pos} → 베이 ${one.bay} 열 ${one.row} 단 ${one.tier}`);
  T(g1.total('loading') === 230, '가상 행이 생겨도 분모는 리스트 230 그대로(실린 수를 분모로 쓰지 않는다)');
  T(g1.r.finished === false && g1.r.total.loading === 230, '가상 조립 뒤에도 작업 중');
  //  ③ 가상 행은 «계획»이 아니다 — «곧 2단» 분모(ctPlan1)에 안 든다
  const pairs = new Set(vr.map(r => (parseInt(r.bay, 10) % 2 === 0 ? parseInt(r.bay, 10) : parseInt(r.bay, 10) - 1)));
  let planned = 0; for (const p of pairs) for (const t of [82, 84, 86, 88]) planned += g1.plan1('loading', p, t);
  T(planned === 0, '가상 행은 «곧 2단» 분모(계획 칸 수)에 들지 않는다 — 계획 미상으로 정직하게');
  //  ④ 홀드 받침에는 쓴다 — 먼저 실린 컨 위 자리는 «받침 있음». 기준표는 검수사 확정 규칙(V7.59·V7.65, 콘 계산 hasBelow) —
  //     같은 베이 한 단 아래 컨 · 짝 베이(±1) 아래 40ft · 양쪽(±1) 아래 20ft 트윈. (실측 — 02번 40ft 가 01·03번 20ft 둘 위에 앉는다.)
  const hold = vr.filter(r => parseInt(r.tier, 10) < 80);
  const at = (b, row, t) => vr.find(x => parseInt(x.bay, 10) === b && x.row === row && parseInt(x.tier, 10) === t);
  let below = 0, checked = 0, withBelow = 0;
  for (const r of hold) { const b = parseInt(r.bay, 10), t = parseInt(r.tier, 10); if (t < 4) continue; checked++;
    const is40 = (x) => !!x && x.size === '40';
    const under = !!at(b, r.row, t - 2) || is40(at(b - 1, r.row, t - 2)) || is40(at(b + 1, r.row, t - 2)) || (!!at(b - 1, r.row, t - 2) && !!at(b + 1, r.row, t - 2));
    if (under) withBelow++;
    if (under !== g1.holdBelow('loading', b, r.row, r.tier)) { console.log(`    ⚠ 받침 판정 어긋남 ${r.cn} ${r.bay}-${r.row}-${r.tier}`); below++; } }
  T(below === 0 && withBelow > 0, `홀드 2단 이상 ${checked}대의 받침 판정이 검수사 규칙과 맞는다(받침 있음 ${withBelow}대)`);
  //  ⑤ 크레인 카드 — 완료 화면이 아니므로 동방 실적으로 카드가 선다(호기가 없어 «베이 NN»)
  T(g1.r.cranes.length > 0 && g1.r.cranes.every(c => c.mode === 'loading' && /^베이 /.test(c.eq)), `선적 카드 ${g1.r.cranes.length}장 — «베이 NN» 이름`);
  //  ⑥ 다른 항차를 고른 채면 붙이지 않는다
  const g2 = run({ key: 'OBWH_2735E', pier: 'PNCT', state: { voyageKey: 'DJCT_0223E', stow: mk() }, twL: OB.loading_termWork, cpL: OB.loading_completed, edi: { discharge: 0, loading: 230 }, virt: true });
  T(g2.planRows('loading').length === 0, '항차키가 다르면 실적 자리를 붙이지 않는다');
  //  ⑦ 리스트 230 다 실리면 완료
  const allDone = Object.fromEntries(listL.map(r => [r.cn, { at: 1, src: 'term' }]));
  const g3 = run({ key: 'OBWH_2735E', pier: 'PNCT', state: { voyageKey: 'OBWH_2735E', disch: { ediRows: rowsD }, stow: mk() },
                   cpD: OB.discharge_completed, cpL: allDone, edi: { discharge: 267, loading: 230 } });
  T(g3.r.finished === true, '리스트 230 이 다 실리면 완료');
  //  ⑧ 완성본 교체·자료 갱신 감시가 소스에 있다
  for (const need of ['function ctPlanChanged', '/dataAt.json`, true)', 'CT.planNew', '자료가 바뀌었습니다', 'function ctVirtualApply', 'ctVirtualApply();'])
    T(html.includes(need), `소스에 «${need}» 가 있다`);
  T((html.match(/ctPlanTotal\(/g) || []).length - 1 >= 6, `분모 한 벌 ctPlanTotal 을 부르는 자리 ${(html.match(/ctPlanTotal\(/g) || []).length - 1}곳(정의 제외 — 완료 판정 2·작업량·상태 카드 2·안내·결과 안내)`);
  //  ⑧-1 (2차 시뮬 지적) 다시 읽기 **실패**는 «빈 리스트»가 아니다 — 종전 분모를 지키고 실패 모드를 돌려준다(부르는 쪽이 dataAt 을 되돌린다)
  {
    const ctxP = { console: { log() {}, warn() {} }, Date, Math, Set, Map, Object, Array, String, Number, parseInt, JSON, setInterval: () => 1, clearInterval: () => {},
      document: { addEventListener: () => {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], documentElement: { style: { setProperty: () => {} } } },
      window: {}, state: { shipType: 'container', multiCount: 4, _bayDictBays: null, voyageKey: 'OBWH_2735E', disch: { ediRows: rowsD }, stow: mk() },
      fbFetch: async () => ({ ok: false }), ensureConeBayDict: async () => {} };
    let answer = null; ctxP.fbFetchEdiContainers = async () => answer;
    vm.createContext(ctxP);
    vm.runInContext(hcc[0] + '\n' + ct[0] + '\nthis.__changed = ctPlanChanged; this.__CT = CT; this.__state = state;', ctxP);
    ctxP.__CT.key = 'OBWH_2735E'; ctxP.__CT.planNew = [];
    (async () => {
      answer = null;                                   // 5xx·약신호 — 못 받았다
      const f1 = await ctxP.__changed(['loading'], 'OBWH_2735E');
      T(JSON.stringify(f1) === '["loading"]' && ctxP.__state.stow.total === 230 && ctxP.__state.stow.virtual === true, '리스트 다시 읽기 실패 → 실패 모드를 돌려주고 분모 230·가상 그대로(«빈 리스트»로 덮지 않는다)');
      answer = { ptk: null, list: listL.concat([{ ...listL[0], cn: 'TEST0000001' }]).map(r => ({ ...r })) };   // 분별 뒤 리스트가 한 대 늘었다(231)
      const f2 = await ctxP.__changed(['loading'], 'OBWH_2735E');
      T(f2.length === 0 && ctxP.__state.stow.total === 231 && ctxP.__state.stow.listRows.length === 231 && ctxP.__state.stow.virtual === true, '리스트가 늘면 분모가 따라간다(230 → 231) · 가상 유지');
      answer = { ptk: null, list: [] };                // 노드가 비어 왔는데 실적은 있다(수집기가 지우고 다시 쓰는 찰나)
      ctxP.__CT.tw = { discharge: {}, loading: OB.loading_termWork };
      const f2b = await ctxP.__changed(['loading'], 'OBWH_2735E');
      T(JSON.stringify(f2b) === '["loading"]' && ctxP.__state.stow.total === 231, '빈 리스트 + 실적 있음 → 분모를 지키고 실패로 돌려준다(감사 지적 — 분모 0 완료 오판 방지)');
      answer = { ptk: rowsD.slice(0, 50).map(r => ({ ...r })), list: [] };      // 실 EDI(자리 있는 행)가 들어왔다
      const f3 = await ctxP.__changed(['loading'], 'OBWH_2735E');
      T(f3.length === 0 && !ctxP.__state.stow.virtual && ctxP.__state.stow.ediRows.length === 50 && ctxP.__CT.planNew.includes('loading'), '완성본(실 EDI)이 오면 가상 조립을 멈추고 그것을 쓰며 띠에 새로고침을 말한다');
      //  ctFetch 가 실패 모드의 기준 시각을 되돌리는 줄이 소스에 있다
      T(html.includes('CT.dataAt[m] = _daPrev[m];'), '다시 못 읽은 모드는 dataAt 기준을 이전 값으로 되돌린다(다음 사이클에 또 읽는다)');
      T(/if\(!res\.ok\) return null;/.test(html.slice(html.indexOf('async function fbFetchEdiContainers'), html.indexOf('async function fbFetchEdiContainers') + 800)), 'ediContainers 를 못 받으면 null(실패) — 빈 리스트와 갈라 돌려준다');
      //  ⑨ 감사 지적 — «③ 콘 계산하기» 는 가상 EDI 로 콘 작업표를 내지 않는다(부분 수가 계획 콘 수로 나가지 않게)
      {
        const pg = html.match(/function planToGroups\(plan, ctx\)\{[\s\S]*?\n\}\n/);
        T(!!pg, 'planToGroups 를 소스에서 꺼냈다');
        let called = 0; const ctxG = { state: { shipType: 'container', multiCount: 4 }, ediToBayGroups: () => { called++; return { X: 1 }; } };
        vm.createContext(ctxG); vm.runInContext(pg[0] + '\nthis.__pg = planToGroups;', ctxG);
        const rV = ctxG.__pg({ isEDI: true, virtual: true, ediRows: vr }, {});
        T(Object.keys(rV).length === 0 && called === 0, '가상 EDI 는 콘 작업표를 내지 않는다(ediToBayGroups 를 부르지 않는다)');
        const rR = ctxG.__pg({ isEDI: true, ediRows: rowsD }, {});
        T(Object.keys(rR).length === 1 && called === 1, '실 EDI 는 종전대로 콘 작업표를 낸다');
      }
      for (const need of ['가상 EDI(리스트', '받침 미상 · 홀드콘 확인', '_virt ? `${nOn}칸`', 'const _newRow = ', 'strip.innerHTML = _newRow + (', 'async function ctEdiUnchanged', "'If-None-Match': prev", '받침 미상 ${k.holdU}', '완성본이 오면 띠에 새로고침 안내가 뜹니다', '<b>가상 EDI</b>(2.47)'])
        T(html.includes(need), `소스에 «${need}» 가 있다(안내 줄·받침 미상·쌓은 그림 분모·띠 덧붙임·EDI ETag 대조·작업량·결과 안내·사용 안내)`);
      //  ⑩ 재감사 지적 — Firebase 는 shallow 와 ETag 를 섞으면 400 이다. ctGet(ETag 헤더를 늘 붙인다)으로 shallow 를 읽는 줄이 없어야 한다.
      T(!/ctGet\([^\n]*shallow=true/.test(html), 'ctGet 으로 shallow 를 읽는 줄이 없다(ETag 와 섞으면 400 — 재감사 실측)');
      //  ⑪ 재감사 지적 — dataAt 을 못 읽은(null) 사이클은 기준을 유지한다(null 로 덮으면 그 사이 온 완성본을 영영 놓친다). ctFetch 의 그 조각을 그대로 돌린다.
      {
        const a = html.indexOf("    const _da = (x)=>"), b = html.indexOf("    if(_changed.length){", a);
        T(a > 0 && b > a, 'ctFetch 의 dataAt 기준 조각을 소스에서 꺼냈다');
        const frag = html.slice(a, b);
        const runDa = (prev, daD, daL) => { const ctxD = { CT: { dataAt: prev } }; vm.createContext(ctxD); vm.runInContext('const daD=' + JSON.stringify(daD) + ', daL=' + JSON.stringify(daL) + ';\n' + frag + '\nthis.__out = { changed: _changed, dataAt: CT.dataAt };', ctxD); return ctxD.__out; };
        const s1 = runDa({ discharge: null, loading: null }, 100, 200);
        T(s1.changed.length === 0 && s1.dataAt.loading === 200, '첫 사이클 — 기준만 잡고 «바뀜» 을 내지 않는다');
        const s2 = runDa({ discharge: 100, loading: 200 }, 100, null);       // 선적 dataAt 을 못 읽었다(503)
        T(s2.changed.length === 0 && s2.dataAt.loading === 200, '못 읽은 사이클 — 선적 기준 200 을 유지한다(null 로 덮지 않는다)');
        const s3 = runDa(s2.dataAt, 100, 300);                               // 그 사이 완성본이 왔다
        T(JSON.stringify(s3.changed) === '["loading"]' && s3.dataAt.loading === 300, '신호가 돌아오면 그 사이 바뀐 완성본을 잡는다');
      }
      console.log(bad ? `✗ 콘앱 완료 화면 검사 실패 ${bad}건` : '✓ 콘앱 완료 화면·완료/전체·쉬는 시간 검사 통과');
      process.exit(bad ? 1 : 0);
    })();
  }
}
//  마무리(통과/실패 출력·종료)는 위 ⑧-1 의 비동기 블록 끝에서 한다 — 동기 끝에서 먼저 나가면 그 검사가 안 돈다.
