import { parseListExcel } from './src/utils.js';
import * as XLSX from 'xlsx';

// 가짜 양하 리스트 엑셀 (온도 0°C 포함)
const wb = XLSX.utils.book_new();
const data = [
  ['컨번호', 'POL', 'POD', 'F/E', '규격', '온도'],
  ['REEFER0CELS01', 'CNDLC', 'KRPTK', 'F', '40HR', 0],         // 숫자 0 (이전 버그)
  ['REEFER0CELS02', 'CNDLC', 'KRPTK', 'F', '40HR', '0'],       // 문자 "0"
  ['REEFER0CELS03', 'CNDLC', 'KRPTK', 'F', '40HR', '0.0'],     // 문자 "0.0"
  ['REEFERMINUS18', 'CNDLC', 'KRPTK', 'F', '40HR', -18],       // 숫자 음수
  ['REEFEREMPTYTMP', 'CNDLC', 'KRPTK', 'F', '40HR', ''],       // 빈 값
  ['REEFERPLUS04', 'CNDLC', 'KRPTK', 'F', '40HR', '+4'],       // +4
];
const ws = XLSX.utils.aoa_to_sheet(data);
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

const result = await parseListExcel(buffer);
console.log('=== 0°C 무시 버그 검증 (M3.80) ===\n');
result.rows.forEach(c => {
  console.log(`${c.cn}:`);
  console.log(`  iso: ${c.iso}, fe: ${c.fe}, rf: ${c.rf}`);
  console.log(`  tmp: "${c.tmp}", tmp_missing: ${c.tmp_missing}`);
  console.log('');
});

console.log('기대값:');
console.log('  REEFER0CELS01 → tmp:"0", tmp_missing:false ⭐ (이전 버그: tmp:"", missing:true)');
console.log('  REEFER0CELS02 → tmp:"0", tmp_missing:false');
console.log('  REEFER0CELS03 → tmp:"0", tmp_missing:false');
console.log('  REEFERMINUS18 → tmp:"-18", tmp_missing:false');
console.log('  REEFEREMPTYTMP → tmp:"", tmp_missing:true (정상)');
console.log('  REEFERPLUS04 → tmp:"+4", tmp_missing:false');
