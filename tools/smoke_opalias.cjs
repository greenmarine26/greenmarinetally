// 마감텔리 선사 칸 — 선적 DWS 를 CSC·DSL 로 가르고 규격 칸이 정본과 같은지 잰다(3.31).
//   김명보 부장 메모 2026-09-08 «선적 dws ==csc dsl로 구분» · 정본 마감텔리 22건 실측.
//   ⚠ 검사는 되도록 **동작**으로 잰다 — 소스 문자열만 물면 서식이 바뀔 때 조용히 통과한다(감사 지적).
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || path.resolve(__dirname, '..');
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('마감텔리 선사·규격 칸 (3.31)');

const url = (f) => 'file://' + path.join(ROOT, f).replace(/\\/g, '/');
const run = (expr) => JSON.parse(execSync(`node --input-type=module -e "${expr}"`, { encoding: 'utf8' }).trim());
const FMT = url('src/data/tallyFormats.js');
const RPT = url('src/tallyReport.js');

//  ① 배별 사전 — 부모·자식이 정본 순서대로 있는가(동작으로)
const A = run(`import('${FMT}').then(m=>{const F=m.TALLY_FORMATS;console.log(JSON.stringify([`
  + `F.STSE.subOps.DWS,F.STMJ.subOps.DWS,F.TMPZ.subOps.TJM,F.STSE.ops,`
  + `m.opParent(F.STSE,'CSC'),m.opParent(F.STSE,'SIT'),m.subIndex(F.STSE,'DSL'),m.subIndex(F.STSE,'CSC')]))})`);
ok(JSON.stringify(A[0]) === '["CSC","DSL"]', 'STSE 부모 DWS 아래 자식 CSC·DSL');
ok(JSON.stringify(A[1]) === '["CSC","DSL"]', 'STMJ 도 같다 — 같은 SITC 계열이다');
ok(JSON.stringify(A[2]) === '["DWS","MAS"]', 'TMPZ 는 부모 TJM 아래 DWS·MAS — 부모·자식이 이 배만의 일이 아니다');
ok(JSON.stringify(A[3]) === '["SIT","DWS","TJM","EAS","WDG","SKR"]', 'STSE 선사 순서가 정본 Final Work 그대로');
ok(A[4] === 'DWS' && A[5] === 'SIT', 'CSC 의 부모는 DWS · SIT 은 제 자신');
ok(A[6] === 1 && A[7] === 0, '(CSC) 다음 (DSL) — 정본 줄 순서');

//  ② 별칭 — 배별이고, 근거 없으면 안 가른다
const B = run(`import('${FMT}').then(m=>{const M=(v,l)=>m.shipOpMapper(v,l);console.log(JSON.stringify([`
  + `M('STSE',['DWS','CSC','SIT'])('DWS'),M('STSE',['DWS','SIT'])('DWS'),M('STSE',['DWS'])('WDF'),`
  + `M('DXQD',['DWS','CSC'])('DWS'),M('XTPG',['WDF'])('WDF'),M('',['DWS','CSC'])('DWS'),`
  + `M('STSE',['DWS','CSC'])('SIT'),M('STSE',['DWS','CSC'])('DSL'),M('TMPZ',['DWS','MAS'])('DWS')]))})`);
ok(B[0] === 'DSL', 'CSC 가 함께 있으면(=선사별 CLL 이 왔으면) 남는 DWS 는 DSL 이다');
ok(B[1] === 'DWS', '⛔ CSC 가 하나도 없으면 가를 근거가 없다 — DWS 그대로 둔다(지어내지 않는다)');
ok(B[2] === 'WDG', 'WDF → WDG 는 순수한 이름 바꿈이라 조건이 없다');
ok(B[3] === 'DWS', 'DXQD 는 CSC 가 있어도 DWS 그대로 — 이 배 정본이 DWS 다');
ok(B[4] === 'WDF', 'XTPG 의 WDF 도 그대로');
ok(B[5] === 'DWS', '배를 모르면 원래 값 — 모르는 배에 남의 규칙을 씌우지 않는다');
ok(B[6] === 'SIT' && B[7] === 'DSL', '별칭 없는 코드·이미 자식인 코드는 안 바뀐다');
ok(B[8] === 'DWS', 'TMPZ 의 DWS 는 그 배의 자식 이름이라 안 바꾼다');

//  ③ 규격 칸 — 코드 계열 둘을 다 읽되 HC 는 40ft 만
const ISO = ['40HC', '40HR', '40GP', '40RF', '45GP', '45RE', '436E', '20GP', '20OT', 'L5G1', '9500', '22GE',
  '20HC', '20HR', '20HQ', '2280', '228E', '42G1', '4310'];
const isoLit = `[${ISO.map((x) => `'${x}'`).join(',')}]`;   // 셸이 겹따옴표를 먹으므로 홑따옴표로 짠다
const S = run(`import('${RPT}').then(m=>console.log(JSON.stringify(${isoLit}.map(i=>m.tallySizeCol({iso:i})))))`);
const g = (i) => S[ISO.indexOf(i)];
ok(g('40HC') === 'HC' && g('40HR') === 'HC', '약식 40HC·40HR 은 HC 칸 — 종전엔 40 칸으로 떨어져 양하 204대가 어긋났다');
ok(g('40GP') === '40' && g('40RF') === '40', '40GP·40RF 는 40 칸 그대로');
ok(g('45GP') === 'HC' && g('45RE') === 'HC', 'ISO 6346 45GP·45RE 는 40ft 하이큐브라 HC — 45ft 가 아니다');
ok(g('436E') === '40' && g('4310') === '40' && g('42G1') === '40',
  "436E·4310·42G1 은 40 칸 — 둘째 자리 2·3 은 9'0\" 이하라 하이큐브가 아니다(정본 436E 실측)");
ok(g('20HC') === '20' && g('20HR') === '20' && g('20HQ') === '20',
  '⛔ 20ft 하이큐브는 20 칸이다 — 실측 ZXJU0130421(OBWH 세 항차). HC 칸은 40ft 짜리만 간다');
ok(g('2280') === '20' && g('228E') === '20', '같은 박스의 ISO 표기(2280·228E)도 20 칸 — 표기 계열에 따라 갈리면 안 된다');
ok(g('20GP') === '20' && g('20OT') === '20' && g('22GE') === '20', '20GP·20OT·22GE 는 20 칸');
ok(g('L5G1') === '45' && g('9500') === '45', 'L5G1·9500 은 진짜 45ft');

//  ④ matrixRows — 자리 찾기 키는 원래 값, 표에 찍는 글자만 라벨
const M = run(`import('${RPT}').then(m=>{`
  + `const f1={ops:['SIT','DWS'],subOps:{DWS:['CSC','DSL']},ports:['TAO']};`
  + `const d1={CSC:{TAO:{F:{'20':3}}},DSL:{TAO:{F:{'20':4}}},SIT:{TAO:{F:{'20':1}}}};`
  + `const f2={ops:['TJM','EAS'],subOps:{TJM:['DWS','MAS']},ports:['NGB','SHA']};`
  + `const d2={DWS:{NGB:{F:{'20':2}}},MAS:{SHA:{F:{'20':5}}},EAS:{NGB:{F:{'20':1}}}};`
  + `console.log(JSON.stringify([m.matrixRows(d1,{},{},f1).map(r=>[r.op,r.port,r.opLabel,r.portLabel,r.fe]),`
  + `m.matrixRows(d2,{},{},f2).map(r=>[r.op,r.port,r.opLabel,r.portLabel,r.fe])]))})`);
const R1 = M[0]; const R2 = M[1];
ok(R1[0][2] === 'SIT' && R1.some((r) => r[2] === 'DWS'), '정렬·라벨은 부모 이름으로 — 자식이 맨 뒤로 안 밀린다');
ok(R1.some((r) => r[2] === 'DWS' && r[3] === '(CSC) TAO') && R1.some((r) => r[2] === 'DWS' && r[3] === '(DSL) TAO'),
  '표에 찍는 포트 칸이 «(CSC) TAO» · «(DSL) TAO»');
ok(R1.findIndex((r) => r[3] === '(CSC) TAO') < R1.findIndex((r) => r[3] === '(DSL) TAO'), '(CSC) 가 (DSL) 보다 앞');
ok(!R1.some((r) => r[2] === 'CSC' || r[2] === 'DSL'), '선사 칸 라벨에는 자식 이름이 안 찍힌다 — 정본은 부모 한 번이다');
ok(R1.some((r) => r[0] === 'CSC' && r[1] === 'TAO'),
  '⛔ `op`·`port` 는 원래 값 그대로 — 변형 양식(TMPZ)이 이 값으로 행을 찾는다');
ok(R2.some((r) => r[0] === 'DWS' && r[1] === 'NGB' && r[2] === 'TJM' && r[3] === '(DWS) NGB'),
  'TMPZ 도 키는 «DWS|NGB»(템플릿 pairRows 와 같은 꼴) · 글자는 «TJM» + «(DWS) NGB»');
ok(R2.some((r) => r[0] === 'MAS' && r[1] === 'SHA' && r[3] === '(MAS) SHA'), 'TMPZ (MAS) SHA 도 같다');

//  ⑤ 엑셀이 라벨을 쓰는가 — 표에 찍는 자리만 라벨, 자리 찾기는 원래 값
const xl = fs.readFileSync(path.join(ROOT, 'src/tallyExcel.js'), 'utf8');
ok(/row\.opLabel \|\| row\.op/.test(xl) && /row\.portLabel \|\| row\.port/.test(xl), '엑셀 Final Work 가 라벨로 찍는다');
ok(/want\[`\$\{row\.op\}\|\$\{row\.port\}\|\$\{row\.fe\}`\]/.test(xl),
  '변형 양식 매칭 키는 원래 값 그대로 — 라벨을 넣으면 그 배 숫자가 통째로 버려진다');

//  ⑥ 판정 한 벌 — 제 목록을 따로 만드는 화면이 전부 같은 매퍼를 지난다(규범 §4-4)
for (const f of ['src/tallyReport.js', 'src/workingReport.js', 'src/inspectionList.js',
  'src/pages/VoyagePage.jsx', 'src/pages/ChiefDashboard.jsx', 'src/mirCtx.js' /* 3.41: 홈의 전 항차 펼치기가 mirCtx.flattenVoyages 한 벌로 옮겨 갔다 — 홈·떠 있는 미르가 같이 쓴다 */,
  'src/components/PrintHubModal.jsx']) {
  ok(/shipOpMapper/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')), `${f} 가 같은 매퍼를 지난다`);
}
const rpt = fs.readFileSync(path.join(ROOT, 'src/tallyReport.js'), 'utf8');
ok(/remarks: _op\(r\.op\)/.test(rpt), 'Act. Cntr-Seal 시트도 같은 벌 — 한 워크북에서 코드가 두 벌이면 안 된다');
ok(/fe: s\.fe \|\| '', wt: s\.wt \|\| '', op: _op\(s\.op\)/.test(rpt), 'SHIFTING 시트도 같은 벌');

console.log(fail ? `✗ ${fail}항 실패` : '✓ 전부 통과');
process.exit(fail ? 1 : 0);
