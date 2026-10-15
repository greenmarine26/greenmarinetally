// 회귀 기준표 R39 — 작업 카드 개편(4.26 판 F): 카드 위계(자리 상자·칩·실번호) · 예외 줄 · 트윈 «앞만/뒤만/둘 다 다름» · 다음 예정 줄 → 맨 앞 · 장 칩. smoke_regress.cjs 가 부른다.
//   근거 — 모의 작업장 1차 설계(proposal_work §1~§5) · 검수사 2026-10-13 00:53 «전부 클로드 안대로 수정하고 배포» · 2026-10-14 10:33 «앞이 다름 뒤가 다름 그럼 둘다 다름은?» · 10:35 «한대만 오면 싱글작업입니다» · 10:37 «무게 때문에 싱글 작업 할수도 있습니다».
//   실소스 항차 화면(VoyagePage)을 jsdom 에서 그리고 검수원 손 그대로 누른다. Firebase 는 메모리 스텁(tools/stub_fbdb_mem.js — 실제 쓰기 없음).
//   ⚠ 기대값은 코드에서 베끼지 않는다 — 자리·출발/도착·실번호·엠티실은 픽스처 원자료를 이 파일이 직접 읽고, 완료는 스텁 메모리(원자료)를 읽는다.
//   자료 — tools/fixtures/work42502_obwh.json(보관소 OBWH 2763E 양하 — R37 과 같은 사본) · tools/fixtures/esealinsp_tnjp26367.json(보관소 TNJP 26367W 선적 — 엠티 42대 엠티실만, R38 과 같은 사본).
//   실행: smoke_regress.cjs 안에서 — require('./regress_r39_card.cjs')({ ROOT, TMP, ok, head, fx, stub })
//         단독 — node tools/regress_r39_card.cjs <저장소 루트>
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async function r39({ ROOT, TMP, ok, head, fx, stub }) {
  head('R39 작업 카드 개편 — 자리 상자·칩 한 줄·실번호(검수리스트와 같은 값) · 예외 줄 · 트윈 앞만/뒤만/둘 다 다름 · 싱글로 한 대씩 · 다음 예정 줄 → 맨 앞 · 장 칩 (4.26)',
    '모의 작업장 1차 설계 proposal_work §1~§5 · 검수사 2026-10-13 00:53 «전부 클로드 안대로» · 2026-10-14 10:33 «앞이 다름 뒤가 다름 그럼 둘다 다름은?» · 10:35 «한대만 오면 싱글작업입니다»');
  const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const FX = fx('work42502_obwh.json');
  const TN = fx('esealinsp_tnjp26367.json');
  const E = FX.discharge.ediContainers, XL = FX.discharge.xrayList, RD = FX.discharge.records || {};
  const centerOf = (bay) => { const b = parseInt(bay, 10); return b % 2 === 0 ? b : (b % 4 === 1 ? b + 1 : b - 1); };
  const inGroup = (cn, center) => centerOf(E[cn].bay) === center;
  const isDeck = (cn) => parseInt(E[cn].tier, 10) >= 80;
  const posOf = (c) => `${parseInt(c.bay, 10)}-${c.row}-${c.tier}`;
  const baseVoy = () => ({ key: FX.key, info: clone(FX.info), discharge: { ...clone(FX.discharge), completed: {}, xraySeals: {} }, loading: clone(FX.loading) });
  //  TNJP 26367W 선적 — 보관소 사본은 출항 뒤라 마감 표식을 걷어 작업 중 항차로 연다(자료 칸은 그대로)
  const tnVoy = () => {
    const info = clone(TN.info);
    for (const k of Object.keys(info)) if (/Done|depart|workEnd/i.test(k)) delete info[k];
    return { key: TN.key, info, loading: { ...clone(TN.loading), completed: {} } };
  };

  const eF = path.join(TMP, 'r39.jsx'), oF = path.join(TMP, 'r39.js');
  fs.writeFileSync(eF, [
    `import React from "${ROOT}/node_modules/react/index.js";`,
    `import { createRoot } from "${ROOT}/node_modules/react-dom/client.js";`,
    `import VoyagePage from "${ROOT}/src/pages/VoyagePage.jsx";`,
    `let root = null; const el = (v, key, mode) => React.createElement(VoyagePage, { voyageKey: key, voyage: v, inspector: '연막', inspectors: [], portMisData: {}, pilotForecast: {}, onGoHome() {}, onModeChange() {}, initModeOverride: mode });`,
    `window.__R39go = (json, key, mode) => { root = createRoot(document.getElementById('root')); root.render(el(JSON.parse(json), key, mode)); };`,
    `window.__R39upd = (json, key, mode) => { root.render(el(JSON.parse(json), key, mode)); };`,
  ].join('\n'));
  execSync(`npx esbuild "${eF}" --bundle --loader:.jsx=jsx --loader:.js=jsx --loader:.png=dataurl --loader:.json=json --jsx=automatic --external:fs --external:path --external:url --alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --alias:pdfjs-dist/build/pdf=${ROOT}/tools/stub_pdfjs.js --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${oF}"`, { cwd: ROOT, stdio: 'pipe' });
  const vSrc = fs.readFileSync(oF, 'utf8');

  const open = async (voy, mode = 'discharge', equip = '1호기', dict = FX.shipDict) => {
    const vk = voy.key;
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
    const W = dom.window, errs = [];
    W.addEventListener('error', (ev) => errs.push(ev.message)); W.console.warn = () => {}; W.console.log = () => {};
    W.matchMedia = W.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    W.scrollTo = () => {}; W.HTMLElement.prototype.scrollIntoView = function () {};
    W.global = W; W.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
    const alerts = []; W.alert = (m) => alerts.push(String(m));
    W.localStorage.setItem('gm_equip_no', equip);
    W.localStorage.setItem('master_active_inspector_v1', '연막');
    W.__memdb = { voyages: { [vk]: clone(voy) }, ship_bay_dict_v3: dict ? clone(dict) : {} };
    W.__fbShipBayDict = dict ? clone(dict) : {};
    try { W.eval(vSrc); W.__R39go(JSON.stringify(voy), vk, mode); } catch (er) { errs.push('THROW ' + er.message); }
    await sleep(350);
    const d = W.document;
    const click = async (b, ms = 250) => { if (b) { b.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await sleep(ms); } return !!b; };
    const txt = (b) => b.textContent.replace(/\s+/g, ' ').trim();
    const btn = (re) => [...d.querySelectorAll('button')].find((b) => re.test(txt(b)) && !b.disabled);
    const until = async (fn, ms = 4000) => { const end = Date.now() + ms; let v = fn(); while (!v && Date.now() < end) { await sleep(60); v = fn(); } return v; };
    const type = async (input, val) => {
      const setter = Object.getOwnPropertyDescriptor(W.HTMLInputElement.prototype, 'value').set;
      setter.call(input, val); input.dispatchEvent(new W.Event('input', { bubbles: true })); await sleep(200);
    };
    const mem = () => W.__memdb.voyages[vk];
    const tab = async (re) => click(await until(() => [...d.querySelectorAll('button[role="tab"]')].find((b) => re.test(b.textContent))), 350);
    const dialog = () => [...d.querySelectorAll('div.fixed.inset-0')].find((x) => /z-\[100\]/.test(x.className)) || null;
    const cards = () => [...d.querySelectorAll('[data-gw-card]')];
    const firstCn = () => { const c = cards()[0]; return c ? c.getAttribute('data-gw-cn') : ''; };
    const nextRows = () => [...d.querySelectorAll('[data-gw-next-cn]')];
    const exRow = () => d.querySelector('[data-gw-exrow]');
    const exBtns = () => { const r = d.querySelectorAll('[data-gw-exrow] [data-gw-ex]'); return [...r].map((b) => txt(b)); };
    const groupBtn = (center) => [...d.querySelectorAll('button')].find((b) => { const m = txt(b).match(/^B([\d·]+)/); return m && m[1].split('·').map(Number).includes(center) && /남은 컨/.test(txt(b)); });
    const startGuide = async () => { await tab(/작업 시작/); await click(await until(() => btn(/^🤖\s*자동 가이드$/)), 350); await until(() => /작업할 베이를 선택하세요/.test(d.body.textContent)); };
    const pick = async (center, tierRe) => {
      await click(groupBtn(center), 350);
      const g = await until(() => btn(/^1호기 그대로$/) || btn(tierRe));
      if (g && /그대로$/.test(txt(g))) await click(g, 300);
      await click(await until(() => btn(tierRe)), 400);
      await until(() => cards().length > 0 || d.querySelector('[data-group-left="1"]'));
    };
    const done = (m = mode) => Object.keys((mem()[m] || {}).completed || {}).sort();
    return { W, d, errs, alerts, click, btn, until, type, mem, tab, dialog, txt, cards, firstCn, nextRows, exRow, exBtns, groupBtn, startGuide, pick, done, close: () => { try { W.close(); } catch (er) { /* 창 닫기 */ } } };
  };

  //  ── ① 카드 위계 · 예외 줄(양하 단독) — B5·6·7 데크 첫 카드
  {
    const S = await open(baseVoy());
    await S.startGuide();
    await S.pick(6, /^🔵 데크 [1-9]/);
    const card = S.cards()[0];
    const cn = card ? card.getAttribute('data-gw-cn') : '';
    const c = E[cn] || {};
    const box = card ? [...card.querySelectorAll('span')].find((s) => /gw-pos/.test(s.className)) : null;
    const last4 = card ? [...card.querySelectorAll('span')].find((s) => /gw-cn-b/.test(s.className)) : null;
    const chips = card ? [...card.querySelectorAll('span.gw-chip')].map((s) => S.txt(s)) : [];
    const route = card ? S.txt(card).includes(`${c.pol} → ${c.pod}`) : false;
    const wantReefer = (c.rf || /^.{2}R/.test(String(c.iso || ''))) && c.fe !== 'E';
    const seal = card ? card.querySelector('[data-gw-seal]') : null;
    const wantSeal = String((RD[cn] || {}).sl || c.sl || '').trim();
    const single = S.cards().length === 1;
    const ex = S.exBtns();
    const goBtn = [...S.d.querySelectorAll('button.gw-go')][0];
    const oldBtns = ['다른 컨테이너가 나옴', '⏸ 지금 양하 불가', '싱글로 한 대씩'].filter((t) => [...S.d.querySelectorAll('button')].some((b) => S.txt(b).startsWith(t)));
    ok(`①-1 B5·6·7 데크 첫 카드 ${cn} — 자리 상자 «${box ? S.txt(box) : '-'}»(픽스처 ${posOf(c)}) · 끝4 큰 글자 «${last4 ? S.txt(last4) : '-'}» · ${c.pol} → ${c.pod} ${route} · 칩 [${chips.join(' | ')}] · 실 «${seal ? seal.getAttribute('data-gw-seal') : '-'}»(원자료 «${wantSeal}»)`,
      !!cn && !!box && S.txt(box) === posOf(c) && card.getAttribute('data-gw-pos') === posOf(c) && !!last4 && S.txt(last4) === cn.slice(-4) && route
        && chips.includes(c.tp) && chips.some((x) => x.startsWith('FULL')) && chips.some((x) => /리퍼/.test(x)) === wantReefer
        && !!seal && seal.getAttribute('data-gw-seal') === wantSeal && !S.errs.length,
      JSON.stringify({ cn, box: box && S.txt(box), pos: posOf(c), chips, wantReefer, seal: seal && seal.getAttribute('data-gw-seal'), wantSeal, errs: S.errs.slice(0, 3) }));
    ok(`①-2 확인 단추 60px 칸(gw-go) «${goBtn ? S.txt(goBtn) : '-'}» · 예외 줄 [${ex.join('][')}] (${single ? '단독' : '트윈'}) · 쌓여 있던 옛 단추 ${oldBtns.length ? oldBtns.join('·') : '없음'}`,
      !!goBtn && /양하확인$/.test(S.txt(goBtn)) && (single ? (ex[0] === '다른 컨' && ex.includes('⏸ 보류') && !ex.includes('다른 칸')) : ex.includes('둘 다 다름')) && !oldBtns.length && !S.errs.length,
      JSON.stringify({ go: goBtn && S.txt(goBtn), ex, single, oldBtns }));
    //  ①-3 [다른 컨] → 수정 칸 · [⏸ 보류] 를 누르면 수정 칸은 닫히고 보류 칸이 열림 · 다시 누르면 닫힘 · 완료 0
    const fixInput = () => [...S.d.querySelectorAll('input')].find((i) => /예: 1234/.test(i.getAttribute('placeholder') || ''));
    await S.click(S.btn(/^다른 컨$/), 300);
    const f1 = !!fixInput();
    await S.click(S.btn(/^⏸ 보류$/), 300);
    const f2 = !!fixInput(), h2 = !!S.d.querySelector('[data-gw-hold="1"]');
    const reasons = h2 ? [...S.d.querySelector('[data-gw-hold="1"]').querySelectorAll('button')].map((b) => S.txt(b)) : [];
    await S.click(S.btn(/^⏸ 보류$/), 300);
    const h3 = !!S.d.querySelector('[data-gw-hold="1"]');
    ok(`①-3 [다른 컨] → 수정 칸 ${f1} · [⏸ 보류] → 수정 칸 닫힘 ${!f2} · 보류 칸(${reasons.slice(0, 3).join('·')}) ${h2} · [⏸ 보류] 다시 → 닫힘 ${!h3} · 완료 ${S.done().length}`,
      f1 && !f2 && h2 && reasons.includes('콘 잠김') && !h3 && S.done().length === 0 && !S.errs.length, JSON.stringify({ f1, f2, h2, h3, reasons }));

    //  ── ② 다음 예정 줄 → 그 컨이 맨 앞 카드로(띠 «다음 예정에서 올린 카드» · [원래 순서로]) · 확인은 카드 단추로 — 그 컨만 완료
    const rows = S.nextRows();
    const pickRow = rows.find((r) => { const m = r.getAttribute('data-gw-next-cn'), t = r.getAttribute('data-gw-next-twin'); return m !== cn && !XL[m] && !(t && XL[t]); });
    const want = pickRow ? pickRow.getAttribute('data-gw-next-cn') : '';
    const wantTwin = pickRow ? pickRow.getAttribute('data-gw-next-twin') : '';
    const rowPos = pickRow ? pickRow.getAttribute('data-gw-next-pos') : '';
    await S.click(pickRow || null, 400);
    const up = { first: S.firstCn(), banner: !!S.d.querySelector('[data-gw-pulled="1"]') };
    await S.click(S.btn(/^원래 순서로$/), 400);
    const back = { first: S.firstCn(), banner: !!S.d.querySelector('[data-gw-pulled="1"]') };
    ok(`②-1 다음 예정 ${rows.length}줄(44px 단추) · «${want}${wantTwin ? ' +' + wantTwin.slice(-4) : ''} ${rowPos}»(픽스처 ${want ? posOf(E[want]) : '-'}) 줄을 누르면 맨 앞 카드 ${up.first} · 띠 ${up.banner} → [원래 순서로] → 카드 ${back.first}(처음 ${cn}) · 띠 ${back.banner}`,
      rows.length >= 2 && rows.length <= 4 && !!want && rowPos === posOf(E[want]) && up.first === want && up.banner && back.first === cn && !back.banner && S.done().length === 0 && !S.errs.length,
      JSON.stringify({ n: rows.length, want, rowPos, up, back }));
    await S.click(S.nextRows().find((r) => r.getAttribute('data-gw-next-cn') === want) || null, 400);
    await S.click([...S.d.querySelectorAll('button.gw-go')][0] || null, 500);
    const add = S.done();
    const expect = [want, wantTwin].filter(Boolean).sort();
    ok(`②-2 다시 올리고 큰 확인 단추 → 완료 ${add.join(',')}(기대 ${expect.join(',')} — 원래 첫 카드 ${cn} 은 안 됨) · 띠 사라짐`,
      JSON.stringify(add) === JSON.stringify(expect) && !add.includes(cn) && !S.d.querySelector('[data-gw-pulled="1"]') && !S.errs.length, JSON.stringify({ add, expect }));

    //  ── ⑤ 장 칩 — 남은 장 수만큼 · 지금 장 칩 = «데크 ⇄»(누르면 단 고르기) · 다른 장 칩 = 그 장으로(단 고르기)
    const chipsG = [...S.d.querySelectorAll('[data-gw-groups] [data-gw-group]')];
    const centers = [...new Set(Object.keys(E).filter((x) => !S.mem().discharge.completed[x]).map((x) => centerOf(E[x].bay)))].sort((a, b) => a - b);
    const cur = chipsG.find((b) => b.getAttribute('data-gw-group') === '6');
    const curTxt = cur ? S.txt(cur) : '';
    await S.click(cur || null, 350);
    const toTier = /작업할 단을 선택하세요/.test(S.d.body.textContent);
    await S.click(await S.until(() => S.btn(/^🔵 데크 [1-9]/)), 400);
    const other = [...S.d.querySelectorAll('[data-gw-groups] [data-gw-group]')].find((b) => b.getAttribute('data-gw-group') === '10');
    await S.click(other || null, 400);
    const toTier10 = await S.until(() => /B9·10·11 — 작업할 단을 선택하세요/.test(S.d.body.textContent.replace(/\s+/g, ' ')));
    ok(`⑤ 장 칩 ${chipsG.length}개(픽스처 남은 장 ${centers.length}) · 지금 장 «${curTxt}» → 단 고르기 ${toTier} · 다른 장 B9·10·11 칩 → 그 장 단 고르기 ${!!toTier10}`,
      chipsG.length === centers.length && /^B5·6·7 데크 ⇄$/.test(curTxt) && toTier && !!toTier10 && !S.errs.length, JSON.stringify({ n: chipsG.length, centers, curTxt, toTier, toTier10: !!toTier10 }));
    S.close();
  }

  //  ── ③ X-RAY 대상 카드 — 칩 «★ X-RAY» · 예외 줄 [★ XRAY] → 카드 안 XRAY 칸 · 대상 아닌 카드에는 [★ XRAY] 없음
  {
    const v = baseVoy();
    //  B5·6·7 데크 첫 카드를 찾아 그 컨을 XRAY 대상으로 둔 사본(보관소 xrayList 의 한 줄과 같은 꼴 — 실 미입력)
    const S0 = await open(v); await S0.startGuide(); await S0.pick(6, /^🔵 데크 [1-9]/);
    const cn0 = S0.firstCn(); const ex0 = S0.exBtns(); S0.close();
    const tpl = Object.values(XL)[0];
    v.discharge.xrayList = { ...v.discharge.xrayList, [cn0]: { ...clone(tpl), seal: '' } };
    const S = await open(v); await S.startGuide(); await S.pick(6, /^🔵 데크 [1-9]/);
    const card = S.cards()[0];
    const chip = card ? [...card.querySelectorAll('span.gw-chip')].some((s) => S.txt(s) === '★ X-RAY') : false;
    const ex = S.exBtns();
    await S.click(S.btn(/^★ XRAY$/), 300);
    const inCard = card ? !!card.querySelector('input[placeholder="XRAY 실번호"]') : false;
    ok(`③ ${cn0} 을 XRAY 대상으로 둔 사본 — 칩 «★ X-RAY» ${chip} · 예외 줄 [${ex.join('][')}] · [★ XRAY] → 카드 안 XRAY 칸 ${inCard} · 대상 아닐 때 예외 줄 [${ex0.join('][')}](XRAY 단추 없음)`,
      S.firstCn() === cn0 && chip && ex.includes('★ XRAY') && inCard && !ex0.includes('★ XRAY') && S.done().length === 0 && !S.errs.length, JSON.stringify({ cn0, chip, ex, ex0, inCard }));
    S.close();
  }

  //  ── ⑦ 보류 되묻기와 «다음 예정» 줄(감사·2차 시뮬 중-1) — 다른 장의 되묻기 차례 보류가 이 장의 «맨 앞» 을 지우지 않는다 · 이 카드가 되묻기 카드면 줄을 잠그고 까닭을 적는다
  {
    const v = baseVoy();
    const away = Object.keys(E).filter((x) => inGroup(x, 10) && !isDeck(x)).sort()[0];
    v.discharge.held = { [away]: { reason: '콘 잠김', at: Date.now() - 2 * 3600000, by: '다른검수원', equip: '3호기', doneAt: 0 } };
    const S = await open(v);
    await S.startGuide();
    await S.pick(6, /^🔵 데크 [1-9]/);
    const first = S.firstCn();
    const row = S.nextRows().find((r) => !XL[r.getAttribute('data-gw-next-cn')]);
    const want = row ? row.getAttribute('data-gw-next-cn') : '';
    await S.click(row || null, 400);
    ok(`⑦-1 다른 장(B9·10·11) ${away} 콘 잠김 보류 2시간 — 이 장(B5·6·7 데크) 다음 예정 ${want} 줄 → 맨 앞 ${S.firstCn()}(처음 ${first}) · 띠 ${!!S.d.querySelector('[data-gw-pulled="1"]')}(고치기 전에는 아무 일 없음)`,
      !!want && S.firstCn() === want && !!S.d.querySelector('[data-gw-pulled="1"]') && S.done().length === 0 && !S.errs.length, JSON.stringify({ away, first, want, now: S.firstCn() }));
    S.close();
    //  ⑦-2 이 장 첫 카드를 2시간 전 콘 잠김 보류로 둔 사본 — 되묻기 카드가 맨 앞 · 다음 예정 줄 잠김 · «먼저 답하세요»
    const S0 = await open(baseVoy()); await S0.startGuide(); await S0.pick(6, /^🔵 데크 [1-9]/); const c0 = S0.firstCn(); S0.close();
    const v2 = baseVoy();
    v2.discharge.held = { [c0]: { reason: '콘 잠김', at: Date.now() - 2 * 3600000, by: '연막', equip: '1호기', doneAt: 0 } };
    const S2 = await open(v2);
    await S2.startGuide();
    await S2.pick(6, /^🔵 데크 [1-9]/);
    const ask = /보류했던 컨테이너입니다/.test(S2.d.body.textContent);
    const rows2 = S2.nextRows();
    const locked = rows2.length > 0 && rows2.every((r) => r.disabled);
    const hint = /보류했던 컨 물음\(이제 됩니까\?\)이 떠 있는 동안은 줄이 잠깁니다/.test(S2.d.body.textContent);
    ok(`⑦-2 이 장 첫 카드 ${c0} 콘 잠김 보류 2시간 → 맨 앞 ${S2.firstCn()} · «보류했던 컨테이너입니다» ${ask} · 다음 예정 ${rows2.length}줄 잠김 ${locked} · «떠 있는 동안은 줄이 잠깁니다» ${hint}`,
      S2.firstCn() === c0 && ask && locked && hint && !S2.errs.length, JSON.stringify({ c0, first: S2.firstCn(), ask, n: rows2.length, locked, hint }));
    S2.close();
  }

  //  ── ④ 트윈 — 예외 줄 두 줄 · [앞만 다름] = 앞 칸만 · [둘 다 다름] = 두 칸 · [뒤만 다름] 고른 뒤 ✕ 로 닫으면 두 칸으로 · [싱글로 한 대씩] = 고른 한 대만
  const twinVoy = () => {
    const v = baseVoy(); let t = Date.now() - 3600000;
    for (const cn of Object.keys(E).filter((x) => inGroup(x, 6) && !([5, 7].includes(parseInt(E[x].bay, 10)) && parseInt(E[x].tier, 10) <= 4)).sort()) v.discharge.completed[cn] = { by: '연막', at: (t += 60000), equip: '1호기' };
    return v;
  };
  {
    const S = await open(twinVoy());
    await S.startGuide();
    await S.pick(5, /^🟠 홀드 [1-9]/);   // 6번 베이를 다 끝낸 사본이라 묶음 단추는 «B5·7»
    const [front, back] = S.cards().map((x) => x.getAttribute('data-gw-cn'));
    const ex = S.exBtns();
    const ins = () => [...S.d.querySelectorAll('input')].filter((x) => /실제 온 컨 끝 4자리/.test(x.getAttribute('placeholder') || ''));
    const fh = () => { const h = S.d.querySelector('[data-gw-fixhead]'); return h ? h.getAttribute('data-gw-fixhead') : ''; };
    await S.click(S.btn(/^앞만 다름$/), 300);
    const a = { n: ins().length, h: fh(), lab: (S.d.querySelector('[data-gw-fixhead]') || { parentElement: null }).parentElement ? S.txt(S.d.querySelector('[data-gw-fixhead]').parentElement).includes(`앞 (`) : false };
    await S.click(S.btn(/^앞만 다름$/), 300);
    const closed = ins().length;
    await S.click(S.btn(/^둘 다 다름$/), 300);
    const b = { n: ins().length, h: fh() };
    ok(`④-1 트윈 ${front}·${back} — 예외 줄 [${ex.join('][')}] · [앞만 다름] → 칸 ${a.n}개(${a.h}) · 다시 누르면 닫힘(${closed}) · [둘 다 다름] → 칸 ${b.n}개(${b.h})`,
      !!front && !!back && JSON.stringify(ex.slice(0, 3)) === JSON.stringify(['앞만 다름', '뒤만 다름', '둘 다 다름']) && /^싱글로 한 대씩( — 권합니다)?$/.test(ex[3] || '') && ex[4] === '⏸ 보류' && a.n === 1 && a.h === 'front' && a.lab && closed === 0 && b.n === 2 && b.h === 'both' && !S.errs.length,
      JSON.stringify({ ex, a, closed, b }));
    //  ④-2 [뒤만 다름] → 같은 단 다른 20피트를 고르고 적용 → «앞쪽 ○○○○ 도 왔습니까» → ✕ → 두 칸으로(고른 뒤 칸은 그대로) · 완료 0
    const act = Object.keys(E).filter((cn) => [5, 7].includes(parseInt(E[cn].bay, 10)) && parseInt(E[cn].tier, 10) === 4 && cn !== front && cn !== back).sort()[0];
    const done0 = S.done();
    await S.click(S.btn(/^뒤만 다름$/), 300);
    const one = ins();
    if (one[0]) await S.type(one[0], act.slice(-4));
    await S.click(await S.until(() => [...S.d.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').startsWith(act))), 300);
    await S.click(S.btn(/^선택한 수정 적용/), 400);
    const dlg = await S.until(() => S.dialog());
    const title = dlg ? (dlg.querySelector('.font-black') || {}).textContent : '';
    await S.click(dlg ? [...dlg.querySelectorAll('button')][0] : null, 400);   // ✕
    const after = { n: ins().length, h: fh(), kept: S.txt(S.d.body).includes(act) };
    ok(`④-2 [뒤만 다름] → 뒤 칸에 ${act} → 적용 → «${title}» → ✕ → 두 칸으로(${after.h} — 앞은 입력칸 ${after.n}개 · 뒤는 고른 ${act.slice(-4)} 그대로 ${after.kept}) · 완료 늘음 ${S.done().length - done0.length}`,
      !!act && /^앞쪽 \d{4} 도 왔습니까$/.test(title || '') && after.n === 1 && after.h === 'both' && after.kept && S.done().length === done0.length && !S.dialog() && !S.errs.length,
      JSON.stringify({ act, title, after }));
    S.close();
  }
  {
    //  ④-3 [싱글로 한 대씩] → 두 대가 나란히(«이것부터») · 뒤를 누르면 뒤 한 대만 완료 · 다음 카드 맨 앞 = 남은 앞(4.08-02)
    const S = await open(twinVoy());
    await S.startGuide();
    await S.pick(5, /^🟠 홀드 [1-9]/);   // 6번 베이를 다 끝낸 사본이라 묶음 단추는 «B5·7»
    const [front, back] = S.cards().map((x) => x.getAttribute('data-gw-cn'));
    const done0 = S.done();
    await S.click(S.btn(/^싱글로 한 대씩/), 300);
    const ones = [...S.d.querySelectorAll('button')].filter((b) => /이것부터$/.test(S.txt(b)));
    const head = /싱글 — 한 대씩/.test(S.d.body.textContent);
    await S.click(ones.find((b) => S.txt(b).startsWith(back)) || null, 500);
    const add = S.done().filter((x) => !done0.includes(x));
    await S.until(() => S.firstCn() === front);
    ok(`④-3 [싱글로 한 대씩] → «이것부터» ${ones.length}개 · 안내 «싱글 — 한 대씩» ${head} · 뒤 ${back} 누름 → 완료 ${add.join(',')} · 다음 카드 맨 앞 ${S.firstCn()}(남은 짝 ${front})`,
      ones.length === 2 && head && add.length === 1 && add[0] === back && S.firstCn() === front && !S.errs.length, JSON.stringify({ n: ones.length, add, first: S.firstCn() }));
    S.close();
  }

  //  ── ⑥ 선적(TNJP 26367W) — 엠티 카드: 실번호 칸 = 엠티실(원자료 records.eseal) · 자리 확인 칸이 «다른 컨» 이라 예외 줄은 [다른 칸][⏸ 보류] · [다른 칸] → 위치 지정 창(배정 후 바로 선적확인 켬) · 쓰기 0
  //     엠티실이 없는 엠티는 «엠티 · 실 없음»(경고 아님) · 긴급·수화물 표식(forecast 번호) 칩
  //  B5·6·7 홀드의 5·7번 베이 20피트 엠티(트윈)는 끝낸 사본 — 남는 6번 베이 40피트 엠티가 단독 카드로 선다
  const tnSingleVoy = () => {
    const v = tnVoy(); let t = Date.now() - 3600000;
    for (const [cn, c] of Object.entries(TN.loading.ediContainers)) if ([5, 7].includes(parseInt(c.bay, 10))) v.loading.completed[cn] = { by: '연막', at: (t += 60000), equip: '1호기' };
    return v;
  };
  {
    const v = tnSingleVoy();
    const RL = TN.loading.records, EL = TN.loading.ediContainers;
    const S = await open(v, 'loading', '1호기', null);
    await S.startGuide();
    await S.pick(6, /^🟠 홀드 [1-9]/);
    const card = S.cards()[0];
    const cn = card ? card.getAttribute('data-gw-cn') : '';
    const seal = card ? card.querySelector('[data-gw-seal]') : null;
    const lbl = seal ? S.txt(seal) : '';
    const ex = S.exBtns();
    const slotBox = /이 자리에 실제로 실은 컨테이너/.test(S.d.body.textContent);
    const slotBtn = !!S.d.querySelector('[data-gw-ex="slot"]');
    ok(`⑥-1 선적 B5·6·7 홀드(엠티만 · 5·7번 끝냄) 단독 카드 ${cn} — 실번호 칸 «${lbl}»(원자료 엠티실 ${(RL[cn] || {}).eseal}) · 자리 확인 칸 ${slotBox} · 예외 줄 [${ex.join('][')}] · [📍 이 컨을 다른 칸에 실음] ${slotBtn ? '있음' : '없음'}(자리 확인 중에는 숨김 — 감사 중-3)`,
      !!cn && (RL[cn] || {}).fe === 'E' && !!seal && seal.getAttribute('data-gw-seal') === String(RL[cn].eseal) && /^엠티실:/.test(lbl) && slotBox && JSON.stringify(ex) === JSON.stringify(['⏸ 보류']) && !slotBtn && !S.errs.length,
      JSON.stringify({ cn, lbl, eseal: (RL[cn] || {}).eseal, ex, slotBox, slotBtn, errs: S.errs.slice(0, 3) }));
    //  ⑥-1b (재감사 하-B) 실번호 연필 → 보이는 엠티실로 채워 열림 → 고치지 않고 [저장] → 쓰지 않고 닫힘(sl·이력 안 생김)
    await S.click(seal, 300);
    const inp = [...S.d.querySelectorAll('input')].find((i) => i.getAttribute('placeholder') === '실번호 입력');
    const pre = inp ? inp.value : '';
    await S.click(inp ? [...inp.parentElement.querySelectorAll('button')].find((b) => S.txt(b) === '저장') : null, 400);
    const r1 = (S.mem().loading.records || {})[cn] || {};
    ok(`⑥-1b 실번호 연필 → 칸에 «${pre}»(엠티실) · 고치지 않고 [저장] → sl «${r1.sl || ''}» · 이력 ${Array.isArray(r1.sl_history) ? r1.sl_history.length : 0} · 칸 닫힘 ${!S.d.querySelector('input[placeholder="실번호 입력"]')}`,
      pre === String(RL[cn].eseal) && !String(r1.sl || '').trim() && !r1.sl_history && !S.d.querySelector('input[placeholder="실번호 입력"]') && !S.errs.length, JSON.stringify({ pre, sl: r1.sl, hist: r1.sl_history }));
    S.close();
    //  ⑥-3 엠티실을 지운 사본 — «엠티 · 실 없음»(⚠ 미입력 아님) · forecast 긴급·수화물 번호면 칩
    const v2 = tnSingleVoy();
    delete v2.loading.records[cn].eseal;
    v2.info.forecast = { ...(v2.info.forecast || {}), urgentCns: [cn], luggageCns: [cn] };
    const S2 = await open(v2, 'loading', '1호기', null);
    await S2.startGuide();
    await S2.pick(6, /^🟠 홀드 [1-9]/);
    const c2 = S2.cards()[0];
    const s2 = c2 ? S2.txt(c2.querySelector('[data-gw-seal]')) : '';
    const ch2 = c2 ? [...c2.querySelectorAll('span.gw-chip')].map((x) => S2.txt(x)) : [];
    ok(`⑥-3 엠티실 지운 ${cn} → «${s2}» · 칩 [${ch2.join(' | ')}](긴급·수화물 번호에 올림) · 엠티라 ❄ 리퍼 없음`,
      S2.firstCn() === cn && /엠티 · 실 없음/.test(s2) && !/미입력/.test(s2) && ch2.includes('▲ 긴급') && ch2.includes('🧳 수화물') && ch2.some((x) => x === 'EMPTY' || x.startsWith('EMPTY ')) && !ch2.some((x) => /리퍼/.test(x)) && !S2.errs.length,
      JSON.stringify({ s2, ch2, first: S2.firstCn() }));
    S2.close();
    //  ⑥-4 풀 카드(B18 홀드 — 풀만) — 예외 줄 [다른 컨][⏸ 보류][📍 위치 틀림] · «📍 자리 확인 방식으로» 길이 남아 있다(2-0-D)
    //     ★ 4.27 한 화면 틀: 종전 따로 줄 «📍 이 컨을 다른 칸에 실음 — xxxx» 는 예외 줄 [📍 위치 틀림] 이 되었다(같은 창 — setPosFor(card.main)) · 검수사 2026-10-15 08:43·08:52.
    const S3 = await open(tnVoy(), 'loading', '1호기', null);
    await S3.startGuide();
    await S3.pick(18, /^🟠 홀드 [1-9]/);
    const cn3 = S3.firstCn();
    const ex3 = S3.exBtns();
    const slotTgl = !!S3.btn(/^📍 자리 확인 방식으로/);
    const sb3 = S3.d.querySelector('[data-gw-exrow] [data-gw-ex="pos"]');
    const oldSlot3 = !!S3.d.querySelector('[data-gw-ex="slot"]');
    ok(`⑥-4 선적 풀 카드 ${cn3}(원자료 ${(EL[cn3] || {}).fe}) — 예외 줄 [${ex3.join('][')}] · «${sb3 ? S3.txt(sb3) : '-'}» · 옛 따로 줄 ${oldSlot3 ? '남음' : '없음'} · «📍 자리 확인 방식으로» ${slotTgl}`,
      (EL[cn3] || {}).fe === 'F' && JSON.stringify(ex3) === JSON.stringify(['다른 컨', '⏸ 보류', '📍 위치 틀림']) && !!sb3 && S3.txt(sb3) === '📍 위치 틀림' && !oldSlot3 && slotTgl && !S3.errs.length, JSON.stringify({ cn3, ex3, slotTgl, oldSlot3 }));
    //  ⑥-2 (감사·2차 시뮬 상-1) [📍 위치 틀림](4.26 «📍 이 컨을 다른 칸에 실음») → 위치 지정 창 → B18 → 이름표가 걸린 칸 → 다음 → 변경 확정 → (자리를 바꿉니다 → 바꾸기) → (시퀀스 자리입니다 → 그래도 넣는다)
    //     이 보관소 사본은 «풀만 시퀀스» 항차(info.seqMode) — 고치기 전에는 바꾸기를 누르는 순간 창이 닫혀 쓰기 0 · 카드 그대로였다. 이제 그 칸에 배정·선적확인, 밀린 이름표 주인은 이 컨의 계획 칸으로.
    const plan3 = posOf(EL[cn3] || {});
    await S3.click(sb3, 500);
    await S3.until(() => /BAY \d+ — 자리 선택|선적할 베이를 먼저 선택하세요/.test(S3.d.body.textContent));
    if (!/BAY \d+ — 자리 선택/.test(S3.d.body.textContent)) await S3.click([...S3.d.querySelectorAll('button')].find((b) => /^B18\s*남은/.test(S3.txt(b))) || null, 300);
    const named = [...S3.d.querySelectorAll('button')].find((b) => /이름표가 걸린 칸/.test(b.getAttribute('title') || ''));
    const tRow = named ? named.closest('div.flex.items-start') : null;
    const tgt = named ? `18-${S3.txt(named.querySelector('span'))}-${tRow ? S3.txt(tRow.querySelector('span')) : '?'}` : '';
    const owner4 = named ? S3.txt(named.querySelectorAll('span')[1]) : '';
    const ownerCn = Object.keys(EL).find((x) => x.endsWith(owner4) && posOf(EL[x]) === tgt) || '';
    await S3.click(named || null, 300);
    const tgl = [...S3.d.querySelectorAll('button')].map((b) => S3.txt(b)).find((t) => /배정 후 바로 선적확인/.test(t)) || '';
    await S3.click(S3.btn(/^다음 →$/), 300);
    await S3.click(S3.btn(/변경 확정$/), 500);
    const strong = /자리를 바꿉니다/.test(S3.d.body.textContent);
    const sameBay = /같은 베이 안에서/.test(S3.d.body.textContent) || !/다른 베이에서 온 풀 컨/.test(S3.d.body.textContent);
    if (S3.btn(/^바꾸기$/)) await S3.click(S3.btn(/^바꾸기$/), 800);
    const seqAsk = await S3.until(() => /시퀀스 자리입니다/.test(S3.d.body.textContent), 2500);
    if (seqAsk) await S3.click(S3.btn(/^그래도 넣는다$/), 1500);
    await S3.until(() => !!(S3.mem().loading.completed || {})[cn3], 3000);
    const L3 = S3.mem().loading, r3 = (L3.records || {})[cn3] || {}, ro = (L3.records || {})[ownerCn] || {};
    const at = (r) => (r.bay_actual != null && r.bay_actual !== '' ? `${parseInt(r.bay_actual, 10)}-${r.row_actual}-${r.tier_actual}` : r.bay_assign ? `${parseInt(r.bay_assign, 10)}-${r.row_assign}-${r.tier_assign}` : '');
    ok(`⑥-2 [📍 위치 틀림] → B18 이름표 칸 ${tgt}(주인 ${ownerCn}) · «${tgl}» · 강한 확인 ${strong ? '뜸' : '안 뜸'}(같은 베이 문구 ${sameBay}) · 시퀀스 물음 ${seqAsk ? '뜸 → 그래도 넣는다' : '안 뜸'} → ${cn3} 완료 ${!!(L3.completed || {})[cn3]} · 실자리 ${at(r3)} · 밀린 ${ownerCn.slice(-4)} → ${at(ro) || '계획 자리 내줌'}(이 컨 계획 칸 ${plan3} · 알림 ${S3.alerts.some((x) => x.includes(ownerCn)) ? '있음' : '없음'}) · 창 닫힘`,
      //  밀린 이름표 주인은 앱 규칙(firebase.fbReassignContainerPosition — 수동 큰 카드 «위치 지정» 과 같은 함수·같은 인자)대로 — 이 컨의 계획 칸으로 가거나, 계획 자리를 내주고 알림(«…는 계획 자리를 내줬습니다»)
      !!named && !!ownerCn && /— 켬$/.test(tgl) && sameBay && !!(L3.completed || {})[cn3] && at(r3) === tgt
        && (at(ro) === plan3 || (ro.bay === '' && S3.alerts.some((x) => x.includes(ownerCn) && /계획 자리를 내줬습니다/.test(x)))) && !/BAY \d+ — 자리 선택/.test(S3.d.body.textContent) && !S3.errs.length,
      JSON.stringify({ tgt, ownerCn, tgl, strong, sameBay, seqAsk: !!seqAsk, comp: !!(L3.completed || {})[cn3], r3: at(r3), ro: at(ro), roRaw: Object.fromEntries(Object.entries(ro).filter(([k]) => /bay|row|tier|assign|displac|_store|unassign/.test(k))), edi: Object.fromEntries(Object.entries((L3.ediContainers || {})[ownerCn] || {}).filter(([k]) => /bay|row|tier|assign/.test(k))), plan3, errs: S3.errs.slice(0, 3) }));
    S3.close();
    //  ⑥-5 (2차 시뮬 LM3x — 앞 판부터의 결함) 다른 베이(B22) 풀 이름표 칸으로 — «다른 베이에서 온 풀 컨» 강한 확인 [바꾸기] 뒤에 «시퀀스 자리입니다» 가 이어 떠야 한다.
    //     고치기 전에는 첫 확인창 단추의 클릭이 위치 지정 창 바깥막까지 올라가 창을 닫아, 둘째 물음이 못 뜨고 쓰기 0 이었다(PositionEditModal — 수동 큰 카드 «위치 지정» 도 같은 창).
    const S4 = await open(tnVoy(), 'loading', '1호기', null);
    await S4.startGuide();
    await S4.pick(18, /^🟠 홀드 [1-9]/);
    const cn4 = S4.firstCn();
    await S4.click(S4.d.querySelector('[data-gw-exrow] [data-gw-ex="pos"]'), 500);   // ★ 4.27: 종전 [data-gw-ex="slot"] 따로 줄 → 예외 줄 [📍 위치 틀림](같은 창)
    await S4.until(() => /선적할 베이를 먼저 선택하세요|BAY \d+ — 자리 선택/.test(S4.d.body.textContent));
    if (/BAY \d+ — 자리 선택/.test(S4.d.body.textContent)) await S4.click(S4.btn(/베이 다시 선택|다른 베이/) || null, 300);
    await S4.click([...S4.d.querySelectorAll('button')].find((b) => /^B22\s*남은/.test(S4.txt(b))) || null, 300);
    const cand = [...S4.d.querySelectorAll('button')].filter((b) => /이름표가 걸린 칸/.test(b.getAttribute('title') || '')).map((b) => {
      const tr = b.closest('div.flex.items-start');
      const pos = `22-${S4.txt(b.querySelector('span'))}-${tr ? S4.txt(tr.querySelector('span')) : '?'}`;
      const own = Object.keys(EL).find((x) => x.endsWith(S4.txt(b.querySelectorAll('span')[1])) && posOf(EL[x]) === pos) || '';
      return { b, pos, own };
    }).find((x) => x.own && ((RL[x.own] || {}).fe || EL[x.own].fe) === 'F');
    await S4.click(cand ? cand.b : null, 300);
    await S4.click(S4.btn(/^다음 →$/), 300);
    await S4.click(S4.btn(/변경 확정$/), 500);
    const strong4 = /다른 베이에서 온 풀 컨/.test(S4.d.body.textContent);
    await S4.click(S4.btn(/^바꾸기$/), 800);
    const seq4 = await S4.until(() => /시퀀스 자리입니다/.test(S4.d.body.textContent), 2500);
    if (seq4) await S4.click(S4.btn(/^그래도 넣는다$/), 1500);
    await S4.until(() => !!(S4.mem().loading.completed || {})[cn4], 3000);
    const L4 = S4.mem().loading, r4 = (L4.records || {})[cn4] || {};
    const at4 = r4.bay_actual ? `${parseInt(r4.bay_actual, 10)}-${r4.row_actual}-${r4.tier_actual}` : '';
    ok(`⑥-5 다른 베이 B22 풀 이름표 칸 ${cand ? cand.pos : '-'}(주인 ${cand ? cand.own : '-'}) → «다른 베이에서 온 풀 컨» ${strong4} → [바꾸기] → «시퀀스 자리입니다» ${!!seq4} → [그래도 넣는다] → ${cn4} 완료 ${!!(L4.completed || {})[cn4]} · 실자리 ${at4}(고치기 전에는 쓰기 0)`,
      !!cand && strong4 && !!seq4 && !!(L4.completed || {})[cn4] && at4 === cand.pos && !S4.errs.length,
      JSON.stringify({ cand: cand && { pos: cand.pos, own: cand.own }, strong4, seq4: !!seq4, at4, errs: S4.errs.slice(0, 3) }));
    S4.close();
  }
};

//  단독 실행 — node tools/regress_r39_card.cjs <저장소 루트>
if (require.main === module) {
  process.env.TZ = 'Asia/Seoul';
  const ROOT = path.resolve(process.argv[2] || process.cwd());
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'r39_'));
  let n = 0, bad = 0;
  const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
  const head = (t, f) => { console.log(`■ ${t}`); console.log(`  (출처 ${f})`); };
  const fx = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures', f), 'utf8'));
  module.exports({ ROOT, TMP, ok, head, fx, stub: './tools/stub_fbdb_mem.js' })
    .then(() => { console.log(`\nR39 ${n - bad}/${n}`); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ } process.exit(bad ? 1 : 0); })
    .catch((e) => { console.error('✗ R39 오류', e && e.stack || e); process.exit(1); });
}
