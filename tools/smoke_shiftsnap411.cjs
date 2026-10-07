// 4.11 연막검사 — 교대 시각(06:30·17:30) 터미널 기준. ① 반영 판정(snapApplyEntries)이 computeTermApply 와 한 벌이고 추가만 하는가
//   ② 동방 선적만 «계획 기준» 표식이 붙는가 ③ 구조 — 소유자 메뉴 안에만 있고 구독이 없고 쓰는 자리에 소유자 문지기가 있는가 ④ 실제 화면 — 실데이터 스냅샷으로 그린 패널
//   실행 — node tools/smoke_shiftsnap411.cjs <repoRoot> <번들(smoke_shiftsnap411.jsx)>. 실패하면 빌드를 세운다.
//   픽스처 tools/fixtures/shiftsnap_atpr.json 은 수집기(MailPilot 2.43 shiftsnap.py)가 실제 동방 서버(2026-10-07 22:13)에서 읽어 만든 스냅샷 그대로다(쓰기 없음).
const path = require('path');
const fs = require('fs');
const root = process.argv[2] || process.cwd();
const bundle = process.argv[3];
(async () => {
  let bad = 0, n = 0;
  const ok = (c, m) => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) bad++; };
  const U = await import(path.resolve(root, 'src/utils.js'));
  const FX = require(path.resolve(root, 'tools/fixtures/shiftsnap_atpr.json'));
  const snap = FX.snap, cns = Object.keys(snap.rows);

  console.log('[1] 반영 판정 — 실데이터 스냅샷(ATPR 2645W 선적, 동방 계획 기준)');
  ok(snap.src === 'PNCT' && snap.basis === 'plan' && snap.done === cns.length && snap.done > 0 && snap.n >= snap.done, `픽스처가 수집기가 쓴 모양이다 (done ${snap.done} / n ${snap.n} / rows ${cns.length})`);
  ok(JSON.stringify(Object.keys(snap).sort()) === JSON.stringify(['basis', 'done', 'last', 'n', 'readAt', 'ref', 'rows', 'slot', 'src']), '스냅샷 칸 이름이 앱이 읽는 것과 같다 — ' + Object.keys(snap).sort().join(','));
  const all = U.snapApplyEntries(snap, {});
  ok(all.length === snap.done, `빈 완료면 터미널 완료 ${snap.done}대 전부 반영 대상 (${all.length})`);
  ok(all.every(([, r]) => r.by === '' && r.src === 'term' && r.termBasis === 'plan' && typeof r.at === 'number' && r.at > 0), '반영 레코드 = {by:"", src:"term", at, termBasis:"plan"} — 이름 자리는 비운다(3.16)');
  ok(all.every(([, r]) => !('equip' in r)), '동방은 호기를 안 주므로 equip 칸이 없다(빈 값으로 안 채움)');
  //  추가만 — 검수원이 앱에서 찍은 컨은 건드리지 않는다
  const human = {}; cns.slice(0, 5).forEach((c, i) => { human[c] = { by: '박철민', at: 1790000000000 + i, equip: '2호기' }; });
  const part = U.snapApplyEntries(snap, human);
  ok(part.length === snap.done - 5 && part.every(([c]) => !(c in human)), `검수원이 찍은 5대는 건너뛴다 (${part.length}대 = ${snap.done} - 5)`);
  ok(U.snapApplyEntries(snap, Object.fromEntries(cns.map((c) => [c, { by: 'x', at: 1 }]))).length === 0, '앱에 이미 다 있으면 반영할 것이 없다(0)');
  //  판정 한 벌 — 기존 computeTermApply 와 같은 결과(표식만 더한다)
  const ref = U.computeTermApply(snap.rows, {});
  ok(ref.length === all.length && ref.every(([c, r], i) => all[i][0] === c && JSON.stringify({ ...all[i][1], termBasis: undefined }) === JSON.stringify({ ...r, termBasis: undefined })), 'computeTermApply 와 같은 대상·같은 값 — 판정 한 벌(표식만 더함)');
  //  카토스 모양(호기 있음) — PDA 라 표식이 없다
  const pctc = { src: 'PCTC', basis: 'PDA', rows: { CAXU1000001: { at: 1791370000000, equip: 'GC101' }, CAXU1000002: { at: 1791370060000, equip: 'GC104' }, CAXU1000003: { at: 1791370120000 } } };
  const p = U.snapApplyEntries(pctc, {});
  ok(p.length === 3 && p.every(([, r]) => !('termBasis' in r)), '카토스(PDA)·동방 양하(actual)에는 «계획 기준» 표식이 없다');
  ok(p[0][1].equip === '1호기' && p[1][1].equip === '4호기' && !('equip' in p[2][1]), 'GC101→1호기 · GC104→4호기 · 호기 없는 컨은 equip 없음(computeTermApply 와 같다)');
  ok(U.snapApplyEntries({ src: 'PNCT', basis: 'actual', rows: { A: { at: 5 } } }, {}).every(([, r]) => !('termBasis' in r)), '동방 양하(actual)도 표식 없음');
  ok([null, undefined, {}, { rows: null }, { rows: 'x' }, 5].every((s) => U.snapApplyEntries(s, {}).length === 0), '스냅샷이 비었거나 모양이 틀리면 빈 목록(던지지 않는다)');
  ok(U.snapApplyEntries({ basis: 'PDA', rows: { X: { at: 0 }, Y: {} } }, {}).length === 0, '완료 시각(at)이 없는 행은 반영 대상이 아니다');
  //  표식이 붙어도 «터미널 반영»으로 읽힌다 — 다른 화면의 판정이 바뀌지 않는다
  const rec = all[0][1];
  ok(U.isTermApplied(rec) === true && U.completedByLabel(rec) === '터미널 반영', 'termBasis 가 붙은 레코드도 isTermApplied=true · 완료자 표기는 «터미널 반영»');
  ok(U.isTermApplied({ by: '박철민', at: 1 }) === false, '사람이 찍은 기록은 그대로 사람 기록이다');
  //  출처 표시
  const b1 = U.snapBasisOf(snap), b2 = U.snapBasisOf(pctc), b3 = U.snapBasisOf({ src: 'PNCT', basis: 'actual' });
  ok(b1.tone === 'warn' && /동방 계획 기준 · 완료 확정 아님/.test(b1.label), `동방 선적 표시 «${b1.label}»`);
  ok(b2.tone === 'ok' && /PCTC/.test(b2.label) && b3.tone === 'ok' && /동방 · 실제 작업 기록/.test(b3.label), `카토스 «${b2.label}» · 동방 양하 «${b3.label}»`);

  console.log('[2] 구조 — 소유자 메뉴 안에만 있고, 구독이 없고, 쓰는 자리에 문지기가 있다');
  const read = (f) => fs.readFileSync(path.resolve(root, f), 'utf8');
  const CD = read('src/pages/ChiefDashboard.jsx'), FB = read('src/firebase.js');
  const i0 = CD.indexOf('<Fold id="ownermenu"'), i1 = CD.indexOf('</Fold>\n      )}', i0);
  const block = CD.slice(CD.lastIndexOf('{owner && (', i0), i1);
  ok(i0 > 0 && block.includes('{owner && (') && block.includes('<ShiftSnapPanel') && block.includes('<ActivityLogSection') && block.includes('onOpenStaffManager'), '소유자 메뉴 한 묶음 안에 «교대 시각 터미널 기준»·«활동 로그»·«인원 관리»가 같이 있다');
  ok((CD.match(/<ShiftSnapPanel/g) || []).length === 1 && (CD.match(/<ActivityLogSection/g) || []).length === 1, '패널·활동 로그는 대시보드에 한 곳뿐이다(흩어지지 않는다)');
  ok(/\['ownermenu', '👑 소유자 메뉴'\]/.test(CD) && !/\['actlog'/.test(CD), '바로가기 칩은 «👑 소유자 메뉴» 하나뿐이다(활동 로그 칩은 그 안으로)');
  //  구독 금지 — 노드 이름이 나오는 «코드 줄»(주석 제외)이 정확히 셋(get 둘 · set 하나)이고, 그 줄에 onValue·onChild* 가 없다(감사 2026-10-07: 변수 경유 구독도 막는다)
  const fbCode = FB.split('\n').map((l) => l.replace(/(^|[^:'"`])\/\/.*$/, '$1')).filter((l) => /term_snapshot/.test(l));
  ok(fbCode.length === 3 && fbCode.filter((l) => /\bget\(ref\(db/.test(l)).length === 2 && fbCode.filter((l) => /\bset\(ref\(db/.test(l)).length === 1 && !fbCode.some((l) => /onValue|onChild|onSnapshot/.test(l)) && !/fbSubscribeTermSnapshot/.test(FB + CD), `term_snapshot 은 구독하지 않는다 — firebase.js 안 코드 ${fbCode.length}곳(get 2 · set 1) 뿐(다운로드 비용 0)`);
  ok(!/(onValue|onChild\w*)\s*\(\s*(termRef|snapRef|r\b)/.test(FB.slice(FB.indexOf('4.11: 교대 시각'), FB.indexOf('export async function fbAddExtraContainer'))), '새 구간(4.11) 안에는 구독 호출 자체가 없다');
  const fnBody = (name) => { const s = FB.indexOf('export async function ' + name); return FB.slice(s, FB.indexOf('\n}\n', s)); };
  for (const f of ['fbGetTermSnapshot', 'fbRequestTermSnapshot', 'fbApplyTermSnapshot']) ok(/assertOwner\(/.test(fnBody(f)), `${f} 는 쓰는 자리에서 소유자만 통과시킨다(assertOwner)`);
  const ap = fnBody('fbApplyTermSnapshot');
  ok(/assertCanWork\(/.test(ap) && /snapApplyEntries\(/.test(ap) && /update\(ref\(db\), patch\)/.test(ap) && !/\bset\(/.test(ap) && !/remove\(/.test(ap), '반영은 «조회만» 문지기 + 한 벌 판정 + completed 추가(update)뿐이다 — set·remove 없음');
  const apCode = ap.replace(/\/\/[^\n]*/g, '');
  ok(/const base = `voyages\/\$\{voyageKey\}\/\$\{mode\}`/.test(apCode) && (apCode.match(/patch\[/g) || []).length === 1 && /patch\[`\$\{base\}\/completed\/\$\{cn\}`\]/.test(apCode) && !/termWork|bayWork|\/info/.test(apCode), '반영이 건드리는 곳은 completed/{컨} 하나뿐이다(patch 한 줄)');
  ok(/mode !== 'discharge' && mode !== 'loading'/.test(ap), '모드 값이 틀리면 던진다');
  const noCmt = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');   // 주석은 노드 이름을 말해도 읽는 코드가 아니다
  const others = ['src/pages/HomePage.jsx', 'src/pages/ChiefDashboard.jsx', 'src/App.jsx', 'src/utils.js'].map(read).map(noCmt).join('\n');
  ok(!/term_snapshot/.test(others), 'term_snapshot 노드 이름은 firebase.js 한 곳에만 있다(다른 화면이 몰래 읽지 않는다 — 주석 제외)');

  console.log('[3] 실제 화면 — 실데이터 스냅샷으로 패널을 그린다');
  if (!bundle) { ok(false, '번들 경로가 없다'); finish(); return; }
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  const errs = [];
  dom.window.addEventListener('error', (e) => errs.push(e.message));
  console.error = (...a) => { const s = a.map(String).join(' '); if (/Error/.test(s)) errs.push(s.split('\n')[0].slice(0, 200)); };
  dom.window.alert = () => {};
  dom.window.__snap = { _status: FX.status, _missed: { slot: '2026-10-07 17:30', at: FX.status.at + 600000 }, [FX.vk]: { loading: snap } };
  dom.window.__by = '김성일';   // 화면이 지금 로그인한 이름을 쓰는 자리로 넘긴다(하루 지나 비는 기기 편의값에 안 기댐 — 감사 2026-10-07)
  try { dom.window.eval(fs.readFileSync(bundle, 'utf8')); } catch (e) { errs.push('THROW: ' + e.message); }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const doc = dom.window.document;
  const txt = () => doc.body.textContent || '';
  const clickBy = (re) => { const b = [...doc.querySelectorAll('button')].find((x) => re.test((x.textContent || '').trim()) && !x.disabled); if (!b) return false; b.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); return true; };
  const calls = () => dom.window.__calls || [];
  const voy = (comp) => ({ [FX.vk]: { info: { ...FX.info }, loading: { completed: comp } } });
  dom.window.__applyN = snap.done; dom.window.__applyBasis = 'plan';
  //  작업 중인데 자료가 없는 배(DJCT) · 아직 시작 전인 배(NEXT)·계획 시작이 한참 뒤인 working 배(FAR)는 이름을 보이지 않는다
  const extra = () => ({
    DJCT_0225E: { info: { vsl: 'DJCT', voy_d: '0225E', pier: 'PCTC', terminalStatus: 'working', workStartAt: '2026-10-07 08:05' }, discharge: { completed: {} }, loading: { completed: {} } },
    NEXT_0002E: { info: { vsl: 'NEXT', voy_d: '0002E', pier: 'PCTC', terminalStatus: 'planned' }, discharge: { completed: {} } },
    FAR_0003E: { info: { vsl: 'FAR', voy_d: '0003E', pier: 'PCTC', terminalStatus: 'working', planDate: '2099-01-01 08:00 ~ 2099-01-02 08:00' }, discharge: { completed: {} } },
    DONE_0004E: { info: { vsl: 'DONE', voy_d: '0004E', pier: 'PCTC', terminalStatus: 'working', workStartAt: '2026-10-06 08:05', inspectorDone: true }, discharge: { completed: {} } },
  });
  dom.window.__renderPanel({ ...voy({}), ...extra() }); await wait(700);
  let t = txt();
  ok(dom.window.__getBy === '김성일', '읽을 때 로그인한 이름을 넘긴다(by)');
  ok(/작업 중인데 읽어 둔 자료가 없는 배 — DJCT 0225E/.test(t) && !/NEXT/.test(t) && !/FAR/.test(t) && !/DONE/.test(t) && !/ATPR 2645W \(수집기/.test(t), '작업 중인데 자료 없는 배(DJCT)만 이름이 뜬다 — 시작 전·먼 계획·끝난 배·자료 있는 ATPR 은 안 뜬다');
  ok(/17:30 슬롯은 수집기가 꺼져 있어 읽지 못했습니다/.test(t), '수집기가 놓친 슬롯이 마지막 읽기보다 나중이면 경고가 뜬다');
  ok(errs.length === 0, '렌더 중 오류 없음' + (errs.length ? ' — ' + [...new Set(errs)].slice(0, 2).join(' | ') : ''));
  ok(/ATPR 2645W/.test(t) && /선적/.test(t), '선박·항차·모드가 보인다 (ATPR 2645W 선적)');
  ok(new RegExp(`터미널 완료\\s*${snap.done}/${snap.n}`).test(t) && /앱 완료\s*0/.test(t) && new RegExp(`반영 가능\\s*${snap.done}대`).test(t), `터미널 완료 ${snap.done}/${snap.n} · 앱 완료 0 · 반영 가능 ${snap.done}대`);
  ok(/동방 계획 기준 · 완료 확정 아님/.test(t) && /마감텔리 선적 EDI 기준으로 합니다/.test(t), '동방 선적에 «계획 기준 · 완료 확정 아님»과 마감텔리 EDI 마무리 안내가 뜬다');
  ok(/마지막 읽기: 2026-10-07 22:00 슬롯/.test(t) && /성공 1건/.test(t) && /못 읽음 4건/.test(t), '맨 위에 마지막 읽기(슬롯·성공 1건·못 읽음 4건)가 뜬다');
  ok(/PCSZ_2631E 양하 — PCTC 터미널 세션이 없습니다/.test(t) && /DJCT_0225E 선적 — PCTC 터미널 세션이 없습니다/.test(t), '못 읽은 이유가 대상별로 적힌다(조용히 비우지 않는다)');
  ok(/06:30 · 17:30/.test(t) && /외부 현황 사이트 집계는 읽지 않습니다/.test(t) && /자동으로는 아무것도 들어가지 않고/.test(t), '안내 문구(06:30·17:30 · 트레드링스 제외 · 자동 반영 없음)');
  ok(clickBy(new RegExp(`선적 반영 ${snap.done}대`)), '[선적 반영] 단추를 눌렀다'); await wait(300);
  ok(/완료로 반영\?\s*\(동방 계획 기준\)/.test(txt()) && calls().length === 0, '한 번 더 묻는다(예/취소) — 아직 아무것도 안 썼다');
  ok(clickBy(/^취소$/), '[취소]'); await wait(200);
  ok(calls().length === 0 && new RegExp(`선적 반영 ${snap.done}대`).test(txt()), '취소하면 쓰지 않고 단추가 그대로다');
  ok(clickBy(new RegExp(`선적 반영 ${snap.done}대`)), '다시 눌렀다'); await wait(300);
  ok(clickBy(/^예$/), '[예]'); await wait(500);
  const ap2 = calls().filter((c) => c.fn === 'applySnap');
  ok(ap2.length === 1 && ap2[0].vk === FX.vk && ap2[0].mode === 'loading' && ap2[0].by === '김성일', '반영 호출이 정확히 한 번, 그 항차·선적·로그인한 이름(by)으로 나갔다');
  ok(/계획 기준 표식이 남았습니다/.test(txt()) && /건드리지 않았습니다/.test(txt()), '결과 안내(계획 기준 표식 · 검수원 기록 안 건드림)');
  //  앱 완료가 다 있으면 단추가 사라진다
  dom.window.__renderPanel(voy(Object.fromEntries(cns.map((c) => [c, { by: '박철민', at: 1 }])))); await wait(500);
  t = txt();
  ok(!/선적 반영/.test(t) && /앱 완료\s*124/.test(t) && /반영 가능\s*0대/.test(t), '앱 완료가 터미널과 같으면 반영 단추가 없다(반영 가능 0대)');
  //  일부만 앱에 있으면 그만큼 줄어든다
  dom.window.__renderPanel(voy(Object.fromEntries(cns.slice(0, 24).map((c) => [c, { by: '박철민', at: 1 }])))); await wait(500);
  ok(new RegExp(`반영 가능\\s*${snap.done - 24}대`).test(txt()) && clickBy(new RegExp(`선적 반영 ${snap.done - 24}대`)), `앱이 24대 찍었으면 반영 가능 ${snap.done - 24}대로 줄어든다`);
  //  지금 다시 읽기
  ok(clickBy(/지금 다시 읽기/), '[지금 다시 읽기]'); await wait(400);
  ok(calls().some((c) => c.fn === 'reqSnap' && c.by === '김성일') && /다시 읽기를 요청했습니다/.test(txt()), '수집기에 요청이 나가고(로그인한 이름 by) 안내가 뜬다');
  //  새로 고침 — 놓침이 마지막 읽기보다 옛것이면 경고가 사라지고, 못 읽음 건수는 잘린 목록이 아니라 n-okN 으로 센다
  dom.window.__snap._missed.at = FX.status.at - 1000;
  dom.window.__snap._status = { ...FX.status, n: 60, okN: 1, fail: FX.status.fail };
  ok(clickBy(/새로 고침/), '[새로 고침]'); await wait(500);
  ok(!/수집기가 꺼져 있어 읽지 못했습니다/.test(txt()), '옛 놓침 기록은 경고를 안 띄운다(그 뒤 정상으로 읽음)');
  ok(/못 읽음 59건/.test(txt()), '못 읽음 건수는 n-성공(59)으로 센다 — 목록이 40건에서 잘려도 건수는 맞다');
  //  앱에 없는 항차·빈 스냅샷
  dom.window.__renderPanel({}); await wait(400);
  ok(!/선적 반영/.test(txt()) && /읽어 둔 작업 선박이 없습니다/.test(txt()), '앱에 없는 항차는 보이지 않는다(반영할 곳이 없다)');
  ok(errs.length === 0, '끝까지 오류 없음' + (errs.length ? ' — ' + [...new Set(errs)].slice(0, 2).join(' | ') : ''));
  finish();
  function finish() { console.log(`\n${n - bad}/${n} 통과`); process.exit(bad ? 1 : 0); }
})().catch((e) => { console.error('시험 자체가 죽었다:', e); process.exit(1); });
