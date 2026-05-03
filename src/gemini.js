// Gemini API 연동 (자유 자연어 검수 도우미)
// - 키워드 매칭 안 되는 자유 질문 처리
// - 항차 데이터 컨텍스트로 보내서 진짜 AI 답변
// - 무료 할당량: 분당 15 / 일 1500 (충분)

const GEMINI_API_KEY = 'AIzaSyDPRM3bRGusAwhyhjGGka2K1m2r6c5gJKY';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// 항차 컨텍스트 요약 (토큰 절약)
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
    stats,
    isoCount,
    opCount,
  };
}

// 컨테이너 검색 결과 컨텍스트
function buildContainerContext(matches) {
  if (!matches || matches.length === 0) return '검색 결과 없음';
  return matches.slice(0, 30).map(c => ({
    cn: c.cn,
    pos: c.bay ? `${c.bay}-${c.row}-${c.tier}` : '',
    iso: c.iso,
    fe: c.fe,
    wt: c.wt,
    sl: c.sl,
    op: c.op,
    pol: c.pol,
    pod: c.pod,
    mode: c._mode,
    xray: c._xray,
    rf: c.rf,
    dg: c.dg,
    tmp: c.tmp,
    completed: !!c._comp,
  }));
}

// AI 질의
export async function askGemini(question, voyage, allContainers, matches = null) {
  const ctx = buildContext(voyage, allContainers);
  const containerCtx = matches ? buildContainerContext(matches) : null;

  const systemPrompt = `당신은 평택항 컨테이너 검수원의 AI 도우미입니다.
주어진 항차 데이터를 기반으로 질문에 정확하고 간결하게 답변하세요.

규칙:
1. 데이터에 없는 내용은 추측하지 마세요. "데이터에 없음"이라고 답하세요.
2. 답변은 한국어로 짧고 명확하게 (2-3문장 이내)
3. 숫자가 있으면 정확히 표시
4. 검수 작업 흐름에 도움되는 실용적 답변
5. 검수원이 손에 폰 들고 빠르게 읽을 수 있도록 핵심만`;

  const userContent = `[항차 정보]
선박: ${ctx.vsl} / 항차: ${ctx.voy}

[전체 통계]
- 총 컨테이너: ${ctx.stats.total}대
- 양하: ${ctx.stats.discharge} / 선적: ${ctx.stats.loading}
- Full: ${ctx.stats.full} / Empty: ${ctx.stats.empty}
- 리퍼: ${ctx.stats.rf} / DG: ${ctx.stats.dg} / FR: ${ctx.stats.fr} / OT: ${ctx.stats.ot} / TK: ${ctx.stats.tk}
- X-RAY: ${ctx.stats.xray}
- 완료: ${ctx.stats.completed}/${ctx.stats.total}

[ISO 분포] ${JSON.stringify(ctx.isoCount)}
[검수업체] ${JSON.stringify(ctx.opCount)}

${containerCtx ? `[검색 결과 (최대 30개)]\n${JSON.stringify(containerCtx)}\n` : ''}

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
          temperature: 0.3,  // 일관된 답변
          maxOutputTokens: 300,
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
