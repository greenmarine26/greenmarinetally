// 양하 «해상부터» 칩(3.3)·«양하 순서» 창(4.09) — jsdom 으로 자동 가이드를 그리고 칩·창을 눌러 저장 호출(호기 칸)과 순서 변화를 본다. 실패하면 빌드를 세운다.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(e.message));
console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
dom.window.alert = (m) => { (dom.window.__alerts = dom.window.__alerts || []).push(String(m)); };
try { dom.window.eval(fs.readFileSync(process.argv[2], 'utf8')); }
catch (e) { errs.push('THROW: ' + e.message); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  await wait(700);
  const doc = dom.window.document;
  const fail = (m) => { console.log('✗ ' + m); process.exit(1); };
  const uniq = [...new Set(errs)];
  if (uniq.length) { console.log('✗ 렌더 중 오류 ' + uniq.length + '건'); uniq.slice(0, 3).forEach(e => console.log('   ' + e)); process.exit(1); }
  const clickBy = (re) => { const b = [...doc.querySelectorAll('button')].find(x => re.test((x.textContent || '').trim())); if (!b) return false; b.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); return true; };
  const txt = () => doc.body.textContent || '';
  //  실제 순서 — 호기 → (접안은 info 에 있음) → 베이 그룹(⇄ 칩이 있는 화면) → 단(칩 + 창) → 작업 화면(칩 대신 «순서 … 바꾸기 ⚙» 줄)
  clickBy(/🏗 1호기/); await wait(400);
  if (!/우현 접안/.test(txt())) fail('접안 칩(우현 접안)이 없다 — info.berthSide 가 안 읽혔다: ' + txt().slice(0, 160));
  let t = txt();
  if (!/⇄ 육상부터/.test(t)) fail('베이 고르는 화면에 기본 칩 [⇄ 육상부터]가 없다: ' + t.slice(0, 200));
  //  4.09 감사: 칩이 있는 화면마다 눌렀을 때 «양하 순서» 창이 떠야 한다(단 고르는 화면의 칩이 먹통이었다)
  if (!clickBy(/⇄ 육상부터/)) fail('베이 화면의 칩을 못 눌렀다');
  await wait(300);
  if (!/양하 순서 — 1호기/.test(txt())) fail('베이 고르는 화면에서 칩을 눌러도 «양하 순서 — 1호기» 창이 안 뜬다: ' + txt().slice(0, 200));
  if (!clickBy(/^B9·10·11|^B10/)) fail('10번 베이 묶음 버튼이 없다: ' + txt().slice(0, 200));
  await wait(300);
  t = txt();
  if (!/작업할 단을 선택/.test(t)) fail('단 고르는 화면으로 못 갔다: ' + t.slice(0, 160));
  if (!/양하 순서 — 1호기/.test(t)) fail('단 고르는 화면에서 열어 둔 «양하 순서» 창이 사라졌다');
  if (!clickBy(/⇄ 육상부터/)) fail('단 화면의 칩을 못 눌렀다');
  await wait(250);
  if (/양하 순서 — 1호기/.test(txt())) fail('단 고르는 화면에서 칩을 다시 누르면 창이 닫혀야 한다');
  if (!clickBy(/⇄ 육상부터/)) fail('단 화면의 칩을 못 눌렀다(열기)');
  await wait(250);
  if (!/양하 순서 — 1호기/.test(txt())) fail('단 고르는 화면의 칩이 창을 못 연다(먹통)');
  if (!clickBy(/⇄ 육상부터/)) fail('단 화면의 칩을 못 눌렀다(닫기)');
  await wait(200);
  if (!clickBy(/데크/)) fail('데크 단 버튼이 없다');
  await wait(500);
  t = txt();
  if (!/순서\s*육상부터/.test(t) || !/바꾸기 ⚙/.test(t)) fail('작업 화면에 «순서 육상부터 … 바꾸기 ⚙» 줄이 없다: ' + t.slice(0, 220));
  if (/⇄ 육상부터/.test(t)) fail('작업 화면에는 ⇄ 칩이 없어야 한다(줄이 대신한다)');
  //  기본(육상부터) 첫 카드 = 10번 88단 바깥 홀수(09) — smoke_guided 와 같은 실데이터 결론
  const firstPos = (s) => (s.match(/(\d{1,2})-(\d{2})-(\d{2})/) || [])[0] || '';
  const p0 = firstPos(t);
  if (!/^1?\d-09-88$/.test(p0)) fail(`육상부터 첫 카드 자리가 10-09-88 이 아니다 (${p0}): ` + t.slice(0, 200));
  //  4.09: 줄을 누른다 → «양하 순서» 창이 열린다(확인 모달 없음) → [해상부터] → fbSetWorkOrder(호기 칸에 PATCH)
  if (!clickBy(/^순서\s*육상부터.*바꾸기/)) fail('«순서 … 바꾸기 ⚙» 줄을 못 눌렀다');
  await wait(300);
  t = txt();
  if (!/양하 순서 — 1호기/.test(t)) fail('«양하 순서 — 1호기» 창이 안 열렸다: ' + t.slice(0, 200));
  for (const k of ['풀부터', '엠티부터', '일반부터', '리퍼부터', '20부터', '40부터']) if (!t.includes(k)) fail(`창에 [${k}] 칸이 없다`);
  if (!/엠티↔일반·리퍼/.test(t)) fail('창 안내에 엠티↔일반·리퍼 충돌이 안 적혔다');
  if (!clickBy(/^해상부터$/)) fail('창의 [해상부터] 버튼이 없다');
  await wait(400);
  let wo = dom.window.__calls.filter(c => c.fn === 'workOrder');
  if (wo.length !== 1 || wo[0].vk !== 'NSDC_2608N' || wo[0].equip !== '1호기' || !wo[0].order || wo[0].order.rowFrom !== 'sea' || (wo[0].order.prefs || []).length !== 0)
    fail('저장 호출이 1호기 칸 {rowFrom:sea, prefs:[]} 한 건이 아니다: ' + JSON.stringify(wo));
  if (dom.window.__calls.some(c => c.fn === 'updateInfo' && c.patch && 'seqRowFrom' in c.patch)) fail('옛 항차 단위 seqRowFrom 을 또 썼다 — 4.09 부터는 호기 칸에만 쓴다');
  //  RTDB 반영을 흉내 — info.workOrder['1호기']={rowFrom:'sea'} 로 다시 그리면 줄이 «순서 해상부터» 가 되고 첫 카드가 00열로 바뀐다
  dom.window.__render('', { '1호기': { rowFrom: 'sea', prefs: '' } });
  await wait(500);
  t = txt();
  if (!/순서\s*해상부터/.test(t)) fail('저장 뒤 줄이 «순서 해상부터» 가 아니다: ' + t.slice(0, 200));
  const p1 = firstPos(t);
  if (!/^1?\d-00-88$/.test(p1)) fail(`해상부터 첫 카드 자리가 10-00-88 이 아니다 (${p1}): ` + t.slice(0, 200));
  //  다른 호기 칸만 있으면 이 호기(1호기)는 영향이 없다 — 호기별 저장
  dom.window.__render('', { '2호기': { rowFrom: 'sea', prefs: 'RF' } });
  await wait(400);
  t = txt();
  if (!/순서\s*육상부터/.test(t) || /순서\s*해상부터/.test(t)) fail('2호기 칸이 1호기 화면에 새어 들어왔다: ' + t.slice(0, 200));
  //  옛 항차 단위 seqRowFrom='sea' 만 있으면(4.09 이전 저장) 호기 칸이 없는 호기는 그 방향을 따른다
  dom.window.__render('sea');
  await wait(400);
  t = txt();
  if (!/순서\s*해상부터/.test(t)) fail('옛 seqRowFrom=sea 를 읽지 못한다: ' + t.slice(0, 200));
  //  부류 조건 — [리퍼부터] → fbSetWorkOrder({prefs:[RF]})
  dom.window.__render('', { '1호기': { rowFrom: 'land', prefs: '' } });
  await wait(400);
  if (!clickBy(/^리퍼부터$/)) fail('창의 [리퍼부터] 버튼이 없다');
  await wait(400);
  wo = dom.window.__calls.filter(c => c.fn === 'workOrder');
  const last = wo[wo.length - 1];
  if (!last || last.order.rowFrom !== 'land' || last.order.prefs.join(',') !== 'RF') fail('[리퍼부터] 저장이 {land, [RF]} 가 아니다: ' + JSON.stringify(last));
  dom.window.__render('', { '1호기': { rowFrom: 'land', prefs: 'RF,20' } });
  await wait(500);
  t = txt();
  if (!/1\. 리퍼부터/.test(t) || !/2\. 20부터/.test(t)) fail('창에 우선순위 번호(1. 리퍼부터 · 2. 20부터)가 안 보인다: ' + t.slice(0, 300));
  if (!/순서\s*육상부터 · 리퍼부터 → 20부터/.test(t)) fail('요약 줄 «순서 육상부터 · 리퍼부터 → 20부터» 가 없다: ' + t.slice(0, 300));
  //  엠티를 누르면 리퍼가 빠진다(엠티↔일반·리퍼) — 저장 호출이 그렇게 간다
  if (!clickBy(/^엠티부터$/)) fail('창의 [엠티부터] 버튼이 없다');
  await wait(400);
  wo = dom.window.__calls.filter(c => c.fn === 'workOrder');
  if (wo[wo.length - 1].order.prefs.join(',') !== '20,E') fail('엠티를 누르면 리퍼가 빠지고 «20,E» 가 저장돼야 한다: ' + JSON.stringify(wo[wo.length - 1]));
  //  조건 칩 개수 — 베이 고르는 화면으로 돌아가면 칩에 «+2»
  if (!clickBy(/^베이 선택$/)) fail('[베이 선택] 되돌아가기 버튼이 없다');
  await wait(400);
  t = txt();
  if (!/⇄ 육상부터 \+2/.test(t)) fail('조건 2개일 때 베이 화면 칩이 «⇄ 육상부터 +2» 가 아니다: ' + t.slice(0, 200));
  //  [기본으로] — 이 호기 칸만 있으면 칸을 지운다(null)
  dom.window.__render('', { '1호기': { rowFrom: 'sea', prefs: 'RF' } });
  await wait(400);
  if (!/양하 순서 — 1호기/.test(txt())) { if (!clickBy(/⇄ 해상부터/)) fail('칩을 못 눌렀다'); await wait(300); }
  if (!clickBy(/^기본으로$/)) fail('창의 [기본으로] 버튼이 없다');
  await wait(300);
  if (!/양하 순서를 기본으로/.test(txt())) fail('[기본으로] 확인 모달이 안 떴다: ' + txt().slice(0, 200));
  if (!clickBy(/^맞습니다$/)) fail('[맞습니다] 버튼이 없다');
  await wait(400);
  wo = dom.window.__calls.filter(c => c.fn === 'workOrder');
  if (wo[wo.length - 1].order !== null) fail('호기 칸만 있을 때 [기본으로]는 그 칸을 지워야(null) 한다: ' + JSON.stringify(wo[wo.length - 1]));
  //  [기본으로] — «전체» 칸이 남아 있으면 지워서는 기본이 안 되므로 육상부터·조건 없음을 이 호기 칸에 적는다(감사 6)
  dom.window.__render('', { '전체': { rowFrom: 'sea', prefs: 'RF' } });
  await wait(400);
  if (!clickBy(/^기본으로$/)) fail('«전체» 칸 상태에서 [기본으로] 버튼이 없다');
  await wait(300);
  if (!clickBy(/^맞습니다$/)) fail('[맞습니다] 버튼이 없다(전체 칸)');
  await wait(400);
  wo = dom.window.__calls.filter(c => c.fn === 'workOrder');
  const lw = wo[wo.length - 1];
  if (!lw.order || lw.order.rowFrom !== 'land' || (lw.order.prefs || []).length !== 0) fail('«전체» 칸이 남은 상태의 [기본으로]는 {land, []} 를 적어야 한다: ' + JSON.stringify(lw));
  console.log(`✓ 양하 순서 칩·줄·창 연막검사 통과 (육상부터 ${p0} → 창 → 1호기 칸 {sea} → 해상부터 ${p1} · 단 화면 칩 열림 · 다른 호기 무영향 · 옛 seqRowFrom 읽기 · 리퍼→20 번호 · 엠티 충돌 · +2 칩 · 기본으로(칸 삭제/기본값 기록) · 오류 0)`);
  process.exit(0);
})();
