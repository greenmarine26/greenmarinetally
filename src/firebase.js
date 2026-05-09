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
  const handler = onValue(r, (snap) => callback(snap.val() || {}));
  return () => off(r);
}

// 분석된 항차 추가 (분석 이력)
export async function fbAddShipVoyage(imo, voyageKey, voyageMeta) {
  if (!imo || !voyageKey) return;
  const r = ref(db, `ships/${imo}/voyages/${voyageKey}`);
  await set(r, {
    ...voyageMeta,
    analyzed_at: Date.now(),
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
  const handler = onValue(r, (snap) => callback(snap.val() || {}));
  return () => off(r);
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
  const handler = onValue(r, (snap) => callback(snap.val() || {}));
  return () => off(r);
}

// 모든 항차 보고 (수석 대시보드용 - 최근 N건)
export function fbSubscribeAllReports(callback, limit = 100) {
  const r = ref(db, 'voyages');
  const handler = onValue(r, (snap) => {
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
  return () => off(r);
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

export { db };
