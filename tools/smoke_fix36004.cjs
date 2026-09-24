// 3.60-04 연막검사 — 판정 한 벌 셋(미르 재료 EDI 보호 · 검수 리스트 20/40 묶음 · 엠티 리퍼는 엠티)이 되살아나면 배포를 막는다.
//   실소스를 esbuild 로 묶어 실제로 돌린다(쓰기 없음).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix36004_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = global.window || { addEventListener() {}, location: { href: '' } };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {} };
const bundle = (entrySrc, name) => {
  const e = path.join(TMP, name + '.mjs'), o = path.join(TMP, name + '.cjs');
  fs.writeFileSync(e, entrySrc);
  execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
  return require(o);
};

try {
  console.log('■ ① 미르 재료 — EDI 가 있는 컨은 EDI 핵심 칸을 리스트가 못 덮는다(utils.EDI_PROTECTED_KEYS 한 벌)');
  const M = bundle(`export { flattenVoyages } from "${ROOT}/src/mir.js";\nexport { EDI_PROTECTED_KEYS } from "${ROOT}/src/utils.js";\n`, 'mir');
  const V = { info: { vsl: 'TEST', voy: '1E' }, discharge: {
    ediContainers: {
      AAAU0000001: { cn: 'AAAU0000001', pol: 'CNSHA', pod: 'KRPTK', iso: '45G1', fe: 'F' },
      AAAU0000002: { cn: 'AAAU0000002', pol: 'CNSHA', pod: 'KRINC', iso: '22G1', fe: 'F' },
      AAAU0000003: { cn: 'AAAU0000003', pol: 'CNSHA', pod: 'KRPTK', iso: '45G1', fe: 'F' },
    },
    records: {
      //  세관 «최종항» CNDAL — EDI 평택·최종항 타항은 정상(평택에 내려 육상으로 더 간다)
      AAAU0000001: { cn: 'AAAU0000001', pod: 'CNDAL', iso: '42HQ', fe: 'E', sl: 'S1' },
      //  검수사가 POD 를 평택으로 확정(pod_pick) — 확정값이 이긴다
      AAAU0000002: { cn: 'AAAU0000002', pod: 'KRPTK', pod_pick: 'list', sl: 'S2' },
      //  검수사가 규격을 확정(iso_pick) — 확정값이 이긴다
      AAAU0000003: { cn: 'AAAU0000003', iso: '42G1', iso_pick: 'list', sl: 'S3' },
      //  리스트에만 있는 컨 — 제 값을 그대로 쓴다
      AAAU0000004: { cn: 'AAAU0000004', pod: 'KRPTK', iso: '22G1', fe: 'F', sl: 'S4' },
    } } };
  const arr = M.flattenVoyages({ TEST_1E: V });
  const g = (cn) => arr.find((c) => c.cn === cn) || {};
  ok('EDI POD KRPTK · 리스트 최종항 CNDAL → pod KRPTK · 평택분', g('AAAU0000001').pod === 'KRPTK' && g('AAAU0000001')._ptk === true, JSON.stringify({ pod: g('AAAU0000001').pod, ptk: g('AAAU0000001')._ptk }));
  ok('같은 컨의 규격·F/E 도 EDI 값(45G1·F) — 리스트가 못 덮는다', g('AAAU0000001').iso === '45G1' && g('AAAU0000001').fe === 'F', `${g('AAAU0000001').iso}/${g('AAAU0000001').fe}`);
  ok('리스트의 다른 칸(실번호)은 그대로 들어온다', g('AAAU0000001').sl === 'S1');
  ok('pod_pick 이 있으면 리스트 POD(KRPTK)가 이긴다 · 평택분', g('AAAU0000002').pod === 'KRPTK' && g('AAAU0000002')._ptk === true, g('AAAU0000002').pod);
  ok('iso_pick 이 있으면 리스트 규격(42G1)이 이긴다', g('AAAU0000003').iso === '42G1', g('AAAU0000003').iso);
  ok('리스트에만 있는 컨은 제 POD·규격을 쓴다', g('AAAU0000004').pod === 'KRPTK' && g('AAAU0000004').iso === '22G1');
  ok('SearchPanel 이 같은 표(utils.EDI_PROTECTED_KEYS)를 쓴다', /const PROTECTED_EDI = EDI_PROTECTED_KEYS;/.test(fs.readFileSync(path.join(ROOT, 'src/components/SearchPanel.jsx'), 'utf8')) && M.EDI_PROTECTED_KEYS.has('pod') && M.EDI_PROTECTED_KEYS.has('iso'));

  console.log('■ ② 검수 리스트 — 20/40 묶음은 규격 라벨로 · 엠티 리퍼는 엠티 묶음(검수사 2026-09-24 «엠티는 엠티이다, 그래도 따로 구분은 한다»)');
  const IL = bundle(`export { generateInspectionListHTML } from "${ROOT}/src/inspectionList.js";\n`, 'il');
  const cs = [
    { cn: 'AAAU1000001', iso: '42G1', fe: 'F', pol: 'KRPTK' },
    { cn: 'AAAU1000002', iso: '42G1', fe: 'F', pol: 'KRPTK' },
    { cn: 'KKFU5000000', iso: 'L5G1', fe: 'F', pol: 'KRPTK' },            // 45피트 — 체크디짓 0(종전엔 20풀로 갔다)
    { cn: 'BBBU2000001', iso: '22G1', fe: 'F', pol: 'KRPTK' },
    { cn: 'CCCU3000001', iso: '22R1', fe: 'E', pol: 'KRPTK' },            // 엠티 리퍼
    { cn: 'CCCU3000002', iso: '22G1', fe: 'E', pol: 'KRPTK' },
    { cn: 'DDDU4000001', iso: '22R1', fe: 'F', pol: 'KRPTK', tmp: '-20' }, // 풀 리퍼 — 특수
    { cn: 'EEEU5000001', iso: '22R1', fe: '', pol: 'KRPTK' },             // F/E 모름 — 종전대로 특수
  ];
  const html = String(IL.generateInspectionListHTML(cs, 'loading', { vsl: 'TEST', voy: '1W' }) || '');
  const numOf = (cn) => {
    const i = html.indexOf(cn); if (i < 0) return null;
    const trS = html.lastIndexOf('<tr', i);
    const m = html.slice(trS, i).match(/<td[^>]*>\s*(\d+)\s*<\/td>/);
    return m ? parseInt(m[1], 10) : null;
  };
  const count = (cn) => html.split(cn).length - 1;
  ok('45피트(L5G1)는 40풀 묶음 셋째(42GP 둘 다음)', numOf('KKFU5000000') === 3, `번호 ${numOf('KKFU5000000')}`);
  ok('40풀 42GP 둘은 1·2', numOf('AAAU1000001') === 1 && numOf('AAAU1000002') === 2, `${numOf('AAAU1000001')}·${numOf('AAAU1000002')}`);
  ok('20풀 22GP 는 1', numOf('BBBU2000001') === 1, `번호 ${numOf('BBBU2000001')}`);
  ok('엠티 리퍼(22R1·E)는 20엠티 묶음 — 22GP 엠티 다음 2번', numOf('CCCU3000002') === 1 && numOf('CCCU3000001') === 2, `${numOf('CCCU3000002')}·${numOf('CCCU3000001')}`);
  ok('엠티 리퍼는 특수 별첨에 안 들어간다(종이에 한 번만)', count('CCCU3000001') === 1, `${count('CCCU3000001')}회`);
  ok('풀 리퍼는 여전히 특수 — 본문과 별첨 두 번', count('DDDU4000001') === 2, `${count('DDDU4000001')}회`);
  ok('F/E 모르는 리퍼는 종전대로 특수(별첨 포함)', count('EEEU5000001') === 2, `${count('EEEU5000001')}회`);
} catch (e) {
  bad += 1; console.log('  ✘ 검사 중 오류 — ' + (e && e.stack || e));
}
console.log(`\n3.60-04 연막검사 ${n - bad}/${n} 통과`);
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 폴더 */ }
if (bad) { console.log('✗ 실패 — 배포 금지'); process.exit(1); }
