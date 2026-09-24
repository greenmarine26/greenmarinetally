// 3.60-05 연막검사 — 미르 파서·답(전체 진단 T4·M19·M20·M21·M23·M27)이 되살아나면 배포를 막는다. 실소스를 묶어 실제로 돌린다.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix36005_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = global.window || { addEventListener() {}, dispatchEvent() { return true; }, location: { href: '' } };
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {} };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 있음 */ }
const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
fs.writeFileSync(e, `export { parseNaturalQuery } from "${ROOT}/src/nlSearch.js";\nexport { parseViewCommand } from "${ROOT}/src/planCommand.js";\nexport { answerOneRaw } from "${ROOT}/src/mir.js";\n`);
execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
const B = require(o);
const P = (q) => B.parseNaturalQuery(q) || {};

try {
  console.log('■ T4 — 숫자 오인(단위·크기 결합어·날짜·전화·글자 붙은 항차번호는 끝네자리가 아니다)');
  const noDigit = ['20엠티 몇대', '20풀 몇대', '40엠티 몇대', '40하이큐브 몇대', '16시까지 몇 대 했어', '24일 몇 대 했어', '25톤 몇 대', '10개 남았어', '2026-09-24 작업', '010-1234-5678', 'R104W 카고플랜', '2643W 양하 몇대'];
  for (const q of noDigit) ok(`«${q}» → 끝네자리 없음`, !P(q).digits, `digits=${P(q).digits}`);
  ok('«20엠티 몇대» → 20피트 · 엠티', P('20엠티 몇대').size === '20' && P('20엠티 몇대').fe === 'E', JSON.stringify({ s: P('20엠티 몇대').size, fe: P('20엠티 몇대').fe }));
  ok('«40풀 몇대» → 40피트 · 풀', P('40풀 몇대').size === '40' && P('40풀 몇대').fe === 'F');
  ok('«20피트 몇대야» → 20피트(종전 유지)', P('20피트 몇대야').size === '20' && !P('20피트 몇대야').digits);
  const keep = [['5445', '5445'], ['5445 어디야', '5445'], ['끝자리 5445 실번호', '5445'], ['0230 엠티야', '0230'], ['MCSC 633N 0320', '0320'], ['SKLU1000326', '0326'], ['0230 시프팅', '0230'], ['3426 대기', '3426'], ['5445 대상이야', '5445'], ['5445 몇 대야', '5445'], ['3426 온도 대기', '3426']];
  for (const [q, d] of keep) ok(`«${q}» → 끝네자리 ${d}(종전 유지)`, P(q).digits === d, `digits=${P(q).digits}`);
  ok('«R104W 카고플랜» → 카고플랜 명령', !!B.parseViewCommand('R104W 카고플랜'), JSON.stringify(B.parseViewCommand('R104W 카고플랜')));

  console.log('■ M27 — 현장말 «디지»(DG)·«플랫»(FR)');
  ok('«디지 몇 대야» → DG', P('디지 몇 대야').type === 'dg');
  ok('«디지털 온도계» → DG 아님', P('디지털 온도계').type !== 'dg');
  ok('«플랫 몇 대» → FR', P('플랫 몇 대').type === 'fr');

  console.log('■ M21 — «배 몇 시에 나가» 는 출항 · 출항은 도선 예보 먼저');
  ok('«배 몇 시에 나가» → 출항 질문(기상 아님)', P('배 몇 시에 나가').schedQuery && !P('배 몇 시에 나가').wakeQuery, JSON.stringify({ s: P('배 몇 시에 나가').schedQuery, w: P('배 몇 시에 나가').wakeQuery }));
  ok('«몇 시에 나가야 해» → 기상(종전 유지)', !!P('몇 시에 나가야 해').wakeQuery);
  const base = { vsl: 'TEST', vslFull: 'TEST SHIP', info: { vsl: 'TEST', voy: '1E' }, voyage: { info: { vsl: 'TEST', voy: '1E' } }, voyageKey: 'TEST_1E', mode: 'discharge', app: 'tally', countFallback: true };
  const _d = new Date(Date.now() + 5 * 3600000); const _p2 = (x) => String(x).padStart(2, '0');
  const dep = `${_d.getFullYear()}-${_p2(_d.getMonth() + 1)}-${_p2(_d.getDate())} ${_p2(_d.getHours())}:${_p2(_d.getMinutes())}`;
  const a1 = String(B.answerOneRaw('출항 언제', { ...base, containers: [], pilotForecast: { TEST: { nextDep: dep } }, matchPortMis: () => null, portMisData: {} }) || '');
  ok('도선 예보만 있으면 «출항 예정 … (도선 예보)»', a1.includes('출항 예정 ' + dep.slice(5)) && /도선 예보/.test(a1), a1.slice(0, 80));
  const a1b = String(B.answerOneRaw('출항 언제', { ...base, containers: [], pilotForecast: { TEST: { nextDep: '2020-01-01 10:00' } }, matchPortMis: () => null, portMisData: {} }) || '');
  ok('지나간 도선 예보(2020년)는 쓰지 않는다', !/01-01 10:00/.test(a1b), a1b.slice(0, 80));

  console.log('■ M20 — 자료가 아직 없는 항차는 «못 배웠어요» 가 아니라 «자료가 아직 안 왔어요»');
  const a2 = String(B.answerOneRaw('리퍼 몇대야', { ...base, containers: [] }) || '');
  ok('컨 0대 항차 «리퍼 몇대야» → 자료 미착 안내', /자료\(EDI·리스트\)가 아직 안 왔어요/.test(a2), a2.slice(0, 80));

  console.log('■ M19 — 조회 말은 경고 설명에 안 가로채인다');
  const cs = [{ cn: 'ABCU1235445', _mode: 'discharge', mode: 'discharge', _ptk: true, sl: 'SEAL77', bay: '10', row: '02', tier: '04', iso: '22G1', fe: 'F', pod: 'KRPTK', _xray: true, isXray: true }];
  const alerts = [{ code: 'xray_no_location', level: 'info', msg: 'X-RAY 6대 중 1대가 EDI 에 없음' }];
  const a3 = String(B.answerOneRaw('XRAY 대상 위치', { ...base, containers: cs, diagAlerts: alerts }) || '');
  ok('«XRAY 대상 위치» → 경고문이 아니다', !/EDI 에 없음/.test(a3), a3.slice(0, 80));
  const a4 = String(B.answerOneRaw('X-RAY 6대 중 1대가 EDI 에 없음 이거 뭐야', { ...base, containers: cs, diagAlerts: alerts }) || '');
  ok('경고 문구를 그대로 물으면 종전대로 경고 설명', /EDI 에 없음/.test(a4), a4.slice(0, 80));

  console.log('■ M23 — 떠 있는 미르·콘앱에서 끝네자리만 물으면 실번호·X-RAY·자리까지');
  const a5 = String(B.answerOneRaw('5445', { ...base, containers: cs }) || '');
  ok('«5445» → 컨번호·실번호를 말한다(대수만 말하지 않는다)', /ABCU1235445/.test(a5) && /SEAL77/.test(a5), a5.slice(0, 120));
} catch (ex) {
  bad += 1; console.log('  ✘ 검사 중 오류 — ' + (ex && ex.stack || ex));
}
console.log(`\n3.60-05 연막검사 ${n - bad}/${n} 통과`);
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e2) { /* 임시 */ }
if (bad) { console.log('✗ 실패 — 배포 금지'); process.exit(1); }
