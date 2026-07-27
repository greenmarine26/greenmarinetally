// Firebase Realtime Database — Master V1
// 프로젝트: greenmarinetally (asia-southeast1)
import { initializeApp } from 'firebase/app';
import {
  getDatabase, ref, onValue, push, set, update, remove, get, child, off
} from 'firebase/database';
import { gateBayDictWrite } from './bayDictGuard.js';   // V9.05: 베이사전 쓰기 중앙 게이트
// M6.40: STOWAGE PDF 보관 — Firebase Storage
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject, listAll
} from 'firebase/storage';
import { isPyeongtaekPort, isPortCode, resolveShipKey } from './utils.js';

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
const storage = getStorage(app);  // M6.40

// === M6.40: STOWAGE PDF 보관 (30일 자동 폐기) ===
const STOWAGE_PDF_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;  // 30일

// 선박 코드별 PDF 업로드 — 같은 선박 새 PDF 등록 시 이전 자동 삭제
export async function fbUploadStowagePdf(shipCode, file) {
  if (!shipCode || !file) throw new Error('shipCode와 file 필요');
  const ts = Date.now();
  const safeName = file.name.replace(/[^\w.\-]/g, '_');
  const path = `stowage-pdf/${shipCode}_${ts}_${safeName}`;

  // 기존 같은 선박 PDF 삭제 (덮어쓰기 정책)
  try {
    const folderRef = storageRef(storage, 'stowage-pdf');
    const list = await listAll(folderRef);
    const oldFiles = list.items.filter(item => item.name.startsWith(`${shipCode}_`));
    for (const oldFile of oldFiles) {
      try { await deleteObject(oldFile); } catch (_) {}
    }
  } catch (e) {
    console.warn('[M6.40] 기존 PDF 정리 실패 (무시):', e);
  }

  // 새 PDF 업로드
  const newRef = storageRef(storage, path);
  await uploadBytes(newRef, file, { contentType: 'application/pdf' });
  const url = await getDownloadURL(newRef);
  return { url, path, name: file.name, uploadedAt: ts };
}

// 만료된 PDF 자동 폐기 (30일 초과)
// 클라이언트 측 정리 — Spark 플랜에 Cloud Function 없음
//   앱 진입 시 백그라운드로 호출, 사용자 액션 0
export async function fbCleanupExpiredStowagePdfs() {
  try {
    const folderRef = storageRef(storage, 'stowage-pdf');
    const list = await listAll(folderRef);
    const now = Date.now();
    let removed = 0;
    for (const item of list.items) {
      // 파일명에서 timestamp 추출: {shipCode}_{ts}_{originalName}
      const m = item.name.match(/^[^_]+_(\d+)_/);
      if (!m) continue;
      const ts = parseInt(m[1], 10);
      if (!Number.isFinite(ts)) continue;
      if (now - ts > STOWAGE_PDF_RETENTION_MS) {
        try {
          await deleteObject(item);
          removed++;
        } catch (_) {}
      }
    }
    return removed;
  } catch (e) {
    console.warn('[M6.40] PDF 자동 정리 실패:', e);
    return 0;
  }
}

// PDF 삭제 (개별)
export async function fbDeleteStowagePdf(path) {
  try {
    const r = storageRef(storage, path);
    await deleteObject(r);
    return true;
  } catch (e) {
    console.warn('[M6.40] PDF 삭제 실패:', e);
    return false;
  }
}

// M6.45: 단순 get/set (정책 1일 1회 등 단순 키-값 저장용)
export async function fbGetSimple(path) {
  try {
    const r = ref(db, path);
    const snap = await get(r);
    return snap.exists() ? snap.val() : null;
  } catch (e) {
    return null;
  }
}
export async function fbSetSimple(path, value) {
  try {
    const r = ref(db, path);
    await set(r, value);
    return true;
  } catch (e) {
    return false;
  }
}

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

// M3.4.2: 양하 또는 선적 한 모드만 삭제 (다른 모드는 유지)
// 사용 예: 같은 항차에 양하/선적 둘 다 있는데 양하만 삭제
export async function fbDeleteSection(voyageKey, mode) {
  if (mode !== 'discharge' && mode !== 'loading') {
    throw new Error('mode must be discharge or loading');
  }
  await remove(ref(db, `voyages/${voyageKey}/${mode}`));
}

export async function fbUpdateVoyageInfo(voyageKey, patch) {
  await update(ref(db, `voyages/${voyageKey}/info`), patch);
}

// 양하/선적 섹션 데이터 저장 (mode = 'discharge' | 'loading')
export async function fbSaveSectionData(voyageKey, mode, data) {
  await update(sectionRef(voyageKey, mode), data);
}

// EDI 컨테이너 저장 (객체로: { cn1: {...}, cn2: {...} } 구조)
// M3.5.3: 큰 데이터는 청크 분할 (set 통째 → set+update 분할)
//   - 504대 set() 한 번에 = 5~30초 (Firebase가 모든 child 검증)
//   - 50대씩 분할 = 1~2초 (트랜잭션 한도 회피)
export async function fbSaveEdiContainers(voyageKey, mode, containersObj) {
  await chunkedReplace(`voyages/${voyageKey}/${mode}/ediContainers`, containersObj);
}

// M5.11: EDI 원본 텍스트 보관 — 앱 업데이트 후 자료 재업로드 없이 [🔄 자료 재처리] 가능하게
//   raw: 원본 EDI 텍스트 (압축 안함, 가독성 우선)
//   meta: { uploadedAt, fileName, parserVersion } 등 메타데이터
//   path: voyages/{key}/{mode}/raw/edi
export async function fbSaveEdiRaw(voyageKey, mode, rawText, meta) {
  if (!rawText) return;
  const r = ref(db, `voyages/${voyageKey}/${mode}/raw/edi`);
  await set(r, {
    text: String(rawText).slice(0, 5_000_000),  // 5MB 안전 제한
    uploadedAt: Date.now(),
    fileName: meta?.fileName || '',
    parserVersion: meta?.parserVersion || '',
    sizeBytes: String(rawText).length,
  });
}

// M5.11: 보관된 EDI 원본 조회 (재처리용)
export async function fbGetEdiRaw(voyageKey, mode) {
  const r = ref(db, `voyages/${voyageKey}/${mode}/raw/edi`);
  const snap = await get(r);
  if (!snap.exists()) return null;
  return snap.val();
}

// 양하/선적 리스트 저장 (실번호 등)
export async function fbSaveListRecords(voyageKey, mode, recordsObj) {
  await chunkedReplace(`voyages/${voyageKey}/${mode}/records`, recordsObj);
}

// X-RAY (양하만)
export async function fbSaveXrayList(voyageKey, xrayObj) {
  await chunkedReplace(`voyages/${voyageKey}/discharge/xrayList`, xrayObj);
}

// M3.5.3: 큰 객체를 안전하게 저장
//   M4.2 fix: 청크 분할(50대씩 set+병렬 update) → race condition으로 데이터 손실 의심
//             단일 set으로 변경 (Firebase 16MB 제한 내, 904대 ≈ 1MB라 안전)
async function chunkedReplace(path, obj) {
  const keys = Object.keys(obj || {});
  if (keys.length === 0) {
    await set(ref(db, path), null);
    return;
  }
  await set(ref(db, path), obj);
}
export async function fbToggleXray(voyageKey, cn) {
  const r = ref(db, `voyages/${voyageKey}/discharge/xrayList/${cn}`);
  const snap = await get(r);
  if (snap.exists()) await remove(r);
  else await set(r, { at: Date.now() });
}
// 실번호 현장 수정 — 원본(sl_orig)은 절대 변경 X, 이력 누적
export async function fbUpdateRecordSeal(voyageKey, mode, cn, newSl, by) {
  const r = ref(db, `voyages/${voyageKey}/${mode}/records/${cn}`);
  const snap = await get(r);
  const cur = snap.val() || {};
  const oldSl = cur.sl || '';
  const orig = cur.sl_orig || cur.sl || ''; // 원본 없으면 현재값을 원본으로

  // 변화 없으면 무시
  if (oldSl === newSl) return;

  const history = Array.isArray(cur.sl_history) ? [...cur.sl_history] : [];
  history.push({ from: oldSl, to: newSl, by: by || '', at: Date.now() });

  await update(r, {
    sl: newSl,
    sl_orig: orig, // 한 번 정해지면 안 바뀜
    sl_history: history,
  });
}

// 임의 필드 수정 (ISO/F/E/리퍼/FR/온도 등) — 원본 보관 + 이력
// M3.5.4-fix3: records 노드와 ediContainers 노드 둘 다 업데이트
//   화면이 ediContainers를 보고 있어서 records만 수정하면 변경 안 보였던 버그 수정
// 사용 예: fbUpdateRecordField(voyageKey, mode, cn, 'iso', '46P3', by)
//   → records/{cn}/iso = '46P3' + iso_orig + edits.iso 이력
//   → ediContainers/{cn}/iso = '46P3' (화면 즉시 반영)
export async function fbUpdateRecordField(voyageKey, mode, cn, field, newValue, by) {
  const r = ref(db, `voyages/${voyageKey}/${mode}/records/${cn}`);
  const snap = await get(r);
  const cur = snap.val() || {};
  const oldValue = cur[field];
  const origField = `${field}_orig`;
  const orig = cur[origField] !== undefined ? cur[origField] : (oldValue !== undefined ? oldValue : '');

  if (oldValue === newValue) return;

  const edits = cur.edits || {};
  const fieldHistory = Array.isArray(edits[field]) ? [...edits[field]] : [];
  fieldHistory.push({ from: oldValue, to: newValue, by: by || '', at: Date.now() });

  // records 업데이트 (이력 보관용)
  await update(r, {
    [field]: newValue,
    [origField]: orig,
    edits: { ...edits, [field]: fieldHistory },
  });

  // M3.5.4-fix3: ediContainers도 동시 업데이트 (화면 즉시 반영)
  // M4.1: ediContainers에 cn이 없으면 records 데이터로 새로 생성 (ISO 변경 화면 미반영 fix)
  //   - 이전: ediContainers/{cn}이 없으면 update 무시 → 화면에 옛 값 표시
  //   - 수정: 없으면 records 데이터 + 새 값으로 ediContainers/{cn} 생성 → 화면 즉시 반영
  const ediRef = ref(db, `voyages/${voyageKey}/${mode}/ediContainers/${cn}`);
  const ediSnap = await get(ediRef);
  if (ediSnap.exists()) {
    await update(ediRef, { [field]: newValue });
  } else {
    // ediContainers에 없으면 records의 데이터로 신규 생성
    const newEdi = { ...cur, [field]: newValue };
    // _orig 필드들 제거 (records 전용)
    delete newEdi.edits;
    Object.keys(newEdi).forEach(k => {
      if (k.endsWith('_orig') || k.endsWith('_history')) delete newEdi[k];
    });
    await set(ediRef, newEdi);
  }
}

// X-RAY 봉인 수정 — seal (세관봉인) + eseal (전자봉인) 2개 필드
export async function fbSetXraySeal(voyageKey, cn, seal, eseal, by) {
  const r = ref(db, `voyages/${voyageKey}/discharge/xraySeals/${cn}`);
  const snap = await get(r);
  const cur = snap.val() || {};
  const oldSeal = cur.seal || '';
  const oldEseal = cur.eseal || '';
  const sealOrig = cur.seal_orig != null ? cur.seal_orig : oldSeal;
  const esealOrig = cur.eseal_orig != null ? cur.eseal_orig : oldEseal;

  if (oldSeal === seal && oldEseal === eseal) return;

  const history = Array.isArray(cur.history) ? [...cur.history] : [];
  history.push({
    from: { seal: oldSeal, eseal: oldEseal },
    to: { seal, eseal },
    by: by || '',
    at: Date.now(),
  });

  await set(r, {
    seal: seal || '',
    eseal: eseal || '',
    seal_orig: sealOrig,
    eseal_orig: esealOrig,
    history,
  });
}

// 검수 완료 (양하/선적 공통)
// V7.99-16: 완료 시 이상 상태 기록(양하신고 점검용).
//   flag: 'normal'(기본) | 'missing'(누락-선박에 없음) | 'extra'(초과-리스트에 없는데 내림) | 'swapped'(바뀜)
//   note: 자유 메모(바뀜이면 원래 신고 번호 등). 기존 8개 호출부는 인자 안 줘서 normal — 회귀 없음.
export async function fbCompleteContainer(voyageKey, mode, cn, by, flag = 'normal', note = '') {
  const rec = { by, at: Date.now() };
  if (flag && flag !== 'normal') { rec.flag = flag; if (note) rec.note = note; }
  await set(ref(db, `voyages/${voyageKey}/${mode}/completed/${cn}`), rec);
  _tallyInspector(voyageKey, mode, by);   // V9.16: 개인 누적 실적 (비차단 — 실패해도 완료 처리는 무관)
}

// ── V9.16(2026-07-27): 검수원 개인 누적 실적 — fbAddShipVoyageInspector가 완성된 채
//   호출 0회로 방치돼, 수석이 완료 저장하면 그 항차 실적이 화면에서 증발했다(전면 점검 §1-1).
//   완료 1건마다 ships/{shipId}/voyages/{key}/inspectors/{이름}에 누적한다.
//   비차단·실패 무시 — 검수 완료 흐름을 절대 막지 않는다. info는 항차별 1회만 읽고 캐시.
const _tallyInfoCache = {};
function _tallyInspector(voyageKey, mode, by) {
  if (!voyageKey || !by) return;
  (async () => {
    try {
      let info = _tallyInfoCache[voyageKey];
      if (info === undefined) {
        const snap = await get(ref(db, `voyages/${voyageKey}/info`));
        info = snap.exists() ? snap.val() : null;
        _tallyInfoCache[voyageKey] = info;
      }
      if (!info) return;
      const shipId = resolveShipKey(info.imo || info.callsign || String(info.vsl || '').toUpperCase().replace(/\s+/g, ''));
      if (!shipId) return;
      await fbAddShipVoyageInspector(shipId, voyageKey, by, mode);
    } catch { /* 통계는 놓쳐도 검수는 계속 */ }
  })();
}

// V8.71: 여러 컨 완료를 한 번의 멀티패스 update로 — 트윈 수정에서 "한 대만 먼저 선적" 방지 (둘 다 되거나 둘 다 안 되거나).
export async function fbCompleteContainersAtomic(voyageKey, mode, cns, by) {
  const patch = {};
  const at = Date.now();
  const list = cns.filter(Boolean);
  for (const cn of list) patch[`voyages/${voyageKey}/${mode}/completed/${cn}`] = { by, at };
  await update(ref(db), patch);
  for (const _ of list) _tallyInspector(voyageKey, mode, by);   // V9.16: 트윈도 대수만큼 누적
}
// V7.99-16 / V8.04: 초과 컨(신고 리스트에 없는데 내려진 것) 기록.
//   EDI/리스트에 없는 번호라 completed에 단독 기록 + extras 노드에 별도 보관(신고 점검이 모음).
//   V8.04: 신고서 작성에 필요한 기본 정보(규격·F/E·타입·실번호·데미지 유무)를 함께 저장.
export async function fbAddExtraContainer(voyageKey, mode, cn, by, info = {}) {
  const at = Date.now();
  const rec = {
    by, at, flag: 'extra',
    size: info.size || '',      // '20' | '40ST' | '40HC' | '45'
    fe: info.fe || '',          // 'F' | 'E'
    ctype: info.ctype || '',    // '일반' | 'RF' | 'FR' | 'OT' | 'TK'
    temp: info.temp || '',      // 리퍼 온도 (RF일 때)
    seal: info.seal || '',      // 실번호
    damage: info.damage || '',  // '없음' | '있음' | 데미지 내용
    note: info.note || '',
  };
  await set(ref(db, `voyages/${voyageKey}/${mode}/completed/${cn}`), rec);
  await set(ref(db, `voyages/${voyageKey}/${mode}/extras/${cn}`), rec);
}
// V8.04: 잘못 기록한 초과 컨 취소(삭제) — completed·extras 양쪽에서 제거.
export async function fbRemoveExtraContainer(voyageKey, mode, cn) {
  await remove(ref(db, `voyages/${voyageKey}/${mode}/completed/${cn}`));
  await remove(ref(db, `voyages/${voyageKey}/${mode}/extras/${cn}`));
}
export async function fbCancelComplete(voyageKey, mode, cn) {
  await remove(ref(db, `voyages/${voyageKey}/${mode}/completed/${cn}`));
  // V8.80: 취소 = 위치도 원계획(bay_orig)으로 원복 (사용자 확정 2026-07-08 — 원복돼야 수정 여부를 알 수 있다).
  //   원자리에 다른 컨이 있으면 미배정으로 두고 알림용 정보 반환.
  try {
    const recSnap = await get(ref(db, `voyages/${voyageKey}/${mode}/records/${cn}`));
    const rec = recSnap.val();
    if (!rec || rec.bay_orig === undefined) return { ok: true };
    const ob = rec.bay_orig || '', orow = rec.row_orig || '', ot = rec.tier_orig || '';
    const changed = (rec.bay || '') !== ob || (rec.row || '') !== orow || (rec.tier || '') !== ot;
    if (!changed) return { ok: true };
    let occupant = null;
    if (ob && orow && ot) {
      const [ediSnap, recAllSnap] = await Promise.all([
        get(ref(db, `voyages/${voyageKey}/${mode}/ediContainers`)),
        get(ref(db, `voyages/${voyageKey}/${mode}/records`)),
      ]);
      const ediMap = ediSnap.val() || {}, recMap = recAllSnap.val() || {};
      const obInt = String(parseInt(ob, 10));
      for (const otherCn of new Set([...Object.keys(ediMap), ...Object.keys(recMap)])) {
        if (otherCn === cn) continue;
        const e = ediMap[otherCn] || {}, r = recMap[otherCn] || {};
        const xb = r.bay || e.bay || '';
        if (xb && String(parseInt(xb, 10)) === obInt && (r.row || e.row) === orow && (r.tier || e.tier) === ot) { occupant = otherCn; break; }
      }
    }
    if (occupant) {
      await _updatePositionFields(voyageKey, mode, cn, '', '', '', '취소원복');
      return { ok: true, restored: false, origOccupied: occupant };
    }
    await _updatePositionFields(voyageKey, mode, cn, ob, orow, ot, '취소원복');
    return { ok: true, restored: true, orig: { bay: ob, row: orow, tier: ot } };
  } catch { return { ok: true }; }
}

// V8.80: 수동 배정 확인 — 컨을 미배정으로 (수동 작업은 계획 위치에 묶이지 않는다. 사용자 확정 2026-07-08).
export async function fbUnassignContainer(voyageKey, mode, cn, by) {
  await _updatePositionFields(voyageKey, mode, cn, '', '', '', by);
}

// M4.9d-fix: 선적 실체 위치 저장 (사용자 도메인: 선적 EDI는 계획만, 선적확인 시 실체 발생)
//   - 계획 위치 c.bay/row/tier는 보존 (EDI 단일 진실)
//   - 실체 위치 c.bay_actual/row_actual/tier_actual에 별도 저장
//   - 수정 안 하면 actual = 계획 (정상 흐름)
//   - 위치 변경 시에만 actual ≠ 계획 (현장 적치 다름)
export async function fbSetActualPosition(voyageKey, mode, cn, actualBay, actualRow, actualTier, by) {
  const r = ref(db, `voyages/${voyageKey}/${mode}/records/${cn}`);
  await update(r, {
    bay_actual: actualBay || '',
    row_actual: actualRow || '',
    tier_actual: actualTier || '',
    actual_at: Date.now(),
    actual_by: by || '',
  });
}
// 실체 위치 삭제 (수정 취소)
export async function fbClearActualPosition(voyageKey, mode, cn) {
  const r = ref(db, `voyages/${voyageKey}/${mode}/records/${cn}`);
  await update(r, {
    bay_actual: null,
    row_actual: null,
    tier_actual: null,
    actual_at: null,
    actual_by: null,
  });
}

// M5.1 I: 보관함 처리 — bay_actual='__STG__' 로 마킹
//   - 베이 그리드에서 숨겨지고 보관함 박스에만 표시
//   - 일괄 처리 (영역 선택분 → 보관함)
export const STORAGE_BAY = '__STG__';

export async function fbBatchMoveToStorage(voyageKey, mode, cns, by) {
  const updates = {};
  const now = Date.now();
  cns.forEach(cn => {
    const path = `voyages/${voyageKey}/${mode}/records/${cn}`;
    updates[`${path}/bay_actual`] = STORAGE_BAY;
    updates[`${path}/row_actual`] = '00';
    updates[`${path}/tier_actual`] = '00';
    updates[`${path}/actual_at`] = now;
    updates[`${path}/actual_by`] = by || '';
  });
  await update(ref(db), updates);
}

export async function fbBatchClearActual(voyageKey, mode, cns) {
  const updates = {};
  cns.forEach(cn => {
    const path = `voyages/${voyageKey}/${mode}/records/${cn}`;
    updates[`${path}/bay_actual`] = null;
    updates[`${path}/row_actual`] = null;
    updates[`${path}/tier_actual`] = null;
    updates[`${path}/actual_at`] = null;
    updates[`${path}/actual_by`] = null;
  });
  await update(ref(db), updates);
}

// ============================================================
// V9.07: 선적 확정 플랜 (일항사 협의용) — 3단 계층
//   planDraft   : 초안. 검수사 화면·실선적에 영향 없음.
//   ediContainers bay/row/tier : [확정] 시에만 갱신 = 검수앱 선적 플랜
//   records.bay_actual         : 실체 위치 — 이 API가 절대 건드리지 않는다
// ============================================================
const PLAN_MODE = 'loading';   // 확정 플랜은 선적 전용 (사용자 확정 2026-07-25)

export async function fbSavePlanDraft(voyageKey, draft, by) {
  const path = `voyages/${voyageKey}/${PLAN_MODE}/planDraft`;
  await set(ref(db, path), { ...draft, _at: Date.now(), _by: by || '' });
}

export async function fbClearPlanDraft(voyageKey) {
  await remove(ref(db, `voyages/${voyageKey}/${PLAN_MODE}/planDraft`));
}

// 확정 — planDraft(또는 넘겨받은 positions)를 ediContainers 계획 위치로 커밋.
//   최초 1회만 EDI 원본을 bay_edi0/row_edi0/tier_edi0에 백업한다(복원용).
//   positions: { cn: {bay,row,tier} | {storage:true} }
export async function fbCommitPlan(voyageKey, positions, by) {
  const base = `voyages/${voyageKey}/${PLAN_MODE}`;
  const snap = await get(ref(db, `${base}/ediContainers`));
  const edi = snap.val() || {};
  const updates = {};
  const now = Date.now();
  const hist = [];
  let stored = 0;

  for (const [cn, p] of Object.entries(positions || {})) {
    const cur = edi[cn];
    if (!cur) continue;
    // 원본 백업은 최초 1회만 (이미 있으면 덮지 않는다)
    if (cur.bay_edi0 === undefined || cur.bay_edi0 === null) {
      updates[`${base}/ediContainers/${cn}/bay_edi0`] = cur.bay ?? '';
      updates[`${base}/ediContainers/${cn}/row_edi0`] = cur.row ?? '';
      updates[`${base}/ediContainers/${cn}/tier_edi0`] = cur.tier ?? '';
    }
    const from = `${cur.bay ?? ''}/${cur.row ?? ''}/${cur.tier ?? ''}`;
    if (p && p.storage) {
      // 확정 플랜에서 뺀 컨 — 계획 위치를 비운다 (미배정)
      updates[`${base}/ediContainers/${cn}/bay`] = '';
      updates[`${base}/ediContainers/${cn}/row`] = '';
      updates[`${base}/ediContainers/${cn}/tier`] = '';
      updates[`${base}/ediContainers/${cn}/plan_unassigned`] = true;
      stored++;
      hist.push({ cn, from, to: '__STG__' });
    } else if (p && p.bay) {
      updates[`${base}/ediContainers/${cn}/bay`] = p.bay;
      updates[`${base}/ediContainers/${cn}/row`] = p.row;
      updates[`${base}/ediContainers/${cn}/tier`] = p.tier;
      updates[`${base}/ediContainers/${cn}/plan_unassigned`] = null;
      hist.push({ cn, from, to: `${p.bay}/${p.row}/${p.tier}` });
    }
    updates[`${base}/ediContainers/${cn}/plan_at`] = now;
    updates[`${base}/ediContainers/${cn}/plan_by`] = by || '';
  }

  if (hist.length) {
    updates[`${base}/planHistory/${now}`] = { at: now, by: by || '', count: hist.length, storage: stored, changes: hist.slice(0, 400) };
  }
  updates[`${base}/planDraft`] = null;   // 확정 후 초안 비움
  await update(ref(db), updates);
  return { committed: hist.length, storage: stored };
}

// EDI 원본 복원 — bay_edi0가 있는 컨을 원 좌표로 되돌리고 백업 필드를 정리한다.
export async function fbRestorePlanFromEdi(voyageKey) {
  const base = `voyages/${voyageKey}/${PLAN_MODE}`;
  const snap = await get(ref(db, `${base}/ediContainers`));
  const edi = snap.val() || {};
  const updates = {};
  let n = 0;
  for (const [cn, c] of Object.entries(edi)) {
    if (c?.bay_edi0 === undefined || c?.bay_edi0 === null) continue;
    updates[`${base}/ediContainers/${cn}/bay`] = c.bay_edi0;
    updates[`${base}/ediContainers/${cn}/row`] = c.row_edi0 ?? '';
    updates[`${base}/ediContainers/${cn}/tier`] = c.tier_edi0 ?? '';
    updates[`${base}/ediContainers/${cn}/bay_edi0`] = null;
    updates[`${base}/ediContainers/${cn}/row_edi0`] = null;
    updates[`${base}/ediContainers/${cn}/tier_edi0`] = null;
    updates[`${base}/ediContainers/${cn}/plan_unassigned`] = null;
    n++;
  }
  if (n) await update(ref(db), updates);
  return n;
}

// M3.87: 컨테이너 위치 재배정 (선적 모드용)
//   - 새 위치(bay/row/tier)로 이동
//   - 새 위치에 다른 컨이 있으면 그 컨은 미배정 처리(bay 빈 값) + 완료 취소
//   - 이력 추적 (edits.bay, edits.row, edits.tier)
//   - 빈 문자열로 새 위치를 주면 → 미배정으로 변경
//
// 반환: { ok: true, displaced?: <빠진 컨번호> }
// V8.71: opts.displacedMode — 'swap'(기본: 자동 가이드용, 밀려난 컨을 옮긴 컨의 옛 자리로)
//   | 'unassign'(수동용: 밀려난 컨은 미배정 — 수동 작업에선 앱이 컨을 멋대로 재배정하지 않는다. 사용자 확정 2026-07-08).
export async function fbReassignContainerPosition(voyageKey, mode, cn, newBay, newRow, newTier, by, opts = {}) {
  // V7.94-24: 자리 교환(swap) — A를 B 자리로 옮기면, 자리를 뺏긴 B는 A의 원래 자리로 이동(거기서 선적 대기).
  //   (구: B를 미배정 처리 → 떠돌이 발생). A의 현재 위치를 먼저 캡처.
  let aOldBay = '', aOldRow = '', aOldTier = '';
  {
    const recSnapA = await get(ref(db, `voyages/${voyageKey}/${mode}/records/${cn}`));
    const ediSnapA = await get(ref(db, `voyages/${voyageKey}/${mode}/ediContainers/${cn}`));
    const recA = recSnapA.val() || {}; const ediA = ediSnapA.val() || {};
    aOldBay = recA.bay !== undefined ? recA.bay : (ediA.bay || '');
    aOldRow = recA.row !== undefined ? recA.row : (ediA.row || '');
    aOldTier = recA.tier !== undefined ? recA.tier : (ediA.tier || '');
  }
  // 1) 같은 자리에 있는 다른 컨 찾기 (충돌 검사)
  let displaced = null;
  if (newBay && newRow && newTier) {
    const ediMapRef = ref(db, `voyages/${voyageKey}/${mode}/ediContainers`);
    const recMapRef = ref(db, `voyages/${voyageKey}/${mode}/records`);
    const [ediSnap, recSnap] = await Promise.all([get(ediMapRef), get(recMapRef)]);
    const ediMap = ediSnap.val() || {};
    const recMap = recSnap.val() || {};
    // ediContainers + records 양쪽 봐서 같은 위치 컨 검색
    const allCnSet = new Set([...Object.keys(ediMap), ...Object.keys(recMap)]);
    const newBayInt = String(parseInt(newBay, 10));  // normalize
    for (const otherCn of allCnSet) {
      if (otherCn === cn) continue;
      const ediC = ediMap[otherCn] || {};
      const recC = recMap[otherCn] || {};
      const oBay = recC.bay || ediC.bay || '';
      const oRow = recC.row || ediC.row || '';
      const oTier = recC.tier || ediC.tier || '';
      if (!oBay) continue;
      const oBayInt = String(parseInt(oBay, 10));
      if (oBayInt === newBayInt && oRow === newRow && oTier === newTier) {
        displaced = otherCn;
        break;
      }
    }
  }

  // 2) 충돌 컨이 있으면 그 컨을 A의 원래 자리로 이동 (자리 교환). A 원자리가 없으면(A가 미배정 상태였으면) 미배정 처리.
  let displacedWasCompleted = false;
  if (displaced) {
    if (opts.displacedMode !== 'unassign' && aOldBay && aOldRow && aOldTier) {
      await _updatePositionFields(voyageKey, mode, displaced, aOldBay, aOldRow, aOldTier, by);
    } else {
      // 수동(unassign) 또는 옛 자리 없음 → 미배정 (미배정 목록에서 검수사가 직접 지정)
      await _updatePositionFields(voyageKey, mode, displaced, '', '', '', by);
    }
    // V8.70: 자리를 뺏긴 컨이 이미 검수완료된 컨이면 완료 기록을 지우지 않는다.
    //   (구: 무조건 remove → 다른 자리에서 이미 선적확인한 기록이 조용히 사라짐 — 체인시프트 데이터 유실 원인.
    //    오선적이었다면 검수사가 그 번호로 검색해 직접 취소·수정한다.)
    const dispComp = await get(ref(db, `voyages/${voyageKey}/${mode}/completed/${displaced}`));
    if (dispComp.exists()) {
      displacedWasCompleted = true;
    } else {
      await remove(ref(db, `voyages/${voyageKey}/${mode}/completed/${displaced}`));
    }
  }

  // 3) target 컨 위치 변경
  await _updatePositionFields(voyageKey, mode, cn, newBay, newRow, newTier, by);

  return { ok: true, displaced, displacedWasCompleted, swappedTo: (displaced && opts.displacedMode !== 'unassign') ? { bay: aOldBay, row: aOldRow, tier: aOldTier } : null };
}

// 내부 헬퍼: bay/row/tier 동시 변경 + 이력 추가 + ediContainers 동기화
async function _updatePositionFields(voyageKey, mode, cn, newBay, newRow, newTier, by) {
  const recR = ref(db, `voyages/${voyageKey}/${mode}/records/${cn}`);
  const ediR = ref(db, `voyages/${voyageKey}/${mode}/ediContainers/${cn}`);
  const [recSnap, ediSnap] = await Promise.all([get(recR), get(ediR)]);
  const cur = recSnap.val() || {};
  const ediCur = ediSnap.val() || {};

  // normalize bay (정수 String)
  const nb = newBay ? String(parseInt(newBay, 10)) : '';
  const nr = newRow || '';
  const nt = newTier || '';

  const oldBay = cur.bay !== undefined ? cur.bay : (ediCur.bay || '');
  const oldRow = cur.row !== undefined ? cur.row : (ediCur.row || '');
  const oldTier = cur.tier !== undefined ? cur.tier : (ediCur.tier || '');

  const edits = cur.edits || {};
  const pushHist = (field, oldV, newV) => {
    if (oldV === newV) return;
    const hist = Array.isArray(edits[field]) ? [...edits[field]] : [];
    hist.push({ from: oldV, to: newV, by: by || '', at: Date.now() });
    edits[field] = hist;
  };
  pushHist('bay', oldBay, nb);
  pushHist('row', oldRow, nr);
  pushHist('tier', oldTier, nt);

  // _orig 보존 (최초 EDI 위치)
  const patch = {
    bay: nb, row: nr, tier: nt,
    bay_orig: cur.bay_orig !== undefined ? cur.bay_orig : oldBay,
    row_orig: cur.row_orig !== undefined ? cur.row_orig : oldRow,
    tier_orig: cur.tier_orig !== undefined ? cur.tier_orig : oldTier,
    edits,
  };

  // records가 없으면 새로 만듦 (cn은 키이지만 안전하게)
  if (!recSnap.exists()) {
    patch.cn = cn;
    patch.l4 = cn.slice(-4);
    await set(recR, patch);
  } else {
    await update(recR, patch);
  }

  // ediContainers 동기화 (화면 즉시 반영)
  if (ediSnap.exists()) {
    await update(ediR, { bay: nb, row: nr, tier: nt });
  }
}

// (실번호 / X-RAY 봉인 수정 함수는 위에서 정의됨 — 이력 추적 포함)

// === 항차 전체 구독 ===
// V8.40: 수집기 하트비트 구독 — collector_heartbeat = { at, cycleMin, autoreg, version }
export function fbSubscribeHeartbeat(callback) {
  const r = ref(db, 'collector_heartbeat');
  const unsub = onValue(r, (snap) => callback(snap.val() || null));
  return unsub;
}

export function fbSubscribeVoyages(callback) {
  const r = ref(db, 'voyages');
  const unsub = onValue(r, (snap) => {
    callback(snap.val() || {});
  });
  return unsub;
}


// 단일 항차 구독
export function fbSubscribeVoyage(voyageKey, callback) {
  const r = voyageRef(voyageKey);
  const unsub = onValue(r, (snap) => {
    callback(snap.val() || null);
  });
  return unsub;
}

// === 검수원 ===
export async function fbSetInspector(name) {
  if (!name) return;
  await update(ref(db, `inspectors/${name}`), {
    name,
    lastActive: Date.now(),
    loggedIn: true,                 // V7.94-14: 로그인 상태 마킹
    loginAt: Date.now(),
  });
}
// V7.94-14: 로그아웃 마킹 — 다른 기기 화면에서 즉시 '작업중' 배지 제거
export async function fbLogoutInspector(name) {
  if (!name) return;
  await update(ref(db, `inspectors/${name}`), {
    loggedIn: false,
    loggedOutAt: Date.now(),
  });
}
export function fbSubscribeInspectors(callback) {
  const r = ref(db, 'inspectors');
  const unsub = onValue(r, (snap) => callback(snap.val() || {}));
  return unsub;
}

// ===== 수석 공지(흐르는 띠) — V8.27 =====
//   broadcast/current = { id, text, by, ts }  ·  broadcast/reads/{id}/{검수원} = ts
export function fbSubscribeBroadcast(callback) {
  const r = ref(db, 'broadcast/current');
  return onValue(r, (snap) => callback(snap.val() || null));
}
export async function fbSetBroadcast(text, by) {
  const id = String(Date.now());
  await set(ref(db, 'broadcast/current'), { id, text: String(text || '').slice(0, 500), by: by || '', ts: Date.now() });
  return id;
}
export async function fbClearBroadcast() {
  await remove(ref(db, 'broadcast/current'));
}
export async function fbMarkBroadcastRead(id, inspector) {
  if (!id || !inspector) return;
  try { await set(ref(db, `broadcast/reads/${id}/${inspector}`), Date.now()); } catch (e) {}
}
export function fbSubscribeBroadcastReads(id, callback) {
  if (!id) { callback({}); return () => {}; }
  const r = ref(db, `broadcast/reads/${id}`);
  return onValue(r, (snap) => callback(snap.val() || {}));
}
export async function fbSetInspectorActivity(name, voyageKey, mode, detail = null) {
  // V7.99-8 (메모6): detail = { equip, bayLabel, tier('hold'|'deck'), remain, auto } —
  //   수석이 "몇 호기가 어느 베이의 홀드/데크를 작업 중·몇 개 남음"을 실시간으로 보게 함.
  const payload = {
    lastActive: Date.now(),
    lastVoyage: voyageKey || null,
    lastMode: mode || null,
  };
  if (detail && typeof detail === 'object') {
    payload.workEquip = detail.equip || null;
    payload.workBay = detail.bayLabel || null;
    payload.workTier = detail.tier || null;        // 'hold' | 'deck' | null
    payload.workRemain = (typeof detail.remain === 'number') ? detail.remain : null;
    payload.workAuto = (typeof detail.auto === 'boolean') ? detail.auto : null;  // 자동/수동
    payload.workAt = Date.now();
  } else {
    // detail 없으면 작업 위치 정보 클리어(베이 미선택 등)
    payload.workEquip = null; payload.workBay = null; payload.workTier = null;
    payload.workRemain = null; payload.workAuto = null;
  }
  await update(ref(db, `inspectors/${name}`), payload);
}

// M5.62: 검수원 삭제 (관리자만 — UI에서 김성일만 호출)
export async function fbDeleteInspector(name) {
  if (!name) return;
  await remove(ref(db, `inspectors/${name}`));
}

// M5.74: 퇴사자 마커 (코드 명단 직원도 제외 가능)
export async function fbMarkDeletedStaff(name) {
  if (!name) return;
  await update(ref(db, `deletedStaff/${name}`), {
    name,
    deletedAt: Date.now(),
  });
}
export async function fbUnmarkDeletedStaff(name) {
  if (!name) return;
  await remove(ref(db, `deletedStaff/${name}`));
}
export function fbSubscribeDeletedStaff(callback) {
  const r = ref(db, 'deletedStaff');
  const unsub = onValue(r, (snap) => callback(snap.val() || {}));
  return unsub;
}

// M5.62: 직원 명단 동적 추가/삭제 (김성일만)
export async function fbAddStaff(name, role) {
  if (!name) return;
  await update(ref(db, `staffList/${name}`), {
    name,
    role: role || '검수',
    addedAt: Date.now(),
  });
}
export async function fbDeleteStaff(name) {
  if (!name) return;
  await remove(ref(db, `staffList/${name}`));
}
export function fbSubscribeStaffList(callback) {
  const r = ref(db, 'staffList');
  const unsub = onValue(r, (snap) => callback(snap.val() || {}));
  return unsub;
}

// 연결 상태
export function fbSubscribeConnection(callback) {
  const r = ref(db, '.info/connected');
  const unsub = onValue(r, (snap) => callback(!!snap.val()));
  return unsub;
}

// ─── 선박 라이브러리 (수석 검수 통계 자료) ───
// IMO 번호로 선박 식별 (절대 안 변함, 전 세계 유일)
// 한 번 분석된 선박 구조는 다음 항차에서 즉시 활용

// 선박 구조 저장 (전체 또는 일부 업데이트)
export async function fbSaveShipStructure(imo, structureData) {
  if (!imo) return;
  const r = ref(db, `ships/${imo}`);
  const snap = await get(r);
  const cur = snap.val() || {};
  await set(r, {
    ...cur,
    ...structureData,
    last_updated: Date.now(),
  });
}

// 선박 구조 조회
export async function fbGetShipStructure(imo) {
  if (!imo) return null;
  const snap = await get(ref(db, `ships/${imo}`));
  return snap.val() || null;
}

// 모든 선박 라이브러리 조회 (수석 대시보드용)
export function fbSubscribeShipLibrary(callback) {
  const r = ref(db, 'ships');
  const unsub = onValue(r, (snap) => callback(snap.val() || {}));
  return unsub;
}

// 분석된 항차 추가 (분석 이력)
// M6.15: inspector 정보도 함께 저장 — 항차 삭제되어도 ships 노드에 영구 보존
export async function fbAddShipVoyage(imo, voyageKey, voyageMeta) {
  if (!imo || !voyageKey) return;
  const r = ref(db, `ships/${imo}/voyages/${voyageKey}`);
  // 기존 데이터 보존 병합 (재업로드 시 inspectors 누적용)
  const snap = await get(r);
  const existing = snap.exists() ? snap.val() : {};
  // M7.15: 같은 항차 재업로드 = 그 mode 값으로 덮어쓰기(누적 X, 수정본 반영 O).
  //   단, 이번 업로드에 포함된 mode만 갱신하고 다른 mode는 기존 값 보존.
  //   voyageMeta._uploadKind: 'discharge' | 'loading' (이번 EDI가 양하인지 선적인지).
  //   예) 양하 EDI 재업로드 → discharge_ptk만 새 값으로 교체(480→정정 가능), loading_ptk는 그대로.
  const kind = voyageMeta._uploadKind;
  let dPtk = existing.discharge_ptk || 0;
  let lPtk = existing.loading_ptk || 0;
  if (kind === 'both') {                                              // 양하+선적 같이 올림 → 둘 다 덮어쓰기
    dPtk = voyageMeta.discharge_ptk || 0;
    lPtk = voyageMeta.loading_ptk || 0;
  } else if (kind === 'discharge') dPtk = voyageMeta.discharge_ptk || 0;  // 양하만 → 양하만 덮어쓰기(0 포함)
  else if (kind === 'loading') lPtk = voyageMeta.loading_ptk || 0;    // 선적만 → 선적만 덮어쓰기
  else {                                                              // mode 미지정(구버전 호환): >0인 쪽만 갱신
    if ((voyageMeta.discharge_ptk || 0) > 0) dPtk = voyageMeta.discharge_ptk;
    if ((voyageMeta.loading_ptk || 0) > 0) lPtk = voyageMeta.loading_ptk;
  }
  const meta = { ...voyageMeta };
  delete meta._uploadKind;
  await set(r, {
    ...existing,
    ...meta,
    discharge_ptk: dPtk,
    loading_ptk: lPtk,
    analyzed_by: voyageMeta.analyzed_by || existing.analyzed_by || '',
    analyzed_at: Date.now(),
  });
}

// M6.15: 컨테이너 검수 완료 시 ships 노드에 inspector 카운트 추가
//   동일 inspector 여러 컨 처리 시 카운트 증가
//   항차 삭제되어도 ships에 누적 보존됨
export async function fbAddShipVoyageInspector(imo, voyageKey, inspectorName, mode) {
  if (!imo || !voyageKey || !inspectorName) return;
  const r = ref(db, `ships/${imo}/voyages/${voyageKey}/inspectors/${inspectorName}`);
  const snap = await get(r);
  const cur = snap.exists() ? snap.val() : { count: 0, modes: {}, first_at: Date.now() };
  await set(r, {
    name: inspectorName,
    count: (cur.count || 0) + 1,
    modes: {
      ...cur.modes,
      [mode]: ((cur.modes && cur.modes[mode]) || 0) + 1,
    },
    first_at: cur.first_at || Date.now(),
    last_at: Date.now(),
  });
}

// 선박 통계 업데이트 (양하/선적 누적)
// M7.15: 통계는 업로드 매칭 시점에 fbAddShipVoyage가 voyages[key]에 기록한 값에서 합산만.
//   (완료/삭제 시 재집계 안 함 — 완료 버튼은 '확인'일 뿐. 이중 기록 방지.)
//   voyages 노드가 단일 진실 → stats는 항상 거기서 파생.
export async function fbAddShipStats(imo, stats, voyageKey) {
  if (!imo) return;
  const base = ref(db, `ships/${imo}`);
  const snap = await get(base);
  const cur = snap.val() || {};
  const voys = cur.voyages || {};

  // total은 모든 항차의 평택 대수를 합산 (voyages가 진실)
  let totalD = 0, totalL = 0;
  const voyKeys = Object.keys(voys);
  voyKeys.forEach(k => {
    totalD += voys[k]?.discharge_ptk || 0;
    totalL += voys[k]?.loading_ptk || 0;
  });

  await set(ref(db, `ships/${imo}/stats`), {
    total_discharge: totalD,
    total_loading: totalL,
    total_voyages: voyKeys.length,   // 항차 상세 건수와 항상 일치
    last_voyage_at: Date.now(),
  });
}

// M7.15: 모든 선박의 작업 통계(stats + voyages 집계)만 초기화. 베이 구조(structure)는 보존.
//   기존 잘못 쌓인 양하/선적 대수를 깨끗이 지우고 6월부터 다시 집계하기 위함.
//   ships/{imo}/structure, name, imo 등은 그대로 두고 stats/voyages만 제거.
export async function fbResetAllShipStats() {
  const snap = await get(ref(db, 'ships'));
  const all = snap.val() || {};
  let cleared = 0;
  for (const imo of Object.keys(all)) {
    await set(ref(db, `ships/${imo}/stats`), null);     // 누적 통계 제거
    await set(ref(db, `ships/${imo}/voyages`), null);   // 항차별 집계 제거
    cleared++;
  }
  return cleared;  // 초기화된 선박 수
}

// M7.15: 한 섹션(discharge 또는 loading)의 평택분 컨테이너 수.
//   discharge 섹션 = 양하 평택분, loading 섹션 = 선적 평택분. (pol 또는 pod가 평택)
//   M7.18b: 평택 판정을 isPyeongtaekPort 기준으로 통일 — PTK/PYT/PYOTM/PYO 변종 포괄.
//          (이전 endsWith('PTK')는 KRPYO/KRPYOTM 등을 누락시켜 통계 과소집계 위험)
function _isPtk(code) {
  return isPyeongtaekPort(code);
}
function _ptkCountOfSection(section, mode) {
  // V7.40: 평택분 판정 모드별 정확화 (지침 7.1·8.3 — 양하=POD평택, 선적=POL평택).
  //   이전: POL∨POD → 평택발 타항행/타항발 평택행이 양쪽에 이중 집계.
  if (!section || !section.ediContainers) return 0;
  const set = new Set();
  for (const c of Object.values(section.ediContainers)) {
    const isPtk = mode === 'discharge' ? _isPtk(c.pod)
      : mode === 'loading' ? _isPtk(c.pol)
      : (_isPtk(c.pol) || _isPtk(c.pod));
    if (isPtk) set.add(c.cn || JSON.stringify(c));
  }
  return set.size;
}

// M7.15: 현재 살아있는 항차(voyages)를 선박명별로 양하/선적 집계 (미리보기용, 저장 안 함).
//   한 항차에 양하·선적 둘 다 있으면 각각 더함. 반환: [{vsl, discharge, loading, voyages:[키...]}]
export function tallyVoyagesByShip(voyages) {
  const byShip = {};
  for (const [key, v] of Object.entries(voyages || {})) {
    const info = v.info || {};
    const vsl = (info.vsl || key.split('_')[0] || '(선박명 미상)').toUpperCase();
    // V8.09-12: vsl 자리에 항만코드(CNYNT=옌타이 등)가 잘못 저장된 항차는 별도 선박으로
    //   그룹핑하지 않는다. OBWH 항차의 목적항 코드가 vsl로 새어 수석대시보드에 OBWH와
    //   중복 카드(CNYNT)가 생기던 문제. 항만코드 그룹은 표시에서 제외(데이터는 보존).
    if (isPortCode(vsl)) continue;
    if (!byShip[vsl]) byShip[vsl] = { vsl, discharge: 0, loading: 0, voyageKeys: [] };
    byShip[vsl].discharge += _ptkCountOfSection(v.discharge, 'discharge');
    byShip[vsl].loading += _ptkCountOfSection(v.loading, 'loading');
    byShip[vsl].voyageKeys.push(key);
  }
  return Object.values(byShip).sort((a, b) => (b.discharge + b.loading) - (a.discharge + a.loading));
}


// 항차 삭제 전: 작업량을 선박 누적 통계에 100% 완료로 기록 (중복방지).
//   ships/{imo}/voyages/{key}/statsCounted 플래그로 한 항차당 1회만 집계.
//   삭제돼도 ships/{imo}/stats에 총 양하/선적 대수 영구 보존.
export async function fbArchiveVoyageBeforeDelete(imo, voyageKey, voyage) {
  if (!voyage) return false;
  // 양하/선적 평택분 컨테이너 수 집계 (변종 포함 기준)
  const countSection = (sec) => {
    if (!sec) return 0;
    const edi = sec.ediContainers;
    if (!edi || typeof edi !== 'object') return 0;
    let n = 0;
    for (const c of Object.values(edi)) {
      if (_isPtk(c.pol) || _isPtk(c.pod)) n++;
    }
    return n;
  };
  const discharge = countSection(voyage.discharge);
  const loading = countSection(voyage.loading);
  const info = voyage.info || {};
  // V8.43: vsl 폴백 등으로 같은 배가 다른 키에 갈라지지 않게 정식 키로 수렴.
  const shipId = resolveShipKey(imo || info.imo || info.callsign || (info.vsl ? info.vsl.toUpperCase().replace(/\s+/g, '') : ''));

  // ── M7.18b 핵심: 삭제 전 실제 데이터 전체를 archive 노드에 통째 백업 ──
  //   기존엔 개수(통계)만 ships에 기록하고 실데이터는 그냥 삭제됨 → 복구 불가였음.
  //   이제 records·ediContainers·info·xray 등 항차 전체를 archive/{voyageKey}에 복사.
  //   archive는 어떤 일반 쓰기 경로도 건드리지 않음(읽기/복원 전용 보관소).
  //   반환값: 백업 성공 true / 실패 false → 호출부(HomePage)는 true일 때만 삭제 진행.
  try {
    const archivePayload = {
      ...voyage,                       // 항차 데이터 전체(discharge/loading/info/records 등)
      _archivedAt: Date.now(),
      _archiveVersion: 1,
      _discharge_ptk: discharge,
      _loading_ptk: loading,
      _shipId: shipId || '',
    };
    await set(ref(db, `archive/${voyageKey}`), archivePayload);
    // 백업 검증: 다시 읽어 실제로 저장됐는지 확인 (검증 없는 삭제 금지 원칙)
    const verify = await get(ref(db, `archive/${voyageKey}/_archivedAt`));
    if (!verify.exists()) {
      console.error('[archive] 백업 검증 실패 — 삭제 중단:', voyageKey);
      return false;
    }
  } catch (e) {
    console.error('[archive] 백업 실패 — 삭제 중단:', voyageKey, e);
    return false;            // 백업 실패 시 false → 호출부가 삭제 안 함
  }

  // 통계 기록 (백업 성공 후). 기록할 작업량 없거나 선박 식별 불가여도 백업은 됐으므로 true.
  if (shipId && (discharge > 0 || loading > 0)) {
    await fbAddShipVoyage(shipId, voyageKey, {
      vsl: info.vsl || '',
      vslFull: info.vslFull || '',   // M7.24b: EDI 추출 풀네임 (보관소 선박명 표시용)
      callsign: info.callsign || '',
      imo: info.imo || '',
      // V8.84: 빈값이면 키 자체를 안 보냄 — 이전 기록의 항차를 빈 문자열로 덮지 않게.
      ...(info.voy_d ? { voy_d: info.voy_d } : {}),
      ...(info.voy_l ? { voy_l: info.voy_l } : {}),
      carrier: info.carrier || '',
      discharge_ptk: discharge,
      loading_ptk: loading,
      _uploadKind: (discharge > 0 && loading > 0) ? 'both' : discharge > 0 ? 'discharge' : 'loading',
      completed: true,
      completed_at: Date.now(),
      createdAt: info.createdAt || null,
    });
    await fbAddShipStats(shipId, {}, voyageKey);
  }
  return true;               // 백업 완료 — 호출부 삭제 진행 가능
}

// ── M7.18b: archive에서 항차 복원 ──
//   완료/자동삭제로 voyages에서 사라진 항차를 archive에서 되살림.
//   archive 메타(_로 시작하는 키)는 제거하고 원래 voyage 구조만 voyages/{key}로 복원.
export async function fbRestoreVoyageFromArchive(voyageKey) {
  const snap = await get(ref(db, `archive/${voyageKey}`));
  if (!snap.exists()) return false;
  const data = snap.val() || {};
  const restored = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === '_archivedAt' || k === '_archiveVersion' ||
        k === '_discharge_ptk' || k === '_loading_ptk' || k === '_shipId') continue;
    restored[k] = v;
  }
  await set(ref(db, `voyages/${voyageKey}`), restored);
  return true;
}

// ── M7.18b: archive 목록 조회 (복원 UI용) ──
export async function fbListArchive() {
  const snap = await get(ref(db, 'archive'));
  if (!snap.exists()) return [];
  const out = [];
  for (const [key, v] of Object.entries(snap.val() || {})) {
    const info = v.info || {};
    out.push({
      voyageKey: key,
      vsl: info.vsl || key.split('_')[0] || '',
      archivedAt: v._archivedAt || 0,
      discharge_ptk: v._discharge_ptk || 0,
      loading_ptk: v._loading_ptk || 0,
    });
  }
  return out.sort((a, b) => b.archivedAt - a.archivedAt);
}

// ── M7.18b: 1년 경과 archive 자동 정리 ──
//   완료된 항차는 감사 자료로 1년 보관 후 자동 삭제. 앱 시작 시 1회 호출 권장.
export async function fbCleanupArchive(maxAgeDays = 365) {
  const snap = await get(ref(db, 'archive'));
  if (!snap.exists()) return 0;
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let removed = 0;
  for (const [key, v] of Object.entries(snap.val() || {})) {
    const at = v._archivedAt || 0;
    if (at && at < cutoff) {
      await set(ref(db, `archive/${key}`), null);
      removed++;
    }
  }
  return removed;
}

// ─── M3.4: 답변 오답 신고 (검수원 → 다음 버전 개선용) ───
// /feedback/{ts} 노드에 저장
//   { ts, inspector, voyageKey, voyageVsl, query, answerType, answerText,
//     parsedSummary, userNote, appVersion, resolved }

export async function fbReportWrongAnswer(data) {
  const ts = Date.now();
  const r = ref(db, `feedback/${ts}`);
  await set(r, {
    ts,
    resolved: false,
    ...data,
  });
  return ts;
}

export function fbSubscribeFeedback(callback) {
  const r = ref(db, 'feedback');
  const unsub = onValue(r, (snap) => callback(snap.val() || {}));
  return unsub;
}

export async function fbResolveFeedback(ts, resolved = true) {
  const r = ref(db, `feedback/${ts}/resolved`);
  await set(r, !!resolved);
}

export async function fbDeleteFeedback(ts) {
  const r = ref(db, `feedback/${ts}`);
  await set(r, null);
}

// V8.02-02: 오답 리포트 '저금통 비우기' — 내보낸 ts 목록만 삭제(안 본 것 보호).
//   tsList 없으면 전체 비움. 내보내기 후 그 시점 목록만 넘겨 호출하는 것이 안전.
export async function fbClearFeedback(tsList = null) {
  if (Array.isArray(tsList)) {
    await Promise.all(tsList.map((ts) => set(ref(db, `feedback/${ts}`), null)));
    return tsList.length;
  }
  const snap = await get(ref(db, 'feedback'));
  const all = snap.exists() ? snap.val() : {};
  const keys = Object.keys(all);
  await set(ref(db, 'feedback'), null);
  return keys.length;
}

// M3.5.5: 엠티 실 부착/확인 (records의 eseal 관련 필드)
//   - eseal: 기본 엠티실번호 (verify=원래 부착된 실, attach=새로 부착한 실)
//   - eseal_wrong: 틀린 실 발견 시 그 번호 (verify 모드만)
//   - reseal: 리씰한 새 실번호 (verify 모드만, 다시 부착한 경우)
//   - eseal_at, eseal_by, eseal_mode
export async function fbSetEmptySeal(voyageKey, mode, cn, fields, by, sealMode) {
  // fields: { eseal, eseal_wrong, reseal }
  const eseal = String(fields.eseal || '').trim();
  const eseal_wrong = String(fields.eseal_wrong || '').trim();
  const reseal = String(fields.reseal || '').trim();

  const r = ref(db, `voyages/${voyageKey}/${mode}/records/${cn}`);
  const snap = await get(r);
  const cur = snap.val() || {};
  const oldEseal = cur.eseal || '';
  const oldWrong = cur.eseal_wrong || '';
  const oldReseal = cur.reseal || '';
  const eseal_orig = cur.eseal_orig != null ? cur.eseal_orig : oldEseal;

  const history = Array.isArray(cur.eseal_history) ? [...cur.eseal_history] : [];
  if (oldEseal !== eseal || oldWrong !== eseal_wrong || oldReseal !== reseal) {
    history.push({
      from: { eseal: oldEseal, wrong: oldWrong, reseal: oldReseal },
      to: { eseal, wrong: eseal_wrong, reseal },
      by: by || '', at: Date.now(), mode: sealMode,
    });
  }

  await update(r, {
    eseal, eseal_wrong, reseal,
    eseal_orig,
    eseal_at: Date.now(),
    eseal_by: by || '',
    eseal_mode: sealMode || '',
    eseal_history: history,
  });

  // ediContainers에도 즉시 반영
  const ediRef = ref(db, `voyages/${voyageKey}/${mode}/ediContainers/${cn}`);
  const ediSnap = await get(ediRef);
  if (ediSnap.exists()) {
    await update(ediRef, { eseal, eseal_wrong, reseal });
  }
}

// M3.5.6: 작업 보고 저장 (양하/선적/해치/콘박스/실오류/데미지)
export async function fbAddWorkReport(voyageKey, report) {
  const ts = Date.now();
  const r = ref(db, `voyages/${voyageKey}/reports/${ts}`);
  await set(r, {
    ...report,
    ts,
    created_at: new Date(ts).toISOString(),
  });
  return ts;
}

export function fbSubscribeWorkReports(voyageKey, callback) {
  const r = ref(db, `voyages/${voyageKey}/reports`);
  const unsub = onValue(r, (snap) => callback(snap.val() || {}));
  return unsub;
}

// 모든 항차 보고 (수석 대시보드용 - 최근 N건)
export function fbSubscribeAllReports(callback, limit = 100) {
  const r = ref(db, 'voyages');
  const unsub = onValue(r, (snap) => {
    const all = [];
    const voyages = snap.val() || {};
    Object.entries(voyages).forEach(([vk, v]) => {
      const reports = v?.reports || {};
      Object.entries(reports).forEach(([ts, rep]) => {
        all.push({ ...rep, voyageKey: vk, vsl: v?.info?.vsl, voy: v?.info?.voy_l || v?.info?.voy });
      });
    });
    all.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    callback(all.slice(0, limit));
  });
  return unsub;
}

// 사진 데이터 저장 (Firebase Realtime DB - base64, 작은 사진만)
//   대용량은 별도 Storage 권장이지만 일단 RTDB로
export async function fbAddPhotoReport(voyageKey, photoData, meta) {
  const ts = Date.now();
  const r = ref(db, `voyages/${voyageKey}/photos/${ts}`);
  await set(r, {
    ts,
    data: photoData,  // base64 string
    ...meta,
  });
  return ts;
}

// M4.9: ISO403 사진 저장 (컨테이너별 1장)
//   - photos 노드에 사진 저장 (기존과 동일)
//   - 컨테이너 records/ediContainers에 iso403_photo_ts, iso403_photo_url 마킹
//   - 동일 컨번호 재촬영 가능 (덮어쓰기, 이력은 photos에 누적)
export async function fbSaveISO403Photo(voyageKey, mode, cn, photoData, by) {
  const ts = Date.now();
  // 1) 사진 본체 저장
  const photoRef = ref(db, `voyages/${voyageKey}/photos/${ts}`);
  await set(photoRef, {
    ts,
    data: photoData,  // base64 string
    type: 'iso403',
    cn,
    by: by || '',
    voyageKey,
    mode,
  });
  // 2) records 마킹 (이력 보관)
  const recRef = ref(db, `voyages/${voyageKey}/${mode}/records/${cn}`);
  const recSnap = await get(recRef);
  const cur = recSnap.val() || {};
  const photoHistory = Array.isArray(cur.iso403_photo_history) ? [...cur.iso403_photo_history] : [];
  photoHistory.push({ ts, by: by || '' });
  await update(recRef, {
    iso403_photo_ts: ts,
    iso403_photo_by: by || '',
    iso403_photo_history: photoHistory,
  });
  // 3) ediContainers 마킹 (화면 즉시 반영)
  const ediRef = ref(db, `voyages/${voyageKey}/${mode}/ediContainers/${cn}`);
  const ediSnap = await get(ediRef);
  if (ediSnap.exists()) {
    await update(ediRef, {
      iso403_photo_ts: ts,
      iso403_photo_by: by || '',
    });
  }
  return ts;
}

// M4.9: ISO403 사진 삭제 (실수 등록 시 취소용)
export async function fbDeleteISO403Photo(voyageKey, mode, cn, photoTs) {
  // 사진 본체 삭제
  if (photoTs) {
    await set(ref(db, `voyages/${voyageKey}/photos/${photoTs}`), null);
  }
  // records 마킹 해제 — null 사용 시 RTDB가 필드 삭제
  const recRef = ref(db, `voyages/${voyageKey}/${mode}/records/${cn}`);
  await update(recRef, {
    iso403_photo_ts: null,
    iso403_photo_by: null,
  });
  const ediRef = ref(db, `voyages/${voyageKey}/${mode}/ediContainers/${cn}`);
  const ediSnap = await get(ediRef);
  if (ediSnap.exists()) {
    await update(ediRef, {
      iso403_photo_ts: null,
      iso403_photo_by: null,
    });
  }
}

// M3.5.6-fix: 테스트 데이터 삭제 함수들 (수석검수만 사용)
// 단일 보고 삭제
export async function fbDeleteWorkReport(voyageKey, ts) {
  await set(ref(db, `voyages/${voyageKey}/reports/${ts}`), null);
}

// 단일 사진 삭제
export async function fbDeletePhotoReport(voyageKey, ts) {
  await set(ref(db, `voyages/${voyageKey}/photos/${ts}`), null);
}

// 한 항차의 모든 작업 보고 삭제
export async function fbClearAllReports(voyageKey) {
  await set(ref(db, `voyages/${voyageKey}/reports`), null);
  await set(ref(db, `voyages/${voyageKey}/photos`), null);
}

// 모든 항차의 작업 보고 일괄 삭제 (테스트 정리용)
export async function fbClearAllReportsAllVoyages() {
  const snap = await get(ref(db, 'voyages'));
  const voyages = snap.val() || {};
  const ops = [];
  Object.keys(voyages).forEach(vk => {
    ops.push(set(ref(db, `voyages/${vk}/reports`), null));
    ops.push(set(ref(db, `voyages/${vk}/photos`), null));
  });
  await Promise.all(ops);
}

// 활성 작업 일괄 삭제 (테스트 정리용)
export async function fbClearAllActiveWork() {
  await set(ref(db, 'activeWork'), null);
}

// M5.21: PORT-MIS 데이터 구독 (Chrome 확장이 저장한 입출항 정보)
//   경로: port_mis_data/{호출부호} = { callsign, vesselName, port, eta, etd, ... }
//   사용: 항차 카드 상단에 입출항 시간 자동 표시 (호출부호로 매칭)
export function fbSubscribePortMis(callback) {
  const r = ref(db, 'port_mis_data');
  const unsub = onValue(r, (snap) => callback(snap.val() || {}));
  return unsub;
}

// M5.25: PORT-MIS 캡처 OCR 결과 일괄 저장 (Chrome 확장과 동일 구조)
//   폰에서 캡처 → OCR → 추출된 ships 배열을 Firebase port_mis_data에 PUT
//   key는 sanitized callsign. callsign 없으면 vesselName 사용 (안전망)
// M6.18: berth 검증 — utils.js의 isValidBerth와 동일 패턴
// M6.18c: 블랙리스트 방식 — 명백한 시설 코드(영문 대문자 3-5자)만 차단
function isValidBerthFb(b) {
  if (!b) return false;
  const s = String(b).trim();
  if (!s) return false;
  if (/^[ewEW]\d+$/.test(s)) return true;       // E7/W6 단축형 예외
  if (/^[A-Z]{3,5}$/.test(s)) return false;     // MBM/BCT 등 시설 코드
  if (s.length <= 2) return false;
  return true;
}

export async function fbSavePortMisBatch(ships) {
  if (!Array.isArray(ships) || ships.length === 0) return { saved: 0, failed: 0, cleaned: 0 };
  let saved = 0, failed = 0, cleaned = 0;
  const now = Date.now();
  // 1단계: 새 데이터 저장
  const newKeys = new Set();
  await Promise.all(ships.map(async (s) => {
    const rawKey = s.callsign || s.vesselName;
    if (!rawKey) { failed++; return; }
    const key = String(rawKey).replace(/[.#$/[\]\s'"]/g, '_').trim();
    if (!key) { failed++; return; }
    newKeys.add(key);
    try {
      // M6.18: 잘못된 berth 자동 제거 (MBM 등 시설 코드)
      //   확장 v1.0.0 / 옛 OCR / 옛 엑셀 파서 무관하게 저장 시점 차단
      const shipClean = { ...s };
      if (shipClean.berth && !isValidBerthFb(shipClean.berth)) {
        console.warn('[M6.18 berth] 잘못된 형식 제거:', shipClean.berth, '(key:', key, ')');
        shipClean.berth = '';
        shipClean.pier = '';   // pier도 무효화
      }
      await set(ref(db, `port_mis_data/${key}`), { ...shipClean, updatedAt: now });
      saved++;
    } catch (e) {
      console.error('[fbSavePortMisBatch] 저장 실패', key, e);
      failed++;
    }
  }));

  // M5.83: 2단계 — 같은 선박의 콜사인 prefix 변형 옛 키 자동 정리
  //   예: V7A545(옛) ↔ V7A5452(새) → V7A545 삭제
  //   같은 선박이지만 다른 키로 저장된 옛 데이터 박멸 (베이사전 콜사인 길이 불일치 등)
  try {
    const newCallsigns = ships
      .map(s => (s.callsign || '').toUpperCase().trim())
      .filter(cs => cs.length >= 4);
    if (newCallsigns.length > 0) {
      const snap = await get(ref(db, 'port_mis_data'));
      if (snap.exists()) {
        const all = snap.val() || {};
        await Promise.all(Object.entries(all).map(async ([oldKey, oldVal]) => {
          if (newKeys.has(oldKey)) return;  // 이번에 저장한 키는 보존
          if (!oldVal) return;
          const oldCs = (oldVal.callsign || oldKey).toUpperCase().trim();
          if (oldCs.length < 4) return;
          // prefix 충돌 검사: 새 콜사인 중 하나와 prefix 일치
          for (const newCs of newCallsigns) {
            if (oldCs === newCs) continue;
            if (oldCs.startsWith(newCs) || newCs.startsWith(oldCs)) {
              // 추가 안전 검사: vesselName 비슷한지 (전혀 다른 선박 보호)
              const newShip = ships.find(s => (s.callsign || '').toUpperCase().trim() === newCs);
              const oldVn = String(oldVal.vesselName || '').toUpperCase().replace(/\s+/g, '');
              const newVn = String(newShip?.vesselName || '').toUpperCase().replace(/\s+/g, '');
              const vnMatch = !oldVn || !newVn ||
                oldVn.includes(newVn.slice(0, 4)) || newVn.includes(oldVn.slice(0, 4));
              if (vnMatch) {
                try {
                  await remove(ref(db, `port_mis_data/${oldKey}`));
                  cleaned++;
                  console.log(`[M5.83 자동 정리] ${oldKey} (${oldCs}) → ${newCs}로 통합`);
                } catch (e) {
                  console.warn('[fbSavePortMisBatch] 자동 정리 실패', oldKey, e);
                }
                break;
              }
            }
          }
        }));
      }
    }
  } catch (e) {
    console.warn('[fbSavePortMisBatch] prefix 충돌 정리 단계 실패', e);
  }

  return { saved, failed, cleaned };
}

// M5.82 hotfix: PORT-MIS 데이터 항만 교체 (평택/인천/마산 등 동적)
// M5.83: 옛 데이터 식별 기준 완화 - port 필드 없는 옛 데이터도 자동 잡음
// M5.90: opts.port를 동적으로 받음 (인천 엑셀 올리면 인천만 교체, 평택 데이터 보존)
export async function fbReplacePortMisBatch(ships, opts = {}) {
  const targetPort = opts.port || '평택';
  let deleted = 0;
  // M5.90: 타겟 항만 식별 함수
  //   - 평택 타겟이면 빈 값/'알 수 없는 값'도 평택으로 (안전 디폴트)
  //   - 인천 등 다른 타겟이면 정확히 그 항만만
  const matchTarget = (port) => {
    const p = String(port || '').toUpperCase().trim();
    const t = targetPort.toUpperCase();
    if (t === '평택' || t === 'PYEONGTAEK') {
      if (!port) return true;
      if (p === '평택' || p === '평택항' || p === 'PYEONGTAEK' || p === 'PTK' || p === 'KRPTK' || p === '') return true;
      // 명확한 비-평택은 X
      if (p === '부산' || p === '인천' || p === '마산' || p === '울산' || p === '광양' ||
          p === 'BUSAN' || p === 'INCHEON' || p === 'MASAN' || p === 'ULSAN' || p === 'GWANGYANG') {
        return false;
      }
      return true;  // 알 수 없는 값도 평택 (안전 디폴트)
    }
    // 인천/부산 등 타겟: 정확히 매칭만
    if (t === '인천' || t === 'INCHEON') return p === '인천' || p === 'INCHEON' || p === 'KRINC';
    if (t === '부산' || t === 'BUSAN') return p === '부산' || p === 'BUSAN' || p === 'KRPUS';
    return p === t;  // 그 외는 정확 일치만
  };
  try {
    // 1) 기존 데이터에서 타겟 항만 삭제
    const snap = await get(ref(db, 'port_mis_data'));
    if (snap.exists()) {
      const all = snap.val() || {};
      await Promise.all(Object.entries(all).map(async ([k, v]) => {
        if (v && matchTarget(v.port)) {
          try {
            await remove(ref(db, `port_mis_data/${k}`));
            deleted++;
          } catch (e) {
            console.warn('[fbReplacePortMisBatch] 삭제 실패', k, e);
          }
        }
      }));
    }
  } catch (e) {
    console.error('[fbReplacePortMisBatch] 옛 데이터 조회 실패', e);
  }
  // 2) 새 데이터 저장 (prefix 충돌 정리는 fbSavePortMisBatch가 추가 처리)
  const result = await fbSavePortMisBatch(ships);
  return { ...result, deleted, targetPort };
}

export { db };

// ─── M5.88: Firebase 베이사전 동기화 (모든 검수원 공유) ───────────────────
// 노드: ship_bay_dict_v3/{code}
// 우선순위: Firebase v3 > localStorage userBayDict > shipBayDict_v2 (임베드)

/**
 * 베이사전에 항목 저장/갱신 (def 또는 EDI 자동 등록)
 * @param {string} code 선박 코드 (DPRT, SWRG 등)
 * @param {object} entry { code, name, callsign, imo, source, bayDef, ... }
 */
export async function fbSaveShipBayDict(code, entry) {
  if (!code || !entry) return false;
  // V9.05: 베이사전 쓰기 중앙 게이트 — 권한자(matrix_editors)만 저장 가능 (관리자 원칙)
  if (!gateBayDictWrite('Firebase 저장')) return false;
  const cleanCode = String(code).replace(/[.#$/[\]\s'"]/g, '_').trim();
  if (!cleanCode) return false;
  try {
    const r = ref(db, `ship_bay_dict_v3/${cleanCode}`);
    // 기존 데이터와 병합 (중요한 필드는 기존 보존)
    const snap = await get(r);
    const existing = snap.exists() ? snap.val() : {};

    // ── M6.94.20: userBayDict 절대 보호 (원칙 ①) ──────────────────────────
    //   기존 entry가 user 소스(매트릭스 빌더 직접 저장)이고,
    //   새로 들어오는 entry가 user 소스가 아니면(ASC/Stowage/PDF 자동본),
    //   bayDef·source·_userOwned·updatedBy를 기존(user) 값으로 유지한다.
    //   → 자동본이 user 매트릭스를 절대 덮어쓰지 못하게 한다.
    //   이전 결함: `bayDef: entry.bayDef || existing.bayDef` 가
    //   자동본 bayDef로 user 매트릭스를 덮어쓰던 재발 지점.
    const existingIsUser =
      existing?.source === 'user' || existing?.bayDef?.source === 'user' ||
      existing?._userOwned === true || existing?.bayDef?._userOwned === true;
    const entryIsUser =
      entry?.source === 'user' || entry?.bayDef?.source === 'user' ||
      entry?._userOwned === true || entry?.bayDef?._userOwned === true;

    if (existingIsUser && !entryIsUser) {
      // 보호: user 매트릭스 보존. 식별자(callsign/imo/name)만 빈 곳 보완 허용.
      const guarded = {
        ...existing,
        callsign: existing.callsign || entry.callsign || '',
        imo: existing.imo || entry.imo || '',
        name: existing.name || entry.name || '',
        // bayDef·source·_userOwned·updatedBy 모두 기존(user) 유지
      };
      await set(r, guarded);
      return true;
    }

    // 다기기 충돌: 양쪽 user인데 기존이 더 최신이면 덮어쓰지 않음
    if (existingIsUser && entryIsUser) {
      const exTs = Number(existing.updatedAt || existing.bayDef?.parsedAt || 0);
      const enTs = Number(entry.updatedAt || entry.bayDef?.parsedAt || Date.now());
      if (exTs > enTs) {
        return true; // 기존이 더 최신 → 보존
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    // V7.30: 선박명이 명백히 다르면 기존 콜사인은 다른 선박 것(오염) → 새 값으로 교체, 없으면 비움.
    //   (예: 기존 name=XIN TAI PING/callsign=BSDU 인데 새 EDI name=DONGJIN CONTINENTAL →
    //    BSDU는 DONGJIN 것이 아니므로 신뢰 불가. 정상 EDI는 콜사인이 비어 그냥 비워짐.)
    //   user 사전은 위 existingIsUser 분기에서 이미 보호되므로 여기 도달하지 않음.
    const _norm = s => String(s || '').toUpperCase().replace(/[\s\-_.]/g, '');
    const exName = _norm(existing.name), enName = _norm(entry.name);
    const nameConflict = exName.length >= 5 && enName.length >= 5
      && !exName.includes(enName.slice(0, 5)) && !enName.includes(exName.slice(0, 5));
    const mergedCallsign = nameConflict
      ? (entry.callsign || '')                       // 선박명 충돌 → 기존 콜사인 버림
      : (entry.callsign || existing.callsign || ''); // 같은 배 → 기존 보존

    const merged = {
      ...existing,
      ...entry,
      // 콜사인: 선박명 충돌 시 기존(오염) 버림. 아니면 기존 보존.
      callsign: mergedCallsign,
      imo: entry.imo || existing.imo || '',
      name: entry.name || existing.name || '',
      // bayDef는 새 데이터가 있으면 갱신 (def 파일 재업로드 케이스)
      bayDef: entry.bayDef || existing.bayDef || null,
      updatedAt: Date.now(),
      updatedBy: entry._inspector || entry.editorName || existing.updatedBy || '',
    };
    await set(r, merged);
    return true;
  } catch (e) {
    console.error('[fbSaveShipBayDict] 저장 실패', cleanCode, e);
    return false;
  }
}

/**
 * 베이사전 실시간 구독 (App.jsx에서 사용)
 */
export function fbSubscribeShipBayDict(callback) {
  const r = ref(db, 'ship_bay_dict_v3');
  const handler = onValue(r, snap => {
    callback(snap.exists() ? snap.val() : {});
  });
  return () => off(r, 'value', handler);
}

/**
 * 베이사전 단일 항목 삭제
 */
export async function fbDeleteShipBayDict(code) {
  // V9.05: 삭제도 수정 — 권한자만
  if (!gateBayDictWrite('Firebase 삭제')) return false;
  const cleanCode = String(code).replace(/[.#$/[\]\s'"]/g, '_').trim();
  if (!cleanCode) return false;
  try {
    await remove(ref(db, `ship_bay_dict_v3/${cleanCode}`));
    return true;
  } catch (e) {
    console.error('[fbDeleteShipBayDict] 삭제 실패', cleanCode, e);
    return false;
  }
}

/**
 * 베이사전 전체 일괄 저장 (마이그레이션용)
 */
export async function fbBatchSaveShipBayDict(entries) {
  if (!entries || typeof entries !== 'object') return { saved: 0, failed: 0 };
  let saved = 0, failed = 0;
  await Promise.all(Object.entries(entries).map(async ([code, entry]) => {
    const ok = await fbSaveShipBayDict(code, entry);
    if (ok) saved++; else failed++;
  }));
  return { saved, failed };
}

// ─── M6.94.20: 매트릭스 권한자 명단 (모든 기기 공유) ──────────────────────
//   노드: matrix_editors  (배열 형태로 검수자 이름 저장)
//   규칙: 명단에 있는 사람만 매트릭스 빌더 저장 + 명단 수정 가능
//   초기 권한자: 김성일 (명단이 비어있을 때 자동 시딩)
const MATRIX_EDITORS_NODE = 'matrix_editors';
const MATRIX_EDITORS_SEED = ['김성일'];

/**
 * 권한자 명단 조회 (1회성). 명단이 없으면 김성일로 시딩 후 반환.
 * @returns {Promise<string[]>}
 */
export async function fbGetMatrixEditors() {
  try {
    const r = ref(db, MATRIX_EDITORS_NODE);
    const snap = await get(r);
    if (!snap.exists()) {
      // 최초 1회 시딩
      await set(r, MATRIX_EDITORS_SEED);
      return [...MATRIX_EDITORS_SEED];
    }
    const val = snap.val();
    const list = Array.isArray(val) ? val : Object.values(val || {});
    return list.map(n => String(n).trim()).filter(Boolean);
  } catch (e) {
    console.error('[fbGetMatrixEditors] 조회 실패', e);
    // 네트워크 실패 시 안전 기본값 (시드)
    return [...MATRIX_EDITORS_SEED];
  }
}

/**
 * 권한자 명단 실시간 구독.
 * 명단이 비어있으면 시드값으로 시딩한다.
 * @param {(editors: string[]) => void} callback
 * @returns {() => void} unsubscribe
 */
export function fbSubscribeMatrixEditors(callback) {
  const r = ref(db, MATRIX_EDITORS_NODE);
  const handler = onValue(r, snap => {
    if (!snap.exists()) {
      set(r, MATRIX_EDITORS_SEED).catch(() => {});
      callback([...MATRIX_EDITORS_SEED]);
      return;
    }
    const val = snap.val();
    const list = Array.isArray(val) ? val : Object.values(val || {});
    callback(list.map(n => String(n).trim()).filter(Boolean));
  });
  return () => off(r, 'value', handler);
}

/**
 * 권한자 명단 전체 교체 저장.
 *   actor(요청자)가 현재 명단에 있어야만 수정 가능 (명단에 있는 사람만 명단 수정).
 *   명단이 비어있으면(최초) 시드 기준으로 권한 판정.
 * @param {string} actor - 수정을 시도하는 현재 검수자 이름
 * @param {string[]} nextEditors - 새 명단
 * @returns {Promise<{ok:boolean, reason?:string}>}
 */
export async function fbSetMatrixEditors(actor, nextEditors) {
  const actorName = String(actor || '').trim();
  if (!actorName) return { ok: false, reason: 'no_actor' };
  try {
    const current = await fbGetMatrixEditors();
    const allowed = current.length === 0 ? MATRIX_EDITORS_SEED : current;
    if (!allowed.includes(actorName)) {
      return { ok: false, reason: 'not_authorized' };
    }
    // 정규화: 트림 + 중복 제거 + 빈 값 제거
    const cleaned = [...new Set(
      (nextEditors || []).map(n => String(n).trim()).filter(Boolean)
    )];
    // 안전장치: 명단을 완전히 비우지 못하게 (잠금 방지)
    if (cleaned.length === 0) {
      return { ok: false, reason: 'empty_not_allowed' };
    }
    await set(ref(db, MATRIX_EDITORS_NODE), cleaned);
    return { ok: true };
  } catch (e) {
    console.error('[fbSetMatrixEditors] 저장 실패', e);
    return { ok: false, reason: 'fb_error' };
  }
}

// ─── V9.05: 관리자 이름 보호 (admin_guard) ────────────────────────────────
//   노드: admin_guard = { pwHash, salt, devices: { [devId]: { label, addedAt } } }
//   김성일 선택: 신뢰 기기(최대 3대)는 무비번, 그 외 기기는 비밀번호 검증.
export async function fbGetAdminGuard() {
  try {
    const snap = await get(ref(db, 'admin_guard'));
    return snap.exists() ? snap.val() : null;
  } catch (e) {
    console.error('[fbGetAdminGuard] 조회 실패', e);
    return null;
  }
}

/** 부분 갱신 (pwHash/salt 설정, devices/{id} 추가 등) */
export async function fbUpdateAdminGuard(patch) {
  try {
    await update(ref(db, 'admin_guard'), patch || {});
    return true;
  } catch (e) {
    console.error('[fbUpdateAdminGuard] 저장 실패', e);
    return false;
  }
}

/** 신뢰 기기 해제 */
export async function fbRemoveAdminDevice(devId) {
  if (!devId) return false;
  try {
    await remove(ref(db, `admin_guard/devices/${devId}`));
    return true;
  } catch (e) {
    console.error('[fbRemoveAdminDevice] 삭제 실패', e);
    return false;
  }
}

/**
 * M6.10: 전체 데이터 백업 — Firebase 전체 루트를 JSON으로 export
 *   사용: 관리자만 (StaffManagerModal에서 트리거)
 *   결과: voyages, inspectors, shipBayDict, shipPolicies 등 전체 데이터
 */
export async function fbBackupAll() {
  const snap = await get(ref(db, '/'));
  return snap.val() || {};
}


// ─── M6.17: 부두 좌표 공유 (검수원이 현장에서 등록) ───
// 노드: pier_coords/{PCTC|PNCT}
//   { lat, lng, name, registeredBy, registeredAt }
export async function fbSavePierCoord(code, coord) {
  if (!code || !coord) return null;
  const r = ref(db, `pier_coords/${code}`);
  await set(r, {
    ...coord,
    registeredAt: Date.now(),
  });
  return coord;
}

export function fbSubscribePierCoords(callback) {
  const r = ref(db, 'pier_coords');
  return onValue(r, (snap) => {
    callback(snap.val() || {});
  });
}

export async function fbGetPierCoords() {
  const r = ref(db, 'pier_coords');
  const snap = await get(r);
  return snap.val() || {};
}


// ── V8.60 맛집 수첩 — 평택항 주변 식당 공유(foodSpots/{id}) ──
// 구조: {name, cat, tel, area, tags[], note, addedBy, ts, ratings:{검수사:1~5}, comments:{key:{by,text,ts}}}
export function fbFoodListen(cb) {
  const r = ref(db, 'foodSpots');
  const h = onValue(r, (snap) => {
    const v = snap.val() || {};
    cb(Object.fromEntries(Object.entries(v).filter(([k]) => !k.startsWith('_'))));
  }, () => cb({}));
  return () => off(r, 'value', h);
}

export async function fbAddFoodSpot(spot, inspector) {
  const r = push(ref(db, 'foodSpots'));
  await set(r, { ...spot, addedBy: inspector || '', ts: Date.now() });
  return r.key;
}

export async function fbDeleteFoodSpot(id) {
  await remove(ref(db, `foodSpots/${id}`));
}

export async function fbRateFoodSpot(id, inspector, score) {
  if (!inspector) return;
  await set(ref(db, `foodSpots/${id}/ratings/${inspector}`), score);
}

export async function fbCommentFoodSpot(id, inspector, text) {
  const r = push(ref(db, `foodSpots/${id}/comments`));
  await set(r, { by: inspector || '', text: String(text || '').slice(0, 100), ts: Date.now() });
}

// 시드 1회 주입 — foodSpots/{flag} 플래그로 중복 방지(여러 폰 동시 접속 대비 최소 방어).
// V8.61: flagKey 매개변수 — 시드 2차(_seeded_w2)도 같은 함수로 1회 주입.
export async function fbSeedFoodSpotsOnce(seeds, flagKey = '_seeded') {
  try {
    const flag = await get(ref(db, `foodSpots/${flagKey}`));
    if (flag.exists()) return false;
    await set(ref(db, `foodSpots/${flagKey}`), Date.now());
    for (const sd of (seeds || [])) {
      const { id, ...rest } = sd;
      await set(ref(db, `foodSpots/${id}`), { ...rest, addedBy: '시드', ts: Date.now() });
    }
    return true;
  } catch (e) { return false; }
}

// ── V9.18: 선박 소개 캐시 — AI로 1회 생성해 전 검수원 공유. ship_intros/{shipId} ──
export async function fbGetShipIntro(shipId) {
  if (!shipId) return null;
  const snap = await get(ref(db, `ship_intros/${shipId}`));
  return snap.exists() ? snap.val() : null;
}
export async function fbSaveShipIntro(shipId, text, by) {
  if (!shipId || !text) return false;
  await set(ref(db, `ship_intros/${shipId}`), { text: String(text).slice(0, 2000), by: by || '', at: Date.now() });
  return true;
}
