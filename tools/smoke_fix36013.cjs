// 3.60-13 연막검사 — 만능 리스트 파서(규격·F/E·POD 를 어디에 적혀 있든 읽는다)와 수정안 A(EDI 칸이 비었을 때만 리스트가 채운다)가 되살아나면 배포를 막는다. 실소스 실행.
//
//  왜 있는가 — 검수사 2026-09-24 «리스트 파서는 만능 파서가 되어야 합니다. 규격이 어디에 있든 읽을수 있어야 합니다.»
//    MAILBOX 실리스트 1,554개 전수 조사에서 원본엔 있는데 파서가 비운 칸을 양식별로 찾았다(동진 «Type\n/Size»·Cargo Type P,
//    KMTC SZ+TY, 옛 ISO 숫자 4510, 장비코드 DCHC, 머리말 POD, 헤더 없는 야드 EMPTY LIST, 제목줄 머리 …).
//    각 항목의 표는 실제 양식을 줄여 옮긴 것이다(값은 실측 그대로 — 컨번호·실번호도 실물).
//  ⚠ 원칙 두 가지를 같이 잰다 — ① 1차 규칙으로 읽던 칸은 그대로 ② 파일에 적힌 값만 쓰고 뜻이 갈리는 코드는 비운다(추정 금지).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix36013_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = global.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, location: { href: '' } };
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {} };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 있음 */ }
(async () => {
  try {
    const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
    fs.writeFileSync(e, `export { parseListExcel, isoToLabel, isOppositeDirRecord, EDI_EMPTY_FILL_KEYS, ediCoreEmpty } from "${ROOT}/src/utils.js";\nexport { flattenVoyages, answerOneRaw } from "${ROOT}/src/mir.js";\n`);
    execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
    const B = require(o);
    const XLSX = require(path.join(ROOT, 'node_modules/xlsx'));
    global.window.XLSX = XLSX;   // 파서가 같은 SheetJS 를 쓴다(네트워크 없음)
    //  시트(행 배열)들로 통합문서를 만들어 앱 파서에 그대로 넣는다.
    const parse = async (sheets) => {
      const wb = XLSX.utils.book_new();
      for (const [name, aoa] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
      const u8 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      return ((await B.parseListExcel(u8)) || {}).records || [];
    };
    const by = (recs) => Object.fromEntries(recs.map((r) => [r.cn, r]));
    const L = (iso) => B.isoToLabel(iso);

    console.log('■ 동진 CLL — 머리 «Type\\n/Size»(줄바꿈)·«Cargo Type» F/P (KBTR 2607W 48대·SWBT 2615S 69대 실측)');
    {
      const head = ['No', 'Container No', 'Seal No', 'Type\n/Size', 'POD', 'Cargo Type'];
      const rows = [[1, 'DJLU2011843', 'DJS123401', 'D2', 'VNHPH', 'F'], [2, 'BEAU5407845', 'DJS123402', 'D5', 'VNHPH', 'F'], [3, 'BEAU5408409', '', 'D5', 'KRKAN', 'P']];
      const sum = [[], ['POD', 'TOTAL', 'LOC', 'T/S', 'MTY', 'SOC', 'JOINT'], ["20'", 1, 1, 0, 0, 0, 0], ['40HC', 2, 1, 0, 1, 0, 0]];
      const r = by(await parse({ CLL: [['DONGJIN SHIPPING CONTAINER LOADING LIST'], ['Cargo Type :', '', 'Full -', 2, 'Empty -', 1], head, ...rows, ...sum] }));
      ok('D2 → 20피트(22G1) · D5 → 40HC(45G1)', L(r.DJLU2011843.iso) === '20DC' && L(r.BEAU5407845.iso) === '40HC', `${r.DJLU2011843.iso} · ${r.BEAU5407845.iso}`);
      ok('Cargo Type F → 풀', r.DJLU2011843.fe === 'F' && r.BEAU5407845.fe === 'F');
      ok('Cargo Type P → 엠티 — 머리말(Full 2 · Empty 1)·합계표(LOC·MTY)와 대수가 맞을 때', r.BEAU5408409.fe === 'E' && L(r.BEAU5408409.iso) === '40HC', `${r.BEAU5408409.fe} ${r.BEAU5408409.iso}`);
      const r2 = by(await parse({ CLL: [['DONGJIN'], ['Cargo Type :', '', 'Full -', 2, 'Empty -', 5], head, ...rows] }));
      ok('합계와 안 맞으면 P 를 엠티로 읽지 않는다(추정 금지)', r2.BEAU5408409.fe === '', `fe=${r2.BEAU5408409.fe}`);
    }

    console.log('■ 규격 칸 — KMTC «SZ»+«TY» · 옛 ISO 숫자 · 장비코드 · 높이 칸');
    {
      const k = by(await parse({ S: [['CNTR NO', 'SEAL NO', 'SZ', 'TY', 'F/E'], ['KMTU9351200', 'KMTC1', '40', 'HC', 'F'], ['SEGU2424780', 'KMTC2', '20', 'GP', 'F']] }));
      ok('KMTC «40»+«HC» → 40HC · «20»+«GP» → 20DC (cntr_no_list 1,439줄 규격 빈칸)', L(k.KMTU9351200.iso) === '40HC' && L(k.SEGU2424780.iso) === '20DC', `${k.KMTU9351200.iso} · ${k.SEGU2424780.iso}`);
      const q = by(await parse({ S: [['Container No', 'Seal No', 'ISO', 'F/E'], ['EAXU6254230', 'EAS1', '4510', 'F'], ['EAXU2507670', 'EAS2', '2210', 'F'], ['MCAU5007912', 'EAS3', '4530', 'F']] }));
      ok('옛 ISO 숫자 4510 → 40HC · 2210 → 20DC · 4530 → 40RH (EAS·SITC CLL 3,399줄)', L(q.EAXU6254230.iso) === '40HC' && L(q.EAXU2507670.iso) === '20DC' && L(q.MCAU5007912.iso) === '40RH', `${q.EAXU6254230.iso} · ${q.EAXU2507670.iso} · ${q.MCAU5007912.iso}`);
      const qx = by(await parse({ S: [['Container No', 'Seal No', 'ISO', 'F/E'], ['EAXU4003019', 'EAS4', '4310', 'F'], ['SKHU5541470', 'EAS5', '4261', 'F'], ['SKHU2540254', 'EAS6', '2260', 'F'], ['TEST4232001', 'EAS7', '4232', 'F']] }));
      ok('앱 라벨이 틀리게 푸는 숫자 코드는 비운다 — 4310(세관 42GP)·4261·2260(세관 플랫 42PC·22PC)·4232(리퍼인데 40DC 로 풀림)', ['EAXU4003019', 'SKHU5541470', 'SKHU2540254', 'TEST4232001'].every((c) => qx[c] && qx[c].iso === ''), JSON.stringify(['EAXU4003019', 'SKHU5541470', 'SKHU2540254', 'TEST4232001'].map((c) => qx[c] && qx[c].iso)));
      const d = by(await parse({ S: [['No', 'Cell', 'CntrNo', 'OPR', 'POD', 'SzTp', 'F/E'], [1, '010101', 'BEAU4920827', 'KKA', 'PTK', 'DCHC', 'F'], [2, '010102', 'SMCU2506067', 'KKA', 'PTK', 'OTHC', 'F']] }));
      ok('장비코드 DCHC → 40HC · OTHC → 40OT (KKAK·KKLC 923대)', L(d.BEAU4920827.iso) === '40HC' && L(d.SMCU2506067.iso) === '40OT', `${d.BEAU4920827.iso} · ${d.SMCU2506067.iso}`);
      const h = by(await parse({ 'DISC LIST': [['NO.', 'LINE', 'CELL', 'CONT_NO', 'SPOD', 'POD', 'TYPE', 'LEN', 'WEI', 'F/E', 'HEI'], [1, 'DJS', '0280884', 'TIIU6752864', 'CNSHK', 'CNSHK', 'GP', '40', '$23.00', 'F', '96'], [2, 'DJS', '0280184', 'DJLU2158264', 'CNSHK', 'CNSHK', 'GP', '20', '$4.00', 'E', '86']] }));
      ok('길이 40 + 높이 96 → 40HC (종전 40DC 로 읽힐 뻔 — DJCT 0215W 102대)', L(h.TIIU6752864.iso) === '40HC' && L(h.DJLU2158264.iso) === '20DC', `${h.TIIU6752864.iso} · ${h.DJLU2158264.iso}`);
    }

    console.log('■ 터미널 빈 컨 목록 «Siz/Typ» — 43DC = 40HC, 같은 칸의 45DC 는 45피트(OBWH CLL L5GE 62/62), 모르는 코드는 비운다');
    {
      const t = by(await parse({ S: [[' EMPTY CNTR LIST'], [], [], ['No', 'Cntr No', 'Loc', 'Opr', 'Siz/Typ', 'F/E', 'Inspection', 'Stack', 'Port'],
        [1, 'LYGU4028689', '2H-07-01-01', 'YTF', '43DC', 'E', 'D', 2, 'CNYNT'], [2, 'HPCU6000976', '2H-07-01-02', 'YTF', '45DC', 'E', 'D', 2, 'CNYNT'],
        [3, 'SPSU2041310', '2H-07-01-03', 'YTF', '20DC', 'E', 'D', 2, 'CNYNT'], [4, 'CKFU2000269', '2H-07-01-04', 'LYG', '20BC', 'E', 'D', 2, 'CNLYG']] }));
      ok('43DC → 40HC · 20DC → 20DC', L(t.LYGU4028689.iso) === '40HC' && L(t.SPSU2041310.iso) === '20DC', `${t.LYGU4028689.iso} · ${t.SPSU2041310.iso}`);
      ok('45DC → 45피트(45HC 라벨) — 40DC 로 적지 않는다', L(t.HPCU6000976.iso) === '45HC', `${t.HPCU6000976.iso}=${L(t.HPCU6000976.iso)}`);
      ok('20BC(라벨로 안 풀림) → 비운다', t.CKFU2000269.iso === '', t.CKFU2000269.iso);
      const rz = by(await parse({ S: [['提单号', '箱号', '封号', '箱型', '重'], ['RZBL0001', 'NHFU9000543', 'RZ1', '45HC', 30000], ['RZBL0002', 'VPLU8413460', 'RZ2', '40HC', 28000], ['RZBL0003', 'MORU6705361', 'RZ3', '40RH', 25000]] }));
      ok('RZOR SOC箱明细 箱型 — 같은 칸에 40HC 가 따로 있으면 45HC 는 45피트(세관·预配 L5G1) · 40HC 는 40HC', L(rz.NHFU9000543.iso) === '45HC' && /^L5/.test(rz.NHFU9000543.iso) && L(rz.VPLU8413460.iso) === '40HC' && L(rz.MORU6705361.iso) === '40RH', JSON.stringify([rz.NHFU9000543.iso, rz.VPLU8413460.iso, rz.MORU6705361.iso]));
      const xt = by(await parse({ S: [['提单号', '箱号', '封号', '箱型*', '是否空箱(FULL/EMPTY)'], ['XTBL0001', 'CAIU4977004', 'X1', '45GP', 'E'], ['XTBL0002', 'CAIU3763625', 'X2', '22GP', 'E']] }));
      const mx = by(await parse({ S: [['Container No', 'Seal No', 'Size/Type'], ['BMOU4749787', 'SIT1', '45GP'], ['SITU4000001', 'SIT2', '40FR'], ['SITU4000002', 'SIT3', '40OH']] }));
      ok('40FR·40OH 와 45GP 가 한 칸에 섞인 SITC 표기에서 45GP 는 45피트로 적지 않는다(비운다 — 재감사 지적)', mx.BMOU4749787.iso === '' && L(mx.SITU4000001.iso) === '40FR', JSON.stringify([mx.BMOU4749787.iso, mx.SITU4000001.iso]));
      ok('XTPG MEMO BL 箱型* — ISO 크기코드 표기 칸의 45GP 는 40HC · 是否空箱 E → 엠티', L(xt.CAIU4977004.iso) === '40HC' && xt.CAIU4977004.fe === 'E' && L(xt.CAIU3763625.iso) === '20DC', JSON.stringify([xt.CAIU4977004.iso, xt.CAIU4977004.fe]));
    }

    console.log('■ F/E — F/MT 칸·실번호 칸 «EMPTY»·«E» · 헤더 없는 야드 EMPTY LOAD LIST');
    {
      const x = by(await parse({ SIF: [['CONTAINER', 'SEAL NO', 'F/MT', 'SIZE'], ['WSDU2130390', 'EMPTY', 'E', '20GP'], ['SEGU4505052', 'XTP0001', 'F', '40HC'], ['CSLU1078346', '', 'E', '20GP']] }));
      ok('«F/MT» 칸 → F/E (XTPG CLL PTK SIF 346줄)', x.SEGU4505052.fe === 'F' && x.CSLU1078346.fe === 'E');
      ok('실번호 칸 «EMPTY» → 엠티 · 실번호 빈칸', x.WSDU2130390.fe === 'E' && !x.WSDU2130390.sl);
      const f = by(await parse({ Sheet1: [['20GP X 3'],
        [1, 'SITU2616060', 'Storage', 'SIT', '22G0', 'E', '4F', 6, 1, 2, 'Minor', 'CNSHD', 'STSE 2670W'],
        [2, 'SITU2629221', 'Storage', 'SIT', '22G0', 'E', '4F', 6, 1, 1, '', 'CNSHD', 'STSE 2670W'],
        [3, 'SEGU3513541', 'Storage', 'SIT', '22G0', 'E', '4F', 6, 2, 4, 'Sound', 'CNSHD', 'STSE 2670W']] }));
      ok('헤더 없는 목록의 E 칸 → 엠티 (MAE·SIT·HHS EMPTY LOAD LIST 3,181줄 — 종전 빈칸)', f.SITU2616060.fe === 'E' && f.SITU2629221.fe === 'E' && f.SEGU3513541.fe === 'E');
      ok('손상 등급 «MINOR»·«SOUND» 는 POL 이 아니다 — 항구 자리는 종전 그대로(CNSHD 는 POD)', f.SITU2616060.pol === '' && f.SITU2616060.pod === 'CNSHD' && f.SEGU3513541.pol === '' && f.SEGU3513541.pod === 'CNSHD', `${f.SITU2616060.pol}/${f.SITU2616060.pod}`);
      ok('등급이 없는 줄은 종전 자리 그대로(첫 항구 = POL)', f.SITU2629221.pol === 'CNSHD' && f.SITU2629221.pod === '', `${f.SITU2629221.pol}/${f.SITU2629221.pod}`);
    }

    console.log('■ 머리말·구간 제목줄의 POL·POD · 같은 B/L 이어 쓰기');
    {
      const n1 = by(await parse({ S: [['VSL/VOY : DONGJIN CONFIDENT 0151S    POL : PYEONGTAEK, KOREA    POD : KWANGYANG, KOREA    Sailing Date : 2026-05-13'],
        ['No', 'Container No', 'Seal No', 'Type', 'F/E', 'Weight'], [1, 'BEAU4886830', 'DJS1', '45G1', 'F', 25000]] }));
      ok('«POL : PYEONGTAEK, KOREA · POD : KWANGYANG, KOREA» → KRPTK · KRKAN (동영·남성 CLL)', n1.BEAU4886830.pol === 'KRPTK' && n1.BEAU4886830.pod === 'KRKAN', `${n1.BEAU4886830.pol}/${n1.BEAU4886830.pod}`);
      const d1 = by(await parse({ S: [['  LOADING PORT [PYEONGTAEK, KOREA], DISCHARGING PORT [DALIAN, CHINA]'], ['NO', 'CONTAINER NO', 'SEAL NO', 'TYPE', 'F/E'], [1, 'BOMU2204613', '', '22G1', 'E']] }));
      ok('«LOADING PORT [..] DISCHARGING PORT [..]» → KRPTK · CNDLC (두우 NOLIST)', d1.BOMU2204613.pol === 'KRPTK' && d1.BOMU2204613.pod === 'CNDLC', `${d1.BOMU2204613.pol}/${d1.BOMU2204613.pod}`);
      const two = by(await parse({ S: [['POL : SHIDAO    POD : PYEONGTAEK'], ['NO', 'CONTAINER NO', 'SEAL NO', 'TYPE', 'F/E'], [1, 'SITU2000001', 'S1', '22G1', 'F'], ['POL : TAICANG,NANTONG    POD : PYEONGTAEK'], [2, 'SITU2000002', 'S2', '22G1', 'F']] }));
      ok('구간마다 제 선언 · 항구가 둘인 선언(TAICANG,NANTONG)은 쓰지 않는다', two.SITU2000001.pol === 'CNSHD' && two.SITU2000001.pod === 'KRPTK' && two.SITU2000002.pol === '' && two.SITU2000002.pod === 'KRPTK', JSON.stringify([two.SITU2000001.pol, two.SITU2000002.pol]));
      const bl = by(await parse({ S: [['Container No', 'B/L No', 'POD', 'Seal'], ['CKSU4010713', 'CKCOPTK0000307', 'CNTAG', 'CK1'], ['CKSU4010714', 'CKCOPTK0000307', '', 'CK2'], ['CKSU4010715', 'CKCOPTK0000322', '', 'CK3'], ['CKSU4010716', 'MTY', 'CNNTG', 'CK4'], ['CKSU4010717', 'MTY', '', 'CK5']] }));
      ok('POD 가 B/L 첫 줄에만 있으면 같은 B/L 에 이어 쓴다 · 다른 B/L 은 비운다 (천경 CLL 1,459줄)', bl.CKSU4010714.pod === 'CNTAG' && bl.CKSU4010715.pod === '', `${bl.CKSU4010714.pod}/${bl.CKSU4010715.pod}`);
      ok('B/L 번호 꼴이 아닌 자리표시(«MTY»)는 잇지 않는다', bl.CKSU4010717.pod === '', bl.CKSU4010717.pod);
      const opp = B.isOppositeDirRecord(n1.BEAU4886830, 'discharge') && !B.isOppositeDirRecord(n1.BEAU4886830, 'loading');
      ok('머리말로 채운 POL 평택은 선적 근거다 — 양하 탭에서는 반대 방향으로 빠진다(선적 탭은 그대로)', opp);
    }

    console.log('■ 머리줄 — 제목줄이 머리를 가로채지 않는다 · 머리와 값이 한 칸 어긋난 실번호');
    {
      const H = Array(39).fill(''); Object.assign(H, { 0: 'Seq', 2: 'Container No.  ', 6: 'Seal No', 9: 'F/E', 11: 'Size', 13: 'B/L No.', 26: 'T.Wgt', 38: 'DIS' });
      const R1 = Array(39).fill(''); Object.assign(R1, { 0: 1, 1: 'BEAU5373010', 5: 'TYS706010', 9: 'F', 11: '45GP', 26: '26,587.00', 38: 'CNTAG' });
      const R2 = Array(39).fill(''); Object.assign(R2, { 0: 2, 1: 'TYLU9182398', 9: 'E', 11: '45GP', 26: '3,700.00', 38: 'CNTAG' });
      const c = by(await parse({ Sheet1: [['Container Number List  (OUTBOUND)'], [], H, [], R1, R2] }));
      ok('제목 «Container Number List» 아래 진짜 머리로 읽는다 — 규격·F/E·무게·DIS', L(c.BEAU5373010.iso) === '40HC' && c.BEAU5373010.fe === 'F' && c.BEAU5373010.wt === 26587 && c.BEAU5373010.pod === 'CNTAG', JSON.stringify({ iso: c.BEAU5373010.iso, fe: c.BEAU5373010.fe, wt: c.BEAU5373010.wt, pod: c.BEAU5373010.pod }));
      ok('머리 «Seal No» 한 칸 왼쪽의 실번호를 읽는다(종전 값 유지 — XTPG cntr_number_list 16개)', c.BEAU5373010.sl === 'TYS706010', c.BEAU5373010.sl);
      const R3 = Array(39).fill(''); Object.assign(R3, { 0: 3, 1: 'TYLU9180733', 5: 'TYS706134', 9: 'F', 11: '45GP', 38: 'KRPTK,PYEONGTAEK' });
      const c2 = by(await parse({ Sheet1: [['Container Number List  (INBOUND)'], [], H, [], R3] }));
      ok('DIS 칸 «KRPTK,PYEONGTAEK» → KRPTK (수집기 평택 판정과 같은 꼴)', c2.TYLU9180733.pod === 'KRPTK', c2.TYLU9180733.pod);
      const sub = await parse({ S: [['CONTAINER NO', 'SEAL NO', 'SIZE'], ['TGHU1000001', 'S100001', '20GP'], ['TGHU1000002', 'S100002', '20GP'], ['TGHU1000003', 'S100003', '20GP'], ['[REEFER LIST]', 'CONTAINER NO', 'SEAL NO', 'TYPE', 'TEMP', 'VENT', 'POD'], ['TGHU1000004', 'S100004', '20RF', '-18', '0', 'CNTAO']] });
      ok('본 리스트 아래 보조표 머리(점수가 높아도)로 갈아타지 않는다 — 그 사이 컨이 빠지지 않는다(감사 재현: 4대 → 1대)', sub.length === 4, sub.map((r) => r.cn).join(','));
      const W = [['Seq', '', 'Container No.', '', '', '', 'Seal No', 'Size'], [1, 'TGHU2000001', '', '', '', '24500', '', '20GP'], [2, 'TGHU2000002', '', '', '', '300506', '', '20GP']];
      const w2 = by(await parse({ S: W }));
      ok('실번호 칸이 비었을 때 옆 칸의 무게·CELL 같은 숫자만인 값은 실번호로 삼지 않는다', !w2.TGHU2000001.sl && !w2.TGHU2000001.eseal && !w2.TGHU2000002.sl, JSON.stringify([w2.TGHU2000001.sl, w2.TGHU2000001.eseal, w2.TGHU2000002.sl]));
    }

    console.log('■ 2차 컨번호 머리 «CONT\'R» — 종전에 헤더 없는 시트로 읽던 자리에서만');
    {
      const m = by(await parse({ Sheet1: [['CONTAINER LOADING LIST'], [], ['No.', "CONT'R", 'CELL', 'SEAL', 'SIZE', 'POD', 'OPR'], [1, 'MRKU5155436', '300506', 'KR0988009', '40HC', 'DVO', 'MAE'], [2, 'MCRU2047124', '030982', 'E', '20RF', 'TAO', 'MAE']] }));
      ok('실번호는 SEAL 칸 — CELL(베이 자리 300506)을 실번호로 읽지 않는다 (MCSC 635S LIST 213대)', m.MRKU5155436.sl === 'KR0988009', m.MRKU5155436.sl);
      ok('SEAL 칸 «E» → 엠티 · 실번호 빈칸 · 20RF 리퍼', m.MCRU2047124.fe === 'E' && !m.MCRU2047124.sl && L(m.MCRU2047124.iso) === '20RF' && m.MCRU2047124.rf === true, JSON.stringify({ fe: m.MCRU2047124.fe, sl: m.MCRU2047124.sl, iso: m.MCRU2047124.iso }));
      const rec = await parse({ Actual_i: [['ACTUAL CONTAINER & SEAL NUMBER'], ['CONTAINER NO', 'SEAL NO'], ['MNBU3256200', 'PH0570668']],
        LIST_i: [['CONTAINER DISCHARGING LIST'], [], ['No.', "CONT'R", 'CELL', 'CUSTOMS - SEAL', 'SIZE', 'POL'], [1, 'MRSU0374671', '350602', 'PH0528181', '20DC', 'DVO']],
        LIST_o: [['CONTAINER LOADING LIST'], [], ['No.', "CONT'R", 'CELL', 'SEAL', 'SIZE', 'POD'], [1, 'GESU6233597', '340502', 'KR0989370', '40HC', 'DVO']] });
      ok('정식 시트 뒤의 «CONT\'R» 시트는 종전처럼 읽지 않는다 — 양하·선적이 한 리스트에 섞이지 않게(IA8 DEPARTURE REPORT)', rec.length === 1 && rec[0].cn === 'MNBU3256200', rec.map((r) => r.cn).join(','));
    }

    console.log('■ 끝자리 동기화 · 플랫랙 SOC');
    {
      const s = by(await parse({ DETAIL: [['VESSEL:', '', 'SITC MOJI', '', '', 'POL:', 'PYEONGTAEK'], ['NO.', 'TYPE', 'CNTR NO.', 'SEAL', 'G(W)', 'T(W)', 'DEL', 'T/S', 'SOC/E/F'], [1, '40HR', 'BEAU9712657', '', 4840, 9560, 'SHIDAO', '', 'EMPTY'], [2, '40HC', 'BEAU2890929', '', 3900, 3900, 'SHIDAO', '', 'EMPTY']] }));
      ok('40HR(하이큐브 리퍼) 엠티는 40RH 그대로 — 40HE(=40HC 드라이)로 바꾸지 않는다 (STMJ·STSE CONTAINERLIST 833줄)', L(s.BEAU9712657.iso) === '40RH' && s.BEAU9712657.fe === 'E', `${s.BEAU9712657.iso}=${L(s.BEAU9712657.iso)}`);
      ok('라벨이 같으면 종전대로 끝자리를 맞춘다(40HC 엠티 → 40HE)', s.BEAU2890929.iso === '40HE' && L(s.BEAU2890929.iso) === '40HC', s.BEAU2890929.iso);
      const so = by(await parse({ S: [['SOC CONTAINER LIST'], ['Container No', 'Seal No', 'Size', 'Type', 'Weight'], ['SEGU7650305', '', '42', 'PC', 22000], ['SEGU1000001', '', '22', 'GP', 2200]] }));
      ok('SOC 플랫랙(42+PC)은 실이 없어도 엠티로 적지 않는다(22톤 F/R — 천경 XTPG 539W) · 규격 40FR', so.SEGU7650305.fe === '' && L(so.SEGU7650305.iso) === '40FR', `${so.SEGU7650305.fe} ${so.SEGU7650305.iso}`);
      ok('SOC 드라이는 종전대로 실 없음 = 엠티', so.SEGU1000001.fe === 'E');
      const so2 = by(await parse({ S: [['SOC CONTAINER LIST'], ['CONTAINER No.', 'SEAL No.', 'SIZE', 'TYPE', 'Gross W/T', 'Remarks'], ['SEGU7650305', '', '42', 'PC', 4900, ' F/R Empty '], ['CAXU5729513', '', '42', 'PC', 27140, ' O/W(L):29 O/W(R):29 F/R ']] }));
      ok('SOC 플랫랙은 비고가 «F/R Empty» 일 때만 엠티(천경 534W 4.9톤) · 짐 실린 F/R(539W 27톤)은 비움', so2.SEGU7650305.fe === 'E' && so2.CAXU5729513.fe === '', `${so2.SEGU7650305.fe}/${so2.CAXU5729513.fe}`);
    }

    console.log('■ 수정안 A — EDI 칸이 비었을 때만 리스트가 채운다(화면 본류·검색 패널·출력 허브·미르 한 벌)');
    {
      ok('EDI 규격 빈칸 → 채울 자리 · 값 있음 → EDI 보호 · 가상 EDI → 채울 자리', B.ediCoreEmpty({ iso: '' }, 'iso') && !B.ediCoreEmpty({ iso: '45G1' }, 'iso') && B.ediCoreEmpty({ _virtualEdi: true, iso: '45G1' }, 'iso') && !B.ediCoreEmpty(null, 'iso'));
      ok('채우는 칸 = 종전 화면 본류(VoyagePage CORE_FILL) 그대로', ['fe', 'iso', 'tp', 'rf', 'fr', 'ot', 'tk', 'dg', 'dgc', 'un', 'pg', 'pod', 'tmp_missing'].every((k) => B.EDI_EMPTY_FILL_KEYS.has(k)) && B.EDI_EMPTY_FILL_KEYS.size === 13 && !B.EDI_EMPTY_FILL_KEYS.has('pol'));
      const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
      ok('네 병합 경로가 같은 한 벌을 쓴다', /ediCoreEmpty\(merged\[r\.cn\], k\)/.test(src('src/components/SearchPanel.jsx')) && /ediCoreEmpty\(e, k\)/.test(src('src/components/PrintHubModal.jsx'))
        && /ediCoreEmpty\(ediBase, k\)/.test(src('src/pages/VoyagePage.jsx')) && /ediCoreEmpty\(_ebM, k\)/.test(src('src/mir.js')));
      const fx = JSON.parse(src('tools/fixtures/printhub_kbtr.json'));
      const vv = { KBTR_2606E: fx };
      const cs = B.flattenVoyages(vv);
      const ctx = { app: 'tally', smallTalkLast: true, execDevice: false, modeChoice: 'both', voyageKey: 'KBTR_2606E', voyage: fx, info: fx.info, containers: cs, mode: 'discharge', inspector: '검수사', isChief: true, portMisData: {} };
      const a20 = String(B.answerOneRaw('20피트 몇대', { ...ctx }) || ''), a40 = String(B.answerOneRaw('40피트 몇대', { ...ctx }) || '');
      ok('미르 KBTR 2606E 양하 — EDI 규격 빈칸 20대를 리스트 규격으로(20피트 20→25 · 40피트 65→80)', /양하 25/.test(a20) && /양하 80/.test(a40), `${a20.slice(0, 80)} | ${a40.slice(0, 80)}`);
      const one = cs.find((c) => c.cn === 'FBLU0013660');
      ok('그 20대 중 FBLU0013660 → 리스트 규격 45GP(40HC)', one && L(one.iso) === '40HC', one ? one.iso : '없음');
    }
  } catch (ex) {
    bad += 1; console.log('  ✘ 검사 중 오류 — ' + (ex && ex.stack || ex));
  }
  console.log(`\n3.60-13 연막검사 ${n - bad}/${n} 통과`);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e2) { /* 임시 */ }
  if (bad) { console.log('✗ 실패 — 배포 금지'); process.exit(1); }
})();
