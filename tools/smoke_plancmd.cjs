// 플랜 명령 판정(planCommand.js) + 항차번호/끝자리(nlSearch) + 미르 잡담 연막검사 — 3.2-01 받은함 08-29 무응답 7건 재생
//   실측 문장 그대로: «MCSC 카고플랜»(×4) · «MCSC 633N 양하 카고 플랜» · «MCSC 633N 양하카고플랜 보여줘''» · «미르 점심은?»
const path = require('path');
const fs = require('fs');
const [PC, NS, MC] = process.argv.slice(2);
if (!PC || !NS || !MC) { console.error('✗ 번들 경로 셋(planCommand·nlSearch·mirChat)이 필요하다'); process.exit(1); }
global.window = { __mirLexicon: {}, __mirLexiconWrite: () => {}, dispatchEvent: () => true };
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
for (const q of ['5번 베이 플랜에 뭐 있어', '카고플랜 어디서 뽑아', '플랜', 'MCSC 플랜', '카고플랜 보고 싶어', '리퍼 몇 대', '0320', '0320 카고플랜', '4440320 카고플랜']) {
  ok(P.parseViewCommand(q) == null, `«${q}» → 명령 아님`);
}
ok(P.parseViewCommand('카고플랜 보여줘') && P.parseViewCommand('KSKM LOADING PLAN'), '동사·영어 PLAN 은 종전대로 명령');
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
ok(/맛있/.test(String(M.mirSmallTalk('맛있었어') || '')), '«맛있었어» — 되물은 뒤 이어지는 말을 받는다');
//  감사 지적(2026-09-04) — «먹었어»로 끝난다고 다 끼니가 아니다. 이런 말에 밥 이야기로 답하면 안 된다.
for (const q of ['욕 먹었어', '겁 먹었어', '마음 먹었어', '나이 먹었어', '약 먹었어', '한 방 먹었어',
                 '너 욕 먹었어', '넌 겁 먹었어', '당신 약 먹었어', '미르 욕 먹었어']) {
  ok(!/드셨|츄르|멸치|열빙어/.test(String(M.mirSmallTalk(q) || '')), `«${q}» 를 끼니로 받지 않는다`);
}
for (const q of ['오늘 회의 별로였어', '교육 별로였어', '맛나는 집 어디']) {
  ok(!/다음 끼니|제 배가 다 부르네요/.test(String(M.mirSmallTalk(q) || '')), `«${q}» 를 끼니 답으로 받지 않는다`);
}
{  // 되물은 직후에는 «별로였어»도 받는다 — 대화가 끊기지 않게.
  M.mirSmallTalk('점심 먹었어');
  ok(/다음 끼니/.test(String(M.mirSmallTalk('별로였어') || '')), '되물은 직후의 «별로였어» 는 받는다');
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
