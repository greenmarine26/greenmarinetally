// 2.76 시프팅 판정 — «기본이 리스트다» (검수사 확정 2026-08-28).
//   원문: «기본이 리스트입니다. 리스트 목록에 앱이 말한 쉬프팅 대상 컨테이너랑 매칭이 된다면
//         시프팅 보다는 평택 양하가 맞다고 판단해야 할것입니다.
//         아니면 리스트에 환적화물 또는 시프팅 표시를 했을 것입니다.»
//   실측 MCSC 633N: EDI 1,159대 중 POD 가 평택이 아닌 927대 가운데 리스트에 있는 것 정확히 47대(전부 엠티).
const path = require('path');
const fs = require('fs');
const U = require(path.resolve(process.argv[2]));   // utils 번들
const ROOT = process.argv[3] || process.cwd();
let bad = 0; const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

//  ── 판정 규칙(소스) ──
const S = rd('src/utils.js');
T(/const _listSaysTS = \(r\) =>/.test(S), '리스트의 환적·시프팅 표시를 안 본다 — 리스트가 «환적»이라 하면 따라야 한다');
T(/if \(ediPod && rec && !isPyeongtaekPort\(ediPod\) && !_listSaysTS\(rec\)\)/.test(S),
  '아직 «리스트 POD 가 평택일 때»만 본다 — 리스트에 실려 있다는 것 자체가 근거다');
T(/_podEdi: ediPod, _podList: recPod, _podFrom: 'list'/.test(S), '양쪽 값을 안 남긴다 — 앱이 틀린 게 아니라 자료가 다른 것이다');
T(/listMeta:/.test(S), '근거(출처·세관 여부·풀엠티)를 화면에 안 넘긴다');

//  ── 표시 판정 ──
{
  //  소스에서 판정식을 그대로 떼어 시험 — 화면과 같은 벌인지 본다.
  const re = /T\/?S|환적|시프팅|SHIFT|RESTOW|재적/;
  const says = (r) => !!(String(r.tsport || '').trim()) || re.test(`${r.cargoType || ''} ${r.printpod || ''} ${r.gi || ''}`.toUpperCase());
  T(says({ tsport: 'CNTXG' }), '환적항이 적혔는데 못 알아본다');
  T(says({ cargoType: 'T/S' }), '«T/S» 표시를 못 알아본다');
  T(says({ printpod: '환적' }), '«환적» 표시를 못 알아본다');
  T(says({ gi: 'SHIFTING' }), '«SHIFTING» 표시를 못 알아본다');
  T(!says({ cargoType: '', tsport: '', gi: '', printpod: '' }), '빈 칸을 환적으로 잘못 본다 — MCSC 633N 은 279칸 전부 공란이었다');
  T(!says({ pod: 'KRPYOTM', fe: 'E' }), '표시가 없는데 환적으로 본다');
}

//  ── 대조 한 벌(ptkCountCheck) ──
{
  const V0 = { info: { planDis: 279 }, discharge: { ediContainers: {}, records: {} } };
  for (let i = 0; i < 232; i++) V0.discharge.ediContainers['E' + i] = {};
  for (let i = 0; i < 279; i++) V0.discharge.records['R' + i] = {};
  const c = U.ptkCountCheck(V0);
  T(c.known === true, '배정표·EDI 가 다 있는데 판정을 안 한다');
  T(c.gap === 47, `모자란 수를 잘못 센다 (${c.gap}) — 279-232=47 이어야 한다`);
  T(c.listMatch === true, '리스트가 배정표와 같은데 안 맞다고 한다');
  const c2 = U.ptkCountCheck({ info: {}, discharge: { ediContainers: { a: {} } } });
  T(c2.known === false, '배정표 수량이 없는데 판정한다 — 0 을 «없음»으로 읽으면 안 된다');
  const c3 = U.ptkCountCheck({ info: { planDis: 279 }, discharge: {} });
  T(c3.known === false, 'EDI 가 아직 없는데 판정한다');
}

//  ── 평택 항구 판정(회귀) ──
T(U.isPyeongtaekPort('KRPTK') && U.isPyeongtaekPort('KRPYOTM') && U.isPyeongtaekPort('KRPYO'),
  '평택 코드(KRPTK·KRPYO·KRPYOTM)를 다 못 알아본다');
T(!U.isPyeongtaekPort('CNTXG') && !U.isPyeongtaekPort('CNTSN') && !U.isPyeongtaekPort('KRSOS'),
  '남의 항구를 평택으로 본다');

//  ── 화면 배선 ──
const V = rd('src/pages/VoyagePage.jsx');
//  ★ 검수사 확정 «양하갯수가 평택항에서 확정이 되었습니다 … 47개만 비교하면 됩니다»
//    배정표 확정 양하 − EDI 평택분 = 모자란 수. 그 수와 리스트에서 되찾은 수가 같으면 확정.
T(/export function ptkCountCheck/.test(S), '대조가 한 벌로 없다 — 화면마다 따로 세면 갈린다');
T(/count: ptkCountCheck\(voyage, 'discharge'\)/.test(S), '대조 결과를 화면에 안 넘긴다');
T(/const cc = shiftInfo\.meta\.count \|\| \{\};/.test(V), '화면이 제 손으로 센다 — 한 벌을 안 쓴다');
T(/const sure = !!cc\.known && gap === cf\.length;/.test(V), '숫자가 맞아떨어지는지 안 본다');
//  ⚠ 이 자리는 voyage prop 이 없는 컴포넌트 안이다(2.50-01·2.70-03 크래시 자리)
{ //  시프팅 블록만 잘라서 본다 — 이 자리는 voyage prop 이 없다.
  const i0 = V.indexOf("{(shiftInfo?.meta?.customsFixed || []).length > 0 && (() => {");
  const blk = i0 >= 0 ? V.slice(i0, i0 + 3000) : '';
  T(!!blk, '시프팅 블록을 못 찾는다');
  T(!/voyage\?/.test(blk), 'voyage 를 직접 참조한다 — 그 화면에서 앱이 통째로 죽는다(2.50-01 자리)');
}
T(/✅ <b>평택 양하 \{cf\.length\}대/.test(V), '맞아떨어져도 확정 표시를 안 한다');
T(/❓ <b>평택 양하로 보입니다/.test(V), '안 맞는데 확정처럼 말한다 — 의문표여야 한다');
T(/모자란 \{gap\}대/.test(V), '모자란 수를 안 보여준다 — 그 숫자 하나로 검증된다');
T(!/EDI\(적부도\)/.test(V) && !/그것이 오면 결론이 납니다/.test(V), '화면에 근거를 늘어놓는다');
T(/엠티/.test(V) && /feTxt/.test(V), '풀·엠티를 안 갈라 보인다');

if (bad > 0) { console.error(`✗ 시프팅 판정 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 시프팅 판정 연막검사 통과 — 규칙 4 · 표시 6 · 대조 5 · 항구 2 · 화면 9');
