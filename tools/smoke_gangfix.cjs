// 2.68 항차별 갱 수 연막검사 — 근무배정으로 정해진 갱 수를 앱이 기억하는가.
//   검수사 확정 2026-08-27: «SWTD 갱배분은 3갱으로 하시면 편할듯 합니다» (기본 2갱을 매번 «3갱이면»으로 덮어야 했다)
const path = require('path');
const fs = require('fs');
const NL = require(path.resolve(process.argv[2]));
const ROOT = process.argv[3] || process.cwd();
let bad = 0; const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };

//  ── 말로 기억시키기 ──
const P = (q) => NL.parseNaturalQuery(q);
T(P('3갱으로 기억해').gangSet?.n === 3, '«3갱으로 기억해» 를 못 알아듣는다');
T(P('SWTD 3갱으로 해').gangSet?.n === 3, '«3갱으로 해» 를 못 알아듣는다');
T(P('이 배 3갱이야').gangSet?.n === 3, '«이 배 3갱이야» 를 못 알아듣는다');
T(P('2갱으로 기억').gangSet?.n === 2, '2갱으로 되돌리는 말을 못 알아듣는다');
T(!P('갱 배분').gangSet && !P('3갱이면').gangSet, '단순 질문(«갱 배분»·«3갱이면»)까지 저장 명령으로 본다 — 물어만 봐도 바뀐다');
T(!!P('3갱으로 기억해').gangQuery, '저장 뒤 계산을 안 보여준다 — 바뀐 걸 눈으로 확인할 수 없다');
T(!P('한 갱만 남았어').gangSet, '엉뚱한 문장을 저장 명령으로 본다');

//  ── 저장·반영 배선 ──
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
T(/export async function fbSetVoyageGangs/.test(rd('src/firebase.js')), '갱 수 저장 함수가 없다');
T(/gangs: g, gangsAt: Date\.now\(\), gangsBy/.test(rd('src/firebase.js')), '누가·언제 정했는지 안 남긴다');
T(/const _gn = opts\.nGangs \|\| _gShift \|\| _gBase \|\| 0;/.test(rd('src/chiefAnswers.js')),
  '계산이 «말한 수 → 이 조 → 이 항차» 순서를 안 본다 — 기억시켜도 안 쓰인다');
T(/fixed: !opts\.nGangs && \(_gShift > 0 \|\| _gBase > 0\)/.test(rd('src/chiefAnswers.js')), '정해 둔 값인지 표시가 없다');
T(/이 항차는 \$\{gs\.nGangs\}갱으로 정해 두셨어요/.test(rd('src/chiefAnswers.js')), '어디서 온 수인지 안 밝힌다');
//  세 화면이 같은 한 벌 — 작업 시작 탭·양하 탭·LOLO 탭
const vp = rd('src/pages/VoyagePage.jsx');
T((vp.match(/fbSetVoyageGangs\(voyageKey, g\.n, inspector/g) || []).length === 2, '양하·LOLO 탭 중 한 곳이 저장을 안 한다');
T(/fbSetVoyageGangs\(voyageKey, g\.n, inspector/.test(rd('src/components/SearchPanel.jsx')), '작업 시작 탭이 저장을 안 한다');
T(!/const gangSetRef[\s\S]{0,400}const _sideCanc/.test(vp), '저장 훅이 VoyagePage 안에 있다 — ask 가 없어 화면이 죽는다(2.50-01 함정)');
//  ── 2.69 (검수사 «야간은 3갱인데 내일 주간은 2갱이면»): 갱 수는 **조마다** 정해진다 ──
const U = require(path.resolve(process.argv[4]));
const night = U.currentShift(new Date(2026, 7, 27, 21, 30).getTime());
T(U.shiftGangKey(night) === '08-27 야간', '조 키가 「MM-DD 야간」 이 아니다');
T(U.shiftGangKey(U.currentShift(new Date(2026, 7, 28, 2, 10).getTime())) === '08-27 야간',
  '자정을 넘긴 야간조가 다음 날 조로 잡힌다 — 8/27 야간은 새벽 2시에도 8/27 야간이다');
T(U.gangKeyFromWords(1, '주간', new Date(2026, 7, 27, 21, 30).getTime()) === '08-28 주간', '«내일 주간» 을 조 키로 못 옮긴다');
T(U.gangKeyFromWords(null, '주간', new Date(2026, 7, 27, 21, 30).getTime()) === '08-28 주간',
  '야간 근무 중 «주간» 이라고만 하면 다음 주간을 가리켜야 한다');
T(U.gangKeyFromWords(null, null) === '', '조를 안 대면 항차 기본값이어야 한다');
T(P('내일 주간 2갱으로 기억해').gangSet?.shift === '주간' && P('내일 주간 2갱으로 기억해').gangSet?.dayOff === 1,
  '«내일 주간 2갱으로 기억해» 에서 조를 못 읽는다');
T(/gangsShift\/\$\{shiftKey\}/.test(rd('src/firebase.js')), '조별 저장 경로가 없다');
T(/Number\(voyage\?\.info\?\.gangsShift\?\.\[_gKey\]\)/.test(rd('src/chiefAnswers.js')), '계산이 조별 지정을 안 본다');

//  ── 2.69-01 (검수사 «갱지정을 안하면 되묻고, 지정을 해서 물어 보면 계산된 답») ──
T(P('내 작업량').gangQuery, '«내 작업량» 을 갱 질문으로 안 본다');
T(P('2갱 갱배분').gangQuery?.n === 2, '«2갱 갱배분» 에서 갱 수를 못 읽는다');
T(P('2갱인데 내 작업량').gangQuery?.n === 2, '«2갱인데 내 작업량» 에서 갱 수를 못 읽는다');
T(P('갱 배분').gangQuery && P('갱 배분').gangQuery.n == null, '«갱 배분» 만 물었는데 수가 붙는다 — 되물어야 한다');
const ca = rd('src/chiefAnswers.js');
T(/if \(!_gn\) return \{ askGangs: true/.test(ca), '갱 수를 모르는데 2갱으로 가정한다 — 되물어야 한다');
T(/몇 갱으로 작업하십니까/.test(ca), '되묻는 문구가 없다 — 침묵하면 안 된다');
T(/gs\.askGangs\) return \[/.test(ca), '브리핑 줄이 모르는 갱 수로 숫자를 지어낸다');

//  2.69 (검수사 실측): 현장에서 X-RAY 씰을 «관리 씰» 이라고 부른다 — 그 말도 알아듣는다.
T(P('관리씰').type === 'xray' && P('관리 씰 어디').type === 'xray', '«관리씰» 을 X-RAY 로 못 알아듣는다');
T(P('인원 관리').type !== 'xray' && P('관리자 누구').type !== 'xray', '«관리» 한 낱말까지 X-RAY 로 먹는다');

//  2.70-01: 호출부가 «|| 2» 로 못 박으면 기억·되묻기가 통째로 죽는다(라이브에서 그랬다).
for (const f of ['src/pages/VoyagePage.jsx', 'src/components/SearchPanel.jsx', 'src/pages/GlobalSearchPage.jsx']) {
  T(!/nGangs: [^,]*\|\| 2\b/.test(rd(f)), `${f} 가 갱 수를 2로 못 박는다 — 기억시킨 값도 되묻기도 안 먹는다`);
}
T(/gs\.askGangs \|\| !Array\.isArray\(gs\.strip\)/.test(rd('src/components/GangStrip.jsx')), '되묻는 상태에서 그림이 터질 수 있다');

if (bad > 0) { console.error(`✗ 갱 수 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 갱 수 연막검사 통과 — 말 7 · 저장·반영 7 · 조별 8 · 되묻기 6 · 관리씰 2 · 호출부 4');
