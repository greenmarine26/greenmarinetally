// 별첨이 «최대 발생조건»에서도 안 넘치는가 — 검수사 «선사가 많거나 포트가 많거나 특수 화물이 많으면 겹칩이 일어납니다».
//   글자 크기는 표 줄 수로 정해지므로 계산으로 잴 수 있다. 실제 렌더 오차는 fitLegend.js 가 한 번 더 줄인다.
const fs = require('fs'), path = require('path');
const C = require(process.argv[2]);
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };

const H = 195 * 96 / 25.4, PAD = 4 * 96 / 25.4 * 2;
//  legendFontFor 와 같은 셈으로 «그 크기에서 실제로 들어가는가»를 되짚는다(식을 베끼지 않고 부피로 검산).
function fitsAt(f, rows, legends, pageRows) {
  const avail = (H - PAD - 30 - 26 - 3 * (pageRows - 1)) / pageRows - 10 - 5 * (legends - 1);
  const need = legends * (1.5 * f + 7) + rows * (1.6 * f + 1);
  return need <= avail;
}

ok(typeof C.legendFontFor === 'function', 'legendFontFor 를 내보낸다');
ok(Math.abs(C.CPV2_PAGE_H_PRINT - 737.0) < 1, `페이지 높이 상수 ${C.CPV2_PAGE_H_PRINT}`);

//  ① 줄이 늘어날수록 글자가 작아진다 — 종전 식은 줄 수를 아예 안 봤다.
const seq = [10, 16, 22, 30, 40].map((n) => C.legendFontFor(n, 3, 2));
ok(seq.every((v, i) => i === 0 || v <= seq[i - 1]), `줄이 늘면 글자가 줄어야 한다 (${seq})`);
ok(seq[0] > seq[3], `⛔ 줄 수가 크기에 안 들어간다 — 10줄 ${seq[0]} vs 30줄 ${seq[3]}`);

//  ② 사진 속 조건(포트 5 → 별첨1 7줄 · 별첨2 4줄 · 별첨3 5줄)에서 안 넘친다.
{
  const rows = 7 + 4 + 5, f = C.legendFontFor(rows, 3, 2);
  ok(fitsAt(f, rows, 3, 2), `⛔ 사진 속 조건(16줄)이 ${f}px 로도 넘친다`);
  ok(f < 9.5, `사진 속 조건은 9.5px 보다 작아야 한다 — 종전 고정 9.5 라 잘렸다 (${f})`);
}

//  ③ **최대 발생조건** — 상상이 아니라 실측이 기준이다.
//     2026-09-04 활성+보관 항차 전수 — 한 항차 목적지 최대 5(SWMM 2609S) · 선사 최대 10(XTPG 0526E) ·
//     화물 종류 최대 5(PCSZ 2623E) ⇒ 별첨1 12줄 + 별첨2 7줄 + 별첨3 5줄 = **24줄**.
//     여유 1.5배(36줄)까지 «읽을 수 있는 크기로» 들어가야 한다. 한 칸으로 모자라면 두 칸으로 나눈다.
{
  const READ = 5.5;   // 이보다 작으면 종이에서 못 읽는다
  let bad = [], tight = [];
  for (let first = 1; first <= 24; first++) {          // 별첨1 자료 줄(목적지/선사)
    for (const kinds of [1, 3, 5, 7]) {
      for (const pr of [1, 2]) {
        const r1 = first + 2, r2 = kinds + 2, r3 = 5, rows = r1 + r2 + r3;
        const two = C.legendTwoCols(r1, r2 + r3, pr);
        const f = two ? Math.min(C.legendFontFor(r1, 1, pr), C.legendFontFor(r2 + r3, 2, pr))
          : C.legendFontFor(rows, 3, pr);
        const fitsNow = two
          ? (fitsAt(f, r1, 1, pr) && fitsAt(f, r2 + r3, 2, pr))
          : fitsAt(f, rows, 3, pr);
        if (!fitsNow) bad.push(`별첨1 ${first}줄·종류${kinds}·${pr}줄(${two ? '두칸' : '한칸'})`);
        else if (f < READ) tight.push(`별첨1 ${first}줄·종류${kinds}(${f}px)`);
      }
    }
  }
  ok(bad.length === 0, `⛔ 넘치는 조건 ${bad.length}가지 — ${bad.slice(0, 3)}`);
  ok(tight.length === 0, `⛔ 못 읽을 만큼 작아지는 조건 ${tight.length}가지 — ${tight.slice(0, 3)}`);
  //  실측 최대(24줄)와 그 1.5배에서 실제로 어떻게 되는지 남긴다.
  for (const [f1, k] of [[12, 5], [18, 7], [24, 7]]) {
    const r1 = f1 + 2, rr = (k + 2) + 5;
    const two = C.legendTwoCols(r1, rr, 2);
    const f = two ? Math.min(C.legendFontFor(r1, 1, 2), C.legendFontFor(rr, 2, 2)) : C.legendFontFor(r1 + rr, 3, 2);
    console.log(`     별첨1 ${r1}줄 + 나머지 ${rr}줄 = ${r1 + rr}줄 → ${two ? '두 칸' : '한 칸'} · ${f}px`);
  }
}

//  ④ 하한·상한을 지킨다 — 아무리 많아도 4.6px 아래로는 안 간다(종이에서 못 읽는다).
ok(C.legendFontFor(999, 3, 2) === 4.6, `줄이 아주 많으면 하한 4.6px (${C.legendFontFor(999, 3, 2)})`);
ok(C.legendFontFor(1, 1, 2) === 9.5, `줄이 적으면 상한 9.5px (${C.legendFontFor(1, 1, 2)})`);
ok(C.legendFontFor(0, 0, 0) >= 4.6, '망가진 값에서도 크기를 준다');

//  ⑤ 자리를 나눠 담으면 한 상자가 지는 줄이 줄어 글자가 커진다 — 나누는 보람이 있어야 한다.
{
  const all = C.legendFontFor(33 + 9 + 5, 3, 2);
  const one = C.legendFontFor(33 + 2, 1, 2);
  ok(one > all, `나눠 담으면 커져야 한다 (셋같이 ${all} → 하나만 ${one})`);
}

//  ⑥ 안전망이 붙어 있는가 — 계산이 어긋나도 브라우저가 재서 한 번 더 줄인다.
const fl = fs.readFileSync(path.join(__dirname, '..', 'src', 'fitLegend.js'), 'utf8');
ok(/scrollHeight/.test(fl) && /clientHeight/.test(fl), '⛔ 실제 높이를 안 재고 있다');
ok(/console\.warn/.test(fl), '⛔ 하한까지 줄여도 넘치면 조용히 넘어간다 — 알려야 한다');
const pc = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'PrintableCargoPlanV2.jsx'), 'utf8');
ok(/useLayoutEffect\(\(\) => \{ fitLegendBoxes/.test(pc), '⛔ 그린 뒤 재는 안전망이 안 붙었다');
ok(/legendFontFor\(rows, items\.length, _pr\)/.test(pc), '⛔ 상자마다 제 줄수로 크기를 안 정한다');

console.log(fail ? `\n별첨 맞춤 연막검사 실패 ${fail}건` : '\n별첨 맞춤 연막검사 통과');
process.exit(fail ? 1 : 0);
