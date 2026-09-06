// 콘앱 «쌓은 줄 그림»에 홀드가 나오는지 · 데크와 홀드가 제 열 폭을 쓰는지 잰다(2.35).
//   검수사 2026-09-06 «콘앱을 보니 홀드는 그림을 보여주지 않습니다» · «어디를 진행중인지 글자로는 눈에 잘 안들어 오기때문입니다»
//   · «데크와 홀드는 열 폭이 다릅니다 … 이거 맞추는법 알고 있을것입니다. 많은 시간을 베이구조에 투자했었기 때문입니다».
//   ⛔ 로직을 베껴 적지 않는다 — 소스에서 그 블록과 골격 함수를 **그대로** 꺼내 실데이터로 돌린다.
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.resolve(__dirname, '..', 'public', 'cone.html');
const html = fs.readFileSync(SRC, 'utf8');
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'coneholdview_mcap.json'), 'utf8'));
let bad = 0; const T = (ok, why) => { console.log((ok ? '  ✓ ' : '  ✗ ') + why); if (!ok) bad++; };

const blk = html.match(/let stripRow='';\n[\s\S]*?if\(lines\.length\) stripRow = [^\n]*\n\s*\}/);
const tn  = html.match(/function ctTierName\(tier, ?t1\)\{[\s\S]*?\n\}\n/);
const pr  = html.match(/^function ctPair\(b\)\{[^\n]*\n/m);
const skel = html.match(/function bvRowPositions\(cellCount, hasZero\)\{[\s\S]*?\n\}\n/);
const bay = html.match(/function bvBaySkeleton\(bs\)\{[\s\S]*?\n\}\n/);
T(!!blk && !!skel && !!bay && !!tn && !!pr, '그림 블록·골격·단이름·짝 함수를 소스에서 그대로 꺼냈다(베껴 적지 않는다)');
if (!blk || !skel || !bay || !tn || !pr) { console.log('✗ 홀드 그림 연막검사 실패'); process.exit(1); }

const mkState = (withDict) => ({ _bayDictBays: withDict ? new Map([[22, FX.bs]]) : new Map() });
const run = (c, withDict = true) => {
  const sb = { console,
    state: mkState(withDict),
    ctPlanRows: () => FX.rows,
    CT: { rec: {}, tw: {}, comp: { discharge: FX.completed } },
    ctPos: () => null,
    ctEsc: (s) => String(s == null ? '' : s), c };
  const ctx = vm.createContext(sb);
  vm.runInContext(skel[0] + '\n' + bay[0] + '\n' + tn[0] + '\n' + pr[0] + '\n' + blk[0] + '\n;globalThis.__out = stripRow;', ctx);
  return ctx.__out || '';
};
const labsOf = (h) => (h.match(/>(\d단\(\d\d\)|H\d단\(\d\d\))</g) || []).map(x => x.slice(1, -1));
const rowsOf = (h) => (h.match(/<span class="ct-cells">[\s\S]*?<\/span>/g) || []).map(r => (r.match(/ct-slot/g) || []).length);

console.log('[1] 홀드에서 작업 중이어도 그림이 나온다 (2.33 은 여기서 통째로 건너뛰었다)');
const hold = run({ mode: 'discharge', tier: 6, bay: 22, pair: 22, t1: 82, stale: false });
T(hold.includes('ct-stack'), '홀드 3단(06)에서 작업 중 — 그림이 그려진다');
T(/H\d단\(0\d\)/.test(hold), `홀드 단 라벨이 실제로 뜬다 (${labsOf(hold).filter(x=>x[0]==='H').join(' ')})`);

console.log('\n[2] 데크에서 작업 중이면 데크와 홀드가 한 줄기로 이어진다 («보통선박처럼»)');
const deck = run({ mode: 'discharge', tier: 84, bay: 22, pair: 22, t1: 82, stale: false });
const labs = labsOf(deck);
T(labs.some(x => x[0] !== 'H') && labs.some(x => x[0] === 'H'), `데크·홀드가 한 그림에 있다 — ${labs.join(' ')}`);
T(labs.length === FX.expectTiers, `단 수 ${labs.length} (실데이터 기대 ${FX.expectTiers})`);
const iH = labs.findIndex(x => x[0] === 'H');
T(iH > 0 && labs.slice(iH).every(x => x[0] === 'H'), '위가 데크·아래가 홀드 순서다');

console.log('\n[3] **데크와 홀드가 제 열 폭을 쓴다** (베이사전 골격 — 검수사 «이거 맞추는법 알고 있을것입니다»)');
const wid = rowsOf(deck);
const dW = wid.slice(0, iH), hW = wid.slice(iH);
const dExp = Math.max(...FX.bs.deckCells.map(Number)), hExp = Math.max(...FX.bs.holdCells.map(Number));
T(dW.every(w => w === dExp), `데크 줄은 ${dExp}열 (실측 ${[...new Set(dW)].join('/')})`);
T(hW.every(w => w === hExp), `홀드 줄은 ${hExp}열 (실측 ${[...new Set(hW)].join('/')})`);
T(dExp !== hExp, `두 폭이 실제로 다른 베이로 쟀다 (데크 ${dExp} · 홀드 ${hExp})`);
//  사전이 없으면 합집합으로라도 그린다(조용히 비우지 않는다)
const noDict = run({ mode: 'discharge', tier: 84, bay: 22, pair: 22, t1: 82, stale: false }, false);
T(noDict.includes('ct-stack') && labsOf(noDict).some(x => x[0] === 'H'), '베이사전이 없어도 홀드를 합집합 열로 그린다');

console.log('\n[4] 갑판과 선창 사이에 금이 한 줄만');
T((deck.match(/ct-trow hold1/g) || []).length === 1, `경계 금 ${(deck.match(/ct-trow hold1/g) || []).length}줄`);
T(html.includes('.ct-trow.hold1{') && html.includes('.ct-cells{'), 'CSS 에 금·가운데 정렬이 정의돼 있다');

console.log('\n[5] 완료(초록)는 홀드에도 · 없는 칸은 비운다');
T(hold.includes('ct-slot on'), '홀드 칸에도 완료 표시가 붙는다');
T(deck.includes('ct-slot none'), '그 단에 없는 칸은 빈 칸으로 남긴다');

console.log('\n[6] 콘 개수 판정(선종)은 이 판에서 안 건드렸다 — 검수사 «2는 선종구분을 안하겠다는것이니 질문자체도 필요 없습니다»');
T(!html.includes('선종을 골라 주세요'), '선종을 고르라고 묻지 않는다');
T(html.includes('40ft 홀드콘 없음'), '종전 문구가 그대로다 — 이 판은 그림만이다');

console.log('\n[7] 홀드 단이 중간에 비어도 금은 **한 줄만** (한 단이 통째로 통과화물이면 실제로 빈다)');
{
  const keep = FX.rows.filter(r => parseInt(r.tier,10) !== 6);     // H3단(06)을 통째로 뺀다
  const save = FX.rows; FX.rows = keep;
  const h = run({ mode:'discharge', tier:84, bay:22, pair:22, t1:82, stale:false });
  FX.rows = save;
  const n = (h.match(/ct-trow hold1/g) || []).length;
  T(n === 1, `홀드 단에 구멍이 있어도 금 ${n}줄(1이어야 한다)`);
}

console.log('\n[8] **골격에 없는 열의 컨도 반드시 그린다** — 머리의 «N/M» 과 그린 칸이 어긋나면 안 된다');
{
  const save = FX.rows;
  //  사전 골격 밖 열(홀드 12열·데크 14열)에 실린 컨을 넣는다 — 실제로 계획과 다른 자리에 실리면 생긴다
  FX.rows = save.concat([
    { cn:'ZZZU0000001', bay:'22', row:'14', tier:'84', size:'40' },
    { cn:'ZZZU0000002', bay:'22', row:'12', tier:'06', size:'20' },
  ]);
  const h = run({ mode:'discharge', tier:84, bay:22, pair:22, t1:82, stale:false });
  FX.rows = save;
  const rows = (h.match(/<div class="ct-trow[^"]*">[\s\S]*?<\/span><\/div>/g) || []);
  let mismatch = 0, shown = 0;
  for (const r of rows) {
    const cnt = (r.match(/<span class="ct-tcnt">(\d+)\/(\d+)<\/span>/) || [])[2];
    const drawn = (r.match(/ct-slot(?! none)/g) || []).length;
    if (cnt != null && Number(cnt) !== drawn) mismatch++;
    shown += drawn;
  }
  T(mismatch === 0, `분모와 그린 칸이 모든 줄에서 같다(어긋난 줄 ${mismatch})`);
  T(h.includes('ZZZU0000001') && h.includes('ZZZU0000002'), '골격 밖 열에 실린 컨이 화면에서 사라지지 않는다');
}

console.log(bad ? `\n✗ 홀드 그림 연막검사 실패 ${bad}건` : '\n✓ 홀드 그림 연막검사 통과');
process.exit(bad ? 1 : 0);
