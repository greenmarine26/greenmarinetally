// 시프팅 목록 «양하 · 선적 · 실제»가 실데이터로 맞게 세고 그려지는지 재는 연막검사 (TallyOne 3.65).
//
//  왜 있는가 — 검수사 2026-09-28 *«시프팅 리스트에서 양하/선적/실제위치(컨별 선적완료시 마다 추가)되게 해주세요»*.
//    선사 RESTOW LIST 는 작업 전 계획이다 — MCSN 639S 20대 중 실은 자리가 계획과 같은 것은 1대뿐이었다.
//    실제 자리는 수집기 2.37 이 카토스 «컨테이너 조회»(반출입 구분 Shift)에서 voyages/{키}/restowActual 에 넣는다.
//  기준(검수사 규칙에서 뽑은 것) — ① 실제 = 카토스 실은 자리, 단 검수원이 넣은 자리가 있으면 그것이 먼저이고 다르면 ⚠ 로 둘 다
//    ② 계획(선적)과 실제는 따로 보인다 ③ 실릴 때마다 채워진다(없으면 «—», 머리줄 «실제 N/M») ④ 카토스에만 있는 시프팅은 목록을 안 바꾸고 따로.
//  자료 — tools/fixtures/shift_actual_real.json (MCSN_637N restowList RTDB 사본 · 카토스 09-28 GET 사본을 수집기 2.37 to_restow 로 바꾼 값).
//    실은 자리 기준표 = 마감텔리 «MCSN 639S PTK.EDI»·«.ASC» 20/20 (09-28 09:27 메일) — 아래 REF 는 그 표에서 옮겼다.
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_shiftactual.cjs <렌더번들.js>'); process.exit(1); }

const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://x/' });
global.window = dom.window; global.document = dom.window.document;
global.navigator = dom.window.navigator; global.HTMLElement = dom.window.HTMLElement;
global.localStorage = dom.window.localStorage; global.CustomEvent = dom.window.CustomEvent;
global.MouseEvent = dom.window.MouseEvent; global.Event = dom.window.Event;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = clearTimeout;
dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });

let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (c) pass++; else fail++; };
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(String(e.error || e.message)));

console.log('시프팅 목록 양하·선적·실제 (MCSN 639S 20대 · XTPG 541W 50대 카토스 실자료)');
require(path.resolve(B));
const { shiftingListOf, shiftActualOf, restowActualExtra, fmtShiftPos, restowMapFromDoc, FX } = dom.window.__SA;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const kst = (y, mo, d, h = 0, mi = 0, s = 0) => Date.UTC(y, mo - 1, d, h - 9, mi, s);
const clone = (o) => JSON.parse(JSON.stringify(o));

//  마감텔리 선적 EDI·ASC 와 같은 표(09-28 대조) — 컨: [실은 자리, 실은 시각 hh:mm:ss]
const REF = {
  CAAU5414620: ['18-07-86', '04:19:51'], CAJU5182990: ['06-03-84', '03:15:55'], FFAU7459437: ['06-01-84', '03:14:33'], FFAU7483027: ['06-02-84', '03:13:01'],
  MRKU5639430: ['06-01-82', '03:08:52'], MRKU9556951: ['31-03-04', '02:52:32'], MRSU0738515: ['31-04-06', '02:58:16'], MRSU0773901: ['29-04-06', '02:58:16'],
  MRSU0773922: ['29-03-04', '02:52:32'], MRSU0811025: ['31-04-04', '02:50:03'], MRSU0883560: ['29-04-04', '02:50:03'], MRSU2722565: ['06-03-82', '03:10:32'],
  MRSU5623864: ['18-09-82', '04:09:53'], MRSU5891574: ['18-07-84', '04:16:10'], MRSU8157097: ['18-07-82', '04:11:20'], MRSU9229798: ['06-02-82', '03:07:24'],
  MRSU9754287: ['22-12-82', '05:22:37'], SUDU6884485: ['18-09-84', '04:14:10'], TCNU7966115: ['18-09-86', '04:18:15'], TRHU8342781: ['22-07-10', '04:57:54'],
};
const hms = (s) => s.split(':').map(Number);

(async () => {
  await wait(300);
  const doc = dom.window.document;
  const M = FX.MCSN_637N;

  // ── ① 자리 글자 ──
  ok(fmtShiftPos('0180786') === '18-07-86' && fmtShiftPos('0060384') === '06-03-84' && fmtShiftPos('1000284') === '100-02-84', '7자리 → 두 자리 베이 글자(0180786 → 18-07-86 · 100베이는 세 자리)');
  ok(fmtShiftPos('6-02-82') === '6-02-82' && fmtShiftPos('') === '' && fmtShiftPos(null) === '', '예측 꼴·빈칸은 그대로');

  // ── ② MCSN 639S — 카토스 실적만 있을 때 ──
  const vM = { restowList: M.restowList, restowActual: M.restowActual, loading: { records: {} } };
  const map = restowMapFromDoc(M.restowList);
  const L = shiftingListOf(map, {}, vM);
  ok(L.length === 20, `목록 20대 (${L.length})`);
  const bad = L.filter((x) => !REF[x.cn] || fmtShiftPos(x.act) !== REF[x.cn][0] || x.actAt !== kst(2026, 9, 28, ...hms(REF[x.cn][1])) || x.actSrc !== 'catos');
  ok(!bad.length, `실제 자리·실은 시각 = 마감텔리 EDI·ASC 표 20/20 (어긋남 ${bad.map((x) => x.cn).join(',') || '없음'})`);
  ok(L.every((x) => x.from === String(M.restowList[x.cn].from).padStart(7, '0') && x.to === String(M.restowList[x.cn].to).padStart(7, '0')), '양하·선적 칸은 선사 RESTOW LIST 그대로(계획)');
  const diffPlan = L.filter((x) => x.act !== x.to).length;
  ok(diffPlan === 19, `실제 ≠ 선사 계획 19/20 — 계획과 실제가 따로 보여야 하는 이유 (${diffPlan})`);
  ok(L.every((x, i) => i === 0 || String(L[i - 1].from) <= String(x.from)), '양하 자리 순 정렬(종전 그대로)');
  const T = L.find((x) => x.cn === 'TRHU8342781');
  ok(fmtShiftPos(T.from) === '26-10-02' && fmtShiftPos(T.to) === '30-12-82' && fmtShiftPos(T.act) === '22-07-10', `TRHU8342781 양하 26-10-02 · 선적(계획) 30-12-82 · 실제 22-07-10 (${fmtShiftPos(T.from)} · ${fmtShiftPos(T.to)} · ${fmtShiftPos(T.act)})`);

  // ── ③ 검수원 자리 — 실린 뒤 본 자리만 먼저(선적 완료가 있을 때) · 시각은 터미널 실은 시각이 먼저 ──
  const CAT_AT = kst(2026, 9, 28, 4, 19, 51);
  const humanRec = (row, at) => ({ cn: 'CAAU5414620', bay_actual: '18', row_actual: row, tier_actual: '86', actual_at: at, actual_by: '김성일',
    moves: [{ at, by: '김성일', why: 'actual', from: '', to: `18-${row}-86`, byCn: '' }] });
  const vH = clone(vM);
  vH.loading.records.CAAU5414620 = humanRec('09', kst(2026, 9, 28, 4, 25));
  let a = shiftActualOf(vH, 'CAAU5414620');
  ok(a && a.src === 'catos' && fmtShiftPos(a.to) === '18-07-86', `완료 없이 적은 자리(수석 편집·위치 지정)는 실제로 안 친다 — 터미널 18-07-86 (${a && a.src})`);
  vH.loading.completed = { CAAU5414620: { at: kst(2026, 9, 28, 4, 21), by: '김성일', src: '' } };
  a = shiftActualOf(vH, 'CAAU5414620');
  ok(a && a.src === 'app' && fmtShiftPos(a.to) === '18-09-86' && a.diff === true && fmtShiftPos(a.catosTo) === '18-07-86', `검수원이 완료한 컨 — 검수원 18-09-86 먼저 · 터미널 18-07-86 과 다르면 diff (${JSON.stringify(a)})`);
  ok(a.at === CAT_AT, `시각은 터미널 실은 시각 04:19:51 — 검수원 입력 시각 04:25 가 아니다 (${a.at === CAT_AT})`);
  vH.loading.records.CAAU5414620.row_actual = '07';
  a = shiftActualOf(vH, 'CAAU5414620');
  ok(a && a.src === 'app' && a.diff === false, '검수원 자리 = 터미널 → diff 없음');
  vH.loading.completed = { CAAU5414620: { at: CAT_AT, by: '', src: 'term' } };
  vH.loading.records.CAAU5414620 = humanRec('09', kst(2026, 9, 28, 6, 30));
  a = shiftActualOf(vH, 'CAAU5414620');
  ok(a && a.src === 'app' && a.diff === true, '터미널 반영 완료 뒤에 적은 자리(기록지 사진) — 사람 자리');
  vH.loading.records.CAAU5414620 = humanRec('09', kst(2026, 9, 28, 3, 50));
  a = shiftActualOf(vH, 'CAAU5414620');
  ok(a && a.src === 'catos', '터미널 반영 완료 전에 옮겨 둔 자리(부두에 있을 때 편집) — 터미널이 이긴다');
  vH.loading.completed = { CAAU5414620: { at: kst(2026, 9, 28, 4, 21), by: '김성일', src: '' } };
  vH.loading.records.CAAU5414620 = Object.assign(humanRec('07', kst(2026, 9, 28, 4, 25)), { _pos_src: 'catos' });
  a = shiftActualOf(vH, 'CAAU5414620');
  ok(a && a.src === 'catos', '터미널이 얹은 행(_pos_src)은 사람 자리가 아니다');
  delete vH.loading.records.CAAU5414620._pos_src;
  vH.loading.ediContainers = { CAAU5414620: { bay: '18', row: '07', tier: '86' } };
  vH.loading.records.CAAU5414620.moves.push({ at: 1, by: 'x', why: 'loaded', from: '', to: '18-07-86' });
  a = shiftActualOf(vH, 'CAAU5414620');
  ok(a && a.src === 'catos', '선적확인이 EDI 계획을 베낀 자리(마지막 loaded · to = 계획)는 사람 자리가 아니다');
  delete vH.loading.ediContainers;
  a = shiftActualOf(vH, 'CAAU5414620');
  ok(a && a.src === 'app', '계획(EDI)이 없으면 베낄 것이 없다 — 사람 자리');
  vH.loading.records.CAAU5414620.bay_actual = '__WAIT';
  a = shiftActualOf(vH, 'CAAU5414620');
  ok(a && a.src === 'catos', '창고 표식(__) 은 자리가 아니다');
  const vOnly = { restowList: M.restowList, loading: { records: { CAAU5414620: humanRec('09', kst(2026, 9, 28, 6, 30)) }, completed: { CAAU5414620: { at: kst(2026, 9, 28, 4, 21), by: '김성일' } } } };
  a = shiftActualOf(vOnly, 'CAAU5414620');
  ok(a && a.src === 'app' && a.at === kst(2026, 9, 28, 4, 21) && a.catosTo === '', '터미널 기록이 없으면 검수원 자리 · 시각은 완료 시각');
  ok(shiftActualOf({ restowList: M.restowList, loading: { records: {} } }, 'CAAU5414620') === null, '터미널 실적도 사람 자리도 없으면 null');

  // ── ④ 카토스에만 있는 시프팅 ──
  const rl19 = clone(M.restowList); delete rl19.TRHU8342781; rl19._meta.total = 19;
  const L19 = shiftingListOf(restowMapFromDoc(rl19), {}, { restowList: rl19, restowActual: M.restowActual, loading: {} });
  const ex = restowActualExtra({ restowActual: M.restowActual }, new Set(L19.map((x) => x.cn)));
  ok(ex.length === 1 && ex[0].cn === 'TRHU8342781' && fmtShiftPos(ex[0].to) === '22-07-10' && fmtShiftPos(ex[0].from) === '26-10-02', `목록 밖 1대 = TRHU8342781 (${JSON.stringify(ex)})`);
  const X = FX.XTPG_541E;
  const exX = restowActualExtra({ restowActual: X.restowActual }, new Set());
  ok(exX.length === 50 && exX[0].at <= exX[49].at && exX[0].at === kst(2026, 9, 22, 19, 38, 28), `XTPG 목록 없음 → 50대 전부 따로, 실은 시각 순 (첫 ${exX[0].cn})`);

  // ── ⑤ 화면 — 리스트 탭 시프팅 줄 ──
  const head = () => [...doc.querySelectorAll('#lt button')].find((b) => /쉬프팅\(재적부\)/.test(b.textContent));
  window.__setShift(L, { restowExtra: [] }); await wait(80);
  let h = head();
  ok(!!h && /쉬프팅\(재적부\) 20/.test(h.textContent) && /실제 20\/20/.test(h.textContent), `머리줄 «쉬프팅(재적부) 20 · 실제 20/20» (${h && h.textContent.slice(0, 60)})`);
  h.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); await wait(80);
  const rows = doc.querySelectorAll('#lt [data-shift-cn]');
  ok(rows.length === 20, `행 20개 (${rows.length})`);
  const r1 = doc.querySelector('#lt [data-shift-cn="CAAU5414620"]');
  const col = (r, c) => (r.querySelector(`[data-col="${c}"]`) || {}).textContent || '';
  ok(col(r1, 'from') === '44-11-88' && col(r1, 'to') === '18-09-86' && /^18-07-86/.test(col(r1, 'act')) && /04:19/.test(col(r1, 'act')) && /터미널/.test(col(r1, 'act')),
     `CAAU5414620 칸 — 양하 ${col(r1, 'from')} · 선적 ${col(r1, 'to')} · 실제 ${col(r1, 'act')}`);
  ok(/양하/.test(doc.querySelector('#lt [data-shift-list]').textContent) && /실제/.test(doc.querySelector('#lt [data-shift-list]').textContent), '머리 칸 «컨테이너 · 양하 · 선적 · 실제»');

  //  실릴 때마다 — 5대만 실린 때
  const part = {}; ['MRSU0811025', 'MRSU0883560', 'MRKU9556951', 'MRSU0773922', 'MRSU0738515'].forEach((cn) => { part[cn] = M.restowActual[cn]; });
  const Lp = shiftingListOf(map, {}, { restowList: M.restowList, restowActual: part, loading: {} });
  window.__setShift(Lp, { restowExtra: [] }); await wait(80);
  h = head();
  ok(/실제 5\/20/.test(h.textContent), `5대 실렸을 때 «실제 5/20» (${h.textContent.slice(0, 50)})`);
  const rNot = doc.querySelector('#lt [data-shift-cn="CAAU5414620"]');
  ok(col(rNot, 'act').trim() === '—', `아직 안 실린 컨은 «—» (${col(rNot, 'act')})`);
  const rYes = doc.querySelector('#lt [data-shift-cn="MRSU0811025"]');
  ok(/^31-04-04/.test(col(rYes, 'act')) && /02:50/.test(col(rYes, 'act')) && /터미널/.test(col(rYes, 'act')), `실린 컨은 자리·시각 (${col(rYes, 'act')})`);
  //  하나도 안 실렸을 때
  window.__setShift(shiftingListOf(map, {}, { restowList: M.restowList, loading: {} }), { restowExtra: [] }); await wait(80);
  ok(!/실제/.test(head().textContent), '하나도 안 실렸으면 머리줄에 «실제» 없음(종전 그대로)');

  //  검수원 자리가 카토스와 다를 때 ⚠
  const vD = clone(vM); vD.loading.records.CAAU5414620 = { cn: 'CAAU5414620', bay_actual: '18', row_actual: '09', tier_actual: '86', actual_at: kst(2026, 9, 28, 4, 25), moves: [{ why: 'actual', to: '18-09-86' }] };
  vD.loading.completed = { CAAU5414620: { at: kst(2026, 9, 28, 4, 21), by: '김성일' } };
  window.__setShift(shiftingListOf(map, {}, vD), { restowExtra: [] }); await wait(80);
  const rD = doc.querySelector('#lt [data-shift-cn="CAAU5414620"]');
  ok(/^18-09-86/.test(col(rD, 'act')) && /04:19 검수원/.test(col(rD, 'act')) && /⚠ 터미널 18-07-86/.test(col(rD, 'act')) && !!rD.querySelector('[data-col="act"] .text-amber-300'), `검수원 자리 먼저 + ⚠ 카토스 자리 (${col(rD, 'act')})`);

  //  카토스에만 있는 컨 — 목록 아래 따로
  window.__setShift(L19, { restowExtra: ex }); await wait(80);
  const exEl = doc.querySelector('#lt [data-shift-extra]');
  ok(!!exEl && /1대/.test(exEl.textContent) && /TRHU8342781/.test(exEl.textContent) && /22-07-10/.test(exEl.textContent) && /04:57/.test(exEl.textContent), `목록 밖 1대 따로 (${exEl && exEl.textContent.slice(0, 90)})`);
  ok(doc.querySelectorAll('#lt [data-shift-cn]').length === 19 && /쉬프팅\(재적부\) 19/.test(head().textContent), '목록 대수는 서류 그대로 19(카토스 것을 섞지 않는다)');
  //  목록이 비었는데 카토스 실적만 있는 배(XTPG)
  window.__setShift([], { restowExtra: exX }); await wait(80);
  h = head();
  ok(!!h, '목록 0대여도 카토스 시프팅 실적이 있으면 쉬프팅 줄이 보인다');
  if (!doc.querySelector('#lt [data-shift-extra]')) { h.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); await wait(80); }
  const exX2 = doc.querySelector('#lt [data-shift-extra]');
  ok(!!exX2 && /50대/.test(exX2.textContent) && exX2.querySelectorAll('.mono').length === 50, `XTPG 50대 따로 (${exX2 && exX2.querySelectorAll('.mono').length})`);

  // ── ⑥ 검증 박스 ◆ 목록 창 · 인쇄 ──
  window.__setShift(L, { restowExtra: [] }); await wait(80);
  const vbBtn = [...doc.querySelectorAll('#vb button')].find((b) => /쉬프팅|◆/.test(b.textContent) && /20/.test(b.textContent));
  ok(!!vbBtn, '검증 박스 ◆ 쉬프팅 20 칸');
  vbBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); await wait(80);
  const modal = [...doc.querySelectorAll('div')].find((d) => /쉬프팅\(재적부\) 20/.test(d.textContent) && /인쇄/.test(d.textContent) && d.className.includes('fixed'));
  ok(!!modal && /실제 18-07-86 04:19/.test(modal.textContent) && /18-09-86/.test(modal.textContent), '목록 창 — CAAU5414620 «실제 18-07-86 04:19»');
  let printed = '';
  dom.window.open = () => ({ document: { write: (h2) => { printed += h2; }, close() {} } });
  const pBtn = [...modal.querySelectorAll('button')].find((b) => /인쇄/.test(b.textContent));
  pBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); await wait(50);
  ok(/<th>양하 위치<\/th><th>선적 위치<\/th><th>실제 위치<\/th><th>실은 시각<\/th>/.test(printed), '인쇄 머리 «양하 위치 · 선적 위치 · 실제 위치 · 실은 시각»');
  ok(/CAAU5414620<\/td>.*?44-11-88<\/td><td class="mono">18-09-86<\/td><td class="mono">18-07-86<\/td><td>04:19<\/td>/.test(printed), '인쇄 행 — CAAU5414620 44-11-88 · 18-09-86 · 18-07-86 · 04:19');
  ok((printed.match(/<tr><td>\d+<\/td>/g) || []).length === 20, '인쇄 20행');

  // ── ⑦ 검수 리스트 인쇄 [별첨2] — 같은 세 칸 ──
  const il = dom.window.__SA.generateInspectionListHTML([{ cn: 'CAAU4518954', pol: 'KRPTK', pod: 'CNTAO', iso: '4510', fe: 'F', op: 'MAE', bay: '30', row: '10', tier: '04' }], 'loading', { vsl: 'MCSN', voy: '639S' }, L);
  ok(/<th>양하 위치<\/th><th>선적 위치<\/th><th>실제 위치<\/th><th>확인<\/th>/.test(il), '[별첨2] 머리 «양하 위치 · 선적 위치 · 실제 위치 · 확인»');
  ok(/CAAU5414620<\/td>.*?<td class="cn">44-11-88<\/td><td class="cn">18-09-86<\/td><td class="cn">18-07-86 04:19<\/td>/s.test(il), '[별첨2] CAAU5414620 44-11-88 · 18-09-86 · 18-07-86 04:19');
  ok(!/<td class="cn">0\d{6}<\/td>/.test(il), '[별첨2] 7자리 날것(0180786)이 안 찍힌다');
  ok(!errs.length, `화면 오류 없음 ${errs.slice(0, 2).join(' | ')}`);
  console.log(`\n시프팅 목록 양하·선적·실제 ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('✗ 검사 자체가 죽었습니다 —', e); process.exit(1); });
