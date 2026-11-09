// 4.81-01 일반 자동 가이드 홀드 단추 연막검사 — 베이모드(4.80-02)와 같은 해치 규칙(bayMode.bayModeDeckGateOf 한 벌)을 일반 자동 가이드의 «홀드» 단추도 쓴다.
//   자료 = tools/fixtures/boardbays_obwh.json(OBWH 보드 실측 — 10번 데크 16 · 홀드 18, 11번(짝 없는 홀수 베이) 홀드 4 · 데크 0). 목업 없음. Firebase 는 메모리 스텁(실제 쓰기 없음).
//   ① 소스 배선(두 호출부가 holdDeckGateOf 한 함수) ② 순수 판정 — 보드 실데이터 전 장에서 «옛 규칙(자기 장 데크)» 과 비교 ③ 화면 — 양하 B11(데크 없음·이웃 B10 데크 16) 홀드 단추 잠김 · B10 잠김(자기 장) · 데크 다 내린 뒤 열림 · 선적은 규칙 미적용.
//   실행 — node tools/smoke_hold481.cjs [저장소 루트]. 실패하면 빌드를 세운다.
'use strict';
process.env.TZ = 'Asia/Seoul';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const ROOT = path.resolve(process.argv[2] || process.cwd());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + String(detail).slice(0, 500) : ''}`); } };
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const clone = (o) => JSON.parse(JSON.stringify(o));

(async () => {
  const gwp = read('src/components/GuidedWorkPanel.jsx');
  //  ── ① 소스 배선 ──
  ok('① 홀드 게이트 함수가 한 곳(holdDeckGateOf)이고 bayMode.bayModeDeckGateOf 를 부른다', (gwp.match(/const holdDeckGateOf = /g) || []).length === 1 && /const holdDeckGateOf = \(center\) => bayModeDeckGateOf\(remaining, center, groupCenterOf, \(a, b\) => sameBayGroup\(a, b, bayPairs\)\)/.test(gwp));
  ok('① 베이모드 호출부(bayPick)가 holdDeckGateOf 를 부른다', /const gate = tg\.tier === 'hold' \? holdDeckGateOf\(tg\.center\) : null/.test(gwp));
  ok('① 일반 단 고르기 화면(deckFirstBlock)이 같은 holdDeckGateOf 를 부른다 · 양하에서만', /const deckGate = mode === 'discharge' && !!g \? holdDeckGateOf\(g\.center\) : null/.test(gwp) && /const deckFirstBlock = !!deckGate/.test(gwp));
  ok('① 옛 장 단위 판정(g.deck > 0 으로 홀드 잠금)이 남아 있지 않다', !/deckFirstBlock = mode === 'discharge' && !!g && g\.deck > 0/.test(gwp));
  ok('① 판정 함수를 두 번째로 복제하지 않았다(bayModeDeckGateOf 정의는 bayMode.js 한 곳)', (read('src/bayMode.js').match(/export function bayModeDeckGateOf/g) || []).length === 1 && !/function \w*[Dd]eckGate\w*\(/.test(gwp));
  ok('① 미르 이동(mirGoto)도 같은 holdDeckGateOf 로 호스트 장을 정한다', /const _gtGo = \(mode === 'discharge' && hostOwn && !\(g\.local && g\.tier\)\) \? holdDeckGateOf\(hostOwn\.center\) : null/.test(gwp));
  ok('① 미르 이동 — 게이트가 가리킨 데크 장을 장 목록에서 못 찾으면 홀드로 보내지 않고 안내만(잠금 우회 금지)', /if \(_gtGo && !_gtHost\) \{ mirGotoFinish\(g\.seq\); note\(/.test(gwp) && /const host = _gtHost \|\| hostOwn;/.test(gwp));
  ok('① 매뉴얼(helpData)에 «같은 해치» 잠금 설명이 있다', /같은 해치 B○○ 데크 N개 먼저 양하/.test(read('src/data/helpData.js')));

  const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : os.tmpdir(), 'fx481_'));
  const stub = './tools/stub_fbdb_mem.js';
  const aliasFb = `--alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub}`;
  const unitOut = path.join(TMP, 'u.cjs');
  execSync(`npx esbuild "${path.join(ROOT, 'tools/smoke_hold481_entry.js')}" --bundle --platform=node --format=cjs --outfile="${unitOut}" --loader:.js=jsx --jsx=automatic ${aliasFb} --log-level=error`, { cwd: ROOT, stdio: 'pipe' });
  const U = require(unitOut);

  //  ── 자료: OBWH 보드 실측 10·11번 베이 ──
  const FB = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/boardbays_obwh.json'), 'utf8'));
  const mkEdi = (modeKey) => {
    const edi = {};
    for (const [k, c] of Object.entries(FB.discharge.ediContainers)) {
      if (!['10', '11'].includes(String(c.bay))) continue;
      const odd = parseInt(c.bay, 10) % 2 === 1;
      edi[k] = { ...c, cn: k, l4: k.slice(-4), iso: odd ? '2200' : '4500', tp: odd ? "20'GP" : "40'HC", pod: modeKey === 'discharge' ? 'KRPTK' : 'HKHKG', pol: modeKey === 'discharge' ? 'HKHKG' : 'KRPTK', fe: 'F', _mode: modeKey, _ptk: true };
    }
    return edi;
  };
  const ediD = mkEdi('discharge'), ediL = mkEdi('loading');
  const rowsD = Object.values(ediD);
  const deckCns = rowsD.filter((c) => parseInt(c.tier, 10) >= 80).map((c) => c.cn);
  const pairs = U.getBayPairs(rowsD, '', 'OBWH');
  const gc = (b) => U.bayGroupCenter(String(b), pairs);
  const near = (a, b) => U.sameBayGroup(a, b, pairs);

  //  ── ② 순수 판정 — 같은 데이터에서 옛 규칙(자기 장 데크)과 새 규칙(같은 해치) ──
  {
    const centers = [...new Set(rowsD.map((c) => gc(c.bay)))].sort((a, b) => a - b);
    const oldBlock = (ce) => rowsD.filter((c) => gc(c.bay) === ce && parseInt(c.tier, 10) >= 80).length > 0;
    const res = Object.fromEntries(centers.map((ce) => [ce, U.bayModeDeckGateOf(rowsD, ce, gc, near)]));
    ok(`② 자료의 장 ${centers.join('·')} — 데크 ${deckCns.length}대, 홀드 있는 장 모두`, deckCns.length === 16 && centers.length >= 2, JSON.stringify(centers));
    ok('② 옛 규칙으로 막히던 장은 새 규칙도 막고(자기 장 own=true) 대수가 같다', centers.filter(oldBlock).every((ce) => res[ce] && res[ce].own === true && res[ce].n === rowsD.filter((c) => gc(c.bay) === ce && parseInt(c.tier, 10) >= 80).length), JSON.stringify(res));
    const extra = centers.filter((ce) => !oldBlock(ce) && res[ce]);
    ok(`② 새로 막히는 장은 자기 장에 데크가 없고 이웃 장 데크가 남은 장뿐 — ${JSON.stringify(extra.map((ce) => [ce, res[ce]]))}`, extra.length >= 1 && extra.every((ce) => res[ce].own === false && res[ce].n === deckCns.length), JSON.stringify(res));
    ok('② 일반 단추와 베이모드가 같은 답 — 같은 함수·같은 입력이라 장마다 같은 결과(JSON 일치)', centers.every((ce) => JSON.stringify(res[ce]) === JSON.stringify(U.bayModeDeckGateOf(clone(rowsD), ce, gc, near))));
    const rowsNoDeck = rowsD.filter((c) => parseInt(c.tier, 10) < 80);
    ok('② 데크를 다 내리면 모든 장 통과(null)', centers.every((ce) => U.bayModeDeckGateOf(rowsNoDeck, ce, gc, near) === null));
    //  이웃이 아닌 장 — 같은 보드의 10번 데크를 14번 베이로 옮겨 11번과 번호 차 3 으로 둔다(사본)
    const far = rowsD.map((c) => (parseInt(c.tier, 10) >= 80 ? { ...c, bay: '14' } : c));
    ok('② 해치 이웃이 아닌 장(번호 차 3)의 데크는 세지 않는다', U.bayModeDeckGateOf(far, gc('11'), gc, near) === null);
  }

  //  ── ③ 화면 ──
  const ent = path.join(TMP, 'fx481ui.jsx'), out = path.join(TMP, 'fx481ui.js');
  fs.writeFileSync(ent, [
    `import React from "${ROOT}/node_modules/react/index.js";`,
    `import { createRoot } from "${ROOT}/node_modules/react-dom/client.js";`,
    `import VoyagePage from "${ROOT}/src/pages/VoyagePage.jsx";`,
    `let root = null; const el = (v, key) => React.createElement(VoyagePage, { voyageKey: key, voyage: v, inspector: '연막', inspectors: [], portMisData: {}, pilotForecast: {}, onGoHome() {}, onModeChange() {}, initModeOverride: window.__initMode || 'discharge' });`,
    `import { mirGotoRequest } from "${ROOT}/src/guideGoto.js";`,
    `window.__goto = (a) => mirGotoRequest(a);`,
    `window.__go = (json, key) => { root = createRoot(document.getElementById('root')); root.render(el(JSON.parse(json), key)); };`,
    `window.__upd = (json, key) => { root.render(el(JSON.parse(json), key)); };`,
  ].join('\n'));
  execSync(`npx esbuild "${ent}" --bundle --loader:.jsx=jsx --loader:.js=jsx --loader:.png=dataurl --loader:.json=json --jsx=automatic --external:fs --external:path --external:url ${aliasFb} --outfile="${out}" --log-level=error`, { cwd: ROOT, stdio: 'pipe' });
  const src = fs.readFileSync(out, 'utf8');
  async function boot(viewOnly = false, S = null) {
    const V = S.voyage, K = S.vk;

    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
    const W = dom.window, errs = [];
    W.addEventListener('error', (ev) => errs.push(ev.message)); W.console.warn = () => {}; W.console.log = () => {};
    W.matchMedia = W.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    W.scrollTo = () => {}; W.scrollBy = () => {}; W.HTMLElement.prototype.scrollIntoView = function () {};
    W.global = W; W.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
    const alerts = []; W.alert = (m) => alerts.push(String(m));
    const notices = []; W.addEventListener('writeNotice', (ev) => notices.push(String((ev.detail && ev.detail.message) || '')));
    W.localStorage.setItem('gm_equip_no', '1호기');
    W.localStorage.setItem('master_active_inspector_v1', '연막');
    W.__memdb = { voyages: { [K]: clone(V) }, ship_bay_dict_v3: {} };
    W.__fbShipBayDict = {};
    try {
      W.eval(src);
      if (viewOnly) W.__setActive({ name: '연막', ymd: new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10), mode: 'view', voyageKey: '', equip: '', at: Date.now() });   // 조회만 — 쓰기 문지기(isViewOnlyNow)가 본다
      W.__initMode = S.mode || 'discharge'; W.__go(JSON.stringify(V), K);
    } catch (er) { errs.push('THROW ' + er.message); }
    await sleep(350);
    const d = W.document;
    const H = {
      W, d, errs, alerts, notices,
      click: async (b, ms = 300) => { if (b) { b.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await sleep(ms); } },
      txt: (b) => b.textContent.replace(/\s+/g, ' ').trim(),
    };
    H.btn = (re, root = d) => [...root.querySelectorAll('button')].find((b) => re.test(H.txt(b)) && !b.disabled);
    H.until = async (fn, ms = 4000) => { const end = Date.now() + ms; let v = fn(); while (!v && Date.now() < end) { await sleep(60); v = fn(); } return v; };
    H.cards = () => [...d.querySelectorAll('[data-gw-card]')].map((c) => ({ label: c.getAttribute('data-gw-card'), cn: c.getAttribute('data-gw-cn'), pos: c.getAttribute('data-gw-pos') }));
    H.bottom = () => d.querySelector('[data-bayview-bottom]');
    H.cell = (cn) => [...(H.bottom() || d).querySelectorAll('button')].find((b) => H.txt(b).includes(cn.slice(-4)) && b.className.includes('relative'));
    H.sync = async () => { try { W.__upd(JSON.stringify(W.__memdb.voyages[K]), K); } catch (er) { errs.push('SYNC ' + er.message); } await sleep(500); };   // 실제 앱은 RTDB 구독이 새 항차를 내려준다 — 스텁에는 구독이 없어 쓴 결과를 다시 내려준다
    H.done = () => Object.keys((W.__memdb.voyages[K].discharge || {}).completed || {}).filter((c) => (S ? S.track : LAST).includes(c));
    //  베이뷰 → 자동 가이드 → B38 장 → 데크
    await H.click([...d.querySelectorAll('button[role="tab"]')].find((b) => /작업 시작/.test(b.textContent)), 350);
    await H.click(await H.until(() => H.btn(/^베이뷰 작업/)), 400);
    await H.click(await H.until(() => H.btn(/자동 가이드$/)), 450);
    await H.until(() => /작업할 베이를 선택하세요/.test(d.body.textContent));
    {
      { const side = await H.until(() => H.btn(/우현 접안/), 3000); if (side) { await H.click(side, 500); const okb = await H.until(() => H.btn(/^맞습니다$/), 2000); if (okb) await H.click(okb, 500); } }
      await H.until(() => /작업할 베이를 선택하세요/.test(d.body.textContent));
    }
    return H;
  }
  const close = (H) => { try { H.W.close(); } catch (e) { /* 창 닫기 */ } };
  const chipOf = (H, bay) => [...H.d.querySelectorAll('button')].find((b) => { const m = H.txt(b).match(/^B([\d·()]+)/); return m && m[1].replace(/[()]/g, '·').split('·').filter(Boolean).map(Number).includes(bay) && /남은 컨/.test(H.txt(b)); });
  const holdBtn = (H) => [...H.d.querySelectorAll('button')].find((b) => /^🟠 홀드/.test(H.txt(b)));
  const openChooser = async (H, bay) => {
    const chip = await H.until(() => chipOf(H, bay), 4000);
    await H.click(chip, 400);
    const keep = H.btn(/그대로$/); if (keep) await H.click(keep, 300);
    await H.until(() => /작업할 단을 선택하세요/.test(H.d.body.textContent), 3000);
  };
  const vD = { key: 'OBWH_H', info: { ...clone(FB.info), berthSide: '우현' }, discharge: { ediContainers: clone(ediD), completed: {} }, loading: { ediContainers: {}, completed: {} } };
  {
    const H = await boot(false, { voyage: vD, vk: vD.key, bays: [10, 11], track: Object.keys(ediD), mode: 'discharge' });
    await openChooser(H, 11);
    let hb = holdBtn(H);
    ok(`H1 양하 — 11번 장(자기 장 데크 0 · 이웃 10번 데크 16)의 홀드 단추가 잠긴다 — ${hb ? H.txt(hb) : '단추 없음'}`, !!hb && hb.disabled === true && /같은 해치 B\S+ 데크 16개 먼저 양하 — 커버 아래 \(자동\)/.test(H.txt(hb)) && !H.errs.length, JSON.stringify({ t: hb && H.txt(hb), e: H.errs.slice(0, 3) }));
    { const d = [...H.d.querySelectorAll('button')].find((b) => /^🔵 데크 \d+개/.test(H.txt(b))); ok('H1b 11번 장의 데크 단추는 0개라 잠겨 있다(데크로도 홀드로도 안 열린다)', !!d && d.disabled === true, d ? H.txt(d) + ' disabled=' + d.disabled : '없음'); }
    await H.click(hb, 300);
    ok('H1c 잠긴 단추를 눌러도 홀드 단이 열리지 않는다(단 고르기 화면 그대로)', /작업할 단을 선택하세요/.test(H.d.body.textContent));
    //  뒤로 → 10번 장
    const back = [...H.d.querySelectorAll('button')].find((b) => /^베이$/.test(H.txt(b)));
    await H.click(back, 400);
    await openChooser(H, 10);
    hb = holdBtn(H);
    ok(`H2 양하 — 10번 장(자기 장 데크 16)의 홀드 단추도 잠기고 문구는 종전 그대로 — ${hb ? H.txt(hb) : '단추 없음'}`, !!hb && hb.disabled === true && /데크 16개 먼저 양하 — 커버 아래 \(자동\)/.test(H.txt(hb)) && !/같은 해치/.test(H.txt(hb)));
    const deckB = [...H.d.querySelectorAll('button')].find((b) => /^🔵 데크 \d+개/.test(H.txt(b)));
    ok('H2b 10번 장의 데크 단추는 열려 있다', !!deckB && deckB.disabled === false);
    //  데크를 다 내린다(스텁 메모리)
    for (const cn of deckCns) vD.discharge.completed[cn] = { at: Date.now(), by: '연막' };
    H.W.__memdb.voyages[vD.key].discharge.completed = clone(vD.discharge.completed);
    await H.sync();
    const back2 = [...H.d.querySelectorAll('button')].find((b) => /^베이$/.test(H.txt(b)));
    if (back2) await H.click(back2, 400);
    await openChooser(H, 11);
    hb = holdBtn(H);
    ok(`H3 데크를 다 내린 뒤 11번 장 홀드 단추가 열린다 — ${hb ? H.txt(hb) : '단추 없음'}`, !!hb && hb.disabled === false && !/먼저 양하/.test(H.d.body.textContent), JSON.stringify({ t: hb && H.txt(hb), e: H.errs.slice(0, 3) }));
    close(H);
  }
  {
    //  미르 «11번 베이로 옮겨줘» — 홀드 잠금을 우회하지 않는다(11번 장은 데크 0 · 이웃 10번 데크 16 → 홀드 대신 10번 장 데크 카드로)
    const vG = { key: 'OBWH_G', info: { ...clone(FB.info), berthSide: '우현' }, discharge: { ediContainers: clone(ediD), completed: {} }, loading: { ediContainers: {}, completed: {} } };
    const H = await boot(false, { voyage: vG, vk: vG.key, bays: [10, 11], track: Object.keys(ediD), mode: 'discharge' });
    H.notices.length = 0;
    H.W.__goto({ voyageKey: vG.key, mode: 'discharge', bay: 11 });
    await H.until(() => H.cards().length, 5000); await sleep(600);
    const cs = H.cards();
    ok(`G1 양하 — 미르가 11번 베이(홀드만 · 이웃 데크 16)로 옮기면 홀드 카드가 아니라 데크 카드 — ${cs.map((x) => x.pos).join()}`, cs.length >= 1 && cs.every((x) => parseInt(String(x.pos).split('-')[2], 10) >= 80), JSON.stringify({ cs, n: H.notices, e: H.errs.slice(0, 3) }));
    ok(`G2 알림이 홀드만 남았다·같은 해치 데크를 먼저 내려야 한다고 말한다 — «${H.notices[H.notices.length - 1] || ''}»`, H.notices.some((m) => /홀드만 남았어요 — 같은 해치 데크 16대를 먼저 내려야 해서/.test(m)), JSON.stringify(H.notices));
    //  데크를 다 내린 뒤에는 11번 홀드로 간다(종전)
    for (const cn of deckCns) vG.discharge.completed[cn] = { at: Date.now(), by: '연막' };
    H.W.__memdb.voyages[vG.key].discharge.completed = clone(vG.discharge.completed);
    await H.sync(); H.notices.length = 0;
    H.W.__goto({ voyageKey: vG.key, mode: 'discharge', bay: 11 });
    await sleep(2500);
    const cs2 = H.cards();
    ok(`G3 데크를 다 내린 뒤 11번 베이로 옮기면 종전대로 홀드 단으로 간다 — «${H.notices[H.notices.length - 1] || ''}»`, H.notices.some((m) => /B11 홀드로 옮겼어요/.test(m)) && !H.notices.some((m) => /데크로 왔어요/.test(m)), JSON.stringify({ cs2, n: H.notices }));
    close(H);
  }
  {
    //  선적 — 규칙 미적용(홀드 먼저 싣는다). 같은 자리의 선적 항차.
    const vL = { key: 'OBWH_L', info: { ...clone(FB.info), berthSide: '우현' }, discharge: { ediContainers: {}, completed: {} }, loading: { ediContainers: clone(ediL), completed: {} } };
    const H = await boot(false, { voyage: vL, vk: vL.key, bays: [10, 11], track: [], mode: 'loading' });
    const sel = await H.until(() => chipOf(H, 11), 5000);
    ok('H4 선적 화면에도 11번 장 칩이 있다', !!sel, H.d.body.textContent.slice(0, 200));
    if (sel) {
      await openChooser(H, 11);
      const hb = holdBtn(H);
      ok(`H4 선적 — 11번 장 홀드 단추는 데크와 무관하게 열려 있다(규칙 미적용) — ${hb ? H.txt(hb) : '단추 없음'}`, !!hb && hb.disabled === false && !/먼저 양하/.test(H.d.body.textContent));
    }
    close(H);
  }
  console.log(`\n${bad ? '✘' : '✔'} 4.81-01 홀드 게이트 연막검사 ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('✘ 예외', e); process.exit(1); });
