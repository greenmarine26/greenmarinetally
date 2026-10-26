// 4.52 연막검사 — 연태 오픈탑 실 컨으로 컨 상세 화면(실소스)을 그려 «하이큐 오픈탑» 표기와 «규격이 자료마다 다릅니다» 카드가 없는 것을 잰다.
//   실행 — node tools/smoke_ot452.cjs <repoRoot> <번들(smoke_ot452.jsx)>. 실패하면 빌드를 세운다.
//   실자료 — OBWH 2775E 양하 실 DB 읽기(2026-10-26 09:05 KST) · OBWH 2765E 실서비스 사본(iso42501.json). 실 Firebase 에는 아무것도 안 쓴다(SDK 만 메모리 DB).
//   검수사 2026-10-26 08:51 «오픈탑중에 일반 20OT와 20 하이큐 OT이 있는데 표기가 여러개 입니다» · 09:16 «오픈탑으로 잡고 하이큐 오픈탑으로 표기 하면되는것인데» · 09:20 «보통 20OT나 22UT는 많이 사용하는데 20U6는 잘 사용안합니다».
const fs = require('fs');
const bundle = process.argv[3];
(async () => {
  let bad = 0, n = 0;
  const ok = (c, m, d = '') => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m + (c || !d ? '' : ' — ' + String(d).slice(0, 400))); if (!c) bad++; };
  if (!bundle) { console.log('번들 경로가 없다'); process.exit(1); }
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.global = dom.window;
  const errs = [];
  dom.window.addEventListener('error', (e) => errs.push(e.message));
  console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s) && !/act\(/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
  dom.window.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
  dom.window.alert = (m) => errs.push('alert: ' + String(m).slice(0, 160));
  try { dom.window.eval(fs.readFileSync(bundle, 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(300);
  const W = dom.window, doc = W.document, F = W.__F;
  if (!F || !W.__renderDetail) { console.log('  FAIL 번들이 시험 함수를 못 내놓았다', errs.join(' | ')); process.exit(1); }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const show = async (c) => { W.__renderDetail(clone(c)); await wait(250); return (doc.body.textContent || '').replace(/\s+/g, ' '); };
  const HC = '하이큐 오픈탑', CONFLICT = /규격이 자료마다 다릅니다|점검요망/;

  console.log('① 연태 20피트 오픈탑 — EDI V코드 22V7 + 세관 22U6(보통 쓰는 22UT 로 보여 준다) · 일반 오픈탑이라 «하이큐 오픈탑» 표기는 없다');
  const b = await show(F.B_TEMU5279995_unpicked);
  ok(/20OT/.test(b) && /22UT/.test(b), 'TEMU5279995 — 머리 «20OT (22UT)»', b.slice(0, 300));
  ok(!b.includes(HC), 'TEMU5279995 — 일반 오픈탑에는 «하이큐 오픈탑» 이 안 붙는다');
  ok(!CONFLICT.test(b), 'TEMU5279995 — EDI 22V7 / 세관 22U6 은 규격 갈림 카드가 안 뜬다(종전 «EDI 22VH / 세관 22UT»)', b.slice(0, 300));

  console.log('② 연태 20피트 하이큐 오픈탑 — EDI 22V7 + 세관 20HT → 오픈탑으로 잡고 «하이큐 오픈탑» 표기');
  const a = await show(F.A_TEMU4984732_unpicked);
  ok(/20OT/.test(a) && !/20HC/.test(a), 'TEMU4984732 — 머리 «20OT» (20HC 드라이로 읽지 않는다)', a.slice(0, 300));
  ok(a.includes(HC), 'TEMU4984732 — «하이큐 오픈탑» 표기', a.slice(0, 300));
  ok(!CONFLICT.test(a), 'TEMU4984732 — EDI 22V7 / 세관 20HT 는 규격 갈림 카드가 안 뜬다(종전 «EDI 22VH / 세관 25GP»)', a.slice(0, 300));
  ok(/하이큐 오픈탑\(25UT\)/.test(a), 'TEMU4984732 — 머리 괄호는 하이큐 25UT (22UT 로 낮춰 적지 않는다)', a.slice(0, 300));

  console.log('③ 연태 40피트 하이큐 오픈탑 — EDI 42V1 + 세관 40HT');
  const c3 = await show(F.C_TGHU4437784_unpicked);
  ok(/40OT/.test(c3) && c3.includes(HC), 'TGHU4437784 — 머리 «40OT» + «하이큐 오픈탑»', c3.slice(0, 300));
  ok(!CONFLICT.test(c3), 'TGHU4437784 — 규격 갈림 카드가 안 뜬다', c3.slice(0, 300));
  ok(/하이큐 오픈탑\(45UT\)/.test(c3), 'TGHU4437784 — 머리 괄호는 하이큐 45UT', c3.slice(0, 300));

  console.log('④ 검수사가 09:07 에 이미 고른 실 기록(iso 20HT · ot true) — 20HC 로 읽히지 않고 «20OT 하이큐 오픈탑»');
  const e5 = await show(F.E_TEMU4984732_picked);
  ok(/20OT/.test(e5) && e5.includes(HC), 'TEMU4984732(고른 뒤) — 머리 «20OT» + «하이큐 오픈탑»', e5.slice(0, 300));
  ok(!/규격 확정/.test(e5) && !/다시 고르기/.test(e5) && !/20HC/.test(e5) && !CONFLICT.test(e5), 'TEMU4984732(고른 뒤) — 고를 것이 없으니 «규격 확정 … 20HC»·«다시 고르기»·갈림 카드가 모두 없다(검수사 09:14 «다시고르기를 선택할것이 없습니다»)', e5.slice(0, 400));
  //  합성(실자료 아님) — 진짜 갈림(EDI 22G1 ↔ 세관 20HT)에서 고른 확정은 종전대로 줄과 되돌리는 단추를 남기고, 라벨은 옛 «20HC» 가 아니라 지금 규격 «20OT»
  const e6 = await show({ ...F.E_TEMU4984732_picked, iso_edi: '22G1', iso_customs: '20HT', iso_pick_label: '20OT' });
  ok(/규격 확정 — 세관 것 20OT/.test(e6) && /다시 고르기/.test(e6) && !/20HC/.test(e6), '합성 진짜 갈림 + 고른 확정 — «규격 확정 — 세관 것 20OT» 와 «다시 고르기» 가 남는다(옛 20HC 없음)', e6.slice(0, 400));

  console.log('⑤ 일반 드라이 컨은 그대로 — 22G1');
  const d4 = await show(F.D_plain22G1);
  ok(!d4.includes(HC) && !CONFLICT.test(d4) && /20/.test(d4), 'CICU2998656 22G1 — 하이큐 오픈탑 표기·갈림 카드 없음', d4.slice(0, 300));

  ok(errs.length === 0, '렌더 중 오류·경고창 0건', errs.join(' | '));
  console.log(`\n4.52 오픈탑 렌더 연막검사 ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('✗ 오류', e && e.stack || e); process.exit(1); });
