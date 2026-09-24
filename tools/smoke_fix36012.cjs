// 3.60-12 연막검사 — 규격 길이 분류 한 벌(진단 M5): 장비코드(DCHC·DC20·RF40)를 라벨이 못 풀거나, 마감텔리·WORKING REPORT·검수 리스트가 같은 컨을 다른 칸에 세우면 배포를 막는다. 실소스 실행.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix36012_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = global.window || { addEventListener() {}, dispatchEvent() { return true; }, location: { href: '' }, open() { return null; } };
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {} };
try {
  const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
  fs.writeFileSync(e, `export { isoToLabel, isoToCustomsSpec, isReeferIso, isFlatRackIso } from "${ROOT}/src/utils.js";\nexport { tallySizeCol } from "${ROOT}/src/tallyReport.js";\nexport { getSizeKey } from "${ROOT}/src/workingReport.js";\nexport { generateInspectionListHTML } from "${ROOT}/src/inspectionList.js";\n`);
  execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
  const B = require(o);

  console.log('■ 라벨 한 벌이 장비코드를 푼다(3.60-07 loadingEdiExport 약어 풀기와 같은 꼴)');
  const lab = { DC20: '20DC', DC40: '40DC', DCHC: '40HC', DCHE: '40HC', GP40: '40DC', RF20: '20RF', RFHC: '40RH', FR40: '40FR', PL20: '20FR', OT40: '40OT', TK20: '20TK',
    DC2E: '20DC', DC4E: '40DC', RF4E: '40RF', DCHF: '40HC' };   // 파서의 풀/엠티 표식이 붙은 꼴(3.60-12 감사)
  for (const [k, v] of Object.entries(lab)) ok(`${k} → ${v}`, B.isoToLabel(k) === v, B.isoToLabel(k));
  ok('표준 ISO 는 종전 그대로(45G1·22G1·L5G1·436E)', B.isoToLabel('45G1') === '40HC' && B.isoToLabel('22G1') === '20DC' && B.isoToLabel('L5G1') === '45HC' && B.isoToLabel('436E') === '40HC');
  ok('리퍼·FR 한 벌은 종전 그대로(RFHC 리퍼 · FR40 FR · DCHC 아님)', B.isReeferIso('RFHC') && B.isFlatRackIso('FR40') && !B.isReeferIso('DCHC') && !B.isFlatRackIso('DCHC'));
  ok('세관 규격 칸도 채워진다(DCHC → 45GP)', B.isoToCustomsSpec('DCHC') === '45GP', B.isoToCustomsSpec('DCHC'));

  console.log('■ 마감텔리 = WORKING REPORT (같은 컨은 같은 칸)');
  const want = { DCHC: 'HC', DCHE: 'HC', DC20: '20', DC40: '40', DC2E: '20', DC4E: '40', RFHC: 'HC', '40HE': 'HC', '40HR': 'HC', '436E': '40', '4363': '40', '430E': '40', '45G1': 'HC', '22G1': '20', '42G1': '40', L5G1: '45', '9500': '45', '20HC': '20',
    '43DC': 'HC', '43RF': 'HC', '44GP': 'HC', '44R1': 'HC' };   // 글자형 41~44 는 라벨로(연운항 43DC=40HC · 44GP) — 숫자형 43xx 는 정본 40'
  for (const [iso, v] of Object.entries(want)) {
    const t = B.tallySizeCol({ iso }), w = B.getSizeKey({ iso, cn: 'AAAU0000000' }), w9 = B.getSizeKey({ iso, cn: 'AAAU0000009' });
    ok(`${iso} → 텔리 ${v} · 워킹 ${v}(컨번호 끝자리와 무관)`, t === v && w === v && w9 === v, `텔리 ${t} · 워킹 ${w}/${w9}`);
  }
  ok('WORKING REPORT 의 DJS·SZTY 약식은 종전 그대로(D5 → HC · 4HDC → HC)', B.getSizeKey({ iso: 'D5', cn: 'AAAU0000000' }) === 'HC' && B.getSizeKey({ iso: '4HDC', cn: 'AAAU0000000' }) === 'HC');
  ok('규격이 비었을 때만 컨번호 폴백(종전 그대로)', B.getSizeKey({ iso: '', cn: 'AAAU0000009' }) === 'HC' && B.getSizeKey({ iso: '', cn: 'AAAU0000001' }) === '20');

  console.log('■ 검수 리스트 20/40 묶음 — DCHC 는 40 묶음(종전 첫 글자 D 로 20 묶음)');
  const html = String(B.generateInspectionListHTML([
    { cn: 'AAAU1000001', iso: '42G1', fe: 'F', pol: 'KRPTK' },
    { cn: 'KBTU1000002', iso: 'DCHC', fe: 'F', pol: 'KRPTK' },
    { cn: 'BBBU2000001', iso: '22G1', fe: 'F', pol: 'KRPTK' },
  ], 'loading', { vsl: 'TEST', voy: '1W' }) || '');
  const numOf = (cn) => { const i = html.indexOf(cn); if (i < 0) return null; const trS = html.lastIndexOf('<tr', i); const m = html.slice(trS, i).match(/<td[^>]*>\s*(\d+)\s*<\/td>/); return m ? parseInt(m[1], 10) : null; };
  ok('DCHC 는 40풀 묶음 둘째(42GP 다음) · 22GP 는 20풀 첫째', numOf('KBTU1000002') === 2 && numOf('BBBU2000001') === 1, `DCHC ${numOf('KBTU1000002')} · 22GP ${numOf('BBBU2000001')}`);
  const GQ = fs.readFileSync(path.join(ROOT, 'src/guidedQueue.js'), 'utf8'), PE = fs.readFileSync(path.join(ROOT, 'src/components/PositionEditModal.jsx'), 'utf8'), SP = fs.readFileSync(path.join(ROOT, 'src/components/SearchPanel.jsx'), 'utf8');
  ok('20피트 가르기(자동 가이드·위치 수정·자리 선택)가 라벨도 본다 — DC20', /const is20ft = [^\n]*isoToLabel\(c\.iso\)[^\n]*startsWith\('20'\)/.test(GQ) && /const is20 = [^\n]*isoToLabel\(c\?\.iso\)/.test(PE) && /const is20 = [^\n]*isoToLabel\(c\.iso\)/.test(SP));
} catch (ex) {
  bad += 1; console.log('  ✘ 검사 중 오류 — ' + (ex && ex.stack || ex));
}
console.log(`\n3.60-12 연막검사 ${n - bad}/${n} 통과`);
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e2) { /* 임시 */ }
if (bad) { console.log('✗ 실패 — 배포 금지'); process.exit(1); }
