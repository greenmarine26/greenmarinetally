// 2.66 전량 캔슬 연막검사 — 배정목록이 「그 쪽 0」이라고 말하면 앱도 0으로 센다.
//   실측: PCSZ 2626W(2026-08-27) 전량 캔슬인데 캔슬 통보 메일에 붙어 온 리스트를 수집기가 먹어
//   선적 63대를 브리핑하고 로그인 카드 배지(20FT 46 중 28·MTY 1·리퍼 1)까지 그 허수였다.
const path = require('path');
const fs = require('fs');
const U = require(path.resolve(process.argv[2]));      // utils 번들
const NL = require(path.resolve(process.argv[3]));     // nlSearch 번들
const ROOT = process.argv[4] || process.cwd();
let bad = 0; const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };

//  ── 판정 (실측 값 그대로) ──
const pcsz = { planDis: 351, planLod: 0 };
const tw = { disPlan: 351, disDone: 120, lodPlan: 0, lodDone: 0 };
T(U.sideCancelled(pcsz, 'loading', tw) === true, 'PCSZ 선적(배정 0·터미널 0)을 캔슬로 안 본다');
T(U.sideCancelled(pcsz, 'discharge', tw) === false, '양하 351대를 캔슬로 본다 — 오늘 일을 지운다');
T(U.sideCancelled({ planDis: 918 }, 'loading', null) === false, '배정 수량이 **없는**(미상) 쪽을 캔슬로 본다 — 자료 미도착과 캔슬은 다르다');
T(U.sideCancelled({ planLod: 0 }, 'loading', { lodPlan: 120 }) === false, '터미널이 선적 120대를 보고 있는데 캔슬로 본다');
T(U.sideCancelled({ planLod: 0 }, 'loading', { lodPlan: 0, lodDone: 30 }) === false, '이미 30대 실었는데 캔슬로 본다');
T(U.sideCancelled({ planLod: '0' }, 'loading', null) === true, '문자 «0» 을 못 알아본다(수집기가 문자로 넣을 수 있다)');
T(U.sideCancelled({ planLod: 185 }, 'loading', null) === false, '선적 185대를 캔슬로 본다');

//  ── 브리핑 (캔슬이면 허수를 세지 않는다) ──
const list = [{ cn: 'A', pol: 'KRPTK', pod: 'CNSHA', iso: '22G1', fe: 'F' }, { cn: 'B', pol: 'KRPTK', pod: 'CNSHA', iso: '45R1', fe: 'F', rf: true }];
const cut = NL.generateBriefing(list, '선적', 'loading', null, 'PCTC', { cancelled: true });
T(/선적 없음/.test(cut) && /배정목록 선적 0대/.test(cut), '캔슬 브리핑이 «선적 없음 — 배정목록 0» 으로 안 선다');
T(/받은 리스트 2대/.test(cut), '받은 리스트 수를 안 밝힌다 — 자료가 왜 보이는지 검수사가 모른다');
T(!/주의 \d건/.test(cut) && !/리퍼 1대/.test(cut), '캔슬인데 주의사항(리퍼 등)을 그대로 브리핑한다');
const normal = NL.generateBriefing(list, '선적', 'loading', null, 'PCTC', {});
T(/선적 평택 2대/.test(normal), '캔슬이 아닌 배까지 «없음» 으로 만든다 — 회귀');

//  ── 배선 (한 곳이라도 빠지면 그 화면만 허수를 센다) ──
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
T(/_cancL = sideCancelled/.test(rd('src/pages/LoginPage.jsx')), '로그인 카드 배지가 캔슬분을 그대로 센다');
for (const f of ['src/components/SearchPanel.jsx', 'src/pages/VoyagePage.jsx', 'src/pages/GlobalSearchPage.jsx']) {
  T(/cancelled: sideCancelled\(/.test(rd(f)), `${f} 브리핑이 캔슬을 모른다 — 화면마다 답이 갈린다`);
}
T(/if \(sideCancelled\(voyage\?\.info, mode, opts\.tw\)\) continue;/.test(rd('src/chiefAnswers.js')), '갱 배분이 캔슬된 쪽을 나눠 준다');
T(/buildGangPlan\(voyage, bayDef, \{ tw: opts\.tw \}\)/.test(rd('src/chiefAnswers.js')), '갱 배분이 터미널 실황을 안 넘긴다 — 캔슬 판정이 배정목록만 본다');
//  2.66-01 (검수사): 캔슬이면 그 쪽 화면은 **전부 지우고** 캔슬 한 장만 — 밑에 허수(선적평택 81·예상EDI 80·터미널 0)를 남기지 않는다.
const vpg = rd('src/pages/VoyagePage.jsx');
T(/이번 항차 \{mode === 'discharge' \? '양하' : '선적'\} 전량 캔슬/.test(vpg), '항차 화면에 «이번 항차 전량 캔슬» 표시가 없다');
T((vpg.match(/\{!_sideCanc && tab === /g) || []).length >= 9, '캔슬인데 탭 본문(목록·검증·베이·통계…)이 그대로 뜬다');
T(/\{!_sideCanc && <VoyageSummaryCard/.test(vpg), '캔슬인데 현황 요약(선적평택 81·예상EDI 80…)이 그대로 뜬다');
T(/sideCancelled\(v\.info, mode,/.test(rd('src/pages/GlobalSearchPage.jsx')),
  '통합검색이 캔슬분을 그대로 검색한다 — 그 컨은 다른 배에 실리므로 끝 4자리 조회에 두 배가 걸린다');

//  2.67-01 (검수사 «저걸로 인해 선적카드를 눌러보게 됩니다. 그후에야 캔슬사실을 알게 되죠»):
//    홈 항차 카드에서도 숫자를 지우고 캔슬 한 줄만 — 누르기 **전에** 알아야 한다.
const hp = rd('src/pages/HomePage.jsx');
T(/function CancelledSide/.test(hp) && /전량 캔슬/.test(hp), '홈 항차 카드에 캔슬 줄이 없다');
T(/sideCancelled\(voyage\.info, 'loading', _tw0\)/.test(hp), '홈 카드가 선적 캔슬을 모른다 — «선적평택 81·예상EDI 80» 이 그대로 뜬다');
T(/sideCancelled\(voyage\.info, 'discharge', _tw0\)/.test(hp), '홈 카드가 양하 캔슬을 모른다');

if (bad > 0) { console.error(`✗ 전량 캔슬 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 전량 캔슬 연막검사 통과 — 판정 7 · 브리핑 4 · 배선 12');
