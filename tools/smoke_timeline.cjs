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
if (bad > 0) { console.error(`✗ 타임라인 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 타임라인 연막검사 통과 — 축 수식 5 · 배선 3');
