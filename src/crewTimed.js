// 시각이 붙은 호기 교대 말(«12:30 박진우 1호기 이형출과 교대» · «1호기 12:30부터 박진우»)을 읽고 맞춰 보는 판정 한 벌 — TallyOne 5.22
//   검수사 2026-11-23 14:21 «금일주간 연태 근무 1호기 이형출 2호기 김성일 냉동점검 박진우 12:30 박진우 1호기 이형출과 교대 13:30 이형출 2호기 김성일과 교대»
//   · 14:29 «15:00 김성일 1호기 박진우 교대 15:30 박진우 2호기 이형출 교대 … 이런식으로 19시 전후까지 갈듯»
//   실측 — 14:16 «1호 12:30부터 박진우» 를 다섯 번 넣었는데 앱이 시각을 못 읽어 «14:17 부터 박진우» 로만 적혀 1호기 11:00~12:30 36대가 박진우로 붙었다.
//   기록 자리는 5.16 공동 담당의 «바뀐 시각» 기록(info.crewPoolLog)과 같다 — 이름 구간은 utils.mergeCrewPoolLog 한 벌이 맡는다.
import { matchStaffName, crewShiftKey, crewNameAt } from './utils.js';
import { allStaffNames } from './staffList.js';

const TIME = '(\\d{1,2})\\s*(?::|시)\\s*(\\d{1,2}|반)?\\s*분?';
const NAME = '([가-힣]{2,4}?)';
const AHEAD_MS = 14 * 3600000;

const nm = (w, list) => { const s = String(w || '').replace(/(?:님|씨|이가|이는|은|는|이|가)$/, ''); return matchStaffName(s, list) || matchStaffName(String(w || ''), list) || ''; };

/** 시각이 붙은 교대 말 → { base:[{no,name}], swaps:[{hh,mm,no,name,from}], unknown:[], loose:[] } · 아니면 null.
 *  ① «HH:MM 이름 N호기 (이름과) 교대» ② «N호기 HH:MM부터 이름». 첫 시각 앞의 «N호기 이름» 은 그 조 처음 등록(base).
 *  ⚠ «작업·양하·선적·들어갔·투입·시작» 이 있으면 시작 알림이다 — 교대로 읽지 않는다(5.22 감사 중3). */
export function parseTimedCrew(text, names = null) {
  const t = String(text || '').replace(/\s+/g, ' ');
  if (!/\d\s*호/.test(t) || !/\d{1,2}\s*(?::|시)/.test(t)) return null;   // «1호 12:30부터 박진우» — «호기» 의 «기» 를 빼고 말해도 받는다
  if (/몇|누구|누가|어디|언제|맞아|맞나|맞지|아니|\?|교대\s*(?:표|순서|시간표)|취소|지워|삭제/.test(t)) return null;
  if (/작업|양하|선적|들어갔|들어가|투입|시작|출근/.test(t)) return null;
  const list = Array.isArray(names) ? names : allStaffNames();
  const swaps = []; const unknown = []; const spans = [];
  const r1 = new RegExp(`${TIME}\\s*(?:에|부터|쯤)?\\s*${NAME}\\s*(?:이|가|은|는|님)?\\s*(\\d)\\s*호기\\s*(?:에서\\s*)?(?:${NAME}\\s*(?:님)?\\s*(?:과|와|하고|랑)?)?\\s*교대`, 'g');
  let m;
  while ((m = r1.exec(t))) {
    const name = nm(m[3], list); const from = m[5] ? nm(m[5], list) : '';   // 앞사람 자리가 명단 밖 낱말(«점심»)이면 앞사람을 모르는 것으로 둔다(감사 하)
    spans.push([m.index, m.index + m[0].length]);
    if (!name) { unknown.push(m[3]); continue; }
    swaps.push({ hh: m[1], mm: m[2] === '반' ? '30' : (m[2] || '00'), no: +m[4], name, from, pos: m.index });
  }
  const r2 = new RegExp(`(\\d)\\s*호기?\\s*${TIME}\\s*(?:부터|에|쯤부터)\\s*${NAME}(?![가-힣])`, 'g');
  while ((m = r2.exec(t))) {
    const a = m.index, b = m.index + m[0].length;
    if (spans.some(([x, y]) => a < y && b > x)) continue;   // ①과 겹치면 ①만(감사 하 — 한 사람이 같은 시각 두 호기)
    spans.push([a, b]);
    const name = nm(m[4], list);
    if (!name) { unknown.push(m[4]); continue; }
    swaps.push({ hh: m[2], mm: m[3] === '반' ? '30' : (m[3] || '00'), no: +m[1], name, from: '', pos: a });
  }
  if (!swaps.length) return null;
  const first = Math.min(...spans.map((x) => x[0]));
  const base = []; const loose = [];
  const r3 = /(\d)\s*호기?\s*([가-힣]{2,4})/g;
  while ((m = r3.exec(t))) {
    const a = m.index; if (spans.some(([x, y]) => a >= x && a < y)) continue;
    const name = nm(m[2], list); if (!name) continue;
    if (a < first) { if (!base.some((q) => q.no === +m[1])) base.push({ no: +m[1], name }); }
    else loose.push(`${m[1]}호기 ${name}`);   // 시각 뒤에 시각 없이 붙은 «2호기 이형출» — 적지 않고 답에서 알린다(감사 하)
  }
  swaps.sort((a, b) => a.pos - b.pos);
  return { base, swaps: swaps.map(({ pos, ...x }) => x), unknown: [...new Set(unknown)], loose };
}

//  말한 «HH:MM» 을 실제 시각으로 — 지금 조(조 시작 2시간 안이거나 조 사이 빈 시간이면 앞 조부터) 시작 뒤 · 지금+14시간 안에서 지금에 가장 가까운 날.
//    카페리는 17:30 뒤에도 주간 사람이 이어서 한다(검수사 «19시 전후까지») — 17:45 의 «17:00» 은 오늘 17:00 이다(감사 중4).
function windowOf(nowMs) {
  const sk = crewShiftKey(undefined, nowMs, 0);
  const early = nowMs < sk.startMs || nowMs - sk.startMs < 2 * 3600000;
  const L = early ? crewShiftKey(undefined, sk.startMs - 6 * 3600000, 0).startMs : sk.startMs;
  return { L, U: nowMs + AHEAD_MS };
}
function resolveMs(hh, mm, nowMs) {
  const h = Number(hh), m = Number(mm) || 0;
  if (!Number.isFinite(h) || h < 0 || h > 23 || m < 0 || m > 59) return 0;
  const { L, U } = windowOf(nowMs);
  const d = new Date(nowMs); d.setHours(h, m, 0, 0); const t = d.getTime();
  const c = [t - 86400000, t, t + 86400000].filter((x) => x >= L && x <= U);
  return c.length ? c.reduce((a, b) => (Math.abs(b - nowMs) < Math.abs(a - nowMs) ? b : a)) : -1;
}

//  그 시각의 조 — 조 사이 빈 시간(17:30~19:00 · 06:30~08:00)은 앞 조다(카페리는 주간 사람이 19시 전후까지 이어 한다 · 재감사 상2).
function keyFor(ms) {
  const sk = crewShiftKey(undefined, ms, 0);
  return ms < sk.startMs ? crewShiftKey(undefined, sk.startMs - 6 * 3600000, 0) : sk;
}
const regOf = (info, sk, no) => { const e = info && info.craneCrew && info.craneCrew[sk] && info.craneCrew[sk][`${no}호기`]; if (!e) return null; if (typeof e === 'object' && e.leftAs === 'admin') return null;   /* 5.26 재감사 중C: 관리자로 돌아간 칸은 등록 없음(교대 말이 칸을 다시 써 김성일을 되살리던 것) */ const name = typeof e === 'string' ? e.trim() : String(e.name || '').trim(); return name ? { name, at: Number(e.at) || 0, pool: !!(e && e.pool) } : null; };

/** 시각을 풀고 앞사람을 채운다. info(그 배 info)가 있으면 그 조 등록을 함께 본다.
 *  반환 { ok, why?, shiftKey, shiftStart, start:{no:name}, keep:[no], items:[{ms,no,name,from,plan}], drop:[logKey] }
 *  ⚠ 앞사람을 모르면(처음 등록·말한 앞사람·그 시각 전에 적힌 등록 어느 것도 없음) 묻고 안 적는다(감사 상1 — 14:17 등록이 12:30 앞까지 덮던 것). */
export function timedCrewPlanOf(tc, nowMs = Date.now(), info = null) {
  if (!tc || !Array.isArray(tc.swaps) || !tc.swaps.length) return { ok: false, why: 'none' };
  const items = tc.swaps.map((x) => ({ ...x, ms: resolveMs(x.hh, x.mm, nowMs) }));
  const badT = items.find((x) => x.ms === 0);
  if (badT) return { ok: false, why: 'badTime', at: badT };
  const early = items.find((x) => x.ms < 0);
  if (early) return { ok: false, why: 'otherShift', at: early, shiftKey: crewShiftKey(undefined, nowMs, 0).key };
  //  5.22-01 (라이브 확인 16:41 «06:00 박진우 1호기 이형출과 교대» 가 내일 06:00 예정으로 적힘 — 되돌림): 앞으로의 교대는 지금 조(조 사이 빈 시간은 앞 조)
  //    안에서만 받는다. 다음 조 교대는 그 조가 되면 말한다.
  const nowKey = keyFor(nowMs).key;
  const far = items.find((x) => x.ms > nowMs && keyFor(x.ms).key !== nowKey);
  if (far) return { ok: false, why: 'nextShift', at: far, shiftKey: nowKey };
  items.sort((a, b) => a.ms - b.ms);   // 호기별로 따로 말해 순서가 섞여도 시각 순으로(감사 하)
  const sk = keyFor(items[0].ms);
  //  그 조 처음 상태 — ① 말한 처음 등록(base)은 조 시작부터로 적는다.
  //    ② 그 호기가 이 교대 시각 «전에» 적힌 등록이 있으면 그 등록·교대 기록이 이미 앞사람을 안다 — 등록은 건드리지 않고 앞사람은 그 시각 직전 이름(crewNameAt).
  //    ③ 등록이 없거나 이 교대 «뒤에» 적힌 것(14:17 에 적은 1호기 박진우 — 그 앞은 모른다)이면 말한 앞사람을 조 시작부터로 적는다. 앞사람을 말하지 않았으면 묻는다(감사 상1).
  const start = {}; const prior = {};
  for (const b of tc.base || []) start[b.no] = b.name;
  const firstOf = {}; for (const x of items) if (!firstOf[x.no]) firstOf[x.no] = x;
  for (const [no, x] of Object.entries(firstOf)) {
    if (start[no]) continue;
    const xk = keyFor(x.ms).key;
    const r = regOf(info, xk, +no);
    if (r && !r.pool && r.at && r.at <= x.ms) { prior[no] = info ? (crewNameAt(info, x.ms - 1, `${no}호기`) || r.name) : r.name; continue; }
    if (xk !== sk.key) { start[no] = ''; continue; }   // 다른 조의 처음 상태는 여기서 적지 않는다 — 앞사람을 묻는다
    start[no] = x.from || '';
  }
  const state = {}; for (const no of new Set([...Object.keys(start), ...Object.keys(prior)])) state[no] = start[no] || prior[no] || '';
  const out = [];
  for (const x of items) {
    const from = x.from || state[x.no] || '';
    if (!from) return { ok: false, why: 'noFrom', at: x, shiftKey: sk.key };
    if (from === x.name) return { ok: false, why: 'same', at: x, shiftKey: sk.key };
    for (const k of Object.keys(state)) if (state[k] === x.name) state[k] = '';   // 한 사람은 한 호기에만(mergeCrewPoolLog 와 같은 규칙)
    state[x.no] = x.name;
    out.push({ ms: x.ms, no: x.no, name: x.name, from, plan: x.ms > nowMs });
  }
  //  그 조의 다른 호기 등록 시각도 조 시작으로 맞춘다 — 늦게 적힌 등록 시각에서 교대가 처음 상태로 되돌아가지 않게(감사 상2 · utils.craneCrewOf regAt)
  const keep = [];
  const cc = (info && info.craneCrew && info.craneCrew[sk.key]) || {};
  const wroteStart = Object.values(start).some(Boolean);   // 처음 상태를 조 시작으로 적을 때만 — 안 적으면 등록 시각을 건드리지 않는다
  if (wroteStart) for (const k of Object.keys(cc)) { const mm = /^(\d)\s*호기$/.exec(k); if (!mm || start[+mm[1]]) continue; const r = regOf(info, sk.key, +mm[1]); if (r && !r.pool) keep.push({ no: +mm[1], name: r.name }); }
  //  다시 말하면 그 호기의 옛 예정(plan)은 지운다 — 첫 새 시각 뒤 것만(감사 중5)
  const drop = [];
  const lg = (info && info.crewPoolLog) || {};
  //    재감사 중1 — 지울 것은 «지금보다 뒤» 이고 «이번 말에 그 호기의 새 예정이 있을 때» 그 새 예정 첫 시각 뒤의 것만. 확인·정정(지난 교대)만 말하면 예정은 그대로 둔다.
  const firstPlan = {}; for (const x of out) if (x.plan && !firstPlan[x.no]) firstPlan[x.no] = x.ms;
  for (const [k, e] of Object.entries(lg)) { const no = crewNo(e && e.equip); if (e && e.plan && Number(e.at) > nowMs && firstPlan[no] && Number(e.at) >= firstPlan[no] && !out.some((x) => `${x.ms}_${x.no}` === k)) drop.push(k); }
  return { ok: true, shiftKey: sk.key, shiftStart: sk.startMs, start, keep, items: out, drop };
}
const crewNo = (e) => { const m = /(\d)\s*(?:호기)?$/.exec(String(e || '').trim()); return m ? +m[1] : 0; };

const hm = (ms) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

/** 미르 답 한 벌 — 엔진과 화면이 같은 글을 쓴다. */
export function timedCrewText(tc, shipLabel = '', nowMs = Date.now(), info = null) {
  const pl = timedCrewPlanOf(tc, nowMs, info);
  const sl = shipLabel ? shipLabel + ' ' : '';
  const unk = (tc && tc.unknown && tc.unknown.length) ? `\n⚠ «${tc.unknown.join('» · «')}» 은 검수원 명단에 없어 뺐어요.` : '';
  const loose = (tc && tc.loose && tc.loose.length) ? `\n⚠ «${tc.loose.join('» · «')}» 은 시각이 없어 적지 않았어요 — «HH:MM 이름 N호기 교대» 로 말씀해 주세요.` : '';
  if (!pl.ok) {
    const a = pl.at || {};
    const said = a.hh != null ? `${a.hh}:${String(a.mm || '00').padStart(2, '0')}` : '';
    if (pl.why === 'nextShift') return `🤔 ${sl}${said} 교대는 지금 조(${pl.shiftKey}) 가 아니라 다음 조 시각이에요. 아직 적지 않았어요 — 지난 시각이면 날짜가 헷갈린 것이니 지금 조 시각으로, 다음 조 교대면 그 조가 되면 말씀해 주세요.${unk}`;
    if (pl.why === 'badTime') return `🤔 ${sl}«${said}» 은 시각으로 못 읽었어요. 아직 적지 않았어요.${unk}`;
    if (pl.why === 'otherShift') return `🤔 ${sl}${said} 교대는 지금 조(${pl.shiftKey}) 시작 전이거나 너무 먼 시각이에요. 아직 적지 않았어요 — 지금 조 이야기로 다시 말씀해 주세요.${unk}`;
    if (pl.why === 'noFrom') return `🤔 ${sl}${hm(a.ms)} 전에 ${a.no}호기는 누구였습니까? 앞사람을 몰라 아직 적지 않았어요 — «${hm(a.ms)} ${a.name} ${a.no}호기 홍길동과 교대» 처럼 앞사람까지 말씀해 주세요.${unk}${loose}`;
    if (pl.why === 'same') return `🤔 ${sl}${hm(a.ms)} 전에 ${a.no}호기는 누구였습니까? 앱에는 그 전에도 ${a.name}으로 적혀 있어 아직 적지 않았어요 — 그 전에 누구였는지 함께 말씀해 주세요.${unk}${loose}`;
    return '';
  }
  const L = [];
  const st = Object.keys(pl.start).filter((k) => pl.start[k]).sort().map((k) => `${k}호기 ${pl.start[k]}`);
  if (st.length) L.push(`처음 ${st.join(' · ')}`);
  for (const x of pl.items) L.push(`${hm(x.ms)} ${x.no}호기 ${x.name}(←${x.from})${x.plan ? ' 예정' : ''}`);
  const nPlan = pl.items.filter((x) => x.plan).length;
  return `📝 ${sl}교대를 적을게요 🐱\n${L.join('\n')}\n그 시각 앞 완료는 앞사람, 뒤 완료는 바꾼 사람 이름으로 붙습니다.`
    + (nPlan ? `\n예정 ${nPlan}건은 그 시각이 되면 그대로 적용돼요. 실제로 다르게 바뀌면 바꾼 사람이 그 호기를 누르거나 바뀐 시각으로 다시 말씀해 주세요(그 호기의 뒤 예정은 새 말로 바뀝니다).` : '')
    + (pl.drop.length ? `\n앞서 적은 예정 ${pl.drop.length}건은 이번 말로 바꿨어요.` : '') + unk + loose;
}
