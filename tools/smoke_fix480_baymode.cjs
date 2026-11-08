// 4.80 베이모드 양하 연막검사 — 실소스 항차 화면(VoyagePage → BayViewWork → SearchPanel → GuidedWorkPanel)을 jsdom 에서 그리고 검수원 손 그대로 누른다.
//   자료 = tools/fixtures/kklc2610n_lastdeck.json(KKLC 2610N 양하 보관본 GET 사본 — 마지막 데크 B37·B38·B39: 38-09-88 → 38-09-86 → 38-09-84 → 39-07-86 → 37+39-07-84(트윈) → 39-05-84). 목업 없음.
//   Firebase 는 메모리 스텁(tools/stub_fbdb_mem.js — 실제 쓰기 없음). 실행 — node tools/smoke_fix480_baymode.cjs [저장소 루트] [HTML 저장 폴더]. 실패하면 빌드를 세운다.
//   ① 순수 판정(bayMode.js) ② 소스 배선(기록 경로가 종전 함수 · 조회만 문지기 · 보류 단추 · 해제 복귀) ③ 화면 시나리오 A 일괄 양하 · B 싱글 변환→뒤 베이부터 · C 앞 베이 먼저 · D 해제 복귀 · E 조회만 차단.
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
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + String(detail).slice(0, 500) : ''}`); } };
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

(async () => {
  //  ── ② 소스 배선 ──
  const gwp = read('src/components/GuidedWorkPanel.jsx'), bvw = read('src/components/BayViewWork.jsx'), sp = read('src/components/SearchPanel.jsx'), bm = read('src/bayMode.js');
  ok('② 카드 완료는 종전 함수 — 베이모드 파일(bayMode.js)에는 firebase 기록 함수가 없다', !/fbComplete|fbHold|fbRelease|from '\.\/firebase/.test(bm));
  ok('② BayViewWork 도 기록 함수를 부르지 않는다(요청만 보낸다)', !/fbComplete|fbHold|fbRelease|from '\.\.\/firebase/.test(bvw));
  ok('② 일괄 확인은 handleConfirm → fbCompleteContainersAtomic · 싱글은 handleConfirmOne → fbCompleteContainer 그대로', /fbCompleteContainersAtomic\(voyageKey, mode, \[card\.main\.cn, card\.twin\.cn\]/.test(gwp) && /const handleConfirmOne = async/.test(gwp));
  ok('② 조회만 문지기 — handleConfirm·handleConfirmOne 은 canWorkNow, 보류는 firebase.assertCanWork 가 막는다', (gwp.match(/if \(!canWorkNow\(\)\) \{ alert\(workGateText\('완료'\)\)/g) || []).length >= 2 && /assertCanWork\('보류'\)/.test(read('src/firebase.js')));
  ok('② 보류 단추는 카드의 종전 ⏸ 보류(doHold) 그대로 — 새 보류 UI 없음', /exBtn\('hold', '⏸ 보류'/.test(gwp) && !/export function .*[Hh]old/.test(bm));
  ok('② SearchPanel 은 bayPick·onCardCns 를 GuidedWorkPanel 로 그대로 넘긴다', /bayPick=\{bayView \? bayView\.bayPick : null\}/.test(sp) && /onBayPickCns=\{bayView \? bayView\.onCardCns : null\}/.test(sp));
  ok('② 해제 = 따라가기·비율·배율·자동/수동·베이·단 복귀(saved) · 뒤로가기는 먼저 해제', /saved: \{ follow, ratio, zoom, ctx:/.test(bvw) && /bayModeRef\.current && releaseRef\.current\) releaseRef\.current\(\)/.test(bvw));
  ok('② 데크가 남은 장의 홀드 컨은 홀드 단을 열지 않는다(V8.45 게이트와 같은 host.deck)', /const deckBlock = tg\.tier === 'hold' && host\.deck > 0/.test(gwp));
  const fb = read('src/components/FitBox.jsx');
  ok('② 4.80-01 소스 — 작은 카드는 bayMini 한 갈래(SearchPanel→GuidedWorkPanel)이고 FitBox 가운데 상자는 베이모드에서만(center={!!bayMode})', /bayMini=\{!!\(bayView && bayView\.mini\)\}/.test(sp) && /mini: !!bayMode/.test(bvw) && /center=\{!!bayMode\}/.test(bvw) && /center \? \(/.test(fb));
  ok('② 4.80-01 소스 — 폰 베이모드도 세로 쌓기·가로 나란히 중 큰 쪽을 고른다(layoutPick 한 벌 재사용 — 판정을 새로 만들지 않는다)', /if \(!isWide && !bayMode\) \{ setLayoutPick\('col'\)/.test(bvw) && /onlyLayout=\{isWide \|\| bayMode \? layoutPick : 'col'\}/.test(bvw));
  ok('② 앞/뒤 베이 먼저 단추(data-gw-bayfirst)', /data-gw-bayfirst=\{i === 0 \? 'front' : 'back'\}/.test(gwp));

  const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : os.tmpdir(), 'fx480_'));
  const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/kklc2610n_lastdeck.json'), 'utf8'));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const vk = FX.key;
  const LAST = ['SEKU5844409', 'KMTU9483037', 'GCXU5888197', 'SEKU1370180', 'SEKU1384558', 'BEAU2297940', 'TEMU0398517'];   // 38-09-88 · 38-09-86 · 38-09-84 · 39-07-86 · 37-07-84(앞) · 39-07-84(뒤) · 39-05-84
  const completed = {}; for (const [cn, r] of Object.entries(FX.discharge.completed)) if (!LAST.includes(cn)) completed[cn] = clone(r);
  const voyage = { key: vk, info: clone(FX.info), discharge: { ediContainers: clone(FX.discharge.ediContainers), completed }, loading: { ediContainers: {}, completed: {} } };

  //  ── ① 순수 판정(실소스 번들) ──
  const unitEnt = path.join(ROOT, 'tools/smoke_fix480_baymode_entry.js'), unitOut = path.join(TMP, 'u.cjs');
  const stub = './tools/stub_fbdb_mem.js';
  const aliasFb = `--alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub}`;
  execSync(`npx esbuild "${unitEnt}" --bundle --platform=node --format=cjs --outfile="${unitOut}" --loader:.js=jsx --jsx=automatic ${aliasFb} --log-level=error`, { cwd: ROOT, stdio: 'pipe' });
  const U = require(unitOut);
  const all = Object.values(voyage.discharge.ediContainers).map((c) => ({ ...c, _mode: 'discharge', _ptk: true }));
  const rem = all.filter((c) => LAST.includes(c.cn));
  const gc = (b) => 38;   // 이 장 묶음 가운데 = 38(37·38·39 한 해치)
  ok('① 남은 7대 · 누른 컨 SEKU1384558(37-07-84) → ok · 장 38 · 데크', (() => { const t = U.bayModeTargetOf(rem, new Set(), 'seku1384558', gc); return rem.length === 7 && t.state === 'ok' && t.center === 38 && t.tier === 'deck'; })());
  ok('① 완료된 컨(남은 목록에 없음) → done(종전대로 상세를 연다)', U.bayModeTargetOf(rem, new Set(), 'ZZZZ0000000', gc).state === 'done');
  ok('① 보류 중인 컨 → held(해제는 보류 목록에서)', U.bayModeTargetOf(rem, new Set(['SEKU1384558']), 'SEKU1384558', gc).state === 'held');
  const q = U.buildGuidedQueue({ containers: rem, mode: 'discharge', evenRowsSeaSide: true, findTwin: U.guideTwinOf((t, a, used) => U.findTwinCandidate(t, a, used, '', 'KKLC')), frontCns: ['SEKU1384558'] });
  const cardOf = (cn) => q.find((c) => c.main.cn === cn || (c.twin && c.twin.cn === cn));
  const tw = cardOf('SEKU1384558');
  ok(`① 앞 베이 20ft 를 누르면 큐가 트윈 카드로 묶어 맨 앞에 낸다 — ${tw && tw.main.cn}+${tw && tw.twin && tw.twin.cn}`, !!tw && !!tw.twin && q[0] === tw && [tw.main.cn, tw.twin.cn].sort().join() === ['BEAU2297940', 'SEKU1384558'].join());
  const q2 = U.buildGuidedQueue({ containers: rem, mode: 'discharge', evenRowsSeaSide: true, findTwin: U.guideTwinOf((t, a, used) => U.findTwinCandidate(t, a, used, '', 'KKLC')), frontCns: ['SEKU1370180'] });
  ok('① 싱글(39-07-86)을 누르면 단독 카드', q2[0].main.cn === 'SEKU1370180' && !q2[0].twin);
  ok('① 트윈 카드 위에 39-07-86 이 남아 있으면 막힘(availableCardsOf 에 없다) — 막는 것이 아니라 알림', (() => { const a = U.availableCardsOf(q); return !a.includes(tw); })());
  const cells = U.bayModeCellsOf(['SEKU1384558', 'BEAU2297940'], all, new Map([['39-07-84', 'conflict']]));
  ok('① 그림 칸 표시 — 보라 테두리 키 37-07-84(pick) · 불일치 키는 빨강이 이긴다', cells.get('37-07-84') === 'pick' && cells.get('39-07-84') === 'conflict');
  ok('① 요청 번호는 같은 컨을 다시 눌러도 늘어난다', (() => { const a = U.bayPickRequest('seku1384558', 5), b = U.bayPickRequest('SEKU1384558', 5); return a.cn === 'SEKU1384558' && b.seq > a.seq; })());
  ok('① 베이모드는 양하만', U.bayModeOkFor('discharge') && !U.bayModeOkFor('loading'));

  //  ── ③ 화면 ──
  const ent = path.join(TMP, 'fx480ui.jsx'), out = path.join(TMP, 'fx480ui.js');
  fs.writeFileSync(ent, [
    `import React from "${ROOT}/node_modules/react/index.js";`,
    `import { createRoot } from "${ROOT}/node_modules/react-dom/client.js";`,
    `import VoyagePage from "${ROOT}/src/pages/VoyagePage.jsx";`,
    `let root = null; const el = (v, key) => React.createElement(VoyagePage, { voyageKey: key, voyage: v, inspector: '연막', inspectors: [], portMisData: {}, pilotForecast: {}, onGoHome() {}, onModeChange() {}, initModeOverride: 'discharge' });`,
    `import { setActiveWorkChoice } from "${ROOT}/src/workChoice.js";`,
    `window.__go = (json, key) => { root = createRoot(document.getElementById('root')); root.render(el(JSON.parse(json), key)); };`,
    `window.__upd = (json, key) => { root.render(el(JSON.parse(json), key)); };`,
    `window.__setActive = (c) => setActiveWorkChoice(c);`,
  ].join('\n'));
  execSync(`npx esbuild "${ent}" --bundle --loader:.jsx=jsx --loader:.js=jsx --loader:.png=dataurl --loader:.json=json --jsx=automatic --external:fs --external:path --external:url ${aliasFb} --outfile="${out}" --log-level=error`, { cwd: ROOT, stdio: 'pipe' });
  const src = fs.readFileSync(out, 'utf8');

  async function boot(viewOnly = false) {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
    const W = dom.window, errs = [];
    W.addEventListener('error', (ev) => errs.push(ev.message)); W.console.warn = () => {}; W.console.log = () => {};
    W.matchMedia = W.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    W.scrollTo = () => {}; W.scrollBy = () => {}; W.HTMLElement.prototype.scrollIntoView = function () {};
    W.global = W; W.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
    const alerts = []; W.alert = (m) => alerts.push(String(m));
    W.localStorage.setItem('gm_equip_no', '1호기');
    W.localStorage.setItem('master_active_inspector_v1', '연막');
    W.__memdb = { voyages: { [vk]: clone(voyage) }, ship_bay_dict_v3: { KKLC: clone(FX.shipDict) } };
    W.__fbShipBayDict = { KKLC: clone(FX.shipDict) };
    try {
      W.eval(src);
      if (viewOnly) W.__setActive({ name: '연막', ymd: new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10), mode: 'view', voyageKey: '', equip: '', at: Date.now() });   // 조회만 — 쓰기 문지기(isViewOnlyNow)가 본다
      W.__go(JSON.stringify(voyage), vk);
    } catch (er) { errs.push('THROW ' + er.message); }
    await sleep(350);
    const d = W.document;
    const H = {
      W, d, errs, alerts,
      click: async (b, ms = 300) => { if (b) { b.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await sleep(ms); } },
      txt: (b) => b.textContent.replace(/\s+/g, ' ').trim(),
    };
    H.btn = (re, root = d) => [...root.querySelectorAll('button')].find((b) => re.test(H.txt(b)) && !b.disabled);
    H.until = async (fn, ms = 4000) => { const end = Date.now() + ms; let v = fn(); while (!v && Date.now() < end) { await sleep(60); v = fn(); } return v; };
    H.cards = () => [...d.querySelectorAll('[data-gw-card]')].map((c) => ({ label: c.getAttribute('data-gw-card'), cn: c.getAttribute('data-gw-cn'), pos: c.getAttribute('data-gw-pos') }));
    H.bottom = () => d.querySelector('[data-bayview-bottom]');
    H.cell = (cn) => [...(H.bottom() || d).querySelectorAll('button')].find((b) => H.txt(b).includes(cn.slice(-4)) && b.className.includes('relative'));
    H.sync = async () => { try { W.__upd(JSON.stringify(W.__memdb.voyages[vk]), vk); } catch (er) { errs.push('SYNC ' + er.message); } await sleep(500); };   // 실제 앱은 RTDB 구독이 새 항차를 내려준다 — 스텁에는 구독이 없어 쓴 결과를 다시 내려준다
    H.done = () => Object.keys((W.__memdb.voyages[vk].discharge || {}).completed || {}).filter((c) => LAST.includes(c));
    //  베이뷰 → 자동 가이드 → B38 장 → 데크
    await H.click([...d.querySelectorAll('button[role="tab"]')].find((b) => /작업 시작/.test(b.textContent)), 350);
    await H.click(await H.until(() => H.btn(/^베이뷰 작업/)), 400);
    await H.click(await H.until(() => H.btn(/자동 가이드$/)), 450);
    await H.until(() => /작업할 베이를 선택하세요/.test(d.body.textContent));
    await H.click(await H.until(() => [...d.querySelectorAll('button')].find((b) => { const m = H.txt(b).match(/^B([\d·]+)/); return m && m[1].split('·').map(Number).some((x) => [37, 38, 39].includes(x)) && /남은 컨/.test(H.txt(b)); })), 350);
    const keep = H.btn(/그대로$/); if (keep) await H.click(keep, 300);
    await H.click(await H.until(() => [...d.querySelectorAll('button')].find((b) => /데크/.test(H.txt(b)) && /[1-9]/.test(H.txt(b)) && !/변경|◀|⇄/.test(H.txt(b)))), 450);
    await H.until(() => H.cards().length);
    return H;
  }
  const save = (H, name) => { if (SHOT) { try { fs.writeFileSync(path.join(SHOT, `fx480_${name}.html`), H.d.documentElement.outerHTML); } catch (e) { console.warn('저장 실패', name, e.message); } } };
  const allErrs = [];
  const close = (H) => { allErrs.push(...H.errs); try { H.W.close(); } catch (e) { /* 창 닫기 */ } };

  //  A. 일괄 양하
  {
    const H = await boot();
    const c0 = H.cards();
    ok(`A0 베이뷰 자동 가이드 첫 카드 ${c0[0] && c0[0].cn} ${c0[0] && c0[0].pos} (38-09-88)`, c0.length === 1 && c0[0].pos === '38-09-88' && !H.errs.length, JSON.stringify({ c0, errs: H.errs.slice(0, 3) }));
    ok('A1 베이모드 단추가 있다(양하)', !!H.d.querySelector('[data-bayview-baymode-on]'));
    const topBefore = H.d.querySelector('[data-bayview-top]').style.flex;
    await H.click(H.d.querySelector('[data-bayview-baymode-on]'), 500);
    ok('A2 베이모드 켜짐 — 머리 칩 «🎯 베이모드» · 해제 단추 · 위 칸 비율 확대', !!H.d.querySelector('[data-bayview-baymode]') && !!H.d.querySelector('[data-bayview-baymode-off]') && H.d.querySelector('[data-bayview-top]').style.flex !== topBefore, H.d.querySelector('[data-bayview-top]').style.flex);
    ok('A2c 4.80-01 베이모드 동안 카드 칸이 작은 카드판(data-gw-mini)이고 머리 줄(베이 선택·진행 막대)과 수동 전환 줄을 접었다', !!H.d.querySelector('[data-gw-mini]') && !H.d.querySelector('[data-gw-head]') && !/수동 모드로 전환/.test(H.d.body.textContent) && !/초과 컨 추가/.test(H.d.body.textContent));
    ok('A2d 4.80-01 폰(위/아래) 베이모드 위 칸은 칸 비율이 아니라 내용 높이(flex 0 1 auto + maxHeight)', /^0 1 auto/.test(H.d.querySelector('[data-bayview-top]').style.flex) && !!H.d.querySelector('[data-bayview-top]').style.maxHeight && /^1 1/.test(H.bottom().style.flex), H.d.querySelector('[data-bayview-top]').getAttribute('style'));
    ok('A2e 4.80-01 베이 그림 상자가 가운데 상자(data-fit-center)', !!H.bottom().querySelector('[data-fit-center]'));
    ok('A2b 베이 그림 칸에 핀치 한 벌이 걸렸다(touch-action: pan-x pan-y)', H.bottom().style.touchAction === 'pan-x pan-y', H.bottom().style.touchAction);
    save(H, 'pinned');
    //  ① 트윈 앞 베이 20ft 를 눌렀다 — 39-07-86 이 위에 남아 있다
    const cellT = await H.until(() => H.cell('SEKU1384558'));
    ok('A3 베이 그림에 앞 베이 20ft 칸(37-07-84)이 있다', !!cellT);
    await H.click(cellT, 900);
    const cT = H.cards();
    ok(`A4 앞 베이 20ft 를 눌렀더니 카드 두 장(앞·뒤) — ${cT.map((x) => `${x.label}:${x.cn}@${x.pos}`).join(' / ')}`, cT.length === 2 && cT[0].label === '앞' && cT[1].label === '뒤' && [cT[0].cn, cT[1].cn].sort().join() === ['BEAU2297940', 'SEKU1384558'].join() && cT.every((x) => /-07-84$/.test(x.pos)), JSON.stringify({ cT, errs: H.errs.slice(0, 3) }));
    ok('A5 띠 «🎯 베이에서 고른 카드입니다» + 위에 아직 안 내린 컨 경고(39-07-86)', /베이에서 고른 카드입니다/.test(H.d.body.textContent) && !!H.d.querySelector('[data-gw-baypick-blocked]'));
    ok('A6 그림에 보라 테두리 두 칸(ring-violet-400)', (H.bottom().querySelectorAll('.ring-violet-400').length) === 2, String(H.bottom().querySelectorAll('.ring-violet-400').length));
    save(H, 'twin');
    //  39-07-86 싱글을 눌러 먼저 내린다
    await H.click(H.cell('SEKU1370180'), 900);
    const cS = H.cards();
    ok(`A7 싱글 39-07-86 을 누르면 단독 카드 1장 — ${cS.map((x) => `${x.label}:${x.cn}@${x.pos}`).join(' ')}`, cS.length === 1 && cS[0].label === '단독' && cS[0].cn === 'SEKU1370180' && !H.d.querySelector('[data-gw-baypick-blocked]'), JSON.stringify(cS));
    save(H, 'single');
    await H.click(H.btn(/양하확인$/), 900);
    ok('A8 단독 카드 [양하확인] → 종전 기록 경로로 1건 완료(SEKU1370180)', H.done().join() === 'SEKU1370180', H.done().join());
    await H.sync();
    //  트윈 앞을 다시 눌러 일괄 양하
    await H.click(await H.until(() => H.cell('SEKU1384558')), 900);
    const c2 = H.cards();
    ok(`A9 트윈 다시 선택 — 두 장 · 이제 막힘 경고 없음`, c2.length === 2 && !H.d.querySelector('[data-gw-baypick-blocked]'), JSON.stringify(c2));
    await H.click(H.btn(/트윈 한 번에 양하확인$/), 900);
    ok('A10 [트윈 한 번에 양하확인] → 두 대 한 번에 완료(원자 기록)', H.done().sort().join() === ['BEAU2297940', 'SEKU1370180', 'SEKU1384558'].sort().join(), H.done().join());
    await H.sync();
    //  이미 완료된 컨을 누르면 종전처럼 상세
    const doneCell = H.cell('SEKU1370180');
    await H.click(doneCell, 500);
    ok('A11 이미 완료된 컨을 누르면 카드 요청이 아니라 종전 컨 상세 길(onOpenContainer) — 카드가 안 바뀐다', !!doneCell && H.cards().every((x) => !H.done().includes(x.cn)));
    //  D. 해제 복귀
    await H.click(H.d.querySelector('[data-bayview-baymode-off]'), 600);
    ok('D1 [🎯 해제] → 베이모드 칩·해제 단추가 사라지고 원래 칸 비율로 돌아온다', !H.d.querySelector('[data-bayview-baymode]') && !H.d.querySelector('[data-bayview-baymode-off]') && H.d.querySelector('[data-bayview-top]').style.flex === topBefore, H.d.querySelector('[data-bayview-top]').style.flex + ' vs ' + topBefore);
    ok('D1b 4.80-01 해제하면 작은 카드판이 풀리고 머리 줄(베이 선택)이 돌아온다', !H.d.querySelector('[data-gw-mini]') && !!H.d.querySelector('[data-gw-head]') && !H.bottom().querySelector('[data-fit-center]'));
    ok('D2 해제 뒤에도 베이뷰 자동 가이드가 그대로(카드 있음 · 오류 없음)', H.cards().length >= 1 && !H.errs.length, JSON.stringify({ c: H.cards(), e: H.errs.slice(0, 3) }));
    close(H);
  }
  //  B. 싱글 변환 → 뒤 베이부터 (39 먼저)
  {
    const H = await boot();
    await H.click(H.d.querySelector('[data-bayview-baymode-on]'), 500);
    await H.click(await H.until(() => H.cell('BEAU2297940')), 900);   // 뒤 베이(39) 20ft 를 눌러도 같은 트윈 카드
    const c = H.cards();
    ok(`B1 뒤 베이 20ft(39-07-84)를 눌러도 같은 트윈 카드 두 장 — ${c.map((x) => x.cn).join('+')}`, c.length === 2, JSON.stringify(c));
    await H.click(H.btn(/싱글로 한 대씩/), 500);
    const firstBtns = [...H.d.querySelectorAll('button')].map(H.txt).filter((s) => /이것부터$/.test(s));
    const bayFirst = [...H.d.querySelectorAll('[data-gw-bayfirst]')].map((b) => `${b.getAttribute('data-gw-bayfirst')}:${H.txt(b).slice(0, 14)}`);
    ok(`B2 싱글 변환 — [이것부터] ${firstBtns.length}개 · 앞/뒤 베이 먼저 [${bayFirst.join(' | ')}]`, firstBtns.length === 2 && bayFirst.length === 2 && /^front:앞 37번/.test(bayFirst[0]) && /^back:뒤 39번/.test(bayFirst[1]), JSON.stringify({ firstBtns, bayFirst }));
    save(H, 'singleconv');
    const backBtn = H.d.querySelector('[data-gw-bayfirst="back"]');
    await H.click([...H.d.querySelectorAll('button')].filter((b) => /이것부터$/.test(H.txt(b)))[1], 900);   // 뒤(39)부터
    ok('B3 [이것부터](뒤 39-07-84) → 그 한 대만 완료', H.done().join() === 'BEAU2297940', H.done().join());
    await H.sync();
    const cm = H.cards();
    ok(`B4 남은 짝(앞 37-07-84)이 바로 다음 카드(단독)`, cm.length === 1 && cm[0].cn === 'SEKU1384558', JSON.stringify(cm));
    close(H);
  }
  //  C. 싱글 변환 → 앞 베이 먼저(37 몰아서)
  {
    const H = await boot();
    await H.click(H.d.querySelector('[data-bayview-baymode-on]'), 500);
    await H.click(await H.until(() => H.cell('SEKU1384558')), 900);
    await H.click(H.btn(/싱글로 한 대씩/), 500);
    await H.click(H.d.querySelector('[data-gw-bayfirst="front"]'), 900);
    const c = H.cards();
    ok(`C1 [앞 37번 베이 먼저] → 첫 카드가 37 베이 단독(트윈이 풀림) — ${c.map((x) => `${x.label}:${x.cn}@${x.pos}`).join(' ')}`, c.length === 1 && c[0].cn === 'SEKU1384558' && c[0].label === '단독', JSON.stringify(c));
    //  못 내리는 컨 — 기존 ⏸ 보류 단추가 열려 있다
    ok('C2 못 내리는 컨은 카드의 종전 ⏸ 보류 단추로(새 UI 없음)', !!H.btn(/⏸ 보류/));
    close(H);
  }
  //  E. 조회만 — 카드는 보이되 완료·보류는 문지기가 막는다
  {
    const H = await boot(true);
    await H.click(H.d.querySelector('[data-bayview-baymode-on]'), 500);
    await H.click(await H.until(() => H.cell('SEKU1370180')), 900);
    const c = H.cards();
    ok('E1 조회만 — 카드는 보인다', c.length === 1 && c[0].cn === 'SEKU1370180', JSON.stringify(c));
    await H.click(H.btn(/양하확인$/), 600);
    ok('E2 조회만 — [양하확인] 은 기존 문지기가 막고(알림) 기록은 0건', H.alerts.some((a) => /조회만/.test(a)) && H.done().length === 0, JSON.stringify({ alerts: H.alerts, done: H.done() }));
    close(H);
  }

  //  ── ⑤ 4.80-01 실제 레이아웃 — 크로뮴(playwright)에서 실소스 번들 + 빌드된 CSS 로 잰다. 못 재면 «건너뜀» 이 아니라 실패다(규범 §4-3).
  //   자료 = 같은 KKLC 2610N 보관본. 데크·홀드가 함께 있는 해치(B13~15: 13 / (14)15)를 쓰려고 이 해치 홀드 컨만 미완료로 둔다(나머지는 보관본 그대로).
  //   검사 = 폰 폭 390·360·412 에서 트윈 카드 두 장 + 단추가 위 칸 안(화면 안)에 든다 · 베이 칸 높이 · 두 베이 그룹의 데크 칸과 홀드 칸이 둘 다 그 칸 안에 보인다 ·
  //   배율 0.7·1.0·2.2 에서 그림 좌우 여백 차이(쏠림) · 가로 스크롤 없음 · 해제하면 작은 카드판이 풀린다.
  {
    let pw = null; try { pw = require('playwright'); } catch (e) { /* 아래에서 실패로 센다 */ }
    ok('⑤ playwright 가 있다(없으면 모양을 못 재므로 올리지 않는다)', !!pw);
    const cssName = (() => { try { return fs.readdirSync(path.join(ROOT, 'assets')).find((f) => /^index-.*\.css$/.test(f)); } catch (e) { return ''; } })();
    ok('⑤ 빌드된 CSS(assets/index-*.css)가 있다', !!cssName);
    if (pw && cssName) {
      const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } });
      const css = fs.readFileSync(path.join(ROOT, 'assets', cssName), 'utf8');
      const page0 = path.join(TMP, 'lay.html');
      fs.writeFileSync(page0, '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>' + css + '</style></head><body><div id="root"></div></body></html>');
      const holdCns = Object.entries(FX.discharge.ediContainers).filter(([k, v]) => ['13', '14', '15'].includes(v.bay) && parseInt(v.tier, 10) < 80).map(([k]) => k);
      const compH = {}; for (const [cn, r] of Object.entries(FX.discharge.completed)) if (!holdCns.includes(cn)) compH[cn] = clone(r);
      const voyH = { key: vk, info: clone(FX.info), discharge: { ediContainers: clone(FX.discharge.ediContainers), completed: compH }, loading: { ediContainers: {}, completed: {} } };
      const br = await pw.chromium.launch(CHROME ? { executablePath: CHROME } : {});
      const FIND = "(re,root)=>{root=root||document;return [...root.querySelectorAll('button')].find(b=>re.test(b.textContent.replace(/\\s+/g,' ').trim())&&!b.disabled)}";
      const METR = `()=>{
        const top=document.querySelector('[data-bayview-top]'), bot=document.querySelector('[data-bayview-bottom]'); const vh=innerHeight, vw=innerWidth;
        const tr=top.getBoundingClientRect(), bt=bot.getBoundingClientRect();
        const act=[...document.querySelectorAll('button')].find(b=>/양하확인$/.test(b.textContent.replace(/\\s+/g,' ').trim()));
        const ar=act?act.getBoundingClientRect():null;
        const cards=[...document.querySelectorAll('[data-gw-card]')].map(c=>Math.round(c.getBoundingClientRect().height));
        const f=bot.querySelector('.fs-keep'); let fL=0,fR=0; if(f){const fr=f.getBoundingClientRect(); const sc=fr.width/f.offsetWidth; fL=fr.left; fR=fr.left+f.scrollWidth*sc;}
        const cl=bt.left+4, cr=bt.right-4;
        const inBot=(txt)=>{const b=[...bot.querySelectorAll('button')].find(b=>b.className.includes('relative')&&b.textContent.includes(txt)); if(!b) return null; const r=b.getBoundingClientRect(); return r.width>0&&r.top>=bt.top-1&&r.bottom<=bt.bottom+1&&r.left>=bt.left-1&&r.right<=bt.right+1;};
        const lay=bot.querySelector('[data-only-layout]');
        return {vh,vw,topBottom:Math.round(tr.bottom),botH:Math.round(bt.height),actBottom:ar?Math.round(ar.bottom):null,cards,leftM:Math.round(fL-cl),rightM:Math.round(cr-fR),pages:lay?lay.children.length:0,
          hold:inBot('2264'),holdB:inBot('1375'),deck:inBot('6645'),docW:document.documentElement.scrollWidth};}`;
      for (const [w, h] of [[390, 844], [360, 780], [412, 915]]) {
        const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
        const pg = await ctx.newPage(); const perr = []; pg.on('pageerror', (e) => perr.push(String(e))); pg.on('dialog', (d) => d.dismiss());
        await pg.goto('file://' + page0);
        await pg.evaluate(([k, v, d]) => { localStorage.setItem('gm_equip_no', '1호기'); localStorage.setItem('master_active_inspector_v1', '연막'); window.__memdb = { voyages: { [k]: v }, ship_bay_dict_v3: { KKLC: d } }; window.__fbShipBayDict = { KKLC: d }; window.global = window; }, [vk, voyH, FX.shipDict]);
        await pg.addScriptTag({ content: src });
        await pg.evaluate(([v, k]) => window.__go(JSON.stringify(v), k), [voyH, vk]); await pg.waitForTimeout(600);
        const clickF = async (re, ms = 450) => { const r = await pg.evaluate(`(()=>{const F=${FIND};const b=F(${re});if(b){b.click();return true}return false})()`); await pg.waitForTimeout(ms); return r; };
        await pg.evaluate(() => { const t = [...document.querySelectorAll('button[role=tab]')].find((b) => /작업 시작/.test(b.textContent)); if (t) t.click(); }); await pg.waitForTimeout(450);
        await clickF('/^베이뷰 작업/'); await clickF('/자동 가이드$/', 600);
        await pg.evaluate(() => { const b = [...document.querySelectorAll('button')].find((b) => { const m = b.textContent.replace(/\s+/g, ' ').trim().match(/^B([\d·]+)/); return m && m[1].split('·').map(Number).some((x) => [13, 14, 15].includes(x)) && /남은 컨/.test(b.textContent); }); if (b) b.click(); }); await pg.waitForTimeout(450);
        await clickF('/그대로$/', 300);
        await pg.evaluate(() => { const b = [...document.querySelectorAll('button')].find((b) => { const t = b.textContent.replace(/\s+/g, ' ').trim(); return /홀드/.test(t) && /[1-9]/.test(t) && !/변경|◀|⇄/.test(t); }); if (b) b.click(); }); await pg.waitForTimeout(700);
        await pg.evaluate(() => { const b = document.querySelector('[data-bayview-baymode-on]'); if (b) b.click(); }); await pg.waitForTimeout(700);
        const topFlex0 = await pg.evaluate(() => document.querySelector('[data-bayview-top]').getAttribute('style'));
        await pg.evaluate(() => { const bt = document.querySelector('[data-bayview-bottom]'); const b = [...bt.querySelectorAll('button')].find((b) => b.textContent.includes('2264') && b.className.includes('relative')); if (b) b.click(); }); await pg.waitForTimeout(900);
        const tag = `${w}x${h}`;
        const m = await pg.evaluate(`(${METR})()`);
        ok(`⑤ ${tag} 트윈 카드 두 장이 각각 120px 이하(작은 카드) — ${m.cards.join('·')}px`, m.cards.length === 2 && m.cards.every((x) => x <= 120), JSON.stringify(m));
        ok(`⑤ ${tag} [트윈 한 번에 양하확인] 바닥 ${m.actBottom}px 이 위 칸 바닥 ${m.topBottom}px 과 화면 ${m.vh}px 안`, m.actBottom != null && m.actBottom <= m.topBottom + 1 && m.actBottom <= m.vh, JSON.stringify(m));
        ok(`⑤ ${tag} 베이 그림 칸 높이 ${m.botH}px ≥ 300`, m.botH >= 300, JSON.stringify(m));
        ok(`⑤ ${tag} 두 베이 그룹(${m.pages}장)의 데크 칸·홀드 칸이 베이 칸 안에 같이 보인다(앞 13: 홀드 ${m.hold} · 뒤 15: 홀드 ${m.holdB} · 데크 ${m.deck})`, m.pages === 2 && m.hold === true && m.holdB === true && m.deck === true, JSON.stringify(m));
        ok(`⑤ ${tag} 가로 쏠림 ${Math.abs(m.leftM - m.rightM)}px ≤ 3 (좌 ${m.leftM} · 우 ${m.rightM}) · 가로 스크롤 없음(문서 폭 ${m.docW} ≤ ${m.vw})`, Math.abs(m.leftM - m.rightM) <= 3 && m.docW <= m.vw, JSON.stringify(m));
        for (const target of [0.7, 1.0, 2.2]) {
          for (let i = 0; i < 30; i += 1) {
            const cur = await pg.evaluate(() => { const bt = document.querySelector('[data-bayview-bottom]'); const sp = [...bt.querySelectorAll('span')].find((x) => /^\d+%$/.test(x.textContent)); return parseInt(sp.textContent, 10); });
            if (Math.abs(cur - target * 100) <= 8) break;
            await pg.evaluate((sign) => { const bt = document.querySelector('[data-bayview-bottom]'); const b = [...bt.querySelectorAll('button')].find((x) => x.textContent.trim() === sign); if (b) b.click(); }, cur < target * 100 ? '+' : '−');
            await pg.waitForTimeout(120);
          }
          await pg.waitForTimeout(450);
          const z = await pg.evaluate(`(${METR})()`);
          ok(`⑤ ${tag} 배율 ${target} — 그림 좌우 여백 차이 ${Math.abs(z.leftM - z.rightM)}px ≤ 3 (좌 ${z.leftM} · 우 ${z.rightM}) · 가로 스크롤 없음`, Math.abs(z.leftM - z.rightM) <= 3 && z.docW <= z.vw, JSON.stringify(z));
        }
        await pg.evaluate(() => { const b = document.querySelector('[data-bayview-baymode-off]'); if (b) b.click(); }); await pg.waitForTimeout(700);
        const rel = await pg.evaluate(() => ({ mini: !!document.querySelector('[data-gw-mini]'), head: !!document.querySelector('[data-gw-head]'), center: !!document.querySelector('[data-bayview-bottom] [data-fit-center]'), top: document.querySelector('[data-bayview-top]').getAttribute('style') }));
        ok(`⑤ ${tag} 해제 — 작은 카드판·가운데 상자가 풀리고 위 칸이 칸 비율(flex)로 돌아온다`, !rel.mini && rel.head && !rel.center && /flex: [\d.]+ 1 0px/.test(rel.top) && topFlex0 !== rel.top, JSON.stringify({ rel, topFlex0 }));
        allErrs.push(...perr);
        await ctx.close();
      }
      await br.close();
    }
  }
  ok('렌더 중 오류 없음(전 시나리오)', !allErrs.length, allErrs.slice(0, 3).join(' | '));
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (er) { /* 임시 */ }
  console.log(`\n${bad ? '✗' : '✓'} 4.80 베이모드 연막검사 ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('✗ 4.80 베이모드 연막검사 예외', e && e.stack || e); process.exit(1); });
