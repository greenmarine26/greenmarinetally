// 4.08-01 렌더 연막검사 — 실소스 LoginPage 를 jsdom 에 그려 폰 선박 선택 화면의 «N대» 를 읽는다(검수사 «N대 되돌려라» · 감사가 지적한 «연결 모양은 정규식만 있다» 보강).
//   ① 일반 검수원(본문 없음 · info 만): 선택 화면에 442대·414대(실데이터 DXQD · SWMM) ② 선박 정보가 한 척씩 도착(loaded=false)해도 받기 폭주 없음 — 다 온 뒤에만, 항차×2 번
//   ③ 늦게 올라온 새 항차는 그 항차만 받는다 ④ 본문이 있는 범위(수석·PC 전체)는 받기 0 · 종전 board 값 그대로 ⑤ 한 항차만 못 센 경우 그 배 배지만 빈다 ⑥ 키에 «|» 같은 글자가 있어도 센다
//   firebase.js 는 실소스, firebase SDK 만 메모리 스텁. 가짜 fetch 가 실데이터 픽스처의 shallow 모양으로 답한다.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
process.env.TZ = 'Asia/Seoul';
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'boxcount40801r_'));
let n = 0, bad = 0, finished = false;
process.on('exit', () => { if (!finished) { console.log('  ✘ 렌더 연막검사가 끝줄까지 돌지 못했다'); process.exitCode = 1; } });
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    const e = path.join(TMP, 'e.jsx'), o = path.join(TMP, 'b.cjs');
    fs.writeFileSync(e, `import React from "${ROOT}/node_modules/react/index.js";\nimport { createRoot } from "${ROOT}/node_modules/react-dom/client.js";\nimport LoginPage from "${ROOT}/src/pages/LoginPage.jsx";\nexport { React, createRoot, LoginPage };\n`);
    execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --external:jsdom --loader:.png=dataurl --loader:.json=json --loader:.webp=dataurl --loader:.jsx=jsx --jsx=automatic --define:process.env.NODE_ENV='"development"' --alias:pdfjs-dist/build/pdf="${ROOT}/tools/stub_pdfjs.js" --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });

    const { JSDOM } = require(path.join(ROOT, 'node_modules', 'jsdom'));
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://x/' });
    const w = dom.window;
    global.window = w; global.document = w.document; global.navigator = w.navigator; global.HTMLElement = w.HTMLElement; global.localStorage = w.localStorage; global.sessionStorage = w.sessionStorage;
    global.CustomEvent = w.CustomEvent; global.Event = w.Event; global.MouseEvent = w.MouseEvent; global.location = w.location; global.history = w.history;
    global.requestAnimationFrame = (cb) => setTimeout(cb, 0); global.cancelAnimationFrame = clearTimeout; global.IS_REACT_ACT_ENVIRONMENT = false;
    w.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }); global.matchMedia = w.matchMedia;
    w.scrollTo = () => {};
    process.env.NODE_PATH = path.join(TMP, 'node_modules'); require('module').Module._initPaths();

    const fx = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'fixtures', f), 'utf8'));
    const dxqd = fx('bayview_dxqd.json'); delete dxqd._about; const swmm = fx('cone402_swmm_real.json');
    const clone = (x) => JSON.parse(JSON.stringify(x));
    const d = new Date(); const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const plan = (a, b) => `${ymd} ${a} ~ ${ymd} ${b}`;
    //  항차 본문(전체) — 키마다 실데이터 본문을 복사하고 info 만 바꾼다. 컨 수는 DXQD 442 · SWMM 414.
    const BODY = {};
    const mkBody = (key, src, vsl, pier, a, b) => { const x = clone(src); x.info = { ...x.info, vsl, pier, planDate: plan(a, b), berth: pier === 'PCTC' ? '동부두 6번선석' : '입파도정박지' }; BODY[key] = x; };
    mkBody('DXQD_2638E', dxqd, 'DXQD', 'PNCT', '14:00', '23:00');
    mkBody('SWMM_2645E', swmm, 'SWMM', 'PCTC', '13:00', '22:00');
    for (const [k, v] of [['AAAA_1E', 'AAAA'], ['BBBB_2E', 'BBBB'], ['CCCC_3E', 'CCCC'], ['DDDD_4E', 'DDDD'], ['EEEE_5E', 'EEEE'], ['FFFF_6E', 'FFFF'], ['GGGG_7E', 'GGGG'], ['A|B_8E', 'ABAR']]) mkBody(k, swmm, v, 'PCTC', '13:00', '22:00');
    const light = (keys) => Object.fromEntries(keys.map((k) => [k, { info: clone(BODY[k].info) }]));
    const full = (keys) => Object.fromEntries(keys.map((k) => [k, clone(BODY[k])]));
    const keyN = (o) => (o && typeof o === 'object' ? Object.keys(o).length : 0);

    let calls = [], failKey = null;
    global.fetch = async (url) => {
      calls.push(String(url));
      const m = String(url).match(/\/voyages\/([^/]+)\/(discharge|loading)\/ediContainers\.json\?shallow=true$/);
      if (!m) throw new Error('fetch 차단 ' + url);
      const key = decodeURIComponent(m[1]);
      await sleep(5);
      if (key === failKey) return { ok: false, status: 500, json: async () => null };
      const o2 = BODY[key] && BODY[key][m[2]] && BODY[key][m[2]].ediContainers;
      const b = o2 ? Object.fromEntries(Object.keys(o2).map((k) => [k, true])) : null;
      return { ok: true, status: 200, json: async () => b };
    };
    const warns = []; const realWarn = console.warn; console.warn = (...a) => warns.push(a.map(String).join(' ').slice(0, 200));
    const errs = []; const realErr = console.error; console.error = (...a) => errs.push(a.map(String).join(' ').slice(0, 300));
    const { React, createRoot, LoginPage } = require(o);
    const props = (voyages, loaded) => ({ current: '', inspectors: {}, extraStaff: {}, deletedStaff: {}, onSelect() {}, voyages, voyagesLoaded: loaded, pilotForecast: {}, choiceFor: 'TEST일반', onCancelChoice() {} });
    const picker = () => [...document.querySelectorAll('button')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()).filter((t) => /(DXQD|SWMM|AAAA|BBBB|CCCC|DDDD|EEEE|FFFF|GGGG|ABAR) \d/.test(t));
    const badge = (vsl) => { const t = picker().find((x) => x.startsWith(vsl + ' ')); const m = t && t.match(/ · (\d+)대/); return t ? (m ? Number(m[1]) : 0) : null; };   // 배 없음 null · 배지 없음 0
    const mount = () => { document.getElementById('root').innerHTML = ''; calls = []; return createRoot(document.getElementById('root')); };
    const EDI = (k) => keyN(BODY[k].discharge && BODY[k].discharge.ediContainers) + keyN(BODY[k].loading && BODY[k].loading.ediContainers);

    //  ① 일반 검수원 — info 만 · 첫 한 벌 도착 뒤
    {
      const root = mount();
      root.render(React.createElement(LoginPage, props(light(['DXQD_2638E', 'SWMM_2645E']), true)));
      await sleep(120);
      ok('① 선택 화면에 DXQD 442대 · SWMM 414대가 다시 뜬다(실데이터)', badge('DXQD') === 442 && badge('SWMM') === 414, JSON.stringify(picker()));
      ok('① 종전 계산(양하+선적 EDI 키 수)과 같은 수', badge('DXQD') === EDI('DXQD_2638E') && badge('SWMM') === EDI('SWMM_2645E'));
      ok('① 받기는 항차 2척 × 양하·선적 = 4번 · 전부 shallow 주소', calls.length === 4 && calls.every((c) => /ediContainers\.json\?shallow=true$/.test(c)), String(calls.length));
      root.unmount();
    }
    //  ② 선박 정보가 한 척씩 도착 — loaded=false 동안은 받지 않고, 다 온 뒤 한 번만 항차×2
    {
      const root = mount();
      const ks = ['AAAA_1E', 'BBBB_2E', 'CCCC_3E'];
      for (let i = 1; i <= ks.length; i++) { root.render(React.createElement(LoginPage, props(light(ks.slice(0, i)), false))); await sleep(15); }
      ok('② 첫 한 벌이 다 오기 전(loaded=false)에는 한 번도 받지 않는다', calls.length === 0, String(calls.length));
      root.render(React.createElement(LoginPage, props(light(ks), true)));
      await sleep(120);
      ok('② 다 온 뒤 항차 3척 × 2 = 6번만 받고 세 배지가 다 뜬다', calls.length === 6 && ks.every((k) => badge(k.slice(0, 4)) === 414), `${calls.length} · ${JSON.stringify(picker())}`);
      //  ③ 늦게 올라온 새 항차(loaded 유지) — 그 항차만 받는다
      calls.length = 0;
      root.render(React.createElement(LoginPage, props(light([...ks, 'DDDD_4E']), true)));
      await sleep(120);
      ok('③ 늦게 올라온 DDDD 만 받는다(2번) · 앞 세 척은 기억에서', calls.length === 2 && calls.every((c) => c.includes('/DDDD_4E/')) && badge('DDDD') === 414 && badge('AAAA') === 414, `${calls.length} · ${calls[0] || ''}`);
      root.unmount();
    }
    //  ④ 본문이 있는 범위(수석·PC 전체 구독) — 받기 0 · 종전 board 값
    {
      const root = mount();
      root.render(React.createElement(LoginPage, props(full(['EEEE_5E']), true)));
      await sleep(120);
      ok('④ 본문이 있으면 받기 0번 · 배지는 board 가 센 값(414)', calls.length === 0 && badge('EEEE') === 414, `${calls.length} · ${JSON.stringify(picker())}`);
      root.unmount();
    }
    //  ⑤ 한 항차만 못 센 경우
    {
      const root = mount(); failKey = 'FFFF_6E'; warns.length = 0;
      root.render(React.createElement(LoginPage, props(light(['FFFF_6E', 'GGGG_7E']), true)));
      await sleep(120);
      ok('⑤ 못 센 FFFF 는 배지가 비고(0대 아님) 같이 센 GGGG 는 414대', badge('FFFF') === 0 && badge('GGGG') === 414 && picker().some((x) => x.startsWith('FFFF ')), JSON.stringify(picker()));
      ok('⑤ 못 센 항차 경고가 남는다', warns.some((x) => /FFFF_6E/.test(x)), warns.join(' | '));
      failKey = null; root.unmount();
    }
    //  ⑥ 키에 «|» 가 들어 있어도(키 목록을 글자로 잇고 자르던 때는 조용히 사라지던 것)
    {
      const root = mount();
      root.render(React.createElement(LoginPage, props(light(['A|B_8E']), true)));
      await sleep(120);
      ok('⑥ 키에 «|» 가 있어도 센다(414대)', badge('ABAR') === 414 && calls.some((c) => c.includes('/voyages/A%7CB_8E/')), `${JSON.stringify(picker())} · ${calls[0] || ''}`);
      root.unmount();
    }
    ok('렌더 중 예상 밖 오류 로그 없음', errs.filter((x) => /Rendered (more|fewer) hooks|Cannot read|is not a function/.test(x)).length === 0, errs.slice(0, 2).join(' | '));
    console.warn = realWarn; console.error = realErr;
  } catch (e) {
    bad += 1; console.log('  ✘ 렌더 연막검사 자체 오류 — ' + (e && e.stack || e));
  }
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* */ }
  finished = true;
  console.log(`4.08-01 렌더 연막검사 ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})();
