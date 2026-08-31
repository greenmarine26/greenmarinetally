// 카고플랜 칸 마크 동적 글자(2.89-08) 연막검사 — «셀수에 따라서 동적 크기 변환»(검수사 BUG-2026-002).
//   ①markFontPx 수식 불변량 ②배선(페이지 인라인 --mf · CSS 고정 선언 제거) ③작은 배 무변화.
const path = require('path');
const fs = require('fs');

(async () => {
  const C = await import(path.resolve('src/cargoPlanCore.js'));
  let fail = 0;
  const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fail++; };

  console.log('[1] 수식 불변량');
  ok(typeof C.markFontPx === 'function', 'markFontPx 가 코어(한 벌)에 있다');
  const f = C.markFontPx;
  //  작은 배(칸 넓음)는 종전 9.6 그대로 — 파급 0 이 정상이다.
  ok(f(9, 5) === 9.6, `작은 배(9칸·5박스) = 9.6 유지 (${f(9, 5)})`);
  ok(f(6, 4) === 9.6, `가장 좁은 배(6칸) = 9.6 유지 (${f(6, 4)})`);
  //  열이 늘거나 박스가 늘면 글자는 절대 커지지 않는다(단조 감소).
  let mono = true;
  for (let n = 2; n <= 12; n++) for (let g = 6; g < 20; g++) {
    if (f(g + 1, n) > f(g, n) || f(g, n + 1) > f(g, n)) { mono = false; break; }
  }
  ok(mono, '열 수·박스 수가 늘 때 글자가 커지는 일이 없다');
  //  경계: 어떤 입력에도 5 ≤ 값 ≤ 9.6, NaN 없음.
  let bound = true;
  for (const [g, n] of [[1, 1], [0, 0], [30, 15], [20, 10], [12, 8], [undefined, undefined]]) {
    const v = f(g, n);
    if (!(v >= 5 && v <= 9.6)) { bound = false; console.log('   경계 밖:', g, n, '→', v); }
  }
  ok(bound, '경계·비정상 입력에도 5~9.6 사이 값이 나온다(비면 폴백 9.6과 같은 급)');
  //  큰 배가 실제로 줄어드는가 — MCSC 급(12칸)·최악 급(19~20칸).
  ok(f(12, 8) < 9.6, `12칸·8박스는 9.6보다 작다 (${f(12, 8)})`);
  ok(f(19, 10) === 5, `최악(19칸·10박스)은 바닥 5 (${f(19, 10)})`);

  console.log('[2] 배선 — 값이 실제로 화면에 꽂히는가');
  const src = fs.readFileSync(path.resolve('src/components/PrintableCargoPlanV2.jsx'), 'utf8');
  ok(/markFontPx,/.test(src), 'PrintableCargoPlanV2 가 markFontPx 를 임포트한다');
  ok(/--mf.*markFont/.test(src) || /'--mf': `\$\{markFont\}px`/.test(src), '페이지 요소 인라인 --mf 에 계산값이 들어간다');
  ok(!/--mf: 9\.6px; \}/.test(src), 'CSS .cpv2-tier-row 의 고정 --mf 선언이 제거됐다(선언 두 곳이면 행 선언이 이긴다)');
  ok(/var\(--mf, 9\.6px\)/.test(src), '폴백 var(--mf, 9.6px) 은 남아 있다(페이지 래퍼 없는 화면 보호)');

  if (fail) { console.error(`✗ 카고플랜 글자 연막검사 ${fail}건 실패`); process.exit(1); }
  console.log('✓ 카고플랜 글자 연막검사 통과');
})().catch((e) => { console.error('✗ 카고플랜 글자 연막검사 자체가 죽었다:', e && e.message); process.exit(1); });
