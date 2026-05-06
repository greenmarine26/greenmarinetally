import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';

const buffer = readFileSync('/mnt/user-data/uploads/STSE_2633E_SIT.xls');
const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
console.log('시트 목록:', wb.SheetNames);

for (const sn of wb.SheetNames) {
  const ws = wb.Sheets[sn];
  console.log(`\n=== 시트 [${sn}] ===`);
  console.log('!ref:', ws['!ref']);
  
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  console.log(`grid 행수: ${grid.length}`);
  
  // R1~R8 각 행의 모든 셀 출력
  for (let i = 0; i < Math.min(8, grid.length); i++) {
    const row = grid[i] || [];
    const filled = row.map((v, idx) => v ? `[${idx}]"${String(v).slice(0,20)}"` : null).filter(x => x);
    console.log(`R${i+1} (${row.length}열): ${filled.slice(0, 8).join(' ')}`);
  }
}
