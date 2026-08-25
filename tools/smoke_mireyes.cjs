// 미르의 눈 연막검사 — 「끝4자리 + 실번호/온도/중량」을 실제로 답하는가, 그리고 옛 미르를 안 가로채는가.
//
// 왜 있는가. 2026-08-25 NSFR 2616N 양하를 클로드가 직접 해보니 미르가 33문 중 14문을 못 답했고,
//   그중 하나가 **검수사가 늘 하는 질문**이었다 — «끝 4자리 부르면 실번호를 답하라».
//   자료는 손에 있었고 다른 답에서는 그 값을 말하고 있었다. 인텐트만 없었다.
// ⚠ 이 검사가 지키는 것 둘 —
//   ① 새로 배운 것을 계속 답하는가
//   ② **원래 잘 되던 것을 가로채지 않는가**(처음 판이 「12번 베이」의 12 를 컨 끝자리로 읽어 다섯을 죽였다)
const path = require('path');
const OUT = process.argv[2];
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
const E = require(path.resolve(OUT));
if (typeof E.mirSee !== 'function') { console.error('✗ mirSee 가 없다'); process.exit(1); }

const C = (cn, o = {}) => ({ cn, l4: cn.slice(-4), bay: '12', row: '01', tier: '88', ...o });
const containers = [
  C('KMTU9331918', { sl: 'CF795302', wt: 9566, iso: '4500', fe: 'F', pod: 'KRPTK' }),
  C('FSCU5791109', { sl: 'NSL637295', tmp: '-23', rf: true, wt: 29000, bay: '12', row: '02', tier: '82' }),
  C('GXYU5011109', { sl: 'NSL642228', wt: 12000, bay: '12', row: '02', tier: '06' }),
  C('GAOU2227015', { sl: 'NS3655063', wt: 10999, _xray: true, bay: '25', row: '04', tier: '06' }),
  C('AAAU1112222', { sl: 'CF795302', wt: 5000, bay: '24', row: '01', tier: '82' }),   // 실번호 중복 짝
];
const ctx = { containers };
let bad = 0;
const T = (q, want, why) => {
  let got = null;
  try { got = E.mirSee(q, ctx); } catch (e) { got = '[터짐] ' + e.message; }
  const s = got == null ? '(넘김)' : String(got);
  const ok = want instanceof RegExp ? want.test(s) : (want === null ? got === null : s.includes(want));
  if (!ok) { bad++; console.error(`  ✗ «${q}» → ${s.split('\n')[0]}\n     바라는 것: ${want}  (${why})`); }
};

// ① 새로 배운 것
T('1918 실번호', 'CF795302', '검수사 표준 질문');
T('1918 실번호 뭐야', 'CF795302', '말끝이 붙어도');
T('1918 씰 뭐야', 'CF795302', '현장 표현');
T('1918 봉인번호 알려줘', 'CF795302', '봉인번호도 같은 것');
T('1918 중량', '9.6t', '중량');
T('7015 실번호', /X-?RAY/i, 'X-RAY 대상이면 같이 말한다');
T('1918', 'CF795302', '끝4자리만 불러도 표준 답');
// ② 겹치면 되묻는다 — 찍지 않는다
T('1109 온도', '어느 것입니까', '끝4자리가 두 대면 되묻는다');
// ③ 실번호 중복은 먼저 말한다
T('1918 실번호', 'AAAU1112222', '같은 실번호가 붙은 컨을 짚어 준다');
// ④ ⛔ 옛 미르를 가로채지 않는다 (여기가 깨지면 멀쩡한 기능이 죽는다)
T('12번 베이 양하 시작할거야', null, '「12번」은 베이다');
T('베이 12 몇대야', null, '「베이 12」도 베이다');
T('24번 다 됐어', null, '베이 진행률은 옛 미르 몫');
T('1918 어디야', null, '위치는 옛 미르가 이미 잘 한다');
T('1918 엑스레이야', null, 'X-RAY 질문도 옛 미르 몫');
T('리퍼 온도 뭐야', null, '집계는 옛 미르 몫');
T('9999 실번호', null, '없는 컨은 넘긴다');
T('', null, '빈 말은 넘긴다');

if (bad) { console.error(`✗ 미르의 눈 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 미르의 눈 연막검사 통과 (새로 배운 것 9 · 안 가로챈 것 8 · 컨 ' + containers.length + '대)');
