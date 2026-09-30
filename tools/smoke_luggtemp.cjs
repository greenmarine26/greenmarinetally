// 3.70-01 연막검사 — 수화물 리퍼는 온도 대상이 아니고(판정 한 벌 utils.reeferTempExempt), 기록에 없던 칸을 처음 고쳐도 저장된다.
//   검수사 2026-09-30 «RZOR에서 수화물이 온도 없는 수화물 리퍼인데 온도 미입력 대상으로 알림을 띄웁니다. 그래서 리퍼드라이로 지정을 했더니
//   오류메시지를 띄웁니다. 수화물 컨테이너 전 항차에서도 온도 입력이 있었는지 확인하고 그떄도 미입력이면 온도 입력 대상에서 제외».
//   실데이터 tools/fixtures/lugg_rzor_r107e.json(RTDB voyages/RZOR_R107E/discharge 읽기 사본 + 보관소 같은 컨 이력).
//   실소스(utils·diagnostics·mir·firebase·ContainerDetailModal·BigResultCard)를 esbuild 로 묶고 Firebase SDK 만 메모리 스텁으로 갈아 jsdom 에서 누른다.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'luggtemp_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const stub = './tools/stub_fbdb_mem.js';
const OUT = path.join(TMP, 'lt.js');
execSync(`npx esbuild tools/smoke_luggtemp.jsx --bundle --loader:.jsx=jsx --loader:.json=json --loader:.png=dataurl --jsx=automatic --external:fs --external:path --external:url `
  + `--alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${OUT}"`, { cwd: ROOT, stdio: 'pipe' });
const OUTD = path.join(TMP, 'dg.cjs'), OUTM = path.join(TMP, 'mir.cjs');
execSync(`npx esbuild src/diagnostics.js --bundle --platform=node --format=cjs --log-level=error --outfile="${OUTD}"`, { cwd: ROOT, stdio: 'pipe' });
execSync(`npx esbuild src/mir.js --bundle --platform=node --format=cjs --log-level=error --outfile="${OUTM}"`, { cwd: ROOT, stdio: 'pipe' });

(async () => {
  const { JSDOM } = require(path.join(ROOT, 'node_modules', 'jsdom'));
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://x/' });
  const W = dom.window;
  for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'localStorage', 'CustomEvent', 'Event']) { try { global[k] = k === 'window' ? W : W[k]; } catch (e) { Object.defineProperty(global, k, { value: W[k], configurable: true }); } }
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  W.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  W.speechSynthesis = { speak() {}, cancel() {}, getVoices: () => [] };
  W.alert = (m) => { (global.__alerts = global.__alerts || []).push(String(m)); };
  global.alert = W.alert;
  W.confirm = () => true; global.confirm = W.confirm;
  const rej = [];
  process.on('unhandledRejection', (e) => { rej.push(String((e && e.message) || e)); });
  const errs = [];
  const _ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ')); };
  W.localStorage.setItem('gm_equip_no', '3');
  W.localStorage.setItem('master_active_inspector_v1', '검수원A');
  require(OUT);
  const F = W.__F, U = W.__U;
  const LUG = 'CICU9635360';
  const rec = F.rec[LUG];
  const voyage = { info: { forecast: F.forecast } };

  console.log('■ ① 실자료 — 수화물이던 항차에는 온도가 한 번도 없었다(검수사 «전 항차에서도 온도 입력이 있었는지»)');
  const luggLegs = F.history.filter((h) => h.voy >= 'RZOR_R097E');   // R097E 부터 수화물(보관소 LUG·luggageCns)
  ok(`CICU9635360 이 수화물이던 R097E~R106E ${luggLegs.length}번 — 설정·실측 온도 전부 빈칸`, luggLegs.length >= 17 && luggLegs.every((h) => !String(h.tmp || '').trim() && !String(h.rfSet || '').trim() && !String(h.rfAct || '').trim()), JSON.stringify(luggLegs.filter((h) => String(h.tmp || '').trim())));
  const cargoLegs = F.history.filter((h) => h.voy < 'RZOR_R097E' && h.fe === 'F');
  ok('같은 번호가 일반 화물 리퍼이던 때(R064E·R086E·R092E 풀)는 온도가 있었다 — 제외는 번호가 아니라 «그 항차 수화물» 로', cargoLegs.length >= 3 && cargoLegs.every((h) => String(h.tmp || '').trim() !== ''), JSON.stringify(cargoLegs));
  ok('R107E 기록 — EDI 에 없고 리스트에만, F/E 빈칸·온도 빈칸(그래서 «풀일 수도 있는 리퍼» 로 잡혔다)', !F.edi[LUG] && rec && rec.fe === '' && rec.rf === true && rec.tmp === '' && F.forecast.luggageCns.includes(LUG));

  console.log('■ ② 판정 한 벌 — reeferTempExempt · reeferTempOf');
  const bare = { ...rec, cn: LUG };
  ok('수화물 표시 없이는 온도 대상(기준 없음 A) — 고치기 전 알림 그대로', U.reeferTempOf(bare).target === true && U.reeferTempOf(bare).state === 'A');
  ok('reeferTempExempt — 수화물 lugg · 리퍼드라이 rfdry · 제작컨 mkcon · 일반 빈값', U.reeferTempExempt({ ...bare, lugg: true }) === 'lugg' && U.reeferTempExempt({ ...bare, rfdry: true }) === 'rfdry' && U.reeferTempExempt({ ...bare, mkcon: true }) === 'mkcon' && U.reeferTempExempt(bare) === '');
  const tagged = U.tagForecastMarks([bare], new Set(), new Set(F.forecast.luggageCns), null, new Set())[0];
  ok('화면 목록 길(tagForecastMarks — forecast.luggageCns)로 붙은 수화물은 온도 대상이 아니다', tagged.lugg === true && U.reeferTempOf(tagged).target === false);
  ok('풀 리퍼 사진 대상(isISO403)에서도 빠진다', U.isISO403({ ...bare, fe: 'F' }) === true && U.isISO403({ ...bare, fe: 'F', lugg: true }) === false);

  console.log('■ ③ 제 목록을 따로 만드는 입구(현황 요약·마감 점검·진단·마감텔리) — applySpecialMarks 가 수화물도 찍는다');
  const recList = Object.entries(F.rec).map(([cn, r]) => ({ ...(F.edi[cn] || {}), ...r, cn }));
  //  고치기 전 입구 — 특수제작컨(specialCns)만 찍던 것과 같다(수화물 번호가 없는 forecast 로 흉내).
  const vSpecOnly = { info: { forecast: { specialCns: F.forecast.specialCns } } };
  const before = U.reeferTempSummary(U.applySpecialMarks(vSpecOnly, recList));
  const marked = U.applySpecialMarks(voyage, recList);
  const after = U.reeferTempSummary(marked);
  ok(`수화물 표시 전 — 기준 온도 없음 ${before.nNoBase}대(CICU9635360)`, before.nNoBase === 1 && before.noBase[0].cn === LUG, JSON.stringify(before.noBase.map((r) => r.cn)));
  ok(`applySpecialMarks 뒤 — 기준 온도 없음 0대 · 온도 있는 풀 리퍼 ${after.total}대는 그대로 셈`, after.nNoBase === 0 && after.total === before.total - 1 && marked.find((c) => c.cn === LUG).lugg === true, `${before.total}→${after.total}`);
  const onlyLug = U.applySpecialMarks({ info: { forecast: { luggageCns: F.forecast.luggageCns } } }, recList);   // 제작컨 목록 없는 항차(대부분)
  ok('제작컨 목록이 없는 항차에서도 수화물은 찍힌다(감사 변이 L2b)', onlyLug !== recList && onlyLug.find((c) => c.cn === LUG).lugg === true && onlyLug.filter((c) => c.lugg).length === 1);
  ok('특수제작컨(specialCns)도 같은 입구에서 계속 찍힌다(3.37 그대로)', F.forecast.specialCns.every((cn) => (marked.find((c) => c.cn === cn) || { mkcon: true }).mkcon === true));

  console.log('■ ④ 진단 «풀 리퍼 N대 중 M대 온도 미입력» — 수화물은 세지 않는다');
  const D = require(OUTD);
  const ediWithLug = { ...F.edi, [LUG]: { ...bare, fe: 'F', pod: 'KRPTK' } };   // 만약 EDI 에 풀로 실려 와도
  //  앱(VoyagePage:1349~)과 같은 차례 — 두 목록을 applySpecialMarks(voyage, …) 에 지나게 해서 넘긴다.
  const alertOf = (v, lugCns) => {
    const ediObj = {}; U.applySpecialMarks(v, Object.values(ediWithLug)).forEach((c) => { ediObj[c.cn] = c; });
    const recObj = {}; U.applySpecialMarks(v, Object.entries(F.rec).map(([cn, r]) => ({ ...r, cn }))).forEach((r) => { recObj[r.cn] = r; });
    return (D.runDiagnostics({ ediContainers: ediObj, listRecords: recObj, xrayList: {}, mode: 'discharge', carrier: '', sealPolicy: null, lugCount: 0, lugCns, thruCns: [] }) || []).find((a) => a.code === 'reefer_no_temp') || null;
  };
  const aCtl = alertOf(vSpecOnly, []), aLug = alertOf(voyage, F.forecast.luggageCns), aTagOnly = alertOf(voyage, []);
  ok('대조 — 수화물로 모르면 경고(1대)', !!aCtl && aCtl.count === 1 && aCtl.details[0].cn === LUG, JSON.stringify(aCtl && aCtl.details));
  ok('수화물 번호(lugCns)를 알면 경고 없음', !aLug, JSON.stringify(aLug));
  ok('lugCns 없이도 입구(applySpecialMarks)가 찍은 수화물 표시로 경고 없음', !aTagOnly, JSON.stringify(aTagOnly));

  console.log('■ ⑤ 미르 «5360 온도» — 수화물이라 온도 대상이 아니라고 답한다(항차 화면·떠 있는 미르·홈 검색·콘앱 같은 답)');
  const M = require(OUTM);
  //  떠 있는 미르·홈 통합검색·홈에서 여는 컨 상세의 재료 — flattenVoyages(실자료 모양 그대로: info + discharge.records/ediContainers)
  const voyages = { RZOR_R107E: { info: { vsl: 'RZOR', voy: 'R107E', forecast: F.forecast }, discharge: { ediContainers: F.edi, records: F.rec } } };
  const flat = M.flattenVoyages(voyages);
  const fl = flat.find((c) => c.cn === LUG);
  ok('flattenVoyages 가 수화물 표시를 찍는다(applySpecialMarks 입구)', !!fl && fl.lugg === true && flat.filter((c) => c.lugg).length === 1, JSON.stringify(fl && { lugg: fl.lugg, fe: fl.fe }));
  const ansFlat = M.answerEntityFacts({ digits: '5360', entityAttr: 'temp' }, { containers: flat.filter((c) => c.voyageKey === 'RZOR_R107E') });
  ok('홈·떠 있는 미르 재료로도 «수화물 컨이라 온도 대상이 아니에요»', /수화물 컨이라 온도 대상이 아니에요/.test(ansFlat || ''), ansFlat);
  //  콘앱 모양 — 컨(toMirContainers)에는 lugg 가 없고 info 만 온다. 한 벌 입구(_normalize)가 찍어야 한다.
  const ansCone = M.answerOneRaw('5360 온도', { app: 'cone', containers: [{ ...bare, _mode: 'discharge', voyageKey: 'RZOR_R107E' }], info: { vsl: 'RZOR', forecast: F.forecast }, voyageKey: 'RZOR_R107E', mode: 'discharge' });
  ok('콘앱 모양 재료(표시 없음 + info)로도 수화물 답 — 두 앱 같은 답', /수화물 컨이라 온도 대상이 아니에요/.test(String(ansCone || '')), String(ansCone).slice(0, 160));
  const ans = M.answerEntityFacts({ digits: '5360', entityAttr: 'temp' }, { containers: [tagged] });
  ok('«수화물 컨이라 온도 대상이 아니에요»', /수화물 컨이라 온도 대상이 아니에요/.test(ans || ''), ans);
  const ansCtl = M.answerEntityFacts({ digits: '5360', entityAttr: 'temp' }, { containers: [bare] });
  ok('대조 — 표시 없으면 종전 «세팅 온도 기록 없음»', /세팅 온도 기록 없음/.test(ansCtl || ''), ansCtl);

  console.log('■ ⑥ 컨 상세 — 수화물은 «🧳 수화물 (온도 대상 아님)» · 지정 단추 감춤 / 일반 리퍼는 리퍼드라이 지정이 저장된다');
  const D0 = W.document;
  const txt = () => D0.body.textContent || '';
  W.__render('modal', tagged); await wait(80);
  ok('수화물 — «🧳 수화물 (온도 대상 아님)» · «자료에 설정온도 없음» 없음', /🧳 수화물 \(온도 대상 아님\)/.test(txt()) && !/자료에 설정온도 없음/.test(txt()), txt().slice(0, 200));
  ok('수화물 — «리퍼드라이 지정»·«제작컨 지정» 단추 없음(EDI 에 없는 수화물이 EDI 로 새로 생기지 않게)', ![...D0.querySelectorAll('button')].some((b) => /리퍼드라이 지정|제작컨 지정/.test(b.textContent)));
  //  대조 — 같은 기록을 수화물 표시 없이(일반 리퍼로) 열고 «리퍼드라이 지정» 을 실제로 누른다. 기록에 rfdry 칸이 없다 — 검수사가 본 오류의 조건 그대로.
  //  홈 통합검색·수석 보드 길 — 컨에 lugg 가 없고 voyageInfo 만 온다. 컨 상세가 스스로 찍어야 한다(감사 지적 2b).
  W.__render('modal', { ...bare }); await wait(80);
  ok('lugg 없는 컨 + voyageInfo(forecast) — 여기서도 «🧳 수화물» · 지정 단추 없음', /🧳 수화물 \(온도 대상 아님\)/.test(txt()) && ![...D0.querySelectorAll('button')].some((b) => /리퍼드라이 지정|제작컨 지정/.test(b.textContent)), txt().slice(0, 160));
  global.__memdb = { voyages: { V1: { discharge: { records: { [LUG]: { ...rec } } } } } };
  ok('대조 기록에 rfdry 칸이 없다(오류 조건)', !('rfdry' in global.__memdb.voyages.V1.discharge.records[LUG]));
  W.__render('modal', { ...bare }, {}); await wait(80);   // 수화물 번호 없는 항차 = 일반 리퍼
  ok('일반 리퍼 — «자료에 설정온도 없음» + «리퍼드라이 지정» 단추', /자료에 설정온도 없음/.test(txt()) && [...D0.querySelectorAll('button')].some((b) => /리퍼드라이 지정/.test(b.textContent)));
  const btn = [...D0.querySelectorAll('button')].find((b) => /리퍼드라이 지정/.test(b.textContent));
  if (btn) btn.dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
  await wait(150);
  const R = global.__memdb.voyages.V1.discharge.records[LUG];
  ok('EDI 가 없는 리스트 단독 컨에 리퍼드라이를 지정해도 ediContainers 를 새로 만들지 않는다(양하 EDI 대수 그대로)', !(global.__memdb.voyages.V1.discharge.ediContainers && global.__memdb.voyages.V1.discharge.ediContainers[LUG]), JSON.stringify(global.__memdb.voyages.V1.discharge.ediContainers || null));
  ok('누르면 저장된다 — records.rfdry true · 이력 from null(없던 값) · 처리되지 않은 오류 0', R.rfdry === true && Array.isArray(R.edits && R.edits.rfdry) && R.edits.rfdry[0].from === null && R.edits.rfdry[0].to === true && rej.length === 0, JSON.stringify({ rfdry: R.rfdry, edits: R.edits, rej }));

  console.log('■ ⑦ 큰 결과 카드 — 수화물은 «온도 미입력 ⚠️» 대신 «🧳 수화물 (온도 대상 아님)»');
  W.__render('card', tagged); await wait(60);
  ok('수화물 카드 — 수화물 배지 · 온도 미입력 배지 없음', /🧳 수화물 \(온도 대상 아님\)/.test(txt()) && !/온도 미입력 ⚠️/.test(txt()), txt().slice(0, 160));
  W.__render('card', { ...bare }); await wait(60);
  ok('대조 — 일반 리퍼 카드는 «리퍼 · 온도 미입력 ⚠️»', /온도 미입력 ⚠️/.test(txt()) && !/🧳 수화물 \(온도 대상 아님\)/.test(txt()));
  if (W.__root) W.__root.unmount();

  console.log('■ ⑧ 마감텔리 종이는 그대로 — 페리 Lug 줄은 forecast.mode 일치 때만(1.4·OBWH 2692W 실물)');
  const TR = W.__TR;
  const vLoad = { info: { vsl: 'RZOR', forecast: F.forecast }, loading: { ediContainers: { [LUG]: { cn: LUG, iso: '22G1', fe: 'E', pol: 'KRPTK', pod: 'CNRZH' } }, records: {} } };
  const ptkL = TR.ptkContainers(vLoad, 'loading');
  ok('마감텔리 목록(ptkContainers)은 수화물을 찍지 않는다 — 선적(forecast.mode 양하) 종이의 Lug 칸이 바뀌지 않게', ptkL.length === 1 && !ptkL[0].lugg, JSON.stringify(ptkL.map((c) => ({ cn: c.cn, lugg: c.lugg }))));
  console.log('■ ⑨ 배선 — 화면·배너·메모·셀 표시가 같은 한 벌을 부른다');
  const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
  const vp = src('src/pages/VoyagePage.jsx');
  ok('VoyagePage — 리퍼 메모 버튼 수·출항 임박 배너가 reeferTempExempt', /if \(!rf \|\| reeferTempExempt\(c\)\) return false;/.test(vp) && /isReeferContainer\(c\) && !reeferTempExempt\(c\) &&/.test(vp));
  ok('ReeferMemoModal·BayPlan 셀·검색 답도 reeferTempExempt', /if \(reeferTempExempt\(c\)\) return false;/.test(src('src/components/ReeferMemoModal.jsx')) && /isFullReefer && !reeferTempExempt\(c\)/.test(src('src/components/BayPlan.jsx')) && /reeferTempExempt\(c\)/.test(src('src/nlSearch.js')));
  ok('현황 요약·마감 점검은 applySpecialMarks 를 지난다(수화물이 찍히는 입구)', /applySpecialMarks\(voyage, containersRaw\)/.test(src('src/components/VoyageSummaryCard.jsx')) && /applySpecialMarks\(voyage, containersRaw\)/.test(src('src/components/WorkClosingChecklist.jsx')));
  console.error = _ce;
  ok('콘솔 오류 없음', errs.filter((e) => !/not wrapped in act|Warning:/i.test(e)).length === 0, errs.slice(0, 2).join(' | '));
  console.log(`수화물 리퍼 온도 제외 연막검사: ${n - bad}/${n} 통과`);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ }
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('✘ 연막검사 예외', e); process.exit(1); });
