// 회귀 기준표 R41 — 작업 화면 나머지 수리(4.26-02 판 G): 수정 3연속은 묻는다 · 보류 줄 이 장/다른 장 · 실린 컨 보류 빠짐 · 묶음 이름 고정 · 베이매트릭스에 있는 칸은 «이번 항차 계획에 없는 칸» · 시퀀스 방침 바꿀 때 묻기. smoke_regress.cjs 가 부른다.
//   근거 — 모의 작업장 1차(2026-10-12 밤 · OBWH 2763E·MCAP 639N 실인원 다섯) 수리 목록 5·6·14·16·17·18 · 검수사 2026-10-13 00:53 «전부 클로드 안대로 수정하고 배포» · 2026-10-14 09:32 «승인은 미리 합니다».
//   실소스 항차 화면(VoyagePage)을 jsdom 에서 그리고 검수원 손 그대로 누른다. Firebase 는 메모리 스텁(tools/stub_fbdb_mem.js — 실제 쓰기 없음).
//   ⚠ 기대값은 코드에서 베끼지 않는다 — 묶음 베이·자리·보류·완료는 픽스처 원자료를 이 파일이 직접 세고, 베이매트릭스 칸은 사전 원자료(baysSummary)를 이 파일이 따로 읽는다.
//   자료 — tools/fixtures/work42502_obwh.json(보관소 OBWH 2763E 양하·선적 — R37·R39 와 같은 사본) · tools/fixtures/baydict_mcap.json(보관소 ship_bay_dict_v3/MCAP GET 사본 — 모의 작업 MCAP 641S 마감텔리 자리 34-08-88·06-05-86).
//   실행: smoke_regress.cjs 안에서 — require('./regress_r41_rest.cjs')({ ROOT, TMP, ok, head, fx, stub })
//         단독 — node tools/regress_r41_rest.cjs <저장소 루트>
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async function r41({ ROOT, TMP, ok, head, fx, stub }) {
  head('R41 작업 화면 나머지 수리 — 수정 3연속은 묻는다 · 보류 줄 이 장/다른 장 · 실린 컨 보류 빠짐 · 묶음 이름 고정 · 베이매트릭스에 있는 칸 · 시퀀스 방침 바꿀 때 묻기 (4.26-02)',
    '모의 작업장 1차 수리 목록 5·6·14·16·17·18 · 검수사 2026-10-13 00:53 «전부 클로드 안대로 수정하고 배포»');
  const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const FX = fx('work42502_obwh.json');
  const MC = fx('baydict_mcap.json');
  const E = FX.discharge.ediContainers, XL = FX.discharge.xrayList || {}, L = FX.loading.ediContainers;
  //  독립 판정 — 이 배 묶음 center(짝수 베이 = 그 베이 · 홀수는 4칸 간격 이웃 짝수) · 데크 = 80단 이상
  const centerOf = (bay) => { const b = parseInt(bay, 10); return b % 2 === 0 ? b : (b % 4 === 1 ? b + 1 : b - 1); };
  const isDeck = (c) => parseInt(c.tier, 10) >= 80;
  const posOf = (c) => `${parseInt(c.bay, 10)}-${c.row}-${c.tier}`;
  const workInfo = () => { const info = clone(FX.info); for (const k of Object.keys(info)) if (/Done|depart|workEnd/i.test(k)) delete info[k]; return info; };
  const baseVoy = () => ({ key: FX.key, info: workInfo(), discharge: { ...clone(FX.discharge), completed: {}, xraySeals: {} }, loading: { ...clone(FX.loading), completed: {} } });

  const eF = path.join(TMP, 'r41.jsx'), oF = path.join(TMP, 'r41.js');
  fs.writeFileSync(eF, [
    `import React from "${ROOT}/node_modules/react/index.js";`,
    `import { createRoot } from "${ROOT}/node_modules/react-dom/client.js";`,
    `import VoyagePage from "${ROOT}/src/pages/VoyagePage.jsx";`,
    `import { activeHeldOf, bayDictSlotOk, unknownSlotAskOf } from "${ROOT}/src/utils.js";`,
    `import { buildBayPagesFromSummary } from "${ROOT}/src/cargoPlanCore.js";`,
    `import { buildGangShift } from "${ROOT}/src/chiefAnswers.js";`,
    `let root = null; const el = (v, key, mode) => React.createElement(VoyagePage, { voyageKey: key, voyage: v, inspector: '연막', inspectors: [], portMisData: {}, pilotForecast: {}, onGoHome() {}, onModeChange() {}, initModeOverride: mode });`,
    `window.__R41go = (json, key, mode) => { root = createRoot(document.getElementById('root')); root.render(el(JSON.parse(json), key, mode)); };`,
    `window.__R41fn = { activeHeldOf, bayDictSlotOk, unknownSlotAskOf, buildGangShift, buildBayPagesFromSummary };`,
  ].join('\n'));
  execSync(`npx esbuild "${eF}" --bundle --loader:.jsx=jsx --loader:.js=jsx --loader:.png=dataurl --loader:.json=json --jsx=automatic --external:fs --external:path --external:url --alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --alias:pdfjs-dist/build/pdf=${ROOT}/tools/stub_pdfjs.js --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${oF}"`, { cwd: ROOT, stdio: 'pipe' });
  const vSrc = fs.readFileSync(oF, 'utf8');

  const open = async (voy, mode = 'discharge', equip = '1호기') => {
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
    W.__memdb = { voyages: { [vk]: clone(voy) }, ship_bay_dict_v3: clone(FX.shipDict) };
    W.__fbShipBayDict = clone(FX.shipDict);
    try { W.eval(vSrc); W.__R41go(JSON.stringify(voy), vk, mode); } catch (er) { errs.push('THROW ' + er.message); }
    await sleep(350);
    const d = W.document;
    const click = async (b, ms = 250) => { if (b) { b.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await sleep(ms); } return !!b; };
    const txt = (b) => b.textContent.replace(/\s+/g, ' ').trim();
    const btn = (re, root = d) => [...root.querySelectorAll('button')].find((b) => re.test(txt(b)) && !b.disabled);
    const until = async (fn, ms = 4000) => { const end = Date.now() + ms; let v = fn(); while (!v && Date.now() < end) { await sleep(60); v = fn(); } return v; };
    const type = async (input, val) => {
      const setter = Object.getOwnPropertyDescriptor(W.HTMLInputElement.prototype, 'value').set;
      setter.call(input, val); input.dispatchEvent(new W.Event('input', { bubbles: true })); await sleep(200);
    };
    const mem = () => W.__memdb.voyages[vk];
    const tab = async (re) => click(await until(() => [...d.querySelectorAll('button[role="tab"]')].find((b) => re.test(b.textContent))), 350);
    const dialogs = () => [...d.querySelectorAll('div.fixed.inset-0')].filter((x) => /z-\[100\]/.test(x.className));
    const dialog = () => dialogs().slice(-1)[0] || null;
    const cards = () => [...d.querySelectorAll('[data-gw-card]')];
    const groupBtn = (center) => [...d.querySelectorAll('button')].find((b) => { const m = txt(b).match(/^B([\d·]+)/); return m && m[1].split('·').map(Number).includes(center) && /남은 컨/.test(txt(b)); });
    const startGuide = async () => { await tab(/작업 시작/); await click(await until(() => btn(/^🤖\s*자동 가이드$/)), 350); await until(() => /작업할 베이를 선택하세요/.test(d.body.textContent)); };
    const pick = async (center, tierRe) => {
      await click(groupBtn(center), 350);
      const g = await until(() => btn(/^1호기 그대로$/) || btn(tierRe));
      if (g && /그대로$/.test(txt(g))) await click(g, 300);
      await click(await until(() => btn(tierRe)), 400);
      await until(() => cards().length > 0 || d.querySelector('[data-group-left="1"]'));
    };
    return { W, d, errs, alerts, click, btn, until, type, mem, tab, dialog, dialogs, txt, cards, groupBtn, startGuide, pick, fn: W.__R41fn, close: () => { try { W.close(); } catch (er) { /* 창 닫기 */ } } };
  };

  //  ── ① 수정 3연속 — 말없이 수동으로 넘기지 않고 묻는다(OBWH 2763E 양하 B6 데크 · 모의 작업 OBWH 1호기 11회·MCAP 4호기)
  {
    const S = await open(baseVoy());
    await S.startGuide();
    await S.pick(6, /^🔵 데크 [1-9]/);
    const onCard = () => S.cards().map((c) => c.getAttribute('data-gw-cn'));
    //  고를 컨 — 이 파일이 원자료에서: B6 데크(같은 단 — «다른 베이» 물음이 안 뜨는 컨) · XRAY 대상 아님 · 지금 카드에 없는 것
    const pool = Object.keys(E).filter((cn) => parseInt(E[cn].bay, 10) === 6 && isDeck(E[cn]) && !XL[cn]).sort();
    const picked = [];
    let qd = null;
    for (let i = 0; i < 3; i++) {
      const cnow = onCard();
      const cn = pool.find((x) => !cnow.includes(x) && !picked.includes(x));
      if (!cn) break;
      await S.click(S.btn(/^다른 컨$/), 300);
      const inp = await S.until(() => [...S.d.querySelectorAll('input')].find((x) => /예: 1234/.test(x.getAttribute('placeholder') || '')));
      if (inp) await S.type(inp, cn.slice(-4));
      await S.click(await S.until(() => [...S.d.querySelectorAll('button')].find((b) => b.textContent.replace(/\s+/g, '').startsWith(cn))), 500);
      picked.push(cn);
      if (i < 2) {   // 3회 전에는 묻지 않는다
        const dd = S.dialog();
        if (dd && /순서가/.test(dd.textContent)) qd = 'early';
      }
    }
    const dlg = await S.until(() => { const x = S.dialog(); return x && /순서가 3번 연속 달랐습니다/.test(x.textContent) ? x : null; });
    const done = Object.keys(S.mem().discharge.completed || {}).sort();
    const keepBtn = dlg ? S.btn(/^자동 그대로$/, dlg) : null;
    const orderBtn = dlg ? S.btn(/^순서 바꾸기 ⚙$/, dlg) : null;
    const guideOn = !!S.btn(/^수동 모드로 전환$/) && S.cards().length > 0;
    const silent = S.alerts.some((a) => /수동 모드로 전환합니다/.test(a));
    ok(`①-1 B6 데크에서 [다른 컨] 으로 세 번 연속 다른 컨(${picked.map((x) => x.slice(-4)).join('·')}) → 세 대 완료(${done.length}) · 셋째에 «순서가 3번 연속 달랐습니다» 창 · 큰 단추 [자동 그대로] · 회색 [순서 바꾸기 ⚙] · 자동 가이드 그대로(카드 ${S.cards().length}) · 말없는 수동 전환 없음`,
      picked.length === 3 && done.length === 3 && picked.every((x) => done.includes(x)) && qd !== 'early' && !!dlg && !!keepBtn && !!orderBtn && guideOn && !silent && !S.errs.length,
      JSON.stringify({ picked, done, qd, dlg: dlg ? S.txt(dlg).slice(0, 160) : null, guideOn, silent, alerts: S.alerts.slice(-2), errs: S.errs.slice(0, 3) }));
    await S.click(orderBtn, 400);
    const sheet = /양하 순서 — 1호기/.test(S.d.body.textContent);
    const warnLine = /연속 수정 \d회/.test(S.d.body.textContent);
    ok(`①-2 [순서 바꾸기 ⚙] → «양하 순서 — 1호기» 창이 열림(${sheet}) · 창 닫힘 · 가이드 그대로 · 세던 수는 0(«연속 수정 N회» 줄 없음 ${!warnLine})`,
      sheet && !S.dialog() && !warnLine && !!S.btn(/^수동 모드로 전환$/) && !S.errs.length, JSON.stringify({ sheet, warnLine }));
    S.close();
  }

  //  ── ② 보류 줄 — 이 장 / 다른 장 · 실린 컨의 보류는 빠짐 · 다른 장 [해제…] 는 묻는다(모의 작업 MCAP 3호기 — 2호기 보류가 [해제] 와 함께 · 보류 12대 잔류)
  {
    const v = baseVoy();
    const firstB6 = Object.keys(E).filter((cn) => parseInt(E[cn].bay, 10) === 6 && isDeck(E[cn]) && !XL[cn]).sort();
    const mineCn = firstB6[firstB6.length - 1];                                               // 이 장(B6 데크) — 1호기가 콘 잠김으로
    const otherCn = Object.keys(E).filter((cn) => centerOf(E[cn].bay) === 14 && isDeck(E[cn])).sort()[0];   // 다른 장(B14 데크) — 2호기 이종현이
    const doneCn = Object.keys(E).filter((cn) => centerOf(E[cn].bay) === 18 && isDeck(E[cn])).sort()[0];    // 보류했다가 실린 컨(완료 기록 있음)
    const t0 = Date.now() - 20 * 60000;
    v.discharge.held = {
      [mineCn]: { reason: '콘 잠김', by: '연막', equip: '1호기', at: t0, doneAt: 5 },
      [otherCn]: { reason: '트윈 무게 초과', by: '이종현', equip: '2호기', at: t0 + 60000, doneAt: 9 },
      [doneCn]: { reason: '콘 잠김', by: '이종현', equip: '2호기', at: t0 + 120000, doneAt: 9 },
    };
    v.discharge.completed = { [doneCn]: { by: '이종현', at: t0 + 600000, equip: '2호기' } };
    const S = await open(v);
    //  함수 — 보류 한 벌: doneAt(보류 당시 완료 대수)이 있어도 걸린 보류 · 실린 컨은 빠짐
    const ah = S.fn.activeHeldOf(v, 'discharge').map((x) => x.cn).sort();
    //  갱 배분 답 — smoke_guided 와 같은 실자료(SWTD gangshift 사본 · 갱 2): 걸린 보류 하나 + 보류했다가 실린 컨 하나
    const GS = fx('gangshift_swtd.json');
    const [gA, gB] = Object.keys(GS.ediContainers).sort().slice(0, 2);   // 원자료 키(컨번호) 앞 둘
    const gv = { info: { ...GS.info, gangs: 2 }, discharge: { ediContainers: GS.ediContainers,
      held: { [gA]: { reason: '콘 잠김', at: t0, by: '연막', doneAt: 7 }, [gB]: { reason: '트윈 무게 초과', at: t0, by: '이종현', doneAt: 7 } },
      completed: { [gB]: { by: '이종현', at: t0 + 600000, equip: '2호기' } } }, loading: {} };
    const gs = S.fn.buildGangShift(gv, GS.bayDef, { now: new Date(2026, 7, 27, 21, 0).getTime(), nGangs: 2 });
    const hl = (gs && gs.heldLines) || [];
    ok(`②-1 보류 한 벌(activeHeldOf) — 걸린 보류 [${ah.map((x) => x.slice(-4)).join('·')}](doneAt 5·9 인 것도) · 실린 ${doneCn.slice(-4)} 는 빠짐 · 갱 배분 답(SWTD 실자료) «${hl.join(' / ')}» — 실린 ${String(gB).slice(-4)} 의 «트윈 무게 초과» 없음`,
      JSON.stringify(ah) === JSON.stringify([mineCn, otherCn].sort()) && hl.length === 1 && /⏸ 보류 1대 — 콘 잠김/.test(hl[0]) && hl[0].includes(gA) && !hl.join(' ').includes('트윈 무게 초과'),
      JSON.stringify({ ah, hl }));
    await S.startGuide();
    await S.pick(6, /^🔵 데크 [1-9]/);
    const strip = await S.until(() => S.d.querySelector('[data-held-strip="1"]'));
    const head1 = strip ? S.txt(strip.querySelector('button')) : '';
    await S.click(strip ? strip.querySelector('button') : null, 300);
    const rowsMine = [...S.d.querySelectorAll('[data-held-row="mine"]')].map((r) => S.txt(r));
    const rowsOther = [...S.d.querySelectorAll('[data-held-row="other"]')].map((r) => S.txt(r));
    const otherPos = posOf(E[otherCn]);
    ok(`②-2 B6 데크 보류 줄 «${head1}» — 이 장 1대(${mineCn.slice(-4)}) · 다른 장 1대(${otherCn.slice(-4)} ${otherPos} 2호기 이종현) · 실린 ${doneCn.slice(-4)} 없음`,
      /^⏸ 보류 1대 · 다른 장 1대/.test(head1) && rowsMine.length === 1 && rowsMine[0].includes(mineCn) && /해제$/.test(rowsMine[0]) && rowsOther.length === 1 && rowsOther[0].includes(otherCn) && rowsOther[0].includes(otherPos) && rowsOther[0].includes('2호기 이종현') && /해제…$/.test(rowsOther[0]) && !S.d.body.textContent.includes(doneCn) && !S.errs.length,
      JSON.stringify({ head1, rowsMine, rowsOther }));
    //  ②-3 다른 장 [해제…] → 누가 건 것인지 묻는다 · ✕ 는 아무것도 안 함 · [해제] 는 그 컨만 푼다(이 장 보류 그대로)
    await S.click(S.btn(/^해제…$/), 300);
    const q = S.dialog();
    const qTxt = q ? S.txt(q) : '';
    const xBtn = q ? [...q.querySelectorAll('button')].find((b) => !S.txt(b)) : null;
    await S.click(xBtn, 300);
    const heldAfterX = Object.keys(S.mem().discharge.held || {}).sort();
    await S.click(S.btn(/^해제…$/) || (await (async () => { await S.click(S.d.querySelector('[data-held-strip="1"] button'), 300); return S.btn(/^해제…$/); })()), 300);
    const q2 = S.dialog();
    await S.click(q2 ? S.btn(/^해제$/, q2) : null, 400);
    const heldAfter = Object.keys(S.mem().discharge.held || {}).sort();
    ok(`②-3 다른 장 [해제…] → «다른 장의 보류입니다 — 보류 사유 «트윈 무게 초과» · 건 사람 2호기 이종현» · ✕ → 그대로(${heldAfterX.length}건) · [해제] → ${otherCn.slice(-4)} 만 풀림(남은 [${heldAfter.map((x) => x.slice(-4)).join('·')}])`,
      /다른 장의 보류입니다/.test(qTxt) && qTxt.includes('건 사람 2호기 이종현') && qTxt.includes('보류 사유 «트윈 무게 초과»') && qTxt.includes(otherCn) && heldAfterX.length === 3 && !heldAfter.includes(otherCn) && heldAfter.includes(mineCn) && heldAfter.includes(doneCn) && !S.errs.length,
      JSON.stringify({ qTxt: qTxt.slice(0, 200), heldAfterX, heldAfter }));
    S.close();
  }

  //  ── ③ 묶음 이름 고정 — 5번 베이를 다 끝내도 «B5·6·7»(모의 작업 OBWH 1호기 «B5·6·7» → «B5·7»)
  {
    const v = baseVoy();
    const b5 = Object.keys(E).filter((cn) => parseInt(E[cn].bay, 10) === 5).sort();
    let t = Date.now() - 3600000;
    for (const cn of b5) v.discharge.completed[cn] = { by: '연막', at: (t += 60000), equip: '1호기' };
    const baysAll = [...new Set(Object.values(E).filter((c) => centerOf(c.bay) === 6).map((c) => parseInt(c.bay, 10)))].sort((a, b) => a - b);
    const baysLeft = [...new Set(Object.values(E).filter((c) => centerOf(c.bay) === 6 && !b5.includes(c.cn)).map((c) => parseInt(c.bay, 10)))].sort((a, b) => a - b);
    const S = await open(v);
    await S.startGuide();
    const gb = S.groupBtn(6);
    const lab = gb ? (S.txt(gb).match(/^B([\d·]+)/) || [])[1] : '';
    await S.pick(6, /^🔵 데크 [1-9]/);
    const hd = S.d.querySelector('[data-gw-head]');
    const hdTxt = hd ? S.txt(hd) : '';
    ok(`③ 5번 베이 ${b5.length}대를 다 끝낸 뒤 — 묶음 단추 «B${lab}» · 머리 «${hdTxt.slice(0, 40)}» = 전체 작업분 B${baysAll.join('·')}(남은 컨만이면 B${baysLeft.join('·')})`,
      b5.length > 0 && lab === baysAll.join('·') && hdTxt.startsWith(`B${baysAll.join('·')} 데크`) && baysLeft.join('·') !== baysAll.join('·') && !S.errs.length,
      JSON.stringify({ lab, hdTxt, baysAll, baysLeft }));
    S.close();
  }

  //  ── ④ «자료에 없는 자리» — 베이매트릭스에 있는 칸이면 «이번 항차 계획에 없는 칸»(모의 작업 MCAP 641S 마감텔리 자리 34-08-88·06-05-86 이 «분실 사고 경로» 로 막힘)
  {
    //  ④-1 함수 — 사전 원자료(보관소 MCAP 사본)를 이 파일이 따로 읽어 기대값을 낸다
    const S0 = await open(baseVoy());
    const bd = MC.bayDef;
    const ent = (b) => bd.baysSummary.find((x) => parseInt(x.bayNo || x.bay, 10) === b);
    //  그 단의 칸 수(cells[단 순서] — 카고플랜과 같은 셈) · «추정» 항목은 판정 안 함(null) — 감사 상-1·하-1
    const cellIn = (b, r, t) => { const e = ent(b); if (!e) return null; if (e.source === '추정') return null; const dk = t >= 80; const tiers = (dk ? e.deckTiers : e.holdTiers).map(Number); if (!tiers.includes(t)) return false; const n = Number((dk ? e.deckCells : e.holdCells)[tiers.indexOf(t)]); return r >= 1 && r <= n; };
    const lowHold = (() => { const e = ent(6); const i = e.holdTiers.map(Number).indexOf(Math.min(...e.holdTiers.map(Number))); return { t: Number(e.holdTiers[i]), n: Number(e.holdCells[i]), wide: Math.max(...e.holdCells.map(Number)) }; })();   // 06 홀드 맨 아래 단(좁다)
    const estBay = parseInt(bd.baysSummary.find((x) => x.source === '추정').bayNo, 10);
    const cases = [[34, 8, 88], [6, 5, 86], [34, 13, 88], [34, 8, 96], [98, 1, 82], [6, lowHold.wide, lowHold.t], [6, lowHold.n, lowHold.t], [estBay, 1, 82]];
    const got = cases.map(([b, r, t]) => S0.fn.bayDictSlotOk(bd, String(b), String(r).padStart(2, '0'), String(t).padStart(2, '0'), { strict: true }));
    const want = cases.map(([b, r, t]) => cellIn(b, r, t));
    const loose = S0.fn.bayDictSlotOk(bd, '6', String(lowHold.wide).padStart(2, '0'), String(lowHold.t).padStart(2, '0'));   // 기록지 사진 판독(기본)은 종전 그대로 — 구역 최대 칸 수
    const qLow = S0.fn.unknownSlotAskOf({ bay: '6', row: String(lowHold.wide).padStart(2, '0'), tier: String(lowHold.t).padStart(2, '0'), rowsText: '', bayDef: bd });
    const qEst = S0.fn.unknownSlotAskOf({ bay: String(estBay), row: '01', tier: '82', rowsText: '', bayDef: bd });
    //  00열이 있는 배(재감사 상-1) — ATPR 01번 베이 홀드 [10,8,6,4]단 칸 [5,3,1,1] · 홀드 00열(픽스처 baygrid_dicts.json 원자료): 앱 그림은 10단 04 02 00 01 03 · 08단 02 00 01 · 06·04단 00 만
    const AT = fx('baygrid_dicts.json').ATPR;
    const atBd = AT.bayDef || AT;
    const atE = (atBd.baysSummary || []).find((x) => parseInt(x.bayNo || x.bay, 10) === 1) || {};
    const zc = [['00', '06'], ['01', '06'], ['01', '08'], ['03', '08'], ['04', '10']].map(([r, t]) => S0.fn.bayDictSlotOk(atBd, '1', r, t, { strict: true }));
    const qZ = S0.fn.unknownSlotAskOf({ bay: '1', row: '01', tier: '06', rowsText: '', bayDef: atBd });
    //  재감사 둘 — 어느 장에도 없는 베이(MCAP 장 «01 (02)03 05 (06)07 …» — 08 은 없음) · 짝 장이 홀수 항목으로 그려 그 단이 없는 칸(MCAP (14)15 장 92단)
    const pagesM = S0.fn.buildBayPagesFromSummary(bd) || [];
    const has08 = pagesM.some((p) => p.even === 8 || p.odd === 8);
    const e14 = ent(14), e15 = ent(15);
    const tier92in14 = !!e14 && (e14.deckTiers || []).map(Number).includes(92), tier92in15 = !!e15 && (e15.deckTiers || []).map(Number).includes(92);
    const ghost = [S0.fn.bayDictSlotOk(bd, '8', '02', '86', { strict: true }), S0.fn.bayDictSlotOk(bd, '14', '01', '92', { strict: true })];
    const qG = S0.fn.unknownSlotAskOf({ bay: '8', row: '02', tier: '86', rowsText: '', bayDef: bd });
    const q1 = S0.fn.unknownSlotAskOf({ bay: '34', row: '08', tier: '88', rowsText: '01 02 03', bayDef: bd });
    const q2 = S0.fn.unknownSlotAskOf({ bay: '34', row: '13', tier: '88', rowsText: '01 02 03', bayDef: bd });
    const q3 = S0.fn.unknownSlotAskOf({ lbl: '앞', bay: '98', row: '01', tier: '82', rowsText: '', bayDef: bd });
    const q4 = S0.fn.unknownSlotAskOf({ bay: '34', row: '08', tier: '88', rowsText: '', bayDef: null });
    ok(`④-1 MCAP 사전 — 34-08-88 ${got[0]} · 06-05-86 ${got[1]} · 34-13-88 ${got[2]} · 34-08-96 ${got[3]} · 98-01-82 ${got[4]} · 06 홀드 ${lowHold.t}단(${lowHold.n}칸) ${lowHold.wide}열 ${got[5]} · ${lowHold.n}열 ${got[6]} · 추정 B${estBay} ${got[7]}(원자료 [${want.join(',')}]) · 사진 판독 기본은 ${lowHold.wide}열 ${loose}(종전) · 00열 배 ATPR 01 홀드 06단 00 ${zc[0]} · 01 ${zc[1]} · 08단 01 ${zc[2]} · 03 ${zc[3]} · 10단 04 ${zc[4]} · 장 없는 베이 08-02-86 ${ghost[0]}(장 목록에 08 ${has08}) · (14)15 장에 없는 92단 14-01-92 ${ghost[1]} · 물음 «${q1.title}»(${q1.confirmLabel}, 붉음 ${q1.danger}) · 사전 밖 «${q2.title}» · 좁은 단 «${qLow.title}» · 00열 배 좁은 단 «${qZ.title}» · 추정 «${qEst.title}» · «${q3.title}» · 사전 없음 «${q4.title}»`,
      JSON.stringify(got) === JSON.stringify([true, true, false, false, null, false, true, null]) && JSON.stringify(want) === JSON.stringify(got) && lowHold.n < lowHold.wide && loose === true
        && qLow.title === '이 배 자료에 없는 자리입니다' && qLow.danger === true && qEst.title === '이 배 자료에 없는 자리입니다' && qEst.danger === true
        && !has08 && tier92in14 && !tier92in15 && ghost[0] !== true && ghost[1] !== true && qG.title === '이 배 자료에 없는 자리입니다' && qG.danger === true
        && JSON.stringify(atE.holdCells) === '[5,3,1,1]' && atE.holdHasZero === true && JSON.stringify(zc) === JSON.stringify([true, false, true, false, true]) && qZ.title === '이 배 자료에 없는 자리입니다' && qZ.danger === true
        && q1.title === '이번 항차 계획에 없는 칸입니다' && q1.confirmLabel === '이 칸에 저장' && q1.danger === false && !/분실/.test(q1.message)
        && q2.title === '이 배 자료에 없는 자리입니다' && q2.danger === true && /분실 사고가 났던 경로/.test(q2.message)
        && q3.title === '이 배 자료에 없는 자리입니다' && /^앞 컨 자리 B98/.test(q3.message) && q4.title === '이 배 자료에 없는 자리입니다' && q4.danger === true,
      JSON.stringify({ got, want, lowHold, loose, zc, ghost, has08, tier92in14, tier92in15, q1, q2: q2.title, qLow: qLow.title, qZ: qZ.title, qEst: qEst.title, q3: q3.title, q4: q4.title }));
    S0.close();
    //  ④-2 화면 — OBWH 2764W 선적 B6 데크 카드 [📍 이 컨을 다른 칸에 실음] → 직접 입력: 사전엔 있고 이번 항차 선적 자리엔 없는 칸 → «이번 항차 계획에 없는 칸입니다»(붉지 않음) · 사전에도 없는 단 → «베이매트릭스에도 없는 자리입니다» · 취소하면 쓰기 0
    const used = new Set(Object.values(L).map((c) => `${parseInt(c.bay, 10)}/${String(c.row).padStart(2, '0')}/${c.tier}`));
    const obwhBd = FX.shipDict.OBWH.bayDef;
    const S = await open(baseVoy(), 'loading');
    await S.startGuide();
    //  풀 단독 카드가 서는 묶음을 찾는다(엠티 카드는 «자리 확인» 칸이라 [📍] 단추가 없다 — 2.80) — 원자료 풀 컨이 많은 단부터
    let cn = '', cBay = 0, cDeck = true;
    for (const [center, re] of [[18, /^🟠 홀드 [1-9]/], [14, /^🟠 홀드 [1-9]/], [6, /^🟠 홀드 [1-9]/], [10, /^🔵 데크 [1-9]/], [18, /^🔵 데크 [1-9]/], [14, /^🔵 데크 [1-9]/]]) {
      await S.pick(center, re);
      if (S.btn(/^📍 이 컨을 다른 칸에 실음/)) { const c0 = S.cards()[0]; cn = c0 ? c0.getAttribute('data-gw-cn') : ''; break; }
      await S.click(S.btn(/^B\d+ 변경$/), 300);
    }
    if (cn && L[cn]) { cBay = parseInt(L[cn].bay, 10); cDeck = isDeck(L[cn]); }
    //  고를 칸 — 그 카드 베이의 사전 칸(같은 데크/홀드) 중 이번 선적 자료 어느 컨도 쓰지 않은 칸 · 사전에 없는 단(그 구역 맨 위 단 + 2)
    const eB = obwhBd.baysSummary.find((x) => parseInt(x.bayNo || x.bay, 10) === cBay) || {};
    const zTiers = ((cDeck ? eB.deckTiers : eB.holdTiers) || []).map(Number), zCells = ((cDeck ? eB.deckCells : eB.holdCells) || []).map(Number);
    let free = null;
    for (const t of zTiers) { for (let r = 1; r <= Math.max(0, ...zCells) && !free; r++) { const k = `${cBay}/${String(r).padStart(2, '0')}/${String(t).padStart(2, '0')}`; if (!used.has(k)) free = { r: String(r).padStart(2, '0'), t: String(t).padStart(2, '0') }; } if (free) break; }
    const badTier = String(Math.max(0, ...zTiers) + 2).padStart(2, '0');
    const tryCell = async (r, t) => {
      await S.click(await S.until(() => S.btn(/^📍 이 컨을 다른 칸에 실음/)), 400);
      await S.click(await S.until(() => S.btn(/직접 입력 \/ 자리 비우기/)), 300);
      const ins = () => [...S.d.querySelectorAll('input')];
      const bIn = ins().find((x) => x.getAttribute('placeholder') === '14'), rIn = ins().find((x) => x.getAttribute('placeholder') === '00'), tIn = ins().find((x) => x.getAttribute('placeholder') === '02');
      if (bIn) await S.type(bIn, String(cBay)); if (rIn) await S.type(rIn, r); if (tIn) await S.type(tIn, t);
      await S.click(S.btn(/^다음 →$/), 300);
      await S.click(await S.until(() => S.btn(/^⚠? ?변경 확정$/)), 400);
      const dd = await S.until(() => { const x = S.dialog(); return x && /자리입니다|칸입니다/.test(x.textContent) ? x : null; });
      const r1 = dd ? { title: S.txt(dd.querySelector('div.font-black') || dd).slice(0, 40), red: /border-st-bad/.test((dd.firstElementChild || {}).className || ''), save: !!S.btn(/^이 칸에 저장$/, dd), special: !!S.btn(/^특수 적재 — 그래도 저장$/, dd) } : null;
      await S.click(dd ? S.btn(/^아니오$|^취소$/, dd) : null, 300);
      const closeX = [...S.d.querySelectorAll('button')].find((b) => /취소$/.test(S.txt(b)) && b.closest('.fixed'));
      await S.click(closeX || null, 300);
      return r1;
    };
    const a = cn && free ? await tryCell(free.r, free.t) : null;
    const b = cn ? await tryCell('01', badTier) : null;
    const lrec = (S.mem().loading.records || {})[cn] || {};
    const wrote = !!(S.mem().loading.completed || {})[cn] || !!lrec.bay_actual;
    ok(`④-2 선적 풀 ${cn} [📍] 직접 입력 ${cBay}-${free && free.r}-${free && free.t}(사전 B${cBay} ${cDeck ? '데크' : '홀드'} 칸 · 이번 선적 자리에 없음) → «${a ? a.title : '-'}» 붉음 ${a && a.red} [이 칸에 저장] ${a && a.save} · ${cBay}-01-${badTier}(사전에 없는 단) → 종전 붉은 «${b ? b.title : '-'}» [특수 적재] ${b && b.special} · 취소 → 쓰기 0`,
      !!cn && !!free && !!a && a.title === '이번 항차 계획에 없는 칸입니다' && !a.red && a.save && !a.special && !!b && b.title === '이 배 자료에 없는 자리입니다' && b.red && b.special && !wrote && !S.errs.length,
      JSON.stringify({ cn, free, badTier, a, b, wrote, errs: S.errs.slice(0, 3) }));
    S.close();
  }

  //  ── ⑤ 시퀀스 방침 — 바꿀 때만 묻는다(모의 작업 MCAP 2호기 — 작은 칩을 누구나 눌러 배 전체 방침 변경)
  {
    const v = baseVoy();
    v.info.seqMode = 'fullOnlySeq'; v.info.seqFull = true; v.info.seqFullBy = '김성일'; v.info.seqFullAt = new Date(2026, 9, 12, 14, 5).getTime();
    const S = await open(v, 'loading');
    await S.tab(/작업 시작|리스트|조회/);
    const chip = await S.until(() => S.btn(/풀만 시퀀스 \(엠티는 액츄얼\)/));
    const chipTxt = chip ? S.txt(chip) : '';
    await S.click(chip, 300);
    await S.click(await S.until(() => S.btn(/^↔ 풀 액츄얼 \(풀\+엠티\)/)), 300);
    const dd = S.dialog();
    const ddTxt = dd ? S.txt(dd) : '';
    const xBtn = dd ? [...dd.querySelectorAll('button')].find((b) => !S.txt(b)) : null;
    await S.click(xBtn, 300);
    const afterX = S.mem().info.seqMode;
    await S.click(await S.until(() => S.btn(/^↔ 풀 액츄얼 \(풀\+엠티\)/)), 300);
    const dd2 = S.dialog();
    await S.click(dd2 ? S.btn(/^바꾼다$/, dd2) : null, 400);
    const after = S.mem().info;
    ok(`⑤ 칩 «${chipTxt}» → [풀 액츄얼] → «배 전체 방침을 바꿉니다»(${ddTxt.includes('김성일 14:05 정함')}) · ✕ → 그대로(${afterX}) · [바꾼다] → ${after.seqMode}(정한 사람 ${after.seqFullBy})`,
      /김성일 14:05 정함 · 눌러서 바꾸기/.test(chipTxt) && /배 전체 방침을 바꿉니다/.test(ddTxt) && ddTxt.includes('김성일 14:05 정함') && afterX === 'fullOnlySeq' && after.seqMode === 'allActual' && after.seqFullBy === '연막' && !S.errs.length,
      JSON.stringify({ chipTxt, ddTxt: ddTxt.slice(0, 160), afterX, seqMode: after.seqMode, by: after.seqFullBy, errs: S.errs.slice(0, 3) }));
    S.close();
  }

  //  ── ⑥ 시프팅 행 베이 꼴 — EDI 행과 같이 «6» (종전 «006» 이 카드·물음에 «006-11-84» 로 · 모의 작업 MCAP 2·3호기 «002-04-88»·«034-07-88»)
  //    자료 — tools/fixtures/shiftbay_mcap639n.json(보관소 MCAP 639N 양하 — 선사 RESTOW LIST 5대가 평택 화물 0대인 6·10번 베이 데크에 있다 · smoke_shiftbay 와 같은 사본)
  {
    const SB = fx('shiftbay_mcap639n.json');
    const FIVE = Object.keys(SB.restowList).filter((k) => !k.startsWith('_')).sort();
    //  원자료에서 그 다섯 컨의 도착 자리(LOC+147 BBBRRTT)를 이 파일이 읽는다
    const rawS = JSON.stringify(SB.discharge.raw);
    const at = {};
    for (const cn of FIVE) { const i = rawS.indexOf(`EQD+CN+${cn}`); const j = rawS.lastIndexOf('LOC+147+', i); const p7 = rawS.slice(j + 8, j + 15); at[cn] = `${parseInt(p7.slice(0, 3), 10)}-${p7.slice(3, 5)}-${p7.slice(5, 7)}`; }
    const v = { key: 'MCAP_639N', info: (() => { const info = clone(SB.info); for (const k of Object.keys(info)) if (/Done|depart|workEnd/i.test(k)) delete info[k]; if (!info.berthSide) info.berthSide = 'starboard'; return info; })(), discharge: { ...clone(SB.discharge), completed: {} }   /* 접안 방향은 검수원이 처음 한 번 고르는 값 — 사본엔 없어 우현으로 둔다(순서만 바뀌고 자리 꼴과는 무관) */, loading: {}, restowList: clone(SB.restowList) };
    const S = await (async () => {
      const save = FX.shipDict; FX.shipDict = { MCAP: clone(SB.dict) };
      try { return await open(v, 'discharge', '2호기'); } finally { FX.shipDict = save; }
    })();
    await S.startGuide();
    const g6 = S.groupBtn(6);
    await S.click(g6, 350);
    const gg = await S.until(() => S.btn(/그대로$/) || S.btn(/^🔵 데크 [1-9]/));
    if (gg && /그대로$/.test(S.txt(gg))) await S.click(gg, 300);
    await S.click(await S.until(() => S.btn(/^🔵 데크 [1-9]/)), 500);
    await S.until(() => S.cards().length > 0);
    const body = S.d.body.textContent.replace(/\s+/g, ' ');
    const three = body.match(/\b0\d\d-\d\d-\d\d\b/g) || [];
    const shown = FIVE.filter((cn) => body.includes(cn));
    const posShown = shown.filter((cn) => body.includes(at[cn]));
    //  첫 카드가 시프팅 컨이면 [다른 컨] → 다른 베이 컨을 골라 «이 자리 화물이 아닙니다 … 지금 자리는 …» 의 자리 꼴까지 본다
    const c0 = S.cards()[0] ? S.cards()[0].getAttribute('data-gw-cn') : '';
    let modalPos = '';
    if (FIVE.includes(c0) && S.btn(/^다른 컨$/)) {
      const otherCn = Object.keys(SB.discharge.ediContainers).find((cn) => !FIVE.includes(cn) && parseInt(SB.discharge.ediContainers[cn].bay, 10) > 20 && String(SB.discharge.ediContainers[cn].pod || '').toUpperCase() === 'KRPTK');
      await S.click(S.btn(/^다른 컨$/), 300);
      const inp = await S.until(() => [...S.d.querySelectorAll('input')].find((x) => /예: 1234/.test(x.getAttribute('placeholder') || '')));
      if (inp && otherCn) await S.type(inp, otherCn.slice(-4));
      await S.click(await S.until(() => [...S.d.querySelectorAll('button')].find((b) => otherCn && b.textContent.replace(/\s+/g, '').startsWith(otherCn))), 400);
      const dd = await S.until(() => { const x = S.dialog(); return x && /지금 자리는/.test(x.textContent) ? x : null; });
      modalPos = dd ? ((S.txt(dd).match(/지금 자리는 (\S+) 입니다/) || [])[1] || '') : '';
      await S.click(dd ? S.btn(/^취소$/, dd) : null, 300);
    }
    ok(`⑥ MCAP 639N 양하 B5·6·7 데크 — 시프팅 ${shown.length}대 화면에 «${shown.map((cn) => at[cn]).join(' · ')}»(원자료 LOC+147) · 세 자리 베이 꼴 ${three.length}건${modalPos ? ` · 첫 카드 ${c0.slice(-4)} [다른 컨] 물음 «지금 자리는 ${modalPos}»` : ''}`,
      shown.length >= 1 && posShown.length === shown.length && three.length === 0 && (!modalPos || modalPos === at[c0]) && !S.errs.length,
      JSON.stringify({ shown, posShown, three: three.slice(0, 5), c0, modalPos, at, errs: S.errs.slice(0, 3) }));
    S.close();
  }
};

if (require.main === module) {
  process.env.TZ = 'Asia/Seoul';
  const ROOT = path.resolve(process.argv[2] || process.cwd());
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'r41_'));
  let n = 0, bad = 0;
  const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
  const head = (t, f) => { console.log(`■ ${t}`); console.log(`  (출처 ${f})`); };
  const fx = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures', f), 'utf8'));
  module.exports({ ROOT, TMP, ok, head, fx, stub: './tools/stub_fbdb_mem.js' })
    .then(() => { console.log(`\nR41 ${n - bad}/${n}`); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ } process.exit(bad ? 1 : 0); })
    .catch((e) => { console.error('✗ R41 오류', e && e.stack || e); process.exit(1); });
}
