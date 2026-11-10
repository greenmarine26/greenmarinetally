// 완료를 누를 때 내 호기가 터미널이 그 컨의 베이에 준 호기와 다르면 한 번 묻는 길 — firebase 쓰기 층과 화면(모달)을 잇는 얇은 중계
//   검수사 2026-11-10 «입력 시점에 한 번 묻기» (4.85). 판정은 utils.craneAskOf 한 벌(표시 보정 craneRelabelOf 와 같은 근거).
//   근거 베이는 **지금 완료하는 컨 자신의 자리**다(감사 반영 — 마지막 작업 베이를 쓰면 목록에서 딴 베이 컨을 눌러도 묻는다).
//   화면(VoyagePage)이 registerCraneAsk 로 현재 항차 읽기·묻기 창을 등록한다. 등록이 없으면(연막·브라우저 밖) 호기를 그대로 둔다.
import { craneAskOf, completedPosOf, crewCraneNo, getEquipNumber, setEquipNumber } from './utils.js';

let _reg = null;                 // { getVoyage(voyageKey) → voyage|null, ask({to, from, bay}) → Promise<boolean> }
const _said = new Set();         // «그대로» 라고 답한 (항차|내 호기|베이) — 같은 자리는 다시 묻지 않는다
let _swap = null;                // «예» 직후 한 줄의 여러 컨 완료(호출부가 옛 호기 문자열을 들고 있다)를 같은 호기로 잇는다 { voyageKey, mode, from, to, at }

export function registerCraneAsk(reg) { _reg = reg || null; return () => { if (_reg === reg) _reg = null; }; }

//  완료 직전에 부른다. cns = 이번에 완료하는 컨번호(하나 또는 여럿). 돌려주는 값 = 이번 완료에 적을 호기 문자열(예 '2호기'). 묻지 않거나 «그대로» 면 받은 equip 그대로.
export async function askCraneBeforeComplete(voyageKey, mode, equip, cns, nowMs = Date.now()) {
  try {
    if (!_reg || !voyageKey || !equip) return equip;
    if (_swap && _swap.voyageKey === voyageKey && _swap.mode === mode && _swap.from === equip && nowMs - _swap.at < 60000) return _swap.to;
    const me = crewCraneNo(equip);
    const v = _reg.getVoyage(voyageKey);
    if (!v || !me) return equip;
    const sec = v[mode] || {};
    const list = (Array.isArray(cns) ? cns : [cns]).filter(Boolean);
    let hit = null;
    for (const cn of list) {
      const done = (sec.completed || {})[cn];
      if (done && done.by && !done.src) continue;   // 이미 사람이 완료한 컨 — 어차피 덮지 않는다(3.60-09), 묻지 않는다
      const p = completedPosOf(sec, cn, sec.records || {});
      const bay = p && !p.gone ? parseInt(p.bay, 10) : 0;
      if (!(bay > 0)) continue;   // 컨의 베이를 모르면 묻지 않는다
      const r = craneAskOf(v, mode, bay, me, nowMs);
      if (r) { hit = r; break; }
    }
    if (!hit) return equip;
    const key = `${voyageKey}|${me}|${hit.bay}`;
    if (_said.has(key)) return equip;
    const yes = await _reg.ask({ to: hit.to, from: me, bay: hit.bay });
    if (yes) {
      const n = `${hit.to}호기`;
      if (getEquipNumber() !== n) { setEquipNumber(n); try { window.dispatchEvent(new CustomEvent('equipChanged', { detail: n })); } catch (e) { console.warn('[4.85] 호기 바뀜 알림 실패', e); } }
      _swap = { voyageKey, mode, from: equip, to: n, at: nowMs };
      return n;
    }
    _said.add(key);
    return equip;
  } catch (e) {
    console.warn('[4.85] 호기 묻기 실패 — 호기를 그대로 두고 완료합니다', e);
    return equip;
  }
}
