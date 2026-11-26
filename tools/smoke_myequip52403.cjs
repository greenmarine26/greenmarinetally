// 5.24-03 연막검사 — 작업 보고 «내 호기»는 그 조 등록 호기가 먼저(실자료 SWAL 2611N: 김성일 4호기 등록, 3호기만 양하 시작 기록).
const path = require('path'); const fs = require('fs');
const ROOT = process.argv[2] || process.cwd();
let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };
(async () => {
  const U = await import(path.join(ROOT, 'src/utils.js'));
  const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/myequip52403.json'), 'utf8'));
  const v = { info: FX.info, reports: FX.reports };
  const EQ = ['1호기', '2호기', '3호기', '4호기'];
  ok(U.myReportEquipOf(v, '김성일', EQ, '') === '4호기', '김성일 — 폰 머리 호기 없어도 등록 호기 4호기');
  ok(U.myReportEquipOf(v, '김성일', EQ, '3호기') === '4호기', '김성일 — 폰 머리가 3호기여도 등록 호기 4호기');
  ok(U.myReportEquipOf(v, '최원형', EQ, '') === '3호기', '최원형 — 등록 호기 3호기');
  ok(U.myReportEquipOf({ info: {}, reports: FX.reports }, '최원형', EQ, '') === '3호기', '등록 없으면 마지막 시작 보고 호기(최원형 3호기)');
  ok(U.myReportEquipOf({ info: {}, reports: {} }, '홍길동', EQ, '2호기') === '2호기', '둘 다 없으면 폰 머리 호기');
  ok(U.myReportEquipOf({ info: {}, reports: {} }, '홍길동', EQ, '7호기') === '', '부두에 없는 호기는 버림');
  const src = fs.readFileSync(path.join(ROOT, 'src/components/WorkReportModal.jsx'), 'utf8');
  ok(/myReportEquipOf\(voyage, inspector, equipNumbers, getEquipNumber\(\)\)/.test(src), '작업 보고 창이 한 벌 판정을 부른다');
  ok(/data-my-equip-nostart="1"/.test(src), '내 호기 시작 기록 없을 때 내 호기 완료 단추');
  ok(/useState\(myEquip \|\| lastEquip \|\| '1호기'\)/.test(src) && /if \(open && myEquip\) setManualEquip\(myEquip\)/.test(src), '수동 보고 호기도 내 호기로 시작');
  console.log(`smoke_myequip52403 ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('✗ 실행 오류', e); process.exit(1); });
