// 회귀 기준표 R37 — 작업 화면 수리 묶음(4.25-02 판 E): 트윈 카드 «이 한 대만» · 가이드 밖 X-RAY 입력칸 · 탭을 옮겨도 자동 가이드·베이·단 기억 · 완료 칸 숫자 모드별 · 묶음 «완료» 오판 · «다른 갱» 창 기본 = 내 갱 그대로. smoke_regress.cjs 가 부른다.
//   근거 — 모의 작업장 1차(2026-10-12 밤, 실서비스 읽기 사본 + 에뮬레이터, 실인원 다섯) 수리 목록 3·4·7·8·9 · 검수사 2026-10-13 00:53 «전부 클로드 안대로 수정하고 배포» · 06:08 «테스트 보다 앱의 무결점이 중요».
//   실소스 항차 화면(VoyagePage)을 jsdom 에서 그리고 검수원 손 그대로 누른다. Firebase 는 메모리 스텁(tools/stub_fbdb_mem.js — 실제 쓰기 없음).
//   ⚠ 기대값은 코드에서 베끼지 않는다 — 어느 컨이 완료됐는지·남았는지는 스텁 메모리(원자료)를 직접 읽고, 묶음·단 대수는 픽스처 EDI 를 이 파일이 따로 센다.
//   자료 — tools/fixtures/work42502_obwh.json(보관소 OBWH 2763E 양하 — 모의 작업 1차 OBWH 1·2호기 항차, 완료·XRAY 실은 비움).
//   실행: smoke_regress.cjs 안에서 — require('./regress_r37_work.cjs')({ ROOT, TMP, ok, head, fx, stub })
//         단독 — node tools/regress_r37_work.cjs <저장소 루트>
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async function r37({ ROOT, TMP, ok, head, fx, stub }) {
  head('R37 작업 화면 수리 묶음 — 트윈 «이 한 대만» · 가이드 밖 X-RAY 입력칸 · 탭을 옮겨도 가이드 기억 · 완료 칸 ⬇양하·⬆선적 · 묶음 «완료» 오판 없음 · «다른 갱» 창 기본 = 내 갱 그대로 (4.25-02)',
    '모의 작업장 1차 수리 목록 3·4·7·8·9(OBWH 1·2호기 · MCAP 2·3호기) · 검수사 2026-10-13 00:53 «전부 클로드 안대로 수정하고 배포» · 06:08 «테스트 보다 앱의 무결점이 중요»');
  const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));
  const FX = fx('work42502_obwh.json');
  const vk = FX.key;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const E = FX.discharge.ediContainers, XL = FX.discharge.xrayList;
  //  독립 판정 — 묶음 center(짝수 베이 = 그 베이 · 홀수는 앞뒤 짝수 이웃의 묶음 — 이 배는 1·2·3 / 5·6·7 / 9·10·11 … 4칸 간격)
  const centerOf = (bay) => { const b = parseInt(bay, 10); return b % 2 === 0 ? b : (b % 4 === 1 ? b + 1 : b - 1); };
  const inGroup = (cn, center) => centerOf(E[cn].bay) === center;
  const isDeck = (cn) => parseInt(E[cn].tier, 10) >= 80;
  const baseVoy = () => ({ key: vk, info: clone(FX.info), discharge: { ...clone(FX.discharge), completed: {}, xraySeals: {} }, loading: clone(FX.loading) });

  const e37 = path.join(TMP, 'r42502.jsx'), o37 = path.join(TMP, 'r42502.js');
  fs.writeFileSync(e37, [
    `import React from "${ROOT}/node_modules/react/index.js";`,
    `import { createRoot } from "${ROOT}/node_modules/react-dom/client.js";`,
    `import VoyagePage from "${ROOT}/src/pages/VoyagePage.jsx";`,
    `let root = null, insp = '연막'; const el = (v, key) => React.createElement(VoyagePage, { voyageKey: key, voyage: v, inspector: insp, inspectors: [], portMisData: {}, pilotForecast: {}, onGoHome() {}, onModeChange() {}, initModeOverride: 'discharge' });`,
    `window.__R37go = (json, key, who) => { insp = who || '연막'; root = createRoot(document.getElementById('root')); root.render(el(JSON.parse(json), key)); };`,
    //  구독이 새 값을 내려 준 것처럼 같은 화면에 새 항차 값을 다시 준다(상태는 그대로 — 실제 앱의 구독 갱신과 같은 꼴)
    `window.__R37upd = (json, key) => { root.render(el(JSON.parse(json), key)); };`,
  ].join('\n'));
  execSync(`npx esbuild "${e37}" --bundle --loader:.jsx=jsx --loader:.js=jsx --loader:.png=dataurl --loader:.json=json --jsx=automatic --external:fs --external:path --external:url --alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --alias:pdfjs-dist/build/pdf=${ROOT}/tools/stub_pdfjs.js --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${o37}"`, { cwd: ROOT, stdio: 'pipe' });
  const vSrc = fs.readFileSync(o37, 'utf8');

  const open = async (voy, equip = '1호기', session = null, who = '연막') => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
    const W = dom.window, errs = [];
    W.addEventListener('error', (ev) => errs.push(ev.message)); W.console.warn = () => {}; W.console.log = () => {};
    W.matchMedia = W.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    W.scrollTo = () => {}; W.HTMLElement.prototype.scrollIntoView = function () {};
    W.global = W; W.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
    const alerts = []; W.alert = (m) => alerts.push(String(m));   // 앱은 toast.js 가 alert 를 토스트로 바꾼다 — 여기서는 문구만 모은다
    W.localStorage.setItem('gm_equip_no', equip);
    W.localStorage.setItem('master_active_inspector_v1', '연막');
    if (session) for (const [k, v] of Object.entries(session)) W.sessionStorage.setItem(k, v);
    W.__memdb = { voyages: { [vk]: clone(voy) }, ship_bay_dict_v3: clone(FX.shipDict) };
    W.__fbShipBayDict = clone(FX.shipDict);   // 앞뒤 짝 베이는 사전으로 안다(사전이 없으면 남은 컨만으로 짐작해 가운데 베이가 끝나면 짝이 끊긴다)
    try { W.eval(vSrc); W.__R37go(JSON.stringify(voy), vk, who); } catch (er) { errs.push('THROW ' + er.message); }
    await sleep(350);
    const d = W.document;
    const click = async (b, ms = 250) => { if (b) { b.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await sleep(ms); /* 4.29-03: 다른 컨 후보를 누르면 «이 컨으로 처리합니까» 확인 창이 뜬다 — 확인 단추까지 눌러 종전과 같은 흐름으로 잇는다 */ const _md = [...W.document.querySelectorAll('div.fixed.inset-0')].filter((x) => /이 컨으로 처리합니까/.test(x.textContent || '')).slice(-1)[0]; const _cf = _md ? [..._md.querySelectorAll('button')].find((x) => /^(선적확인|양하확인)$/.test(x.textContent.trim())) : null; if (_cf) { _cf.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await sleep(ms); } } return !!b; };
    const txt = (b) => b.textContent.replace(/\s+/g, ' ').trim();
    const btn = (re) => [...d.querySelectorAll('button')].find((b) => re.test(txt(b)) && !b.disabled);
    const until = async (fn, ms = 4000) => { const end = Date.now() + ms; let v = fn(); while (!v && Date.now() < end) { await sleep(60); v = fn(); } return v; };
    const type = async (input, val) => {
      const setter = Object.getOwnPropertyDescriptor(W.HTMLInputElement.prototype, 'value').set;
      setter.call(input, val); input.dispatchEvent(new W.Event('input', { bubbles: true })); await sleep(200);
    };
    const mem = () => W.__memdb.voyages[vk];
    //  메모리(원자료)의 지금 값으로 화면을 다시 그린다 — 구독 갱신과 같은 꼴
    const refresh = async () => { const v = clone(mem()); v.key = vk; W.__R37upd(JSON.stringify(v), vk); await sleep(300); };
    const tab = async (re) => click(await until(() => [...d.querySelectorAll('button[role="tab"]')].find((b) => re.test(b.textContent))), 350);
    const dialog = () => { const t = [...d.querySelectorAll('div.fixed.inset-0')].find((x) => /z-\[100\]/.test(x.className)); return t || null; };
    //  4.27: 트윈 카드는 이름표(앞·뒤)가 컨번호 앞에 붙는다 — 이름표를 떼고 읽는다
    const cardCns = () => [...d.querySelectorAll('button')].map((b) => b.textContent.replace(/\s+/g, '').replace(/^(앞|뒤)(?=[A-Z]{4}\d{7}$)/, '')).filter((s) => /^[A-Z]{4}\d{7}$/.test(s));
    //  4.26: 작업 카드 머리는 «B5·6·7 데크 — 남은 N대»(data-gw-head)
    //  4.27: 기존 자동은 카드가 나오면 한 화면 틀 — 머리 줄 대신 맨 위 한 줄(data-wf-bar «양하 자동 05(06)07 🔵 데크 남은 N대 ◀ 전 화면»)
    const headOf = () => { const h = d.querySelector('[data-gw-head]') || d.querySelector('[data-workframe="guide"] [data-wf-bar]'); return h ? txt(h) : ''; };
    const groupBtn = (center) => [...d.querySelectorAll('button')].find((b) => { const m = txt(b).match(/^B([\d·]+)/); return m && m[1].split('·').map(Number).includes(center) && /남은 컨/.test(txt(b)); });
    const startGuide = async () => { await tab(/작업 시작/); await click(await until(() => btn(/^🤖\s*자동 가이드$/)), 350); await until(() => /작업할 베이를 선택하세요/.test(d.body.textContent)); };
    return { W, d, errs, alerts, click, btn, until, type, mem, refresh, tab, dialog, txt, cardCns, headOf, groupBtn, startGuide, close: () => { try { W.close(); } catch (er) { /* 창 닫기 */ } } };
  };
  const doneCns = (S) => Object.keys((S.mem().discharge || {}).completed || {}).sort();

  //  ── ⑦ 탭을 옮겨도 자동 가이드·베이·단을 기억한다 (모의 작업 MCAP 2호기 `047_manual_after_tabswitch` · 3호기 `051` — 매번 3번 다시 눌렀다)
  {
    const S = await open(baseVoy());
    await S.startGuide();
    await S.click(S.groupBtn(6), 350);
    await S.click(await S.until(() => S.btn(/^🔵 데크 [1-9]/)), 400);
    await S.until(() => S.cardCns().length > 0);
    const before = { head: S.headOf(), first: S.cardCns()[0] };
    const saved = S.W.sessionStorage.getItem(`gm_wctx|${vk}|연막|discharge`);
    await S.tab(/베이/);
    const away = !S.d.querySelector('[data-gw-head]');
    await S.tab(/작업 시작/);
    await S.until(() => S.cardCns().length > 0);
    const after = { head: S.headOf(), first: S.cardCns()[0], guideOn: !!S.btn(/^수동 모드로 전환$/) };
    //  기대 — 픽스처에서 따로 센 B6 묶음(5·6·7) 데크 대수(4.26 머리는 «이 단 남은 수»)
    const n6 = Object.keys(E).filter((cn) => inGroup(cn, 6) && isDeck(cn)).length;
    ok(`⑦-1 작업 시작 → 🤖 자동 가이드 → B5·6·7 → 데크 → 카드 «${before.first}» · 머리 «${before.head}» → 🚢베이 탭 갔다(작업 화면 내림 ${away}) 돌아오면 자동 가이드 그대로(수동 전환 단추 ${after.guideOn}) · 머리 «${after.head}» · 카드 «${after.first}» · 기억 ${saved}`,
      away && after.guideOn && before.head === `양하 자동 05(06)07 🔵 데크 남은 ${n6}대 ◀ 전 화면` && after.head === before.head && !!before.first && after.first === before.first
        && /"guide":true/.test(saved || '') && /"bay":6/.test(saved || '') && /"tier":"deck"/.test(saved || '') && !S.errs.length,
      JSON.stringify({ before, after, saved, errs: S.errs.slice(0, 3) }));
    //  ⑦-2 화면을 새로 열어도(같은 창 — 서비스워커 갱신 새로고침) 기억이 남는다 · 다른 항차 열쇠는 안 섞인다
    S.close();
    const S2 = await open(baseVoy(), '1호기', { [`gm_wctx|${vk}|연막|discharge`]: saved, [`gm_wctx|OTHER_1E|연막|discharge`]: '{"guide":false,"bay":30,"tier":"hold"}' });
    await S2.tab(/작업 시작/);
    await S2.until(() => S2.cardCns().length > 0);
    const re = { head: S2.headOf(), first: S2.cardCns()[0], guideOn: !!S2.btn(/^수동 모드로 전환$/) };
    ok(`⑦-2 같은 창에서 화면을 새로 열어도 «${re.head}» · 카드 «${re.first}» · 자동 가이드 ${re.guideOn}(다른 항차 기억은 안 섞임)`,
      re.guideOn && re.head === before.head && re.first === before.first && !S2.errs.length, JSON.stringify({ re, errs: S2.errs.slice(0, 3) }));
    S2.close();
    //  ⑦-3 같은 창에서 다른 검수원이 로그인하면 앞사람의 기억을 물려받지 않는다(감사 중 — 로그아웃은 새로고침을 안 한다) · «자리 없음» 묶음(−1)은 되살리지 않는다(감사 하)
    const S3 = await open(baseVoy(), '1호기', { [`gm_wctx|${vk}|연막|discharge`]: saved }, '다른검수원');
    await S3.tab(/작업 시작/);
    await sleep(500);
    const r3 = { cards: S3.cardCns().length, guideOn: !!S3.btn(/^수동 모드로 전환$/) };
    S3.close();
    const S4 = await open(baseVoy(), '1호기', { [`gm_wctx|${vk}|연막|discharge`]: '{"guide":false,"bay":-1,"tier":"none"}' });
    await S4.tab(/작업 시작/);
    await sleep(500);
    const t4 = S4.d.body.textContent.replace(/\s+/g, ' ');
    const r4 = { minus: /-1번|B-1/.test(t4), groups: !!S4.groupBtn(6) };
    ok(`⑦-3 다른 검수원(같은 창)은 앞사람 기억을 안 물려받음(카드 ${r3.cards} · 자동 가이드 ${r3.guideOn}) · «자리 없음» 묶음(−1·none) 기억은 되살리지 않음(«-1번» 표시 ${r4.minus} · 베이 고르기 단추 ${r4.groups})`,
      r3.cards === 0 && !r3.guideOn && !r4.minus && r4.groups && !S4.errs.length, JSON.stringify({ r3, r4, e4: S4.errs.slice(0, 2) }));
    S4.close();
  }

  //  ── ④ 가이드 밖 X-RAY 컨 — 막는 자리에서 그 컨의 입력칸이 바로 열린다 (모의 작업 MCAP 2호기 seq47 `074_xray_block_msg` · OBWH 11대 — 리스트 탭 우회 6~13번)
  {
    const S = await open(baseVoy());
    await S.startGuide();
    await S.click(S.groupBtn(6), 350);
    await S.click(await S.until(() => S.btn(/^🔵 데크 [1-9]/)), 400);
    await S.until(() => S.cardCns().length > 0);
    const onCard = S.cardCns().slice(0, 2);
    //  XRAY 대상 — 보관소 xrayList 에서 B6 데크 컨 중 지금 카드에 없는 것(이 파일이 고른다)
    const xcn = Object.keys(XL).filter((cn) => E[cn] && inGroup(cn, 6) && isDeck(cn) && !onCard.includes(cn)).sort()[0];
    await S.click(S.btn(/^다른 컨$/), 300);   // 4.26 예외 줄
    const inp = await S.until(() => [...S.d.querySelectorAll('input')].find((i) => /예: 1234/.test(i.getAttribute('placeholder') || '')));
    await S.type(inp, xcn.slice(-4));
    const m = await S.until(() => [...S.d.querySelectorAll('button')].find((b) => b.textContent.replace(/\s+/g, '').startsWith(xcn)));
    await S.click(m, 400);
    const box = await S.until(() => S.d.querySelector('[data-xray-out="1"]'));
    const xin = box ? box.querySelector('input[placeholder="XRAY 실번호"]') : null;
    const doneBefore = doneCns(S);
    const al = S.alerts.slice(-1)[0] || '';
    ok(`④-1 수정으로 고른 XRAY 대상 ${xcn}(보관소 xrayList · 실 미입력) → 완료 안 됨(${doneBefore.length}) · 카드 아래 «XRAY 실번호 — ${xcn}» 입력칸이 열림(숫자 자판 ${xin ? xin.getAttribute('inputmode') : '-'}) · 알림 «${al.replace(/\n/g, ' ')}»`,
      !!xcn && !!box && box.textContent.includes(xcn) && !!xin && xin.getAttribute('inputmode') === 'numeric' && doneBefore.length === 0 && /열린 칸에 넣고 \[XRAY 저장\] 뒤 다시 누르세요/.test(al) && !S.errs.length,
      JSON.stringify({ xcn, onCard, box: box ? box.textContent.slice(0, 80) : null, done: doneBefore, al, errs: S.errs.slice(0, 3) }));
    //  ④-2 실번호를 넣고 [XRAY 저장] → 저장소에 그 값 → 같은 컨을 다시 고르면 완료된다
    if (xin) {   // 입력칸이 안 열렸으면(④-1 ✘) 넣을 곳이 없다 — 아래 단언이 그대로 ✘ 를 낸다
      await S.type(xin, '520903');
      await S.click([...box.querySelectorAll('button')].find((b) => /XRAY 저장/.test(b.textContent)), 400);
    }
    const sealSaved = ((S.mem().discharge.xraySeals || {})[xcn] || {}).seal;
    await S.refresh();
    const m2 = [...S.d.querySelectorAll('button')].find((b) => b.textContent.replace(/\s+/g, '').startsWith(xcn));
    await S.click(m2 || null, 500);
    const doneAfter = doneCns(S);
    ok(`④-2 [XRAY 저장] → 저장소 XRAY 실 «${sealSaved}» · 칸 닫힘 · 다시 고르면 ${xcn} 완료(완료 ${doneAfter.join(',')})`,
      sealSaved === '520903' && !S.d.querySelector('[data-xray-out="1"]') && doneAfter.length === 1 && doneAfter[0] === xcn && !S.errs.length,
      JSON.stringify({ sealSaved, m2: !!m2, doneAfter, errs: S.errs.slice(0, 3) }));
    //  ④-3 저장하지 않고 수정 칸을 [닫기] 하면 카드 밖 XRAY 칸도 닫힌다(2차 시뮬 하 — 다음 카드 아래에 남아 있었다)
    //  B6 데크의 XRAY 대상은 하나뿐이라 같은 묶음 홀드 것을 고른다(XRAY 막음이 «다른 단» 안내보다 먼저다 — handleFixPick 순서 그대로)
    const xcn2 = Object.keys(XL).filter((cn) => E[cn] && inGroup(cn, 6) && cn !== xcn && !S.cardCns().slice(0, 2).includes(cn)).sort()[0];
    if (!S.btn(/^닫기$/)) await S.click(S.btn(/^다른 컨$/), 300);
    const inp2 = await S.until(() => [...S.d.querySelectorAll('input')].find((i) => /예: 1234/.test(i.getAttribute('placeholder') || '')));
    if (inp2) await S.type(inp2, xcn2.slice(-4));
    await S.click(await S.until(() => [...S.d.querySelectorAll('button')].find((b) => b.textContent.replace(/\s+/g, '').startsWith(xcn2))), 400);
    const open2 = !!S.d.querySelector('[data-xray-out="1"]');
    await S.click(S.btn(/^닫기$/), 300);
    const shut2 = !S.d.querySelector('[data-xray-out="1"]');
    ok(`④-3 다른 XRAY 대상 ${xcn2} 칸이 열린 뒤(${open2}) 저장 없이 수정 칸 [닫기] → 카드 밖 XRAY 칸도 닫힘(${shut2})`, !!xcn2 && open2 && shut2 && !S.errs.length, JSON.stringify({ xcn2, open2, shut2 }));
    S.close();
  }
  //  데크를 끝낸 묶음(홀드를 열 수 있는 상태) — 데크 컨을 1호기 완료로 둔다(시각은 차례로)
  const deckDoneVoy = (center, equip = '1호기') => {
    const v = baseVoy(); let t = Date.now() - 3600000;
    for (const cn of Object.keys(E).filter((x) => inGroup(x, center) && isDeck(x)).sort()) v.discharge.completed[cn] = { by: '연막', at: (t += 60000), equip };
    return v;
  };
  //  트윈 카드가 맨 앞에 서는 상태 — B5·6·7 에서 5·7번 베이 04단 이하(20피트 앞뒤 짝 여섯 쌍이 있는 단)만 남기고 나머지를 1호기 완료로 둔다
  const twinVoy = () => {
    const v = baseVoy(); let t = Date.now() - 3600000;
    for (const cn of Object.keys(E).filter((x) => inGroup(x, 6) && !([5, 7].includes(parseInt(E[x].bay, 10)) && parseInt(E[x].tier, 10) <= 4)).sort()) v.discharge.completed[cn] = { by: '연막', at: (t += 60000), equip: '1호기' };
    return v;
  };
  //  ── ③ 트윈 카드인데 한 대만 왔다 — «이 한 대만»(모의 작업 OBWH 2호기 13대 · 1호기 seq7 `013_seq7_twin_card_wrong` — [맞습니다]면 안 온 컨이 거짓 완료, 아니면 [취소]뿐)
  const twinStart = async () => {
    const S = await open(twinVoy());
    await S.startGuide();
    await S.click(S.groupBtn(5), 350);
    await S.click(await S.until(() => S.btn(/^🟠 홀드 [1-9]/)), 400);
    await S.until(() => S.btn(/^트윈 한 번에 양하확인/));
    const [front, back] = S.cardCns();
    await S.click(S.btn(/^둘 다 다름$/), 300);   // 4.26 예외 줄 — 두 칸(앞·뒤)
    const ins = await S.until(() => { const a = [...S.d.querySelectorAll('input')].filter((x) => /실제 온 컨 끝 4자리/.test(x.getAttribute('placeholder') || '')); return a.length === 2 ? a : null; });
    return { S, front, back, ins };
  };
  //  실제 온 컨 — 같은 단(5·7번 베이 04단)의 다른 20피트 중 카드에 없는 것(이 파일이 픽스처에서 고른다)
  const otherTwinTier = (excl) => Object.keys(E).filter((cn) => [5, 7].includes(parseInt(E[cn].bay, 10)) && parseInt(E[cn].tier, 10) === 4 && !excl.includes(cn)).sort()[0];
  {
    const { S, front, back, ins } = await twinStart();
    const realPair = !!front && !!back && E[front] && E[back] && E[front].row === E[back].row && E[front].tier === E[back].tier && Math.abs(parseInt(E[front].bay, 10) - parseInt(E[back].bay, 10)) === 2;
    const act = otherTwinTier([front, back]);
    const done0 = doneCns(S);
    await S.type(ins[1], act.slice(-4));   // 뒤 칸에 실제 온 컨
    await S.click(await S.until(() => [...S.d.querySelectorAll('button')].find((b) => b.textContent.replace(/\s+/g, '').startsWith(act))), 300);
    await S.click(S.btn(/^선택한 수정 적용/), 400);
    const dlg = await S.until(() => S.dialog());
    const bs = dlg ? [...dlg.querySelectorAll('button')] : [];
    const big = bs.find((b) => /bg-act/.test(b.className));
    const grey = bs.find((b) => /bg-ink-750/.test(b.className));
    const title = dlg ? (dlg.querySelector('.font-black') || {}).textContent : '';
    //  ✕ — 아무것도 안 한다
    await S.click(bs[0], 400);
    const doneX = doneCns(S);
    ok(`③-1 트윈 카드 ${front}(앞)·${back}(뒤) — 픽스처 앞뒤 짝 ${realPair} · 뒤 칸에 실제 온 컨 ${act} 를 고르고 적용 → 물음 «${title}» · 큰 단추 «${big ? S.txt(big) : '-'}» · 회색 «${grey ? S.txt(grey) : '-'}» · ✕ 로 닫으면 완료 그대로(${doneX.length - done0.length}대 늘음)`,
      realPair && !!act && /^앞쪽 \d{4} 도 왔습니까$/.test(title || '') && !!big && S.txt(big) === '싱글 — 이 한 대만' && !!grey && S.txt(grey) === `${front.slice(-4)} 도 확인` && doneX.length === done0.length && !S.dialog() && !S.errs.length,
      JSON.stringify({ front, back, act, title, big: big && S.txt(big), grey: grey && S.txt(grey), done0: done0.length, doneX: doneX.length, errs: S.errs.slice(0, 3) }));
    //  [이 한 대만] — 고른 컨만 완료, 카드의 두 컨은 남고 앞(남은 짝)이 바로 다음 카드
    await S.click(S.btn(/^선택한 수정 적용/), 400);
    const dlg2 = await S.until(() => S.dialog());
    await S.click(dlg2 ? [...dlg2.querySelectorAll('button')].find((b) => /bg-act/.test(b.className)) : null, 500);
    const add = doneCns(S).filter((cn) => !done0.includes(cn));
    await S.refresh();
    await S.until(() => S.cardCns().length > 0);
    const next = S.cardCns();
    ok(`③-2 [이 한 대만] → 완료는 ${add.join(',')} 한 대(카드의 ${front}·${back} 은 안 됨) · 다음 카드 맨 앞 ${next[0]}(남은 짝 ${front})`,
      add.length === 1 && add[0] === act && !doneCns(S).includes(front) && !doneCns(S).includes(back) && next[0] === front && !S.errs.length,
      JSON.stringify({ add, next: next.slice(0, 2), errs: S.errs.slice(0, 3) }));
    //  ⑧-1 완료 칸 숫자 — 양하·선적을 나눠 보인다(원자료 completed 를 이 파일이 센다 · 선적은 보관소 실완료 그대로)
    const dN = Object.keys(S.mem().discharge.completed).length, lN = Object.keys(FX.loading.completed).filter((cn) => FX.loading.ediContainers[cn]).length;
    const split = S.d.querySelector('[data-done-split="1"]');
    ok(`⑧-1 «✓ 완료» 칸 «${split ? split.textContent : '-'}» = 양하 완료 ${dN} · 선적 완료 ${lN}(합 ${dN + lN} 을 한 숫자로 보이지 않는다 — 모의 작업 MCAP 2호기 «선적 0대인데 241»)`,
      !!split && split.textContent === `⬇${dN} · ⬆${lN}` && lN > 0, JSON.stringify({ t: split && split.textContent, dN, lN }));
    S.close();
  }
  {
    //  ③-3 둘 다 왔으면 회색 [○○○○ 도 확인] — 종전 «맞습니다» 와 같은 일(고른 컨 + 남은 쪽 예측 컨 둘 다 완료)
    const { S, front, back, ins } = await twinStart();
    const act = otherTwinTier([front, back]);
    const done0 = doneCns(S);
    await S.type(ins[1], act.slice(-4));
    await S.click(await S.until(() => [...S.d.querySelectorAll('button')].find((b) => b.textContent.replace(/\s+/g, '').startsWith(act))), 300);
    await S.click(S.btn(/^선택한 수정 적용/), 400);
    const dlg = await S.until(() => S.dialog());
    await S.click(dlg ? [...dlg.querySelectorAll('button')].find((b) => /bg-ink-750/.test(b.className)) : null, 500);
    const add = doneCns(S).filter((cn) => !done0.includes(cn)).sort();
    ok(`③-3 [${front.slice(-4)} 도 확인] → 고른 ${act} 와 앞 예측 ${front} 둘 다 완료(${add.join(',')}) · 뒤 예측 ${back} 은 안 됨`,
      add.length === 2 && add.includes(act) && add.includes(front) && !add.includes(back) && !S.errs.length, JSON.stringify({ add, errs: S.errs.slice(0, 3) }));
    S.close();
  }

  {
    //  ③-4 엇갈림 — 뒤 칸에 카드의 앞 컨을 골랐다(앞뒤가 바뀌어 옴). 묻는 컨은 카드에 남은 뒤 컨 · [이 한 대만] 은 앞 컨만 · 다음 카드 맨 앞 = 뒤 컨(감사·2차 시뮬 하)
    const { S, front, back, ins } = await twinStart();
    const done0 = doneCns(S);
    await S.type(ins[1], front.slice(-4));
    await S.click(await S.until(() => [...S.d.querySelectorAll('button')].filter((b) => b.textContent.replace(/\s+/g, '').startsWith(front) && /\d+-\d+-\d+/.test(b.textContent)).slice(-1)[0]), 300);
    await S.click(S.btn(/^선택한 수정 적용/), 400);
    const dlg = await S.until(() => S.dialog());
    const title = dlg ? (dlg.querySelector('.font-black') || {}).textContent : '';
    const grey = dlg ? [...dlg.querySelectorAll('button')].find((b) => /bg-ink-750/.test(b.className)) : null;
    await S.click(dlg ? [...dlg.querySelectorAll('button')].find((b) => /bg-act/.test(b.className)) : null, 500);
    const add = doneCns(S).filter((cn) => !done0.includes(cn));
    await S.refresh();
    await S.until(() => S.cardCns().length > 0);
    const next = S.cardCns();
    //  4.42-04: 앞 컨이 내린 뒤 칸(뒤 컨의 EDI 칸)을 실제 내린 자리로 적었다 — 그러면 자동 맞바꿈이 뒤 컨을 비운 앞 칸으로 보낸다(규칙의 한 쪽 끝을 직접 잰다).
    const _m = S.mem().discharge || {}, _fr = (_m.records || {})[front] || {}, _be = (_m.ediContainers || {})[back] || {};
    const frontLands = !!_be.bay && String(parseInt(_fr.bay_actual, 10)) === String(parseInt(_be.bay, 10)) && String(_fr.row_actual) === String(_be.row) && String(_fr.tier_actual) === String(_be.tier);
    ok(`③-4 엇갈림(뒤 칸에 카드 앞 컨 ${front}) → 물음 «${title}» · 회색 «${grey ? S.txt(grey) : '-'}» · [이 한 대만] 완료 ${add.join(',')} · 다음 카드 맨 앞 ${next[0]}(남은 ${back} 은 비운 앞 칸으로 맞바꿈)`,
      title === `${back.slice(-4)} 도 왔습니까` && !!grey && S.txt(grey) === `${back.slice(-4)} 도 확인` && add.length === 1 && add[0] === front && !doneCns(S).includes(back) && frontLands && !S.errs.length,   // 4.42-04: 양하는 앞 컨이 뒤 칸에 내리면 뒤 컨이 비운 앞 칸으로 자동 맞바꿈 — 맨 앞 카드는 그 칸 순서를 따른다(남은 뒤 컨은 완료 안 됨·큐에 남음)
      JSON.stringify({ title, add, next: next.slice(0, 2), errs: S.errs.slice(0, 3) }));
    S.close();
  }
  {
    //  ③-5 다른 묶음 컨을 [이 한 대만] 으로 넣으려 하면 단독 수정과 같은 «이 자리 화물이 아닙니다» 가 먼저(감사·2차 시뮬 중 — 트윈 길에 이 안내가 없었다) · [취소] 면 완료 0
    const { S, ins } = await twinStart();
    const away = Object.keys(E).filter((cn) => inGroup(cn, 10) && !isDeck(cn)).sort()[0];
    const done0 = doneCns(S);
    await S.type(ins[1], away.slice(-4));
    await S.click(await S.until(() => [...S.d.querySelectorAll('button')].find((b) => b.textContent.replace(/\s+/g, '').startsWith(away))), 300);
    await S.click(S.btn(/^선택한 수정 적용/), 400);
    const d1 = await S.until(() => S.dialog());
    await S.click(d1 ? [...d1.querySelectorAll('button')].find((b) => /bg-act/.test(b.className)) : null, 400);
    const d2 = await S.until(() => { const x = S.dialog(); return x && /이 자리 화물이 아닙니다/.test(x.textContent) ? x : null; });
    const msg = d2 ? d2.textContent.replace(/\s+/g, ' ') : '';
    await S.click(d2 ? [...d2.querySelectorAll('button')].find((b) => /^취소$/.test(S.txt(b))) : null, 400);
    const add = doneCns(S).filter((cn) => !done0.includes(cn));
    const bn = parseInt(E[away].bay, 10);
    ok(`③-5 트윈 뒤 칸에 B9·10·11 홀드 컨 ${away} → [이 한 대만] → «이 자리 화물이 아닙니다»(«${bn}번 홀드 화물입니다» ${msg.includes(`${bn}번 홀드 화물입니다`)}) · [취소] → 완료 ${add.length}대`,
      !!d2 && msg.includes(`${bn}번 홀드 화물입니다`) && add.length === 0 && !S.errs.length, JSON.stringify({ away, msg: msg.slice(0, 160), add, errs: S.errs.slice(0, 3) }));
    S.close();
  }
  {
    //  ③-6 둘 다 확인하는 회색 길에도 카드 밖 다른 묶음 컨이면 «이 자리 화물이 아닙니다» 가 먼저(2차 시뮬 재검 하 — 종전부터 없던 안내) · [취소] 면 완료 0
    const { S, front, ins } = await twinStart();
    const away = Object.keys(E).filter((cn) => inGroup(cn, 10) && !isDeck(cn)).sort()[0];
    const done0 = doneCns(S);
    await S.type(ins[1], away.slice(-4));
    await S.click(await S.until(() => [...S.d.querySelectorAll('button')].find((b) => b.textContent.replace(/\s+/g, '').startsWith(away))), 300);
    await S.click(S.btn(/^선택한 수정 적용/), 400);
    const d1 = await S.until(() => S.dialog());
    await S.click(d1 ? [...d1.querySelectorAll('button')].find((b) => /bg-ink-750/.test(b.className)) : null, 400);   // 회색 [○○○○ 도 확인]
    const d2 = await S.until(() => { const x = S.dialog(); return x && /이 자리 화물이 아닙니다/.test(x.textContent) ? x : null; });
    await S.click(d2 ? [...d2.querySelectorAll('button')].find((b) => /^취소$/.test(S.txt(b))) : null, 400);
    const add = doneCns(S).filter((cn) => !done0.includes(cn));
    ok(`③-6 회색 [${front.slice(-4)} 도 확인] 길 — 뒤 칸에 B9·10·11 홀드 컨 ${away} → «이 자리 화물이 아닙니다» ${!!d2} · [취소] → 완료 ${add.length}대`,
      !!d2 && add.length === 0 && !S.errs.length, JSON.stringify({ away, add, errs: S.errs.slice(0, 3) }));
    S.close();
  }

  //  ── ⑨ «다른 갱» 창 — 큰 단추 = 내 갱 그대로 · ✕ 도 그대로 · 같은 장은 한 번만 (모의 작업 MCAP 2호기 `065_after_wrong_2hogi_tap` — 큰 초록 «2호기로 바꾼다» 를 3~5번 눌렀다)
  const otherGangVoy = () => {
    const v = baseVoy();
    const cn = Object.keys(E).filter((x) => inGroup(x, 10) && isDeck(x)).sort()[0];
    v.discharge.completed[cn] = { by: '이형출', at: Date.now() - 600000, equip: '2호기' };
    return { v, cn };
  };
  {
    const { v, cn } = otherGangVoy();
    const S = await open(v, '1호기');
    await S.startGuide();
    await S.click(S.groupBtn(10), 400);
    const dlg = await S.until(() => S.dialog());
    const bs = dlg ? [...dlg.querySelectorAll('button')] : [];
    const big = bs.find((b) => /bg-act/.test(b.className)), grey = bs.find((b) => /bg-ink-750/.test(b.className));
    const title = dlg ? (dlg.querySelector('.font-black') || {}).textContent : '';
    await S.click(bs[0], 400);   // ✕
    const eq1 = S.W.localStorage.getItem('gm_equip_no');
    const tierScr = await S.until(() => /작업할 단을 선택하세요/.test(S.d.body.textContent) || !!S.btn(/^🔵 데크 [1-9]/));
    //  다시 묶음 목록 → 같은 묶음 → 묻지 않는다
    await S.click(S.btn(/^베이$/) || S.btn(/^베이 선택$/), 300);
    await S.until(() => /작업할 베이를 선택하세요/.test(S.d.body.textContent));
    await S.click(S.groupBtn(10), 400);
    await sleep(300);
    const again = !!S.dialog();
    ok(`⑨-1 2호기가 이미 한 B9·10·11(${cn} 2호기 완료) 를 1호기로 고름 → «${title}» · 큰 단추 «${big ? S.txt(big) : '-'}» · 회색 «${grey ? S.txt(grey) : '-'}» · ✕ 로 닫으면 호기 ${eq1} 그대로 · 단 고르기로 감 · 같은 묶음 다시 고르면 안 묻는다(${again ? '또 물음' : '안 물음'})`,
      title === '이 베이는 다른 갱도 작업했습니다' && !!big && S.txt(big) === '1호기 그대로' && !!grey && S.txt(grey) === '2호기로 바꾼다' && eq1 === '1호기' && !!tierScr && !again && !S.errs.length,
      JSON.stringify({ title, big: big && S.txt(big), grey: grey && S.txt(grey), eq1, tierScr: !!tierScr, again, errs: S.errs.slice(0, 3) }));
    S.close();
  }
  {
    //  ⑨-2 호기를 잘못 고른 것이면 회색 [2호기로 바꾼다] — 헤더·작업 보고와 같은 한 벌(localStorage)로 바뀐다
    const { v } = otherGangVoy();
    const S = await open(v, '1호기');
    await S.startGuide();
    await S.click(S.groupBtn(10), 400);
    const dlg = await S.until(() => S.dialog());
    await S.click(dlg ? [...dlg.querySelectorAll('button')].find((b) => /bg-ink-750/.test(b.className)) : null, 400);
    const eq = S.W.localStorage.getItem('gm_equip_no');
    ok(`⑨-2 [2호기로 바꾼다] → 호기 ${eq}`, eq === '2호기' && !S.errs.length, JSON.stringify({ eq, errs: S.errs.slice(0, 3) }));
    S.close();
  }

  //  ── ⑧-2 묶음 «완료» 오판 — 큐가 비어도 그 묶음에 남은 컨이 있으면 «완료!» 라 하지 않는다(모의 작업 MCAP 2호기 «B22 31/63 선적 완료!» · OBWH 1호기 데크만 끝났는데 «그룹 양하 완료!»)
  {
    //  B1·2·3 데크 컨을 전부 보류(컨 홀 불량 — 되묻지 않는 사유)로 둔다 — 데크 큐는 비지만 묶음에는 데크 보류·홀드가 남는다
    const v = baseVoy();
    const deck = Object.keys(E).filter((x) => inGroup(x, 2) && isDeck(x)).sort();
    const hold = Object.keys(E).filter((x) => inGroup(x, 2) && !isDeck(x));
    v.discharge.held = Object.fromEntries(deck.map((cn) => [cn, { reason: '컨 홀 불량(스프레더 안착 불가)', at: Date.now() - 60000, by: '연막', equip: '1호기', doneAt: 0 }]));
    const S = await open(v, '1호기');
    await S.startGuide();
    await S.click(S.groupBtn(2), 350);
    await S.click(await S.until(() => S.btn(/^🔵 데크 [1-9]/)), 400);
    await sleep(300);
    const left = S.d.querySelector('[data-group-left="1"]');
    const t = S.d.body.textContent.replace(/\s+/g, ' ');
    ok(`⑧-2 B1·2·3 데크 ${deck.length}대를 전부 보류 → 데크 큐 빔 · «${left ? left.textContent.replace(/\s+/g, ' ') : '-'}» (픽스처 — 묶음 남은 ${deck.length + hold.length} · 보류 ${deck.length} · 다른 단 ${hold.length}) · «그룹 양하 완료!» 없음`,
      !!left && left.textContent.includes('데크에서 지금 할 컨이 없습니다') && left.textContent.includes(`이 베이 그룹에 남은 ${deck.length + hold.length}대 · 보류 ${deck.length}대 · 다른 단 ${hold.length}대`) && !/그룹 양하 완료!/.test(t) && !S.errs.length,
      JSON.stringify({ left: left && left.textContent, tail: t.slice(0, 300), errs: S.errs.slice(0, 3) }));
    S.close();
  }
};

//  단독 실행 — node tools/regress_r37_work.cjs <저장소 루트>
if (require.main === module) {
  process.env.TZ = 'Asia/Seoul';
  const ROOT = path.resolve(process.argv[2] || process.cwd());
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'r37_'));
  let n = 0, bad = 0;
  const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
  const head = (t, f) => { console.log(`■ ${t}`); console.log(`  (출처 ${f})`); };
  const fx = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures', f), 'utf8'));
  module.exports({ ROOT, TMP, ok, head, fx, stub: './tools/stub_fbdb_mem.js' })
    .then(() => { console.log(`\nR37 ${n - bad}/${n}`); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ } process.exit(bad ? 1 : 0); })
    .catch((e) => { console.error('✗ R37 오류', e && e.stack || e); process.exit(1); });
}
