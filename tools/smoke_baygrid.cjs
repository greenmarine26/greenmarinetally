// 베이 격자 한 벌 연막검사 — «자료만 받고 그림은 베이매트릭스대로» (검수사 확정 2026-08-26)
//
// 왜 있는가.
//   베이플랜·베이상세·콘앱이 격자를 제 벌로 계산하다가 짝 박스 (EE)OO 에서 entry 를 짝수 키로
//   찾아(매트릭스는 홀수 키 저장) 폴백 격자를 그렸다 — SWTD 9012E 실측: CASP 는 32·33·34 단독인데
//   앱 베이상세는 (32)33, 카고플랜 7칸 베이가 베이상세는 9칸.
//   2.56 부터 격자는 cargoPlanCore.buildBayGrid, 짝은 buildBayPagesFromSummary 한 벌이다.
//
// 무엇을 재는가.
//   ① 실사전 39척 전 베이: buildBayGrid ≡ computeBayRenderData(카고플랜) — 구조 필드와
//      셀 격자(active·rowLbl·blocked)가 글자 그대로 같은가. 한 벌만 고치면 여기서 선다.
//   ② 페이지(짝) 목록: 어떤 배도 베이가 두 번 쓰이지 않는다 + SWTD = CASP 도면(검수사 제공 실물).
//   ③ 소비 화면 소스에 옛 벌이 남지 않았는가 — 세 파일 모두 buildBayGrid·buildBayPagesFromSummary 를
//      부르고, 짝수 키 조회·자체 짝 루프가 없는가.
//
// 사용: node tools/smoke_baygrid.cjs <cargoPlanCore 번들.cjs> <저장소 루트>
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
console.warn = () => {};   // 합성 픽스처의 좌표 충돌 경고 소음 차단 (검사 판정과 무관)
const CP = require(path.resolve(OUT));

let bad = 0;
const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };

for (const fn of ['buildBayGrid', 'buildBayPagesFromSummary', 'computeBayGridSpec', 'assembleBayRows', 'computeBayRenderData', 'summaryToMatrixBays']) {
  if (typeof CP[fn] !== 'function') { console.error(`✗ ${fn} 가 없다`); process.exit(1); }
}

const dicts = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/baygrid_dicts.json'), 'utf8'));

// ── ① 격자 한 벌 = 카고플랜 (실사전 39척 × 전 베이) ─────────────────────
{
  let ships = 0, keys = 0;
  for (const [code, fx] of Object.entries(dicts)) {
    const bayDef = { ...fx.bayDef, source: fx.source, _userOwned: fx._userOwned, code };
    const pages = CP.buildBayPagesFromSummary(bayDef);
    if (!pages || pages.length === 0) { T(false, `${code}: 페이지 0`); continue; }
    ships++;

    // ② 어떤 배도 베이가 두 번 쓰이지 않는다
    const seen = new Set();
    for (const p of pages) for (const n of [p.even, p.odd]) {
      if (n == null) continue;
      T(!seen.has(n), `⛔ ${code}: 베이 ${n} 이 두 번 쓰였다`);
      seen.add(n);
    }

    // ① buildBayGrid ≡ computeBayRenderData — 같은 파생 입력으로 대조
    const mb = CP.summaryToMatrixBays(bayDef);
    const { trios, singles } = CP.autoPairBays(mb);
    const pdfBays = CP.generatePdfBays(mb, trios, singles);
    for (const p of pages) {
      keys++;
      const g = CP.buildBayGrid(bayDef, p.bayKey);
      const r = CP.computeBayRenderData(p.bayKey, pdfBays, mb, new Map(), 'KRPTK', CP.defaultGetSelfMark, {}, () => null, () => false, bayDef, code, {});
      if (!g || !r) { T(false, `⛔ ${code} ${p.bayKey}: grid=${!!g} core=${!!r}`); continue; }
      for (const f of ['deckRowPos', 'holdRowPos', 'deckTiers', 'holdTiers', 'nDeckCols', 'nHoldCols', 'hatchCount', 'hasZero', 'deckAlign', 'holdAlign']) {
        T(JSON.stringify(g[f]) === JSON.stringify(r[f]), `⛔ ${code} ${p.bayKey}: ${f} 다름 — 격자 ${JSON.stringify(g[f])} vs 카고플랜 ${JSON.stringify(r[f])}`);
      }
      const rows = (rr) => rr.map(t => ({ tier: t.tier, iv: t.invisible, c: t.cells.map(c => [c.active ? 1 : 0, c.rowLbl || '', c.blocked ? 1 : 0]) }));
      T(JSON.stringify(rows(g.deckRows)) === JSON.stringify(rows(r.deckRows)), `⛔ ${code} ${p.bayKey}: deckRows 격자 다름`);
      T(JSON.stringify(rows(g.holdRows)) === JSON.stringify(rows(r.holdRows)), `⛔ ${code} ${p.bayKey}: holdRows 격자 다름`);
    }
  }
  T(ships >= 39, `⛔ 대조한 배가 ${ships}척뿐이다 (39척 기대) — 픽스처 확인`);
  console.log(`  · 격자 한 벌 대조: ${ships}척 ${keys}베이키`);
}

// ── ② SWTD = CASP 도면 (검수사 제공 실물 2026-08-26, SWTD9012EBAY.pdf 19장) ──
{
  const fx = dicts.SWTD;
  T(!!fx, '⛔ SWTD 픽스처가 없다');
  if (fx) {
    const bayDef = { ...fx.bayDef, source: fx.source, _userOwned: fx._userOwned, code: 'SWTD' };
    const got = CP.buildBayPagesFromSummary(bayDef).map(p => p.bayKey).join(' ');
    const want = '01 (02)03 05 (06)07 09 (10)11 13 (14)15 17 (18)19 21 (22)23 25 (26)27 29 (30)31 32 33 34';
    T(got === want, `⛔ SWTD 페이지가 CASP 도면과 다르다\n        나온 것: ${got}\n        CASP  : ${want}`);
    // 해치: 홀드 있는 베이 2장, 데크 전용(32·33·34) 0장 — falsy→1 강제가 되살아나면 여기서 선다
    const g01 = CP.buildBayGrid(bayDef, '01');
    T(g01 && g01.hatchCount === 2, `⛔ SWTD 01 해치 ${g01 && g01.hatchCount} (기대 2)`);
    const g32 = CP.buildBayGrid(bayDef, '32');
    T(g32 && g32.hatchCount === 0, `⛔ SWTD 32 해치 ${g32 && g32.hatchCount} (기대 0 — 데크 전용)`);
    // 카고플랜 BAY01 = CASP: 데크 7칸(00 포함) · 홀드 5칸 피라미드(5-3-3-1)
    T(g01 && g01.nDeckCols === 7, `⛔ SWTD 01 데크 폭 ${g01 && g01.nDeckCols} (CASP 7)`);
    // ★ 2.56-01 앵커 — CASP 실물(SWTD9012EBAY.pdf 19면): 34베이는 00 포함 10칸, 좌현이 하나 더.
    //   짝수 cellCount + 00 조합에서 좌현 끝 열(10)이 증발해 실컨 4대가 안 그려지던 사고의 기준표.
    const g34 = CP.buildBayGrid(bayDef, '34');
    T(g34 && JSON.stringify(g34.deckRowPos) === JSON.stringify(['10','08','06','04','02','00','01','03','05','07']),
      `⛔ SWTD 34 데크 열이 CASP 실물과 다르다: ${g34 && JSON.stringify(g34.deckRowPos)}`);
    // 33베이 = CASP: 09 한 줄(우현 끝) — 차단열 10칸은 자리만 남는다
    const g33 = CP.buildBayGrid(bayDef, '33');
    const act33 = g33 ? g33.deckRows.filter(r => !r.invisible).map(r => r.cells.map((c, i) => c.active ? g33.deckRowPos[i] : null).filter(Boolean).join(',')) : [];
    T(act33.length > 0 && act33.every(x => x === '09'), `⛔ SWTD 33 이 09 한 줄이 아니다: ${JSON.stringify(act33)}`);
    const holdActive = g01 ? g01.holdRows.filter(t => !t.invisible).map(t => t.cells.filter(c => c.active).length) : [];
    T(JSON.stringify(holdActive) === JSON.stringify([5, 3, 3, 1]), `⛔ SWTD 01 홀드 단면 ${JSON.stringify(holdActive)} (CASP [5,3,3,1])`);
  }
}

// ── ③ 소비 화면에 옛 벌이 남지 않았는가 (소스 직접 검사 — 한 벌만 고치면 선다) ──
{
  const files = {
    'src/components/BayPlan.jsx': 'BayPlan',
    'src/components/PrintableBayDetail.jsx': 'PrintableBayDetail',
    'src/coneCargoPlan.entry.jsx': 'coneCargoPlan',
  };
  for (const [f, nm] of Object.entries(files)) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    T(src.includes('buildBayGrid('), `⛔ ${nm}: buildBayGrid 를 부르지 않는다`);
    T(src.includes('buildBayPagesFromSummary'), `⛔ ${nm}: buildBayPagesFromSummary 를 부르지 않는다`);
    T(!src.includes('dictBaysSummary[primaryBn]'), `⛔ ${nm}: 짝수 키 entry 조회(dictBaysSummary[primaryBn])가 남아 있다`);
    T(!src.includes('leftOddIn'), `⛔ ${nm}: 자체 짝 루프(leftOddIn)가 남아 있다`);
  }
  // 베이상세의 종전 buildBayPages 는 사전 없는 배 폴백으로만 남는다 — 정의는 있되 기본 경로가 아님
  const bd = fs.readFileSync(path.join(ROOT, 'src/components/PrintableBayDetail.jsx'), 'utf8');
  T(bd.includes('buildBayPagesFromSummary(dictData.bayDef)'), '⛔ PrintableBayDetail: allPages 가 core 짝을 쓰지 않는다');
  // ★ 2.56-01: 좌표 축은 rowPos 그대로 — 차단열(blockedCells)의 «자리»가 접히면 안 된다.
  //   active 셀만 모아 축을 만들면 SWTD 09베이 00·01 이 사라져 좌우 블록이 붙는다(CASP 실물과 다름).
  for (const f of ['src/components/BayPlan.jsx', 'src/coneCargoPlan.entry.jsx']) {
    const src2 = fs.readFileSync(path.join(ROOT, f), 'utf8');
    T(src2.includes('deckRowPos || []'), `⛔ ${f}: 좌표 축이 rowPos 를 쓰지 않는다 — 차단열이 접힌다`);
    T(!src2.includes('deckSet.add(c.rowLbl)'), `⛔ ${f}: active 수집 축(deckSet)이 되살아났다 — 차단열이 접힌다`);
  }
}

if (bad > 0) { console.error(`✗ 베이 격자 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 베이 격자 연막검사 통과 — 격자 한 벌(39척)·짝 한 벌·SWTD=CASP·소스 옛 벌 0');
