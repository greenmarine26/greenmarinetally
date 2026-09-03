// 업데이트 새로고침에 로그인이 살아남는가 — 검수사 «업데이트 마다 자동 로그아웃이 됩니다».
//   실브라우저가 없으므로 ① 맡김/꺼냄 규칙(updateResume)을 실제로 돌려 보고
//   ② 앱·배너가 그것을 제대로 배선했는지 소스로 대조한다.
const fs = require('fs'), path = require('path');
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };

//  ── ① 규칙 자체
const store = {};
global.sessionStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
global.window = { location: { hash: '#/voyage/SWMM_2609S' } };
const M = require(process.argv[2]);

ok(M.consumeUpdateResume() === null, '맡긴 것이 없으면 null — 앱을 새로 켜면 로그인 화면 그대로다');

M.stashForUpdate('김성일');
const r1 = M.consumeUpdateResume();
ok(!!r1 && r1.inspector === '김성일', '업데이트 새로고침이면 그 검수원으로 되살린다');
ok(!!r1 && r1.hash === '#/voyage/SWMM_2609S', '보던 화면도 같이 되살린다 (' + (r1 && r1.hash) + ')');
ok(M.consumeUpdateResume() === null, '⛔ 한 번 쓰면 지운다 — 다음 새로고침은 다시 로그인이다');

M.stashForUpdate('');
ok(M.consumeUpdateResume() === null, '로그인 전이면 맡기지 않는다');

M.stashForUpdate('이종부');
store['gm_update_resume'] = JSON.stringify({ inspector: '이종부', hash: '', at: Date.now() - 61000 });
ok(M.consumeUpdateResume() === null, '⛔ 60초가 지나면 안 되살린다 — 남의 흔적이 떠다니지 않게');

store['gm_update_resume'] = '{망가진';
ok(M.consumeUpdateResume() === null, '망가진 값에서 터지지 않는다');

//  ── ② 배선 — 두 새로고침 길 모두에서 맡기고, 앱이 그것을 꺼내 쓰는가
const up = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'UpdatePrompt.jsx'), 'utf8');
ok(/stashForUpdate\(inspector\)/.test(up), '⛔ 「업데이트」 버튼 길에서 안 맡긴다');
ok(/stashForUpdate\(inspRef\.current\)/.test(up), '⛔ controllerchange(다른 탭이 먼저 갱신) 길에서 안 맡긴다');
ok(/UpdatePrompt\(\{ inspector/.test(up), '⛔ 배너가 검수원을 못 받는다');

const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'App.jsx'), 'utf8');
ok(/<UpdatePrompt inspector=\{inspector\}\/>/.test(app), '⛔ 앱이 배너에 검수원을 안 넘긴다');
ok((app.match(/<UpdatePrompt inspector=\{inspector\}\/>/g) || []).length === 2, '배너를 그리는 두 곳 다 넘긴다');
ok(/consumeUpdateResume\(\)/.test(app), '⛔ 앱이 맡긴 것을 안 꺼낸다');
ok(/handleSelectInspector\(name\)/.test(app), '⛔ 되살릴 때 종전 로그인 흐름을 안 탄다 — 활동 로그·역할 게이트가 빠진다');
const ur = fs.readFileSync(path.join(__dirname, '..', 'src', 'updateResume.js'), 'utf8');
ok(!/localStorage/.test(ur), '⛔ localStorage 를 쓰면 앱을 새로 켜도 로그인이 풀린다 — 확정 사양 위반');
ok(/sessionStorage/.test(ur), 'sessionStorage 를 쓴다 — 탭을 닫으면 사라진다');

console.log(fail ? `\n업데이트 로그인 유지 연막검사 실패 ${fail}건` : '\n업데이트 로그인 유지 연막검사 통과');
process.exit(fail ? 1 : 0);
