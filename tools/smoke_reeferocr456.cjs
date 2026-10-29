// 리퍼 온도 사진 판독 4.56-05 연막검사 — 줄 기준 규칙(누운 사진·NO. 열·이웃 줄 금지)·사후 검산(범위·세팅과의 거리)·클로드 재시도·어느 AI가 읽었는지.
//   검수사 2026-10-30 «-19.0 밑에 -2.5 가 있는 줄인데 그걸 하나로 읽습니다» (STMJ 2667E 둘째 장). 사진을 받아 보니 51번·52번 두 컨테이너 줄이 밀려 읽힌 것이었다.
//   ⚠ 모델 응답은 스텁이다 — 모델의 눈이 아니라 **프롬프트 문구·후처리·재시도·배선**을 잰다. 실제 읽기 품질은 사진으로만 확인된다.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const MODE = process.argv[3] || 'main';
const TMPD = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm') ? '/dev/shm' : os.tmpdir(), 'smokerfo-'));
const OUT = path.join(TMPD, 'b.cjs');
try {
  execSync(`npx esbuild ${JSON.stringify(path.join(ROOT, 'tools/smoke_aikey_entry.js'))} --bundle --platform=node --format=cjs --outfile=${JSON.stringify(OUT)} --loader:.js=jsx --jsx=automatic --log-level=error`, { cwd: ROOT, stdio: 'inherit' });
} catch (e) { console.error('✗ 번들 실패'); process.exit(1); }

global.window = { addEventListener() {}, dispatchEvent() { return true; } };
global.localStorage = { getItem: (k) => (k === 'master_active_inspector_v1' ? '연막' : null), setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
global.URL = global.URL || {}; global.URL.createObjectURL = () => 'blob:x'; global.URL.revokeObjectURL = () => {};
global.Image = class { set src(v) { setTimeout(() => this.onerror && this.onerror(new Error('no canvas')), 0); } };
global.FileReader = class { readAsDataURL() { setTimeout(() => { this.result = 'data:image/jpeg;base64,QUJD'; this.onload && this.onload(); }, 0); } };

const calls = { claude: [], gemini: [] };
let claudeQueue = [];      // 호출마다 꺼내 쓰는 상태 코드(200 이면 modelText)
let modelText = '{"items":[]}';
const resp = (status, json) => ({ ok: status >= 200 && status < 300, status, json: async () => json, text: async () => JSON.stringify(json) });
global.fetch = (url, opts = {}) => {
  const u = String(url);
  if (u.includes('/mir_config.json')) return Promise.resolve(resp(200, { claudeKey: 'CK', aiKey: 'GK', dailyCap: 300, enabled: true }));
  if (u.includes('/ai_call_log/')) return Promise.resolve(resp(200, { name: 'x' }));
  if (u.includes('api.anthropic.com')) {
    calls.claude.push(JSON.parse(opts.body || '{}'));
    const st = claudeQueue.length ? claudeQueue.shift() : 200;
    if (st !== 200) return Promise.resolve(resp(st, { error: { message: st === 401 ? 'invalid api key' : 'overloaded' } }));
    return Promise.resolve(resp(200, { content: [{ type: 'text', text: modelText }], usage: { input_tokens: 10, output_tokens: 5 }, stop_reason: 'end_turn' }));
  }
  if (u.includes('generativelanguage.googleapis.com')) {
    calls.gemini.push(JSON.parse(opts.body || '{}'));
    return Promise.resolve(resp(200, { candidates: [{ content: { parts: [{ text: modelText }] }, finishReason: 'STOP' }] }));
  }
  return Promise.resolve(resp(200, null));
};

const M = require(OUT);
let n = 0, bad = 0;
const check = (name, cond, extra) => { n += 1; if (!cond) bad += 1; console.log((cond ? '  ✓ ' : '  ✗ ') + name + (cond ? '' : '  → ' + (extra || ''))); };
const blob = { size: 3, type: 'image/jpeg' };
const promptOf = (body) => ((body.messages && body.messages[0].content.find((c) => c.type === 'text')) || {}).text || '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  if (MODE === 'hard') {
    //  인증·한도 문제(401)는 30분 쉬는 사유 — 재시도하지 않고 바로 제미나이로 간다.
    claudeQueue = [401]; modelText = JSON.stringify({ items: [{ cn: 'TEMU1234567', set: '-19.0', act: '-2.5' }] });
    const r = await M.ocrReeferTemps(blob, '', []);
    await sleep(5);
    check('401 은 재시도 없이 클로드 한 번 → 제미나이', calls.claude.length === 1 && calls.gemini.length === 1 && /^gemini/.test(r.model), JSON.stringify({ c: calls.claude.length, g: calls.gemini.length, m: r.model }));
    console.log(bad ? `\n✗ ${bad}/${n} 실패` : `\n리퍼 판독 4.56-05(401) — ${n}/${n} 통과`);
    fs.rmSync(TMPD, { recursive: true, force: true }); process.exit(bad ? 1 : 0);
  }

  //  ① 정상 — 줄 기준 규칙이 프롬프트에 실리고, 참고 목록은 싣지 않는다(실측 시험에서 목록 없이 36/36)
  modelText = JSON.stringify({ items: [{ no: '51', cn: 'SKRU9401610', set: '-19.0', act: '-19.0' }, { no: '52', cn: 'TLLU7008801', set: '-2.6', act: '-2.6' }] });
  const expect = [{ cn: 'SKRU9401610', set: '-19.0' }, { cn: 'TLLU7008801', set: '-2.6℃' }];
  const r1 = await M.ocrReeferTemps(blob, '', expect);
  const P = promptOf(calls.claude[0]);
  check('줄 번호가 달린 답도 그대로 통과한다', r1.items.length === 2 && r1.items[0].set === '-19.0' && r1.items[1].set === '-2.6' && r1.items[1].act === '-2.6', JSON.stringify(r1.items));
  check('프롬프트: 누운 사진은 방향을 바로잡아 읽는다', /옆으로 누워 있을 수 있습니다/.test(P) && /글자 방향을 바로잡아/.test(P));
  check('프롬프트: 줄은 맨 앞 NO. 열이 정하고 `no` 를 같이 돌려준다', /맨 앞 NO\. 열/.test(P) && /"no" 항목/.test(P) && /"no":"줄 번호"/.test(P));
  check('프롬프트: 이웃 줄의 값을 가져오지 않는다 · 실측은 세팅과 가깝다(3도)', /이웃 줄의 값을 가져오지 않습니다/.test(P) && /3도 이상 벌어지면/.test(P));
  check('⛔ 틀린 «한 칸 안 위아래 두 값» 규칙이 없다(실물은 이웃한 두 컨테이너 줄이었다)', !/위아래로 둘 있으면/.test(P) && !/위 값 = set/.test(P));
  check('참고 목록(expect)은 프롬프트에 싣지 않는다', !/참고 — 이 항차 리퍼 목록/.test(P) && !/SKRU9401610 \//.test(P));
  check('기존 규칙이 살아 있다(PLUG IN TEMP 금지 · set 복사 금지)', /PLUG IN TEMP[\s\S]{0,120}실제온도가 아닙니다/.test(P) && /set 을 복사해 넣지 마십시오/.test(P));
  check('어느 AI가 읽었는지·원문·사진을 돌려준다', /^claude-/.test(r1.model) && r1.raw.includes('SKRU9401610') && r1.imageData === 'QUJD', JSON.stringify({ m: r1.model, i: r1.imageData }));
  check('세로 사진을 돌려 보내는 코드가 있다(반시계 90도)', /uprightLandscapeForm\(imageBlob\)/.test(fs.readFileSync(path.join(ROOT, 'src/mixerUpload.js'), 'utf8')) && /x\.rotate\(-Math\.PI \/ 2\)/.test(fs.readFileSync(path.join(ROOT, 'src/mixerUpload.js'), 'utf8')));

  //  ①-b 이웃 줄 값을 읽은 답 — 실측이 자료 세팅과 3도 이상 벌어지면 비우지 않고 far 로 알린다(옛 판 실물: TLLU7008801 에 -19.0)
  modelText = JSON.stringify({ items: [{ no: '52', cn: 'TLLU7008801', set: '-2.6', act: '-19.0' }, { no: '51', cn: 'SKRU9401610', set: '-19.0', act: '-18.9' }] });
  const rf = await M.ocrReeferTemps(blob, '', expect);
  check('⚠ 실측 -19.0 ↔ 자료 세팅 -2.6 은 far 에 오르고 값은 그대로 둔다', rf.far.length === 1 && /TLLU7008801 실측 -19.0 · 세팅 -2.6/.test(rf.far[0]) && rf.items[0].act === '-19.0', JSON.stringify(rf.far));
  check('세팅과 가까운 실측(-18.9 ↔ -19.0)은 far 가 아니다', !rf.far.some((x) => x.startsWith('SKRU9401610')));
  check('expect 없이 부르면 far 는 빈 배열이다', (await M.ocrReeferTemps(blob, '')).far.length === 0);

  //  ② 범위 검산 — 합쳐 읽은 값(-192.5)은 빈칸으로 두고 알린다
  modelText = JSON.stringify({ items: [{ cn: 'TEMU1234567', set: '-19.0', act: '-192.5' }, { cn: 'FBIU5370351', set: '250', act: '3' }] });
  const r2 = await M.ocrReeferTemps(blob, '', []);
  check('-192.5 · 250 은 빈칸으로 두고 suspects 에 올린다', r2.items[0].act === '' && r2.items[0].set === '-19.0' && r2.items[1].set === '' && r2.items[1].act === '3' && r2.suspects.length === 2, JSON.stringify(r2));
  check('0 은 빈칸이 아니다(범위 안)', (modelText = JSON.stringify({ items: [{ cn: 'TEMU1234567', set: '0', act: '0' }] }), (await M.ocrReeferTemps(blob, '', [])).items[0].set === '0'));

  //  ③ 클로드가 한 번 놓쳐도 한 번 더 클로드로 읽는다 — 제미나이로 새지 않는다
  calls.claude.length = 0; calls.gemini.length = 0;
  claudeQueue = [529]; modelText = JSON.stringify({ items: [{ cn: 'TEMU1234567', set: '-19.0', act: '-2.5' }] });
  const r3 = await M.ocrReeferTemps(blob, '', []);
  check('과부하(529) 한 번 → 클로드 재시도로 읽는다(제미나이 0)', calls.claude.length === 2 && calls.gemini.length === 0 && /^claude-/.test(r3.model), JSON.stringify({ c: calls.claude.length, g: calls.gemini.length, m: r3.model }));

  //  ④ 두 번 다 놓치면 제미나이 — 그리고 그렇다고 알려 준다
  calls.claude.length = 0; calls.gemini.length = 0;
  claudeQueue = [529, 529];
  const r4 = await M.ocrReeferTemps(blob, '', []);
  check('두 번 다 실패 → 제미나이로 읽고 model 이 제미나이로 표시된다', calls.claude.length === 2 && calls.gemini.length === 1 && /^gemini/.test(r4.model) && r4.items.length === 1, JSON.stringify({ c: calls.claude.length, g: calls.gemini.length, m: r4.model }));

  //  ⑤ 다른 창구는 재시도하지 않는다(동작 불변)
  //  앞 시험이 남긴 쉬는 시각을 걷어 낸다(성공 한 번이면 0 으로 돌아온다) — 안 그러면 재시도가 어차피 건너뛰어져 이 단언이 늘 참이 된다(독립 감사 변이 시험)
  claudeQueue = []; modelText = JSON.stringify({ items: [{ cn: 'TEMU1234567', set: '0', act: '0' }] });
  await M.ocrReeferTemps(blob, '', []);
  calls.claude.length = 0; calls.gemini.length = 0;
  claudeQueue = [529, 529, 529];
  await sleep(1);
  let li = null; try { li = await M.ocrImageContainers(blob, ''); } catch (e) { li = { err: e.message }; }
  check('리스트 사진은 재시도하지 않는다 — 종전 그대로(클로드 정확히 1회 · 재시도 없음)', calls.claude.length === 1, String(calls.claude.length));

  //  ⑤-b 회전을 실제로 실행한다 — 세로 사진은 반시계 90도(캔버스 가로·세로 맞바꿈, 변환 순서), 가로 사진은 원본 그대로
  {
    const ops = []; let made = null;
    const mk = (w, h) => { global.Image = class { constructor() { this.width = w; this.height = h; setTimeout(() => this.onload && this.onload(), 0); } set src(v) { this._s = v; } }; };
    global.URL = Object.assign(global.URL || {}, { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} });
    global.document = { createElement: () => { made = { width: 0, height: 0, getContext: () => ({ translate: (a, b) => ops.push(['t', a, b]), rotate: (a) => ops.push(['r', +a.toFixed(4)]), drawImage: () => ops.push(['d']) }), toBlob: (cb) => cb({ rotated: true }) }; return made; } };
    mk(1050, 1400);
    const out = await M.uprightLandscapeForm(blob);
    check('세로 사진(1050x1400)은 1400x1050 으로 돌려 보낸다', out && out.rotated === true && made.width === 1400 && made.height === 1050, JSON.stringify({ w: made && made.width, h: made && made.height }));
    check('회전은 반시계 90도다(왼쪽 아래로 옮긴 뒤 -90도 → 그리기)', JSON.stringify(ops) === JSON.stringify([['t', 0, 1050], ['r', -1.5708], ['d']]), JSON.stringify(ops));
    ops.length = 0; made = null; mk(1400, 1050);
    const same = await M.uprightLandscapeForm(blob);
    check('가로 사진은 원본 그대로(캔버스를 만들지 않는다)', same === blob && made === null && ops.length === 0);
    delete global.document; delete global.Image;
  }

  //  ⑤-c 모달 배선(소스 확인) — 기록 쓰기는 기다리지 않고 15초 제한 · 경고 문구는 세팅 불일치만 센다
  {
    const mod = fs.readFileSync(path.join(ROOT, 'src/components/ReeferMemoModal.jsx'), 'utf8');
    check('판독 기록 쓰기는 판독 흐름을 막지 않고(await 없이 시작) 15초 제한이 있다', !/await fbSaveReeferOcrLog/.test(mod) && /logJobs\.push\(Promise\.race\(\[\s*fbSaveReeferOcrLog/.test(mod) && /15000/.test(mod) && /await Promise\.all\(logJobs\)/.test(mod));
    check('far 줄은 «세팅이 자료와 다른 N대» 문구에 세지 않는다', mod.indexOf('const nSetBad') > 0 && mod.indexOf('const nSetBad') < mod.indexOf('for (const f of farAll)'));
    check('실측을 고쳐도 그 줄 경고가 지워진다', /k === 'set' \|\| k === 'act'\) setBadSet/.test(mod));
  }

  //  ⑥ 401 은 별도 프로세스로 — 같은 모듈 상태(쉬는 시각)가 앞 시험에 오염되지 않게
  let hardOut = '';
  try { hardOut = execSync(`node ${JSON.stringify(__filename)} ${JSON.stringify(ROOT)} hard`, { encoding: 'utf8' }); } catch (e) { hardOut = (e.stdout || '') + (e.stderr || ''); bad += 1; }
  console.log(hardOut.replace(/^\n/, '').trimEnd());
  n += 1;
  console.log(bad ? `\n✗ ${bad}/${n} 실패` : `\n리퍼 판독 4.56-05 — ${n}/${n} 통과`);
  fs.rmSync(TMPD, { recursive: true, force: true });
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('✗ 연막검사 예외', e); try { fs.rmSync(TMPD, { recursive: true, force: true }); } catch (x) { /* */ } process.exit(1); });
