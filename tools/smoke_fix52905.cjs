// 5.29-05 연막 — 통계 시간대 정렬 · 마감 점검 갱 미기록 주의 · 운영 화면 개발용 글자(M5.1·3.43부터) · 1안 설명. 소스 단언 + 정렬 함수 재현.
//   실행 — node tools/smoke_fix52905.cjs <repoRoot>
const fs = require('fs'); const root = process.argv[2] || process.cwd();
let bad = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) bad++; };
const rd = (p) => fs.readFileSync(root + '/' + p, 'utf8');
const st = rd('src/components/StatsTab.jsx');
ok(/Object\.entries\(stats\.byHour\)\.sort\(\(a, b\) => \(a\[0\] < b\[0\] \? -1 : a\[0\] > b\[0\] \? 1 : 0\)\)\.slice\(-12\)/.test(st), '통계 시간대 — 정렬한 뒤 끝 12칸');
const cmp = (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
const e = [['11/28 14시', 3], ['11/28 13시', 2], ['11/28 11시', 1], ['11/28 10시', 4], ['11/28 15시', 5], ['11/27 23시', 6], ['11/28 09시', 1]];
ok(e.sort(cmp).map((x) => x[0]).join(',') === '11/27 23시,11/28 09시,11/28 10시,11/28 11시,11/28 13시,11/28 14시,11/28 15시', 'TNJP 꼴 뒤섞인 시간 → 시간 순(자정 넘김 포함)');
const wc = rd('src/components/WorkClosingChecklist.jsx');
ok(/count: gangs\.length === 0 \? doneN : \(equipDone\.size === 0 \? doneN : doneNoEquip\)/.test(wc), '갱 미기록 대수를 주의 건수로');
ok(/\(doneNoEquip > 0 \? 'amber' : 'emerald'\)/.test(wc), '갱 미기록이 있으면 주황');
ok(/info: gangs\.length > 0 && equipDone\.size > 0,/.test(wc), '갱별 대수가 있으면 알림만(info) — 마감을 막지 않는다');
ok(!/M5\.1 · 검수 종료/.test(wc), '마감 점검 아래 «M5.1» 개발 번호 없음');
const gk = rd('src/components/GeminiKeyModal.jsx');
ok(!/3\.43부터 사진/.test(gk) && /이 기기\(브라우저\)에만 저장/.test(gk), 'AI 키 창 — 옛 판 번호 없음 · «이 기기(브라우저)»');
ok(!/지금 화면과 가장 비슷/.test(rd('src/skin.js')), '1안 설명에 «지금 화면과 가장 비슷» 없음');
ok(!/결제용/.test(rd('src/components/PrintHubModal.jsx') + rd('src/data/helpData.js') + rd('src/data/featureIndex.js')) && /📄 결재용/.test(rd('src/components/PrintHubModal.jsx')), '«결제용» → «결재용»(검수사 2026-11-28 21:15 «1 수정»)');
console.log(`  ─ ${n - bad}/${n} 통과`); process.exit(bad ? 1 : 0);
