// 접근 오프로 막힌 이름의 접속시도와 콘앱 하루 첫 실행을 세는 기록 — 소유자 «🚪 접속 기록» 화면이 읽는다
//   검수사 2026-11-06 18:06 «접속시도가 많으면 사용하고픈 마음이 있다고 보고 열어줄지 말지 결정하는데 이용할려고 합니다.
//   콘앱도 사용빈도를 몰라 지속여부를 결정할려고 하는것입니다» · 18:07 «로그관리는 제 개인 메뉴에 넣어 주시기 바랍니다».
//   저장 구조 — access_log/{YYMMDD}/{pushKey} = { t:'denied'|'cone', n?:이름(denied 만), d:기기 구분 값, at, v?:판 }
//   원칙 — fire-and-forget(기록이 안 돼도 화면·로그인 흐름을 막지 않는다) · 이름·비밀번호 값 외에 개인 정보를 적지 않는다.
//   접근 차단 방식(isStaffOff·자물쇠 화면)은 건드리지 않는다. 이 파일은 «센다»만 한다.
import { activityDayKey } from './activityLog.js';
import { OWNER_NAME } from './adminGuard.js';

//  집계에서 빼는 이름 — 검수사 2026-11-06 18:48 «접속횟수에서 클로드와 제꺼는 제외 해주시기 바랍니다»
export const ACCESS_SKIP_NAMES = [OWNER_NAME, '클로드'];
const SKIP_KEY = 'tallyAccessSkip';

const DEV_KEY = 'tallyAccessDev';

// ── 기기 구분 값 — 이 브라우저에 한 번 만든 임의 문자열(사람 이름과 무관). 저장소를 못 쓰면 이번 실행 동안만 같은 값 ──
let _memDev = '';
export function accessDeviceId() {
  try {
    let v = localStorage.getItem(DEV_KEY);
    if (!v) { v = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); localStorage.setItem(DEV_KEY, v); }
    return v;
  } catch (e) {
    if (!_memDev) _memDev = Math.random().toString(36).slice(2, 10);
    return _memDev;
  }
}

// ── firebase 지연 로드(순환 참조 방지 — activityLog.js 와 같은 방식) ──
let _fbPushAccess = null;
async function _push(dayKey, payload) {
  if (!_fbPushAccess) { const m = await import('./firebase.js'); _fbPushAccess = m.fbPushAccess; }
  return _fbPushAccess(dayKey, payload);
}

const _warnAt = {};
function _warnOnce(e) {
  const reason = String((e && e.message) || e || 'unknown');
  const now = Date.now();
  if (_warnAt[reason] && now - _warnAt[reason] < 60000) return;
  _warnAt[reason] = now;
  console.warn('[접속기록] 기록 실패(무해) —', reason);
}

// ── 막힌 이름으로 로그인을 시도한 한 번을 센다 — 호출은 handleSelectInspector 의 접근 오프 갈래 한 곳 ──
export function logDeniedAttempt(name) {
  const n = String(name || '').trim();
  if (!n) return;
  try {
    const at = Date.now();
    _push(activityDayKey(at), { t: 'denied', n, d: accessDeviceId(), at }).catch(_warnOnce);
  } catch (e) { _warnOnce(e); }
}

// ── 소유자·클로드가 로그인한 기기는 «내 기기» — 이 브라우저는 앞으로 콘앱 실행을 기록하지 않고(같은 주소의 저장소를 콘앱도 읽는다),
//    한 번 skip 줄을 남겨 이미 쌓인 이 기기 기록도 요약에서 뺀다. 로그인 지점(handleSelectInspector)이 이름을 넘긴다 ──
export function markSkipDevice(name) {
  if (!ACCESS_SKIP_NAMES.includes(String(name || '').trim())) return;
  try {
    if (localStorage.getItem(SKIP_KEY) === '1') return;
    localStorage.setItem(SKIP_KEY, '1');
  } catch (e) { /* 저장소를 못 쓰면 매번 한 줄 — 요약은 같은 기기를 한 번으로 센다 */ }
  try { _push(activityDayKey(Date.now()), { t: 'skip', n: String(name).trim(), d: accessDeviceId(), at: Date.now() }).catch(_warnOnce); } catch (e) { _warnOnce(e); }
}

// ── 순수 요약 — rows 는 fbGetAccessLog 가 돌려준 {t,n,d,at,day} 배열. 화면과 연막검사가 같이 쓴다 ──
//   denied: 이름마다 총 횟수 · 시도한 날 수 · 처음/마지막 시각 · 기기 수 (많은 순 → 마지막 시도가 늦은 순)
//   cone: 날짜마다 실행한 기기 수 · 기간 전체 기기 수 · 기기마다 쓴 날 수의 분포(1일/2~3일/4일 이상)
export function summarizeAccess(rows) {
  const denied = {};
  const coneDays = {};
  const coneDev = {};
  rows = Array.isArray(rows) ? rows : [];   // 못 읽었거나 모양이 다르면 빈 기록으로 본다
  const skipDev = new Set(rows.filter((r) => r && r.t === 'skip' && r.d).map((r) => r.d));   // 소유자·클로드 기기
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    if (r.d && skipDev.has(r.d)) continue;   // 내 기기에서 나온 줄은 전부 뺀다
    if (r.t === 'denied' && r.n) {
      if (ACCESS_SKIP_NAMES.includes(r.n)) continue;
      const o = denied[r.n] || (denied[r.n] = { name: r.n, total: 0, days: new Set(), devs: new Set(), first: 0, last: 0 });
      o.total += 1;
      if (r.day) o.days.add(r.day);
      if (r.d) o.devs.add(r.d);
      const at = Number(r.at) || 0;
      if (at && (!o.first || at < o.first)) o.first = at;
      if (at > o.last) o.last = at;
    } else if (r.t === 'cone' && r.d) {
      const day = r.day || '';
      (coneDays[day] || (coneDays[day] = new Set())).add(r.d);
      (coneDev[r.d] || (coneDev[r.d] = new Set())).add(day);
    }
  }
  const deniedList = Object.values(denied)
    .map((o) => ({ name: o.name, total: o.total, dayCount: o.days.size, devCount: o.devs.size, first: o.first, last: o.last }))
    .sort((a, b) => b.total - a.total || b.last - a.last);
  const coneByDay = Object.keys(coneDays).sort().map((day) => ({ day, devices: coneDays[day].size }));
  const useDays = Object.values(coneDev).map((s) => s.size);
  return {
    denied: deniedList,
    deniedTotal: deniedList.reduce((a, o) => a + o.total, 0),
    coneByDay,
    coneDevices: useDays.length,
    coneOnce: useDays.filter((n) => n === 1).length,
    coneFew: useDays.filter((n) => n >= 2 && n <= 3).length,
    coneMany: useDays.filter((n) => n >= 4).length,
  };
}
