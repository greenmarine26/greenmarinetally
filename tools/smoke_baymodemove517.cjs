// 5.17 연막검사 — 베이모드에서 베이 옮기기(◀ 장 · 장 목록 · 장 ▶) · 남은 컨이 있는 장만 · 판정 한 벌
//   검수사 2026-11-20 «검수앱 자동모드 베이모드에서 베이이동시 선택 방법은?» → «넣어 주세요»
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bm517_'));
const out = path.join(dir, 'b.cjs');
execFileSync('npx', ['esbuild', 'src/bayMode.js', '--bundle', '--platform=node', '--format=cjs', '--outfile=' + out, '--log-level=error'], { stdio: 'inherit' });
const B = require(out);
let n = 0, bad = 0;
const ok = (c, m) => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) bad++; };
//  해치 묶음 — 홀수 둘(01·03)은 사이 짝수(02)가 center, 05·07 → 06, 단독 09 → 09
const gc = (b) => { const x = parseInt(b, 10); if (x === 1 || x === 2 || x === 3) return '2'; if (x >= 5 && x <= 7) return '6'; return String(x); };
const C = (bay, tier) => ({ cn: `X${bay}${tier}${Math.random()}`, bay: String(bay).padStart(2, '0'), row: '01', tier: String(tier).padStart(2, '0') });
const rem = [C(1, 82), C(3, 84), C(2, 2), C(5, 82), C(7, 4), C(7, 6), C(9, 82)];
const L = B.bayModeBaysOf(rem, gc);
ok(JSON.stringify(L) === JSON.stringify([{ center: '2', deck: 2, hold: 1 }, { center: '6', deck: 1, hold: 2 }, { center: '9', deck: 1, hold: 0 }]), '해치 묶음별 데크·홀드 남은 대수 — ' + JSON.stringify(L));
ok(B.bayModeStepOf(L, '2', 1) === '6' && B.bayModeStepOf(L, '6', 1) === '9' && B.bayModeStepOf(L, '9', 1) == null, '장 ▶ — 다음 남은 장, 끝이면 없음');
ok(B.bayModeStepOf(L, '6', -1) === '2' && B.bayModeStepOf(L, '2', -1) == null, '◀ 장 — 앞 남은 장, 처음이면 없음');
const L2 = B.bayModeBaysOf(rem.filter((c) => gc(c.bay) !== '6'), gc);
ok(B.bayModeStepOf(L2, '6', 1) === '9' && B.bayModeStepOf(L2, '6', -1) === '2', '다 내린 장(6)에 있어도 앞뒤 남은 장으로 간다');
ok(B.bayModeBaysOf([], gc).length === 0 && B.bayModeStepOf([], '2', 1) == null, '남은 컨이 없으면 목록도 이동도 없다');
const L3 = [{ center: '2' }, { center: '6' }, { center: '9' }, { center: '12' }];
ok(B.bayModeStepOf(L3, '12', -1) === '9' && B.bayModeStepOf(L3, '9', -1) === '6' && B.bayModeStepOf(L3, '2', 1) === '6', '◀·▶ 는 바로 앞·뒤 장(맨 끝으로 건너뛰지 않는다)');
const L80 = B.bayModeBaysOf([C(9, 80), C(9, 78)], gc);
ok(L80[0].deck === 1 && L80[0].hold === 1, '80단부터 데크(78단은 홀드)');
ok(B.bayModeTierOf({ deck: 3, hold: 5 }) === 'deck' && B.bayModeTierOf({ deck: 0, hold: 5 }) === 'hold' && B.bayModeTierOf({ deck: 0, hold: 5, lock: true }) == null, '여는 단 — 데크 남음 데크 · 데크 0 홀드 · 이웃 데크로 잠김은 단 고르기');
//  감사 재현 — 짝 없는 홀수 11 이 사이 짝수 10 과 다른 장(2026-11-09 실례 꼴). 10 데크가 남으면 11 홀드는 잠긴다(4.80-02 게이트 한 벌)
{
  const gc2 = (b) => parseInt(b, 10);
  const r2 = [C(10, 82), C(11, 4)];
  const near = (a, b) => Math.abs(parseInt(a, 10) - parseInt(b, 10)) === 1;
  const lst = B.bayModeBaysOf(r2, gc2).map((g) => ({ ...g, lock: !g.deck && !!B.bayModeDeckGateOf(r2, Number(g.center), gc2, near) }));
  const g11 = lst.find((g) => g.center === '11');
  ok(g11 && g11.lock === true && B.bayModeTierOf(g11) == null, '이웃 장(10) 데크가 남은 11 은 홀드로 열지 않는다');
}
const read = (f) => fs.readFileSync(f, 'utf8');
const bv = read('src/components/BayViewWork.jsx'), gw = read('src/components/GuidedWorkPanel.jsx'), sp = read('src/components/SearchPanel.jsx');
ok(/data-bayview-bm-prev/.test(bv) && /data-bayview-bm-next/.test(bv) && /data-bayview-bm-strip/.test(bv) && /moveBayMode\(/.test(bv), '베이모드 위 띠 — ◀ 장 · 장 목록 · 장 ▶');
ok(/setBayMode\(\(b\) => \(b \? \{ \.\.\.b, bay: center \}/.test(bv), '옮겨도 해제 때 돌아갈 원래 화면(saved)은 그대로');
ok(/tier: bayModeTierOf\(g\)/.test(bv) && /holdDeckGateOf\(Number\(g\.center\)\)/.test(gw), '여는 단은 bayModeTierOf · 잠김은 자동 가이드 holdDeckGateOf 한 벌');
ok(/bayModeBaysOf\(remaining, groupCenterOf\)/.test(gw) && /onBayModeBays/.test(sp), '장 목록은 자동 가이드의 remaining·groupCenterOf 한 벌');
ok(!/from '\.\.\/firebase\.js'/.test(bv), '베이뷰는 기록 함수를 부르지 않는다(4.80)');
ok(/베이모드에서 장 옮기기/.test(read('src/data/helpData.js')), '매뉴얼');
console.log(`${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
