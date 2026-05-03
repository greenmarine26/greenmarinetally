// Firebase Realtime Database — Master V1
// 프로젝트: greenmarinetally (asia-southeast1)
import { initializeApp } from 'firebase/app';
import {
  getDatabase, ref, onValue, push, set, update, remove, get, child, off
} from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBE4lC78w6jl8uVELrj1Jjsl7AVkvVVQBY",
  authDomain: "greenmarinetally.firebaseapp.com",
  databaseURL: "https://greenmarinetally-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "greenmarinetally",
  storageBucket: "greenmarinetally.firebasestorage.app",
  messagingSenderId: "981192728666",
  appId: "1:981192728666:web:c74f0e1a26c1f91039b863"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// === 공통 헬퍼 ===
const voyageRef = (key) => ref(db, `voyages/${key}`);
const sectionRef = (key, mode) => ref(db, `voyages/${key}/${mode}`);

// === 항차 (양하/선적 통합) ===
export async function fbCreateVoyage(voyageKey, info) {
  await update(voyageRef(voyageKey), { info });
}

export async function fbDeleteVoyage(voyageKey) {
  await remove(voyageRef(voyageKey));
}

export async function fbUpdateVoyageInfo(voyageKey, patch) {
  await update(ref(db, `voyages/${voyageKey}/info`), patch);
}

// 양하/선적 섹션 데이터 저장 (mode = 'discharge' | 'loading')
export async function fbSaveSectionData(voyageKey, mode, data) {
  await update(sectionRef(voyageKey, mode), data);
}

// EDI 컨테이너 저장 (객체로: { cn1: {...}, cn2: {...} } 구조)
export async function fbSaveEdiContainers(voyageKey, mode, containersObj) {
  await set(ref(db, `voyages/${voyageKey}/${mode}/ediContainers`), containersObj);
}

// 양하/선적 리스트 저장 (실번호 등)
export async function fbSaveListRecords(voyageKey, mode, recordsObj) {
  await set(ref(db, `voyages/${voyageKey}/${mode}/records`), recordsObj);
}

// X-RAY (양하만)
export async function fbSaveXrayList(voyageKey, xrayObj) {
  await set(ref(db, `voyages/${voyageKey}/discharge/xrayList`), xrayObj);
}
export async function fbToggleXray(voyageKey, cn) {
  const r = ref(db, `voyages/${voyageKey}/discharge/xrayList/${cn}`);
  const snap = await get(r);
  if (snap.exists()) await remove(r);
  else await set(r, { at: Date.now() });
}
export async function fbSetXraySeal(voyageKey, cn, seal) {
  await set(ref(db, `voyages/${voyageKey}/discharge/xraySeals/${cn}`), seal);
}

// 검수 완료 (양하/선적 공통)
export async function fbCompleteContainer(voyageKey, mode, cn, by) {
  await set(ref(db, `voyages/${voyageKey}/${mode}/completed/${cn}`), {
    by, at: Date.now()
  });
}
export async function fbCancelComplete(voyageKey, mode, cn) {
  await remove(ref(db, `voyages/${voyageKey}/${mode}/completed/${cn}`));
}

// 실번호 현장 수정
export async function fbUpdateRecordSeal(voyageKey, mode, cn, sl) {
  await update(ref(db, `voyages/${voyageKey}/${mode}/records/${cn}`), { sl });
}

// === 항차 전체 구독 ===
export function fbSubscribeVoyages(callback) {
  const r = ref(db, 'voyages');
  const handler = onValue(r, (snap) => {
    callback(snap.val() || {});
  });
  return () => off(r);
}

// 단일 항차 구독
export function fbSubscribeVoyage(voyageKey, callback) {
  const r = voyageRef(voyageKey);
  const handler = onValue(r, (snap) => {
    callback(snap.val() || null);
  });
  return () => off(r);
}

// === 검수원 ===
export async function fbSetInspector(name) {
  if (!name) return;
  await update(ref(db, `inspectors/${name}`), {
    name,
    lastActive: Date.now()
  });
}
export function fbSubscribeInspectors(callback) {
  const r = ref(db, 'inspectors');
  const handler = onValue(r, (snap) => callback(snap.val() || {}));
  return () => off(r);
}
export async function fbSetInspectorActivity(name, voyageKey, mode) {
  await update(ref(db, `inspectors/${name}`), {
    lastActive: Date.now(),
    lastVoyage: voyageKey || null,
    lastMode: mode || null,
  });
}

// 연결 상태
export function fbSubscribeConnection(callback) {
  const r = ref(db, '.info/connected');
  const handler = onValue(r, (snap) => callback(!!snap.val()));
  return () => off(r);
}

export { db };
