// 마감 텔리 엑셀 렌더러 — V9.19 (2026-07-28)
//   computeTallyData(tallyReport.js) 결과를 실물 양식(GREEN MARINE TALLY REPORT 워크북)으로 그린다.
//   exceljs는 무거워서(≈1MB) 동적 import — 버튼을 누를 때만 로드.
//   시트 구성·순서는 실물 233개 분석 결과(마감텔리_양식_카탈로그) 그대로:
//   Final Work → Time Sheet → OS-IN → DM-IN → OS-OUT → DM-OUT → Act. Cntr-Seal → RF → Performance → SHIFTING

const THIN = { style: 'thin' };
const BOX = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const TITLE_FONT = { name: 'Arial', size: 14, bold: true };
const HEAD_FONT = { name: 'Arial', size: 10, bold: true };
const BODY_FONT = { name: 'Arial', size: 10 };
const CO = 'GREEN  MARINE  CO., LTD.';
const CITY = 'PYEONGTAEK, KOREA';

function head(ws, cols) {
  ws.getCell('A1').value = CO; ws.getCell('A1').font = { ...HEAD_FONT, size: 12 };
  ws.getCell('A2').value = CITY; ws.getCell('A2').font = BODY_FONT;
  void cols;
}
function sig(ws, row, leftLabel = 'CHIEF CHECKER', rightLabel = 'CHIEF OFFICER', rightCol = 'K', midLabel = '', midCol = 'F') {
  ws.getCell(`A${row}`).value = leftLabel;
  ws.getCell(`A${row}`).font = HEAD_FONT;
  if (midLabel) { ws.getCell(`${midCol}${row}`).value = midLabel; ws.getCell(`${midCol}${row}`).font = HEAD_FONT; }
  ws.getCell(`${rightCol}${row}`).value = rightLabel;
  ws.getCell(`${rightCol}${row}`).font = HEAD_FONT;
}
const d10 = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
const nz = (v) => (v ? v : '');   // 실물 규칙: 빈 셀은 0이 아니라 공란

// ── 1. Final Work ─────────────────────────────────────────────
function sheetFinalWork(wb, D) {
  const ws = wb.addWorksheet('Final Work');
  ws.columns = [{ width: 9 }, { width: 7 }, { width: 12 }, ...Array(12).fill({ width: 6.5 })];
  ws.mergeCells('A1:O1'); ws.getCell('A1').value = CO;
  ws.getCell('A1').font = TITLE_FONT; ws.getCell('A1').alignment = { horizontal: 'center' };
  ws.mergeCells('A2:O2'); ws.getCell('A2').value = 'FINAL  WORKING  REPORT';
  ws.getCell('A2').font = { ...TITLE_FONT, size: 12, underline: true }; ws.getCell('A2').alignment = { horizontal: 'center' };
  const voy = [D.voyD, D.voyL].filter(Boolean).join(' & ');
  ws.getCell('A4').value = 'M/V :'; ws.getCell('B4').value = ` ${D.vslFull}`;
  ws.getCell('F4').value = 'VOY # :'; ws.getCell('G4').value = voy;
  ws.getCell('L4').value = 'DATE :'; ws.getCell('M4').value = d10(D.date);
  ws.getCell('A6').value = 'PIER :'; ws.getCell('B6').value = ` ${D.pier}`;
  ws.getCell('F6').value = 'BERTH :'; ws.getCell('G6').value = D.berth;
  ws.getCell('L6').value = 'PORT :'; ws.getCell('M6').value = ' PYEONGTAEK, KOREA';
  for (const a of ['A4', 'F4', 'L4', 'A6', 'F6', 'L6']) ws.getCell(a).font = HEAD_FONT;

  // 표 헤더 — OPERATOR | PORT | F/E | DISCH(n) 4칸 | LOAD(n) 4칸 | SHIFT(n) 4칸
  const hr = 8;
  ws.getCell(`A${hr}`).value = 'OPERATOR'; ws.getCell(`B${hr}`).value = 'PORT'; ws.getCell(`C${hr}`).value = 'FULL / EMPTY';
  ws.mergeCells(`D${hr}:G${hr}`); ws.getCell(`D${hr}`).value = `DISCH (${D.totals.dis.n})`;
  ws.mergeCells(`H${hr}:K${hr}`); ws.getCell(`H${hr}`).value = `LOAD (${D.totals.load.n})`;
  ws.mergeCells(`L${hr}:O${hr}`); ws.getCell(`L${hr}`).value = `SHIFT (${D.totals.shift.n})`;
  const sub = hr + 1;
  const szs = ["20'", "40'", 'HC', "45'"];
  ['D', 'H', 'L'].forEach((c0, gi) => szs.forEach((s, i) => {
    ws.getCell(`${String.fromCharCode(c0.charCodeAt(0) + i)}${sub}`).value = s;
    void gi;
  }));
  for (let c = 1; c <= 15; c++) {
    for (const r of [hr, sub]) {
      const cell = ws.getRow(r).getCell(c);
      cell.font = HEAD_FONT; cell.alignment = { horizontal: 'center' }; cell.border = BOX;
    }
  }
  // 데이터 행
  let r = sub + 1;
  let lastOp = '', lastPort = '';
  for (const row of D.rows) {
    ws.getCell(`A${r}`).value = row.op !== lastOp ? row.op : '';
    ws.getCell(`B${r}`).value = (row.op !== lastOp || row.port !== lastPort) ? row.port : '';
    ws.getCell(`C${r}`).value = row.fe;
    const put = (c0, o) => ['20', '40', 'HC', '45'].forEach((s, i) =>
      ws.getCell(`${String.fromCharCode(c0.charCodeAt(0) + i)}${r}`).value = nz(o[s]));
    put('D', row.dis); put('H', row.load); put('L', row.shift);
    for (let c = 1; c <= 15; c++) {
      const cell = ws.getRow(r).getCell(c);
      cell.font = BODY_FONT; cell.border = BOX; cell.alignment = { horizontal: 'center' };
    }
    lastOp = row.op; lastPort = row.port;
    r++;
  }
  // Total 2행 (F/E) — 실물 규칙: Total 행만 0 표기
  for (const fe of ['F', 'E']) {
    ws.getCell(`A${r}`).value = fe === 'F' ? 'Total' : '';
    ws.getCell(`C${r}`).value = fe;
    const put = (c0, t) => ['20', '40', 'HC', '45'].forEach((s, i) =>
      ws.getCell(`${String.fromCharCode(c0.charCodeAt(0) + i)}${r}`).value = t[s] || 0);
    put('D', D.totals.dis[fe]); put('H', D.totals.load[fe]); put('L', D.totals.shift[fe]);
    for (let c = 1; c <= 15; c++) {
      const cell = ws.getRow(r).getCell(c);
      cell.font = HEAD_FONT; cell.border = BOX; cell.alignment = { horizontal: 'center' };
    }
    r++;
  }
  r += 1;
  ws.getCell(`A${r}`).value = 'Remarks : Discharging';
  ws.getCell(`H${r}`).value = 'Remarks : Loading';
  ws.getCell(`A${r}`).font = HEAD_FONT; ws.getCell(`H${r}`).font = HEAD_FONT;
  sig(ws, r + 12, 'CHIEF CHECKER', 'CHIEF OFFICER', 'K');
  return ws;
}

// ── 2. Time Sheet ─────────────────────────────────────────────
function sheetTimeSheet(wb, D) {
  const ws = wb.addWorksheet('Time Sheet');
  ws.columns = [{ width: 4 }, { width: 18 }, ...Array(8).fill({ width: 11 })];
  head(ws);
  ws.mergeCells('C3:H3'); ws.getCell('C3').value = 'T I M E    S H E E T';
  ws.getCell('C3').font = TITLE_FONT; ws.getCell('C3').alignment = { horizontal: 'center' };
  ws.getCell('A6').value = 'M / V :'; ws.getCell('B6').value = ` ${D.vslFull}`;
  ws.getCell('C6').value = 'VOY # :'; ws.getCell('D6').value = [D.voyD, D.voyL].filter(Boolean).join(' & ');
  ws.getCell('G6').value = 'DATE :'; ws.getCell('H6').value = d10(D.date);
  ws.getCell('A8').value = 'PIER :'; ws.getCell('B8').value = ` ${D.pier}`;
  ws.getCell('C8').value = 'BERTH :'; ws.getCell('D8').value = D.berth;
  ws.getCell('G8').value = 'WEATHER :'; ws.getCell('H8').value = 'Fine';
  ws.getCell('G10').value = 'PORT : PYEONGTAEK, KOREA';
  for (const a of ['A6','C6','G6','A8','C8','G8','G10']) ws.getCell(a).font = HEAD_FONT;
  ws.getCell('B12').value = 'T I M E'; ws.getCell('C12').value = 'R E M A R K S';
  ws.getCell('B12').font = HEAD_FONT; ws.getCell('C12').font = HEAD_FONT;
  let r = 13;
  for (const row of D.timeSheet) {
    ws.getCell(`B${r}`).value = row.time; ws.getCell(`C${r}`).value = row.remark;
    ws.getCell(`B${r}`).font = BODY_FONT; ws.getCell(`C${r}`).font = BODY_FONT;
    r++;
  }
  if (D.timeSheet.length === 0) { ws.getCell('B13').value = '(작업 보고 기록 없음 — 수기 기입)'; ws.getCell('B13').font = BODY_FONT; }
  sig(ws, Math.max(r + 4, 44), 'CHIEF CHECKER', 'CHIEF OFFICER', 'H');
  return ws;
}

// ── 3. OS 시트 (IN/OUT 공용) ───────────────────────────────────
function sheetOS(wb, D, mode) {
  const isIn = mode === 'in';
  const ws = wb.addWorksheet(isIn ? 'OS-IN' : 'OS-OUT');
  const os = isIn ? D.osIn : D.osOut;
  ws.columns = [{ width: 10 }, { width: 12 }, { width: 4 }, { width: 9 }, { width: 8 }, { width: 9 },
    { width: 8 }, { width: 12 }, { width: 4 }, { width: 12 }, { width: 8 }, { width: 8 }, { width: 14 }];
  head(ws);
  ws.mergeCells('A4:M4'); ws.getCell('A4').value = 'CARGO  OVERAGE & SHORTAGE  REPORT';
  ws.getCell('A4').font = TITLE_FONT; ws.getCell('A4').alignment = { horizontal: 'center' };
  ws.getCell('A6').value = 'M / V :'; ws.getCell('B6').value = D.vslFull;
  ws.getCell('G6').value = 'VOY. NO.:'; ws.getCell('H6').value = isIn ? D.voyD : D.voyL;
  ws.getCell('K6').value = 'DATE :'; ws.getCell('L6').value = d10(D.date);
  ws.getCell('A8').value = 'PORT :'; ws.getCell('B8').value = 'PYEONGTAEK, KOREA';
  ws.getCell('G8').value = 'PIER :'; ws.getCell('H8').value = D.pier;
  ws.getCell('K8').value = 'BERTH :'; ws.getCell('L8').value = D.berth;
  for (const a of ['A6','G6','K6','A8','G8','K8']) ws.getCell(a).font = HEAD_FONT;
  const hd = ['B/L NO.', 'MARKS (PORT)', '', 'DESCRIPTION', '', '', 'TYPE OF PKGS', 'MANIFESTED', '',
    isIn ? 'DISCHARGED' : 'LOADED', 'OVER', 'SHORT', 'REMARKS'];
  hd.forEach((v, i) => { const c = ws.getRow(10).getCell(i + 1); c.value = v; c.font = HEAD_FONT; c.border = BOX; c.alignment = { horizontal: 'center' }; });
  let r = 12; let lastPort = '';
  let manTotal = 0, workTotal = 0;
  for (const row of os.rows) {
    ws.getCell(`B${r}`).value = row.port === lastPort ? '-ditto-' : row.port.split('').join(' ');
    ws.getCell(`D${r}`).value = row.size; ws.getCell(`E${r}`).value = row.fe;
    ws.getCell(`F${r}`).value = "CONT'R"; ws.getCell(`G${r}`).value = 'VAN';
    ws.getCell(`H${r}`).value = row.manifested; manTotal += row.manifested;
    ws.getCell(`J${r}`).value = row.manifested - row.short; workTotal += row.manifested - row.short;
    ws.getCell(`K${r}`).value = 'NIL';
    ws.getCell(`L${r}`).value = row.short ? row.short : 'NIL';
    const tags = [];
    if (row.rf) tags.push(`RF x ${row.rf}`);
    if (row.rh) tags.push(`RH x ${row.rh}`);
    if (row.dg) tags.push(`DG x ${row.dg}`);
    ws.getCell(`M${r}`).value = tags.join(' , ');
    for (let c = 1; c <= 13; c++) { const cell = ws.getRow(r).getCell(c); cell.font = BODY_FONT; cell.border = BOX; }
    lastPort = row.port; r++;
  }
  ws.getCell(`D${r}`).value = 'T O T A L'; ws.getCell(`G${r}`).value = 'VAN';
  ws.getCell(`H${r}`).value = manTotal; ws.getCell(`J${r}`).value = workTotal;
  ws.getCell(`K${r}`).value = 'NIL'; ws.getCell(`L${r}`).value = manTotal - workTotal ? manTotal - workTotal : 'NIL';
  for (let c = 1; c <= 13; c++) { const cell = ws.getRow(r).getCell(c); cell.font = HEAD_FONT; cell.border = BOX; }
  if (os.extra) { r += 1; ws.getCell(`B${r}`).value = `OVERLANDED (초과) x ${os.extra} — 별도 신고`; ws.getCell(`B${r}`).font = HEAD_FONT; }
  r += 3;
  ws.getCell(`A${r}`).value = 'REMARKS'; ws.getCell(`A${r}`).font = HEAD_FONT;
  for (const line of os.remarks) { r += 1; const m = line.indexOf(':'); ws.getCell(`A${r}`).value = line.slice(0, m + 1); ws.getCell(`B${r}`).value = line.slice(m + 1).trim(); ws.getCell(`A${r}`).font = BODY_FONT; ws.getCell(`B${r}`).font = BODY_FONT; }
  sig(ws, r + 5, 'CHIEF CHECKER', 'CHIEF OFFICER', 'K');
  return ws;
}

// ── 4. DM (빈 서식) ───────────────────────────────────────────
function sheetDM(wb, D, mode) {
  const isIn = mode === 'in';
  const ws = wb.addWorksheet(isIn ? 'DM-IN' : 'DM-OUT');
  ws.columns = Array(12).fill({ width: 10 });
  head(ws);
  ws.mergeCells('A4:L4'); ws.getCell('A4').value = 'CARGO  DAMAGE  REPORT';
  ws.getCell('A4').font = TITLE_FONT; ws.getCell('A4').alignment = { horizontal: 'center' };
  ws.getCell('A6').value = 'M / V :'; ws.getCell('B6').value = D.vslFull;
  ws.getCell('G6').value = 'VOY. NO. :'; ws.getCell('H6').value = isIn ? D.voyD : D.voyL;
  ws.getCell('K6').value = 'DATE :'; ws.getCell('L6').value = d10(D.date);
  ws.getCell('A8').value = 'PORT :'; ws.getCell('B8').value = 'PYEONGTAEK, KOREA';
  ws.getCell('G8').value = 'PIER :'; ws.getCell('H8').value = D.pier;
  ws.getCell('K8').value = 'BERTH :'; ws.getCell('L8').value = D.berth;
  for (const a of ['A6','G6','K6','A8','G8','K8']) ws.getCell(a).font = HEAD_FONT;
  const hd = ['PORT', 'B/L NO.', 'MARKS', '', '', 'CONTENTS', '', '', '', 'NO. OF PKGS', 'TYPE', 'EXCEPTION ( Found In Stow )'];
  hd.forEach((v, i) => { const c = ws.getRow(10).getCell(i + 1); c.value = v; c.font = HEAD_FONT; c.border = BOX; c.alignment = { horizontal: 'center' }; });
  for (let r = 11; r <= 28; r++) for (let c = 1; c <= 12; c++) ws.getRow(r).getCell(c).border = BOX;
  sig(ws, 32, 'CHIEF CHECKER', 'CHIEF OFFICER', 'K', `STEVEDORE  ${D.pier || ''}`, 'F');
  return ws;
}

// ── 5. Act. Cntr-Seal No List ─────────────────────────────────
function sheetSeal(wb, D) {
  const ws = wb.addWorksheet('Act. Cntr-Seal No List');
  ws.columns = [{ width: 15 }, { width: 4 }, { width: 12 }, { width: 7 }, { width: 15 }, { width: 12 }, { width: 12 }, { width: 12 }];
  head(ws);
  ws.getCell('A4').value = `M / V : ${D.vslFull}`; ws.getCell('F4').value = 'DATE :'; ws.getCell('G4').value = d10(D.date);
  ws.getCell('A6').value = `VOY.NO.: ${[D.voyD, D.voyL].filter(Boolean).join(' & ')}`;
  ws.getCell('F6').value = 'PORT :'; ws.getCell('G6').value = 'PYEONGTAEK, KOREA';
  for (const a of ['A4','F4','A6','F6']) ws.getCell(a).font = HEAD_FONT;
  ws.mergeCells('A8:H8'); ws.getCell('A8').value = 'ACTUAL CONTAINER & SEAL NUMBER';
  ws.getCell('A8').font = TITLE_FONT; ws.getCell('A8').alignment = { horizontal: 'center' };
  const hd = ['MANIFEST CONT\'R NO.', '', 'SEAL NO.', 'SIZE', 'ACTUAL CONT\'R NO.', 'SEAL NO.', 'RESEAL NO.', 'REMARKS'];
  hd.forEach((v, i) => { const c = ws.getRow(10).getCell(i + 1); c.value = v; c.font = HEAD_FONT; c.border = BOX; c.alignment = { horizontal: 'center' }; });
  let r = 12;
  const all = [...D.sealIn.map(x => ({ ...x, leg: "DISCH'" })), ...D.sealOut.map(x => ({ ...x, leg: 'LOAD' }))];
  for (const row of all) {
    ws.getCell(`A${r}`).value = row.cn; ws.getCell(`C${r}`).value = row.manifestSeal;
    ws.getCell(`D${r}`).value = row.size; ws.getCell(`F${r}`).value = row.actualSeal;
    ws.getCell(`G${r}`).value = row.reseal; ws.getCell(`H${r}`).value = `${row.remarks} ${row.leg}`.trim();
    for (let c = 1; c <= 8; c++) { const cell = ws.getRow(r).getCell(c); cell.font = BODY_FONT; cell.border = BOX; }
    r++;
  }
  if (!all.length) { ws.getCell(`A${r}`).value = 'NIL'; ws.getCell(`A${r}`).font = BODY_FONT; r++; }
  ws.getCell(`A${r + 2}`).value = `TOTAL : ${all.length}`; ws.getCell(`A${r + 2}`).font = HEAD_FONT;
  sig(ws, r + 4, 'CHIEF CHECKER', 'CHIEF OFFICER', 'G');
  return ws;
}

// ── 6. RF condition report ────────────────────────────────────
function sheetRF(wb, D) {
  const ws = wb.addWorksheet('RF Condition Report');
  ws.columns = [{ width: 15 }, { width: 12 }, { width: 8 }, { width: 12 }, { width: 9 }, { width: 9 }, { width: 13 }, { width: 10 }];
  head(ws);
  ws.mergeCells('A4:H4'); ws.getCell('A4').value = 'REEFER CONTAINER CONDITION REPORT';
  ws.getCell('A4').font = TITLE_FONT; ws.getCell('A4').alignment = { horizontal: 'center' };
  ws.getCell('A5').value = 'Discharging  /  Loading'; ws.getCell('A5').font = BODY_FONT;
  ws.getCell('A7').value = `M / V : ${D.vslFull}`; ws.getCell('D7').value = `VOY # : ${[D.voyD, D.voyL].filter(Boolean).join(' & ')}`;
  ws.getCell('G7').value = `DATE : ${d10(D.date)}`;
  ws.getCell('A8').value = `PIER : ${D.pier}`; ws.getCell('D8').value = `BERTH : ${D.berth}`; ws.getCell('G8').value = 'PORT : PYEONGTAEK, KOREA';
  for (const a of ['A7','D7','G7','A8','D8','G8']) ws.getCell(a).font = HEAD_FONT;
  const hd = ['CONTAINER NO.', 'SEAL NO.', 'SIZE', 'LOCATION (Bay/Row/Tier)', 'Setting', 'Actual', 'TIME (Plug In/Out)', 'REMARKS'];
  hd.forEach((v, i) => { const c = ws.getRow(10).getCell(i + 1); c.value = v; c.font = HEAD_FONT; c.border = BOX; c.alignment = { horizontal: 'center' }; });
  let r = 12;
  for (const row of [...D.rfIn, ...D.rfOut]) {
    ws.getCell(`A${r}`).value = row.cn; ws.getCell(`B${r}`).value = row.seal;
    ws.getCell(`C${r}`).value = row.size; ws.getCell(`D${r}`).value = row.loc;
    ws.getCell(`E${r}`).value = row.setting; ws.getCell(`H${r}`).value = row.op;
    for (let c = 1; c <= 8; c++) { const cell = ws.getRow(r).getCell(c); cell.font = BODY_FONT; cell.border = BOX; }
    r++;
  }
  if (r === 12) { ws.getCell('A12').value = 'NIL'; ws.getCell('A12').font = BODY_FONT; r++; }
  sig(ws, r + 4, 'CHIEF CHECKER', 'CHIEF OFFICER', 'G');
  return ws;
}

// ── 7. Performance ────────────────────────────────────────────
function sheetPerformance(wb, D) {
  const ws = wb.addWorksheet('Performance');
  ws.columns = [{ width: 12 }, { width: 10 }, ...Array(8).fill({ width: 7 })];
  head(ws);
  ws.mergeCells('A4:J4'); ws.getCell('A4').value = 'PERFORMANCE  REPORT';
  ws.getCell('A4').font = TITLE_FONT; ws.getCell('A4').alignment = { horizontal: 'center' };
  ws.getCell('A6').value = `M / V : ${D.vslFull}`; ws.getCell('G6').value = `VOY # : ${[D.voyD, D.voyL].filter(Boolean).join(' & ')}`;
  ws.getCell('A8').value = `PIER : ${D.pier}`; ws.getCell('G8').value = `BERTH : ${D.berth}`;
  for (const a of ['A6','G6','A8','G8']) ws.getCell(a).font = HEAD_FONT;
  const r0 = 10;
  ws.getCell(`A${r0}`).value = 'Status'; ws.getCell(`B${r0}`).value = 'Operator';
  ws.mergeCells(`C${r0}:F${r0}`); ws.getCell(`C${r0}`).value = 'FULL';
  ws.mergeCells(`G${r0}:J${r0}`); ws.getCell(`G${r0}`).value = 'EMPTY';
  const szs = ["20'", "40'", 'HC', "45'"];
  szs.forEach((s, i) => { ws.getRow(r0 + 1).getCell(3 + i).value = s; ws.getRow(r0 + 1).getCell(7 + i).value = s; });
  for (const rr of [r0, r0 + 1]) for (let c = 1; c <= 10; c++) { const cell = ws.getRow(rr).getCell(c); cell.font = HEAD_FONT; cell.border = BOX; cell.alignment = { horizontal: 'center' }; }
  let r = r0 + 2;
  const S = { 20: 0, 40: 1, HC: 2, 45: 3 };
  for (const [label, agg] of [['IN BOUND', D.perf.inbound], ['OUT BOUND', D.perf.outbound]]) {
    let first = true;
    const st = { F: { 20: 0, 40: 0, HC: 0, 45: 0 }, E: { 20: 0, 40: 0, HC: 0, 45: 0 } };
    for (const op of D.perf.ops) {
      const o = agg[op]; if (!o) continue;
      ws.getCell(`A${r}`).value = first ? label : ''; first = false;
      ws.getCell(`B${r}`).value = op;
      for (const fe of ['F', 'E']) for (const [sz, i] of Object.entries(S)) {
        const v = (o[fe] || {})[sz] || 0;
        if (v) ws.getRow(r).getCell((fe === 'F' ? 3 : 7) + i).value = v;
        st[fe][sz] += v;
      }
      for (let c = 1; c <= 10; c++) { const cell = ws.getRow(r).getCell(c); cell.font = BODY_FONT; cell.border = BOX; cell.alignment = { horizontal: 'center' }; }
      r++;
    }
    ws.getCell(`B${r}`).value = 'S-TOTAL';
    for (const fe of ['F', 'E']) for (const [sz, i] of Object.entries(S))
      ws.getRow(r).getCell((fe === 'F' ? 3 : 7) + i).value = st[fe][sz];
    for (let c = 1; c <= 10; c++) { const cell = ws.getRow(r).getCell(c); cell.font = HEAD_FONT; cell.border = BOX; cell.alignment = { horizontal: 'center' }; }
    r += 2;
  }
  sig(ws, r + 3, 'CHIEF CHECKER', 'CHIEF OFFICER', 'H');
  return ws;
}

// ── 8. SHIFTING ───────────────────────────────────────────────
function sheetShifting(wb, D) {
  const ws = wb.addWorksheet('SHIFTING');
  ws.columns = [{ width: 4 }, { width: 14 }, { width: 9 }, { width: 5 }, { width: 8 }, { width: 6 }, { width: 9 }, { width: 9 }, { width: 6 }, { width: 6 }, { width: 9 }];
  head(ws);
  ws.getCell('A3').value = 'SHIFTING REPORT'; ws.getCell('A3').font = TITLE_FONT;
  ws.getCell('A5').value = `M.V. : ${D.vslFull}`; ws.getCell('H5').value = `VOY # : ${[D.voyD, D.voyL].filter(Boolean).join(' & ')}`;
  ws.getCell('A6').value = `DATE : ${d10(D.date)}`; ws.getCell('H6').value = 'PORT : PYEONGTAEK, KOREA';
  for (const a of ['A5','H5','A6','H6']) ws.getCell(a).font = HEAD_FONT;
  const hd = ['NO', "CON'T NO", 'TYPE', 'F/E', 'W/T', 'OPR', 'OLD POSN', 'NEW POSN', 'POD', 'POL', 'ACCOUNT'];
  hd.forEach((v, i) => { const c = ws.getRow(8).getCell(i + 1); c.value = v; c.font = HEAD_FONT; c.border = BOX; c.alignment = { horizontal: 'center' }; });
  let r = 10;
  for (const s of D.shifting) {
    [s.no, s.cn, s.type, s.fe, s.wt, s.op, s.oldPos, s.newPos, s.pod, s.pol, s.op].forEach((v, i) =>
      ws.getRow(r).getCell(i + 1).value = v);
    for (let c = 1; c <= 11; c++) { const cell = ws.getRow(r).getCell(c); cell.font = BODY_FONT; cell.border = BOX; }
    r++;
  }
  if (!D.shifting.length) { ws.getCell('A10').value = 'NIL'; ws.getCell('A10').font = BODY_FONT; }
  return ws;
}

// ═══ V9.19-01: 실물 템플릿 필 모드 ══════════════════════════════════════
//   사용자 피드백: "셀 크기·간격·글씨 크기가 실물과 다르고 짤린다. 중앙정렬 원함."
//   → 실물 마감 텔리 파일을 그대로 서식 틀로 쓰고(public/tally_templates/{code}.xlsx,
//     빌더가 가변 값만 비움) 숫자만 채운다. 서식·정렬·열너비·글꼴 = 실물 100%.
//   합계·헤더(DISCH (n))는 원본이 수식이지만, 모바일 뷰어가 재계산을 안 하는 경우를
//   위해 검증된 계산값으로 덮어쓴다. 템플릿 없는 배(TMPZ·DXQD·OBWH 등)는 드로잉 폴백.
import TEMPLATE_MAP from './data/tallyTemplateMap.js';

const zv = (v) => (v ? v : null);   // 실물 규칙: 빈 값은 공란

async function fillTemplate(D, ExcelJS) {
  const M = TEMPLATE_MAP[D.code];
  if (!M || !M.sheets || !M.sheets.finalWork) return null;
  const base = (typeof document !== 'undefined' ? './' : 'public/');
  let ab;
  if (typeof document !== 'undefined') {
    const res = await fetch(`${base}tally_templates/${D.code}.xlsx`, { cache: 'no-store' });
    if (!res.ok) return null;
    ab = await res.arrayBuffer();
  } else {
    const fs = await import('fs');
    ab = fs.readFileSync(`public/tally_templates/${D.code}.xlsx`);
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(ab);
  // exceljs 라운드트립 버그 방어 — 원본의 정의명(인쇄영역 등)이 깨진 채 남으면
  //   재저장본을 일부 뷰어가 못 연다. 정의명은 서식이 아니므로 비운다.
  try { wb.definedNames.model = []; } catch { /* skip */ }
  for (const ws0 of wb.worksheets) { try { if (ws0.pageSetup) delete ws0.pageSetup.printArea; } catch { /* skip */ } }
  const get = (key) => M.sheets[key] ? wb.getWorksheet(M.sheets[key].name) : null;
  const voy = [D.voyD, D.voyL].filter(Boolean).join(' & ');
  const dstr = d10(D.date);

  // ── Final Work ──
  {
    const cfg = M.sheets.finalWork;
    const ws = get('finalWork');
    ws.getCell('B4').value = ` ${D.vslFull}`;
    ws.getCell('G4').value = voy;
    ws.getCell('L4').value = dstr;
    ws.getCell('B6').value = ` ${D.pier}`;
    ws.getCell('G6').value = D.berth;
    const cap = cfg.totalRow - cfg.dataStart;
    if (D.rows.length > cap) ws.duplicateRow(cfg.totalRow - 1, D.rows.length - cap, true);
    const totalRow = cfg.totalRow + Math.max(0, D.rows.length - cap);
    // 라벨 쓰기 + 블록 추적 (템플릿은 A/B 병합을 풀어둔 상태 — 실제 블록 크기로 재병합해 실물 모양 재현)
    const opBlocks = [];   // {op, r1, r2}
    const portBlocks = [];
    for (let i = 0; i < Math.max(D.rows.length, cap); i++) {
      const r = cfg.dataStart + i;
      const row = D.rows[i];
      const cells = ws.getRow(r);
      if (row) {
        if (!opBlocks.length || opBlocks[opBlocks.length - 1].op !== row.op) {
          cells.getCell(1).value = row.op;
          opBlocks.push({ op: row.op, r1: r, r2: r });
        } else opBlocks[opBlocks.length - 1].r2 = r;
        const pb = portBlocks[portBlocks.length - 1];
        if (!pb || pb.op !== row.op || pb.port !== row.port) {
          cells.getCell(2).value = row.port;
          portBlocks.push({ op: row.op, port: row.port, r1: r, r2: r });
        } else portBlocks[portBlocks.length - 1].r2 = r;
        cells.getCell(3).value = row.fe;
        ['20','40','HC','45'].forEach((sz, k) => {
          cells.getCell(4 + k).value = zv(row.dis[sz]);
          cells.getCell(8 + k).value = zv(row.load[sz]);
          cells.getCell(12 + k).value = zv(row.shift[sz]);
        });
      } else {
        for (const c of [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]) cells.getCell(c).value = null;
      }
    }
    for (const b of opBlocks) if (b.r2 > b.r1) { try { ws.mergeCells(b.r1, 1, b.r2, 1); } catch { /* skip */ } }
    for (const b of portBlocks) if (b.r2 > b.r1) { try { ws.mergeCells(b.r1, 2, b.r2, 2); } catch { /* skip */ } }
    // 합계·헤더 — 검증된 계산값으로 (수식 덮어씀: 모바일 뷰어 재계산 문제 방지)
    for (const [off, fe] of [[0,'F'],[1,'E']]) {
      const cells = ws.getRow(totalRow + off);
      ['20','40','HC','45'].forEach((sz, k) => {
        cells.getCell(4 + k).value = D.totals.dis[fe][sz] || 0;
        cells.getCell(8 + k).value = D.totals.load[fe][sz] || 0;
        cells.getCell(12 + k).value = D.totals.shift[fe][sz] || 0;
      });
    }
    ws.getCell(`D8`).value = `DISCH (${D.totals.dis.n})`;
    ws.getCell(`H8`).value = `LOAD (${D.totals.load.n})`;
    ws.getCell(`L8`).value = `SHIFT (${D.totals.shift.n})`;
  }
  // ── Time Sheet ──
  if (get('timeSheet')) {
    const cfg = M.sheets.timeSheet;
    const ws = get('timeSheet');
    for (let r = cfg.dataStart, i = 0; r <= cfg.dataEnd; r++, i++) {
      const row = D.timeSheet[i];
      ws.getRow(r).getCell(2).value = row ? row.time : null;
      ws.getRow(r).getCell(3).value = row ? row.remark : null;
    }
  }
  // ── OS-IN / OS-OUT ──
  for (const key of ['osIn', 'osOut']) {
    const cfg = M.sheets[key];
    if (!cfg) continue;
    const ws = get(key);
    const os = key === 'osIn' ? D.osIn : D.osOut;
    ws.getCell('H6').value = key === 'osIn' ? D.voyD : D.voyL;
    ws.getCell('L6').value = dstr;
    ws.getCell('H8').value = D.pier;
    ws.getCell('L8').value = D.berth;
    const cap = cfg.totalRow - cfg.dataStart;
    if (os.rows.length > cap) ws.duplicateRow(cfg.totalRow - 1, os.rows.length - cap, true);
    const totalRow = cfg.totalRow + Math.max(0, os.rows.length - cap);
    let last = ''; let man = 0, wk = 0;
    for (let i = 0; i < Math.max(os.rows.length, cap); i++) {
      const r = ws.getRow(cfg.dataStart + i);
      const o = os.rows[i];
      if (o) {
        r.getCell(2).value = o.port === last ? '-ditto-' : o.port.split('').join(' ');
        r.getCell(4).value = o.size; r.getCell(5).value = o.fe;
        r.getCell(6).value = "CONT'R"; r.getCell(7).value = 'VAN';
        r.getCell(8).value = o.manifested; r.getCell(10).value = o.manifested - o.short;
        r.getCell(11).value = 'NIL'; r.getCell(12).value = o.short ? o.short : 'NIL';
        const tags = [];
        if (o.rf) tags.push(`RF x ${o.rf}`);
        if (o.rh) tags.push(`RH x ${o.rh}`);
        if (o.dg) tags.push(`DG x ${o.dg}`);
        r.getCell(13).value = tags.join(' , ') || null;
        man += o.manifested; wk += o.manifested - o.short;
        last = o.port;
      } else {
        for (const c of [1,2,3,4,5,6,7,8,9,10,11,12,13]) r.getCell(c).value = null;
      }
    }
    const tr = ws.getRow(totalRow);
    tr.getCell(8).value = man; tr.getCell(10).value = wk;
    tr.getCell(11).value = 'NIL'; tr.getCell(12).value = (man - wk) ? (man - wk) : 'NIL';
    if (cfg.remarksRow > 0) {
      for (let r = cfg.remarksRow + 1, i = 0; r <= cfg.remarksEnd; r++, i++) {
        const line = os.remarks[i] || '';
        const m = line.indexOf(':');
        ws.getRow(r).getCell(1).value = line ? line.slice(0, m + 1) : null;
        ws.getRow(r).getCell(2).value = line ? line.slice(m + 1).trim() : null;
      }
    }
  }
  // ── Act Seal ──
  if (M.sheets.seal) {
    const cfg = M.sheets.seal;
    const ws = get('seal');
    ws.getCell('G4').value = dstr;
    const all = [...D.sealIn.map(x => ({ ...x, leg: "DISCH'" })), ...D.sealOut.map(x => ({ ...x, leg: 'LOAD' }))];
    const cap = cfg.dataEnd - cfg.dataStart + 1;
    if (all.length > cap) ws.duplicateRow(cfg.dataEnd, all.length - cap, true);
    for (let i = 0; i < Math.max(all.length, cap); i++) {
      const r = ws.getRow(cfg.dataStart + i);
      const o = all[i];
      r.getCell(1).value = o ? o.cn : null;
      r.getCell(3).value = o ? o.manifestSeal : null;
      r.getCell(4).value = o ? o.size : null;
      r.getCell(6).value = o ? o.actualSeal : null;
      r.getCell(7).value = o ? o.reseal : null;
      r.getCell(8).value = o ? `${o.remarks} ${o.leg}`.trim() : null;
    }
  }
  // ── RF ──
  if (M.sheets.rf) {
    const cfg = M.sheets.rf;
    const ws = get('rf');
    const all = [...D.rfIn, ...D.rfOut];
    const cap = cfg.dataEnd - cfg.dataStart + 1;
    if (all.length > cap) ws.duplicateRow(cfg.dataEnd, all.length - cap, true);
    for (let i = 0; i < Math.max(all.length, cap); i++) {
      const r = ws.getRow(cfg.dataStart + i);
      const o = all[i];
      r.getCell(1).value = o ? o.cn : null;
      r.getCell(2).value = o ? (o.seal || null) : null;
      r.getCell(3).value = o ? o.size : null;
      r.getCell(4).value = o ? (o.loc || null) : null;
      r.getCell(6).value = o ? (o.setting || null) : null;
      r.getCell(9).value = o ? o.op : null;
    }
  }
  // ── Performance (표준 열: op=D(4), FULL 20/40/HC/45 = H/J/L/N(8,10,12,14), EMPTY = P/R/T/V(16,18,20,22)) ──
  if (M.sheets.perf) {
    const cfg = M.sheets.perf;
    const ws = get('perf');
    const S = { 20: 0, 40: 1, HC: 2, 45: 3 };
    const fill = (agg, r0, r1, stRow) => {
      const st = { F: {20:0,40:0,HC:0,45:0}, E: {20:0,40:0,HC:0,45:0} };
      let i = 0;
      for (const op of D.perf.ops) {
        const o = agg[op]; if (!o) continue;
        const r = ws.getRow(r0 + i);
        if (r0 + i < r1) {
          r.getCell(4).value = op;
          for (const fe of ['F','E']) for (const [sz, k] of Object.entries(S)) {
            const v = (o[fe] || {})[sz] || 0;
            r.getCell((fe === 'F' ? 8 : 16) + k * 2).value = v || null;
          }
        }
        for (const fe of ['F','E']) for (const sz of ['20','40','HC','45']) st[fe][sz] += (o[fe]||{})[sz] || 0;
        i++;
      }
      for (; r0 + i < r1; i++) { const r = ws.getRow(r0 + i); r.getCell(4).value = null; for (let c = 8; c <= 22; c++) r.getCell(c).value = null; }
      const tr = ws.getRow(stRow);
      for (const fe of ['F','E']) for (const [sz, k] of Object.entries(S))
        tr.getCell((fe === 'F' ? 8 : 16) + k * 2).value = st[fe][sz];
    };
    fill(D.perf.inbound, cfg.inRow, cfg.st1, cfg.st1);
    fill(D.perf.outbound, cfg.outRow, cfg.st2, cfg.st2);
  }
  // ── SHIFTING ──
  if (M.sheets.shifting) {
    const cfg = M.sheets.shifting;
    const ws = get('shifting');
    for (let i = 0; i < Math.max(D.shifting.length, cfg.dataEnd - cfg.dataStart + 1); i++) {
      const r = ws.getRow(cfg.dataStart + i);
      const s2 = D.shifting[i];
      [s2?.no, s2?.cn, s2?.type, s2?.fe, s2?.wt, s2?.op, s2?.oldPos, s2?.newPos, s2?.pod, s2?.pol, s2?.op]
        .forEach((v, k) => { r.getCell(k + 1).value = v ?? null; });
    }
  }
  return wb;
}

/** 워크북 생성 → Blob 다운로드. 반환: 파일명 */
export async function generateTallyExcel(D) {
  const ExcelJS = (await import('exceljs')).default || (await import('exceljs'));
  // V9.19-01: 실물 템플릿 우선 — 실패 시 드로잉 폴백
  let note = '';
  let tplWb = null;
  try { tplWb = await fillTemplate(D, ExcelJS); } catch (e) { note = `템플릿 실패(${e?.message || e}) — 표준 서식으로 생성`; }
  if (tplWb) {
    const voy0 = [D.voyD, D.voyL].filter(Boolean).join('&');
    const fname0 = `${D.code} ${voy0} PTK TALLY REPORT.xlsx`;
    const buf0 = await tplWb.xlsx.writeBuffer();
    _download(buf0, fname0);
    return { fname: fname0, buf: buf0, note: note || '실물 서식(템플릿) 기반' };
  }
  if (!note) note = '이 배는 템플릿 미보유 — 표준 서식으로 생성(배치가 실물과 다를 수 있음)';
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GREEN MARINE Tallyman Master';
  sheetFinalWork(wb, D);
  sheetTimeSheet(wb, D);
  sheetOS(wb, D, 'in');
  sheetDM(wb, D, 'in');
  sheetOS(wb, D, 'out');
  sheetDM(wb, D, 'out');
  sheetSeal(wb, D);
  sheetRF(wb, D);
  if (D.fmt.performance !== false) sheetPerformance(wb, D);
  if (D.fmt.shifting && D.shifting.length) sheetShifting(wb, D);
  const voy = [D.voyD, D.voyL].filter(Boolean).join('&');
  const fname = `${D.code} ${voy} PTK TALLY REPORT.xlsx`;
  const buf = await wb.xlsx.writeBuffer();
  _download(buf, fname);
  return { fname, buf, note };
}

function _download(buf, fname) {
  if (typeof document === 'undefined') return;
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fname; a.click();
  URL.revokeObjectURL(url);
}
