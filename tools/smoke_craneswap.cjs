// 호기 교체(4.58) — utils.craneSwapsOf·craneBoardOf 가 실데이터(STMJ 2667E, 3→1·4→2)에서 옛 호기 줄을 접고 새 호기에 «N대 포함»을 다는지 본다.
const path = require('path'), fs = require('fs');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_craneswap.cjs <utils 번들.cjs>'); process.exit(1); }
global.window = global.window || {}; global.document = global.document || { createElement: () => ({}) };
const U = require(path.resolve(B));
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'craneswap_stmj2667e.json'), 'utf8'));
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('호기 교체 — STMJ 2667E (이종부 3→1 · 김성일 4→2)');
const no = (e) => +(/(\d)\D*$/.exec(String(e)) || [0, 0])[1];
//  기대값은 픽스처 원자료에서 독립 계산
const cnt = {};
for (const m of ['discharge', 'loading']) {
  const seen = new Set();
  for (const [cn, r] of Object.entries(FX[m].termWork || {})) { cnt[no(r.equip)] = (cnt[no(r.equip)] || 0) + 1; seen.add(cn); }
  for (const [cn, r] of Object.entries(FX[m].completed || {})) { if (seen.has(cn) || !r.equip) continue; cnt[no(r.equip)] = (cnt[no(r.equip)] || 0) + 1; }
}
const sw = U.craneSwapsOf(FX.info);
ok(sw.length === 2 && sw.some(s => s.name === '이종부' && s.from === 3 && s.to === 1) && sw.some(s => s.name === '김성일' && s.from === 4 && s.to === 2), `교체 둘 — ${JSON.stringify(sw.map(s => `${s.name} ${s.from}→${s.to}`))}`);
const v = { info: FX.info, discharge: FX.discharge, loading: FX.loading };
const rows = U.craneBoardOf(v, [], null, Date.now());
ok(rows.map(r => r.no).join() === '1,2', `상황판 호기는 1·2호기만 — ${rows.map(r => r.no).join('·')}`);
const r1 = rows.find(r => r.no === 1), r2 = rows.find(r => r.no === 2);
ok(r1.done === cnt[1] + cnt[3] && r1.fold && r1.fold[0].from === 3 && r1.fold[0].n === cnt[3], `1호기 ${r1.done}대 (3호기 작업대수 ${r1.fold && r1.fold[0].n}대 포함) — 기대 ${cnt[1]}+${cnt[3]}`);
ok(r2.done === cnt[2] + cnt[4] && r2.fold && r2.fold[0].from === 4 && r2.fold[0].n === cnt[4], `2호기 ${r2.done}대 (4호기 작업대수 ${r2.fold && r2.fold[0].n}대 포함) — 기대 ${cnt[2]}+${cnt[4]}`);
ok(r1.dis + r1.lod === r1.done && r2.dis + r2.lod === r2.done, '양하+선적 = 합계');
//  교체 뒤 옛 호기를 다른 사람이 다시 등록했으면 접지 않는다
const cc = JSON.parse(JSON.stringify(FX.info.craneCrew)); const k = Object.keys(cc)[0];
cc[k]['3호기'] = { name: '박진우', at: 1793299552328 + 60000 };
ok(!U.craneSwapsOf({ craneCrew: cc }).some(s => s.from === 3), '옛 호기를 교체 뒤에 다른 사람이 등록하면 교체로 안 본다');
//  조가 다른 등록은 교체가 아니다(주간 → 야간 돌려막기)
ok(U.craneSwapsOf({ craneCrew: { '10-29 주간': { '1호기': { name: 'A', at: 1000 } }, '10-29 야간': { '2호기': { name: 'A', at: 2000 } } } }).length === 0, '조가 다르면 교체가 아니다');
//  등록 없는 배는 종전 그대로
const plain = U.craneBoardOf({ info: { vsl: 'STMJ' }, discharge: FX.discharge, loading: FX.loading }, [], null, Date.now());
ok(plain.map(r => r.no).join() === '1,2,3,4' && plain.every(r => !r.fold), '교체 등록이 없으면 호기 넷 그대로');
//  ── 4.58 감사 반영 ──
const H = 3600000, B0 = Date.parse('2026-10-29T00:00:00+09:00');
const cn = (n) => 'AAAU' + String(1000000 + n);
//  상-1 — 조가 둘이고 야간 B 는 3호기에 남는다(교체 아님): 주간 A 의 3호기분만 1호기로 접히고 야간 3호기 실적은 3호기에 남는다
{
  const info = { vsl: 'STMJ', craneCrew: { '10-29 주간': { '3호기': { name: 'A', at: B0 + 9 * H }, '1호기': { name: 'A', at: B0 + 10 * H } }, '10-29 야간': { '3호기': { name: 'B', at: B0 + 17.8 * H }, '2호기': { name: 'C', at: B0 + 18 * H } } } };
  const comp = {}; const put = (i, no2, at) => { comp[cn(i)] = { at, by: 'x', equip: no2 + '호기' }; };
  put(1, 1, B0 + 10.5 * H); put(2, 3, B0 + 9.5 * H); put(3, 3, B0 + 20 * H); put(4, 3, B0 + 20.1 * H); put(5, 2, B0 + 21 * H);
  const rs = U.craneBoardOf({ info, discharge: { completed: comp }, loading: {} }, [], null, B0 + 22 * H);
  const g = (n) => rs.find(r => r.no === n);
  ok(g(1) && g(1).done === 2 && g(1).fold && g(1).fold[0].n === 1, `주간 A 의 3호기분 1대만 1호기로 — 1호기 ${g(1) && g(1).done}대`);
  ok(g(3) && g(3).done === 2 && !g(3).fold, `야간 B 의 3호기 실적 2대는 3호기에 남는다 — 3호기 ${g(3) && g(3).done}대`);
  ok(g(2) && g(2).done === 1 && !g(2).fold, '2호기는 거짓 «N대 포함» 이 안 붙는다');
}
//  중-1 — 한 사람이 같은 시각에 두 호기를 등록하면 교체가 아니다(두 갱)
ok(U.craneSwapsOf({ craneCrew: { '10-29 야간': { '1호기': { name: 'A', at: B0 + 20 * H }, '2호기': { name: 'A', at: B0 + 20 * H } } } }).length === 0, '한 사람이 같은 시각에 두 호기 등록 — 교체 아님');
//  중-2 — 교체 뒤에도 옛 호기 번호를 쓰는 접속 검수원·따라가기는 새 호기로 읽는다
{
  const NOW = Date.parse('2026-10-30T02:00:00+09:00');   // 교체를 등록한 «10-29 야간» 조 안
  const rs = U.craneBoardOf(v, [{ name: '이종부', equip: '3호기', bay: '22', tier: '84', mode: 'discharge' }], null, NOW);
  const r1x = rs.find(r => r.no === 1);
  ok(r1x && r1x.name === '이종부' && r1x.bay === '22' && !rs.some(r => r.no === 3), '옛 호기(3호기) 번호로 붙은 접속 검수원 → 1호기 줄의 이름·베이');
  ok(U.bayViewFollowOf(v, '3호기', null, '', NOW).no === 1, '따라가기 — 옛 호기(3호기)를 내 호기로 두어도 1호기를 따라간다');
}
//  재감사 상-1 — 동방 QC 합계 줄에 앱 완료가 섞여도 합계가 안 사라진다(접기 전 1호기 55 + 3호기 120 = 175)
{
  const info = { vsl: 'OBWH', craneCrew: { '10-29 야간': { '3호기': { name: 'A', at: B0 + 18 * H }, '1호기': { name: 'A', at: B0 + 20 * H } } }, qcWork: { QC103: { qc: 'QC103', disDone: 100, lodDone: 20 }, QC101: { qc: 'QC101', disDone: 50, lodDone: 5 } } };
  const comp = { [cn(1)]: { at: B0 + 20 * H, by: 'x', equip: '3호기' }, [cn(2)]: { at: B0 + 20 * H, by: 'x', equip: '1호기' } };
  const rs = U.craneBoardOf({ info, discharge: { completed: comp }, loading: {} }, [], null, B0 + 22 * H);
  ok(rs.length === 1 && rs[0].no === 1 && rs[0].done === 175 && rs[0].fold && rs[0].fold[0].n === 120, `동방 QC 합계 — 1호기 ${rs[0] && rs[0].done}대 = 55+120 (3호기 ${rs[0] && rs[0].fold && rs[0].fold[0].n}대 포함)`);
}
//  재감사 중-2 — 접은 몫의 마지막 컨·베이가 접히지 않은 몫(야간 B 의 3호기)으로 새지 않는다
{
  const info = { vsl: 'STMJ', craneCrew: { '10-29 주간': { '3호기': { name: 'A', at: B0 + 9 * H }, '1호기': { name: 'A', at: B0 + 10 * H } }, '10-29 야간': { '3호기': { name: 'B', at: B0 + 17.8 * H } } } };
  const tw = { [cn(1)]: { at: B0 + 9.5 * H, equip: 'GC103', pos: '100284' }, [cn(2)]: { at: B0 + 20 * H, equip: 'GC103', pos: '300284' }, [cn(3)]: { at: B0 + 10.5 * H, equip: 'GC101', pos: '050284' } };
  const rs = U.craneBoardOf({ info, discharge: { termWork: tw }, loading: {} }, [], null, B0 + 22 * H);
  const g = (n) => rs.find(r => r.no === n);
  ok(g(1) && g(1).done === 2 && g(1).cn === cn(3) && g(1).bay === '5', `1호기 마지막 컨·베이는 자기 몫(cn ${g(1) && g(1).cn} · 베이 ${g(1) && g(1).bay})`);
  ok(g(3) && g(3).done === 1 && g(3).cn === cn(2) && g(3).bay === '30', `남은 3호기(야간 B)는 자기 컨·베이 30 (cn ${g(3) && g(3).cn} · 베이 ${g(3) && g(3).bay})`);
}
//  하-5 — 표준이 아닌 조 키는 교체로 안 읽는다
ok(U.craneSwapsOf({ craneCrew: { '야간 10-28': { '3호기': { name: 'A', at: B0 }, '1호기': { name: 'A', at: B0 + H } } } }).length === 0, '표준이 아닌 조 키는 교체로 안 읽는다');
//  3차 감사 상-1 — 동방 QC 합계 줄 연쇄 교체(3→2→1)에서도 대수가 안 사라진다
{
  const info = { vsl: 'OBWH', craneCrew: { '10-29 야간': { '3호기': { name: 'C', at: B0 + 18 * H }, '2호기': { name: 'C', at: B0 + 19 * H }, '1호기': { name: 'C', at: B0 + 20 * H } } }, qcWork: { QC101: { qc: 'QC101', disDone: 50, lodDone: 5 }, QC102: { qc: 'QC102', disDone: 30, lodDone: 0 }, QC103: { qc: 'QC103', disDone: 100, lodDone: 20 } } };
  const rs = U.craneBoardOf({ info, discharge: { completed: {} }, loading: {} }, [], null, B0 + 22 * H);
  const tot = rs.reduce((a, r) => a + r.done, 0);
  ok(rs.length === 1 && rs[0].no === 1 && tot === 205, `QC 연쇄 3→2→1 — 합 ${tot}대 = 55+30+120 · 줄 ${rs.map(r => r.no).join('·')}`);
}
//  3차 감사 중-1 — 접속 검수원의 지금 베이는 접기가 덮어쓰지 않는다
{
  const info = { vsl: 'STMJ', craneCrew: { '10-29 주간': { '3호기': { name: 'A', at: B0 + 9 * H }, '1호기': { name: 'A', at: B0 + 10 * H } } } };
  const tw = { [cn(1)]: { at: B0 + 9.5 * H, equip: 'GC103', pos: '100284' }, [cn(3)]: { at: B0 + 10.5 * H, equip: 'GC101', pos: '050284' } };
  const rs = U.craneBoardOf({ info, discharge: { termWork: tw }, loading: {} }, [{ name: 'A', equip: '1호기', bay: '20', tier: '84', mode: 'discharge' }], null, B0 + 11 * H);
  ok(rs[0].no === 1 && rs[0].bay === '20' && rs[0].src === 'live', `접속 검수원 베이 20 유지 (베이 ${rs[0].bay} · ${rs[0].src})`);
}
//  4차 감사 중-1 — 교체 뒤 다른 조가 같은 번호(3호기)를 이어 쓰면 그 사람 기기는 새 호기로 안 읽는다
{
  const info = { vsl: 'STMJ', craneCrew: { '10-29 주간': { '3호기': { name: 'A', at: B0 + 8 * H }, '1호기': { name: 'A', at: B0 + 9 * H } }, '10-29 야간': { '3호기': { name: 'B', at: B0 + 18 * H } } } };
  const tw = { [cn(1)]: { at: B0 + 21 * H, equip: 'GC103', pos: '300284' }, [cn(2)]: { at: B0 + 9.5 * H, equip: 'GC101', pos: '100284' } };
  const vv = { info, discharge: { termWork: tw }, loading: {} };
  const dayNow = B0 + 10 * H, nightNow = B0 + 22 * H;
  ok(U.craneNoAfterSwap(info, 3, nightNow) === 3, '야간 조(B 가 3호기) — 3호기 기기는 3호기 그대로');
  ok(U.craneNoAfterSwap(info, 3, dayNow) === 1, '교체한 주간 조 안 — 옛 3호기 기기는 1호기로');
  const rs = U.craneBoardOf(vv, [{ name: 'B', equip: '3호기', bay: '31', tier: '84', mode: 'discharge' }], null, nightNow);
  ok(rs.find(r => r.no === 3) && rs.find(r => r.no === 3).bay === '31' && rs.find(r => r.no === 3).src === 'live', '야간 B 의 접속 베이 31 은 3호기 줄에');
}
//  4차 감사 하-2 — 동방 QC 접기에서도 접속 검수원 줄의 출처(live)가 유지된다
{
  const info = { vsl: 'OBWH', craneCrew: { '10-29 야간': { '3호기': { name: 'A', at: B0 + 18 * H }, '1호기': { name: 'A', at: B0 + 20 * H } } }, qcWork: { QC101: { qc: 'QC101', disDone: 50, lodDone: 5 }, QC103: { qc: 'QC103', disDone: 100, lodDone: 20 } } };
  const rs = U.craneBoardOf({ info, discharge: { completed: {} }, loading: {} }, [{ name: 'A', equip: '1호기', bay: '20', tier: '84', mode: 'discharge' }], null, B0 + 22 * H);
  ok(rs[0].no === 1 && rs[0].done === 175 && rs[0].src === 'live' && rs[0].bay === '20', `QC 접기 뒤에도 live 유지 (${rs[0].src} · 베이 ${rs[0].bay} · ${rs[0].done}대)`);
}
//  5차 감사 중-1 — 다른 조가 옛 호기를 이어받아 붙으면(접속 검수원) 접어도 그 줄은 남는다
{
  const info = { vsl: 'STMJ', craneCrew: { '10-29 주간': { '3호기': { name: 'A', at: B0 + 8.2 * H }, '1호기': { name: 'A', at: B0 + 9 * H } }, '10-29 야간': { '3호기': { name: 'B', at: B0 + 19.2 * H } } } };
  const tw = { [cn(1)]: { at: B0 + 9.2 * H, equip: 'GC103', pos: '100284' }, [cn(2)]: { at: B0 + 9.4 * H, equip: 'GC101', pos: '050284' } };
  const rs = U.craneBoardOf({ info, discharge: { termWork: tw }, loading: {} }, [{ name: 'B', equip: '3호기', bay: '31', tier: '84', mode: 'discharge' }], null, B0 + 21 * H);
  ok(rs.some(r => r.no === 3 && r.src === 'live' && r.bay === '31' && r.done === 0), '야간 B 가 이어받은 3호기 접속 줄이 남는다');
  ok(U.bayViewFollowOf({ info, discharge: { termWork: tw }, loading: {} }, '3호기', null, '', B0 + 21 * H).no === 3, '따라가기도 3호기');
}
//  5차 감사 중-2 — 동방 QC 합계는 다음 조가 옛 호기를 이어받았으면 접지 않는다
{
  const info = { vsl: 'OBWH', craneCrew: { '10-29 주간': { '3호기': { name: 'A', at: B0 + 8.2 * H }, '1호기': { name: 'A', at: B0 + 9 * H } }, '10-29 야간': { '3호기': { name: 'B', at: B0 + 19.2 * H } } }, qcWork: { QC101: { qc: 'QC101', disDone: 50, lodDone: 5 }, QC103: { qc: 'QC103', disDone: 100, lodDone: 20 } } };
  const rs = U.craneBoardOf({ info, discharge: { completed: {} }, loading: {} }, [], null, B0 + 21 * H);
  ok(rs.length === 2 && rs.find(r => r.no === 1).done === 55 && rs.find(r => r.no === 3).done === 120 && rs.every(r => !r.fold), 'QC 합계 — 다음 조가 3호기를 이어받으면 접지 않는다(1호기 55 · 3호기 120)');
}
//  5차 감사 하-3 — 교대 부근(17:45)에도 기기 매핑과 접기가 같은 조 창을 본다
{
  const info = { vsl: 'STMJ', craneCrew: { '10-29 주간': { '3호기': { name: 'A', at: B0 + 8.2 * H }, '1호기': { name: 'A', at: B0 + 9 * H } } } };
  ok(U.craneNoAfterSwap(info, 3, B0 + 17.75 * H) === 1 && U.craneNoAfterSwap(info, 3, B0 + 17 * H) === 1, '17:00 · 17:45 모두 주간 조 창 안 — 3호기 기기는 1호기');
}
if (fail) { console.error(`✗ 실패 ${fail}`); process.exit(1); }
console.log('호기 교체 연막검사 통과');
