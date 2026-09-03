// 작업 속도 페이스 연막검사 — 몰아 입력에 속지 않는가 (3.5-01, 검수사 실측 2026-09-03)
//
//   검수사 원문 — «NSDC 마지막 선적 3호기 이종부 로그인한 작업입니다. 그때 앱은 작업속도를
//   전체 작업 시간으로 계산 안하고 그시점만을 계산해서 시간당 몇천개를 작업할수 있다는 메시지를 보였습니다»
//
//   픽스처는 그 항차의 **실제 완료 시각**이다(RTDB archive/NSDC_2608N/loading/completed, 114대).
//   ⚠ 옮겨 적은 값이 아니라 실소스(nlSearch.js)를 esbuild 로 묶어 돌린다.
const fs = require('fs');
const path = require('path');
let fail = 0;
const T = (cond, msg) => { if (!cond) { console.error('  ✗', msg); fail++; } else console.log('  ✓', msg); };

const NS = require(process.argv[2] || path.join(__dirname, '_pace_bundle.cjs'));
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'pace_nsdc.json'), 'utf8'));
const ats = fx.doneAts;

console.log(`NSDC_2608N 선적 실완료 ${ats.length}대 · 부두 ${fx.pier}`);

// ① 버그 재현 — 옛 방식(최근 20대 간격)이 어떤 값을 냈는지
const r20 = ats.slice(-20);
const oldRate = Math.round((r20.length - 1) / (((r20[19] - r20[0])) / 3600000));
console.log(`  (참고) 옛 계산 = 시간당 ${oldRate.toLocaleString()}대`);
T(oldRate > 1000, '옛 계산이 시간당 1,000대를 넘지 않는다 — 픽스처가 그 사건이 아니다');

// ② 고침 — 전체 실작업 시간
const P = NS.paceFromRecords(ats, fx.pier, 2);
T(P.ok === true, '실제 항차인데 페이스를 못 잰다고 한다');
T(P.n === ats.length, `전체 완료 대수를 세지 않는다 (${P.n} ≠ ${ats.length})`);
T(P.workedMin === 192, `실작업 분이 192분이 아니다 (${P.workedMin}) — 01:45~04:56 PNCT 창`);
T(Math.abs(P.perHour - 35.6) < 0.5, `시간당이 35.6대 부근이 아니다 (${P.perHour.toFixed(1)})`);
T(Math.abs(P.perGangHour - 17.8) < 0.5, `2갱 기준 갱당이 17.8대 부근이 아니다 (${P.perGangHour.toFixed(1)})`);
T(P.perHour < 46 * 2, '정상범위(갱당 45무브) 밖이다 — 계산이 아직 튄다');

// ③ 전부 한 번에 찍은 날 — 숫자를 지어내지 않는다
const burst = ats.map((_, i) => ats[0] + Math.round(i * (31 * 60000 / ats.length)));   // 114대를 31분 안에 = 시간당 220대
const B = NS.paceFromRecords(burst, fx.pier, 2);
T(B.ok === false, '몰아 입력인데 페이스를 냈다');
T(B.why === 'batch', `몰아 입력을 batch 로 안 가른다 (${B.why})`);

// ④ 너무 짧으면 안 잰다
const S = NS.paceFromRecords([ats[0], ats[0] + 60000, ats[0] + 120000], fx.pier, 2);
T(S.ok === false && S.why === 'short', '실작업 30분 미만인데 페이스를 냈다');

// ⑤ 기록이 모자라면 안 잰다
T(NS.paceFromRecords([ats[0], ats[1]], fx.pier, 2).why === 'few', '완료 2대인데 페이스를 냈다');

// ⑥ 홈 「오늘의 나」 — 그날 이종부는 **80대를 2분 안에 몰아 찍었다.**
//    잴 수 있는 페이스가 아예 없는 날이다 ⇒ 억지 숫자 대신 «안 보여준다»가 정답이다.
//    (옛 코드는 이 자리에서 «시간당 2,400대»류를 카드에 찍었다.)
const L = NS.paceFromRecords(fx.doneAtsLeeJB, fx.pier, 1);
console.log(`  (참고) 이종부 ${fx.doneAtsLeeJB.length}대 · 실작업 ${L.workedMin}분 → ${L.ok ? '시간당 ' + L.perHour.toFixed(1) : '못 잼(' + L.why + ')'}`);
T(L.ok === false, '2분 안에 몰아 찍은 기록으로 개인 페이스를 냈다');
//  ★ 감사(다른 클로드)가 잡은 함정 — ok:false 만 보면 안 된다. **이유가 맞아야** 화면 문구가 맞다.
//    종전 순서(짧음 먼저)로는 'short' 가 나와 미르가 «아직 시간이 안 지났어요» 라고 거짓 설명을 했다.
T(L.why === 'batch', `몰아 입력을 '${L.why}' 로 가른다 — 화면이 «아직 시간이 안 지났다»는 거짓말을 한다`);

// ⑧ 부두 이름이 지저분해도 같은 답 — 문지기가 정규화한다(감사 P2-4)
const clean = NS.paceFromRecords(ats, 'PNCT', 2);
for (const dirty of ['PNCT 13번 선석', 'pnct', ' PNCT ']) {
  const D = NS.paceFromRecords(ats, dirty, 2);
  T(D.ok && D.workedMin === clean.workedMin, `«${dirty}» 를 PNCT 로 못 알아본다 (${D.workedMin} ≠ ${clean.workedMin})`);
}
T(NS.normPier('PCTC 2번') === 'PCTC' && NS.normPier('') === '', 'normPier 가 부두를 못 가른다');

// ⑨ 망가진 시각이 «시간당 0대» 로 화면에 새지 않는다(감사 P2-5)
const dirtyAts = [1, 2, Date.now()];
const DD = NS.paceFromRecords(dirtyAts, 'PNCT', 2);
T(DD.ok === false && DD.why === 'dirty', `망가진 시각으로 페이스를 냈다 (${JSON.stringify(DD)})`);
T(!(DD.ok && Math.round(DD.perHour) === 0), '«시간당 0대» 가 화면으로 샌다');

// ⑩ 시작 직후(진짜로 이른 것)는 여전히 «시간이 안 지났다» 여야 한다 — 몰아 입력과 헷갈리면 안 된다
const early = [ats[0], ats[0] + 6 * 60000, ats[0] + 12 * 60000];   // 3대를 12분에 = 시간당 15대
const E = NS.paceFromRecords(early, 'PNCT', 2);
T(E.ok === false && E.why === 'short', `이른 시각을 '${E.why}' 로 가른다 — 몰아 입력이 아니다`);

// ⑦ 트윈이 많은 날을 «몰아 입력»으로 잘못 몰지 않는다 — 상한은 무브가 아니라 대수 기준
const twin = ats.map((_, i) => ats[0] + Math.round(i * (100 * 60000 / ats.length)));   // 114대를 100분 = 시간당 68대
T(NS.paceFromRecords(twin, fx.pier, 1).ok === true, '크레인 1대 시간당 68대(트윈 섞인 날)를 몰아 입력으로 몬다');

// ⑪ 선석만 있고 부두가 빈 항차 — 문지기가 선석에서 부두를 찾아낸다(재감사 P1-A)
const byPier  = NS.paceFromRecords(ats, { pier: 'PNCT' }, 2);
const byBerth = NS.paceFromRecords(ats, { pier: '', berth: '동부두 13번선석' }, 2);
const noneAt  = NS.paceFromRecords(ats, { pier: '', berth: '' }, 2);
console.log(`  (참고) 부두 ${byPier.workedMin}분 · 선석만 ${byBerth.workedMin}분 · 둘 다 없음 ${noneAt.workedMin}분`);
T(byBerth.workedMin === byPier.workedMin, `선석만 있을 때 부두를 못 찾는다 (${byBerth.workedMin} ≠ ${byPier.workedMin}) — 같은 자료가 화면마다 갈린다`);
T(byPier.pier === 'PNCT' && byBerth.pier === 'PNCT', '결과에 고른 부두를 안 실어 준다(ETA 가 다른 표로 그려진다)');

// ⑫ 두 번째 인자를 info 로 받는다 — 갱 수도 거기서 나온다(재감사 P1-B)
T(NS.paceFromRecords(ats, { pier: 'PNCT', gangs: 2 }).ok === true, 'info.gangs 를 안 읽는다');
const oneGang = NS.paceFromRecords(burst, { pier: 'PNCT', gangs: 1 });
const twoGang = NS.paceFromRecords(burst, { pier: 'PNCT', gangs: 2 });
T(oneGang.why === 'batch' && twoGang.why === 'batch', '갱 수에 따라 상한이 안 갈린다');
T(NS.paceFromRecords(ats, 'PNCT', 2).ok === true, '문자열 부두(옛 호출 모양)를 못 받는다');

console.log(fail ? `\n연막검사 실패 ${fail}건` : '\n연막검사 통과');
process.exit(fail ? 1 : 0);
