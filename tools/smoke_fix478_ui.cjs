// 4.78 화면 연막검사 — 자동 가이드 갈림 칩 줄에 «트윈부터 N · 싱글부터 N» 이 그려지고, 누르면 보라색(활성)·«○ 우선 중»·첫 카드가 바뀐다.
//   실소스 항차 화면(VoyagePage → GuidedWorkPanel)을 jsdom 에서 그리고 검수원 손 그대로 누른다. Firebase 는 메모리 스텁(tools/stub_fbdb_mem.js — 실제 쓰기 없음).
//   자료 = tools/fixtures/kklc2610n_lastdeck.json(KKLC 2610N 양하 보관본 GET 사본). 마지막 데크에서 위 싱글 39-07-86 까지 내린 때(남은 것: 트윈 37+39-07-84 · 싱글 39-05-84) 를 만든다.
//   실행 — node tools/smoke_fix478_ui.cjs [저장소 루트] [스크린샷 폴더]. 실패하면 빌드를 세운다.
'use strict';
process.env.TZ = 'Asia/Seoul';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const ROOT = path.resolve(process.argv[2] || process.cwd());
const SHOT = process.argv[3] || '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + String(detail).slice(0, 400) : ''}`); } };

(async () => {
  const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : os.tmpdir(), 'fx478_'));
  const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/kklc2610n_lastdeck.json'), 'utf8'));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const vk = FX.key;
  //  위 싱글 39-07-86(SEKU1370180) 까지 내린 뒤 — 남은 것은 트윈 37+39-07-84 와 싱글 39-05-84 둘뿐(둘 다 지금 할 수 있다)
  const remainCns = ['BEAU2297940', 'SEKU1384558', 'TEMU0398517'];
  const completed = {}; for (const [cn, r] of Object.entries(FX.discharge.completed)) if (!remainCns.includes(cn)) completed[cn] = clone(r);
  const voyage = { key: vk, info: clone(FX.info), discharge: { ediContainers: clone(FX.discharge.ediContainers), completed }, loading: { ediContainers: {}, completed: {} } };

  const ent = path.join(TMP, 'fx478ui.jsx'), out = path.join(TMP, 'fx478ui.js');
  fs.writeFileSync(ent, [
    `import React from "${ROOT}/node_modules/react/index.js";`,
    `import { createRoot } from "${ROOT}/node_modules/react-dom/client.js";`,
    `import VoyagePage from "${ROOT}/src/pages/VoyagePage.jsx";`,
    `let root = null; const el = (v, key) => React.createElement(VoyagePage, { voyageKey: key, voyage: v, inspector: '연막', inspectors: [], portMisData: {}, pilotForecast: {}, onGoHome() {}, onModeChange() {}, initModeOverride: 'discharge' });`,
    `window.__go = (json, key) => { root = createRoot(document.getElementById('root')); root.render(el(JSON.parse(json), key)); };`,
  ].join('\n'));
  const stub = './tools/stub_fbdb_mem.js';
  execSync(`npx esbuild "${ent}" --bundle --loader:.jsx=jsx --loader:.js=jsx --loader:.png=dataurl --loader:.json=json --jsx=automatic --external:fs --external:path --external:url --alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --alias:pdfjs-dist/build/pdf=${ROOT}/tools/stub_pdfjs.js --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${out}"`, { cwd: ROOT, stdio: 'pipe' });
  const src = fs.readFileSync(out, 'utf8');

  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  const W = dom.window, errs = [];
  W.addEventListener('error', (ev) => errs.push(ev.message)); W.console.warn = () => {}; W.console.log = () => {};
  W.matchMedia = W.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  W.scrollTo = () => {}; W.scrollBy = () => {}; W.HTMLElement.prototype.scrollIntoView = function () {};
  W.global = W; W.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
  W.alert = () => {};
  W.localStorage.setItem('gm_equip_no', '1호기');
  W.localStorage.setItem('master_active_inspector_v1', '연막');
  W.__memdb = { voyages: { [vk]: clone(voyage) }, ship_bay_dict_v3: { KKLC: clone(FX.shipDict) } };
  W.__fbShipBayDict = { KKLC: clone(FX.shipDict) };
  try { W.eval(src); W.__go(JSON.stringify(voyage), vk); } catch (er) { errs.push('THROW ' + er.message); }
  await sleep(350);
  const d = W.document;
  const click = async (b, ms = 300) => { if (b) { b.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await sleep(ms); } };
  const txt = (b) => b.textContent.replace(/\s+/g, ' ').trim();
  const btn = (re) => [...d.querySelectorAll('button')].find((b) => re.test(txt(b)) && !b.disabled);
  const until = async (fn, ms = 4000) => { const end = Date.now() + ms; let v = fn(); while (!v && Date.now() < end) { await sleep(60); v = fn(); } return v; };
  const firstCard = () => { const c = d.querySelector('[data-gw-card]'); return c ? { cn: c.getAttribute('data-gw-cn'), pos: c.getAttribute('data-gw-pos') } : null; };
  const chipBtns = () => [...d.querySelectorAll('button')].filter((b) => /^(트윈|싱글)부터 \d+$/.test(txt(b)));

  const tab = [...d.querySelectorAll('button[role="tab"]')].find((b) => /작업 시작/.test(b.textContent));
  await click(tab, 350);
  await click(await until(() => btn(/^🤖\s*자동 가이드$/)), 350);
  await until(() => /작업할 베이를 선택하세요/.test(d.body.textContent));
  const groupBtn = await until(() => [...d.querySelectorAll('button')].find((b) => { const m = txt(b).match(/^B([\d·]+)/); return m && m[1].split('·').map(Number).some((x) => [37, 38, 39].includes(x)) && /남은 컨/.test(txt(b)); }));
  await click(groupBtn, 350);
  const keep = btn(/그대로$/); if (keep) await click(keep, 300);
  await click(await until(() => btn(/^🔵 데크 [1-9]/) || btn(/^데크 [1-9]/) || [...d.querySelectorAll('button')].find((b) => /데크/.test(txt(b)) && /[1-9]/.test(txt(b)) && !/변경|◀/.test(txt(b)))), 450);
  await until(() => firstCard());

  const c0 = firstCard(), ch0 = chipBtns().map(txt);
  ok(`① 남은 트윈 1·싱글 1 → 갈림 줄에 [${ch0.join(' · ')}] · 첫 카드 ${c0 && c0.cn} ${c0 && c0.pos}`,
    ch0.join() === '트윈부터 1,싱글부터 1' && c0 && c0.cn && /37|39/.test(c0.pos) && !errs.length, JSON.stringify({ ch0, c0, errs: errs.slice(0, 3), body: txt(d.body).slice(0, 300) }));
  const note = d.querySelector('[data-twin-single-note]');
  ok('② 칩 옆에 한 줄 안내(보류로 순서를 바꾸지 않아도 됩니다)', !!note && /보류로 순서를 바꾸지 않아도 됩니다/.test(note.textContent), note && note.textContent);
  const isViolet = (b) => /bg-violet-700/.test(b.className) && !/bg-ink-800/.test(b.className);
  ok('③ 처음에는 두 칩 모두 비활성(회색)', chipBtns().every((b) => !isViolet(b)));
  if (SHOT) fs.writeFileSync(path.join(SHOT, 'fx478_before.html'), d.documentElement.outerHTML);

  await click(btn(/^싱글부터 \d+$/), 450);
  const cS = firstCard(), tS = chipBtns().find((b) => /^싱글부터/.test(txt(b))), tT = chipBtns().find((b) => /^트윈부터/.test(txt(b)));
  const lab = [...d.querySelectorAll('span')].map(txt).find((x) => /우선 중$/.test(x));
  ok(`④ [싱글부터] → 활성(보라) · «${lab}» · 첫 카드 ${cS && cS.cn} ${cS && cS.pos} (싱글 39-05-84)`,
    !!tS && isViolet(tS) && !!tT && !isViolet(tT) && lab === '싱글 우선 중' && cS && cS.pos === '39-05-84' && !errs.length, JSON.stringify({ cS, lab, errs: errs.slice(0, 3) }));
  if (SHOT) fs.writeFileSync(path.join(SHOT, 'fx478_single.html'), d.documentElement.outerHTML);

  await click(btn(/^트윈부터 \d+$/), 450);
  const cT = firstCard(), tT2 = chipBtns().find((b) => /^트윈부터/.test(txt(b))), tS2 = chipBtns().find((b) => /^싱글부터/.test(txt(b)));
  const lab2 = [...d.querySelectorAll('span')].map(txt).find((x) => /우선 중$/.test(x));
  ok(`⑤ [트윈부터] → 활성(보라) · «${lab2}» · 첫 카드 ${cT && cT.cn} ${cT && cT.pos} (트윈 37+39-07-84)`,
    !!tT2 && isViolet(tT2) && !!tS2 && !isViolet(tS2) && lab2 === '트윈 우선 중' && cT && /-07-84$/.test(cT.pos) && !errs.length, JSON.stringify({ cT, lab2, errs: errs.slice(0, 3) }));
  if (SHOT) fs.writeFileSync(path.join(SHOT, 'fx478_twin.html'), d.documentElement.outerHTML);

  await click(btn(/^트윈부터 \d+$/), 300);   // 다시 누르면 푼다
  ok('⑥ 같은 칩을 다시 누르면 풀린다(우선 중 표시 없음)', ![...d.querySelectorAll('span')].map(txt).some((x) => /우선 중$/.test(x)));

  await click([...d.querySelectorAll('button')].find((b) => /순서 .*바꾸기|^⚙/.test(txt(b)) && /순서/.test(txt(b))), 350);
  const sheetBtns = [...d.querySelectorAll('button')].map(txt).filter((s) => /^(\d+\. )?(트윈|싱글)부터$/.test(s));
  ok(`⑦ «양하 순서» 창 — 먼저 내릴 것에 [${sheetBtns.join(' · ')}] 가 있다`, sheetBtns.length === 2 && /함께 못 겁니다/.test(d.body.textContent) && /트윈↔싱글/.test(d.body.textContent), JSON.stringify(sheetBtns));
  ok('⑧ 렌더 중 오류 없음', !errs.length, errs.join(' | '));

  try { W.close(); } catch (er) { /* 창 닫기 */ }
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (er) { /* 임시 */ }
  console.log(`\n${bad ? '✗' : '✓'} 4.78 화면 연막검사 ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('✗ 4.78 화면 연막검사 예외', e && e.stack || e); process.exit(1); });
