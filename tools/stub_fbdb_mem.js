// 연막검사용 메모리 Firebase 스텁 — firebase/app·firebase/database·firebase/storage 를 한 파일로 갈아 끼운다(실제 쓰기 없음).
//   경로 문자열을 키로 하는 트리 하나(global.__memdb)를 두고 get/set/update/remove 를 흉내 낸다. 쓰기는 global.__memlog 에 남겨 검사가 본다.
const DB = () => (global.__memdb = global.__memdb || {});
const LOG = () => (global.__memlog = global.__memlog || []);
const parts = (p) => String(p || '').split('/').filter(Boolean);
function getAt(path) {
  let cur = DB();
  for (const k of parts(path)) { if (cur == null || typeof cur !== 'object' || !(k in cur)) return undefined; cur = cur[k]; }
  return cur;
}
function setAt(path, val) {
  const ps = parts(path);
  if (!ps.length) { global.__memdb = val && typeof val === 'object' ? JSON.parse(JSON.stringify(val)) : {}; return; }
  let cur = DB();
  for (const k of ps.slice(0, -1)) { if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {}; cur = cur[k]; }
  const last = ps[ps.length - 1];
  if (val === null || val === undefined) delete cur[last];
  else cur[last] = JSON.parse(JSON.stringify(val));
}
const snap = (v) => ({ exists: () => v !== undefined && v !== null, val: () => (v === undefined ? null : JSON.parse(JSON.stringify(v))), key: null });

export function initializeApp() { return { name: 'stub' }; }
export function getDatabase() { return { stub: true }; }
export function ref(_db, path = '') { return { path: String(path || '') }; }
export function child(r, p) { return { path: [r.path, p].filter(Boolean).join('/') }; }
export async function get(r) { if (global.__memfail && global.__memfail(r.path)) throw new Error('Client is offline'); return snap(getAt(r.path)); }
// 실 SDK(validateFirebaseData)는 값 안의 undefined 를 거부한다 — 스텁이 조용히 떨구면 검사가 헛돈다(감사 2026-09-05 실측).
function assertNoUndefined(v, p = '') {
  if (v === undefined) throw new Error(`set failed: value argument contains undefined in property '${p}'`);
  if (v && typeof v === 'object') for (const k of Object.keys(v)) assertNoUndefined(v[k], p ? p + '.' + k : k);
}
export async function set(r, v) { assertNoUndefined(v, r.path); LOG().push({ op: 'set', path: r.path }); setAt(r.path, v); }
export async function update(r, patch) {
  assertNoUndefined(patch, r.path);
  LOG().push({ op: 'update', path: r.path });
  for (const [k, v] of Object.entries(patch || {})) setAt([r.path, k].filter(Boolean).join('/'), v);
}
export async function remove(r) { LOG().push({ op: 'remove', path: r.path }); setAt(r.path, null); }
export function onValue(r, cb) { try { cb(snap(getAt(r.path))); } catch (e) { /* 검사 밖 */ } return () => {}; }
export function off() {}
export function push(r) { const k = 'k' + Math.random().toString(36).slice(2, 8); return { path: [r.path, k].join('/'), key: k }; }
export function goOffline() {}
export function goOnline() {}
export function serverTimestamp() { return Date.now(); }
// firebase/storage — 이 검사에서는 안 쓴다
export function getStorage() { return {}; }
export function uploadBytes() { return Promise.resolve({}); }
export function getDownloadURL() { return Promise.resolve(''); }
export function deleteObject() { return Promise.resolve(); }
export function listAll() { return Promise.resolve({ items: [] }); }
