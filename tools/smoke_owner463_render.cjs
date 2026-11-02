// 4.63 관리앱 화면 실제 렌더 연막검사 — 소유자는 메뉴 전부, 비소유자는 «소유자 전용» 안내만(위험 구역·패널 없음)
const fs = require('fs');
const bundle = process.argv[3];
(async () => {
  let bad = 0, n = 0;
  const ok = (c, m) => { n++; if (!c) bad++; console.log(`  ${c ? 'PASS' : 'FAIL'} ${m}`); };
  if (!bundle) { console.log('  FAIL 번들 경로가 없다'); process.exit(1); }
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  const errs = [];
  dom.window.addEventListener('error', (e) => errs.push(e.message));
  const ce = console.error; console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
  dom.window.alert = () => {};
  try { dom.window.eval(fs.readFileSync(bundle, 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const doc = dom.window.document;
  const txt = () => doc.body.textContent || '';
  const click = (re) => { const b = [...doc.querySelectorAll('button')].find((x) => re.test((x.textContent || '').trim())); if (!b) return false; b.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); return true; };
  dom.window.__renderOwner({ inspector: '김성일' }); await wait(500);
  let t = txt();
  ok(/관리앱/.test(t) && doc.querySelector('[data-owner-menu]') && doc.querySelector('[data-danger-zone]'), '소유자(김성일) — 관리앱 머리와 소유자 메뉴·위험 구역이 그려진다');
  ok(/교대 시각 터미널 기준/.test(t) && /활동 로그/.test(t) && /AI 비용/.test(t) && /인원 관리/.test(t), '소유자 — 교대 시각·활동 로그·AI 비용·인원 관리 네 가지가 보인다');
  ok(click(/활동 로그/) && (await wait(500), true) && /오늘|어제|7일/.test(txt()), '소유자 — 활동 로그를 펴면 기간 선택이 뜬다');
  ok(click(/교대 시각 터미널 기준/) && (await wait(300), true), '소유자 — 교대 시각 접이를 펴도 던지지 않는다');
  click(/인원 관리/); click(/검수앱/); click(/수석앱/);
  ok(dom.window.__staff === 1 && dom.window.__home === 1 && dom.window.__chief === 1, '소유자 — 인원 관리 창 열기·검수앱·수석앱 단추가 부름을 한 번씩 낸다');
  dom.window.__renderOwner({ inspector: '이현규' }); await wait(500);
  t = txt();
  ok(/소유자 전용/.test(t) && !doc.querySelector('[data-owner-menu]') && !doc.querySelector('[data-danger-zone]') && !/모든 작업 보고 삭제|활동 로그|AI 비용/.test(t), '비소유자(이현규) — «소유자 전용» 안내만, 메뉴·위험 구역·패널이 없다');
  ok(errs.length === 0, '렌더 중 오류 0건' + (errs.length ? ' | ' + errs.slice(0, 3).join(' | ') : ''));
  console.error = ce;
  console.log(bad ? `✗ 4.63 관리앱 렌더 연막검사 — 통과 ${n - bad} · 실패 ${bad}` : `✓ 4.63 관리앱 렌더 연막검사 — 통과 ${n}`);
  process.exit(bad ? 1 : 0);
})();
