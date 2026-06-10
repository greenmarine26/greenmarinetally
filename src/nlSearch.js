// 자연어 검색 파서 (M3.3)
//  - M1.x: 사이즈/F·E/특수화물/온도/통계
//  - M3.2: 베이/POL/POD/구역/무게/UN/Class
//  - M3.3 신규: 베이 용량(capacity), 베이별 분포(bayBreakdown),
//               진행 상황(progress: done/pending),
//               베이 단수(stack), 바닥/꼭대기(bottom/top), 빈자리(vacant)
import { isoToLabel, fmtPos, normalizeBay, formatWt } from './utils.js';

// ─── 항구 코드 매핑 ───
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
const PORT_CODE_TO_KR = Object.fromEntries(
  Object.entries(PORT_KR_TO_CODE).map(([k, v]) => [v, k])
);
const PORT_CODE3_TO_KR = {
  'PTK': '평택', 'INC': '인천', 'PUS': '부산', 'KAN': '광양',
  'DLC': '대련', 'QDG': '청도', 'WEI': '위해', 'SHA': '상해',
  'TSN': '천진', 'NGB': '닝보', 'YAT': '연태', 'LYG': '연운항',
  'XMN': '하문', 'TAO': '청도',
  'TYO': '도쿄', 'YOK': '요코하마', 'OSA': '오사카',
  'KHH': '카오슝', 'SIN': '싱가포르', 'SGN': '호치민',
  'LAX': '엘에이', 'NYC': '뉴욕', 'HAM': '함부르크',
};
function findPortCode(text) {
  const t = String(text).toLowerCase();
  const krSorted = Object.keys(PORT_KR_TO_CODE).sort((a, b) => b.length - a.length);
  for (const kr of krSorted) {
    if (t.includes(kr.toLowerCase())) return PORT_KR_TO_CODE[kr];
  }
  const m5 = String(text).toUpperCase().match(/\b([A-Z]{2}[A-Z]{3})\b/);
  if (m5) return m5[1];
  const m3 = String(text).toUpperCase().match(/\b([A-Z]{3})\b/);
  if (m3 && PORT_CODE3_TO_KR[m3[1]]) return m3[1];
  return null;
}
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
    digits: '', size: null, fe: null, type: null, temp: null,
    bay: null, pol: null, pod: null, portAny: null, zone: null,
    dgClass: null, un: null,
    weightMin: null, weightMax: null, weightSum: false,
    capacityQuery: false, bayBreakdown: false,
    progressQuery: null,        // 'done' | 'pending'
    tierStackQuery: false,
    bottomQuery: false, topQuery: false,
    vacantQuery: false,
    posQuery: false, listQuery: false,
    isAll: false, isStat: false, mode: null,
  };
  if (!text) return result;
  const t = String(text).toLowerCase();

  // 컨텍스트 우선 체크 (digits 추출 제외용)
  const hasTempCtx = /도\s|도$|°|온도|영하|영상|마이너스|temperature|reefer|리퍼|냉장|냉동/i.test(t);
  const hasBayCtx = /베이|bay/i.test(t);
  const hasUnCtx = /\bun\s*\d|유엔\s*\d/i.test(t);
  const hasClassCtx = /클래스|class|급/i.test(t);
  const hasSizeCtx = /\d+\s*(피트|hc|ft)/i.test(t);
  const hasWeightCtx = /\d+\s*(톤|t|ton)\s*(?:이상|이하|넘는|미만|초과)/i.test(t);
  const hasStackCtx = /\d+\s*(단|층)/i.test(t);
  const skipDigits = hasTempCtx || hasBayCtx || hasUnCtx || hasClassCtx ||
                     hasSizeCtx || hasWeightCtx || hasStackCtx;
  if (!skipDigits) {
    const digits = String(text).replace(/\D/g, '');
    if (digits.length >= 2) result.digits = digits.slice(-4);
  }

  // 사이즈
  if (/45\s*(피트|hc|ft)/i.test(t)) result.size = '45';
  else if (/40\s*(피트|hc|ft)/i.test(t)) result.size = '40';
  else if (/20\s*(피트|ft)/i.test(t)) result.size = '20';

  // F/E
  if (/풀|적컨|적재|loaded/i.test(t)) result.fe = 'F';
  else if (/\bfull\b/i.test(t)) result.fe = 'F';
  else if (/엠티|공컨/i.test(t)) result.fe = 'E';
  else if (/\bempty\b|\bmt\b/i.test(t)) result.fe = 'E';

  // 특수 화물
  if (/리퍼|reefer|냉장|냉동/i.test(t) || /\brf\b/i.test(t)) result.type = 'rf';
  else if (/위험물|hazmat|imdg/i.test(t) || /\bdg\b/i.test(t)) result.type = 'dg';
  else if (/엑스레이|x[\s.\-]*ray|xray/i.test(t)) result.type = 'xray';
  else if (/탱크|tank/i.test(t) || /\btk\b/i.test(t)) result.type = 'tk';
  else if (/플랫\s*랙|flat\s*rack/i.test(t) || /\bfr\b/i.test(t)) result.type = 'fr';
  else if (/오픈\s*탑|open\s*top/i.test(t) || /\bot\b/i.test(t)) result.type = 'ot';
  else if (/\boog\b|아웃\s*오브\s*게이지/i.test(t)) result.type = 'oog';

  // 베이 번호
  let bayMatch = t.match(/(\d{1,3})\s*번?\s*베이/);
  if (!bayMatch) bayMatch = t.match(/베이\s*(\d{1,3})/);
  if (!bayMatch) bayMatch = t.match(/\bbay\s*(\d{1,3})/i);
  if (bayMatch) result.bay = normalizeBay(bayMatch[1]);

  // POL/POD
  let polCode = null, podCode = null, portCode = null;
  if (/(?:\bpol\b|선적항|출발항|출항지)/i.test(t)) {
    polCode = findPortCode(t);
  } else {
    const polMatch = t.match(/([가-힣]{2,4})\s*(?:에서|발(?:\b|\s)|출발)/);
    if (polMatch) polCode = findPortCode(polMatch[1]);
  }
  if (/(?:\bpod\b|양하항|도착항|도착지)/i.test(t)) {
    podCode = findPortCode(t);
  } else {
    const podMatch = t.match(/([가-힣]{2,4})\s*(?:행(?:\b|\s|$)|가는|도착)/);
    if (podMatch) podCode = findPortCode(podMatch[1]);
  }
  if (!polCode && !podCode) portCode = findPortCode(t);
  result.pol = polCode; result.pod = podCode; result.portAny = portCode;

  // 구역
  if (/갑판|deck/i.test(t)) result.zone = 'deck';
  else if (/창내|선창|hold|홀드/i.test(t)) result.zone = 'hold';

  // DG 클래스 / UN
  const clsMatch = t.match(/(?:클래스|class|급)\s*(\d(?:\.\d)?)/i);
  if (clsMatch) {
    result.dgClass = clsMatch[1];
    if (!result.type) result.type = 'dg';
  }
  const unMatch = t.match(/(?:un|유엔)\s*(\d{3,4})/i);
  if (unMatch) {
    result.un = unMatch[1];
    if (!result.type) result.type = 'dg';
  }

  // M3.3: 용량/수용 (mode 무시)
  const isCapacityQ = /실을\s*수\s*있|싣을\s*수|적재\s*가능|수용|용량|최대\s*적재|얼마나\s*실|몇\s*(개|대)\s*실/i.test(t);
  if (isCapacityQ) result.capacityQuery = true;

  // M3.3: 진행 상황
  if (/들어갔|들어간|들어가\s*있|실었|실은|올라\s*간|올라간|쌓은|쌓았|쌓았지|완료\s*된|완료된|완료\s*몇|완료\s*된\s*거|완료\s*컨|끝낸|끝난|마친|마쳤/i.test(t)) {
    result.progressQuery = 'done';
  } else if (/남았|남은|안\s*한|안한|더\s*해야|더\s*들어가|더\s*실어|더\s*해|얼마나\s*남|할\s*일|미완료|남아|남나/i.test(t)) {
    result.progressQuery = 'pending';
  }

  // M3.3: 단수
  if (/몇\s*(단|층)|단수|층수|몇\s*(단|층)\s*까지/i.test(t)) result.tierStackQuery = true;

  // M3.3: 바닥/꼭대기
  if (/바닥|맨\s*아래|제일\s*아래|최저\s*단|최저단/i.test(t)) result.bottomQuery = true;
  if (/꼭대기|맨\s*위|제일\s*위|최상\s*단|최상단/i.test(t)) result.topQuery = true;

  // M3.3: 빈자리
  if (/빈\s*자리|빈자리|빈\s*슬롯|빈\s*위치|빈\s*칸|비어\s*있|비어있|비\s*어\s*있|empty\s*slot/i.test(t)) {
    result.vacantQuery = true;
  }

  // 베이별 분포
  if (/베이별|베이\s*마다|베이\s*분포|각\s*베이/i.test(t)) result.bayBreakdown = true;

  // 양하/선적 모드 (capacity/vacant 질문에서는 무시)
  if (!result.capacityQuery && !result.vacantQuery) {
    if (/양하|discharge|내리는|내릴|언로딩/i.test(t)) result.mode = 'discharge';
    else if (/선적|loading|싣는|로딩/i.test(t)) result.mode = 'loading';
    else if (/실을|실은|실었/i.test(t) && !result.progressQuery) {
      result.mode = 'loading';
    }
  }

  // 무게
  const wtGteMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:톤|t|ton)\s*(?:이상|넘는|초과|over)/i);
  if (wtGteMatch) result.weightMin = parseFloat(wtGteMatch[1]) * 1000;
  const wtLteMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:톤|t|ton)\s*(?:이하|미만|under|below)/i);
  if (wtLteMatch) result.weightMax = parseFloat(wtLteMatch[1]) * 1000;
  if (/무게\s*합|총중량|총\s*무게|중량\s*합/i.test(t)) result.weightSum = true;

  // 위치/리스트 의도
  if (/위치|어디|어딨|where/i.test(t)) result.posQuery = true;
  if (/리스트|목록|보여줘|보여줘봐|알려줘|list/i.test(t)) result.listQuery = true;

  // 전체 / 통계
  if (/컨테이너|container|전체|all|총\s*개수|총\s*대수|총\s*몇/i.test(t)) result.isAll = true;
  if (/몇\s*(개|대|건)|얼마나|개수|대수|총\s*몇/i.test(t)) result.isStat = true;

  // 온도
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
  if (parsed.size === '20') r = r.filter(c => /^2[25]/.test(c.iso || '') || (isoToLabel(c.iso) || '').startsWith('20'));
  else if (parsed.size === '40') r = r.filter(c => /^4/.test(c.iso || '') || (isoToLabel(c.iso) || '').startsWith('40'));
  // V7.53 fix: ISO '45xx'는 45피트가 아니라 40ft 하이큐브(첫자리 4=40ft, 둘째 5=9'6").
  //   진짜 45피트는 L5xx (cargoPlanCore 주석: 45GP→40HC, L5G1→45HC). label 기준이 정답.
  else if (parsed.size === '45') r = r.filter(c => /^L5/i.test(c.iso || '') || (isoToLabel(c.iso) || '').startsWith('45'));
  if (parsed.fe) r = r.filter(c => c.fe === parsed.fe);
  if (parsed.type === 'rf') {
    r = r.filter(c => c.rf || (c.iso && c.iso[2] === 'R') || /RF$/.test(isoToLabel(c.iso) || '') || (c.tmp && String(c.tmp).trim() !== '' && String(c.tmp).trim() !== '0'));
  } else if (parsed.type === 'dg') r = r.filter(c => c.dg);
  else if (parsed.type === 'xray') r = r.filter(c => c._xray);
  else if (parsed.type === 'tk') r = r.filter(c => c.tk || /TK$/.test(isoToLabel(c.iso) || ''));
  else if (parsed.type === 'fr') r = r.filter(c => c.fr || /FR$/.test(isoToLabel(c.iso) || ''));
  else if (parsed.type === 'ot') r = r.filter(c => c.ot || /OT$/.test(isoToLabel(c.iso) || ''));
  else if (parsed.type === 'oog') r = r.filter(c => c.oog || c.fr || c.ot);

  if (parsed.bay) r = r.filter(c => normalizeBay(c.bay) === parsed.bay);

  const portMatch = (cVal, code) => {
    if (!cVal || !code) return false;
    const v = String(cVal).toUpperCase();
    const k = String(code).toUpperCase();
    if (v === k) return true;
    if (k.length === 3) return v.endsWith(k);
    if (k.length === 5) return v === k || v.endsWith(k.slice(-3));
    return false;
  };
  if (parsed.pol) r = r.filter(c => portMatch(c.pol, parsed.pol));
  if (parsed.pod) r = r.filter(c => portMatch(c.pod, parsed.pod));
  if (parsed.portAny) r = r.filter(c => portMatch(c.pol, parsed.portAny) || portMatch(c.pod, parsed.portAny));

  if (parsed.zone === 'deck') r = r.filter(c => parseInt(c.tier, 10) >= 80);
  else if (parsed.zone === 'hold') r = r.filter(c => {
    const t = parseInt(c.tier, 10);
    return !isNaN(t) && t < 80;
  });

  if (parsed.dgClass) r = r.filter(c => c.dg && String(c.dgc || '').startsWith(parsed.dgClass));
  if (parsed.un) r = r.filter(c => c.dg && String(c.un || '') === parsed.un);
  if (parsed.mode) r = r.filter(c => c._mode === parsed.mode);

  if (parsed.weightMin !== null) r = r.filter(c => (parseInt(c.wt, 10) || 0) >= parsed.weightMin);
  if (parsed.weightMax !== null) r = r.filter(c => (parseInt(c.wt, 10) || 0) <= parsed.weightMax);

  // M3.3 진행 상황
  if (parsed.progressQuery === 'done') r = r.filter(c => !!c._comp);
  else if (parsed.progressQuery === 'pending') r = r.filter(c => !c._comp);

  // M3.3 바닥/꼭대기
  if (parsed.bottomQuery || parsed.topQuery) {
    const groupMap = {};
    r.forEach(c => {
      if (!c.bay || !c.row || !c.tier) return;
      const tn = parseInt(c.tier, 10);
      if (isNaN(tn)) return;
      const zone = tn >= 80 ? 'deck' : 'hold';
      const key = `${normalizeBay(c.bay)}-${c.row}-${zone}`;
      if (!groupMap[key]) groupMap[key] = { min: tn, max: tn };
      else {
        if (tn < groupMap[key].min) groupMap[key].min = tn;
        if (tn > groupMap[key].max) groupMap[key].max = tn;
      }
    });
    if (parsed.bottomQuery) {
      r = r.filter(c => {
        const tn = parseInt(c.tier, 10);
        if (isNaN(tn)) return false;
        const zone = tn >= 80 ? 'deck' : 'hold';
        return groupMap[`${normalizeBay(c.bay)}-${c.row}-${zone}`]?.min === tn;
      });
    } else if (parsed.topQuery) {
      r = r.filter(c => {
        const tn = parseInt(c.tier, 10);
        if (isNaN(tn)) return false;
        const zone = tn >= 80 ? 'deck' : 'hold';
        return groupMap[`${normalizeBay(c.bay)}-${c.row}-${zone}`]?.max === tn;
      });
    }
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

// ─── 한국어 설명 ───
export function describeQuery(parsed) {
  const desc = [];
  if (parsed.bay) desc.push(`${parsed.bay}번 베이`);
  if (parsed.zone === 'deck') desc.push('갑판');
  if (parsed.zone === 'hold') desc.push('홀드');
  if (parsed.bottomQuery) desc.push('바닥');
  if (parsed.topQuery) desc.push('꼭대기');
  if (parsed.pol) desc.push(`${portToKr(parsed.pol)}발`);
  if (parsed.pod) desc.push(`${portToKr(parsed.pod)}행`);
  if (parsed.portAny) desc.push(portToKr(parsed.portAny));
  if (parsed.size) desc.push(`${parsed.size}피트`);
  if (parsed.fe === 'F') desc.push('풀');
  if (parsed.fe === 'E') desc.push('엠티');
  if (parsed.type === 'rf') desc.push('리퍼');
  if (parsed.type === 'dg') desc.push('위험물');
  if (parsed.dgClass) desc.push(`클래스 ${parsed.dgClass}`);
  if (parsed.un) desc.push(`UN${parsed.un}`);
  if (parsed.type === 'xray') desc.push('X-RAY');
  if (parsed.type === 'tk') desc.push('탱크');
  if (parsed.type === 'fr') desc.push('FR');
  if (parsed.type === 'ot') desc.push('OT');
  if (parsed.type === 'oog') desc.push('OOG');
  if (parsed.mode === 'discharge') desc.push('양하');
  if (parsed.mode === 'loading') desc.push('선적');
  if (parsed.progressQuery === 'done') desc.push('완료');
  if (parsed.progressQuery === 'pending') desc.push('남은');
  if (parsed.weightMin !== null) desc.push(`${parsed.weightMin / 1000}톤 이상`);
  if (parsed.weightMax !== null) desc.push(`${parsed.weightMax / 1000}톤 이하`);
  if (parsed.temp !== null) {
    if (parsed.temp < 0) desc.push(`영하 ${Math.abs(parsed.temp)}도`);
    else if (parsed.temp > 0) desc.push(`영상 ${parsed.temp}도`);
    else desc.push('0도');
  }
  if (parsed.digits) desc.push(`끝4자리 ${parsed.digits}`);
  if (desc.length === 0 && parsed.isAll) return '전체';
  return desc.join(' ') || '전체';
}

export function hasAnyCondition(parsed) {
  return !!(parsed.digits || parsed.size || parsed.fe || parsed.type ||
            parsed.bay || parsed.pol || parsed.pod || parsed.portAny ||
            parsed.zone || parsed.dgClass || parsed.un || parsed.mode ||
            parsed.weightMin !== null || parsed.weightMax !== null ||
            parsed.isAll || parsed.temp !== null ||
            parsed.capacityQuery || parsed.bayBreakdown ||
            parsed.progressQuery || parsed.tierStackQuery ||
            parsed.bottomQuery || parsed.topQuery || parsed.vacantQuery ||
            parsed.weightSum || parsed.posQuery || parsed.listQuery);
}

// ─── 베이별 슬롯 맵 (재사용) ───
function buildBaySlotMap(allContainers) {
  const map = {};  // bayN → { cons: [...], slots: Set }
  allContainers.forEach(c => {
    const bn = parseInt(normalizeBay(c.bay), 10);
    if (isNaN(bn)) return;
    if (!map[bn]) map[bn] = { cons: [], slots: new Set() };
    map[bn].cons.push(c);
    if (c.row && c.tier) map[bn].slots.add(`${c.row}-${c.tier}`);
  });
  return map;
}

// ─── 답변 생성기 ───
export function generateLocalAnswer(parsed, results, allContainers) {
  if (!hasAnyCondition(parsed)) return null;
  const desc = describeQuery(parsed);

  // M3.3 우선순위
  if (parsed.capacityQuery)  return formatCapacity(parsed, allContainers);
  if (parsed.vacantQuery)    return formatVacant(parsed, allContainers);
  if (parsed.bayBreakdown)   return formatBayBreakdown(parsed, allContainers);
  if (parsed.tierStackQuery) return formatStack(parsed, allContainers);
  if (parsed.progressQuery)  return formatProgress(parsed, results, allContainers);

  // 무게 합계
  if (parsed.weightSum) {
    const totalKg = results.reduce((s, c) => s + (parseInt(c.wt, 10) || 0), 0);
    const lines = [`📊 ${desc} 총 ${results.length}대`,
                   `⚖️ 총중량: ${formatWt(totalKg)} (${totalKg.toLocaleString()}kg)`];
    if (results.length > 0 && results.length <= 30) {
      lines.push('', '컨별 무게:');
      results.slice(0, 30).forEach(c => {
        lines.push(`  • ${c.cn?.slice(-4) || '?'} (${fmtPos(c)}): ${formatWt(c.wt || 0)}`);
      });
    }
    return lines.join('\n');
  }

  if (parsed.posQuery || parsed.listQuery) return formatLocationList(desc, results);
  if (parsed.isStat) return formatStats(desc, results);

  // 베이 단독 → 베이 통계
  if (parsed.bay) {
    if (results.length === 0) return `📭 ${parsed.bay}번 베이 없음`;
    return formatBayStats(parsed.bay, results);
  }

  // 강한 조건 자동 위치 리스트
  const hasStrong = parsed.pol || parsed.pod || parsed.portAny ||
                    parsed.dgClass || parsed.un || parsed.zone ||
                    (parsed.temp !== null) || parsed.mode ||
                    parsed.weightMin !== null || parsed.weightMax !== null ||
                    (parsed.type && parsed.type !== 'rf');
  if (hasStrong && results.length >= 2) return formatLocationList(desc, results);

  return null;
}

// ─── 헬퍼 함수들 ───

function formatStats(desc, results) {
  if (results.length === 0) return `📊 ${desc}: 0대`;
  const fCount = results.filter(c => c.fe === 'F').length;
  const eCount = results.filter(c => c.fe === 'E').length;
  const dCount = results.filter(c => c._mode === 'discharge').length;
  const lCount = results.filter(c => c._mode === 'loading').length;
  const deckCount = results.filter(c => parseInt(c.tier, 10) >= 80).length;
  const holdCount = results.filter(c => {
    const t = parseInt(c.tier, 10);
    return !isNaN(t) && t < 80;
  }).length;
  const lines = [`📊 ${desc}: ${results.length}대`];
  const sub = [];
  if (fCount + eCount > 0) sub.push(`Full ${fCount} / Empty ${eCount}`);
  if (dCount + lCount > 0) sub.push(`양하 ${dCount} / 선적 ${lCount}`);
  if (deckCount + holdCount > 0) sub.push(`갑판 ${deckCount} / 홀드 ${holdCount}`);
  if (sub.length > 0) lines.push(sub.join(' · '));
  return lines.join('\n');
}

function formatBayStats(bay, results) {
  const fCount = results.filter(c => c.fe === 'F').length;
  const eCount = results.filter(c => c.fe === 'E').length;
  const deckCount = results.filter(c => parseInt(c.tier, 10) >= 80).length;
  const holdCount = results.filter(c => {
    const t = parseInt(c.tier, 10);
    return !isNaN(t) && t < 80;
  }).length;
  const totalKg = results.reduce((s, c) => s + (parseInt(c.wt, 10) || 0), 0);
  const rfCount = results.filter(c => c.rf || (c.iso && c.iso[2] === 'R')).length;
  const dgCount = results.filter(c => c.dg).length;
  const compCount = results.filter(c => c._comp).length;

  const lines = [`📊 ${bay}번 베이: 총 ${results.length}대`];
  lines.push(`Full ${fCount} / Empty ${eCount} · 갑판 ${deckCount} / 홀드 ${holdCount}`);
  lines.push(`⚖️ 총중량 ${formatWt(totalKg)}`);
  if (compCount > 0) lines.push(`✅ 완료 ${compCount}/${results.length} (${Math.round(compCount/results.length*100)}%)`);
  if (rfCount > 0 || dgCount > 0) {
    const sp = [];
    if (rfCount > 0) sp.push(`리퍼 ${rfCount}`);
    if (dgCount > 0) sp.push(`위험물 ${dgCount}`);
    lines.push(`특수: ${sp.join(' / ')}`);
  }
  return lines.join('\n');
}

function formatLocationList(desc, results) {
  if (results.length === 0) return `📭 ${desc} 없음`;
  const lines = [`📍 ${desc} 총 ${results.length}대`];
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
  const max = 50;
  const list = results.slice(0, max);
  list.forEach((c, i) => {
    const tag = [];
    if (c.fe) tag.push(c.fe);
    if (c.rf && c.tmp) tag.push(`${c.tmp}°C`);
    if (c.dg) tag.push(`DG${c.dgc || ''}${c.un ? ' UN' + c.un : ''}`);
    if (c._xray) tag.push('X-RAY');
    if (c._comp) tag.push('✅');
    const tagStr = tag.length ? ` [${tag.join(' ')}]` : '';
    lines.push(`${i + 1}. ${c.cn?.slice(-4) || '?'} @ ${fmtPos(c) || '위치미상'}${tagStr}`);
  });
  if (results.length > max) lines.push(`(${results.length - max}대 더 있음)`);
  return lines.join('\n');
}

// M3.3: 베이 용량/짝꿍 분석
function formatCapacity(parsed, allContainers) {
  const baySlot = buildBaySlotMap(allContainers);
  if (parsed.bay) {
    const bayN = parseInt(parsed.bay, 10);
    if (isNaN(bayN)) return `📭 베이 인식 실패`;
    const isEven = bayN % 2 === 0;
    const sizeLabel = isEven ? '40피트' : '20피트';
    const pairBays = isEven ? [bayN - 1, bayN + 1].filter(n => n > 0) : [];

    const main = baySlot[bayN] || { cons: [], slots: new Set() };
    const mainCur = main.cons.length;
    const mainCap = main.slots.size;
    const mainFree = Math.max(0, mainCap - mainCur);

    const lines = [`📊 ${bayN}번 베이 (${sizeLabel}) 적재 분석`];
    lines.push(`현재 적재: ${mainCur}대`);
    if (mainCap > 0) {
      lines.push(`관측 슬롯: ${mainCap}개 (이번 항차 기준)`);
      lines.push(`빈 슬롯: ${mainFree}개`);
    } else {
      lines.push(`(이번 항차에 ${bayN}번 베이 데이터 없음)`);
    }
    const dC = main.cons.filter(c => c._mode === 'discharge').length;
    const lC = main.cons.filter(c => c._mode === 'loading').length;
    if (dC + lC > 0) lines.push(`└ 양하 ${dC} / 선적 ${lC}`);

    if (pairBays.length > 0) {
      lines.push('', `🔗 짝꿍 베이 (트윈 가능):`);
      let totalCur = mainCur, totalCap = mainCap;
      pairBays.forEach(pn => {
        const p = baySlot[pn] || { cons: [], slots: new Set() };
        const pCur = p.cons.length, pCap = p.slots.size, pFree = Math.max(0, pCap - pCur);
        totalCur += pCur; totalCap += pCap;
        if (pCur > 0 || pCap > 0) {
          lines.push(`  • ${pn}번 (20피트): 현재 ${pCur}대 / 슬롯 ${pCap} / 빈 ${pFree}`);
        } else {
          lines.push(`  • ${pn}번 (20피트): 데이터 없음 (통로일 가능성)`);
        }
      });
      lines.push(`📦 합산 (${bayN}+${pairBays.join('/')}): 현재 ${totalCur} / 슬롯 ${totalCap} / 빈 ${Math.max(0, totalCap - totalCur)}`);
    }
    lines.push('', `※ 슬롯 수는 이번 항차에 컨이 있는 위치 기준`,
                   `   실제 선박 최대 용량은 도면 참고`);
    return lines.join('\n');
  }

  // 전체 빈 슬롯 분포
  let totalCons = 0, totalSlots = 0;
  const free = [];
  Object.entries(baySlot).forEach(([bn, v]) => {
    totalCons += v.cons.length;
    totalSlots += v.slots.size;
    const f = v.slots.size - v.cons.length;
    if (f > 0) free.push({ bay: parseInt(bn, 10), free: f });
  });
  const lines = [`📊 전체 적재 분석`,
                 `현재 ${totalCons}대 / 관측 슬롯 ${totalSlots}개`,
                 `빈 슬롯 합계: ${Math.max(0, totalSlots - totalCons)}개`];
  if (free.length > 0) {
    free.sort((a, b) => b.free - a.free);
    lines.push('', `🟢 빈 슬롯 많은 베이 TOP 10:`);
    free.slice(0, 10).forEach(({ bay, free: f }) => lines.push(`  • ${bay}번: ${f}개`));
  }
  lines.push('', `※ 정확한 베이별: "[베이번호]번 베이 실을 수 있어"`);
  return lines.join('\n');
}

// M3.3: 빈자리 (= 슬롯 - 적재)
function formatVacant(parsed, allContainers) {
  // capacity와 같은 원리지만 빈자리 위주로
  const baySlot = buildBaySlotMap(allContainers);
  if (parsed.bay) {
    const bayN = parseInt(parsed.bay, 10);
    const v = baySlot[bayN] || { cons: [], slots: new Set() };
    const cap = v.slots.size, cur = v.cons.length, free = Math.max(0, cap - cur);
    const lines = [`📊 ${bayN}번 베이 빈 슬롯: ${free}개`];
    lines.push(`현재 적재 ${cur}대 / 관측 슬롯 ${cap}개`);
    return lines.join('\n');
  }
  // 바닥 빈자리 (zone+bottom 결합 시 row별 최저 tier가 비어있는 곳)
  if (parsed.bottomQuery) {
    return formatBottomVacant(parsed, allContainers);
  }
  // 전체 빈자리
  let totalCons = 0, totalSlots = 0;
  const free = [];
  Object.entries(baySlot).forEach(([bn, v]) => {
    totalCons += v.cons.length;
    totalSlots += v.slots.size;
    const f = v.slots.size - v.cons.length;
    if (f > 0) free.push({ bay: parseInt(bn, 10), free: f });
  });
  const lines = [`📊 전체 빈 슬롯: ${Math.max(0, totalSlots - totalCons)}개`];
  if (free.length > 0) {
    free.sort((a, b) => b.free - a.free);
    lines.push('', `빈 슬롯 많은 베이 TOP 10:`);
    free.slice(0, 10).forEach(({ bay, free: f }) => lines.push(`  • ${bay}번: ${f}개`));
  }
  return lines.join('\n');
}

// M3.3: 바닥 빈자리 — row별 최저 tier가 비어있는 위치
function formatBottomVacant(parsed, allContainers) {
  // row별로 그 row에 등장한 모든 tier를 수집 → 그 row의 최저 tier가 적재되지 않은 경우
  const rowTiers = {};  // "bay-row-zone" → Set of tiers
  allContainers.forEach(c => {
    if (!c.bay || !c.row || !c.tier) return;
    const tn = parseInt(c.tier, 10);
    if (isNaN(tn)) return;
    if (parsed.zone === 'deck' && tn < 80) return;
    if (parsed.zone === 'hold' && tn >= 80) return;
    if (parsed.bay && normalizeBay(c.bay) !== parsed.bay) return;
    const zone = tn >= 80 ? 'deck' : 'hold';
    const key = `${normalizeBay(c.bay)}-${c.row}-${zone}`;
    if (!rowTiers[key]) rowTiers[key] = new Set();
    rowTiers[key].add(tn);
  });
  // 각 row의 최저 tier
  const occupiedAtBottom = new Set();
  allContainers.forEach(c => {
    if (!c.bay || !c.row || !c.tier) return;
    const tn = parseInt(c.tier, 10);
    if (isNaN(tn)) return;
    const zone = tn >= 80 ? 'deck' : 'hold';
    const key = `${normalizeBay(c.bay)}-${c.row}-${zone}`;
    if (!rowTiers[key]) return;
    const minTier = Math.min(...rowTiers[key]);
    if (tn === minTier) occupiedAtBottom.add(`${key}-${tn}`);
  });
  // 비어있는 바닥 = rowTiers에는 있지만 occupiedAtBottom에 없는 row의 최저 tier
  const vacantBottoms = [];
  Object.entries(rowTiers).forEach(([key, tiers]) => {
    const minTier = Math.min(...tiers);
    if (!occupiedAtBottom.has(`${key}-${minTier}`)) {
      const [bay, row, zone] = key.split('-');
      vacantBottoms.push({ bay, row, tier: String(minTier).padStart(2, '0'), zone });
    }
  });

  const desc = (parsed.zone === 'hold' ? '홀드 ' : parsed.zone === 'deck' ? '갑판 ' : '') + '바닥';
  const lines = [`📊 ${desc} 빈자리: ${vacantBottoms.length}개`];
  if (vacantBottoms.length > 0) {
    // 베이별로 정리
    const byBay = {};
    vacantBottoms.forEach(v => {
      if (!byBay[v.bay]) byBay[v.bay] = [];
      byBay[v.bay].push(v);
    });
    Object.entries(byBay)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .slice(0, 30)
      .forEach(([bay, list]) => {
        const positions = list.map(v => `row${v.row}-t${v.tier}`).join(', ');
        lines.push(`  • ${bay}번 베이 (${list.length}개): ${positions}`);
      });
  }
  lines.push('', `※ 바닥 = 각 row의 최저 tier 위치`);
  return lines.join('\n');
}

// M3.3: 베이별 분포
function formatBayBreakdown(parsed, allContainers) {
  // 다른 조건이 있으면 먼저 필터
  let filtered = allContainers;
  const tmpParsed = { ...parsed, bayBreakdown: false, isStat: false };
  if (parsed.fe || parsed.type || parsed.mode || parsed.zone ||
      parsed.dgClass || parsed.un || parsed.weightMin !== null || parsed.weightMax !== null) {
    filtered = applyNLFilter(allContainers, tmpParsed);
  }
  const map = {};
  filtered.forEach(c => {
    const bn = parseInt(normalizeBay(c.bay), 10);
    if (isNaN(bn)) return;
    if (!map[bn]) map[bn] = { total: 0, F: 0, E: 0, comp: 0 };
    map[bn].total++;
    if (c.fe === 'F') map[bn].F++;
    else if (c.fe === 'E') map[bn].E++;
    if (c._comp) map[bn].comp++;
  });
  const desc = describeQuery({ ...parsed, bayBreakdown: false, isStat: false });
  const lines = [`📊 ${desc || '전체'} 베이별 분포 (총 ${filtered.length}대)`];
  const sorted = Object.entries(map).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  sorted.forEach(([bn, v]) => {
    const compStr = v.comp > 0 ? ` ✅${v.comp}` : '';
    lines.push(`  • ${bn}번: ${v.total}대 (F${v.F}/E${v.E})${compStr}`);
  });
  if (sorted.length === 0) lines.push('  (데이터 없음)');
  return lines.join('\n');
}

// M3.3: 단수 분석 (progress 무시 — 모든 컨 기준)
function formatStack(parsed, allContainers) {
  let filtered = allContainers;
  if (parsed.bay || parsed.zone) {
    // progressQuery / tierStackQuery / isStat 모두 빼고 베이/구역만 적용
    const tmpParsed = {
      ...parsed,
      tierStackQuery: false, isStat: false, progressQuery: null,
      capacityQuery: false, vacantQuery: false, posQuery: false, listQuery: false,
    };
    filtered = applyNLFilter(allContainers, tmpParsed);
  }
  // 베이+row별 tier 종류 = 단수
  const stackMap = {};  // "bay-row" → Set of tiers
  filtered.forEach(c => {
    if (!c.bay || !c.row || !c.tier) return;
    const tn = parseInt(c.tier, 10);
    if (isNaN(tn)) return;
    const key = `${normalizeBay(c.bay)}-${c.row}`;
    if (!stackMap[key]) stackMap[key] = new Set();
    stackMap[key].add(tn);
  });
  // 베이별 평균 단수
  const bayStacks = {};  // bay → [stackCount per row]
  Object.entries(stackMap).forEach(([key, tiers]) => {
    const [bay] = key.split('-');
    if (!bayStacks[bay]) bayStacks[bay] = [];
    bayStacks[bay].push(tiers.size);
  });

  const lines = [];
  if (parsed.bay) {
    const stacks = bayStacks[parsed.bay] || [];
    if (stacks.length === 0) return `📭 ${parsed.bay}번 베이 단수 데이터 없음`;
    const max = Math.max(...stacks);
    const min = Math.min(...stacks);
    const avg = (stacks.reduce((a, b) => a + b, 0) / stacks.length).toFixed(1);
    // 가장 높이 쌓인 tier
    const allTiers = [];
    Object.entries(stackMap).forEach(([key, tiers]) => {
      if (key.startsWith(`${parsed.bay}-`)) tiers.forEach(t => allTiers.push(t));
    });
    const highestTier = allTiers.length > 0 ? Math.max(...allTiers) : 0;
    lines.push(`📊 ${parsed.bay}번 베이 단수`);
    lines.push(`row별 단수: 최소 ${min} / 최대 ${max} / 평균 ${avg}단`);
    lines.push(`가장 높이 쌓인 tier: ${String(highestTier).padStart(2, '0')}`);
    return lines.join('\n');
  }

  // 전체 베이의 단수 분포
  const overall = Object.values(bayStacks).flat();
  if (overall.length === 0) return `📭 단수 데이터 없음`;
  const maxStack = Math.max(...overall);
  const avgStack = (overall.reduce((a, b) => a + b, 0) / overall.length).toFixed(1);
  lines.push(`📊 전체 단수 분석`);
  lines.push(`평균 ${avgStack}단 / 최대 ${maxStack}단`);
  lines.push('', `베이별 최대 단수 TOP 10:`);
  Object.entries(bayStacks)
    .map(([bn, arr]) => ({ bay: parseInt(bn), max: Math.max(...arr) }))
    .sort((a, b) => b.max - a.max)
    .slice(0, 10)
    .forEach(({ bay, max }) => lines.push(`  • ${bay}번: ${max}단`));
  return lines.join('\n');
}

// M3.3: 진행 상황
function formatProgress(parsed, results, allContainers) {
  // 진행 상황 자체는 desc에서 빼고 깔끔하게
  const baseDesc = describeQuery({ ...parsed, progressQuery: null }) || '전체';

  const baseParsed = { ...parsed, progressQuery: null };
  const baseResults = applyNLFilter(allContainers, baseParsed);
  const totalCount = baseResults.length;
  const doneCount = baseResults.filter(c => c._comp).length;
  const pendingCount = totalCount - doneCount;
  const pct = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0;

  const lines = [];
  if (parsed.progressQuery === 'done') {
    lines.push(`✅ ${baseDesc} 완료: ${doneCount}대 / 전체 ${totalCount}대 (${pct}%)`);
    lines.push(`남은 작업: ${pendingCount}대`);
  } else {
    lines.push(`⏳ ${baseDesc} 남은 작업: ${pendingCount}대 / 전체 ${totalCount}대`);
    lines.push(`완료: ${doneCount}대 (${pct}%)`);
  }

  if (results.length > 0 && results.length <= 50) {
    lines.push('', `${parsed.progressQuery === 'done' ? '완료된' : '남은'} 컨 (${Math.min(results.length, 10)}대):`);
    results.slice(0, 10).forEach((c, i) => {
      const tag = [];
      if (c.fe) tag.push(c.fe);
      if (c.rf && c.tmp) tag.push(`${c.tmp}°C`);
      if (c.dg) tag.push(`DG${c.dgc || ''}`);
      lines.push(`  ${i + 1}. ${c.cn?.slice(-4) || '?'} @ ${fmtPos(c) || '?'}${tag.length ? ' [' + tag.join(' ') + ']' : ''}`);
    });
    if (results.length > 10) lines.push(`  ... 외 ${results.length - 10}대`);
  }
  return lines.join('\n');
}
