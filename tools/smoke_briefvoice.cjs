// 2.65 브리핑 낭독 연막검사 — 「첫 줄만 읽고 끝나던 것」이 되살아나면 배포를 세운다.
//   검수사 확정: «브리핑은 한번은 정확히 들어야 합니다. 보는것만으로는 지나칠수 있습니다»
const path = require('path');
const fs = require('fs');
const NL = require(path.resolve(process.argv[2]));
const ROOT = process.argv[3] || process.cwd();
let bad = 0; const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };

//  실측 브리핑 원문(PCSZ 2625E 양하 351대 — 2026-08-27 RTDB 실자료로 생성)
const REAL = [
  '📋 양하 평택 351대 — 주의 5건 (위험물 1, FR 2, OT 9)',
  '📌 작업: 351대 (Full 351 / Empty 0 · 20ft 18, 40ft 333) · 베이 2~34 (14개) · 갑판 222 / 홀드 129',
  '⚠ 주의사항',
  '  ☣ 위험물 1대 — cl.3 베이7 — 별도 취급',
  '  ⊞ FR 2대 (베이 12) — 치수·고박 확인',
  '  △ O/T 9대 (베이 2, 20, 24) — 상부 확인',
  '  🛢 탱크 2대 (베이 7, 11)',
  '  📐 OOG 11대 (베이 2, 12, 20, 24) — 규격 외 치수 확인',
  '',
  '"위험물"로 상세 확인 · "FR"로 상세 확인',
].join('\n');

const L = NL.briefingVoiceLines(REAL);
const all = L.join(' | ');
T(L.length === 8, `토막이 8개가 아니다(${L.length}) — 주의사항이 빠지면 검수사가 못 듣는다`);
T(/탱크 2대/.test(all) && /OOG 11대/.test(all), '탱크·OOG 가 낭독에서 빠졌다 — 머리 줄에 없어서 종전엔 소리로 존재조차 없던 항목이다');
T(!/[📋📌⚠☣⊞△🛢📐]/.test(all), '이모지·기호가 그대로 읽힌다');
T(!/로 상세 확인/.test(all), '화면 유도 줄까지 읽는다');
T(/7번 베이/.test(all) && /2번, 20번, 24번 베이/.test(all), '베이 표기가 현장 말투(7번 베이)가 아니다');
T(/베이 2번에서 34번까지/.test(all), '베이 범위를 안 풀어 읽는다');
T(/오티 9대/.test(all) && !/O\/T/.test(all), 'O/T 를 오티로 안 읽는다');
T(/클래스 3/.test(all) && !/cl\.3/.test(all), '위험물 등급을 클래스로 안 읽는다');
T(/20피트 18대, 40피트 333대/.test(all), '규격 대수를 안 풀어 읽는다');
T(/주의사항 5건/.test(all), '주의사항 건수를 안 알려 준다 — 소리로는 몇 개가 오는지 먼저 알아야 센다');
//  컨번호 나열은 읽지 않는다
const XR = NL.briefingVoiceLines('🩻 X-RAY 대상 3대 (베이 9) — 1234, 5678, 9012 — 양하 후 별도 처리');
T(/번호는 화면에/.test(XR.join(' ')) && !/5678/.test(XR.join(' ')), '컨번호 나열을 그대로 읽는다 — 숫자만 30초가 된다');
T(/엑스레이/.test(XR.join(' ')), 'X-RAY 를 엑스레이로 안 읽는다');
//  ── 배선 (한 벌인지) ──
const v = fs.readFileSync(path.join(ROOT, 'src/voice.js'), 'utf8');
T(/export function speakLong/.test(v), 'speakLong 이 없다');
T(/speechSynthesis\.resume\(\)/.test(v), 'keepalive(resume) 가 없다 — 크롬이 긴 낭독을 스스로 멈춘다');
T((v.match(/export function stopSpeak/g) || []).length === 1, 'stopSpeak 이 두 벌이다');
T(/_clearKeepAlive\(\);[\s\S]{0,80}speechSynthesis\.cancel/.test(v), 'stopSpeak 이 keepalive 를 안 내린다 — 다음 음성이 막힌다');
for (const f of ['src/components/SearchPanel.jsx', 'src/pages/VoyagePage.jsx']) {
  const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
  T(/speakLong\(briefingVoiceLines\(/.test(t), `${f} 가 브리핑을 끝까지 안 읽는다(첫 줄만) — 두 화면이 같아야 한다`);
}
if (bad > 0) { console.error(`✗ 브리핑 낭독 연막검사 실패 ${bad}건`); process.exit(1); }
console.log(`✓ 브리핑 낭독 연막검사 통과 — 실측 브리핑 ${L.length}토막 · 낭독 규칙 12 · 배선 5`);
