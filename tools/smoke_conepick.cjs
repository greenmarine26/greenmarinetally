// 콘앱 선박 선택 접기 연막검사 — ConeOne 2.4 (검수사 지시 2026-08-29)
//   *«선박을 선택하면 그선박위주로 나와야 하는데 그 자료를 볼려면 다른 선박들을 다 위로 스크롤 해야
//     맨밑쪽에서 볼수가 있습니다»* · *«다른 선박을 볼려면 선박선택화면을 클릭하면 볼수있게»*
//
//   ⛔ 「코드가 그럴듯하다」로 끝내지 않는다 — 목록을 그리는 규칙을 **실제로 돌려** 카드 수를 센다.
const path = require('path');
const fs = require('fs');

(() => {
  let fail = 0;
  const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fail++; };
  const src = fs.readFileSync(path.resolve('public/cone.html'), 'utf8');

  console.log('[1] 배선');
  ok(/const _fold = !!_cur && !state\.voyPickOpen;/.test(src), '고른 배가 있고 안 펼쳤으면 접힘(_fold)');
  ok(/const _items = _fold \? \[_cur\] : state\.voyages;/.test(src), '접히면 그 배 한 장만 그린다');
  ok(/for\(const v of _items\)\{/.test(src), '목록 루프가 _items 를 돈다(state.voyages 를 통째로 돌지 않는다)');
  ok(/id="voyPickOpen"/.test(src) && /다른 선박 고르기/.test(src), '«다른 선박 고르기» 버튼이 있다');
  ok(/state\.voyageKey===vk && !state\.voyPickOpen\)\{ state\.voyPickOpen=true; render\(\); return; \}/.test(src),
     '접힌 카드를 누르면 목록이 펼쳐진다(검수사 «선박선택화면을 클릭하면»)');
  ok(/state\.voyPickOpen=false;/.test(src), '배를 고르면 다시 접힌다');
  ok(/눌러서 다른 선박/.test(src), '접힌 카드에 «눌러서 다른 선박» 안내가 붙는다');
  //  ⚠ 버전을 숫자로 박지 않는다 — 다음 판마다 이 검사가 막힌다(2.5 올릴 때 실제로 걸렸다).
  //    이 기능이 들어간 2.4 **이상**이면 통과. 폰 캐시 갱신은 build.sh 가 __CONEV 로 처리한다.
  {
    const m = src.match(/window\.__CONEV='ConeOne (\d+)\.(\d+)'/);
    const okv = !!m && (Number(m[1]) > 2 || (Number(m[1]) === 2 && Number(m[2]) >= 4));
    ok(okv, `콘앱 버전이 2.4 이상 (${m ? m[1] + '.' + m[2] : '못 읽음'})`);
  }

  console.log('[1-B] 2.6~2.7 — 콘 계산과 시프팅의 관계를 화면이 말하는가');
  //   검수사 물음 «콘앱에 콘 계산도 시프팅 갯수도 포함되는게 맞는지요» → 맞다.
  //   2.6 은 «빠졌다»고 알리기만 했고, **2.7 이 실제로 합쳤다.** 화면은 그 사실을 말해야 한다.
  ok(/function computeConeShiftInfo\(\)/.test(src), '시프팅 요약 함수가 있다');
  ok(/window\.__coneShiftInfo = computeConeShiftInfo\(\);/.test(src), '계산 결과를 그릴 때 요약을 채운다');
  //  ⚠ 2.7 에서 «안 들어갔다» → «포함됐다» 로 바뀌었다. 낡은 문구를 그대로 검사하면 여기서 막힌다.
  //    (2.6 은 계산 엔진을 안 건드리고 안내만 했고, 2.7 이 실제로 합쳤다.)
  ok(/다시 싣는 자리는 갑판/.test(src), '다시 놓는 자리(갑판/홀드)를 알려 준다');
  ok(/berthShift: _v\.berthShift/.test(src) && (src.match(/berthShift: _v\.berthShift/g) || []).length >= 2,
     '요약도 배정표 정본을 쓴다(카고플랜과 같은 수를 말한다)');

  console.log('[1-C] 2.7 — 시프팅이 내림·실음 **양쪽에** 들어가는가');
  //   검수사 확정 «콘앱 양하는 279+95 선적은 213+95 양하374/선적308개로 기록되어야 맞는데»
  //   근거 «콘앱은 양하분인지 선적분인지 구분 하지 않습니다. 내리고 실고 두가지뿐이지요»
  ok(/내리는 것 = 평택 양하\(POD 평택\) \+ \*\*시프팅\*\*/.test(src), '규칙이 주석에 못 박혀 있다(내림=평택양하+시프팅)');
  ok(/sd\.ediRows\.push\(Object\.assign\(\{\}, row, \{ _shift:true \}\)\)/.test(src),
     '시프팅 컨을 ediRows 에 합친다(콘 계산이 자리째 센다)');
  ok(/if\(have\.has\(cn\)\) continue;/.test(src), '이미 있으면 두 번 세지 않는다');
  ok(/if\(!row \|\| row\.bay==null \|\| row\.tier==null\) continue;/.test(src), '자리 없는 것은 안 넣는다(자리를 지어내지 않는다)');
  ok(/const nD=_add\(state\.disch,_dAll,'양하'\), nL=_add\(state\.stow,_lAll,'선적'\);/.test(src),
     '양하는 «내린 자리(from)» · 선적은 «실은 자리(to)» 로 각각 합친다');
  ok(/포함<\/span>돼 있습니다/.test(src), '결과 화면이 «포함됐다»고 말한다(2.6 의 «안 들어갔다»를 갱신)');
  ok(/평택 \$\{_dn-_sa\.disch\} \+ 시프팅 \$\{_sa\.disch\}/.test(src), '상태줄이 «평택 279 + 시프팅 95» 로 내역을 밝힌다');

  console.log('[1-D] 이중 계산이 없는가 — 콘앱이 합친 것이 카고플랜에 또 더해지지 않는다');
  //   콘앱은 콘 계산용 `ediRows` 에 시프팅을 합친다(2.7). 카고플랜은 **`ediRowsAll`(전체)** 를 넘기므로
  //   서로 다른 배열이다. 게다가 카고플랜의 평택분 카운트(matchPodC)는 pod/pol 평택으로 세니
  //   통과화물인 시프팅은 애초에 안 걸린다 — «양하 279 · 쉬프팅 95 · 작업분 374» 가 그대로 나온다.
  //   ⚠ 여기가 깨지면 화면이 «양하 374 · 쉬프팅 95 · 작업분 469» 로 두 번 센다.
  ok(/const rows = sd && \(sd\.ediRowsAll && sd\.ediRowsAll\.length \? sd\.ediRowsAll : sd\.ediRows\);/.test(src),
     '콘앱 카고플랜은 ediRowsAll(전체)을 넘긴다 — 합친 ediRows 가 아니다');
  {
    const cpv2 = fs.readFileSync(path.resolve('src/components/PrintableCargoPlanV2.jsx'), 'utf8');
    ok(/const _ptkCount = \(containers \|\| \[\]\)\.filter\(\(c\) => c && matchPodC\(c\)\)\.length;/.test(cpv2),
       '카고플랜 평택분은 matchPodC(pod/pol 평택)로만 센다 — 시프팅은 안 걸린다');
    ok(/작업분 \{_ptkCount \+ shiftCount\}/.test(cpv2), '검수앱 문구는 «작업분»(검수사 확정)');
  }

  console.log('[2] 규칙 재현 — 15척에서 몇 장이 그려지는가');
  //   화면 함수를 통째로 못 부르므로 그 판정 두 줄만 그대로 옮겨 돌린다.
  const voyages = [...Array(15)].map((_, i) => ({ key: `SHIP${i}_100${i}E`, vsl: `SHIP${i}` }));
  const draw = (state) => {
    const _cur = state.voyageKey ? voyages.find(v => v.key === state.voyageKey) : null;
    const _fold = !!_cur && !state.voyPickOpen;
    return { n: (_fold ? [_cur] : voyages).length, fold: _fold };
  };
  {
    const r = draw({ voyageKey: '', voyPickOpen: false });
    ok(r.n === 15 && !r.fold, `아직 안 골랐으면 15장 전부 (${r.n})`);
  }
  {
    const r = draw({ voyageKey: 'SHIP7_1007E', voyPickOpen: false });
    ok(r.n === 1 && r.fold, `골랐으면 그 배 1장 (${r.n}) — 14장을 굴리지 않는다`);
  }
  {
    const r = draw({ voyageKey: 'SHIP7_1007E', voyPickOpen: true });
    ok(r.n === 15 && !r.fold, `«다른 선박»을 누르면 다시 15장 (${r.n})`);
  }
  {
    //  고른 배가 목록에서 사라진 경우(새로고침으로 항차가 빠짐) — 접지 않고 전체를 보인다.
    const r = draw({ voyageKey: 'GONE_9999E', voyPickOpen: false });
    ok(r.n === 15 && !r.fold, `고른 배가 목록에 없으면 전체 (${r.n}) — 빈 화면이 되지 않는다`);
  }

  console.log('[3] 대수 재현 — MCSC 633N 모양에서 374 / 308 이 되는가');
  {
    //   실측 2026-08-29: 평택 양하 279 · 평택 선적 213 · 시프팅 95(전부 자리 있음)
    const mkRows = (n, tag) => [...Array(n)].map((_, i) => ({ cn: `${tag}${String(1000000 + i)}`, bay: '22', tier: '82' }));
    const ptkD = mkRows(279, 'PTKD'), ptkL = mkRows(213, 'PTKL');
    const shiftCns = [...Array(95)].map((_, i) => `SHFT${String(1000000 + i)}`);
    const dAll = {}, lAll = {};
    for (const cn of shiftCns) { dAll[cn] = { cn, bay: '18', tier: '90' }; lAll[cn] = { cn, bay: '34', tier: '84' }; }
    const add = (rows, allMap) => {
      const have = new Set(rows.map(r => r.cn));
      let n = 0;
      for (const cn of shiftCns) {
        if (have.has(cn)) continue;
        const row = allMap[cn];
        if (!row || row.bay == null || row.tier == null) continue;
        rows.push({ ...row, _shift: true }); n++;
      }
      return n;
    };
    const nD = add(ptkD, dAll), nL = add(ptkL, lAll);
    ok(ptkD.length === 374 && nD === 95, `내림 279 + 시프팅 95 = ${ptkD.length} (더한 ${nD})`);
    ok(ptkL.length === 308 && nL === 95, `실음 213 + 시프팅 95 = ${ptkL.length} (더한 ${nL})`);
    //  두 번 돌려도 늘지 않는다(중복 방지)
    const again = add(ptkD, dAll);
    ok(again === 0 && ptkD.length === 374, `다시 합쳐도 그대로 374 (더한 ${again})`);
  }

  console.log(fail ? `\n✗ 실패 ${fail}건` : '\n✓ 전부 통과');
  process.exit(fail ? 1 : 0);
})();
