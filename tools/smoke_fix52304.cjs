// 5.23-04 연막검사 — 다른 AI 진단(2026-11-25)에서 실측 재현된 수리 일곱을 실소스와 XTPG 550E 실자료(RTDB GET)로 잰다.
//   ① 검색줄 미르 «X-RAY 몇대» 0대 ② 선박 실 정책 TNJP 두 번(34척) ③ 일반 물음에 배 되묻기 ④ 추천 단추 배 코드 두 번
//   ⑤ 브리핑 출항 시각 한 벌 ⑥ 검수 리스트 좁은 창 칸 겹침 ⑦ 목록 탭 우측 칼럼 · 장비 창 닫기 · 미르 닫기 그림
//   ⚠ 기대값은 앱 함수가 아니라 픽스처 원자료에서 이 파일이 직접 센다.
//   node tools/smoke_fix52304.cjs <저장소 루트>
process.env.TZ = 'Asia/Seoul';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {}, __mirLexicon: {}, __mirLexiconWrite() {} };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
global.fetch = () => Promise.reject(new Error('연막: 네트워크 없음'));
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : os.tmpdir(), 'fix52304_'));
const pack = (src, name) => { const o = path.join(TMP, name + '.cjs'); execSync(`npx esbuild "${src}" --bundle --platform=node --format=cjs --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' }); return require(o); };
const M = pack(path.join(ROOT, 'src/mirCore.entry.js'), 'mircore');
const SP = pack(path.join(ROOT, 'src/shipPolicyCore.js'), 'spcore');
const IL = pack(path.join(ROOT, 'src/inspectionList.js'), 'insp');
const CH = pack(path.join(ROOT, 'src/chiefAnswers.js'), 'chief');
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/fix52304_xtpg550e.json'), 'utf8'));
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0, bad = 0;
const T = (c, name, d = '') => { n += 1; if (c) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${d ? ' — ' + String(d).replace(/\n/g, ' ⏎ ').slice(0, 300) : ''}`); } };

console.log('① 검색줄 미르 X-RAY 셈');
const V = FX.voyage, VK = FX.voyageKey;
const xr = Object.keys(V.discharge.xrayList || {});
const edi = Object.values(V.discharge.ediContainers);
const want = edi.filter((r) => xr.includes(r.cn)).length;
T(want === 1 && xr[0] === 'TGCU2380547', `독립 셈 — X-RAY 리스트 ${xr.length}대 · EDI 안 ${want}대`);
//  화면 카드가 받는 컨(EDI 병합본 — _xray 없음)을 카드와 같은 방식으로 표식한 뒤 엔진에 넘긴다
const raw = edi.map((r) => ({ ...r, ...(V.discharge.records[r.cn] || {}), _mode: 'discharge', _ptk: true }));
const ask = (cs) => { const a = M.answerOneRaw('X-RAY 몇대야?', { app: 'tally', voyageKey: VK, voyage: V, info: V.info, mode: 'discharge', containers: cs, vsl: 'XTPG', _trace: {} }); return String(a || ''); };
T(/X-RAY: 0대/.test(ask(raw)), '고치기 전 재현 — 표식 없는 컨이면 0대', ask(raw));
const marked = raw.map((c) => (V.discharge.xrayList[c.cn] ? { ...c, _xray: true } : c));
T(new RegExp(`X-RAY: ${want}대`).test(ask(marked)), `표식 붙인 컨이면 ${want}대`, ask(marked));
const VP = src('src/pages/VoyagePage.jsx');
T((VP.match(/<InlineAnswerCard [^>]*xrayMap=\{xrayMap\}/g) || []).length === 2, '검색줄 카드 두 곳(양하·LOLO)이 xrayMap 을 받는다');
T(/function InlineAnswerCard\(\{ ask, setAsk, containers: rawContainers, xrayMap = null/.test(VP) && /xrayMap\[c\.cn\] && !c\._xray \? \{ \.\.\.c, _xray: true \}/.test(VP), '카드가 칩과 같은 xrayMap 으로 표식');

console.log('② 선박 실 정책 — 코드·별칭으로 한 척');
const saved = FX.shipPolicies;
const keysOld = Object.keys({ ...SP.DEFAULT_SHIP_POLICIES, ...saved });
const all = SP.shipPolicyListOf(saved);
const verifyNames = Object.values(all).filter((p) => p.mode === 'verify').map((p) => p.code || p.name);
T(keysOld.length === Object.keys(all).length + 1, `척수 ${keysOld.length} → ${Object.keys(all).length}`);
T(verifyNames.filter((x) => x === 'TNJP').length === 1, `«엠티실 확인» 에 TNJP 한 번 (${verifyNames.join('·')})`);
T(all.TNJP && all.TNJP.name === 'TEN JUPITER' && all.TNJP.mode === saved.TNJP.mode && !all['TEN JUPITER'], '열쇠는 저장본(TNJP) · 이름은 기본표 · 값은 저장본');
T(/shipPols && shipPols\[k\]\) \? k : \(pol\.name \|\| k\)/.test(src('src/pages/HomePage.jsx')), '[수정] 은 저장본 열쇠로 다시 저장');
T(SP.matchShipPolicy('TNJP', saved) && SP.matchShipPolicy('TEN JUPITER', saved), '정책 판정(matchShipPolicy) 그대로');

console.log('③ 일반 물음 — 배를 되묻지 않음 · ④ 추천 단추');
const allV = { [VK]: V };
const flat = M.flattenVoyages(allV);
const fab = (q) => { M._mirThreadReset && M._mirThreadReset(); const a = M.answerOneRaw(q, { app: 'tally', voyages: allV, flat, containers: [], countFallback: true, accepted: false, modeChoice: 'both', _trace: {} }); return a == null ? null : String(a); };
for (const q of ['평택항 부두 안내', '리퍼 컨테이너 검수 주의사항', '리퍼 검수 요령']) T(!M.isShipAskText(fab(q) || ''), `«${q}» 배를 안 되묻는다`, fab(q));
for (const q of ['리퍼 몇 대', 'X-RAY 위치', '브리핑', '리퍼 온도 알려줘', '리퍼 온도 안내해줘', 'X-RAY 대상 무엇', '평택 양하 안내', '선적 리퍼 안내']) T(M.isShipAskText(fab(q) || '') || /브리핑/.test(fab(q) || ''), `«${q}» 는 종전대로(배를 묻거나 브리핑)`, fab(q));
const chips = M.shipPickChips('어느 배 말씀인지', 'XTPG 리퍼 몇 대', allV, Date.now());
T(chips.length && chips.every((c) => !/XTPG XTPG/.test(c)) && chips.some((c) => c === 'XTPG 리퍼 몇 대'), `추천 단추에 배 코드 한 번 (${chips.join(' / ')})`);

console.log('⑤ 브리핑 출항 시각');
const CA = src('src/chiefAnswers.js');
T(/departAtOf\(\{ planEta: _pEta/.test(CA) && !/f\(pm\.etd\) \? `출항/.test(CA), 'answerShipOverview 는 departAtOf 한 벌 · PORT-MIS etd 를 바로 쓰지 않음');
const pfOk = { nextArr: '2026-11-25 08:30', nextDep: '2026-11-25 22:00' };
const ov = CH.answerShipOverview({ info: { ...V.info, planDate: '2026-11-25 10:00 ~ 2026-11-25 22:00' } }, 'XTPG', { eta: '2026-11-24 06:00', etd: '2026-11-24 15:00' }, null, pfOk);
T(/출항: 11-25 22:00 도선/.test(String(ov)) && !/11\/24 15:00/.test(String(ov)), '도선 22:00 이 PORT-MIS 최초 신고(11/24 15:00)를 이긴다', ov);
T((src('src/mir.js').match(/_pfOf\(c, /g) || []).length === 3, '미르 세 곳이 도선 줄을 넘긴다');
const ov2 = CH.answerShipOverview({ info: { ...V.info, planDate: '2026-11-25 10:00 ~ 2026-11-25 22:00' } }, 'XTPG', { eta: '2026-11-25 09:00', etd: '2026-11-25 21:00' }, null, null);
T(/출항: 11-25 21:00 신고/.test(String(ov2)), '도선이 없으면 PORT-MIS 신고(작업창 안)', ov2);

console.log('⑥ 검수 리스트·X-RAY 리스트 — 좁은 창 맞춤');
const doc = IL.buildInspectionListDoc(raw, 'discharge', V.info, [], {});
T(/@media screen \{ \.content \{ min-width: 200mm; \} \}/.test(doc.html) && /c\.style\.zoom=/.test(doc.html) && /@media print \{ \.content \{ zoom: 1 !important/.test(doc.html), '화면만 종이 폭 유지 + 창 폭 맞춤 · 인쇄는 원래 크기');
T(!/✕ 닫기/.test(src('src/inspectionList.js')), '출력 창 닫기 단추에 글꼴 의존 기호 없음');
T(/fitToWindowHtml\('\.fitwrap', '261mm'\)/.test(src('src/inspectionList.js')), 'X-RAY 리스트(가로)도 맞춤');

console.log('⑦ 목록 탭 칼럼 · 장비 창 · 미르 닫기');
T(edi.every((r) => r._mode === 'discharge'), `실자료 — EDI ${edi.length}대 모두 _mode 가 붙어 있다(종전 조건이면 늘 모달)`);
T(/&& !\(\(detailC\._mode === 'discharge' \|\| detailC\._mode === 'loading'\) && detailC\._mode !== mode\)/.test(VP) && !/&& !detailC\._mode;/.test(VP), '같은 모드 컨은 우측 칼럼, 다른 모드만 모달');
const HD = src('src/components/Header.jsx');
T(/_panelWasRef\.current === detailC\) setDetailC\(null\); \}, \[tab, mode\]\)/.test(VP) && /useLayoutEffect\(\(\) => \{ if \(_panelWasRef/.test(VP), '칼럼에 연 상세는 탭·모드를 바꾸면 닫는다');
T(/data-equip-close="1"/.test(HD) && /e\.key === 'Escape'\) setEquipOpen\(false\)/.test(HD), '장비 번호 선택 창 — [닫기] · Esc');
T(/data-mir-close="1"[^>]*><X /.test(src('src/components/MirFab.jsx')), '미르 닫기 단추는 선 그림');

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { console.warn('임시 폴더 정리 실패', e.message); }
console.log(`\n${bad ? '✘' : '✔'} 5.23-04 연막검사 ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
