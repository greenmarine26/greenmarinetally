// 4.45-02 연막검사 — 주의 박스 «예상 실오류»는 자릿수 부족·컨번호와 같은 씰만, 대표 모양과 다른 씰 계열은 «씰 모양 다름»(참고)으로 따로.
//   실행 — node tools/smoke_sealkind44502.cjs <repoRoot> <번들(smoke_sealkind44502.jsx)>. 실패하면 빌드를 세운다.
//   실측 — MAMP 641N 양하 리스트 317: 4.45-01 은 «예상 실오류 28건 — 씰 모양이 다름 · 자릿수·형식 28». 메일 StandardDischargeList 씰 칸(Shipper·Customs·ML·Vet)으로 보면
//     화주 씰 숫자 8자리 18(ML 칸에 PH+7 이 함께 있음) · 인도네시아 머스크 씰 ID+7 9 · MLPH+7 1 — 자릿수 부족 0. 정답지 MCAP 639N(자릿수 부족 1 · 컨번호와 같은 씰 1, 고친 1건 제외)은 그대로.
const fs = require('fs');
const root = process.argv[2] || process.cwd();
const bundle = process.argv[3];
(async () => {
  let bad = 0, n = 0;
  const ok = (c, m, d = '') => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m + (c || !d ? '' : ' — ' + String(d).slice(0, 300))); if (!c) bad++; };
  if (!bundle) { console.log('번들 경로가 없다'); process.exit(1); }
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.global = dom.window;
  const errs = [];
  dom.window.addEventListener('error', (e) => errs.push(e.message));
  console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
  dom.window.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
  try { dom.window.eval(fs.readFileSync(bundle, 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(300);
  const T = dom.window.__T;
  if (!T) { console.log('  FAIL 번들이 시험 함수를 못 내놓았다', errs.join(' | ')); process.exit(1); }
  const M = T.FX.mamp641n.discharge;

  console.log('① MAMP 641N 양하 — 28건은 실오류가 아니라 «씰 모양 다름»(참고)');
  const al = T.runDiagnostics({ ediContainers: M.edi, listRecords: M.records, xrayList: {}, mode: 'discharge' }) || [];
  const fmt = al.find((a) => a.code === 'seal_format'), kind = al.find((a) => a.code === 'seal_kind');
  ok(!fmt, '«예상 실오류» 경고가 서지 않는다(4.45-01 은 28건)', fmt && fmt.msg);
  ok(!!kind && kind.level === 'info' && kind.count === 28 && kind.details.length === 28, '«씰 모양 다름» 참고(🔵) 28건', kind && `${kind.level} ${kind.count}`);
  ok(!!kind && /^씰 모양 다름 28건\(참고\) · 대표 PH\+7 · 숫자 8자리 18 · ID\+7 9 · MLPH\+7 1$/.test(kind.msg),
    '문구 — 씰 모양 다름 28건(참고) · 대표 PH+7 · 숫자 8자리 18 · ID+7 9 · MLPH+7 1', kind && kind.msg);
  ok(!!kind && kind.voice === '', '참고 줄은 음성으로 읽지 않는다');
  const raw = T.sealFormatAnomalies(M.records, { edi: T.ediSealMapOf(M.edi) });
  ok(raw.length === 28 && raw.every((x) => x.kind === 'shape' && !x.short), '판정 한 벌(utils.sealFormatAnomalies)은 그대로 — 28건 모두 모양 갈래 · 자릿수 부족 0');
  const rows = Object.values(M.records).map((r) => ({ cn: r.cn, sl: r.sl, sl_orig: r.sl_orig, op: r.op }));
  ok(T.sealPredictOf(rows, M.records, M.edi).length === 0, '미르(실번호 점검·브리핑)도 예상 실오류로 말하지 않는다');

  console.log('② 정답지 MCAP 639N — 예상 실오류는 그대로');
  const al2 = T.runDiagnostics({ ediContainers: {}, listRecords: T.MCAP.discharge, xrayList: {}, mode: 'discharge' }) || [];
  const f2 = al2.find((a) => a.code === 'seal_format'), k2 = al2.find((a) => a.code === 'seal_kind');
  ok(!!f2 && f2.level === 'warning' && f2.count === 2 && f2.msg === '예상 실오류 2건 — 자릿수 부족 1 · 컨번호와 같은 씰 1', '«예상 실오류 2건 — 자릿수 부족 1 · 컨번호와 같은 씰 1»(고친 1건은 빠짐)', f2 && f2.msg);
  ok(!k2, '«씰 모양 다름» 줄은 없다');

  console.log('③ 미르 설명 — 두 줄을 섞지 않는다');
  const a1 = T.answerAboutAlert('씰 모양 다름 뭐야', [f2, kind]);
  ok(!!a1 && /씰 모양 다름 28건/.test(a1) && /따로 참고로/.test(a1), '«씰 모양 다름 뭐야» → 참고 줄 설명', a1 && a1.slice(0, 120));
  const a2 = T.answerAboutAlert('예상 실오류 뭐야', [f2, kind]);
  ok(!!a2 && /예상 실오류 2건/.test(a2) && /자릿수가 모자라거나/.test(a2), '«예상 실오류 뭐야» → 예상 실오류 설명', a2 && a2.slice(0, 120));
  ok(T.answerAboutAlert('실오류 있지?', [f2, kind]) === null, '«실오류 있지?»는 경고 설명이 가로채지 않는다(4.39-02 실번호 점검으로 감)');
  ok(T.answerAboutAlert('실 종류별로 알려줘', [f2, kind]) === null && T.answerAboutAlert('씰 계열 뭐야', [f2, kind]) === null, '«실 종류별로 알려줘»·«씰 계열 뭐야»는 이 경고 설명이 삼키지 않는다(감사 하2)');
  //  감사 하1 — EDI 실이 리스트와 다른 컨이 있어 «실번호 다름»(seal_diff, 🔵)이 같이 서도 «씰 모양 다름 뭐야» 는 씰 모양 다름 설명으로(MAMP 641N EDI 실 하나를 바꾼 사본)
  const ediX = JSON.parse(JSON.stringify(M.edi)); const k0 = Object.keys(ediX).find((k) => M.records[ediX[k].cn] && M.records[ediX[k].cn].sl);   // MAMP EDI(BAPLIE)에는 실이 없다 — 리스트 실이 있는 컨 하나에 다른 실을 넣는다
  Object.assign(ediX[k0], { sl: 'ZZ0000001', pod: 'KRPTK', _mode: 'discharge' });   // 평택 양하분이어야 실번호 불일치를 센다
  const alX = T.runDiagnostics({ ediContainers: ediX, listRecords: M.records, xrayList: {}, mode: 'discharge' }) || [];
  const sdX = alX.find((a) => a.code === 'seal_diff'), kX = alX.find((a) => a.code === 'seal_kind');
  const a3 = T.answerAboutAlert('씰 모양 다름 뭐야', alX);
  ok(!!sdX && !!kX && alX.indexOf(sdX) < alX.indexOf(kX) && /씰 모양 다름 28건/.test(a3 || ''), '«실번호 다름» 이 먼저 서 있어도 «씰 모양 다름 뭐야» → 씰 모양 다름 설명', `${alX.map((a) => a.code).join(',')} → ${(a3 || '').slice(0, 60)}`);

  console.log('③-2 감사 경우 — 두 줄이 한 항차에 · 첫 갈래에서도 같은 계열 자릿수 부족');
  const C = T.FX.mcap634n.discharge;
  const alC = T.runDiagnostics({ ediContainers: C.edi, listRecords: C.records, xrayList: {}, mode: 'discharge' }) || [];
  const fC = alC.find((a) => a.code === 'seal_format'), kC = alC.find((a) => a.code === 'seal_kind');
  ok(!!fC && fC.msg === '예상 실오류 1건 — 자릿수 부족 1' && fC.details[0].cn === 'MNBU4696396' && !!kC && /^씰 모양 다름 5건\(참고\) · 대표 PH\+7 · ID\+7 5$/.test(kC.msg),
    'MCAP 634N — «예상 실오류 1건 — 자릿수 부족 1»(MNBU4696396 MLPH052397) + «씰 모양 다름 5건(참고) · 대표 PH+7 · ID+7 5»', `${fC && fC.msg} | ${kC && kC.msg}`);
  const N = T.FX.tnjp26344e.loading;
  const sN = T.sealFormatAnomalies(N.records, { edi: T.ediSealMapOf(N.edi) }).find((x) => x.cn === 'CKFU9260210');
  ok(!!sN && sN.short === true && /자릿수 부족/.test(sN.why), 'TNJP 26344E 선적 CKFU9260210 «0825» — 숫자 실 6자리 가운데 4자리라 자릿수 부족(첫 갈래가 모양 다름으로 잡아도)', sN && JSON.stringify(sN));
  const alN = T.runDiagnostics({ ediContainers: N.edi, listRecords: N.records, xrayList: {}, mode: 'loading' }) || [];
  const fN = alN.find((a) => a.code === 'seal_format');
  ok(!!fN && fN.details.some((x) => x.cn === 'CKFU9260210'), '그 컨은 «예상 실오류» 줄에 든다', fN && fN.msg);

  console.log('④ 화면 — 주의 박스(MAMP 641N)');
  dom.window.__renderDiag(al.filter((a) => a.code === 'seal_kind'));
  await wait(150);
  const doc = dom.window.document;
  const txt = () => doc.body.textContent || '';
  ok(/🔵 정보 1/.test(txt()) && !/🟡 주의/.test(txt()), '머리 표 — 🔵 정보 1 · 🟡 주의 없음', txt().slice(0, 120));
  const btn = [...doc.querySelectorAll('button')].find((b) => /씰 모양 다름 28건/.test(b.textContent || ''));
  ok(!!btn, '«씰 모양 다름 28건(참고) · …» 줄이 보인다');
  if (btn) btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await wait(100);
  const lines = [...doc.querySelectorAll('[data-seal-format-line]')];
  ok(lines.length === 20 && /외 8건/.test(txt()), '펼치면 20줄 + «외 8건»(잘라 보이기 한 벌)', `${lines.length}줄`);
  if (lines[0]) lines[0].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await wait(50);
  ok(dom.window.__opened.length === 1 && /^[A-Z]{4}\d{7}$/.test(dom.window.__opened[0]), '줄을 누르면 그 컨 상세를 연다', dom.window.__opened.join(','));
  ok(!errs.length, '화면 오류 0', errs.join(' | '));
  console.log(`\n4.45-02 씰 모양 다름 연막 — ${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})();
