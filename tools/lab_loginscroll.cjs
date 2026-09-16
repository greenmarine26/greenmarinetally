// «작업 선박 선택» 판 스크롤 — **실 브라우저 휠 시험**(3.52-02). build.sh 관문이 아니라 손으로 돌리는 잣대다.
//   왜 따로 두나 — jsdom 은 높이·잘림을 안 재서 «단추가 화면 밖» 을 못 본다(규범 §6-3).
//   ⚠ `scrollIntoView` 로 재면 **거짓말을 한다** — 브라우저는 `overflow:hidden` 컨테이너도 그것으로는 굴려 준다.
//      사람이 하는 대로 **마우스 휠**로 굴려야 한다.
//   돌리는 법(샌드박스):
//     1) src/firebase.js 를 tools/fb_stub_search.js 로 잠시 바꾸고 tools/smoke_workchoice.jsx 를 esbuild 로 묶어
//        <작업폴더>/wc_new.js 로 낸다(명령은 build.sh 846행 그대로). 되돌리는 것을 잊지 말 것.
//     2) 빌드된 assets/index-*.css 를 app.css 로 복사.
//     3) App.jsx 508행 바깥 틀 클래스를 그대로 쓴 page 를 만들고 이 파일을 node 로 돌린다.
//   판정 — 휠을 굴린 뒤 `[data-choice-start]` 의 rect 가 화면 안에 들어오면 통과.
// «작업 선박 선택» 판이 PC 화면에서 «작업 시작» 단추까지 손이 닿는가 — 실제 브라우저로 잰다(jsdom 은 높이를 안 센다).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const f of ['old.html', 'new.html']) {
    const pg = await b.newPage({ viewport: { width: 1366, height: 700 } });
    const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0,160)));
    await pg.goto('file:///var/tmp/lt/' + f);
    await pg.waitForFunction(() => document.querySelector('#root button'), { timeout: 20000 });
    // 실제 흐름 그대로 — «로그인 안 된 작업자 N명 보기» → 박진우 → «…님으로 시작» → 선박 단계
    await pg.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /로그인 안 된 작업자 \d+명 보기/.test(x.textContent||''));
      if (b) b.click();
    });
    await pg.waitForTimeout(250);
    await pg.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /박진우/.test(x.textContent||'') && !/시작/.test(x.textContent||''));
      if (b) b.click();
    });
    await pg.waitForTimeout(250);
    await pg.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /님으로 시작/.test(x.textContent||''));
      if (b) b.click();
    });
    await pg.waitForFunction(() => document.querySelector('[data-login-choice="vessel"]'), { timeout: 8000 }).catch(()=>{});
    await pg.waitForTimeout(300);
    // 선박 하나 고른다(호기 칩까지 떠서 판이 더 길어진다 — 실제 상황)
    await pg.evaluate(() => { const v = document.querySelector('[data-choice-voyage]'); if (v) v.click(); });
    await pg.waitForTimeout(300);
    // ★ 사람이 하는 대로 — 마우스 휠로 굴린다. `scrollIntoView` 는 overflow:hidden 도 굴려 버려 시험이 거짓말을 한다.
    const before = await pg.evaluate(() => {
      const b = document.querySelector('[data-choice-start]');
      const p = document.querySelector('[data-login-choice]');
      return { has: !!b, top: b ? Math.round(b.getBoundingClientRect().top) : null,
               bottom: b ? Math.round(b.getBoundingClientRect().bottom) : null,
               vh: window.innerHeight, ships: document.querySelectorAll('[data-choice-voyage]').length,
               stage: p ? p.getAttribute('data-login-choice') : '(없음)' };
    });
    await pg.mouse.move(683, 350);
    for (let k = 0; k < 6; k++) { await pg.mouse.wheel(0, 400); await pg.waitForTimeout(120); }
    await pg.waitForTimeout(300);
    const r = await pg.evaluate(() => {
      const b = document.querySelector('[data-choice-start]');
      const p = document.querySelector('[data-login-choice]');
      const rect = b.getBoundingClientRect();
      const vh = window.innerHeight;
      return { top: Math.round(rect.top), bottom: Math.round(rect.bottom), vh,
               panelScrollTop: p ? Math.round(p.scrollTop) : -1,
               docScrollTop: Math.round(document.scrollingElement.scrollTop),
               reachable: rect.top >= 0 && rect.bottom <= vh + 1 };
    });
    console.log('---', f, '---');
    console.log('  단계', before.stage, '· 선박', before.ships, '척 · 화면높이', r.vh);
    console.log('  휠 굴리기 전 단추 bottom', before.bottom, '→ 굴린 뒤', r.bottom, '(top', r.top + ')');
    console.log('  판 scrollTop', r.panelScrollTop, '· 겉 scrollTop', r.docScrollTop);
    console.log('  ' + (r.reachable ? '✅ 휠로 굴려 단추까지 손이 닿는다' : '⛔ 휠을 굴려도 단추가 화면 밖 — 누를 수 없다'));
    if (errs.length) console.log('  ⚠', errs.slice(0,2));
    await pg.close();
  }
  await b.close();
})();
