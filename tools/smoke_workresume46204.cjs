// 작업 보고 «작업 재개» 단추 — 외부 요인 중단(장비고장 등) 뒤에도 마지막 보고가 중단이면 재개 단추가 뜨는지 확인하는 연막검사 (4.62-04)
const fs = require('fs'); const path = require('path');
const out = path.join(require('os').tmpdir(), 'workresume46204_m.cjs');
global.window = global.window || { addEventListener() {}, dispatchEvent() { return true; } }; global.document = global.document || { addEventListener() {}, createElement: () => ({}), documentElement: { style: {} }, body: { style: {} } };
global.localStorage = global.localStorage || { getItem: () => null, setItem() {}, removeItem() {} };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
require('esbuild').buildSync({ entryPoints: [path.join(__dirname, '..', 'src', 'mir.js')], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent', loader: { '.js': 'jsx' }, jsx: 'automatic' });
const M = require(out);
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
//  실측 MCSN 642N 2026-11-01 — 16:46 «장비 고장» 외부 중단 → 17:04 양하 재개(수동 보고)
const NOW = Date.parse('2026-11-01T16:50:00+09:00');
const T = (hm) => Date.parse(`2026-11-01T${hm}:00+09:00`);
const rep = (hm, o) => ({ ts: T(hm), ...o });
const v1 = { info: {}, reports: { a: rep('16:46', { type: 'external_pause', reason: '장비 고장' }) } };
const p = M.workPauseOf(v1, NOW);
ok(p && p.reason === '장비 고장' && p.ko === '작업', '외부 요인 중단(장비 고장) 뒤 — 중단 중으로 읽힌다');
const v2 = { info: {}, reports: { a: rep('16:46', { type: 'external_pause', reason: '장비 고장' }), b: rep('17:04', { type: 'work_status', action: 'discharge_resume', mode: 'discharge', equip: '2호기' }) } };
ok(M.workPauseOf(v2, T('17:05')) === null, '재개 보고를 보내면 중단 중이 아니다(단추가 사라진다)');
const v3 = { info: {}, reports: { a: rep('16:46', { type: 'work_status', action: 'discharge_pause', mode: 'discharge', equip: '2호기', reason: '주간작업 종료' }) } };
const p3 = M.workPauseOf(v3, NOW);
ok(p3 && p3.mode === 'discharge' && p3.ko === '양하', '호기 작업 중단도 같은 판정(양하 · 사유)');
ok(M.workPauseOf({ info: {} }, NOW) === null && M.workPauseOf(null, NOW) === null, '보고가 없으면 null');
//  화면 배선 — 첫 화면 단추가 workPauseOf 한 벌을 쓰고 수동 재개 화면을 호기·작업 종류까지 채워 연다
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'WorkReportModal.jsx'), 'utf8');
ok(/import \{ workPauseOf \} from '\.\.\/mir\.js'/.test(src), '작업 보고 창이 미르와 같은 중단 판정(workPauseOf)을 쓴다');
ok(/data-work-resume="1"/.test(src) && /setManualAction\('resume'\)/.test(src) && /setManualMode\(pausedNow\.mode/.test(src) && /setManualEquip\(selectedEquip\)/.test(src), '재개 단추가 수동 재개 화면을 종류·호기까지 채워 연다');
ok(/pausedNow && \(\s*<button/.test(src), '중단 중일 때만 보인다');
process.exit(fail ? 1 : 0);
