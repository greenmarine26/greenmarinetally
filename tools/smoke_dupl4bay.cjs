// 끝 4자리가 겹쳐도 «고른 베이» 것으로 카드가 서는가 (3.23) — 소스에서 판정을 그대로 꺼내 실데이터로 돌린다.
//
// 왜 있는가.
//   검수사 2026-09-07 «베이를 지정해서 양하중입니다. 그러면 리퍼 3290만 보였어야 합니다».
//   3.3-01 이 «작업분 둘 이상이면 큰 카드 금지»를 세웠는데(KSKM 7075 승격 사고), 그 금지가
//   **베이를 골라 둔 때까지** 막아 11자리를 치게 만들었다. 이 검사는 그 문이 «고른 베이에 하나일 때만»
//   열리는지, 그리고 3.3-01 이 막은 사고가 여전히 막히는지 둘 다 본다.
const fs = require('fs'), path = require('path');
const SRC = path.resolve(__dirname, '..', 'src/components/SearchPanel.jsx');
const src = fs.readFileSync(SRC, 'utf8');
let bad = 0; const T = (ok, why) => { console.log((ok ? '  ✓ ' : '  ✗ ') + why); if (!ok) bad++; };
console.log('끝4 중복 — 고른 베이 우선 (3.23)');

// ── 1. 배선 — 판정이 한 벌인가, 카드 규칙이 그 판정을 쓰는가
T(/const inManualTier = React\.useCallback\(/.test(src), 'inManualTier 가 컴포넌트 스코프 한 벌이다(정렬·카드가 같은 잣대)');
T(/const bayHits = workHits\.filter\(inManualTier\);/.test(src), '카드 규칙이 그 판정을 그대로 쓴다');
T(/const bayPick = \(!!parsed\.digits && !doneTab && workHits\.length > 1 && bayHits\.length === 1\)/.test(src),
  '문은 «끝4 조회 · 작업분 둘 이상 · 고른 베이에 정확히 하나»일 때만 열린다');
T(/const dupL4 = !!parsed\.digits && !doneTab && workHits\.length > 1 && !bayPick;/.test(src),
  '3.3-01 경고는 문이 안 열릴 때만 뜬다');
T(/const main = bayPick \? \[bayPick\] : mainAll;/.test(src), '문이 열리면 큰 카드가 그 한 대로 선다');
T(/const othersRest = bayPick \? \[\.\.\.workHits\.filter\(c => c !== bayPick\), \.\.\.others\]/.test(src),
  '가려낸 나머지는 접힌 목록에 남는다(V7.53 «찾아서 알려줘야 한다»)');
T(/다른 \{workHits\.length - 1\}대는 다른 자리입니다/.test(src), '카드 위에 «다른 N대는 다른 자리»를 밝힌다');

// ── 2. 판정 재현 — 소스의 그 식을 그대로 옮기지 않고, 규칙으로 다시 세운다
const mk = (cn, bay, row, tier, mode = 'discharge', comp = false) => ({ cn, bay, row, tier, _mode: mode, _comp: comp });
const gate = (workHits, sel, tier, isDigits = true, doneTab = false) => {
  const inSel = (c) => {
    if (sel == null || !tier) return false;
    const gc = (bs) => { const b = parseInt(bs, 10); return b % 2 === 0 ? b : b - 1; };
    if (gc(c.bay) !== sel) return false;
    return tier === 'deck' ? parseInt(c.tier, 10) >= 80 : parseInt(c.tier, 10) < 80;
  };
  const bayHits = workHits.filter(inSel);
  const bayPick = (isDigits && !doneTab && workHits.length > 1 && bayHits.length === 1) ? bayHits[0] : null;
  return { bayPick, dupL4: isDigits && !doneTab && workHits.length > 1 && !bayPick };
};
// 실사건 — ATPR 2640E «3290» (검수사 실측 자리)
const atpr = [mk('FBIU5373290', '14', '08', '82'), mk('SKHU8933290', '06', '04', '86')];
let g = gate(atpr, 14, 'deck');
T(g.bayPick && g.bayPick.cn === 'FBIU5373290' && !g.dupL4, '★ B14 데크를 골라 두면 리퍼 FBIU5373290 하나로 카드가 선다');
g = gate(atpr, 6, 'deck');
T(g.bayPick && g.bayPick.cn === 'SKHU8933290', 'B6 을 골랐으면 반대쪽 한 대로 선다');
g = gate(atpr, null, null);
T(!g.bayPick && g.dupL4, '★ 베이를 안 골랐으면 종전대로 둘을 나란히 보인다(검수사 «지정하지 않았더라면 중복이 많겠지만»)');
g = gate(atpr, 14, 'hold');
T(!g.bayPick && g.dupL4, 'B14 를 골랐어도 홀드를 보는 중이면 데크 것을 자동으로 고르지 않는다');

// ── 3. 3.3-01 이 막은 사고가 여전히 막히는가 — 고른 베이 «안»에 둘
const kskm = [mk('FTAU2807075', '03', '02', '04'), mk('SEGU2477075', '03', '06', '06')];
g = gate(kskm, 2, 'hold');
T(!g.bayPick && g.dupL4, '★ 고른 베이 안에 둘이면 큰 카드를 안 세운다(KSKM 7075 승격 사고 그대로 막힘)');

// ── 4. 겹치지 않으면 종전 그대로
g = gate([mk('FBIU5373290', '14', '08', '82')], 14, 'deck');
T(!g.bayPick && !g.dupL4, '한 대뿐이면 이 문은 아예 안 쓴다(종전 경로)');
// 완료 탭
g = gate(atpr, 14, 'deck', true, true);
T(!g.bayPick, '완료 탭에서는 안 좁힌다(취소·위치수정 대상을 사람이 고른다)');
// 숫자 조회가 아니면
g = gate(atpr, 14, 'deck', false);
T(!g.bayPick && !g.dupL4, '조건 검색(숫자 조회가 아님)에는 안 걸린다');

console.log(bad ? `✗ 끝4 중복 검사 실패 ${bad}건` : '✓ 끝4 중복 — 고른 베이 우선 검사 통과');
process.exit(bad ? 1 : 0);
