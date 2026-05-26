// 사용자 업로드 베이사전 — M4.4 신규
// localStorage 기반: 사용자가 .def 파일 업로드하면 여기에 누적
//
// 구조: { [code]: bayDictEntry, [code2]: ... }
// 키: 파일명에서 추출한 CASP 코드 (예: "TNJP", "ATPR")
//
// 우선순위 (shipStructure.js에서 사용):
//   1. userBayDict (이 모듈) — 사용자 업로드, 검증된 M4.4 메서드
//   2. SHIP_BAY_DICT (shipBayDict.js) — 임베드된 v1.1, 미검증

const STORAGE_KEY = 'master_user_bay_dict_v1';

// localStorage 안전 접근 (사파리 시크릿 모드 등 fail-safe)
const _ls = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } },
};

/**
 * 사용자 베이사전 전체 로드
 * @returns {object} { code: bayDictEntry, ... }
 */
export function loadUserBayDict() {
  const raw = _ls.get(STORAGE_KEY);
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

/**
 * 단일 항목 조회 (IMO 또는 코드)
 * @param {string} imo
 * @param {string} code
 * @returns {object|null}
 */
export function lookupUserBayDict(imo, code) {
  const dict = loadUserBayDict();
  if (imo && dict[imo]) return dict[imo];
  if (code) {
    if (dict[code]) return dict[code];
    // 키가 IMO인 경우, code 필드로 검색
    for (const k of Object.keys(dict)) {
      if (dict[k].code === code) return dict[k];
    }
  }
  return null;
}

/**
 * .def 파싱 결과를 사전에 추가 (또는 갱신)
 * 키 우선순위: code (IMO는 .def에 없음)
 * @param {object} entry - analysisToBayDictEntry() 결과
 * @returns {boolean} 저장 성공 여부
 */
export function addToUserBayDict(entry) {
  if (!entry || !entry.code) return false;
  const dict = loadUserBayDict();
  dict[entry.code] = entry;
  return _ls.set(STORAGE_KEY, JSON.stringify(dict));
}

/**
 * 항목 삭제 (사용자가 잘못 업로드한 경우 등)
 * @param {string} key - code 또는 IMO
 * @returns {boolean}
 */
export function removeFromUserBayDict(key) {
  const dict = loadUserBayDict();
  if (!(key in dict)) return false;
  delete dict[key];
  return _ls.set(STORAGE_KEY, JSON.stringify(dict));
}

/**
 * 등록된 모든 사용자 베이사전 목록 (UI 표시용)
 * @returns {Array} [{ code, name, bayCount, sourceFile, parsedAt }, ...]
 */
export function listUserBayDict() {
  const dict = loadUserBayDict();
  return Object.values(dict).map(entry => ({
    imo: entry.imo || '',
    code: entry.code,
    name: entry.name,
    callsign: entry.callsign,
    bayCount: entry.bayDef?.recordCount || 0,
    sourceFile: entry.bayDef?.sourceFile || '',
    parsedAt: entry.bayDef?.parsedAt || '',
    sourceVersion: entry.bayDef?.sourceVersion || '',
    verified: entry.bayDef?.verified || false,
  }));
}

/**
 * 통계 (디버그/대시보드용)
 */
export function getUserBayDictStats() {
  const dict = loadUserBayDict();
  const ships = Object.values(dict);
  return {
    totalShips: ships.length,
    totalBays: ships.reduce((sum, s) => sum + (s.bayDef?.recordCount || 0), 0),
    storageKey: STORAGE_KEY,
  };
}

/**
 * 사용자 베이사전 전체 초기화 (위험! 확인 필수)
 */
export function clearUserBayDict() {
  return _ls.set(STORAGE_KEY, '{}');
}
