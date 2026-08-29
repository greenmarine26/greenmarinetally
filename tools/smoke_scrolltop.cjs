// TOP 버튼 연막검사 — 2.82-02 (검수사 지시 2026-08-29 «스크롤이 많이 생기는 화면에 항상 TOP을 넣어 주세요»)
//   ⛔ 두 벌 금지 — 정의는 src/components/ScrollTopButton.jsx **한 곳**뿐이어야 한다.
//     (1.81-01 때 수석 대시보드 안에 박혀 있던 것을 2.82-02 에서 공용으로 올렸다.)
const path = require('path');
const fs = require('fs');

(() => {
  let fail = 0;
  const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fail++; };
  const read = (f) => fs.readFileSync(path.resolve(f), 'utf8');

  console.log('[1] 공용 한 벌 — 정의가 한 곳뿐인가');
  const comp = read('src/components/ScrollTopButton.jsx');
  ok(/export default function ScrollTopButton/.test(comp), '컴포넌트 파일에 정의가 있다');
  ok(/window\.scrollY > 300/.test(comp), '300px 넘게 내려가면 뜬다');
  ok(/window\.scrollTo\(\{ top: 0, behavior: 'smooth' \}\)/.test(comp), '누르면 맨 위로(부드럽게)');
  ok(/catch \(e\) \{ window\.scrollTo\(0, 0\); \}/.test(comp), 'smooth 를 못 받는 기기 대비 폴백');
  ok(/passive: true/.test(comp), '스크롤 이벤트는 passive — 구르는 손을 붙잡지 않는다');
  ok(/removeEventListener/.test(comp), '떠날 때 이벤트를 뗀다(누수 방지)');

  console.log('[2] 스크롤이 긴 화면 넷에 다 붙었는가');
  const PAGES = ['HomePage', 'VoyagePage', 'GlobalSearchPage', 'ChiefDashboard'];
  for (const name of PAGES) {
    const src = read(`src/pages/${name}.jsx`);
    const used = (src.match(/<ScrollTopButton\s*\/>/g) || []).length;
    const imported = /import ScrollTopButton from '\.\.\/components\/ScrollTopButton\.jsx'/.test(src);
    ok(used === 1 && imported, `${name} — 붙음 ${used}개 · import ${imported ? 'O' : 'X'}`);
    //  화면 안에 사본을 다시 만들지 않았는지
    ok(!/function ScrollTopButton\s*\(/.test(src), `${name} — 사본 정의 없음(공용을 쓴다)`);
  }

  console.log('[3] 자리가 겹치지 않는가');
  //   버튼은 우하단 고정. 같은 자리를 쓰는 다른 «항상 떠 있는» 요소가 있으면 손가락이 헷갈린다.
  //   모달 안(fixed inset-0 …)은 화면을 덮으므로 대상이 아니다 — 상시 요소만 본다.
  for (const name of PAGES) {
    const src = read(`src/pages/${name}.jsx`);
    const others = (src.match(/fixed bottom-\d+ right-\d+/g) || []).filter((s) => !/bottom-5 right-4/.test(s));
    ok(others.length === 0, `${name} — 우하단을 다투는 상시 버튼 ${others.length}개`);
  }

  console.log(fail ? `\n✗ 실패 ${fail}건` : '\n✓ 전부 통과');
  process.exit(fail ? 1 : 0);
})();
