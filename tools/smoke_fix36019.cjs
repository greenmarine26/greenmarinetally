// 3.60-19 연막검사 — 다수결 6건(검수사 2026-09-25 12:22 «보안건만 보류하고 나머지는 클로드들의 제안대로 전부 승인») + M40 보관소 폴백 제거
//   V1 평택분 판정 utils.isPtk 한 벌(7곳) · V3 정본 삭제는 휴지통(archive_trash) 경유 강제 · V4 업로드 6함수 assertCanWork · V7 씰 구간 자릿수 · V8 판독 모델 404 폴백 · V9 자동 별칭 임계 0.9 · M40
//   firebase.js 는 실소스를 그대로 묶고 firebase/app·firebase/database 만 메모리 스텁(NODE_PATH)으로 갈아 끼운다 — 실제 쓰기 없음.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix36019_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
global.window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {}, location: { href: '' } };
global.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} }, createElement: () => ({ style: {} }) };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
global.fetch = () => Promise.reject(new Error('연막: 네트워크 없음'));
(async () => {
  try {
    //  메모리 RTDB 스텁
    const stubDir = path.join(TMP, 'node_modules', 'firebase'); fs.mkdirSync(stubDir, { recursive: true });
    fs.writeFileSync(path.join(stubDir, 'app.js'), 'exports.initializeApp = () => ({});\n');
    fs.writeFileSync(path.join(stubDir, 'storage.js'), 'exports.getStorage = () => ({}); exports.ref = () => ({}); exports.uploadBytes = async () => ({}); exports.uploadString = async () => ({}); exports.getDownloadURL = async () => ""; exports.deleteObject = async () => {}; exports.listAll = async () => ({ items: [] });\n');
    fs.writeFileSync(path.join(stubDir, 'messaging.js'), 'exports.getMessaging = () => ({}); exports.getToken = async () => ""; exports.deleteToken = async () => {}; exports.onMessage = () => {}; exports.isSupported = async () => false;\n');
    fs.writeFileSync(path.join(stubDir, 'database.js'), `
const T = { root: {} }; exports.__T = T;
const segs = (p) => String(p || '').split('/').filter(Boolean);
const getAt = (p) => { let o = T.root; for (const s of segs(p)) { if (o == null || typeof o !== 'object') return undefined; o = o[s]; } return o; };
const setAt = (p, v) => { const ss = segs(p); if (!ss.length) { T.root = v; return; } let o = T.root; for (const s of ss.slice(0, -1)) { if (o[s] == null || typeof o[s] !== 'object') o[s] = {}; o = o[s]; } if (v === null || v === undefined) delete o[ss[ss.length - 1]]; else o[ss[ss.length - 1]] = JSON.parse(JSON.stringify(v)); };
exports.getDatabase = () => ({});
exports.ref = (db, p) => ({ _p: p || '' });
exports.child = (r, p) => ({ _p: (r._p ? r._p + '/' : '') + p });
exports.get = async (r) => { const v = getAt(r._p); return { exists: () => v !== undefined && v !== null, val: () => (v === undefined ? null : JSON.parse(JSON.stringify(v))) }; };
exports.set = async (r, v) => { setAt(r._p, v); };
exports.update = async (r, obj) => { for (const [k, v] of Object.entries(obj || {})) setAt((r._p ? r._p + '/' : '') + k, v); };
exports.remove = async (r) => { setAt(r._p, null); };
exports.push = (r) => ({ _p: r._p + '/k' + Math.random().toString(36).slice(2, 8), key: 'k' });
exports.onValue = () => () => {}; exports.off = () => {}; exports.goOffline = () => {}; exports.goOnline = () => {};
`);
    const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
    fs.writeFileSync(e, `export { fbArchiveVoyageBeforeDelete, fbDeleteVoyage, fbDeleteSection, fbSaveEdiContainers, fbSaveListRecords, fbSaveXrayList, fbSaveEdiRaw, fbSetStowagePlan, fbSaveSectionData, fbListArchive } from "${ROOT}/src/firebase.js";\nexport { isPtk, isTransitByEdi } from "${ROOT}/src/utils.js";\nexport { setActiveWorkChoice } from "${ROOT}/src/workChoice.js";\nexport { parseEsealResponse } from "${ROOT}/src/esealPhoto.js";\n`);
    execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
    process.env.NODE_PATH = path.join(TMP, 'node_modules'); require('module').Module._initPaths();
    const DB = require(path.join(TMP, 'node_modules', 'firebase', 'database.js'));
    const M = require(o);

    console.log('■ V1 평택분 판정 한 벌 — DJCF 0151S 실자료(EDI 통과화물 24대가 리스트에도 있음)');
    {
      const fx = JSON.parse(src('tools/fixtures/ptk_djcf.json'));
      const edi = Object.values(fx.ediContainers || fx.edi || {}); const rec = fx.records || {};
      const cs = edi.map((c) => ({ ...c, _inList: !!rec[c.cn] }));
      const one = cs.filter((c) => M.isPtk(c, 'loading')).length;
      const old = cs.filter((c) => c._inList || /^KRPTK|^KRPYT|PYEONGTAEK/i.test(String(c.pol || ''))).length;
      ok(`utils.isPtk 선적 평택분 ${one} (종전 별첨·베이상세·요약카드 식 ${old} — 통과화물 ${old - one}대 제외)`, one < old && cs.filter((c) => M.isTransitByEdi(c) && c._inList).length === old - one, `${one} vs ${old}`);
      const S = (p) => src(p);
      ok('PrintableCargoPlanV2 — getMarkV2·matchPodC 가 utils.isPtk', /const ptk = _isPtkOne\(c, mode\)/.test(S('src/components/PrintableCargoPlanV2.jsx')) && /const matchPodC = \(c\) => _isPtkOne\(c, mode\)/.test(S('src/components/PrintableCargoPlanV2.jsx')));
      ok('PrintableBayDetail·BayPlan(iso403·isPtk)·VoyageSummaryCard·LoadingPlanEdit·planedit.entry·BayGridEditor 가 utils.isPtk', ['src/components/PrintableBayDetail.jsx', 'src/components/BayPlan.jsx', 'src/components/VoyageSummaryCard.jsx', 'src/components/LoadingPlanEdit.jsx', 'src/planedit.entry.jsx', 'src/components/BayGridEditor.jsx'].every((p) => /_isPtkOne\(/.test(S(p))));
      ok('지역 판정식 `c._inList || isPyeongtaekPort(c.pol)` 이 화면 소스에 남지 않았다', !['src/components/PrintableCargoPlanV2.jsx', 'src/components/PrintableBayDetail.jsx', 'src/components/BayPlan.jsx', 'src/components/LoadingPlanEdit.jsx', 'src/planedit.entry.jsx', 'src/components/BayGridEditor.jsx'].some((p) => /c\._inList \|\| isPyeongtaekPort\(c\.pol\)/.test(S(p))));
      ok('검수리스트·VGM(PrintHubModal)은 «리스트 등재 = 검수 대상» 그대로(다수결 V1=A · Q1 환적도 번호·수량 검수)', /if \(c\.cn && recMap\[c\.cn\]\) return true;/.test(S('src/components/PrintHubModal.jsx')));
    }

    console.log('■ V3 정본 삭제는 휴지통(archive_trash) 경유 — 되읽기 뒤에만 지운다');
    {
      const T = DB.__T; T.root = { voyages: { TEST_1E: { info: { vsl: 'TEST', voy: '1E' }, discharge: { ediContainers: { A: { cn: 'A' } }, completed: { A: { at: 1 } } }, loading: { records: { B: { cn: 'B' } } } } } };
      M.setActiveWorkChoice({ mode: 'work', key: 'TEST_1E' });
      await M.fbDeleteSection('TEST_1E', 'discharge');
      const trashKeys = Object.keys(T.root.archive_trash || {});
      ok('양하 삭제 → archive_trash 에 복사 1건(TEST_1E__discharge__…)', trashKeys.length === 1 && /^TEST_1E__discharge__\d+$/.test(trashKeys[0]), trashKeys.join(','));
      ok('복사본에 완료 기록·_deletedAt·_from 이 있다', trashKeys.length && T.root.archive_trash[trashKeys[0]].completed && T.root.archive_trash[trashKeys[0]].completed.A && T.root.archive_trash[trashKeys[0]]._deletedAt > 0 && T.root.archive_trash[trashKeys[0]]._from === 'voyages/TEST_1E/discharge');
      ok('정본의 양하는 지워지고 선적은 남는다', !T.root.voyages.TEST_1E.discharge && !!T.root.voyages.TEST_1E.loading);
      await M.fbDeleteVoyage('TEST_1E');
      const k2 = Object.keys(T.root.archive_trash || {});
      ok('항차 삭제 → 휴지통 2건, 정본 없음', k2.length === 2 && !T.root.voyages.TEST_1E && k2.some((k) => /^TEST_1E__\d+$/.test(k)));
      ok('보관소(archive)·선박 통계(ships)는 안 건드린다', !T.root.archive && !T.root.ships);
      T.root.voyages = { TEST_2E: { info: { vsl: 'T2' } } };
      await M.fbDeleteVoyage('TEST_2E', { archived: true });
      ok('{ archived: true }(보관소 저장 뒤)면 휴지통 복사 없이 지운다', Object.keys(T.root.archive_trash).length === 2 && !T.root.voyages.TEST_2E);
      //  복사 실패면 지우지 않는다 — set 을 잠시 막는다
      T.root.voyages = { TEST_3E: { info: { vsl: 'T3' } } };
      const _set = DB.set; DB.set = async () => { throw new Error('연막: 쓰기 실패'); };
      let threw = null; try { await M.fbDeleteVoyage('TEST_3E'); } catch (err) { threw = err; }
      DB.set = _set;
      ok('휴지통 복사가 실패하면 던지고 정본을 지우지 않는다', !!threw && !!T.root.voyages.TEST_3E, threw && threw.message);
      //  사진이 있는 항차 — 본문 set 에 photos 가 없고 사진은 건별 노드로(감사 C1)
      T.root.voyages = { TEST_4E: { info: { vsl: 'T4' }, photos: { p1: { data: 'x'.repeat(50), at: 1 }, p2: { data: 'y'.repeat(50), at: 2 } }, discharge: { completed: { A: { at: 1 } } } } };
      const setSizes = []; const _set2 = DB.set; DB.set = async (r, v) => { setSizes.push({ p: r._p, hasPhotos: !!(v && v.photos), bytes: JSON.stringify(v).length }); return _set2(r, v); };
      await M.fbDeleteVoyage('TEST_4E'); DB.set = _set2;
      const k4 = Object.keys(T.root.archive_trash).find((k) => k.startsWith('TEST_4E__'));
      ok('사진 항차 — 본문 set 페이로드에 photos 없음 · 사진 노드 2건 따로 · _photoCount 2', k4 && setSizes.some((x) => x.p === `archive_trash/${k4}` && !x.hasPhotos) && setSizes.filter((x) => x.p.startsWith(`archive_trash/${k4}/photos/`)).length === 2 && T.root.archive_trash[k4]._photoCount === 2 && T.root.archive_trash[k4].photos.p2.at === 2, JSON.stringify(setSizes));
      //  조회만이면 삭제도 던진다(감사 E1)
      T.root.voyages = { TEST_5E: { info: { vsl: 'T5' } } };
      M.setActiveWorkChoice({ mode: 'view', key: 'TEST_5E' });
      let vErr = null; try { await M.fbDeleteVoyage('TEST_5E'); } catch (x) { vErr = x; }
      ok('조회만 → fbDeleteVoyage 가 viewOnly 로 던지고 정본·휴지통 모두 그대로', !!vErr && vErr.viewOnly === true && !!T.root.voyages.TEST_5E && !Object.keys(T.root.archive_trash).some((k) => k.startsWith('TEST_5E__')));
      let aErr = null; try { await M.fbArchiveVoyageBeforeDelete('', 'TEST_5E', T.root.voyages.TEST_5E); } catch (x) { aErr = x; }
      ok('조회만 → 수석 완료 저장(fbArchiveVoyageBeforeDelete)도 맨 앞에서 막혀 보관소·통계 반쪽 쓰기가 없다(재감사 N1)', !!aErr && aErr.viewOnly === true && !T.root.archive && !T.root.ships && !T.root.tally_pending);
      M.setActiveWorkChoice({ mode: 'work', key: 'TEST_5E' });
      ok('HomePage 홈 삭제 확인창이 performDeleteSafe(실패를 화면에)를 부른다', /onConfirm=\{performDeleteSafe\}/.test(src('src/pages/HomePage.jsx')) && /fbDeleteVoyage\(key, \{ archived: true \}\)/.test(src('src/pages/HomePage.jsx')));
      ok('수석 완료 저장은 보관소 저장 뒤 { archived: true }', /fbDeleteVoyage\(row\.key, \{ archived: true \}\)/.test(src('src/pages/ChiefDashboard.jsx')));
    }

    console.log('■ V4 업로드 6함수 — 조회만이면 던진다, 작업자는 통과');
    {
      const T = DB.__T; T.root = { voyages: { V_1: { info: {} } } };
      M.setActiveWorkChoice({ mode: 'view', key: 'V_1' });
      const fns = [['fbSaveEdiContainers', () => M.fbSaveEdiContainers('V_1', 'discharge', { A: { cn: 'A' } })], ['fbSaveListRecords', () => M.fbSaveListRecords('V_1', 'discharge', { A: { cn: 'A' } })], ['fbSaveXrayList', () => M.fbSaveXrayList('V_1', { A: {} })], ['fbSaveEdiRaw', () => M.fbSaveEdiRaw('V_1', 'discharge', 'UNB+', {})], ['fbSetStowagePlan', () => M.fbSetStowagePlan('V_1', 'discharge', { a: 1 })], ['fbSaveSectionData', () => M.fbSaveSectionData('V_1', 'discharge', { _created: 1 })]];
      for (const [nm, f] of fns) { let err = null; try { await f(); } catch (x) { err = x; } ok(`조회만 → ${nm} 이 viewOnly 로 던진다`, !!err && err.viewOnly === true, err && err.message); }
      ok('조회만에서 정본에 아무것도 안 적혔다', !T.root.voyages.V_1.discharge);
      M.setActiveWorkChoice({ mode: 'work', key: 'V_1' });
      await M.fbSaveSectionData('V_1', 'discharge', { _created: 7 }); await M.fbSaveXrayList('V_1', { X: { seal: 'S' } });
      ok('작업자 → 통과(종전과 같음)', T.root.voyages.V_1.discharge._created === 7 && T.root.voyages.V_1.discharge.xrayList.X.seal === 'S');
    }

    console.log('■ M40 보관소 목록 — shallow 실패 시 전체 읽기 폴백 없음');
    {
      const T = DB.__T; T.root = { archive: { A_1: { big: 'x'.repeat(1000) } } };
      let err = null; try { await M.fbListArchive(); } catch (x) { err = x; }
      ok('fetch 가 죽으면 던진다(archiveList 표식) — archive 통째 get 으로 가지 않는다', !!err && err.archiveList === true, err && err.message);
      ok('firebase.js 에 `get(ref(db, \'archive\'))` 폴백이 없다', !/get\(ref\(db, 'archive'\)\)/.test(src('src/firebase.js')));
    }

    console.log('■ V7·V8·V9 정적·단위');
    {
      const vp = src('src/pages/VoyagePage.jsx');
      ok('씰 구간 저장 — from/to 자릿수 다르면 거부 + 앞 0 안내(예 036601)', /r\.from\.length !== r\.to\.length/.test(vp) && /앞 0 까지 그대로 치세요/.test(vp) && /placeholder="036601"/.test(vp));
      const ep = src('src/esealPhoto.js');
      ok('엠티실 판독 — 프리뷰 모델 404 면 기본 모델로 한 번 더(_fallbackModel 표식)', /res\.status === 404/.test(ep) && /_fallbackModel = true/.test(ep) && /aiCall\('esealPhoto', esealRequestBody\(base64\), \{ timeoutMs: 120000 \}\)/.test(ep));
      ok('모달이 폴백 사실을 안내한다', /_fallbackModel/.test(src('src/components/EsealPhotoModal.jsx')));
      const arr = M.parseEsealResponse({ candidates: [{ content: { parts: [{ text: '{"items":[{"no":1,"cn":"TCNU1234567","seal":"036601"}]}' }] } }] });
      arr._fallbackModel = true;
      ok('parseEsealResponse 결과(배열)에 표식을 얹어도 줄 자료는 그대로', Array.isArray(arr) && arr.length === 1 && arr.some((r) => r) && arr._fallbackModel === true);
      ok('미르 자동 별칭 임계 0.9', /rec\.confidence >= 0\.9\) _learn\(/.test(src('src/mir.js')) && !/rec\.confidence >= 0\.7\) _learn\(/.test(src('src/mir.js')));
      const vp2 = src('src/pages/VoyagePage.jsx');
      ok('업로드 핸들러(EDI·X-RAY)가 try/catch 로 «처리 중…» 을 남기지 않는다 · 덱플랜 catch 가 viewOnly 를 삼키지 않는다 · 섹션 추가는 섹션을 먼저', /const handleEdiUpload = async \(files\) => \{ try \{ await _handleEdiUploadCore/.test(vp2) && /const handleXrayUpload = async \(files\) => \{ try \{ await _handleXrayUploadCore/.test(vp2) && /if \(e0 && e0\.viewOnly\) throw e0;/.test(vp2) && vp2.indexOf('try { await fbSaveSectionData(voyageKey, otherMode') < vp2.indexOf('await fbUpdateVoyageInfo(voyageKey, patch);\n              setOtherVoyInput'));
      ok('APP_VERSION 이 3.60-19 이상(판 주석에 3.60-19 절이 있다)', /APP_VERSION = 'TallyOne 3\.60-19'|\s3.60-19 \*\*/.test(src('src/utils.js')));
    }

    console.log(`\n3.60-19 연막검사: ${n - bad}/${n}`);
    process.exit(bad ? 1 : 0);
  } catch (err) {
    console.error('연막검사 자체 실패:', err && err.stack || err);
    process.exit(1);
  }
})();
