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
export async function fbCompleteContainer(voyageKey, mode, cn, by) {
  await set(ref(db, `voyages/${voyageKey}/${mode}/completed/${cn}`), {
    by, at: Date.now()
  });
}
export async function fbCancelComplete(voyageKey, mode, cn) {
  await remove(ref(db, `voyages/${voyageKey}/${mode}/completed/${cn}`));
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

// M3.87: 컨테이너 위치 재배정 (선적 모드용)
//   - 새 위치(bay/row/tier)로 이동
//   - 새 위치에 다른 컨이 있으면 그 컨은 미배정 처리(bay 빈 값) + 완료 취소
//   - 이력 추적 (edits.bay, edits.row, edits.tier)
//   - 빈 문자열로 새 위치를 주면 → 미배정으로 변경
//
// 반환: { ok: true, displaced?: <빠진 컨번호> }
export async function fbReassignContainerPosition(voyageKey, mode, cn, newBay, newRow, newTier, by) {
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

  // 2) 충돌 컨이 있으면 그 컨을 미배정 처리 + 완료 취소
  if (displaced) {
    await _updatePositionFields(voyageKey, mode, displaced, '', '', '', by);
    await remove(ref(db, `voyages/${voyageKey}/${mode}/completed/${displaced}`));
  }

  // 3) target 컨 위치 변경
  await _updatePositionFields(voyageKey, mode, cn, newBay, newRow, newTier, by);

  return { ok: true, displaced };
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
    lastActive: Date.now()
  });
}
export function fbSubscribeInspectors(callback) {
  const r = ref(db, 'inspectors');
  const unsub = onValue(r, (snap) => callback(snap.val() || {}));
  return unsub;
}
export async function fbSetInspectorActivity(name, voyageKey, mode) {
  await update(ref(db, `inspectors/${name}`), {
    lastActive: Date.now(),
    lastVoyage: voyageKey || null,
    lastMode: mode || null,
  });
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
  await set(r, {
    ...existing,
    ...voyageMeta,
    // M6.15: 분석한 검수원(EDI 업로더) 기본 기록
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
export async function fbAddShipStats(imo, stats) {
  if (!imo) return;
  const r = ref(db, `ships/${imo}/stats`);
  const snap = await get(r);
  const cur = snap.val() || { total_discharge: 0, total_loading: 0, total_voyages: 0 };
  await set(r, {
    total_discharge: (cur.total_discharge || 0) + (stats.discharge || 0),
    total_loading: (cur.total_loading || 0) + (stats.loading || 0),
    total_voyages: (cur.total_voyages || 0) + 1,
    last_voyage_at: Date.now(),
  });
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
//   여기에 둠 (utils 순환 import 피하기 위해)
function isValidBerthFb(b) {
  if (!b) return false;
  const s = String(b).trim();
  if (!s) return false;
  return /[동서남북]부두|\d+번선석|컨테이너|^[ewEW]\d+$/.test(s);
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
  const cleanCode = String(code).replace(/[.#$/[\]\s'"]/g, '_').trim();
  if (!cleanCode) return false;
  try {
    const r = ref(db, `ship_bay_dict_v3/${cleanCode}`);
    // 기존 데이터와 병합 (중요한 필드는 기존 보존)
    const snap = await get(r);
    const existing = snap.exists() ? snap.val() : {};
    const merged = {
      ...existing,
      ...entry,
      // 콜사인/IMO는 기존이 있고 새 값이 비어있으면 기존 보존
      callsign: entry.callsign || existing.callsign || '',
      imo: entry.imo || existing.imo || '',
      name: entry.name || existing.name || '',
      // bayDef는 새 데이터가 있으면 갱신 (def 파일 재업로드 케이스)
      bayDef: entry.bayDef || existing.bayDef || null,
      updatedAt: Date.now(),
      updatedBy: entry._inspector || existing.updatedBy || '',
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
