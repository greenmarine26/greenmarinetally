// 4.85 연막검사 — 검수 리스트 순서 20-40-45. 실 OBWH 2787E 보관본의 컨 위에서 45피트(L5·45xx)가 맨 끝 묶음인지 본다.
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
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : os.tmpdir(), 'fx485i_'));
  const stub = './tools/stub_fbdb_mem.js';
  const out = path.join(TMP, 'u.cjs');
  execSync(`npx esbuild "${path.join(ROOT, 'tools/smoke_insp485_entry.js')}" --bundle --platform=node --format=cjs --outfile="${out}" --loader:.js=jsx --jsx=automatic --log-level=error --alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub}`, { cwd: ROOT, stdio: 'inherit' });
  const U = require(out);
  //  실 보관본(chief424_board) — L5(45피트) 컨이 들어 있는 항차를 찾아 그 EDI 컨 전부를 쓴다
  const board = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/chief424_board.json'), 'utf8'));
  let rows = [], vk = '';
  for (const [k, v] of Object.entries(board.voyages || {})) {
    const r = Object.entries((v.discharge && v.discharge.ediContainers) || {}).map(([cn, x]) => ({ cn, iso: (x && x.iso) || '', fe: (x && x.fe) || 'F' }));
    if (r.some((c) => /^L5/.test(c.iso)) && r.length > rows.length) { rows = r; vk = k; }
  }
  const lab = (c) => String(U.isoToLabel(String(c.iso || '').toUpperCase()) || '').slice(0, 2);
  const c45 = rows.filter((c) => lab(c) === '45'), c40 = rows.filter((c) => lab(c) === '40'), c20 = rows.filter((c) => lab(c) === '20');
  ok(`실자료 ${vk} 에 20·40·45 가 모두 있다 (20:${c20.length} 40:${c40.length} 45:${c45.length})`, c20.length > 0 && c40.length > 0 && c45.length > 0);
  const sorted = [...rows].sort(U.inspSortCmp);
  const order = sorted.map(lab).filter((x) => x === '20' || x === '40' || x === '45');
  const firstOf = (v) => order.indexOf(v), lastOf = (v) => order.lastIndexOf(v);
  ok('순서 20 → 40 → 45 (45 는 목록 맨 끝)', lastOf('20') < firstOf('40') && lastOf('40') < firstOf('45'), order.slice(0, 5).join());
  const nums = U.inspNumber(sorted);
  const i45 = sorted.findIndex((c) => lab(c) === '45');
  ok('45 묶음 순번은 1부터 따로 시작한다', nums[i45] === 1, nums[i45]);
  const edges = U.inspEdges(sorted);
  ok('40 → 45 로 넘어가는 줄에 두 줄 경계(gb2)', edges[i45] === 'gb2', edges[i45]);
  console.log(`\n4.85 검수 리스트 순서 연막검사 — ${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})();
