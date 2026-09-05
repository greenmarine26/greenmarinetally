// 동방(PNCT) 배 «지금 작업 중인 베이»(3.15) — utils.boardBaysOf 가 최근 완료의 계획 자리로 지금 하는 해치를 찾아내는지 실데이터(OBWH 2731E 사본)로 잰다.
const path = require('path');
const fs = require('fs');
const B = process.argv[2], C = process.argv[3];
if (!B || !C) { console.error('사용법: node tools/smoke_boardbays.cjs <utils 번들.cjs> <cargoPlanCore 번들.cjs>'); process.exit(1); }
global.window = global.window || {}; global.document = global.document || { createElement: () => ({}) };
const U = require(path.resolve(B));
const CP = require(path.resolve(C));
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'boardbays_obwh.json'), 'utf8'));
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('실시간 작업 보드 — 동방 «지금 작업 중인 베이»(3.15)');

//  ── 기준표는 픽스처에서 독립 계산한다(코드가 내는 값을 정답지로 쓰지 않는다) ──
const evs = [];
for (const mode of ['discharge', 'loading']) {
  const e = FX[mode].ediContainers, c = FX[mode].completed;
  for (const cn of Object.keys(c)) {
    const at = c[cn].at || 0; const bay = (e[cn] || {}).bay || '';
    const n = parseInt(bay, 10);
    if (at && n > 0) evs.push({ at, mode, n, pair: n % 2 ? n - 1 : n });
  }
}
//  ⚠ 해치는 **베이플랜이 그리는 장**에서 뽑는다 — 코드와 같은 규칙을 다시 짜면 갈림을 못 잡는다(감사 지적 2026-09-06).
const PAGES = CP.buildBayPagesFromSummary(FX.bayDict.bayDef) || [];
for (const x of evs) x.pair = CP.hatchEvenOf(x.n, PAGES);
const last = Math.max(...evs.map((x) => x.at));
const inWin = (min) => evs.filter((x) => x.at >= last - min * 60000);
const tally = (arr) => {
  const m = {};
  for (const x of arr) { const k = x.mode + '|' + x.pair; (m[k] = m[k] || { n: 0, lastAt: 0, bay: '', mode: x.mode }); m[k].n++; if (x.at > m[k].lastAt) { m[k].lastAt = x.at; m[k].bay = String(x.n).padStart(2, '0'); } }
  return Object.entries(m).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.n - a.n || b.lastAt - a.lastAt);
};

ok(evs.length === 470, `픽스처 완료 ${evs.length}대 — 계획 자리 못 찾은 것 0`);
ok(Object.keys(FX.discharge.completed).length + Object.keys(FX.loading.completed).length === 470, '양하 188 + 선적 282 = 470');

//  ① 기본(30분 창·2갱) — 기준표 상위 둘과 같아야 한다
const want2 = tally(inWin(30)).slice(0, 2);
const got2 = U.boardBaysOf({ info: FX.info, discharge: FX.discharge, loading: FX.loading }, 2, 30, PAGES);
ok(got2.length === 2, `2갱이면 칸 둘 — 나온 것 ${got2.length}`);
ok(got2.every((g, i) => g.bay === want2[i].bay && g.mode === want2[i].mode && g.n === want2[i].n && g.lastAt === want2[i].lastAt),
  `30분 창 상위 둘 = ${got2.map((g) => `${g.mode === 'loading' ? '선적' : '양하'} 베이 ${g.bay}×${g.n}`).join(' · ')}`);
ok(got2[0].n >= got2[1].n, '많이 찍힌 순으로 정렬');
ok(got2.every((g) => /^\d{2}$/.test(g.bay)), '베이는 두 자리 문자열(BayPlan onlyBay 가 받는 모양)');

//  ② 갱 수만큼 — 3갱이면 셋, 1갱이면 하나
ok(U.boardBaysOf({ info: FX.info, discharge: FX.discharge, loading: FX.loading }, 3, 30, PAGES).length === 3, '3갱이면 칸 셋');
ok(U.boardBaysOf({ info: FX.info, discharge: FX.discharge, loading: FX.loading }, 1, 30, PAGES).length === 1, '1갱이면 칸 하나');
ok(U.boardBaysOf({ info: FX.info, discharge: FX.discharge, loading: FX.loading }, 0, 30, PAGES).length === 1, '0 을 줘도 하나는 낸다(빈 칸을 만들지 않는다)');

//  ③ 창의 기준은 «지금»이 아니라 «가장 늦은 완료» — 사흘 전 자료라도 그림이 사라지면 안 된다
const shift = -3 * 24 * 3600000;
const old = { info: FX.info };
for (const mode of ['discharge', 'loading']) {
  old[mode] = { ediContainers: FX[mode].ediContainers, records: {}, completed: {} };
  for (const cn of Object.keys(FX[mode].completed)) old[mode].completed[cn] = { at: FX[mode].completed[cn].at + shift };
}
const gotOld = U.boardBaysOf(old, 2, 30, PAGES);
ok(gotOld.length === 2 && gotOld[0].bay === got2[0].bay && gotOld[0].n === got2[0].n, '사흘 전 자료도 같은 베이 — 창은 마지막 완료 기준');

//  ④ 실적 자리(bay_actual)가 계획을 이긴다
const withRec = { info: FX.info, loading: { ediContainers: {}, completed: {}, records: {} },
  discharge: { ediContainers: FX.discharge.ediContainers, completed: {}, records: {} } };
const someCn = Object.keys(FX.discharge.completed).slice(0, 5);
for (const cn of someCn) withRec.discharge.completed[cn] = { at: last };
for (const cn of someCn) withRec.discharge.records[cn] = { bay_actual: '34' };
const gotRec = U.boardBaysOf(withRec, 1, 30, PAGES);
ok(gotRec.length === 1 && gotRec[0].bay === '34' && gotRec[0].n === 5, `검수앱이 찍은 실적 자리 34 가 계획을 이긴다 — ${gotRec[0].bay}×${gotRec[0].n}`);

//  ⑤ 임시창고 표식·자리 없는 컨은 세지 않는다
const stg = { info: {}, loading: {}, discharge: { ediContainers: { A: { bay: '10' }, B: {}, C: { bay: '10' } },
  completed: { A: { at: last }, B: { at: last }, C: { at: last } }, records: { C: { bay_actual: '__STG__' } } } };
const gotStg = U.boardBaysOf(stg, 3, 30, PAGES);
ok(gotStg.length === 1 && gotStg[0].bay === '10' && gotStg[0].n === 1, `자리 없는 컨·임시창고(__STG__)는 빠진다 — ${gotStg[0].n}대`);

//  ⑥ 완료가 아예 없으면 빈 배열(그림 대신 «아직 실적 없음»을 화면이 적는다)
ok(U.boardBaysOf({ info: {}, discharge: {}, loading: {} }, 2, 30).length === 0, '완료가 없으면 빈 배열');
ok(U.boardBaysOf(null, 2, 30).length === 0, '항차가 없어도 터지지 않는다');
ok(U.boardBaysOf({ discharge: { completed: { A: { at: 0 } }, ediContainers: { A: { bay: '10' } } } }, 2, 30).length === 0, '시각 없는 완료는 안 센다');

//  ⑦ 창을 넓혀 가는 폴백 — 30분에 하나도 없으면 60·120·전체로
const sparse = { info: {}, loading: {}, discharge: { ediContainers: { A: { bay: '06' }, B: { bay: '06' } },
  completed: { A: { at: last }, B: { at: last - 90 * 60000 } }, records: {} } };
const gotSp = U.boardBaysOf(sparse, 2, 30, PAGES);
ok(gotSp.length === 1 && gotSp[0].n === 1, '30분 창에 하나뿐이면 그 하나(있으면 더 넓히지 않는다)');
const sparse2 = { info: {}, loading: {}, discharge: { ediContainers: { A: { bay: '06' } }, completed: { A: { at: last } }, records: {} } };
ok(U.boardBaysOf(sparse2, 2, 0, PAGES).length === 1, '창을 0(전체)으로 줘도 낸다');

//  ⑧ 해치 묶기 — 짝수 + 뒤홀수는 한 칸, 그림에 넘기는 베이는 «가장 늦게 찍은 컨»의 것
const pairFx = { info: {}, loading: {}, discharge: { ediContainers: { A: { bay: '06' }, B: { bay: '07' }, C: { bay: '07' } },
  completed: { A: { at: last - 60000 }, B: { at: last - 30000 }, C: { at: last } }, records: {} } };
const gotPair = U.boardBaysOf(pairFx, 3, 30, PAGES);
ok(gotPair.length === 1 && gotPair[0].n === 3, '베이 06·07 은 한 해치로 묶여 한 칸(3대)');
ok(gotPair[0].bay === '07', `그림에 넘기는 베이는 마지막 컨의 07 — ${gotPair[0].bay}`);

//  ⑧-2 ★ 감사 회귀 — **앞홀수(01)와 (02)03 은 한 장이므로 한 칸으로 묶여야 한다.**
//     3.15 첫 판은 «짝수+뒤홀수»만 묶어 01→0 · 02·03→2 로 갈렸고, 두 칸이 같은 그림을 그렸다(OBWH 실측 2갱 7.4%·3갱 41.8%).
const front = { info: {}, loading: {}, discharge: { records: {},
  ediContainers: { A: { bay: '01' }, B: { bay: '02' }, C: { bay: '03' }, D: { bay: '05' } },
  completed: { A: { at: last }, B: { at: last }, C: { at: last }, D: { at: last } } } };
const gotFront = U.boardBaysOf(front, 3, 30, PAGES);
ok(CP.hatchEvenOf(1, PAGES) === CP.hatchEvenOf(3, PAGES), `베이 01 과 03 은 같은 장(${CP.hatchEvenOf(1, PAGES)}) — 사전이 그렇게 그린다`);
ok(gotFront.filter((g) => CP.hatchEvenOf(parseInt(g.bay, 10), PAGES) === CP.hatchEvenOf(1, PAGES)).length === 1, '01·02·03 은 한 칸으로만 나온다(갈리지 않는다)');
const hs = gotFront.map((g) => CP.hatchEvenOf(parseInt(g.bay, 10), PAGES) + '|' + g.mode);
ok(new Set(hs).size === hs.length, `칸들이 서로 다른 장을 그린다 — ${JSON.stringify(hs)}`);

//  ⑧-3 실측 전수 — OBWH 470대를 완료 시각마다 잘라 굴려도 두 칸이 같은 장이 되는 때가 없다
{
  const sorted = [...evs].sort((a, b) => a.at - b.at);
  const stamps = [...new Set(sorted.map((x) => x.at))];
  let clash = 0, ran = 0;
  for (const t of stamps) {
    const cut = { info: FX.info };
    for (const mode of ['discharge', 'loading']) {
      cut[mode] = { ediContainers: FX[mode].ediContainers, records: {}, completed: {} };
      for (const cn of Object.keys(FX[mode].completed)) { const at = FX[mode].completed[cn].at; if (at && at <= t) cut[mode].completed[cn] = { at }; }
    }
    for (const w of [2, 3]) {
      const g = U.boardBaysOf(cut, w, 30, PAGES); ran++;
      const k = g.map((x) => CP.hatchEvenOf(parseInt(x.bay, 10), PAGES) + '|' + x.mode);
      if (new Set(k).size !== k.length) clash++;
    }
  }
  ok(clash === 0, `완료 시각 ${stamps.length}개 × 2갱·3갱 = ${ran}회 굴려 같은 장 겹침 ${clash}회`);
}

//  ⑨ 양하·선적은 갈라 센다(같은 베이라도 그림이 다르다)
const bothFx = { info: {}, discharge: { ediContainers: { A: { bay: '10' } }, completed: { A: { at: last } }, records: {} },
  loading: { ediContainers: { B: { bay: '10' } }, completed: { B: { at: last } }, records: {} } };
const gotBoth = U.boardBaysOf(bothFx, 3, 30, PAGES);
ok(gotBoth.length === 2 && new Set(gotBoth.map((g) => g.mode)).size === 2, '같은 베이라도 양하·선적은 따로 센다');

//  ⑩ 실측 확인 — 마지막 30분은 두 해치가 지배한다(갱 두 대와 맞는다)
const w = tally(inWin(30));
ok(w.length >= 2 && (w[0].n + w[1].n) / inWin(30).length >= 0.6,
  `마지막 30분 ${inWin(30).length}대 중 상위 두 해치가 ${w[0].n + w[1].n}대 — 갱 ${Object.keys(FX.info.qcWork).length}대와 맞는다`);

console.log(fail ? `\n✗ ${fail}건 실패` : '\n✓ 전부 통과');
process.exit(fail ? 1 : 0);
