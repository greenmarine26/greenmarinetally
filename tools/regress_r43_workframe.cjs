// 회귀 기준표 R43 — 작업 화면 한 화면 고정(4.27): 기존 자동·기존 수동 트윈이 폰 한 화면(맨 위 한 줄 · 위 칸 카드+확인 · 아래 칸 변경 단추) · 수동은 앞·뒤 조회창 → [확인] → 카드
//   근거 — 검수사 2026-10-15 07:45 «자동이나 수동이나 한 화면에 나와야 합니다. 선적 또는 양하 버튼까지 스크롤 되게 하면 안됩니다.» · 08:36 «기존 자동과 수동 화면의 크기는 베이뷰 자동화면 크기로» ·
//          08:39 «상단 한줄 베이표시 (예를 들면 23(24)25 홀드/데크 맨오른쪽에는 전화면으로» · 08:43 «상단엔 카드 앞뒤 두장과 일괄선적(양하)버튼 하단엔 변경사항» ·
//          08:46 «수동은 카드 두장 전에 조회창 앞뒤 두개를 보여주고 2개다 컨번을 입력하면 카드 두장을 보여주고 자동과 같은 화면으로 전환» ·
//          08:52 «베이를 눌러서 선적 하는 방법으로»(📍 위치 틀림 = 위치 수정 창) · 09:07 «2개 다 넣고 확인 버튼을 누르면 다음으로 넣어가게 해주세요 넣자마자 넘어가면 잘못입력했을 경우 수정을 할수가 없으니».
//   실제 크로뮴 · 빌드 CSS(index.html 이 부르는 assets/index-*.css) · 폰 크기 · 글자 보통/크게. Firebase 는 메모리 스텁(tools/stub_fbdb_mem.js — 실제 쓰기 없음).
//   ⚠ 기대값은 코드에서 베끼지 않는다 — «한 화면» 은 화면에서 잰 자리, 짝·자리·대수는 픽스처 원자료(보관소 OBWH 2763E·2764W 사본 — R37·R41 과 같은 것)를 이 파일이 직접 읽는다.
//   실행: smoke_regress.cjs 안에서 — require('./regress_r43_workframe.cjs')({ ROOT, TMP, ok, head, fx, stub })
//         단독 — node tools/regress_r43_workframe.cjs <저장소 루트>
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } });

module.exports = async function r43({ ROOT, TMP, ok, head, fx, stub, css = '' }) {
  head('R43 작업 화면 한 화면 고정 — 기존 자동·수동 트윈 · 맨 위 한 줄 · 위 칸 카드+확인 · 아래 칸 변경 단추 · 수동 [확인] 전엔 안 넘어감 · 📍 위치 틀림 = 위치 수정 창 (4.27)',
    '검수사 2026-10-15 07:45 «선적 또는 양하 버튼까지 스크롤 되게 하면 안됩니다» · 08:43 «상단엔 카드 앞뒤 두장과 일괄선적(양하)버튼 하단엔 변경사항» · 09:07 «2개 다 넣고 확인 버튼을 누르면 다음으로»');
  const idx = fs.existsSync(path.join(ROOT, 'index.html')) ? fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8') : '';
  const cssRel = (idx.match(/href="\.\/(assets\/index-[\w-]+\.css)"/) || [])[1];
  const cssPath = css || process.env.R43_CSS || (cssRel ? path.join(ROOT, cssRel) : '');
  if (!cssPath || !fs.existsSync(cssPath)) { ok('빌드된 CSS(assets/index-*.css)가 있다 — 없으면 화면을 잴 수 없다', false, cssRel || '없음'); return; }
  let pw;
  try { pw = require(path.join(ROOT, 'node_modules/playwright')); } catch (e) { try { pw = require('playwright'); } catch (e2) { pw = null; } }
  if (!pw || !CHROME) { ok('playwright·크로뮴이 있다 — 모양을 잴 수 없으면 올리지 않는다', false, `${!!pw} · ${CHROME || '없음'}`); return; }

  const FX = fx('work42502_obwh.json');
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const center = (b) => { const n = parseInt(b, 10); return n % 2 === 0 ? n : (n % 4 === 1 ? n + 1 : n - 1); };
  const info = clone(FX.info); for (const k of Object.keys(info)) if (/Done|depart|workEnd/i.test(k)) delete info[k];
  const base = { key: FX.key, info, discharge: { ...clone(FX.discharge), completed: {}, xraySeals: {} }, loading: { ...clone(FX.loading), completed: {} } };
  const ED = FX.discharge.ediContainers, EL = FX.loading.ediContainers;
  const is20 = (c) => /^2/.test(String((c && c.iso) || ''));
  //  수동 앞 컨 — 선적 B9 데크 20피트(SPSU2010140 · 원자료 짝 = 11번 베이 같은 열·단) · 양하는 원자료 홀수 베이 데크 20피트 첫 컨
  const frontL = 'SPSU2010140';
  const frontD = Object.keys(ED).filter((k) => is20(ED[k]) && parseInt(ED[k].bay, 10) % 2 === 1 && parseInt(ED[k].tier, 10) >= 80).sort()[0];
  //  짝 베이 — 묶음 가운데(40) 를 사이에 둔 반대쪽 20 베이(1↔3 · 5↔7 · 9↔11 — 이 배는 4칸 간격 묶음) · 같은 열·단
  const pairBay = (b) => { const n = parseInt(b, 10); return 2 * center(n) - n; };
  const mateOf = (E, cn) => Object.keys(E).find((k) => k !== cn && parseInt(E[k].bay, 10) === pairBay(E[cn].bay) && E[k].row === E[cn].row && E[k].tier === E[cn].tier) || '';
  const mateL = mateOf(EL, frontL), mateD = mateOf(ED, frontD);
  //  40피트 선적 앞 컨 — 원자료 B10 데크 40피트 첫 컨(짝 없음)
  const front40 = Object.keys(EL).filter((k) => !is20(EL[k]) && parseInt(EL[k].bay, 10) % 2 === 0 && parseInt(EL[k].tier, 10) >= 80).sort()[0];
  //  자동 가이드 트윈이 맨 앞에 서게 — 양하 B5·6·7 홀드는 5·7번 04단 이하 20피트 짝만, 선적 B9·10·11 데크는 9·11번 20피트만 남긴다(R37·R41 과 같은 꼴)
  const doneD = Object.keys(ED).filter((x) => center(ED[x].bay) === 6 && !([5, 7].includes(parseInt(ED[x].bay, 10)) && parseInt(ED[x].tier, 10) <= 4));
  const doneL = Object.keys(EL).filter((x) => center(EL[x].bay) === 10 && parseInt(EL[x].tier, 10) >= 80 && ![9, 11].includes(parseInt(EL[x].bay, 10)));

  const e = path.join(TMP, 'r43.jsx'), o = path.join(TMP, 'r43.js');
  fs.writeFileSync(e, [
    `import React from "${ROOT}/node_modules/react/index.js";`,
    `import { createRoot } from "${ROOT}/node_modules/react-dom/client.js";`,
    `import VoyagePage from "${ROOT}/src/pages/VoyagePage.jsx";`,
    `let root = null; const el = (v, key, mode) => React.createElement(VoyagePage, { voyageKey: key, voyage: v, inspector: '연막', inspectors: [], portMisData: {}, pilotForecast: {}, onGoHome() {}, onModeChange() {}, initModeOverride: mode });`,
    `let _mode = 'loading';`,
    `window.__go = (json, key, mode) => { _mode = mode; root = createRoot(document.getElementById('root')); root.render(el(JSON.parse(json), key, mode)); };`,
    //  메모리(원자료)의 지금 값으로 같은 화면을 다시 그린다 — 실제 앱의 구독 갱신과 같은 꼴(상태는 그대로)
    `window.__upd = (key) => { const v = JSON.parse(JSON.stringify(window.__memdb.voyages[key])); v.key = key; root.render(el(v, key, _mode)); };`,
  ].join('\n'));
  execSync(`npx esbuild "${e}" --bundle --format=iife --loader:.jsx=jsx --loader:.js=jsx --loader:.png=dataurl --loader:.json=json --jsx=automatic --external:fs --external:path --external:url --alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --alias:pdfjs-dist/build/pdf=${ROOT}/tools/stub_pdfjs.js --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
  const seed = path.join(TMP, 'r43seed.js');
  //  window.global — 메모리 스텁이 global.__memdb 를 쓴다(브라우저엔 global 이 없다)
  fs.writeFileSync(seed, `window.global = window; window.__memdb = ${JSON.stringify({ voyages: { [FX.key]: base }, ship_bay_dict_v3: FX.shipDict })}; window.__fbShipBayDict = ${JSON.stringify(FX.shipDict)}; window.__BASE = ${JSON.stringify(JSON.stringify(base))}; window.__DONE = ${JSON.stringify({ discharge: doneD, loading: doneL })};`);
  const html = path.join(TMP, 'r43.html');
  fs.writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="file://${cssPath}"></head><body class="bg-ink-950 text-dim-100"><div id="root"></div><script src="file://${seed}"></script><script src="file://${o}"></script></body></html>`);

  const browser = await pw.chromium.launch({ executablePath: CHROME });
  const open = async (w, h, tm, mode, guide) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, timezoneId: 'Asia/Seoul', locale: 'ko-KR' });
    await ctx.route(/firebasedatabase\.app|firebaseio\.com|googleapis\.com|gstatic\.com|google\.com/, (rt) => rt.abort());
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (er) => errs.push(er.message));
    await pg.addInitScript(() => { try { localStorage.setItem('gm_equip_no', '1호기'); localStorage.setItem('master_active_inspector_v1', '연막'); } catch (er) { /* 저장 막힘 */ } });
    await pg.goto('file://' + html);
    await pg.evaluate(({ tm, mode, guide }) => {
      if (tm === 'large') document.documentElement.setAttribute('data-text', 'large');
      const v = JSON.parse(window.__BASE);
      if (guide) { let t = Date.now() - 3600000; for (const cn of window.__DONE[mode]) v[mode].completed[cn] = { by: '연막', at: (t += 60000), equip: '1호기' }; }
      window.__memdb.voyages[v.key] = JSON.parse(JSON.stringify(v));
      window.__go(JSON.stringify(v), v.key, mode);
    }, { tm, mode, guide });
    await pg.waitForTimeout(600);
    const click = async (src, ms = 300) => { const r = await pg.evaluate((s) => { const re = new RegExp(s); const x = [...document.querySelectorAll('button')].find((y) => re.test(y.textContent.replace(/\s+/g, ' ').trim()) && !y.disabled); if (x) x.click(); return !!x; }, src); await pg.waitForTimeout(ms); return r; };
    const sel = async (q, ms = 300) => { const r = await pg.evaluate((s) => { const x = document.querySelector(s); if (x && !x.disabled) { x.click(); return true; } return false; }, q); await pg.waitForTimeout(ms); return r; };
    const upd = async () => { await pg.evaluate((k) => window.__upd(k), FX.key); await pg.waitForTimeout(400); };
    const mem = async (mode) => pg.evaluate(({ k, m }) => { const v = window.__memdb.voyages[k] || {}; return { completed: Object.keys((v[m] || {}).completed || {}), held: (v[m] || {}).held || {} }; }, { k: FX.key, m: mode });
    //  위치 수정 창(PositionEditModal — fixed z-50 · 제목 h2 «위치 수정») 읽기·지금 칸 고르기·닫기
    const modalProbe = async () => pg.evaluate(() => {
      const m = [...document.querySelectorAll('.fixed.inset-0.z-50')].find((x) => { const h = x.querySelector('h2'); return h && /위치 수정/.test(h.textContent); });
      if (!m) return { open: false };
      const t = m.textContent.replace(/\s+/g, ' ');
      return { open: true, cn: ((m.querySelector('.text-base.font-bold.mono') || {}).textContent || '').trim(), also: (t.match(/배정 후 바로 선적확인[^—]*— (켬|끔)/) || [])[0] || '', twinBoth: /\(트윈 둘 다\)/.test(t) };
    });
    //  지금 칸 고르기 — 창이 베이 목록부터 보이면(«선적할 베이를 먼저 선택하세요») 그 컨의 베이 단추(B9 · 남은 N자리)를 먼저 누른다(검수사 «베이를 눌러서»)
    const modalPickSelf = async (bay) => {
      const M = () => [...document.querySelectorAll('.fixed.inset-0.z-50')].find((x) => { const h = x.querySelector('h2'); return h && /위치 수정/.test(h.textContent); });
      await pg.evaluate((bn) => { const m = [...document.querySelectorAll('.fixed.inset-0.z-50')].find((x) => { const h = x.querySelector('h2'); return h && /위치 수정/.test(h.textContent); }); if (!m) return; if ([...m.querySelectorAll('button')].some((x) => /^지금 이 컨이 있는 자리/.test(x.getAttribute('title') || ''))) return; const b = [...m.querySelectorAll('button')].find((x) => (x.querySelector('.mono') || {}).textContent === `B${bn}`); if (b) b.click(); }, parseInt(bay, 10));
      await pg.waitForTimeout(400);
      await pg.evaluate(() => { const m = [...document.querySelectorAll('.fixed.inset-0.z-50')].find((x) => { const h = x.querySelector('h2'); return h && /위치 수정/.test(h.textContent); }); const b = m && [...m.querySelectorAll('button')].find((x) => /^지금 이 컨이 있는 자리/.test(x.getAttribute('title') || '')); if (b) b.click(); });
      await pg.waitForTimeout(500); void M;
    };
    const modalClose = async () => { await pg.evaluate(() => { const m = [...document.querySelectorAll('.fixed.inset-0.z-50')].find((x) => { const h = x.querySelector('h2'); return h && /위치 수정/.test(h.textContent); }); const h = m && m.querySelector('h2'); const b = h && h.parentElement && h.parentElement.parentElement && h.parentElement.parentElement.querySelector(':scope > button'); if (b) b.click(); }); await pg.waitForTimeout(300); };
    await click('^나중에$', 150);
    await pg.evaluate(() => { const t = [...document.querySelectorAll('button[role="tab"]')].find((b) => /작업 시작/.test(b.textContent)); if (t) t.click(); });
    await pg.waitForTimeout(400);
    return { ctx, pg, errs, click, sel, upd, mem, modalProbe, modalPickSelf, modalClose };
  };
  const pickGroup = async (pg, bn, needLeft) => pg.evaluate(({ bn, needLeft }) => { const x = [...document.querySelectorAll('button')].find((y) => { const m = y.textContent.replace(/\s+/g, '').match(/^B([\d·]+)/); return m && m[1].split('·').map(Number).includes(bn) && (!needLeft || /남은/.test(y.textContent)); }); if (x) x.click(); return !!x; }, { bn, needLeft });
  //  수동 → 베이 → 단 → [트윈] (한 화면 틀의 조회창 단계까지)
  const manualIn = async (S, E0, cn) => {
    await S.click('^✋ 수동$', 200);
    await pickGroup(S.pg, parseInt(E0[cn].bay, 10), false); await S.pg.waitForTimeout(300);
    await S.click(parseInt(E0[cn].tier, 10) >= 80 ? '^🔵 데크' : '^🟠 홀드', 400);
    await S.click('트윈$', 400);
  };
  const typeBox = async (S, lab, val) => { await S.pg.fill(`[data-twin-box="${lab}"] input`, val).catch(() => {}); await S.pg.waitForTimeout(500); };
  const manualCards = async (S, mode) => {
    const E0 = mode === 'loading' ? EL : ED, cn = mode === 'loading' ? frontL : frontD;
    await manualIn(S, E0, cn);
    await typeBox(S, '앞', cn.slice(-4));
    await S.sel('[data-twin-mate]', 400);
    await S.sel('[data-twin-go="next"]', 600);
    return cn;
  };
  const guideTwin = async (S, mode) => {
    await S.click('^🤖 자동 가이드$', 300);
    await pickGroup(S.pg, mode === 'loading' ? 9 : 5, true); await S.pg.waitForTimeout(300);
    await S.click('그대로$', 200);
    await S.click(mode === 'loading' ? '^🔵 데크 [1-9]' : '^🟠 홀드 [1-9]', 800);
  };
  //  잰다 — 틀(data-workframe) · 카드 · 확인 단추(위 칸 바로 아래 칸) · 아래 칸
  const measure = async (pg) => pg.evaluate(() => {
    const vh = innerHeight;
    const R = (x) => { if (!x) return null; const q = x.getBoundingClientRect(); return { top: Math.round(q.top), bottom: Math.round(q.bottom) }; };
    const wf = document.querySelector('[data-workframe]');
    const top = document.querySelector('[data-wf-top]'), act = document.querySelector('[data-wf-action]'), low = document.querySelector('[data-wf-bottom]'), bar = document.querySelector('[data-wf-bar]');
    const cards = [...document.querySelectorAll('[data-workframe] [data-gw-card], [data-workframe] [data-twin-card]')];
    const go = act ? act.querySelector('button') : null;
    const rc = cards.map(R), rg = R(go), rl = R(low), rb = R(bar);
    return { vh, wf: wf ? wf.getAttribute('data-workframe') : null, bar: bar ? bar.textContent.replace(/\s+/g, ' ').trim() : '', barR: rb, cards: rc, cns: cards.map((c) => c.getAttribute('data-gw-cn') || c.getAttribute('data-twin-cn')), go: rg, goTxt: go ? go.textContent.replace(/\s+/g, ' ').trim() : '', low: rl, topScroll: top ? top.scrollHeight - top.clientHeight : -1,
      low1: low ? [...low.querySelectorAll('button')].slice(0, 7).map((b) => b.textContent.replace(/\s+/g, ' ').trim()) : [] };
  });
  const fitsOk = (m) => !!m.wf && m.cards.length === 2 && !!m.go && m.barR && m.barR.top === 0 && m.cards.every((r) => r.top >= m.barR.bottom && r.bottom <= m.go.top) && m.go.bottom <= m.low.top && m.low.bottom <= m.vh && m.topScroll <= 1;

  try {
    //  ① 한 화면 — 폰 두 크기 × 글자 둘 × (수동 선적·수동 양하·가이드 양하(55톤 경보 있음)·가이드 선적): 카드 두 장 + 확인 단추가 맨 위 한 줄 아래 · 아래 칸 위 · 위 칸 스크롤 없음
    for (const [w, h] of [[360, 740], [384, 832]]) for (const tm of ['normal', 'large']) {
      const rows = [];
      for (const [kind, mode] of [['manual', 'loading'], ['manual', 'discharge'], ['guide', 'discharge'], ['guide', 'loading']]) {
        const S = await open(w, h, tm, mode, kind === 'guide');
        if (kind === 'manual') await manualCards(S, mode); else await guideTwin(S, mode);
        const m = await measure(S.pg);
        rows.push({ kind, mode, ...m, errs: S.errs.slice(0, 2) });
        await S.ctx.close();
      }
      ok(`①-${w}×${h} ${tm === 'large' ? '크게' : '보통'} — 카드 두 장 + 확인 단추가 맨 위 한 줄 아래·아래 칸 위(위 칸 스크롤 없음): ${rows.map((r) => `${r.kind === 'manual' ? '수동' : '가이드'} ${r.mode === 'loading' ? '선적' : '양하'} 단추 ${r.go ? r.go.bottom : '-'}/${r.vh} ${fitsOk(r) ? '✔' : '✘'}`).join(' · ')}`,
        rows.every((r) => fitsOk(r) && !r.errs.length), JSON.stringify(rows.map((r) => ({ k: r.kind, m: r.mode, wf: r.wf, bar: r.barR, cards: r.cards, go: r.go, low: r.low, ts: r.topScroll, errs: r.errs }))));
    }

    //  ② 맨 위 한 줄 — 검수사 꼴 «05(06)07 🟠 홀드» · 맨 오른쪽 «◀ 전 화면» · 가이드 아래 칸 첫 단추들(앞만·뒤만·둘 다 다름 · 싱글로 한 대씩 · ⏸ 보류 — 선적은 📍 위치 틀림)
    {
      const S = await open(384, 832, 'normal', 'discharge', true);
      await guideTwin(S, 'discharge');
      const md = await measure(S.pg);
      await S.ctx.close();
      const S2 = await open(384, 832, 'normal', 'loading', true);
      await guideTwin(S2, 'loading');
      const ml = await measure(S2.pg);
      ok(`② 가이드 맨 위 한 줄 «${md.bar}» · «${ml.bar}» · 아래 칸 양하 [${md.low1.slice(0, 5).join('][')}] · 선적 [${ml.low1.slice(0, 6).join('][')}]`,
        /^양하 자동 05\(06\)07 🟠 홀드 남은 \d+대 ◀ 전 화면$/.test(md.bar) && /^선적 자동 09\(10\)11 🔵 데크 남은 \d+대 ◀ 전 화면$/.test(ml.bar)
          && JSON.stringify(md.low1.slice(0, 5)) === JSON.stringify(['앞만 다름', '뒤만 다름', '둘 다 다름', '싱글로 한 대씩', '⏸ 보류']) && !md.low1.includes('📍 위치 틀림')
          && JSON.stringify(ml.low1.slice(0, 6)) === JSON.stringify(['앞만 다름', '뒤만 다름', '둘 다 다름', '싱글로 한 대씩', '⏸ 보류', '📍 위치 틀림']) && !S2.errs.length,
        JSON.stringify({ md: md.bar, ml: ml.bar, d: md.low1, l: ml.low1, errs: S2.errs }));
      //  ②-2 [📍 위치 틀림] → 앞·뒤·둘 다 → [둘 다] → 위치 수정 창(앞 컨) → 지금 칸을 고르면 «배정 후 바로 선적확인 (트윈 둘 다) — 켬» → 닫으면 쓰기 0
      await S2.click('^📍 위치 틀림$', 300);
      const pick = await S2.pg.evaluate(() => { const p = document.querySelector('[data-gw-pospick]'); return p ? [...p.querySelectorAll('button')].map((b) => b.textContent.trim()) : []; });
      const front = (ml.cns || [])[0];
      await S2.click('^둘 다$', 600);
      const mo = await S2.modalProbe();
      await S2.modalPickSelf(EL[front] ? EL[front].bay : '');
      const mc = await S2.modalProbe();
      const before = await S2.mem('loading');
      await S2.modalClose();
      const after = await S2.mem('loading');
      const closed = await S2.modalProbe();
      ok(`②-2 가이드 선적 [📍 위치 틀림] → [${pick.join('][')}] → [둘 다] → 위치 수정 창 ${mo.open}(${mo.cn}) → 지금 칸 → «${mc.also}» · 트윈 둘 다 ${mc.twinBoth} → 닫음(${!closed.open}) → 쓰기 ${after.completed.length - before.completed.length}`,
        pick.length === 3 && /^앞 \d{4}$/.test(pick[0]) && /^뒤 \d{4}$/.test(pick[1]) && pick[2] === '둘 다' && mo.open && mo.cn === front && /— 켬$/.test(mc.also) && mc.twinBoth && !closed.open && after.completed.length === before.completed.length && !S2.errs.length,
        JSON.stringify({ pick, mo, mc, front, errs: S2.errs }));
      //  ②-3 ◀ 전 화면 → 틀이 닫히고 단 고르기(데크·홀드) 화면
      await S2.sel('[data-wf-back]', 500);
      const back = await S2.pg.evaluate(() => ({ wf: !!document.querySelector('[data-workframe]'), tier: [...document.querySelectorAll('button')].some((b) => /^🔵 데크 [1-9]/.test(b.textContent.replace(/\s+/g, ' ').trim())) }));
      ok(`②-3 ◀ 전 화면 → 틀 닫힘(${!back.wf}) · 단 고르기 화면(🔵 데크 단추 ${back.tier})`, !back.wf && back.tier && !S2.errs.length, JSON.stringify({ back, errs: S2.errs }));
      await S2.ctx.close();
    }

    //  ③ 수동 조회창 — 앞만 넣으면 [확인] 꺼짐·카드 없음(넣자마자 안 넘어감) · 짝 후보 단추(원자료 짝) → 뒤 칸에 들어감 · 그래도 [확인] 을 눌러야 카드 두 장
    {
      const S = await open(360, 740, 'normal', 'loading', false);
      await manualIn(S, EL, frontL);
      const m0 = await measure(S.pg);
      await typeBox(S, '앞', frontL.slice(-4));
      const s1 = await S.pg.evaluate(() => { const g = document.querySelector('[data-twin-go="next"]'); const mt = document.querySelector('[data-twin-mate]'); return { go: g ? g.textContent.replace(/\s+/g, ' ').trim() : '', dis: g ? g.disabled : null, mate: mt ? mt.getAttribute('data-twin-mate') : '', cards: document.querySelectorAll('[data-twin-card]').length }; });
      await S.sel('[data-twin-mate]', 500);
      const s2 = await S.pg.evaluate(() => { const g = document.querySelector('[data-twin-go="next"]'); return { go: g ? g.textContent.replace(/\s+/g, ' ').trim() : '', dis: g ? g.disabled : null, back: (document.querySelector('[data-twin-box="뒤"] input') || {}).value || '', cards: document.querySelectorAll('[data-twin-card]').length }; });
      await S.sel('[data-twin-go="next"]', 600);
      const m1 = await measure(S.pg);
      ok(`③ 수동 조회창(${m0.wf}) — 앞 ${frontL.slice(-4)} 만: [${s1.go}] 꺼짐 ${s1.dis} · 카드 ${s1.cards} · 짝 후보 ${s1.mate.slice(-4)}(원자료 짝 ${mateL.slice(-4)}) → 뒤 칸 «${s2.back}» · [${s2.go}] 켜짐 ${!s2.dis} · 카드 ${s2.cards} → [확인] → 틀 ${m1.wf} · 카드 ${m1.cns.join('·')}`,
        m0.wf === 'manual-input' && s1.dis === true && s1.cards === 0 && s1.mate === mateL && s2.back === mateL && s2.dis === false && s2.cards === 0 && m1.wf === 'manual-cards' && JSON.stringify(m1.cns) === JSON.stringify([frontL, mateL]) && !S.errs.length,
        JSON.stringify({ s1, s2, m1: m1.cns, errs: S.errs }));
      //  ③-2 [뒤만 다름] → 조회창으로 · 뒤 칸 비고 앞 칸은 그대로 · ◀ 전 화면(카드 단계) 도 조회창으로
      await S.click('^뒤만 다름$', 400);
      const s3 = await S.pg.evaluate(() => ({ wf: (document.querySelector('[data-workframe]') || {}).getAttribute ? document.querySelector('[data-workframe]').getAttribute('data-workframe') : null, front: (document.querySelector('[data-twin-box="앞"] input') || {}).value || '', back: (document.querySelector('[data-twin-box="뒤"] input') || {}).value || '' }));
      ok(`③-2 [뒤만 다름] → ${s3.wf} · 앞 칸 «${s3.front}» · 뒤 칸 «${s3.back}»(비움)`, s3.wf === 'manual-input' && s3.front === frontL.slice(-4) && s3.back === '' && !S.errs.length, JSON.stringify(s3));
      await S.ctx.close();
    }

    //  ④ 수동 카드 [싱글로 한 대씩] → [뒤 …만 확인] → 뒤 컨 한 대만 선적확인(메모리) · 앞은 카드에 남음 → [트윈 한 번에 선적확인] 은 남은 앞만 찍는다(뒤를 두 번 찍지 않는다)
    {
      const S = await open(360, 740, 'normal', 'loading', false);
      await manualCards(S, 'loading');
      await S.click('^싱글로 한 대씩$', 300);
      await S.pg.evaluate(() => { const p = document.querySelector('[data-twin-panel="single"]'); const b = p && [...p.querySelectorAll('button')].find((x) => /^뒤/.test(x.textContent.trim())); if (b) b.click(); });
      await S.pg.waitForTimeout(500);
      await S.click('^확인$|^예$|^계속$', 400);
      const d1 = await S.mem('loading');
      await S.upd();
      const stillCards = await S.pg.evaluate(() => (document.querySelector('[data-workframe]') || { getAttribute: () => '' }).getAttribute('data-workframe'));
      const rec1 = await S.pg.evaluate(({ k, cn }) => JSON.stringify(((window.__memdb.voyages[k].loading || {}).completed || {})[cn] || null), { k: FX.key, cn: mateL });
      await S.sel('[data-twin-go="both"]', 700);
      const d2 = await S.mem('loading');
      const rec2 = await S.pg.evaluate(({ k, cn }) => JSON.stringify(((window.__memdb.voyages[k].loading || {}).completed || {})[cn] || null), { k: FX.key, cn: mateL });
      ok(`④ 수동 [싱글로 한 대씩] → 뒤 ${mateL.slice(-4)} 만 완료 [${d1.completed.map((x) => x.slice(-4))}] · 카드 단계 그대로(${stillCards}) → [트윈 한 번에] → 완료 [${d2.completed.map((x) => x.slice(-4))}] · 뒤 기록 그대로(다시 안 찍음 ${rec1 === rec2})`,
        JSON.stringify(d1.completed) === JSON.stringify([mateL]) && stillCards === 'manual-cards' && d2.completed.length === 2 && d2.completed.includes(frontL) && rec1 === rec2 && !S.errs.length,
        JSON.stringify({ d1, d2: d2.completed, stillCards, rec1, rec2, errs: S.errs }));
      await S.ctx.close();
    }

    //  ⑤ 수동 카드 [📍 위치 틀림] → [앞 …] → 위치 수정 창(앞 컨 · 트윈 지정 꺼짐 · «배정 후 바로 선적확인» 켜짐) → 닫음 → 쓰기 0
    {
      const S = await open(360, 740, 'normal', 'loading', false);
      await manualCards(S, 'loading');
      await S.click('^📍 위치 틀림$', 300);
      const pick = await S.pg.evaluate(() => { const p = document.querySelector('[data-twin-panel="pos"]'); return p ? [...p.querySelectorAll('button')].map((b) => b.textContent.trim()) : []; });
      await S.pg.evaluate(() => { const p = document.querySelector('[data-twin-panel="pos"]'); const b = p && [...p.querySelectorAll('button')].find((x) => /^앞/.test(x.textContent.trim())); if (b) b.click(); });
      await S.pg.waitForTimeout(600);
      const mo = await S.modalProbe();
      await S.modalPickSelf(EL[frontL].bay);
      const mc = await S.modalProbe();
      const before = await S.mem('loading');
      await S.modalClose();
      const after = await S.mem('loading');
      ok(`⑤ 수동 [📍 위치 틀림] → [${pick.join('][')}] → [앞] → 위치 수정 창 ${mo.open}(${mo.cn}) → 지금 칸 → «${mc.also}» · 트윈 둘 다 ${mc.twinBoth}(앞만이라 꺼짐) → 닫음 → 쓰기 ${after.completed.length - before.completed.length}`,
        pick.length === 3 && mo.open && mo.cn === frontL && /— 켬$/.test(mc.also) && !mc.twinBoth && after.completed.length === before.completed.length && !S.errs.length,
        JSON.stringify({ pick, mo, mc, errs: S.errs }));
      await S.ctx.close();
    }

    //  ⑥ 수동 카드 [⏸ 보류] → «콘 잠김» → 두 대가 한 몸으로 보류(메모리 held · 사유) · 조회창으로 돌아감 · 완료 0
    {
      const S = await open(360, 740, 'normal', 'discharge', false);
      await manualCards(S, 'discharge');
      await S.click('^⏸ 보류$', 300);
      await S.click('^콘 잠김$', 600);
      const d = await S.mem('discharge');
      const wf = await S.pg.evaluate(() => (document.querySelector('[data-workframe]') || { getAttribute: () => '' }).getAttribute('data-workframe'));
      const held = Object.keys(d.held).sort();
      ok(`⑥ 수동 양하 [⏸ 보류] → «콘 잠김» → 보류 [${held.map((x) => x.slice(-4))}] (사유 ${Object.values(d.held).map((h) => h.reason).join('·')} · 짝 묶음 ${Object.values(d.held).every((h) => /,/.test(h.group || ''))}) · 완료 ${d.completed.length} · ${wf}`,
        JSON.stringify(held) === JSON.stringify([frontD, mateD].sort()) && Object.values(d.held).every((h) => h.reason === '콘 잠김' && /,/.test(h.group || '')) && d.completed.length === 0 && wf === 'manual-input' && !S.errs.length,
        JSON.stringify({ d, wf, errs: S.errs }));
      await S.ctx.close();
    }

    //  ⑦ 수동 40피트 — 앞만 넣으면 뒤 칸 꺼짐 · [확인 — 카드로] → 카드 한 장 · 확인 단추 «선적확인»
    {
      const S = await open(360, 740, 'normal', 'loading', false);
      await manualIn(S, EL, front40);
      await typeBox(S, '앞', front40.slice(-4));
      const s = await S.pg.evaluate(() => ({ backDis: (document.querySelector('[data-twin-box="뒤"] input') || {}).disabled, go: (document.querySelector('[data-twin-go="next"]') || {}).textContent }));
      await S.sel('[data-twin-go="next"]', 600);
      const m = await measure(S.pg);
      ok(`⑦ 수동 40피트 ${front40.slice(-4)}(${EL[front40].iso}) — 뒤 칸 꺼짐 ${s.backDis} · [${(s.go || '').trim()}] → 카드 ${m.cards.length}장 · 확인 «${m.goTxt}»`,
        s.backDis === true && /카드로/.test(s.go || '') && m.wf === 'manual-cards' && m.cards.length === 1 && m.goTxt === '선적확인' && !S.errs.length, JSON.stringify({ s, m, errs: S.errs }));
      //  ⑦-2 (감사 중-1) [선적확인] → 그 한 대 완료 → 목록이 갱신되면 조회창으로 돌아온다(다음 컨을 넣을 수 있게) · 앞 칸 비움
      await S.sel('[data-twin-go="one"]', 500);
      await S.click('^확인$|^예$|^계속$', 400);
      const d = await S.mem('loading');
      await S.upd(); await S.pg.waitForTimeout(900);
      const r = await S.pg.evaluate(() => ({ wf: (document.querySelector('[data-workframe]') || { getAttribute: () => '' }).getAttribute('data-workframe'), front: (document.querySelector('[data-twin-box="앞"] input') || {}).value }));
      ok(`⑦-2 40피트 [선적확인] → 완료 [${d.completed.map((x) => x.slice(-4))}] → ${r.wf}(조회창으로) · 앞 칸 «${r.front}»`,
        JSON.stringify(d.completed) === JSON.stringify([front40]) && r.wf === 'manual-input' && r.front === '' && !S.errs.length, JSON.stringify({ d: d.completed, r, errs: S.errs }));
      await S.ctx.close();
    }

    //  ⑨ (감사 중-1) 수동 트윈 [싱글로 한 대씩] 으로 앞·뒤를 한 대씩 다 확인하면 조회창으로 돌아온다 — 고치기 전에는 ✓ 두 장이 남은 카드 화면에 멈췄다
    {
      const S = await open(360, 740, 'normal', 'loading', false);
      await manualCards(S, 'loading');
      const one = async (which) => {
        if (!(await S.pg.evaluate(() => !!document.querySelector('[data-twin-panel="single"]')))) await S.click('^싱글로 한 대씩$', 300);
        await S.pg.evaluate((w) => { const p = document.querySelector('[data-twin-panel="single"]'); const b = p && [...p.querySelectorAll('button')].find((x) => new RegExp('^' + w).test(x.textContent.trim()) && !x.disabled); if (b) b.click(); }, which);
        await S.pg.waitForTimeout(500);
        await S.click('^확인$|^예$|^계속$', 400);
        await S.upd(); await S.pg.waitForTimeout(900);
        return S.pg.evaluate(() => ({ wf: (document.querySelector('[data-workframe]') || { getAttribute: () => '' }).getAttribute('data-workframe'), front: (document.querySelector('[data-twin-box="앞"] input') || {}).value, back: (document.querySelector('[data-twin-box="뒤"] input') || {}).value }));
      };
      const a1 = await one('앞');
      const d1 = await S.mem('loading');
      const a2 = await one('뒤');
      const d2 = await S.mem('loading');
      ok(`⑨ 수동 [싱글로 한 대씩] 앞 → 완료 [${d1.completed.map((x) => x.slice(-4))}] · ${a1.wf}(뒤가 남아 카드 그대로) → 뒤 → 완료 [${d2.completed.map((x) => x.slice(-4))}] · ${a2.wf}(조회창으로) · 앞 «${a2.front}» 뒤 «${a2.back}»`,
        JSON.stringify(d1.completed) === JSON.stringify([frontL]) && a1.wf === 'manual-cards' && JSON.stringify(d2.completed.slice().sort()) === JSON.stringify([frontL, mateL].sort()) && a2.wf === 'manual-input' && a2.front === '' && a2.back === '' && !S.errs.length,
        JSON.stringify({ a1, a2, d1: d1.completed, d2: d2.completed, errs: S.errs }));
      await S.ctx.close();
    }

    //  ⑩ (감사 중-2) 수동 양하 트윈 — 앞 컨이 XRAY 대상: 실번호 없이 [트윈 한 번에 양하확인] → 막힘(완료 0) · 컨 상세에서 실번호를 넣은 뒤(목록 갱신) → 카드 실번호 줄이 새 값 · [트윈 한 번에] → 둘 다 완료
    //     고치기 전에는 카드가 [확인] 때의 사본을 들고 있어 실번호를 넣어도 «미입력» 그대로 다시 막혔다.
    {
      const S = await open(360, 740, 'normal', 'discharge', false);
      const alerts = []; S.pg.on('dialog', (dg) => { alerts.push(dg.message()); dg.dismiss().catch(() => {}); });
      await S.pg.evaluate(({ k, cn }) => { const v = window.__memdb.voyages[k]; v.discharge.xrayList = { ...(v.discharge.xrayList || {}), [cn]: { kind: 'X-RAY', dest: '평택 제2컨테이너검색기', at: Date.now() } }; }, { k: FX.key, cn: frontD });
      await S.upd();
      await manualCards(S, 'discharge');
      const seal0 = await S.pg.evaluate((cn) => { const c = document.querySelector(`[data-twin-cn="${cn}"]`); const x = c && c.querySelector('[data-twin-xray]'); return x ? x.textContent.replace(/\s+/g, ' ').trim() : '-'; }, frontD);
      await S.sel('[data-twin-go="both"]', 600);
      const d0 = await S.mem('discharge');
      const al0 = alerts.slice();
      await S.pg.evaluate(({ k, cn }) => { const v = window.__memdb.voyages[k]; v.discharge.xraySeals = { ...(v.discharge.xraySeals || {}), [cn]: { seal: 'R43X0071', by: '연막', at: Date.now() } }; }, { k: FX.key, cn: frontD });
      await S.upd();
      const seal1 = await S.pg.evaluate((cn) => { const c = document.querySelector(`[data-twin-cn="${cn}"]`); const x = c && c.querySelector('[data-twin-xray]'); return x ? x.textContent.replace(/\s+/g, ' ').trim() : '-'; }, frontD);
      await S.sel('[data-twin-go="both"]', 700);
      const d1 = await S.mem('discharge');
      ok(`⑩ 수동 양하 XRAY 앞 ${frontD.slice(-4)} — XRAY 줄 «${seal0.slice(0, 30)}» · [트윈 한 번에] → 막힘(알림 ${al0.some((x) => /XRAY 실번호를 먼저/.test(x))} · 완료 ${d0.completed.length}) → 실번호 넣음 → 카드 «${seal1.slice(0, 30)}» → [트윈 한 번에] → 완료 [${d1.completed.map((x) => x.slice(-4))}]`,
        al0.some((x) => /XRAY 실번호를 먼저/.test(x)) && d0.completed.length === 0 && /^XRAY: ?미입력/.test(seal0) && /^XRAY: ?R43X0071/.test(seal1) && JSON.stringify(d1.completed.slice().sort()) === JSON.stringify([frontD, mateD].sort()) && !S.errs.length,
        JSON.stringify({ seal0, seal1, al0, d0: d0.completed, d1: d1.completed, alerts, errs: S.errs }));
      await S.ctx.close();
    }

    //  ⑧ 베이뷰 작업(위 자료·아래 베이)은 그대로 — 틀 없음(자동 가이드는 위 칸 안에 종전처럼)
    {
      const S = await open(384, 832, 'normal', 'discharge', true);
      await S.click('^베이뷰 작업', 500);
      await S.click('^🤖 자동 가이드$', 500);
      await pickGroup(S.pg, 5, true); await S.pg.waitForTimeout(300);
      await S.click('그대로$', 200);
      await S.click('^🟠 홀드 [1-9]', 800);
      const r = await S.pg.evaluate(() => ({ bv: !!document.querySelector('[data-bayview="view"]'), wf: !!document.querySelector('[data-workframe]'), cards: document.querySelectorAll('[data-bayview-top] [data-gw-card]').length }));
      ok(`⑧ 베이뷰 자동 — 덮개 ${r.bv} · 한 화면 틀 ${r.wf}(없어야) · 위 칸 카드 ${r.cards}장`, r.bv && !r.wf && r.cards === 2 && !S.errs.length, JSON.stringify({ r, errs: S.errs }));
      await S.ctx.close();
    }
    //  ⑪ (감사 하-A) 서버 확인이 늦을 때(로컬엔 곧 반영 · 약속은 2.5초 뒤) — [트윈 한 번에] 뒤 조회창으로 와서 다음 앞 번호를 넣으면 그 번호가 남는다
    //     고치기 전에는 확인 약속이 풀린 0.5초 뒤 타이머가 앞 칸을 비워, 넣은 번호가 사라졌다(신호 약한 부두).
    {
      const S = await open(360, 740, 'normal', 'loading', false);
      await manualCards(S, 'loading');
      await S.pg.evaluate(() => { window.__memlag = 2500; });
      await S.sel('[data-twin-go="both"]', 150);
      await S.upd(); await S.pg.waitForTimeout(500);
      const wf1 = await S.pg.evaluate(() => (document.querySelector('[data-workframe]') || { getAttribute: () => '' }).getAttribute('data-workframe'));
      await typeBox(S, '앞', front40.slice(-4));
      await S.pg.waitForTimeout(3200);
      const r = await S.pg.evaluate(() => ({ front: (document.querySelector('[data-twin-box="앞"] input') || {}).value, ok: (document.querySelector('[data-twin-ok]') || { getAttribute: () => '' }).getAttribute('data-twin-ok') }));
      const d = await S.mem('loading');
      ok(`⑪ 서버 확인 2.5초 늦음 — [트윈 한 번에] → 완료 [${d.completed.map((x) => x.slice(-4))}] · ${wf1} → 다음 앞 «${front40.slice(-4)}» 넣음 → 3.2초 뒤 앞 칸 «${r.front}» · 잡힌 컨 ${r.ok}`,
        JSON.stringify(d.completed.slice().sort()) === JSON.stringify([frontL, mateL].sort()) && wf1 === 'manual-input' && r.front === front40.slice(-4) && r.ok === front40 && !S.errs.length,
        JSON.stringify({ wf1, r, d: d.completed, errs: S.errs }));
      await S.ctx.close();
    }
    //  ⑫ (2차 시뮬 하-1) 호기가 비었는데 [📍 위치 틀림] → [앞] → 창을 열기 전에 «갱(호기)을 먼저 선택하세요» · 창 안 뜸 · 자리·완료 쓰기 0
    //     고치기 전에는 창이 열려 칸을 고르면 자리를 먼저 쓰고, 확인 단계에서야 호기로 막혀 «자리만 옮겨지고 완료는 안 찍힌» 채 남았다.
    {
      const S = await open(360, 740, 'normal', 'loading', false);
      const alerts = []; S.pg.on('dialog', (dg) => { alerts.push(dg.message()); dg.dismiss().catch(() => {}); });
      await manualCards(S, 'loading');
      const log0 = await S.pg.evaluate(() => (window.__memlog || []).length);
      await S.pg.evaluate(() => { try { localStorage.removeItem('gm_equip_no'); } catch (er) { /* 저장 막힘 */ } });
      await S.click('^📍 위치 틀림$', 300);
      await S.pg.evaluate(() => { const p = document.querySelector('[data-twin-panel="pos"]'); const b = p && [...p.querySelectorAll('button')].find((x) => /^앞/.test(x.textContent.trim())); if (b) b.click(); });
      await S.pg.waitForTimeout(600);
      const mo = await S.modalProbe();
      const log1 = await S.pg.evaluate(() => (window.__memlog || []).length);
      ok(`⑫ 호기 없음 → [📍 위치 틀림] → [앞] → 알림 «${(alerts[0] || '-').slice(0, 24)}» · 위치 창 ${mo.open ? '열림' : '안 열림'} · 쓰기 ${log1 - log0}`,
        alerts.some((x) => /갱\(호기\)을 먼저/.test(x)) && !mo.open && log1 === log0 && !S.errs.length, JSON.stringify({ alerts, mo, log0, log1, errs: S.errs }));
      await S.ctx.close();
    }
    //  ⑬ (감사 하) 짝 칸 컨이 통과분이면(사본에서 원자료 짝의 출발항을 평택 밖으로) «짝 후보» 단추를 내지 않는다 — 3.2-01 통과분은 짝이 못 된다
    {
      const S = await open(360, 740, 'normal', 'loading', false);
      await S.pg.evaluate(({ k, cn }) => { const v = window.__memdb.voyages[k]; v.loading.ediContainers[cn] = { ...v.loading.ediContainers[cn], pol: 'CNSHA' }; }, { k: FX.key, cn: mateL });
      await S.upd();
      await manualIn(S, EL, frontL);
      await typeBox(S, '앞', frontL.slice(-4));
      const r = await S.pg.evaluate(() => ({ mate: (document.querySelector('[data-twin-mate]') || { getAttribute: () => '' }).getAttribute('data-twin-mate'), ok: (document.querySelector('[data-twin-box="앞"] [data-twin-ok]') || { getAttribute: () => '' }).getAttribute('data-twin-ok') }));
      ok(`⑬ 짝 칸 ${mateL.slice(-4)} 이 통과분(출발항 CNSHA 사본) — 앞 ${r.ok.slice(-4)} 잡힘 · 짝 후보 단추 «${r.mate || '없음'}»`,
        r.ok === frontL && !r.mate && !S.errs.length, JSON.stringify({ r, errs: S.errs }));
      await S.ctx.close();
    }
  } finally {
    await browser.close();
  }
};

//  단독 실행 — node tools/regress_r43_workframe.cjs <저장소 루트>
if (require.main === module) {
  process.env.TZ = 'Asia/Seoul';
  const ROOT = path.resolve(process.argv[2] || process.cwd());
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'r43_'));
  let n = 0, bad = 0;
  const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + String(detail).slice(0, 2000) : ''}`); } };
  const head = (t, f) => { console.log(`■ ${t}`); console.log(`  (출처 ${f})`); };
  const fx = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures', f), 'utf8'));
  module.exports({ ROOT, TMP, ok, head, fx, stub: path.join(ROOT, 'tools/stub_fbdb_mem.js') })
    .then(() => { console.log(`\nR43 ${n - bad}/${n}`); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ } process.exit(bad ? 1 : 0); })
    .catch((e) => { console.error('✗ R43 오류', e && e.stack || e); process.exit(1); });
}
