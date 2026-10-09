// 4.02 콘앱 연막검사 — ①미르 «총 무브수·X-RAY 조별·갱 분배·교대 브리핑» 이 콘앱 모양 ctx 에서도 검수앱과 같은 답인가(실항차 SWMM 2609N·ATPR·DJCT)
//   ②콘 첫 화면(카고플랜 양하|선적 가로)·실시간 화면 안내 문구·콘 타이밍 빈 상태 문구·미르 사전 받기가 소스에 배선돼 있는가.
//
//  왜 있는가 — 검수사 2026-10-04 «검수앱과 콘앱에 공통되는 질문이라면 답은 같아야 한다 — 미르 하나로 통합 했는데 답이 다르면 통합이 안되었다는 이야기».
//  콘앱은 미르에 항차의 EDI 묶음(ediContainers)을 안 넘기고 컨 행(containers)만 넘긴다. 그래서 «EDI 가 아직 없어 무브수를 셀 수 없어요» 로 막혔다.
//  기대값은 코드가 낸 값이 아니라 검수앱 모양 ctx 의 같은 질문 답이다(두 모양이 한 글자도 안 달라야 한다 — «겹치는 배» 줄만 콘앱에 다른 배가 없어 빠진다).
//  사용: node tools/smoke_cone402.cjs <번들.cjs> <저장소 루트>
const fs = require('fs');
const path = require('path');
const BUNDLE = process.argv[2];
const ROOT = process.argv[3] || path.resolve(__dirname, '..');
if (!BUNDLE) { console.error('사용법: node tools/smoke_cone402.cjs <번들.cjs> [루트]'); process.exit(1); }
global.window = global.window || {};
global.document = global.document || { createElement: () => ({}) };
const M = require(path.resolve(BUNDLE));
const fx = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8'));
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let fail = 0;
const ok = (c, m, extra) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c || extra === undefined ? '' : '  → ' + extra)); if (!c) fail++; };

const pad2 = (s) => String(s || '').padStart(2, '0');
//  콘앱 _ediRowOf 와 같은 모양 — 자리 없는 행은 콘 계산 행이 아니다.
const rowOf = (c) => { const iso = String(c.iso || c.tp || ''); const hasPos = !(c.bay == null || c.tier == null || c.bay === '' || c.tier === '');
  return { bay: hasPos ? String(c.bay) : '', row: hasPos ? pad2(c.row) : '', tier: hasPos ? pad2(c.tier) : '', size: c.size ? String(c.size) : (iso[0] === '2' ? '20' : '40'), cn: String(c.cn || '').toUpperCase(), iso, fe: c.fe || '', op: c.op || '', wt: c.wt || 0, temp: c.temp != null ? c.temp : null, reefer: !!c.rf, dg: !!c.dg, fr: !!c.fr, tk: !!c.tk, ot: !!(c.ot || c.oog), oog: !!c.oog, pol: c.pol || null, pod: c.pod || null }; };
const ptkRows = (voy, m) => { const ed = (voy[m] || {}).ediContainers || {}; const rows = []; for (const k in ed) { const r = rowOf(ed[k] || {}); if (!r.bay || !r.tier) continue; if (m === 'discharge' ? M.isPyeongtaekPort(r.pod) : M.isPyeongtaekPort(r.pol)) rows.push(r); } return rows; };
const allRows = (voy, m) => { const ed = (voy[m] || {}).ediContainers || {}; const o = {}; for (const k in ed) { const r = rowOf(ed[k] || {}); if (r.bay && r.tier) o[r.cn] = r; } return o; };

//  콘앱 selectVoyage 와 같은 합치기(평택분에 없는 시프팅 컨을 _shift 로 얹는다) + mirAsk 와 같은 ctx 모양(항차에 ediContainers 없음 · shiftN)
function ctxPair(key, voy) {
  const info = voy.info; const vsl = String(info.vsl || '').toUpperCase();
  const ss = M.shiftCnSetOf(key, voy);
  const dRows = ptkRows(voy, 'discharge'), lRows = ptkRows(voy, 'loading');
  const dAll = allRows(voy, 'discharge'), lAll = allRows(voy, 'loading');
  const hd = new Set(dRows.map((r) => r.cn)), hl = new Set(lRows.map((r) => r.cn));
  for (const cn of ss) { if (!hd.has(cn) && dAll[cn]) dRows.push({ ...dAll[cn], _shift: true }); if (!hl.has(cn) && lAll[cn]) lRows.push({ ...lAll[cn], _shift: true }); }
  const cs = M.toMirContainers(dRows, 'discharge').concat(M.toMirContainers(lRows, 'loading'));
  const dd = voy.discharge || {}, ll = voy.loading || {};
  const coneVoy = { info, reports: {}, restowList: voy.restowList || null, discharge: { completed: dd.completed || {}, records: dd.records || {}, xrayList: dd.xrayList || {}, held: dd.held || {} }, loading: { completed: ll.completed || {}, records: ll.records || {}, held: ll.held || {} } };
  const cone = { app: 'cone', containers: cs, cone: { rows: [], dischRows: dRows, stowRows: lRows }, accepted: true, shiftN: ss.size, mode: 'discharge', modeLabel: '양하', info, voyage: coneVoy, vsl, vslFull: info.vslFull || '', pier: info.pier || '', voyageKey: key, records: { discharge: coneVoy.discharge.records, loading: coneVoy.loading.records } };
  const tcs = M.toMirContainers(ptkRows(voy, 'discharge'), 'discharge').concat(M.toMirContainers(ptkRows(voy, 'loading'), 'loading'));
  const tally = { app: 'tally', containers: tcs, accepted: true, mode: 'discharge', modeLabel: '양하', info, voyage: voy, voyages: { [key]: voy }, vsl, vslFull: info.vslFull || '', pier: info.pier || '', voyageKey: key };
  return { cone, tally, vsl, ss };
}
const ask = (q, ctx) => { try { return String(M.answerOne(q, ctx)); } catch (e) { return 'ERR ' + e.message; } };
//  콘앱엔 다른 배 정보가 없어 «겹치는 배» 줄만 빠진다 — 그 줄만 지우고 비교한다.
const noOverlap = (t) => t.split('\n').filter((l) => !/^겹치는 배 없음\.$/.test(l)).join('\n');

console.log('① SWMM 2609N — 양하 223 + 선적 191 · X-RAY 1 · 실데이터(2026-10-04 08:30 보관소)');
const swmm = fx('cone402_swmm_real.json');
window.__fbShipBayDict = fx('cone402_swmm_dict.json');
const S = ctxPair('SWMM_2609N', swmm);
const mvT = ask('SWMM 총 무브수 몇이야', S.tally), mvC = ask('SWMM 총 무브수 몇이야', S.cone);
ok(!/EDI 가 아직 없어/.test(mvC), '콘앱 «총 무브수» 가 «EDI 가 아직 없어» 로 막히지 않는다', mvC.split('\n')[0]);
ok(mvC === mvT, '콘앱 «총 무브수» = 검수앱 답 한 글자도 같다', `${mvT.split('\n')[0]}  ↔  ${mvC.split('\n')[0]}`);
ok(/무브/.test(mvC) && /트윈/.test(mvC), '답이 무브와 트윈 수를 말한다 — 대수만 던지지 않는다', mvC.split('\n')[0]);
const xrT = ask('SWMM 엑스레이 주간 몇 대 가능해', S.tally), xrC = ask('SWMM 엑스레이 주간 몇 대 가능해', S.cone);
ok(!/베이매트릭스가 없어/.test(xrC), '콘앱 X-RAY 조별이 «베이매트릭스가 없어» 로 막히지 않는다', xrC.split('\n')[0]);
ok(xrC === xrT, '콘앱 «엑스레이 주간 몇 대 가능해» = 검수앱 답(주간·야간 배분·속도 25/30·작업시작)', `${xrT.split('\n')[0]}  ↔  ${xrC.split('\n')[0]}`);
const gsT = ask('SWMM 갱 2개로 분배', S.tally), gsC = ask('SWMM 갱 2개로 분배', S.cone);
ok(gsC === gsT && /무브/.test(gsC), '콘앱 «갱 2개로 분배» = 검수앱 답', `${gsT.split('\n')[0]}  ↔  ${gsC.split('\n')[0]}`);
const fsT = ask('SWMM 최초 양하 어디부터야', S.tally), fsC = ask('SWMM 최초 양하 어디부터야', S.cone);
ok(fsC === fsT, '콘앱 «최초 양하 어디부터야» = 검수앱 답', `${fsT.split('\n')[0]}  ↔  ${fsC.split('\n')[0]}`);
const sbT = noOverlap(ask('SWMM 교대 브리핑 해줘', S.tally)), sbC = noOverlap(ask('SWMM 교대 브리핑 해줘', S.cone));
ok(/교대 브리핑/.test(sbC) && !/【양하】/.test(sbC), '콘앱 «교대 브리핑» 은 콘 브리핑이 아니라 교대 브리핑이 나온다', sbC.split('\n')[0]);
ok(sbC === sbT, '콘앱 «교대 브리핑» = 검수앱 답(겹치는 배 줄만 빼고 한 글자도 같다)', `\n${sbT}\n↔\n${sbC}`);
//  시프팅분(_shift)을 콘앱이 얹어도 교대 브리핑 «자료» 줄(EDI·리스트 수)은 검수앱과 같아야 한다.
//  라이브 MCSC 638N 실측: 콘앱 «양하 EDI 323 · 리스트 277 ⚠ 46건 차이» ↔ 검수앱 «EDI 277 · 리스트 277» — 시프팅 행이 EDI 수에 섞였다.
//  SWMM 에는 시프팅이 없어 실행 행 4+4개를 _shift 로 복제해 얹는다(콘앱 selectVoyage 가 얹는 모양 그대로 — 행 모양만 실데이터).
{
  const mk = (rows, tag) => rows.slice(0, 4).map((r, i) => ({ ...r, cn: `ZZSH${tag}000000${i}`, _shift: true }));
  const d2 = S.cone.cone.dischRows.concat(mk(S.cone.cone.dischRows, 'D')), l2 = S.cone.cone.stowRows.concat(mk(S.cone.cone.stowRows, 'L'));
  const cone2 = { ...S.cone, containers: M.toMirContainers(d2, 'discharge').concat(M.toMirContainers(l2, 'loading')), cone: { rows: [], dischRows: d2, stowRows: l2 }, shiftN: 8 };
  const line = (t) => (String(t).split('\n').find((l) => /^자료 —/.test(l)) || '(자료 줄 없음)');
  const lT = line(sbT), lC = line(ask('SWMM 교대 브리핑 해줘', cone2));
  ok(lC === lT && !/차이/.test(lC), '시프팅 행(_shift)이 얹혀도 «자료» 줄이 검수앱과 같다 — EDI 수에 안 섞인다', `${lT}  ↔  ${lC}`);
}
//  감사(2026-10-04): 콘앱 전용 처리가 app 으로 안 걸러져 «검수앱 · EDI 없이 리스트만 있는 항차» 의 종전 답이 바뀌었다 —
//  갱 분배·최초 양하가 «베이매트릭스를 만들라» 로, 교대 브리핑 자료 줄이 «EDI 0 ⚠ EDI 없음» → «EDI 185» 로. 검수앱 ctx(app tally)는 4.01 답 그대로여야 한다.
{
  const vNo = JSON.parse(JSON.stringify(swmm));
  for (const m of ['discharge', 'loading']) if (vNo[m]) delete vNo[m].ediContainers;
  const t0 = { ...S.tally, voyage: vNo, voyages: { SWMM_2609N: vNo } };
  const l0 = (t) => (String(t).split('\n').find((l) => /^자료 —/.test(l)) || '(자료 줄 없음)');
  const g0 = ask('SWMM 갱 2개로 분배', t0), f0 = ask('SWMM 최초 양하 어디부터야', t0), m0 = ask('SWMM 총 무브수 몇이야', t0), b0 = l0(ask('SWMM 교대 브리핑 해줘', t0));
  ok(/EDI 가 아직 없어 갱 분배/.test(g0) && !/베이매트릭스/.test(g0), '검수앱·EDI 없음 항차 «갱 분배» 는 종전 답(EDI 가 아직 없어)', g0.split('\n')[0]);
  ok(/EDI 가 아직 없어 갱 분배/.test(f0), '검수앱·EDI 없음 항차 «최초 양하» 도 종전 답', f0.split('\n')[0]);
  ok(/EDI 가 아직 없어 무브수/.test(m0), '검수앱·EDI 없음 항차 «총 무브수» 도 종전 답', m0.split('\n')[0]);
  ok(/EDI 0/.test(b0) && /EDI 없음/.test(b0), '검수앱·EDI 없음 항차 교대 브리핑 «자료» 줄이 «EDI 0 ⚠ EDI 없음» 그대로', b0);
}
const sh = ask('SWMM 브리핑', S.cone);
ok(/【양하】/.test(sh), '그냥 «브리핑» 은 종전대로 콘 브리핑(양하·선적·콘)이 나온다 — 교대 브리핑만 길을 풀었다', sh.split('\n')[0]);

console.log('② ATPR 2644E — 양하만 있는 배(선적 자료 없음) · DJCT 0225E — 선적 예약 칸');
const atpr = fx('eta401_atpr_real.json');
const AP = ctxPair('ATPR_2644E', atpr);
const aT = ask('ATPR 총 무브수 몇이야', AP.tally), aC = ask('ATPR 총 무브수 몇이야', AP.cone);
ok(/230무브/.test(aC) && aC === aT, 'ATPR 콘앱 = 검수앱 = 230무브(손으로 센 값 — 트윈 39 · 한 대씩 191)', aC.split('\n')[0]);
const aSb = noOverlap(ask('ATPR 교대 브리핑 해줘', AP.tally)) === noOverlap(ask('ATPR 교대 브리핑 해줘', AP.cone));
ok(aSb, 'ATPR 교대 브리핑이 선적 쪽 «EDI 0 ⚠ EDI 없음» 줄 없이 검수앱과 같다(자료 없는 쪽은 없는 쪽으로 둔다)');
const djct = fx('eta401_djct_real.json');
const DJ = ctxPair('DJCT_0225E', djct);
const dT = ask('DJCT 총 무브수 몇이야', DJ.tally), dC = ask('DJCT 총 무브수 몇이야', DJ.cone);
ok(/최대 461무브 · 최소 404무브/.test(dC) && dC === dT, 'DJCT 콘앱 = 검수앱 = 최대 461 · 최소 404무브(선적 예약 칸은 콘앱 행에 isBooking 표식이 없고 번호 __BOOK_ 로 알아본다 — 실제 _ediRowOf 모양)', dC.split('\n')[0]);

console.log('③ 배선 — 콘 첫 화면 · 실시간 화면 안내 · 콘 타이밍 빈 문구 · 미르 사전 · 버전');
const C = rd('public/cone.html');
ok(/window\.__CONEV='ConeOne 2\.6[0123456](-\d\d)?'/.test(C), '콘앱 판 번호 ConeOne 2.60~2.65 계열');
ok(/async function cargoPlanPropsV2\(mode\)/.test(C) && /async function openCargoPlanV2\(mode\)[\s\S]{0,900}cargoPlanPropsV2\(mode\)/.test(C), '한 쪽 카고플랜도 같은 재료 함수(cargoPlanPropsV2)를 쓴다 — 재료가 두 벌로 갈리지 않는다');
ok(/async function openCargoPlanDuo\(key0\)[\s\S]{0,2000}Promise\.all\(\[cargoPlanPropsV2\('discharge'\), cargoPlanPropsV2\('loading'\)\]\)[\s\S]{0,700}ConeCargoPlan\.openDuo\(/.test(C), '첫 화면은 양하·선적 재료를 둘 다 만들어 ConeCargoPlan.openDuo 로 연다');
ok(/key !== state\.voyageKey \|\| TW\.on/.test(C), '그 사이 다른 배를 골랐으면 앞 배 도면을 안 띄운다');
const auto = C.slice(C.indexOf('ctApplySwap();   // 2.44'), C.indexOf('ctApplySwap();   // 2.44') + 5200);
ok(/openCargoPlanDuo\(key\)/.test(auto) && !/twOpen\(''\)/.test(auto), '배를 고르면 카고플랜(양하|선적)이 먼저 열리고 실시간 화면은 자동으로 안 열린다');
ok(/data-tw=""[^>]*>⚡ 실시간/.test(C), '실시간 화면은 콘 타이밍 카드의 «⚡ 실시간» 단추로 여전히 열린다');
const WHY1 = '검수원의 실작업이 있어야 보이는 화면입니다', WHY2 = '검수원이 검수앱에서 작업을 직접 찍어야 호기별 화면이 나타납니다.';
ok(C.includes(WHY1) && C.includes(WHY2), '실시간 화면 안내 — 제목 «검수원의 실작업이 있어야 보이는 화면입니다» + 본문(검수사 2026-10-04 확정 문구)');
ok(!/동방·카토스 실적은 아직 앱이 자동으로 읽지 않습니다/.test(C), '«동방·카토스 실적은 아직 앱이 자동으로 읽지 않습니다.» 문장은 뺐다(검수사 2026-10-04 08:33)');
ok(/_noWork = !TW\.wait && !r\.finished && !rest\.rest && !hhm && !!CT\.at/.test(C), '안내는 실적이 없을 때만(작업 완료·쉬는 시간·마지막 실적이 있으면 안 붙는다)');
ok(!/터미널 연결이 풀린 것입니다/.test(C) && !/아직 동방 실적이 없습니다/.test(C), '콘 타이밍 빈 문구에서 원인을 단정하던 두 문장(PCTC «연결이 풀린 것» · PNCT «동방 실적»)을 걷어냈다');
ok(/아직 실적이 없습니다 — 검수원이 검수앱에서 작업을 직접 찍어야 호기별 카드가 나타납니다\./.test(C), '콘 타이밍 빈 문구는 세 부두가 같은 뜻');
ok(/\(!window\.__fbShipBayDict \|\| !Object\.keys\(window\.__fbShipBayDict\)\.length\) && \/무브\|트윈/.test(C) && /window\.__fbShipBayDict = await fbFetchBayDict\(\)/.test(C.slice(C.indexOf('async function mirAsk(q)'), C.indexOf('async function mirAsk(q)') + 6000)), '미르는 무브·트윈·X-RAY·브리핑 질문에서 베이사전을 받아 둔다(카고플랜이 먼저 안 열렸어도)');
const E = rd('src/coneCargoPlan.entry.jsx');
ok(/function openDuo\(data\)/.test(E) && /window\.ConeCargoPlan = \{ open, openDuo, close, isOpen \}/.test(E), '번들이 openDuo·isOpen 을 내보낸다');
ok(/lockLandscape\(\);[\s\S]{0,200}_root\.render\(<DuoBoundary onClose=\{close\}><DuoHost/.test(E) && /unlockOrientation\(\);/.test(E.slice(E.indexOf('function close('), E.indexOf('function close(') + 600)), '열 때 가로 잠금을 걸고(되는 기기만) 닫을 때 반드시 푼다');
ok(/portrait \? dy : dx/.test(E) && /r\.height : r\.width\) > \(portrait \? window\.innerHeight : window\.innerWidth\) - 4/.test(E) && /'touchmove', onMove, \{ capture: true, passive: false \}/.test(E) && /e\.cancelable\) e\.preventDefault\(\)/.test(E), '세로로 들면 도면이 돌아 있으므로 밀기 방향도 같이 돈다 · 확대해서 끌 때는 안 넘긴다');
ok(/key=\{mode\}[^>]*duo=\{duo\}/.test(E) || /<PrintableCargoPlanV2 key=\{mode\} flipBays \{\.\.\.props\} duo=\{duo\}/.test(E), '카고플랜 본체는 한 번에 한 쪽만 세운다(싱글턴 질의 보호)');
ok(/html,body\{overscroll-behavior:none\}\.cpv2-overlay\{overscroll-behavior:none/.test(E), '첫 화면이 떠 있는 동안 브라우저 뒤로 가기·당겨서 새로고침 제스처를 막는다(오른쪽 밀기가 콘앱을 나가게 하지 않는다)');
//  감사(2026-10-04) 반영 — 레이스·닫기·죽음·뒤로가기·사전 캐시·밀기·입력창
ok(/key === state\.voyageKey\)\{\s*CT\._autoOpened = true;[\s\S]{0,260}openCargoPlanDuo\(key\)/.test(C), 'R1 자동 열기는 이 사이클의 배(key)가 지금 고른 배일 때만 열고, 그 key 를 넘긴다(배 바꾸는 도중 반쯤 찬 state 로 안 뜬다)');
ok(/if\(key !== state\.voyageKey \|\| TW\.on \|\| TW\.wait \|\| \(window\.ConeCargoPlan\.isOpen && window\.ConeCargoPlan\.isOpen\(\)\)\) return false;/.test(C), 'R12 받는 동안 배를 바꿨거나 실시간 화면을 열었거나 도면이 이미 떠 있으면 도면을 안 띄운다');
ok(/state\.voyageKey=voyageKey;\s*\/\/[^\n]*\n\s*try\{ if\(window\.ConeCargoPlan && window\.ConeCargoPlan\.isOpen && window\.ConeCargoPlan\.isOpen\(\)\) window\.ConeCargoPlan\.close\(\); \}catch/.test(C), 'R2 배를 고르면 떠 있던 카고플랜(앞 배 도면·가로 잠금)을 먼저 닫는다');
ok(/if\(!res\.ok\)\{ _fbBayDictFailAt=Date\.now\(\); console\.warn\('\[콘앱\] 베이사전 받기 실패 HTTP '\+res\.status/.test(C) && /catch\(e\)\{ _fbBayDictFailAt=Date\.now\(\); console\.warn\('\[콘앱\] 베이사전 받기 실패 — 60초 뒤/.test(C) && /if\(Date\.now\(\) - _fbBayDictFailAt < 60000\) return \{\};/.test(C) && !/_fbBayDict=\{\}/.test(C), 'R5 베이사전 받기 실패는 캐시하지 않는다(약신호 한 번에 세션 내내 «베이 매트릭스가 없습니다» 가 굳지 않게) — 실패 직후 60초만 다시 안 부른다');
ok(/if\(!fbDict \|\| !Object\.keys\(fbDict\)\.length\) return dictBays;/.test(C), 'N1 사전을 못 받아 비었으면 «이 배는 사전 없음» 으로 굳히지 않는다(_bayDictKey 를 세우기 전에 돌려보낸다)');
ok(/if\(!window\.__fbShipBayDict \|\| !Object\.keys\(window\.__fbShipBayDict\)\.length\)\{[\s\S]{0,260}CT\._autoOpened = false;\s*return false;/.test(C), 'N3 사전을 못 받았으면 첫 화면을 열지 않고 다음 주기에 다시 받는다(통신 실패를 미등록으로 오진하지 않게)');
ok(/const _d = await res\.json\(\);[\s\S]{0,260}if\(!_d \|\| typeof _d !== 'object' \|\| !Object\.keys\(_d\)\.length\)\{ _fbBayDictFailAt=Date\.now\(\);[^\n]*return \{\}; \}\s*_fbBayDict = _d;/.test(C), 'N8 200 인데 빈 사전(노드가 비었을 때)도 캐시하지 않는다 — 실패와 같이 60초 뒤 다시 받는다');
ok(/async function openCargoPlanV2\(mode\)\{[\s\S]{0,1200}catch\(err\)\{\s*cpClearModuleSpinner\(\);\s*\/\/[^\n]*\n\s*alert\('카고플랜을 열지 못했습니다/.test(C), 'N9 수동 카고플랜 단추도 모듈을 못 받아 실패하면 «불러오는 중…» 표시를 치운다');
ok(/function cpClearModuleSpinner\(\)/.test(C) && /catch\(err\)\{\s*cpClearModuleSpinner\(\);/.test(C), 'N4 모듈을 못 받아 실패해도 «불러오는 중…» 표시를 치운다');
ok(/_ra\.querySelector\('\.loading'\) && \/카고플랜 모듈 불러오는 중\/\.test\(_ra\.textContent\)\) _ra\.innerHTML=''/.test(C) && /await loadCargoPlanV2\(\);[\s\S]{0,260}cpClearModuleSpinner\(\);/.test(C), 'R13 모듈을 처음 받을 때 남는 «불러오는 중…» 표시를 도면이 뜨면 치운다');
const E2 = rd('src/coneCargoPlan.entry.jsx');
ok(/class DuoBoundary extends React\.Component/.test(E2) && /<DuoBoundary onClose=\{close\}><DuoHost/.test(E2) && /componentDidCatch\(err, info\)[\s\S]{0,400}this\.props\.onClose\(\)/.test(E2), 'R3 도면 그리기가 죽으면 스스로 닫는다(가로 잠금·isOpen 이 안 남는다)');
ok(/window\.history\.pushState\(\{ coneDuo: 1 \}, ''\)/.test(E2) && /addEventListener\('popstate', _popFn\)/.test(E2) && /raiseBackGuard\(\);\s*_root\.render/.test(E2) && /if \(!o\.keepGuard\) dropBackGuard\(!o\.fromPop\)/.test(E2), 'R4 폰 뒤로가기로 첫 화면이 닫힌다(history 칸을 쌓고 popstate 에서 닫고, 단추로 닫으면 되감는다)');
ok(/if \(!pg\) return !document\.querySelector\('\.cpv2-duo-empty, \.cpv2-overlay-fallback'\)/.test(E2), 'R6 «자료 없음» 화면에서도 밀어서 돌아올 수 있다(도면 없음 ≠ 확대 중)');
ok(/closest\('button, input, textarea, select, #mirSheet'\)/.test(E2) && /\/\^\(INPUT\|TEXTAREA\|SELECT\)\$\/\.test\(t\.tagName\)/.test(E2), 'R7 입력창·미르 시트 안의 밀기와 방향키는 도면을 안 넘긴다');
ok(/!\(SHIFT_BRIEF_RE\.test\(q\) && !\/콘\/\.test\(q\)\)/.test(rd('src/mir.js')), 'R9 «교대 브리핑 콘 포함» 처럼 콘을 같이 물으면 콘 갈래가 답한다');
const V2 = rd('src/components/PrintableCargoPlanV2.jsx');
ok(/const cnt = sd => \(\(sd && sd\.ediRows\) \|\| \[\]\)\.length/.test(C), '단추 옆 대수는 콘앱이 세는 수(평택분+시프팅 ediRows) — 전체 EDI 대수가 아니다');
ok(/duo = null/.test(V2) && /\{duo && <CargoDuoPills duo=\{duo\} \/>\}/.test(V2), '카고플랜 본체의 duo 는 받을 때만 그린다 — 안 받으면 한 픽셀도 안 바뀐다');
//  단추 묶음 자리 — 콘앱 아래 줄(불편신고·새로고침 왼쪽 · 미르 고양이 오른쪽 14~62px)에 가려지지 않게. 가로=아래 여백의 고양이 왼쪽, 세로(돌아간 화면)=위 여백. 한쪽 비었을 때 화면도 같은 자리.
ok(/duo\s*\?\s*\(rotated \? \{ top: 8, right: 8 \} : \{ bottom: 8, right: 68 \}\)\s*:\s*\(rotated \? \{ bottom: 8, right: 8 \} : \{ top: 8, right: 8 \}\)/.test(V2), '카고플랜 단추 묶음: 일반(검수앱)은 종전 자리 그대로, duo 만 가로=아래·고양이 왼쪽 / 세로=위');
ok(/const barPos = portrait \? \{ top: 8, right: 8 \} : \{ bottom: 8, right: 68 \}/.test(E) && /<\/div>\s*<div className="cpv2-noprint" style=\{\{ position: 'fixed', \.\.\.barPos/.test(E), '«자료 없음» 화면도 단추를 돌리지 않고 도면 쪽과 같은 자리에 둔다');
let leak = [];
for (const f of fs.readdirSync(path.join(ROOT, 'src'), { recursive: true })) { if (!/\.jsx?$/.test(f) || /coneCargoPlan\.entry|PrintableCargoPlanV2|CargoDuoPills/.test(f)) continue; try { if (/<PrintableCargoPlanV2[^>]*\bduo=/.test(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'))) leak.push(f); } catch (e) { /* 폴더 항목 */ } }
ok(leak.length === 0, '검수앱 쪽에서 PrintableCargoPlanV2 에 duo 를 넘기는 곳이 없다', leak.join(','));
const U = rd('src/utils.js');
ok(/APP_VERSION = 'TallyOne 4\.(0[23456789]|1[012345])(-\d\d)?'/.test(U) && /^TallyOne 4\.(0[23456789]|1[012345])(-\d\d)?$/.test(M.APP_VERSION), 'TallyOne 4.02~4.13(-NN)');
ok(/(보조기능에 설치 QR|터미널 본선 현황|콘앱 첫 화면|RZOR 카고플랜|RZOR X-RAY 선내위치|RZOR 선내위치|미르가 작업은 진행 중인데|미르가 작업 중 앱 입력이 없으면|실사 미르가 왔습니다|PORT-MIS 를 수집기가 30분마다 직접 가져옵니다|선적 리스트에 공컨 개정판이 오면|해치커버 장수|작업 선박 자료만|폰 선박 선택 화면|트윈 무게를 총중량으로|양하 순서를 호기별로|해치커버 보고 직전|수석 화면에 아침 6시30분|수석 소유자 메뉴에 마감적용|수석 소유자 메뉴에 마감적용이|화면을 밝게 해도|날짜 말을 알아듣|24번 홀드 콘 몇 개 남았어|시프팅 근거|출력 센터 카고플랜이 콘앱처럼|미르가 «파손됐고|리퍼 몇 대는 풀 리퍼만)/.test(M.APP_NOTE) && !/['\/]/.test(M.APP_NOTE.replace(/^'|'$/g, '')) && M.APP_NOTE.length < 120, '업데이트 문구는 짧고 작은따옴표·슬래시가 없다', M.APP_NOTE);
const H = rd('src/data/helpData.js');
ok(/양하\(왼쪽\)·선적\(오른쪽\) 카고플랜이 가로 화면으로 먼저/.test(H) && /\[⚡ 실시간\] 화면/.test(H), '매뉴얼(콘앱 절)이 새 첫 화면과 실시간 화면 안내를 말한다');
console.log(fail ? `\n✗ ${fail}건 실패` : '\n✓ 4.02 콘앱 연막검사 전부 통과');
process.exit(fail ? 1 : 0);
