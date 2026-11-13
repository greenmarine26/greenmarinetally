// 5.01 «나 오늘» 연막검사 — 실데이터(2026-11-13 RTDB GET 사본)로 잰다.
//  왜 있는가 — 검수사 2026-11-13 «나 오늘 39대» — 아침에 한 PCSZ 2634E(양하 59·선적 37)가 14:31 보관소로 넘어가며 헤더에서 빠졌다.
//  기대(검수사 확정 21:09) — PCSZ 96 · STMJ 39 · 합 135 · 양하 98 · 선적 37. 진행 중만 읽으면 39(옛 오류 재현).
//  사용: node tools/smoke_mytoday501.cjs <smoke_mytoday501_entry 번들.cjs> <저장소 루트>
const fs = require('fs');
const path = require('path');
const BUNDLE = process.argv[2];
const ROOT = process.argv[3] || path.resolve(__dirname, '..');
if (!BUNDLE) { console.error('사용법: node tools/smoke_mytoday501.cjs <번들.cjs> [루트]'); process.exit(1); }
global.window = global.window || {};
global.document = global.document || { createElement: () => ({}) };
const M = require(path.resolve(BUNDLE));
let pass = 0, fail = 0;
const ok = (c, m, extra) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c || extra === undefined ? '' : '  → ' + extra)); if (c) pass++; else fail++; };
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'mytoday501_real.json'), 'utf8'));
const NOW = fx.now, T0 = fx.t0, ME = '김성일';
const all = fx.voyages;                                   // PCSZ(보관소) + STMJ·OBWH(진행 중)
const liveOnly = { STMJ_2671E: all.STMJ_2671E, OBWH_2791E: all.OBWH_2791E };

console.log('5.01 «나 오늘» — 오늘 보관소로 넘어간 배까지 합친다');
const old = M.computeMyToday(liveOnly, ME, NOW);
ok(old.count === 39, '옛 입력(진행 중만) — 39대로 굳는다(오류 재현)', old.count);
const me = M.computeMyToday(all, ME, NOW);
ok(me.count === 135, '보관소 포함 — 오늘 총 135대', me.count);
const by = Object.fromEntries((me.ships || []).map((o) => [o.key, o]));
ok(by.PCSZ_2634E && by.PCSZ_2634E.dis === 59 && by.PCSZ_2634E.lod === 37, 'PCSZ 2634E — 양하 59 · 선적 37', JSON.stringify(by.PCSZ_2634E));
ok(by.PCSZ_2634E && by.PCSZ_2634E.dis + by.PCSZ_2634E.lod === 96, 'PCSZ 2634E — 96대(검수사 확정)');
ok(by.STMJ_2671E && by.STMJ_2671E.dis === 39 && by.STMJ_2671E.lod === 0, 'STMJ 2671E — 양하 39 · 선적 0', JSON.stringify(by.STMJ_2671E));
ok(!by.OBWH_2791E, '내 기록이 없는 배(OBWH 2791E)는 줄에 안 나온다');
const sum = (me.ships || []).reduce((a, o) => a + o.dis + o.lod, 0);
ok(sum === me.count, '배별 합 = 헤더 총 대수(두 숫자가 어긋나지 않는다)', `${sum} vs ${me.count}`);
ok((me.ships || []).reduce((a, o) => a + o.dis, 0) === 98 && (me.ships || []).reduce((a, o) => a + o.lod, 0) === 37, '합계 양하 98 · 선적 37');
ok(by.PCSZ_2634E && by.PCSZ_2634E.equips.join() === '3호기' && by.STMJ_2671E.equips.join() === '2호기', '호기 — PCSZ 3호기 · STMJ 2호기', JSON.stringify([by.PCSZ_2634E && by.PCSZ_2634E.equips, by.STMJ_2671E && by.STMJ_2671E.equips]));
ok(me.ships[0].key === 'PCSZ_2634E', '오늘 먼저 한 배(PCSZ 아침)가 위에 선다');
ok(by.PCSZ_2634E && by.PCSZ_2634E.firstAt >= T0 && by.PCSZ_2634E.lastAt <= NOW, '시각은 오늘 자정~지금 안');

console.log('경계 — 이름·날짜·키 겹침');
const other = M.computeMyToday(all, '류청호', NOW);
ok(other.count === 0 || !(other.ships || []).some((o) => o.key === 'PCSZ_2634E' && o.dis + o.lod === 96), '다른 사람 이름으로는 내 96대가 안 잡힌다', other.count);
const yday = M.computeMyToday(all, ME, T0 - 1);
ok(yday.count === 0, '어제 시각 기준이면 오늘 기록은 0');
const dup = M.computeMyToday({ ...all, PCSZ_2634E: { ...all.PCSZ_2634E } }, ME, NOW);
ok(dup.count === 135, '같은 키를 두 번 넣어도 이중으로 세지 않는다(복원된 항차)', dup.count);
ok(M.computeMyToday(all, '', NOW) === null, '이름 없으면 null(종전대로)');
ok(Array.isArray(M.myTodayByShip(null, ME, T0, NOW)) && M.myTodayByShip(null, ME, T0, NOW).length === 0, '항차가 null 이어도 던지지 않는다');

console.log('시간당 — 분자도 그 배 기록만');
const _both = M.computeMyToday(all, ME, NOW), _pcszOnly = M.computeMyToday({ PCSZ_2634E: all.PCSZ_2634E }, ME, NOW);
ok(_both.perHour === _pcszOnly.perHour, '두 배를 뛴 날 시간당 = 기록 많은 배(PCSZ) 혼자일 때와 같다(135건으로 부풀지 않는다)', _both.perHour + ' vs ' + _pcszOnly.perHour);

console.log('소스 — 화면·읽기 연결');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const home = rd('src/pages/HomePage.jsx'), fb = rd('src/firebase.js');
ok(/fbGetMyArchivedToday\(/.test(home) && /_meVoyages/.test(home) && /computeMyToday\(_meVoyages/.test(home), '홈이 보관소 읽기를 합쳐 부른다');
ok(/data-home-me-ships/.test(home) && /양하 <b/.test(home) && /선적 <b/.test(home), '세분화 줄(양하·선적)이 그려진다');
ok(/data-home-me-warn/.test(home), '못 읽으면 화면에 밝힌다(조용한 실패 금지)');
ok(/data-home-me-chipwarn/.test(home), '접힌 칩에도 ⚠ 가 붙는다(펴야만 보이면 조용한 실패)');
ok(/setArchMe\(\(prev\)/.test(home) && /\.\.\.\(prev\.voyages/.test(home), '읽기 실패 때 앞서 읽은 항차를 지우지 않는다');
const seg = fb.slice(fb.indexOf('export async function fbGetMyArchivedToday'), fb.indexOf('M7.18b: 1년 경과'));
ok(/tally_pending\.json/.test(seg) && !/shallow/.test(seg) && !/archive\.json/.test(seg), '보관소 전체를 훑지 않는다(색인 노드 + 오늘 넘어간 항차만)');
ok((seg.match(/fetch\(/g) || []).length === (seg.match(/tmoSignal\(/g) || []).length, '외부 요청마다 제한 시간이 달렸다');
ok(!/catch\s*\([^)]*\)\s*\{\s*\}/.test(seg), '빈 catch 없음');
ok(/^5\.(0[1-9]|[1-9]\d)(-\d\d)? /.test(M.APP_NOTE) && !/['\/]/.test(M.APP_NOTE.slice(0)) , 'APP_NOTE — 5.01 · 작은따옴표·슬래시 없음', M.APP_NOTE);
ok(/^TallyOne 5\.(0[1-9]|[1-9]\d)(-\d\d)?$/.test(M.APP_VERSION), '판 문자열 5.01', M.APP_VERSION);

console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
