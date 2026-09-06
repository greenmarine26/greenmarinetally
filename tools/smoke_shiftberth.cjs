// 시프팅 대수 연막검사 — 배정표가 정본인 경로 (2.81, 검수사 MCSC 633N 보고)
//   실데이터 6항차(양하·선적 EDI 파싱 맵 + 배정표 이적)로 대조한다.
//   ⛔ 「코드가 그럴듯하다」로 끝내지 않는다 — 배정표 숫자와 한 대씩 맞춰 본다.
const path = require('path');
const fs = require('fs');

(async () => {
  const U = await import(path.resolve('src/utils.js'));
  const FX = JSON.parse(fs.readFileSync(path.resolve('tools/fixtures/shifting_berth.json'), 'utf8'));
  let fail = 0;
  const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fail++; };
  const expand = (o, key) => {
    const m = {};
    for (const [cn, c] of Object.entries(o)) m[cn] = { bay: c.b, row: c.r, tier: c.t, [key]: c[key], iso: c.i, fe: c.f };
    return m;
  };

  console.log('[1] 배정표 이적과 앱 계산이 한 대도 안 틀리는가 (실데이터 6항차)');
  //  기대값은 배정표(모브) ÷ 2. 배정표는 터미널이 확정한 실작업 수다.
  const WANT = { MCSC_633N: 95, SWBT_2614S: 0, XTPG_537E: 0, XTPG_536E: 8, MAMP_631N: 1, KSKM_2615N: 0 };
  for (const [k, want] of Object.entries(WANT)) {
    const x = FX[k];
    if (!x) { ok(false, `${k} 픽스처 없음`); continue; }
    const got = Object.keys(U.computeShiftingMap(expand(x.d, 'pod'), expand(x.l, 'pol'), { berthShift: x.bs }) || {}).length;
    ok(got === want, `${k} 배정 ${x.bs}모브 → ${got}대 (기대 ${want})`);
  }

  console.log('[2] MCSC 633N — 배정표 190모브 = 95대가 나오는가 (검수사 보고 건)');
  {
    const x = FX.MCSC_633N;
    const map = U.computeShiftingMap(expand(x.d, 'pod'), expand(x.l, 'pol'), { berthShift: x.bs });
    const n = Object.keys(map).length;
    ok(n === 95, `95대 (${n})`);
    ok(n * 2 === x.bs, `모브 ${n * 2} == 배정표 ${x.bs}`);
    ok(map._meta && map._meta.source === 'berthShift', '_meta 가 배정표 근거임을 남긴다');
    //  종전 필터가 깎던 29대가 실제로 살아났는지 — 대표 셋을 이름으로 확인한다.
    //   MSKU0695264 : 34-11-84 → 34-03-88 (순열 오판정으로 빠졌던 것)
    //   MSKU1334230 : 26-01-02 → 26-04-84 (홀드 맨 아래 — 방해 판정이 영영 못 잡던 자리)
    //   TCNU8487673 : 18-11-90 → 38-03-84 (그 베이에 평택 작업이 없다고 빠졌던 것)
    for (const cn of ['MSKU0695264', 'MSKU1334230', 'TCNU8487673']) ok(!!map[cn], `${cn} 살아 있다`);
  }

  console.log('[3] 배정표가 0·없음·어긋남이면 종전 필터를 그대로 건다');
  {
    const x = FX.MCSC_633N;
    const d = expand(x.d, 'pod'), l = expand(x.l, 'pol');
    const noBs = Object.keys(U.computeShiftingMap(d, l) || {}).length;
    ok(noBs === 66, `배정표 없음 → 종전 필터 66대 (${noBs})`);
    const wrong = Object.keys(U.computeShiftingMap(d, l, { berthShift: 100 }) || {}).length;
    ok(wrong === 66, `배정표 100모브(어긋남) → 종전 필터 66대 (${wrong})`);
    const zero = Object.keys(U.computeShiftingMap(d, l, { berthShift: 0 }) || {}).length;
    ok(zero === 66, `배정표 0 → 종전 필터 66대 (${zero})`);
  }

  console.log('[4] 배선 — computeShiftingFromVoyage 가 info.berthShift 를 넘기는가');
  {
    const src = fs.readFileSync(path.resolve('src/utils.js'), 'utf8');
    const oneLine = src.replace(/\s+/g, ' ');
    ok(/computeShiftingFromVoyage[\s\S]{0,400}?berthShift: voyage\?\.info\?\.berthShift/.test(oneLine),
       'computeShiftingFromVoyage → berthShift 전달');
    ok(/voyage\?\.info\?\.berthShift \?\? ''/.test(src), '캐시 서명에 berthShift 포함(나중에 들어와도 재계산)');
  }

  console.log('[5] 2.82-03 — «시프팅 없음»을 시프팅이 있는데 말하지 않는가');
  {
    //  검수사 실물 2026-08-29: «◆쉬프팅(재적부) 95 · 선사·세관·배정 279대 일치 ✓ 시프팅 없음??»
    //  삼자 일치(양하 **대수** 확정)와 시프팅(**모브**)은 다른 이야기다 — 붙여 놓으면 모순이 나온다.
    const u = fs.readFileSync(path.resolve('src/utils.js'), 'utf8');
    ok(/_src\.agree && !\(Number\.isFinite\(_bs0\) && _bs0 > 0\)/.test(u),
       'shiftingTruthCheck: 배정표 이적>0 이면 삼자 일치로 덮지 않는다');
    const vp = fs.readFileSync(path.resolve('src/pages/VoyagePage.jsx'), 'utf8');
    ok(/shiftingList\.length === 0 && shiftInfo\?\.truthChk\?\.srcAgree/.test(vp),
       'VoyagePage: «시프팅 없음» 문구는 목록이 실제로 0일 때만');
    //  실데이터로 — MCSC 633N(배정 190) 이 «없음»으로 안 떨어지는지
    const x = FX.MCSC_633N;
    const v = { info: { berthShift: x.bs, terminalStatus: 'working' },
                discharge: { ediContainers: expand(x.d, 'pod') }, loading: { ediContainers: expand(x.l, 'pol') } };
    const tc = U.shiftingTruthCheck(v, 95);
    ok(!!tc && !tc.srcAgree, `MCSC 633N — srcAgree 로 안 빠진다(${tc && tc.srcAgree ? '빠짐' : '정상'})`);
    ok(!!tc && tc.truth === 95 && tc.ok === true, `배정표 190모브 → 95대 · 확정 95 와 일치 (truth ${tc && tc.truth})`);
  }

  console.log('[6] 호출부 전수 — 시프팅을 세는 곳이 **전부** 배정표를 넘기는가');
  {
    //  ⛔ 3금지① — 2.81 에서 utils 만 고치고 콘앱 호출부를 안 봐서 «콘앱 66 · 검수앱 95» 로 갈렸다
    //    (검수사가 두 앱 카고플랜을 나란히 뽑아 잡아냈다, 2026-08-29).
    //    computeShiftingMap 을 **직접** 부르는 곳은 둘뿐이다 — utils 의 래퍼와 콘앱. 둘 다 넘겨야 한다.
    const u = fs.readFileSync(path.resolve('src/utils.js'), 'utf8');
    const cone = fs.readFileSync(path.resolve('public/cone.html'), 'utf8');
    ok(/_cs\(_dMap, _lMap, \{ berthShift: _v\.berthShift \}\)/.test(cone),
       '콘앱: computeShiftingMap 에 배정표를 넘긴다');
    ok(/berthShift: \(info\.berthShift!=null\?Number\(info\.berthShift\):null\)/.test(cone),
       '콘앱: 항차 목록이 info.berthShift 를 담는다(안 담으면 넘길 값이 없다)');
    //  직접 호출이 그 둘 말고 더 늘어나면 여기서 걸린다.
    const direct = (u.match(/computeShiftingMap\(/g) || []).length;   // 정의 1 + 래퍼 1
    ok(direct === 2, `utils 안 computeShiftingMap 등장 ${direct}곳(정의+래퍼) — 새 호출부가 늘면 배정표를 넘기는지 확인할 것`);
  }

  console.log('[7] 맞교환(swapFix) — 검수사 확정: 2118 은 빠지고 5660 이 들어온다 (MCSC 633N 실데이터)');
  {
    const x = FX.MCSC_633N;
    const D = expand(x.d, 'pod'), L = expand(x.l, 'pol');
    const mk = (swapNode) => ({ discharge: { ediContainers: D }, loading: { ediContainers: L },
                                info: { berthShift: x.bs }, swapFix: swapNode });
    const A = 'CAAU6532118', B = 'MRSU6465660';
    const base = U.computeShiftingFromVoyage(mk(null)) || {};
    ok(Object.keys(base).length === 95 && !!base[A] && !base[B], '기준 95대 · 2118 시프팅 · 5660 아님');
    const after = U.computeShiftingFromVoyage(mk({ k1: { a: A, b: B, at: 1 } })) || {};
    const cnt = Object.keys(after).length;
    ok(cnt === 95 && !after[A] && !!after[B], `맞교환 뒤 ${cnt}대(기대 95) · 2118 빠짐 · 5660 들어옴`);
    const pairs = (m) => Object.entries(m).filter(([k]) => !k.startsWith('_')).map(([, v]) => `${v.from}>${v.to}`).sort().join('|');
    ok(pairs(base) === pairs(after), '작업 칸쌍(from→to) 집합 동일 — 칸은 그대로, 번호만 바뀐다(§5-Y-B)');
    //  양하 지도에만 겹치면 배정표 정본(95×2=190) 등식이 깨진다 — 한쪽 배선 실수를 여기서 잡는다.
    const dOnly = U.computeShiftingMap(U.applySwapFix(D, [{ id: 't', a: A, b: B, at: 1 }]), L, { berthShift: x.bs }) || {};
    ok(Object.keys(dOnly).length !== 95, `양하만 겹치면 ${Object.keys(dOnly).length}대로 무너진다(그래서 두 지도에 함께 겹친다)`);
    //  게이트 — 검수사 확정: 엠티는 4조건, 풀은 무게까지 같아야 하고 일항사와 상의 후.
    const g1 = U.swapFixGate({ ...D[A], pol: 'PHDVO' }, { ...D[B], pol: 'PHDVO' });
    ok(g1.ok === true && !g1.chiefMate, '게이트: 같은 출발지·도착지·사이즈·엠티 → 허용');
    const g2 = U.swapFixGate({ ...D[A], pol: 'PHDVO' }, { ...D[B], pol: 'PHDVO', pod: 'CNDLC' });
    ok(g2.ok === false, '게이트: 도착지 다르면 차단');
    const F1 = { pol: 'X', pod: 'Y', iso: '45G1', fe: 'F', wt: 1000 };
    ok(U.swapFixGate(F1, { ...F1, wt: 2000 }).ok === false, '게이트: 풀 무게 다르면 차단');
    const gF = U.swapFixGate(F1, { ...F1 });
    ok(gF.ok === true && gF.chiefMate === true, '게이트: 풀 무게 같으면 일항사 상의 조건부 허용');
    //  콘앱 배선 — 같은 한 벌을 콘앱 시프팅 3곳이 겹친다 (2.5 «콘앱 66·검수앱 95» 재발 방지)
    const cone = fs.readFileSync(path.resolve('public/cone.html'), 'utf8');
    ok((cone.match(/_applySwapFix2\(/g) || []).length >= 4, '콘앱: 맞교환 겹침이 3곳 호출부에 걸려 있다');
    const entry = fs.readFileSync(path.resolve('src/coneCargoPlan.entry.jsx'), 'utf8');
    ok(/applySwapFix/.test(entry) && /swapFixList/.test(entry), '콘앱 번들이 applySwapFix·swapFixList 를 내보낸다');
    //  캐시 — 맞교환이 더해지면 서명이 바뀌어야 한다(조용한 미반영 방지)
    ok(/swapFixList\(voyage\)\.map\(\(s\) => s\.id\)/.test(fs.readFileSync(path.resolve('src/utils.js'), 'utf8')),
       '캐시 서명에 swapFix 리비전이 들어 있다');
  }

  console.log('[8] 3.20 — 터미널이 채운 자리는 시프팅 판정에 안 쓴다 (구독 경로 그대로 태워서 잰다)');
  {
    //  검수사 2026-09-06 «시프팅 갯수가 스스로 줄어들었습니다. 96에서 94로» → «시프팅은 96이 맞을것입니다».
    //  ⛔ 감사(다른 클로드) 지적 — 첫 판의 검사는 `applyCatosPos`·`applyAutoSwap` 을 **한 번도 안 태우고** 쟀다.
    //     라이브 구독(firebase.fbSubscribeVoyages)은 그 둘을 연달아 태우므로, 안 태우고 재면 옆문이 열린 채 통과한다.
    //     여기서는 구독과 **같은 순서로** 태운 뒤 센다.
    const x = FX.MCSC_633N;
    const D = expand(x.d, 'pod'), L = expand(x.l, 'pol');
    const A = 'CAAU6532118';                       // 시프팅으로 잡히는 실제 컨
    const dest = L[A];                             // 그 컨의 선적(도착) 자리
    const p6 = (c) => String(c.bay).padStart(2, '0') + String(c.row).padStart(2, '0') + String(c.tier).padStart(2, '0');
    const base = () => ({ discharge: { ediContainers: { ...D } }, loading: { ediContainers: { ...L } },
                          info: { berthShift: x.bs } });
    const sub = (v) => U.applyAutoSwap(U.applyCatosPos(v));   // 구독이 태우는 순서 그대로

    //  ⛔ **문이 둘이면 조합도 둘이어야 한다**(3차 감사 지적 — 한 조합만 두고 다른 문을 «못 잰다»고 잘못 적었다).
    //     ① 실체(actual) 문 — «A 를 제 도착 자리에 실었다» → 게이트를 빼면 95 → **65**(A 가 목록에서 빠진다).
    //     ② 배정(assign) 문 — «A 를 남의 계획칸에 실었다» → 자동 맞교환이 돌고, 게이트를 빼면 95 → **66**.
    //     둘 다 걸어야 어느 문이 열려도 여기서 걸린다.
    //  ⓐ 배정 문 — 터미널이 «남의 계획칸에 실었다»고 말해 자동 맞교환 사슬이 생기는 조합.
    const HOLE = 'MRKU4002140', HOLE_AT = D['MSKU7177518'];   // 41-11-84 — 이 칸이 사슬을 만든다
    const vT = base(); vT.discharge.termWork = { [HOLE]: { at: 1, pos: p6(HOLE_AT) } };
    const mT = sub(vT);
    const gotPos = !!(mT.discharge.records && mT.discharge.records[HOLE] && mT.discharge.records[HOLE]._pos_src);
    ok(gotPos, '검사 전제 — 카토스 자리가 실제로 얹혔다(안 얹혔으면 아래는 헛 시험이다)');
    const autoN = Object.values(mT.discharge.records || {}).filter((r) => r && r._assign_src === 'autoswap').length;
    ok(autoN > 0, `검사 전제 — 자동 맞교환이 «정해 준 자리»를 실제로 만들었다(${autoN}건 — 0이면 옆문을 안 재는 것이다)`);
    const nT = Object.keys(U.computeShiftingFromVoyage(mT) || {}).length;
    ok(nT === 95, `카토스 자리 + 자동 맞교환을 다 태워도 95 그대로 (${nT} — 게이트를 빼면 66 이 나오는 조합이다)`);

    //  ⓑ 동방(pnct) 표식도 같다.
    const vP = base(); vP.discharge.termWork = { [HOLE]: { at: 1, pos: p6(HOLE_AT), src: 'pnct' } };
    const mP = sub(vP);
    const pMark = (mP.discharge.records && mP.discharge.records[HOLE] && mP.discharge.records[HOLE]._pos_src) || '';
    ok(pMark === 'pnct', `검사 전제 — 동방 표식이 실제로 붙었다(${pMark || '안 붙음'}) · applyCatosPos 가 읽는 필드는 src 다`);
    const nP = Object.keys(U.computeShiftingFromVoyage(mP) || {}).length;
    ok(nP === 95, `동방 자리도 95 그대로 (${nP})`);

    //  ⓒ 사람이 손으로 고친 자리는 **여전히** 반영된다(2.96 — 검수사 «5660은 내리고 2118은 남겼다» 그 길).
    //     재는 것은 대수가 아니라 «그 컨이 시프팅 목록에서 빠지는가»다 — 대수는 배정표 정본 분기가 갈려 흔들린다.
    const vH = base();
    vH.discharge.records = { [A]: { bay_actual: dest.bay, row_actual: dest.row, tier_actual: dest.tier, actual_by: '김성일' } };
    const mH = U.computeShiftingFromVoyage(vH) || {};
    ok(!mH[A], `${A} 는 사람이 고치면 시프팅에서 빠진다`);
    //     ⓒ 와 **같은 자리·같은 값**을 터미널이 말한 것으로만 바꿔 넣는다 — 이것이 실체 문을 재는 조합이다.
    //       (게이트를 빼면 여기서 65 가 되고 A 가 빠진다. 앞의 HOLE 조합은 배정 문만 잰다.)
    const vT2 = base(); vT2.discharge.termWork = { [A]: { at: 1, pos: p6(dest) } };
    const wT2 = sub(vT2);
    ok(!!(wT2.discharge.records && wT2.discharge.records[A] && wT2.discharge.records[A]._pos_src),
       '검사 전제 — 실체 문 조합에서도 카토스 자리가 실제로 얹혔다');
    const mT2 = U.computeShiftingFromVoyage(wT2) || {};
    ok(!!mT2[A], `${A} 는 터미널이 채운 자리로는 안 빠진다(같은 자리·같은 값인데 출처만 다르다)`);
    ok(Object.keys(mT2).length === 95, `실체 문 — 그 조합에서도 95 그대로 (${Object.keys(mT2).length} — 게이트를 빼면 65 가 되는 조합이다)`);

    //  ⓔ **실체 문 × 동방 표식** — ⓐ·ⓑ 는 배정 문 조합이라 실체 문에 난 pnct 구멍에 둔감하다(5차 감사 지적).
    //     게이트를 `_pos_src === 'catos'` 로 좁히는 회귀(3.16-01 재발)를 여기서 65 로 잡는다.
    const vE = base(); vE.discharge.termWork = { [A]: { at: 1, pos: p6(dest), src: 'pnct' } };
    const wE = sub(vE);
    ok(((wE.discharge.records && wE.discharge.records[A] && wE.discharge.records[A]._pos_src) || '') === 'pnct',
       '검사 전제 — 실체 문 조합에 동방 표식이 붙었다');
    const mE = U.computeShiftingFromVoyage(wE) || {};
    ok(!!mE[A] && Object.keys(mE).length === 95,
       `동방 표식도 실체 문에서 막힌다 — ${Object.keys(mE).length}대(95) · A 남음 (게이트를 catos 전용으로 좁히면 65 가 된다)`);

    //  ⓕ 소스 전수 — 문지기가 «자리를 고르는 그 자리»에 **두 짝 다** 서 있는가(규범 §4-4)
    const u = fs.readFileSync(path.resolve('src/utils.js'), 'utf8');
    ok(/const _fromTerm = !!r\._pos_src;/.test(u), '_mergeRecPos 에 터미널 출처 게이트가 있다');
    ok(/if \(!_fromTerm && r\.bay_actual/.test(u), '실체 자리(actual) 문에 게이트가 걸려 있다');
    ok(/_assign_src \|\| ''\) === 'autoswap'/.test(u) && /else if \(!_autoAssign && r\.bay_assign/.test(u),
       '정해 준 자리(assign) 문에도 게이트가 걸려 있다 — 자동 맞교환은 안 쓴다');
    ok(/if \(r && r\._pos_src\) \{/.test(u), "stripCatosPos 가 'catos'·'pnct' 를 가리지 않고 벗긴다");
    //  ⛔ 재감사 지적 — 파일 전체 정규식은 «어디에 있든» 통과시킨다(첫 판이 그래서 엉뚱한 함수에 든 것을 못 잡았다).
    //     사람이 자리를 고치는 길은 **두 함수**다. 둘 다 **제 본문 안에서** 표식을 걷는지 잰다.
    const fb = fs.readFileSync(path.resolve('src/firebase.js'), 'utf8');
    const body = (name) => {                       // 그 함수의 시작 ~ 다음 최상위 선언까지
      const i = fb.indexOf(name); if (i < 0) return '';
      const ends = [/\nexport /g, /\nasync function /g, /\nfunction /g].map((re) => {
        re.lastIndex = i + name.length; const m = re.exec(fb); return m ? m.index : fb.length;
      });
      return fb.slice(i, Math.min(...ends));
    };
    ok(/_pos_src: null,/.test(body('export async function fbSetActualPosition')),
       '컨 상세·베이 빈칸·수석 편집이 부르는 fbSetActualPosition 본문이 표식을 걷는다');
    ok(/patch\._pos_src = null;/.test(body('function _updatePositionFields')),
       '자리 재배정(_updatePositionFields) 본문도 표식을 걷는다');
  }

  console.log(fail ? `\n✗ 실패 ${fail}건` : '\n✓ 전부 통과');
  process.exit(fail ? 1 : 0);
})();
