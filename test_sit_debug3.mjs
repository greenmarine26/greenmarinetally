import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';
global.window = { XLSX };
global.document = { createElement: () => ({}), head: { appendChild: () => {} } };
const { parseListExcel } = await import('./src/utils.js');

const buffer = readFileSync('/mnt/user-data/uploads/STSE_2633E_SIT.xls');
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const result = await parseListExcel(arrayBuffer);
console.log('result 키:', Object.keys(result));
console.log('result.containers?.length:', result.containers?.length);
console.log('result.rows?.length:', result.rows?.length);
console.log('result.records?.length:', result.records?.length);
if (result.errors) console.log('errors:', result.errors);

// 모든 컨테이너 첫 5개
const all = result.containers || result.rows || result.records || [];
console.log(`\n총 ${all.length}개. 첫 5개:`);
all.slice(0, 5).forEach(c => console.log(`  ${c.cn} iso=${c.iso} fe=${c.fe} tmp="${c.tmp}"`));

// 리퍼만
const reefers = all.filter(c => c.rf || (c.iso && /R/.test(c.iso)));
console.log(`\n리퍼 추출: ${reefers.length}개`);
reefers.slice(0, 5).forEach(c => console.log(`  ${c.cn} iso=${c.iso} fe=${c.fe} tmp="${c.tmp}" tmp_missing=${c.tmp_missing}`));
