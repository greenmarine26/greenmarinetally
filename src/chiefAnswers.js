// 수석 통합검색 통계·이력·계산 답변 엔진 (TallyOne 1.69)
//
// 왜 이 파일인가 — 학습서(★자연어_학습서_검수사앱_수석대시보드.md) ②′·2-F 의
//   수석 인텐트(오답·마감·월통계·겹침·자료도착·수집기·해치 실황)와
//   계산 인텐트 96~100(갱 분배·총 무브수·최초 양하·X-RAY 조별·교대 브리핑)을
//   **순수 함수**로 모아 GlobalSearchPage 가 얇게 배선한다. 순수라서 node 시뮬로 그대로 검증된다.
//
// 답의 원칙 (학습서 0절): 결론부터 한 줄 · 데이터 없으면 정직 고지 · 계산 답에는 근거 한 줄과
//   "최종은 포맨 지시가 우선" · 시간 답에는 "2갱 기준, 1갱이면 ×2".
import { isPyeongtaekPort, normalizeBay, shiftingMapForDisplay } from './utils.js';
import { addWorkMinutes, speedFromTerminal, workMinutesBetween } from './nlSearch.js';   // 2.54: 지나간 실작업 시간   // 2.54-01: 판정 한 벌 — 계산은 nlSearch 에 둔다   // 2.62: 조(근무조) 창 계산도 같은 한 벌

const _list = (x) => Array.isArray(x) ? x : (x && typeof x === 'object' ? Object.values(x) : []);
const _ptk = (c, mode) => mode === 'discharge' ? isPyeongtaekPort(c.pod) : isPyeongtaekPort(c.pol);
const _bayN = (c) => parseInt(normalizeBay(c.bay), 10);
const _isDeck = (c) => parseInt(c.tier, 10) >= 80;
const _fmtT = (ms) => { if (!ms) return ''; const d = new Date(ms); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const _hm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// ─── 갱 분배의 공용 뿌리 ─────────────────────────────────────────────
// 베이사전 baysSummary(pairEven)로 «장(시트) 그룹»을 만들고, 그룹별 평택분 무브수를 센다.
// 크레인은 서로 못 넘으므로 절단은 그룹 경계 위 «연속 구간»으로만 한다(학습서 2-F #96).
export function buildGangPlan(voyage, bayDef) {
  const bays = (bayDef && bayDef.baysSummary) || [];
  if (!bays.length) return null;
  const byNo = {};
  bays.forEach((b) => { const n = parseInt(b.bayNo || b.bay, 10); if (Number.isFinite(n)) byNo[n] = b; });
  const nums = Object.keys(byNo).map(Number).sort((a, b) => a - b);
  // 짝(even↔odd) — pairEven 은 홀수 베이에 «내 짝 짝수»로 적혀 있다
  const evenOf = {};   // odd → even
  nums.forEach((n) => { const p = parseInt(byNo[n].pairEven, 10); if (Number.isFinite(p)) evenOf[n] = p; });
  const used = new Set();
  const groups = [];
  for (const n of nums) {
    if (used.has(n)) continue;
    let members = [n];
    if (evenOf[n] != null && byNo[evenOf[n]]) members = [evenOf[n], n];           // 홀수 → (짝수)홀수
    else { const odd = nums.find((m) => evenOf[m] === n); if (odd != null) members = [n, odd]; }
    members.forEach((m) => used.add(m));
    members.sort((a, b) => a - b);
    const defs = members.map((m) => byNo[m]).filter(Boolean);
    groups.push({
      members,
      label: members.length === 2 ? `(${String(members[0]).padStart(2, '0')})${String(members[1]).padStart(2, '0')}` : `B${members[0]}`,
      deckOnly: defs.every((d) => !d.hasHold),
      hatch: Math.max(0, ...defs.map((d) => Number(d.hatchCount) || 0)),
      dis: 0, lod: 0, disDeck: 0, disHold: 0, _disByBay: {},
    });
  }
  groups.sort((a, b) => a.members[0] - b.members[0]);
  const idxOfBay = {};
  groups.forEach((g, i) => g.members.forEach((m) => { idxOfBay[m] = i; }));
  // 평택분 무브 집계
  for (const [mode, kd, kz] of [['discharge', 'dis', true], ['loading', 'lod', false]]) {
    for (const c of _list(voyage?.[mode]?.ediContainers)) {
      if (!_ptk(c, mode)) continue;
      const g = groups[idxOfBay[_bayN(c)]];
      if (!g) continue;
      g[kd]++;
      if (kz) { const bn = _bayN(c); g._disByBay[bn] = (g._disByBay[bn] || 0) + 1; if (_isDeck(c)) g.disDeck++; else g.disHold++; }
    }
  }
  const cargo = groups.filter((g) => g.dis + g.lod > 0);
  if (!cargo.length) return null;
  const total = cargo.reduce((s, g) => s + g.dis + g.lod, 0);
  // 절단점 — 화물 있는 그룹 경계에서 좌/우 합이 가장 균등한 곳
  let best = { i: 0, diff: Infinity };
  let acc = 0;
  for (let i = 0; i < cargo.length - 1; i++) {
    acc += cargo[i].dis + cargo[i].lod;
    const diff = Math.abs(acc - (total - acc));
    if (diff < best.diff) best = { i, diff };
  }
  const seg = (arr) => ({
    groups: arr,
    moves: arr.reduce((s, g) => s + g.dis + g.lod, 0),
    dis: arr.reduce((s, g) => s + g.dis, 0),
    lod: arr.reduce((s, g) => s + g.lod, 0),
    fromBay: Math.min(...arr.flatMap((g) => g.members)),
    toBay: Math.max(...arr.flatMap((g) => g.members)),
  });
  return {
    groups, cargo, total,
    disTotal: cargo.reduce((s, g) => s + g.dis, 0),
    lodTotal: cargo.reduce((s, g) => s + g.lod, 0),
    left: seg(cargo.slice(0, best.i + 1)),
    right: seg(cargo.slice(best.i + 1)),
    diff: best.diff,
  };
}

// #96 갱 분배 — "갱 2개로 하면 베이플랜 어떻게 분배해?"
export function answerGangSplit(voyage, bayDef, shipName = '') {
  const p = buildGangPlan(voyage, bayDef);
  if (!p) {
    if (!_list(voyage?.discharge?.ediContainers).length && !_list(voyage?.loading?.ediContainers).length)
      return `${shipName || '이 배'} — EDI 가 아직 없어 갱 분배를 계산할 수 없습니다.`;
    return `${shipName || '이 배'} — 베이매트릭스(페어 정보)가 없어 갱 분배를 계산할 수 없습니다. 베이매트릭스를 먼저 만들어 주세요.`;
  }
  const L = [];
  L.push(`베이 ${p.left.toBay}/${p.right.fromBay} 사이에서 자릅니다. 1번 갱 ${p.left.fromBay}~${p.left.toBay} = ${p.left.moves}무브 · 2번 갱 ${p.right.fromBay}~${p.right.toBay} = ${p.right.moves}무브, 차이 ${p.diff}.`);
  L.push(`베이플랜은 1번 갱에 ${p.left.groups.map((g) => g.label).join('·')} 장,`);
  L.push(`2번 갱에 ${p.right.groups.map((g) => g.label).join('·')} 장.`);
  const lodNote = (p.left.lod || p.right.lod) ? ` 선적분은 1번 갱 ${p.left.lod} · 2번 갱 ${p.right.lod}.` : '';
  L.push('', `근거 — 크레인은 서로 못 넘으므로 연속 구간으로만 자르고, 양하+선적 합계가 가장 균등한 그룹 경계를 골랐습니다.${lodNote}`);
  L.push('최종은 포맨 지시가 우선입니다.');
  return L.join('\n');
}

// #97 총 무브수 — "총 무브수 몇이야?"
export function answerTotalMoves(voyage, shipName = '') {
  const dis = _list(voyage?.discharge?.ediContainers);
  const lod = _list(voyage?.loading?.ediContainers);
  if (!dis.length && !lod.length) return `${shipName || '이 배'} — EDI 가 아직 없어 무브수를 셀 수 없습니다.`;
  const dp = dis.filter((c) => _ptk(c, 'discharge')).length;
  const lp = lod.filter((c) => _ptk(c, 'loading')).length;
  let shifting = 0;
  try {
    // 2.08-15: 확정∨예측 폴백 한 벌 — 배정표 확정 이적 0이면 허수를 수석 집계에 넣지 않는다.
    shifting = Object.keys(shiftingMapForDisplay(voyage.key || 'k', voyage) || {}).length;
  } catch (e) { shifting = -1; }
  const allPtk = dp === dis.length && lp === lod.length;
  const L = [`${shipName ? shipName + ' — ' : ''}${dp + lp}무브 — 양하 ${dp} + 선적 ${lp}${allPtk ? ' (전량 평택분)' : ` (평택분 기준 · 통과 ${dis.length + lod.length - dp - lp} 제외)`}.`];
  L.push(`시프팅 ${shifting < 0 ? '계산 불가' : shifting} · 해치커버 별도.`);
  return L.join('\n');
}

// #98 최초 양하 시작 — "최초 양하 어디부터야?"
export function answerFirstStart(voyage, bayDef, shipName = '') {
  const p = buildGangPlan(voyage, bayDef);
  if (!p) return answerGangSplit(voyage, bayDef, shipName);   // 같은 정직 고지
  //  2.62-03 (검수사 확정 «보통 선미와 중간부분부터 진행합니다»): 1번 갱은 자기 구간의 뒤쪽 끝(중간부분),
  //  2번 갱은 선미 끝에서 시작해 앞으로 내려온다. 종전 «1번 선수 끝» 은 클로드 추론이었다 — 정정.
  const lg = p.left.groups[p.left.groups.length - 1];          // 중간부분(앞 구간의 뒤 끝) 그룹
  const rg = p.right.groups[p.right.groups.length - 1];        // 선미 끝 그룹
  const nameOf = (g, outerBay) => {
    // 페어면 양하가 실제 실린 멤버 베이 이름으로 (예: (32)33 → 32번)
    const withCargo = g.members.filter((m) => g._disByBay[m]);
    if (withCargo.length === 1) return withCargo[0];
    if (!withCargo.length) return outerBay;
    return withCargo.sort((a, b) => (g._disByBay[b] - g._disByBay[a]) || Math.abs(outerBay - a) - Math.abs(outerBay - b))[0];
  };
  const note = (g) => g.deckOnly && !g.hatch ? `, 데크 전용이라 커버 없이 바로 ${g.dis}무브` : '';
  const L = [];
  L.push(`1번 갱은 ${nameOf(lg, lg.members[lg.members.length - 1])}번 베이 데크부터(중간부분${note(lg)}), 2번 갱은 ${nameOf(rg, rg.members[rg.members.length - 1])}번 베이 데크부터(선미 끝${note(rg)}) — 각자 뒤쪽 끝에서 앞으로 내려옵니다.`);
  L.push('', '근거 — ① 선미·중간부분부터 앞으로(트림 유지 — 검수사 확정) ② 데크부터(홀드는 커버 개방 후) ③ 커버 없는 데크 전용 베이가 구간 끝에 있으면 그쪽 우선.');
  L.push('최종은 포맨 지시가 우선입니다.');
  return L.join('\n');
}

// ─── X-RAY 조별 계산 — 갱 진행 순서(끝→중앙·그룹마다 데크→홀드) 타임라인에 얹는다 ───

// #99 X-RAY 조별 부착 가능 수 — "엑스레이 주간에 몇 대 가능해?"
//   xrayList × EDI 위치 × 갱 진행 순서 × 근무시간표(2-F′). 답에는 근거와 포맨 우선을 붙인다.
export function answerXrayShifts(voyage, bayDef, opts = {}) {
  const shipName = opts.shipName || '';
  const xl = voyage?.discharge?.xrayList || {};
  const cns = Object.keys(xl);
  if (!cns.length) return `${shipName || '이 배'} — X-RAY 리스트가 없습니다(0건).`;
  const plan = buildGangPlan(voyage, bayDef);
  if (!plan) return `${shipName || '이 배'} — 베이매트릭스가 없어 갱 진행 순서를 계산할 수 없습니다. X-RAY 는 ${cns.length}대입니다.`;
  const ed = voyage?.discharge?.ediContainers || {};
  const pace = opts.pace || 25;   // 무브/시간·갱 (2-F′ 기본값)
  const pier = opts.pier || voyage?.info?.pier || '';
  // 작업시작 — planDate 앞 시각(작업시작)이 정본, 없으면 지금
  let startMs = opts.startMs;
  if (!startMs) {
    const m = String(voyage?.info?.planDate || '').match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    startMs = m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : Date.now();
  }
  // 갱별 진행 순서 인덱스
  const gangSegs = [
    { name: '1번 갱', groups: plan.left.groups, outerFirst: true },
    { name: '2번 갱', groups: plan.right.groups.slice().reverse(), outerFirst: true },  // 선미 끝부터
  ];
  const gangOfBay = {};
  plan.left.groups.forEach((g) => g.members.forEach((m) => { gangOfBay[m] = 0; }));
  plan.right.groups.forEach((g) => g.members.forEach((m) => { gangOfBay[m] = 1; }));
  // 그룹 순서대로 데크→홀드 블록 시작 인덱스
  gangSegs.forEach((seg) => {
    let acc = 0;
    seg.groups.forEach((g) => {
      g._deckStart = acc; g._holdStart = acc + g.disDeck; acc += g.dis;
    });
  });
  const rows = [];
  for (const cn of cns.sort()) {
    const c = ed[cn];
    if (!c || !Number.isFinite(_bayN(c))) { rows.push({ cn, shift: '위치미상' }); continue; }
    const gi = gangOfBay[_bayN(c)];
    const seg = gangSegs[gi];
    const g = seg?.groups.find((x) => x.members.includes(_bayN(c)));
    if (!g) { rows.push({ cn, shift: '위치미상' }); continue; }
    // 블록 안 등수 — 같은 블록 X-RAY 끼리는 컨번호순(결과 분류에는 영향 없음)
    const zoneStart = _isDeck(c) ? g._deckStart : g._holdStart;
    const zoneN = _isDeck(c) ? g.disDeck : g.disHold;
    const idx = zoneStart + Math.min(zoneN, Math.max(1, Math.round(zoneN / 2)));   // 블록 중간으로 본다
    const minutes = Math.round((idx / pace) * 60);
    const eta = addWorkMinutes(startMs, minutes, pier);
    const mm = eta.getHours() * 60 + eta.getMinutes();
    const shift = (mm >= 480 && mm < 1050) ? '주간' : '야간';
    rows.push({ cn, c, gang: seg.name, shift, eta });
  }
  const day = rows.filter((r) => r.shift === '주간');
  const night = rows.filter((r) => r.shift === '야간');
  const unk = rows.filter((r) => r.shift === '위치미상');
  const pos = (c) => c ? `${parseInt(c.bay, 10)}-${c.row}-${c.tier}` : '';
  const L = [`X-RAY ${cns.length}대 — 주간조 ${day.length} · 야간조 ${night.length}${unk.length ? ` · 위치미상 ${unk.length}` : ''} (2갱·시간당 ${pace}무브·작업시작 ${_hm(new Date(startMs))} 기준).`];
  if (day.length) L.push('', `주간: ${day.map((r) => `${r.cn.slice(-4)} @${pos(r.c)}`).join(' · ')}`);
  if (night.length) L.push(`야간: ${night.map((r) => `${r.cn.slice(-4)} @${pos(r.c)} (${_hm(r.eta)}쯤)`).join(' · ')}`);
  if (unk.length) L.push(`위치미상: ${unk.map((r) => r.cn.slice(-4)).join(' · ')}`);
  L.push('', '갱 진행 순서(끝→중앙·데크 먼저)로 내려오는 시각을 근무시간표에 얹어 계산했습니다. 1갱이면 시간이 ×2 로 늘어 조가 바뀔 수 있습니다. 최종은 포맨 지시가 우선입니다.');
  return L.join('\n');
}

// #100 교대 브리핑 — "교대 브리핑 해줘"
// ─── 2.62: 조(근무조) 단위 갱 배분 — «내가 출근해서 퇴근까지 할 일» ───────────
//   검수사 확정 2026-08-27: ①왜 — 검수사들이 자기가 할 작업량을 알고 싶다. 갱 총량이 아니라
//   **출근~퇴근까지 작업할 범위**(어느 베이부터 어디까지·몇 대·특수 뭐가 있나)가 답이다.
//   ②기본 2갱, 3갱 대비. ③FR 산식 — 스프레더 교체 왕복 10~20분 + 개당 1~5분(중간값 15분·3분).
//   ④«지금의 브리핑은 일이 끝나가도 답은 같았습니다» — 물을 때마다 «지금» 기준 재계산:
//   완료 기록(compMap)을 빼고, 지금~조 끝 남은 실근무시간(WORK_SHIFTS 한 벌)으로만 계산한다.
//   크레인은 서로 못 넘는다 — 배정은 연속 구간 분할(예상시간 최균등 절단, 그룹 경계 위에서만).
const _isFRlike = (c) => { const t = String(c.iso || ''); return !!c.fr || !!c.oog || (t.length > 2 && 'PU'.includes(t[2])); };
const _isRF = (c) => { const t = String(c.iso || ''); return !!c.rf || (t.length > 2 && t[2] === 'R'); };
const _isDG = (c) => !!c.dg || !!c.dgc || !!c.un;

//  그룹별 특수 분류·예상시간(계획 모델: 일반 25/h · 리퍼/DG 15/h · FR류 그룹당 0.25h+개당 0.05h).
//  실측 페이스(perGangHour)가 오면 그것이 이긴다 — 실측엔 특수 지연이 이미 녹아 있다.
function _gangHours(plan, voyage, perGangHour) {
  const idx = {};
  plan.cargo.forEach((g, i) => { g.frN = 0; g.rfN = 0; g.dgN = 0; g.members.forEach((m) => { idx[m] = i; }); });
  for (const [mode] of [['discharge'], ['loading']]) {
    for (const c of _list(voyage?.[mode]?.ediContainers)) {
      if (!_ptk(c, mode)) continue;
      const g = plan.cargo[idx[_bayN(c)]];
      if (!g) continue;
      if (_isFRlike(c)) g.frN++; else if (_isRF(c)) g.rfN++; else if (_isDG(c)) g.dgN++;
    }
  }
  plan.cargo.forEach((g) => {
    const mv = g.dis + g.lod;
    if (perGangHour > 0) g.hours = mv / perGangHour;
    else {
      const gen = Math.max(0, mv - g.frN - g.rfN - g.dgN);
      g.hours = gen / 25 + (g.rfN + g.dgN) / 15 + (g.frN > 0 ? 0.25 + g.frN * 0.05 : 0);
    }
  });
}

//  연속 구간 N분할 — 절단점 전수(그룹 수십·N≤4 라 가볍다). 예상시간 차가 가장 작은 절단.
function _splitGangs(cargo, N) {
  const n = cargo.length;
  if (n === 0) return null;
  if (N >= n) return { segs: cargo.map((g) => [g]) };
  const out = [];
  const combos = (k, start, acc) => { if (k === 0) { out.push([...acc]); return; } for (let i = start; i <= n - 1 - k; i++) { acc.push(i); combos(k - 1, i + 1, acc); acc.pop(); } };
  combos(N - 1, 0, []);
  let best = null;
  for (const cuts of out) {
    const segs = []; let prev = 0;
    for (const c of cuts) { segs.push(cargo.slice(prev, c + 1)); prev = c + 1; }
    segs.push(cargo.slice(prev));
    const hs = segs.map((sg) => sg.reduce((a, g) => a + g.hours, 0));
    const spread = Math.max(...hs) - Math.min(...hs);
    if (!best || spread < best.spread) best = { segs, spread };
  }
  return best;
}

//  «지금»이 속한(또는 다가오는) 조와 그 조의 끝 시각. 조 경계는 교대 브리핑과 같은 한 벌 —
//  주간 08:00~17:30 · 야간 19:00~익일 06:30 (PCTC/PNCT 공통 경계, 실근무 창은 WORK_SHIFTS 가 가른다).
function _currentShift(nowMs) {
  const d = new Date(nowMs);
  const mm = d.getHours() * 60 + d.getMinutes();
  const at = (base, h, m) => { const x = new Date(base); x.setHours(h, m, 0, 0); return x.getTime(); };
  if (mm >= 480 && mm < 1050) return { name: '주간조', label: '08:00~17:30', endMs: at(d, 17, 30) };
  if (mm >= 1050 && mm < 1140) return { name: '야간조', label: '19:00~06:30', endMs: at(d, 6, 30) + 86400000, startMs: at(d, 19, 0) };   // 교대 사이 — 다가오는 야간
  if (mm >= 1140) return { name: '야간조', label: '19:00~06:30', endMs: at(d, 6, 30) + 86400000 };
  if (mm < 390) return { name: '야간조', label: '19:00~06:30', endMs: at(d, 6, 30) };
  return { name: '주간조', label: '08:00~17:30', endMs: at(d, 17, 30), startMs: at(d, 8, 0) };   // 06:30~08:00 — 다가오는 주간
}

//  본체 — 조 단위 갱 배분. 반환 null(자료 없음) 또는 {shift, gangs[], nGangs, note}.
export function buildGangShift(voyage, bayDef, opts = {}) {
  const nGangs = Math.min(4, Math.max(1, opts.nGangs || 2));
  const nowMs = opts.now || Date.now();
  const pier = voyage?.info?.pier || '';
  const plan = buildGangPlan(voyage, bayDef);
  if (!plan) return null;
  const sp = (opts.tw) ? speedFromTerminal(voyage?.info, opts.tw ? { [String(voyage?.info?.vsl || '').toUpperCase()]: opts.tw } : null) : null;
  const perGangHour = sp && sp.perGangHour > 0 ? sp.perGangHour : 0;
  _gangHours(plan, voyage, perGangHour);
  //  완료 반영 — compMap(앱 기록)의 컨을 그룹에서 뺀다. «일이 끝나가도 답이 같던» 병의 해법.
  //  안 실어 주면 voyage 의 completed 를 직접 읽는다 — 화면 배선을 가볍게(호출부가 재료를 몰라도 된다).
  const comp = opts.compMap || { ...(voyage?.discharge?.completed || {}), ...(voyage?.loading?.completed || {}) };
  const idx = {}; plan.cargo.forEach((g, i) => { g.doneN = 0; g.members.forEach((m) => { idx[m] = i; }); });
  if (comp) {
    const all = {};
    for (const md of ['discharge', 'loading']) for (const c of _list(voyage?.[md]?.ediContainers)) all[String(c.cn || '').toUpperCase()] = c;
    for (const cn of Object.keys(comp)) {
      const c = all[String(cn).toUpperCase()];
      if (!c) continue;
      const g = plan.cargo[idx[_bayN(c)]];
      if (g) g.doneN++;
    }
  }
  plan.cargo.forEach((g) => {
    const mv = g.dis + g.lod;
    g.restN = Math.max(0, mv - g.doneN);
    g.restH = mv > 0 ? g.hours * (g.restN / mv) : 0;
  });
  //  분할은 «전체 예상시간» 기준(작업 중에 갱 경계가 출렁이지 않게), 소진은 «남은 것» 기준.
  const split = _splitGangs(plan.cargo, nGangs);
  if (!split) return null;
  //  조 창 — 지금(또는 조 시작, 또는 작업 시작 중 늦은 것)부터 조 끝까지 실근무시간.
  let shift = _currentShift(nowMs);
  let fromMs = Math.max(nowMs, shift.startMs || 0);
  const ws = String(voyage?.info?.workStartAt || '').trim();
  const wsM = ws.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (wsM) fromMs = Math.max(fromMs, new Date(+wsM[1], +wsM[2] - 1, +wsM[3], +wsM[4], +wsM[5]).getTime());
  else if (voyage?.info && Object.prototype.hasOwnProperty.call(voyage.info, 'workStartAt') && !ws) {
    //  터미널이 «아직 시작 안 함»이라고 말하는 상태 — planDate 앞자리(이미 작업시작 규약)로.
    const m = String(voyage?.info?.planDate || '').match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    if (m) fromMs = Math.max(fromMs, new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime());
  }
  let availH = Math.max(0, workMinutesBetween(fromMs, shift.endMs, pier)) / 60;
  //  ★ 2.62-01: 작업 시작이 이번 조 뒤면(낮에 야간 배를 물으면) 창이 0 — 다가오는 조로 굴려서
  //    «출근 전 미리 보기»가 되게 한다. 최대 3조까지(그 너머는 자료가 더 확실해진 뒤 볼 일).
  let rolled = 0;
  while (availH <= 0.01 && rolled < 3) {
    const nb = new Date(shift.endMs);
    const nm = nb.getHours() * 60 + nb.getMinutes();
    if (nm === 1050) { //  주간 끝 17:30 → 야간 19:00~익일 06:30
      const st = new Date(shift.endMs); st.setHours(19, 0, 0, 0);
      const en = new Date(shift.endMs); en.setHours(6, 30, 0, 0);
      shift = { name: '야간조', label: '19:00~06:30', endMs: en.getTime() + 86400000, startMs: st.getTime() };
    } else { //  야간 끝 06:30 → 주간 08:00~17:30
      const st = new Date(shift.endMs); st.setHours(8, 0, 0, 0);
      const en = new Date(shift.endMs); en.setHours(17, 30, 0, 0);
      shift = { name: '주간조', label: '08:00~17:30', endMs: en.getTime(), startMs: st.getTime() };
    }
    shift.upcoming = true;
    const f2 = Math.max(fromMs, shift.startMs || 0);
    availH = Math.max(0, workMinutesBetween(f2, shift.endMs, pier)) / 60;
    rolled++;
  }
  if (availH <= 0.01) return null;
  //  갱별 소진 — 남은 그룹을 순서대로. from=첫 미완 그룹, to=조 끝에 닿는 그룹.
  const gangs = split.segs.map((seg, gi) => {
    //  ★ 2.62-03 (검수사 확정 «보통 선미와 중간부분부터 진행합니다» — NSFR 실측 GC103=11~13·GC104=23~25 도
    //    중간대 시작으로 일치): 모든 갱이 자기 구간의 **뒤쪽 끝(선미 쪽)부터 앞으로** 소진한다.
    //    왜(검수사 원문) — «물때를 못맞추면 갱을 이동할때 선박 건물 높이로 인해 작업이 지장이 생깁니다.
    //    다리를 들어서 이동해야 하기 때문에» : 크레인이 선미 건물(선교)을 넘으려면 붐을 들어야 하고,
    //    조수에 따라 못 넘는 시간이 생긴다 — 건물 뒤쪽부터 해치우고 앞으로 나오면 다시 넘을 일이 없다.
    //    트림(«1번베이부터 파먹으면 배가 뒤로 뒤집어진다»)도 같은 방향을 가리킨다.
    const ordered = [...seg].reverse();
    const restGroups = ordered.filter((g) => g.restN > 0);
    if (!restGroups.length) return { no: gi + 1, done: true, cnt: 0, restTotal: 0 };
    let left = availH, cnt = 0, fr = 0, rf = 0, dg = 0, lastLabel = restGroups[0].label, finish = true;
    for (const g of restGroups) {
      if (left <= 0.01) { finish = false; break; }
      const use = Math.min(g.restH, left);
      const frac = g.restH > 0 ? use / g.restH : 1;
      cnt += Math.round(g.restN * frac);
      const mv = g.dis + g.lod || 1;
      fr += Math.round(g.frN * (g.restN / mv) * frac);
      rf += Math.round(g.rfN * (g.restN / mv) * frac);
      dg += Math.round(g.dgN * (g.restN / mv) * frac);
      lastLabel = g.label + (use < g.restH - 0.001 ? '(중간)' : '');
      left -= use;
      if (use < g.restH - 0.001) { finish = false; break; }
    }
    const restTotal = restGroups.reduce((a, g) => a + g.restN, 0);
    return { no: gi + 1, done: false, from: restGroups[0].label, to: lastLabel, cnt: Math.min(cnt, restTotal), fr, rf, dg, finish, restTotal,
      fromBay: Math.min(...seg.flatMap((g) => g.members)), toBay: Math.max(...seg.flatMap((g) => g.members)) };
  });
  return { shift, gangs, nGangs, availH, perGangHour, measured: perGangHour > 0 };
}

//  브리핑용 요약 줄(1~2줄) — 음성 머리는 건드리지 않는다. 상세는 «갱 배분» 질문으로.
export function gangBriefLines(gs) {
  if (!gs || !gs.gangs || !gs.gangs.length) return null;
  if (gs.availH <= 0.01) return null;
  const _nm = (gs.shift.upcoming ? '다가오는 ' : '') + gs.shift.name;
  const parts = gs.gangs.map((g) => {
    if (g.done) return `${g.no}번 갱 완료`;
    const sp = [g.fr ? `FR${g.fr}` : null, g.rf ? `리퍼${g.rf}` : null, g.dg ? `DG${g.dg}` : null].filter(Boolean).join('·');
    //  2.62-03: 담당 구간(베이 범위)을 같이 — 조 도달점만 쓰면 «남은 베이는 임자 없나»로 읽힌다(검수사 실측).
    const zone = (g.fromBay != null) ? `(${String(g.fromBay).padStart(2, '0')}~${String(g.toBay).padStart(2, '0')})` : '';
    return `${g.no}번 갱${zone} ${g.from}→${g.to} 약 ${g.cnt}대${sp ? `(${sp})` : ''}${g.finish ? ' ✔끝' : ''}`;
  });
  return [`🏗 ${_nm}(${gs.shift.label}·${gs.nGangs}갱) — ` + parts.join(' / '), `"갱 배분"으로 상세 확인`];
}

//  «갱 배분 (자세히)» · «3갱이면» 상세 답.
export function answerGangShift(voyage, bayDef, opts = {}) {
  const gs = buildGangShift(voyage, bayDef, opts);
  if (!gs) return null;
  const L = [`🏗 ${gs.shift.upcoming ? '다가오는 ' : ''}${gs.shift.name}(${gs.shift.label}) 갱 배분 — ${gs.nGangs}갱 기준${gs.measured ? ' · 실측 페이스' : ' · 계획 페이스(일반 25/특수 15/h·FR 교체 15분+개당 3분)'}`];
  L.push(`이 조 남은 실근무 약 ${gs.availH.toFixed(1)}시간 (쉬는 시간 제외)`);
  gs.gangs.forEach((g) => {
    if (g.done) { L.push(`${g.no}번 갱 — 맡은 구간 완료`); return; }
    const sp = [g.fr ? `⊞FR ${g.fr}` : null, g.rf ? `❄리퍼 ${g.rf}` : null, g.dg ? `☣DG ${g.dg}` : null].filter(Boolean).join(' · ');
    L.push(`${g.no}번 갱 (베이 ${String(g.fromBay).padStart(2, '0')}~${String(g.toBay).padStart(2, '0')}) — ${g.from} 부터 ${g.to} 까지 약 ${g.cnt}대${sp ? ` · ${sp}` : ''}${g.finish ? ' — 이 조에서 구간 마감 예상' : ` (구간 잔여 ${g.restTotal}대 중)`}`);
  });
  L.push(gs.nGangs === 2 ? '«3갱이면» 이라고 물으시면 3갱 기준으로 다시 계산해 드려요.' : '«갱 배분» 이라고 물으시면 기본 2갱 기준이에요.');
  L.push('최종 배분은 포맨 지시가 우선입니다.');
  return L.join('\n');
}

export function answerShiftBriefing(voyage, bayDef, opts = {}) {
  const shipName = opts.shipName || voyage?.info?.vslFull || voyage?.info?.vsl || '이 배';
  const now = opts.now ? new Date(opts.now) : new Date();
  const pier = voyage?.info?.pier || '';
  const plan = buildGangPlan(voyage, bayDef);
  const L = [];
  // ① 전환 시각 — 주·야 조 경계(2-F′): 주간 종료 17:30 → 야간 19:00 / 야간 종료 06:30 → 주간 08:00
  const mmNow = now.getHours() * 60 + now.getMinutes();
  const isDayNow = mmNow >= 480 && mmNow < 1050;
  const hand = new Date(now);
  if (isDayNow) hand.setHours(19, 0, 0, 0);
  else { hand.setHours(8, 0, 0, 0); if (mmNow >= 1050) hand.setDate(hand.getDate() + 1); }
  const endLbl = isDayNow ? '주간 종료 17:30 → 야간 시작 19:00' : '야간 종료 06:30 → 주간 시작 08:00';
  L.push(`${shipName} 교대 브리핑 — 전환 ${endLbl}.`);
  // ② 인수 시점 예상 진행 — 앱 완료 기록이 있으면 그것, 없으면 시작시각+페이스(2갱×25)
  const dis = _list(voyage?.discharge?.ediContainers).filter((c) => _ptk(c, 'discharge'));
  const lod = _list(voyage?.loading?.ediContainers).filter((c) => _ptk(c, 'loading'));
  const total = dis.length + lod.length;
  const doneD = Object.keys(voyage?.discharge?.completed || {}).length;
  const doneL = Object.keys(voyage?.loading?.completed || {}).length;
  if (total) {
    const m = String(voyage?.info?.planDate || '').match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    const startMs = m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : null;
    if (doneD + doneL > 0) {
      L.push(`진행 — 앱 검수 기록 양하 ${doneD}/${dis.length} · 선적 ${doneL}/${lod.length}.`);
    } else if (startMs && startMs < hand.getTime()) {
      // 시작~전환까지 근무 창 안의 분 × 2갱 × 25무브/h
      let mins = 0; let probe = startMs;
      // addWorkMinutes 역산 대신 1분씩 세지 않고 근사: 전환까지 반복 60분 단위 전진
      while (probe < hand.getTime() && mins < 3000) {
        const nx = addWorkMinutes(probe, 30, pier).getTime();
        if (nx > hand.getTime()) break;
        mins += 30; probe = nx;
      }
      const est = Math.min(total, Math.round((mins / 60) * 25 * 2));
      L.push(`인수 시점 예상 — 전체 ${total}무브 중 약 ${est}무브 진행(2갱·시간당 25무브 기준, 1갱이면 절반). 남을 것 약 ${Math.max(0, total - est)}무브.`);
    } else {
      L.push(`물량 — 양하 ${dis.length} + 선적 ${lod.length} = ${total}무브(평택분). 작업 전이거나 시작 시각 미상이라 진행 예상은 생략합니다.`);
    }
  } else {
    L.push('EDI 가 아직 없어 물량·진행 예상을 낼 수 없습니다.');
  }
  // ③ 자료 준비 — 다음 조가 이어받을 자료가 되어 있는가
  const rdy = [];
  [['discharge', '양하'], ['loading', '선적']].forEach(([md, kr]) => {
    const s = voyage?.[md]; if (!s) return;
    const e = _list(s.ediContainers).length, r = _list(s.records).length;
    rdy.push(`${kr} EDI ${e} · 리스트 ${r}${e && r && e !== r ? ` ⚠ ${Math.abs(e - r)}건 차이` : ''}${!e ? ' ⚠ EDI 없음' : !r ? ' ⚠ 리스트 없음' : ''}`);
  });
  if (rdy.length) L.push(`자료 — ${rdy.join(' / ')}.`);
  // ④ 두 배 겹침 — 전환 시각 전후로 같이 걸리는 항차
  if (opts.voyages) {
    const ov = findOverlaps(opts.voyages).filter((o) => o.aKey === voyage._key || o.bKey === voyage._key);
    if (ov.length) ov.forEach((o) => L.push(`⚠ 겹침 — ${o.text}`));
    else L.push('겹치는 배 없음.');
  }
  // ⑤ 특수화물 — 다음 조 초반(구간 바깥 끝)에 걸리는 것 먼저
  const xr = Object.keys(voyage?.discharge?.xrayList || {}).length;
  const rf = dis.concat(lod).filter((c) => c.rf || (c.iso && c.iso[2] === 'R') || (c.tmp && String(c.tmp).trim() !== '')).length;
  const dg = dis.concat(lod).filter((c) => c.dg).length;
  if (xr + rf + dg) {
    const sp = [];
    if (xr) sp.push(`X-RAY ${xr}`);
    if (rf) sp.push(`리퍼 ${rf}`);
    if (dg) sp.push(`위험물 ${dg}`);
    let early = '';
    if (plan) {
      const outer = [plan.left.groups[0], plan.right.groups[plan.right.groups.length - 1]].filter(Boolean);
      const outerBays = new Set(outer.flatMap((g) => g.members));
      const earlyN = dis.filter((c) => outerBays.has(_bayN(c)) && (c.dg || c.rf || (c.iso && c.iso[2] === 'R'))).length;
      if (earlyN) early = ` — 이 중 ${earlyN}대가 구간 끝 베이(초반 순서)에 있습니다`;
    }
    L.push(`특수화물 — ${sp.join(' · ')}${early}.`);
  }
  L.push('', '2갱 기준입니다. 1갱이면 소요 시간을 ×2 로 보십시오. 최종은 포맨 지시가 우선입니다.');
  return L.join('\n');
}

// ─── 수석 통계·이력 ─────────────────────────────────────────────────
// 오답 리포트 — feedback 노드. 미회신 = resolved 아님 + claudeStatus 없음.
export function answerFeedback(fb) {
  if (fb == null) return '오답 리포트를 읽는 중입니다 — 잠시 후 다시 물어봐 주세요.';
  const all = Object.entries(fb || {});
  if (!all.length) return '오답 리포트가 한 건도 없습니다.';
  const un = all.filter(([, v]) => !v.resolved && !v.claudeStatus);
  const pend = all.filter(([, v]) => !v.resolved && v.claudeStatus && v.claudeStatus !== 'fixed');
  const L = [];
  if (!un.length) L.push(`미회신 오답 0건 — 전부 처리됐습니다. (전체 ${all.length}건${pend.length ? ` · 수리 진행 중 ${pend.length}` : ''})`);
  else {
    L.push(`미회신 오답 ${un.length}건.`);
    un.slice(0, 10).forEach(([k, v], i) => {
      L.push(`${i + 1}. ${(v.query || v.text || '').slice(0, 40)} — ${v.voyageVsl || v.voyageKey || ''} ${v.appVersion || ''}`);
    });
  }
  if (pend.length && un.length) L.push(`수리 진행 중 ${pend.length}건.`);
  return L.join('\n');
}

// 수집기 상태 — collector_heartbeat {at, cycleMin, version}
export function answerCollector(hb, now = Date.now()) {
  if (!hb || !hb.at) return '수집기 하트비트가 없습니다 — 수집기 상태를 확인해 주세요.';
  const min = Math.round((now - hb.at) / 60000);
  const cyc = Number(hb.cycleMin) || 5;
  const ok = min <= cyc * 2;
  return `${hb.version || 'MailPilot'} — ${min}분 전 하트비트, ${cyc}분 주기 ${ok ? '정상' : `⚠ 끊김 의심(${min}분째 무신호)`}.`;
}

// 마감 미발송(미생성) — tally_pending {key: {vsl, voy_d, voy_l, archivedAt, tallyMadeAt}}
export function answerTallyPending(tp) {
  if (tp == null) return '마감 목록을 읽는 중입니다 — 잠시 후 다시 물어봐 주세요.';
  const rows = Object.entries(tp || {});
  if (!rows.length) return '완료 저장된 항차가 없습니다.';
  const un = rows.filter(([, v]) => !v.tallyMadeAt).sort((a, b) => (b[1].archivedAt || 0) - (a[1].archivedAt || 0));
  if (!un.length) return `마감텔리 미생성 0건 — 완료 ${rows.length}항차 전부 생성됐습니다.`;
  const L = [`마감텔리 미생성 ${un.length}건 (완료 ${rows.length}항차 중).`];
  un.slice(0, 15).forEach(([k, v], i) => {
    const md = [v.voy_d ? `양하 ${v.voy_d}` : null, v.voy_l ? `선적 ${v.voy_l}` : null].filter(Boolean).join('·');
    L.push(`${i + 1}. ${v.vsl || k} ${md} — 완료 ${_fmtT(v.archivedAt)}`);
  });
  L.push('', '수석 대시보드 → 마감 텔리에서 생성할 수 있습니다.');
  return L.join('\n');
}

// 월 통계·어제 실적·완료 항차 — fbListArchive 결과(경량 메타)로 답한다.
export function answerArchiveStats(list, opts = {}) {
  if (list == null) return '보관소를 읽는 중입니다 — 잠시 후 다시 물어봐 주세요.';
  if (!list.length) return '보관소에 완료 항차가 없습니다.';
  const now = opts.now ? new Date(opts.now) : new Date();
  const bayDict = opts.bayDict || {};
  const carrierOf = (vsl) => (bayDict[String(vsl || '').toUpperCase()]?.carrier || '').toUpperCase();
  const kind = opts.kind || 'month';
  if (kind === 'yesterday' || kind === 'recent') {
    const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
    const from = kind === 'yesterday' ? d0.getTime() - 86400000 : 0;
    const to = kind === 'yesterday' ? d0.getTime() : Infinity;
    const rows = list.filter((a) => a.archivedAt >= from && a.archivedAt < to).slice(0, kind === 'recent' ? 5 : 99);
    if (!rows.length) return kind === 'yesterday' ? '어제 완료 저장된 항차가 없습니다.' : '완료 항차가 없습니다.';
    const L = [kind === 'yesterday' ? `어제 완료 ${rows.length}항차.` : `최근 완료 ${rows.length}항차.`];
    rows.forEach((a) => L.push(`· ${a.voyageKey.replace('_', ' ')} — 양하 ${a.discharge_ptk} · 선적 ${a.loading_ptk} (${_fmtT(a.archivedAt)} 저장)`));
    return L.join('\n');
  }
  // 월 통계 — 이번 달(또는 지난달) 척수·물량·선사 순위
  const base = new Date(now.getFullYear(), now.getMonth() + (opts.prevMonth ? -1 : 0), 1);
  const next = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  const rows = list.filter((a) => a.archivedAt >= base.getTime() && a.archivedAt < next.getTime());
  if (!rows.length) return `${base.getMonth() + 1}월 완료 저장된 항차가 없습니다.`;
  const disSum = rows.reduce((s, a) => s + (a.discharge_ptk || 0), 0);
  const lodSum = rows.reduce((s, a) => s + (a.loading_ptk || 0), 0);
  const ships = new Set(rows.map((a) => a.vsl));
  const byCar = {};
  rows.forEach((a) => { const c = carrierOf(a.vsl) || '(선사 미상)'; const v = byCar[c] = byCar[c] || { n: 0, mv: 0 }; v.n++; v.mv += (a.discharge_ptk || 0) + (a.loading_ptk || 0); });
  const rank = Object.entries(byCar).sort((a, b) => b[1].mv - a[1].mv);
  const L = [`${base.getMonth() + 1}월 완료 ${rows.length}항차(${ships.size}척) — 양하 ${disSum.toLocaleString()} · 선적 ${lodSum.toLocaleString()} · 계 ${(disSum + lodSum).toLocaleString()}대.`];
  L.push('선사 순위(물량):');
  rank.slice(0, 6).forEach(([c, v], i) => L.push(`${i + 1}. ${c} — ${v.mv.toLocaleString()}대 (${v.n}항차)`));
  L.push('', '※ 완료 저장(보관) 기준 집계입니다. 진행 중 항차는 들어 있지 않습니다.');
  return L.join('\n');
}

// 두 배 겹침 — voyages planDate("YYYY-MM-DD HH:MM ~ YYYY-MM-DD HH:MM") 교차
export function findOverlaps(voyages) {
  const parse = (s) => {
    const m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})\s*~\s*(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    if (!m) return null;
    return [new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime(), new Date(+m[6], +m[7] - 1, +m[8], +m[9], +m[10]).getTime()];
  };
  const rows = Object.entries(voyages || {})
    .map(([k, v]) => ({ k, info: v?.info, span: parse(v?.info?.planDate) }))
    .filter((r) => r.span);
  const out = [];
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const [a1, a2] = rows[i].span, [b1, b2] = rows[j].span;
    const s = Math.max(a1, b1), e = Math.min(a2, b2);
    if (s < e) {
      out.push({
        aKey: rows[i].k, bKey: rows[j].k,
        text: `${rows[i].info?.vsl || rows[i].k}(${rows[i].info?.pier || ''}) ↔ ${rows[j].info?.vsl || rows[j].k}(${rows[j].info?.pier || ''}) — ${_fmtT(s)}~${_fmtT(e)} 겹침`,
        from: s, to: e,
      });
    }
  }
  return out.sort((a, b) => a.from - b.from);
}

export function answerOverlaps(voyages) {
  const ov = findOverlaps(voyages);
  if (!ov.length) return '작업 시간이 겹치는 배가 없습니다. (작업 계획 시각이 등록된 항차 기준)';
  const L = [`작업 시간 겹침 ${ov.length}건.`];
  ov.slice(0, 10).forEach((o) => L.push(`· ${o.text}`));
  L.push('', '※ 항차 카드의 작업 계획 시각 기준입니다. 도선 예보가 갱신되면 달라질 수 있습니다.');
  return L.join('\n');
}

// 자료 도착·확정 시각 — dataAt vs dataFixedAt (#62 #63)
// 1.97 (검수사 확정 «자료가 없으면 첫화면(컨 나열)이 아니라 두번째 화면(홈 카드) 정보를 최대한 자세히» +
//   «메일수집에서 보면 패턴이 있을것 — 보통 언제쯤에 edi가 도착하는지도 설명»):
//   컨 자료 없는 배의 브리핑 — 항차 info·자료 상태·PORT-MIS·EDI 도착 패턴(ediPattern)으로 개요를 조립.
export function answerShipOverview(voyage, shipName = '', pm = null, ediPattern = null) {
  if (!voyage) return null;
  const info = voyage.info || {};
  const L = [`${shipName || info.vsl || ''} — 개요 브리핑`];
  const loc = [info.pier, info.berth].filter(Boolean).join(' · ');
  if (loc) L.push(`부두: ${loc}`);
  const voys = [info.voy_d ? `양하 ${info.voy_d}` : null, info.voy_l ? `선적 ${info.voy_l}` : null].filter(Boolean).join(' / ');
  if (voys) L.push(`항차: ${voys}`);
  if (info.planDate) L.push(`작업 예정: ${info.planDate}`);
  if (pm) {
    const f = (x) => { const m = String(x || '').match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/); return m ? `${parseInt(m[2], 10)}/${parseInt(m[3], 10)} ${m[4]}:${m[5]}` : null; };
    const t = [f(pm.eta) ? `입항 ${f(pm.eta)}` : null, f(pm.etd) ? `출항 ${f(pm.etd)}` : null].filter(Boolean).join(' · ');
    if (t) L.push(`PORT-MIS: ${t}`);
  }
  let ediWaiting = false;
  for (const [m, kr, planKey] of [['discharge', '양하', 'planDis'], ['loading', '선적', 'planLod']]) {
    const sec = voyage[m] || {};
    const nList = sec.records ? Object.keys(sec.records).length : 0;
    const nEdi = sec.ediContainers ? Object.keys(sec.ediContainers).length : 0;
    const plan = info[planKey];
    if (!nList && !nEdi) {
      if (plan != null && Number(plan) === 0) L.push(`${kr}: 없음 — 배정에도 0 (정상)`);
      else if (plan != null) { L.push(`${kr}: ⏳ 자료 미도착 — 배정 ${plan}대`); ediWaiting = true; }
      continue;
    }
    const parts = [];
    if (plan != null && Number(plan) > 0) parts.push(`배정 ${plan}대`);
    if (nList) parts.push(`리스트 ${nList}대`);
    if (nEdi) parts.push(`EDI ${nEdi}대`);
    else { parts.push('⏳ EDI 대기 (적부 자리는 EDI 후)'); ediWaiting = true; }
    const done = sec.completed ? Object.keys(sec.completed).length : 0;
    if (done) parts.push(`완료 ${done}`);
    L.push(`${kr}: ${parts.join(' · ')}`);
  }
  // EDI 도착 패턴 — 수집기록 배치 분석(ediPattern/{VSL}): «보통 작업 시작 몇 시간 전에 오는 배»
  const pat = ediPattern && ediPattern[String(info.vsl || '').toUpperCase()];
  if (pat && pat.n) {
    L.push(`EDI 도착 패턴: 이 배는 보통 작업 시작 약 ${pat.medianHrs}시간 전에 옵니다 (과거 ${pat.n}항차, ${pat.minHrs}~${pat.maxHrs}시간 전)${ediWaiting ? ' — 아직 그 범위 안이면 기다려도 정상입니다' : ''}`);
  }
  const dAt = Math.max(Number(voyage.discharge?.dataAt) || 0, Number(voyage.loading?.dataAt) || 0);
  if (dAt) L.push(`자료 갱신: ${_fmtT(dAt)}`);
  L.push('(컨테이너 상세 브리핑은 EDI 도착 후 — «EDI 언제 받았어»·«계획 어떻게 돼» 로도 물을 수 있어요)');
  return L.join('\n');
}

// 1.92 (검수사 확정 «그걸 앱에 반영을 하고 PCTC도 적용을 해야합니다»): 선박별 작업 속도 + 소요 시간 예측.
//   데이터: RTDB shipSpeed/{VSL}_{PIER} — 텔리 리포트 51개 배치 분석(2026-08-19, 정상범위 채택 23항차).
export function isSpeedQuery(q) {
  const Q = String(q || '');
  // 1.92-03 (검수사 실측 «미르야SWSP 몇시간 작업이야?» 무응답): «몇 시간» 화법 전반을 잡는다 — 단 «남았»(진행 질문)은 제외.
  // 1.92-04: «얼마나 걸릴까»(걸릴) 포함 — 걸리/걸려/걸릴 전부.
  return /평균\s*(?:작업\s*)?속도|작업\s*속도|얼마나\s*걸|시간\s*걸릴|걸릴까/i.test(Q)
    || (/몇\s*시간/.test(Q) && !/남(?:았|아)/.test(Q));
}

// ── ★ 2.54 — **앱 기록 말고 터미널이 보고한 실적으로 잰다.**
//  검수사 메모(받은함 2026-08-26 09:13) —
//    *«미르의 작업속도 계산법 수정. 앱으로 계산하면 틀립니다. 앱으로 작업을 잘안하니까요.
//      그럼 수석대쉬보드에 보여주는 자료를 사용해야 합니다. 2갱기준으로 작업한 총갯수 나누기2
//      시작이04시 부터 06시30 08시부터 현지시간으로 계산해서 나눠야 합니다.
//      그걸로 작업종료 시간을 예측해야 합니다»*
//  ★ 그 말이 맞다 — 실측(2026-08-25 활동 기록): 검수사 말고는 앱에 완료를 거의 안 찍는다.
//    그러니 `completed` 로 페이스를 재면 «아직 시작 전» 이라고 답한다(실제로는 작업 중인데).
//  ★ 대신 `terminal_work`(트레드링스 — 수석 대시보드가 보여주는 그것)를 쓴다.
//    거기엔 터미널이 보고한 `startAt`·`disDone`·`lodDone`·`disPlan`·`lodPlan` 이 있고 **앱과 무관하다.**
//  ⚠ 쉬는 시간은 지어내지 않는다 — `WORK_SHIFTS`(검수사 확정 2026-08-13)를 그대로 쓴다.
//    메모의 «04시부터 06시30 08시부터» 가 곧 PCTC 야간 `[240,390]` 과 주간 `[480,720]` 이다.
//  ⚠ 갱 수는 **2갱 기본** — 학습서 2-F′ *«기본 2갱으로 계산을 해주시면 됩니다. 만약 1갱이라면 ×2»*.
//    답에 «2갱 기준»과 «1갱이면 ×2» 를 반드시 같이 말한다(검수사 확정).

export function answerShipSpeed(voyage, shipSpeed, shipName = '', terminalWork = null) {
  if (!voyage) return null;
  const info = voyage.info || {};
  const vsl = String(info.vsl || '').toUpperCase();

  //  ① 터미널 실적이 있으면 그것이 진실이다(검수사 메모 2026-08-26).
  const T = speedFromTerminal(info, terminalWork);
  if (T) {
    const L = [`작업 속도${shipName ? ' — ' + shipName : ''} · 터미널 실적 기준`];
    const hh = Math.floor(T.workedMin / 60), mm = T.workedMin % 60;
    L.push(`시작 ${String(T.tw.startAt || '').slice(5, 16)} — 지금까지 **실작업 ${hh}시간${mm ? ' ' + mm + '분' : ''}**(쉬는 시간 뺀 것) · ${T.done}대 처리`);
    L.push(`**2갱 기준 갱당 시간당 ${T.perGangHour.toFixed(1)}대** (1갱이면 ×2 하시면 됩니다)`);
    if (T.left > 0) {
      const remainMin = Math.round((T.left / (T.perGangHour * 2)) * 60);
      const eta = addWorkMinutes(Date.now(), remainMin, T.pier);
      const rh = Math.floor(remainMin / 60), rm = remainMin % 60;
      const p = (n) => String(n).padStart(2, '0');
      L.push(`남은 ${T.left}대 — **약 ${rh ? rh + '시간 ' : ''}${rm}분** 뒤, `
        + `**${p(eta.getMonth() + 1)}-${p(eta.getDate())} ${p(eta.getHours())}:${p(eta.getMinutes())}** 쯤 끝납니다`);
      L.push('(쉬는 시간·조 경계를 건너뛰어 계산 — 중식·야식·티타임 포함)');
    } else {
      L.push(`계획 ${T.plan}대를 다 했습니다.`);
    }
    return L.join('\n');
  }

  //  ② 터미널 실적이 없을 때만 옛 방식(텔리 리포트 평균)으로 간다 — 그 사실을 밝힌다.
  if (!shipSpeed) return '작업 속도 자료를 아직 못 불러왔어요 — 잠시 후 다시 물어봐 주세요.';
  const pier = String(info.pier || '').toUpperCase().includes('PCTC') ? 'PCTC'
    : String(info.pier || '').toUpperCase().includes('PNCT') ? 'PNCT' : null;
  let rec = (pier && shipSpeed[`${vsl}_${pier}`]) || shipSpeed[`${vsl}_PNCT`] || shipSpeed[`${vsl}_PCTC`] || null;
  const L = [`작업 속도${shipName ? ' — ' + shipName : ''}`,
    '⚠ 터미널 실적이 아직 없어 **과거 평균**으로 말씀드립니다 — 실제와 다를 수 있어요.'];
  if (rec) {
    L.push(`${rec.vsl}(${rec.pier}) 평균 ${rec.movesPerCraneHour} 무브/크레인h — 표본 ${rec.voys}항차 ${rec.moves}무브${rec.voys < 3 ? ' ⚠ 표본 적음(참고치)' : ''}`);
  } else {
    // 같은 부두 전체 평균 폴백
    const same = Object.values(shipSpeed).filter((v) => v && typeof v === 'object' && v.pier && (!pier || v.pier === pier));
    if (same.length) {
      const mv = same.reduce((s, v) => s + v.moves, 0); const h = same.reduce((s, v) => s + v.craneHours, 0);
      L.push(`이 배 실측 기록은 아직 없어요 — ${pier || '전체'} 평균 ${(mv / h).toFixed(1)} 무브/크레인h (${same.length}종 선박) 기준으로 말씀드려요`);
      rec = { movesPerCraneHour: +(mv / h).toFixed(1), avgCranes: 1.5, pier: pier || '전체' };
    } else {
      L.push('실측 기록이 아직 없어요 — 텔리 리포트가 쌓이면 이 배 평균이 잡힙니다.');
      return L.join('\n');
    }
  }
  // 소요 시간 예측 — 배정(planDis/planLod) 우선, 없으면 리스트 수
  const nD = Number(info.planDis) || (voyage.discharge?.records ? Object.keys(voyage.discharge.records).length : 0);
  const nL = Number(info.planLod) || (voyage.loading?.records ? Object.keys(voyage.loading.records).length : 0);
  const total = nD + nL;
  if (total && rec.movesPerCraneHour) {
    const cr = Math.max(1, Math.round(rec.avgCranes || 1));
    const hrs = total / (rec.movesPerCraneHour * cr);
    const hh = Math.floor(hrs); const mm = Math.round((hrs - hh) * 60);
    const hrs1 = total / rec.movesPerCraneHour;
    const h1 = Math.floor(hrs1); const m1 = Math.round((hrs1 - h1) * 60);
    L.push(`이번 물량 ${total}무브(양하 ${nD}+선적 ${nL}) — 크레인 ${cr}대가 같이 하면 **약 ${hh}시간 ${mm ? mm + '분' : ''}**${cr > 1 ? ` (1대면 약 ${h1}시간 ${m1}분)` : ''}`);
    L.push('(대수=무브로 계산 — 트윈 미반영이라 20피트 트윈이 많으면 실제는 더 빠릅니다 · 해치커버·시프팅·식사 별도)');
  }
  return L.join('\n');
}

// 1.91-01 (검수사 확정 «선적 계획을 알면 양하 계획도 알겠죠?»): 전망 답을 양하·선적 공용으로.
export function isPlanOutlookQuery(q) {
  const Q = String(q || '');
  // 1.91-02 (검수사 확정 «계획 하나지만 답은 양하일지 선적일지 모릅니다»): 모드 없이 «계획 …»만 물어도 잡는다.
  return /(?:계획|플랜).{0,14}(?:어떻|진행|전망|될\s*것|될것|돼|같아)/i.test(Q)
    || /(?:양하|선적)\s*(?:계획|전망|플랜)\s*(?:은|는|\?|$)/i.test(Q)
    || (/(양하|선적)/.test(Q) && /(?:어떻게|어찌).{0,10}(?:진행|전망|될|돼|같아)/i.test(Q));
}

export function outlookModeOf(q) {
  const Q = String(q || '');
  if (/양하/.test(Q)) return 'discharge';
  if (/선적/.test(Q)) return 'loading';
  return null;
}

// 1.91-02: 모드 미지정(null)이면 양하·선적 **둘 다** 답한다 — «두가지 다를 알고 있어야 합니다»(검수사).
export function answerPlanOutlookBoth(voyage, shipName = '') {
  const parts = [];
  for (const m of ['discharge', 'loading']) {
    const info = voyage?.info || {};
    const sec = voyage?.[m];
    const plan = Number(m === 'discharge' ? info.planDis : info.planLod) || 0;
    const has = (sec && ((sec.records && Object.keys(sec.records).length) || (sec.ediContainers && Object.keys(sec.ediContainers).length))) || plan;
    if (!has) continue;   // 자료도 배정도 없는 쪽은 생략 (한쪽 항차)
    const a = answerPlanOutlook(voyage, m, '');
    if (a) parts.push(a);
  }
  if (!parts.length) return `${shipName ? shipName + ' — ' : ''}양하·선적 자료가 아직입니다.`;
  return (shipName ? shipName + '\n' : '') + parts.join('\n\n');
}

export function answerPlanOutlook(voyage, mode = 'loading', shipName = '') {
  if (!voyage) return null;
  const info = voyage.info || {};
  const kr = mode === 'discharge' ? '양하' : '선적';
  const sec = voyage[mode] || {};
  const L = [`${kr} 계획 전망${shipName ? ' — ' + shipName : ''}`];
  if (info.planDate) L.push(`작업 예정: ${info.planDate}`);
  const plan = Number(mode === 'discharge' ? info.planDis : info.planLod) || 0;
  const nList = sec.records ? Object.keys(sec.records).length : 0;
  const nEdi = sec.ediContainers ? Object.keys(sec.ediContainers).length : 0;
  const qty = [];
  if (plan) qty.push(`배정 ${plan}대`);
  if (nList) qty.push(`리스트 ${nList}대${plan ? (nList === plan ? ' ✓' : ` (배정 대비 ${nList - plan > 0 ? '+' : ''}${nList - plan})`) : ''}`);
  if (nEdi) qty.push(`EDI ${nEdi}대`);
  if (qty.length) L.push(`물량: ${qty.join(' · ')}`);
  const edi = sec.raw?.edi || null;
  if (edi && edi.uploadedAt) {
    const fn = String(edi.fileName || '');
    const isPre = /PRE|PRELIM|예비|가배정/i.test(fn);
    const recv = Number(edi.recvAt) || 0;
    L.push(`${kr} EDI: ${recv ? _fmtT(recv) + ' 수신' : _fmtT(edi.uploadedAt) + ' 반영'} · «${fn}»${isPre ? ' — ⚠ PRE(예비)판, 최종본 대기' : ''}`);
  } else if (nList) {
    L.push(`${kr} EDI: 아직 — 리스트만 도착${mode === 'loading' ? ' (적부 자리는 EDI 후 확정)' : ''}`);
  } else {
    L.push(`${kr} 자료가 아직입니다 — 리스트·EDI 가 오면 다시 물어보세요`);
  }
  const done = sec.completed ? Object.keys(sec.completed).length : 0;
  if (done) L.push(`진행: ${kr}확인 ${done}대 완료${nList ? ` / ${nList}대` : ''}`);
  L.push('(상세는 "브리핑" · 자료 시각은 "EDI 언제 받았어")');
  return L.join('\n');
}

// 하위 호환(1.91) — 선적 전용 이름은 공용 함수로 위임.
export function isLoadOutlookQuery(q) { return isPlanOutlookQuery(q) && outlookModeOf(q) === 'loading'; }
export function answerLoadOutlook(voyage, shipName = '') { return answerPlanOutlook(voyage, 'loading', shipName); }

// 1.90 (검수사 테스트 질문 «SWSP 선적 EDI 자료 몇시쯤에 받은거야? 최종본 맞아?»): 트리거 공용(통합검색+항차 검색창).
export function isDataArrivalQuery(q) {
  const Q = String(q || '');
  return /(?:자료|리스트|EDI).{0,12}(?:언제|몇\s*시).{0,10}(?:왔|도착|들어|받)|(?:자료|리스트|EDI).{0,8}(?:언제|몇\s*시)$|도착\s*시각|확정\s*(?:뒤|후|이후).{0,10}(?:왔|갱신|자료)|최종본|파이널.{0,6}(?:맞|인가|이야)/i.test(Q);
}

export function answerDataArrival(voyage, shipName = '') {
  if (!voyage) return null;
  const L = [];
  const fx = Number(voyage.info?.dataFixedAt) || 0;
  let lateAfterFix = false;
  [['discharge', '양하'], ['loading', '선적']].forEach(([md, kr]) => {
    const sec = voyage[md];
    if (!sec) return;
    const at = Number(sec.dataAt) || 0;
    // 1.90: EDI 파일 단위 시각 + 최종본 판정 — 파일명(PRE/최종형)과 EDI·리스트 수량 대조가 근거.
    const edi = sec.raw?.edi || null;
    if (edi && edi.uploadedAt) {
      const fn = String(edi.fileName || '');
      const nEdi = sec.ediContainers ? Object.keys(sec.ediContainers).length : 0;
      const nList = sec.records ? Object.keys(sec.records).length : 0;
      // 1.90-01 (검수사 확정 «수집기가 기록한 시간이 있을것입니다. 그걸 말하면 될것»): 메일 수신 시각(recvAt)이 정답.
      const recv = Number(edi.recvAt) || 0;
      L.push(recv
        ? `${kr} EDI — ${_fmtT(recv)} 메일 수신 (앱 반영 ${_fmtT(edi.uploadedAt)}) · «${fn}»${fx && edi.uploadedAt > fx ? ' ⚠ 확정 이후' : ''}`
        : `${kr} EDI — ${_fmtT(edi.uploadedAt)} 앱 반영 · «${fn}»${fx && edi.uploadedAt > fx ? ' ⚠ 확정 이후' : ''}`);
      if (fx && edi.uploadedAt > fx) lateAfterFix = true;
      const isPre = /PRE|PRELIM|예비|가배정/i.test(fn);
      const isFin = /FINAL|FNL|최종|LOAD\s*EDI/i.test(fn);
      let verdict;
      if (isPre) verdict = '⚠ 파일명이 PRE(예비)판 — 최종본이 더 올 수 있습니다';
      else {
        const why = [];
        if (isFin) why.push('파일명 최종형');
        if (nEdi && nList) why.push(nEdi === nList ? `EDI ${nEdi}대 = 리스트 ${nList}대 ✓` : `⚠ EDI ${nEdi} vs 리스트 ${nList} — ${Math.abs(nEdi - nList)}대 차이`);
        else if (nEdi) why.push(`EDI ${nEdi}대 (리스트 미도착 — 수량 대조 불가)`);
        const cntOk = nEdi > 0 && nEdi === nList;
        verdict = (isFin && cntOk) ? `최종본으로 보입니다 — ${why.join(' · ')}`
          : cntOk ? `수량은 일치 — ${why.join(' · ')}`
            : why.length ? why.join(' · ') : '판단 근거 부족 — 리스트 도착 후 다시 물어보세요';
      }
      L.push(`  최종본 판단: ${verdict}`);
    }
    if (at) {
      L.push(`${kr} 자료 ${_fmtT(at)} 갱신${fx && at > fx ? ' ⚠ 확정 이후' : ''}`);
      if (fx && at > fx) lateAfterFix = true;
    } else if (!edi) L.push(`${kr} — 자료 도착 시각 기록 없음`);
  });
  if (!L.length) return `${shipName || '이 배'} — 자료 도착 기록이 없습니다.`;
  const head = fx
    ? (lateAfterFix ? `⚠ 확정(${_fmtT(fx)}) 이후에 자료가 또 왔습니다 — 다시 확인이 필요합니다.` : `자료 확정 ${_fmtT(fx)} — 이후 갱신 없음.`)
    : '자료 확정 기록은 아직 없습니다.';
  return `${shipName ? shipName + '\n' : ''}${head}\n${L.join('\n')}`;
}

// 해치 개폐 실황 — voyages/{key}/reports 의 type:'hatch' 최종 상태 (#12) + 구조(#11)
export function answerHatchStatus(voyage, bayDef, shipName = '') {
  const reports = _list(voyage?.reports).filter((r) => r && r.type === 'hatch').sort((a, b) => (a.ts || 0) - (b.ts || 0));
  // 구조 — 페어 그룹 단위 해치 수(멤버 공유라 최댓값)
  let structLine = '';
  const plan = bayDef ? buildGangPlan(voyage, bayDef) : null;
  if (bayDef?.baysSummary?.length) {
    const groups = plan ? plan.groups : null;
    if (groups) {
      const holdGroups = groups.filter((g) => !g.deckOnly);
      const totalHatch = holdGroups.reduce((s, g) => s + (g.hatch || 0), 0);
      if (totalHatch) structLine = `이 배 해치 ${totalHatch}장 — 홀드 있는 그룹 ${holdGroups.length}곳.`;
    }
  }
  if (!reports.length) {
    return `${shipName ? shipName + ' — ' : ''}해치 개폐 보고가 아직 없습니다.${structLine ? '\n' + structLine : ''}`;
  }
  // 베이(묶음)별 최종 상태
  const last = {};
  reports.forEach((r) => { const key = String(r.bays || r.bay || '?'); last[key] = r; });
  const open = Object.values(last).filter((r) => /open|열/.test(String(r.action || '')));
  const closed = Object.values(last).filter((r) => !/open|열/.test(String(r.action || '')));
  const fmt = (r) => `${r.bays || ''}${r.equip ? ` (${r.equip}호기` : ''}${r.equip ? ` ${_fmtT(r.ts)})` : ` (${_fmtT(r.ts)})`}`;
  const L = [`${shipName ? shipName + ' — ' : ''}보고 기준 해치: 열림 ${open.length}곳 · 닫힘 ${closed.length}곳.`];
  if (open.length) L.push(`열림: ${open.map(fmt).join(' · ')}`);
  if (closed.length) L.push(`닫힘: ${closed.map(fmt).join(' · ')}`);
  if (structLine) L.push(structLine);
  return L.join('\n');
}
