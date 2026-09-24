// 3.60-10 연막검사 — 리퍼 판정 한 벌(진단 M6): 자체 정규식이 되살아나거나, 45피트 리퍼·숫자 리퍼를 놓치거나, 플랫랙(4583·4584)을 리퍼로 세면 배포를 막는다.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix36010_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = global.window || { addEventListener() {}, dispatchEvent() { return true; }, location: { href: '' } };
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {} };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 있음 */ }
try {
  const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
  fs.writeFileSync(e, `export { isReeferIso, isReeferContainer } from "${ROOT}/src/utils.js";\nexport { buildRF } from "${ROOT}/src/tallyReport.js";\nexport { applyNLFilter, parseNaturalQuery } from "${ROOT}/src/nlSearch.js";\n`);
  execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
  const B = require(o);

  console.log('■ 한 벌(utils.isReeferIso) — 45피트·숫자 리퍼는 리퍼, 플랫랙은 아니다');
  for (const c of ['L5R1', 'L2R1', 'M5R1', '45R1', '42HR', '4530', '2230', '453E', '22R1']) ok(`${c} → 리퍼`, B.isReeferIso(c) === true);
  for (const c of ['4583', '4584', '45G1', '22G1', '42UT', 'L5G1', '40HE']) ok(`${c} → 리퍼 아님`, B.isReeferIso(c) === false);

  console.log('■ 마감텔리 RF condition·REMARKS — 한 벌을 쓴다');
  const cs = [
    { cn: 'RFFU0000001', iso: '2230', fe: 'F', tmp: '-18' },          // 숫자 리퍼 · rf 표식 없음 — 종전 RF condition 에서 빠짐
    { cn: 'RFFU0000002', iso: 'L5R1', fe: 'F', tmp: '-20' },          // 45피트 리퍼
    { cn: 'FRFU0000003', iso: '4583', fe: 'F' },                      // 플랫랙 — 종전 `^45[38]` 로 리퍼가 됨
    { cn: 'DRYU0000004', iso: '45G1', fe: 'F' },
    { cn: 'DRYU0000005', iso: '45G1', fe: 'F', tmp: '-18' },         // 드라이인데 온도 칸만 찬 것 — 종전 미르 걸러내기는 리퍼로 셌다
  ];
  const rf = B.buildRF(cs).map((r) => r.cn);
  ok('RF condition 에 숫자 리퍼·45피트 리퍼가 실린다', rf.includes('RFFU0000001') && rf.includes('RFFU0000002'), JSON.stringify(rf));
  ok('RF condition 에 플랫랙(4583)·드라이가 안 실린다', !rf.includes('FRFU0000003') && !rf.includes('DRYU0000004'), JSON.stringify(rf));
  const nl = B.applyNLFilter(cs, B.parseNaturalQuery('리퍼 몇대야')).map((c) => c.cn);   // 실제 질문을 풀어 쓴다
  ok('미르 «리퍼» 걸러내기도 같은 한 벌(숫자·45피트 O · 플랫랙·온도만 찬 드라이 X)', nl.includes('RFFU0000001') && nl.includes('RFFU0000002') && !nl.includes('FRFU0000003') && !nl.includes('DRYU0000005'), JSON.stringify(nl));
  ok('라벨 40RH(41HR)도 리퍼', B.isReeferIso('41HR') === true);

  console.log('■ 자체 리퍼 정규식이 되살아나지 않는다(판정 한 벌 lint)');
  const hits = [];
  const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(js|jsx)$/.test(f) && !/utils\.js$/.test(f)) { const s = fs.readFileSync(p, 'utf8'); s.split('\n').forEach((line, i) => { const code = line.replace(/\/\/.*$/, ''); if (/\[2\]\s*===\s*'R'|\^45\[38\]|R\[EFHT\]|R\[FH\]\$\/\.test\(isoToLabel|slice\(2, 3\)\)/.test(code)) hits.push(`${path.relative(ROOT, p)}:${i + 1}`); }); } } };
  walk(path.join(ROOT, 'src'));
  ok('src 에 자체 리퍼 판정(`[2] === \'R\'`·`^45[38]`·`R[EFHT]`·라벨 `R[FH]$`·`slice(2, 3)`) 0곳(utils 밖)', hits.length === 0, hits.join(' · '));
  const VP = fs.readFileSync(path.join(ROOT, 'src/pages/VoyagePage.jsx'), 'utf8'), RM = fs.readFileSync(path.join(ROOT, 'src/components/ReeferMemoModal.jsx'), 'utf8');
  ok('리퍼 버튼 숫자(VoyagePage)와 리퍼 메모 줄(ReeferMemoModal)이 같은 한 벌', /const rf = isReeferContainer\(c\);/.test(VP) && /const rf = isReeferContainer\(c\);/.test(RM) && /isReeferIso, isReeferContainer/.test(VP) && /import \{ isReeferContainer \} from '\.\.\/utils\.js'/.test(RM));
} catch (ex) {
  bad += 1; console.log('  ✘ 검사 중 오류 — ' + (ex && ex.stack || ex));
}
console.log(`\n3.60-10 연막검사 ${n - bad}/${n} 통과`);
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e2) { /* 임시 */ }
if (bad) { console.log('✗ 실패 — 배포 금지'); process.exit(1); }
