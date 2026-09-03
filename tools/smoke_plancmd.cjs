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
console.log(fail ? `✗ ${fail}건 실패` : '✓ 플랜 명령·항차번호·잡담 연막검사 통과');
process.exit(fail ? 1 : 0);
