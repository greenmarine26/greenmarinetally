// 4.17 연막검사 — 마감적용 «파일 올리기»: 마감텔리 선적 EDI 로 동방 계획 완료를 확정하고 자리를 바꾼다. 실소스 firebase.js(메모리 RTDB) + 실제 OBWH 2762W 항차(보관소 GET 픽스처) + 실제 마감텔리 EDI(OBWH 2698W PTK.EDI) 파싱.
//   ① 동방 완료의 시각(at)은 그대로, termBasis 만 걷힌다 ② 사람이 찍은 완료·자리는 안 건드린다 ③ 완료 없는 컨은 src:'edi' 로 더한다 ④ 앱에 없는 EDI 컨·EDI에 없는 앱 완료는 쓰지 않는다 ⑤ 소유자·동방 문지기 ⑥ 두 번째 적용은 0건 ⑦ moves 이력
//   실행 — node tools/smoke_closingedi417.cjs <firebase 번들.cjs>
process.env.TZ = 'Asia/Seoul';
const path = require('path');
const fs = require('fs');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_closingedi417.cjs <firebase 번들.cjs>'); process.exit(1); }
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'closingedi_obwh2762.json'), 'utf8'));
const ymd = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const store = {};
const me = (name) => { store.tallyone_me_today = JSON.stringify({ name, ymd }); };
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
global.window = global.window || {};
global.window.alert = () => {};
global.window.dispatchEvent = () => true;
global.CustomEvent = global.CustomEvent || class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.document = global.document || { createElement: () => ({}) };
console.warn = () => {};
const vk = 'OBWH_2761E';
const clone = (o) => JSON.parse(JSON.stringify(o));
const cns = Object.keys(FX.loading.ediContainers);
const planTs = {}; cns.forEach((c) => { planTs[c] = FX.loading.completed[c].at; });
const humanCn = cns[5];
const freshDb = (over = {}) => {
  const loading = clone(FX.loading);
  loading.completed[humanCn] = { by: '박철민', at: 1791500000000, equip: '2호기' };
  return { voyages: { [vk]: { info: { ...clone(FX.info), terminalStatus: 'working', workEndAt: '', ...(over.info || {}) }, loading } } };
};
global.__memdb = freshDb(); global.__memlog = [];
const F = require(path.resolve(B));
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
const throwsMsg = async (fn, re) => { try { await fn(); return false; } catch (e) { return re.test(String(e && e.message)); } };
const L = () => global.__memdb.voyages[vk].loading;
(async () => {
  // EDI 줄 — 앱 계획에서 뽑되 30대는 칸(tier)을 바꾸고, 3대는 뺀 것, 앱에 없는 2대를 더한 것(마감텔리가 실제로 다른 자리를 적은 상황)
  const rows = Object.values(FX.loading.ediContainers).map((c) => ({ cn: c.cn, bay: c.bay, row: c.row, tier: c.tier, pol: 'KRPTK' }));
  for (let k = 0; k < 30; k++) rows[k].tier = String(Number(rows[k].tier) + 2).padStart(2, '0');
  const dropped = rows.splice(100, 3).map((x) => x.cn);
  rows.push({ cn: 'ZZZU1234567', bay: '2', row: '02', tier: '82', pol: 'KRPTK' }, { cn: 'ZZZU7654321', bay: '4', row: '02', tier: '82', pol: 'KRPTK' });
  console.log('마감적용 파일 올리기 — OBWH 2762W 실제 항차(앱 선적 ' + cns.length + '대, 전부 동방 계획 완료)');
  me('김성일');
  ok(await F.fbApplyClosingEdi(vk, '박철민', rows).then(() => false, (e) => e && e.ownerOnly === true), '소유자가 아니면 막힌다');
  global.__memdb = freshDb({ info: { pier: 'PCTC' } });
  ok(await throwsMsg(() => F.fbApplyClosingEdi(vk, '김성일', rows), /동방\(PNCT\) 선박만/), 'PCTC 항차는 던진다');
  global.__memdb = freshDb(); global.__memlog = [];
  const r = await F.fbApplyClosingEdi(vk, '김성일', rows);
  const lo = L();
  ok(r.file === true && r.confirmed === 283 && r.added === 0 && r.human === 1 && r.moved === 29, `적용 결과 — 확정 ${r.confirmed} · 새 완료 ${r.added} · 자리 바뀜 ${r.moved} · 사람 ${r.human}`);
  ok(r.ediOnly === 2 && r.planOnly === 3, `앱에 없는 EDI 컨 ${r.ediOnly} · EDI에 없는 앱 완료 ${r.planOnly} (쓰지 않음)`);
  const sameTs = cns.filter((c) => c !== humanCn && !dropped.includes(c)).every((c) => lo.completed[c].at === planTs[c] && lo.completed[c].termBasis === undefined && lo.completed[c].src === 'term');
  ok(sameTs, '동방 완료의 선적 시각(at)은 283대 모두 그대로 · 계획 표식(termBasis)만 걷혔다');
  ok(dropped.every((c) => lo.completed[c].termBasis === 'plan'), 'EDI에 없는 앱 완료 3대는 그대로(계획 표식 유지)');
  ok(lo.completed[humanCn].by === '박철민' && lo.completed[humanCn].at === 1791500000000 && !(lo.records && lo.records[humanCn] && lo.records[humanCn].bay_actual), '사람이 찍은 완료는 완료도 자리도 그대로');
  const c0 = rows[0].cn, rec0 = lo.records[c0];
  ok(rec0.bay_actual === String(parseInt(rows[0].bay, 10)) && rec0.row_actual === rows[0].row && rec0.tier_actual === rows[0].tier && rec0.actual_by === '김성일' && Array.isArray(rec0.moves) && rec0.moves.slice(-1)[0].why === 'actual', '바뀐 컨 — 실제 자리(bay_actual…)와 moves 이력이 들어갔다');
  ok(!lo.completed.ZZZU1234567 && !(lo.records && lo.records.ZZZU1234567), '앱에 없는 EDI 컨은 넣지 않았다');
  ok(lo.completed[rows[40].cn] && !(lo.records[rows[40].cn] || {}).bay_actual, '자리가 같은 컨은 자리를 다시 쓰지 않았다');
  global.__memlog = [];
  const r2 = await F.fbApplyClosingEdi(vk, '김성일', rows);
  ok(r2.confirmed === 0 && r2.added === 0 && r2.moved === 0, '두 번째 적용은 0건(바뀔 것이 없다)');
  // 감사 4.17 — 사람이 고친 실제 자리는 계획 완료·완료 없음이어도 덮지 않는다(완료만 확정)
  global.__memdb = freshDb();
  const pc = rows[2].cn, nc = rows[3].cn;   // 둘 다 위치가 EDI 와 다른 컨(앞 30대)
  const Lp = L(); Lp.records[pc] = { ...(Lp.records[pc] || {}), cn: pc, bay_actual: '9', row_actual: '3', tier_actual: '4', actual_by: '박철민', actual_at: 1791400000000 };
  delete Lp.completed[nc]; Lp.records[nc] = { ...(Lp.records[nc] || {}), cn: nc, bay_actual: '9', row_actual: '3', tier_actual: '4', actual_by: '박철민' };
  const r4 = await F.fbApplyClosingEdi(vk, '김성일', rows);
  ok(L().records[pc].bay_actual === '9' && L().records[pc].actual_by === '박철민' && L().records[nc].tier_actual === '4', '사람이 고친 자리는 그대로(계획 완료 컨·완료 없는 컨 모두)');
  ok(L().completed[pc].termBasis === undefined && L().completed[nc].src === 'edi' && r4.moved === 27, `완료는 확정/채움 · 자리 바뀜 ${r4.moved} (사람 자리 2대 제외)`);
  const pad = JSON.parse(JSON.stringify(rows)); const z = Object.values(FX.loading.ediContainers).find((c) => c.cn === rows[60].cn);
  global.__memdb = freshDb(); const Lz = L(); Lz.records[z.cn] = { cn: z.cn, bay_actual: String(parseInt(z.bay, 10)), row_actual: String(parseInt(z.row, 10)), tier_actual: String(parseInt(z.tier, 10)), actual_by: '' };
  const r5 = await F.fbApplyClosingEdi(vk, '김성일', pad);
  ok(!((L().records[z.cn].moves) || []).length, '«2» 와 «02» 는 같은 자리로 봐서 쓰지 않는다');
  // 완료가 없는 컨 — 새로 채움(시각 = 마지막 앱 완료 시각, 작업 끝 시각이 있으면 그것)
  global.__memdb = freshDb({ info: { workEndAt: '2026-10-09 19:50' } });
  const L2 = L(); delete L2.completed[cns[10]]; delete L2.completed[cns[11]];
  const r3 = await F.fbApplyClosingEdi(vk, '김성일', rows);
  const endMs = Date.parse('2026-10-09T19:50:00+09:00');
  ok(r3.added === 2 && L().completed[cns[10]].src === 'edi' && L().completed[cns[10]].at === endMs && L().completed[cns[10]].by === '', '완료 없는 2대 — src edi · 작업 끝 시각으로 채움');
  console.log(fail ? `✗ ${fail}건 실패` : '✓ 전부 통과');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
