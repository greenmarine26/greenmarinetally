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

  console.log(fail ? `\n✗ 실패 ${fail}건` : '\n✓ 전부 통과');
  process.exit(fail ? 1 : 0);
})();
