// 4.77-01 화면 연막검사 — ① 작업 보고 창 첫 화면의 «호기 이동» 단추가 실제로 그려지고 눌리면 종류·호기·사유 칩 화면이 열린다 ② 조회만이면 단추 대신 안내창 ③ 수석 상황판에 RZOR R123E 의 «램프(105)» 줄과 QC103 36대
//   실행 — node tools/smoke_fix47701_ui.cjs <번들(smoke_fix47701_ui.jsx)>. 실패하면 빌드를 세운다.
const fs = require('fs');
const bundle = process.argv[2];
(async () => {
  let bad = 0;
  const ok = (c, m, d = '') => { console.log((c ? '  PASS ' : '  FAIL ') + m + (c || !d ? '' : ' — ' + String(d).slice(0, 300))); if (!c) bad++; };
  if (!bundle) { console.log('번들 경로가 없다'); process.exit(1); }
  const { JSDOM } = require('jsdom');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const open = async (mode, pre = '') => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/',
      beforeParse(w) { Object.defineProperty(w, 'innerWidth', { value: 1400, configurable: true }); w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }); w.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } }; } });
    dom.window.global = dom.window;
    const errs = []; dom.window.addEventListener('error', (e) => errs.push(e.message));
    dom.window.eval(`window.__MODE='${mode}';${pre}`);
    try { dom.window.eval(fs.readFileSync(bundle, 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
    await wait(500);
    return { W: dom.window, doc: dom.window.document, errs };
  };
  const click = async (W, el) => { if (el) el.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await wait(150); };
  const btn = (doc, re) => [...doc.querySelectorAll('button')].find((b) => re.test((b.textContent || '').trim()));

  console.log('① 작업 보고 첫 화면 — 호기 이동 단추');
  {
    const { W, doc, errs } = await open('modal');
    const b = doc.querySelector('[data-crane-move="1"]');
    ok(!!b && /호기 이동/.test(b.textContent), '첫 화면(main)에 «호기 이동» 단추가 그려진다', errs.join(' | '));
    await click(W, b);
    const t = doc.body.textContent;
    ok(/호기 이동 보고/.test(t) && !!btn(doc, /^철수$/) && !!btn(doc, /^장비교체$/) && !!btn(doc, /^다른 호기로 이동$/) && !!btn(doc, /^복귀$/), '누르면 종류 넷(철수·장비교체·다른 호기로 이동·복귀) 화면이 열린다');
    await click(W, btn(doc, /^철수$/));
    const t2 = doc.body.textContent;
    ok(/떠나는 호기/.test(t2) && ['1호기', '2호기', '3호기', '4호기'].every((x) => !!btn(doc, new RegExp('^' + x + '$'))) && !btn(doc, /^5호기$/), '철수를 고르면 떠나는 호기 1~4호기만 나온다(5호기 없음)');
    ok(/사유/.test(t2) && !!btn(doc, /^장비고장$/) && !!btn(doc, /^직접 입력$/), '사유 칩(장비고장…직접 입력)이 나온다');
    ok(!errs.length, '렌더 중 오류 없음', errs.join(' | '));
  }
  console.log('② 조회만 — 단추 대신 안내창(설계) · «클로드» 암행 계정이 조회만이면 단추가 안 보이는 까닭');
  {
    const { doc } = await open('modal', 'window.__VIEW=1;');
    ok(!doc.querySelector('[data-crane-move="1"]') && !!doc.querySelector('[data-view-only-report="1"]'), '조회만이면 보고창이 «조회만으로 들어와 있습니다» 안내창이고 호기 이동 단추는 없다');
  }
  console.log('③ 수석 상황판 — RZOR R123E 램프(105) 줄과 QC103 36대');
  {
    const { doc, errs } = await open('board');
    const t = doc.body.textContent;
    const ramp = doc.querySelector('[data-crane-ramp="1"]');
    ok(!!ramp && /램프\(105\) 285대/.test(ramp.textContent), '«램프(105) 285대» 줄이 선다(양하 146 + 적하 139)', ramp ? ramp.textContent : errs.join(' | '));
    const rows = [...doc.querySelectorAll('tr')].map((r) => (r.textContent || '').replace(/\s+/g, ' ').trim());
    const q3 = rows.find((r) => /^QC103/.test(r)), q5 = rows.find((r) => /^QC105/.test(r));
    ok(!!q3 && /^QC103 ?68 ?36 ?32/.test(q3), 'QC103 줄 — 양하 36대(실 LOLO)·적하 32대·합 68', q3);
    ok(!!q5 && /^QC105 ?285 ?146 ?139/.test(q5), 'QC105 줄 — 양하 146대·적하 139대·합 285', q5);
    ok(/합계 ?353 ?182 ?171/.test(rows.find((r) => /^합계/.test(r)) || ''), '합계는 그대로 353(182+171) — 몫만 옮겼다');
  }
  if (bad) { console.error(`✗ 4.77-01 화면 연막검사 ${bad}건 실패`); process.exit(1); }
  console.log('✓ 4.77-01 화면 연막검사 통과'); process.exit(0);
})().catch((e) => { console.error('✗ 화면 연막검사 예외', e); process.exit(1); });
