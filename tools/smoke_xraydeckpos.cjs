// 4.04-01 연막검사 — RZOR X-RAY 탭 선내위치가 덱플랜 좌표(덱_줄_칸, 예 C_8_21 · D_5_04)로 나온다: 화면 표 · 인쇄 문서 · 엑셀 상세 장이 같은 값.
//   검수사 2026-10-05 «XRAY실번호를 넣으면 위치표기가 안됩니다. 위치를 C_8_21 D_5_04 이런식으로 실제 위치를 넣어 주세요» · «덱플랜에 좌표가 보입니다. 그대로 넣어 주시면 될듯합니다»
//   기대값은 앱 함수가 아니라 **보관소(RTDB)에 수집기가 파이썬으로 따로 읽어 올린 좌표**(2026-10-05 읽기 전용 GET)에서 가져왔다 —
//     R109E: CICU9647782 → C덱 2줄 20칸 · TGHU9927423 → C덱 2줄 16칸 / R106E: CICU8423495 → D덱 8줄 10칸 · UETU3271841 → D덱 6줄 9칸 · NHFU9000522 → C덱 6줄 10칸.
//   실파일 tools/fixtures/rzor_rzdf_R109E.xls · rzor_rzdf_R106E.xlsx(선사 원본)를 앱 파서로 읽고, 앱의 XrayTab 을 jsdom 에서 그려 실제로 출력 단추를 누른다.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'xraypos_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = path.join(TMP, 'xp.js');
const stub = './tools/stub_fbdb_mem.js';
execSync(`npx esbuild tools/smoke_xraydeckpos.jsx --bundle --loader:.jsx=jsx --loader:.json=json --loader:.png=dataurl --jsx=automatic --external:fs --external:path --external:url `
  + `--alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${OUT}"`, { cwd: ROOT, stdio: 'pipe' });

(async () => {
  const { JSDOM } = require(path.join(ROOT, 'node_modules', 'jsdom'));
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://x/' });
  const W = dom.window;
  for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'localStorage', 'CustomEvent', 'Event']) global[k] = k === 'window' ? W : W[k];
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  W.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  W.alert = (m) => { (global.__alerts = global.__alerts || []).push(String(m)); };
  global.alert = W.alert;
  const errs = [];
  const _ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ')); };
  require(OUT);
  const P = W.__P;
  const XLSX = require(path.join(ROOT, 'node_modules', 'xlsx'));
  const fx = (f) => path.join(ROOT, 'tools', 'fixtures', f);
  const readPlan = (f) => P.parseDeckPlanWorkbook(XLSX.read(fs.readFileSync(fx(f)), { type: 'buffer', cellStyles: true }), XLSX);
  const D = W.document;

  console.log('■ ① 좌표 글자 만들기 — 줄은 그대로, 칸은 두 자리');
  ok('C덱 8줄 21칸 → C_8_21', P.deckCoordCode('C', 8, 21) === 'C_8_21');
  ok('D덱 5줄 4칸 → D_5_04 (칸 두 자리)', P.deckCoordCode('D', 5, 4) === 'D_5_04');
  ok('덱 글자는 대문자로', P.deckCoordCode('c', 8, 21) === 'C_8_21');
  ok('값이 모자라면 빈 글자(지어내지 않는다)', P.deckCoordCode('', 8, 21) === '' && P.deckCoordCode('C', 0, 21) === '' && P.deckCoordCode('C', 8, null) === '' && P.deckCoordCode('C', 8.5, 21) === '');
  const old = { decks: [{ deck: 'D', slots: [{ cn: 'AAAU1234567', pos: 'D덱 5줄 4칸' }, { cn: '', pos: 'D덱 1줄 1칸' }, { cn: 'BBBU1234567', empty: true, line: 1, col: 1 }] }] };
  ok('옛 저장 플랜(line·col 없이 글자 pos 만)도 읽는다 · 빈 칸·번호 없는 칸은 건너뜀', P.deckCoordMap(old).get('AAAU1234567') === 'D_5_04' && P.deckCoordMap(old).size === 1);
  const objShape = { decks: { 0: { deck: 'C', slots: { 0: { cn: 'CCCU1234567', line: 8, col: 21 } } } } };
  ok('보관소가 {키:값} 으로 돌려준 모양도 읽는다', P.deckCoordMap(objShape).get('CCCU1234567') === 'C_8_21');
  ok('플랜이 없으면 빈 맵(비 RZOR 선박)', P.deckCoordMap(null).size === 0 && P.deckCoordMap(undefined).size === 0 && P.deckCoordMap({}).size === 0);
  const dup = { decks: [{ deck: 'D', slots: [{ cn: 'DUPU1234567', line: 5, col: 4 }] }, { deck: 'C', slots: [{ cn: 'DUPU1234567', line: 8, col: 21 }] }] };
  ok('같은 컨이 두 칸에 있으면 앞 칸(덱 배열 순서)을 쓴다 — 선사 파일 결함일 때도 값이 흔들리지 않는다', P.deckCoordMap(dup).get('DUPU1234567') === 'D_5_04' && P.deckCoordMap(dup).size === 1);

  console.log('■ ② 실물 선사 파일 — 컨마다 좌표, 기대값은 보관소 실측');
  const R109 = readPlan('rzor_rzdf_R109E.xls');
  const R106 = readPlan('rzor_rzdf_R106E.xlsx');
  const m109 = P.deckCoordMap(R109), m106 = P.deckCoordMap(R106);
  ok('R109E CICU9647782 = C_2_20 · TGHU9927423 = C_2_16', m109.get('CICU9647782') === 'C_2_20' && m109.get('TGHU9927423') === 'C_2_16', `${m109.get('CICU9647782')} ${m109.get('TGHU9927423')}`);
  ok('R106E CICU8423495 = D_8_10 · UETU3271841 = D_6_09 · NHFU9000522 = C_6_10', m106.get('CICU8423495') === 'D_8_10' && m106.get('UETU3271841') === 'D_6_09' && m106.get('NHFU9000522') === 'C_6_10', `${m106.get('CICU8423495')} ${m106.get('UETU3271841')} ${m106.get('NHFU9000522')}`);
  for (const [nm, plan, map] of [['R109E', R109, m109], ['R106E', R106, m106]]) {
    const cns = new Set(); let all = true, same = true;
    for (const dk of plan.decks) for (const s of dk.slots) {
      if (s.empty || !s.cn) continue;
      cns.add(s.cn);
      const c = map.get(s.cn);
      if (!/^[A-Z]_[1-9]\d?_\d\d$/.test(c || '')) all = false;
      const pm = String(s.pos).match(/^([A-Z])덱\s*(\d+)줄\s*(\d+)칸$/);
      if (!pm || c !== P.deckCoordCode(pm[1], pm[2], pm[3])) same = false;   // 그림에 보이는 «D덱 3줄 5칸» 표기와 같은 자리
    }
    ok(`${nm} 컨 ${cns.size}대 전부 좌표가 나오고 컨마다 하나(맵 ${map.size})`, all && map.size === cns.size);
    ok(`${nm} 좌표 = 덱플랜 칸 표기(D덱 N줄 M칸)와 같은 자리`, same);
  }

  console.log('■ ③ X-RAY 탭 화면 — 실번호 칸이 있는 표에서 위치가 나온다');
  const mount = async (props) => {
    if (W.__root) { W.__root.unmount(); await wait(10); }
    D.getElementById('root').innerHTML = '';
    W.__root = P.createRoot(D.getElementById('root'));
    W.__root.render(P.React.createElement(P.XrayTab, props));
    await wait(80);
  };
  const rowOf = (cn) => [...D.querySelectorAll('tbody tr')].filter((tr) => !tr.closest('.xr-print')).find((tr) => tr.textContent.includes(cn));
  const posCell = (cn) => { const tr = rowOf(cn); return tr ? (tr.querySelectorAll('td')[5] || {}).textContent : null; };
  const K = (seal, kind) => ({ at: 1, seal, kind, iso: '22GP', dest: '평택' });
  const xrayMap = { CICU9647782: K('A1', 'X-RAY'), TGHU9927423: K('A2', 'X-RAY'), ZZZU0000000: K('A3', 'X-RAY') };
  const base = { voyage: { info: { vsl: 'RIZHAO ORIENT', voy_d: 'R109E', callsign: 'BTXX', pier: 'PNCT' }, discharge: { stowagePlan: R109 } },
                 voyageKey: 'RZOR_R109E', mode: 'discharge', containers: [], inspector: '검수원A', xrayMap,
                 xraySeals: { CICU9647782: { seal: 'KC0012345', sealer: '김성일' } }, compMap: {}, portMisData: {} };
  await mount(base);
  ok('EDI 위치가 없어도(containers 0) 덱플랜에서 C_2_20', posCell('CICU9647782') === 'C_2_20', String(posCell('CICU9647782')));
  ok('봉인 실번호를 넣은 컨도, 안 넣은 컨도 위치가 나온다(C_2_16)', posCell('TGHU9927423') === 'C_2_16', String(posCell('TGHU9927423')));
  ok('덱플랜에 없는 컨은 지어내지 않고 «위치 미상»', /위치 미상/.test(posCell('ZZZU0000000') || ''), String(posCell('ZZZU0000000')));
  ok('옛 «위치 미상» 은 덱플랜에 있는 컨에는 안 뜬다', !/위치 미상/.test(posCell('CICU9647782') || '') && !/위치 미상/.test(posCell('TGHU9927423') || ''));
  // 실앱은 항차 자료가 늦게 도착한다 — 같은 화면을 닫지 않고 플랜만 뒤늦게 들어와도 좌표가 따라와야 한다(useMemo 의존)
  await mount({ ...base, voyage: { info: base.voyage.info, discharge: {} } });
  ok('플랜 도착 전에는 «위치 미상»', /위치 미상/.test(posCell('CICU9647782') || ''), String(posCell('CICU9647782')));
  W.__root.render(P.React.createElement(P.XrayTab, base));
  await wait(80);
  ok('플랜이 뒤늦게 들어오면 같은 화면에서 C_2_20 · C_2_16 으로 바뀐다', posCell('CICU9647782') === 'C_2_20' && posCell('TGHU9927423') === 'C_2_16', `${posCell('CICU9647782')} ${posCell('TGHU9927423')}`);

  console.log('■ ④ 인쇄 문서 · 엑셀 — 출력 단추를 실제로 누른다');
  let html = '', fakeAlerts = [];
  const fakeW = { document: { write: (h) => { html = h; }, close() {} }, alert: (m) => fakeAlerts.push(String(m)) };
  W.open = () => fakeW;
  const printBtn = [...D.querySelectorAll('button')].find((b) => /출력/.test(b.textContent || ''));
  ok('출력 단추가 있다', !!printBtn);
  if (printBtn) printBtn.dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
  await wait(40);
  ok('인쇄 문서에 C_2_20 · C_2_16 이 선내위치 칸으로 들어간다', /<td>C_2_20<\/td>/.test(html) && /<td>C_2_16<\/td>/.test(html));
  const zRow = (html.match(/<tr>(?:(?!<tr>)[\s\S])*?ZZZU0000000[\s\S]*?<\/tr>/) || [''])[0];
  const zCells = [...zRow.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
  ok('덱플랜에 없는 컨의 위치 칸은 빈칸(지어내지 않음)', zCells[1] === 'ZZZU0000000' && zCells[5] === '', zRow.replace(/\s+/g, ' ').slice(0, 260));
  let xlsxRows = null;
  try {
    let blob = null; const orig = URL.createObjectURL;
    URL.createObjectURL = (b) => { blob = b; return 'blob:smoke'; };
    try { await fakeW.__exportXrayXlsx(); } finally { URL.createObjectURL = orig; }
    ok('엑셀이 만들어졌다(알림 없음)', !!blob && fakeAlerts.length === 0, fakeAlerts.join(' | '));
    if (blob) {
      const ExcelJS = require(path.join(ROOT, 'node_modules', 'exceljs'));
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(Buffer.from(await blob.arrayBuffer()));
      const ws2 = wb.getWorksheet('상세');
      xlsxRows = []; ws2.eachRow((row) => xlsxRows.push([1, 2, 3, 4, 5, 6, 7, 8].map((c) => String(row.getCell(c).value == null ? '' : row.getCell(c).value))));
    }
  } catch (e) { ok('엑셀 만들기 예외 없음', false, String(e && e.message || e)); }
  if (xlsxRows) {
    const rowX = (cn) => xlsxRows.find((r) => r[1] === cn);
    ok('엑셀 «상세» 장 선내위치 = C_2_20 · C_2_16', rowX('CICU9647782') && rowX('CICU9647782')[5] === 'C_2_20' && rowX('TGHU9927423') && rowX('TGHU9927423')[5] === 'C_2_16', JSON.stringify(rowX('CICU9647782')));
  }

  console.log('■ ⑤ 다른 배는 그대로 — 베이 좌표가 있는 배(덱플랜 없음)');
  await mount({ ...base, voyage: { info: { vsl: 'SMOKE', voy_d: '2601E', callsign: 'SMK9' }, discharge: {} }, voyageKey: 'S_2601E',
                containers: [{ cn: 'CICU9647782', bay: '2', row: '01', tier: '84', iso: '22G1' }] });
  ok('덱플랜 없는 배는 종전 베이-열-단 02-01-84', posCell('CICU9647782') === '02-01-84', String(posCell('CICU9647782')));
  await mount({ ...base, containers: [{ cn: 'CICU9647782', bay: '2', row: '01', tier: '84', iso: '22G1' }] });
  ok('둘 다 있으면 덱플랜 좌표가 먼저(RZOR 은 베이 좌표를 못 믿는다)', posCell('CICU9647782') === 'C_2_20', String(posCell('CICU9647782')));
  await mount({ ...base, voyage: { info: { vsl: 'SMOKE' } } });
  ok('플랜도 베이도 없으면 «위치 미상»', /위치 미상/.test(posCell('CICU9647782') || ''), String(posCell('CICU9647782')));

  console.error = _ce;
  ok('콘솔 오류 없음(브라우저 이동 흉내·act 경고는 뺀다)', errs.filter((e) => !/not wrapped in act|Warning:|Not implemented/i.test(e)).length === 0, errs.slice(0, 2).join(' | '));
  console.log(`\n${bad ? '✘' : '✔'} RZOR X-RAY 선내위치(4.04-01) ${n - bad}/${n}`);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ }
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('✘ 연막검사 예외', e); process.exit(1); });
