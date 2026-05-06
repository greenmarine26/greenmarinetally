import { readFileSync } from 'fs';
import { parseListExcel, isReeferContainer } from './src/utils.js';

const buffer = readFileSync('/mnt/user-data/uploads/STSE_2633E_SIT.xls');
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const result = await parseListExcel(arrayBuffer);
console.log(`총 행: ${result.rows?.length || 0}`);
console.log(`매칭된 헤더: tmp_i 인식?`);

// 리퍼만 필터
const reefers = (result.rows || []).filter(c => isReeferContainer(c));
console.log(`\n리퍼 ${reefers.length}대 추출:`);
reefers.forEach((c, i) => {
  console.log(`  ${i+1}. ${c.cn} iso=${c.iso} fe=${c.fe} tmp="${c.tmp}" tmp_missing=${c.tmp_missing}`);
});

// 풀 리퍼만
const fullReefer = reefers.filter(c => c.fe === 'F');
console.log(`\n풀 리퍼 ${fullReefer.length}대 / 온도있음 ${fullReefer.filter(c => c.tmp).length}`);
