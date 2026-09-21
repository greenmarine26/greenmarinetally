// 작업속도 연막검사 — **그날 완료 기록으로, 쉬는 시간을 빼고, 갱 수로 나눠 잰다.**
//
// ★ 3.53-12 — 종전(2.54)은 «터미널 합계 피드(트레드링스)로 잰다» 였다. 그 뒤 터미널 **컨별** 실적이 완료 기록(src:'term')으로 들어오게 됐고
//   검수사 2026-09-15 «트레드링스는 … 사용안하기로 했습니다» · 2026-09-21 «총 잔여갯수를 그날 시간당 처리갯수와 갱수로 나눠서 답해야 한다.»
//   ⇒ 아래 메모의 목적(앱을 안 찍어도 작업 중인 배의 속도·끝나는 시각을 답한다)은 그대로이고, 재료만 완료 기록으로 바뀌었다.
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

// ② 그날 완료 기록으로 답하는가 — 실측 모양(STSE 08-26 04:50 시작 · 09:00 까지 152대, 전부 터미널 반영 — 검수원은 한 대도 안 찍음)
const info = { vsl: 'STSE', vslFull: 'SITC SENDAI', pier: 'PCTC', workStartAt: '2026-08-26 04:50' };
const mkVoyage = (nDone, from, to, extra) => {
  const completed = {};
  for (let i = 0; i < nDone; i++) completed['STSE' + String(1000000 + i)] = { by: '', src: 'term', at: Math.round(from + (to - from) * (i / Math.max(1, nDone - 1))) };
  return { info: { ...info, ...(extra || {}) }, discharge: { completed } };
};
const voyage = mkVoyage(152, D('04:50'), D('09:00'));   // 첫 터미널 반영 완료 = 작업 시작(04:50)
const counts = { total: 905, done: 152, byMode: { discharge: { total: 449, done: 152 }, loading: { total: 456, done: 0 } } };
//  ⚠ 넷째 인자에 옛 피드 맵을 넘기던 호출이 남아 있어도(모양이 다르다) 터지거나 그 수를 쓰면 안 된다.
const ans = CA.answerShipSpeed(voyage, {}, 'SITC SENDAI', counts);
T(!!ans, '완료 기록이 있는데 답이 없다');
T(/오늘 완료 기록 기준/.test(ans || ''), '무엇으로 계산했는지 안 밝힌다');
T(!/터미널 실적 기준|트레드링스/.test(ans || ''), '⛔ 아직 «터미널 실적 기준» 이라고 말한다 — 합계 피드는 떼어 냈다');
T(/2갱 기준/.test(ans || ''), '⛔ «2갱 기준»을 안 말한다(검수사 확정 표기)');
T(/1갱이면/.test(ans || ''), '⛔ «1갱이면 ×2»를 안 말한다(검수사 확정 표기)');
T(/실작업/.test(ans || ''), '쉬는 시간을 뺀 실작업 시간을 안 보여준다');
T(/남은 753대/.test(ans || '') && /쯤 끝납니다/.test(ans || ''), `⛔ 총 잔여(양하+선적 905−152=753대)로 종료를 예측하지 않는다 — ${(String(ans).match(/남은.*/) || [''])[0]}`);
{ //  04:50~09:00 = 04:50~06:30(100분) + 08:00~09:00(60분) = 160분. 152대 ÷ 2 ÷ (160/60) ≈ 28.5
  const m = (ans || '').match(/갱당 시간당 ([\d.]+)대/);
  T(!!m, '갱당 속도를 안 말한다');
  if (m) T(Math.abs(+m[1] - 28.5) < 0.6, `갱당 속도가 틀렸다: ${m[1]} (쉬는 시간을 뺀 160분 기준이면 28.5)`);
}
{ //  갱 수로 나누는가 — 1갱이면 갱당 시간당이 두 배(같은 기록)
  const a1 = CA.answerShipSpeed(mkVoyage(152, D('04:50'), D('09:00'), { gangs: 1 }), {}, '', counts);
  const m = (a1 || '').match(/1갱 기준 갱당 시간당 ([\d.]+)대/);
  T(!!m && Math.abs(+m[1] - 57) < 1.2, `⛔ 갱 수(1갱)로 안 나눈다 — ${(String(a1).match(/\*\*.*기준.*/) || [''])[0]}`);
}
{ //  갱 수는 **조마다** 다를 수 있다(info.gangsShift) — 3갱으로 잰 페이스를 지금 2갱에 옮기면 남은 시간이 1.5배여야 한다.
  //  잰 구간 04:50~06:30 은 «08-25 야간», 08:00~09:00 은 «08-26 주간» 이다. 지금 조에는 기억시킨 수가 없어 항차 기본(2갱)으로 간다.
  const v3 = mkVoyage(152, D('04:50'), D('09:00'), { gangs: 2, gangsShift: { '08-25 야간': 3, '08-26 주간': 3 } });
  const a3 = CA.answerShipSpeed(v3, {}, '', counts) || '';
  const m = a3.match(/2갱 기준 갱당 시간당 ([\d.]+)대/);
  T(!!m && Math.abs(+m[1] - 19.0) < 0.4, `⛔ 잰 구간의 갱 수(3갱)로 안 나눈다 — ${(a3.match(/\*\*.*기준.*/) || [a3.split('\n')[0]])[0]}`);
  const mins = (s) => { const x = /\*\*약 (?:(\d+)시간)? ?(?:(\d+)분)?\*\* 뒤/.exec(String(s)); return x ? Number(x[1] || 0) * 60 + Number(x[2] || 0) : -1; };
  const r2 = mins(ans), r3 = mins(a3);
  T(r2 > 0 && Math.abs(r3 / r2 - 1.5) < 0.05, `⛔ 3갱으로 잰 것을 2갱으로 하면 남은 시간이 1.5배여야 한다 (${r2}분 → ${r3}분)`);
}

// ③ 오늘 기록으로 못 잴 때는 옛 방식으로 가되 **그 사실을 밝히는가**
const old = CA.answerShipSpeed({ info }, { STSE_PCTC: { vsl: 'STSE', pier: 'PCTC', movesPerCraneHour: 25, avgCranes: 2, voys: 5, moves: 100, craneHours: 4 } }, 'SITC SENDAI', null);
T(!!old, '폴백 답이 없다');
T(/과거 평균/.test(old || ''), '⛔ 과거 평균으로 답하면서 그 사실을 안 밝힌다 — 검수사가 틀린 수를 믿게 된다');

// ④ 못 잴 때 지어내지 않는가 — 10분치 기록으로 페이스를 내지 않는다
{
  const s2 = CA.answerShipSpeed(mkVoyage(5, D('08:50'), D('09:00'), { workStartAt: '2026-08-26 08:50' }), {}, '', { total: 100, done: 5 });
  T(!/오늘 완료 기록 기준/.test(s2 || ''), '⛔ 10분치 기록으로 페이스를 냈다 — 튄 수를 믿게 된다');
}

// ⑤ ★ 경로가 셋이다 — 검수사가 실제로 쓰는 «양하 탭 검색바» 는 formatEta(generateLocalAnswer) 로 간다.
//   검수원이 앱에 한 대도 안 찍었어도(전부 터미널 반영) «아직 시작 전» 이 아니라 끝나는 시각을 답해야 한다 — 2.54 가 지키던 그 자리.
{
  const comp = voyage.discharge.completed;
  const cont = Array.from({ length: 449 }, (_, i) => { const cn = 'STSE' + String(1000000 + i); return { cn, _ptk: true, _mode: 'discharge', _comp: comp[cn] || null }; });
  const ctx = { mode: 'discharge', vsl: 'STSE', vslFull: 'SITC SENDAI', pier: 'PCTC', info: voyage.info, voyage, voyageDoneAts: NS.voyageDoneAts(voyage), voyageCounts: counts,
    terminalWork: { STSE: { startAt: '2026-08-26 04:50', disDone: 449, disPlan: 449, lodDone: 0, lodPlan: 0, updatedAt: D('09:00') } } };   // 옛 피드를 실어 보내도 안 쓴다
  const out = NS.generateLocalAnswer({ etaQuery: true }, [], cont, ctx);
  T(!!out, 'etaQuery 에 답이 없다');
  T(!/아직 시작 전/.test(out || ''), '⛔ 완료 기록(터미널 반영 152대)이 있는데 «아직 시작 전» 이라고 답한다');
  T(/^753대 남았어요/.test(out || ''), `⛔ 총 잔여가 753대가 아니다 — ${String(out).split('\n')[0]}`);
  T(!/다 채웠습니다|터미널 실적/.test(out || ''), '⛔ 실어 보낸 합계 피드(449/449)로 답한다');
  T(/2갱 기준 갱당/.test(out || ''), '«N갱 기준 갱당» 을 안 말한다');
  T(/쯤 끝나겠네요/.test(out || ''), '종료 시각을 안 말한다');
  const out2 = NS.generateLocalAnswer({ etaQuery: true }, [], cont.map((c) => ({ ...c, _comp: null })), { mode: 'discharge', vsl: 'STSE', pier: 'PCTC' });
  T(typeof out2 === 'string' && out2.length > 0, '완료 기록이 없을 때 답이 없다(폴백이 죽었다)');
}

// ⑥ 계산은 **한 벌**이어야 한다 — 두 벌이면 화면마다 다른 수가 나온다
T(typeof NS.speedFromRecords === 'function', 'speedFromRecords 가 nlSearch 에 없다 — 판정이 두 벌이 된다');
T(typeof NS.speedFromTerminal === 'undefined', '⛔ speedFromTerminal(합계 피드)이 아직 있다');
{
  const a = NS.speedFromRecords(voyage, counts);
  const b = CA.answerShipSpeed(voyage, {}, '', counts);
  T(!!a && a.left === 753 && a.plan === 905, 'speedFromRecords 가 총 잔여를 못 센다');
  if (a && b) {
    const m = b.match(/갱당 시간당 ([\d.]+)대/);
    T(!!m && Math.abs(+m[1] - a.perGangHour) < 0.05, '두 경로가 다른 속도를 낸다 — 판정이 갈렸다');
  }
  //  미르 «몇 시에 끝나» 와 «작업 속도» 의 남은 시간이 같은가(같은 잔여 ÷ 같은 페이스)
  const eta = NS.generateLocalAnswer({ etaQuery: true }, [], [], { mode: 'discharge', vsl: 'STSE', pier: 'PCTC', info: voyage.info, voyage, voyageDoneAts: NS.voyageDoneAts(voyage), voyageCounts: counts });
  const mm = (s, re) => { const x = re.exec(String(s)); return x ? Number(x[1] || 0) * 60 + Number(x[2] || 0) : -1; };
  const m1 = mm(eta, /남은 시간: 약 (?:(\d+)시간)? ?(?:(\d+)분)?/), m2 = mm(b, /\*\*약 (?:(\d+)시간)? ?(?:(\d+)분)?\*\* 뒤/);
  T(m1 > 0 && Math.abs(m1 - m2) <= 2, `⛔ «몇 시에 끝나»(${m1}분)와 «작업 속도»(${m2}분)의 남은 시간이 다르다`);
}

if (bad) { console.error(`✗ 작업속도 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 작업속도 연막검사 통과 (쉬는시간 10 · 그날 완료 기록 9 · 폴백 2 · 지어내지 않음 1 · 세 번째 경로 7 · 판정 한 벌 5)');
