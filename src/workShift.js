// 주간조·야간조 한 벌(4.79) — 서버 시각 기준 근무조 판정, 주야 구분 없는 배(OBWH·RZOR), 호기 보유 키(항차+호기+조)가 쓰는 조 비교를 여기서만 한다(순수 모듈 — 다른 파일을 부르지 않는다).
//
//  검수사 2026-11-08 —
//   «방법은 로그인 하고 선박을 선택하면 야간조 입니까 주간조 입니까를 물어 선택하게 해야 겠습니다.»
//   «만약 야간조인데 지금 접속해 있다면 그인원은 보기만 하러 온것입니다» · «반대로 주간조인데 야간에 접속해있어도 조회만 하는 인원입니다»
//   «연태obwh 일조 rzor» (연태 OBWH · 일조 RZOR 는 주야간이 따로 없다 — 조를 묻지 않고 시간 제한도 두지 않는다)
//  기본 근무 시각(검수사가 따로 답하지 않은 기본값) — 주간 06:00~18:00 · 야간 18:00~익일 06:00, 한국 시각, 서버 시각 기준(기기 시계는 믿지 않는다).

//  주야 구분 없는 배 코드 한 곳 — 연태(OBWH)·일조(RZOR) + 일조 대체 카페리 SMYA(앞 판 utils.NO_SHIFT_SHIPS 3.0-01 그대로 옮김, 브리핑·갱 배분의 shipHasShifts 와 같은 목록).
//  항차 키는 OBWH_2690W 꼴이라 앞 코드로 읽는다(utils.isFerry1700Ship 과 같은 읽기).
export const NO_SHIFT_SHIPS = ['OBWH', 'RZOR', 'SMYA'];
export const DAY_START_H = 6;
export const DAY_END_H = 18;

/** 항차 키(OBWH_2690W) 또는 info.vsl 로 읽은 배 코드(대문자). */
export function shipCodeOfKey(key, info) {
  return String((info && info.vsl) || String(key || '').split('_')[0] || '').trim().toUpperCase();
}
/** 주간·야간 구분이 없는 배인가 — 조를 묻지 않고 시간 제한도 두지 않는다. */
export function isNoShiftShip(info, key = '') {
  return NO_SHIFT_SHIPS.includes(shipCodeOfKey(key, info));
}

let _offset = 0;   // 서버 시각 − 기기 시각(ms). Firebase .info/serverTimeOffset 이 도착하면 firebase.js 가 세운다. 못 받았으면 0(기기 시계).
export function setServerOffset(ms) { _offset = Number.isFinite(Number(ms)) ? Number(ms) : 0; }
export function serverOffset() { return _offset; }
/** 서버 기준 지금(ms). */
export function serverNow() { return Date.now() + _offset; }

/** 그 시각(ms)의 근무조 — 'day'(06:00~18:00) | 'night'. */
export function shiftAt(ms) {
  const h = new Date((Number(ms) || 0) + 9 * 3600 * 1000).getUTCHours();
  return (h >= DAY_START_H && h < DAY_END_H) ? 'day' : 'night';
}
export function nowShift() { return shiftAt(serverNow()); }   // utils.currentShift(08:00~17:30·19:00~06:30 객체)와 이름·뜻이 다르다 — 이쪽은 로그인 조 선택용 두 갈래 문자열
export function shiftLabel(s) { return s === 'day' ? '주간조' : s === 'night' ? '야간조' : ''; }
export function shiftWindowText(s) { return s === 'day' ? '06:00~18:00' : s === 'night' ? '18:00~익일 06:00' : ''; }

/** 명단 한 줄(inspectors/이름)의 근무조 — 적힌 workShift, 없으면(4.79 이전 로그인) 지정한 시각의 조로 본다. */
export function holderShiftOf(i) {
  if (i && (i.workShift === 'day' || i.workShift === 'night')) return i.workShift;
  return shiftAt(Number(i && (i.assignAt || i.lastActive || i.loginAt)) || 0);
}
/** 호기 보유 키 한 벌 — 같은 항차·같은 호기라도 조가 다르면 서로 다른 보유다. 주야 구분 없는 배는 조를 보지 않는다. */
export function holdKeyShiftOf(voyageKey, shift) {
  return isNoShiftShip(null, voyageKey) ? '' : (shift === 'day' || shift === 'night' ? shift : '');
}
export function sameHoldShift(voyageKey, a, b) {
  return holdKeyShiftOf(voyageKey, a) === holdKeyShiftOf(voyageKey, b);
}
