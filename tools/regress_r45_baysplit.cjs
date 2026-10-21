// 회귀 기준표 R45 — 자동 가이드 «23번 / (24)25번» 나눠 고르기(4.42): 베이 선택 칸·작업 중 장 칩 줄의 단추를 누르면 그 베이 컨이 한 대씩 먼저 나온다.
//   근거 — 검수사 2026-10-21 07:20 «ATPR 24번베이 홀드에서 자동가이드로 트윈 작업을 하다가 싱글 작업으로 전환을 하는데 앱은 23번 베이만을 이야기 합니다.
//         실제로는 25번 베이를 작업하고 있는 상황인데 25번 베이로 옮기려도 해도 방법이 없어 … 베이선택을 23번베이 (24)25번베이로 분리해서 선택할수 있게» · 07:33 «네».
//   실소스 항차 화면(VoyagePage)을 jsdom 에서 그리고 검수원 손 그대로 누른다. Firebase 는 메모리 스텁(쓰기 없음).
//   자료 — tools/fixtures/mirgoto_atpr2646e.json(보관소 ATPR 2646E 양하 · 완료 at 으로 그 시각을 만든다 · 사전 ATPR).
//   ⚠ 기대값은 코드에서 베끼지 않는다 — 그 시각 그 베이에 남은 컨(자리)은 이 파일이 EDI 행과 완료 기록에서 직접 센다. 베이 이름은 사전 baysSummary 키(023 단독 · 025 pairEven 24).
//   실행: smoke_regress.cjs 안에서 — require('./regress_r45_baysplit.cjs')({ ROOT, TMP, ok, head, fx, stub }) · 단독 — node tools/regress_r45_baysplit.cjs <저장소 루트>
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async function r45({ ROOT, TMP, ok, head, fx, stub }) {
  head('R45 자동 가이드 «23번 / (24)25번» 나눠 고르기 — 베이 선택 칸 · 작업 중 장 칩 줄 → 그 베이 컨부터(ATPR 2646E 24번 홀드)',
    '검수사 2026-10-21 07:20 «베이선택을 23번베이 (24)25번베이로 분리해서 선택할수 있게 만들어야 합니다. 1(2)3 베이라면 1 번베이 (2)3번 베이로 분리» · 07:33 «네»');
  const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const FX = fx('mirgoto_atpr2646e.json');
  const VK = FX.voyageKey, E = FX.voyage.discharge.ediContainers, C = FX.voyage.discharge.completed;
  const at = (hm) => new Date(`2026-10-20T${hm}:00+09:00`).getTime();
  const voyAt = (t) => { const v = { key: VK, info: clone(FX.voyage.info), discharge: clone(FX.voyage.discharge), photoIndex: {}, reports: {} };
    for (const k of Object.keys(v.info)) if (/Done|depart|workEnd|archiv/i.test(k)) delete v.info[k];
    const c = v.discharge.completed || {}; for (const k of Object.keys(c)) if (!(c[k].at <= t)) delete c[k];
    return v; };
  const leftPos = (t, bay, tier) => Object.values(E).filter((r) => parseInt(r.bay, 10) === bay && !(C[r.cn] && C[r.cn].at <= t)
    && (tier === 'deck' ? parseInt(r.tier, 10) >= 80 : tier === 'hold' ? parseInt(r.tier, 10) < 80 : true)).map((r) => `${parseInt(r.bay, 10)}-${r.row}-${r.tier}`);

  const eF = path.join(TMP, 'r45.jsx'), oF = path.join(TMP, 'r45.js');
  fs.writeFileSync(eF, [
    `import React from "${ROOT}/node_modules/react/index.js";`,
    `import { createRoot } from "${ROOT}/node_modules/react-dom/client.js";`,
    `import VoyagePage from "${ROOT}/src/pages/VoyagePage.jsx";`,
    `let root = null;`,
    `window.__R45go = (json, k, m) => { if (!root) root = createRoot(document.getElementById('root')); root.render(React.createElement(VoyagePage, { voyageKey: k, voyage: JSON.parse(json), inspector: '연막', inspectors: [], portMisData: {}, pilotForecast: {}, onGoHome() {}, onModeChange() {}, initModeOverride: m || 'discharge' })); };`,
  ].join('\n'));
  execSync(`npx esbuild "${eF}" --bundle --loader:.jsx=jsx --loader:.js=jsx --loader:.png=dataurl --loader:.jpg=dataurl --loader:.webp=dataurl --loader:.json=json --jsx=automatic --external:fs --external:path --external:url --alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --alias:pdfjs-dist/build/pdf=${ROOT}/tools/stub_pdfjs.js --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${oF}"`, { cwd: ROOT, stdio: 'pipe' });
  const vSrc = fs.readFileSync(oF, 'utf8');

  const open = async (t, { dict = FX.dict, noShip = false, other = null } = {}) => {
    const v = other ? other.v : voyAt(t);
    const vk = other ? other.key : VK, dk = other ? other.dictKey : 'ATPR', md = other ? other.mode : 'discharge';
    if (other) dict = other.dict;
    if (noShip) { v.info.vsl = 'ZQXW'; v.info.vslFull = 'NO DICT TEST'; v.info.imo = ''; v.info.callsign = ''; }   // ④ 어느 사전에도 없는 배(코드 내장 사전 포함)
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
    const W = dom.window, errs = [], notes = [];
    W.addEventListener('error', (ev) => errs.push(ev.message)); W.console.warn = () => {}; W.console.log = () => {};
    W.matchMedia = W.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    W.scrollTo = () => {}; W.HTMLElement.prototype.scrollIntoView = function () {};
    W.global = W; W.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } }; W.alert = () => {};
    W.localStorage.setItem('gm_equip_no', '4호기');
    W.localStorage.setItem('master_active_inspector_v1', '연막');
    W.addEventListener('writeNotice', (e) => notes.push(String((e.detail && e.detail.message) || '')));
    W.__memdb = { voyages: { [vk]: clone(v) }, ship_bay_dict_v3: dict ? { [dk]: clone(dict) } : {} };
    W.__fbShipBayDict = dict ? { [dk]: clone(dict) } : {};
    try { W.eval(vSrc); W.__R45go(JSON.stringify(v), vk, md); } catch (er) { errs.push('THROW ' + er.message); }
    await sleep(450);
    const d = W.document, txt = (b) => b.textContent.replace(/\s+/g, ' ').trim();
    const click = async (b, ms = 350) => { if (b) { b.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await sleep(ms); } return !!b; };
    const btn = (re) => [...d.querySelectorAll('button')].find((b) => re.test(txt(b)) && !b.disabled);
    const until = async (fn, ms = 4000) => { const end = Date.now() + ms; let x = fn(); while (!x && Date.now() < end) { await sleep(60); x = fn(); } return x; };
    const cards = () => [...d.querySelectorAll('[data-gw-card]')].map((c) => c.getAttribute('data-gw-pos'));
    const curChip = () => { const x = d.querySelector('[data-gw-groups] [data-gw-group][data-gw-cur="1"]'); return x ? txt(x) : ''; };
    const band = () => (txt(d.body).match(/(\d+)번 베이 먼저 중/) || [])[1] || '';
    const bandAll = () => (txt(d.body).match(/(\(\d+\)\d+번|\d+번) 베이 먼저 중/) || [])[1] || '';
    const keepGang = async () => { const keep = await until(() => btn(/그대로$/), 1200); if (keep) await click(keep, 500); };
    const toGrid = async () => { await click(await until(() => [...d.querySelectorAll('button[role="tab"]')].find((b) => /작업 시작/.test(b.textContent))), 400); await click(await until(() => btn(/^🤖\s*자동 가이드$/)), 400);
      const bs = btn(/우현/); if (bs) await click(bs, 400); return !!(await until(() => /작업할 베이를 선택하세요/.test(txt(d.body)))); };
    const splitBtns = (sel) => [...d.querySelectorAll(`${sel} [data-gw-split]`)];
    return { W, d, errs, notes, txt, click, btn, until, cards, curChip, band, bandAll, keepGang, toGrid, splitBtns, close: () => W.close() };
  };
  const t = at('13:40');
  const p25 = leftPos(t, 25, 'hold'), p23 = leftPos(t, 23, 'hold'), p24 = leftPos(t, 24, 'hold');

  //  ① 베이 선택 칸 — B23·24·25 밑에 «23번 N» «(24)25번 M»(그 시각 남은 대수 — EDI·완료에서 직접 셈) · 한 쪽뿐인 장(B27·28·29 — 이 항차엔 27번 컨이 없어 (28)29 쪽만)은 단추 없음
  { const S = await open(t);
    const g = await S.toGrid();
    const sb = S.splitBtns('[data-gw-split-grid="24"]').map(S.txt);
    const want = [`23번 ${leftPos(t, 23).length}`, `(24)25번 ${leftPos(t, 24).length + leftPos(t, 25).length}`];
    ok(`①-1 13:40 베이 선택 칸 B23·24·25 밑 단추 ${sb.join(' · ') || '없음'} = ${want.join(' · ')}`, g && sb.join('|') === want.join('|'), JSON.stringify({ g, sb, want }));
    ok('①-2 한 쪽뿐인 장(B27·28·29 — 27번 컨 없음 · (28)29 쪽만)은 나눠 고르기 단추가 없다', !S.d.querySelector('[data-gw-split-grid="28"]'));
    //  ② 칸에서 «(24)25번» → B23·24·25 홀드 · 첫 카드 25번 홀드 남은 자리(13:40 은 24번 40피트가 다 끝나 25번만) · «25번 베이 먼저 중» · 알림에 «미르가» 없음
    await S.click(S.splitBtns('[data-gw-split-grid="24"]').find((b) => /^\(24\)25번/.test(S.txt(b))), 400); await S.keepGang();
    await S.until(() => S.cards().length > 0 && S.band() === '25', 4000); await sleep(500);
    const c = S.cards();
    ok(`② 칸에서 «(24)25번» → 장 칩 B23·24·25 홀드 · 첫 카드 25번 베이(${c[0] || '-'}) · 띠 «${S.bandAll()} 베이 먼저 중»(칩 이름과 같게) · 알림 «양하 B23·24·25 홀드 — (24)25번 베이 카드부터.»(«미르가» 없음)`,
      /^B23·24·25 홀드/.test(S.curChip()) && !!c[0] && p25.includes(c[0]) && S.bandAll() === '(24)25번' && S.notes.some((m) => m === '양하 B23·24·25 홀드 — (24)25번 베이 카드부터.') && !S.notes.some((m) => /미르가/.test(m)) && !S.errs.length,
      JSON.stringify({ chip: S.curChip(), c: c.slice(0, 3), band: S.band(), notes: S.notes, errs: S.errs.slice(0, 2) }));
    S.close(); }

  //  ③ 작업 중 — 장 단추로 B23·24·25 홀드에 들어가면 첫 카드는 23번(종전 그대로) · 장 칩 줄 지금 장 옆에 «23번» «(24)25번» → «(24)25번» 누르면 25번부터 · 다시 누르면 풀려 23번으로
  { const S = await open(t);
    await S.toGrid();
    await S.click([...S.d.querySelectorAll('button')].find((b) => /^B23·24·25/.test(S.txt(b))), 400); await S.keepGang();
    await S.click(await S.until(() => [...S.d.querySelectorAll('button')].find((b) => /(데크|홀드)\s*[1-9]\d*개/.test(S.txt(b)) && !b.disabled)), 600);
    await S.until(() => S.cards().length > 0);
    const c0 = S.cards();
    const chips = S.splitBtns('[data-gw-groups]').map(S.txt);
    ok(`③-1 B23·24·25 홀드 첫 카드 ${c0[0] || '-'}(23번 — 종전 그대로) · 장 칩 줄 단추 ${chips.join(' · ') || '없음'}`,
      !!c0[0] && p23.includes(c0[0]) && chips.length === 2 && /^23번 \d+$/.test(chips[0]) && /^\(24\)25번 \d+$/.test(chips[1]), JSON.stringify({ c0: c0.slice(0, 2), chips }));
    await S.click(S.splitBtns('[data-gw-groups]').find((b) => /^\(24\)25번/.test(S.txt(b))), 400);
    await S.until(() => S.band() === '25', 4000); await sleep(400);
    const c1 = S.cards(); const on = S.d.querySelector('[data-gw-groups] [data-gw-split-on="1"]');
    ok(`③-2 «(24)25번» → 첫 카드 25번 베이(${c1[0] || '-'}) · 단추 «먼저 ✓» · 띠 «${S.bandAll()} 베이 먼저 중»`, !!c1[0] && p25.includes(c1[0]) && !!on && /^\(24\)25번 먼저 ✓$/.test(S.txt(on)) && S.bandAll() === '(24)25번',
      JSON.stringify({ c1: c1.slice(0, 2), on: on && S.txt(on), band: S.band() }));
    await S.click(S.splitBtns('[data-gw-groups]').find((b) => /^\(24\)25번/.test(S.txt(b))), 600);
    const c2 = S.cards();
    ok(`③-3 다시 누르면 풀린다 — «먼저 중» 띠 없음 · 첫 카드 다시 23번(${c2[0] || '-'})`, !S.band() && !!c2[0] && p23.includes(c2[0]) && !S.d.querySelector('[data-gw-groups] [data-gw-split-on="1"]'),
      JSON.stringify({ c2: c2.slice(0, 2), band: S.band() }));
    await S.click(S.splitBtns('[data-gw-groups]').find((b) => /^23번/.test(S.txt(b))), 400);
    await S.until(() => S.band() === '23', 3000); await sleep(300);
    const c3 = S.cards();
    ok(`③-4 «23번» → 첫 카드 23번(${c3[0] || '-'}) · «23번 베이 먼저 중» · 오류 0`, !!c3[0] && p23.includes(c3[0]) && S.band() === '23' && !S.errs.length, JSON.stringify({ c3: c3.slice(0, 2), band: S.band(), errs: S.errs.slice(0, 2) }));
    S.close(); }

  //  ④ 사전이 없는 배 — 나눠 고르기 단추가 하나도 없다(없는 베이를 지어내지 않는다). ATPR 은 코드에 내장된 사전도 있어 배 이름을 없는 배로 바꿔 본다.
  { const S = await open(t, { dict: null, noShip: true });
    await S.toGrid();
    ok('④ 베이사전이 없으면 베이 선택 칸에 나눠 고르기 단추가 없다', S.splitBtns('body').length === 0 && !S.errs.length, JSON.stringify({ n: S.splitBtns('body').length, errs: S.errs.slice(0, 2) }));
    S.close(); }
  void p24;

  //  ⑤ «(24)25번» 은 그 쪽 전부(24 40피트 + 25 20피트)를 먼저 — 11:00 홀드 시작엔 24번 40피트 2대가 위에 있어 그것부터(1.76-05 «40피트 먼저»), 23번은 뒤로.
  //    기준 — 검수원이 실제로 내린 순서(완료 at): 11:00 뒤 이 장 홀드 처음 두 대 = 24번 40피트. 감사 2026-10-21 — 25번 하나만 당기면 첫 8장이 25번 20피트, 40피트가 밀렸다.
  { const t11 = at('11:00');
    const real = Object.values(E).filter((r) => [23, 24, 25].includes(parseInt(r.bay, 10)) && parseInt(r.tier, 10) < 80 && C[r.cn] && C[r.cn].at > t11)
      .sort((a, b) => C[a.cn].at - C[b.cn].at || a.cn.localeCompare(b.cn)).map((r) => `${parseInt(r.bay, 10)}-${r.row}-${r.tier}`);
    const S = await open(t11);
    await S.toGrid();
    await S.click(S.splitBtns('[data-gw-split-grid="24"]').find((b) => /^\(24\)25번/.test(S.txt(b))), 400); await S.keepGang();
    await S.until(() => S.cards().length > 0 && S.bandAll() === '(24)25번', 4000); await sleep(500);
    const c = S.cards();   //  화면 카드는 지금 한 장 — 그 뒤 순서(25번이 23번보다 앞)는 smoke_baysplit442 가 큐로 잰다
    ok(`⑤ 11:00 칸에서 «(24)25번» → 첫 카드 ${c[0] || '-'} = 실제 처음 내린 24번 40피트 ${real[0]} · «(24)25번 베이 먼저 중»(쪽 전부 — 25번만이 아님)`,
      c[0] === real[0] && /^24-/.test(real[0]) && S.bandAll() === '(24)25번' && !S.errs.length,
      JSON.stringify({ c: c.slice(0, 3), real: real.slice(0, 4), band: S.bandAll(), errs: S.errs.slice(0, 2) }));
    S.close(); }

  //  ⑥ 작업 중 칩은 지금 단 그대로 — OBWH 2762W 선적 17:00 B9·10·11 데크(실제로 17:06·17:08 에 10-08-86·10-07-86 데크를 실었다)에서 «(10)11번» 을 눌러도 데크.
  //    감사 2026-10-21 — 칩이 단을 안 넘기면 미르 규칙(선적은 그 베이에 홀드가 남았으면 홀드)이 홀드로 옮겨 11번 홀드 카드가 첫 카드로 나왔다.
  { const OB = fx('closingedi_obwh2762.json'), DI = fx('baygrid_dicts.json').OBWH;
    const day = '2026-10-09', t17 = new Date(`${day}T17:00:00+09:00`).getTime();
    const ov = { key: 'OBWH_2762W', info: clone(OB.info), loading: clone(OB.loading), discharge: { ediContainers: {}, completed: {}, records: {} }, photoIndex: {}, reports: {} };
    for (const k of Object.keys(ov.info)) if (/Done|depart|workEnd|archiv/i.test(k)) delete ov.info[k];
    const lc = ov.loading.completed || {}; for (const k of Object.keys(lc)) if (!(lc[k].at <= t17)) delete lc[k];
    const S = await open(t17, { other: { v: ov, key: 'OBWH_2762W', dictKey: 'OBWH', dict: DI, mode: 'loading' } });
    const g = await S.toGrid();
    await S.click(await S.until(() => [...S.d.querySelectorAll('button')].find((b) => /^B0?9·10·11/.test(S.txt(b)) && !b.disabled)), 400); await S.keepGang();
    await S.click(await S.until(() => [...S.d.querySelectorAll('button')].find((b) => /데크\s*[1-9]\d*개/.test(S.txt(b)) && !b.disabled)), 600);
    await S.until(() => S.cards().length > 0);
    const chips = S.splitBtns('[data-gw-groups]').map(S.txt);
    const b0 = S.curChip();
    await S.click(S.splitBtns('[data-gw-groups]').find((b) => /^\(10\)11번/.test(S.txt(b))), 400);
    await S.until(() => !!S.bandAll(), 4000); await sleep(500);
    const c = S.cards(), on = S.d.querySelector('[data-gw-groups] [data-gw-split-on="1"]');
    ok(`⑥ OBWH 2762W 선적 17:00 B9·10·11 데크 칩 ${chips.join(' · ') || '없음'} → «(10)11번» 눌러도 데크(${S.curChip()}) · 첫 카드 ${c[0] || '-'}(10·11번 데크) · «먼저 ✓»`,
      g && /데크/.test(b0) && /데크/.test(S.curChip()) && !!c[0] && /^1[01]-\d+-(8\d|9\d)$/.test(c[0]) && !!on && /먼저 ✓$/.test(S.txt(on)) && !S.errs.length,
      JSON.stringify({ g, b0, chip: S.curChip(), chips, c: c.slice(0, 3), on: on && S.txt(on), band: S.bandAll(), notes: S.notes.slice(-2), errs: S.errs.slice(0, 2) }));
    S.close(); }
};

if (require.main === module) {
  process.env.TZ = 'Asia/Seoul';
  const ROOT = path.resolve(process.argv[2] || process.cwd());
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'r45_'));
  let n = 0, bad = 0;
  const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
  const head = (t, f) => { console.log(`■ ${t}`); console.log(`  (출처 ${f})`); };
  const fx = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures', f), 'utf8'));
  module.exports({ ROOT, TMP, ok, head, fx, stub: './tools/stub_fbdb_mem.js' })
    .then(() => { console.log(`\nR45 ${n - bad}/${n}`); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ } process.exit(bad ? 1 : 0); })
    .catch((e) => { console.error('✗ R45 오류', e && e.stack || e); process.exit(1); });
}
