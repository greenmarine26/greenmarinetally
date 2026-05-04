// 자연어 검색 파서 (M3.2 대폭 확장)
//  - 기존: 사이즈/F·E/특수화물/온도/통계
//  - 추가: 베이번호, POL/POD(한국어 항구명), 구역(갑판/창내),
//          무게 조건, 위험물 클래스, UN 번호, 검수업체
//  - 답변 생성기: parsed 결과로 한국어 자연어 답변 직접 생성 (AI 의존 X)
import { isoToLabel, fmtPos, normalizeBay, formatWt } from './utils.js';

// ─── 항구 코드 매핑 (한국어 ↔ 코드) ───
// 한국 검수원이 자주 쓰는 한국어 이름 → 5자리 코드
const PORT_KR_TO_CODE = {
  '평택': 'KRPTK', '인천': 'KRINC', '부산': 'KRPUS', '광양': 'KRKAN',
  '울산': 'KRUSN', '여수': 'KRYOS', '군산': 'KRKUV', '목포': 'KRMOK',
  '대련': 'CNDLC', '청도': 'CNQDG', '위해': 'CNWEI', '상해': 'CNSHA',
  '천진': 'CNTSN', '닝보': 'CNNGB', '연태': 'CNYAT', '연운항': 'CNLYG',
  '하문': 'CNXMN', '광주': 'CNCAN', '심천': 'CNSZN', '홍콩': 'HKHKG',
  '도쿄': 'JPTYO', '요코하마': 'JPYOK', '오사카': 'JPOSA', '나고야': 'JPNGO',
  '고베': 'JPUKB', '하카타': 'JPHKT',
  '카오슝': 'TWKHH', '타이베이': 'TWTPE', '키룽': 'TWKEL',
  '싱가포르': 'SGSIN', '호치민': 'VNSGN', '하이퐁': 'VNHPH',
  '방콕': 'THBKK', '레캄방': 'THLCH', '클랑': 'MYPKG',
  '마닐라': 'PHMNL', '자카르타': 'IDJKT',
  '엘에이': 'USLAX', 'la': 'USLAX', 'lax': 'USLAX',
  '롱비치': 'USLGB', '뉴욕': 'USNYC', '시애틀': 'USSEA', '오클랜드': 'USOAK',
  '함부르크': 'DEHAM', '로테르담': 'NLRTM', '안트워프': 'BEANR',
};
// 코드 → 한국어 (역방향, 답변용)
const PORT_CODE_TO_KR = Object.fromEntries(
  Object.entries(PORT_KR_TO_CODE).map(([k, v]) => [v, k])
);
// 코드 3글자(POL/POD 줄임) 매핑 (CNWEI → 위해)
const PORT_CODE3_TO_KR = {
  'PTK': '평택', 'INC': '인천', 'PUS': '부산', 'KAN': '광양',
  'DLC': '대련', 'QDG': '청도', 'WEI': '위해', 'SHA': '상해',
  'TSN': '천진', 'NGB': '닝보', 'YAT': '연태', 'LYG': '연운항',
  'XMN': '하문', 'TAO': '청도',
  'TYO': '도쿄', 'YOK': '요코하마', 'OSA': '오사카',
  'KHH': '카오슝', 'SIN': '싱가포르', 'SGN': '호치민',
  'LAX': '엘에이', 'NYC': '뉴욕', 'HAM': '함부르크',
};

// 항구 검색용 (한국어 또는 영문 코드 어느쪽이든 매칭)
function findPortCode(text) {
  const t = String(text).toLowerCase();
  // 1. 한국어 항구명 우선 (긴 이름부터 매칭 — "연운항" > "연태")
  const krSorted = Object.keys(PORT_KR_TO_CODE).sort((a, b) => b.length - a.length);
  for (const kr of krSorted) {
    if (t.includes(kr.toLowerCase())) return PORT_KR_TO_CODE[kr];
  }
  // 2. 영문 5자리 코드
  const m5 = String(text).toUpperCase().match(/\b([A-Z]{2}[A-Z]{3})\b/);
  if (m5) return m5[1];
  // 3. 영문 3자리 (PTK, DLC 등)
  const m3 = String(text).toUpperCase().match(/\b([A-Z]{3})\b/);
  if (m3 && PORT_CODE3_TO_KR[m3[1]]) {
    // 3자리는 prefix로 매칭 (CNDLC ← DLC, KRPTK ← PTK)
    return m3[1];
  }
  return null;
}

// 항구 코드를 한국어로 변환 (답변용)
export function portToKr(code) {
  if (!code) return '';
  const upper = String(code).toUpperCase();
  if (PORT_CODE_TO_KR[upper]) return PORT_CODE_TO_KR[upper];
  const tail3 = upper.slice(-3);
  if (PORT_CODE3_TO_KR[tail3]) return PORT_CODE3_TO_KR[tail3];
  return upper;
}

// ─── 메인 파서 ───
export function parseNaturalQuery(text) {
  const result = {
    digits: '',
    size: null,
    fe: null,
    type: null,
    temp: null,
    tempRange: null,
    bay: null,        // 베이 번호 ("16" 정규화된)
    pol: null,        // 출발항 (3 또는 5자리 코드)
    pod: null,        // 도착항
    portAny: null,    // POL/POD 명시 안된 단순 항구명 ("대련" 단독)
    zone: null,       // 'deck' | 'hold' | null
    dgClass: null,    // 위험물 클래스 ("3", "9" 등)
    un: null,         // UN 번호 ("1234")
    op: null,         // 검수업체 코드
    weightMin: null,  // 무게 하한 (kg)
    weightMax: null,  // 무게 상한 (kg)
    weightSum: false, // "무게 합" 패턴
    posQuery: false,  // "위치", "어디"
    listQuery: false, // "리스트", "목록", "전체 보여줘"
    isAll: false,
    isStat: false,
    mode: null,       // 'discharge' | 'loading' | null
  };
  if (!text) return result;
  const t = String(text).toLowerCase();

  // ─── 컨번호 끝 4자리 ───
  // 온도/베이/UN/사이즈/무게 컨텍스트 제외용
  const hasTempCtx = /도\s|도$|°|온도|영하|영상|마이너스|temperature|reefer|리퍼|냉장|냉동/i.test(t);
  const hasBayCtx = /베이|bay/i.test(t);
  const hasUnCtx = /\bun\s*\d|유엔\s*\d/i.test(t);
  const hasClassCtx = /클래스|class|급/i.test(t);
  const hasSizeCtx = /\d+\s*(피트|hc|ft)/i.test(t);  // M3.2: 20피트, 40피트 등
  const hasWeightCtx = /\d+\s*(톤|t|ton)\s*(?:이상|이하|넘는|미만|초과)/i.test(t);  // M3.2: 20톤 이상
  const skipDigits = hasTempCtx || hasBayCtx || hasUnCtx || hasClassCtx || hasSizeCtx || hasWeightCtx;
  if (!skipDigits) {
    const digits = String(text).replace(/\D/g, '');
    if (digits.length >= 2) result.digits = digits.slice(-4);
  }

  // ─── 사이즈 ───
  if (/45\s*(피트|hc|ft)/i.test(t)) result.size = '45';
  else if (/40\s*(피트|hc|ft)/i.test(t)) result.size = '40';
  else if (/20\s*(피트|ft)/i.test(t)) result.size = '20';

  // ─── F/E ───
  if (/풀|적컨|적재|loaded/i.test(t)) result.fe = 'F';
  else if (/\bfull\b/i.test(t)) result.fe = 'F';
  else if (/엠티|공컨/i.test(t)) result.fe = 'E';
  else if (/\bempty\b|\bmt\b/i.test(t)) result.fe = 'E';

  // ─── 특수 화물 type ───
  if (/리퍼|reefer|냉장|냉동/i.test(t) || /\brf\b/i.test(t)) result.type = 'rf';
  else if (/위험물|hazmat|imdg/i.test(t) || /\bdg\b/i.test(t)) result.type = 'dg';
  else if (/엑스레이|x[\s.\-]*ray|xray/i.test(t)) result.type = 'xray';
  else if (/탱크|tank/i.test(t) || /\btk\b/i.test(t)) result.type = 'tk';
  else if (/플랫\s*랙|flat\s*rack/i.test(t) || /\bfr\b/i.test(t)) result.type = 'fr';
  else if (/오픈\s*탑|open\s*top/i.test(t) || /\bot\b/i.test(t)) result.type = 'ot';
  else if (/\boog\b|아웃\s*오브\s*게이지/i.test(t)) result.type = 'oog';

  // ─── 베이 번호 ───
  // "16번 베이", "베이 16", "16베이", "1번 베이", "100번 베이"
  let bayMatch = t.match(/(\d{1,3})\s*번?\s*베이/);
  if (!bayMatch) bayMatch = t.match(/베이\s*(\d{1,3})/);
  if (!bayMatch) bayMatch = t.match(/\bbay\s*(\d{1,3})/i);
  if (bayMatch) result.bay = normalizeBay(bayMatch[1]);

  // ─── POL/POD ───
  // "대련에서", "대련발", "POL 대련" → pol
  // "청도행", "청도가는", "POD 청도" → pod
  // M3.2: "양하"는 모드 키워드로만 사용 (POD 패턴 충돌 방지)
  let polCode = null, podCode = null, portCode = null;

  // POL 명시 (POL 또는 출발/선적 키워드)
  if (/(?:\bpol\b|선적항|출발항|출항지)/i.test(t)) {
    polCode = findPortCode(t);
  } else {
    // "대련에서", "대련발", "대련 출발"
    const polMatch = t.match(/([가-힣]{2,4})\s*(?:에서|발(?:\b|\s)|출발)/);
    if (polMatch) polCode = findPortCode(polMatch[1]);
  }

  // POD 명시 (POD 또는 도착/행 키워드)
  if (/(?:\bpod\b|양하항|도착항|도착지)/i.test(t)) {
    podCode = findPortCode(t);
  } else {
    // "청도행", "청도가는", "청도 도착"
    const podMatch = t.match(/([가-힣]{2,4})\s*(?:행(?:\b|\s|$)|가는|도착)/);
    if (podMatch) podCode = findPortCode(podMatch[1]);
  }

  // 어느쪽도 명시 안 됐는데 항구 이름이 있으면 portAny
  if (!polCode && !podCode) {
    portCode = findPortCode(t);
  }

  result.pol = polCode;
  result.pod = podCode;
  result.portAny = portCode;

  // ─── 구역 (갑판/창내) ───
  if (/갑판|deck/i.test(t)) result.zone = 'deck';
  else if (/창내|선창|hold/i.test(t)) result.zone = 'hold';

  // ─── 위험물 클래스 ───
  // "클래스 3", "DG class 3", "3급"
  const clsMatch = t.match(/(?:클래스|class|급)\s*(\d(?:\.\d)?)/i);
  if (clsMatch) {
    result.dgClass = clsMatch[1];
    if (!result.type) result.type = 'dg';
  }

  // ─── UN 번호 ───
  // "UN 1234", "UN1234", "유엔 1234"
  const unMatch = t.match(/(?:un|유엔)\s*(\d{3,4})/i);
  if (unMatch) {
    result.un = unMatch[1];
    if (!result.type) result.type = 'dg';
  }

  // ─── 양하/선적 모드 ───
  if (/양하|discharge|내리는|내릴|언로딩/i.test(t)) result.mode = 'discharge';
  else if (/선적|loading|싣는|실을|로딩/i.test(t)) result.mode = 'loading';

  // ─── 무게 ───
  // "20톤 이상", "30톤 넘는", "10톤 미만", "5톤 이하"
  const wtGteMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:톤|t|ton)\s*(?:이상|넘는|초과|over)/i);
  if (wtGteMatch) result.weightMin = parseFloat(wtGteMatch[1]) * 1000;
  const wtLteMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:톤|t|ton)\s*(?:이하|미만|under|below)/i);
  if (wtLteMatch) result.weightMax = parseFloat(wtLteMatch[1]) * 1000;
  // "무게 합", "총중량", "총무게"
  if (/무게\s*합|총중량|총\s*무게|중량\s*합/i.test(t)) result.weightSum = true;

  // ─── 위치/리스트 질문 ───
  if (/위치|어디|어딨|where/i.test(t)) result.posQuery = true;
  if (/리스트|목록|보여줘|보여줘봐|알려줘|list/i.test(t)) result.listQuery = true;

  // ─── 전체 / 통계 ───
  if (/컨테이너|container|전체|all|총\s*개수|총\s*대수|총\s*몇/i.test(t)) result.isAll = true;
  if (/몇\s*(개|대|건)|얼마나|개수|대수|총\s*몇/i.test(t)) result.isStat = true;

  // ─── 온도 ───
  if (hasTempCtx) {
    let tempMatch = null;
    let m = t.match(/(?:영하|마이너스|minus)\s*(\d+(?:\.\d+)?)/);
    if (m) tempMatch = -parseFloat(m[1]);
    if (tempMatch === null) {
      m = t.match(/-\s*(\d+(?:\.\d+)?)\s*도?/);
      if (m) tempMatch = -parseFloat(m[1]);
    }
    if (tempMatch === null) {
      m = t.match(/(?:영상|플러스|plus)\s*(\d+(?:\.\d+)?)/);
      if (m) tempMatch = parseFloat(m[1]);
      else {
        m = t.match(/\+\s*(\d+(?:\.\d+)?)\s*도?/);
        if (m) tempMatch = parseFloat(m[1]);
      }
    }
    if (tempMatch === null) {
      m = t.match(/(\d+(?:\.\d+)?)\s*도/);
      if (m) tempMatch = parseFloat(m[1]);
    }
    if (tempMatch !== null && Number.isFinite(tempMatch)) {
      result.temp = tempMatch;
      if (!result.type) result.type = 'rf';
    }
  }

  return result;
}

// ─── 필터 적용 ───
export function applyNLFilter(containers, parsed) {
  let r = containers;
  if (parsed.digits) {
    const d = parsed.digits;
    r = r.filter(c => {
      const last4 = c.l4 || c.cn?.slice(-4) || '';
      if (d.length === 4) return last4 === d;
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
  else if (parsed.type === 'tk') r = r.filter(c => c.tk || /TK$/.test(isoToLabel(c.iso) || ''));
  else if (parsed.type === 'fr') r = r.filter(c => c.fr || /FR$/.test(isoToLabel(c.iso) || ''));
  else if (parsed.type === 'ot') r = r.filter(c => c.ot || /OT$/.test(isoToLabel(c.iso) || ''));
  else if (parsed.type === 'oog') r = r.filter(c => c.oog || c.fr || c.ot);

  // M3.2: 베이 필터
  if (parsed.bay) {
    r = r.filter(c => normalizeBay(c.bay) === parsed.bay);
  }

  // M3.2: POL/POD 필터 (3자리 코드는 prefix/suffix 매칭)
  const portMatch = (cVal, code) => {
    if (!cVal || !code) return false;
    const v = String(cVal).toUpperCase();
    const k = String(code).toUpperCase();
    if (v === k) return true;
    if (k.length === 3) return v.endsWith(k) || v === k;  // CNWEI matches WEI
    if (k.length === 5) return v === k || v.endsWith(k.slice(-3));
    return false;
  };
  if (parsed.pol) r = r.filter(c => portMatch(c.pol, parsed.pol));
  if (parsed.pod) r = r.filter(c => portMatch(c.pod, parsed.pod));
  if (parsed.portAny) {
    r = r.filter(c => portMatch(c.pol, parsed.portAny) || portMatch(c.pod, parsed.portAny));
  }

  // M3.2: 구역 필터
  if (parsed.zone === 'deck') {
    r = r.filter(c => parseInt(c.tier, 10) >= 80);
  } else if (parsed.zone === 'hold') {
    r = r.filter(c => {
      const t = parseInt(c.tier, 10);
      return !isNaN(t) && t < 80;
    });
  }

  // M3.2: 위험물 클래스
  if (parsed.dgClass) {
    r = r.filter(c => c.dg && String(c.dgc || '').startsWith(parsed.dgClass));
  }

  // M3.2: UN 번호
  if (parsed.un) {
    r = r.filter(c => c.dg && String(c.un || '') === parsed.un);
  }

  // M3.2: 양하/선적 모드
  if (parsed.mode) {
    r = r.filter(c => c._mode === parsed.mode);
  }

  // M3.2: 무게 범위
  if (parsed.weightMin !== null) {
    r = r.filter(c => (parseInt(c.wt, 10) || 0) >= parsed.weightMin);
  }
  if (parsed.weightMax !== null) {
    r = r.filter(c => (parseInt(c.wt, 10) || 0) <= parsed.weightMax);
  }

  // 온도 정확 일치
  if (parsed.temp !== null && Number.isFinite(parsed.temp)) {
    r = r.filter(c => {
      if (!c.tmp) return false;
      const ctmp = parseFloat(String(c.tmp).replace(/[^\d.\-+]/g, ''));
      if (!Number.isFinite(ctmp)) return false;
      return Math.abs(ctmp - parsed.temp) < 0.5;
    });
  }
  return r;
}

// 한국어 설명
export function describeQuery(parsed) {
  const desc = [];
  if (parsed.bay) desc.push(`${parsed.bay}번 베이`);
  if (parsed.zone === 'deck') desc.push('갑판');
  if (parsed.zone === 'hold') desc.push('창내');
  if (parsed.pol) desc.push(`${portToKr(parsed.pol)}발`);
  if (parsed.pod) desc.push(`${portToKr(parsed.pod)}행`);
  if (parsed.portAny) desc.push(portToKr(parsed.portAny));
  if (parsed.size) desc.push(`${parsed.size}피트`);
  if (parsed.fe === 'F') desc.push('풀(적컨)');
  if (parsed.fe === 'E') desc.push('엠티(공컨)');
  if (parsed.type === 'rf') desc.push('리퍼');
  if (parsed.type === 'dg') desc.push('위험물');
  if (parsed.dgClass) desc.push(`클래스 ${parsed.dgClass}`);
  if (parsed.un) desc.push(`UN${parsed.un}`);
  if (parsed.type === 'xray') desc.push('X-RAY 대상');
  if (parsed.type === 'tk') desc.push('탱크');
  if (parsed.type === 'fr') desc.push('FR');
  if (parsed.type === 'ot') desc.push('OT');
  if (parsed.type === 'oog') desc.push('OOG');
  if (parsed.mode === 'discharge') desc.push('양하');
  if (parsed.mode === 'loading') desc.push('선적');
  if (parsed.weightMin !== null) desc.push(`${parsed.weightMin/1000}톤 이상`);
  if (parsed.weightMax !== null) desc.push(`${parsed.weightMax/1000}톤 이하`);
  if (parsed.temp !== null) {
    if (parsed.temp < 0) desc.push(`영하 ${Math.abs(parsed.temp)}도`);
    else if (parsed.temp > 0) desc.push(`영상 ${parsed.temp}도`);
    else desc.push('0도');
  }
  if (parsed.digits) desc.push(`끝4자리 ${parsed.digits}`);
  if (desc.length === 0 && parsed.isAll) return '전체 컨테이너';
  return desc.join(' ') || '전체';
}

export function hasAnyCondition(parsed) {
  return !!(parsed.digits || parsed.size || parsed.fe || parsed.type ||
            parsed.bay || parsed.pol || parsed.pod || parsed.portAny ||
            parsed.zone || parsed.dgClass || parsed.un || parsed.mode ||
            parsed.weightMin !== null || parsed.weightMax !== null ||
            parsed.isAll || parsed.temp !== null);
}

// ─── M3.2: 로컬 답변 생성기 ───
// AI 호출 없이 parsed 결과로 한국어 자연어 답변 직접 생성
// 답변할 수 없는 경우(자유 질문) → null 반환 → fallback to AI
export function generateLocalAnswer(parsed, results, allContainers) {
  if (!hasAnyCondition(parsed) && !parsed.weightSum && !parsed.posQuery && !parsed.listQuery) {
    return null;
  }

  const desc = describeQuery(parsed);
  const lines = [];

  // 1. 무게 합계 질문
  if (parsed.weightSum) {
    const totalKg = results.reduce((sum, c) => sum + (parseInt(c.wt, 10) || 0), 0);
    lines.push(`📊 ${desc} 총 ${results.length}대`);
    lines.push(`⚖️ 총중량: ${formatWt(totalKg)} (${totalKg.toLocaleString()}kg)`);
    if (results.length > 0 && results.length <= 30) {
      lines.push('');
      lines.push('컨별 무게:');
      results.slice(0, 30).forEach(c => {
        lines.push(`  • ${c.cn?.slice(-4) || '?'} (${fmtPos(c)}): ${formatWt(c.wt || 0)}`);
      });
    }
    return lines.join('\n');
  }

  // 2. 명시적 위치/리스트 질문
  if (parsed.posQuery || parsed.listQuery) {
    return formatLocationList(desc, results);
  }

  // 3. 통계 질문 (isStat)
  if (parsed.isStat) {
    if (results.length > 0) {
      const fCount = results.filter(c => c.fe === 'F').length;
      const eCount = results.filter(c => c.fe === 'E').length;
      const dCount = results.filter(c => c._mode === 'discharge').length;
      const lCount = results.filter(c => c._mode === 'loading').length;
      const deckCount = results.filter(c => parseInt(c.tier, 10) >= 80).length;
      const holdCount = results.filter(c => {
        const t = parseInt(c.tier, 10);
        return !isNaN(t) && t < 80;
      }).length;

      lines.push(`📊 ${desc}: ${results.length}대`);
      const sub = [];
      if (fCount + eCount > 0) sub.push(`Full ${fCount} / Empty ${eCount}`);
      if (dCount + lCount > 0) sub.push(`양하 ${dCount} / 선적 ${lCount}`);
      if (deckCount + holdCount > 0) sub.push(`갑판 ${deckCount} / 창내 ${holdCount}`);
      if (sub.length > 0) lines.push(sub.join(' · '));
      return lines.join('\n');
    }
    return `📊 ${desc}: 0대`;
  }

  // 4. 베이 단독 질문 ("16번 베이") — 자동으로 베이 통계
  if (parsed.bay) {
    if (results.length === 0) return `📭 ${parsed.bay}번 베이 없음`;
    const fCount = results.filter(c => c.fe === 'F').length;
    const eCount = results.filter(c => c.fe === 'E').length;
    const deckCount = results.filter(c => parseInt(c.tier, 10) >= 80).length;
    const holdCount = results.filter(c => {
      const t = parseInt(c.tier, 10);
      return !isNaN(t) && t < 80;
    }).length;
    const totalKg = results.reduce((sum, c) => sum + (parseInt(c.wt, 10) || 0), 0);
    const rfCount = results.filter(c => c.rf || (c.iso && c.iso[2] === 'R')).length;
    const dgCount = results.filter(c => c.dg).length;

    lines.push(`📊 ${parsed.bay}번 베이: 총 ${results.length}대`);
    lines.push(`Full ${fCount} / Empty ${eCount} · 갑판 ${deckCount} / 창내 ${holdCount}`);
    lines.push(`⚖️ 총중량 ${formatWt(totalKg)}`);
    if (rfCount > 0 || dgCount > 0) {
      const sp = [];
      if (rfCount > 0) sp.push(`리퍼 ${rfCount}`);
      if (dgCount > 0) sp.push(`위험물 ${dgCount}`);
      lines.push(`특수: ${sp.join(' / ')}`);
    }
    return lines.join('\n');
  }

  // 5. M3.2: 강한 조건 자동 위치 답변
  // POL/POD/항구/DG클래스/UN/온도/구역/특수화물/모드 — 결과를 위치 리스트로 자동 표시
  // 단, 결과 1개면 BigResultCard로 빠지도록 null
  // (단순 사이즈/F·E/digits만 있는 경우는 일반 검색 결과로 표시)
  const hasStrongCondition = parsed.pol || parsed.pod || parsed.portAny ||
                              parsed.dgClass || parsed.un || parsed.zone ||
                              (parsed.temp !== null) || parsed.mode ||
                              parsed.weightMin !== null || parsed.weightMax !== null ||
                              (parsed.type && parsed.type !== 'rf');  // rf 단독은 제외 (양 많아서 일반 리스트)

  if (hasStrongCondition && results.length >= 2) {
    return formatLocationList(desc, results);
  }

  return null;
}

// 위치 리스트 포맷 (재사용)
function formatLocationList(desc, results) {
  const lines = [];
  if (results.length === 0) {
    return `📭 ${desc} 없음`;
  }
  lines.push(`📍 ${desc} 총 ${results.length}대`);

  // 추가 통계 (양 많을 때 도움)
  if (results.length > 5) {
    const fCount = results.filter(c => c.fe === 'F').length;
    const eCount = results.filter(c => c.fe === 'E').length;
    const dCount = results.filter(c => c._mode === 'discharge').length;
    const lCount = results.filter(c => c._mode === 'loading').length;
    const sub = [];
    if (fCount + eCount > 0) sub.push(`F ${fCount} / E ${eCount}`);
    if (dCount + lCount > 0) sub.push(`양하 ${dCount} / 선적 ${lCount}`);
    if (sub.length > 0) lines.push(sub.join(' · '));
  }

  if (results.length <= 50) {
    results.forEach((c, i) => {
      const tag = [];
      if (c.fe) tag.push(c.fe);
      if (c.rf && c.tmp) tag.push(`${c.tmp}°C`);
      if (c.dg) tag.push(`DG${c.dgc || ''}${c.un ? ' UN' + c.un : ''}`);
      if (c._xray) tag.push('X-RAY');
      const tagStr = tag.length ? ` [${tag.join(' ')}]` : '';
      const last4 = c.cn?.slice(-4) || '?';
      const pos = fmtPos(c) || '위치미상';
      lines.push(`${i + 1}. ${last4} @ ${pos}${tagStr}`);
    });
  } else {
    lines.push(`(50대 초과, 처음 50대만 표시)`);
    results.slice(0, 50).forEach((c, i) => {
      lines.push(`${i + 1}. ${c.cn?.slice(-4)} @ ${fmtPos(c) || '?'}`);
    });
  }
  return lines.join('\n');
}
