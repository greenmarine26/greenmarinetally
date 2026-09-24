// 3.60-07 연막검사 — 선적 EDI 회신 규격(H≠리퍼) · 씰체결 번호 규격별 · 현황 탭 특수화물 한 벌이 되살아나면 배포를 막는다.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix36007_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = global.window || { addEventListener() {}, location: { href: '' } };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {} };
try {
  const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
  fs.writeFileSync(e, `export { normalizeCntrType } from "${ROOT}/src/loadingEdiExport.js";\nexport { esealSheetPages } from "${ROOT}/src/esealSheet.js";\n`);
  execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
  const B = require(o);
  console.log('■ 선적 EDI 회신 규격 — 셋째 글자 H 는 리퍼가 아니다(라벨 먼저)');
  const t = (x) => { const r = B.normalizeCntrType(x); return `${r.len}/${r.kind}/${r.high ? 'H' : 'S'}`; };
  for (const [iso, want] of [['42HQ', '40/GP/H'], ['40HE', '40/GP/H'], ['DCHC', '40/GP/H'], ['45R1', '40/RF/H'], ['45G1', '40/GP/H'], ['22G1', '20/GP/S'], ['22R1', '20/RF/S'], ['L5G1', '45/GP/H'], ['42P1', '40/FR/S'], ['42U1', '40/OT/S'], ['4530', '40/RF/H'], ['2210', '20/GP/S'], ['RFHC', '40/RF/H'], ['DC20', '20/GP/S'], ['FR40', '40/FR/S'], ['4EG1', '40/GP/H'], ['25G1', '20/GP/H'], ['L5R1', '45/RF/H']]) ok(`${iso} → ${want}`, t(iso) === want, t(iso));
  console.log('■ 씰체결 작업 리스트 — 번호는 규격마다 1부터');
  const pg = B.esealSheetPages([{ cn: 'AAAU0000001', iso: '45G1' }, { cn: 'AAAU0000002', iso: '45G1' }, { cn: 'AAAU0000003', iso: '45R1' }, { cn: 'AAAU0000004', iso: '42G1' }, { cn: 'BBBU0000001', iso: '22G1' }, { cn: 'BBBU0000002', iso: '22R1' }]);
  ok('40피트 장 HC 1·2 · RH 1 · 40\' 1', pg[0].map((r) => `${r.size}${r.no}`).join(',') === "HC1,HC2,RH1,40'1", pg[0].map((r) => `${r.size}${r.no}`).join(','));
  ok("20피트 장 20' 1 · 20'RF 1", pg[1].map((r) => `${r.size}${r.no}`).join(',') === "20'1,20'RF1", pg[1].map((r) => `${r.size}${r.no}`).join(','));
  console.log('■ 현황 탭 특수화물 — utils 한 벌');
  const ST = fs.readFileSync(path.join(ROOT, 'src/components/StatsTab.jsx'), 'utf8');
  ok('리퍼는 isReeferContainer · 엠티 리퍼 제외', /const isReefer = isReeferContainer\(c\) && String\(c\.fe \|\| ''\)\.toUpperCase\(\) !== 'E';/.test(ST));
  ok('FR 은 isFlatRackContainer · OT 는 FR 아닐 때 오픈탑 판정(규격초과만으로 FR 에 안 센다)', /const _isFr = isFlatRackContainer\(c\);/.test(ST) && !/if \(c\.fr \|\| c\.oog\)/.test(ST));
} catch (ex) { bad += 1; console.log('  ✘ 검사 중 오류 — ' + (ex && ex.stack || ex)); }
console.log(`\n3.60-07 연막검사 ${n - bad}/${n} 통과`);
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e2) { /* 임시 */ }
if (bad) { console.log('✗ 실패 — 배포 금지'); process.exit(1); }
