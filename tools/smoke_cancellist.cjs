// 캔슬 리스트(3.50-02) 연막검사 — SWSP 2609S 실자료 사본(tools/fixtures/cancellist_swsp.json: 패치 전 records 400 · EDI 813 · 수집기 amend.cancelReq 13)으로
//   ① 종전 증상 재현(취소분 13대가 «EDI에 없는 컨» 경고) ② cancelReq 를 주면 경고 대신 «취소 요청 N대 남아 있음» 안내 ③ 파일명 판정 ④ removeCancelledFromMap 으로 13대를 빼면 387 = 배정목록 · 경고 0
//   ⑤ autoRegApi.classifyTallyFile 이 캔슬 리스트를 재료로 안 잡는다. 실소스(utils·diagnostics·autoRegApi)를 그대로 번들해 돌린다. 쓰기 없음.
const fs = require('fs');
const M = require(process.argv[2]);
const FX = JSON.parse(fs.readFileSync(__dirname + '/fixtures/cancellist_swsp.json', 'utf8'));
const fail = (m) => { console.log('✗ ' + m); process.exit(1); };
const CANC = FX.amend.cancelReq;
if (CANC.length !== 13) fail('사본의 취소 요청이 13대가 아니다');
const ptk = Object.values(FX.ediContainers).filter((c) => M.isPyeongtaekPort(c.pol)).length;
const run = (records, cancelReq) => M.runDiagnostics({ ediContainers: FX.ediContainers, listRecords: records, xrayList: {}, mode: 'loading', carrier: 'SKR', sealPolicy: null, cancelReq });
// ① 종전 증상
let al = run(FX.records, []);
let ex = al.find((a) => a.code === 'list_extra');
if (!ex || ex.count !== 13) fail('종전 증상(경고 13개)이 재현되지 않는다: ' + JSON.stringify(ex));
if (ex.details.extraCns.slice().sort().join() !== CANC.slice().sort().join()) fail('경고 13대가 캔슬 리스트 13대와 다르다');
if (!(ex.details.listCount === 400 && ex.details.ediCount === ptk && typeof ex.details.matchedCount === 'number')) fail('경고 details 에 EDI·리스트·매칭 대수가 없다(«?대» 원인): ' + JSON.stringify({ ...ex.details, extraCns: undefined }));
if (ex.details.matchedCount !== 387) fail('매칭이 387 이 아니다: ' + ex.details.matchedCount);
console.log(`  ① 종전 — 경고 13개(캔슬 13대 그대로) · details EDI ${ex.details.ediCount} / 리스트 ${ex.details.listCount} / 매칭 ${ex.details.matchedCount} ✔`);
// ② cancelReq
al = run(FX.records, CANC);
if (al.find((a) => a.code === 'list_extra')) fail('취소 요청분인데 «EDI에 없는 컨» 경고가 남는다');
const cp = al.find((a) => a.code === 'cancel_pending');
if (!cp || cp.level !== 'info' || cp.count !== 13 || cp.details.cancelCns.length !== 13) fail('«취소 요청 N대 남아 있음» 안내가 없거나 13이 아니다: ' + JSON.stringify(cp));
if (!/13대가 리스트에 남아 있음/.test(cp.msg)) fail('안내 문구가 다르다: ' + cp.msg);
if (al.find((a) => a.code === 'list_short')) fail('리스트 부족 경고가 새로 생겼다');
console.log('  ② 취소 요청분 — 경고 0 · info «선사 취소 요청 13대가 리스트에 남아 있음» ✔');
// ③ 파일명
const T = [['SWSP 2609S EMPTY 캔슬 리스트.xlsx', 'cancel'], ['STMJ 캔슬리스트.xlsx', 'cancel'], ['CANCEL LIST.xlsx', 'cancel'], ['DJCF 0150S 취소분.xls', 'cancel'], ['SWBT 2515S CXL LIST.xlsx', 'cancel'],
  ['SWMM 2609S 캔슬 및 추가 리스트.xlsx', 'mixed'], ['CXL&ADD LIST.xlsx', 'mixed'],                      // 두 목록 한 파일 — 앱은 손대지 않는다(감사 지적)
  ['SWSP 2609S 취소반영 최종리스트.xlsx', ''], ['취소 적용 LOADING LIST.xlsx', ''], ['cancel applied FINAL LIST.xlsx', ''],   // 취소를 반영한 리스트 — 빼라는 목록이 아니다
  ['SWSP 2609S 캔슬 리스트(최종).xlsx', 'cancel'], ['SWSP 2609S FINAL CANCEL LIST.xlsx', 'cancel'], ['캔슬 리스트 2차 반영.xlsx', 'cancel'], ['선적 후 캔슬 리스트.xlsx', 'cancel'],   // 취소 낱말이 «리스트» 와 붙으면 캔슬 리스트(재감사 지적)
  ['SWSP 2609S (Excel)4.xls', ''], ['MCAT 637S CATOS EMPTY LOAD LIST.xlsx', ''], ['2609SLOADLIST.xlsx', ''], ['검수업체컨테이너목록조회_20260915.xls', ''], ['ASC609_BTS_2609S_KRPTK_SWSP.asc', ''], ['RECAP.xlsx', ''], ['SEASPAN CALICANTO CLL.xlsx', '']];
for (const [n, want] of T) if (M.cancelListKind(n) !== want) fail(`파일명 판정 틀림: ${n} → ${M.cancelListKind(n)} (기대 ${want || '아님'})`);
if (M.isCancelListName('SWMM 2609S 캔슬 및 추가 리스트.xlsx') || !M.isCancelListName('STMJ 캔슬리스트.xlsx')) fail('isCancelListName 이 cancelListKind 와 다르다');
console.log('  ③ 파일명 판정 — 순수 캔슬 9종(«최종·FINAL 캔슬 리스트» 포함) · 혼합 2종 · 반영본 3종(아님) · 리스트·합본·세관·ASC·RECAP 7종(아님) ✔');
// ④ 빼기
const map = JSON.parse(JSON.stringify(FX.records));
let r = M.removeCancelledFromMap(map, CANC.map((c) => c.toLowerCase()));   // 소문자로 줘도 빠진다
if (r.removed.length !== 13 || r.notFound.length !== 0 || Object.keys(map).length !== 387) fail('13대 빼기 결과가 틀리다: ' + JSON.stringify({ removed: r.removed.length, notFound: r.notFound.length, left: Object.keys(map).length }));
if (Object.keys(map).length !== FX.planLod) fail(`뺀 뒤 ${Object.keys(map).length} ≠ 배정목록 ${FX.planLod}`);
r = M.removeCancelledFromMap(map, CANC);
if (r.removed.length !== 0 || r.notFound.length !== 13) fail('두 번째 빼기에서 «이미 빠짐» 13 이 아니다');
al = run(map, []);
if (al.find((a) => a.code === 'list_extra' || a.code === 'list_short' || a.code === 'cancel_pending')) fail('뺀 뒤에도 경고·안내가 남는다: ' + al.filter((a) => /list_|cancel/.test(a.code)).map((a) => a.msg).join(' | '));
al = run(map, CANC);
if (al.find((a) => a.code === 'cancel_pending')) fail('뺀 뒤 cancelReq 가 남아 있어도 «남아 있음» 안내는 없어야 한다');
console.log('  ④ removeCancelledFromMap — 13 뺌 → 387 = 배정목록 387 · 경고 0 · 재시도는 이미 빠짐 13 ✔');
// ⑤ 자동 등록 재료 분류
if (M.classifyTallyFile('SWSP 2609S EMPTY 캔슬 리스트.xlsx', '') !== 'skip') fail('자동 등록이 캔슬 리스트를 재료로 잡는다');
if (M.classifyTallyFile('SWMM 2609S 캔슬 및 추가 리스트.xlsx', '') !== 'skip') fail('자동 등록이 캔슬·추가 혼합 리스트를 재료로 잡는다');
if (M.classifyTallyFile('SWSP 2609S (Excel)4.xls', '') !== 'list' || M.classifyTallyFile('2609SLOADLIST.xlsx', '') !== 'merged') fail('일반 리스트·합본 분류가 깨졌다');
console.log('  ⑤ autoRegApi.classifyTallyFile — 캔슬 리스트 skip · 리스트/합본 그대로 ✔');
// ⑥ 가상 E 자리(DUME·CASP 더미)가 EDI 에 있어도 취소분이 «E확정» 으로 먹히지 않는다(감사 실측 — empty_confirmed 가 앞이면 안내가 사라지고 총 대수가 400 으로 부풀었다)
const ediV = { ...FX.ediContainers, CASP0000001: { cn: 'CASP0000001', pol: 'KRPTK', pod: 'CNSHA', fe: 'E', iso: '22G1' } };
let alV = M.runDiagnostics({ ediContainers: ediV, listRecords: FX.records, xrayList: {}, mode: 'loading', carrier: 'SKR', sealPolicy: null, cancelReq: CANC });
const ec = alV.find((a) => a.code === 'empty_confirmed'), cpV = alV.find((a) => a.code === 'cancel_pending');
if (!cpV || cpV.count !== 13) fail('가상 E 자리가 있으면 취소분 안내가 사라진다: ' + JSON.stringify({ ec: ec && ec.msg, cpV }));
if (ec && ec.count !== 0) fail('취소분이 E확정으로 먹혔다: ' + ec.msg);
alV = M.runDiagnostics({ ediContainers: ediV, listRecords: FX.records, xrayList: {}, mode: 'loading', carrier: 'SKR', sealPolicy: null, cancelReq: [] });
if (!alV.find((a) => a.code === 'empty_confirmed' && a.count === 13)) fail('대조군(cancelReq 없음)에서는 종전대로 E확정 13 이어야 한다');
console.log('  ⑥ 가상 E 자리 — 취소분 안내 13 그대로 · E확정 0(대조군 13) ✔');
// ⑦ cancelReq 가 객체(cn 키)로 와도 죽지 않는다
const alO = M.runDiagnostics({ ediContainers: FX.ediContainers, listRecords: FX.records, xrayList: {}, mode: 'loading', carrier: 'SKR', sealPolicy: null, cancelReq: Object.fromEntries(CANC.map((c) => [c, true])) });
if (!alO.find((a) => a.code === 'cancel_pending' && a.count === 13)) fail('cancelReq 객체형에서 안내가 안 뜬다');
const alI = M.runDiagnostics({ ediContainers: FX.ediContainers, listRecords: FX.records, xrayList: {}, mode: 'loading', carrier: 'SKR', sealPolicy: null, cancelReq: Object.fromEntries(CANC.map((c, i) => [String(i), c])) });
if (!alI.find((a) => a.code === 'cancel_pending' && a.count === 13)) fail('cancelReq 인덱스 키 객체형(RTDB 성긴 배열)에서 안내가 안 뜬다');
console.log('  ⑦ cancelReq 객체형(cn 키·인덱스 키) — 예외 없음 · 안내 13 ✔');
console.log('✅ 캔슬 리스트 연막검사 PASS');
