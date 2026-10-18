// 수동 작업보고에 «양하완료»·«선적완료» 단추가 있고, 누르면 그 작업 종류의 완료 보고가 골라지는지 재는 연막검사 (TallyOne 4.33-02).
//  검수사 2026-10-18 «이어서 작업을 하면 수동 작업보고에서 양하완료 선적완료가 없습니다» · «전 근무자가 시작보고를 안해서 입니다».
//  작업 보고 창 번들은 smoke_equipone 것을 그대로 쓴다(ATPR 2640E · 활성 작업 기록 없음 = 전 근무자가 시작보고를 안 한 상태).
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_manualdone4332.cjs <렌더번들.js>'); process.exit(1); }
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://x/' });
global.window = dom.window; global.document = dom.window.document;
global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
global.localStorage = dom.window.localStorage; global.CustomEvent = dom.window.CustomEvent;
global.MouseEvent = dom.window.MouseEvent;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0); global.cancelAnimationFrame = clearTimeout;
dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
process.on('uncaughtException', () => {});   // 번들 안 Firebase 가 연결을 시도하다 던지는 오류는 이 검사와 무관하다
let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
console.log('수동 작업보고 — 양하완료·선적완료 단추 (4.33-02)');
require(path.resolve(B));
(async () => {
  await wait(700);
  const doc = dom.window.document;
  const click = async (el) => { el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); await wait(200); };
  const btn = (re) => [...doc.querySelectorAll('button')].find((b) => re.test((b.textContent || '').trim()));
  const manual = btn(/수동 보고 \(시작 안 누른 작업\)/);
  ok(!!manual, '메인 화면에 «수동 보고» 갈래가 있다');
  if (manual) await click(manual);
  const dis = btn(/^양하완료$/), lod = btn(/^선적완료$/);
  ok(!!dis && !!lod, '수동 보고에 «양하완료»·«선적완료» 단추가 있다');
  ok(!btn(/^완료$/), '모호한 «완료» 한 개 단추는 없다(양하·선적을 따로 골라야 하던 자리)');
  const act = () => (btn(/완료 보고$|보고 종류 선택$/) || {}).textContent || '';
  ok(/보고 종류 선택/.test(act()), '아무것도 안 눌렀으면 실행 단추는 «보고 종류 선택»이다');
  if (dis) await click(dis);
  ok(/양하 완료 보고/.test(act()), `«양하완료» 를 누르면 실행 단추가 «양하 완료 보고» 가 된다 — «${act().trim()}»`);
  if (lod) await click(lod);
  ok(/선적 완료 보고/.test(act()), `«선적완료» 를 누르면 «선적 완료 보고» 로 바뀐다 — «${act().trim()}»`);
  console.log(`\n${pass} 통과 / ${fail} 실패`);
  process.exit(fail ? 1 : 0);
})();
