// 3.61-02 연막검사 — 같은 기본이름 리스트는 컨이 반 넘게 겹치면 새 판만(src/listRevision.js 한 벌 · 양하 자동 등록 autoRegApi · 선적 합본 merge_entry). 픽스처는 TMPZ 2030E 양하 EAS CDL 실데이터(컨번호만).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix36102_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = globalThis;
(async () => {
  try {
    fs.writeFileSync(path.join(TMP, 'e.mjs'), `export * from "${ROOT}/src/listRevision.js";\nexport { buildAutoPayload } from "${ROOT}/src/autoRegApi.js";\nimport "${ROOT}/merge_entry.js";\n`);
    execSync(`npx esbuild "${path.join(TMP, 'e.mjs')}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${path.join(TMP, 'b.cjs')}"`, { cwd: ROOT, stdio: 'pipe' });
    const M = require(path.join(TMP, 'b.cjs'));
    const XLSX = require(path.join(ROOT, 'node_modules/xlsx'));
    //  node 에서 SheetJS 는 window 가 있으면 빈 객체를 window.XLSX 에 얹는다(브라우저 헬퍼에서는 없는 일) — 진짜 SheetJS 로 바꿔 둔다.
    globalThis.XLSX = XLSX;
    const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/tmpz_cdl_revision_36102.json'), 'utf8'));
    const mkList = (name, cns, mtime, pol = 'CNNGB', pod = 'KRPTK') => {
      const rows = [['NO', 'CNTR NO', 'SIZE', 'F/E', 'POL', 'POD']].concat(cns.map((c, i) => [i + 1, c, '45G1', 'F', pol, pod]));
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1');
      const u8 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      return { name, mtime, arrayBuffer: async () => new Uint8Array(u8).buffer };
    };
    const OLD = 'CDL TMPZ EAS 2030E.xlsx', NEW = 'CDL TMPZ EAS 2030E1.xlsx';
    const gone = FX.old.filter((c) => !FX.new.includes(c));
    ok('픽스처 — 옛 판 50 · 새 판 47 · 새 판에서 빠진 3대', FX.old.length === 50 && FX.new.length === 47 && gone.length === 3, JSON.stringify(gone));
    // ① 판정 한 벌
    ok('기본이름 — «…2030E.xlsx» 와 «…2030E1.xlsx» 는 같은 묶음', M.listBaseKey(OLD) === M.listBaseKey(NEW));
    ok('개정 서열 — 끝 번호 1 이 번호 없음보다 새 판', M.listRevRank(NEW) > M.listRevRank(OLD) && M.newerListRev({ name: NEW, mtime: 1 }, { name: OLD, mtime: 2 }));
    ok('개정 서열 — 최종 > REVISED > 끝 번호', M.listRevRank('X 최종.xlsx') > M.listRevRank('X REVISED.xlsx') && M.listRevRank('X REVISED.xlsx') > M.listRevRank('X2.xlsx'));
    const sets = { [OLD]: new Set(FX.old), [NEW]: new Set(FX.new) };
    const d1 = M.listRevisionDrops([{ name: OLD, mtime: 1 }, { name: NEW, mtime: 2 }], (x) => sets[x]);
    ok('구판 판정 — 옛 CDL 만 뺀다(겹침 47/47)', d1.size === 1 && d1.has(OLD), JSON.stringify([...d1]));
    const d2 = M.listRevisionDrops([{ name: 'LIST.xlsx', mtime: 1 }, { name: 'LIST1.xlsx', mtime: 2 }], (x) => (x === 'LIST.xlsx' ? new Set(['AAAU1111111', 'AAAU2222222']) : new Set(['BBBU1111111', 'BBBU2222222'])));
    ok('같은 이름이라도 컨이 안 겹치면(다른 선사) 둘 다 쓴다 — SWSP 2606S 규칙', d2.size === 0);
    ok('이름이 다른 리스트는 묶지 않는다', M.listRevisionDrops([{ name: 'TMPZ V-2030E SHA NOLIST.xlsx' }, { name: 'TMPZ V-2030E NGB NOLIST.xlsx' }], () => new Set(['X'])).size === 0);
    // ② 양하 자동 등록(실소스 buildAutoPayload)
    const SHA = mkList('TMPZ V-2030E SHA NOLIST.xlsx', ['TGHU0000001', 'TGHU0000002', 'TGHU0000003'], 3);
    const run = async (files) => M.buildAutoPayload(files, { vslCode: 'TMPZ', voy: '2030E', mode: 'discharge' });
    const rOld = await run([mkList(OLD, FX.old, 1), SHA]);
    ok('종전 증상 재현 — 옛 판만이면 53(옛 50 + 3)', Object.keys(rOld.records).length === 53, String(Object.keys(rOld.records).length));
    const rBoth = await run([mkList(OLD, FX.old, 1), mkList(NEW, FX.new, 2), SHA]);
    const keys = Object.keys(rBoth.records);
    ok('두 판이 다 오면 50(새 47 + 3) — 옛 판에만 있던 3대 없음', keys.length === 50 && gone.every((c) => !rBoth.records[c]), String(keys.length));
    ok('남은 CDL 컨은 전부 새 판 출처', FX.new.every((c) => rBoth.records[c] && rBoth.records[c]._source === NEW));
    const pf = (rBoth.perFile || []).find((p) => p.name === OLD);
    ok('옛 판은 파일별 인식에 «list(구판 제외)» 로 남는다', !!pf && pf.kind === 'list(구판 제외)', JSON.stringify(pf));
    const rDisj = await run([mkList('CLL X 2030E.xlsx', ['AAAU1111111', 'AAAU2222222'], 1), mkList('CLL X 2030E1.xlsx', ['BBBU1111111', 'BBBU2222222'], 2)]);
    ok('자동 등록도 안 겹치는 같은 이름 리스트는 둘 다(4대)', Object.keys(rDisj.records).length === 4);
    // ③ 선적 합본(merge_entry) 이 같은 판정을 쓴다
    const me = fs.readFileSync(path.join(ROOT, 'merge_entry.js'), 'utf8');
    ok('merge_entry.js 가 listRevision.js 를 쓴다(자체 사본 없음)', /from '\.\/src\/listRevision\.js'/.test(me) && !/const baseKey\s*=/.test(me) && !/OVERLAP_REV\s*=/.test(me));
    const g = await globalThis.GMmerge([mkList('CLL X 2030W.xlsx', FX.old, 1, 'KRPTK', 'CNNGB'), mkList('CLL X 2030W1.xlsx', FX.new, 2, 'KRPTK', 'CNNGB')], { loadPort: 'KRPTK' });
    const gp = ((g && g.report && g.report.perFile) || []).find((p) => p.name === 'CLL X 2030W.xlsx');
    ok('선적 합본도 옛 판을 «list(구판 제외)» 로 뺀다(종전과 같은 결과)', !!gp && gp.kind === 'list(구판 제외)', JSON.stringify(gp));
  } catch (e) { bad += 1; console.log('  ✘ 예외 — ' + (e && e.stack || e)); }
  console.log(`3.61-02 연막검사 ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})();
