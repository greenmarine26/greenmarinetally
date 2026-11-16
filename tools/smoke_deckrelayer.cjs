// 양하 한 층 통째 맞춤(5.06-01) — NSFR 2621N 20번 베이 데크 실데이터(39대)로, 빈 계획 칸·겹친 칸이 0 이 되는지 검사한다.
//  왜 있는가 — 검수사 2026-11-16 «흰자리 4군데를 남기고 데크 양하를 완료». 사람이 찍은 칸은 그대로 남아야 한다.
const path = require('path');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_deckrelayer.cjs <번들.cjs>'); process.exit(1); }
global.window = global.window || {};
global.document = global.document || { createElement: () => ({}) };
const U = require(path.resolve(B));
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('양하 한 층 통째 맞춤 — NSFR 2621N 20번 데크');
const FX = {"edi":{"BEAU4862145":{"bay":"20","row":"07","tier":"86"},"BEAU4863809":{"bay":"20","row":"03","tier":"88"},"BEAU9720694":{"bay":"20","row":"05","tier":"82"},"BMOU6346435":{"bay":"20","row":"04","tier":"88"},"BMOU6813123":{"bay":"20","row":"07","tier":"88"},"BMOU9239404":{"bay":"20","row":"01","tier":"84"},"BMOU9881250":{"bay":"20","row":"06","tier":"82"},"FBIU5378711":{"bay":"20","row":"08","tier":"82"},"FCIU7180579":{"bay":"20","row":"02","tier":"84"},"FCIU7471002":{"bay":"20","row":"02","tier":"88"},"FFAU1049800":{"bay":"20","row":"08","tier":"88"},"FFAU4248425":{"bay":"20","row":"01","tier":"86"},"FFAU4371044":{"bay":"20","row":"05","tier":"88"},"FSCU5871987":{"bay":"20","row":"02","tier":"82"},"GAOU7697937":{"bay":"20","row":"01","tier":"88"},"GCXU5889038":{"bay":"20","row":"03","tier":"86"},"GCXU5940150":{"bay":"20","row":"08","tier":"84"},"KMTU9325664":{"bay":"20","row":"10","tier":"86"},"KMTU9346029":{"bay":"20","row":"09","tier":"84"},"KMTU9504926":{"bay":"20","row":"06","tier":"88"},"KMTU9656446":{"bay":"20","row":"10","tier":"88"},"NSSU7107915":{"bay":"20","row":"07","tier":"84"},"NSSU7122226":{"bay":"20","row":"06","tier":"84"},"NSSU7148909":{"bay":"20","row":"05","tier":"84"},"NSSU7168802":{"bay":"20","row":"08","tier":"86"},"SEGU4786160":{"bay":"20","row":"02","tier":"86"},"SEGU9719653":{"bay":"20","row":"07","tier":"82"},"SEKU6817223":{"bay":"20","row":"10","tier":"82"},"SEKU9032260":{"bay":"20","row":"03","tier":"82"},"SEKU9095464":{"bay":"20","row":"01","tier":"82"},"SZLU9934304":{"bay":"20","row":"04","tier":"82"},"TCKU6682146":{"bay":"20","row":"03","tier":"84"},"TEMU6566557":{"bay":"20","row":"09","tier":"86"},"TLLU5199859":{"bay":"20","row":"05","tier":"86"},"TLLU5213366":{"bay":"20","row":"04","tier":"86"},"TLLU8843939":{"bay":"20","row":"10","tier":"84"},"TLLU8849433":{"bay":"20","row":"04","tier":"84"},"TRHU8750171":{"bay":"20","row":"09","tier":"82"},"UETU5444397":{"bay":"20","row":"06","tier":"86"}},"at":{"BEAU4862145":1794653514284,"BEAU4863809":1794652377180,"BEAU9720694":1794656450968,"BMOU6346435":1794651947183,"BMOU6813123":1794652606651,"BMOU9239404":1794654876697,"BMOU9881250":1794655142336,"FBIU5378711":1794655140812,"FCIU7180579":1794654198821,"FCIU7471002":1794652121316,"FFAU1049800":1794651774000,"FFAU4248425":1794653202385,"FFAU4371044":1794652492154,"FSCU5871987":1794655415320,"GAOU7697937":1794652273225,"GCXU5889038":1794653275539,"GCXU5940150":1794653813897,"KMTU9325664":1794652717485,"KMTU9346029":1794653558435,"KMTU9504926":1794651859000,"KMTU9656446":1794651712000,"NSSU7107915":1794652739019,"NSSU7122226":1794652826837,"NSSU7148909":1794653042418,"NSSU7168802":1794654416428,"SEGU4786160":1794654320362,"SEGU9719653":1794656544544,"SEKU6817223":1794653634826,"SEKU9032260":1794656343655,"SEKU9095464":1794656342505,"SZLU9934304":1794655414342,"TCKU6682146":1794653844598,"TEMU6566557":1794654259828,"TLLU5199859":1794653445460,"TLLU5213366":1794653004872,"TLLU8843939":1794655879735,"TLLU8849433":1794654077893,"TRHU8750171":1794656608735,"UETU5444397":1794654563876},"human":{"KMTU9346029":["09","86","김성일",1794653558572],"NSSU7107915":["08","86","김성일",1794652739167],"NSSU7122226":["06","86","김성일",1794652826980],"NSSU7148909":["02","86","김성일",1794653042557],"SEKU6817223":["10","84","김성일",1794653635020],"TCKU6682146":["06","84","김성일",1794653844741],"TEMU6566557":["03","84","김성일",1794654259963]}};
const edi = {}; const completed = {}; const records = {};
for (const [cn, v] of Object.entries(FX.edi)) { edi[cn] = { cn, bay: v.bay, row: v.row, tier: v.tier, pod: 'KRPTK' }; completed[cn] = { at: FX.at[cn] }; records[cn] = {}; }
for (const [cn, h] of Object.entries(FX.human)) records[cn] = { bay_actual: '20', row_actual: h[0], tier_actual: h[1], actual_by: h[2], actual_at: h[3] };
const out = U.applyAutoSwap(U.inferDischargePos({ discharge: { ediContainers: edi, completed, records } }));
const R = out.discharge.records;
const occ = {}; const slots = Object.values(edi).map((e) => e.row + '-' + e.tier);
for (const [cn, e] of Object.entries(edi)) { const a = R[cn]; const k = a && a.bay_actual ? a.row_actual + '-' + a.tier_actual : e.row + '-' + e.tier; (occ[k] = occ[k] || []).push(cn); }
ok(slots.filter((s) => !occ[s]).length === 0, '빈 계획 칸 0');
ok(Object.values(occ).filter((v) => v.length > 1).length === 0, '겹친 칸 0');
ok(Object.keys(occ).every((k) => slots.includes(k)), '계획에 없는 칸 0');
ok(Object.entries(FX.human).every(([cn, h]) => R[cn].row_actual === h[0] && R[cn].tier_actual === h[1] && R[cn]._pos_src !== 'infer'), '사람이 찍은 7대 칸은 그대로');
const before = JSON.stringify(edi);
ok(JSON.stringify(edi) === before && Object.values(edi).every((e) => !('bay_actual' in e)), '계획(ediContainers)은 안 건드린다');
//  열 안 맞교환만 있는 층은 그대로(깨지지 않았으면 손대지 않는다)
const e2 = { A: { bay: '1', row: '01', tier: '82' }, B: { bay: '1', row: '01', tier: '84' } };
const o2 = U.inferDischargePos({ discharge: { ediContainers: e2, completed: { A: { at: 1 }, B: { at: 2 } }, records: {} } });
ok(o2.discharge.records.A.tier_actual === '84' && o2.discharge.records.B.tier_actual === '82', '같은 열 아래 칸이 먼저 나오면 기존 규칙대로 서로 바뀐다')
if (fail) { console.error('✗ ' + fail + '건 실패'); process.exit(1); }
console.log('PASS');
