// 회귀 기준표 R40 — PCTC 배 미르 «호기별 검수원·작업량» 이 본선현황 GC별 완료로 답한다(4.26-01). smoke_regress.cjs 가 부른다.
//   검수사 2026-10-14 12:49 «아직 잡힌 작업이 없습니다. 그시간 양하대수는 40대?» — STMJ 2663E(SITC MOJI) 본선현황 양하 40 인데 미르가 «(아직 잡힌 작업 없음)».
//   실소스(nlSearch.answerCraneCrew · utils.crewWorkStats · pctcGcDoneOf)를 esbuild 로 묶어 보관소 STMJ 2663E info 사본으로 답을 만든다(쓰기 없음).
//   ⚠ 기대값은 코드에서 베끼지 않는다 — 호기별 대수는 원자료 termStat.gc 의 disTot·lodTot 을, 이름은 craneCrew 등록을 이 파일이 따로 읽는다.
//   실행: smoke_regress.cjs 안에서 — require('./regress_r40_gccrew.cjs')({ ROOT, TMP, ok, head, fx })
//         단독 — node tools/regress_r40_gccrew.cjs <저장소 루트>
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

module.exports = async function r40({ ROOT, TMP, ok, head, fx }) {
  head('R40 PCTC 배 호기별 작업량 — 컨별 실적이 없으면 본선현황 GC별 완료(합이 본선현황 완료와 맞을 때만) · 등록 이름 · 자료 시각 (4.26-01)',
    '검수사 2026-10-14 12:49 «아직 잡힌 작업이 없습니다. 그시간 양하대수는 40대?» (STMJ 2663E — 본선현황 양하 40 · 미르 «아직 잡힌 작업 없음»)');
  const F = fx('gccrew_stmj2663e.json');
  const e = path.join(TMP, 'r40.mjs'), o = path.join(TMP, 'r40.cjs');
  fs.writeFileSync(e, `export { answerCraneCrew } from "${ROOT}/src/nlSearch.js";\nexport { pctcGcDoneOf, crewWorkStats } from "${ROOT}/src/utils.js";\n`);
  execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --log-level=error --external:firebase --external:firebase/* --loader:.js=jsx --jsx=automatic --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
  const M = require(o);
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const ts = F.info.termStat;
  //  기대 — 원자료에서 따로: GC 키 끝자리 = 호기(GC102 → 2) · 완료 = disTot + lodTot · 이름 = 그 조 등록
  const reg = Object.values(F.info.craneCrew || {})[0] || {};
  const want = Object.entries(ts.gc).map(([k, g]) => ({ no: Number(String(k).slice(-1)), n: (Number(g.disTot) || 0) + (Number(g.lodTot) || 0) })).filter((x) => x.n > 0)
    .map((x) => ({ ...x, name: (reg[`${x.no}호기`] || {}).name || '' }));
  const sumDone = (Number(ts.dis.done) || 0) + (Number(ts.lod.done) || 0);
  const hm = (() => { const d = new Date(Number(ts.at) + 9 * 3600000); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; })();
  const v = () => ({ key: F.key, info: clone(F.info), discharge: {}, loading: {} });
  const now = Number(ts.at) + 60000;
  const a = M.answerCraneCrew(v(), { kind: 'all' }, now) || '';
  //  GC 대수는 항차 누계 — 등록 줄(조마다)과 «항차 누계» 줄로 말한다(2차 시뮬 중-1·하-1 — 조·사람 아래 넣지 않는다)
  const regKey = Object.keys(F.info.craneCrew || {})[0];
  const regLine = `${regKey} — ${want.map((w) => `${w.no}호기 ${w.name}`).join(' · ')}`;
  const sumLine = `항차 누계 — ${want.map((w) => `${w.no}호기 ${w.n}대`).join(' · ')}`;
  ok(`① STMJ 2663E «호기별» 답 — «${regLine}» · «${sumLine}»(원자료 GC 합 ${want.reduce((s, w) => s + w.n, 0)} = 본선현황 완료 ${sumDone}) · 출처 «PCTC 본선현황 GC 합계 ${hm}» · «아직 잡힌 작업 없음» ${/아직 잡힌 작업 없음/.test(a) ? '남음' : '없음'}`,
    want.length === 2 && want.reduce((s, w) => s + w.n, 0) === sumDone && a.includes(regLine) && a.includes(sumLine) && a.includes(`PCTC 본선현황 GC 합계 ${hm}`) && !/아직 잡힌 작업 없음|조 미상/.test(a), a.replace(/\n/g, ' ⏎ ').slice(0, 400));
  const w2 = want.find((w) => w.no === 2);
  const a2 = M.answerCraneCrew(v(), { kind: 'crane', no: 2 }, now) || '';
  const a3 = M.answerCraneCrew(v(), { kind: 'name', name: w2.name }, now) || '';
  ok(`② «2호기 몇 개» → «${a2.split('\n')[0]}» · «${w2.name} 몇 개» → «${a3.split('\n').slice(0, 2).join(' / ')}»`,
    a2.startsWith(`${F.info.vslFull} 2호기 — 항차 누계 ${w2.n}대`) && a2.includes(`등록 ${regKey} ${w2.name}`)
      && a3.startsWith(`${F.info.vslFull} ${w2.name} — ${regKey} 2호기 등록`) && a3.includes(`사람별로는 못 나눠요 — 2호기 항차 누계 ${w2.n}대`), JSON.stringify({ a2, a3 }));
  //  ③ 문지기 — GC 합이 본선현황 완료와, GC 잔여 합이 본선현황 잔여와 다르면(뜻이 다른 칸이면) GC 칸을 쓰지 않는다(지어내지 않는다 · 종전 답 그대로)
  const vb = v(); vb.info.termStat.dis.done = sumDone + 1;
  const ab = M.answerCraneCrew(vb, { kind: 'all' }, now) || '';
  const vr = v(); vr.info.termStat.dis.rest = (Number(ts.dis.rest) || 0) + 1;
  ok(`③ 본선현황 양하 완료를 ${sumDone + 1} 로 바꾼 사본(GC 합 ${sumDone} 과 다름) → GC 칸을 안 씀(pctcGcDoneOf ${M.pctcGcDoneOf(vb.info) === null ? 'null' : '값'}) · 종전 답 «아직 잡힌 작업 없음» · 출처 «터미널 컨별 기록 + 앱 완료» · 잔여만 1 다르게 한 사본도 ${M.pctcGcDoneOf(vr.info) === null ? 'null' : '값'}`,
    M.pctcGcDoneOf(vb.info) === null && M.pctcGcDoneOf(vr.info) === null && /아직 잡힌 작업 없음/.test(ab) && /터미널 컨별 기록 \+ 앱 완료/.test(ab), ab.replace(/\n/g, ' ⏎ ').slice(0, 300));
  //  ④ 컨별 실적에 호기가 있으면(PCTC 컨별 수집이 살아 있는 배) 그것이 정본 — GC 합계로 갈음하지 않는다
  const vc = v(); vc.discharge.termWork = { TESU0000001: { at: Number(ts.at) - 600000, equip: '2호기', pos: '0180682' } };
  const ac = M.answerCraneCrew(vc, { kind: 'all' }, now) || '';
  ok(`④ 컨별 실적(호기 있음) 한 대 넣은 사본 → 출처 «터미널 컨별 기록 + 앱 완료» · 2호기 1대(GC 합계로 안 바뀜)`,
    /터미널 컨별 기록 \+ 앱 완료/.test(ac) && /2호기 [^\n]*— 1대/.test(ac) && !/GC 합계/.test(ac), ac.replace(/\n/g, ' ⏎ ').slice(0, 300));
  //  ⑤ (감사 중-1) 앱으로 찍은 완료가 있으면 호기별 답은 종전대로 앱 기록(사람·조) — GC 합계는 한 줄로 덧붙인다(앱 기록을 GC 로 갈음하지 않는다)
  const w3 = want.find((w) => w.no === 3);
  const vd = v(); vd.discharge.completed = {};
  for (let i = 0; i < 5; i++) vd.discharge.completed[`TESU000001${i}`] = { at: Number(ts.at) - 1800000 + i * 60000, by: '김성일', equip: '2호기' };   // 등록(박진우)과 다른 사람
  for (let i = 0; i < 3; i++) vd.discharge.completed[`TESU000002${i}`] = { at: Number(ts.at) - 1700000 + i * 60000, by: w3.name, equip: '3호기' };
  const ad = M.answerCraneCrew(vd, { kind: 'all' }, now) || '';
  const refOk = ad.includes(`(터미널 본선현황 GC 합계 ${hm} — 2호기 ${w2.n}대 · 3호기 ${w3.n}대 · 앱 입력 대수와 다를 수 있어요)`);
  ok(`⑤ 앱 완료(2호기 김성일 5 · 3호기 ${w3.name} 3) 넣은 사본 → 행은 앱 기록(2호기 김성일 5대 · 3호기 ${w3.name} 3대) · 출처 «터미널 컨별 기록 + 앱 완료» · 덧붙임 «터미널 본선현황 GC 합계 ${hm} — 2호기 ${w2.n}대 · 3호기 ${w3.n}대» ${refOk}`,
    /2호기 김성일 — 5대/.test(ad) && new RegExp(`3호기 ${w3.name} — 3대`).test(ad) && /터미널 컨별 기록 \+ 앱 완료/.test(ad) && refOk, ad.replace(/\n/g, ' ⏎ ').slice(0, 400));
  //  ⑤-2 같은 사본 — «김성일 몇 개» 는 그 사람 앱 기록(4.26 과 같음 · 감사 중-1 «등록이 없고 앱 완료 기록도 없어요» 거짓 방지) · «오늘 주간» 은 거절하지 않고 앱 기록으로
  const an = M.answerCraneCrew(vd, { kind: 'name', name: '김성일' }, now) || '';
  const ak = M.answerCraneCrew(vd, { kind: 'all', dayWord: '오늘', dayOff: 0, shift: '주간' }, now) || '';
  const a2c = M.answerCraneCrew(vd, { kind: 'crane', no: 2 }, now) || '';
  ok(`⑤-2 «김성일 몇 개» → «${an.split('\n')[0]}» · «오늘 주간» → 거절 ${/못 나눠요/.test(ak) ? '함' : '안 함'}(앱 기록 행 ${/2호기 김성일 — 5대/.test(ak) ? '있음' : '없음'}) · «2호기 몇 개» 끝줄 «${a2c.split('\n').slice(-1)[0]}»`,
    /김성일 — 5대/.test(an) && !/기록도 없어요/.test(an) && !/못 나눠요/.test(ak) && /2호기 김성일 — 5대/.test(ak) && !/GC 합계/.test(ak) && a2c.includes(`(터미널 본선현황 GC 합계 ${hm} — 2호기 ${w2.n}대 · 앱 입력 대수와 다를 수 있어요)`),
    JSON.stringify({ an, ak: ak.slice(0, 200), a2c }).slice(0, 600));
  //  ⑥ 날짜를 대면(«어제 야간») GC 합계는 조로 못 나눈다고 사실대로
  const af = M.answerCraneCrew(v(), { kind: 'all', dayWord: '오늘', dayOff: 0, shift: '주간' }, now) || '';
  ok(`⑥ 앱 기록이 없는 배에 «오늘 주간» 으로 물으면 «이 배는 터미널 본선현황 GC 합계라 날짜·조별로는 못 나눠요»`, /터미널 본선현황 GC 합계라 날짜·조별로는 못 나눠요/.test(af), af.slice(0, 200));
  //  ⑧ (2차 시뮬 중-1) 조가 둘 등록돼도(오늘 야간 2호기 최원형 · 3호기 김판석) «(아직 잡힌 작업 없음)»·«조 미상» 없이 조마다 등록 줄 + 항차 누계 · 야간 사람도 등록 + 그 호기 누계
  const vn = v(); const nk = regKey.replace('주간', '야간');
  vn.info.craneCrew[nk] = { '2호기': { at: Number(ts.at) + 3600000, name: '최원형' }, '3호기': { at: Number(ts.at) + 3600000, name: '김판석' } };
  const an8 = M.answerCraneCrew(vn, { kind: 'all' }, now) || '', nm8 = M.answerCraneCrew(vn, { kind: 'name', name: '최원형' }, now) || '';
  ok(`⑧ 조 둘 등록(${regKey} · ${nk}) — «호기별» 에 «아직 잡힌 작업 없음» ${/아직 잡힌 작업 없음/.test(an8) ? '있음' : '없음'} · «조 미상» ${/조 미상/.test(an8) ? '있음' : '없음'} · 등록 줄 둘 · «${sumLine}» · «최원형 몇 개» → «${nm8.split('\n')[0]}»`,
    !/아직 잡힌 작업 없음|조 미상/.test(an8) && an8.includes(regLine) && an8.includes(`${nk} — 2호기 최원형 · 3호기 김판석`) && an8.includes(sumLine)
      && nm8.startsWith(`${F.info.vslFull} 최원형 — ${nk} 2호기 등록`) && nm8.includes(`2호기 항차 누계 ${w2.n}대`), an8.replace(/\n/g, ' ⏎ ').slice(0, 400));
  //  ⑦ (감사 하-1) 자료 시각은 한국 시각 — 다음 날 물으면 «10-14 11:52» 처럼 날짜를 붙인다(지난 본선현황이 오늘 것처럼 보이지 않게)
  const ag = M.answerCraneCrew(v(), { kind: 'all' }, Number(ts.at) + 24 * 3600000) || '';
  const md = (() => { const d = new Date(Number(ts.at) + 9 * 3600000); return `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`; })();
  ok(`⑦ 다음 날 물으면 출처 «PCTC 본선현황 GC 합계 ${md} ${hm}»`, ag.includes(`PCTC 본선현황 GC 합계 ${md} ${hm}`), ag.replace(/\n/g, ' ⏎ ').slice(-160));
};

//  단독 실행 — node tools/regress_r40_gccrew.cjs <저장소 루트>
if (require.main === module) {
  process.env.TZ = 'Asia/Seoul';
  const ROOT = path.resolve(process.argv[2] || process.cwd());
  const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'r40_'));
  let n = 0, bad = 0;
  const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
  const head = (t, f) => { console.log(`■ ${t}`); console.log(`  (출처 ${f})`); };
  const fx = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures', f), 'utf8'));
  module.exports({ ROOT, TMP, ok, head, fx })
    .then(() => { console.log(`\nR40 ${n - bad}/${n}`); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* 임시 */ } process.exit(bad ? 1 : 0); })
    .catch((e) => { console.error('✗ R40 오류', e && e.stack || e); process.exit(1); });
}
