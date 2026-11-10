// 4.85-01 연막검사 — 검수 리스트 순서 20-40-45. 실 OBWH 2787E 보관본의 컨 위에서 45피트(L5·45xx)가 맨 끝 묶음인지 본다.
'use strict';
process.env.TZ = 'Asia/Seoul';
const fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib');
const { execSync } = require('child_process');
const ROOT = path.resolve(process.argv[2] || process.cwd());
let n = 0, bad = 0;
const ok = (name, cond, d = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${d ? ' — ' + String(d).slice(0, 300) : ''}`); } };
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {}, __mirLexicon: {}, __mirLexiconWrite() {} };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 이미 있음 */ }
global.fetch = () => Promise.reject(new Error('no net'));
console.warn = () => {};
(() => {
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : os.tmpdir(), 'fx48501_'));
  const out = path.join(TMP, 'u.cjs');
  execSync(`npx esbuild "${path.join(ROOT, 'tools/smoke_insp48501_entry.js')}" --bundle --platform=node --format=cjs --outfile="${out}" --loader:.js=jsx --jsx=automatic --log-level=error --alias:firebase/app=./tools/stub_fbdb_mem.js --alias:firebase/database=./tools/stub_fbdb_mem.js`, { cwd: ROOT, stdio: 'pipe' });
  const U = require(out);
  const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/insp48501.json'), 'utf8'));
  const rowsOf = (list) => [...U.buildInspectionListDoc(list, 'discharge', {}, [], {}).html.matchAll(/<tr[^>]*>(.*?)<\/tr>/gs)].map((x) => [...x[1].matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/gs)].map((y) => y[1].replace(/<[^>]+>/g, '').trim()));
  //  실 DXQD 2644E 양하 — EDI·선사 L5G1, 세관 45GP (HCCU9020184)
  const dx = rowsOf(fx.DXQD_2644E);
  const i = dx.findIndex((r) => r.includes('HCCU9020184'));
  ok('DXQD HCCU9020184 가 있다', i > 0);
  ok('규격 칸은 세관 글자 45GP', dx[i] && dx[i][3] === '45GP', dx[i]);
  ok('비고에 규격불일치', dx[i] && /규격불일치/.test(dx[i].join('|')), dx[i]);
  //  4.85-02 — 묶음은 수석 마감텔리 규격 칸(tallySizeCol): EDI·선사 L5G1 은 45 칸이라 목록 맨 끝 묶음에 놓인다(규격 글자는 세관 45GP · 비고 규격불일치)
  ok('45 묶음 끝에 놓인다 — 이 줄 뒤에 42HQ 가 없다', dx.slice(i + 1).every((r) => r[3] !== '42HQ'), dx[i + 1]);
  ok('42HQ 줄에는 규격불일치가 없다', dx.filter((r) => r[3] === '42HQ').every((r) => !/규격불일치/.test(r.join('|'))));
  //  실 RZOR R124E — EDI L5G1 + 세관 45HC 는 앱이 같은 규격으로 읽는다(불일치 아님) · 45 묶음 맨 끝
  const rz = rowsOf(fx.RZOR_R124E);
  ok('RZOR 세관 45HC·EDI L5G1 은 불일치로 안 센다', rz.every((r) => !(r[3] === '45HC' && /규격불일치/.test(r.join('|')))));
  //  4.85-02 — 세관 코드표의 45피트 계열(45VH·45TN·45HQ — ISO 9xxx)은 45피트로 읽는다(종전 40피트). 45GP(4500)는 그대로 40 하이큐브.
  ok('세관 45VH·45HQ 는 45피트 L5G1', ['45VH', '45HQ'].every((c) => U.normalizeSpecIso(c) === 'L5G1' && U.isoToLabel(U.normalizeSpecIso(c)) === '45HC'));
  ok('세관 45GP 는 40 하이큐브 그대로', U.isoToLabel(U.normalizeSpecIso('45GP')) === '40HC');
  console.log(`\n4.85-02 규격불일치·마감텔리 묶음 연막검사 — ${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})();
