// 작업량 고정(2.89-07) 연막검사 — 카드 분모는 리스트+시프팅에서 움직이지 않는다.
//   닻(오라클)은 검수사 규칙에서 뽑았다(작업표준 §2-2-L — 코드가 내는 값이 아니라 규칙이 먼저다):
//   《항차목록은 변치 않습니다. 계획이 변하지 않는한 변하는건 작업내용이 실시간 카운트 될뿐》
//   《작업량도 279+95 214+95》 《양하는 양하 선적은 선적이지》 (2026-08-31, MCSC 633N)
//   픽스처는 BUG-2026-004 사고 당시 실데이터(작업생성 유령 2건 포함) — 사고 상태를 닻으로 박아 둔다.
const path = require('path');
const fs = require('fs');

(async () => {
  const U = await import(path.resolve('src/utils.js'));
  const FX = JSON.parse(fs.readFileSync(path.resolve('tools/fixtures/progress_mcsc.json'), 'utf8'));
  const SB = JSON.parse(fs.readFileSync(path.resolve('tools/fixtures/shifting_berth.json'), 'utf8'));
  let fail = 0;
  const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fail++; };
  const expand = (o, key) => {
    const m = {};
    for (const [cn, c] of Object.entries(o)) m[cn] = { bay: c.b, row: c.r, tier: c.t, [key]: c[key], iso: c.i, fe: c.f };
    return m;
  };

  //  시프팅 집합은 실 EDI 픽스처(배정표 정본 경로) + 맞교환(swapFix) 겹침 — 앱(computeShiftingFromVoyage)과 같은 경로.
  //  swapFix 를 안 겹치면 «내린 5660» 대신 «남긴 2118» 이 시프팅으로 잡힌다 — BUG-2026-004 의 몸통.
  const x = SB.MCSC_633N;
  const sw = U.swapFixList({ swapFix: FX.swapFix });
  const dMap = U.applySwapFix(expand(x.d, 'pod'), sw), lMap = U.applySwapFix(expand(x.l, 'pol'), sw);
  const ss = new Set(Object.keys(U.computeShiftingMap(dMap, lMap, { berthShift: x.bs }) || {}).filter((k) => !k.startsWith('_')));
  ok(ss.size === 95, `시프팅 95대 (${ss.size})`);
  ok(ss.has('MRSU6465660'), '5660(실제 내리고 다시 실은 컨)이 시프팅에 있다 — 검수사 검증 목표');
  ok(!ss.has('CAAU6532118'), '2118(안 내린 컨)은 시프팅에 없다 — 검수사 검증 목표');

  console.log('[1] MCSC 633N 양하 — 작업량 374 = 리스트 279 + 시프팅 95, 완료 374 = 279 + 내림 95, 로스 0');
  {
    const p = U.progressOf(FX.discharge, 'discharge', ss);
    ok(p.listTotal === 279, `리스트 279 (${p.listTotal}) — 작업생성 유령 2건(2118·9843)이 분모에 못 들어온다`);
    ok(p.total === 374, `작업량 374 (${p.total})`);
    ok(p.moves === 95, `내림 모브 95 (${p.moves})`);
    ok(p.done === 374, `완료 374 (${p.done})`);
    ok(p.total - p.done === 0, `서류상 로스 0 (${p.total - p.done})`);
  }

  console.log('[2] MCSC 635S 선적 — 작업량 308 = 리스트 213 + 시프팅 95(이중 계산 금지), 완료 = 리스트완료 + 실음');
  {
    const p = U.progressOf(FX.loading, 'loading', ss);
    ok(p.listTotal === 213, `리스트 213 (${p.listTotal}) — 시프팅 재선적 기록(4253 포함)은 리스트에 겹쳐 세지 않는다`);
    ok(p.total === 308, `작업량 308 (${p.total})`);
    ok(p.moves === 16, `실음 모브 16 (${p.moves})`);
    ok(p.done === 20 + 16, `완료 36 (${p.done})`);
  }

  console.log('[3] 분모 고정 — 검수원 작업이 기록을 만들어도 작업량이 안 움직인다 (BUG-2026-004 재발 방지)');
  {
    const recs = { ...FX.discharge.records };
    for (let i = 0; i < 5; i++) recs['TEST' + (1000000 + i) + '0'] = { bay: '', cn: 'TEST' + (1000000 + i) + '0', moves: [] };
    const p = U.progressOf({ records: recs, completed: FX.discharge.completed }, 'discharge', ss);
    ok(p.total === 374, `작업생성 기록 5건을 더 넣어도 작업량 374 (${p.total})`);
  }

  console.log('[4] 판정 경계 — 출처(_source)만 있는 리스트 행 / 선사 필드 폴백 / 유령');
  {
    ok(U.isListOriginRecord({ _source: '538WLOADLIST.xlsx', cn: 'X' }) === true, '_source 만 있는 행(XTPG 실측)도 리스트다');
    ok(U.isListOriginRecord({ iso: '45GE', pol: 'PHDVO' }) === true, '선사 필드 폴백이 산다');
    ok(U.isListOriginRecord({ bay: '', cn: 'X', moves: [] }) === false, '작업생성 유령은 리스트가 아니다');
  }

  console.log('[5] 리스트 전 폴백 — 리스트 0이면 EDI 평택분(ptkCns) + 시프팅');
  {
    const ptk = new Set(['A1', 'A2', 'A3']);
    const p = U.progressOf({ records: {}, completed: { A1: 1 } }, 'discharge', new Set(['S1']), ptk);
    ok(p.usePtk === true && p.total === 4 && p.done === 1, `EDI 3 + 시프팅 1 = 작업량 4, 완료 1 (${p.total}/${p.done})`);
  }

  if (fail) { console.error(`✗ 작업량 고정 연막검사 ${fail}건 실패`); process.exit(1); }
  console.log('✓ 작업량 고정 연막검사 통과');
})().catch((e) => { console.error('✗ 작업량 고정 연막검사 자체가 죽었다:', e && e.message); process.exit(1); });
