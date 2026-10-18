// 자료 센터 화면(할 일 → 선박·항차 → 바로 실행)과 출력 허브 «바로 열기», 주소·대기 저장소를 재는 연막검사 (TallyOne 4.34).
//  검수사 2026-10-17 «통합 자료 센터» — 항차 홈 + 자료 센터 두 칸 · 할 일 먼저 고르고 선박·항차 선택 · 등록 한 칸.
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_datacenter434.cjs <렌더번들.js>'); process.exit(1); }
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://x/' });
global.window = dom.window; global.document = dom.window.document; global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
global.localStorage = dom.window.localStorage; global.CustomEvent = dom.window.CustomEvent; global.MouseEvent = dom.window.MouseEvent;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0); global.cancelAnimationFrame = clearTimeout;
dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
console.error = () => {};
process.on('uncaughtException', () => {});
let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
console.log('자료 센터 — 화면 · 바로 실행 · 주소 (4.34)');
require(path.resolve(B));
(async () => {
  await wait(700);
  const W = dom.window, doc = W.document;
  const click = async (el) => { el.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await wait(150); };
  const act = (k) => doc.querySelector(`[data-dc-act="${k}"]`);
  const goKeys = () => [...doc.querySelectorAll('[data-dc-go]')].map((b) => b.getAttribute('data-dc-go'));

  // ① 주소·대기 저장소
  const BH = W.__BH;
  ok(BH.parseHash('#/data').name === 'data', '주소 «#/data» 는 자료 센터 화면이다');
  ok(BH.parseHash('#/').name === 'home' && BH.parseHash('#/voyage/KBTR_2606E/loading').name === 'voyage', '홈·항차 주소는 그대로다');
  BH.setPendingDo({ action: 'cargo', voyageKey: 'KBTR_2606E', mode: 'loading' });
  ok(BH.takePendingDo('ATPR_2644W') === null, '다른 항차 화면은 남의 «할 일» 을 가져가지 못한다');
  const t = BH.takePendingDo('KBTR_2606E');
  ok(!!t && t.action === 'cargo' && BH.takePendingDo('KBTR_2606E') === null, '맞는 항차가 한 번 꺼내 가면 비워진다(새로고침 때 다시 안 열린다)');

  // ② 센터 화면
  ok(!!doc.querySelector('[data-data-center]'), '자료 센터 화면이 그려진다');
  const acts = [...doc.querySelectorAll('[data-dc-act]')].map((b) => b.getAttribute('data-dc-act'));
  ok(['reg', 'inspection', 'cargo', 'detail', 'eseal', 'xray'].every((k) => acts.includes(k)), `할 일 단추 여섯 개 (${acts.join(' ')})`);
  ok(goKeys().length === 0, '할 일을 누르기 전에는 선박·항차 단추가 없다');
  await click(act('inspection'));
  const gk = goKeys();
  ok(gk.includes('KBTR_2606E:discharge') && gk.includes('KBTR_2606E:loading') && gk.includes('SWTD_9013E:discharge') && gk.includes('ATPR_2644W:loading'), `검수 리스트 — 자료가 있는 모드마다 «양하/선적» 단추 (${gk.length}개)`);
  ok(!gk.includes('ATPR_2644W:discharge'), 'ATPR 은 선적 자료만 있어 «양하» 단추가 없다');
  const order = [...doc.querySelectorAll('[data-dc-ship]')].map((e) => e.getAttribute('data-dc-ship'));
  ok(order[0] === 'KBTR_2606E', `예정이 늦은 배가 위(KBTR 10/20 → ATPR 10/19 → SWTD 10/18) — ${order.join(' > ')}`);
  await click(act('eseal'));
  ok(JSON.stringify(goKeys()) === JSON.stringify(['ATPR_2644W:loading']), `엠티실 리스트 — 엠티실 부착 선박(ATPR)의 선적만 (${goKeys().join(',')})`);
  await click(act('xray'));
  ok(goKeys().length > 0 && goKeys().every((k) => /:discharge$/.test(k)), `X-RAY 리스트 — 양하 단추만 (${goKeys().join(',')})`);
  await click(act('cargo'));
  const btn = doc.querySelector('[data-dc-go="KBTR_2606E:loading"]');
  await click(btn);
  const D = W.__DO[W.__DO.length - 1];
  ok(!!D && D[0] === 'cargo' && D[1] === 'KBTR_2606E' && D[2] === 'loading', `단추를 누르면 (할 일, 항차, 모드) 가 넘어간다 — ${JSON.stringify(D)}`);

  // ③ 출력 허브 바로 열기
  W.__RENDER('hub', { autoAction: 'cargo' });
  await wait(900);
  ok(!!doc.querySelector('.cpv2-page'), '「카고플랜」 바로 열기 — 허브 메뉴 없이 카고플랜 화면이 선다');
  ok(!doc.querySelector('[data-testid="hub-xray"]') && !/출력 센터/.test((doc.body.textContent || '').slice(0, 400)), '허브 메뉴 화면은 건너뛴다');
  const closeBtn = [...doc.querySelectorAll('button')].find((b) => /닫기/.test(b.textContent || ''));
  const before = W.__CLOSED;
  if (closeBtn) await click(closeBtn);
  ok(W.__CLOSED === before + 1, '카고플랜을 닫으면 허브 메뉴가 아니라 부른 곳으로 돌아간다(허브 onClose 호출)');
  W.__RENDER('hub', { autoAction: 'detail' });
  await wait(900);
  ok(/BAY|베이/.test(doc.body.textContent || '') && !doc.querySelector('.cpv2-page'), '「베이 상세」 바로 열기 — 베이 상세 인쇄 화면이 선다');
  W.__DOCS.length = 0; const c0 = W.__CLOSED;
  W.__RENDER('hub', { autoAction: 'inspection' });
  await wait(900);
  ok(W.__DOCS.length === 1 && W.__CLOSED === c0 + 1, `「검수 리스트」 바로 열기 — 인쇄 창 ${W.__DOCS.length}개가 한 번 열리고 허브는 닫힌다`);
  console.log(`\n${pass} 통과 / ${fail} 실패`);
  process.exit(fail ? 1 : 0);
})();
