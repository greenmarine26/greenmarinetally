// 공용 AI 키 연막검사 (3.43 판 C) — 실소스 번들(gemini.js·mixerUpload.js·mirModel.js)에 fetch 스텁을 물려 «여섯 창구가 전부 공용 키(검수사 부담) 한 벌로, 타임아웃과 기록을 달고 도는가»를 잰다.
//   검수사 2026-09-10 «1번인데 회사 유료키가 아니고 제가 부담합니다» — 키는 RTDB mir_config 한 칸, 소스에 없다.
//   ⚠ 모델 응답은 스텁이다 — 모델 품질이 아니라 **키 고르기·타임아웃·기록·배선**을 잰다.
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }

let personal = '';
global.window = { addEventListener() {}, dispatchEvent() { return true; } };
global.localStorage = { getItem: (k) => (k === 'master_gemini_api_key_v1' ? personal : (k === 'master_active_inspector_v1' ? '연막' : null)), setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
global.URL = global.URL || {}; global.URL.createObjectURL = () => 'blob:x'; global.URL.revokeObjectURL = () => {};
global.Image = class { set src(v) { setTimeout(() => this.onerror && this.onerror(new Error('no canvas')), 0); } };
global.FileReader = class { readAsDataURL() { setTimeout(() => { this.result = 'data:image/jpeg;base64,QUJD'; this.onload && this.onload(); }, 0); } };
global.Blob = global.Blob || class { constructor(parts, o) { this.size = 3; this.type = (o && o.type) || ''; } };

const calls = { fetch: [], log: [] };
let cfgJson = { aiKey: 'SHARED-KEY', model: 'gemini-3.5-flash-lite', dailyCap: 300, enabled: true };
let cfgThrows = false;
let modelText = 'ok';
let hang = false;
const resp = (status, json) => ({ ok: status >= 200 && status < 300, status, json: async () => json, text: async () => JSON.stringify(json) });
global.fetch = (url, opts = {}) => {
  const u = String(url);
  if (u.includes('/mir_config.json')) { if (cfgThrows) return Promise.reject(new Error('net down')); return Promise.resolve(resp(200, cfgJson)); }
  if (u.includes('/ai_call_log/')) { calls.log.push({ url: u, body: JSON.parse(opts.body || '{}') }); return Promise.resolve(resp(200, { name: 'x' })); }
  if (u.includes('generativelanguage.googleapis.com')) {
    calls.fetch.push({ url: u, body: JSON.parse(opts.body || '{}'), signal: opts.signal, key: (opts.headers || {})['x-goog-api-key'] || '' });
    //  hang 모드 — 진짜 시간을 기다리지 않는다(build.sh 25초 낭비, 감사 지적). 브라우저가 abort 할 때와 같은 모양(name='AbortError')으로 바로 거절한다.
    if (hang) return new Promise((_, rej) => { setTimeout(() => { const e = new Error('aborted'); e.name = 'AbortError'; rej(e); }, 50); });
    return Promise.resolve(resp(200, { candidates: [{ content: { parts: [{ text: modelText }] }, finishReason: 'STOP' }], usageMetadata: { totalTokenCount: 10 } }));
  }
  return Promise.resolve(resp(200, null));
};

const M = require(path.resolve(OUT));
let n = 0, bad = 0;
const check = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const keyOf = (f) => (f && f.key) || '';
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

(async () => {
  console.log('공용 AI 키 연막검사 (3.43 판 C)');
  // ① 키 고르기 — 공용 먼저, 비면 개인, 못 읽으면 개인
  personal = 'PERSONAL-KEY';
  await M.getMirConfig(true);
  check('공용 키가 있으면 개인 키가 있어도 공용 키', (await M.resolveAiKey()) === 'SHARED-KEY');
  cfgJson = { model: 'gemini-3.5-flash-lite' }; await M.getMirConfig(true);
  check('공용 키가 비면 개인 키', (await M.resolveAiKey()) === 'PERSONAL-KEY');
  personal = '';
  await M.getMirConfig(true);
  check('둘 다 없으면 빈 키', (await M.resolveAiKey()) === '');
  personal = 'PERSONAL-KEY'; cfgThrows = true; await M.getMirConfig(true);
  check('보관소를 못 읽어도(네트워크) 개인 키로 간다', (await M.resolveAiKey()) === 'PERSONAL-KEY');
  cfgThrows = false; personal = '';
  cfgJson = {};
  let threw = '';
  try { await M.aiCall('search', { contents: [] }); } catch (e) { threw = e.message; }
  check('키 없으면 aiCall 이 🔑 안내로 던진다(빈 키로 400 받는 조용한 실패 금지)', /🔑/.test(threw), threw);
  check('키 없을 때 제미나이를 부르지 않았다', calls.fetch.length === 0);

  // ② aiCall — 공용 키로 부르고 기록 한 줄
  cfgJson = { aiKey: 'SHARED-KEY', model: 'gemini-3.5-flash-lite' }; await M.getMirConfig(true);
  calls.fetch.length = 0; calls.log.length = 0;
  const r = await M.aiCall('search', { contents: [{ parts: [{ text: 'q' }] }] }, { timeoutMs: 5000 });
  check('aiCall 이 Response 를 그대로 돌려준다', r && r.ok === true && typeof r.json === 'function');
  check('제미나이 호출의 키가 공용 키(헤더 x-goog-api-key)', keyOf(calls.fetch[0]) === 'SHARED-KEY', keyOf(calls.fetch[0]));
  check('키가 URL 쿼리에 실리지 않는다', !/key=/.test(calls.fetch[0]?.url || ''));
  check('모델은 종전 그대로 gemini-2.5-flash', /models\/gemini-2\.5-flash:generateContent/.test(calls.fetch[0]?.url || ''));
  check('타임아웃 signal 을 달고 부른다', !!calls.fetch[0]?.signal);
  await new Promise((res) => setTimeout(res, 5));
  const day = (() => { const d = new Date(); return `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; })();
  check('ai_call_log/{YYMMDD} 에 한 줄(창구·누가·HTTP 코드·ms)', calls.log.length === 1 && calls.log[0].url.includes(`/ai_call_log/${day}.json`) && calls.log[0].body.kind === 'search' && calls.log[0].body.who === '연막' && calls.log[0].body.status === 200 && typeof calls.log[0].body.ms === 'number', JSON.stringify(calls.log[0] || null));
  check('기록에 키가 실리지 않는다', !JSON.stringify(calls.log[0] || {}).includes('SHARED-KEY'));

  // ③ 타임아웃 — 매달려 있지 않고 이유 있는 오류
  hang = true; calls.log.length = 0; threw = '';
  const t0 = Date.now();
  try { await M.aiCall('search', { contents: [] }, { timeoutMs: 300 }); } catch (e) { threw = e.message; }
  check('응답이 없으면 정한 시간에 끊고 «시간 초과» 로 알린다', /시간 초과/.test(threw) && Date.now() - t0 < 2000, threw);
  const agT = await M.askGemini('20피트 몇 대', { info: { vsl: 'TEST', voy: '1' } }, [], {});
  hang = false;
  check('검색패널은 시간 초과를 «네트워크 오류» 로 감싸지 않는다', agT.ok === false && /^AI 응답 시간 초과/.test(agT.error || ''), JSON.stringify(agT));
  await new Promise((res) => setTimeout(res, 5));
  check('시간 초과도 기록에 남는다(status -1, 두 번 다)', calls.log.length === 2 && calls.log.every((l) => l.body.status === -1), JSON.stringify(calls.log.map((l) => l.body)));

  // ④ 여섯 창구 배선 — 키 인자를 안 넘겨도 공용 키로 돈다
  calls.fetch.length = 0; calls.log.length = 0;
  modelText = '테스트 선박 소개입니다.';
  const si = await M.askShipIntro({ name: 'KMTC OSAKA' });
  check('선박 소개 → 공용 키 · shipIntro 기록', si.ok === true && keyOf(calls.fetch[0]) === 'SHARED-KEY' && calls.fetch[0].body.tools && (await new Promise((res) => setTimeout(res, 5)), calls.log.some((l) => l.body.kind === 'shipIntro')), JSON.stringify(si));
  calls.fetch.length = 0;
  modelText = JSON.stringify({ items: [{ cn: 'TEMU1234567', set: '-18', act: '-17.5' }] });
  const rf = await M.ocrReeferTemps(new Blob(['x'], { type: 'image/jpeg' }));
  check('리퍼 사진 → 키 인자 없이 공용 키 · reeferPhoto 창구', rf.items.length === 1 && rf.items[0].cn === 'TEMU1234567' && keyOf(calls.fetch[0]) === 'SHARED-KEY', JSON.stringify(rf));
  calls.fetch.length = 0;
  modelText = JSON.stringify({ containers: [{ cn: 'TEMU1234567' }] });
  let ic = null; try { ic = await M.ocrImageContainers(new Blob(['x'], { type: 'image/jpeg' })); } catch (e) { ic = { err: e.message }; }
  check('사진 리스트 → 공용 키로 부른다', keyOf(calls.fetch[0]) === 'SHARED-KEY', JSON.stringify(ic).slice(0, 120));
  calls.fetch.length = 0;
  modelText = JSON.stringify({ ships: [] });
  let pm = null; try { pm = await M.ocrPortMisCapture(new Blob(['x'], { type: 'image/jpeg' })); } catch (e) { pm = { err: e.message }; }
  check('PORT-MIS 캡처 → 공용 키로 부른다', keyOf(calls.fetch[0]) === 'SHARED-KEY', JSON.stringify(pm).slice(0, 120));
  calls.fetch.length = 0;
  modelText = JSON.stringify({ vesselName: 'X', bays: [] });
  let sp = null; try { sp = await M.ocrStowagePdf(new Blob(['x'], { type: 'application/pdf' })); } catch (e) { sp = { err: e.message }; }
  check('PDF 베이 → 공용 키로 부른다', keyOf(calls.fetch[0]) === 'SHARED-KEY', JSON.stringify(sp).slice(0, 120));
  calls.fetch.length = 0;
  modelText = '20피트 3대입니다.';
  const ag = await M.askGemini('20피트 몇 대', { info: { vsl: 'TEST', voy: '1' } }, [{ cn: 'TEMU1234567', size: '22G1', pod: 'KRPTK' }], {});
  check('검색패널 AI → 공용 키 · 답', ag.ok === true && keyOf(calls.fetch[0]) === 'SHARED-KEY', JSON.stringify(ag).slice(0, 160));
  check('검색패널 호출도 signal(타임아웃)을 단다', calls.fetch.every((f) => !!f.signal));

  // ⑤ 소스 정적 검사 — 옛 길이 남아 있지 않다
  const g = src('src/gemini.js'), mx = src('src/mixerUpload.js');
  const direct = (mx.match(/generativelanguage\.googleapis\.com/g) || []).length;
  check('mixerUpload 에 직접 URL 이 없다(전부 aiCall)', direct === 0, String(direct));
  check('gemini.js 의 제미나이 URL 은 aiCall 한 곳뿐', (g.match(/generativelanguage\.googleapis\.com\/v1beta\/models\/\$\{/g) || []).length === 1);
  const callers = ['src/components/StowageReviewModal.jsx', 'src/components/PortMisCaptureModal.jsx', 'src/components/ReeferMemoModal.jsx', 'src/pages/VoyagePage.jsx'];
  check('네 호출부에 «SK.geminiKey || GEMINI_API_KEY» 옛 길이 없다', callers.every((f) => !/_storage\.get\(SK\.geminiKey\)\s*\|\|/.test(src(f))));
  check('네 호출부가 resolveAiKey 를 부른다', callers.every((f) => /resolveAiKey\(\)/.test(src(f))));
  check('검색패널 AI 버튼이 이벤트 객체를 질문으로 넘기지 않는다', /onClick=\{\(\) => handleAskAI\(\)\}/.test(src('src/components/SearchPanel.jsx')));
  check('🔑 설정창이 공용 키를 알아본다', /공용 키 사용 중/.test(src('src/components/GeminiKeyModal.jsx')) && /getMirConfig/.test(src('src/components/GeminiKeyModal.jsx')));
  check('매뉴얼(helpData)이 공용 키를 말한다', /공용 AI 키/.test(src('src/data/helpData.js')));
  check('APP_VERSION 이 3.43 이상(공용 키 판 뒤)', parseFloat(String(M.APP_VERSION).replace(/^TallyOne /, '')) >= 3.43, M.APP_VERSION);   // APP_NOTE 는 판마다 바뀌므로 여기서 못 박지 않는다(3.43-01 에서 걸렸다)

  console.log(`\n${bad ? '✗' : '✔'} 공용 AI 키 연막검사 ${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('✗ 연막검사 자체가 죽었다:', e && e.stack); process.exit(1); });
