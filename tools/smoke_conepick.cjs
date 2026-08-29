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

  console.log(fail ? `\n✗ 실패 ${fail}건` : '\n✓ 전부 통과');
  process.exit(fail ? 1 : 0);
})();
