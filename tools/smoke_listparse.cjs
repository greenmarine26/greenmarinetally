// 리스트 파서가 ISO 전용 열·F/E·무게를 제대로 읽는지 검사한다 (머스크 StandardLoadList 형식).
//
//  왜 이 검사가 있는가 — 검수사 «아직도 리스트 파서에 문제가 있네요?» (2026-09-04, MCAP 634N).
//  머스크 리스트 19대가 앱에서 «?(미정) 17 · ⚠기타 ISO 17 · 풀 2» 로 떴다. 원인 셋이 한 파일에서 겹쳤다.
//    ① F/E 열 패턴 `soc.*[ef]` 가 헤더 «Isocode» 에 부분일치(i·soc·od·e)해 F/E 열이 Isocode 로 잡혔다.
//    ② «Type»(DRY/REEF)이 «Isocode»(45G1) 보다 왼쪽이라 규격을 DRY 로 읽었다 — DRY 는 높이를 못 담는다.
//    ③ «Gross weight» 가 무게 패턴(…wt)에 안 걸려 전건 무게 0.
//  헤더 순서가 바뀌면 조용히 되살아나는 종류라, 그 순서 그대로 고정해 둔다.
const path = require('path');

const BUNDLE = process.argv[2];
if (!BUNDLE) { console.error('사용법: node tools/smoke_listparse.cjs <번들.cjs>'); process.exit(1); }
global.window = global.window || {};
global.document = global.document || { createElement: () => ({}) };
const U = require(path.resolve(BUNDLE));

let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✓ ' : '  ✗ ') + msg); if (!cond) fail++; };

//  실제 MCAP 634N StandardLoadList 헤더 순서 그대로 — Type(5) 이 Isocode(6) 보다 왼쪽인 것이 핵심.
const HEAD = ['Container', 'Operator', 'Bookno', 'Blno', 'Size', 'Type', 'Isocode', 'Receipt',
  'Prev. Load', 'Discharge', 'Optional Discharge', 'Next Discharge', 'Delivery',
  'pcVesVoy', 'Name', 'F/E', 'Gross weight', 'Net Weight', 'Slot', 'VIP'];
const ROW = (cn, tp, iso, fe, gw) =>
  [cn, 'MSK', '275264735', '275264735', '40', tp, iso, 'KRPYOTM', '', '', '', 'PHDVOKT', 'PHDVOKT', '', '', fe, gw, '8500', '', ''];
const AOA = [HEAD,
  ROW('TCNU3021506', 'DRY', '45G1', 'Full', '12200'),
  ROW('SUDU8009256', 'REEF', '45R1', 'Full', '14718'),
  ROW('MNBU3772064', 'REEF', '45R8', 'Full', '13000'),
  ROW('MSKU1416071', 'DRY', '45G1', 'Empty', '3800'),
];

(async () => {
  const XLSX = await U.loadSheetJS();
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(AOA), 'Load_TEST');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const recs = (await U.parseListExcel(buf)).records || [];
  const by = Object.fromEntries(recs.map(r => [r.cn, r]));

  console.log('리스트 파서 — ISO 전용 열·F/E·무게');
  ok(recs.length === 4, `4대 전건 파싱 (실제 ${recs.length})`);

  const dry = by['TCNU3021506'] || {};
  ok(dry.iso === '45G1', `Type«DRY» 옆의 Isocode«45G1» 을 쓴다 (실제 «${dry.iso || '없음'}»)`);
  ok(U.isoToLabel(dry.iso) === '40HC', `45G1 → 40HC (실제 «${U.isoToLabel(dry.iso) || '미상'}»)`);

  for (const cn of ['SUDU8009256', 'MNBU3772064']) {
    const r = by[cn] || {};
    ok(U.isoToLabel(r.iso) === '40RH', `${cn} 리퍼 → 40RH (실제 «${U.isoToLabel(r.iso) || '미상'}»)`);
    ok(r.rf === true, `${cn} 리퍼 표시`);
  }

  ok(dry.fe === 'F', `Full → F (실제 «${dry.fe || '없음'}»)`);
  ok((by['MSKU1416071'] || {}).fe === 'E', `Empty → E (실제 «${(by['MSKU1416071'] || {}).fe || '없음'}»)`);
  ok(recs.filter(r => !r.fe).length === 0, 'F/E 미정 0대');

  ok(dry.wt === 12200, `Gross weight 12200 (실제 ${dry.wt})`);
  ok(recs.filter(r => !r.wt).length === 0, '무게 0인 컨 없음');

  const wb2 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb2, XLSX.utils.aoa_to_sheet([
    ['CONTAINER NO', 'SIZE', 'TYPE', 'F/E', 'WEIGHT'],
    ['TEMU1234567', '20', 'DC', 'F', '9000'],
  ]), 'OLD');
  const old = ((await U.parseListExcel(XLSX.write(wb2, { type: 'array', bookType: 'xlsx' }))).records || [])[0] || {};
  ok(U.isoToLabel(old.iso) === '20DC', `ISO 열 없는 옛 양식 20+DC → 20DC (실제 «${U.isoToLabel(old.iso) || '미상'}»)`);
  ok(old.fe === 'F' && old.wt === 9000, 'ISO 열 없는 옛 양식 F/E·무게 유지');

  console.log(fail ? `\n✗ 리스트 파서 연막검사 실패 ${fail}건` : '\n리스트 파서 연막검사 통과');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('✗ 연막검사 예외:', e && e.message); process.exit(1); });
