// 4.03 터미널 본선 현황 연막검사 — 수석 실시간 보드와 콘앱 실시간 화면이 같은 함수(src/termBoard.js)로 PCTC 본선작업현황·동방 본선 작업 현황을 보이는가.
//
//  왜 있는가 — 검수사 2026-10-04 16:20 «수석대쉬보드의 실시간 작업 현황과 콘앱의 실시간 작업 현황이 검수사가 찍지 않으면 안보일 경우 PCTC의 선박별 본선 작업 현황과 동방의 선박별 본선작업 현황을 보여줄수 있게 해주세요» → 16:40 «네 그대로 해주세요».
//  기대값은 코드가 낸 값이 아니라 검수사가 보내 준 터미널 화면(PCTC 본선작업현황 2026-10-04 16:21)의 숫자다.
//   MCSC 7B  작업량 277·230·507 / 완료량 268·36·304 / 잔여량 9·194·203 / GC 잔여 101 4·150 · 102 5·90 · 103 0·0 · 104 0·0
//   SWMM 6B  작업량 223·191·414 / 완료량 174·0·174 / 잔여량 49·191·240 / GC 잔여 103 39·70 · 104 10·121
//   동방 RZOR 10-03 보관본 — QC103 90(45·45·0·0) · QC105 268(119·135·0·14), 평택 계획 양하 164 · 적하 194
//  사용: node tools/smoke_termboard403.cjs <termBoard 번들.cjs> <저장소 루트>
const fs = require('fs');
const path = require('path');
const BUNDLE = process.argv[2];
const ROOT = process.argv[3] || path.resolve(__dirname, '..');
if (!BUNDLE) { console.error('사용법: node tools/smoke_termboard403.cjs <번들.cjs> [루트]'); process.exit(1); }
const TB = require(path.resolve(BUNDLE));
const fx = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8'));
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let fail = 0;
const ok = (c, m, extra) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c || extra === undefined ? '' : '  → ' + extra)); if (!c) fail++; };
const J = (x) => JSON.stringify(x);
const kst = (s) => Date.parse(s + '+09:00');

console.log('① PCTC MCSC 638N 7B — 터미널 화면 그대로(작업량·완료량·잔여량 × 양하·적하·합계, GC별 잔여)');
const P = fx('termboard403_pctc_real.json');
const NOW = kst('2026-10-04T16:25:00');
const m = TB.termBoardOf(P.MCSC_638N, NOW);
ok(!!m && m.src === 'PCTC' && m.label === 'PCTC 7B', '꼬리표가 «PCTC 7B»', m && m.label);
ok(!!m && J(m.rows.map((r) => [r.dis, r.lod, r.sum])) === J([[277, 230, 507], [268, 36, 304], [9, 194, 203]]), '작업량·완료량·잔여량이 터미널 화면과 같다', m && J(m.rows));
ok(!!m && J(m.rows.map((r) => r.label)) === J(['작업량', '완료량', '잔여량']), '줄 이름 작업량·완료량·잔여량');
ok(!!m && m.total === 507 && m.done === 304 && m.rest === 203 && m.pct === 60, '진행 막대 완료 304 / 507 · 60%', m && `${m.done}/${m.total} ${m.pct}`);
ok(!!m && J(m.gc.map((g) => [g.gc, g.dis, g.lod, g.sum])) === J([['101', 4, 150, 154], ['102', 5, 90, 95], ['103', 0, 0, 0], ['104', 0, 0, 0]]), 'GC별 잔여량이 터미널 화면과 같다(103·104 는 0)', m && J(m.gc));
ok(!!m && m.atText === '16:22' && m.startText === '08:05' && m.etdText === '23:00', '받은 시각 16:22 · 작업시작 08:05 · 출항예정 23:00(오늘이라 날짜 없음)', m && J([m.atText, m.startText, m.etdText]));
ok(TB.termBoardOf(P.MCSC_638N, kst('2026-10-05T09:00:00')).atText === '10-04 16:22', '받은 시각이 어제면 «10-04 16:22» 처럼 날짜가 붙는다(오늘 자료로 보이지 않게)');
ok(!!m && m.stale === false && m.overPlan === false, '낡은 자료도 계획 초과도 아니다');
//  gc.*Tot 은 뜻이 확인되지 않아 칸으로 쓰지 않는다 — Tot 을 마구 바꿔도 보이는 숫자가 그대로여야 한다.
{
  const c = JSON.parse(JSON.stringify(P.MCSC_638N));
  for (const k of Object.keys(c.termStat.gc)) { c.termStat.gc[k].disTot = (c.termStat.gc[k].disTot ? 999 : 0); c.termStat.gc[k].lodTot = (c.termStat.gc[k].lodTot ? 777 : 0); }
  const m2 = TB.termBoardOf(c, NOW);
  ok(J(m2.gc) === J(m.gc), 'gc.*Tot 값이 바뀌어도 GC 칸 숫자는 그대로(Tot 을 칸으로 쓰지 않는다)');
}
ok(!!m && m.rows.every((r) => r.sum === r.dis + r.lod), '합계 칸 = 양하 + 적하');

console.log('② PCTC SWMM 2609N 6B — 적하가 아직 0 · GC101·102 는 이 배 일이 아니라 줄이 없다 · 출항이 내일이면 날짜가 붙는다');
const w = TB.termBoardOf(P.SWMM_2609N, NOW);
ok(!!w && w.label === 'PCTC 6B', '꼬리표 «PCTC 6B»', w && w.label);
ok(!!w && J(w.rows.map((r) => [r.dis, r.lod, r.sum])) === J([[223, 191, 414], [174, 0, 174], [49, 191, 240]]), '작업량·완료량·잔여량이 터미널 화면과 같다', w && J(w.rows));
ok(!!w && J(w.gc.map((g) => [g.gc, g.dis, g.lod, g.sum])) === J([['103', 39, 70, 109], ['104', 10, 121, 131]]), 'GC별 잔여는 103·104 만(모두 0 인 101·102 줄은 없다)', w && J(w.gc));
ok(!!w && w.etdText === '10-05 00:00' && w.startText === '13:00', '출항예정은 내일이라 «10-05 00:00» · 작업시작 13:00', w && J([w.etdText, w.startText]));
ok(!!w && w.pct === 42, '진행 막대 42%', w && w.pct);

console.log('③ 낡은 자료 — PCTC 는 받은 시각이 있고, 잔여가 남았는데 3시간 넘게 안 오면 «낡은 자료»');
{
  const at = P.MCSC_638N.termStat.at;
  ok(TB.termBoardOf(P.MCSC_638N, at + 2 * 3600 * 1000).stale === false, '2시간 지남 — 낡은 자료 아님');
  ok(TB.termBoardOf(P.MCSC_638N, at + 3 * 3600 * 1000 + 60000).stale === true, '3시간 1분 지남 — 낡은 자료');
  const done = JSON.parse(JSON.stringify(P.MCSC_638N)); done.termStat.dis.rest = 0; done.termStat.lod.rest = 0;
  ok(TB.termBoardOf(done, at + 9 * 3600 * 1000).stale === false, '잔여가 0(끝난 배)이면 오래돼도 낡았다고 하지 않는다');
  ok(/낡은 자료/.test(TB.termBoardHtml(P.MCSC_638N, at + 4 * 3600 * 1000)) && !/낡은 자료/.test(TB.termBoardHtml(P.MCSC_638N, NOW)), '꼬리표 «낡은 자료» 는 낡았을 때만 그려진다');
}

console.log('④ 동방 RZOR 10-03 보관본 — QC별 총작업량·완료·잔여(받은 시각 없음)');
const R = fx('termeta_rzor.json');
const NOW_R = kst('2026-10-03T12:00:00');
const r = TB.termBoardOf(R, NOW_R);
ok(!!r && r.src === 'PNCT' && r.label === '동방 14번선석', '꼬리표 «동방 14번선석»', r && r.label);
ok(!!r && J(r.qc.map((q) => [q.qc, q.total, q.disDone, q.lodDone, q.disRest, q.lodRest])) === J([['QC103', 90, 45, 45, 0, 0], ['QC105', 268, 119, 135, 0, 14]]), 'QC103·QC105 줄이 동방 화면 그대로', r && J(r.qc));
ok(!!r && J(r.qcSum) === J({ total: 358, disDone: 164, lodDone: 180, disRest: 0, lodRest: 14 }), '합계 줄', r && J(r.qcSum));
ok(!!r && r.atText === '' && r.at === 0 && r.stale === false, '받은 시각이 없다 — 낡았다고 말하지 않는다');
ok(!!r && r.startText === '07:15' && r.planDis === 164 && r.planLod === 194, '작업시작 07:15 · 평택 계획 양하 164 · 적하 194', r && J([r.startText, r.planDis, r.planLod]));
ok(!!r && r.overPlan === false, '합이 평택 계획과 같아 «계획보다 큼» 이 붙지 않는다');
{
  const big = JSON.parse(JSON.stringify(R)); big.planDis = 100;   // 양하 합 164 > 100 × 1.05
  ok(TB.termBoardOf(big, NOW_R).overPlan === true && /계획보다 큼, 타 항 하역분 포함 가능/.test(TB.termBoardHtml(big, NOW_R)), '평택 계획보다 5% 넘게 크면 «계획보다 큼, 타 항 하역분 포함 가능»');
  const edge = JSON.parse(JSON.stringify(R)); edge.planDis = 157;   // 164 ≤ 157 × 1.05 = 164.85 → 아직 아님
  ok(TB.termBoardOf(edge, NOW_R).overPlan === false, '5% 이내(164 ≤ 157×1.05)는 붙지 않는다');
  const none = JSON.parse(JSON.stringify(R)); delete none.planDis; delete none.planLod;
  ok(TB.termBoardOf(none, NOW_R).overPlan === false && !/평택 계획/.test(TB.termBoardHtml(none, NOW_R)), '평택 계획을 모르면 비교도 안내도 하지 않는다');
  ok(TB.termBoardOf(R, kst('2026-10-04T09:00:00')).startText === '10-03 07:15', '다른 날이면 작업시작에 날짜가 붙는다');
}

console.log('⑤ 보일 것이 없으면 null — 종전 화면 그대로 둔다');
ok(TB.termBoardOf(null, NOW) === null && TB.termBoardOf({}, NOW) === null && TB.termBoardOf('x', NOW) === null, '자료 없음·빈 info·잘못된 값');
ok(TB.termBoardOf({ termStat: { dis: { tot: 0, done: 0, rest: 0 }, lod: { tot: 0, done: 0, rest: 0 }, at: NOW } }, NOW) === null, 'PCTC 작업량이 0 이면 표를 안 낸다');
ok(TB.termBoardOf({ qcWork: {} }, NOW) === null, '동방 QC 가 하나도 없으면 표를 안 낸다');
ok(TB.termBoardOf({ qcWork: { QC101: { qc: 'QC101', total: 0, disDone: 0, disRest: 0, lodDone: 0, lodRest: 0 } } }, NOW) === null, '동방 QC 숫자가 전부 0 이면 표를 안 낸다');
ok(TB.termBoardHtml({}, NOW) === '' && TB.termBoardHtml(null, NOW) === '', '표가 없으면 HTML 도 빈 문자열');
ok(TB.termBoardOf({ termStat: { dis: { tot: -5, done: 'x', rest: null }, lod: { tot: 10, done: 4, rest: 6 }, at: NOW } }, NOW).rows[0].dis === 0, '음수·글자 숫자는 0 으로 읽는다');

console.log('⑥ 그려진 HTML — 두 앱이 같은 문자열을 쓴다(꼬리표 «검수원 입력 아님» · 표 머리글 · 글자 막기)');
const hp = TB.termBoardHtml(P.MCSC_638N, NOW), hn = TB.termBoardHtml(R, NOW_R);
ok(/터미널 본선 현황/.test(hp) && /검수원 입력 아님/.test(hp) && /PCTC 7B/.test(hp), 'PCTC 표 머리 — 터미널 본선 현황 · PCTC 7B · 검수원 입력 아님');
ok(/16:22 기준 · 작업시작 08:05 · 출항예정 23:00/.test(hp) && /완료 304 \/ 507/.test(hp) && /60%/.test(hp), 'PCTC 메타 줄과 진행 막대');
ok(/<th><\/th><th>양하<\/th><th>적하<\/th><th>합계<\/th>/.test(hp) && /<td>작업량<\/td><td>277<\/td><td>230<\/td><td>507<\/td>/.test(hp) && /<td>잔여량<\/td><td>9<\/td><td>194<\/td><td>203<\/td>/.test(hp), '작업량·잔여량 줄이 그대로 표에 들어간다');
ok(/GC별 잔여/.test(hp) && /<td>GC101<\/td><td>4<\/td><td>150<\/td><td>154<\/td>/.test(hp), 'GC별 잔여 표');
ok(/터미널 본선 현황/.test(hn) && /동방 14번선석/.test(hn) && /받은 시각 표시 없음/.test(hn) && /작업시작 07:15/.test(hn), '동방 표 머리와 메타 줄');
ok(/<th>QC<\/th><th>총작업량<\/th><th>완료 양하<\/th><th>완료 적하<\/th><th>잔여 양하<\/th><th>잔여 적하<\/th>/.test(hn) && /<td>QC105<\/td><td>268<\/td><td>119<\/td><td>135<\/td>/.test(hn) && /<td>합계<\/td><td>358<\/td><td>164<\/td>/.test(hn), '동방 QC 표와 합계 줄');
ok(/평택 계획 양하 164 · 적하 194/.test(hn), '동방 평택 계획 안내');
ok(!/Tot/.test(hp + hn), '표에 «Tot» 칸이 없다');
{
  const evil = JSON.parse(JSON.stringify(P.MCSC_638N)); evil.termStat.berth = '<img src=x onerror=alert(1)>';
  const he = TB.termBoardHtml(evil, NOW);
  ok(!/<img/.test(he) && /&lt;img/.test(he), '꼬리표 글자는 HTML 로 해석되지 않게 막는다');
}
ok(/\.tbx\{/.test(TB.TERM_BOARD_CSS) && typeof TB.ensureTermBoardCss === 'function', '표 CSS 와 한 번만 넣는 함수가 있다');
{
  const els = {}; const d = { head: { appendChild: (e) => { els[e.id] = e; } }, getElementById: (i) => els[i] || null, createElement: () => ({}) };
  TB.ensureTermBoardCss(d); TB.ensureTermBoardCss(d);
  ok(Object.keys(els).length === 1 && els.tbxCss && /tbx/.test(els.tbxCss.textContent), '<style id=tbxCss> 는 두 번 불러도 한 번만 들어간다');
}

console.log('⑦ 배선 — 수석 보드·콘앱·미르 번들·매뉴얼·버전');
const CD = rd('src/pages/ChiefDashboard.jsx'), CONE = rd('public/cone.html'), ENTRY = rd('src/mirCore.entry.js'), U = rd('src/utils.js');
ok(/import TermBoardPanel, \{ hasTermBoard \} from '\.\.\/components\/TermBoardPanel\.jsx'/.test(CD), '수석 보드가 TermBoardPanel 을 쓴다');
ok(/const _canDraw = \(c\) => !!\(c\.bay && \/\\d\/\.test\(String\(c\.bay\)\) && voyage\)/.test(CD) && /const _termOnly = \(!cranes\.some\(_canDraw\) \|\| _appStale\) && hasTermBoard\(voyage\?\.info\)/.test(CD), '수석: 호기 그림을 하나도 못 그릴 때(또는 4.05 앱 입력이 30분 넘게 멈췄을 때)만 표를 낸다(접혀 안 보이는 호기까지 본다 — 그려지는 배는 종전 그대로)');
ok(/openBtn\(_termOnly && boxes\.length === 0 \? 0 : more\)/.test(CD), '수석: 표가 호기 칸을 대신하면 «+N칸 더» 단추가 서지 않는다(펼칠 것이 없다)');
ok(/termBlock \? null : <div className="text-2xs text-dim-500">호기별 실적이 아직 없습니다/.test(CD), '수석: 표가 없을 때만 종전 안내 한 줄이 남는다');
ok(/boxes = _appStale \? \[\] : _termOnly \? shown\.filter\(\(c\) => !\(c\.qc && !_canDraw\(c\)\)\) : shown/.test(CD), '수석: 표가 뜰 때 동방 «완료 기록이 와야 그림이 뜹니다» 칸(같은 숫자)만 걷고 나머지는 그대로');
ok(/termBoardHtml/.test(rd('src/components/TermBoardPanel.jsx')) && /termBoardHtml\(CT\.tb, Date\.now\(\)\)|M\.termBoardHtml\(CT\.tb/.test(CONE), '수석과 콘앱이 같은 termBoardHtml 을 부른다');
ok(/export \{ termBoardOf, termBoardHtml, ensureTermBoardCss \} from '\.\/termBoard\.js'/.test(ENTRY), '미르 번들(mir-core)이 표 함수를 내보낸다 — 콘앱은 이것을 쓴다');
ok(/const _tb = TW\.wait \? '' : ctTermBoardHtml\(\);/.test(CONE) && /\$\{_tb\}<\/div>`;/.test(CONE), '콘앱 실시간 화면: 안내 아래에 표가 붙는다(자료 받는 중에는 안 붙는다)');
ok(/\$\{ctTermBoardHtml\(\)\}`;/.test(CONE), '콘앱 콘 타이밍 카드 빈 칸에도 같은 표가 붙는다');
ok(/ctGet\(`\$\{base\}\/info\.json`, true\)/.test(CONE) && /CT\.tb = \(_infAll && typeof _infAll==='object'\) \? _infAll : null;/.test(CONE), '콘앱: info 읽기 1건 — 항차 info 통째를 CT.tb 로');
ok(/CT\.tb = null; CT\.tbAt = 0; CT\._tbWait = false;/.test(CONE), '콘앱: 배를 바꾸면 앞 배의 터미널 현황을 지운다');
{
  const i = CONE.indexOf('async function ctFetch()'), j = CONE.indexOf('function ctVirtualApply', i);
  const body = CONE.slice(i, j);
  ok(i > 0 && j > i && !/method\s*:\s*['"](PUT|PATCH|POST|DELETE)/i.test(body) && !/ctPut|fbPut|fbPatch/.test(body), '콘앱 ctFetch 에는 쓰기가 없다(읽기만)');
}
ok(/if\(!M\.termBoardHtml\) return '';/.test(CONE), '콘앱: 옛 번들이 남아 함수가 없으면 조용히 빈 칸(무한 다시 그리기 없음)');
ok(/\.tw-empty\.tw-has-tb\{[^}]*touch-action:pan-y/.test(CONE) && /\.tw-empty \.tbx\{/.test(CONE), '콘앱 CSS: 표가 붙으면 위에서부터 쌓고 넘치면 민다(세로 밀기를 허용)');
ok(/e\.target\.closest && e\.target\.closest\('\.tbx'\)\)\{ x0=null; return; \}/.test(CONE), '콘앱: 표 위의 손짓은 호기·배 넘기기로 읽지 않는다');
ok(/\.tbx-tw\{[^}]*touch-action:pan-x pan-y/.test(TB.TERM_BOARD_CSS), '표 CSS: 가로로 넘치는 표를 밀어 볼 수 있다');
ok(!/catch\(e\)\{\s*\}/.test(CONE.slice(CONE.indexOf('function ctTermBoardHtml'), CONE.indexOf('function twDraw'))), '콘앱 ctTermBoardHtml 안에 조용한 빈 catch 가 없다');
ok(/CT\.err = '자료를 못 받았습니다[^\n]*\n\s*if\(CT\.tb && \(!CT\.tbAt \|\| Date\.now\(\)-CT\.tbAt > 300000\)\) CT\.tb = null;/.test(CONE), '콘앱: 전부 못 받는 사이클에도 오래된 표를 5분 넘게 두지 않는다');
ok(/if\(_infAll === undefined\)\{ if\(!CT\.tbAt \|\| Date\.now\(\)-CT\.tbAt > 300000\) CT\.tb = null; \}/.test(CONE), '콘앱: info 를 못 읽은 사이클은 앞 표를 5분까지만 둔다');
ok(/window\.__CONEV='ConeOne 2\.6[12](-\d\d)?'/.test(CONE) && /APP_VERSION = 'TallyOne 4\.0[3456](-\d\d)?'/.test(U), '버전 ConeOne 2.61~2.62(-NN) · TallyOne 4.03~4.06(-NN)');   // 4.04-01: 버그 수리판은 -NN 이 붙는다
{
  const note = (U.match(/APP_NOTE = '([^']*)'/) || [])[1] || '';
  ok(/^4\.0[3456](-\d\d)? (터미널 본선 현황|RZOR 카고플랜|RZOR X-RAY 선내위치|RZOR 선내위치|항차 목록|미르가 작업은|미르가 작업 중 앱 입력이)/.test(note) && !/[\/']/.test(note) && (note.match(/[.]/g) || []).length <= 3, 'APP_NOTE 는 4.03~4.06 · 작은따옴표와 슬래시가 없다 · 짧은 문장', note);
}
ok(/터미널 본선 현황/.test(rd('src/data/helpDataChief.js')) && /터미널 본선 현황/.test(rd('src/data/helpData.js')) && /터미널 본선 현황/.test(rd('src/data/featureIndex.js')), '매뉴얼(수석·검수원)과 기능 색인이 이 화면을 말한다');
ok(/export function termProgressOf/.test(rd('src/nlSearch.js')) && !/termBoard/.test(rd('src/nlSearch.js')), '미르 «언제 끝나» 계산(termProgressOf)은 건드리지 않았다');

console.log(fail ? `\n✗ ${fail}건 실패` : '\n✓ 4.03 터미널 본선 현황 연막검사 전부 통과');
process.exit(fail ? 1 : 0);
