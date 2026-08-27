// 2.65 브리핑 낭독 연막검사 — 「첫 줄만 읽고 끝나던 것」이 되살아나면 배포를 세운다.
//   검수사 확정: «브리핑은 한번은 정확히 들어야 합니다. 보는것만으로는 지나칠수 있습니다»
const path = require('path');
const fs = require('fs');
const NL = require(path.resolve(process.argv[2]));
const ROOT = process.argv[3] || process.cwd();
let bad = 0; const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };

//  실측 브리핑 원문 — 2026-08-27 라이브(PCSZ 2625E 양하 351대, 작업중) 화면에서 그대로 떠 온 것.
//    작업중인 배라 진행 두 숫자·갱 배분 줄까지 들어 있다(그 줄들이 소리로 뭉개지던 것을 2.65-01 에서 잡았다).
const REAL = [
  '📋 양하 평택 351대 — 주의 5건 (위험물 1, FR 2, OT 9)',
  '📌 작업: 351대 (Full 351 / Empty 0 · 20ft 18, 40ft 333) · 베이 2~34 (14개) · 갑판 222 / 홀드 129',
  '📈 진행 — 두 가지',
  '  🏗 실제(터미널) 32대 / 351대 — 남은 319대',
  '  📱 앱 기록 0대 / 351대 — 남은 351대',
  '  ⚠ 32대는 실제로 작업했는데 앱에 안 찍혔습니다 (주간조 앱 미사용).',
  '     (터미널 피드 0분 전 갱신)',
  '🏗 주간조(14:20 시작~17:30·2갱) — 1번 갱(01~17) (16)17 데크→(12)13 데크(13/27대째) 약 40대(FR1) / 2번 갱(20~35) (34)35 데크→(30)31 데크(8/36대째) 약 40대',
  '"갱 배분"으로 상세 확인',
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
T(L.length === 13, `토막이 13개가 아니다(${L.length}) — 주의사항이 빠지면 검수사가 못 듣는다`);
//  ── 2.65-01: 라이브에서 뭉개졌던 세 줄 ──
T(/실제 터미널 32대 완료, 전체 351대/.test(all), '진행 줄의 「32대 / 351대」가 소리로 안 풀린다');
T(/주간조 14시 20분 시작, 17시 30분까지/.test(all), '조 시각을 안 풀어 읽는다(14:20 을 그대로 읽으면 못 알아듣는다)');
T(/1번 갱 1번에서 17번, 약 40대/.test(all) && !/데크\s*13\s*27대째/.test(all),
  '갱 줄의 도달점 괄호·화살표가 그대로 읽힌다 — 「16 17 데크 13 27대째」로 뭉개진다. 상세는 화면이다');
T(!/상세 확인/.test(all), '«갱 배분»으로 상세 확인 같은 유도 줄을 읽는다');
T(!/피드/.test(all), '터미널 피드 갱신 시각까지 읽는다 — 화면 것이다');
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
//  2.65-01 (검수사 교정): 앱이 원인을 짐작하면 안 된다 — «전근무자» 는 틀린 짐작이었다.
const nlSrc = fs.readFileSync(path.join(ROOT, 'src/nlSearch.js'), 'utf8');
T(/\$\{workingShiftName\(\)\} 앱 미사용/.test(nlSrc), '두 숫자 차이에 조 이름을 안 붙인다 — 검수사 확정 «주간조 앱 미사용»');
T(/export function workingShiftName/.test(fs.readFileSync(path.join(ROOT,'src/utils.js'),'utf8')), '조 이름 한 벌(workingShiftName)이 utils 에 없다');
T(!/function _currentShift\(nowMs\) \{\n  const d/.test(fs.readFileSync(path.join(ROOT,'src/chiefAnswers.js'),'utf8')), '조 경계가 두 벌이다 — chiefAnswers 가 제 것을 다시 갖고 있다');
T(!/L\.push\(`[^`]*전근무자/.test(nlSrc), '«전근무자 작업분 등» 짐작이 답으로 되살아났다 — 첫 조인 배에서 거짓말이 된다');
T(/주간조 앱 미사용/.test(all), '낭독에서 «주간조 앱 미사용» 이 빠졌다');

if (bad > 0) { console.error(`✗ 브리핑 낭독 연막검사 실패 ${bad}건`); process.exit(1); }
console.log(`✓ 브리핑 낭독 연막검사 통과 — 실측 브리핑 ${L.length}토막 · 낭독 규칙 12 · 배선 5`);
