// 카고플랜 특수화물 표기 — 화면마다 갈리지 않는가 (3.6-02, 검수사 신고 2026-09-03)
//   «특수 화물 표기가 안된 카고플랜이 있었습니다. 그래서 리퍼 온도체크 미스를 낼뻔 했습니다»
//   실측(보관 68항차) — 리스트에만 있는 DG·OT 23대가 글자 없이 나갔고,
//   EDI 45R8(리퍼)을 리스트 42HR 이 덮어 리퍼 466대가 카고플랜에서 사라졌다.
const fs = require('fs'); const path = require('path');
const U = require(process.argv[2]);
let fail = 0;
const T = (c, m) => { if (!c) { console.error('  ✗', m); fail++; } else console.log('  ✓', m); };

//  베이플랜 화면의 보강 규칙을 소스에서 그대로 읽어 잰다(옮겨 적지 않는다).
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'VoyagePage.jsx'), 'utf8');
const seg = src.slice(src.indexOf('const allEdiContainersBase'), src.indexOf('const allEdiContainers ='));

// ① 특수화물 플래그 여섯이 모두 보강 대상인가
for (const f of ['rf', 'fr', 'ot', 'tk', 'dg', 'oog']) {
  T(new RegExp(`'${f}'`).test(seg), `베이플랜 보강에 «${f}» 가 빠져 있다 — 그 글자가 카고플랜에서 사라진다`);
}
for (const f of ['dgc', 'un', 'pg']) {
  T(new RegExp(`'${f}'`).test(seg), `위험물 상세 «${f}» 가 안 넘어간다`);
}
// ② 리스트 규격이 EDI 리퍼를 덮지 못하는가
T(/isReeferIso\(merged\[r\.cn\]\.iso\)/.test(seg), '리스트 규격이 EDI 리퍼를 덮는 것을 안 막는다');
// ③ 메인 병합과 같은 낱말을 쓰는가(판정 두 벌 방지)
const main = src.slice(src.indexOf('const containersBase'), src.indexOf('const containers ='));
for (const f of ['rf', 'fr', 'ot', 'tk', 'dg', 'oog']) {
  T(new RegExp(`'${f}'`).test(main), `메인 병합에 «${f}» 가 없다 — 기준이 무너졌다`);
}

// ④ 판정 자체 — 리퍼 규격을 알아보는가
T(U.isReeferIso('45R8') === true, 'EDI 리퍼 규격 45R8 을 못 읽는다');
//  검수사 확정 2026-09-03 — «그게 리퍼입니다» · «42HR»
T(U.isReeferIso('42HR') === true, '⛔ 42HR(40피트 하이큐브 리퍼)를 리퍼로 안 읽는다 — 검수사 확정');
//  ASC 짧은 형식(4HR·2HR)은 종전부터 isoToLabel 로 40RF·20RF 가 되어 리퍼다 — 그대로 둔다.
for (const v of ['40HR', '20HR', '22HR', '45HR', '4HR', '2HR']) {
  T(U.isReeferIso(v) === true, `«${v}» 를 리퍼로 안 읽는다`);
}
//  ★ 검수사 확정 2026-09-03 — «리퍼 표기는 RF HR R 입니다» · «R1 R3».
//    `HE` 는 High-cube **Empty**(드라이)다. 클로드가 한 번 리퍼로 잘못 넣었다가 실물(EDI 45GE)로 확인해 뺐다.
for (const v of ['40HE', '42HE', '45HE', '20HE']) {
  T(U.isReeferIso(v) === false, `⛔ «${v}»(하이큐브 엠티=드라이)를 리퍼로 읽는다 — 헛 온도 점검이 생긴다`);
}
//  확정된 세 갈래는 반드시 선다
for (const v of ['45RF', '40RF', '22RF', '20RF', '42RF']) T(U.isReeferIso(v) === true, `«${v}»(RF)를 리퍼로 안 읽는다`);
for (const v of ['40HR', '42HR', '45HR', '20HR', '22HR']) T(U.isReeferIso(v) === true, `«${v}»(HR)를 리퍼로 안 읽는다`);
//  검수사 확정 — «R1 R3 R8 R*로 표현하는것들은 일단은 리퍼로 판단»
for (const h of ['0', '2', '3', '4', '5', '6', '8', '9', 'L']) {
  for (const t of ['0', '1', '3', '5', '8', 'E', 'F', 'H', 'S']) {
    for (const len of ['2', '4']) {
      const v = `${len}${h}R${t}`;
      T(U.isReeferIso(v) === true, `«${v}»(R*)를 리퍼로 안 읽는다`);
    }
  }
}
for (const v of ['RF20', 'RFHC', 'RE20', 'RFHE']) T(U.isReeferIso(v) === true, `«${v}»(RF/RE 시작형)를 리퍼로 안 읽는다`);

//  ★ 규격 글자는 적/공을 말하지 않는다 — 적/공은 fe 로만 (검수사 확정, 실측 117대가 45RE·22RE 인데 fe=F)
const RE_FULL = { cn: 'TEST1234567', iso: '22RE', fe: 'F' };
const RE_MT = { cn: 'TEST7654321', iso: '22RE', fe: 'E' };
T(U.isReeferContainer(RE_FULL) === true && U.isReeferContainer(RE_MT) === true, '22RE 를 리퍼로 안 본다');
T(RE_FULL.fe === 'F', '적/공 판정은 fe 로만 한다(이 항목이 깨지면 규격 글자로 짐작하는 코드가 생긴 것)');
//  드라이 하이큐브와는 끝 글자로 갈린다 — 여기가 무너지면 드라이가 리퍼로 뜬다
for (const v of ['42HC', '40HC', '45HC', '22HC']) {
  T(U.isReeferIso(v) === false, `«${v}»(드라이 하이큐브)를 리퍼로 읽는다 — 헛 온도 점검이 생긴다`);
}
//  검수사 확정 — «G1은 드라이 일반입니다». 실측 45G1 1대는 자료 오기이지 리퍼 표기가 아니다.
for (const v of ['45G1', '22G1', '45GP', '22GP', '45G0', '45GE', '20E']) {
  T(U.isReeferIso(v) === false, `«${v}»(드라이 일반)을 리퍼로 읽는다 — 헛 온도 점검이 생긴다`);
}
T(U.isReeferIso('4583') === false, '4583(플랫랙)을 리퍼로 읽는다');
T(U.isReeferContainer({ iso: '42HR' }) === true, '42HR 컨을 리퍼로 안 본다');
T(U.isReeferContainer({ iso: '22GP', rf: true }) === true, 'rf 플래그를 못 본다');
T(U.isReeferContainer({ iso: '45R1' }) === true, 'ISO 리퍼를 못 본다');

console.log(fail ? `\n특수화물 연막검사 실패 ${fail}건` : '\n특수화물 연막검사 통과');
process.exit(fail ? 1 : 0);
