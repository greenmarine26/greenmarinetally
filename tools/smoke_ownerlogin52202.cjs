// 5.22-02 연막검사 — 로그인 화면: 검수사 신뢰 기기면 검수사 이름이 보이고, 남의 기기에는 5.20 대로 안 보인다.
//   검수사 2026-11-23 19:37 «제이름을 다른 검수원에게 보이지 말라고 했지 저까지 안보이게 하라고는 안했는데 제컴 제폰에서 이름이 안보입니다.»
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'ownerlogin_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = global.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, location: { href: '' } };
global.localStorage = global.localStorage || { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
try {
  const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
  fs.writeFileSync(e, `export { inspectorsSeenBy } from "${ROOT}/src/workChoice.js";\nexport { isTrustedDeviceFor, getAdminDeviceId } from "${ROOT}/src/adminGuard.js";`);
  execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
  const B = require(o);
  const ins = { a: { name: '김성일', lastActive: 1 }, b: { name: '이형출', lastActive: 2 } };
  ok('① 로그인 화면(보는 사람 모름) · 남의 기기 — 검수사 줄이 빠진다(5.20 그대로)', !Object.values(B.inspectorsSeenBy(ins, null, false)).some((r) => r.name === '김성일'));
  ok('② 로그인 화면 · 검수사 신뢰 기기 — 검수사 줄이 보인다', Object.values(B.inspectorsSeenBy(ins, null, true)).some((r) => r.name === '김성일'));
  ok('③ 다른 검수원이 검수사 기기로 로그인해 있으면 — 검수사 줄은 안 보인다(그 사람 화면)', !Object.values(B.inspectorsSeenBy(ins, '이형출', true)).some((r) => r.name === '김성일'));
  ok('④ 검수사 본인 화면은 다 보인다', Object.values(B.inspectorsSeenBy(ins, '김성일', false)).some((r) => r.name === '김성일'));
  const id = B.getAdminDeviceId();
  ok('⑤ 신뢰 기기 판정 — admin_guard.admins.김성일.devices 에 이 기기가 있으면 참', B.isTrustedDeviceFor({ admins: { 김성일: { devices: { [id]: { label: 'PC' } } } } }, '김성일') === true || B.isTrustedDeviceFor({ locks: { 김성일: { devices: { [id]: { label: 'PC' } } } } }, '김성일') === true);
  const app = rd('src/App.jsx'), lp = rd('src/pages/LoginPage.jsx');
  ok('⑥ App 이 로그인 전에도 소유자 기기 판정을 넘긴다', /inspectorsSeenBy\(inspectors, inspector, ownerDevice\)/.test(app) && /isTrustedDeviceFor\(adminGuard, OWNER_NAME\)/.test(app));
  ok('⑧ 다른 검수원이 로그인해 «검수원 변경»으로 온 화면에는 넣지 않는다', /\(!current \|\| current === OWNER_NAME\) && isTrustedDeviceFor\(guard, OWNER_NAME\)/.test(lp));
  ok('⑦ 로그인 목록 — 검수사 기기면 오늘 처음이어도 검수사 이름을 넣고 맨 앞', /_ownDev && !arr\.some\(i => i\.name === OWNER_NAME\)\) arr\.push\(\{ name: OWNER_NAME \}\)/.test(lp));
} catch (err) { bad += 1; console.log('  ✘ 실행 오류 — ' + (err && err.stack || err)); }
console.log(`\n5.22-02 로그인 화면 검수사 이름 연막검사 — ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
