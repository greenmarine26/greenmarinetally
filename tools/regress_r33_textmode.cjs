// 회귀 기준표 R33 — 글자 두 모드(보통·크게)와 머리띠 폰·컴 배치 (4.23). smoke_regress.cjs 가 부른다(크로뮴으로 실제 그려 잰다).
//   검수사 2026-10-12 «수석들이 노안이 심한 사람이 많습니다. 두가지 모드로 했으면 합니다» · «버전 확인을 하려도 버튼을 누르는건 불편합니다» · «상기 화면에도 버전을 크게 표기 바랍니다»
//   · A4 «폰은 아이콘 크기를 맞추면 한줄이면 될껄 크기가 틀려 다음줄을 만들기도 합니다».
//   ⚠ 기대값은 코드에서 베끼지 않는다 — 4.22-04 글자 값(Tailwind 기본·tailwind.config 종전 px)에서 규칙(보통 = 가장 작은 셋 +1 · 크게 = 보통 +2 · 그림·인쇄 = 4.22-04)으로 이 파일이 센다.
//   실행: smoke_regress.cjs 안에서 — require('./regress_r33_textmode.cjs')({ ROOT, TMP, ok, head, fx, stub })
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OLD = { '3xs': 9, '2xs': 10, 'xxs': 11, 'xs2': 12, 'sm2': 13, 'xs': 12, 'sm': 14, 'base': 16, 'lg': 18, 'xl': 20, '2xl': 24, '3xl': 30, '4xl': 36 };
//  4.22-04 줄 높이 — 기본 키는 Tailwind 기본 rem 값(px), 작은 다섯은 tailwind.config 의 비율
const OLD_LH = { '3xs': 9 * 1.2, '2xs': 10 * 1.3, 'xxs': 11 * 1.4, 'xs2': 12 * 1.45, 'sm2': 13 * 1.5, 'xs': 16, 'sm': 20, 'base': 24, 'lg': 28, 'xl': 28, '2xl': 32, '3xl': 36, '4xl': 40 };
const NORMAL = Object.fromEntries(Object.entries(OLD).map(([k, v]) => [k, ['3xs', '2xs', 'xxs'].includes(k) ? v + 1 : v]));
const LARGE = Object.fromEntries(Object.entries(NORMAL).map(([k, v]) => [k, v + 2]));
const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async function r33({ ROOT, TMP, ok, head, fx, stub, css = '' }) {
  head('R33 글자 두 모드(보통·크게) · 머리띠 폰/컴 — 보통은 가장 작은 셋만 한 단계(9→10·10→11·11→12)·나머지 4.22-04 그대로 · 크게는 보통 +2 · 그림(fs-keep)·인쇄는 4.22-04 · 폰 390 «크게»에서 머리띠·독·진행 줄 넘침 0 · 판 번호는 머리띠에 한 번(안 잘림) · 폰 360 머리띠 선박 코드·이름 단추 안 (4.23)',
    '검수사 2026-10-12 «수석들이 노안이 심한 사람이 많습니다. 두가지 모드로 했으면 합니다» · «버전 확인을 하려도 버튼을 누르는건 불편합니다» · «상기 화면에도 버전을 크게 표기 바랍니다» · A4 «폰은 아이콘 크기를 맞추면 한줄이면» · 2026-10-13 00:53 «전부 클로드 안대로 수정하고 배포»');
  //  빌드된 CSS — 루트 index.html 이 부르는 것(build.sh 가 vite build 뒤에 이 검사를 돈다)
  const idx = fs.existsSync(path.join(ROOT, 'index.html')) ? fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8') : '';
  const cssRel = (idx.match(/href="\.\/(assets\/index-[\w-]+\.css)"/) || [])[1];
  const cssPath = css || (cssRel ? path.join(ROOT, cssRel) : '');   // 단독 실행은 CSS 경로를 따로 줄 수 있다
  if (!cssPath || !fs.existsSync(cssPath)) { ok('빌드된 CSS(assets/index-*.css)가 있다 — 없으면 화면을 잴 수 없다', false, cssRel || '없음'); return; }
  let pw;
  try { pw = require(path.join(ROOT, 'node_modules/playwright')); } catch (e) { try { pw = require('playwright'); } catch (e2) { pw = null; } }
  if (!pw || !CHROME) { ok('playwright·크로뮴이 있다 — 모양을 잴 수 없으면 올리지 않는다', false, `${!!pw} · ${CHROME || '없음'}`); return; }

  //  실소스 묶음 — Header·VoyagePage 를 브라우저에서 그린다(Firebase 는 메모리 스텁, 쓰기 없음)
  const e = path.join(TMP, 'r33.jsx'), o = path.join(TMP, 'r33.js');
  fs.writeFileSync(e, [
    `import React from "${ROOT}/node_modules/react/index.js";`,
    `import { createRoot } from "${ROOT}/node_modules/react-dom/client.js";`,
    `import Header from "${ROOT}/src/components/Header.jsx";`,
    `import VoyagePage from "${ROOT}/src/pages/VoyagePage.jsx";`,
    `import { applyTextSize, runDeviceCmd, APP_VERSION } from "${ROOT}/src/utils.js";`,
    `const roots = {};`,
    `const mount = (id, el) => { if (!roots[id]) roots[id] = createRoot(document.getElementById(id)); roots[id].render(el); };`,
    `window.__R33 = { APP_VERSION, applyTextSize, runDeviceCmd,`,
    `  head: (p) => mount('hdr', React.createElement(Header, Object.assign({ version: APP_VERSION, online: true, onChangeInspector() {}, onGoHome() {}, onLogout() {}, onOpenStaffManager() {}, onOpenAux() {}, onChangeWork() {} }, p))),`,
    `  voy: (json, key, mode) => mount('root', React.createElement(VoyagePage, { voyageKey: key, voyage: JSON.parse(json), inspector: '연막', inspectors: [], portMisData: {}, pilotForecast: {}, onGoHome() {}, onModeChange() {}, initModeOverride: mode })) };`,
  ].join('\n'));
  execSync(`npx esbuild "${e}" --bundle --format=iife --loader:.jsx=jsx --loader:.js=jsx --loader:.png=dataurl --loader:.json=json --jsx=automatic --external:fs --external:path --external:url --alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --alias:pdfjs-dist/build/pdf=${ROOT}/tools/stub_pdfjs.js --define:global=window --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
  const html = path.join(TMP, 'r33.html');
  fs.writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="file://${cssPath}"></head>
<body><div id="hdr"></div><div id="tok" style="position:absolute;left:-9999px;top:0">${Object.keys(OLD).map((k) => `<span class="text-${k}" data-k="${k}">가</span>`).join('')}<span class="bdg" data-k="bdg">가</span><div class="fs-keep">${['2xs', 'sm', 'xs'].map((k) => `<span class="text-${k}" data-keep="${k}">가</span>`).join('')}</div></div><div id="root"></div><script src="file://${o}"></script></body></html>`);

  const browser = await pw.chromium.launch({ executablePath: CHROME });
  try {
    const pg = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const perr = []; pg.on('pageerror', (er) => perr.push(String(er).slice(0, 160)));
    await pg.goto('file://' + html); await sleep(300);
    const tok = async (mode) => pg.evaluate((m) => {
      if (m === 'large') document.documentElement.setAttribute('data-text', 'large'); else document.documentElement.removeAttribute('data-text');
      const r = {};
      document.querySelectorAll('#tok [data-k]').forEach((s) => { const cs = getComputedStyle(s); r[s.dataset.k] = { fs: parseFloat(cs.fontSize), lh: parseFloat(cs.lineHeight) }; });
      document.querySelectorAll('#tok [data-keep]').forEach((s) => { r['keep_' + s.dataset.keep] = parseFloat(getComputedStyle(s).fontSize); });
      return r;
    }, mode);
    // ① 토큰 값 — 보통·크게·줄 높이
    const N = await tok('normal'), Lg = await tok('large');
    const badN = Object.keys(OLD).filter((k) => N[k].fs !== NORMAL[k]), badL = Object.keys(OLD).filter((k) => Lg[k].fs !== LARGE[k]);
    ok(`① 보통 글자 = 4.22-04 + (가장 작은 셋만 +1) — ${Object.keys(OLD).map((k) => `${k} ${N[k].fs}`).join(' · ')}`, !badN.length, badN.map((k) => `${k} ${N[k].fs}≠${NORMAL[k]}`).join(', '));
    const badLh = Object.keys(OLD).filter((k) => !['3xs', '2xs', 'xxs'].includes(k) && Math.abs(N[k].lh - OLD_LH[k]) > 0.3);
    ok(`① 보통 줄 높이는 4.22-04 그대로(바뀐 셋 제외) — xs ${N.xs.lh} · sm ${N.sm.lh} · base ${N.base.lh} · lg ${N.lg.lh} · 2xl ${N['2xl'].lh}`, !badLh.length, badLh.map((k) => `${k} ${N[k].lh}≠${OLD_LH[k]}`).join(', '));
    ok(`② 크게 = 보통 +2 — ${Object.keys(OLD).map((k) => `${k} ${Lg[k].fs}`).join(' · ')} · 뱃지 ${N.bdg.fs}→${Lg.bdg.fs}`, !badL.length && N.bdg.fs === 11 && Lg.bdg.fs === 13, badL.map((k) => `${k} ${Lg[k].fs}≠${LARGE[k]}`).join(', '));
    ok(`③ 그림 칸(.fs-keep)은 크게에서도 4.22-04 — 2xs ${Lg.keep_2xs} · xs ${Lg.keep_xs} · sm ${Lg.keep_sm}`, Lg.keep_2xs === OLD['2xs'] && Lg.keep_xs === OLD.xs && Lg.keep_sm === OLD.sm, JSON.stringify([Lg.keep_2xs, Lg.keep_xs, Lg.keep_sm]));
    // ④ 인쇄 — 크게로 켠 채 인쇄해도 4.22-04 글자
    await pg.emulateMedia({ media: 'print' });
    const P = await tok('large');
    await pg.emulateMedia({ media: 'screen' });
    const badP = Object.keys(OLD).filter((k) => P[k].fs !== OLD[k]);
    ok(`④ 인쇄(크게 켠 채) = 4.22-04 — 3xs ${P['3xs'].fs} · 2xs ${P['2xs'].fs} · xxs ${P.xxs.fs} · sm ${P.sm.fs} · 뱃지 ${P.bdg.fs}`, !badP.length && P.bdg.fs === 11, badP.map((k) => `${k} ${P[k].fs}≠${OLD[k]}`).join(', '));

    //  머리띠 — 폰 390 · 컴 1440 × 보통·크게
    const K = fx('recon422_kbtr.json'), KL = fx('printhub42202_kbtr_l.json');
    const ED = Object.fromEntries(Object.entries(K.discharge.ediContainers).map(([k, ev]) => [k, k.startsWith('__') ? ev : { ...ev, cn: ev.cn || k }]));
    const v33 = { key: 'KBTR_2608E', info: KL.info, discharge: { ...K.discharge, ediContainers: ED }, loading: KL.loading };
    const verShort = String((await pg.evaluate(() => window.__R33.APP_VERSION)) || '').replace(/^TallyOne\s*/, '');
    const HM = () => {
      const hdr = document.querySelector('header[data-app-header]'); if (!hdr || !hdr.querySelector('[data-hdr-version]') || !hdr.querySelector('[data-hdr-title]')) return null;   // 표식이 없으면 4.23 머리띠가 아니다
      const row = hdr.firstElementChild; const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none'; };
      const kids = [...row.children].filter(vis); const R = kids.map((k) => k.getBoundingClientRect());
      let overlap = 0; for (let i = 0; i + 1 < R.length; i++) if (R[i].right > R[i + 1].left + 0.5) overlap++;
      const ver = hdr.querySelector('[data-hdr-version]'), ttl = hdr.querySelector('[data-hdr-title]');
      const vr = ver.getBoundingClientRect(), tr = ttl.getBoundingClientRect();
      const verTxt = ver.innerText.replace(/\s+/g, ' ').trim();
      //  넘침 — 머리띠 안 nowrap 글자가 제 칸 밖으로(…로 줄인 이름은 의도한 줄임이라 따로 센다)
      const spill = [], ell = [];
      hdr.querySelectorAll('*').forEach((el) => { if (!vis(el)) return; const cs = getComputedStyle(el); if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0 && (el.textContent || '').trim()) { (cs.textOverflow === 'ellipsis' ? ell : spill).push((el.textContent || '').trim().slice(0, 20)); } });
      return { h: Math.round(hdr.getBoundingClientRect().height), overlap, right: Math.round(Math.max(...R.map((r) => r.right))), vw: document.documentElement.clientWidth,
        hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, verTxt, verOk: vr.right <= tr.right + 0.5 && vr.left >= tr.left - 0.5 && ver.scrollWidth <= ver.clientWidth + 1 && vr.width > 0,
        verPx: parseFloat(getComputedStyle(ver.querySelector('.mono') || ver).fontSize), title: ttl.innerText.replace(/\s+/g, ' ').trim(),
        hasEquip: !!hdr.querySelector('[data-equip-btn]'), equipW: Math.round((hdr.querySelector('[data-equip-btn]') || { getBoundingClientRect: () => ({ width: 0 }) }).getBoundingClientRect().width),
        hasView: !!hdr.querySelector('[data-work-mode="view"]'), hasChange: !!hdr.querySelector('[data-work-change]'), hasMenu: !!hdr.querySelector('button[aria-label="메뉴"]'),
        //  4.23 2차(감사 — 종전 kids.slice(2) 는 단추 묶음 하나뿐이라 «높이 한 벌» 이 늘 참이었다): 단추 묶음 **안의** 단추 각각(조회만·호기·변경·이름·⋮)
        btnH: [...row.lastElementChild.querySelectorAll('button')].filter((b) => vis(b) && !b.closest('[data-hdr-menu]')).map((b) => Math.round(b.getBoundingClientRect().height)),
        //  선박 코드가 다 보이나(«K…» 아님) · 폰 항차 번호는 다 보이거나 아예 안 보이거나(«2…» 아님) · 이름 글자가 단추 안인가
        vsl: (() => { const v = hdr.querySelector('[data-hdr-vsl]'); return v ? { t: v.textContent, full: v.scrollWidth <= v.clientWidth + 1 } : null; })(),
        voy: (() => { const v = hdr.querySelector('[data-hdr-voy]'); if (!v || !vis(v) || getComputedStyle(v).visibility === 'hidden') return 'hidden'; return v.scrollWidth <= v.clientWidth + 1 ? 'full' : 'cut'; })(),
        nameVis: (() => { const n = hdr.querySelector('[data-hdr-name]'); return !!(n && vis(n) && n.getBoundingClientRect().width > 1); })(),
        nameOut: (() => { const b = hdr.querySelector('[data-hdr-namebtn]'), n = hdr.querySelector('[data-hdr-name]'); if (!b || !n || !vis(n)) return 0; return Math.max(0, Math.round(n.getBoundingClientRect().right - b.getBoundingClientRect().right)); })(),
        //  4.23 3차 — 단추 묶음은 min-w-0 이라 묶음 상자보다 단추가 밖으로 나갈 수 있다(묶음 오른끝만 재면 놓친다) — 단추 각각의 오른끝
        btnR: Math.round(Math.max(0, ...[...row.lastElementChild.querySelectorAll('button')].filter((b) => vis(b) && !b.closest('[data-hdr-menu]')).map((b) => b.getBoundingClientRect().right))),
        spill, ell };
    };
    const SCN = [
      ['홈 · 조회만 · 호기 없음', { inspector: '클로드', route: { name: 'home' }, voyages: {}, workChoice: { mode: 'view' } }],
      ['항차 · 조회만 · 호기 없음', { inspector: '클로드', route: { name: 'voyage', voyageKey: v33.key, mode: 'discharge' }, voyages: { [v33.key]: v33 }, workChoice: { mode: 'view' } }],
      ['항차 · 작업자 · 1호기 · 변경', { inspector: '이인철', route: { name: 'voyage', voyageKey: v33.key, mode: 'discharge' }, voyages: { [v33.key]: v33 }, workChoice: { mode: 'work', voyageKey: v33.key }, equip: '1호기' }],
    ];
    const drawHead = async (w, mode, sc) => {
      await pg.setViewportSize({ width: w, height: 844 });
      await pg.evaluate(({ mode, sc }) => {
        try { if (sc.equip) localStorage.setItem('gm_equip_no', sc.equip); else localStorage.removeItem('gm_equip_no'); } catch (er) { /* 저장 막힘 */ }
        if (mode === 'large') document.documentElement.setAttribute('data-text', 'large'); else document.documentElement.removeAttribute('data-text');
        window.dispatchEvent(new CustomEvent('equipChanged', { detail: sc.equip || '' }));
        window.__R33.head(sc);
      }, { mode, sc: sc[1] });
      await sleep(250);
      return pg.evaluate(HM);
    };
    const hdrRows = [];
    for (const mode of ['normal', 'large']) {
      for (const sc of SCN) {
        const m = await drawHead(390, mode, sc);
        hdrRows.push({ w: 390, mode, sc: sc[0], m });
      }
    }
    const hdrBad = (w) => ({ m, sc }) => !m || m.overlap || m.right > w || m.hscroll || !m.verOk || m.verTxt !== verShort || m.h > 64 || m.spill.length || !m.hasEquip || !m.hasMenu
      || (/조회만/.test(sc) && !m.hasView) || (/변경/.test(sc) && !m.hasChange) || m.btnH.length < 3 || m.btnH.some((h) => Math.abs(h - m.btnH[0]) > 1)
      || (/항차/.test(sc) && !(m.vsl && m.vsl.full)) || m.voy === 'cut' || m.nameOut > 0 || (w < 400 && m.nameVis);   // 400px 미만은 이름 글자를 먼저 숨긴다(동그라미만)
    const badH = hdrRows.filter(hdrBad(390));
    ok(`⑤ 폰 390 머리띠 — 보통·크게 × 세 상태(홈 조회만 · 항차 조회만 · 항차 작업자) 전부 한 줄(높이 ${hdrRows.map((r) => r.m && r.m.h).join('/')}) · 칸 겹침 0 · 오른쪽 끝 ≤ 390 · 판 번호 «${verShort}» 다 보임 · 단추 ${hdrRows.map((r) => r.m && r.m.btnH.length).join('/')}개 높이 한 벌 · 선박 코드 다 보임 · 항차 번호 «…» 없음 · 조회만 칩·호기·변경·⋮ 그대로`,
      !badH.length, JSON.stringify(badH.map((r) => ({ mode: r.mode, sc: r.sc, m: r.m && { h: r.m.h, ov: r.m.overlap, right: r.m.right, ver: r.m.verTxt, verOk: r.m.verOk, spill: r.m.spill, btnH: r.m.btnH, vsl: r.m.vsl, voy: r.m.voy, nameOut: r.m.nameOut } }))).slice(0, 600));
    //  ⑤-2 갤럭시 폭 360 — 감사 실측 «크게 조회만·호기 → 제목 K… · 이름이 ⋮ 밑으로 33px» · «보통 조회만+1호기 이름 +12px» 를 막는다
    const SCN360 = [...SCN, ['항차 · 조회만 · 1호기', { inspector: '클로드', route: { name: 'voyage', voyageKey: v33.key, mode: 'discharge' }, voyages: { [v33.key]: v33 }, workChoice: { mode: 'view' }, equip: '1호기' }],
      ['홈 · 조회만 · 1호기', { inspector: '클로드', route: { name: 'home' }, voyages: {}, workChoice: { mode: 'view' }, equip: '1호기' }]];
    //  가장 넓은 실선박 코드 SWMM(굵은 글자 3.66em) — 412px 에서 이름이 펴지며 코드를 «SWM…» 로 밀지 않는가(제목 최소 폭 = 코드 폭)
    const vW = { ...v33, key: 'SWMM_2614N', info: { ...v33.info, vsl: 'SWMM' } };
    SCN360.push(['항차 · 조회만 · 1호기 · SWMM', { inspector: '클로드', route: { name: 'voyage', voyageKey: vW.key, mode: 'discharge' }, voyages: { [vW.key]: vW }, workChoice: { mode: 'view' }, equip: '1호기' }]);
    const rows360 = [];
    for (const w of [360, 412]) for (const mode of ['normal', 'large']) for (const sc of SCN360) rows360.push({ w, mode, sc: sc[0], m: await drawHead(w, mode, sc) });
    const bad360 = rows360.filter((r) => hdrBad(r.w)(r));
    const r360 = rows360.find((r) => r.w === 360 && r.mode === 'large' && r.sc === '항차 · 조회만 · 1호기').m || {};
    //  우선순위 «선박 코드·판 번호 > 항차 > 이름» — 412 크게 조회만+1호기에서 이름이 항차 번호를 밀어내지 않는다(이름이 먼저 접힌다)
    const r412 = rows360.find((r) => r.w === 412 && r.mode === 'large' && r.sc === '항차 · 조회만 · 1호기').m || {};
    if (!(r412.voy === 'full' && !r412.nameVis)) bad360.push({ w: 412, mode: 'large', sc: '우선순위(항차 > 이름)', m: r412 });
    ok(`⑤-2 폰 360·412 머리띠 — 보통·크게 × 여섯 상태(SWMM 포함) 전부 한 줄 · 겹침 0 · 오른쪽 끝 ≤ 폭 · 판 번호 다 보임 · 선박 코드 «${r360.vsl && r360.vsl.t}»·SWMM 다 보임(크게 조회만+1호기 제목 «${r360.title}») · 이름 글자는 단추 안(400px 미만은 동그라미만) · 항차 번호 «…» 없음 · 412 크게 조회만+1호기 항차 «${r412.voy}»·이름 ${r412.nameVis ? '펴짐' : '접힘'}(항차가 먼저) · 단추 높이 한 벌`,
      !bad360.length, JSON.stringify(bad360.map((r) => ({ w: r.w, mode: r.mode, sc: r.sc, m: r.m && { right: r.m.right, hscroll: r.m.hscroll, vsl: r.m.vsl, voy: r.m.voy, nameOut: r.m.nameOut, btnH: r.m.btnH, title: r.m.title } }))).slice(0, 600));
    //  ⑤-3 다섯 글자 이름 — 이름 접기·펴기가 되풀이되지 않는가(4.23 2차 재감사 중-1 실측: «김판석수석»·OBWH·4호기 400px 크게에서 15ms 마다 접힘↔펴짐,
    //      원인 — 이름 칸 max-w-[min(4.2em,100%)] 는 플렉스 고유 폭 계산에서 무시되어 «잰 폭(4.2em)» 과 «실제 폭(원폭)» 이 갈렸다)
    const SCN5 = [
      ['항차 · 작업자 · 4호기 · 변경 · 다섯 글자', { inspector: '김판석수석', route: { name: 'voyage', voyageKey: v33.key, mode: 'discharge' }, voyages: { [v33.key]: v33 }, workChoice: { mode: 'work', voyageKey: v33.key }, equip: '4호기' }],
      ['항차 · 조회만 · 4호기 · SWMM · 다섯 글자', { inspector: '김판석수석', route: { name: 'voyage', voyageKey: vW.key, mode: 'discharge' }, voyages: { [vW.key]: vW }, workChoice: { mode: 'view' }, equip: '4호기' }],
      ['항차 · 작업자 · 12호기 · SWMM · 다섯 글자', { inspector: '김판석수석', route: { name: 'voyage', voyageKey: vW.key, mode: 'discharge' }, voyages: { [vW.key]: vW }, workChoice: { mode: 'work', voyageKey: vW.key }, equip: '12호기' }],
      ['홈 · 조회만 · 영문 여덟 자', { inspector: 'INSPECTR', route: { name: 'home' }, voyages: {}, workChoice: { mode: 'view' } }],
    ];
    const flips = [];
    for (const w of [400, 408, 412, 416, 430, 432]) for (const mode of ['normal', 'large']) for (const sc of SCN5) {
      await drawHead(w, mode, sc);
      await sleep(150);
      const n = await pg.evaluate(() => new Promise((res) => {
        const b = document.querySelector('[data-hdr-namebtn]'); if (!b) { res(-1); return; }
        let c = 0; const mo = new MutationObserver((ms) => { c += ms.length; });
        mo.observe(b, { attributes: true, subtree: true, attributeFilter: ['class'] });
        setTimeout(() => { mo.disconnect(); res(c); }, 600);
      }));
      if (n !== 0) flips.push({ w, mode, sc: sc[0], n });
    }
    ok(`⑤-3 다섯 글자 이름·영문 여덟 자 × 400~432px × 보통·크게(${SCN5.length * 12}장면) — 이름 접기·펴기 되풀이 0`, !flips.length, JSON.stringify(flips).slice(0, 400));
    //  ⑤-4 360px 미만 폰(320~350 — 노안으로 «화면 크게» 를 켠 갤럭시가 이 폭이 된다) — 4.23 2차 재확인 실측 «320 크게 조회만+1호기 SWMM ⋮ 오른끝 323px · 가로 4px 밀림»
    const SCN320 = [...SCN360,
      ['항차 · 작업자 · 5호기 · 변경 · SWMM', { inspector: '이종부', route: { name: 'voyage', voyageKey: vW.key, mode: 'discharge' }, voyages: { [vW.key]: vW }, workChoice: { mode: 'work', voyageKey: vW.key }, equip: '5호기' }],
      ['항차 · 조회만 · 5호기 · SWMM · 다섯 글자', { inspector: '김판석수석', route: { name: 'voyage', voyageKey: vW.key, mode: 'discharge' }, voyages: { [vW.key]: vW }, workChoice: { mode: 'view' }, equip: '5호기' }]];
    const rows320 = [];
    for (const w of [320, 330, 340, 350]) for (const mode of ['normal', 'large']) for (const sc of SCN320) rows320.push({ w, mode, sc: sc[0], m: await drawHead(w, mode, sc) });
    const bad320 = rows320.filter((r) => hdrBad(r.w)(r) || !r.m || r.m.btnR > r.w);
    const r320 = rows320.find((r) => r.w === 320 && r.mode === 'large' && r.sc === '항차 · 조회만 · 1호기 · SWMM').m || {};
    ok(`⑤-4 폰 320~350 머리띠 — 보통·크게 × 여덟 상태(SWMM 조회만·작업자 포함, ${rows320.length}장면) 오른쪽 끝 ≤ 폭 · 가로 밀림 0 · 선박 코드·판 번호 다 보임 · 단추 높이 한 벌 (320 크게 SWMM 조회만+1호기 단추 오른끝 ${r320.btnR}px · 단추 높이 ${r320.btnH && r320.btnH.join('/')})`,
      !bad320.length, JSON.stringify(bad320.map((r) => ({ w: r.w, mode: r.mode, sc: r.sc, m: r.m && { right: r.m.right, btnR: r.m.btnR, hscroll: r.m.hscroll, vsl: r.m.vsl, voy: r.m.voy, btnH: r.m.btnH, ov: r.m.overlap } }))).slice(0, 600));
    const hv = hdrRows.find((r) => r.mode === 'large' && /항차 · 조회만/.test(r.sc)).m || { title: '(머리띠 표식 없음)', verPx: 0, equipW: 0 };
    ok(`⑥ 4.22-04 폰 조회만 «T.» 잘림 해소 — 크게 · 항차 · 조회만 제목 «${hv.title}» (판 번호 ${hv.verPx}px · 호기 미지정 단추 폭 ${hv.equipW}px = 아이콘만)`,
      hv.title.startsWith(String(v33.info.vsl)) && hv.title.includes(verShort) && hv.verPx >= 14 && hv.equipW > 0 && hv.equipW <= 48, JSON.stringify(hv).slice(0, 300));
    //  컴 — 홈은 «TallyOne 4.xx» · 항차는 선박명 항차 · 선사 + 판 번호
    const pcHome = (await drawHead(1440, 'large', SCN[0])) || { title: '(머리띠 표식 없음)', overlap: 1 };
    const pcVoy = (await drawHead(1440, 'large', SCN[2])) || { title: '(머리띠 표식 없음)', overlap: 1 };
    const voyL = String(v33.info.voy_d || v33.info.voy || '');
    ok(`⑦ 컴 1440 머리띠 — 홈 «${pcHome.title}» · 항차 «${pcVoy.title}» (판 번호 ${pcVoy.verPx}px) · 겹침 0`,
      new RegExp(`^TallyOne ${verShort.replace(/[.]/g, '\\.')}\\b`).test(pcHome.title) && /그린마린 검수팀 전용/.test(pcHome.title) && pcVoy.title.includes(String(v33.info.vsl)) && pcVoy.title.includes(voyL) && pcVoy.title.includes(verShort) && !pcHome.overlap && !pcVoy.overlap,
      JSON.stringify({ pcHome: pcHome.title, pcVoy: pcVoy.title, voyL }));
    //  ⋮ 메뉴 — 아홉 항목 그대로 · 판 번호 줄 없음 · 폰 화면 안
    await drawHead(390, 'large', SCN[1]);
    if (await pg.$('header button[aria-label="메뉴"]')) { await pg.click('header button[aria-label="메뉴"]'); await sleep(200); }
    const menu = await pg.evaluate(() => { const m = document.querySelector('[data-hdr-menu]'); if (!m) return null; const r = m.getBoundingClientRect(); return { items: [...m.querySelectorAll('button')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()), left: Math.round(r.left), right: Math.round(r.right), text: m.innerText }; });
    const WANT = ['사용 매뉴얼', '화면 · 소리 · 글자', 'AI 검색 키', '개발 요청', '데미지 예약', '보조기능', '인원 관리', '로그아웃', '앱 종료'];
    ok(`⑧ ⋮ 메뉴 아홉 항목 그대로(${menu ? menu.items.length : 0}) · «화면 · 소리 · 글자» · 판 번호 줄 없음 · 폰 390 화면 안(${menu && menu.left}~${menu && menu.right})`,
      !!menu && menu.items.length === 9 && WANT.every((w) => menu.items.some((t) => t.includes(w))) && !menu.text.includes(verShort) && menu.left >= 0 && menu.right <= 390, JSON.stringify(menu).slice(0, 300));
    if (menu) await pg.click('header button[aria-label="메뉴"]').catch(() => {});
    await pg.evaluate(() => { const ov = document.querySelector('header .fixed.inset-0.z-40'); if (ov) ov.click(); });

    //  항차 화면 — 폰 390 크게에서 독 여섯 칸·양하/선적 전환·진행 줄이 넘치지 않는다
    const voyRows = [];
    //  4.23 2차(감사 — ≤340px 크게 «작업 시작» 넘침 · ≤339 −.06em 이 크게 규칙에 밀림): 390 에 더해 360·340 폭도 잰다.
    //    칸 넘침은 scrollWidth(1px 너그러움) 말고 **글자 폭(Range) ≤ 칸 폭**으로도 본다 — 390 크게 1차 판은 52.3 > 51 이었다.
    for (const [w, mode] of [[390, 'normal'], [390, 'large'], [360, 'normal'], [360, 'large'], [340, 'normal'], [340, 'large']]) {
      await pg.setViewportSize({ width: w, height: 844 });
      await pg.evaluate(({ json, key, mode }) => { if (mode === 'large') document.documentElement.setAttribute('data-text', 'large'); else document.documentElement.removeAttribute('data-text'); window.__R33.voy(json, key, 'discharge'); }, { json: JSON.stringify(v33), key: v33.key, mode });
      await sleep(900);
      voyRows.push({ w, mode, m: await pg.evaluate(() => {
        const over = (el) => el.scrollWidth > el.clientWidth + 1;
        const textOver = (el) => { const rg = document.createRange(); rg.selectNodeContents(el); return rg.getBoundingClientRect().width > el.clientWidth + 0.5; };
        const tabs = [...document.querySelectorAll('#root .hud-tab')]; const segs = [...document.querySelectorAll('#root .seg-btn')];
        const hero = [...document.querySelectorAll('#root .hero-card *')].filter((el) => !el.children.length && /\d+\s*\/\s*\d+/.test(el.textContent || ''));
        const heroOver = [...document.querySelectorAll('#root .hero-card *')].filter((el) => getComputedStyle(el).whiteSpace === 'nowrap' && over(el)).map((el) => el.textContent.trim().slice(0, 20));
        return { tabs: tabs.length, tabFs: tabs.length ? parseFloat(getComputedStyle(tabs[0]).fontSize) : 0, tabOver: tabs.filter((t) => over(t) || textOver(t)).map((t) => t.textContent.trim()), segs: segs.length, segOver: segs.filter(over).map((t) => t.textContent.trim()),
          hero: hero.map((h) => h.textContent.trim()).slice(0, 2), heroOver, hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          dockRight: tabs.length ? Math.round(Math.max(...tabs.map((t) => t.getBoundingClientRect().right))) : 0 };
      }) });
    }
    const vb = voyRows.filter(({ w, m }) => m.tabs !== 6 || m.tabOver.length || m.segs !== 2 || m.segOver.length || !m.hero.length || m.heroOver.length || m.hscroll || m.dockRight > w);
    const vl = voyRows.find((r) => r.w === 390 && r.mode === 'large').m;
    ok(`⑨ KBTR 2608E 양하 항차 화면 폰 390·360·340 — 보통·크게 독 6칸 넘침 0(글자 폭 ≤ 칸 폭 · 크게 ${voyRows.filter((r) => r.mode === 'large').map((r) => `${r.w} ${r.m.tabFs}px`).join(' · ')}) · 양하/선적 전환 넘침 0 · 진행 줄 «${vl.hero[0] || '?'}» 넘침 0 · 가로 스크롤 없음`,
      !vb.length && vl.tabFs === 13, JSON.stringify(vb.map((r) => ({ w: r.w, mode: r.mode, tabOver: r.m.tabOver, segOver: r.m.segOver, heroOver: r.m.heroOver, hscroll: r.m.hscroll, dockRight: r.m.dockRight }))).slice(0, 500));
    //  미르 «글자 크게» — 이 화면(검수앱 CSS)에서 실제로 바뀐다
    const dev = await pg.evaluate(() => { document.documentElement.removeAttribute('data-text'); const msg = window.__R33.runDeviceCmd({ kind: 'text', to: 2 }); return { msg, attr: document.documentElement.getAttribute('data-text'), sm: getComputedStyle(document.documentElement).getPropertyValue('--fs-sm').trim() }; });
    ok(`⑩ 미르 «글자 크게» → <html data-text="${dev.attr}"> · 본문 변수 ${dev.sm} («${dev.msg}»)`, dev.attr === 'large' && dev.sm === '1rem' && /크게/.test(dev.msg), JSON.stringify(dev));
    ok('⑪ 그리는 동안 페이지 오류 0', !perr.length, perr.join(' | ').slice(0, 300));
  } finally {
    await browser.close().catch(() => {});
  }
};

//  단독 실행 — node tools/regress_r33_textmode.cjs <저장소 루트>
if (require.main === module) {
  const ROOT = path.resolve(process.argv[2] || process.cwd());
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'r33_'));
  let n = 0, bad = 0;
  const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
  const head = (t, f) => { console.log(`■ ${t}`); console.log(`  (출처 ${f})`); };
  const fx = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures', f), 'utf8'));
  module.exports({ ROOT, TMP, ok, head, fx, stub: './tools/stub_fbdb_mem.js', css: process.argv[3] ? path.resolve(process.argv[3]) : '' })
    .then(() => { console.log(`\nR33 ${n - bad}/${n}`); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ } process.exit(bad ? 1 : 0); })
    .catch((e) => { console.error('✗ R33 오류', e && e.stack || e); process.exit(1); });
}
