// 호기 이동(철수·이동·복귀) 말을 crane_move 보고로 바꾸는 한 벌 — 미르 칸(MirFab)과 통합검색(SearchPanel)이 같이 쓴다
import { gangEquipNo } from './nlSearch.js';

/** 지금 철수 중인 호기 목록 — 마지막 보고가 철수·이동(떠남)인 호기. [{ equip, ts }] 늦은 순. */
export function withdrawnCranesOf(voyage) {
  const last = new Map();
  const put = (eq, ts, kind) => { if (!eq) return; const cur = last.get(eq); if (!cur || ts >= cur.ts) last.set(eq, { ts, kind }); };
  for (const [k, r] of Object.entries((voyage && voyage.reports) || {})) {
    if (!r || r.type !== 'crane_move') continue;
    const ts = Number(r.ts) || Number(k) || 0;
    const kind = String(r.kind || '');
    //  recentPaceOf 와 같은 읽기 — 철수·이동은 그 호기가 떠남, 복귀·(철수·이동의) 도착 호기는 일하는 중.
    if (kind === 'withdraw' || kind === 'move') put(gangEquipNo(r.equip), ts, 'left');
    if (kind === 'return') put(gangEquipNo(r.equip), ts, 'back');
    if ((kind === 'withdraw' || kind === 'move') && r.to) put(gangEquipNo(r.to), ts + 1, 'back');
  }
  return [...last.entries()].filter(([, v]) => v.kind === 'left').map(([equip, v]) => ({ equip, ts: v.ts })).sort((a, b) => b.ts - a.ts);
}

/** 작업 보고 «호기 이동» 단추가 쓰는 한 벌 — 종류(withdraw·move·return)와 사유를 받아 crane_move 보고 하나를 만든다. 장비교체는 withdraw + 사유 «장비교체»(복귀 보고가 올 때까지 멈춤). */
export function craneMoveReportOf({ kind, equip = '', to = '', reason = '', vsl = '', inspector = '' }) {
  const ko = kind === 'withdraw' ? '철수' : kind === 'return' ? '복귀' : '이동';
  const why = String(reason || '').trim() || ko;
  const eq = gangEquipNo(equip) || ''; const dst = gangEquipNo(to) || '';
  return { type: 'crane_move', kind, equip: eq, to: dst, reason: why, via: 'button', by: inspector || '',
    message: `[호기 ${ko} 보고]\n선박: ${vsl}\n호기: ${eq}${dst ? ` → ${dst}` : ''}\n사유: ${why}` };
}

/** moveSet(parseNaturalQuery 결과) → 쓸 보고 목록. 철수 취소는 가장 최근 철수한 호기의 복귀로 바꾼다. 적을 게 없으면 [] . */
export function craneMoveReportsOf(moveSet, voyage, inspector = '') {
  if (!moveSet) return [];
  const vsl = (voyage && voyage.info && voyage.info.vsl) || '';
  const who = inspector ? ` — ${inspector}` : '';
  const mk = (kind, equip, to) => {
    const ko = kind === 'withdraw' ? '철수' : kind === 'return' ? '복귀' : '이동';
    return { type: 'crane_move', kind, equip: equip || '', to: to || '', reason: ko, via: 'mir', by: inspector || '',
      message: `[호기 ${ko} 보고]\n선박: ${vsl}\n${equip ? `호기: ${equip}${to ? ` → ${to}` : ''}` : `이동: ${to}`}\n(미르에게 말로 알림${who})` };
  };
  const eq = gangEquipNo(moveSet.equip) || ''; const to = gangEquipNo(moveSet.to) || '';
  if (moveSet.kind === 'cancel') {
    //  취소할 철수가 없으면 아무것도 적지 않는다. 호기를 말했으면(«3호기 철수 취소») 그 호기만.
    const ws = withdrawnCranesOf(voyage);
    const w = eq ? ws.find((x) => x.equip === eq) : ws[0];
    return w ? [mk('return', w.equip, '')] : [];
  }
  if (moveSet.kind === 'return') return eq ? [mk('return', eq, '')] : [];
  if (moveSet.kind === 'withdraw') return eq ? [mk('withdraw', eq, to)] : [];
  if (moveSet.kind === 'move') {
    //  «2호기로 이동» 만 말했으면 도착만 적는다(떠난 호기는 앞서 철수 보고로 이미 멈춤).
    return to ? [mk('move', eq, to)] : [];
  }
  return [];
}
