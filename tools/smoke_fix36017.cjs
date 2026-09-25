// 3.60-17 연막검사 — 카토스 선사 칸(«Carrier re-seal» 은 선사가 아니다) · F/E 칸의 낱말 EMPTY/FULL(규격은 그대로) · 1차 머리 POD 도 앱 항구표로
//   검수사 2026-09-25 «나머지는 그대로 승인합니다» · «규격은 변하지 않습니다». 표는 실물 양식을 줄여 옮긴 것이다 —
//   MCSC 635S 검수 입력_1788107284654.xls(머리 17칸) · STSE 2662W STSE2662WCN_CNTAO_CONTAINERLIST.XLS 9행 · MCSC 635S LIST.xlsx(POD TAO·TXG·DVO).
//   전수(MAILBOX 1,492개, 3.60-16↔17) — 선사 1,975줄(카토스 6파일) · F/E 1대 · POD 5,052줄(54파일, 방향 판정 변화 0) · 규격·무게·컨 집합 변화 0.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix36017_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = global.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, location: { href: '' } };
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {} };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 있음 */ }
(async () => {
  try {
    const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
    fs.writeFileSync(e, `export { parseListExcel, isoToLabel, isOppositeDirRecord } from "${ROOT}/src/utils.js";\n`);
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

    console.log('■ ④ 카토스 «검수 입력» — «Carrier re-seal» 은 선사 칸이 아니다, «선사» 칸을 읽는다');
    {
      const head = [' 컨테이너번호', ' Cell Position', ' H/D', ' EQU No.', ' CLL carrier seal', ' Carrier re-seal', ' Customs Seal', ' 전자봉인', ' Set RF Temp', ' Actual RF Temp', ' Out Date', ' Out time', ' 크기및규격', ' FE', ' 선사', ' 양하항', ' 상태'];
      const c = by(await parse({ Sheet1: [head,
        ['CAAU4663839', '140606', 'H', 'GC103', 'KR0988001', '', '', '', '', '', '2026-08-30', '20-18-20', '4510', 'F', 'MAE', 'CNTAO', 'Delivered'],
        ['MCRU2047124', '030982', 'D', 'GC103', '', '', '', '', '', '', '2026-08-30', '19-58-06', '2230', 'E', 'MAE', 'CNTAO', 'Delivered'],
        ['BEAU2929722', '010004', 'H', 'GC103', 'KSC886285', '', '', '', '', '', '2026-08-25', '17-00-41', '2210', 'F', 'KMD', 'VNHPH', 'Delivered']] }));
      ok('CAAU4663839 선사 MAE (종전 빈칸 — re-seal 칸을 집었다)', c.CAAU4663839 && c.CAAU4663839.op === 'MAE', c.CAAU4663839 && `op=«${c.CAAU4663839.op}»`);
      ok('MCRU2047124 선사 MAE · BEAU2929722 선사 KMD', c.MCRU2047124 && c.MCRU2047124.op === 'MAE' && c.BEAU2929722 && c.BEAU2929722.op === 'KMD');
      ok('원실은 종전(3.60-14) 그대로 «CLL carrier seal» 칸 — KR0988001', c.CAAU4663839.sl === 'KR0988001' && c.MCRU2047124.sl === '');
      ok('규격·F/E·POD 는 종전 그대로 (4510 F CNTAO)', c.CAAU4663839.iso === '4510' && c.CAAU4663839.fe === 'F' && c.CAAU4663839.pod === 'CNTAO');
      //  «Carrier» 머리만 있는 보통 리스트는 종전 그대로 선사 칸
      const d = by(await parse({ Sheet1: [['CNTR NO', 'Carrier', 'TYPE', 'F/E', 'SEAL'], ['TCNU1234560', 'SKR', '22G1', 'F', 'S123456']] }));
      ok('«Carrier» 머리(씰 아님)는 종전 그대로 선사 — SKR', d.TCNU1234560 && d.TCNU1234560.op === 'SKR');
    }

    console.log('■ ⑤ F/E 칸에 낱말 EMPTY 가 섞여 있으면 엠티 — 규격은 변하지 않는다');
    {
      const head = ['NO.', 'TYPE', 'CNTR NO.', 'SEAL', 'G(W)', 'T(W)', 'DEL', 'T/S', 'SOC/E/F', 'DG/RF/LWH', 'B/L NO.'];
      const s = by(await parse({ Sheet1: [['', '', '', 'SITC CONTAINER LINES CO.,LTD.'], [], ['VESSEL:', '', 'SITC SENDAI', '', '', 'POL:', 'PYEONGTAEK'], ['VOY NO:', '', '2662W', '', '', 'POD:', 'QINGDAO'], ['OWNER:', '', 'SITC', '', '', 'ETD:', '2026-08-12'], head,
        ['1', '20OT', 'CAIU5243767', null, '0', '2180', 'QINGDAO', null, 'EMPTY', null, 'SITPTTA013285E'],
        ['4', '20TK', 'XCXU0006014', 'NIL', '4150', '8350', 'QINGDAO', null, 'SOC -EMPTY (주)헤바로지스', null, 'SITPTTA013284G'],
        ['6', '40HC', 'BEAU4609250', 'SITR215368', '24096', '27996', 'QINGDAO', null, null, null, 'SITPTTA013209G']] }));
      ok('XCXU0006014 «SOC -EMPTY …» → F/E E (종전 F — 씰 NIL 을 실로 봤다)', s.XCXU0006014 && s.XCXU0006014.fe === 'E', s.XCXU0006014 && `fe=${s.XCXU0006014.fe}`);
      ok('규격은 그대로 20TK (끝글자 E 를 붙이지 않는다 — 검수사 «규격은 변하지 않습니다»)', s.XCXU0006014 && s.XCXU0006014.iso === '20TK', s.XCXU0006014 && `iso=${s.XCXU0006014.iso}`);
      ok('씰 NIL 은 적힌 그대로 — 엠티 규칙대로 엠티실 칸(원실 빈칸 · 엠티실 NIL)', s.XCXU0006014 && s.XCXU0006014.sl === '' && s.XCXU0006014.eseal === 'NIL', s.XCXU0006014 && `sl=${s.XCXU0006014.sl} eseal=${s.XCXU0006014.eseal}`);
      ok('_feText 표식은 레코드에 남지 않는다', s.XCXU0006014 && !('_feText' in s.XCXU0006014));
      ok('정확히 «EMPTY» 인 줄은 종전 그대로 E (규격 끝글자 규칙도 종전 그대로 20OE)', s.CAIU5243767 && s.CAIU5243767.fe === 'E' && s.CAIU5243767.iso === '20OE', s.CAIU5243767 && `fe=${s.CAIU5243767.fe} iso=${s.CAIU5243767.iso}`);
      ok('빈칸(풀) 줄은 종전 그대로 F · 40HC', s.BEAU4609250 && s.BEAU4609250.fe === 'F' && B.isoToLabel(s.BEAU4609250.iso) === '40HC');
      const f = by(await parse({ Sheet1: [['CNTR NO', 'TYPE', 'F/E'], ['TCNU1234561', '45G1', 'SOC FULL']] }));
      ok('«SOC FULL» → F · 규격 45G1 그대로', f.TCNU1234561 && f.TCNU1234561.fe === 'F' && f.TCNU1234561.iso === '45G1');
    }

    console.log('■ ⑥ 1차 머리 POD 도 앱 항구표로 — TAO→CNTAO · 못 푸는 값은 그대로 · 방향 판정 불변');
    {
      const m = by(await parse({ Sheet1: [['CONTAINER LOADING LIST'], [], ['NO', 'CNTR NO', 'SIZE/TYPE', 'F/E', 'SEAL', 'POD', 'REMARK'],
        ['1', 'CAAU4663839', '40HC', 'F', 'KR0988001', 'TAO', ''], ['2', 'MRKU5155436', '40HC', 'F', 'KR0988009', 'DVO', ''], ['3', 'MNBU4552608', '40RH', 'E', '', 'TXG', ''],
        ['4', 'TCNU1234562', '40HC', 'F', 'S1', 'CNTAO', ''], ['5', 'TCNU1234563', '40HC', 'F', 'S2', 'HAIPHONG, VIETNAM', ''], ['6', 'TCNU1234564', '40HC', 'F', 'S3', 'XYZZY9', '']] }));
      ok('TAO → CNTAO (종전 TAO 그대로 → 컨 상세 노란 «리스트 POD»)', m.CAAU4663839 && m.CAAU4663839.pod === 'CNTAO', m.CAAU4663839 && `pod=${m.CAAU4663839.pod}`);
      ok('DVO → PHDVO · TXG → CNTXG', m.MRKU5155436 && m.MRKU5155436.pod === 'PHDVO' && m.MNBU4552608 && m.MNBU4552608.pod === 'CNTXG');
      ok('이미 다섯 글자 코드(CNTAO)는 그대로', m.TCNU1234562 && m.TCNU1234562.pod === 'CNTAO');
      ok('항구 이름(HAIPHONG, VIETNAM) → VNHPH', m.TCNU1234563 && m.TCNU1234563.pod === 'VNHPH', m.TCNU1234563 && `pod=${m.TCNU1234563.pod}`);
      ok('못 푸는 값(XYZZY9)은 적힌 그대로 — 지어내지 않는다', m.TCNU1234564 && m.TCNU1234564.pod === 'XYZZY9', m.TCNU1234564 && `pod=${m.TCNU1234564.pod}`);
      ok('선적 리스트의 타항 POD 는 선적 방향에서 반대가 아니다(종전과 같음)', !B.isOppositeDirRecord(m.CAAU4663839, 'loading'));
      const p = by(await parse({ Sheet1: [['CNTR NO', 'TYPE', 'F/E', 'POD'], ['TCNU1234565', '22G1', 'F', 'PTK']] }));
      ok('PTK → KRPTK · 양하 방향에서 평택 POD 로 읽힌다', p.TCNU1234565 && p.TCNU1234565.pod === 'KRPTK' && !B.isOppositeDirRecord(p.TCNU1234565, 'discharge'));
    }

    console.log(`\n3.60-17 연막검사: ${n - bad}/${n}`);
    process.exit(bad ? 1 : 0);
  } catch (err) {
    console.error('연막검사 자체 실패:', err && err.stack || err);
    process.exit(1);
  }
})();
