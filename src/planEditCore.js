// 선적 플랜 편집 코어 — V9.07 신규
//   일항사 협의용 확정 플랜을 만들기 위한 순수 로직. Firebase·DOM 무의존.
//   → 단독 편집기(planedit.html)와 검수앱이 같은 코어를 쓴다 (콘앱 파서 불일치 재발 방지).
//
// 원칙:
//   - 초벌 EDI = 위치의 출발점, 선적 리스트 = 평택분 판정(단일 진실은 parseBAPLIE)
//   - 이동 가능 = 평택 선적분 + 쉬프팅(재적부). 통과 고정분은 잠금.
//   - 실선적 데이터(records/bay_actual)는 이 모듈이 절대 만지지 않는다.
import { isPyeongtaekPort, isoToLabel } from './utils.js';

export const STG = '__STG__';

export const pad2 = (v) => String(v ?? '').replace(/\D/g, '').padStart(2, '0').slice(-2);
export const pad3 = (v) => String(v ?? '').replace(/\D/g, '').padStart(3, '0').slice(-3);

// 컨 사이즈 라벨 → '20' | '40' | '45'
export function sizeOf(c) {
  const lbl = String(isoToLabel(c?.iso) || c?.tp || '');
  if (/^45/.test(lbl)) return '45';
  if (/^40/.test(lbl)) return '40';
  return '20';
}

// ── 이동 권한 판정 ──
//   moveable: 평택 선적분(리스트 등록 또는 POL=KRPTK) 또는 쉬프팅(재적부) 대상
//   locked  : 그 외 = 통과 고정분 (일항사 협의 대상 아님)
export function isMoveable(c, listSet, shiftSet) {
  if (!c) return false;
  const cn = c.cn;
  if (shiftSet && shiftSet.has(cn)) return true;
  if (listSet && listSet.has(cn)) return true;
  return isPyeongtaekPort(c.pol);
}

// ── 편집 상태 생성 ──
//   pos[cn] = { bay, row, tier } | { storage: true }
//   base[cn] = 초벌 EDI 원본 좌표 (변경내역 기준점)
//   opts.storageCns : 처음부터 임시창고에 있는 컨 (검수앱 bay_actual='__STG__')
//   opts.lockedCns  : 이동 불가를 외부에서 직접 지정 (지정 시 isMoveable 판정보다 우선)
export function buildState(containers, listCns = [], shiftCns = [], opts = {}) {
  const norm = (x) => String(x).replace(/\s/g, '').toUpperCase();
  const listSet = new Set(listCns.map(norm));
  const shiftSet = new Set(shiftCns.map(norm));
  const stgSet = new Set((opts.storageCns || []).map(norm));
  const lockSet = opts.lockedCns ? new Set([...opts.lockedCns].map(norm)) : null;
  const byCn = new Map();
  const base = {};
  const pos = {};
  const locked = new Set();
  const unplaced = new Set();
  for (const c of containers) {
    const cn = norm(c.cn || '');
    if (!cn) continue;
    byCn.set(cn, c);
    // V9.23-05: EDI에 적부 좌표가 없는 컨(미배정)은 가짜 좌표 00-00-00로 뭉쳐
    //   '좌표중복'으로 잡히고 격자 어디에도 안 그려져 손댈 수 없었다.
    //   실제 업무 흐름대로 임시창고에 넣어 두고, 호출하면 해당 베이에 선적한다.
    // V9.23-08: 호출부가 pad2()로 넘기면 빈 값이 '00'이 된다(ChiefBayEdit 실측).
    //   01단부터 시작하므로 베이·단의 '0'·'00'은 자리 없음과 같다.
    const _noSlot = (v) => { const t = String(v ?? '').trim(); return !t || /^0+$/.test(t); };
    const noSlot = _noSlot(c.bay) || _noSlot(c.tier);
    if (noSlot) unplaced.add(cn);
    const p = (stgSet.has(cn) || noSlot) ? { storage: true } : { bay: pad2(c.bay), row: pad2(c.row), tier: pad2(c.tier) };
    base[cn] = { ...p };
    pos[cn] = { ...p };
    const lock = lockSet ? lockSet.has(cn) : !isMoveable(c, listSet, shiftSet);
    if (lock) locked.add(cn);
  }
  return { byCn, base, pos, locked, listSet, shiftSet, unplaced };
}

const keyOf = (p) => (p && !p.storage ? `${p.bay}-${p.row}-${p.tier}` : null);

// 좌표 → 점유 컨번호 맵
export function occupancy(state) {
  const m = new Map();
  for (const [cn, p] of Object.entries(state.pos)) {
    const k = keyOf(p);
    if (!k) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(cn);
  }
  return m;
}

// ── 배치 (빈 칸 이동 + 자리 맞교환) ──
//   반환: { ok, reason?, swappedWith? }
export function placeAt(state, cn, bay, row, tier, opts = {}) {
  const key = String(cn).replace(/\s/g, '').toUpperCase();
  if (!state.pos[key]) return { ok: false, reason: '없는 컨테이너' };
  if (state.locked.has(key)) return { ok: false, reason: '통과 고정분 — 이동 불가' };

  // 페어 베이(짝/홀)에서 목적 베이는 컨 사이즈로 결정 — 도메인 고정 규칙
  let tgtBay = pad2(bay);
  if (opts.pairEven != null && opts.pairOdd != null) {
    const sz = sizeOf(state.byCn.get(key));
    tgtBay = pad2(sz === '40' || sz === '45' ? opts.pairEven : opts.pairOdd);
  }
  // V9.27: 물리 불가 — 40/45ft를 홀수 베이 단독 슬롯에 (pair 경로는 사이즈로 짝수 강제라 안전)
  if (opts.pairEven == null) {
    const _sz = sizeOf(state.byCn.get(key) || {});
    if ((_sz === '40' || _sz === '45') && parseInt(tgtBay, 10) % 2 === 1) {
      return { ok: false, reason: `40/45피트는 홀수 베이 ${parseInt(tgtBay, 10)}에 못 놓습니다 — 짝수 베이 자리로 놓으세요` };
    }
  }
  const target = { bay: tgtBay, row: pad2(row), tier: pad2(tier) };
  const tk = keyOf(target);

  // 목적 칸 점유자 확인
  let occupant = null;
  for (const [ocn, p] of Object.entries(state.pos)) {
    if (ocn === key) continue;
    if (keyOf(p) === tk) { occupant = ocn; break; }
  }

  if (occupant) {
    if (state.locked.has(occupant)) return { ok: false, reason: `대상 칸 ${occupant} 통과 고정분 — 교환 불가` };
    const from = { ...state.pos[key] };
    state.pos[occupant] = from.storage ? { storage: true } : { ...from };
    state.pos[key] = target;
    return { ok: true, swappedWith: occupant };
  }

  state.pos[key] = target;
  return { ok: true };
}

// ── 여러 대 동시 이동 (상대 위치 유지) ──
//   moves: [{cn, bay, row, tier}] — UI가 격자 인덱스 기준으로 계산해 넘긴다.
//   원자적: 하나라도 막히면 전부 취소한다 (부분 이동으로 플랜이 깨지는 걸 막는다).
//   반환: { ok, reason?, moved }
export function placeMany(state, moves) {
  const set = new Set(moves.map((m) => String(m.cn).replace(/\s/g, '').toUpperCase()));
  const targets = new Map();

  for (const m of moves) {
    const cn = String(m.cn).replace(/\s/g, '').toUpperCase();
    if (!state.pos[cn]) return { ok: false, reason: `${cn} 없는 컨테이너`, moved: 0 };
    if (state.locked.has(cn)) return { ok: false, reason: `${cn} 통과 고정분 — 이동 불가`, moved: 0 };
    const t = { bay: pad2(m.bay), row: pad2(m.row), tier: pad2(m.tier) };
    // V9.27: 물리 불가 — 40/45ft 홀수 베이
    const _sz = sizeOf(state.byCn.get(cn) || {});
    if ((_sz === '40' || _sz === '45') && parseInt(t.bay, 10) % 2 === 1) {
      return { ok: false, reason: `${cn} — 40/45피트는 홀수 베이 ${parseInt(t.bay, 10)}에 못 놓습니다`, moved: 0 };
    }
    const k = `${t.bay}-${t.row}-${t.tier}`;
    if (targets.has(k)) return { ok: false, reason: '선택분끼리 같은 칸으로 겹칩니다', moved: 0 };
    targets.set(k, cn);
  }

  // 선택 밖의 컨이 목적 칸을 쓰고 있으면 전체 취소 (그룹 이동에서는 맞교환하지 않는다)
  for (const [ocn, p] of Object.entries(state.pos)) {
    if (set.has(ocn) || p.storage) continue;
    const k = `${p.bay}-${p.row}-${p.tier}`;
    if (targets.has(k)) return { ok: false, reason: `${ocn}이(가) 이미 그 자리에 있습니다`, moved: 0 };
  }

  for (const [k, cn] of targets) {
    const [bay, row, tier] = k.split('-');
    state.pos[cn] = { bay, row, tier };
  }
  return { ok: true, moved: targets.size };
}

// ── 임시창고 ──
export function moveToStorage(state, cns) {
  const done = [], skipped = [];
  for (const raw of cns) {
    const cn = String(raw).replace(/\s/g, '').toUpperCase();
    if (!state.pos[cn]) { skipped.push([cn, '없는 컨테이너']); continue; }
    if (state.locked.has(cn)) { skipped.push([cn, '통과 고정분']); continue; }
    state.pos[cn] = { storage: true };
    done.push(cn);
  }
  return { done, skipped };
}

export function storageList(state) {
  return Object.keys(state.pos).filter((cn) => state.pos[cn]?.storage);
}

// ── 검증 ──
//   dup      : 같은 bay/row/tier에 2대 이상 (절대 발생하면 안 됨)
//   warnings : 도메인 경고 (40ft 위 20ft 등). 플랜 단계라 차단하지 않고 표시만.
export function validate(state) {
  const dup = [];
  for (const [k, list] of occupancy(state)) if (list.length > 1) dup.push({ cell: k, cns: list });

  const warnings = [];
  // 40ft 위 20ft 적재 불가 (콘 홀 없음)
  const byCell = new Map();
  for (const [cn, p] of Object.entries(state.pos)) {
    if (p.storage) continue;
    byCell.set(`${p.bay}-${p.row}-${p.tier}`, cn);
  }
  for (const [cn, p] of Object.entries(state.pos)) {
    if (p.storage) continue;
    if (sizeOf(state.byCn.get(cn)) !== '20') continue;
    const below = byCell.get(`${p.bay}-${p.row}-${pad2(Number(p.tier) - 2)}`);
    if (below && sizeOf(state.byCn.get(below)) !== '20') {
      warnings.push({ cn, type: '40ft위20ft', msg: `${cn}(20ft)이 ${below}(${sizeOf(state.byCn.get(below))}ft) 위 — 콘 홀 없음` });
    }
  }
  return { dup, warnings, ok: dup.length === 0 };
}

// ── 변경내역 ──
export function diffChanges(state) {
  const out = [];
  for (const [cn, p] of Object.entries(state.pos)) {
    const b = state.base[cn];
    if (!b) continue;
    const now = p.storage ? STG : `${p.bay}${p.row}${p.tier}`;
    const was = b.storage ? STG : `${b.bay}${b.row}${b.tier}`;   // 시작부터 창고인 경우 대응
    if (now === was) continue;
    const c = state.byCn.get(cn) || {};
    out.push({
      cn,
      iso: c.iso || '',
      size: sizeOf(c),
      pol: c.pol || '',
      pod: c.pod || '',
      from: was,
      fromLabel: b.storage ? '임시창고' : `${b.bay}베이 ${b.row}열 ${b.tier}단`,
      to: p.storage ? STG : now,
      toLabel: p.storage ? '임시창고' : `${p.bay}베이 ${p.row}열 ${p.tier}단`,
      shifting: state.shiftSet?.has(cn) || false,
    });
  }
  return out.sort((a, b) => a.cn.localeCompare(b.cn));
}

// ── 초벌 EDI 원문의 LOC+147만 제자리 교체 ──
//   블록 구조: LOC+147+BBBRRTT::5' … EQD+CN+<컨번호>+… (다음 LOC+147 전까지)
//   나머지 세그먼트는 바이트 그대로 보존 → 선사 수신 호환 유지.
//   임시창고 컨은 EDI에서 제외(블록 삭제).
export function rewriteBaplie(rawText, state) {
  const src = String(rawText);
  const segs = src.split("'");
  const out = [];
  let i = 0;
  let replaced = 0, removed = 0, untouched = 0;

  while (i < segs.length) {
    const s = segs[i];
    if (!/^LOC\+147\+/.test(s)) { out.push(s); i++; continue; }

    // 블록 수집: 이 LOC+147 ~ 다음 LOC+147 직전
    let j = i + 1;
    while (j < segs.length && !/^LOC\+147\+/.test(segs[j])) j++;
    const block = segs.slice(i, j);

    // 블록 안의 EQD+CN에서 컨번호 추출
    let cn = '';
    for (const b of block) {
      const m = b.match(/^EQD\+CN\+([A-Z]{4}\s?\d{7})/);
      if (m) { cn = m[1].replace(/\s/g, '').toUpperCase(); break; }
    }
    const p = cn ? state.pos[cn] : null;

    if (p && p.storage) { removed++; i = j; continue; }        // 임시창고 → EDI에서 제외

    if (p) {
      const want = `${pad3(p.bay)}${pad2(p.row)}${pad2(p.tier)}`;
      const cur = (block[0].match(/^LOC\+147\+([0-9A-Z]+)/) || [])[1] || '';
      if (cur !== want) { block[0] = block[0].replace(/^LOC\+147\+[0-9A-Z]+/, `LOC+147+${want}`); replaced++; }
      else untouched++;
    } else untouched++;

    out.push(...block);
    i = j;
  }
  return { text: out.join("'"), replaced, removed, untouched };
}

// ── 요약 통계 (화면 상단용) ──
export function summarize(state) {
  let moveable = 0, locked = 0, stg = 0, shifting = 0;
  for (const cn of Object.keys(state.pos)) {
    if (state.pos[cn]?.storage) stg++;
    if (state.locked.has(cn)) locked++; else moveable++;
    if (state.shiftSet?.has(cn)) shifting++;
  }
  return { total: state.byCn.size, moveable, locked, storage: stg, shifting, changed: diffChanges(state).length };
}
