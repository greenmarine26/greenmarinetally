// 4.12-02 연막검사 — 미르가 날짜 말(엊그제·그제·어제·오늘·내일·모레·낼모레·글피)을 알아듣는가. 검수사 2026-10-08 07:20 «미르가 어제 라는 단어를 모릅니다. 어제 야간 근무조를 알려줬는데 오늘 야간 근무자로 등록을 합니다».
//   실사고 문장 «어제 야간 선수 한성호 선미 김판석»(PCSZ_2631E · 07:15:48 · 저장은 10-08 야간으로 잘못 들어갔다)을 그대로 쓴다.
//   ① 날짜 말 → 며칠 차이(한 벌) ② 근무자 등록의 날짜(음수 포함)와 조 키 ③ 확인 글에 어느 날로 알아들었는지가 보인다 ④ 갱 수 기억 ⑤ 근무자 조회가 그 날만 답한다 ⑥ «내일 며칠이야» 가 그 날로 답한다 ⑦ 옛 동작 회귀
//   실행 — node tools/smoke_datewords.cjs <smoke_crew_entry 번들>. 쓰기·네트워크 없음.
process.env.TZ = 'Asia/Seoul';
const path = require('path');
const M = require(path.resolve(process.argv[2]));
let bad = 0, n = 0;
const ok = (c, m, extra) => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m + (c || extra === undefined ? '' : '  → ' + extra)); if (!c) bad++; };
M.setServerRoles({ '한성호': { name: '한성호', role: '검수' }, '김판석': { name: '김판석', role: '검수' }, '박진우': { name: '박진우', role: '검수' }, '김성일': { name: '김성일', role: '검수' } });
const P = (q) => M.parseNaturalQuery(q);
const NOW = new Date(2026, 9, 8, 7, 15, 48).getTime();   // 사고 시각 2026-10-08 07:15:48 (주·야 교대 사이)

console.log('[1] 날짜 말 → 오늘 기준 며칠 차이(dateWordOf 한 벌)');
const OFF = { '그끄저께': -3, '엊그제': -2, '엊그저께': -2, '그제': -2, '그저께': -2, '어제': -1, '어저께': -1, '어젯밤': -1, '오늘': 0, '금일': 0, '내일': 1, '낼': 1, '명일': 1, '다음 날': 1, '모레': 2, '내일모레': 2, '낼모레': 2, '내일 모레': 2, '글피': 3, '그글피': 4 };
for (const [w, off] of Object.entries(OFF)) ok(M.dateWordOffset(`${w} 야간 근무`) === off, `«${w}» = ${off > 0 ? '+' : ''}${off}`, M.dateWordOffset(`${w} 야간 근무`));
ok(M.dateWordOffset('1호기 김판석') === null && M.dateWordOffset('') === null, '날짜 말이 없으면 null(오늘로 단정하지 않는다)');
ok(M.dateWordOffset('만낼 것 같아') === null && M.dateWordOffset('낼름 먹었어') === null, '«낼» 이 다른 낱말 안에 있으면 날짜 말이 아니다');
ok(M.dateWordOffset('낼은 주간') === 1 && M.dateWordOffset('낼 주간') === 1, '«낼은»·«낼 » 은 내일이다');
ok(M.dateWordOf('어제 야간 오늘 주간').word === '어제', '한 문장에 둘이면 앞에 나온 말을 따른다');
ok(M.dateWordOf('내일모레 주간').off === 2 && M.dateWordOf('내일모레 주간').word === '내일모레', '«내일모레» 는 내일(+1)이 아니라 모레(+2)다(말한 그대로 돌려준다)');

console.log('[2] 근무자 등록 — 사고 문장과 날짜 말별 날짜');
let p = P('어제 야간 선수 한성호 선미 김판석');
ok(p.crewSet && p.crewSet.shift === '야간' && p.crewSet.dayOff === -1 && p.crewSet.dayWord === '어제', '사고 문장: 야간 · dayOff -1 · 말한 날짜 말 «어제»', p.crewSet && JSON.stringify({ s: p.crewSet.shift, d: p.crewSet.dayOff, w: p.crewSet.dayWord }));
ok(p.crewSet && p.crewSet.needPos.length === 2, '선수·선미 두 사람은 그대로 읽는다(«어제» 를 사람 이름으로 안 읽는다)', p.crewSet && JSON.stringify(p.crewSet.needPos));
ok(M.crewShiftKey('야간', NOW, -1).key === '10-07 야간', '07:15 «어제 야간» 의 조 키 = 10-07 야간 (사고 때는 10-08 야간으로 저장됐다)', M.crewShiftKey('야간', NOW, -1).key);
const cases = [['어제 야간 1호기 김성일 2호기 박진우', -1, '야간', '10-07 야간'], ['그제 야간 1호기 김성일 2호기 박진우', -2, '야간', '10-06 야간'], ['엊그제 야간 1호기 김성일', -2, '야간', '10-06 야간'], ['그저께 주간 1호기 김성일', -2, '주간', '10-06 주간'],
  ['오늘 야간 1호기 김성일', 0, '야간', '10-08 야간'], ['낼 주간 1호기 김성일', 1, '주간', '10-09 주간'], ['내일 주간 1호기 김성일', 1, '주간', '10-09 주간'], ['모레 야간 1호기 김성일', 2, '야간', '10-10 야간'], ['낼모레 야간 1호기 김성일', 2, '야간', '10-10 야간'], ['글피 주간 1호기 김성일', 3, '주간', '10-11 주간']];
for (const [q, off, sh, key] of cases) {
  const c = P(q).crewSet;
  ok(c && c.dayOff === off && c.shift === sh && M.crewShiftKey(c.shift, NOW, c.dayOff).key === key, `«${q}» → ${off > 0 ? '+' : ''}${off} · ${key}`, c && `${c.dayOff} ${c.shift} ${M.crewShiftKey(c.shift, NOW, c.dayOff).key}`);
}
p = P('주간 1호기 김판석 2호기 박진우');
ok(p.crewSet && p.crewSet.dayOff === 0 && p.crewSet.dayWord === '', '날짜 말이 없으면 예전처럼 지금 조(dayOff 0 · dayWord 빈칸)');

console.log('[3] 확인 글 — 어느 날로 알아들었는지 보인다');
p = P('어제 야간 1호기 김성일 2호기 박진우');
let txt = M.crewSetText(p.crewSet, 'PCSZ', NOW);
ok(/«어제 야간» → 10-07 야간조/.test(txt), '«어제 야간» → 10-07 야간조 가 확인 글에 나온다', txt.split('\n')[0]);
txt = M.crewSetText(P('주간 1호기 김판석').crewSet, 'PCSZ', NOW);
ok(!/«/.test(txt.split('\n')[0]), '날짜 말이 없는 등록의 확인 글은 예전 모양 그대로', txt.split('\n')[0]);

console.log('[4] 갱 수 기억 — 어제 야간이 오늘 밤으로 새지 않는다');
p = P('어제 야간 2갱으로 기억해');
ok(p.gangSet && p.gangSet.n === 2 && p.gangSet.dayOff === -1 && p.gangSet.shift === '야간', '«어제 야간 2갱으로 기억해» → dayOff -1 · 야간', p.gangSet && JSON.stringify(p.gangSet));
ok(M.gangKeyFromWords(-1, '야간', NOW) === '10-07 야간', '그 키 = 10-07 야간', M.gangKeyFromWords(-1, '야간', NOW));
p = P('내일 주간 2갱으로 기억해'); ok(p.gangSet && p.gangSet.dayOff === 1 && p.gangSet.shift === '주간', '«내일 주간 2갱» 은 예전 그대로(+1 · 주간)');
p = P('3갱으로 기억해'); ok(p.gangSet && p.gangSet.dayOff === null && p.gangSet.shift === null, '날짜 말이 없으면 예전처럼 null(항차 기본값)');
p = P('오늘 야간 3갱으로 기억해'); ok(p.gangSet && p.gangSet.dayOff === 0, '«오늘 야간 3갱» = 0');

console.log('[5] 근무자 조회 — 그 날 기록만 답한다');
const at = (y, mo, d, h) => new Date(y, mo, d, h).getTime();
const voyage = { info: { vsl: 'PCSZ', vslFull: 'PCSZ 2631E', craneCrew: {
  '10-06 야간': { '1호기': { name: '박진우', at: at(2026, 9, 6, 20) } },
  '10-07 야간': { '1호기': { name: '김판석', at: at(2026, 9, 8, 7) }, '2호기': { name: '한성호', at: at(2026, 9, 8, 7) } },
  '10-08 야간': { '1호기': { name: '김성일', at: at(2026, 9, 8, 7) } } } }, loading: {}, discharge: {} };
p = P('어제 야간 근무자 누구야');
ok(p.crewQuery && p.crewQuery.kind === 'all' && p.crewQuery.dayOff === -1 && p.crewQuery.shift === '야간', '«어제 야간 근무자 누구야» → 조회(전체) · -1 · 야간 (사고 전에는 아무 답도 없었다)', JSON.stringify(p.crewQuery));
let a = M.answerCraneCrew(voyage, p.crewQuery, NOW);
ok(/10-07 야간/.test(a) && /김판석/.test(a) && /한성호/.test(a) && !/10-08 야간/.test(a) && !/10-06 야간/.test(a), '어제 야간(10-07)의 김판석·한성호만 답한다', a);
p = P('그제 야간 근무자 누구야'); a = M.answerCraneCrew(voyage, p.crewQuery, NOW);
ok(/10-06 야간/.test(a) && /박진우/.test(a) && !/김판석/.test(a), '그제 야간(10-06)은 박진우만', a);
p = P('엊그제 주간 근무자 누구야'); a = M.answerCraneCrew(voyage, p.crewQuery, NOW);
ok(/등록이 없어요/.test(a), '없는 날은 «등록이 없어요» 라고 말한다(오늘 것을 대신 내놓지 않는다)', a);
p = P('어제 야간 1호기 누구야'); a = M.answerCraneCrew(voyage, p.crewQuery, NOW);
ok(p.crewQuery && p.crewQuery.kind === 'who' && /김판석/.test(a) && !/김성일/.test(a), '«어제 야간 1호기 누구야» → 김판석', a);
p = P('1호기 누구야'); a = M.answerCraneCrew(voyage, p.crewQuery, NOW);
ok(p.crewQuery && p.crewQuery.dayOff === undefined && /박진우/.test(a) && /김판석/.test(a) && /김성일/.test(a), '날짜 말이 없으면 예전처럼 모든 조를 나열한다', a);

console.log('[6] 날짜 말을 묻는 말 — «내일 며칠이야»');
const D = new Date(2026, 9, 8, 7, 20);
ok(M.generateTimeAnswer(D, '내일 며칠이야') === '내일은 10월 9일 금요일입니다.', '«내일 며칠이야» → 내일은 10월 9일 금요일', M.generateTimeAnswer(D, '내일 며칠이야'));
ok(/^어제는 10월 7일 수요일입니다\.$/.test(M.generateTimeAnswer(D, '어제 무슨 요일이야')), '«어제 무슨 요일이야» → 어제는 10월 7일 수요일', M.generateTimeAnswer(D, '어제 무슨 요일이야'));
ok(/^낼모레는 10월 10일 토요일입니다\.$/.test(M.generateTimeAnswer(D, '낼모레 며칠이야')), '«낼모레 며칠이야» → 낼모레는 10월 10일 토요일', M.generateTimeAnswer(D, '낼모레 며칠이야'));
ok(/^지금은 10월 8일 목요일/.test(M.generateTimeAnswer(D, '오늘 며칠이야')) && /^지금은 10월 8일 목요일/.test(M.generateTimeAnswer(D)), '오늘·날짜 말 없음은 예전 그대로(지금 시각)');

console.log('[7] 오탐 — 날짜 말이 아닌 말(2차 감사 실측)');
for (const [q, why] of [['시작일이 며칠이야', '«시작일» 속의 «작일»'], ['작업시작일시가 언제야', '«작업시작일시» 속의 «작일»'], ['돈 낼 거야', '«낼 거» 는 동사'], ['수수료 낼 사람', '«낼 사람» 은 동사'], ['그제야 알았다', '«그제야»'], ['그제서야 왔어', '«그제서야»'], ['안내일정 알려줘', '«안내일정» 속의 «내일»'], ['다음 날씨 어때', '«다음 날씨»'], ['김명일 몇 개 했어', '이름 «김명일»']])
  ok(M.dateWordOf(q) === null, `${q} → 날짜 말 아님 (${why})`, JSON.stringify(M.dateWordOf(q)));
ok(M.dateWordOffset('그제야간 1호기 김성일') === -2 && M.dateWordOf('그제야간 1호기 김성일').word === '그제', '«그제야간»(공백 없이 쓴 그제 야간)은 그제다');
ok(M.dateWordOffset('내일모래 주간') === 2 && M.dateWordOffset('모래 야간') === 2 && M.dateWordOffset('모래 운반선') === null, '«모래»(모레의 오기)는 조가 붙을 때만 받는다');
ok(M.dateWordOf('오늘 말고 내일 주간 2갱').off === 1 && M.dateWordOf('내일 말고 오늘 야간').off === 0, '«오늘 말고 내일» → 내일 · «내일 말고 오늘» → 오늘');
ok(M.dateWordOf('어젯밤 야간').word === '어젯밤' && M.generateTimeAnswer(new Date(2026, 9, 8, 7, 20), '어젯밤은 몇 일이야').startsWith('어젯밤은 10월 7일'), '«어젯밤» 은 말한 그대로 돌려주고 조사가 맞는다');
ok(!/[가-힣]은 *$/.test(M.generateTimeAnswer(new Date(2026, 9, 8, 7, 20), '시작일이 며칠이야')) && /^지금은 /.test(M.generateTimeAnswer(new Date(2026, 9, 8, 7, 20), '시작일이 며칠이야')), '«시작일이 며칠이야» 는 종전처럼 지금 시각(작일로 안 읽는다)');

console.log('[8] 종전 그대로 — 날짜 말이 없거나 «오늘» 뿐이면 조회가 항차 전체로 답한다');
const at2 = (mo, d, h, mi) => new Date(2026, mo, d, h, mi || 0).getTime();
const v2 = { info: { vsl: 'PCSZ', vslFull: 'PCSZ 2631E', craneCrew: { '10-07 야간': { '1호기': { name: '김판석', at: at2(9, 8, 7) }, '2호기': { name: '한성호', at: at2(9, 8, 7) } } } },
  loading: { completed: { ABCD1234567: { by: '김성일', equip: '1호기', at: at2(9, 8, 2, 10) }, ABCD1234568: { by: '김성일', equip: '1호기', at: at2(9, 8, 2, 12) } } }, discharge: {} };
p = P('야간 1호기 누구야'); a = M.answerCraneCrew(v2, p.crewQuery, NOW);
ok(p.crewQuery && p.crewQuery.shift === '야간' && /김판석/.test(a) && !/등록이 없어요/.test(a), '«야간 1호기 누구야»(날짜 말 없음) → 종전처럼 등록된 조를 나열한다(10-07 야간 김판석)', a);
p = P('김성일 오늘 몇 개 했어'); a = M.answerCraneCrew(v2, p.crewQuery, NOW);
ok(p.crewQuery && p.crewQuery.kind === 'name' && /김성일/.test(a) && /2대/.test(a) && !/잡힌 작업이 없어요/.test(a), '«김성일 오늘 몇 개 했어» → 앱으로 찍은 2대를 센다(조 표시 없는 기록을 지우지 않는다)', a);
p = P('1호기 오늘 몇 개 했어'); a = M.answerCraneCrew(v2, p.crewQuery, NOW);
ok(p.crewQuery && p.crewQuery.kind === 'crane' && /1호기/.test(a) && /2대/.test(a) && !/잡힌 작업이 없어요/.test(a), '«1호기 오늘 몇 개 했어» → 2대', a);
p = P('어제 김성일 몇 개 했어'); a = M.answerCraneCrew(v2, p.crewQuery, NOW);
ok(p.crewQuery && p.crewQuery.dayOff === -1 && /10-07 야간/.test(a) && /2대/.test(a), '«어제 김성일 몇 개 했어» → 02시에 찍은 2대는 10-07 야간 몫으로 센다(어제 밤 조)', a);
const v3 = { info: { vsl: 'PCSZ', vslFull: 'PCSZ 2631E' }, loading: v2.loading, discharge: {} };   // 근무자 등록이 없는 항차 — 앱 완료는 조 표시가 없다
p = P('김성일 오늘 몇 개 했어'); a = M.answerCraneCrew(v3, p.crewQuery, NOW);
ok(/김성일/.test(a) && /2대/.test(a) && !/잡힌 작업이 없어요/.test(a), '등록 없는 항차 «김성일 오늘 몇 개 했어» → 2대(조 표시 없는 앱 기록도 센다)', a);
p = P('어제 김성일 몇 개 했어'); a = M.answerCraneCrew(v3, p.crewQuery, NOW);
ok(p.crewQuery && p.crewQuery.dayOff === -1 && /조 표시가 없는 앱 완료 기록 2대는 이 조에 넣지 못했어요/.test(a), '등록 없는 항차 «어제 김성일 몇 개 했어» → 날짜로 못 가른 앱 기록 2대를 조용히 빼지 않고 밝힌다', a);
ok(p.crewQuery && p.crewQuery.dayOff === -1 && /조 표시가 없는 앱 완료 기록 2대는 이 조에 넣지 못했어요/.test(a), '«어제 김성일 몇 개 했어» → 날짜로 못 가른 앱 기록 2대를 조용히 빼지 않고 밝힌다', a);
p = P('누가 일했어'); ok(p.crewQuery && p.crewQuery.kind === 'all', '«누가 일했어» → 근무자 조회(죽어 있던 가지)', JSON.stringify(p.crewQuery));
p = P('교대 근무자 알려줘'); ok(!p.crewQuery, '«교대 근무자 알려줘» 는 종전대로 인수인계 갈래(근무자 표로 가로채지 않는다)', JSON.stringify(p.crewQuery));

console.log('[9] 공유 파일에 낀 한 줄 — mir.js 의 하루 기록 키(_dayKey)는 6자리 날짜 그대로');
{
  const src = require('fs').readFileSync(path.join(__dirname, '..', 'src', 'mir.js'), 'utf8');
  const line = (src.match(/const _dayKey = [^\n]*/) || [''])[0];
  ok(line && !/[가-힣]/.test(line), '_dayKey 줄에 한글이 섞이지 않았다(미르 모델 하루 상한·기록 경로의 키)', line.slice(0, 160));
}

console.log(bad ? `\n✗ 날짜 말 연막검사 ${bad}건 실패(${n}항목)` : `\n✓ 날짜 말 연막검사 전부 통과(${n}항목)`);
process.exit(bad ? 1 : 0);
