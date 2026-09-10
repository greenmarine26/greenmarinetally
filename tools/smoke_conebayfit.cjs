// 콘앱 베이뷰 — 컨번호가 칸에 들어가고, 단추가 안 겹치고, 화면에 맞춰 열리는가(ConeOne 2.41).
//   치수는 브라우저 실측(Consolas 800)에서 나온 값이다 — 여기서는 그 값으로 다시 계산해 잰다.
const path = require('path');
const fs = require('fs');
const ROOT = process.argv[2] || path.resolve(__dirname, '..');
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };
console.log('콘앱 베이뷰 — 잘림·겹침·배율 (2.41)');
const rule0 = null; void rule0;

const H = fs.readFileSync(path.join(ROOT, 'public/cone.html'), 'utf8');
const rule = (sel) => (H.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{[^}]*\\}')) || [''])[0];
const num = (css, prop) => {
  const m = css.match(new RegExp(prop + '\\s*:\\s*(-?[\\d.]+)px'));
  return m ? parseFloat(m[1]) : null;
};

//  ① 컨번호가 칸 안에 들어가는가
//  ⚠ 한 줄이 **두 크기**다 — 앞 7자(`.bvc-cn`)와 끝 4자(`.bvc-cn4`). 한 크기로 재면 헛짚는다
//    (2.41 첫 판이 `.bvc-cn4` 11px 을 빼놓고 재서 «고쳤다»가 거짓이 됐다 — 감사가 실화면으로 잡았다).
//  ⚠ 자폭은 **안드로이드 기본 모노스페이스 0.60011em**(폰이 현장이다). Consolas 0.54981 은 더 좁다.
const ADV = 0.60011;
const cellR = rule('.bv-tab.box td');
const bvc = (H.match(/^\s*\.bvc\{[^}]*\}/m) || [''])[0];   // 줄 앞의 기본 규칙(밝기 변형 `:root[...] .bvc` 말고)
const cn = rule('.bvc-cn');
const cn4 = rule('.bvc-cn4');
const W = num(cellR, 'width');
const padX = (() => { const m = bvc.match(/padding\s*:\s*[\d.]+px\s+([\d.]+)px/); return m ? parseFloat(m[1]) : null; })();
const F = num(cn, 'font-size');
const F4 = num(cn4, 'font-size');
const TR = Math.abs(num(cn, 'letter-spacing') || 0);
const inner = W - padX * 2 - 2;                       // 좌우 여백 · 테두리 1px×2
const need = (7 * F + 4 * F4) * ADV - TR * 10;        // 앞 7자 + 끝 4자
ok(W === 58, `칸 폭이 58px 그대로다(실측 기준값) — 지금 ${W}`);
ok(F4 != null && F4 <= F, `끝 4자리가 앞자리보다 크지 않다 — 앞 ${F}px · 끝 ${F4}px (종전 11px 이 줄을 넘치게 한 진짜 원인이다)`);
ok(need <= inner, `컨번호 11자 ${need.toFixed(2)}px 가 가용 ${inner}px 안에 든다(안드로이드 자폭 기준)`);
ok((7 * F + 4 * 11) * ADV - TR * 10 > inner, '끝 4자리를 11px 로 되돌리면 넘친다 — 이 검사가 항등식이 아니다');
ok((7 * 9 + 4 * 11) * ADV - TR * 10 > inner, '2.40 그대로(9 + 11)면 넘친다 — 실화면 918칸이 전부 그랬다');
ok(padX != null && padX <= 2, `좌우 여백이 2px 이하다 — 지금 ${padX}px (가용을 48 → 52px 로 넓힌 자리다)`);
ok(/\.bvc-cn4\{[^}]*color/.test(H), '끝 4자리는 색으로 도드라진다 — 크기를 맞춰도 눈에 띄는 자리는 남는다');

//  ② TOP 과 전체화면 닫기가 안 겹치는가 — 좁은 폰 실측(360·320)
//  ⚠ `.bv-top` 은 규칙이 둘이다(기본 + 좁은 화면). **right 가 있는 쪽**이 기본이다.
const top = (H.match(/\.bv-top\{[^}]*right[^}]*\}/) || [''])[0];
const fsx = rule('.bv-fsx');
const tR = num(top, 'right'); const tW = num(top, 'width'); const tB = num(top, 'bottom');
const xL = num(fsx, 'left'); const xW = num(fsx, 'width'); const xB = num(fsx, 'bottom');
const mq = (H.match(/@media \(max-width:420px\)\{(?:[^{}]|\{[^}]*\})*\}/) || [''])[0];   // 블록 전체(안에 규칙이 여럿일 수 있다)
//  ★ 2.41-01 — **순서가 곧 승자다.** 미디어 쿼리도 덮어쓰기 규칙도 힘을 안 더하므로 기본 규칙 **뒤**에
//    있어야 이긴다. 2.41 은 둘 다 앞에 두어 라이브에서 아무 일도 안 일어났다 — 그것을 여기서 잰다.
const idxBase = H.search(/\.bv-top\{position:fixed/);
const idxMq = H.search(/@media \(max-width:420px\)\{ ?\.bv-top/);
const lastRule = (prop) => {
  let last = null;
  for (const m of H.matchAll(/\.bv-top\{[^}]*\}/g)) if (m[0].includes(prop)) last = m[0];
  return last || '';
};
const tB2 = num(mq, 'bottom');
for (const SW of [360, 320]) {
  const t1 = SW - tR - tW; const t2 = SW - tR;
  const xOver = !(t2 <= xL || t1 >= xL + xW);
  const yOver = !(tB2 == null ? false : (tB2 >= xB + 44));
  ok(xOver, `${SW}px 화면에서 두 단추가 가로로는 여전히 겹친다(TOP ${t1}~${t2} · 닫기 ${xL}~${xL + xW}) — 그래서 세로로 갈라야 한다`);
  ok(!yOver, `${SW}px 화면에서 TOP 을 위로 올려(bottom ${tB2}) 닫기(bottom ${xB} 높이 44)와 안 겹친다`);
}
ok(tB2 != null && tB2 > tB, `좁은 화면 규칙이 TOP 을 올린다 — 기본 ${tB}px → ${tB2}px`);
ok(idxBase >= 0 && idxMq > idxBase, '좁은 화면 규칙이 기본 규칙 **뒤**에 있다 — 앞에 두면 뒤의 bottom 이 이겨 아무 일도 안 일어난다');
ok(/z-index/.test(lastRule('z-index')) && lastRule('z-index').includes('position:fixed'),
  'z-index 를 마지막에 정하는 것이 기본 규칙이다 — 앞에 따로 덮어쓰면 죽는다(2.41 이 그랬다)');
ok(!/\.bv-fsx|\.mir-fab/.test(mq), '좁은 화면 규칙이 좌하단 줄·미르를 안 건드린다 — 검수사가 «언제든 쓸수 있어야 한다»고 정한 자리다');
//  전체화면에서 TOP 이 패널 밑에 깔려 있던 것(감사 실측 — z-index 40 < .bv-fs 60)
//  **마지막에 값을 정하는 규칙**을 본다 — 앞에 덮어써 봐야 뒤가 이긴다.
const zTop = parseInt((lastRule('z-index').match(/z-index\s*:\s*(\d+)/) || [])[1] || '0', 10);
const zFs = num(rule('.bv-fs'), 'z-index') || parseInt((rule('.bv-fs').match(/z-index:\s*(\d+)/) || [])[1] || '0', 10);
ok(zTop > zFs, `전체화면에서도 TOP 이 보인다 — TOP z ${zTop} > 전체화면 판 z ${zFs}`);
ok(!/display\s*:\s*none/.test(mq), '좁은 화면 규칙이 아무것도 숨기지 않는다 — 가리는 것이 문제였지 있는 것이 문제가 아니었다');

//  ③ 베이플랜이 화면에 맞춰 열리는가
ok(/zRange\.value=100; applyFit\(\); applyView\(\);/.test(H),
  '첫 화면도 applyFit 을 지난다 — 종전엔 늘 100% 라 열 많은 배는 매번 손으로 줄여야 했다');
ok(!/^\s*applyZoom\(100\);\s*$/m.test(H), '옛 «무조건 100%» 줄이 남아 있지 않다');
ok(/조용히 물러나므로/.test(H), '못 재면 종전대로 100% 라는 것을 적어 둔다(조용한 실패 금지)');

//  ④ 항구 코드 정규화가 검수앱과 한 벌인가
ok(/window\.ConeParse&&window\.ConeParse\.normPortCode/.test(H), 'short 가 번들의 normPortCode 를 지난다');
ok(/np\.length>=5 \? np\.slice\(2,5\) : np/.test(H), '정규화한 뒤에 세 글자로 줄인다 — 순서가 뒤바뀌면 뜻이 없다');
ok(/\? window\.ConeParse\.normPortCode\(p\)[\s\S]{0,40}: String\(p\|\|''\)\.toUpperCase\(\)/.test(H),
  '번들이 아직 안 실렸으면 종전 규칙으로 물러난다 — 조용히 죽지 않는다');
const entry = fs.readFileSync(path.join(ROOT, 'src/coneCargoPlan.entry.jsx'), 'utf8');
ok(/window\.ConeParse = \{[^}]*normPortCode/.test(entry), '번들이 normPortCode 를 내보낸다');
ok(/import \{[^}]*normPortCode[^}]*\} from '\.\/utils\.js'/.test(entry), '그 함수를 utils 에서 가져온다(사본을 만들지 않는다)');

//  ⑤ 판 올림
ok(/__CONEV='ConeOne 2\.48'/.test(H), '콘앱 판이 2.48 이다 — 화면 갱신 감지 기준');

console.log(fail ? `✗ ${fail}항 실패` : '✓ 전부 통과');
process.exit(fail ? 1 : 0);
