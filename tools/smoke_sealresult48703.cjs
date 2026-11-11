// 4.87-03 미르 문제 알림 뒤 «해결 방법»·«해결됐나» 연막검사 — 실 TMPZ 2038E 실번호 기록(알파벳만 빠진 17대)으로 점검 답 → 해결 방법 → 해결 결과(처음과 견줌)를 확인한다.
//   실행 — node tools/smoke_sealresult48703.cjs <repoRoot>   (번들 없이 네이티브 ESM 으로 src 를 직접 연다 · 네트워크 없음)
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
const ok = (c, m, d = '') => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m + (c || !d ? '' : ' — ' + String(d).replace(/\n/g, ' ⏎ ').slice(0, 600))); if (!c) bad++; };

(async () => {
  const M = await import(pathToFileURL(path.join(root, 'src/mir.js')).href);
  const N = await import(pathToFileURL(path.join(root, 'src/nlSearch.js')).href);
  const fx = JSON.parse(fs.readFileSync(path.join(root, 'tools/fixtures/insp487.json'), 'utf8'));
  const VK = 'TMPZ_2038E';
  const NOW = new Date('2026-11-11T07:00:00+09:00').getTime();
  const mk = (recs) => {
    const V = { info: { vsl: 'TMPZ', voy: '2038E', dischargeVoy: '2038E' }, discharge: { records: recs, ediContainers: {} }, loading: {} };
    const CS = M.flattenVoyages({ [VK]: V }).filter((c) => c.voyageKey === VK);
    return { V, CS };
  };
  const base = mk(fx.TMPZ_2038E_sealrecs);
  const ctxOf = (w, extra) => ({ app: 'tally', voyageKey: VK, voyage: w.V, info: w.V.info, mode: 'discharge', containers: w.CS, inspector: '연막', smallTalkLast: true, modeChoice: 'both', voyages: { [VK]: w.V }, flat: w.CS, _now: NOW, ...(extra || {}) });
  const ask = (w, q, extra) => { const tr = {}; const a = M.answerOneRaw(q, { ...ctxOf(w, extra), _trace: tr }); return { a: String(a == null ? '' : a), tr }; };
  const keys = Object.keys(fx.TMPZ_2038E_sealrecs);
  const drop17 = keys.filter((k) => (fx.TMPZ_2038E_sealrecs[k].sl_conflict || []).some((x) => /^ES/.test(x.sl)));
  ok(drop17.length === 17, '실 TMPZ 2038E 기록에서 알파벳만 빠진 실 17대', String(drop17.length));
  // 실제 문제 자료 — 세관 실이 다른 4대(sus) + 같은 실을 쓴 두 대(중복 1쌍) = 5건. 알파벳만 빠진 17대는 그대로 둔다(실오류 아님).
  const probs = (mut) => { const r = JSON.parse(JSON.stringify(fx.TMPZ_2038E_sealrecs)); mut(r); return r; };
  const brokenRecs = probs((r) => {
    for (const cn of keys.slice(0, 4)) r[cn].sl_conflict = [{ sl: 'ES9990' + cn.slice(-4), src: '整船清单.XLSX' }, { sl: r[cn].sl, src: 'Excel_20261110123652.xls' }];
    for (const cn of keys.slice(4, 6)) { r[cn].sl = '07777777'; r[cn].sl_conflict = []; }
  });
  const broken = mk(brokenRecs);
  const four = keys.slice(0, 4);

  console.log('[1] 처음 알림 — 실번호 문제를 알린다');
  M._mirThreadReset();
  const a1 = ask(broken, '실 점검해줘');
  ok(a1.tr.via === 'sealAudit' && four.every((cn) => a1.a.includes(cn.slice(-4))), '«실 점검해줘» 가 문제 컨을 알린다', a1.a);

  console.log('[2] 해결 방법 — 종류별 할 일을 말한다');
  for (const q of ['어떻게 해결해', '해결 방법 알려줘', '그거 어떻게 고쳐', '조치 방법 뭐야', '그 컨 어떻게 해결해']) {
    const r = ask(broken, q);
    ok(r.tr.via === 'sealAudit' && /실번호 해결 방법/.test(r.a) && /세관 실과 모양이 다른 컨 4대/.test(r.a) && /중복·혼입·형식 1건/.test(r.a) && four.every((cn) => r.a.includes(cn.slice(-4))) && /해결됐어/.test(r.a), `«${q}» — 해결 방법 + 종류별 할 일 + 다음에 물을 말`, r.a);
  }
  const noprob = ask(base, '어떻게 해결해');
  ok(/풀어야 할 실번호 문제는 없습니다/.test(noprob.a) && /알파벳만 빠진 실 17대/.test(noprob.a), '알파벳만 빠진 17대뿐이면 «풀어야 할 문제 없음» + 17대는 고칠 것 없다고 말한다', noprob.a);

  console.log('[3] 해결 결과 — 아무것도 안 고쳤으면 «아직 남은 것»');
  for (const q of ['해결됐어?', '문제 어떻게 됐어', '그거 해결됐어?', '실번호 고쳤는데 어떻게 됐어', '실 다 고쳤는데 확인해줘', '씰 고쳤어']) {
    M._mirThreadReset(); ask(broken, '실 점검해줘');
    const r = ask(broken, q);
    ok(r.tr.via === 'sealAudit' && /처음 5건 → 지금 5건/.test(r.a) && /아직 남은 것 5건/.test(r.a) && !/✅ 풀린 것/.test(r.a), `«${q}» — 처음 5건 → 지금 5건, 모두 남음`, r.a);
  }

  console.log('[4] 해결 결과 — 두 대를 고쳤다(세관 실을 맞춤) · 한 쌍 중복을 풀었다');
  const fixedRecs = JSON.parse(JSON.stringify(brokenRecs));
  for (const cn of four.slice(0, 2)) fixedRecs[cn].sl_conflict = fx.TMPZ_2038E_sealrecs[cn].sl_conflict;
  const dupKeys = keys.slice(4, 6);
  fixedRecs[dupKeys[0]].sl = fx.TMPZ_2038E_sealrecs[dupKeys[0]].sl; fixedRecs[dupKeys[0]].sl_conflict = fx.TMPZ_2038E_sealrecs[dupKeys[0]].sl_conflict;
  fixedRecs[dupKeys[1]].sl = fx.TMPZ_2038E_sealrecs[dupKeys[1]].sl; fixedRecs[dupKeys[1]].sl_conflict = fx.TMPZ_2038E_sealrecs[dupKeys[1]].sl_conflict;
  M._mirThreadReset(); ask(broken, '실 점검해줘');
  const r4 = ask(mk(fixedRecs), '해결됐어?');
  ok(/처음 5건 → 지금 2건/.test(r4.a) && /풀린 것 3건/.test(r4.a) && /아직 남은 것 2건/.test(r4.a) && four.slice(2).every((cn) => r4.a.includes(cn.slice(-4))), '5건 → 2건, 풀린 3건과 남은 2건(끝 4자리)을 나눠 말한다', r4.a);
  M._mirThreadReset(); ask(broken, '실 점검해줘');
  const r5 = ask(base, '해결됐어?');
  ok(/처음 5건 → 지금 0건/.test(r5.a) && /풀린 것 5건/.test(r5.a) && /모두 풀렸습니다/.test(r5.a) && /알파벳만 빠진 실 17대는 실오류가 아니라/.test(r5.a), '다 고쳤으면 «5건 → 0건 · 모두 풀렸습니다» + 17대는 세지 않는다고 말한다', r5.a);
  M._mirThreadReset(); ask(broken, '실 점검해줘');
  const newRecs = JSON.parse(JSON.stringify(brokenRecs));
  const extra = keys[10]; newRecs[extra].sl_conflict = [{ sl: 'ES9991' + extra.slice(-4), src: '整船清单.XLSX' }, { sl: newRecs[extra].sl, src: 'Excel_20261110123652.xls' }];
  const r6 = ask(mk(newRecs), '해결됐어?');
  ok(/새로 걸린 것 1건/.test(r6.a) && r6.a.includes(extra.slice(-4)), '고치다가 새로 걸린 컨은 «새로 걸린 것» 으로 따로 말한다', r6.a);

  console.log('[5] 가로채지 않는 것 — 점검 답이 앞에 있어도 없을 때와 같은 답');
  const hijack = ['몇 시에 끝나', '40피트 해결 방법 알려줘', '컨테이너 번호 수정 방법 알려줘', '씰 잘렸어 어떻게 해결해', '1호기 어떻게 해결해', '아직 몇 시에 끝나', '아직 남았어?', '사진 수정 어떻게 해', '완료 처리됐어?', '리씰 어떻게 처리해', '다시 확인해줘', '처리 어떻게 해', '처리 방법 알려줘', '수정 어떻게 해', '수정 방법', '수정 방법 알려줘', '고치는 방법 알려줘', '수정했어', '수정 안 돼', '수정했는데 확인해줘', '어떻게 처리해', '이 컨 어떻게 처리해', '지금 몇 대 남았어', '다 처리했어', '문제 있는 배 알려줘', '고장난 호기 어떻게 해결해'];
  for (const q of hijack) {
    M._mirThreadReset(); ask(broken, '실 점검해줘');
    const withA = ask(broken, q).a;
    M._mirThreadReset();
    const without = ask(broken, q).a;
    ok(!/실번호 해결 방법|실번호 다시 점검/.test(withA) && withA === without, `점검 답 직후라도 «${q}» 는 점검 답이 없을 때와 같은 답`, withA.slice(0, 160));
  }
  M._mirThreadReset();
  const cold = ask(broken, '어떻게 해결해');
  ok(!/실번호 해결 방법/.test(cold.a), '점검 답이 앞에 없으면 «어떻게 해결해» 를 실번호로 끌어가지 않는다', cold.a.slice(0, 120));
  M._mirThreadReset(); ask(broken, '실 점검해줘');
  const late = ask(broken, '해결됐어?', { _now: NOW + 61 * 60000 });
  ok(!/실번호 다시 점검/.test(late.a), '점검 답 뒤 60분이 지나면 후속으로 보지 않는다', late.a.slice(0, 120));
  M._mirThreadReset(); ask(broken, '실 점검해줘');
  const otherInsp = ask(broken, '해결됐어?', { inspector: '다른검수원' });
  ok(!/실번호 다시 점검/.test(otherInsp.a), '검수원이 바뀌면 후속으로 보지 않는다', otherInsp.a.slice(0, 120));
  M._mirThreadReset(); ask(broken, '실 점검해줘');
  const otherShip = ask(broken, '해결됐어?', { voyageKey: 'XXXX_0000' });
  ok(!/실번호 다시 점검/.test(otherShip.a), '배(항차)가 바뀌면 후속으로 보지 않는다', otherShip.a.slice(0, 120));

  console.log('[6] 처음 목록을 기억 못 할 때 · 문제 없을 때');
  const fresh = N.generateSealResultAnswer(null, N.sealProblemListOf(broken.CS, brokenRecs, null), '양하');
  ok(/처음 알린 목록은 기억에 없어/.test(fresh) && /5건/.test(fresh), '처음 목록이 없으면 그렇게 말하고 지금 5건만 말한다', fresh);
  ok(/지금은 풀어야 할 실번호 문제가 없습니다/.test(N.generateSealRemedyAnswer([], '양하')), '문제가 없으면 «풀어야 할 문제가 없다» 고 말한다');
  const tr = N.generateSealRemedyAnswer([{ cn: 'ABCU1234567', kind: 'err', trunc: true }], '양하');
  ok(/끝자리가 잘린/.test(tr) && !/이미 고친 건/.test(tr), '끝자리 잘린 실오류는 «이미 고친 건» 이 아니라 실물 확인 안내', tr);

  console.log(`\n${n - bad}/${n} 통과`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('연막검사 오류', e); process.exit(1); });
