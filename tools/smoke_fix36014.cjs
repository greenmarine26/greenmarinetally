// 3.60-14 연막검사 — 머리 없는 엠티 리스트의 항구 한 칸 = POD · 카토스 «CLL carrier seal» = 원실 · 복원한 항차는 홈 자동 정리가 7일 동안 건드리지 않는다. 되살아나면 배포를 막는다.
//
//  왜 있는가 — 검수사 2026-09-24 «전부 파서 문제 입니다 카토스 및 터미널 검수자료는 이상 없습니다» · «파서 문제 입니다» ·
//    «복원 시켰는데 자동으로 사라지는 버그가 있습니다. 지금 복원만 5-6번 한듯 합니다».
//    표는 실물 양식을 줄여 옮긴 것이다(컨번호·셀·씰·항구 모두 실물 — MCSC 635S · MAMP 633S · STSE 2674W · NSFR 2617S 카토스).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix36014_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = global.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, location: { href: '' } };
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {} };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 있음 */ }
(async () => {
  try {
    const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
    fs.writeFileSync(e, `export { parseListExcel, isOppositeDirRecord } from "${ROOT}/src/utils.js";\n`);
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

    console.log('■ 머리 없는 선사 엠티 리스트 — 항구가 한 칸뿐이면 그 항구는 목적항(POD)이다');
    {
      //  MCSC 635S «MAE EMPTY LOAD LIST2» 실물 줄(EDI·카토스 양하항과 같은 값)
      const m = by(await parse({ Sheet1: [['20RF X 1'], [1, 'MCRU2047124', 'Storage', 'MAE', '22R0', 'E', '3F', 17, 1, 1, '', 'CNTAO', 'MCSC 635S'], [], ['40RH X 100'], [27, 'MNBU4552608', 'Storage', 'MAE', '45R0', 'E', '4X', 21, 2, 4, '', 'CNTSN', 'MCSC 635S']] }));
      ok('MCSC 635S MCRU2047124 → POD CNTAO · POL 빈칸(종전 POL CNTAO)', m.MCRU2047124 && m.MCRU2047124.pod === 'CNTAO' && m.MCRU2047124.pol === '', m.MCRU2047124 && `pol=${m.MCRU2047124.pol} pod=${m.MCRU2047124.pod}`);
      ok('MCSC 635S MNBU4552608 → POD CNTSN(EDI CNTXG · 카토스 CNTSN 과 같은 천진)', m.MNBU4552608 && m.MNBU4552608.pod === 'CNTSN' && m.MNBU4552608.pol === '');
      //  MAMP 633S — 구간 제목 «40R0 X 50 / TAO» · EMTY 는 네 글자라 항구가 아니다
      const a = by(await parse({ Sheet1: [['40R0 X 50 / TAO'], [], [1, 'MNBU4623492', 'Storage', 'MAE', 'EMTY', '45R0', '3F', 12, 1, 4, '', 'CNTAO', 'MAMP-633S']] }));
      ok('MAMP 633S MNBU4623492 → POD CNTAO (구간 제목 «/ TAO» 와 같다)', a.MNBU4623492 && a.MNBU4623492.pod === 'CNTAO' && a.MNBU4623492.pol === '', a.MNBU4623492 && `pol=${a.MNBU4623492.pol} pod=${a.MNBU4623492.pod}`);
      //  STSE 2674W — 손상 등급 «Minor» 가 앞에 있어도 결과는 같다(종전부터 POD CNSHD)
      const s = by(await parse({ Sheet1: [['20 X 80 / SHD'], [], [1, 'TIIU2622287', 'Storage', 'SIT', '22G0', 'E', '3C', 6, 3, 1, 'Minor', 'CNSHD', 'STSE-2674W']] }));
      ok('STSE 2674W TIIU2622287 → POD CNSHD · POL 빈칸(손상 등급은 항구 아님)', s.TIIU2622287 && s.TIIU2622287.pod === 'CNSHD' && s.TIIU2622287.pol === '');
      //  항구가 둘이면 종전 자리 규칙 그대로(첫째 POL · 둘째 POD)
      const t = by(await parse({ Sheet1: [['YARD LIST'], [1, 'TCNU1234560', 'KRPTK', 'CNTAO', '45G1', 'F']] }));
      ok('항구 둘(KRPTK·CNTAO) → POL KRPTK · POD CNTAO (종전 그대로)', t.TCNU1234560 && t.TCNU1234560.pol === 'KRPTK' && t.TCNU1234560.pod === 'CNTAO', t.TCNU1234560 && `pol=${t.TCNU1234560.pol} pod=${t.TCNU1234560.pod}`);
      //  평택 항구 한 칸은 종전 그대로 POL — 방향 판정이 흔들리지 않게
      const k = by(await parse({ Sheet1: [['YARD LIST'], [1, 'TCNU1234561', 'KRPTK', '45G1', 'F']] }));
      ok('평택 한 칸(KRPTK) → 종전 그대로 POL', k.TCNU1234561 && k.TCNU1234561.pol === 'KRPTK' && k.TCNU1234561.pod === '', k.TCNU1234561 && `pol=${k.TCNU1234561.pol} pod=${k.TCNU1234561.pod}`);
      ok('목적항 한 칸 레코드는 선적·양하 어느 쪽에서도 반대 방향으로 빠지지 않는다', !B.isOppositeDirRecord(m.MCRU2047124, 'loading') && !B.isOppositeDirRecord(m.MCRU2047124, 'discharge'));
    }

    console.log('■ 카토스 «검수 입력» — 원실은 «CLL carrier seal» 칸이다(Cell Position 이 아니다)');
    {
      const head = ['컨테이너번호', 'Cell Position', 'H/D', 'EQU No.', 'CLL carrier seal', 'Carrier re-seal', 'Customs Seal', '전자봉인', 'Set RF Temp', 'Actual RF Temp', 'Out Date', 'Out time', '크기및규격', 'FE', '선사', '양하항', '상태'];
      const c = by(await parse({ Sheet1: [head,
        ['BEAU2929722', '010004', 'H', 'GC103', 'KSC886285', '', '', '', '', '', '2026-08-25', '17-00-41', '2210', 'F', 'KMD', 'VNHPH', 'Delivered'],
        ['CAAU4663839', '140606', 'H', 'GC103', 'KR0988001', '', '', '', '', '', '2026-08-30', '20-18-20', '4510', 'F', 'MAE', 'CNTAO', 'Delivered'],
        ['MCRU2047124', '030982', 'D', 'GC103', '', '', '', '', '', '', '2026-08-30', '19-58-06', '2230', 'E', 'MAE', 'CNTAO', 'Delivered']] }));
      ok('NSFR 2617S BEAU2929722 원실 = KSC886285 (종전 셀 010004)', c.BEAU2929722 && c.BEAU2929722.sl === 'KSC886285', c.BEAU2929722 && `sl=${c.BEAU2929722.sl}`);
      ok('MCSC 635S CAAU4663839 원실 = KR0988001 (종전 셀 140606)', c.CAAU4663839 && c.CAAU4663839.sl === 'KR0988001', c.CAAU4663839 && `sl=${c.CAAU4663839.sl}`);
      ok('엠티 MCRU2047124 — 씰 칸이 비었으면 원실·엠티실 모두 빈칸(셀 030982 가 들어가지 않는다)', c.MCRU2047124 && !c.MCRU2047124.sl && !c.MCRU2047124.eseal, c.MCRU2047124 && `sl=${c.MCRU2047124.sl} eseal=${c.MCRU2047124.eseal}`);
      ok('양하항 칸은 그대로 POD (CNTAO)', c.CAAU4663839 && c.CAAU4663839.pod === 'CNTAO');
      //  양하 카토스는 머리가 «하선신고서 carrier seal» 이다(SWTD 9012E 실물)
      const dh = ['컨테이너번호', 'Cell Position', 'H/D', 'EQU No.', '하선신고서 carrier seal', 'Carrier re-seal', 'Customs Seal', '전자봉인', 'Set RF Temp', 'Actual RF Temp', 'In Date', 'In time', '크기및규격', 'FE'];
      const dd = by(await parse({ Sheet1: [dh, ['SKLU1643533', '230402', 'H', 'GC104', 'SKR018346', '', '', '', '', '', '', '', '2210', 'F'], ['SKLU1657563', '090604', 'H', 'GC103', '0279473', '', '', '', '', '', '', '', '2210', 'F']] }));
      //  SWTD 9012E 실물 두 줄 — 플랫랙이라 씰 칸에 «0000»·«NONE». «0000» 은 검수사의 «실 부족» 표기라 적힌 그대로 둔다(세관리스트도 같은 값).
      const d0 = by(await parse({ Sheet1: [dh, ['CRTU7611059', '140510', 'H', 'GC103', '0000', '', '', '', '', '', '2026-08-28', '05-55-59', '4261', 'F'], ['SKHU2540254', '130608', 'H', 'GC103', 'NONE', '', '', '', '', '', '2026-08-28', '06-00-22', '2260', 'F']] }));
      ok('씰 칸 «0000»·«NONE» 은 적힌 그대로(셀 140510·130608 이 들어가지 않는다)', d0.CRTU7611059 && d0.CRTU7611059.sl === '0000' && d0.SKHU2540254 && d0.SKHU2540254.sl === 'NONE', d0.CRTU7611059 && `${d0.CRTU7611059.sl} · ${d0.SKHU2540254 && d0.SKHU2540254.sl}`);
      ok('양하 카토스 «하선신고서 carrier seal» → 원실 SKR018346 · 숫자 씰 0279473 도 그대로(종전 셀 230402·090604)', dd.SKLU1643533 && dd.SKLU1643533.sl === 'SKR018346' && dd.SKLU1657563 && dd.SKLU1657563.sl === '0279473', dd.SKLU1643533 && `${dd.SKLU1643533.sl} · ${dd.SKLU1657563 && dd.SKLU1657563.sl}`);
    }

    console.log('■ 씰 머리가 없을 때 옆 칸 탐색 — 자리(셀) 칸은 건너뛴다 · 진짜 씰 칸은 그대로 집는다');
    {
      //  MCAT 637S StowageEvaluation — From·To 가 셀 번호(합본 원실 010484 로 들어가던 것)
      const se = by(await parse({ 'Stowage Evaluation': [['Stowage Evaluation'], ['Weight', 'SzTp', 'POD', 'POD-Terminal', 'POD-Voyage', 'Container No', 'From', 'To', 'Shift Account', 'Shift Reason'], ['2,210', '20DC', 'CNHSK', 'HSKTA', '637S', 'BEAU2378358', '010484', '370482', '', '']] }));
      ok('StowageEvaluation From 010484 는 원실이 아니다(종전 원실 010484)', se.BEAU2378358 && !se.BEAU2378358.sl, se.BEAU2378358 && `sl=${se.BEAU2378358.sl}`);
      //  MCSC 634N LIST — CELL 칸 옆 씰 칸은 «E»(엠티)
      const ml = by(await parse({ Sheet1: [['CONTAINER DISCHARGING LIST'], [], ['No.', "CONT'R", 'CELL', 'CUSTOMS - SEAL', 'ML - SEAL', 'SIZE', 'OPR', 'POL', 'RF', 'DG', 'OOG', 'REMARK'], [1, 'HASU1105738', '410390', 'E', 'E', '22GP', 'MAE', 'JKT', '', '', '', '']] }));
      ok('MCSC 634N LIST CELL 410390 은 원실이 아니다(종전 원실 410390)', ml.HASU1105738 && !ml.HASU1105738.sl, ml.HASU1105738 && `sl=${ml.HASU1105738.sl}`);
      //  TNJP CNTR LIST — 머리 «SEAL #» 는 옆 칸 탐색이 그대로 집는다(진짜 씰)
      const tn = by(await parse({ S: [['NO', 'CNTR NO', 'SEAL #', 'SZ', 'TY', 'F/E'], [1, 'CKFU9211319', 'LYG433163', '20', 'GP', 'F']] }));
      ok('TNJP «SEAL #» 칸 → 원실 LYG433163 그대로', tn.CKFU9211319 && tn.CKFU9211319.sl === 'LYG433163', tn.CKFU9211319 && `sl=${tn.CKFU9211319.sl}`);
    }

    console.log('■ 복원한 항차 — 홈 자동 정리(마지막 작업 7일)가 복원 시각부터 센다');
    {
      const fb = fs.readFileSync(path.join(ROOT, 'src/firebase.js'), 'utf8');
      const i = fb.indexOf('export async function fbRestoreVoyageFromArchive');
      const body = i >= 0 ? fb.slice(i, fb.indexOf('\n}\n', i)) : '';
      ok('fbRestoreVoyageFromArchive 가 info.restoredAt·lastActive 를 같은 시각으로 남긴다(옛 판 폰의 자동 정리도 lastActive 를 센다)', /restored\.info\s*=\s*\{\s*\.\.\.\(restored\.info \|\| \{\}\),\s*restoredAt:\s*_now,\s*lastActive:\s*_now\s*\}/.test(body) && /const _now = Date\.now\(\);/.test(body));
      const hp = fs.readFileSync(path.join(ROOT, 'src/pages/HomePage.jsx'), 'utf8');
      const j = hp.indexOf('function lastWorkAt(v) {');
      const src = j >= 0 ? hp.slice(j, hp.indexOf('\n}\n', j) + 2) : '';
      let lastWorkAt = null;
      try { lastWorkAt = new Function(src + '\nreturn lastWorkAt;')(); } catch (err) { lastWorkAt = null; }
      ok('HomePage lastWorkAt 을 꺼내 돌릴 수 있다', typeof lastWorkAt === 'function');
      if (typeof lastWorkAt === 'function') {
        const now = Date.now(), DAY = 86400000;
        const worked = now - 25 * DAY;   // MCSC 635S — 작업 08-30, 복원 09-24
        const v = { loading: { completed: { MCRU2047124: { at: worked } } }, info: { restoredAt: now - 60000 } };
        ok('복원 1분 뒤 — 마지막 활동 = 복원 시각(7일 안이라 자동 정리 안 함)', lastWorkAt(v) === now - 60000 && (now - lastWorkAt(v)) <= 7 * DAY);
        const v2 = { loading: { completed: { MCRU2047124: { at: worked } } }, info: {} };
        ok('복원 표시가 없으면 종전 그대로 25일 전(자동 정리 대상)', lastWorkAt(v2) === worked && (now - lastWorkAt(v2)) > 7 * DAY);
        const v3 = { loading: { completed: {} }, info: { restoredAt: now - 8 * DAY } };
        ok('복원 뒤 8일이 지나면 다시 종전 규칙', (now - lastWorkAt(v3)) > 7 * DAY);
      }
    }
  } catch (err) {
    bad += 1; console.log('  ✘ 연막검사 실행 실패 — ' + (err && err.stack || err));
  }
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ }
  console.log(`3.60-14 연막검사 ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})();
