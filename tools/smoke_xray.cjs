// 2.26 X-RAY 탭을 jsdom 에 올려 실제로 그려 본다.
//   ① 정렬 = 베이별순 + 우선양하순  ② 화물구분 4종 집계  ③ 값 없는 칸이 «미입력»
const { JSDOM } = require('jsdom');
const fs = require('fs');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(e.message));
console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 160)); };
try { dom.window.eval(fs.readFileSync(process.argv[2], 'utf8')); }
catch (e) { errs.push('THROW: ' + e.message); }
setTimeout(() => {
  const doc = dom.window.document;
  const t = doc.body.textContent || '';
  const uniq = [...new Set(errs)];
  if (uniq.length) { console.log('✗ 렌더 중 오류 ' + uniq.length + '건'); uniq.slice(0, 3).forEach((e) => console.log('   ' + e)); process.exit(1); }
  if (t.length < 150) { console.log('✗ 렌더 결과가 비었다 (' + t.length + '자)'); process.exit(1); }

  // ① 정렬 — 표 본문의 컨번호 등장 순서
  const order = [...doc.querySelectorAll('tbody tr')]
    .map((tr) => (tr.textContent.match(/SMOKU\d{6}/) || [])[0]).filter(Boolean);
  const want = ['SMOKU100001', 'SMOKU100002', 'SMOKU100004', 'SMOKU100005', 'SMOKU100003', 'SMOKU100006'];
  //  기대 — 베이2 데크84 → 베이2 데크82 → 베이2 홀드08(03열) → 베이2 홀드08(04열) → 베이2 홀드06 → 베이10 데크88
  if (order.join(',') !== want.join(',')) {
    console.log('✗ **정렬이 양하 계획 순서가 아니다**');
    console.log('   나온 것: ' + order.join(' → '));
    console.log('   기대   : ' + want.join(' → '));
    process.exit(1);
  }

  // ② 화물구분 집계 — 통계 카드에 4종이 다 나오는가(즉시검사 포함)
  for (const k of ['X-RAY', 'Sea & Air', '반입후검사', '즉시검사']) {
    if (!t.includes(k)) { console.log('✗ 화물구분 «' + k + '» 이 화면에 없다'); process.exit(1); }
  }

  // ③ 값이 없는 칸 — 봉인은 하나만 채웠으니 «미입력»이 반드시 보여야 한다
  if (!/미입력/.test(t)) { console.log('✗ 값 없는 칸이 «미입력»으로 안 보인다 — 손으로 적을 자리를 못 찾는다'); process.exit(1); }
  if (!/KC0012345/.test(t)) { console.log('✗ 입력된 세관봉인이 안 보인다'); process.exit(1); }
  if (!/박철민/.test(t)) { console.log('✗ 봉인자 폴백(완료 기록의 검수자)이 안 붙었다'); process.exit(1); }

  const kpi = doc.querySelectorAll('button.rounded-xl').length;
  console.log(`✓ X-RAY 탭 연막검사 통과 (${t.length}자 · 정렬 O · 화물구분 4종 O · 미입력 표시 O · 카드 ${kpi}장 · 오류 0)`);
  process.exit(0);
}, 900);
