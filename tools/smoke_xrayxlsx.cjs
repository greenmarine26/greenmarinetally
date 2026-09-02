// X-RAY 엑셀 기본 양식 연막검사 (2.99-02) — 첫 장 표 전체가 굴림체 10 · 가운데 정렬 · 네 변 실선인지 실제 파일을 열어 잰다
//   검수사 확정 2026-09-02: «샘플양식처럼 선과 중앙정렬 굴림체 10포인트를 기본양식으로 … 일일이 다시 정렬하고 글꼴수정하고 선을 다시 그리지 않게»
const path = require('path');
(async () => {
  const T = await import(path.resolve('src/tallyExcel.js'));
  const ExcelJS = (await import('exceljs')).default || (await import('exceljs'));
  let fail = 0; const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fail++; };
  const rows = [
    { cn: 'NHFU9000250', seal: 'A1', kind: 'Sea & Air', iso: '45GP', pos: '18-05-86', cSeal: '', sealer: '' },
    { cn: 'ZXJU0130421', seal: 'A2', kind: '수입', iso: '22G1', pos: '06-02-04', cSeal: '0058233', sealer: '김성일' },
    { cn: 'HPCU6001041', seal: 'A3', kind: '수입', iso: '45GP', pos: '10-01-82', cSeal: '', sealer: '' },
  ];
  const head = { name: 'OCEAN BLUE WHALE', voy: '2729E', eta: '2026.09.02', mrn: '26YTFF2729I', pier: 'PNCT', carrier: 'PANOCEAN', pod: 'KRPTK', callsign: 'D5AB' };
  const { fname, buf } = await T.generateXrayExcel(rows, head, { download: false });
  ok(/^XRAY리스트_OCEANBLUEWHALE_2729E_\d{4}-\d{2}-\d{2}\.xlsx$/.test(fname), `파일명 ${fname}`);
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf);
  const ws = wb.getWorksheet('XRAY'); ok(!!ws, '첫 장 XRAY 있음');
  const ws2 = wb.getWorksheet('상세'); ok(!!ws2, '둘째 장 상세 있음');
  // 표 전체(머리 1줄 + 3줄 × 8열) 한 칸씩
  let bad = [];
  for (let r = 1; r <= rows.length + 1; r++) for (let c = 1; c <= 8; c++) {
    const cell = ws.getRow(r).getCell(c);
    const f = cell.font || {}, a = cell.alignment || {}, b = cell.border || {};
    const fontOk = f.name === '굴림체' && Number(f.size) === 10 && !f.bold;
    const alignOk = a.horizontal === 'center' && a.vertical === 'middle';
    const borderOk = ['top', 'left', 'bottom', 'right'].every((k) => b[k] && b[k].style === 'thin');
    if (!(fontOk && alignOk && borderOk)) bad.push(`${r},${c}:${fontOk ? '' : '폰트 '}${alignOk ? '' : '정렬 '}${borderOk ? '' : '선'}`);
  }
  ok(bad.length === 0, `XRAY 표 ${(rows.length + 1) * 8}칸 전부 굴림체10·가운데·실선` + (bad.length ? ` — 틀린 칸 ${bad.slice(0, 6).join(' / ')}` : ''));
  // 값은 종전 그대로 — 둘째 줄부터 " 표기
  ok(ws.getRow(2).getCell(2).value === 'OCEAN BLUE WHALE' && ws.getRow(3).getCell(2).value === '"', '선박명 첫 줄 실명 · 둘째 줄부터 «"»');
  ok(ws.getRow(1).getCell(6).value === '컨테이너번호' && ws.getRow(4).getCell(6).value === 'HPCU6001041', '머리·컨번호 값 보존');
  // 표 밖(9열·5줄)은 손대지 않는다
  const out = ws.getRow(rows.length + 2).getCell(1);
  ok(!(out.border && out.border.top && out.border.top.style), '표 밖 칸에는 선이 없다');
  // 둘째 장은 종전 구조 유지(머리 8줄 + 표) — 폰트 이름만 굴림체
  ok(ws2.getRow(1).getCell(1).value === '선박명' && ws2.getRow(10).getCell(1).value === 'No.', '상세 장 머리 8줄 + 표 머리(10행) 유지');
  ok((ws2.getRow(11).getCell(2).font || {}).name === '굴림체', '상세 장 폰트 굴림체');
  if (fail) { console.error(`✗ X-RAY 엑셀 양식 연막검사 ${fail}건 실패`); process.exit(1); }
  console.log('✅ X-RAY 엑셀 양식 연막검사 통과 — 굴림체10·가운데·실선 32칸 · 값 보존 · 표 밖 무변화 · 상세 장 유지');
})().catch((e) => { console.error('✗ X-RAY 엑셀 양식 연막검사 예외', e); process.exit(1); });
