// 역할: «지금 작업중인 베이» — 호기별 작업 베이(craneBoardOf 한 벌)를 홈 베이 칸이 쓰는 모양으로 바꾼다(5.02).
//  자료는 새로 만들지 않는다 — 수석 실시간 작업 보드와 같은 craneBoardOf·craneBoardSplit 의 답이다.
import { craneBoardOf, craneBoardSplit, _isDeckTier } from './utils.js';

export const WORK_NOW_MIN = 15;   // «지금 일하는 중» 으로 보이는 마지막 완료 이내 분(그보다 오래면 «쉬는 중 · 마지막 …»)

//  반환 { now: Map(베이번호 → [{ no, tier:'홀드'|'데크'|'', ago }]), last: {bay, tier, ago} | null }
//   now  = 최근 WORK_NOW_MIN 분 안에 완료가 있는 호기가 선 베이(이 모드 것만)
//   last = now 가 비었을 때 보일 «마지막 작업» — 자리가 있는 가장 늦은 호기 기록
export function workBaysOf(voyage, mode, nowMs = Date.now()) {
  const out = { now: new Map(), last: null };
  if (!voyage) return out;
  let rows = [];
  try { rows = craneBoardSplit(craneBoardOf(voyage, [], null, nowMs, {}), nowMs).active || []; } catch (e) { console.warn('workBaysOf: 호기 줄 계산 실패', e); return out; }
  const tierOf = (t) => (t === '' || t == null ? '' : (_isDeckTier(t) ? '데크' : '홀드'));
  let best = null;
  for (const c of rows) {
    const bay = parseInt(c.bay, 10);
    if (!Number.isFinite(bay) || bay <= 0 || !c.lastAt) continue;
    if (c.mode && c.mode !== mode) continue;
    const ago = Math.max(0, Math.round((nowMs - c.lastAt) / 60000));
    const it = { no: c.no, tier: tierOf(c.tier), ago };
    if (ago < WORK_NOW_MIN) { const a = out.now.get(bay) || []; a.push(it); out.now.set(bay, a); }
    if (!best || c.lastAt > best.at) best = { at: c.lastAt, bay, tier: it.tier, ago };
  }
  if (best) out.last = { bay: best.bay, tier: best.tier, ago: best.ago };
  return out;
}

//  ★ 5.02 (검수사 2026-11-14 07:01 «베이는 기본적으로 1 (2) 3 이 기본입니다. 여기서 2번베이는 완료라고 되어 있씁니다. 혼동이 됩니다. 지금 1 3 베이가 작업중입니다»)
//    40피트는 짝수 베이에 실리지만 양옆 홀수 두 자리를 함께 덮는다(REF_베이페어링.md §1) — 짝수 베이를 따로 «완료» 로 보이면 1·3 이 일하는 중인데 2 만 끝난 것처럼 읽힌다.
//    그래서 카고플랜 표기(«홀 (짝)홀» 트리오 · «(짝)홀» 페어)와 같은 묶음으로 센다. 묶음 합 = 멤버 합이라 «칸 합 = 위 대수» 는 그대로다.
//    cells = bayProgressOf 의 [{bay, n, done}] (자리 없음 = bay<0 은 묶지 않고 따로) → [{ label, members, n, done, key }] 번호 순서.
export function bayGroupsOf(cells) {
  const real = (cells || []).filter((c) => c && c.bay >= 0).slice().sort((a, b) => a.bay - b.bay);
  const by = new Map(real.map((c) => [c.bay, c]));
  const used = new Set(), out = [];
  const two = (n) => String(n).padStart(2, '0');
  for (const c of real) {
    if (used.has(c.bay)) continue;
    const g = [c]; used.add(c.bay);
    const x = c.bay;
    if (x % 2 === 1) {
      if (by.has(x + 1) && !used.has(x + 1)) {
        g.push(by.get(x + 1)); used.add(x + 1);
        if (by.has(x + 2) && !used.has(x + 2)) { g.push(by.get(x + 2)); used.add(x + 2); }
      } else if (x % 4 === 1 && !by.has(x + 1) && by.has(x + 2) && !used.has(x + 2)) {
        //  표준 번호(40피트 = 4k+2 짝수 베이)에서 그 짝수에 이 항차 컨이 없어도 앞뒤 홀수(4k+1 · 4k+3)는 한 짝이다 — 트윈이 갈라지지 않게(감사 5.02)
        g.push(by.get(x + 2)); used.add(x + 2);
      }
    } else if (by.has(x + 1) && !used.has(x + 1)) { g.push(by.get(x + 1)); used.add(x + 1); }
    out.push({
      key: g[0].bay, members: g,
      label: g.map((m) => (m.bay % 2 === 1 ? two(m.bay) : `(${two(m.bay)})`)).join(' '),
      n: g.reduce((s, m) => s + m.n, 0), done: g.reduce((s, m) => s + m.done, 0),
    });
  }
  return out;
}

//  ★ 5.02 (검수사 2026-11-14 07:08 «트윈 4 · 싱글 앞 1 / 뒤 5 — 남은 베이마다 표기 되어야 작업이 쉬워 집니다»)
//    남은 컨(units 중 완료 아닌 것)의 자리(bayProgressOf 와 같은 규칙 — 계획 EDI, 없으면 records)를 묶음마다 센다.
//    · 트윈 = 묶음의 앞 홀수 베이와 뒤 홀수 베이의 **같은 줄·같은 단**에 둘 다 남은 쌍(한 번에 두 대 — 대수는 «쌍» 으로 센다)
//    · 싱글 앞/뒤 = 한쪽에만 남은 것(앞 = 번호 작은 쪽 = 선수쪽 · 뒤 = 번호 큰 쪽 = 선미쪽) · 홀수 한 칸뿐인 묶음은 «싱글 N» (앞뒤 없음)
//    · 40 = 짝수 베이에 남은 컨(40피트) — 따로 «40피트 N»
//    합: 트윈×2 + 싱글 앞 + 싱글 뒤 + 40 = 그 묶음의 남은 대수(자리를 못 읽은 컨은 «자리 모름» 으로 따로 — 조용히 빼지 않는다).
//    반환 Map(묶음 key → { twin, front, rear, single, f40, unknown }).
export function twinSingleOf(sec, units, groups) {
  //  자리 읽기는 bayProgressOf(HomePage 베이 칸)와 같은 규칙 — 계획 EDI 의 베이/줄/단, 없으면 기록(records)의 것. 칸의 합과 어긋나지 않게 한 벌로 센다.
  const comp = (sec && sec.completed) || {}, edi = (sec && sec.ediContainers) || {}, rec = (sec && sec.records) || {};
  const byCn = {};
  for (const [k, c] of Object.entries(edi)) if (c) byCn[c.cn || k] = c;
  const slot = new Map();   // 'bay|row|tier' → 남은 수
  const nopos = [];
  for (const cn of units || []) {
    if (comp[cn]) continue;
    const c = byCn[cn] || {}, r = rec[cn] || {};
    const bay = parseInt(c.bay || r.bay || '', 10);
    if (!Number.isFinite(bay) || bay < 0) { nopos.push(cn); continue; }
    //  줄·단: 빈 것은 다른 출처(records)로 넘기고, 자릿수는 두 자리로 맞춘다('2' = '02'). 끝내 못 읽으면 어느 것과도 짝짓지 않는다(트윈으로 잘못 세지 않게).
    const pick = (a, b2) => { const x = String(a ?? '').trim(); return x !== '' ? x : String(b2 ?? '').trim(); };
    const nz = (x) => (/^\d+$/.test(x) ? x.padStart(2, '0') : x);
    const row = nz(pick(c.row, r.row)), tier = nz(pick(c.tier, r.tier));
    const k = row === '' || tier === '' ? `${bay}|?|${cn}` : `${bay}|${row}|${tier}`;
    slot.set(k, (slot.get(k) || 0) + 1);
  }
  const out = new Map();
  for (const g of groups || []) {
    const r = { twin: 0, front: 0, rear: 0, single: 0, f40: 0, unknown: 0 };
    const odds = g.members.filter((m) => m.bay % 2 === 1).map((m) => m.bay).sort((a, b) => a - b);
    const lo = odds.length === 2 ? odds[0] : null, hi = odds.length === 2 ? odds[1] : null;
    for (const [k, n] of slot) {
      const [b, row, tier] = k.split('|'); const bay = +b;
      if (!g.members.some((m) => m.bay === bay)) continue;
      if (bay % 2 === 0) { r.f40 += n; continue; }
      if (lo != null && bay === lo) {
        const kk = `${hi}|${row}|${tier}`;
        const m = Math.min(n, slot.get(kk) || 0);
        r.twin += m;
        r.front += n - m;
      } else if (lo != null && bay === hi) {
        const m = Math.min(n, slot.get(`${lo}|${row}|${tier}`) || 0);
        r.rear += n - m;
      } else r.single += n;
    }
    out.set(g.key, r);
  }
  out.nopos = nopos.length;
  return out;
}

//  묶음 한 줄 글 조각 — «트윈 4» · «싱글 앞 1 / 뒤 5» · «40피트 N» (0 인 것은 뺀다). 화면은 조각마다 줄바꿈 없이 그려 칸이 좁으면 조각 단위로 다음 줄로 간다(5.02-01 — 끝이 «…» 로 잘리던 것).
export function twinSingleParts(r) {
  if (!r) return [];
  const a = [];
  if (r.twin > 0) a.push(`트윈 ${r.twin}`);
  if (r.front > 0 && r.rear > 0) a.push(`싱글 앞 ${r.front} / 뒤 ${r.rear}`);
  else if (r.front > 0) a.push(`싱글 앞 ${r.front}`);
  else if (r.rear > 0) a.push(`싱글 뒤 ${r.rear}`);
  if (r.single > 0) a.push(`싱글 ${r.single}`);
  if (r.f40 > 0) a.push(`40피트 ${r.f40}`);
  return a;
}
export function twinSingleText(r) { return twinSingleParts(r).join(' · '); }
