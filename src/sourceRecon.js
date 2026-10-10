// 자료별 대조 한 벌 — EDI·세관·선사 리스트·완료·터미널 실적·터미널 배정 수량·본선현황 수량을 컨번호로 맞춰 어느 한쪽에만 있는 컨을 묶는다(4.22)
//  ★ 4.22 (검수사 2026-10-10 07:52 «4개의 컨테이너가 무었인지 앱에 알림표기를 해주세요 부족한건 앱에서 보여주면서 넘치는건 안보여줌» ·
//    07:53 «넘치거나 부족한거나 둘다 앱에 알림표기를 해야 주의 깊게 볼수있습니다. 컨넘버와 관련선사 표기 출발 항구등» ·
//    08:08 «EDI와 선사요구메일 세관 터미널 등이 다 적용되어야 합니다. 자료없음, 어느쪽에 라도 있으면 표기를 알림표기 박스에 보여주세요»).
//    진단(diagnostics.runDiagnostics 의 source_recon)과 주의 박스(DiagnosticsPanel)가 이것만 부른다.
//
//  출처마다 «그 자료가 뭐라고 했나» 를 그대로 본다 — 사람이 고른 POD(pod_pick)로 EDI 를 고쳐 읽지 않는다(EDI 는 EDI 원문 POD).
//    그래서 선사 메일이 평택 양하로 지정한 통과 컨(MCAP 639N 5대 — 수집기 pod_pick 'mail')은 «EDI 통과(CNTXG) · 세관 ✗ · 선사 ✓» 로 보인다.
//  ★ 감사 반영(Fable 판정 2026-10-10)
//    · 세관 목록이 있는 배에서 «선사 ✗» 는 어긋남이 아니다 — 선사 리스트는 «선사 리스트·메일에만»(g2)의 근거로만 쓴다(보관 10항차 1,092대 오경보 —
//      OBWH 2761E 선사 리스트 18/237). 세관보다 확연히 적으면(절반 미만) 머리줄에 «선사 리스트 일부 N/M» 한 토막만(carrierPartial — 총수·음성 밖).
//      세관이 없는 배(4.20 basis 'list')는 선사 리스트가 기준이므로 종전대로 «선사 ✗» 도 어긋남이다.
//    · 사람이 확정한 POD(pod_pick 이 'mail' 이 아닌 수석·검수사 확정)가 평택이 아니면 묶음·총수·음성에서 빼고 «POD 확정 — 평택 아님(참고)»(ref)로 따로 보인다.
//    · 터미널 수량 둘 — 배정표(info.planDis/planLod · 도선)와 본선현황(info.qcWork 호기 합계 = 완료+잔여). 차이는 배정표로, 없으면 본선현황으로 잰다.
//    · 세관 검수 결과 코드(data/customsCodes.js 한 벌) 후보 — g3 «MFN» · g1 중 완료·실적 없는 컨 «MGN» · EDI 번호 대기 자리 «CNN». 후보일 뿐 확정 아님.
//  앱 대수(app)는 4.20 평택 양하분 한 벌(utils.ptkDischargeUnitsOf)의 set — 홈 카드·마감텔리와 같은 수다. 선적은 진행 숫자 한 벌(progressOf)의 평택분.
//  터미널 수량은 번호를 모른다 — 차이를 묶음(·참고)으로 설명 못 하는 만큼은 «번호 없음» 으로 센다(후보일 뿐 확정 아님).
import { isPyeongtaekPort, isListOriginRecord, isOppositeDirRecord, isShiftOffPtk, isVirtualCn, ptkDischargeUnitsOf, shiftCnSetOf, voyageKeyOf, progressOf, qcRowsOf } from './utils.js';
import { shipOpMapper } from './data/tallyFormats.js';

const unitKey = (k) => !!k && !String(k).startsWith('_');   // __SLOT_ 자리표시·빈 번호는 유닛이 아니다(4.20 과 같은 판정)

//  묶음 이름 — 세관 목록이 없는 배(선사 리스트가 기준 — 4.20 basis 'list')는 ②③ 의 «세관» 자리를 선사 리스트로 읽는다.
const groupLabel = (key, S) => ({
  g1: '세관(·선사) 목록에만 — EDI 없음',
  g2: `선사 리스트·메일에만 (${S.customs.has ? '세관 밖 · ' : ''}EDI 평택 아님)`,
  g3: S.customs.has ? 'EDI 평택인데 세관 밖 (추가분 — 신고 대상)' : 'EDI 평택인데 선사 리스트 밖 (추가분)',
  g4: 'EDI 통과인데 세관 목록에 있음',
  g5: '완료·터미널 실적에만',
}[key] || `기타 — ${key.slice(4)}`);
const GROUP_ORDER = ['g1', 'g2', 'g3', 'g4', 'g5'];
const _STARTED_TS = new Set(['working', 'departed', 'done', 'finished', 'completed']);   // 터미널 상태 — 작업 중·끝(utils _TRUTH_READY 와 같은 말)
export const REF_POD_LABEL = 'POD 확정 — 평택 아님(참고)';
//  터미널 수량 이름 · «번호 없음» 글 — 진단 한 줄과 주의 박스가 같은 글을 쓴다(한 벌).
export const reconTermLabel = (basis) => (basis === 'qc' ? '본선현황' : '터미널 배정');
export function reconUnknownText(R) {
  if (!R || !(R.unknown > 0)) return '';
  const qty = R.term && R.term.basis === 'qc' ? '본선현황은 수량뿐' : '배정표는 수량뿐';
  return R.gap < 0 ? `번호 없음 ${R.unknown}대 — ${qty}, 작업이 시작되면 실적으로 번호가 잡힐 수 있음` : `터미널이 모르는 ${R.unknown}대(${qty}이라 번호로 못 가림)`;
}

//  opts.skip(cn) — 검증 대상이 아닌 컨(수화물·통과화물·선사 취소 요청분 — 진단이 이미 가르는 것). opts.voyageKey — 시프팅 지도 캐시 키.
export function reconcileSources(voyage, mode = 'discharge', opts = {}) {
  const dis = mode !== 'loading';
  const mk = dis ? 'discharge' : 'loading';
  const sec = (voyage && voyage[mk]) || {};
  const info = (voyage && voyage.info) || {};
  const edi = sec.ediContainers || {}, recs = sec.records || {}, comp = sec.completed || {}, tw = sec.termWork || {};
  const skip = typeof opts.skip === 'function' ? opts.skip : () => false;
  const ss = shiftCnSetOf(opts.voyageKey || voyageKeyOf(voyage), voyage);
  const off = (cn) => isShiftOffPtk(ss, recs, mk, cn);   // 시프팅은 시프팅 줄이 따로 센다
  const out = (cn) => skip(cn) || off(cn);

  //  EDI — 원문 POD(양하)·POL(선적). 행마다 컨번호(cn — 자리표시 키에 든 제작컨 번호 포함)로. 예약 자리·번호 대기·가상 자리(리스트·플랜에서 만든 것)는 EDI 가 아니다.
  //    양하 평택 자리인데 컨번호가 없는 행(번호 대기)은 따로 센다 — 세관 코드 CNN 후보(유닛·총수 밖).
  const ediRow = new Map();   // cn → { st: 'ptk' | 'thru', c, rank }
  let pendingN = 0;
  for (const [k, c] of Object.entries(edi)) {
    if (!c || c._virtualFromList || c._virtualFromPlan) continue;
    const cn = String(c.cn || k || '').trim();
    if (dis && !c.isBooking && (c.pendingCn || !unitKey(cn)) && isPyeongtaekPort(c.pod)) { pendingN += 1; continue; }
    if (c.isBooking || c.pendingCn) continue;
    if (!unitKey(cn) || (!dis && isVirtualCn(cn))) continue;
    const p = isPyeongtaekPort(dis ? c.pod : c.pol);
    const rank = (p ? 2 : 0) + (k === cn ? 1 : 0);
    const prev = ediRow.get(cn);
    if (!prev || rank > prev.rank) ediRow.set(cn, { st: p ? 'ptk' : 'thru', c, rank });
  }
  //  리스트 행 — 4.20 과 같은 거름(리스트 출신 · 반대 방향 아님). 세관 = _customs. 선사 = 선사 파서 표식(iso_carrier — 세관이 덮어도 남는다)
  //    또는 세관이 아닌 파일 행(_source) 또는 선사 메일 지정(pod_pick 'mail'). 사람이 쓴 칸(온도·고른 POD)만 있는 행은 선사 자료가 아니다.
  const custSet = new Set(), carSet = new Set();
  for (const [cn, r] of Object.entries(recs)) {
    if (!unitKey(cn) || !r || !isListOriginRecord(r) || isOppositeDirRecord(r, mk)) continue;
    if (r._customs) custSet.add(cn);
    if (r.iso_carrier !== undefined || (!r._customs && r._source) || r.pod_pick === 'mail') carSet.add(cn);
  }
  const doneSet = new Set(Object.keys(comp).filter((cn) => unitKey(cn) && comp[cn] && !(typeof comp[cn] === 'object' && comp[cn].flag === 'missing')));
  const termSet = new Set(Object.keys(tw).filter(unitKey));
  const ediPtkN = [...ediRow.values()].filter((x) => x.st === 'ptk').length;
  const planN = Number(dis ? info.planDis : info.planLod) || 0;
  //  본선현황 — 동방 호기 표(info.qcWork)의 이 방향 완료+잔여 합계(utils.qcRowsOf 한 벌 — 쉬는 호기는 뺀다)
  const qcN = qcRowsOf(info.qcWork).reduce((a, q) => a + (dis ? q.disDone + q.disRest : q.lodDone + q.lodRest), 0);
  const sources = {
    edi: { has: ediRow.size > 0, n: ediPtkN },
    customs: { has: custSet.size > 0, n: custSet.size },
    carrier: { has: carSet.size > 0, n: carSet.size },
    done: { has: true, n: doneSet.size },
    term: { has: true, n: termSet.size },
    plan: { has: planN > 0, n: planN },
    qc: { has: qcN > 0, n: qcN },
    pending: { has: pendingN > 0, n: pendingN },
  };
  const carBasis = !sources.customs.has && sources.carrier.has;   // 세관이 없는 배만 선사 리스트가 기준이다
  //  작업이 시작됐거나 끝난 항차인가 — MGN(적하목록있으나 화물없음)은 그때부터만 말한다(작업 전엔 «화물 없음» 을 알 수 없다 — 재감사 반영)
  const started = !!String(info.workStartAt || '').trim() || _STARTED_TS.has(String(info.terminalStatus || '').trim().toLowerCase()) || doneSet.size > 0 || termSet.size > 0;
  const carrierPartial = sources.customs.has && sources.carrier.has && sources.carrier.n * 2 < sources.customs.n;

  //  앱 대수 — 양하는 4.20 평택 양하분 한 벌, 선적은 진행 숫자 한 벌의 평택분(홈 카드 막대와 같은 수).
  let app, inApp;
  if (dis) {
    const U = ptkDischargeUnitsOf(voyage, ss);
    app = U.set.size; inApp = (cn) => U.set.has(cn);
  } else {
    const ptkCns = new Set([...ediRow].filter(([, x]) => x.st === 'ptk').map(([cn]) => cn));
    const P = progressOf(sec, 'loading', ss, ptkCns);
    app = P.ptk.total;
    //  progressOf 의 분모와 같은 규칙 — 리스트 행이 있으면 리스트(시프팅 문지기 지남), 없으면 EDI 평택분
    const listCns = Object.keys(recs).filter((cn) => isListOriginRecord(recs[cn]) && !isOppositeDirRecord(recs[cn], 'loading') && !off(cn));
    const base = P.usePtk ? ptkCns : new Set(listCns);
    inApp = (cn) => base.has(cn) && !(P.usePtk && ss.has(cn));
  }

  const opMap = shipOpMapper(String(info.vsl || '').toUpperCase(), [...Object.values(recs), ...Object.values(edi)].map((x) => x && x.op));
  const union = new Set([...[...ediRow].filter(([, x]) => x.st === 'ptk').map(([cn]) => cn), ...custSet, ...carSet, ...doneSet, ...termSet]);
  const groups = new Map();
  const ref = [];
  let total = 0;
  for (const cn of [...union].sort()) {
    if (out(cn)) continue;
    const e = ediRow.get(cn);
    const eS = e ? e.st : 'none';
    const inC = custSet.has(cn), inR = carSet.has(cn), inD = doneSet.has(cn), inT = termSet.has(cn);
    const c = (e && e.c) || {}, r = recs[cn] || {}, t = tw[cn] || {};
    //  사람이 확정한 POD(수석·검수사 — 선사 메일 지정 'mail' 은 선사 자료)가 평택이 아니면 참고 줄로만(4.20 평택 양하분도 이 컨을 뺀다)
    const pickedOff = dis && !!r.pod_pick && r.pod_pick !== 'mail' && !!r.pod && !isPyeongtaekPort(r.pod);
    //  어긋남 — 자료가 있는 출처(EDI·세관, 세관이 없으면 선사) 중 하나라도 이 컨이 없다. 완료·실적은 작업 진행이라 «없음» 은 어긋남이 아니지만, 그것들에만 있으면 어긋남이다.
    const miss = (sources.edi.has && eS !== 'ptk') || (sources.customs.has && !inC) || (carBasis && !inR) || (eS !== 'ptk' && !inC && !inR);
    if (!miss && !pickedOff) continue;
    const pat = [];
    if (sources.edi.has) pat.push(eS === 'ptk' ? 'EDI ✓' : eS === 'thru' ? `EDI 통과(${(dis ? c.pod : c.pol) || '?'})` : 'EDI ✗');
    if (sources.customs.has) pat.push(inC ? '세관 ✓' : '세관 ✗');
    if (sources.carrier.has && (carBasis || inR)) pat.push(inR ? '선사 ✓' : '선사 ✗');   // 세관이 있는 배의 «선사 ✗» 는 말하지 않는다(어긋남이 아니다)
    const keyPat = pat.join(' ');   // 기타 묶음 키 — 완료·실적은 빼고(작업이 진행돼도 묶음이 갈라지지 않게)
    if (inD) pat.push('완료 ✓');
    if (inT) pat.push('실적 ✓');
    const pattern = pat.join(' ');
    const op = r.op || c.op || t.op || '';
    const item = {
      cn, iso: r.iso || c.iso || '', fe: r.fe || c.fe || t.fe || '', op: op ? opMap(op) : '',
      //  POD 는 자료 원문 — 사람이 확정한 행(pod_pick, 메일 지정 빼고)의 records.pod 는 고른 값이라 EDI 원문(없으면 pod_orig)을 보이고 고른 값은 «POD 확정» 으로 따로 붙인다
      pol: r.pol || c.pol || '', pod: (r.pod_pick && r.pod_pick !== 'mail' ? (c.pod || r.pod_orig || r.pod) : (r.pod || c.pod)) || '',
      bay: c.bay || '', row: c.row || '', tier: c.tier || '', ...(c.deckPos || r.deckPos ? { deckPos: c.deckPos || r.deckPos } : {}),
      src: r._source || (r.pod_pick === 'mail' ? (r.pod_picked_by || '선사 메일') : ''),
      ...(r.pod_pick && r.pod_pick !== 'mail' ? { pick: r.pod_pick_label || r.pod || '' } : {}),
      edi: eS, customs: inC, carrier: inR, done: inD, term: inT, pattern, inApp: inApp(cn),
    };
    if (pickedOff) { ref.push(item); continue; }
    let g;
    if (inC && eS === 'thru') g = 'g4';
    else if (eS === 'ptk' && (sources.customs.has ? !inC : (sources.carrier.has && !inR))) g = 'g3';
    else if (inC && eS === 'none') g = 'g1';
    else if (inR && !inC && eS !== 'ptk') g = 'g2';
    else if (!inC && !inR && eS !== 'ptk' && (inD || inT)) g = 'g5';
    else g = 'etc:' + keyPat;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(item);
    total += 1;
  }
  const gl = [...groups.entries()]
    .sort(([a], [b]) => (GROUP_ORDER.indexOf(a) < 0 ? 99 : GROUP_ORDER.indexOf(a)) - (GROUP_ORDER.indexOf(b) < 0 ? 99 : GROUP_ORDER.indexOf(b)) || a.localeCompare(b))
    .map(([key, items]) => {
      const gg = { key, label: groupLabel(key, sources), items };
      //  세관 검수 결과 코드 후보 — 세관 목록이 있는 배만(코드표는 세관 적하목록 기준이다)
      if (sources.customs.has && key === 'g3') gg.code = 'MFN';
      if (key === 'g1' && started) { const n = items.filter((x) => !x.done && !x.term).length; if (n) { gg.code = 'MGN'; gg.codeN = n; } }
      return gg;
    });

  //  터미널 수량 — 배정표가 있으면 배정표, 없으면 본선현황. gap = 앱 − 터미널. 앱이 적으면 앱 밖에 있는 어긋남·참고 컨이, 많으면 앱 안에 있는 어긋남 컨이 후보다.
  //    후보로 못 채운 만큼이 «번호 없음»(묶음 수가 아니라 차이에서 후보를 뺀 수 · 음수는 0).
  const termBasis = sources.plan.has ? 'plan' : (sources.qc.has ? 'qc' : null);
  const termN = termBasis === 'plan' ? planN : termBasis === 'qc' ? qcN : 0;
  let gap = null, explained = 0, unknown = 0;
  if (termBasis) {
    gap = app - termN;
    if (gap !== 0) {
      const all = [...gl.flatMap((x) => x.items), ...ref];
      explained = Math.min(Math.abs(gap), all.filter((x) => (gap < 0 ? !x.inApp : x.inApp)).length);
      unknown = Math.max(0, Math.abs(gap) - explained);
    }
  }
  return { mode: mk, sources, carrierPartial, started, app, term: { basis: termBasis, n: termN }, gap, explained, unknown, groups: gl, ref, total };
}
