// 2.62 갱 배분 연막검사 — «출근~퇴근까지 내 작업량»이 실데이터에서 서고, 실시간(완료·시각)으로 줄어드는가.
//   검수사 확정: 조 단위·기본 2갱·FR 교체 15분+개당 3분·«일이 끝나가도 답은 같았습니다» 해소.
//   사용: node tools/smoke_gangshift.cjs <chiefAnswers 번들.cjs> <저장소 루트>
const path = require('path');
const fs = require('fs');
const CA = require(path.resolve(process.argv[2]));
const ROOT = process.argv[3] || process.cwd();
console.warn = () => {};
let bad = 0; const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/gangshift_swtd.json'), 'utf8'));
const voyage = { info: fx.info, discharge: { ediContainers: fx.ediContainers }, loading: {} };
const NIGHT = new Date('2026-08-27T19:05:00+09:00').getTime();
//  ★ 2.69 (검수사 «사용자가 갱지정을 안하면 되묻고»): 갱 수를 안 대면 계산하지 않고 되묻는다.
//    아래 시험들은 «2갱일 때의 분할» 을 잠그는 것이라 수를 명시해서 부른다.
{
  const ask = CA.buildGangShift(voyage, fx.bayDef, { now: NIGHT });
  T(!!ask && ask.askGangs === true && !ask.gangs, '갱 수를 안 댔는데 2갱으로 가정해 계산한다');
  const ansAsk = CA.answerGangShift(voyage, fx.bayDef, { now: NIGHT });
  T(/몇 갱으로 작업하십니까/.test(String(ansAsk || '')), '되묻지 않고 침묵한다 — 어느 상황에서든 답해야 한다');
  const fixedV = { ...voyage, info: { ...voyage.info, gangsShift: { '08-27 야간': 3 } } };
  const g3 = CA.buildGangShift(fixedV, fx.bayDef, { now: NIGHT });
  T(!!g3 && g3.nGangs === 3 && g3.fixedShift === true, '이 조에 기억시킨 3갱을 안 쓴다');
}
// ① 야간조 — 2갱, 각 약 240대, 시작은 구간 첫 그룹
const gs = CA.buildGangShift(voyage, fx.bayDef, { now: NIGHT, nGangs: 2 });
T(!!gs && gs.gangs.length === 2, '2갱 결과가 없다');
if (gs) {
  T(gs.shift.name === '야간조', `조 판정이 틀렸다 (${gs.shift.name})`);
  T(gs.availH > 9 && gs.availH < 10.1, `야간 실근무 창이 틀렸다 (${gs.availH})`);
  gs.gangs.forEach((g) => T(g.cnt > 180 && g.cnt < 300, `갱 ${g.no} 조 예상 대수 이상 (${g.cnt})`));
  T(gs.gangs[0].fr > 0, '1번 갱 FR 표기가 죽었다');
  //  2.62-03 (검수사 확정 «보통 선미와 중간부분부터 진행합니다»): 1번 갱은 중간부분(구간 뒤 끝 B19)부터,
  //  마지막 갱은 선미 끝(B34)부터 — 앞만 파먹으면 트림이 무너진다(«배가 뒤로 뒤집어 질텐데요»).
  T(/^\(18\)19 데크/.test(gs.gangs[0].from), `1번 갱이 중간부분((18)19) 데크부터가 아니다 (${gs.gangs[0].from})`);
  T(/^B34 데크/.test(gs.gangs[1].from), `⛔ 마지막 갱이 선미 끝 데크부터가 아니다 (${gs.gangs[1].from})`);
  T(gs.strip.some((g) => g.label === '(22)23') && gs.strip.some((g) => g.label === 'B32') && gs.strip.some((g) => g.label === 'B33'), '짝 판정이 CASP 정본((22)23 페어·32/33 단독)과 다르다');
  T(gs.strip.some((g) => typeof g.deckN === 'number' && typeof g.holdN === 'number'), '스트립 데크/홀드 단 데이터가 없다');
}
// ② 3갱
const g3 = CA.buildGangShift(voyage, fx.bayDef, { now: NIGHT, nGangs: 3 });
T(!!g3 && g3.gangs.length === 3, '3갱 분할이 안 된다');
// ③ 실시간 — 완료 240대를 반영하면 조 예상이 줄어든다
const cns = Object.keys(fx.ediContainers).slice(0, 240); const comp = {}; cns.forEach((c) => { comp[c] = 1; });
const MID = new Date('2026-08-28T00:10:00+09:00').getTime();
const gm = CA.buildGangShift(voyage, fx.bayDef, { now: MID, nGangs: 2, compMap: comp });
T(!!gm && gm.availH < 6, `자정 이후 남은 창이 안 줄었다 (${gm && gm.availH})`);
T(!!gm && gm.gangs.reduce((a, g) => a + (g.cnt || 0), 0) < gs.gangs.reduce((a, g) => a + g.cnt, 0), '완료를 반영해도 예상이 안 줄어든다 — «일이 끝나가도 답이 같다» 재발');
// ④ voyage.completed 자동 흡수(compMap 미지정)
const vc = { ...voyage, discharge: { ...voyage.discharge, completed: comp } };
const ga = CA.buildGangShift(vc, fx.bayDef, { now: MID , nGangs: 2 });
T(!!ga && ga.gangs.reduce((a, g) => a + (g.cnt || 0), 0) === gm.gangs.reduce((a, g) => a + (g.cnt || 0), 0), 'voyage.completed 자동 흡수가 compMap 과 다르다');
// ④-2 (2.62-01) 낮(주간조)에 물어도 작업 시작이 밤이면 «다가오는 야간조»로 미리 보기가 선다.
//  2.99-03: 주야 구분 없는 배(OBWH·RZOR) — 조 창 = 계획 작업 시간 전체, 17:30 에서 안 끊고, 다가오는 조로 안 굴린다.
{
  const vo = { ...voyage, info: { ...voyage.info, vsl: 'OBWH', planDate: '2026-08-27 11:30 ~ 2026-08-27 19:30', gangsShift: {} } };
  const AT16 = new Date('2026-08-27T16:00:00+09:00').getTime();
  const go = CA.buildGangShift(vo, fx.bayDef, { now: AT16, nGangs: 2 });
  T(!!go && go.shift.noShift === true && /주야 구분 없음/.test(go.shift.name), `OBWH 조 창이 «작업 전체»가 아니다 (${go && go.shift.name})`);
  T(!!go && /~19:30$/.test(go.shift.label) && !go.shift.upcoming, `OBWH 조 창 끝이 계획 끝(19:30)이 아니다 (${go && go.shift.label})`);
  T(!!go && go.availH >= 1.9 && go.availH < 3.6, `OBWH 16:00 남은 창이 17:30 에서 끊겼다 (${go && go.availH})`);   // 17:30~19:00 휴게를 빼면 2h, 안 빼면 3.5h
  const vs = { ...vo, info: { ...vo.info, vsl: 'STSE' } };
  const gsd = CA.buildGangShift(vs, fx.bayDef, { now: AT16, nGangs: 2 });
  T(!!gsd && gsd.shift.name === '주간조' && gsd.availH < go.availH, `보통 배는 종전대로 17:30 에서 끊겨야 한다 (${gsd && gsd.shift.name} ${gsd && gsd.availH})`);
}
const DAY = new Date('2026-08-27T10:30:00+09:00').getTime();
const gd = CA.buildGangShift(voyage, fx.bayDef, { now: DAY , nGangs: 2 });
T(!!gd && gd.shift.name === '야간조' && gd.shift.upcoming === true, `낮 미리 보기가 안 선다 (${gd && gd.shift.name})`);
T(!!gd && /다가오는 야간조/.test((CA.gangBriefLines(gd) || [''])[0]), '다가오는 조 표기가 없다');
// ④-3 (2.62-04) 입항계획 변경 반영 — 시작이 밀리면(19:00→21:00) 라벨도 21:00 을 말한다.
{
  const v21 = { ...voyage, info: { ...voyage.info, planDate: '2026-08-27 21:00 ~ 2026-08-28 21:00' } };
  const g21 = CA.buildGangShift(v21, fx.bayDef, { now: new Date('2026-08-27T19:05:00+09:00').getTime() , nGangs: 2 });
  T(!!g21 && /21:00 시작/.test(g21.shift.label), `⛔ 밀린 시작(21:00)이 라벨에 없다 (${g21 && g21.shift.label}) — 계산만 맞고 말이 옛 시각(검수사 실측)`);
  T(!!g21 && g21.availH > 7.5 && g21.availH < 8.5, `21:00 시작 창 계산이 틀렸다 (${g21 && g21.availH})`);
  //  2.63-01 (검수사 수열 «34:40 33:4 32:44 30:44 26:44 22:23» — 8h·199대·데크 계산만):
  T(!!g21 && /\(22\)23 데크/.test(String(g21.gangs[1].to)), `⛔ 데크 우선 대수 소진이 아니다 (to=${g21 && g21.gangs[1].to}) — 검수사 수열과 어긋난다`);
}
// ★ 2.70 (검수사 메모 «작업중이던 선박에 갱배분을 물었을때 앱자료가 없을시 터미널 실작업량을 기준으로»):
//    앱에 완료를 안 찍고 작업하면 이미 내린 것까지 «남은 일» 로 셌다. 터미널 실적으로 깎는다.
{
  const TW = { disPlan: 918, disDone: 200, lodPlan: 0, lodDone: 0 };
  const g0 = CA.buildGangShift(voyage, fx.bayDef, { now: NIGHT, nGangs: 2 });
  const gT = CA.buildGangShift(voyage, fx.bayDef, { now: NIGHT, nGangs: 2, tw: TW });
  T(gT && gT.twGap === 200, `터미널 실적 200대를 안 깎는다 (twGap=${gT && gT.twGap})`);
  const rest0 = g0.gangs.reduce((t, g) => t + (g.restTotal || 0), 0);
  const restT = gT.gangs.reduce((t, g) => t + (g.restTotal || 0), 0);
  T(restT === rest0 - 200, `구간 잔여가 200대 안 줄었다 (${rest0} → ${restT})`);
  const ansT = CA.answerGangShift(voyage, fx.bayDef, { now: NIGHT, nGangs: 2, tw: TW }) || '';
  T(/앱에 안 찍힌 200대는 터미널 실적으로/.test(ansT), '터미널 실적으로 깎은 사실을 안 밝힌다 — 어디까지 했는지는 모르는 값이다');
  T(!/안 찍힌/.test(CA.answerGangShift(voyage, fx.bayDef, { now: NIGHT, nGangs: 2 }) || ''), '터미널 자료가 없는데도 그 문구가 뜬다');
}

// ⑤ 브리핑 줄
const bl = CA.gangBriefLines(gs);
T(Array.isArray(bl) && /^🏗 야간조/.test(bl[0]) && /갱 배분.*상세 확인/.test(bl[1]), '브리핑 줄 형식이 깨졌다');
T(/1번 갱\(01~19\)/.test(bl[0]) && /2번 갱\(21~34\)/.test(bl[0]), '브리핑 줄에 담당 구간이 없다 — 조 도달점만 쓰면 3갱처럼 읽힌다(검수사 실측)');
// ⑥ 상세 답
const ans = CA.answerGangShift(voyage, fx.bayDef, { now: NIGHT, nGangs: 2 });   // 2.69: 수를 대야 계산 답
T(!!ans && /포맨 지시가 우선/.test(ans) && /FR 교체 15분/.test(ans), '상세 답 골격이 깨졌다');
// ⑥-2 (2.62-02) 본체 경유 — hasAnyCondition 이 gangQuery 를 알아야 본체가 답한다(라이브 무응답 실측).
{
  const nsPath = process.argv[4];
  if (nsPath) {
    const NS = require(path.resolve(nsPath));
    const p2 = NS.parseNaturalQuery('갱 배분');
    T(NS.hasAnyCondition(p2) === true, '⛔ hasAnyCondition 이 gangQuery 를 모른다 — 본체 도달 전에 잘린다');
    const a2 = NS.generateLocalAnswer(p2, [], [], { mode: 'discharge', gangShift: (n) => CA.answerGangShift(voyage, fx.bayDef, { nGangs: n || 2, now: NIGHT }) });
    T(!!a2 && /갱 배분/.test(String(a2)), '본체 경유 갱 배분 답이 죽었다');
  }
}
// ⑥-3 (2.63) 스트립 — 조별 실적·도달·양하/선적 구분이 데이터에 선다 (인계 그림의 재료).
{
  const cns = Object.keys(fx.ediContainers).slice(0, 200); const comp = {};
  cns.forEach((c) => { comp[c] = { at: new Date('2026-08-27T23:50:00+09:00').getTime() }; });
  const v2 = { ...voyage, discharge: { ...voyage.discharge, completed: comp } };
  const gm = CA.buildGangShift(v2, fx.bayDef, { now: new Date('2026-08-28T08:10:00+09:00').getTime() , nGangs: 2 });
  T(!!gm && Array.isArray(gm.strip) && gm.strip.length > 15, '스트립 데이터가 없다');
  const withDone = gm.strip.filter((g) => g.doneN > 0);
  T(withDone.length > 0 && withDone.every((g) => (g.doneBy['8/27 야간조'] || 0) > 0), '조별 완료(8/27 야간조) 갈림이 죽었다 — 인계 표기가 안 선다');
  T(gm.strip.some((g) => g.reach), '이 조 도달 표시가 없다');
  T(gm.strip.every((g) => typeof g.dis === 'number' && typeof g.lod === 'number'), '양하/선적 구분 수가 없다');
}
// ⑦ 소스 배선 — 세 화면 + 본체
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
T(/gangBrief\(\)/.test(read('src/pages/VoyagePage.jsx')) && /gangShift: briefCtx\?\.gangShift/.test(read('src/pages/VoyagePage.jsx')), 'VoyagePage 갱 배선이 없다');
T(/gang: _gang/.test(read('src/components/SearchPanel.jsx')) && /gangShift: \(n\)/.test(read('src/components/SearchPanel.jsx')), 'SearchPanel 갱 배선이 없다');
T(/GangStrip/.test(read('src/components/SearchPanel.jsx')) && /GangStrip/.test(read('src/pages/VoyagePage.jsx')), '스트립(GangStrip) 배선이 없다 — 그림 없는 인계');
T(/answerGangShift\(_voy, _bayDef/.test(read('src/pages/GlobalSearchPage.jsx')), 'GlobalSearchPage 갱 분기가 없다');
const ns = read('src/nlSearch.js');
T(/gangQuery/.test(ns) && /opts\.gang/.test(ns) && /ctx\.gangShift/.test(ns), 'nlSearch 갱 배선(파싱·브리핑 줄·본체 분기)이 없다');
if (bad > 0) { console.error(`✗ 갱 배분 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 갱 배분 연막검사 통과 — 조 창·2/3갱·실시간(완료·시각)·터미널 실적 반영·브리핑 줄·상세·배선 3화면');
