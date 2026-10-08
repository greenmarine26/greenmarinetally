// 4.12 연막검사 — 마감적용(동방 선적을 마감텔리 선적 EDI 기준으로 마무리). ATPR 2645W(동방 PNCT 선적, 출항 완료) 실제 항차 자료로 잰다. 쓰기 없음.
//   ① 채울 컨 = 마감텔리 선적 EDI 가 고르는 평택 선적분 중 앱 완료가 없는 컨(한 벌) ② 시각·동방·작업 끝 문지기 ③ 완료자 표기·사람 기록 판정 ④ 구조 — 소유자 메뉴 안·쓰는 자리 문지기·구독 없음·콘앱 사본
//   ⑤ 실제 화면 — 패널을 그려 단추·확인창·결과 안내를 본다.
//   실행 — node tools/smoke_closingedi412.cjs <repoRoot> <번들(smoke_closingedi412.jsx)>. 실패하면 빌드를 세운다.
process.env.TZ = 'Asia/Seoul';   // 앱의 시각 읽기(_dtMs)는 기기 시간대를 쓴다 — 현장 기기는 한국 시간이다. 시험도 한국 시간으로 고정(실행 환경 시간대에 흔들리지 않게)
const path = require('path');
const fs = require('fs');
const root = process.argv[2] || process.cwd();
const bundle = process.argv[3];
(async () => {
  let bad = 0, n = 0;
  const ok = (c, m) => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) bad++; };
  const U = await import(path.resolve(root, 'src/utils.js'));
  const L = await import(path.resolve(root, 'src/loadingEdiExport.js'));
  const FX = require(path.resolve(root, 'tools/fixtures/closingedi_atpr.json'));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const voy = (comp, info) => ({ info: { ...clone(FX.info), ...(info || {}) }, loading: { ediContainers: clone(FX.loading.ediContainers), records: clone(FX.loading.records), completed: comp || {} } });
  const cns = Object.keys(FX.loading.ediContainers);
  const endMs = Date.parse('2026-10-08T03:50:00+09:00');   // '2026-10-08 03:50' 한국 시간 — 문지기가 기기 시간대와 무관하게 KST 로 읽는다(감사 2026-10-08)

  console.log('[1] 채울 컨 — 실제 ATPR 2645W 선적 (EDI ' + cns.length + '대, 앱 완료 0)');
  const r0 = L.closingEdiEntries(voy({}));
  ok(r0.total === 412 && r0.cns.length === 412 && r0.appDone === 0, `평택 선적분 ${r0.total} · 앱 완료 ${r0.appDone} · 채울 컨 ${r0.cns.length}`);
  //  마감텔리 선적 EDI 가 고르는 컨과 한 벌인가 — 완료를 비우고 collectActualLoading 을 그대로 부른 결과와 같은 집합
  const ref = L.collectActualLoading(voy({}));
  ok(ref.useDoneOnly === false && ref.rows.length === 412 && new Set(ref.rows.map((r) => r.cn)).size === 412 && r0.cns.every((c) => ref.rows.some((r) => r.cn === c)) && ref.rows.every((r) => r0.cns.includes(r.cn)), '채울 컨 집합 = 마감텔리 선적 EDI 가 고르는 평택 선적분(collectActualLoading 한 벌)');
  ok(r0.gate.ok === true && r0.gate.at === endMs, `gate 통과 · 완료 시각 = 작업 끝 시각 2026-10-08 03:50 (${r0.gate.at})`);
  //  앱 완료가 일부 있을 때 — 검수원 5 · 터미널 반영 4(표식 포함) · 키 모양이 달라도(소문자·공백) 같은 컨으로 본다
  const human = {}; cns.slice(0, 5).forEach((c, i) => { human[c] = { by: '박철민', at: 1791380000000 + i, equip: '2호기' }; });
  const term = {}; cns.slice(5, 9).forEach((c, i) => { term[c] = { by: '', src: 'term', at: 1791381000000 + i, termBasis: 'plan' }; });
  const r1 = L.closingEdiEntries(voy({ ...human, ...term }));
  ok(r1.cns.length === 403 && r1.appDone === 9 && r1.total === 412 && cns.slice(0, 9).every((c) => !r1.cns.includes(c)), `검수원 5 · 터미널 반영 4 는 빼고 ${r1.cns.length}대만 채운다 (앱 완료 ${r1.appDone})`);
  const odd = clone(human); const k0 = cns[0]; delete odd[k0]; odd[k0.toLowerCase().replace(/^(....)/, '$1 ')] = { by: '박철민', at: 1 };
  ok(L.closingEdiEntries(voy(odd)).cns.length === 407 && !L.closingEdiEntries(voy(odd)).cns.includes(k0), '완료 키가 소문자·공백이 섞여 있어도 같은 컨으로 본다(덮지 않는다)');
  const rAll = L.closingEdiEntries(voy(Object.fromEntries(cns.map((c) => [c, { by: 'x', at: 1 }]))));
  ok(rAll.cns.length === 0 && rAll.appDone === 412, '앱 완료가 전부 있으면 채울 것이 0');
  //  핵심 — 마감텔리 선적 EDI 는 완료가 하나라도 있으면 «완료분만» 내보낸다. 마감적용 뒤에는 전부 나가야 한다.
  const partial = voy({ ...human, ...term });
  const before = L.collectActualLoading(partial);
  ok(before.useDoneOnly === true && before.rows.length === 9, `마감적용 전 — 완료 9대만 나간다(useDoneOnly ${before.useDoneOnly} · ${before.rows.length}대 — 나머지 403대는 서류에서 조용히 빠진다)`);
  const filled = clone(partial); for (const c of r1.cns) filled.loading.completed[c] = { by: '', src: 'edi', at: r1.gate.at };
  const after = L.collectActualLoading(filled);
  ok(after.useDoneOnly === true && after.rows.length === 412 && after.rows.length === ref.rows.length, `마감적용 뒤 — 마감텔리 선적 EDI 에 ${after.rows.length}대가 전부 나간다(= 전체 평택 선적분 ${ref.rows.length}대)`);

  console.log('[2] 문지기 — 동방 · 작업 끝난 배 · 시각');
  const now = Date.now();
  ok(U.closingEdiGate({ ...FX.info, pier: 'PCTC' }, {}, now).ok === false && /동방\(PNCT\)/.test(U.closingEdiGate({ ...FX.info, pier: 'PCTC' }, {}, now).why), 'PCTC 는 안 된다');
  ok(U.closingEdiGate({ ...FX.info, pier: '' }, {}, now).ok === false && U.closingEdiGate(null, {}, now).ok === false, '부두가 비었거나 info 가 없으면 안 된다');
  ok(U.closingEdiGate({ ...FX.info, pier: 'pnct' }, {}, now).ok === true, '부두 글자의 대소문자는 가리지 않는다');
  const working = { ...FX.info, terminalStatus: 'working', workEndAt: '2999-01-01 00:00' };
  ok(U.closingEdiGate(working, {}, now).ok === false && /작업이 끝난 뒤/.test(U.closingEdiGate(working, {}, now).why), '출항 전이고 작업 끝 시각이 미래면 안 된다(작업 중)');
  const endedByTime = { ...FX.info, terminalStatus: 'working', workEndAt: '2026-10-08 03:50' };
  ok(U.closingEdiGate(endedByTime, {}, endMs + 60000).ok === true && U.closingEdiGate(endedByTime, {}, endMs - 60000).ok === false, '출항 표시가 없어도 작업 끝 시각이 지났으면 된다 · 지나기 전이면 안 된다');
  const dep = { ...FX.info, terminalStatus: 'departed' }; delete dep.workEndAt;
  ok(U.closingEdiGate(dep, {}, now).ok === false && /작업 끝 시각을 알 수 없어/.test(U.closingEdiGate(dep, {}, now).why), '출항했는데 작업 끝 시각도 앱 완료도 없으면 값 없는 기록을 만들지 않는다(거절)');
  ok(U.closingEdiGate(dep, { A: { by: 'x', at: now - 5000 }, B: { by: 'y', at: now - 9000 }, C: { by: 'z', at: now + 9e6 } }, now).at === now - 5000, '작업 끝 시각이 비면 앱에 찍힌 마지막 완료 시각(미래 값은 무시)');
  const fut = { ...FX.info, terminalStatus: 'departed', workEndAt: '2999-01-01 00:00' };
  ok(U.closingEdiGate(fut, {}, now).ok === true && U.closingEdiGate(fut, {}, now).at === now, '출항했는데 작업 끝 시각이 미래로 적혀 있으면 지금으로 자른다(미래 시각을 쓰지 않는다)');
  //  ★ 감사 2026-10-08 — 이 시각은 DB 에 쓰이는 공유 값이다. 기기 시간대(UTC·뉴욕 등)로 읽으면 시차만큼 어긋난다 — 어느 시간대 기기에서 눌러도 같은 KST 03:50 이어야 한다.
  const kst0350 = Date.parse('2026-10-08T03:50:00+09:00');
  const tzSave = process.env.TZ;
  const tzOut = {};
  for (const tz of ['UTC', 'America/New_York', 'Asia/Seoul']) { process.env.TZ = tz; tzOut[tz] = U.closingEdiGate({ ...FX.info }, {}, kst0350 + 3600000).at; }
  process.env.TZ = tzSave;
  ok(Object.values(tzOut).every((v) => v === kst0350), `완료 시각이 기기 시간대와 무관하게 한국 시간 03:50 이다(UTC·뉴욕·서울 ${JSON.stringify(Object.values(tzOut).map((v) => new Date(v).toISOString()))})`);
  const canc = { ...FX.info, cancelLod: true };
  ok(U.closingEdiGate(canc, {}, now).ok === false && /취소/.test(U.closingEdiGate(canc, {}, now).why), '선적이 취소 표시된 항차는 안 된다(취소된 면에 완료를 쓰지 않는다)');
  const src = fs.readFileSync(path.resolve(root, 'src/utils.js'), 'utf8');
  const gateSrc = src.slice(src.indexOf('export function closingEdiGate'), src.indexOf('/** 4.11 — 스냅샷의 출처'));
  ok(!/atdActual|atbActual/.test(gateSrc.replace(/\/\/[^\n]*/g, '')), '시각을 슬래시 형식인 atdActual 에서 읽지 않는다(workEndAt 뿐)');

  const statsSrc = fs.readFileSync(path.resolve(root, 'src/components/StatsTab.jsx'), 'utf8');
  ok(/if \(!isEdiApplied\(r\)\)[\s\S]{0,520}byHour\[k\]/.test(statsSrc), '통계 탭의 시간대별 막대는 마감 EDI 적용을 뺀다(끝 시간대가 거짓으로 솟지 않는다)');

  console.log('[3] 완료자 표기 · 사람 기록 판정');
  const e = { by: '', src: 'edi', at: endMs };
  ok(U.isEdiApplied(e) === true && U.isTermApplied(e) === false && U.isAutoDone(e) === true, '마감 EDI 적용: isEdiApplied · 터미널 반영은 아님 · 사람이 아닌 기록(isAutoDone)');
  ok(U.isAutoDone({ by: '', src: 'term', at: 1 }) === true && U.isAutoDone({ by: '터미널(옛)', at: 1 }) === true && U.isAutoDone({ by: '박철민', at: 1 }) === false && U.isAutoDone(null) === false, '터미널 반영(새·옛 행)도 사람이 아닌 기록 · 검수원 기록은 사람 기록');
  ok(U.completedByLabel(e) === '마감 EDI 적용' && U.completedByLabel(e, { craneCrew: {} }) === '마감 EDI 적용', '완료자 표기 = «마감 EDI 적용» (조 등록 근무자를 붙이지 않는다)');
  ok(U.completedByLabel({ by: '박철민', at: 1 }) === '박철민' && U.completedByLabel({ by: '', src: 'term', at: 1 }) === '터미널 반영' && U.completedByLabel({ by: '', at: 1 }) === '', '검수원 이름 · 터미널 반영 · 이름 없는 옛 행의 표기는 종전 그대로');
  ok(!/카스피|카토스|CATOS|트레드링스/i.test(U.EDI_DONE_LABEL), '표기에 외부 시스템 이름이 없다');

  console.log('[4] 구조 — 소유자 메뉴 안 · 쓰는 자리 문지기 · 구독 없음 · 콘앱 사본');
  const read = (f) => fs.readFileSync(path.resolve(root, f), 'utf8');
  const noCmt = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
  const CD = read('src/pages/ChiefDashboard.jsx'), FB = read('src/firebase.js'), PN = read('src/components/ClosingEdiPanel.jsx');
  const i0 = CD.indexOf('<Fold id="ownermenu"'), i1 = CD.indexOf('</Fold>\n      )}', i0);
  const block = CD.slice(CD.lastIndexOf('{owner && (', i0), i1);
  ok(i0 > 0 && block.includes('<ClosingEdiPanel') && block.includes('<ShiftSnapPanel') && block.includes('<ActivityLogSection') && block.includes('onOpenStaffManager'), '소유자 메뉴 한 묶음 안에 «교대 시각»·«마감적용»·«활동 로그»·«인원 관리»가 같이 있다');
  ok((CD.match(/<ClosingEdiPanel/g) || []).length === 1, '마감적용 패널은 대시보드에 한 곳뿐이다(흩어지지 않는다)');
  const fnBody = (name) => { const s = FB.indexOf('export async function ' + name); return FB.slice(s, FB.indexOf('\n}\n', s)); };
  const ap = noCmt(fnBody('fbApplyClosingEdi'));
  ok(/assertOwner\(/.test(ap) && /assertCanWork\(/.test(ap), 'fbApplyClosingEdi 는 쓰는 자리에서 소유자·작업 권한 문지기를 둔다');
  ok(/closingEdiEntries\(/.test(ap) && /r\.gate\.ok/.test(ap) && /update\(ref\(db\), patch\)/.test(ap) && !/\bset\(/.test(ap) && !/remove\(/.test(ap), '대상 컨·시각·동방/작업 끝 판정을 쓰는 자리가 새로 정하고, 쓰기는 update(patch) 한 번뿐이다 — set·remove 없음');
  ok((ap.match(/patch\[/g) || []).length === 1 && /patch\[`voyages\/\$\{voyageKey\}\/loading\/completed\/\$\{cn\}`\]/.test(ap) && !/onValue|onChild|onSnapshot/.test(ap), '건드리는 곳은 loading/completed/{컨} 하나뿐이고 구독이 없다');
  ok(!/onValue|onChild|onSnapshot|fbSubscribe/.test(noCmt(PN)), '패널은 구독하지 않는다(받아 둔 항차 자료로 세기만 한다)');
  ok(!/카스피|카토스|CATOS|트레드링스/i.test(noCmt(PN).replace(/'[^']*'|`[^`]*`|"[^"]*"/g, (m) => m)) && !/카스피|카토스|CATOS|트레드링스/i.test(PN.replace(/\/\/[^\n]*/g, '')), '패널 화면 글자에 외부 시스템 이름이 없다(주석 제외)');
  //  현장 [완료]가 마감 EDI 적용을 덮는다 — 사람이 찍은 것만 막는다(터미널 반영과 같은 길)
  const code = noCmt(FB);
  ok((code.match(/!isAutoDone\(prev\)/g) || []).length === 2 && !/!isTermApplied\(prev\)/.test(code), '사람 [완료]·초과 컨 기록의 «이미 완료» 문지기가 마감 EDI 적용도 덮을 수 있게 한 벌(isAutoDone)이다');
  //  콘앱 사본 — 번들 밖이라 같은 뜻을 따로 가진다
  const CONE = read('public/cone.html');
  const m = CONE.match(/function ctIsTerm\(c\)\{[\s\S]*?\n\}/);
  ok(!!m, '콘앱 ctIsTerm 을 찾았다');
  const ctIsTerm = new Function(m[0].replace(/\/\/[^\n]*/g, '') + '; return ctIsTerm;')();
  ok(ctIsTerm({ src: 'edi', by: '' }) === true && ctIsTerm({ src: 'term' }) === true && ctIsTerm({ by: '터미널(옛)' }) === true && ctIsTerm({ by: '박철민', at: 1 }) === false && ctIsTerm(null) === false, '콘앱: 마감 EDI 적용·터미널 반영은 호기 줄로 그리지 않고, 검수원 기록은 그대로 그린다');
  ok(/window\.__CONEV='ConeOne 2\.(64|65|66)(-\d\d)?'/.test(CONE), '콘앱 버전이 2.64 이상으로 올랐다(폰이 새 cone.html 을 감지)');
  //  시간대별 분포에서 뺀다
  const NL = read('src/nlSearch.js');
  ok(/if \(isEdiApplied\(r\)\) \{ _ediSkip\+\+; continue; \}/.test(NL) && /if \(!byH\.size && !_ediSkip\)/.test(NL), '시간대별 분포에서 마감 EDI 적용을 뺀다(끝 시각 한 시간대가 솟아 보이지 않게)');

  console.log('[5] 실제 화면 — ATPR 2645W 로 패널을 그린다');
  if (!bundle) { ok(false, '번들 경로가 없다'); finish(); return; }
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  const errs = [];
  dom.window.addEventListener('error', (ev) => errs.push(ev.message));
  console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
  dom.window.alert = () => {};
  dom.window.__by = '김성일';
  try { dom.window.eval(fs.readFileSync(bundle, 'utf8')); } catch (ex) { errs.push('THROW: ' + ex.message); }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const doc = dom.window.document;
  const txt = () => doc.body.textContent || '';
  const clickBy = (re) => { const b = [...doc.querySelectorAll('button')].find((x) => re.test((x.textContent || '').trim()) && !x.disabled); if (!b) return false; b.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); return true; };
  const calls = () => dom.window.__calls || [];
  const extra = () => ({
    DJCT_0225E: { info: { vsl: 'DJCT', voy_d: '0225E', pier: 'PCTC', terminalStatus: 'departed', workStartAt: '2026-10-07 08:05', workEndAt: '2026-10-07 20:00' }, loading: { ediContainers: clone(FX.loading.ediContainers), completed: {} } },
    NOWK_0001E: { info: { vsl: 'NOWK', voy_l: '0001E', pier: 'PNCT', terminalStatus: 'working', workStartAt: '2026-10-08 01:00', workEndAt: '2999-01-01 00:00' }, loading: { ediContainers: clone(FX.loading.ediContainers), completed: { [cns[0]]: { by: '박철민', at: 1 } } } },
    NEXT_0002E: { info: { vsl: 'NEXT', voy_l: '0002E', pier: 'PNCT', terminalStatus: 'planned' }, loading: { ediContainers: clone(FX.loading.ediContainers), completed: {} } },
  });
  dom.window.__closingEdiN = 412; dom.window.__closingEdiTotal = 412; dom.window.__closingEdiAppDone = 0; dom.window.__closingEdiAt = endMs;
  dom.window.__renderPanel({ ATPR_2645W: voy({}), ...extra() }); await wait(600);
  let t = txt();
  ok(errs.length === 0, '렌더 중 오류 없음' + (errs.length ? ' — ' + [...new Set(errs)].slice(0, 2).join(' | ') : ''));
  ok(/ATPR 2645W/.test(t) && /선적/.test(t) && /작업 끝/.test(t), '선박·항차·모드·«작업 끝» 표시가 보인다 (ATPR 2645W 선적)');
  ok(/평택 선적분\s*412대/.test(t) && /앱 완료\s*0/.test(t) && /채울 컨\s*412대/.test(t), '평택 선적분 412대 · 앱 완료 0 · 채울 컨 412대');
  ok(/완료 시각은 작업 끝 시각 10\/08 03:50 로 들어갑니다/.test(t) && /«마감 EDI 적용»/.test(t), '완료 시각(10/08 03:50)과 완료자 표기가 미리 보인다');
  ok(/마감텔리 선적 EDI/.test(t) && /자동으로는 아무것도 바뀌지 않습니다/.test(t) && /동방 선박만 나옵니다/.test(t), '안내 문구(마감텔리 선적 EDI 기준 · 눌러야만 들어감 · 동방만)');
  ok(!/DJCT/.test(t), 'PCTC 선박(DJCT)은 목록에 없다 — 동방 선박만');
  ok(/NOWK 0001E/.test(t) && /작업 중/.test(t) && /작업이 끝난 뒤에 쓰는 마무리 단추입니다/.test(t), '작업 중인 동방 선박(NOWK)은 «작업 중» + 이유가 보이고');
  ok(!/NEXT/.test(t) && /작업 시작 전인 동방 선적 1척은 표시하지 않았습니다/.test(t), '아직 시작 전인 동방 선박(NEXT)은 이름 없이 «1척» 으로만 알린다');
  const btns = [...doc.querySelectorAll('button')].map((b) => (b.textContent || '').trim()).filter((x) => /마감적용/.test(x));
  ok(btns.length === 1 && /마감적용 412대/.test(btns[0]), '단추는 끝난 배 하나뿐이다(🏁 마감적용 412대) — 작업 중인 배에는 단추가 없다');
  ok(clickBy(/마감적용 412대/), '[마감적용] 단추를 눌렀다'); await wait(300);
  ok(/412대를 마감텔리 선적 EDI 기준으로 완료 처리\?/.test(txt()) && /앱에서 찍은 0대는 그대로 둡니다/.test(txt()) && calls().length === 0, '한 번 더 묻는다(예/취소) — 아직 아무것도 안 썼다');
  ok(clickBy(/^취소$/), '[취소]'); await wait(200);
  ok(calls().length === 0 && /마감적용 412대/.test(txt()), '취소하면 쓰지 않고 단추가 그대로다');
  ok(clickBy(/마감적용 412대/), '다시 눌렀다'); await wait(300);
  ok(clickBy(/^예$/), '[예]'); await wait(500);
  const cl = calls().filter((c) => c.fn === 'closingEdi');
  ok(cl.length === 1 && cl[0].vk === 'ATPR_2645W' && cl[0].by === '김성일', '쓰기 호출이 정확히 한 번, 그 항차·로그인한 이름(by)으로 나갔다 — 대상 컨은 화면이 넘기지 않는다');
  ok(/선적 412대를 마감텔리 선적 EDI 기준으로 완료 처리했습니다/.test(txt()) && /10\/08 03:50/.test(txt()) && /앱에서 찍은 0대는 건드리지 않았습니다/.test(txt()), '결과 안내(대수 · 완료 시각 · 앱 완료는 안 건드림)');
  //  일부는 앱에 있다 → 채울 컨이 줄고, 전부 있으면 단추가 없다
  dom.window.__renderPanel({ ATPR_2645W: voy({ ...human, ...term }) }); await wait(500);
  ok(/앱 완료\s*9/.test(txt()) && /채울 컨\s*403대/.test(txt()) && clickBy(/마감적용 403대/), '앱 완료 9대면 채울 컨이 403대로 줄어든다');
  dom.window.__renderPanel({ ATPR_2645W: voy(Object.fromEntries(cns.map((c) => [c, { by: 'x', at: 1 }]))) }); await wait(500);
  t = txt();
  ok(!/🏁 마감적용 \d+대/.test(t) && /앱 완료가 전부 있어 채울 것이 없습니다/.test(t) && /채울 컨\s*0대/.test(t), '앱 완료가 전부 있으면 단추가 없고 «채울 것이 없습니다»');
  //  쓰는 자리가 거절하면(작업 중으로 바뀜 등) 조용히 넘기지 않고 화면에 말한다
  dom.window.__closingEdiErr = '마감적용을 할 수 없습니다 — 작업이 끝난 뒤에 쓰는 마무리 단추입니다';
  dom.window.__renderPanel({ ATPR_2645W: voy({}) }); await wait(400);
  clickBy(/마감적용 412대/); await wait(200); clickBy(/^예$/); await wait(400);
  ok(/마감적용 실패\(ATPR 2645W\)/.test(txt()) && /작업이 끝난 뒤에 쓰는 마무리 단추입니다/.test(txt()), '쓰는 자리가 거절하면 «마감적용 실패» 와 이유가 화면에 뜬다(조용한 실패 없음)');
  dom.window.__renderPanel({}); await wait(400);
  ok(/마감적용을 쓸 동방 선적 항차가 없습니다/.test(txt()), '해당 항차가 없으면 없다고 말한다');
  ok(errs.length === 0, '끝까지 오류 없음' + (errs.length ? ' — ' + [...new Set(errs)].slice(0, 2).join(' | ') : ''));
  finish();
  function finish() { console.log(`\n${n - bad}/${n} 통과`); process.exit(bad ? 1 : 0); }
})().catch((ex) => { console.error('시험 자체가 죽었다:', ex); process.exit(1); });
