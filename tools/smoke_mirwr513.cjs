// 5.13 연막검사 — 미르에게 말로 전한 작업보고(양하·선적 시작/완료/중단/재개 · 해치커버 · 콘박스 · 취소)를 작업 보고 창과 같은 모양으로 적는다.
//   검수사 2026-11-18 «관리자가 전달하는 내용은 미르가 앱에 정확히 적용시켜야 할것입니다» · 이름 «그 호기 검수원 이름» · «바로 적고 되읽기만» · «호기별 이름이 등록되지 않은 상태에서는 검수원 1 2 3 4로 기록 바랍니다»
//   실데이터 — KSKM 2621N(지금 작업 중, 조 등록 없음 → 검수원N) · 조 등록이 있는 경우는 같은 항차 사본에 한 줄 넣어 본다(그 사실을 줄에 적는다).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'mirwr513_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = global.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, location: { href: '' } };
global.localStorage = global.localStorage || { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {} };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 있음 */ }
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const _cw = console.warn; console.warn = (...a) => { if (/베이사전/.test(String(a[0]))) return; _cw(...a); };

(async () => {
  try {
    const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
    fs.writeFileSync(e, [
      `export { parseMirWorkReport, sameRtdbVal } from "${ROOT}/src/workReportParse.js";`,
      `export { planMirWorkReport, crewNameForEquip } from "${ROOT}/src/workReportPlan.js";`,
      `export { parseNaturalQuery } from "${ROOT}/src/nlSearch.js";`,
      `export { canEditReport, crewShiftKey, degText } from "${ROOT}/src/utils.js";`,
      `export { answerOneRaw, isWeakAnswer } from "${ROOT}/src/mir.js";`,
    ].join('\n'));
    execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
    const B = require(o);
    const FX = JSON.parse(rd('tools/fixtures/unload511_voyages.json'));
    window.__fbShipBayDict = FX.dicts;
    const V = FX.voyages.KSKM_2621N;
    const NOW = Date.parse('2026-11-18T15:00:00+09:00');
    const P = B.parseMirWorkReport;
    // ① 말 읽기
    const p1 = P('미르야 2호기 양하 완료');
    ok('① «2호기 양하 완료» → status·2호기·discharge·done', p1 && p1.kind === 'status' && p1.equip === '2호기' && p1.mode === 'discharge' && p1.verb === 'done');
    const p2 = P('2호기 장비 고장으로 양하 중단');
    ok('① 중단 사유 «장비 고장»', p2 && p2.verb === 'pause' && p2.reason === '장비 고장', JSON.stringify(p2));
    ok('① «2호기 양하 재개» → resume · «3호기 선적 시작 했어» → loading start', P('2호기 양하 재개').verb === 'resume' && P('3호기 선적 시작 했어').mode === 'loading');
    const p3 = P('2호기 10 12번 베이 커버 닫았어 2장');
    ok('① 해치 — 베이 10·12 · 닫힘 · 말한 장수 2 · 호기 숫자는 베이로 안 셈', p3 && p3.kind === 'hatch' && p3.action === 'close' && p3.bays.join() === '10,12' && p3.panelCount === 2 && p3.equip === '2호기', JSON.stringify(p3));
    const p4 = P('1호기 콘박스 20자 3개');
    ok('① 콘박스 20자 3개', p4 && p4.kind === 'conbox' && p4.type === '20' && p4.count === 3);
    ok('① «보고 취소»·«방금 거 취소» → cancel · «취소» 한 마디(칩)·«취소 안 해»·«철수 취소» 는 아님', P('보고 취소').kind === 'cancel' && P('방금 거 취소').kind === 'cancel' && !P('취소') && !P('취소 안 해') && !P('취소할까') && !P('철수 취소'));
    const NEG = ['2호기 양하 완료 안됐어', '2호기 양하 다 끝났나', '1호기 양하 끝나가', '2호기 양하 시작 전이야', '1호기 선적 시작할까', '1호기 양하 시작하면 돼', '2호기 양하 시작 몇시에 했어', '1호기 양하 재개 해도 돼', '2호기 작업 중단 사유 뭐야', '해치 몇 장 열렸어', '해치 몇 장 열어야 해', '해치커버 어떻게 열어', '14번 해치 열렸나', '14번 해치 닫혔나', '14번 해치 열었나요', '14번 해치 열었냐', '16번 해치 닫을까', '14번 해치 열어야 돼', '콘박스 몇 개야'];
    const wrongly = NEG.filter((x) => P(x) || B.parseNaturalQuery('미르야 ' + x).workRep);
    ok(`① 물음·부정·진행형·제안 ${NEG.length}문장은 작업보고로 읽지 않는다(감사 상1·상2)`, !wrongly.length, wrongly.join(' / '));
    ok('① «10시에 14번 해치 열었어» — 시각 10 은 베이가 아니다', P('10시에 14번 해치 열었어').bays.join() === '14');
    ok('① 물음·시작 시각·작업 없는 말은 작업보고가 아니다', !P('2호기 양하 완료했어?') && !P('2호기 몇 개 남았어') && !P('1호기 09시 30분 시작') && !P('1호기 끝') && !P('양하 완료') && !P('1호기 누구야'));
    ok('① «완료함»·«끝났어»·«시작 했어» 처럼 일어난 일은 받는다', P('2호기 양하 완료함') && P('1호기 작업 끝났어') && P('3호기 선적 시작 했어'));
    const nq = B.parseNaturalQuery('미르야 2호기 양하 중단 강풍');
    ok('① 호기·작업이 붙은 중단은 작업 보고 중단(외부 중단 pauseSet 아님)', nq.workRep && nq.workRep.verb === 'pause' && !nq.pauseSet);
    const nq2 = B.parseNaturalQuery('미르야 강풍대기 상태야');
    ok('① 호기 없는 «강풍대기» 는 종전대로 외부 중단', nq2.pauseSet && !nq2.workRep);
    ok('① «1호기 철수» 는 종전대로 호기 이동', B.parseNaturalQuery('미르야 1호기 철수').moveSet && !B.parseNaturalQuery('미르야 1호기 철수').workRep);
    // ② 이름 — 조 등록 → 로그인 작업자 → 검수원N
    const ctx = { voyageKey: 'KSKM_2621N', voyage: V, activeWork: {}, inspectors: {}, relayBy: '김성일', nowMs: NOW };
    let pl = B.planMirWorkReport(P('2호기 양하 시작'), ctx);
    ok('② 실데이터 KSKM(조 등록 없음) → «검수원2» · 전한 사람 relayBy 김성일 · via mir', pl.by === '검수원2' && pl.writes.some((w) => w.report && w.report.by === '검수원2' && w.report.relayBy === '김성일' && w.report.via === 'mir'), JSON.stringify(pl.by));
    ok('② 관리자 이름은 보고 이름(by)에 안 들어간다', !pl.writes.some((w) => w.report && w.report.by === '김성일'));
    const sk = B.crewShiftKey(undefined, NOW, 0).key;
    const V2 = { ...V, info: { ...V.info, craneCrew: { [sk]: { '2호기': { name: '홍길동', at: NOW } } } } };
    pl = B.planMirWorkReport(P('2호기 양하 시작'), { ...ctx, voyage: V2 });
    ok(`② (사본에 조 등록 «${sk} 2호기 홍길동» 한 줄) → 홍길동 이름으로`, pl.by === '홍길동' && /홍길동 이름으로/.test(pl.readback));
    pl = B.planMirWorkReport(P('2호기 양하 시작'), { ...ctx, inspectors: { 홍길동: { name: '홍길동', loggedIn: true, workMode: 'work', assignVoyage: 'KSKM_2621N', assignEquip: '2호기', assignAt: NOW - 600e3, lastActive: NOW - 60e3, loginAt: NOW - 700e3 }, 클로드: { name: '클로드', loggedIn: true, workMode: 'work', assignVoyage: 'KSKM_2621N', assignEquip: '1호기', assignAt: NOW - 600e3, lastActive: NOW - 60e3 } } });
    ok('② 조 등록이 없으면 그 호기를 쥔 작업자(equipHold 한 벌)', pl.by === '홍길동' && pl.who.src === '그 호기 작업자', JSON.stringify(pl.who));
    pl = B.planMirWorkReport(P('1호기 양하 시작'), { ...ctx, inspectors: { 클로드: { name: '클로드', loggedIn: true, workMode: 'work', assignVoyage: 'KSKM_2621N', assignEquip: '1호기', assignAt: NOW - 600e3, lastActive: NOW - 60e3 } } });
    ok('② 클로드(시험) 계정은 호기 작업자로 안 쓴다 → 검수원1', pl.by === '검수원1');
    // ③ 작업 보고 창과 같은 모양
    pl = B.planMirWorkReport(P('2호기 양하 시작'), ctx);
    const aw1 = pl.writes.find((w) => w.aw), r1 = pl.writes.find((w) => w.report);
    ok('③ 시작 — activeWork 2호기/discharge running · 보고 work_status discharge_start · 카톡 글 «🟢 양하 시작»', aw1 && aw1.aw.val.status === 'running' && aw1.aw.equip === '2호기' && aw1.aw.mode === 'discharge' && r1.report.action === 'discharge_start' && /🟢 양하 시작/.test(r1.report.message));
    const AW = { '2호기': { discharge: { mode: 'discharge', status: 'running', startedAt: NOW - 3600e3, vsl: 'KSKM', voy: '2621N' } } };
    pl = B.planMirWorkReport(P('2호기 선적 시작'), { ...ctx, activeWork: AW });
    const rs = pl.writes.filter((w) => w.report).map((w) => w.report.action + (w.report.reason ? '·' + w.report.reason : ''));
    ok('③ 같은 호기 양하 진행 중 «선적 시작» → 양하 중단(사유 «선적 시작») 뒤 선적 시작(보고 창 [중단하고 시작]과 같음)', rs.join() === 'discharge_pause·선적 시작,loading_start', rs.join());
    pl = B.planMirWorkReport(P('2호기 양하 완료'), { ...ctx, activeWork: AW });
    ok('③ 완료 — 진행 중 줄을 지우고(null) discharge_done', pl.writes.some((w) => w.aw && w.aw.val === null) && pl.writes.some((w) => w.report && w.report.action === 'discharge_done' && !w.report.manual));
    pl = B.planMirWorkReport(P('1호기 양하 완료'), ctx);
    ok('③ 시작 기록 없는 완료는 manual 표식(보고 창 M5.79와 같음)', pl.writes.some((w) => w.report && w.report.manual === true));
    pl = B.planMirWorkReport(P('2호기 양하 중단'), ctx);
    ok('③ 사유 없는 중단은 되묻고 아무것도 안 쓴다', !!pl.ask && !pl.writes);
    pl = B.planMirWorkReport(P('2호기 양하 중단 강풍'), { ...ctx, activeWork: AW });
    ok('③ 중단 — paused·pauseReason 강풍·startedAt 유지', pl.writes.some((w) => w.aw && w.aw.val.status === 'paused' && w.aw.val.pauseReason === '강풍' && w.aw.val.startedAt === NOW - 3600e3));
    pl = B.planMirWorkReport(P('2호기 양하 재개'), { ...ctx, activeWork: { '2호기': { discharge: { ...AW['2호기'].discharge, status: 'paused', pauseReason: '강풍' } } } });
    ok('③ 재개 — running·pauseReason null · 보고 discharge_resume · 글에 «(재개)»', pl.writes.some((w) => w.aw && w.aw.val.status === 'running' && w.aw.val.pauseReason === null) && pl.writes.some((w) => w.report && w.report.action === 'discharge_resume' && /\(재개\)/.test(w.report.message)));
    pl = B.planMirWorkReport(P('2호기 양하 시작'), { ...ctx, activeWork: AW });
    ok('③ 이미 진행 중인 작업의 «시작» 은 적지 않는다(감사 중4)', !!pl.ask && !pl.writes);
    pl = B.planMirWorkReport(P('2호기 양하 중단 강풍'), { ...ctx, activeWork: { '2호기': { discharge: { ...AW['2호기'].discharge, status: 'paused', pauseReason: '강풍' } } } });
    ok('③ 이미 중단된 작업의 «중단» 은 적지 않는다', !!pl.ask && !pl.writes);
    // ④ 해치·콘박스
    pl = B.planMirWorkReport(P('2호기 97번 베이 해치 열었어 2장'), ctx);
    ok('④ 그 배 자료에 없는 베이(97)는 되묻는다(감사 상2)', !!pl.ask && /97번 베이/.test(pl.ask));
    pl = B.planMirWorkReport(P('2호기 14번 베이 해치 열었어'), ctx);
    const h = pl.writes.find((w) => w.report);
    ok('④ 해치 — hatch/open · 베이 14(앞 0 없이 — 창과 같은 모양) · 장수 > 0(앱이 센 장수) · 해치 표시(hatchDone) 같이', h && h.report.type === 'hatch' && h.report.action === 'open' && h.report.bays.join() === '14' && h.report.panelCount > 0 && pl.writes.some((w) => w.hatchDone && Object.values(w.hatchDone).includes('open')), JSON.stringify(h && h.report.panelCount));
    pl = B.planMirWorkReport(P('2호기 14번 베이 해치 열었어 3장'), ctx);
    ok('④ 말한 장수가 앞선다(3장)', pl.writes.find((w) => w.report).report.panelCount === 3);
    pl = B.planMirWorkReport(P('14번 베이 해치 열었어'), ctx);
    ok('④ 호기 없는 해치 — 진행 중 호기가 하나가 아니면 되묻는다', !!pl.ask);
    pl = B.planMirWorkReport(P('14번 베이 해치 열었어'), { ...ctx, activeWork: AW });
    ok('④ 진행 중 호기가 하나면 그 호기(2호기)로', pl.writes && pl.writes.find((w) => w.report).report.equip === '2호기');
    pl = B.planMirWorkReport(P('1호기 콘박스 20자 3개'), ctx);
    ok('④ 콘박스 — conBoxType 20 · conBoxCount 3 · 글 «📦 콘박스 20자 3개»', pl.writes.some((w) => w.report && w.report.type === 'conbox' && w.report.conBoxType === '20' && w.report.conBoxCount === 3 && /콘박스 20자 3개/.test(w.report.message)));
    ok('④ 되읽기 — «… 적었어요 … «취소» 라고 하세요»', /적었어요.*취소/.test(pl.readback));
    //  취소 대조 — RTDB 는 키를 이름순·null 칸 없이 돌려준다(감사 중-가). 미르가 쓴 값(재개의 pauseReason:null 포함)이 그 모양으로 돌아와도 «같다».
    pl = B.planMirWorkReport(P('2호기 양하 재개'), { ...ctx, activeWork: { '2호기': { discharge: { ...AW['2호기'].discharge, status: 'paused', pauseReason: '강풍' } } } });
    const wrote = pl.writes.find((w) => w.aw).aw.val;
    const back = Object.fromEntries(Object.entries(wrote).filter(([, v]) => v !== null).sort(([a], [b]) => (a < b ? -1 : 1)));
    ok('⑤ 취소 대조 — 키 정렬·null 칸 빠진 RTDB 값도 미르가 쓴 값과 같다 · 다른 값은 다르다', B.sameRtdbVal(back, wrote) && !B.sameRtdbVal({ ...back, status: 'paused' }, wrote) && B.sameRtdbVal(null, undefined));
    // ⑤ 고치기·지우기 — 전한 사람도
    ok('⑤ 전한 사람(relayBy)도 그 보고를 고치고 지운다 · 남은 못 한다', B.canEditReport({ type: 'work_status', by: '검수원2', via: 'mir', relayBy: '김성일' }, '김성일') && !B.canEditReport({ type: 'work_status', by: '검수원2', via: 'mir', relayBy: '김성일' }, '최원형') && !B.canEditReport({ type: 'work_status', by: '검수원2' }, '김성일'));
    // ⑥ 배선
    const fb = rd('src/firebase.js'), mf = rd('src/components/MirFab.jsx'), sp = rd('src/components/SearchPanel.jsx'), mi = rd('src/mir.js');
    const fnBody = (src, name) => { const i = src.indexOf(`export async function ${name}(`); return i < 0 ? '' : src.slice(i, src.indexOf('\n}\n', i)); };
    ok('⑥ 쓰는 자리 fbApplyMirWorkWrites — 조회만 문지기(assertCanWork) · 미르 전달 보고만 받음', /assertCanWork\('미르 작업보고'\)/.test(fnBody(fb, 'fbApplyMirWorkWrites')) && /via !== 'mir'/.test(fnBody(fb, 'fbApplyMirWorkWrites')));
    ok('⑥ 읽기 실패는 던진다(_withTimeout) — 진행 중 표시를 모르고 쓰지 않는다', /_withTimeout\(get\(ref\(db, `activeWork\/\$\{voyageKey\}`\)\)/.test(fnBody(fb, 'fbPeekMirWorkCtx')));
    ok('⑥ 취소 — 지운 보고로 옮기고, 진행 중·해치 표시는 지금 값이 미르가 쓴 값일 때만 되돌린다(감사 중2)', /reports_deleted/.test(fnBody(fb, 'fbUndoMirWorkWrites')) && /same\(cur\.exists\(\) \? cur\.val\(\) : null, a\.wrote\)\) patch\[`activeWork\/\$\{vk\}\/\$\{a\.equip\}\/\$\{a\.mode\}`\] = a\.prev/.test(fnBody(fb, 'fbUndoMirWorkWrites')));
    ok('⑥ 취소 대조는 sameRtdbVal 한 벌(키 순서·null 칸 무시)', /const same = sameRtdbVal;/.test(fnBody(fb, 'fbUndoMirWorkWrites')));
    ok('⑥ 쓰기는 루트 update 한 번(진행 중·보고·해치 표시 반쪽 없음 · 감사 중1)', /await _ackOrQueue\(update\(ref\(db\), patch\), '미르 작업보고'\)/.test(fnBody(fb, 'fbApplyMirWorkWrites')) && !/set\(ref\(db/.test(fnBody(fb, 'fbApplyMirWorkWrites')));
    ok('⑥ 쓰기 전에 앞 되돌리기 정보를 비운다(실패 때 엉뚱한 보고를 지우지 않게)', [mf, sp].every((x) => /wrUndoRef\.current = null;[^\n]*\n?[^\n]*wrUndoRef\.current = await fbApplyMirWorkWrites/.test(x)));
    ok('⑥ 호기 쥔 사람 판정은 equipHold 한 벌', /equipHolderOf\(inspectors \|\| \{\}, voyageKey, equip, '', nowMs\)/.test(rd('src/workReportPlan.js')));
    ok('⑥ 떠 있는 미르·검색줄이 같은 계획·같은 쓰기를 부른다', [mf, sp].every((s) => /planMirWorkReport\(wr, \{ voyageKey, voyage, activeWork: cx\.activeWork, inspectors: cx\.inspectors, relayBy: inspector \|\| ''/.test(s) && /fbApplyMirWorkWrites\(voyageKey, plan\.writes/.test(s)));
    ok('⑥ 엔진 답 — 콘앱·적는 손 없는 화면은 적지 않는다고 말한다', /p\.workRep && \(p\.mirCalled \|\| c\.mirBox\)/.test(mi) && /이 화면에서는 작업보고가 적히지 않아요/.test(mi));
    ok('⑥ 매뉴얼에 미르 작업보고', /미르 작업보고/.test(rd('src/data/helpData.js')) && /검수원2/.test(rd('src/data/helpData.js')));
    // ⑦ 5.13-01 — 라이브 확인 지적 셋
    ok('⑦ 되묻기 앞에 «적고 있어요»가 뜨지 않는다(확인할게요)', !/'[^'\n]*적고 있어요/.test(mi) && /작업보고 확인할게요/.test(mi));
    const cz = ['취소', '미르야 취소', '취소해줘', '취소 해줘', '취소해주세요', '취소?', '미르 취소', '취소요'].map((q) => String(B.answerOneRaw(q) || ''));
    ok('⑦ 맨말 «취소» → 아무것도 바꾸지 않았다고 되묻는다', cz.every((a) => /무엇을 취소할까요/.test(a) && /아무것도 바꾸지 않았어요/.test(a)), cz.join(' / '));
    ok('⑦ 맨말 «취소» 답은 약한 답이 아니다(모델·번역으로 안 보낸다)', ['취소', '미르야 취소', '취소해줘'].every((q) => B.isWeakAnswer(q, B.answerOneRaw(q), { via: 'cancelBare' }) === false));
    ok('⑦ «취소 리스트»·«선적 취소»·«취소된 컨 몇 대» 는 가로채지 않는다', ['취소 리스트', '선적 취소', '취소된 컨 몇 대'].every((q) => !/무엇을 취소할까요/.test(String(B.answerOneRaw(q) || ''))));
    ok('⑦ «보고 취소»는 그대로 작업보고 취소로 읽는다', P('보고 취소') && P('보고 취소').kind === 'cancel');
    ok('⑦ 리퍼 온도 단위 한 번 — degText', B.degText('-23.0℃') === '-23.0°C' && B.degText('-18') === '-18°C' && B.degText(' 5 °C') === '5°C' && B.degText('-18°') === '-18°C' && B.degText('+5c') === '+5°C' && B.degText(0) === '0°C' && B.degText('') === '' && B.degText(null) === '');
    ok('⑦ 화면 여섯 곳·검색 엔진이 degText 한 벌을 쓴다(°C 덧붙이기 없음)', ['src/components/ContainerList.jsx', 'src/pages/GlobalSearchPage.jsx', 'src/components/ContainerDetailModal.jsx', 'src/components/StatsTab.jsx', 'src/components/BigResultCard.jsx', 'src/components/SearchPanel.jsx', 'src/components/SlotPickerModal.jsx', 'src/nlSearch.js', 'src/mir.js'].every((f) => /degText\(/.test(rd(f))));
  } catch (err) { bad += 1; console.log('  ✘ 실행 오류 — ' + (err && err.stack || err)); }
  console.log(`\n5.13 미르 작업보고 전달 연막검사 — ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})();
