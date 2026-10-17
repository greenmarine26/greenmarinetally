// 회귀 기준표 R42 — 선적 자동 가이드 «풀부터 / 엠티부터» 갈림 칩이 선적 판정(아래 칸 먼저)으로 뜬다(4.26-04 수리).
//   근거 — 검수사 2026-10-15 08:53 «선적시 풀먼저 엠티먼저 선택이 있었던거 같은 데 오늘은 안보였습니다. 그것때문에 자동이 막혔씁니다».
//   실자료 — STMJ 2664W 3호기(김성일) 03:58 18홀드 02단: 풀 트윈 3쌍(로우 01·00·02)·엠티 트윈 4쌍(05·03·04·06)이 같은 높이로 남았는데
//     «지금 할 수 있는 컨»을 양하 판정(blockedByAbove — 위에 남은 컨이 없어야)으로 골라 맨 위 18-xx-08 풀 45 7장만 남았다 → 칩 없음 → 3대 연속 흐름 감지(1.57)도 멈춤.
//   실소스 항차 화면(VoyagePage)을 jsdom 에서 그리고 검수원 손 그대로 누른다. Firebase 는 메모리 스텁(tools/stub_fbdb_mem.js — 실제 쓰기 없음).
//   ⚠ 기대값은 코드에서 베끼지 않는다 — 풀·엠티 쌍 수는 픽스처 EDI 를 이 파일이 따로 센다(같은 높이 = 그 단에서 가장 낮은 남은 티어).
//   자료 — tools/fixtures/fork_stmj2664w.json(보관소 GET 읽기 사본 2026-10-15 09:00 — 18·26 묶음 EDI · 같은 묶음 완료 · STMJ 베이 사전).
//   실행: smoke_regress.cjs 안에서 — require('./regress_r42_fork.cjs')({ ROOT, TMP, ok, head, fx, stub })
//         단독 — node tools/regress_r42_fork.cjs <저장소 루트>
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async function r42({ ROOT, TMP, ok, head, fx, stub }) {
  head('R42 선적 자동 가이드 «풀부터 / 엠티부터» 칩 — 선적은 아래 칸 먼저로 «지금 할 수 있는 컨» 을 고른다 (4.26-04)',
    '검수사 2026-10-15 08:53 «선적시 풀먼저 엠티먼저 선택이 있었던거 같은 데 오늘은 안보였습니다. 그것때문에 자동이 막혔씁니다» · STMJ 2664W 3호기 03:58 18홀드');
  const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));
  const FX = fx('fork_stmj2664w.json');
  const vk = FX.key;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const E = FX.loading.ediContainers, CA = FX.loading.completedAll;
  const KST = (hms) => Date.parse(`2026-10-15T${hms}+09:00`);
  const voyAt = (hms) => {
    const cut = KST(hms);
    const completed = {};
    for (const [cn, r] of Object.entries(CA)) if (r.at <= cut) completed[cn] = clone(r);
    return { key: vk, info: clone(FX.info), loading: { ediContainers: clone(E), completed }, discharge: { ediContainers: {}, completed: {} } };
  };
  //  독립 셈 — 묶음 center · 홀드 · 그 시각 남은 컨 중 가장 낮은 티어 높이의 풀/엠티 «쌍» 수(20피트 홀수 베이 한쪽만 센다 — 트윈 한 장 = 앞 베이 한 대)
  const centerOf = (bay) => { const b = parseInt(bay, 10); return b % 2 === 0 ? b : (b % 4 === 1 ? b + 1 : b - 1); };
  const lowestPairs = (hms, center, frontBay) => {
    const cut = KST(hms);
    const left = Object.keys(E).filter((cn) => centerOf(E[cn].bay) === center && parseInt(E[cn].tier, 10) < 80 && !(CA[cn] && CA[cn].at <= cut));
    const t0 = Math.min(...left.map((cn) => parseInt(E[cn].tier, 10)));
    const front = left.filter((cn) => parseInt(E[cn].bay, 10) === frontBay && parseInt(E[cn].tier, 10) === t0);
    return { t0, F: front.filter((cn) => E[cn].fe === 'F').length, E: front.filter((cn) => E[cn].fe === 'E').length };
  };

  const ent = path.join(TMP, 'r42fork.jsx'), out = path.join(TMP, 'r42fork.js');
  fs.writeFileSync(ent, [
    `import React from "${ROOT}/node_modules/react/index.js";`,
    `import { createRoot } from "${ROOT}/node_modules/react-dom/client.js";`,
    `import VoyagePage from "${ROOT}/src/pages/VoyagePage.jsx";`,
    `import * as GQ from "${ROOT}/src/guidedQueue.js";`,
    `window.__GQ = GQ;`,
    `let root = null, md = 'loading'; const el = (v, key) => React.createElement(VoyagePage, { voyageKey: key, voyage: v, inspector: '연막', inspectors: [], portMisData: {}, pilotForecast: {}, onGoHome() {}, onModeChange() {}, initModeOverride: md });`,
    `window.__R42go = (json, key, m) => { md = m || 'loading'; root = createRoot(document.getElementById('root')); root.render(el(JSON.parse(json), key)); };`,
    `window.__R42upd = (json, key) => { root.render(el(JSON.parse(json), key)); };`,
  ].join('\n'));
  execSync(`npx esbuild "${ent}" --bundle --loader:.jsx=jsx --loader:.js=jsx --loader:.png=dataurl --loader:.json=json --jsx=automatic --external:fs --external:path --external:url --alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --alias:pdfjs-dist/build/pdf=${ROOT}/tools/stub_pdfjs.js --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${out}"`, { cwd: ROOT, stdio: 'pipe' });
  const vSrc = fs.readFileSync(out, 'utf8');

  const open = async (voy, md = 'loading', dict = FX.shipDict, vkey = vk) => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
    const W = dom.window, errs = [];
    W.addEventListener('error', (ev) => errs.push(ev.message)); W.console.warn = () => {}; W.console.log = () => {};
    W.matchMedia = W.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    W.scrollTo = () => {}; W.scrollBy = () => {}; W.HTMLElement.prototype.scrollIntoView = function () {};
    W.global = W; W.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
    W.alert = () => {};
    W.localStorage.setItem('gm_equip_no', '3호기');
    W.localStorage.setItem('master_active_inspector_v1', '연막');
    W.__memdb = { voyages: { [vkey]: clone(voy) }, ship_bay_dict_v3: clone(dict) };
    W.__fbShipBayDict = clone(dict);
    try { W.eval(vSrc); W.__R42go(JSON.stringify(voy), vkey, md); } catch (er) { errs.push('THROW ' + er.message); }
    await sleep(350);
    const d = W.document;
    const click = async (b, ms = 300) => { if (b) { b.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await sleep(ms); /* 4.29-03: 다른 컨 후보를 누르면 «이 컨으로 처리합니까» 확인 창이 뜬다 — 확인 단추까지 눌러 종전과 같은 흐름으로 잇는다 */ const _md = [...W.document.querySelectorAll('div.fixed.inset-0')].filter((x) => /이 컨으로 처리합니까/.test(x.textContent || '')).slice(-1)[0]; const _cf = _md ? [..._md.querySelectorAll('button')].find((x) => /^(선적확인|양하확인)$/.test(x.textContent.trim())) : null; if (_cf) { _cf.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await sleep(ms); } } return !!b; };
    const txt = (b) => b.textContent.replace(/\s+/g, ' ').trim();
    const btn = (re) => [...d.querySelectorAll('button')].find((b) => re.test(txt(b)) && !b.disabled);
    const until = async (fn, ms = 4000) => { const end = Date.now() + ms; let v = fn(); while (!v && Date.now() < end) { await sleep(60); v = fn(); } return v; };
    const tab = async (re) => click(await until(() => [...d.querySelectorAll('button[role="tab"]')].find((b) => re.test(b.textContent))), 350);
    const groupBtn = (center) => [...d.querySelectorAll('button')].find((b) => { const m = txt(b).match(/^B([\d·]+)/); return m && m[1].split('·').map(Number).includes(center) && /남은 컨/.test(txt(b)); });
    const chips = () => [...d.querySelectorAll('button')].map(txt).filter((s) => /^(풀|엠티|리퍼|일반|40피트|20피트)부터 \d+$/.test(s));
    const firstCard = () => { const c = d.querySelector('[data-gw-card]'); return c ? { cn: c.getAttribute('data-gw-cn'), pos: c.getAttribute('data-gw-pos') } : null; };
    const refresh = async () => { const v = clone(W.__memdb.voyages[vkey]); v.key = vkey; W.__R42upd(JSON.stringify(v), vkey); await sleep(350); };
    const enter = async (center) => {
      await tab(/작업 시작/);
      await click(await until(() => btn(/^🤖\s*자동 가이드$/)), 350);
      await until(() => /작업할 베이를 선택하세요/.test(d.body.textContent));
      await click(await until(() => groupBtn(center)), 350);
      const keep = btn(/그대로$/); if (keep) await click(keep, 300);
      await click(await until(() => btn(/^🟠 홀드 [1-9]/)), 450);
      await until(() => firstCard());
    };
    return { W, d, errs, click, btn, until, tab, chips, firstCard, enter, refresh, txt, close: () => { try { W.close(); } catch (er) { /* 창 닫기 */ } } };
  };

  //  ① 03:58 18홀드 — 칩 «풀부터 F / 엠티부터 E»(독립 셈: 02단 17번 베이 풀·엠티)
  {
    const want = lowestPairs('03:58:00', 18, 17);
    const S = await open(voyAt('03:58:00'));
    await S.enter(18);
    const ch = S.chips(), c0 = S.firstCard();
    ok(`① STMJ 2664W 03:58 18홀드(가장 낮은 남은 단 ${String(want.t0).padStart(2, '0')} — 풀 ${want.F}쌍·엠티 ${want.E}쌍) → 칩 [${ch.join(' · ')}] · 첫 카드 ${c0 && c0.cn} ${c0 && c0.pos}`,
      want.F > 0 && want.E > 0 && ch.includes(`풀부터 ${want.F}`) && ch.includes(`엠티부터 ${want.E}`) && !S.errs.length,
      JSON.stringify({ want, ch, c0, errs: S.errs.slice(0, 3) }));
    //  ② [풀부터 N] → 첫 카드가 풀(크레인이 실제로 실은 순서 — 03:58~04:09 풀 트윈 3쌍)
    await S.click(S.btn(/^풀부터 \d+$/), 450);
    const c1 = S.firstCard(), fe1 = c1 && E[c1.cn] ? E[c1.cn].fe : '?';
    const pref = S.btn(/우선 중$/) || [...S.d.querySelectorAll('span')].find((x) => /^풀 우선 중$/.test(S.txt(x)));
    ok(`② [풀부터] → 첫 카드 ${c1 && c1.cn} ${c1 && c1.pos} (${fe1}) · «풀 우선 중» ${!!pref} · 같은 02단`,
      fe1 === 'F' && !!pref && c1 && /-02$/.test(c1.pos) && !S.errs.length, JSON.stringify({ c1, fe1, errs: S.errs.slice(0, 3) }));
    S.close();
  }
  //  ③ 06:21 26홀드 — 04단 엠티 트윈과 26-xx-06 풀 45 가 함께 «지금 할 수 있는» 칸(아래가 다 실림) → 칩 둘 다 뜬다
  {
    const S = await open(voyAt('06:21:00'));
    await S.enter(26);
    const ch = S.chips();
    //  독립 셈 — 남은 홀드 중 아래(같은 열 낮은 티어)가 다 실린 칸: 풀 = 26번 45 풀, 엠티 = 25번 앞 베이 04단 엠티
    const cut = KST('06:21:00');
    const left = Object.keys(E).filter((cn) => centerOf(E[cn].bay) === 26 && parseInt(E[cn].tier, 10) < 80 && !(CA[cn] && CA[cn].at <= cut));
    const rowOf = (cn) => E[cn].row, tierOf = (cn) => parseInt(E[cn].tier, 10), bayOf = (cn) => parseInt(E[cn].bay, 10);
    const free = left.filter((cn) => !left.some((o) => o !== cn && rowOf(o) === rowOf(cn) && tierOf(o) < tierOf(cn) && (bayOf(o) === bayOf(cn) || bayOf(o) % 2 === 0 || bayOf(cn) % 2 === 0)));
    const nF = free.filter((cn) => E[cn].fe === 'F').length;
    const nE = free.filter((cn) => E[cn].fe === 'E' && bayOf(cn) !== 27).length;   // 트윈 한 장 = 앞 25번 한 대
    ok(`③ 06:21 26홀드 → 칩 [${ch.join(' · ')}] (독립 셈 풀 ${nF} · 엠티 ${nE}쌍)`,
      nF > 0 && nE > 0 && ch.includes(`풀부터 ${nF}`) && ch.includes(`엠티부터 ${nE}`) && !S.errs.length, JSON.stringify({ ch, nF, nE, errs: S.errs.slice(0, 3) }));
    S.close();
  }
  //  ④ 판정 한 벌 — 양하(기본 'above')는 종전 그대로 · 선적('below')은 아래 칸 먼저
  {
    const S = await open(voyAt('03:58:00'));
    const GQ = S.W.__GQ;
    const mk = (bay, row, tier, fe) => ({ main: { cn: `T${bay}${row}${tier}`, bay: String(bay).padStart(2, '0'), row, tier, fe, iso: '22G1' }, twin: null });
    const q = [mk(17, '01', '02', 'F'), mk(17, '01', '04', 'E'), mk(17, '03', '02', 'E')];
    const up = GQ.availableCardsOf(q).map((c) => c.main.cn), upA = GQ.availableCardsOf(q, 'above').map((c) => c.main.cn), dn = GQ.availableCardsOf(q, 'below').map((c) => c.main.cn);
    ok(`④ availableCardsOf — 기본·'above'(양하) [${up}] = [${upA}] (위 칸 0104 와 옆 0302) · 'below'(선적) [${dn}] (아래 칸 0102 와 옆 0302)`,
      up.join() === 'T170104,T170302' && upA.join() === up.join() && dn.join() === 'T170102,T170302', JSON.stringify({ up, upA, dn }));
    S.close();
  }
  //  ⑤ 양하는 종전 판정(위에 남은 컨이 없는 칸) 그대로 — OBWH 2763E 양하 B5·6·7 홀드 첫 화면: 맨 위 칸에 20·40 이 섞여 «40피트부터 n · 20피트부터 m»(맨 아래 칸은 20 뿐이라 선적 판정이면 40 칩이 없다)
  {
    const FO = fx('work42502_obwh.json'), ED = FO.discharge.ediContainers;
    //  데크를 먼저 다 내린 상태(양하 홀드는 데크가 끝나야 열린다) — B5·6·7 데크 전부 완료
    const deckDone = {}; let t0 = Date.parse('2026-10-15T01:00:00+09:00');
    for (const cn of Object.keys(ED)) if (centerOf(ED[cn].bay) === 6 && parseInt(ED[cn].tier, 10) >= 80) deckDone[cn] = { by: '연막', at: (t0 += 60000), equip: '3호기' };
    const v = { key: FO.key, info: clone(FO.info), discharge: { ...clone(FO.discharge), completed: deckDone, xraySeals: {} }, loading: clone(FO.loading) };
    const hold6 = Object.keys(ED).filter((cn) => centerOf(ED[cn].bay) === 6 && parseInt(ED[cn].tier, 10) < 80);
    const sameStack = (a, b) => { if (ED[a].row !== ED[b].row) return false; const x = parseInt(ED[a].bay, 10), y = parseInt(ED[b].bay, 10); return x === y || x % 2 === 0 || y % 2 === 0; };
    const top = hold6.filter((cn) => !hold6.some((o) => o !== cn && sameStack(o, cn) && parseInt(ED[o].tier, 10) > parseInt(ED[cn].tier, 10)));
    const bot = hold6.filter((cn) => !hold6.some((o) => o !== cn && sameStack(o, cn) && parseInt(ED[o].tier, 10) < parseInt(ED[cn].tier, 10)));
    const is40 = (cn) => !/^2/.test(String(ED[cn].iso || ''));
    const top40 = top.filter(is40).length, bot40 = bot.filter(is40).length;
    const S = await open(v, 'discharge', FO.shipDict, FO.key);
    await S.tab(/작업 시작/);
    await S.click(await S.until(() => S.btn(/^🤖\s*자동 가이드$/)), 350);
    await S.until(() => /작업할 베이를 선택하세요/.test(S.d.body.textContent));
    await S.click(await S.until(() => [...S.d.querySelectorAll('button')].find((b) => { const m = S.txt(b).match(/^B([\d·]+)/); return m && m[1].split('·').map(Number).includes(6) && /남은 컨/.test(S.txt(b)); })), 350);
    const keep = S.btn(/그대로$/); if (keep) await S.click(keep, 300);
    await S.click(await S.until(() => S.btn(/^🟠 홀드 [1-9]/)), 450);
    await S.until(() => S.firstCard());
    const ch = S.chips(), c5 = S.firstCard();
    ok(`⑤ 양하 OBWH 2763E B5·6·7 홀드 첫 화면 → 칩 [${ch.join(' · ')}] (독립 셈 — 맨 위 칸 40 ${top40}대·20 있음 · 맨 아래 칸 40 ${bot40}대) — 양하는 위 칸 기준 그대로`,
      !!c5 && top40 > 0 && bot40 === 0 && ch.includes(`40피트부터 ${top40}`) && ch.some((x) => /^20피트부터 \d+$/.test(x)) && !S.errs.length, JSON.stringify({ c5, ch, top40, bot40, errs: S.errs.slice(0, 3) }));
    S.close();
  }
  //  ⑥ 선적 3대 연속 흐름 감지가 다시 돈다 — 03:58 18홀드에서 크레인이 실제로 실은 풀 트윈 셋(1019·7647·4835 — EDI 순번 오름차순 아님)을 «다음 예정» 줄로 올려 확인하면 «일반 우선 중»
  {
    const S = await open(voyAt('03:58:00'));
    await S.enter(18);
    const crane = ['SEKU1731019', 'SKLU2427647', 'SKLU1414835'];
    const steps = [];
    for (const cn of crane) {
      const mate = (c) => c && (c.cn === cn || [...S.d.querySelectorAll('[data-gw-card]')].some((x) => x.getAttribute('data-gw-cn') === cn));
      if (!mate(S.firstCard())) {
        const row = [...S.d.querySelectorAll('[data-gw-next-cn]')].find((b) => b.getAttribute('data-gw-next-cn') === cn || b.getAttribute('data-gw-next-twin') === cn);
        await S.click(row, 350);
      }
      const front = S.firstCard();
      const go = await S.until(() => S.btn(/^트윈 한 번에 선적확인$|^선적확인$/));
      await S.click(go, 450);
      const yes = S.btn(/^(예|확인|그래도 넣는다)$/); if (yes) await S.click(yes, 350);
      await S.refresh();
      steps.push(`${front && front.cn}→${Object.keys(S.W.__memdb.voyages[vk].loading.completed || {}).length}`);
    }
    const done = Object.keys(S.W.__memdb.voyages[vk].loading.completed || {});
    const pref = [...S.d.querySelectorAll('span')].map(S.txt).find((x) => /우선 중$/.test(x));
    ok(`⑥ 선적 풀 트윈 셋을 크레인 순서대로(${steps.join(' · ')}) 확인 → 완료 ${done.length}대 · 칩 줄 «${pref || '없음'}» (3대 연속 흐름 감지 — 종전엔 칩이 없어 멈춤)`,
      crane.every((cn) => done.includes(cn)) && done.length === 6 && pref === '일반 우선 중' && !S.errs.length, JSON.stringify({ steps, done, pref, errs: S.errs.slice(0, 3) }));
    S.close();
  }
};

//  단독 실행 — node tools/regress_r42_fork.cjs <저장소 루트>
if (require.main === module) {
  process.env.TZ = 'Asia/Seoul';
  const ROOT = path.resolve(process.argv[2] || process.cwd());
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'r42_'));
  let n = 0, bad = 0;
  const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
  const head = (t, f) => { console.log(`■ ${t}`); console.log(`  (출처 ${f})`); };
  const fx = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures', f), 'utf8'));
  module.exports({ ROOT, TMP, ok, head, fx, stub: './tools/stub_fbdb_mem.js' })
    .then(() => { console.log(`\nR42 ${n - bad}/${n}`); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ } process.exit(bad ? 1 : 0); })
    .catch((e) => { console.error('✗ R42 오류', e && e.stack || e); process.exit(1); });
}
