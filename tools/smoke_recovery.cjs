// 복구 코드 연막검사 — **소유자가 잠기면 아무도 못 여는 구멍**을 막은 것이 실제로 도는가.
//
// 왜 있는가 (검수사 2026-08-26 — *«수석 임원 그리고 저 비밀번호 분실시 접속할 방법이 없어요»*).
//   `adminGuard.ownerCanUnlock` 이 첫 줄에서 **소유자를 제외**한다. 그래서 구조가 이렇게 갈려 있었다 —
//     수석·임원이 잠기면 → 소유자가 열어 준다 (owner 모드, 구현돼 있었다)
//     **소유자가 잠기면 → 아무도 못 연다**
//   지금까지 신뢰 기기가 버텨 왔을 뿐이고, 검수사는 실제로 비밀번호를 잊으셨다
//   (*«내꺼에서만 하다가 다른데에서 할려니 생각이 안나요»* — 신뢰 기기에선 칠 일이 없어 잊는다).
//
// ⚠ 실소스를 번들해서 잰다. 로직을 손으로 베껴 돌리면 통과하는데 실코드는 틀리는 일이 있다.
const path = require('path');
const OUT = process.argv[2];
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
const E = require(path.resolve(OUT));

for (const fn of ['makeRecoveryCode', 'normalizeRecoveryCode', 'buildRecoveryRecord',
                  'hasRecoveryCode', 'verifyRecoveryCode', 'recoveryFileText', 'recoveryFileName']) {
  if (typeof E[fn] !== 'function') { console.error(`✗ ${fn} 가 없다`); process.exit(1); }
}

let bad = 0;
const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };

(async () => {
  // ① 코드 모양
  const code = E.makeRecoveryCode();
  T(/^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/.test(code), `코드 모양이 XXXX-XXXX-XXXX-XXXX 가 아니다: ${code}`);
  T(!/[01OIL]/.test(code), `헷갈리는 글자(0·O·1·I·L)가 들어갔다: ${code}`);
  //   ⚠ 이 규칙은 첫 시뮬에서 실제로 깨졌다(알파벳에 L 이 남아 있었다). 그래서 검사로 못박는다.
  const many = Array.from({ length: 300 }, () => E.makeRecoveryCode());
  T(new Set(many).size === many.length, '같은 코드가 두 번 나왔다 — 난수가 아니다');
  T(many.every((c) => !/[01OIL]/.test(c)), '300개 중 헷갈리는 글자가 섞인 코드가 있다');

  // ② 저장 모양 — 평문이 남으면 안 된다
  const rec = await E.buildRecoveryRecord(code);
  T(!!(rec.hash && rec.salt), '해시·솔트가 없다');
  T(!JSON.stringify(rec).includes(code.replace(/-/g, '')), '⛔ 평문 코드가 저장 레코드에 남는다');
  T(!JSON.stringify(rec).includes(code), '⛔ 평문 코드가 저장 레코드에 남는다(하이픈 포함형)');
  T(rec.usedAt === 0, '새 코드인데 usedAt 이 0 이 아니다');

  // ③ 검증
  const guard = { recovery: { '김성일': rec } };
  T((await E.verifyRecoveryCode(guard, '김성일', code)).ok === true, '맞는 코드가 통과하지 않는다');
  T((await E.verifyRecoveryCode(guard, '김성일', code.toLowerCase())).ok === true, '소문자로 치면 안 통과한다');
  T((await E.verifyRecoveryCode(guard, '김성일', code.replace(/-/g, ''))).ok === true, '하이픈을 빼면 안 통과한다');
  T((await E.verifyRecoveryCode(guard, '김성일', `  ${code}  `)).ok === true, '앞뒤 공백이 있으면 안 통과한다');
  T((await E.verifyRecoveryCode(guard, '김성일', E.makeRecoveryCode())).ok === false, '⛔ 다른 코드가 통과한다');
  T((await E.verifyRecoveryCode(guard, '김성일', '')).ok === false, '⛔ 빈 값이 통과한다');
  T((await E.verifyRecoveryCode(guard, '김명보', code)).ok === false, '⛔ 남의 이름으로 통과한다');
  T((await E.verifyRecoveryCode({}, '김성일', code)).ok === false, '만든 적 없는데 통과한다');

  // ④ 왜 안 되는지 말한다 — 조용히 실패하지 않는다(3금지 ③)
  const none = await E.verifyRecoveryCode({}, '김성일', code);
  T(!!none.why && none.why.includes('만든 적'), `이유를 안 말한다: ${JSON.stringify(none)}`);
  const usedRec = { ...rec, usedAt: Date.now() };
  const used = await E.verifyRecoveryCode({ recovery: { '김성일': usedRec } }, '김성일', code);
  T(used.ok === false, '⛔ 이미 쓴 코드가 통과한다 — «한 번만» 이 무너진다');
  T(!!used.why && used.why.includes('이미'), `이유를 안 말한다: ${JSON.stringify(used)}`);
  const wrong = await E.verifyRecoveryCode(guard, '김성일', E.makeRecoveryCode());
  T(!!wrong.why && wrong.why.includes('맞지'), `이유를 안 말한다: ${JSON.stringify(wrong)}`);

  // ⑤ 있는지 판정 — 쓴 코드는 «없는» 것으로 본다(입구 버튼이 헛되이 뜨면 안 된다)
  T(E.hasRecoveryCode(guard, '김성일') === true, '있는데 없다고 한다');
  T(E.hasRecoveryCode({ recovery: { '김성일': usedRec } }, '김성일') === false, '⛔ 이미 쓴 코드를 «있다»고 한다');
  T(E.hasRecoveryCode({}, '김성일') === false, '없는데 있다고 한다');
  T(E.hasRecoveryCode(null, '김성일') === false, 'guard 가 null 일 때 터진다');

  // ⑥ 파일 — 코드가 실제로 들어 있어야 한다(파일만 받고 코드가 없으면 최악이다)
  const txt = E.recoveryFileText('김성일', code);
  T(txt.includes(code), '⛔ 파일에 코드가 없다');
  T(txt.includes('다시 보여주지 않습니다'), '파일에 경고가 없다');
  T(txt.includes('한 번 쓰면 소멸'), '파일에 «한 번만» 안내가 없다');
  T(/복구 코드로 열기/.test(txt), '파일에 쓰는 법이 없다 — 나중에 받아 보면 어디에 넣는지 모른다');
  T(/\.txt$/.test(E.recoveryFileName('김성일')), '파일 이름이 .txt 가 아니다');
  T(E.recoveryFileName('김성일').includes('김성일'), '파일 이름에 누구 것인지 없다');

  // ⑦ 신뢰 기기 한도 — 검수사 확정 «1대추가면 됩니다»
  T(E.MAX_TRUSTED_DEVICES === 4, `신뢰 기기 한도가 4 가 아니다: ${E.MAX_TRUSTED_DEVICES}`);

  // ⑧ ⛔ 뒷문이 생기지 않았는가 — 복구 코드가 «비밀번호» 를 대신 열면 안 된다
  T((await E.verifyPasswordFor(guard, '김성일', code)) === false, '⛔ 복구 코드가 비밀번호로도 통한다');

  if (bad) { console.error(`✗ 복구 코드 연막검사 실패 ${bad}건`); process.exit(1); }
  console.log('✓ 복구 코드 연막검사 통과 (코드 4 · 저장 4 · 검증 8 · 이유 3 · 판정 4 · 파일 6 · 기기 1 · 뒷문 1)');
})();
