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
{ const body = (rd('src/firebase.js').split('export async function fbSetVoyageWorkStart')[1] || '').split('\nexport ')[0];
  T(/workStartManual:/.test(body), '말한 시작을 저장하지 않는다');
  T(!/workStartAt/.test(body), '수집기 workStartAt(터미널 정본)을 덮어쓰려 한다 — 금지'); }
T(/workStartManual/.test(rd('src/chiefAnswers.js')), '계산이 말한 시작을 안 본다');
T(/fbSetVoyageWorkStart\(voyageKey, ms, inspector/.test(rd('src/components/SearchPanel.jsx')), '작업 시작 탭이 저장을 안 한다');
T((rd('src/pages/VoyagePage.jsx').match(/fbSetVoyageWorkStart\(voyageKey, ms, inspector/g) || []).length === 2, '양하·LOLO 탭 중 한 곳이 저장을 안 한다');

//  ══ 2.74 호기별 시작 시각 ══════════════════════════════════════════════
//   검수사 실측 2026-08-28: «미르야 2호기는 23:15 3호기는 23:20 4호기는 23:25 에 시작했어»
//   — 2.73 은 23:15 하나만 먹고 뒤의 둘을 조용히 버렸고, 호기를 셋 댔는데도 «몇 갱?» 을 되물었다.
{
  const n2340 = new Date(2026, 7, 27, 23, 40).getTime();
  const say = '미르야 2호기는 23:15 3호기는 23:20 4호기는 23:25 에 시작했어';
  const cr = U.parseCraneStarts(say, n2340);
  T(cr.length === 3, `호기 셋을 말했는데 ${cr.length} 개만 읽었다 — 말한 것을 버리면 안 된다`);
  T(cr.map((c) => c.no).join(',') === '2,3,4', '호기 번호가 오름차순이 아니다');
  T(hm(cr[0].ms) === '8/27 23:15' && hm(cr[2].ms) === '8/27 23:25', '호기별 시각을 잘못 읽었다');
  T(U.parseCraneStarts('2호기 리퍼 몇 대야', n2340).length === 0, '호기만 있고 시각이 없는데 시각을 만든다');
  T(U.parseCraneStarts('3호기 23:15 3호기 23:40', n2340).length === 1, '같은 호기를 두 번 말하면 한 벌이어야 한다(고쳐 말한 것)');

  const ss = P(say).startSet;
  T(!!ss && (ss.cranes || []).length === 3, '호기별 말투를 시작 알림으로 못 알아듣는다');
  T(!!P(say).gangQuery, '호기별 시작을 알렸는데 새 계산을 안 보여준다');
  T(!P('2호기 리퍼 몇 대야').startSet, '조회 질문을 시작 알림으로 잘못 잡는다');
  T(!P('4호기 몇 시 시작이야').startSet, '묻는 말을 설정으로 바꾼다');
  T(!P('도선이 2호기 앞 08시 30분').startSet, '도선 시각 이야기를 작업 시작으로 잡는다');

  //  계산 — 갱마다 제 창, 갱 수는 되묻지 않는다
  const inf = { ...fx.info, craneStart: { 2: '2026-08-27 23:15', 3: '2026-08-27 23:20', 4: '2026-08-27 23:25' } };
  delete inf.gangs;
  const v = { info: inf, discharge: { ediContainers: fx.ediContainers }, loading: {} };
  const g = CA.buildGangShift(v, fx.bayDef, { now: n2340 });
  T(!!g && !g.askGangs, '호기를 셋 댔는데도 몇 갱이냐고 되묻는다');
  T(g && g.nGangs === 3, `호기 셋 = 3갱이어야 하는데 ${g && g.nGangs}갱으로 셌다`);
  T(g && (g.gangs || []).map((x) => x.equip).join(',') === '2,3,4', '갱에 호기가 안 붙었다(호기 오름차순 = 갱 오름차순)');
  //  ⚠ 이미 셋 다 시작한 뒤(23:40)라면 **남은 시간은 셋이 같다** — 남은 창은 지금부터 조 끝까지다.
  //    호기별 시각이 창을 가르는 것은 아직 안 붙은 호기가 있을 때다(아래 23:00 판정).
  const a = (g.gangs || []).map((x) => x.availH);
  T(a[0] === a[1] && a[1] === a[2], `셋 다 시작한 뒤인데 남은 창이 갈렸다 (${a.join(' / ')})`);
  const gPre = CA.buildGangShift(v, fx.bayDef, { now: new Date(2026, 7, 27, 23, 0).getTime() });
  const b = (gPre.gangs || []).map((x) => x.availH);
  T(b[0] > b[1] && b[1] > b[2], `아직 안 붙은 호기는 창이 더 짧아야 한다 (${b.map((x) => x && x.toFixed(2)).join(' / ')})`);
  T(Math.abs((b[0] - b[2]) - (10 / 60)) < 0.02, `2호기와 4호기 창 차이는 10분이어야 한다 (${b[0] - b[2]})`);
  T(Math.abs(b[0] - (gPre.availH)) < 0.001, '첫 호기 창이 조 전체 창과 달라졌다 — 가장 이른 시작이 기준이다');

  //  ★ 근거 — 4호기(가장 큰 호기)가 가장 큰 베이 구간이다(SWTD 앱 실기록 B30~34 144대).
  const last = g.gangs[g.gangs.length - 1];
  T(last.equip === 4 && last.toBay >= g.gangs[0].toBay, '4호기가 선미(큰 베이) 구간이 아니다 — 앱 실기록과 어긋난다');

  //  말도 호기로 한다
  const txt = CA.answerGangShift(v, fx.bayDef, { now: n2340 }) || '';
  T(/4호기/.test(txt), '답이 갱을 호기로 안 부른다 — 검수사도 완료 기록도 호기로 부른다');
  T(!/창이 다릅니다/.test(txt), '셋 다 붙은 뒤인데 창이 다르다고 말한다 — 같은 수를 늘어놓는 소음');
  T(/2호기·3호기·4호기 시작을 알려 주셔서 3갱/.test(txt), '3갱이 어디서 온 수인지 안 밝힌다');
  const txtPre = CA.answerGangShift(v, fx.bayDef, { now: new Date(2026, 7, 27, 23, 0).getTime() }) || '';
  T(/창이 다릅니다/.test(txtPre), '아직 안 붙은 호기가 있는데 창이 같다고 말한다');
  T(!/기본 2갱 기준/.test(txt), '호기로 정한 갱 수인데 «기본 2갱» 이라고 말한다');
  const br = (CA.gangBriefLines(g) || []).join('\n');
  T(/2호기/.test(br) && /4호기/.test(br), '브리핑 줄이 갱을 호기로 안 부른다');

  //  ⚠ 어젯밤 호기 시각이 오늘 주간조 갱 수를 정하면 안 된다(조마다 다르다 — 2.69)
  const day = CA.buildGangShift(v, fx.bayDef, { now: new Date(2026, 7, 28, 9, 0).getTime() });
  T(!!day && day.askGangs === true, '지난 조 호기 시각이 다음 조 갱 수를 조용히 정한다');

  //  ⚠ 호기 수와 갱 수가 다르면 짝을 안 짓는다(엉뚱한 호기 이름 금지)
  const g2 = CA.buildGangShift(v, fx.bayDef, { now: n2340, nGangs: 2 });
  T(!!g2 && (g2.gangs || []).every((x) => !x.equip), '호기 수와 갱 수가 다른데 호기 이름을 붙인다');
}

//  ── 배선(세 화면 한 벌) ──
T(/fbSetVoyageWorkStart\(voyageKey, ms, inspector \|\| '', cr\)/.test(rd('src/components/SearchPanel.jsx')), '통합검색이 호기 목록을 안 넘긴다');
T((rd('src/pages/VoyagePage.jsx').match(/fbSetVoyageWorkStart\(voyageKey, ms, inspector \|\| '', cr\)/g) || []).length === 2, '양하·선적 탭 두 곳이 호기 목록을 안 넘긴다');
T(/patch\.craneStart = cs/.test(rd('src/firebase.js')), '호기별 시작을 저장하지 않는다');
T(/craneStart/.test(rd('src/chiefAnswers.js')), '계산이 호기별 시작을 안 본다');

if (bad > 0) { console.error(`✗ 시작 시각 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 시작 시각 연막검사 통과 — 알아듣기 11 · 시각 3 · 계산 3 · 배선 5 · 호기별 25');
