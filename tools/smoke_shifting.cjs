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


// ══════════════════════════════════════════════════════════════════
//  2.79 — **삼자 대조(선사·세관·항만)** (검수사 확정 2026-08-28)
//    원문: «이미 세관자료를 업로드 했습니다. 그래서 세군데가 일치 한다고 한것입니다.
//           선사 세관 항만(배정) 그러므르 시프팅은 없습니다.»
//    그리고 왜 그런지도 검수사가 말해 줬다 — «시프팅은 평택분 양하에 방해되는 컨입니다.
//    홀드에 평택분이 있어 데크에 컨을 시프팅 해야 되는데, 시프팅이 발생 안했다면
//    커버를 여는데도 방해가 안된다는 이야기 입니다.»
//    ⇒ 시프팅 0 은 **커버 모양에 대한 답**이다. 앱의 물리 계산이 반박할 자리가 아니다.
//    실측 MCSC 633N: 배정 279 · 세관리스트 279 · EDI 평택분 279 인데 앱 예측 75대.
T(/export function dischargeSourcesAgree/.test(S), '삼자 대조가 한 벌로 없다');
T(/agree: plan > 0 && list === plan && edi === plan/.test(S), '셋이 같은지 안 본다 — 하나라도 모르면 일치가 아니다');
T(/const _src = dischargeSourcesAgree\(voyage\)/.test(S), 'shiftingTruthCheck 가 삼자 대조를 안 쓴다');
{ //  삼자 일치 판정은 berthShift(배정표 이적) 유무보다 **먼저** 와야 한다 —
  //  이적 값은 작업이 시작돼야 확정되는데(_TRUTH_READY) 검수사는 작업 전에 이미 답을 냈다.
  const i = S.indexOf('export function shiftingTruthCheck');
  const blk = S.slice(i, i + 1800);
  T(blk.indexOf('dischargeSourcesAgree') >= 0 && blk.indexOf('dischargeSourcesAgree') < blk.indexOf('info?.berthShift'),
    '이적 값을 먼저 본다 — 작업 시작 전에는 영영 판정이 안 난다');
  T(/srcAgree: true/.test(blk), '삼자 일치 표식을 안 남긴다 — 화면이 «불일치»로 잘못 말하게 된다');
}
//  표시 관은 새로 만들지 않는다 — 2.08-15 것을 그대로 탄다(대수에서 빼고 «커버 영역 확인»으로).
T(/if \(!\(tc && !tc\.pending && tc\.truth === 0\)\) return pred;/.test(S), '표시 관(shiftingMapForDisplay)이 truth 0 을 안 본다');
T(/truthZero: n, suspects: susp/.test(S), '뺀 자리를 안 남긴다 — 검수사 지시는 «의심은 지우지 말고»였다');
//  화면 — 삼자 일치는 ⛔ 불일치가 아니다.
T(/shiftInfo\?\.truthChk\?\.srcAgree \?/.test(V), '화면이 삼자 일치를 안 가른다 — ⛔ 불일치로 뜬다');
T(/시프팅 없음/.test(V), '삼자 일치인데 «시프팅 없음»을 안 말한다');
//  2.79-02 (검수사 «MCSC에 기록한 시프팅 안내는 불필요 합니다. 혼란을 줍니다.»)
//    삼자 일치는 «의심»이 아니라 **결론**이다 — 현장에 물을 것이 없으니 의심 목록을 안 남긴다.
T(/if \(tc\.srcAgree\) \{/.test(S), '삼자 일치인데도 의심 목록을 남긴다 — 화면에 혼란을 준다');
T(/truthZero: 0, suspects: \[\], srcAgree: true/.test(S), '삼자 일치일 때 커버 영역 확인 칸을 안 비운다');
T(!/이 자리들이 커버를 안 문다/.test(V), '지운 문구가 화면에 남아 있다 — 잔재');


// ══════════════════════════════════════════════════════════════════
//  2.79-03 — **카고플랜 정리** (검수사 2026-08-28 «카고플랜을 깨끗이 정리 바랍니다»)
//    확정 두 줄을 같이 읽어야 뜻이 맞는다:
//      «타지역화물도 보여줘야 합니다. 선적시 빈곳을 찾기 위해서»  → 자리(회색 칸)는 그대로 둔다.
//      «전부 지운다 - 평택분만 그린다»                          → 남의 짐이 무엇인지는 안 그린다.
//    실측 MCSC 633N 인쇄물 — 21칸 중 작업은 7칸인데 나머지 14칸이 남의 DG·RF 글자로 덮여 있었다.
{
  const C = rd('src/components/PrintableCargoPlanV2.jsx');
  T(/if \(!ptk\) return '';/.test(C), '통과화물에 아직 특수화물 글자를 찍는다 — 남의 짐이 화면을 덮는다');
  T(!/if \(!ptk\) return specialLetter/.test(C), '옛 규칙(통과화물도 글자)이 남아 있다 — 잔재');
  T(/cpv2-through/.test(C) && /background: '#d4d4d8'/.test(C), '통과화물 회색 자리까지 지웠다 — 선적 때 빈곳을 못 찾는다');
  //  별첨 숫자가 «2…» 로 잘리던 것 — 45피트가 없으면 그 열을 안 그린다.
  T(/const has45 = tot\['45'\] > 0;/.test(C), "45' 열 유무 판정이 없다");
  T(/\{has45 && <col style=\{\{ width: numW \}\} \/>\}/.test(C), "45' 열을 비어도 그대로 그린다 — 숫자 칸이 눌려 세 자리가 잘린다");
  T(/\{has45 && <td className="cpv2-legend-ct">\{v\['45'\]\}<\/td>\}/.test(C), '본문 45 칸이 열 수와 안 맞는다 — 표가 밀린다');
  T(/\{has45 && <td className="cpv2-legend-ct"><b>\{tot\['45'\]\}<\/b><\/td>\}/.test(C), '합계 줄 45 칸이 열 수와 안 맞는다');
}

if (bad > 0) { console.error(`✗ 시프팅 판정 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 시프팅 판정 연막검사 통과 — 규칙 4 · 표시 6 · 대조 5 · 항구 2 · 화면 9 · 삼자 11 · 카고플랜 7');
