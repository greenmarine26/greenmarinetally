// Gemini API 연동 (자유 자연어 검수 도우미)
// M3.0 — AI 마무리:
//   1) 항만/검수/IMDG 도메인 지식 시스템 프롬프트 주입
//   2) 전체 컨테이너 데이터를 압축 형식으로 전달 (베이별 답변 가능)
//   3) POL/POD 분포 자동 집계
//   4) 베이별 컨 개수/F·E/무게 미리 집계
//   5) 위험물(DG) 별도 리스트 + 클래스별 집계
//   6) 선박 라이브러리(이전 항차 평균) 컨텍스트 활용
// M3.1 — 베이 좌표 정규화:
//   - 좌표는 모두 정규화된 형식(##-##-## or ###-##-##)으로 AI에게 전달
//   - AI가 위치 답변 시 한국어 음성형으로 풀어서 답하도록 시스템 프롬프트에 규칙 추가
//
// 무료 할당량: 분당 15 / 일 1500 (15명 × 50회 = 750회 → 50% 사용)

import { fmtPos, normalizeBay } from './utils.js';

export const GEMINI_API_KEY = 'AIzaSyDPRM3bRGusAwhyhjGGka2K1m2r6c5gJKY';
const GEMINI_MODEL = 'gemini-2.5-pro';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// ─── 도메인 지식 시스템 프롬프트 ───────────────────────────────
// 항만/검수/IMDG 용어를 AI가 정확히 이해하도록 주입
const DOMAIN_KNOWLEDGE = `
[항만 도메인 지식 — 평택항 컨테이너 검수]

■ 항구 코드 (POL=선적항, POD=양하항)
- KRPTK = 평택 (한국, 우리 항구)
- CNDLC = 대련 (중국)
- CNQDG = 청도 (중국)
- CNWEI = 위해 (중국)
- CNSHA = 상해 (중국)
- CNTAO = 청도(별칭)
- CNYAT = 연태 (중국)
- 그 외 KR* 한국, CN* 중국, JP* 일본, US* 미국 등

■ 컨테이너 ISO 규격 (앞 2자리 = 길이/높이, 뒤 2자리 = 종류)
- 22GP = 20피트 표준 (20DC)
- 25GP = 20피트 하이큐브 (20HC)
- 22RE = 20피트 리퍼 (20RF)
- 42GP = 40피트 표준 (40DC)
- 45GP = 40피트 하이큐브 (40HC)
- 45RE = 40피트 하이큐브 리퍼 (40HC RF)
- 42PC = 40피트 플랫랙 (40FR, Platform Container)
- 46P3 = 45피트 플랫랙 (45FR)
- 22UT = 20피트 오픈탑 (20OT)
- 22TG = 20피트 탱크 (20TK)

■ 상태 (F/E)
- F = Full (적컨, 화물 있음)
- E = Empty (공컨, 빈 컨테이너)

■ 선내 위치 (좌표 BBBRRTT = 베이3+row2+tier2)
- 베이(Bay): 선수→선미 방향 위치 (홀수=20피트 슬롯, 짝수=40피트 슬롯)
- 트윈 짝꿍: 짝수 베이가 있으면 양옆 홀수 베이가 짝, 짝수 없으면 통로(단독)
- Row: 좌우 위치 (00=중앙, 01/03... 우현, 02/04... 좌현)
- Tier: 높이 (≥80 = DECK 갑판상, <80 = HOLD 화물창)

■ 무게 (단위 KGM = kg)
- TARE = 빈 컨테이너 무게
- NET = 화물만 무게
- GROSS = 총중량 (TARE+NET)
- VGM = 검증된 총중량 (Verified Gross Mass, 우선 사용)

■ 특수화물 약어
- RF (Reefer) = 리퍼/냉장 (온도 관리, TMP 필드)
- DG (Dangerous Goods) = 위험물 (IMDG 코드, UN번호)
- FR (Flat Rack) = 플랫랙 (옆면 없음, 큰 화물)
- OT (Open Top) = 오픈탑 (위 열림)
- TK (Tank) = 탱크 (액체)
- OOG (Out Of Gauge) = 규격외 화물

■ 검수 워크플로
- 양하 (Discharge) = 배에서 내림 (POD=평택)
- 선적 (Loading) = 배에 실음 (POL=평택)
- 시프팅 (Shifting) = 양하 위에 올라간 컨을 임시로 옮기기
- 봉인(SEAL) = 컨테이너 잠금 봉인번호 검사
- 실오류 = 봉인번호 불일치 (검사 필요)
- TWIN = 트윈 트레일러 (20피트 두 개 동시 양/적하)
- X-RAY = 엑스레이 검사 대상 컨 (세관 지정)

■ 다단계 적재
- 같은 슬롯(좌표)에 여러 컨이 들어갈 수 있음 (FR 4개 한 자리 등)
- 베이플랜에서 ⊕N으로 표시

[IMDG 위험물 격리 규정]

■ 9개 클래스
1 = 폭발물 (Explosives)
2 = 가스 (2.1 인화성, 2.2 비독성, 2.3 독성)
3 = 인화성 액체 (Flammable Liquids)
4 = 가연성 고체 (4.1, 4.2 자연발화, 4.3 물반응)
5 = 산화성 물질 (5.1 산화제, 5.2 유기과산화물)
6 = 독성/감염성 물질 (6.1 독성, 6.2 감염성)
7 = 방사성 물질 (Radioactive)
8 = 부식성 (Corrosive)
9 = 기타 위험물 (Miscellaneous)

■ 격리 등급 (Segregation)
- 1 = "Away from" (떨어져, 같은 베이/구획 안에서 분리)
- 2 = "Separated from" (분리, 다른 격실 또는 1컨 거리)
- 3 = "Separated by complete compartment" (격실 완전 분리)
- 4 = "Separated longitudinally by complete compartment" (수평 격실 분리, 가장 엄격)

■ 트윈/인접 적재 가부 판단 원칙
- Class 1 (폭발물) ↔ 대부분 클래스: Separated 이상 → 트윈 불가
- Class 2.1 (인화성 가스) ↔ Class 3 (인화성 액체): Separated → 트윈 불가
- Class 3 ↔ Class 5: Separated → 트윈 불가
- Class 4.2 (자연발화) ↔ Class 8 (부식성): Separated → 트윈 불가
- Class 7 (방사성) ↔ 거주구역/식품: Separated 이상
- 같은 클래스끼리는 일반적으로 인접 가능 (예외: 1.1, 1.2 등)
- 정확한 격리표는 IMDG Code 7.2.4 참조 (실제 화물 UN번호 확인 필수)
`.trim();

// ─── 컨테이너 압축 (토큰 절약) ───────────────────────────────
// allContainers 전체를 AI에게 보내되, 필수 필드만 추려서
// M3.1: 좌표는 정규화된 형식(##-##-## or ###-##-##)으로 전달
function compactContainer(c) {
  const o = {
    cn: c.cn,
    p: fmtPos(c),  // 정규화된 위치 (앞 0 제거된 베이)
    iso: c.iso,
    fe: c.fe,
    m: c._mode === 'discharge' ? 'D' : 'L',  // D=양하, L=선적
  };
  if (c.wt) o.wt = c.wt;
  if (c.pol) o.pol = c.pol;
  if (c.pod) o.pod = c.pod;
  if (c.sl) o.sl = c.sl;
  if (c._xray) o.x = 1;
  if (c._comp) o.done = 1;
  if (c.rf || (c.iso && c.iso[2] === 'R')) {
    o.rf = 1;
    if (c.tmp) o.tmp = c.tmp;
  }
  if (c.dg) {
    o.dg = 1;
    if (c.dgc) o.dgc = c.dgc;
    if (c.un) o.un = c.un;
  }
  if (c.fr || /^[24][0245689]P/.test(c.iso || '')) o.fr = 1;
  if (c.ot) o.ot = 1;
  if (c.tk) o.tk = 1;
  return o;
}

// ─── 베이별 통계 미리 집계 ───────────────────────────────
// M3.1: 베이 키도 정규화된 정수 문자열로 통일
function buildBayStats(allContainers) {
  const bayMap = {};
  allContainers.forEach(c => {
    if (!c.bay) return;
    const b = normalizeBay(c.bay);
    if (!b) return;
    if (!bayMap[b]) {
      bayMap[b] = { total: 0, F: 0, E: 0, deck: 0, hold: 0, wt: 0, rf: 0, dg: 0 };
    }
    bayMap[b].total++;
    if (c.fe === 'F') bayMap[b].F++;
    else if (c.fe === 'E') bayMap[b].E++;
    const tier = parseInt(c.tier, 10) || 0;
    if (tier >= 80) bayMap[b].deck++;
    else bayMap[b].hold++;
    const w = parseInt(c.wt, 10) || 0;
    bayMap[b].wt += w;
    if (c.rf || (c.iso && c.iso[2] === 'R')) bayMap[b].rf++;
    if (c.dg) bayMap[b].dg++;
  });
  return bayMap;
}

// ─── POL/POD 분포 ───────────────────────────────
function buildPolPodDist(allContainers) {
  const pol = {}, pod = {};
  allContainers.forEach(c => {
    if (c.pol) pol[c.pol] = (pol[c.pol] || 0) + 1;
    if (c.pod) pod[c.pod] = (pod[c.pod] || 0) + 1;
  });
  return { pol, pod };
}

// ─── 위험물 리스트 + 클래스별 ───────────────────────────────
function buildDgList(allContainers) {
  const list = [];
  const byClass = {};
  allContainers.forEach(c => {
    if (!c.dg) return;
    const cls = c.dgc || '?';
    byClass[cls] = (byClass[cls] || 0) + 1;
    list.push({
      cn: c.cn,
      pos: fmtPos(c),  // M3.1: 정규화된 위치
      cls,
      un: c.un || '',
      fe: c.fe,
    });
  });
  return { list, byClass };
}

// ─── 항차 컨텍스트 요약 ───────────────────────────────
function buildContext(voyage, allContainers) {
  const stats = {
    total: allContainers.length,
    discharge: allContainers.filter(c => c._mode === 'discharge').length,
    loading: allContainers.filter(c => c._mode === 'loading').length,
    full: allContainers.filter(c => c.fe === 'F').length,
    empty: allContainers.filter(c => c.fe === 'E').length,
    rf: allContainers.filter(c => c.rf || (c.iso && c.iso[2] === 'R')).length,
    dg: allContainers.filter(c => c.dg).length,
    fr: allContainers.filter(c => c.fr || /^[24][0245689]P/.test(c.iso || '')).length,
    ot: allContainers.filter(c => c.ot).length,
    tk: allContainers.filter(c => c.tk).length,
    xray: allContainers.filter(c => c._xray).length,
    completed: allContainers.filter(c => c._comp).length,
  };

  // ISO별 분포
  const isoCount = {};
  allContainers.forEach(c => {
    const iso = c.iso || 'unknown';
    isoCount[iso] = (isoCount[iso] || 0) + 1;
  });

  // 검수업체별
  const opCount = {};
  allContainers.forEach(c => {
    if (c.op) opCount[c.op] = (opCount[c.op] || 0) + 1;
  });

  return {
    vsl: voyage?.info?.vsl || '',
    voy: voyage?.info?.voy || '',
    imo: voyage?.info?.imo || '',
    pol_voy: voyage?.info?.pol || '',
    etd: voyage?.info?.etd || '',
    eta: voyage?.info?.eta || '',
    stats,
    isoCount,
    opCount,
  };
}

// ─── 메인: AI 질의 ───────────────────────────────
// shipLib: 선박 라이브러리(이전 항차 통계) - 옵션
export async function askGemini(question, voyage, allContainers, shipLib = null) {
  const ctx = buildContext(voyage, allContainers);
  const bayStats = buildBayStats(allContainers);
  const polPod = buildPolPodDist(allContainers);
  const dgInfo = buildDgList(allContainers);

  // 컨테이너 압축 (전체 전달, 토큰 절약 형태)
  const compactList = allContainers.map(compactContainer);

  // 토큰 한도 보호 (최대 1500대까지 전달, 초과 시 자르고 안내)
  const MAX_CONTAINERS = 1500;
  const truncated = compactList.length > MAX_CONTAINERS;
  const sentList = truncated ? compactList.slice(0, MAX_CONTAINERS) : compactList;

  const systemPrompt = `당신은 평택항 컨테이너 검수원의 AI 도우미입니다.
주어진 항차 데이터(전체 컨테이너 목록 + 베이별 통계 + POL/POD 분포 + 위험물 리스트)를
기반으로 질문에 정확하고 간결하게 답변하세요.

${DOMAIN_KNOWLEDGE}

[답변 규칙]
1. 데이터에 없는 내용은 절대 추측하지 말고 "데이터에 없음"이라고 답하세요.
2. 답변은 한국어로 짧고 명확하게 (2~4문장 이내, 단 리스트는 더 길어도 됨).
3. 숫자는 정확히 표시하고, 컨번호는 4자리 끝번호 위주로 알려주세요.
4. 위치는 베이-row-tier 형식 (예: 16-01-86, 또는 100-04-82) — 베이는 앞 0 없는 정수입니다.
5. ★ 음성 안내 친화 답변: 위치를 말할 때는 "16-01-86"처럼 숫자 형식으로 답하세요.
   (음성 합성기가 자동으로 "십육번 베이 공일에 팔육"으로 변환합니다)
6. 검수원이 손에 폰 들고 빠르게 읽을 수 있도록 핵심만 답하세요.
7. 위험물 트윈 가부 질문 시 IMDG 격리 등급으로 판단하되, "정확한 판단은 IMDG Code 격리표 확인 필요" 한 줄 추가하세요.
8. 베이별 답변, POL/POD별 집계, 무게 합계 등 계산이 필요하면 제공된 데이터로 직접 계산하세요.
9. 베이 번호는 정수("1", "16", "100")이며 앞에 0을 붙이지 마세요.`;

  const shipLibBlock = shipLib ? `
[선박 라이브러리 — 이전 항차 평균 (학습된 패턴)]
${JSON.stringify({
  total_voyages: shipLib.stats?.total_voyages || 0,
  avg_discharge: shipLib.stats?.total_discharge && shipLib.stats?.total_voyages
    ? Math.round(shipLib.stats.total_discharge / shipLib.stats.total_voyages) : 0,
  avg_loading: shipLib.stats?.total_loading && shipLib.stats?.total_voyages
    ? Math.round(shipLib.stats.total_loading / shipLib.stats.total_voyages) : 0,
  recent_voyages: shipLib.voyages ? Object.keys(shipLib.voyages).slice(-3) : [],
})}
` : '';

  const userContent = `[항차 정보]
선박: ${ctx.vsl} / 항차: ${ctx.voy} / IMO: ${ctx.imo}
ETD: ${ctx.etd} / ETA: ${ctx.eta}

[전체 통계]
- 총 컨테이너: ${ctx.stats.total}대
- 양하: ${ctx.stats.discharge} / 선적: ${ctx.stats.loading}
- Full: ${ctx.stats.full} / Empty: ${ctx.stats.empty}
- 리퍼: ${ctx.stats.rf} / DG: ${ctx.stats.dg} / FR: ${ctx.stats.fr} / OT: ${ctx.stats.ot} / TK: ${ctx.stats.tk}
- X-RAY: ${ctx.stats.xray}
- 완료: ${ctx.stats.completed}/${ctx.stats.total}

[ISO 분포] ${JSON.stringify(ctx.isoCount)}

[검수업체] ${JSON.stringify(ctx.opCount)}

[POL 분포 (선적항별 컨 수)] ${JSON.stringify(polPod.pol)}

[POD 분포 (양하항별 컨 수)] ${JSON.stringify(polPod.pod)}

[베이별 통계] (베이번호: {total/F/E/deck/hold/wt합계kg/rf/dg})
${JSON.stringify(bayStats)}

[위험물(DG) 클래스별 집계] ${JSON.stringify(dgInfo.byClass)}

[위험물(DG) 컨테이너 리스트]
${JSON.stringify(dgInfo.list)}
${shipLibBlock}
[전체 컨테이너 목록 (압축, ${sentList.length}/${compactList.length}대)]
필드 약어: cn=컨번호, p=위치(bay-row-tier), iso=ISO코드, fe=F/E, m=D양하/L선적,
wt=무게kg, pol=선적항, pod=양하항, sl=실번호, x=X-RAY, done=완료,
rf=리퍼, tmp=온도, dg=위험물, dgc=클래스, un=UN번호, fr=플랫랙, ot=오픈탑, tk=탱크
${JSON.stringify(sentList)}
${truncated ? `\n※ 컨이 너무 많아 ${MAX_CONTAINERS}대만 전달함. 전체는 통계 참고.` : ''}

[질문]
${question}`;

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: systemPrompt + '\n\n' + userContent }],
        }],
        generationConfig: {
          temperature: 0.2,  // 일관된 답변 (M3.0: 더 엄격)
          maxOutputTokens: 600, // M3.0: 베이별/리스트 답변 위해 확대
        },
      }),
    });
    if (!res.ok) {
      const errTxt = await res.text();
      console.error('Gemini API error:', errTxt);
      return { ok: false, error: `API 오류 (${res.status}): ${errTxt.slice(0, 100)}` };
    }
    const data = await res.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!answer) return { ok: false, error: '답변이 비어있음' };
    return { ok: true, answer: answer.trim() };
  } catch (e) {
    console.error('Gemini fetch error:', e);
    return { ok: false, error: `네트워크 오류: ${e.message}` };
  }
}

// 질문이 자유 자연어인지 키워드 검색인지 판단
export function isFreeFormQuestion(text) {
  if (!text) return false;
  const t = text.trim();
  // 4자리 숫자만 → 컨번호 검색
  if (/^\d+$/.test(t)) return false;
  // 짧은 키워드 → 키워드 검색
  if (t.length < 4) return false;
  // 물음표, 의문사, 길이가 길면 자유 질문
  if (/\?|왜|어떻게|뭐|무엇|어디|언제|누가|얼마/.test(t)) return true;
  if (t.length >= 8) return true;
  return false;
}
