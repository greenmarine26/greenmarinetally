// 실시간 작업 보드 카드(3.10) — jsdom 으로 실제 그리고 눌러 본다. 실패하면 빌드를 세운다.
//   ① 오른쪽 호기 칸에 그 호기가 지금 작업 중인 **베이 그림**(BayPlan onlyBay — BAY 머리·끝4자리·완료 초록)이 실데이터대로 선다 ② 왼쪽 별첨 «완료/전체»가 인쇄 별첨과 같은 분모다 ③ 카드를 누르면 포커스, [✕ 닫기]·[항차 열기 →] ④ 터미널 표기가 이름 칸에 없다
const { JSDOM } = require('jsdom');
const fs = require('fs');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(e.message));
console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
try { dom.window.eval(fs.readFileSync(process.argv[2], 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  await wait(500);
  const doc = dom.window.document, W = dom.window;
  const fail = (m) => { console.log('✗ ' + m); process.exit(1); };
  const uniq = [...new Set(errs)];
  if (uniq.length) { console.log('✗ 렌더 중 오류 ' + uniq.length + '건'); uniq.slice(0, 3).forEach(e => console.log('   ' + e)); process.exit(1); }
  const txt = () => doc.body.textContent || '';
  let t = txt();
  if (!/DJCT/.test(t)) fail('카드가 안 떴다: ' + t.slice(0, 120));
  if (!/호기별 작업 베이/.test(t)) fail('오른쪽 «호기별 작업 베이» 칸이 없다');
  if (!/1호기/.test(t)) fail('1호기가 없다: ' + t.slice(0, 300));
  if (!/2호기/.test(t)) fail('2호기가 없다');
  if (!/(양하|선적) \d+대/.test(t)) fail('호기별 대수가 없다');
  if (/CATOS|카토스/.test(t)) fail('카드에 터미널(CATOS) 글자가 있다');
  if (!/미등록/.test(t)) fail('조 등록 전 이름 칸이 «미등록»이 아니다');
  //  호기 칸이 옆으로(2칸 격자)
  const grid = doc.querySelector('.grid-cols-2');
  if (!grid) fail('호기 2개가 옆으로(grid-cols-2) 안 선다');
  //  ★ 3.11 — 호기 칸에 **베이 그림**(베이플랜 BayPage — «BAY (20)21» 머리·칸·완료 초록)이 실제로 선다
  const FX = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'fixtures', 'craneboard_djct.json'), 'utf8'));
  const lastByEq = {}; for (const tw of [FX.termWork, FX.loading_termWork || {}]) for (const [cn, r] of Object.entries(tw)) { if (!r || !r.at || String(r.pos || '').length !== 6) continue; const e = r.equip; if (!lastByEq[e] || r.at > lastByEq[e].at) lastByEq[e] = { at: r.at, bay: parseInt(String(r.pos).slice(0, 2), 10), cn }; }   // 3.12-01: 양하·선적 중 최신
  const bays = Object.values(lastByEq).map(x => x.bay);
  const titles = [...doc.querySelectorAll('*')].map(n => n.childNodes.length === 1 && n.firstChild.nodeType === 3 ? n.textContent.trim() : '').filter(t => /^BAY /.test(t));
  if (titles.length < 2) fail('베이 그림 머리(BAY …)가 2장 안 선다: ' + JSON.stringify(titles));
  //  검수사 «베이 3 (4)5 11 (12)13을 다» — 호기마다 그 해치(40ft E 와 E-1·E+1)의 장 전부: 13 → 11·(12)13, 4 → 03·(04)05
  for (const b of bays) {
    const pairedOdd = new Set((FX.bayDict.bayDef.baysSummary || []).filter(x => x.pairEven).map(x => parseInt(x.bay, 10)));   // 사전의 «짝수+뒤홀수» 짝
    const E = b % 2 === 0 ? b : (pairedOdd.has(b) ? b - 1 : b + 1);
    const need = [String(E - 1).padStart(2, '0'), `(${String(E).padStart(2, '0')})${String(E + 1).padStart(2, '0')}`];
    for (const n of need) if (!titles.some(t => t === 'BAY ' + n)) fail(`호기 베이 ${b} 의 해치 장 «BAY ${n}» 이 없다(머리 ${JSON.stringify(titles)})`);
  }
  const green = doc.querySelectorAll('.border-emerald-400, .border-emerald-500').length;
  if (!green) fail('완료 컨 초록 칸이 하나도 없다');
  const cells4 = [...doc.querySelectorAll('span,div')].filter(n => n.childNodes.length === 1 && /^\d{4}$/.test(n.textContent.trim())).length;
  if (cells4 < 10) fail('칸 안 끝4자리가 안 보인다(' + cells4 + ')');
  //  ★ 3.11 — 왼쪽 별첨 «완료/전체» — 검수사 인쇄 별첨(DJCT 0223E)과 같은 분모: DJS 125 · SKR 81 · HAS 32 · DYS 7 · HSL 6 · 합계 251 · 20' F 80 E 30 · 40' F 141
  t = txt();
  for (const need of ['별첨1 · 선사별', '별첨2 · 화물 종류별', '별첨3 · 규격별 F/E', 'DJS', 'SKR', 'HAS', 'DYS', 'HSL', 'Reefer']) if (!t.includes(need)) fail('별첨에 «' + need + '» 가 없다');
  const rowsT = [...doc.querySelectorAll('tr')].map(tr => { const tds = [...tr.querySelectorAll('td')].map(td => td.textContent.trim()); const out = [tds[0]]; for (let i = 1; i < tds.length; i += 2) out.push(tds[i] + (tds[i + 1] || '')); return out; });   // 3.11: 완료·/전체 두 칸(«/» 세로 정렬)을 합쳐 읽는다
  //  «/» 세로 정렬 — 완료 칸은 오른맞춤·/전체 칸은 왼맞춤이라야 한다
  const slashTds = [...doc.querySelectorAll('td')].filter(td => /^\/\d+$/.test(td.textContent.trim()));
  if (!slashTds.length || !slashTds.every(td => /text-left/.test(td.className) && /text-right/.test(td.previousElementSibling.className))) fail('별첨 «/» 칸이 세로로 안 맞는다(완료 오른맞춤·/전체 왼맞춤)');
  const findRow = (k) => rowsT.find(r => r[0] === k);
  const den = (cell) => parseInt(String(cell).split('/')[1] || '0', 10), num = (cell) => parseInt(String(cell).split('/')[0] || '0', 10);
  const djs = findRow('DJS'), skr = findRow('SKR'), sum1 = rowsT.filter(r => r[0] === '합계')[0], r20 = findRow("20'"), r40 = findRow("40'");
  if (!djs || den(djs[1]) !== 83 || den(djs[2]) !== 42 || den(djs[3]) !== 125) fail('별첨1 DJS 분모가 83/42/125 가 아니다: ' + JSON.stringify(djs));
  if (!skr || den(skr[1]) !== 15 || den(skr[2]) !== 66 || den(skr[3]) !== 81) fail('별첨1 SKR 분모가 15/66/81 이 아니다: ' + JSON.stringify(skr));
  if (!sum1 || den(sum1[1]) !== 110 || den(sum1[2]) !== 141 || den(sum1[3]) !== 251) fail('별첨1 합계 분모가 110/141/251 이 아니다: ' + JSON.stringify(sum1));
  if (!r20 || den(r20[1]) !== 80 || den(r20[2]) !== 30 || den(r20[3]) !== 110) fail("별첨3 20' 분모가 80/30/110 이 아니다: " + JSON.stringify(r20));
  if (!r40 || den(r40[1]) !== 141 || den(r40[2]) !== 0 || den(r40[3]) !== 141) fail("별첨3 40' 분모가 141/0/141 이 아니다: " + JSON.stringify(r40));
  //  3.12: 선적은 표 넷 — 별첨4 목적지별(DJCT 0224W = HPH 274)
  for (const need of ['별첨1 · 선사별 (선적)', '별첨2 · 화물 종류별 (선적)', '별첨3 · 규격별 F/E (선적)', '별첨4 · 목적지별 (선적)']) if (!t.includes(need)) fail('선적 별첨에 «' + need + '» 가 없다');
  const hph = findRow('HPH'); if (!hph || den(hph[3]) !== 274) fail('별첨4 HPH 분모가 274 가 아니다: ' + JSON.stringify(hph));
  //  ★ 3.12-01: 한 칸에 «실린 컨 + 안 실린 계획 컨»이면 실린 컨이 앞 — DJCT 0224W 실측 19-06-04: 실린 DJLU2181897 vs 계획 DYLU2125641
  {
    const twL = FX.loading_termWork || {}; const ediL = FX.loadingEdi || {};
    const loadedAt = {}; for (const [cn, r] of Object.entries(twL)) if (r && r.at && String(r.pos || '').length === 6) loadedAt[cn] = String(r.pos);
    const planned = {}; for (const [cn, e] of Object.entries(ediL)) planned[String(e.bay).padStart(2, '0') + String(e.row).padStart(2, '0') + String(e.tier).padStart(2, '0')] = cn;
    const pairs = Object.entries(loadedAt).map(([cn, pos]) => [cn, planned[pos]]).filter(([cn, p]) => p && p !== cn && !loadedAt[p]);
    if (!pairs.length) fail('픽스처에 «실린 컨 + 안 실린 계획 컨» 겹침이 없다(검사 무의미)');
    const shownSet = new Set([...doc.querySelectorAll('span,div')].filter(n => n.childNodes.length === 1 && /^\d{4}$/.test(n.textContent.trim())).map(n => n.textContent.trim()));
    //  3.13: 밀려난 계획 컨은 **비운 자리로 옮겨 보인다**(하늘색 테두리) — 둘 다 보이고, 겹침(⊕)이 없다
    const sky = [...doc.querySelectorAll('.border-sky-400')].map(n => n.textContent.trim());
    for (const [cn, p] of pairs) {
      const l4 = cn.slice(-4), p4 = p.slice(-4);
      if (!shownSet.has(l4)) fail(`실린 컨 ${cn} 이 그림에 안 보인다`);
      if (!shownSet.has(p4)) fail(`밀려난 계획 컨 ${p} 가 그림에 안 보인다(검수사 «남은 컨 넘버를 확인 할수가 있어야»)`);
      if (!sky.some(t => t.includes(p4))) fail(`밀려난 계획 컨 ${p} 가 하늘색(옮겨 온 자리) 테두리가 아니다`);
    }
    const stacks = [...doc.querySelectorAll('span,div')].filter(n => n.childNodes.length === 1 && /^⊕\d+$/.test(n.textContent.trim())).length;
    if (stacks) fail(`겹친 칸(⊕)이 ${stacks}개 남아 있다 — 검수사 «컨테이너가 겹쳐 있어도 안됩니다»`);
    console.log(`   밀려난 계획 컨 ${pairs.length}대 → 비운 자리로(하늘색): ${pairs.map(([a, b]) => b.slice(-4) + '←' + a.slice(-4)).join(' · ')} · 겹침 0`);
  }
  const doneAll = Object.values(FX.completed).filter(c => c && c.at).length;
  if (num(sum1[3]) !== doneAll) fail(`별첨1 합계 완료 ${num(sum1[3])} ≠ completed ${doneAll}`);
  //  ★ 표 셋이 같은 열 수(«/» 가 표 사이에서도 한 세로줄) · 그림은 FitBox(transform scale ≤ 1) 안
  const tables = [...doc.querySelectorAll('table')]; const colCounts = tables.map(tb => tb.querySelectorAll('col').length);
  if (tables.length < 3 || new Set(colCounts).size !== 1) fail('별첨 표 셋의 열 수가 다르다: ' + JSON.stringify(colCounts));
  const fits = [...doc.querySelectorAll('[style*="transform-origin: top left"], [style*="transform-origin:top left"]')];
  if (fits.length < 2) fail('그림을 칸에 맞추는 FitBox 가 호기마다 없다(' + fits.length + ')');
  if (!fits.every(f => { const m = /scale\(([\d.]+)\)/.exec(f.style.transform || ''); return m && parseFloat(m[1]) <= 2.5001 && parseFloat(m[1]) > 0; })) fail('FitBox 배율이 0~2.5 밖이다');
  //  ★ 칸 클릭 → 컨 상세 콜백(베이플랜과 같은 모달로 이어진다) — 항차 열기가 아니다
  const cell4 = [...doc.querySelectorAll('span,div')].find(n => n.childNodes.length === 1 && /^\d{4}$/.test(n.textContent.trim()));
  const before0 = (W.__calls || []).length;
  cell4.dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
  await wait(150);
  const det = (W.__calls || []).slice(before0).find(c => c.fn === 'detail');
  if (!det || !det.cn || !det.mode) fail('칸을 눌렀는데 컨 상세 콜백(detail)이 안 온다: ' + JSON.stringify((W.__calls || []).slice(before0)));
  if ((W.__calls || []).slice(before0).some(c => c.fn === 'focus')) fail('칸 클릭이 카드 포커스까지 토글한다');
  console.log(`   베이 그림 ${titles.length}장(${titles.join(' · ')}) · 초록 ${green}칸 · 별첨1 합계 ${sum1.slice(1).join(' ')} · DJS ${djs.slice(1).join(' ')} · 표 열 ${colCounts[0]} · 칸 클릭 → 상세 ${det && det.cn}`);
  //  ★ 3.20-04 — **크게 보는 문이 눈에 보이는가.** 검수사 «크게 하는 버튼이 없고 닫는 버튼도 없습니다» ·
  //    «두척이니 작게 보이고 원할때는 한척 작업하는것처럼 크게 보고 닫음 처음처럼 두척이 보이게».
  //    기능(포커스)은 3.10 부터 있었는데 «카드를 아무 데나 누르면» 뿐이었다 — 카드 안이 표와 그림으로 꽉 차 있고
  //    그림 칸은 컨 상세로 가므로 누를 빈 곳이 사실상 없었다. 단추가 실제로 서 있는지 여기서 잰다.
  {
    const big = [...doc.querySelectorAll('button')].find(b => /⤢ 크게/.test(b.textContent || ''));
    if (!big) fail('[⤢ 크게] 버튼이 없다 — 크게 보는 문이 눈에 안 보인다');
    const n0 = (W.__calls || []).filter(c => c.fn === 'focus').length;
    big.dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
    await wait(150);
    if ((W.__calls || []).filter(c => c.fn === 'focus').length !== n0 + 1) fail('[⤢ 크게] 가 포커스를 안 건다');
    if ((W.__calls || []).some(c => c.fn === 'open')) fail('[⤢ 크게] 가 항차까지 연다(stopPropagation 누락)');
    await wait(150);
    if (/⤢ 크게/.test(txt())) fail('포커스인데 [⤢ 크게] 가 그대로다 — 그 자리는 [✕ 닫기] 여야 한다');
    W.__setFocused && W.__setFocused(false);   // 다음 항을 위해 되돌린다
    await wait(150);
  }

  //  카드 누르기 → 포커스 → [✕ 닫기]
  const card = doc.querySelector('[role="button"]');
  if (!card) fail('카드 루트가 없다');
  card.dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
  await wait(200);
  if (!(W.__calls || []).some(c => c.fn === 'focus')) fail('카드를 눌렀는데 포커스가 안 된다');
  //  3.20-04: 카드 클릭이 **항차를 열면 안 된다** — 검수사 «가고 싶을때 가야 하는데 클릭한번 실수로»
  //    · «수석에서 일반 검수앱을 왔다 갔다 하면 안됩니다». 3.10 의 onOpen 폴백을 걷은 자리다.
  if ((W.__calls || []).some(c => c.fn === 'open')) fail('카드를 눌렀는데 항차 화면으로 넘어간다');
  {
    const src = fs.readFileSync(require('path').resolve('src/pages/ChiefDashboard.jsx'), 'utf8');
    if (/const clickCard[^\n]*onOpen\(\)/.test(src)) fail('clickCard 에 onOpen 폴백이 남아 있다');
  }
  t = txt();
  if (!/✕ 닫기/.test(t)) fail('포커스 뒤 [✕ 닫기] 가 없다');
  //  [항차 열기 →] 는 항차로(카드 포커스 토글을 건드리지 않는다)
  const openBtn = [...doc.querySelectorAll('button')].find(b => /항차 열기/.test(b.textContent || ''));
  if (!openBtn) fail('[항차 열기 →] 버튼이 없다');
  const before = (W.__calls || []).filter(c => c.fn === 'focus').length;
  openBtn.dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
  await wait(100);
  if (!(W.__calls || []).some(c => c.fn === 'open')) fail('[항차 열기 →] 가 항차를 안 연다');
  if ((W.__calls || []).filter(c => c.fn === 'focus').length !== before) fail('[항차 열기 →] 가 포커스까지 토글한다(stopPropagation 누락)');
  //  [✕ 닫기] → 포커스 해제
  const closeBtn = [...doc.querySelectorAll('button')].find(b => /닫기/.test(b.textContent || ''));
  closeBtn.dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
  await wait(200);
  if (/✕ 닫기/.test(txt())) fail('[✕ 닫기] 뒤에도 닫기 버튼이 남는다');
  //  ★ 3.35 — **베이 표기 글자가 배율 밖에 있고 크다.**
  //    검수사 2026-09-09 «베이표기 글자 이야기 입니다» · «한눈에 들어 오게 하되 베이크기 확대 축소에 상관없이 크게».
  //    그림은 FitBox 가 transform: scale() 로 줄인다 — 제목이 그 안에 있으면 같이 줄어 6~8px 이 된다(옛 판).
  {
    //  FitBox 의 안쪽 상자 — `transform: … scale(s)` 이 걸린 자리(jsdom 은 속성 문자열로 남긴다).
    const scaled = [...doc.querySelectorAll('div')].filter(x => /scale\(/.test(x.getAttribute('style') || ''));
    if (!scaled.length) fail('FitBox 의 scale() 상자를 못 찾았다 — 이 검사가 헛돈다');
    const bigs = [...doc.querySelectorAll('span')].filter(x => /^BAY[\s(]/.test((x.textContent || '').trim()));
    if (!bigs.length) fail('«BAY …» 큰 글자가 없다 — 제목을 배율 밖에서 안 그린다');
    for (const b of bigs) {
      const px = parseFloat((b.getAttribute('style') || '').match(/font-size:\s*([\d.]+)px/)?.[1] || '0');
      if (!(px >= 16)) fail(`베이 표기가 작다 — ${b.textContent} ${px}px (16px 이상이어야 한다)`);
      if (scaled.some(sc => sc.contains(b))) fail(`«${b.textContent}» 가 scale() 안에 있다 — 그림을 줄이면 같이 줄어든다`);
    }
    //  그림 안 옛 제목은 감춰야 두 번 안 나온다
    const inner = scaled.flatMap(sc => [...sc.querySelectorAll('div')])
      .filter(x => /^BAY[\s(]/.test((x.textContent || '').trim()) && !x.querySelector('div'));
    if (inner.length) fail(`그림 안에 옛 제목이 ${inner.length}개 남아 두 번 나온다`);
    console.log(`  ✓ 베이 표기 ${bigs.length}개가 배율 밖에서 ${bigs.map(b => (b.getAttribute('style')||'').match(/font-size:\s*([\d.]+)px/)?.[1]).join('·')}px`);
  }
  //  ★ 3.35 — **크기 자는 한 벌**이고 호기가 늘면 작아진다(24·18·16). 접힌 기본은 3칸까지라 24 만 보이므로
  //    자 자체를 소스에서 꺼내 잰다 — 4·5호기 갈래를 아무도 안 재던 구멍이었다(감사 실측 S9).
  {
    const src2 = fs.readFileSync(require('path').resolve('src/pages/ChiefDashboard.jsx'), 'utf8');
    const m = src2.match(/export const boardTitlePx = \(n\) => \(([^;]+)\);/);
    if (!m) fail('boardTitlePx 자를 소스에서 못 찾았다');
    const f = new Function('n', 'return (' + m[1] + ');');
    if (!(f(1) === 24 && f(3) === 24 && f(4) === 18 && f(5) === 16 && f(6) === 16)) {
      fail('크기 자가 어긋난다 — 1:' + f(1) + ' 3:' + f(3) + ' 4:' + f(4) + ' 5:' + f(5) + ' 6:' + f(6));
    }
    const uses = (src2.match(/boardTitlePx\(/g) || []).length;
    if (uses < 2) fail('두 갈래(호기별·동방)가 다 그 자를 쓴다 — 지금 ' + uses + '곳');
    console.log('  ✓ 베이 표기 크기 자 한 벌 — 3대까지 ' + f(3) + ' · 4대 ' + f(4) + ' · 5대 ' + f(5) + 'px, 두 갈래가 같이 쓴다');
  }
  //  ★ 3.35 — 폰 경로의 줄 예산(`fitMaxH`)에서 **베이 표기 줄 높이를 뺀다.**
  //    안 빼면 칸이 예산보다 그 높이만큼 커져 검수사 «스크롤 없는 상태에서 최적의 화면»(3.11)이 깎인다(감사 지적).
  //    ⚠ jsdom 은 레이아웃이 없어 이 차이를 그림으로는 못 잰다 — 그래서 **소스 모양**으로 못 박는다.
  {
    const src3 = fs.readFileSync(require('path').resolve('src/pages/ChiefDashboard.jsx'), 'utf8');
    const fm = src3.match(/const fitMaxH = React\.useCallback\(\(\) => \{[\s\S]*?\n  \}, \[[^\]]*\]\);/);
    if (!fm) fail('fitMaxH 를 소스에서 못 찾았다');
    if (!/titleRow/.test(fm[0])) fail('⛔ fitMaxH 가 베이 표기 줄 높이를 안 뺀다 — 칸이 예산보다 커진다');
    if (!/- 60 - titleRow/.test(fm[0])) fail('⛔ fitMaxH 의 마지막 셈에서 titleRow 를 안 뺀다');
    const tr = fm[0].match(/const titleRow = Math\.ceil\((\d+) \* 1\.05\) \+ (\d+);/);
    if (!tr) fail('titleRow 를 «가장 큰 고정 px × 줄높이 + 여백» 으로 안 낸다');
    const src4 = src3.match(/export const boardTitlePx = \(n\) => \(([^;]+)\);/);
    const f2 = new Function('n', 'return (' + src4[1] + ');');
    const big = Math.max(f2(1), f2(3), f2(4), f2(5));
    if (parseInt(tr[1], 10) !== big) fail(`titleRow 가 가장 큰 표기(${big}px)를 기준으로 하지 않는다 — 지금 ${tr[1]}px`);
    console.log(`  ✓ 폰 줄 예산이 베이 표기 줄(${Math.ceil(big * 1.05) + parseInt(tr[2], 10)}px)을 뺀다`);
  }
  //  ★ 3.35 — `hideTitle` 은 **보드만** 켠다. 기본값이 뒤집히면 베이플랜 탭·카고플랜의 베이 번호가 통째로 사라진다(감사 S10).
  {
    const bp = fs.readFileSync(require('path').resolve('src/components/BayPlan.jsx'), 'utf8');
    if (!/function BayPage\(\{ hideTitle = false,/.test(bp)) fail('⛔ BayPage 의 hideTitle 기본값이 false 가 아니다 — 다른 화면의 베이 번호가 사라진다');
    if (!/titleOut = false,/.test(bp)) fail('⛔ BayPlan 의 titleOut 기본값이 false 가 아니다');
    const hidden = (bp.match(/hideTitle=\{/g) || []).length;
    if (hidden !== 1) fail('hideTitle 을 넘기는 곳은 보드용 한 곳뿐이어야 한다 — 지금 ' + hidden + '곳');
    console.log('  ✓ 제목 감추기는 보드용 한 곳뿐 — 다른 화면은 종전대로 그림 안에 베이 번호가 있다');
  }
  console.log('✓ 실시간 작업 보드 카드 렌더 연막검사 통과 (호기별 베이 그림 · 별첨 완료/전체 · 포커스/닫기/항차 열기)');
  process.exit(0);
})();
