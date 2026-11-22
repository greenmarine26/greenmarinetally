// 5.19 연막검사 — MOVINS 없는 배의 MFN(수집기 2.54 가 터미널 양하 계획 = EDI 평택일 때 올린 mfnList)과 검수리스트 «세관 신고분 뒤 MFN» 순서. 실자료 MCAT 645N(계획 258 · 세관 201 · MFN 57)
//   검수사 2026-11-22 07:20 «목록엔 없으나 양하대상일떄 MFN리스트를 만들고 양하 리스트에 추가 해야 합니다» · 07:21 «검수리스트를 만들떈 세관 신고 201개 뒤에 MFN 리스트를 이어서 만들어야 합니다»
//   실행 — node tools/smoke_mfn519.cjs [저장소 루트]
'use strict';
process.env.TZ = 'Asia/Seoul';
const fs = require('fs'), path = require('path'), os = require('os');
const { execSync } = require('child_process');
const ROOT = path.resolve(process.argv[2] || process.cwd());
let n = 0, bad = 0;
const ok = (name, cond, d = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${d ? ' — ' + String(d).slice(0, 300) : ''}`); } };
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {}, __mirLexicon: {}, __mirLexiconWrite() {} };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 이미 있음 */ }
global.fetch = () => Promise.reject(new Error('no net'));
console.warn = () => {};
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : os.tmpdir(), 'fx519_'));
const out = path.join(TMP, 'u.cjs');
execSync(`npx esbuild "${path.join(ROOT, 'tools/smoke_mfn519_entry.js')}" --bundle --platform=node --format=cjs --outfile="${out}" --loader:.js=jsx --jsx=automatic --log-level=error --alias:firebase/app=./tools/stub_fbdb_mem.js --alias:firebase/database=./tools/stub_fbdb_mem.js --alias:firebase/storage=./tools/stub_fbdb_mem.js`, { cwd: ROOT, stdio: 'inherit' });
const U = require(out);
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mfn519_mcat645n.json'), 'utf8'));
const voy = { key: 'MCAT_645N', info: fx.info, discharge: fx.discharge };
const D = U.ptkDischargeUnitsOf(voy, new Set());
ok('양하 유닛 258 = 세관 201 + MFN 57 · 추가분 0', D.set.size === 258 && D.listSet.size === 201 && D.mfn.size === 57 && D.extra.size === 0, `${D.set.size} ${D.listSet.size} ${D.mfn.size} ${D.extra.size}`);
ok('대수 문구 «(리스트 201 + MFN 57)»', U.mfnNote(D.mfn.size, D.set.size, D.extra.size) === '(리스트 201 + MFN 57)', U.mfnNote(D.mfn.size, D.set.size, D.extra.size));
const noList = { ...voy, discharge: { ...voy.discharge, mfnList: null } };
const D0 = U.ptkDischargeUnitsOf(noList, new Set());
ok('mfnList 가 없으면 종전대로 추가분 57(앱이 혼자 MFN 으로 짐작하지 않는다)', D0.mfn.size === 0 && D0.extra.size === 57, `${D0.mfn.size} ${D0.extra.size}`);
const pack = U.mfnPackOf(voy.discharge.mfnList, 'MCAT_645N', fx.info, voy);
ok('MFN 출력 57줄 · 머리 평택 258 · 리스트 201', pack.rows.length === 57 && pack.head.ptk === 258 && pack.head.list === 201, `${pack.rows.length} ${pack.head.ptk} ${pack.head.list}`);
ok('MFN 출력 — 57줄 모두 선내 위치(EDI 자리)', pack.rows.every((r) => /^\d{2,3}-\d{2}-\d{2}$/.test(String(r.pos || ''))), pack.rows.slice(0, 3).map((r) => r.cn + ' ' + r.pos).join(' · '));
ok('MFN 출력 — BEAU6295729 선내 위치 26-05-10(화면 샘플과 같음)', (pack.rows.find((r) => r.cn === 'BEAU6295729') || {}).pos === '26-05-10', (pack.rows.find((r) => r.cn === 'BEAU6295729') || {}).pos);
//  검수리스트 — 출력 센터처럼 행을 만들고 표식(_mfn)을 단다
const rows = [...D.set].map((cn) => U.markDischargeUnit({ ...(fx.discharge.records[cn] || {}), ...(fx.discharge.ediContainers[cn] || {}), cn }, D));
ok('행 표식 — _mfn 57', rows.filter((c) => c._mfn).length === 57);
const doc = U.buildInspectionListDoc(rows, 'discharge', fx.info, [], { appendix: false });
const html = String(doc.html || doc);
const first = html.split('<div class="ipage"')[1] ? html : html;
const trs = (html.match(/<tr[\s\S]*?<\/tr>/g) || []).filter((t) => /<td/.test(t));
//  «이어서» 판(첫 판)만 — 장 나누기 판들은 data-split 로 갈린다. 첫 판의 줄을 순서대로 읽는다.
const cont = html.split(/data-split="(?!cont)/)[0];
const ctrs = (cont.match(/<tr[\s\S]*?<\/tr>/g) || []).filter((t) => /<td/.test(t));
const cns = ctrs.map((t) => (/([A-Z]{4}\d{7})/.exec(t.replace(/<[^>]*>/g, ' ')) || [])[1] || (/mfnbar/.test(t) ? 'BAR' : ''));
const bar = cns.indexOf('BAR');
const mfnSet = new Set(rows.filter((c) => c._mfn).map((c) => c.cn));
const before = cns.slice(0, bar).filter((x) => /^[A-Z]{4}\d{7}$/.test(x)), after = cns.slice(bar + 1).filter((x) => /^[A-Z]{4}\d{7}$/.test(x));
ok('이어서 판 — MFN 막대가 한 번 · 앞 201대는 전부 세관 신고분 · 뒤 57대는 전부 MFN', bar > 0 && cns.filter((x) => x === 'BAR').length === 1 && before.length === 201 && before.every((x) => !mfnSet.has(x)) && after.length === 57 && after.every((x) => mfnSet.has(x)), `bar ${bar} before ${before.length} after ${after.length}`);
ok('막대 글 «MFN — 화물 있으나 적하목록 없음 (세관 신고 201대 뒤) · 57대»', /MFN — 화물 있으나 적하목록 없음 \(세관 신고 201대 뒤\)[\s\S]*?57대/.test(ctrs[bar] || ''), (ctrs[bar] || '').replace(/<[^>]*>/g, ' '));
const noAfter = ctrs.slice(bar + 1).map((t) => (/<td[^>]*>\s*(\d+)\s*<\/td>/.exec(t) || [])[1]).filter(Boolean).map(Number);
ok('MFN 순번은 1부터 다시', noAfter[0] === 1 && noAfter[noAfter.length - 1] === 57, noAfter.slice(0, 3).join(',') + '…' + noAfter.slice(-1));
ok('MFN 줄 비고에 «MFN»', ctrs.slice(bar + 1).every((t) => />MFN</.test(t)));
const docNo = U.buildInspectionListDoc([...D0.set].map((cn) => U.markDischargeUnit({ ...(fx.discharge.records[cn] || {}), ...(fx.discharge.ediContainers[cn] || {}), cn }, D0)), 'discharge', fx.info, [], { appendix: false });
ok('MFN 이 없으면 막대도 «MFN» 비고도 없다(종전 그대로)', !/mfnbar/.test(String(docNo.html || docNo)) && !/>MFN</.test(String(docNo.html || docNo)));
//  감사(중1) — 선사별 판(선사 둘 이상)에서도 MFN 은 모든 선사 뒤 한 블록
const rows2 = rows.map((c, i) => (!c._mfn && i % 3 === 0 ? { ...c, op: 'ONE' } : { ...c, op: c.op || 'MAE' }));
const doc2 = U.buildInspectionListDoc(rows2, 'discharge', fx.info, [], { appendix: false }) || {};
const carPart = String((doc2.splits && doc2.splits.carrier) || '');   // 선사별 판은 splits.carrier(선사가 둘 이상일 때만)
const carTrs = (carPart.match(/<tr[\s\S]*?<\/tr>/g) || []);
const carCns = carTrs.map((t) => (/([A-Z]{4}\d{7})/.exec(t.replace(/<[^>]*>/g, ' ')) || [])[1]).filter(Boolean);
const firstM = carCns.findIndex((x) => mfnSet.has(x));
ok('선사별 판 — MFN 57대가 모든 선사 세관분 뒤 한 덩어리 · 막대 «MFN — 화물 있으나 적하목록 없음»', carCns.length >= 258 && firstM === carCns.length - 57 && carCns.slice(firstM).every((x) => mfnSet.has(x)) && /MFN — 화물 있으나 적하목록 없음/.test(carPart), `len ${carCns.length} firstM ${firstM}`);
const heads = (carPart.match(/class="phead[^"]*"[^>]*>[\s\S]*?<\/div>/g) || []).join(' ') + ' ' + carPart;
ok('선사별 판 — 쪽 머리줄·막대에 undefined 없음 · MFN 블록 57대', !/undefined/.test(carPart) && /MFN — 화물 있으나 적하목록 없음[\s\S]{0,80}57대/.test(carPart));
const docOne = U.buildInspectionListDoc(rows, 'discharge', fx.info, [], { appendix: false }) || {};
ok('선사가 하나(MAE)뿐이면 선사별 단추는 꺼진 채(MFN 블록은 선사로 세지 않음)', docOne.splits && docOne.splits.carrier == null);
//  5.19-01 — 머스크(리퍼 체크 안 하는 배): 별첨 리퍼 구역 없음 · «온도 미신고» 없음 (검수사 2026-11-22 08:41)
const dRf = String((U.buildInspectionListDoc(rows, 'discharge', fx.info, [], { appendix: true }) || {}).html || '');
const dNo = String((U.buildInspectionListDoc(rows, 'discharge', fx.info, [], { appendix: true, noReefer: true }) || {}).html || '');
ok('종전(리퍼 체크하는 배) — 별첨에 리퍼 리스트 구역(rflist)이 있다', /class="ilist rflist"/.test(dRf));
ok('머스크 — 별첨 리퍼 구역 없음 · «온도 미신고» 없음', !/class="ilist rflist"/.test(dNo) && !/>[^<]*온도 미신고/.test(dNo), (dNo.match(/\[별첨\][^<]*/) || [''])[0]);
ok('머스크 — 본문 대수는 그대로(세관 201 + MFN 57)', (dNo.match(/[A-Z]{4}\d{7}/g) || []).length >= 258);
//  감사 보강 — 합성 두 대: 풀 리퍼 온도 없음(«온도 미신고» 가르기) · 풀 리퍼 + 위험물(별첨에 남음)
const synRf = { ...rows.find((c) => !c._mfn), cn: 'TSTU1000001', iso: '45R1', fe: 'F', rf: true, tmp: '', temp: '', dg: false };
const synDg = { ...rows.find((c) => !c._mfn), cn: 'TSTU1000002', iso: '45R1', fe: 'F', rf: true, tmp: '-18', dg: true, dgc: '3', un: '1993' };
const rowsS = [...rows, synRf, synDg];
const sOld = String((U.buildInspectionListDoc(rowsS, 'discharge', fx.info, [], { appendix: true }) || {}).html || '');
const sNew = String((U.buildInspectionListDoc(rowsS, 'discharge', fx.info, [], { appendix: true, noReefer: true }) || {}).html || '');
ok('종전 — 온도 없는 풀 리퍼에 «온도 미신고»', /TSTU1000001[\s\S]{0,1500}?온도 미신고/.test(sOld));
ok('머스크 — 같은 컨에 «온도 미신고» 없음 · 위험물 리퍼(TSTU1000002)는 별첨에 남고 온도 -18 은 표기', !/TSTU1000001[\s\S]{0,1500}?온도 미신고/.test(sNew) && /\[별첨\] 특수화물 1대/.test(sNew) && (sNew.match(/TSTU1000002/g) || []).length >= 2 && /-18/.test(sNew));
const hC = U.generateMfnListHTML(pack.rows, pack.head), hF = U.generateMfnFieldHTML(pack.rows, pack.head);
ok('수석·일반 양식 HTML 에 «선내위치» 열과 26-05-10', />선내위치</.test(hC) && />선내위치</.test(hF) && /26-05-10/.test(hC) && /26-05-10/.test(hF));
console.log(`${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
