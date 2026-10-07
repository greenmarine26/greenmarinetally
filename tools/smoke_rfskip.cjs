// 3.72-02 연막검사 — 리퍼 체크를 안 하는 배(머스크 계열 선사 MAE · 선박 정책 «리퍼 체크 안 함»)는 냉동 알람을 만들지 않는다. 판정 한 벌 utils.isReeferCheckSkipped.
//   검수사 2026-10-02 «머스크 계열은 냉동 검사를 안한다고 알람 띄우지 말라고 했는데 계속 띄우는 이유는?»
//   실데이터 — tools/fixtures/rfskip_ships_real.json(사전 carrier 64척 + 선박 정책 rfSkip, RTDB 읽기 사본), rfskip_mamp636n_discharge.json(RTDB archive/MAMP_636N/discharge — 머스크 풀 리퍼 192대).
//   실소스(utils·diagnostics·WorkClosingChecklist)를 esbuild 로 묶고 jsdom 에서 마감 점검을 그린다.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'rfskip_'));
let n = 0, bad = 0;
//  끝까지 돌지 못하고 멈추면(기다리는 약속이 영영 안 풀림 — 감사 3회전: 3초 절단 변이가 조용히 «통과» 했다) 통과로 치지 않는다.
let FINISHED = false;
process.on('exit', (code) => { if (!FINISHED && code === 0) { console.log('✘ 리퍼 체크 안 하는 배 연막검사가 끝까지 돌지 않고 멈췄다 — 통과로 치지 않는다'); process.exitCode = 1; } });
setTimeout(() => { if (!FINISHED) { console.log('✘ 리퍼 체크 안 하는 배 연막검사 시간 초과(150초)'); process.exit(1); } }, 150000).unref();
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const stub = './tools/stub_fbdb_mem.js';
const OUT = path.join(TMP, 'rs.js');
execSync(`npx esbuild tools/smoke_rfskip.jsx --bundle --loader:.jsx=jsx --loader:.json=json --loader:.png=dataurl --jsx=automatic --external:fs --external:path --external:url `
  + `--alias:firebase/app=${stub} --alias:firebase/database=${stub} --alias:firebase/storage=${stub} --define:process.env.NODE_ENV='"development"' --log-level=error --outfile="${OUT}"`, { cwd: ROOT, stdio: 'pipe' });
const OUTD = path.join(TMP, 'dg.cjs'), OUTM = path.join(TMP, 'mir.cjs');
execSync(`npx esbuild src/diagnostics.js --bundle --platform=node --format=cjs --log-level=error --outfile="${OUTD}"`, { cwd: ROOT, stdio: 'pipe' });
execSync(`npx esbuild src/mirCore.entry.js --bundle --platform=node --format=cjs --log-level=error --outfile="${OUTM}"`, { cwd: ROOT, stdio: 'pipe' });

(async () => {
  const { JSDOM } = require(path.join(ROOT, 'node_modules', 'jsdom'));
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'https://x/' });
  const W = dom.window;
  for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'localStorage', 'CustomEvent', 'Event']) { try { global[k] = k === 'window' ? W : W[k]; } catch (e) { Object.defineProperty(global, k, { value: k === 'window' ? W : W[k], configurable: true }); } }
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  W.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  const errs = [];
  const _ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ')); };
  require(OUT);
  const F = W.__F, U = W.__U, S = W.__SHIPS.ships;
  const text = () => (W.document.getElementById('root').textContent || '').replace(/\s+/g, ' ');

  console.log('■ ① 판정 한 벌 — utils.isReeferCheckSkipped (실 사전 64척 · 선박 정책)');
  const MAE = Object.keys(S).filter((k) => S[k].carrier === 'MAE').sort();
  ok('사전 carrier MAE(머스크) 5척 = MCAP·MCAT·MCSC·MCSN·MAMP', MAE.join(',') === 'MAMP,MCAP,MCAT,MCSC,MCSN', MAE.join(','));
  ok('정책 스위치가 꺼져 있던 머스크 MCSN·MAMP (고치기 전 알람이 계속 뜨던 배)', S.MCSN.policyRfSkip === false && S.MAMP.policyRfSkip === false);
  const skipOf = (k) => U.isReeferCheckSkipped({ vsl: k }, S[k].policyRfSkip === null ? null : { rfSkip: S[k].policyRfSkip }, S[k].carrier);
  ok('머스크 5척 전부 «체크 안 함» — 정책 스위치가 꺼진 MCSN·MAMP 도', MAE.every((k) => skipOf(k) === true), MAE.filter((k) => !skipOf(k)).join(','));
  const others = Object.keys(S).filter((k) => S[k].carrier !== 'MAE');
  const wrong = others.filter((k) => skipOf(k) !== (S[k].policyRfSkip === true));
  ok(`머스크가 아닌 ${others.length}척은 정책 스위치 그대로(켜진 배만 체크 안 함) — 어긋남 0`, wrong.length === 0, wrong.join(','));
  ok('정책 스위치만 켜진 비머스크 배도 종전처럼 «체크 안 함»', U.isReeferCheckSkipped({ vsl: 'ZZZZ' }, { rfSkip: true }, 'SKR') === true);
  ok('정책 없음 + 선사 비어 있음 + 머스크 아님 = 체크함', U.isReeferCheckSkipped({ vsl: 'ZZZZ' }, null, '') === false && U.isReeferCheckSkipped(null, undefined, undefined) === false);
  ok('항차 info.carrier 가 MAE 여도(사전 없이) 체크 안 함 · 소문자·공백도', U.isReeferCheckSkipped({ carrier: ' mae ' }, null, '') === true);
  ok('선사 MAE 와 이름만 비슷한 코드(MAEU 등 사전에 없는 것)는 건드리지 않는다', U.isReeferCheckSkipped({ carrier: 'MAX' }, null, 'MAR') === false);
  //  감사 지적(2026-10-02) — 항차 info.carrier 가 MSK 로 온 머스크 항차(MAMP 636N·MCSN 632N)를 놓쳤다. 실 info 로 잰다.
  const ARCH = W.__ARCH.voyages;
  const arch = Object.entries(ARCH).map(([k, v]) => ({ k, code: k.split('_')[0], info: { vsl: v.vsl, carrier: v.carrier } }));
  const archMae = arch.filter((a) => S[a.code] && S[a.code].carrier === 'MAE');
  ok(`보관소 머스크 ${archMae.length}항차(사전 MAE 5척) — info.carrier 는 MAE·MSK·빈값이 섞여 있다`, archMae.length === 17 && new Set(archMae.map((a) => a.info.carrier || '(빈값)')).size === 3, [...new Set(archMae.map((a) => a.info.carrier || '(빈값)'))].join(','));
  const polOf = (code) => (S[code] && S[code].policyRfSkip != null ? { rfSkip: S[code].policyRfSkip } : null);
  const dictOf = (code) => (S[code] ? S[code].carrier : '');
  const skipArch = (a) => U.isReeferCheckSkipped(a.info, polOf(a.code), dictOf(a.code));
  const missed = archMae.filter((a) => !skipArch(a)).map((a) => a.k);
  ok('머스크 17항차 전부 «체크 안 함» — MSK 항차 MAMP_636N·MCSN_632N·MCAT_630N·MCSC_633N 도', missed.length === 0 && ['MAMP_636N', 'MCSN_632N', 'MCAT_630N', 'MCSC_633N'].every((k) => ARCH[k] && ARCH[k].carrier === 'MSK'), missed.join(','));
  const nonMae = arch.filter((a) => !(S[a.code] && S[a.code].carrier === 'MAE'));
  const flipped = nonMae.filter((a) => skipArch(a) !== (!!polOf(a.code) && polOf(a.code).rfSkip === true));
  ok(`머스크가 아닌 보관소 ${nonMae.length}항차는 정책 스위치 그대로 — 새로 꺼진 배 0`, flipped.length === 0, flipped.map((a) => `${a.k}:${a.info.carrier}`).join(','));
  ok('MSK 코드를 단 항차는 보관소에서 머스크 4항차뿐(다른 선사가 MSK 를 쓰지 않는다)', arch.filter((a) => a.info.carrier === 'MSK').length === 4 && arch.filter((a) => a.info.carrier === 'MSK').every((a) => S[a.code] && S[a.code].carrier === 'MAE'));

  console.log('■ ② 실자료 — 머스크 MAMP 636N 양하(풀 리퍼 192대)');
  const edi = F.discharge.ediContainers, rec = F.discharge.records;
  const vals = Object.values(edi);
  const fullRf = vals.filter((c) => c.rf && c.fe === 'F');
  ok(`머스크 풀 리퍼 ${fullRf.length}대 — 리퍼가 다수인 배`, fullRf.length === 192, String(fullRf.length));
  const sumBefore = U.reeferTempSummary(U.applySpecialMarks({ info: { vsl: 'MAMP' } }, Object.keys({ ...edi, ...rec }).map((cn) => ({ ...(edi[cn] || {}), ...(rec[cn] || {}), cn }))));
  ok(`마감 점검 리퍼 셈(종전) — 실물 온도 미확인 ${sumBefore.nUnverified}대가 빨간 항목으로 뜬다(검수원이 안 재는 배)`, sumBefore.nUnverified > 100 && sumBefore.nNoBase === 0, JSON.stringify({ u: sumBefore.nUnverified, b: sumBefore.nNoBase }));

  console.log('■ ③ 마감 점검 — 체크함(종전) vs 체크 안 함(3.72-02), 실소스를 그려서 본다');
  W.__render(false);
  await wait(60);
  const t0 = text();
  ok('rfSkip=false — «리퍼 실물 온도 미확인» 빨간 항목이 뜬다(종전 동작 그대로)', /리퍼 실물 온도 미확인/.test(t0) && /를 아직 안 쟀습니다/.test(t0), t0.slice(0, 160));
  ok('rfSkip=false — «풀 리퍼 사진 미촬영» 의무 대상이 센다', /풀 리퍼 사진 미촬영/.test(t0) && /의무 대상 중 \d+대 사진 X/.test(t0));
  W.__render(true);
  await wait(60);
  const t1 = text();
  ok('rfSkip=true — «리퍼 실물 온도 미확인»·«를 아직 안 쟀습니다» 가 없다', !/리퍼 실물 온도 미확인/.test(t1) && !/를 아직 안 쟀습니다/.test(t1), t1.slice(0, 200));
  ok('rfSkip=true — 이 항차는 남은 항목이 없어 «마감 가능» 화면이 된다(종전에는 리퍼 온도·사진 두 건이 마감을 막았다)', /마감 가능/.test(t1) && !/항목 미해결/.test(t1) && /항목 미해결/.test(t0), t1.slice(0, 120));
  //  다른 항목이 하나 남아 있으면(실자료에서 완료 기록 한 건을 뺀 변이) 리퍼 항목은 지워지지 않고 «리퍼 체크 안 함» 으로 자리만 남는다.
  const doneKeys = Object.keys(F.discharge.completed || {});
  ok('변이 준비 — 실 완료 기록이 있다(비우기 전)', doneKeys.length > 100, String(doneKeys.length));
  const dis2 = { ...F.discharge, completed: {} };   // 변이 — 완료 기록을 비워 «미완료 컨» 항목이 남게 한다
  W.__renderV({ info: { vsl: 'MAMP' }, discharge: dis2 }, true);
  await wait(60);
  const t2 = text();
  ok('rfSkip=true + 완료 기록 비움 변이 — 항목 목록에 «리퍼 온도 확인 · 리퍼 체크 안 함» 이 자리를 지킨다', /미완료 컨/.test(t2) && /리퍼 온도 확인/.test(t2) && /리퍼 체크 안 함/.test(t2) && !/리퍼 실물 온도 미확인/.test(t2), t2.slice(0, 200));
  ok('같은 변이 — 사진 항목은 «모두 촬영 완료»', /풀 리퍼 사진 미촬영/.test(t2) && /모두 촬영 완료/.test(t2) && !/의무 대상 중/.test(t2));
  W.__renderV({ info: { vsl: 'MAMP' }, discharge: dis2 }, false);
  await wait(60);
  const t3 = text();
  ok('같은 변이 · rfSkip=false — 리퍼 온도·사진이 같이 센다(종전)', /리퍼 실물 온도 미확인/.test(t3) && /의무 대상 중/.test(t3) && /3개 항목 미해결/.test(t3), t3.slice(0, 120));
  const pend = (t) => { const m = t.match(/(\d+)개 항목 미해결/); return m ? +m[1] : 0; };
  ok(`미해결 항목 수 ${pend(t0)} → ${pend(t1)} (리퍼 온도·사진 둘이 빠진다)`, pend(t0) === 2 && pend(t1) === 0, `${pend(t0)}→${pend(t1)}`);

  //  같은 root 에서 rfSkip 만 바꿔 다시 그린다 — 마감 점검 메모 의존에 rfSkip 이 빠지면 화면이 안 바뀐다(감사 변이 M13).
  //  ⚠ voyage 는 «같은 객체» 를 넘긴다 — 매번 새 객체면 메모가 어차피 다시 계산돼 의존에서 rfSkip 이 빠져도 못 잡는다(감사 2회전: M13 생존).
  const voyTg = { info: { vsl: 'MAMP' }, discharge: F.discharge };
  W.__renderCard(voyTg, false); await wait(20);   // 토글용 새 자리 확보
  W.__toggle(voyTg, false); await wait(60);
  const tg0 = text();
  W.__toggle(voyTg, true); await wait(60);
  const tg1 = text();
  W.__toggle(voyTg, false); await wait(60);
  const tg2 = text();
  ok('같은 화면에서 체크함 → 체크 안 함 → 체크함 — 마감 점검이 바뀐다(메모 의존에 rfSkip)', /리퍼 실물 온도 미확인/.test(tg0) && /마감 가능/.test(tg1) && !/리퍼 실물 온도 미확인/.test(tg1) && /리퍼 실물 온도 미확인/.test(tg2));

  console.log('■ ③b 항차 요약 카드(맨 위 빨간 점멸 칩) — 감사 지적: 이 칩이 1.86 이후 스위치를 안 읽었다');
  const voy = { info: { vsl: 'MAMP', voy: '636N', carrier: 'MSK' }, discharge: F.discharge };
  W.__renderCard(voy, false); await wait(80);
  const c0 = W.document.getElementById('root');
  ok('rfSkip=false — «리퍼 확인 검증안됨 192/192» 칩이 빨갛게 깜빡인다(종전 그대로)', /검증안됨 192\/192/.test(c0.textContent) && c0.querySelectorAll('.animate-pulse').length >= 1, String(c0.querySelectorAll('.animate-pulse').length));
  W.__renderCard(voy, true); await wait(80);
  const c1 = W.document.getElementById('root');
  const ct1 = c1.textContent.replace(/\s+/g, ' ');
  ok('rfSkip=true — 깜빡이는 빨간 칩 0 · «검증안됨»·«온도X» 없음 · 진입점은 «리퍼 확인 192대 · 체크 안 함» 으로 남는다', c1.querySelectorAll('.animate-pulse').length === 0 && !/검증안됨|기준없음|온도X/.test(ct1) && /리퍼 확인\s*192대 · 체크 안 함/.test(ct1), ct1.slice(0, 220));
  ok('rfSkip=true — 상단 «리퍼 192대» 칩도 파랑(위치미상이 없으면 빨강 아님)', /리퍼\s*192대/.test(ct1));

  console.log('■ ④-a 미르 브리핑·인수인계 — 홈 통합검색·떠 있는 미르·콘앱은 rfSkip 을 안 싣는다. 엔진이 선사로 스스로 판정한다');
  const M = require(OUTM);
  const rows = Object.values(F.discharge.ediContainers);
  const cs = M.toMirContainers(rows, 'discharge');
  const mkCtx = (info) => ({ app: 'tally', smallTalkLast: true, execDevice: false, modeChoice: 'both', voyageKey: 'MAMP_636N', voyage: { info, discharge: { ...F.discharge, completed: {} } }, info, mode: 'discharge', containers: cs, compMap: {}, shiftMap: null, bayPairs: null, esealBrief: null, photos: null, diagAlerts: [], _trace: {} });
  const hf0 = (a) => String(a).split('\n').filter((l) => /냉동 .*(없음|미확인)/.test(l));
  const rfLines = (ans) => String(ans).split('\n').filter((l) => /실물온도 미확인|기준\(세팅\)온도 없음|냉동 .*미확인|❄/.test(l));
  W.__fbShipBayDict = {};
  const aCtl = M.answerOneRaw('브리핑', mkCtx({ vsl: 'MAMP', voy: '636N', carrier: 'SKR' }));   // 대조 — 같은 컨, 선사만 비머스크
  ok(`대조(선사 SKR) — 브리핑에 리퍼·온도 줄이 ${rfLines(aCtl).length}개 나온다(종전 그대로)`, rfLines(aCtl).length >= 1, String(aCtl).slice(0, 160));
  const aMsk = M.answerOneRaw('브리핑', mkCtx({ vsl: 'MAMP', voy: '636N', carrier: 'MSK' }));   // rfSkip 을 안 실은 ctx
  ok('머스크(info.carrier MSK) — rfSkip 을 안 실어도 브리핑에 리퍼 경고 줄이 없다', rfLines(aMsk).length === 0, rfLines(aMsk).join(' | '));
  W.__fbShipBayDict = { MAMP: { carrier: 'MAE' } };
  const aDict = M.answerOneRaw('브리핑', mkCtx({ vsl: 'MAMP', voy: '636N' }));   // info.carrier 없음 — 사전 carrier 로
  ok('머스크(info.carrier 없음 · 사전 MAE) — 같은 결과', rfLines(aDict).length === 0, rfLines(aDict).join(' | '));
  //  감사 2회전(M16) — 항차 info.carrier 가 «제3의 코드» 로 와도 사전이 MAE 면 머스크다(info 가 사전을 가리면 안 된다).
  ok('판정 — info.carrier 가 제3의 코드(SKR)여도 사전 carrier 가 MAE 면 체크 안 함', U.isReeferCheckSkipped({ carrier: 'SKR' }, null, 'MAE') === true && U.isReeferCheckSkipped({ carrier: 'SKR' }, null, 'SKR') === false);
  W.__fbShipBayDict = { MAMP: { carrier: 'MAE' } };
  const aThird = M.answerOneRaw('브리핑', mkCtx({ vsl: 'MAMP', voy: '636N', carrier: 'SKR' }));
  ok('머스크(info.carrier 제3의 코드 · 사전 MAE) — 브리핑에 리퍼 경고 줄이 없다', rfLines(aThird).length === 0, rfLines(aThird).join(' | '));
  //  콘앱 — 사전을 통째로 안 들고 있다(window.__fbShipBayDict 비어 있음). mirAsk 가 선사 칸 한 개를 받아 ctx.dictCarrier 로 싣는다. 실사례 MCSC_638N(info.carrier null · 사전 MAE).
  W.__fbShipBayDict = {};
  const aConeNo = M.answerOneRaw('브리핑', mkCtx({ vsl: 'MCSC', voy: '638N', carrier: null }));
  const aConeYes = M.answerOneRaw('브리핑', { ...mkCtx({ vsl: 'MCSC', voy: '638N', carrier: null }), dictCarrier: 'MAE' });
  ok(`콘앱 경로(대조) — info.carrier 비고 사전도 비고 dictCarrier 도 없으면 브리핑에 리퍼 줄이 ${rfLines(aConeNo).length}개(종전 그대로)`, rfLines(aConeNo).length >= 1, String(aConeNo).slice(0, 120));
  ok('콘앱 경로 — info.carrier null · 사전 비어 있음 · ctx.dictCarrier=MAE → 리퍼 경고 줄이 없다(MCSC_638N 형)', rfLines(aConeYes).length === 0, rfLines(aConeYes).join(' | '));
  const hConeYes = M.answerOneRaw('인계 자료', { ...mkCtx({ vsl: 'MCSC', voy: '638N', carrier: null }), dictCarrier: 'MAE' });
  ok('콘앱 경로 — 인수인계도 «냉동 … 미확인» 줄이 없다', hf0(hConeYes).length === 0, hf0(hConeYes).join(' | '));
  //  cone.html 의 fbFetchDictCarrier 를 소스에서 꺼내 가짜 fbFetch 로 돌린다 — 선사 칸 한 개만 받고(사전 통째 X) · 한 번만 받고 · 실패는 조용히 «빈값» + 1분 쉼.
  {
    const cone = fs.readFileSync(path.join(ROOT, 'public/cone.html'), 'utf8');
    const m = cone.match(/const _fbCarrierByVsl = \{\};[\s\S]*?\n\}\n/);
    ok('cone.html — fbFetchDictCarrier 가 있다', !!m);
    if (m) {
      const calls = []; let mode = 'ok';
      const fn = new Function('fbFetch', 'window', 'console', m[0] + '\nreturn fbFetchDictCarrier;');
      const warn = []; const fake = async (u) => { calls.push(u); if (mode === 'hang') return new Promise(() => {}); if (mode === 'fail') throw new Error('network'); return { ok: true, status: 200, json: async () => (mode === 'null' ? null : 'MAE') }; };
      const fw = { __fbShipBayDict: undefined };
      const f = fn(fake, fw, { warn: (...a) => warn.push(a.join(' ')) });
      const r1 = await f('mcsc'); const r2 = await f('MCSC');
      ok('cone — 선박 사전의 «선사 칸 한 개»(ship_bay_dict_v3/MCSC/carrier.json)만 받는다 · 값 MAE', r1 === 'MAE' && /^ship_bay_dict_v3\/MCSC\/carrier\.json$/.test(calls[0] || ''), JSON.stringify(calls));
      ok('cone — 배 하나에 한 번만 받는다(두 번째는 기억)', r2 === 'MAE' && calls.length === 1, String(calls.length));
      fw.__fbShipBayDict = { ZZZ: { carrier: 'SKR' } };
      ok('cone — 사전을 이미 들고 있으면 그 값(네트워크 안 감)', (await f('zzz')) === 'SKR' && calls.length === 1);
      mode = 'fail'; const r3 = await f('MCAT'); const n3 = calls.length; const r4 = await f('MCAT');
      ok('cone — 못 받으면 빈값 + 경고 로그, 1분 안에는 다시 시도하지 않는다(질문 답이 느려지지 않게)', r3 === '' && r4 === '' && n3 === 2 && calls.length === 2 && warn.length === 1, `${r3}|${r4}|${calls.length}|${warn.length}`);
      mode = 'null'; ok('cone — 사전에 그 배가 없으면(null) 빈값', (await f('QQQQ')) === '');
      ok('cone — 선박명이 비면 아무것도 안 한다', (await f('')) === '' && (await f(null)) === '');
      //  감사 3회전(P2) — 3초 절단은 지우면 약신호에서 질문 응답이 25초씩 늘어난다(race·3000 변이가 생존했다). 응답이 안 오는 가짜 fetch 로 잰다.
      mode = 'hang'; const tH = Date.now(); const rH = await Promise.race([f('HANGSHIP'), wait(8000).then(() => '(8초가 넘도록 안 끝남)')]); const dH = Date.now() - tH;
      ok(`cone — 응답이 아예 안 오는 약신호는 3초 안팎에서 끊고 빈값(${dH}ms)`, rH === '' && dH >= 2800 && dH < 4500, `${rH}|${dH}`);
    }
    ok('cone — mirAsk 가 ctx.dictCarrier 를 싣는다(info.vsl 로 받아서)', /const dictCarrier=await fbFetchDictCarrier\(info\.vsl \|\| state\.shipName \|\| ''\);/.test(cone) && /\n\s+dictCarrier,\s+\/\/ 2\.58-02/.test(cone));
  }
  W.__fbShipBayDict = {};   // 인수인계는 info.carrier 만으로 가른다(사전 비움)
  const hMsk = M.answerOneRaw('인계 자료', mkCtx({ vsl: 'MAMP', voy: '636N', carrier: 'MSK' }));
  const hCtl = M.answerOneRaw('인계 자료', mkCtx({ vsl: 'MAMP', voy: '636N', carrier: 'SKR' }));
  const hf = (a) => String(a).split('\n').filter((l) => /냉동 .*(없음|미확인)/.test(l));
  ok(`인수인계 — 머스크는 «냉동 … 미확인» 줄이 없고 대조(SKR)는 ${hf(hCtl).length}줄`, hf(hMsk).length === 0 && hf(hCtl).length >= 1, hf(hMsk).join(' | ') + ' // ' + hf(hCtl).join(' | '));
  W.__fbShipBayDict = {};

  console.log('■ ④ 진단 빨간 알람 «풀 리퍼 N대 중 M대 온도 미입력» — 체크 안 하는 배는 만들지 않는다');
  const D = require(OUTD);
  const ediPtk = {}; vals.forEach((c) => { ediPtk[c.cn] = { ...c, pod: c.pod || 'KRPTK' }; });
  const run = (e, rfSkip) => D.runDiagnostics({ ediContainers: e, listRecords: rec, xrayList: {}, mode: 'discharge', carrier: 'MAE', sealPolicy: null, rfSkip });
  ok('실자료 그대로 — 머스크는 온도가 다 있어 어느 쪽이든 «온도 미입력» 알람 0', run(ediPtk, false).filter((a) => a.code === 'reefer_no_temp').length === 0);
  //  변이 — 실 풀 리퍼 5대의 온도를 비운다(리스트 records 의 온도도 같이 비운다). 알람 경로가 스위치를 읽는지 재는 용도다.
  const some = fullRf.slice(0, 5).map((c) => c.cn);
  const mutE = {}; Object.entries(ediPtk).forEach(([cn, c]) => { mutE[cn] = some.includes(cn) ? { ...c, tmp: '' } : c; });
  const mutR = {}; Object.entries(rec).forEach(([cn, r]) => { mutR[cn] = some.includes(cn) ? { ...r, tmp: '' } : r; });
  const runM = (rfSkip) => D.runDiagnostics({ ediContainers: mutE, listRecords: mutR, xrayList: {}, mode: 'discharge', carrier: 'MAE', sealPolicy: null, rfSkip });
  const aOn = runM(false).filter((a) => a.code === 'reefer_no_temp');
  ok('변이(실 리퍼 5대 온도 비움) — 체크함이면 «5대 온도 미입력» 알람이 뜬다', aOn.length === 1 && aOn[0].count === 5, JSON.stringify(aOn.map((a) => a.count)));
  ok('같은 변이 — 체크 안 함이면 알람이 없다', runM(true).filter((a) => a.code === 'reefer_no_temp').length === 0);
  ok('rfSkip 를 안 넘기면(기본) 종전처럼 알람이 뜬다 — 다른 입구에 영향 없음', D.runDiagnostics({ ediContainers: mutE, listRecords: mutR, xrayList: {}, mode: 'discharge', carrier: 'MAE', sealPolicy: null }).some((a) => a.code === 'reefer_no_temp'));

  console.log('■ ⑤-a 베이 그림(BayPlan) — 온도 없는 풀 리퍼 칸의 빨간 «!» · 실제로 그린다(감사 2회전: BayPage 에서 rfSkip 정의 안 됨 → 모든 칸 렌더 크래시)');
  const bangs = () => [...W.document.getElementById('root').querySelectorAll('span.animate-pulse')].filter((e) => e.textContent.trim() === '!').length;
  const rootLen = () => (W.document.getElementById('root').textContent || '').length;
  const e0 = errs.length;
  W.__renderBay(false, null); await wait(700); W.__zoomIn(3); await wait(700);
  const lenA = rootLen(), bgA = bangs();
  W.__renderBay(true, null); await wait(700); W.__zoomIn(3); await wait(700);
  const lenB = rootLen(), bgB = bangs();
  ok(`베이 전체 보기 — 그려진다(${lenA}자) · rfSkip=false 이면 온도 없는 풀 리퍼 2칸에 «!» ${bgA}개(엠티·온도 있는 칸은 없음)`, lenA > 150 && bgA === 2, `len=${lenA} bangs=${bgA}`);
  ok(`베이 전체 보기 — rfSkip=true 도 그려지고(${lenB}자) «!» 0개`, lenB > 150 && bgB === 0, `len=${lenB} bangs=${bgB}`);
  W.__renderBay(false, '2'); await wait(700);
  const lenC = rootLen(), bgC = bangs();
  W.__renderBay(true, '2'); await wait(700);
  const lenD = rootLen(), bgD = bangs();
  ok(`베이뷰(onlyBay) 갈래 — 크래시 없이 두 값 다 그려진다(${lenC}·${lenD}자 · 칸이 좁은 끝4자리 표기라 «!» 는 원래 없다 ${bgC}·${bgD})`, lenC > 150 && lenD > 150 && /0001/.test(W.document.getElementById('root').textContent) && bgC === 0 && bgD === 0, `len=${lenC}/${lenD} bangs=${bgC}/${bgD}`);
  ok('베이 그림 렌더 오류 0 — ReferenceError(rfSkip is not defined) 없음', errs.slice(e0).filter((x) => /not defined|ReferenceError|Error:/.test(x)).length === 0, errs.slice(e0).filter((x) => /not defined|ReferenceError|Error:/.test(x)).slice(0, 2).join(' | '));
  {
    const bp = fs.readFileSync(path.join(ROOT, 'src/components/BayPlan.jsx'), 'utf8');
    const calls = [...bp.matchAll(/<BayPage\b/g)];
    const passed = calls.filter((m) => /rfSkip=\{rfSkip\}/.test(bp.slice(m.index, m.index + 260)));
    ok(`BayPlan — <BayPage 호출 ${calls.length}곳이 모두 rfSkip={rfSkip} 를 넘긴다(전체·베이뷰·한 장씩 세 갈래)`, calls.length === 3 && passed.length === 3, `${passed.length}/${calls.length}`);
    ok('BayPlan — BayPage 가 rfSkip 매개변수를 받는다(기본 false)', /function BayPage\([\s\S]{0,1200}?rfSkip = false[\s\S]{0,200}?\}\) \{/.test(bp));
  }

  console.log('■ ⑤ 배선 — 알람을 만드는 모든 입구가 같은 한 벌(rfSkipShip)을 읽는다');
  const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
  const vp = src('src/pages/VoyagePage.jsx');
  ok('VoyagePage — 판정은 isReeferCheckSkipped 한 곳(rfSkipShip)이고 선사 사전도 넘긴다(그 선언문 안에서)', (() => { const m = vp.match(/const rfSkipShip = isReeferCheckSkipped\([\s\S]*?\);\n/); return !!m && /voyage\?\.info, shipPolicy,/.test(m[0]) && /__fbShipBayDict\[String\(voyage\?\.info\?\.vsl \|\| ''\)\.toUpperCase\(\)\]\?\.carrier/.test(m[0]); })());
  ok('VoyagePage — 정책 스위치를 직접 읽는 곳이 없다(shipPolicy?.rfSkip 0곳)', !/shipPolicy\?\.rfSkip/.test(vp), String((vp.match(/shipPolicy\?\.rfSkip/g) || []).length));
  ok('진단 호출이 rfSkip 를 넘기고 의존에 rfSkipShip', /rfSkip: rfSkipShip,\s+\/\/ 3\.72-02: 리퍼 체크 안 하는 배는 «풀 리퍼 온도 미입력»/.test(vp) && /voyage, shipPolicy, rfSkipShip\]\);\s+\/\* ★ 3\.41/.test(vp));
  ok('출항 임박 배너 — 리퍼 온도 미입력 셈이 rfSkipShip 이면 0', /const rfMiss = rfSkipShip \? 0 : containers\.filter/.test(vp));
  ok('상단 리퍼 줄·미확인 배지·미르 재료·검색 패널·베이뷰 검색이 rfSkipShip', /!_sideCanc && !rfSkipShip && rfSummary\.total > 0/.test(vp) && /unchecked: rfSkipShip \? 0 : rfUnchecked/.test(vp) && /rfSkip: rfSkipShip,[^\n]*\n\s+eseal: esealInfo/.test(vp) && /rfSkip=\{rfSkipShip\}\s+esealBrief=/.test(vp) && /rfSkip: rfSkipShip,\s+esealBrief:/.test(vp));
  ok('마감 점검 · 베이 사진 배지 두 곳이 rfSkipShip', /<WorkClosingChecklist\s+open=\{closingOpen\}\s+voyage=\{voyage\}\s+mode=\{mode\}\s+rfSkip=\{rfSkipShip\}/.test(vp) && (vp.match(/voyageInfo=\{voyage\?\.info\} rfSkip=\{rfSkipShip\}/g) || []).length === 2);
  ok('베이뷰 작업의 베이 그림도 같은 값(searchPanelProps.rfSkip)', /rfSkip=\{!!searchPanelProps\.rfSkip\}/.test(src('src/components/BayViewWork.jsx')));
  ok('BayPlan — 체크 안 하는 배는 사진 대상 0(배지 없음)', /const targets = rfSkip \? \[\] : containers\.filter\(c => ptk\(c\) && isISO403\(c\)\)/.test(src('src/components/BayPlan.jsx')));
  ok('요약 카드 — VoyagePage 가 rfSkip 을 넘기고(VoyageSummaryCard rfSkip={rfSkipShip}) 카드가 칩 색·문구에 쓴다', /<VoyageSummaryCard voyage=\{voyage\} mode=\{mode\} voyageKey=\{voyageKey\} rfSkip=\{rfSkipShip\}/.test(vp) && /!rfSkip && summary\.reeferTempMissing > 0/.test(src('src/components/VoyageSummaryCard.jsx')));
  ok('BayPlan 셀 «NO TEMP»·«!» — rfSkip 이면 tmpMissing 이 거짓', /const tmpMissing = !rfSkip && isFullReefer/.test(src('src/components/BayPlan.jsx')));
  ok('미르 엔진 _normalize — rfSkip 을 안 실은 입구(홈·떠 있는 미르·콘앱)도 utils.isReeferCheckSkipped 로 스스로 판정', /c\.rfSkip = !!c\.rfSkip \|\| isReeferCheckSkipped\(c\.info, null, car\);/.test(src('src/mir.js')));
  ok('수동 조회(컨 한 대 상세·큰 카드)는 건드리지 않았다 — rfSkip 를 안 읽는다', !/rfSkip/.test(src('src/components/ContainerDetailModal.jsx')) && !/rfSkip/.test(src('src/components/BigResultCard.jsx')));
  console.error = _ce;
  ok('콘솔 오류 없음', errs.filter((e) => !/not wrapped in act|Warning:/i.test(e)).length === 0, errs.slice(0, 2).join(' | '));
  console.log(`리퍼 체크 안 하는 배 연막검사: ${n - bad}/${n} 통과`);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ }
  FINISHED = true;
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('✘ 연막검사 예외', e && e.stack || e); process.exit(1); });
