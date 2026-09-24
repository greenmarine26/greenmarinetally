// 3.60-15 연막검사 — 검수리스트 규격 칸은 세관 적하목록 원문(세관에 신고된 유형)을 그대로 찍고, XRAY 리스트는 제 글자를 그대로 쓴다.
//   검수사 2026-09-25 «규격은 항상 세관에 신고된 유형이 우선입니다» · «검수리스트를 말하는것입니다. 나머지는 선박별 마감 텔리를 기준으로 합니다» ·
//   «XRAY표기는 그대로 표기합니다. 검수리스트와 별개로» · «검수리스트와 XRAY 리스트는 다를수 있다는것입니다».
//   실자료 — OBWH 2749E 세관 적하목록 Excel_20260925042555.xls · EDI OCEAN BLUE WHALE 2749EBAY(UN15).edi · XRAY 목록 검수업체컨테이너목록조회_20260925.xls.
//   실소스를 esbuild 로 묶어 그려진 표를 되읽는다(쓰기 없음).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix36015_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = global.window || { addEventListener() {}, open: () => null, location: { href: '' } };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {} };
const bundle = (entrySrc, name) => {
  const e = path.join(TMP, name + '.mjs'), o = path.join(TMP, name + '.cjs');
  fs.writeFileSync(e, entrySrc);
  execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
  return require(o);
};
//  그려진 검수리스트에서 컨번호마다 규격 칸(넷째 칸)을 읽는다 — smoke_xrayseal 과 같은 칸 순서(순번·컨번호·실번호·규격·F/E·비고)
const specsOf = (html) => {
  const out = {};
  const re = /<tr style="background:[^"]+"[^>]*>([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = re.exec(html))) {
    const cells = (m[1].match(/<td[^>]*>([\s\S]*?)<\/td>/g) || []).map((t) => t.replace(/<[^>]*>/g, '').trim());
    const cn = (m[1].match(/[A-Z]{4}\d{7}/) || [])[0];
    if (cn && !(cn in out)) out[cn] = cells[3];
  }
  return out;
};

try {
  const M = bundle(`export { generateInspectionListHTML, generateXrayListHTML } from "${ROOT}/src/inspectionList.js";\n`, 'il');
  //  PrintHubModal 이 만드는 행 모양(EDI 칸 + records 칸 iso_customs + XRAY 표식) — 값은 OBWH 2749E 실자료 그대로
  const row = (cn, iso, fe, cus, xIso) => Object.assign({ cn, iso, fe, pol: 'CNYNT', pod: 'KRPTK', sl: 'S' + cn.slice(-4) },
    cus ? { iso_customs: cus } : {}, xIso ? { _xray: true, _xrayIso: xIso, _xraySealNo: '' } : {});
  const rows = [
    row('DSYU0066804', '45G1', 'F', '44GP'),
    row('CICU8417358', '45G1', 'F', '44GP', '45GP'),
    row('SPSU6017776', '45G1', 'F', '44GP', '44GP'),
    row('CICU9969048', 'L5G1', 'F', '45HC'),
    row('TGHU4901405', '42V1', 'F', '40HT'),
    row('SPSU2041809', '22G1', 'F', '22GP'),
    Object.assign(row('SEGU9516403', '45R1', 'F', '45RE'), { rf: true, tmp: '-18' }),
    //  적하목록이 아직 안 올라온 컨(원문 없음) — XRAY 목록 글자가 있어도 쓰지 않고 EDI 를 세관꼴로(종전 폴백)
    row('TLLU6838403', '45G1', 'F', '', '44GP'),
  ];
  const sp = specsOf(String(M.generateInspectionListHTML(rows, 'discharge', { vsl: 'OBWH', voy: '2749E' }, []) || ''));

  console.log('■ 검수리스트 규격 칸 = 세관 적하목록 원문(모양을 따지지 않고 적힌 그대로)');
  ok('DSYU0066804 세관 44GP → 44GP (종전 45GP)', sp.DSYU0066804 === '44GP', sp.DSYU0066804);
  ok('CICU8417358 세관 44GP · XRAY 목록 45GP → 44GP (종전 45GP)', sp.CICU8417358 === '44GP', sp.CICU8417358);
  ok('SPSU6017776 세관 44GP · XRAY 목록 44GP → 44GP', sp.SPSU6017776 === '44GP', sp.SPSU6017776);
  ok('CICU9969048 세관 45HC(45피트 · EDI L5G1) → 45HC (종전 L5GP)', sp.CICU9969048 === '45HC', sp.CICU9969048);
  ok('TGHU4901405 세관 40HT(EDI 42V1) → 40HT (종전 42VH)', sp.TGHU4901405 === '40HT', sp.TGHU4901405);
  ok('SPSU2041809 세관 22GP → 22GP', sp.SPSU2041809 === '22GP', sp.SPSU2041809);
  ok('SEGU9516403 세관 45RE → 45RE', sp.SEGU9516403 === '45RE', sp.SEGU9516403);

  console.log('■ 적하목록 원문이 없으면 EDI 를 세관꼴로 — XRAY 목록 글자는 검수리스트에 쓰지 않는다');
  ok('TLLU6838403 원문 없음 · XRAY 목록 44GP · EDI 45G1 → 45GP', sp.TLLU6838403 === '45GP', sp.TLLU6838403);

  console.log('■ XRAY 리스트는 제 글자 그대로 — 검수리스트와 다를 수 있다');
  const xh = String(M.generateXrayListHTML([
    { cn: 'CICU8417358', sl: '', kind: 'X-RAY', iso: '45GP', pos: '' },
    { cn: 'SPSU6017776', sl: '', kind: 'X-RAY', iso: '44GP', pos: '' },
  ], { name: 'OCEAN BLUE WHALE', voy: '2749E' }) || '');
  const xRow = (cn) => { const i = xh.indexOf(cn); return i < 0 ? '' : xh.slice(i, xh.indexOf('</tr>', i)); };
  ok('XRAY 리스트 CICU8417358 → 45GP (검수리스트는 44GP)', />45GP</.test(xRow('CICU8417358')), xRow('CICU8417358').replace(/<[^>]*>/g, ' ').trim().slice(0, 80));
  ok('XRAY 리스트 SPSU6017776 → 44GP', />44GP</.test(xRow('SPSU6017776')));
} catch (e) {
  bad += 1;
  console.log('  ✘ 예외 — ' + (e && e.stack || e));
}
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 폴더 — 못 지워도 검사 결과와 무관 */ }
console.log(`3.60-15 연막검사 ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
