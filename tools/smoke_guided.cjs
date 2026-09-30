// 2.75 자동 가이드 — 양하 불가(보류)·해제·되묻기·트윈 싱글 전환 연막검사.
//   검수사 실측 2026-08-27: 자동 가이드가 그날 세 번 멈췄다 —
//     ① 베이 구조 오류(2.72 에서 수리) ② 콘이 잠겨 다음 컨을 먼저 내리다 멈춤 ③ 무게 때문에 싱글로 하니 못 씀.
//   검수사 확정: «콘 잠김은 길어야 1시간 이내. 보통은 컨테이너 3-5개 다른거 작업하고 있으면 라싱인력이 옵니다.»
//                «콘문제 해결후 양하불가 해제를 누르면 바로 앞순서로 진행 이어가면 되게.»
//                «캐빈결정. 보통은 갱을 피해서 먼쪽부터.»
const path = require('path');
const fs = require('fs');
const GQ = require(path.resolve(process.argv[2]));   // guidedQueue 번들
const CA = require(path.resolve(process.argv[3]));   // chiefAnswers 번들
const ROOT = process.argv[4] || process.cwd();
let bad = 0; const T = (ok, why) => { if (!ok) { bad++; console.error('  ✗ ' + why); } };
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

//  ── 큐: 해제한 컨이 바로 앞 순서로 ──
const cs = [
  { cn: 'AAAU1000001', bay: '10', row: '10', tier: '88', iso: '22GP' },
  { cn: 'BBBU1000002', bay: '14', row: '10', tier: '88', iso: '22GP' },
  { cn: 'CCCU1000003', bay: '18', row: '10', tier: '88', iso: '22GP' },
];
const mk = (extra) => GQ.buildGuidedQueue(Object.assign({ containers: cs, mode: 'discharge', evenRowsSeaSide: false }, extra || {}));
const cns = (q) => q.map((c) => c.main.cn).join(',');
const base = cns(mk());
T(base === 'AAAU1000001,BBBU1000002,CCCU1000003', `기본 순서가 바뀌었다 (${base})`);
T(cns(mk({ frontCns: ['CCCU1000003'] })) === 'CCCU1000003,AAAU1000001,BBBU1000002', '해제한 컨이 맨 앞으로 안 온다');
T(cns(mk({ frontCns: ['ZZZU9999999'] })) === base, '없는 컨을 지정했는데 순서가 흔들린다');
T(cns(mk({ frontCns: [] })) === base, '빈 목록에 순서가 흔들린다');
T(cns(mk({ frontCns: null })) === base, '지정이 없으면 종전과 같아야 한다');
//  ⚠ 순서 규칙 자체는 안 건드린다 — 맨 앞으로 끌어온 뒤 나머지 상대 순서는 그대로
T(cns(mk({ frontCns: ['BBBU1000002'] })) === 'BBBU1000002,AAAU1000001,CCCU1000003', '나머지 상대 순서가 흐트러졌다');
//  ── 3.3 양하 «해상부터»(rowFrom) — NSDC 2608N 실데이터(tools/fixtures/hatch_nsdc.json, 우현 접안 = 짝수 로우 해상쪽) ──
//     10번 88단 평택분은 전부 육상쪽(홀수·00) 로우, 22번 86단 평택분은 전부 해상쪽(짝수) 로우 — 실제 배치 그대로.
{
  const FX = require(path.resolve(ROOT, 'tools/fixtures/hatch_nsdc.json'));
  const gOf = (b) => { b = parseInt(b, 10); return b % 2 === 0 ? b : (((b + 1) % 4 === 2) ? b + 1 : b - 1); };
  const pick = (grp, tier) => Object.values(FX.ediContainers).filter((c) => c.pod === 'KRPTK' && gOf(c.bay) === grp && c.tier === tier);
  const rows = (q) => q.map((c) => parseInt(c.main.row, 10)).join(',');
  const run = (cs, extra) => rows(GQ.buildGuidedQueue(Object.assign({ containers: cs, mode: 'discharge', evenRowsSeaSide: true }, extra || {})));
  const d10 = pick(10, '88'), d22 = pick(22, '86');
  T(d10.length === 6 && d22.length === 5, `실데이터 대수가 다르다 (10/88=${d10.length}, 22/86=${d22.length})`);
  T(run(d10) === '9,7,5,3,1,0', `10번 88단 육상부터 = 바깥 홀수→안쪽→00 (${run(d10)})`);
  T(run(d10, { rowFrom: 'sea' }) === '0,1,3,5,7,9', `10번 88단 해상부터 = 00→안쪽 홀수→바깥 (${run(d10, { rowFrom: 'sea' })})`);
  T(run(d22) === '2,4,6,8,10', `22번 86단 육상부터 = 안쪽 짝수→바깥 (${run(d22)})`);
  T(run(d22, { rowFrom: 'sea' }) === '10,8,6,4,2', `22번 86단 해상부터 = 바깥 짝수→안쪽 (${run(d22, { rowFrom: 'sea' })})`);
  T(run(d22, { rowFrom: 'land' }) === run(d22) && run(d22, { rowFrom: null }) === run(d22), 'rowFrom:land·null 은 종전과 같다');
  //  선적은 무관 — rowFrom 을 줘도 종전(해상→육상) 그대로
  const lod = (extra) => rows(GQ.buildGuidedQueue(Object.assign({ containers: d22, mode: 'loading', evenRowsSeaSide: true }, extra || {})));
  T(lod() === lod({ rowFrom: 'sea' }), `선적 순서는 rowFrom 과 무관해야 한다 (${lod()} / ${lod({ rowFrom: 'sea' })})`);
  //  매뉴얼·기능 사전에 새 칩이 있다(0-B)
  T(/⇄ 해상부터/.test(rd('src/data/helpData.js')), '매뉴얼에 [⇄ 해상부터] 칩이 없다');
  T(/⇄ 육상부터 \/ ⇄ 해상부터/.test(rd('src/data/featureIndex.js')), '기능 사전에 육상부터/해상부터 항목이 없다');
}

//  ── 3.72-01 선적 큐 — 도착항(POD)이 섞인 베이에서 바닥 칸이 있는 묶음부터, 같은 열은 아래 칸이 먼저 ──
//     검수사 2026-09-30 ATPR 2644W «28번베이 작업시작을 누르면 6585부터 나온다 — WEI 가 바닥인데 DLC 부터».
//     실데이터 tools/fixtures/atpr_2644W_loading_plan.json(RTDB voyages/ATPR_2644W/loading/ediContainers · 372대 · 2026-09-30 19:20 KST).
//     28베이 = 40피트 엠티 36대 · 갑판 전용(티어 80~88) · 80~86단 열 1~6 은 WEI 리퍼(24대) + 88단 열 1 리퍼 · 84~88단 열 7·8 과 88단 열 2~8 은 DLC 일반 엠티(11대).
{
  const PL = require(path.resolve(ROOT, 'tools/fixtures/atpr_2644W_loading_plan.json'));
  const all = Object.values(PL.ediContainers);
  const b28 = all.filter((c) => parseInt(c.bay, 10) === 28);
  T(all.length === 372 && b28.length === 36, `실데이터 대수가 다르다 (전체 ${all.length}, 28베이 ${b28.length})`);
  const lod = (cs) => GQ.buildGuidedQueue({ containers: cs, mode: 'loading', evenRowsSeaSide: true, findTwin: null, streamPref: null, frontCns: null, rowFrom: null });
  const l4 = (q) => q.map((c) => c.main.cn.slice(-4)).join(',');
  const podSeq = (q) => q.map((c) => c.main.pod);
  const cellOf = (c) => `${parseInt(c.bay, 10)}-${c.row}-${c.tier}`;
  // 같은 열(로우)에서 위 칸이 아래 칸보다 먼저 나오는 쌍 — 28베이는 갑판 전용이라 단 구분이 필요 없다
  const inversions = (q) => { let n = 0; for (let i = 0; i < q.length; i++) for (let j = i + 1; j < q.length; j++) { const a = q[i].main, b = q[j].main; if (a.row === b.row && parseInt(b.tier, 10) < parseInt(a.tier, 10)) n++; } return n; };
  const orders = { '보관소 키(컨번호 알파벳) 순': b28, '반대 순': [...b28].reverse(), '티어 낮은 순': [...b28].sort((a, b) => parseInt(a.tier, 10) - parseInt(b.tier, 10)), '티어 높은 순': [...b28].sort((a, b) => parseInt(b.tier, 10) - parseInt(a.tier, 10)) };
  const base = l4(lod(b28));
  for (const [nm, arr] of Object.entries(orders)) {
    const q = lod(arr);
    T(q.length === 36, `${nm} — 28베이 카드 수가 36이 아니다 (${q.length})`);
    T(cellOf(q[0].main) === '28-06-80' && q[0].main.cn.endsWith('3458'), `${nm} — 28베이 첫 카드가 WEI 리퍼 28-06-80(…3458)이 아니다 (${cellOf(q[0].main)} …${q[0].main.cn.slice(-4)}) — 검수사가 본 6585 부터 나오던 그 병`);
    T(!q.slice(0, 25).some((c) => c.main.cn.endsWith('6585')) && q.findIndex((c) => c.main.cn.endsWith('6585')) >= 25, `${nm} — 6585(DLC 84단 열 08)가 WEI 24대 앞에 나온다`);
    T(inversions(q) === 0, `${nm} — 같은 열에서 위 칸이 아래 칸보다 먼저 나온다 (${inversions(q)}쌍) — 허공 적재`);
    const ps = podSeq(q);
    T(ps.slice(0, 25).every((p) => p === 'CNWEI') && ps.slice(25).every((p) => p === 'CNDLC'), `${nm} — 도착항 묶음이 WEI 25 → DLC 11 이 아니다 (묶음 순서·묶음 유지)`);
    T(l4(q) === base, `${nm} — 배열 순서에 따라 큐가 달라진다(자료 배열 순서가 순서를 정하면 안 된다)`);
  }
  //  티어 80 의 열 순서는 터미널 실제(2641W~2643W 실제 자리) 그대로 6→4→2→1→3→5
  const q0 = lod(b28);
  T(q0.slice(0, 6).map((c) => c.main.row).join(',') === '06,04,02,01,03,05' && q0.slice(0, 6).every((c) => c.main.tier === '80'), '80단 열 순서가 6,4,2,1,3,5 가 아니다(터미널 실제 순서)');
  T(q0.slice(6, 12).map((c) => c.main.row).join(',') === '06,04,02,01,03,05' && q0.slice(6, 12).every((c) => c.main.tier === '82'), '82단이 바로 이어 6,4,2,1,3,5 로 나오지 않는다');
  const dlcT = q0.slice(25).map((c) => parseInt(c.main.tier, 10));
  T(dlcT.length === 11 && dlcT.every((t, i) => i === 0 || t >= dlcT[i - 1]) && q0[25].main.cn.endsWith('6585'), `DLC 11대가 WEI 뒤에 아래 티어부터 이어 나오지 않는다 (${dlcT.join(',')} · 첫 …${q0[25].main.cn.slice(-4)})`);
  //  전 베이(실데이터 372대) — 베이·단마다 같은 열 종속 위반 0, 카드 수 보존, 배열 순서와 무관
  const dk = (t) => parseInt(t, 10) >= 80;
  let badInv = 0, badN = 0, badOrd = 0, groups = 0;
  const byBay = {};
  for (const c of all) (byBay[`${parseInt(c.bay, 10)}|${dk(c.tier) ? 'd' : 'h'}`] ||= []).push(c);
  for (const [k, arr] of Object.entries(byBay)) {
    groups++;
    const q = lod(arr), qr = lod([...arr].reverse());
    if (q.length !== arr.length) badN++;
    let inv = 0; for (let i = 0; i < q.length; i++) for (let j = i + 1; j < q.length; j++) { const a = q[i].main, b = q[j].main; if (a.row === b.row && parseInt(b.tier, 10) < parseInt(a.tier, 10)) inv++; }
    badInv += inv;
    if (l4(q) !== l4(qr)) badOrd++;
  }
  T(groups === 23, `베이·단 무리 수가 23이 아니다 (${groups}) — 실데이터 372대는 베이·단 23무리`);
  T(badN === 0, `카드가 사라지거나 늘었다 (${badN}무리)`);
  T(badInv === 0, `전 베이 중 같은 열 종속 위반이 있는 무리가 있다 (${badInv}쌍)`);
  T(badOrd === 0, `배열을 뒤집으면 큐가 달라지는 무리가 있다 (${badOrd}무리) — 도착항 묶음 순서가 배열 순서에 매여 있다`);
  //  같은 베이가 도착항 하나뿐이면 종전과 같아야 한다 — 베이 3(DLC 30대 전부)은 물리 순서 그대로(홀드 → 데크, 아래 티어부터)
  const b3 = all.filter((c) => parseInt(c.bay, 10) === 3);
  const q3 = lod(b3);
  T(q3.length === 30 && b3.every((c) => c.pod === 'CNDLC'), `베이 3 실데이터가 다르다 (${q3.length})`);
  const holdEnd = q3.findIndex((c) => dk(c.main.tier));
  T(holdEnd > 0 && q3.slice(0, holdEnd).every((c) => !dk(c.main.tier)) && q3.slice(holdEnd).every((c) => dk(c.main.tier)), '단일 도착항 베이 3 — 홀드가 데크보다 먼저가 아니다');
  //  실데이터 — 도착항이 섞인 다른 두 무리(MCAT 630N 10번 홀드 · OBWH 2729E 18번 데크). 바닥 티어 묶음을 먼저 세워도 남는 종속 위반은 enforceBelowFirst 가 끊는다
  //    (전 항차 실데이터 250항차 3,262무리 중 바닥 순위만으로는 114무리에 위반이 남았다 — 이 둘은 그 안의 실제 무리).
  {
    const MX = require(path.resolve(ROOT, 'tools/fixtures/loading_mixedpod_real.json'));
    const twinOf = (t, all, used) => { const b = parseInt(t.bay, 10); if (b % 2 === 0) return null; const pb = (b % 4 === 1) ? b + 2 : b - 2; return all.find((o) => !used.has(o.cn) && o.cn !== t.cn && parseInt(o.bay, 10) === pb && o.row === t.row && o.tier === t.tier && String(o.iso || '')[0] === '2') || null; };
    const dkT = (t) => parseInt(t, 10) >= 80;
    const poss = (c) => (c.twin ? [c.main, c.twin] : [c.main]);
    const sameStack = (a, b) => { if (a.row !== b.row) return false; const x = parseInt(a.bay, 10), y = parseInt(b.bay, 10); return x === y || x % 2 === 0 || y % 2 === 0; };
    const invs = (q) => { let n = 0; for (let i = 0; i < q.length; i++) for (let j = i + 1; j < q.length; j++) { const a = q[i], b = q[j]; if (dkT(a.main.tier) !== dkT(b.main.tier)) continue; if (poss(a).some((p) => poss(b).some((o) => sameStack(p, o) && parseInt(o.tier, 10) < parseInt(p.tier, 10)))) n++; } return n; };
    const runX = (cs) => GQ.buildGuidedQueue({ containers: cs, mode: 'loading', evenRowsSeaSide: true, findTwin: twinOf, streamPref: null, frontCns: null, rowFrom: null });
    for (const [nm, arr] of Object.entries(MX).filter(([k]) => k[0] !== '_')) {
      const q = runX(arr), n2 = q.reduce((n, c) => n + 1 + (c.twin ? 1 : 0), 0);
      T(n2 === arr.length, `${nm} — 카드에 담긴 컨 수가 ${arr.length}이 아니다 (${n2})`);
      T(invs(q) === 0, `${nm} — 같은 열에서 위 칸이 아래 칸보다 먼저 나온다 (${invs(q)}쌍) — 허공 적재`);
      T(invs(runX([...arr].reverse())) === 0, `${nm} — 배열을 뒤집으면 종속 위반이 생긴다`);
      //  배열 순서 무관 — 뒤집기·컨번호순·고정 씨앗 섞기 6회가 전부 같은 큐(여러 베이가 섞인 무리에서도 — 종전 비교가 순환해 배열 순서가 큐를 정하던 병)
      const keyQ = (q) => q.map((c) => c.main.cn + (c.twin ? '+' + c.twin.cn : '')).join();
      let sd = 20260930; const rnd = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };
      const shuf = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      const baseKey = keyQ(runX(arr));
      const perms = [[...arr].reverse(), [...arr].sort((a, b) => (a.cn < b.cn ? -1 : 1)), shuf(arr), shuf(arr), shuf(arr), shuf(arr)];
      T(perms.every((pm) => keyQ(runX(pm)) === baseKey), `${nm} — 자료 배열 순서에 따라 큐가 달라진다(정렬이 배열 순서에 매여 있다)`);
      //  ATPR 28베이 데크 — WEI 리퍼가 바닥(티어 80 에 WEI·DLC 둘 다 칸이 있어도 WEI 위에 DLC 가 얹힘)이라 WEI 부터, WEI→DLC 한 번만 바뀐다
      if (/^ATPR_/.test(nm)) {
        const q1 = runX(arr), sw1 = q1.filter((c, i) => i > 0 && c.main.pod !== q1[i - 1].main.pod).length;
        T(q1[0].main.pod === 'CNWEI' && sw1 === 1, `${nm} — 28베이 첫 카드가 WEI 가 아니거나 도착항 전환이 1회가 아니다 (첫 ${q1[0].main.pod} · 전환 ${sw1}회) — 바닥이 같을 때 도착항 코드 순으로 정하면 DLC 부터 나온다(2633E·2639W·2640W)`);
      }
    }
  }
  //  합성 — 바닥 순위가 같아(둘 다 80단) 도착항 묶음이 위 칸을 먼저 세우는 경우: 다른 도착항이 깔린 열의 위 칸은 그 아래가 나간 뒤에야 나온다
  {
    const mk2 = (cn, row, tier, pod) => ({ cn, bay: '28', row, tier, iso: '45G1', tp: "40'HC", fe: 'E', pod });
    const s2 = [mk2('AAAU2000001', '02', '80', 'P1'), mk2('AAAU2000002', '01', '84', 'P1'), mk2('AAAU2000003', '01', '80', 'P2'), mk2('AAAU2000004', '01', '82', 'P2'), mk2('AAAU2000005', '03', '80', 'P2')];
    const q2 = GQ.buildGuidedQueue({ containers: s2, mode: 'loading', evenRowsSeaSide: true, findTwin: null, streamPref: null, frontCns: null, rowFrom: null });
    const pos2 = (n) => q2.findIndex((c) => c.main.cn.endsWith(n));
    T(q2.length === 5, `합성2 — 카드 수가 5가 아니다 (${q2.length})`);
    T(pos2('3') < pos2('4') && pos2('4') < pos2('2'), `합성2 — 열 1 이 80→82→84 순서가 아니다 (${q2.map((c) => c.main.cn.slice(-1) + ':' + c.main.tier).join(' ')})`);
    //  P1·P2 모두 바닥 티어 80 인데 열 1 에서 P1 84 가 P2 80·82 위에 얹혀 있다 → 밑에 깔린 P2 가 먼저 선다(P1 이 코드 순으로 앞서는데도).
    T(q2.slice(0, 3).map((c) => c.main.pod).join() === 'P2,P2,P2' && q2.slice(3).map((c) => c.main.pod).join() === 'P1,P1', `합성2 — 밑에 깔린 P2 묶음이 먼저 서지 않는다 (${q2.map((c) => c.main.pod + c.main.cn.slice(-1)).join(' ')}) — 도착항 코드 순으로 정하면 위 칸이 아래 칸을 기다리며 두 묶음이 번갈아 나온다`);
  }
  //  합성 — 도착항 묶음은 살아 있다: 서로 다른 열이면 낮은 티어가 없는 묶음도 그대로 이어서 낸다(종속만 없으면 묶음이 우선)
  const mk = (cn, row, tier, pod) => ({ cn, bay: '28', row, tier, iso: '45G1', tp: "40'HC", fe: 'E', pod });
  const syn = [mk('AAAU1000001', '01', '80', 'P2'), mk('AAAU1000002', '01', '82', 'P2'), mk('AAAU1000003', '02', '80', 'P1'), mk('AAAU1000004', '02', '82', 'P1'), mk('AAAU1000005', '03', '80', 'P2'), mk('AAAU1000006', '03', '82', 'P1')];
  const qs = lod(syn).map((c) => c.main.cn.slice(-1) + ':' + c.main.pod);
  //  P1·P2 모두 가장 낮은 티어 80 → 다음은 «남의 칸 밑에 깔린 쪽 먼저»: 열 3 에서 P1 82(6)가 P2 80(5) 위에 얹혀 있으므로 P2 가 먼저(P2 는 밑, P1 은 위).
  //  P2 묶음(80단 열 1→3, 이어 82단 열 1) 다음 P1 묶음(열 2 의 80→82, 열 3 의 82) — 묶음이 유지되면서 종속(5 → 6)도 지킨다.
  T(qs.join(' ') === '1:P2 5:P2 2:P2 3:P1 4:P1 6:P1', `합성 — 묶음이 유지되면서 종속을 지키는 순서가 아니다 (${qs.join(' ')})`);
  T(lod([...syn].reverse()).map((c) => c.main.cn.slice(-1) + ':' + c.main.pod).join(' ') === qs.join(' '), '합성 — 배열을 뒤집으면 순서가 달라진다(동률은 물리로 정한다)');
  const idx = (n) => lod(syn).findIndex((c) => c.main.cn.endsWith(n));
  T(idx('5') < idx('6'), '합성 — 열 3 에서 위(P1 82)가 아래(P2 80)보다 먼저 나온다');

  //  ── 진행 시험 — 화면은 카드를 하나 끝낼 때마다 «남은 컨»으로 큐를 다시 만든다. 도착항 순위가 남은 컨으로 재면 바닥 묶음이 빈 순간 뒤집혀
  //     WEI→DLC→WEI 로 쪼개진다(감사 실측 28베이 6회). 완료 컨을 포함한 전체 계획(planAll)으로 재므로 진행 중에도 정적 큐와 같아야 한다.
  const twinOf3 = (t, arr, used) => { const b = parseInt(t.bay, 10); if (b % 2 === 0) return null; const pb = (b % 4 === 1) ? b + 2 : b - 2; return arr.find((o) => !used.has(o.cn) && o.cn !== t.cn && parseInt(o.bay, 10) === pb && o.row === t.row && o.tier === t.tier && String(o.iso || '')[0] === '2') || null; };
  const build3 = (cs, plan) => GQ.buildGuidedQueue({ containers: cs, mode: 'loading', evenRowsSeaSide: true, findTwin: twinOf3, streamPref: null, frontCns: null, rowFrom: null, planAll: plan });
  const progress = (arr) => { let rem = [...arr]; const seq = []; while (rem.length) { const q = build3(rem, arr); if (!q.length) { seq.push(null); break; } const c = q[0]; seq.push(c); const gone = new Set([c.main.cn, c.twin && c.twin.cn].filter(Boolean)); rem = rem.filter((x) => !gone.has(x.cn)); } return seq; };
  const posOf = (c) => (c.twin ? [c.main, c.twin] : [c.main]);
  const stackSame = (a, b) => { if (a.row !== b.row) return false; const x = parseInt(a.bay, 10), y = parseInt(b.bay, 10); return x === y || x % 2 === 0 || y % 2 === 0; };
  const seqInv = (seq) => { let n = 0; for (let i = 0; i < seq.length; i++) for (let j = i + 1; j < seq.length; j++) { const a = seq[i], b = seq[j]; if (parseInt(a.main.tier, 10) >= 80 !== (parseInt(b.main.tier, 10) >= 80)) continue; if (posOf(a).some((p) => posOf(b).some((o) => stackSame(p, o) && parseInt(o.tier, 10) < parseInt(p.tier, 10)))) n++; } return n; };
  const podSwitches = (seq) => { let n = 0; for (let i = 1; i < seq.length; i++) if (seq[i].main.pod !== seq[i - 1].main.pod) n++; return n; };
  {
    const ps28 = progress(b28), st28 = build3(b28, b28);
    T(!ps28.includes(null) && ps28.length === 36, `28베이 진행 시험 — 카드가 36장 다 나오지 않고 멈췄다 (${ps28.length})`);
    T(ps28[0] && ps28[0].main.cn.endsWith('3458'), `28베이 진행 시험 — 첫 카드가 …3458 이 아니다`);
    T(ps28.map((c) => c && c.main.cn).join() === st28.map((c) => c.main.cn).join(), '28베이 진행 시험 — 진행하며 다시 만든 순서가 처음 큐와 다르다(카드를 끝낼 때마다 순서가 흔들린다)');
    T(podSwitches(ps28) === 1, `28베이 진행 시험 — 도착항 전환이 1회가 아니다 (${podSwitches(ps28)}회) — WEI 25 → DLC 11 이 진행 중에도 이어져야 한다`);
    T(seqInv(ps28) === 0, '28베이 진행 시험 — 진행 순서에 같은 열 위 칸이 아래 칸보다 먼저 나온 쌍이 있다');
    //  planAll 을 넘기지 않는 호출부가 생기면 이 시험이 잡는다 — 남은 컨으로만 재면 도착항 전환이 1회가 아니게 된다
    const noPlan = (() => { let rem = [...b28]; const seq = []; while (rem.length) { const q = GQ.buildGuidedQueue({ containers: rem, mode: 'loading', evenRowsSeaSide: true, findTwin: null, streamPref: null, frontCns: null, rowFrom: null }); const c = q[0]; seq.push(c); rem = rem.filter((x) => x.cn !== c.main.cn); } return seq; })();
    T(seqInv(noPlan) === 0, `planAll 없이도 종속은 지켜야 한다 (${seqInv(noPlan)}쌍)`);
    //  호출부 핀 — planAll 을 빼면 진행 중 순위가 흔들린다(위 진행 시험은 planAll 을 넘겨야 통과). 화면·미르 두 호출부가 같은 전체 계획을 넘기는지 원문으로 못 박는다.
    T(/planAll: modeAll,/.test(rd('src/components/GuidedWorkPanel.jsx')) && /\[remaining, modeAll,/.test(rd('src/components/GuidedWorkPanel.jsx')), 'GuidedWorkPanel 이 buildGuidedQueue 에 planAll: modeAll 을 넘기지 않는다(진행 중 도착항 순위가 흔들린다)');
    T(/planAll: all\.filter\(\(c\) => c && c\._ptk !== false && \(c\._mode \|\| mode\) === mode && c\.bay\),/.test(rd('src/mir.js')), 'mir.js 가 buildGuidedQueue 에 전체 계획(planAll)을 넘기지 않는다(화면과 순서가 갈린다)');
  }
  //  전 베이·단 23무리를 끝까지 진행 — 멈춤 0, 카드 수 보존, 종속 위반 0
  {
    let stuck = 0, lost = 0, invSum = 0;
    for (const arr of Object.values(byBay)) { const sq = progress(arr); if (sq.includes(null)) stuck++; const n2 = sq.filter(Boolean).reduce((n, c) => n + 1 + (c.twin ? 1 : 0), 0); if (n2 !== arr.length) lost++; invSum += seqInv(sq.filter(Boolean)); }
    T(stuck === 0, `전 베이 진행 시험 — 진행 중 큐가 비어 멈춘 무리가 있다 (${stuck})`);
    T(lost === 0, `전 베이 진행 시험 — 진행하며 카드가 사라지거나 늘었다 (${lost}무리)`);
    T(invSum === 0, `전 베이 진행 시험 — 진행 순서에 종속 위반이 있다 (${invSum}쌍)`);
  }
  //  실데이터 혼합 도착항 무리(MCAT 630N 10번 홀드 · OBWH 2729E 18번 데크)도 끝까지 진행 — 종속 위반 0
  {
    const MX2 = require(path.resolve(ROOT, 'tools/fixtures/loading_mixedpod_real.json'));
    for (const [nm, arr] of Object.entries(MX2).filter(([k]) => k[0] !== '_')) {
      const sq = progress(arr), okAll = !sq.includes(null);
      T(okAll && sq.reduce((n, c) => n + 1 + (c.twin ? 1 : 0), 0) === arr.length, `${nm} — 진행 시험 중 카드가 다 나오지 않았다`);
      T(okAll && seqInv(sq) === 0, `${nm} — 진행 시험에서 같은 열 위 칸이 아래 칸보다 먼저 나왔다`);
      //  ATPR 28베이 데크(단일 베이·40ft 엠티)는 진행하며 다시 만든 순서가 처음 큐와 같아야 한다 — 도착항 순위가 진행 중 뒤집히지 않는다
      if (/^ATPR_/.test(nm)) T(okAll && sq.map((c) => c.main.cn).join() === build3(arr, arr).map((c) => c.main.cn).join(), `${nm} — 진행하며 다시 만든 순서가 처음 큐와 다르다(카드를 끝낼 때마다 순서가 흔들린다)`);
    }
  }

  //  ── 합성: 3.72-01 보정이 닿는 다른 경로들 ──
  const cardsOf = (q) => q.reduce((n, c) => n + 1 + (c.twin ? 1 : 0), 0);
  const mk3 = (cn, bay, row, tier, pod, extra) => Object.assign({ cn, bay, row, tier, iso: '22G1', tp: "20'GP", fe: 'E', pod }, extra || {});
  //  (a) 홀드 20ft 싱글 무리(pureSingles) — P1 이 바닥(열 2 티어 02)을 가져 먼저 서지만 그 열 1 의 티어 06 은 P2 의 티어 04(열 1) 위라 P2 뒤에 온다
  {
    const s3 = [mk3('SSSU3000001', '05', '02', '02', 'P1'), mk3('SSSU3000002', '05', '01', '06', 'P1'), mk3('SSSU3000003', '05', '01', '04', 'P2')];
    const q = build3(s3, s3), seq = q.map((c) => c.main.cn.slice(-1));
    T(cardsOf(q) === 3 && seq.indexOf('3') < seq.indexOf('2'), `합성(싱글) — 열 1 에서 위 싱글(…2, 티어 06)이 아래 싱글(…3, 티어 04)보다 먼저 나온다 (${seq.join('')})`);
    T(seqInv(q) === 0, '합성(싱글) — 종속 위반이 있다');
  }
  //  (b) FR·OT 무리(pureFrs) — 마지막에 나오는 FR 안에서도 같은 열은 아래 칸이 먼저(P1 이 바닥 80 을 가져 먼저 서지만 열 1 의 84 는 P2 의 82 위)
  {
    const f3 = [mk3('FFFU3000001', '28', '02', '80', 'P1', { iso: '45U1', tp: "40'OT", fe: 'E', ot: true }), mk3('FFFU3000002', '28', '01', '84', 'P1', { iso: '45U1', tp: "40'OT", fe: 'E', ot: true }), mk3('FFFU3000003', '28', '01', '82', 'P2', { iso: '45U1', tp: "40'OT", fe: 'E', ot: true })];
    const q = build3(f3, f3), seq = q.map((c) => c.main.cn.slice(-1));
    T(cardsOf(q) === 3 && seq.indexOf('3') < seq.indexOf('2'), `합성(FR·OT) — 열 1 에서 위(…2, 84단)가 아래(…3, 82단)보다 먼저 나온다 (${seq.join('')})`);
  }
  //  (c) 트윈 + 사이 짝수 베이 40ft — 트윈(05·07 베이 열 1 티어 06)은 그 아래 40ft(06 베이 티어 04)와 트윈(티어 02)이 나간 뒤에 나온다.
  //      같은 5베이에서 도착항 순위(P1 이 낮은 티어 02 를 가짐)가 트윈(티어 06)을 티어 02 트윈보다 앞세우는 경로 — 순환 비교가 종속을 못 지키던 자리
  {
    const t3 = [
      mk3('TTTU3000001', '05', '02', '02', 'P1'),                                        // P1 의 바닥(열 2) — P1 순위를 0 으로
      mk3('TTTU3000002', '05', '01', '06', 'P1'), mk3('TTTU3000003', '07', '01', '06', 'P1'),   // 트윈(티어 06) P1
      mk3('TTTU3000004', '05', '01', '02', 'P2'), mk3('TTTU3000005', '07', '01', '02', 'P2'),   // 트윈(티어 02) P2 — 트윈 아래 바닥
      mk3('TTTU3000006', '06', '01', '04', 'P3', { iso: '45G1', tp: "40'HC" }),                // 사이 짝수 베이 40ft(티어 04)
      mk3('TTTU3000007', '07', '02', '02', 'P1'),                                        // 열 2 의 짝 싱글
    ];
    const q = build3(t3, t3);
    const at = (cn) => q.findIndex((c) => c.main.cn === cn || (c.twin && c.twin.cn === cn));
    T(cardsOf(q) === 7, `합성(트윈+40ft) — 카드에 담긴 컨이 7이 아니다 (${cardsOf(q)})`);
    T(at('TTTU3000004') < at('TTTU3000006') && at('TTTU3000006') < at('TTTU3000002'), `합성(트윈+40ft) — 열 1 이 티어 02 → 04 → 06 순서가 아니다 (${q.map((c) => c.main.cn.slice(-1) + (c.twin ? '+' + c.twin.cn.slice(-1) : '') + ':' + c.main.tier).join(' ')})`);
    T(seqInv(q) === 0, '합성(트윈+40ft) — 종속 위반이 있다');
    T(build3([...t3].reverse(), t3).map((c) => c.main.cn).join() === q.map((c) => c.main.cn).join() || seqInv(build3([...t3].reverse(), t3)) === 0, '합성(트윈+40ft) — 배열을 뒤집으면 종속이 깨진다');
  }
  //  (d) 도착항 라벨은 베이가 다를 때 순서에 영향이 없다 — 도착항이 한 가지뿐인 베이들만 모으면 라벨을 떼도 큐가 같다(같은 베이 안에서만 묶는다)
  {
    const perBayPods = {};
    for (const c of all) (perBayPods[`${parseInt(c.bay, 10)}|${dk(c.tier) ? 'd' : 'h'}`] ||= new Set()).add(c.pod);
    const oneOnly = all.filter((c) => perBayPods[`${parseInt(c.bay, 10)}|${dk(c.tier) ? 'd' : 'h'}`].size === 1);
    const stripped = oneOnly.map((c) => Object.assign({}, c, { pod: '' }));
    const pods = new Set(oneOnly.map((c) => c.pod));
    T(oneOnly.length > 100 && pods.size >= 2, `단일 도착항 베이 모음이 이상하다 (${oneOnly.length}대 · 도착항 ${pods.size})`);
    T(l4(lod(oneOnly)) === l4(lod(stripped)), '도착항이 한 가지뿐인 베이들만 모았는데 도착항 라벨이 순서를 바꾼다 — 같은 베이 안에서만 묶어야 한다');
  }
  //  (g) 바닥 티어도 같고 서로 깔린 관계도 없으면(다른 열) 도착항 코드 순 — 배열 순서가 아니라 코드가 정한다
  {
    const c3 = [mk3('CCCU3000001', '28', '02', '80', 'P2', { iso: '45G1', tp: "40'HC" }), mk3('CCCU3000002', '28', '01', '80', 'P1', { iso: '45G1', tp: "40'HC" })];
    const a = build3(c3, c3).map((c) => c.main.pod).join(), b = build3([...c3].reverse(), c3).map((c) => c.main.pod).join();
    T(a === 'P1,P2' && b === 'P1,P2', `합성(동률) — 바닥·깔림이 같으면 도착항 코드 순(P1 먼저)이어야 한다 (${a} / ${b})`);
  }
  //  (h) 종속은 같은 베이거나 짝수 베이(40ft)가 걸친 열에서만 — 서로 다른 홀수 베이(5·9)의 같은 열은 종속이 아니다.
  //      5베이 P1(열 2 티어 02 · 열 1 티어 06)이 도착항 묶음으로 P2(열 3 티어 02)를 앞서면 P1 열 1 티어 06 이 9베이 열 1 티어 04 보다 먼저 나와야 한다(종속 아님).
  {
    const h3 = [mk3('HHHU3000001', '05', '02', '02', 'P1'), mk3('HHHU3000002', '05', '01', '06', 'P1'), mk3('HHHU3000003', '05', '03', '02', 'P2'), mk3('HHHU3000004', '09', '01', '04', 'P3')];
    const seq = build3(h3, h3).map((c) => c.main.cn.slice(-1)).join('');
    T(seq === '1243', `합성(다른 홀수 베이) — 기대 순서 1243(5베이 P1 묶음 1·2 → 9베이 4 → P2 3)이 아니다 (${seq}) — 서로 다른 홀수 베이는 같은 스택이 아니라 5베이 P1 묶음이 9베이 낮은 칸을 기다리면 안 된다`);
  }
  //  (i) 종속이 트윈의 둘째 자리(7베이)로만 걸리는 경우 — 트윈 T(5+7베이 열 1 티어 06, P1)가 도착항 묶음으로 P2 트윈 M(열 3 티어 02) 자리를 차지해 앞서 나가도,
  //      7베이 열 1 티어 04 의 20ft(S)가 먼저 나가야 한다(T 의 둘째 자리 밑). S 는 40ft U(6베이 열 1 티어 02) 위라 싱글 우선에서도 빠진다.
  {
    const i3 = [
      mk3('IIIU3000001', '06', '01', '02', 'P9', { iso: '45G1', tp: "40'HC" }),                                   // U — 6베이 40ft(열 1 티어 02)
      mk3('IIIU3000002', '07', '01', '04', 'P8'),                                                              // S — 7베이 20ft(열 1 티어 04), U 위라 싱글 우선에서 빠져 본체 흐름에 남는다
      mk3('IIIU3000003', '05', '01', '06', 'P1'), mk3('IIIU3000004', '07', '01', '06', 'P1'),                  // T — 5+7 트윈(열 1 티어 06)
      mk3('IIIU3000005', '05', '03', '02', 'P2'), mk3('IIIU3000006', '07', '03', '02', 'P2'),                  // M — 5+7 트윈(열 3 티어 02)
      mk3('IIIU3000007', '05', '02', '02', 'P1'),                                                              // P1 의 바닥(5베이 열 2 티어 02) — P1 을 P2 보다 앞세운다
    ];
    const q = build3(i3, i3);
    const at = (cn) => q.findIndex((c) => c.main.cn === cn || (c.twin && c.twin.cn === cn));
    T(cardsOf(q) === 7, `합성(트윈 둘째 자리) — 카드에 담긴 컨이 7이 아니다 (${cardsOf(q)})`);
    T(at('IIIU3000002') < at('IIIU3000003'), `합성(트윈 둘째 자리) — 트윈(5+7베이 티어 06)이 그 둘째 자리 밑 7베이 티어 04 보다 먼저 나온다 (${q.map((c) => c.main.cn.slice(-1) + (c.twin ? '+' + c.twin.cn.slice(-1) : '') + ':' + c.main.tier).join(' ')})`);
  }
  //  (j) 여러 베이가 섞인 4대 — 종전 비교가 순환(A<C<B<A)해 24가지 입력 순서가 큐 3가지로 갈리던 최소 재현(2차 시뮬 실측)
  {
    const j3 = [mk3('JJJU3000001', '25', '05', '80', 'P'), mk3('JJJU3000002', '25', '01', '80', 'Q'), mk3('JJJU3000003', '25', '02', '84', 'P'), mk3('JJJU3000004', '27', '03', '82', 'Q')];
    const perm = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perm([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r])));
    const keys = new Set(perm(j3).map((pm) => build3(pm, pm).map((c) => c.main.cn.slice(-1)).join('')));
    T(keys.size === 1, `합성(4대 순열) — 입력 순서 24가지가 큐 ${keys.size}가지로 갈린다(${[...keys].join(' / ')}) — 정렬이 배열 순서에 매여 있다`);
  }
  //  (k) planAll 을 그 베이 것만 줘도, 배 전체(패널의 modeAll)를 줘도 같은 큐 — 키가 베이·단별이라 다른 베이가 순위를 흔들지 않는다
  T(l4(build3(b28, b28)) === l4(build3(b28, all)), '배 전체 planAll 과 28베이 planAll 의 큐가 다르다');
  //  (l) 같은 자리에 컨이 둘 들어 있는 중복 자료도 배열 순서와 무관 — 물리 순서가 컨번호로 끝까지 가른다(선적)
  {
    const d3 = [mk3('DDDU3000002', '28', '01', '80', 'P1', { iso: '45G1', tp: "40'HC" }), mk3('DDDU3000001', '28', '01', '80', 'P1', { iso: '45G1', tp: "40'HC" })];
    T(build3(d3, d3).map((c) => c.main.cn).join() === build3([...d3].reverse(), d3).map((c) => c.main.cn).join(), '합성(같은 자리 중복) — 배열 순서에 따라 큐가 달라진다');
  }
  //  (m) 순위 재는 자료에서 planAll 과 containers 가 겹쳐도 한 번만 센다 — 화면은 남은 컨(containers)이 전체 계획(planAll)의 부분집합이다.
  //      A·B 둘 다 바닥 티어 80, 서로 얹힌 수는 한 쌍씩 같음(동률 → 코드 순 A 먼저). a1(남음)이 두 번 세이면 A 가 «위에 얹힌 쪽»으로 기울어 B 가 먼저 서 버린다.
  {
    const mkm = (cn, row, tier, pod) => mk3(cn, '28', row, tier, pod, { iso: '45G1', tp: "40'HC" });
    const a1 = mkm('MMMU3000001', '01', '82', 'A'), b1 = mkm('MMMU3000002', '01', '80', 'B'), a2 = mkm('MMMU3000003', '02', '80', 'A'), b2 = mkm('MMMU3000004', '02', '82', 'B'), x = mkm('MMMU3000005', '07', '80', 'B');
    const q = build3([a1, x], [a1, b1, a2, b2, x]);
    T(q.length === 2 && q[0].main.cn === a1.cn, `합성(겹침) — 남은 컨이 planAll 과 겹쳐 두 번 세여 도착항 순위가 기운다 (첫 카드 …${q[0] && q[0].main.cn.slice(-1)}, 기대 …1)`);
  }
  //  (n) FR·OT 무리(pureFrs)에서도 도착항 묶음이 유지된다 — 물리 순서 P2·P1·P1·P2 가 P1·P1·P2·P2 로 묶인다(P1·P2 바닥 80 동률 · 깔림 없음 → 코드 순)
  {
    const ot = { iso: '45U1', tp: "40'OT", fe: 'E', ot: true };
    const n3 = [mk3('NNNU3000001', '28', '04', '80', 'P2', ot), mk3('NNNU3000002', '28', '02', '80', 'P1', ot), mk3('NNNU3000003', '28', '01', '80', 'P1', ot), mk3('NNNU3000004', '28', '03', '80', 'P2', ot)];
    const seq = build3(n3, n3).map((c) => c.main.pod).join('');
    T(seq === 'P1P1P2P2', `합성(FR·OT 묶음) — FR·OT 무리에서 도착항 묶음이 유지되지 않는다 (${seq})`);
  }
  //  (o) 같은 베이의 홀드 FR·데크 FR — 홀드가 데크보다 먼저(도착항 후처리가 단(데크/홀드)을 넘나들지 않는다)
  {
    const ot = { iso: '45U1', tp: "40'OT", fe: 'E', ot: true };
    const o3 = [mk3('OOOU3000001', '10', '01', '02', 'P1', ot), mk3('OOOU3000002', '10', '02', '04', 'P2', ot), mk3('OOOU3000003', '10', '01', '80', 'P1', ot)];
    const seq = build3(o3, o3).map((c) => c.main.cn.slice(-1)).join('');
    T(seq === '123', `합성(홀드·데크 FR) — 홀드 FR 이 데크 FR 보다 먼저가 아니다 (${seq}) — 도착항 후처리가 단을 넘나든다`);
  }
  //  (p) POD 값이 객체 프로토타입 이름(constructor)이어도 예외 없이 나온다 — 키가 자료값이라 프로토타입 없는 객체로 센다
  {
    const p3 = [mk3('PPPU3000001', '26', '01', '80', 'CNDLC', { iso: '45G1', tp: "40'HC" }), mk3('PPPU3000002', '26', '02', '82', 'constructor', { iso: '45G1', tp: "40'HC" }), mk3('PPPU3000003', '26', '03', '84', 'constructor', { iso: '45G1', tp: "40'HC" })];
    let n = -1, err = '';
    try { n = build3(p3, p3).length; } catch (e) { err = String(e && e.message || e); }
    T(n === 3, `합성(POD 이름 constructor) — 예외가 났다 (${err})`);
  }
  //  (f) 도착항 묶음은 같은 베이 안에서만 작용한다 — 10베이는 두 도착항 모두 티어 80(순위 P1=0·P2=1), 14베이는 티어 82 하나뿐(순위 0).
  //      다른 베이의 순위끼리 견주면 10베이 P2(티어 80)가 14베이 티어 82 뒤로 밀린다 — 베이 사이 순서는 티어가 정한다.
  {
    const g3 = [mk3('GGGU3000001', '10', '01', '80', 'P1', { iso: '45G1', tp: "40'HC" }), mk3('GGGU3000002', '10', '02', '80', 'P2', { iso: '45G1', tp: "40'HC" }), mk3('GGGU3000003', '14', '01', '82', 'P3', { iso: '45G1', tp: "40'HC" })];
    const q = build3(g3, g3), seq = q.map((c) => c.main.cn.slice(-1));
    T(cardsOf(q) === 3 && seq.indexOf('3') === 2, `합성(베이 사이) — 14베이 티어 82 가 10베이 티어 80 둘보다 앞선다 (${seq.join('')}) — 도착항 순위를 다른 베이와 견주고 있다`);
  }
  //  (e) 양하는 도착항과 무관하다 — 28베이 양하 큐는 도착항 라벨을 바꿔도 뒤집어도 같아야 한다
  {
    const dis = (cs) => GQ.buildGuidedQueue({ containers: cs, mode: 'discharge', evenRowsSeaSide: true, findTwin: null, streamPref: null, frontCns: null, rowFrom: null, planAll: cs });
    const swapped = b28.map((c) => Object.assign({}, c, { pod: c.pod === 'CNWEI' ? 'CNDLC' : 'CNWEI' }));
    const blank = b28.map((c) => Object.assign({}, c, { pod: '' }));
    T(l4(dis(b28)) === l4(dis(swapped)) && l4(dis(b28)) === l4(dis(blank)), '양하 큐가 도착항 라벨에 따라 달라진다 — 양하는 도착항과 무관해야 한다');
  }
}

//  ── 보류 판정(화면과 같은 셈) ──
const HOLD_ASK_AFTER = 3, HOLD_LONG_MS = 3600000;
const due = (h, doneN, now) => {
  if (!/콘/.test(h.reason)) return false;
  const need = (now - h.at > HOLD_LONG_MS) ? 0 : HOLD_ASK_AFTER;
  return doneN - (h.doneAt || 0) >= need;
};
const t0 = Date.now();
T(!due({ reason: '콘 잠김', at: t0, doneAt: 10 }, 12, t0), '2대밖에 안 했는데 벌써 되묻는다');
T(due({ reason: '콘 잠김', at: t0, doneAt: 10 }, 13, t0), '3대를 했는데 안 묻는다 — 라싱은 3~5대면 온다');
T(!due({ reason: '컨 홀 불량(스프레더 안착 불가)', at: t0, doneAt: 10 }, 99, t0), '홀 불량을 되묻는다 — 기다린다고 풀리는 게 아니다');
T(!due({ reason: '트윈 무게 초과', at: t0, doneAt: 10 }, 99, t0), '무게 초과를 되묻는다');
T(due({ reason: '콘 잠김', at: t0 - HOLD_LONG_MS - 1000, doneAt: 10 }, 10, t0), '1시간이 넘었는데 대수만 세고 안 묻는다');

//  ── 브리핑·갱 배분에 보류가 실리는가(실데이터) ──
{
  const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/gangshift_swtd.json'), 'utf8'));
  const cnA = (fx.ediContainers[0] || {}).cn || 'AAAU1000001';
  const v = { info: { ...fx.info, gangs: 2 },
    discharge: { ediContainers: fx.ediContainers, held: { [cnA]: { reason: '콘 잠김', at: Date.now(), by: '김성일' } } },
    loading: {} };
  const at = new Date(2026, 7, 27, 21, 0).getTime();
  const gs = CA.buildGangShift(v, fx.bayDef, { now: at, nGangs: 2 });
  T(!!gs && (gs.heldLines || []).length === 1, '갱 배분이 보류를 모른다');
  T(/콘 잠김/.test((gs.heldLines || []).join('')), '보류 사유가 안 실린다');
  const txt = CA.answerGangShift(v, fx.bayDef, { now: at, nGangs: 2 }) || '';
  T(/⏸ 보류 1대/.test(txt), '갱 배분 답에 보류가 안 보인다 — 완료도 남은 일도 아닌 것이 묻힌다');
  const v0 = { ...v, discharge: { ediContainers: fx.ediContainers } };
  T(!/⏸ 보류/.test(CA.answerGangShift(v0, fx.bayDef, { now: at, nGangs: 2 }) || ''), '보류가 없는데 보류 줄이 뜬다');
}

//  ── 소스 배선 ──
const P = rd('src/components/GuidedWorkPanel.jsx');
const F = rd('src/firebase.js');
T(/export async function fbHoldContainers/.test(F), '보류 저장 함수가 없다');
T(/export async function fbReleaseHold/.test(F), '해제 함수가 없다');
T(/export async function fbSnoozeHold/.test(F), '«아직» 을 뒤로 미는 함수가 없다');
T(!/completed/.test(F.split('fbHoldContainers')[1].split('export ')[0]), '보류가 완료 노드를 건드린다 — 보류는 완료가 아니다');
T(/rec\.group = list\.join/.test(F), '트윈 두 대를 한 몸으로 안 묶는다 — 짝만 남으면 큐가 짝 없는 20ft 로 잘못 낸다');
T(/const HOLD_ASK_AFTER = 3;/.test(P), '되묻기 기준이 3대가 아니다(검수사 확정 3~5대)');
T(/const HOLD_LONG_MS = 60 \* 60000;/.test(P), '1시간 기준이 없다(검수사 확정 «길어야 1시간»)');
T(/HOLD_REASONS = \['콘 잠김', '트윈 무게 초과', '컨 홀 불량\(스프레더 안착 불가\)'\]/.test(P), '사유 3택이 검수사가 준 그대로가 아니다');
T(/frontCns: dueCns\.length \? dueCns : \(resumeCns\.length \? resumeCns : null\)/.test(P), '해제·되묻기 컨을 맨 앞으로 안 보낸다');
T(/!heldSet\.has\(cn\) \|\| dueCns\.includes\(cn\)/.test(P), '보류한 컨을 큐에서 안 뺀다');
T(/disabled=\{busy \|\| \(card\.twin && !!twinWtWarn\?\.over\)\}/.test(P), '55톤 초과인데 «트윈 한 번에» 가 그대로 눌린다 — 그게 사고다');
T(/singleMode/.test(P) && /handleConfirmOne/.test(P), '트윈을 한 대씩 내리는 길이 없다');
T(/캐빈에서 먼 쪽부터, 갱을 피해서/.test(P), '싱글 순서 안내가 검수사 말과 다르다');
T(!/twinWtWarn\?\.imbal.*disabled/.test(P), '무게차만으로 트윈을 막는다 — 트림 판단은 현장 몫이다');
T(/해제<\/button>/.test(P), '보류 줄에 [해제] 탭이 없다 — 검수사가 요청한 그것이다');

//  ── 매뉴얼(0-B) ──
const H = rd('src/data/helpData.js');
T(!/t: '건너뛰기'/.test(H), '매뉴얼에 없는 버튼 「건너뛰기」 목업이 아직 남아 있다');
T(/⏸ 지금 양하 불가/.test(H), '매뉴얼에 양하 불가가 없다');
T(/싱글로 한 대씩/.test(H), '매뉴얼에 싱글 전환이 없다');
T(/3대 지난 뒤 앱이 먼저/.test(H), '매뉴얼에 되묻기가 없다');

if (bad > 0) { console.error(`✗ 자동 가이드 연막검사 실패 ${bad}건`); process.exit(1); }
console.log('✓ 자동 가이드 연막검사 통과 — 큐 6 · 선적 도착항 묶음(ATPR 2644W 실데이터) · 되묻기 5 · 브리핑 4 · 배선 12 · 매뉴얼 4');
