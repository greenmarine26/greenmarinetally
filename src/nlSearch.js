// 자연어 검색 파서 (M1.9 강화)
//  - 단어 경계 \b 사용 → "fr 몇개야", "tk 몇개야" 모두 매칭
//  - "컨테이너 몇 개야" → 전체 카운트
//  - "OOG 몇 개야" 추가
//  - 다중 키워드 조합
import { isoToLabel } from './utils.js';

export function parseNaturalQuery(text) {
  const result = {
    digits: '',
    size: null,
    fe: null,
    type: null,
    temp: null,        // 온도 정확 일치 (예: -18)
    tempRange: null,   // 온도 범위 (예: { min: -25, max: -10 })
    isAll: false,
    isStat: false,
  };
  if (!text) return result;
  const t = String(text).toLowerCase();

  // 끝 4자리 (숫자 추출) — 온도 표현 제외용으로 별도 판정
  // "리퍼 -18도" 같은 경우엔 -18을 컨번호로 잡으면 안 됨
  // → 온도 키워드 ('도', '°', '온도', '영하', '영상', 'reefer')가 있으면 digits 추출 X
  const hasTempCtx = /도\s|도$|°|온도|영하|영상|마이너스|temperature|reefer|리퍼|냉장|냉동/i.test(t);
  if (!hasTempCtx) {
    const digits = String(text).replace(/\D/g, '');
    if (digits.length >= 2) result.digits = digits.slice(-4);
  }

  // 사이즈 — 숫자 단독 매칭 (40만 또는 40피트, 40HC 등)
  // 우선순위: 명시적 ('피트', 'HC') > 단순 숫자
  if (/45\s*(피트|hc|ft)/i.test(t)) result.size = '45';
  else if (/40\s*(피트|hc|ft)/i.test(t)) result.size = '40';
  else if (/20\s*(피트|ft)/i.test(t)) result.size = '20';

  // F/E
  if (/풀|적컨|적재|loaded/i.test(t)) result.fe = 'F';
  else if (/\bfull\b/i.test(t)) result.fe = 'F';
  else if (/엠티|공컨/i.test(t)) result.fe = 'E';
  else if (/\bempty\b|\bmt\b/i.test(t)) result.fe = 'E';

  // 특수 화물 (단어 경계 \b 사용 — "fr 몇개야"의 "fr" 매칭됨)
  if (/리퍼|reefer|냉장|냉동/i.test(t) || /\brf\b/i.test(t)) result.type = 'rf';
  else if (/위험물|hazmat|imdg/i.test(t) || /\bdg\b/i.test(t)) result.type = 'dg';
  else if (/엑스레이|x[\s.\-]*ray|xray/i.test(t)) result.type = 'xray';
  else if (/탱크|tank/i.test(t) || /\btk\b/i.test(t)) result.type = 'tk';
  else if (/플랫\s*랙|flat\s*rack/i.test(t) || /\bfr\b/i.test(t)) result.type = 'fr';
  else if (/오픈\s*탑|open\s*top/i.test(t) || /\bot\b/i.test(t)) result.type = 'ot';
  else if (/\boog\b|아웃\s*오브\s*게이지/i.test(t)) result.type = 'oog';

  // "컨테이너 몇 개" / "전체 몇 대" → 전체 질의
  if (/컨테이너|container|전체|all|총\s*개수|총\s*대수|총\s*몇/i.test(t)) {
    result.isAll = true;
  }

  // 통계 질의 ("몇 개", "몇 대", "얼마나")
  if (/몇\s*(개|대|건)|얼마나|개수|대수|총\s*몇/i.test(t)) result.isStat = true;

  // 온도 파싱
  // "영하 18도" / "-18도" / "마이너스 18도" → -18
  // "영상 5도" / "+5도" / "5도" → 5 (단, 리퍼 컨텍스트일 때만)
  // "0도" → 0
  if (hasTempCtx) {
    let tempMatch = null;
    // 1. 영하/마이너스/- 부호
    let m = t.match(/(?:영하|마이너스|minus)\s*(\d+(?:\.\d+)?)/);
    if (m) tempMatch = -parseFloat(m[1]);
    if (tempMatch === null) {
      m = t.match(/-\s*(\d+(?:\.\d+)?)\s*도?/);
      if (m) tempMatch = -parseFloat(m[1]);
    }
    // 2. 영상/플러스/+ 부호
    if (tempMatch === null) {
      m = t.match(/(?:영상|플러스|plus)\s*(\d+(?:\.\d+)?)/);
      if (m) tempMatch = parseFloat(m[1]);
      else {
        m = t.match(/\+\s*(\d+(?:\.\d+)?)\s*도?/);
        if (m) tempMatch = parseFloat(m[1]);
      }
    }
    // 3. "18도" 단독 (부호 없음)
    if (tempMatch === null) {
      m = t.match(/(\d+(?:\.\d+)?)\s*도/);
      if (m) tempMatch = parseFloat(m[1]);
    }
    if (tempMatch !== null && Number.isFinite(tempMatch)) {
      result.temp = tempMatch;
      // 온도 질문은 자동으로 리퍼 대상 (다른 type 미지정 시)
      if (!result.type) result.type = 'rf';
    }
  }

  return result;
}

// 파싱된 조건으로 컨테이너 필터링
export function applyNLFilter(containers, parsed) {
  let r = containers;
  if (parsed.digits) {
    const d = parsed.digits;
    r = r.filter(c => {
      const last4 = c.l4 || c.cn?.slice(-4) || '';
      // 4자리 정확 입력 → 끝4자리 정확 일치
      if (d.length === 4) return last4 === d;
      // 2~3자리 부분 입력 → 끝쪽에서 시작하는 매칭만
      // 예: "777" → 끝4자리가 X777 또는 7777인 것만
      return last4.endsWith(d);
    });
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
  if (parsed.type === 'rf') {
    r = r.filter(c => {
      const lbl = isoToLabel(c.iso) || '';
      return c.rf || (c.iso && c.iso[2] === 'R') || /RF$/.test(lbl) || (c.tmp && String(c.tmp).trim() !== '' && String(c.tmp).trim() !== '0');
    });
  } else if (parsed.type === 'dg') r = r.filter(c => c.dg);
  else if (parsed.type === 'xray') r = r.filter(c => c._xray);
  else if (parsed.type === 'tk') {
    r = r.filter(c => c.tk || /TK$/.test(isoToLabel(c.iso) || ''));
  }
  else if (parsed.type === 'fr') {
    r = r.filter(c => c.fr || /FR$/.test(isoToLabel(c.iso) || ''));
  }
  else if (parsed.type === 'ot') {
    r = r.filter(c => c.ot || /OT$/.test(isoToLabel(c.iso) || ''));
  }
  else if (parsed.type === 'oog') r = r.filter(c => c.oog || c.fr || c.ot);

  // 온도 정확 일치
  if (parsed.temp !== null && Number.isFinite(parsed.temp)) {
    r = r.filter(c => {
      if (!c.tmp) return false;
      const ctmp = parseFloat(String(c.tmp).replace(/[^\d.\-+]/g, ''));
      if (!Number.isFinite(ctmp)) return false;
      // 0.1 도 이내 일치
      return Math.abs(ctmp - parsed.temp) < 0.5;
    });
  }
  return r;
}

// 한국어 설명
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
  if (parsed.type === 'oog') desc.push('OOG');
  if (parsed.temp !== null) {
    if (parsed.temp < 0) desc.push(`영하 ${Math.abs(parsed.temp)}도`);
    else if (parsed.temp > 0) desc.push(`영상 ${parsed.temp}도`);
    else desc.push('0도');
  }
  if (parsed.digits) desc.push(`끝4자리 ${parsed.digits}`);

  // 조건 없고 isAll만 있으면 "전체 컨테이너"
  if (desc.length === 0 && parsed.isAll) return '전체 컨테이너';
  return desc.join(' ') || '전체';
}

// 어떤 조건이든 잡혔는지 (isAll 포함)
export function hasAnyCondition(parsed) {
  return !!(parsed.digits || parsed.size || parsed.fe || parsed.type || parsed.isAll || parsed.temp !== null);
}
