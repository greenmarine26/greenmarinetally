// 3.72 연막검사 — RZOR 양하 덱플랜: 완료 칸이 눌러 보지 않고도 보인다(밝은 초록 + ✓ 배지 + «최근 양하» 줄 + 남은 대수) · 완료가 오면 다시 그려진다.
//   검수사 2026-09-30 «RZOR 양하시 실시간으로 덱플랜에서 확인할수 있게 해주세요 지금은 클릭해야 양하 되었는지 안되었는지 알수 있습니다. 클릭 안하고는 알수가 없습니다.»
//   실소스(DeckPlanView)를 esbuild 로 묶고 Firebase SDK 만 메모리 스텁으로 갈아 jsdom 에서 실제로 그린다. 기대값은 앱 코드가 아니라 **실데이터(픽스처)에서 따로 센다**.
//   실데이터 tools/fixtures/rzor_discharge_R107E_deckdone.json — RTDB voyages/RZOR_R107E/discharge 2026-09-30 16:48 KST(선사 덱플랜 196대 · 완료 116대).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'deckdone_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = path.join(TMP, 'dd.js');
const stub = './tools/stub_fbdb_mem.js';
execSync(`npx esbuild tools/smoke_deckdone.jsx --bundle --loader:.jsx=jsx --loader:.json=json --loader:.png=dataurl --jsx=automatic --external:fs --external:path --external:url `
  + `--alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${OUT}"`, { cwd: ROOT, stdio: 'pipe' });

//  실데이터에서 따로 세는 기대값(앱 코드를 쓰지 않는다)
const F = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/rzor_discharge_R107E_deckdone.json'), 'utf8'));
const COMP = F.completed;
const deckCells = (dk) => dk.slots.filter((s) => !s.empty && s.cn);
const byDeck = {};
for (const dk of F.plan.decks) byDeck[dk.deck] = { total: deckCells(dk).length, done: deckCells(dk).filter((s) => COMP[s.cn]).length, lolo: deckCells(dk).filter((s) => s.lolo).length, loloDone: deckCells(dk).filter((s) => s.lolo && COMP[s.cn]).length };
const allTotal = Object.values(byDeck).reduce((a, x) => a + x.total, 0), allDone = Object.values(byDeck).reduce((a, x) => a + x.done, 0);
const kst = (ms) => { const d = new Date(ms + 9 * 3600 * 1000); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };
const planCns = new Set(); for (const dk of F.plan.decks) for (const s of deckCells(dk)) planCns.add(s.cn);
const doneInPlan = Object.entries(COMP).filter(([cn, r]) => planCns.has(cn) && r && r.at > 0).sort((a, b) => b[1].at - a[1].at);
const MAXAT = doneInPlan[0][1].at;

(async () => {
  const { JSDOM } = require(path.join(ROOT, 'node_modules', 'jsdom'));
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://x/' });
  const W = dom.window;
  for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'localStorage', 'CustomEvent', 'Event']) global[k] = k === 'window' ? W : W[k];
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  W.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  W.speechSynthesis = { speak() {}, cancel() {}, getVoices: () => [] };
  W.alert = () => {}; global.alert = W.alert; W.confirm = () => true;
  const errs = [];
  const _ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ')); };
  //  화면이 30초 시계를 세우고 치우는지 보려고 setInterval 을 감싼다(이 화면 안 다른 라이브러리는 setInterval 을 쓰지 않는다)
  const _si = global.setInterval, _ci = global.clearInterval; const live = new Set();
  global.setInterval = (...a) => { const id = _si(...a); live.add(id); return id; };
  global.clearInterval = (id) => { live.delete(id); return _ci(id); };
  require(OUT);
  const D = W.document;
  const click = (el) => el.dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
  const chips = () => [...D.querySelectorAll('button')].filter((b) => /^[DCB]덱 \d+\/\d+$/.test((b.textContent || '').trim()));
  const chip = (deck) => chips().find((b) => b.textContent.trim().startsWith(deck + '덱'));
  const doneCells = () => [...D.querySelectorAll('.grid > button[data-done]')];
  const badges = () => [...D.querySelectorAll('.grid > button [data-badge]')];
  const cellByPos = (pos) => [...D.querySelectorAll('.grid > button')].find((b) => b.title === pos);
  const head = () => (D.body.textContent || '');
  const recentBtns = () => [...D.querySelectorAll('[data-recent] button')];
  const show = async (deck) => { click(chip(deck)); await wait(30); };

  console.log('■ ① 실데이터 R107E 양하 — 완료 칸이 눌러 보지 않고도 보인다');
  W.__render({ nowMs: MAXAT + 2 * 60000 }); await wait(80);
  ok('덱 칩 3개 D·C·B, 칩 숫자 = 실데이터 덱별 완료/전체', chips().length === 3 && ['D', 'C', 'B'].every((k) => chip(k).textContent.trim() === `${k}덱 ${byDeck[k].done}/${byDeck[k].total}`), chips().map((b) => b.textContent.trim()).join(' | '));
  ok(`D덱 — 완료 칸 ${byDeck.D.done}대에 완료 표식(data-done)과 ✓ 배지가 같은 수로 선다`, doneCells().length === byDeck.D.done && badges().length === byDeck.D.done, `표식 ${doneCells().length} · 배지 ${badges().length}`);
  ok('D덱 — 완료가 아닌 칸에는 표식·배지가 없다(밝은 초록은 완료만)', [...D.querySelectorAll('.grid > button')].filter((b) => !b.hasAttribute('data-done') && (b.className.includes('bg-emerald-600') || b.querySelector('[data-badge]'))).length === 0);
  const anyDone = doneCells()[0];
  ok('완료 칸 — 밝은 초록(bg-emerald-600)·밝은 테두리, 종전 어두운 초록(bg-emerald-800)이 아니다', anyDone.className.includes('bg-emerald-600') && anyDone.className.includes('border-emerald-300') && !anyDone.className.includes('bg-emerald-800'));
  ok('완료 칸 — 글자는 흰 바탕 4단계에서 뒤집히는 색(text-emerald-50)이다(text-white 는 안 뒤집혀 흐려진다)', !doneCells().some((b) => /text-white/.test(b.innerHTML)) && /text-emerald-50/.test(anyDone.innerHTML));
  const lolo = F.plan.decks.find((d) => d.deck === 'D').slots.filter((s) => !s.empty && s.lolo && COMP[s.cn]);
  ok(`갠트리(🏗) 완료 ${byDeck.D.loloDone}대 — ✓ 는 글자줄이 아니라 따로 선 배지라 🏗·번호에 밀려 잘리지 않는다`, lolo.length === byDeck.D.loloDone && lolo.every((s) => { const b = cellByPos(s.pos); const line1 = b && b.querySelector('div'); return b && b.hasAttribute('data-done') && b.querySelector('[data-badge]') && line1 && !line1.textContent.includes('✓') && line1.textContent.includes(s.cn.slice(-4)); }));
  ok(`머리 «이 덱 ${byDeck.D.done}/${byDeck.D.total} 완료 · 남음 ${byDeck.D.total - byDeck.D.done} · 덱플랜 전체 ${allDone}/${allTotal}»`, head().includes(`이 덱 ${byDeck.D.done}/${byDeck.D.total} 완료 · 남음 ${byDeck.D.total - byDeck.D.done} · 덱플랜 전체 ${allDone}/${allTotal}`), head().match(/이 덱[^·]*·[^·]*·[^·]*/)?.[0]);
  await show('C');
  ok(`C덱 — 완료 ${byDeck.C.done}/${byDeck.C.total}`, doneCells().length === byDeck.C.done && badges().length === byDeck.C.done);
  await show('B');
  ok(`B덱 — 완료 0/${byDeck.B.total}(표식·배지 0, 머리 «남음 ${byDeck.B.total}»)`, byDeck.B.done === 0 && doneCells().length === 0 && badges().length === 0 && head().includes(`남음 ${byDeck.B.total}`));
  await show('D');

  console.log('■ ② «최근 양하» 줄 — 늦은 순 6대 · 시각 · 10분 안은 강조');
  const exp6 = doneInPlan.slice(0, 6);
  const rb = recentBtns();
  //  같은 시각(분 단위로 묶여 오는 터미널 실적)에 찍힌 컨끼리는 순서를 정하지 않는다 — 각 칩이 가리키는 컨의 완료 시각이 늦은 순 6대의 시각과 같은지로 잰다.
  const atOfLast4 = (l4) => { const m = doneInPlan.filter(([cn]) => cn.slice(-4) === l4); return m.length === 1 ? m[0][1].at : -1; };
  ok('6대가 늦은 순으로 나온다(각 칩 컨의 완료 시각 = 실데이터에서 센 늦은 순 6대의 시각)', rb.length === 6 && new Set(rb.map((b) => b.textContent.trim().slice(0, 4))).size === 6 && rb.every((b, i) => atOfLast4(b.textContent.trim().slice(0, 4)) === exp6[i][1].at), rb.map((b) => b.textContent.trim()).join(' | '));
  ok('각 칩에 그 컨의 완료 시각(KST HH:MM)이 붙는다', rb.every((b) => b.textContent.includes(kst(atOfLast4(b.textContent.trim().slice(0, 4))))), rb.map((b) => b.textContent.trim()).join(' | '));
  const nowA = MAXAT + 2 * 60000;
  const freshInD = (now) => F.plan.decks.find((d) => d.deck === 'D').slots.filter((s) => !s.empty && COMP[s.cn] && now - COMP[s.cn].at < 600000).length;
  ok('완료 10분 안(«방금») 칸만 data-done="fresh" 이고 그 배지만 깜박(animate-pulse)이다', doneCells().filter((b) => b.getAttribute('data-done') === 'fresh').length === freshInD(nowA) && badges().filter((s) => s.className.includes('animate-pulse')).length === freshInD(nowA) && freshInD(nowA) > 0 && freshInD(nowA) < byDeck.D.done, `기대 ${freshInD(nowA)} · 실제 ${doneCells().filter((b) => b.getAttribute('data-done') === 'fresh').length}`);
  ok('칩도 10분 안은 밝은 초록·그보다 오래면 어두운 바탕', rb.every((b) => (nowA - atOfLast4(b.textContent.trim().slice(0, 4)) < 600000) === b.className.includes('bg-emerald-600')));
  W.__render({ nowMs: MAXAT + 30 * 60000 }); await wait(60);
  ok('30분 뒤 — 방금 표식·깜박임이 모두 꺼진다(완료 표식은 그대로)', doneCells().filter((b) => b.getAttribute('data-done') === 'fresh').length === 0 && badges().filter((s) => s.className.includes('animate-pulse')).length === 0 && doneCells().length === byDeck.D.done && !recentBtns().some((b) => b.className.includes('bg-emerald-600')));

  console.log('■ ③ 실시간 — 완료가 새로 오면 눌러 보지 않아도 그 칸이 바뀐다(RTDB 구독이 같은 화면을 다시 그리는 것을 흉내)');
  const newest3 = doneInPlan.slice(0, 3).map(([cn]) => cn);
  const before = Object.fromEntries(Object.entries(COMP).filter(([cn]) => !newest3.includes(cn)));
  W.__render({ compMap: before, nowMs: nowA }); await wait(60);
  const posOf = (cn) => { for (const dk of F.plan.decks) for (const s of dk.slots) if (!s.empty && s.cn === cn) return { pos: s.pos, deck: dk.deck }; return null; };
  const inD = newest3.filter((cn) => posOf(cn).deck === 'D');
  const notYet = newest3.every((cn) => posOf(cn).deck !== 'D' || !cellByPos(posOf(cn).pos).hasAttribute('data-done'));
  ok(`앞 상태 — 마지막 3대를 뺀 완료 ${Object.keys(before).length}건이면 그 3대는 아직 완료가 아니다`, notYet && doneCells().length === byDeck.D.done - inD.length, `D덱 표식 ${doneCells().length}`);
  W.__render({ compMap: COMP, nowMs: nowA }); await wait(60);
  ok('완료 3건이 들어오면 — 그 칸이 초록으로 바뀌고 머리 숫자·«최근 양하» 첫 칸이 따라온다', inD.every((cn) => cellByPos(posOf(cn).pos).hasAttribute('data-done')) && doneCells().length === byDeck.D.done && recentBtns()[0].textContent.trim().startsWith(newest3[0].slice(-4)) && head().includes(`덱플랜 전체 ${allDone}/${allTotal}`));

  console.log('■ ④ 종전 동작은 그대로 — 누르면 컨 상세 · 예측(?)·확정(📌) 칸은 자기 색');
  W.__opened.length = 0;
  const someDone = F.plan.decks.find((d) => d.deck === 'D').slots.find((s) => !s.empty && COMP[s.cn] && !s.lolo);
  click(cellByPos(someDone.pos)); await wait(20);
  ok('완료 칸을 누르면 컨 상세가 열린다(onOpenContainer 에 그 컨)', W.__opened.includes(someDone.cn), JSON.stringify(W.__opened));
  click(recentBtns()[1]); await wait(20);
  ok('«최근 양하» 칩을 누르면 그 컨의 상세가 열린다', W.__opened.includes(doneInPlan[1][0]), JSON.stringify(W.__opened));
  const plan2 = JSON.parse(JSON.stringify(F.plan));
  const d2 = plan2.decks.find((d) => d.deck === 'D');
  const sSure = d2.slots.find((s) => !s.empty && COMP[s.cn] && !s.lolo && s.pos !== someDone.pos);
  const sPred = d2.slots.find((s) => !s.empty && COMP[s.cn] && !s.lolo && s.pos !== someDone.pos && s !== sSure);
  sSure.sure = true; sPred.pred = true; plan2._gen = true;
  W.__render({ plan: plan2, nowMs: nowA, mode: 'loading' }); await wait(60);
  const cSure = [...D.querySelectorAll('.grid > button')].find((b) => b.title.startsWith('확정') && b.title.endsWith(sSure.pos)), cPred = [...D.querySelectorAll('.grid > button')].find((b) => b.title.startsWith('예측') && b.title.endsWith(sPred.pos));
  ok('선적 자동 덱플랜의 확정(📌) 칸 — 종전 호박색, 완료 표식·배지 없음', cSure && !cSure.hasAttribute('data-done') && cSure.className.includes('bg-amber-900/70') && !cSure.querySelector('[data-badge]'));
  ok('선적 자동 덱플랜의 예측(?) 칸 — 종전 점선, 완료 표식·배지 없음', cPred && !cPred.hasAttribute('data-done') && cPred.className.includes('border-dashed') && !cPred.querySelector('[data-badge]'));
  ok('예측(?)·확정(📌) 칸에 종전의 글자 ✓ 는 그대로 남는다(터미널이 완료 처리했는데 자리는 예측인 칸 · 자리만 확정되고 완료 기록이 안 된 칸을 가르는 신호)', /✓/.test(cSure.querySelector('div').textContent) && /✓/.test(cPred.querySelector('div').textContent));
  ok('선적 화면도 «최근 선적» 줄 문구를 쓴다(모드 문구)', /최근 선적/.test(head()) && !/최근 양하/.test(head()));

  console.log('■ ④-2 어긋난 자료에도 안 깨진다(실데이터를 일부만 바꾼 변형 — 중복 컨 · at 없는 완료 · 문자열 at · 폰 시계 어긋남)');
  {
    const dD = F.plan.decks.find((d) => d.deck === 'D');
    const doneD = dD.slots.filter((s) => !s.empty && COMP[s.cn] && !s.lolo);
    const [a, b2, c2, d3] = doneD;
    const NOW = MAXAT + 2 * 60000;
    //  a: 완료 시각 없음(by 만) · b2: 문자열 시각 · c2: 정확히 599초 전(방금) · d3: 601초 전(방금 아님) · 또 한 칸은 폰 시계가 5분 느린 경우(완료 시각이 미래)
    const cm = { ...COMP };
    cm[a.cn] = { by: '김성일' };
    cm[b2.cn] = { ...COMP[b2.cn], at: String(NOW - 5 * 60000) };
    cm[c2.cn] = { ...COMP[c2.cn], at: NOW - 599000 };
    cm[d3.cn] = { ...COMP[d3.cn], at: NOW - 601000 };
    const fut = doneD[4];
    cm[fut.cn] = { ...COMP[fut.cn], at: NOW + 5 * 60000 };
    const far = doneD[5];
    cm[far.cn] = { ...COMP[far.cn], at: NOW + 30 * 60000 };
    //  같은 컨이 두 칸에 선 덱플랜 — 가장 늦은 완료 컨(newest)을 B덱에도 한 칸 더 세운다
    const plan3 = JSON.parse(JSON.stringify(F.plan));
    const newestCn = doneInPlan[0][0];
    const src = plan3.decks.flatMap((d) => d.slots).find((s) => !s.empty && s.cn === newestCn);
    const bDeck = plan3.decks.find((d) => d.deck === 'B');
    bDeck.slots.push({ ...src, ri: 20, ci: 0, key: 'B-dup', pos: 'B덱 중복 칸' });
    cm[newestCn] = COMP[newestCn];
    W.__render({ plan: plan3, compMap: cm, nowMs: NOW }); await wait(60);
    const at = (s0) => cellByPos(s0.pos).getAttribute('data-done');
    ok('완료 시각이 없는 완료(by 만) — 초록·✓ 는 서고, 방금이 아니며, 최근 줄에는 안 오른다', at(a) === '1' && !!cellByPos(a.pos).querySelector('[data-badge]') && !recentBtns().some((x) => x.textContent.includes(a.cn.slice(-4) + ' ')));
    ok('문자열 시각(«1790…»)도 숫자로 읽어 방금 판정이 선다(5분 전 → 방금)', at(b2) === 'fresh');
    ok('경계 — 599초 전은 방금, 601초 전은 방금 아님(10분)', at(c2) === 'fresh' && at(d3) === '1');
    ok('폰 시계가 느려 완료 시각이 5분 뒤로 찍혀도 방금으로 본다(차이의 절댓값) — 30분이나 어긋나면 방금이 아니다', at(fut) === 'fresh' && at(far) === '1');
    ok('같은 컨이 두 칸에 있어도 «최근 양하» 줄에는 한 번만 오른다', recentBtns().filter((x) => x.textContent.trim().startsWith(newestCn.slice(-4))).length === 1);
    //  완료 시각이 있는 완료가 3건뿐이면 «최근 양하» 줄도 3칩이다(시각 없는 완료는 줄에 오르지 않는다)
    const cmFew = {}; let k = 0;
    for (const s0 of dD.slots) { if (s0.empty || !s0.cn || !COMP[s0.cn]) continue; cmFew[s0.cn] = k < 3 ? COMP[s0.cn] : { by: '김성일' }; k += 1; }
    W.__render({ compMap: cmFew, nowMs: NOW }); await wait(60);
    ok('시각 있는 완료 3건 + 시각 없는 완료 다수 — «최근 양하» 3칩(시각 없는 완료는 줄에 안 오른다)', recentBtns().length === 3 && doneCells().length === Object.keys(cmFew).filter((cn) => dD.slots.some((x) => x.cn === cn)).length, `칩 ${recentBtns().length}`);
    W.__render({ plan: plan3, compMap: cm, nowMs: NOW }); await wait(60);
    const bdg = badges()[0];
    ok('✓ 배지 색은 글자 클래스가 아니라 직접 지정(흰 칩·진한 초록 ✓) — 4단계 색 뒤집기 표가 다시 만들어져도 안 뒤집힌다', /255, 255, 255|#fff/i.test(bdg.style.background) && /4, 120, 87|#047857/i.test(bdg.style.color), `${bdg.style.background} / ${bdg.style.color}`);
    ok('«최근 양하» 칩 툴팁은 자리 표기 하나(«C덱 C덱 …» 처럼 덱 이름이 겹치지 않는다)', recentBtns().every((x) => x.title && !/([DCB])덱 \1덱/.test(x.title)), recentBtns().map((x) => x.title).join(' | '));
  }

  console.log('■ ⑤ 시계 정리 · 범례 · 흰 바탕(4단계) 색 뒤집기 · 콘솔 오류');
  ok('30초 시계가 서 있다', live.size >= 1, `살아 있는 시계 ${live.size}`);
  W.__unmount(); await wait(30);
  ok('화면을 치우면 시계도 치워진다(누수 없음)', live.size === 0, `남은 시계 ${live.size}`);
  const bl = fs.readFileSync(path.join(ROOT, 'src/brightLight.css'), 'utf8');
  ok('흰 바탕(4단계) 색 뒤집기 표에 bg-emerald-600 · text-emerald-50 · border-emerald-300 · text-yellow-100 이 있다(완료 칸 글자가 흰 바탕에서 읽힌다)', ['.bg-emerald-600{', '.text-emerald-50{', '.border-emerald-300{', '.text-yellow-100{'].every((k) => bl.includes(`[data-bright="4"] ${k}`)));
  W.__render({ nowMs: nowA }); await wait(60);
  ok('범례 — «완료 ✓(10분 안은 ✓ 깜박)»', /완료 ✓\(10분 안은 ✓ 깜박\)/.test(head()));
  W.__unmount(); await wait(20);
  const real = errs.filter((e) => !/not wrapped in act|ReactDOMTestUtils|act\(/.test(e));
  ok('콘솔 오류 0', real.length === 0, real.slice(0, 2).join(' | '));
  console.error = _ce;
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { console.log(`  ⚠ 임시 폴더를 못 치웠다 — ${TMP}`); }
  console.log(`\n${bad ? '✘' : '✔'} 덱플랜 완료 표시(3.72) ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('✘ 연막검사 예외', e && e.stack || e); process.exit(1); });
