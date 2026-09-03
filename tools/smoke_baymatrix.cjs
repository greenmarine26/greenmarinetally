// 베이매트릭스 관리 화면(3.5) — jsdom 으로 실제 그리고 눌러 본다. 실패하면 빌드를 세운다.
//   ① 상태 칩(전체/지금 기항/기록 있음/기록 못 찾음)이 실사전 표본을 맞게 가른다
//   ② 고르는 칸 — 여러 척을 골라 [휴지통으로] 를 누르면 확인 뒤 fbTrashShipBayDict 가 고른 만큼 불린다
//   ③ 비고란 — 적고 저장하면 fbSetShipBayDictNote 가 그 코드·글로 불린다
const { JSDOM } = require('jsdom');
const fs = require('fs');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const errs = [];
dom.window.addEventListener('error', (e) => errs.push(e.message));
console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
dom.window.alert = (m) => { (dom.window.__alerts = dom.window.__alerts || []).push(String(m)); };
try { dom.window.eval(fs.readFileSync(process.argv[2], 'utf8')); }
catch (e) { errs.push('THROW: ' + e.message); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  await wait(700);
  const doc = dom.window.document, W = dom.window;
  const fail = (m) => { console.log('✗ ' + m); process.exit(1); };
  const uniq = [...new Set(errs)];
  if (uniq.length) { console.log('✗ 렌더 중 오류 ' + uniq.length + '건'); uniq.slice(0, 3).forEach(e => console.log('   ' + e)); process.exit(1); }
  const txt = () => doc.body.textContent || '';
  const btns = () => [...doc.querySelectorAll('button')];
  const click = (re) => { const b = btns().find(x => re.test((x.textContent || '').trim())); if (!b) return false; b.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); return true; };
  let t = txt();
  if (!/베이매트릭스/.test(t)) fail('화면이 안 떴다: ' + t.slice(0, 160));
  //  ① 상태 칩 — 픽스처 10척: 지금 기항 1(KSKM 활성 항차) · 기록 있음 4(NSDC·STAR·V7A5 는 같은 IMO 9939292 · KKAK 마감대기) · 못 찾음 5
  //    ⚠ 중복 키(STAR·V7A5)가 정본과 같은 IMO 라 «기록 있음»으로 잡힌다 — 실수로 지우지 않게 하는 쪽이라 이대로 둔다.
  if (!/전체 7/.test(t)) fail('메인 전체가 7척이 아니다(10 − 보조 3): ' + t.slice(0, 200));
  if (!/지금 기항 1/.test(t)) fail('«지금 기항» 이 1척이 아니다(KSKM 활성 항차)');
  if (!/기록 있음 3/.test(t)) fail('«기록 있음» 이 3척이 아니다(STAR 가 보조로 빠졌다)');
  if (!/기록 못 찾음 3/.test(t)) fail('«기록 못 찾음» 이 3척이 아니다(ARTO·GUBR 는 보조로 빠졌다)');
  if (!/없다는 단정이 아닙니다/.test(t)) fail('«단정이 아니다» 안내가 없다 — 지우기 전에 읽어야 하는 문장이다');
  //  칩으로 좁힌다
  if (!click(/^기록 못 찾음 3$/)) fail('«기록 못 찾음» 칩이 없다');
  await wait(300);
  t = txt();
  if (/KSKM/.test(t.split('검색 결과')[1] || t)) { /* 칩 라벨에도 코드가 없으니 목록만 본다 */ }
  if (!/NBTD/.test(t) || !/PCSG/.test(t) || !/SWAL/.test(t)) fail('못 찾음 목록에 NBTD·PCSG·SWAL 이 없다');
  //  ② 고르기 → 휴지통
  const rowBtns = btns().filter(b => /고르기$/.test(b.getAttribute('aria-label') || ''));
  if (rowBtns.length !== 3) fail(`고르는 칸이 3개가 아니다 (${rowBtns.length})`);
  rowBtns[0].dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
  rowBtns[1].dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
  await wait(300);
  if (!/고른 2척/.test(txt())) fail('«고른 2척» 이 안 뜬다: ' + txt().slice(0, 200));
  if (!click(/휴지통으로/)) fail('[휴지통으로] 버튼이 없다');
  await wait(300);
  if (!/휴지통\(ship_bay_dict_trash\)/.test(txt())) fail('확인 모달에 «되돌릴 수 있다» 설명이 없다: ' + txt().slice(0, 240));
  //  ⚠ «휴지통으로» 는 둘이다 — 일괄 바 버튼과 확인 모달의 확인 버튼. **뒤엣것**을 누른다.
  {
    const cands = btns().filter(b => /^휴지통으로$/.test((b.textContent || '').trim()));
    if (cands.length < 2) fail(`확인 모달의 [휴지통으로] 가 없다 (${cands.length})`);
    cands[cands.length - 1].dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
  }
  await wait(600);
  const trashed = (W.__calls || []).filter(c => c.fn === 'trash');
  if (trashed.length !== 2) fail(`휴지통 이동이 2건이 아니다 (${trashed.length}) — ${JSON.stringify(W.__calls)}`);
  if (!trashed.every(c => c.by === '김성일')) fail('누가 옮겼는지가 안 남는다');
  //  ③ 비고
  const noteBtns = btns().filter(b => /비고$/.test(b.getAttribute('aria-label') || ''));
  if (!noteBtns.length) fail('비고 버튼이 없다');
  noteBtns[0].dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
  await wait(300);
  const ta = doc.querySelector('textarea');
  if (!ta) fail('비고 입력칸이 안 열린다');
  const setVal = W.Object.getOwnPropertyDescriptor(W.HTMLTextAreaElement.prototype, 'value').set;
  setVal.call(ta, '아직 평택에 안 오는 배 — 도면만 있음');
  ta.dispatchEvent(new W.Event('input', { bubbles: true }));
  await wait(200);
  if (!/300/.test(txt())) fail('글자수 표시가 없다');
  if (!click(/비고 저장/)) fail('[비고 저장] 버튼이 없다');
  await wait(500);
  const notes = (W.__calls || []).filter(c => c.fn === 'note');
  if (notes.length !== 1 || notes[0].note !== '아직 평택에 안 오는 배 — 도면만 있음' || notes[0].by !== '김성일') fail('비고 저장 호출이 다르다: ' + JSON.stringify(notes));
  if (!/비고를 저장했습니다/.test(txt())) fail('저장 알림이 없다');
  // ── 3.5 보조 보관함(검수사 지시 2026-09-03 «메인화면에 넣지말고 보조리스트 — 입항하면 수정해서 사용») ──
  //    픽스처 보조 4(GUBR·ARTO·STAR·KSKM) 중 KSKM 은 활성 항차라 **메인에 남아야** 한다.
  {
    const t2 = txt();
    if (!/📦 보조 보관함 3/.test(t2)) fail('보조 보관함 칩이 3척이 아니다(KSKM 은 활성이라 빠져야 한다): ' + t2.slice(0, 200));
  }
  if (!click(/📦 보조 보관함 3/)) fail('보조 보관함 칩을 못 눌렀다');
  await wait(400);
  {
    const t3 = txt();
    if (!/GUBR/.test(t3) || !/ARTO/.test(t3)) fail('보조 목록에 GUBR·ARTO 가 없다: ' + t3.slice(0, 200));
    if (/KSKM/.test(t3)) fail('활성 항차 KSKM 이 보조 목록에 있다 — 입항했으면 메인으로 돌아와야 한다');
    if (!/입항해 항차가 뜨면 저절로 메인으로 돌아옵니다/.test(t3)) fail('보조 보관함 안내 문구가 없다');
  }
  {
    const rb = btns().filter(b => /고르기$/.test(b.getAttribute('aria-label') || ''));
    if (rb.length !== 3) fail(`보조 목록 고르는 칸이 3개가 아니다 (${rb.length})`);
    rb[0].dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
    await wait(300);
    if (!click(/^메인으로$/)) fail('[메인으로] 버튼이 없다');
    await wait(500);
    const sp = (W.__calls || []).filter(c => c.fn === 'spare');
    if (sp.length !== 1 || sp[0].on !== false || sp[0].by !== '김성일') fail('보조 해제 호출이 다르다: ' + JSON.stringify(sp));
  }
  console.log(`✓ 베이매트릭스 관리 연막검사 통과 (칩 메인7·기항1·기록3·못찾음3 · 고르기 2척 → 휴지통 2건 · 비고 저장 «${notes[0].code}» · 보조 3(활성 KSKM 복귀)·메인으로 1건 · 오류 0)`);
  process.exit(0);
})();
