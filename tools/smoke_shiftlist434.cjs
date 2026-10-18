// 시프팅 대상이 양하 리스트에 섞여 든 경우 — «EDI에 없음» 경고에서 빠지고 총 작업은 한 번만 세는지 (TallyOne 4.34-03). 실데이터 MCAT 640N.
//  검수사 2026-10-18 15:26 «가끔 시프팅 대상이 양하리스트에 추가되는 경우» — 실측 MRSU7262992 는 시프팅 47대 중 하나(POD CNHSK)인데 선사 양하 리스트 322대에도 있었다.
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_shiftlist434.cjs <렌더번들.js>'); process.exit(1); }
const { JSDOM } = require('jsdom');
let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  console.log('시프팅 대상이 양하 리스트에 섞여 든 경우 (4.34-03)');
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'https://x/' });
  global.window = dom.window; global.document = dom.window.document; global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
  global.localStorage = dom.window.localStorage;
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0); global.cancelAnimationFrame = clearTimeout;
  dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  console.error = () => {};
  let threw = '';
  process.on('uncaughtException', (e) => { threw = threw || String((e && e.message) || e); });
  require(require('path').resolve(B));
  await wait(400);
  const W = dom.window;
  const txt = (id) => (W.document.getElementById(id)?.textContent || '').replace(/\s+/g, ' ');
  const bef = txt('vb-before'), aft = txt('vb-after');
  ok(!threw, '렌더 중 예외 없음 ' + threw);
  ok(W.__fx && W.__fx.edi === 321 && W.__fx.rec === 322 && W.__fx.shift === 47, `실데이터 — EDI ${W.__fx && W.__fx.edi} · 리스트 ${W.__fx && W.__fx.rec} · 시프팅 ${W.__fx && W.__fx.shift}`);
  ok(/리스트에 있는데 EDI에 없음: ?1대/.test(bef), '고치기 전 상태(시프팅 목록이 비었을 때) — «EDI에 없음 1대» 가 뜬다(기준)');
  ok(!/리스트에 있는데 EDI에 없음/.test(aft), '시프팅 목록에 있으면 «EDI에 없음» 이 사라진다');
  ok(/총 작업 368대 = 리스트 321 \+ 쉬프팅 47/.test(aft), '총 작업 368 = 리스트 321 + 쉬프팅 47 (겹친 1대는 시프팅으로 한 번만)');
  ok(/시프팅 1대는 선사 양하 리스트에도 있어 리스트에서 빼고 시프팅으로 한 번만 셉니다/.test(aft), '겹침 안내 글이 보인다');
  const dB = W.__diagBefore || [], dA = W.__diagAfter || [];
  const ex = (a) => a.find((x) => x.code === 'list_extra');
  ok(ex(dB) && ex(dB).count === 1 && ex(dB).details.extraCns.includes('MRSU7262992'), '진단(기준) — list_extra 1개(MRSU7262992)');
  ok(!ex(dA), '진단(수정) — list_extra 경고가 없다');
  const info = dA.find((x) => x.code === 'shift_in_list');
  ok(info && info.level === 'info' && info.count === 1 && info.details.shiftCns[0] === 'MRSU7262992', '진단(수정) — 안내(info) «시프팅 대상 1대가 양하 리스트에도 있음»');
  console.log(`\n${fail ? '✗ ' + fail + '건 실패' : '✓ 전부 통과'} (통과 ${pass} · 실패 ${fail})`);
  process.exit(fail ? 1 : 0);
})();
