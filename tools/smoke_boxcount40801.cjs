// 4.08-01 연막검사 — 폰 선박 선택 화면의 «N대» 복원(본문을 안 받고 EDI 컨 수만 REST shallow 로 센다).
//   ① fbFetchVoyageBoxCounts — 주소 모양 · 양하+선적 키 수(종전 «N대» 와 같은 수) · 못 센 항차는 0 이 아니라 빠짐 · 10분 기억 · 8초 시간 끝 · 잘못된 입력
//   ② LoginPage 연결 모양 — 훅이 조기 반환 위 · 본문이 있으면 종전 board 값 그대로(lightOnly 가 아닐 때)
//   firebase.js 는 실소스를 묶고 firebase/* 만 메모리 스텁, 가짜 fetch 가 실데이터 픽스처(DXQD 베이뷰 · SWMM 콘앱 실측)의 shallow 모양으로 답한다 — 실제 네트워크 없음.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'boxcount40801_'));
let n = 0, bad = 0, finished = false;
//  끝줄까지 못 간 채 프로세스가 끝나면(받기가 영영 안 끝나 이벤트가 비는 경우) 실패로 만든다 — 감사 4.08-01: 시간 끝이 고장 나도 exit 0 으로 새던 구멍.
process.on('exit', (code) => { if (!finished) { console.log('  ✘ 연막검사가 끝줄까지 돌지 못했다(받기가 끝나지 않고 멈춤)'); process.exitCode = 1; } });
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const docHandlers = {}, winHandlers = {};
global.window = { addEventListener(t, h) { (winHandlers[t] = winHandlers[t] || []).push(h); }, removeEventListener(t, h) { winHandlers[t] = (winHandlers[t] || []).filter((x) => x !== h); }, dispatchEvent() { return true; }, location: { hostname: 'localhost', search: '' }, innerWidth: 400 };
global.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = {
  visibilityState: 'visible',
  addEventListener(t, h) { (docHandlers[t] = docHandlers[t] || []).push(h); },
  removeEventListener(t, h) { docHandlers[t] = (docHandlers[t] || []).filter((x) => x !== h); },
  dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} }, createElement: () => ({ style: {} }),
};
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }

//  가짜 타이머 — 8초 시간 끝을 우리가 돌린다(실시간 대기 없음).
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
    fs.writeFileSync(path.join(stubDir, 'storage.js'), 'exports.getStorage = () => ({}); exports.ref = () => ({}); exports.uploadBytes = async () => ({}); exports.uploadString = async () => ({}); exports.getDownloadURL = async () => ""; exports.deleteObject = async () => {};\n');
    fs.writeFileSync(path.join(stubDir, 'messaging.js'), 'exports.getMessaging = () => ({}); exports.getToken = async () => ""; exports.deleteToken = async () => {}; exports.onMessage = () => {}; exports.isSupported = async () => false;\n');
    fs.writeFileSync(path.join(stubDir, 'database.js'), `
exports.getDatabase = () => ({});
exports.ref = (db, p) => ({ _p: p || '' });
exports.child = (r, p) => ({ _p: (r._p ? r._p + '/' : '') + p });
exports.onValue = () => () => {};
exports.get = async () => ({ exists: () => false, val: () => null });
exports.set = async () => {}; exports.update = async () => {}; exports.remove = async () => {}; exports.push = (r) => ({ _p: r._p + '/k', key: 'k' });
exports.off = () => {}; exports.goOffline = () => {}; exports.goOnline = () => {};
`);
    const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
    fs.writeFileSync(e, `export { fbFetchVoyageBoxCounts } from "${ROOT}/src/firebase.js";\n`);
    execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
    process.env.NODE_PATH = path.join(TMP, 'node_modules'); require('module').Module._initPaths();
    const M = require(o);
    const fx = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'fixtures', f), 'utf8'));
    const dxqd = fx('bayview_dxqd.json'); delete dxqd._about;
    const swmm = fx('cone402_swmm_real.json');
    const keyCount = (o) => (o && typeof o === 'object' ? Object.keys(o).length : 0);
    //  종전 «N대» 계산(LoginPage board 의 vBoxes) — 새 함수가 같은 수를 내는지 대조하는 기준표
    const oldBoxes = (v) => keyCount(v?.discharge?.ediContainers) + keyCount(v?.loading?.ediContainers);
    const DB = {
      DXQD_2638E: dxqd,
      SWMM_2645E: swmm,
      NOLOAD_1E: { info: { vsl: 'NOLOAD' }, discharge: { ediContainers: { ABCU1234567: { sz: '20' }, ABCU7654321: { sz: '40' } } } },   // 선적 EDI 가 아직 없는 배
      EMPTY_2E: { info: { vsl: 'EMPTY' } },   // EDI 가 둘 다 없는 배
      'ODD KEY/3E': { info: { vsl: 'ODD' }, discharge: { ediContainers: { ZZZU1111111: { sz: '20' } } }, loading: { ediContainers: { ZZZU2222222: { sz: '20' } } } },   // 주소에 넣을 때 인코딩이 필요한 키
    };
    //  가짜 fetch — REST shallow 와 같은 모양(값은 true)으로 답한다. mode: 항차별 실패·정지를 바꾼다.
    const calls = []; const mode = { fail: new Set(), hang: new Set(), badJson: new Set() };
    const shallowOf = (v) => { if (v == null || typeof v !== 'object') return null; const r = {}; for (const k of Object.keys(v)) r[k] = true; return r; };
    global.fetch = (url, init) => {
      calls.push({ url: String(url), signal: init && init.signal });
      const m = String(url).match(/\/voyages\/([^/]+)\/(discharge|loading)\/ediContainers\.json\?shallow=true$/);
      if (!m) return Promise.resolve({ ok: false, status: 404, json: async () => null });
      const key = decodeURIComponent(m[1]), side = m[2];
      if (mode.hang.has(key)) return new Promise((_, rej) => { if (init && init.signal) init.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))); });
      if (mode.fail.has(key)) return Promise.resolve({ ok: false, status: 500, json: async () => null });
      if (mode.badJson.has(key)) return Promise.resolve({ ok: true, status: 200, json: async () => { throw new Error('bad json'); } });
      const body = shallowOf(DB[key] && DB[key][side] && DB[key][side].ediContainers);
      return Promise.resolve({ ok: true, status: 200, json: async () => body });
    };
    const T0 = Date.UTC(2026, 9, 7, 3, 0, 0);

    //  ── ① 실데이터 합 ─────────────────────────────────────
    {
      const out = await M.fbFetchVoyageBoxCounts(['DXQD_2638E', 'SWMM_2645E'], T0);
      ok('DXQD_2638E — 양하 144 + 선적 298 = 442대(픽스처 EDI 키 수)', out.DXQD_2638E === 442, JSON.stringify(out));
      ok('SWMM_2645E — 양하 223 + 선적 191 = 414대', out.SWMM_2645E === 414, JSON.stringify(out));
      ok('종전 «N대» 계산(양하 키 + 선적 키)과 두 배 모두 같은 수', out.DXQD_2638E === oldBoxes(dxqd) && out.SWMM_2645E === oldBoxes(swmm));
      ok('항차마다 양하·선적 두 번만 받는다(4번)', calls.length === 4, String(calls.length));
      const base = 'https://greenmarinetally-default-rtdb.asia-southeast1.firebasedatabase.app/voyages/';
      ok('주소가 …/voyages/{키}/{discharge|loading}/ediContainers.json?shallow=true', calls.every((c) => c.url.startsWith(base) && /\/(discharge|loading)\/ediContainers\.json\?shallow=true$/.test(c.url)), calls.map((c) => c.url).join(' | '));
      ok('컨 본문을 받지 않는다 — 항차 뿌리·전체 노드 주소가 하나도 없다', calls.every((c) => !/\/voyages\.json/.test(c.url) && /ediContainers\.json\?shallow=true$/.test(c.url)));
      const bytes = JSON.stringify(shallowOf(dxqd.discharge.ediContainers)).length + JSON.stringify(shallowOf(dxqd.loading.ediContainers)).length;
      console.log(`  · 참고 — DXQD 한 척 shallow 응답 합 ${bytes}B(컨 442대 · 키 하나 약 ${(bytes / 442).toFixed(0)}B)`);
      ok('shallow 한 척 응답이 컨 한 대당 40B 이하(본문 아님)', bytes / 442 < 40, String(bytes / 442));
    }
    //  ── 한쪽 EDI 가 없거나 둘 다 없는 배 · 인코딩이 필요한 키 ──
    {
      calls.length = 0;
      const out = await M.fbFetchVoyageBoxCounts(['NOLOAD_1E', 'EMPTY_2E', 'ODD KEY/3E'], T0 + 1);
      ok('선적 EDI 없는 배는 양하만 센다(2대)', out.NOLOAD_1E === 2, JSON.stringify(out));
      ok('EDI 둘 다 없는 배는 0(빈 배 표시는 화면이 숨긴다)', out.EMPTY_2E === 0 && ('EMPTY_2E' in out), JSON.stringify(out));
      ok('주소에 못 넣는 글자가 든 키도 인코딩해서 센다(2대)', out['ODD KEY/3E'] === 2 && calls.some((c) => c.url.includes('/voyages/ODD%20KEY%2F3E/')), JSON.stringify(out));
    }
    //  ── ② 못 센 항차는 0 이 아니라 빠진다 · 나머지는 센다 ──
    {
      calls.length = 0; warns.length = 0;
      mode.fail.add('SWMM_2645E'); mode.badJson.add('NOLOAD_1E');
      const out = await M.fbFetchVoyageBoxCounts(['DXQD_2638E', 'SWMM_2645E', 'NOLOAD_1E'], T0 + 11 * 60 * 1000);   // 앞 기억(10분)이 끝난 시각
      ok('HTTP 500 난 항차는 결과에서 빠진다(0 으로 둔갑하지 않는다)', !('SWMM_2645E' in out), JSON.stringify(out));
      ok('JSON 이 깨진 항차도 빠진다', !('NOLOAD_1E' in out), JSON.stringify(out));
      ok('나머지 항차는 정상으로 센다(DXQD 442)', out.DXQD_2638E === 442, JSON.stringify(out));
      ok('못 센 항차마다 경고가 남는다(조용히 삼키지 않는다)', warns.filter((w) => /항차 컨 수/.test(w)).length === 2, warns.join(' | '));
      mode.fail.clear(); mode.badJson.clear();
      //  못 센 것은 기억하지 않는다 — 곧바로 다시 부르면 다시 받아 센다
      calls.length = 0;
      const again = await M.fbFetchVoyageBoxCounts(['DXQD_2638E', 'SWMM_2645E', 'NOLOAD_1E'], T0 + 11 * 60 * 1000 + 1000);
      ok('못 센 항차는 기억하지 않는다 — 다음 호출에서 다시 받아 414·2 로 센다', again.SWMM_2645E === 414 && again.NOLOAD_1E === 2, JSON.stringify(again));
      ok('이미 센 DXQD 는 기억에서 나온다(받은 주소에 DXQD 없음)', !calls.some((c) => c.url.includes('/DXQD_2638E/')), calls.map((c) => c.url).join(' | '));
    }
    //  ── ②-B 가는 중인 받기 공유 — 선박 정보가 한 척씩 도착해 호출이 겹쳐도 같은 항차를 두 번 받지 않는다(감사 4.08-01) ──
    {
      calls.length = 0;
      const t = T0 + 5 * 60 * 60 * 1000;
      const [a, b, c] = await Promise.all([
        M.fbFetchVoyageBoxCounts(['NOLOAD_1E'], t),
        M.fbFetchVoyageBoxCounts(['NOLOAD_1E', 'EMPTY_2E'], t),
        M.fbFetchVoyageBoxCounts(['NOLOAD_1E', 'EMPTY_2E', 'ODD KEY/3E'], t),
      ]);
      ok('세 호출이 겹쳐도 서로 다른 항차 3개 × 양하·선적 = 받기 6번(공유 없으면 12번)', calls.length === 6, String(calls.length));
      ok('겹친 호출이 모두 같은 수를 받는다', a.NOLOAD_1E === 2 && b.NOLOAD_1E === 2 && b.EMPTY_2E === 0 && c['ODD KEY/3E'] === 2, JSON.stringify([a, b, c]));
      //  가는 중 실패는 기억하지 않는다 — 겹쳐 기다린 호출은 같이 빠지고, 다음 호출이 다시 받는다
      calls.length = 0; mode.fail.add('NOLOAD_1E');
      const t2 = t + 20 * 60 * 1000;
      const [f1, f2] = await Promise.all([M.fbFetchVoyageBoxCounts(['NOLOAD_1E'], t2), M.fbFetchVoyageBoxCounts(['NOLOAD_1E'], t2)]);
      ok('겹쳐 기다린 두 호출이 같이 못 센 것으로 빠진다(0 으로 둔갑 없음)', !('NOLOAD_1E' in f1) && !('NOLOAD_1E' in f2), JSON.stringify([f1, f2]));
      mode.fail.clear(); calls.length = 0;
      const f3 = await M.fbFetchVoyageBoxCounts(['NOLOAD_1E'], t2 + 1000);
      ok('가는 중 실패는 지워져 다음 호출이 다시 받아 센다', f3.NOLOAD_1E === 2 && calls.length === 2, JSON.stringify(f3) + ' · ' + calls.length);
    }
    //  ── ③ 10분 기억 ──
    {
      calls.length = 0;
      const t = T0 + 30 * 60 * 1000;
      await M.fbFetchVoyageBoxCounts(['DXQD_2638E', 'SWMM_2645E'], t);
      const first = calls.length;
      calls.length = 0;
      const hit = await M.fbFetchVoyageBoxCounts(['DXQD_2638E', 'SWMM_2645E'], t + 9 * 60 * 1000 + 59 * 1000);
      ok('기억 안(10분 미만)에서는 다시 받지 않고 같은 수를 낸다', calls.length === 0 && hit.DXQD_2638E === 442 && hit.SWMM_2645E === 414, `first ${first} · 다시 ${calls.length} · ${JSON.stringify(hit)}`);
      calls.length = 0;
      const miss = await M.fbFetchVoyageBoxCounts(['DXQD_2638E', 'SWMM_2645E'], t + 10 * 60 * 1000);
      ok('10분이 지나면 다시 받는다(4번)', calls.length === 4 && miss.DXQD_2638E === 442, String(calls.length));
    }
    //  ── ④ 8초 시간 끝 — 서버가 답이 없어도 선택 화면이 멈추지 않는다 ──
    {
      calls.length = 0; warns.length = 0;
      fakeTimers();
      mode.hang.add('SWMM_2645E');
      const p = M.fbFetchVoyageBoxCounts(['DXQD_2638E', 'SWMM_2645E'], T0 + 3 * 60 * 60 * 1000);
      await flush();
      const t8 = timers.filter((x) => x.live && x.ms === 8000).length;
      ok('받기마다 8초 시간 끝 타이머가 걸린다(정지한 항차 둘 포함 대기 중)', t8 >= 2, String(t8));
      fireTimers(8000);
      const out = await Promise.race([p, new Promise((resolve) => realST(() => resolve('__멈춤__'), 3000))]); await flush();
      realTimers();
      if (out === '__멈춤__') throw new Error('8초 시간 끝이 안 먹어 받기가 끝나지 않는다');
      ok('답이 없는 항차는 8초 뒤 끊겨 빠지고 나머지는 센다', !('SWMM_2645E' in out) && out.DXQD_2638E === 442, JSON.stringify(out));
      ok('끊긴 항차 경고가 남는다', warns.some((w) => /SWMM_2645E/.test(w)), warns.join(' | '));
      mode.hang.clear();
    }
    //  ── ⑤ 잘못된 입력 ──
    {
      calls.length = 0;
      const a = await M.fbFetchVoyageBoxCounts(null, T0);
      const b = await M.fbFetchVoyageBoxCounts([], T0);
      const c = await M.fbFetchVoyageBoxCounts(['', null, undefined], T0);
      ok('키가 없거나 비어 있으면 받지 않고 빈 결과', calls.length === 0 && !Object.keys(a).length && !Object.keys(b).length && !Object.keys(c).length);
    }

    //  ── ⑥ 소스 연결 모양 ──────────────────────────────────
    {
      const lp = src('src/pages/LoginPage.jsx');
      const iHook = lp.indexOf('fbFetchVoyageBoxCounts(JSON.parse(voyKeyStr))');
      const iEarly = lp.indexOf('if (choiceName) {');
      ok('LoginPage 가 fbFetchVoyageBoxCounts 를 firebase.js 에서 가져온다', /import \{[^}]*fbFetchVoyageBoxCounts[^}]*\} from '\.\.\/firebase\.js'/.test(lp));
      ok('컨 수 훅이 조기 반환(if (choiceName) {) 위에 있다(훅 순서 보존)', iHook > 0 && iEarly > 0 && iHook < iEarly, `${iHook} < ${iEarly}`);
      ok('이름을 고른 뒤 선박 선택 단계에서, 선박 정보 첫 한 벌이 다 온 뒤(voyagesLoaded)에만 받는다', /if \(!choiceName \|\| choiceStage !== 'vessel' \|\| !lightOnly \|\| !voyagesLoaded\) return undefined;/.test(lp) && /\}, \[choiceName, choiceStage, lightOnly, voyagesLoaded, voyKeyStr\]\);/.test(lp));
      ok('«본문이 하나도 없는 범위»(lightOnly)에서만 새 값을 쓰고, 본문이 있으면 종전 board 값(sh.boxes) 그대로', /const lightOnly = Object\.keys\(voyages \|\| \{\}\)\.length > 0 && Object\.values\(voyages \|\| \{\}\)\.every\(\(v\) => v && !v\.discharge && !v\.loading\);/.test(lp) && /const boxesOf = \(sh\) => \(lightOnly \? \(lightBoxes\[sh\.key\] \|\| 0\) : \(sh\.boxes \|\| 0\)\);/.test(lp));
      ok('선택 화면 줄이 boxesOf 를 쓴다(종전 sh.boxes 직접 사용은 한 곳도 안 남음)', /\{boxesOf\(sh\) \? ` · \$\{boxesOf\(sh\)\}대` : ''\}/.test(lp) && !/\{sh\.boxes \? ` · \$\{sh\.boxes\}대`/.test(lp));
      ok('PC 판(board 의 vBoxes 계산)은 그대로다', /const vBoxes = \(d \? Object\.keys\(d\)\.length : 0\) \+ \(l \? Object\.keys\(l\)\.length : 0\);/.test(lp));
      ok('연결이 끝나면 늦게 온 답을 버린다(alive 가드)', /let alive = true;[\s\S]*?if \(alive\) setLightBoxes\(c \|\| \{\}\)[\s\S]*?return \(\) => \{ alive = false; \};/.test(lp));
      const fb = src('src/firebase.js');
      ok('firebase.js — 새로 만든 받기는 ediContainers shallow 한 곳뿐이고, 항차 뿌리 통째 REST 받기(voyages.json 단독)는 만들지 않았다', (fb.match(/ediContainers\.json\?shallow=true/g) || []).length === 1 && !/fetch\([^)]*\/voyages\.json[`'"]/.test(fb));
      ok('이번 판 버전 4.08-01 이후(4.13 포함)', /APP_VERSION = 'TallyOne 4\.(08-0[1-9]|09(-\d\d)?|1[0123456789](-\d\d)?|2[0123456789](-\d\d)?)'/.test(src('src/utils.js')));
    }
  } catch (e) {
    realTimers();
    bad += 1; console.log('  ✘ 연막검사 자체 오류 — ' + (e && e.stack || e));
  }
  realTimers(); console.warn = realWarn;
  finished = true;
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* */ }
  console.log(`4.08-01 연막검사 ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})();
