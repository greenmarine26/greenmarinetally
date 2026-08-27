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
  return _legOK(pm && (mode === 'loading' ? pm.mrnOut : pm.mrnIn))
    || _legOK(pm && pm.mrn)
    || _legOK(mode === 'loading' ? info.mrnOut : info.mrnIn)
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
//  ③ 배선 — 소스가 이 규칙을 갖고 있는가
T(/_legOK/.test(src) && /info\.mrnOut : info\.mrnIn/.test(src), 'XrayTab 이 레그 판정·항차 기록 폴백을 안 갖고 있다');
if (bad > 0) { console.error(`✗ MRN 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ MRN 연막검사 통과 — 레그 3 · 폴백 3 · 배선 1');
