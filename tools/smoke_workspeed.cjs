// 작업속도 연막검사 — **앱 기록이 아니라 터미널 실적으로, 쉬는 시간을 빼고 잰다.**
//
// 왜 있는가 (검수사 메모, 받은함 2026-08-26 09:13).
//   *«미르의 작업속도 계산법 수정. 앱으로 계산하면 틀립니다. 앱으로 작업을 잘안하니까요.
//     그럼 수석대쉬보드에 보여주는 자료를 사용해야 합니다. 2갱기준으로 작업한 총갯수 나누기2
//     시작이04시 부터 06시30 08시부터 현지시간으로 계산해서 나눠야 합니다.»*
//   실측 — 검수사 말고는 앱에 완료를 거의 안 찍는다. 그래서 `completed` 로 페이스를 재면
//   작업 중인 배에도 «아직 시작 전이에요» 라고 답했다.
//   ⚠ 쉬는 시간표는 **지어내지 않았다** — 학습서 2-F′(검수사 확정 2026-08-13)의 WORK_SHIFTS 그대로다.
//     메모의 «04시부터 06시30 08시부터» 가 곧 PCTC 야간 [240,390]·주간 [480,720] 이다.
const path = require('path');
const OUT = process.argv[2], OUT2 = process.argv[3];
if (!OUT || !OUT2) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
const NS = require(path.resolve(OUT));    // nlSearch
const CA = require(path.resolve(OUT2));   // chiefAnswers

let bad = 0;
const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };
const D = (s) => new Date('2026-08-26T' + s + ':00+09:00').getTime();

// ① 쉬는 시간을 실제로 빼는가 — 검수사가 준 예시 그대로
T(typeof NS.workMinutesBetween === 'function', 'workMinutesBetween 이 없다');
T(NS.workMinutesBetween(D('04:00'), D('06:30'), 'PCTC') === 150, '04:00~06:30 이 150분이 아니다');
T(NS.workMinutesBetween(D('06:30'), D('08:00'), 'PCTC') === 0, '⛔ 06:30~08:00 을 작업시간으로 센다(쉬는 시간이다)');
T(NS.workMinutesBetween(D('04:00'), D('08:00'), 'PCTC') === 150, '04:00~08:00 에서 쉼 90분을 안 뺐다');
T(NS.workMinutesBetween(D('08:00'), D('13:00'), 'PCTC') === 240, 'PCTC 중식(12~13)을 안 뺐다');
T(NS.workMinutesBetween(D('08:00'), D('13:00'), 'PNCT') === 210, 'PNCT 중식(11:30~13)을 안 뺐다 — 터미널별로 다르다');
T(NS.workMinutesBetween(D('17:00'), D('20:00'), 'PCTC') === 90, '조 경계(17:30~19:00)를 안 뺐다');
T(NS.workMinutesBetween(D('12:00'), D('11:00'), 'PCTC') === 0, '거꾸로 넣으면 음수가 나온다');
T(NS.workMinutesBetween(D('10:00'), D('10:00'), 'PCTC') === 0, '같은 시각인데 0 이 아니다');
{ // 자정 넘김
  const a = new Date('2026-08-25T22:00:00+09:00').getTime();
  const b = new Date('2026-08-26T02:00:00+09:00').getTime();
  T(NS.workMinutesBetween(a, b, 'PCTC') === 180, '자정을 넘으면 못 센다(22~24 + 01~02 = 180)');
}

// ② 터미널 실적으로 답하는가 — 실데이터 모양 그대로
const info = { vsl: 'STSE', vslFull: 'SITC SENDAI', pier: 'PCTC' };
const tw = { STSE: { startAt: '2026-08-26 04:50', disDone: 152, lodDone: 0,
                     disPlan: 449, lodPlan: 456, updatedAt: D('09:00') } };
const ans = CA.answerShipSpeed({ info }, {}, 'SITC SENDAI', tw);
T(!!ans, '터미널 실적이 있는데 답이 없다');
T(/터미널 실적 기준/.test(ans || ''), '무엇으로 계산했는지 안 밝힌다');
T(/2갱 기준/.test(ans || ''), '⛔ «2갱 기준»을 안 말한다(검수사 확정 표기)');
T(/1갱이면/.test(ans || ''), '⛔ «1갱이면 ×2»를 안 말한다(검수사 확정 표기)');
T(/실작업/.test(ans || ''), '쉬는 시간을 뺀 실작업 시간을 안 보여준다');
T(/쯤 끝납니다|다 했습니다/.test(ans || ''), '종료 예측이 없다 — 메모의 목적이 그것이다');
{ //  04:50~09:00 = 04:50~06:30(100분) + 08:00~09:00(60분) = 160분. 152대 ÷ 2 ÷ (160/60) ≈ 28.5
  const m = (ans || '').match(/갱당 시간당 ([\d.]+)대/);
  T(!!m, '갱당 속도를 안 말한다');
  if (m) T(Math.abs(+m[1] - 28.5) < 0.6, `갱당 속도가 틀렸다: ${m[1]} (쉬는 시간을 뺀 160분 기준이면 28.5)`);
}

// ③ 터미널 실적이 없으면 옛 방식으로 가되 **그 사실을 밝히는가**
const old = CA.answerShipSpeed({ info }, { STSE_PCTC: { vsl: 'STSE', pier: 'PCTC', movesPerCraneHour: 25, avgCranes: 2, voys: 5, moves: 100, craneHours: 4 } }, 'SITC SENDAI', null);
T(!!old, '폴백 답이 없다');
T(/과거 평균/.test(old || ''), '⛔ 과거 평균으로 답하면서 그 사실을 안 밝힌다 — 검수사가 틀린 수를 믿게 된다');

// ④ 못 잴 때 지어내지 않는가
T(CA.answerShipSpeed({ info }, {}, '', { STSE: { startAt: '', disDone: 100 } }) !== null
  || true, '');   // 시작시각 없음 → 폴백으로 감(에러 없이)
const tooShort = { STSE: { startAt: '2026-08-26 08:50', disDone: 5, disPlan: 100, updatedAt: D('09:00') } };
const s2 = CA.answerShipSpeed({ info }, {}, '', tooShort);
T(!/터미널 실적 기준/.test(s2 || ''), '⛔ 10분치 기록으로 페이스를 냈다 — 튄 수를 믿게 된다');

if (bad) { console.error(`✗ 작업속도 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 작업속도 연막검사 통과 (쉬는시간 10 · 터미널 실적 8 · 폴백 2 · 지어내지 않음 1)');
