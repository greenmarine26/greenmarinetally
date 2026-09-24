// 3.60-16 연막검사 — 리스트 «45HC» 는 45피트(L5G1) · 같은 컨이 B/L 여러 줄이면 컨 합계 칸(CALWGT)이 무게
//   검수사 2026-09-25 «2. 수정»(45HC) · «3. 승인»(수정안 C-4 CALWGT). 표는 실물 양식을 줄여 옮긴 것이다 —
//   RZOR R104E CNTR_List(NHFU6000257·NHFU9000327 — 선사 덱플랜 «45 HC F» · 세관 적하목록 45HC · 적재 80.2CBM) ·
//   SKR KBTR 2607W (Excel)1.xls(SKHU8724161 2,759+3,300 → CALWGT 6,059 · TCNU5122619 4,101+4 → 4,105) ·
//   MAILBOX 1,492개 전수 — 규격이 바뀐 컨 121대 전부 45HC→L5G1, 무게가 바뀐 컨 31대 전부 B/L 여러 줄(CALWGT = 줄 합계).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix36016_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = global.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, location: { href: '' } };
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {} };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 있음 */ }
(async () => {
  try {
    const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
    fs.writeFileSync(e, `export { parseListExcel, isoToLabel, normalizeSpecIso } from "${ROOT}/src/utils.js";\n`);
    execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
    const B = require(o);
    const XLSX = require(path.join(ROOT, 'node_modules/xlsx'));
    global.window.XLSX = XLSX;
    const parse = async (sheets) => {
      const wb = XLSX.utils.book_new();
      for (const [name, aoa] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
      const u8 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      return ((await B.parseListExcel(u8)) || {}).records || [];
    };
    const by = (recs) => Object.fromEntries(recs.map((r) => [r.cn, r]));

    console.log('■ 리스트 «45HC» 는 45피트 — 세관 별칭표(45HC→L5G1)와 같은 뜻');
    {
      //  RZOR R104E CNTR_List 실물 머리·줄
      const r = by(await parse({ Sheet1: [['No', 'CNTR No.', 'SEAL No.', 'Type', 'REMARKS'],
        ['1', 'CICU9635360', 'H27865', '20RF', 'CY/CY 수화물'], ['2', 'CICU8423767', 'LF087851', '40HC', 'CY/CY'],
        ['114', 'NHFU6000257', '211685', '45HC', 'CY/CY'], ['164', 'NHFU9000327', '000003', '45HC', 'CY/CY'], ['5', 'SPSU2023739', 'NJ145784', '20GP', 'CY/CY']] }));
      ok('RZOR NHFU6000257 «45HC» → L5G1 · 라벨 45HC (종전 45HC 그대로 → 라벨 40HC)', r.NHFU6000257 && r.NHFU6000257.iso === 'L5G1' && B.isoToLabel(r.NHFU6000257.iso) === '45HC', r.NHFU6000257 && `iso=${r.NHFU6000257.iso}`);
      ok('RZOR NHFU9000327 «45HC» → L5G1', r.NHFU9000327 && r.NHFU9000327.iso === 'L5G1');
      ok('같은 파일의 «40HC» 는 종전 그대로 40HC(라벨 40HC)', r.CICU8423767 && B.isoToLabel(r.CICU8423767.iso) === '40HC', r.CICU8423767 && `iso=${r.CICU8423767.iso}`);
      ok('같은 파일의 «20RF»·«20GP» 는 종전 그대로', r.CICU9635360 && B.isoToLabel(r.CICU9635360.iso) === '20RF' && r.SPSU2023739 && B.isoToLabel(r.SPSU2023739.iso) === '20DC');
      ok('세관 별칭표와 같은 답 — normalizeSpecIso(45HC) = L5G1 = 리스트 파서 값', B.normalizeSpecIso('45HC') === 'L5G1' && r.NHFU6000257.iso === B.normalizeSpecIso('45HC'));
      //  45피트 엠티 — F/E 끝글자 맞추기는 라벨이 같을 때만(3.60-13) → L5GE(라벨 45HC)
      const s = by(await parse({ Sheet1: [['NO.', 'TYPE', 'CNTR NO.', 'SEAL', 'G(W)', 'T(W)', 'DEL', 'T/S', 'SOC/E/F', 'DG/RF/LWH', 'B/L NO.'],
        ['47', '45HC', 'CAIU5884478', null, '0', '4700', 'QINGDAO', null, 'EMPTY', null, 'SITPTTA012982E']] }));
      ok('SITC «45HC» 엠티 → 45피트 엠티(라벨 45HC · F/E E)', s.CAIU5884478 && B.isoToLabel(s.CAIU5884478.iso) === '45HC' && s.CAIU5884478.fe === 'E', s.CAIU5884478 && `iso=${s.CAIU5884478.iso} fe=${s.CAIU5884478.fe}`);
      //  ISO 진짜 코드·다른 45xx 관례 표기는 종전 그대로(45GP·45RE = 40피트 하이큐브)
      const t = by(await parse({ Sheet1: [['CNTR NO', 'TYPE', 'F/E'], ['TCNU1234560', '45GP', 'F'], ['TCNU1234561', '45RE', 'F'], ['TCNU1234562', 'L5G1', 'F'], ['TCNU1234563', '45G1', 'F']] }));
      ok('«45GP»·«45RE»·«45G1» 은 종전 그대로 40피트 하이큐브(라벨 40HC·40RH·40HC)', B.isoToLabel(t.TCNU1234560.iso) === '40HC' && B.isoToLabel(t.TCNU1234561.iso) === '40RH' && B.isoToLabel(t.TCNU1234563.iso) === '40HC');
      ok('«L5G1» 은 종전 그대로 45HC', B.isoToLabel(t.TCNU1234562.iso) === '45HC');
    }

    console.log('■ B/L 여러 줄 컨의 무게 = 컨 합계 칸(CALWGT)');
    {
      const head = ['VSL', 'VYG', 'RCV', 'LWHARF', 'POL', 'DISCHARGE', 'DISCHARGENM', 'DLV', 'ETD', 'BLNO', 'CNTNO', 'SEAL', 'TYSZ', 'WGT', 'TARE_WGT', 'HCVGM', 'FE', 'TERM', 'SOC', 'LINE_SOC', 'CNTR_LOC', 'GATA_BUDU', 'DG', 'RF', 'AWK', 'RNK', 'CALWGT', 'HCTYPE', 'TS', 'TSPORT', 'PRINTPOD', 'PRINTPODNM', 'PRINTETD', 'PRINTTS', 'PRINTTSNM', 'CAL_TARE_WGT', 'VGM', 'HCVGMUNIT', 'HCVGMTYPE', 'HCVGMSIGN', 'HCVGMCERT', 'PART', 'EXPORT_GB', 'GATEINCD', 'GATEINNM', 'DIRECTBK', 'TCNT', 'TD', 'TL'];
      const row = (bl, cn, wgt, tare, rnk, cal, part) => ['KBTR', '2607W', null, 'PTK02', 'KRPTK', 'VNHPH', 'HAIPHONG, VIETNAM', 'VNHPH', '20260910', bl, cn, '280943', '45GP', wgt, tare, null, 'Full', 'CY/CY', null, null, 'Anywhere', null, null, null, null, rnk, cal, '45GP', null, null, 'VNHPH', 'HAIPHONG, VIETNAM', '2026-09-10', null, null, '0', null, 'KGS', null, null, null, part, 'PARTIAL', '1', '반입', 'N'];
      const w = by(await parse({ Sheet1: [head,
        ['KBTR', '2607W', null, 'PTK02', 'KRPTK', 'VNHPH', 'HAIPHONG, VIETNAM', 'VNHPH', '20260826', 'SNKO022260801285', 'BEAU2347758', '234907', '22GP', '24960', '27160', '27,170', 'Full', 'CY/CY', null, null, 'Anywhere', null, null, null, null, '1', '24960', '22GP', 'T/S', null, 'VNHPH', 'HAIPHONG, VIETNAM', '2026-08-26', null, null, '27160', null, 'KGS', '합산계산', 'LYNN', null, null, 'Normal', '1', '반입', 'N'],
        row('SNKO010260903993', 'SKHU8724161', '2759', '6759', '1', '6059', null), row('SNKO010260903994', 'SKHU8724161', '3300', '7300', '2', '6059', 'PART'),
        row('SNKO010260800305', 'TCNU5122619', '4101', '8101', '1', '4105', null), row('SNKO010260903991', 'TCNU5122619', '4', '4004', '2', '4105', 'PART'),
        //  STMJ 2656W BMOU5251741 — 첫 줄 WGT 26(kg) 을 종전엔 톤으로 읽어 26,000 이 됐다. CALWGT 18,137 = 26+4,292+13,819
        row('SNKO010260905708', 'BMOU5251741', '26', '4026', '2', '18137', 'PART'), row('SNKO010260905709', 'BMOU5251741', '4292', '8292', '3', '18137', 'PART'), row('SNKO010260904309', 'BMOU5251741', '13819', '17819', '1', '18137', null)] }));
      ok('SKHU8724161 (2,759 + 3,300) → 6,059 (종전 2,759)', w.SKHU8724161 && w.SKHU8724161.wt === 6059, w.SKHU8724161 && `wt=${w.SKHU8724161.wt}`);
      ok('TCNU5122619 (4,101 + 4) → 4,105 (종전 4,101)', w.TCNU5122619 && w.TCNU5122619.wt === 4105, w.TCNU5122619 && `wt=${w.TCNU5122619.wt}`);
      ok('BMOU5251741 첫 줄 26kg → 컨 합계 18,137 (종전 26,000 — 톤 오독)', w.BMOU5251741 && w.BMOU5251741.wt === 18137, w.BMOU5251741 && `wt=${w.BMOU5251741.wt}`);
      ok('한 줄짜리 컨 BEAU2347758 은 그대로 24,960 (CALWGT = WGT)', w.BEAU2347758 && w.BEAU2347758.wt === 24960);
      ok('컨은 여전히 한 줄씩(중복 없음) — 4대', Object.keys(w).length === 4);
      //  CALWGT 칸이 없는 리스트는 종전 그대로 WGT
      const v = by(await parse({ Sheet1: [['CNTR NO', 'TYPE', 'F/E', 'WEIGHT'], ['TCNU1234560', '22G1', 'F', '12,345']] }));
      ok('CALWGT 칸이 없으면 종전 그대로 무게 칸', v.TCNU1234560 && v.TCNU1234560.wt === 12345);
      //  CALWGT 가 비었거나 0 이면 종전 그대로 WGT
      const z = by(await parse({ Sheet1: [head, row('SNKO010260903993', 'SKHU8724162', '2759', '6759', '1', '', null), row('SNKO010260903993', 'SKHU8724163', '2759', '6759', '1', '0', null)] }));
      ok('CALWGT 빈칸·0 이면 WGT 2,759', z.SKHU8724162 && z.SKHU8724162.wt === 2759 && z.SKHU8724163 && z.SKHU8724163.wt === 2759);
    }

    console.log(`\n3.60-16 연막검사: ${n - bad}/${n}`);
    process.exit(bad ? 1 : 0);
  } catch (err) {
    console.error('연막검사 자체 실패:', err && err.stack || err);
    process.exit(1);
  }
})();
