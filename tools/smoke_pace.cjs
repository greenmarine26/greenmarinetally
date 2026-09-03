// 작업 속도 페이스 연막검사 — 분모는 «배가 일한 시간»이다 (3.6-01, 검수사 정정 2026-09-03)
//
//   검수사 원문 — «이건 회피입니다. 1초에 몰아 찍건 정확히 실시간으로 입력하든 총 걸린 작업시간은
//   같습니다. 1시간에 800개를 해도 10시간을 일했으면 시간당 80개입니다.»
//   그리고 — «그이유로 터미널 실시간 조회를 하는것입니다.»
//            «저혼자만 앱을 사용해도 나머지는 다른검수 기록이기 때문에 가능합니다.»
//
//   픽스처는 NSDC 2608N 실제 기록이다(접안 09-02 22:00 ~ 이안 09-03 04:40, 양하 124 + 선적 114).
const fs = require('fs'); const path = require('path');
let fail = 0;
const T = (c, m) => { if (!c) { console.error('  ✗', m); fail++; } else console.log('  ✓', m); };
const NS = require(process.argv[2]);
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'pace_nsdc.json'), 'utf8'));
const INFO = fx.info;

console.log(`NSDC_2608N · ${INFO.pier} · 접안 ${INFO.atbActual} ~ 이안 ${INFO.atdActual}`);

// ① 작업 구간을 자료에서 뽑는다
const [ws, we] = NS.workWindowOf(INFO, fx.doneAtsAll[fx.doneAtsAll.length - 1]);
T(ws > 0 && we > ws, '접안·이안 시각을 못 읽는다 — 슬래시 형식(2026/09/02 22:00)을 봐라');
T(new Date(ws).getDate() === 2, `작업 시작을 09-02 로 안 잡는다 (${new Date(ws).toLocaleString('ko-KR')}) — workStartAt 09-03 22:00 은 다음 기항이라 버려야 한다`);

// ② 전체 — 몰아 입력이 섞여 있어도 정상 범위가 나온다
const P = NS.paceFromRecords(fx.doneAtsAll, INFO, 2);
console.log(`  전체 ${P.n}대 ÷ 실작업 ${P.mins}분 → 시간당 ${P.perHour.toFixed(1)}대 (갱당 ${P.perGangHour.toFixed(1)}) · 기준 ${P.basis}`);
T(P.ok === true, `실제 항차인데 «${P.why}» 로 못 잰다고 한다`);
T(P.basis === 'work', `분모를 작업 시간이 아니라 «${P.basis}» 로 잡았다`);
T(P.mins === 310, `실작업이 310분이 아니다 (${P.mins}) — 22:00~23:30 + 01:00~04:40`);
T(Math.abs(P.perHour - 46.1) < 0.5, `시간당이 46.1대 부근이 아니다 (${P.perHour.toFixed(1)})`);
T(P.perGangHour >= 8 && P.perGangHour <= 45, `갱당 ${P.perGangHour.toFixed(1)} 대 — 마감텔리 실측 정상범위(8~45무브/크레인h) 밖이다`);

// ③ ★ 몰아 찍어도 개인 페이스가 나온다 — 3.6 의 «몰아 입력이라 못 잼» 회피를 없앤 자리
const L = NS.paceFromRecords(fx.byLeeJB, INFO, 1);
const K = NS.paceFromRecords(fx.byKimSI, INFO, 1);
console.log(`  이종부 ${fx.byLeeJB.length}대 → ${L.ok ? '시간당 ' + L.perHour.toFixed(1) + '대' : '못 잼(' + L.why + ')'} · 김성일 ${fx.byKimSI.length}대 → ${K.ok ? '시간당 ' + K.perHour.toFixed(1) + '대' : '못 잼(' + K.why + ')'}`);
T(L.ok === true, `⛔ 이종부는 80대를 107초에 몰아 찍었다 — 그래도 잴 수 있어야 한다. 지금 «${L.why}»`);
T(K.ok === true, `김성일을 못 잰다 (${K.why})`);
T(L.mins === K.mins && L.mins === 310, `두 사람의 분모가 다르다 (${L.mins} vs ${K.mins}) — 같은 배에서 같아야 한다`);
T(Math.abs(L.perHour - 17.4) < 0.5, `이종부 시간당이 17.4대 부근이 아니다 (${L.perHour.toFixed(1)})`);
T(Math.abs(K.perHour - 26.3) < 0.5, `김성일 시간당이 26.3대 부근이 아니다 (${K.perHour.toFixed(1)})`);
T(Math.abs((L.perHour + K.perHour) - P.perHour) < 3, `두 사람 몫을 더하면 전체(${P.perHour.toFixed(1)})가 나와야 한다 — ${(L.perHour + K.perHour).toFixed(1)}`);

// ④ 몰아 찍은 시각을 통째로 흔들어도 답이 안 변한다 — 분모가 «찍은 구간»이 아니기 때문
const shifted = fx.doneAtsAll.map((a, i) => (i < 200 ? a : ws + 60000));   // 뒤엣것을 작업 시작 직후로 몰아 찍음
const S = NS.paceFromRecords(shifted, INFO, 2);
T(S.ok === true && Math.abs(S.perHour - P.perHour) < 0.1, `찍은 시각을 흔들었더니 값이 변한다 (${S.ok ? S.perHour.toFixed(1) : S.why}) — 분모가 아직 «찍은 구간»이다`);

// ⑤ 이안 뒤에 찍은 기록이 분모를 늘리지 않는다
const late = fx.doneAtsAll.concat([we + 60 * 60000]);
const A = NS.paceFromRecords(late, INFO, 2);
T(A.mins === 310, `이안 한 시간 뒤에 찍었더니 분모가 늘었다 (${A.mins}) — 작업은 이안에서 끝난다`);

// ⑥ 작업 시각을 모르는 항차는 완료 기록으로라도 잰다(그리고 그 사실을 basis 로 알린다)
const R = NS.paceFromRecords(fx.doneAtsAll, { pier: INFO.pier }, 2);
T(R.ok === true && R.basis === 'records', `작업 시각을 모를 때 못 잰다 (${R.ok ? R.basis : R.why})`);

// ⑦ 부두가 지저분하거나 선석만 있어도 같은 답
for (const v of [{ pier: 'PNCT 13번 선석' }, { pier: '', berth: '동부두 13번선석' }, { pier: 'pnct' }]) {
  const D = NS.paceFromRecords(fx.doneAtsAll, { ...INFO, ...v }, 2);
  T(D.ok && D.mins === P.mins, `«${v.pier || v.berth}» 를 PNCT 로 못 알아본다 (${D.mins} ≠ ${P.mins})`);
}

// ⑧ 경계 — 예외 없이 «모름»으로 떨어진다
T(NS.paceFromRecords([], INFO, 2).why === 'few', '빈 배열에 답을 낸다');
T(NS.paceFromRecords(null, INFO, 2).why === 'few', 'null 에 답을 낸다');
T(NS.paceFromRecords([1, 2, Date.now()], INFO, 2).ok === false, '망가진 시각으로 답을 낸다');
T(NS.paceFromRecords(fx.doneAtsAll, 'PNCT', 2).ok === true, '문자열 부두(옛 호출 모양)를 못 받는다');

// ⑨ ★ 감사가 잡은 자리 — 접안·이안은 **배가 떠난 뒤에야** 온다(collector/pnctpull.py:209).
//    검수사가 실제로 보는 «작업 중»에는 터미널 실적의 startAt 만 있다. 그것으로 분모가 서야 한다.
{
  const tw = { startAt: '2026-09-02 22:15', endAt: '' };
  const LAST = fx.doneAtsAll[fx.doneAtsAll.length - 1];
  //  ⚠ «끝났다» 표시까지 켜서 재면 진짜 작업 중 경로를 안 밟는다(감사 P2-4) — 둘 다 잰다.
  const live = { pier: INFO.pier, berth: INFO.berth };
  const LV = NS.paceFromRecords(fx.byLeeJB, live, 1, tw);
  T(LV.basis === 'work', '작업 중(끝 표시 없음)인데 터미널 startAt 을 못 쓴다');
  T(LV.perHour < 45, `작업 중 이종부가 시간당 ${LV.ok ? LV.perHour.toFixed(1) : '?'}대 — 크레인 한 대 한계를 넘는다`);
  const during = { pier: INFO.pier, berth: INFO.berth, terminalStatus: 'departed', paceTo: LAST };
  const A = NS.paceFromRecords(fx.doneAtsAll, during, 2, tw);
  const B = NS.paceFromRecords(fx.byLeeJB, during, 1, tw);
  const C = NS.paceFromRecords(fx.byKimSI, during, 1, tw);
  console.log(`  작업 중(접안·이안 없음) — 전체 ${A.ok ? A.perHour.toFixed(1) : A.why} · 이종부 ${B.ok ? B.perHour.toFixed(1) : B.why} · 김성일 ${C.ok ? C.perHour.toFixed(1) : C.why} · 분모 ${A.mins}/${B.mins}/${C.mins}분`);
  T(A.basis === 'work' && B.basis === 'work' && C.basis === 'work', '접안·이안이 없으면 터미널 startAt 을 못 쓴다 — 3.6 의 분모로 되돌아간다');
  T(A.mins === B.mins && B.mins === C.mins, `사람마다 분모가 다르다 (${A.mins}/${B.mins}/${C.mins}) — 항차 마지막(paceTo)으로 맞춰야 한다`);
  T(B.perHour < 45, `⛔ 몰아 찍은 이종부가 시간당 ${B.ok ? B.perHour.toFixed(1) : '?'}대 — 크레인 한 대가 낼 수 없는 값이다`);
}

// ⑩ 끝난 배는 분모가 시계를 따라 늘지 않는다
{
  const tw = { startAt: '2026-09-02 22:15', endAt: '' };
  const over = { pier: INFO.pier, terminalStatus: 'departed', paceTo: fx.doneAtsAll[fx.doneAtsAll.length - 1] };
  const live = { pier: INFO.pier };
  const O = NS.paceFromRecords(fx.doneAtsAll, over, 2, tw);
  const V = NS.paceFromRecords(fx.doneAtsAll, live, 2, tw);
  T(O.mins < 400, `떠난 배인데 분모가 ${O.mins}분 — 시계를 따라 늘고 있다`);
  T(V.mins > O.mins, '작업 중인 배는 분모가 지금까지여야 한다');
}

// ⑪ 분자를 잘랐으면 분모도 자른다(홈 「오늘의 나」 — 자정 넘긴 야간 배)
{
  const t0 = new Date(fx.doneAtsAll[fx.doneAtsAll.length - 1]); t0.setHours(0, 0, 0, 0);
  const today = fx.doneAtsAll.filter((a) => a >= t0.getTime());
  const P1 = NS.paceFromRecords(today, { ...INFO, paceTo: fx.doneAtsAll[fx.doneAtsAll.length - 1] }, 2);
  const P2 = NS.paceFromRecords(today, { ...INFO, paceFrom: t0.getTime(), paceTo: fx.doneAtsAll[fx.doneAtsAll.length - 1] }, 2);
  T(P2.mins < P1.mins, '분자를 오늘 것만 잘랐는데 분모는 어제 접안부터다 — 25% 낮게 나온다');
  T(P2.perHour > P1.perHour, '자른 분모가 더 높은 값을 내야 한다(같은 대수를 짧은 시간에)');
}

// ⑫ «끝났다» 판정은 앱의 다른 자리(ChiefDashboard)와 한 벌이어야 한다 — 아니면 분모가 시계를 따라 늘어난다
{
  const tw = { startAt: '2026-09-02 22:15', endAt: '' };
  const base = NS.paceFromRecords(fx.doneAtsAll, { pier: INFO.pier, terminalStatus: 'departed' }, 2, tw);
  for (const [name, inf] of [['dischargeDone 만', { pier: INFO.pier, dischargeDone: true }],
                             ['loadingDone 만', { pier: INFO.pier, loadingDone: true }],
                             ['inspectorDone', { pier: INFO.pier, inspectorDone: true }],
                             ['workEndAt', { pier: INFO.pier, workEndAt: '2026-09-03 04:40' }]]) {
    const P = NS.paceFromRecords(fx.doneAtsAll, inf, 2, tw);
    T(P.ok && P.mins < 400, `«${name}» 을 끝난 것으로 안 본다 (분모 ${P.mins}분) — 시계를 따라 늘어난다`);
  }
  //  아무 표시도 없고 마지막 완료에서 하루 넘게 지났으면 끝난 것으로 본다
  const old = fx.doneAtsAll.map((a) => a - 3 * 24 * 3600000);
  const S = NS.paceFromRecords(old, { pier: INFO.pier }, 2, { startAt: '2026-08-30 22:15', endAt: '' });
  T(S.ok && S.mins < 700, `사흘 지난 배인데 분모가 ${S.mins}분 — 하루 걸쇠가 안 선다`);
  //  미래 updatedAt 은 «신선»이 아니다
  const F2 = NS.paceFromRecords(fx.doneAtsAll, { pier: INFO.pier }, 2, { startAt: '2026-09-02 22:15', pct: 100, updatedAt: Date.now() + 3 * 3600000 });
  T(typeof F2.mins === 'number', '미래 updatedAt 에서 터진다');
}

// ⑬ 항차 전체를 모으는 helper
const vd = NS.voyageDoneAts({ discharge: { completed: { A: { at: 100 } } }, loading: { completed: { B: { at: 50 } } } });
T(vd.length === 2 && vd[0] === 50, '양하+선적을 시간순으로 못 모은다');
T(NS.voyageDoneAts(null).length === 0, 'null 항차에서 던진다');

console.log(fail ? `\n연막검사 실패 ${fail}건` : '\n연막검사 통과');
process.exit(fail ? 1 : 0);
