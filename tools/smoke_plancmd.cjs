// 플랜 명령 판정(planCommand.js) + 항차번호/끝자리(nlSearch) + 미르 잡담 연막검사 — 3.2-01 받은함 08-29 무응답 7건 재생
//   실측 문장 그대로: «MCSC 카고플랜»(×4) · «MCSC 633N 양하 카고 플랜» · «MCSC 633N 양하카고플랜 보여줘''» · «미르 점심은?»
const path = require('path');
const fs = require('fs');
const [PC, NS, MC] = process.argv.slice(2);
if (!PC || !NS || !MC) { console.error('✗ 번들 경로 셋(planCommand·nlSearch·mirChat)이 필요하다'); process.exit(1); }
global.window = { __mirLexicon: {}, __mirLexiconWrite: () => {}, dispatchEvent: () => true };
//  ★ 3.69-05 (재감사 지적) — **검수원을 등록한 상태가 실앱의 정상 흐름이다.** 이 하네스가 그것을 안 세워
//    호칭이 «검수사님» 으로 고정됐고, 그 바람에 호칭에 기대는 버그(mirCall 이 «아저씨/형님» 을 Math.random 으로
//    고른다)가 172항을 전부 통과했다. 검사가 통과하는 조건과 검수사가 쓰는 조건이 달랐다.
const _ls = { 'master_active_inspector_v1': '김성일' };
global.localStorage = { getItem: (k) => (_ls[k] === undefined ? null : _ls[k]), setItem: (k, v) => { _ls[k] = String(v); }, removeItem: (k) => { delete _ls[k]; } };
global.window.localStorage = global.localStorage;
global.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
const P = require(path.resolve(PC)); const N = require(path.resolve(NS)); const M = require(path.resolve(MC));
let fail = 0; const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fail++; };
console.log('[1] 동사 없는 «배 [항차] [양하|선적] 카고플랜|베이플랜» 은 명령이다');
for (const q of ['MCSC 카고플랜', 'MCSC 카고 플랜', 'MCSC  카고 플랜', "MCSC 633N 양하카고플랜 보여줘''", '미르야 MCSC 카고플랜', 'MCSC 카고플랜?']) {
  const r = P.parseViewCommand(q); ok(r && r.what === 'cargo', `«${q}» → cargo (${JSON.stringify(r)})`);
}
{ const r = P.parseViewCommand('MCSC 633N 양하 카고 플랜'); ok(r && r.what === 'cargo' && r.mode === 'discharge', `«MCSC 633N 양하 카고 플랜» → 양하 cargo (${JSON.stringify(r)})`); }
{ const r = P.parseViewCommand('STARSHIP DRACO 선적 베이플랜'); ok(r && r.what === 'bay' && r.mode === 'loading', '«STARSHIP DRACO 선적 베이플랜» → 선적 bay'); }
{ const r = P.parseViewCommand('MCSC LOADING CARGO PLAN'); ok(r && r.what === 'cargo' && r.mode === 'loading', '영어 «MCSC LOADING CARGO PLAN» 종전 그대로'); }
console.log('[2] 낱말이 하나라도 더 붙으면 조회다 — 종전 동작 유지');
for (const q of ['5번 베이 플랜에 뭐 있어', '카고플랜 어디서 뽑아', '카고플랜 보고 싶어', '리퍼 몇 대', '0320', '0320 카고플랜', '4440320 카고플랜']) {
  ok(P.parseViewCommand(q) == null, `«${q}» → 명령 아님`);
}
ok(P.parseViewCommand('카고플랜 보여줘') && P.parseViewCommand('KSKM LOADING PLAN'), '동사·영어 PLAN 은 종전대로 명령');
console.log('[2-0] 3.53-04 — 맨 «플랜» 은 카고플랜이다(검수사 «일반적 플랜은 카고플랜», mode 는 부르는 쪽 현재 모드)');
for (const q of ['플랜', '미르야 플랜', 'MCSC 플랜', '플랜 열어', '플랜?']) {
  const r = P.parseViewCommand(q); ok(r && r.what === 'cargo' && r.mode == null && r.bay == null, `«${q}» → cargo·모드 없음 (${JSON.stringify(r)})`);
}
{ const r = P.parseViewCommand('KSKM 선적 플랜'); ok(r && r.what === 'cargo' && r.mode === 'loading', `«KSKM 선적 플랜» → 선적 cargo (${JSON.stringify(r)})`); }
for (const [q, bay] of [['5번 플랜', 5], ['22 플랜', 22], ['B22 플랜', 22], ['MCSC 5번 플랜', 5]]) { const r = P.parseViewCommand(q); ok(r && r.what === 'bay' && r.bay === bay, `«${q}» → bay ${bay} 베이플랜 (${JSON.stringify(r)})`); }
console.log('[2-1] 베이 번호만 붙은 베이플랜도 명령 — bay 로 넘긴다(감사 P2-1)');
for (const [q, bay] of [['5번 베이플랜', 5], ['22 베이플랜', 22], ['B22 베이플랜', 22], ['NSDC 10번 베이플랜', 10]]) {
  const r = P.parseViewCommand(q); ok(r && r.what === 'bay' && r.bay === bay, `«${q}» → bay ${bay} (${JSON.stringify(r)})`);
}
console.log('[3] 항차번호(633N·2608N)는 컨 끝자리가 아니다');
{ const p = N.parseNaturalQuery('MCSC 633N 양하 카고 플랜'); ok(!p.digits, `«MCSC 633N 양하 카고 플랜» digits 없음 (${p.digits || '-'})`); }
{ const p = N.parseNaturalQuery('NSDC 2608N 브리핑'); ok(!p.digits && p.briefingQuery, `«NSDC 2608N 브리핑» digits 없음·브리핑 (${p.digits || '-'})`); }
{ const p = N.parseNaturalQuery('MCSC 633N 0320'); ok(p.digits === '0320', `«MCSC 633N 0320» 은 그대로 0320 (${p.digits})`); }
{ const p = N.parseNaturalQuery('0320'); ok(p.digits === '0320', '«0320» 그대로'); }
{ const p = N.parseNaturalQuery('4440320 어디야'); ok(p.digits === '0320', '«4440320 어디야» → 0320 (숫자부 끝4)'); }
{ const p = N.parseNaturalQuery('635S'); ok(!p.digits, '«635S» 만 치면 끝자리 조회가 아니다'); }
console.log('[4] «미르 점심은?» 잡담');
for (const q of ['미르 점심은?', '미르 밥은?', '너 저녁은', '미르 점심은']) { const a = M.mirSmallTalk(q); ok(a && /드셨어요/.test(a), `«${q}» → ${String(a || '').slice(0, 30)}`); }
ok(M.mirSmallTalk('점심 뭐 먹을까') == null, '«점심 뭐 먹을까» 는 돌림판(nlSearch foodQuery) 몫 — 잡담이 안 가로챈다');
ok(M.mirSmallTalk('점심까지 끝나?') == null, '«점심까지 끝나?» 는 업무(ETA) — 잡담 아님');
//  3.7-06 — «점심 먹었어»는 제 끼니를 묻는 말이다(검수사 정정 2026-09-04). 앞으로 드실 분께 하는 인사로 받으면 안 된다.
for (const q of ['점심 먹었어', '점심 먹었어?', '밥 먹었어', '저녁 먹었니', '미르 점심 먹었어?', '너 밥 드셨어요']) {
  const a = String(M.mirSmallTalk(q) || '');
  ok(a && !/식사 맛있게 하세요/.test(a), `«${q}» 를 «식사 맛있게 하세요»로 받지 않는다 → ${a.slice(0, 28)}`);
  ok(/드셨/.test(a), `«${q}» → 되묻는다`);
}
for (const q of ['점심 먹으러 가자', '밥 먹자', '점심 시간이야 넌 뭐 먹을꺼야']) {
  ok(/식사 맛있게 하세요/.test(String(M.mirSmallTalk(q) || '')), `«${q}» 는 종전 그대로 식사 인사`);
}
//  3.61-04 — 검수사 2026-09-27 라이브 실측 «미르 아침에 뭐 먹었어?» 가 맛집 돌림판으로 답하고 화면까지 넘어갔다.
//    «이렇게 교육하면 미르가 바보가 됩니다. 내가 뭘 먹을지 물어본게 아니고 말 그대로 미르가 뭘 먹었는지 물어 본것입니다»
for (const q of ['미르 아침에 뭐 먹었어?', '아침에 뭐 먹었어', '점심 뭐 드셨어요', '너 아침에 뭐 먹었어', '아침 뭐 먹고 왔어', '미르 아침 뭐 먹고 있었어', '뭐 먹었어', '너 자셨어요']) {
  const a = String(M.mirSmallTalk(q) || '');
  ok(a && !/맛있게 하세요/.test(a), `«${q}» 를 앞으로 드실 분께 하는 인사로 받지 않는다 → ${a.slice(0, 26)}`);
  ok(/먹었|드셨|아직|자셨/.test(a), `«${q}» → 제 끼니를 답한다`);
  //  ⚠ 이 줄이 없으면 검수사가 본 증상(1.5초 뒤 #/food 로 화면이 넘어감 — SearchPanel 1379)을 아무도 못 잡는다.
  ok(N.parseNaturalQuery(q).foodQuery == null, `«${q}» 는 돌림판으로 화면을 넘기지 않는다`);
}
//  앞일은 종전 그대로 — 복합문(지난 일 + 앞일)에서 맛집을 잃으면 안 된다(감사가 잡은 회귀 자리).
ok(N.parseNaturalQuery('점심 뭐 먹을까').foodQuery === 'lunch', '«점심 뭐 먹을까» 는 종전대로 돌림판(lunch)');
ok(N.parseNaturalQuery('아침 안 먹었어 뭐 먹을까').foodQuery === 'breakfast', '«아침 안 먹었어 뭐 먹을까» — 앞일이 이겨 돌림판(breakfast)');
ok(N.parseNaturalQuery('어제 먹었던 맛집 또 알려줘').foodQuery === 'any', '«어제 먹었던 맛집 또 알려줘» 는 맛집 요구다(any)');
ok(N.parseNaturalQuery('아침 뭐 먹었는지 알려줘').foodQuery == null, '«아침 뭐 먹었는지 알려줘» 는 지난 일 — 돌림판 아님');
//  ⚠ 순환 초기화 함정 — 판정을 mir.js 최상단 상수로 두면 이 세 줄이 통째로 죽는다(3.61-04 실측).
ok(/드셨/.test(String(N.generateLocalAnswer(N.parseNaturalQuery('미르 아침에 뭐 먹었어?'), [], [], {}) || '')), '항차 화면(nlSearch 경로)에서도 끼니 답을 싣는다');
ok(/맛있/.test(String(M.mirSmallTalk('맛있었어') || '')), '«맛있었어» — 되물은 뒤 이어지는 말을 받는다');
//  감사 지적(2026-09-04) — «먹었어»로 끝난다고 다 끼니가 아니다. 이런 말에 밥 이야기로 답하면 안 된다.
for (const q of ['욕 먹었어', '겁 먹었어', '마음 먹었어', '나이 먹었어', '약 먹었어', '한 방 먹었어',
                 '너 욕 먹었어', '넌 겁 먹었어', '당신 약 먹었어', '미르 욕 먹었어',
  //  3.61-04 — 표지를 넓히면 배제도 같이 넓어져야 한다(감사가 308꼴로 잡은 자리). 검수사가 야단맞고 와서 하는 말이다.
  '미르 욕 먹고 왔어', '너 욕 먹고 왔어', '미르 겁 먹고 왔어', '미르 욕 먹은 거야', '미르 나이 먹은 거야', '미르 퇴짜 먹고 왔어']) {
  ok(!/드셨|츄르|멸치|열빙어/.test(String(M.mirSmallTalk(q) || '')), `«${q}» 를 끼니로 받지 않는다`);
}
for (const q of ['오늘 회의 별로였어', '교육 별로였어', '맛나는 집 어디']) {
  ok(!/다음 끼니|제 배가 다 부르네요/.test(String(M.mirSmallTalk(q) || '')), `«${q}» 를 끼니 답으로 받지 않는다`);
}
{  // 되물은 직후에는 «별로였어»도 받는다 — 대화가 끊기지 않게.
  M.mirSmallTalk('점심 먹었어');
  ok(/다음 끼니/.test(String(M.mirSmallTalk('별로였어') || '')), '되물은 직후의 «별로였어» 는 받는다');
}
//  ★ 3.69-05 (검수사 2026-09-30 «묻고 답을주니 그 다음은 반응을 못함»):
//    되물어 놓고 **메뉴를 들으면 무응답**이던 자리 — 실측으로 스프·김치찌개·토스트가 전부 null 이었다.
for (const q of ['난 아침에 스프 먹어.', '스프 먹었어', '김치찌개 먹었어요', '국밥 먹었어요', '주먹밥 먹었어요', '저는 점심에 칼국수 먹었어요']) {
  M.mirSmallTalk('아침 뭐 먹었어?');                       // 되묻기로 3분 창을 연다
  const a = String(M.mirSmallTalk(q) || '');
  ok(a !== '', `되물은 뒤 «${q}» 를 받는다`);
  ok(!/뭐 드셨|메뉴 좀 알려|여쭤봐도 돼요/.test(a), `«${q}» 에 **다시 되묻지 않는다** → ${a.slice(0, 34)}`);
}
{  // 들은 메뉴를 그대로 되받는다 · 안 드셨다는 답도 받는다
  M.mirSmallTalk('아침 뭐 먹었어?');
  ok(/스프/.test(String(M.mirSmallTalk('난 아침에 스프 먹어.') || '')), '들은 메뉴 «스프» 가 답에 들어간다');
  //  ⚠ 맨 명사 한 마디는 **안 받는다** — 미르 대화의 «카고»·«응 맞아» 와 구별할 길이 없다(3.69-05 회귀).
  //  ⚠ 감사 ①②(2026-09-30, 판정 «부») — «…요» 로 끝난다고 메뉴가 아니다. 끼니 표지(«먹/드시/자시»)를 반드시 요구한다.
  //    처음 판은 존댓말 34문장 중 28을 삼켰다 — 위로·인사·미르 대화 제안 칩까지 음식 답으로 나가고 무응답 신고도 끊겼다.
  const _menuish = (a) => /적어 뒀어요|든든하시겠어요|드셨구나|좋죠!/.test(String(a || ''));
  for (const q of ['카고', '응 맞아', '두 번째요', '속도요', '그거요', '남은 대수요', '첫 번째요']) {
    M.mirSmallTalk('아침 뭐 먹었어?');
    ok(!_menuish(M.mirSmallTalk(q)), `3분 창 안이어도 «${q}» 는 메뉴가 아니다(미르 대화 몫)`);
  }
  for (const q of ['피곤해요', '오늘 힘들어요', '속상해요', '지쳤어요']) {
    M.mirSmallTalk('아침 뭐 먹었어?');
    ok(/애쓰셨어요|토닥토닥/.test(String(M.mirSmallTalk(q) || '')), `«${q}» 는 위로 갈래가 받는다`);
  }
  for (const q of ['다녀올게요', '다녀왔어요', '안녕하세요', '감사해요', '비 와요', '추워요']) {
    M.mirSmallTalk('아침 뭐 먹었어?');
    ok(!_menuish(M.mirSmallTalk(q)), `«${q}» 를 음식 답으로 받지 않는다`);
  }
  //  ⚠ 감사 ③ — 남 이야기·전해 들은 말·나이 세는 말은 끼니 그물과 **같은 배제**를 받는다.
  for (const q of ['케빈이 국밥 먹었어요', '아이 밥 먹었어요', '강아지 밥 먹었어요', '한 살 더 먹었어요', '수석이 점심 먹었대']) {
    M.mirSmallTalk('아침 뭐 먹었어?');
    ok(!_menuish(M.mirSmallTalk(q)), `«${q}» 는 내 끼니 답이 아니다`);
  }
  //  ⚠ 감사 ⑤ — 안 드셨다는 답의 흔한 꼴
  for (const q of ['아직 안 먹었어요', '아직 못 먹었어요', '걸렀어요', '굶었어요']) {
    M.mirSmallTalk('점심 먹었어?');
    ok(/아직이시구나/.test(String(M.mirSmallTalk(q) || '')), `«${q}» 를 «안 드셨다»로 받는다`);
  }
  //  ⚠ 감사 ④ — 화면 재계산으로 3분 창이 늘어나지 않는다
  {
    const real = Date.now; const base = real();
    Date.now = () => base;            M.mirSmallTalk('아침 뭐 먹었어?');
    Date.now = () => base + 150000;   M.mirSmallTalk('아침 뭐 먹었어?');   // 2.5분 뒤 화면이 다시 계산
    Date.now = () => base + 200000;   ok(M.mirSmallTalk('스프 먹었어요') === null, '첫 되묻기로부터 3분이 지나면 창은 닫힌다(재계산으로 안 늘어난다)');
    Date.now = real;
  }
  //  ⚠ 감사 ⑥ — 메뉴 이름에 «먹» 이 들어도 되묻기를 되풀이하지 않는다
  M.mirSmallTalk('아침 뭐 먹었어?');
  ok(/주먹밥/.test(String(M.mirSmallTalk('주먹밥 먹었어요') || '')), '«주먹밥» 을 메뉴로 받는다(«먹» 한 글자에 안 걸린다)');
  //  ⚠ 재감사 ① — 호칭 꼬리가 무작위라도 **매번** 받아야 한다. 창 임자를 호칭으로 적으면 여기서 절반이 떨어진다.
  {
    let got = 0;
    for (let i = 0; i < 40; i++) { M.mirSmallTalk('아침 뭐 먹었어?'); if (/스프/.test(String(M.mirSmallTalk('난 아침에 스프 먹어.') || ''))) got++; }
    ok(got === 40, `검수원이 등록된 상태에서 되묻기→메뉴가 40회 모두 통한다 (${got}/40)`);
  }
  //  ⚠ 3.69-05 — 호칭도 한 사람에게 늘 같아야 한다(종전 Math.random 이라 낭독 키가 흔들렸다 · 기준본에도 있던 병).
  {
    const names = new Set();
    for (let i = 0; i < 40; i++) names.add(String(M.mirSmallTalk('아침 뭐 먹었어?') || '').match(/(아저씨|형님)/)?.[1] || '');
    ok(names.size === 1, `한 검수원에게 호칭 꼬리가 하나로 고정된다 (${[...names].join('·')})`);
  }
  //  ⚠ 3차 감사 잔여 — 남 이야기 목록·때말·약·수량
  for (const q of ['애가 국밥 먹었어요', '애가 안 먹었어요', '와이프가 안 먹었어요', '집사람이 국밥 먹었어요',
                   '쉬는 시간에 먹었어요', '우리 다 먹었어요', '약 안 먹었어요', '약 못 먹었어요']) {
    M.mirSmallTalk('아침 뭐 먹었어?');
    const a = String(M.mirSmallTalk(q) || '');
    ok(!_menuish(a) && !/아직이시구나/.test(a), `«${q}» 는 검수사님 끼니 답이 아니다`);
  }
  for (const q of ['삼겹살 2인분 먹었어요', '라면 2개 먹었어요']) {
    M.mirSmallTalk('아침 뭐 먹었어?');
    ok(_menuish(M.mirSmallTalk(q)), `«${q}» 는 메뉴로 받는다(수량이 붙어도)`);
  }
  //  ⚠ 재감사 ② — «잘 먹었어요» 는 종전 갈래 몫이다
  for (const q of ['잘 먹었어요', '잘 먹었습니다', '국밥 잘 먹었어요']) {
    M.mirSmallTalk('아침 뭐 먹었어?');
    ok(/제 배가 다 부르네요/.test(String(M.mirSmallTalk(q) || '')), `«${q}» 는 «맛있게 드셨다니» 갈래가 받는다`);
  }
  //  ⚠ 재감사 ③ — 부사·대명사·자리말·업무 꼴은 메뉴가 아니다
  for (const q of ['많이 먹었어요', '조금 먹었어요', '혼자 먹었어요', '방금 먹었어요', '빨리 먹었어요', '다 먹었어요',
                   '그거 먹었어요', '아무거나 먹었어요', '집에서 먹었어요', '구내식당에서 먹었어요',
                   '작업 전에 먹었어요', '야드 가서 먹었어요', '1번 갱 먹었어요', '두 번째 먹었어요']) {
    M.mirSmallTalk('아침 뭐 먹었어?');
    ok(!_menuish(M.mirSmallTalk(q)), `«${q}» 를 메뉴로 읽지 않는다`);
  }
  for (const q of ['안 먹고 왔어요', '시간 없어서 못 먹었어요']) {
    M.mirSmallTalk('점심 먹었어?');
    ok(/아직이시구나/.test(String(M.mirSmallTalk(q) || '')), `«${q}» 를 «안 드셨다»로 받는다`);
  }
  M.mirSmallTalk('점심 먹었어?');
  ok(/아직/.test(String(M.mirSmallTalk('아직이요') || '')), '«아직이요» 도 받는다');
}
{  // 검수사 «점심보다 저녁에 먹을껄 대비하네요» — 끼니 이름을 읽는다
  for (const q of ['저녁 뭐 먹었어?', '야식 먹었어?']) {
    ok(!/용으로 남겨/.test(String(M.mirSmallTalk(q) || '')), `«${q}» 에 «다음 끼니용으로 남겨» 는 안 나온다`);
  }
  ok(/아침/.test(String(M.mirSmallTalk('아침 뭐 먹었어?') || '')), '되묻는 말에 물은 끼니 이름이 들어간다');
}
{  // 검수사 «매번 같은것만» — 날이 바뀌면 답도 바뀐다(같은 날은 같은 답 그대로)
  const real = Date.now; const base = real();
  const seen = new Set();
  //  _todaySeed·_nextMeal 이 new Date(Date.now()) 를 쓰므로 Date.now 하나만 갈아도 날이 바뀐다.
  for (let i = 0; i < 20; i++) { Date.now = () => base + i * 86400000; seen.add(String(M.mirSmallTalk('아침 뭐 먹었어?') || '')); }
  Date.now = real;
  ok(seen.size >= 4, `«아침 뭐 먹었어?» 가 20일에 걸쳐 여러 답을 낸다(가짓수 ${seen.size})`);
  const a1 = String(M.mirSmallTalk('아침 뭐 먹었어?') || ''); const a2 = String(M.mirSmallTalk('아침 뭐 먹었어?') || '');
  ok(a1 === a2, '같은 날 같은 질문은 같은 답이다(낭독이 처음부터 다시 읽히지 않게)');
}
{  // ⚠ 3.69-05 회귀 — 끼니말 자체는 메뉴가 아니다(«밥 먹었어» 가 메뉴 «밥» 으로 읽혀 연막검사가 잡았다).
  for (const q of ['밥 먹었어', '점심 먹었어', '저녁 먹었어', '아침 먹었어', '식사 했어요']) {
    M.mirSmallTalk('아침 뭐 먹었어?');
    ok(/드셨|먹었|아직/.test(String(M.mirSmallTalk(q) || '')) && !/적어 뒀어요|든든하시겠어요|드셨구나/.test(String(M.mirSmallTalk(q) || '')),
      `«${q}» 는 끼니 그물이 받는다(메뉴로 안 샌다)`);
  }
  M.mirSmallTalk('아침 뭐 먹었어?');
  ok(/국밥/.test(String(M.mirSmallTalk('국밥 먹었어요') || '')), '«국밥» 은 «국» 으로 잘리지 않는다');
}
{  // 문지기가 옆길을 막는가 — 3분 창 밖·업무 말·딴뜻 «먹었»
  const real = Date.now; const base = real();
  M.mirSmallTalk('아침 뭐 먹었어?');
  Date.now = () => base + 4 * 60 * 1000;
  ok(M.mirSmallTalk('스프 먹어') === null, '되물은 지 4분 뒤 «스프 먹어» 는 안 받는다(무응답 신고가 살아 있다)');
  Date.now = real;
  M.mirSmallTalk('아침 뭐 먹었어?');
  ok(!/든든|드셨구나|좋죠/.test(String(M.mirSmallTalk('미르 욕 먹었어') || '')), '«욕 먹었어» 는 메뉴가 아니다');
  M.mirSmallTalk('아침 뭐 먹었어?');
  ok(M.mirSmallTalk('3호기 어디까지 했어') === null, '업무 말은 3분 창 안에서도 잡담이 안 가로챈다');
}
//  항차 화면도 같은 답을 낸다 — 검수사가 실제로 물은 자리(SearchPanel·VoyagePage)는 잡담을 안 불렀다.
{
  const a = String(N.generateLocalAnswer(N.parseNaturalQuery('점심 먹었어'), [], [], {}) || '');
  ok(/드셨/.test(a), `generateLocalAnswer 가 잡담 답을 싣는다(VoyagePage 경로) → ${a.slice(0, 30)}`);
  const b = String(N.generateLocalAnswer(N.parseNaturalQuery('리퍼 몇 대'), [], [], {}) || '');
  ok(!/드셨|츄르/.test(b), '업무 질문은 잡담이 가로채지 않는다');
  //  ★ 3.7-06 감사 지적[높] — **잡담이 앞말의 «정답»이 되면 안 된다.**
  //    잡담을 «알아들었다»로 세면서 학습 분기가 열렸고, «밥은?» → «밥 먹었어» 로 `밥` 이 사전에 굳었다(감사 실측).
  //    사전은 전역 노드라 한 폰의 오염이 전 기기로 퍼진다.
  for (const [first, second] of [['밥은?', '밥 먹었어'], ['점심?', '점심 먹었어'], ['오늘?', '오늘 힘들어']]) {
    const WROTE = []; const g = globalThis; const _w = g.window, _c = g.CustomEvent;
    g.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } };
    g.window = { __mirLexicon: {}, __mirLexiconWrite: (k) => WROTE.push(k), dispatchEvent: () => true, addEventListener() {} };
    try {
      N._mirReset();
      N.generateLocalAnswer(N.parseNaturalQuery(first), [], [], {});
      const ans = String(N.generateLocalAnswer(N.parseNaturalQuery(second), [], [], {}) || '');
      ok(WROTE.length === 0 && !/뜻으로 배웠어요/.test(ans), `«${first}» → «${second}» 로 별칭을 만들지 않는다 (${JSON.stringify(WROTE)})`);
    } finally { g.window = _w; g.CustomEvent = _c; }
  }
  //  낭독이 처음부터 다시 시작되지 않게 — 같은 질문에는 같은 답(잡담 대본은 무작위다).
  const lens = [0, 0, 0, 0, 0].map(() => String(N.generateLocalAnswer(N.parseNaturalQuery('점심 먹었어'), [], [], {}) || '').length);
  ok(new Set(lens).size === 1, `같은 질문에는 같은 잡담 답 — 낭독 키가 안 흔들린다 (${lens.join(',')})`);
}
//  3.7-06 — 잡담이 받은 말은 «못 알아들은 말»이 아니다(엉뚱한 자동 별칭의 뿌리).
{
  const MISS = []; const g = globalThis;
  const _w = g.window, _c = g.CustomEvent;
  g.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } };
  g.window = { __mirLexicon: {}, __mirLexiconWrite: () => { MISS.push('WROTE'); }, dispatchEvent(e) { if (e.type === 'gm-mir-miss') MISS.push(e.detail.q); return true; }, addEventListener() {} };
  try {
    N._mirReset();
    N.generateLocalAnswer(N.parseNaturalQuery('점심 먹었어'), [], [], {});
    N.generateLocalAnswer(N.parseNaturalQuery('점심 먹으러 가자'), [], [], {});
    ok(MISS.length === 0, `잡담은 miss 로 안 적고 별칭도 안 만든다 (${JSON.stringify(MISS)})`);
    N._mirReset();
    N.generateLocalAnswer(N.parseNaturalQuery('천정이 뭐야'), [], [], {});
    ok(MISS.length === 1, `정말 못 배운 말은 그대로 결산에 남는다 (${JSON.stringify(MISS)})`);
  } finally { g.window = _w; g.CustomEvent = _c; }
}
console.log(fail ? `✗ ${fail}건 실패` : '✓ 플랜 명령·항차번호·잡담 연막검사 통과');
process.exit(fail ? 1 : 0);
