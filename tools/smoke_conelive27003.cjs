// 콘앱 실시간 화면 — 수집기가 호기를 적어 넣은 터미널 완료도 그 호기로 그리는가 (ConeOne 2.70-03 · TallyOne 4.40-01)
//   검수사 2026-10-20 20:02 «오늘 ATPR 작업 하는데 한쪽은 앱을 사용하고 한쪽은 사용안하였습니다. 그떄 당시 실시간 수집이 눌린상태 였고요 …
//   콘앱화면에는 실시간 작업 화면이 2호기 4호기가 보여야 하는데 한호기 밖에 보이지 않았습니다».
//   원인 — 수집기는 2.40-01 부터 termWork 를 안 쓰고 실시간 수집이 완료에 {src:'term', equip:'2호기'} 로 넣는다.
//          콘앱 ctCompute 는 «터미널 반영분은 termWork 쪽이 안다» 며 그 완료를 건너뛰어 2호기를 한 번도 못 그렸다.
//   ⚠ 소스에서 그 함수를 그대로 꺼내 돌린다(베껴 적지 않는다). 재료는 RTDB GET 사본(fixtures/conelive27003.json).
const fs = require('fs'), path = require('path'), vm = require('vm');
const { JSDOM } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'public', 'cone.html'), 'utf8');
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'conelive27003.json'), 'utf8'));
let bad = 0, n = 0; const T = (ok, why) => { n++; console.log((ok ? '  ✓ ' : '  ✗ ') + why); if (!ok) bad++; };
console.log('콘앱 실시간 화면 — 수집기 호기 완료 (2.70-03)');

const hcc = html.match(/function holdConeCount\(size, shipType, multiCount\)\{[\s\S]*?\n\}\n/);
const bvp = html.match(/function bvRowPositions\(cellCount, hasZero\)\{[\s\S]*?\n\}\n/);
const bvs = html.match(/function bvBaySkeleton\(bs\)\{[\s\S]*?\n\}\n/);
const ct = html.match(/const CT = \{[\s\S]*?\nfunction ctCountLine\([\s\S]*?\n\}\n/);
T(!!hcc && !!bvp && !!bvs && !!ct, '홀드콘·베이골격·CT 블록을 소스에서 꺼냈다');
if (!hcc || !bvp || !bvs || !ct) { console.log('✗ 콘앱 실시간 화면 연막검사 실패'); process.exit(1); }
const SRC = hcc[0] + '\n' + bvp[0] + '\n' + bvs[0] + '\n' + ct[0];

const KST = (s) => Date.parse(s + ':00+09:00');
const rowsOf = (sec) => (sec.edi || []).map(([cn, bay, row, tier, size]) => ({ cn, bay: String(bay).padStart(2, '0'), row: String(row).padStart(2, '0'), tier: String(tier).padStart(2, '0'), size }));
const cut = (o, at) => { const r = {}; for (const k in (o || {})) if (o[k] && o[k].at <= at) r[k] = o[k]; return r; };
function boot(vk, at, over) {
  const v = FX[vk]; const o = over || {};
  const dom = new JSDOM('<!doctype html><html><body><div id="ct-card"></div><div id="ct-strip"></div></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  const w = dom.window;
  w.state = { shipType: 'container', multiCount: 4, _bayDictBays: new Map(), disch: { ediRows: rowsOf(v.discharge) }, stow: { ediRows: rowsOf(v.loading) } };
  w.fbFetch = async () => ({ ok: false, status: 0 }); w.ensureConeBayDict = async () => {}; w.alert = () => {};
  w.console = { log() {}, warn() {}, error() {} };   // 베이사전 없음 안내는 이 검사의 관심이 아니다
  vm.createContext(w);
  vm.runInContext('Date.now=function(){return ' + at + '};\n' + SRC + '\nthis.__ctCompute = ctCompute; this.__CT = CT; this.__twCranes = twCranes;', w, { filename: 'cone.html#ct' });
  w.__CT.tw = { discharge: o.twD || {}, loading: o.twL || {} };
  w.__CT.comp = { discharge: o.cpD || cut(v.discharge.completed, at), loading: o.cpL || cut(v.loading.completed, at) };
  w.__CT.rec = { discharge: v.discharge.records || {}, loading: v.loading.records || {} };
  w.__CT.pier = String(v.pier || '').toUpperCase(); w.__CT.key = vk; w.__CT.code = vk.split('_')[0];
  const r = w.__ctCompute(); return { r, cs: w.__twCranes(r), w };
}
const byEq = (r) => Object.fromEntries(r.cranes.map((c) => [c.eq, c]));
//  기준표는 코드가 아니라 자료에서 — 그 시각까지 호기별 완료 중 계획(EDI) 자리가 있는 것
const expectN = (vk, mode, eq, at) => {
  const v = FX[vk]; const pos = new Set((v[mode].edi || []).map((x) => x[0])); const rec = v[mode].records || {};
  return Object.entries(v[mode].completed).filter(([cn, c]) => c.at <= at && c.equip === eq && c.src !== 'edi' && (pos.has(cn) || (rec[cn] && rec[cn].bay_actual))).length;
};

//  ① ATPR 2646E 양하 — 4호기(검수사 앱) · 2호기(실시간 수집) 가 함께 돈다
console.log('① ATPR 2646E 양하 — 2호기·4호기 함께');
for (const t of ['2026-10-20 10:50', '2026-10-20 13:40', '2026-10-20 15:30']) {
  const at = KST(t); const { r, cs } = boot('ATPR_2646E', at); const E = byEq(r);
  const ok2 = E['2호기'] && !E['2호기'].stale && E['2호기'].src === 'term' && E['2호기'].n === expectN('ATPR_2646E', 'discharge', '2호기', at);
  const ok4 = E['4호기'] && !E['4호기'].stale && E['4호기'].src === 'app' && E['4호기'].n === expectN('ATPR_2646E', 'discharge', '4호기', at);
  T(ok2 && ok4 && cs.length === 2 && cs.every((c) => /^[24]호기$/.test(c.eq)),
    `${t.slice(11)} — 2호기 ${E['2호기'] ? E['2호기'].n : '없음'}대(수집기) · 4호기 ${E['4호기'] ? E['4호기'].n : '없음'}대(앱) · 실시간 화면 ${cs.length}쪽 [${cs.map((c) => c.eq).join(',')}]`);
}
{
  const { r } = boot('ATPR_2646E', KST('2026-10-20 15:30'));
  T(!r.cranes.some((c) => /^베이 /.test(c.eq)), '호기가 없는 수집기 완료 18대는 «베이 NN» 가짜 호기를 만들지 않는다(어느 호기인지 모른다 — 수석 보드와 같다)');
  T(r.done.discharge === Object.keys(cut(FX.ATPR_2646E.discharge.completed, KST('2026-10-20 15:30'))).length, `진행 수(완료/전체)는 종전대로 완료 전체 ${r.done.discharge}대(호기 그림과 따로 센다)`);
}

//  ② DJCT 0226E — 양하 2호기(앱) · 3·4호기(수집기), 선적 3·4호기(수집기)
console.log('② DJCT 0226E — 2·3·4호기');
{
  const at = KST('2026-10-20 15:30'); const { r, cs } = boot('DJCT_0226E', at); const E = byEq(r);
  T(['2호기', '3호기', '4호기'].every((k) => E[k] && !E[k].stale) && cs.length === 3, `15:30 양하 — 2호기 ${E['2호기'] && E['2호기'].n}·3호기 ${E['3호기'] && E['3호기'].n}·4호기 ${E['4호기'] && E['4호기'].n} · 실시간 화면 ${cs.length}쪽`);
  const at2 = KST('2026-10-20 20:05'); const g = boot('DJCT_0226E', at2); const F = byEq(g.r);
  T(F['3호기'] && F['4호기'] && F['3호기'].mode === 'loading' && F['4호기'].mode === 'loading' && !F['3호기'].stale && !F['4호기'].stale
    && F['2호기'] && F['2호기'].stale && g.cs.length === 2 && g.cs.every((c) => c.eq !== '2호기'),
    `20:05 선적 — 3·4호기가 돈다(수집기) · 15:23 에 끝난 2호기만 «멈춤»으로 남던 것(종전) → 실시간 화면 [${g.cs.map((c) => c.eq).join(',')}]`);
}

//  ③ 지키는 것 — 마감 EDI 적용 · termWork 와 겹침
console.log('③ 지키는 것');
{
  const at = KST('2026-10-20 13:40'); const base = cut(FX.ATPR_2646E.discharge.completed, at);
  const cp = {}; for (const [cn, c] of Object.entries(base)) cp[cn] = c.equip === '2호기' ? { ...c, src: 'edi' } : c;
  const { r } = boot('ATPR_2646E', at, { cpD: cp });
  T(!byEq(r)['2호기'] && byEq(r)['4호기'], '마감 EDI 적용(src:edi)은 호기가 적혀 있어도 그 호기 실적으로 그리지 않는다(utils.isAutoDone — 호기·속도 추정에 안 씀)');
  //  termWork 가 있는 옛 배 — 같은 컨은 termWork 쪽 한 번만
  //  ⚠ 자리(pos BBRRTT)가 있는 termWork 행이어야 «have» 에 든다 — 자리 없는 행은 위 루프가 세지 않고 넘어간다(그러면 이 검사가 헛돈다)
  const edi = new Map(FX.ATPR_2646E.discharge.edi.map((x) => [x[0], x]));
  const tw = {}; let k = 0; for (const [cn, c] of Object.entries(base)) { const p = edi.get(cn); if (c.equip === '2호기' && p && k < 10) { tw[cn] = { at: c.at, equip: 'GC102', pos: String(p[1]).padStart(2, '0') + String(p[2]).padStart(2, '0') + String(p[3]).padStart(2, '0') }; k++; } }
  const e2 = expectN('ATPR_2646E', 'discharge', '2호기', at);
  const g = boot('ATPR_2646E', at, { twD: tw }); const g2 = byEq(g.r)['2호기'];
  T(k === 10 && g2 && g2.n === e2, `termWork 에 같은 컨(자리 있는 ${k}대)이 있어도 두 번 세지 않는다 — 2호기 ${g2 && g2.n}대 = ${e2}대`);
  //  옛 행(by 가 «터미널…», src 없음)도 호기가 있으면 같은 판정
  const old = {}; for (const [cn, c] of Object.entries(base)) old[cn] = c.equip === '2호기' ? { at: c.at, by: '터미널 반영', equip: '2호기' } : c;
  const h = boot('ATPR_2646E', at, { cpD: old });
  T(byEq(h.r)['2호기'] && byEq(h.r)['2호기'].src === 'term' && byEq(h.r)['2호기'].n === e2, '옛 표식(by «터미널…»)도 같은 판정 — 호기가 있으면 그 호기로, «(검수앱)» 표시는 안 붙는다(src term)');
}
//  ④ 소스 — 검수앱 수석 보드와 같은 판정이라는 근거 줄 · 판 번호
T(/craneBoardOf/.test(html) && /if\(_term && \(c\.src==='edi' \|\| !ctEquip\(c\.equip\)\)\) continue;/.test(html), 'ctCompute 가 «호기 없는 터미널 반영·마감 EDI 적용» 만 건너뛴다(수석 보드 utils.craneBoardOf 와 같은 판정)');
{
  const cv = (html.match(/window\.__CONEV\s*=\s*'ConeOne (\d+)\.(\d+)(?:-(\d+))?'/) || []);
  const num = cv.length ? (+cv[1]) * 1e6 + (+cv[2]) * 1e3 + (+(cv[3] || 0)) : 0;
  T(num >= 2 * 1e6 + 70 * 1e3 + 3, `콘앱 판 번호가 2.70-03 이상 — ${cv[0] || '못 찾음'}`);
}

console.log(`\n${bad ? '✗' : '✓'} 콘앱 실시간 화면 연막검사 ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
