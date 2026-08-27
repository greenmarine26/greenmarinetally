// 2.63-02 PORT-MIS 매칭 연막검사 — 자매선 오매칭·낡은 자료 되살아남 금지 (검수사 실측: SWTD 카드에 SHANGHAI 6/11 울산)
const path = require('path');
const fs = require('fs');
const PM = require(path.resolve(process.argv[2]));
const ROOT = process.argv[3] || process.cwd();
let bad = 0; const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/portmis_match.json'), 'utf8'));
// ① 자매선·낡은 자료 — SAWASDEE THAILAND(D7EE)에 SHANGHAI(V7A5455·낡음)가 붙으면 안 된다
T(PM.matchPortMis(fx, { callsign: 'D7EE', vslFull: 'SAWASDEE THAILAND', vsl: 'SWTD' }) === null, '⛔ 자매선 앞5자 오매칭 재발 — SWTD 에 SHANGHAI 가 붙는다');
// ② 본인은 콜사인으로 잡힌다 (콜사인 1단계는 시간 가드 폴백 유지 — 지난 기항 표기용)
const own = PM.matchPortMis(fx, { callsign: 'V7A5455', vslFull: 'SAWASDEE SHANGHAI' });
T(!!own && own.vesselName === 'SAWASDEE SHANGHAI', '콜사인 본인 매칭이 죽었다');
// ③ 소스 — VoyagePage name-norm 이 통째 포함+콜사인 배제+신선도 가드를 갖는가
const vp = fs.readFileSync(path.join(ROOT, 'src/pages/VoyagePage.jsx'), 'utf8');
T(/2\.63-02/.test(vp) && /7 \* 86400000/.test(vp), 'VoyagePage name-norm 가드가 없다 — 앞5자 자매선 오매칭 재발 위험');
T(!/searchVsl\.slice\(0,5\)/.test(vp), 'VoyagePage 에 앞5자 슬라이스 매칭이 남아 있다');
if (bad > 0) { console.error(`✗ PORT-MIS 매칭 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ PORT-MIS 매칭 연막검사 통과 — 자매선 배제 · 본인 유지 · 소스 가드');
