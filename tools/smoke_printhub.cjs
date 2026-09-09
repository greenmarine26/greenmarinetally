// 출력 허브가 열리고 검수 리스트 종이까지 나오는지 재는 연막검사 (TallyOne 3.39-03).
//
//  왜 있는가 — 검수사 2026-09-09 밤 «검수앱에서 검수용리스트 출력 크러쉬 긴급수정».
//  실측 원인: `PrintHubModal` 이 179줄에서 207줄의 `const voyageInfo` 를 **선언 전에** 읽었다.
//  «Cannot access 'voyageInfo' before initialization» — 화면을 여는 순간 죽으므로 양하·선적
//  어느 쪽으로도, 검수 리스트·카고플랜·베이 상세·VGM 어느 것도 나오지 않았다.
//  3.31 이 그 줄을 넣었고 그 뒤 여덟 판이 나가는 동안 아무도 이 화면을 **열어 보지 않았다** —
//  이 앱에는 다른 화면(입력 탭·베이플랜·X-RAY·미르·로그인)을 그리는 검사는 있는데
//  **출력 허브를 그리는 검사만 없었다.** 그 구멍이 이 파일이다.
//
//  ⚠ «있나»를 정규식으로만 보면 안 된다 — 이 병은 그렸을 때만 드러난다.
//    그래서 실데이터 항차(KBTR 2606E · 양하 105 · 선적 232)로 **실제로 그리고 눌러** 종이를 받는다.
//    ⚠ 이 화면의 출구는 다섯이다 — 검수 리스트 · 카고플랜 · 베이 상세 · VGM · 작업 보고(결제용·작업용).
//      하나만 재면 나머지 넷이 죽어도 초록이 뜬다. 그래서 **다섯을 다 눌러 본다**(감사 지적, 3.39-03).
const fs = require('fs');
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_printhub.cjs <렌더번들.js>'); process.exit(1); }

const { JSDOM } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log('출력 허브 — 열리는가, 그리고 종이가 나오는가 (3.39-03)');

  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
    { pretendToBeVisual: true, url: 'https://x/' });
  global.window = dom.window; global.document = dom.window.document;
  global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  global.cancelAnimationFrame = clearTimeout;
  dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  const errs = [];
  dom.window.addEventListener('error', (e) => errs.push(String(e.error || e.message)));
  const _ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ')); };

  //  ⚠ React 는 렌더를 다음 틱으로 미루기도 한다 — 그때 터진 예외는 try 로 안 잡히고
  //    **프로세스를 통째로 죽여** 검사 결과가 한 줄도 안 남는다(사보타주로 실측).
  //    그러면 다음 클로드는 «검사가 왜 죽었나»부터 다시 봐야 하므로, 여기서 받아 항으로 만든다.
  let threw = '';
  process.on('uncaughtException', (e) => { threw = threw || String((e && e.message) || e); });
  try { require(path.resolve(B)); } catch (e) { threw = threw || String((e && e.message) || e); }
  await wait(400);
  console.error = _ce;

  const root = dom.window.document.getElementById('root');
  const txt = () => root.textContent || '';
  const btns = () => [...root.querySelectorAll('button')];
  const click = (el) => { el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true })); };
  const find = (s) => btns().find((b) => (b.textContent || '').includes(s));

  // ── ★ 이번 병 — 화면이 열리는가
  ok(!threw, `허브를 그리는 동안 죽지 않는다 ${threw ? '| ' + threw.slice(0, 120) : ''}`);
  ok(root.children.length > 0 && /검수 자료 출력/.test(txt()), '출력 허브가 열린다 — 제목이 그려졌다');
  const hard = errs.filter((s) => /before initialization|is not defined|Cannot read|Minified React error/.test(s));
  ok(hard.length === 0, `치명 오류 0 (${hard.length}건)` + (hard[0] ? ' | ' + hard[0].slice(0, 140) : ''));

  // ── 자료가 실제로 든 항차인가 (공허 통과 막기)
  const tabD = find('양하 ('), tabL = find('선적 (');
  const numOf = (b) => { const m = /\((\d+)\)/.exec((b && b.textContent) || ''); return m ? +m[1] : -1; };
  ok(numOf(tabD) > 0 && numOf(tabL) > 0,
     `양하·선적 둘 다 자료가 있는 항차로 잰다 (양하 ${numOf(tabD)} · 선적 ${numOf(tabL)})`);

  //  종이 한 장을 받아 시트1(별첨 앞)의 컨 행 수를 센다.
  const paper = () => {
    const d = dom.window.__DOCS;
    return d && d.length ? d[d.length - 1].document.html : '';
  };
  const rowsOfSheet1 = (html) => {
    const cut = html.indexOf('<div class="ititle">');
    const s1 = cut > 0 ? html.slice(0, cut) : html;
    return (s1.match(/<td class="cn">/g) || []).length;
  };
  const screenCount = () => { const m = /(\d+)대<\/strong>|<strong[^>]*>(\d+)대/.exec(root.innerHTML) || /(\d+)대/.exec(txt()); return m ? +(m[1] || m[2]) : -1; };

  // ── 양하 — 검수 리스트 버튼이 있고, 눌러 종이가 나온다
  {
    const b = find('검수 리스트');
    ok(!!b, '양하에 검수 리스트 단추가 있다');
    const want = screenCount();
    if (b) {
      const before = dom.window.__DOCS.length;
      click(b); await wait(120);
      ok(dom.window.__DOCS.length === before + 1, '양하 검수 리스트를 누르면 종이가 한 장 나온다');
      const html = paper();
      ok(/<table class="ilist"/.test(html) && /검수 리스트 양하/.test(html),
         `그 종이가 «검수 리스트 양하» 다 (${html.length.toLocaleString()}자)`);
      const n = rowsOfSheet1(html);
      ok(n === want && n > 0, `★ 본문 줄 수가 화면 대수와 같다 — 조용히 빠진 컨이 없다 (종이 ${n} · 화면 ${want})`);
      ok(/<div class="ititle">\[별첨\]/.test(html) || !/별첨/.test(html),
         '별첨(특수화물)은 있으면 제목을 달고 나간다');
    }
  }

  // ── 선적 — 탭을 바꿔도 살아 있고, 종이가 나온다
  {
    if (tabL) { click(tabL); await wait(200); }
    ok(/검수 자료 출력/.test(txt()), '선적으로 바꿔도 허브가 산다');
    const b = find('검수 리스트');
    const want = screenCount();
    ok(!!b, '선적에 검수 리스트 단추가 있다');
    if (b) {
      click(b); await wait(120);
      const html = paper();
      ok(/검수 리스트 선적/.test(html), '그 종이가 «검수 리스트 선적» 이다');
      const n = rowsOfSheet1(html);
      ok(n === want && n > 0, `★ 선적도 줄 수가 화면 대수와 같다 (종이 ${n} · 화면 ${want})`);
    }
    //  VGM 은 선적에서만 나오는 대외 문서 — 여기서도 같은 화면이 죽으면 못 낸다.
    const v = find('VGM');
    ok(!!v, 'VGM 리스트 단추는 선적에서 나온다');
    if (v) {
      click(v); await wait(120);
      ok(/VGM/i.test(paper()), 'VGM 종이가 나온다');
    }
  }

  // ── 작업 보고(FINAL WORKING REPORT) — 같은 화면의 나머지 두 출구도 종이가 나온다
  //    이 둘은 항차·BERTH 를 손으로 적어 배에 내는 대외 서류다. 카고플랜·베이 상세로 들어가면
  //    그 화면이 허브를 덮으므로 **여기서** 눌러 본다(뒤로 옮겼다가 단추를 못 찾은 실측이 있다).
  {
    for (const key of ['결제용', '작업용']) {
      const b = find(key);
      ok(!!b, `작업 보고 «${key}» 단추가 있다`);
      if (b) {
        const before = dom.window.__DOCS.length;
        click(b); await wait(200);
        const html = dom.window.__DOCS.length > before ? dom.window.__DOCS[dom.window.__DOCS.length - 1].document.html : '';
        ok(html.length > 1000, `«${key}» 종이가 나온다 (${html.length.toLocaleString()}자)`);
      }
    }
  }

  // ── 같은 화면의 나머지 출구도 눌러 본다 — 하나라도 죽으면 이 화면 전체가 못 쓴다
  {
    for (const [label, key] of [['카고플랜', '카고플랜'], ['베이 상세', '베이 상세']]) {
      const b = find(key);
      ok(!!b, `${label} 단추가 있다`);
      if (b) {
        const n0 = errs.length;
        click(b); await wait(300);
        const bad = errs.slice(n0).filter((s) => /before initialization|is not defined|Cannot read|Minified React error/.test(s));
        ok(bad.length === 0, `${label} 을 눌러도 안 죽는다` + (bad[0] ? ' | ' + bad[0].slice(0, 120) : ''));
        //  닫고 돌아온다 — 서브 화면이 떠 있으면 다음 단추를 못 누른다.
        const back = btns().find((x) => /닫기|✕|←/.test(x.textContent || ''));
        if (back) { click(back); await wait(200); }
      }
    }
  }

  // ── 함정 — 이 화면에서 «선언 전에 읽기»가 되살아나지 않았는가 (소스로도 못박는다)
  {
    const SRC = fs.readFileSync(path.join(ROOT, 'src/components/PrintHubModal.jsx'), 'utf8');
    const bare = SRC.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
                    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));
    const lines = bare.split('\n');
    const declAt = lines.findIndex((L) => /^\s*const voyageInfo\s*=/.test(L));
    const useAt = lines.findIndex((L) => /(?<![.\w$])voyageInfo(?![\w$])/.test(L));
    ok(declAt >= 0 && useAt >= declAt,
       `voyageInfo 는 만들어진 뒤에만 쓰인다 — 선언 ${declAt + 1}줄 · 첫 쓰임 ${useAt + 1}줄`);
  }

  console.log(fail ? `\n⛔ 출력 허브 검사 실패 ${fail}건` : `\n✅ 출력 허브가 열리고 종이가 나온다 — ${pass}항 통과`);
  process.exit(fail ? 1 : 0);
})();
