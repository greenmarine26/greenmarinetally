// 자연어 검색 파서 (M3.3)
//  - M1.x: 사이즈/F·E/특수화물/온도/통계
//  - M3.2: 베이/POL/POD/구역/무게/UN/Class
//  - M3.3 신규: 베이 용량(capacity), 베이별 분포(bayBreakdown),
//               진행 상황(progress: done/pending),
//               베이 단수(stack), 바닥/꼭대기(bottom/top), 빈자리(vacant)
import { isoToLabel, fmtPos, normalizeBay, formatWt, isReeferContainer, isPyeongtaekPort, APP_VERSION, planWorkStart, pilotToWorkMin, getPierFromBerth, describeMovePath, dupSealMap, overDims} from './utils.js';   // TallyOne 1.22: 도선→작업개시   // 1.76-05: 실번호 중복 판정 단일 소스
// TallyOne 1.65: 자연어가 앱 기능을 설명한다 — 매뉴얼·기능색인이 곧 지식원이다.
import { FEATURE_INDEX, FEATURE_SYNONYMS } from './data/featureIndex.js';
import { HELP_DATA, HELP_COURSE } from './data/helpData.js';
import { mirKnowledge } from './data/mirKnowledge.js';   // ★ 2.57: 뜻 갈래(asking=def)의 답안지 — 검수사 «답안지는 있는데 어떤 질문에 어떤 게 정답인지 안 알려줬다»
import { HELP_DATA_CHIEF } from './data/helpDataChief.js';   // 2.30: 미르가 수석 권도 안다(가르치진 않고 «있다»고 알린다)

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
    howToQuery: false,          // 1.65: "그 기능 어디서 하지?" — 컨 조회가 아니라 기능 위치를 묻는 말
    progressQuery: null,        // 'done' | 'pending'
    tierStackQuery: false,
    bottomQuery: false, topQuery: false,
    vacantQuery: false,
    posQuery: false, listQuery: false, bayDistQuery: false, briefingQuery: false, sealAuditQuery: false, carrierQuery: false,
    dupL4Query: false,   // TallyOne 1.17: 끝 4자리 중복 조회
    bayTrio: null,   // V8.03-01: 짝수 베이+구역 = 트리오(23·24·25) 전체
    introQuery: false, timeQuery: false, weatherQuery: false, schedQuery: false,   // V7.92: 챗봇형 질문
    pilotQuery: false,  // TallyOne 1.22: 도선·접안·작업개시 시각 (오답 1786057401908)
    wakeQuery: false,   // TallyOne 1.21: "몇 시에 일어나야 하지" — 현재 시각이 아니라 기상 시각 (오답 1786028593439)
    shipIntroQuery: false,   // V9.18: 선박 소개·이름 유래
    twinCheckQuery: false,   // V7.93: 트윈 작업 가능 여부 (무게)
    tierPlaceCountQuery: null,   // V7.99-10: 'hold'|'deck' — "홀드 몇 개 남았어"(에 없음) = 작업 남은 단(곳) 개수+베이 나열
    tierInContextQuery: null,    // V7.99-10: 'hold'|'deck' — "홀드에 몇 개 남았어"(에 있음) = 현재 작업 중인 단 컨 수
    etaQuery: false,             // V7.99-15: "몇 시에 끝나?" — 완료 페이스로 예상 완료 시각 계산(대화체)
    customsReportQuery: false,   // V7.99-16: "양하신고할까?" — 그날 이상 건(누락/초과/바뀜/리씰/실오류) 정리
    handoverQuery: false,        // V8.00: "인수인계" — 남은 작업+양하신고+특이사항 정리 (되묻기 2단계)
    isAll: false, isStat: false, mode: null,
    shiftingQuery: false,   // TallyOne 1.27: 시프팅(치워야 할 통과화물)
    mirCalled: false, mirHello: false,   // 1.91: «미르» — 즉답 비서 이름(검수사 고양이). «미르야 …» 호출어
    //  ★ 2.40: 미르가 **직접 만지는** 것 — 화면 밝기와 소리, 둘뿐이다(검수사 확정).
    //    *«화면 밝기와 볼륨 정도만 하면 될듯 합니다. 미르의 조작기술은»*
    //    둘 다 **그 자리에서 되돌릴 수 있는 것**이라 안전하다(작업표준 2-0-B).
    //    ⚠ 여기서는 «무엇을 하라»만 담는다. 실행은 화면(GlobalSearchPage·SearchPanel)이 한다 —
    //      nlSearch 는 순수 함수로 두고 부작용을 섞지 않는다(기존 foodQuery 와 같은 방식).
    deviceCmd: null,   // { kind:'bright'|'volume', dir:+1|-1, to:1..4|'off', ask:true }
    //  ★ 2.41: 미르가 선박 연락처(이메일)를 **답한다** — 발송·확답 추적은 범위 밖(검수사 확정).
    //    *«우리는 선박에 자료를 주고 확답을 받아야 합니다»*(본선 일항사와 메일로 컨펌) ·
    //    *«수석이 PCSZ 이메일이 뭐지 물으면 답만 해주면 됩니다»* · *«그 주소가 있을것이니까 같이 보인다»*
    //    (본선 아닌 연락처도 버리지 않는다). ⚠ 실제 자료(RTDB shipContacts)는 화면이 갖고 있다 —
    //    여기서는 «누구를 찾는지»만 담는다(순수 함수 유지, deviceCmd와 같은 방식).
    contactQuery: null,   // { code, onboardOnly } — code: 원문에서 뽑은 선박 코드/풀네임 후보(없으면 "이 배" 맥락)
  };
  if (!text) return result;
  result._raw = String(text);   // ★ 2.57: 뜻 답안지(mirKnowledge·용어집)는 원문으로 찾는다
  let t = String(text).toLowerCase();
  // 1.91 (검수사 확정 «미르야 하면 네 하고 답변도 하고»): 호출어를 벗기고 나머지를 질문으로.
  {
    const _mir = /^\s*미르\s*(?:야|아|님)?\s*[,!~.\s]*/;
    if (_mir.test(t)) {
      result.mirCalled = true;
      t = t.replace(_mir, '');
      if (!t.trim()) result.mirHello = true;
    }
  }

  // 컨텍스트 우선 체크 (digits 추출 제외용)
  const hasTempCtx = /도\s|도$|°|온도|영하|영상|마이너스|temperature|reefer|리퍼|냉장|냉동/i.test(t);
  const hasBayCtx = /베이|bay/i.test(t) || /(?:^|\s)\d{1,2}\s*번(?![호])/.test(t);  // V7.99-13: "N번"도 베이 맥락
  const hasUnCtx = /\bun\s*\d|유엔\s*\d/i.test(t);
  const hasClassCtx = /클래스|class|급/i.test(t);
  const hasSizeCtx = /\d+\s*(피트|hc|ft)/i.test(t);
  const hasWeightCtx = /\d+\s*(톤|t|ton)\s*(?:이상|이하|넘는|미만|초과)/i.test(t);
  const hasStackCtx = /\d+\s*(단|층)/i.test(t);
  // TallyOne 1.22: **시각 표현을 컨번호로 읽지 않는다.** (오답 1786057401908 직접 원인 —
  //   "도선이 08시 30분인데 작업시간이 08시 30분 가능한가요?" 의 0830 을 끝 4자리로 잡아 "(일치 결과 없음)")
  const hasTimeCtx = /\d{1,2}\s*시\s*\d{1,2}\s*분|\d{1,2}\s*:\s*\d{2}|도선|파일럿|접안|입항|출항|작업\s*(?:시간|시각|시작|개시|예정)/i.test(t);
  // 1.69-01: **브리핑이 말한 «N건»은 컨번호 끝자리가 아니다.** (검수사 신고 2026-08-14 —
  //   "실 점검 필요 83건" 뒤 "83건이 뭐야"의 83이 끝자리로 잡혀 엉뚱한 컨을 답했다)
  const hasCountFollowCtx = /\d+\s*건\s*(?:이|가|은|는|이란)?\s*(?:뭐|뭔|무엇|무슨|내용|상세|자세)/.test(t);
  const skipDigits = hasTempCtx || hasBayCtx || hasUnCtx || hasClassCtx ||
                     hasSizeCtx || hasWeightCtx || hasStackCtx || hasTimeCtx || hasCountFollowCtx;
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
  else if (/엠티|공컨|빈\s*컨/i.test(t)) result.fe = 'E';   // V7.91-02: '빈 컨테이너' 추가
  else if (/\bempty\b|\bmt\b/i.test(t)) result.fe = 'E';

  // 특수 화물
  if (/리퍼|reefer|냉장|냉동/i.test(t) || /\brf\b/i.test(t)) result.type = 'rf';
  else if (/위험물|hazmat|imdg/i.test(t) || /\bdg\b/i.test(t)) result.type = 'dg';
  else if (/엑스레이|x[\s.\-]*ray|xray/i.test(t)) result.type = 'xray';
  else if (/탱크|tank/i.test(t) || /\btk\b/i.test(t)) result.type = 'tk';
  else if (/플랫\s*랙|flat\s*rack/i.test(t) || /\bfr\b/i.test(t)) result.type = 'fr';
  else if (/오픈\s*탑|open\s*top/i.test(t) || /\bot\b/i.test(t)) result.type = 'ot';
  else if (/\boog\b|아웃\s*오브\s*게이지/i.test(t)) result.type = 'oog';
  // V9.56: RO/RO 겸용선(RZOR) — 크레인으로 검수하는 건 갠트리(落地) 분뿐이다.
  //   선사 표현 그대로 "갠트리 40van" 이라 부른다. 섀시분은 램프로 굴려 나가 검수 대상이 아니다.
  else if (/갠트리|gantry|락지|落地|크레인\s*작업|로로\s*제외|lolo/i.test(t)) result.type = 'lolo';   // 1.85-05: «LOLO 리스트는?» — LOLO 단어 자체가 트리거에 없었다(검수사 실측 — 전체 203대가 나열됨)
  else if (/双背|쌍배|2단\s*적재|이단\s*적재/i.test(t)) result.type = 'dbl';

  // 베이 번호
  let bayMatch = t.match(/(\d{1,3})\s*번?\s*베이/);
  if (!bayMatch) bayMatch = t.match(/베이\s*(\d{1,3})/);
  if (!bayMatch) bayMatch = t.match(/\bbay\s*(\d{1,3})/i);
  // V7.99-13: "20번에 몇 개" — '베이' 단어가 없어도 "N번"(1~2자리 + '번')을 베이로 인식.
  //   현장에서 "20번 데크" "18번에" 처럼 '번'만 붙여 묻는 경우가 많음. 3자리 이상은 컨번호 끝자리와
  //   혼동 위험이 있어 2자리까지만(베이는 보통 1~99). 끝4자리 조회는 4자리라 구분됨.
  if (!bayMatch) bayMatch = t.match(/(?:^|\s)(\d{1,2})\s*번(?![호])/);  // "2번" O, "2번호" X(호기)
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
  if (/갑판|데크|deck/i.test(t)) result.zone = 'deck';   // V7.91-02: '데크' 한글 추가
  else if (/창내|선창|hold|홀드/i.test(t)) result.zone = 'hold';

  // V8.03-01 (오답 [5]): "24번 홀드/데크"처럼 짝수 베이 + 구역을 함께 물으면
  //   23·24·25 트리오 전체를 뜻한다(검수사 메모). 홀수(23·25)는 진짜 개별 홀드.
  //   짝수 베이 + zone 명시일 때만 트리오로 확장. (단순 끝4자리 조회와 충돌 없음)
  if (result.bay && result.zone) {
    const b = parseInt(result.bay, 10);
    if (Number.isFinite(b) && b % 2 === 0) {
      result.bayTrio = [String(b - 1).padStart(2, '0'), result.bay, String(b + 1).padStart(2, '0')];
    }
  }

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
  // 1.26: **"몇 대까지 선적이 가능한가요?" 가 안 걸렸다.** 종전 패턴은 '적재 가능' 처럼
  //   낱말이 붙어 있어야 했고, 검수사 문장은 '선적이 ... 가능한' 이라 사이가 벌어져 있었다.
  //   그래서 465 가 컨번호 끝자리로 잡혀 "선적 끝네자리 465: 0대" 가 나갔다(오답 리포트 2026-08-07).
  const isCapacityQ = /실을\s*수\s*있|싣을\s*수|적재\s*가능|수용|용량|최대\s*적재|얼마나\s*실|몇\s*(개|대)\s*실/i.test(t)
    || /몇\s*(대|개)\s*까지/.test(t)
    || /(선적|적재|양하)[가-힣\s]{0,6}(가능|할\s*수|될\s*수)/.test(t)
    || /선복|적재\s*능력|최대\s*몇/.test(t);
  if (isCapacityQ) {
    result.capacityQuery = true;
    result.digits = null;   // 1.26: '465대' 의 465 가 컨번호 끝자리로 잡히던 것 차단
  }

  // V8.00: 인수인계 — "인수인계", "인계 자료", "다음 검수사에게 넘겨", "교대"
  //   남은 작업 + (양하 남으면)신고할 것 + 특이사항을 한 화면에. customs보다 먼저.
  if (/인수\s*인계|인계\s*(?:자료|서|할|해|준비|내용)|넘겨야|넘겨\s*줘|교대|다음\s*검수사|다음\s*사람|작업\s*마무리\s*못/i.test(t)) {
    result.handoverQuery = true;
  }

  // V7.99-16: 양하신고 점검 — "양하신고할까?", "신고할까", "세관 신고", "이상 건"
  //   그날 발생한 이상(누락/초과/바뀜/리씰/실오류)을 모아 신고서 작성용으로 정리.
  if (/양하\s*신고|신고\s*(?:할|하|준비|점검|목록|항목)|세관\s*(?:신고|보고)|이상\s*(?:건|사항|있|발생)|특이\s*(?:사항|점|건)\s*(?:있|없|뭐|정리|알려)?|문제\s*(?:있|발생|생긴)|신고\s*리스트|신고서/i.test(t)) {
    result.customsReportQuery = true;
  }

  // V7.99-15: 완료 예정 시각 — "몇 시에 끝나?", "언제 끝나?", "이 속도면 얼마나?"
  //   시간·완료시각 의도가 분명할 때만 (그냥 "몇 개 남았어"는 progress='pending'로 둠).
  //   진행 페이스(완료 타임스탬프)로 남은 시간·완료 시각을 계산해 대화체로 답한다.
  if (/몇\s*시(?:에|쯤|까지|쯤에|즈음)*\s*(?:끝|완료|마|종료)|언제\s*(?:끝|완료|마치|다\s*돼|다\s*해)|끝나(?:는|나|려|)\s*(?:시간|시각|시|때)?|완료\s*(?:예상|예정|시각|시간)|이\s*(?:속도|페이스)|얼마나\s*(?:걸|남았.*끝|더.*걸)|몇\s*시간\s*(?:남|걸|더)|예상\s*(?:완료|종료|시간)|퇴근|점심.*(?:전|까지).*(?:끝|돼)/i.test(t)) {
    result.etaQuery = true;
    result.timeQuery = false;   // V8.03-01: "끝/완료" 의도면 현재 시각이 아니라 종료 추정으로 (오답 [4])
  }

  // M3.3: 진행 상황
  if (/들어갔|들어간|들어가\s*있|실었|실은|올라\s*간|올라간|쌓은|쌓았|쌓았지|완료\s*된|완료된|완료\s*몇|완료\s*된\s*거|완료\s*컨|끝낸|끝난|마친|마쳤|내렸|내린\s*거|다\s*했|다\s*됐|다\s*끝/i.test(t)) {   // V7.91-02: 내렸·다 했 추가
    result.progressQuery = 'done';
  } else if (/남았|남은|안\s*한|안한|더\s*해야|더\s*들어가|더\s*실어|더\s*해|얼마나\s*남|할\s*일|미완료|남아|남나/i.test(t)) {
    result.progressQuery = 'pending';
  } else if (/몇\s*(개|대|건)|갯수|개수|대수|수량/i.test(t) && /작업\s*한|작업\s*했|처리\s*한|처리\s*했|했어|했나|했지|했습니|했는지|한\s*거/i.test(t)
             && !/씰|실번호|봉인|트윈|커버|해치|시프팅|사진|데미지|메모|오답|무게|중량|온도/i.test(t)) {
    // ★ 2.55: 검수사 표준 표현 «작업한 갯수» · «몇 대 했어» 가 **하나도 안 걸리고 있었다**(실데이터 실측 — 답 자체가 안 나왔다).
    //   윗줄 규칙에는 «다 했» 만 있어 «했어» 단독은 통과했다.
    //   ⚠ «했어» 는 흔한 말이라 단독으로 쓰면 «어디 했어» 같은 위치 질문을 가로챈다(2.47 에서 겪은 병).
    //   그래서 **대수를 묻는 맥락(몇 대·갯수·개수·대수·수량)일 때만** 진행 질문으로 본다.
    result.progressQuery = 'done';
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
  // V7.99-10 (메모6 수동): "홀드/데크" 개수 질문 — "에" 유무로 의미가 갈림.
  //   "홀드에 몇 개" = 현재 작업 중인 단의 컨 수 (tierInContextQuery, 맥락 의존)
  //   "홀드 몇 개"   = 작업 남은 단이 몇 곳인지 + 베이 나열 (tierPlaceCountQuery)
  //   먼저 평가해 bayDist/isStat 등 다른 의도보다 우선. 숫자 베이 명시("20번 홀드")는 제외(기존 처리).
  if (!/\d+\s*번/.test(t) && /(개|군데|곳)/.test(t) && /(남았|남은|남아|남나)/.test(t)) {
    if (/홀드에|홀드\s*에|선창에/.test(t)) result.tierInContextQuery = 'hold';
    else if (/데크에|데크\s*에|갑판에/.test(t)) result.tierInContextQuery = 'deck';
    else if (/홀드|선창/.test(t)) result.tierPlaceCountQuery = 'hold';
    else if (/데크|갑판/.test(t)) result.tierPlaceCountQuery = 'deck';
  }
  // V7.90-02: 베이 분포 질문 — "리퍼가 몇 번 베이에 있어?" / "어디 어디에 있어?" (사용자 현장 제보)
  if (/몇\s*번\s*베이|어느\s*베이|무슨\s*베이|어떤\s*베이|어디\s*어디|베이\s*별/i.test(t)) result.bayDistQuery = true;   // V7.91-02: 어떤 베이
  // TallyOne 1.18: "상황 어때"·"어떻게 돼가"·"진행 어디까지" 도 브리핑으로. 현장에서 실제로 쓰는 말이다.
  if (/브리핑|브리핑\s*해|요약\s*해|작업\s*요약|상황\s*(?:어때|어떻|알려|보고)|어떻게\s*(?:돼|되)\s*가|진행\s*(?:상황|어디|어때|얼마)|어디까지\s*(?:했|왔|됐)/i.test(t)) result.briefingQuery = true;
  // 2.05-01 (검수사 «데미지·OOG도 버튼을 눌러 확인하게 — 재질문 감소»): 브리핑 후속 버튼용 로컬 인텐트 3종.
  if (/데미지|파손|손상/.test(t)) result.dmgQuery = true;
  if (/수화물/.test(t)) result.luggQuery = true;
  if (/긴급|최우선/.test(t) && !/긴급수화물/.test(t)) result.urgentQuery = true;
  // 1.89 (검수사 예시 «이번 SWSP 관련선사는 몇군데이고 각각 몇대씩이고 담당자가 누구지?»)
  if (/관련\s*선사|선사\s*(?:몇|현황|분포|별로)|담당자/i.test(t)) result.carrierQuery = true;
  // V7.92: 챗봇형 질문 — 자기소개·시간·날씨·입출항 (사용자 요청: "넌 뭐야"에 답하기)
  if (/(?:^|\s)(?:넌|너는|네가|니가|너|당신|당신이)\s*(?:뭐|누구|하는\s*일|할\s*수|어떤\s*일)|누구세요|누구냐|누구니|누구야|자기\s*소개|소개\s*해|무슨\s*(?:일|기능)|뭐\s*(?:하는|할\s*수)|어떤\s*(?:일|기능|걸\s*할)/i.test(t)) result.introQuery = true;
  // TallyOne 1.22: 도선·접안·작업개시 — "도선이 08시 30분인데 작업시간이 08시 30분 가능한가요?"
  //   도선 시각은 **입항 시각**이라 그 시각에 작업을 시작할 수 없다. 부두별 소요를 더해 작업개시를 답한다.
  if (/도선|파일럿|접안|작업\s*(?:시작|개시|예정)|몇\s*시(?:부터|에)?\s*작업|작업\s*(?:시간|시각)\s*(?:이|은|는)?\s*(?:몇|언제|가능)|언제\s*작업/i.test(t)) {
    result.pilotQuery = true;
  }
  // TallyOne 1.21: 기상·출근 시각 — "몇 시에 일어나야 하지"는 **현재 시각 질문이 아니다**(오답 1786028593439).
  //   검수사 규칙: 출근 = 작업시작 40분 전, 준비+운전 1시간 → 기상 = 작업시작 2시간 전.
  //   ⚠ timeQuery보다 먼저 판정하고 timeQuery를 끈다 — "몇 시에"가 둘 다에 걸린다.
  if (/일어\s*나|일어날|일어남|깨워|깨우|기상\s*(?:시간|시각|몇|해야|하나)|몇\s*시\s*(?:에\s*)?(?:일어|기상)|알람|출근\s*(?:몇|시간|언제|해야)|몇\s*시(?:에|까지)?\s*출근|몇\s*시에\s*나가/i.test(t)) {
    result.wakeQuery = true;
  }
  // 1.69-05: «몇 시에 들어와»는 **입항 질문이다** (검수사 신고 2026-08-14 — "HAYN 몇시에 들어와 → 답이 현재시간").
  //   "몇 시"가 timeQuery에 먼저 먹혀 현재 시각을 답했다. wakeQuery와 같은 순서 게이트 —
  //   timeQuery보다 먼저 판정하고 timeQuery를 끈다. 순수 시계 질문("지금 몇 시야")은 그대로 시계로.
  if (/몇\s*시\s*(?:에|쯤|경|께)?\s*(?:들어\s*[오와]|입항|접안|도착)/i.test(t)
      || /(?:들어\s*[오와][가-힣]*|입항|접안|도착)\s*(?:이|은|는|가|을|를)?\s*몇\s*시/i.test(t)) {
    result.schedQuery = true;
  }
  if (!result.etaQuery && !result.wakeQuery && !result.pilotQuery && !result.schedQuery && /몇\s*시(?!간)|지금\s*시간|현재\s*시간|시간\s*알려|시간\s*좀|오늘\s*며칠|며칠이야|며칠인가|무슨\s*요일|오늘\s*날짜|날짜\s*알려|오늘\s*무슨\s*날/i.test(t)) result.timeQuery = true;   // TallyOne 1.18: 며칠인가·시간 좀 추가 · 1.69-05: schedQuery 게이트
  // V8.60: 맛집/식사 추천 — "점심 뭐 먹을까"·"저녁 먹으러 어디 가지"·"야식 추천" → 돌림판.
  //   ⚠ etaQuery("점심까지 끝나?")와 충돌 금지 — 끝/완료/까지 들어간 문장은 제외.
  // TallyOne 1.18: 출출·허기·요기·시켜먹 등 실제로 쓰는 말 추가 (검수사: 「출출한데 뭘 먹을까」 는 이미 됐다)
  if (!result.etaQuery && /뭐\s*먹|먹을\s*까|먹으러|먹으면|먹고\s*싶|맛집|식당\s*추천|배\s*고프|배고파|출출|허기|요기|끼니|메뉴\s*추천|시켜\s*먹|뭐\s*시킬|야식\s*추천|아침\s*추천|점심\s*추천|저녁\s*추천/i.test(t) && !/끝|완료|까지|남/.test(t)) {
    result.foodQuery = /야식|밤참|심야/.test(t) ? 'night'
      : /저녁|디너/.test(t) ? 'dinner'
      : /아침|조식/.test(t) ? 'breakfast'
      : /점심|런치/.test(t) ? 'lunch' : 'any';
  }
  // TallyOne 1.18: **말길 넓히기** (검수사 지시 2026-08-06 — "앱이 할 수 있는 건 다 해줄 수 있으면 됩니다.
  //   우산은 날씨를 물어본 거고"). 오답 실측: 「우산이 필요할까?」 가 unanswered 로 떨어졌다.
  //   앱은 날씨를 **이미 받고 있다**(평택 좌표·강수확률까지). 질문을 못 알아들었을 뿐이다.
  //   ⚠ '온도'는 넣지 않는다 — **리퍼 온도**와 충돌한다. '기온'만 쓴다.
  //   ⚠ 컨테이너 문맥(컨·베이·리퍼·양하·선적·실번호)이 있으면 날씨로 보지 않는다.
  const _cargoCtx = /컨테이너|컨번호|베이|리퍼|양하|선적|실\s*번호|씰|화물|본선/i.test(t);
  if (!_cargoCtx && (
        /날씨|기온|일기\s*예보|예보\s*어때/i.test(t) ||
        /우산|우비|장화|비옷/i.test(t) ||
        /비\s*(와|오나|올까|온대|와요|omen)/i.test(t) || /눈\s*(와|오나|올까|온대)/i.test(t) ||
        /젖을까|젖겠|맞을까/i.test(t) ||
        /(추|더)울까|(춥|덥)(?:나|니|다던|겠|어)/i.test(t) ||
        /바람\s*(어때|세|쎄|많이|불|강)/i.test(t) ||
        /습하|습한|후덥|무덥|찜통|쌀쌀|선선|포근/i.test(t) ||
        /옷\s*(?:차림|뭐)|겉옷|외투|점퍼\s*(?:필요|입)/i.test(t)
      )) result.weatherQuery = true;
  // V9.18: 선박 소개·이름 유래 — "이 배 뭐야", "선박 소개", "배 이름 뜻/유래", "무슨 배야"
  if (/이\s*배\s*(?:가|는)?\s*(뭐|무슨|어떤|소개)|선박\s*소개|배\s*소개|(?:배|선박)\s*이름\s*(?:뜻|유래|의미)|무슨\s*배|어떤\s*배(?:야|에요|예요|인가)/i.test(t)) result.shipIntroQuery = true;   // 2.57: «이 배가 뭐야»(조사) 허용 — 종전엔 놓쳐 뜻 갈래로 오판
  if (/입출항|입항|출항(?!지)|접안|배\s*언제|언제\s*들어[오와]|언제\s*나가/i.test(t)) result.schedQuery = true;   // 1.69-05: "언제 들어와"도 입항 질문
  // V7.93: 트윈 작업 가능 질문 — "20번 베이 트윈 가능해" / "트윈 무게 확인"
  if (/트윈/.test(t) && /가능|되나|되니|돼|될까|불가|체크|점검|확인|문제|무게/i.test(t)) result.twinCheckQuery = true;
  if (/(실\s*번호|씰|실)\s*(점검|검사|오류|확인|체크)|리스트\s*(점검|검사|확인|체크)|점검\s*(?:해|좀|줘|할까)/i.test(t)) result.sealAuditQuery = true;
  // 1.69-01: «N건» 후속이 실·씰·점검 문맥이면 실 점검 상세로 — "점검 필요 83건이 뭐야"(검수사 신고).
  if (!result.sealAuditQuery && hasCountFollowCtx && /실\s*번호|씰|(?:^|\s)실|점검/.test(t)) result.sealAuditQuery = true;
  // TallyOne 1.50: **"어디 갔어?"는 현재 위치가 아니라 경로를 묻는 말이다.**
  //   검수사 확정 2026-08-11 — *"특정 컨테이너가 여기에 있어야 하는데 어디로 갔지 하고 물으면
  //   어디 선적때 어떤 컨테이너로 바뀌어서 어디로 이동 시켰습니다 라고 알려 줘야 합니다."*
  //   ⚠ posQuery(현재 위치)보다 **먼저** 잡는다 — "어디 갔어"가 "어디"에 먹히면 옛 답이 나온다.
  // TallyOne 1.65: **"그 기능 어디서 하지?"는 컨테이너 질문이 아니라 기능 위치 질문이다.**
  //   검수사 지적 2026-08-13 — *"자연어가 설명만 했더라면 그 자리에서 해결할 일을 클로드에게 물었습니다."*
  //   실측: "컨테이너 위치 수정 어디서 하지?"가 posQuery 에 먹혀 **전 컨테이너 베이 분포표**를 답하고 있었다.
  //   ⚠ movePathQuery·posQuery 보다 **먼저** 잡고, 잡히면 그 둘을 끈다(아래 두 줄에 !howToQuery 가드도 같이 있다).
  //   ⚠ 단독 '어디'는 절대 안 잡는다 — "4777 어디" "엑스레이 어디" 는 종전대로 컨 조회다.
  //      동작 동사와 붙은 '어디서/어디에/어떻게' 만 받고, 컨번호(digits)가 잡히면 무조건 끈다.
  const _actV = '하|해|찾|눌|바꾸|바꿔|고치|고쳐|수정|등록|설정|지정|켜|끄|보|봐|뽑|만들|만드|쓰|써|넣|입력|적|치|찍|사용|확인|남기|남겨|올리|올려|지우|지워|불러|열|골라|고르|인쇄|출력|나와|나오|시작|가';
  const _strong = new RegExp(`도움말|사용법|사용\\s*방법|매뉴얼|무슨\\s*버튼|어느\\s*버튼|버튼\\s*(?:어디|어느)|(?:어디서|어디에서|어디에)\\s*(?:${_actV})|어떻게\\s*(?:${_actV})|보는\\s*법|하는\\s*법|쓰는\\s*법`);
  // 약한 신호("○○ 어디 있어")는 **컨테이너 조건이 하나도 없을 때만** 기능 질문으로 본다.
  //   "리퍼 어디 있어"는 컨 조회이고 "돌림판 어디 있어"는 기능 질문이다 — 가르는 것은 컨 조건의 유무다.
  //   1.66-03: 검수사 실측 — `플랜편집 기능어디에` 가 안 걸려 컨 2,727대가 나왔다.
  //   ① `어디에`·`어디` 로 **문장이 끝나는** 물음 ② `기능·메뉴·버튼·화면` 이 들어간 물음도 받는다.
  //   둘 다 컨 조건이 없을 때만이라 `4777 어디` 같은 조회는 그대로 간다.
  //   1.68: 뜻 질문("시프팅이 뭐야"·"VGM이 무슨 뜻")도 약한 신호로 받는다 — 용어집이 색인에 들어갔다.
  //     못 찾으면 generateHowToAnswer 가 null 을 돌려 종전 경로로 흘러가므로 오탐 피해가 없다.
  const _weak = /어디\s*있|어디\s*(?:냐|야|지|에요|인가)|어디\s*나(?:와|오)|어디에?\s*$|어느\s*(?:화면|탭|메뉴)|어느\s*쪽|기능|메뉴|버튼|화면\s*(?:어디|어느)|(?:이|가|은|는)?\s*뭐(?:야|예요|에요|죠|지)\s*\??\s*$|무슨\s*뜻|뜻이?\s*뭐/;
  //   ⚠ 1.66-03: 컨 조건뿐 아니라 **컨 관련 인텐트가 하나라도 켜져 있으면 약한 신호는 안 받는다.**
  //     실측 — `빈자리 어디` 가 기능 설명(「베이 분석」)에 뺏겼다. 그건 작업 질문이다.
  const _noCond = !result.digits && !result.size && !result.fe && !result.type && result.temp === null
                  && result.bay == null && !result.pol && !result.pod && !result.portAny && !result.zone
                  && !result.dgClass && !result.un
                  && !result.vacantQuery && !result.capacityQuery && !result.bayBreakdown
                  && !result.tierStackQuery && !result.progressQuery && !result.bottomQuery
                  && !result.topQuery && !result.weightSum && !result.dupL4Query
                  && !result.shiftingQuery && !result.tierPlaceCountQuery && !result.tierInContextQuery;
  if (!result.digits && (_strong.test(t) || (_weak.test(t) && _noCond))) {
    result.howToQuery = true;
  }
  // 1.69: **뜻 질문은 용어집이 먼저다.** "리퍼가 뭐예요"의 '리퍼'가 컨 조건으로 잡혀
  //   _noCond 가드에 막히고 컨 조회로 빠졌다(인계함 「소소한 한계」). 순수한 뜻 물음
  //   ("~가 뭐야"·"~ 무슨 뜻")이면 컨 조건이 있어도 용어집을 먼저 시도한다.
  //   못 찾으면 generateHowToAnswer 가 null 을 돌려 종전 컨 조회로 흘러가므로 오탐 피해가 없다.
  //   ⚠ 집계·진행 등 작업 인텐트가 이미 잡힌 문장("남은 거 뭐야")은 뜻 질문으로 보지 않는다.
  const _termQ = /무슨\s*뜻|뜻이?\s*(?:뭐|무엇)|(?:이|가)\s*뭐(?:야|예요|에요|죠|지|냐|니)\s*\??\s*$|(?:이|가)\s*무엇/;
  if (!result.digits && _termQ.test(t)
      && !result.isStat && !result.progressQuery && result.bay == null && !result.listQuery
      && !result.vacantQuery && !result.capacityQuery && !result.etaQuery && !result.weightSum) {
    result.termQuery = true;
    result.howToQuery = true;
  }
  // ⚠ howToQuery 여도 아래 둘을 **끄지 않는다.** 기능 색인에서 못 찾으면(null) 종전 경로가 답해야 하기 때문이다.
  //    순서만 SearchPanel 에서 howTo 를 먼저 시도하는 것으로 정한다.
  if (/어디\s*(?:로)?\s*(?:갔|간|감|옮|이동|보냈|치웠)|왜\s*(?:옮|이동|바뀌|바꿨)|경로|이동\s*(?:이력|기록|경로)|무빙|어떻게\s*(?:옮|이동)/i.test(t)) result.movePathQuery = true;
  if (/(?<!스)위치|어디|어딨|where/i.test(t)) result.posQuery = true;   // 2.59: «스위치 카고»의 위치 오탐 차단(자격 기출 채점 실측)
  // TallyOne 1.17: **끝 4자리 중복 조회** (검수사 오답 신고 2026-08-06 — "끝자리 4자리 중복인거 알려줘").
  //   종전엔 listQuery 하나로만 잡혀 '중복'을 못 읽고 전체를 나열했다.
  //   끝 4자리는 컨번호 조회의 기준이라, 겹치는 것이 있으면 반드시 짚어야 조회를 믿을 수 있다.
  //   listQuery 판정보다 **먼저** 본다 — "중복인 거 알려줘"의 '알려줘'가 목록 질문으로 먹히기 때문.
  if (/중복|겹치|겹쳐|같은\s*(?:번호|끝자리|끝\s*자리)|duplicate|dup\b/i.test(t)) result.dupL4Query = true;
  if (!result.howToQuery && /리스트|목록|(보여|알려)\s*(줘|주세요|달라|다오)|불러\s*줘|뽑아\s*줘|list/i.test(t)) result.listQuery = true;   // V7.91-02: 주세요·달라·불러줘 등 · 1.65: 기능 위치 질문("리스트 어디서 뽑아")은 제외

  // 전체 / 통계
  // V7.91-02: 일상 동의어 확장 — "전체"만 되고 "전부/다/모두"는 안 되던 것 (사용자 요청).
  //   단독 "다"는 토큰으로만 매칭(앞뒤 공백/문장 경계) — "남았다" 속 '다' 오인 방지.
  const allWords = /전체|전부|모두|몽땅|싹\s*다|죄다|도합|통틀어|합쳐서|합치면|다\s*해서|다\s*합(?:쳐|치)|(?:^|\s)다(?=\s|$|[?.!,])/;
  if (/컨테이너|container|all|총\s*개수|총\s*대수|총\s*몇/i.test(t) || allWords.test(t)) result.isAll = true;
  if (/몇\s*(개|대|건)|얼마나|몇\s*이나|개수|대수|수량|총\s*몇/i.test(t)) result.isStat = true;
  // TallyOne 1.27(검수사 신고 2026-08-08): 「시프팅이 몇 개야」가 인식조차 안 됐다.
  if (/시프팅|쉬프팅|시프트|쉬프트|재적|restow|shifting/i.test(t)) result.shiftingQuery = true;

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

  //  ══ 2.40 미르 조작 (밝기·소리) ═══════════════════════════════════
  //    ⛔ 가장 중요한 것은 «거는 것»이 아니라 **«안 거는 것»**이다.
  //      컨 조회를 가로채면 현장이 멈춘다 — 업무 문맥이면 무조건 종전 답변으로 보낸다.
  {
    const RE_SCREEN  = /(화면|밝기|스크린|눈이?\s*아프|눈\s*피로|침침|캄캄)/;
    const RE_UP      = /(밝게|밝혀|환하게|더\s*밝|밝은\s*쪽)/;
    const RE_DOWN    = /(어둡게|어둡혀|눈부시|너무\s*밝|원래대로|기본으로)/;
    const RE_MAX     = /(제일|가장|최대|끝까지)/;
    const RE_MIN     = /(제일|가장|최소|원래대로|기본)/;
    const RE_SOUND   = /(소리|볼륨|음량|목소리|조용히|말\s*하지\s*마)/;
    const RE_SND_UP  = /(크게|키워|올려|높여)/;
    const RE_SND_DN  = /(작게|줄여|낮춰|조용)/;
    const RE_SND_OFF = /(꺼|끄|음소거|조용히\s*해|말\s*하지\s*마)/;
    //  업무 낱말 — 이게 있으면 조작이 아니다. «밝은 색 컨테이너»·«봉인자 어떻게 등록해» 같은 말을 지킨다.
    const RE_WORK = /\d{4}|컨테이너|리퍼|엑스레이|x-?ray|베이|양하|선적|트윈|씰|실번호|봉인|어디서\s*(하|보)|어떻게\s*(하|해)/i;
    const hasScreen = RE_SCREEN.test(t);
    const hasSound = RE_SOUND.test(t);
    if (RE_WORK.test(t) && !hasScreen && !hasSound) {
      /* 업무 문맥 — 조작으로 보지 않는다 */
    } else if (hasSound) {
      if (RE_SND_OFF.test(t)) result.deviceCmd = { kind: 'volume', to: 'off' };
      else if (RE_SND_UP.test(t)) result.deviceCmd = { kind: 'volume', dir: +1 };
      else if (RE_SND_DN.test(t)) result.deviceCmd = { kind: 'volume', dir: -1 };
    } else if (RE_UP.test(t) && (hasScreen || !RE_WORK.test(t))) {
      result.deviceCmd = RE_MAX.test(t) ? { kind: 'bright', to: 4 } : { kind: 'bright', dir: +1 };
    } else if (RE_DOWN.test(t) && (hasScreen || !RE_WORK.test(t))) {
      result.deviceCmd = RE_MIN.test(t) ? { kind: 'bright', to: 1 } : { kind: 'bright', dir: -1 };
    } else if (hasScreen && /(어두운|어두워|어둡다|어둡네|어둡습|침침|캄캄|안\s*보여)/.test(t)) {
      //  검수사 원문이 이 형태다 — *«미르야 화면이 어두운데?»*. 되묻지 말고 한 단계 올린다.
      //  ⚠ 2.40-01: 여기를 «어두» 로 넓게 잡으면 안 된다 — 검수사가 「화면 어둡게」를 **치는 도중**
      //    「화면 어두」 에서 걸려 **반대로 밝아진다.** 서술형(어두운·어두워)만 받고 명령형은 위 RE_DOWN 이 받는다.
      result.deviceCmd = { kind: 'bright', dir: +1 };
    } else if (hasScreen || /(눈이?\s*아프|눈\s*피로)/.test(t)) {
      //  ⚠ «눈이 아프다»는 **어두워서인지 눈부셔서인지 모른다.** 지어내지 말고 되묻는다(2-0-D).
      result.deviceCmd = { kind: 'bright', ask: true };
    }
  }

  //  ══ 2.41 미르 — 선박 연락처(이메일) ═══════════════════════════════
  //    검수사 원문 — «우리는 선박에 자료를 주고 확답을 받아야 합니다»(본선 일항사와 메일로 컨펌) ·
  //    «수석이 PCSZ 이메일이 뭐지 물으면 답만 해주면 됩니다»(미르는 답만, 발송·추적은 범위 밖) ·
  //    «어떤이유로든 연관이 있으니까 그 주소가 있을것이니까»(본선 아닌 연락처도 버리지 않는다).
  //    ⛔ 업무 질문 가로채기 0 — "이메일/메일주소"가 뚜렷하지 않으면 절대 안 건드린다.
  {
    const RE_CONTACT_STRONG = /(이메일|메일\s?주소|email)/i;
    const RE_ONBOARD = /(본선|일항사|선장)/;
    //  업무 낱말 — 있으면(수치·컨/리퍼/베이/양하/선적 등) 연락처 조회로 보지 않는다. 2.40 RE_WORK와 같은 목적.
    const RE_CONTACT_GATE = /\d{4}|컨테이너|리퍼|엑스레이|x-?ray|베이|양하|선적|트윈|씰|실번호|봉인/i;
    const hasContactStrong = RE_CONTACT_STRONG.test(t);
    const hasOnboardWord = RE_ONBOARD.test(t);
    //  "본선 메일"처럼 "이메일/메일주소"가 아닌 낱말 "메일"만 있는 경우(온보드 낱말과 붙었을 때만 받는다).
    const hasBareMail = !hasContactStrong && /메일/.test(t);
    if ((hasContactStrong || (hasOnboardWord && hasBareMail)) && !RE_CONTACT_GATE.test(t)) {
      const onboardOnly = hasOnboardWord;
      //  트리거·잡동사를 걷어내고 남는 토큰을 선박 코드/풀네임 후보로 — 최종 판정(voyages 대조)은 화면(shipCtx)이 한다.
      const cand = t
        .replace(RE_CONTACT_STRONG, ' ')
        .replace(RE_ONBOARD, ' ')
        .replace(/메일/g, ' ')
        .replace(/이\s*배|찾기|찾아\s*줘?|찾아|알려\s*줘?|알려|가르쳐\s*줘?|가르쳐|주소|뭐(?:야|지|예요|에요|길래)?|좀|줘|해\s*줘?|무엇|인가요?|일까요?|일까|있(?:어|나|니)|보내\s*줘?|보내|줄래/g, ' ')
        .replace(/[?!.,]/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
      result.contactQuery = { code: cand ? cand.toUpperCase() : null, onboardOnly };
    }
  }

  // ★★★ 2.57: 갈래 판정 한 벌 — «무엇을 묻는가»를 마지막에 가린다 (검수사 확정 화법 규칙 2
  //   «묻는 것에 답한다» — 같은 낱말이라도 ~이 뭐야/이란 = 뜻, 어디 = 위치, 몇 대 = 개수).
  //   왜 여기냐 — 152~430 의 인텐트가 전부 확정된 뒤라야 «이미 잡힌 업무 인텐트»를 다 볼 수 있다.
  //   종전 _weak(1.68)·_termQ(1.69) 가드가 dupL4Query(:420)·shiftingQuery(:430)·listQuery(:421)·isStat(:428)
  //   **선언 전에** 검사해 한 번도 작동한 적 없던 자리다(2.57 전수 조사 실측).
  //   ⚠ 갈래는 def(뜻) 하나만 새로 가린다 — 위치·개수·목록은 posQuery·isStat·listQuery 가 이미 그 역할이다.
  {
    //  뜻 어미 — «이란?» 은 지금까지 nlSearch 어디에도 없었다(mirKnowledge 게이트에만 있어 화면 따라 갈렸다).
    const _defTail = /(?:이|가)?\s*(?:뭐야|뭐예요|뭐에요|뭐죠|뭐지|뭐냐|뭐니|뭔데|뭐임)\s*\?*\s*$|(?:이란|란)\s*\?*\s*$|무슨\s*뜻|뜻\s*이?\s*(?:뭐|무엇)|무슨\s*말|(?:이|가)\s*무엇|(?:홀수|짝수)\s*(?:야|이야|인가요?|예요)|몇\s*(?:인치|센티|cm|미터)|(?:종류|부위|명칭)(?:\s*(?:이름|명칭))?\s*(?:이|가|은|는)?\s*(?:뭐|무엇|알려|있)|기준\s*(?:이|가)?\s*(?:야|이야|예요|뭐|인가)|색(?:깔)?(?:으로|로)?[^]{0,8}(?:구분|알\s*수|뭐)|타레[^]{0,8}몇\s*(?:키로|킬로|kg|톤)|몇\s*도\s*(?:가|이)?\s*기준/;   // 2.59: 홀짝·단위 · 2.60: 지식 신호(종류·부위·기준·라벨 색·타레 몇 키로) — 검수사 «클로드의 지식으로 넣어준게 무엇이» 후속: 지식을 부어도 어미가 못 받으면 없는 것과 같다
    //  업무 인텐트가 이미 잡혔으면 뜻이 아니다 — «남은 거 뭐야»(진행)·«83건이 뭐야»(후속)·«중복이 뭐야»(중복 조회)
    //  «빈자리가 뭐야»(빈자리) 류가 뜻으로 오판되면 기존 기능을 뺏는다(가로채기 0 이 최우선).
    //  ★ 2.58: dmgQuery 는 뺐다 — «씰 파손이 뭐야»·«웻 데미지가 뭐야»·«데미지가 뭐야»는 뜻이 정답인데
    //    /데미지|파손|손상/ 한 낱말 판정이 전부 이력 조회로 끌고 갔다(검수사 실측 — 초보티 목록 1번).
    //    이력을 정말 물을 때(«데미지 이력·기록·보여줘»)만 조회가 이긴다.
    const _histWord = /이력|내역|기록|보여|목록|건\s|사진/.test(t);
    //  ★ 2.59: isAll 도 뺐다 — «리퍼 컨테이너가 뭐야»·«컨테이너에 물이…» 의 «컨테이너» 가 isAll 로
    //    오판돼 뜻을 막았다(자격 기출 채점 실측). «전체 보여줘/몇 대» 는 listQuery·isStat 이 지킨다.
    const _busy = !!(result.digits || result.bay || hasCountFollowCtx || result.isStat
      || result.progressQuery || result.vacantQuery || result.capacityQuery || result.etaQuery
      || result.weightSum || (result.listQuery && !/종류|부위|명칭/.test(t)) || result.bayDistQuery   /* 2.60: «종류 알려줘»의 «알려줘»가 listQuery 를 켜 지식 답을 막았다 — 종류·부위·명칭이 있으면 지식 질문이다(«FR 목록»엔 이 낱말이 없어 목록 유지) */
      || result.bayBreakdown || result.tierStackQuery || result.tierPlaceCountQuery || result.tierInContextQuery
      || result.bottomQuery || result.topQuery || result.dupL4Query || result.sealAuditQuery
      || result.customsReportQuery || result.briefingQuery || result.handoverQuery || result.carrierQuery
      || result.twinCheckQuery || result.movePathQuery || result.contactQuery || result.schedQuery
      || result.timeQuery || result.wakeQuery || result.pilotQuery || result.foodQuery || result.weatherQuery
      || result.introQuery || result.shipIntroQuery || (result.dmgQuery && _histWord) || result.luggQuery || result.urgentQuery
      || result.mirHello || result.deviceCmd);
    //  ⚠ shiftingQuery·mode·type 은 일부러 안 막는다 — «시프팅이 뭐야»·«양하가 뭐야»·«FR이 뭐야»는 뜻이 정답
    //    (검수사 실측 신고가 정확히 «FR이 뭐야 하니 위치를 알려준다» 였다).
    //  ★ 2.58: «어떻게(방법)» 갈래 — 검수사 실측 «물이 새는데 데미지 어떻게 잡아야 해» 에 세 화면이
    //    제각각(전체 이력·이 항차 사진·없음)으로 답했다. 방법을 물으면 방법이 답이다 — 실무 지식(원장) →
    //    기능 방법(매뉴얼) 순서로 본체 한 벌이 답하고, 못 찾으면 종전 경로로 흘려보낸다(조회 기능 안 막음).
    const _howTail = /어떻게|어떡|어찌|무슨\s*방법|방법(?:이|을|은|으로|좀)?(?:\s|\?|$)|절차|(?:읽|보|하)는\s*법|도\s*(?:돼|되나|될까)(?:요)?\s*\?*\s*$/;   // 2.59: «셀 넘버 읽는 법» 류 · 2.60-01: 허가 질문(«40 위에 20 올려도 돼») — 물리 규칙·판단 답이 how 몫. bay 붙은 «커버 열어도 돼»는 _howBusy(bay)가 지켜 종전 경로(mirEyes 단계·제동) 유지
    //  ⚠ isAll 은 넣지 않는다 — «컨테이너에 물이 새는데…» 의 «컨테이너» 가 isAll 로 오판돼
    //    방법 갈래를 막았다(검수사 실측 문장 그대로). «전체 어떻게 봐» 도 방법 답이 자연스럽다.
    //  ⚠ listQuery 도 뺐다 — «셀 넘버 읽는 법 알려줘» 의 «알려줘» 가 목록 판정을 켜 방법을 막았다.
    //    «FR 목록» 류는 how 어미가 없어 그대로 목록으로 간다(시험 ②가 지킨다).
    const _howBusy = !!(result.digits || result.bay || hasCountFollowCtx || result.isStat
      || result.posQuery || result.bayDistQuery || result.progressQuery
      || result.contactQuery || result.schedQuery || result.timeQuery || result.mirHello || result.deviceCmd);
    result.asking = (!_busy && _defTail.test(t)) ? 'def'
      : ((!_howBusy && _howTail.test(t)) ? 'how' : null);
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
    r = r.filter(c => c.rf || (c.iso && c.iso[2] === 'R') || /R[FH]$/.test(isoToLabel(c.iso) || '') || (c.tmp && String(c.tmp).trim() !== '' && String(c.tmp).trim() !== '0'));
    // 1.86 (검수사 확정): «리퍼» = 풀이 기본 — 엠티는 «리퍼 엠티»로 물을 때만. 전면에 엠티가 섞이면 헷갈린다.
    if (!parsed.fe) r = r.filter(c => c.fe !== 'E');
  } else if (parsed.type === 'dg') r = r.filter(c => c.dg);
  else if (parsed.type === 'xray') r = r.filter(c => c._xray);
  else if (parsed.type === 'lolo') r = r.filter(c => c.lolo);       // V9.56: 갠트리(落地) 분
  else if (parsed.type === 'dbl') r = r.filter(c => c.dbl);         // V9.56: 双背(2단)
  else if (parsed.type === 'tk') r = r.filter(c => c.tk || /TK$/.test(isoToLabel(c.iso) || ''));
  else if (parsed.type === 'fr') r = r.filter(c => c.fr || /FR$/.test(isoToLabel(c.iso) || ''));
  else if (parsed.type === 'ot') r = r.filter(c => c.ot || /OT$/.test(isoToLabel(c.iso) || ''));
  else if (parsed.type === 'oog') r = r.filter(c => c.oog || c.fr || c.ot);

  if (parsed.bayTrio && parsed.bayTrio.length) {
    const set = new Set(parsed.bayTrio.map(b => normalizeBay(b)));
    r = r.filter(c => set.has(normalizeBay(c.bay)));   // V8.03-01: 짝수 홀드/데크 = 트리오 전체
  } else if (parsed.bay) {
    r = r.filter(c => normalizeBay(c.bay) === parsed.bay);
  }

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
  if (parsed.type === 'lolo') desc.push('갠트리(落地)');
  if (parsed.type === 'dbl') desc.push('双背 2단');
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
  if (parsed.digits) desc.push(`끝네자리 ${parsed.digits}`);
  if (desc.length === 0 && parsed.isAll) return '전체';
  return desc.join(' ') || '전체';
}

export function hasAnyCondition(parsed) {
  return !!(parsed.shiftingQuery ||   // TallyOne 1.27
            parsed.digits || parsed.size || parsed.fe || parsed.type ||
            parsed.bay || parsed.pol || parsed.pod || parsed.portAny ||
            parsed.zone || parsed.dgClass || parsed.un || parsed.mode ||
            parsed.weightMin !== null || parsed.weightMax !== null ||
            parsed.isAll || parsed.temp !== null ||
            parsed.capacityQuery || parsed.bayBreakdown ||
            parsed.progressQuery || parsed.tierStackQuery ||
            parsed.bottomQuery || parsed.topQuery || parsed.vacantQuery ||
            parsed.weightSum || parsed.posQuery || parsed.listQuery || parsed.bayDistQuery ||
            parsed.tierPlaceCountQuery || parsed.tierInContextQuery || parsed.etaQuery || parsed.customsReportQuery || parsed.handoverQuery ||
            // V9.14: 챗봇형 의도도 '조건 있음'으로 — 통합검색 무응답·SearchPanel의 8종 수동 나열(구조적 부채) 해소
            parsed.briefingQuery || parsed.sealAuditQuery || parsed.carrierQuery || parsed.mirHello || parsed.introQuery || parsed.timeQuery || parsed.wakeQuery || parsed.pilotQuery ||
            parsed.dmgQuery || parsed.luggQuery || parsed.urgentQuery ||   // 2.05-01
            parsed.weatherQuery || parsed.schedQuery || parsed.twinCheckQuery || parsed.foodQuery || parsed.shipIntroQuery ||
            parsed.howToQuery || parsed.contactQuery);   // 1.65 · 2.41: 선박 연락처 질의도 '조건 있음'
}

// ─── TallyOne 1.65: 기능 위치 답변 ────────────────────────────────────────
//   검수사 지시 — *"앱이 할 수 있는 건 다 설명할 수 있어야 합니다."*
//   지식원은 두 곳이다. featureIndex(574개 전수, 화면 글자 그대로) + helpData(사람이 읽는 매뉴얼).
//   둘을 같이 뒤져 가장 맞는 것을 낸다. 매뉴얼이 충실해질수록 이 답도 좋아진다.

// 조사·어미를 떼고 뜻있는 낱말만 남긴다. 질문투 낱말은 버린다.
const _HT_STOP = /^(어디서|어디에|어디|어떻게|보는법|보는|하지|하나|해요|하는|한다|되나|보나|봐|줘|좀|것|수|때|왜|무슨|어느|방법|사용법|기능|메뉴|버튼|화면|설명|알려|알려줘|알려주세요|가르쳐|가르쳐줘|합니까|합니꺼|하죠|하나요|도움말|매뉴얼|쓰는법|하는법)$/;
// 한 글자여도 현장에서 그대로 쓰는 말은 살린다 — "씰 어떻게 넣어" 가 통째로 버려지던 것을 막는다.
const _HT_KEEP1 = new Set(['씰', '실', '갱', '콘', '홀', '단', '열', '판', '컨']);
function _htToks(s) {
  return String(s || '').replace(/[^가-힣A-Za-z0-9]+/g, ' ').split(' ')
    .map(w => w.replace(/(을|를|이|가|은|는|에|의|로|으로|에서|와|과|도|만|까지|부터)$/, ''))
    .filter(w => (w.length > 1 || _HT_KEEP1.has(w)) && !_HT_STOP.test(w));
}
// 같은 뜻 다른 말을 한 줄에 세운다 — 검수사: "말은 다 틀리지만 맥락은 같음"
function _htExpand(toks) {
  const out = new Set(toks);
  for (const w of toks) {
    for (const group of FEATURE_SYNONYMS) {
      if (group.some(g => g.replace(/\s/g, '') === w.replace(/\s/g, ''))) group.forEach(g => out.add(g));
    }
  }
  return [...out];
}
// 매뉴얼(helpData)을 색인과 같은 모양으로 눕힌다.
let _htManual = null;
function _htManualIndex() {
  if (_htManual) return _htManual;
  const out = [];
  //  2.30: **블록 원본(b)을 그대로 달고 다닌다** — 종전엔 제목·자리·머리글만 답에 썼고
  //    순서(dos)·경고(warns)는 검색용 blob 에만 넣어 **답에는 한 줄도 안 나갔다.**
  //    검수사 지시 «메뉴얼 만들면서 생긴 지식을 미르에게 인식 시켜 주세요 미르가 교관이 될수 있도록».
  //    매뉴얼이 **단일 소스**다 — 여기에 지식을 따로 복사해 두지 않는다.
  const push = (r) => (b) => out.push({
    l: b.title || '', w: b.where || '', d: b.lead || '', r, a: b.keys || [], b,
    blob: [b.title, b.where, b.lead, ...(b.dos || []), ...(b.warns || []),
           ...(b.why || []), ...(b.never || []),
           ...((b.says || []).flatMap(s => [s.in, s.out]))].filter(Boolean).join(' '),
  });
  try {
    for (const arr of Object.values(HELP_DATA?.usage || {})) (arr || []).forEach(push('t'));
    (HELP_COURSE || []).forEach(push('t'));
    //  수석 권 — 검수원에게는 «있다»고만 알리고 하는 법은 안 가르친다(권한 처리는 아래 답 만들 때).
    for (const arr of Object.values(HELP_DATA_CHIEF?.usage || {})) (arr || []).forEach(push('c'));
    // TallyOne 1.68: 용어집(terms)도 색인한다 — 18항목이 앱에 있는데 자연어가 못 읽고 있었다.
    //   검수사 지적 2026-08-13: "있는것도 많은것을 모릅니다." 신참의 "시프팅이 뭐야"가 이걸로 즉답된다.
    (HELP_DATA?.terms || []).forEach((t) => out.push({
      l: t.term || '', w: '용어집', d: t.desc || '', r: 't', a: [], k: 'term',   // 1.69: 뜻 질문 우선용 표식
      blob: [t.term, t.desc].filter(Boolean).join(' '),
    }));
  } catch (e) { /* 매뉴얼이 없어도 색인만으로 답한다 */ }
  _htManual = out;
  return out;
}
const _ROLE_KR = { t: '', c: '수석 검수사 화면', a: '보조기능', o: '소유자 전용', m: '관리자 전용' };

//  2.30: 매뉴얼 한 장을 **가르치는 말투로** 편다.
//    답은 whitespace-pre-wrap 로 그대로 찍히므로 «**» 는 걷어낸다(안 그러면 별표가 그대로 읽힌다).
const _clean = (x) => String(x || '').replace(/\*\*/g, '');
function _teachLines(b, { canDo = true } = {}) {
  const L = [];
  if (b.lead) L.push('', _clean(b.lead));
  const why = (b.why || []).slice(0, 3);
  if (why.length) { L.push('', '왜 이렇게 하나'); why.forEach((w) => L.push(`  · ${_clean(w)}`)); }
  if (canDo) {
    const dos = (b.dos || []).slice(0, 6);
    if (dos.length) { L.push('', '이렇게 합니다'); dos.forEach((d, i) => L.push(`  ${i + 1}. ${_clean(d)}`)); }
    const says = (b.says || []).slice(0, 4);
    if (says.length) { L.push('', '이렇게 물으면 됩니다'); says.forEach((x) => L.push(`  · ${_clean(x.in)} → ${_clean(x.out)}`)); }
  }
  const warns = (b.warns || []).slice(0, 3);
  if (warns.length) { L.push('', '조심할 것'); warns.forEach((w) => L.push(`  ⚠ ${_clean(w)}`)); }
  const never = (b.never || []).slice(0, 3);
  if (never.length) {
    L.push('', _clean(b.neverTitle || '⛔ 한 번 잘못 누르면 잃는 것'));
    never.forEach((w) => L.push(`  ✕ ${_clean(w)}`));
  }
  return L;
}

/** 기능 위치 답변 — 못 찾으면 null (그러면 종전 경로로 넘어간다) */
export function generateHowToAnswer(query, parsed, opts = {}) {
  // 1.69: 육공 — 검수사 확정 원문 *"육공은 저도 모름"*. 지어내지 않는다.
  if (/육공/.test(String(query || ''))) return '「육공」은 확인된 용어가 아닙니다.';
  const T0 = _htToks(query);                     // 사용자가 **실제로 한 말**
  const T = _htExpand(T0);                       // + 같은 뜻 다른 말
  //  2.30: 동의어는 **절반만** 센다.
  //    실측 — «리퍼 온도 어떻게 넣어» 가 「리퍼 (냉동·냉장)」로 갔다.
  //    사용자는 «냉동»·«냉장» 을 말한 적이 없는데 그 두 낱말이 제목에 있어 +20 을 벌었다.
  //    실제로 한 말이 제목에 있는 쪽이 먼저다.
  const _said = new Set(T0.map((x) => String(x).replace(/\s+/g, '')));
  const isChief = !!opts.isChief;
  //  «어떻게 해»·«왜 그래»·«조심할 것» — 자리가 아니라 방법을 묻는 물음
  const _asksHow = /어떻게|어떡|방법|하는\s*법|쓰는\s*법|왜|어째|조심|주의|순서|절차|해야|하나요|합니까/.test(String(query || ''));
  // 1.69: 뜻 질문("~가 뭐야")이면 용어집 항목에 가점 — usage 색인(기능 위치)보다 정의가 먼저다.
  const termFirst = !!(opts.termFirst || (parsed && parsed.termQuery));
  // "사용법 알려줘"처럼 대상 낱말이 없는 물음 — 매뉴얼 자체로 안내한다.
  if (!T.length) {
    return ['📍 사용 매뉴얼',
      '   헤더 ⋯ 메뉴 → [사용 매뉴얼] · 보조기능 → [사용 매뉴얼]',
      '',
      '하루 작업 순서 10단계와 기능 사전, 검수 용어·회화가 들어 있습니다.',
      '',
      '찾는 기능 이름을 같이 넣어 물으시면 그 자리를 바로 알려 드립니다.',
      '  예) 카고플랜 어디서 뽑아 · 리퍼 온도 어디에 넣어 · 해치커버 어떻게 보고해',
    ].join('\n');
  }

  const pool = [
    ...FEATURE_INDEX.map(f => ({ ...f, blob: [f.l, f.w, f.d, ...(f.a || [])].join(' ') })),
    ..._htManualIndex(),
  ];
  // 1.66-03: **띄어쓰기 차이로 못 찾던 것을 없앤다.**
  //   검수사 실측 — `플랜편집` 이 색인의 `플랜 편집` 과 안 맞아 답을 못 냈다.
  //   현장에서는 붙여 쓰기도 하고 띄어 쓰기도 한다. 비교할 때 공백을 지운다.
  const _sq = (x) => String(x || '').replace(/\s+/g, '');
  const score = (it) => {
    let s = 0;
    const l = _sq(it.l), w = _sq(it.w), d = _sq(it.d), al = _sq((it.a || []).join(' ')), blob = _sq(it.blob);
    for (const t0 of T) {
      const t = _sq(t0);
      if (!t) continue;
      const k = _said.has(t) ? 1 : 0.5;           // 동의어는 절반
      if (l.includes(t)) s += 10 * k;
      if (al.includes(t)) s += 9 * k;
      if (w.includes(t)) s += 6 * k;
      if (d.includes(t)) s += 4 * k;
      else if (blob.includes(t)) s += 2 * k;
    }
    if (termFirst && it.k === 'term' && s > 0) s += 12;   // 1.69: 뜻 질문은 용어집 우선
    //  2.30: «어떻게·왜·조심» 을 물으면 **매뉴얼이 먼저**다 — 색인은 «어디 있나»에 답하는 것이라
    //    라벨이 짧아 늘 이겼고, 그래서 방법을 물어도 자리만 알려 주고 끝났다.
    if (it.b && s > 0 && _asksHow) s += 8;
    //  2.30: 검수원이 물었는데 **수석 항목이 답을 뺏지 않게** 한다 — 찾히기는 하되 뒤에 선다.
    //    실측 — «완료가 안 눌려» 가 「완료 보관소(복원)」(수석)로 갔다. 검수원에게 쓸모없는 답이다.
    if (it.r === 'c' && !isChief && s > 0) s -= 8;
    return s;
  };
  let hits = pool.map(it => ({ it, s: score(it) })).filter(x => x.s >= 9)
    .sort((a, b) => b.s - a.s);
  if (!hits.length) return null;
  // 1.69: 뜻 질문이면 용어집 히트를 맨 위로 — 동의어 확장 점수가 기능 색인을 밀어 올려도 정의가 먼저다.
  //   용어집에 없으면 종전대로 기능 색인이 답한다(예: "돌림판이 뭐야").
  if (termFirst) {
    const th = hits.filter((h) => h.it.k === 'term');
    if (th.length) hits = [...th, ...hits.filter((h) => h.it.k !== 'term')];
  }

  const top = hits[0].it;
  const lines = [];
  // 첫 줄이 음성으로 읽히므로 여기에 핵심을 놓는다.
  lines.push(`📍 ${top.l}`);
  if (top.w) lines.push(`   ${_clean(top.w)}`);

  //  2.30: 매뉴얼 항목이면 **가르친다** — 머리글만 읽어 주고 마는 것이 아니라 왜·순서·조심할 것까지.
  //    수석 권 항목을 검수원이 물으면 «있다»까지만 알리고 하는 법은 펴지 않는다.
  if (top.b) {
    const canDo = !(top.r === 'c' && !isChief);
    lines.push(..._teachLines(top.b, { canDo }));
  } else {
    if (top.d) lines.push('', _clean(top.d));
    //  2.30: 색인이 이겼어도(«어디 있나» 라벨이 짧아 늘 이긴다) **매뉴얼이 있으면 이어서 가르친다.**
    //    자리는 색인이, 방법은 매뉴얼이 답한다 — 검수사 지시 «미르가 교관이 될수 있도록».
    const mh = hits.find((h) => h.it.b && h.s >= 9);
    if (mh) {
      const canDo = !(mh.it.r === 'c' && !isChief);
      lines.push('', `— ${mh.it.l}`);
      lines.push(..._teachLines(mh.it.b, { canDo }));
    }
  }

  // 권한 — 검수사 확정: "있다고 말하되 수석 기능임을 밝힌다"
  if (top.r === 'c' && !isChief) lines.push('', '🔒 수석 검수사 화면의 기능입니다. 수석에게 요청하십시오.');
  else if (top.r === 'o') lines.push('', '🔒 소유자 전용 기능입니다.');
  else if (top.r === 'm') lines.push('', '🔒 관리자 전용 기능입니다.');
  else if (top.r === 'a') lines.push('', '🧰 보조기능 화면에 있습니다 — 모든 검수사가 쓸 수 있습니다.');

  const others = hits.slice(1, 4).filter(h => h.it.l && h.it.l !== top.l);
  if (others.length) {
    lines.push('', '이것도 찾으셨나요');
    others.forEach(h => lines.push(`  · ${h.it.l}${h.it.w ? ` — ${h.it.w}` : ''}`));
  }
  lines.push('', '더 자세히는 [사용 매뉴얼]에서 볼 수 있습니다.');
  return lines.join('\n');
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
/**
 * 경고 문장을 그대로 물었을 때 그 경고를 설명한다. — TallyOne 1.23
 *
 * 왜 — 검수사가 화면의 경고 문구를 복사해 물었더니 **검색어로 처리돼 엉뚱한 답**이 나왔다.
 *   `무게 큰 차이 12건 (5톤 이상 - 풀/엠티 구분 확인 필요)` 에서
 *   `풀` 한 글자가 `fe='F'` 로, `5톤 이상` 이 `weightMin=5000` 으로 잡혀
 *   **"풀 5톤 이상 98대"** 를 답했다(오답 리포트 2건, 2026-08-07).
 *   `경고`·`진단` 이라는 낱말은 nlSearch 어디에도 없었다 — 의도 자체가 비어 있었다.
 *
 * 어떻게 — 숫자·괄호·기호를 걷어낸 뒤 **지금 이 항차에 실제로 떠 있는 경고**의 문구와 맞춰 본다.
 *   경고 목록(diagAlerts)을 그대로 쓰므로 문구가 바뀌어도 따로 손볼 데가 없다.
 *   맞으면 그 경고의 상세(details)까지 붙여 답한다. 못 맞추면 null 을 돌려 기존 경로로 넘긴다.
 */
const _WHY_BY_CODE = {
  fe_conflict:   'EDI 와 리스트의 풀/엠티 표기가 서로 다릅니다. 실물을 확인하세요.',
  iso_conflict:  'EDI 와 리스트의 규격이 서로 다릅니다. 실물을 확인하세요.',
  reefer_no_temp:'풀 리퍼인데 온도가 없습니다. 현장에서 온도를 확인해 입력하세요.',
  unknown_iso:   '규격 표기를 앱이 해석하지 못했습니다. 사진을 찍고 1항사에게 확인하세요.',
  dg_no_class:   '위험물인데 클래스 정보가 없습니다.',
  dg_no_un:      '위험물인데 UN 번호가 없습니다.',
  imdg_violation:'같은 자리에 격리해야 할 위험물 클래스가 함께 있습니다. 즉시 확인하세요.',
  list_short:    'EDI 실번호보다 리스트가 모자랍니다. 리스트가 덜 왔거나 컨번호가 어긋난 것입니다.',
  list_extra:    '리스트에는 있는데 EDI 평택분에 없는 컨입니다. 통과화물이거나 타선박 자료일 수 있습니다.',
  empty_confirmed:'실 컨과 엠티 확정분을 더한 수입니다. 이상이 아니라 집계입니다.',
  seal_diff:     'EDI 와 리스트의 실번호가 다릅니다.',
  xray_no_location:'X-RAY 대상인데 EDI 에서 위치를 못 찾았습니다.',
  empty_seal_pending:'엠티 실 부착·확인이 남았습니다.',
  weight_diff:   '무게 대조 경고는 1.23 에서 없앴습니다. 무게가 벌어지는 이유가 여럿이라 원인을 가릴 수 없습니다.',
};
// 경고별 핵심 낱말 — **묶음마다 하나씩** 질문에 들어 있어야 그 경고로 본다(AND of ORs).
//   경고를 새로 만들면 여기에 한 줄 추가한다. 없으면 문구 그대로 물었을 때만 잡힌다.
const _ALERT_TERMS = {
  fe_conflict:       [['풀', 'F/E', 'FE'], ['엠티', '공컨', '빈컨'], ['다름', '다르', '불일치', '차이', '충돌']],
  iso_conflict:      [['규격', '사이즈', '타입'], ['다름', '다르', '불일치', '차이', '충돌']],
  reefer_no_temp:    [['리퍼', '냉동'], ['온도'], ['미입력', '없', '누락', '안']],
  unknown_iso:       [['규격', '표기'], ['알수없', '알 수 없', '모르', '미상', '이상']],
  dg_no_class:       [['위험물', 'DG'], ['클래스', '급']],
  dg_no_un:          [['위험물', 'DG'], ['UN', '유엔']],
  imdg_violation:    [['IMDG', '격리']],
  list_short:        [['리스트'], ['부족', '모자', '매칭', '안맞', '적']],
  list_extra:        [['리스트'], ['매칭', '없', '남', '더']],
  seal_diff:         [['실번호', '씰', '실'], ['다름', '다르', '불일치', '차이']],
  xray_no_location:  [['XRAY', 'X-RAY', '엑스레이'], ['매칭', '위치', '없']],
  empty_seal_pending:[['엠티', '공컨'], ['실', '씰'], ['부착', '확인', '미']],
  empty_confirmed:   [['확정'], ['엠티', '실']],
  weight_diff:       [['무게', '중량'], ['차이', '다름', '다르']],
};
const _alertNorm = (s) => String(s || '')
  .replace(/[0-9]+/g, ' ')
  .replace(/[()[\]{}·:,.\-—~!?"'`/+]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export function answerAboutAlert(query, alerts) {
  if (!query || !Array.isArray(alerts) || !alerts.length) return null;
  const q = _alertNorm(query);
  if (q.length < 4) return null;
  let hit = null;
  for (const a of alerts) {
    const m = _alertNorm(a?.msg);
    if (!m) continue;
    // 문구를 통째로 붙여 넣었거나(포함), 앞부분만 옮겨 적었어도(역포함) 잡는다.
    if (q === m || q.includes(m) || (m.includes(q) && q.length >= Math.min(10, m.length * 0.5))) { hit = a; break; }
  }
  // 핵심 낱말표 — 현장에서는 문구를 그대로 옮기지 않는다.
  //   "풀엠티 다름 이거 뭐죠" · "규격이 다르다는게 무슨 말이야" 처럼 붙여 쓰고 말꼬리를 바꾼다.
  //   ⚠ 문장 유사도로 재려다 실패했다(2026-08-07) — 한국어 어미 변화 때문에 임계값을 아무리 만져도
  //   "리퍼 온도 알려줘"(평범한 조회)까지 삼키거나 진짜 질문을 놓쳤다. **표가 예측 가능하다.**
  //   규칙: 묶음마다 하나씩은 들어 있어야 그 경고로 본다(AND of ORs).
  //   그래서 "리퍼 온도 알려줘" 는 '미입력' 묶음이 비어 안 걸리고, "리퍼 온도 미입력" 은 걸린다.
  if (!hit) {
    const qFlat = q.replace(/\s/g, '');
    const has = (arr) => arr.some(w => qFlat.includes(w));
    for (const a of alerts) {
      const groups = _ALERT_TERMS[a?.code];
      if (!groups || !groups.length) continue;
      if (groups.every(has)) { hit = a; break; }
    }
  }
  if (!hit) return null;
  const icon = hit.level === 'critical' ? '🔴' : hit.level === 'warning' ? '🟡' : '🔵';
  const lines = [`${icon} ${hit.msg}`];
  const why = _WHY_BY_CODE[hit.code];
  if (why) lines.push('', why);
  const d = hit.details;
  if (Array.isArray(d) && d.length) {
    lines.push('', `해당 ${hit.count ?? d.length}건`);
    d.slice(0, 12).forEach((x, i) => {
      if (typeof x === 'string') { lines.push(`${i + 1}. ${x}`); return; }
      const pos = x.bay ? ` @ ${x.bay}-${x.row}-${x.tier}` : '';
      const extra =
        (x.ediFe && x.lrFe) ? ` · EDI ${x.ediFe} / 리스트 ${x.lrFe}` :
        (x.ediIso && x.lrIso) ? ` · EDI ${x.ediIso} / 리스트 ${x.lrIso}` :
        (x.ediSl && x.lrSl) ? ` · EDI ${x.ediSl} / 리스트 ${x.lrSl}` :
        (x.iso ? ` · ${x.iso}` : '');
      lines.push(`${i + 1}. ${x.cn || x.location || ''}${pos}${extra}`);
    });
    if (d.length > 12) lines.push(`… 외 ${d.length - 12}건`);
  }
  return lines.join('\n');
}

// TallyOne 1.27: 시프팅 답변. ctx.shiftMap 은 VoyagePage 와 같은 값(확정 대조 우선, 없으면 예측).
function formatShifting(ctx) {
  const map = (ctx && ctx.shiftMap) || null;
  const cns = map ? Object.keys(map) : [];
  // 1.69-07: 판정 근거 한 줄 — 예측(_meta 있음)일 때만. 확정 대조 맵은 근거 표기 불필요.
  //   검수사 확정(2026-08-14, KKLC 인천 선행): 기항 순서를 모르면 모른다고 말한다.
  const meta = map && map._meta;
  const basis = !meta ? '' :
    (meta.rot === 'direct') ? `\n${meta.origin || '출항지'} 출항본 기준 — 다음 기항이 평택(EDI)이라 도착 전 하선 없음.` :
    (meta.excluded && meta.excluded.length) ? `\n평택 전 기항(${meta.excluded.join('·')}) 양하 ${meta.excludedCnt}대는 평택 도착 전에 내려 제외했습니다${meta.rot === 'edi' ? ' (다음 기항 EDI 실측)' : ' (항로 사전)'}.` :
    '\n⚠ 로테이션 미확인 — 평택 전 기항 양하분이 섞여 있을 수 있습니다.';
  if (!cns.length) {
    return '🔄 시프팅 0대\n홀드 양하분 위(커버 여는 현측)에 얹힌 통과화물이 없습니다.' + basis;
  }
  const posOf = (v) => {
    if (v && v.pos) return v.pos;                       // 예측값
    const p = String((v && v.from) || '');               // 확정 대조값
    return p.length >= 7 ? `${Number(p.slice(0, 3))}-${p.slice(3, 5)}-${p.slice(5, 7)}` : p;
  };
  const lines = [`🔄 시프팅 ${cns.length}대 (배정목록 표기로는 ${cns.length * 2} — 양하 1 + 재선적 1)`];
  const sorted = cns.slice().sort((a, b) => String(posOf(map[a])).localeCompare(String(posOf(map[b]))));
  for (const cn of sorted) {
    const v = map[cn] || {};
    const to = v.to ? ` → ${String(v.to).length >= 7 ? `${Number(String(v.to).slice(0, 3))}-${String(v.to).slice(3, 5)}-${String(v.to).slice(5, 7)}` : v.to}` : '';
    lines.push(`${cn.slice(-4)}  ${posOf(v)}${to}  ${v.iso || ''} ${v.pod ? 'POD ' + v.pod : ''}`.trimEnd());
  }
  lines.push('', '커버를 열려면 치워야 하는 통과화물입니다 — 평택 양하분은 세지 않습니다.');
  return lines.join('\n') + basis;
}

// TallyOne 1.50: "○○ 어디 갔어?" — 지나온 자리를 문장으로.
//   경로가 없으면(옛 컨) buildMovePath 가 orig·actual·현재 세 점으로 복원한다.
function formatMovePathAnswer(results, allContainers, ctx) {
  const pool = (results && results.length ? results : []);
  const cand = pool.filter(c => c && c.cn);
  if (!cand.length) return null;
  if (cand.length > 3) return null;                  // 너무 많으면 경로 답변이 아니다
  return cand.map(c => describeMovePath(c, !!c._comp)).join('\n\n');
}

/** 2.26-10 (검수사 확정 2026-08-24) — *«EDI 보충되면 자동으로 보이는거니 … 다만 누가 미르에게
 *  물으면 EDI가 도착하지 않아서 위치 조회가 안된다는 답은 해줘야 합니다»*
 *
 *  경보로 띄우는 것과 물었을 때 답하는 것은 다르다. 적부도가 늦는 것은 흔한 일이라 경보에서는
 *  뺐지만(diagnostics 2.26-10), **물었는데 빈칸만 주는 것**은 «앱이 모르는 건지 화물이 없는 건지»
 *  를 검수사가 알 수 없게 만든다.
 *  ⇒ 답을 내보내기 전에 한 번 본다. 화물은 있는데 **어느 것도 자리를 모르면** 적부도가 안 온 것이다.
 *  ⚠ 출구가 스무 곳이 넘어 각 자리에 붙이지 않는다 — 내보내는 문 하나를 감싼다. */
function _localAnswerCore(parsed, results, allContainers, ctx = null) {
  // 1.91: «미르야» 단독 호출 — 네, 하고 대답한다(검수사 확정).
  if (parsed.mirHello) return '네, 미르예요 🐱 무엇을 확인해 드릴까요?\n(예: "미르야 이번 선적 계획 어떻게 진행 될것 같아" · "리퍼 몇개" · "브리핑")';
  // ★★★ 2.57: 뜻을 물으면 뜻으로 답한다 — 화법 규칙 2 (검수사 확정 «답을 말하는 방법을 가르쳐 달라»).
  //   종전엔 이 본체에 뜻 분기가 0건이라, 뜻 답안지(mirKnowledge 240선·용어집)를 바깥 겹으로 단
  //   화면(통합검색·작업창)만 뜻이 나오고 양하·선적 탭은 «FR이 뭐야»에 위치를 답했다(검수사 실측).
  //   본체에 넣으면 세 화면이 자동으로 같은 답을 낸다 — 화법 규칙 4 «어디서 물어도 같은 답».
  if (parsed.asking === 'def') {
    let d = null;
    try { d = mirKnowledge(parsed._raw || ''); } catch (e) { console.warn('[2.57] 실무지식 답안지 실패:', e); }
    if (!d) { try { d = generateHowToAnswer(parsed._raw || '', parsed); } catch (e) { console.warn('[2.57] 용어집 답안지 실패:', e); } }
    if (d) {
      //  ★ 2.58 전문가 화법 — 정의에 «지금 이 화면 현황» 한 줄을 얹는다(검수사 «전문지식을 갖고 있는데
      //    초보티를 냅니다» — 전문가는 뜻을 답하며 지금 이 배 이야기로 잇는다). 데이터가 있을 때만 — 지어내지 않는다.
      if (parsed.type && Array.isArray(results) && results.length > 0) {
        const _lbl = ({ fr: 'FR', rf: '리퍼', dg: '위험물', ot: 'OT', tk: '탱크', xray: 'X-RAY', lolo: 'LOLO' })[parsed.type] || String(parsed.type).toUpperCase();
        d += `\n\n(지금 이 화면에 ${_lbl} ${results.length}대가 있습니다 — «${_lbl} 어디»라고 물으시면 자리를 불러드려요)`;
      }
      return d;
    }
    //  화법 규칙 6 — 모르면 모른다고 하고, 지어내지 않는다.
    return '그 말은 아직 못 배웠습니다 😿 지어내지 않을게요.\n뜻을 물으실 땐 «시프팅이 뭐야»처럼, 자리는 «FR 어디», 대수는 «리퍼 몇 대»처럼 말씀해 주시면 압니다.';
  }
  //  ★ 2.58: 방법을 물으면 방법으로 — 실무 지식(상황 문답) → 기능 방법(매뉴얼) → 못 찾으면 종전 경로.
  //  ★ 2.59-01: 답 한 벌을 answerHowCore 로 분리 — 통합검색(홈)도 같은 것을 부른다(화법 규칙 4).
  if (parsed.asking === 'how') {
    const h = answerHowCore(parsed);
    if (h) return h;
    //  방법을 못 찾으면 고백하지 않고 흘려보낸다 — 아래 조회 인텐트가 답할 기회를 남긴다.
  }
  if (!hasAnyCondition(parsed)) return null;
  const desc = describeQuery(parsed);

  // TallyOne 1.27: 시프팅 — 배정목록의 'N' 은 무브 수(양하 1 + 재선적 1)라 컨 대수의 2배다.
  // 2.05-01: 브리핑 후속 버튼 3종 — 수화물·긴급·데미지 (그 자리 즉답, 인라인 카드는 사진 썸네일 동반)
  if (parsed.luggQuery && !parsed.digits) {
    const lug = (allContainers || []).filter((c) => c.lugg);
    if (!lug.length) return '🧳 이 항차에 수화물 컨 등록이 없습니다 (선사 메일 기준)';
    const L = [`🧳 수화물 컨 ${lug.length}대 — 여객 수하물, **이적(시프팅) 대상이 아닙니다**`];
    lug.forEach((c) => L.push(`  ${c.cn} — ${fmtPos(c)}${c.luggSeal ? ` · 씰 ${c.luggSeal}` : ''}${c.fe ? ` [${c.fe}]` : ''}`));
    L.push('목록에서 보라 박스로 표시됩니다. 씰·컨번호 사진이 있으면 아래에 뜹니다.');
    return L.join('\n');
  }
  if (parsed.urgentQuery && !parsed.digits) {
    const urg = (allContainers || []).filter((c) => c.urgent);
    if (!urg.length) return '⚡ 이 항차에 긴급 하역 등록이 없습니다 (선사 메일·긴급 리스트 기준)';
    const L = [`⚡ 긴급 하역 ${urg.length}대 — 긴급블럭 최우선`];
    urg.forEach((c) => L.push(`  ${c.cn} — ${fmtPos(c)}${c.rf ? ' ❄' : ''}${c.fe ? ` [${c.fe}]` : ''}`));
    return L.join('\n');
  }
  if (parsed.dmgQuery && !parsed.digits) {
    const ph = ctx && ctx.photos ? Object.values(ctx.photos).filter((p) => p && p.type === 'damage' && p.cn) : [];
    if (!ph.length) return '📷 이 항차에 등록된 데미지가 없습니다 (앱 보고·예약 기준)';
    const byCn = new Map();
    const posOf = new Map((allContainers || []).map((c) => [String(c.cn || '').toUpperCase(), c]));
    ph.forEach((p) => { const C = String(p.cn).toUpperCase(); if (!byCn.has(C)) byCn.set(C, []); byCn.get(C).push(p); });
    const L = [`📷 데미지 등록 ${byCn.size}대 — 실물 확인하세요`];
    for (const [C, arr] of byCn) {
      const c = posOf.get(C);
      const kinds = [...new Set(arr.flatMap((p) => p.damageTypes || []))].join('·');
      L.push(`  ${C} — ${c ? fmtPos(c) : '위치 자료 대기'}${kinds ? ` · ${kinds}` : ''}${arr.some((p) => p.promotedFrom) ? ' (예약분)' : ''}`);
    }
    L.push('사진은 아래 썸네일(작업 탭은 끝4 조회 카드)에서 봅니다.');
    return L.join('\n');
  }
  // 1.89: 관련 선사·담당자 — 결과가 조건에 안 걸렸으면 항차 전체 기준.
  if (parsed.carrierQuery) return formatCarriers(results && results.length ? results : (allContainers || []), ctx);
  if (parsed.shiftingQuery) return formatShifting(ctx);


  // TallyOne 1.50: 경로 답변 — 컨을 특정할 수 있을 때만. 최우선(현재 위치 답보다 먼저).
  if (parsed.movePathQuery) {
    const ans = formatMovePathAnswer(results, allContainers, ctx);
    if (ans) return ans;
  }

  // V7.99-16: 양하신고 점검 — 그날 이상 건 정리. 최우선.
  if (parsed.customsReportQuery) {
    return formatCustomsReport(parsed, allContainers, ctx);
  }

  // V7.99-15: 완료 예정 시각 — 진행 페이스로 계산해 대화체로. progress보다 먼저.
  if (parsed.etaQuery) {
    return formatEta(parsed, allContainers, ctx);
  }

  // V7.99-10 (메모6 수동): 홀드/데크 개수 질문 2종.
  //   tierPlaceCountQuery = "홀드 몇 개 남았어" → 작업 남은 단이 몇 곳인지 + 베이 번호 한 번에.
  //   tierInContextQuery  = "홀드에 몇 개 남았어" → 현재 작업 중인(선택한) 단의 컨 수.
  if (parsed.tierPlaceCountQuery) {
    return formatTierPlaceCount(parsed.tierPlaceCountQuery, allContainers, ctx);
  }
  if (parsed.tierInContextQuery) {
    return formatTierInContext(parsed.tierInContextQuery, allContainers, ctx);
  }

  // M3.3 우선순위
  if (parsed.capacityQuery)  return formatCapacity(parsed, allContainers, ctx);
  if (parsed.vacantQuery)    return formatVacant(parsed, allContainers);
  if (parsed.bayBreakdown)   return formatBayBreakdown(parsed, allContainers);
  if (parsed.tierStackQuery) return formatStack(parsed, allContainers);
  if (parsed.progressQuery)  return formatProgress(parsed, results, allContainers, ctx);   // 2.55: 두 숫자(실제·앱)

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

  // V7.90-02: 베이 분포 — 명시 질문이거나, 위치 질문인데 결과가 많으면(개별 나열 무의미) 분포로
  if (parsed.bayDistQuery || (parsed.posQuery && results.length > 5)) return formatBayDist(desc, results, parsed);
  if (parsed.dupL4Query) return formatDupL4(desc, results);   // TallyOne 1.17: 중복 질문은 목록보다 먼저
  // 1.85-07 (검수사 확정 «양하는 볼수 있습니다. 선적은 작업시 볼수 없습니다. 그래서 전체 리스트를 보여 줘야 합니다»):
  //   LOLO 질의 — 양하는 덱플랜 지정(갠트리)만, **선적은 자리 지정이 없으므로 전체 리스트**가 곧 작업 대상.
  if (parsed.type === 'lolo' && ctx?.mode === 'loading') {
    const all = (allContainers || []).filter(c => (c._mode ? c._mode === 'loading' : true));
    if (!all.length) return '📭 선적 리스트가 아직 없습니다';
    return formatLocationList('LOLO 선적 — 자리 지정 없이 전체가 대상', all, parsed);
  }
  if (parsed.posQuery || parsed.listQuery) {
    // 1.85-05: «LOLO 리스트는?» — '리스트'가 listQuery 로 먼저 잡혀 0건이 «없음»으로만 나왔다. 사정을 말한다.
    if (parsed.type === 'lolo' && !results.length) return '🏗 갠트리(낙지) 지정 자료가 아직 없습니다 — 선사 덱플랜이 오면 대상이 여기 잡힙니다. 지금은 리스트 전체가 검수 대상입니다.';
    return splitByModeAnswer(results, parsed, (rs) => formatLocationList(desc, rs, parsed));
  }
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
  // 1.85-01 (검수사 확정 «브리핑 자료 답변 버튼은 컨번호나 실번호를 볼려고 하는것 보다 그것들의 정보를 보고자 함»):
  //   특수화물 타입(리퍼·X-RAY 포함)은 대수와 무관하게 **정보 답**을 낸다 — 종전엔 리퍼가 null 로 떨어져
  //   작업 카드(실번호·양하확인)가 떴다(검수사 실측). 다대는 베이 분포(온도·클래스 집계), ≤5 는 나열+컨별 상세.
  if (SPECIAL_TYPES.includes(parsed.type)) {
    if (!results.length) {
      // 1.85-05: 0건도 즉답 — 종전엔 null 로 떨어져 작업 카드가 떴다. LOLO 는 «지정 자료 미도착»을 구분해 말한다.
      if (parsed.type === 'lolo') return '🏗 갠트리(낙지) 지정 자료가 아직 없습니다 — 선사 덱플랜이 오면 대상이 여기 잡힙니다. 지금은 리스트 전체가 검수 대상입니다.';
      return `📭 ${desc} 없음`;
    }
    const _sp = splitByModeAnswer(results, parsed,
      (rs) => (rs.length > 5 ? formatBayDist(desc, rs, parsed) : formatLocationList(desc, rs, parsed)));
    //  ★ 2.57 화법 규칙 3 — 갈래 표시 없는 특수화물 한 낱말(«FR»)은 요약이 나간다. 전체가 필요하면
    //    «목록» 한 마디면 된다(listQuery 가 이미 «목록»을 알아듣는다 — 상태 저장 없이 후속이 선다).
    if (_sp && results.length > 5 && !parsed.listQuery && !parsed.posQuery && !parsed.bayDistQuery && !parsed.isStat) {
      return _sp + '\n\n(전체 목록이 필요하면 «' + String(parsed.type || '').toUpperCase() + ' 목록» 이라고 말씀해 주세요)';
    }
    return _sp;
  }
  if (hasStrong && results.length >= 2) return formatLocationList(desc, results, parsed);

  return null;
}

// ─── 헬퍼 함수들 ───

// V7.99-10 (메모6 수동): "홀드 몇 개 남았어" — 작업 남은 단(홀드/데크)이 몇 곳인지 + 베이 번호 한 번에.
//   되묻지 않게 곳수와 베이를 같이: "4, 12, 20 3곳입니다".
function formatTierPlaceCount(tier, allContainers, ctx) {
  const mode = ctx?.mode || 'discharge';
  const bayPairs = ctx?.bayPairs || {};
  const groupCenterOf = (bayStr) => {
    const b = parseInt(bayStr, 10);
    if (!Number.isFinite(b)) return null;
    if (b % 2 === 0) return b;
    const p = bayPairs?.[String(b)];
    if (p) return (b + parseInt(p, 10)) / 2;
    return b;
  };
  const isDeck = (c) => parseInt(c.tier, 10) >= 80;
  const isPtk = (c) => mode === 'discharge' ? isPyeongtaekPort(c.pod) : isPyeongtaekPort(c.pol);
  // 작업 남은(미완료·평택분) 컨 중 해당 단에 있는 것 → 그룹(center)별로 모음
  const centers = new Set();
  allContainers.forEach(c => {
    if (!isPtk(c) || c._comp) return;
    if (tier === 'deck' ? !isDeck(c) : isDeck(c)) return;
    const ctr = groupCenterOf(c.bay);
    if (ctr != null) centers.add(ctr);
  });
  const label = tier === 'deck' ? '데크' : '홀드';
  const sorted = [...centers].sort((a, b) => a - b);
  if (sorted.length === 0) return `작업할 ${label}가 남지 않았습니다.`;
  const bayList = sorted.map(c => String(c)).join(', ');
  return `${bayList} ${sorted.length}곳입니다.`;
}

// V7.99-10 (메모6 수동): "홀드에 몇 개 남았어" — 현재 작업 중인(선택한) 단의 남은 컨 수.
//   ctx.selectedGroup·selectedTier 없으면 어느 단인지 안내.
function formatTierInContext(tier, allContainers, ctx) {
  const label = tier === 'deck' ? '데크' : '홀드';
  if (ctx?.selectedGroup == null) {
    return `먼저 작업할 베이와 ${label}를 선택하세요. 그러면 그 ${label}에 남은 개수를 알려드립니다.`;
  }
  const mode = ctx?.mode || 'discharge';
  const bayPairs = ctx?.bayPairs || {};
  const selectedGroup = ctx.selectedGroup;
  const groupCenterOf = (bayStr) => {
    const b = parseInt(bayStr, 10);
    if (!Number.isFinite(b)) return null;
    if (b % 2 === 0) return b;
    const p = bayPairs?.[String(b)];
    if (p) return (b + parseInt(p, 10)) / 2;
    return b;
  };
  const isDeck = (c) => parseInt(c.tier, 10) >= 80;
  const isPtk = (c) => mode === 'discharge' ? isPyeongtaekPort(c.pod) : isPyeongtaekPort(c.pol);
  const remain = allContainers.filter(c =>
    isPtk(c) && !c._comp && groupCenterOf(c.bay) === selectedGroup &&
    (tier === 'deck' ? isDeck(c) : !isDeck(c))
  );
  // 베이 라벨
  const bays = [...new Set(remain.map(c => parseInt(c.bay, 10)))].sort((a, b) => a - b);
  const bayLbl = bays.length ? bays.join('·') + '번' : String(selectedGroup) + '번';
  return `${bayLbl} ${label}에 ${remain.length}개 남았습니다.`;
}

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

// V7.90-02: 베이 분포 답변 — "리퍼가 몇 번 베이에 있어?" 첫 줄은 음성으로 읽히므로 베이 나열.
// 2.06-05 (검수사 메모 «브리핑에서 실오류 내용이 없던데 모르는 대답을 하네요?»): auditSeals 는
//   형식 점검(중복·혼입·자리수)만 보고 **실오류(sl_history 수정 기록)·실번호 불일치(sl_conflict)** 를
//   안 봤다 — 불일치가 있어도 «이상 없음»이라 답하던 원인. ContainerList(1.8-03·2.05-06)와 같은 판정.
// 2.06-06 (검수사 확정 «리스트끼리 다름이면 혼동 — 리스트의 출처도 알려줘야 합니다. 신고리스트와 틀리면
//   실오류, 선사리스트끼리 틀리고 신고리스트와 맞는게 있다면 관심 대상»): 불일치는 출처와 등급으로 말한다.
//   신고리스트(세관) 식별은 파일명 — 적하목록·CDL·세관·MANIFEST·신고 (STMJ 2643E 실증: 세관 CDL 도 리스트로 업로드됨).
// 2.06-08 (검수사 확정 «Excel_YYYYMMDDHHMMSS.xls 이것이 세관리스트 입니다. 파일명 형식과 내용을 보면
//   일관될것입니다» — 실측: 2719E·8/1자 두 파일 모두 헤더 MSN·M-B/L·화물구분·Seal No 1/2/3 동일):
//   세관 조회본 파일명 패턴 `Excel_숫자14자리`도 세관리스트로 인식한다.
const _isCustomsSrc = (src) => /적하\s*목록|적하|세관|CDL|MANIFEST|신고|^Excel_\d{14}/i.test(String(src || '').trim());
// 2.06-06 (검수사 최종 단순화 «세관리스트와 다르면 실오류 의심으로 표기. 자료중 세관리스트가 빠진 선박은
//   세관리스트를 첨부해 주세요 라고 알림»): 판정은 두 가지뿐 —
//   suspect = 선사 값이 세관(신고)값과 다름 → 실오류 의심
//   pending = 선사 리스트끼리 다른데 세관리스트가 아직 없음 → 세관리스트 도착 시 판정
//   그리고 «선사 자료 부족을 세관리스트로 보충한 컨(선사 값 없음)»은 비교 제외 — 어차피 세관자료(검수사 확정).
//   hasCustoms: 이 항차 자료에 세관리스트가 하나라도 있는가 — 없으면 첨부 요청 알림을 띄운다.
export function sealIssuesOf(containers) {
  const errs = [], confs = [];
  let hasCustoms = false;
  for (const c of containers || []) {
    if (_isCustomsSrc(c._source) || _isCustomsSrc(c.sl_src)) hasCustoms = true;   // 2.06-11: 채택 씰 출처(sl_src)도 근거 — 세관 올린 뒤 선사 리스트가 _source 를 덮어도 유지
    const hist = Array.isArray(c.sl_conflict) ? c.sl_conflict : [];
    if (hist.some((h) => _isCustomsSrc(h.src))) hasCustoms = true;
    const slOrig = c.sl_orig != null ? c.sl_orig : c.sl;
    if (Array.isArray(c.sl_history) && c.sl_history.length > 0 && c.sl && slOrig && c.sl !== slOrig) {
      errs.push({ cn: c.cn, from: slOrig, to: c.sl }); continue;
    }
    const seen = new Map();   // 값 → 출처들 (값은 문자 그대로 — 정규화 금지)
    for (const h of hist) {
      const v = String(h.sl || '').trim().toUpperCase();
      if (!v) continue;
      if (!seen.has(v)) seen.set(v, []);
      const src = String(h.src || '').trim();
      if (src && !seen.get(v).includes(src)) seen.get(v).push(src);
    }
    if (seen.size < 2) continue;
    const entries = [...seen.entries()].map(([v, srcs]) => ({ v, srcs,
      customs: srcs.some(_isCustomsSrc),
      carrier: srcs.length === 0 || srcs.some(x => !_isCustomsSrc(x)) }));
    const carrierVals = entries.filter(e => e.carrier);
    const customsVals = entries.filter(e => e.customs);
    if (!carrierVals.length) continue;   // 세관자료로 보충된 값뿐 — 비교 대상 아님
    if (customsVals.length) {
      if (carrierVals.some(e => customsVals.every(cv => cv.v !== e.v)))
        confs.push({ cn: c.cn, vals: entries.map(e => e.v), entries, grade: 'suspect', note: '세관리스트와 다름 — 실오류 의심' });
      // 선사 값이 전부 세관값과 일치하면 문제 없음 — 표기 안 함
    } else {
      confs.push({ cn: c.cn, vals: entries.map(e => e.v), entries, grade: 'pending', note: '선사 리스트끼리 다름 — 세관리스트 도착 시 판정' });
    }
  }
  return { errs, confs, hasCustoms };
}

// V7.90-05: 실번호 점검 전용 답변 ("실번호 점검" 질문)
export function generateSealAuditAnswer(containers, modeLabel) {
  const audit = auditSeals(containers || []);
  const { errs, confs, hasCustoms } = sealIssuesOf(containers);   // 2.06-05·06: 실오류·불일치 합류(세관 기준)
  if (!audit.checked && !errs.length && !confs.length) return `📭 ${modeLabel} — 점검할 실번호 데이터가 없습니다 (양하리스트 업로드 필요)`;
  if (!audit.items.length && !errs.length && !confs.length) return `✅ ${modeLabel} 실번호 점검 — ${audit.checked}건 모두 이상 없음 (실오류·불일치 기록도 없음)`;
  const lines = [`🔍 ${modeLabel} 실번호 주의 ${audit.items.length + errs.length + confs.length}건 (점검 ${audit.checked}건 중)`];
  for (const e of errs) lines.push(`• ${e.cn} — ⚠ 실오류: 리스트 「${e.from}」 → 실물 「${e.to}」 (세관 신고 사안)`);
  for (const f of confs) {
    const det = (f.entries || []).map(e => `「${e.v}」(${e.srcs.length ? e.srcs.join('·') : '출처 미기록'}${e.customs ? ' — 세관리스트' : ''})`).join(' ↔ ');
    const mark = f.grade === 'suspect' ? '🔴 실오류 의심' : '⚠ 불일치';
    lines.push(`• ${f.cn} — ${mark}: ${det}\n    ${f.note}`);
  }
  if (!hasCustoms && confs.length) lines.push('📋 이 항차 자료에 세관리스트가 없습니다 — **세관리스트를 첨부해 주세요.** 실오류 판정은 세관리스트 기준입니다.');
  for (const it of audit.items) lines.push(`• ${it.cn} 「${it.seal}」 — ${it.reason}`);
  return lines.join('\n');
}

// V7.90-05: 실번호(씰) 오류 사전 점검 (사용자 요청 — 리스트 단계에서 미리 잡기)
//   ① 중복: 다른 컨테이너인데 같은 실번호  ② 혼입: 실번호 칸에 컨테이너 번호
//   ③ 형식 특이: 특수문자·비정상 짧음  ④ 자리수 부족: 같은 접두 그룹의 다수 길이보다 짧음(엑셀 0 잘림 등)
export function auditSeals(containers) {
  const items = [];   // {cn, seal, field, reason}
  const norm = (s) => String(s || '').toUpperCase().replace(/[\s\-]/g, '');
  const entries = [];
  for (const c of containers || []) {
    for (const [field, label] of [['sl', '풀씰'], ['eseal', '엠티실']]) {
      const raw = c[field];
      if (raw == null || String(raw).trim() === '') continue;
      entries.push({ c, field: label, raw: String(raw).trim(), n: norm(raw) });
    }
  }
  if (!entries.length) return { items, checked: 0 };
  // ① 중복 (같은 정규화 씰, 서로 다른 컨)
  //   1.76-05: 판정을 utils.dupSealMap 한 벌로 모았다 — 목록 배지·가이드 카드·이 답변이 같은 것을 본다.
  //   ⚠ 종전 이 자리의 자체 구현은 '0000'(실 부족 표기)을 중복으로 셌다. dupSealMap 은 제외한다
  //     (손입력 차단 dupSealOwner 가 처음부터 제외해 온 규칙 — 두 기준이 갈려 있던 것을 맞춘다).
  const rawOf = {};
  for (const e of entries) if (!rawOf[e.n]) rawOf[e.n] = e.raw;
  for (const [n, cns] of dupSealMap(containers || [])) {
    items.push({ cn: cns.map(x => (x || '').slice(-4)).join('·'), seal: rawOf[n] || n, reason: `같은 실번호가 ${cns.length}개 컨테이너에 — 서로 바뀌어 있을 가능성, 양쪽 모두 실물 확인` });
  }
  // ②③④ 개별 점검
  const allCns = new Set((containers || []).map(c => norm(c.cn)).filter(Boolean));
  // 1.85-04 (검수사 실측 — SDYT079831·YTZL2458967 등 9건 오탐): 4문자+숫자는 **실 브랜드**(SDYT·YTZL·BHGJ…)에도
  //   흔한 형식이다. «일반적인 것에서 벗어난 것»만 올린다(검수사 원칙) —
  //   ① 같은 접두 실이 그 배에 3개 이상이면 그 배의 실 형식으로 인정(통과)
  //   ② 접두가 그 항차 컨테이너 소유코드(컨번호 앞 4자)와 일치할 때만 컨번호 혼입 의심
  //   ③ 이 항차 컨번호와 정확히 같으면 무조건 의심
  const ownerCodes = new Set([...allCns].map(cn => cn.slice(0, 4)));
  const prefCnt = {};
  for (const e of entries) {
    const m4 = e.n.match(/^([A-Z]{4})\d+$/);
    if (m4) prefCnt[m4[1]] = (prefCnt[m4[1]] || 0) + 1;
  }
  const seen = new Set();
  for (const e of entries) {
    const key = (e.c.cn || '') + '|' + e.n;
    if (seen.has(key)) continue; seen.add(key);
    const last4 = (e.c.cn || '').slice(-4);
    // ② 컨번호 혼입 — 1.85-04: 형식만으로 판정하지 않는다
    if (/^[A-Z]{4}\d{6,7}$/.test(e.n)) {
      const pre = e.n.slice(0, 4);
      if (allCns.has(e.n)) {
        items.push({ cn: last4, seal: e.raw, reason: `${e.field}이 이 항차 컨테이너 번호(${e.n.slice(-4)})와 동일` }); continue;
      }
      if (ownerCodes.has(pre) && (prefCnt[pre] || 0) < 3) {
        items.push({ cn: last4, seal: e.raw, reason: `${e.field}이 컨테이너 번호 형식(${pre} — 이 배 컨 소유코드)` }); continue;
      }
      // 실 브랜드(같은 접두 다수 또는 소유코드 아님) — 정상 통과
    }
    const cnDigits = norm(e.c.cn).slice(4);
    if (cnDigits.length >= 6 && e.n.includes(cnDigits)) {
      items.push({ cn: last4, seal: e.raw, reason: `${e.field}에 자기 컨번호 숫자 포함` }); continue;
    }
    let hit = null;
    if (e.n.length >= 10) { for (const cn of allCns) { if (cn && e.n.includes(cn)) { hit = cn; break; } } }
    if (hit) { items.push({ cn: last4, seal: e.raw, reason: `${e.field}에 컨테이너 번호(${hit.slice(-4)}) 포함` }); continue; }
    // ③ 형식 특이 — 1.85-03 (검수사 확정): **자릿수 판정 전면 제거.** «실번호4자리 인 경우도 있습니다.
    //   알림은 자릿수 기준이 아니라 일반적인것에서 벗어난것» — 종전 절대 자릿수(<4)·그룹 최빈 길이 비교가
    //   4자리 실번호 등 정상 실을 의심으로 올렸다(RZOR 실측 «실번호 의심 9건» 오탐).
    if (/[^A-Z0-9]/.test(e.n)) { items.push({ cn: last4, seal: e.raw, reason: `${e.field}에 특수문자` }); continue; }
  }
  // ⑤ 1.85-03 (검수사 확정): **풀(F)인데 실번호가 없는 것** — 실을 주는 배(실이 하나라도 있는 항차)에서만.
  const noSeal = (containers || []).filter(c =>
    c.fe === 'F' && (c.sl == null || String(c.sl).trim() === '') && c.cn);
  if (noSeal.length && noSeal.length <= (containers || []).length * 0.5) {   // 절반 넘게 없으면 자료 자체가 무실 — 오탐 방지
    for (const c of noSeal.slice(0, 15)) {
      items.push({ cn: (c.cn || '').slice(-4), seal: '(없음)', reason: '풀(F)인데 실번호 없음 — 실물 확인' });
    }
    if (noSeal.length > 15) items.push({ cn: `외 ${noSeal.length - 15}대`, seal: '(없음)', reason: '풀(F)인데 실번호 없음' });
  }
  return { items, checked: entries.length };
}

// V7.90-04: 작업 브리핑 (사용자 요청) — 검수 시작·중간에 현재 작업 핵심을 한눈에.
//   첫 줄은 음성으로 읽히는 한 문장 요약. 이후 화면용 상세.
export function generateBriefing(containers, modeLabel, mode = 'discharge', pairsMap = null, pier = '', opts = null) {   // V7.93: pairsMap·pier — 트윈 무게 예견 · 1.86: opts.rfSkip(머스크류 — 리퍼 체크 안 함)
  // V7.90-07 재구성 (사용자 피드백): ① 평택분(작업 대상)만 집계 — 통과화물 포함 금지(7.1)
  //   ② 일반 통계 나열 대신 "검수원이 인지해야 할 특이사항" 중심, 행동 지향 문구.
  let all = containers || [];
  //  2.55: 항차 화면은 완료를 `opts.compMap` 으로 따로 넘긴다(generateLocalAnswer 와 같은 구멍) —
  //  안 입히면 브리핑 진행 줄이 «완료 0» 이 된다.
  if (opts && opts.compMap && all.length && !all.some((c) => c && c._comp)) {
    all = all.map((c) => (c && !c._comp && opts.compMap[c.cn] ? { ...c, _comp: opts.compMap[c.cn] } : c));
  }
  const isPtk = (c) => mode === 'discharge' ? isPyeongtaekPort(c.pod) : isPyeongtaekPort(c.pol);
  const cs = all.filter(isPtk);
  const transit = all.filter(c => !isPtk(c));
  if (!cs.length) return `📋 ${modeLabel} 브리핑 — 평택분 컨테이너가 없습니다`;
  const szOf = (c) => {
    const lbl = isoToLabel(c.iso) || '';
    if (/^45/.test(lbl)) return '45'; if (/^40/.test(lbl)) return '40'; if (/^20/.test(lbl)) return '20';
    const f = (c.iso || '')[0];
    return f === '2' ? '20' : f === '4' ? '40' : (f === 'L' || f === '9') ? '45' : '?';
  };
  const total = cs.length;
  const done = cs.filter(c => c._comp).length;
  const sz = {}; let F = 0, E = 0, deck = 0, hold = 0;
  const rf = [], dg = [], xr = [], fr = [], ot = [], tk = [], oog = [], noTmp = [];
  const bays = new Set();
  for (const c of cs) {
    const s = szOf(c); sz[s] = (sz[s] || 0) + 1;
    if (c.fe === 'E') E++; else F++;
    const b = parseInt(c.bay, 10); if (Number.isFinite(b)) bays.add(b);
    const t = parseInt(c.tier, 10);
    if (Number.isFinite(t)) { if (t >= 80) deck++; else hold++; }
    if (isReeferContainer(c) && c.fe !== 'E') { rf.push(c); if (!c.rfdry && !c.mkcon && (c.tmp == null || String(c.tmp).trim() === '')) noTmp.push(c); }   // 1.86: 리퍼 전면 표시는 풀만(검수사 확정)
    if (c.dg) dg.push(c);
    if (c._xray) xr.push(c);
    if (c.fr || /FR$/.test(isoToLabel(c.iso) || '')) fr.push(c);
    if (c.ot || /OT$/.test(isoToLabel(c.iso) || '')) ot.push(c);
    if (c.tk || /TK$/.test(isoToLabel(c.iso) || '')) tk.push(c);
    if (c.oog) oog.push(c);
  }
  const bayArr = [...bays].sort((a, b) => a - b);
  const baysOf = (arr) => {
    const bs = [...new Set(arr.map(c => parseInt(c.bay, 10)).filter(Number.isFinite))].sort((a, b) => a - b);
    return bs.length ? `베이 ${bs.join(', ')}` : '';
  };
  // ── 주의사항 수집 (일반적이지 않은 것만)
  const warns = [];
  // 2.05-01 (검수사 확정 «이번 브리핑이 중요합니다. 아까 데미지 이슈부터 FR 수화물을 몰라서 이적으로
  //   인식할수도 있었습니다») — 수화물·긴급·사전 데미지를 브리핑 맨 앞 주의로.
  const _lug = cs.filter((c) => c.lugg);
  if (_lug.length) {
    warns.push({ k: `수화물 ${_lug.length}`, line: `🧳 수화물 컨 ${_lug.length}대 — ${_lug.map((c) => `${c.cn}${c.luggSeal ? `(씰 ${c.luggSeal})` : ''}`).join(', ')}\n     여객 수하물입니다 — **이적(시프팅) 대상이 아닙니다.** 목록에 보라 박스로 표시됩니다` });
  }
  const _urg = cs.filter((c) => c.urgent);
  if (_urg.length) {
    warns.push({ k: `긴급 ${_urg.length}`, line: `⚡ 긴급 하역 ${_urg.length}대 — 긴급블럭 최우선 (${baysOf(_urg) || '위치 자료 대기'}) · 목록은 «긴급» 조회` });
  }
  if (opts?.photos) {
    try {
      const _cns = new Set(cs.map((c) => String(c.cn || '').toUpperCase()));
      const _dmg = [...new Set(Object.values(opts.photos).filter((p) => p && p.type === 'damage' && _cns.has(String(p.cn || '').toUpperCase())).map((p) => String(p.cn).toUpperCase()))];
      if (_dmg.length) warns.push({ k: `데미지 ${_dmg.length}`, line: `📷 데미지 등록 ${_dmg.length}대 — ${_dmg.join(', ')} · 실물 확인, 끝4 조회로 사진 확인` });
    } catch (e) { /* 사진 집계 실패는 브리핑을 막지 않는다 */ }
  }
  // 1.87 (검수사 확정 — ATPR·WEIHAI): 엠티실 부착 배는 브리핑에 부착 대상 베이별·규격별 분포와 실 현황을 붙인다.
  //   «그부분도 베이별 규격별 설명도 첨부 … 엠티실 갯수도 알려줘야»
  if (opts?.eseal && opts.eseal.n > 0) {
    const es = opts.eseal;
    const bl = Object.keys(es.byBay || {}).filter(k => k !== '?').map(Number).sort((a, b) => a - b)
      .map(b => { const v = es.byBay[b]; const p = [v.s20 ? `20×${v.s20}` : null, v.s40 ? `40×${v.s40}` : null].filter(Boolean).join(' '); return `${b}(${p})`; });
    const blTxt = bl.length > 10 ? bl.slice(0, 10).join(' · ') + ` 외 ${bl.length - 10}베이` : bl.join(' · ');
    let tail;
    if (es.ranges && es.ranges.length) {
      tail = `실 ${es.ranges.map(r => `${r.from}~${r.to}`).join(' · ')} — 배정 ${es.poolN} · 부착 ${es.usedN} · 잔여 ${es.remainN}`;
    } else {
      tail = '⚠ 실 범위 미입력 — 선적 목록 화면의 🔖 카드에 «몇 번부터 몇 번까지» 넣어 주세요';
    }
    warns.push({ k: `엠티실 ${es.n}`, line: `🔖 엠티실 부착 ${es.n}대 — 베이 ${blTxt}\n     ${tail}` });
  }
  // 1.86 (검수사 확정): rfSkip 배(머스크류 — 리퍼 다수)는 리퍼 주의 줄 자체를 생략 — «리퍼 체크를 하지 않습니다».
  if (rf.length && !opts?.rfSkip) {
    const tail = noTmp.length ? ` · ⚠ 온도 미입력 ${noTmp.length}대 — 조회 시 온도 입력` : ' — 조회 시 온도 확인';
    warns.push({ k: `리퍼 ${rf.length}`, line: `❄ 리퍼 ${rf.length}대 (${baysOf(rf)})${tail}` });
  }
  if (dg.length) {
    const cls = {};
    for (const c of dg) { const cl = c.dgc || '?'; (cls[cl] = cls[cl] || []).push(parseInt(c.bay, 10)); }
    const detail = Object.keys(cls).sort().map(cl => `cl.${cl} 베이${[...new Set(cls[cl])].filter(Number.isFinite).sort((a,b)=>a-b).join('·')}`).join(' / ');
    warns.push({ k: `위험물 ${dg.length}`, line: `☣ 위험물 ${dg.length}대 — ${detail} — 별도 취급` });
  }
  if (xr.length && mode === 'discharge') {
    warns.push({ k: `엑스레이 ${xr.length}`, line: `🩻 X-RAY 대상 ${xr.length}대 (${baysOf(xr)}) — ${xr.slice(0, 8).map(c => c.cn?.slice(-4)).join(', ')} — 양하 후 별도 처리` });
  }
  if (fr.length) warns.push({ k: `FR ${fr.length}`, line: `⊞ FR ${fr.length}대 (${baysOf(fr)}) — 치수·고박 확인` });
  if (ot.length) warns.push({ k: `OT ${ot.length}`, line: `△ O/T ${ot.length}대 (${baysOf(ot)}) — 상부 확인` });
  if (tk.length) warns.push({ k: `탱크 ${tk.length}`, line: `🛢 탱크 ${tk.length}대 (${baysOf(tk)})` });
  if (oog.length) warns.push({ k: `OOG ${oog.length}`, line: `📐 OOG ${oog.length}대 (${baysOf(oog)}) — 규격 외 치수 확인` });
  // V7.93: 트윈 무게 예견 — 합계 55톤 초과(불가)·무게 불균형(수평 주의). pairsMap 있을 때만.
  if (pairsMap) {
    const limit = twinDiffLimit(pier);
    const tw = analyzeTwinPairs(buildTwinPairs(cs, pairsMap), limit);
    const posOf = (arr) => arr.slice(0, 6).map(p => `${fmtPos(p.a)}↔${fmtPos(p.b)}`).join(', ') + (arr.length > 6 ? ' 외' : '');
    if (tw.over.length) warns.push({ k: `트윈초과 ${tw.over.length}`, line: `🏗 트윈 무게 초과 ${tw.over.length}쌍 (합계 55톤↑): ${posOf(tw.over)} — 트윈 불가, 싱글 작업 검토` });
    if (tw.diff.length) warns.push({ k: `트윈무게차 ${tw.diff.length}`, line: `⚖ 트윈 무게차 초과 ${tw.diff.length}쌍 (한계 ${(limit / 1000)}톤↑): ${posOf(tw.diff)} — 수평 불가, 싱글 작업 검토` });
  }
  const audit = auditSeals(cs);
  // 2.06-05: 실오류(수정 기록)·실번호 불일치(sl_conflict)도 브리핑에 — 검수사 «브리핑에서 실오류 내용이 없던데»
  const _si = sealIssuesOf(cs);
  if (_si.errs.length || _si.confs.length) {
    // 2.06-06 (검수사 단순화): 세관리스트와 다름=실오류 의심 / 세관리스트 없으면 도착 시 판정
    const _cs2 = _si.confs.filter(f => f.grade === 'suspect'), _cp = _si.confs.filter(f => f.grade === 'pending');
    const parts = [];
    if (_si.errs.length) parts.push(`실오류(현장 수정) ${_si.errs.length}건(${_si.errs.slice(0, 3).map(e => e.cn?.slice(-4)).join(', ')})`);
    if (_cs2.length) parts.push(`🔴 실오류 의심(세관리스트와 다름) ${_cs2.length}건(${_cs2.slice(0, 3).map(f => f.cn?.slice(-4)).join(', ')})`);
    if (_cp.length) parts.push(`선사 리스트끼리 다름 ${_cp.length}건(${_cp.slice(0, 3).map(f => f.cn?.slice(-4)).join(', ')}) — 세관리스트 도착 시 판정`);
    warns.push({ k: `실번호 ${_si.errs.length + _si.confs.length}건`, line: `⚠ ${parts.join(' · ')} — "실번호 점검"으로 출처까지 상세 확인` });
  }
  if (!_si.hasCustoms && _si.confs.length) {
    warns.push({ k: null, line: `📋 이 항차 자료에 세관리스트가 없습니다 — **세관리스트를 첨부해 주세요.** 실오류 판정은 세관리스트 기준입니다.` });
  }
  if (audit.items.length) {
    const kinds = [...new Set(audit.items.map(it => it.reason.split(' — ')[0].replace(/^(풀씰|엠티실)\s*/, '')))].slice(0, 2).join(', ');
    warns.push({ k: `실번호 ${audit.items.length}건`, line: `🔍 실번호 의심 ${audit.items.length}건 (${kinds}${audit.items.length > 2 ? ' 등' : ''}) — "실번호 점검"으로 상세 확인` });
  }
  if (transit.length) {
    const tb = [...new Set(transit.map(c => parseInt(c.bay, 10)).filter(b => Number.isFinite(b) && bays.has(b)))].sort((a, b) => a - b);
    if (tb.length) warns.push({ k: null, line: `🔁 통과화물이 작업 베이(${tb.join(', ')})에 혼재 — ${mode === 'discharge' ? '내리지 말 것' : '자리 주의'}` });
  }
  // V8.06-02: LOLO 선박(베이 없는 IFCSUM) 리스트 검증 — 작업 시작 전 확인 메시지.
  //   추측·자동변환 대신 검수사가 현장에서 직접 확인하도록 브리핑에 띄운다(사용자 원칙: 데이터·사람이 확정).
  const isLoloBrief = cs.length > 0 && cs.every(c => !c.bay && !c.row && !c.tier);
  if (isLoloBrief) {
    // ① 45HC 규격 확인 — 45HC는 진짜 45피트(L5)이나 표기/해석이 40HC로 흔들릴 수 있음.
    const hc45 = cs.filter(c => {
      const e = String(c.ediIso || '').toUpperCase();
      const lbl = isoToLabel(c.iso) || '';
      return e === '45HC' || /^45/.test(lbl);
    });
    if (hc45.length) {
      // V8.07: 부드러운 음성 안내 — 컨번호 끝4자리를 한 글자씩(공백 구분) 읽도록.
      const cnList = hc45.map(c => (c.cn || '').slice(-4).split('').join(' ')).join(', ');
      warns.push({ k: `45피트 ${hc45.length}`, line: `📏 45피트가 ${hc45.length}대 실려 있습니다. 컨넘버 ${cnList} 규격을 확인해 주세요.` });
    }
    // ② 실번호 형식 비정상 — 여러 실번호 연결/과다 길이(컨테이너 화물 등). 매칭 시 주의.
    const weirdSeal = cs.filter(c => c.fe !== 'E' && c.sl && c.sl.replace(/\s/g, '').length > 15);
    if (weirdSeal.length) {
      const cnList = weirdSeal.slice(0, 4).map(c => (c.cn || '').slice(-4).split('').join(' ')).join(', ');
      warns.push({ k: `실번호확인 ${weirdSeal.length}`, line: `🔖 실번호가 특이한 컨테이너가 ${weirdSeal.length}대 있습니다. 컨넘버 ${cnList} 세관 리스트와 대조해 주세요.` });
    }
  }
  // ── 음성 첫 줄: 평택분 + 주의 핵심
  const keyWarns = warns.filter(w => w.k).map(w => w.k).slice(0, 3);
  const head = `📋 ${modeLabel} 평택 ${total}대` +
    (warns.length ? ` — 주의 ${warns.length}건${keyWarns.length ? ' (' + keyWarns.join(', ') + ')' : ''}` : ' — 특이사항 없음') +
    (done > 0 ? `, 잔여 ${total - done}` : '');
  const szStr = ['20', '40', '45'].filter(s => sz[s]).map(s => `${s}ft ${sz[s]}`).join(', ');
  const lines = [head];
  // V8.06-02: LOLO 선박(베이 없음)은 베이/갑판/홀드 표기 생략 — undefined·0 표시 방지.
  if (isLoloBrief) {
    lines.push(`📌 작업: ${total}대 (Full ${F} / Empty ${E} · ${szStr}) · LOLO(리스트 검수)`);
  } else {
    lines.push(`📌 작업: ${total}대 (Full ${F} / Empty ${E} · ${szStr}) · 베이 ${bayArr[0]}~${bayArr[bayArr.length - 1]} (${bayArr.length}개) · 갑판 ${deck} / 홀드 ${hold}`);
  }
  // ★ 2.55: 브리핑의 진행 줄도 **두 숫자**다(검수사 확정). 대수를 내는 곳이 화면마다 다른 수를 내면
  //   검수사가 어느 것을 믿을지 판단해야 한다 — 이 저장소가 무게·완료판정에서 이미 겪은 병이다.
  const _bBrief = (opts && opts.tw) ? bothCounts(cs.map((c) => ({ ...c, _mode: mode, _ptk: true })), { tw: opts.tw }, mode) : null;
  if (_bBrief && _bBrief.length) { lines.push('📈 진행 — 두 가지'); _bBrief.forEach((x) => lines.push('  ' + x)); }
  else if (done > 0) lines.push(`📈 진행: 완료 ${done} / 잔여 ${total - done} (${Math.round(done / total * 100)}%)`);
  if (warns.length) {
    lines.push(`⚠ 주의사항`);
    for (const w of warns) lines.push(`  ${w.line}`);
    // 2.05-02 (검수사 확정 «브리핑 후 추가 자료가 있는 항목은 버튼을 만들어 보여주는 방식으로»):
    //   주의로 뜬 항목 전부를 기존 규격("라벨"로 상세 확인 — 1.84-03 렌더러가 자동 버튼화)으로 심는다.
    //   warns.k 의 첫 단어 → 조회 가능한 라벨 매핑. 새 warn 을 추가하면 여기 매핑도 한 줄 넣는다(같은 파일).
    const BTN_Q = { '리퍼': '리퍼', '위험물': '위험물', '엑스레이': '엑스레이', 'FR': 'FR', 'OT': 'OT', '탱크': '탱크', 'OOG': 'OOG',
      '데미지': '데미지', '수화물': '수화물', '긴급': '긴급', '45피트': '45피트',
      '트윈초과': '트윈 점검', '트윈무게차': '트윈 점검', '실번호': '실번호 점검', '실번호확인': '실번호 점검' };
    const _btns = [...new Set(warns.map((w) => BTN_Q[String(w.k || '').split(' ')[0]]).filter(Boolean))];
    if (_btns.length) lines.push('', _btns.map((q) => `"${q}"로 상세 확인`).join(' · '));
  } else {
    lines.push(`✅ 특이사항 없음 — 일반 화물만`);
  }
  return lines.join('\n');
}

// V7.90-03: 베이 분포 상세 확장 (사용자 요청 — 검수 실무 정보 전반)
//   공통: 규격(20/40/45)·갑판/홀드. 리퍼: 온도 분포. XRAY: 컨번호 끝4. DG: 클래스.
function formatBayDist(desc, results, parsed = {}) {
  if (results.length === 0) return `📭 ${desc} 없음`;
  const byBay = {};
  const sizeOf = (c) => {
    const lbl = isoToLabel(c.iso) || '';
    if (/^45/.test(lbl)) return '45';
    if (/^40/.test(lbl)) return '40';
    if (/^20/.test(lbl)) return '20';
    const f = (c.iso || '')[0];
    return f === '2' ? '20' : f === '4' ? '40' : (f === 'L' || f === '9') ? '45' : '?';
  };
  for (const c of results) {
    const b = parseInt(c.bay, 10);
    const k = Number.isFinite(b) ? b : '?';
    const v = byBay[k] = byBay[k] || { n: 0, deck: 0, hold: 0, sz: {}, temps: {}, l4: [], dgc: {} };
    v.n++;
    const t = parseInt(c.tier, 10);
    if (Number.isFinite(t)) { if (t >= 80) v.deck++; else v.hold++; }
    const s = sizeOf(c); v.sz[s] = (v.sz[s] || 0) + 1;
    if (c.rf || parsed.type === 'rf') {
      const tp = (c.tmp != null && String(c.tmp).trim() !== '') ? String(c.tmp).trim() : '미입력';
      v.temps[tp] = (v.temps[tp] || 0) + 1;
    }
    if (parsed.type === 'xray' || parsed.type === 'dg' || parsed.type === 'fr' || parsed.type === 'ot' || parsed.type === 'tk') {
      v.l4.push(c.cn ? c.cn.slice(-4) : '?');
    }
    if (c.dg) { const cl = c.dgc || '?'; v.dgc[cl] = (v.dgc[cl] || 0) + 1; }
  }
  const bays = Object.keys(byBay).filter(k => k !== '?').map(Number).sort((a, b) => a - b);
  const head = bays.length <= 8
    ? `📍 ${desc} ${results.length}대 — 베이 ${bays.join(', ')}`
    : `📍 ${desc} ${results.length}대 — ${bays.length}개 베이`;
  const lines = [head];
  const fmtSz = (sz) => ['20', '40', '45'].filter(s => sz[s]).map(s => `${s}ft ${sz[s]}`).join('/');
  for (const b of bays) {
    const v = byBay[b];
    const parts = [];
    if (v.deck + v.hold > 0) parts.push(`갑판 ${v.deck}/홀드 ${v.hold}`);
    const szs = fmtSz(v.sz); if (szs) parts.push(szs);
    const tk = Object.keys(v.temps);
    if (tk.length) parts.push(tk.sort().map(tp => `${tp === '미입력' ? '온도미입력' : tp + '°C'}×${v.temps[tp]}`).join(' '));
    const dk = Object.keys(v.dgc);
    if (dk.length) parts.push(dk.sort().map(cl => `cl.${cl}×${v.dgc[cl]}`).join(' '));
    if (v.l4.length && v.l4.length <= 6) parts.push(v.l4.join(', '));
    lines.push(`${String(b).padStart(2, '0')}번 베이 ${v.n}대${parts.length ? ' · ' + parts.join(' · ') : ''}`);
  }
  // 1.85: 컨별 상세 줄은 헬퍼(specialDetailLines) — 나열 답(formatLocationList)과 공유.
  lines.push(...specialDetailLines(results, parsed));
  if (byBay['?']) lines.push(`위치미상 ${byBay['?'].n}대`);
  return lines.join('\n');
}

/**
 * TallyOne 1.17: 끝 4자리가 겹치는 컨을 짝지어 답한다.
 *   왜 — 검수사는 컨을 끝 4자리로 부른다. 겹치는 것이 있으면 그 번호로는 특정이 안 된다.
 *   **같은 방향(양하끼리/선적끼리) 겹친 것을 위로** 올린다 — 그게 실제로 헷갈리는 것이다.
 *   양하-선적으로 갈린 것은 작업 자체가 달라 혼동이 적으므로 아래에 요약만 둔다.
 */
function formatDupL4(desc, results) {
  const groups = new Map();
  for (const c of results) {
    const cn = String(c.cn || '').toUpperCase();
    if (cn.length !== 11) continue;             // 실번호 없는 자리(__SLOT_ 등) 제외
    const k = c.l4 || cn.slice(-4);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(c);
  }
  const dups = [...groups.entries()].filter(([, v]) => v.length > 1).sort((a, b) => a[0].localeCompare(b[0]));
  if (dups.length === 0) return `✅ ${desc} — 끝 4자리 중복 없음 (${results.length}대 확인)`;

  const sameDir = dups.filter(([, v]) => new Set(v.map(c => c._mode)).size === 1);
  const crossDir = dups.filter(([, v]) => new Set(v.map(c => c._mode)).size > 1);
  const total = dups.reduce((t, [, v]) => t + v.length, 0);
  const lines = [`⚠️ ${desc} — 끝 4자리 겹침 ${dups.length}쌍 (${total}대)`];
  const dirLabel = (m) => (m === 'discharge' ? '양하' : m === 'loading' ? '선적' : '');

  const put = (list, head) => {
    if (!list.length) return;
    lines.push('', head);
    for (const [k, v] of list) {
      const one = v.map(c => `${c.cn} ${fmtPos(c)}`).join(' │ ');
      const dirs = [...new Set(v.map(c => dirLabel(c._mode)).filter(Boolean))];
      lines.push(`  ${k}  ${one}${dirs.length === 1 && dirs[0] ? `  (둘 다 ${dirs[0]})` : ''}`);
    }
  };
  put(sameDir, `같은 방향끼리 겹침 — 조회가 실제로 갈립니다 (${sameDir.length}쌍)`);
  if (crossDir.length) {
    lines.push('', `양하·선적으로 갈림 — 혼동은 적음 (${crossDir.length}쌍)`);
    lines.push(`  ${crossDir.map(([k]) => k).join(' · ')}`);
  }
  // 같은 베이 안에서 겹친 것은 따로 짚는다 — 현장에서 가장 위험하다.
  const sameBay = dups.filter(([, v]) => {
    const bays = new Set(v.map(c => String(parseInt(c.bay, 10))));
    return bays.size === 1 && !bays.has('NaN');
  });
  if (sameBay.length) {
    lines.push('', `🔴 같은 베이 안에서 겹침 — ${sameBay.map(([k, v]) => `${k}(${parseInt(v[0].bay, 10)}번 베이)`).join(' · ')}`);
  }
  return lines.join('\n');
}

// 1.85 (검수사 확정 — 1.84-04 확장): FR·OOG·OT 는 치수, DG 는 UN 번호까지 «설명이 있어야 합니다».
//   1.84-04 는 베이 분포 답(formatBayDist)에만 있어 **나열 답·1대 답에서는 안 보였다**(검수사 실측).
//   ① 화물 자체 치수(cg* — 수집기 1.8이 선사 치수 엑셀 BH2717YP063货物尺寸 류를 ediContainers 에 patch)
//   ② EDI DIM 초과 치수(ov*) ③ DG 는 cl./UN/PG. 대수가 적을 때만(≤12) — 많으면 집계가 답이다.
// 1.89 (검수사 확정 — 통합검색 답변 담당이 두 앱 데이터를 응용): 관련 선사 분포 + 담당자(carrierContacts).
export function formatCarriers(cs, ctx = null) {
  if (!cs || !cs.length) return '📭 컨테이너 자료가 아직 없어 선사 분포를 셀 수 없습니다 (리스트/EDI 도착 후 다시 물어보세요)';
  const by = {};
  for (const c of cs) {
    const op = String(c.op || '?').toUpperCase();
    const v = by[op] = by[op] || { n: 0, d: 0, l: 0 };
    v.n++; if (c._mode === 'loading') v.l++; else v.d++;
  }
  const cc = ctx?.carrierContacts || null;
  const ks = Object.keys(by).sort((a, b) => by[b].n - by[a].n);
  const named = ks.filter(k => k !== '?');
  const lines = [`📦 관련 선사 ${named.length}곳 — 총 ${cs.length}대`];
  ks.forEach((k, i) => {
    const v = by[k];
    const ent = cc && cc[k];
    const label = k === '?' ? '(선사 미기재)' : (ent?.label ? `${k}(${ent.label})` : k);
    const md = (v.d && v.l) ? ` (양하 ${v.d} / 선적 ${v.l})` : '';
    const who = k === '?' ? '' : (ent && Array.isArray(ent.contacts) && ent.contacts.length
      ? ' — 담당 ' + ent.contacts.map(x => x.name || x.email).filter(Boolean).join('·')
      : (cc ? ' — 담당자 미등록' : ''));
    lines.push(`${i + 1}. ${label} ${v.n}대${md}${who}`);
  });
  if (!cc) lines.push('(담당자 명부가 아직 안 올라왔습니다 — 수집기 업로드 후 이름이 붙습니다)');
  return lines.join('\n');
}

// 1.91-02 (검수사 확정 «리퍼 어디에 있어? → 양하인가요 선적인가요? 하고 되묻고 둘다 답»):
//   모드 미명시 조회에 양하·선적이 섞여 있으면 되묻는 말과 함께 갈라서 답한다.
export function needsModeChoice(parsed, results) {
  if (!parsed || parsed.mode) return false;
  if (!(SPECIAL_TYPES.includes(parsed.type) || parsed.posQuery || parsed.listQuery)) return false;
  const hasD = (results || []).some(c => c._mode !== 'loading');
  const hasL = (results || []).some(c => c._mode === 'loading');
  return hasD && hasL;
}

function splitByModeAnswer(results, parsed, fmt) {
  if (parsed?.mode) return fmt(results);   // «양하 리퍼» 처럼 명시하면 종전대로
  const d = results.filter(c => c._mode !== 'loading');
  const l = results.filter(c => c._mode === 'loading');
  if (!d.length || !l.length) return fmt(results);   // 한쪽뿐이면 그대로
  return '양하인가요, 선적인가요? 🐱 둘 다 말씀드릴게요.\n\n【양하 — 여기 있어요】\n' + fmt(d)
    + '\n\n【선적 — 여기에 실릴 거예요】\n' + fmt(l);
}

const SPECIAL_TYPES = ['fr', 'ot', 'oog', 'dg', 'tk', 'rf', 'xray', 'lolo'];   // 1.85-01: 리퍼·X-RAY 도 정보 답 · 1.85-05: LOLO(갠트리)도
function specialDetailLines(results, parsed) {
  if (!SPECIAL_TYPES.includes(parsed?.type) || !results.length || results.length > 12) return [];
  const lines = [''];
  for (const c of results) {
    const bits = [];
    if (c.rf) bits.push(c.tmp != null && String(c.tmp).trim() !== '' ? `설정 ${c.tmp}°C` : '온도 미입력');
    if (c._xray) bits.push('X-RAY 대상');
    if (c.dg) bits.push(`cl.${c.dgc || '?'}${c.un ? ` UN${c.un}` : ' (UN 미기재)'}${c.pg ? ` PG ${c.pg}` : ''}`);
    if (c.cgL || c.cgW || c.cgH) {
      bits.push(`화물 ${c.cgL || '?'}×${c.cgW || '?'}×${c.cgH || '?'}mm${c.cgWt ? ` ${(Number(c.cgWt) / 1000).toFixed(1)}t` : ''}${c.cgPcs ? ` ×${c.cgPcs}건` : ''}`);
    }
    const dims = [];
    if (c.ovh) dims.push(`높이+${c.ovh}cm`);
    if (c.ovw) dims.push(`폭+${c.ovw}cm`);
    if (c.ovl) dims.push(`길이+${c.ovl}cm`);
    if (dims.length) bits.push(`선사 신고 ${dims.join(' ')}`);
    /* ★ 2.25 (검수사 정의 2026-08-23): *«초과치수는 폭 길이 높이 셋중에 하나라도 FR범위를 벗어나면
       초과치수인데 사진을 보더라도 높이에서 걸리는데 왜 초과치수 없음인지?»* — 맞다.
       종전엔 판정이 없었다. `ovh/ovw/ovl` 은 **선사가 EDI DIM 에 적어 보낸** 값일 뿐이고,
       그것이 없으면 실치수를 갖고 있으면서도 «초과 치수 기재 없음» 이라고만 했다.
       이제 실치수가 있으면 **앱이 대본다** — 걸리는 것이 무엇인지까지 말한다. */
    const _od = overDims(c);
    if (_od && _od.over) bits.push(`⚠ 규격 초과 ${_od.parts.join(' · ')}`);
    else if (_od) bits.push('규격 안');
    else if (['fr', 'oog', 'ot'].includes(parsed?.type) && !c.dg && !dims.length) bits.push('치수 자료 없음');
    if (c.sl) bits.push(`씰 ${c.sl}`);   // 2.05 (검수사 «FR 실 어디에 있어» — 씰 질문에 씰번호가 답에 있어야)
    if (c.wt) bits.push(`${(Number(c.wt) / 1000).toFixed(1)}t`);
    lines.push(`  ${c.cn || '?'} — ${fmtPos(c)}${bits.length ? ' · ' + bits.join(' · ') : ''}`);
  }
  return lines;
}

function formatLocationList(desc, results, parsed = null) {
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
    if (c.lolo) tag.push('🏗갠트리');
    if (c.dbl) tag.push('⇅2단');
    if (c._comp) tag.push('✅');
    const tagStr = tag.length ? ` [${tag.join(' ')}]` : '';
    lines.push(`${i + 1}. ${c.cn?.slice(-4) || '?'} @ ${fmtPos(c) || '위치미상'}${tagStr}`);
  });
  if (results.length > max) lines.push(`(${results.length - max}대 더 있음)`);
  lines.push(...specialDetailLines(results, parsed));   // 1.85: 나열 답에도 특수화물 상세
  return lines.join('\n');
}

// M3.3: 베이 용량/짝꿍 분석
function formatCapacity(parsed, allContainers, ctx = null) {
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

  // 1.26: **베이를 안 짚었으면 배 전체를 묻는 것이다** — 본선 구조와 실적으로 답한다.
  //   종전엔 이번 항차에 컨이 놓인 자리(관측 슬롯)만 셌다. 그건 "지금 몇 자리 찼나" 이지
  //   "이 배에 몇 대까지 싣나" 가 아니다. 검수사 질문은 후자였다(오답 리포트 2026-08-07).
  //   근거: ships/{키}/structure (베이·페어·슬롯) + stats (항차수·양하/선적 누계).
  //   ⚠ 여기서 낸 수는 **관측치**다. 도면상 선복이 아니다 — 그 사실을 문장으로 밝힌다.
  const st = ctx?.shipLib?.structure, sx = ctx?.shipLib?.stats;
  if (st || sx) {
    const lines = ['📊 이 배에 몇 대까지 싣나'];
    if (st) {
      const bc = st.bay_count ?? (st.bays?.length || 0);
      const pr = st.pairs ? Object.keys(st.pairs).length / 2 : 0;
      lines.push(`🚢 본선 구조: ${bc}베이${pr ? ` · 페어 ${pr}쌍` : ''}` +
                 `${st.has_deck ? ' · 덱' : ''}${st.has_hold ? '/홀드' : ''}`);
      if (st.total_slots) lines.push(`   관측 슬롯 ${st.total_slots.toLocaleString()}개`);
    }
    if (sx?.total_voyages > 0) {
      const avgL = Math.round((sx.total_loading || 0) / sx.total_voyages);
      const avgD = Math.round((sx.total_discharge || 0) / sx.total_voyages);
      lines.push(`📈 실적 ${sx.total_voyages}항차 — 선적 평균 ${avgL}대 · 양하 평균 ${avgD}대`);
      lines.push(`   누계 선적 ${(sx.total_loading || 0).toLocaleString()} · 양하 ${(sx.total_discharge || 0).toLocaleString()}`);
    }
    // 이번 항차 현재
    const nowL = allContainers.filter(c => c._mode === 'loading').length;
    const nowD = allContainers.filter(c => c._mode === 'discharge').length;
    if (nowL || nowD) lines.push(`📦 이번 항차 현재: 선적 ${nowL}대 · 양하 ${nowD}대`);
    lines.push('', '※ 위 수는 지난 항차에서 실제로 관측된 값입니다.',
                   '   도면상 최대 선복이 아니며, 확정 수량은 선적 기준 EDI 가 와야 정해집니다.');
    return lines.join('\n');
  }

  // 전체 빈 슬롯 분포 (본선 구조가 없을 때)
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
function formatProgress(parsed, results, allContainers, ctx = null) {
  // 진행 상황 자체는 desc에서 빼고 깔끔하게
  const baseDesc = describeQuery({ ...parsed, progressQuery: null }) || '전체';

  const baseParsed = { ...parsed, progressQuery: null };
  const baseResults = applyNLFilter(allContainers, baseParsed);
  const totalCount = baseResults.length;
  const doneCount = baseResults.filter(c => c._comp).length;
  const pendingCount = totalCount - doneCount;
  const pct = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0;

  const lines = [];
  // ★ 2.55 (검수사 확정): 대수를 물으면 **실제(터미널)와 앱 기록 둘 다** 낸다.
  //   조건 없는 질문(«몇 대 했어»·«얼마나 남았어»)에서만 세운다 — 베이·규격이 붙은 질문
  //   («20번 베이 남은 거»)은 터미널 실적에 그 구분이 없어 두 수를 나란히 놓으면 거짓말이 된다.
  const _plain = !parsed.bay && !parsed.size && !parsed.fe && !parsed.type && !parsed.temp
    && !parsed.zone && !parsed.dgClass && !parsed.un && !parsed.pod && !parsed.pol
    && !parsed.portAny && !parsed.digits && !parsed.bayTrio
    && parsed.weightMin == null && parsed.weightMax == null;
  let _both = null;
  if (_plain) {
    const _md = parsed.mode || (baseResults.length ? (baseResults[0]._mode || 'discharge') : 'discharge');
    try { _both = bothCounts(baseResults, ctx, _md); } catch (e) { _both = null; }
  }
  if (_both && _both.length) {
    lines.push(parsed.progressQuery === 'done' ? '✅ 작업한 대수 — 두 가지로 말씀드립니다.' : '⏳ 남은 대수 — 두 가지로 말씀드립니다.');
    _both.forEach((l) => lines.push(l));
  } else if (parsed.progressQuery === 'done') {
    lines.push(`✅ ${baseDesc} 완료: ${doneCount}대 / 전체 ${totalCount}대 (${pct}%)`);
    lines.push(`남은 작업: ${pendingCount}대`);
  } else {
    lines.push(`⏳ ${baseDesc} 남은 작업: ${pendingCount}대 / 전체 ${totalCount}대`);
    lines.push(`완료: ${doneCount}대 (${pct}%)`);
  
    // 1.93 (검수사 확정): 애매한 «얼마나 남았어»는 기본 답(이해 차원)만 주고,
    //   «질문 방식을 바꿔 달라고 사용자에게 어필» — 유도 문구는 1.84-03 패턴이라 자동으로 버튼이 된다.
    lines.push('');
    lines.push('더 자세히 물으실 수 있어요 — "지금 홀드 몇 개 남았어"로 상세 확인 · "몇 시에 끝나"로 상세 확인 · "몇 시간 걸릴까"로 상세 확인');
  }

  //  2.55: 표본은 **baseResults 에서 다시 뽑는다.** 넘겨받은 results 는 완료가 입혀지기 전에 걸러진 것이라
  //   항차 화면에서 «완료된 컨» 목록이 통째로 비어 있었다(숫자와 목록이 어긋난다).
  const shown = baseResults.filter((c) => (parsed.progressQuery === 'done' ? !!c._comp : !c._comp));
  if (shown.length > 0 && shown.length <= 50) {
    lines.push('', `${parsed.progressQuery === 'done' ? '완료된' : '남은'} 컨 (${Math.min(shown.length, 10)}대):`);
    shown.slice(0, 10).forEach((c, i) => {
      const tag = [];
      if (c.fe) tag.push(c.fe);
      if (c.rf && c.tmp) tag.push(`${c.tmp}°C`);
      if (c.dg) tag.push(`DG${c.dgc || ''}`);
      lines.push(`  ${i + 1}. ${c.cn?.slice(-4) || '?'} @ ${fmtPos(c) || '?'}${tag.length ? ' [' + tag.join(' ') + ']' : ''}`);
    });
    if (shown.length > 10) lines.push(`  ... 외 ${shown.length - 10}대`);
  }
  return lines.join('\n');
}

// ─── TallyOne 1.69-02: 진행 질문 두 갈래 — 근본 하나 (검수사 확정 2026-08-14) ───
//   "그냥 진행 상태를 질문하면 앱대상이 맞고, 실제 진행 상황을 물으면 수석대쉬보드에
//    실시간 작업보드처럼 알려줘야 함. 현 진행 상황은/실제 진행 상황은 — 2가지 다른 답이 나와야 함."
//   항차 화면(SearchPanel)과 통합검색(GlobalSearchPage)이 이 함수들을 함께 쓴다 — 답의 근본은 하나.
//   각 답 끝에 반대쪽 안내 한 줄을 붙여 두 갈래가 서로를 가리킨다.
// ─── ★ 2.55 — 대수를 물으면 **두 숫자로 답한다** (검수사 확정 2026-08-26) ───
//   *«이제 작업한 갯수를 물어보거나 남은갯수를 물어보면 두가지 답이 나와야 합니다.
//     실제로 작업한거와 앱에 기록된거»* · *«당분간은 그렇게 가야합니다 앱으로 전부 작업할때까지는»*
//
//   ★ 왜 — 검수사 말고는 앱에 완료를 거의 안 찍는다. 실측(STSE 2665E · 08-26 10:00):
//     터미널 실적 **181대**인데 앱 기록 **116대** — 65대가 안 찍혀 있다.
//     한 숫자만 내면 어느 쪽을 내도 틀린 답이 된다. 그래서 둘 다 내고 **차이까지 말한다.**
//   ⚠ 이것은 1.69-02(«실제» 라고 말해야 터미널 답이 나오는 두 갈래)를 **대체한다.**
//     그때는 검수사가 «실제 진행 상황» 이라고 물어야 터미널 수를 봤다 — 그 말을 모르면 앱 수만 봤다.
//     이제 묻는 말과 상관없이 둘 다 나온다. 두 갈래 함수는 남기되 서로의 숫자를 한 줄씩 싣는다.
//   ⛔ 판정을 두 벌로 만들지 않는다 — 진행 답·앱 갈래·터미널 갈래·브리핑이 **전부 이 함수**를 부른다.
export function twOfCtx(ctx) {
  if (!ctx) return null;
  if (ctx.tw && typeof ctx.tw === 'object') return ctx.tw;   // 두 갈래 함수는 레코드를 직접 넘긴다
  const tws = ctx.terminalWork;
  if (!tws || typeof tws !== 'object') return null;
  const info = ctx.info || {};
  const a = String(ctx.vsl || info.vsl || '').toUpperCase();
  const b = String(ctx.vslFull || info.vslFull || '').toUpperCase();
  const tw = (a && tws[a]) || (b && tws[b]) || null;
  return (tw && typeof tw === 'object') ? tw : null;
}

//  두 숫자 블록을 줄 배열로 낸다. 낼 것이 없으면 null (있는 척하지 않는다).
export function bothCounts(pool, ctx, mode) {
  const md = mode === 'loading' ? 'loading' : 'discharge';
  //  앱 기록 — 평택분만 센다(7.1). `_ptk` 가 아예 없는 화면도 있어 false 일 때만 뺀다.
  const app = (pool || []).filter((c) => c && c._ptk !== false && (c._mode || 'discharge') === md);
  const appTotal = app.length;
  const appDone = app.filter((c) => !!c._comp).length;

  //  터미널 실적 — 트레드링스 자료다. **앱과 무관하다**(검수원이 앱을 안 써도 여기엔 찍힌다).
  const tw = twOfCtx(ctx);
  const terDone = tw ? (Number(md === 'loading' ? tw.lodDone : tw.disDone) || 0) : 0;
  const terPlan = tw ? (Number(md === 'loading' ? tw.lodPlan : tw.disPlan) || 0) : 0;
  const hasTer = !!(tw && terPlan > 0);
  if (!hasTer && !appTotal) return null;

  const L = [];
  if (hasTer) L.push(`🏗 실제(터미널) ${terDone}대 / ${terPlan}대 — 남은 ${Math.max(0, terPlan - terDone)}대`);
  if (appTotal) L.push(`📱 앱 기록 ${appDone}대 / ${appTotal}대 — 남은 ${appTotal - appDone}대`);
  else L.push('📱 앱 기록 없음 — 이 항차는 앱으로 검수하지 않았습니다.');

  //  차이를 **말로** 짚는다. 숫자 두 줄만 던지면 어느 쪽을 믿을지 검수사가 판단해야 한다.
  if (hasTer && appTotal) {
    const gap = terDone - appDone;
    if (gap > 0) L.push(`⚠ ${gap}대는 실제로 작업했는데 앱에 안 찍혔습니다 (전근무자 작업분 등).`);
    else if (gap < 0) L.push(`⚠ 앱이 ${-gap}대 더 많습니다 — 터미널 피드가 아직 안 따라왔을 수 있어요.`);
    else L.push('✅ 두 숫자가 같습니다 — 앱 기록이 실제와 맞습니다.');
  } else if (!hasTer) {
    L.push('⚠ 터미널 실적 피드가 아직 없어 «실제로 작업한 수»는 모릅니다.');
  }
  if (hasTer && tw.updatedAt) {
    const m = Math.round((Date.now() - (Number(tw.updatedAt) || 0)) / 60000);
    if (m >= 0 && m < 60 * 24) L.push(`   (터미널 피드 ${m}분 전 갱신)`);
  }
  return L;
}

export const isRealtimeProgressQuery = (q) => /실제|실시간|실황|터미널/.test(String(q || ''));

// 터미널 실황 답 — 실시간 작업보드형 (양하 N/N · 선적 N/N · % · 지연 · 시작 · 터미널 ETD · 피드 나이)
export function formatTerminalWorkAnswer(ship, tw, containers = null, mode = 'discharge') {   // 2.55: 앱 기록도 같이
  if (!tw || !(tw.disPlan || tw.lodPlan)) {
    return `${ship} — 터미널 실황 피드가 아직 없습니다.\n앱 검수 기록은 «진행 상태»로 물어보세요.`;
  }
  const L = [];
  // 1.69-06: 이미 끝난 작업이면 **결론부터** — «완료» + 종료 시각(터미널 endAt) (검수사 신고 2026-08-14
  //   "이미 완료된 작업을 물어보면 언제 작업 종료했는지 알려줘야 함"). ⚠ 피드가 24시간 넘게 낡으면
  //   직전 기항 실적일 수 있어(HAYN — 8/4 인천 피드 실측) 완료 결론을 내리지 않는다.
  const _fresh = tw.updatedAt && (Date.now() - tw.updatedAt) < 24 * 3600 * 1000;
  const _doneByCnt = (tw.disPlan ? (tw.disDone ?? 0) >= tw.disPlan : true) && (tw.lodPlan ? (tw.lodDone ?? 0) >= tw.lodPlan : true);
  if (_fresh && (tw.endAt || tw.pct >= 100 || _doneByCnt)) {
    L.push(`✅ ${ship} — 작업 완료${tw.endAt ? ` · 종료 ${String(tw.endAt).slice(5, 16)}` : ' (종료 시각 미수신)'} — 터미널 실황(endAt) 기준`);
  }
  const seg = [];
  if (tw.disPlan) seg.push(`양하 ${tw.disDone ?? 0}/${tw.disPlan}${tw.disDone >= tw.disPlan ? ' 완료' : ''}`);
  if (tw.lodPlan) seg.push(`선적 ${tw.lodDone ?? 0}/${tw.lodPlan}`);
  L.push(`${ship} — ${seg.join(' · ')}${tw.pct != null ? ` (전체 ${tw.pct}%)` : ''}${tw.delayed ? ' · ⚠ 지연 중' : ''}`);
  if (tw.startAt) L.push(`작업 시작 ${String(tw.startAt).slice(5, 16)}`);
  if (tw.depEtd) L.push(`출항 예정 ${String(tw.depEtd).slice(5, 16)} (터미널 기준)`);
  if (tw.updatedAt) { const m = Math.round((Date.now() - tw.updatedAt) / 60000); L.push(`터미널 피드 ${m}분 전 갱신`); }
  // ★ 2.55: 앱 기록을 **묻지 않아도** 같이 낸다 — 검수사 확정 «두가지 답이 나와야 합니다».
  //   종전에는 «앱 검수 기록은 «진행 상태»로 물어보세요» 라고 안내만 했다(그 말을 알아야 볼 수 있었다).
  if (containers && containers.length) {
    const _b = bothCounts(containers, { tw }, mode);
    if (_b && _b.length) { L.push(''); _b.forEach((x) => L.push(x)); }
  }
  return L.join('\n');
}

// 앱 검수 기록 답 — completed/전체 · % · 검수사별(기록에 by 가 있으면). 평택분 기준(7.1).
export function formatAppTallyAnswer(ship, containers, tw = null, mode = 'discharge') {   // 2.55: 터미널 실적도 같이
  const pool = (containers || []).filter((c) => c._ptk);
  const done = pool.filter((c) => c._comp);
  // ★ 2.55: 앱 기록이 없어도 **터미널 실적으로는 답할 수 있다** — 검수사가 앱을 안 쓴 항차가 대부분이다.
  //   종전에는 «앱 검수 기록 없음» 한 줄로 끝나 실제로 몇 대 내려갔는지 아무 데서도 못 봤다.
  if (!done.length) {
    const _b0 = tw ? bothCounts(pool, { tw }, mode) : null;
    if (_b0 && _b0.length) return `${ship} — 앱 검수 기록은 없지만 터미널 실적으로 말씀드립니다.\n` + _b0.join('\n');
    return `${ship} — 앱 검수 기록 없음(이 항차는 앱 검수 미사용).\n실제(터미널) 진행은 «실제 진행 상황»으로 물어보세요.`;
  }
  const seg = [];
  [['discharge', '양하'], ['loading', '선적']].forEach(([md, kr]) => {
    const p = pool.filter((c) => c._mode === md);
    if (!p.length) return;
    const d = p.filter((c) => c._comp).length;
    seg.push(`${kr} ${d}/${p.length} (${Math.round(d / p.length * 100)}%)`);
  });
  const out = [];
  // 1.69-06: 평택분 전량 완료면 **결론부터** — «완료» + 종료 시각(마지막 completed.at, 앱 기록 기준).
  if (pool.length && done.length === pool.length) {
    let _last = 0;
    done.forEach((c) => { const t = c._comp && c._comp.at; if (t && t > _last) _last = t; });
    const d = _last ? new Date(_last) : null;
    const _f = d ? `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';
    out.push(`✅ ${ship} — 작업 완료${_f ? ` · 종료 ${_f}` : ''} — 앱 검수 기록(마지막 완료 시각) 기준`);
  }
  out.push(`${ship} — 앱 검수 기록 기준 ${seg.join(' · ')}`);
  const by = {};
  done.forEach((c) => { const n = c._comp && c._comp.by; if (n) by[n] = (by[n] || 0) + 1; });
  const names = Object.entries(by).sort((a, b) => b[1] - a[1]);
  if (names.length) out.push(`검수사별 — ${names.map(([n, k]) => `${n} ${k}대`).join(' · ')}`);
  // ★ 2.55: 터미널 실적을 **묻지 않아도** 같이 낸다(검수사 확정). 안내 문구로 미루지 않는다.
  const _b = tw ? bothCounts(pool, { tw }, mode) : null;
  if (_b && _b.length) { out.push(''); _b.forEach((x) => out.push(x)); }
  else out.push('실제(터미널) 진행은 «실제 진행 상황»으로 물어보세요.');
  return out.join('\n');
}

// ─── V7.99-15: 완료 예정 시각 (대화체) ───
//   데이터에 이미 있는 완료 타임스탬프(c._comp.at)로 실제 작업 페이스를 직접 계산한다.
//   사용자가 속도를 말해줄 필요 없음. AI도 필요 없음 — 순수 로컬 계산.
//   검수사가 종일 단조로운 작업 중이라, 숫자만 던지지 않고 동료처럼 한마디 거든다.
// ─── TallyOne 1.68: 터미널별 근무시간표 (검수사 확정 2026-08-13) ───
//   "오전 근무는 08:00~17:30 중간에 12:00-13:00 중식" · 야간(PCTC) 19~24시·야식·01~03:30·티타임·04~06:30
//   PNCT 주간 08~11:30·중식~13·13~17:30 / 야간 19~23:30·야식~01·01~05:30.
//   자정 기준 분(minute) 창 목록 — ETA 계산은 이 창 안의 시간만 센다(중식·야식·티타임·조간 공백 제외).
export const WORK_SHIFTS = {
  PCTC: [[60, 210], [240, 390], [480, 720], [780, 1050], [1140, 1440]],
  PNCT: [[60, 330], [480, 690], [780, 1050], [1140, 1410]],
};
// ── ★ 2.54 — **두 시각 사이의 «실제 일한 분».** `addWorkMinutes` 의 역이다.
//  왜 없었나 — 지금까지는 «지금부터 N분 뒤» 만 필요했다. 그런데 검수사 메모(2026-08-26)가
//  *«시작시간과 멈춤시간 재시작시간과 현재까지의 시간»* 으로 **지나간 시간**을 재라고 한다.
//  그것이 없어서 `chiefAnswers.js:243` 이 «addWorkMinutes 역산 대신 … 근사» 로 때우고 있었다.
//  ⚠ 쉬는 시간은 지어내지 않는다 — 바로 위 `WORK_SHIFTS`(검수사 확정 2026-08-13, 학습서 2-F′)를 그대로 쓴다.
//    검수사 메모의 «04시부터 06시30 08시부터» 가 바로 PCTC 의 `[240,390]`·`[480,720]` 이다.
export function workMinutesBetween(aMs, bMs, pier) {
  const a = Number(aMs), b = Number(bMs);
  if (!(b > a)) return 0;
  const wins = WORK_SHIFTS[String(pier || '').toUpperCase()] || WORK_SHIFTS.PCTC;
  let total = 0;
  const day = new Date(a); day.setHours(0, 0, 0, 0);
  //  ⚠ 하루씩 전진하며 그날의 근무 창과 [a,b] 의 교집합만 더한다.
  //    guard 는 무한 루프 방지 — 400일이면 어떤 기항보다 길다(조용히 도는 것보다 멈추는 게 낫다).
  for (let guard = 0; day.getTime() < b && guard < 400; guard++) {
    const base = day.getTime();
    for (let i = 0; i < wins.length; i++) {
      const lo = Math.max(base + wins[i][0] * 60000, a);
      const hi = Math.min(base + wins[i][1] * 60000, b);
      if (hi > lo) total += (hi - lo) / 60000;
    }
    day.setDate(day.getDate() + 1);
  }
  return Math.round(total);
}

// ── ★ 2.54-01 — **터미널 실적으로 페이스를 재는 단 한 벌.**
//  ⚠ 2.54 는 이것을 `chiefAnswers` 안에 두었다. 그런데 검수사가 실제로 쓰는 **양하 탭 검색바**는
//    `answerShipSpeed` 를 아예 안 부르고 `formatEta` 로 간다 — 그래서 **완료 67대인 배가
//    «아직 시작 전이에요» 라고 답했다**(2.54 라이브 실측). 절반만 고친 것이었다.
//  ⇒ 계산을 여기로 옮겨 **양쪽이 같은 한 벌을 쓴다.** 판정을 두 벌로 만들면 반드시 갈린다.
export function speedFromTerminal(info, terminalWork) {
  const code = String(info.vsl || '').toUpperCase();
  const tw = terminalWork && (terminalWork[code] || terminalWork[String(info.vslFull || '').toUpperCase()]);
  if (!tw || typeof tw !== 'object') return null;
  const st = _tsOf(tw.startAt);
  if (!st) return null;                                   // 시작 시각이 없으면 잴 수가 없다
  const done = (Number(tw.disDone) || 0) + (Number(tw.lodDone) || 0);
  const plan = (Number(tw.disPlan) || 0) + (Number(tw.lodPlan) || 0);
  if (done <= 0) return null;                             // 아직 한 대도 안 했으면 페이스가 없다
  //  자료가 갱신된 시각까지만 센다 — «지금»으로 재면 수집기가 멈춘 동안이 작업 시간에 섞인다.
  const upto = Number(tw.updatedAt) || Date.now();
  const pier = String(info.pier || '').toUpperCase().includes('PNCT') ? 'PNCT' : 'PCTC';
  const workedMin = workMinutesBetween(st, upto, pier);
  if (workedMin < 30) return null;                        // 너무 짧으면 페이스가 튄다
  const perGangHour = (done / 2) / (workedMin / 60);      // 2갱 기준 — 갱당 시간당
  if (!(perGangHour > 0)) return null;
  return { st, upto, done, plan, left: Math.max(0, plan - done), workedMin, perGangHour, pier, tw };
}
function _tsOf(v) {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  const s = String(v).trim().replace(' ', 'T');
  const t = Date.parse(s.length <= 16 ? s + ':00+09:00' : s);
  return Number.isFinite(t) ? t : 0;
}

// startMs 시점부터 workMin(작업분)을 근무 창만 세며 전진해 끝나는 시각을 돌려준다.
export function addWorkMinutes(startMs, workMin, pier) {
  const wins = WORK_SHIFTS[String(pier || '').toUpperCase()] || WORK_SHIFTS.PCTC;
  let t = new Date(startMs); let left = workMin; let guard = 0;
  while (left > 0 && guard++ < 20000) {
    const m = t.getHours() * 60 + t.getMinutes();
    const win = wins.find(([a, b]) => m >= a && m < b);
    if (win) {
      const usable = Math.min(left, win[1] - m);
      t = new Date(t.getTime() + usable * 60000); left -= usable;
    } else {
      const next = wins.map(([a]) => a).filter((a) => a > m).sort((a, b) => a - b)[0];
      if (next != null) t = new Date(t.getTime() + (next - m) * 60000);
      else { t = new Date(t.getTime() + (1440 - m) * 60000); }
    }
  }
  return t;
}

function formatEta(parsed, allContainers, ctx) {
  // allContainers는 호출부에서 이미 평택분만 넘어옴(SearchPanel _ptk 필터).
  //   반환은 다른 답변과 동일하게 '문자열' — 첫 줄이 음성으로 읽히므로 첫 줄에 대화체 한 문장.
  const total = allContainers.length;
  const doneAts = allContainers
    .map(c => (c._comp && typeof c._comp === 'object' ? c._comp.at : null))
    .filter(at => typeof at === 'number' && at > 0)
    .sort((a, b) => a - b);
  const doneCount = allContainers.filter(c => !!c._comp).length;
  const remain = Math.max(0, total - doneCount);

  //  ★ 2.54-01 — **터미널 실적이 있으면 그것이 먼저다.**
  //    아래 앱 기록(`_comp`) 경로는 검수사 말고는 거의 안 찍어서 «아직 시작 전이에요» 를 낸다.
  //    검수사 메모(2026-08-26) — *«앱으로 계산하면 틀립니다. 앱으로 작업을 잘안하니까요»*.
  //    ⚠ 실측으로 이 자리에서 걸렸다 — 완료 67대인 STSE 가 «아직 시작 전이에요» 라고 답했다.
  //      (양하 탭 검색바는 answerShipSpeed 를 안 부르고 여기로 온다 — 경로가 셋이다.)
  try {
    const _T = speedFromTerminal({ vsl: ctx?.vsl, vslFull: ctx?.vslFull, pier: ctx?.pier }, ctx?.terminalWork);
    if (_T) {
      const wh = Math.floor(_T.workedMin / 60), wm = _T.workedMin % 60;
      const head = `터미널 실적으로 보면 지금까지 ${_T.done}대 했어요 — 실작업 ${wh}시간${wm ? ' ' + wm + '분' : ''}(쉬는 시간 뺀 것).`;
      if (_T.left <= 0) return `${head}\n계획 ${_T.plan}대를 다 채웠습니다. 수고 많으셨어요.`;
      const rMin = Math.round((_T.left / (_T.perGangHour * 2)) * 60);
      const e = addWorkMinutes(Date.now(), rMin, _T.pier);
      const p2 = (n) => String(n).padStart(2, '0');
      const rh = Math.floor(rMin / 60), rm = rMin % 60;
      return `${head}\n남은 ${_T.left}대 — 이 페이스면 **약 ${rh ? rh + '시간 ' : ''}${rm}분** 뒤, `
        + `**${p2(e.getMonth() + 1)}-${p2(e.getDate())} ${p2(e.getHours())}:${p2(e.getMinutes())}** 쯤 끝나요.\n`
        + `2갱 기준 갱당 시간당 ${_T.perGangHour.toFixed(1)}대 (1갱이면 ×2) · 중식·야식·티타임·조 경계는 빼고 계산했어요.`;
    }
  } catch (e) { /* 터미널 자료가 없으면 아래 앱 기록 경로로 */ }

  if (total > 0 && remain === 0) {
    return `작업 다 끝났어요. 수고 많으셨습니다.\n🎉 평택분 ${total}대 전부 완료했어요.`;
  }
  // 1.93-01 (검수사 실측 «미르야 얼마나 걸릴까?» 가 «몇 대 진행되면…»으로 끝남): 시작 전·페이스 부족이면
  //   실측 평균(shipSpeed, 1.92)으로 먼저 예측한다 — 진행되면 페이스 기반이 자동으로 이어받는다.
  const _speedGuess = (label) => {
    const sp = ctx?.shipSpeed; const vsl = String(ctx?.vsl || '').toUpperCase();
    if (!sp || !vsl || !remain) return null;
    const pier = String(ctx?.pier || '').toUpperCase().includes('PCTC') ? 'PCTC'
      : String(ctx?.pier || '').toUpperCase().includes('PNCT') ? 'PNCT' : null;
    let rec = (pier && sp[`${vsl}_${pier}`]) || sp[`${vsl}_PNCT`] || sp[`${vsl}_PCTC`] || null;
    let src_ = rec ? `${rec.vsl}(${rec.pier}) 평균` : '';
    if (!rec) {
      // 1.93-01: 이 배 기록이 없으면 같은 부두 평균으로(1.92 answerShipSpeed 와 같은 폴백)
      const same = Object.values(sp).filter((v) => v && typeof v === 'object' && v.pier && (!pier || v.pier === pier));
      if (same.length) {
        const mvS = same.reduce((s, v) => s + v.moves, 0); const hS = same.reduce((s, v) => s + v.craneHours, 0);
        if (hS > 0) { rec = { movesPerCraneHour: +(mvS / hS).toFixed(1), avgCranes: 1.5 }; src_ = `${pier || '부두'} 전체 평균(이 배 기록 없음)`; }
      }
    }
    if (!rec || !rec.movesPerCraneHour) return null;
    const cr = Math.max(1, Math.round(rec.avgCranes || 1));
    const hrs = remain / (rec.movesPerCraneHour * cr);
    const hh = Math.floor(hrs); const mm = Math.round((hrs - hh) * 60);
    const hrs1 = remain / rec.movesPerCraneHour;
    const h1 = Math.floor(hrs1); const m1 = Math.round((hrs1 - h1) * 60);
    return `${label} 크레인 ${cr}대가 같이 하면 약 ${hh ? hh + '시간 ' : ''}${mm}분 예상이에요.${cr > 1 ? ` (1대면 약 ${h1}시간 ${m1}분)` : ''}\n${src_} ${rec.movesPerCraneHour}무브/크레인h · ${remain}대=무브로 계산(트윈 미반영 — 20피트 트윈이 많으면 실제는 더 빨라요) · 해치커버·식사 별도`;
  };
  if (doneCount === 0) {
    const g = _speedGuess('아직 시작 전인데,');
    if (g) return g;
    return `아직 시작 전이에요. 평택분 ${total}대 남았어요.\n몇 대 진행되면 페이스를 보고 완료 시각을 알려드릴게요.`;
  }
  if (doneAts.length < 2) {
    const g = _speedGuess(`${remain}대 남았어요.`);
    if (g) return g;
    return `${remain}대 남았어요. 조금 더 진행되면 끝날 시각을 알려드릴게요.\n완료 ${doneCount}대 · 남은 ${remain}대 — 아직 페이스를 잴 기록이 부족해요.`;
  }

  // 최근 페이스 우선 — 최근 20개(없으면 전체) 완료 간격으로 시간당 처리량.
  const recent = doneAts.slice(-Math.min(20, doneAts.length));
  const spanMs = recent[recent.length - 1] - recent[0];
  const perHour = spanMs > 0 ? (recent.length - 1) / (spanMs / 3600000) : 0;
  if (!(perHour > 0)) {
    return `${remain}대 남았어요.\n완료 간격이 너무 짧아 페이스를 계산하기 어려워요. 조금 더 진행되면 다시 물어봐 주세요.`;
  }

  const remainMin = Math.round((remain / perHour) * 60);
  // 1.68: 중식·야식·티타임·조 사이 공백을 건너뛰어 계산한다(터미널별 근무시간표 — 검수사 확정).
  const eta = addWorkMinutes(Date.now(), remainMin, ctx?.pier);
  const hh = eta.getHours(), mm = eta.getMinutes();
  const ampm = hh < 12 ? '오전' : '오후';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  const etaStr = `${ampm} ${h12}시 ${String(mm).padStart(2, '0')}분`;
  const etaShort = mm === 0 ? `${h12}시` : `${h12}시 ${String(mm).padStart(2, '0')}분`;
  const rate = Math.round(perHour);

  const hPart = Math.floor(remainMin / 60), mPart = remainMin % 60;
  let durKo = hPart > 0 && mPart > 0 ? `약 ${hPart}시간 ${mPart}분`
            : hPart > 0 ? `약 ${hPart}시간` : `약 ${mPart}분`;

  let cheer = '';
  if (remain <= 10) cheer = ' 거의 다 왔어요.';
  else if (remain <= total * 0.25) cheer = ' 막바지네요, 조금만 더.';
  else if (remain >= total * 0.75) cheer = ' 차근차근 가요.';

  // 첫 줄 = 음성용 대화 문장. 이후 = 화면 상세.
  return (
    `${remain}대 남았어요. 지금 페이스면 ${durKo}, ${etaShort}쯤 끝나겠네요.${cheer}\n` +
    `⏱ 예상 완료: ${etaStr}쯤\n` +
    `남은 작업: ${remain}대 (완료 ${doneCount} / 전체 ${total})\n` +
    `현재 페이스: 시간당 약 ${rate}대 (최근 ${recent.length}대 기준)\n` +
    `남은 시간: ${durKo}`
  );
}

// ─── V7.99-16: 양하신고 점검 ───
//   "양하신고할까?" → 그날 발생한 이상 건을 신고 리스트(세관 신고) 기준으로 정리.
//   판별(데이터 기반, 추측 없음):
//     누락 = flag 'missing'(선박에 없어 완료) + 보조: 리스트에 있으나 미완료(작업 종료 시 안 내려진 것)
//     초과 = flag 'extra'(리스트에 없는데 내림) + 보조: _src==='edi'(리스트 밖)인데 완료된 것
//     바뀜 = flag 'swapped'(다른 번호가 옴)
//     리씰 = sl_orig ≠ 현재 sl (현장에서 실을 다시 단 것)
//     실오류 = auditSeals (중복·혼입·자리수)
//   allContainers는 평택분(SearchPanel _ptk 필터). 각 컨은 _comp(={at,flag,note}|null), _src, sl, sl_orig 보유.
function formatCustomsReport(parsed, allContainers, ctx) {
  const cs = allContainers || [];
  const compInfo = (c) => (c._comp && typeof c._comp === 'object') ? c._comp : (c._comp ? {} : null);
  const last4 = (c) => (c.cn || '').slice(-4) || '?';
  const onList = (c) => c._src === 'list' || c._src === 'both';  // 신고 리스트에 있음

  // 1) 누락 — 명시 flag + 보조(리스트에 있는데 미완료)
  const missingFlagged = cs.filter(c => compInfo(c)?.flag === 'missing');
  const pendingOnList = cs.filter(c => onList(c) && !c._comp);  // 작업 종료 전이면 정상, 종료 후면 누락 의심
  // 2) 초과 — 명시 flag + 보조(리스트 밖인데 완료)
  const extraFlagged = cs.filter(c => compInfo(c)?.flag === 'extra');
  const extraImplied = cs.filter(c => c._src === 'edi' && c._comp && compInfo(c)?.flag !== 'extra');
  // 3) 바뀜
  const swapped = cs.filter(c => compInfo(c)?.flag === 'swapped');
  // 4) 리씰 (원본 실번호와 현재가 다름)
  const norm = (s) => String(s || '').toUpperCase().replace(/[\s\-]/g, '');
  const reseal = cs.filter(c => c.sl_orig && c.sl && norm(c.sl_orig) !== norm(c.sl));
  // 5) 실오류
  const audit = auditSeals(cs);
  const sealErrs = audit.items || [];

  // 중복 제거 헬퍼
  const uniq = (arr) => { const seen = new Set(); return arr.filter(c => { if (seen.has(c.cn)) return false; seen.add(c.cn); return true; }); };
  const missing = uniq(missingFlagged);
  const extra = uniq([...extraFlagged, ...extraImplied]);

  const totalIssues = missing.length + extra.length + swapped.length + reseal.length + sealErrs.length;

  // 음성용 첫 줄 (요약 한 문장)
  const sumParts = [];
  if (missing.length) sumParts.push(`누락 ${missing.length}건`);
  if (extra.length) sumParts.push(`초과 ${extra.length}건`);
  if (swapped.length) sumParts.push(`바뀜 ${swapped.length}건`);
  if (reseal.length) sumParts.push(`리씰 ${reseal.length}건`);
  if (sealErrs.length) sumParts.push(`실오류 ${sealErrs.length}건`);

  const lines = [];
  if (totalIssues === 0) {
    lines.push('이상 건 없습니다. 신고 리스트 그대로 신고하시면 돼요.');
    lines.push('📋 양하신고 점검 — 이상 없음');
    if (pendingOnList.length) {
      lines.push('', `※ 아직 완료 안 된 컨 ${pendingOnList.length}대 있어요. 작업이 끝난 게 맞다면 누락일 수 있으니 확인하세요.`);
    }
    return lines.join('\n');
  }

  lines.push(`신고 전 확인하세요. 이상 ${totalIssues}건 — ${sumParts.join(', ')}.`);
  lines.push('📋 양하신고 점검 결과');

  if (missing.length) {
    lines.push('', `🚫 누락 ${missing.length}건 (선박에 없음 / 신고 리스트에서 빼거나 사고 보고):`);
    missing.slice(0, 20).forEach((c, i) => {
      const n = compInfo(c)?.note;
      lines.push(`  ${i + 1}. ${last4(c)}  ${c.cn || ''}${n ? ' — ' + n : ''}`);
    });
  }
  if (extra.length) {
    lines.push('', `➕ 초과 ${extra.length}건 (리스트에 없는데 내려짐 / 신고에 추가):`);
    extra.slice(0, 20).forEach((c, i) => {
      const n = compInfo(c)?.note;
      lines.push(`  ${i + 1}. ${last4(c)}  ${c.cn || ''} @ ${fmtPos(c) || '위치미상'}${n ? ' — ' + n : ''}`);
    });
  }
  if (swapped.length) {
    lines.push('', `🔄 컨테이너 바뀜 ${swapped.length}건 (신고 번호와 다른 컨이 옴):`);
    swapped.slice(0, 20).forEach((c, i) => {
      const n = compInfo(c)?.note;
      lines.push(`  ${i + 1}. 실제 ${last4(c)}  ${c.cn || ''}${n ? ' (신고: ' + n + ')' : ''}`);
    });
  }
  if (reseal.length) {
    lines.push('', `🔒 리씰 ${reseal.length}건 (현장에서 실번호 변경 — 신고서 실번호 반영):`);
    reseal.slice(0, 20).forEach((c, i) => {
      lines.push(`  ${i + 1}. ${last4(c)}  ${c.sl_orig} → ${c.sl}`);
    });
  }
  if (sealErrs.length) {
    lines.push('', `⚠ 실번호 오류 ${sealErrs.length}건 (점검 권장):`);
    sealErrs.slice(0, 20).forEach((e, i) => {
      lines.push(`  ${i + 1}. ${e.cn}  ${e.seal || ''} — ${e.reason}`);
    });
  }
  if (pendingOnList.length) {
    lines.push('', `※ 아직 완료 안 된 컨 ${pendingOnList.length}대. 작업이 끝났다면 누락 여부 확인하세요.`);
  }
  return lines.join('\n');
}

// ─── V8.00: 인수인계서 생성 ───
//   "인수인계 자료 만들어줘" → 남은 작업 + (양하 남으면)양하신고할 것 + 특이사항을 한 화면에.
//   2단계 대화: SearchPanel이 이 함수로 초안 생성 → 검수사에게 "특이사항/더 전달할 것" 되물음 →
//   답을 extraNote로 받아 다시 호출하면 메모가 합쳐진 최종본.
//   allContainers는 평택분(_ptk). 양하·선적 둘 다 _mode로 구분해 집계.
//   handoverInfo: { byInspector, voyageLabel, shipName, extraNote } (선택)
export function generateHandover(allContainers, handoverInfo = {}) {
  const cs = allContainers || [];
  const compInfo = (c) => (c._comp && typeof c._comp === 'object') ? c._comp : (c._comp ? {} : null);
  const last4 = (c) => (c.cn || '').slice(-4) || '?';

  const disch = cs.filter(c => c._mode === 'discharge');
  const load = cs.filter(c => c._mode === 'loading');
  const dischDone = disch.filter(c => c._comp).length;
  const loadDone = load.filter(c => c._comp).length;
  const dischPend = disch.length - dischDone;
  const loadPend = load.length - loadDone;

  const lines = [];
  const now = new Date();
  const hh = now.getHours(), mm = now.getMinutes();
  const ts = `${now.getMonth() + 1}/${now.getDate()} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

  // 헤더
  lines.push(`📋 인수인계서  (${ts} 작성${handoverInfo.byInspector ? ' · ' + handoverInfo.byInspector : ''})`);
  if (handoverInfo.shipName || handoverInfo.voyageLabel) {
    lines.push(`선박/항차: ${handoverInfo.shipName || ''} ${handoverInfo.voyageLabel || ''}`.trim());
  }

  // 1) 남은 작업
  lines.push('', '━━ 남은 작업 ━━');
  if (disch.length) {
    lines.push(`⬇ 양하: 남은 ${dischPend}대 / 전체 ${disch.length}대 (완료 ${dischDone})`);
  }
  if (load.length) {
    lines.push(`⬆ 선적: 남은 ${loadPend}대 / 전체 ${load.length}대 (완료 ${loadDone})`);
  }
  if (!disch.length && !load.length) lines.push('작업 데이터 없음.');

  // 남은 작업 베이 분포 (어디가 남았는지 한눈에)
  const pendBays = (arr) => {
    const set = new Set();
    arr.forEach(c => { if (!c._comp && c.bay != null) { const b = parseInt(normalizeBay(c.bay), 10); if (!isNaN(b)) set.add(b); } });
    return [...set].sort((a, b) => a - b);
  };
  if (dischPend > 0) {
    const bs = pendBays(disch);
    if (bs.length) lines.push(`  · 양하 남은 베이: ${bs.join(', ')}`);
  }
  if (loadPend > 0) {
    const bs = pendBays(load);
    if (bs.length) lines.push(`  · 선적 남은 베이: ${bs.join(', ')}`);
  }

  // 2) 양하신고할 것 (양하분이 있으면) — formatCustomsReport와 같은 판별
  if (disch.length) {
    const norm = (s) => String(s || '').toUpperCase().replace(/[\s\-]/g, '');
    const onList = (c) => c._src === 'list' || c._src === 'both';
    const missing = disch.filter(c => compInfo(c)?.flag === 'missing');
    const extra = disch.filter(c => compInfo(c)?.flag === 'extra' || (c._src === 'edi' && c._comp));
    const swapped = disch.filter(c => compInfo(c)?.flag === 'swapped');
    const reseal = disch.filter(c => c.sl_orig && c.sl && norm(c.sl_orig) !== norm(c.sl));
    const audit = auditSeals(disch);
    const sealErrs = audit.items || [];
    const uniq = (arr) => { const s = new Set(); return arr.filter(c => { if (s.has(c.cn)) return false; s.add(c.cn); return true; }); };
    const mU = uniq(missing), eU = uniq(extra);
    const totalIssues = mU.length + eU.length + swapped.length + reseal.length + sealErrs.length;

    lines.push('', '━━ 양하신고 (인계 시 처리/공유) ━━');
    if (totalIssues === 0) {
      lines.push('이상 건 없음.');
    } else {
      if (mU.length) lines.push(`🚫 누락 ${mU.length}: ${mU.slice(0, 10).map(last4).join(', ')}`);
      if (eU.length) lines.push(`➕ 초과 ${eU.length}: ${eU.slice(0, 10).map(last4).join(', ')}`);
      if (swapped.length) lines.push(`🔄 바뀜 ${swapped.length}: ${swapped.slice(0, 10).map(last4).join(', ')}`);
      if (reseal.length) lines.push(`🔒 리씰 ${reseal.length}: ${reseal.slice(0, 10).map(c => `${last4(c)}(${c.sl_orig}→${c.sl})`).join(', ')}`);
      if (sealErrs.length) lines.push(`⚠ 실오류 ${sealErrs.length}: ${sealErrs.slice(0, 10).map(e => e.cn).join(', ')}`);
    }
  }

  // 3) 특이사항 — 데이터로 잡히는 것 (리퍼 온도 미입력, 위험물, XRAY 미처리 등)
  const special = [];
  const reefers = cs.filter(c => isReeferContainer(c) && !c._comp);
  const reeferNoTmp = reefers.filter(c => !c.tmp && c.fe !== 'E' && !c.rfdry && !c.mkcon);
  // 1.86 (검수사 확정 «머스크는 리퍼가 다수입니다. 그래서 리퍼 체크를 하지 않습니다»): rfSkip 배는 온도 경고 억제.
  //  🔴 2.40 수리 — 여기 `opts` 는 **이 함수에 없는 변수**였다(generateBriefing 의 인자를 복사해 온 흔적).
  //    옵셔널 체이닝이라도 **선언 자체가 없으면 ReferenceError** 다 — 즉 「인계 알려줘」를 물었을 때
  //    리퍼 온도 미입력이 1대라도 있으면 그 자리에서 앱이 터진다. babel 스코프 검사로 잡았다.
  //    이 함수의 인자는 handoverInfo 다. rfSkip 을 받을 자리를 그쪽으로 옮긴다.
  if (reeferNoTmp.length && !handoverInfo?.rfSkip) special.push(`냉동 온도 미입력 ${reeferNoTmp.length}대 (조회 시 입력 필요)`);
  const dg = cs.filter(c => c.dg && !c._comp);
  if (dg.length) special.push(`위험물 ${dg.length}대 — 별도 취급`);
  const fr = cs.filter(c => (c.fr || c.ot) && !c._comp);
  if (fr.length) special.push(`FR/OT ${fr.length}대 — 적재 제약 주의`);
  const mk = cs.filter(c => c.mkcon && !c._comp);
  if (mk.length) special.push(`제작컨테이너 ${mk.length}대 — 컨 자체가 상품(빈 컨), 온도 없음 정상`);
  if (special.length) {
    lines.push('', '━━ 특이사항 ━━');
    special.forEach(s => lines.push(`· ${s}`));
  }

  // 4) 검수사 직접 메모 (되묻기로 받은 것)
  if (handoverInfo.extraNote && handoverInfo.extraNote.trim()) {
    lines.push('', '━━ 인계 메모 (검수사 직접 전달) ━━');
    lines.push(handoverInfo.extraNote.trim());
  }

  return lines.join('\n');
}
export function generateIntroAnswer(shipName) {
  const ship = shipName ? `지금은 ${shipName} 작업 자료로 답하고 있습니다.` : '작업 선박을 선택하면 그 자료로 답합니다.';
  return [
    `저는 탤리맨 마스터, 평택항 컨테이너 검수 도우미입니다.`,
    `${ship} (${APP_VERSION})`,
    '',
    '이렇게 물어보세요.',
    '  • "리퍼 몇 대" / "5번 베이" / "엑스레이 어디"',
    '  • "브리핑" / "실번호 점검" / "남은 거 몇 대"',
    '  • "입항 언제" / "지금 몇 시" / "날씨"',
  ].join('\n');
}

export function generateTimeAnswer(now) {
  const d = now instanceof Date ? now : new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const h24 = d.getHours();
  const ampm = h24 < 12 ? '오전' : '오후';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `지금은 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일, ${ampm} ${h12}시 ${d.getMinutes()}분입니다.`;
}

// ─── TallyOne 1.21: 기상 시각 (검수사 규칙 2026-08-07, 오답 1786028593439) ───
//   출근 = 작업시작 40분 전, 준비+운전 1시간 → **기상 = 작업시작 2시간 전**(정시 내림).
//   기준 작업시작은 ① 그 선박 일정(planDate 시작)이 아직 미래면 그것,
//   ② 이미 지났거나 없으면 다음 근무조 시작(주간 08시 / 야간 19시).
//   ⚠ 새벽엔 주간·야간을 앱이 알 수 없다 → 주간 기준으로 답하고 야간 기준을 한 줄 덧붙인다.
export const WAKE_LEAD_H = 2;          // 작업시작 − 2시간 = 기상
export const SHIFT_DAY_H = 8;          // 주간 근무 시작
export const SHIFT_NIGHT_H = 19;       // 야간 교대 시작

function _planStartDate(planDate) {
  const m = String(planDate || '').match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0, 0);
}
function _wakeFrom(start) {
  const w = new Date(start.getTime() - WAKE_LEAD_H * 3600 * 1000);
  w.setMinutes(0, 0, 0);   // 정시 내림 — "06시에 일어나셔야 합니다"
  return w;
}
const _hLabel = (d) => `${String(d.getHours()).padStart(2, '0')}시`;   // 검수사 표기: 08시·06시

export function generateWakeAnswer(info = {}, now) {
  const d = now instanceof Date ? now : new Date();
  const ship = info.vslFull || info.vsl || '';
  const shipLabel = ship ? `${ship}는` : '이 배는';

  // ① 선박 일정이 미래면 그 시각이 기준 (예: 13시 시작 → 11시 기상 / 21시 시작 → 19시 기상)
  //   TallyOne 1.22: 도선 일정(planSrc='pilot')이면 입항 시각이 아니라 **작업개시**(입항+부두별 소요)를 쓴다.
  const planStart = planWorkStart(info).start || _planStartDate(info.planDate);
  if (planStart && planStart.getTime() - d.getTime() > WAKE_LEAD_H * 3600 * 1000) {
    const w = _wakeFrom(planStart);
    return `${shipLabel} ${_hLabel(planStart)} 작업시작이니 ${_hLabel(w)}에 일어나셔야 합니다. 알람을 켜드릴까요?`;
  }

  // ② 일정이 지났거나 없으면 다음 근무조 기준
  const dayStart = new Date(d); dayStart.setHours(SHIFT_DAY_H, 0, 0, 0);
  if (dayStart.getTime() - d.getTime() <= WAKE_LEAD_H * 3600 * 1000) dayStart.setDate(dayStart.getDate() + 1);
  const nightStart = new Date(d); nightStart.setHours(SHIFT_NIGHT_H, 0, 0, 0);
  if (nightStart.getTime() - d.getTime() <= WAKE_LEAD_H * 3600 * 1000) nightStart.setDate(nightStart.getDate() + 1);

  const dayWake = _wakeFrom(dayStart), nightWake = _wakeFrom(nightStart);
  const H = d.getHours();
  // 주간이 먼저 오면 주간을 본문으로 — 21시 이후·새벽 질문이 여기 해당(다음은 아침 8시).
  const dayFirst = dayStart.getTime() <= nightStart.getTime();
  const main = dayFirst
    ? `${shipLabel} ${_hLabel(dayStart)} 작업시작이니 ${_hLabel(dayWake)}에 일어나셔야 합니다. 알람을 켜드릴까요?`
    : `${shipLabel} ${_hLabel(nightStart)} 작업시작이니 ${_hLabel(nightWake)}에 일어나셔야 합니다. 알람을 켜드릴까요?`;
  // 새벽·심야엔 주간/야간을 앱이 가릴 수 없다 → 반대 조도 한 줄로.
  const ambiguous = (H >= 21 || H < 6);
  if (!ambiguous) return main;
  return dayFirst
    ? `${main}\n야간 근무시면 ${_hLabel(nightStart)} 교대라 ${_hLabel(nightWake)} 기상입니다.`
    : `${main}\n주간 근무시면 ${_hLabel(dayStart)} 작업시작이라 ${_hLabel(dayWake)} 기상입니다.`;
}

// ─── TallyOne 1.22: 도선 → 작업개시 (검수사 확정 2026-08-07: PCTC 90분 · PNCT 120분) ───
//   ⚠ 도선 시각은 입항 시각이다. 그 시각에 작업을 시작할 수 없다 — 접안·갱웨이·크레인 세팅이 남는다.
export function generatePilotAnswer(info = {}, pf = null) {
  const ship = info.vslFull || info.vsl || '이 배';
  const pier = info.pier || getPierFromBerth(info.berth) || '';
  // 1.40-01: 도선 **입항 원본** 시각은 예보에서 가져온다(planDate 앞자리는 이미 작업시작이라
  //   거기서 역산하면 안 된다). pf 가 없으면 arr 도 없고, 아래에서 '예보 없음'으로 답한다.
  const w = planWorkStart(info, pier, pf?.nextArr);
  const fmt = (d) => d ? `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';
  const hm = (d) => d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';
  const row = (pf?.rows || []).find(r => r.dir === '입항');
  const lines = [];

  if (!w.arr) {
    return `${ship} — 도선 예보가 아직 없습니다.\n도선사협회 예보가 올라오면 입항 시각에 부두별 소요(PCTC 1시간 30분 · PNCT 2시간)를 더해 작업개시 예정을 알려 드립니다.`;
  }
  const lead = w.leadMin, leadTxt = lead % 60 === 0 ? `${lead / 60}시간` : `${Math.floor(lead / 60)}시간 ${lead % 60}분`;
  if (w.basis === 'pilot') {
    lines.push(`⚓ ${ship} — 도선 입항 ${fmt(w.arr)}${row?.side ? ` · ${row.side}` : ''}${row?.berth || info.berth ? ` · ${row?.berth || info.berth}` : ''}`);
    // 1.40-01: 소요는 실제 차이(작업시작 − 도선입항)다. 0 이하면 문구를 만들지 않는다.
    lines.push(lead > 0
      ? `🛠 작업개시 예정 ${hm(w.start)} — ${pier || '부두 미상'}은 접안 후 ${leadTxt} 걸립니다.`
      : `🛠 작업개시 예정 ${hm(w.start)}`);
    lines.push(`⚠ ${hm(w.arr)}은 도선(입항) 시각입니다. 그 시각에 작업을 시작할 수는 없습니다.`);
  } else {
    lines.push(`🛠 ${ship} — 작업 예정 ${fmt(w.start)}${info.berth ? ` · ${info.berth}` : ''}`);
    lines.push('(도선 예보가 아니라 신고·배정 일정 기준입니다.)');
  }
  if (pf?.nextDep) lines.push(`⚓ 출항 예정 ${String(pf.nextDep).slice(5)}`);
  return lines.join('\n');
}

// ─── V7.93: 트윈 작업 무게 점검 (사용자 도메인: 합계 55톤 초과 = 트윈 불가) ───
//   불균형 기준(TWIN_DIFF_WARN_KG)은 임시 10톤 — 크레인 실제 기준 확정 시 이 상수만 변경.
//   짝 규칙은 twin.js getBayPairs(pairsMap)를 주입받음 — 트윈 작업 화면과 동일 규칙 보장.
export const TWIN_MAX_TOTAL_KG = 55000;
// V7.93-02: 무게차 한계는 부두별 (사용자 확정) — 동방아이포트(PNCT) 14톤, 평택컨테이너터미널(PCTC) 20톤.
//   차이 초과 = 수평이 안 맞아 트윈 불가 (주의가 아니라 불가). 부두 미상이면 보수적으로 14톤.
export const TWIN_DIFF_LIMITS = { PNCT: 14000, PCTC: 20000 };
export function twinDiffLimit(pier) {
  return TWIN_DIFF_LIMITS[String(pier || '').toUpperCase().trim()] || 14000;
}

function is20ft(c) {
  return /^2/.test(c.iso || '') || (isoToLabel(c.iso) || '').startsWith('20');
}

// 20ft 컨테이너들을 트윈 쌍으로 묶기 — 홀수 베이 + pairsMap 짝꿍 베이 + 같은 row/tier/모드
export function buildTwinPairs(containers, pairsMap) {
  const c20 = containers.filter(c => is20ft(c) && c.bay && c.row && c.tier);
  const byPos = new Map();
  c20.forEach(c => byPos.set(`${c._mode}|${parseInt(c.bay, 10)}|${c.row}|${c.tier}`, c));
  const used = new Set();
  const out = [];
  c20.forEach(a => {
    if (used.has(a.cn)) return;
    const b1 = parseInt(a.bay, 10);
    if (!Number.isFinite(b1) || b1 % 2 === 0) return;
    const pb = pairsMap?.[String(b1)];
    if (!pb) return;
    const b = byPos.get(`${a._mode}|${parseInt(pb, 10)}|${a.row}|${a.tier}`);
    if (!b || used.has(b.cn) || b.cn === a.cn) return;
    used.add(a.cn); used.add(b.cn);
    out.push([a, b]);
  });
  return out;
}

// 쌍 분석: ok / over(55톤 초과) / imbal(차이 큼) / noWt(무게 미상)
export function analyzeTwinPairs(pairs, diffLimitKg = 14000) {
  const r = { ok: [], over: [], diff: [], noWt: [] };
  for (const [a, b] of pairs) {
    const wa = parseInt(a.wt, 10) || 0, wb = parseInt(b.wt, 10) || 0;
    if (!wa || !wb) { r.noWt.push({ a, b, wa, wb }); continue; }
    const total = wa + wb, diff = Math.abs(wa - wb);
    if (total > TWIN_MAX_TOTAL_KG) r.over.push({ a, b, wa, wb, total, diff });
    else if (diff > diffLimitKg) r.diff.push({ a, b, wa, wb, total, diff });
    else r.ok.push({ a, b, wa, wb, total, diff });
  }
  return r;
}

const t1 = (kg) => (kg / 1000).toFixed(1).replace(/\.0$/, '');
const pairPos = (p) => `${fmtPos(p.a)} ↔ ${fmtPos(p.b)}`;
const pairCn = (p) => `${p.a.cn?.slice(-4) || '?'}·${p.b.cn?.slice(-4) || '?'}`;

export function generateTwinCheckAnswer(parsed, containers, pairsMap, pier = '') {
  // 베이 지정: "20번 베이 트윈" — 짝수로 물어도 양옆 홀수 쌍 포함 (N-1·N·N+1)
  let pool = containers;
  let scope = '전체';
  if (parsed.bay) {
    const n = parseInt(parsed.bay, 10);
    pool = containers.filter(c => Math.abs(parseInt(c.bay, 10) - n) <= 1);
    scope = `${n}번 베이`;
  }
  const pairs = buildTwinPairs(pool, pairsMap);
  if (!pairs.length) return `${scope} 트윈 쌍이 없습니다. (단독 베이이거나 같은 열·단의 20피트 짝이 없음)`;
  const limit = twinDiffLimit(pier);
  const pierLabel = TWIN_DIFF_LIMITS[String(pier || '').toUpperCase().trim()] ? String(pier).toUpperCase() : '부두 미상·보수 기준';
  const r = analyzeTwinPairs(pairs, limit);
  const bad = r.over.length + r.diff.length;
  const lines = [];
  // 첫 줄 = 음성용 한 문장
  if (bad) lines.push(`${scope} 트윈 불가 ${bad}쌍 — ${[r.over.length ? '무게 초과' : null, r.diff.length ? '무게차 초과' : null].filter(Boolean).join('·')}. 위치 확인하세요.`);
  else if (r.noWt.length && !r.ok.length) lines.push(`${scope} 트윈 ${pairs.length}쌍 — 무게 정보가 없어 판단 불가.`);
  else lines.push(`${scope} 트윈 ${pairs.length}쌍 모두 가능합니다.`);
  if (r.over.length) {
    lines.push('', `🚫 무게 초과 (합계 55톤↑) — 트윈 불가, 싱글 작업:`);
    r.over.forEach(p => lines.push(`  • ${pairPos(p)} — 합계 ${t1(p.total)}톤 (${t1(p.wa)}+${t1(p.wb)}) ${pairCn(p)}`));
  }
  if (r.diff.length) {
    lines.push('', `🚫 무게차 초과 (${pierLabel} 한계 ${t1(limit)}톤↑) — 수평 불가, 싱글 작업:`);
    r.diff.forEach(p => lines.push(`  • ${pairPos(p)} — 차이 ${t1(p.diff)}톤 (${t1(p.wa)}/${t1(p.wb)}) ${pairCn(p)}`));
  }
  if (r.noWt.length) {
    lines.push('', `❓ 무게 미상 ${r.noWt.length}쌍 — EDI 무게 확인 필요:`);
    r.noWt.slice(0, 6).forEach(p => lines.push(`  • ${pairPos(p)} ${pairCn(p)}`));
  }
  if (r.ok.length) {
    const maxOk = Math.max(...r.ok.map(p => p.total));
    lines.push('', `✅ 가능 ${r.ok.length}쌍 (최대 합계 ${t1(maxOk)}톤)`);
  }
  return lines.join('\n');
}


// TallyOne 2.41: 미르 — 선박 연락처(이메일). RTDB shipContacts/{code} = { onboard:[{email,name,last}], contacts:[{email,name,last}] }.
//   검수사 원문 «우리는 선박에 자료를 주고 확답을 받아야 합니다»(본선 일항사와 메일로 컨펌) ·
//   «수석이 PCSZ 이메일이 뭐지 물으면 답만 해주면 됩니다»(미르는 답만 — 발송·확답 추적은 범위 밖) ·
//   «어떤이유로든 연관이 있으니까 그 주소가 있을것이니까»(본선 아닌 연락처도 버리지 않는다).
//   ⛔ 모르면 모른다 — 주소를 지어내지 않는다(일항사에게 보내는 주소라 틀리면 남의 배로 간다).
export function generateContactAnswer(entry, shipLabel, onboardOnly = false) {
  const label = shipLabel || '그 배';
  const onboard = Array.isArray(entry?.onboard) ? entry.onboard.filter((x) => x && x.email) : [];
  const contacts = Array.isArray(entry?.contacts) ? entry.contacts.filter((x) => x && x.email) : [];
  const fmt = (x) => `  • ${x.email}${x.name ? ` (${x.name})` : ''}${x.last ? ` — 최근 ${x.last}` : ''}`;
  if (!entry || (!onboard.length && !contacts.length)) {
    return `${label} 연락처를 아직 모릅니다 — 수집기가 메일에서 확인하는 대로 답해 드리겠습니다.`;
  }
  if (onboardOnly) {
    if (!onboard.length) return `${label} 본선 주소는 아직 모릅니다. ("${label} 이메일"이라고 물으면 다른 연락처는 있는지 확인해 드립니다)`;
    return [`📧 ${label} 본선`, ...onboard.map(fmt)].join('\n');
  }
  const L = [];
  if (onboard.length) L.push(`📧 ${label} 본선`, ...onboard.map(fmt));
  if (contacts.length) { if (L.length) L.push(''); L.push(`✉ ${label} 관련 연락처`, ...contacts.map(fmt)); }
  return L.join('\n');
}

// V8.60: 맛집 돌림판 안내 답변 — 첫 줄은 음성으로 읽힌다.
export function generateFoodAnswer(slot) {
  const label = { breakfast: '아침', lunch: '점심', dinner: '저녁', night: '야식', any: '식사' }[slot] || '식사';
  return `🎰 ${label} 뭐 먹을지 돌림판으로 정해 드릴게요!\n\n음성이면 잠시 후 돌림판이 자동으로 열립니다. 아래 버튼으로 바로 돌릴 수도 있어요.\n(홈 화면 🍽 맛집 메뉴에서 식당 추가·별점도 가능합니다.)`;
}


//  ★ 2.59-01: 방법(how) 답 한 벌 — 본체(_localAnswerCore)와 통합검색(홈)이 같은 것을 부른다.
//    검수사 실측 «천정에 구멍이 뚫렸다고 하는데 어떻게 처리해야 하지» — 홈은 how 배선이 없어
//    답 없이 카드 100+대만 쏟아졌다(화법 규칙 3 위반). 실무 지식(원장) → 기능 방법(매뉴얼) 순.
export function answerHowCore(parsed) {
  const raw = parsed._raw || '';
  let h = null;
  try { h = mirKnowledge(raw); } catch (e) { console.warn('[2.58] 실무지식(방법) 실패:', e); }
  //  ★ 2.60-01 (클로드 주관 시험 실측): 상황 서술(«문이 안 잠겨 있는데 어떻게»)에 원장이 없으면
  //    기능 색인이 아무 낱말로 가로채 오답을 냈다(«문» → 화면 밝기, «크레인» → 장비 번호,
  //    «남는데» → 이름 고르기 — 30문 시험에서 색인 오답 다수). 상황 서술 + 원장 침묵이면 색인으로
  //    흘리지 않고 null 로 고백까지 흘려보낸다 — 고백은 mir_unanswered 로 신고돼 가르침의 관에 잡힌다.
  //    기능 질문(«양하확인 어떻게 해»)은 상황 서술 어미가 없어 색인이 종전대로 답한다.
  //    앱·화면 상황(«화면이 어두운데»)은 색인이 정답이라 예외 — 앱 낱말이 있으면 색인을 살린다.
  const _situ = /(?:는데|은데|인데)\s/.test(raw)
    && !/화면|버튼|앱|글씨|글자|소리|카메라|로그인|배너|메뉴|입력|검색|카드/.test(raw);
  if (!h && !_situ) { try { h = generateHowToAnswer(raw, parsed); } catch (e) { console.warn('[2.58] 기능방법 실패:', e); } }
  return h;
}

export function generateLocalAnswer(parsed, results, allContainers, ctx = null) {
  // ★ 2.55: **완료가 오는 길이 화면마다 다르다.** 통합검색(SearchPanel)의 컨에는 `_comp` 가 붙어 오는데,
  //   항차 화면(VoyagePage)의 `containers` 에는 없고 완료는 `ctx.compMap` 으로 **따로** 온다.
  //   2.52-01 은 이 구멍을 `mirEyes` 에서만 메웠다 — `nlSearch` 안에는 `compMap` 참조가 **0건**이라,
  //   검수사가 실제로 쓰는 양하 탭에서 진행·잔여·페이스가 전부 «완료 0» 으로 나왔다
  //   (실측 STSE 2665E — 앱에 116대가 찍혀 있는데 «완료 0대 / 남은 449대» 라고 답했다).
  //   ⇒ **여기서 한 번만** 입혀 내린다. 그러면 formatProgress·generateBriefing·formatEta 가 같은 값을 본다.
  const _cm = ctx && ctx.compMap;
  if (_cm && Array.isArray(allContainers) && allContainers.length && !allContainers.some((c) => c && c._comp)) {
    const _wear = (c) => (c && !c._comp && _cm[c.cn] ? { ...c, _comp: _cm[c.cn] } : c);
    allContainers = allContainers.map(_wear);
    if (Array.isArray(results)) results = results.map(_wear);
  }
  const out = _localAnswerCore(parsed, results, allContainers, ctx);
  if (!out || typeof out !== 'string') return out;
  //  위치를 묻는 갈래에서만 본다 — 대수·온도 질문에까지 붙이면 잔소리가 된다.
  const asksPos = !!(parsed && (parsed.posQuery || parsed.digits || parsed.listQuery || parsed.bayDistQuery));
  if (!asksPos) return out;
  const all = allContainers || [];
  //  화물은 있는데 **한 대도** 자리를 모른다 = 적부도(EDI)가 아직 안 왔다.
  //  (한두 대만 비는 것은 다른 사정이므로 여기서 말하지 않는다.)
  if (!all.length || all.some((c) => c && (c.pos || c.bay))) return out;
  return out + '\n\n⚠ 양하 EDI(적부도)가 아직 안 와서 **선내 위치를 모릅니다.**\n   지금 보이는 목록은 양하 리스트 것이고, EDI 가 도착하면 위치가 저절로 채워집니다.';
}
