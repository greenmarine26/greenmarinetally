// 카고플랜 데크만 있는 베이 — 셀 줄이 눌리지 않고(제 단 수만큼 몫) 단 표기가 셀 줄과 같은 칸에 서는지 jsdom 으로 재는 연막검사 (TallyOne 4.34).
//  검수사 2026-10-18 «데크만 있는 베이 셀높이 표기랑 셀이 맞지 않습니다 셀높이 표기대로 셀을 맞춰 주세요. 다른 선박도 데크만 있는 베이가 전반적으로 맞지 않습니다».
//  ⚠ jsdom 은 높이를 계산하지 않는다 — 실제 픽셀은 크롬 실측(이 판 기록부)으로 확인했고, 여기서는 그 결과를 만든 몫(flex)과 CSS 를 잠근다.
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_deckonly434.cjs <렌더번들.js>'); process.exit(1); }
const { JSDOM } = require('jsdom');
let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  console.log('카고플랜 데크만 있는 베이 — 셀 높이와 단 표기 (4.34)');
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://x/' });
  global.window = dom.window; global.document = dom.window.document; global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
  global.localStorage = dom.window.localStorage;
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0); global.cancelAnimationFrame = clearTimeout;
  dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  console.error = () => {};
  let threw = '';
  process.on('uncaughtException', (e) => { threw = threw || String((e && e.message) || e); });
  try { require(path.resolve(B)); } catch (e) { threw = threw || String((e && e.message) || e); }
  await wait(900);
  ok(!threw, `카고플랜(MCAT 실사전·양하 321대)을 그리는 동안 죽지 않는다 ${threw ? '| ' + threw.slice(0, 120) : ''}`);
  const doc = dom.window.document;
  const secs = [...doc.querySelectorAll('.cpv2-bay-section')];
  ok(secs.length >= 20, `베이 상자가 그려진다 (${secs.length}개 — 공허 통과 방지)`);
  const by = (t) => secs.find((s) => (s.querySelector('.cpv2-bay-title') || {}).textContent === t);
  const flexOf = (el) => (el ? Number(el.getAttribute('data-share')) : NaN);   // jsdom 은 «8 1 0» flex 줄임 표기를 버린다 — 몫은 data-share 로 읽는다
  // 해치 있는 베이의 몫(maxSide)을 기준으로 삼는다 — 25번 베이(데크 6 + 홀드 6).
  const ref = by('BAY 25');
  const maxSide = ref ? flexOf(ref.querySelector('.cpv2-deck-area')) : NaN;
  ok(maxSide >= 5, `기준 몫(해치 있는 베이의 한쪽 단 수)을 읽었다 (${maxSide})`);
  // 데크만 있는 베이 — 단 수가 maxSide 보다 많은 베이는 제 단 수만큼 몫을 받아야 셀이 안 눌린다.
  const dOnly = secs.filter((s) => !s.querySelector('.cpv2-hatch-break:not([aria-hidden])') && s.querySelectorAll('.cpv2-deck-area').length === 1 && (s.textContent || '').length > 0
    && s.querySelector('.cpv2-hold-area[aria-hidden]'));
  ok(dOnly.length >= 3, `데크만 있는 베이를 찾았다 (${dOnly.length}개 — MCAT 41·43·44/45)`);
  let allOk = true, tall = 0;
  for (const s of dOnly) {
    const rows = s.querySelectorAll('.cpv2-grid-row-wrap .cpv2-tier-row:not(.cpv2-invisible-row)').length;
    const labs = s.querySelectorAll('.cpv2-tier-labels > span:not(.cpv2-invisible-label)').length;
    const dk = flexOf(s.querySelector('.cpv2-deck-area'));
    const hd = flexOf(s.querySelector('.cpv2-hold-area[aria-hidden]'));
    const want = Math.max(maxSide, rows);
    if (rows > maxSide) tall++;
    const good = rows === labs && dk === want && dk + hd === 2 * maxSide;
    if (!good) { allOk = false; console.log('    ✗', s.querySelector('.cpv2-bay-title').textContent, { rows, labs, dk, hd, want }); }
  }
  ok(allOk, '데크만 있는 베이: 셀 줄 수 = 단 표기 수 · 데크 몫 = max(해치 기준, 제 단 수) · 데크+빈 홀드 몫 = 해치 베이 총 높이(윗줄 정렬 유지)');
  ok(tall >= 3, `단 수가 해치 기준보다 많은 데크만 베이가 실제로 있다 (${tall}개 — 이 수리가 일하는 자리)`);
  // 단 표기 칸은 셀 줄과 같은 몫·상한(글자 높이가 줄을 밀어내지 않는다) — 번들의 CSS 문자열을 잠근다.
  const css = require('fs').readFileSync(path.resolve(B), 'utf8');
  ok(/\.cpv2-tier-labels > span \{ flex: 1 1 0; min-height: 0; max-height: var\(--cph, 999px\)/.test(css), '단 표기 칸 CSS: flex 1 1 0 · min-height 0 · max-height var(--cph)');
  console.log(`\n${pass} 통과 / ${fail} 실패`);
  process.exit(fail ? 1 : 0);
})();
