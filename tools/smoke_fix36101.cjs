// 3.61-01 연막검사 — RZOR 선사 리스트 리퍼 «40RE»·«40RF» 는 높이를 말하지 않는다(utils.isoTriad). 픽스처는 RZOR_R105E 양하 실데이터 + R103E 건화물 1대.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix36101_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, location: { href: '' } };
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, createElement() { return { style: {}, setAttribute() {}, appendChild() {} }; }, body: { appendChild() {}, removeChild() {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
(async () => {
  try {
    fs.writeFileSync(path.join(TMP, 'e.mjs'), `export { isoTriad, isoConflictOf } from "${ROOT}/src/utils.js";\n`);
    execSync(`npx esbuild "${path.join(TMP, 'e.mjs')}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${path.join(TMP, 'b.cjs')}"`, { cwd: ROOT, stdio: 'pipe' });
    const U = require(path.join(TMP, 'b.cjs'));
    const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/rzor_reefer_36101.json'), 'utf8'));
    const cns = Object.keys(FX.edi);
    const conf = (cn, lr) => U.isoConflictOf(FX.edi[cn].iso_edi, lr || FX.rec[cn]);
    const re40 = cns.filter((cn) => FX.rec[cn].iso_carrier === '40RE');
    ok('픽스처 — RZOR 선사 40RE 20대', re40.length === 20, String(re40.length));
    ok('RZOR 40RE 20대 — 규격 알림 0', re40.every((cn) => !conf(cn)), JSON.stringify(re40.filter((cn) => conf(cn))));
    ok('RZOR 40RE 20대 — 대조는 EDI·세관 둘(선사 칸 빠짐)', re40.every((cn) => { const t = U.isoTriad(FX.edi[cn].iso_edi, FX.rec[cn]); return t.length === 2 && t.every((x) => x.k !== 'carrier'); }));
    const cimu = ['CIMU2987306', 'CIMU2987311', 'CIMU2987327'];
    ok('특수제작컨 CIMU 3대(선사 40RF · EDI 40RF · 세관 42RF) — 알림 0 그대로', cimu.every((cn) => !conf(cn)));
    ok('표식 없는 다른 배의 같은 값(EDI 45R1 · 선사 40RE · 세관 45RE) — 알림 그대로', !!U.isoConflictOf('45R1', { iso_carrier: '40RE', iso_customs: '45RE' }));
    ok('RZOR 이라도 EDI·세관이 20피트 리퍼면 선사 40RE 와 다툼 — 알림 그대로', !!U.isoConflictOf('22R1', { _rz: true, iso_carrier: '40RE', iso_customs: '22RE' }));
    ok('RZOR 이라도 EDI·세관이 건화물(40HC)이면 선사 40RE 와 다툼 — 알림 그대로', !!U.isoConflictOf('45G1', { _rz: true, iso_carrier: '40RE', iso_customs: '45GP' }));
    ok('RZOR EDI 45R1 · 세관 42RF(선사 40RE) — EDI·세관끼리 다툼은 그대로', (() => { const s = U.isoConflictOf('45R1', { _rz: true, iso_carrier: '40RE', iso_customs: '42RF' }); return !!s && s.length === 2 && s.every((x) => x.k !== 'carrier'); })());
    ok('R103E 건화물 TGHU4437784(EDI 40GP · 선사 40HC · 세관 42GP) — 알림 그대로', !!conf('TGHU4437784'));
    ok('특수제작컨 CIMU — 선사 칸이 빠지고 EDI·세관 둘로 대조', cimu.every((cn) => U.isoTriad(FX.edi[cn].iso_edi, FX.rec[cn]).length === 2));
    //  감사 C-1: 항차 화면은 EDI 컨에 리스트 칸을 **허용 목록(ALLOWED_LIST_FIELDS)** 으로만 얹는다 — `_rz` 가 빠지면 컨 상세만 알림이 남는다.
    const vp = fs.readFileSync(path.join(ROOT, 'src/pages/VoyagePage.jsx'), 'utf8');
    const m = vp.match(/const ALLOWED_LIST_FIELDS = new Set\(\[([\s\S]*?)\]\);/);
    const allowed = new Set(m ? [...m[1].replace(/\/\/[^\n]*/g, '').matchAll(/'([^']+)'/g)].map((x) => x[1]) : []);
    ok('VoyagePage 허용 목록에 _rz 있음', allowed.has('_rz'));
    const mergedOf = (cn) => { const c = { ...FX.edi[cn] }; for (const [k, v] of Object.entries(FX.rec[cn])) if (allowed.has(k)) c[k] = v; return c; };
    ok('항차 화면 병합 뒤(컨 상세 경로) RZOR 40RE 20대도 알림 0', re40.every((cn) => { const c = mergedOf(cn); return !U.isoConflictOf(c.iso_edi || '', c); }), JSON.stringify(re40.filter((cn) => { const c = mergedOf(cn); return U.isoConflictOf(c.iso_edi || '', c); })));
    ok('다른 선사 표기(40RH)는 손대지 않음', U.isoTriad('45R1', { _rz: true, iso_carrier: '40RH', iso_customs: '45RE' }).length === 3);
    ok('APP_VERSION 3.61-01 이상', /3\.61-(0[1-9]|[1-9]\d)|3\.6[2-9]|3\.[7-9]/.test(fs.readFileSync(path.join(ROOT, 'src/utils.js'), 'utf8').match(/APP_VERSION = '([^']*)'/)[1]));
  } catch (e) { bad += 1; console.log('  ✘ 예외 ' + (e && e.stack || e)); }
  console.log(`\n3.61-01 연막검사: ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})();
