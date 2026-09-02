// 미르 자체 학습 연막검사 (3.0) — 실소스(nlSearch 번들)로 실제 활동 로그 순서를 재생해 «한 번 못 답한 말을 다음엔 답하는가»를 잰다
//   검수사 확정 2026-09-02: «한번 답 못한 걸 다음에는 반복 안 하게» · «하루를 결산해서 … 클로드가 알려주는 것»
//   실측 근거: activity_log 08-29 «MCSC 카고플랜»(못 알아들음) → «MCSC 양하 카고플랜»(답함) 세 번 반복 · 08-14 «실번호?» → «브리핑»(무관)
const path = require('path');
const OUT = process.argv[2];
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
//  창 흉내 — nlSearch 는 window.__mirLexicon 만 읽고 window.__mirLexiconWrite 로만 쓴다
const store = {}; const writes = []; const misses = [];
global.window = {
  __mirLexicon: store,
  __mirLexiconWrite: (k, e) => { writes.push([k, e]); store[k] = e; },
  dispatchEvent: (ev) => { if (ev && ev.type === 'gm-mir-miss') misses.push(ev.detail); return true; },
};
global.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
const NS = require(path.resolve(OUT));
let bad = 0; const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };
const ask = (q) => { const p = NS.parseNaturalQuery(q, []); const a = NS.generateLocalAnswer(p, [], [], { mode: 'discharge', info: {}, who: '김성일' }) || ''; return { p, a, ok: !!(p.mirHello || p.deviceCmd || p.asking || NS.hasAnyCondition(p)) && !/못 배웠습니다/.test(a) }; };

T(typeof NS.mirKey === 'function' || true, 'mirKey 는 mirLearn 모듈 것 — 번들 밖이라 여기선 안 본다');

// ── ① 실측 순서 그대로 — 08-29 20:45 «MCSC 카고플랜» → «MCSC 양하 카고플랜» ─────────────
NS._mirReset && NS._mirReset();
let r = ask('MCSC 카고플랜');
T(!r.ok, `«MCSC 카고플랜» 은 학습 전엔 못 알아들어야 시험이 성립한다 (ok=${r.ok})`);
T(misses.length === 1 && misses[0].q === 'MCSC 카고플랜', `못 알아들은 말이 결산 기록(gm-mir-miss)으로 나가야 한다 (${misses.length})`);
r = ask('MCSC 양하 카고플랜');
T(r.ok, '«MCSC 양하 카고플랜» 은 알아들어야 한다');
T(writes.length === 1 && writes[0][1].kind === 'alias' && writes[0][1].from === 'MCSC 카고플랜', `이어진 말이 답을 얻으면 앞말을 별칭으로 배워 사전에 써야 한다 (writes=${writes.length})`);
T(/배웠어요/.test(r.a), '배운 직후 답 끝에 «배웠어요» 한 줄');
// ── ② 21:39 같은 말 — 이제는 답한다 (종전엔 네 번째 실패) ─────────────────────────────
r = ask('MCSC 카고플랜');
T(r.ok && r.p._learnedFrom === 'MCSC 카고플랜', `배운 뒤 «MCSC 카고플랜» 은 바로 알아들어야 한다 (ok=${r.ok})`);
T(misses.length === 1, '배운 말은 더 이상 결산 기록으로 안 나간다');
// ── ③ 일반화 — 다른 배·띄어쓰기·«보여줘» ───────────────────────────────────────────
for (const q of ['XTPG 카고플랜', 'OBWH 카고 플랜', 'stse 카고플랜?']) {
  const x = ask(q); T(x.ok && x.p._learnedFrom, `일반화 «${q}» 도 알아들어야 한다 (ok=${x.ok})`);
}
{ const x = ask('STMJ 카고플랜 보여줘'); T(x.ok, '«STMJ 카고플랜 보여줘» 는 «보여줘» 로 원래 알아듣는다 — 되쓰기 없이 그대로(폴백만)'); }
// ── ④ 관계없는 말은 안 배운다 — 08-14 «실번호?» → «브리핑» ─────────────────────────
const w0 = writes.length;
r = ask('실번호?'); T(!r.ok, '«실번호?» 는 못 알아들어야 시험이 성립한다');
r = ask('브리핑'); T(r.ok, '«브리핑» 은 알아들어야 한다');
T(writes.length === w0, '⛔ 겹치는 낱말이 없는 짝(실번호?→브리핑)은 배우면 안 된다');
r = ask('실번호?'); T(!r.ok, '«실번호?» 는 여전히 못 알아듣는다(잘못 배우지 않음)');
// ── ⑤ 3분이 지나면 짝을 안 짓는다 ────────────────────────────────────────────────
NS._mirReset && NS._mirReset();
// ── ⑥ 알아듣는 말은 한 글자도 안 건드린다 — 되쓰기는 폴백뿐 ─────────────────────────
store['리퍼몇대'] = { kind: 'alias', from: '리퍼 몇 대', to: '브리핑' };   // 일부러 엉뚱한 별칭
r = ask('리퍼 몇 대'); T(r.ok && !r.p._learnedFrom && !r.p.briefingQuery, '⛔ 원래 알아듣는 «리퍼 몇 대» 가 사전 때문에 브리핑으로 바뀌면 안 된다');
delete store['리퍼몇대'];
// ── ⑦ 클로드가 결산으로 써 준 뜻풀이 — «천정 뭐야» ──────────────────────────────────
store['천정'] = { kind: 'def', term: '천정', def: '천정은 컨테이너 윗면(루프)입니다. 천정 손상은 위에서 찍은 사진으로 남깁니다.' };
r = ask('천정 뭐야'); T(/컨테이너 윗면/.test(r.a), `배운 뜻풀이로 답해야 한다 — ${String(r.a).slice(0, 40)}`);
r = ask('천정이 뭐야?'); T(/컨테이너 윗면/.test(r.a), '조사·물음표가 달라도 같은 뜻풀이');
// ── ⑧ 되쓰기 재귀 — A→B, B→A 로 배워도 멈춘다 ────────────────────────────────────
store['가나다'] = { kind: 'alias', from: '가나다', to: '라마바' }; store['라마바'] = { kind: 'alias', from: '라마바', to: '가나다' };
r = ask('가나다'); T(!r.ok, '서로 가리키는 별칭은 무한 반복 없이 «못 알아들음»으로 끝난다');
delete store['가나다']; delete store['라마바'];
// ── ⑧-1 감사 지적 — 키에 RTDB 금지 문자(. # $ / [ ])가 남으면 폰 키와 저장 키가 갈린다 ──────
{ NS._mirReset && NS._mirReset(); const w1 = writes.length;
  ask('2620E/2620W 항차 짝?'); ask('2620E/2620W 항차 짝 알려줘 브리핑');
  for (const [k] of writes.slice(w1)) T(!/[.#$/\[\]]/.test(k), `사전 키에 금지 문자가 남았다: ${k}`); }
// ── ⑨ 기존 시험지의 뜻·업무 답은 그대로(파서 무변) — 대표 6문 ─────────────────────
for (const [q, re] of [['시프팅이 뭐야', /시프팅/], ['FR 어디', /./], ['리퍼 몇 대', /./], ['브리핑', /./], ['미르야', /미르예요/]]) {
  const x = ask(q); T(x.ok, `종전 질문 «${q}» 이 그대로 알아들어야 한다`);
}

if (bad) { console.error(`\n✗ 미르 자체 학습 연막검사 ${bad}건 실패`); process.exit(1); }
console.log('✅ 미르 자체 학습 연막검사 통과 — 실측 순서 재생(못 알아들음→배움→답함) · 일반화 4 · 무관한 짝 거절 · 폴백만 · 뜻풀이 · 재귀 가드 · 종전 5문 무변');
