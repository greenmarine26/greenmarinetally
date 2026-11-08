// 4.71 연막검사 — 로그인해 호기를 지정받은 대기자가 상황판 호기 칸 이름에서 빠지지 않는다(작업 중 판정은 그대로)
const fs = require('fs');
const src = fs.readFileSync('src/pages/ChiefDashboard.jsx', 'utf8');
let n = 0, bad = 0;
const ok = (c, m) => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) bad++; };
const m = src.match(/const crewOfVoyage = \(key\) => \{[\s\S]*?\n  \};/);
ok(!!m, 'crewOfVoyage 있음');
const body = m ? m[0] : '';
ok(/standbyOf\(key\)/.test(body) && /assignEquip/.test(body), '대기 이름은 standbyOf(근무조 끝 기준 한 벌)에서 가져온다(4.74-02)');
const eh = require('./loadEquipHold.cjs')('.');
const { standbyNamesOf, holdKeyShiftOf, holderShiftOf, nowShift } = new Function(eh + '; return { standbyNamesOf, holdKeyShiftOf, holderShiftOf, nowShift };')();
const SH = { holdKeyShiftOf, holderShiftOf, nowShift };
const NOW = Date.UTC(2026, 10, 7, 1, 13);   // 2026-11-07 10:13 KST
ok(/standby: true/.test(body) && /bay: null/.test(body), '대기자는 베이 없이 표시만');
ok((src.match(/craneBoardOf\(voyages\?\.\[(?:v|sheetRow)\.key\], crewOfVoyage\(/g) || []).length === 4, '상황판 호기 칸 네 곳이 crewOfVoyage 를 쓴다');
ok(/Date\.now\(\) - i\.lastActive > 90000/.test(src), '작업 중 판정 90초는 그대로');
// 동작 — 본문을 실제로 돌린다
if (m) {
  const isVisibleStaff = () => true, isOwnerName = () => false;
  const mk = (inspectors0, activeByVoyage) => { const inspectors = {}; for (const [k, v] of Object.entries(inspectors0)) inspectors[k] = { lastActive: NOW - 600000, ...v }; const standbyOf = (key) => standbyNamesOf(inspectors, key, (activeByVoyage[key] || []).map((w) => w.name), isVisibleStaff, NOW); return new Function('inspectors', 'activeByVoyage', 'isVisibleStaff', 'isOwnerName', 'inspector', 'standbyOf', 'holdKeyShiftOf', 'holderShiftOf', 'nowShift', body + '; return crewOfVoyage;')(inspectors, activeByVoyage, isVisibleStaff, isOwnerName, 'x', standbyOf, SH.holdKeyShiftOf, SH.holderShiftOf, SH.nowShift); };   // 4.79: 같은 호기 주간·야간 각 1인 — 대기 이름 정렬이 조를 본다
  const I = { a: { name: '최원형', loggedIn: true, assignVoyage: 'V1', assignEquip: '3호기', loginAt: 5, loggedOutAt: 1 }, b: { name: '나간', loggedIn: true, assignVoyage: 'V1', assignEquip: '2호기', loginAt: 1, loggedOutAt: 5 }, c: { name: '딴배', loggedIn: true, assignVoyage: 'V2', assignEquip: '1호기' }, d: { name: '호기없음', loggedIn: true, assignVoyage: 'V1' } };
  const r = mk(I, {})('V1');
  ok(r.length === 1 && r[0].name === '최원형' && r[0].equip === '3호기', '대기자 최원형 3호기만 올라온다');
  const r2 = mk(I, { V1: [{ name: '최원형', equip: '3호기', bay: '10' }] })('V1');
  ok(r2.length === 1 && r2[0].bay === '10', '이미 작업 중이면 중복 없이 작업 정보가 우선');
  const I2 = { a: { name: '최원형', loggedIn: true, assignVoyage: 'V1', assignEquip: '3호기', assignAt: 10 }, e: { name: '대체자', loggedIn: true, assignVoyage: 'V1', assignEquip: '3호기', assignAt: 20 } };
  const r3 = mk(I2, {})('V1');
  ok(r3.length === 2 && r3[r3.length - 1].name === '대체자', '같은 호기 대기자 둘 — 나중에 지정한 사람이 마지막(이름을 얻는다)');
  const r4 = mk(I2, { V1: [{ name: '대체자', equip: '3호기', bay: '12' }] })('V1');
  ok(r4.length === 1 && r4[0].name === '대체자', '그 호기에서 일하는 사람이 있으면 대기자 이름은 올리지 않는다');
  const rOld = mk({ a: { name: '최원형', loggedIn: true, assignVoyage: 'V1', assignEquip: '3호기', loginAt: 5, lastActive: Date.UTC(2026, 10, 6, 13, 49) } }, {})('V1');
  ok(rOld.length === 0, '야간 22:49 마지막 입력 최원형 → 교대 뒤 10:13 에는 상황판 3호기 이름에서 빠진다(4.74-02)');
  const r5 = mk(I2, { V1: [{ name: '제3자', equip: '4호기', bay: '12' }] })('V1');
  ok(r5.length === 3, '다른 호기에서 일하는 사람은 3호기 대기자를 막지 않는다');
}
console.log(`${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
