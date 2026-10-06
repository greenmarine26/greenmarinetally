// 4.07-02 연막검사 — 공컨만 고친 개정판(«REVISED EMPTY CONTAINERLIST»)은 옛 리스트의 공컨 중 빠진 것만 취소한다(src/listRevision.js listPartialRevisionDrops · 선적 합본 merge_entry). 픽스처는 STSE 2678W 실데이터(컨번호만).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix40702_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = globalThis;
(async () => {
  try {
    fs.writeFileSync(path.join(TMP, 'e.mjs'), `export * from "${ROOT}/src/listRevision.js";\nexport { parseBAPLIE } from "${ROOT}/src/utils.js";\nimport "${ROOT}/merge_entry.js";\n`);
    execSync(`npx esbuild "${path.join(TMP, 'e.mjs')}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${path.join(TMP, 'b.cjs')}"`, { cwd: ROOT, stdio: 'pipe' });
    const M = require(path.join(TMP, 'b.cjs'));
    const XLSX = require(path.join(ROOT, 'node_modules/xlsx'));
    globalThis.XLSX = XLSX;   // 3.61-02 연막검사와 같은 사정 — node 에서는 진짜 SheetJS 로 바꿔 둔다
    const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/stse_2678w_empty_revision_40702.json'), 'utf8'));
    const mkList = (name, rowsFE, mtime) => {   // rowsFE = [[컨번호, 'F'|'E'], …]
      const rows = [['NO', 'CNTR NO', 'SIZE', 'F/E', 'POL', 'POD']].concat(rowsFE.map(([c, fe], i) => [i + 1, c, '45G1', fe, 'KRPTK', 'JPTYO']));
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1');
      const u8 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      return { name, mtime, arrayBuffer: async () => new Uint8Array(u8).buffer };
    };
    const OLD = 'STSE2678WCN_CONTAINERLIST.XLS', REV = 'STSE2678WCN_REVISED EMPTY CONTAINERLIST.XLS';
    const oldRows = FX.full.map((c) => [c, 'F']).concat(FX.cancelled.map((c) => [c, 'E']), FX.kept.map((c) => [c, 'E']));
    const revRows = FX.kept.map((c) => [c, 'E']);
    const merge = (files) => globalThis.GMmerge(files, { loadPort: 'KRPTK' });
    ok('픽스처 — 풀 30 · 취소 85 · 유지 215(옛 리스트 330 · 개정 215)', FX.full.length === 30 && FX.cancelled.length === 85 && FX.kept.length === 215);

    // ① 판정 한 벌(listPartialRevisionDrops)
    const sets = { [OLD]: new Set(oldRows.map((r) => r[0])), [REV]: new Set(revRows.map((r) => r[0])) };
    const fes = { [OLD]: Object.fromEntries(oldRows), [REV]: Object.fromEntries(revRows) };
    const D = (files, cnSet = (x) => sets[x], feOf = (x, c) => (fes[x] || {})[c] || '', whole = new Set()) => M.listPartialRevisionDrops(files, cnSet, feOf, whole);
    const d1 = D([{ name: OLD, mtime: 1 }, { name: REV, mtime: 2 }]);
    ok('STSE — 옛 리스트에서만 취소 85대, 근거는 개정판', d1.size === 1 && d1.has(OLD) && d1.get(OLD).cns.size === 85 && d1.get(OLD).by.has(REV), JSON.stringify([...d1.keys()]));
    ok('STSE — 취소 85대가 정확히 개정판에서 빠진 공컨이다', FX.cancelled.every((c) => d1.get(OLD).cns.has(c)));
    ok('STSE — 풀 컨 30대는 취소에 없다', FX.full.every((c) => !d1.get(OLD).cns.has(c)));
    ok('개정판 이름에 EMPTY 가 없으면 이 규칙이 아니다(종전 규칙만)', D([{ name: OLD, mtime: 1 }, { name: 'STSE2678WCN_REVISED CONTAINERLIST.XLS', mtime: 2 }], (x) => (x === OLD ? sets[OLD] : sets[REV]), (x, c) => (x === OLD ? fes[OLD] : fes[REV])[c] || '').size === 0);
    ok('개정 표시 없는 EMPTY 리스트는 규칙 밖(예 MAE EMPTY LOAD LIST)', D([{ name: OLD, mtime: 1 }, { name: 'STSE2678WCN_EMPTY CONTAINERLIST.XLS', mtime: 2 }], (x) => (x === OLD ? sets[OLD] : sets[REV]), (x, c) => (x === OLD ? fes[OLD] : fes[REV])[c] || '').size === 0);
    const fesMixed = { ...fes, [REV]: { ...fes[REV], [FX.kept[0]]: 'F' } };
    ok('개정판에 풀 컨이 섞여 있으면 «공컨만 고친 판» 이 아니다 — 규칙 안 쓴다', D([{ name: OLD, mtime: 1 }, { name: REV, mtime: 2 }], undefined, (x, c) => (fesMixed[x] || {})[c] || '').size === 0);
    //  독립 감사 반영(2026-10-06) — 부분집합 개정판·여러 개정판·끝 숫자 이름
    const subset = (n) => new Set(FX.kept.slice(0, n));
    const dSub = (n) => D([{ name: OLD, mtime: 1 }, { name: REV, mtime: 2 }], (x) => (x === OLD ? sets[OLD] : subset(n)), (x, c) => (x === OLD ? fes[OLD][c] : 'E'));
    ok('5대짜리 부분집합 개정판은 옛 공컨 300대를 지우지 못한다', dSub(5).size === 0);
    ok('40대짜리 부분집합 개정판도(옛 공컨의 반도 못 덮음) 취소하지 않는다', dSub(40).size === 0);
    ok('옛 공컨의 절반 이상(150대 이상)을 덮는 개정판이면 나머지가 취소', dSub(150).get(OLD) && dSub(150).get(OLD).cns.size === 150);
    const REV2 = 'STSE2678WCN_REVISED EMPTY CONTAINERLIST2.XLS';   // 끝 번호 2 — 같은 계열, 서로 겹치지 않는 반쪽씩인 개정판 둘(둘이 겹치지 않으니 listRevisionDrops 가 통째로 빼지도 않는다)
    const oldEmpty = oldRows.filter((r) => r[1] === 'E').map((r) => r[0]);
    const halfA = new Set(oldEmpty.slice(0, 150)), halfB = new Set(oldEmpty.slice(150));
    const dTwo = D([{ name: OLD, mtime: 1 }, { name: REV, mtime: 2 }, { name: REV2, mtime: 3 }], (x) => (x === OLD ? sets[OLD] : (x === REV ? halfA : halfB)), (x, c) => (x === OLD ? fes[OLD][c] : 'E'));
    ok('서로 겹치지 않는 개정판 둘이 옛 공컨을 반쪽씩 담으면 합집합으로 계산한다 — 아무것도 취소하지 않는다', dTwo.size === 0, JSON.stringify([...dTwo.keys()]));
    const dTwoB = D([{ name: OLD, mtime: 1 }, { name: REV, mtime: 2 }, { name: REV2, mtime: 3 }], (x) => (x === OLD ? sets[OLD] : (x === REV ? new Set(oldEmpty.slice(0, 200)) : new Set(oldEmpty.slice(100, 250)))), (x, c) => (x === OLD ? fes[OLD][c] : 'E'));
    ok('개정판 둘의 합집합(250대)에 없는 50대만 취소', dTwoB.get(OLD) && dTwoB.get(OLD).cns.size === 50 && dTwoB.get(OLD).by.size === 2);
    ok('이름 끝 숫자(…EMPTY CONTAINERLIST 55.XLS)는 개정 표시가 아니다', !M.isEmptyRevisionName('STSE2678WCN_EMPTY CONTAINERLIST 55.XLS') && !M.isEmptyRevisionName('STSE2678WCN_EMPTY CONTAINERLIST99.XLS') && !M.isEmptyRevisionName('STSE2678WCN_EMPTY CONTAINERLIST1.XLS'));
    ok('명시한 개정 표시 + 공컨 낱말은 개정판이다(REVISED·FINAL·수정·최종 / EMPTY·엠티·공컨)', M.isEmptyRevisionName(REV) && M.isEmptyRevisionName('X FINAL EMPTY LIST.xls') && M.isEmptyRevisionName('X 수정 엠티 리스트.xls') && M.isEmptyRevisionName('X 최종 공컨.xls'));
    ok('개정 표시만 있고 공컨 낱말이 없으면 이 규칙이 아니다', !M.isEmptyRevisionName('STSE2678WCN_REVISED CONTAINERLIST.XLS'));
    const other = new Set(['AAAU1111111', 'AAAU2222222']);
    ok('컨이 안 겹치는 같은 이름 개정판(다른 선사)은 취소하지 않는다', D([{ name: OLD, mtime: 1 }, { name: REV, mtime: 2 }], (x) => (x === OLD ? sets[OLD] : other), (x, c) => (x === OLD ? fes[OLD][c] : 'E')).size === 0);
    const FIN = 'STSE2678WCN_FINAL CONTAINERLIST.XLS';
    ok('옛 리스트가 더 최종판(FINAL)이면 개정판이 있어도 취소하지 않는다', M.listBaseKey(FIN) === M.listBaseKey(REV.replace(/ EMPTY/, '')) && D([{ name: FIN, mtime: 1 }, { name: REV, mtime: 2 }], (x) => (x === FIN ? sets[OLD] : sets[REV]), (x, c) => (x === FIN ? fes[OLD] : fes[REV])[c] || '').size === 0);
    ok('통째로 빠진 옛 판은 근거로 쓰지 않는다', D([{ name: OLD, mtime: 1 }, { name: REV, mtime: 2 }], undefined, undefined, new Set([REV])).size === 0);

    // ② 합본(GMmerge) — 실제 파일 모양으로 돌린다
    const g0 = await merge([mkList(OLD, oldRows, 1)]);
    ok('개정판이 없으면 종전 그대로 330', g0.report.listTotal === 330 && !(g0.report.revCancelCns || []).length, String(g0.report.listTotal));
    const g1 = await merge([mkList(OLD, oldRows, 1), mkList(REV, revRows, 2)]);
    ok('두 파일이 오면 합본 245(풀 30 + 유지 215) — 취소 85대가 빠진다', g1.report.listTotal === 245, String(g1.report.listTotal));
    ok('report.revCancelCns 가 취소 85대 전부', JSON.stringify((g1.report.revCancelCns || [])) === JSON.stringify([...FX.cancelled].sort()), String((g1.report.revCancelCns || []).length));
    const wb1 = XLSX.read(Buffer.from(g1.xlsxBase64, 'base64'), { type: 'buffer' });
    const cns1 = new Set(XLSX.utils.sheet_to_json(wb1.Sheets.LOADING_LIST).map((r) => r['Cntr No']));
    ok('합본에 풀 30대 전부 · 유지 215대 전부 · 취소 85대 없음', FX.full.every((c) => cns1.has(c)) && FX.kept.every((c) => cns1.has(c)) && FX.cancelled.every((c) => !cns1.has(c)));
    const pf1 = g1.report.perFile.find((p) => p.name === OLD);
    ok('파일별 인식에 취소 85대와 근거 개정판이 남는다', !!pf1 && pf1.revDropped === 85 && (pf1.revBy || []).includes(REV) && pf1.count === 245, JSON.stringify(pf1));
    const g1r = await merge([mkList(REV, revRows, 2), mkList(OLD, oldRows, 1)]);
    ok('파일 순서가 바뀌어도 같은 결과', g1r.report.listTotal === 245 && (g1r.report.revCancelCns || []).length === 85);

    // ③ 다른 리스트에 또 있는 컨은 취소가 아니다(합본에 남고 revCancelCns 에서 빠진다)
    const keep3 = FX.cancelled.slice(0, 3);
    const g2 = await merge([mkList(OLD, oldRows, 1), mkList(REV, revRows, 2), mkList('STSE 2678W CLL (CSC).xls', keep3.map((c) => [c, 'E']), 3)]);
    const wb2 = XLSX.read(Buffer.from(g2.xlsxBase64, 'base64'), { type: 'buffer' });
    const cns2 = new Set(XLSX.utils.sheet_to_json(wb2.Sheets.LOADING_LIST).map((r) => r['Cntr No']));
    ok('다른 리스트에 또 있는 3대는 합본에 남는다(248)', keep3.every((c) => cns2.has(c)) && g2.report.listTotal === 248, String(g2.report.listTotal));
    ok('그 3대는 revCancelCns 에서 빠진다(82대)', (g2.report.revCancelCns || []).length === 82 && keep3.every((c) => !(g2.report.revCancelCns || []).includes(c)), String((g2.report.revCancelCns || []).length));

    // ④ 개정판 판정 종전 규칙은 그대로(끝 번호 개정판 — 통째 교체)
    const g3 = await merge([mkList('CLL X 2030W.xlsx', FX.full.map((c) => [c, 'F']), 1), mkList('CLL X 2030W1.xlsx', FX.full.slice(0, 20).map((c) => [c, 'F']), 2)]);
    const gp3 = g3.report.perFile.find((p) => p.name === 'CLL X 2030W.xlsx');
    ok('끝 번호 개정판은 종전처럼 옛 판을 통째로 뺀다', !!gp3 && gp3.kind === 'list(구판 제외)' && g3.report.listTotal === 20 && !(g3.report.revCancelCns || []).length, JSON.stringify(gp3));

    // ⑥ 독립 감사 반영 — 과철회 방지
    //   (가) 실번호 EDI 에 있는 컨은 개정판이 빼도 취소가 아니다(EDI 가 내용의 진실). 실제 선적 EDI(PCSZ 2632W 70컨)를 그대로 쓴다.
    const ediTxt = fs.readFileSync(path.join(ROOT, 'tools/fixtures/pcsz_2632w_load_edi_40702.edi'));
    const ediFile = { name: 'PCSZ-2632W LOAD EDI FILE.EDI', mtime: 1, buffer: new Uint8Array(ediTxt) };
    const ediCns = (M.parseBAPLIE(ediTxt.toString('latin1')).containers || []).filter((c) => /^[A-Z]{4}\d{7}$/.test(String(c.cn || ''))).map((c) => c.cn);
    ok('실제 EDI 픽스처 — 실번호 컨 70대', ediCns.length === 70, String(ediCns.length));
    const OLD6 = 'PCSZ2632WCN_CONTAINERLIST.XLS', REV6 = 'PCSZ2632WCN_REVISED EMPTY CONTAINERLIST.XLS';
    const keep6 = ediCns.slice(0, 42);   // 60%
    const g6 = await merge([ediFile, mkList(OLD6, ediCns.map((c) => [c, 'E']), 1), mkList(REV6, keep6.map((c) => [c, 'E']), 2)]);
    const rows6 = XLSX.utils.sheet_to_json(XLSX.read(Buffer.from(g6.xlsxBase64, 'base64'), { type: 'buffer' }).Sheets.LOADING_LIST);
    ok('실번호 EDI 에 있는 컨 70대는 개정판이 빼도 합본에 남는다(취소 0)', g6.report.ediHasCn === true && rows6.length === 70 && !(g6.report.revCancelCns || []).length && !(g6.report.missingCns || []).length, JSON.stringify([g6.report.ediHasCn, rows6.length, (g6.report.revCancelCns || []).length, (g6.report.missingCns || []).length]));
    const pf6 = g6.report.perFile.find((p) => p.name === OLD6);
    ok('되살린 컨은 파일별 취소 수에서도 빠진다', !!pf6 && !pf6.revDropped && pf6.count === 70, JSON.stringify(pf6));
    //   EDI 에 70대 중 일부만 있으면(예 첫 40대) 그 40대만 남고 나머지 취소분은 종전대로 빠진다 — EDI 밖 정리와 겹치지 않는다.
    const g6b = await merge([mkList(OLD6, ediCns.map((c) => [c, 'E']), 1), mkList(REV6, keep6.map((c) => [c, 'E']), 2)]);
    ok('EDI 가 없으면 종전 취소 그대로(70 → 42, 취소 28)', g6b.report.listTotal === 42 && (g6b.report.revCancelCns || []).length === 28, JSON.stringify([g6b.report.listTotal, (g6b.report.revCancelCns || []).length]));
    //   (나) 개정판 뒤에 늦게 온 전체 리스트(…CONTAINERLIST1.XLS)는 «옛 원본» 이 아니다 — 그 공컨을 취소하지 않는다.
    const g7 = await merge([mkList(OLD, oldRows, 1), mkList(REV, revRows, 2), mkList('STSE2678WCN_CONTAINERLIST1.XLS', oldRows, 3)]);
    ok('개정판 뒤에 늦게 온 전체 리스트(…LIST1)는 취소하지 않는다 — 합본 330 · 취소 0', g7.report.listTotal === 330 && !(g7.report.revCancelCns || []).length, JSON.stringify([g7.report.listTotal, (g7.report.revCancelCns || []).length]));
    ok('옛 원본이 끝 숫자·개정 표시를 가지면 규칙 밖(listRevRank > 0)', D([{ name: 'STSE2678WCN_CONTAINERLIST1.XLS', mtime: 1 }, { name: REV, mtime: 2 }], (x) => (x === REV ? sets[REV] : sets[OLD]), (x, c) => (x === REV ? fes[REV] : fes[OLD])[c] || '').size === 0);

    // ⑤ 소스 연결
    const me = fs.readFileSync(path.join(ROOT, 'merge_entry.js'), 'utf8');
    ok('merge_entry.js 가 listRevision.js 의 한 벌을 쓴다(자체 판정 없음)', /listPartialRevisionDrops/.test(me) && !/EMPTY_WORD_RE\s*=/.test(me));
  } catch (e) { bad += 1; console.log('  ✘ 예외 — ' + (e && e.stack || e)); }
  console.log(`4.07-02 연막검사 ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})();
