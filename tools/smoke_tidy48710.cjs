// 4.87-10 연막검사 — 업데이트 미리받기(sw 설치)·청크 고정(vendor·baydict·PDF 동적)·토스트 위로·아이폰 안전 영역·베이 안내 띠 자리·공지 띠 높이(--bc-h). 실행 — node tools/smoke_tidy48710.cjs <저장소 루트> (빌드 뒤)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(process.argv[2] || process.cwd());
let n = 0, bad = 0;
const ok = (c, m, d = '') => { n += 1; console.log((c ? '  ✓ ' : '  ✗ ') + m + (c || !d ? '' : ' — ' + d)); if (!c) bad += 1; };
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

(async () => {
  // ── ① 서비스워커 설치 단계 미리받기 ─────────────────────────────────────────
  console.log('[1] sw.js — 설치 단계에서 새 index.html 과 본체 파일을 미리 받는다');
  const swSrc = rd('public/sw.js');
  ok(fs.existsSync(path.join(ROOT, 'sw.js')) && rd('sw.js') === swSrc, '루트 sw.js 와 public/sw.js 가 같은 파일이다(빌드가 복사)');
  const runInstall = async ({ fetchImpl, addAllImpl }) => {
    const handlers = {}; const log = { addAll: [], put: [], warn: [], info: [] };
    const cache = { addAll: async (u) => { log.addAll.push(u); if (addAllImpl) await addAllImpl(u); }, put: async (k) => { log.put.push(k); } };
    const self = { location: { origin: 'https://x.test', href: 'https://x.test/' }, addEventListener: (t, f) => { handlers[t] = f; }, clients: { claim() {}, matchAll: async () => [] }, registration: {} };
    const con = { warn: (...a) => log.warn.push(a.join(' ')), info: (...a) => log.info.push(a.join(' ')), log() {}, error() {} };
    const ctx = { self, caches: { open: async () => cache, match: async () => undefined, keys: async () => [], delete: async () => true }, fetch: fetchImpl, URL, console: con, setTimeout, clearTimeout, Promise };
    vm.runInNewContext(swSrc, ctx);
    let p = null; let threw = null;
    handlers.install({ waitUntil: (x) => { p = x; } });
    try { await p; } catch (e) { threw = e; }
    return { log, p, threw, handlers };
  };
  const HTML = '<script type="module" crossorigin src="./assets/index-AAAAAAAA.js"></script><link rel="modulepreload" crossorigin href="./assets/vendor-BBBBBBBB.js"><link rel="modulepreload" crossorigin href="./assets/baydict-CCCCCCCC.js"><link rel="stylesheet" crossorigin href="./assets/index-DDDDDDDD.css"><link rel="manifest" href="./assets/manifest-EEEE.webmanifest">';
  const resOf = (body, status = 200) => ({ ok: status === 200, status, clone() { return resOf(body, status); }, text: async () => body });
  const r_fetch = [];
  let r = await runInstall({ fetchImpl: async (u, o) => { r_fetch.push([u, o]); return resOf(HTML); } });
  ok(!!r.p && !r.threw, 'install 이 waitUntil 로 미리받기를 기다린다(설치 완료 전에 받는다)');
  ok(r_fetch.length === 1 && r_fetch[0][0] === './index.html' && r_fetch[0][1] && r_fetch[0][1].cache === 'no-store', '새 index.html 을 캐시를 거치지 않고 받는다', JSON.stringify(r_fetch));
  const got = (r.log.addAll[0] || []).slice().sort();
  ok(JSON.stringify(got) === JSON.stringify(['./assets/baydict-CCCCCCCC.js', './assets/index-AAAAAAAA.js', './assets/index-DDDDDDDD.css', './assets/vendor-BBBBBBBB.js']), 'index.html 안의 assets/*.js·*.css 전부(본체·vendor·baydict·css)를 cache.addAll 로 받는다(매니페스트는 안 받는다)', JSON.stringify(got));
  ok(r.log.put.includes('./index.html'), '본체를 다 받은 뒤 index.html 도 저장본에 넣는다(3초 뒤 저장본 길에서 새 판 뼈대가 열린다)');
  ok(r.log.info.some((s) => /미리받기 완료/.test(s)), '성공도 콘솔에 남긴다');
  r = await runInstall({ fetchImpl: async () => { throw new Error('offline'); } });
  ok(!r.threw && r.log.warn.some((s) => /미리받기 실패/.test(s) && /offline/.test(s)), '통신 실패 — 설치는 계속(거부 안 함)하고 사유를 콘솔에 남긴다', JSON.stringify(r.log.warn));
  r = await runInstall({ fetchImpl: async () => resOf(HTML), addAllImpl: async () => { throw new Error('404 vendor'); } });
  ok(!r.threw && r.log.warn.some((s) => /미리받기 실패/.test(s) && /404 vendor/.test(s)) && !r.log.put.includes('./index.html'), '본체 하나라도 못 받으면 index.html 을 저장하지 않고(옛 본체와 어긋나지 않게) 사유를 남긴다');
  r = await runInstall({ fetchImpl: async () => resOf('', 500) });
  ok(!r.threw && r.log.warn.some((s) => /500/.test(s)), 'index.html 이 500 이면 사유(응답 코드)를 남긴다');
  r = await runInstall({ fetchImpl: async () => resOf('<html></html>') });
  ok(!r.threw && r.log.warn.some((s) => /본체 파일을 못 찾음/.test(s)), 'index.html 에 본체가 없으면 조용히 넘어가지 않는다');
  ok(!/self\.skipWaiting\(\)\s*;?\s*\}\);\s*\n\s*self\.addEventListener\('activate'/.test(swSrc) && /if \(e\.data\.type === 'SKIP_WAITING'\) self\.skipWaiting\(\)/.test(swSrc), '설치 즉시 활성화하지 않는다(1.30 — 배너의 [지금 적용] 만 SKIP_WAITING)');

  // ── 빌드본 ───────────────────────────────────────────────────────────────
  const idx = rd('index.html');
  const refs = [...idx.matchAll(/<(?:script|link)[^>]*(?:src|href)="\.\/(assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
  const swRe = /(?:src|href)="\.\/(assets\/[^"?#]+\.(?:js|css))"/g;
  const swFound = [...idx.matchAll(swRe)].map((m) => m[1]);
  ok(refs.length >= 4 && refs.every((f) => swFound.includes(f)), '실제 빌드 index.html 에서 sw 정규식이 부르는 파일 전부를 찾는다', `${refs.join(',')} / ${swFound.join(',')}`);
  ok(refs.every((f) => fs.existsSync(path.join(ROOT, f))), 'index.html 이 부르는 js·css 가 assets/ 에 전부 있다', refs.filter((f) => !fs.existsSync(path.join(ROOT, f))).join(','));

  // ── ②③ 청크 고정 ─────────────────────────────────────────────────────────
  console.log('[2] 청크 — vendor·baydict 를 본체에서 떼고, PDF 해석기는 누를 때만');
  const vc = rd('vite.config.js');
  ok(/manualChunks\(id\)/.test(vc) && /return 'vendor'/.test(vc) && /return 'baydict'/.test(vc), 'vite.config.js 에 manualChunks(vendor·baydict)');
  const vend = refs.find((f) => /^assets\/vendor-[\w-]+\.js$/.test(f));
  const bay = refs.find((f) => /^assets\/baydict-[\w-]+\.js$/.test(f));
  const main = refs.find((f) => /^assets\/index-[\w-]+\.js$/.test(f));
  ok(!!vend && !!bay && !!main, 'index.html 이 본체·vendor·baydict 를 부른다', refs.join(','));
  const A = fs.readdirSync(path.join(ROOT, 'assets'));
  const head = (f) => fs.readFileSync(path.join(ROOT, 'assets', f), 'utf8').slice(0, 600);
  if (vend && bay && main) {
    const V = fs.readFileSync(path.join(ROOT, vend), 'utf8'), B = fs.readFileSync(path.join(ROOT, bay), 'utf8'), M = fs.readFileSync(path.join(ROOT, main), 'utf8');
    ok(!/from"\.\/index-/.test(V) && !/import\(["']\.\/index-/.test(V), 'vendor 가 본체를 거꾸로 부르지 않는다(본체 해시에 안 묶인다)');
    ok(!/from"\.\//.test(B.slice(0, 400)), 'baydict 는 아무 청크도 import 하지 않는다(사전만 — 해시가 사전이 바뀔 때만 바뀐다)');
    ok(/react/.test(V) && /firebase/i.test(V), 'vendor 에 react·firebase 가 들어 있다');
    ok(!/4\.10\.38/.test(M) && !/4\.10\.38/.test(V), 'pdfjs-dist(4.10.38) 가 본체·vendor 에 없다(동적 청크 — 본체의 GlobalWorkerOptions 는 mixerUpload 의 CDN 3.11 경로)');
    //  4.88: «이번 판» 은 판이 오를 때마다 바뀐다 — utils.APP_VERSION 을 읽어 그 글자가 본체에 있는지 본다(4.87-10 을 박아 두면 다음 판에서 거짓 실패).
    const _ver = (fs.readFileSync(path.join(ROOT, 'src/utils.js'), 'utf8').match(/^export const APP_VERSION = '([^']+)'/m) || [])[1] || '4.87-10';
    ok(M.includes(_ver), `본체에 이번 판 문자열(${_ver})`);
    ok(M.length < 5 * 1024 * 1024, `본체가 5MB 아래(${(M.length / 1048576).toFixed(2)}MB — 4.87-09 는 5.79MB)`);
  }
  // 4.87-10: assets 에는 직전 판 묶음이 한 판 더 남아 있다(build.sh 3.60-06) — 이번 판 본체·tallyExcel 이 실제로 부르는 exceljs 를 고른다.
  const _M = main ? fs.readFileSync(path.join(ROOT, main), 'utf8') : '';
  const _tx = A.find((f) => /^tallyExcel-[\w-]+\.js$/.test(f) && _M.includes(f));
  const _txSrc = _tx ? fs.readFileSync(path.join(ROOT, 'assets', _tx), 'utf8') : _M;
  const ex = A.find((f) => /^exceljs\.min-[\w-]+\.js$/.test(f) && (_txSrc.includes(f) || _M.includes(f)));
  ok(!!ex && !/\.\/index-/.test(head(ex)), 'exceljs 청크가 본체(index-<해시>)가 아니라 vendor 의 공용 도우미를 부른다(본체가 바뀌어도 이름 유지)', ex ? head(ex).slice(0, 120) : '없음');
  const pdfChunk = A.filter((f) => /\.js$/.test(f) && !/^index-/.test(f)).find((f) => /4\.10\.38/.test(fs.readFileSync(path.join(ROOT, 'assets', f), 'utf8')) && /GlobalWorkerOptions/.test(fs.readFileSync(path.join(ROOT, 'assets', f), 'utf8')));
  ok(!!pdfChunk, 'PDF 해석기(pdfjs-dist)가 따로 떨어진 동적 청크다', pdfChunk || '없음');
  ok(!refs.some((f) => /exceljs|xlsx|tallyExcel/.test(f)) && (!pdfChunk || !refs.includes('assets/' + pdfChunk)), '첫 화면은 엑셀·PDF 청크를 미리 부르지 않는다');
  const smb = rd('src/components/ShipMatrixBuilderModal.jsx');
  ok(!/^import [^\n]*pdfBayParser/m.test(smb) && /await import\('\.\.\/pdfBayParser\.js'\)/.test(smb), 'ShipMatrixBuilderModal 이 pdfBayParser 를 동적 import 한다(정적 import 0)');
  ok(A.filter((f) => /^index-[\w-]+\.js$/.test(f)).length >= 1, 'build.sh 가 집는 본체 이름(index-*.js)은 그대로');

  // ── ④ 토스트 ────────────────────────────────────────────────────────────
  console.log('[4] 토스트 — 머리띠 바로 밑, 탭하면 닫힘');
  const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));
  {
    const dom = new JSDOM('<body></body>', { runScripts: 'outside-only', url: 'https://x.test/' });
    const w = dom.window; w.requestAnimationFrame = (f) => f();
    const src = rd('src/toast.js').replace(/^export /gm, '');
    w.eval(src + '\nwindow.__showToast = showToast;');
    w.__showToast('확인했습니다');
    const root = w.document.querySelector('[data-toast-root]');
    const st = root ? root.getAttribute('style') : '';
    ok(!!root && /top:\s*calc\(var\(--hdr-h, 56px\) \+ 8px\)/.test(st) && !/bottom:\s*24px/.test(st), '토스트 자리 = top calc(var(--hdr-h, 56px) + 8px) · 아래 24px 아님', st);
    const el = root && root.firstChild;
    ok(!!el && el.textContent === '확인했습니다', '글이 뜬다');
    let gone = false; const t0 = Date.now();
    el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await new Promise((res) => setTimeout(res, 260)); gone = !el.parentNode;
    ok(gone && Date.now() - t0 < 2000, '탭하면 즉시 닫힌다(종전 그대로)');
  }

  // ── ⑤ 아이폰 안전 영역 ───────────────────────────────────────────────────
  console.log('[5] 아이폰 안전 영역(viewport-fit=cover)');
  ok(/viewport-fit=cover/.test(rd('_index.entry.html')) && /viewport-fit=cover/.test(idx), '진입·빌드 html 둘 다 viewport-fit=cover');
  const hdr = rd('src/components/Header.jsx');
  ok(/<header ref=\{hdrRef\}[^>]*paddingTop: 'env\(safe-area-inset-top, 0px\)'/.test(hdr), '머리띠(hdrRef 를 잰 그 요소)에 padding-top env(safe-area-inset-top) — --hdr-h 가 윗막대만큼 커진다');
  ok(/setProperty\('--hdr-h', `\$\{Math\.round\(el\.getBoundingClientRect\(\)\.height\)\}px`\)/.test(hdr), '--hdr-h 는 머리띠 실제 높이(getBoundingClientRect — 여백 포함)에서 정한다');
  const wf = rd('src/components/WorkFrame.jsx');
  ok(/style=\{\{ height: '100dvh', margin: 0, paddingTop: 'env\(safe-area-inset-top, 0px\)', paddingBottom: 'env\(safe-area-inset-bottom, 0px\)' \}\} data-workframe/.test(wf), 'WorkFrame 전체화면 틀 위·아래');
  const bv = rd('src/components/BayViewWork.jsx');
  ok(/data-bayview="view"[^>]*paddingTop: 'env\(safe-area-inset-top, 0px\)', paddingBottom: 'env\(safe-area-inset-bottom, 0px\)'/.test(bv), 'BayViewWork 작업 틀 위·아래');
  ok(/data-bayview="pick" style=\{\{ paddingBottom: 'env\(safe-area-inset-bottom, 0px\)' \}\}/.test(bv) && /sticky top-0 z-10[^>]*paddingTop: 'calc\(env\(safe-area-inset-top, 0px\) \+ 0\.5rem\)'/.test(bv), 'BayViewWork 고르기 틀 — 아래는 틀, 위는 붙박이 머리줄');
  for (const f of ['ContainerDetailModal', 'ExtraContainerModal', 'ISO403PhotoModal', 'PhotoReportModal']) {
    const s = rd(`src/components/${f}.jsx`);
    const rows = s.match(/<div className="[^"]*sticky bottom-0[^"]*"[^>]*>/g) || [];
    ok(rows.length >= 1 && rows.every((x) => /paddingBottom: 'calc\(0\.75rem \+ env\(safe-area-inset-bottom, 0px\)\)'/.test(x)), `${f} 바닥 단추 줄 padding-bottom 에 아래 막대`, rows.join(' | '));
  }
  const mf = rd('src/components/MirFab.jsx'), stb = rd('src/components/ScrollTopButton.jsx'), fa = rd('src/components/Ferry1700Alert.jsx');
  ok(/data-mir-sheet="1"[\s\S]{0,400}paddingBottom: 'calc\(1rem \+ env\(safe-area-inset-bottom, 0px\)\)'/.test(mf), '미르 시트 입력줄·답 아래에 아래 막대');
  const mirB = +((mf.match(/bottom: 'calc\((\d+)px \+ env\(safe-area-inset-bottom, 0px\)\)'/) || [])[1] || 0);
  const topB = /fixed bottom-5 right-4 z-40 w-12 h-12/.test(stb) && /bottom: 'calc\(1\.25rem \+ env\(safe-area-inset-bottom, 0px\)\)'/.test(stb) ? 20 : -1;
  ok(topB === 20 && mirB > 0 && mirB - (topB + 48) >= 16, `미르 얼굴과 TOP 간격 ${mirB - (topB + 48)}px(≥16) · 둘 다 아래 막대만큼 올라간다`);
  ok(/data-f1700-chip="1"[\s\S]{0,300}bottom: 'calc\(1\.25rem \+ env\(safe-area-inset-bottom, 0px\)\)'/.test(fa), '보고 보관 칩도 아래 막대만큼');
  const allJs = A.filter((f) => /\.js$/.test(f)).map((f) => fs.readFileSync(path.join(ROOT, 'assets', f), 'utf8')).join('\n');
  ok(/safe-area-inset-top/.test(allJs) && /safe-area-inset-bottom/.test(allJs), '빌드본에 safe-area-inset 이 실렸다');

  // ── ⑥⑦ 베이 안내 띠·공지 띠 높이 ────────────────────────────────────────
  console.log('[6·7] 베이 이동·맞교환 안내 띠 자리 · 공지 띠 높이 --bc-h');
  const bp = rd('src/components/BayPlan.jsx');
  const TOP = 'top-[calc(var(--hdr-h,52px)_+_var(--bc-h,0px)_+_var(--dock-h,68px)_+_4px)]';
  ok(!/className="[^"]*sticky top-0/.test(bp), 'BayPlan 에 sticky top-0 이 없다(이동·맞교환 띠가 머리띠 뒤로 안 숨는다)');
  ok(bp.split(`sticky ${TOP}`).length - 1 === 3, '이동 띠·맞교환 띠·도구줄 셋이 같은 top 식(머리띠 + 공지 띠 + 독 + 4px)');
  const vp = rd('src/pages/VoyagePage.jsx');
  ok(/hud-dock mb-3 sticky top-\[calc\(var\(--hdr-h,52px\)_\+_var\(--bc-h,0px\)\)\]/.test(vp), '항차 독 top = 머리띠 + 공지 띠');
  const cssRel = (idx.match(/href="\.\/(assets\/index-[\w-]+\.css)"/) || [])[1];
  const css = cssRel ? fs.readFileSync(path.join(ROOT, cssRel), 'utf8') : '';
  ok(css.includes('top:calc(var(--hdr-h,52px) + var(--bc-h,0px) + var(--dock-h,68px) + 4px)') && css.includes('top:calc(var(--hdr-h,52px) + var(--bc-h,0px))'), '빌드 CSS 에 두 top 식이 규칙으로 실렸다(Tailwind 가 만들었다)');
  {
    const esbuild = require(path.join(ROOT, 'node_modules/esbuild'));
    const stub = { name: 'fbstub', setup(b) { b.onResolve({ filter: /firebase\.js$/ }, () => ({ path: 'fbstub', namespace: 'fbstub' })); b.onLoad({ filter: /.*/, namespace: 'fbstub' }, () => ({ contents: 'export function fbSubscribeBroadcast(cb){ globalThis.__bcSet = cb; cb(globalThis.__bc || null); return () => {}; } export function fbMarkBroadcastRead(){ globalThis.__bcRead = (globalThis.__bcRead||0)+1; }', loader: 'js' })); } };
    const out = await esbuild.build({ stdin: { contents: "export { default as BM } from './src/components/BroadcastMarquee.jsx'; export { createElement } from 'react'; export { act } from 'react'; export { createRoot } from 'react-dom/client';", resolveDir: ROOT, loader: 'js' }, bundle: true, platform: 'browser', format: 'iife', globalName: '__BMX', write: false, jsx: 'automatic', loader: { '.jsx': 'jsx', '.js': 'jsx' }, define: { 'process.env.NODE_ENV': '"development"' }, plugins: [stub], logLevel: 'error' });
    const dom = new JSDOM('<body><div id="r"></div></body>', { runScripts: 'outside-only', url: 'https://x.test/' });
    const w = dom.window; w.IS_REACT_ACT_ENVIRONMENT = true; w.MessageChannel = MessageChannel;   // jsdom 에 없는 것 — React 스케줄러가 쓴다
    w.Element.prototype.getBoundingClientRect = function () { return { height: this.getAttribute && this.getAttribute('data-broadcast-bar') ? 34 : 0, width: 0, top: 0, left: 0, right: 0, bottom: 0 }; };
    w.__bc = { id: 'b1', text: '오늘 18시 안전 교육', by: '수석' };
    const errs = []; w.console.error = (...a) => errs.push(a.join(' '));
    w.eval(out.outputFiles[0].text);
    const X = w.__BMX; const root = X.createRoot(w.document.getElementById('r'));
    const bc = () => w.document.documentElement.style.getPropertyValue('--bc-h');
    await X.act(async () => { root.render(X.createElement(X.BM, { inspector: '클로드' })); });
    ok(bc() === '34px' && !!w.document.querySelector('[data-broadcast-bar]'), '공지가 떠 있으면 --bc-h = 띠 실제 높이(34px)', bc());
    const btn = [...w.document.querySelectorAll('button')].find((b) => /확인/.test(b.textContent));
    await X.act(async () => { btn.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); });
    ok(bc() === '0px' && !w.document.querySelector('[data-broadcast-bar]'), '«확인» 을 누르면 띠가 걷히고 --bc-h = 0px', bc());
    await X.act(async () => { root.render(X.createElement(X.BM, { inspector: '' })); });
    ok(bc() === '0px', '로그인 전(띠 없음)에도 0px', bc());
    await X.act(async () => { root.unmount(); });
    ok(!errs.some((e) => /Rules of Hooks|rendered more hooks|fewer hooks/i.test(e)), '훅 순서 오류 없음(보이고 걷힐 때 훅 수가 같다)', errs.join(' | ').slice(0, 300));
  }

  console.log(bad ? `\n✗ 4.87-10 연막 ${bad}/${n} 실패` : `\n✓ 4.87-10 연막 ${n}개 전부 통과`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('✗ 4.87-10 연막검사가 죽었다', e); process.exit(1); });
