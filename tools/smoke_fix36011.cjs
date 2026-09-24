// 3.60-11 연막검사 — 베이플랜 칸 규격 글자(진단 M10) · 목적지·적재항 3자 코드(M9) · 검수 리스트 리퍼 안전 한 줄이 되살아나면 배포를 막는다. 실소스 실행.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix36011_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = global.window || { addEventListener() {}, dispatchEvent() { return true; }, location: { href: '' } };
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {} };
try {
  const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
  fs.writeFileSync(e, `export { bayCellTypeLabel, legendLiveOf } from "${ROOT}/src/utils.js";\nexport { port3 } from "${ROOT}/src/tallyReport.js";\nexport { generateInspectionListHTML } from "${ROOT}/src/inspectionList.js";\n`);
  execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
  const B = require(o);

  console.log('■ M10 — 베이플랜 칸 규격 글자: tp «GP/HC» 가 특수 규격을 덮지 않는다');
  const L = (iso, tp) => B.bayCellTypeLabel({ iso, tp });
  ok("45R1 · tp «40'HC» → «40'RH»", L('45R1', "40'HC") === "40'RH", L('45R1', "40'HC"));
  ok("4530 · tp «40'HC» → «40'RH»", L('4530', "40'HC") === "40'RH", L('4530', "40'HC"));
  ok("22R1 · tp «20'GP» → «20'RF»", L('22R1', "20'GP") === "20'RF", L('22R1', "20'GP"));
  ok("42P1 · tp «40'GP» → «40'FR»", L('42P1', "40'GP") === "40'FR", L('42P1', "40'GP"));
  ok("22TN · tp «20'GP» → «20'TK»", L('22TN', "20'GP") === "20'TK", L('22TN', "20'GP"));
  ok("일반 22G1 · tp «20'GP» → 종전 그대로 «20'GP»", L('22G1', "20'GP") === "20'GP", L('22G1', "20'GP"));
  ok('tp 가 이미 종류를 알면 그대로(ASC «RF40» · «40HR»)', L('45R1', 'RF40') === 'RF40' && L('40HR', '40HR') === '40HR', `${L('45R1', 'RF40')} · ${L('40HR', '40HR')}`);
  ok('tp 없으면 종전 ISO 글자(45R1 → RFHC)', L('45R1', '') === 'RFHC', L('45R1', ''));
  ok("플랫랙 4583 · 파서 tp «40'RF» → «40'FR»(감사 지적)", L('4583', "40'RF") === "40'FR", L('4583', "40'RF"));
  ok("한 벌이 FR 이라 하는 4363 · tp «40'GP» → «40'FR»", L('4363', "40'GP") === "40'FR", L('4363', "40'GP"));
  ok('BayPlan 이 이 한 벌을 부른다', /const typeLabel = bayCellTypeLabel\(c\);/.test(fs.readFileSync(path.join(ROOT, 'src/components/BayPlan.jsx'), 'utf8')));

  console.log('■ M9 — 3자 코드는 자르기 전에 정규화(색 키와 같은 한 벌)');
  ok('마감텔리 port3 — «PTK02»→PTK · «CNSHA»→SHA · «KRPTK»→PTK', B.port3('PTK02') === 'PTK' && B.port3('CNSHA') === 'SHA' && B.port3('KRPTK') === 'PTK', `${B.port3('PTK02')}·${B.port3('CNSHA')}·${B.port3('KRPTK')}`);
  const nt = B.port3('NANTONG');
  ok('마감텔리 port3 — «NANTONG» → NTG(칸 색과 같은 글자)', nt === 'NTG', nt);
  const rows = [
    { cn: 'AAAU0000001', pol: 'KRPTK', pod: 'NANTONG', iso: '22G1', fe: 'F', bay: '01', row: '02', tier: '04' },
    { cn: 'AAAU0000002', pol: 'KRPTK', pod: 'PTK02', iso: '22G1', fe: 'F', bay: '01', row: '04', tier: '04' },
    { cn: 'AAAU0000003', pol: 'KRPTK', pod: 'CNSHA', iso: '22G1', fe: 'F', bay: '01', row: '06', tier: '04' },
    { cn: 'AAAU0000004', pol: 'KRPTK', pod: 'KRPYT', iso: '22G1', fe: 'F', bay: '01', row: '08', tier: '04' },   // 평택 다른 표기 — 칸 색처럼 별첨에서도 뺀다
  ];
  const lg = B.legendLiveOf(rows, 'loading', {}) || {};
  const podKeys = JSON.stringify(lg.pods || lg);
  ok('카고플랜 별첨(legendLiveOf) 목적지 표 — NTG·SHA 가 서고 «NTO»·«K02»·PTK 는 없다', /"NTG"/.test(podKeys) && /"SHA"/.test(podKeys) && !/"NTO"|"K02"|"PTK"|"PYT"/.test(podKeys), podKeys.slice(0, 160));
  const PCP = fs.readFileSync(path.join(ROOT, 'src/components/PrintableCargoPlanV2.jsx'), 'utf8');
  ok('인쇄 카고플랜 별첨도 normPortCode 로 정규화한 뒤 자른다', /const podRaw = normPortCode\(c\.pod\);/.test(PCP));

  console.log('■ 검수 리스트 — 한 벌이 리퍼라 하는 규격은 리퍼(rf 표식이 없어도)');
  const html = String(B.generateInspectionListHTML([
    { cn: 'LRFU0000001', iso: 'L5R1', fe: 'F', pol: 'KRPTK' },
    { cn: 'DRYU0000002', iso: 'L5G1', fe: 'F', pol: 'KRPTK' },
  ], 'loading', { vsl: 'TEST', voy: '1W' }) || '');
  const cnt = (cn) => html.split(cn).length - 1;
  ok('L5R1(rf 없음)은 특수(본문+별첨 두 번)', cnt('LRFU0000001') === 2, `${cnt('LRFU0000001')}회`);
  ok('L5G1 은 일반(한 번)', cnt('DRYU0000002') === 1, `${cnt('DRYU0000002')}회`);
} catch (ex) {
  bad += 1; console.log('  ✘ 검사 중 오류 — ' + (ex && ex.stack || ex));
}
console.log(`\n3.60-11 연막검사 ${n - bad}/${n} 통과`);
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e2) { /* 임시 */ }
if (bad) { console.log('✗ 실패 — 배포 금지'); process.exit(1); }
