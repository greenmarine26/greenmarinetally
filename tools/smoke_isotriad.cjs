// 규격 3자 대조 연막검사 (3.47) — **실소스에 실데이터**를 물려 «알림이 실제로 뜨는가»를 잰다.
//
//  왜 이 검사가 있는가 — 검수사 2026-09-14:
//    *«세관자료와 EDI 또는 선사 자료와 규격이 틀렸는데 어느곳에서도 알림이 없었습니다.
//      예를 들면 ATPR 10번 홀드에 40 스탠다드 10대가 있는데 세관리스트에는 40 스탠다드가 없었다는것입니다.»*
//    *«확인대상이 EDI : 선사리스트 : 세관리스트 3곳입니다. 만약 불일치가 나온다면 이들은
//      실물을 보기전에는 확정할수 없습니다.»*
//
//  뿌리 — 세관 파서의 변환표에 `45GP`·`22RE`·`42PC` 가 없어 규격을 **빈칸**으로 내보냈고,
//    그 빈칸을 «빈 값은 기존을 안 덮는다» 규칙이 **EDI 값으로 메웠다.** 진단이 EDI 와 EDI 를
//    비교하게 되어 절대 안 울렸다. 실측 — 종전 코드로 이 픽스처를 돌리면 세관 264행 중 64대가
//    빈칸이고 불일치는 0건이다. 이 검사는 그 0건이 되살아나면 배포를 막는다.
//
//  ⚠ 소스 문자열을 grep 하지 않는다 — 3.45 초판이 그렇게 해서 표가 어긋난 채 전부 통과했다.
//    실제 파서를 돌리고 실제 판정 함수를 부른다.
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const ROOT = process.argv[3] || process.cwd();
if (!OUT) { console.error('✗ 번들 경로가 없다'); process.exit(1); }
global.window = global.window || {};
global.document = global.document || { createElement: () => ({}) };
const U = require(path.resolve(OUT));
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/isotriad_atpr2641e.json'), 'utf8'));

let n = 0, bad = 0;
const ok = (name, cond, detail = '') => {
  n += 1;
  if (cond) console.log(`  ✔ ${name}`);
  else { bad += 1; console.log(`  ✘ ${name}${detail ? ' — ' + detail : ''}`); }
};

//  앱 병합 규칙 ①(firebase.js fbSaveListRecords): 빈 값은 기존을 덮지 않는다.
const mergeInto = (store, recs) => recs.forEach(r => {
  const ov = store[r.cn];
  if (!ov) { store[r.cn] = { ...r }; return; }
  const m = { ...ov };
  for (const [k, v] of Object.entries(r)) {
    if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) continue;
    m[k] = v;
  }
  store[r.cn] = m;
});

(async () => {
  const XLSX = await U.loadSheetJS();
  const sheetBuf = (grid, name) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(grid), name);
    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  };
  const customs = (await U.parseListExcel(sheetBuf(FX.customsGrid, 'sheet1'))).records || [];
  const carrier = (await U.parseListExcel(sheetBuf(FX.carrierGrid, 'Stowage Edit'))).records || [];

  // ── ① 파서가 규격을 버리지 않는다 (이 사고의 뿌리) ─────────────────────
  ok('세관 레코드 263대', customs.length === 263, `${customs.length}대`);
  ok('선사 레코드 262대', carrier.length === 262, `${carrier.length}대`);
  ok('세관 규격 빈칸 0 (종전 64)', customs.filter(r => !r.iso).length === 0,
     `${customs.filter(r => !r.iso).length}대 — 변환표에 없는 규격을 또 버리고 있다`);
  ok('세관 원문 칸(iso_customs) 전건 보존', customs.every(r => r.iso_customs), '');
  ok('선사 규격 칸(iso_carrier) 전건 보존', carrier.every(r => r.iso_carrier), '');
  ok('세관 원문은 가공하지 않는다(45GP 60대 그대로)',
     customs.filter(r => r.iso_customs === '45GP').length === 60,
     `${customs.filter(r => r.iso_customs === '45GP').length}대`);
  ok('표에 없던 45GP 를 40HC 로 푼다', customs.filter(r => r.iso_customs === '45GP').every(r => U.isoToLabel(r.iso) === '40HC'));
  ok('표에 없던 22RE 를 20RF 로 푼다', customs.filter(r => r.iso_customs === '22RE').every(r => U.isoToLabel(r.iso) === '20RF'));
  ok('표에 없던 42PC 를 40FR 로 푼다', customs.filter(r => r.iso_customs === '42PC').every(r => U.isoToLabel(r.iso) === '40FR'));

  // ── ② 3자 대조가 검수사가 말한 그 10대를 잡는다 ───────────────────────
  //     업로드 순서가 결과를 바꾸면 안 된다 — 두 순서 다 잰다.
  const run = (a, b) => {
    const store = {}; mergeInto(store, a); mergeInto(store, b);
    const conf = [];
    Object.values(FX.edi).forEach(c => {
      const lr = store[c.cn]; if (!lr) return;
      const s = U.isoConflictOf(c.iso_edi, lr);   // 화면이 읽는 그 칸(EDI 제 칸)
      if (s) conf.push({ cn: c.cn, bay: c.bay, s });
    });
    return { store, conf };
  };
  const A = run(carrier, customs), B = run(customs, carrier);
  ok('불일치 10건 (선사→세관 순서)', A.conf.length === 10, `${A.conf.length}건`);
  ok('불일치 10건 (세관→선사 순서)', B.conf.length === 10, `${B.conf.length}건`);
  ok('업로드 순서가 결과를 바꾸지 않는다',
     A.conf.map(x => x.cn).sort().join() === B.conf.map(x => x.cn).sort().join());
  ok('전부 10번 베이 (검수사 «10번 홀드»)', A.conf.every(x => parseInt(x.bay, 10) === 10),
     [...new Set(A.conf.map(x => parseInt(x.bay, 10)))].join(','));
  ok('세 자료를 모두 보여 준다(EDI·선사·세관)',
     A.conf.every(x => x.s.length === 3 && x.s.map(y => y.k).join() === 'edi,carrier,customs'));
  ok('내용은 EDI 42GP / 선사 42GP / 세관 45GP',
     A.conf.every(x => x.s.map(y => `${y.name} ${y.spec}`).join(' / ') === 'EDI 42GP / 선사 42GP / 세관 45GP'),
     A.conf[0] ? A.conf[0].s.map(y => `${y.name} ${y.spec}`).join(' / ') : '없음');

  // ── ③ 안 울려야 할 것은 안 울린다 ─────────────────────────────────────
  const merged = A.store;
  const triadOf = (cn) => U.isoTriad(FX.edi[cn].iso_edi, merged[cn]);
  const rfLike = Object.keys(FX.edi).filter(cn => merged[cn] && (() => {
    const t = triadOf(cn);
    return t.length >= 2 && new Set(t.map(x => x.spec)).size >= 2 && new Set(t.map(x => x.label)).size === 1;
  })());
  ok('표기만 다른 것(RF↔RE)은 안 띄운다', rfLike.length === 0, `${rfLike.length}건`);
  ok('42PC 는 셋이 같아 안 띄운다',
     customs.filter(r => r.iso_customs === '42PC').every(r => !U.isoConflictOf(FX.edi[r.cn] && FX.edi[r.cn].iso_edi, merged[r.cn])));
  ok('자료가 하나뿐이면 조용하다', !U.isoConflictOf('42GP', {}) && !U.isoConflictOf('', { iso_customs: '45GP' }));
  ok('빈칸은 «다르다»가 아니다', !U.isoConflictOf('42GP', { iso_carrier: '42G1', iso_customs: '' }));
  ok('셋이 같으면 조용하다', !U.isoConflictOf('42GP', { iso_carrier: '42G1', iso_customs: '42GP' }));

  // ── ④ 검수사가 고르면 더 묻지 않는다 (문지기는 한 곳) ─────────────────
  ok('iso_pick 있으면 알림이 멈춘다',
     !U.isoConflictOf('42GP', { iso_carrier: '42G1', iso_customs: '45GP', iso_pick: 'customs', iso_pick_label: '40HC' }));
  //  ⛔ 영영 조용해지면 안 된다 — 고른 답을 **어느 자료도 더는 말하지 않으면** 다시 묻는다.
  ok('고른 답이 자료에서 사라지면 다시 묻는다',
     !!U.isoConflictOf('42GP', { iso_carrier: '42G1', iso_customs: '22GP', iso_pick: 'customs', iso_pick_label: '40HC' }));
  ok('고른 답이 아직 자료에 있으면 계속 조용하다',
     !U.isoConflictOf('42GP', { iso_carrier: '45GP', iso_customs: '45GP', iso_pick: 'customs', iso_pick_label: '40HC' }));
  ok('iso_pick 없으면 그대로 뜬다',
     !!U.isoConflictOf('42GP', { iso_carrier: '42G1', iso_customs: '45GP' }));

  // ── ⑤ `lr.iso` 를 자료로 쓰지 않는다 (이 사고의 뿌리 — 되살아나면 여기서 막는다) ──
  ok('`lr.iso` 는 출처가 아니다 — 그것만으로는 비교하지 않는다',
     !U.isoConflictOf('42GP', { iso: '45GP' }),
     '한 칸 돌려쓰기가 되살아났다');

  // ── ⑥ 표에 없는 규격을 구조로 풀 때 **틀리게 풀지 않는가** ───────────────
  //     2차 시뮬 지적 2026-09-14 — 종류군 첫 글자를 그대로 쓰면 `HR`(냉동·가열)이 드라이가 된다.
  //     3.47 전에는 빈칸이라 조용했으니 이 판이 새로 열 뻔한 길이다. 세관 시트 머리행은 실파일 것 그대로.
  const HEAD = FX.customsGrid[0];
  const ROW = (no, cn, spec) => HEAD.map((h) => (
    h === 'No.' ? String(no) : h === '컨테이너번호' ? cn : h === '규격' ? spec
    : h === 'B/L TYPE' ? 'S' : h === '최종항' ? 'KRPTK' : h === '적재항' ? 'CNDLC' : ''));
  const PROBE = [
    ['45HR', '40RH', '냉동·가열 40HC 를 드라이로 읽지 않는다'],
    ['22HR', '20RF', '냉동·가열 20ft'],
    ['45RE', '40RH', '40HC 리퍼(표에 있던 것 — 회귀 확인)'],
    ['45GP', '40HC', '40HC 드라이'],
    ['42GP', '40DC', '40 스탠다드'],
    ['22GP', '20DC', '20ft 드라이'],
    ['42PC', '40FR', '접이식 플랫폼'],
    ['42UT', '40OT', '오픈탑'],
    ['22TN', '20TK', '탱크'],
    ['40HC', '40HC', '사람 표기(그룹꼴 아님)'],
    ['20HC', '20HC', '사람 표기(그룹꼴 아님)'],
    //  3.52 — 세관이 40ft 하이큐브를 `42HQ` 로도 적는다(TMPZ 2027E 실측 129대(파일 원본 148행)). `HQ` 는 종류군이 아니라
    //    구조 풀이가 못 잡고 빈칸을 냈고, 그 빈칸을 다른 값이 메워 **같은 원문이 두 규격으로 갈려 있었다**
    //    (RTDB 실측 129대 — 45G1 90 · 40HQ 39. 세관 파일 원본은 148행이지만 앱에 남은 것은 129대다).
    ['42HQ', '40HC', '세관 40ft 하이큐브 표기 — 빈칸이면 진단이 조용히 통과한다'],
  ];
  const probeGrid = [HEAD].concat(PROBE.map((x, i) => ROW(i + 1, `PRBU000000${i}`, x[0])));
  const probed = (await U.parseListExcel(sheetBuf(probeGrid, 'sheet1'))).records || [];
  const pby = Object.fromEntries(probed.map(r => [r.iso_customs, r]));
  PROBE.forEach(([spec, want, why]) => {
    const r = pby[spec];
    ok(`${spec} → ${want} (${why})`, !!r && U.isoToLabel(r.iso) === want,
       r ? `${r.iso} → ${U.isoToLabel(r.iso) || '(빈칸)'}` : '레코드 없음');
  });
  ok('리퍼 그룹은 리퍼 표시가 켜진다', ['45HR', '22HR', '45RE'].every(k => pby[k] && pby[k].rf === true));
  ok('플랫폼·오픈탑·탱크 표시가 켜진다', pby['42PC'] && pby['42PC'].fr === true && pby['42UT'] && pby['42UT'].ot === true && pby['22TN'] && pby['22TN'].tk === true);

  // ── ⑦ **표기 차이를 규격 차이로 만들지 않는가** (감사 지적 2026-09-14) ──
  //     대조 잣대는 «길이+높이+종류» 한 가지다. 표기로 대조하면 세관이 40HC 를 `44GP` 로 적는
  //     관례 하나에 없는 불일치가 수십 건 뜬다(감사 실측 10건 → 59건). 검수사 불만의 정반대 사고다.
  const SAME = [
    ['45GP', '44GP', '세관이 40HC 를 44GP 로 적는 관례'],
    ['2680', '25GP', '20피트 하이큐브 — 숫자꼴과 그룹꼴'],
    ['45RF', '45RE', '리퍼 표기 차이'],
    ['45GP', '40HC', '사람 표기'],
  ];
  const DIFF = [
    ['42GP', '45GP', '40 스탠다드 ↔ 40HC — 검수사가 말한 그 차이'],
    ['42RE', '45RE', '리퍼 높이가 다르다'],
    ['22GP', '26GP', '20 스탠다드 ↔ 20HC'],
    ['42RE', '46RE', '리퍼 높이 — 46 을 드라이로 읽어 넘기지 않는다'],
  ];
  SAME.forEach(([a, b, why]) => ok(`같다고 본다: ${a} ↔ ${b} (${why})`, !U.isoConflictOf(a, { iso_customs: b }),
    JSON.stringify(U.isoTriad(a, { iso_customs: b }).map(x => `${x.name} ${x.spec}/${x.label}`))));
  DIFF.forEach(([a, b, why]) => ok(`다르다고 본다: ${a} ↔ ${b} (${why})`, !!U.isoConflictOf(a, { iso_customs: b }),
    JSON.stringify(U.isoTriad(a, { iso_customs: b }).map(x => `${x.name} ${x.spec}/${x.label}`))));

  // ── ⑧ **고르기가 파서와 같은 값을 저장하는가** (감사 지적 — 두 벌이면 갈린다) ──
  //     검수사가 «세관 것이 맞다» 고 누른 값이 세관 파일을 올렸을 때보다 나쁘면 안 된다.
  const PICKSAME = ['25GP', '26GP', '46RE', '44GP', '45GP', '42GP', '22GP', '22RE', '42PC', '45HR'];
  const pickGrid = [HEAD].concat(PICKSAME.map((sp, i) => ROW(i + 1, `PKBU000000${i}`, sp)));
  const pickRecs = (await U.parseListExcel(sheetBuf(pickGrid, 'sheet1'))).records || [];
  const pkby = Object.fromEntries(pickRecs.map(r => [r.iso_customs, r]));
  PICKSAME.forEach(sp => {
    const parser = pkby[sp] && pkby[sp].iso;
    const picked = (U.isoTriad('', { iso_customs: sp })[0] || {}).iso;
    ok(`고르기가 파서와 같은 값을 저장한다: ${sp}`, !!parser && parser === picked, `파서 ${parser} · 고르기 ${picked}`);
  });

  // ── ⑨ 세 화면이 같은 답을 내는가 (§4-4) ───────────────────────────────
  //     ⚠ 호출부의 인자식을 **검사 안에 베껴 두면** 아무것도 증명하지 못한다(감사 지적) —
  //       diagnostics 에 `|| c.iso` 폴백을 다시 넣어도 통과한다. 그래서 **진짜 runDiagnostics 를 부른다.**
  //     ⚠ 픽스처 전건이 `iso_edi` 를 갖고 있어도 안 된다 — 제 칸을 **떼어 낸** 사본으로도 잰다
  //       (옛 EDI 로 등록된 항차가 그 모양이다).
  const diagCount = (ediMap) => {
    const a = U.runDiagnostics({ ediContainers: ediMap, listRecords: merged, xrayList: {}, mode: 'discharge' });
    const h = (a || []).find(x => x.code === 'iso_conflict');
    return h ? h.count : 0;
  };
  const cardCount = (ediMap) => Object.values(ediMap)
    .filter(c => merged[c.cn] && U.isoConflictOf(c.iso_edi || '', merged[c.cn])).length;   // 화면 둘이 쓰는 그 식
  const noEdiCol = Object.fromEntries(Object.entries(FX.edi).map(([k, v]) => {
    const o = { ...v }; delete o.iso_edi; return [k, o];
  }));
  const dN = diagCount(FX.edi), cN = cardCount(FX.edi);
  const dN0 = diagCount(noEdiCol), cN0 = cardCount(noEdiCol);
  ok('진단(runDiagnostics)이 10건을 낸다', dN === 10, `${dN}건`);
  ok('진단 · 작업카드 · 컨 상세가 같은 대수를 본다', dN === cN, `진단 ${dN} · 화면 ${cN}`);
  ok('EDI 제 칸이 없는 항차에서도 셋이 같은 대수를 본다 (한쪽만 c.iso 로 메우지 않는다)',
     dN0 === cN0, `진단 ${dN0} · 화면 ${cN0}`);
  //     ⚠ 위 열 대는 **선사와 세관끼리도 갈리므로** EDI 자리를 빼도 그대로 뜬다 — 그것만으로는
  //       «한쪽만 c.iso 로 메웠는지»를 못 가린다. **오직 EDI 때문에 갈리는 한 대**를 따로 세운다.
  //       (선사·세관이 같은 실제 컨을 골라 EDI 만 다른 규격으로 바꾼다.)
  {
    const soloCn = Object.keys(FX.edi).find(cn => {
      const lr = merged[cn]; if (!lr) return false;
      const t = U.isoTriad('', lr);
      return t.length === 2 && t[0].label === t[1].label && t[0].label === '20DC';
    });
    ok('EDI 때문에만 갈리는 컨을 픽스처에서 찾았다', !!soloCn, '실데이터에 없다 — 검사가 헛돈다');
    if (soloCn) {
      const one = (withCol) => {
        const c = { ...FX.edi[soloCn], iso: '45GP' };
        if (withCol) c.iso_edi = '45GP'; else delete c.iso_edi;
        return { [soloCn]: c };
      };
      ok('EDI 제 칸이 있으면 진단·화면 둘 다 잡는다',
         diagCount(one(true)) === 1 && cardCount(one(true)) === 1,
         `진단 ${diagCount(one(true))} · 화면 ${cardCount(one(true))}`);
      ok('EDI 제 칸이 없으면 진단·화면 둘 다 조용하다 (진단만 c.iso 로 메우면 여기서 걸린다)',
         diagCount(one(false)) === cardCount(one(false)),
         `진단 ${diagCount(one(false))} · 화면 ${cardCount(one(false))}`);
    }
  }
  ok('EDI 제 칸이 없으면 EDI 자리를 지어내지 않는다',
     U.isoTriad('', { iso_carrier: '42G1', iso_customs: '45GP' }).every(x => x.k !== 'edi'));
  //     진단이 내는 한 줄과 단추가 **같은 말**을 쓰는가(§4-4).
  {
    const a = U.runDiagnostics({ ediContainers: FX.edi, listRecords: merged, xrayList: {}, mode: 'discharge' });
    const h = (a || []).find(x => x.code === 'iso_conflict');
    const w = h && h.details && h.details[0];
    const line = w ? U.isoConflictText(w) : '';
    const btn = w ? w.srcs.map(x => `${x.name} ${x.spec}`).join(' / ') : '';
    ok('진단 줄과 단추가 같은 말을 쓴다', !!line && line === btn, `줄 «${line}» · 단추 «${btn}»`);
    ok('진단 줄이 EDI 42GP / 선사 42GP / 세관 45GP', line === 'EDI 42GP / 선사 42GP / 세관 45GP', line);
  }

  // ── ⑨-B **확정한 대로 진단이 조용해지는가** (감사 지적 2026-09-14) ──────
  //     진단은 화면 목록을 안 쓰고 `ediContainers` 를 직접 읽는다. 확정은 `records` 에 들어간다.
  //     그래서 «실물은 드라이» 라고 확정해도 EDI 의 rf:true 가 남아 온도 경고가 안 꺼졌다 —
  //     검수사가 끌 방법이 없었다. 승격(드라이→리퍼)은 되고 **강등만 안 되던** 비대칭이다.
  {
    const rfCn = Object.keys(FX.edi).find(cn => FX.edi[cn].rf === true && FX.edi[cn].fe === 'F');
    ok('픽스처에 풀 리퍼가 있다', !!rfCn, '실데이터에 없다 — 검사가 헛돈다');
    if (rfCn) {
      const ediOne = { [rfCn]: { ...FX.edi[rfCn], tmp: '', tmp_missing: true } };
      const recOne = (pick) => ({ [rfCn]: pick
        ? { cn: rfCn, iso: '42G1', rf: false, iso_pick: 'customs', iso_pick_label: '40DC', iso_customs: '42GP' }
        : { cn: rfCn } });
      const warnOf = (rec) => {
        const a = U.runDiagnostics({ ediContainers: ediOne, listRecords: rec, xrayList: {}, mode: 'discharge' });
        return (a || []).some(x => x.code === 'reefer_no_temp');
      };
      ok('확정 전에는 온도 미입력 경고가 뜬다', warnOf(recOne(false)));
      ok('드라이로 확정하면 온도 미입력 경고가 꺼진다 (검수사가 끌 수 있다)', !warnOf(recOne(true)));
    }
  }

  // ── ⑩ 특수화물 판정이 한 벌인가 (§4-4 — 확정이 플래그를 강등시키는 자리) ──
  //     감사 지적: 손으로 다시 적은 정규식이 3.43-03 사고(«FR 을 OT 로»)를 되살릴 뻔했다.
  [['4283', 'fr'], ['FR40', 'fr'], ['PL40', 'fr'], ['2261', 'fr'], ['42PF', 'fr'],
   ['42UT', 'ot'], ['22UT', 'ot'], ['22TN', 'tk'], ['42TN', 'tk']].forEach(([code, want]) => {
    const got = { fr: U.isFlatRackIso(code), ot: U.isOpenTopIso(code), tk: U.isTankIso(code) };
    ok(`${code} 는 ${want} 하나만 켠다`, got[want] === true && Object.keys(got).filter(k => got[k]).length === 1,
       JSON.stringify(got));
  });

  // ── ⑪ 3.52: 세관 «선사부호» 가 선사 기준인가 (§4-4 — 데이터 들어오는 자리) ──
  //     검수사 확정 2026-09-15 «SOC가 있는 선박은 선사기준을 세관리스트로 합니다».
  //     EDI 선사 칸에는 선사가 아닌 값이 온다 — 실측 `SOC`(화주 소유 컨 표식) · `OLL`.
  //     ⚠ 소스 grep 이 아니라 **파서를 돌려** op 가 실제로 채워지는지 잰다.
  {
    //  ⚠ 픽스처 머리행에 이미 `선사부호` 가 있을 수 있다 — 중복 칸을 만들지 않게 뺀 뒤 붙인다.
    const HEAD_NOOP = HEAD.filter((h) => h !== '선사부호' && h !== '상이내역유무' && h !== '상이내역코드');
    const HEAD2 = HEAD_NOOP.concat(['상이내역유무', '상이내역코드', '선사부호']);
    const ROW2 = (no, cn, code) => HEAD2.map((h) => (
      h === 'No.' ? String(no) : h === '컨테이너번호' ? cn : h === '규격' ? '22GP'
      : h === 'B/L TYPE' ? 'S' : h === '최종항' ? 'KRPTK' : h === '적재항' ? 'CNSHA'
      : h === '선사부호' ? code : ''));
    //  ⚠ `NOL`→DWS 는 **배별 사전**(tallyFormats.DXQD.opAlias)이지 이 공용표가 아니다 — smoke_opalias ⑩ 이 잰다.
    const CASES = [['TJMS', 'TJM'], ['EASK', 'EAS'], ['DWIC', 'DWS'], ['SNKO', 'SKR'], ['EAS', 'EAS'], ['', ''], ['NOL', 'NOL']];
    const g2 = [HEAD2].concat(CASES.map((c, i) => ROW2(i + 1, `OPRU000000${i}`, c[0])));
    const r2 = (await U.parseListExcel(sheetBuf(g2, 'sheet1'))).records || [];
    ok('선사부호 칸이 있으면 세관 레코드가 그 행 수만큼 나온다', r2.length === CASES.length, `${r2.length}행`);
    CASES.forEach(([code, want], i) => {
      const r = r2.find(x => x.cn === `OPRU000000${i}`);
      ok(`세관 선사부호 ${code || '(빈칸)'} → ${want || '(빈칸)'}`, !!r && String(r.op || '') === want,
         r ? `op=${JSON.stringify(r.op)}` : '레코드 없음');
    });
    //  ⛔ 선사부호 칸이 없는 옛 양식은 종전대로 빈칸이어야 한다 — 없는 것을 지어내지 않는다.
    //  ⛔ **칸 자체가 없는** 옛 양식은 종전대로 빈칸이어야 한다(ci.op < 0 경로 — 값이 빈 것과 다르다).
    const ROW_NOOP = (no, cn) => HEAD_NOOP.map((h) => (
      h === 'No.' ? String(no) : h === '컨테이너번호' ? cn : h === '규격' ? '22GP'
      : h === 'B/L TYPE' ? 'S' : h === '최종항' ? 'KRPTK' : h === '적재항' ? 'CNSHA' : ''));
    const noOp = (await U.parseListExcel(sheetBuf([HEAD_NOOP, ROW_NOOP(1, 'NOPU0000001')], 'sheet1'))).records || [];
    ok('선사부호 «칸이 없는» 옛 양식은 op 가 빈칸(지어내지 않는다)',
       !HEAD_NOOP.includes('선사부호') && noOp.length === 1 && !noOp[0].op,
       noOp[0] ? `op=${JSON.stringify(noOp[0].op)}` : '레코드 없음');
  }

  console.log(`\n규격 3자 대조 연막검사 ${n - bad}/${n} 통과`);
  if (bad) { console.log('✗ 실패 — 배포 금지'); process.exit(1); }
})().catch(e => { console.error('✗ 검사 중 오류:', e && e.stack || e); process.exit(1); });
