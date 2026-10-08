// 4.04-02 연막검사 — RZOR 선내위치가 «덱_줄_칸»(C_2_20) 한 가지 좌표로 나온다: 미르 답 · 통계 탭 · CSV · 검색 목록 · 항차 화면 목록 — X-RAY 탭(4.04-01)과 같은 값.
//   검수사 2026-10-05 «미르 답, 통계 탭, CSV, 검색 목록은 아직 다른 표기입니다(미르는 20-02-86, 나머지는 «C덱 2줄 20칸»). 같은 좌표로 맞출까요? — 네 맞춰주세요»
//   기대값은 앱 함수가 아니라 **보관소(RTDB)에 수집기가 파이썬으로 따로 읽어 올린 좌표**(2026-10-05 읽기 전용 GET)에서 가져왔다 —
//     R109E: CICU9647782 → C덱 2줄 20칸(옛 미르 답 20-02-86) · TGHU9927423 → C덱 2줄 16칸 / R106E: CICU8423495 → D덱 8줄 10칸 · UETU3271841 → D덱 6줄 9칸 · NHFU9000522 → C덱 6줄 10칸.
//   실파일 tools/fixtures/rzor_rzdf_R109E.xls · rzor_rzdf_R106E.xlsx(선사 원본) + rzor_discharge_R109E_print.json(R109E 양하 148대 실목록)을 앱 함수에 그대로 넣는다.
//   고정하는 것 — ① 좌표를 목록에 붙이는 함수(withDeckPos) ② 표기 우선순위(fmtPos) ③ 전 항차 펼치기(미르·홈 검색) ④ 미르 답 ⑤ 콘앱 포장 ⑥ 통계 탭 화면 ⑦ CSV ⑧ 항차 화면·검색 패널·콘앱 배선 ⑨ 다른 배는 그대로.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'deckposall_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = path.join(TMP, 'dpa.js');
const stub = './tools/stub_fbdb_mem.js';
execSync(`npx esbuild tools/smoke_deckposall402.jsx --bundle --loader:.jsx=jsx --loader:.json=json --loader:.png=dataurl --jsx=automatic --external:fs --external:path --external:url `
  + `--alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${OUT}"`, { cwd: ROOT, stdio: 'pipe' });

(async () => {
  const { JSDOM } = require(path.join(ROOT, 'node_modules', 'jsdom'));
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://x/' });
  const W = dom.window;
  for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'localStorage', 'CustomEvent', 'Event']) global[k] = k === 'window' ? W : W[k];
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  W.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  W.__mirLexicon = {}; W.__mirLexiconWrite = () => {}; W.__fbShipBayDict = {};   // 미르 엔진이 창에서 읽는 것
  W.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } }; global.speechSynthesis = W.speechSynthesis;
  const errs = [];
  const _ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ')); };
  require(OUT);
  const P = W.__P;
  const XLSX = require(path.join(ROOT, 'node_modules', 'xlsx'));
  const fx = (f) => path.join(ROOT, 'tools', 'fixtures', f);
  const readPlan = (f) => P.parseDeckPlanWorkbook(XLSX.read(fs.readFileSync(fx(f)), { type: 'buffer', cellStyles: true }), XLSX);
  const D = W.document;
  const R109 = readPlan('rzor_rzdf_R109E.xls');
  const R106 = readPlan('rzor_rzdf_R106E.xlsx');
  const PR = JSON.parse(fs.readFileSync(fx('rzor_discharge_R109E_print.json'), 'utf8'));   // R109E 양하 실목록 148대(+ X-RAY 2대)
  const X1 = 'CICU9647782', X2 = 'TGHU9927423';
  const rowOf = (cn) => PR.containers.find((c) => c.cn === cn);

  console.log('■ ① 목록에 좌표 붙이기 — withDeckPos(실물 R109E·R106E)');
  {
    const list = [{ cn: X1, bay: '20', row: '02', tier: '86' }, { cn: X2, bay: '16', row: '02', tier: '86' }, { cn: 'ZZZU0000000', bay: '2', row: '01', tier: '84' }, { bay: '2' }];
    const out = P.withDeckPos(list, R109);
    ok('R109E CICU9647782 = C_2_20 · TGHU9927423 = C_2_16', out[0].deckPos === 'C_2_20' && out[1].deckPos === 'C_2_16', `${out[0].deckPos} ${out[1].deckPos}`);
    ok('덱플랜에 없는 컨·번호 없는 행은 좌표를 지어내지 않는다(그 칸 자체가 없다)', !('deckPos' in out[2]) && !('deckPos' in out[3]));
    ok('원본 목록·원본 행을 고치지 않는다(새 행으로 돌려준다 — 화면 메모가 이전 값을 그대로 믿는다)', !('deckPos' in list[0]) && out[0] !== list[0] && out !== list && out[2] === list[2]);
    ok('베이·줄·단 같은 옛 칸은 그대로 남는다(검색·정렬용)', out[0].bay === '20' && out[0].row === '02' && out[0].tier === '86');
    const none = [{ cn: 'ZZZU0000000' }]; ok('같은 배열 반환(히트 0)', P.withDeckPos(none, R109) === none);
    const again = P.withDeckPos(out, R109); ok('두 번 붙여도 같은 배열(이미 같은 좌표면 손대지 않는다)', again === out);
    ok('플랜이 없거나 비면 목록 그대로 — 비 RZOR 선박', P.withDeckPos(list, null) === list && P.withDeckPos(list, {}) === list && P.withDeckPos(list, undefined) === list && P.withDeckPos(null, R109) === null && P.withDeckPos([], R109).length === 0);
    const o106 = P.withDeckPos([{ cn: 'CICU8423495' }, { cn: 'UETU3271841' }, { cn: 'NHFU9000522' }], R106);
    ok('R106E CICU8423495 = D_8_10 · UETU3271841 = D_6_09 · NHFU9000522 = C_6_10', o106[0].deckPos === 'D_8_10' && o106[1].deckPos === 'D_6_09' && o106[2].deckPos === 'C_6_10', o106.map((c) => c.deckPos).join(' '));
    //  모든 덱플랜 컨이 항목 하나씩 — 좌표 맵과 목록 붙이기가 같은 값
    const m = P.deckCoordMap(R109); const all = P.withDeckPos([...m.keys()].map((cn) => ({ cn })), R109);
    ok(`R109E 덱플랜 컨 ${m.size}대 전부 좌표가 붙는다(맵과 같은 값)`, all.length === m.size && all.every((c) => c.deckPos === m.get(c.cn)));
  }

  console.log('■ ② 표기 우선순위 — fmtPos 는 덱플랜 좌표가 먼저, 없으면 종전 그대로');
  {
    ok('deckPos 가 있으면 그것(베이·줄·단·옛 도면 글자보다 먼저)', P.fmtPos({ deckPos: 'C_2_20', pos: 'C덱 2줄 20칸', bay: '20', row: '02', tier: '86' }) === 'C_2_20');
    ok('deckPos 가 없으면 옛 도면 글자 «C덱 2줄 20칸» 그대로', P.fmtPos({ pos: 'C덱 2줄 20칸', bay: '20', row: '02', tier: '86' }) === 'C덱 2줄 20칸');
    ok('deckPos 가 빈 글자면 지나친다(빈칸을 위치로 내보내지 않는다)', P.fmtPos({ deckPos: '', pos: 'C덱 2줄 20칸' }) === 'C덱 2줄 20칸');
    const old = P.fmtPos({ bay: '16', row: '02', tier: '82' });
    ok('베이 좌표만 있는 배는 종전 표기 그대로(비 RZOR 불변)', /16/.test(old) && /02/.test(old) && /82/.test(old) && !/_/.test(old), old);
    ok('아무것도 없으면 빈 글자', P.fmtPos({}) === '');
  }

  console.log('■ ③ 전 항차 펼치기 — 미르·홈 검색이 쓰는 flattenVoyages');
  const ediOf = (mode) => { const o = {}; PR.containers.forEach((c, i) => { o['k' + i] = { ...c, pod: 'KRPTK', pol: c.pol || 'CNRZH' }; }); return o; };
  const voyR109 = { info: PR.info, discharge: { ediContainers: ediOf(), stowagePlan: R109, xrayList: PR.xrayMap } };
  const flat = P.flattenVoyages({ RZOR_R109E: voyR109 });
  const fOf = (cn) => flat.find((c) => c.cn === cn);
  ok(`R109E 양하 실목록 ${PR.containers.length}대가 전부 펼쳐진다`, flat.length === PR.containers.length, String(flat.length));
  ok('CICU9647782 = C_2_20 · TGHU9927423 = C_2_16(보관소 실측값)', fOf(X1) && fOf(X1).deckPos === 'C_2_20' && fOf(X2) && fOf(X2).deckPos === 'C_2_16', `${fOf(X1) && fOf(X1).deckPos} ${fOf(X2) && fOf(X2).deckPos}`);
  const m109 = P.deckCoordMap(R109);
  ok('펼친 컨의 좌표 = 덱플랜 좌표 맵(두 벌이 아니다) — 덱플랜에 있는 컨은 전부, 없는 컨은 좌표 칸 자체가 없다', flat.every((c) => (m109.has(c.cn) ? c.deckPos === m109.get(c.cn) : !('deckPos' in c))));
  ok('옛 베이 좌표(20·02·86)는 그대로 들어 있다(검색·정렬용) — 표기만 바뀐다', fOf(X1).bay === '20' && fOf(X1).row === '02' && fOf(X1).tier === '86');
  {
    //  선적(loading)은 선적 덱플랜으로 — 같은 컨이 양하·선적 둘 다 있어도 모드마다 자기 플랜의 좌표
    const loadPlan = { decks: [{ deck: 'D', slots: [{ cn: X1, line: 3, col: 7, pos: 'D덱 3줄 7칸' }] }] };
    const two = { info: PR.info, discharge: { ediContainers: { a: { ...rowOf(X1), pod: 'KRPTK' } }, stowagePlan: R109 }, loading: { ediContainers: { a: { ...rowOf(X1), pod: 'KRPTK' } }, stowagePlan: loadPlan } };
    const f2 = P.flattenVoyages({ RZOR_R109E: two });
    const d = f2.find((c) => c._mode === 'discharge'), l = f2.find((c) => c._mode === 'loading');
    ok('양하는 양하 덱플랜(C_2_20) · 선적은 선적 덱플랜(D_3_07) — 섞이지 않는다', d && l && d.deckPos === 'C_2_20' && l.deckPos === 'D_3_07', `${d && d.deckPos} ${l && l.deckPos}`);
  }
  {
    const KB = JSON.parse(fs.readFileSync(fx('mirone_live_260910.json'), 'utf8'));
    const fk = P.flattenVoyages(KB);
    ok(`비 RZOR 실항차(KBTR 2606E·NSFR 2617N) ${fk.length}대 — 좌표 칸이 하나도 안 생긴다`, fk.length > 100 && fk.every((c) => !('deckPos' in c)));
  }

  console.log('■ ④ 미르 답 — 실데이터 R109E, 옛 답 20-02-86 이 C_2_20 이 된다');
  const ctxOf = (list) => ({ app: 'tally', smallTalkLast: true, modeChoice: 'both', voyageKey: 'RZOR_R109E', voyage: voyR109, info: PR.info, mode: 'discharge', containers: list, compMap: {}, portMisData: {}, isChief: true });
  const ask = (q, list) => { try { return String(P.answerOne(q, ctxOf(list))); } catch (e) { return '⚠ ' + (e && e.stack || e); } };
  {
    const a1 = ask('7782 어디 있어', flat);
    ok('«7782 어디 있어» → C_2_20 (옛 20-02-86 아님)', /C_2_20/.test(a1) && !/20-02-86/.test(a1), a1.slice(0, 120).replace(/\n/g, ' / '));
    const a2 = ask('XRAY 위치', flat);
    ok('«XRAY 위치» → 두 대 모두 C_2_20 · C_2_16, 옛 표기 없음', /C_2_20/.test(a2) && /C_2_16/.test(a2) && !/20-02-86|16-02-86/.test(a2), a2.slice(0, 160).replace(/\n/g, ' / '));
    const a3 = ask('7423 실번호', flat);
    ok('«7423 실번호» 큰 답에도 C_2_16', /TGHU9927423/.test(a3) && /C_2_16/.test(a3) && !/16-02-86/.test(a3), a3.slice(0, 120).replace(/\n/g, ' / '));
    //  좌표가 안 붙은 목록(옛 동작)이면 옛 표기 — 이 시험이 좌표 배선을 실제로 재고 있다는 증거
    const noPos = flat.map((c) => { const o = { ...c }; delete o.deckPos; return o; });
    const b1 = ask('7782 어디 있어', noPos);
    ok('(대조) 좌표를 떼면 옛 표기 20-02-86 으로 돌아간다 — 위 통과는 좌표 덕이다', /20-02-86/.test(b1) && !/C_2_20/.test(b1), b1.slice(0, 120).replace(/\n/g, ' / '));
  }

  console.log('■ ⑤ 콘앱 포장 — toMirContainers(rows, mode, plan)');
  {
    const rows = [{ cn: X1, bay: '20', row: '02', tier: '86', reefer: true, temp: '-3' }, { cn: 'ZZZU0000000' }];
    const w = P.toMirContainers(rows, 'discharge', R109);
    ok('덱플랜을 주면 좌표가 붙는다 · 콘앱 필드 변환(rf·tmp)은 그대로', w[0].deckPos === 'C_2_20' && w[0].rf === 1 && w[0].tmp === '-3' && w[0]._mode === 'discharge' && !('deckPos' in w[1]));
    const w2 = P.toMirContainers(rows, 'discharge');
    ok('덱플랜을 안 주면 종전과 같다(좌표 없음) — 덱플랜 없는 배의 콘앱', !('deckPos' in w2[0]) && w2[0].rf === 1);
    const w3 = P.toMirContainers(rows, 'loading', { decks: [] });
    ok('빈 플랜이면 좌표 없음', !('deckPos' in w3[0]));
    const w4 = P.toMirContainers(null, 'discharge', R109);
    ok('행이 없으면 빈 배열', Array.isArray(w4) && w4.length === 0);
  }

  console.log('■ ⑥ 통계 탭 화면 — «X-RAY 위치» 줄이 좌표');
  {
    const withPos = P.withDeckPos(PR.containers.map((c) => ({ ...c, pod: 'KRPTK' })), R109);
    const mountStats = async (list) => {
      if (W.__root) { W.__root.unmount(); await wait(10); }
      D.getElementById('root').innerHTML = '';
      W.__root = P.createRoot(D.getElementById('root'));
      W.__root.render(P.React.createElement(P.StatsTab, { containers: list, compMap: {}, xrayMap: PR.xrayMap, mode: 'discharge', voyage: voyR109 }));
      await wait(120);
      return D.body.textContent;
    };
    const t = await mountStats(withPos);
    ok('통계 탭에 «X-RAY 위치» 가 있고 C_2_20 · C_2_16 이 나온다', /X-RAY 위치/.test(t) && /C_2_20/.test(t) && /C_2_16/.test(t), t.slice(0, 200));
    ok('옛 표기 20-02-86 · 16-02-86 은 나오지 않는다', !/20-02-86|16-02-86/.test(t));
    const t0 = await mountStats(withPos.map((c) => { const o = { ...c }; delete o.deckPos; return o; }));
    ok('(대조) 좌표를 떼면 옛 표기가 나온다 — 위 통과는 좌표 덕이다', /20-02-86/.test(t0) || /16-02-86/.test(t0), t0.slice(0, 160));
  }

  console.log('■ ⑦ CSV — 위치 열(2번째)');
  {
    const withPos = P.withDeckPos(PR.containers.map((c) => ({ ...c, pod: 'KRPTK' })), R109);
    let csv = '';
    const OrigBlob = global.Blob; global.Blob = class { constructor(parts) { csv = parts.join(''); } };
    const origCreate = URL.createObjectURL; URL.createObjectURL = () => 'blob:smoke';
    try { P.exportSectionToCSV('RZOR_R109E', 'discharge', withPos, {}, PR.xrayMap, {}, PR.info); }
    finally { global.Blob = OrigBlob; URL.createObjectURL = origCreate; }
    const lines = csv.replace(/^﻿/, '').split('\n');
    const col = (ln) => ln.split(',')[1];   // 순번,위치,컨번호 — 위치에 쉼표가 없다
    const l1 = lines.find((l) => l.includes(X1)), l2 = lines.find((l) => l.includes(X2));
    ok('CSV 머리 «위치» 열', /^순번,위치,컨번호/.test(lines[0]));
    ok('CICU9647782 행 위치 = C_2_20 · TGHU9927423 행 = C_2_16', l1 && col(l1) === 'C_2_20' && l2 && col(l2) === 'C_2_16', `${l1 && col(l1)} ${l2 && col(l2)}`);
    ok(`CSV ${lines.length - 1}행 — 덱플랜에 있는 컨은 전부 좌표 열이 «X_줄_칸» 모양`, lines.slice(1).filter((l) => l).every((l) => { const cn = (l.split(',')[2] || ''); return !m109.has(cn) || /^[A-Z]_[1-9]\d?_\d\d$/.test(col(l)); }));
  }

  console.log('■ ⑧ 배선 — 항차 화면 · 검색 패널 · 홈 검색 · 콘앱(소스를 읽는다)');
  {
    const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
    const vp = rd('src/pages/VoyagePage.jsx'), sp = rd('src/components/SearchPanel.jsx'), cone = rd('public/cone.html'), mir = rd('src/mir.js'), gs = rd('src/pages/GlobalSearchPage.jsx');
    ok('항차 화면 목록: 양하는 올린 덱플랜 · 선적은 생성 덱플랜 중 «확정(sure) 자리만»(예측은 자리가 아니다)', /deckCoordMap\(_gen \? _rzorGen : sec\.stowagePlan\)/.test(vp) && /!_gen \|\| \(mark\[out\[i\]\.cn\] && mark\[out\[i\]\.cn\]\.sure\)/.test(vp));
    ok('항차 화면 덱 전용 컨(리스트에 없는 행)도 좌표', /_deckOnly: !_cf, _luggConfirmed: _cf, \.\.\.\(_dcm\.get\(cn\) \? \{ deckPos: _dcm\.get\(cn\) \} : \{\}\)/.test(vp));
    ok('검색 패널 목록: 모드마다 자기 덱플랜(discharge·loading)으로 좌표', /deckCoordMap\(voyage\?\.discharge\?\.stowagePlan\)/.test(sp) && /deckCoordMap\(voyage\?\.loading\?\.stowagePlan\)/.test(sp) && /_dpm\[c0\._mode\]/.test(sp));
    ok('검색 패널 두 칩(자리 고르기)은 좌표가 먼저', (sp.match(/c\.deckPos \|\| \(c\.bay \?/g) || []).length === 2);
    ok('홈 검색·떠 있는 미르가 같이 쓰는 flattenVoyages 가 좌표를 붙인다(한 곳)', /deckCoordMap\(sec\.stowagePlan\)/.test(mir) && /\.\.\.\(_dcm\.get\(c\.cn\) \? \{ deckPos: _dcm\.get\(c\.cn\) \} : \{\}\)/.test(mir));
    ok('미르 자리 말 세 곳(posOf · eyePosOf · _pos)이 deckPos 를 먼저 읽는다', /function posOf\(c\) \{\s*\n\s*if \(c && c\.deckPos\) return String\(c\.deckPos\)/.test(mir) && /const eyePosOf = \(c\) => c\?\.deckPos \?/.test(mir) && /const _pos = \(c\) => c\.deckPos \?/.test(mir));
    ok('큰 카드·리스트 행·홈 결과 줄은 베이 없이 좌표만 있어도 자리를 그린다', /\(c\.bay \|\| c\.deckPos\) && /.test(rd('src/components/BigResultCard.jsx')) && /\(c\.bay \|\| c\.deckPos\) && /.test(rd('src/components/ContainerList.jsx')) && /\(c\.bay \|\| c\.deckPos\) && /.test(gs));
    ok('콘앱: 버전 2.61-01~2.65 · LoLo 선박만 양하·선적 덱플랜을 받아 미르 컨에 붙인다(다른 배는 아무것도 안 받는다)', /window\.__CONEV='ConeOne 2\.(61-01|62|63|64|65)(-\d\d)?'/.test(cone) && /if\(isLoloShip\(\)\)\{ try\{ const _sp=await Promise\.all\(\[fbFetchStowagePlan\('discharge'\), fbFetchStowagePlan\('loading'\)\]\)/.test(cone) && /window\.ConeMir\.toMirContainers\(rows,mode, mode==='loading'\?_spL:_spD\)/.test(cone));
  }

  console.log('■ ⑨ 손대지 않은 것 — 자리를 고치는 화면은 종전 베이·줄·단 그대로');
  {
    const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
    const none = ['src/components/PositionEditModal.jsx', 'src/components/GuidedWorkPanel.jsx', 'src/components/ContainerDetailModal.jsx', 'src/components/BayGridEditor.jsx'].filter((f) => fs.existsSync(path.join(ROOT, f)));
    ok('편집 화면 네 곳에 deckPos 가 한 줄도 없다(저장값은 베이·줄·단 — 표기만 바뀐 것이다)', none.length > 0 && none.every((f) => !/deckPos/.test(rd(f))), none.join(','));
    ok('deckPos 는 화면에 그릴 때만 읽는다 — 저장·정본 쓰기 경로(firebase.js)에는 없다', !/deckPos/.test(rd('src/firebase.js')));
  }

  console.error = _ce;
  ok('콘솔 오류 없음(브라우저 이동 흉내·act 경고는 뺀다)', errs.filter((e) => !/not wrapped in act|Warning:|Not implemented/i.test(e)).length === 0, errs.slice(0, 2).join(' | '));
  console.log(`\n${bad ? '✘' : '✔'} RZOR 선내위치 좌표 통일(4.04-02) ${n - bad}/${n}`);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ }
  process.exit(bad ? 1 : 0);
})();
