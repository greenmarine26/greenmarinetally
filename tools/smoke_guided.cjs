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
console.log('✓ 자동 가이드 연막검사 통과 — 큐 6 · 되묻기 5 · 브리핑 4 · 배선 12 · 매뉴얼 4');
