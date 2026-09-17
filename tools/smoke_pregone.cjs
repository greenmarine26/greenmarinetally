// 항로 사전 제외를 배정표가 되돌리는지 보는 연막검사 (3.53-02, 검수사 KSKM 2617N 실물)
//   검수사 원문: «인천에서 출발 하였다면 인천분이 남아 있으면 안됩니다. 제외 하는게 맞죠
//   그런데 굳이 터미널은 시프팅1개를 잡았습니다. 그럼 다음 기항지로 가는지 확인을 해야 합니다.»
//   ⛔ 「코드가 그럴듯하다」로 끝내지 않는다 — 실물 EDI 27베이 스택으로 한 대씩 맞춰 본다.
const path = require('path');
const fs = require('fs');

(async () => {
  const U = await import(path.resolve('src/utils.js'));
  const FX = JSON.parse(fs.readFileSync(path.resolve('tools/fixtures/shifting_pregone.json'), 'utf8'));
  let fail = 0;
  const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fail++; };

  //  실제 앱은 App.jsx 가 RTDB lane_routes 를 setLaneRoutes 로 주입한다. 검사도 같게 한다.
  //  ⚠ 이것을 빼면 사전을 못 찾아 제외가 아예 안 걸리고, 검사가 «통과»하면서 아무것도 안 잰다.
  U.setLaneRoutes({ IHS1: { rotation: ['CNXMN', 'KRINC', 'KRPTK'] } });
  ok(!!U.laneRouteOf('IHS1'), '사전 IHS1 주입됨 (이 항이 깨지면 아래가 전부 무의미하다)');

  const dict = { bayDef: { baysSummary: FX.bay27 } };
  const voyOf = (over) => ({
    key: 'KSKM_2617N',
    info: { ...FX.info, ...(over || {}) },
    discharge: { raw: { edi: { text: FX.text, fileName: 'KSKM2617NXMNB.ASC' } } },
  });
  const run = (over) => U.predictShiftingFromVoyage(voyOf(over), dict) || {};

  console.log('[1] 실물 그대로 — 배정표 이적 2모브(=1대), 사전은 인천을 평택 앞이라 한다');
  const a = run();
  const na = Object.keys(a).length;
  ok(na === 1, `예측 1대 (${na})`);
  ok(!!a.SEGU2523756, 'SEGU2523756 — 27베이 01열 90단 인천행 밑에 깔린 평택분 88단 때문에 잡힌다');
  ok(!!a._meta && !!a._meta.exReverted, '_meta.exReverted — 되돌린 근거가 남는다');
  ok(a._meta && a._meta.excludedCnt === 0, '되돌렸으니 제외 0');
  ok(a._meta && a._meta.exReverted && a._meta.exReverted.truth === 1, '배정표 1대');
  ok(a._meta && a._meta.exReverted && a._meta.exReverted.nEx === 0, '제외한 판은 0대 — 그래서 배정표와 어긋났다');
  ok(a._meta && a._meta.exReverted && a._meta.exReverted.nAll === 1, '제외 푼 판이 1대 — 배정표와 맞는다');
  ok(a._meta && Array.isArray(a._meta.exReverted.ports) && a._meta.exReverted.ports.includes('KRINC'),
     '되돌린 항이 KRINC 임을 밝힌다');

  console.log('[2] ★ 되돌렸으면 베이플랜 화면 숨김도 같이 풀려야 한다 (§4-4 판정 한 벌)');
  //  ⚠ 이것이 접히면 «시프팅 1대»라고 말하면서 바로 그 한 대를 화면에서 가리는 상태가 된다.
  ok(a._meta && a._meta.preGone === null, '_meta.preGone === null — 숨길 것이 없다');

  console.log('[3] 배정표가 0이면 되돌리지 않는다 — 배정표를 이기려 들면 안 된다');
  //  ⚠ 이 항이 실제로 재는 것은 «제외와 화면 숨김이 유지되는가» 다. berthShiftTruth 의
  //    `truth > 0` 게이트는 이 픽스처로는 안 잡히지만 **일은 한다** — 감사 재판정에서 확인됐듯
  //    allOut ⊉ outEx 인 경우가 있어(커버 경계 이동) truth 0 · nEx 2 · nAll 0 이 성립할 수 있다.
  const b = run({ berthShift: 0 });
  ok(!(b._meta && b._meta.exReverted), '되돌림 없음');
  ok(b._meta && b._meta.excludedCnt > 0, `제외 유지 (${b._meta && b._meta.excludedCnt}대)`);
  ok(b._meta && b._meta.preGone && b._meta.preGone.list.includes('KRINC'), '화면 숨김도 유지');

  console.log('[4] 작업 시작 전에는 판정하지 않는다 (§173 대기 단계 자료 금지)');
  const c = run({ terminalStatus: 'planned' });
  ok(U.berthShiftTruth(voyOf({ terminalStatus: 'planned' })) === null, 'berthShiftTruth 가 null');
  ok(!(c._meta && c._meta.exReverted), '되돌림 없음 — 이적 칸이 채워지기 전의 값은 확정이 아니다');
  ok(c._meta && c._meta.excludedCnt > 0, '제외 유지');
  ok(U.berthShiftTruth(voyOf({})) === 1, '작업 중이면 2모브 → 1대');

  console.log('[5] 제외한 판이 배정표와 맞으면 그대로 둔다 — 아무 때나 되돌리지 않는다');
  //  배정표가 «이적 0대»를 말하는 경우는 [3] 에서 봤다. 여기서는 배정표가 엉뚱한 수(9대)를 말할 때.
  const d = run({ berthShift: 18 });
  ok(!(d._meta && d._meta.exReverted), '제외 푼 판(1대)도 배정표(9대)와 안 맞으면 되돌리지 않는다');
  ok(d._meta && d._meta.excludedCnt > 0, '제외 유지');

  console.log('[6] 사전이 없으면 제외 자체가 없다 — 되돌릴 것도 없다');
  U.setLaneRoutes({});
  const e = run();
  ok(!(e._meta && e._meta.exReverted), '되돌림 없음');
  ok(e._meta && e._meta.excludedCnt === 0, '제외 0');
  ok(Object.keys(e).length === 1, '예측은 1대 그대로 — 제외가 없으니 원래 계산이 나온다');
  U.setLaneRoutes({ IHS1: { rotation: ['CNXMN', 'KRINC', 'KRPTK'] } });

  console.log('[7] ⛔ 커버 역산에서는 되돌리지 않는다 (감사 [치명]) — 되돌림은 «배정표와 맞는 수»를');
  console.log('    만들어 주므로, 켠 채 역산하면 어떤 커버 분할이든 정답이 되어 사전을 오염시킨다');
  const nr = U.predictShiftingFromVoyage(voyOf(), dict, { noRevert: true }) || {};
  ok(!(nr._meta && nr._meta.exReverted), 'noRevert 면 되돌림 없음');
  ok(nr._meta && nr._meta.excludedCnt > 0, 'noRevert 면 제외 그대로 — 역산이 보는 수가 안 부풀려진다');
  ok(Object.keys(nr).length === 0, 'noRevert 예측 0대 (되돌린 판은 1대)');
  {
    //  역산이 실제로 noRevert 로 부르는지 — 소스에서 확인한다(부르는 자리가 하나뿐이다).
    const src = fs.readFileSync(path.resolve('src/utils.js'), 'utf8');
    const m = src.match(/got = Object\.keys\(predictShiftingFromVoyage\([^)]*\)/);
    ok(!!m && /noRevert/.test(m[0]), 'solveHatchRows 가 noRevert 로 부른다');
  }

  console.log('[8] 홀수 모브는 대수가 아니다 (감사 [중대]) — 1.5대라는 것은 없다');
  ok(U.berthShiftTruth(voyOf({ berthShift: 3 })) === null, 'berthShift 3모브 → null');
  const odd = run({ berthShift: 3 });
  ok(!(odd._meta && odd._meta.exReverted), '되돌림 없음 — 판정하지 않는다');
  ok(odd._meta && odd._meta.excludedCnt > 0, '제외 유지');

  console.log('[9] 선사 시프팅 서류가 있으면 컨번호까지 맞아야 되돌린다 (감사 [중대])');
  //  수만 맞고 컨번호가 다르면 «우연히 수가 맞은 것»이다 — 되돌리지 않는다.
  const bad = U.predictShiftingFromVoyage(
    { ...voyOf(), restowList: { ZZZU0000000: { from: '270188' } } }, dict) || {};
  ok(!(bad._meta && bad._meta.exReverted), '서류에 없는 컨이 되돌아오면 되돌리지 않는다');
  const good = U.predictShiftingFromVoyage(
    { ...voyOf(), restowList: { SEGU2523756: { from: '270190' } } }, dict) || {};
  ok(!!(good._meta && good._meta.exReverted), '서류에 그 컨이 있으면 되돌린다');

  console.log('[10] 제외한 판이 이미 배정표와 맞으면 건드리지 않는다 (nEx !== truth 가드)');
  //  배정표가 0대를 말하고 제외한 판도 0대면 어긋남이 없다 — 되돌릴 이유가 없다.
  //  ⚠ 정직하게 적는다 — 이 항은 가드를 `if (true)` 로 바꿔도 안 깨진다(변이 시험 실측).
  //    가드를 실제로 재려면 «제외가 걸리고 · 배정표가 양수이고 · 제외 후에도 예측이 남는» 픽스처가
  //    필요한데 2617N 27베이에는 그런 자리가 없다(POD 가 INC·PTK 둘뿐). 픽스처 확보는 인계함에 올렸다.
  //    지금은 가드가 소스에 있는지만 본다.
  {
    const z = run({ berthShift: 0 });
    ok(!(z._meta && z._meta.exReverted), '어긋남이 없으면 되돌림 없음');
    ok(z._meta && z._meta.preGone && z._meta.preGone.list.length > 0, '화면 숨김도 그대로');
    const src = fs.readFileSync(path.resolve('src/utils.js'), 'utf8');
    ok(/if \(nEx !== truth\) \{/.test(src), '어긋날 때만 되돌리는 가드가 소스에 있다');
  }

  console.log('[11] ⛔ EDI 실측 근거(LOC+61)는 되돌리지 않는다 (2차 시뮬 [중대])');
  //  그 배 EDI 가 «다음 기항은 인천»이라고 직접 적었으면 사전보다 강하다. 그것까지 되돌리면
  //  그 배의 EDI 를 뒤집는 셈이고, 화면은 «항로 사전 제외를 되돌렸다»는 사실과 다른 말을 한다.
  {
    const voyEdi = {
      key: 'KSKM_2617N', info: { ...FX.info },
      discharge: { raw: { edi: { text: FX.text + "LOC+61+KRINC'\n", fileName: 'X.ASC' } } },
    };
    const g = U.predictShiftingFromVoyage(voyEdi, dict) || {};
    ok(g._meta && g._meta.nextPort === 'KRINC', 'EDI 다음 기항이 읽힌다 (이 항이 깨지면 아래가 무의미)');
    ok(g._meta && g._meta.rot === 'edi', '판정 근거가 EDI 실측으로 기록된다');
    ok(!(g._meta && g._meta.exReverted), '되돌림 없음 — EDI 가 말한 것은 뒤집지 않는다');
    ok(g._meta && g._meta.excludedCnt > 0, '제외 유지');
  }

  console.log('[12] ⛔ «수만 맞은» 되돌림을 막는다 (감사 재판정 [중대]A · 합성 반례 2종)');
  /*  ⚠ 아래 두 입력은 **합성**이다 — 실물 2617N 27베이에는 홀드 컨이 없어 이 형태를 만들 수 없다.
      줄의 고정폭·컬럼·POD 꼬리는 실물 ASC 그대로 쓰고 자리와 컨번호만 바꿨다.
      ⚠ lost_case 는 ①gained>0 과 ③lost==0 을 **따로 잴 수 없다**(어느 하나만 떼도 막힌다).
        ①은 원리상 단독 차단자가 못 된다 — lost 0 이고 gained 0 이면 두 집합이 같아 nAll===nEx 인데
        그것은 «nEx !== truth ∧ nAll === truth» 와 모순이다. ①은 의도를 밝히는 중복 방어다. */
  {
    const EX = JSON.parse(fs.readFileSync(path.resolve('tools/fixtures/shifting_pregone_edge.json'), 'utf8'));
    const dict2 = { bayDef: { baysSummary: EX.bay27 } };
    const vv = (text, over) => ({ key: 'K', info: { ...EX.info, ...(over || {}) },
                                  discharge: { raw: { edi: { text, fileName: 'X.ASC' } } } });

    //  ① 제외를 풀면 커버 등분 경계가 옮겨져 제외본에 있던 컨이 사라지는 경우
    const t1 = EX.lost_case.text;
    const ex1 = U.predictShiftingFromVoyage(vv(t1), dict2, { noRevert: true }) || {};
    const al1 = U.predictShiftingFromVoyage(vv(t1, { lane: '' }), dict2) || {};
    const k1 = Object.keys(ex1), a1 = Object.keys(al1);
    ok(k1.length === 2 && a1.length === 1,
       `전제 — 제외본 ${k1.length}대 → 전체본 ${a1.length}대 (경계가 옮겨진다)`);
    ok(k1.some((c) => !a1.includes(c)), '전제 — 제외본에 있던 컨이 전체본에서 사라진다(lost > 0)');
    const g1 = U.predictShiftingFromVoyage(vv(t1), dict2) || {};
    ok(!(g1._meta && g1._meta.exReverted),
       '배정표가 전체본 대수(1대)와 맞아도 되돌리지 않는다 — 제외분이 답에 한 대도 안 들어왔다');
    ok(g1._meta && g1._meta.excludedCnt > 0, '제외 유지');
    ok(Object.keys(g1).length === 2, '예측은 제외본 그대로');

    //  ② 되돌려 «들어온» 컨이 제외 대상 항의 화물이 아닌 경우 — 수만 맞은 것이다
    const t2 = EX.gained_wrong_port_case.text;
    const g2 = U.predictShiftingFromVoyage(vv(t2), dict2) || {};
    ok(!(g2._meta && g2._meta.exReverted), '되돌아온 컨이 CNSHA 면 되돌리지 않는다 (제외항은 KRINC)');
    ok(g2._meta && g2._meta.excludedCnt > 0, '제외 유지');

    //  ③ 선사 서류 문지기가 공회전하지 않는다 — 엉뚱한 서류로 뚫리면 안 된다
    const g3 = U.predictShiftingFromVoyage(
      { ...vv(t1), restowList: { ZZZU9999999: { from: '270386' } } }, dict2) || {};
    ok(!(g3._meta && g3._meta.exReverted), '엉뚱한 선사 서류를 얹어도 안 뚫린다');
  }

  console.log('[13] ⛔ EDI 는 첫 항만 말한다 — 사전이 덧붙인 항은 되돌림 대상이다 (감사 재판정 [중대]B)');
  /*  portsBeforePtk 규칙 ②는 «다음 기항부터 평택 전까지»라 첫 항만 EDI 가 말한 것이고 나머지는
      사전이 걸어 만든 것이다. LOC+61 이 하문이면 명단은 [하문, 인천]인데 «인천이 평택 앞»은
      사전의 주장이고 그것이 2617N 에서 틀렸던 말이다. EDI 에 그 줄이 있느냐 없느냐로 답이
      갈리면 안 된다 — 하문은 계속 빼고 인천만 되살린다. */
  {
    const v2 = { key: 'KSKM_2617N', info: { ...FX.info },
                 discharge: { raw: { edi: { text: FX.text + "LOC+61+CNXMN'\n", fileName: 'X.ASC' } } } };
    const h = U.predictShiftingFromVoyage(v2, dict) || {};
    ok(h._meta && h._meta.nextPort === 'CNXMN', 'EDI 다음 기항이 하문으로 읽힌다 (이 항의 전제)');
    ok(!!(h._meta && h._meta.exReverted), '되돌림 발동 — 사전이 덧붙인 인천은 되살린다');
    ok(h._meta && h._meta.exReverted && h._meta.exReverted.ports.join() === 'KRINC',
       '되돌린 항은 KRINC 하나 — CNXMN 은 EDI 가 말한 것이라 그대로 뺀다');
    ok(Object.keys(h).length === 1, '예측 1대 — LOC+61 줄이 있든 없든 같은 답');
  }

  console.log('[14] ⛔ 사라진 컨 가드가 혼자 막는 자리 · 부분 되살림 산술 (감사 [사소] 1·2)');
  /*  ⚠ 두 입력 모두 **합성**이다(edge 픽스처와 같은 방식). 재는 이유는 이렇다 —
      · lost_only_case: ①gained>0 과 ②항 검사와 선사 서류가 전부 통과하고 **③ lost==0 만 막는** 형태다.
        이 항이 없으면 `!lost.length` 를 떼도 검사가 통과한다(변이 실측). 실제로 일하는 가드가 이것이다.
      · partial_revert_case: EDI 가 말한 항(CNXMN)에 화물이 **실제로 실려 있는** 갈래다.
        이것이 없으면 부분 되살림의 절반(_cand 필터·잔여 excluded·잔여 대수·되살린 대수 뺄셈)이
        전부 no-op 이라 넷을 망가뜨려도 검사가 안 잡는다. 호박색 «↘ 다만 …» 줄도 이 갈래에서만 뜬다. */
  {
    const E2 = JSON.parse(fs.readFileSync(path.resolve('tools/fixtures/shifting_pregone_edge2.json'), 'utf8'));
    const d2 = { bayDef: { baysSummary: E2.bay27 } };
    const mk = (c, over) => ({ key: 'K', info: { ...c.info, ...(over || {}) },
                               discharge: { raw: { edi: { text: c.text, fileName: 'X.ASC' } } } });

    const lo = E2.lost_only_case;
    const exL = U.predictShiftingFromVoyage(mk(lo), d2, { noRevert: true }) || {};
    const alL = U.predictShiftingFromVoyage(mk(lo, { lane: '' }), d2) || {};
    const kE = Object.keys(exL), kA = Object.keys(alL);
    ok(kE.length === 3 && kA.length === 2, `전제 — 제외본 ${kE.length}대 · 전체본 ${kA.length}대`);
    ok(kA.some((c) => !kE.includes(c)), '전제 — 되돌려 들어온 컨이 있다(gained > 0)');
    ok(kE.filter((c) => !kA.includes(c)).length === 2, '전제 — 사라진 컨이 2대다(lost > 0)');
    const gL = U.predictShiftingFromVoyage(mk(lo), d2) || {};
    ok(!(gL._meta && gL._meta.exReverted),
       '들어온 컨이 제외 대상 항이어도, 사라진 컨이 있으면 되돌리지 않는다');
    ok(Object.keys(gL).length === 3, '예측은 제외본 그대로(3대)');

    const pr = E2.partial_revert_case;
    const bayP = E2.bay27_orig ? { bayDef: { baysSummary: E2.bay27_orig } } : dict;
    const gP = U.predictShiftingFromVoyage(mk(pr), bayP) || {};
    const rv = gP._meta && gP._meta.exReverted;
    ok(!!rv, '되돌림 발동 — KRINC 은 사전이 덧붙인 항이다');
    ok(!!rv && rv.ports.join() === 'KRINC', '되살린 항은 KRINC 하나');
    ok(gP._meta && gP._meta.excludedCnt === 2, `CNXMN 화물 2대는 계속 뺀다 (${gP._meta && gP._meta.excludedCnt})`);
    ok(gP._meta && gP._meta.excluded && gP._meta.excluded.join() === 'CNXMN', '잔여 제외항이 CNXMN 으로 남는다');
    ok(gP._meta && gP._meta.preGone && gP._meta.preGone.list.join() === 'CNXMN',
       '화면 숨김도 CNXMN 만 — 되살린 KRINC 은 안 숨긴다');
    ok(gP._meta && gP._meta.rot === 'edi', '판정 근거는 EDI 실측으로 남는다(되돌려도 «미확인»이 아니다)');
  }

  console.log('[15] 화면이 판정을 따로 하지 않는다 (§4-4 · 감사 [중대]) — 소스 검사');
  {
    const vp = fs.readFileSync(path.resolve('src/pages/VoyagePage.jsx'), 'utf8');
    const calls = (vp.match(/(?<!\/\/.*)\bportsBeforePtk\s*\(/g) || []);
    ok(calls.length === 0, `VoyagePage 가 portsBeforePtk 를 직접 부르지 않는다 (${calls.length}곳)`);
    ok(/_meta\?\.preGone/.test(vp), 'VoyagePage 가 _meta.preGone 을 쓴다');
  }

  console.log(fail ? `\n⛔ smoke_pregone 실패 ${fail}건` : '\n✅ smoke_pregone 전부 통과');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('⛔ smoke_pregone 예외:', e); process.exit(1); });
