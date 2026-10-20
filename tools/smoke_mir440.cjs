// 미르 4.40 연막검사 — «N번 베이로 옮겨 드릴까요?» [이동]·[취소] 의 엔진·대화 층·요청 함을 실소스 번들과 실제 항차(보관본 ATPR 2646E)로 잰다. 화면(누르면 자동 가이드가 그 베이로)은 회귀 기준표 R44.
//   검수사 2026-10-20 18:16 «25번베이부터 해야 되는데 어떻게 바꾸지? 안내대로 바꿔 보셨나요?» · 18:18 «그걸 바꿔 주십시요 25번 베이로 옮겨 드릴까요? 되묻고 이동 또는 취소 버튼을 보여주고
//   이동을 누르면 25번 베이 작업으로 갈수 있게» · 18:19 «모든 베이를 미르가 이동 시킬수 있게 해주시면 됩니다».
//   ⚠ 기대값(남은 대수·데크/홀드)은 앱 함수가 아니라 픽스처 원자료(EDI 행 − 그 시각까지의 완료)에서 이 파일이 직접 센다.
//   node tools/smoke_mir440.cjs <mirCore 번들> <저장소 루트>
process.env.TZ = 'Asia/Seoul';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const OUT = process.argv[2];
const ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
const sent = [];
global.window = { addEventListener() {}, dispatchEvent(e) { sent.push(e); return true; }, __fbShipBayDict: {}, __mirLexicon: {}, __mirLexiconWrite() {} };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'node', language: 'ko-KR' }, configurable: true }); } catch (e) { /* */ }
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
let fetchN = 0;
global.fetch = () => { fetchN += 1; return Promise.reject(new Error('연막: 네트워크 없음')); };
const M = require(path.resolve(OUT));
//  요청 함(guideGoto.js)·플랜 명령(planCommand.js)은 엔진 번들 밖 — 따로 묶는다
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'mir440_'));
const pack = (src, name) => { const o = path.join(TMP, name + '.cjs'); execSync(`npx esbuild "${src}" --bundle --platform=node --format=cjs --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' }); return require(o); };
const G = pack(path.join(ROOT, 'src/guideGoto.js'), 'mirgoto');
const P = pack(path.join(ROOT, 'src/planCommand.js'), 'plancmd');
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/mirgoto_atpr2646e.json'), 'utf8'));
const VK = FX.voyageKey;
const clone = (o) => JSON.parse(JSON.stringify(o));
let n = 0, bad = 0;
const T = (cond, name, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + String(detail).replace(/\n/g, ' ⏎ ').slice(0, 500) : ''}`); } };
const at = (hm) => new Date(`2026-10-20T${hm}:00+09:00`).getTime();
//  그 시각의 항차 — 마감 표식을 걷고 그 시각까지의 완료만 남긴다(보관본은 끝난 배)
const voyAt = (t) => { const v = { info: clone(FX.voyage.info), discharge: clone(FX.voyage.discharge) };
  for (const k of Object.keys(v.info)) if (/Done|depart|workEnd|archiv/i.test(k)) delete v.info[k];
  const c = v.discharge.completed || {}; for (const k of Object.keys(c)) if (!(c[k].at <= t)) delete c[k];
  return v; };
//  독립 셈 — EDI 행(이 배는 267대 전부 평택 양하) 중 그 베이·그 시각까지 미완
const leftOf = (t, bay) => { const c = FX.voyage.discharge.completed; const L = Object.values(FX.voyage.discharge.ediContainers).filter((r) => parseInt(r.bay, 10) === bay && !(c[r.cn] && c[r.cn].at <= t));
  const dk = L.filter((r) => parseInt(r.tier, 10) >= 80).length; return { n: L.length, dk, hd: L.length - dk }; };
const NOW = at('14:43');
const tally = (v, mode = 'discharge', now = NOW) => { const cs = M.flattenVoyages({ [VK]: v }).filter((c) => c.voyageKey === VK); return { app: 'tally', voyageKey: VK, voyage: v, info: v.info, mode, containers: cs, flat: cs, voyages: { [VK]: v }, inspector: '연막', smallTalkLast: true, modeChoice: 'both', accepted: true, _now: now }; };
const ask = (q, ctx, keep = false) => { const tr = {}; if (!keep) M._mirThreadReset(); const a = M.answerOneRaw(q, { ...ctx, _trace: tr }); return { a: String(a == null ? '' : a), tr, weak: M.isWeakAnswer(q, a, tr) }; };
//  화면이 하는 그대로 — 답을 내고 접수 한 번에 기록(mirThreadCommit) 한다
const say = (q, ctx) => { const r = ask(q, ctx, true); const fo = M.mirThreadCommit(q, r.a, r.tr.via || '', ctx); return { ...r, fo }; };

console.log('① «N번 베이로 옮겨 드릴까요?» — 실입력과 같은 뜻의 말');
const V = voyAt(NOW), L25 = leftOf(NOW, 25);
T(L25.n === 8 && L25.hd === 8, `독립 셈 — 14:43 25번 베이 남은 ${L25.n}대(홀드 ${L25.hd})`);
for (const q of ['25번베이부터 해야 되는데 어떻게 바꾸지?', '25번 베이부터 하려면 어떻게 해', '25번 베이로 바꿔줘', '25번 베이로 바꾸려면 어떻게 해', '25번 베이로 옮겨 줘', '25번 베이부터 하자', '25번 베이 먼저 할게', '미르야 25번 베이부터 시작하려면 어떻게 해']) {
  const { a, tr, weak } = ask(q, tally(V));
  T(tr.via === 'guideGoto' && !weak && a.startsWith('📍 ATPR 양하 25번 베이로 옮겨 드릴까요?') && a.includes(`25번 베이 남은 ${L25.n}대(홀드 ${L25.hd})`) && /\[이동\]을 누르면/.test(a), `«${q}» — 옮길까 묻는다(강 · 남은 ${L25.n}대)`, `${tr.via} ${weak} | ${a}`);
}
//  모든 베이(검수사 18:19) — 남은 일이 있는 베이마다 같은 말 · 대수는 독립 셈
{ const bays = [...new Set(Object.values(FX.voyage.discharge.ediContainers).map((r) => parseInt(r.bay, 10)))].sort((x, y) => x - y);
  let okN = 0, tot = 0; const miss = [];
  for (const b of bays) { const L = leftOf(NOW, b); if (!L.n) continue; tot += 1;
    const { a, tr } = ask(`${b}번 베이부터 해야 되는데 어떻게 바꾸지?`, tally(V));
    const want = `${b}번 베이 남은 ${L.n}대(${[L.dk ? `데크 ${L.dk}` : '', L.hd ? `홀드 ${L.hd}` : ''].filter(Boolean).join(' · ')})`;
    if (tr.via === 'guideGoto' && a.startsWith(`📍 ATPR 양하 ${b}번 베이로 옮겨 드릴까요?`) && a.includes(want)) okN += 1; else miss.push(`${b}: ${a}`); }
  T(tot === 7 && okN === tot, `14:43 남은 일이 있는 베이 ${tot}개 모두 — 옮길까 묻고 남은 대수가 원자료와 같다`, miss.join(' ‖ '));
  const t9 = at('09:00'); let ok9 = 0, tot9 = 0; const miss9 = []; const V9 = voyAt(t9);
  for (const b of bays) { const L = leftOf(t9, b); if (!L.n) continue; tot9 += 1;
    const { a } = ask(`${b}번 베이로 바꿔줘`, tally(V9, 'discharge', t9));
    if (a.includes(`${b}번 베이 남은 ${L.n}대(${[L.dk ? `데크 ${L.dk}` : '', L.hd ? `홀드 ${L.hd}` : ''].filter(Boolean).join(' · ')})`)) ok9 += 1; else miss9.push(`${b}: ${a}`); }
  T(tot9 >= 14 && ok9 === tot9, `09:00 남은 일이 있는 베이 ${tot9}개 모두 — 데크·홀드 대수까지 원자료와 같다`, miss9.join(' ‖ ')); }

console.log('② [이동]·[취소] 단추 — 대화 층');
{ M._mirThreadReset();
  const ctx = tally(V);
  const r1 = say('25번베이부터 해야 되는데 어떻게 바꾸지?', ctx);
  T(JSON.stringify(r1.fo.chips) === '["이동","취소"]' && r1.fo.act && r1.fo.act.voyageKey === VK && r1.fo.act.mode === 'discharge' && r1.fo.act.bay === 25 && !r1.fo.line, '답 뒤 단추는 [이동]·[취소] 둘뿐 · 옮길 것(act) = ATPR_2646E 양하 25', JSON.stringify(r1.fo));
  const r2 = say('이동', ctx);
  T(r2.tr.via === 'thread' && !r2.weak && /^🚀 25번 베이로 옮길게요/.test(r2.a) && r2.fo.kind === 'act' && r2.fo.act && r2.fo.act.bay === 25 && !r2.fo.chips.length, '[이동] — 대화 층이 받아 «🚀 25번 베이로 옮길게요» · 화면에 옮길 것(kind act)', JSON.stringify(r2.fo) + ' | ' + r2.a);
  const r3 = say('이동', ctx);
  T(r3.fo.kind !== 'act', '같은 [이동] 을 또 눌러도 두 번 옮기지 않는다(단추를 거둔다)', JSON.stringify(r3.fo)); }
for (const [w, kind] of [['응', 'act'], ['네', 'act'], ['sp', 'act'], ['옮겨 줘', 'act'], ['이동해줘', 'act'], ['이동할게', 'act'], ['이동해요', 'act'], ['첫 번째', 'act'], ['1번', 'act'], ['취소', 'actNo'], ['아니', 'actNo'], ['그대로', 'actNo'], ['옮기지 마', 'actNo'], ['두 번째', 'actNo']]) {
  M._mirThreadReset(); const ctx = { ...tally(V), _utterAt: 1 };
  say('25번 베이로 바꿔줘', { ...ctx, _utterAt: 0 }); const r = say(w, ctx);
  T(r.fo.kind === kind && (kind === 'act' ? (r.fo.act && r.fo.act.bay === 25) : (r.fo.act == null && /그대로 둘게요/.test(r.a))), `«${w}» — ${kind === 'act' ? '옮긴다' : '옮기지 않는다(«그대로 둘게요»)'}`, JSON.stringify(r.fo) + ' | ' + r.a);
}
//  감사 d — 되묻는 «네?·응?» 과 «알려줘·보여줘·맞아» 는 옮기지 않는다(«네?» 는 다시 묻는다)
for (const w of ['네?', '응?', '어?', '그래?', '알려줘', '보여줘', '맞아']) {
  M._mirThreadReset(); const ctx = tally(V);
  say('25번 베이로 바꿔줘', ctx); const r = say(w, ctx);
  T(r.fo.kind === 'prompt' && /^25번 베이로 옮길까요\?/.test(r.a) && r.tr.via === 'thread', `«${w}» — 옮기지 않고 «25번 베이로 옮길까요?» 다시 묻는다(엔진·모델로 안 감)`, JSON.stringify(r.fo) + ' | ' + r.a);
}
{ M._mirThreadReset(); const ctx = tally(V);
  say('25번 베이로 바꿔줘', ctx); const r = say('리퍼 몇 대', ctx);
  T(r.fo.kind !== 'act' && !/옮길게요/.test(r.a), '옮길까 물은 뒤 다른 질문(«리퍼 몇 대»)은 그 질문에 답한다 — 옮기지 않는다', r.a);
  M._mirThreadReset(); say('25번 베이로 바꿔줘', ctx); const c = say('됐어', ctx);
  T(c.fo.kind === 'close' && !c.fo.act, '«됐어» — 대화를 접는다(옮기지 않는다)', JSON.stringify(c.fo)); }

console.log('③ 옮길 수 없을 때 — 단추 없이 까닭');
{ const t = NOW; const done28 = leftOf(t, 28).n === 0;
  M._mirThreadReset(); const r = say('28번 베이부터 해야 되는데 어떻게 바꾸지?', tally(V));
  T(done28 && r.tr.via === 'guideGoto' && /28번 베이는 양하·선적 남은 작업이 없어요\(다 끝났어요\)/.test(r.a) && !r.fo.chips.length && !r.fo.act, '다 끝난 28번 베이 — «남은 작업이 없어요» · 단추 없음', JSON.stringify(r.fo) + ' | ' + r.a);
  M._mirThreadReset(); const x = say('50번 베이로 바꿔줘', tally(V));
  T(/50번 베이는 이 배 자료에 없어요/.test(x.a) && !x.fo.chips.length, '없는 50번 베이 — «이 배 자료에 없어요» · 단추 없음', x.a);
  const lo = ask('25번 베이로 바꿔줘', tally(V, 'loading')).a;
  T(/^📍 ATPR 양하 25번 베이로 옮겨 드릴까요\? \(선적은 25번 베이 작업이 없어요\)/.test(lo), '선적 화면에서 물어도 이 배는 양하만 — 양하로 묻고 «선적은 25번 베이 작업이 없어요»', lo);
  const home = { app: 'tally', voyages: { [VK]: V }, inspector: '연막', accepted: true, _now: NOW };
  const h = ask('ATPR 25번베이부터 해야 되는데 어떻게 바꾸지?', home);
  T(h.tr.via === 'guideGoto' && h.a.startsWith('📍 ATPR 양하 25번 베이로 옮겨 드릴까요?'), '홈(열린 항차 없음)에서 배 이름을 붙이면 그 배로 묻는다', h.a);
  const h2 = ask('25번베이부터 해야 되는데 어떻게 바꾸지?', { app: 'tally', voyages: {}, inspector: '연막', accepted: true, _now: NOW });
  T(h2.tr.via === 'shipAsk' && !h2.weak && M.isShipAskText(h2.a), '배를 모르면 배를 되묻는다(배 고르기 단추가 붙는 글)', `${h2.tr.via} | ${h2.a}`);
  //  감사 중-1 — 말에 든 «양하·선적» 을 따른다
  const sl = ask('선적 25번 베이부터 하자', tally(V)).a;
  T(/25번 베이는 선적 남은 작업이 없어요 — 양하는 남은 8대예요/.test(sl) && !/옮겨 드릴까요/.test(sl), '«선적 25번 베이부터 하자»(이 배는 양하만) — «선적 남은 작업이 없어요 — 양하는 남은 8대» · 묻지 않는다', sl);
  const dl = ask('양하 25번 베이부터 해야 되는데 어떻게 바꾸지?', tally(V, 'loading')).a;
  T(/^📍 ATPR 양하 25번 베이로 옮겨 드릴까요\?/.test(dl), '선적 화면에서 «양하 25번 베이부터 …» — 양하로 묻는다', dl);
  { const DQ = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/bayview_dxqd.json'), 'utf8'));
    const vq = { info: { ...DQ.info }, discharge: { ...DQ.discharge }, loading: { ...DQ.loading } };
    const tq = (mode) => { const cs = M.flattenVoyages({ DXQD_2636E: vq }).filter((c) => c.voyageKey === 'DXQD_2636E'); return { app: 'tally', voyageKey: 'DXQD_2636E', voyage: vq, info: vq.info, mode, containers: cs, voyages: { DXQD_2636E: vq }, inspector: '연막', _now: NOW }; };
    const lcomp = DQ.loading.completed || {}, lrows = Object.values(DQ.loading.ediContainers);
    const lb = [...new Set(lrows.filter((r) => !lcomp[r.cn]).map((r) => parseInt(r.bay, 10)))].filter((b) => Object.values(DQ.discharge.ediContainers).some((r) => parseInt(r.bay, 10) === b)).sort((x, y) => x - y)[0];
    const ldL = lrows.filter((r) => parseInt(r.bay, 10) === lb && !lcomp[r.cn]).length;
    const a1 = ask(`선적 ${lb}번 베이부터 하자`, tq('discharge')).a, a2 = ask(`${lb}번 베이부터 실어야 되는데 어떻게 바꾸지`, tq('discharge')).a;
    T(ldL > 0 && a1.startsWith(`📍 DXQD 선적 ${lb}번 베이로 옮겨 드릴까요?`) && a1.includes(`${lb}번 베이 남은 ${ldL}대`) && a2.startsWith(`📍 DXQD 선적 ${lb}번 베이로 옮겨 드릴까요?`), `DXQD 2636W 양하 화면(양하는 다 끝남)에서 «선적 ${lb}번 베이부터 하자»·«${lb}번 베이부터 실어야 …»(실어 = 선적) — 선적으로 묻는다(남은 ${ldL}대)`, `${a1} ‖ ${a2}`);
    //  2차 시뮬 재실행 하 — 그 모드에 원래 일이 없던 베이는 «끝났고» 가 아니라 «양하 일이 없고»(양하 완료를 비운 사본 — 양하 4번 행 없음, 장 B3·5 에 남음)
    { const vz = { info: { ...DQ.info }, discharge: { ...DQ.discharge, completed: {} }, loading: { ...DQ.loading } };
      const cs = M.flattenVoyages({ DXQD_2636E: vz }).filter((c) => c.voyageKey === 'DXQD_2636E');
      const no4 = !Object.values(DQ.discharge.ediContainers).some((r) => parseInt(r.bay, 10) === 4);
      const z = ask('4번 베이로 바꿔줘', { app: 'tally', voyageKey: 'DXQD_2636E', voyage: vz, info: vz.info, mode: 'discharge', containers: cs, voyages: { DXQD_2636E: vz }, inspector: '연막', _now: NOW }).a;
      T(no4 && /^📍 DXQD 양하 4번 베이 장\(B3·5\)으로 옮겨 드릴까요\?/.test(z) && /4번 베이는 양하 일이 없고 이 장에 남은/.test(z) && !/끝났고/.test(z), '양하 행이 아예 없는 4번 베이(장 B3·5 에 양하 남음) — «4번 베이는 양하 일이 없고» (끝났다고 하지 않는다)', z); }
    const a3 = ask(`양하 ${lb}번 베이부터 하자`, tq('loading')).a;
    T(new RegExp(`^DXQD ${lb}번 베이는 양하 남은 작업이 없어요 — 선적은 남은 ${ldL}대예요`).test(a3), `선적 화면에서 «양하 ${lb}번 베이부터 하자»(양하는 끝남) — «양하 남은 작업이 없어요 — 선적은 남은 ${ldL}대» · 묻지 않는다`, a3); }
  //  감사 하 — 끝난 베이라도 같은 장에 남은 일이 있으면 장으로(40피트 베이 = 장 가운데)
  const g24 = ask('24번 베이부터 작업하자', tally(V)).a;
  T(leftOf(NOW, 24).n === 0 && /^📍 ATPR 양하 24번 베이 장\(B23·24·25\)으로 옮겨 드릴까요\?/.test(g24) && g24.includes(`이 장에 남은 ${leftOf(NOW, 23).n + leftOf(NOW, 25).n}대`), '«24번 베이부터 작업하자»(24번은 끝남) — 24번 베이 장(B23·24·25)으로 옮길까 묻는다(장 남은 대수 = 23·25번 독립 셈)', g24);
  //  감사 중-2 — RZOR(선박 정책 덱플랜 배)은 좌표가 있어도 묻지 않는다(실자료 R109E 148대 전부 좌표)
  { const RP = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/rzor_discharge_R109E_print.json'), 'utf8'));
    const rv = { info: { ...RP.info, vsl: 'RZOR', voy: 'R109E' }, discharge: { ediContainers: Object.fromEntries(RP.containers.map((x) => [x.cn, x])) } };
    const bay = parseInt(RP.containers[0].bay, 10);
    const ra = ask(`${bay}번 베이부터 하자`, { app: 'tally', voyageKey: 'RZOR_R109E', voyage: rv, info: rv.info, mode: 'discharge', containers: M.flattenVoyages({ RZOR_R109E: rv }), voyages: { RZOR_R109E: rv }, inspector: '연막', _now: NOW });
    const nPos = RP.containers.filter((x) => x.bay && x.tier).length;
    T(nPos >= 140 && ra.tr.via === 'guideGoto' && /RZOR 이 배는 덱플랜 배라 자동 가이드가 없어요/.test(ra.a) && !/옮겨 드릴까요/.test(ra.a), `RZOR R109E(좌표 ${nPos}/${RP.containers.length}) «${bay}번 베이부터 하자» — «덱플랜 배라 자동 가이드가 없어요» · 묻지 않는다`, ra.a); }
  const RZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/daynight_gang_real.json'), 'utf8')).RZOR_R106E;
  const rz = ask('25번 베이로 바꿔줘', { app: 'tally', voyageKey: 'RZOR_R106E', voyage: RZ, info: RZ.info, mode: 'discharge', containers: [], voyages: { RZOR_R106E: RZ }, inspector: '연막', _now: NOW }).a;
  T(!/옮겨 드릴까요/.test(rz), 'RZOR(셀 좌표 없는 덱플랜 배) — 옮길까 묻지 않는다', rz); }

console.log('④ 가로채지 않는 말 — 컨 옮기기·자료 질문·플랜 열기·콘앱');
for (const q of ['25번 베이 몇 대 남았어', '25번 베이부터 몇 대야', '25번 베이 리퍼 어떻게 해', '25번 베이 언제 끝나', '1077 25번 베이로 바꾸려면 어떻게 해', '2730 컨 25번 베이로 옮겨야 하는데 어떻게 해', '25번 베이로 옮기려면 어떻게 해', '25번 베이 먼저 할 때 해치커버 어떻게 열어', '25번 베이부터 해치 열어야 하는데 어떻게 해', '25번 베이 트윈 먼저 하려면 어떻게 해', '25번 베이부터 양하해야 하는데 콘은 어떻게', '25번 베이부터 하려면 몇 시간 걸려', '25번 베이 보여줘', '25번 베이플랜 열어',
  //  감사 (e) — 지난 일·남의 일·이유·보고(4.40 첫 판은 끝말을 안 묶어 이런 말 273꼴이 «옮겨 드릴까요?» 강한 답이 됐다)
  '25번 베이부터 시작했어?', '2호기는 25번 베이부터 작업 중이야?', '25번 베이 먼저 작업하는 이유가 뭐야', '25번 베이 먼저 작업한 거 맞아?', '25번 베이부터 작업 순서 알려줘',
  '25번 베이부터 작업하는 갱이 누구야', '2호기 25번 베이로 넘어가?', '크레인 25번 베이로 넘어가면 알려줘', '25번 베이 먼저 작업하자고 수석한테 전해줘', '25번 베이부터 작업해야 하는데 리스트가 없어',
  '25번 베이부터 시작하래', '25번 베이부터 하자고 했잖아', '내일은 25번 베이부터 시작해', '다른 갱이 25번 베이부터 하자', '25번 베이로 바꿔도 돼?', '25번 베이로 넘어가자']) {
  const { tr, a } = ask(q, tally(V)); T(tr.via !== 'guideGoto' && !/옮겨 드릴까요/.test(a), `«${q}» — 옮길까 묻지 않는다`, `${tr.via} | ${a}`);
}
T(P.parseViewCommand('25번 베이로 넘어가자') && P.parseViewCommand('25번 베이로 넘어가 줘'), '«25번 베이로 넘어가자·넘어가 줘» 는 플랜 명령이 먼저 받는다(종전 그대로 — 판정이 두 벌로 겹치지 않게 엔진은 안 받는다 · 2차 시뮬)');
for (const q of ['25번 베이로 이동', '25번 베이로 가자', '25번 베이 보여줘']) { const c = P.parseViewCommand(q); T(!!c && c.what === 'bay' && c.bay === 25, `«${q}» — 종전대로 25번 베이플랜을 연다(엔진보다 먼저)`, JSON.stringify(c)); }
T(P.parseViewCommand('이동') === null && P.parseViewCommand('취소') === null, '[이동]·[취소] 단추 글자는 플랜 명령이 아니다(엔진·대화 층으로 간다)');
{ const cone = { app: 'cone', voyageKey: VK, voyage: V, info: V.info, mode: 'discharge', containers: M.flattenVoyages({ [VK]: V }), inspector: '', _now: NOW };
  const { a, tr } = ask('25번베이부터 해야 되는데 어떻게 바꾸지?', cone); T(tr.via !== 'guideGoto' && !/^📍 ATPR 양하 25번 베이로 옮겨 드릴까요/.test(a), '콘앱 — 자동 가이드가 없으니 묻지 않는다(종전 길)', `${tr.via} | ${a}`); }
T(M.isWeakAnswer('25번 베이로 바꿔줘', '📍 …', { via: 'guideGoto' }) === false, 'guideGoto 는 강한 답 — 모델로 덮지 않는다');
//  미르의 눈(mirSee — 탭 카드·조회창·통합검색이 엔진보다 먼저 부른다)은 옮겨 달라는 말을 비켜 준다 · 2.51 «24번 베이 양하하자» 는 그대로 순서를 부른다
{ const ME = pack(path.join(ROOT, 'src/mir.js'), 'mirfile');
  const cs = M.flattenVoyages({ [VK]: V }).filter((c) => c._mode === 'discharge');
  const sx = { containers: cs, info: { ...V.info, berthSide: 'starboard' }, mode: 'discharge' };
  T(ME.mirSee('25번 베이부터 하자', sx) === null && ME.mirSee('25번 베이 먼저 할게', sx) === null && ME.mirSee('3번 베이부터 작업', sx) === null, '미르의 눈 — «25번 베이부터 하자»·«먼저 할게»·«3번 베이부터 작업» 은 비켜 준다(엔진이 «옮겨 드릴까요?» 로 받는다 — 어느 창구든 같은 답)');
  const keep = ME.mirSee('25번 베이 양하하자', sx);
  T(typeof keep === 'string' && keep.length > 0 && !/옮겨 드릴까요/.test(keep), '미르의 눈 — «25번 베이 양하하자»(2.51)는 종전대로 순서를 부른다', keep); }

console.log('⑤ 요청 함(guideGoto.js) — 한 번만 꺼내 간다 · 60초 · 다른 항차는 못 꺼낸다');
{ sent.length = 0;
  T(G.mirGotoRequest(null) === false && G.mirGotoRequest({ voyageKey: VK, bay: 'x' }) === false, '잘못된 요청은 받지 않는다');
  const t0 = 1792475000000;
  T(G.mirGotoRequest({ voyageKey: VK, mode: 'discharge', bay: 25 }, t0) === true && sent.length === 1 && sent[0].type === G.MIR_GOTO_EVENT && sent[0].detail.bay === 25 && sent[0].detail.voyageKey === VK, `[이동] — «${G.MIR_GOTO_EVENT}» 알림 한 번(항차·모드·베이)`, JSON.stringify(sent.map((e) => e.detail)));
  T(G.mirGotoPeek(t0 + 1000) && G.mirGotoTake('OBWH_2763E', t0 + 1000) === null, '다른 항차 화면은 꺼내 가지 못한다');
  const p = G.mirGotoTake(VK, t0 + 1000);
  T(p && p.bay === 25 && p.mode === 'discharge' && p.seq === t0 && G.mirGotoTake(VK, t0 + 2000) === null, '그 항차 화면이 한 번 꺼내 가면 끝(두 번 옮기지 않는다)');
  G.mirGotoRequest({ voyageKey: VK, mode: 'loading', bay: '7' }, t0);
  T(G.mirGotoTake(VK, t0 + 61000) === null && G.mirGotoPeek(t0 + 61000) === null, '60초가 지난 요청은 버린다(늦게 열린 화면이 옛 요청으로 장을 바꾸지 않게)'); }
{ const t1 = 1792476000000;
  G.mirGotoRequest({ voyageKey: VK, mode: 'discharge', bay: 25 }, t1); const p = G.mirGotoTake(VK, t1 + 10);
  const s0 = G.mirGotoState(p.seq); G.mirGotoTouch(p.seq); const s1 = G.mirGotoState(p.seq); G.mirGotoFinish(p.seq); G.mirGotoTouch(p.seq);
  T(s0 === 'taken' && s1 === 'busy' && G.mirGotoFinished(p.seq) && G.mirGotoState(p.seq) === 'done', '끝남은 요청 함 한 곳에 — 꺼냄 → 맡음 → 끝남, 끝난 것은 되살리지 않는다(감사 상-1 — 화면이 다시 그려져도 끝난 [이동] 을 다시 돌리지 않게)'); }
{ const t2 = 1792477000000;
  G.mirGotoRequest({ voyageKey: VK, mode: 'discharge', bay: 25 }, t2); const p = G.mirGotoTake(VK, t2 + 10); G.mirGotoTouch(p.seq);
  T(!G.mirGotoFinished(p.seq, t2 + 5000) && G.mirGotoFinished(p.seq, t2 + 61000), '맡은 채(busy) 남은 요청도 60초가 지나면 끝난 것 — 몇십 분 뒤 작업 시작 탭에 돌아와도 옛 [이동] 이 사람이 고른 것을 덮지 않는다(재감사 하-1)'); }

console.log('⑥ 배선 — 검수앱 네 창구(떠 있는 미르·작업 조회창·탭 카드·통합검색)가 [이동] 을 받으면 요청 함으로');
{ const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
  for (const f of ['src/components/MirFab.jsx', 'src/components/SearchPanel.jsx', 'src/pages/VoyagePage.jsx', 'src/pages/GlobalSearchPage.jsx']) T(/fo\.kind === 'act' && fo\.act(?:\)| &&) ?.{0,40}mirGotoRequest\(fo\.act\)/.test(src(f).replace(/\n/g, ' ')), `${f} — 대화 층 kind 'act' 를 받으면 mirGotoRequest`);
  T(/addEventListener\(MIR_GOTO_EVENT/.test(src('src/App.jsx')) && /navigate\(\{ voyageKey: d\.voyageKey, mode: d\.mode \}\)/.test(src('src/App.jsx')), 'App — 다른 화면에서 눌렀으면 그 항차 작업 화면으로 옮긴다');
  T(/mirGotoTake\(voyageKey\)/.test(src('src/pages/VoyagePage.jsx')) && /mirGoto=\{mirGoto\}/.test(src('src/pages/VoyagePage.jsx')) && /mirGoto=\{mirGoto\}/.test(src('src/components/SearchPanel.jsx')), '항차 화면이 꺼내 가 SearchPanel → GuidedWorkPanel 로 넘긴다'); }

T(fetchN === 0, '규칙 답만 — 네트워크 0번');
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 폴더 */ }
console.log(`\n${bad ? '✗' : '✔'} 미르 4.40(베이로 옮기기) 연막검사 ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
