// 데미지·실오류 보고 문구의 항차가 모드(양하=voy_d·선적=voy_l)를 따르는지 보는 4.59-02 연막검사 — PCSZ 실데이터(양하 2632E · 선적 2633W)
//   검수사 2026-10-31 16:08 «현재 데미지가 왜 전부 선적항차로 찍히는지 PCSZ»
const fs = require('fs');
const ROOT = process.argv[2] || process.cwd();
const src = fs.readFileSync(ROOT + '/src/components/PhotoReportModal.jsx', 'utf8');
const det = fs.readFileSync(ROOT + '/src/components/ContainerDetailModal.jsx', 'utf8');
let n = 0, bad = 0;
const check = (name, cond) => { n += 1; if (cond) console.log('  ✓ ' + name); else { bad += 1; console.log('  ✗ ' + name); } };
// 모달이 쓰는 항차 선택식을 그대로 뽑아 실행한다(옮겨 적지 않는다).
const m = src.match(/const _info = voyage\?\.info \|\| \{\};\n([\s\S]*?\n)\s*const cn = /);
check('모달에 모드별 항차 선택식이 있다', !!m);
const pick = (voyage) => new Function('voyage', 'const _info = voyage?.info || {};\n' + m[1] + '\nreturn voy;')(voyage);
const info = { voy: '2632E', voy_d: '2632E', voy_l: '2633W' };
check('양하 보고 → 양하 항차 2632E', pick({ info, mode: 'discharge' }) === '2632E');
check('선적 보고 → 선적 항차 2633W', pick({ info, mode: 'loading' }) === '2633W');
check('모드 모르면 종전 그대로 선적 항차', pick({ info }) === '2633W');
check('양하인데 voy_d 없으면 voy 로', pick({ info: { voy: '2632E', voy_l: '2633W' }, mode: 'discharge' }) === '2632E');
check('컨 상세가 mode 를 모달에 넘긴다', /voyage=\{\{ info: voyageInfo, mode \}\}/.test(det));
check('사진 mode 저장은 voyage.mode 를 그대로', /mode: voyage\?\.mode \|\| 'unknown'/.test(src));
console.log(bad ? `\n✗ ${bad}/${n} 실패` : `\n보고 항차 4.59-02 — ${n}/${n} 통과`);
process.exit(bad ? 1 : 0);
