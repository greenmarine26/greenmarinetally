// 5.22 연막검사 — 시각이 붙은 교대(«12:30 박진우 1호기 이형출과 교대» · «1호기 12:30부터 박진우»)를 미르가 읽고 그 시각부터 그 사람 이름으로 붙인다.
//   검수사 2026-11-23 14:21·14:29·14:31 «앱에 등록을 못하더라도 기록은 그렇게 될수있어야 합니다. 이기능을 미르가 할수있어야 합니다.»
//   실데이터 — OBWH 2799E 11-23 주간 양하(RTDB GET 14:23 · 정정 전) tools/fixtures/obwh2799e_info_1423.json · obwh2799e_dis_1423.json.
//   정정 전 앱은 1호기 11:00~12:30 36대를 박진우로 붙였다(14:17 등록이 조 전체에 걸림). 실제는 이형출.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || process.cwd();
const TMP = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm/hometmp') ? '/dev/shm/hometmp' : require('os').tmpdir(), 'crewtimed522_'));
let n = 0, bad = 0;
const ok = (name, cond, detail = '') => { n += 1; if (cond) console.log(`  ✔ ${name}`); else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); } };
global.window = global.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, location: { href: '' } };
global.localStorage = global.localStorage || { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
global.document = global.document || { createElement: () => ({ style: {} }), addEventListener() {} };
process.env.TZ = 'Asia/Seoul';
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const _cw = console.warn; console.warn = (...a) => { if (/베이사전/.test(String(a[0]))) return; _cw(...a); };
try {
  const e = path.join(TMP, 'e.mjs'), o = path.join(TMP, 'b.cjs');
  fs.writeFileSync(e, [
    `export { parseTimedCrew, timedCrewPlanOf, timedCrewText } from "${ROOT}/src/crewTimed.js";`,
    `export { parseNaturalQuery } from "${ROOT}/src/nlSearch.js";`,
    `export { isWriteParse } from "${ROOT}/src/mir.js";`,
    `export { crewNameAt } from "${ROOT}/src/utils.js";`,
    `export { setServerRoles } from "${ROOT}/src/staffList.js";`,
  ].join('\n'));
  execSync(`npx esbuild "${e}" --bundle --platform=node --format=cjs --external:firebase --external:firebase/* --loader:.png=dataurl --log-level=error --outfile="${o}"`, { cwd: ROOT, stdio: 'pipe' });
  const B = require(o);
  const st = {}; for (const x of ['김성일', '이형출', '박진우', '김판석']) st[x] = { name: x, role: '검수', addedAt: 1 };
  B.setServerRoles(st);
  const T = (s) => Date.parse(`2026-11-23T${s}:00+09:00`);
  const P = (q) => { const p = B.parseNaturalQuery(q); return p.crewSet && p.crewSet.timed; };
  const q1 = '금일주간 연태 근무 1호기 이형출 2호기 김성일 냉동점검 박진우 12:30 박진우 1호기  이형출과 교대 13:30 이형출 2호기 김성일과 교대';
  const q2 = '15:00 김성일 1호기 박진우 교대 15:30 박진우 2호기 이형출 교대 16:00 이형출  1호기 김성일 교대 16:30 김성일 2호기 박진우 교대 17:00 박진우 1호기 이형출 교대 이런식으로 19시 전후까지 갈듯';
  // ① 말 읽기 — 검수사 실제 문장 둘
  const t1 = P(q1);
  ok('① 14:21 문장 — 처음 1호기 이형출·2호기 김성일 · 12:30 1호기 박진우(←이형출) · 13:30 2호기 이형출(←김성일)', t1 && JSON.stringify(t1.base) === JSON.stringify([{ no: 1, name: '이형출' }, { no: 2, name: '김성일' }]) && t1.swaps.length === 2 && t1.swaps[0].no === 1 && t1.swaps[0].name === '박진우' && t1.swaps[0].from === '이형출' && t1.swaps[1].name === '이형출' && t1.swaps[1].from === '김성일', JSON.stringify(t1));
  const t2 = P(q2);
  ok('① 14:29 문장 — 교대 다섯 건(«과» 없이 «박진우 교대»도)', t2 && t2.swaps.length === 5 && t2.swaps.map((x) => `${x.hh}${x.no}${x.name}${x.from}`).join(',') === '151김성일박진우,152박진우이형출,161이형출김성일,162김성일박진우,171박진우이형출', JSON.stringify(t2 && t2.swaps));
  const t3 = P('1호 12:30부터 박진우');
  ok('① 14:16 실패한 말 «1호 12:30부터 박진우» — 이제 교대로(시작 알림 아님)', t3 && t3.swaps[0].no === 1 && t3.swaps[0].name === '박진우' && !B.parseNaturalQuery('1호 12:30부터 박진우').startSet);
  ok('① «1호기 12시부터 작업 시작» 은 종전대로 시작 알림', !P('1호기 12시부터 작업 시작') && !!B.parseNaturalQuery('1호기 12시부터 작업 시작').startSet);
  ok('① 물음(«교대했어?»·«맞아?»)·교대표는 기록 말이 아니다', !P('12:30 박진우 1호기 교대했어?') && !P('1호기 12:30부터 박진우 맞아') && !P('OBWH 교대표'));
  ok('① 기록 말(isWriteParse) — 번역·자동 별칭으로는 적지 않는다', B.isWriteParse(B.parseNaturalQuery(q1)));
  const info = JSON.parse(rd('tools/fixtures/obwh2799e_info_1423.json'));   // 정정 전 — 1호기 박진우(14:17) · 2호기 이형출(13:22)
  const dis = JSON.parse(rd('tools/fixtures/obwh2799e_dis_1423.json'));
  //  저장하는 자리(firebase.fbSetCrewTimed)와 같은 모양으로 얹는다
  const apply = (inf, pl) => {
    const cc = (inf.craneCrew = inf.craneCrew || {}); const sh = (cc[pl.shiftKey] = cc[pl.shiftKey] || {});
    for (const [no, name] of Object.entries(pl.start)) if (name) sh[`${no}호기`] = { name, at: pl.shiftStart };
    for (const k of pl.keep) sh[`${k.no}호기`] = { name: k.name, at: pl.shiftStart };
    const lg = (inf.crewPoolLog = inf.crewPoolLog || {});
    for (const x of pl.items) lg[`${x.ms}_${x.no}`] = { at: x.ms, equip: `${x.no}호기`, name: x.name, from: x.from, ...(x.plan ? { plan: true } : {}) };
    for (const k of pl.drop) delete lg[k];
    return inf;
  };
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const truth = (no, at) => (no === 1 ? (at < T('12:30') ? '이형출' : '박진우') : (at < T('13:30') ? '김성일' : '이형출'));
  const score = (inf) => { let good = 0, all = 0; for (const r of Object.values(dis)) { if (!r || !r.at || r.at < T('06:30')) continue; const no = +String(r.equip).slice(0, 1); const nm = r.by || B.crewNameAt(inf, r.at, r.equip); all += 1; if (nm === truth(no, r.at)) good += 1; } return { good, all }; };
  // ② 판정 — 실데이터(정정 전 info)
  const pl1 = B.timedCrewPlanOf(t1, T('14:21'), info);
  ok('② 14:21 — 지난 교대 둘 · 처음 1호기 이형출·2호기 김성일 · 조 11-23 주간', pl1.ok && pl1.items.every((x) => !x.plan) && pl1.shiftKey === '11-23 주간' && pl1.start[1] === '이형출' && pl1.start[2] === '김성일', JSON.stringify(pl1));
  ok('③ 정정 전 — 1호기 36대가 틀린 이름(108/144)', JSON.stringify(score(info)) === JSON.stringify({ good: 108, all: 144 }));
  const inf1 = apply(clone(info), pl1);
  ok('③ 14:21 문장을 적으면 144대 모두 실제 이름', score(inf1).good === 144, JSON.stringify(score(inf1)));
  const pl2 = B.timedCrewPlanOf(t2, T('14:29'), inf1);
  ok('② 14:29 — 다섯 건 모두 예정', pl2.ok && pl2.items.length === 5 && pl2.items.every((x) => x.plan));
  const inf2 = apply(clone(inf1), pl2);
  const at = (inf, h, no) => B.crewNameAt(inf, T(h), `${no}호기`);
  ok('③ 앞으로 — 15:10 1호기 김성일 · 15:40 2호기 박진우 · 16:10 1호기 이형출 · 16:40 2호기 김성일 · 17:10 1호기 박진우', at(inf2, '15:10', 1) === '김성일' && at(inf2, '15:40', 2) === '박진우' && at(inf2, '16:10', 1) === '이형출' && at(inf2, '16:40', 2) === '김성일' && at(inf2, '17:10', 1) === '박진우' && score(inf2).good === 144);
  //  감사 상1 — 14:16 의 말 하나만(처음 등록 없이) — 정정 전 info 에서는 12:30 전 1호기를 모른다 → 묻고 안 적는다
  const plA = B.timedCrewPlanOf(t3, T('14:21'), info);
  ok('② 감사 상1 — «1호 12:30부터 박진우» 만으로는 앞사람을 몰라 묻는다(«12:30 전에 1호기는 누구였습니까»)', !plA.ok && plA.why === 'noFrom' && /12:30 전에 1호기는 누구였습니까/.test(B.timedCrewText(t3, 'OBWH', T('14:21'), info)));
  const plA2 = B.timedCrewPlanOf(P('12:30 박진우 1호기 이형출과 교대'), T('14:21'), info);
  ok('② 앞사람을 말하면 적는다 — 1호기 36대 바로잡혀 144대 모두 실제 이름', plA2.ok && score(apply(clone(info), plA2)).good === 144, JSON.stringify(score(apply(clone(info), plA2))));
  //  감사 상2 — 처음 등록을 일부 호기만 말해도 다른 호기 늦은 등록(13:22)에서 교대가 되돌아가지 않는다
  const plE = B.timedCrewPlanOf(P('1호기 이형출 12:30 박진우 1호기 이형출과 교대'), T('14:21'), info);
  const infE = apply(clone(info), plE);
  ok('② 감사 상2 — «1호기 이형출 12:30 박진우 …» · 14:00 1호기 박진우(되돌아가지 않음)', plE.ok && at(infE, '14:00', 1) === '박진우' && at(infE, '12:00', 1) === '이형출', `${at(infE, '14:00', 1)} ${at(infE, '12:00', 1)}`);
  //  감사 중4 — 카페리 17:30 뒤·아침의 저녁 예정
  ok('② 감사 중4 — 17:45 «17:00 박진우 1호기 이형출과 교대» 받음(오늘 17:00)', B.timedCrewPlanOf(P('17:00 박진우 1호기 이형출과 교대'), T('17:45'), null).ok);
  ok('② 감사 중4 — 18:10 «1호기 18:00부터 박진우 …» 시각 풀림(오늘 18:00)', (() => { const p = B.timedCrewPlanOf(P('18:00 박진우 1호기 이형출과 교대'), T('18:10'), null); return p.ok && new Date(p.items[0].ms).getHours() === 18 && new Date(p.items[0].ms).getDate() === 23; })());
  ok('② 감사 중4 — 08:30 «18:30 박진우 1호기 이형출과 교대» 는 오늘 18:30 예정', (() => { const p = B.timedCrewPlanOf(P('18:30 박진우 1호기 이형출과 교대'), T('08:30'), null); return p.ok && p.items[0].plan && new Date(p.items[0].ms).getDate() === 23; })());
  const plX = B.timedCrewPlanOf(P('06:00 박진우 1호기 이형출과 교대'), T('14:21'), null);
  ok('② 조 시작(08:00) 전 시각 — 묻고 안 적음', !plX.ok && plX.why === 'otherShift');
  //  감사 중5 — 다시 말하면 그 호기 옛 예정을 지운다
  const plF = B.timedCrewPlanOf(P('15:20 김성일 1호기 박진우 교대'), T('14:40'), inf2);
  ok('② 감사 중5 — 15:00 예정을 15:20 으로 다시 말하면 1호기 뒤 예정이 바뀐다', plF.ok && plF.drop.length >= 1 && plF.drop.every((k) => /_1$/.test(k)), JSON.stringify(plF.drop));
  //  재감사 중1 — 지난 교대를 확인·정정만 하면 그 호기의 다른 예정은 그대로
  const plG = B.timedCrewPlanOf(P('15:00 김성일 1호기 박진우 교대'), T('15:05'), inf2);
  ok('② 재감사 — 15:05 에 15:00 교대 확인만 → 예정 안 지움 · 16:10 1호기 이형출 그대로', plG.ok && plG.drop.length === 0 && at(apply(clone(inf2), plG), '16:10', 1) === '이형출', JSON.stringify(plG.drop));
  //  재감사 상2 — 조 사이(17:30~19:00) 교대는 앞 조(주간) 등록으로 본다 · 야간 등록을 덮지 않는다
  const infN = clone(inf1); infN.craneCrew['11-23 야간'] = { '1호기': { name: '김판석', at: T('19:00') }, '2호기': { name: '김성일', at: T('19:00') } };
  const plN = B.timedCrewPlanOf(P('18:00 박진우 1호기 이형출과 교대'), T('20:00'), infN);
  ok('② 재감사 — 20:00 에 «18:00 박진우 1호기 이형출과 교대» 는 주간 조 · 야간 1호기 김판석 등록을 덮지 않음', plN.ok && plN.shiftKey === '11-23 주간' && !(plN.start[1]) && at(apply(clone(infN), plN), '21:00', 1) === '김판석', JSON.stringify({ k: plN.shiftKey, s: plN.start }));
  const plN2 = B.timedCrewPlanOf(P('1호기 18:00부터 김성일'), T('18:10'), inf2);
  ok('② 재감사 — 18:10 «1호기 18:00부터 김성일» 은 주간 등록·교대 기록으로 앞사람(박진우, 17:00 교대)을 안다(묻지 않음)', plN2.ok && plN2.items[0].from === '박진우' && plN2.shiftKey === '11-23 주간', JSON.stringify(plN2));
  ok('② 재감사 — 이미 그 사람이면(«1호기 18:00부터 박진우») 묻는다', !B.timedCrewPlanOf(P('1호기 18:00부터 박진우'), T('18:10'), inf2).ok);
  //  감사 하
  const tL = P('12시에 김성일 1호기 점심 교대해');
  ok('② 감사 하 — «점심» 은 앞사람·명단 경고가 아니다', tL && !tL.unknown.includes('점심') && tL.swaps[0].from === '');
  const tO = P('1호기 12:30에 박진우 2호기 김성일과 교대');
  ok('② 감사 하 — 두 모양 겹치면 한 번만(박진우 2호기)', tO && tO.swaps.length === 1 && tO.swaps[0].no === 2);
  ok('② 감사 하 — 호기별로 시각이 섞여도 시각 순으로', B.timedCrewPlanOf(P('13:30 이형출 2호기 김성일과 교대 12:30 박진우 1호기 이형출과 교대'), T('14:21'), null).ok);
  ok('② 감사 하 — 25:00 은 그 글자로 안내', /25:00/.test(B.timedCrewText(P('25:00 박진우 1호기 이형출과 교대'), 'OBWH', T('14:21'))));
  ok('② 감사 하 — 시각 없이 뒤에 붙은 «2호기 이형출» 은 적지 않았다고 알림', /2호기 이형출» 은 시각이 없어/.test(B.timedCrewText(P('1호기 10시부터 김성일 2호기 이형출'), 'OBWH', T('14:21'), info)));
  ok('① 감사 중3 — «1호기 08:00부터 김성일 작업»·«2호기 13:00부터 이형출 양하» 는 종전대로 시작 알림', ['1호기 08:00부터 김성일 작업', '2호기 13:00부터 이형출 양하'].every((q) => !P(q) && !!B.parseNaturalQuery(q).startSet));
  ok('② 답 — «교대를 적을게요» · 예정 안내', /교대를 적을게요/.test(B.timedCrewText(t1, 'OBWH', T('14:21'), info)) && /예정 5건/.test(B.timedCrewText(t2, 'OBWH', T('14:29'), inf1)));
  // ④ 배선 — 화면 다섯 곳이 같은 입구로 적는다
  const fb = rd('src/firebase.js');
  ok('④ firebase — fbSaveTimedCrew(서버 info 읽고 판정 한 번) → fbSetCrewTimed(루트 update 한 번 · crewPoolLog · 처음 등록은 조 시작)', /export async function fbSaveTimedCrew/.test(fb) && /timedCrewPlanOf\(timed, Date\.now\(\), snap\.exists\(\)/.test(fb) && /crewPoolLog\/\$\{x\.ms\}_\$\{x\.no\}/.test(fb) && /at: plan\.shiftStart/.test(fb));
  const sites = ['src/components/MirFab.jsx', 'src/components/SearchPanel.jsx', 'src/pages/GlobalSearchPage.jsx', 'src/pages/VoyagePage.jsx'];
  ok('④ 저장 자리 다섯 곳(미르·검색판·홈 검색·항차 화면 둘)이 fbSaveTimedCrew 를 부른다', sites.reduce((k, f) => k + (rd(f).match(/fbSaveTimedCrew\(/g) || []).length, 0) === 5);
  ok('④ 매뉴얼', /5\.22 — \*\*시각이 붙은 교대/.test(rd('src/data/helpData.js')));
} catch (err) { bad += 1; console.log('  ✘ 실행 오류 — ' + (err && err.stack || err)); }
console.log(`\n5.22 시각이 붙은 교대 연막검사 — ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
