// 5.24 베이매트릭스 대조 문지기 연막검사 — 실자료(SWAL 2611N·NSFR 2622N·XTPG 550E, 고치기 전 사전)로 offGridOf·widenBayDefForDrawing 을 실소스로 돌린다.
const path = require('path'); const fs = require('fs');
const ROOT = process.argv[2] || process.cwd();
let fail = 0, pass = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
(async () => {
  const core = await import(path.join(ROOT, 'src/cargoPlanCore.js'));
  const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/offgrid524.json'), 'utf8'));
  for (const cs of FX.cases) {
    const a = core.offGridOf(cs.def, cs.containers);
    ok(a.ok && a.off.length === cs.expectOff, `${cs.name} 그림 밖 ${a.off.length} (기대 ${cs.expectOff})`);
    const w = core.widenBayDefForDrawing(cs.def, cs.containers);
    ok(w.off.length === 0, `${cs.name} 넓힌 뒤 남음 ${w.off.length}`);
    ok(w.widened.size === cs.expectOff && w.widenedCns.size > 0 === (cs.expectOff > 0), `${cs.name} 넓힌 자리 ${w.widened.size}`);
    ok(JSON.stringify(cs.def) === cs.defJson, `${cs.name} 정본 사본이 바뀌면 안 됨`);
    const again = core.offGridOf(w.def, cs.containers);
    ok(again.off.length === 0, `${cs.name} 넓힌 사본 재판정 0`);
  }
  // 이상 없는 사전은 그대로 돌려준다(같은 객체)
  const c0 = FX.cases[0];
  const w0 = core.widenBayDefForDrawing(FX.fixedDef, c0.containers);
  ok(w0.def === FX.fixedDef && w0.widened.size === 0, '고친 SWAL 사전은 넓히지 않음');
  // 화면 연결
  const bp = fs.readFileSync(path.join(ROOT, 'src/components/BayPlan.jsx'), 'utf8');
  ok(/widenBayDefForDrawing\(_dictBayDefBase/.test(bp), '베이 그림이 넓힌 사본으로 그림');
  ok(/data-gk-band="1"/.test(bp) && /data-gk-wide/.test(bp), '베이 그림 띠·점선 칸');
  ok((bp.match(/renderCellG\(/g) || []).length >= 4, '칸 그리기 네 곳 모두 점선 감싸기');
  const pd = fs.readFileSync(path.join(ROOT, 'src/components/PrintableBayDetail.jsx'), 'utf8');
  ok(/widenBayDefForDrawing\(/.test(pd), 'PLAN 출력도 같은 함수');
  const cp = fs.readFileSync(path.join(ROOT, 'src/coneCargoPlan.entry.jsx'), 'utf8');
  ok(/widenBayDefForDrawing\(/.test(cp), '콘앱 플랜도 같은 함수');
  const pv = fs.readFileSync(path.join(ROOT, 'src/components/PrintableCargoPlanV2.jsx'), 'utf8');
  ok(/widenBayDefForDrawing\(\{ \.\.\.bayDefWithSource/.test(pv), '주 PLAN 출력(콘앱 플랜 포함)도 같은 함수');
  // 넓히면 원래 그리던 컨이 밀리는 사전은 넓히지 않는다(홀드가 데크보다 넓어짐)
  const capDef = { baysSummary: [{ bayNo: '03', hasDeck: true, hasHold: true, deckTiers: [82], deckCells: [7], deckHasZero: true, holdTiers: [4, 2], holdCells: [7, 7], holdHasZero: true, rowCount: 7 }], _userOwned: true, code: 'TST' };
  const capC = [{ cn: 'A', bay: '03', row: '08', tier: '04' }, { cn: 'B', bay: '03', row: '05', tier: '04' }, { cn: 'C', bay: '03', row: '05', tier: '02' }];
  const capW = core.widenBayDefForDrawing(capDef, capC);
  ok(capW.def === capDef && capW.off.length === 1 && capW.off[0].c.cn === 'A', '밀려나는 경우는 정본 그대로 · 그림 밖 1대');
  const hd = fs.readFileSync(path.join(ROOT, 'src/data/helpData.js'), 'utf8');
  ok(/5\.24 — \*\*베이매트릭스에 없는 칸/.test(hd), '매뉴얼 한 줄');
  console.log(`smoke_offgrid524 ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('✗ 실행 오류', e); process.exit(1); });
