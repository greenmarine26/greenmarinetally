// 함께 열리는 커버(XTPG 18번 홀드 작업 → 22번 커버도 열림) 연막검사 — 실측 XTPG 547E 로 시프팅 8대(배정표 이적 16모브)가 나오는지 확인한다 (4.62-06)
const fs = require('fs'); const path = require('path');
global.window = global.window || { addEventListener() {}, dispatchEvent() { return true } };
global.document = global.document || { addEventListener() {}, createElement: () => ({}), documentElement: { style: {} }, body: { style: {} } };
global.localStorage = global.localStorage || { getItem: () => null, setItem() {}, removeItem() {} };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
const out = path.join(require('os').tmpdir(), 'coverlink46206_u.cjs');
require('esbuild').buildSync({ entryPoints: [path.join(__dirname, '..', 'src', 'utils.js')], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent', loader: { '.js': 'jsx' }, jsx: 'automatic' });
const U = require(out);
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'xtpg547e_coverlink.json'), 'utf8'));
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const mk = (vsl) => ({ info: { ...fx.info, vsl }, discharge: JSON.parse(JSON.stringify(fx.discharge)) });
const p = U.predictShiftingFromVoyage(mk('XTPG'), fx.dict);
const pos = Object.values(p).map((x) => x.pos).sort();
ok(Object.keys(p).length === fx.info.berthShift / 2, `XTPG 547E — 시프팅 ${Object.keys(p).length}대 = 배정표 이적 ${fx.info.berthShift}모브(${fx.info.berthShift / 2}대)`);
ok(pos.length === 8 && pos.every((x) => /^22-0[1-8]-82$/.test(x)), '22번 데크 82단 01~08열 8대(인천에서 실린 CNTAG 통과화물)', pos.join(' '));
const q = U.predictShiftingFromVoyage(mk('ZZZZ'), fx.dict);
ok(Object.keys(q).length === 0, '연결 규칙이 없는 배(코드 다름)는 같은 자료로 0대 — 22번 커버를 따로 보면 안 나온다');
ok(U.COVER_LINKS && Object.keys(U.COVER_LINKS).join() === 'XTPG' && U.COVER_LINKS.XTPG[18].join() === '22', '연결 규칙은 XTPG 18→22 하나뿐(다른 배 판정 불변)');
const h = U.hatchOpenableFor(mk('XTPG'), 'discharge', 18, fx.dict), h0 = U.hatchOpenableFor(mk('ZZZZ'), 'discharge', 18, fx.dict);
const nb = (x) => (x && x.panels && x.panels[0] ? x.panels[0].blockers.length : -1);
ok(h && h0 && nb(h) === nb(h0) + 8, `18번 커버 열기 — 22번 데크 8대가 막는 화물로 더해진다(막힘 ${nb(h0)} → ${nb(h)})`);
process.exit(fail ? 1 : 0);
