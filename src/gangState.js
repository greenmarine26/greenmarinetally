// 갱 상태·베이 정리 — 미르 «N번 베이 정리해줘» 가 읽는 순수 판정과 답 문구 한 벌(읽기 전용, 쓰기 없음).
//  ★ TallyOne 4.81 — 검수사 2026-11-09 «일반 사용자가 몇번베이 정리해줘 하면 그때 두자료를 읽어서 작업 할수 있게 해주는 것» ·
//    «30분전 데이터로도 2갱중에 1갱이 앱사용자가 아니면 앱은 그갱이 어디 작업중인지 알수 있습니다. 그때 실사용자가 그베이를 지정하면 미르가 알아서 정리해주는것입니다».
//  두 자료 = ① 앱 입력(completed 의 by 가 있는 행) ② 터미널 반영(completed 의 src:'term' — 수집기 실시간 스위치가 1분마다 추가만 한다).
//  터미널 행에는 자리(pos)가 없다 — 장·베이는 EDI 계획 자리로 읽는다(컨 행의 bay·row·tier = completedPosOf 와 같은 차례). 동방(PNCT) 터미널 행에는 호기(equip)도 없다.
//  판정을 새로 만들지 않는다 — 남은 수는 GuidedWorkPanel 의 remaining 규칙(buildOccupancy·posKey), 장 묶음은 getBayPairs + bayGroupCenter 그대로다.
//  입력은 컨 행 목록이다(검수앱 allContainers · 미르 flattenVoyages · 콘앱 ctx.containers 모두 _mode·_ptk·_comp·bay·row·tier 를 싣는다) — 두 앱이 같은 함수를 불러 같은 답을 낸다.
import { isTermApplied, crewCraneNo, buildOccupancy, posKey, isHatchSkipShipInfo, koJosa } from './utils.js';
import { bayGroupCenter } from './swapGrade.js';
import { getBayPairs } from './twin.js';

export const APP_ACTIVE_MIN = 30;     // 앱 사용 중 호기 = 그 호기의 마지막 앱 입력이 이 분 안(조 등록은 쓰지 않는다 — 등록자와 실제 입력자가 다르다)
export const FALLBACK_WINDOW_MIN = 20; // 호기를 모를 때(동방) 장의 «최근 작업» 창

const modeOf = (c) => (c._mode || c.mode || '');
const compOf = (c) => c._comp || c.comp || null;
const isWork = (c) => !!(c._ptk || c._shift);
const isApp = (r) => !!(r && String(r.by || '').trim() && !isTermApplied(r));
const isDeckTier = (c) => (parseInt(c.tier, 10) || 0) >= 80;

/** 이 장의 홀드에 터미널 반영 기록이 있는가 — 있으면 그 기록 중 가장 늦은 시각(없으면 0). 양하 해치 커버 «열림 증거»로 쓴다(GuidedWorkPanel 의 열까요 물음).
 *  rows = 컨 행 목록(_mode·_ptk·_shift·_comp·bay·tier) · gcFn = 베이 → 장 center 함수(화면의 groupCenterOf). */
export function termHoldOpenAt(rows, mode, center, gcFn) {
  if (center == null || typeof gcFn !== 'function') return 0;
  let at = 0;
  for (const c of rows || []) {
    if (!c || modeOf(c) !== mode || !isWork(c) || !c.bay) continue;
    const comp = compOf(c);
    if (!comp || !isTermApplied(comp) || isDeckTier(c)) continue;
    if (gcFn(c.bay) !== center) continue;
    const a = Number(comp.at) || 0;
    if (a > at) at = a;
  }
  return at;
}

/** 이 장의 홀드를 터미널이 이미 시작했는가(= 커버가 열렸다는 증거) — GuidedWorkPanel «해치커버 열까요?» 물음이 쓴다.
 *  증거는 터미널 반영 홀드 기록이다. 단 마지막 해치 보고가 «닫힘»이고 그 시각이 증거보다 늦거나 같으면(닫은 뒤 다시 열 일이 생긴 것) 증거로 쓰지 않는다.
 *  커버를 세지 않는 배(해치 제외 배)는 화면이 이 물음 자체를 건너뛴다 — 여기서는 판정만 한다. lastHatch = { act, ts } | null (화면의 lastHatchOf). */
export function termOpenedCover(rows, mode, center, gcFn, lastHatch = null) {
  const at = termHoldOpenAt(rows, mode, center, gcFn);
  if (!at) return false;
  if (lastHatch && lastHatch.act === 'close' && Number(lastHatch.ts) >= at) return false;
  return true;
}

/** 콘앱 행은 EDI 계획 자리뿐이다 — 항차 records 의 실적(bay_actual)·정해 준 자리(bay_assign)를 flattenVoyages 와 같은 차례(실적 → 맞교환)로 얹어 두 앱의 장 묶음을 맞춘다.
 *  검수앱 행은 이미 얹혀 있어 되풀이해도 그대로다. voyage = { discharge:{records}, loading:{records} }. */
export function withRecordPositions(rows, voyage) {
  return (rows || []).map((x) => {
    if (!x || !x.cn) return x;
    const m = modeOf(x) === 'loading' ? 'loading' : 'discharge';
    const r = voyage && voyage[m] && voyage[m].records && voyage[m].records[x.cn];
    if (!r) return x;
    if (r.bay_actual && r.row_actual && r.tier_actual && !String(r.bay_actual).startsWith('__')) return { ...x, bay: r.bay_actual, row: r.row_actual, tier: r.tier_actual };
    if (r.bay_assign && r.row_assign && r.tier_assign && !String(r.bay_assign).startsWith('__') && !String(r.bay_actual || '').startsWith('__')) return { ...x, bay: r.bay_assign, row: r.row_assign, tier: r.tier_assign };
    return x;
  });
}

/** 한 모드의 갱 상태. rows=컨 행 목록 · o={ info, mode, now, workers:[{equip}] (접속 검수원 — 있으면 앱 사용 호기에 더한다) }. */
export function gangStateOf(rows, o = {}) {
  const mode = o.mode === 'loading' ? 'loading' : 'discharge';
  const now = Number(o.now) || Date.now();
  const info = o.info || {};
  const list = (rows || []).filter((c) => c && c.cn);
  const inMode = list.filter((c) => modeOf(c) === mode);
  //  남은 일 — GuidedWorkPanel remaining 과 같은 규칙(완료 실물이 찬 칸의 계획 컨은 제외)
  const occ = buildOccupancy(inMode, (c) => !!compOf(c));
  const remaining = inMode.filter((c) => {
    if (!(isWork(c) && !compOf(c) && c.bay && c.row && c.tier)) return false;
    const e = occ.get(posKey(c));
    return !(e && e.done && e.cn !== c.cn);
  });
  const modeAll = inMode.filter((c) => isWork(c) && c.bay);
  let pairs = null;
  try { pairs = getBayPairs(modeAll, String(info.imo || ''), String(info.vsl || '')); }
  catch (e) { console.warn('[4.81] 베이 짝 읽기 실패 — 짝 없이 장을 묶습니다', e); pairs = null; }
  const gc = (b) => { try { return bayGroupCenter(String(b), pairs); } catch (e) { console.warn('[4.81] 장 묶기 실패 bay=' + b, e); return null; } };
  const groups = {};
  for (const c of remaining) {
    const ce = gc(c.bay); if (ce == null) continue;
    const g = (groups[ce] ||= { center: ce, deck: 0, hold: 0 });
    if (isDeckTier(c)) g.deck++; else g.hold++;
  }
  //  앱 사용 호기 — 두 모드의 앱 입력 행 중 그 호기의 마지막이 APP_ACTIVE_MIN 분 안
  const appLast = {};
  for (const c of list) {
    const r = compOf(c); if (!isApp(r)) continue;
    const n = crewCraneNo(r.equip); if (!n) continue;
    appLast[n] = Math.max(appLast[n] || 0, Number(r.at) || 0);
  }
  let appEver = Object.keys(appLast).length > 0;   // 이 항차에 앱 입력이 한 번이라도 있었나(없으면 «앱 입력 없이 터미널 기록만»)
  const appActive = new Set();
  for (const [n, at] of Object.entries(appLast)) if (now - at <= APP_ACTIVE_MIN * 60e3) appActive.add(+n);
  let workerEver = false;
  for (const w of o.workers || []) { const n = crewCraneNo(w && w.equip); if (n) { appActive.add(n); workerEver = true; } }
  //  터미널 호기별 — 마지막 작업 시각과 그 장(같은 시각이 둘이면 둘 다)
  appEver = appEver || workerEver;
  const perCrane = {};
  let termAll = 0, termNoEquip = 0;
  for (const c of inMode) {
    const r = compOf(c); if (!r || !isTermApplied(r) || !c.bay) continue;
    termAll++;
    const no = crewCraneNo(r.equip);
    if (!no) { termNoEquip++; continue; }
    const e = (perCrane[no] ||= { no, n: 0, deck: 0, hold: 0, lastAt: 0, lastCenters: [], lastBay: 0 });
    e.n++; if (isDeckTier(c)) e.deck++; else e.hold++;
    const ce = gc(c.bay), at = Number(r.at) || 0;
    if (at > e.lastAt) { e.lastAt = at; e.lastCenters = ce == null ? [] : [ce]; e.lastBay = parseInt(c.bay, 10) || 0; }
    else if (at === e.lastAt && ce != null && !e.lastCenters.includes(ce)) e.lastCenters.push(ce);
  }
  const pier = String(info.pier || '').toUpperCase();
  //  호기로 말할 수 있는가 — 동방(PNCT)은 터미널 행에 호기가 없다. 호기가 든 터미널 행이 하나도 없으면 호기 번호를 말하지 않는다.
  const byCrane = pier !== 'PNCT' && Object.keys(perCrane).length > 0;
  return {
    mode, now, info, rows: inMode, modeAll, gc, groups, pairs, remaining,
    appActive: [...appActive].sort((a, b) => a - b), appLast, appEver, perCrane, termAll, termNoEquip,
    hatchSkip: isHatchSkipShipInfo(info), byCrane,
  };
}

/** 베이(후보 여러 개 가능 — «(14)15» 는 [15,14]) 하나를 정리한다. 장을 못 찾으면 { ok:false, reason }. */
export function bayReportOf(st, bayCands) {
  const cands = (Array.isArray(bayCands) ? bayCands : [bayCands]).map((x) => String(x == null ? '' : x).replace(/^0+(?=\d)/, '')).filter(Boolean);
  let C = null, bay = '';
  for (const b of cands) {
    const ce = st.gc(b); if (ce == null) continue;
    if (st.modeAll.some((c) => st.gc(c.bay) === ce)) { C = ce; bay = b; break; }
  }
  if (C == null) return { ok: false, reason: 'nobay', bay: cands[0] || '', mode: st.mode };
  const inGroup = st.modeAll.filter((c) => st.gc(c.bay) === C);
  const bays = [...new Set(inGroup.map((c) => parseInt(c.bay, 10)).filter(Number.isFinite))].sort((a, b) => a - b);
  const g = st.groups[C] || { deck: 0, hold: 0 };
  let termDeck = 0, termHold = 0, appDeck = 0, appHold = 0, lastAt = 0, lastAppAt = 0, termNoEquip = 0, holdTermStarted = false;
  const termByNo = {}, appByNo = {}, termAtC = {};   // termAtC = 호기별 이 장 터미널 기록 시각들(4.81-01 — 앱 입력 구간 안에 기록이 있는 호기는 따로 일한 갱이다)
  const recent = { n: 0, deck: 0, hold: 0, lastAt: 0, appToo: false };
  const winMs = FALLBACK_WINDOW_MIN * 60e3;
  const winMs30 = APP_ACTIVE_MIN * 60e3;
  for (const c of st.rows) {
    const r = compOf(c); if (!r || !c.bay || st.gc(c.bay) !== C) continue;
    const at = Number(r.at) || 0, deck = isDeckTier(c);
    if (isTermApplied(r)) {
      const no = crewCraneNo(r.equip);
      if (no) { const t = (termByNo[no] ||= { n: 0, lastAt: 0 }); t.n++; t.lastAt = Math.max(t.lastAt, at); (termAtC[no] ||= []).push(at); } else termNoEquip++;
      if (deck) termDeck++; else { termHold++; holdTermStarted = true; }
      if (at > lastAt) lastAt = at;
      if (st.now - at <= winMs) { recent.n++; if (deck) recent.deck++; else recent.hold++; if (at > recent.lastAt) recent.lastAt = at; }
    } else if (isApp(r)) {
      if (deck) appDeck++; else appHold++;
      if (at > lastAppAt) lastAppAt = at;
      const no = crewCraneNo(r.equip);
      if (no) { const ap = (appByNo[no] ||= { n: 0, lastAt: 0, lastBay: 0, firstAt: 0 }); ap.n++; if (at >= ap.lastAt) { ap.lastAt = at; ap.lastBay = parseInt(c.bay, 10) || 0; } if (st.now - at <= winMs30 && (!ap.firstAt || at < ap.firstAt)) ap.firstAt = at; }
      if (st.now - at <= winMs) recent.appToo = true;
    }
  }
  //  지금(APP_ACTIVE_MIN 분 안) 이 장에서 일하는 호기 — 터미널 호기는 «마지막 작업이 이 장», 앱 호기는 «이 장에 앱 입력이 최근에 있음»
  const winApp = APP_ACTIVE_MIN * 60e3;
  const unusedW = [], usedW = [], sameGang = [];
  if (st.byCrane) {
    //  ① 번호가 맞는 것 먼저 — 이 장에서 최근 일한 터미널 호기 중 앱 사용 호기와 번호가 같으면 앱 사용
    const left = [];
    for (const e of Object.values(st.perCrane)) {
      const here = e.lastCenters.includes(C) && st.now - e.lastAt <= winApp;
      if (!here) continue;
      if (st.appActive.includes(e.no)) usedW.push(e.no); else left.push(e);
    }
    //  ② 번호가 안 맞는 앱 입력 — 이 장에서 최근 앱 입력이 있는데 같은 번호의 터미널 호기가 이 장에 없으면(앱에는 3호기·터미널에는 1호기로 적힌 경우),
    //     실사용자 몫을 먼저 뺀다 — 같은 장·같은 30분 창의 앱 입력이 설명하는 터미널 호기 하나(마지막 작업 베이가 가장 가까운 쪽)를 앱 사용으로 본다. 컨 번호로는 못 맞춘다(한 컨의 완료 기록은 앱 것 아니면 터미널 것 하나뿐).
    const mis = Object.entries(appByNo).map(([no, a]) => ({ no: +no, ...a }))
      .filter((a) => st.now - a.lastAt <= winApp && !usedW.includes(a.no) && !left.some((e) => e.no === a.no))
      .sort((x, y) => y.lastAt - x.lastAt);
    //  단 앱 입력 구간(30분 창 안 첫 입력~마지막 입력) 동안 이 장에 터미널 기록이 있는 호기는 앱 사용자가 아니라 따로 일한 갱이다(진짜 2갱을 한 갱으로 합치지 않는다) — 흡수하지 않고 앱 밖에 둔다.
    for (const a of mis) {
      const lo = a.firstAt || a.lastAt, hi = a.lastAt;
      const cand = left.filter((e) => !(termAtC[e.no] || []).some((x) => x >= lo && x <= hi));
      if (!cand.length) { usedW.push(a.no); continue; }   // 짝지을 터미널 호기가 없으면 앱 번호 그대로 앱 사용 호기
      cand.sort((x, y) => (Math.abs(x.lastBay - a.lastBay) - Math.abs(y.lastBay - a.lastBay)) || (y.lastAt - x.lastAt) || (x.no - y.no));
      const hit = cand[0];
      left.splice(left.indexOf(hit), 1);
      usedW.push(hit.no); sameGang.push({ app: a.no, term: hit.no });
    }
    for (const e of left) unusedW.push(e.no);
  }
  unusedW.sort((a, b) => a - b); usedW.sort((a, b) => a - b);
  return {
    ok: true, mode: st.mode, bay, center: C, bays, remDeck: g.deck, remHold: g.hold,
    termDeck, termHold, appDeck, appHold, lastAt, lastAppAt, termByNo, appByNo, termNoEquip,
    unusedW, usedW, sameGang, appNone: !st.appEver, byCrane: st.byCrane, pnct: String(st.info.pier || '').toUpperCase() === 'PNCT', hatchSkip: st.hatchSkip,
    holdTermStarted, recent, estimated: st.mode === 'loading', termAll: termDeck + termHold,
  };
}

const hm = (ms) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const hoList = (nos) => nos.map((n) => `${n}호기`);
const joinKo = (a) => (a.length <= 1 ? (a[0] || '') : a.length === 2 ? koJosa(a[0], '과') + ' ' + a[1] : a.slice(0, -1).join(', ') + ' ' + a[a.length - 1]);
const countWords = (deck, hold) => (deck && !hold ? '모두 데크' : hold && !deck ? '모두 홀드' : `데크 ${deck}, 홀드 ${hold}`);

/** 정리 답 문구(한글, 문장은 마침표로 끝낸다). rep = bayReportOf 결과. */
export function bayTidyText(rep) {
  if (!rep || !rep.ok) {
    const md = rep && rep.mode === 'loading' ? '선적' : '양하';
    return rep && rep.reason === 'nobay'
      ? `${rep.bay ? rep.bay + '번 ' : ''}베이는 이 배 ${md} 자료에 없습니다. 베이 번호를 다시 불러 주세요.`
      : '이 배는 베이를 읽을 자료가 없어 정리해 드릴 수 없습니다.';
  }
  const C = rep.center, D = rep.remDeck, H = rep.remHold;
  const out = [];
  const head = `${rep.mode === 'loading' ? '선적 ' : ''}${C}번 장`;
  if (rep.byCrane && rep.appNone) out.push('이 항차는 앱 입력 없이 터미널 기록만 있습니다.');
  if (String(rep.bay) !== String(C) && rep.bays.length > 1) out.push(`${rep.bay}번 베이는 ${C}번 장(${rep.bays.join('·')}번 베이)에 속합니다.`);
  //  ① 누가 하고 있나
  if (rep.byCrane) {
    const un = rep.unusedW, us = rep.usedW;
    const who = (nos) => koJosa(joinKo(hoList(nos)), '이');
    if (!un.length && !us.length) out.push(`${koJosa(head, '은')} 최근 ${APP_ACTIVE_MIN}분 안에 작업한 호기가 터미널 기록에도 앱 입력에도 없습니다.`);
    else if (rep.appNone) out.push(`${koJosa(head, '은')} ${who(un)} 하고 있습니다.`);
    else if (!us.length) out.push(`${koJosa(head, '은')} ${who(un)} 하고 있고 최근 ${APP_ACTIVE_MIN}분 앱 입력이 없는 호기입니다.`);
    else if (!un.length) out.push(`${koJosa(head, '은')} ${who(us)} 하고 있고 앱으로 입력 중인 호기입니다.`);
    else out.push(`${koJosa(head, '은')} ${joinKo(hoList(un))}(최근 앱 입력 없음)와 ${joinKo(hoList(us))}(앱 사용)가 함께 하고 있습니다.`);
    for (const m of rep.sameGang || []) out.push(`앱에는 ${m.app}호기로 입력돼 있어 터미널의 ${m.term}호기와 번호는 다르지만, 같은 장에서 같은 시간에 입력해 같은 갱으로 봅니다.`);
  } else {
    const r = rep.recent;
    if (r.n > 0) out.push(`${head}에서 최근 ${FALLBACK_WINDOW_MIN}분에 앱 밖 작업이 ${r.n}대(${countWords(r.deck, r.hold)}) 있었고 마지막은 ${hm(r.lastAt)} 입니다.`);
    else out.push(`${head}에서는 최근 ${FALLBACK_WINDOW_MIN}분에 앱 밖 작업 기록이 없습니다.`);
    if (r.appToo) out.push('이 장에는 앱 입력도 최근에 있었습니다.');
  }
  //  ② 남은 일
  if (!D && !H) out.push('이 장은 남은 작업이 없습니다.');
  else if (!D) out.push(rep.byCrane ? `데크는 다 끝났고 홀드가 ${H}대 남았습니다.` : `남은 것은 홀드 ${H}대 입니다.`);
  else if (!H) out.push(rep.byCrane ? `데크가 ${D}대 남았습니다.` : `남은 것은 데크 ${D}대 입니다.`);
  else out.push(rep.byCrane ? `데크가 ${D}대, 홀드가 ${H}대 남았습니다. 홀드는 데크가 끝난 뒤에 합니다.` : `남은 것은 데크 ${D}, 홀드 ${H} 입니다. 홀드는 데크가 끝난 뒤에 합니다.`);
  //  ③ 이 장에서 한 것
  if (rep.byCrane) {
    if (rep.termAll > 0) {
      const ent = Object.entries(rep.termByNo).sort((a, b) => a[0] - b[0]).map(([n, v]) => `${n}호기 ${v.n}대`);
      if (rep.termNoEquip) ent.push(`호기 모름 ${rep.termNoEquip}대`);
      const redundant = ent.length === 1 && rep.unusedW.length === 1 && !rep.termNoEquip;
      out.push(`이 장에서 터미널 기록으로 ${rep.termAll}대(데크 ${rep.termDeck}, 홀드 ${rep.termHold})를 했고 마지막은 ${hm(rep.lastAt)} 입니다.${redundant ? '' : ` 호기별로는 ${ent.join(', ')} 입니다.`}`);
    } else out.push('이 장에서 터미널 기록은 아직 없습니다.');
  } else if (rep.termAll > 0 && rep.recent.n === 0) out.push(`이 장의 터미널 기록은 모두 ${rep.termAll}대이고 마지막은 ${hm(rep.lastAt)} 입니다.`);
  if (rep.appDeck + rep.appHold > 0) out.push(`앱에 입력된 것은 ${rep.appDeck + rep.appHold}대(데크 ${rep.appDeck}, 홀드 ${rep.appHold})입니다.`);
  if (!rep.byCrane) out.push(rep.pnct ? '어느 호기인지는 터미널 자료에 없어 말씀드릴 수 없습니다.' : '호기는 터미널 기록이 들어오면 알려 드리겠습니다.');
  //  ④ 커버 — 커버를 세는 배만(해치 제외 배는 커버 말을 아예 쓰지 않는다)
  if (!rep.hatchSkip && rep.holdTermStarted) out.push('터미널 기록상 홀드 작업이 시작돼 커버는 열린 것으로 봅니다.');
  if (rep.estimated) out.push('선적은 터미널 기록에 자리가 없어 계획 자리 기준 추정입니다.');
  return out.join(' ');
}

/** 한 번에 — rows 로 모드별 상태를 만들어 정리 답과 보고서를 낸다. 말에 모드가 있으면 그 모드 먼저, 그 모드에 베이가 없으면 다른 모드. */
export function tidyBayAnswer(rows, o = {}) {
  const first = o.mode === 'loading' ? 'loading' : 'discharge';
  let rep = null;
  for (const m of [first, first === 'loading' ? 'discharge' : 'loading']) {
    const st = gangStateOf(rows, { ...o, mode: m });
    const r = bayReportOf(st, o.bays);
    if (r.ok) { rep = r; break; }
    if (!rep) rep = r;
  }
  return { rep, text: bayTidyText(rep) };
}
