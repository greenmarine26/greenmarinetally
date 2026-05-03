// 자연어 검색 파서
// 예: "40피트 4777"     → { size: '40', digits: '4777' }
//     "리퍼 몇개?"       → { type: 'rf', isStat: true }
//     "20 엠티"          → { size: '20', fe: 'E' }
//     "엑스레이 몇 대"   → { type: 'xray', isStat: true }
//     "위험물 4777"      → { type: 'dg', digits: '4777' }
import { isoToLabel } from './utils.js';

export function parseNaturalQuery(text) {
  const result = {
    digits: '',
    size: null,    // '20' | '40' | '45'
    fe: null,      // 'F' | 'E'
    type: null,    // 'rf' | 'dg' | 'fr' | 'ot' | 'tk' | 'xray'
    isStat: false, // "몇 개" 질의
  };
  if (!text) return result;
  const t = String(text).toLowerCase();

  // 끝 4자리
  const digits = String(text).replace(/\D/g, '');
  if (digits.length >= 2) result.digits = digits.slice(-4);

  // 사이즈
  if (/45\s*(피트|ft|hc)?/i.test(t)) result.size = '45';
  if (/40\s*(피트|ft|hc)?/i.test(t)) result.size = '40';
  if (/20\s*(피트|ft)?/i.test(t)) result.size = '20';
  // 우선순위: 더 명시적인 것 우선
  if (/45\s*(피트|hc)/i.test(t)) result.size = '45';
  else if (/40\s*(피트|hc)/i.test(t)) result.size = '40';
  else if (/20\s*피트/i.test(t)) result.size = '20';

  // F/E
  if (/풀|적컨|full|loaded|적재/i.test(t)) result.fe = 'F';
  else if (/엠티|empty|공컨|^공\s|\s공$/i.test(t)) result.fe = 'E';

  // 특수 화물
  if (/리퍼|reefer|냉장|냉동|^rf$|\srf\s/i.test(t)) result.type = 'rf';
  else if (/위험물|hazmat|imdg|^dg$|\sdg\s/i.test(t)) result.type = 'dg';
  else if (/엑스레이|x.?ray/i.test(t)) result.type = 'xray';
  else if (/탱크|tank|^tk$/i.test(t)) result.type = 'tk';
  else if (/플랫\s*랙|flat\s*rack|^fr$/i.test(t)) result.type = 'fr';
  else if (/오픈\s*탑|open\s*top|^ot$/i.test(t)) result.type = 'ot';

  // 통계 질의 ("몇 개", "몇 대", "얼마나")
  if (/몇\s*(개|대|건)|얼마나|총\s*몇|개수|대수/i.test(t)) result.isStat = true;

  return result;
}

// 파싱된 조건으로 컨테이너 필터링
export function applyNLFilter(containers, parsed) {
  let r = containers;
  if (parsed.digits) {
    r = r.filter(c => c.cn?.includes(parsed.digits) || c.l4?.includes(parsed.digits));
  }
  if (parsed.size === '20') {
    r = r.filter(c => {
      const lbl = isoToLabel(c.iso) || '';
      return lbl.startsWith('20') || /^2[25]/.test(c.iso || '');
    });
  } else if (parsed.size === '40') {
    r = r.filter(c => {
      const lbl = isoToLabel(c.iso) || '';
      return lbl.startsWith('40') || /^4[245]/.test(c.iso || '');
    });
  } else if (parsed.size === '45') {
    r = r.filter(c => {
      const lbl = isoToLabel(c.iso) || '';
      return lbl.startsWith('45') || /^45/.test(c.iso || '');
    });
  }
  if (parsed.fe) r = r.filter(c => c.fe === parsed.fe);
  if (parsed.type === 'rf') r = r.filter(c => c.rf || (c.tmp && c.tmp !== '0'));
  else if (parsed.type === 'dg') r = r.filter(c => c.dg);
  else if (parsed.type === 'xray') r = r.filter(c => c._xray);
  else if (parsed.type === 'tk') r = r.filter(c => c.tk);
  else if (parsed.type === 'fr') r = r.filter(c => c.fr);
  else if (parsed.type === 'ot') r = r.filter(c => c.ot);
  return r;
}

// 파싱된 조건의 한국어 설명
export function describeQuery(parsed) {
  const desc = [];
  if (parsed.size) desc.push(`${parsed.size}피트`);
  if (parsed.fe === 'F') desc.push('풀(적컨)');
  if (parsed.fe === 'E') desc.push('엠티(공컨)');
  if (parsed.type === 'rf') desc.push('리퍼');
  if (parsed.type === 'dg') desc.push('위험물 DG');
  if (parsed.type === 'xray') desc.push('X-RAY 대상');
  if (parsed.type === 'tk') desc.push('탱크');
  if (parsed.type === 'fr') desc.push('플랫랙 FR');
  if (parsed.type === 'ot') desc.push('오픈탑 OT');
  if (parsed.digits) desc.push(`끝4자리 ${parsed.digits}`);
  return desc.join(' ') || '전체';
}

// 어떤 조건이든 잡혔는지
export function hasAnyCondition(parsed) {
  return parsed.digits || parsed.size || parsed.fe || parsed.type;
}
