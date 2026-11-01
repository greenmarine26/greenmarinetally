// 상황판 «철수한 호기» 판정 — 터미널 본선현황에서 남음 0인 호기는 접고 일하는 호기만 남기는지 실데이터(MCSN 642N 2026-11-01 18:28 본선현황)로 확인하는 연막검사 (4.62-03)
const path = require('path');
const B = path.join(require('os').tmpdir(), 'cranefin46203_u.cjs');
require('esbuild').buildSync({ entryPoints: [path.join(__dirname, '..', 'src', 'utils.js')], bundle: true, platform: 'node', format: 'cjs', outfile: B, logLevel: 'silent', loader: { '.js': 'jsx' } });
global.window = global.window || {}; global.document = global.document || { createElement: () => ({}) };
global.localStorage = global.localStorage || { getItem: () => null, setItem() {}, removeItem() {} };
const U = require(B);
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const AT = Date.parse('2026-11-01T18:28:51+09:00');
//  실측 MCSN 642N — 101 한 적 없음 · 102(2호기) 73대 남음 0 · 103(3호기) 남음 14 · 104(4호기) 남음 31(선적 7 끝)
const info = { termStat: { src: 'PCTC', at: AT, gc: { 101: { disRest: 0, disTot: 0, lodRest: 0, lodTot: 0 }, 102: { disRest: 0, disTot: 73, lodRest: 0, lodTot: 0 }, 103: { disRest: 14, disTot: 99, lodRest: 0, lodTot: 0 }, 104: { disRest: 31, disTot: 101, lodRest: 0, lodTot: 7 } } } };
const f = U.termFinishedCranesOf(info, AT + 60000);
ok(f && f.size === 1 && f.has(2), '남음 0 · 한 적 있음 = 2호기만 («철수»)');
ok(!f.has(1), '한 적 없는 1호기는 철수가 아니다');
const rows = [{ no: 2, done: 57, lastAt: AT - 90 * 60000 }, { no: 3, done: 115, lastAt: AT - 90 * 60000 }, { no: 4, done: 108, lastAt: AT - 90 * 60000 }];
let r = U.craneBoardSplit(rows, AT + 60000, undefined, f);
ok(r.active.map((c) => c.no).join() === '3,4', '상황판에는 3·4호기만 남는다 (' + r.active.map((c) => c.no) + ')');
ok(r.stopped.length === 1 && r.stopped[0].no === 2 && r.stopped[0].finished === true && r.stopped[0].done === 57, '2호기는 «끝 철수» 한 줄로 대수를 남긴다');
r = U.craneBoardSplit(rows.map((c) => c.no === 2 ? { ...c, src: 'live' } : c), AT + 60000, undefined, f);
ok(r.active.some((c) => c.no === 2), '앱에 검수원이 붙은 호기는 철수로 접지 않는다');
ok(U.termFinishedCranesOf(info, AT + 40 * 60000) === null, '표가 30분 넘게 낡았으면 접지 않는다');
const all = { termStat: { src: 'PCTC', at: AT, gc: { 102: { disRest: 0, disTot: 73, lodRest: 0, lodTot: 0 }, 103: { disRest: 0, disTot: 99, lodRest: 0, lodTot: 0 } } } };
ok(U.termFinishedCranesOf(all, AT) === null, '배 전체가 끝났으면(남은 호기 없음) 아무것도 접지 않는다');
ok(U.termFinishedCranesOf({ termStat: { ...info.termStat, src: 'PNCT' } }, AT) === null && U.termFinishedCranesOf({}, AT) === null && U.termFinishedCranesOf(null, AT) === null, '동방·표 없음·빈 입력은 null');
r = U.craneBoardSplit([{ no: 2, done: 57, lastAt: AT }], AT, undefined, new Set([2]));
ok(r.active.length === 1 && r.stopped.length === 0, '접고 나면 상황판이 비는 경우엔 접지 않는다');
r = U.craneBoardSplit(rows, AT + 60000);
ok(r.active.length === 3 && r.stopped.length === 0, '네 번째 인자가 없으면 종전(4.61) 그대로');
process.exit(fail ? 1 : 0);
