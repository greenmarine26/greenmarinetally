// 세관 검수예정 목록(InspectCheckList.xls, TallyOne 3.59) 파서·매처를 2026-09-23 실파일과 진행 14항차로 재는 연막검사
const fs = require('fs'); const path = require('path');
const B = process.argv[2]; if (!B) { console.error('사용법: node tools/smoke_inspectcheck.cjs <번들.cjs>'); process.exit(1); }
const V = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/inspectcheck_voyages_20260923.json'), 'utf8'));
global.window = { __fbShipBayDict: Object.fromEntries(Object.entries(V.names).map(([k, n]) => [k, { name: n }])) };
const M = require(path.resolve(B));
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('세관 검수예정 목록 — 실파일 2026-09-23 × 진행 14항차 (TallyOne 3.59)');
const rows = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/inspectcheck_20260923_rows.json'), 'utf8'));
const parsed = M.parseInspectCheckRows(rows); const list = {}; for (const r of parsed) list[r.mrn] = r;
ok(parsed.length === 22 && list['26SNKO3436I'] && list['26SNKO3436I'].landing === '제출중', `22줄을 머리 이름으로 읽는다 (${parsed.length})`);
const want = { SWTD_9014E: '26SNKO3436I', OBWH_2747E: '26YTFF2747I', XTPG_542E: '26SHIFP542I', RZOR_R104E: '26HTFR104EI', DXQD_2638E: '26NOLS638EI', PCSZ_2628E: '26SNKO3381I', ATPR_2643W: null, NSDC_2609N: null };
for (const [k, m] of Object.entries(want)) { const r = M.matchInspectCheck(list, V.infos[k]); ok((r ? r.mrn : null) === m, `${k} → ${m || '없음'} (${r ? r.mrn : '없음'})`); }
let n = 0; for (const k of Object.keys(V.infos)) if (M.matchInspectCheck(list, V.infos[k])) n++;
ok(n === 12, `진행 14항차 중 12척에 번호가 붙는다 (${n})`);
ok(M.matchInspectCheck(list, { ...V.infos.XTPG_542E, voy: '541E', voy_d: '541E' }).mrn === '26SHIFP541I', '같은 배 다른 항차는 그 항차 번호 — 0542E/541E 를 섞지 않는다');
ok(M.matchInspectCheck(list, { vsl: 'ZZZZ', voy: '9014E' }) === null, '이름을 모르는 배는 억지로 붙이지 않는다(항차만 같아도)');
ok(M.inspectStatusText(list['26SNKO3436I']) === '적하목록 선별마감 · 하선신고 제출중 · 이상보고 미입력', '서류 상태 한 줄');
let threw = false; try { M.parseInspectCheckRows([['a', 'b'], ['c', 'd']]); } catch (e) { threw = /검수예정 목록 파일이 아닙니다/.test(e.message); }
ok(threw, '다른 파일을 올리면 알린다');
if (fail) { console.log(`✗ ${fail}건 실패`); process.exit(1); } console.log('✓ 통과');
