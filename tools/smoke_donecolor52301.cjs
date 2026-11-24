// 5.23-01 연막검사 — 베이플랜 완료 칸이 선적 목적지 엷은 바탕과 한눈에 갈리는지(명도 차이)를 소스에서 잰다.
//   검수사 2026-11-24 10:59 «기본색과 선적완료색이 비슷하여 작은화면에서 구분하기 힘듬»(XTPG 550E 하이퐁 #d7f4c2 대 완료 #d1fae5).
//   실행 — node tools/smoke_donecolor52301.cjs <repoRoot>.
const fs = require('fs'); const path = require('path');
const root = process.argv[2] || process.cwd();
let bad = 0, n = 0;
const ok = (c, m, d = '') => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m + (c || !d ? '' : ' — ' + String(d).slice(0, 300))); if (!c) bad++; };
const lum = (hex) => { const v = parseInt(hex.replace('#', ''), 16); return 0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255); };
const bp = fs.readFileSync(path.join(root, 'src/components/BayPlan.jsx'), 'utf8');
const ut = fs.readFileSync(path.join(root, 'src/utils.js'), 'utf8');
const doneLines = bp.split('\n').filter((l) => /compMap && compMap\[c\.cn\]\) return '/.test(l));
ok(doneLines.length === 2, '완료 칠 자리 두 곳(일반·X-RAY)', doneLines.length);
ok(doneLines.every((l) => /'bg-emerald-500 /.test(l) && !/emerald-100/.test(l)), '완료 칸은 진한 초록(emerald-500) — 연초록(emerald-100) 아님', doneLines.join(' | '));
ok(/<Legend color="bg-emerald-500" label="✔ 완료"\/>/.test(bp), '범례 «✔ 완료» 도 같은 색');
const DONE = '#10b981';   // tailwind emerald-500
const m = /export const POD_BG = \{([\s\S]*?)\n\};/.exec(ut);
ok(!!m, 'POD_BG 표를 찾았다');
const pods = m ? [...m[1].matchAll(/([A-Z]{3}): '(#[0-9a-f]{6})'/gi)].map((x) => [x[1], x[2]]) : [];
ok(pods.length >= 30, `목적지 색 ${pods.length}개`, pods.length);
const worst = pods.map(([k, h]) => [k, h, Math.abs(lum(h) - lum(DONE))]).sort((a, b) => a[2] - b[2])[0] || [];
ok(worst[2] >= 60, `완료(명도 ${lum(DONE).toFixed(0)}) 와 가장 가까운 목적지 ${worst[0]} ${worst[1]} 명도 차 ${worst[2] && worst[2].toFixed(0)} ≥ 60`, JSON.stringify(worst));
const hph = pods.find((p) => p[0] === 'HPH');
ok(hph && Math.abs(lum(hph[1]) - lum(DONE)) >= 80, '사진의 하이퐁(#d7f4c2)과 완료는 명도 차 80 이상', hph && Math.abs(lum(hph[1]) - lum(DONE)).toFixed(0));
ok(Math.abs(lum('#111111') - lum(DONE)) >= 90, '완료 칸 글자(#111)가 읽힌다(명도 차 90 이상)');
console.log(`5.23-01 완료 칸 색 연막검사 — ${n - bad}/${n} 통과`);
process.exit(bad ? 1 : 0);
