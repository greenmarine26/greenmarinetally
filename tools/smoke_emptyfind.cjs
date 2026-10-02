// 머스크 엠티 찾기(3.73) 연막검사 — MCSC 638N/640S 실자료 사본(보관소 EDI)로 실소스(emptyFind·utils)를 그대로 잰다.
//   ① 머스크 판정(사전 MAE, info.carrier 빈값) ② 실번호 엠티 183대(CATOS 와 같은 수) · 가상번호·풀 제외 ③ 도착항×규격 묶음
//   ④ BAPLIE 와 맞대면 CNTAO|22RF 한 줄만 다르다 ⑤ 비머스크 배는 카드가 없다 ⑥ CSV 183줄 ⑦ 변이 — 가상번호 허용·풀 포함하면 잡힌다
const fs = require('fs');
const M = require(process.argv[2]);
const FX = JSON.parse(fs.readFileSync(__dirname + '/fixtures/emptyfind_mcsc638n.json', 'utf8'));
const fail = (m) => { console.log('✗ ' + m); process.exit(1); };
const vs = { [FX.vk]: { info: { ...FX.info, emptyFind: { status: 'temp_ok', pctc: { n: 183 }, bap: { n: FX.bapN, by: FX.bapBy }, file: 'MCSC-640S CATOS EMPTY LOAD LIST.xlsx' } }, loading: { ediContainers: FX.ediContainers } } };
const dict = { MCSC: { carrier: 'MAE' } };
if (!M.isMaerskVoyage({ carrier: '' }, 'MAE') || M.isMaerskVoyage({ carrier: 'SKR' }, '')) fail('머스크 판정이 틀리다');
let cards = M.maerskEmptyCards(vs, dict);
if (cards.length !== 1) fail('머스크 카드가 1장이 아니다: ' + cards.length);
const c = cards[0];
if (c.nPctc !== 183) fail('실번호 엠티가 183이 아니다: ' + c.nPctc);
if (c.rows.some((r) => !/^[A-Z]{3}[UJZ]\d{7}$/.test(r.cn))) fail('가상번호가 섞였다');
const by = M.groupBy(c.rows);
const want = { 'CNTAO|22RF': 3, 'CNTAO|45RF': 100, 'CNDLC|45RF': 20, 'PHDVO|45RF': 60 };
for (const k of Object.keys(want)) if (by[k] !== want[k]) fail(`${k} = ${by[k]} (기대 ${want[k]})`);
if (Object.keys(by).length !== 4) fail('묶음이 4개가 아니다: ' + JSON.stringify(by));
console.log('  ①② 머스크 판정 · 실번호 엠티 183대(CATOS 와 같은 수) · 가상·풀 제외 ✔  ③ 묶음 ' + JSON.stringify(by));
const diff = c.table.filter((r) => r.diff);
if (diff.length !== 1 || diff[0].pod !== 'CNTAO' || diff[0].spec !== '22RF' || diff[0].pctc !== 3 || diff[0].bap !== 4) fail('차이 줄이 CNTAO|22RF 3 vs 4 한 줄이 아니다: ' + JSON.stringify(diff));
console.log('  ④ BAPLIE 대조 — 다른 줄은 CNTAO 22RF 3 대 4 한 줄뿐 ✔');
if (M.maerskEmptyCards({ X_1: { info: { vsl: 'X', carrier: 'SKR' }, loading: { ediContainers: FX.ediContainers } } }, {}).length !== 0) fail('비머스크 배에 카드가 생긴다');
const csv = M.emptyCsv(c).split('\r\n').filter(Boolean);
if (csv.length !== 184) fail('CSV 줄 수 ' + csv.length);
console.log('  ⑤ 비머스크 배 카드 없음 ⑥ CSV 183줄 + 머리 ✔');
// ⑦ 변이 — 풀 하나·가상번호 하나를 넣으면 숫자가 달라져야 한다
const ed = JSON.parse(JSON.stringify(FX.ediContainers));
ed.ZZ1 = { cn: 'DUME9400016', iso: '45R1', fe: 'E', pol: 'KRPTK', pod: 'CNTAO' };
ed.ZZ2 = { cn: 'MSKU1234565', iso: '45R1', fe: 'F', pol: 'KRPTK', pod: 'CNTAO' };
ed.ZZ3 = { cn: 'MSKU7654321', iso: '45R1', fe: 'E', pol: 'CNTAO', pod: 'CNTAO' };
ed.ZZ4 = { cn: 'MSKU1234001', iso: '45R1', fe: 'E', pol: 'PTK', pod: 'CNTAO' };   // 수집기와 같은 규칙 — POL 은 KRPTK 만
ed.ZZ5 = { cn: 'MSKU1234006', iso: '45R1', fe: 'E', pol: 'KRPTK', pod: 'CNTAO', pendingCn: true };
if (M.realEmptyRows(ed).length !== 183) fail('가상번호·풀·타항 선적이 들어가면 안 된다');
console.log('  ⑦ 변이 — 가상번호·풀·타항 선적·대기 슬롯을 넣어도 183 그대로 ✔');
console.log('연막검사(머스크 엠티 찾기) 통과');
