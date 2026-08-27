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
// ① 야간조 — 2갱, 각 약 240대, 시작은 구간 첫 그룹
const gs = CA.buildGangShift(voyage, fx.bayDef, { now: NIGHT });
T(!!gs && gs.gangs.length === 2, '2갱 결과가 없다');
if (gs) {
  T(gs.shift.name === '야간조', `조 판정이 틀렸다 (${gs.shift.name})`);
  T(gs.availH > 9 && gs.availH < 10.1, `야간 실근무 창이 틀렸다 (${gs.availH})`);
  gs.gangs.forEach((g) => T(g.cnt > 180 && g.cnt < 300, `갱 ${g.no} 조 예상 대수 이상 (${g.cnt})`));
  T(gs.gangs[0].fr > 0, '1번 갱 FR 표기가 죽었다');
  //  2.62-03 (검수사 확정 «보통 선미와 중간부분부터 진행합니다»): 1번 갱은 중간부분(구간 뒤 끝 B19)부터,
  //  마지막 갱은 선미 끝(B34)부터 — 앞만 파먹으면 트림이 무너진다(«배가 뒤로 뒤집어 질텐데요»).
  T(/^B19/.test(gs.gangs[0].from), `1번 갱이 중간부분(B19)부터가 아니다 (${gs.gangs[0].from})`);
  T(/^B34/.test(gs.gangs[1].from), `⛔ 마지막 갱이 선미 끝부터가 아니다 (${gs.gangs[1].from})`);
}
// ② 3갱
const g3 = CA.buildGangShift(voyage, fx.bayDef, { now: NIGHT, nGangs: 3 });
T(!!g3 && g3.gangs.length === 3, '3갱 분할이 안 된다');
// ③ 실시간 — 완료 240대를 반영하면 조 예상이 줄어든다
const cns = Object.keys(fx.ediContainers).slice(0, 240); const comp = {}; cns.forEach((c) => { comp[c] = 1; });
const MID = new Date('2026-08-28T00:10:00+09:00').getTime();
const gm = CA.buildGangShift(voyage, fx.bayDef, { now: MID, compMap: comp });
T(!!gm && gm.availH < 6, `자정 이후 남은 창이 안 줄었다 (${gm && gm.availH})`);
T(!!gm && gm.gangs.reduce((a, g) => a + (g.cnt || 0), 0) < gs.gangs.reduce((a, g) => a + g.cnt, 0), '완료를 반영해도 예상이 안 줄어든다 — «일이 끝나가도 답이 같다» 재발');
// ④ voyage.completed 자동 흡수(compMap 미지정)
const vc = { ...voyage, discharge: { ...voyage.discharge, completed: comp } };
const ga = CA.buildGangShift(vc, fx.bayDef, { now: MID });
T(!!ga && ga.gangs.reduce((a, g) => a + (g.cnt || 0), 0) === gm.gangs.reduce((a, g) => a + (g.cnt || 0), 0), 'voyage.completed 자동 흡수가 compMap 과 다르다');
// ④-2 (2.62-01) 낮(주간조)에 물어도 작업 시작이 밤이면 «다가오는 야간조»로 미리 보기가 선다.
const DAY = new Date('2026-08-27T10:30:00+09:00').getTime();
const gd = CA.buildGangShift(voyage, fx.bayDef, { now: DAY });
T(!!gd && gd.shift.name === '야간조' && gd.shift.upcoming === true, `낮 미리 보기가 안 선다 (${gd && gd.shift.name})`);
T(!!gd && /다가오는 야간조/.test((CA.gangBriefLines(gd) || [''])[0]), '다가오는 조 표기가 없다');
// ④-3 (2.62-04) 입항계획 변경 반영 — 시작이 밀리면(19:00→21:00) 라벨도 21:00 을 말한다.
{
  const v21 = { ...voyage, info: { ...voyage.info, planDate: '2026-08-27 21:00 ~ 2026-08-28 21:00' } };
  const g21 = CA.buildGangShift(v21, fx.bayDef, { now: new Date('2026-08-27T19:05:00+09:00').getTime() });
  T(!!g21 && /21:00 시작/.test(g21.shift.label), `⛔ 밀린 시작(21:00)이 라벨에 없다 (${g21 && g21.shift.label}) — 계산만 맞고 말이 옛 시각(검수사 실측)`);
  T(!!g21 && g21.availH > 7.5 && g21.availH < 8.5, `21:00 시작 창 계산이 틀렸다 (${g21 && g21.availH})`);
}
// ⑤ 브리핑 줄
const bl = CA.gangBriefLines(gs);
T(Array.isArray(bl) && /^🏗 야간조/.test(bl[0]) && /갱 배분.*상세 확인/.test(bl[1]), '브리핑 줄 형식이 깨졌다');
T(/1번 갱\(01~19\)/.test(bl[0]) && /2번 갱\(21~34\)/.test(bl[0]), '브리핑 줄에 담당 구간이 없다 — 조 도달점만 쓰면 3갱처럼 읽힌다(검수사 실측)');
// ⑥ 상세 답
const ans = CA.answerGangShift(voyage, fx.bayDef, { now: NIGHT });
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
// ⑦ 소스 배선 — 세 화면 + 본체
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
T(/gangBrief\(\)/.test(read('src/pages/VoyagePage.jsx')) && /gangShift: briefCtx\?\.gangShift/.test(read('src/pages/VoyagePage.jsx')), 'VoyagePage 갱 배선이 없다');
T(/gang: _gang/.test(read('src/components/SearchPanel.jsx')) && /gangShift: \(n\)/.test(read('src/components/SearchPanel.jsx')), 'SearchPanel 갱 배선이 없다');
T(/answerGangShift\(_voy, _bayDef/.test(read('src/pages/GlobalSearchPage.jsx')), 'GlobalSearchPage 갱 분기가 없다');
const ns = read('src/nlSearch.js');
T(/gangQuery/.test(ns) && /opts\.gang/.test(ns) && /ctx\.gangShift/.test(ns), 'nlSearch 갱 배선(파싱·브리핑 줄·본체 분기)이 없다');
if (bad > 0) { console.error(`✗ 갱 배분 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 갱 배분 연막검사 통과 — 조 창·2/3갱·실시간(완료·시각)·브리핑 줄·상세·배선 3화면');
