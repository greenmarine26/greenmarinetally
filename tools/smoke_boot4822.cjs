// 4.82-02 연막검사 — 폰 «평택검수만 뜨고 흰 바탕» 멈춤 대책(서비스워커 응답 없는 네트워크 8초 뒤 저장본 · 진입 html 부팅 감시). 실행 — node tools/smoke_boot4822.cjs [저장소 루트]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(process.argv[2] || process.cwd());
let n = 0, bad = 0;
const ok = (name, cond) => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}`); } };
const swSrc = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
const entry = fs.readFileSync(path.join(ROOT, '_index.entry.html'), 'utf8');
(async () => {
  // ── 서비스워커 — 실제 파일을 vm 에서 돌려 fetch 핸들러를 부른다 ──
  function runSw({ fetchImpl, cacheMap }) {
    const handlers = {};
    const self = { location: { origin: 'https://x.test', href: 'https://x.test/' }, addEventListener: (t, f) => { handlers[t] = f; }, __NET_WAIT_MS: 60, clients: { claim() {}, matchAll: async () => [] }, registration: {} };
    const caches = { match: async (req) => (cacheMap[typeof req === 'string' ? req : req.url] || undefined), keys: async () => [], open: async () => ({ put: async () => {} }), delete: async () => true };
    const ctx = { self, caches, fetch: fetchImpl, URL, console, setTimeout, clearTimeout, Promise };
    vm.runInNewContext(swSrc, ctx);
    return handlers.fetch;
  }
  const call = (h, req) => new Promise((resolve, reject) => { let got = null; h({ request: req, respondWith: (p) => { got = p; } }); Promise.resolve(got).then(resolve, reject); });
  const never = () => new Promise(() => {});
  const nav = { method: 'GET', mode: 'navigate', url: 'https://x.test/' };
  const js = { method: 'GET', mode: 'cors', url: 'https://x.test/assets/index-ABC.js' };
  const img = { method: 'GET', mode: 'cors', url: 'https://x.test/icon-192.png' };
  const cacheMap = { 'https://x.test/': { tag: 'cachedIndex' }, 'https://x.test/assets/index-ABC.js': { tag: 'cachedJs' } };
  let r = await call(runSw({ fetchImpl: never, cacheMap }), nav);
  ok('첫 문서 요청이 응답 없으면 3초(시험은 60ms) 뒤 저장본으로 연다', r && r.tag === 'cachedIndex');
  r = await call(runSw({ fetchImpl: never, cacheMap }), js);
  ok('스크립트 요청도 응답 없으면 저장본', r && r.tag === 'cachedJs');
  r = await call(runSw({ fetchImpl: async () => ({ ok: true, clone() { return this; }, tag: 'net' }), cacheMap }), nav);
  ok('네트워크가 제때 오면 네트워크 응답(새 판 즉시 반영 — 종전 그대로)', r && r.tag === 'net');
  let t0 = Date.now();
  r = await call(runSw({ fetchImpl: () => new Promise((res) => setTimeout(() => res({ ok: true, clone() { return this; }, tag: 'slowNet' }), 200)), cacheMap: {} }), js);
  ok('저장본이 없으면 늦어도 네트워크를 끝까지 기다린다', r && r.tag === 'slowNet' && Date.now() - t0 >= 150);
  r = await call(runSw({ fetchImpl: async () => { throw new Error('offline'); }, cacheMap }), nav);
  ok('네트워크가 아예 실패하면 즉시 저장본(종전 동작 유지)', r && r.tag === 'cachedIndex');
  let imgGot = null;
  const hImg = runSw({ fetchImpl: () => new Promise((res) => setTimeout(() => res({ ok: true, clone() { return this; }, tag: 'imgNet' }), 150)), cacheMap: { 'https://x.test/icon-192.png': { tag: 'cachedImg' } } });
  imgGot = await call(hImg, img);
  ok('그림 같은 뼈대 밖 요청은 8초 규칙을 안 탄다(네트워크를 기다린다)', imgGot && imgGot.tag === 'imgNet');
  //  4.87-04 — 판 고유 글자가 붙은 본체 파일은 저장본이 있으면 통신망을 기다리지 않는다
  const big = { method: 'GET', mode: 'cors', url: 'https://x.test/assets/index-W8EtlTdW.js' };
  let netCalls = 0;
  const slowBody = () => { netCalls += 1; return new Promise((res) => setTimeout(() => res({ ok: true, clone() { return this; }, tag: 'netBig' }), 40)); };
  t0 = Date.now();
  r = await call(runSw({ fetchImpl: slowBody, cacheMap: { 'https://x.test/assets/index-W8EtlTdW.js': { tag: 'cachedBig' } } }), big);
  ok('4.87-04 — 해시 붙은 본체 파일은 저장본이 있으면 바로 저장본(통신망을 부르지도 않는다)', r && r.tag === 'cachedBig' && netCalls === 0 && Date.now() - t0 < 30);
  r = await call(runSw({ fetchImpl: slowBody, cacheMap: {} }), big);
  ok('4.87-04 — 저장본이 없으면 통신망에서 받는다', r && r.tag === 'netBig' && netCalls === 1);
  r = await call(runSw({ fetchImpl: async () => ({ ok: false, status: 404, clone() { return this; }, tag: 'net404' }), cacheMap: {} }), big);
  ok('4.87-04 — 저장본도 없고 서버가 404 면 그 응답을 그대로(종전 동작)', r && r.tag === 'net404');
  r = await call(runSw({ fetchImpl: async () => ({ ok: true, clone() { return this; }, tag: 'netQ' }), cacheMap: { 'https://x.test/assets/index-W8EtlTdW.js': { tag: 'cachedBig' } } }), { method: 'GET', mode: 'cors', url: 'https://x.test/assets/index-W8EtlTdW.js?v=1' });
  ok('4.87-04 — 물음표가 붙은 확인용 요청은 저장본 우선 규칙을 안 탄다', r && r.tag === 'netQ');
  r = await call(runSw({ fetchImpl: async () => ({ ok: true, clone() { return this; }, tag: 'netIdx' }), cacheMap }), nav);
  ok('4.87-04 — 첫 문서는 여전히 통신망 우선(새 판 즉시 반영)', r && r.tag === 'netIdx');
  ok('4.87-04 — 첫 문서를 기다리는 시간은 3초', /const NET_WAIT_MS = 3000;/.test(swSrc));
  ok('POST·외부 출처는 관여하지 않는다(소스)', /method !== 'GET'\) return/.test(swSrc) && /!sameOrigin\) return/.test(swSrc));
  // ── 진입 html 부팅 감시 ──
  ok('진입 html 에 부팅 감시가 모듈 스크립트보다 앞에 있다', entry.indexOf('tally_boot_retry') > 0 && entry.indexOf('tally_boot_retry') < entry.indexOf('type="module"'));
  ok('감시는 12초 · 한 번 자동 재시도 · 두 번째는 다시 불러오기 단추 · 로그인 저장소는 안 지운다', /12000/.test(entry) && /location\.reload\(\)/.test(entry) && /다시 불러오기/.test(entry) && !/localStorage\.clear|indexedDB\.deleteDatabase/.test(entry));
  ok('조용히 실패하지 않는다 — 기록 못 함·워커 해제·캐시 비우기 실패는 콘솔에 남긴다', (entry.match(/console\.warn\('\[부팅 감시\]/g) || []).length >= 4);
  if (fs.existsSync(path.join(ROOT, 'node_modules/jsdom'))) {
    const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));
    const script = entry.match(/<script>([\s\S]*?)<\/script>/)[1];
    const run = (rootHtml, store) => {
      const dom = new JSDOM(`<body>${rootHtml}</body>`, { runScripts: 'outside-only', url: 'https://x.test/' });
      const w = dom.window; let reloads = 0;
      const timers = []; w.setTimeout = (f) => { timers.push(f); return timers.length; }; w.setInterval = () => 0;
      Object.defineProperty(w, 'sessionStorage', { value: { getItem: () => store.v || null, setItem: (k, v) => { store.v = v; } } });
      w.eval(script); timers.forEach((f) => f());
      return { w, reloads, doc: w.document };
    };
    const a = run('<div id="root"></div>', {});
    ok('빈 화면이면 12초 뒤 한 번 자동 재시도(재시도 시각을 남기고 안내 단추는 아직 안 띄움)', !!a.w.sessionStorage.getItem('tally_boot_retry') && !a.doc.querySelector('[data-boot-guard]'));
    ok('백그라운드에서 돌아올 때(visibilitychange)도 같은 점검을 건다', /visibilitychange[\s\S]{0,160}check/.test(entry));
    const st = { v: String(Date.now()) };
    const b = run('<div id="root"></div>', st);
    ok('방금 재시도했으면 단추 안내를 보인다', !!b.doc.querySelector('[data-boot-guard] button'));
    const d = (() => { const dom = new JSDOM('<body><div id="root"></div></body>', { runScripts: 'outside-only', url: 'https://x.test/' }); const w = dom.window; const timers = []; w.setTimeout = (f) => { timers.push(f); return 1; }; w.setInterval = () => 0;
      Object.defineProperty(w, 'sessionStorage', { value: { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } } }); w.eval(script); timers.forEach((f) => f()); return w.document; })();
    ok('저장소가 막혀 기록을 못 남기면 자동 재시도(루프) 없이 안내 단추를 보인다', !!d.querySelector('[data-boot-guard] button'));
    ok('안내 상자는 하나만 만든다·앱 복귀 점검은 12초 뒤부터·신호 없으면 저장본을 안 지운다(소스)', /querySelector\('\[data-boot-guard\]'\)\) return/.test(entry) && /Date\.now\(\) - T0 > 12000/.test(entry) && /navigator\.onLine === false/.test(entry));
    const c = run('<div id="root"><div>앱</div></div>', {});
    ok('화면이 그려져 있으면 아무것도 안 한다', !c.doc.querySelector('[data-boot-guard]'));
  } else console.log('  · jsdom 없음 — 부팅 감시 동작 시험 건너뜀(소스 점검만)');
  console.log(`\n${bad ? '✘' : '✔'} 4.82-02 부팅 대책 연막검사 ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})();
