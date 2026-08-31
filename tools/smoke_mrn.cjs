// 2.71 MRN 연막검사 — X-RAY 서류 머리표의 MRN 이 «레그» 를 지키고, 없으면 항차 기록을 쓰는가.
//   검수사 신고 2026-08-27: «XRAY 출력시 MRN 넘버가 기록이 안되었습니다» (SWTD — 평택 PORT-MIS 미등록).
//   실측: PCSZ 는 mrnIn 이 비고 mrnOut(26SNKO2809E)만 있어 **양하 서류에 출항 번호**가 찍히고 있었다.
const fs = require('fs');
const path = require('path');
const ROOT = process.argv[2] || process.cwd();
let bad = 0; const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };
const src = fs.readFileSync(path.join(ROOT, 'src/components/XrayTab.jsx'), 'utf8');

//  소스에서 규칙 한 벌을 그대로 떼어 돌린다(화면을 띄우지 않고 판정만 잰다).
const mk = (mode, pm, info) => {
  const _legOK = (v) => {
    const t = String(v || '').trim().toUpperCase();
    if (!t) return '';
    return t.endsWith(mode === 'loading' ? 'E' : 'I') ? t : '';
  };
  //  ⚠ 손입력(info) 폴백은 레그 검사를 안 건다 — 2.77 실물 그대로(검수사가 보고 고른 값은 버리지 않는다).
  //    종전 사본은 여기에 _legOK 를 걸어 실물과 갈라져 있었다(2.89-08 정정 — 사본이 어긋나면 초록불이 거짓말한다).
  return _legOK(pm && (mode === 'loading' ? pm.mrnOut : pm.mrnIn))
    || _legOK(pm && pm.mrn)
    || String((mode === 'loading' ? info.mrnOut : info.mrnIn) || '').trim().toUpperCase()
    || '';
};
//  ① 레그를 지킨다 — 실측 PCSZ(입항 빈칸·출항만 있음)
T(mk('discharge', { mrnIn: '', mrnOut: '26SNKO2809E', mrn: '26SNKO2809E' }, {}) === '',
  '양하 서류에 출항 MRN(E)을 찍는다 — 실측 PCSZ 그 병');
T(mk('loading', { mrnIn: '', mrnOut: '26SNKO2809E', mrn: '26SNKO2809E' }, {}) === '26SNKO2809E',
  '선적 서류에 출항 MRN 을 못 쓴다');
T(mk('discharge', { mrnIn: '26YTFF2721I' }, {}) === '26YTFF2721I', '입항 MRN 이 있는데 안 쓴다');
//  ② PORT-MIS 에 없는 배 — 항차에 적어 둔 값으로(실측 SWTD D7EE)
T(mk('discharge', null, { mrnIn: '26SNKO3084I' }) === '26SNKO3084I', 'PORT-MIS 가 없을 때 항차 기록을 안 쓴다 — 머리표가 빈칸으로 나간다');
T(mk('loading', null, { mrnIn: '26SNKO3084I' }) === '', '선적 서류에 입항 MRN(I)을 쓴다 — 레그가 뒤집힌다');
T(mk('discharge', null, {}) === '', '없는데 무언가를 지어낸다');
//  ②-B 2.77 실물 — 손입력은 레그가 어긋나도 산다(경고는 입력 칸에서). 기계값(PORT-MIS)만 버린다.
T(mk('discharge', null, { mrnIn: '26SNKO2809E' }) === '26SNKO2809E', '손입력 MRN 을 레그 검사로 버린다 — 2.77 위반(«분명히 쳤는데 안 나온다»)');
//  ③ 배선 — 소스가 이 규칙을 갖고 있는가
T(/_legOK/.test(src) && /info\.mrnOut : info\.mrnIn/.test(src), 'XrayTab 이 레그 판정·항차 기록 폴백을 안 갖고 있다');
//  ④ 2.89-08(§0-Y-2) — «없음» 분기가 어디를 봤는지(mrnWhy)를 말하는가
/*  ★ 2.90-02 병합 — 사유 필드 이름 한 벌(mrnWhy → mrnDiag). 내용은 더 센 쪽을 요구한다:
    왜(why) · 본 곳(looked) · 채울 길(how) 셋을 다 말해야 §0-Y-2 를 지킨 것이다. */
T(/mrnDiag/.test(src) && /head\.mrnDiag/.test(src), 'MRN 빈칸 사유(mrnDiag)가 화면에 배선돼 있지 않다');
T(/looked/.test(src) && /how/.test(src) && /why/.test(src), '«왜·본 곳·채울 길» 셋이 다 있어야 한다(§0-Y-2)');
T(!/setMrnEdit\(head\.mrnDiag\?\.cand/.test(src), '⛔ 레그 어긋난 값을 입력칸에 미리 채우면 안 된다(세관 서류 오기)');
if (bad > 0) { console.error(`✗ MRN 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ MRN 연막검사 통과 — 레그 3 · 폴백 3 · 배선 1');
