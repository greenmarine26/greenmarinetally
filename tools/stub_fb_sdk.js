// Firebase SDK 메모리 스텁(3.50) — firebase.js 를 **실소스 그대로** 번들해 문지기(fbSetInspectorActivity 등)를 재는 연막검사용. 쓰기는 전부 globalThis.__fbWrites 에 남기고 서버엔 안 간다.
//   esbuild --alias:firebase/app=… --alias:firebase/database=… --alias:firebase/storage=… 로 갈아 끼운다.
const W = (globalThis.__fbWrites = globalThis.__fbWrites || []);
export const initializeApp = () => ({ name: 'stub' });
export const getDatabase = () => ({ stub: true });
export const ref = (db, path = '') => ({ path: String(path) });
export const child = (r, p) => ({ path: `${r.path}/${p}` });
export const onValue = () => () => {};
export const off = () => {};
export const goOffline = () => {};
export const goOnline = () => {};
export const push = (r, v) => { const key = `-stub${W.length}`; W.push({ op: 'push', path: r.path, value: v, key }); return { key, path: `${r.path}/${key}` }; };
export const set = async (r, v) => { W.push({ op: 'set', path: r.path, value: v }); };
export const update = async (r, v) => { W.push({ op: 'update', path: r.path, value: v }); };
export const remove = async (r) => { W.push({ op: 'remove', path: r.path }); };
export const get = async () => ({ exists: () => false, val: () => null });
export const getStorage = () => ({ stub: true });
export const uploadBytes = async () => ({});
export const getDownloadURL = async () => '';
export const deleteObject = async () => {};
export const listAll = async () => ({ items: [] });
