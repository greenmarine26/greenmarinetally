// 5.29 카톡 방 읽기 연막검사 — 실소스 src/kakaoLive.js 를 불러 실복사본(2026-11-27~28 연태 11/4 · 연태페리 · 일조선사)으로 잰다.
//   검수사 2026-11-28 «지금까지 연태와 일조 예보를 제가 넣었습니다. 그걸 이카톡내용으로 대신 합니다» · «연태 11/4는 실시간 작업내용이 보일것입니다».
//   ⚠ 글자를 세지 않는다 — 계획(kakaoPlan)이 내는 쓰기 경로·값을 본다.
const path = require('path');
const ROOT = process.argv[2] || path.resolve(__dirname, '..');
let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('✗ ' + m); } };
const T = (s) => new Date(s.replace(' ', 'T') + ':00+09:00').getTime();
const hm = (t) => new Date(t).toTimeString().slice(0, 5);

//  실복사본(PC 카톡 Ctrl+A·Ctrl+C) — 메시지 사이 \r\n, 메시지 안 줄 \n
const CREW = ['26년 11월 28일', '[그린마린 이형출] [00:07] 17번 하는중입니다', '[그린마린 박진우] [00:16] 사진 2장', '[그린마린 박진우] [00:16] 우측 데미지',
  '[그린마린 박진우] [00:59] 1호기 양하종료', '[그린마린 박진우] [01:09] 1호기 선적시작 01:03', '[그린마린 박진우] [01:18] 사진',
  '[그린마린 장문영] [01:30] 2호기양하종료입니다', '[그린마린 장문영] [01:31] 2호기선적시작입니다', '[그린마린 이형출] [01:47] 사진', ''].join('\r\n');
const FERRY = ['26년 11월 27일', '[동민] [18:45] FULL 20GPX10 + 40HQX13 + 40RHX1\n40RHX1(PALLET선적 / 온도X)\n\nEMPTY 20GPX51 + 20RFX2 + 40HQX56 + 45HQX24 + 40RHX10\n\n금일 진행 물량입니다.\nEMPTY 20GPX1은 수화물 컨테이너입니다.\n긴급 선적분 수량 20GPX4, 40HQX7 입니다.',
  '[김상규] [21:21] SPSU2042322\nBHGJ048258\nEMPTY \n금일 수하물 컨테이너 정보 전달드립니다.', '[그린마린 전우수] [22:29] 사진 3장', '[그린마린 전우수] [22:29] 양하 씰오류입니다', ''].join('\r\n');
const RZ = ['26년 11월 25일', '[김지태] [17:38] 안녕하세요\n로딩리스트 최종 보내드렸습니다.', '26년 11월 27일', '[정새한] [17:20] S-31 C-107+3(EMPTY C.S) G-6 257TEU+6TEU\n\nR131W\n\n*FULL\n20D X 8(S X 8)\n20R X 1 (PLUG IN)(S X 1)\n40H X 72\n40R X 1 (PLUG OUT)\n45H X 1(AIR PLANE)\n\n*EMPTY\n20D X 37(S X 21 C - 8)\n20R X1(S X 1)\n40H X 50\n40R X 29\n45H X 5\n\nFULL-157TEU EMPTY-206TEU LUG-0TEU 363TEU', ''].join('\r\n');
//  실자료(GET 2026-11-28 02:4x) 줄임 — OBWH 2803E(작업 중) · RZOR R131E · 지난 OBWH 항차 하나(고르면 안 됨)
const VOYS = () => [
  { key: 'OBWH_2803E', has: { loading: true, discharge: true }, info: { vsl: 'OBWH', voy: '2803E', voy_d: '2803E', voy_l: '2804W', planDate: '2026-11-27 19:00 ~ 2026-11-28 07:00',
    forecast: { by: '김성일', at: T('2026-11-27 19:49'), empty: { '20GP': 51 }, vans: { full: 0, empty: 143, luggage: 0 }, urgentCns: ['CHIU9026609'], luggageCns: ['SPSU2042322'], luggageSeals: { SPSU2042322: 'BHGJ3019411' } } },
    reports: {}, reports_deleted: {}, activeWork: {} },
  { key: 'OBWH_2801E', has: { loading: true, discharge: true }, info: { vsl: 'OBWH', voy: '2801E', voy_l: '2802W', planDate: '2026-11-25 15:00 ~ 2026-11-26 07:00' }, reports: {}, activeWork: {} },
  { key: 'RZOR_R131E', has: { loading: true, discharge: true }, info: { vsl: 'RZOR', voy: 'R131E', voy_l: 'R131W', planDate: '2026-11-27 21:30 ~ 2026-11-28 11:30', forecast: { image: 'x', luggageCns: ['UETU3271836'] } }, reports: {}, activeWork: {} },
];
const NOW = T('2026-11-28 02:40');

(async () => {
  const k = await import(path.join(ROOT, 'src', 'kakaoLive.js'));
  const w = await import(path.join(ROOT, 'src', 'kakaoWorkLog.js'));
  // ① 방 → 배
  ok(k.kakaoRoomOf('연태 11/4').kind === 'crew' && k.kakaoRoomOf('연태 12/1').ship === 'OBWH', '① 연태 검수사방(날짜가 바뀌어도)');
  ok(k.kakaoRoomOf('연태페리').kind === 'line' && k.kakaoRoomOf('연태페리').ship === 'OBWH', '① 연태페리 = OBWH 선사방');
  ok(k.kakaoRoomOf('일조').ship === 'RZOR' && k.kakaoRoomOf('일조선사').ship === 'RZOR', '① 일조·일조선사 = RZOR');
  ok(k.kakaoRoomOf('카카오톡') === null && k.kakaoRoomOf('G마켓') === null, '① 모르는 방은 읽지 않음');
  // ② 말한 시각
  ok(hm(w.saidTimeOf('1호기 선적시작 01:03', T('2026-11-28 01:09'))) === '01:03', '② «선적시작 01:03» → 01:03');
  const prev = w.saidTimeOf('선적시작 23:58', T('2026-11-28 00:05'));
  ok(prev === T('2026-11-27 23:58'), '② 자정 넘겨 보낸 «23:58» 은 전날');
  ok(w.saidTimeOf('사진 3장', T('2026-11-28 00:05')) === null && w.saidTimeOf('1호기 선적시작 09:00', T('2026-11-28 01:09')) === null, '② 시각 아닌 숫자·3시간 넘게 벌어진 시각은 무시');
  // ③ 메시지 아이디 — 복사 범위가 달라도 같은 글은 같은 아이디
  const a = k.kakaoMessagesWithIds(CREW), b = k.kakaoMessagesWithIds(['26년 11월 28일', ...CREW.split('\r\n').slice(4)].join('\r\n'));
  ok(a.length === 9 && b.every((m) => a.some((x) => x.id === m.id)), '③ 앞이 잘린 복사본도 같은 아이디');
  // ④ 한 회차 — 검수사방 작업 보고
  const r = k.kakaoPlan({ nowMs: NOW, rooms: [{ title: '연태 11/4', text: CREW }, { title: '연태페리', text: FERRY }, { title: '일조선사', text: RZ }], seen: {}, voyages: VOYS() });
  const reps = Object.entries(r.patch).filter(([p]) => /^voyages\/OBWH_2803E\/reports\//.test(p)).map(([, v]) => v).sort((x, y) => x.ts - y.ts);
  ok(reps.length === 4, `④ 작업 보고 4건(실제 ${reps.length})`);
  ok(reps.map((x) => `${hm(x.ts)} ${x.equip} ${x.action}`).join('|') === '00:59 1호기 discharge_done|01:03 1호기 loading_start|01:30 2호기 discharge_done|01:31 2호기 loading_start', '④ 시각·호기·동작 — ' + reps.map((x) => `${hm(x.ts)} ${x.equip} ${x.action}`).join('|'));
  ok(reps[1].by === '박진우' && reps[3].by === '장문영' && reps.every((x) => x.via === 'kakao' && x.relayBy === '카톡'), '④ 이름은 보낸 사람 · 카톡 전달 표시');
  ok(r.patch['activeWork/OBWH_2803E/1호기/loading'] && r.patch['activeWork/OBWH_2803E/1호기/loading'].status === 'running', '④ 1호기 선적 진행 중 표시');
  ok(!Object.keys(r.patch).some((p) => p.includes('OBWH_2801E')), '④ 지난 항차에는 쓰지 않음');
  // ⑤ 배 화면 줄 — 사진·지운 글 빼고
  const lines = Object.entries(r.patch).filter(([p]) => /\/kakao\//.test(p));
  ok(lines.length > 0 && !lines.some(([, v]) => /^사진/.test(v.body)), '⑤ 카톡 줄에 사진 줄 없음');
  ok(lines.some(([p, v]) => p.startsWith('voyages/RZOR_R131E/kakao/') && v.room === '일조선사'), '⑤ 일조선사 글은 RZOR 배 화면');
  ok(!lines.some(([, v]) => /로딩리스트 최종 보내드렸습니다\.$/.test(v.body)), '⑤ 처음 읽을 때 36시간 넘은 글(11-25)은 올리지 않음');
  // ⑥ 예보 — OBWH 손 붙여넣기 143대 → 카톡 167대 · CLL 이 넣은 수화물 실은 그대로
  ok(r.patch['voyages/OBWH_2803E/info/forecast/vans'] && r.patch['voyages/OBWH_2803E/info/forecast/vans'].full === 24 && r.patch['voyages/OBWH_2803E/info/forecast/vans'].empty === 143, '⑥ OBWH 예보 FULL 24 · EMPTY 143');
  ok(!('voyages/OBWH_2803E/info/forecast/luggageSeals' in r.patch) && !('voyages/OBWH_2803E/info/forecast/urgentCns' in r.patch), '⑥ CLL 메일의 긴급·수화물 칸은 덮지 않음');
  ok(r.patch['voyages/OBWH_2803E/info/forecast/by'] === '수집기(카톡)', '⑥ 넣은 사람 «수집기(카톡)»');
  ok(r.patch['voyages/RZOR_R131E/info/forecast/teu'] && r.patch['voyages/RZOR_R131E/info/forecast/teu'].total === 363 && !('voyages/RZOR_R131E/info/forecast/image' in r.patch), '⑥ RZOR 363TEU · 그림 그대로');
  // ⑦ 두 번째 회차 — 본 글은 다시 안 씀
  const r2 = k.kakaoPlan({ nowMs: NOW + 300000, rooms: [{ title: '연태 11/4', text: CREW }, { title: '연태페리', text: FERRY }], seen: r.seen, voyages: VOYS() });
  ok(Object.keys(r2.patch).length === 0, `⑦ 같은 글을 두 번 쓰지 않음(실제 ${Object.keys(r2.patch).length})`);
  // ⑧ 앱에 이미 있으면 건드리지 않음 — 검수원이 앱으로 01:04 1호기 선적 시작을 눌러 둔 경우
  const V = VOYS();
  V[0].reports = { [T('2026-11-28 01:04')]: { type: 'work_status', action: 'loading_start', mode: 'loading', equip: '1호기', ts: T('2026-11-28 01:04'), by: '박진우' } };
  V[0].activeWork = { '1호기': { loading: { status: 'running', mode: 'loading', startedAt: T('2026-11-28 01:04') } } };
  const r3 = k.kakaoPlan({ nowMs: NOW, rooms: [{ title: '연태 11/4', text: CREW }], seen: {}, voyages: V });
  const reps3 = Object.entries(r3.patch).filter(([p]) => /reports\//.test(p)).map(([, v]) => `${v.equip} ${v.action}`);
  ok(!reps3.includes('1호기 loading_start') && reps3.length === 3, `⑧ 앱에 있는 1호기 선적 시작은 안 씀(${reps3.join('|')})`);
  ok(!('activeWork/OBWH_2803E/1호기/loading' in r3.patch), '⑧ 진행 중 표시도 안 건드림');
  // ⑨ 더 늦은 카톡 예보가 이미 있으면 앞 글로 덮지 않음
  const V2 = VOYS(); V2[2].info.forecast.kakaoAt = T('2026-11-27 23:00');
  const r4 = k.kakaoPlan({ nowMs: NOW, rooms: [{ title: '일조선사', text: RZ }], seen: {}, voyages: V2 });
  ok(!Object.keys(r4.patch).some((p) => p.includes('/info/forecast/')), '⑨ 늦은 예보를 앞 글로 덮지 않음');
  // ⑩ 배 화면 줄 순서
  const vv = { kakao: { a: { at: 1, body: 'x' }, b: { at: 3, body: 'y' }, c: { at: 2, body: '' } } };
  ok(k.kakaoLinesOf(vv).map((x) => x.id).join('') === 'ba', '⑩ 최신순 · 빈 글 뺌');
  // ⑪ 감사(2026-11-28) 사례 — 자동 기록은 일어난 일만, 한 번만, 맞는 항차에만
  const one = (lines, V0, now = NOW) => k.kakaoPlan({ nowMs: now, rooms: [{ title: '연태 11/4', text: ['26년 11월 28일', ...lines, ''].join('\r\n') }], seen: {}, voyages: V0 || VOYS() });
  const repsOf = (rr) => Object.entries(rr.patch).filter(([p]) => /reports\//.test(p)).map(([, v]) => `${hm(v.ts)} ${v.equip} ${v.action}${v.by ? ' ' + v.by : ''}`).sort();
  ok(repsOf(one(['[그린마린 박진우] [00:40] 1호기 양하종료 했나요?', '[그린마린 장문영] [00:41] 2호기 양하 끝나면 선적시작 합니다', '[그린마린 박진우] [01:09] 2호기 선적시작 02:00 예정'])).length === 0, '⑪ 물음·조건·예정 글은 적지 않음');
  ok(repsOf(one(['[그린마린 박진우] [01:10] 1호기 선적시작 01:40'])).length === 0, '⑪ 보낸 시각보다 뒤 시각은 적지 않음');
  ok(repsOf(one(['[그린마린 박진우] [00:40] 1호기 양하종료', '[그린마린 박진우] [00:45] 1호기 양하종료 00:44'])).length === 1, '⑪ 같은 회차 같은 보고 두 번 안 씀');
  ok(repsOf(one(['[그린마린 박진우] [01:09] 1호기 양하종료 00:59 선적시작 01:03'])).join('|') === '00:59 1호기 discharge_done 박진우|01:03 1호기 loading_start 박진우', '⑪ 한 글 두 시각은 각자 — ' + repsOf(one(['[그린마린 박진우] [01:09] 1호기 양하종료 00:59 선적시작 01:03'])).join('|'));
  ok(repsOf(one(['[그린마린 박진우] [01:30] 1호기 양하종료', '[그린마린 장문영] [01:30] 2호기 양하종료'])).join('|') === '01:30 1호기 discharge_done 박진우|01:30 2호기 discharge_done 장문영', '⑪ 같은 분 두 사람 이름이 섞이지 않음');
  const V5 = VOYS(); V5[0].reports = { [T('2026-11-28 05:30')]: { type: 'work_status', action: 'loading_done', mode: 'loading', equip: '1호기', ts: T('2026-11-28 05:30'), manual: true } };
  const r5 = one(['[그린마린 박진우] [01:09] 1호기 선적시작'], V5, T('2026-11-28 06:00'));
  ok(repsOf(r5).length === 1 && !Object.keys(r5.patch).some((p) => p.startsWith('activeWork/')), '⑪ 완료가 이미 있으면 시작은 보고만 — 진행 중을 되살리지 않음');
  const V6 = VOYS(); V6[0].reports = { [T('2026-11-28 01:05')]: { type: 'work_status', action: 'loading_start', mode: 'loading', equip: '1호기', ts: T('2026-11-28 01:05') } };
  ok(repsOf(one(['[그린마린 박진우] [01:09] 1호기 선적시작 01:04'], V6)).length === 0, '⑪ 앱에 같은 시작이 있으면(진행 중 표시 없이도) 안 씀');
  const und = k.kakaoPlan({ nowMs: NOW, rooms: [{ title: '연태 11/4', text: '[그린마린 박진우] [00:59] 1호기 양하종료\r\n' }], seen: {}, voyages: VOYS() });
  ok(Object.keys(und.patch).length === 0, '⑪ 날짜 전환선 앞 글은 자동으로 쓰지 않음');
  // 예보 — 지난 항차에 덮지 않고, 항차가 없으면 기다림(본 글로 기억하지 않음)
  const FR2 = ['26년 11월 28일', '[동민] [18:00] FULL 20GPX10 + 40HQX13\nEMPTY 20GPX51', ''].join('\r\n');
  const r6 = k.kakaoPlan({ nowMs: T('2026-11-28 18:05'), rooms: [{ title: '연태페리', text: FR2 }], seen: {}, voyages: VOYS() });
  ok(!Object.keys(r6.patch).some((p) => p.includes('/info/forecast/')) && r6.seen['연태페리'].length === 0 && r6.rooms[0].waiting === 1, '⑪ 맞는 항차가 없으면 지난 항차에 안 덮고 기다림');
  ok(!Object.values(r.patch).some((v) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0), '⑪ 빈 묶음 {} 를 쓰지 않음(되읽기 어긋남)');
  const RZ2 = ['26년 11월 27일', '[김지태] [18:00] *FULL\n40H X 80', ''].join('\r\n');
  const r7 = k.kakaoPlan({ nowMs: NOW, rooms: [{ title: '일조', text: RZ2 }, { title: '일조선사', text: RZ }], seen: {}, voyages: VOYS() });
  ok(r7.patch['voyages/RZOR_R131E/info/forecast/kakaoAt'] === T('2026-11-27 18:00'), '⑪ 두 방 예보는 늦은 글이 이김');
  ok(repsOf(one(['[그린마린 박진우] [01:09] 01:03 1호기 선적시작'])).join('|') === '01:03 1호기 loading_start 박진우', '⑫ 동작 앞에 쓴 시각도 읽음');
  ok(repsOf(one(['[그린마린 박진우] [00:40] 선적시작', '[그린마린 박진우] [00:40] 1호기'], null, T('2026-11-28 02:40'))).join('|') === '00:40 1호기 loading_start 박진우', '⑫ 호기만 다음 글로 와도 물려줌');
  ok(repsOf(one(['[그린마린 박진우] [01:09] 1호기 양하종료 (17번베이까지)'])).length === 1, '⑫ «까지» 가 붙은 실제 보고는 적음');
  const VN = VOYS(); VN.push({ key: 'OBWH_2805E', has: { loading: true }, info: { vsl: 'OBWH', voy: '2805E', voy_l: '2806W', planDate: '2026-11-29 19:00 ~ 2026-11-30 07:00' }, reports: {}, activeWork: {} });
  const r8 = k.kakaoPlan({ nowMs: T('2026-11-28 18:05'), rooms: [{ title: '연태페리', text: FR2 }], seen: {}, voyages: VN });
  ok(r8.patch['voyages/OBWH_2805E/info/forecast/by'] === '수집기(카톡)' && !Object.keys(r8.patch).some((p) => p.includes('OBWH_2803E/info/forecast')), '⑫ 하루 전 예보는 다음 항차로(지난 항차 아님)');
  const { kakaoMessagesOf } = w; const tw = w.parseKakaoWorkLog('26년 11월 23일\n[a] [12:40] 12:30 박진우 1호기 양하시작');
  ok(tw.items.length === 1 && hm(tw.items[0].ts) === '12:30', '⑫ 손 가져오기도 교대 형식 시각 «12:30 …» 을 읽음');
  if (fail) { console.log(`✗ 카톡 방 읽기 연막검사 ${fail}건 실패 (${pass} 통과)`); process.exit(1); }
  console.log(`✓ 카톡 방 읽기 연막검사 ${pass}항 통과 — 방 → 배, 말한 시각, 빠진 작업 보고만, 예보(손 붙여넣기 143 → 167), 두 번 안 씀`);
})().catch((e) => { console.log('✗ 연막검사 오류', e); process.exit(1); });
