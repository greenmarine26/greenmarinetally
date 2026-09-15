// 베이뷰 작업(3.48) 연막검사 — jsdom 으로 실제 그리고 눌러 본다. 실패하면 빌드를 세운다.
//   ① 완료 지도 = 앱 ∪ 터미널(합집합·터미널만 갈래) ② 불일치 세 갈래(pos·cell·noterm)와 칸 표식 ③ 따라가기(내 호기·호기 없음·실적 없는 배)
//   ④ 선택 화면(호기별 장·따라가기 단추) ⑤ 따라가기로 들어간 화면 — 띠 제목은 BayPlan 이 올린 것, 위 칸은 자동 카드, 아래 칸은 완료 초록·남은 흰 칸·다른 단 흐리게
//   ⑥ 데크⇄홀드 ⑦ ◀ → 수동·싱글 → 위 칸 게이트에서 베이·단을 고르면 아래 장이 바뀐다 ⑧ 압축 — «선적 시작» 큰 칸이 없다 ⑨ ✕ 로 닫힘
const { JSDOM } = require('jsdom');
const fs = require('fs');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(e.message));
console.error = (...a) => { const s = a.map(String).join(' '); if (/Error|Warning: /.test(s) && !/act\(\)/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
try { dom.window.eval(fs.readFileSync(process.argv[2], 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = (m) => { console.log('✗ ' + m); process.exit(1); };
(async () => {
  await wait(600);
  const W = dom.window, doc = W.document;
  const txt = () => doc.body.textContent || '';
  const byText = (re, sel = 'button') => [...doc.querySelectorAll(sel)].find((b) => re.test(b.textContent || ''));
  const byTextIn = (root, re) => [...root.querySelectorAll('button')].find((b) => re.test(b.textContent || ''));
  const noErr = () => { const u = [...new Set(errs)]; if (u.length) { console.log('✗ 렌더 중 오류 ' + u.length + '건'); u.slice(0, 4).forEach((e) => console.log('   ' + e)); process.exit(1); } };
  noErr();
  const bv = W.__bv;
  // ① 완료 지도
  if (!bv || !bv.overlay) fail('순수 함수 결과가 없다');
  if (bv.overlay.comp !== 260 || bv.overlay.termOnly !== 0) fail(`완료 지도 — 앱∪터미널 260·터미널만 0 이어야 하는데 ${JSON.stringify(bv.overlay)}`);
  if (bv.overlay.conflicts.length !== 0) fail('실자료(검수원 자리 기록 0)에 불일치가 잡혔다: ' + JSON.stringify(bv.overlay.conflicts.slice(0, 2)));
  if (bv.overlayTermOnly.comp !== 260 || bv.overlayTermOnly.termOnly !== 260) fail('터미널만 갈래 — 260/260 이어야 하는데 ' + JSON.stringify(bv.overlayTermOnly));
  // ② 불일치 세 갈래
  const oc = bv.overlayConflict;
  if (oc.skipped) fail('불일치 검사 입력 없음: ' + oc.skipped);
  const types = oc.types.slice().sort().join(',');
  if (!/cell/.test(types) || !/noterm/.test(types) || !/pos/.test(types)) fail(`불일치 세 갈래(cell·noterm·pos)가 다 안 잡힌다: ${types} · ${JSON.stringify(oc.conflicts)}`);
  const pos = oc.conflicts.find((c) => c.type === 'pos' && c.cn === oc.X), cell = oc.conflicts.find((c) => c.type === 'cell');
  if (pos.cn !== oc.X || pos.app !== '20-06-82' || pos.term !== '20-05-82') fail('pos 갈래 값이 틀리다: ' + JSON.stringify(pos));
  if (cell.key !== '20-06-82' || cell.app !== oc.X || cell.term !== oc.Y) fail('cell 갈래 값이 틀리다: ' + JSON.stringify(cell));
  const warn = Object.fromEntries(oc.warn);
  if (warn['20-06-82'] !== 'conflict' || warn['20-05-82'] !== 'conflict') fail('불일치 칸 표식이 두 자리에 안 붙었다: ' + JSON.stringify(oc.warn));
  if (![...Object.values(warn)].includes('noterm')) fail('터미널 미확인(noterm) 칸 표식이 없다');
  if (oc.L && oc.conflicts.some((c) => c.cn === oc.L || c.term === oc.L)) fail('계획 복사 자리(why:loaded)가 불일치로 잡혔다: ' + JSON.stringify(oc.conflicts.filter((c) => c.cn === oc.L || c.term === oc.L)));
  if (!oc.L2 || !oc.conflicts.some((c) => c.type === 'pos' && c.cn === oc.L2 && c.app === oc.L2to)) fail('자리 확인 방식(why:loaded 인데 to≠계획) 자리가 검수원 자리로 안 잡혔다: ' + JSON.stringify({ L2: oc.L2, L2to: oc.L2to, conflicts: oc.conflicts }));
  if (oc.conflicts.length !== 4) fail('불일치가 정확히 4건(pos 둘·cell·noterm)이어야 하는데 ' + oc.conflicts.length + ': ' + JSON.stringify(oc.conflicts.map((c) => c.type)));
  // ③ 따라가기 — 실측 2026-09-15 09:30: 2호기 베이 8 데크 · 4호기 베이 20 데크(craneBaysByTime)
  if (!(bv.follow4.bay === 20 && bv.follow4.tier === 'deck' && bv.follow4.no === 4)) fail('따라가기 4호기 ≠ 베이 20 데크: ' + JSON.stringify(bv.follow4));
  if (!(bv.follow2.bay === 8 && bv.follow2.no === 2)) fail('따라가기 2호기 ≠ 베이 8: ' + JSON.stringify(bv.follow2));
  if (bv.followNone.no !== 0 || !bv.followNone.why) fail('호기 없음 갈래가 이유 없이 자리를 정했다: ' + JSON.stringify(bv.followNone));
  if (bv.followStmj.bay != null || !/실적이 아직 없/.test(bv.followStmj.why)) fail('실적 없는 배가 자리를 지어냈다: ' + JSON.stringify(bv.followStmj));
  // ④ 선택 화면
  if (!doc.querySelector('[data-bayview="pick"]')) fail('선택 화면이 안 떴다: ' + txt().slice(0, 200));
  let t = txt();
  if (!/2호기 · BAY \(08\)09/.test(t) || !/4호기 · BAY \(20\)21/.test(t)) fail('호기별 장 단추가 없다: ' + t.slice(0, 400));
  if (!/내 호기\(4호기\) 따라가기/.test(t)) fail('따라가기 단추가 없다');
  if (!/수동 · 싱글/.test(t) || !/수동 · 트윈/.test(t) || !/자동 가이드/.test(t)) fail('손으로 고르기 세 단추가 없다');
  // ⑤ 따라가기로 들어간다
  byText(/따라가기 — 자동/).click();
  for (let i = 0; i < 40; i++) { await wait(150); if (doc.querySelectorAll('[data-bayview-title="1"]').length && /BAY \(20\)21/.test(doc.querySelector('[data-bayview-title="1"]').textContent)) break; }
  noErr();
  if (!doc.querySelector('[data-bayview="view"]')) fail('베이뷰 화면으로 안 넘어갔다');
  if (!doc.querySelector('[data-bayview-follow="1"]')) fail('따라가기 칩이 없다');
  const title = doc.querySelector('[data-bayview-title="1"]').textContent.trim();
  if (!/BAY 19/.test(title) || !/BAY \(20\)21/.test(title)) fail('띠 제목이 BayPlan 이 올린 «BAY 19 BAY (20)21» 이 아니다: ' + title);
  const top = doc.querySelector('[data-bayview-top="1"]'), bottom = doc.querySelector('[data-bayview-bottom="1"]');
  if (!top || !bottom) fail('위/아래 칸이 없다');
  const topT = top.textContent;
  if (/⬆ 선적 시작|⬇ 양하 시작/.test(topT)) fail('압축인데 «선적 시작» 큰 칸이 남아 있다');
  if (!/자동 가이드/.test(topT) || !/수동/.test(topT)) fail('위 칸에 자동/수동 토글이 없다');
  if (!/다음 예측|이 자리에 실제로 실은|다음 —|끝 4자리|남은 (양하|선적) 작업이 없습니다/.test(topT)) fail('위 칸에 자동 가이드 카드가 없다: ' + topT.slice(0, 300));
  if (/다음 예정/.test(topT)) fail('압축인데 «다음 예정» 목록이 남아 있다');
  const greens = bottom.querySelectorAll('.border-emerald-400, .border-emerald-500').length;
  if (greens < 50) fail('아래 칸 완료 초록 칸이 너무 적다: ' + greens);
  //  남은 흰 칸 — 실측 BAY (20)21 데크 84단 3대(1117·2104·7895)
  const cells4 = [...bottom.querySelectorAll('button')].filter((b) => /^\d{4}$/.test((b.textContent || '').trim()) || /\d{4}/.test(b.textContent || ''));
  const white = cells4.filter((b) => !/border-emerald/.test(b.className));
  const whiteTxt = white.map((b) => (b.textContent || '').replace(/\D/g, '').slice(-4));
  for (const need of ['1117', '2104', '7895']) if (!whiteTxt.some((x) => x === need)) fail(`남은 칸 ${need} 이 흰 칸으로 안 보인다(흰 칸 ${whiteTxt.length}: ${whiteTxt.slice(0, 12).join(',')})`);
  //  다른 단 흐리게 — 데크가 밝으면 홀드 칸 wrapper 에 opacity
  const dimmed = [...bottom.querySelectorAll('div')].filter((d) => /opacity:\s*0\.32/.test(d.getAttribute('style') || '')).length;
  if (!dimmed) fail('홀드 칸이 흐려지지 않았다(opacity 0.32 없음)');
  const dimmedAll = [...bottom.querySelectorAll('div')].filter((d) => /position:\s*absolute/.test(d.getAttribute('style') || '') && /opacity/.test(d.getAttribute('style') || ''));
  // ⑥ 데크 ⇄ 홀드
  byText(/데크 ⇄|홀드 ⇄/).click();
  await wait(500); noErr();
  const bar2 = doc.querySelector('[data-bayview="view"]').firstChild.textContent;
  if (!/🟠 홀드/.test(bar2)) fail('단 전환이 안 됐다: ' + bar2);
  const dimmed2 = [...bottom.querySelectorAll('div')].filter((d) => /opacity:\s*0\.32/.test(d.getAttribute('style') || '')).length;
  if (dimmed2 === dimmed && dimmedAll.length) fail('단을 바꿨는데 흐린 칸 수가 그대로다: ' + dimmed + ' → ' + dimmed2);
  // ⑥-B 따라가기 중 크레인 이동 — 터미널 실적이 (16)17 로 옮겨 가면 띠·아래 장이 따라가고 위 칸은 **단을 되묻지 않고** 그 묶음 카드를 낸다(감사 지적 반영)
  if (!W.__moveCrane()) fail('크레인 이동 입력을 못 만들었다(EDI 에 16·8 베이 컨이 없다)');
  for (let i = 0; i < 40; i++) { await wait(150); if (/BAY \(16\)17/.test(doc.querySelector('[data-bayview-title="1"]').textContent)) break; }
  noErr();
  const titleM = doc.querySelector('[data-bayview-title="1"]').textContent.trim();
  if (!/BAY \(16\)17/.test(titleM)) fail('크레인이 옮겨 갔는데 띠 제목이 안 따라갔다: ' + titleM);
  await wait(400);
  const topM = doc.querySelector('[data-bayview-top="1"]').textContent;
  if (/작업할 단을 선택하세요/.test(topM)) fail('따라가기 이동 뒤 위 칸이 단을 되묻는다(프리셋 단이 지워졌다): ' + topM.slice(0, 200));
  if (!/B16 그룹|B15·16·17/.test(topM)) fail('따라가기 이동 뒤 위 칸이 (16)17 묶음이 아니다: ' + topM.slice(0, 200));
  if (!doc.querySelector('[data-bayview-follow="1"]')) fail('이동 뒤 따라가기 칩이 사라졌다');
  const hist0 = W.history.length;
  // 되먹임 없음 — 이동 뒤 히스토리(가짜 항목)가 더 안 쌓인다
  await wait(600);
  if (W.history.length !== hist0) fail(`따라가기 이동 뒤 history 가 계속 는다: ${hist0} → ${W.history.length}`);
  // ⑦ ◀ → 수동·싱글 → 위 칸 게이트
  byText(/^◀$/).click();
  await wait(300);
  if (!doc.querySelector('[data-bayview="pick"]')) fail('◀ 로 선택 화면에 못 돌아갔다');
  byText(/수동 · 싱글/).click();
  await wait(600); noErr();
  t = doc.querySelector('[data-bayview-top="1"]').textContent;
  if (!/작업할 베이를 선택하세요/.test(t)) fail('수동으로 들어갔는데 베이 게이트가 없다: ' + t.slice(0, 200));
  if (doc.querySelector('[data-bayview-follow="1"]')) fail('수동인데 따라가기 칩이 남아 있다');
  const topEl = () => doc.querySelector('[data-bayview-top="1"]');
  const bayBtn = byTextIn(topEl(), /B15·16·17/);
  if (!bayBtn) fail('게이트에 B15·16·17 이 없다: ' + t.slice(0, 300));
  bayBtn.click();
  await wait(400);
  const tierBtn = byTextIn(topEl(), /데크\s*\d+개/);   // ⚠ 띠의 «🔵 데크 ⇄» 와 헷갈리지 않게 위 칸 안에서만 찾는다
  if (!tierBtn) fail('단 선택 단추가 없다: ' + doc.querySelector('[data-bayview-top="1"]').textContent.slice(0, 300));
  tierBtn.click();
  for (let i = 0; i < 40; i++) { await wait(150); if (/BAY \(16\)17/.test(doc.querySelector('[data-bayview-title="1"]').textContent)) break; }
  noErr();
  const title2 = doc.querySelector('[data-bayview-title="1"]').textContent.trim();
  if (!/BAY 15/.test(title2) || !/BAY \(16\)17/.test(title2)) fail('위 칸에서 고른 베이가 아래 장으로 안 갔다: ' + title2);
  t = doc.querySelector('[data-bayview-top="1"]').textContent;
  if (!/15·16·17번 데크 작업 중/.test(t)) fail('수동 «작업 중» 줄이 없다: ' + t.slice(0, 300));
  if (!doc.querySelector('[data-bayview-top="1"] input')) fail('수동 끝4 조회창(input)이 없다');
  // ⑨ ✕ 닫기
  byText(/^✕$/).click();
  await wait(300);
  if (!doc.querySelector('[data-closed="1"]')) fail('✕ 로 안 닫혔다');
  if (!W.__calls.some((c) => c.fn === 'close')) fail('onClose 가 안 불렸다');
  noErr();
  console.log(`✓ 베이뷰 연막검사 통과 (완료 지도 ${bv.overlay.comp} · 불일치 세 갈래 · 따라가기 4호기 BAY (20)21 데크 → 이동 «${titleM}» · 초록 ${greens}칸 · 남은 흰 칸 ${whiteTxt.length} · 흐린 칸 ${dimmed}→${dimmed2} · 수동 B15·16·17 → «${title2}» · history ${W.history.length})`);
})().catch((e) => { console.log('✗ 검사 스크립트 예외: ' + (e && e.stack || e)); process.exit(1); });
