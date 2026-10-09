// 마감텔리 선사 칸 — 선적 DWS 를 CSC·DSL 로 가르고 규격 칸이 정본과 같은지 잰다(3.31).
//   김명보 부장 메모 2026-09-08 «선적 dws ==csc dsl로 구분» · 정본 마감텔리 22건 실측.
//   ⚠ 검사는 되도록 **동작**으로 잰다 — 소스 문자열만 물면 서식이 바뀔 때 조용히 통과한다(감사 지적).
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || path.resolve(__dirname, '..');
let fail = 0;
const ok = (c, m, why) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (!c && why ? '  ← ' + why : '')); if (!c) fail++; };
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

//  ②-B 3.51-02 — SOC 는 선사가 아니다(김명보 부장 «TMPZ 양하 SOC는 TJM으로 바꾸시오»)
const C = run(`import('${FMT}').then(m=>{const M=(v,l)=>m.shipOpMapper(v,l);console.log(JSON.stringify([`
  + `M('TMPZ',['TJM','EAS','SOC'])('SOC'),M('TMPZ',['SOC'])('SOC'),M('TMPZ',['TJM','SOC'])('TJM'),`
  + `M('TMPZ',['TJM','SOC'])('EAS'),M('STSE',['DWS','CSC','SOC'])('SOC'),M('DXQD',['DWS','SOC'])('SOC'),`
  + `M('',['SOC'])('SOC'),(m.TALLY_FORMATS.TMPZ.opAlias&&m.TALLY_FORMATS.TMPZ.opAlias.SOC)||null,m.TALLY_FORMATS.TMPZ.opAliasNeeds===undefined]))})`);
ok(C[0] === 'TJM', 'TMPZ 의 SOC 는 TJM — EDI 운송인 칸의 «화주 소유» 표식이지 선사가 아니다');
ok(C[1] === 'TJM', '⛔ 조건 없이 바꾼다 — DWS→DSL 과 달리 «가를 근거»가 필요한 일이 아니다');
ok(C[2] === 'TJM' && C[3] === 'EAS', 'TMPZ 의 TJM·EAS 는 그대로 — 별칭이 남을 건드리지 않는다');
ok(C[4] === 'SOC' && C[5] === 'SOC', '⛔ 다른 배의 SOC 는 안 바꾼다 — 배별 사전이지 공용 변환표가 아니다');
ok(C[6] === 'SOC', '배를 모르면 그대로');
ok(C[7] === 'TJM' && C[8] === true, 'TMPZ.opAlias.SOC=TJM · opAliasNeeds 없음(무조건)');

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
  'src/pages/VoyagePage.jsx', 'src/pages/ChiefDashboard.jsx', 'src/mir.js' /* 3.41: 홈의 전 항차 펼치기가 mirCtx.flattenVoyages 한 벌로 옮겨 갔다 — 홈·떠 있는 미르가 같이 쓴다 */,
  'src/components/PrintHubModal.jsx',
  'src/components/SearchPanel.jsx' /* 3.51-02 감사: 이 패널도 제 목록을 따로 병합한다 — 빠져 있어서 자동 가이드 카드·끝4자리 카드·컨 상세만 SOC 였다 */]) {
  ok(/shipOpMapper/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')), `${f} 가 같은 매퍼를 지난다`);
}
const rpt = fs.readFileSync(path.join(ROOT, 'src/tallyReport.js'), 'utf8');
ok(/remarks: _op\(pickCarrierOp\(r\.op,/.test(rpt),
  'Act. Cntr-Seal 시트도 같은 벌 — 한 워크북에서 코드가 두 벌이면 안 된다(3.52: EDI 짝까지 보고 더 자세한 쪽)');
ok(/fe: s\.fe \|\| '', wt: s\.wt \|\| '', op: _op\(s\.op\)/.test(rpt), 'SHIFTING 시트도 같은 벌');

//  ⑦ 3.51-02 — 목록에 씌우면 실제로 0 이 되는가(문자열이 아니라 동작으로)
const D = run(`import('${FMT}').then(m=>{`
  + `const L=[{cn:'A',op:'TJM'},{cn:'B',op:'SOC'},{cn:'C',op:'EAS'},{cn:'D',op:'SOC'},{cn:'E',op:''},{cn:'F'}];`
  + `const sp=m.shipOpMapper('TMPZ',L.map(c=>c&&c.op));`
  + `for(const c of L){if(!c||!c.op)continue;const o=sp(c.op);if(o!==c.op)c.op=o;}`
  + `console.log(JSON.stringify([L.filter(c=>c.op==='SOC').length,L.filter(c=>c.op==='TJM').length,`
  + `L.filter(c=>c.op==='EAS').length,L.length,L[4].op,L[5].op===undefined]))})`);
ok(D[0] === 0, '씌운 뒤 SOC 는 0대 — 문자열 검사가 아니라 목록을 실제로 돌린 결과다');
ok(D[1] === 3 && D[2] === 1, 'TJM 1+2=3 · EAS 1 — 남의 코드는 안 건드린다');
ok(D[3] === 6 && D[4] === '' && D[5] === true, '⛔ 대수가 안 변하고 빈 op·op 없는 줄도 안 깨진다');

//  ⑧ 3.52 — 세관 선사와 EDI 선사 중 «더 자세한 쪽» (규범 §4-4 · 자식을 부모로 뭉개지 않는다)
//     실측 STMJ 2651E 양하 — 세관은 `DWS 17` 로 뭉치고 EDI 는 `DSL 10 + CSC 7` 로 가른다.
//     세관이 그냥 이기면 목록에서 CSC 가 사라져 opAliasNeeds 가 «가를 근거 없음» 이 되고,
//     정본 마감텔리의 «(CSC) TAO» · «(DSL) TAO» 두 줄이 통째로 사라진다(3.31 되돌리기).
const UTL = url('src/utils.js');
const E = run(`import('${UTL}').then(m=>{const P=m.pickCarrierOp;console.log(JSON.stringify([`
  + `P('TJM','SOC','TMPZ'),P('TJM','OLL','TMPZ'),P('DWS','DSL','STMJ'),P('DWS','CSC','STMJ'),`
  + `P('DWS','DSL','STSE'),P('TJM','DWS','TMPZ'),P('TJM','MAS','TMPZ'),P('SIT','SIT','STMJ'),`
  + `P('','SOC','TMPZ'),P('TJM','','TMPZ'),P('DWS','SIT','STMJ'),P('TJM','DSL','TMPZ'),`
  + `P('TJM','SOC',''),P('','','TMPZ')]))})`);
ok(E[0] === 'TJM' && E[1] === 'TJM', '⛔ SOC·OLL 은 누구의 자식도 아니다 — 세관 선사가 이긴다');
ok(E[2] === 'DSL' && E[3] === 'CSC', '⛔ EDI 가 자식이면 EDI 를 지킨다 — 세관이 뭉친 DWS 가 DSL·CSC 를 덮지 않는다');
ok(E[4] === 'DSL', 'STSE 도 같다 — 배별 사전이 자식을 안다');
ok(E[5] === 'DWS' && E[6] === 'MAS', 'TMPZ 의 DWS·MAS 도 TJM 의 자식이라 살아남는다');
ok(E[7] === 'SIT', '같은 값이면 그대로');
ok(E[8] === 'SOC' && E[9] === 'TJM', '한쪽이 비면 있는 쪽 — 세관이 안 온 항차는 종전대로다');
ok(E[10] === 'DWS' && E[11] === 'TJM', '자식이 아닌 다른 선사면 세관이 기준');
ok(E[12] === 'TJM' && E[13] === '', '배를 몰라도 세관이 기준 · 둘 다 비면 빈칸');

//  ⑨ 3.52 — **`pickCarrierOp` 도 «한 벌» 이다.** 리스트 op 가 EDI op 를 덮는 자리는 전부 이것을 지나야 한다.
//     감사 실측(3.52 1차) — `shipOpMapper` 만 세던 ⑥ 때문에, 화면 본류(VoyagePage 의 containersBase)와
//     대외 인쇄물(PrintHubModal)이 안 지나는 채로 «전부 통과» 가 찍혔다. 세는 대상을 함수로 바꾼다.
for (const f of ['src/pages/VoyagePage.jsx', 'src/components/SearchPanel.jsx', 'src/components/PrintHubModal.jsx',
  'src/tallyReport.js', 'src/workingReport.js', 'src/mir.js',
  'src/pages/ChiefDashboard.jsx' /* 3.52 재감사: 보드 컨 상세가 리스트 op 를 EDI 위에 그냥 펼치고 있었다 */]) {
  ok(/pickCarrierOp\(/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')), `${f} 가 pickCarrierOp 를 지난다`);
}
{
  const vp = fs.readFileSync(path.join(ROOT, 'src/pages/VoyagePage.jsx'), 'utf8');
  ok((vp.match(/pickCarrierOp\(/g) || []).length >= 2,
    '⛔ VoyagePage 는 병합 경로가 둘이다 — 한 곳만 고치면 화면 본류로 샌다(감사 실측 17대)');
  //  ⛔ 수석 보드도 병합 경로가 둘이다(보드 카드 · 컨 상세). 파일에 `shipOpMapper` 가 한 번만 있으면
  //    컨 상세가 배별 사전을 안 지나 그 화면만 딴 선사를 보인다(재감사 실측 DXQD 250대).
  const cd = fs.readFileSync(path.join(ROOT, 'src/pages/ChiefDashboard.jsx'), 'utf8');
  ok((cd.match(/shipOpMapper\(/g) || []).length >= 2,
    '⛔ ChiefDashboard 는 shipOpMapper 를 두 곳에서 부른다(보드 카드 · 컨 상세)');
  ok((cd.match(/pickCarrierOp\(/g) || []).length >= 1, 'ChiefDashboard 가 pickCarrierOp 도 지난다');
}

//  ⑩ 3.52 — 선사 코드표가 **세 벌**이다. 셋이 갈리면 화면·검수리스트·정산 바우처가 다른 선사를 말한다.
{
  const grab = (f, name) => {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const i = t.indexOf(`const ${name} = {`);
    if (i < 0) return null;
    const body = t.slice(i, t.indexOf('};', i));
    const m = {};
    for (const mm of body.matchAll(/'([A-Z0-9]+)':\s*'([A-Z0-9]+)'/g)) m[mm[1]] = mm[2];
    return m;
  };
  const A = grab('src/utils.js', 'CARRIER_MAP_COLOR');
  const B = grab('src/inspectionList.js', 'CARRIER_MAP');
  const C = grab('src/workingReport.js', 'CARRIER_MAP');
  ok(!!A && !!B && !!C, '선사 코드표 셋을 다 찾았다');
  if (A && B && C) {
    ok(JSON.stringify(A) === JSON.stringify(B) && JSON.stringify(B) === JSON.stringify(C),
      '⛔ 선사 코드표 세 벌이 같다(utils · inspectionList · workingReport)',
      `${Object.keys(A).length}/${Object.keys(B).length}/${Object.keys(C).length}`);
    ok(A.NOL === undefined, '⛔ NOL 은 공용 코드표에 없다 — 배별 사전이다(공용표에 넣었더니 마감텔리만 NOL 로 남았다)');
  }
}

//  ⑪ 3.52 — **`NOL` 은 DXQD 배의 EDI 운송인 칸이다**(보관 실측 2631E 250대·2636E 144대 전량).
//     검수사 «선사가 NOL로 오는것은 DWS 합니다». SOC 와 같은 꼴이라 **배별 사전**에 적는다.
//     ⛔ 공용 코드표에 넣으면 마감텔리(`ptkContainers` → `shipOpMapper`)가 그 표를 안 지나
//       화면은 DWS·Final Work 는 «NOL» 순서미확정 줄로 갈린다(감사 실측 394대).
{
  const N = run(`import('${FMT}').then(m=>{const M=(v,l)=>m.shipOpMapper(v,l);console.log(JSON.stringify([`
    + `M('DXQD',['NOL'])('NOL'),M('DXQD',['NOL','EAS'])('EAS'),M('STMJ',['NOL'])('NOL'),`
    + `M('TMPZ',['NOL'])('NOL'),M('',['NOL'])('NOL'),m.TALLY_FORMATS.DXQD.opAlias.NOL,`
    + `m.TALLY_FORMATS.DXQD.ops.indexOf('DWS')]))})`);
  ok(N[0] === 'DWS', 'DXQD 의 NOL 은 DWS — 그 배 정본 ops 가 DWS·EAS 다');
  ok(N[1] === 'EAS', '같은 배의 EAS 는 그대로');
  ok(N[2] === 'NOL' && N[3] === 'NOL' && N[4] === 'NOL',
    '⛔ 다른 배·모르는 배의 NOL 은 안 바꾼다 — 공용 변환표가 아니다');
  ok(N[5] === 'DWS' && N[6] === 0, 'DXQD.opAlias.NOL=DWS · DWS 가 정본 순서 첫 줄이라 «순서 미확정» 이 아니다');
  const UTL2 = url('src/utils.js');
  const G = run(`import('${UTL2}').then(m=>{const N2=m.normalizeCarrierCode;console.log(JSON.stringify([`
    + `N2('NOL'),N2('DWIC'),N2('SNKO'),N2('TJMS'),N2('ABCD'),N2('')]))})`);
  ok(G[0] === 'NOL', '공용 코드표는 NOL 을 안 건드린다(배별 사전이 한다)');
  ok(G[1] === 'DWS' && G[2] === 'SKR' && G[3] === 'TJM' && G[4] === 'ABC' && G[5] === null,
    '기존 코드 동작은 그대로 — 이 판이 공용 코드표를 바꾸지 않았다');
}

//  ⑫ 3.66-01 — **모든 선사기준은 마감텔리**(검수사 2026-09-28 «모든 선사기준은 마감 텔리로 해야 합니다»).
//     XTPG 542E 카고플랜 별첨1 이 세관 선사부호 앞 세 글자(CKC 42·SHI 24·KMT 8·PCS 5·SNT 2)를 찍었다.
//     실물 마감텔리(530E·531E·532E)는 CKL·SIF·KMD·DYS·CLL. 이름 바꾸기는 배별 별칭 한 곳(shipOpMapper)이 한다.
//     ⛔ 1차안(pickCarrierOp 에서 «마감텔리 코드인 쪽» 고르기)은 **별칭을 먼저 씌우는 경로**(마감텔리 입구 ptkContainers·미르)에서
//       DXQD 의 NOL→DWS 가 세관 SKR 을 먹었다(2차 시뮬·감사 실측 2638E 17·2637E 16). 그래서 여기서는 **두 순서**로 다 잰다.
{
  const os = require('os');
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'opal12-'));
  fs.writeFileSync(path.join(TMP, 'e.mjs'),
    `export { pickCarrierOp } from "${ROOT}/src/utils.js";\n`
    + `export { shipOpMapper, TALLY_FORMATS, opFromListFileName } from "${ROOT}/src/data/tallyFormats.js";\n`
    + `export { computeTallyData } from "${ROOT}/src/tallyReport.js";\n`
    + `export { flattenVoyages } from "${ROOT}/src/mir.js";\n`);
  execSync(`npx esbuild "${path.join(TMP, 'e.mjs')}" --bundle --platform=node --format=cjs --loader:.png=dataurl --loader:.jsx=jsx --jsx=automatic `
    + `--alias:firebase/app=./tools/stub_fbdb_mem.js --alias:firebase/database=./tools/stub_fbdb_mem.js --alias:firebase/storage=./tools/stub_fbdb_mem.js `
    + `--alias:pdfjs-dist/build/pdf=${ROOT}/tools/stub_pdfjs.js --log-level=error --outfile="${path.join(TMP, 'b.cjs')}"`, { cwd: ROOT, stdio: 'pipe' });
  const M = require(path.join(TMP, 'b.cjs'));
  //  경로 두 순서 — ㉮ 고르기→별칭(VoyagePage·PrintHubModal·SearchPanel·workingReport·수석 보드) ㉯ EDI 에 별칭→고르기→별칭(ptkContainers·미르)
  const fin = (vsl, rop, eop) => {
    const sp = M.shipOpMapper(vsl, [rop, eop]);
    const a = sp(rop ? M.pickCarrierOp(rop, eop, vsl) : String(eop || ''));
    const b = sp(rop ? M.pickCarrierOp(rop, sp(eop), vsl) : sp(eop));
    return a === b ? a : `${a}≠${b}`;
  };
  const cases = [
    ['XTPG', 'CKC', 'CKL', 'CKL'], ['XTPG', 'SHI', 'SIF', 'SIF'], ['XTPG', 'KMT', 'KMD', 'KMD'], ['XTPG', 'PCS', 'DYS', 'DYS'], ['XTPG', 'SNT', 'CLL', 'CLL'],
    ['XTPG', 'CKCO', 'CKL', 'CKL'], ['XTPG', 'SHIF', 'SIF', 'SIF'], ['XTPG', 'CKC', '', 'CKL'], ['XTPG', '', 'CKL', 'CKL'], ['XTPG', 'SNKO', 'SKR', 'SKR'],
    ['KSKM', 'NSL', 'NSS', 'NSL'], ['KSKM', 'KMT', 'KMD', 'KMD'], ['KSKM', '', 'NSS', 'NSL'], ['KSKM', 'PCSL', 'DYS', 'DYS'],
    ['NSFR', 'KMT', 'KMD', 'KMT'], ['NSFR', 'PCS', 'DYS', 'DYS'], ['DJCT', 'PCSL', 'DYS', 'DYS'], ['YKTD', 'PCS', 'DYS', 'DYS'],
    ['ATPR', '', 'SNK', 'SKR'], ['DPRT', '', 'SNK', 'SKR'], ['NSDC', '', 'NSMS', 'NSL'], ['NSDC', 'NSMS', '', 'NSL'],
    ['DXQD', 'SKR', 'NOL', 'SKR'], ['DXQD', 'NOL', 'NOL', 'DWS'], ['DXQD', '', 'NOL', 'DWS'], ['TMPZ', 'TJM', 'SOC', 'TJM'],
    ['STMJ', 'DWS', 'DSL', 'DSL'], ['MCAT', 'MSK', 'MAE', 'MSK'],
  ];
  const bad = cases.filter(([v, r, e, w]) => fin(v, r, e) !== w).map(([v, r, e, w]) => `${v} ${r || '-'}/${e || '-'} → ${fin(v, r, e)} (기대 ${w})`);
  ok(!bad.length, `선사 ${cases.length}경우 — 두 순서(고르기→별칭 · 별칭→고르기) 모두 그 배 마감텔리 코드`, bad.join(' · '));
  ok(fin('DXQD', 'SKR', 'NOL') === 'SKR', '⛔ DXQD 세관 SKR 은 SKR — NOL 은 선사가 아니다(검수사 «NOL은 두가지가 될수가» · 실물 템플릿 «(SKR) DLC» 줄)');
  ok(fin('MCAT', 'MSK', 'MAE') === 'MSK' && M.shipOpMapper('MCAT', ['MAE'])('MAE') === 'MAE', '실물 마감텔리가 없는 배는 종전 그대로 — 남의 배 별칭을 씌우지 않는다');
  ok(JSON.stringify(M.TALLY_FORMATS.XTPG.ops) === '["CKL","CLL","DWS","DYS","EAS","KMD","SIF","SIT","SKR","SOF","TCL","TYS","WDF"]' && JSON.stringify(M.TALLY_FORMATS.KSKM.ops) === '["KMD","NSL","DYS"]',
    'XTPG 13줄·KSKM 3줄 = 실물 Final Work 순서(누가 사전을 고치면 여기서 멈춘다)');
  //  실데이터 — 마감텔리 입구(computeTallyData)와 미르 재료(flattenVoyages)로 실제로 돌린다.
  const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/carrier_xtpg542e_real.json'), 'utf8'));
  const tallyOps = (vk) => { const D = M.computeTallyData(FX[vk]); const o = {}; for (const r of D.rows) { const n = Object.values(r.dis || {}).reduce((a, x) => a + (+x || 0), 0); if (n) o[r.op] = (o[r.op] || 0) + n; } return o; };
  const mirOps = (vk) => { const o = {}; for (const c of M.flattenVoyages({ [vk]: FX[vk] })) if (c && c.mode === 'discharge') o[c.op] = (o[c.op] || 0) + 1; return o; };
  const X = tallyOps('XTPG_542E');
  ok(!['CKC', 'SHI', 'KMT', 'PCS', 'SNT'].some((k) => X[k]) && X.CKL >= 41 && X.SIF === 24 && X.KMD === 8 && X.DYS === 5 && X.CLL === 2,
    'XTPG 542E 마감텔리 Final Work 양하 — CKL·SIF·KMD·DYS·CLL 로 선다(세관 코드 줄 0)', JSON.stringify(X));
  const XM = mirOps('XTPG_542E');
  ok(XM.CKL === 42 && XM.SIF === 24 && XM.KMD === 8 && XM.DYS === 5 && XM.CLL === 2 && !XM.CKC, 'XTPG 542E 미르·통합검색 재료도 같다(세관에만 있는 FFAU8289910 도 CKL)', JSON.stringify(XM));
  const Dq = tallyOps('DXQD_2638E'); const DqM = mirOps('DXQD_2638E');
  ok(Dq.SKR === 17 && Dq.DWS === 10 && DqM.SKR === 17 && DqM.DWS === 10,
    '⛔ DXQD 2638E 실데이터 — 세관 SKR 17대는 마감텔리·미르 모두 SKR, 세관도 NOL 인 10대는 DWS(1차안 퇴행 재발 방지)', JSON.stringify({ Dq, DqM }));
  //  별칭에 새로 들어간 낱말이 파일 이름에서 선사로 잘못 잡히지 않는가(부정 사례 — 감사 경-5)
  const neg = ['XTPG 542E SOF.xls', '20PCS LIST.xlsx', 'CLL XTPG 542W.xls', 'XTPG0542W_KRPTK_CLL 천경.xlsx'].filter((n) => M.opFromListFileName(n) !== '');
  ok(neg.length === 1 && neg[0] === 'XTPG 542E SOF.xls',
    '파일 이름 — «20PCS»·CLL 은 선사가 아니다 · SOF 는 XTPG 사전 선사라 잡힌다(실물 13줄에 있는 선사 · 지금 받은 파일 이름 604개 중 해당 0)', neg.join(','));
  //  콘앱 카고플랜도 같은 한 벌 — 별첨 병합은 pickCarrierOp(EDI 선사를 붙여서), 그리는 쪽(번들 open)은 shipOpMapper.
  const CE = fs.readFileSync(path.join(ROOT, 'src/coneCargoPlan.entry.jsx'), 'utf8');
  const CH = fs.readFileSync(path.join(ROOT, 'public/cone.html'), 'utf8');
  ok(/props = _opFixProps\(props/.test(CE) && /shipOpMapper\(code,/.test(CE) && /legendContainers: fix\(/.test(CE),
    '콘앱 카고플랜 번들 open 이 containers·legendContainers 선사를 배별 매퍼로 읽는다');
  ok(/ConeParse = \{[^}]*pickCarrierOp/.test(CE) && /_eop\[c\.cn\] \? Object\.assign\(\{\}, c, \{ op: _eop\[c\.cn\] \}\)/.test(CH) && /if\(k === 'op' && _pk\)\{ add\.op = _pk\(v, base\.op, voyageInfo\.code\)/.test(CH),
    '콘앱 별첨 병합 — EDI 선사를 붙인 뒤 리스트 선사와 pickCarrierOp 로 고른다(배 약자 = 항차 키 앞)');
  //  콘앱 원문 계산 행(masterRowsAdapter)이 선사를 싣는가 — 동작으로(재감사 중-2: 원문 EDI 로 계산한 항차는 ediRowsAll 을 쓰는데
  //    그 행에 op 가 없어 별첨 병합의 pickCarrierOp 가 EDI 쪽을 못 봤다). 실물 ASC(DJCT 0219E)를 검수앱 파서로 읽어 넣는다.
  {
    const fnOf = (name) => { const m = CH.match(new RegExp(`function ${name}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}\\n`)); return m ? m[0] : ''; };
    const src = ['coneIsReefer', 'masterRowsAdapter', 'isASC', 'isPtkPort'].map(fnOf);   // ConeOne 2.67: masterRowsAdapter 가 부르는 리퍼 판정 한 벌
    const asc = fs.readFileSync(path.join(ROOT, 'tools/fixtures/asc_djct0219e_shk.asc'), 'utf8');
    fs.writeFileSync(path.join(TMP, 'p.mjs'), `export { parseAscFile, isPyeongtaekPort } from "${ROOT}/src/utils.js";\n`);
    execSync(`npx esbuild "${path.join(TMP, 'p.mjs')}" --bundle --platform=node --format=cjs --alias:firebase/app=./tools/stub_fbdb_mem.js --alias:firebase/database=./tools/stub_fbdb_mem.js --alias:firebase/storage=./tools/stub_fbdb_mem.js --log-level=error --outfile="${path.join(TMP, 'p.cjs')}"`, { cwd: ROOT, stdio: 'pipe' });
    const PU = require(path.join(TMP, 'p.cjs'));
    const res = PU.parseAscFile(asc);
    const run2 = new Function('window', 'extractEdiDocDate', `${src.join('\n')}; return masterRowsAdapter;`)({ ConeParse: { isPyeongtaekPort: PU.isPyeongtaekPort } }, () => '');
    const out = src.every(Boolean) ? run2(res, asc) : { rowsAll: [] };
    const withOp = (res.containers || []).filter((c) => c.op).length;
    const kept = out.rowsAll.filter((r) => r.op).length;
    ok(withOp > 0 && kept === withOp, `콘앱 masterRowsAdapter 가 선사를 싣는다 — 실물 ASC ${res.containers.length}대 중 선사 ${withOp}대 → 행 ${kept}대`, `src ${src.map((x) => !!x).join(',')}`);
  }
  const CD = fs.readFileSync(path.join(ROOT, 'src/pages/ChiefDashboard.jsx'), 'utf8');
  ok(/const _opB = \(rec\.op \|\| e\.op\) \? pickCarrierOp\(rec\.op, e\.op,/.test(CD), '수석 보드 그림·별첨도 리스트 선사를 고르기 한 벌로(컨 상세와 같은 답)');
}

console.log(fail ? `✗ ${fail}항 실패` : '✓ 전부 통과');
process.exit(fail ? 1 : 0);
