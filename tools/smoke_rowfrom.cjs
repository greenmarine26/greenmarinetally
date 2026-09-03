// 양하 «해상부터» 칩(3.3) — jsdom 으로 자동 가이드를 그리고 칩을 눌러 저장 호출과 순서 변화를 본다. 실패하면 빌드를 세운다.
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
  //  실제 순서 — 호기 → (접안은 info 에 있음) → 베이 → 데크
  clickBy(/🏗 1호기/); await wait(400);
  if (!/우현 접안/.test(txt())) fail('접안 칩(우현 접안)이 없다 — info.berthSide 가 안 읽혔다: ' + txt().slice(0, 160));
  if (!clickBy(/^B9·10·11|^B10/)) fail('10번 베이 묶음 버튼이 없다: ' + txt().slice(0, 200));
  await wait(300);
  if (!clickBy(/데크/)) fail('데크 단 버튼이 없다');
  await wait(500);
  let t = txt();
  if (!/⇄ 육상부터/.test(t)) fail('기본 칩 [⇄ 육상부터]가 없다: ' + t.slice(0, 200));
  //  기본(육상부터) 첫 카드 = 10번 88단 바깥 홀수(09) — smoke_guided 와 같은 실데이터 결론
  const firstPos = (s) => (s.match(/(\d{1,2})-(\d{2})-(\d{2})/) || [])[0] || '';
  const p0 = firstPos(t);
  if (!/^1?\d-09-88$/.test(p0)) fail(`육상부터 첫 카드 자리가 10-09-88 이 아니다 (${p0}): ` + t.slice(0, 200));
  //  칩을 누른다 → 확인 모달 → 맞습니다 → updateInfo({seqRowFrom:'sea'})
  if (!clickBy(/⇄ 육상부터/)) fail('칩을 못 눌렀다');
  await wait(300);
  t = txt();
  if (!/양하 순서 변경/.test(t) || !/해상부터/.test(t)) fail('확인 모달(양하 순서 변경 → 해상부터)이 안 떴다: ' + t.slice(0, 200));
  if (!clickBy(/^맞습니다$/)) fail('[맞습니다] 버튼이 없다');
  await wait(400);
  const up = dom.window.__calls.filter(c => c.fn === 'updateInfo');
  if (up.length !== 1 || up[0].vk !== 'NSDC_2608N' || up[0].patch.seqRowFrom !== 'sea') fail('저장 호출이 {seqRowFrom:"sea"} 한 건이 아니다: ' + JSON.stringify(up));
  //  RTDB 반영을 흉내 — info.seqRowFrom='sea' 로 다시 그리면 칩이 [⇄ 해상부터] 가 되고 첫 카드가 00열로 바뀐다
  dom.window.__render('sea');
  await wait(500);
  t = txt();
  if (!/⇄ 해상부터/.test(t)) fail('저장 뒤 칩이 [⇄ 해상부터]가 아니다: ' + t.slice(0, 200));
  const p1 = firstPos(t);
  if (!/^1?\d-00-88$/.test(p1)) fail(`해상부터 첫 카드 자리가 10-00-88 이 아니다 (${p1}): ` + t.slice(0, 200));
  console.log(`✓ 양하 «해상부터» 칩 연막검사 통과 (육상부터 ${p0} → 저장 {seqRowFrom:sea} → 해상부터 ${p1} · 오류 0)`);
  process.exit(0);
})();
