// 3.8 호기–검수원 등록 연막검사 — 검수사 «OWBH 1호기 이인철 3호기 최관식 이렇게 불러주면 앱에 등록 — 누가 몇 개나, 어디까지».
//   실측 문장(김성일 2026-09-04 SWMM 22:11/22:12) 그대로 알아듣는가 · 조 키가 맞는가 · 실데이터 693대가 조·호기·사람으로 정확히 갈리는가 · 배선이 네 화면에 있는가.
process.env.TZ = 'Asia/Seoul';   // 조 경계(08:00·19:00)는 평택 시각이다
const path = require('path');
const fs = require('fs');
const M = require(path.resolve(process.argv[2]));   // smoke_crew_entry 번들
const ROOT = process.argv[3] || process.cwd();
let bad = 0; const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };
//  서버 명단 — 실측 RTDB staffList(2026-09-05) 에만 있는 이름. 앱은 App.jsx 가 구독으로 밀어 넣는다.
M.setServerRoles({ '박진우': { name: '박진우', role: '검수' }, '송제욱': { name: '송제욱', role: '검수' }, '고현석': { role: '검수' } });
const P = (q) => M.parseNaturalQuery(q);
const crewStr = (p) => (p.crewSet ? p.crewSet.crew.map((c) => `${c.no}${c.name}`).join(',') : '');

//  ── ① 알아듣기 — 검수사·검수원 실측 문장 ──
{
  let p = P('주간 1호기 김판석 2호기 송제욱');
  T(p.crewSet && p.crewSet.shift === '주간' && crewStr(p) === '1김판석,2송제욱', `실측 22:11 문장을 못 알아듣는다 (${crewStr(p)})`);
  p = P('야간 1호기 박진우 2호기 김성일');
  T(p.crewSet && p.crewSet.shift === '야간' && crewStr(p) === '1박진우,2김성일', `실측 22:12 문장을 못 알아듣는다 (${crewStr(p)})`);
  p = P('OWBH 1호기 이인철 3호기 최관식');
  T(p.crewSet && p.crewSet.shift === null && crewStr(p) === '1이인철,3최관식', '검수사 원문(조 없음)을 못 알아듣는다');
  T(p.digits === null, '«1호기 … 3호기» 의 1·3 이 끝자리 «13» 으로 새어 컨 조회가 된다');
  T(M.hasAnyCondition(p), '등록 문장을 «못 알아들은 말»(miss)로 적는다');
  T(crewStr(P('미르야 1호기는 이인철이 3호기는 최관식이야')) === '1이인철,3최관식', '조사(이/이야)를 못 뗀다');
  T(crewStr(P('이인철 1호기 최관식 3호기')) === '1이인철,3최관식', '이름-먼저 어순을 잘못 짝짓는다');
  p = P('1호기 이인철 3호기 최관씩');
  T(crewStr(p) === '1이인철' && p.crewSet.unknown.length === 1 && p.crewSet.unknown[0].tok === '최관씩', '명단에 없는 이름을 조용히 버리거나 사람으로 적는다');
  T(crewStr(P('3호기 최관식으로 바꿔')) === '3최관식', '한 호기만 고쳐 말한 것을 못 받는다');
  //  등록이 아닌 것
  T(!P('2호기는 23:15 3호기는 23:20').crewSet && !!P('2호기는 23:15 3호기는 23:20').startSet, '호기별 시작 시각(2.74)을 등록으로 가로챈다');
  T(!P('1호기 홍길동').crewSet, '명단에 없는 이름뿐인데 등록으로 본다');
  T(!P('2호기 양하시작').crewSet, '«양하시작» 을 사람 이름으로 적는다');
  T(!P('1호기 몇 개 했어').crewSet && !P('3호기 누구야').crewSet, '묻는 말을 등록으로 본다');
}
//  ── ①-B 2차 시뮬(다른 클로드)이 짚은 경계 ──
{
  T(crewStr(P('1호기는 이인철이에요')) === '1이인철', '겹조사(이+에요)를 못 뗀다 — 조용히 아무 일도 안 하던 것');
  T(!P('1호기 김석호').crewSet, '«김석호» 를 «김석»으로 등록한다(접두 오탐)');
  T(crewStr(P('1호기 김석이')) === '1김석', '두 자 이름+조사(«김석이»)를 못 받는다');
  const nx = P('내일 주간 1호기 김판석');
  T(nx.crewSet && nx.crewSet.dayOff === 1 && nx.crewSet.shift === '주간', '«내일 주간» 의 내일을 버린다');
  T(M.crewShiftKey('주간', new Date(2026, 8, 4, 22, 11).getTime(), 1).key === '09-05 주간', '22:11 «내일 주간» 이 09-05 주간이 아니다');
}
//  ── ①-C 감사(다른 클로드)가 짚은 것 — 되묻기·취소·호칭·시작 알림 겹침 ──
{
  for (const s2 of ['1호기 박진우 맞아?', '1호기 김성일 아니야?', '1호기 박진우 맞지']) T(!P(s2).crewSet, `«${s2}» 되묻는 말이 정본을 덮어쓴다`);
  T(P('1호기 박진우 맞아?').crewQuery && P('1호기 박진우 맞아?').crewQuery.kind === 'who', '«1호기 박진우 맞아?» 에 지금 등록을 답하지 않는다');
  for (const s2 of ['1호기 김성일 취소', '1호기 김성일 빼줘', '1호기 검수원 지워']) { const p = P(s2); T(!p.crewSet && p.crewQuery && p.crewQuery.kind === 'cancel', `«${s2}» 취소 말이 등록되거나 조용히 사라진다`); }
  T(!P('1호기 지워').crewQuery && !P('1호기 지워').crewSet, '이름·검수원 없는 «1호기 지워» 를 검수원 취소로 단정한다');
  T(/지우기는 아직 없어요/.test(M.generateLocalAnswer(P('1호기 김성일 취소'), [], [], { crewAnswer: () => null })), '취소를 말로 안 받는다');
  T(!P('2호기 양하 취소').crewQuery && !P('3호기 완료 취소해줘').crewQuery, '«2호기 양하 취소» 같은 딴 말을 검수원 취소로 잡는다(재감사 지적)');
  T(!P('김성일 몇 시에 시작했어').crewQuery && P('김성일 몇 시에 시작했어').timeQuery, '«김성일 몇 시에 시작했어» 에 사람 답이 덧붙는다');
  T(crewStr(P('1호기 김판석씨 2호기 송제욱씨')) === '1김판석,2송제욱' && P('1호기 김판석씨 2호기 송제욱씨').digits === null, '«김판석씨» 호칭이 붙으면 끝자리 12 컨 조회로 샌다');
  T(crewStr(P('1호기 김판석님')) === '1김판석', '«김판석님» 을 못 받는다');
  const st = P('1호기 김성일 22시부터 시작했어');
  T(!!st.startSet && !st.crewSet && !st.crewQuery && !!st.gangQuery, '«1호기 김성일 22시부터 시작했어» 가 시작 알림(2.74)이 아니라 사람 답으로 간다');
  const w = P('이인철 어디까지 했어');
  T(w.crewQuery && !w.briefingQuery && !w.posQuery, '«이인철 어디까지 했어» 가 브리핑·위치 갈래로 새어 항차 화면에서 브리핑을 낸다');
  T(!P('김석호 몇 개 했어').crewQuery, '«김석호» 를 «김석»으로 읽는다(2자 이름 낱말 경계)');
  //  콘앱(crewAnswer 없는 자리)에서는 «기억할게요» 라고 말하면 거짓이다 — 저장 배선이 없다
  const cone = M.generateLocalAnswer(P('1호기 김성일'), [], [], null);
  T(/검수앱에서/.test(cone) && !/기억할게요/.test(cone), `콘앱에서 «기억할게요» 라고 거짓말한다\n${cone}`);
}
//  ── ② 조회 인텐트 ──
{
  const q = (s) => P(s).crewQuery;
  T(q('3호기 누구야') && q('3호기 누구야').kind === 'who' && q('3호기 누구야').no === 3, '«3호기 누구야» 를 못 알아듣는다');
  T(q('김성일 몇 개 했어') && q('김성일 몇 개 했어').kind === 'name' && q('김성일 몇 개 했어').name === '김성일', '«김성일 몇 개 했어» 를 못 알아듣는다');
  T(q('박진우 몇 대 했어') && q('박진우 몇 대 했어').name === '박진우', '서버 명단 이름(박진우)을 못 알아본다');
  T(q('이인철 어디까지 했어') && q('이인철 어디까지 했어').kind === 'name', '«어디까지» 를 못 알아듣는다');
  T(q('누가 몇 개 했어') && q('누가 몇 개 했어').kind === 'all', '«누가 몇 개 했어» 를 못 알아듣는다');
  T(q('호기별 작업량') && q('호기별 작업량').kind === 'all', '«호기별 작업량» 을 못 알아듣는다');
  T(q('1호기 몇 개 했어') && q('1호기 몇 개 했어').kind === 'crane', '«1호기 몇 개 했어» 를 못 알아듣는다');
  T(P('1호기 몇 개 했어').progressQuery === null, '«1호기 몇 개» 가 항차 전체 진행(progressQuery)으로도 잡혀 답이 두 벌이 된다');
  T(!q('1호기 리퍼 몇 대야'), '화물 질문(«1호기 리퍼 몇 대»)을 검수원 답으로 가로챈다');
  T(!q('4호기 몇 시 시작이야'), '시각 질문을 검수원 답으로 가로챈다');
  T(!q('리퍼 몇 대') && !q('0320') && !q('김성일 아저씨 점심 드셨어요'), '무관한 말에 검수원 답이 붙는다');
  //  2차 시뮬 지적 — «남았어» 는 잔여 질문이다
  for (const s2 of ['2호기 몇 개 남았어', '김성일 몇 개 남았어', '누가 몇 대 남았어']) {
    T(!q(s2), `«${s2}» 를 «몇 개 했어»로 뒤집어 답한다`);
  }
  T(P('2호기 몇 개 남았어').progressQuery === 'pending', '«2호기 몇 개 남았어» 의 잔여 의도(pending)가 사라진다');
  T(q('1호기 검수원 누구야') && q('1호기 검수원 누구야').kind === 'who' && q('1호기 검수원 누구야').no === 1, '«1호기 검수원 누구야» 가 호기 답(who)이 아니다');
  const wl = P('김성일 작업량');
  T(wl.crewQuery && wl.crewQuery.kind === 'name' && !wl.gangQuery, '«김성일 작업량» 이 갱 배분 되묻기로 간다');
}
//  ── ③ 조 키 — 지금과 가장 가까운 그 조 ──
{
  const t2211 = new Date(2026, 8, 4, 22, 11).getTime();
  T(M.crewShiftKey('주간', t2211).key === '09-04 주간', `22:11 에 «주간» = 방금 끝난 오늘 주간이어야 한다 (${M.crewShiftKey('주간', t2211).key})`);
  T(M.crewShiftKey('야간', t2211).key === '09-04 야간', '22:11 에 «야간» = 지금 야간');
  T(M.crewShiftKey(null, t2211).key === '09-04 야간', '조를 안 대면 지금 조');
  T(M.crewShiftKey('주간', new Date(2026, 8, 5, 7, 0).getTime()).key === '09-05 주간', '07:00 에 «주간» = 곧 시작할 오늘 주간');
  T(M.crewShiftKey('야간', new Date(2026, 8, 5, 2, 0).getTime()).key === '09-04 야간', '새벽 2시 «야간» = 어제 시작한 그 야간(야간은 시작한 날)');
  //  감사 지적 — gangKeyFromWords 와 기준일이 같아야 한다(«야간 중 주간 = 방금 끝난 주간» 만 예외)
  T(M.crewShiftKey('야간', new Date(2026, 8, 5, 12, 0).getTime()).key === '09-05 야간', '정오에 «야간» 이 지난밤(09-04)에 붙는다 — 오늘 밤이어야 한다');
  T(M.crewShiftKey('주간', new Date(2026, 8, 5, 3, 0).getTime(), 1).key === '09-05 주간', '03:00 «내일 주간» 이 09-05 주간이 아니다(gangKeyFromWords 와 다름)');
  T(M.crewShiftKey('야간', new Date(2026, 8, 5, 7, 0).getTime(), 1).key === '09-06 야간', '07:00 «내일 야간» 이 09-06 야간이 아니다');
  T(M.crewShiftKey(null, new Date(2026, 8, 5, 18, 0).getTime()).key === '09-05 야간', '교대 사이(18:00) 조를 안 대면 다가오는 야간이어야 한다');
}
//  ── ④ 실데이터 — SWMM 2609S 선적 693대를 등록으로 나눈다 ──
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/crew_swmm.json'), 'utf8'));
{
  const t1 = new Date(2026, 8, 4, 22, 11).getTime(), t2 = t1 + 60000;
  const v = JSON.parse(JSON.stringify(fx.swmm));
  v.info.craneCrew = { '09-04 주간': { '1호기': { name: '김판석', at: t1 }, '2호기': { name: '송제욱', at: t1 } }, '09-04 야간': { '1호기': { name: '박진우', at: t2 }, '2호기': { name: '김성일', at: t2 } } };
  const st = M.crewWorkStats(v);
  T(st.registered && st.shifts.length === 2 && st.shifts[0].key === '09-04 주간', '등록을 조 순서로 못 편다');
  const n = (k, no) => { const r = st.rows.find((x) => x.key === k && x.no === no); return r ? r.n : -1; };
  T(n('09-04 주간', 1) === 209, `주간 1호기 김판석 209 이어야 한다 (${n('09-04 주간', 1)})`);
  T(n('09-04 주간', 2) === 236, `주간 2호기 송제욱 236 (${n('09-04 주간', 2)})`);
  T(n('09-04 야간', 1) === 129, `야간 1호기 박진우 129 (${n('09-04 야간', 1)})`);
  T(n('09-04 야간', 2) === 119, `야간 2호기 김성일 119 (${n('09-04 야간', 2)})`);
  T(st.rows.reduce((a, r) => a + r.n, 0) === 693, '조·호기로 나눈 합이 693 이 아니다 — 새거나 겹친다');
  T(st.byName['김성일'] && st.byName['김성일'].n === 119 && st.byName['김성일'].lastPos === '380690', '«김성일 몇 개» 가 119·마지막 38-06-90 이 아니다');
  const now = new Date(2026, 8, 4, 22, 30).getTime();
  const a1 = M.answerCraneCrew(v, { kind: 'name', name: '김성일' }, now);
  T(/김성일 — 119대/.test(a1) && /38번 베이 06열 90단/.test(a1), `«김성일 몇 개 했어» 답이 틀리다\n${a1}`);
  const a2 = M.answerCraneCrew(v, { kind: 'who', no: 1 }, now);
  T(/1호기는 지금 박진우/.test(a2) && /09-04 주간 김판석/.test(a2), `«1호기 누구야» 답이 틀리다\n${a2}`);
  const a3 = M.answerCraneCrew(v, { kind: 'all' }, now);
  T(/김판석 — 209대/.test(a3) && /송제욱 — 236대/.test(a3) && /박진우 — 129대/.test(a3) && /김성일 — 119대/.test(a3), `«누가 몇 개 했어» 답이 틀리다\n${a3}`);
  const a4 = M.answerCraneCrew(v, { kind: 'crane', no: 2 }, now);
  T(/2호기 — 355대/.test(a4), `«2호기 몇 개» 합계 355 가 아니다\n${a4}`);
  //  등록 없이 — 카토스 배는 사람을 모른다(지어내지 않는다)
  const v0 = JSON.parse(JSON.stringify(fx.swmm));
  const st0 = M.crewWorkStats(v0);
  T(!st0.registered && Object.keys(st0.byName).length === 0 && st0.byCrane[1] && st0.byCrane[1].n === 338, '등록 없는 카토스 배에서 사람 이름을 지어내거나 호기 합계(338)를 못 낸다');
  T(/등록이 아직 없어요/.test(M.answerCraneCrew(v0, { kind: 'all' }, now)) || /검수원 미등록/.test(M.answerCraneCrew(v0, { kind: 'all' }, now)), '등록 없음을 사실대로 말하지 않는다');
  //  같은 조·같은 호기를 다시 말하면 뒤엣것 — 파서 단계
  T(crewStr(P('1호기 김판석 1호기 송제욱')) === '1송제욱', '같은 호기 두 번이면 뒤엣것이어야 한다');
}
//  ── ④-B 감사 지적 — 앱 완료의 by 가 등록보다 앞 · 다음 조 등록이 없으면 자연 끝에서 끊는다 · 경계 정각 ──
{
  const mk = (rows) => ({ info: { vsl: 'SWTD', pier: 'PCTC' }, discharge: { termWork: Object.fromEntries(rows.map((r, i) => [`TESTU${String(i).padStart(7, '0')}`, r])) }, loading: {} });
  const T27 = (h, m, d = 27) => new Date(2026, 7, d, h, m).getTime();
  const v = mk([{ at: T27(23, 0), equip: 'GC103' }, { at: T27(3, 0, 28), equip: 'GC103' }, { at: T27(10, 0, 28), equip: 'GC103' }, { at: T27(20, 0, 28), equip: 'GC103' }]);
  v.info.craneCrew = { '08-27 야간': { '3호기': { name: '최관식', at: T27(23, 20) } } };
  const st = M.crewWorkStats(v);
  T(st.byName['최관식'] && st.byName['최관식'].n === 2, `야간 등록 하나로 다음 날 낮·밤 작업까지 최관식 몫이 된다 (${st.byName['최관식'] && st.byName['최관식'].n})`);
  T(st.outside === 2 && st.rows.some((r) => r.key === '' && !r.name && r.n === 2), '등록된 조 밖 작업을 «조 미상»으로 남기지 않는다');
  T(/조 미상/.test(M.answerCraneCrew(v, { kind: 'all' })) && /다음 조 등록이 없어요/.test(M.answerCraneCrew(v, { kind: 'all' })), '창 밖이 있는데 «다음 조 등록이 없어요» 를 안 밝힌다');
  //  by 우선 — 등록이 앱 기록을 덮으면 «앱 완료 기록도 없어요» 거짓말(NSDC 김성일 136대)
  const v2 = { info: { vsl: 'NSDC', pier: 'PNCT' }, discharge: { completed: { 'TESTU0000001': { at: T27(23, 0), by: '김성일', equip: '1호기' }, 'TESTU0000002': { at: T27(23, 5), by: '김성일', equip: '1호기' } } }, loading: {} };
  v2.info.craneCrew = { '08-27 야간': { '1호기': { name: '박진우', at: T27(22, 0) } } };
  const st2 = M.crewWorkStats(v2);
  T(st2.byName['김성일'] && st2.byName['김성일'].n === 2 && !st2.byName['박진우'], '등록(박진우)이 앱으로 직접 찍은 사람(김성일)을 덮는다');
  T(/김성일 — 2대/.test(M.answerCraneCrew(v2, { kind: 'name', name: '김성일' })), '«김성일 몇 개» 가 앱 기록 2대를 못 낸다');
  //  경계 정각 — 19:00:00.000 은 야간조
  const v3 = mk([{ at: new Date(2026, 8, 4, 19, 0, 0, 0).getTime(), equip: 'GC101' }, { at: new Date(2026, 8, 4, 18, 59, 59, 999).getTime(), equip: 'GC101' }]);
  v3.info.craneCrew = { '09-04 주간': { '1호기': { name: '김판석', at: new Date(2026, 8, 4, 9, 0).getTime() } }, '09-04 야간': { '1호기': { name: '박진우', at: new Date(2026, 8, 4, 19, 5).getTime() } } };
  const st3 = M.crewWorkStats(v3);
  T(st3.byName['박진우'] && st3.byName['박진우'].n === 1 && st3.byName['김판석'] && st3.byName['김판석'].n === 1, '조 경계 정각(19:00:00)이 야간조로 안 간다');
  //  카페리(주야 없음)는 한 등록이 끝까지
  const v4 = mk([{ at: new Date(2026, 8, 7, 11, 0).getTime(), equip: 'GC101' }, { at: new Date(2026, 8, 7, 22, 0).getTime(), equip: 'GC101' }]); v4.info.vsl = 'OBWH';
  v4.info.craneCrew = { '09-07 주간': { '1호기': { name: '이인철', at: new Date(2026, 8, 7, 10, 0).getTime() } } };
  T(M.crewWorkStats(v4).byName['이인철'] && M.crewWorkStats(v4).byName['이인철'].n === 2, '카페리(OBWH)에서 한 등록이 밤까지 안 간다');
}
//  ── ⑤ 동방 배 — QC 합계로만, 조별로는 못 나눈다고 밝힌다 ──
{
  const o = JSON.parse(JSON.stringify(fx.obwh));
  o.info.craneCrew = { '09-04 주간': { '1호기': { name: '이인철', at: new Date(2026, 8, 4, 9, 0).getTime() }, '3호기': { name: '최관식', at: new Date(2026, 8, 4, 9, 0).getTime() } } };
  const st = M.crewWorkStats(o);
  T(st.qcOnly, '동방 배(컨별 호기 없음)를 QC 합계 경로로 안 탄다');
  T(st.byName['이인철'] && st.byName['이인철'].n === 257 && st.byName['최관식'] && st.byName['최관식'].n === 213, 'OBWH 2731E QC101 257·QC103 213 이 아니다');
  const a = M.answerCraneCrew(o, { kind: 'all' });
  T(/조별로는 못 나눠요/.test(a) && /이인철 — 257대/.test(a), `동방 답이 한계를 안 밝히거나 수가 틀리다\n${a}`);
}
//  ── ⑤-B 동방 혼합 — 앱 완료가 섞여도 QC 합계가 정본(2차 시뮬 지적: 3건 섞이자 257·213 이 사라졌다) ──
{
  const o = JSON.parse(JSON.stringify(fx.obwh));
  const t0 = new Date(2026, 8, 4, 12, 0).getTime();
  o.info.craneCrew = { '09-04 주간': { '1호기': { name: '이인철', at: t0 }, '3호기': { name: '최관식', at: t0 } } };
  o.discharge = { completed: { 'TESTU0000011': { at: t0, by: '이인철', equip: '1호기' }, 'TESTU0000022': { at: t0 + 60000, by: '이인철', equip: '1호기' }, 'TESTU0000033': { at: t0 + 120000, by: '이인철', equip: '1호기' } } };
  const st = M.crewWorkStats(o);
  T(st.qcOnly && st.byName['이인철'] && st.byName['이인철'].n === 257 && st.byName['최관식'] && st.byName['최관식'].n === 213, `앱 완료 3건이 섞이자 QC 합계가 사라진다 (이인철 ${st.byName['이인철'] && st.byName['이인철'].n} · 최관식 ${st.byName['최관식'] && st.byName['최관식'].n})`);
  const r1 = st.rows.find((r) => r.no === 1);
  T(r1 && r1.appN === 3, '앱으로 직접 찍은 것(3대)을 따로 밝히지 않는다');
  const a = M.answerCraneCrew(o, { kind: 'all' });
  T(/이인철 — 257대/.test(a) && /앱으로 직접 찍은 것 3대/.test(a), `동방 혼합 답이 틀리다\n${a}`);
  //  등록 없이 앱 완료만 — QC 합계에 앱 기록의 이름을 붙인다
  const o2 = JSON.parse(JSON.stringify(fx.obwh)); o2.discharge = o.discharge;
  const st2 = M.crewWorkStats(o2);
  T(st2.qcOnly && st2.byName['이인철'] && st2.byName['이인철'].n === 257, '등록 없이 앱 기록만 있는 동방 배에서 QC 합계를 그 사람에게 못 붙인다');
}
//  ── ⑥ 확인 글 — 조사(받침) ──
{
  T(/최관식으로 기억할게요/.test(M.crewSetText(P('3호기 최관식').crewSet, 'OBWH')), '«최관식로» — 받침 조사 틀림');
  T(/박진우로 기억할게요/.test(M.crewSetText(P('1호기 박진우').crewSet, 'SWMM')), '«박진우으로» — 받침 조사 틀림');
  T(/1호기 이인철 · 3호기 최관식으로 기억할게요/.test(M.crewSetText(P('1호기 이인철 3호기 최관식').crewSet, 'OBWH')), '둘 이상일 때 마지막 이름 받침으로 조사를 못 고른다');
}
//  ── ⑥ 확인 글 ──
{
  const t = M.crewSetText(P('야간 1호기 박진우 2호기 김성일').crewSet, 'SWMM', new Date(2026, 8, 4, 22, 12).getTime());
  T(/09-04 야간조 — 1호기 박진우 · 2호기 김성일로 기억할게요/.test(t), `확인 글이 틀리다\n${t}`);
  const u = M.crewSetText(P('1호기 이인철 3호기 최관씩').crewSet, 'OBWH');
  T(/최관씩.*명단에 없어 못 적었어요/.test(u), '명단에 없는 이름을 알리지 않는다(조용히 버림)');
}
//  ── ⑦ 배선 — 소스 문자열 ──
{
  const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const fb = rd('src/firebase.js');
  T(/export async function fbSetVoyageCraneCrew\(voyageKey, shiftKey, crew\)/.test(fb), '저장 함수가 없거나 시그니처가 다르다(등록자 인자 금지 — 검수사 «등록자는 등록할 필요가 없습니다»)');
  { const body = (fb.split('export async function fbSetVoyageCraneCrew')[1] || '').split('\nexport ')[0];
    T(/craneCrew\/\$\{shiftKey\}\/\$\{c\.no\}호기/.test(body), '저장 경로가 info.craneCrew/{조}/{N호기} 가 아니다');
    T(!/\bby\b\s*:/.test(body), '등록자(by)를 적는다 — 검수사 지시 위반');
    T(/update\(ref\(db, `voyages\/\$\{voyageKey\}\/info`\)/.test(body), 'info 를 PATCH(update)로 안 쓴다'); }
  T(/fbSetVoyageCraneCrew\(voyageKey, sk\.key, cs\.crew\)/.test(rd('src/components/SearchPanel.jsx')), '작업 시작 탭 배선이 없다');
  T((rd('src/pages/VoyagePage.jsx').match(/fbSetVoyageCraneCrew\(voyageKey, sk\.key, cs\.crew\)/g) || []).length === 2, '양하·LOLO 탭 중 한 곳이 저장을 안 한다');
  T(/fbSetVoyageCraneCrew\(shipCtx\.key, sk\.key, cs\.crew\)/.test(rd('src/pages/GlobalSearchPage.jsx')), '홈(배 이름으로) 배선이 없다');
  T(/crewAnswer: \(cq\) =>/.test(rd('src/components/SearchPanel.jsx')) && /crewAnswer: \(cq\) =>/.test(rd('src/pages/VoyagePage.jsx')) && /crewAnswer: briefCtx\?\.crewAnswer/.test(rd('src/pages/VoyagePage.jsx')), '조회 답 클로저(crewAnswer)가 화면에 안 실린다');
  //  3.21: 확인 글이 `resolveCrewSides` 를 지나도록 바뀌었다 — 배선이 **있는가**를 재되 그 유도까지 같이 본다
  //    (옛 검사는 `crewSetText(p.crewSet, _ship)` 문자열 그대로를 찾아, 유도를 끼우자 «배선이 없다»고 했다).
  {
    const _gs = rd('src/pages/GlobalSearchPage.jsx');
    T(/answerCraneCrew\(_voy, p\.crewQuery\)/.test(_gs), '홈 조회 답 배선이 없다');
    T(/crewSetText\((?:resolveCrewSides\()?p\.crewSet/.test(_gs), '홈 등록 확인 글 배선이 없다');
    T(/crewSetText\(resolveCrewSides\(p\.crewSet, shipCtx\.v\)/.test(_gs), '3.21: 홈 확인 글이 저장부와 같은 유도를 안 탄다');
  }
  T(/parsed\.crewSet \|\| parsed\.crewQuery/.test(rd('src/nlSearch.js')), 'hasAnyCondition 에 없어 미르가 «못 알아들었다»고 적는다');
  T(/주간 1호기 김판석 2호기 송제욱/.test(rd('src/data/helpData.js')) && /김성일 몇 개 했어/.test(rd('src/data/helpData.js')), '매뉴얼(helpData)에 없다 — 만들어 두고 아무도 모르면 안 만든 것');
  T(/allStaffNames/.test(rd('src/staffList.js')) && /import \{ allStaffNames \} from '\.\/staffList\.js'/.test(rd('src/utils.js')), '이름 목록 한 벌(allStaffNames)을 안 쓴다');
}
if (bad) { console.error(`✗ 호기–검수원 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 호기–검수원 연막검사 통과 (알아듣기·조회 인텐트·조 키·SWMM 693 실데이터 209/236/129/119·동방 QC·확인 글·배선 4화면)');
