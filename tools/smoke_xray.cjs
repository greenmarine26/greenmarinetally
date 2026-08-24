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
  //  ⚠ 인쇄 블록(.xr-print)이 상시 렌더라 같은 목록이 두 벌 있다 — 화면 표만 본다.
  const order = [...doc.querySelectorAll('tbody tr')]
    .filter((tr) => !tr.closest('.xr-print'))
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

  // ④ 인쇄물 — **기존 양식 여섯 칸이 한 칸도 빠지면 안 된다** (검수사 실물 대조 2026-08-24)
  const html = dom.window.__xrayHtml || '';
  if (!html) { console.log('✗ 인쇄 문서가 안 만들어졌다'); process.exit(1); }
  for (const [label, val] of [['항차/항공편명', '2601E'], ['운항선사', 'SMOK'], ['입항일자', '2026.08.24'],
                              ['양륙항', 'KRPTK'], ['선박명', 'SMOKE VESSEL'], ['선박 호출부호', 'SMK9'], ['MRN', '26SMOK2601I']]) {
    if (!html.includes(label)) { console.log('✗ 인쇄 머리에 «' + label + '» 칸이 없다 — 기존 양식에서 빠졌다'); process.exit(1); }
    if (val && !html.includes(val)) { console.log('✗ 인쇄 머리 «' + label + '» 값(' + val + ')이 안 찍힌다'); process.exit(1); }
  }
  for (const c of ['컨테이너번호', '선사SEAL NO', '화물구분', '규격', '선내위치', '부착 세관봉인번호', '봉인자']) {
    if (!html.includes(c)) { console.log('✗ 인쇄 열 «' + c + '» 이 없다'); process.exit(1); }
  }
  if (!/XRAY리스트/.test(html)) { console.log('✗ 인쇄 제목에 «XRAY리스트»가 없다'); process.exit(1); }
  if (!/class="bl"/.test(html)) { console.log('✗ 값 없는 칸이 손글씨용 밑줄로 안 나온다'); process.exit(1); }
  //  40대 → 20+20 균등 분할(검수사 «40대라면 20대 20대»)
  const pgs = (html.match(/class="pg"/g) || []).length;
  if (pgs !== 2) { console.log('✗ 40대가 2장으로 안 갈린다 (나온 장수 ' + pgs + ')'); process.exit(1); }
  if (!/1 \/ 2 장/.test(html) || !/2 \/ 2 장/.test(html)) { console.log('✗ 쪽마다 «N / M 장» 표기가 없다'); process.exit(1); }
  if ((html.match(/항차\/항공편명/g) || []).length !== 2) { console.log('✗ 쪽마다 머리가 안 반복된다'); process.exit(1); }
  //  ⑤ 시안 양식 기준 — 여백(좌우1.8 상1.9 하1) · 폰트 자동조절(10대 9.5pt/pad8 · 20대 8pt/pad5)
  for (const m of ['margin-top:1.9cm', 'margin-left:1.8cm', 'margin-right:1.8cm', 'margin-bottom:1cm']) {
    if (!html.includes(m)) { console.log('✗ 시안 여백 기준 «' + m + '» 이 없다'); process.exit(1); }
  }
  if (!/font-size:8pt/.test(html) || !/padding:5px/.test(html)) { console.log('✗ 20대/장에서 8pt·pad5 가 아니다'); process.exit(1); }
  const small = dom.window.__xrayHtml10 || '';
  if (!/font-size:9\.5pt/.test(small) || !/padding:8px/.test(small)) { console.log('✗ 10대 이하에서 9.5pt·pad8 로 안 커진다 — 시안 폰트 자동조절'); process.exit(1); }
  if (!/전체 40대/.test(html)) { console.log('✗ 머리 부제(전체 N대)가 안 찍힌다'); process.exit(1); }

  const kpi = doc.querySelectorAll('button.rounded-xl').length;
  console.log(`✓ X-RAY 탭 연막검사 통과 (${t.length}자 · 정렬 O · 화물구분 4종 O · 미입력 O · 인쇄 머리 6칸·7열 O · 밑줄칸 O · 40대→2장 O · 여백 O · 폰트조절 O · 카드 ${kpi}장 · 오류 0)`);
  process.exit(0);
}, 900);
