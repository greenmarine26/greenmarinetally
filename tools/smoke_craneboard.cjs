// 실시간 작업 보드 «호기별 작업 베이»(3.10) — utils.craneBoardOf 가 실데이터(DJCT 0223E 양하 사본)에서 호기마다 지금 베이·대수·이름을 맞게 내는지, 동방(QC 합계)·앱 접속·조 등록이 제대로 겹치는지 검사한다.
const path = require('path');
const fs = require('fs');
const B = process.argv[2];
if (!B) { console.error('사용법: node tools/smoke_craneboard.cjs <utils 번들.cjs>'); process.exit(1); }
global.window = global.window || {}; global.document = global.document || { createElement: () => ({}) };
const U = require(path.resolve(B));
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'craneboard_djct.json'), 'utf8'));
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('실시간 작업 보드 — 호기별 작업 베이');
const v = { info: FX.info, discharge: { termWork: FX.termWork, completed: FX.completed }, loading: {} };
//  기대값은 픽스처에서 독립 계산(코드가 내는 값을 기준표로 안 쓴다)
const exp = {};
for (const [cn, r] of Object.entries(FX.termWork)) { if (!r.at) continue; const no = +String(r.equip).slice(-1); const e = exp[no] || (exp[no] = { n: 0, last: 0, pos: '' }); e.n++; if (r.at > e.last) { e.last = r.at; e.pos = r.pos; } }
const rows = U.craneBoardOf(v, []);
ok(rows.length === Object.keys(exp).length && rows.every((r, i) => r.no === Object.keys(exp).map(Number).sort()[i]), `호기 ${rows.map(r => r.no).join('·')} — 픽스처의 호기와 같다`);
for (const r of rows) {
  const e = exp[r.no];
  ok(r.done === e.n && r.dis === e.n, `${r.no}호기 대수 ${r.done} = 픽스처 ${e.n}`);
  ok(r.bay === String(parseInt(e.pos.slice(0, 2), 10)) && r.row === e.pos.slice(2, 4) && r.tier === e.pos.slice(4, 6), `${r.no}호기 지금 자리 BAY ${r.bay} ${r.row}-${r.tier} = 최신 컨 ${e.pos}`);
  ok(r.mode === 'discharge' && r.src === 'term' && r.lastAt === e.last && r.name === '', `${r.no}호기 양하·터미널 출처·이름은 등록 전 빈칸`);
}
//  같은 컨이 completed(터미널 표기)에도 있으므로 두 번 안 센다
ok(rows.reduce((a, r) => a + r.done, 0) === Object.values(FX.termWork).filter(r => r.at).length, 'termWork+completed 합쳐도 컨을 두 번 안 센다');
//  조 등록 → 이름
const at = Math.max(...Object.values(FX.termWork).map(r => r.at || 0));
const v2 = { ...v, info: { ...FX.info, craneCrew: { '09-05 야간': { '1호기': { name: '홍길동', at }, '2호기': { name: '김철수', at } } } } };
const r2 = U.craneBoardOf(v2, []);
ok(r2.find(r => r.no === 1).name === '홍길동' && r2.find(r => r.no === 2).name === '김철수', '조 등록(야간 1호기 홍길동 2호기 김철수) → 호기 이름');
//  앱 접속 검수원이 가장 최신 — 이름·베이가 그것으로
const r3 = U.craneBoardOf(v2, [{ name: '박진우', equip: '2호기', bay: '14', tier: '86', mode: 'discharge' }]);
ok(r3.find(r => r.no === 2).name === '박진우' && r3.find(r => r.no === 2).bay === '14' && r3.find(r => r.no === 2).src === 'live' && r3.find(r => r.no === 1).bay === rows[0].bay, '앱 접속 검수원(2호기 박진우 BAY 14) → 그 호기만 앱 값, 1호기는 터미널 값 그대로');
//  앱으로 직접 찍은 완료(by 사람·equip)는 termWork 에 없는 컨만 더하고 이름을 준다
const v4 = { info: FX.info, discharge: { termWork: {}, completed: { AAAU1111111: { by: '김성일', at, equip: '3호기' }, BBBU2222222: { by: '김성일', at: at - 1000, equip: '3호기' } }, records: { AAAU1111111: { bay_actual: '22', row_actual: '01', tier_actual: '82' } } }, loading: {} };
const r4 = U.craneBoardOf(v4, []);
ok(r4.length === 1 && r4[0].no === 3 && r4[0].name === '김성일' && r4[0].done === 2 && r4[0].bay === '22' && r4[0].src === 'app', `앱 완료만 있는 배 → 3호기 김성일 2대 BAY 22 (${JSON.stringify(r4[0])})`);
//  동방 — 컨별 호기 없음 → qcWork 합계, 자리 없음
const r5 = U.craneBoardOf({ info: { vsl: 'OBWH', qcWork: { QC101: { qc: 'QC101', disDone: 110, lodDone: 85 }, QC103: { qc: 'QC103', disDone: 78, lodDone: 68 } } }, discharge: {}, loading: {} }, []);
ok(r5.length === 2 && r5[0].no === 1 && r5[0].src === 'qc' && r5[0].dis === 110 && r5[0].lod === 85 && r5[0].bay === '' && r5[1].no === 3, '동방 QC 합계 → 1호기 양110/선85 · 3호기, 자리 없음');
//  감사: 동방 + 앱 완료 1건(1호기)·접속 검수원이 섞여도 QC 합계(257·213)가 안 사라진다 — 3.8 crewWorkStats 와 같은 termHasEquip 갈림
const r6 = U.craneBoardOf({ info: { vsl: 'OBWH', qcWork: { QC101: { qc: 'QC101', disDone: 257, lodDone: 0 }, QC103: { qc: 'QC103', disDone: 213, lodDone: 0 } } }, discharge: { completed: { CCCU3333333: { by: '김성일', at, equip: '1호기' } }, records: { CCCU3333333: { bay_actual: '12' } } }, loading: {} }, [{ name: '이인철', equip: '3호기', bay: '6', tier: '84', mode: 'discharge' }]);
ok(r6.length === 2 && r6[0].no === 1 && r6[0].qc && r6[0].dis === 257 && r6[0].name === '김성일' && r6[0].bay === '12' && r6[1].no === 3 && r6[1].qc && r6[1].dis === 213 && r6[1].name === '이인철' && r6[1].bay === '6' && r6[1].src === 'live', `동방 + 앱 완료·접속 혼합 → QC 257·213 유지 + 이름·베이 (${JSON.stringify(r6.map(r => [r.no, r.name, r.dis, r.bay, r.src]))})`);
//  감사: 접속 검수원 베이가 덮을 때 다른 컨의 로우가 안 남는다 · by 는 가장 늦게 찍은 사람
ok(r3.find(r => r.no === 2).row === '' && r3.find(r => r.no === 2).tier === '86', '접속 검수원 BAY 14 → 로우 빈칸·단 86(터미널 컨의 로우가 안 남는다)');
const r7 = U.craneBoardOf({ info: {}, discharge: { termWork: {}, completed: { A1: { by: '먼저', at: at - 5000, equip: '1호기' }, A2: { by: '나중', at, equip: '1호기' } } }, loading: {} }, []);
ok(r7[0].name === '나중', '이름은 가장 늦게 찍은 사람(나중)');
//  빈 항차·null 방어
ok(U.craneBoardOf(null, []).length === 0 && U.craneBoardOf({ info: {} }, null).length === 0, '빈 항차·null 도 조용히 빈 배열');
//  터미널 표기·«카토스» 글자가 이름에 새지 않는다
ok(rows.concat(r2, r3, r4, r5).every(r => !/CATOS|카토스|터미널/.test(r.name)), '이름 칸에 터미널 표기 없음');
//  ★ 3.30 — **4·5호기가 조용히 사라지지 않는가**(검수사 확답 «③3 유지하고 «+N호기 더»를 누르면 펴지게»).
//    부두 정본은 PCTC 4호기 · 동방 5호기다 — 상한 3 만 있고 여는 길이 없으면 25~40%가 화면에서 없어진다.
{
  const fs2 = require('fs'), path2 = require('path');
  const cd = fs2.readFileSync(path2.join(__dirname, '..', 'src', 'pages', 'ChiefDashboard.jsx'), 'utf8');
  ok(/const \[craneOpen, setCraneOpen\] = useState\(false\);/.test(cd), '호기 펼침 상태가 있다(기본은 접힘 — 칸이 안 좁아진다)');
  ok(/const shown = craneOpen \? cranes\.slice\(0, 5\) : cranes\.slice\(0, 3\);/.test(cd), '⛔ 접으면 3칸·펴면 5칸이 아니다');
  ok(/setCraneOpen\(\(o\) => !o\)/.test(cd), '⛔ «+N칸 더»를 누를 수 없다 — 안내만 있고 여는 길이 없다');
  ok(/const bays = craneOpen \? allBays : allBays\.slice\(0, bayCapShut\);/.test(cd),
    '⛔ 동방 경로(boardBaysOf)가 언제나 3 으로 잘린다 — 총량을 뽑고 화면에서 잘라야 한다');
  ok(/const openBtn = \(hidden\) =>/.test(cd) && (cd.match(/\{openBtn\(/g) || []).length >= 2,
    '⛔ 단추가 호기 갈래에만 있다 — 동방 갈래(지금 작업 중인 베이)에서는 펼 길이 없다(감사가 잡은 절반 미배송)');
  ok(/bays\.length >= 5 \? 'grid-cols-5'/.test(cd), '⛔ 동방 격자가 4·5칸을 모른다 — 펴도 세 칸에 2줄로 접힌다');
  ok(/craneOpen \? cranes\.slice\(0, 5\)/.test(cd), '⛔ 펼치면 상한이 없다 — 6칸 이상이면 격자가 접혀 그림이 뭉갠다');
  ok(/\{openBtn\(bayMore\)\}/.test(cd) && /\{openBtn\(more\)\}/.test(cd), '⛔ 두 갈래가 같은 단추를 쓰지 않는다');
  ok(/shown\.length >= 5 \? 'grid-cols-5'/.test(cd) && /shown\.length === 4 \? 'grid-cols-4'/.test(cd),
    '⛔ 격자가 4·5칸을 모른다 — 펴도 세 칸에 겹친다');
  //  부두 정본이 정말 4·5 인지 — 상한을 3 으로 되돌리는 다음 판을 막는다
  const uu = fs2.readFileSync(path2.join(__dirname, '..', 'src', 'utils.js'), 'utf8');
  //  ⚠ 종전 정규식은 APP_VERSION **주석**을 먼저 물어 «4|5» 가 언제나 참인 항등식이었다(감사 실측).
  //    함수 본문을 집어 정본을 읽는다 — 부두별 호기가 3 으로 줄면 여기서 걸린다.
  const m = uu.match(/export function equipNumbersForPier[\s\S]{0,400}/);
  ok(!!m, 'equipNumbersForPier 함수를 찾았다');
  ok(!!m && /5/.test(m[0]) && /4/.test(m[0]),
    `⛔ 부두별 호기 정본에 4·5호기가 없다 — 상한 3 으로 되돌아갔는가 (${m ? m[0].replace(/\s+/g, ' ').slice(0, 120) : ''})`);
}

//  ★ 3.38: 동방(컨별 호기 없음)도 **같은 시각에 함께 찍힌 베이**로 호기·베이를 잇는다.
//    검수사 확정 2026-09-09 «동시간대 … 하나는 02베이 하나는 10번베이라면 1호기 2번베이 2호기 10번 베이».
//    ⚠ 소스를 훑지 않고 **실제로 돌려서 값을 본다**(인계함 교훈 — 이름만 바꾸면 뚫리는 검사를 만들지 않는다).
{
  const T = (at, pos) => ({ at, pos, src: 'pnct' });
  const vP = { info: { vsl: 'OBWH', pier: 'PNCT', qcWork: { QC101: { qc: 'QC101', disDone: 24, lodDone: 0 }, QC102: { qc: 'QC102', disDone: 28, lodDone: 0 } } },
    discharge: { termWork: {
      A1: T(1000 * 60 * 1, '020384'), B1: T(1000 * 60 * 1, '100786'),      // 같은 시각 — 작은 베이 02 = 1호기
      A2: T(1000 * 60 * 3, '060486'), B2: T(1000 * 60 * 3, '140586'),      // 같은 시각 — 06 = 1호기 · 14 = 2호기
      C1: T(1000 * 60 * 5, '140884'),                                      // 짝 없음 — 이름표(14→2호기)로 붙는다
    } }, loading: {} };
  const tb = U.craneBaysByTime(vP);
  //  «그 순간»의 바구니 하나로 정한다 — 가장 늦은 성한 바구니(3분: 06·14)가 지금 자리다
  ok(tb.pairs === 2 && tb.byBay['6'] === 1 && tb.byBay['14'] === 2 && Object.keys(tb.byBay).length === 2,
    `가장 늦은 동시각 바구니로 베이→호기 (${JSON.stringify(tb.byBay)})`);
  const rP = U.craneBoardOf(vP, []);
  const c1 = rP.find((c) => c.no === 1), c2 = rP.find((c) => c.no === 2);
  ok(!!c1 && c1.bay === '6' && c1.dis === 24 && c1.qc && c1.src === 'qcbay', `동방 1호기 = 베이 6 · 양하 24대 (${JSON.stringify(c1)})`);
  ok(!!c2 && c2.bay === '14' && c2.dis === 28 && c2.qc && c2.src === 'qcbay', `동방 2호기 = 베이 14 · 양하 28대 (${JSON.stringify(c2)})`);
  ok(!rP.some((c) => !(c.bay && /\d/.test(String(c.bay)))), '⛔ 자리가 안 붙은 호기가 있다 — 화면이 다시 «베이로 묶었습니다» 로 떨어진다');
  //  사람이 찍은 자리를 터미널 추론이 덮지 않는다
  const vH = JSON.parse(JSON.stringify(vP));
  vH.discharge.completed = { Z9: { by: '김성일', at: 1000 * 60 * 9, equip: '1호기' } };
  vH.discharge.records = { Z9: { bay_actual: '22' } };
  const cH = U.craneBoardOf(vH, []).find((c) => c.no === 1);
  ok(!!cH && cH.bay === '22', `사람이 찍은 자리(22)가 터미널 추론을 이긴다 (${cH && cH.bay})`);
  //  호기가 하나뿐이면 가르지 않는다(짝이 없다)
  const vOne = { info: { qcWork: { QC101: { qc: 'QC101', disDone: 5, lodDone: 0 } } }, discharge: { termWork: { A1: T(60000, '020384') } }, loading: {} };
  ok(U.craneBaysByTime(vOne).pairs === 0 && !Object.keys(U.craneBaysByTime(vOne).byBay).length, '호기 하나면 시각으로 가르지 않는다');
  //  터미널 자료가 아예 없으면 종전대로 «자리 없음»
  const vNo = { info: { qcWork: { QC101: { qc: 'QC101', disDone: 3, lodDone: 0 }, QC102: { qc: 'QC102', disDone: 4, lodDone: 0 } } }, discharge: {}, loading: {} };
  ok(U.craneBoardOf(vNo, []).every((c) => c.bay === ''), '터미널 자료가 없으면 종전대로 자리 없음');

  //  ── 감사 지적(2026-09-09) 회귀 — «조용히 틀리느니 안 붙인다» ─────────────────
  //  ⛔ 3갱인데 두 대만 도는 바구니 — 종전 코드는 호기 목록 앞자리(1·2호기)에 꽂아 **남의 베이 그림**을 냈다.
  const v3 = { info: { qcWork: { QC101: { qc: 'QC101', disDone: 5, lodDone: 0 }, QC102: { qc: 'QC102', disDone: 6, lodDone: 0 }, QC103: { qc: 'QC103', disDone: 7, lodDone: 0 } } },
    discharge: { termWork: { A: T(60000, '100786'), B: T(60000, '140586'), C: T(120000, '100388') } }, loading: {} };
  const t3 = U.craneBaysByTime(v3);
  ok(t3.pairs === 0 && !Object.keys(t3.byBay).length && /못 가렸다|호기/.test(t3.why || ''),
    `⛔ 3갱인데 두 대만 돈 바구니로 이름표를 만들었다 (pairs ${t3.pairs} · byBay ${JSON.stringify(t3.byBay)} · why «${t3.why}»)`);
  ok(U.craneBoardOf(v3, []).every((c) => c.bay === ''), '⛔ 일부 호기만 자리가 붙어 나머지가 그림을 잃는다 — 전부 아니면 전무여야 한다');

  //  ⛔ 한 분에 세 베이(한 크레인이 두 대를 낸 분) — 가운데가 틀리게 붙으면 안 된다
  const vOver = { info: { qcWork: { QC101: { qc: 'QC101', disDone: 2, lodDone: 0 }, QC102: { qc: 'QC102', disDone: 2, lodDone: 0 } } },
    discharge: { termWork: { A: T(60000, '020384'), B: T(60000, '030484'), C: T(60000, '100586'),
      D: T(120000, '020684'), E: T(120000, '100786'), F: T(180000, '020884'), G: T(180000, '100986') } }, loading: {} };
  const tO = U.craneBaysByTime(vOver);
  ok(tO.skipped === 1 && tO.pairs === 2 && tO.byBay['3'] === undefined,
    `⛔ 베이가 호기 수보다 많은 바구니를 썼다 — 가운데 베이가 남의 호기로 붙는다 (skipped ${tO.skipped} · pairs ${tO.pairs} · byBay ${JSON.stringify(tO.byBay)})`);
  ok(tO.byBay['2'] === 1 && tO.byBay['10'] === 2, `성한 바구니로는 제대로 붙는다 (${JSON.stringify(tO.byBay)})`);

  //  ⛔ 크레인이 옮겨 다닌 과거가 «지금 자리»를 흐리면 안 된다 — 베이 6 을 1호기가 하다 2호기가 이어받은 자료.
  //    누적 표로 굳히면 6 이 1호기로 남는다(실측 OBWH 2735E 에서 베이 10 이 그랬다).
  const vTie = { info: { qcWork: { QC101: { qc: 'QC101', disDone: 2, lodDone: 0 }, QC102: { qc: 'QC102', disDone: 2, lodDone: 0 } } },
    discharge: { termWork: { A: T(60000, '060384'), B: T(60000, '140484'), C: T(120000, '020584'), D: T(120000, '060684') } }, loading: {} };
  const tT = U.craneBaysByTime(vTie);
  ok(tT.byBay['6'] === 2 && tT.byBay['2'] === 1 && tT.at === 120000,
    `⛔ 과거 표가 지금 자리를 덮었다 — 마지막 순간(02·06)을 따라야 한다 (${JSON.stringify(tT.byBay)} · 기준 ${tT.at})`);

  //  ⛔ 한 크레인이 한 분에 **붙은 베이 짝**(02·03)을 내리고 다른 호기가 침묵한 분 — 크기가 우연히 맞아 통과하면 안 된다.
  //    재감사 지적(2026-09-09) · 실측 근거 OBWH 2735E 에서 1호기가 베이 02·03 을 오갔다.
  const vAdj = { info: { qcWork: { QC101: { qc: 'QC101', disDone: 2, lodDone: 0 }, QC102: { qc: 'QC102', disDone: 2, lodDone: 0 } } },
    discharge: { termWork: { A: T(60000, '020384'), B: T(60000, '030484'), C: T(120000, '020584'), D: T(120000, '100686') } }, loading: {} };
  //  ⛔ 3.38-01 라이브 실측 — 17·19 는 «BAY 17 BAY (18)19» 한 그림이다. 차 2 도 한 자리로 봐야 한다.
  const vLive = { info: { qcWork: { QC101: { qc: 'QC101', disDone: 78, lodDone: 0 }, QC102: { qc: 'QC102', disDone: 94, lodDone: 0 } } },
    discharge: { termWork: { P: T(60000, '170184'), Q: T(60000, '190284'), R: T(120000, '070384'), S: T(180000, '170484'), V: T(180000, '190584'),
      W: T(240000, '070684'), X: T(240000, '180786') } }, loading: {} };
  const tL = U.craneBaysByTime(vLive);
  ok(tL.byBay['17'] === undefined && tL.byBay['19'] === undefined && tL.skipped >= 2,
    `⛔ 한 그림에 그려지는 17·19 를 두 호기로 갈랐다 — 라이브에서 두 호기가 같은 그림을 그렸다 (byBay ${JSON.stringify(tL.byBay)} · skipped ${tL.skipped})`);
  ok(tL.byBay['7'] === 1 && tL.byBay['18'] === 2, `떨어진 7·18 은 제대로 갈린다 (${JSON.stringify(tL.byBay)})`);

  const tA = U.craneBaysByTime(vAdj);
  ok(tA.skipped === 1 && tA.byBay['3'] === undefined && tA.byBay['2'] === 1 && tA.byBay['10'] === 2 && tA.at === 120000,
    `⛔ 붙은 베이 짝(02·03)을 두 호기로 갈랐다 — 한 크레인 자리다 (skipped ${tA.skipped} · byBay ${JSON.stringify(tA.byBay)})`);
  //  성한 순간이 하나도 없으면 아무도 안 붙는다
  const vAllAdj = { info: { qcWork: { QC101: { qc: 'QC101', disDone: 1, lodDone: 0 }, QC102: { qc: 'QC102', disDone: 1, lodDone: 0 } } },
    discharge: { termWork: { A: T(60000, '020384'), B: T(60000, '030484') } }, loading: {} };
  const tAA = U.craneBaysByTime(vAllAdj);
  ok(!Object.keys(tAA.byBay).length && /함께 찍힌 자료가 없다/.test(tAA.why || ''),
    `⛔ 붙은 짝뿐인데도 이름표를 만들었다 (byBay ${JSON.stringify(tAA.byBay)} · why «${tAA.why}»)`);
}

console.log(fail ? `✗ 실패 ${fail}건` : '✓ 실시간 작업 보드 호기별 검사 통과');
process.exit(fail ? 1 : 0);
