// 베이 상세 X-RAY 세관봉인 연막검사 (3.46) — 실데이터(PCSZ 2620E 양하 608 · X-RAY 12)를 **실제로 그려**
//   ①4번째 줄에 ★봉인번호가 찍히는가 ②DG 와 겹치면 둘 다 나오는가 ③베이플랜 경로에서도 붙는가
//   ④**외관이 안 변했는가**(줄 수 5 · 칸 크기 · X-RAY 없는 항차의 칸이 3.45 와 같은가)
//   ⑤크로뮴 A4 가로에서 그 줄이 칸을 넘지 않는가 — 넘치면 overflow:hidden 이 조용히 지운다.
//   검수사 «적정공간을 찾아서 외관을 해치지 않게 주의 하여 주시기 바랍니다.»
const fs = require('fs');
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_baydetailxray.cjs <렌더번들.js>'); process.exit(1); }
const { JSDOM } = require('jsdom');
const CHILD = process.env.BDX_WHICH || '';
const ROOT = path.resolve(__dirname, '..');
let fail = 0, pass = 0;
const ok = (c, m, d = '') => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (!c && d ? ' — ' + d : '')); if (c) pass++; else fail++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log('베이 상세 — X-RAY 세관봉인 실번호가 종이에 나오는가 (3.46)');
  const dom = new JSDOM('<!doctype html><html><body><div id="rootA"></div><div id="rootB"></div><div id="rootC"></div></body></html>',
    { pretendToBeVisual: true, url: 'https://x/' });
  global.window = dom.window; global.document = dom.window.document;
  global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  global.cancelAnimationFrame = clearTimeout;
  dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  const errs = [];
  dom.window.addEventListener('error', (e) => errs.push(String(e.error || e.message)));
  const _ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ')); };
  let threw = '';
  const D0 = () => dom.window.document;
  process.on('uncaughtException', (e) => { threw = threw || String((e && e.message) || e); });
  try { require(path.resolve(B)); } catch (e) { threw = threw || String((e && e.message) || e); }
  await wait(400);
  //  경로 E — 출력 허브를 열고 «베이 상세» 를 눌러야 그 화면이 뜬다(검수사가 실제로 누르는 길).
  if (CHILD === 'E') {
    const btns = () => [...D0().querySelectorAll('button')];
    const hit = btns().find((b) => /베이\s*상세/.test(b.textContent || ''));
    if (hit) { hit.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); }
    await wait(500);
  }
  console.error = _ce;
  ok(!threw, '베이 상세가 그려진다(죽지 않는다)', threw);
  if (threw) { console.log(`\n✗ 베이 상세 X-RAY 연막검사 실패 ${fail}건`); process.exit(1); }

  const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/xrayseal_pcsz.json'), 'utf8'));
  const xcns = Object.keys(FX.xrayList);
  let seals = FX.xraySeals;   // 자식이 실제로 쓴 판으로 갈아 끼운다(아래)
  const D = dom.window.document;
  //  한 칸을 읽는다 — 칸 안 다섯 줄(bd-r1..r5)을 그대로 꺼낸다
  //  ⚠ 칸 마크업이 두 벌이다 — 사전 있는 배는 .bd-cell-lines(매트릭스), 없는 배는 .bd-cell.filled(폴백 격자).
  //    한쪽만 보면 다른 쪽이 깨져도 초록이 뜬다.
  const cellsOf = () => {
    const out = {};
    D.querySelectorAll('.bd-cell-lines, .bd-cell.filled').forEach((el) => {
      const kids = [...el.children].filter((d) => d.tagName === 'DIV');
      const r = kids.map((d) => d.textContent);
      const cn = (r[1] || '').trim();
      if (/^[A-Z]{4}\d{7}$/.test(cn)) out[cn] = { lines: r, n: r.length, r4: (r[3] || '').replace(/\u00A0/g, '').trim(), r4cls: (kids[3] || {}).className || '' };
    });
    return out;
  };
  if (CHILD) {
    //  자식 — 그린 결과만 넘겨 준다(이 화면은 createPortal 로 body 에 붙어 한 자리에 겹치므로 한 번에 하나만 그린다)
    const wrap = D.querySelector('.bd-cargo-wrap');
    //  외관 지표 — 칸 크기 변수(매트릭스) 또는 격자 열 구성(폴백) · 장수 · 칸 수
    const geo = (wrap ? (wrap.getAttribute('style') || '') : '')
      + '|' + [...D.querySelectorAll('.bd-tier-row')].map((e) => e.getAttribute('style') || '').join(';')
      + '|장' + D.querySelectorAll('.bd-page').length + '|칸' + D.querySelectorAll('.bd-cell.filled, .bd-cell-lines').length;
    //  ⚠ process.exit 은 stdout 을 **자르고** 끝낸다(1MB 넘는 결과가 중간에 끊겨 JSON 이 깨졌다).
    //    그래서 파일로 넘긴다 — 검사가 조용히 «아무것도 못 읽었다» 로 통과하는 길을 막는다.
    fs.writeFileSync(process.env.BDX_OUT, JSON.stringify({
      cells: cellsOf(), vars: geo.replace(/\s/g, ''),
      //  진입점이 실제로 쓴 봉인번호(긴 번호로 바꾼 것 포함) — 디스크 픽스처와 다르다
      seals: (dom.window.__FX || {}).xraySeals || {},
      html: (CHILD === 'A' || CHILD === 'D') ? ('<!doctype html>' + D.documentElement.outerHTML) : '',
      xcns: ((dom.window.__FX || {}).xcns) || [],
      matrix: D.querySelectorAll('.cpv2-cell').length,
      errs: errs.filter((e) => !/not wrapped in act|Warning:/i.test(e)).slice(0, 3),
    }));
    process.exit(0);
  }
  const { execFileSync } = require('child_process');
  const run = (w) => {
    const f = path.join('/dev/shm/hometmp', `_bdx_${process.pid}_${w}.json`);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    execFileSync(process.execPath, [__filename, path.resolve(B)],
      { env: Object.assign({}, process.env, { BDX_WHICH: w, BDX_OUT: f }), maxBuffer: 64 * 1024 * 1024, stdio: 'ignore' });
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    fs.unlinkSync(f);
    return j;
  };
  let rA, rB, rC, rD, rE;
  try { rA = run('A'); rB = run('B'); rC = run('C'); rD = run('D'); rE = run('E'); }
  catch (e) {
    //  ⛔ 못 그렸으면 «통과» 가 아니라 실패다 — 조용히 0항으로 끝나면 아무것도 증명하지 못한다.
    ok(false, '세 경로를 다 그려 읽었다', String((e && e.message) || e).slice(0, 200));
    console.log(`\n✗ 베이 상세 X-RAY 연막검사 실패 ${fail}건`); process.exit(1);
  }
  const A = rA.cells; const Bm = rB.cells; const C = rC.cells;
  seals = rA.seals && Object.keys(rA.seals).length ? rA.seals : seals;
  ok(Object.keys(A).length > 500, `실데이터 칸 ${Object.keys(A).length}개를 그렸다`, `${Object.keys(A).length}개`);

  console.log('\n── 봉인번호가 칸에 찍히는가');
  const drawn = xcns.filter((cn) => A[cn] && A[cn].r4.includes('★' + (seals[cn] || {}).seal));
  ok(drawn.length === xcns.length, `X-RAY ${xcns.length}대 전부 4번째 줄에 ★봉인번호`, 
     `${drawn.length}대 · 예 ${xcns[0]}→「${A[xcns[0]] ? A[xcns[0]].r4 : '칸 없음'}」`);
  ok(xcns.every((cn) => !A[cn] || !/★XRAY/.test(A[cn].r4) || !(seals[cn] || {}).seal),
     '번호가 있으면 «★XRAY» 대신 번호를 적는다');
  console.log('\n── 긴 봉인번호 · 겹침 · 다른 경로');
  {
    //  진입점이 xcns[1..3] 에 긴 번호를 넣었다 — 등급이 올라가고도 안 잘려야 한다
    const longOnes = xcns.slice(1, 4).filter((cn) => A[cn] && /★[A-Z0-9-]{6,}/.test(A[cn].r4));
    ok(longOnes.length === 3, '긴 봉인번호(DJHN225094 류)도 칸에 다 적힌다',
       xcns.slice(1, 4).map((cn) => A[cn] ? `「${A[cn].r4}」${A[cn].r4cls.replace('bd-r4', '')}` : '없음').join(' · '));
    ok(xcns.slice(1, 4).some((cn) => A[cn] && /x\d/.test(A[cn].r4cls)),
       '길면 등급이 올라간다(줄여 담는다)', xcns.slice(1, 4).map((cn) => A[cn] && A[cn].r4cls).join(' · '));
    const rf = A[xcns[4]];
    ok(!!rf && rf.r4.includes('★') && rf.r4.includes('-18'), '리퍼 온도와 겹쳐도 둘 다 적는다', rf ? `「${rf.r4}」` : '');
  }

  const dg = A[xcns[0]];
  ok(!!dg && dg.r4.includes('★') && dg.r4.includes('9'),
     'DG 와 겹치면 둘 다 적는다(검수사 «둘다 표기»)', dg ? `「${dg.r4}」` : '');
  //  두 경로가 **같은 결과**를 내야 한다 — 붙이는 자리가 한 곳이라는 증거다
  const diff = Object.keys(A).filter((cn) => !Bm[cn] || Bm[cn].r4 !== A[cn].r4);
  ok(diff.length === 0, `베이플랜 경로(지도만 넘김)가 출력 허브 경로와 칸 ${Object.keys(A).length}개 모두 같다`,
     diff.slice(0, 3).map((cn) => `${cn} 「${A[cn].r4}」 vs 「${Bm[cn] ? Bm[cn].r4 : '없음'}」`).join(' · '));
  const drawnB = xcns.filter((cn) => Bm[cn] && /★/.test(Bm[cn].r4));
  ok(drawnB.length === xcns.length, `베이플랜 경로에서도 X-RAY ${xcns.length}대에 ★가 붙는다`, `${drawnB.length}대`);

  console.log('\n── 외관을 안 건드렸는가');
  ok(Object.values(A).every((c) => c.n === 5), '칸은 그대로 다섯 줄이다', 
     JSON.stringify([...new Set(Object.values(A).map((c) => c.n))]));
  const notX = Object.keys(A).filter((cn) => !FX.xrayList[cn]);
  const same = notX.filter((cn) => C[cn] && A[cn].r4 === C[cn].r4 && A[cn].lines.join('|') === C[cn].lines.join('|'));
  ok(same.length === notX.length, `X-RAY 아닌 ${notX.length}칸은 3.45 와 글자가 똑같다`, 
     `다른 칸 ${notX.length - same.length}개`);
  //  칸 크기는 CSS 변수로 내려간다 — X-RAY 가 있든 없든 같아야 한다
  ok(rA.vars === rC.vars && rA.vars !== '', '칸 크기·격자·장수가 3.45 와 똑같다',
     rA.vars === rC.vars ? '' : `${rA.vars.slice(0, 90)} vs ${rC.vars.slice(0, 90)}`);
  ok(Object.keys(A).length === Object.keys(C).length, '칸 수가 같다 — 페이지가 늘지 않았다',
     `${Object.keys(A).length} vs ${Object.keys(C).length}`);

  //  ⑤ 크로뮴 — jsdom 은 폭을 모른다. 그린 HTML 을 그대로 브라우저에 넣어 4번째 줄이 넘치는지 잰다.
  console.log('\n── 폭 셈법 (검수사 윈도우 글꼴 기준)');
  {
    //  ⚠ ★ 는 윈도우(맑은고딕·Segoe UI Symbol)에서 **전각**으로 그려지는데 이 검사 기계의 대체 글꼴에서는
    //    반각이다. 그래서 «크로뮴이 안 넘쳤다» 만으로는 검수사 종이를 보장하지 못한다 —
    //    전각을 두 폭으로 세는 규칙 자체를 여기서 못박는다.
    const M2 = dom.window.__MID || {};
    const fit = (t) => (M2.MID_FIT ? M2.MID_FIT(t) : null);
    if (!M2.MID_FIT) {
      ok(false, '폭 셈법을 검사에서 부를 수 있다(MID_FIT 내보내기)');
    } else {
      ok(fit('★123456789') !== fit('A123456789'),
         '★ 를 반각으로 세지 않는다 — 같은 글자 수라도 등급이 다르다',
         `★판 «${fit('★123456789')}» vs ASCII판 «${fit('A123456789')}»`);
      ok(fit('123456') === '' && /x3/.test(fit('★DJHN225094 -23.5C') || ''),
         '짧은 번호는 그대로, 긴 번호+온도는 바닥 등급까지 줄인다',
         `「123456」→«${fit('123456')}» · 「★DJHN225094 -23.5C」→«${fit('★DJHN225094 -23.5C')}»`);
    }
  }

  console.log('\n── 검수사가 실제로 누르는 길 (출력 허브 → 베이 상세)');
  //  ⚠ 출력 허브는 컨 객체에 _xraySealNo 를 **스스로** 얹는다(검수 리스트가 그것을 쓴다).
  //    그래서 허브가 지도를 안 넘겨도 번호는 나온다 — 지도 넘김은 덤이고, 없애도 동작은 같다.
  //    이 항이 재는 것은 «허브로 연 화면에 번호가 실제로 찍히는가» 다.
  {
    const hubX = (rE.xcns || []);
    const drawnE = hubX.filter((cn) => rE.cells[cn] && /★?HUB\d{6}/.test(rE.cells[cn].r4));
    ok(hubX.length > 0 && drawnE.length === hubX.length,
       `출력 허브에서 연 베이 상세에 봉인번호 ${hubX.length}대가 다 나온다`,
       `${drawnE.length}/${hubX.length} · 예 ${hubX[0]}→「${rE.cells[hubX[0]] ? rE.cells[hubX[0]].r4 : '칸 없음'}」`);
  }

  console.log('\n── 크로뮴 실측 (가장 좁은 배 MCSC 87px · 매트릭스 격자)');
  const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome']
    .find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } });
  let pw = null;
  try { pw = require('playwright'); } catch (e) { pw = null; }
  if (!pw || !CHROME) {
    ok(false, '크로뮴으로 폭을 재야 한다 — 없으면 올리지 않는다(규범 §4-3, 건너뜀은 통과가 아니다)');
  } else {
    const tmp = path.join('/dev/shm/hometmp', `_bdx_${process.pid}.html`);
    fs.mkdirSync(path.dirname(tmp), { recursive: true });
    fs.writeFileSync(tmp, rD.html);
    const br = await pw.chromium.launch({ executablePath: CHROME });
    //  베이 상세는 A4 **가로**(297mm) · @page margin 0.3cm
    const pg = await br.newPage({ viewport: { width: Math.round((297 - 6) / 25.4 * 96), height: 900 } });
    await pg.goto('file://' + tmp);
    await pg.emulateMedia({ media: 'print' });
    const r = await pg.evaluate(() => {
      const out = { over: [], n: 0, cls: {}, inner: 0, minPt: 99 };
      document.querySelectorAll('.bd-cell-lines, .bd-cell.filled').forEach((el) => {
        const d = [...el.children].filter((x) => x.tagName === 'DIV')[3]; if (!d) return;
        const t = d.textContent.trim(); if (!t) return;
        out.n += 1;
        const k = (d.className.match(/x\d/) || ['기본'])[0];
        out.cls[k] = (out.cls[k] || 0) + 1;
        out.inner = out.inner || d.clientWidth;
        //  실제로 **적용된** 글꼴을 읽는다 — CSS 규칙을 지워도 초록이 뜨던 자리다
        const px = parseFloat(getComputedStyle(d).fontSize) || 0;
        if (px) out.minPt = Math.min(out.minPt, Math.round(px / 96 * 72 * 10) / 10);
        if (d.scrollWidth > d.clientWidth + 0.5) out.over.push({ t, cls: d.className, sw: d.scrollWidth, cw: d.clientWidth });
      });
      return out;
    });
    await br.close();
    try { fs.unlinkSync(tmp); } catch (e) {}
    ok(rD.matrix > 0, `매트릭스 격자를 그렸다(사전을 깔았다) — .cpv2-cell ${rD.matrix}칸`, `${rD.matrix}칸 — 사전을 안 깔면 폭이 2.2배 넓은 폴백 격자로 재게 된다`);
    ok(r.n > 0, `4번째 줄에 글자가 있는 칸 ${r.n}개를 쟀다`, `${r.n}개`);
    ok(r.inner > 0 && r.inner < 110, `칸 안폭이 실선 수준이다 (${r.inner}px)`, `${r.inner}px — 79px 부근이라야 진짜 좁은 배다`);
    ok(!/x4/.test(JSON.stringify(r.cls)), '6pt 아래 등급(x4)을 안 쓴다', JSON.stringify(r.cls));
    ok(r.minPt >= 6, `가장 작은 글꼴이 ${r.minPt}pt — 6pt 바닥을 지킨다`, `${r.minPt}pt`);
    ok(r.over.length === 0, '그 줄이 한 칸도 안 넘친다(넘치면 조용히 잘린다)',
       r.over.slice(0, 3).map((x) => `「${x.t}」 ${x.cls} ${x.sw}>${x.cw}`).join(' · '));
    console.log(`     등급 분포 ${JSON.stringify(r.cls)}`);
  }

  ok(rA.errs.length === 0 && rB.errs.length === 0, '콘솔에 오류가 없다', rA.errs.concat(rB.errs).slice(0, 2).join(' | '));
  console.log(fail ? `\n✗ 베이 상세 X-RAY 연막검사 실패 ${fail}건 / ${pass + fail}` : `\n✓ 베이 상세 X-RAY 연막검사 통과 (${pass}항)`);
  process.exit(fail ? 1 : 0);
})();
