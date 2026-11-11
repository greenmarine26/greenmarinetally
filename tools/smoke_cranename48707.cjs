// 4.87-07 연막검사 — 수석 상황판 호기 이름은 지금 로그인한 사람만(로그아웃하면 그 즉시 빠진다). 실 OBWH 2789E 완료 기록(2026-11-11 18:57)으로 본다. 실행 — node tools/smoke_cranename48707.cjs <저장소 루트>
const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
const root = path.resolve(process.argv[2] || process.cwd());
global.window = { addEventListener() {}, dispatchEvent() { return true; } };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
let n = 0, bad = 0; const ok = (c, m, d = '') => { n++; console.log((c ? '  ✓ ' : '  ✗ ') + m + (c || !d ? '' : ' — ' + d)); if (!c) bad++; };
(async () => {
  const U = await import(pathToFileURL(path.join(root, 'src/utils.js')).href);
  const fx = JSON.parse(fs.readFileSync(path.join(root, 'tools/fixtures/cranename48707.json'), 'utf8')).OBWH_2789E;
  const V = { info: { vsl: 'OBWH', voy: '2789E', pier: 'PCTC' }, discharge: { completed: fx.discharge }, loading: { completed: fx.loading } };
  const NOW = new Date('2026-11-11T18:57:00+09:00').getTime();
  const names = (rows) => Object.fromEntries(rows.map((c) => [c.no, c.name || (c.nameGone ? `(없음←${c.nameGone})` : '(미등록)')]));
  const board = (roster, workers = []) => U.craneBoardOf(V, workers, null, NOW, roster ? { roster } : null);
  const old = names(board(null));
  ok(old[1] === '이형출' && old[2] === '이형출', 'roster 를 안 주면 종전 그대로 — 마지막으로 찍은 사람(1·2호기 모두 이형출)', JSON.stringify(old));
  //  18:57 실제 — 이형출 로그아웃(등록 1호기) · 박진우 로그인(호기 미등록)
  let r = names(board({ 이형출: { loggedIn: false, here: true, no: 1 }, 박진우: { loggedIn: true, here: true, no: 0 } }));
  ok(r[1] === '(없음←이형출)' && r[2] === '(없음←이형출)', '로그아웃한 이형출은 1·2호기 어디에도 이름이 없다(검수사 «로그아웃 즉시 작업지 명단에서 사라져야 합니다»)', JSON.stringify(r));
  //  이형출이 로그인해 있다면 — 1호기에만(마지막 입력이 1호기 · 등록도 1호기), 2호기는 옮겨 간 흔적이라 없음
  r = names(board({ 이형출: { loggedIn: true, here: true, no: 1 } }));
  ok(r[1] === '이형출' && r[2] === '(없음←이형출)', '로그인해 있어도 다른 호기로 옮긴 사람은 옛 호기(2호기)에서 내린다', JSON.stringify(r));
  r = names(board({ 이형출: { loggedIn: true, here: true, no: 0 } }));
  ok(r[1] === '이형출' && r[2] === '(없음←이형출)', '호기 등록이 없어도 마지막으로 찍은 호기(1호기)에만 이름이 붙는다', JSON.stringify(r));
  r = names(board({ 이형출: { loggedIn: true, here: false, no: 0 } }));
  ok(r[1] === '(없음←이형출)' && r[2] === '(없음←이형출)', '다른 배로 옮겨 간 사람은 이 배 호기 이름에서 빠진다', JSON.stringify(r));
  r = names(board({ 이형출: { loggedIn: true, here: true, no: 2 } }));
  ok(r[1] === '(없음←이형출)', '2호기로 등록을 바꾼 사람은 1호기 이름에서 빠진다(2호기는 접속 명단이 채운다)', JSON.stringify(r));
  //  접속해 호기를 등록한 사람(workers)은 종전대로 그 호기 이름이다
  const rows = board({ 이형출: { loggedIn: false, here: true, no: 1 }, 박진우: { loggedIn: true, here: true, no: 2 } }, [{ name: '박진우', equip: '2호기', mode: 'loading' }]);
  r = names(rows);
  ok(r[2] === '박진우' && r[1] === '(없음←이형출)', '박진우가 2호기를 등록해 접속하면 2호기는 박진우, 1호기는 검수원 없음', JSON.stringify(r));
  const c1 = rows.find((c) => c.no === 1), c2 = rows.find((c) => c.no === 2);
  ok(c1.done > 0 && c2.done > 0 && !('cands' in c1), '이름이 없어도 대수는 그대로 · 내부 후보 칸은 내보내지 않는다', `${c1.done}/${c2.done}`);
  const split = U.craneBoardSplit(board({ 이형출: { loggedIn: false, here: true, no: 1 } }), NOW);
  const flat = [].concat(...Object.values(split).filter(Array.isArray));
  ok(flat.some((c) => c.nameGone === '이형출' && !c.name), 'craneBoardSplit 을 거쳐도 «검수원 없음» 표시(nameGone)가 남는다', JSON.stringify(flat.map((c) => [c.no, c.name, c.nameGone])));
  //  한 호기에 두 사람이 찍었으면 — 뒤 사람이 로그아웃했을 때 아직 로그인 중인 앞 사람 이름이 올라온다
  const V2 = { info: {}, discharge: { completed: { A: { at: NOW - 3e6, by: '김가', equip: '3호기' }, B: { at: NOW - 1e6, by: '이나', equip: '3호기' } } }, loading: {} };
  const r2 = U.craneBoardOf(V2, [], null, NOW, { roster: { 김가: { loggedIn: true, here: true, no: 3 }, 이나: { loggedIn: false, here: true, no: 3 } } });
  ok(r2[0].name === '김가' && r2[0].nameGone === '이나', '뒤에 찍은 사람이 로그아웃했으면 아직 로그인 중인 앞 사람 이름으로', JSON.stringify(r2.map((c) => [c.no, c.name, c.nameGone])));
  //  감사 지적 — 조 등록(craneCrew)에 남은 이름도 로그인 명단을 거친다
  const dayKey = U.crewShiftKey ? U.crewShiftKey('주간', NOW).key : '';
  const V3 = { info: { vsl: 'OBWH', voy: '2789E', pier: 'PCTC', craneCrew: { [dayKey]: { '1호기': { name: '이형출', at: NOW - 6 * 3600e3 } } } }, discharge: { completed: fx.discharge }, loading: { completed: fx.loading } };
  const crewOnly = U.crewNameAt(V3.info, NOW, '1호기');
  let r3 = U.craneBoardOf(V3, [], null, NOW, { roster: { 이형출: { loggedIn: false, here: true, no: 1 } } });
  ok(crewOnly === '이형출' && !r3.find((c) => c.no === 1).name && r3.find((c) => c.no === 1).nameGone === '이형출', '조 등록에 이형출이 1호기로 남아 있어도 로그아웃했으면 이름을 올리지 않는다', `조 등록 «${crewOnly}» → ${JSON.stringify(r3.map((c) => [c.no, c.name, c.nameGone]))}`);
  r3 = U.craneBoardOf(V3, [], null, NOW, { roster: { 이형출: { loggedIn: true, here: true, no: 1 } } });
  ok(r3.find((c) => c.no === 1).name === '이형출', '로그인해 있으면 조 등록 이름은 종전대로 올라온다', JSON.stringify(r3.map((c) => [c.no, c.name])));
  r3 = U.craneBoardOf(V3, [], null, NOW);
  ok(r3.find((c) => c.no === 1).name === '이형출', 'roster 를 안 주면 조 등록 이름도 종전 그대로');
  const src = fs.readFileSync(path.join(root, 'src/pages/ChiefDashboard.jsx'), 'utf8');
  ok(/if \(i\.loggedIn === false\) return;\s*\/\/ 4\.87-07/.test(src) && (src.match(/roster: rosterOfVoyage\(/g) || []).length >= 2 && /c\.nameGone \? '검수원 없음' : '미등록'/.test(src), '상황판 — 접속 명단은 로그아웃 즉시 빠지고, 호기 이름은 로그인 명단으로 가르고, 빈 이름은 «검수원 없음»');
  console.log(`\n${n - bad}/${n} 통과`); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('연막 중 예외', e); process.exit(1); });
