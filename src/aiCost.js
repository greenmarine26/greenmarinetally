// AI 호출 비용 한 벌 — 단가표 · 종류 이름 · 호출 기록 합산(미르 웹 검색 한도와 소유자 «💳 AI 비용» 화면이 같이 쓴다)
//
// 4.37 (검수사 2026-10-19) — «미르가 사용하는 토큰을 관리하고 분석» · «엉뚱한 곳에 비용이 청구 되지 않게» · «비용관리 보고는 소유자 관리 안에둡니다».
//   단가는 여기 한 곳에만 둔다. 종전엔 mir.js 웹 검색 계산식에 옛 소네트 단가(3·15달러)가 박혀 실제보다 39% 크게 셌다
//   (실측 261019 «가요차트 1위» 입력 16,505 · 출력 351 · 검색 1 → 장부 0.0648, 실제 0.0465).
//   단가 출처 — platform.claude.com/docs/en/about-claude/pricing (2026-10-19). 100만 토큰당 달러 [입력, 출력]. 생각(thinking) 토큰은 출력에 들어 있다.
//   ⚠ 이 금액은 앱 기록으로 센 «최소치»다. 앱을 거치지 않고 키로 직접 부른 호출(클로드 시험 등)은 기록이 없어 빠진다 — 정본은 Console.
export const AI_PRICE = {
  'claude-sonnet-5-5': [2, 10],
  'claude-opus-5-5': [4, 20],
  'claude-haiku-5-5': [0.1, 0.5],
  'claude-fable-5-1': [10, 50],
  'claude-sonnet-5': [2, 10],
  'claude-opus-5': [5, 25],
};
export const AI_WEB_SEARCH_USD = 0.01;   // 웹 검색 1회(1,000회 10달러). 실패한 검색은 청구되지 않는다.
export const AI_DEFAULT_CHAT_MODEL = 'claude-sonnet-5-5';   // mir_model_log 줄에는 모델 이름이 없다 — mir_config.claudeModel(없으면 이것)로 본다

/** 그 모델의 금액(달러). 단가표에 없는 모델이면 null — 부르는 쪽이 «단가 모름» 으로 드러낸다(0 으로 숨기지 않는다). */
export function aiCostUsd(model, tokIn, tokOut, searches = 0) {
  const p = AI_PRICE[String(model || '')];
  if (!p) return null;
  return (Number(tokIn) || 0) * p[0] / 1e6 + (Number(tokOut) || 0) * p[1] / 1e6 + (Number(searches) || 0) * AI_WEB_SEARCH_USD;
}

//  화면 이름 — 사진은 검수사 표현 그대로(2026-10-19 «보통 사진 판독은 리퍼 리스트 엠티실 리스트 베이 수기 기록입니다»)
export const AI_KIND_LABEL = {
  translate: '미르 알아듣기(번역)',
  data: '미르 자료 답',
  chat: '미르 생활회화 · 상식',
  web: '미르 웹 검색',
  esealPhoto: '엠티실 리스트',
  sheetPhoto: '베이 수기 기록',
  reeferPhoto: '리퍼 리스트',
  listPhoto: '리스트 사진',
  portMisCapture: 'PORT-MIS 캡처',
  stowagePdf: 'PDF 베이',
  search: '검색패널 AI',
  shipIntro: '선박 소개',
  shipIntroPlain: '선박 소개',
};
export const AI_PHOTO_KINDS = ['esealPhoto', 'sheetPhoto', 'reeferPhoto', 'listPhoto', 'portMisCapture', 'stowagePdf'];
export const aiKindLabel = (k) => AI_KIND_LABEL[k] || String(k || '?');
export const aiModelShort = (m) => (/opus/i.test(m) ? '오퍼스' : /sonnet/i.test(m) ? '소네트' : /haiku/i.test(m) ? '하이쿠' : /fable/i.test(m) ? '페이블' : String(m || '?'));

/** 기기 시각 기준 날짜 키 YYMMDD — mir.js _dayKey · gemini.js 기록과 같은 모양. */
export function aiDayKey(ms) {
  const d = new Date(ms);
  return `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
/** 화면 기간 칩 → 날짜 키 목록(오늘부터 거꾸로). month 는 이번 달 1일부터 오늘까지. */
export function aiPeriodDays(period, now = Date.now()) {
  const d0 = new Date(now);
  if (period === 'yesterday') return [aiDayKey(now - 86400000)];
  if (period === '7d') return Array.from({ length: 7 }, (_, i) => aiDayKey(now - i * 86400000));
  if (period === 'month') return Array.from({ length: d0.getDate() }, (_, i) => aiDayKey(now - i * 86400000));
  return [aiDayKey(now)];
}

/** 호출 기록 한 줄 → {provider, kind, model, tokIn, tokOut, searches, who, app, at, status} 로 고른다.
 *  mir_model_log — 클로드 줄은 prov 'claude'·'claude-web'. 웹 검색이 «빈 답»으로 끝난 줄은 prov 가 없지만 토큰·검색이 청구됐다(mir.js 웹 검색 실패 기록) — 클로드로 센다.
 *  ai_call_log — model 이 claude- 로 시작하면 클로드 사진 읽기, 아니면 제미나이(토큰 기록 없음). */
function pickMirRow(v, chatModel) {
  if (!v || typeof v !== 'object') return null;
  const prov = String(v.prov || '');
  const kind = String(v.kind || '?');
  const tokIn = Number(v.tokIn) || 0, tokOut = Number(v.tokOut) || 0, searches = Number(v.searches) || 0;
  const claude = prov.startsWith('claude') || (kind === 'web' && !prov && (tokIn > 0 || searches > 0));
  const base = { kind, who: String(v.who || ''), app: String(v.app || ''), at: Number(v.at) || 0 };
  if (claude) return { ...base, provider: 'claude', model: chatModel, tokIn, tokOut, searches, status: 200 };
  //  4.30 전 옛 기록은 prov 칸이 없다 — 그때는 제미나이뿐이었다(감사 4.37: 옛 줄을 «실패»로 세면 이번 달 화면에 헛경고가 뜬다)
  if (prov === 'gemini' || (!prov && v.ok !== false)) return { ...base, provider: 'gemini', model: '' };
  if (prov === 'web-cap') return { ...base, provider: 'cap' };            // 하루 한도에 닿아 검색 없이 «한도 다 썼어요» 로 답한 줄 — 호출·청구 없음
  if (kind === 'web') return { ...base, provider: Number(v.status) >= 400 ? 'webfail' : 'webmaybe' };   // 웹 검색 HTTP 오류는 청구 없음 · 시간 초과(status 0)는 청구됐을 수 있다(mir.js 가 장부에 예상치를 남긴다 — 감사 4.37 2차)
  return { ...base, provider: 'fail' };
}
function pickCallRow(v) {
  if (!v || typeof v !== 'object') return null;
  const model = String(v.model || '');
  const kind = String(v.kind || '?');
  const base = { kind, model, who: String(v.who || ''), app: 'tally', at: Number(v.at) || 0 };
  if (model.startsWith('claude')) {
    const status = Number(v.status) || 0, tokIn = Number(v.tokIn) || 0, tokOut = Number(v.tokOut) || 0;
    if (status === -1) return { ...base, provider: 'visionTimeout' };                     // 시간 초과 — 이미 만든 분은 청구됐을 수 있다(제미나이로 다시 읽음)
    if (status !== 200 && !(tokIn || tokOut)) return { ...base, provider: 'visionFail' };  // 거절·과부하(400·529 등) — 청구 없음, 제미나이로 읽음(감사 4.37: 호출 수·1회 평균을 부풀리지 않게)
    return { ...base, provider: 'claude', tokIn, tokOut, searches: 0, status };
  }
  return { ...base, provider: 'gemini' };
}

/**
 * 날짜별 기록을 합친다.
 *   days — [{ day:'261019', mml:{...mir_model_log/day}, acl:{...ai_call_log/day}, mws:{...mir_websearch/day} }]
 *   opts.chatModel — 미르 대화 모델(mir_config.claudeModel) · opts.until — 이 시각(ms)까지만 센다(Console 숫자와 맞댈 때)
 * 돌려주는 것 — rows(종류·모델별 호출·토큰·검색·금액·1회 최대) · total · who(사람별) · gemini(종류별 호출 수) · web(검색 장부 합·앱별) · warns
 */
export function aggregateAiCost(days, opts = {}) {
  const chatModel = opts.chatModel || AI_DEFAULT_CHAT_MODEL;
  const until = Number(opts.until) || 0;
  const rowMap = new Map(), whoMap = new Map(), gem = new Map();
  const unknown = new Set();
  let fails = 0, visionTimeouts = 0, visionFails = 0, capN = 0, webFailN = 0, webMaybeN = 0;
  const web = { booked: 0, n: 0, byApp: {} };
  const take = (r) => {
    if (!r) return;
    if (until && r.at && r.at > until) return;
    if (r.provider === 'gemini') { gem.set(r.kind, (gem.get(r.kind) || 0) + 1); return; }
    if (r.provider === 'fail') { fails += 1; return; }
    if (r.provider === 'cap') { capN += 1; return; }
    if (r.provider === 'webfail') { webFailN += 1; return; }
    if (r.provider === 'webmaybe') { webMaybeN += 1; return; }
    if (r.provider === 'visionTimeout') { visionTimeouts += 1; return; }
    if (r.provider === 'visionFail') { visionFails += 1; return; }
    const usd = aiCostUsd(r.model, r.tokIn, r.tokOut, r.searches);
    if (usd === null) unknown.add(r.model);
    const key = `${r.kind}|${r.model}`;
    const row = rowMap.get(key) || { key, kind: r.kind, label: aiKindLabel(r.kind), model: r.model, n: 0, tokIn: 0, tokOut: 0, searches: 0, usd: 0, max: 0 };
    row.n += 1; row.tokIn += r.tokIn; row.tokOut += r.tokOut; row.searches += r.searches;
    if (usd !== null) { row.usd += usd; if (usd > row.max) row.max = usd; }
    rowMap.set(key, row);
    const w = r.who || '';
    const wr = whoMap.get(w) || { who: w, n: 0, usd: 0 };
    wr.n += 1; if (usd !== null) wr.usd += usd;
    whoMap.set(w, wr);
  };
  for (const d of (Array.isArray(days) ? days : [])) {
    if (!d) continue;
    for (const v of Object.values(d.mml || {})) take(pickMirRow(v, chatModel));
    for (const v of Object.values(d.acl || {})) take(pickCallRow(v));
    for (const v of Object.values(d.mws || {})) {
      if (!v || typeof v !== 'object') continue;
      if (until && v.at && v.at > until) continue;
      const u = Number(v.usd) || 0;
      web.booked += u; web.n += 1;
      const a = String(v.app || '') || '앱 표시 없음';
      web.byApp[a] = (web.byApp[a] || 0) + u;
    }
  }
  const rows = [...rowMap.values()].sort((a, b) => b.usd - a.usd || b.n - a.n);
  const total = rows.reduce((t, r) => ({ n: t.n + r.n, tokIn: t.tokIn + r.tokIn, tokOut: t.tokOut + r.tokOut, usd: t.usd + r.usd }), { n: 0, tokIn: 0, tokOut: 0, usd: 0 });
  const who = [...whoMap.values()].sort((a, b) => b.usd - a.usd || b.n - a.n);
  const gemini = { n: [...gem.values()].reduce((s, x) => s + x, 0), byKind: Object.fromEntries([...gem.entries()].sort((a, b) => b[1] - a[1])) };
  const warns = [];
  if (unknown.size) warns.push(`단가표에 없는 모델 ${[...unknown].join(', ')} — 금액에 넣지 못했습니다`);
  if (visionTimeouts) warns.push(`클로드 사진 읽기 시간 초과 ${visionTimeouts}회 — 제미나이로 다시 읽었습니다(클로드가 이미 만든 분은 청구됐을 수 있습니다)`);
  if (visionFails) warns.push(`클로드 사진 읽기 거절·오류 ${visionFails}회 — 제미나이로 읽었습니다(청구 없음)`);
  if (fails) warns.push(`AI 호출 실패 ${fails}회 — 클로드·제미나이 둘 다 답하지 못한 기록입니다`);
  const photoN = rows.filter((r) => AI_PHOTO_KINDS.includes(r.kind)).reduce((s, r) => s + r.n, 0);
  return { rows, total, who, gemini, web, warns, photoN, capN, webFailN, webMaybeN };
}

/** Console 숫자(검수사가 적은 값)와 앱 기록의 차이. Console 이 크면 앱 밖에서 키로 부른 사용이다. 0.10달러와 10퍼센트를 둘 다 넘게 차이 날 때만 알린다.
 *  over — 앱 기록이 Console 보다 큰 경우(Console 은 5분쯤 늦게 반영되고, 적은 숫자가 그 뒤 바뀌었을 수 있다 · 감사 4.37). */
export function aiConsoleGap(consoleMonthUsd, appMonthUsd) {
  const c = Number(consoleMonthUsd);
  if (!(c >= 0) || consoleMonthUsd === '' || consoleMonthUsd === null || consoleMonthUsd === undefined) return null;
  const gap = c - (Number(appMonthUsd) || 0);
  const notable = gap > 0.1 && gap > c * 0.1;
  const over = -gap > 0.1 && -gap > c * 0.1;
  return { gap, notable, over };
}
