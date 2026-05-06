import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';
global.window = { XLSX };
global.document = { createElement: () => ({}), head: { appendChild: () => {} } };

// utils.js의 parseListExcel을 그대로 가져와서 실행 + 콘솔 로그 주입
const utilsSource = readFileSync('./src/utils.js', 'utf8');

// CN_HEAD 정규식 추출 시도
const CN_HEAD = [
    /^container$/, /^containerno$/, /container\s*no/, /^containerno\.?$/,
    /^cntr$/, /^cntrno$/, /cntr\s*no/, /^cntrno\.?$/,
    /^cnt$/, /^cntno$/, /cnt\s*no/, /^cntno\.?$/,
    /^cntno$/, /^cntr#$/, /^cont(ainer)?#$/,
    /컨테이너.*번호/, /^컨테이너$/, /^콘테이너/,
    /^c\/?no$/, /^cont(ainer)?\.?\s*no\.?$/,
    /container.*number/, /^container\s*#/,
    /^cntrno\.$/, /^cntr\s*no\.$/,
    /^箱号$/, /^货柜号$/,
    /^cntno$/i, /^cntr\.?no\.?$/i,
];

const buffer = readFileSync('/mnt/user-data/uploads/STSE_2633E_SIT.xls');
const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
const ws = wb.Sheets['sheet1'];
const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

// 1단계 헤더 검출 시뮬레이션
console.log('=== 헤더 행 검출 시뮬레이션 ===');
for (let i = 0; i < Math.min(10, grid.length); i++) {
    const row = (grid[i] || []).map(s =>
      String(s || '').trim().toLowerCase().replace(/\.+$/, '').replace(/\s+/g, ' ')
    );
    const matches = [];
    row.forEach((cell, ci) => {
      if (cell) {
        for (const p of CN_HEAD) {
          if (p.test(cell)) {
            matches.push(`R${i+1}[${ci}]"${cell}" matches ${p}`);
            break;
          }
        }
      }
    });
    if (matches.length) {
      console.log(`✅ R${i+1}: ${matches.join(', ')}`);
    } else if (row.some(c => c)) {
      const filled = row.map((c, ci) => c ? `[${ci}]"${c.slice(0,15)}"` : null).filter(x => x).slice(0, 5);
      console.log(`❌ R${i+1}: ${filled.join(' ')} - CN 매칭 없음`);
    }
}
