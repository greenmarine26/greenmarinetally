// 호기가 다른 배로 옮긴 것을 읽는 판정 한 벌 — 미르 말(«2호기 04:00 KSKM으로 이동»)·확인 질문·기록이 같은 자료를 본다 (TallyOne 5.14)
//   검수사 2026-11-19 07:28 «클로드가 적는게 아니고 앱이 적어야 합니다. 기본적으로 어제 PCTC에 야간 근무조는 1호기 김판석 2호기 최원형 3호기 김성일 셋뿐입니다.
//     앱은 세명이 스타트 선박이 뭔질 알고 있고 몇시에 작업 선박이 바뀐걸 알수 있었을 것입니다.» · 07:36 «검수사가 시간을 틀릴수도 있습니다. 앱 자료와 틀릴시에 왜 틀리는지는 물어 볼수 있습니다.»
//   같은 터미널·같은 조의 호기는 검수원과 함께 배를 옮긴다. 자료만으로 옮김을 적는 것은 수집기(crewfollow.py)가 하고, 이 파일은 말로 알린 옮김을 앱 자료와 맞춰 본다.
import { currentShift, shiftGangKey, isPctcVoyage } from './utils.js';

const EARLY_MS = 60 * 60000;   // 5.14-01: 새 배 첫 완료보다 이만큼 넘게 이른 시각은 묻는다(옮기는 데 걸리는 시간은 넉넉히 한 시간)
const SLACK_MS = 5 * 60000;   // 말한 시각과 완료 기록 사이 허용 오차 — 이보다 벌어지면 왜 다른지 묻는다

const craneNoOf = (e) => { const m = /(\d)\s*(?:호기)?$/.exec(String(e || '').trim()); const n = m ? +m[1] : 0; return n >= 1 && n <= 4 ? n : 0; };
const pierOf = (info) => { try { return isPctcVoyage(info || {}) ? 'PCTC' : 'PNCT'; } catch (e) { return ''; } };

/** «04:00» → 지금에 가장 가까운 그 시각(어제·오늘·내일 중). 시각을 안 말했으면 0.
 *  감사 중4 — «아직 안 온 시각은 어제» 로 넘기면 «05:02»(지금 04:56)가 하루 전 조가 된다. 가장 가까운 것을 고르고, 지금보다 뒤면 plan 이 묻는다. */
export function spokenTimeMs(hh, mm, nowMs = Date.now()) {
  if (hh === '' || hh == null) return 0;
  const h = Number(hh), m = Number(mm) || 0;
  if (!Number.isFinite(h) || h < 0 || h > 23 || m < 0 || m > 59) return 0;
  const d = new Date(nowMs); d.setHours(h, m, 0, 0);
  const t = d.getTime();
  const near = [t - 86400000, t, t + 86400000].reduce((a, b) => (Math.abs(b - nowMs) < Math.abs(a - nowMs) ? b : a));
  //  재감사 하4 — 가장 가까운 것이 아직 안 왔는데 그 전날 같은 시각이 한 조(14시간) 안이면 지난 조의 그 시각이다(아침 06:00 의 «17:45» = 어제 17:45)
  if (near > nowMs + SLACK_MS && nowMs - (near - 86400000) <= 14 * 3600000) return near - 86400000;
  return near;
}

/** 그 항차·그 조에서 호기 N 의 완료 시각들(양하·선적 합침) — 처음·마지막. */
function craneSpanOf(voyage, no, shiftKey, afterMs = 0) {
  let first = 0, last = 0, n = 0;
  for (const mode of ['discharge', 'loading']) {
    const comp = voyage && voyage[mode] && voyage[mode].completed;
    if (!comp || typeof comp !== 'object') continue;
    for (const r of Object.values(comp)) {
      if (!r || typeof r !== 'object') continue;
      const at = Number(r.at) || Number(r.ts) || 0;
      if (!at || craneNoOf(r.equip) !== no || at <= afterMs) continue;
      if (shiftGangKey(currentShift(at)) !== shiftKey) continue;
      n += 1; if (!first || at < first) first = at; if (at > last) last = at;
    }
  }
  return { first, last, n };
}

const regOf = (info, shiftKey, no) => {
  const e = info && info.craneCrew && info.craneCrew[shiftKey] && info.craneCrew[shiftKey][`${no}호기`];
  if (!e) return null;
  if (typeof e === 'object' && e.leftAs === 'admin') return null;   // 5.26 감사 상3: 관리자로 돌아간 칸은 그 호기 등록이 아니다(배 이동이 «돌아옴» 으로 읽어 김성일을 되살리던 것)
  const name = typeof e === 'string' ? e.trim() : String(e.name || '').trim();
  return name ? { ...(typeof e === 'object' ? e : { _str: true }), name } : null;
};

/**
 * 말로 알린 «N호기 (시각) 배로 이동» 을 앱 자료와 맞춰 본다.
 * 반환 { ok, why?, targetKey, shiftKey, no, ms, name, originKey, originVsl, lastAtOrigin, firstAtTarget, conflict, needCrew, leftOrigin, targetReg }
 */
export function shipMovePlanOf(voyages, targetKey, no, ms, nowMs = Date.now(), toShip = '') {
  const V = voyages || {};
  const T = V[targetKey];
  if (!T || !T.info) return { ok: false, why: 'noTarget' };
  const targetVsl = String(T.info.vsl || targetKey.split('_')[0]).toUpperCase();
  //  감사 하10 — 말한 코드와 다른 배로 고쳐 짐작하지 않는다(«KSKS» → KSKM). 되묻는다.
  const shipMismatch = !!(toShip && String(toShip).toUpperCase() !== targetVsl);
  const at = ms || nowMs;
  const future = !!(ms && ms > nowMs + SLACK_MS);   // 감사 중4 — 아직 안 온 시각은 적지 않고 묻는다
  const shiftKey = shiftGangKey(currentShift(at));
  const pier = pierOf(T.info);
  const targetReg = regOf(T.info, shiftKey, no);
  //  재감사 중2 — 떠났던 배로 돌아오면 그 배의 «첫 완료» 는 떠난 표시 뒤의 것만 본다(처음 일하던 때 기록이 걸리지 않게)
  const tSpan = craneSpanOf(T, no, shiftKey, (targetReg && Number(targetReg.leftAt)) || 0);
  //  떠난 배 — 같은 부두·같은 조에 이 호기가 등록된 다른 항차. 떠난 표시(leftAt)가 없는 등록(= 지금 그 호기가 있는 배)을 먼저,
  //    그다음 이 호기 마지막 활동(완료·등록 시각 중 늦은 것)이 늦은 곳(감사 하8 — 따라 적었지만 아직 완료가 없는 배를 놓치지 않게).
  let origin = null;
  for (const [k, v] of Object.entries(V)) {
    if (k === targetKey || !v || !v.info || pierOf(v.info) !== pier) continue;
    const reg = regOf(v.info, shiftKey, no);
    if (!reg) continue;
    const sp = craneSpanOf(v, no, shiftKey);
    const act = Math.max(sp.last, Number(reg.at) || 0);
    const rank = [reg.leftAt ? 0 : 1, act];
    if (!origin || rank[0] > origin.rank[0] || (rank[0] === origin.rank[0] && rank[1] > origin.rank[1])) origin = { key: k, vsl: String(v.info.vsl || k.split('_')[0]), reg, last: sp.last, rank };
  }
  //  떠난 배가 이미 끝나 앱에서 빠졌으면(보관소) 수집기가 새 배에 남긴 «어디서 왔는지» 를 쓴다
  const originKey = origin ? origin.key : String((targetReg && targetReg.from) || '');
  const originVsl = origin ? origin.vsl : (originKey ? originKey.split('_')[0] : '');
  const lastAtOrigin = origin ? origin.last : (Number(targetReg && targetReg.fromLastAt) || 0);
  const name = (targetReg && targetReg.name) || (origin && origin.reg.name) || '';
  //  감사 중7 — 떠났던 배로 돌아옴(A→B→A): 새 배 등록에 leftAt 이 있으면 지우고 지금 있던 배에 떠난 표시
  const returning = !!(targetReg && targetReg.leftAt);
  //  5.14-01 (라이브 확인 09:25 «2호기 23:59 KSKM으로 이동» → 어젯밤 23:59 로 적힘): 지금 조가 아닌 시각은 묻는다 · 새 배 첫 완료보다 한 시간 넘게 이른 시각도 묻는다
  const otherShift = !!(ms && shiftKey !== shiftGangKey(currentShift(nowMs)));
  const tooEarly = !!(ms && tSpan.first && ms < tSpan.first - EARLY_MS);
  const conflict = future || otherShift || tooEarly || !!(ms && ((lastAtOrigin && ms < lastAtOrigin - SLACK_MS) || (tSpan.first && ms > tSpan.first + SLACK_MS)));
  //  감사 중6 — «맞아» 로 넘겨 적을 때도 떠난 배에 표시한다. 떠난 시각은 말한 시각과 떠난 배 마지막 완료 중 늦은 것.
  const leftAtOrigin = Math.max(ms || nowMs, (origin && origin.last) || 0);
  const leftOrigin = !!(origin && !origin.reg.leftAt);
  const needCrew = !targetReg && !!name;
  //  감사 하10 — 적을 것이 없으면(이미 그 배에 그 호기가 있고 시각도 안 말함) 적는다고 하지 않는다
  const nothing = !ms && !needCrew && !returning && !leftOrigin;
  return {
    ok: true, targetKey, targetVsl, shiftKey, no, ms: ms || 0, name,
    originKey, originVsl, lastAtOrigin, firstAtTarget: tSpan.first,
    conflict, future, otherShift, tooEarly, shipMismatch, needCrew, leftOrigin, leftAtOrigin, returning, nothing,
    originRegIsString: !!(origin && origin.reg && origin.reg._str),
    targetReg,
  };
}

const hm = (ms) => { if (!ms) return ''; const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

/** 미르 답 한 벌 — 화면(MirFab·SearchPanel)과 엔진이 같은 글을 쓴다. force = «맞아» 처럼 다시 확인한 말. */
export function shipMoveAnswerOf(plan, force = false) {
  if (!plan || !plan.ok) return '';
  const eq = `${plan.no}호기`;
  const who = plan.name ? ` ${plan.name}` : '';
  const from = plan.originVsl ? `${plan.originVsl} → ` : '';
  const again = `«${eq}${plan.ms ? ' ' + hm(plan.ms) : ''} ${plan.targetVsl}으로 이동 맞아»`;
  if (plan.shipMismatch) return `🏗 말씀하신 배 이름을 작업 목록에서 못 찾았어요 🐱 ${plan.targetVsl} 말씀인가요? 아직 적지 않았어요. 맞으면 ${again} 라고 해 주세요.`;
  if (plan.future) return `🏗 ${hm(plan.ms)}은 아직 안 온 시각이에요 🐱 아직 적지 않았어요. 옮긴 뒤에 다시 말씀해 주세요.`;
  if (plan.otherShift && !force) return `🏗 ${hm(plan.ms)}은 지금 조가 아니라 ${plan.shiftKey}조 시각이에요 🐱 아직 적지 않았어요. 그 조 이야기가 맞으면 ${again} 라고 해 주세요.`;
  if (plan.conflict && !force) {
    const bits = [];
    if (plan.lastAtOrigin) bits.push(`${plan.originVsl}에서 ${hm(plan.lastAtOrigin)}까지 완료 기록`);
    if (plan.firstAtTarget) bits.push(`${plan.targetVsl} 첫 완료 ${hm(plan.firstAtTarget)}`);
    return `🏗 ${eq}${who}은 ${bits.join(' · ')}이 있어요 🐱 말씀하신 ${hm(plan.ms)}과 달라요 — 왜 다른지 알려 주세요. 아직 적지 않았어요. 그 시각이 맞으면 ${again} 라고 해 주세요.`;
  }
  if (plan.nothing) return `🏗 ${plan.targetVsl} ${eq}은 이미${who ? who + '으로' : ''} 적혀 있어요 🐱 바꿀 것이 없어 아무것도 안 바꿨어요.`;
  const t = plan.ms ? ` ${hm(plan.ms)}` : '';
  const nm = plan.name ? '' : ' 검수원 이름은 자료에 없어요 — «' + plan.targetVsl + ' ' + eq + ' 홍길동» 처럼 알려 주세요.';
  return `🏗 ${eq}${who} ${from}${plan.targetVsl}${t} 이동으로 적을게요 🐱 그 시각부터 ${plan.targetVsl} ${eq} 작업으로 셉니다.${nm}`;
}

/** 적어도 되는가 — 엔진 답이 «적을게요» 일 때와 같은 조건(화면이 이것으로만 적는다). */
export function shipMoveWritable(plan, force = false) {
  return !!(plan && plan.ok && !plan.shipMismatch && !plan.nothing && !plan.future && (!plan.conflict || force));   // 재감사 하4 — 아직 안 온 시각은 «맞아» 로도 적지 않는다
}
