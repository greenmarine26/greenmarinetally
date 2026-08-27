// 2.64 작업 타임라인 연막검사 — 축 수식(tlPos)과 배선(LoginPage·App)이 서 있는가.
const path = require('path');
const fs = require('fs');
const TL = require(path.resolve(process.argv[2]));
const ROOT = process.argv[3] || process.cwd();
let bad = 0; const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };
const day0 = new Date(2026, 7, 27).getTime();
T(TL.tlPos(day0, day0) === 0, 'tlPos 시작점이 0 이 아니다');
T(Math.abs(TL.tlPos(day0 + 12 * 3600000, day0) - 25) < 0.01, 'tlPos 오늘 정오가 25% 가 아니다 (48h 축)');
T(Math.abs(TL.tlPos(day0 + 45 * 3600000, day0) - 93.75) < 0.01, 'tlPos 내일 21시가 93.75% 가 아니다');
T(TL.tlPos(day0 + 60 * 3600000, day0) === 100 && TL.tlPos(day0 - 3600000, day0) === 0, 'tlPos 범위 clamp 가 죽었다');
T(TL.tlPos(null, day0) === null, 'tlPos 빈 값 처리가 죽었다');
const lp = fs.readFileSync(path.join(ROOT, 'src/pages/LoginPage.jsx'), 'utf8');
T(/WorkTimeline ships=\{board\.ships\} pilotForecast=\{pilotForecast\}/.test(lp) && /lg:col-span-2/.test(lp), 'LoginPage 타임라인 배선이 없다');
T(/pilotForecast = \{\}/.test(lp.split('\n').find((l) => l.includes('export default function LoginPage')) || ''), 'LoginPage 가 pilotForecast prop 을 안 받는다');
const app = fs.readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');
T(/<LoginPage\n\s*pilotForecast=\{pilotForecast\}/.test(app), 'App 이 LoginPage 에 pilotForecast 를 안 넘긴다 — 도선 마커가 조용히 죽는다');
//  2.64-01 «맞춤처럼 한화면에» — PC 로그인은 겉이 구르지 않는다. 이 배선이 하나라도 빠지면 페이지 스크롤이 돌아온다.
T(/lg:h-screen[\s\S]{0,80}lg:overflow-hidden/.test(app), 'App 로그인 껍데기가 화면 높이에 안 묶였다 — 페이지 스크롤 재발');
T(/lg:shrink-0/.test(app.split('\n').filter((l) => l.includes('footer'))[0] || ''), '푸터가 안 줄어든다 — 한 화면 밖으로 밀린다');
T(/lg:grid-rows-\[minmax\(0,1fr\)_auto\]/.test(lp), '로그인 격자가 위 1fr · 아래 자동 이 아니다');
T(/lg:flex-1[\s\S]{0,120}lg:overflow-hidden/.test(lp), '로그인 본체가 남는 높이를 안 먹거나 넘침을 안 막는다');
T((lp.match(/lg:overflow-y-auto/g) || []).length >= 2, '두 판(현황판·로그인)이 안에서 구르지 않는다 — 짧은 화면에서 잘린다');
//  2.64-02 — 좌측 현황판은 실측 552px 였다. 한 화면(짧은 노트북 650px)에 들어가려면 이 눌러 앉힘이 유지돼야 한다.
T(/grid grid-cols-3 gap-1\.5/.test(lp), '선박 칸이 3단이 아니다 — 5척이 세 줄로 늘어 한 화면을 넘는다');
T(/lg:flex-1 lg:min-h-0 lg:min-h-\[86px\] lg:px-0/.test(lp), '검수사 목록이 남는 높이를 안 먹는다 — 사람이 늘면 로그인 판이 화면을 넘는다');
T(!/text-4xl font-black/.test(lp) && !/rounded-btn p-3\.5/.test(lp), '현황판 글자·여백이 옛 큰 값으로 되돌아갔다');
T(/lg:shadow-none lg:flex-1 lg:min-h-0/.test(lp), '로그인 판 본체가 남는 높이를 안 먹는다 — 판이 화면 밖으로 넘친다(2.64-03 실측)');
T(!/lg:items-start/.test(lp), 'lg:items-start 가 남아 있다 — 판이 화면 높이로 안 늘어난다');
const tl = fs.readFileSync(path.join(ROOT, 'src/components/WorkTimeline.jsx'), 'utf8');
//  2.67 (검수사): 시작점만 찍으면 «이미 끝난 것처럼» 보인다 — 배정 시작~끝을 막대로 깐다.
T(/const span = sp\.msEnd \? tlPos\(sp\.msEnd, day0\)/.test(tl), '타임라인이 작업 끝 시각을 안 본다 — 구간이 안 그려진다');
T(/width: Math\.max\(0\.4, span - start\)/.test(tl), '작업 구간 막대가 없다');
T(/voyagePlanEndMs/.test(fs.readFileSync(path.join(ROOT, 'src/pages/LoginPage.jsx'), 'utf8')), '로그인 화면이 끝 시각을 안 실어 준다');
T(/const ROW_H = 22;/.test(tl), '타임라인 칸 높이가 22 가 아니다 — 한 화면 계산이 어긋난다');

if (bad > 0) { console.error(`✗ 타임라인 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 타임라인 연막검사 통과 — 축 수식 5 · 배선 3 · 한 화면 맞춤 10 · 작업 구간 3');
