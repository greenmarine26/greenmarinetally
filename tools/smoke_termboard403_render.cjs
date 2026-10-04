// 4.03 수석 실시간 보드 카드 — jsdom 으로 실제 그려 터미널 본선 현황 표가 설 자리에만 서는지 본다. 실패하면 빌드를 세운다.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(e.message));
console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
try { dom.window.eval(fs.readFileSync(process.argv[2], 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await wait(700);
  const doc = dom.window.document;
  let fail = 0;
  const ok = (c, m, extra) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c || extra === undefined ? '' : '  → ' + extra)); if (!c) fail++; };
  const uniq = [...new Set(errs)];
  if (uniq.length) { console.log('✗ 렌더 중 오류 ' + uniq.length + '건'); uniq.slice(0, 3).forEach((e) => console.log('   ' + e)); process.exit(1); }
  const scn = (id) => doc.querySelector(`[data-scn="${id}"]`);
  const T = (id) => (scn(id) ? scn(id).textContent : '');
  console.log('4.03 수석 보드 카드 — 터미널 본선 현황 표(실데이터 보관본)');
  //  A. PCTC
  ok(!!scn('A') && /MCSC/.test(T('A')), 'A 카드가 떴다(MCSC)', T('A').slice(0, 100));
  const a = scn('A') && scn('A').querySelector('.tbx');
  ok(!!a && /터미널 본선 현황/.test(a.textContent) && /PCTC 7B/.test(a.textContent) && /검수원 입력 아님/.test(a.textContent), 'A(PCTC): 표가 섰다 — 터미널 본선 현황 · PCTC 7B · 검수원 입력 아님');
  const aRows = a ? [...a.querySelectorAll('tr')].map((tr) => [...tr.children].map((c) => c.textContent.trim()).join('|')) : [];
  ok(aRows.includes('작업량|277|230|507') && aRows.includes('완료량|268|36|304') && aRows.includes('잔여량|9|194|203'), 'A: 작업량 277·230·507 / 완료량 268·36·304 / 잔여량 9·194·203(터미널 화면 그대로)', JSON.stringify(aRows));
  ok(aRows.includes('GC101|4|150|154') && aRows.includes('GC102|5|90|95') && aRows.includes('GC103|0|0|0') && aRows.includes('GC104|0|0|0'), 'A: GC별 잔여량 4줄', JSON.stringify(aRows));
  ok(!/호기별 실적이 아직 없습니다/.test(T('A')), 'A: 표가 서면 종전 «호기별 실적이 아직 없습니다» 한 줄은 없다');
  ok(/호기별 작업 베이/.test(T('A')), 'A: 칸 제목 «호기별 작업 베이» 는 그대로');
  //  B. 동방
  const b = scn('B') && scn('B').querySelector('.tbx');
  ok(!!b && /동방 14번선석/.test(b.textContent) && /받은 시각 표시 없음/.test(b.textContent), 'B(동방): 표가 섰다 — 동방 14번선석 · 받은 시각 표시 없음');
  const bRows = b ? [...b.querySelectorAll('tr')].map((tr) => [...tr.children].map((c) => c.textContent.trim()).join('|')) : [];
  ok(bRows.includes('QC103|90|45|45|0|0') && bRows.includes('QC105|268|119|135|0|14') && bRows.includes('합계|358|164|180|0|14'), 'B: QC103·QC105·합계 줄(동방 화면 그대로)', JSON.stringify(bRows));
  ok(!/완료 기록이 와야 그림이 뜹니다/.test(T('B')) && !/호기별 실적이 아직 없습니다/.test(T('B')), 'B: QC 합계로 만든 «완료 기록이 와야 그림이 뜹니다» 칸은 표로 대신하고 종전 한 줄도 없다', T('B').slice(0, 300));
  //  C. 호기 그림이 그려지는 배 — 표가 서면 안 된다
  ok(!!scn('C') && /DJCT/.test(T('C')), 'C 카드가 떴다(DJCT)');
  ok(!(scn('C') && scn('C').querySelector('.tbx')), 'C(그림이 그려지는 배): termStat 이 있어도 표가 안 선다 — 종전 화면 그대로');
  ok(/호기별 작업 베이|지금 작업 중인 베이/.test(T('C')), 'C: 호기별(또는 베이) 그림 칸이 그대로 선다', T('C').slice(0, 200));
  //  D. 자료 없는 배
  ok(!(scn('D') && scn('D').querySelector('.tbx')) && /호기별 실적이 아직 없습니다/.test(T('D')), 'D(터미널 자료도 기록도 없음): 표 없이 종전 안내 한 줄 그대로');
  //  E. 동방 QC 4개 — 표가 서고 펼칠 것이 없는 «+N칸 더» 단추는 없다
  const e = scn('E') && scn('E').querySelector('.tbx');
  const eRows = e ? [...e.querySelectorAll('tr')].map((tr) => [...tr.children].map((c) => c.textContent.trim()).join('|')) : [];
  ok(!!e && ['QC101', 'QC102', 'QC103', 'QC104'].every((q) => eRows.some((r) => r.startsWith(q + '|'))) && eRows.some((r) => r.startsWith('합계|')), 'E(동방 QC 4개): 4줄과 합계가 표에 다 들어 있다', JSON.stringify(eRows));
  ok(!/칸 더/.test(T('E')) && !/완료 기록이 와야 그림이 뜹니다/.test(T('E')), 'E: 표가 호기 칸을 대신하면 «+N칸 더» 단추가 서지 않는다', T('E').slice(0, 300));
  //  F. 접혀 안 보이는 4번째 호기에 그림 자리가 있다 — 표가 서면 안 된다
  ok(!!scn('F') && !scn('F').querySelector('.tbx'), 'F(숨은 4번째 호기에 그림이 있음): 표가 안 선다 — 종전 화면 그대로');
  ok(/칸 더/.test(T('F')), 'F: 종전처럼 «+1칸 더» 가 남아 있다', T('F').slice(0, 300));
  console.log(fail ? `\n✗ ${fail}건 실패` : '\n✓ 4.03 수석 보드 카드 렌더 전부 통과');
  process.exit(fail ? 1 : 0);
})();
