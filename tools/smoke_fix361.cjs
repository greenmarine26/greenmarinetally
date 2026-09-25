// 3.61 연막검사 — 구조 판 B(사진은 항차 밖 photos/{항차}) : 쓰기 3함수가 새 자리+색인에, 읽기는 새 자리→옛 자리, 삭제는 둘 다, 화면 소비처가 photosAll·photoIndex 를 쓴다.
//   firebase.js 는 실소스를 묶고 firebase/app·database·storage·messaging 만 메모리 스텁(NODE_PATH)으로 — 실제 쓰기 없음.
//   firebase.js 는 실소스를 묶고 firebase/app·database·storage·messaging 만 메모리 스텁(NODE_PATH)으로 — 실제 쓰기 없음.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'fix361_'));
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
    fs.writeFileSync(e, `export { fbAddPhotoReport, fbSaveISO403Photo, fbDeleteISO403Photo, fbGetDamagePhoto, fbPromotePendingDamage, fbClearAllReports, fbDeleteVoyage, fbSubscribeVoyagePhotos, photoMetaOf } from "${ROOT}/src/firebase.js";\nexport { setActiveWorkChoice } from "${ROOT}/src/workChoice.js";\nexport { buildDamage } from "${ROOT}/src/tallyReport.js";\n`);
    execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
    process.env.NODE_PATH = path.join(TMP, 'node_modules'); require('module').Module._initPaths();
    const DB = require(path.join(TMP, 'node_modules', 'firebase', 'database.js'));
    const M = require(o);
    const S = (p) => src(p);
    const T = DB.__T; T.root = { voyages: { TEST_1E: { info: { vsl: 'TEST', voy: '1E' } } } };
    M.setActiveWorkChoice({ mode: 'work', key: 'TEST_1E' });
    const big = 'data:image/jpeg;base64,' + 'A'.repeat(5000);

    console.log('■ 쓰기 — 사진 본체는 photos/{항차}/{ts}, 항차 노드에는 색인(메타)만');
    const ts1 = await M.fbAddPhotoReport('TEST_1E', big, { type: 'damage', cn: 'ABCU1234567', detailPhoto: big, damageTypes: ['DENT'], by: '김' });
    const body1 = T.root.photos && T.root.photos.TEST_1E && T.root.photos.TEST_1E[ts1];
    const idx1 = T.root.voyages.TEST_1E.photoIndex && T.root.voyages.TEST_1E.photoIndex[ts1];
    ok('데미지 사진 본체 photos/TEST_1E/{ts} 에 data·detailPhoto 그대로', !!body1 && body1.data === big && body1.detailPhoto === big && body1.type === 'damage');
    ok('색인 voyages/TEST_1E/photoIndex/{ts} 에는 data·detailPhoto 없음 + hasData/hasDetail', !!idx1 && !('data' in idx1) && !('detailPhoto' in idx1) && idx1.hasData === true && idx1.hasDetail === true && idx1.cn === 'ABCU1234567');
    ok('항차 노드 voyages/TEST_1E/photos 에는 안 쓴다(옛 자리)', !T.root.voyages.TEST_1E.photos);
    ok('damageIndex 색인은 종전대로', !!(T.root.damageIndex && T.root.damageIndex.ABCU1234567 && T.root.damageIndex.ABCU1234567[ts1]));
    await new Promise((r) => setTimeout(r, 2));
    const ts2 = await M.fbSaveISO403Photo('TEST_1E', 'discharge', 'ABCU1234567', big, '김');
    ok('규격 사진도 새 자리+색인(type iso403)', T.root.photos.TEST_1E[ts2] && T.root.photos.TEST_1E[ts2].type === 'iso403' && T.root.voyages.TEST_1E.photoIndex[ts2] && !T.root.voyages.TEST_1E.photoIndex[ts2].data);
    ok('records/ediContainers 마킹은 종전대로(iso403_photo_ts)', T.root.voyages.TEST_1E.discharge.records.ABCU1234567.iso403_photo_ts === ts2);
    await M.fbPromotePendingDamage('TEST_1E', 'ZZZU7654321', [{ ts: 777, cn: 'ZZZU7654321', status: 'waiting', type: 'damage', data: big }]);
    ok('예약 데미지 승격도 새 자리+색인(promotedFrom)', T.root.photos.TEST_1E['777'] && T.root.photos.TEST_1E['777'].promotedFrom === 'pendingDamage' && T.root.voyages.TEST_1E.photoIndex['777'] && !T.root.voyages.TEST_1E.photoIndex['777'].data);

    console.log('■ 읽기 — 새 자리 → 옛 voyages → 옛 archive');
    T.root.voyages.TEST_1E.photos = { 100: { ts: 100, type: 'damage', cn: 'OLDU0000001', data: 'old-live' } };
    T.root.archive = { TEST_0E: { photos: { 50: { ts: 50, type: 'damage', cn: 'OLDU0000002', data: 'old-arch' } } } };
    ok('새 자리 우선', (await M.fbGetDamagePhoto('TEST_1E', ts1)).data === big);
    ok('옛 voyages 자리 폴백', (await M.fbGetDamagePhoto('TEST_1E', 100)).data === 'old-live');
    ok('옛 archive 자리 폴백', (await M.fbGetDamagePhoto('TEST_0E', 50)).data === 'old-arch');
    ok('없으면 null', (await M.fbGetDamagePhoto('TEST_1E', 99999)) === null);
    ok('photoMetaOf 는 data·detailPhoto 를 뺀다', (() => { const m = M.photoMetaOf({ ts: 1, cn: 'A', data: 'x', detailPhoto: 'y', note: 'n' }); return m && !('data' in m) && !('detailPhoto' in m) && m.note === 'n' && m.hasData && m.hasDetail; })());

    console.log('■ 삭제 — 새 자리·색인 둘 다');
    await M.fbDeleteISO403Photo('TEST_1E', 'discharge', 'ABCU1234567', ts2);
    ok('규격 사진 취소 → photos/{항차}/{ts}·photoIndex/{ts} 없음', !(T.root.photos.TEST_1E && T.root.photos.TEST_1E[ts2]) && !(T.root.voyages.TEST_1E.photoIndex && T.root.voyages.TEST_1E.photoIndex[ts2]));
    await M.fbClearAllReports('TEST_1E');
    ok('보고 전체 삭제 → photos/{항차} 통째·photoIndex·옛 photos 전부 없음', !T.root.photos.TEST_1E && !T.root.voyages.TEST_1E.photoIndex && !T.root.voyages.TEST_1E.photos);

    console.log('■ 감사 M-2·N-1 — 본체·색인은 한 update, 항차 삭제는 새 자리 사진을 휴지통으로');
    ok('_writePhoto 가 다중 경로 update 한 번(set 두 번 아님)', /await update\(ref\(db\), \{\s*\[`\$\{PHOTO_ROOT\}\/\$\{voyageKey\}\/\$\{ts\}`\]: item,\s*\[`voyages\/\$\{voyageKey\}\/photoIndex\/\$\{ts\}`\]: photoMetaOf\(item\),/.test(S('src/firebase.js')));
    T.root = { voyages: { TEST_3E: { info: { vsl: 'T3' } } }, photos: { TEST_3E: { 5: { ts: 5, type: 'damage', cn: 'ABCU1234567', data: big } } } };
    M.setActiveWorkChoice({ mode: 'work', key: 'TEST_3E' });
    await M.fbDeleteVoyage('TEST_3E');
    const tk = Object.keys(T.root.archive_trash || {}).find((k) => /^TEST_3E__\d+$/.test(k));
    ok('항차 삭제 → photos/TEST_3E 본체가 휴지통 photos 로 옮겨지고 원자리는 비움', !!tk && T.root.archive_trash[tk].photos && T.root.archive_trash[tk].photos['5'] && T.root.archive_trash[tk].photos['5'].data === big && !(T.root.photos && T.root.photos.TEST_3E));

    console.log('■ 마감텔리 DAMAGE·미르 — 색인(메타)으로 움직인다');
    const v = { photoIndex: { 1: { ts: 1, type: 'damage', cn: 'ABCU1234567', damageTypes: ['DENT'], damageParts: ['DOOR'], mode: 'discharge' } }, discharge: { ediContainers: { ABCU1234567: { cn: 'ABCU1234567', iso: '22G1', fe: 'F' } } } };
    const dm = M.buildDamage(v, [{ cn: 'ABCU1234567', iso: '22G1', fe: 'F' }], []);
    ok('buildDamage 가 photoIndex 만으로 DM-IN 1행', dm && Array.isArray(dm.dmIn) && dm.dmIn.length === 1, JSON.stringify(dm && dm.dmIn && dm.dmIn.length));
    ok('mir.js 가 photoIndex 도 본다', /v\.photoIndex \|\| v\.photos/.test(S('src/mir.js')));
    ok('VoyagePage — fbSubscribeVoyagePhotos 구독 + photosAll 을 briefCtx·publishMirCtx 에, voyageUi(사진 합본)를 SearchPanel·BayViewWork 에', /fbSubscribeVoyagePhotos\(voyageKey, setExtPhotos\)/.test(S('src/pages/VoyagePage.jsx')) && (S('src/pages/VoyagePage.jsx').match(/photos: photosAll,/g) || []).length === 2 && (S('src/pages/VoyagePage.jsx').match(/voyage=\{voyageUi\}/g) || []).length === 2);
    ok('SearchPanel — 종전 그대로 voyage?.photos 6곳(안쪽 컴포넌트가 제 prop 을 본다 — 스코프 검사)', (S('src/components/SearchPanel.jsx').match(/voyage\?\.photos \|\| null/g) || []).length === 6 && !/photosAll/.test(S('src/components/SearchPanel.jsx')));
    ok('ISO403PhotoModal — 사진 읽기는 fbGetDamagePhoto 한 벌(직접 get 없음)', /fbGetDamagePhoto\(voyageKey, c\.iso403_photo_ts\)/.test(S('src/components/ISO403PhotoModal.jsx')) && !/voyages\/\$\{voyageKey\}\/photos/.test(S('src/components/ISO403PhotoModal.jsx')));
    ok('firebase.js — 옛 자리에 새로 쓰는 set 이 없다(voyages/{k}/photos/{ts} set 은 삭제·null 뿐)', !/set\(ref\(db, `voyages\/\$\{voyageKey\}\/photos\/\$\{(ts|e\.ts)\}`\), \{/.test(S('src/firebase.js')));
    ok('APP_VERSION 3.61 이상', /3\.6[1-9]|3\.[7-9]/.test(S('src/utils.js').match(/APP_VERSION = '([^']*)'/)[1]));
  } catch (e) { bad += 1; console.log('  ✘ 예외 ' + (e && e.stack || e)); }
  console.log(`\n3.61 연막검사: ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})();
