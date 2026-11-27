// 미르가 받은 작업보고(workReportParse) → 앱에 쓸 것(진행 중 표시·보고·해치 표시)과 되읽기 말 — 순수 계획 한 벌. 쓰기는 firebase.fbApplyMirWorkReport 만 한다.
//   검수사 2026-11-18 결정 — 받을 보고 «양하·선적 시작/완료/중단/재개 · 해치커버 열림/닫힘 · 콘박스» · 이름 «그 호기 검수원 이름» · «바로 적고 되읽기만»
//   · «호기별 이름이 등록되지 않은 상태에서는 검수원 1 2 3 4로 기록 바랍니다». 기록은 작업 보고 창(WorkReportModal)과 같은 모양이다.
import { crewShiftKey, crewNameAt, hatchPanelDetailOf, otherRunningWork, switchReasonOf } from './utils.js';
import { bayGroupCenter } from './swapGrade.js';
import { getBayPairs } from './twin.js';
import { getShipBayDictData } from './shipStructure.js';
import { buildWorkStatusMessage, buildHatchMessage, buildConBoxMessage } from './kakaoShare.js';
import { equipHolderOf } from './equipHold.js';   // 감사 중3: 호기를 쥔 사람 판정 한 벌(작업 중 바꾼 호기·조·남은 어제 로그인·클로드 계정 제외)

const KO_MODE = { discharge: '양하', loading: '선적' };
const KO_VERB = { start: '시작', done: '완료', pause: '중단', resume: '재개' };
const hasEdi = (v, m) => !!(v && v[m] && Object.keys(v[m].ediContainers || {}).length);

/** 그 호기 검수원 — ① 지금 조 등록(info.craneCrew) ② 그 배·그 호기를 고르고 로그인한 작업자 ③ 없으면 «검수원N». */
export function crewNameForEquip(voyageKey, info, inspectors, equip, nowMs = Date.now()) {
  const n = (/([1-9])/.exec(String(equip || '')) || [])[1] || '';
  try {
    //  5.16: 공동 담당이 넘겨받았으면 바꾼 시각 기준 사람(구간 한 벌 — utils.crewNameAt). 조 등록 칸은 원래 등록자로 남아 있다.
    const _at = crewNameAt(info || {}, nowMs, equip);
    if (_at && info && info.crewPool && Array.isArray(info.crewPool.names) && info.crewPool.names.includes(_at)) return { name: _at, src: '공동 담당' };
    const sk = crewShiftKey(undefined, nowMs, 0).key;
    const cc = info && info.craneCrew && info.craneCrew[sk] && info.craneCrew[sk][equip];
    if (cc && String(cc.name || '').trim() && cc.leftAs !== 'admin') return { name: String(cc.name).trim(), src: '조 등록' };   // 5.26 재감사 중C: 관리자로 돌아간 칸은 그 호기 검수원이 아니다
  } catch (e) { console.warn('[미르 작업보고] 조 등록 읽기 실패 — 로그인 작업자로 찾습니다', e); }
  const hit = equipHolderOf(inspectors || {}, voyageKey, equip, '', nowMs);
  if (hit) return { name: String(hit), src: '그 호기 작업자' };
  return { name: n ? `검수원${n}` : '검수원', src: '등록 없음' };
}

/** 이 호기의 작업(양하/선적) — 말에 없으면 진행 중인 것 → 그 배에 한쪽 자료만 있으면 그쪽. 못 정하면 ''. */
export function modeForEquip(voyage, activeWork, equip, said = '') {
  if (said) return said;
  const row = (activeWork && activeWork[equip]) || {};
  const live = Object.entries(row).filter(([, d]) => d && (d.status === 'running' || d.status === 'paused')).map(([m]) => m);
  if (live.length === 1) return live[0];
  const d = hasEdi(voyage, 'discharge'), l = hasEdi(voyage, 'loading');
  if (d && !l) return 'discharge';
  if (l && !d) return 'loading';
  return '';
}

/** 계획 — { ask } 이면 되묻는다(아무것도 안 쓴다) · { writes:[{aw:{equip,mode,val}} | {report} | {hatchDone:{center:action}}], readback, by }. */
export function planMirWorkReport(p, { voyageKey, voyage, activeWork = {}, inspectors = {}, relayBy = '', nowMs = Date.now() }) {
  if (!p || p.kind === 'cancel') return { ask: '무슨 보고인지 못 알아들었어요 — «2호기 양하 완료» 처럼 말해 주세요.' };
  const info = (voyage && voyage.info) || {};
  const vsl = info.vsl || String(voyageKey || '').split('_')[0];
  const voyOf = (m) => (m === 'loading' ? (info.voy_l || info.voy) : m === 'discharge' ? (info.voy_d || info.voy) : (info.voy_d || info.voy_l || info.voy)) || '';
  let equip = p.equip || '';
  if (!equip && p.kind !== 'status') {
    const live = Object.entries(activeWork || {}).filter(([, ms]) => ms && Object.values(ms).some((d) => d && d.status === 'running')).map(([e]) => e);
    if (live.length === 1) equip = live[0];
  }
  if (!equip) return { ask: '몇 호기 보고예요? 🐱 «2호기 …» 처럼 호기를 붙여 주세요.' };
  const who = crewNameForEquip(voyageKey, info, inspectors, equip, nowMs);
  const tag = { via: 'mir', relayBy: String(relayBy || '') };
  const by = who.name;
  const writes = [], said = [];
  if (p.kind === 'status') {
    const mode = modeForEquip(voyage, activeWork, equip, p.mode);
    if (!mode) return { ask: `${equip} 양하예요, 선적이에요? 🐱 «${equip} 양하 ${KO_VERB[p.verb]}» 처럼 말해 주세요.` };
    if (p.verb === 'pause' && !p.reason) return { ask: `${equip} ${KO_MODE[mode]} 중단 사유를 붙여 주세요 🐱 (강풍·장비 고장·식사 등) — 아직 안 적었어요.` };
    const cur = ((activeWork || {})[equip] || {})[mode] || null;
    //  감사 중4 — 작업 보고 창에 그 단추가 없는 상태는 적지 않는다(이미 진행 중인 시작·재개, 이미 중단된 중단).
    const st = cur && cur.status;
    if (p.verb === 'start' && st === 'running') return { ask: `${equip} ${KO_MODE[mode]}는 이미 진행 중이에요 🐱 다시 적지 않았어요.` };
    if (p.verb === 'resume' && st === 'running') return { ask: `${equip} ${KO_MODE[mode]}는 이미 진행 중이에요 🐱 재개로 적지 않았어요.` };
    if (p.verb === 'start' && st === 'paused') return { ask: `${equip} ${KO_MODE[mode]}는 중단 중이에요 🐱 «${equip} ${KO_MODE[mode]} 재개» 라고 말해 주세요. 아직 안 적었어요.` };
    if (p.verb === 'pause' && st === 'paused') return { ask: `${equip} ${KO_MODE[mode]}는 이미 중단 중이에요(사유 ${cur.pauseReason || '없음'}) 🐱 다시 적지 않았어요.` };
    const base = { mode, vsl, voy: voyOf(mode) };
    if (p.verb === 'start' || p.verb === 'resume') {
      const o = otherRunningWork(activeWork, equip, mode);
      if (o) {
        const reason = switchReasonOf(mode, p.verb === 'resume' ? 'resume' : 'start');
        const oRow = o.row || { mode: o.mode, vsl, voy: voyOf(o.mode) };
        writes.push({ aw: { equip, mode: o.mode, val: { ...oRow, status: 'paused', pausedAt: nowMs, pauseReason: reason } } });
        writes.push({ report: { type: 'work_status', action: `${o.mode}_pause`, mode: o.mode, equip, reason, by, ...tag,
          message: buildWorkStatusMessage({ vsl, voy: voyOf(o.mode), action: `${o.mode}_pause`, time: nowMs, reason, equip }) } });
        said.push(`${equip} ${KO_MODE[o.mode]} 중단(사유 ${reason})`);
      }
    }
    if (p.verb === 'start') writes.push({ aw: { equip, mode, val: { ...base, status: 'running', startedAt: nowMs } } });
    if (p.verb === 'resume') writes.push({ aw: { equip, mode, val: { ...(cur || base), status: 'running', resumedAt: nowMs, pauseReason: null } } });
    if (p.verb === 'pause') writes.push({ aw: { equip, mode, val: { ...(cur || base), status: 'paused', pausedAt: nowMs, pauseReason: p.reason } } });
    if (p.verb === 'done') writes.push({ aw: { equip, mode, val: null } });
    const action = p.verb === 'resume' ? `${mode}_resume` : `${mode}_${p.verb}`;
    const msg = buildWorkStatusMessage({ vsl, voy: voyOf(mode), action: p.verb === 'resume' ? `${mode}_start` : action, time: nowMs, reason: p.reason || undefined, equip }) + (p.verb === 'resume' ? '\n(재개)' : '');
    writes.push({ report: { type: 'work_status', action, mode, equip, ...(p.reason ? { reason: p.reason } : {}), ...(p.verb === 'done' && !cur ? { manual: true } : {}), by, ...tag, message: msg } });
    said.push(`${equip} ${KO_MODE[mode]} ${KO_VERB[p.verb]}${p.reason ? `(사유 ${p.reason})` : ''}`);
  } else if (p.kind === 'hatch') {
    if (!p.action) return { ask: '해치커버를 열었어요, 닫았어요? 🐱 아직 안 적었어요.' };
    if (!p.bays.length) return { ask: '몇 번 베이 해치커버예요? 🐱 «14번 베이 해치 열었어» 처럼 말해 주세요.' };
    const mode = modeForEquip(voyage, activeWork, equip, '') || 'discharge';
    //  감사 상2 — 그 배 자료에 없는 베이는 적지 않고 되묻는다(20피트 베이 앞뒤까지 본다).
    const have = new Set();
    for (const m of ['discharge', 'loading']) for (const c of Object.values(((voyage || {})[m] || {}).ediContainers || {})) { const b = parseInt(c && c.bay, 10); if (b > 0) have.add(b); }
    const miss = have.size ? p.bays.filter((b) => ![+b - 1, +b, +b + 1].some((x) => have.has(x))) : [];
    if (miss.length) return { ask: `${miss.join('·')}번 베이는 이 배 자료에 없어요 🐱 베이 번호를 다시 말해 주세요. 아직 안 적었어요.` };
    const all = [];
    for (const m of ['discharge', 'loading']) for (const c of Object.values(((voyage || {})[m] || {}).ediContainers || {})) if (c) all.push(c);
    let pairs = {};
    try { pairs = getBayPairs(all, info.imo || '', info.vsl || '') || {}; } catch (e) { console.warn('[미르 작업보고] 베이 짝 계산 실패 — 짝 없이 셉니다', e); }
    let n = p.panelCount || 0, how = '말한 장수';
    if (!(n > 0)) {
      try {
        const d = hatchPanelDetailOf(voyage, mode, p.bays, getShipBayDictData(info.imo || '', info.vsl || ''), (b) => bayGroupCenter(b, pairs), p.action, { withLoad: true });
        if (d && d.count > 0) { n = d.count; how = '앱이 센 장수'; }
      } catch (e) { console.warn('[미르 작업보고] 해치 장수 계산 실패', e); }
    }
    if (!(n > 0)) return { ask: `${p.bays.join('·')}번 베이 커버 장수를 앱이 못 셌어요 🐱 «${p.bays.join(' ')}번 베이 해치 ${p.action === 'open' ? '열었어' : '닫았어'} 2장» 처럼 장수를 붙여 주세요. 아직 안 적었어요.` };
    const msg = buildHatchMessage({ vsl, voy: voyOf(mode), bays: p.bays, action: p.action, time: nowMs, equip, panelCount: n });
    writes.push({ report: { type: 'hatch', action: p.action, mode, bays: p.bays, equip, panelCount: n, by, ...tag, message: msg } });
    const hd = {};
    for (const b of p.bays) { const c = bayGroupCenter(b, pairs); if (c != null) hd[String(c)] = p.action; }
    if (Object.keys(hd).length) writes.push({ hatchDone: hd });
    said.push(`${p.bays.join('·')}번 베이 해치커버 ${p.action === 'open' ? '열림' : '닫힘'} ${n}장(${how}) · ${equip}`);
  } else if (p.kind === 'conbox') {
    if (!p.type || !(p.count > 0)) return { ask: '콘박스 몇 자(20·40) 몇 개예요? 🐱 «1호기 콘박스 20자 3개» 처럼 말해 주세요.' };
    const mode = modeForEquip(voyage, activeWork, equip, '');
    writes.push({ report: { type: 'conbox', conBoxType: p.type, conBoxCount: p.count, equip, by, ...tag,
      message: buildConBoxMessage({ vsl, voy: voyOf(mode), type: p.type, count: p.count, time: nowMs, equip }) } });
    said.push(`${equip} 콘박스 ${p.type}자 ${p.count}개`);
  } else return { ask: '무슨 보고인지 못 알아들었어요.' };
  return { writes, by, who, readback: `📝 ${vsl} ${said.join(' · ')} — ${by} 이름으로 적었어요(${who.src}). 틀렸으면 «보고 취소» 라고 하세요.` };
}
