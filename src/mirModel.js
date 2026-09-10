// 미르의 모델 창구 — 규칙이 못 받거나 «약하게» 받은 말만 공용 키(검수사 부담)로 모델에 보내 ①미르 말로 번역해 규칙을 다시 돌리고 ②그래도 없으면 항차 자료를 실어 문장으로 답한다(판 B).
/* ★ TallyOne 3.42 / ConeOne 2.49 (판 B — 검수사 2026-09-10 «그간의 사용데이터로 생각하면 안됩니다 … 어떤질문이 들어 올지는 저도 모릅니다.
     제가 원하는건 그질문들에 적당한 답을 해주길 원합니다» · 관문 4 «계속 진행해주세요»)

   모델은 **여기 한 함수(askMirModel) 뒤에만** 있다. 규칙(mirAnswer.answerOneRaw)이 먼저이고, 아래 둘일 때만 부른다.
     ① 규칙이 null ② «약한 답» — 잡아채는 길(mirAnswer `_trace.via`: 사용법 매뉴얼·현재 시각·되묻기·베이사전 타령·진행 잡답·지식 추측·
        콘 안내·못 배움)에서 나왔거나, 질문에 미르가 모르는 낱말이 남았을 때(mirLeftover).
   1단계 번역 — 질문 + «미르가 아는 말 목록»만 보낸다(자료 0건). 번역이 규칙 답으로 이어지면 mir_lexicon 에 auto 로 적는다(mirLearnAlias 한 벌).
   2단계 자료 답 — 요약 + 미리 계산한 사실 + 질문에 맞는 컨 30줄만 싣는다. 전체 목록을 실었더니 모델이 없는 컨을 지어냈다(관문 4 실측
     «0230 24100kg») — 그래서 관련 줄만 싣고 **답 속 숫자가 자료에 없으면 답을 버린다**(문지기). 답 끝에 (AI) 표시.
   문지기 — 키·모델·하루 상한은 RTDB `mir_config` 한 칸(키가 없으면 개인 키, 둘 다 없으면 침묵) · 같은 문장은 한 세션에 한 번 ·
     10초 타임아웃 · 하루 상한(mir_model_log 오늘 줄 수) · 실패는 조용히 «못 배웠어요» 로 돌아가되 콘솔에 남긴다(빈 catch 금지).
   콘앱도 같은 번들(mir-core.js)로 이 함수를 쓴다 — 그래서 firebase SDK 없이 REST 로만 읽고 쓴다. */
import { parseNaturalQuery } from './nlSearch.js';
import { mirLearnAlias, mirKey, mirRewrite } from './mirLearn.js';

const FB = 'https://greenmarinetally-default-rtdb.asia-southeast1.firebasedatabase.app';
const GEM = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const DEFAULT_CAP = 300;
const CFG_TTL = 10 * 60 * 1000;
const TIMEOUT_MS = 10000;

// ── 미르가 모르는 낱말 — 종전 SearchPanel 음성 교정의 KNOWN 표를 한 벌로 옮기고(거기 사본은 지웠다) **토큰 사전**으로 바꿨다.
//   감사 실측(3.42 첫 판): 부분 문자열 정규식은 «시프팅»에서 «시»를 떼어 «프팅»을 모르는 낱말로 만들었고, 창구 예시 84개 중 22개가 «모르는 낱말 남음»이었다.
//   그래서 ① mirTokens(조사·문장부호 제거) 로 낱말을 자르고 ② 사전(아래 낱말 + 창구 예시의 낱말 전부)에 있으면 아는 말, ③ 사전 낱말이 앞머리로 붙은 것(«리퍼가»)·
//   흔한 어미(했어·열었어·됐어…)를 뗀 것도 아는 말로 본다. 한 글자 낱말은 세지 않는다.
const KNOWN_WORDS = `베이 리퍼 냉동 엠티 풀 위험물 디지 엑스레이 갑판 데크 홀드 선창 컨테이너 피트 온도 영하 영상 실번호 씰 무게 톤 위치 어디 몇 대 개 남은 남았 완료 진행 전체 전부 모두 몽땅 싹 죄다 도합 통틀어 합쳐 합치 수량 불러 뽑아 달라 다오 내렸 내린 누구 누가 소개 시야 시간 지금 오늘 내일 어제 날씨 기온 바람 입항 출항 입출항 접안 언제 며칠 요일 날짜 트윈 가능 불가 초과 불균형 수평 크레인 목록 리스트 양하 선적 쌓 빈자리 자리 평택 끝 끝나 끝났 페이스 속도 퇴근 점심 저녁 아침 걸려 걸리 예상 마치 종료 신고 세관 누락 바뀜 리씰 이상 인계 인수 교대 넘겨 특이사항 전달 있어 없어 있나 없나 찾아 알려 보여 보여줘 주세요 호기 갱 브리핑 마감 마감텔리 텔리 수치 해치 해치커버 커버 현측 우현 좌현 시작 커트 커트씰 봉인 전자봉인 전자 보류 수화물 환적 창고 임시창고 특수 특수제작 특수제작컨 규격 규격초과 치수 콜사인 호출부호 아이엠오 선속 도선 카고플랜 카고 플랜 베이플랜 밝게 어둡게 소리 순서 순서대로 다음 의심 클래스 오픈탑 하이큐브 플랫 탱크 무거운 가벼운 기록 적어 등록 담당 검수원 근무 주간 야간 뜻 어떻게 뭐야 뭔 무슨 미르 미르야 안녕 수고 고마워 힘들 먹 밥 배정 선박 배 작업 선수 선미 현황 상황 상태 대상 번호 열어 열었어 띄워 보자 이거 그거 저거 여기 거기 저기 아직 벌써 우리 이제 얼마 얼마나 언제쯤 몇시 시간당 시간별 제일 가장 화물 비엘 확인 확인된 선사 실오류 화면 하자 맞아 대수 우리배 우리 항 항구 정박 남아 남았어 걸린 걸렸어 들어와 나가 들어 나가는 몇시쯤 쯤 대략 마지막 처음 첫 완료된 완료했어 시작했어 끝났어 열렸어 붙었어 어때 어떤 뭐 무엇 몇번 오픈 클로즈 닫아 닫았어 닫혔어 조 근무자 사람 이름 담당자 현재 지금까지 중 안 못 잘 더 덜 것 거 건 개수 대수 척 척이야 갯수`.split(/\s+/).filter(Boolean);
const _ENDINGS = /(했어요|했어|했나요|했니|했지|됐어|됐나요|됐니|났어|었어|였어|있어요|있어|있나요|있니|없어요|없어|없나요|없니|해줘|해요|하자|할까|할래|해봐|해|줘요|줘|인가요|인지|이야|이에요|예요|이지|지요|지|야|요|까|니|나요|는지|은지|던|던가|어요|어|아요|아|을까|을래|ㄹ까|세요|십시오|십시요|주십시오|주세요|주라|해주세요)$/;
//  낱말 자르기 — mirLearn.mirTokens 는 조사(«로»)까지 떼어 «킬로»를 «킬»로 만든다. 여기서는 어미만 뗀다.
const _STOP = new Set(['보여줘', '보여', '알려줘', '알려', '해줘', '해', '줘', '주세요', '좀', '미르야', '미르', '봐줘', '봐', '좀요', '해봐', '해주세요', '있어', '없어', '이야', '이거', '그거', '저거']);
function _toks(q) {
  return String(q || '').replace(/[?？!.,~·…()\[\]"'«»#$/:;-]/g, ' ').trim().split(/\s+/).filter(Boolean).filter((t) => !_STOP.has(t));
}
let _KNOWN = null;
function _knownSet() {
  if (_KNOWN) return _KNOWN;
  const set = new Set(KNOWN_WORDS);
  //  창구 예시의 낱말은 정의상 미르가 아는 말이다 — 사전에 얹는다(예시를 그대로 물었는데 «모르는 낱말»이 남으면 안 된다)
  (MIR_CATALOG.match(/"([^"]+)"/g) || []).forEach((ex) => { _toks(ex.replace(/"/g, '')).forEach((t) => { if (/[가-힣]/.test(t)) { set.add(t); const st = t.replace(_ENDINGS, ''); if (st.length >= 2) set.add(st); } }); });
  _KNOWN = set;
  return set;
}
function _isKnown(tok0) {
  const set = _knownSet();
  const tok = tok0.replace(/^\d+/, '');   // «40피트»·«3번» — 숫자를 떼고 본다(재감사)
  if (!tok || set.has(tok)) return true;
  if (tok !== tok0 && tok.length === 1) return true;   // «16번»·«3층» — 숫자 뒤 한 글자는 단위다
  const stem = tok.replace(_ENDINGS, '');
  if (stem && stem !== tok && set.has(stem)) return true;
  for (const w of set) { if (w.length >= 2 && tok.startsWith(w) && tok.length - w.length <= 3) return true; }
  return false;
}
export function mirLeftover(q) {
  return _toks(q).filter((t) => /[가-힣]/.test(t) && t.length >= 2 && !_isKnown(t));
}
const WEAK_VIA = new Set(['howTo', 'time', 'modeChoice', 'gangDict', 'progress', 'knowledgeGuess', 'coneHelp', 'unlearned']);
const WEAK_TEXT = /못 배웠|이렇게 물어보세요|무슨 뜻인지 못 알아|어느 배 말씀인지/;
/** 규칙 답이 «약한 답»인가 — null · 잡아채는 길 · 모르는 낱말이 남음. 되묻기(modeChoice)는 화면이 단추로 받으니 약하지 않다고 본다. */
const PURE_TIME = /^(미르야\s*)?(지금\s*)?(몇\s*시|시간|시각|몇시)(야|이야|지|예요|인가요|입니까|니|냐|요)?\s*[?？]*$/;
const PURE_PROGRESS = /(진행|어디까지|얼마나\s*(했|됐)|몇\s*(프로|퍼)|퍼센트|다\s*했|끝났|몇\s*대\s*(했|됐)|현황)/;
export function isWeakAnswer(q, answer, trace) {
  if (answer == null || answer === '') return true;
  const via = trace && trace.via;
  if (via === 'modeChoice') return false;
  //  감사 지적 — 시각·진행 길이 **정답인 질문**(«지금 몇 시» «진행 상황»)까지 약하게 보면 모델이 그 답을 덮는다
  if (via === 'time' && PURE_TIME.test(String(q).trim())) return false;
  if (via === 'progress' && PURE_PROGRESS.test(String(q))) return false;
  if (via && WEAK_VIA.has(via)) return true;
  if (WEAK_TEXT.test(String(answer))) return true;
  return mirLeftover(q).length > 0;
}

// ── 공용 키·설정(RTDB 한 칸) ────────────────────────────────────────────────
let _cfg = null, _cfgAt = 0, _cfgP = null;
async function _fetchJson(url, opts = {}, ms = 8000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    const j = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, j };
  } finally { clearTimeout(t); }
}
export async function getMirConfig(force = false) {
  const now = Date.now();
  if (!force && _cfg && now - _cfgAt < CFG_TTL) return _cfg;
  if (_cfgP) return _cfgP;
  _cfgP = (async () => {
    try {
      const r = await _fetchJson(`${FB}/mir_config.json`);
      const j = (r.ok && r.j && typeof r.j === 'object') ? r.j : {};
      let key = String(j.aiKey || '').trim();
      if (!key) { try { key = localStorage.getItem('master_gemini_api_key_v1') || ''; } catch (e) { key = ''; } }   // 공용 키가 비어 있으면 개인 키(종전 길)
      _cfg = { aiKey: key, model: String(j.model || DEFAULT_MODEL), dailyCap: Number(j.dailyCap) > 0 ? Number(j.dailyCap) : DEFAULT_CAP, enabled: j.enabled !== false, sharedKey: !!String(j.aiKey || '').trim() };
      _cfgAt = Date.now();
    } catch (e) {
      console.warn('[미르 모델] mir_config 를 못 읽었어요 — 이번엔 모델 없이 갑니다:', e && e.message);
      _cfg = _cfg || { aiKey: '', model: DEFAULT_MODEL, dailyCap: DEFAULT_CAP, enabled: false, sharedKey: false };
      _cfgAt = Date.now() - CFG_TTL + 60 * 1000;   // 1분 뒤 다시 시도
    } finally { _cfgP = null; }
    return _cfg;
  })();
  return _cfgP;
}
const _dayKey = () => { const d = new Date(); return `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; };
let _dayCount = { day: '', n: 0, at: 0 };
async function _todayCount() {
  const day = _dayKey();
  if (_dayCount.day === day && Date.now() - _dayCount.at < 60 * 1000) return _dayCount.n;
  try {
    const r = await _fetchJson(`${FB}/mir_model_log/${day}.json?shallow=true`, {}, 6000);
    const n = (r.ok && r.j && typeof r.j === 'object') ? Object.keys(r.j).length : 0;
    _dayCount = { day, n, at: Date.now() };
    return n;
  } catch (e) { console.warn('[미르 모델] 오늘 호출 수를 못 읽었어요:', e && e.message); return _dayCount.day === day ? _dayCount.n : 0; }
}
function _logCall(entry) {
  const day = _dayKey();
  _dayCount = { day, n: (_dayCount.day === day ? _dayCount.n : 0) + 1, at: _dayCount.at || Date.now() };
  try { fetch(`${FB}/mir_model_log/${day}.json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ at: Date.now(), ...entry }) }).catch((e) => console.warn('[미르 모델] 호출 기록 실패:', e && e.message)); }
  catch (e) { console.warn('[미르 모델] 호출 기록 실패:', e && e.message); }
}
/** «엉뚱하게 알아들은 말»·못 알아들은 말을 mir_misses 에 남긴다 — 검수앱은 App 의 gm-mir-miss 리스너(fbLogMirMiss)로, 리스너가 없는 콘앱은 REST 로. */
function _logMiss(q, meta) {
  try {
    const key = mirKey(q);
    if (typeof window !== 'undefined' && window.__mirMissListener && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gm-mir-miss', { detail: { q, key, at: Date.now(), ...meta } }));
      return;
    }
    fetch(`${FB}/mir_misses/${_dayKey()}.json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q, key, at: Date.now(), ...meta }) }).catch((e) => console.warn('[미르 모델] 못 알아들은 말 기록 실패:', e && e.message));
  } catch (e) { console.warn('[미르 모델] 못 알아들은 말 기록 실패:', e && e.message); }
}

// ── 모델 호출(공용 함수) ─────────────────────────────────────────────────────
async function _gem(cfg, prompt, maxOut, json) {
  const t0 = Date.now();
  const r = await _fetchJson(`${GEM}/${encodeURIComponent(cfg.model)}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.aiKey },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0, maxOutputTokens: maxOut, ...(json ? { responseMimeType: 'application/json' } : {}) } }),
  }, TIMEOUT_MS);
  if (!r.ok) { const m = (r.j && r.j.error && r.j.error.message) || ('HTTP ' + r.status); throw new Error(m); }
  const text = (r.j && r.j.candidates && r.j.candidates[0] && r.j.candidates[0].content && r.j.candidates[0].content.parts && r.j.candidates[0].content.parts[0] && r.j.candidates[0].content.parts[0].text || '').trim();
  const u = (r.j && r.j.usageMetadata) || {};
  return { text, tokIn: u.promptTokenCount || 0, tokOut: u.candidatesTokenCount || 0, ms: Date.now() - t0 };
}

// ── ① 번역 — 미르가 아는 말 목록(창구) ─────────────────────────────────────
export const MIR_CATALOG = `
[컨 한 대 — 끝 4자리나 번호 뒤에 무엇을 묻는지] 예: "3426 온도" "0230 실번호" "0230 중량" "7758 다음 항 어디야" "0230 비엘 번호" "0230 치수" "0686 엑스레이 대상이야" "0230 완료했어" "0230 몇 피트야" "4777 어디 있어" "0230 상태"
[대수] 예: "리퍼 몇 대" "20피트 몇 대" "엠티 몇 대" "풀 몇 대" "위험물 몇 대" "엑스레이 몇 대" "양하 몇 대 남았어" "선적 몇 대" "전체 몇 대" "환적 화물 몇 대" "엠티실 몇 대 남았어" "규격초과 몇 대"
[자리·목록] 예: "리퍼 어디" "엑스레이 대상 위치" "위험물 어디" "FR 어디" "16번 베이" "5번 베이 데크" "3번 홀드" "규격초과 치수" "임시창고 뭐 있어" "특수제작컨 있어" "보류 뭐 있어" "수화물 확인된 거"
[항차 사실] 예: "마감텔리 수치" "해치커버 열었어" "접안 현측" "작업 몇 시에 시작했어" "양하 언제 끝났어" "커트씰 기록" "전자봉인 몇 대" "실번호 의심" "양하 대수가 안 맞아"
[진행·속도] 예: "브리핑" "얼마나 남았어" "몇 시쯤에 끝나" "시간당 몇 개 했어" "작업 속도" "몇 개 했어" "진행 상황"
[배·시각·날씨] 예: "KBTR 브리핑" "콜사인" "IMO" "선박 소개" "입항 몇 시" "출항 몇 시" "도선 몇 시" "날씨" "지금 몇 시" "선속" "다음 항"
[호기·갱·근무자(말하기와 적기)] 예: "1호기 누구야" "갱 몇 개" "1호기 이인철 2호기 최관식" "2호기 23:15 시작했어" "갱 3개"
[뜻·사용법] 예: "시프팅이 뭐야" "FR이 뜻" "트윈 어떻게 해" "해치커버 어떻게 열어"
[화면 열기] 예: "카고플랜 보여줘" "베이플랜 보여줘" "선적 플랜 보여줘" "KBTR 카고플랜 보여줘"
[기기] 예: "화면 밝게" "화면 어둡게" "소리 꺼"
[순서 부르기] 예: "순서대로 양하하자" "다음"
[수석 보드] 예: "오늘 작업 선박" "내일 작업 선박" "실오류 선박" "우리 배야?"`;
function _shipsLine(ctx) {
  const out = [];
  const add = (i) => { if (i && (i.vsl || i.vslFull)) out.push(`${i.vsl || ''}(${i.vslFull || ''})`); };
  if (ctx.info) add(ctx.info);
  if (ctx.voyages && typeof ctx.voyages === 'object') Object.values(ctx.voyages).forEach((v) => add(v && v.info));
  return [...new Set(out)].slice(0, 30).join(', ');
}
export async function translateQuestion(q, ctx, cfg) {
  const prompt = `너는 평택항 컨테이너 검수앱의 도우미 «미르»가 못 알아들은 말을 «미르가 아는 말»로 바꿔 주는 번역기다. 답하지 말고 바꾸기만 한다.
미르가 아는 말(창구와 예시):${MIR_CATALOG}
지금 앱에 있는 배: ${_shipsLine(ctx) || '(없음)'}
규칙:
1. 질문의 뜻이 위 창구 중 하나에 맞으면, 그 창구의 예시 모양대로 짧은 한 문장을 만든다. 컨테이너 번호(끝 4자리나 전체), 배 이름(영문 4자 약자로), 베이·호기·시각·사람 이름은 그대로 보존한다. 배를 한글 이름으로 불렀으면 위 목록의 영문 4자로 바꾼다.
2. 뜻이 어느 창구에도 없으면 canonical 을 빈 문자열로 둔다. 지어내지 않는다.
3. 잡담·인사·감정 표현은 canonical 빈 문자열, window "잡담".
JSON 한 줄로만 답한다: {"canonical":"...","window":"창구 이름","confidence":0.0}
질문: "${q}"`;
  const r = await _gem(cfg, prompt, 120, true);
  let j = null;
  try { j = JSON.parse(r.text.replace(/^```json|```$/g, '').trim()); } catch (e) { return { canonical: '', window: '', confidence: 0, tokIn: r.tokIn, tokOut: r.tokOut, ms: r.ms, bad: r.text.slice(0, 80) }; }
  return { canonical: String((j && j.canonical) || '').trim(), window: String((j && j.window) || ''), confidence: Number((j && j.confidence) || 0), tokIn: r.tokIn, tokOut: r.tokOut, ms: r.ms };
}

// ── ② 자료 답 — 요약 + 계산해 둔 사실 + 질문에 맞는 컨 ───────────────────────
const _pos = (c) => [c.bay, c.row, c.tier].filter((x) => x !== undefined && x !== null && x !== '').join('-');
const _iso = (c) => c.iso || c.tp || c.type || c.size || '';
const _isRf = (c) => !!(c.rf || c.isReefer || /R[EFHT]|RF/.test(String(_iso(c))));
const _isDg = (c) => !!(c.dg || c.imdg || c.dgc || c.un || c.dgClass);
const _isX = (c) => !!(c._xray || c.isXray);
const _isDone = (c) => !!(c._comp || c.comp);
const _doneAt = (c) => { const k = c._comp || c.comp; return k ? Number(k.at || k.time || 0) : 0; };
const _tm = (ms) => { if (!ms) return ''; try { const d = new Date(ms); return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; } catch (e) { return ''; } };
const _modeKo = (c) => ((c._mode || c.mode) === 'loading' ? '선적' : '양하');
export function buildDataPack(q, ctx) {
  //  평택분만(감사 실측: 통과화물이 섞이면 NSFR «양하 423»이 팩에 들어가 문지기를 통과한다). _ptk 가 없는 컨(콘앱 등)은 그대로 둔다.
  const cs = (Array.isArray(ctx.containers) ? ctx.containers : []).filter((c) => c && c._ptk !== false);
  const info = ctx.info || {};
  const digs = (String(q).match(/\d{4,7}/g) || []);
  const cnt = (arr, f) => { const m = {}; arr.forEach((c) => { const k = f(c) || '?'; m[k] = (m[k] || 0) + 1; }); return m; };
  const d = cs.filter((c) => (c._mode || c.mode) !== 'loading'), l = cs.filter((c) => (c._mode || c.mode) === 'loading');
  const sum = (arr) => ({ 총: arr.length, 규격: cnt(arr, _iso), 풀엠티: cnt(arr, (c) => c.fe), 리퍼: arr.filter(_isRf).length, 위험물: arr.filter(_isDg).length, 엑스레이: arr.filter(_isX).length, 규격초과: arr.filter((c) => c.oog).length, 완료: arr.filter(_isDone).length, 미완료: arr.filter((c) => !_isDone(c)).length, 실번호없음: arr.filter((c) => !c.sl).length, POD별: cnt(arr, (c) => c.pod), POL별: cnt(arr, (c) => c.pol) });
  const summary = { 배: `${info.vsl || ''} ${info.vslFull || ''}`.trim(), 항차: { 양하: info.voy_d || info.voy || '', 선적: info.voy_l || '' }, 부두: info.pier || '', 선석: info.berth || '', 접안: info.berthSidePick || info.berthSide || '', 작업시작: info.workStartAt || '', 작업끝: info.workEndAt || '', 양하완료시각: (typeof info.dischargeDoneAt === 'number' ? _tm(info.dischargeDoneAt) : (info.dischargeDoneAt || '')), 양하: sum(d), 선적: sum(l) };
  const byWt = cs.filter((c) => Number(c.wt) > 0).sort((a, b) => Number(b.wt) - Number(a.wt));
  const derived = {
    제일무거운5: byWt.slice(0, 5).map((c) => `${c.cn} ${c.wt}kg ${_modeKo(c)} ${_pos(c)}`),
    제일가벼운5: byWt.slice(-5).reverse().map((c) => `${c.cn} ${c.wt}kg`),
    위험물_클래스별: cnt(cs.filter(_isDg), (c) => '클래스 ' + (c.dgc || c.dgClass || c.imdg || '?')),
    위험물_목록: cs.filter(_isDg).slice(0, 20).map((c) => `${c.cn} 클래스${c.dgc || c.dgClass || c.imdg || '?'} UN${c.un || c.unno || '?'} ${_pos(c)} ${_modeKo(c)}`),
    리퍼_목록: cs.filter(_isRf).slice(0, 20).map((c) => `${c.cn} 온도 ${c.tmp || c.rfSet || c.temp || '기록없음'} ${c.fe === 'E' ? '엠티' : '풀'} ${_pos(c)}`),
    규격초과_목록: cs.filter((c) => c.oog).slice(0, 20).map((c) => `${c.cn} ${c.oogDim || ''} ${_pos(c)}`),
    엑스레이_목록: cs.filter(_isX).slice(0, 20).map((c) => `${c.cn} ${_pos(c)} 실번호 ${c.sl || '?'}`),
    완료_마지막10: cs.filter((c) => _doneAt(c)).sort((a, b) => _doneAt(b) - _doneAt(a)).slice(0, 10).map((c) => `${c.cn} ${_tm(_doneAt(c))} ${((c._comp || c.comp || {}).equip || '')}`),
    미완료_앞10: cs.filter((c) => !_isDone(c)).slice(0, 10).map((c) => `${c.cn} ${_modeKo(c)} ${_pos(c)}`),
    실번호없는컨_앞10: cs.filter((c) => !c.sl).slice(0, 10).map((c) => `${c.cn} ${_modeKo(c)}`),
  };
  const line = (c) => [c.cn, _modeKo(c).slice(0, 1), _iso(c), c.fe || '', c.pol || '', c.pod || '', _pos(c), c.wt || '', c.tmp || c.rfSet || '', _isDg(c) ? ('DG' + (c.dgc || c.dgClass || '')) : '', c.un || c.unno || '', c.sl || '', c.eseal || '', _isX(c) ? 'X' : '', _isDone(c) ? '완' : '', c.oog ? ('OOG' + (c.oogDim || '')) : ''].join('|');
  const hit = cs.filter((c) => digs.some((dd) => String(c.cn || '').endsWith(dd)));
  const kw = []; const Q = String(q).toUpperCase();
  if (/리퍼|냉동|냉장|온도/.test(q)) kw.push(_isRf);
  if (/위험|디지|DG|UN|클래스/i.test(q)) kw.push(_isDg);
  if (/엑스|XRAY|X-RAY|세관/i.test(q)) kw.push(_isX);
  if (/오버|규격|초과|OOG|플랫|오픈/i.test(q)) kw.push((c) => c.oog || /OT|FR|PF/.test(String(_iso(c))));
  if (/엠티|빈|공/.test(q)) kw.push((c) => c.fe === 'E');
  const bayM = q.match(/(\d{1,2})\s*번?\s*베이/); if (bayM) kw.push((c) => String(Number(c.bay)) === String(Number(bayM[1])));
  const ports = [...new Set(cs.flatMap((c) => [c.pod, c.pol]).filter(Boolean))]; ports.forEach((pc) => { if (Q.includes(String(pc).toUpperCase())) kw.push((c) => c.pod === pc || c.pol === pc); });
  const rel = kw.length ? cs.filter((c) => !hit.includes(c) && kw.some((f) => f(c))).slice(0, 30) : [];
  const cols = '컨번호|양하선적|규격|풀엠티|POL|POD|자리(베이-로우-티어)|중량kg|리퍼온도|위험물|UN|실번호|전자봉인|엑스레이|완료|규격초과';
  return { summary, 계산해둔것: derived, 컨목록_열: cols, 질문에맞는컨: [...hit, ...rel].map(line) };
}
export async function dataAnswer(q, ctx, cfg) {
  const pack = buildDataPack(q, ctx);
  const packTxt = JSON.stringify(pack);
  const prompt = `너는 평택항 검수앱의 도우미 «미르»다. 아래 자료만 보고 검수원의 질문에 한국어로 3문장 이내로 답한다. «계산해둔것»에 있으면 그것을 그대로 쓰고 직접 세지 않는다. 목록을 말할 땐 5개까지만. 자료의 항목 이름(«계산해둔것» 같은 말)은 입에 올리지 않는다. 자료에 없는 것은 «자료에 없어요»라고 말하고 지어내지 않는다. 숫자·번호는 자료 그대로 쓴다. 존댓말(~예요).
자료(JSON): ${packTxt}
질문: "${q}"`;
  const r = await _gem(cfg, prompt, 220, false);
  let text = r.text;
  let rejected = null;
  if (text) {
    //  문지기 — 답 속 숫자(2자리 이상)가 자료에 없으면 지어낸 것이다. 버린다.
    const bad = (text.match(/\d{2,}/g) || []).filter((n) => !packTxt.includes(n));
    if (bad.length) { rejected = { text, bad }; text = '자료로는 확실한 답을 못 만들었어요 — 화면에서 확인해 주세요.'; }
  }
  return { text, rejected, tokIn: r.tokIn, tokOut: r.tokOut, ms: r.ms, packChars: packTxt.length };
}

/** 사전 등록 한 벌 — 이 폰 메모리(mirLearnAlias) + 보관소. 검수앱은 App 이 건 쓰기 손(window.__mirLexiconWrite)이 적고, 손이 없는 콘앱은 REST 로 적는다. */
function _learn(q, canonical, who, window_) {
  try {
    const key = mirLearnAlias(q, canonical, who || 'model', { src: 'model', window: window_ || '' });
    if (!key) return;
    const hasHand = typeof window !== 'undefined' && typeof window.__mirLexiconWrite === 'function';
    if (!hasHand) {
      const entry = (typeof window !== 'undefined' && window.__mirLexicon && window.__mirLexicon[key]) || null;
      if (entry) fetch(`${FB}/mir_lexicon/${encodeURIComponent(key.replace(/[.#$/\[\]]/g, '_'))}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) }).catch((e) => console.warn('[미르 모델] 사전 보관소 쓰기 실패:', e && e.message));
    }
  } catch (e) { console.warn('[미르 모델] 사전 등록 실패:', e && e.message); }
}

// ── 한 세션 안 같은 문장 재호출 금지 ────────────────────────────────────────
//   감사 지적(3.42 첫 판) — 답 문장을 항차 구분 없이 캐시하면 KBTR 답이 NSFR 에서 그대로 나오고, 완료가 바뀌어도 옛 답이다.
//   그래서 **번역문(canonical)과 자료 답만** 항차·앱별로 기억하고, 규칙은 매번 다시 돌린다. 오류는 기억하지 않는다(망 복구 뒤 재시도).
const _memo = new Map();   // `${app}|${voyageKey}|${문장}` → { canonical, window, model, at } 또는 진행 중 Promise
const _norm = (q) => String(q || '').trim().replace(/\s+/g, ' ').toLowerCase();
const _memoKey = (q, ctx) => `${ctx && ctx.app || ''}|${ctx && ctx.voyageKey || ''}|${_norm(q)}`;

/** 규칙이 약할 때만 모델을 부른다. rules(q) 는 «미르 말»로 바꾼 문장을 규칙에 다시 돌리는 함수(문자열 또는 null).
    돌려주는 값: { text, via:'translate'|'confirmed'|'model'|null, canonical, reason } — text 가 null 이면 모델도 못 받은 것(규칙 답으로 돌아간다). */
export async function askMirModel(q, ctx, rules, opts = {}) {
  const key = _memoKey(q, ctx);
  if (!_norm(q) || _norm(q).length < 2) return { text: null, via: null, reason: 'short' };
  const cached = _memo.get(key);
  if (cached && typeof cached.then === 'function') return cached;                       // 진행 중 — 같은 약속을 돌려준다(동시 재전송 4회 호출 방지)
  if (cached) return _finish(q, ctx, rules, opts, cached, true);                       // 끝난 것 — 번역·자료 답은 기억, 규칙은 다시
  const p = (async () => {
    const cfg = await getMirConfig();
    if (!cfg.enabled || !cfg.aiKey) { _memo.delete(key); return { text: null, via: null, reason: cfg.enabled ? 'nokey' : 'off' }; }
    const n = await _todayCount();
    if (n >= cfg.dailyCap) { _memo.delete(key); console.warn(`[미르 모델] 오늘 상한 ${cfg.dailyCap}회에 닿았어요 — 규칙만으로 갑니다`); return { text: null, via: null, reason: 'cap' }; }
    const who = opts.who || '';
    let tr = null;
    try {
      tr = await translateQuestion(q, ctx, cfg);
      _logCall({ kind: 'translate', q: String(q).slice(0, 80), canonical: tr.canonical, window: tr.window, conf: tr.confidence, ok: true, tokIn: tr.tokIn, tokOut: tr.tokOut, ms: tr.ms, who, app: ctx.app || '' });
    } catch (e) {
      console.warn('[미르 모델] 번역 실패:', e && e.message);
      _logCall({ kind: 'translate', q: String(q).slice(0, 80), ok: false, err: String(e && e.message || e).slice(0, 120), who, app: ctx.app || '' });
      tr = null;
    }
    const rec = { canonical: (tr && tr.canonical) || '', window: (tr && tr.window) || '', confidence: (tr && tr.confidence) || 0, translated: !!tr, model: null, at: Date.now() };
    const out = await _finish(q, ctx, rules, opts, rec, false, cfg);
    if (out.reason === 'error') _memo.delete(key); else _memo.set(key, rec);
    return out;
  })();
  _memo.set(key, p);
  try { return await p; } catch (e) { _memo.delete(key); throw e; }
}
/** 번역문으로 규칙을 다시 돌리고, 없으면 자료 답. rec 은 기억된 번역·자료 답. */
async function _finish(q, ctx, rules, opts, rec, fromMemo, cfg = null) {
  const who = opts.who || '';
  const out = { text: null, via: null, canonical: rec.canonical || '', reason: '' };
  const weakByWordsOnly = !!(opts.weakText && !(opts.weakVia && WEAK_VIA.has(opts.weakVia)));   // 잡아채는 길이 아니라 «모르는 낱말» 때문에만 약했던 답
  const identity = !rec.canonical || _norm(rec.canonical) === _norm(q);
  if (!identity) {
    let a = null;
    try { a = rules(rec.canonical); } catch (e) { console.warn('[미르 모델] 번역문 규칙 실패:', e && e.message); a = null; }
    const sameCatch = !!(opts.weakText && a && String(a) === String(opts.weakText) && opts.weakVia && WEAK_VIA.has(opts.weakVia));
    if (a && !WEAK_TEXT.test(String(a)) && !sameCatch) {
      out.text = a; out.via = 'translate';
      if (!fromMemo) {
        if (rec.confidence >= 0.7) _learn(q, rec.canonical, who, rec.window);   // 자신 없는 번역은 전 기기 공용 사전에 안 적는다(감사)
        _logMiss(q, { who, mode: ctx.mode || '', voyageKey: ctx.voyageKey || '', canonical: rec.canonical, how: opts.weakText ? 'weak→translate' : 'null→translate' });
      }
      return out;
    }
  }
  //  원래 답이 «모르는 낱말» 때문에만 약했다면(잡아채는 길이 아님) 그 답은 대체로 맞다 — 자료 답이 **더 아는 것**(«클래스별로 몇 개씩»)일 때만 바꾸고,
  //  모델이 «자료에 없어요»·못 만듦이면 그 답을 «확인된 것»으로 돌려준다(감사: 강한 답을 «자료에 없어요 (AI)» 로 덮지 않는다).
  const confirmed = () => { out.text = opts.weakText; out.via = 'confirmed'; return out; };
  if (weakByWordsOnly && identity && rec.translated && !rec.canonical) { /* 번역도 «없다»고 한 말 — 자료 답을 한 번 본다 */ }
  else if (weakByWordsOnly) return confirmed();
  //  잡담은 자료 답으로 가지 않는다
  if (rec.window === '잡담' && /미르|힘드|수고|고마|안녕|밥|점심|저녁|아침|커피/.test(q)) { out.reason = 'smalltalk'; return weakByWordsOnly ? confirmed() : out; }
  //  ② 자료 답 — 기억된 것이 있으면 그것(같은 항차·같은 문장), 없으면 모델
  if (rec.model && Date.now() - (rec.at || 0) < 10 * 60 * 1000) { out.text = rec.model; out.via = 'model'; return out; }   // 자료 답은 10분만 기억 — 진행이 바뀌면 다시(재감사)
  if (!cfg) cfg = await getMirConfig();
  if (!cfg.aiKey) { out.reason = 'nokey'; return weakByWordsOnly ? confirmed() : out; }
  try {
    const da = await dataAnswer(q, ctx, cfg);
    _logCall({ kind: 'data', q: String(q).slice(0, 80), ok: true, rejected: !!da.rejected, tokIn: da.tokIn, tokOut: da.tokOut, ms: da.ms, packChars: da.packChars, who, app: ctx.app || '' });
    const empty = !da.text || /자료에 없어요|자료에는 없|확실한 답을 못/.test(String(da.text));
    if (weakByWordsOnly && (da.rejected || empty)) return confirmed();
    if (da.text && !da.rejected) { out.text = da.text + ' (AI)'; out.via = 'model'; rec.model = out.text; }
    else if (da.rejected) { out.text = '자료로는 확실한 답을 못 만들었어요 — 화면에서 확인해 주세요. (AI)'; out.via = 'model'; out.rejected = da.rejected; }   // 지어낸 숫자 — 잡아채는 길의 엉뚱한 답으로 돌아가느니 솔직하게
    _logMiss(q, { who, mode: ctx.mode || '', voyageKey: ctx.voyageKey || '', canonical: rec.canonical || '', how: opts.weakText ? 'weak→model' : 'null→model', rejected: !!da.rejected });
  } catch (e) {
    console.warn('[미르 모델] 자료 답 실패:', e && e.message);
    _logCall({ kind: 'data', q: String(q).slice(0, 80), ok: false, err: String(e && e.message || e).slice(0, 120), who, app: ctx.app || '' });
    out.reason = 'error';
  }
  return out;
}

/** 규칙 → (약하면) 모델. 화면이 부르는 한 함수. rulesFn(q, trace) 는 그 화면의 answerOneRaw 호출(ctx 는 화면이 감싼다).
    돌려주는 값: { text, via:'rules'|'lexicon'|'translate'|'confirmed'|'model'|null, weak, rulesText, trace } */
export async function askMir(q, ctx, rulesFn, opts = {}) {
  const trace = {};
  let rulesText = null;
  try { rulesText = rulesFn(q, trace); } catch (e) { console.warn('[미르] 규칙 답 실패:', e && e.message); rulesText = null; }
  const weak = isWeakAnswer(q, rulesText, trace);
  if (!weak) return { text: rulesText, via: 'rules', weak: false, rulesText, trace };
  //  숫자만·한글 없음 → 모델을 부를 말이 아니다(끝네자리 조회는 화면 카드가 답한다). 조작·적는 말(밝기·호기·시작·갱)은 규칙이 이미 했다 — 번역문으로 두 번 실행하지 않는다(감사 실측 밝기 두 칸).
  let p = null; try { p = parseNaturalQuery(q); } catch (e) { p = null; }
  if (/^[\d\s.,-]+$/.test(String(q)) || !/[가-힣]{2,}|[A-Za-z]{3,}/.test(String(q)) || (p && (p.deviceCmd || p.crewSet || p.startSet || p.gangSet))) return { text: rulesText, via: rulesText ? 'rules' : null, weak, rulesText, trace };
  //  배운 별칭이 있으면 모델 없이 그것으로(nlSearch 의 되쓰기는 «못 알아들었을 때»만 도는데, 여기는 «약하게 알아들은 말»도 받는다)
  try {
    const rw = mirRewrite(q);
    if (rw && _norm(rw) !== _norm(q)) { const t2 = {}; const a = rulesFn(rw, t2); if (a && !isWeakAnswer(rw, a, t2)) return { text: a, via: 'lexicon', weak, rulesText, trace, canonical: rw }; }
  } catch (e) { console.warn('[미르] 별칭 되쓰기 실패:', e && e.message); }
  const m = await askMirModel(q, ctx, (cq) => rulesFn(cq, {}), { who: opts.who || ctx.inspector || '', weakText: rulesText, weakVia: trace.via || '' });
  if (m && m.text) return { text: m.text, via: m.via, weak, rulesText, trace, canonical: m.canonical };
  return { text: rulesText, via: rulesText ? 'rules' : null, weak, rulesText, trace, reason: m && m.reason };
}
