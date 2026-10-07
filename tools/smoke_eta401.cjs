// 4.01 예상 작업 시간 연막검사 — 실항차(ATPR 양하 EDI · DJCT 선적 예약 칸)로 무브·트윈·무게·속도 규칙을 실소스로 잰다.
//
//  왜 있는가 — 검수사 2026-10-04 06:40 «ATPR 양하 269인데 무브수가 269무브 맞습니까? 20피트가 150여개인데 트윈 작업이 안되는건가요?» ·
//  «트윈 가능 갯수와 싱글갯수가 정확히 파악해야 무브수가 계산 됩니다» · «무게도 확인해야 하고요» · 06:45 «싱글이 많다면 시간당 25개 계산이며
//  트윈이 어느정도 있다면 30개 계산하면 작업 시간이 나옵니다.» 처음 판은 대수를 그대로 무브로 불렀다 — 그 실수가 되돌아오지 않게 잰다.
//  기대값은 코드가 낸 값이 아니라 같은 실데이터를 앱의 트윈 판정(buildTwinPairs·analyzeTwinPairs: 합계 55t · PNCT 무게차 14t)으로
//  손으로 센 값이다(ATPR 20피트 153 → 앞뒤 짝 70쌍 = 트윈 39 · 55t 초과 27 · 무게차 초과 4 · 짝 없음 13).
//  사용: node tools/smoke_eta401.cjs <번들.cjs> <저장소 루트>
const fs = require('fs');
const path = require('path');
const BUNDLE = process.argv[2];
const ROOT = process.argv[3] || path.resolve(__dirname, '..');
if (!BUNDLE) { console.error('사용법: node tools/smoke_eta401.cjs <번들.cjs> [루트]'); process.exit(1); }
global.window = global.window || {};
global.document = global.document || { createElement: () => ({}) };
const M = require(path.resolve(BUNDLE));
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const fx = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8'));
let fail = 0;
const ok = (c, m, extra) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c || extra === undefined ? '' : '  → ' + extra)); if (!c) fail++; };
const NOW = Date.parse('2026-10-04T07:00:00+09:00');

console.log('① 속도 규칙 — 싱글 위주 25 · 트윈이 총 대수의 15% 이상이면 30');
ok(M.SINGLE_PER_GANG_HOUR === 25 && M.MOVES_PER_GANG_HOUR === 30 && M.TWIN_SHARE_MIN === 0.15, '상수 25 · 30 · 0.15');
ok(M.gangRateOf(0, 100) === 25 && M.gangRateOf(14, 100) === 25 && M.gangRateOf(15, 100) === 30 && M.gangRateOf(60, 100) === 30, '트윈 0·14% → 25, 15·60% → 30');
ok(M.gangRateOf(0, 0) === 25, '대수 0 이면 싱글 기본 25 (0 으로 나누지 않는다)');

console.log('② ATPR 양하 — 자리·무게가 다 있는 실데이터 269대');
const atpr = fx('eta401_atpr_real.json');
const A = M.expectedWorkTimeOf(atpr, M.shiftCnSetOf('ATPR_2644E', atpr), NOW);
ok(A && A.units === 269 && A.n20 === 153 && A.n40 === 116, '대수 269 = 20피트 153 + 40피트 116', A && `${A.units}/${A.n20}/${A.n40}`);
ok(A.posPairs === 70 && A.twinLifts === 39 && A.twinOver === 27 && A.twinDiff === 4, '앞뒤 짝 70쌍 = 트윈 39 · 55톤 초과 27 · 무게차 초과 4', `${A.posPairs}/${A.twinLifts}/${A.twinOver}/${A.twinDiff}`);
ok(A.singles === 191 && A.moves === 230, '한 대씩 191번 + 트윈 39번 = 230무브 (269 아님)', `${A.singles}/${A.moves}`);
ok(A.exact === true && A.unres20 === 0 && A.moves === A.movesMin, '자리·무게가 다 있어 확정 — 짝 없는 20피트 13대도 한 대씩으로 판정이 끝났다', `${A.exact}/${A.unres20}`);
ok(A.rate === 30 && Math.round(A.twinShare * 100) === 29, '트윈 컨 29% → 시간당 30무브', `${A.rate}/${A.twinShare}`);
ok(A.gangs === 2 && A.gangsKnown === false && A.minutes === 230 && A.minutes1 === 460, '갱 수 미등록 → 2갱 · 230무브 ÷ (2×30) = 230분(3시간 50분) · 1갱 460분', `${A.gangs}/${A.minutes}/${A.minutes1}`);
ok(M.workPaceOf(atpr, 'ATPR_2644E') === 30, '수석 답변 속도(workPaceOf)도 같은 30');
const a3 = JSON.parse(JSON.stringify(atpr)); a3.info.gangs = 3;
const A3 = M.expectedWorkTimeOf(a3, M.shiftCnSetOf('ATPR_2644E', a3), NOW);
ok(A3.gangs === 3 && A3.gangsKnown === true && A3.minutes === Math.round(230 / 90 * 60), '갱 수를 정해 두면(3갱) 그 수로 센다', `${A3.gangs}/${A3.minutes}`);
const ap = JSON.parse(JSON.stringify(atpr));   // 무게를 지우면 쌍을 판정 못 한다 — 트윈으로 치지 않고(한 대씩) 범위로 돌린다
Object.values(ap.discharge.ediContainers).forEach((c) => { c.wt = 0; });
const AP = M.expectedWorkTimeOf(ap, M.shiftCnSetOf('ATPR_2644E', ap), NOW);
ok(AP.twinLifts === 0 && AP.moves === 269 && AP.exact === false && AP.movesMin < 269, '무게가 없으면 트윈을 확정하지 않는다(한 대씩 269) · 범위로 낮은 쪽을 같이 준다', `${AP.twinLifts}/${AP.moves}/${AP.exact}/${AP.movesMin}`);

console.log('③ DJCT — 선적은 예약 칸만 있고 무게가 없다(20피트 128대 미확정)');
const djct = fx('eta401_djct_real.json');
const D = M.expectedWorkTimeOf(djct, M.shiftCnSetOf('DJCT_0225E', djct), NOW);
ok(D && D.units === 461 && D.dis === 185 && D.lod === 276, '대수 461 = 양하 185 + 선적 276', D && `${D.units}/${D.dis}/${D.lod}`);
ok(D.twinLifts === 0 && D.moves === 461 && D.exact === false, '확정 트윈 0 → 한 대씩 461무브(가장 오래 걸리는 쪽) · 범위', `${D.twinLifts}/${D.moves}/${D.exact}`);
ok(D.unres20 === 128 && D.twinMaybe === 57 && D.movesMin === 404, '못 정한 20피트 128대 · 예약 칸 앞뒤 짝 57쌍까지 트윈 가능 → 최소 404무브', `${D.unres20}/${D.twinMaybe}/${D.movesMin}`);
ok(D.rate === 25 && D.rateMin === 30, '느린 쪽은 확정 트윈이 없어 싱글 위주 25 · 빠른 쪽은 못 정한 20피트까지 트윈이 되면 30', `${D.rate}/${D.rateMin}`);
ok(D.minutes === Math.round(461 / 50 * 60) && D.minutesMin === Math.round(404 / (2 * D.rateMin) * 60), '시간 범위 — 오래 쪽 553분(9시간 13분) · 빠른 쪽은 최소 무브 ÷ (2×빠른 쪽 속도)', `${D.minutes}/${D.minutesMin}`);
ok(M.workPaceOf(djct, 'DJCT_0225E') === 25, '수석 답변 속도는 확정 쪽(싱글 25)');

console.log('④ 배선 — 화면·수석 답변·매뉴얼·색인·업데이트 문구');
const V = rd('src/pages/VoyagePage.jsx');
ok(/import ExpectedTimeLine from '..\/components\/ExpectedTimeLine\.jsx'/.test(V) && /tab === 'search' && <ExpectedTimeLine /.test(V), '작업 시작 탭 맨 위에 ExpectedTimeLine 이 붙었다');
const L = rd('src/components/ExpectedTimeLine.jsx');
ok(/E\.done >= 10/.test(L) && /E\.twinLifts/.test(L) && /E\.unres20/.test(L) && /E\.rate/.test(L), '줄이 트윈·못 정한 20피트·속도를 밝힌다 · 완료 10대 넘으면 사라진다');
const MR = rd('src/mir.js');
ok(/answerXrayShifts\(_voyE?, de, \{[^}]*pace: workPaceOf\(/.test(MR) && /answerShiftBriefing\(_voyE?, de, \{[^}]*pace: workPaceOf\(/.test(MR), '수석 답변 둘(X-RAY 조별·교대 브리핑)이 같은 속도 규칙을 받는다(4.02: 콘앱용 EDI 채운 사본 _voyE 도 같은 줄)');
const CA = rd('src/chiefAnswers.js');
ok((CA.match(/opts\.pace \|\| 25/g) || []).length === 2 && /\* pace \* 2/.test(CA) && !/\* 25 \* 2/.test(CA), '수석 답변은 속도를 opts.pace 로 받고 못 받으면 싱글 25');
const H = rd('src/data/helpData.js') + rd('src/data/featureIndex.js');
ok(/예상 작업 시간/.test(H) && /자료 대기/.test(H) && /트윈 쌍/.test(H) && /무브는 대수가 아니다/.test(H), '매뉴얼·색인이 예상 작업 시간·자료 대기·무브 ≠ 대수를 말한다');
const U = rd('src/utils.js');
ok(/APP_VERSION = 'TallyOne 4\.0[12345678](-\d\d)?'/.test(U), '버전 4.01~4.08 계열(-NN 포함)');
const note = (U.match(/APP_NOTE = '([^']*)'/) || [])[1] || '';
ok(/^4\.0[12345678]/.test(note) && !/[\/']/.test(note) && (note.match(/[.]/g) || []).length <= 3, 'APP_NOTE 는 4.01~4.08 · 작은따옴표와 슬래시가 없다 · 두 문장 안쪽', note);

console.log('⑤ 미르 «총 무브수» — 화면과 같은 무브로 답한다(대수를 무브라 부르지 않는다)');
//  검수사 2026-10-04 «총 무브수 계산에서 ATPR을 보면 양하가 269인데 무브수가 269무브 맞습니까?» — 독립 감사가 미르 답이 아직 269무브라고 잡았다.
const tmA = M.answerTotalMoves({ ...atpr, key: 'ATPR_2644E' }, 'ATPR', { eta: M.movesOfVoyage({ ...atpr, key: 'ATPR_2644E' }, 'ATPR_2644E') });
ok(/230무브/.test(tmA) && !/269무브/.test(tmA) && /269대/.test(tmA) && /트윈 39번\(78대\)/.test(tmA) && /한 대씩 191번/.test(tmA), 'ATPR — 미르 답이 230무브(대수 269대 · 트윈 39번 + 한 대씩 191번)', tmA);
const tmD = M.answerTotalMoves({ ...djct, key: 'DJCT_0225E' }, 'DJCT', { eta: M.movesOfVoyage({ ...djct, key: 'DJCT_0225E' }, 'DJCT_0225E') });
ok(/최대 461무브/.test(tmD) && /최소 404무브/.test(tmD) && /128대/.test(tmD), 'DJCT — 선적 예약 칸만 있어 최대 461 · 최소 404 범위로 답한다', tmD);
const tmN = M.answerTotalMoves({ ...atpr, key: 'ATPR_2644E' }, 'ATPR');
ok(/269대/.test(tmN) && !/269무브/.test(tmN) && /무브 아님/.test(tmN), '트윈 계산을 못 받으면(eta 없음) 대수로만 말하고 무브라 부르지 않는다 — 조용히 죽지 않는다', tmN);
const tmE = M.answerTotalMoves({ key: 'X', info: {} }, 'X', { eta: null });
ok(/EDI 가 아직 없어/.test(tmE), 'EDI 가 없으면 종전 안내 그대로');
ok(/isMoveQ\) return answerTotalMoves\(_voy, ship, \{ eta: movesOfVoyage\(_voy, c\.voyageKey \|\| '', _mvGiven\)/.test(MR) && !/app === 'cone' \? null : movesOfVoyage/.test(MR), '미르 호출부가 같은 한 벌(movesOfVoyage)을 넘긴다(4.02: 콘앱도 비켜 가지 않고 같은 계산 — 콘앱이 넘긴 컨 _mvGiven 으로)');
//  리스트만 있는 배(STSE 모양 — EDI 없음)는 화면이 숫자를 주니 미르도 «EDI 가 없다» 로 막지 않는다
const lst = JSON.parse(JSON.stringify(djct)); lst.key = 'DJCT_0225E'; delete lst.discharge.ediContainers; delete lst.loading.ediContainers;
const Lq = M.movesOfVoyage(lst, 'DJCT_0225E');
const tmL = M.answerTotalMoves(lst, 'DJCT', { eta: Lq });
ok(Lq && Lq.units > 0 && !/EDI 가 아직 없어/.test(tmL) && /무브/.test(tmL), '리스트만 있는 배는 EDI 없음 안내로 막지 않고 화면과 같은 무브로 답한다', tmL);
const tmL0 = M.answerTotalMoves(lst, 'DJCT');
ok(/EDI 가 아직 없어/.test(tmL0), 'eta 를 안 받으면 EDI 없음 안내 그대로(4.02: 콘앱은 이제 eta 를 받는다)', tmL0);
console.log(fail ? `\n✗ 4.01 예상 작업 시간 연막검사 실패 ${fail}건` : '\n✓ 4.01 예상 작업 시간 연막검사 통과');
process.exit(fail ? 1 : 0);
