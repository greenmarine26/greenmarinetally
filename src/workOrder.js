// 양하 순서 조건(4.09) — 호기별로 기억한 «육상부터·해상부터 + 풀·엠티·일반·리퍼·20·40부터» 를 읽고 고르는 한 벌 (자동 가이드·미르·시험이 같이 쓴다)
//
//  검수사 2026-10-07 «양하 방법을 해상 부터 육상부터 20부터 40부터 리퍼부터 이런조건들을 다 적용할수 있게 해주세요» ·
//  «장비 기사의 작업 방법이 틀려서 입니다» · «리퍼부터 일반부터등등».
//  저장 자리 — 항차 info.workOrder/{N호기} = { rowFrom:'land'|'sea', prefs:'RF,20', at, by }.
//    호기를 모르는 기기는 '전체' 칸에 쓴다. 읽을 때는 그 호기 칸 → '전체' 칸 → 옛 항차 info.seqRowFrom(로우 방향만) 순서다.
//  prefs 는 «먼저 고른 것이 우선» 인 순서 목록이다. 서로 어긋나는 조건은 한 번에 못 건다(togglePref).
//  ⚠ 이 파일은 순수 함수만 둔다(firebase·utils 를 부르지 않는다) — guidedQueue·mir·firebase 어디서 불러도 순환이 안 생긴다.

export const ORDER_PREF_KEYS = ['F', 'E', 'GEN', 'RF', '20', '40'];
export const ORDER_PREF_LABEL = { F: '풀', E: '엠티', GEN: '일반', RF: '리퍼', '20': '20', '40': '40' };   // «○부터» 앞 글자
export const ALL_EQUIP_KEY = '전체';

//  함께 걸 수 없는 조건 — 새로 누른 쪽이 이긴다. 엠티는 «풀 일반·풀 리퍼» 와 모순이고(1.57 «리퍼 엠티는 일반 엠티와 같다»), 20↔40·일반↔리퍼도 한 가지만.
const CLASH = { F: ['E'], E: ['F', 'GEN', 'RF'], GEN: ['RF', 'E'], RF: ['GEN', 'E'], '20': ['40'], '40': ['20'] };

export function normalizePrefs(v) {
  const list = Array.isArray(v) ? v : String(v == null ? '' : v).split(',');
  const out = [];
  for (const x of list) { const k = String(x).trim(); if (ORDER_PREF_KEYS.includes(k) && !out.includes(k)) out.push(k); }
  return out;
}

//  누르면 켜고(맨 뒤 우선순위로), 다시 누르면 끈다. 어긋나는 것은 빼고 켠다.
export function togglePref(list, key) {
  const cur = normalizePrefs(list);
  if (!ORDER_PREF_KEYS.includes(key)) return cur;
  if (cur.includes(key)) return cur.filter((k) => k !== key);
  return [...cur.filter((k) => !(CLASH[key] || []).includes(k)), key];
}

//  RTDB 키로 못 쓰는 글자(. # $ [ ] /)는 밑줄로 바꾼다. 호기 이름은 «3호기» 처럼 안전하지만 손으로 넣은 값을 막아 둔다.
export function workOrderKey(equip) {
  const k = String(equip || '').trim().replace(/[.#$[\]/]/g, '_');
  return k || ALL_EQUIP_KEY;
}

//  항차 info 와 이 기기의 호기로 지금 적용할 순서를 읽는다. 항상 { rowFrom, prefs, from, at, by } 를 돌려준다.
//   from = 'equip'(그 호기 칸) | 'all'('전체' 칸) | 'legacy'(옛 항차 seqRowFrom 만) | 'none'(아무 설정 없음)
export function workOrderOf(info, equip) {
  const w = info && typeof info === 'object' ? info.workOrder : null;
  const ek = workOrderKey(equip);
  let rec = null, from = 'none';
  if (w && typeof w === 'object') {
    if (equip && w[ek] && typeof w[ek] === 'object') { rec = w[ek]; from = 'equip'; }
    else if (w[ALL_EQUIP_KEY] && typeof w[ALL_EQUIP_KEY] === 'object') { rec = w[ALL_EQUIP_KEY]; from = 'all'; }
  }
  const legacy = info && info.seqRowFrom === 'sea' ? 'sea' : 'land';
  const own = rec && (rec.rowFrom === 'sea' || rec.rowFrom === 'land') ? rec.rowFrom : null;
  if (!rec && info && info.seqRowFrom === 'sea') from = 'legacy';
  return { rowFrom: own || legacy, prefs: normalizePrefs(rec && rec.prefs), from, at: (rec && rec.at) || 0, by: (rec && rec.by) || '' };
}

//  한 줄 문구 — «육상부터 · 리퍼 → 20부터». 화면 줄·미르 답이 같은 글을 쓴다.
export function workOrderText(wo) {
  const row = wo && wo.rowFrom === 'sea' ? '해상부터' : '육상부터';
  const p = normalizePrefs(wo && wo.prefs);
  return p.length ? `${row} · ${p.map((k) => `${ORDER_PREF_LABEL[k]}부터`).join(' → ')}` : row;
}
