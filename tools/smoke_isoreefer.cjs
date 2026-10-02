// 리퍼 규격 대조(3.73-01) 연막검사 — NSDC 2609N 양하 실자료 사본(EDI·선사·세관 칸 163대)으로 실소스(utils.isoConflictOf)를 그대로 잰다.
//   ① 종전 증상 13대(EDI 4530 · 세관 42RE)가 이제 불일치가 아니다 ② 40피트 리퍼 표기 전 조합이 같은 규격이다
//   ③ 일반 컨·20피트·리퍼↔드라이는 여전히 불일치로 잡힌다(너무 많이 끄지 않았다) ④ 화면 글자(spec)는 자료 원문 그대로다
const fs = require('fs');
const M = require(process.argv[2]);
const FX = JSON.parse(fs.readFileSync(__dirname + '/fixtures/isoreefer_nsdc.json', 'utf8'));
const fail = (m) => { console.log('✗ ' + m); process.exit(1); };
const reef = FX.filter((c) => c.edi === '4530' && c.iso_customs === '42RE');
if (reef.length !== 13) fail('사본의 «4530 / 42RE» 가 13대가 아니다: ' + reef.length);
const conf = FX.filter((c) => M.isoConflictOf(c.edi, { iso_customs: c.iso_customs, iso_carrier: c.iso_carrier }));
if (conf.length !== 0) fail('실자료 163대에 아직 불일치가 남았다: ' + conf.map((c) => c.cn + ' ' + c.edi + '/' + c.iso_customs).join(', '));
console.log(`  ① NSDC 2609N 양하 ${FX.length}대 — 종전 불일치 13대(EDI 4530 · 세관 42RE) → 0 ✔`);
const R = ['45RE', '45HR', '42HR', '42RF', '42RE', '45RF', '45R1', '4530'];
for (const a of R) for (const b of R) if (M.isoConflictOf(a, { iso_customs: b })) fail(`40피트 리퍼 ${a} ↔ ${b} 가 불일치로 뜬다`);
console.log('  ② 45RE·45HR·42HR·42RF·42RE·45RF·45R1·4530 — 어느 둘을 맞대도 불일치 아님 ✔');
if (!M.isoConflictOf('22GP', { iso_customs: '45GP' })) fail('20피트 일반 ↔ 40HC 가 안 잡힌다');
if (!M.isoConflictOf('45RE', { iso_customs: '45GP' })) fail('리퍼 ↔ 드라이가 안 잡힌다');
if (!M.isoConflictOf('22RE', { iso_customs: '42RE' })) fail('20피트 리퍼 ↔ 40피트 리퍼가 안 잡힌다');
if (!M.isoConflictOf('4500', { iso_customs: '22GP' })) fail('길이가 다른 일반 컨이 안 잡힌다');
if (M.isoConflictOf('4500', { iso_customs: '44GP' })) fail('표기 차이(45GP↔44GP)가 불일치로 뜬다 — 종전 규칙이 깨졌다');
console.log('  ③ 20↔40피트·리퍼↔드라이·길이 다른 컨은 여전히 잡힘 · 45GP↔44GP 표기 차이는 종전대로 조용함 ✔');
const t = M.isoTriad('4530', { iso_customs: '42RE' });
if (t.length !== 2 || t[1].raw !== '42RE' || t[0].raw !== '4530') fail('원문이 바뀌었다: ' + JSON.stringify(t.map((x) => x.raw)));
console.log('  ④ 자료 원문(4530 · 42RE)은 그대로 보인다 ✔');
console.log('연막검사(리퍼 규격 대조) 통과');
