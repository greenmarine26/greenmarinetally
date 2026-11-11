// 4.87-02 미르 실번호 점검 후속 물음 연막검사 — 실 TMPZ 2038E 실번호 기록으로 «형식이 다른 17개 보여줘» 가 점검 답을 되풀이하지 않고 17대를 한 대씩 적는지 본다
//   실행 — node tools/smoke_sealfollow48702.cjs <repoRoot>   (번들 없이 네이티브 ESM 으로 src 를 직접 연다 · 네트워크 없음)
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const root = path.resolve(process.argv[2] || process.cwd());
process.env.TZ = 'Asia/Seoul';
global.window = { addEventListener() {}, dispatchEvent() { return true; }, __fbShipBayDict: {}, __mirLexicon: {}, __mirLexiconWrite() {} };
global.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { addEventListener() {}, dispatchEvent() { return true; }, querySelector() { return null; }, documentElement: { style: {}, setAttribute() {} }, body: { style: {} } };
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
global.fetch = () => Promise.reject(new Error('연막: 네트워크 없음'));
let n = 0, bad = 0;
const ok = (c, m, d = '') => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m + (c || !d ? '' : ' — ' + String(d).replace(/\n/g, ' ⏎ ').slice(0, 500))); if (!c) bad++; };

(async () => {
  const M = await import(pathToFileURL(path.join(root, 'src/mir.js')).href);
  const N = await import(pathToFileURL(path.join(root, 'src/nlSearch.js')).href);
  const fx = JSON.parse(fs.readFileSync(path.join(root, 'tools/fixtures/insp487.json'), 'utf8'));
  const sr = fx.TMPZ_2038E_sealrecs;
  const VK = 'TMPZ_2038E';
  const V = { info: { vsl: 'TMPZ', voy: '2038E', dischargeVoy: '2038E' }, discharge: { records: sr, ediContainers: {} }, loading: {} };
  const CS = M.flattenVoyages({ [VK]: V }).filter((c) => c.voyageKey === VK);
  const NOW = new Date('2026-11-10T20:25:00+09:00').getTime();
  const ctx = (extra) => ({ app: 'tally', voyageKey: VK, voyage: V, info: V.info, mode: 'discharge', containers: CS, inspector: '연막', smallTalkLast: true, modeChoice: 'both', voyages: { [VK]: V }, flat: CS, _now: NOW, ...(extra || {}) });
  const ask = (q, extra) => { const tr = {}; const a = M.answerOneRaw(q, { ...ctx(extra), _trace: tr }); return { a: String(a == null ? '' : a), tr }; };
  const drop = N.sealAlphaDropOf(Object.entries(sr).map(([cn, r]) => ({ cn, ...r, _mode: 'discharge' })));   // 화면 행에는 리스트 실 이력이 없을 수 있어 기록으로 센다(점검 답은 기록을 함께 받아 채운다)
  ok(CS.length === Object.keys(sr).length && drop.length === 17, `TMPZ 2038E 실번호 기록 ${CS.length}대 가운데 알파벳만 빠진 실 17대`, `${CS.length}/${drop.length}`);

  console.log('[1] 점검 답 — 실오류는 없다고 하되 17대를 숨기지 않는다');
  M._mirThreadReset();
  const a1 = ask('실 점검해줘');
  ok(a1.tr.via === 'sealAudit' && /모두 이상 없음/.test(a1.a) && /알파벳만 빠진 실 17대\(/.test(a1.a) && /같은 실로 봅니다/.test(a1.a), '«실 점검해줘» — 이상 없음 + «알파벳만 빠진 실 17대(끝 4자리 전부)» 한 줄', a1.a);
  ok(drop.every((d) => a1.a.includes(String(d.cn).slice(-4))), '그 줄에 17대 끝 4자리가 모두 있다', a1.a);

  console.log('[2] 후속 물음 — 같은 답을 되풀이하지 않는다');
  for (const q of ['형식이 다른 17개 보여줘', '17개 보여줘', '어떤 컨이야 알려줘', '알파벳 빠진 거 보여줘', '그 17대 뭐야', '17개 전부 보여줘', '컨 번호 알려줘']) {
    const r = ask(q);
    ok(r.tr.via === 'sealAudit' && r.a !== a1.a && /실번호 상세 17대/.test(r.a) && drop.every((d) => r.a.includes(d.cn) && r.a.includes(d.full) && r.a.includes(d.short)), `«${q}» — 17대를 한 대씩 두 값으로`, `${r.tr.via} | ${r.a}`);
  }
  M._mirThreadReset();
  const direct = ask('실번호 형식 다른 거 보여줘');
  ok(direct.tr.via === 'sealAudit' && /실번호 상세 17대/.test(direct.a), '점검 답 없이도 «실번호 형식 다른 거 보여줘» 는 상세', `${direct.tr.via} | ${direct.a}`);
  M._mirThreadReset();
  const cold = ask('17개 보여줘');
  ok(!/실번호 상세/.test(cold.a), '점검 답이 앞에 없으면 «17개 보여줘» 를 실번호 상세로 끌어가지 않는다', `${cold.tr.via} | ${cold.a.slice(0, 120)}`);
  M._mirThreadReset();
  ask('실 점검해줘');
  const late = ask('17개 보여줘', { _now: NOW + 61 * 60000 });
  ok(!/실번호 상세/.test(late.a), '점검 답 뒤 60분이 지나면 후속으로 보지 않는다', `${late.tr.via} | ${late.a.slice(0, 120)}`);
  M._mirThreadReset();
  ask('실 점검해줘');
  const other = ask('20피트 몇 대야');
  ok(!/실번호 상세/.test(other.a), '점검 답 뒤라도 다른 물음(«20피트 몇 대야»)은 그대로', other.a.slice(0, 120));

  //  감사 지적 — 점검 답 직후라도 다른 주제어가 있는 물음은 점검 답이 없을 때와 같은 답이어야 한다
  for (const q of ['40피트 12개 보여줘', 'X-RAY 5대 어떤 거야', 'X-RAY 컨 번호 알려줘', '리퍼 컨 번호 보여줘', '위험물 3개 알려줘', '3호기 몇 대 했어 알려줘', '1234 어디 있어', '특수화물 5개 보여줘', '하이큐 3대 어떤 거야', '양하 10대 보여줘', '선적 5개 알려줘', '엠티 20개 보여줘', '남은 거 몇 대야 알려줘', '어제 한 30대 보여줘', '김성일 12대 뭐야']) {
    M._mirThreadReset();
    const base = ask(q).a;
    M._mirThreadReset();
    ask('실 점검해줘');
    const after = ask(q).a;
    ok(after === base && !/실번호 상세/.test(after), `점검 답 직후 «${q}» — 가로채지 않는다(점검 답이 없을 때와 같은 답)`, after.slice(0, 160));
  }
  M._mirThreadReset();
  ask('실 점검해줘');
  ask('40피트 12개 보여줘');
  const stale = ask('17개 보여줘', { _now: NOW + 61 * 60000 });
  ok(!/실번호 상세/.test(stale.a), '다른 물음이 끼어도 60분 창은 늘어나지 않는다', stale.a.slice(0, 120));

  console.log('[3] 상세 — 실오류·모양 다름도 한 대씩');
  const diffA = { cn: 'TEST1234561', _mode: 'discharge', sl: '02273964', sl_src: 'Excel_20261110123652.xls', sl_conflict: [{ sl: 'EA02273964', src: 'list.xlsx' }, { sl: 'ES02273964', src: 'Excel_20261110123652.xls' }] };
  const dA = N.generateSealDetailAnswer([diffA], '양하');
  ok(/TEST1234561/.test(dA) && /「EA02273964」/.test(dA) && /「ES02273964」/.test(dA) && !/알파벳만 빠짐/.test(dA), '알파벳이 다른 실(EA ↔ ES)은 «같은 실» 이 아니라 다른 실로 두 값을 적는다', dA);
  ok(/따로 보여드릴 실번호가 없습니다/.test(N.generateSealDetailAnswer([{ cn: 'TEST7654321', _mode: 'discharge', sl: 'AB908172' }], '양하')), '보여줄 것이 없으면 없다고 말한다');

  console.log('[4] 한두 대만 특이한 실 — 실 OBWH 2787E 양하 SPSU6019568 «ZGJHC617662»(실물 ZGJHC0617662, 검수사 2026-11-09 12:20 실오류 보고)');
  const U = await import(pathToFileURL(path.join(root, 'src/utils.js')).href);
  const sm = JSON.parse(fs.readFileSync(path.join(root, 'tools/fixtures/sealsmall48702.json'), 'utf8'));
  const an87 = U.sealFormatAnomalies(sm.OBWH_2787E, {});
  const hit = an87.find((x) => x.cn === 'SPSU6019568');
  ok(!!hit && hit.short === true && /ZGJHC\+6자리 — 자릿수 부족/.test(hit.why) && /7자리가 83% \(5\/6\)/.test(hit.why), 'ZGJHC 여섯 대 가운데 6자리 하나를 «자릿수 부족» 으로 잡는다', JSON.stringify(hit || an87));
  ok(an87.filter((x) => x.short).length === 1, '그 항차에서 «한두 대만 특이» 는 그 한 대뿐 — YN+4자리 넉 대·YN+5자리 넉 대는 여러 대라 정상 실(검수사 «여러개 또는 다수가 그렇다면 정상 실»)', JSON.stringify(an87.filter((x) => x.short)));
  const s53 = U.sealFormatAnomalies(sm.OBWH_2753E, {}).filter((x) => x.short).map((x) => `${x.cn}:${x.why}`);
  ok(s53.length === 2 && s53.some((t) => /^KKFU9076345:HD\+6자리 — 자릿수 부족\(이 선사 HD\+실은 7자리가 75% \(3\/4\)\)/.test(t)) && s53.some((t) => /^SPSU2020489:YN\+4자리 — 자릿수 부족\(이 선사 YN\+실은 5자리가 80% \(4\/5\)\)/.test(t)), '보관 OBWH 2753E — 한 대만 짧은 «HD296407»(HD+7자리 셋)·«YN8140»(YN+5자리 넷) 두 대', JSON.stringify(s53));
  const s67 = U.sealFormatAnomalies(sm.OBWH_2667E_loading, {}).filter((x) => x.short);
  ok(s67.length === 1 && s67[0].cn === 'TCNU1132774' && /BHGJ\+7자리 — 자릿수 많음\(이 선사 BHGJ\+실은 6·10자리가 94% \(16\/17\)\)/.test(s67[0].why), '보관 OBWH 2667E 선적 — 한 대만 긴 «BHGJ9003264»(BHGJ+6·10자리 열여섯) 는 «자릿수 많음»', JSON.stringify(s67));
  const s77 = U.sealFormatAnomalies(sm.RZOR_R077E_loading, {}).filter((x) => x.short);
  ok(s77.length === 2 && s77.every((x) => /LF\+6자리 — 앞자리 0 없음\(이 선사 LF\+실은 0 으로 시작하는 실이 95% \(39\/41\)\)/.test(x.why)), '보관 RZOR R077E 선적 — LF0… 서른아홉 대 가운데 0 없이 시작하는 두 대는 «앞자리 0 없음»', JSON.stringify(s77));
  //  경계 — 특이한 실이 세 대면 여러 대라 올리지 않는다 · 숫자뿐인 실은 이 갈래에 들지 않는다 · 세 자리 넘게 다르면 다른 실 계열
  const fam = (shorts, base = 8) => { const o = {}; for (let i = 0; i < 16; i++) o[`CCCU${3000000 + i}`] = { sl: `WW${500000 + i * 7}`, op: 'ZZ' }; for (let i = 0; i < base; i++) o[`AAAU${1000000 + i}`] = { sl: `QQ0${700000 + i * 3}`, op: 'ZZ' }; shorts.forEach((sl, i) => { o[`BBBU${2000000 + i}`] = { sl, op: 'ZZ' }; }); return o; };   // 같은 선사 실이 스무 대 넘어야 판정이 돈다 — 다른 계열 열여섯 대를 깔아 둔다
  const cnt = (o) => U.sealFormatAnomalies(o, {}).filter((x) => x.short).length;
  ok(cnt(fam(['QQ712345'])) === 1 && cnt(fam(['QQ712345', 'QQ712346'])) === 2 && cnt(fam(['QQ712345', 'QQ712346', 'QQ712347'])) === 0, '한 대·두 대는 올리고 세 대면 올리지 않는다', `${cnt(fam(['QQ712345']))}/${cnt(fam(['QQ712345', 'QQ712346']))}/${cnt(fam(['QQ712345', 'QQ712346', 'QQ712347']))}`);
  ok(cnt(fam(['QQ07123456'])) === 1 && cnt(fam(['QQ0712345678'])) === 0 && cnt(fam(['QQ0712'])) === 0, '두 자리까지 넘치면 «자릿수 많음», 세 자리 넘게 다르면(다른 실 계열) 올리지 않는다', `${cnt(fam(['QQ07123456']))}/${cnt(fam(['QQ0712345678']))}/${cnt(fam(['QQ0712']))}`);
  ok(cnt(fam(['QQ7123456'])) === 1 && /앞자리 0 없음/.test(U.sealFormatAnomalies(fam(['QQ7123456']), {}).find((x) => x.short).why), '자릿수는 같은데 0 없이 시작하는 한 대는 «앞자리 0 없음»');
  const dig = {}; for (let i = 0; i < 16; i++) dig[`CCCU${3000000 + i}`] = { sl: `WW${500000 + i * 7}`, op: 'ZZ' }; for (let i = 0; i < 8; i++) dig[`AAAU${1000000 + i}`] = { sl: `0${700000 + i}`, op: 'ZZ' }; dig.BBBU2000000 = { sl: '712345', op: 'ZZ' };
  ok(cnt(dig) === 0, '숫자뿐인 실 아홉 대는 이 갈래에 들지 않는다(종전 판정만)');
  const rows87 = Object.entries(sm.OBWH_2787E).map(([cn, r]) => ({ cn, ...r, _mode: 'discharge' }));
  const a87 = N.generateSealAuditAnswer(rows87, '양하', sm.OBWH_2787E, null);
  ok(/SPSU6019568 — 🔎 예상 실오류: 리스트 「ZGJHC617662」/.test(a87), '미르 실번호 점검 답에 «SPSU6019568 — 예상 실오류» 한 줄', a87.slice(0, 400));
  const fixed = JSON.parse(JSON.stringify(sm.OBWH_2787E)); fixed.SPSU6019568.sl = 'ZGJHC0617662'; fixed.SPSU6019568.sl_orig = 'ZGJHC0617662';
  ok(!U.sealFormatAnomalies(fixed, {}).some((x) => x.cn === 'SPSU6019568'), '리스트가 맞는 실(ZGJHC0617662)이면 잡지 않는다');

  console.log(`\n${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('연막 중 예외', e); process.exit(1); });
