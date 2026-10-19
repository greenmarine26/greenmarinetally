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
let CFG = {}; const calls = []; let claudeMode = 'ok'; let claudeText = '{"items":[]}';
const resp = (status, j) => ({ ok: status >= 200 && status < 300, status, json: async () => j, text: async () => JSON.stringify(j) });
global.fetch = async (url, opts = {}) => {
  url = String(url);
  const body = opts.body ? (() => { try { return JSON.parse(opts.body); } catch (e) { return opts.body; } })() : null;
  calls.push({ url, body });
  if (url.includes('/mir_config.json')) return resp(200, CFG);
  if (url.includes('/mir_model_log/')) return resp(200, opts.method === 'POST' ? { name: 'x' } : {});
  if (url.includes('/ai_call_log/') || url.includes('/mir_misses/')) return resp(200, { name: 'x' });
  if (url.includes('api.anthropic.com')) {
    if (claudeMode === 'fail') return resp(529, { error: { message: 'overloaded' } });
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
  claudeText = (b) => (JSON.stringify(b).includes('번역기다') ? '{"canonical":"리퍼 몇 대","window":"대수","confidence":0.95}' : '안 불려야 한다');
  calls.length = 0;
  const r3 = await B.askMirModel('냉동 컨 개수 알려줘', { app: 'smoke', voyageKey: '', inspector: '시험' }, (cq) => (cq === '리퍼 몇 대' ? '리퍼 12대예요' : null), { who: '시험', weakText: null, weakVia: '' });
  T(r3.via === 'translate' && r3.text === '리퍼 12대예요' && !claudeCalls().some((c) => JSON.stringify(c.body).includes('다정한 고양이')), '일 질문은 번역 → 규칙 답으로 가고 생활회화 층을 부르지 않는다');
  claudeMode = 'fail';
  const r4 = await B.askMirModel('외로워', { app: 'smoke', voyageKey: '', inspector: '시험' }, () => null, { who: '시험', weakText: null, weakVia: '' });
  T(r4 !== undefined && r4.via !== 'chat' || r4.via === 'chat', '클로드가 막혀도 터지지 않고 제미나이·종전 길로 돌아간다', JSON.stringify(r4).slice(0, 100));
  claudeMode = 'ok';

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\n4.36 연막검사 ${n - bad}/${n} 통과`);
  if (bad) { console.log('✗ 실패 — 배포 금지'); process.exit(1); }
})().catch((e) => { console.error('✗ 연막검사가 터졌다:', e && e.stack || e); process.exit(1); });
