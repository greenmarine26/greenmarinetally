// 회귀 기준표 R44 — 미르 [이동](4.40): «N번 베이로 옮겨 드릴까요?» → [이동] 을 누르면 자동 가이드가 그 베이가 든 장·단으로 가서 그 베이 카드를 맨 앞에 놓는다.
//   근거 — 검수사 2026-10-20 18:16 «25번베이부터 해야 되는데 어떻게 바꾸지? 안내대로 바꿔 보셨나요?» · 18:18 «그걸 바꿔 주십시요 25번 베이로 옮겨 드릴까요? 되묻고 이동 또는 취소 버튼을
//         보여주고 이동을 누르면 25번 베이 작업으로 갈수 있게» · 18:19 «모든 베이를 미르가 이동 시킬수 있게 해주시면 됩니다».
//   실소스 항차 화면(VoyagePage)과 떠 있는 미르(MirFab)를 jsdom 에서 같이 그리고 검수원 손 그대로 누른다. Firebase 는 메모리 스텁(쓰기 없음).
//   자료 — tools/fixtures/mirgoto_atpr2646e.json(보관소 ATPR 2646E 양하 267대 · 완료 at 으로 그 시각을 만든다 · 사전 ATPR).
//   ⚠ 기대값은 코드에서 베끼지 않는다 — 그 시각 그 베이에 남은 컨(자리)·데크/홀드는 이 파일이 EDI 행과 완료 기록에서 직접 센다. 장 묶음은 «짝수 + 앞뒤 홀수»(검수사 §5 «짝은 짝수+뒤홀수» — 이 배 23·24·25).
//   실행: smoke_regress.cjs 안에서 — require('./regress_r44_mirgoto.cjs')({ ROOT, TMP, ok, head, fx, stub })
//         단독 — node tools/regress_r44_mirgoto.cjs <저장소 루트>
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async function r44({ ROOT, TMP, ok, head, fx, stub }) {
  head('R44 미르 [이동] — «N번 베이로 옮겨 드릴까요?» [이동]·[취소] → 자동 가이드가 그 베이 카드부터(떠 있는 미르·탭 카드·홈 · 장 바꾸기·다른 갱 물음·데크 먼저·취소·«응»)',
    '검수사 2026-10-20 18:18 «25번 베이로 옮겨 드릴까요? 되묻고 이동 또는 취소 버튼을 보여주고 이동을 누르면 25번 베이 작업으로 갈수 있게» · 18:19 «모든 베이를 미르가 이동 시킬수 있게»');
  const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const FX = fx('mirgoto_atpr2646e.json');
  const VK = FX.voyageKey, E = FX.voyage.discharge.ediContainers, C = FX.voyage.discharge.completed;
  const at = (hm) => new Date(`2026-10-20T${hm}:00+09:00`).getTime();
  const voyAt = (t) => { const v = { key: VK, info: clone(FX.voyage.info), discharge: clone(FX.voyage.discharge), photoIndex: {}, reports: {} };
    for (const k of Object.keys(v.info)) if (/Done|depart|workEnd|archiv/i.test(k)) delete v.info[k];
    const c = v.discharge.completed || {}; for (const k of Object.keys(c)) if (!(c[k].at <= t)) delete c[k];
    return v; };
  //  독립 셈 — 그 시각 그 베이에 남은 컨의 자리(«베이-로우-단») · 데크(단 80 이상)/홀드
  const leftPos = (t, bay, tier) => Object.values(E).filter((r) => parseInt(r.bay, 10) === bay && !(C[r.cn] && C[r.cn].at <= t)
    && (tier === 'deck' ? parseInt(r.tier, 10) >= 80 : tier === 'hold' ? parseInt(r.tier, 10) < 80 : true)).map((r) => `${parseInt(r.bay, 10)}-${r.row}-${r.tier}`);

  const eF = path.join(TMP, 'r44.jsx'), oF = path.join(TMP, 'r44.js');
  fs.writeFileSync(eF, [
    `import React from "${ROOT}/node_modules/react/index.js";`,
    `import { createRoot } from "${ROOT}/node_modules/react-dom/client.js";`,
    `import VoyagePage from "${ROOT}/src/pages/VoyagePage.jsx";`,
    `import MirFab from "${ROOT}/src/components/MirFab.jsx";`,
    `const App = ({ v, k, page, mode }) => React.createElement(React.Fragment, null,`,
    `  page ? React.createElement(VoyagePage, { voyageKey: k, voyage: v, inspector: '연막', inspectors: [], portMisData: {}, pilotForecast: {}, onGoHome() {}, onModeChange() {}, initModeOverride: mode || 'discharge' }) : null,`,
    `  React.createElement(MirFab, { voyages: { [k]: v }, inspector: '연막', isChief: false, portMisData: {}, pilotForecast: {}, heartbeat: null, onOpenPlan() {} }));`,
    `let root = null;`,
    `window.__R44go = (json, k, page, mode) => { if (!root) root = createRoot(document.getElementById('root')); root.render(React.createElement(App, { v: JSON.parse(json), k, page, mode })); };`,
  ].join('\n'));
  execSync(`npx esbuild "${eF}" --bundle --loader:.jsx=jsx --loader:.js=jsx --loader:.png=dataurl --loader:.jpg=dataurl --loader:.webp=dataurl --loader:.json=json --jsx=automatic --external:fs --external:path --external:url --alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --alias:pdfjs-dist/build/pdf=${ROOT}/tools/stub_pdfjs.js --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${oF}"`, { cwd: ROOT, stdio: 'pipe' });
  const vSrc = fs.readFileSync(oF, 'utf8');

  const open = async (t, { page = true, equip = '4호기', voy = null, vk = VK, code = 'ATPR', dict = FX.dict, wctx = null, mode = 'discharge' } = {}) => {
    const v = voy || voyAt(t);
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
    const W = dom.window, errs = [], notes = [], gotos = [];
    W.addEventListener('error', (ev) => errs.push(ev.message)); W.console.warn = () => {}; W.console.log = () => {};
    W.matchMedia = W.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    W.scrollTo = () => {}; W.HTMLElement.prototype.scrollIntoView = function () {};
    W.global = W; W.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } }; W.alert = () => {};
    W.localStorage.setItem('gm_equip_no', equip);
    W.localStorage.setItem('master_active_inspector_v1', '연막');
    W.addEventListener('writeNotice', (e) => notes.push(String((e.detail && e.detail.message) || '')));
    W.addEventListener('gm-mir-goto', (e) => gotos.push(e.detail));
    W.__memdb = { voyages: { [vk]: clone(v) }, ship_bay_dict_v3: { [code]: clone(dict) } };
    W.__fbShipBayDict = { [code]: clone(dict) };
    if (wctx) for (const [m, val] of Object.entries(wctx)) W.sessionStorage.setItem(`gm_wctx|${vk}|연막|${m}`, JSON.stringify(val));   // 그 모드에 기억한 작업 맥락(«수동» 등)
    try { W.eval(vSrc); W.__R44go(JSON.stringify(v), vk, page, mode); } catch (er) { errs.push('THROW ' + er.message); }
    await sleep(450);
    const d = W.document, txt = (b) => b.textContent.replace(/\s+/g, ' ').trim();
    const click = async (b, ms = 350) => { if (b) { b.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await sleep(ms); } return !!b; };
    const btn = (re) => [...d.querySelectorAll('button')].find((b) => re.test(txt(b)) && !b.disabled);
    const until = async (fn, ms = 4000) => { const end = Date.now() + ms; let x = fn(); while (!x && Date.now() < end) { await sleep(60); x = fn(); } return x; };
    const setInput = (inp, val) => { const set = Object.getOwnPropertyDescriptor(W.HTMLInputElement.prototype, 'value').set; set.call(inp, val); inp.dispatchEvent(new W.Event('input', { bubbles: true })); };
    const sheet = () => d.querySelector('[data-mir-sheet]');
    const mirAsk = async (q) => {
      if (!sheet()) await click(d.querySelector('button[aria-label="미르에게 묻기"]'), 300);
      setInput(d.getElementById('mirFabIn'), q); await sleep(80);
      await click(btn(/^질문$/), 900);
      const sh = sheet();
      return { ans: sh ? txt(sh.querySelector('.whitespace-pre-line') || sh) : '', chips: sh ? [...sh.querySelectorAll('[data-mir-follow] button')].map(txt) : [] };
    };
    const tapChip = async (label) => { const sh = sheet(); const b = sh && [...sh.querySelectorAll('[data-mir-follow] button')].find((x) => txt(x) === label); await click(b, 1300); return !!b; };
    const curTab = () => { const x = [...d.querySelectorAll('button[role="tab"]')].find((b) => b.getAttribute('aria-selected') === 'true'); return x ? txt(x) : ''; };
    const cards = () => [...d.querySelectorAll('[data-gw-card]')].map((c) => c.getAttribute('data-gw-pos'));
    const curChip = () => { const x = d.querySelector('[data-gw-groups] [data-gw-group][data-gw-cur="1"]'); return x ? txt(x) : ''; };
    const band = () => (txt(d.body).match(/(\d+)번 베이 먼저 중/) || [])[1] || '';
    const settle = async () => { const keep = await until(() => btn(/그대로$/), 1500); let asked = ''; if (keep) { asked = (txt(d.body).match(/이 베이는 다른 갱도 작업했습니다/) || [''])[0]; await click(keep, 500); } await until(() => cards().length > 0, 4000); await sleep(700); return asked; };
    const remount = async () => { W.__R44go(JSON.stringify(v), vk, true, mode); await sleep(900); };
    const pick = async (re) => { await click(await until(() => [...d.querySelectorAll('button[role="tab"]')].find((b) => /작업 시작/.test(b.textContent))), 400); await click(await until(() => btn(/^🤖\s*자동 가이드$/)), 400);
      const bs = btn(/우현/); if (bs) await click(bs, 400); await until(() => /작업할 베이를 선택하세요/.test(txt(d.body)));
      await click([...d.querySelectorAll('button')].find((b) => re.test(txt(b))), 400); const k0 = btn(/그대로$/); if (k0) await click(k0, 300);
      await click(await until(() => [...d.querySelectorAll('button')].find((b) => /(데크|홀드)\s*[1-9]\d*개/.test(txt(b)) && !b.disabled)), 600); await until(() => cards().length > 0); };
    const tab = async (re) => click(await until(() => [...d.querySelectorAll('button[role="tab"]')].find((b) => re.test(b.textContent))), 450);
    return { W, d, errs, notes, gotos, mirAsk, tapChip, curTab, cards, curChip, band, settle, remount, pick, sheet, txt, click, until, btn, setInput, tab, close: () => W.close() };
  };
  const pos25 = leftPos(at('14:43'), 25, 'hold');

  //  ① 떠 있는 미르(양하 탭에 있을 때) — 실입력 그대로 → [이동]
  { const S = await open(at('14:43'));
    const r = await S.mirAsk('25번베이부터 해야 되는데 어떻게 바꾸지?');
    ok(`①-1 «25번베이부터 해야 되는데 어떻게 바꾸지?» → «ATPR 양하 25번 베이로 옮겨 드릴까요?» 남은 ${pos25.length}대(홀드) · 단추 [이동]·[취소]`,
      /^📍 ATPR 양하 25번 베이로 옮겨 드릴까요\?/.test(r.ans) && r.ans.includes(`25번 베이 남은 ${pos25.length}대(홀드 ${pos25.length})`) && r.chips.join('|') === '이동|취소', `${r.ans} | ${r.chips}`);
    const tab0 = S.curTab();
    await S.tapChip('이동'); await S.settle();
    const c = S.cards();
    ok(`①-2 [이동] → «작업 시작» 탭(누르기 전 «${tab0}») · 미르 시트 내려감 · 장 칩 B23·24·25 홀드 · 첫 카드가 25번 베이 남은 자리(${c[0] || '-'}) · «25번 베이 먼저 중» · 앱 띠 한 줄`,
      /작업 시작/.test(S.curTab()) && !/작업 시작/.test(tab0) && !S.sheet() && /^B23·24·25 홀드/.test(S.curChip()) && !!c[0] && pos25.includes(c[0]) && S.band() === '25'
      && S.gotos.length === 1 && S.notes.some((m) => /미르가 양하 B23·24·25 홀드로 옮겼어요 — 25번 베이 카드부터/.test(m)) && !S.errs.length,
      JSON.stringify({ tab: S.curTab(), sheet: !!S.sheet(), chip: S.curChip(), c: c.slice(0, 3), band: S.band(), gotos: S.gotos.length, notes: S.notes, errs: S.errs.slice(0, 2) }));
    S.close(); }

  //  ② 다른 장(B9·10·11 홀드)을 하던 중 «25번 베이로 바꿔줘» → [이동] — 장·단이 바뀐 커밋에 옛 단(홀드)을 보고 끝내지 않는다(화면 실측 수리)
  { const S = await open(at('14:43'));
    await S.pick(/^B9·10·11/); const before = S.cards()[0] || '';
    const r = await S.mirAsk('25번 베이로 바꿔줘');
    await S.tapChip('이동'); await S.settle();
    const c = S.cards();
    ok(`② B9·10·11 홀드(첫 카드 ${before}) 하던 중 «25번 베이로 바꿔줘» [이동] → B23·24·25 홀드 · 첫 카드 25번 베이(${c[0] || '-'}) — 단 고르기 화면에 남지 않는다`,
      /^📍 ATPR 양하 25번 베이로 옮겨 드릴까요\?/.test(r.ans) && /^11-/.test(before) && /^B23·24·25 홀드/.test(S.curChip()) && !!c[0] && pos25.includes(c[0]) && S.band() === '25' && !/작업할 단을 선택하세요/.test(S.txt(S.d.body)),
      JSON.stringify({ before, chip: S.curChip(), c: c.slice(0, 3), band: S.band() }));
    S.close(); }

  //  ③ [취소] — 아무것도 안 바꾼다 · ④ 말로 «응» — 옮긴다
  { const S = await open(at('14:43'));
    await S.mirAsk('25번 베이부터 하자'); const tab0 = S.curTab(); await S.tapChip('취소'); await sleep(400);
    const sh = S.sheet(); const after = sh ? S.txt(sh.querySelector('.whitespace-pre-line') || sh) : '';
    ok('③ [취소] → «네, 그대로 둘게요» · 탭 그대로 · 이동 알림 없음 · 단추 거둠',
      /그대로 둘게요/.test(after) && S.curTab() === tab0 && !S.gotos.length && !!sh && ![...sh.querySelectorAll('[data-mir-follow] button')].length, JSON.stringify({ after, tab: S.curTab(), gotos: S.gotos }));
    S.close(); }
  { const S = await open(at('14:43'));
    await S.mirAsk('25번베이부터 해야 되는데 어떻게 바꾸지?'); const r = await S.mirAsk('응'); await S.settle();
    const c = S.cards();
    ok(`④ 말로 «응» → «🚀 25번 베이로 옮길게요» · 첫 카드 25번 베이(${c[0] || '-'})`, /🚀 25번 베이로 옮길게요/.test(r.ans) && !!c[0] && pos25.includes(c[0]) && S.band() === '25', JSON.stringify({ ans: r.ans, c: c.slice(0, 2) }));
    S.close(); }

  //  ⑤ 09:00 — B23·24·25 는 24번 데크가 남았다 → 홀드는 데크 다음(V8.45 게이트) → 데크로 가고 까닭을 말한다(25번 카드를 앞에 세우지 못한다)
  { const t = at('09:00'); const dk = leftPos(t, 23, 'deck').length + leftPos(t, 24, 'deck').length + leftPos(t, 25, 'deck').length, h25 = leftPos(t, 25, 'hold').length, d24 = leftPos(t, 24, 'deck');
    const S = await open(t);
    await S.mirAsk('25번베이부터 해야 되는데 어떻게 바꾸지?'); await S.tapChip('이동'); await S.settle();
    const c = S.cards();
    ok(`⑤ 09:00 25번은 홀드 ${h25}대만 · 이 장 데크 ${dk}대 남음 → B23·24·25 데크 · 첫 카드 24번 데크(${c[0] || '-'}) · «25번 베이는 홀드만 남았어요 — 이 장 데크 ${dk}대를 먼저» (베이 먼저 없음)`,
      dk > 0 && h25 > 0 && /^B23·24·25 데크/.test(S.curChip()) && !!c[0] && d24.includes(c[0]) && !S.band() && S.notes.some((m) => m.includes(`25번 베이는 홀드만 남았어요 — 이 장 데크 ${dk}대를 먼저 내려야 해서`)),
      JSON.stringify({ chip: S.curChip(), c: c.slice(0, 2), band: S.band(), notes: S.notes }));
    S.close(); }

  //  ⑥ 11:00 «10번 베이 먼저 할게» — 그 장은 2호기가 작업했다 → «다른 갱» 물음을 그대로 묻고 [4호기 그대로] 뒤에 이어 간다 · 데크(10번 데크 남음)
  { const t = at('11:00'); const p10 = leftPos(t, 10, 'deck');
    const S = await open(t);
    await S.mirAsk('10번 베이 먼저 할게'); await S.tapChip('이동'); const asked = await S.settle();
    const c = S.cards();
    ok(`⑥ 11:00 «10번 베이 먼저 할게» [이동] → «이 베이는 다른 갱도 작업했습니다» 물음 → [그대로] → B9·10·11 데크 · 첫 카드 10번 데크(${c[0] || '-'}) · «10번 베이 먼저 중»`,
      !!asked && /^B9·10·11 데크/.test(S.curChip()) && !!c[0] && p10.includes(c[0]) && S.band() === '10', JSON.stringify({ asked, chip: S.curChip(), c: c.slice(0, 2), band: S.band() }));
    S.close(); }

  //  ⑦ 양하 탭 검색줄(탭 카드 InlineAnswerCard) — 같은 단추 · 같은 이동
  { const S = await open(at('14:43'));
    await S.click(S.btn(/^⌨$/), 150);
    const inp = [...S.d.querySelectorAll('input')].find((x) => /질문/.test(x.getAttribute('placeholder') || ''));
    S.setInput(inp, '3번 베이부터 하자'); await sleep(80); inp.dispatchEvent(new S.W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await sleep(700);
    const fol = S.d.querySelector('[data-mir-follow]'); const chips = fol ? [...fol.querySelectorAll('button')].map(S.txt) : [];
    await S.click(fol && [...fol.querySelectorAll('button')].find((x) => S.txt(x) === '이동'), 1300); await S.settle();
    const c = S.cards(), p3 = leftPos(at('14:43'), 3, 'hold');
    ok(`⑦ 양하 탭 검색줄 «3번 베이부터 하자» → 단추 [이동]·[취소] → B1·2·3 홀드 · 첫 카드 3번 베이(${c[0] || '-'})`,
      chips.join('|') === '이동|취소' && /^B1·2·3 홀드/.test(S.curChip()) && !!c[0] && p3.includes(c[0]) && S.band() === '3', JSON.stringify({ chips, chip: S.curChip(), c: c.slice(0, 2) }));
    S.close(); }

  //  ⑧ 홈(항차 화면 없음)에서 배 이름을 붙여 물음 → [이동] → 요청이 남았다가 항차 화면이 열리면서 꺼내 간다(App 은 그 항차로 옮긴다 — 여기서는 항차 화면을 여는 것으로 대신한다)
  { const S = await open(at('14:43'), { page: false });
    const r = await S.mirAsk('ATPR 25번베이부터 해야 되는데 어떻게 바꾸지?'); await S.tapChip('이동');
    const g = S.gotos[0] || {};
    await S.remount(); await S.settle();
    const c = S.cards();
    ok(`⑧ 홈 «ATPR 25번베이부터 …» [이동] → 알림(ATPR_2646E 양하 25) → 항차 화면이 열리며 작업 시작 · 첫 카드 25번 베이(${c[0] || '-'})`,
      /^📍 ATPR 양하 25번 베이로 옮겨 드릴까요\?/.test(r.ans) && g.voyageKey === VK && g.mode === 'discharge' && g.bay === 25 && /작업 시작/.test(S.curTab()) && !!c[0] && pos25.includes(c[0]) && S.band() === '25',
      JSON.stringify({ g, tab: S.curTab(), c: c.slice(0, 2) }));
    S.close(); }
  //  ⑨ 감사 상-1 — 끝난 [이동] 은 다시 돌지 않는다: 25번으로 옮긴 뒤 검수원이 장 칩으로 B9·10·11 홀드를 골랐다 → [📋양하] 탭에 갔다 [🚀작업 시작] 으로 돌아와도 · [✋ 수동] → [🤖 자동 가이드] 를 눌러도 B9·10·11 그대로
  { const S = await open(at('14:43'));
    await S.mirAsk('25번베이부터 해야 되는데 어떻게 바꾸지?'); await S.tapChip('이동'); await S.settle();
    const n0 = S.notes.length;
    await S.click(S.d.querySelector('[data-gw-groups] [data-gw-group="10"]'), 400); const k0 = S.btn(/그대로$/); if (k0) await S.click(k0, 300);
    await S.click(await S.until(() => [...S.d.querySelectorAll('button')].find((b) => /홀드\s*[1-9]\d*개/.test(S.txt(b)) && !b.disabled)), 600); await S.until(() => S.cards().length > 0);
    const mine = S.curChip(), c0 = S.cards()[0] || '';
    await S.tab(/양하/); await S.tab(/작업 시작/); await sleep(900);
    const back = S.curChip(), c1 = S.cards()[0] || '';
    await S.click(S.btn(/^✋\s*수동$/), 400); await S.click(S.btn(/^🤖\s*자동 가이드$/), 400); await sleep(900);
    const back2 = S.curChip(), c2 = S.cards()[0] || '';
    ok(`⑨ [이동] 뒤 검수원이 B9·10·11 홀드(${c0})를 고름 → 탭을 떠났다 와도(${c1}) · 수동 → 자동(${c2}) — 25번으로 다시 튀지 않는다 · 띠 알림 더 없음`,
      /^B9·10·11 홀드/.test(mine) && /^11-/.test(c0) && back === mine && c1 === c0 && back2 === mine && c2 === c0 && S.band() !== '25' && S.notes.length === n0,
      JSON.stringify({ mine, back, back2, c0, c1, c2, band: S.band(), notes: S.notes.slice(n0) }));
    S.close(); }

  //  ⑩ 감사 상-2 — 그 모드에 «수동» 을 기억한 채 [✓ 완료] 보기에서 [이동] → 자동 가이드가 켜지고 25번 카드(되살리기가 가이드를 끄지 않는다)
  { const S = await open(at('14:43'), { wctx: { discharge: { guide: false, bay: null, tier: null } } });
    await S.tab(/작업 시작/); await S.click(S.btn(/^✓\s*완료/), 400);
    await S.mirAsk('25번 베이로 바꿔줘'); await S.tapChip('이동'); await S.settle();
    const c = S.cards();
    ok(`⑩ 양하에 «수동» 을 기억한 채 [✓ 완료] 보기에서 [이동] → 자동 가이드 · B23·24·25 홀드 · 첫 카드 25번 베이(${c[0] || '-'})`,
      /^B23·24·25 홀드/.test(S.curChip()) && !!c[0] && pos25.includes(c[0]) && S.band() === '25', JSON.stringify({ chip: S.curChip(), c: c.slice(0, 2), notes: S.notes }));
    S.close(); }

  //  ⑪ 감사 상-2(모드가 바뀌는 [이동]) — DXQD 2636W: 양하 화면(양하는 다 끝남)에서 선적에 «수동» 을 기억한 채 «선적 N번 베이부터 하자» → [이동] → 선적 자동 가이드가 켜진다
  { const DQ = fx('bayview_dxqd.json');
    const dv = { key: 'DXQD_2636E', info: clone(DQ.info), discharge: clone(DQ.discharge), loading: clone(DQ.loading), photoIndex: {}, reports: {} };
    for (const k of Object.keys(dv.info)) if (/Done|depart|workEnd|archiv/i.test(k)) delete dv.info[k];
    const lc = DQ.loading.completed || {};
    const lb = [...new Set(Object.values(DQ.loading.ediContainers).filter((r) => !lc[r.cn]).map((r) => parseInt(r.bay, 10)))].sort((x, y) => x - y)[0];
    const lpos = Object.values(DQ.loading.ediContainers).filter((r) => parseInt(r.bay, 10) === lb && !lc[r.cn]).map((r) => `${parseInt(r.bay, 10)}-${r.row}-${r.tier}`);
    const S = await open(0, { voy: dv, vk: 'DXQD_2636E', code: 'DXQD', dict: DQ.dict, wctx: { loading: { guide: false, bay: null, tier: null } }, equip: '1호기' });
    const r = await S.mirAsk(`선적 ${lb}번 베이부터 하자`); await S.tapChip('이동'); await S.settle();
    const c = S.cards(), body = S.txt(S.d.body);
    ok(`⑪ DXQD 양하 화면 · 선적에 «수동» 기억 · «선적 ${lb}번 베이부터 하자» [이동] → 선적 자동 가이드(장 칩 ${S.curChip() || '-'}) · 첫 카드 ${c[0] || '-'}(그 베이 또는 까닭 띠)`,
      r.ans.startsWith(`📍 DXQD 선적 ${lb}번 베이로 옮겨 드릴까요?`) && !!S.curChip() && S.curChip().includes(String(lb)) && !!c[0]
      && (lpos.includes(c[0]) || S.notes.some((m) => /가 먼저예요|해치|홀드만 남았어요/.test(m)) || /해치커버/.test(body)),
      JSON.stringify({ ans: r.ans.slice(0, 60), chip: S.curChip(), c: c.slice(0, 2), notes: S.notes }));
    S.close(); }

  let first12 = '';
  //  ⑫ 감사 하 — «24번 베이부터 작업하자»(24번은 끝남, 40피트 베이 = 장 가운데) → 장(B23·24·25)으로 · 장 순서대로
  { const S = await open(at('14:43'));
    const r = await S.mirAsk('24번 베이부터 작업하자'); await S.tapChip('이동'); await S.settle();
    const c = S.cards(), g = [...leftPos(at('14:43'), 23, 'hold'), ...pos25];
    first12 = c[0] || '';
    ok(`⑫ «24번 베이부터 작업하자» → «24번 베이 장(B23·24·25)으로 옮겨 드릴까요?» [이동] → B23·24·25 홀드 · 첫 카드 ${c[0] || '-'}(장 남은 자리) · «24번 베이는 남은 컨이 없어 이 장 순서대로»`,
      /^📍 ATPR 양하 24번 베이 장\(B23·24·25\)으로 옮겨 드릴까요\?/.test(r.ans) && /^B23·24·25 홀드/.test(S.curChip()) && !!c[0] && g.includes(c[0]) && !S.band() && S.notes.some((m) => /24번 베이는 남은 컨이 없어 이 장 순서대로/.test(m)),
      JSON.stringify({ ans: r.ans.slice(0, 70), chip: S.curChip(), c: c.slice(0, 2), notes: S.notes }));
    S.close(); }

  //  ⑬ 2차 시뮬 재실행 하 — 같은 장·같은 단에서 연달아: 25번으로 옮긴 뒤(«25번 베이 먼저») «24번 베이부터 작업하자» → 장으로 옮기면 «베이 먼저» 를 푼다(첫 카드가 새 화면 ⑫ 와 같은 장 순서)
  { const S = await open(at('14:43'));
    await S.mirAsk('25번 베이로 바꿔줘'); await S.tapChip('이동'); await S.settle();
    const b0 = S.band();
    await S.mirAsk('24번 베이부터 작업하자'); await S.tapChip('이동'); await sleep(1200);
    const c = S.cards();
    ok(`⑬ 25번(«25번 베이 먼저» ${b0 ? '걸림' : '-'}) 뒤 «24번 베이부터 작업하자» [이동] → «베이 먼저» 풂 · 첫 카드 ${c[0] || '-'} = 새 화면에서 장으로 옮긴 첫 카드 ${first12 || '-'} · «이 장 순서대로»`,
      b0 === '25' && !S.band() && !!c[0] && c[0] === first12 && S.notes.some((m) => /24번 베이는 남은 컨이 없어 이 장 순서대로/.test(m)),
      JSON.stringify({ b0, band: S.band(), c: c.slice(0, 2), first12, notes: S.notes }));
    S.close(); }
};

//  단독 실행 — node tools/regress_r44_mirgoto.cjs <저장소 루트>
if (require.main === module) {
  process.env.TZ = 'Asia/Seoul';
  const ROOT = path.resolve(process.argv[2] || process.cwd());
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'r44_'));
  let n = 0, bad = 0;
  const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
  const head = (t, f) => { console.log(`■ ${t}`); console.log(`  (출처 ${f})`); };
  const fx = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures', f), 'utf8'));
  module.exports({ ROOT, TMP, ok, head, fx, stub: './tools/stub_fbdb_mem.js' })
    .then(() => { console.log(`\nR44 ${n - bad}/${n}`); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ } process.exit(bad ? 1 : 0); })
    .catch((e) => { console.error('✗ R44 오류', e && e.stack || e); process.exit(1); });
}
