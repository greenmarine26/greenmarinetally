// 시뮬용 메모리 서버 — firebase/database 대신 끼운다(실 서버에 쓰지 않는다)
export const MEM = { root: {} };
const segs = (p) => String(p || '').split('/').filter(Boolean);
const getAt = (p) => { let o = MEM.root; for (const k of segs(p)) { if (o == null || typeof o !== 'object') return null; o = o[k]; } return o === undefined ? null : o; };
const setAt = (p, v) => { const ks = segs(p); let o = MEM.root; for (let i = 0; i < ks.length - 1; i++) { if (!o[ks[i]] || typeof o[ks[i]] !== 'object') o[ks[i]] = {}; o = o[ks[i]]; } const last = ks[ks.length - 1]; if (v === null || v === undefined) delete o[last]; else o[last] = JSON.parse(JSON.stringify(v)); };
export const getDatabase = () => ({});
export const ref = (db, p) => ({ path: p || '' });
export const get = async (r) => ({ val: () => getAt(r.path), exists: () => getAt(r.path) != null });
export const set = async (r, v) => setAt(r.path, v);
export const update = async (r, patch) => { for (const [k, v] of Object.entries(patch || {})) setAt((r.path ? r.path + '/' : '') + k, v); };
export const remove = async (r) => setAt(r.path, null);
export const push = (r, v) => { const k = 'k' + Date.now() + Math.random().toString(36).slice(2, 6); if (v !== undefined) setAt(r.path + '/' + k, v); return { key: k, path: r.path + '/' + k }; };
export const onValue = () => () => {}; export const off = () => {}; export const goOffline = () => {}; export const goOnline = () => {};
export const initializeApp = () => ({});
export const getStorage = () => ({}); export const uploadBytes = async () => ({}); export const getDownloadURL = async () => ''; export const deleteObject = async () => {}; export const listAll = async () => ({ items: [] });
