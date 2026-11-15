// 5.03 연막검사 — 건8 클로드 하루 한도 이월(aiDayLimit) · 건10 실번호 대소문자(normSeal) · 건4 미르 자료 팩의 호기 자료. 실행 — node tools/smoke_c50300.cjs [저장소 루트]. 네트워크·실 Firebase 없음(스텁).
const fs = require('fs'), path = require('path'), os = require('os');
const { execSync } = require('child_process');
const ROOT = path.resolve(process.argv[2] || process.cwd());
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm') ? '/dev/shm' : os.tmpdir(), 'c50300_'));
let n = 0, bad = 0;
const ok = (c, m) => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) bad++; };
global.window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, open: () => null, location: { href: '' }, __fbShipBayDict: {} };
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, createElement: () => ({ style: {} }), documentElement: { style: {}, setAttribute() {} }, body: { appendChild() {} } };
global.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* 이미 있음 */ }
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
global.fetch = () => Promise.reject(new Error('연막: 네트워크 없음'));
const bundle = (src, name) => {
  const e = path.join(TMP, name + '.mjs'), o = path.join(TMP, name + '.cjs');
  fs.writeFileSync(e, src);
  execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
  return require(o);
};
const P = (d) => `${ROOT}/${d}`;
(async () => {
  const B = bundle(`export * from "${P('src/aiCost.js')}"; export { normSeal } from "${P('src/utils.js')}"; export { buildDataPack, claudeDayLimitNow, claudeOverDailyCap } from "${P('src/mir.js')}"; export { mergeFolder } from "${P('src/mergeApi.js')}";`, 'b');
  const NOW = Date.parse('2026-11-16T12:00:00+09:00');
  const rows = (arr) => arr.map((usd, i) => ({ day: B.aiDayKey(NOW - (i + 1) * 86400000), usd }));   // 어제부터 거꾸로
  console.log('[건8] 한도 이월');
  ok(B.aiDayLimit({}, rows([3, 3, 3, 3, 3, 3, 3]), { now: NOW }).limit === 3, '이월 0일 = 3불(지난 7일 모두 3불 사용)');
  ok(B.aiDayLimit({}, rows([1, 3, 3, 3, 3, 3, 3]), { now: NOW }).limit === 5, '어제 1불 쓰면 오늘 5불');
  ok(B.aiDayLimit({}, rows([3, 3, 3, 3, 3, 3, 3]).concat([{ day: B.aiDayKey(NOW - 8 * 86400000), usd: 0 }]), { now: NOW }).limit === 3, '8일 전 이월은 넣지 않는다');
  ok(B.aiDayLimit({}, rows([0, 0, 0, 0, 0, 0, 0]), { now: NOW }).limit === 24, '7일 전부 안 쓰면 3 + 21 = 24불');
  const cap = B.aiDayLimit({}, rows([0, 0, 0, 0, 0, 0, 0]), { now: NOW, creditUsedUsd: 94 });
  ok(cap.limit === 1 && cap.capped, '크레딧 95% 상한(사용 94불)에서 한도 1불로 막힘 — 더 안 쌓임');
  ok(B.aiDayLimit({}, rows([0, 0, 0, 0, 0, 0, 0]), { now: NOW, creditUsedUsd: 96 }).limit === 0, '95불을 넘으면 0불');
  const LATE = Date.parse('2026-11-29T12:00:00+09:00');
  ok(B.aiDayLimit({}, rows([0, 0, 0, 0, 0, 0, 0]).map((r, i) => ({ ...r, day: B.aiDayKey(LATE - (i + 1) * 86400000) })), { now: LATE }).limit === 3, '11-28 이후는 이월 없이 3불');
  ok(B.aiDayLimit({}, null, { now: NOW }).limit === 3, '읽기 실패(null) = 3불');
  ok(B.aiDayLimit({ claudeDailyUsd: 5 }, null, { now: NOW }).limit === 5 && B.aiDayLimit({ claudeDailyUsd: 'x' }, null).limit === 3, '기본값은 cfg.claudeDailyUsd(숫자 아니면 3)');
  ok(/^클로드 오늘 한도 \$5\.00 \(기본 3 \+ 이월 \$2\.00\)$/.test(B.aiDayLimit({}, rows([1, 3, 3, 3, 3, 3, 3]), { now: NOW }).text), '표시 문구 «클로드 오늘 한도 $5.00 (기본 3 + 이월 $2.00)»');
  //  문지기: 읽기 실패 시 막지 않는다
  ok((await B.claudeOverDailyCap({ claudeDailyUsd: 3 })) === false, '읽기 실패 시 문지기는 막지 않음');
  ok((await B.claudeOverDailyCap({ claudeDailyUsd: 0 })) === true, '기본 0 이면 클로드 끔(스위치 유지)');
  //  스텁 읽기 — 지난 날 모두 비어 있고 오늘 4불 사용 → 이월 21 → 문지기·소유자 화면 같은 값
  const todayKey = B.aiDayKey(Date.now());
  global.fetch = async (url) => {
    const m = String(url).match(/(mir_model_log|ai_call_log|mir_websearch)\/(\d{6})\.json/);
    const body = m && m[1] === 'mir_model_log' && m[2] === todayKey ? { a: { prov: 'claude', kind: 'chat', tokIn: 1000000, tokOut: 200000, at: Date.now() } } : {};
    return { ok: true, status: 200, json: async () => body };
  };
  const lim = await B.claudeDayLimitNow({ claudeDailyUsd: 3, claudeModel: 'claude-opus-5-5' });
  const panel = B.aiDayLimit({ claudeDailyUsd: 3 }, B.aiDayUsages(B.aiCarryKeys().map((day) => ({ day, mml: {}, acl: {}, mws: {} })), 'claude-opus-5-5'));
  ok(lim.limit === 24 && lim.limit === panel.limit, `문지기 한도 ${lim.limit} = 소유자 화면 한도 ${panel.limit} (24불)`);
  ok((await B.claudeOverDailyCap({ claudeDailyUsd: 3, claudeModel: 'claude-opus-5-5' })) === false, '오늘 8불 사용 < 24불 → 막지 않음(기본 3불이었다면 막혔을 것)');
  global.fetch = () => Promise.reject(new Error('연막: 네트워크 없음'));

  console.log('[건10] 실번호 대소문자');
  ok(B.normSeal('M123456') === B.normSeal('m123456'), 'M123456 · m123456 동일');
  ok(B.normSeal('M123456') !== B.normSeal('N123456') && B.normSeal('A0123') !== B.normSeal('A123'), '알파벳 다른 쌍 · 앞자리 0 쌍은 여전히 다름');
  const mf = fs.readFileSync(P('src/mergeApi.js'), 'utf8'), mr = fs.readFileSync(P('src/mir.js'), 'utf8');
  ok(!/e\.sl!==c\.sl/.test(mf) && /normSeal\(e\.sl\)!==normSeal\(c\.sl\)/.test(mf), 'mergeApi 충돌 비교가 normSeal');
  ok(!/S\(_e\.sl\) !== S\(c\.sl\)/.test(mr) && !/S\(c\.sl_orig\) !== S\(c\.sl\)/.test(mr), 'mir.js 두 곳 원문 비교 제거');

  console.log('[건4] 배 이름 질문 → 호기 자료');
  const info = { vsl: 'DJCT', qcWork: { QC101: { qc: 'QC101', disDone: 10, disRest: 5, lodDone: 0, lodRest: 7 }, QC102: { qc: 'QC102', disDone: 3, disRest: 2, lodDone: 1, lodRest: 4 } } };
  const pk = B.buildDataPack('DJCT 장비 번호가 뭐야', { containers: [], info });
  const h = pk.계산해둔것.호기별작업;
  ok(h && h.배 === 'DJCT' && h.호기.length === 2 && /1호기\(QC101\).*잔여 5/.test(h.호기[0]), '호기별작업에 1·2호기가 실림');
  const other = { vsl: 'XXXX', qcWork: {} };
  const pk2 = B.buildDataPack('DJCT 장비 번호', { containers: [], info: other, voyages: { k1: { info }, k2: { info: other } } });
  ok(pk2.계산해둔것.호기별작업.배 === 'DJCT' && pk2.계산해둔것.호기별작업.호기.length === 2, '지금 열린 배가 아니어도 질문의 배(DJCT) 호기 자료를 찾음');
  ok(!B.buildDataPack('리퍼 몇 대', { containers: [], info }).계산해둔것.호기별작업, '배·호기와 상관없는 질문은 팩이 그대로(토큰 확대 없음)');
  ok(B.buildDataPack('DJCT 장비 번호', { containers: [], info: { vsl: 'DJCT' } }).계산해둔것.호기별작업.안내, '호기 자료가 없으면 «없음» 을 분명히 적음');
  console.log(`\n${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
