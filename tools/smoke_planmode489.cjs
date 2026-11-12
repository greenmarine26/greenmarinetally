// 4.89 연막 — 말로 고른 양하/선적 플랜(4.88-01 라이브 확인 PCSZ 2634E 결함): 실제 항차 화면(VoyagePage 실소스 · 메모리 DB)을 그려 검색줄에 치고 Enter. 실행 — node tools/smoke_planmode489.cjs <저장소> <번들>
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(process.argv[2] || process.cwd());
const BUNDLE = process.argv[3] || '';
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mirone_live_260910.json'), 'utf8'));
const DICT = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/baygrid_dicts.json'), 'utf8')).KBTR;   // KBTR 베이사전(정본 사본) — 사전이 있어야 플랜 머리가 그려진다
let n = 0, bad = 0;
const ok = (c, m, d = '') => { n += 1; console.log((c ? '  ✓ ' : '  ✗ ') + m + (c || !d ? '' : ' — ' + d)); if (!c) bad += 1; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  if (!BUNDLE || !fs.existsSync(BUNDLE)) { ok(false, '번들이 없다', BUNDLE); }
  else
  //  ★ 4.89 ① (4.88-01 라이브 확인 PCSZ 2634E) — 말로 고른 양하/선적이 무시되던 것. 실제 항차 화면을 그려 검색줄에 치고 Enter.
  {
    const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));
    const run = async (mode, q) => {
      const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
      const W = dom.window, errs = [];
      W.addEventListener('error', (e) => errs.push(e.message)); W.console.warn = () => {}; W.console.log = () => {};
      W.speechSynthesis = { speaking: false, speak() {}, cancel() {}, getVoices() { return []; } }; W.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
      W.matchMedia = W.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
      W.scrollTo = () => {}; W.HTMLElement.prototype.scrollIntoView = function () {}; W.alert = () => {}; W.__memdb = { voyages: { KBTR_2606E: JSON.parse(JSON.stringify(FX.KBTR_2606E)) }, ship_bay_dict_v3: { KBTR: JSON.parse(JSON.stringify(DICT)) } }; W.__fbShipBayDict = { KBTR: JSON.parse(JSON.stringify(DICT)) }; W.__mirLexicon = {};
      try { W.global = W; W.eval(fs.readFileSync(BUNDLE, 'utf8')); W.__renderVoyage('KBTR_2606E', mode); } catch (e) { errs.push('THROW ' + e.message); }
      await wait(700);
      const d = W.document;
      const pressed0 = () => { const b = [...d.querySelectorAll('button[aria-pressed]')].find((x) => x.textContent.includes('선적')); return b ? b.getAttribute('aria-pressed') : ''; };   // 화면(덮개 밑) 의 양하/선적 단추
      const inp = [...d.querySelectorAll('input[type="text"]')].find((x) => /질문|베이/.test(x.getAttribute('placeholder') || '') && x.id !== 'mirFabIn');
      if (!inp) return { err: '검색줄 없음', errs };
      const set = Object.getOwnPropertyDescriptor(W.HTMLInputElement.prototype, 'value').set;
      set.call(inp, q); inp.dispatchEvent(new W.Event('input', { bubbles: true })); await wait(80);
      const log0 = (W.__memlog || []).length;   // 4.89 감사 막음 1: 덮개를 열고 닫는 동안 RTDB 쓰기 0(메모리 DB 쓰기 기록)
      const modeBefore = pressed0();
      inp.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await wait(1800);
      const txt = d.body.textContent.replace(/\s+/g, ' ');
      const modeDuring = pressed0();
      const pressed = (lab) => { const b = [...d.querySelectorAll('button[aria-pressed]')].find((x) => x.textContent.includes(lab)); return b ? b.getAttribute('aria-pressed') : ''; };
      const out = { plan: (txt.match(/.{0,30}(?:CARGO DISCHARGING PLAN|STOWAGE INSTRUCTION|사전에 등록돼).{0,10}/g) || []).slice(0, 2), stow: /STOWAGE INSTRUCTION/.test(txt), dis: /CARGO DISCHARGING PLAN/.test(txt), full: /KOBE TRADER (?:CARGO DISCHARGING PLAN|STOWAGE INSTRUCTION)/.test(txt), codeHead: /KBTR (?:CARGO DISCHARGING PLAN|STOWAGE INSTRUCTION)/.test(txt), modeL: pressed('선적'), errs: errs.slice(0, 2) };
      //  닫기 — 덮개의 ✕/닫기 단추(플랜은 body 끝 포털이라 맨 뒤 것 — 앞쪽 «✕ 닫기» 는 답 카드 것)
      const close = [...d.querySelectorAll('button')].reverse().find((b) => /^(✕|닫기|✕ 닫기)$/.test(b.textContent.trim()) || /닫기/.test(b.getAttribute('aria-label') || ''));
      if (close) { close.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await wait(500); }
      out.base = log0;   // 4.89 재감사: 바깥 화면 열람 기록이 잡혔는지(스텁이 실제로 쓰기를 기록하는지) 대조군
      out.writes = (W.__memlog || []).slice(log0).map((x) => x.op + ' ' + x.path);
      out.screen = { before: modeBefore, during: modeDuring, after: pressed0() };
      out.afterClose = { stow: /STOWAGE INSTRUCTION/.test(d.body.textContent), dis: /CARGO DISCHARGING PLAN/.test(d.body.textContent), modeL: pressed('선적') };
      W.close();
      return out;
    };
    const a1 = await run('discharge', '선적(STOWAGE)PLAN');
    ok(a1.stow && !a1.dis && a1.modeL === 'false' && a1.full && !a1.codeHead, '① 양하 화면에서 «선적(STOWAGE)PLAN» → 선적 PLAN(STOWAGE INSTRUCTION)이 열린다(화면은 양하 그대로) · 머리는 선박명 «KOBE TRADER …»(코드 KBTR 아님)', JSON.stringify(a1));
    ok(a1.afterClose && !a1.afterClose.stow && a1.afterClose.modeL === 'false', '① 닫으면 원래 양하 화면 그대로(2.87 «닫아도 그 자리»)', JSON.stringify(a1.afterClose));
    ok(a1.screen && a1.screen.before === 'false' && a1.screen.after === 'false', '① 감사 막음 1 — 덮개를 열고 닫는 동안 화면 mode 는 바뀌지 않는다(setMode 없음 → lastMode·수동 베이·맞교환 대기가 그대로)', JSON.stringify(a1.screen));
    ok(a1.base > 0, '① 대조군 — 스텁이 실제 쓰기를 기록한다(바깥 화면 열람 기록 ' + a1.base + '건) — 0이면 아래 «쓰기 0» 검사는 무의미', String(a1.base));
    ok(Array.isArray(a1.writes) && a1.writes.length === 0, '① 감사 막음 1 — 덮개를 열고 닫는 동안 RTDB 쓰기 0(활동·lastMode 포함)', JSON.stringify(a1.writes));
    const a2 = await run('loading', '양하플랜');
    ok(a2.dis && !a2.stow && a2.modeL === 'true' && a2.full && Array.isArray(a2.writes) && a2.writes.length === 0, '① 선적 화면에서 «양하플랜» → 양하 PLAN(CARGO DISCHARGING PLAN)이 열린다 · 선박명 머리 · 화면은 선적 그대로 · 쓰기 0', JSON.stringify(a2));
    const a3 = await run('loading', '카고플랜 보여줘');
    ok(a3.stow && !a3.dis && a3.modeL === 'true', '① 말에 양하/선적이 없으면(카고플랜) 지금 화면(선적) 쪽', JSON.stringify(a3));
    const a4 = await run('discharge', '스테이지 보여줘');
    ok(a4.dis && !a4.stow, '① «스테이지» 도 지금 화면(양하) 쪽', JSON.stringify(a4));
  }
  {
    //  감사 막음 1 — 수동 베이·단(SearchPanel manualBay·manualTier)은 화면 mode(workFilter)가 바뀔 때만 지워진다. 덮개를 여닫는 길에는 setMode 가 없어야 한다(코드로 잠근다).
    const vp = fs.readFileSync(path.join(ROOT, 'src/pages/VoyagePage.jsx'), 'utf8');
    const i = vp.indexOf('const _mirOpenPlan = React.useCallback('), j = vp.indexOf('const _closePlanOv = React.useCallback('), k = vp.indexOf('}, [mirPlan, onMirPlanClose]);', j);
    const body = vp.slice(i, vp.indexOf('}, []);', i)) + vp.slice(j, k);
    ok(i > 0 && j > 0 && !/setMode\(/.test(body) && !/onModeChange/.test(body), '감사 막음 1 — 플랜 열기·닫기 길에 setMode·onModeChange 없음(수동 베이·단·맞교환 대기·lastMode 가 그대로)');
    const sp = fs.readFileSync(path.join(ROOT, 'src/components/SearchPanel.jsx'), 'utf8');
    ok(/setManualBay\(null\)/.test(sp) && /\[workFilter\]/.test(sp), '수동 베이를 지우는 곳은 workFilter(화면 mode) 바뀜뿐이다(그 전제가 그대로인지)');
  }
  console.log(`\n${bad ? '✗' : '✓'} 4.89 양하/선적 플랜 연막 ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('✗ 예외:', e && e.stack || e); process.exit(1); });
