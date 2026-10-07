// 4.08 연막검사 — 일반 검수원은 고른 선박 본문만 받는다(항차 뿌리 전체 3.6MB 를 연결마다 다시 받던 것을 끊음).
//   ① 범위 판정 workChoice.voyagesScopeOf ② 본문 구독 fbSubscribeVoyageBody(고른 항차 하나 · 손질 한 벌이 전체 구독과 같다)
//   ③ 선택 화면용 fbSubscribeVoyageInfos(키 목록 REST shallow + 항차마다 info 만 · 새·지워진 항차 · 실패 재시도 · 해제) ④ App.jsx 연결 모양.
//   firebase.js·workChoice.js 는 실소스를 묶고 firebase/* 만 메모리 스텁(NODE_PATH) — 실제 쓰기·읽기 없음.
//   항차 본문은 실데이터 픽스처(DXQD 베이뷰 · SWMM 콘앱 실측)를 쓴다.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'voyscope408_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const docHandlers = {}, winHandlers = {};
global.window = { addEventListener(t, h) { (winHandlers[t] = winHandlers[t] || []).push(h); }, removeEventListener(t, h) { winHandlers[t] = (winHandlers[t] || []).filter((x) => x !== h); }, dispatchEvent() { return true; }, __fbShipBayDict: {}, location: { href: '' } };
global.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = {
  visibilityState: 'visible',
  addEventListener(t, h) { (docHandlers[t] = docHandlers[t] || []).push(h); },
  removeEventListener(t, h) { docHandlers[t] = (docHandlers[t] || []).filter((x) => x !== h); },
  dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} }, createElement: () => ({ style: {} }),
};
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }

//  가짜 타이머 — 모듈이 쓰는 setTimeout 을 가로채 시각을 우리가 돌린다(실시간 대기 없음).
const realST = global.setTimeout, realCT = global.clearTimeout;
let timers = [], tid = 0;
const fakeTimers = () => { timers = []; global.setTimeout = (fn, ms) => { const t = { id: ++tid, fn, ms, live: true }; timers.push(t); return t.id; }; global.clearTimeout = (id) => { const t = timers.find((x) => x.id === id); if (t) t.live = false; }; };
const realTimers = () => { global.setTimeout = realST; global.clearTimeout = realCT; };
const fireTimers = (ms) => { for (const t of timers.filter((x) => x.live && x.ms === ms)) { t.live = false; t.fn(); } };
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
const warns = []; const realWarn = console.warn; console.warn = (...a) => { warns.push(a.map(String).join(' ')); };

(async () => {
  try {
    const stubDir = path.join(TMP, 'node_modules', 'firebase'); fs.mkdirSync(stubDir, { recursive: true });
    fs.writeFileSync(path.join(stubDir, 'app.js'), 'exports.initializeApp = () => ({});\n');
    fs.writeFileSync(path.join(stubDir, 'storage.js'), 'exports.getStorage = () => ({}); exports.ref = () => ({}); exports.uploadBytes = async () => ({}); exports.uploadString = async () => ({}); exports.getDownloadURL = async () => ""; exports.deleteObject = async () => {}; exports.listAll = async () => ({ items: [] });\n');
    fs.writeFileSync(path.join(stubDir, 'messaging.js'), 'exports.getMessaging = () => ({}); exports.getToken = async () => ""; exports.deleteToken = async () => {}; exports.onMessage = () => {}; exports.isSupported = async () => false;\n');
    //  메모리 RTDB — onValue 가 «처음 한 번 + 바뀔 때마다» 스냅샷을 준다(T.touch 로 바뀜을 알린다). 받은 바이트를 T.delivered 에 센다.
    fs.writeFileSync(path.join(stubDir, 'database.js'), `
const T = { root: {}, listeners: [], delivered: [], hold: new Set() }; exports.__T = T;
const segs = (p) => String(p || '').split('/').filter(Boolean);
const getAt = (p) => { let o = T.root; for (const s of segs(p)) { if (o == null || typeof o !== 'object') return undefined; o = o[s]; } return o; };
const bytesOf = (v) => (v == null ? 4 : Buffer.byteLength(JSON.stringify(v)));
function deliver(rec) {
  if (!rec.alive) return;
  const v = getAt(rec.p);
  T.delivered.push({ p: rec.p, bytes: bytesOf(v) });
  rec.cb({ val: () => (v === undefined ? null : JSON.parse(JSON.stringify(v))), exists: () => v != null });
}
T.touch = (changed) => { for (const rec of T.listeners) if (rec.alive && (rec.p === changed || rec.p.startsWith(changed + '/') || changed.startsWith(rec.p + '/'))) deliver(rec); };
exports.getDatabase = () => ({});
exports.ref = (db, p) => ({ _p: p || '' });
exports.child = (r, p) => ({ _p: (r._p ? r._p + '/' : '') + p });
exports.onValue = (r, cb) => { const rec = { p: r._p, cb, alive: true }; T.listeners.push(rec); Promise.resolve().then(() => { if (!T.hold.has(rec.p)) deliver(rec); }); return () => { rec.alive = false; }; };
exports.get = async () => ({ exists: () => false, val: () => null });
exports.set = async () => {}; exports.update = async () => {}; exports.remove = async () => {}; exports.push = (r) => ({ _p: r._p + '/k', key: 'k' });
exports.off = () => {}; exports.goOffline = () => {}; exports.goOnline = () => {};
`);
    const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
    fs.writeFileSync(e, `export { fbSubscribeVoyages, fbSubscribeVoyageBody, fbSubscribeVoyageInfos } from "${ROOT}/src/firebase.js";\nexport { voyagesScopeOf, visibleVoyagesOf } from "${ROOT}/src/workChoice.js";\nexport { setDevAccess } from "${ROOT}/src/staffList.js";\n`);
    execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
    process.env.NODE_PATH = path.join(TMP, 'node_modules'); require('module').Module._initPaths();
    const DB = require(path.join(TMP, 'node_modules', 'firebase', 'database.js'));
    const M = require(o);
    const T = DB.__T;
    const clone = (x) => JSON.parse(JSON.stringify(x));
    const fx = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'fixtures', f), 'utf8'));
    const dxqd = fx('bayview_dxqd.json'); delete dxqd._about;
    const swmm = fx('cone402_swmm_real.json');
    const mk = (key, body, vsl) => { const b = clone(body); b.info = { ...(b.info || {}), vsl: vsl || (b.info && b.info.vsl) || key.split('_')[0] }; T.root.voyages[key] = b; };
    const reset = () => {
      T.root = { voyages: {} };
      mk('DXQD_2638E', dxqd); mk('SWMM_2645E', swmm); mk('AAAA_1E', swmm, 'AAAA'); mk('BBBB_2E', swmm, 'BBBB'); mk('CCCC_3E', swmm, 'CCCC');
      //  `cn` 칸이 빠진 기록 — 들어오는 자리의 손질(3.58-03)이 두 구독에서 똑같이 도는지
      T.root.voyages.CN_1E = { info: { vsl: 'CN', voy: '1E' }, discharge: { records: { ABCU1234567: { status: 'done', pos: '010202' } } } };
      T.listeners.length = 0; T.delivered.length = 0; T.hold.clear(); warns.length = 0;
    };
    const aliveListeners = () => T.listeners.filter((r) => r.alive);
    const sumBytes = (pred) => T.delivered.filter(pred).reduce((a, d) => a + d.bytes, 0);
    const fullSize = () => Buffer.byteLength(JSON.stringify(T.root.voyages));
    let fetchCalls = 0, fetchFail = 0;
    global.fetch = async (url) => {
      fetchCalls += 1;
      if (fetchFail > 0) { fetchFail -= 1; throw new Error('연막: 네트워크 실패'); }
      const m = /\/voyages\.json\?shallow=true$/.exec(String(url));
      if (!m) throw new Error('연막: 예상 밖 요청 ' + url);
      const body = {}; for (const k of Object.keys(T.root.voyages)) body[k] = true;
      return { ok: true, status: 200, json: async () => body };
    };

    console.log('■ ① 범위 판정 — 누가 서버에서 어디까지 받는가');
    const S = M.voyagesScopeOf;
    ok('이름 없음 + PC(wide) → all (로그인 화면 현황판이 컨 수를 센다)', S('', null, true) === 'all');
    ok('이름 없음 + 폰 → light (info 만)', S('', null, false) === 'light');
    ok('소유자 김성일 → 선택이 없어도 all', S('김성일', null, false) === 'all');
    ok('소유자 김성일 · 작업자 선택 → all (모든 선박 조회)', S('김성일', { mode: 'work', voyageKey: 'DXQD_2638E' }, false) === 'all');
    ok('수석 이현규(수석검수) · 조회만 → all', S('이현규', { mode: 'view' }, false) === 'all');
    ok('일반 검수원 최원형 · 선택 전 → light', S('최원형', null, false) === 'light');
    ok('일반 검수원 최원형 · 조회만 → light (조회만은 일반 검수원에게 없다 — 방어)', S('최원형', { mode: 'view' }, true) === 'light');
    ok('일반 검수원 최원형 · 작업자(DXQD_2638E) → body:DXQD_2638E (PC 여도)', S('최원형', { mode: 'work', voyageKey: 'DXQD_2638E', equip: 'QC1' }, true) === 'body:DXQD_2638E');
    ok('작업자인데 선박 키가 비면 → light', S('이인철', { mode: 'work', voyageKey: '' }, false) === 'light');
    ok('호기만 다르면 같은 범위 문자열(호기를 바꿔 저장해도 다시 구독하지 않는다)', S('최원형', { mode: 'work', voyageKey: 'DXQD_2638E', equip: 'QC1' }, false) === S('최원형', { mode: 'work', voyageKey: 'DXQD_2638E', equip: 'QC2' }, false));
    //  ★ 4.08-01 — 로그인해 있는 일반 검수원이 «검수원 변경»(#/login)을 열면 로그인 화면이므로 이름이 없을 때와 같은 범위(다른 사람이 아무 선박이나 고른다)
    ok('4.08-01 일반 검수원 · 작업자(DXQD) · 검수원 변경 화면 · 폰 → light (모든 선박 info)', S('최원형', { mode: 'work', voyageKey: 'DXQD_2638E', equip: 'QC1' }, false, true) === 'light');
    ok('4.08-01 일반 검수원 · 작업자 · 검수원 변경 화면 · PC → all (로그인 화면 현황판이 컨 수를 센다 — 이름 없을 때와 같다)', S('최원형', { mode: 'work', voyageKey: 'DXQD_2638E', equip: 'QC1' }, true, true) === 'all');
    ok('4.08-01 검수원 변경 화면이 아니면 종전 그대로 body:DXQD_2638E', S('최원형', { mode: 'work', voyageKey: 'DXQD_2638E', equip: 'QC1' }, false, false) === 'body:DXQD_2638E' && S('최원형', { mode: 'work', voyageKey: 'DXQD_2638E', equip: 'QC1' }, false) === 'body:DXQD_2638E');
    ok('4.08-01 자유 열람은 검수원 변경 화면이어도 all · 이름 없음은 종전 그대로', S('김성일', null, false, true) === 'all' && S('', null, true, true) === 'all' && S('', null, false, true) === 'light');
    M.setDevAccess({ 최원형: { name: '최원형' } });
    ok('개발 열람 명단에 오른 사람 → all (직책 판정과 같은 잣대)', S('최원형', null, false) === 'all');
    M.setDevAccess({});
    ok('명단에서 빠지면 다시 light', S('최원형', null, false) === 'light');

    console.log('■ ② 본문 구독 — 고른 항차 하나만 받는다');
    reset();
    const got = [];
    const unB = M.fbSubscribeVoyageBody('DXQD_2638E', (all, keys, loaded) => got.push({ all, keys, loaded }));
    await flush();
    ok('서버 구독은 voyages/DXQD_2638E 하나뿐(뿌리·다른 항차·info 구독 없음)', aliveListeners().length === 1 && aliveListeners()[0].p === 'voyages/DXQD_2638E', aliveListeners().map((r) => r.p).join(','));
    const last = got[got.length - 1];
    ok('콜백: 그 항차만 담은 all · 본문 키 Set · loaded', !!last && Object.keys(last.all).join() === 'DXQD_2638E' && last.keys.size === 1 && last.keys.has('DXQD_2638E') && last.loaded === true);
    ok('본문 전체가 들어 있다(discharge·loading·info)', !!(last.all.DXQD_2638E.discharge && last.all.DXQD_2638E.loading && last.all.DXQD_2638E.info));
    const bodyBytes = sumBytes(() => true), total = fullSize();
    console.log(`    받은 바이트 — 본문 구독 ${bodyBytes.toLocaleString()} B / 뿌리 전체였다면 ${total.toLocaleString()} B (${(bodyBytes / total * 100).toFixed(1)}%)`);
    ok('받은 바이트가 뿌리 전체의 절반 미만(고른 항차 하나 + 같은 크기 항차 넷이 있어도)', bodyBytes < total * 0.5);
    //  전체 구독과 같은 손질(한 벌) — 같은 항차 값이 글자 하나까지 같다
    const full = []; const unF = M.fbSubscribeVoyages((v) => full.push(v));
    await flush();
    ok('전체 구독(종전 길)과 같은 항차 값 — 손질(터미널 자리·자동 맞교환·cn 채움)이 한 벌', JSON.stringify(full[full.length - 1].DXQD_2638E) === JSON.stringify(last.all.DXQD_2638E));
    unF();
    //  cn 채움
    const gotCn = []; const unC = M.fbSubscribeVoyageBody('CN_1E', (all) => gotCn.push(all));
    await flush();
    ok('cn 이 빠진 기록을 키로 채운다(3.58-03) — 본문 구독에서도', gotCn.length === 1 && gotCn[0].CN_1E.discharge.records.ABCU1234567.cn === 'ABCU1234567');
    unC();
    //  바뀜
    T.root.voyages.DXQD_2638E.discharge.dataAt = '연막-바뀜'; T.touch('voyages/DXQD_2638E/discharge/dataAt');
    await flush();
    ok('서버에서 바뀌면 다음 콜백에 반영', got[got.length - 1].all.DXQD_2638E.discharge.dataAt === '연막-바뀜');
    const gotN = got.length;
    unB();
    T.root.voyages.DXQD_2638E.discharge.dataAt = '해제-뒤'; T.touch('voyages/DXQD_2638E');
    await flush();
    ok('해제하면 서버 구독이 끊기고 콜백도 더 안 온다', aliveListeners().length === 0 && got.length === gotN);
    //  없는 항차
    const none = []; const unN = M.fbSubscribeVoyageBody('NOPE_9E', (all, keys, loaded) => none.push({ all, keys, loaded }));
    await flush();
    ok('없는 항차 → 빈 all · 빈 Set · loaded true («찾을 수 없습니다» 가 정직한 답)', none.length === 1 && Object.keys(none[0].all).length === 0 && none[0].keys.size === 0 && none[0].loaded === true);
    unN();
    //  키가 비면
    const emp = []; const unE = M.fbSubscribeVoyageBody('', (all, keys, loaded) => emp.push({ all, keys, loaded }));
    ok('키가 비면 서버를 부르지 않고 빈 값 · loaded true', emp.length === 1 && emp[0].loaded === true && aliveListeners().length === 0); unE();

    console.log('■ ③ 선택 화면용 — 키 목록(REST shallow) + 항차마다 info 만');
    reset(); fetchCalls = 0; fakeTimers();
    const calls = [];
    const unI = M.fbSubscribeVoyageInfos((all, keys, loaded) => calls.push({ all, keys, loaded }));
    await flush();
    let li = calls[calls.length - 1];
    ok('항차 6개 모두 {info} 만(본문 칸이 없다)', !!li && Object.keys(li.all).length === 6 && Object.values(li.all).every((v) => Object.keys(v).join() === 'info'), li && Object.keys(li.all).join(','));
    ok('본문 키 Set 은 비어 있다(App 이 무거운 화면에 아무것도 넘기지 않는다)', li.keys.size === 0);
    ok('loaded true (키 목록 + 모든 info 첫 응답)', li.loaded === true);
    ok('서버 구독은 항차마다 voyages/{키}/info 뿐 — 뿌리·본문 구독 없음', aliveListeners().length === 6 && aliveListeners().every((r) => /^voyages\/[^/]+\/info$/.test(r.p)));
    const infoBytes = sumBytes(() => true);
    console.log(`    받은 바이트 — 선택 화면 ${infoBytes.toLocaleString()} B / 뿌리 전체였다면 ${fullSize().toLocaleString()} B (${(infoBytes / fullSize() * 100).toFixed(2)}%)`);
    ok('받은 바이트가 뿌리 전체의 3% 미만', infoBytes < fullSize() * 0.03);
    ok('info 값이 서버 값 그대로(선택 화면이 쓰는 vsl·voy·berth·planDate)', li.all.DXQD_2638E.info.vsl === T.root.voyages.DXQD_2638E.info.vsl && JSON.stringify(li.all.SWMM_2645E.info) === JSON.stringify(T.root.voyages.SWMM_2645E.info));
    ok('5분 갱신 타이머가 걸려 있다', timers.some((t) => t.live && t.ms === 300000));
    //  info 바뀜
    T.root.voyages.SWMM_2645E.info.berth = '연막-선석'; T.touch('voyages/SWMM_2645E/info');
    await flush();
    ok('info 가 바뀌면 다음 콜백에 반영', calls[calls.length - 1].all.SWMM_2645E.info.berth === '연막-선석');
    //  새 항차
    T.root.voyages.NEWW_1E = { info: { vsl: 'NEWW', voy: '1E' }, discharge: { ediContainers: { A: { cn: 'A' } } } };
    const fc0 = fetchCalls;
    for (const h of (docHandlers.visibilitychange || [])) h();
    await flush();
    li = calls[calls.length - 1];
    ok('화면이 다시 보이면 키 목록을 다시 읽는다', fetchCalls === fc0 + 1);
    ok('새 항차가 선택 목록에 올라온다 — info 만(본문 안 받음)', !!li.all.NEWW_1E && Object.keys(li.all.NEWW_1E).join() === 'info' && !aliveListeners().some((r) => r.p === 'voyages/NEWW_1E'));
    //  지워진 항차
    delete T.root.voyages.AAAA_1E;
    fireTimers(300000);
    await flush();
    li = calls[calls.length - 1];
    ok('5분 갱신 — 지워진 항차는 목록에서 빠지고 그 info 구독도 끊긴다', !li.all.AAAA_1E && T.listeners.filter((r) => r.p === 'voyages/AAAA_1E/info').every((r) => !r.alive));
    ok('살아 있는 구독 수 = 항차 수', aliveListeners().length === Object.keys(T.root.voyages).length);
    //  해제
    const callsN = calls.length;
    unI();
    T.touch('voyages/DXQD_2638E/info');
    await flush();
    ok('해제 — 서버 구독 전부 끊김 · 화면 보임·온라인 핸들러 제거 · 타이머 없음 · 콜백 더 안 옴', aliveListeners().length === 0 && (docHandlers.visibilitychange || []).length === 0 && (winHandlers.online || []).length === 0 && timers.filter((t) => t.live).length === 0 && calls.length === callsN);
    realTimers();

    console.log('■ ③-b 실패·지연·성급한 해제');
    reset(); fakeTimers(); fetchFail = 1; warns.length = 0; localStorage._m = {};   // 직전 목록(대체 경로)이 없는 기기
    const cf = [];
    const unF2 = M.fbSubscribeVoyageInfos((all, keys, loaded) => cf.push({ all, keys, loaded }));
    await flush();
    ok('키 목록을 못 받으면 loaded 를 켜지 않고 소리 내어 알린다(조용히 넘기지 않는다)', !cf.some((c) => c.loaded) && warns.some((w) => /항차 키 목록 실패/.test(w)));
    ok('10초 뒤 다시 시도할 타이머가 걸린다', timers.some((t) => t.live && t.ms === 10000));
    fireTimers(10000); await flush();
    ok('재시도가 성공하면 목록이 올라오고 loaded true', cf.length > 0 && cf[cf.length - 1].loaded === true && Object.keys(cf[cf.length - 1].all).length === 6);
    unF2();
    //  info 첫 응답이 늦는 항차 — 3초 뒤 먼저 연다
    reset(); fakeTimers(); T.hold.add('voyages/BBBB_2E/info');
    const cs = [];
    const unS = M.fbSubscribeVoyageInfos((all, keys, loaded) => cs.push({ all, keys, loaded }));
    await flush();
    ok('info 하나가 안 와도 처음엔 loaded false', cs.length > 0 && cs[cs.length - 1].loaded === false);
    fireTimers(3000); await flush();
    ok('3초 뒤에는 열린다(선택 화면이 영원히 막히지 않는다) — 늦는 항차만 빠져 있다', cs[cs.length - 1].loaded === true && !cs[cs.length - 1].all.BBBB_2E && !!cs[cs.length - 1].all.AAAA_1E);
    T.hold.delete('voyages/BBBB_2E/info'); T.touch('voyages/BBBB_2E/info'); await flush();
    ok('늦게 온 info 는 그때 목록에 올라온다', !!cs[cs.length - 1].all.BBBB_2E);
    unS();
    //  네트워크가 돌아오면(online) 재시도 간격을 기다리지 않고 곧바로 — 감사 주의 2
    reset(); fakeTimers(); fetchFail = 1; fetchCalls = 0; localStorage._m = {};
    const co = [];
    const unO = M.fbSubscribeVoyageInfos((all, keys, loaded) => co.push({ all, keys, loaded }));
    await flush();
    ok('첫 실패 뒤 목록이 없다(캐시도 없다)', !co.some((c) => c.loaded) && fetchCalls === 1);
    for (const h of (winHandlers.online || [])) h();
    await flush();
    ok('online 이벤트 — 곧바로 다시 읽어 목록이 올라온다(재시도 타이머를 기다리지 않는다)', fetchCalls === 2 && co[co.length - 1].loaded === true && Object.keys(co[co.length - 1].all).length === 6);
    ok('받은 키 목록을 이 기기에 적어 둔다(대체 경로용)', JSON.parse(localStorage.getItem('gm_voy_keys')).length === 6);
    unO();
    //  키 목록 요청이 가는 중이면 겹쳐 보내지 않는다
    reset(); fakeTimers(); fetchCalls = 0; localStorage._m = {};
    const unG = M.fbSubscribeVoyageInfos(() => {});
    for (const h of (docHandlers.visibilitychange || [])) h();
    for (const h of (winHandlers.online || [])) h();
    await flush();
    ok('요청이 가는 중에 화면 보임·online 이 겹쳐도 목록 요청은 한 번', fetchCalls === 1);
    unG();
    //  REST 가 안 돼도 직전 목록으로 먼저 연다
    reset(); fakeTimers(); localStorage._m = {}; localStorage.setItem('gm_voy_keys', JSON.stringify(['DXQD_2638E', 'SWMM_2645E', 'GONE_9E']));
    fetchFail = 1; warns.length = 0;
    const cc = [];
    const unC2 = M.fbSubscribeVoyageInfos((all, keys, loaded) => cc.push({ all, keys, loaded }));
    await flush();
    const lc = cc[cc.length - 1];
    ok('REST 실패 + 직전 목록 있음 → 그 목록으로 먼저 열린다(지워진 항차는 info 가 없어 빠진다)', !!lc && lc.loaded === true && Object.keys(lc.all).sort().join() === 'DXQD_2638E,SWMM_2645E' && warns.some((w) => /직전에 받아 둔 목록 3개/.test(w)), lc && Object.keys(lc.all).join(','));
    ok('그래도 재시도 타이머는 걸려 있다(REST 가 되면 나머지 항차가 올라온다)', timers.some((t) => t.live && t.ms === 10000));
    fireTimers(10000); await flush();
    ok('REST 가 되면 전체 목록으로 바뀐다', Object.keys(cc[cc.length - 1].all).length === 6 && T.listeners.filter((r) => r.alive).length === 6);
    unC2();
    //  연결이 없어 info 를 하나도 못 받았는데 3초가 지났다고 «항차 없음» 이 되면 안 된다 — 재감사 참고 1
    reset(); fakeTimers(); localStorage._m = {}; localStorage.setItem('gm_voy_keys', JSON.stringify(['DXQD_2638E', 'SWMM_2645E']));
    fetchFail = 1; T.hold.add('voyages/DXQD_2638E/info'); T.hold.add('voyages/SWMM_2645E/info');
    const cq = [];
    const unQ = M.fbSubscribeVoyageInfos((all, keys, loaded) => cq.push({ all, keys, loaded }));
    await flush(); fireTimers(3000); await flush();
    ok('REST 실패 + 직전 목록 + info 가 하나도 안 옴 → 3초가 지나도 loaded false (화면은 «불러오는 중» 을 말한다)', cq.length > 0 && cq.every((c) => c.loaded === false));
    T.hold.delete('voyages/SWMM_2645E/info'); T.touch('voyages/SWMM_2645E/info'); await flush();
    ok('info 가 오기 시작하면 그때 열린다', cq[cq.length - 1].loaded === true && !!cq[cq.length - 1].all.SWMM_2645E);
    unQ();
    //  항차가 정말 0개면 «없음» 이 맞다
    reset(); fakeTimers(); localStorage._m = {}; T.root.voyages = {};
    const cz = [];
    const unZ = M.fbSubscribeVoyageInfos((all, keys, loaded) => cz.push({ all, keys, loaded }));
    await flush();
    ok('항차가 정말 0개면 loaded true + 빈 목록', cz.length > 0 && cz[cz.length - 1].loaded === true && Object.keys(cz[cz.length - 1].all).length === 0);
    unZ();
    //  성급한 해제
    reset(); fakeTimers();
    const ce = [];
    const unX = M.fbSubscribeVoyageInfos((all) => ce.push(all));
    unX();
    await flush();
    ok('키 목록을 기다리는 중에 해제하면 구독을 만들지 않고 콜백도 없다', T.listeners.length === 0 && ce.length === 0 && timers.filter((t) => t.live).length === 0);
    realTimers();

    console.log('■ ④ App.jsx 연결 모양 — 소스 대조');
    const app = src('src/App.jsx');
    ok('범위 판정은 workChoice.voyagesScopeOf 한 벌 — App 이 inspector·workChoice·화면 너비로 부른다', /voyagesScopeOf\(inspector, workChoice, wideScreen, onLoginRoute && !loginPicking\)/.test(app) && /const onLoginRoute = route\.name === 'login';/.test(app));
    ok('4.08-01 범위 계산의 의존성 배열에 onLoginRoute·loginPicking 이 들어 있다(빠지면 #/login 에서 범위가 안 바뀐다)', /\[inspector, workChoice, wideScreen, onLoginRoute, loginPicking, devAccessMap, extraStaff\]\);/.test(app));
    ok('4.08-01 로그인 확정 때(주소가 login 인 채 이름을 세우기 직전) loginPicking 을 켜고, 주소가 login 을 벗어나면 끈다', /if \(parseHash\(window\.location\.hash\)\.name === 'login'\) setLoginPicking\(true\);\s*\/\/[^\n]*\n\s*setInspector\(name\);/.test(app) && /useEffect\(\(\) => \{ if \(!onLoginRoute\) setLoginPicking\(false\); \}, \[onLoginRoute\]\);/.test(app));
    ok('구독 효과는 범위 문자열에만 매달린다 — [voyScope]', /\}, \[voyScope\]\);/.test(app));
    ok('all → 뿌리 전체 / body: → 본문 하나 / 그 밖 → info 만', /voyScope === 'all'[\s\S]{0,200}fbSubscribeVoyages\(/.test(app) && /voyScope\.startsWith\('body:'\) \? fbSubscribeVoyageBody : \(_k, cb\) => fbSubscribeVoyageInfos\(cb\)/.test(app));
    ok('받은 것은 범위 이름표(scope)를 달고, 범위가 바뀐 렌더에는 옛 것을 쓰지 않는다 — loaded·항차가 같은 렌더에서 일치(감사 주의 1)', /const liveVoy = voyState\.scope === voyScope \? voyState : NO_VOY;/.test(app) && /const voyagesLoaded = liveVoy\.loaded;/.test(app) && !/setVoyagesLoaded/.test(app));
    ok('옛 뿌리 구독(mount 효과의 u1)은 없다', !/const u1 = fbSubscribeVoyages/.test(app) && !/\bu1\(\);/.test(app) && !/setVoyages\(/.test(app));
    ok('scope·all·keys·loaded 는 한 state 로 묶는다(렌더 사이 어긋남 없음)', /const \[voyState, setVoyState\] = useState\(NO_VOY\)/.test(app) && /setVoyState\(\{ scope: voyScope, all, keys, loaded: !!loaded \}\)/.test(app) && /fbSubscribeVoyages\(\(v\) => put\(v, null, true\)\)/.test(app));
    ok('voyages 는 본문이 있는 항차만 — keys 가 null 이면 전부', /const voyages = useMemo\(\(\) => \{\s*if \(!liveVoy\.keys\) return liveVoy\.all;/.test(app));
    ok('선택 화면(LoginPage)·헤더는 info 만 있는 항차까지 보는 voyagesAll', (app.match(/voyages=\{voyagesAll\}/g) || []).length === 2 && /<LoginPage[\s\S]{0,400}voyages=\{voyagesAll\}/.test(app) && /<Header[\s\S]{0,400}voyages=\{voyagesAll\}/.test(app));
    ok('무거운 화면은 본문 있는 항차만 — 홈·건강·보조·미르·항차 화면은 visibleVoyages, 수석 대시보드는 voyages', /<HomePage\s+voyages=\{visibleVoyages\}/.test(app) && /<ChiefDashboard\s+voyages=\{voyages\}/.test(app) && /<HealthPage\s+voyages=\{visibleVoyages\}/.test(app) && /<MirFab voyages=\{visibleVoyages\}/.test(app));
    ok('«내 작업 선박이 아닙니다» 는 항차가 있는지 보지 않고 canSeeVoyage 로 막는다(받지 않은 항차는 있는지 모른다)', /\(voyagesLoaded && !canSeeVoyage\(workChoice, inspector, route\.voyageKey\)\)\s*\/\*/.test(app) && !/voyagesAll\[route\.voyageKey\]/.test(app));
    ok('항차를 받는 중에는 홈·수석 대신 «항차 불러오는 중» + [데이터 새로고침] (폰에서 수석이 로그인하는 순간의 빈 홈 방지 — 감사 주의 3). 건강·검색·보조는 4.07 처럼 그대로 뜬다(항차 없이도 쓰는 화면)', /data-voyages-loading="1"/.test(app) && ['home', 'chief'].every((r) => app.includes("{route.name === '" + r + "' && voyagesLoaded && (")) && ['health', 'search', 'aux'].every((r) => app.includes("{route.name === '" + r + "' && (")) && /onClick=\{handleRefreshData\}/.test(app));
    ok('선택 화면은 «불러오는 중» 과 «항차 없음» 을 구분한다', /voyagesLoaded=\{voyagesLoaded\}/.test(app) && /voyagesLoaded = true/.test(src('src/pages/LoginPage.jsx')) && /!voyagesLoaded \? '항차 목록을 불러오는 중입니다…'/.test(src('src/pages/LoginPage.jsx')));
    ok('훅은 조기 return(잠금 화면) 앞에 있다', app.indexOf('const voyScope = useMemo') > 0 && app.indexOf('const voyScope = useMemo') < app.indexOf('if (lockedName && !isOwnerName(lockedName)) return'));
    const fb = src('src/firebase.js');
    ok('전체 구독·본문 구독이 같은 손질 함수(_postVoyage)를 부른다', /for \(const k of Object\.keys\(v\)\) v\[k\] = _postVoyage\(k, v\[k\]\);/.test(fb) && /callback\(\{ \[k\]: _postVoyage\(k, v\) \}, new Set\(\[k\]\), true\)/.test(fb));
    ok('이번 판 버전 4.08~4.12 계열(-NN 포함)', /APP_VERSION = 'TallyOne 4\.(0[89]|1[012])(-\d\d)?'/.test(src('src/utils.js')));
    ok('연막 중 예상 밖 경고 없음', !warns.some((w) => /반영 실패/.test(w)), warns.join(' | '));
  } catch (e) {
    realTimers(); console.warn = realWarn;
    console.log('  ✘ 연막검사 중 예외 — ' + (e && e.stack || e)); bad += 1; n += 1;
  }
  realTimers(); console.warn = realWarn;
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 폴더 */ }
  console.log(`4.08 연막검사 ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})();
