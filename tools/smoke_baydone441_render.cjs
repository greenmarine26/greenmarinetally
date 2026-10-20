// 수석 상황판 «완료·남은 베이»(4.41) — jsdom 으로 배 카드를 실제로 그려 양하·선적 한 줄이 확정 글자대로 서는지 본다. 실패하면 빌드를 세운다.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(e.message));
console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
try { dom.window.eval(fs.readFileSync(process.argv[2], 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await wait(800);
  const doc = dom.window.document;
  let fail = 0;
  const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
  console.log('수석 상황판 «완료·남은 베이»(4.41) — 배 카드 렌더');
  const uniq = [...new Set(errs)];
  ok(!uniq.length, '렌더 오류 0건' + (uniq.length ? ' — ' + uniq.slice(0, 3).join(' | ') : ''));
  //  4.41 — 줄은 오른쪽 그림 칸 머리줄 오른쪽(검수사 06:22 «이곳 우측이 항상 비어 있어서»).
  const line = (vk, m) => { const el = doc.querySelector(`[data-card="${vk}"] [data-board-baydone="head"] [data-baydone="${m}"]`); return el ? el.textContent.replace(/\s+/g, ' ').trim() : null; };
  const WANT = [
    ['TMPZ_2035E', 'discharge', '양하 ✔ 전부 완료'],
    ['TMPZ_2035E', 'loading', '선적 남은 — 데크 06(1)·14(6)'],
    ['DXQD_2641E', 'discharge', '양하 완료 — 데크 01·04·08·12·16·20·24 (남은 7곳)'],
    ['STSE_2681E', 'discharge', '양하 완료 — 데크 16 (남은 14곳)'],
  ];
  for (const [vk, m, w] of WANT) { const got = line(vk, m); ok(got === w, `${vk} «${got}»`); }
  ok(line('DXQD_2641E', 'loading') === null && line('STSE_2681E', 'loading') === null, '완료가 없는 선적은 줄이 안 선다(DXQD·STSE)');
  //  자리 — 오른쪽 그림 칸(75%) 머리줄 맨 오른쪽 · 왼쪽 통계 칸(lsc-stat)에는 없다
  for (const vk of ['TMPZ_2035E', 'DXQD_2641E', 'STSE_2681E']) {
    const card = doc.querySelector(`[data-card="${vk}"]`);
    const head = card && card.querySelector('[data-board-baydone="head"]');
    const row = head && head.parentElement;
    ok(!!head && row && row.lastElementChild === head && /^(호기별 작업 베이|터미널 본선 현황|지금 작업 중인 베이)/.test(row.textContent.trim()), `${vk} 그림 칸 머리줄 맨 오른쪽 «${row ? row.textContent.trim().slice(0, 12) : ''}…»`);
    ok(!card.querySelector('.lsc-stat [data-baydone]'), `${vk} 왼쪽 통계 칸에는 줄이 없다`);
  }
  if (fail) { console.log(`✗ ${fail}건 실패`); process.exit(1); }
  console.log('✓ 배 카드 «완료·남은 베이» 렌더 통과');
  process.exit(0);
})();
