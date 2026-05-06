import { readFileSync } from 'fs';

// window 폴리필 + xlsx 직접 로드
import * as XLSX from 'xlsx';
global.window = { XLSX };
global.document = { createElement: () => ({}), head: { appendChild: () => {} } };

const { parseListExcel, isReeferContainer } = await import('./src/utils.js');

const buffer = readFileSync('/mnt/user-data/uploads/STSE_2633E_SIT.xls');
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const result = await parseListExcel(arrayBuffer);
console.log(`총 컨: ${result.rows?.length || result.containers?.length || 0}개`);

const all = result.rows || result.containers || [];
const reefers = all.filter(c => isReeferContainer(c));
console.log(`\n리퍼 ${reefers.length}대:`);
reefers.forEach((c, i) => {
  console.log(`  ${i+1}. ${c.cn} iso=${c.iso} fe=${c.fe} tmp="${c.tmp}" tmp_missing=${c.tmp_missing} rf=${c.rf}`);
});

const fullR = reefers.filter(c => c.fe === 'F');
const withTmp = fullR.filter(c => c.tmp && c.tmp !== '');
console.log(`\n📊 풀 리퍼 ${fullR.length}대 중 온도값 있음: ${withTmp.length}대`);
