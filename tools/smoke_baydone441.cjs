// 수석 상황판 «완료·남은 베이»(4.41, utils.bayDoneSplitOf·bayDoneTextOf) 연막검사 — 실데이터(TMPZ 2035E·DXQD 2641E·STSE 2681E)로 장별 대수를 동방 터미널 bayWork 와 대조하고 한 줄 글자를 확인한다.
const path = require('path');
const fs = require('fs');
const B = process.argv[2], C = process.argv[3];
if (!B || !C) { console.error('사용법: node tools/smoke_baydone441.cjs <utils 번들.cjs> <cargoPlanCore 번들.cjs>'); process.exit(1); }
global.window = global.window || {}; global.document = global.document || { createElement: () => ({}) };
const U = require(path.resolve(B));
const CP = require(path.resolve(C));
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'baydone441.json'), 'utf8'));
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('수석 상황판 «완료·남은 베이»(4.41)');

const pad2 = (x) => String(x ?? '').padStart(2, '0');
//  보드 LiveShipCard.boardContainers 와 같은 자리(실적 > 맞교환 > 계획 · 임시창고·자리 내준 컨은 자리 없음)
function boardRows(voyage, mode) {
  const sec = voyage[mode]; if (!sec) return [];
  const ediMap = U.applySwapFix(U.fullEdiMapOf(sec), U.swapFixList(voyage));
  const recAll = sec.records || {}; const recMap = {};
  for (const cn of U.ownDirCns(recAll, mode)) recMap[cn] = recAll[cn];
  return Object.values(ediMap).map((e) => {
    const rec = recMap[e.cn] || {};
    const gone = rec.bay_actual === '__STG__' || !!rec.planTaken;
    const hasA = !gone && rec.bay_actual !== undefined && rec.bay_actual !== '' && rec.bay_actual !== null && !String(rec.bay_actual).startsWith('__');
    const hasG = !gone && !hasA && rec.bay_assign && rec.row_assign && rec.tier_assign && !String(rec.bay_assign).startsWith('__');
    return { ...e, _inList: !!recMap[e.cn] || !!e._inList,
      bay: gone ? '' : pad2(hasA ? rec.bay_actual : hasG ? rec.bay_assign : e.bay),
      row: gone ? '' : pad2(hasA ? rec.row_actual : hasG ? rec.row_assign : e.row),
      tier: gone ? '' : pad2(hasA ? rec.tier_actual : hasG ? rec.tier_assign : e.tier) };
  });
}
const pagesOf = (code) => CP.buildBayPagesFromSummary((FX.bayDict[code] || {}).bayDef) || null;
const run = (vk, mode) => {
  const voyage = FX.voyages[vk];
  const rows = boardRows(voyage, mode);
  const pages = pagesOf(vk.split('_')[0]);
  const S = U.bayDoneSplitOf(rows, mode, voyage[mode].completed, pages);
  return { S, L: U.legendLiveOf(rows, mode, voyage[mode].completed), txt: U.bayDoneTextOf(S), bw: voyage[mode].bayWork || {} };
};

//  ① 장별 데크·홀드 대수 = 동방 터미널 베이별 계획(bayWork — 독립 기준표, 코드가 낸 값이 아님)
for (const [vk, mode] of [['TMPZ_2035E', 'discharge'], ['TMPZ_2035E', 'loading'], ['DXQD_2641E', 'discharge']]) {
  const { S } = run(vk, mode);
  const got = {};
  for (const p of S.parts) { const k = p.lab; (got[k] = got[k] || { deck: 0, hold: 0 })[p.k] = p.n; }
  const want = {};
  for (const [b, x] of Object.entries(run(vk, mode).bw)) { const d = parseInt(x.deck, 10) || 0, h = parseInt(x.hold, 10) || 0; if (d + h) want[b] = { deck: d, hold: h }; }
  const same = JSON.stringify(Object.keys(want).sort().map((k) => [k, want[k].deck, want[k].hold])) === JSON.stringify(Object.keys(got).sort().map((k) => [k, got[k].deck, got[k].hold]));
  ok(same, `${vk} ${mode === 'loading' ? '선적' : '양하'} 장별 데크·홀드 = 터미널 bayWork (${Object.keys(want).sort().map((k) => `${k} ${want[k].deck}+${want[k].hold}`).join(' · ')})`);
  ok(S.noPos === 0, `${vk} ${mode} 자리 모름 0`);
}

//  ② 분모·완료가 별첨(legendLiveOf)과 같다 — 막대·별첨 숫자와 갈리지 않는다
for (const [vk, mode] of [['TMPZ_2035E', 'discharge'], ['TMPZ_2035E', 'loading'], ['DXQD_2641E', 'discharge'], ['STSE_2681E', 'discharge']]) {
  const { S, L } = run(vk, mode);
  const sumN = S.parts.reduce((a, p) => a + p.n, 0) + S.noPos, sumD = S.parts.reduce((a, p) => a + p.done, 0);
  ok(S.n === L.n && S.done === L.done && sumN === L.n && sumD + (S.noPos - S.noPosLeft) === L.done, `${vk} ${mode} 분모 ${S.n}/${L.n} · 완료 ${S.done}/${L.done} — 별첨과 같음`);
}

//  ③ 한 줄 글자 — 관문 4 에서 검수사가 확정한 결과(2026-10-21 05:19 «네»)
const WANT = {
  'TMPZ_2035E|discharge': '✔ 전부 완료',
  'TMPZ_2035E|loading': '남은 — 데크 06(1)·14(6)',
  'DXQD_2641E|discharge': '완료 — 데크 01·04·08·12·16·20·24  (남은 7곳)',
  'STSE_2681E|discharge': '완료 — 데크 16  (남은 14곳)',
};
for (const [k, w] of Object.entries(WANT)) { const [vk, mode] = k.split('|'); const { txt } = run(vk, mode); ok(txt === w, `${vk} ${mode === 'loading' ? '선적' : '양하'} «${txt}»`); }

//  ④ 장 이름 — 사전에 그 짝수 베이가 없으면 홀로 선 홀수(DXQD·STSE 01), 있으면 짝수(TMPZ 02)
ok(run('DXQD_2641E', 'discharge').S.parts[0].lab === '01', 'DXQD 첫 장 이름 01(사전에 02 없음 — 터미널도 01)');
ok(run('STSE_2681E', 'discharge').S.parts[0].lab === '01', 'STSE 첫 장 이름 01');
ok(run('TMPZ_2035E', 'discharge').S.parts[0].lab === '02', 'TMPZ 첫 장 이름 02(사전 2+3 — 터미널도 02)');

//  ⑤ 고르기 규칙 — 끝난 칸이 남은 칸보다 많으면 남은 것, 아니면 끝난 것 · 완료 0 이면 줄 없음
for (const [vk, mode] of [['TMPZ_2035E', 'loading'], ['DXQD_2641E', 'discharge'], ['STSE_2681E', 'discharge']]) {
  const { S } = run(vk, mode);
  ok(S.show === (S.doneN > S.leftN ? 'left' : 'done'), `${vk} ${mode} 끝난 칸 ${S.doneN} · 남은 칸 ${S.leftN} → ${S.show}`);
}
{
  const voyage = FX.voyages.TMPZ_2035E; const rows = boardRows(voyage, 'loading');
  const S0 = U.bayDoneSplitOf(rows, 'loading', {}, pagesOf('TMPZ'));
  ok(S0.show === null && U.bayDoneTextOf(S0) === '', '완료가 하나도 없으면 줄 없음');
  //  자리를 모르는 컨이 남아 있으면 «전부 완료» 라고 하지 않는다
  const comp = { ...voyage.discharge.completed };
  const rowsD = boardRows(voyage, 'discharge').map((c, i) => (i === 0 ? { ...c, bay: '', tier: '' } : c));
  delete comp[rowsD[0].cn];
  const S1 = U.bayDoneSplitOf(rowsD, 'discharge', comp, pagesOf('TMPZ'));
  ok(S1.show !== 'all' && /자리 모름 1대/.test(U.bayDoneTextOf(S1)), `자리 모름 1대 남으면 전부 완료가 아님 «${U.bayDoneTextOf(S1)}»`);
  //  사전이 없으면 줄을 안 낸다 — 폴백 짝수는 없는 베이 번호를 지어낸다(감사 2026-10-21: DXQD «02» · TMPZ «04·08…»)
  const S2 = U.bayDoneSplitOf(boardRows(FX.voyages.DXQD_2641E, 'discharge'), 'discharge', FX.voyages.DXQD_2641E.discharge.completed, null);
  ok(S2.show === null && U.bayDoneTextOf(S2) === '' && S2.noDict, '사전 없으면 줄 없음(없는 베이 번호를 지어내지 않는다)');
  ok(U.bayDoneTextOf(U.bayDoneSplitOf(boardRows(FX.voyages.DXQD_2641E, 'discharge'), 'discharge', FX.voyages.DXQD_2641E.discharge.completed, [])) === '', '빈 사전도 줄 없음');
  //  칸은 다 끝났고 자리 모름만 남으면 «남은 0곳» 을 쓰지 않는다
  const S3 = { show: 'done', list: { deck: [{ lab: '02', n: 1, done: 1 }], hold: [] }, leftN: 0, noPosLeft: 2 };
  ok(U.bayDoneTextOf(S3) === '완료 — 데크 02  (자리 모름 2대)', `«남은 0곳» 없음 «${U.bayDoneTextOf(S3)}»`);
}

if (fail) { console.log(`✗ ${fail}건 실패`); process.exit(1); }
console.log('✓ 수석 상황판 «완료·남은 베이» 연막 통과');
