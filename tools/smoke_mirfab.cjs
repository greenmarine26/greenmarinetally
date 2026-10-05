// 떠 있는 미르(3.41) — jsdom 으로 실제 그리고 눌러 본다. 실패하면 빌드를 세운다.
//   ① 오른쪽 아래 얼굴이 뜬다 ② 누르면 시트(입력·🎤·🔊·질문)가 올라온다 ③ 홈에서 «KBTR 3426 온도» → 그 항차 자료로 답 ④ 항차 화면이 재료를 놓으면(publishMirCtx) 배 이름 없이 «3426 온도» 도 답
//   ⑤ «KBTR 카고플랜 보여줘» → 플랜 덮개(onOpenPlan) 호출 ⑥ 모르는 말은 «못 배웠어요» 고백 ⑦ 렌더 오류 0
//   3.41-01 — ⑧ 묻고 나면 칸이 비고 물은 말이 답 위에 남는다 ⑨ 플랜 명령은 말부터 하고(발화 → 덮개 순) 시트를 내린다 ⑩ «작업중인 선박 언제 끝나» 는 지금 일하는 배로 답하고 여럿이면 «어느 배?»
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(e.message));
console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
dom.window.speechSynthesis = { speak(u) { (dom.window.__calls || (dom.window.__calls = [])).push({ fn: 'speak', text: String(u && u.text || '') }); }, cancel() { (dom.window.__calls || (dom.window.__calls = [])).push({ fn: 'cancel' }); }, getVoices() { return []; }, speaking: false, pending: false };
dom.window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
try { dom.window.eval(fs.readFileSync(process.argv[2], 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await wait(400);
  const doc = dom.window.document, W = dom.window;
  const fail = (m) => { console.log('✗ ' + m); process.exit(1); };
  const uniq = [...new Set(errs)];
  if (uniq.length) { console.log('✗ 렌더 중 오류 ' + uniq.length + '건'); uniq.slice(0, 3).forEach((e) => console.log('   ' + e)); process.exit(1); }
  const fab = doc.querySelector('button[aria-label="미르에게 묻기"]');
  if (!fab) fail('오른쪽 아래 미르 얼굴(버튼)이 없다');
  if (!/fixed/.test(fab.className) || !/right-4/.test(fab.className)) fail('얼굴이 fixed·오른쪽에 붙어 있지 않다: ' + fab.className);
  //  4.07: 얼굴은 실사 미르 한 칸(span.mirp > span.mirp-img.mirp-m-<기분>)이다. 칸 좌표·움직임 CSS 는 문서에 들어간 <style id=mirPhotoCss> 가 준다.
  const face = fab.querySelector('span.mirp');
  if (!face) fail('얼굴 버튼 안에 실사 미르(span.mirp)가 없다');
  const img0 = face.querySelector('.mirp-img');
  if (!img0 || !/\bmirp-m-[a-z]+\b/.test(img0.className)) fail('실사 얼굴에 스프라이트 칸(.mirp-img.mirp-m-<기분>)이 없다');
  const pcss = doc.getElementById('mirPhotoCss');
  if (!pcss || !/mirpPop/.test(pcss.textContent) || !/data:image\/webp;base64,/.test(pcss.textContent)) fail('실사 CSS(<style id=mirPhotoCss>)가 문서에 안 들어갔다(스프라이트 포함)');
  if (doc.getElementById('mirFaceCss') || fab.querySelector('svg.mir')) fail('걷은 옛 그림 인형(svg.mir·mirFaceCss)이 아직 남아 있다');
  if (face.getAttribute('data-mood') !== fab.getAttribute('data-mood')) fail('실사 얼굴 기분과 버튼 기분이 다르다: ' + face.getAttribute('data-mood') + ' vs ' + fab.getAttribute('data-mood'));
  if (img0.className.indexOf('mirp-m-' + fab.getAttribute('data-mood')) < 0) fail('실사 얼굴 칸이 기분과 다르다: ' + img0.className + ' vs ' + fab.getAttribute('data-mood'));
  if (doc.querySelector('[data-mir-hero]')) fail('시트를 열기 전인데 전신 미르가 떠 있다');
  const seenFace = new Set(); const mo = new W.MutationObserver(() => { const m = fab.querySelector('.mirp'); if (m) seenFace.add(m.getAttribute('data-mood')); }); mo.observe(fab, { childList: true, subtree: true, attributes: true });
  //  3.56: 기분 — 얼굴 버튼에 mir-mood-<key> 클래스와 data-mood 가 있어야 한다(CSS 가 그것으로 움직인다). 어떤 기분인지는 시각·자료에 따라 다르므로 값은 고정하지 않는다.
  const moodKey = fab.getAttribute('data-mood');
  if (!moodKey || !new RegExp('\\bmir-mood-' + moodKey + '\\b').test(fab.className)) fail('얼굴에 기분 클래스(mir-mood-<key>)가 없다: ' + fab.className + ' / data-mood=' + moodKey);
  if (!['basic', 'happy', 'sad', 'anxious', 'angry', 'hungry', 'full', 'bored', 'rest', 'hobby', 'prep'].includes(moodKey)) fail('모르는 기분 키: ' + moodKey);
  //  3.56 감사 지적 — .mir-mood 가 position 을 덮어 얼굴이 fixed 를 잃은 적이 있다. 클래스 이름이 아니라 **계산된 스타일**로 fixed 를 본다(index.css 를 실제로 읽어 얹는다).
  try {
    const css = fs.readFileSync(path.resolve(__dirname, '../src/index.css'), 'utf8').replace(/@tailwind[^;]*;|@apply[^;]*;/g, '');
    const st = doc.createElement('style'); st.textContent = '.fixed{position:fixed}\n' + css; doc.head.appendChild(st);
    const pos = dom.window.getComputedStyle(fab).position;
    if (pos !== 'fixed') fail('얼굴 버튼의 계산된 position 이 fixed 가 아니다: ' + pos + ' (mir-mood 가 덮었는가)');
  } catch (e) { if (/fixed 가 아니다/.test(String(e && e.message))) throw e; console.log('  (계산 스타일 검사 생략 — ' + (e && e.message) + ')'); }
  fab.click(); await wait(100);
  const inp = doc.getElementById('mirFabIn');
  if (!inp) fail('얼굴을 눌렀는데 시트(입력칸)가 안 올라온다');
  //  4.07: 시트가 열리면 윗가장자리에 두 발로 선 전신 미르가 시트 래퍼 안에 있다(주소는 ./mir_art/pNN.webp, 그 기분의 자세 목록 안의 번호)
  const hero = doc.querySelector('[data-mir-sheet] [data-mir-hero] img.mirp-hero');
  if (!hero) fail('시트를 열었는데 시트 위의 전신 미르(img.mirp-hero)가 없다');
  const hm = /^\.\/mir_art\/p(\d\d)\.webp$/.exec(hero.getAttribute('src') || '');
  if (!hm) fail('전신 미르 주소가 ./mir_art/pNN.webp 가 아니다: ' + hero.getAttribute('src'));
  if (!hero.className.includes('mood-' + fab.getAttribute('data-mood'))) fail('전신 미르 기분 클래스가 버튼 기분과 다르다: ' + hero.className);
  { const hs = doc.querySelector('[data-mir-hero]'); if (!hs || hs.style.pointerEvents !== 'none' || hs.style.bottom !== '100%') fail('전신 미르는 시트 위 가장자리(bottom:100%)에 서고 눌림을 막지 않아야 한다(pointer-events:none)'); }
  const t = doc.body.textContent;
  for (const s of ['미르에게 묻기', '🎤', '🔊', '질문']) if (!t.includes(s)) fail(`시트에 «${s}» 가 없다`);
  const setVal = (el, v) => { const setter = Object.getOwnPropertyDescriptor(W.HTMLInputElement.prototype, 'value').set; setter.call(el, v); el.dispatchEvent(new W.Event('input', { bubbles: true })); };
  const askBtn = () => [...doc.querySelectorAll('button')].find((b) => b.textContent.trim() === '질문');
  const inpNow = () => doc.getElementById('mirFabIn');
  const ask = async (q) => { setVal(inpNow(), q); askBtn().click(); for (let i = 0; i < 40; i++) { await wait(100); const o = doc.body.textContent; if (!inpNow()) break; if (!/…$/.test(o.trim()) && o.includes(q) && o.length > 200) break; } return doc.body.textContent; };
  //  3.41-01 ⑧ — 묻고 나면 칸은 비고 물은 말은 답 위에 «🗨 …» 로 남는다
  const askChk = async (q) => { const o = await ask(q); const el = inpNow(); if (el && el.value !== '') fail('묻고 나서 칸이 안 비었다: «' + el.value + '»'); if (el && !o.includes('🗨 ' + q)) fail('물은 말이 답 위에 안 남았다: ' + q); return o; };
  // ③ 홈 — 배 이름으로
  let o = await askChk('KBTR 3426 온도');
  if (!o.includes('FBIU5093426') || !o.includes('세팅 온도 기록 없음')) fail('홈에서 «KBTR 3426 온도» 답이 없다: ' + o.slice(0, 200));
  if (!seenFace.has('think')) fail('답을 만드는 동안 생각하는 얼굴(think)이 한 번도 안 나왔다: ' + [...seenFace].join(','));
  if (fab.querySelector('.mirp').getAttribute('data-mood') === 'think') fail('답이 나온 뒤에도 생각하는 얼굴이 남아 있다');
  o = await askChk('NSFR 엑스레이 대상 위치');
  if (!o.includes('NSSU0170686')) fail('홈에서 «NSFR 엑스레이 대상 위치» 답이 없다: ' + o.slice(0, 200));
  o = await ask('3426 온도');
  if (!o.includes('【KBTR】') || !o.includes('FBIU5093426')) fail('홈에서 배 이름 없이 «3426 온도» 를 물으면 전 항차에서 찾아 배 이름을 붙여 답해야 한다: ' + o.slice(0, 200));
  o = await ask('9999 온도');
  if (!/어디에도 없어요/.test(o)) fail('없는 끝네자리는 «어디에도 없어요»: ' + o.slice(0, 200));
  // ④ 항차 화면이 재료를 놓았을 때 — 배 이름 없이
  W.__publish('KBTR_2606E'); await wait(50);
  o = await ask('3426 온도');
  if (!o.includes('FBIU5093426')) fail('항차 재료가 놓였는데 «3426 온도» 를 못 답한다: ' + o.slice(0, 200));
  if (!/KBTR · 양하 자료로 답해요/.test(o)) fail('시트 머리에 «KBTR · 양하 자료로 답해요» 가 없다');
  o = await ask('접안 현측');
  if (!o.includes('접안 현측 기록 없음')) fail('«접안 현측» 답이 없다: ' + o.slice(0, 200));
  // ⑤ 플랜 명령 → 덮개 · 3.41-01 ⑨ 말부터 하고(speak → plan 순) 시트를 내린다
  W.__calls.length = 0;
  o = await ask('KBTR 카고플랜 보여줘');
  const pl = W.__calls.find((c) => c.fn === 'plan');
  if (!pl || pl.voyageKey !== 'KBTR_2606E' || pl.what !== 'cargo') fail('«KBTR 카고플랜 보여줘» 가 플랜 덮개를 안 연다: ' + JSON.stringify(W.__calls));
  const iSpeak = W.__calls.findIndex((c) => c.fn === 'speak' && /카고플랜을 열었어요/.test(c.text)), iPlan = W.__calls.findIndex((c) => c.fn === 'plan');
  if (iSpeak < 0 || iSpeak > iPlan) fail('플랜 명령은 «열었어요» 를 말한 뒤 덮개를 열어야 한다(발화가 화면 뒤에 줄 서지 않게): ' + JSON.stringify(W.__calls.map((c) => c.fn)));
  if (!W.__calls.some((c) => c.fn === 'cancel')) fail('묻기 시작에 쌓인 발화를 끊지(cancel) 않는다');
  if (W.__calls.slice(iPlan + 1).some((c) => c.fn === 'cancel')) fail('덮개를 연 뒤에 발화를 끊으면 방금 말한 «열었어요» 가 지워진다(감사 실측)');
  if (inpNow()) fail('플랜을 열었는데 시트가 그대로 떠 있다(플랜을 가린다)');
  fab.click(); await wait(100);
  if (!inpNow()) fail('플랜 뒤 얼굴을 눌러도 시트가 안 올라온다');
  // ⑥ 모르는 말 — 고백
  W.__unpublish(); await wait(50);
  o = await ask('타닥타닥 후루룩 쩝쩝');   // 아무 갈래에도 안 걸리는 말
  if (!/못 배웠어요|배 이름을 붙여/.test(o)) fail('모르는 말에 고백이 없다: ' + o.slice(0, 200));
  // 3.41-01 ⑩ «작업중인 선박 언제 끝나» — 이름 없이도 지금 일하는 배(픽스처에서 isWorkingNow 인 배는 KBTR 하나)로 답한다
  o = await askChk('작업중인 선박 언제 끝나');
  if (/배 이름을 붙여|어느 배 말씀/.test(o) || !/KBTR|KOBE|남았|끝/.test(o)) fail('«작업중인 선박 언제 끝나» 가 지금 일하는 배로 답하지 않는다: ' + o.slice(0, 220));
  // ⑦ 닫기
  [...doc.querySelectorAll('button')].find((b) => b.textContent.trim() === '✕').click(); await wait(50);
  if (doc.getElementById('mirFabIn')) fail('✕ 를 눌렀는데 시트가 안 닫힌다');
  if (doc.querySelector('[data-mir-hero]')) fail('시트를 닫았는데 전신 미르가 남아 있다');
  const uniq2 = [...new Set(errs)];
  if (uniq2.length) { console.log('✗ 누르는 중 오류 ' + uniq2.length + '건'); uniq2.slice(0, 3).forEach((e) => console.log('   ' + e)); process.exit(1); }
  console.log('✓ 떠 있는 미르 렌더 연막검사 통과 (실사 얼굴 · 시트 위 전신 · 생각하는 얼굴 · 시트 · 홈 배 이름 답 · 항차 재료 답 · 플랜 덮개 · 고백 · 닫기)');
  process.exit(0);
})();
