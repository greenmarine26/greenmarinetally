// 5.16 연막검사 — 호기 공동 담당(2갱 3명 교대) · 등록 말 · 넘겨받기 · 막힘 · 시각별 사람 · 갱 수 · 해제
//   검수사 2026-11-20 «OBWH는 2갱인데 3명이 교대로 작업 합니다» · «등록할 방법이 없습니다. 할떄마다 바꿔야 하는데»
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cp516_')), 'b.cjs');
const M = path.resolve('tools/smoke_crewpool516_mem.js');
execFileSync('npx', ['esbuild', 'tools/smoke_crewpool516_entry.js', '--bundle', '--platform=node', '--format=cjs', '--outfile=' + out, '--log-level=error',
  '--alias:firebase/app=' + M, '--alias:firebase/database=' + M, '--alias:firebase/storage=' + M, '--loader:.jsx=jsx', '--loader:.png=dataurl', '--jsx=automatic'], { stdio: 'inherit' });
const B = require(out);
let n = 0, bad = 0;
const ok = (c, m) => { n++; console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) bad++; };
const KST = (h, m) => Date.UTC(2026, 10, 20, h - 9, m);
const VK = 'OBWH_2797E';
let NOW = KST(11, 0); Date.now = () => NOW;
const staff = {}; for (const x of ['김성일', '이형출', '고종웅', '김명보', '김판석']) staff[x] = { name: x, role: '검수', addedAt: 1 };
(async () => {
  B.setServerRoles(staff);
  B.MEM.root = { voyages: { [VK]: { info: { vsl: 'OBWH', vslFull: 'OCEAN BLUE WHALE', voy_d: '2797E', pier: 'PNCT' } } }, inspectors: {} };
  const info = () => B.MEM.root.voyages[VK].info;
  const p = B.parseNaturalQuery('OBWH 공동 김성일 이형출 고종웅');
  ok(p.crewSet && p.crewSet.pool && p.crewSet.pool.names.join(',') === '김성일,이형출,고종웅', '«OBWH 공동 김성일 이형출 고종웅» → 세 사람');
  ok(/공동 담당/.test(B.crewSetText(p.crewSet, 'OCEAN BLUE WHALE')), '미르 확인 글');
  ok(B.parseCrewPool('김명보부장/이형출.고종웅 공동').names.join(',') === '김명보,이형출,고종웅', '직함·구분 기호가 붙어도 이름을 뽑는다');
  ok(B.parseCrewPool('공동 담당이 뭐야?') == null, '물음은 등록이 아니다');
  ok(B.parseNaturalQuery('1호기 김성일 2호기 이형출').crewSet.pool == null, '종전 호기 등록 말은 그대로');
  //  감사 지적 오탐 — 예사말은 등록·해제가 아니다
  const FP = ['김판석 송제욱 공동으로 봉인했어', '김판석이랑 송제욱 교대로 밥 먹었어', '김판석 고종웅 교대로 냉동 점검', '돌아가며 교대 끝났어', '교대로 하다가 교대 그만', '교대로 밥먹고 와', '돌아가며 식사 다녀와', '번갈아 가면서 봐줘', '순환 근무 어떻게 돼', '리퍼 교대로 체크해', '교대로 쉬는중', '공동 작업 몇 대', '공동묘지'];
  const fpHit = FP.filter((q) => B.parseCrewPool(q) != null || (B.parseNaturalQuery(q).crewSet || {}).pool);
  ok(fpHit.length === 0, '예사말 13개는 공동 담당 등록·해제가 아니다' + (fpHit.length ? ' — 잡힘 ' + fpHit.join(' / ') : ''));
  ok(B.parseCrewPool('OBWH 공동 해제').clear === true, '«OBWH 공동 해제» 는 해제');
  ok(['교대 언제야', '다음 교대 언제', '주야 교대 몇 시', '근무표 보여줘', '근무 시간표', '교대 순서'].every((q) => !(B.parseNaturalQuery(q).crewQuery && B.parseNaturalQuery(q).crewQuery.kind === 'poolPlan')), '«교대 언제야»·«근무표» 같은 종전 말은 교대표 갈래로 빨려 들지 않는다');
  await B.fbSetCrewPool(VK, p.crewSet.pool);
  ok(B.crewPoolNamesOf(info()).length === 3, '등록됨');
  const login = (nm, eq) => { B.MEM.root.inspectors[nm] = { name: nm, loggedIn: true, workMode: 'work', loginAt: NOW, assignVoyage: VK, assignEquip: eq || '', assignAt: NOW, lastActive: NOW }; };
  NOW = KST(13, 0);
  login('김성일'); login('이형출'); login('고종웅'); login('김판석');
  for (const [w, eq] of [['김성일', '1호기'], ['이형출', '2호기']]) { await B.fbPoolTakeCrane(VK, eq, w, '', B.crewPoolNamesOf(info())); B.MEM.root.inspectors[w].assignEquip = eq; }
  const sw = [[14, '고종웅', '2호기'], [15, '이형출', '1호기'], [16, '김성일', '2호기'], [17, '고종웅', '1호기'], [18, '이형출', '2호기'], [19, '김성일', '1호기'], [20, '고종웅', '2호기'], [21, '이형출', '1호기'], [22, '김성일', '2호기']];
  let allOk = true;
  for (const [h, w, eq] of sw) {
    NOW = KST(h, 0);
    Object.values(B.MEM.root.inspectors).forEach((i) => { i.lastActive = NOW; });
    const holder = B.equipHolderOf(B.MEM.root.inspectors, VK, eq, w, NOW);
    if (!holder || B.blockingHolderOf(B.MEM.root.inspectors, info(), VK, eq, w, NOW)) allOk = false;
    await B.fbPoolTakeCrane(VK, eq, w, holder, B.crewPoolNamesOf(info()));
    const prev = B.MEM.root.inspectors[holder];
    if (!prev || prev.relievedBy !== w || prev.assignEquip !== '') allOk = false;
    B.MEM.root.inspectors[w].assignEquip = eq; B.MEM.root.inspectors[w].lastActive = NOW;
  }
  ok(allOk, '아홉 번 교대 — 공동 담당끼리는 안 막히고, 앞사람 호기는 비고 «교대 받음»');
  NOW = KST(22, 10);
  ok(!!B.blockingHolderOf(B.MEM.root.inspectors, info(), VK, '1호기', '김판석', NOW), '공동 담당 밖 사람은 지금처럼 막힌다');
  const want = { 13: ['김성일', '이형출'], 14: ['김성일', '고종웅'], 15: ['이형출', '고종웅'], 16: ['이형출', '김성일'], 17: ['고종웅', '김성일'], 18: ['고종웅', '이형출'], 19: ['김성일', '이형출'], 20: ['김성일', '고종웅'], 21: ['이형출', '고종웅'], 22: ['이형출', '김성일'] };
  let seg = true;
  for (const [h, [a, b]] of Object.entries(want)) { const t = KST(Number(h), 30); if (B.crewNameAt(info(), t, '1호기') !== a || B.crewNameAt(info(), t, '2호기') !== b) { seg = false; console.log('    ', h, B.crewNameAt(info(), t, '1호기'), B.crewNameAt(info(), t, '2호기')); } }
  ok(seg, '시각마다 호기 사람이 바꾼 시각대로 갈린다(터미널 실적이 그 사람에게 붙는다)');
  //  교대표 — 시작 보고(없으면 선석배정 예정)부터 한 시간마다. 검수사 «만약 12시부터 작업을 시작한다면 근무자는 놔두고 시간만 1시간씩 땡겨지면 됩니다»
  const V = () => B.MEM.root.voyages[VK];
  info().planBerth = '2026-11-20 13:00 ~ 2026-11-20 23:00';
  const seq = (pl) => pl.rows.map((r) => `${new Date(r.at + 9 * 3600000).toISOString().slice(11, 16)} ${r.name}→${r.no}`).join(' ');
  const pl13 = B.poolRotationPlan(V(), KST(12, 0));
  ok(pl13 && pl13.src === '선석배정 예정' && seq(pl13) === '14:00 고종웅→2 15:00 이형출→1 16:00 김성일→2 17:00 고종웅→1 18:00 이형출→2 19:00 김성일→1 20:00 고종웅→2 21:00 이형출→1 22:00 김성일→2', '교대표(예정 13:00) — 14:00 고종웅 2호기부터 한 시간마다: ' + (pl13 && seq(pl13)));
  V().reports = { [KST(12, 0)]: { action: 'discharge_start', ts: KST(12, 0), by: '김성일' } };
  const pl12 = B.poolRotationPlan(V(), KST(12, 5));
  ok(pl12 && pl12.src === '시작 보고' && seq(pl12).startsWith('13:00 고종웅→2 14:00 이형출→1 15:00 김성일→2') && pl12.rows.length === 10, '시작 보고 12:00 → 사람은 그대로, 시각만 한 시간 당김: ' + (pl12 && seq(pl12)));
  const tx = B.answerCraneCrew(V(), B.parseNaturalQuery('OBWH 교대표').crewQuery, KST(12, 5));
  ok(/교대표 — 시작 보고 12:00 기준/.test(tx || '') && /13:00 고종웅 → 2호기 · 이형출 휴식/.test(tx || ''), '«OBWH 교대표» 답');
  const nx = B.answerCraneCrew(V(), B.parseNaturalQuery('공동 교대 언제야').crewQuery, KST(14, 20));
  ok(/다음 교대 15:00 — 김성일 님이 2호기를/.test(nx || ''), '«공동 교대 언제야» 답: ' + nx);
  ok(B.parseNaturalQuery('교대 브리핑').crewQuery == null, '«교대 브리핑» 은 교대표가 아니다');
  delete V().reports;
  ok(B.gangsOfShift(info(), KST(20, 0)).n === 2, '갱 수는 호기 수 2');
  ok(B.craneSwapsOf(info()).length === 0, '교대를 호기 교체로 잘못 읽지 않는다');
  //  감사 지적 ① — 조 등록 원본은 넘겨받기가 덮지 않는다(넘겨받기 전 실적 주인 유지) · ② 다음 날 새 등록이 전날 상태를 이긴다
  {
    const VK2 = 'STMJ_T1';
    B.MEM.root.voyages[VK2] = { info: { vsl: 'OBWH', voy_d: 'T1', pier: 'PNCT', crewPool: { names: ['김성일', '이형출', '고종웅'], at: 1 } } };
    const i2 = () => B.MEM.root.voyages[VK2].info;
    NOW = KST(8, 30) + 86400000 * 2;   // 11-22 08:30 — 앞 시험의 시각과 겹치지 않게
    const sk = B.crewShiftKey(undefined, NOW, 0).key;
    await B.fbSetVoyageCraneCrew(VK2, sk, [{ no: 1, name: '김성일' }, { no: 2, name: '이형출' }]);
    const t0 = NOW;
    NOW = t0 + 150 * 60000;   // 11:00
    await B.fbPoolTakeCrane(VK2, '2호기', '고종웅', '이형출', ['김성일', '이형출', '고종웅']);
    ok(B.crewNameAt(i2(), t0 + 30 * 60000, '2호기') === '이형출' && B.crewNameAt(i2(), t0 + 180 * 60000, '2호기') === '고종웅', '등록 뒤 넘겨받기 — 넘겨받기 전 2호기는 이형출, 뒤는 고종웅');
    ok(B.craneSwapsOf(i2()).length === 0, '넘겨받기를 호기 교체로 읽지 않는다(등록이 있는 배)');
    ok(B.crewNameForEquip(VK2, i2(), B.MEM.root.inspectors, '2호기', t0 + 180 * 60000).name === '고종웅', '넘겨받은 뒤 미르 작업보고 이름은 넘겨받은 사람(고종웅)');
    {
      const VK3 = 'SWP_T3';
      B.MEM.root.voyages[VK3] = { info: { vsl: 'OBWH', voy_d: 'T3', pier: 'PNCT', crewPool: { names: ['김성일', '이형출', '고종웅'], at: 1 } } };
      const keep = NOW;
      const sk3 = B.crewShiftKey(undefined, NOW, 0).key;
      await B.fbSetVoyageCraneCrew(VK3, sk3, [{ no: 1, name: '김성일' }]);
      NOW += 60 * 60000;
      await B.fbPoolTakeCrane(VK3, '2호기', '김성일', '', ['김성일', '이형출', '고종웅']);
      ok(B.craneSwapsOf(B.MEM.root.voyages[VK3].info).length === 0, '등록한 사람이 빈 호기를 넘겨받아도 호기 교체로 읽지 않는다');
      NOW = keep;
    }
    NOW = t0 + 86400000 - 20 * 60000;   // 다음 날 08:10
    const sk2 = B.crewShiftKey(undefined, NOW, 0).key;
    await B.fbSetVoyageCraneCrew(VK2, sk2, [{ no: 1, name: '송제욱' }, { no: 2, name: '박진우' }]);
    NOW = t0 + 86400000 + 90 * 60000;   // 다음 날 10:00
    await B.fbPoolTakeCrane(VK2, '2호기', '이형출', '박진우', ['김성일', '이형출', '고종웅']);
    ok(B.crewNameAt(i2(), NOW + 30 * 60000, '1호기') === '송제욱' && B.crewNameAt(i2(), NOW + 30 * 60000, '2호기') === '이형출', '다음 날 새 등록 뒤 넘겨받기 — 1호기는 새 등록 송제욱(전날 사람 아님)');
    NOW = KST(22, 10);
  }
  await B.fbSetCrewPool(VK, { clear: true });
  ok(B.crewPoolNamesOf(info()).length === 0 && Object.keys(info().crewPoolLog || {}).length >= 11, '«공동 해제» — 담당은 풀리고 바꾼 기록은 남는다');
  ok(!!B.blockingHolderOf(B.MEM.root.inspectors, info(), VK, '2호기', '이형출', NOW) || !B.equipHolderOf(B.MEM.root.inspectors, VK, '2호기', '이형출', NOW), '해제 뒤에는 다시 서로 막는다');
  const read = (f) => fs.readFileSync(f, 'utf8');
  ok(/blockBy\(n\)/.test(read('src/pages/LoginPage.jsx')) && /fbPoolTakeCrane/.test(read('src/pages/LoginPage.jsx')), '로그인 화면 배선');
  ok(/fbPoolTakeCrane/.test(read('src/components/Header.jsx')) && /addEventListener\('poolTakeCrane'/.test(read('src/components/Header.jsx')) && /blockingHolderOf/.test(read('src/components/BayViewWork.jsx')) && /'poolTakeCrane'/.test(read('src/components/BayViewWork.jsx')), '머리띠·베이뷰 배선(베이뷰는 요청만)');
  ok(['src/pages/VoyagePage.jsx', 'src/components/MirFab.jsx', 'src/components/SearchPanel.jsx', 'src/pages/GlobalSearchPage.jsx'].every((f) => /fbSetCrewPool\(/.test(read(f))), '미르 저장 네 화면 배선');
  ok(/호기 공동 담당/.test(read('src/data/helpData.js')), '매뉴얼');
  console.log(`${n - bad}/${n}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
