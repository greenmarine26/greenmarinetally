// 2.77 밀린 버그 세 건 — 9월 전에 치워야 할 것들.
//   ① X-RAY 화면에서 MRN 을 직접 적는다 (2.71 에서 «다음 판» 으로 미룬 것)
//   ② 복구 코드가 틀렸을 때 «지금 등록된 코드는 언제 만든 것인지» 말한다
//   ③ 컨 상세에 EDI POD 와 리스트 POD 를 같이 보인다
const path = require('path');
const fs = require('fs');
const AG = require(path.resolve(process.argv[2]));   // adminGuard 번들
const ROOT = process.argv[3] || process.cwd();
let bad = 0; const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

//  ── ① X-RAY MRN 입력 ──
const X = rd('src/components/XrayTab.jsx');
T(/fbUpdateVoyageInfo/.test(X), 'MRN 을 항차에 저장하지 않는다');
T(/const mrnField = mode === 'loading' \? 'mrnOut' : 'mrnIn';/.test(X), '양하·선적 레그를 안 가린다');
T(/async function saveMrn/.test(X), '저장 함수가 없다');
T(/여기를 눌러 적어 넣으십시오/.test(X), '아직 «엑셀을 다시 올리세요» 라고만 한다 — 원천이 없는 배는 몇 번을 올려도 안 채워진다');
T(/고치기 ✏/.test(X), '이미 있는 MRN 을 고칠 길이 없다');
//  ⚠ 손입력은 레그 검사로 버리지 않는다 — 버리면 «분명히 쳤는데 안 나온다» 가 된다
T(!/_legOK\(mode === 'loading' \? info\.mrnOut : info\.mrnIn\)/.test(X),
  '손으로 적은 MRN 을 레그 검사로 조용히 버린다');
T(/mrnWarn/.test(X), '레그가 어긋나도 아무 말 안 한다 — 버리지 않는 대신 경고해야 한다');
T(!/port_mis_data/.test(X.split('async function saveMrn')[1] || ''), '수집기 정본(port_mis_data)을 건드린다 — 금지');

//  ── ② 복구 코드 안내 ──
{
  const now = Date.now();
  const made = new Date(2026, 7, 26, 14, 3).getTime();
  const guard = { recovery: { '김성일': { hash: 'x', salt: 's', madeAt: made, usedAt: 0 } } };
  T(typeof AG.recoveryMadeAtText === 'function', '만든 시각을 꺼내는 함수가 없다');
  T(/2026-08-26 14:03/.test(AG.recoveryMadeAtText(guard, '김성일')), `만든 시각 표기가 틀렸다 (${AG.recoveryMadeAtText(guard, '김성일')})`);
  T(AG.recoveryMadeAtText(guard, '없는사람') === '', '없는 사람인데 시각을 만들어 낸다');
  T(AG.recoveryMadeAtText({ recovery: { '김성일': { hash: 'x', salt: 's', usedAt: 0 } } }, '김성일') === '',
    'madeAt 이 없는데 시각을 지어낸다(옛 기록)');
}
const AGS = rd('src/adminGuard.js');
T(/const madeTail = made \?/.test(AGS), '틀렸을 때 만든 시각을 안 붙인다');
T(/코드가 맞지 않습니다\.\$\{madeTail\}/.test(AGS), '실패 문구에 안내가 안 붙는다');
T(/이미 사용한 코드입니다[^`]*\$\{made \?/.test(AGS), '이미 쓴 코드일 때도 언제 만든 것인지 말해야 한다');
//  ⛔ 실패 문구에 코드·해시·솔트를 흘리지 않는다 — 안내는 «언제 만들었나» 까지다.
{ const g = { recovery: { '김': { hash: 'HASHVAL', salt: 'SALTVAL', madeAt: Date.now(), usedAt: 0 } } };
  const p1 = AG.recoveryMadeAtText(g, '김');
  T(!/HASHVAL|SALTVAL/.test(p1), '만든 시각 안내에 해시·솔트가 섞인다'); }
T(!/\$\{r\.hash\}|\$\{r\.salt\}/.test(AGS), '실패 문구에 해시·솔트를 흘린다');
const LP = rd('src/pages/LoginPage.jsx');
T(/recoveryMadeAtText/.test(LP), '복구 화면이 만든 시각을 안 보여준다 — 틀린 뒤에 알려주면 이미 헛친 뒤다');
T(/지금 등록된 코드는 \{t\} 에 만든 것입니다/.test(LP), '안내 문구가 없다');

//  ── ③ 컨 상세 두 값 ──
const V = rd('src/pages/VoyagePage.jsx');
T(/safeR\._podList = String\(v\)\.toUpperCase\(\);/.test(V), '리스트 POD 를 아직 버린다 — 그래서 상세에 EDI 값만 남았다');
T(/safeR\._podEdi = String\(ediBase\[k\] \|\| ''\)\.toUpperCase\(\);/.test(V), 'EDI 쪽 값을 안 남긴다');
T(/k === 'pod' && v && String\(v\)\.toUpperCase\(\) !== String\(ediBase\[k\] \|\| ''\)\.toUpperCase\(\)/.test(V),
  '같은 값일 때도 남긴다 — 다를 때만 보여야 한다');
T(!/ALLOWED_LIST_FIELDS\.add\('pod'\)/.test(V), 'pod 를 보강 필드로 넣었다 — 판정이 바뀌면 안 된다(보여 주기만)');
const D = rd('src/components/ContainerDetailModal.jsx');
T(/label="리스트 POD"/.test(D), '컨 상세에 리스트 POD 가 없다');
T(/c\._podList !== \(c\.pod \|\| ''\)\.toUpperCase\(\)/.test(D), '같아도 두 줄을 보인다');
T(/amber: 'text-amber-300'/.test(D), 'Field 의 amber 색이 아직 표에 없다 — 조용히 무채색으로 떨어진다');
T(/purple: 'text-purple-300'/.test(D), '환적항·최종지의 purple 도 같은 병이었다');

if (bad > 0) { console.error(`✗ 밀린 버그 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 밀린 버그 연막검사 통과 — MRN 8 · 복구 코드 8 · 컨 상세 7');
