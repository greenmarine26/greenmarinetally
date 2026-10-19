// 미르 생활회화 층·사진 읽기 클로드 전환·예상 실오류(씰 모양) 연막검사 (TallyOne 4.36) — 실소스를 이 파일이 직접 묶어서 시험한다.
//   검수사 2026-10-19 «생활회화는 클로드 SONNET … 일반 생활회화를 할 수 있어야 할 것입니다» · «사진판독은 정밀한 것을 요할 때는 OPUS, 그 외는 SONNET» ·
//   «선사마다 실번호 타입과 패턴이 있습니다. 그걸 학습해야 합니다» · 정답지 = MCAP 639N 마감텔리 실오류 보고서(자릿수 부족 2 · 컨번호와 같은 씰 1).
//   node tools/smoke_mir436.cjs <저장소 루트>
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(process.argv[2] || process.cwd());

global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {}, __mirLexicon: {}, __mirLexiconWrite() {} };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
const store = {};
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke436_'));
const entry = path.join(tmp, 'entry.js');
const out = path.join(tmp, 'bundle.cjs');
fs.writeFileSync(entry, `
export { sealFormatAnomalies } from ${JSON.stringify(path.join(ROOT, 'src/utils.js'))};
export { runDiagnostics } from ${JSON.stringify(path.join(ROOT, 'src/diagnostics.js'))};
export { aiCall, claudeVisionRequest, claudeVisionToGemini } from ${JSON.stringify(path.join(ROOT, 'src/gemini.js'))};
export { askMirModel, chatAnswer, isChatCandidate, getMirConfig } from ${JSON.stringify(path.join(ROOT, 'src/mir.js'))};
export { answerAboutAlert } from ${JSON.stringify(path.join(ROOT, 'src/nlSearch.js'))};
`);
execFileSync('npx', ['esbuild', entry, '--bundle', '--platform=node', '--format=cjs', `--outfile=${out}`, '--loader:.js=jsx', '--jsx=automatic', '--log-level=error'], { cwd: ROOT, stdio: 'inherit' });

let n = 0, bad = 0;
const T = (cond, name, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };

// ── 가짜 네트워크: 보관소 설정 · 클로드 · 제미나이 · 기록 ──
let CFG = {}; let WEBROWS = null; let WEBFAIL = ''; const calls = []; let claudeMode = 'ok'; let claudeText = '{"items":[]}';
const resp = (status, j) => ({ ok: status >= 200 && status < 300, status, json: async () => j, text: async () => JSON.stringify(j) });
global.fetch = async (url, opts = {}) => {
  url = String(url);
  const body = opts.body ? (() => { try { return JSON.parse(opts.body); } catch (e) { return opts.body; } })() : null;
  calls.push({ url, body });
  if (url.includes('/mir_config.json')) return resp(200, CFG);
  if (url.includes('/mir_model_log/')) return resp(200, opts.method === 'POST' ? { name: 'x' } : {});
  if (url.includes('/mir_websearch/')) {
    if (opts.method === 'POST') return WEBFAIL === 'write' ? resp(401, { error: 'denied' }) : resp(200, { name: 'slot1' });
    if (opts.method === 'PATCH') return resp(200, {});
    return WEBFAIL === 'read' ? resp(500, {}) : resp(200, WEBROWS);
  }
  if (url.includes('/ai_call_log/') || url.includes('/mir_misses/')) return resp(200, { name: 'x' });
  if (url.includes('api.anthropic.com')) {
    if (claudeMode === 'fail') return resp(529, { error: { message: 'overloaded' } });
    if (body && body.tools) return resp(200, { content: [{ type: 'server_tool_use', name: 'web_search', input: { query: 'x' } }, { type: 'text', text: '멜론 1위는 A2O LITE의 "NEON"' }, { type: 'text', text: '이고, 18일 기준이에요.' }], stop_reason: 'end_turn', usage: { input_tokens: 14913, output_tokens: 219, server_tool_use: { web_search_requests: 1 } } });
    return resp(200, { content: [{ type: 'text', text: typeof claudeText === 'function' ? claudeText(body) : claudeText }], stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 5 } });
  }
  if (url.includes('generativelanguage.googleapis.com')) return resp(200, { candidates: [{ content: { parts: [{ text: '{"items":["제미나이"]}' }] }, finishReason: 'STOP' }] });
  return resp(404, {});
};
const claudeCalls = () => calls.filter((c) => c.url.includes('api.anthropic.com'));

(async () => {
  const B = require(out);
  const FIX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mcap639N_seals.json'), 'utf8'));

  console.log('① 예상 실오류 — MCAP 639N 마감텔리 실오류 보고서가 정답지');
  const want = ['MNBU3997353', 'MNBU4239975', 'MNBU4491858'];
  const all = B.sealFormatAnomalies(FIX.discharge, { includeFixed: true });
  T(JSON.stringify(all.map((x) => x.cn).sort()) === JSON.stringify(want), '양하 305대 중 정답 3건만(자릿수 부족 2 + 컨번호와 같은 씰 1)', all.map((x) => x.cn).join(','));
  T(all.filter((x) => x.kind === 'shape').length === 2 && all.filter((x) => x.kind === 'cn').length === 1, '종류 — 자릿수·형식 2 · 컨번호 포함 1');
  const byCn = Object.fromEntries(all.map((x) => [x.cn, x]));
  T(byCn.MNBU4239975 && byCn.MNBU4239975.kind === 'cn' && byCn.MNBU3997353.kind === 'shape' && byCn.MNBU4491858.kind === 'shape', '컨마다 종류가 맞다');
  T(!all.some((x) => x.cn === 'MNBU0406647'), '정상 씰(PH+7자리 MNBU0406647)은 안 걸린다');
  T(B.sealFormatAnomalies(FIX.discharge).map((x) => x.cn).sort().join() === 'MNBU3997353,MNBU4239975', '검수원이 이미 고친 컨(MNBU4491858)은 알림에서 빠진다');
  T(B.sealFormatAnomalies(FIX.loading).length === 0, '선적 293대(MSK·MAE)는 오탐 0');
  T(B.sealFormatAnomalies({}).length === 0 && B.sealFormatAnomalies(null).length === 0, '빈 자료는 터지지 않는다');
  const small = {}; for (const [cn, r] of Object.entries(FIX.discharge).slice(0, 10)) small[cn] = r;
  T(B.sealFormatAnomalies(small).filter((x) => x.kind === 'shape').length === 0, '표본이 20개 미만이면 모양 판정을 하지 않는다');
  const diag = B.runDiagnostics({ ediContainers: {}, listRecords: FIX.discharge, mode: 'discharge' });
  const al = (diag.alerts || diag || []).find ? (diag.alerts || diag).find((a) => a.code === 'seal_format') : null;
  T(!!al && al.count === 2 && /예상 실오류 2건/.test(al.msg), '주의 박스에 «예상 실오류 2건» 경고가 선다', al ? al.msg : '없음');
  const ans = B.answerAboutAlert('예상 실오류 뭐야', [al]);
  T(!!ans && /씰 번호의 모양/.test(ans), '미르에게 «예상 실오류 뭐야» 하면 그 경고를 설명한다', String(ans).slice(0, 60));

  console.log('② 사진 읽기 — 제미나이 요청을 클로드 요청으로 · 응답을 제미나이 모양으로');
  const body = { contents: [{ parts: [{ text: '읽어라' }, { inline_data: { mime_type: 'image/jpeg', data: 'AAAA' } }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 40000, responseMimeType: 'application/json' } };
  const rq = B.claudeVisionRequest(body, 'claude-opus-5-5', 40000);
  T(rq.model === 'claude-opus-5-5' && rq.max_tokens === 32000, '모델 지정 · 출력 한도는 3만 2천으로 자른다', `${rq.model} ${rq.max_tokens}`);
  T(rq.messages[0].content[0].type === 'text' && rq.messages[0].content[1].type === 'image' && rq.messages[0].content[1].source.media_type === 'image/jpeg' && rq.messages[0].content[1].source.data === 'AAAA', '글 + 사진 블록');
  T(/JSON 만 낸다/.test(rq.system || ''), 'JSON 모드는 시스템 지시로 옮긴다');
  const pdf = B.claudeVisionRequest({ contents: [{ parts: [{ inline_data: { mime_type: 'application/pdf', data: 'BB' } }] }] }, 'claude-sonnet-5-5', 1000);
  T(pdf.messages[0].content[0].type === 'document', 'PDF 는 document 블록');
  const g = B.claudeVisionToGemini({ content: [{ type: 'text', text: '```json\n{"a":1}\n```' }], stop_reason: 'max_tokens' });
  T(g.candidates[0].content.parts[0].text === '{"a":1}' && g.candidates[0].finishReason === 'MAX_TOKENS', '코드 울타리를 벗기고 잘림은 MAX_TOKENS 로');

  { const ro = B.claudeVisionRequest(body, 'claude-opus-5-5', 8000), rs = B.claudeVisionRequest(body, 'claude-sonnet-5-5', 8000); T(!('thinking' in ro) && !!rs.thinking, '오퍼스 요청에는 thinking 을 넣지 않는다(실측 400) · 소네트는 넣는다'); }
  console.log('③ 사진 읽기 길 고르기 — 손글씨 둘은 오퍼스 · 인쇄 표 셋은 소네트 · PDF 도 소네트 먼저');
  CFG = { aiKey: 'g-key', claudeKey: 'c-key' };
  await B.getMirConfig(true);
  claudeText = '{"items":[{"cn":"A"}]}';
  const kinds = { esealPhoto: 'claude-opus-5-5', sheetPhoto: 'claude-opus-5-5', listPhoto: 'claude-sonnet-5-5', reeferPhoto: 'claude-sonnet-5-5', portMisCapture: 'claude-sonnet-5-5', stowagePdf: 'claude-sonnet-5-5' };
  for (const [k, m] of Object.entries(kinds)) {
    calls.length = 0;
    const r = await B.aiCall(k, body, { timeoutMs: 20000 });
    const j = await r.json();
    const cc = claudeCalls();
    T(r.ok && cc.length === 1 && cc[0].body.model === m && j.candidates[0].content.parts[0].text.includes('"cn":"A"'), `${k} → ${m} 로 읽고 제미나이 모양으로 돌려준다`, cc[0] ? cc[0].body.model : '클로드 호출 없음');
  }
  // 사진 한 장이 클로드에 거부돼도(HEIC 등) 전체를 끄지 않고 이번만 제미나이로 간다
  calls.length = 0;
  const heic = { contents: [{ parts: [{ text: 'x' }, { inline_data: { mime_type: 'image/heic', data: 'AAAA' } }] }] };
  const rh = await B.aiCall('listPhoto', heic, { timeoutMs: 20000 });
  T(rh.ok && claudeCalls().length === 0 && calls.some((c) => c.url.includes('generativelanguage')), 'HEIC 는 클로드를 건너뛰고 이번만 제미나이로 간다');
  calls.length = 0;
  await B.aiCall('listPhoto', body, { timeoutMs: 20000 });
  T(claudeCalls().length === 1, 'HEIC 한 장 뒤에도 클로드는 꺼지지 않는다');
  T(['어디 있어', '무게 얼마야', '몇 시에 끝나', '현황 알려줘'].every((x) => !B.isChatCandidate(x, '잡담')) && B.isChatCandidate('졸려', '잡담'), '일 낱말이 든 말은 잡담 창구여도 생활회화로 새지 않는다');
  CFG = { aiKey: 'g-key', claudeKey: 'c-key', visionProvider: 'gemini' }; await B.getMirConfig(true);
  calls.length = 0;
  await B.aiCall('listPhoto', body, { timeoutMs: 20000 });
  T(claudeCalls().length === 0 && calls.some((c) => c.url.includes('generativelanguage')), '설정 visionProvider=gemini 면 배포 없이 제미나이로 되돌린다');
  CFG = { aiKey: 'g-key', claudeKey: 'c-key', claudeOpusModel: 'claude-opus-x' }; await B.getMirConfig(true);
  calls.length = 0;
  await B.aiCall('esealPhoto', body, { timeoutMs: 20000 });
  T(claudeCalls()[0] && claudeCalls()[0].body.model === 'claude-opus-x', '설정 claudeOpusModel 로 오퍼스 모델 이름을 바꿀 수 있다');

  console.log('④ 생활회화 층 — 규칙이 못 받은 일 아닌 말은 소네트가 이어서 말한다');
  CFG = { aiKey: 'g-key', claudeKey: 'c-key', dailyCap: 500, enabled: true }; await B.getMirConfig(true);
  T(B.isChatCandidate('졸려', '잡담') && B.isChatCandidate('농담 하나 해줘', '') && B.isChatCandidate('파이썬이 뭐야', '') && !B.isChatCandidate('OBWH 몇 대야', '') && !B.isChatCandidate('3번 베이 끝났어', ''), '생활회화 후보 판정 — 일 낱말·숫자가 든 말은 아니다');
  claudeText = (b) => {
    const p = JSON.stringify(b);
    if (p.includes('엔지니어 번역기') || p.includes('번역기다')) return '{"canonical":"","window":"잡담","confidence":0.95}';
    return '졸리면 잠깐 눈 붙이고 오세요. 따뜻한 커피도 좋고요 😺';
  };
  calls.length = 0;
  let r1 = await B.askMirModel('졸려', { app: 'smoke', voyageKey: '', inspector: '시험' }, () => null, { who: '시험', weakText: null, weakVia: '' });
  T(r1.via === 'chat' && /졸리면/.test(r1.text) && !/\(AI\)/.test(r1.text), '«졸려» → 생활회화 답(via chat) · «(AI)» 꼬리 없음', JSON.stringify(r1).slice(0, 120));
  const chatPrompt = claudeCalls().map((c) => JSON.stringify(c.body)).find((p) => p.includes('다정한 고양이'));
  T(!!chatPrompt && /지어내지 않는다/.test(chatPrompt) && /109/.test(chatPrompt) && /"졸려"/.test(chatPrompt.replace(/\\"/g, '"')), '프롬프트 — 일 자료를 지어내지 않는다 · 위기 신호 안내 · 질문이 들어간다');
  claudeText = (b) => (JSON.stringify(b).includes('번역기다') ? '{"canonical":"","window":"잡담","confidence":0.95}' : 'MNBU1234567 은 12대예요');
  const r2 = await B.askMirModel('심심해', { app: 'smoke', voyageKey: '', inspector: '시험' }, () => null, { who: '시험', weakText: null, weakVia: '' });
  T(r2.via !== 'chat', '일 자료(컨번호·N대)를 지어낸 생활회화 답은 버린다', JSON.stringify(r2).slice(0, 100));
  claudeText = (b) => (JSON.stringify(b).includes('번역기다') ? '{"canonical":"","window":"","confidence":0.4}' : '파이썬은 1991년에 나온 프로그래밍 언어예요. 문법이 쉬워서 입문용으로 많이 쓰고 장점이 3개쯤 돼요 😺');
  const r2b = await B.askMirModel('파이썬이 뭐야', { app: 'smoke', voyageKey: '', inspector: '시험' }, () => null, { who: '시험', weakText: null, weakVia: '' });
  T(r2b.via === 'chat' && /1991년/.test(r2b.text) && !/자료에 없/.test(r2b.text), '일반 상식(«파이썬이 뭐야»)도 클로드가 아는 대로 답한다 — 숫자가 든 답을 버리지 않는다', JSON.stringify(r2b).slice(0, 120));
  claudeText = (b) => (JSON.stringify(b).includes('번역기다') ? '{"canonical":"리퍼 몇 대","window":"대수","confidence":0.95}' : '안 불려야 한다');
  calls.length = 0;
  const r3 = await B.askMirModel('냉동 컨 개수 알려줘', { app: 'smoke', voyageKey: '', inspector: '시험' }, (cq) => (cq === '리퍼 몇 대' ? '리퍼 12대예요' : null), { who: '시험', weakText: null, weakVia: '' });
  T(r3.via === 'translate' && r3.text === '리퍼 12대예요' && !claudeCalls().some((c) => JSON.stringify(c.body).includes('다정한 고양이')), '일 질문은 번역 → 규칙 답으로 가고 생활회화 층을 부르지 않는다');
  claudeMode = 'fail';
  const r4 = await B.askMirModel('외로워', { app: 'smoke', voyageKey: '', inspector: '시험' }, () => null, { who: '시험', weakText: null, weakVia: '' });
  T(r4 !== undefined && r4.via !== 'chat' || r4.via === 'chat', '클로드가 막혀도 터지지 않고 제미나이·종전 길로 돌아간다', JSON.stringify(r4).slice(0, 100));
  claudeMode = 'ok';

  console.log('⑤ 4.36-02 — 웹 검색(하루 1달러 한도) · 일 낱말이 든 상식 질문 · 사진 토큰 기록');
  const ctx5 = { app: 'smoke', voyageKey: '', inspector: '시험' };
  const realNow = Date.now; let TOFF = 3 * 60 * 1000;   // 앞 시험(클로드 과부하)이 건 2분 휴지와 30초 비용 캐시를 시계를 앞으로 돌려 건너뛴다
  Date.now = () => realNow() + TOFF;
  const noW = { who: '시험', weakText: null, weakVia: '' };
  claudeText = (b) => (JSON.stringify(b).includes('번역기다') ? '{"canonical":"","window":"","confidence":0.4}' : '일반 대화예요');
  CFG = { aiKey: 'g-key', claudeKey: 'c-key', dailyCap: 500, enabled: true }; await B.getMirConfig(true);
  WEBROWS = { a: { usd: 0.2 } };
  calls.length = 0;
  const w1 = await B.askMirModel('지금 한국 가요차트에서 1위가 누구야', ctx5, () => null, noW);
  const wc = claudeCalls().find((c) => c.body && c.body.tools);
  T(w1.via === 'chat' && /A2O LITE의 "NEON"이고/.test(w1.text) && !/ 이고/.test(w1.text), '실시간 질문(차트 1위)은 웹 검색으로 답한다 — 글 조각 사이에 띄어쓰기를 넣지 않는다', JSON.stringify(w1).slice(0, 120));
  T(!!wc && wc.body.tools[0].name === 'web_search' && wc.body.tools[0].max_uses === 1, '검색 도구는 질문당 1회만 허용한다');
  const rsv = calls.findIndex((c) => c.url.includes('/mir_websearch/') && c.body && c.body.reserve === true && c.body.usd === 0.05);
  const srch = calls.findIndex((c) => c.url.includes('api.anthropic.com') && c.body && c.body.tools);
  T(rsv >= 0 && srch > rsv, '검색을 부르기 전에 예상 비용(0.05달러)을 서버에 먼저 잡는다 — 여러 폰이 동시에 물어도 한도를 넘지 않게');
  const wl = calls.find((c) => c.url.includes('/mir_websearch/') && c.url.includes('slot1') && c.body && c.body.reserve === false);
  T(!!wl && Math.abs(wl.body.usd - 0.042) < 0.001 && wl.body.searches === 1, '응답이 오면 실제 usage 로 비용을 확정한다 — 소네트 5.5 단가 2·10달러 (입력 14,913·출력 219·검색 1회 ≈ 0.042달러)', wl ? JSON.stringify(wl.body) : '기록 없음');
  const webLogRow = calls.find((c) => c.url.includes('/mir_model_log/') && c.body && c.body.kind === 'web');
  T(!!webLogRow && webLogRow.body.searches === 1 && webLogRow.body.usd > 0, 'mir_model_log 에 kind web 으로 토큰과 비용이 남는다');
  TOFF += 40000; WEBROWS = { a: { usd: 0.5 }, b: { usd: 0.46 } };   // 오늘 0.96달러 썼다 → 남은 0.04 < 한 번 예상 0.05
  claudeText = (b) => (JSON.stringify(b).includes('번역기다') ? '{"canonical":"","window":"","confidence":0.4}' : '일반 대화예요');
  await B.getMirConfig(true);
  calls.length = 0;
  const w2 = await B.askMirModel('오늘 뉴스 속보 알려줘', ctx5, () => null, noW);
  T(w2.via === 'chat' && /한도/.test(w2.text) && /1달러/.test(w2.text) && !claudeCalls().some((c) => c.body && c.body.tools), '하루 한도(1달러)에 닿으면 검색하지 않고 한도를 다 썼다고 말한다', JSON.stringify(w2).slice(0, 120));
  { // 4.37: 콘앱 웹 검색은 하루 합계가 한도의 절반에 닿으면 먼저 멈춘다 — 검수사 2026-10-19 «콘앱 사용자는 이기능을 모릅니다. 일 1불이 넘게되면 콘앱 웹검색을 먼저 막습니다»
    const ctxCone = { ...ctx5, app: 'cone' };
    TOFF += 40000; WEBROWS = { a: { usd: 0.46 } }; calls.length = 0;
    const c1 = await B.askMirModel('오늘 속보 뉴스 알려줘', ctxCone, () => null, noW);
    T(!claudeCalls().some((c) => c.body && c.body.tools) && /한도를 다 써서/.test(c1.text || '') && !/달러/.test(c1.text || ''), '콘앱은 오늘 0.46달러 쓴 날 검색을 멈춘다(0.46 + 예상 0.05 > 0.5) — 콘앱 문구에는 금액을 말하지 않는다', JSON.stringify(c1).slice(0, 100));
    TOFF += 40000; calls.length = 0;
    const t1 = await B.askMirModel('오늘 주가 시세 어때', ctx5, () => null, noW);
    const rv = calls.find((c) => c.url.includes('/mir_websearch/') && c.body && c.body.reserve === true);
    T(claudeCalls().some((c) => c.body && c.body.tools) && !!rv && rv.body.app === 'smoke', '같은 날 콘앱이 아닌 앱은 1달러까지 검색하고, 검색 장부에 앱 이름을 남긴다', JSON.stringify(t1).slice(0, 80));
    TOFF += 40000; WEBROWS = { a: { usd: 0.3 } }; calls.length = 0;
    await B.askMirModel('요즘 인기 영화 순위', ctxCone, () => null, noW);
    const rc = calls.find((c) => c.url.includes('/mir_websearch/') && c.body && c.body.reserve === true);
    T(claudeCalls().some((c) => c.body && c.body.tools) && !!rc && rc.body.app === 'cone', '콘앱도 절반 전(0.3달러)에는 검색하고 장부에 cone 을 남긴다');
  }
  { // 비용을 읽지 못하거나 적지 못하면 한도가 풀리지 않게 검색하지 않는다 · 일 낱말·소네트 아닌 모델도 검색 안 함
    for (const mode of ['read', 'write']) {
      WEBFAIL = mode; TOFF += 40000; WEBROWS = {}; calls.length = 0;
      const wf = await B.askMirModel('코스피 주가 어때', ctx5, () => null, noW);
      T(!claudeCalls().some((c) => c.body && c.body.tools) && wf.via === 'chat', `비용 ${mode === 'read' ? '읽기' : '쓰기'}가 실패하면 검색하지 않고 종전 생활회화로 답한다`, JSON.stringify(wf).slice(0, 80));
    }
    WEBFAIL = ''; TOFF += 40000; WEBROWS = {}; calls.length = 0;
    await B.askMirModel('양하 순위 알려줘', ctx5, () => null, noW);
    await B.askMirModel('1위 호기 어디야', ctx5, () => null, noW);
    T(!claudeCalls().some((c) => c.body && c.body.tools), '일 낱말이 든 말(«양하 순위»·«1위 호기»)은 웹 검색으로 새지 않는다');
    CFG = { aiKey: 'g-key', claudeKey: 'c-key', claudeModel: 'claude-opus-5-5', dailyCap: 500, enabled: true }; await B.getMirConfig(true); TOFF += 40000; calls.length = 0;
    await B.askMirModel('오늘 뉴스 속보', ctx5, () => null, noW);
    T(!claudeCalls().some((c) => c.body && c.body.tools), '모델이 소네트가 아니면(단가를 모르므로) 검색하지 않는다');
    CFG = { aiKey: 'g-key', claudeKey: 'c-key', claudeModel: 'claude-sonnet-4-5', dailyCap: 500, enabled: true }; await B.getMirConfig(true); TOFF += 40000; calls.length = 0;
    await B.askMirModel('오늘 뉴스 속보 좀', ctx5, () => null, noW);
    T(!claudeCalls().some((c) => c.body && c.body.tools), '4.37: 소네트라도 단가표(aiCost.js)에 없는 모델이면 검색하지 않는다(소유자 화면과 같은 판정)');
  }
  CFG = { aiKey: 'g-key', claudeKey: 'c-key', dailyCap: 500, enabled: true, webSearchUsd: 0 }; await B.getMirConfig(true); TOFF += 40000; WEBROWS = {};
  calls.length = 0;
  await B.askMirModel('코스피 주가 어때', ctx5, () => null, noW);
  T(!claudeCalls().some((c) => c.body && c.body.tools), 'mir_config.webSearchUsd=0 이면 배포 없이 검색을 끈다');
  CFG = { aiKey: 'g-key', claudeKey: 'c-key', dailyCap: 500, enabled: true, webSearchUsd: 3 }; await B.getMirConfig(true); TOFF += 40000; WEBROWS = { a: { usd: 2 } };
  calls.length = 0;
  const w3 = await B.askMirModel('요즘 뜨는 노래 순위', ctx5, () => null, noW);
  T(w3.via === 'chat' && /NEON/.test(w3.text), '한도는 mir_config.webSearchUsd 로 바꾼다(3달러면 2달러 쓴 뒤에도 검색)', JSON.stringify(w3).slice(0, 80));
  CFG = { aiKey: 'g-key', claudeKey: 'c-key', dailyCap: 500, enabled: true }; await B.getMirConfig(true); WEBROWS = {};
  claudeText = (b) => { const p = JSON.stringify(b); if (p.includes('번역기다')) return '{"canonical":"","window":"","confidence":0.3}'; if (p.includes('자료(JSON)')) return '임진왜란은 자료에 없는 내용이라 답을 드리기 어려워요. 저는 평택항 검수 자료만 볼 수 있어요.'; return '임진왜란은 1592년에 일어났고 7년 동안 이어졌어요 😺'; };
  calls.length = 0;
  const w4 = await B.askMirModel('조선시대 임진왜란은 언제야', ctx5, () => null, noW);
  T(w4.via === 'chat' && /1592/.test(w4.text) && !/자료에 없/.test(w4.text), '«언제야»가 든 상식 질문도 자료 답이 «자료에 없어요»면 생활회화로 받는다', JSON.stringify(w4).slice(0, 120));
  calls.length = 0;
  const w4b = await B.askMirModel('OBWH 2769E 언제 끝나', ctx5, () => null, noW);
  T(w4b.via !== 'chat' && !claudeCalls().some((c) => JSON.stringify(c.body).includes('다정한 고양이')), '배 이름·번호가 든 일 질문은 «자료에 없어요» 를 상식 답으로 바꾸지 않는다', JSON.stringify(w4b).slice(0, 100));
  claudeText = (b) => (JSON.stringify(b).includes('번역기다') ? '{"canonical":"리퍼 몇 대","window":"대수","confidence":0.95}' : '안 불려야 한다');
  calls.length = 0;
  const w5 = await B.askMirModel('냉동 컨 개수 언제야', ctx5, (cq) => (cq === '리퍼 몇 대' ? '리퍼 12대예요' : null), noW);
  T(w5.via === 'translate' && !claudeCalls().some((c) => JSON.stringify(c.body).includes('다정한 고양이')), '일 질문은 여전히 규칙 답이 먼저다(상식 구제가 일 질문을 가로채지 않는다)');
  claudeText = '{"items":[{"cn":"A"}]}';
  Date.now = realNow;
  calls.length = 0;
  await B.aiCall('listPhoto', body, { timeoutMs: 20000 });
  const pl = calls.find((c) => c.url.includes('/ai_call_log/') && c.body && c.body.kind === 'listPhoto');
  T(!!pl && pl.body.tokIn === 10 && pl.body.tokOut === 5 && pl.body.model, '사진·PDF 호출 기록(ai_call_log)에 입력·출력 토큰이 남는다', pl ? JSON.stringify(pl.body) : '기록 없음');

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\n4.36 연막검사 ${n - bad}/${n} 통과`);
  if (bad) { console.log('✗ 실패 — 배포 금지'); process.exit(1); }
})().catch((e) => { console.error('✗ 연막검사가 터졌다:', e && e.stack || e); process.exit(1); });
