// 동방(PNCT) 보드 카드(3.15) — jsdom 으로 실제 그려 «지금 작업 중인 베이» 칸과 베이 그림이 서는지 본다. 실패하면 빌드를 세운다.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(e.message));
console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
try { dom.window.eval(fs.readFileSync(process.argv[2], 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await wait(600);
  const doc = dom.window.document;
  const fail = (m) => { console.log('✗ ' + m); process.exit(1); };
  const uniq = [...new Set(errs)];
  if (uniq.length) { console.log('✗ 렌더 중 오류 ' + uniq.length + '건'); uniq.slice(0, 3).forEach((e) => console.log('   ' + e)); process.exit(1); }
  const txt = () => doc.body.textContent || '';
  const t = txt();
  console.log('동방 보드 카드(3.15) — OBWH 2731E 실데이터');
  if (!/OBWH/.test(t)) fail('카드가 안 떴다: ' + t.slice(0, 120));
  //  ① 칸 제목이 «호기별»이 아니라 «지금 작업 중인 베이»
  if (!/지금 작업 중인 베이/.test(t)) fail('«지금 작업 중인 베이» 칸이 없다: ' + t.slice(0, 400));
  if (/호기별 작업 베이/.test(t)) fail('동방인데 «호기별 작업 베이» 칸이 섰다 — 호기→베이를 이을 자료가 없다');
  if (/그림이 없습니다|자리 없음/.test(t)) fail('아직 «그림 없음»이라고 적는다: ' + t.slice(0, 300));
  console.log('  ✓ 칸 제목이 «지금 작업 중인 베이»');
  //  ② 호기별 대수는 머리줄에 남는다(QC101 110+147=257 → 1호기 · QC103 78+135=213 → 3호기)
  if (!/1호기 257대/.test(t)) fail('머리줄에 «1호기 257대»가 없다: ' + t.slice(0, 400));
  if (!/3호기 213대/.test(t)) fail('머리줄에 «3호기 213대»가 없다');
  console.log('  ✓ 호기별 대수(1호기 257대 · 3호기 213대)는 머리줄에 그대로');
  //  ③ 베이 그림이 실제로 선다 — BayPlan 의 «BAY …» 머리
  const titles = [...doc.querySelectorAll('*')].map((n) => (n.childNodes.length === 1 && n.firstChild.nodeType === 3 ? n.textContent.trim() : '')).filter((x) => /^BAY /.test(x));
  if (titles.length < 2) fail('베이 그림 머리(BAY …)가 2장 안 선다: ' + JSON.stringify(titles));
  console.log('  ✓ 베이 그림 ' + titles.length + '장 — ' + titles.join(' · '));
  //  ④ 그림이 boardBaysOf 가 고른 베이여야 한다(코드가 아니라 픽스처에서 다시 센 값과 대조)
  const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'liveboard_obwh.json'), 'utf8'));
  const evs = [];
  for (const mode of ['discharge', 'loading']) for (const [cn, r] of Object.entries(FX[mode].completed)) {
    const n = parseInt((FX[mode].ediContainers[cn] || {}).bay || '', 10);
    if (r && r.at && n > 0) evs.push({ at: r.at, mode, n, pair: n % 2 ? n - 1 : n });
  }
  //  ⚠ 기준표의 해치는 **베이사전이 그리는 장**으로 뽑는다 — 코드와 같은 규칙을 다시 짜면 갈림을 영영 못 잡는다(감사 지적).
  const summary = (FX.bayDict.bayDef || {}).baysSummary || [];
  const pairedOdd = new Set(summary.filter((x) => x.pairEven).map((x) => parseInt(x.bay || x.bayNo, 10)));
  const hatchOf = (n) => (n % 2 === 0 ? n : (pairedOdd.has(n) ? n - 1 : n + 1));
  for (const x of evs) x.pair = hatchOf(x.n);
  const last = Math.max(...evs.map((x) => x.at));
  const m = {};
  for (const x of evs) { if (x.at < last - 30 * 60000) continue; const k = x.mode + '|' + x.pair; (m[k] = m[k] || { n: 0, lastAt: 0, bay: '', mode: x.mode }); m[k].n++; if (x.at > m[k].lastAt) { m[k].lastAt = x.at; m[k].bay = String(x.n).padStart(2, '0'); } }
  const want = Object.values(m).sort((a, b) => b.n - a.n || b.lastAt - a.lastAt).slice(0, 2);
  for (const w of want) {
    if (!new RegExp('베이 ' + w.bay).test(t)) fail(`기준표가 고른 베이 ${w.bay}(${w.n}대) 칸이 화면에 없다 — 화면: ${t.slice(0, 400)}`);
    if (!titles.some((x) => x.includes(String(parseInt(w.bay, 10) % 2 ? parseInt(w.bay, 10) - 1 : parseInt(w.bay, 10)).padStart(2, '0')))) fail(`베이 ${w.bay} 의 해치 장이 그림에 없다: ${JSON.stringify(titles)}`);
  }
  console.log('  ✓ 그림에 선 베이 = 기준표 상위 둘(' + want.map((w) => `${w.mode === 'loading' ? '선적' : '양하'} ${w.bay}×${w.n}`).join(' · ') + ')');
  //  ⑤ **두 칸은 서로 다른 장을 그린다** — 감사가 잡은 치명(01 과 (02)03 이 갈려 같은 그림이 두 번 뜨던 것)
  const shownHatch = want.map((w) => hatchOf(parseInt(w.bay, 10)) + '|' + w.mode);
  if (new Set(shownHatch).size !== shownHatch.length) fail('두 칸이 같은 장을 그린다: ' + JSON.stringify(shownHatch));
  const dupTitle = titles.filter((x, i) => titles.indexOf(x) !== i);
  if (dupTitle.length) fail('같은 «BAY …» 머리가 두 번 그려졌다: ' + JSON.stringify(dupTitle));
  console.log('  ✓ 두 칸이 서로 다른 장을 그린다(머리 중복 0)');
  //  ⑤ 완료 초록 칸과 끝4자리 — 베이플랜이 제대로 그려졌다는 증거
  if (!doc.querySelectorAll('.border-emerald-400, .border-emerald-500').length) fail('완료 컨 초록 칸이 하나도 없다');
  const cells4 = [...doc.querySelectorAll('span,div')].filter((n) => n.childNodes.length === 1 && /^\d{4}$/.test(n.textContent.trim())).length;
  if (cells4 < 10) fail('칸 안 끝4자리가 안 보인다(' + cells4 + ')');
  console.log('  ✓ 완료 초록 칸 · 끝4자리 ' + cells4 + '칸');
  //  ⑥ 왼쪽 별첨은 동방에서도 그대로 채워진다(부두와 무관)
  for (const need of ['별첨1 · 선사별', '별첨3 · 규격별 F/E']) if (!t.includes(need)) fail('별첨에 «' + need + '»이 없다');
  console.log('  ✓ 왼쪽 별첨(선사별·규격별 F/E)도 동방에서 채워진다');
  //  ⑦ 카토스 글자는 동방 카드에 나오면 안 된다
  if (/카토스/.test(t)) fail('동방 카드에 «카토스» 글자가 있다');
  console.log('\n✓ 전부 통과');
  process.exit(0);
})();
