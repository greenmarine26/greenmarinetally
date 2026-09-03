// 컨번호 검산(ISO 6346) 연막검사 — 실제 항차 컨번호로 잰다 (3.5-01)
//   검수사 확정 2026-09-03 — 외부 MirAI.py 에서 이 부분만 골라 옮겼다.
//   ⚠ 막지 않고 «알리기만» 하는 것이 규칙이다 — 규칙을 안 지킨 번호도 드물게 온다.
const fs = require('fs'); const path = require('path');
const U = require(process.argv[2]);
let fail = 0; const T = (c, m) => { if (!c) { console.error('  ✗', m); fail++; } else console.log('  ✓', m); };

const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'iso_cns.json'), 'utf8'));
console.log(`실제 컨번호 ${fx.cns.length}개 (${fx.from})`);

// ① 실제 번호는 전부 통과해야 한다 — 하나라도 떨어지면 현장에 거짓 경고가 나간다
const bad = fx.cns.filter((c) => U.isoCheckDigit(c) !== true);
T(bad.length === 0, `실제 컨번호가 검산에서 떨어진다: ${bad.slice(0, 5).join(', ')}`);

// ② 마지막 자리를 한 칸 틀면 반드시 잡는다
let caught = 0;
for (const c of fx.cns) {
  const typo = c.slice(0, 10) + String((Number(c[10]) + 1) % 10);
  if (U.isoCheckDigit(typo) === false) caught++;
}
T(caught === fx.cns.length, `마지막 자리 오타를 ${caught}/${fx.cns.length} 만 잡는다`);

// ③ 고침 후보가 원래 번호를 되돌려 준다
let fixed = 0;
for (const c of fx.cns) {
  const typo = c.slice(0, 10) + String((Number(c[10]) + 1) % 10);
  if (U.isoFixLastDigit(typo) === c) fixed++;
}
T(fixed === fx.cns.length, `고침 후보가 원래 번호를 ${fixed}/${fx.cns.length} 만 돌려준다`);

// ④ 형식 밖은 «모름»(null) — «틀림»(false)이 아니다. 끝 4자리 조회에 경고가 뜨면 안 된다.
for (const q of ['4777', '', '  ', 'ABC12345678', 'ABCD123456', '20피트 몇 대', 'SWDN 2606N']) {
  T(U.isoCheckDigit(q) === null, `«${q}» 에 검산 판정을 낸다 — 끝 4자리 조회에 경고가 뜬다`);
}

// ⑤ 소문자·공백·하이픈을 넣어도 같은 답
const c0 = fx.cns[0];
T(U.isoCheckDigit(c0.toLowerCase()) === true, '소문자를 못 읽는다');
T(U.isoCheckDigit(c0.slice(0, 4) + ' ' + c0.slice(4)) === true, '공백 낀 번호를 못 읽는다');
T(U.isoCheckDigit(c0.slice(0, 4) + '-' + c0.slice(4)) === true, '하이픈 낀 번호를 못 읽는다');

// ⑥ 맞는 번호에는 고침 후보를 안 낸다(잔소리 금지)
T(U.isoFixLastDigit(c0) === '', '맞는 번호인데 고침 후보를 낸다');

console.log(fail ? `\n검산 연막검사 실패 ${fail}건` : '\n검산 연막검사 통과');
process.exit(fail ? 1 : 0);
