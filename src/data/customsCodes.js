// 세관 검수 결과 코드표 한 벌 — 검수사가 준 원문 그대로(코드 → 뜻). 자료별 대조 묶음 머리줄의 «(세관 코드 MFN 후보)» 가 이 표의 코드만 쓴다(4.22)
//  ★ 검수사 2026-10-10 09:34 원문 — «AWP : 생물이 죽었음 / CND : 컨테이너번호 다름 / CNN : 컨테이너 번호 없음 / CSL : 세관봉인부착 / ETC : 기타 /
//    MFN : 화물있으나 적하목록 없음 / MGN : 적하목록있으나 화물없음 / OKY : 이상없음 / PER : 부패 / SLN : 봉인번호 다름 / SLW : 봉인번호 파손 / WET : 비에 젖음».
//  ⚠ 글자를 고치지 않는다(원문 표기 그대로). 앱은 «후보» 만 말한다 — 세관 신고 코드를 정하는 것은 검수사다.
export const CUSTOMS_RESULT_CODES = Object.freeze({
  AWP: '생물이 죽었음',
  CND: '컨테이너번호 다름',
  CNN: '컨테이너 번호 없음',
  CSL: '세관봉인부착',
  ETC: '기타',
  MFN: '화물있으나 적하목록 없음',
  MGN: '적하목록있으나 화물없음',
  OKY: '이상없음',
  PER: '부패',
  SLN: '봉인번호 다름',
  SLW: '봉인번호 파손',
  WET: '비에 젖음',
});

//  ★ 검수사 09:37 «KKLC같은건 MFN대상으로 알림을 해주고 실오류 SLN 등 여러 조건이 발생될때 마다 해당하는 알림에 표기해주세요» —
//    알림 머리에 «코드 [대상] [N대] — 뜻[(덧말)]» 한 토막. 뜻은 이 표에서만 가져온다(글자를 따로 적지 않는다). 표에 없는 코드는 빈 글.
export function customsCodeLabel(code, { kind = '', n = null, note = '' } = {}) {
  const m = CUSTOMS_RESULT_CODES[code];
  if (!code || !m) return '';
  return `${code}${kind ? ` ${kind}` : ''}${n != null ? ` ${n}대` : ''} — ${m}${note ? `(${note})` : ''}`;
}

//  묶음 머리줄 한 토막 — 표에 없는 코드는 말하지 않는다(빈 글).
export function customsCodeHint(code, n = null) {
  if (!code || !CUSTOMS_RESULT_CODES[code]) return '';
  return n == null ? `(세관 코드 ${code} 후보)` : `(세관 코드 ${code} 후보 ${n}대)`;
}
