// 5.23 연막검사 — 시프팅 예정(◇에 더함) · 선적 예정 대 리스트 · 화면 글에 출처 이름(카토스) 없음.
//   실행 — node tools/smoke_plan523.cjs <repoRoot> <번들(smoke_plan523.jsx)>. 실패하면 빌드를 세운다.
//   실자료 — XTPG 550E(tools/fixtures/plan523_xtpg550e.json · 배정표 이적 28대 = 56모브).
const fs = require('fs');
const path = require('path');
const root = process.argv[2] || process.cwd();
const bundle = process.argv[3];
(async () => {
  let bad = 0, n = 0;
  const ok = (c, m, d = '') => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m + (c || !d ? '' : ' — ' + String(d).slice(0, 300))); if (!c) bad++; };
  if (!bundle) { console.log('번들 경로가 없다'); process.exit(1); }
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  const errs = [];
  dom.window.addEventListener('error', (e) => errs.push(e.message));
  try { dom.window.eval(fs.readFileSync(bundle, 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
  const T = dom.window.__T, W = dom.window;
  if (!T) { console.log('  FAIL 번들이 시험 함수를 못 내놓았다', errs.join(' | ')); process.exit(1); }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const FX = T.FX, VK = FX.voyageKey;
  W.__fbShipBayDict = { XTPG: FX.dict };
  const noPlan = () => { const v = clone(FX.voyage); delete v.catosPlan; return v; };

  console.log('① 예정 읽기 — planShiftOf');
  const ps = T.planShiftOf(FX.voyage);
  ok(Object.keys(ps).length === 28, '예정 시프팅 28대(10베이 데크 12 · 22베이 데크 16)', Object.keys(ps).length);
  const byBay = {}; for (const p of Object.values(ps)) byBay[p.bay] = (byBay[p.bay] || 0) + 1;
  ok(byBay['10'] === 12 && byBay['22'] === 16, '베이별 10:12 · 22:16', JSON.stringify(byBay));
  ok(Object.keys(T.planShiftOf({})).length === 0 && Object.keys(T.planShiftOf({ catosPlan: { shift: { X: { from: '1' }, ABCD1234567: { from: 'abc' } } } })).length === 0, '예정이 없거나 자리가 틀린 줄은 버린다');

  console.log('② ◇ 에 더함 — 예정 없으면 종전 그대로');
  const m0 = T.shiftingMapForDisplay(VK, noPlan(), FX.dict);
  const m1 = T.shiftingMapForDisplay(VK, clone(FX.voyage), FX.dict);
  const k0 = Object.keys(m0), k1 = Object.keys(m1);
  ok(k0.length === 12, '예정 없이 앱 예측 12대(현행 그대로)', k0.length);
  ok(k1.length === 28, '예정을 더하면 28대 = 배정표 56모브', k1.length);
  ok(k0.every((c) => k1.includes(c)), '앱 예측 12대는 그대로 남는다');
  ok(k1.every((c) => T.isPredShift(m1[c])), '28대 모두 예측(◇) — 확정(◆)이 아니다');
  ok(k1.filter((c) => m1[c]._plan).length === 28 && Object.keys(m1).every((c) => /^[A-Z]{4}\d{7}$/.test(c)), '28대 모두 예정 표식 · 부가정보는 열거되지 않는다');
  ok(m1._meta && m1._meta.planN === 28 && m1._meta.planAdded === 16, '부가정보 — 예정 28 · 더한 것 16', JSON.stringify(m1._meta || null));
  const added = k1.filter((c) => !k0.includes(c));
  ok(added.length === 16 && added.every((c) => m1[c].bay === '22' && m1[c].from && m1[c].to === ''), '더한 16대는 22베이 · from 있고 to 빈칸(목록 정렬 계약)', added.slice(0, 3).map((c) => JSON.stringify(m1[c])).join(' '));
  const whyAll = k1.map((c) => m1[c]._why || '').join(' ');
  ok(!/카토스|CATOS|catos/i.test(whyAll), '화면 이유 글에 출처 이름이 없다', whyAll.slice(0, 200));

  console.log('②-B 머리 표식 — 예정이 섞이면 «확정» 이 아니라 «예정» (감사 중)');
  const e0 = T.shiftEvidenceOf(VK, noPlan(), m0), e1 = T.shiftEvidenceOf(VK, clone(FX.voyage), m1);
  ok(e0 && e0.label === '불일치', '예정 없이 12 대 28 — «불일치» 그대로', e0 && e0.label);
  ok(e1 && e1.label === '예정' && e1.label !== '확정', '예정을 더해 28=28 — 머리 표식 «예정»(확정 아님)', e1 && e1.label);
  ok(e1 && /앱 예측 12대 \+ 예정 16대 = 28대\(확정 아님\)/.test(e1.line) && !/카토스|CATOS/i.test(e1.line), '근거 줄 «앱 예측 12대 + 예정 16대 = 28대(확정 아님)»', e1 && e1.line);
  const sl = T.shiftingListOf(m1, {}, clone(FX.voyage));
  const slArr = Array.isArray(sl) ? sl : (sl && sl.list) || [];
  const slAdd = slArr.filter((x) => added.includes(x.cn));
  ok((slAdd.length === 16 && slAdd.every((x) => x.fe)), '시프팅 목록 — 예정 16대도 F/E 칸이 찬다', JSON.stringify(slAdd.slice(0, 2)));
  const ps2 = T.predictedShiftingForDisplay({ catosPlan: { shift: { ABCD1234567: { from: '020484', iso: '4510', fe: 'E' } } } });
  ok(ps2.ABCD1234567 && ps2.ABCD1234567.bay === '2' && ps2.ABCD1234567.pos === '2-04-84', '10베이 미만 자리 표기는 앱 예측과 같다(«2-04-84»)', JSON.stringify(ps2.ABCD1234567 || null));

  console.log('③ 선적 예정 대 리스트 — 검증 상자');
  const recs = Object.values(FX.voyage.loading.records);
  const el = W.document.getElementById('root');
  const r = T.createRoot(el);
  r.render(T.React.createElement(T.ValidationBox, { ediContainers: [], records: recs, mode: 'loading', voyageKey: VK, planLoad: FX.voyage.catosPlan.load }));
  await new Promise((res) => setTimeout(res, 200));
  const line = el.querySelector('[data-plan-load-line]');
  ok(!!line, '선적 예정 줄이 그려진다', el.innerHTML.slice(0, 200));
  const txt = line ? line.textContent : '';
  ok(/선적 예정 160대 · 리스트 164대 — 리스트에만 5 · 예정에만 1/.test(txt), '«선적 예정 160대 · 리스트 164대 — 리스트에만 5 · 예정에만 1»', txt);
  const btn = line && line.querySelector('button');
  if (btn) { btn.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); await new Promise((res) => setTimeout(res, 100)); }
  const det = el.querySelector('[data-plan-load-detail]');
  const dt = det ? det.textContent : '';
  ok(['CIMU0993423', 'CIMU1192115', 'FCIU7355872', 'FSCU7211323', 'XHCU5583992'].every((c) => dt.includes(c)) && dt.includes('FFAU4248425'), '펼치면 리스트에만 5대 · 예정에만 FFAU4248425', dt);
  ok(!/카토스|CATOS|catos/i.test(el.textContent), '검증 상자 글에 출처 이름이 없다', el.textContent.slice(0, 200));
  r.render(T.React.createElement(T.ValidationBox, { ediContainers: [], records: recs, mode: 'discharge', voyageKey: VK, planLoad: FX.voyage.catosPlan.load }));
  await new Promise((res) => setTimeout(res, 100));
  ok(!el.querySelector('[data-plan-load-line]'), '양하 화면에는 선적 예정 줄이 없다');

  console.log('④ 화면 글 — 소스 전수(주석 밖 문자열)에 출처 이름 없음');
  const files = [];
  const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const s = fs.statSync(p); if (s.isDirectory()) walk(p); else if (/\.(jsx?|mjs)$/.test(f)) files.push(p); } };
  walk(path.join(root, 'src'));
  const hits = [];
  for (const f of files) {
    let s = fs.readFileSync(f, 'utf8');
    s = s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
    s.split('\n').forEach((l, i) => {
      const code = l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1');
      const lits = code.match(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|>[^<{}]*</g) || [];
      for (const t of lits) if (/카토스|CATOS/.test(t)) hits.push(path.relative(root, f) + ':' + (i + 1) + ' ' + t.slice(0, 80));
    });
  }
  ok(hits.length === 0, '소스 문자열·JSX 글에 «카토스»·«CATOS» 0건', hits.slice(0, 8).join(' | '));
  const cone = fs.readFileSync(path.join(root, 'public/cone.html'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
  const coneHits = cone.split('\n').map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).filter((l) => /카토스|CATOS/.test(l));
  ok(coneHits.length === 0, '콘앱 화면 글에 «카토스»·«CATOS» 0건', coneHits.slice(0, 4).join(' | '));

  ok(errs.length === 0, '오류 0', errs.join(' | '));
  console.log(`5.23 시프팅·선적 예정 연막검사 — ${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})();
