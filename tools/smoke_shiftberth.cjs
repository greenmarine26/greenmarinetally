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

  console.log(fail ? `\n✗ 실패 ${fail}건` : '\n✓ 전부 통과');
  process.exit(fail ? 1 : 0);
})();
