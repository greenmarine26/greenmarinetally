// «🏗 오늘 장비별 작업 보고»가 부두별 줄로 세고 그려지는지 실데이터로 재는 연막검사 (TallyOne 3.64-01).
//
//  왜 있는가 — 검수사 2026-09-28 07:52 *«작업 보고에서 위치별 갱이 서로 같은데 동시 작업시 중복되면 어떻게 표기 하나?»*.
//  실사건 — 09-28 02:07:07~02:33:51 에 수석 대시보드 «4호기» 칸이 **두 부두를 더해** «4호기 4건»이었다.
//    ATPR 2643E(PNCT 16번) 00:45 양하 완료 · 00:46 콘박스 + MCSN 637N(PCTC 7번) 02:07 해치 OPEN·CLOSE.
//    종전 M3.5.6 이 `r.equip` 하나로만 묶었다(호기 번호는 PCTC 1~4 · PNCT 1~5 두 부두에 다 있다).
//  검수사 확정 — A안 «부두별 줄» · «두 부두 줄 늘» · 보관소로 넘어간 배는 이번 판에서 안 센다.
//  자료 — tools/fixtures/equip_reports_real.json (RTDB GET 사본 · archive 54항차 + MCSN_637N · 보고 273건).
const fs = require('fs');
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_equippier.cjs <렌더번들.js>'); process.exit(1); }

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

console.log('장비별 작업 보고 — 부두별 줄 (09-28 새벽 4호기 PCTC·PNCT 실보고)');
require(path.resolve(B));
const { equipReportBoard, voyagePierOf, getPierFromBerth, EQUIP_UNKNOWN_PIER, FX } = dom.window.__EQP;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
//  KST 날짜 경계 — 검사가 어느 시간대에서 돌아도 같게(Date.UTC 로 KST 를 직접 만든다).
const kst = (y, mo, d, h = 0, mi = 0, s = 0) => Date.UTC(y, mo - 1, d, h - 9, mi, s);
const vOf = (keys) => Object.fromEntries(keys.map((k) => [k, { info: FX.infos[k] }]));
const repsOf = (keys, from, to) => FX.reports.filter((r) => keys.includes(r.voyageKey) && r.ts >= from && r.ts <= to);
const rowOf = (b, p) => b.rows.find((r) => r.pier === p);
const cellOf = (row, eq) => row && row.cells.find((c) => c.eq === eq);

(async () => {
  await wait(300);
  const doc = dom.window.document;
  const D0 = kst(2026, 9, 28);

  // ── ① 02:10 — 두 배가 다 진행 중이던 때(ATPR 보관 02:33:51 전) ──
  const t0210 = kst(2026, 9, 28, 2, 10);
  ok(FX.archivedAt.ATPR_2643E > t0210, 'ATPR 2643E 는 02:10 에 아직 진행 중(보관 02:33:51)');
  const live0210 = ['ATPR_2643E', 'MCSN_637N'];
  const b1 = equipReportBoard(repsOf(live0210, D0, t0210), vOf(live0210), D0);
  ok(b1.total === 4, `02:10 오늘 보고 4건 (${b1.total})`);
  ok(b1.rows.map((r) => r.pier).join(',') === 'PCTC,PNCT', `줄 순서 PCTC·PNCT (${b1.rows.map((r) => r.pier).join(',')})`);
  const P1 = rowOf(b1, 'PCTC'), N1 = rowOf(b1, 'PNCT');
  ok(P1.cells.length === 4 && N1.cells.length === 5, `칸 수 PCTC 4 · PNCT 5 (${P1.cells.length}·${N1.cells.length})`);
  const p4 = cellOf(P1, '4호기').s, n4 = cellOf(N1, '4호기').s;
  ok(p4 && p4.total === 2 && p4.hatch === 2 && p4.status === 0 && p4.conbox === 0, `PCTC 4호기 = MCSN 해치 2 (${JSON.stringify(p4)})`);
  ok(n4 && n4.total === 2 && n4.status === 1 && n4.conbox === 1 && n4.hatch === 0, `PNCT 4호기 = ATPR 작업상태 1 · 콘박스 1 (${JSON.stringify(n4)})`);
  ok(P1.total === 2 && N1.total === 2, `줄 합계 PCTC 2 · PNCT 2 (${P1.total}·${N1.total})`);

  // ── ② 07:52 — ATPR 가 보관소로 넘어간 뒤(구독이 voyages 만 읽어 그 배 보고가 빠진다 — 이번 판 범위 밖) ──
  const t0752 = kst(2026, 9, 28, 7, 52);
  const b2 = equipReportBoard(repsOf(['MCSN_637N'], D0, t0752), vOf(['MCSN_637N']), D0);
  ok(b2.total === 2 && rowOf(b2, 'PCTC').total === 2, `07:52 PCTC 4호기 2건 (${b2.total})`);
  const N2 = rowOf(b2, 'PNCT');
  ok(!!N2 && N2.total === 0 && N2.cells.length === 5 && N2.cells.every((c) => !c.s), '보고 없는 PNCT 도 줄이 선다(«두 부두 줄 늘») — 5칸 전부 작업 없음');

  // ── ③ 보고를 잃거나 두 번 세지 않는다 — 전수 273건, 날마다 부두 합 = 종전 호기별 셈 ──
  const allV = vOf(Object.keys(FX.infos));
  const days = [...new Set(FX.reports.map((r) => new Date(r.ts + 9 * 3600e3).toISOString().slice(0, 10)))];
  let dayBad = 0, typeBad = 0;
  for (const d of days) {
    const [y, m, dd] = d.split('-').map(Number);
    const from = kst(y, m, dd), to = from + 86400e3 - 1;
    const reps = FX.reports.filter((r) => r.ts >= from && r.ts <= to);
    const b = equipReportBoard(reps, allV, from);
    if (b.total !== reps.length || b.rows.reduce((a, r) => a + r.total, 0) !== reps.length) dayBad++;
    //  종전(M3.5.6) 셈을 그대로 다시 세어 호기·종류마다 부두 합과 맞춘다.
    const old = {};
    //  종류 여섯(작업상태·해치·콘박스·데미지·실오류·작업중단) 전부 — V9.57(I2) 작업중단 분기가 한 번 조용히 빠졌던 자리다(감사 2026-09-28).
    const KIND = { work_status: 'status', hatch: 'hatch', conbox: 'conbox', damage: 'damage', seal_error: 'sealError', external_pause: 'externalPause' };
    reps.forEach((r) => { const e = r.equip || '미지정';
      const o = old[e] || (old[e] = { total: 0, status: 0, hatch: 0, conbox: 0, damage: 0, sealError: 0, externalPause: 0 });
      o.total++; if (KIND[r.type]) o[KIND[r.type]]++; });
    for (const [e, o] of Object.entries(old)) {
      const sum = { total: 0, status: 0, hatch: 0, conbox: 0, damage: 0, sealError: 0, externalPause: 0 };
      b.rows.forEach((row) => { const c = cellOf(row, e); if (c && c.s) for (const k of Object.keys(sum)) sum[k] += c.s[k]; });
      if (JSON.stringify(sum) !== JSON.stringify(o)) typeBad++;
    }
  }
  ok(dayBad === 0, `${days.length}일 전부 부두 줄 합 = 그날 보고 수 (어긋난 날 ${dayBad})`);
  const kinds = {}; FX.reports.forEach((r) => { kinds[r.type] = (kinds[r.type] || 0) + 1; });
  ok(kinds.damage > 0 && kinds.external_pause > 0, `자료에 사고성 보고가 실제로 있다 — 데미지 ${kinds.damage || 0} · 작업중단 ${kinds.external_pause || 0} (없으면 아래 대조가 헛돈다)`);
  ok(typeBad === 0, `호기·종류마다 부두 합 = 종전 호기별 셈 (어긋남 ${typeBad})`);

  // ── ④ 부두 판정 — 전수 273건 중 251건 판정, 22건 «부두 미상»(선석 기록 없는 6~7월 3항차) ──
  const unk = {};
  FX.reports.forEach((r) => { if (!voyagePierOf(FX.infos[r.voyageKey])) unk[r.voyageKey] = (unk[r.voyageKey] || 0) + 1; });
  const unkN = Object.values(unk).reduce((a, n) => a + n, 0);
  ok(FX.reports.length === 273 && unkN === 22, `부두 미상 ${unkN}건 / ${FX.reports.length}건`);
  ok(unk.KSKM_2611N === 16 && unk.PCSZ_2622W === 5 && unk.STMJ_2639E === 1 && Object.keys(unk).length === 3, `미상 항차 ${JSON.stringify(unk)}`);
  ok(voyagePierOf({ berth: '동부두 7번선석' }) === 'PCTC' && FX.infos.STSE_2645E && !FX.infos.STSE_2645E.pier && voyagePierOf(FX.infos.STSE_2645E) === 'PCTC',
    'STSE 2645E — 부두 칸이 비면 선석 7번으로 PCTC');
  //  LoginPage 옛 식(inf.pier || getPierFromBerth(inf.berth || ''))과 같은 값 — 한 벌로 옮겨도 작업 선박 선택 화면은 그대로.
  const infosAll = [...Object.values(FX.infos), {}, { berth: '동부두 1번선석' }, { pier: 'PNCT', berth: '동부두 7번선석' }];
  ok(infosAll.every((inf) => ((inf.pier || getPierFromBerth(inf.berth || '')) || '') === voyagePierOf(inf)) && voyagePierOf(null) === '',
    `voyagePierOf = LoginPage 옛 식 (${infosAll.length}꼴)`);
  const d615 = kst(2026, 6, 15);
  const b3 = equipReportBoard(FX.reports.filter((r) => r.voyageKey === 'KSKM_2611N' && r.ts >= d615 && r.ts < d615 + 86400e3), allV, d615);
  const U3 = rowOf(b3, EQUIP_UNKNOWN_PIER);
  ok(!!U3 && b3.rows[b3.rows.length - 1] === U3 && U3.cells.every((c) => c.s), `«부두 미상» 줄은 맨 끝, 보고 나온 호기만 (${U3 && U3.cells.map((c) => c.eq).join(',')})`);
  ok(equipReportBoard([{ ts: D0 + 1, type: 'hatch', equip: '2호기', voyageKey: 'NOPE_0000' }], allV, D0).rows.some((r) => r.pier === EQUIP_UNKNOWN_PIER && r.total === 1),
    '항차를 못 찾는 보고도 버리지 않고 «부두 미상»으로 센다');

  // ── ⑤ 장비 없는 보고(«미지정»)는 그 부두 줄 끝 ──
  const noEq = FX.reports.find((r) => !r.equip && voyagePierOf(FX.infos[r.voyageKey]));
  if (noEq) {
    const dd = new Date(noEq.ts + 9 * 3600e3).toISOString().slice(0, 10).split('-').map(Number);
    const f = kst(dd[0], dd[1], dd[2]);
    const b5 = equipReportBoard(FX.reports.filter((r) => r.ts >= f && r.ts < f + 86400e3), allV, f);
    const row = rowOf(b5, voyagePierOf(FX.infos[noEq.voyageKey]));
    ok(row && row.cells[row.cells.length - 1].eq === '미지정', `미지정은 ${row && row.pier} 줄 끝 (${noEq.voyageKey})`);
  } else ok(false, '장비 없는 실보고가 자료에 있어야 한다');
  ok(equipReportBoard(FX.reports, allV, kst(2026, 9, 29)).total === 0, '내일 0시 기준이면 0건(카드가 통째로 안 보인다)');

  // ── ⑥ 실제 컴포넌트로 그린다 ──
  dom.window.__setBoard(b1);
  await wait(200);
  const rowsEl = [...doc.querySelectorAll('#eqp [data-pier]')];
  ok(rowsEl.map((e) => e.getAttribute('data-pier')).join(',') === 'PCTC,PNCT', `그린 줄 PCTC·PNCT (${rowsEl.length})`);
  const cardsOf = (el) => [...el.querySelectorAll('.grid > div')];
  ok(rowsEl.length === 2 && cardsOf(rowsEl[0]).length === 4 && cardsOf(rowsEl[1]).length === 5, '그린 칸 4 · 5');
  const t0 = rowsEl[0] ? rowsEl[0].textContent : '', t1 = rowsEl[1] ? rowsEl[1].textContent : '';
  ok(/PCTC2건/.test(t0.replace(/\s/g, '')) && /해치 2/.test(t0) && !/콘박스/.test(t0) && !/작업상태/.test(t0), `PCTC 줄 — 해치 2만 (${t0.replace(/\s+/g, ' ').slice(0, 90)})`);
  ok(/PNCT2건/.test(t1.replace(/\s/g, '')) && /작업상태 1/.test(t1) && /콘박스 1/.test(t1) && !/해치/.test(t1), `PNCT 줄 — 작업상태 1 · 콘박스 1 (${t1.replace(/\s+/g, ' ').slice(0, 90)})`);
  ok(doc.querySelectorAll('#eqp .md\\:grid-cols-5').length === 2, '두 줄 다 5칸 격자(같은 호기가 위아래로 맞는다)');
  dom.window.__setBoard(b2);
  await wait(200);
  const r2 = [...doc.querySelectorAll('#eqp [data-pier]')];
  ok(r2.length === 2 && /보고 없음/.test(r2[1].textContent) && (r2[1].textContent.match(/작업 없음/g) || []).length === 5, '07:52 — PNCT 줄 «보고 없음» · 5칸 작업 없음');
  //  사고성 줄 — 작업중단이 있던 실제 날을 그려 붉은 «⛔ 작업중단» 과 «⚠️ 데미지» 줄이 제 부두 줄에 서는지 본다.
  const dayOf = (r) => { const d = new Date(r.ts + 9 * 3600e3).toISOString().slice(0, 10).split('-').map(Number); return kst(d[0], d[1], d[2]); };
  const ep = FX.reports.find((r) => r.type === 'external_pause');
  const epDay = dayOf(ep), epPier = voyagePierOf(FX.infos[ep.voyageKey]) || EQUIP_UNKNOWN_PIER;
  dom.window.__setBoard(equipReportBoard(FX.reports.filter((r) => r.ts >= epDay && r.ts < epDay + 86400e3), allV, epDay));
  await wait(200);
  const epRow = [...doc.querySelectorAll('#eqp [data-pier]')].find((e) => e.getAttribute('data-pier') === epPier);
  const redEp = epRow && [...epRow.querySelectorAll('.text-red-300')].find((e) => /⛔ 작업중단 1/.test(e.textContent));
  ok(!!redEp && /font-black/.test(redEp.className), `작업중단 — ${ep.voyageKey} ${epPier} 줄에 붉은 «⛔ 작업중단 1»`);
  const dm = FX.reports.find((r) => r.type === 'damage');
  const dmDay = dayOf(dm), dmPier = voyagePierOf(FX.infos[dm.voyageKey]) || EQUIP_UNKNOWN_PIER;
  dom.window.__setBoard(equipReportBoard(FX.reports.filter((r) => r.ts >= dmDay && r.ts < dmDay + 86400e3), allV, dmDay));
  await wait(200);
  const dmRow = [...doc.querySelectorAll('#eqp [data-pier]')].find((e) => e.getAttribute('data-pier') === dmPier);
  ok(!!dmRow && [...dmRow.querySelectorAll('.text-amber-300')].some((e) => /⚠️ 데미지 \d/.test(e.textContent)), `데미지 — ${dm.voyageKey} ${dmPier} 줄에 «⚠️ 데미지»`);
  const se = { ts: D0 + 5, type: 'seal_error', equip: '2호기', voyageKey: 'MCSN_637N' };
  dom.window.__setBoard(equipReportBoard([se], vOf(['MCSN_637N']), D0));
  await wait(200);
  const seRow = doc.querySelector('#eqp [data-pier="PCTC"]');
  ok(!!seRow && [...seRow.querySelectorAll('.text-red-300')].some((e) => /🚨 실오류 1/.test(e.textContent)), '실오류 — PCTC 2호기 «🚨 실오류 1»(자료에 실오류 보고가 없어 한 건을 지어 넣음)');
  ok(errs.length === 0, `그리는 중 오류가 없다 (${errs.length}건)` + (errs.length ? ' | ' + errs[0].slice(0, 140) : ''));

  // ── ⑦ 소스 — 대시보드가 한 벌을 부르고, 옛 셈이 남지 않았다 ──
  const root = path.resolve(__dirname, '..');
  const CD = fs.readFileSync(path.join(root, 'src/pages/ChiefDashboard.jsx'), 'utf8');
  const LP = fs.readFileSync(path.join(root, 'src/pages/LoginPage.jsx'), 'utf8');
  ok(/equipReportBoard\(allReports, voyages,/.test(CD) && !/equipStats/.test(CD) && /<EquipReportBoard /.test(CD), 'ChiefDashboard — equipReportBoard 한 벌 · 옛 equipStats 없음');
  ok(/voyagePierOf\(infoOf\(key\)\)/.test(LP), 'LoginPage 작업 선박 선택 — voyagePierOf 한 벌');

  console.log(`\n장비별 작업 보고 부두별 줄: ${pass} 통과 / ${fail} 실패`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('✗ 검사 자체 오류:', e); process.exit(1); });
