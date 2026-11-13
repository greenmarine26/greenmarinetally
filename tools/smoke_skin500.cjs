// 5.00 화면 고르기 연막검사 — 세 안(1 어두운 고대비 · 2 밝은 간결 · 3 큰 글자 현장) × 컴 1440 · 폰 390 으로 주요 화면을 실제 크로뮴에 그려 잰다.
//   검수사 2026-11-12 20:33 «시인성이 뛰어나야 하고 보기도 좋아야 합니다 … 화면마다 조금씩 이질감이 들어서 입니다» · 20:40 «화면을 고르는것도 1안 2안 3안» · 20:45 «최상품을 만들어 주세요».
//   본다 — ① 그린 화면마다 오류 0 · ② 12px 아래 글자 0(그림 칸 .fs-keep · FitBox 안 · svg 제외) · ③ 글자 대비 AA(4.5 · 큰 글자 3) · 컨 번호(.cn)는 AAA(7)
//          ④ 누르는 자리 44px 이상(보이는 크기 또는 ::after 로 넓힌 자리) · ⑤ 크게 모드가 1·2안에서 글자를 키운다 · ⑥ 단추 순서·이름이 안을 바꿔도 그대로(안 고르기 전과 같다)
//          ⑦ 컨 번호 한 벌(CnText) — 작업 카드·컨 상세·목록이 같은 세 덩어리 표기 · ⑧ 실 Firebase·외부로 나가는 요청 0.
//   실행 — node tools/smoke_skin500.cjs <빌드 CSS 경로>   (build.sh 는 $BUILT_CSS 를 넘긴다)
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const CSS = process.argv[2] ? path.resolve(process.argv[2]) : '';
const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } });
let pass = 0, fail = 0;
const ok = (m, c, d = '') => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c || !d ? '' : `\n      → ${String(d).slice(0, 400)}`)); if (c) pass++; else fail++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log('5.00 화면 고르기 — 세 안 × 컴·폰 주요 화면');
  if (!CSS || !fs.existsSync(CSS)) { ok('빌드 CSS 가 있다 — 없으면 화면을 잴 수 없다', false, CSS || '인자 없음'); process.exit(1); }
  let pw = null;
  for (const p of [path.join(ROOT, 'node_modules/playwright'), 'playwright', '/opt/node-tools/node_modules/playwright', '/opt/npm-tools/node_modules/playwright']) { try { pw = require(p); break; } catch (e) { /* 다음 자리 */ } }
  if (!pw || !CHROME) { ok('playwright·크로뮴이 있다 — 모양을 잴 수 없으면 올리지 않는다', false, `${!!pw} · ${CHROME || '없음'}`); process.exit(1); }

  //  소스 — 세 안이 화면 코드 한 벌(변수만)인지 · 켜는 곳 한 곳인지 · 컨 번호 한 벌인지
  const css = fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf8');
  const skinJs = fs.readFileSync(path.join(ROOT, 'src/skin.js'), 'utf8');
  ok('세 안은 index.css 변수 블록 :root[data-skin="1|2|3"] 셋으로만 갈린다', ['1', '2', '3'].every((n) => css.includes(`:root[data-skin="${n}"]`)));
  const setters = execSync(`grep -rln "setAttribute('data-skin'" src || true`, { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
  ok(`html data-skin 을 거는 곳은 skin.js 한 곳(${setters.join(', ')})`, setters.length === 1 && setters[0] === 'src/skin.js');
  ok('기본값 — 저장 없으면 1안(종전 밝기 4 기기는 2안)', /return getBrightness\(\) === 4 \? 2 : 1;/.test(skinJs));
  const pairSrc = execSync(`grep -rnE "cn\\??\\.slice\\(0, *-4\\)\\}|>\\{[A-Za-z_.?]*\\.l4 \\|\\| [A-Za-z_.?]*\\.cn\\?\\.slice\\(-4\\)\\}<" src --include=*.jsx || true`, { cwd: ROOT }).toString().trim();
  ok('경고 띠 문장 속 컨 번호도 한 벌 — DiagnosticsPanel 이 alert.msg 를 CnInline 으로 그린다(5.00-02 · OBWH 2791E «… CICU3004578, CICU3006863»)', /<CnInline text=\{alert\.msg\}/.test(fs.readFileSync(path.join(ROOT, 'src/components/DiagnosticsPanel.jsx'), 'utf8')) && /export function CnInline/.test(fs.readFileSync(path.join(ROOT, 'src/components/CnText.jsx'), 'utf8')));
  ok('끝 4자리만 크게·앞 7자리 작게 그리던 자리 0(CnText 한 벌로)', !pairSrc, pairSrc.split('\n').slice(0, 4).join(' | '));

  let genOk = true; try { execSync('node tools/gen_skin_text.cjs', { cwd: ROOT, stdio: 'pipe' }); } catch (e) { genOk = false; }
  ok('세 안 글자색 보정(src/skinText.css)이 생성기(tools/gen_skin_text.cjs)와 같다 — 새 글자색 클래스가 보정 밖으로 새지 않게', genOk);
  //  하네스 번들 — 메모리 스텁(tools/stub_fbdb_mem.js)
  const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'skin500-'));
  const stub = './tools/stub_fbdb_mem.js';
  const o = path.join(TMP, 'h.js');
  execSync(`npx esbuild tools/smoke_skin500.jsx --bundle --format=iife --loader:.jsx=jsx --loader:.js=jsx --loader:.png=dataurl --loader:.json=json --jsx=automatic --external:fs --external:path --external:url --alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --alias:pdfjs-dist/build/pdf=${ROOT}/tools/stub_pdfjs.js --define:global=window --define:import.meta.env='{"BASE_URL":"./"}' --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
  const fx = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures', f), 'utf8'));
  const F = fx('chief424_board.json'), H = fx('home425.json'), W = fx('work42502_obwh.json');
  const NOW = F.now;
  const VOY = {};
  for (const [k, v] of Object.entries(F.voyages)) { const c = JSON.parse(JSON.stringify(v)); const rm = (H.raw_meta || {})[k]; if (rm) for (const m of Object.keys(rm)) if (c[m]) c[m].raw = rm[m]; VOY[k] = c; }
  Object.assign(VOY, JSON.parse(JSON.stringify(H.add_voyages)));
  VOY[W.key] = { key: W.key, info: W.info, discharge: { ...W.discharge, completed: {} }, loading: { ...W.loading, completed: {} } };
  const INSP = { 최관식: { name: '최관식', lastActive: NOW - 10000, lastVoyage: 'ATPR_2645E', lastMode: 'discharge', workMode: 'work', loggedIn: true }, 김성일: { name: '김성일', lastActive: NOW - 5000, loggedIn: true } };
  const seed = path.join(TMP, 'seed.js');
  fs.writeFileSync(seed, `window.global = window; window.__memdb = ${JSON.stringify({ voyages: VOY, lane_info: H.lane_info, shipPolicies: H.shipPolicies, feedback: F.feedback || {}, pier_coords: H.pier_coords, ship_bay_dict_v3: W.shipDict })}; window.__fbShipBayDict = ${JSON.stringify(W.shipDict)};`);
  const html = path.join(TMP, 'h.html');
  fs.writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="file://${CSS}"></head><body class="bg-ink-950 text-dim-100"><div id="root"></div><script src="file://${seed}"></script><script src="file://${o}"></script></body></html>`);
  const cardCn = Object.keys(W.discharge.ediContainers).find((k) => W.discharge.ediContainers[k].rf);
  const base = { voyages: VOY, inspectors: INSP, hb: F.collector_heartbeat, pm: H.port_mis_data, pf: H.pilot_forecast };
  const SCREENS = [
    ['로그인', 'login', {}, []],
    ['홈', 'home', {}, []],
    ['항차 양하', 'voyage', { voyKey: W.key, mode: 'discharge' }, ['^나중에$']],
    ['베이 화면', 'voyage', { voyKey: W.key, mode: 'discharge' }, ['^나중에$', 'TAB:베이']],
    ['작업 카드(자동 가이드)', 'voyage', { voyKey: W.key, mode: 'discharge' }, ['^나중에$', 'TAB:작업 시작', '자동 가이드', '^B5', '데크', '^나중에$']],
    ['컨 상세', 'card', { voyKey: W.key, mode: 'discharge', cn: cardCn }, []],
    ['전역 검색', 'search', { q: cardCn.slice(-4) }, []],
    ['수석 상황판', 'chief', {}, []],
    //  5.00-01 — 수석 상황판 배 카드를 크게(컴 ⤢ 크게 · 폰 ▸ 펼침) — 미니 막대 이름표가 «양/하»로 꺾이지 않는다
    ['수석 상황판 크게', 'chief', {}, ['^⤢ ?크게$|^DXQD2640E / 2640W ·']],
    //  5.00-01 — 경고 띠 «예상 실오류» 펼침 — 안의 컨 번호도 CnText 한 벌(대비 AAA 는 ③ 이 잰다)
    ['경고 띠 펼침', 'voyage', { voyKey: W.key, mode: 'discharge' }, ['^나중에$', '예상 실오류']],
    ['보조기능', 'aux', {}, []],
    ['화면 고르기 창', 'display', {}, []],
    ['새 판 첫 안내', 'intro', {}, []],
    ['확인 창', 'confirm', {}, []],
    ['빈 홈(항차 없음)', 'empty', {}, []],
    ['오류 화면', 'crash', {}, []],
    ['알림 띠', 'toast', {}, []],
    //  5.00 재감사 — 그라데이션이던 것들: 로그인 [OOO 님으로 시작] 단추(작업자를 고른 뒤) · 새 버전 띠 · 인사 창 둘(로그인·로그아웃)
    ['로그인(작업자 고름)', 'login', {}, ['김성일']],
    ['새 버전 띠', 'update', {}, []],
    ['인사 창(로그인)', 'greet', { gtype: 'login' }, []],
    ['인사 창(로그아웃)', 'greet', { gtype: 'logout' }, []],
    //  5.00 2차 — 주요 15화면 밖도 같은 잣대로(2안 어두운 바탕 위 글자 · 단추 겹침)
    ['항차 선적', 'voyage', { voyKey: W.key, mode: 'loading' }, ['^나중에$']],
    ['베이뷰 고르기', 'voyage', { voyKey: W.key, mode: 'discharge' }, ['^나중에$', 'TAB:작업 시작', '^베이뷰 작업']],
    ['항차 올리기 탭', 'voyage', { voyKey: W.key, mode: 'discharge' }, ['^나중에$', 'TAB:업로드']],
    ['항차 더보기', 'voyage', { voyKey: W.key, mode: 'discharge' }, ['^나중에$', 'TAB:더보기']],
    ['출력 센터 창', 'voyage', { voyKey: W.key, mode: 'discharge' }, ['^나중에$', 'TAB:출력']],
    ['수석 진행·마감', 'chief', {}, ['진행·마감']],
    ['관리 화면', 'owner', {}, []],
    ['항차 건강 점검', 'health', {}, []],
    ['자료 센터', 'data', {}, []],
    ['사용 매뉴얼 창', 'help', {}, []],
  ];
  const SKINS = { 1: { 'data-skin': '1' }, 2: { 'data-skin': '2', 'data-bright': '4' }, 3: { 'data-skin': '3', 'data-text': 'large' } };

  const MEASURE = () => {
    const vis = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none' && parseFloat(s.opacity) > 0.05; };
    const inDrawing = (el) => !!el.closest('.fs-keep, svg, [data-fitbox], canvas, [aria-hidden="true"]');
    const parse = (c) => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const mix = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
    //  바탕 후보들 — 그라데이션이면 정지색 하나하나를 바탕 후보로 둔다(5.00 감사: 종전엔 그라데이션을 건너뛰어 주 단추를 못 잡았다). 대비는 후보 중 가장 나쁜 것으로 잰다.
    const bgsOf = (el) => { const st = []; let grad = null; let e = el; while (e) { const s = getComputedStyle(e); if (!grad && s.backgroundImage && /gradient/.test(s.backgroundImage)) { grad = (s.backgroundImage.match(/rgba?\([^)]*\)/g) || []).map(parse).filter(Boolean); if (grad.length) { st.push({ grad }); break; } } const c = parse(s.backgroundColor); if (c && c.a > 0) { st.push(c); if (c.a >= 0.99) break; } e = e.parentElement; } let base = parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 }; if (base.a < 1) base = mix(base, { r: 255, g: 255, b: 255, a: 1 }); let outs = [base]; for (let i = st.length - 1; i >= 0; i--) { const L = st[i]; outs = L.grad ? outs.flatMap((b) => L.grad.map((g) => mix(g, b))) : outs.map((b) => mix(L, b)); } return outs; };
    const opac = (el) => { let o = 1, e = el; while (e) { o *= parseFloat(getComputedStyle(e).opacity); e = e.parentElement; } return o; };
    const all = [...document.querySelectorAll('body *')].filter((el) => !/^(SCRIPT|STYLE|LINK)$/.test(el.tagName) && vis(el));
    const tiny = [], low = [], cnLow = [], small = [], btns = [], wrap = [];
    for (const el of all) {
      const s = getComputedStyle(el);
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
      const dr = inDrawing(el);
      //  그림 글자(이모지·기호만 있는 글)는 글자색이 아니라 그림 자체 색으로 그려진다 — 대비 잣대 밖(작은 글자 잣대는 그대로 본다)
      const pictOnly = /^[\p{Extended_Pictographic}\uFE0F\u200D\s✓✔✕×·▾▴◀▶→←↑↓⇄]+$/u.test(own);
      if (own && !dr) {
        const f = parseFloat(s.fontSize);
        if (f < 11.95) tiny.push(`${f}px «${own.slice(0, 14)}»`);
        //  5.00-01: 두 글자 낱말(양하·선적)이 좁은 칸에서 «양/하»로 꺾이면 안 된다
        if (/^(양하|선적)$/.test(own)) { const tops = new Set(); for (const tn of el.childNodes) { if (tn.nodeType !== 3 || !tn.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(tn); for (const q of rg.getClientRects()) if (q.width > 0) tops.add(Math.round(q.top)); } if (tops.size > 1) wrap.push(`«${own}» ${Math.round(el.getBoundingClientRect().width)}px 칸에서 ${tops.size}줄`); }   // 글자(텍스트 노드) 줄 수로 잰다 — 칸 높이·아이콘 줄은 안 센다
        const dis = !!el.closest('[disabled], [aria-disabled="true"]') || opac(el) < 0.95;
        const fg = parse(s.color); const bgs = bgsOf(el);
        if (fg && fg.a > 0.05 && bgs.length && !dis && !pictOnly) {
          const cr = Math.min(...bgs.map((b2) => { const fg2 = mix(fg, b2); const L1 = lum(fg2), L2 = lum(b2); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); }));
          const big = f >= 24 || (f >= 18.66 && parseInt(s.fontWeight, 10) >= 700);
          if (cr < (big ? 3 : 4.5) - 0.005) low.push(`${cr.toFixed(2)} ${f}px «${own.slice(0, 14)}»`);
          if (el.closest('.cn') && cr < 7 - 0.005) cnLow.push(`${cr.toFixed(2)} «${own}»`);
        }
      }
      if ((el.tagName === 'BUTTON' || el.getAttribute('role') === 'tab') && !dr && !el.disabled) {
        const r = el.getBoundingClientRect(); const a = getComputedStyle(el, '::after');
        const hit = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hit')) || 0;
        //  실제로 넓힌 자리(::after 의 계산된 top·bottom·left·right — 이웃 쪽은 넓히지 않으므로 방향마다 다르다)
        const expand = a.content && a.content !== 'none' && a.position === 'absolute';
        const px = (v) => (parseFloat(v) || 0);
        const h = expand ? Math.max(r.height, r.height - px(a.top) - px(a.bottom)) : r.height;
        const w = expand ? Math.max(r.width, r.width - px(a.left) - px(a.right)) : r.width;
        //  기준 — 높이 44(장갑 손가락) · 너비 24(WCAG 2.5.8 — 가로로 촘촘히 붙은 칩은 이웃을 덮지 않으려 가로로 넓히지 않는다)
        if (h < 43.5 || w < 23.5) small.push(`${Math.round(r.width)}x${Math.round(r.height)} «${el.textContent.replace(/\s+/g, ' ').trim().slice(0, 14)}»`);
      }
      if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'tab') btns.push(el.textContent.replace(/\s+/g, ' ').trim().slice(0, 30));
    }
    //  ⑨ 누르는 자리 겹침 — 단추·입력칸 한가운데를 누르면 그 단추(또는 그 안)가 눌리는가(넓힌 ::after 가 이웃을 덮지 않는가)
    const miss = [];
    const vw = innerWidth, vh = innerHeight;
    for (const el of all) {
      if (!(el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.getAttribute('role') === 'tab') || inDrawing(el)) continue;
      const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (x < 1 || y < 1 || x > vw - 1 || y > vh - 1) continue;
      //  가려진 것은 뺀다 — 굴리는 칸 밖으로 잘린 줄 · 전체 화면 창(fixed) 밑에 깔린 화면
      let clipped = false; for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const ps = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(ps.overflow + ps.overflowY + ps.overflowX)) { const q = p.getBoundingClientRect(); if (x < q.left || x > q.right || y < q.top || y > q.bottom) { clipped = true; break; } } }
      if (clipped) continue;
      const hit = document.elementFromPoint(x, y);
      //  붙박이(fixed·sticky — 전체 화면 창 · 바닥 확인 줄) 밑에 깔린 것은 굴려야 보이는 것이라 뺀다
      let cover = null; for (let q = hit; q && q !== document.body; q = q.parentElement) { const ps = getComputedStyle(q).position; if (ps === 'fixed' || ps === 'sticky') { cover = q; break; } }
      if (hit && cover && !cover.contains(el)) continue;
      //  가장자리 2px 안쪽 네 점도 그 단추가 눌려야 한다(넓힌 이웃 자리에 먹히지 않는가)
      const edges = [[r.left + 2, y], [r.right - 2, y], [x, r.top + 2], [x, r.bottom - 2]].filter(([ex, ey]) => ex > 0 && ey > 0 && ex < vw && ey < vh);
      const pinned = (h2) => { for (let q = h2; q && q !== document.body; q = q.parentElement) { const ps = getComputedStyle(q).position; if ((ps === 'fixed' || ps === 'sticky') && !q.contains(el)) return true; } return false; };   // 떠 있는 띠·창(새 버전 띠 등)이 덮은 것은 굴리거나 닫아야 보이는 것이라 뺀다
      const eBad = r.width >= 8 && r.height >= 8 ? edges.map(([ex, ey]) => document.elementFromPoint(ex, ey)).find((h2) => h2 && !(h2 === el || el.contains(h2)) && h2.closest('button, [role="tab"], input') && !h2.contains(el) && !pinned(h2)) : null;
      //  입력칸 안에 얹은 단추(지우기·마이크 — absolute 로 칸 안 오른쪽에 둔 것)는 칸 가장자리를 나눠 쓰도록 만든 것이라 뺀다
      if (eBad && el.tagName === 'INPUT' && (() => { for (let q = eBad; q && q !== document.body; q = q.parentElement) if (getComputedStyle(q).position === 'absolute') return true; return false; })()) { /* 칸 안 단추(absolute 묶음으로 칸 안에 얹은 것) */ }
      else       if (eBad && hit && (hit === el || el.contains(hit))) miss.push(`${el.tagName}«${(el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 12)}» 가장자리→${eBad.tagName}«${(eBad.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 10)}»`);
      if (!hit || !(hit === el || el.contains(hit))) miss.push(`${el.tagName}«${(el.textContent || el.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 12)}»→${hit ? hit.tagName + '«' + (hit.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 10) + '»' : '없음'}`);
    }
    const gradN = document.querySelectorAll('[class*="bg-gradient-to-"]').length;
    return { gradN, miss, wrap, nodes: all.length, tiny, low, cnLow, small, btns, cnN: document.querySelectorAll('.cn .cn-l').length, fsSm: getComputedStyle(document.documentElement).getPropertyValue('--fs-sm').trim() };
  };

  const browser = await pw.chromium.launch({ executablePath: CHROME });
  const net = [];
  const render = async (w, h, attrs, scr, extra, acts) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, timezoneId: 'Asia/Seoul', locale: 'ko-KR', reducedMotion: 'reduce' });   /* 5.00-02: 깜빡임(animate-pulse) 도중의 투명도를 대비로 재지 않게 — 새 버전 띠가 4.24↔통과로 흔들렸다 */
    await ctx.route(/^https?:/, (rt) => { const rq = rt.request(); if (rq.method() !== 'GET' && !(scr === 'crash' && /claude_inbox/.test(rq.url()))) net.push(rq.method() + ' ' + rq.url().slice(0, 80)); return rt.abort(); });   // 바깥 요청은 전부 막는다(읽기도 닿지 않는다) · 쓰기 시도는 하나도 없어야 한다
    await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}'; document.head.appendChild(st); }); });   /* 5.00-02: animate-pulse 깜빡임 중간 투명도를 대비로 재지 않게(새 버전 띠 4.24↔통과로 흔들림) — 색 판정은 그대로 */
    const pg = await ctx.newPage(); const errs = [];   // 오류 화면(crash)은 ErrorBoundary 가 크래시 보고(claude_inbox POST)를 시도한다 — 본디 동작이라 ⑧ 에서 빼고, 막혀서 닿지 않는다
    pg.on('pageerror', (er) => errs.push(String(er).slice(0, 160)));
    pg.on('dialog', (d) => d.dismiss().catch(() => {}));
    await pg.addInitScript(() => { try { localStorage.setItem('gm_equip_no', '1호기'); localStorage.setItem('master_active_inspector_v1', '김성일'); } catch (er) { /* 저장 막힘 */ } });
    await pg.clock.setFixedTime(new Date(NOW));
    await pg.goto('file://' + html); await sleep(150);
    await pg.evaluate((a) => { for (const [k, v] of Object.entries(a)) document.documentElement.setAttribute(k, v); }, attrs);
    await pg.evaluate(({ scr, p }) => window.__H.mount(scr, p), { scr, p: { ...base, ...extra } }).catch((er) => errs.push('그리기 ' + String(er).slice(0, 120)));
    await sleep(700);
    for (const a of acts) {
      const isTab = a.startsWith('TAB:'); const re = isTab ? a.slice(4) : a;
      const hit = await pg.evaluate(({ re, isTab }) => { const R = new RegExp(re); const xs = [...document.querySelectorAll(isTab ? 'button[role="tab"]' : 'button')].filter((b) => R.test(b.textContent.replace(/\s+/g, ' ').trim()) && !b.disabled && b.getBoundingClientRect().height > 0); if (xs[0]) { xs[0].click(); return true; } return false; }, { re, isTab });
      if (!hit && !/나중에/.test(a)) errs.push('못 누름 ' + a);
      await sleep(450);
    }
    const m = await pg.evaluate(MEASURE);
    //  5.00-02 수석 상황판 미르 줄 — 탭 앞 빈 칸에 서 있고(높이 44 이상 · 오른쪽 끝이 화면 안) 누르면 미르 시트 여닫이를 부른다
    let mirBar = null;
    if (scr === 'chief') mirBar = await pg.evaluate(async () => { const b = document.querySelector('button[data-chief-mir="1"]'); const t = document.querySelector('[data-chief-tabs="1"]'); if (!b) return { found: false }; const r = b.getBoundingClientRect(), tr = t ? t.getBoundingClientRect() : null; b.click(); await new Promise((z) => setTimeout(z, 50)); return { found: true, h: Math.round(r.height), w: Math.round(r.width), right: Math.round(r.right), vw: innerWidth, beforeTabs: !!t && t.contains(b) && r.top >= tr.top - 1 && r.bottom <= tr.bottom + 1, opened: (window.__mirOpened || []).join(',') }; });
    await ctx.close();
    return { ...m, errs, mirBar };
  };

  const fails = { err: [], tiny: [], low: [], cn: [], small: [], order: [], miss: [], wrap: [] };
  const base0 = {}, baseMiss = {}; let gradSeen = 0; let mirSeen = 0;
  for (const [w, h, tag] of [[1440, 900, '컴'], [390, 844, '폰']]) {
    for (const [nm, scr, extra, acts] of SCREENS.filter((x) => !process.env.SKIN500_ONLY || process.env.SKIN500_ONLY.split(',').includes(x[0]))) {   // 단독 확인용 — 화면 몇 개만
      //  안 고르기 전(종전 화면)의 단추 순서 — 기준
      if (!['display', 'intro', 'crash'].includes(scr)) { const r0 = await render(w, h, {}, scr, extra, acts); base0[`${tag}${nm}`] = r0.btns; baseMiss[`${tag}${nm}`] = r0.miss; }
      for (const [n, attrs] of Object.entries(SKINS)) {
        const m = await render(w, h, attrs, scr, extra, acts);
        const k = `${n}안 ${tag} ${nm}`;
        gradSeen += m.gradN || 0;
        if (process.env.SKIN500_DEBUG) console.log(`    · ${k} 요소 ${m.nodes} · 작은 글자 ${m.tiny.length} · 대비 ${m.low.length} · 작은 단추 ${m.small.length} · 오류 ${m.errs.length}`);
        const errs = scr === 'crash' ? m.errs.filter((x) => !/일부러 낸 오류/.test(x)) : m.errs;   // 오류 화면은 일부러 낸 오류만 빼고 본다
        if (errs.length) fails.err.push(`${k}: ${errs[0]}`);
        if (m.tiny.length) fails.tiny.push(`${k}: ${m.tiny.length}개 ${m.tiny.slice(0, 3).join(' ')}`);
        if (m.wrap && m.wrap.length) fails.wrap.push(`${k}: ${m.wrap.slice(0, 3).join(' ')}`);
        if (m.low.length) fails.low.push(`${k}: ${m.low.length}개 ${m.low.slice(0, 3).join(' ')}`);
        if (m.cnLow.length) fails.cn.push(`${k}: ${m.cnLow.slice(0, 2).join(' ')}`);
        if (m.small.length) fails.small.push(`${k}: ${m.small.length}개 ${m.small.slice(0, 3).join(' ')}`);
        const mb = baseMiss[`${tag}${nm}`];
        if (mb) { const added = m.miss.filter((x) => !mb.includes(x)); if (added.length) fails.miss.push(`${k}: ${added.length}개 ${added.slice(0, 3).join(' ')}`); }
        const b0 = base0[`${tag}${nm}`];
        if (b0 && JSON.stringify(b0) !== JSON.stringify(m.btns)) fails.order.push(`${k}: 기준 ${b0.length}개 · 이 안 ${m.btns.length}개`);
        if (scr === 'voyage' && /작업 카드/.test(nm)) ok(`⑦ ${k} — 작업 카드 컨 번호가 한 벌 표기(.cn · 끝 4자리 .cn-l ${m.cnN}개)`, m.cnN >= 1);
        if (scr === 'card') ok(`⑦ ${k} — 컨 상세 머리가 열한 자 한 벌 표기`, m.cnN >= 1);
        if (scr === 'chief' && m.mirBar) { const b = m.mirBar; if (!(b.found && b.h >= 44 && b.right <= b.vw && b.beforeTabs && b.opened === 'chief-bar' && b.w >= 24)) fails.mir = (fails.mir || []).concat(`${k}: ${JSON.stringify(b)}`); else mirSeen = (mirSeen || 0) + 1; }
      }
    }
  }
  ok('① 세 안 × 컴·폰 × 화면 31 — 그린 화면 오류 0', !fails.err.length, fails.err.slice(0, 4).join(' | '));
  ok('② 12px 아래 글자 0(그림 칸 제외)', !fails.tiny.length, fails.tiny.slice(0, 4).join(' | '));
  ok('② 두 글자 낱말(양하·선적)이 «양/하»로 꺾인 칸 0 — 수석 상황판 크게 포함(5.00-01)', !fails.wrap.length, fails.wrap.slice(0, 4).join(' | '));
  ok(`③ 글자 대비 AA(4.5 · 큰 글자 3) 미달 0 — 그라데이션 클래스가 붙은 요소 ${gradSeen}곳(로그인 시작 단추·새 버전 띠·인사 창·보조기능·매뉴얼·검색 포함)도 정지색마다 잼`, !fails.low.length && gradSeen > 0, fails.low.slice(0, 4).join(' | '));
  ok(`⑩ 수석 상황판 미르 칸(5.00-02 «이안에 넣으세요») — 세 안 × 컴·폰 ${mirSeen}곳 모두 탭 줄 안 넷째 칸에 서고(높이 44 이상·화면 안) 누르면 미르 시트를 부른다`, !(fails.mir || []).length && mirSeen >= 6, (fails.mir || []).slice(0, 3).join(' | '));
  ok('③ 컨 번호 대비 AAA(7) 미달 0', !fails.cn.length, fails.cn.slice(0, 4).join(' | '));
  ok('④ 누르는 자리 — 높이 44px · 너비 24px(WCAG 2.5.8) 미달 0(그림 칸 제외 · 실제로 넓힌 자리로 잰다)', !fails.small.length, fails.small.slice(0, 4).join(' | '));
  ok('⑥ 단추 순서·이름 — 세 안 모두 안 고르기 전과 같다', !fails.order.length, fails.order.slice(0, 4).join(' | '));
  ok('⑨ 단추·입력칸 한가운데와 가장자리 2px 안쪽을 누르면 그것이 눌린다 — 넓힌 손가락 자리가 이웃을 덮어 생긴 잘못 눌림 0(안 고르기 전과 견줌)', !fails.miss.length, fails.miss.slice(0, 4).join(' | '));

  //  ⑤ 크게 모드 — 1·2안에서 data-text=large 를 걸면 --fs-sm 이 커진다 · 3안은 크게보다 크다
  const fsOf = async (attrs) => (await render(390, 844, attrs, 'home', {}, [])).fsSm;
  const s1 = await fsOf(SKINS[1]), s1L = await fsOf({ ...SKINS[1], 'data-text': 'large' }), s2L = await fsOf({ ...SKINS[2], 'data-text': 'large' }), s3 = await fsOf(SKINS[3]);
  const px = (v) => (/rem$/.test(v) ? parseFloat(v) * 16 : parseFloat(v));
  ok(`⑤ 크게 모드 — 1안 보통 ${s1} → 크게 ${s1L} · 2안 크게 ${s2L} · 3안 ${s3}`, px(s1L) > px(s1) && px(s2L) === px(s1L) && px(s3) > px(s1L));
  ok(`⑧ 바깥으로 나가는 쓰기 시도 0 — 읽기도 전부 막힘(${net.length})`, net.length === 0, net.slice(0, 3).join(' | '));
  await browser.close();
  console.log(`\n${fail ? '✗' : '✓'} 5.00 화면 고르기 연막검사 — 통과 ${pass} / 실패 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('✗ 연막검사 자체 오류', e); process.exit(1); });
