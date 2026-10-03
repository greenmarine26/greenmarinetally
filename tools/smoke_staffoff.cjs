// 3.76 연막검사 — 인원 접근 온오프. ① 판정(staffList)과 ② 저장 규칙(firebase.fbSetStaffOff: 관리자만·소유자 불가·본인 불가·되돌리면 복원)은 실소스를 메모리 DB 로 **실제로 돌린다**. ③ 네 곳(로그인 화면·확정 입구·실시간 로그아웃·인원관리 단추)은 소스 문자열 확인뿐이라 «배선이 들어 있다»만 증명하고 화면 동작은 증명하지 못한다(감사 지적 — 화면 동작은 사람이 눌러 본다)
const path = require('path'); const fs = require('fs'); const esbuild = require('esbuild'); const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
global.window = dom.window; global.document = dom.window.document; global.localStorage = dom.window.localStorage; global.sessionStorage = dom.window.sessionStorage;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
// 메모리 DB — firebase/database 의 쓰는 함수만 흉내 낸다(실 Firebase 에는 어떤 쓰기도 가지 않는다)
const DB = {};
global.__DB = DB;
const stub = `
  const DB = globalThis.__DB;
  const seg = (p) => String(p).split('/').filter(Boolean);
  export const initializeApp = () => ({});
  export const getDatabase = () => ({});
  export const getStorage = () => ({});
  export const ref = (_d, p) => ({ p: p || '' });
  export const storageRef = ref;
  export const child = (r, p) => ({ p: r.p + '/' + p });
  export const get = async (r) => { const v = DB[r.p]; return { exists: () => v !== undefined, val: () => v }; };
  export const set = async (r, v) => { if (v === null) delete DB[r.p]; else DB[r.p] = v; };
  export const update = async () => {}; export const remove = async (r) => { delete DB[r.p]; };
  export const push = () => ({}); export const onValue = () => () => {}; export const off = () => {};
  export const goOffline = () => {}; export const goOnline = () => {};
  export const uploadBytes = async () => ({}); export const getDownloadURL = async () => ''; export const deleteObject = async () => {}; export const listAll = async () => ({ items: [] });
`;
(async () => {
const out = path.join(require('os').tmpdir(), '_smoke_staffoff_' + process.pid + '.cjs');
await esbuild.build({
  entryPoints: [path.join(__dirname, 'smoke_staffoff_entry.js')], jsx: 'automatic', bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'fbstub', setup(b) {
    b.onResolve({ filter: /^firebase\// }, a => ({ path: a.path, namespace: 'fbstub' }));
    b.onLoad({ filter: /.*/, namespace: 'fbstub' }, () => ({ contents: stub, loader: 'js' }));
  } }],
});
const M = require(out); fs.unlinkSync(out);
const OWNER = '김성일';
const names = M.STAFF_LIST.map(s => s.name);
ok(names.length >= 20 && names.includes(OWNER), `실 코드 명단 ${names.length}명(소유자 포함)`);

// ① 판정 한 벌
M.setStaffOff({ '최원형': { name: '최원형', by: OWNER }, ' 이인철 ': true, '': true });
ok(M.isStaffOff('최원형') && M.isStaffOff('이인철') && M.isStaffOff(' 최원형 '), '오프 명단의 이름(공백 보정)은 차단으로 읽는다');
ok(!M.isStaffOff('김판석') && !M.isStaffOff('') && !M.isStaffOff(null), '명단에 없는 이름·빈 값은 막지 않는다');
M.setStaffOff({});
ok(names.every(n => !M.isStaffOff(n)), `명단이 비면 ${names.length}명 전부 열려 있다`);
ok(/접근이 허용되지 않았습니다/.test(M.ACCESS_DENIED_MSG) && /관리자에게 문의/.test(M.ACCESS_DENIED_MSG), '접근불허 메시지 문구');

// ①-B 자물쇠 화면 — 그림 하나와 문구만, 눌러 쓸 것이 하나도 없다
{
  const h = M.lockMarkup();
  ok(/<img[^>]+src="data:image\/png;base64,/.test(h), '자물쇠 그림(PNG)이 들어 있다');
  ok(!/<(button|a|input|select|textarea|nav|header)\b/.test(h), '버튼·링크·입력·메뉴가 하나도 없다');
  const text = h.replace(/<img[^>]*>/g, '').replace(/<[^>]+>/g, '').trim();
  ok(text === M.ACCESS_DENIED_MSG, '글자는 접근불허 문구뿐이다');
  ok(/position:fixed/.test(h) && /inset:0/.test(h) && /z-index:2147483647/.test(h), '전체 화면을 맨 위로 덮는다');
}
// ①-C 잠금 판정 — 오프면 덮고 온이면 걷힌다
{
  const off = { '최원형': true };
  ok(M.lockedNameOf(off, '최원형', '') === '최원형', '로그인해 있던 사람이 오프가 되면 덮는다');
  ok(M.lockedNameOf(off, '', '최원형') === '최원형', '오프인 이름으로 로그인을 시도한 사람도 덮는다');
  ok(M.lockedNameOf(off, '김판석', '') === '', '다른 사람은 그대로');
  ok(M.lockedNameOf({}, '최원형', '최원형') === '', '온으로 돌아오면 같은 사람이 바로 걷힌다(메뉴 정상)');
  ok(M.lockedNameOf(null, '최원형', '') === '' && M.lockedNameOf(off, '', '') === '', '빈 값·명단 없음은 덮지 않는다');
}

// ② 저장 규칙 — 서버 admin_guard 를 다시 읽어 판정
DB['admin_guard'] = { admins: { [OWNER]: { pwHash: 'x' }, '이현규': { pwHash: 'y' } } };
{
  let r = await M.fbSetStaffOff('최원형', '김판석', true);
  ok(!r.ok && r.reason === 'not_admin' && DB['staffOff/김판석'] === undefined, '관리자가 아닌 사람은 못 끈다(저장 없음)');
  r = await M.fbSetStaffOff('이현규', OWNER, true);
  ok(!r.ok && r.reason === 'owner' && DB['staffOff/' + OWNER] === undefined, '소유자는 누가 시도해도 못 끈다');
  r = await M.fbSetStaffOff('이현규', '이현규', true);
  ok(!r.ok && r.reason === 'self' && DB['staffOff/이현규'] === undefined, '관리자 본인은 자기를 못 끈다(잠금 방지)');
  let allOk = true;
  for (const n of names.filter(n => n !== OWNER && n !== '이현규')) { const x = await M.fbSetStaffOff('이현규', n, true); if (!x.ok || !DB['staffOff/' + n] || DB['staffOff/' + n].by !== '이현규') allOk = false; }
  ok(allOk, `관리자는 나머지 ${names.length - 2}명을 하나씩 끌 수 있고 누가 했는지가 남는다`);
  r = await M.fbSetStaffOff('이현규', '최원형', false);
  ok(r.ok && DB['staffOff/최원형'] === undefined, '다시 켜면(온) 노드가 지워져 바로 복원된다');
  ok(Object.keys(DB).filter(k => k.startsWith('staffOff/')).length === names.length - 3, `다른 사람의 오프는 그대로 남는다(${names.length - 3}명)`);
  r = await M.fbSetStaffOff('', '김판석', true);
  ok(!r.ok && r.reason === 'no_name', '이름 없는 요청은 거부');

  // ③ 배선 — 소스 문자열 확인(동작 증명 아님)
  const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');
  const app = rd('src/App.jsx'), lg = rd('src/pages/LoginPage.jsx'), md = rd('src/components/StaffManagerModal.jsx'), fb = rd('src/firebase.js');
  const hs = app.indexOf('const handleSelectInspector = useCallback');
  ok(hs > 0 && /isStaffOff\(name\) && !isOwnerName\(name\)\) \{ setDeniedName\(name\)/.test(app.slice(hs, hs + 700)), '로그인 확정의 단일 입구(handleSelectInspector)가 오프면 로그인 대신 자물쇠로 보낸다');
  ok((app.match(/staffOffMap\[inspector\]\) return;/g) || []).length >= 2, '덮인 동안 하트비트(작업중 기록)·열람 기록 효과가 쓰지 않는다');
  ok(/lockedNameOf\(staffOffMap, inspector, deniedName\)[\s\S]{0,200}return <AccessLockScreen \/>/.test(app) && app.indexOf('return <AccessLockScreen />') < app.indexOf("if (!inspector || route.name === 'login' || needChoice)"), '화면 그리기 맨 앞에서 오프면 자물쇠만 그리고(로그인 화면·메뉴보다 앞) 온이면 통과한다');
  ok(/fbSubscribeStaffOff\(\(m\) =>[\s\S]{0,300}!isOwnerName\(nm\)/.test(app), '구독부가 소유자를 명단에서 걸러 담는다');
  const hp = lg.indexOf('const handlePick = (name) =>');
  const seg = lg.slice(hp, hp + 900);
  ok(hp > 0 && seg.indexOf('isStaffOff(name)') > 0 && seg.indexOf('isStaffOff(name)') < seg.indexOf('commitSelect(name)'), '로그인 화면이 비밀번호 창·선택 확정보다 앞에서 오프를 걸러 App 으로 넘긴다');
  ok(/!isOwnerName\(s\.name\) && s\.name !== current[\s\S]{0,400}handleToggleOff/.test(md), '인원관리 단추는 소유자·본인 행에 없다');
  ok(/staffOff\//.test(fb) || /STAFF_OFF_NODE/.test(fb), '저장 노드 staffOff');
  ok(!/staffOff|StaffOff/.test(rd('public/cone.html')), '콘앱은 이 노드를 보지 않는다(공개 유지)');
  console.log(fail ? `\n✗ 접근 온오프 연막검사 ${fail}건 실패` : '\n✓ 접근 온오프 연막검사 통과');
  process.exit(fail ? 1 : 0);
}
})();
