// 카고플랜 컬러/흑백 인쇄 연막검사(3.73-02) — 실소스(PrintableCargoPlanV2.jsx)의 인쇄 CSS와 단추 배선을 읽어
//   ① 흑백 규칙이 전부 .cpv2-bw 안에만 있다(컬러 인쇄는 한 글자도 안 바뀐다) ② 칸·별첨 바탕을 흰색 important 로 내린다(인라인 style 을 이기려면 important 필수)
//   ③ ★ X-RAY 는 흑백에서도 빨강으로 남는다 ④ 도구줄 단추·상태·페이지 클래스 배선이 있다.
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../src/components/PrintableCargoPlanV2.jsx', 'utf8');
const fail = (m) => { console.log('✗ ' + m); process.exit(1); };
const m = src.match(/export const CARGO_V2_CSS = `([\s\S]*?)`;/);
if (!m) fail('CARGO_V2_CSS 를 못 찾았다');
const css = m[1];
const bwRules = css.split('\n').filter((l) => /\.cpv2-bw/.test(l) && /\{/.test(l));
if (bwRules.length < 5) fail('흑백 규칙이 너무 적다: ' + bwRules.length);
for (const l of bwRules) if (!/^\.cpv2-bw /.test(l.trim()) && !/^\.cpv2-bw\./.test(l.trim())) fail('.cpv2-bw 밖으로 새는 규칙: ' + l.trim().slice(0, 80));
console.log(`  ① 흑백 규칙 ${bwRules.length}줄 전부 .cpv2-bw 범위 ✔`);
const cell = bwRules.find((l) => /\.cpv2-cell:not\(\.cpv2-through\):not\(\.cpv2-shadow20\)\s*\{/.test(l));
if (!cell || !/background:\s*#fff\s*!important/.test(cell) || !/color:\s*#000\s*!important/.test(cell)) fail('칸 바탕·글자 흑백 규칙이 없다/important 가 아니다');
const leg = bwRules.find((l) => /cpv2-legend-mark/.test(l));
if (!leg || !/background:\s*#fff\s*!important/.test(leg)) fail('별첨 바탕 흑백 규칙이 없다');
console.log('  ② 칸·별첨 바탕 = 흰색 important ✔');
const xr = bwRules.find((l) => /cpv2-xray::after/.test(l));
if (!xr || !/color:\s*#dc2626\s*!important/.test(xr)) fail('흑백에서 ★ X-RAY 빨강 규칙이 없다');
if (bwRules.some((l) => /cpv2-xray/.test(l) && /(display\s*:\s*none|content\s*:\s*none)/.test(l))) fail('흑백이 ★ 를 지운다');
if (!/\.cpv2-cell\.cpv2-xray::after \{[^}]*color: #dc2626/.test(css)) fail('컬러 쪽 ★ 빨강이 바뀌었다');
console.log('  ③ ★ X-RAY — 컬러·흑백 둘 다 빨강(#dc2626) ✔');
if (!/localStorage\.getItem\('cpv2_bw'\)/.test(src) || !/onClick=\{toggleBw\}/.test(src) || !/\$\{bw \? ' cpv2-bw' : ''\}/.test(src)) fail('단추·상태·페이지 클래스 배선이 빠졌다');
if (!/'◐ 흑백'/.test(src) || !/'● 컬러'/.test(src)) fail('단추 글자가 없다');
console.log('  ④ 도구줄 «● 컬러/◐ 흑백» 단추 · 상태 기억 · 페이지 클래스 배선 ✔');
console.log('연막검사(카고플랜 컬러/흑백) 통과');
