// 떠 있는 미르(3.41) — jsdom 으로 실제 그리고 눌러 본다. 실패하면 빌드를 세운다.
//   ① 오른쪽 아래 얼굴이 뜬다 ② 누르면 시트(입력·🎤·🔊·질문)가 올라온다 ③ 홈에서 «KBTR 3426 온도» → 그 항차 자료로 답 ④ 항차 화면이 재료를 놓으면(publishMirCtx) 배 이름 없이 «3426 온도» 도 답
//   ⑤ «KBTR 카고플랜 보여줘» → 플랜 덮개(onOpenPlan) 호출 ⑥ 모르는 말은 «못 배웠어요» 고백 ⑦ 렌더 오류 0
const { JSDOM } = require('jsdom');
const fs = require('fs');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(e.message));
console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
dom.window.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; }, speaking: false, pending: false };
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
  if (!/mir-face|data:image/.test(fab.style.background)) fail('얼굴 그림이 배경에 안 실렸다');
  fab.click(); await wait(100);
  const inp = doc.getElementById('mirFabIn');
  if (!inp) fail('얼굴을 눌렀는데 시트(입력칸)가 안 올라온다');
  const t = doc.body.textContent;
  for (const s of ['미르에게 묻기', '🎤', '🔊', '질문']) if (!t.includes(s)) fail(`시트에 «${s}» 가 없다`);
  const setVal = (el, v) => { const setter = Object.getOwnPropertyDescriptor(W.HTMLInputElement.prototype, 'value').set; setter.call(el, v); el.dispatchEvent(new W.Event('input', { bubbles: true })); };
  const askBtn = () => [...doc.querySelectorAll('button')].find((b) => b.textContent.trim() === '질문');
  const ask = async (q) => { setVal(inp, q); askBtn().click(); for (let i = 0; i < 40; i++) { await wait(100); const o = doc.body.textContent; if (!/…$/.test(o.trim()) && o.includes(q) && o.length > 200) break; } return doc.body.textContent; };
  // ③ 홈 — 배 이름으로
  let o = await ask('KBTR 3426 온도');
  if (!o.includes('FBIU5093426') || !o.includes('세팅 온도 기록 없음')) fail('홈에서 «KBTR 3426 온도» 답이 없다: ' + o.slice(0, 200));
  o = await ask('NSFR 엑스레이 대상 위치');
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
  // ⑤ 플랜 명령 → 덮개
  o = await ask('KBTR 카고플랜 보여줘');
  const pl = W.__calls.find((c) => c.fn === 'plan');
  if (!pl || pl.voyageKey !== 'KBTR_2606E' || pl.what !== 'cargo') fail('«KBTR 카고플랜 보여줘» 가 플랜 덮개를 안 연다: ' + JSON.stringify(W.__calls));
  if (!/카고플랜을 열었어요/.test(o)) fail('플랜 명령 답 «열었어요» 가 없다');
  // ⑥ 모르는 말 — 고백
  W.__unpublish(); await wait(50);
  o = await ask('타닥타닥 후루룩 쩝쩝');   // 아무 갈래에도 안 걸리는 말
  if (!/못 배웠어요|배 이름을 붙여/.test(o)) fail('모르는 말에 고백이 없다: ' + o.slice(0, 200));
  // ⑦ 닫기
  [...doc.querySelectorAll('button')].find((b) => b.textContent.trim() === '✕').click(); await wait(50);
  if (doc.getElementById('mirFabIn')) fail('✕ 를 눌렀는데 시트가 안 닫힌다');
  const uniq2 = [...new Set(errs)];
  if (uniq2.length) { console.log('✗ 누르는 중 오류 ' + uniq2.length + '건'); uniq2.slice(0, 3).forEach((e) => console.log('   ' + e)); process.exit(1); }
  console.log('✓ 떠 있는 미르 렌더 연막검사 통과 (얼굴 · 시트 · 홈 배 이름 답 · 항차 재료 답 · 플랜 덮개 · 고백 · 닫기)');
  process.exit(0);
})();
