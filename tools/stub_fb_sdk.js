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
//  ★ 3.53 — 읽기도 잴 수 있게 한다(옵트인). `globalThis.__fbGetValues` 에 경로→값을 넣어 두면 그대로 돌려준다.
//    안 넣으면 종전 그대로 «없음» 이라 기존 연막검사는 한 글자도 안 바뀐다.
//    왜 필요한가 — `fbPickPod` 는 기존 records 를 읽어 `pod_orig` 를 «처음 한 번만» 적고,
//    EDI 노드가 있을 때만 표식을 남긴다. 읽기가 늘 «없음» 이면 그 두 갈래를 아예 못 잰다.
export const get = async (r) => {
  const m = globalThis.__fbGetValues;
  const p = r && r.path ? String(r.path) : '';
  if (m && Object.prototype.hasOwnProperty.call(m, p)) {
    const v = m[p];
    return { exists: () => v !== null && v !== undefined, val: () => v };
  }
  return { exists: () => false, val: () => null };
};
export const getStorage = () => ({ stub: true });
export const uploadBytes = async () => ({});
export const getDownloadURL = async () => '';
export const deleteObject = async () => {};
export const listAll = async () => ({ items: [] });
