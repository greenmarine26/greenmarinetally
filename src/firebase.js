// Firebase Realtime Database — Master V1
// 프로젝트: greenmarinetally (asia-southeast1)
import { initializeApp } from 'firebase/app';
import {
  getDatabase, ref, onValue, push, set, update, remove, get, child, off, goOffline, goOnline
} from 'firebase/database';
import { gateBayDictWrite } from './bayDictGuard.js';   // V9.05: 베이사전 쓰기 중앙 게이트
// M6.40: STOWAGE PDF 보관 — Firebase Storage
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject, listAll
} from 'firebase/storage';
import { isPyeongtaekPort, isPortCode, resolveShipKey, isPyeongtaekPortName } from './utils.js';   // 1.40-01: 타항 저장 차단
import { activityDayKey, pickExpiredActivityBuckets } from './activityLog.js';   // TallyOne 1.3: 활동 로그 버킷 키(단일 소스)
import { isAdminName } from './adminGuard.js';   // 1.41: dev_access 저장 권한 확인(관리자만). 순환 없음 — adminGuard 는 staffList 만 부른다

const firebaseConfig = {
  apiKey: "AIzaSyBE4lC78w6jl8uVELrj1Jjsl7AVkvVVQBY",
  authDomain: "greenmarinetally.firebaseapp.com",
  databaseURL: "https://greenmarinetally-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "greenmarinetally",
  storageBucket: "greenmarinetally.firebasestorage.app",
  messagingSenderId: "981192728666",
  appId: "1:981192728666:web:c74f0e1a26c1f91039b863"
};

export const app = initializeApp(firebaseConfig);   // TallyOne 1.20: push.js 가 messaging 초기화에 쓴다
const db = getDatabase(app);
const storage = getStorage(app);  // M6.40

// === M6.40: STOWAGE PDF 보관 ===
// V9.57(G14): 참조 0인 죽은 export 삭제 — fbCleanupExpiredStowagePdfs·fbDeleteStowagePdf
//   (저장소 전체 grep으로 호출부 없음 확인, 2026-08-03).

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
// V9.57(G1): update(voyageRef, { info })는 info 자식 전체를 통째로 교체해, 수집기가 먼저 채운
//   terminalStatus·planDate·planSrc·forecast·departBadgeAt·autoRegistered 등이 증발했다.
//   이미 있는 항차면 info 하위 경로에 부분 병합(update)으로 전환 — 기존 필드 보존.
//   신규 항차면 현행대로 통째 생성. 호출부(HomePage 338, MixerUploadModal 430) 시그니처 불변.
export async function fbCreateVoyage(voyageKey, info) {
  const infoRef = ref(db, `voyages/${voyageKey}/info`);
  const snap = await get(infoRef);
  if (snap.exists()) {
    await update(infoRef, info);          // 부분 병합 — 수집기 필드 보존
  } else {
    await update(voyageRef(voyageKey), { info });   // 신규 생성 — 기존 동작
  }
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

// TallyOne 1.54: **풀 컨테이너 시퀀스 작업인지는 항차 속성이다.** (검수사 확정 2026-08-12)
//   원문 — *"선적을 하기 전에 묻습니다. 풀 컨테이너 시퀀스 작업인지 아닌지를.
//   엠티는 안 묻는 이유는 포트만 바뀌지 않으면 언제든 액츄얼이 가능하기 때문입니다."*
//   앞선 판은 자연어 탭의 자동/수동(`opts.actualWork`)을 시퀀스/액츄얼로 잘못 읽었다.
//   자동/수동은 **가이드를 받을지 말지**이고, 시퀀스/액츄얼은 **일항사가 정하는 적재 방침**이다. 별개다.
//   ⛔ info 는 PATCH 원칙이다 — 통째 교체 금지(수집기가 채운 필드가 증발한다).
//   값이 없으면 **액츄얼**로 본다. 현장 대부분이 액츄얼이고, 모르면 안 막는 쪽이 안전하다.
//   읽기는 따로 두지 않는다 — 화면은 이미 항차 구독으로 `info` 를 통째로 받는다.
export async function fbSetSeqFull(voyageKey, v, by) {
  if (!voyageKey) return;
  await update(ref(db, `voyages/${voyageKey}/info`), {
    seqFull: !!v,
    seqFullAt: Date.now(),
    seqFullBy: by || '',
  });
}

// ── TallyOne 1.55: **작업 모드는 두 갈래가 아니라 세 갈래다.** ──────────────
//   1.54 의 `seqFull` 은 참/거짓 둘뿐이라 *"풀만 시퀀스"* 와 *"풀·엠티 둘 다 시퀀스"* 를 구분 못 했다.
//   `info.seqMode` 로 셋을 명시한다:
//     · 'fullSeq'     — 풀·엠티 **둘 다** 시퀀스. 남의 계획 자리를 뺏으려면 풀이든 엠티든 되묻는다.
//     · 'fullOnlySeq' — **풀만** 시퀀스(엠티는 액츄얼). 1.54 의 `seqFull:true` 와 같은 뜻이다.
//     · 'allActual'   — 풀·엠티 **둘 다** 액츄얼. 안 묻고 바로 내준다.
//   ⛔ info 는 PATCH 원칙이다 — 통째 교체 금지(수집기가 채운 필드가 증발한다).
export const SEQ_MODES = ['fullSeq', 'fullOnlySeq', 'allActual'];

// 하위호환 읽기 — 옛 항차는 `seqMode` 가 없고 `seqFull` 만 있다.
//   `seqFull===true → 'fullOnlySeq'`, `false → 'allActual'`, 둘 다 없으면 **미정(null)**.
//   ⚠ 미정을 여기서 임의로 메우지 않는다 — "안 물어봤다"와 "액츄얼로 답했다"는 다른 상태다.
//     안 막는 쪽(액츄얼)으로 볼지는 **쓰는 쪽**이 정한다.
export function resolveSeqMode(info) {
  if (!info) return null;
  const m = String(info.seqMode || '').trim();
  if (SEQ_MODES.includes(m)) return m;
  const v = info.seqFull;
  if (v === true || v === 'true' || v === 1) return 'fullOnlySeq';
  if (v === false || v === 'false' || v === 0) return 'allActual';
  return null;
}

// 저장 — 세 갈래를 `info/seqMode` 에 쓰고, 옛 화면·옛 코드가 읽는 `seqFull` 도 같이 맞춘다.
//   `fullSeq`·`fullOnlySeq` → `seqFull:true` / `allActual` → `seqFull:false`.
//   (`seqFull` 하나만 보는 곳은 「시퀀스인가 아닌가」만 알면 되므로 이 대응으로 손실이 없다.)
// 1.56: 선박별 작업 모드 기억. ⚠ 1.56-01 정정(검수사) — *"상황에 따라 틀려집니다. 선박당 1회는
//   매항차마다 물어야 합니다."* 자동 적용 금지. 이 값은 **질문 카드의 추천 표시**에만 쓴다.
//   노드: ship_prefs/{선박약자}/seqMode.
export async function fbSetShipSeqPref(vsl, mode3, by) {
  const v = String(vsl || '').trim();
  if (!v || !SEQ_MODES.includes(mode3)) return;
  await update(ref(db, `ship_prefs/${v}`), { seqMode: mode3, seqModeBy: by || '', seqModeAt: Date.now() });
}
export async function fbGetShipSeqPref(vsl) {
  const v = String(vsl || '').trim();
  if (!v) return null;
  try {
    const s = await get(ref(db, `ship_prefs/${v}/seqMode`));
    const m = s.val();
    return SEQ_MODES.includes(m) ? m : null;
  } catch { return null; }
}

export async function fbSetVoyageSeqMode(voyageKey, mode3, by) {
  if (!voyageKey) return;
  const m = SEQ_MODES.includes(String(mode3)) ? String(mode3) : null;
  if (!m) throw new Error(`seqMode must be one of ${SEQ_MODES.join('|')} — got ${mode3}`);
  await update(ref(db, `voyages/${voyageKey}/info`), {
    seqMode: m,
    seqFull: (m !== 'allActual'),   // 하위호환 — 옛 화면이 이 값을 읽는다
    seqFullAt: Date.now(),
    seqFullBy: by || '',
  });
}

// 양하/선적 섹션 데이터 저장 (mode = 'discharge' | 'loading')
export async function fbSaveSectionData(voyageKey, mode, data) {
  await update(sectionRef(voyageKey, mode), data);
}

// EDI 컨테이너 저장 (객체로: { cn1: {...}, cn2: {...} } 구조)
// M3.5.3: 큰 데이터는 청크 분할 (set 통째 → set+update 분할)
//   - 504대 set() 한 번에 = 5~30초 (Firebase가 모든 child 검증)
//   - 50대씩 분할 = 1~2초 (트랜잭션 한도 회피)
/**
 * TallyOne 1.13: **자료 갱신 시각** 기록 — 홈 카드가 "언제 자료가 들어왔나"를 보여주려면 필요하다.
 *   대상은 **EDI와 리스트뿐**이다(검수사 확정 2026-08-06: "EDI + 리스트 100매칭까지.
 *   그러면 관리자가 X-RAY 리스트·선적 보충자료 추가 작업합니다"). X-RAY는 확정 뒤 붙는 것이라 안 센다.
 *   실패해도 저장 자체를 막지 않는다 — 표시용 부가 정보다. 다만 조용히 넘기지 않고 경고는 남긴다.
 */
async function _touchDataAt(voyageKey, mode) {
  try { await set(ref(db, `voyages/${voyageKey}/${mode}/dataAt`), Date.now()); }
  catch (e) { console.warn('[dataAt] 자료 갱신 시각 기록 실패 —', voyageKey, mode, e); }
}

export async function fbSaveEdiContainers(voyageKey, mode, containersObj) {
  await chunkedReplace(`voyages/${voyageKey}/${mode}/ediContainers`, containersObj);
  await _touchDataAt(voyageKey, mode);
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
// TallyOne 1.8: 리스트 재업로드가 **현장 입력을 지우지 못하게** 병합해서 저장한다.
//
//   사고 (검수사 발견 2026-08-04) — "앱이 저장을 할때 병합 저장하면 틀린것만 남을텐데
//   완전 교체 하는것 같습니다. 그래서 제가 다시 저장함"
//   종전엔 chunkedReplace(=set) 로 records 노드를 통째 갈아엎었다. 그래서 온도 열이 없는
//   리스트를 한 번 올리면 있던 리퍼 온도가 ""로 덮여 사라졌다.
//   실증: TNJP 26355E SEKU9206423 — archive 13:09 스냅샷 tmp:"" tmp_missing:true wt:0,
//         검수사가 리스트를 다시 올린 뒤 tmp:"-18" wt:14937. 반대 방향으로도 똑같이 날아간다.
//   같은 방식으로 실번호 수정 이력·엠티실·리퍼 확인값(rfSet/rfAct)도 전부 소실된다.
//
//   규칙 셋:
//     ① 새 값이 비어 있으면 기존 값을 유지한다 (빈칸으로 덮지 않는다).
//     ② 현장 입력 전용 필드는 리스트가 아예 못 덮는다 (KEEP).
//     ③ 새 리스트에 없는데 검수 흔적이 있는 컨은 지우지 않는다 — 조용히 사라지면 안 된다.
// ⚠ `sl_orig` 는 여기 넣으면 안 된다 (1.8-02에서 제거).
//   파서는 sl 과 sl_orig 를 **같은 값**으로 넣는다(utils.js:2258). 그래서 sl_orig 를 보존하고
//   sl 만 새 리스트로 갱신하면, 검수원이 고친 적도 없는데 `sl ≠ sl_orig` 가 되어
//   화면이 **실오류(세관 신고 대상)** 로 띄운다.
//   실측 사고 2026-08-04 — STMJ 2643E `SKHU8912132`: 선사 리스트 뒤에 세관 CDL이 올라오자
//   `sl:482869 / sl_orig:549844 / sl_history 없음`. EDI 에는 실번호가 아예 없어 EDI 탓도 아니다.
//   → sl·sl_orig 는 **검수원이 실제로 고친 흔적(sl_history)이 있을 때만** 통째로 지킨다.
const _FIELD_WORK_KEYS = [
  'sl_history',                     // 실번호 수정 이력 (sl·sl_orig 는 아래에서 조건부로 지킨다)
  'eseal', 'eseal_orig',            // 엠티 실
  'rfSet', 'rfAct', 'rfSrc', 'rfCheckedAt', 'rfCheckedBy',   // 리퍼 온도 확인(1.8)
  'iso403', 'photo', 'photos', 'mkcon', 'memo',
];
const _isEmptyVal = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
// 값이 0이면 '없음'인 필드. 컨 무게 0은 실제 무게가 아니라 리스트에 그 열이 없었다는 뜻이다.
//   (실측: TNJP 26355E SEKU9206423 이 wt:0 으로 저장돼 있었고 재업로드 후 14937 이 됐다)
const _ZERO_IS_EMPTY = new Set(['wt']);
const _emptyFor = (k, v) => _isEmptyVal(v) || (_ZERO_IS_EMPTY.has(k) && Number(v) === 0);

// ⚠ '검수 흔적' 판정은 KEEP 목록과 다르다.
//   sl_orig·mkcon 은 리스트 업로드가 자동으로 붙이는 값이라 흔적이 아니다. 그걸 흔적으로 세면
//   리스트에서 빠진 컨이 영영 안 지워지고 재업로드마다 죽은 컨이 쌓인다(시뮬 2026-08-04에서 잡음).
// TallyOne 1.69-09(2026-08-14): eseal 도 같은 성격이었다 — 위 경고가 예언한 그대로 터졌다.
//   검수사 신고 — *"파일을 교체하면 전껄 무시하고 새걸로 등록해야 하는데 231개 있는데다
//   223개로 교체했는데 231개 그대로임"*. 실측 OBWH 2713E 선적: 231 = 223 + 8, 그 8대에
//   `_keptNotInList:true` 가 붙어 있었고 흔적은 전부 `eseal:"W"` 한 글자였다.
//   그런데 8대 모두 `eseal === eseal_orig` — **검수원이 고친 적이 없다.** 이 항차 231대 중
//   `eseal !== eseal_orig` 는 0건. 리스트가 자동으로 채운 값을 손댄 기록으로 착각한 것이다.
//   검수사는 결국 **항차를 통째로 지우고 다시 등록**해야 했다(가드 없는 위험한 우회).
//   → 실번호와 같은 규칙으로 바꾼다: 값이 있으면이 아니라 **고쳤으면** 흔적이다.
const _FIELD_WORK_SIGNS = ['sl_history', 'rfCheckedAt', 'rfSet', 'rfAct', 'iso403', 'photo', 'photos', 'memo'];
function _hasFieldWork(o) {
  if (!o) return false;
  if (Array.isArray(o.sl_history) && o.sl_history.length) return true;
  // 1.69-09: 엠티 실은 리스트·EDI 파서가 자동으로 채운다(autoRegApi.js:294 `if (c.eseal) rec.eseal = c.eseal`).
  //   값 존재만으로는 흔적이 아니고, **검수원이 실제로 고쳤을 때만** 흔적이다.
  //   eseal_orig 가 아예 없는데 eseal 만 있으면 = 파서가 안 채운 것을 사람이 넣은 것 → 흔적으로 지킨다.
  if (!_isEmptyVal(o.eseal)) {
    const _eo = o.eseal_orig;
    if (_isEmptyVal(_eo) || String(o.eseal).trim() !== String(_eo).trim()) return true;
  }
  for (const k of _FIELD_WORK_SIGNS) {
    if (k === 'sl_history') continue;
    if (!_isEmptyVal(o[k])) return true;
  }
  return false;
}

export async function fbSaveListRecords(voyageKey, mode, recordsObj) {
  const path = `voyages/${voyageKey}/${mode}/records`;
  let cur = {};
  try { cur = (await get(ref(db, path))).val() || {}; }
  catch (e) { console.warn('[리스트 저장] 기존 records 읽기 실패 — 병합 없이 저장합니다:', e); }

  const out = {};
  for (const [cn, nv] of Object.entries(recordsObj || {})) {
    const ov = cur[cn];
    if (!ov) { out[cn] = nv; continue; }
    const m = { ...ov };
    // TallyOne 1.8-03: 리스트끼리 **실번호가 다르면 조용히 덮지 않고 기록**한다.
    //   실증 2026-08-04 STMJ 2643E `SKHU8912132` — 같은 BL(SNKO024260703119) 같은 컨인데
    //     선사 리스트 `482869` / 세관 CDL `549844`. **자료가 실제로 어긋나 있었다.**
    //   1.8-02 로 실오류 오탐은 막았지만 그 바람에 이 어긋남까지 조용해졌다. 그건 더 나쁘다.
    //   ⚠ 이것은 '실오류'가 아니다 — 실물 봉인을 본 사람이 없다. 검수 전에 확인할 신호다.
    if (nv && nv.sl && ov.sl && String(nv.sl).trim() !== String(ov.sl).trim()) {
      const hist = Array.isArray(ov.sl_conflict) ? [...ov.sl_conflict] : [];
      // 2.06-07 (검수사 «같은 리스트에서 다른 실번호라는 이야기 인가요?» — 아니었다): 종전엔 기존 값의
      //   출처를 ov._source 로 찍었는데 _source 는 **마지막으로 이 컨을 덮은 파일명**이라, 세관 값도
      //   선사 파일명으로 표시됐다(2719E 실측 — 0035634 는 적하목록 값인데 RF LIST 로 찍힘).
      //   sl 의 진짜 출처는 sl_src 에 따로 지킨다.
      const prevSrc = ov.sl_src || ov._source || '';
      const nextSrc = nv._source || '';
      if (!hist.length) hist.push({ sl: String(ov.sl), src: prevSrc });
      if (!hist.some((h) => h.sl === String(nv.sl))) hist.push({ sl: String(nv.sl), src: nextSrc });
      m.sl_conflict = hist;
    }
    // 2.06-07: 이번 리스트가 sl 을 실제로 쓰면(빈 값 아님) 그 출처를 sl_src 로 동봉 — 다음 충돌 때 정확한 출처 표기
    if (nv && nv.sl && String(nv.sl).trim() !== '') m.sl_src = nv._source || '';
    for (const [k, v] of Object.entries(nv || {})) {
      if (_emptyFor(k, v)) continue;           // ① 빈 값(무게 0 포함)은 기존을 덮지 않는다
      m[k] = v;
    }
    if (m.sl_conflict === undefined && ov.sl_conflict !== undefined) m.sl_conflict = ov.sl_conflict;
    for (const k of _FIELD_WORK_KEYS) {        // ② 현장 입력은 리스트가 못 덮는다
      if (ov[k] !== undefined) m[k] = ov[k];
    }
    // 실번호는 **검수원이 고친 적이 있을 때만** 리스트가 못 덮는다. 그때는 sl·sl_orig 를 짝으로 지킨다
    //   (한쪽만 지키면 `sl ≠ sl_orig` 가 되어 실오류로 오인된다 — 1.8-02 사고).
    if (Array.isArray(ov.sl_history) && ov.sl_history.length) {
      if (ov.sl) m.sl = ov.sl;
      if (ov.sl_orig !== undefined) m.sl_orig = ov.sl_orig;
    }
    out[cn] = m;
  }
  let kept = 0;
  for (const [cn, ov] of Object.entries(cur)) {   // ③ 리스트에서 빠졌어도 검수 흔적이 있으면 남긴다
    if (out[cn]) continue;
    if (_hasFieldWork(ov)) { out[cn] = { ...ov, _keptNotInList: true }; kept += 1; }
  }
  if (kept) console.warn(`[리스트 저장] 새 리스트에 없지만 검수 흔적이 있어 남긴 컨 ${kept}대`);
  await chunkedReplace(path, out);
  await _touchDataAt(voyageKey, mode);   // TallyOne 1.13
  return { total: Object.keys(out).length, kept };
}

// X-RAY (양하만)
export async function fbSaveXrayList(voyageKey, xrayObj) {
  await chunkedReplace(`voyages/${voyageKey}/discharge/xrayList`, xrayObj);
}

// M3.5.3: 큰 객체를 안전하게 저장
//   M4.2 fix: 청크 분할(50대씩 set+병렬 update) → race condition으로 데이터 손실 의심
//             단일 set으로 변경 (Firebase 16MB 제한 내, 904대 ≈ 1MB라 안전)
async function chunkedReplace(path, obj) {
  // V9.32-02: undefined 값이 하나라도 있으면 RTDB set()이 통째로 거부 → 업로드가 조용히 멈춤.
  //   JSON 왕복으로 undefined 필드를 제거(REST 경로의 JSON.stringify와 동일 의미론).
  try { obj = JSON.parse(JSON.stringify(obj)); } catch (e) { /* 순환 등 — 원본 유지 */ }
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
// ── TallyOne 1.8: 리퍼 온도 확인 (리퍼 메모 화면) ──────────────────────────
//   rfSet = 실제 셋팅온도 · rfAct = 실제온도 · rfSrc = 'photo'(선원 리스트 판독) | 'manual'
//   records 가 단일 진실 원천이라는 기존 원칙 그대로 여기에 적는다(ediContainers 는 EDI 원본이므로 안 건드린다).
//   텔리 RF condition report 의 Setting/Actual 칸이 이 값을 읽는다.
export async function fbSetReeferTemp(voyageKey, mode, cn, patch, by) {
  const r = ref(db, `voyages/${voyageKey}/${mode}/records/${cn}`);
  const f = { rfCheckedAt: Date.now(), rfCheckedBy: by || '' };
  if (patch.set !== undefined) f.rfSet = String(patch.set ?? '');
  if (patch.act !== undefined) f.rfAct = String(patch.act ?? '');
  if (patch.src) f.rfSrc = patch.src;
  await update(r, f);
}

/** 여러 대를 한 번에 (사진 판독 결과 반영 · '전부 리스트대로' 일괄 적용) */
export async function fbSetReeferTempBulk(voyageKey, mode, rows, by) {
  const now = Date.now();
  const patch = {};
  for (const it of rows || []) {
    if (!it || !it.cn) continue;
    const base = `voyages/${voyageKey}/${mode}/records/${it.cn}`;
    if (it.set !== undefined) patch[`${base}/rfSet`] = String(it.set ?? '');
    if (it.act !== undefined) patch[`${base}/rfAct`] = String(it.act ?? '');
    patch[`${base}/rfSrc`] = it.src || 'manual';
    patch[`${base}/rfCheckedAt`] = now;
    patch[`${base}/rfCheckedBy`] = by || '';
  }
  if (!Object.keys(patch).length) return 0;
  await update(ref(db), patch);
  return rows.length;
}

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
    // 1.55-03: 위치·이력은 계획이 아니다 — EDI 에 없던 컨(리스트 단독 등)에 온도/ISO 만 찍어도
    //   records 좌표가 「선사 계획」으로 위조 생성됐다(독립 재검증 P1-10). 계획 노드에는 안 싣는다.
    ['bay','row','tier','bay_actual','row_actual','tier_actual','actual_at','actual_by','moves','_comp'].forEach(k => { delete newEdi[k]; });
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

// TallyOne 1.50: **선적확인 = 실제로 그 자리에 실었다는 현장 사실.**
//   그 순간 실체 위치(bay_actual)를 그 자리로 확정하고 경로에 마지막 점을 남긴다.
//   왜 필요했나 — 실측 2026-08-11:
//     TBJU2745744 는 계획 17-05-06 에 선적확인까지 됐는데 실체 기록은 옛 자리 15-04-06 이었다.
//     effectivePos() 가 실체를 최우선으로 쓰므로 **화면 전체가 옛 자리를 진실로 봤고**,
//     있지도 않은 자리 중복 2곳이 떴다(DB 실제 중복은 0). 마감 점검에도 그대로 올라간다.
//   옛 실체 값은 지우는 게 아니라 경로에 남긴다 — 검수사 확정: *"이력을 남겨야 오류를 찾기 쉽습니다."*
//   ⚠ 비차단 — 여기서 실패해도 선적확인 자체는 이미 저장됐다. 검수 흐름을 막지 않는다.
function _markLoadedPos(voyageKey, mode, cn, by) {
  if (mode !== 'loading' || !voyageKey || !cn) return;
  (async () => {
    try {
      const recR = ref(db, `voyages/${voyageKey}/${mode}/records/${cn}`);
      const [recSnap, ediSnap] = await Promise.all([
        get(recR), get(ref(db, `voyages/${voyageKey}/${mode}/ediContainers/${cn}`)),
      ]);
      const cur = recSnap.val() || {}, edi = ediSnap.val() || {};
      const b = cur.bay !== undefined ? cur.bay : (edi.bay || '');
      const r = cur.row !== undefined ? cur.row : (edi.row || '');
      const t = cur.tier !== undefined ? cur.tier : (edi.tier || '');
      if (!b || !r || !t) return;                       // 자리 없이 완료된 건은 손대지 않는다
      const bI = String(parseInt(b, 10));
      const oa = String(cur.bay_actual ?? '');
      // TallyOne 1.54: **창고에 있던 컨을 실었으면 그때가 실물이 움직인 순간이다 — 창고 → 배.**
      //   검수사 확정 2026-08-12 — *"모든 컨을 창고에 넣어두고 이름만 베이플랜에 적어놓는다."*
      //   1.54 부터 계획 자리를 뺏긴 컨은 전부 창고(`__STG__`)를 거친다. 종전처럼 여기서 그냥 돌아서면
      //   선적확인을 해도 실체가 `__STG__` 로 남아 **그림에서 영영 창고에 갇힌다.**
      const fromStorage = (oa === STORAGE_BAY);
      if (oa.startsWith('__') && !fromStorage) return;   // 창고 말고 다른 `__` 표식은 건드리지 않는다
      const same = oa === bI && String(cur.row_actual ?? '') === r && String(cur.tier_actual ?? '') === t;
      if (same) return;                                 // 이미 맞으면 줄만 늘린다
      const pos = (bb, rr, tt) => (bb ? `${String(parseInt(bb, 10)).padStart(2, '0')}-${rr}-${tt}` : '미배정');
      const moves = Array.isArray(cur.moves) ? [...cur.moves] : [];
      moves.push({ at: Date.now(), by: by || '',
                   from: fromStorage ? STORAGE_TXT : pos(cur.bay_actual, cur.row_actual, cur.tier_actual),
                   to: pos(b, r, t), why: 'loaded', byCn: '' });
      await update(recR, {
        bay_actual: bI, row_actual: r, tier_actual: t,
        actual_at: Date.now(), actual_by: by || '',
        moves: moves.slice(-40),
      });
    } catch { /* 경로 기록 실패가 선적확인을 막지 않는다 */ }
  })();
}

// TallyOne 1.55: **어느 갱(호기)으로 했는지를 완료 기록에 남긴다.**
//   검수사 원문 2026-08-12 — *"장비를 바꿔서 해야 하는데 4호기로 다함.
//   이걸로 제출하면 2호기에서 작업한 인원은 그날 인건비를 받지 못함."*
//   완료 기록에 갱이 없으면 갱별 대수를 나중에 되살릴 방법이 없다 — 그날 인건비가 걸린 값이다.
//   `completed/{cn}` = `{ at, by, equip }`. 빈 값이면 키를 아예 안 넣는다(옛 기록과 모양을 같게 둔다).
//   ⚠ `equip` 은 **맨 뒤 선택 인자**다 — 기존 호출부는 안 넘겨도 종전과 똑같이 동작한다.
export async function fbCompleteContainer(voyageKey, mode, cn, by, flag = 'normal', note = '', equip = '') {
  const rec = { by, at: Date.now() };
  if (flag && flag !== 'normal') { rec.flag = flag; if (note) rec.note = note; }
  const eq = String(equip || '').trim();
  if (eq) rec.equip = eq;
  await set(ref(db, `voyages/${voyageKey}/${mode}/completed/${cn}`), rec);
  _markLoadedPos(voyageKey, mode, cn, by);   // 1.50: 실린 자리 확정 + 경로 마지막 점
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
// TallyOne 1.55: 트윈도 갱(호기)을 남긴다 — 위 `fbCompleteContainer` 와 같은 이유·같은 모양.
//   검수사 원문 — *"장비를 바꿔서 해야 하는데 4호기로 다함.
//   이걸로 제출하면 2호기에서 작업한 인원은 그날 인건비를 받지 못함."*
//   ⚠ `equip` 은 맨 뒤 선택 인자다 — 기존 호출부 4곳은 안 넘겨도 그대로 동작한다.
export async function fbCompleteContainersAtomic(voyageKey, mode, cns, by, equip = '') {
  const patch = {};
  const at = Date.now();
  const list = cns.filter(Boolean);
  const eq = String(equip || '').trim();
  for (const cn of list) {
    patch[`voyages/${voyageKey}/${mode}/completed/${cn}`] = eq ? { by, at, equip: eq } : { by, at };
  }
  await update(ref(db), patch);
  for (const cn of list) _markLoadedPos(voyageKey, mode, cn, by);   // 1.50: 트윈 둘 다 경로 남김
  for (const _ of list) _tallyInspector(voyageKey, mode, by);   // V9.16: 트윈도 대수만큼 누적
}
// V7.99-16 / V8.04: 초과 컨(신고 리스트에 없는데 내려진 것) 기록.
//   EDI/리스트에 없는 번호라 completed에 단독 기록 + extras 노드에 별도 보관(신고 점검이 모음).
//   V8.04: 신고서 작성에 필요한 기본 정보(규격·F/E·타입·실번호·데미지 유무)를 함께 저장.
export async function fbAddExtraContainer(voyageKey, mode, cn, by, info = {}, equip = '') {
  const at = Date.now();
  const eq = String(equip || '').trim();
  const rec = {
    by, at, flag: 'extra',
    ...(eq ? { equip: eq } : {}),   // 1.56: 초과 컨도 갱을 남긴다 — equip 없던 유일한 completed 쓰기 경로였다
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
// 2.06-04 (검수사 «있기는 하되 내릴지는 모르는 미정상태 카톡이나 메시지가 오면 그때 확정하는 상태로»):
//   덱 전용 수화물(EDI·리스트에 없음)의 양하 확정 플래그. records 가 아니라 앱 자체 노드에 두는 이유 —
//   수집기 리스트 병합이 records 를 다시 쓸 때 수동 확정이 증발하지 않게(통째 PUT 보존 원칙).
export async function fbSetLuggConfirm(voyageKey, mode, cn, by) {
  await set(ref(db, `voyages/${voyageKey}/${mode}/luggConfirm/${cn}`), { by: by || '', at: Date.now() });
}
export async function fbCancelLuggConfirm(voyageKey, mode, cn) {
  await remove(ref(db, `voyages/${voyageKey}/${mode}/luggConfirm/${cn}`));
}
// V8.04: 잘못 기록한 초과 컨 취소(삭제) — completed·extras 양쪽에서 제거.
export async function fbRemoveExtraContainer(voyageKey, mode, cn) {
  await remove(ref(db, `voyages/${voyageKey}/${mode}/completed/${cn}`));
  await remove(ref(db, `voyages/${voyageKey}/${mode}/extras/${cn}`));
}
// TallyOne 1.53-02: **취소에는 뜻이 둘이다.** (검수사 확정 2026-08-12)
//   원문 — *"트윈으로 두 대를 들었으면, 앞 컨 기록이 틀렸다고 뒤 컨이 배에서 내려오지는 않는다. 실물은 실려 있다."*
//     · opts.reason = 'notLoaded' (기본) — "잘못 눌렀다". 실물이 안 실렸다 → 완료 삭제 + 위치 원복 + 실체 정리(종전 동작).
//     · opts.reason = 'wrongSlot'        — "실렸는데 자리가 틀렸다". 실물은 배에 있다 → **완료는 유지**하고 자리만 미상으로.
//   종전에는 갈래가 하나뿐이어서 wrongSlot 도 미완료로 되돌렸고, 그러면 **배에 실려 있는 컨이 마감 점검에서
//   안 실린 것으로 세어졌다.** 현장에서 많은 쪽이 wrongSlot 이다.
//   ⛔ `{mode}/completed` 는 현장 기록이다 — wrongSlot 갈래에서는 절대 지우지 않는다.
//   ⚠ 어느 갈래든 취소 사실은 `moves` 에 반드시 한 줄 남긴다(meta.force).
//     실측 2026-08-12 WFHU1403890 — `bay_orig` 가 없거나 자리가 안 바뀐 컨은 조기 반환이라
//     `_updatePositionFields` 를 지나지 않아 **아무 기록도 안 남았다.**
//   실패를 성공으로 보고하지 않는다 — 종전 `catch { return { ok: true } }` 는 취소가 안 됐는데도 됐다고 답했다.
export async function fbCancelComplete(voyageKey, mode, cn, opts = {}) {
  const reason = opts.reason === 'wrongSlot' ? 'wrongSlot' : 'notLoaded';
  const by = opts.by || (reason === 'wrongSlot' ? '자리취소' : '취소원복');
  try {
    const recSnap = await get(ref(db, `voyages/${voyageKey}/${mode}/records/${cn}`));
    const rec = recSnap.val();

    // 자리는 그대로 두고 취소 사실만 한 줄 남긴다(실체 위치는 why:'cancel' 규칙으로 함께 지워진다).
    const logInPlace = async (why) => {
      const ediSnap = await get(ref(db, `voyages/${voyageKey}/${mode}/ediContainers/${cn}`));
      const e = ediSnap.val() || {};
      const b = rec && rec.bay !== undefined ? rec.bay : (e.bay || '');
      const r = rec && rec.row !== undefined ? rec.row : (e.row || '');
      const t = rec && rec.tier !== undefined ? rec.tier : (e.tier || '');
      await _updatePositionFields(voyageKey, mode, cn, b, r, t, by, { why, force: true });
    };

    if (reason === 'wrongSlot') {
      // 실물은 배에 있다 — 완료는 그대로 두고 자리만 비워 '자리 미지정' 목록에 띄운다. 실체 위치는 지운다.
      //   ⚠ 임시창고(`__STG__`)는 '자리 없음'을 뜻하는 정상 상태라 _updatePositionFields 가 손대지 않는다.
      await _updatePositionFields(voyageKey, mode, cn, '', '', '', by, { why: 'wrongSlot', force: true });
      return { ok: true, reason, keptCompleted: true, unassigned: true, restored: false };
    }

    await remove(ref(db, `voyages/${voyageKey}/${mode}/completed/${cn}`));
    // V8.80: 취소 = 위치도 원계획(bay_orig)으로 원복 (사용자 확정 2026-07-08 — 원복돼야 수정 여부를 알 수 있다).
    //   원자리에 다른 컨이 있으면 미배정으로 두고 알림용 정보 반환.
    if (!rec || rec.bay_orig === undefined) { await logInPlace('cancel'); return { ok: true, reason, restored: false, noOrig: true }; }
    const ob = rec.bay_orig || '', orow = rec.row_orig || '', ot = rec.tier_orig || '';
    const changed = (rec.bay || '') !== ob || (rec.row || '') !== orow || (rec.tier || '') !== ot;
    if (!changed) { await logInPlace('cancel'); return { ok: true, reason, restored: true, alreadyOrig: true, orig: { bay: ob, row: orow, tier: ot } }; }
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
        // TallyOne 1.47: 위 재배정 함수와 같은 잣대(`!== undefined`). 종전 `||` 는 미배정(`''`)을
        //   EDI 계획 자리로 되살려, **이미 비운 컨이 원자리를 막고 있는 것으로** 읽혔다.
        const xb = r.bay !== undefined ? r.bay : (e.bay || '');
        const xr = r.row !== undefined ? r.row : (e.row || '');
        const xt = r.tier !== undefined ? r.tier : (e.tier || '');
        if (xb && String(parseInt(xb, 10)) === obInt && xr === orow && xt === ot) { occupant = otherCn; break; }
      }
    }
    if (occupant) {
      await _updatePositionFields(voyageKey, mode, cn, '', '', '', by, { why: 'cancel', byCn: occupant, force: true });
      return { ok: true, reason, restored: false, origOccupied: occupant };
    }
    await _updatePositionFields(voyageKey, mode, cn, ob, orow, ot, by, { why: 'cancel', force: true });
    return { ok: true, reason, restored: true, orig: { bay: ob, row: orow, tier: ot } };
  } catch (e) {
    // 실패는 실패로 답한다 — 호출부가 검수사에게 "취소됐다"고 잘못 알리면 그 컨은 영영 안 고쳐진다.
    return { ok: false, reason, error: String(e && e.message ? e.message : e) };
  }
}

// V8.80: 수동 배정 확인 — 컨을 미배정으로 (수동 작업은 계획 위치에 묶이지 않는다. 사용자 확정 2026-07-08).
export async function fbUnassignContainer(voyageKey, mode, cn, by) {
  await _updatePositionFields(voyageKey, mode, cn, '', '', '', by, { why: 'unassign' });
}

// M4.9d-fix: 선적 실체 위치 저장 (사용자 도메인: 선적 EDI는 계획만, 선적확인 시 실체 발생)
//   - 계획 위치 c.bay/row/tier는 보존 (EDI 단일 진실)
//   - 실체 위치 c.bay_actual/row_actual/tier_actual에 별도 저장
//   - 수정 안 하면 actual = 계획 (정상 흐름)
//   - 위치 변경 시에만 actual ≠ 계획 (현장 적치 다름)
export async function fbSetActualPosition(voyageKey, mode, cn, actualBay, actualRow, actualTier, by) {
  const r = ref(db, `voyages/${voyageKey}/${mode}/records/${cn}`);
  // 1.56: 이력 없는 좌표 쓰기였다(독립 재검증 P1-5) — 다른 모든 위치 변경은 moves 를 남기는데
  //   이 직통 경로(상세 모달·베이 빈칸 클릭·수석 편집)만 안 남겨 "지나온 자리"가 끊겼다.
  let _mv = []; let _from = '';
  try {
    const s = await get(r); const cur = s.val() || {};
    _mv = Array.isArray(cur.moves) ? cur.moves : [];
    if (cur.bay_actual && !String(cur.bay_actual).startsWith('__')) _from = `${cur.bay_actual}-${cur.row_actual}-${cur.tier_actual}`;
  } catch { /* 이력을 못 읽어도 좌표 저장은 진행 */ }
  const _to = actualBay ? `${actualBay}-${actualRow}-${actualTier}` : '';
  await update(r, {
    bay_actual: actualBay || '',
    row_actual: actualRow || '',
    tier_actual: actualTier || '',
    actual_at: Date.now(),
    actual_by: by || '',
    moves: [..._mv, { at: Date.now(), by: by || '', why: 'actual', from: _from, to: _to, byCn: '' }],
  });
}
// 실체 위치 삭제 (수정 취소)
export async function fbClearActualPosition(voyageKey, mode, cn, by) {
  const r = ref(db, `voyages/${voyageKey}/${mode}/records/${cn}`);
  // 1.56: 삭제도 이력에 남긴다 — "실체 위치 → 삭제"가 어디서 왜 됐는지 되짚을 수 있게.
  let _mv = []; let _from = '';
  try {
    const s = await get(r); const cur = s.val() || {};
    _mv = Array.isArray(cur.moves) ? cur.moves : [];
    if (cur.bay_actual && !String(cur.bay_actual).startsWith('__')) _from = `${cur.bay_actual}-${cur.row_actual}-${cur.tier_actual}`;
  } catch { /* 이력을 못 읽어도 삭제는 진행 */ }
  await update(r, {
    bay_actual: null,
    row_actual: null,
    tier_actual: null,
    actual_at: null,
    actual_by: null,
    moves: [..._mv, { at: Date.now(), by: by || '', why: 'cancel', from: _from, to: '', byCn: '' }],
  });
}

// M5.1 I: 보관함 처리 — bay_actual='__STG__' 로 마킹
//   - 베이 그리드에서 숨겨지고 보관함 박스에만 표시
//   - 일괄 처리 (영역 선택분 → 보관함)
export const STORAGE_BAY = '__STG__';
// 경로(moves)에 적는 창고 표기 — 좌표가 아니라 장소 이름이다. 화면 문구는 utils.js 가 읽는다.
export const STORAGE_TXT = '창고';

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

// TallyOne 1.54: **계획 자리를 남에게 내준 컨은 몸만 창고로 간다.** (검수사 확정 2026-08-12)
//   원문 — *"호텔을 예약하고는 있지만 실제 입실은 안 한 상태로 보면 됩니다. 모든 자리가."*
//         *"계획된 자리가 다른 컨으로 선적이 되었다면 그걸로 끝입니다. 그냥 몸만 창고로 가면 됩니다."*
//         *"애초부터 컨테이너는 창고에 있었습니다. 분명 이름만 빌려줬던 것입니다."*
//   왜 이렇게 바꾸는가 — 실측 DXQD 2631W 선적 335대(2026-08-11~12): 밀어내기 82회 중
//   **진짜 충돌 0회, 헛충돌 82회(100%)**. 종전에는 밀려날 때마다 `bay/row/tier`(계획)를
//   **다른 자리로 고쳐 써서** (a) 계획이 오염되고 (b) 가짜 이동 기록이 쌓였다.
//   TBJU2387722 는 앱 기록상 다섯 번 튕겼지만 **실제로는 한 번도 안 움직였고** 크레인은 05-03-82 에 한 번 놓았다.
//   → 계획(`bay/row/tier`)은 **절대 건드리지 않는다.** 실체만 창고로 찍는다.
//     창고 표식은 기존 `fbBatchMoveToStorage` 와 같은 모양이어야 한다(화면 StorageBox·effectivePos 가 그 모양을 읽는다).
async function _markPlanTaken(voyageKey, mode, cn, by, byCn) {
  const recR = ref(db, `voyages/${voyageKey}/${mode}/records/${cn}`);
  const [recSnap, ediSnap] = await Promise.all([
    get(recR), get(ref(db, `voyages/${voyageKey}/${mode}/ediContainers/${cn}`)),
  ]);
  const cur = recSnap.val() || {}, edi = ediSnap.val() || {};
  const b = cur.bay !== undefined ? cur.bay : (edi.bay || '');
  const r = cur.row !== undefined ? cur.row : (edi.row || '');
  const t = cur.tier !== undefined ? cur.tier : (edi.tier || '');
  const _pos = (bb, rr, tt) => (bb ? `${String(parseInt(bb, 10)).padStart(2, '0')}-${rr}-${tt}` : '미배정');
  // 경로 한 줄 — **이동이 아니라 이름표가 내려온 사건**이다(why:'planTaken').
  const moves = Array.isArray(cur.moves) ? [...cur.moves] : [];
  moves.push({ at: Date.now(), by: by || '', from: _pos(b, r, t), to: STORAGE_TXT,
               why: 'planTaken', byCn: byCn || '' });
  const patch = { moves: moves.slice(-40) };
  if (!recSnap.exists()) { patch.cn = cn; patch.l4 = cn.slice(-4); }   // EDI 만 있던 컨 — 레코드를 만든다
  await update(recR, patch);
  await fbBatchMoveToStorage(voyageKey, mode, [cn], by);   // 창고 표식은 기존 함수 하나로 통일
  return { cn, plan: { bay: b, row: r, tier: t } };
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

// V9.57(G14): fbClearPlanDraft 삭제 — 저장소 전체 grep 참조 0 확인.

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

// ── TallyOne 1.55: **F/E 판정은 한 곳에서만 한다. 빈 값은 「풀 아님」이다.** ─────────
//   종전 이 파일은 시퀀스 게이트에서 `fe !== 'E'` 로 봤다. 그러면 F/E 를 못 읽은 컨(`fe:''`)이
//   **풀로 세어져** 되묻기 모달이 튀어나왔다. 반면 화면(`PositionEditModal.jsx:256`)은 같은 값을
//   `fe === 'F'` 로, 즉 **풀 아님**으로 본다. 같은 컨을 화면과 저장 로직이 다르게 읽으면 앱을 못 믿는다.
//   → `fe === 'F'` 일 때만 풀이다. 빈 값은 엠티로 취급하지도 않고 시퀀스 되묻기 대상에서도 뺀다.
//     근거는 이 파일이 이미 쓰는 원칙과 같다 — *모르면 안 막는 쪽이 안전하다.*
function isFullCn(c) {
  if (!c) return false;
  const v = c.fe;
  return String(v === undefined || v === null ? '' : v).trim().toUpperCase() === 'F';
}

// M3.87: 컨테이너 위치 재배정 (선적 모드용)
//   - 새 위치(bay/row/tier)로 이동
//   - 이력 추적 (edits.bay, edits.row, edits.tier) + 경로 한 줄(moves)
//   - 빈 문자열로 새 위치를 주면 → 미배정으로 변경
//
// opts:
//   · actualWork    — 자연어 탭의 **자동/수동 모드**에서 온다. 1.54 부터 이것으로 시퀀스를 판단하지 않는다.
//                     남은 쓰임은 둘뿐이다 — (a) 이 컨의 이동 사유를 'actual' 로 적는다,
//                     (b) **양하**의 종전 게이트(양하는 판정을 안 바꿨다). 호출부는 그대로 넘기면 된다.
//   · seqConfirmed  — 풀+시퀀스 자리를 뺏겠다고 검수사가 확인해 준 경우. 없으면 그 경우에만 멈추고 묻는다.
//   · displacedMode — 'unassign'(밀려난 컨을 미배정으로) | 'swap'(옛 규칙: 밀려난 컨을 뺏은 컨의 옛 자리로)
//   · swapWith      — 명시적 자리 교환 상대 컨번호. 주면 'swap' 과 같다(「⇅ 앞뒤 맞교환」처럼 검수사가 교환을 지시한 경로용).
//
// TallyOne 1.54: **계획은 예약이지 입실이 아니다. 선적 전에는 배 위 어느 자리에도 아무도 없다.**
//   (검수사 확정 2026-08-12) — *"호텔을 예약하고는 있지만 실제 입실은 안 한 상태로 보면 됩니다. 모든 자리가."*
//   *"모든 컨을 창고에 넣어두고 이름만 베이플랜에 적어놓는다."*
//   실측 DXQD 2631W 선적 335대(2026-08-11~12): 밀어내기 82회 중 **진짜 충돌 0회, 헛충돌 82회(100%)**.
//   TBJU2387722 는 앱 기록상 다섯 번 튕겼는데 **실물은 한 번도 안 움직였다** — 크레인은 05-03-82 에 한 번 놓았고
//   종이에도 그 자리 하나뿐이다. 나머지는 앱이 만들어낸 가짜 이동 기록이다.
//   원인은 둘이었다. (a) 예약만 한 자리를 충돌로 봤다 (b) 밀려난 컨의 **계획(bay/row/tier)을 다른 자리로 고쳐 썼다.**
//   → 판정과 처리를 함께 고친다:
//     · 충돌은 **선적확인된 컨**이 그 자리에 있을 때뿐이다. 예약(계획만)은 충돌이 아니다.
//       단 **풀 + 시퀀스 작업**이면 그 컨이 자리 주인이 될 수 있어 검수사에게 묻는다.
//       시퀀스 여부는 **항차 속성**(`info.seqFull`)이지 자동/수동 모드가 아니다 — 검수사 원문:
//       *"선적을 하기 전에 묻습니다. 풀 컨테이너 시퀀스 작업인지 아닌지를.
//         엠티는 안 묻는 이유는 포트만 바뀌지 않으면 언제든 액츄얼이 가능하기 때문입니다."*
//     · 자리를 내준 예약분은 **계획을 그대로 둔 채 몸만 창고로** 간다(`_markPlanTaken`).
//       계획을 고쳐 쓰지 않으니 연쇄 밀림이 원천적으로 없다 — 검수사 원문:
//       *"계획된 자리가 다른 컨으로 선적이 되었다면 그걸로 끝입니다. 그냥 몸만 창고로 가면 됩니다."*
//   ⚠ 이 판정은 **선적** 기준이다. **양하는 종전 그대로** 둔다 — 검수사 확정:
//     *"호텔에 비유하면 손님이 나갔으니 빈방입니다. 언제든 다른 손님을 받을 수 있는(선적 또는 시프팅)."*
//     양하는 계획=실물이라 종전 판정이 맞다.
export async function fbReassignContainerPosition(voyageKey, mode, cn, newBay, newRow, newTier, by, opts = {}) {
  const isLoading = (mode === 'loading');
  // 검수사가 **교환/미배정을 직접 지시한** 경로인가. 지시가 있으면 시퀀스 여부를 되묻지 않는다
  //   (「⇅ 앞뒤 맞교환」은 이미 검수사가 앱 안 모달에서 확인을 누른 뒤에 온다).
  const explicitSwap = !!opts.swapWith || opts.displacedMode === 'swap';
  const explicitMode = explicitSwap || opts.displacedMode === 'unassign';
  // A(옮기는 컨)의 현재 위치를 먼저 캡처 — 명시적 자리 교환(opts.swapWith / displacedMode:'swap')에서만 쓴다.
  //   1.53-02: A 의 계획 자리(recA0/ediA0)는 더 이상 밀려난 컨의 행선지로 쓰지 않으므로 캡처를 지웠다.
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
  let displacedPlanOnly = false;      // 계획만 걸려 있던(= 예약) 컨을 비켰다
  let displacedIsCompleted = false;   // 그 자리에 **입실한**(선적확인된) 컨이 있었다 = 진짜 충돌
  const planTaken = [];               // 계획 자리를 내준 예약분 — 몸만 창고로 간다(선적만)
  let ediMap0 = {}, recMap0 = {};
  let seqMode = null;     // 1.55: 'fullSeq' | 'fullOnlySeq' | 'allActual' — 미정이면 null
  let seqFull = false;    // 하위호환 — 「시퀀스인가 아닌가」 한 줄짜리 답(반환값에 그대로 실어 보낸다)
  if (newBay && newRow && newTier) {
    const ediMapRef = ref(db, `voyages/${voyageKey}/${mode}/ediContainers`);
    const recMapRef = ref(db, `voyages/${voyageKey}/${mode}/records`);
    const compMapRef = ref(db, `voyages/${voyageKey}/${mode}/completed`);
    // 1.55: `info/seqFull` 한 필드가 아니라 `info` 를 읽는다 — 세 갈래는 `seqMode` 에 있고
    //   옛 항차는 `seqFull` 밖에 없어 둘을 같이 봐야 한다(`resolveSeqMode` 가 그 대응을 안다).
    const infoRef = ref(db, `voyages/${voyageKey}/info`);
    const [ediSnap, recSnap, compSnap, infoSnap] = await Promise.all([
      get(ediMapRef), get(recMapRef), get(compMapRef),
      isLoading ? get(infoRef) : Promise.resolve(null),   // 시퀀스 여부는 선적에서만 본다
    ]);
    const ediMap = ediSnap.val() || {};
    const recMap = recSnap.val() || {};
    const compMap = compSnap.val() || {};
    ediMap0 = ediMap; recMap0 = recMap;   // 1.36: 아래 2)에서 계획 자리 점유 검사에 쓴다
    // 값이 없으면(미정) 액츄얼로 본다 — 현장 대부분이 액츄얼이고, 모르면 안 막는 쪽이 안전하다.
    seqMode = resolveSeqMode((infoSnap && infoSnap.exists()) ? infoSnap.val() : null);
    seqFull = (seqMode === 'fullSeq' || seqMode === 'fullOnlySeq');
    // ediContainers + records 양쪽 봐서 같은 위치 컨 검색
    const allCnSet = new Set([...Object.keys(ediMap), ...Object.keys(recMap)]);
    const newBayInt = String(parseInt(newBay, 10));  // normalize
    let compHit = null;              // 그 자리에 실려 있는(선적확인된) 컨
    const planHits = [];             // 그 자리에 이름만 걸어 둔 컨들
    for (const otherCn of allCnSet) {
      if (otherCn === cn) continue;
      const ediC = ediMap[otherCn] || {};
      const recC = recMap[otherCn] || {};
      // TallyOne 1.47: **자리 판정 잣대를 이 함수 안에서 하나로 통일한다.**
      //   종전 `recC.bay || ediC.bay` 는 미배정(`bay:''`)을 falsy 로 보고 **EDI 계획 자리로 되살렸다.**
      //   그래서 자리를 비운 컨이 그림에서도 목록에서도 그 칸을 계속 점유했다(유령 충돌).
      const oBay = recC.bay !== undefined ? recC.bay : (ediC.bay || '');
      const oRow = recC.row !== undefined ? recC.row : (ediC.row || '');
      const oTier = recC.tier !== undefined ? recC.tier : (ediC.tier || '');
      if (!oBay) continue;
      // TallyOne 1.54: **창고에 있는 컨은 배 위 자리를 차지하지 않는다.**
      //   1.54 부터 계획은 안 지우므로 한 칸에 이름표가 둘 이상 남는다(뺏긴 컨 + 뺏은 컨).
      //   창고 표식을 안 거르면 이미 창고에 간 컨을 또 밀어내고, 정작 그 자리에 있는 컨은 그대로 남아
      //   **한 칸에 두 대**가 된다. 그림(StorageBox·effectivePos)도 창고 컨을 그리드에서 뺀다 — 같은 잣대다.
      if (String(recC.bay_actual ?? '') === STORAGE_BAY) continue;
      const oBayInt = String(parseInt(oBay, 10));
      if (oBayInt === newBayInt && oRow === newRow && oTier === newTier) {
        if (compMap[otherCn]) { if (!compHit) compHit = otherCn; }   // 입실했다 — 진짜 충돌
        else planHits.push(otherCn);                                 // 예약만 했다
      }
    }
    if (compHit) {
      // 실물이 그 자리에 있다. 종전 규칙 그대로 처리한다(창고로 보내면 "다시 내렸다"는 뜻이 된다).
      displaced = compHit;
      displacedIsCompleted = true;
      if (isLoading) planTaken.push(...planHits);   // 같은 칸의 예약분도 이름표는 내려온다
    } else if (planHits.length) {
      if (!isLoading) {
        // 양하는 계획=실물이다. 종전 게이트를 그대로 둔다(액츄얼일 때만 비킨다).
        if (opts.actualWork) { displaced = planHits[0]; displacedPlanOnly = true; }
      } else {
        // 선적 — 아무도 입실 안 한 자리다.
        //
        // ── TallyOne 1.55: **되묻기 게이트는 세 갈래다.** ──
        //   · 'allActual'   — 풀·엠티 전부 바로 내준다(뺏긴 컨은 몸만 창고로).
        //   · 'fullOnlySeq' — **엠티만** 바로 내주고, **풀이면 자리를 지킨다**(되묻기 신호를 돌려준다).
        //                     검수사 원문 — *"엠티는 안 묻는 이유는 포트만 바뀌지 않으면
        //                     언제든 액츄얼이 가능하기 때문입니다."*
        //   · 'fullSeq'     — 풀·엠티 **둘 다** 자리를 지킨다.
        //   미정(null)은 안 막는다 — 모르면 안 막는 쪽이 안전하다(위 seqMode 주석과 같은 원칙).
        //   F/E 판정은 `isFullCn` 하나로 한다 — 빈 값(`fe:''`)은 풀이 아니므로 어느 갈래에서도 안 막힌다.
        const feView = (x) => {
          const r0 = recMap[x] || {}, e0 = ediMap[x] || {};
          return { fe: r0.fe !== undefined ? r0.fe : (e0.fe || '') };
        };
        const gateOn = !opts.seqConfirmed && !explicitMode;
        let seqBlock = [];
        if (gateOn && seqMode === 'fullSeq') seqBlock = planHits.slice();
        else if (gateOn && seqMode === 'fullOnlySeq') seqBlock = planHits.filter(x => isFullCn(feView(x)));
        if (seqBlock.length) {
          // 시퀀스 작업 — 그 컨이 자리 주인이 될 수 있다.
          //   **아무것도 쓰지 않고** 돌아서서 호출부가 검수사에게 묻게 한다(조용히 실패하지 않도록 사유를 준다).
          //   검수사가 "그래도 넣는다"면 호출부가 `seqConfirmed:true` 로 다시 부른다.
          //   ⚠ 반환 모양은 1.54 그대로 두고 키만 더한다(`seqMode`) — 호출부 6곳이 이 모양을 읽는다.
          return {
            ok: false, needConfirm: 'seqFull',
            displaced: seqBlock[0], seqConflict: seqBlock, seqFull: true,
            seqMode,                                       // 1.55: 세 갈래 중 무엇 때문에 막혔나
            needConfirmSeq: true,                          // 1.55: 되묻기가 필요하다는 명시 신호
            target: { bay: newBayInt, row: newRow, tier: newTier },
          };
        }
        displaced = planHits[0];
        displacedPlanOnly = true;
        planTaken.push(...planHits);
      }
    }
  }

  // 2) 자리를 내준 컨(D)이 어디로 가는가.
  //   TallyOne 1.54: **예약분은 몸만 창고로 간다. 계획 자리는 건드리지 않는다.**
  //   검수사 정정 — *"애초부터 컨테이너는 창고에 있었습니다. 분명 이름만 빌려줬던 것입니다."*
  //   그래서 1.53 의 "밀려난 컨은 자기 계획 자리로, 아니면 미배정" 규칙은 **없어진다.**
  //   계획을 애초에 안 건드리니 되돌릴 것이 없고, 갈 데가 없으면 창고다.
  //   종전 규칙이 남는 자리는 둘뿐이다:
  //     · `opts.swapWith`/`displacedMode:'swap'` — 검수사가 **의도한** 교환이다. 교환은 앱의 추측이 아니다.
  //     · **이미 선적확인된 컨**(진짜 충돌) — 실물이 배에 있어 창고로 보내면 "다시 내렸다"가 된다.
  let displacedWasCompleted = false;
  let displacedTo = null;            // 밀려난 컨이 실제로 간 자리 (null = 미배정 또는 창고)
  let displacedToOwnPlan = false;    // 자기 계획 자리로 돌아갔는가
  let displacedToStorage = false;    // 1.54: 몸만 창고로 갔는가(계획은 그대로)
  if (displaced) {
    const recD = recMap0[displaced] || {}, ediD = ediMap0[displaced] || {};
    const newBayIntD = String(parseInt(newBay, 10));
    // 그 자리를 다른 컨이 쓰고 있는가 — 잣대는 위 충돌검사와 같다(`!== undefined`, 창고는 제외).
    //   A(cn)는 지금 새 자리로 떠나므로 제외하고, D 자신도 제외한다.
    const slotFree = (b, r, t) => {
      const bi = String(parseInt(b, 10));
      for (const oc of new Set([...Object.keys(ediMap0), ...Object.keys(recMap0)])) {
        if (oc === cn || oc === displaced) continue;
        const rc = recMap0[oc] || {}, ec = ediMap0[oc] || {};
        const ob = rc.bay !== undefined ? rc.bay : (ec.bay || '');
        const orw = rc.row !== undefined ? rc.row : (ec.row || '');
        const ot2 = rc.tier !== undefined ? rc.tier : (ec.tier || '');
        if (!ob) continue;
        if (String(rc.bay_actual ?? '') === STORAGE_BAY) continue;   // 창고 컨은 자리를 안 막는다
        if (String(parseInt(ob, 10)) === bi && orw === r && ot2 === t) return false;
      }
      return true;
    };
    if (explicitSwap && aOldBay && aOldRow && aOldTier) {
      // 명시적 자리 교환 — 옛 규칙 그대로 A 의 옛 자리로 보낸다(검수사가 지시한 교환).
      await _updatePositionFields(voyageKey, mode, displaced, aOldBay, aOldRow, aOldTier, by, { why: 'swap', byCn: cn });
      displacedTo = { bay: aOldBay, row: aOldRow, tier: aOldTier };
    } else if (opts.displacedMode === 'unassign') {
      // 검수사가 명시적으로 미배정을 고른 경우.
      await _updatePositionFields(voyageKey, mode, displaced, '', '', '', by, { why: 'displaced', byCn: cn });
    } else if (displacedPlanOnly && isLoading) {
      // 예약만 하고 입실 안 한 컨 — **이동이 아니다. 이름표가 내려왔을 뿐이다.**
      //   계획(bay/row/tier)은 그대로 두고 실체만 창고로 찍는다.
      await _markPlanTaken(voyageKey, mode, displaced, by, cn);
      displacedToStorage = true;
    } else {
      // 진짜 충돌(이미 실린 컨) 또는 양하 — 1.53 규칙 그대로.
      //   자기 계획 자리가 비어 있으면 거기로, 아니면 미배정으로 두고 검수사가 정한다.
      const pb = recD.bay_orig !== undefined ? recD.bay_orig : (ediD.bay || '');
      const pr = recD.row_orig !== undefined ? recD.row_orig : (ediD.row || '');
      const pt = recD.tier_orig !== undefined ? recD.tier_orig : (ediD.tier || '');
      // 계획 자리가 지금 A 가 들어가는 바로 그 칸이면 갈 데가 없는 것과 같다.
      const sameAsTarget = !!pb && String(parseInt(pb, 10)) === newBayIntD && pr === newRow && pt === newTier;
      if (pb && pr && pt && !sameAsTarget && slotFree(pb, pr, pt)) {
        await _updatePositionFields(voyageKey, mode, displaced, pb, pr, pt, by, { why: 'displaced', byCn: cn });
        displacedTo = { bay: pb, row: pr, tier: pt };
        displacedToOwnPlan = true;
      } else {
        await _updatePositionFields(voyageKey, mode, displaced, '', '', '', by, { why: 'displaced', byCn: cn });
      }
    }
    // 같은 칸에 이름표를 더 걸어 둔 컨(EDI 중복 등)도 이름표는 내려온다 — 안 하면 그림에서 한 칸에 두 대가 된다.
    for (const d of planTaken) {
      if (d === displaced) continue;
      await _markPlanTaken(voyageKey, mode, d, by, cn);
    }
    // V8.70: 자리를 뺏긴 컨이 이미 검수완료된 컨이면 완료 기록을 지우지 않는다.
    //   (구: 무조건 remove → 다른 자리에서 이미 선적확인한 기록이 조용히 사라짐 — 체인시프트 데이터 유실 원인.
    //    오선적이었다면 검수사가 그 번호로 검색해 직접 취소·수정한다.)
    //   1.54: 완료 여부는 위 1)에서 읽은 `completed` 스냅샷으로 이미 안다 — 같은 값을 또 읽지 않는다.
    //   (종전의 `remove(completed/displaced)` 는 없는 노드를 지우는 빈 동작이라 함께 없앴다.)
    displacedWasCompleted = displacedIsCompleted;
  }

  // 3) target 컨 위치 변경
  //   1.50: 액츄얼(실제 실린 자리로 검수원이 지정)과 단순 이동을 사유로 구분한다.
  await _updatePositionFields(voyageKey, mode, cn, newBay, newRow, newTier, by,
    { why: opts.actualWork ? 'actual' : 'move', byCn: displaced || '' });

  return {
    ok: true, displaced, displacedWasCompleted,
    displacedTo,                                       // 1.53-02: 밀려난 컨이 간 자리 (null = 미배정·창고)
    displacedToOwnPlan,                                // 1.53-02: true = 자기 계획 자리로 돌아갔다
    displacedToStorage,                                // 1.54: true = 몸만 창고로 갔다(계획 자리는 그대로)
    planTaken: planTaken.slice(),                      // 1.54: 이름표가 내려온 컨들(창고로 보낸 목록)
    displacedUnassigned: !!displaced && !displacedTo && !displacedToStorage,   // 미배정으로 세웠음(호출부 안내용)
    displacedPlanOnly,                                 // 1.47 호환: 계획만 있던 컨을 비켰음
    swappedTo: displacedTo,                            // 기존 이름 유지 — 호출부 안내문이 이 필드를 읽는다
    seqFull,                                           // 1.54: 이 항차가 시퀀스 작업인가(참고용)
    seqMode,                                           // 1.55: 세 갈래 중 무엇인가 (미정이면 null)
    needConfirmSeq: false,                             // 1.55: 여기까지 왔으면 되묻기는 필요 없었다
  };
}

// 내부 헬퍼: bay/row/tier 동시 변경 + 이력 추가 + ediContainers 동기화
//
// TallyOne 1.50: **컨이 지나온 자리를 전부 남긴다.** 검수사 확정 2026-08-11 —
//   *"컨이 무빙된 자리는 다 기억하고 있어야 합니다. 왜 뭐때문에 이동 했는지를 알아야 합니다.
//     처음에 어디 있었는지 부터 최종선적위치 까지 경로를 갖고 있어야 합니다."*
//   *"이력이 없으면 알려주기 힘듭니다."*
//   목표는 이 문장을 앱이 말하게 하는 것이다 —
//     *"어디 선적때 어떤 컨테이너로 바뀌어서 어디로 이동 시켰습니다."*
//
//   ⚠ **위치를 바꾸는 모든 길이 이 함수 하나를 지난다**(취소원복·미배정·밀림 4갈래·검수원 지정).
//     그래서 여기 한 줄만 쌓으면 경로가 끊기지 않는다. 흩어 놓으면 반드시 하나가 빠진다 —
//     2026-08-11 앞뒤 맞교환이 뒤 컨을 안 옮겨 한 칸에 두 대가 된 것이 그 예다.
//
//   기존 `edits` 는 그대로 둔다(회귀 없음). edits 는 bay/row/tier 를 **따로** 쌓아
//   "언제 어디서 어디로"가 한 줄로 안 읽히고, 사유와 대신 온 컨이 없다.
//
//   meta = { why, byCn }
//     why   : 'move'(검수원 지정) · 'actual'(실제 실린 자리) · 'displaced'(자리를 뺏김)
//             · 'unassign'(미배정) · 'cancel'(완료 취소 원복) · 'restore'(원래 자리로)
//             · 'swap'(검수사가 지시한 자리 교환) · 'wrongSlot'(실물은 실렸고 자리만 취소 — 완료는 유지)
//             · '' (앱이 모르는 이동 — 빈칸이 곧 찾아야 할 구멍이다)
//     force : 자리가 안 바뀌어도 한 줄 남긴다(취소 기록용)
//     byCn  : 그 자리에 **대신 들어온 컨** — *"어떤 컨테이너로 바뀌어서"* 를 말하려면 이게 있어야 한다
async function _updatePositionFields(voyageKey, mode, cn, newBay, newRow, newTier, by, meta = {}) {
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

  // 1.50: 경로 한 줄 — 자리가 실제로 바뀐 때만 쌓는다(같은 자리 재저장은 줄만 늘린다).
  //   1.53-02: 단 `meta.force` 면 자리가 그대로여도 남긴다. **취소는 자리를 안 옮겨도 사건이다** —
  //   실측 2026-08-12 WFHU1403890 은 계획 자리 그대로 실렸다가 취소돼 아무 기록도 안 남았다.
  const _pos = (b, r, t) => (b ? `${String(parseInt(b, 10)).padStart(2, '0')}-${r}-${t}` : '미배정');
  const _from = _pos(oldBay, oldRow, oldTier);
  const _to = _pos(nb, nr, nt);
  if (_from !== _to || meta.force) {
    const moves = Array.isArray(cur.moves) ? [...cur.moves] : [];
    moves.push({
      at: Date.now(), by: by || '',
      from: _from, to: _to,
      why: meta.why || '',
      byCn: meta.byCn || '',       // 그 자리에 대신 들어온 컨
    });
    patch.moves = moves.slice(-40);   // 한 컨이 40번 넘게 움직일 일은 없다 — 폭주 방어
  }

  // TallyOne 1.34: **미배정으로 만들 때는 실체 위치도 같이 지운다.**
  //   검수사 신고 2026-08-09: *"38번 베이에 선적이 안 된 곳은 23곳인데 앱은 21개로 표시하고
  //   컨테이너 2개가 미배정으로 되어 있다. 실제 선적할 자리에는 미배정이라 되어 있는
  //   컨테이너 넘버들이 그 자리를 차지하고 있다."*
  //   원인 — 이 함수는 `bay/row/tier` 만 비우고 `bay_actual` 은 손대지 않았다. 그래서
  //   `KMTU9448587` 이 `bay:""` (미배정)인데 `bay_actual:"38/09/88"` 로 남아,
  //   **목록에서는 미배정으로 세면서 그림에서는 자리를 차지**했다. 그 자리는 영영 못 쓴다.
  //   ⚠ 임시창고(`__STG__`)는 건드리지 않는다 — 그것도 '자리 없음'을 뜻하는 정상 상태다.
  // TallyOne 1.53: **선적확인 취소도 실체 위치를 지운다.**
  //   실측 2026-08-12 — 취소는 `bay/row/tier` 만 원계획으로 되돌리고 `bay_actual` 을 그대로 뒀다.
  //   그런데 화면은 `effectivePos()`·검수리스트·베이그림 전부 `bay_actual` 을 **최우선**으로 읽는다
  //   (utils.js effectivePos · SearchPanel · VoyagePage 승격 로직). 그래서 취소를 눌러도
  //   **화면은 취소 전 자리를 계속 진실로 봤다.** 검수사 개념: *"취소하면 그 전 자리로 돌아가야 한다."*
  //   실체 위치는 선적확인 시점에 확정되는 값이므로(_markLoadedPos), 확인을 취소하면 같이 사라져야 한다.
  //   ⚠ 임시창고(`__STG__`)는 건드리지 않는다 — 그것도 '자리 없음'을 뜻하는 정상 상태다.
  if ((!nb && !nr && !nt) || meta.why === 'cancel') {
    const curActual = cur.bay_actual;
    if (curActual !== undefined && curActual !== null && curActual !== '' && curActual !== STORAGE_BAY) {
      patch.bay_actual = null; patch.row_actual = null; patch.tier_actual = null;
      patch.actual_at = null; patch.actual_by = null;
    }
  } else if (nb && nr && nt) {
    // TallyOne 1.53: **이미 실린 컨의 자리를 고치면 실체 위치도 함께 옮긴다.**
    //   실측 2026-08-12 — UXXU2413110 을 11-07-06 → 07-01-06 으로 옮겼는데 `bay_actual` 이 11-07-06 에 남았다.
    //   화면은 `effectivePos()` 로 실체를 먼저 읽으므로 **고친 자리가 아니라 옛 자리를 그렸고**,
    //   그 자리에 새로 들어온 DWSU2261640 과 겹쳐 「자리 중복」 경고가 떴다(실제 중복은 0곳이었다).
    //   경고가 틀리면 검수사는 곧 경고를 안 본다 — 그래서 고친다.
    //   ⚠ 지나온 경로는 `moves` 에 그대로 쌓이므로(1.50) 실체를 갱신해도 이력은 안 사라진다.
    //
    // ── TallyOne 1.55: **자리가 주어지면 실체를 항상 쓴다. 선적확인 전이어도 쓴다.** ──
    //   검수사 확정 2026-08-12 — *"카고플랜은 변함이 없어야 하는데 선적 상태에 따라 변했다."*
    //   1.55 부터 계획(`ediContainers.bay/row/tier`)은 이 함수가 **절대 손대지 않는다**(함수 끝 동기화를 지웠다).
    //   그런데 화면 소비처 다수가 *EDI 계획이 있으면 `records.bay` 를 덮지 못하게* 막는다
    //   (`VoyagePage.jsx:379·516` 의 `ediHasPos`·`PROTECTED_EDI_FIELDS`, `PrintHubModal.jsx:66`).
    //   그래서 계획 덮어쓰기만 지우고 끝내면 **검수원이 지정한 자리가 화면에서 통째로 사라진다.**
    //   실체(`bay_actual`)로 통일하면 기존 승격 경로(`VoyagePage.jsx:399-428`)를 그대로 타 그림·목록에 나온다.
    //   종전에는 *"실체가 아직 없는 컨(선적확인 전)은 건드리지 않는다"* 며 `curActual` 이 있을 때만 갱신했는데,
    //   그 조건이 곧 위 소멸의 원인이었다 — 조건을 없앤다.
    //   ⚠ 창고(`__STG__`)에 있던 컨도 새 자리를 주면 갱신한다 — 창고에서 꺼내 자리를 정하는 정상 흐름이다.
    //   ⚠ 미배정(`!nb && !nr && !nt`)·`why:'cancel'` 에서 실체를 지우는 위 분기는 그대로 둔다.
    patch.bay_actual = nb; patch.row_actual = nr; patch.tier_actual = nt;
    patch.actual_at = Date.now(); patch.actual_by = by || '';
  }

  // records가 없으면 새로 만듦 (cn은 키이지만 안전하게)
  if (!recSnap.exists()) {
    patch.cn = cn;
    patch.l4 = cn.slice(-4);
    await set(recR, patch);
  } else {
    await update(recR, patch);
  }

  // TallyOne 1.55: **여기서 계획(`ediContainers.bay/row/tier`)을 고쳐 쓰던 3줄을 지웠다.**
  //   검수사 확정 2026-08-12 — *"카고플랜은 변함이 없어야 하는데 선적 상태에 따라 변했다."*
  //   `ediContainers` 는 선사 계획(카고플랜)이다. 검수원이 자리를 옮길 때마다 여기서 덮어쓰는 바람에
  //   선사가 준 원본이 작업 중에 계속 변했고, 인쇄물·별첨·EDI 회신이 전부 그 오염된 값을 실었다.
  //   계획을 바꿔도 되는 곳은 **EDI 업로드(`fbSaveEdiContainers`)와
  //   컨펌플랜 확정·복원(`fbCommitPlan`·`fbRestorePlanFromEdi`) 뿐이다.**
  //   검수원이 지정한 자리는 위에서 `bay_actual/row_actual/tier_actual` 로 쓴다.
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


// V9.57(G14): fbSubscribeVoyage(단일 항차 구독) 삭제 — 저장소 전체 grep 참조 0 확인
//   (App.jsx는 복수형 fbSubscribeVoyages만 사용).

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
// 1.81(검수사 확정 2026-08-17): 기존 인원의 role 만 고친다 — fbAddStaff 를 재사용하면 addedAt 이
//   초기화되므로 분리. 용도: 임원 한두 명에게 테스터 직책을 얹었다 뗐다 하는 인원관리 토글.
//   서버 staffList/{이름}.role 은 코드 명단(STAFF_ROLES)보다 우선하므로 재배포 없이 반영된다.
export async function fbSetStaffRole(name, role) {
  if (!name || !role) return false;
  try {
    await update(ref(db, `staffList/${name}`), { name, role, roleAt: Date.now() });
    return true;
  } catch (e) {
    console.error('[fbSetStaffRole] 저장 실패', e);
    return false;
  }
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

/** TallyOne 1.8-11: 지금 서버에 붙어 있는가 (한 번만 확인).
 *
 *  왜 필요한가 (검수사 실측 2026-08-05, STMJ 2643E)
 *    오프라인에서 「수석 완료 저장」을 누르니 버튼이 **"저장 중…"에 갇혔다.**
 *    Firebase 는 신호가 없으면 쓰기를 로컬 큐에 담고 Promise 를 **연결이 살아날 때까지
 *    resolve 하지 않는다.** 그래서 `await set(...)` 에서 멈춘다.
 *    더 위험한 건, 나중에 연결이 살아나면 사용자가 화면을 떠난 뒤에 archive 쓰기 →
 *    검증 통과 → **fbDeleteVoyage(항차 삭제)** 까지 진행될 수 있다는 것이다.
 *    되돌릴 수 없는 작업을 신호 없는 상태에서 시작하게 두면 안 된다.
 *
 *  @returns {Promise<boolean>} 3초 안에 연결 확인이 안 되면 false(= 끊긴 것으로 본다)
 */
export function fbIsOnline(timeoutMs = 3000) {
  return new Promise((resolve) => {
    let done = false;
    // ⚠ `.info/connected` 는 캐시된 값이 있으면 콜백이 **즉시** 돈다. 그때 off 는 아직 할당 전이라
    //   그 자리에서 off() 를 부르면 구독이 안 끊긴다. 해제를 다음 틱으로 미뤄 순서를 보장한다.
    const finish = (v) => {
      if (done) return;
      done = true;
      setTimeout(() => { try { off(); } catch { /* 무시 */ } }, 0);
      resolve(v);
    };
    const t = setTimeout(() => finish(false), timeoutMs);
    let off = () => {};
    try {
      off = onValue(ref(db, '.info/connected'), (snap) => {
        clearTimeout(t);
        finish(!!snap.val());
      }, () => { clearTimeout(t); finish(false); });
    } catch {
      clearTimeout(t); finish(false);
    }
  });
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
// V9.57(G14): 외부 참조 0 (내부 _tallyInspector에서만 호출) — export 제거, 내부 함수로 전환.
async function fbAddShipVoyageInspector(imo, voyageKey, inspectorName, mode) {
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

// V9.57(G14): fbResetAllShipStats(M7.15 일회성 초기화 도구) 삭제 — 저장소 전체 grep 참조 0 확인.

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
  // V9.57(G2): 보관소 평택분 집계를 화면 규칙과 통일 — 모드별(양하=POD평택, 선적=POL평택) + Set 중복 제거.
  //   종전 POL∨POD 판정은 평택발 타항행/타항발 평택행이 양쪽에 이중 집계됐다(옛 규칙 잔존).
  //   _ptkCountOfSection(수석대시보드 집계와 동일 함수) 재사용으로 단일 소스화.
  const discharge = _ptkCountOfSection(voyage.discharge, 'discharge');
  const loading = _ptkCountOfSection(voyage.loading, 'loading');
  const info = voyage.info || {};
  // V8.43: vsl 폴백 등으로 같은 배가 다른 키에 갈라지지 않게 정식 키로 수렴.
  const shipId = resolveShipKey(imo || info.imo || info.callsign || (info.vsl ? info.vsl.toUpperCase().replace(/\s+/g, '') : ''));

  // ── M7.18b 핵심: 삭제 전 실제 데이터 전체를 archive 노드에 통째 백업 ──
  //   기존엔 개수(통계)만 ships에 기록하고 실데이터는 그냥 삭제됨 → 복구 불가였음.
  //   이제 records·ediContainers·info·xray 등 항차 전체를 archive/{voyageKey}에 복사.
  //   archive는 어떤 일반 쓰기 경로도 건드리지 않음(읽기/복원 전용 보관소).
  //   반환값: 백업 성공 true / 실패 false → 호출부(HomePage)는 true일 때만 삭제 진행.
  try {
    // TallyOne 1.8-13: **사진은 통째 페이로드에서 빼고 한 건씩 따로 옮긴다.**
    //
    //   사고(검수사 신고 2026-08-05, STMJ 2643E — 집 PC 유선인데도 "오프라인" 배너)
    //     `{...voyage}` 에는 `photos` 가 들어 있고, 사진 한 건마다 컨번호·상세 **원본 두 장**이
    //     base64 로 담긴다(원본 1~2.8MB → base64 는 그 1.4배). 5건이면 10~20MB.
    //     그걸 set() 한 번에 밀어 넣으니 Firebase 가 못 받고 연결이 끊긴다. 재연결하면 큐에
    //     남은 같은 쓰기를 또 시도하다 또 끊긴다 — **앱이 스스로 연결을 무너뜨리는 고리**다.
    //     그래서 완료 저장이 "저장 중…"에서 멈추고 오프라인 배너까지 떴다.
    //   대조 실측: 성공한 TNJP_26355E 보관본에는 photos 가 없다(discharge·loading·info 뿐).
    //             실패한 STMJ_2643E 에는 photos 5건이 있었다.
    //
    //   ⚠ 사진을 버리지 않는다. 본문 백업이 끝난 뒤 **한 건씩** 옮긴다. 한 건이 실패해도
    //     나머지와 본문은 남는다(조용히 삼키지 않고 로그를 남긴다).
    const { photos: _photos, ...voyageNoPhotos } = voyage || {};
    const archivePayload = {
      ...voyageNoPhotos,               // 항차 데이터(discharge/loading/info/records 등) — 사진 제외
      _archivedAt: Date.now(),
      _archiveVersion: 2,              // 2 = 사진을 따로 옮기는 구조
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
    // 1.8-13: 사진을 **한 건씩** 옮긴다. 큰 건 하나가 실패해도 본문·나머지 사진은 남는다.
    //   한 건도 수 MB 라 통째로 묶으면 위와 같은 사고가 난다.
    if (_photos && typeof _photos === 'object') {
      const keys = Object.keys(_photos);
      let okN = 0;
      for (const k of keys) {
        try {
          await set(ref(db, `archive/${voyageKey}/photos/${k}`), _photos[k]);
          okN += 1;
        } catch (pe) {
          console.error(`[archive] 사진 이동 실패 (${voyageKey}/${k}) — 본문은 저장됨:`, pe);
        }
      }
      if (okN < keys.length) {
        console.warn(`[archive] 사진 ${keys.length}건 중 ${okN}건만 옮겨짐 — ${voyageKey}`);
      }
    }
    // TallyOne 1.6-01: 마감 텔리 대기 색인 — 「수석 완료 저장」이 마감의 방아쇠다.
    //   대시보드가 보관소 160건을 훑지 않고 이 작은 노드 하나만 읽게 하려는 것.
    //   실패해도 백업·삭제는 그대로 진행한다(목록 편의 기능이 본 작업을 막지 않는다).
    try {
      await set(ref(db, `tally_pending/${voyageKey}`), {
        vsl: info.vsl || '', voy_d: info.voy_d || '', voy_l: info.voy_l || '',
        archivedAt: Date.now(), tallyMadeAt: 0,
      });
    } catch (e) { console.warn('[마감텔리] 대기 색인 기록 실패(계속):', voyageKey, e); }
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
// V9.57(G3): archive 전체 읽기(항차당 수 MB 데이터를 목록 때문에 통째로 다운로드) 제거.
//   REST shallow=true로 키만 받고, 항차별 메타 필드(_archivedAt·_discharge_ptk·_loading_ptk·info/vsl —
//   실제 저장 구조가 archive/{key} 최상위 평면이라 meta 노드가 따로 없음)만 개별 get.
//   REST 실패 시 기존 전체 읽기로 폴백 + console.warn.
export async function fbListArchive() {
  try {
    const res = await fetch(`${firebaseConfig.databaseURL}/archive.json?shallow=true`);
    if (!res.ok) throw new Error(`shallow HTTP ${res.status}`);
    const keys = Object.keys((await res.json()) || {});
    const out = await Promise.all(keys.map(async (key) => {
      // ⚠ 여기에 필드를 늘리지 마라. 키 1건당 get 이 그만큼 늘어난다(보관소 160건 × N).
      //   1.6에서 3개를 더 붙이고 대시보드에서 자동 호출했다가 요청 1,120건으로 화면이 멈췄다.
      //   마감 텔리 목록은 tally_pending 노드 하나만 읽는다(fbListTallyPending).
      const [at, dp, lp, vsl] = await Promise.all([
        get(ref(db, `archive/${key}/_archivedAt`)),
        get(ref(db, `archive/${key}/_discharge_ptk`)),
        get(ref(db, `archive/${key}/_loading_ptk`)),
        get(ref(db, `archive/${key}/info/vsl`)),
      ]);
      return {
        voyageKey: key,
        vsl: (vsl.exists() && vsl.val()) || key.split('_')[0] || '',
        archivedAt: (at.exists() && at.val()) || 0,
        discharge_ptk: (dp.exists() && dp.val()) || 0,
        loading_ptk: (lp.exists() && lp.val()) || 0,
      };
    }));
    return out.sort((a, b) => b.archivedAt - a.archivedAt);
  } catch (e) {
    console.warn('[fbListArchive] shallow 목록 실패 — 전체 읽기로 폴백:', e);
  }
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

// ── TallyOne 1.6: 보관소 항차 한 건 통째 읽기 (마감 텔리 생성용) ──
//   fbArchiveVoyageBeforeDelete 가 `{...voyage}` 로 통째 복사하므로 구조는 voyages/{key} 와 같다.
//   메타(_로 시작)만 걷어내면 computeTallyData 가 그대로 먹는다.
export async function fbGetArchiveVoyage(voyageKey) {
  const snap = await get(ref(db, `archive/${voyageKey}`));
  if (!snap.exists()) return null;
  const data = snap.val() || {};
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith('_')) continue;
    out[k] = v;
  }
  return out;
}

// ── TallyOne 1.6: 마감 텔리 생성 시각 기록 ──
//   목록에서 "이미 만든 건"을 구분하기 위한 표시. archive 본문은 건드리지 않고 메타 한 칸만 쓴다.
//   ⚠ archive 는 읽기/복원 전용 보관소라는 원칙(firebase.js 973행)의 유일한 예외 —
//     항차 데이터가 아니라 '이 항차 서류를 뽑았다'는 작업 흔적이라 여기 둔다.
export async function fbMarkTallyMade(voyageKey, at = Date.now()) {
  await set(ref(db, `archive/${voyageKey}/_tallyMadeAt`), at);
  await update(ref(db, `tally_pending/${voyageKey}`), { tallyMadeAt: at });
  return at;
}

// ── TallyOne 1.6-01: 마감 텔리 대기 목록 (가벼운 색인) ──
//   ⚠ 1.6 사고 — 대시보드가 열릴 때마다 fbListArchive() 를 돌렸다. 그 함수는 보관소 키
//     1건당 get 을 7번 한다. 보관소 160건 = 요청 1,120건이 한 번에 나가 화면이 멈췄다.
//     목록 때문에 보관소 전체를 훑으면 안 된다(G3 규칙의 재발).
//   → 「수석 완료 저장」 때 이 작은 노드에 한 줄 남기고, 대시보드는 **이 노드 하나만** 읽는다.
//     항차 본문은 실제로 엑셀을 만들 때 fbGetArchiveVoyage 로 그 한 건만 읽는다.
export async function fbListTallyPending() {
  const snap = await get(ref(db, 'tally_pending'));
  if (!snap.exists()) return [];
  const out = [];
  for (const [key, v] of Object.entries(snap.val() || {})) {
    if (!v) continue;
    out.push({ voyageKey: key, vsl: v.vsl || key.split('_')[0] || '',
               voy_d: v.voy_d || '', voy_l: v.voy_l || '',
               archivedAt: v.archivedAt || 0, tallyMadeAt: v.tallyMadeAt || 0 });
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

/**
 * TallyOne 1.20: 푸시 토큰 등록 — `push_tokens/{사람}/{토큰끝24자}` = { token, at, ua }
 *   기기마다 토큰이 다르므로 사람 밑에 여러 개가 붙는다(폰·태블릿·PC).
 *   키에 토큰 원문을 쓰면 안 된다 — `.#$/[]` 가 들어 있어 RTDB 경로가 깨진다.
 */
const _safeKey = (x) => String(x || '').replace(/[.#$/[\]\s]/g, '_');
export async function fbSavePushToken(name, token) {
  if (!token) return false;
  const k = _safeKey(String(token).slice(-24));
  await set(ref(db, `push_tokens/${_safeKey(name) || '익명'}/${k}`), {
    token, at: Date.now(),
    ua: (typeof navigator !== 'undefined' ? String(navigator.userAgent || '').slice(0, 120) : ''),
  });
  return true;
}
export async function fbDeletePushToken(name, token) {
  if (!token) return false;
  await remove(ref(db, `push_tokens/${_safeKey(name) || '익명'}/${_safeKey(String(token).slice(-24))}`));
  return true;
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
// V9.22-02: 덱 플랜 빈자리 지정 (선적 현장 배치)
export async function fbAssignDeckSlot(voyageKey, mode, slotKey, val) {
  await set(ref(db, `voyages/${voyageKey}/${mode}/stowagePlan/assign/${slotKey}`), val);
}

// V9.22: RZOR 덱 스토우지 플랜 저장 (선사 rzdf 플랜 파싱분)
export async function fbSetStowagePlan(voyageKey, mode, plan) {
  await set(ref(db, `voyages/${voyageKey}/${mode}/stowagePlan`), { ...plan, _at: Date.now() });
}

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
/** TallyOne 1.8-15: **시각을 지정해서** 작업 기록을 넣는다 (카톡방 기록 보강용).
 *
 *  fbAddWorkReport 는 ts 를 '지금'으로 덮는다. 카톡에서 읽어 온 것은 **과거 시각**이라
 *  그걸 쓰면 타임시트 순서가 무너진다(실측: 22:47 해치 오픈이 12:30 으로 박힘).
 *
 *  @param base 'voyages/{key}' 또는 'archive/{key}' — 완료 저장된 항차는 보관소에 넣어야
 *              마감 텔리가 다시 만들 때 반영된다.
 *  @param items [{ts, ...report}]
 *  @returns {Promise<{added:number, skipped:number}>} 같은 ts 가 이미 있으면 건너뛴다(중복 방지)
 */
/**
 * TallyOne 1.8-18: 잘못 들어온 작업 보고를 지운다.
 *
 * 왜 (검수사 2026-08-05)
 *   "08시건은 오염 자료 입니다. 처음 텔리 자료를 만들때 묻어온 자료 입니다."
 *   STMJ 2643E 08:19·08:20 의 커버 오픈 보고는 **앱이 진짜로 쓴 기록**(`_src` 없음)이라
 *   출처로도 시각으로도 가려낼 수 없다 — 그때 실제 선적이 진행 중이었다(완료는 11:39).
 *   즉 기계가 판별할 방법이 없다. **사람이 지우는 수밖에 없는데 지울 수단이 앱에 없었다.**
 *   그래서 지우개를 만든다. 판단은 수석이 하고, 앱은 무엇이 지워지는지 보여 준다.
 *
 * ⚠ 되돌릴 수 없다. 호출부는 반드시 확인을 한 번 받는다.
 */
export async function fbDeleteReport(base, key) {
  if (!base || key == null || key === '') throw new Error('삭제 대상이 없습니다');
  await remove(ref(db, `${base}/reports/${key}`));
  return true;
}

export async function fbAddReportsAt(base, items) {
  let added = 0, skipped = 0;
  for (const it of items || []) {
    const ts = Number(it?.ts);
    if (!Number.isFinite(ts) || ts <= 0) { skipped += 1; continue; }
    const path = `${base}/reports/${ts}`;
    try {
      const cur = await get(ref(db, path));
      if (cur.exists()) { skipped += 1; continue; }
      const { ts: _t, ...rest } = it;
      await set(ref(db, path), { ...rest, ts, created_at: new Date(ts).toISOString(), _src: 'kakao' });
      added += 1;
    } catch (e) {
      console.error('[카톡 보강] 기록 추가 실패:', path, e);   // 조용히 삼키지 않는다
      skipped += 1;
    }
  }
  return { added, skipped };
}

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
  // TallyOne 2.03: 데미지는 경량 색인에도 기록 — «SPSU2041959 데미지 있었어?»·«8월 17일 데미지» 를
  //   보관된 옛 항차까지 사진 없이 훑을 수 있게(사진은 [사진 보기] 때 그 건만 불러온다).
  if (meta && meta.type === 'damage' && meta.cn) {
    try { await _writeDamageIndex(voyageKey, ts, meta); } catch (e) { console.warn('[damageIndex] 기록 실패(사진 저장은 됨):', e); }
  }
  return ts;
}

// ── TallyOne 2.03: 데미지 색인 damageIndex/{CN}/{ts} — 메타만(사진 제외), 조회는 전체 1회 로드 ──
async function _writeDamageIndex(voyageKey, ts, meta) {
  const C = String(meta.cn || '').toUpperCase().replace(/\s/g, '');
  if (!C) return;
  await set(ref(db, `damageIndex/${C}/${ts}`), {
    ts, cn: C, voyageKey,
    damageTypes: meta.damageTypes || null, damageParts: meta.damageParts || null,
    points: meta.points || null, dims: meta.dims || null,
    note: meta.note || '', by: meta.by || meta.equip || '',
  });
}
export async function fbGetDamageIndex() {
  const snap = await get(ref(db, 'damageIndex'));
  return snap.exists() ? (snap.val() || {}) : {};
}
// 사진 단건 — 현행 voyages 먼저, 없으면 보관(archive) 폴백 (수석 완료 저장은 항차를 archive 로 옮긴다)
export async function fbGetDamagePhoto(voyageKey, ts) {
  let snap = await get(ref(db, `voyages/${voyageKey}/photos/${ts}`));
  if (!snap.exists()) snap = await get(ref(db, `archive/${voyageKey}/photos/${ts}`));
  return snap.exists() ? snap.val() : null;
}

// ── TallyOne 2.03: 데미지 예약 — 자료 도착 전 컨번호로 미리 등록 (검수사 확정 «아무 자료도 도착하지
//    않았습니다. 예약기능이 있어야 할것 같습니다» — 카톡으로 받은 명일 양하 컨 데미지 사진 사건) ──
//    저장: pendingDamage/{CN}/{ts} — photos 항목과 같은 필드(type:'damage', data, detailPhoto,
//    damageTypes/Parts, points, dims, note). 자료가 도착해 그 컨이 어느 항차에 나타나면
//    fbPromotePendingDamage 가 voyages/{key}/photos 로 복사(승격)하고 status 를 promoted 로 남긴다.
//    승격되면 기존 경로(CARGO DAMAGE REPORT buildDamage · 조회 사진)가 그대로 동작한다.
export async function fbAddPendingDamage(cn, entry) {
  const C = String(cn || '').toUpperCase().replace(/\s/g, '');
  const ts = Date.now();
  await set(ref(db, `pendingDamage/${C}/${ts}`), { ts, cn: C, status: 'waiting', type: 'damage', ...entry });
  return ts;
}
export async function fbGetPendingDamage() {
  const snap = await get(ref(db, 'pendingDamage'));
  return snap.exists() ? (snap.val() || {}) : {};
}
export async function fbDeletePendingDamage(cn, ts) {
  const C = String(cn || '').toUpperCase().replace(/\s/g, '');
  await set(ref(db, `pendingDamage/${C}/${ts}`), null);
}
export async function fbPromotePendingDamage(voyageKey, cn, entries) {
  const C = String(cn || '').toUpperCase().replace(/\s/g, '');
  for (const e of entries || []) {
    if (!e || e.status !== 'waiting') continue;   // 멱등 — 승격된 건 다시 안 옮긴다
    const { status, ...body } = e;
    await set(ref(db, `voyages/${voyageKey}/photos/${e.ts}`), { ...body, mode: 'unknown', promotedFrom: 'pendingDamage' });
    try { await _writeDamageIndex(voyageKey, e.ts, body); } catch (er) { console.warn('[damageIndex] 승격 색인 실패:', er); }
    await set(ref(db, `pendingDamage/${C}/${e.ts}/status`), 'promoted');
    await set(ref(db, `pendingDamage/${C}/${e.ts}/promotedTo`), voyageKey);
  }
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

// V9.57(G14): fbDeletePhotoReport(단일 사진 삭제) 삭제 — 저장소 전체 grep 참조 0 확인.

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

// V9.33: 평택도선사회 도선 예보 구독 (수집기 pilot.py가 기록)
//   경로: pilot_forecast/{선박코드} = { code, vessel, callsign, rows[], nextDep, nextArr, updatedAt }
//   PORT-MIS(신고=예보 성격)와 별도 노드 — 도선 예보는 확정에 가까우므로 카드에 함께 표시한다.
export function fbSubscribePilotForecast(callback) {
  const r = ref(db, 'pilot_forecast');
  const unsub = onValue(r, (snap) => callback(snap.val() || {}));
  return unsub;
}

// V9.36: 터미널 작업 현황 구독 (수집기 terminal_work.py가 기록 — 트레드링스 공개 API)
//   경로: terminal_work/{선박코드} = { pct, endAt, expectEnd, depEtd, delayed, disDone/disPlan, lodDone/lodPlan, ... }
//   용도: 작업이 마무리될 무렵(기본 90% 이상) 카드의 '작업일시'를 '출항시간'으로 바꾼다.
// TallyOne 1.5: 화면 데이터만 새로고침 — 페이지를 다시 불러오지 않고 실시간 구독만 재연결한다.
//   사유(사용자 확정 2026-08-04): 터미널 실시간 자료를 보려고 브라우저 새로고침을 하면
//   로그인(App.jsx의 inspector 메모리 상태)이 풀려 로그인 화면으로 돌아간다.
//   goOffline→goOnline은 열려 있는 onValue 구독을 전부 끊었다 다시 붙이므로 최신값이 즉시 재수신된다.
//   ⚠ 30분 무조작 자동 로그아웃(V9.13)은 건드리지 않는다 — 활동 로그의 검수원 신뢰도가 걸려 있다.
export async function fbReconnect() {
  goOffline(db);
  await new Promise((r) => setTimeout(r, 300));
  goOnline(db);
  // TallyOne 1.8-12: **끊고 다시 붙였으면 붙었는지 확인한다.**
  //   실측 2026-08-05 — 새로고침 버튼을 쓴 뒤 상단 오프라인 배너가 그대로 남았다.
  //   그런데 그 상태에서 누른 검수 완료는 서버에 정상 기록됐다. 즉 **실제로는 연결돼 있는데
  //   `.info/connected` 구독만 goOffline 때 끊긴 채 복구가 안 된 것**이다.
  //   거짓 배너는 그 자체로도 나쁘지만, 그걸 근거로 기능을 막으면(1.8-11) 훨씬 나쁘다.
  //   → 최대 5초까지 재연결을 지켜보고, 안 붙으면 한 번 더 goOnline 을 시도한다.
  //     그래도 안 되면 호출부가 알 수 있게 online:false 로 돌려준다(조용히 넘기지 않는다).
  let online = await fbIsOnline(5000);
  if (!online) {
    try { goOnline(db); } catch { /* 무시 */ }
    online = await fbIsOnline(5000);
  }
  return { at: Date.now(), online };
}


export function fbSubscribeTerminalWork(callback) {
  const r = ref(db, 'terminal_work');
  const unsub = onValue(r, (snap) => callback(snap.val() || {}));
  return unsub;
}

// 1.45: 항로 로테이션 사전(lane_routes) — utils.LANE_ROUTES 내장 시드를 덮어쓴다.
export function fbSubscribeLaneRoutes(callback) {
  const r = ref(db, 'lane_routes');
  const unsub = onValue(r, (snap) => callback(snap.val() || {}));
  return unsub;
}

// M5.25: PORT-MIS 캡처 OCR 결과 일괄 저장 (Chrome 확장과 동일 구조)
//   폰에서 캡처 → OCR → 추출된 ships 배열을 Firebase port_mis_data에 PUT
//   key는 sanitized callsign. callsign 없으면 vesselName 사용 (안전망)
// M6.18: berth 검증 — utils.js의 isValidBerth와 동일 패턴
// M6.18c: 블랙리스트 방식 — 명백한 시설 코드(영문 대문자 3-5자)만 차단
// TallyOne 1.26-01: utils.isValidBerth 와 **같은 규칙**을 유지한다(복제본 — 고칠 때 둘 다 고친다).
//   타항(인천 등) 부두명 차단 추가. 근거·경위는 utils.js isValidBerth 주석 참조.
const _FOREIGN_PORT_RE_FB = /인천|부산|광양|울산|마산|군산|목포|포항|동해|대산|여수|삼천포|INCHEON|BUSAN|PUSAN|GWANGYANG|ULSAN|MASAN/i;
function isValidBerthFb(b) {
  if (!b) return false;
  const s = String(b).trim();
  if (!s) return false;
  if (_FOREIGN_PORT_RE_FB.test(s)) return false; // 타항 부두 — 이 앱의 부두가 아니다
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
    // ── TallyOne 1.40-01: **타항 레코드는 저장하지 않는다.** (인계함 [다음 판에 함께]) ──
    //   port_mis_data 는 **콜사인당 1레코드**다. NSFR(V7A2845)에 다음 기항(인천 08-08 13:00) 신고가
    //   들어와 **평택 기록을 통째로 덮었다.** 1.26-01 은 화면 표시만 막아 저장은 그대로였고,
    //   그래서 다른 배에서 재발할 수 있었다. 실측 2026-08-10: 262건 중 **146건이 평택이 아니다.**
    //   ⚠ 항명이 **빈 값이면 평택으로 본다**(isPyeongtaekPortName) — 항명 칸 없는 엑셀 폴백을
    //     깨지 않기 위해서다. 명시적으로 '인천'·'부산' 등이 적힌 것만 막는다(회귀 0).
    if (!isPyeongtaekPortName(s.port)) {
      console.warn('[1.40-01] 타항 레코드 저장 안 함:', key, s.vesselName || '', s.port);
      return;   // failed 로 세지 않는다 — 실패가 아니라 대상 아님이다
    }
    newKeys.add(key);
    try {
      // M6.18: 잘못된 berth 자동 제거 (MBM 등 시설 코드)
      //   확장 v1.0.0 / 옛 OCR / 옛 엑셀 파서 무관하게 저장 시점 차단
      const shipClean = { ...s };
      if (shipClean.berth && !isValidBerthFb(shipClean.berth)) {
        console.warn('[M6.18 berth] 부두 부적합 제거:', shipClean.berth, '(key:', key, ')');
        shipClean.berth = '';
        shipClean.pier = '';   // TallyOne 1.26-01: berth 를 버렸으면 그것으로 만든 pier 도 함께 버린다
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
      // V9.57(G7-①): 미상 항만은 삭제하지 않는다 — 종전 '알 수 없는 값도 평택 간주 삭제'는
      //   다른 항만 데이터를 평택 엑셀 업로드 한 번에 지울 수 있는 위험 경로였다.
      return false;
    }
    // 인천/부산 등 타겟: 정확히 매칭만
    if (t === '인천' || t === 'INCHEON') return p === '인천' || p === 'INCHEON' || p === 'KRINC';
    if (t === '부산' || t === 'BUSAN') return p === '부산' || p === 'BUSAN' || p === 'KRPUS';
    return p === t;  // 그 외는 정확 일치만
  };
  try {
    // 1) 기존 데이터에서 타겟 항만 삭제
    // V9.57(G7-②): read→개별 remove 다발 대신, 스냅샷 시점의 키로 한정한 멀티패스 update 1회로
    //   원자 삭제 — 삭제 도중 새로 들어온 키를 건드리지 않고, 부분 실패(반쯤 지워짐)도 없앤다.
    //   삭제 대상 키를 로그로 남겨 사후 추적 가능하게.
    const snap = await get(ref(db, 'port_mis_data'));
    if (snap.exists()) {
      const all = snap.val() || {};
      const delKeys = Object.entries(all)
        .filter(([, v]) => v && matchTarget(v.port))
        .map(([k]) => k);
      if (delKeys.length) {
        console.log(`[fbReplacePortMisBatch] ${targetPort} 교체 — 스냅샷 기준 삭제 ${delKeys.length}건:`, delKeys);
        const patch = {};
        for (const k of delKeys) patch[`port_mis_data/${k}`] = null;
        await update(ref(db), patch);
        deleted = delKeys.length;
      }
    }
  } catch (e) {
    console.error('[fbReplacePortMisBatch] 옛 데이터 조회/삭제 실패', e);
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

    // ★★★ TallyOne 1.59: **확정된 베이매트릭스는 앱이 못 고친다** (검수사 확정 2026-08-13).
    //   검수사 원문: *"새로운 선박은 베이정보를 갖고 있지 않습니다. 그래서 순서를 정합니다.
    //     먼저 디파인을 읽고 CASP플랜(PDF)를 읽고 뼈대를 만든후에 베이메트릭스를 만듭니다.
    //     여기서 **베이메트릭스가 확정되면 그후로는 앱이 쓰기(즉 수정)이 불가**하며
    //     **관리자만 수정**할수 있으며 그후 **DEF과 PDF는 베이메트릭스에 영향을 주면 안됩니다.**"*
    //
    //   확정본 = user 소스이면서 `provisional`(보정중)이 아닌 것. 새 필드를 만들지 않는다 —
    //   `provisional` 이 이미 "아직 다듬는 중"을 뜻하고, 그 반대가 곧 확정이다.
    //   통과시키는 것은 **매트릭스 빌더에서 온 저장 하나뿐**이다(`sourceFile:'matrix_builder'`).
    //   `.def`·CASP PDF·ASC·전체동기화는 확정본의 bayDef 를 건드릴 수 없다.
    //   ⚠ 이 분기가 없으면 위 `entryIsUser` 조건만으로는 못 막는다 — 자동 경로도 user 표식을
    //     달고 올 수 있었기 때문이다(1.58-02 에서 표식 위조는 막았지만, 잠금은 별개 장치다).
    const existingConfirmed = existingIsUser
      && !(existing?.provisional === true || existing?.bayDef?.provisional === true);
    const fromBuilder = entry?.bayDef?.sourceFile === 'matrix_builder';
    if (existingConfirmed && entry?.bayDef && !fromBuilder) {
      console.warn('[베이사전] 확정된 매트릭스라 자동 경로의 수정을 막았습니다 —', cleanCode,
        '(들어온 출처:', entry?.bayDef?.sourceFile || entry?.source || '미상', ')');
      const guarded = {
        ...existing,
        callsign: existing.callsign || entry.callsign || '',
        imo: existing.imo || entry.imo || '',
        name: existing.name || entry.name || '',
        // bayDef 는 기존 확정본 그대로 — 신원만 빈 곳을 채운다.
      };
      await set(r, guarded);
      return true;
    }

    // 다기기 충돌: 양쪽 user인데 기존이 더 최신이면 덮어쓰지 않음
    if (existingIsUser && entryIsUser) {
      const exTs = Number(existing.updatedAt || existing.bayDef?.parsedAt || 0);
      const enTs = Number(entry.updatedAt || entry.bayDef?.parsedAt || Date.now());
      if (exTs > enTs) {
        // TallyOne 1.11-01: **조용히 실패하지 않는다.** 종전엔 저장을 건너뛰고 `true`(성공)를 돌려줘,
        //   빌더 화면에 "☁ 동기화됨 (다른 기기에서도 보임)"이 떴다. 실제로는 서버에 안 올라가
        //   다른 브라우저·기기는 계속 옛 매트릭스를 봤다 — "저장했는데 적용이 안 된다"의 정체.
        //   (기기 시계가 앞선 기기에서 먼저 저장된 적이 있으면 그 시각을 넘어설 때까지 계속 스킵된다.)
        //   이제 false를 돌려 화면이 "⚠ 동기화 실패 (이 기기에는 저장됨)"을 띄우게 한다.
        console.warn('[fbSaveShipBayDict] 서버 항목이 더 최신이라 저장을 건너뜀 —', cleanCode,
          '서버', new Date(exTs).toISOString(), '> 이번 저장', new Date(enTs).toISOString(),
          '· 기기 시계 차이를 의심할 것');
        return false;
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    // V7.30: 선박명이 명백히 다르면 기존 콜사인은 다른 선박 것(오염) → 새 값으로 교체, 없으면 비움.
    //   (예: 기존 name=XIN TAI PING/callsign=BSDU 인데 새 EDI name=DONGJIN CONTINENTAL →
    //    BSDU는 DONGJIN 것이 아니므로 신뢰 불가. 정상 EDI는 콜사인이 비어 그냥 비워짐.)
    //   user 사전은 위 existingIsUser 분기에서 이미 보호되므로 여기 도달하지 않음.
    const _norm = s => String(s || '').toUpperCase().replace(/[\s\-_.]/g, '');
    const exName = _norm(existing.name), enName = _norm(entry.name);
    //   1.60-02: 길이 조건을 5 → 4 로 낮춘다. 사전 name 칸에 약자 4자가 들어 있는 엔트리가 많아
    //     `>= 5` 에서는 검사가 통째로 꺼졌다(PCSZ·DJCT 오염을 놓친 이유). 4자면 약자도 비교된다.
    //     비교 길이도 min(4, 짧은 쪽)으로 맞춰 'PCSZ' ↔ 'PACIFIC SHENZHEN' 같은 약자↔풀네임 쌍이
    //     엉뚱하게 충돌로 잡히지 않게 한다(둘 다 P·C·S·Z 를 공유하지 않으므로 실제로는 충돌로 잡히나,
    //     그 경우에도 아래 콜사인 유일성 검사가 최종 판단을 하므로 안전한 쪽으로 기운다).
    const _cmpLen = Math.min(4, exName.length, enName.length);
    const nameConflict = exName.length >= 4 && enName.length >= 4
      && !exName.includes(enName.slice(0, _cmpLen)) && !enName.includes(exName.slice(0, _cmpLen));
    const mergedCallsign = nameConflict
      ? (entry.callsign || '')                       // 선박명 충돌 → 기존 콜사인 버림
      : (entry.callsign || existing.callsign || ''); // 같은 배 → 기존 보존

    // ★★★ TallyOne 1.60-02: **콜사인은 배마다 유일하다** — 남의 것이면 붙이지 않는다.
    //   검수사 신고 2026-08-13: *"PCBJ PCSZ가 같게 되어 있습니다. **D5QW2 콜사인 이건 명백히 오류**입니다."*
    //   실측 — 겹침 두 건. `D5QW2`(PCBJ·PCSZ) · `BSDU`(XTPG·DJCT). 항차 자료(199건)는 전부 정확했다.
    //     PCSZ 진짜 콜사인은 `9V8012`, DJCT 는 콜사인 없음. **사전만 남의 것을 달고 있었다.**
    //
    //   왜 위 V7.30 방어가 못 잡았나 — `nameConflict` 가 `exName.length >= 5 && enName.length >= 5`
    //   라서 **선박명이 5자 미만이면 검사가 통째로 꺼진다.** 사전의 name 칸에는 풀네임이 아니라
    //   약자 4자(`PCSZ`·`DJCT`)가 들어 있는 엔트리가 많아 방어가 대부분 무력했다.
    //   (주석의 예시가 하필 BSDU/DONGJIN 인데 그 사례를 못 걸렀다.)
    //
    //   그래서 이름에 기대지 않는 검사를 하나 더 둔다 — **그 콜사인을 이미 다른 코드가 쓰고 있으면
    //   붙이지 않는다.** 검수사 확정 2026-08-11: *"지금 호출부호를 보면 중복이 되지 않습니다."*
    //   조용히 넘기지 않고 콘솔에 남긴다(§2-4 3번).
    let _callsign = mergedCallsign;
    if (_callsign) {
      try {
        const _all = (typeof window !== 'undefined' && window.__fbShipBayDict) || {};
        const _owner = Object.keys(_all).find(k =>
          k.toUpperCase() !== cleanCode.toUpperCase() &&
          String(_all[k]?.callsign || '').toUpperCase().trim() === String(_callsign).toUpperCase().trim());
        if (_owner) {
          console.warn('[베이사전] 콜사인', _callsign, '은 이미', _owner, '의 것입니다 —',
            cleanCode, '에는 붙이지 않습니다(콜사인은 배마다 유일).');
          _callsign = existing.callsign && String(existing.callsign).toUpperCase() !== String(_callsign).toUpperCase()
            ? existing.callsign : '';
        }
      } catch (e) { /* 보관소 캐시 없으면 검사 생략 — 막지는 않는다 */ }
    }

    const merged = {
      ...existing,
      ...entry,
      // 콜사인: 선박명 충돌 시 기존(오염) 버림 · 남의 콜사인이면 안 붙임(1.60-02).
      callsign: _callsign,
      imo: entry.imo || existing.imo || '',
      name: entry.name || existing.name || '',
      // bayDef는 새 데이터가 있으면 갱신 (def 파일 재업로드 케이스)
      bayDef: entry.bayDef || existing.bayDef || null,
      // 1.59: 보정중 플래그는 **부르는 쪽이 명시하면 그대로 따른다**(끄는 길이 없던 버그의 나머지 절반).
      //   종전엔 entry 에 키가 없으면 `...existing` 의 옛 true 가 그대로 남아 영원히 보정중이었다.
      //   ★ 1.62 보완 — 매트릭스를 안 들고 오는 등록(EDI 자동 등록 등)은 **확정/보정중을 말할 자격이 없다.**
      //     1.59 코드가 그런 경우에도 `provisional:false` 를 찍어, 베이가 0인 HAYN 이 "확정" 으로 기록됐다.
      //     bayDef 가 없거나 비었으면 기존 값을 그대로 둔다(새로 생기는 엔트리면 아예 안 찍는다).
      provisional: (() => {
        const _bd = entry.bayDef || existing.bayDef;
        const _hasBays = !!(_bd && (_bd.recordCount > 0
          || (Array.isArray(_bd.baysSummary) && _bd.baysSummary.length > 0)));
        if (!_hasBays) return existing.provisional;               // 판단 보류 — 있던 값 유지
        return entry.provisional !== undefined ? entry.provisional === true
          : (existing.provisional === true);
      })(),
      // ★ TallyOne 1.57-01: 부르는 쪽이 updatedAt 을 명시하면 그것을 존중한다.
      //   종전에는 무조건 Date.now() 로 덮어써서, 「☁ 전체 동기화」가 옛 도장을 보존해 보내도
      //   (ShipMatrixBuilderModal 의 "기존 updatedAt 보존" 주석) 여기서 그 의도가 무효화됐다.
      updatedAt: Number(entry.updatedAt) > 0 ? Number(entry.updatedAt) : Date.now(),
      updatedBy: entry._inspector || entry.editorName || existing.updatedBy || '',
    };
    // ★ TallyOne 1.57-01: 내용이 같으면 쓰지 않는다 (검수사 신고 2026-08-13).
    //   사고 — 2026-08-11 11:25 「☁ 전체 동기화」 한 번에 92건의 updatedAt 이 4초 만에 갱신됐다.
    //   내용은 그대로였다(bayDef.parsedAt 은 5~8월 옛날 값 유지). 그런데 앱은 로컬 사본 95건을
    //   "공유 정본보다 오래됨"으로 띄웠고, 검수사는 무엇이 다른지 모른 채 승인을 눌러야 했다.
    //   승인은 applyApprovedSync 의 통째 교체라 **로컬에만 있던 수정이 날아간다** — 오염 경로다.
    //   updatedAt·updatedBy 를 뺀 나머지가 같으면 쓸 이유가 없다. 도장만 새로 찍는 쓰기를 막는다.
    //   ⚠ 키 순서에 안 흔들리게 정렬 직렬화를 쓴다(RTDB 는 키를 정렬해 주고 로컬은 저장 순서를 지킨다).
    const _stable = (v) => {
      if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
      if (Array.isArray(v)) return '[' + v.map(_stable).join(',') + ']';
      return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + _stable(v[k])).join(',') + '}';
    };
    const _cmp = (o) => { const { updatedAt, updatedBy, ...rest } = o || {}; return _stable(rest); };
    if (existing && _cmp(existing) === _cmp(merged)) return true;   // 무변경 — 쓰지 않고 성공으로 본다
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
  // 1.58: 병렬(Promise.all) → 순차. 2026-08-11 11:25 이 함수가 4초에 92건을 쏟아
  //   전 엔트리 updatedAt 을 한꺼번에 갱신했고, 검수사는 그날부터 헛경고 95건을 봤다.
  //   순차면 느리지만 사전은 백 건 규모라 문제가 안 되고, 무엇이 언제 올라갔는지가 남는다.
  //   (무변경 항목은 fbSaveShipBayDict 안에서 이미 걸러져 쓰지 않는다.)
  let saved = 0, failed = 0;
  for (const [code, entry] of Object.entries(entries)) {
    const ok = await fbSaveShipBayDict(code, entry);
    if (ok) saved++; else failed++;
  }
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
// V9.57(G14): 외부 참조 0 (내부 fbSetMatrixEditors에서만 호출) — export 제거, 내부 함수로 전환.
async function fbGetMatrixEditors() {
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
    // 1.80(검수사 확정 2026-08-17): **관리자도 명단을 수정할 수 있다** — 매트릭스 권한 부여가
    //   빌더(배를 하나 열어야 접근)에 묻혀 있어 인원관리(관리자 전용)로 옮기면서, 관리자가
    //   명단에 없어도 주고 뺄 수 있어야 한다. 종전 «명단에 있는 사람만» 규칙은 그대로 살아 있다.
    let actorIsAdmin = false;
    if (!allowed.includes(actorName)) {
      try {
        const g = await fbGetAdminGuard();
        actorIsAdmin = !!(g && g.admins && g.admins[actorName] && g.admins[actorName].revoked !== true)
          || actorName === '김성일';   // 소유자는 DB와 무관(adminGuard.OWNER_NAME과 동일 규칙)
      } catch (e) { actorIsAdmin = false; }
    }
    if (!allowed.includes(actorName) && !actorIsAdmin) {
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

// ─── TallyOne 1.41: 개발용 접근 명단 (dev_access) ──────────────────────────────
//   수석 대시보드 **화면만** 열어 주는 명단이다. 직급(staffList.role)과 별개 축이고,
//   비밀번호 잠금(isLockedName) 대상에도 들어가지 않는다 — 검수사 확답 2026-08-10.
//   ⛔ 고칠 수 있는 사람은 **관리자뿐**(검수사 확답 "관리자만"). matrix_editors 처럼
//     '명단에 있는 사람이 명단을 고치는' self-service 가 아니다.
const DEV_ACCESS_NODE = 'dev_access';

export function fbSubscribeDevAccess(callback) {
  const r = ref(db, DEV_ACCESS_NODE);
  const handler = onValue(r, snap => {
    callback(snap.exists() ? (snap.val() || {}) : {});
  }, (e) => {
    // 3금지③ — 조용히 실패하지 않는다. 실패하면 빈 명단으로 보수적으로 간다(권한이 열리지 않음).
    console.error('[fbSubscribeDevAccess] 구독 실패', e);
    callback({});
  });
  return () => off(r, 'value', handler);
}

/**
 * 개발용 접근 부여/회수. **관리자만** 가능.
 * @param {string} actor  요청자 이름 (현재 로그인한 검수자)
 * @param {string} target 대상 이름
 * @param {boolean} on    true=부여 / false=회수
 * @returns {Promise<{ok:boolean, reason?:string}>}
 */
export async function fbSetDevAccess(actor, target, on) {
  const a = String(actor || '').trim();
  const t = String(target || '').trim();
  if (!a || !t) return { ok: false, reason: 'no_name' };
  try {
    // 권한 확인은 **서버 값을 다시 읽어서** 한다 — 화면 state 를 믿지 않는다.
    const guard = await fbGetAdminGuard();
    if (!isAdminName(guard, a)) return { ok: false, reason: 'not_admin' };
    if (on) {
      await set(ref(db, `${DEV_ACCESS_NODE}/${t}`), {
        name: t, grantedBy: a, grantedAt: Date.now(),
      });
    } else {
      await set(ref(db, `${DEV_ACCESS_NODE}/${t}`), null);
    }
    return { ok: true };
  } catch (e) {
    console.error('[fbSetDevAccess] 저장 실패', t, e);
    return { ok: false, reason: 'fb_error' };
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

// V9.57(G14): fbGetPierCoords 삭제 — 저장소 전체 grep 참조 0 확인(구독형 fbSubscribePierCoords만 사용).


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
export async function fbSaveShipIntro(shipId, text, by, sources = []) {
  if (!shipId || !text) return false;
  // 1.39-03: 저장 상한도 함께 올린다 — 본문이 길어졌는데 3000자에서 다시 자르면 같은 일이 반복된다.
  const rec = { text: String(text).slice(0, 8000), by: by || '', at: Date.now() };
  if (Array.isArray(sources) && sources.length) rec.sources = sources.slice(0, 5);
  await set(ref(db, `ship_intros/${shipId}`), rec);   // V9.18-01: 출처 링크 동봉
  return true;
}

// ── V9.25: 검증 모드(테스트 랩) — 검수확인 전체 취소 (성일님 전용 재검수 도구) ──
//   패치 빌더는 순수 함수로 분리해 실데이터 시뮬로 검증한다.
// V9.57(G14): 외부 참조 0 (내부 fbBulkCancelComplete에서만 호출) — export 제거, 내부 함수로 전환.
function buildBulkCancelPatch(records) {
  const patch = {};
  let actualCnt = 0;
  for (const [cn, r] of Object.entries(records || {})) {
    if (!r || typeof r !== 'object') continue;
    if (r.bay_actual !== undefined && r.bay_actual !== null && r.bay_actual !== '') {
      for (const f of ['bay_actual', 'row_actual', 'tier_actual', 'actual_at', 'actual_by']) {
        patch[`records/${cn}/${f}`] = null;
      }
      actualCnt++;
    }
  }
  return { patch, actualCnt };
}

export async function fbBulkCancelComplete(voyageKey, mode, { resetActuals = false } = {}) {
  const base = `voyages/${voyageKey}/${mode}`;
  const compSnap = await get(ref(db, `${base}/completed`));
  const comp = compSnap.val() || {};
  const canceled = Object.keys(comp).length;
  const updates = { [`${base}/completed`]: null };
  let actualsReset = 0;
  if (resetActuals) {
    const recSnap = await get(ref(db, `${base}/records`));
    const { patch, actualCnt } = buildBulkCancelPatch(recSnap.val() || {});
    actualsReset = actualCnt;
    for (const [k, v] of Object.entries(patch)) updates[`${base}/${k}`] = v;
  }
  // 마감 플래그 해제 — 재검수 시 화면이 '마감됨'으로 남지 않도록
  updates[`voyages/${voyageKey}/info/${mode === 'loading' ? 'loadingDone' : 'dischargeDone'}`] = null;
  updates[`voyages/${voyageKey}/info/${mode === 'loading' ? 'loadingDoneAt' : 'dischargeDoneAt'}`] = null;
  await update(ref(db), updates);
  return { canceled, actualsReset };
}

// V9.37(판6): 수집기 즉시 처리 명령 — 5분 사이클을 기다리지 않고 그 항차만 지금 처리시킨다.
//   사용자가 받은 자료를 폴더에 넣은 직후 반영이 필요할 때(2026-08-01 XTPG 534W 손보완 사례).
//   수집기는 대기 중 30초마다 collector_commands 를 보고, 끝나면 collector_commands_done 에 결과를 남긴다.
export async function fbRequestProcessNow(vessel, voy, by = '') {
  const key = `${(vessel || '').toUpperCase()}_${(voy || '').toUpperCase()}_${Date.now()}`;
  await set(ref(db, `collector_commands/${key}`), {
    action: 'process_now', vessel: (vessel || '').toUpperCase(),
    voy: (voy || '').toUpperCase(), at: Date.now(), by: by || '',
  });
  return key;
}

export function fbSubscribeProcessDone(key, callback) {
  const r = ref(db, `collector_commands_done/${key}`);
  return onValue(r, (snap) => callback(snap.val() || null));
}

// ─── TallyOne 1.1: 클로드에게 메모 — /claude_inbox/{pushKey} 노드 ───
//   검수사가 작업 중 발견한 문제·요청을 앱에서 기록하면 클로드 세션이 나중에 읽어 처리한다.
//   콘앱 불편신고(feedback 노드)와 같은 계열이며 비용은 0원.
//   memo = { text, inspector, route, voyageKey, mode, appVersion, at, status:'new' }

// 메모 1건 저장 — 실패는 상위로 던진다. 호출부(ClaudeMemoModal)가 오프라인 큐로 보관한다.
export async function fbAddClaudeMemo(memo) {
  const r = push(ref(db, 'claude_inbox'));
  await set(r, { status: 'new', at: Date.now(), ...memo });
  return r.key;
}

// 최근 메모 목록 1회 조회(get) — at 역순(최신 먼저), 기본 30건
export async function fbGetClaudeMemos(limit = 30) {
  const snap = await get(ref(db, 'claude_inbox'));
  const all = snap.exists() ? snap.val() : {};
  return Object.entries(all || {})
    .map(([key, v]) => ({ key, ...(v || {}) }))
    .sort((a, b) => (b.at || 0) - (a.at || 0))
    .slice(0, limit);
}

// 메모 삭제 — 클로드가 처리 완료한 뒤 정리하거나, 검수사가 잘못 보낸 메모를 지울 때
export async function fbDeleteClaudeMemo(key) {
  if (!key) return;
  await remove(ref(db, `claude_inbox/${key}`));
}

// ─── TallyOne 1.3: 활동 로그 — activity_log/{YYMMDD}/{pushKey} ───
//   "검수원이 뭘 보려고 들어왔는지"를 남긴다(열람 자체가 데이터 — 사용자 확정 2026-08-03).
//   일 단위 버킷이라 30일 정리를 버킷 통삭제로 싸게 한다. 버킷 키·정리 판정은
//   activityLog.js(activityDayKey·pickExpiredActivityBuckets)가 단일 소스.

// 활동 1건 기록 — 호출부(activityLog.js logActivity)가 fire-and-forget으로 부른다.
export async function fbPushActivity(dayKey, payload) {
  const r = push(ref(db, `activity_log/${dayKey}`));
  await set(r, payload);
  return r.key;
}

// 최근 N일 버킷 병합 조회 — at 역순(최신 먼저). 소유자 뷰어(ChiefDashboard 활동 로그)용.
export async function fbGetActivityDays(days = 7) {
  const now = Date.now();
  const dayKeys = [];
  for (let i = 0; i < days; i++) dayKeys.push(activityDayKey(now - i * 86400000));
  const snaps = await Promise.all(dayKeys.map(k => get(ref(db, `activity_log/${k}`))));
  const out = [];
  snaps.forEach((snap, i) => {
    if (!snap.exists()) return;
    for (const [id, v] of Object.entries(snap.val() || {})) out.push({ id, day: dayKeys[i], ...(v || {}) });
  });
  return out.sort((a, b) => (b.at || 0) - (a.at || 0));
}

// 30일 지난 버킷 정리 — shallow로 키만 나열(fbListArchive와 같은 방식) 후 버킷째 remove.
//   소유자 화면(활동 로그 섹션) 진입 시 1회 호출. 실패 무해 — console.warn 1줄만 남긴다.
export async function fbCleanupActivityLog(keepDays = 30) {
  try {
    const res = await fetch(`${firebaseConfig.databaseURL}/activity_log.json?shallow=true`);
    if (!res.ok) throw new Error(`shallow HTTP ${res.status}`);
    const keys = Object.keys((await res.json()) || {});
    const expired = pickExpiredActivityBuckets(keys, keepDays, Date.now());
    for (const k of expired) await remove(ref(db, `activity_log/${k}`));
    if (expired.length > 0) console.log(`[활동로그] ${keepDays}일 지난 버킷 ${expired.length}개 정리 완료`);
    return expired.length;
  } catch (e) {
    console.warn('[fbCleanupActivityLog] 정리 실패(무해)', e);
    return 0;
  }
}
