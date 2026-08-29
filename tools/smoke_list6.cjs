// 홈 항차 목록 «기본 6개» 연막검사 — 2.82 (검수사 지시 2026-08-29)
//   *«검수앱 홈화면 항차 목록도 기본 6개는 보이게 해주세요. 작업 일시 순으로»*
//   실측 2026-08-29: 활성 15항차 중 펼쳐지던 것이 **2개**뿐이었다(나머지는 D+2 이후라 접힘).
//
//   ⛔ 화면 컴포넌트 안 useMemo 라 함수를 직접 못 부른다 — ①소스 배선을 grep 으로 굳히고
//     ②같은 규칙을 실데이터 모양 픽스처로 재현해 결과 수를 센다. 둘 다 통과해야 한다.
const path = require('path');
const fs = require('fs');

(async () => {
  const U = await import(path.resolve('src/utils.js'));
  let fail = 0;
  const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fail++; };
  const home = fs.readFileSync(path.resolve('src/pages/HomePage.jsx'), 'utf8');
  const login = fs.readFileSync(path.resolve('src/pages/LoginPage.jsx'), 'utf8');

  console.log('[1] 배선 — 두 화면 다 6개를 바닥으로 깐다');
  ok(/const MIN_OPEN = 6;/.test(home), 'HomePage: MIN_OPEN = 6');
  ok(/return n === 0 \|\| n === 1 \|\| n === 2;/.test(home),
     'HomePage: isOpenVoyage 가 **모레(D+2)** 까지 연다 — 숫자가 아니라 날짜로');
  ok(/_past\(v\)/.test(home) && /지난 배는 접힘에 그대로 둔다/.test(home),
     'HomePage: 채울 때 지난 배는 건너뛴다');
  ok(/while \(o\.length < MIN_OPEN && f\.length\)/.test(home) && /f\.shift\(\)/.test(home) && !/\.sort\(/.test(home.split('const { openList, foldList }')[1].split('}, [list]);')[0]),
     'HomePage: 접힘 앞에서 끌어와 채운다(그 안에서 정렬을 다시 하지 않는다)');
  ok(/const MIN_SHOWN = 6;/.test(login), 'LoginPage: MIN_SHOWN = 6');
  ok(/boardShown/.test(login) && (login.match(/boardShown/g) || []).length >= 4,
     'LoginPage: boardShown 이 화면 목록에 배선됐다');
  ok(/ships: ships\.filter\(s => s\.rank < 3\)/.test(login),
     'LoginPage: board.ships 는 rank<3(작업중·당일·명일) — 타임라인 48시간 창의 뜻이 안 바뀐다');
  ok(/soon: ships\.filter\(s => s\.rank === 3\)/.test(login), 'LoginPage: 모레는 soon 으로 분리(목록에 항상 넣는다)');
  ok(/upcoming: ships\.filter\(s => s\.rank === 9\)/.test(login), 'LoginPage: 그 밖은 upcoming(6대 채울 때만)');
  ok(/boardRest/.test(login) && /그 밖 대기 \{boardRest\.n\}척/.test(login),
     'LoginPage: 안 보이는 나머지를 «그 밖 대기 N척» 으로 말한다(근무 배치가 일감을 오해하지 않게)');
  ok(/<WorkTimeline ships=\{board\.ships\}/.test(login),
     'LoginPage: 타임라인에는 차순을 안 넘긴다(48시간 창)');

  console.log('[2] 규칙 재현 — 실측 모양(오늘 2척 + 먼 배 13척)에서 6개가 되는가');
  const fmt = (d) => {
    const p2 = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  };
  const now = Date.now();
  const mk = (dayOffset, status) => ({
    info: { terminalStatus: status || 'planned',
            planDate: `${fmt(new Date(now + dayOffset * 86400e3))} ~ ${fmt(new Date(now + dayOffset * 86400e3 + 8 * 3600e3))}` },
  });
  //  isOpenVoyage 와 같은 판정(작업중 ∨ 당일 ∨ 명일). _etaMs 는 화면이 채우므로 여기선 planDate 로 센다.
  const isOpen = (v) => {
    if (U.isWorkingNow(v)) return true;
    const n = U.dayDiff(U.voyagePlanMs(v));
    return n === 0 || n === 1 || n === 2;   // 2.82-01: 모레까지
  };
  const fill = (arr, MIN) => {
    const o = [], f = [];
    for (const v of arr) (isOpen(v) ? o : f).push(v);
    while (o.length < MIN && f.length) o.push(f.shift());
    return { o, f };
  };
  {
    // 실측 2026-08-29 그대로: 당일·명일 2척 + D+2~D+6 13척
    const arr = [mk(1), mk(1, 'working'), mk(2), mk(2), mk(2), mk(2), mk(2), mk(3), mk(3), mk(4), mk(5), mk(5), mk(5), mk(6), mk(-11)];
    const { o, f } = fill(arr, 6);
    //  2.82-01: 당일·명일 2 + 모레 5 = 7 이 전부 펼쳐져야 한다(6에서 안 자른다).
    ok(o.length === 7, `실측 모양 — 당일·명일 2 + 모레 5 = 펼침 7개 (${o.length}) · 접힘 ${f.length}개`);
  }
  {
    // 6개보다 많으면 건드리지 않는다 — 오늘·내일이 8척이면 8척 그대로.
    const arr = [...Array(8)].map(() => mk(0)).concat([...Array(5)].map(() => mk(5)));
    const { o } = fill(arr, 6);
    ok(o.length === 8, `오늘·내일이 8척이면 8척 그대로 (${o.length})`);
  }
  {
    // 항차가 6개보다 적으면 있는 만큼만 — 없는 것을 지어내지 않는다.
    const arr = [mk(0), mk(4), mk(5)];
    const { o, f } = fill(arr, 6);
    ok(o.length === 3 && f.length === 0, `항차 3개면 3개 (${o.length}) · 접힘 0 (${f.length})`);
  }
  {
    // 오늘 작업이 아예 없을 때 — 검수사가 말한 «화면이 비어 보입니다» 그 경우.
    const arr = [...Array(9)].map((_, i) => mk(3 + i));
    const { o } = fill(arr, 6);
    ok(o.length === 6, `오늘 작업 0이어도 차순 6개 (${o.length})`);
  }

  console.log(fail ? `\n✗ 실패 ${fail}건` : '\n✓ 전부 통과');
  process.exit(fail ? 1 : 0);
})();
