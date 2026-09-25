// 3.60-22 연막검사 — ASC 규격 칸 «DC4H»·«RF4H»(종류2+크기1+H) 판독(DJCT 0219E 셰코우 ASC 실측: 하이큐 353대가 iso '' 로 떨어져 마감텔리 20' 칸으로 세임).
//   픽스처 tools/fixtures/asc_djct0219e_shk.asc 는 그 파일의 머리 2줄 + DC20·DC4H·RF20·RF4H 각 2줄.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix36022_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, location: { href: '' } };
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, createElement() { return { style: {}, setAttribute() {}, appendChild() {} }; }, body: { appendChild() {}, removeChild() {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
(async () => {
  try {
    fs.writeFileSync(path.join(TMP, 'e.mjs'), `export { parseAscFile } from "${ROOT}/src/utils.js";\nexport { tallySizeCol } from "${ROOT}/src/tallyReport.js";\n`);
    execSync(`npx esbuild "${path.join(TMP, 'e.mjs')}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${path.join(TMP, 'b.cjs')}"`, { cwd: ROOT, stdio: 'pipe' });
    const U = require(path.join(TMP, 'b.cjs'));
    const text = fs.readFileSync(path.join(ROOT, 'tools/fixtures/asc_djct0219e_shk.asc'), 'latin1');
    const r = U.parseAscFile(text);
    const cs = (r && r.containers) || [];
    ok('픽스처 8대 파싱', cs.length === 8, String(cs.length));
    const by = (tp) => cs.filter((c) => c.tp === tp);
    ok('DC4H 2대 → iso 45GP', by('DC4H').length === 2 && by('DC4H').every((c) => c.iso === '45GP'), JSON.stringify(by('DC4H').map((c) => [c.cn, c.iso])));
    ok('RF4H 2대 → iso 45R1', by('RF4H').length === 2 && by('RF4H').every((c) => c.iso === '45R1'), JSON.stringify(by('RF4H').map((c) => [c.cn, c.iso])));
    ok('DC20 2대 → 22GP 그대로(회귀 없음)', by('DC20').length === 2 && by('DC20').every((c) => c.iso === '22GP'));
    ok('RF20 2대 → 22R5 그대로', by('RF20').length === 2 && by('RF20').every((c) => c.iso === '22R5'));
    ok('무게가 5자리 칸에서 읽힘', cs.every((c) => c.wt > 0), JSON.stringify(cs.map((c) => c.wt)));
    ok('F/E 가 규격 뒤 글자', cs.every((c) => c.fe === 'F' || c.fe === 'E'));
    ok('마감텔리 칸: DC4H 는 HC', by('DC4H').every((c) => U.tallySizeCol(c) === 'HC'));
    ok('mSpec·m1·m4 우선순위 유지(DCHC 는 m4)', (() => { const t = text.replace(/DC4H/g, 'DCHC'); const x = U.parseAscFile(t).containers.filter((c) => c.tp === 'DCHC'); return x.length === 2 && x.every((c) => c.iso === '45GP'); })());
    ok('APP_VERSION 3.60-22 이상', /3\.60-2[2-9]|3\.6[1-9]|3\.[7-9]/.test(fs.readFileSync(path.join(ROOT, 'src/utils.js'), 'utf8').match(/APP_VERSION = '([^']*)'/)[1]));
  } catch (e) { bad += 1; console.log('  ✘ 예외 ' + (e && e.stack || e)); }
  console.log(`\n3.60-22 연막검사: ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})();
