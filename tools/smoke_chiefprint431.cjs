// 검수원 화면에서 수석 전용 출력(VGM·결제용·작업용 작업 보고서·특수화물 별첨)이 빠지는지 재는 연막검사 (TallyOne 4.31).
//  검수사 2026-10-17 «검수리스트에서는 특수화물 목록을 뽑지 않습니다. 그건 수석이 필요한 자료» ·
//  «VGM리스트 결제용 작업보고서 작업용 작업 보고서는 수석용» · «검수가 뽑는것은 검수리스트 ATPR 엠티 리스트 카고플랜 베이상세 XRAY리스트».
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_chiefprint431.cjs <렌더번들.js>'); process.exit(1); }
const { JSDOM } = require('jsdom');
let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  console.log('출력 센터 — 수석 전용 자료는 검수원에게 안 보인다 (4.31)');
  const dom = new JSDOM('<!doctype html><html><body><div id="rootInsp"></div><div id="rootChief"></div></body></html>', { pretendToBeVisual: true, url: 'https://x/' });
  global.window = dom.window; global.document = dom.window.document; global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0); global.cancelAnimationFrame = clearTimeout;
  dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  const _ce = console.error; console.error = () => {};
  let threw = '';
  process.on('uncaughtException', (e) => { threw = threw || String((e && e.message) || e); });
  try { require(path.resolve(B)); } catch (e) { threw = threw || String((e && e.message) || e); }
  await wait(500); console.error = _ce;
  ok(!threw, `두 화면을 그리는 동안 죽지 않는다 ${threw ? '| ' + threw.slice(0, 120) : ''}`);

  const doc = dom.window.document;
  const insp = doc.getElementById('rootInsp'), chief = doc.getElementById('rootChief');
  const btns = (r) => [...r.querySelectorAll('button')];
  const has = (r, s) => btns(r).some((b) => (b.textContent || '').includes(s));
  const click = (el) => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));

  // 공허 통과 막기 — 두 화면 다 열렸고 선적 모드다
  ok(/검수 자료 출력/.test(insp.textContent) && /검수 자료 출력/.test(chief.textContent), '검수원·수석 두 화면이 다 열린다');
  ok(has(insp, '검수 리스트') && has(insp, '카고플랜') && has(insp, '베이 상세'), '검수원도 검수 리스트·카고플랜·베이 상세는 뽑는다');
  ok(has(chief, '검수 리스트') && has(chief, '카고플랜') && has(chief, '베이 상세'), '수석도 같은 세 가지를 뽑는다');

  // 수석 전용
  ok(has(chief, 'VGM') && has(chief, '결제용') && has(chief, '작업용'), '수석(소유자)에게는 VGM·결제용·작업용이 있다');
  ok(!has(insp, 'VGM'), '검수원에게는 VGM 리스트 단추가 없다');
  ok(!has(insp, '결제용') && !has(insp, '작업용'), '검수원에게는 결제용·작업용 작업 보고서 단추가 없다');
  ok(!/FINAL WORKING REPORT/.test(insp.textContent), '검수원 화면에 FINAL WORKING REPORT 입력 칸이 없다');
  ok(!/VGM|작업 보고서/.test((insp.textContent.split('출력을 누르면')[1] || '')), '검수원 하단 안내에 VGM·작업 보고서 말이 없다');

  // 특수화물 별첨 — 수석은 나오고 검수원은 안 나온다(공허 통과 막기: 수석 종이에 별첨이 실제로 있어야 한다)
  const paperOf = async (root) => {
    const b = btns(root).find((x) => (x.textContent || '').includes('검수 리스트'));
    const before = dom.window.__DOCS.length;
    click(b); await wait(150);
    return dom.window.__DOCS.length > before ? dom.window.__DOCS[dom.window.__DOCS.length - 1].document.html : '';
  };
  const pc = await paperOf(chief);
  const pi = await paperOf(insp);
  ok(pc.length > 1000 && pi.length > 1000, `두 종이가 다 나온다 (수석 ${pc.length.toLocaleString()}자 · 검수원 ${pi.length.toLocaleString()}자)`);
  ok(/<!--sheet2-->[\s\S]*\[별첨\] 특수화물/.test(pc), '수석 종이에는 특수화물 별첨이 있다 (공허 통과 방지)');
  ok(!/<!--sheet2-->/.test(pi) && !/\[별첨\] 특수화물/.test(pi), '검수원 종이에는 특수화물 별첨이 없다');
  const rows = (h) => { const cut = h.indexOf('<!--sheet2-->'); return ((cut > 0 ? h.slice(0, cut) : h).match(/<td class="cn">/g) || []).length; };
  ok(rows(pc) === rows(pi) && rows(pi) > 0, `본문(시트 1) 컨 줄 수는 두 사람이 같다 — 특수화물 행은 본문에 그대로 있다 (${rows(pi)}줄)`);
  // 베이사전 진단 위젯(업로드 탭)은 화면 전체를 그려야 해서 원본으로 문을 확인한다 — 수석 판정이 위젯 앞에 서 있어야 한다.
  const vp = require('fs').readFileSync(path.resolve(__dirname, '..', 'src/pages/VoyagePage.jsx'), 'utf8');
  const wi = vp.indexOf('<BayDictVerifyWidget');
  const before = vp.slice(Math.max(0, wi - 420), wi);
  ok(wi > 0 && /canOpenChief\(inspector, isOwnerName\(inspector\)\) \|\| isAdminUser\(inspector\)/.test(before),
     '베이사전 진단 위젯 바로 앞에 수석 판정(canOpenChief·관리자)이 서 있다');
  ok((vp.match(/<BayDictVerifyWidget/g) || []).length === 1, '베이사전 진단 위젯 자리는 한 곳뿐이다(옆길 없음)');
  console.log(`\n결과: ${pass} 통과 · ${fail} 실패`);
  process.exit(fail ? 1 : 0);
})();
