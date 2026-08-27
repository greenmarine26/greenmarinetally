// 2.73 시작 시각 알림 연막검사 — 말로 알린 작업 시작을 앱이 알아듣고 그 시각부터 계산하는가.
//   검수사 실측 2026-08-27 22:07: «아직 SWTD 작업시작을 안했는데 19:00부터 계산함 —
//   그래서 22:00시 부터 재계산 해달라고 함» (그 질문에서 앱이 죽었다 — 2.70-03 에서 따로 수리).
const path = require('path');
const fs = require('fs');
const U = require(path.resolve(process.argv[2]));   // utils 번들
const NL = require(path.resolve(process.argv[3]));  // nlSearch 번들
const CA = require(path.resolve(process.argv[4]));  // chiefAnswers 번들
const ROOT = process.argv[5] || process.cwd();
let bad = 0; const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };
const P = (q) => NL.parseNaturalQuery(q);

//  ── 알아듣기 ──
for (const q of ['22:00부터 재계산 해줄래?', '22시부터 재계산', '22시에 시작했어', '작업 22시 시작', '22시 시작이야']) {
  T(!!P(q).startSet, `«${q}» 를 시작 시각 알림으로 못 알아듣는다`);
}
//  ⚠ 묻는 말·다른 시각 이야기는 아니다
for (const q of ['몇 시 시작이야', '언제 시작해', '도선이 08시 30분인데 작업시간 가능한가요', '22시 도선', '22시에 리퍼 몇 대']) {
  T(!P(q).startSet, `«${q}» 를 시작 알림으로 잘못 잡는다 — 묻는 말·도선 시각까지 바꿔 버린다`);
}
T(!!P('22:00부터 재계산 해줄래?').gangQuery, '시작을 알렸는데 새 계산을 안 보여준다');

//  ── 시각 읽기(가장 가까운 ±12시간) ──
const n21 = new Date(2026, 7, 27, 21, 0).getTime();
const n02 = new Date(2026, 7, 28, 2, 15).getTime();
const hm = (ms) => (ms ? `${new Date(ms).getMonth() + 1}/${new Date(ms).getDate()} ${String(new Date(ms).getHours()).padStart(2, '0')}:${String(new Date(ms).getMinutes()).padStart(2, '0')}` : '');
T(hm(U.parseSpokenTimeMs('22:00부터 재계산', n21)) === '8/27 22:00', '21시에 말한 «22:00» 이 오늘 22시가 아니다');
T(hm(U.parseSpokenTimeMs('22시부터 재계산', n02)) === '8/27 22:00', '새벽 2시에 말한 «22시» 가 어젯밤 22시가 아니다 — 야간조가 밤새 쓴다');
T(U.parseSpokenTimeMs('재계산 해줘', n21) === 0, '시각이 없는데 아무 시각이나 만든다');

//  ── 계산이 그 시각부터인가(실데이터) ──
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/gangshift_swtd.json'), 'utf8'));
const base = { info: { ...fx.info, gangs: 2 }, discharge: { ediContainers: fx.ediContainers }, loading: {} };
const at = new Date(2026, 7, 27, 21, 0).getTime();
const g0 = CA.buildGangShift(base, fx.bayDef, { now: at, nGangs: 2 });
const g1 = CA.buildGangShift({ ...base, info: { ...base.info, workStartManual: '2026-08-27 22:00' } }, fx.bayDef, { now: at, nGangs: 2 });
T(!!g0 && !!g1, '계산이 안 선다');
T(g1.availH < g0.availH - 0.9, `말한 시작(22:00)이 창을 안 줄인다 (${g0 && g0.availH} → ${g1 && g1.availH})`);
T(/22:00 시작/.test(g1.shift.label), `조 라벨이 말한 시작을 안 쓴다 (${g1 && g1.shift.label})`);

//  ── 배선 ──
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
T(/export async function fbSetVoyageWorkStart/.test(rd('src/firebase.js')), '시작 시각 저장 함수가 없다');
T(/workStartManual: txt/.test(rd('src/firebase.js')), '수집기 workStartAt 을 덮어쓰려 한다 — 정본은 그쪽이다');
T(/workStartManual/.test(rd('src/chiefAnswers.js')), '계산이 말한 시작을 안 본다');
T(/fbSetVoyageWorkStart\(voyageKey, ms, inspector/.test(rd('src/components/SearchPanel.jsx')), '작업 시작 탭이 저장을 안 한다');
T((rd('src/pages/VoyagePage.jsx').match(/fbSetVoyageWorkStart\(voyageKey, ms, inspector/g) || []).length === 2, '양하·LOLO 탭 중 한 곳이 저장을 안 한다');
if (bad > 0) { console.error(`✗ 시작 시각 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 시작 시각 연막검사 통과 — 알아듣기 11 · 시각 3 · 계산 3 · 배선 5');
