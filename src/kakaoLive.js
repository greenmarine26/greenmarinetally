// 수집기가 PC 카톡 방 창에서 복사해 온 글을 앱 자료(물량 예보 · 작업 시작/종료 · 배 화면 카톡 줄)로 바꾸는 계획 한 벌 — 순수 모듈(쓰기는 부르는 쪽: 수집기 kakao_helper)
//
// 왜 (검수사 2026-11-28 01:4x~02:3x)
//   «카톡을 읽을수 있게 만들수 있나요? 제가 카톡화면을 켜놓았을 경우 읽어서 수집기에 넣을수 있는»
//   «연태11/4는 검수사들만 있습니다. 연태페리는 검수사+선사입니다» · «일조방도 2개 입니다 선사와 선사+검수사들방»
//   «연태 11/4는 실시간 작업내용이 보일것입니다» · «지금까지 연태와 일조 예보를 제가 넣었습니다. 그걸 이카톡내용으로 대신 합니다»
//   «수집기가 읽으면 그런 문제가 없을것 같아서» — 사건 OBWH 2803E 예보를 손으로 붙여 넣다 FULL 24대가 빠져 143대로 저장(정답 167대).
//   «대부분은 카톡이 맞습니다. 카톡이 실수 할수도 있긴 합니다. 저희는 리스트로 우선 합니다» — 컨·실번호·대수는 리스트가 이긴다(이 판은 대수 예보만 — 리스트가 오면 화면이 리스트를 쓴다).
//   작업 시작·종료 시각은 2026-09-16 «중복이 되면 카톡이 우선» 그대로지만, 앱 기록을 **옮기는 것은 사람이 하는 «카톡 기록 가져오기»에만** 둔다 —
//   수집기는 빠진 것만 넣는다(이미 있으면 건드리지 않는다).
//
// 방 → 배 (방 이름이 배를 정한다 · 보낸 사람 표 FORECAST_SENDERS 는 거들기만)
//   연태페리          OBWH  선사+검수사  — 물량 예보 · 배 화면 줄
//   연태 …(그 밖)      OBWH  검수사만    — 작업 시작·종료 · 배 화면 줄   («연태 11/4» 처럼 날짜가 붙어 바뀌어도 «연태»로 시작하면 이 방)
//   일조 · 일조선사    RZOR  선사(+검수사) — 물량 예보 · 배 화면 줄
import { kakaoMessagesOf, parseKakaoWorkLog, diffAgainstReports } from './kakaoWorkLog.js';
import { parseCargoForecast, forecastMatchOf } from './utils.js';
import { planMirWorkReport } from './workReportPlan.js';

export const KAKAO_ROOMS = [
  { id: 'ytferry', test: (t) => t === '연태페리', ship: 'OBWH', kind: 'line' },
  { id: 'rizhao', test: (t) => /^일조/.test(t), ship: 'RZOR', kind: 'line' },
  { id: 'ytcrew', test: (t) => /^연태/.test(t) && t !== '연태페리', ship: 'OBWH', kind: 'crew' },
];
/** 창 제목 → { id, ship, kind, title } · 모르는 방은 null */
export function kakaoRoomOf(title) {
  const t = String(title || '').trim();
  const r = KAKAO_ROOMS.find((x) => x.test(t));
  return r ? { id: r.id, ship: r.ship, kind: r.kind, title: t } : null;
}

/** 사진·삭제·이모티콘처럼 글이 없는 줄 — 배 화면에 올리지 않는다 */
export function isKakaoNoise(body) {
  const b = String(body || '').trim();
  return !b || /^(사진(\s*\d+장)?|동영상|이모티콘|메시지가 삭제되었습니다\.?|파일\s*[:：].*|음성메시지.*|삭제된 메시지입니다\.?)$/.test(b);
}

function fnv(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
/** 복사본 글 → 메시지 목록(아이디 붙임). 같은 분·같은 사람·같은 글(«사진 3장» 연달아)은 차례 번호로 가른다. */
export function kakaoMessagesWithIds(text, opts = {}) {
  const msgs = kakaoMessagesOf(text, opts);
  const seen = new Map();
  return msgs.map((m) => {
    const base = `${m.ymd.replace(/-/g, '')}_${m.hm.replace(':', '')}_${fnv(`${m.who}|${m.body}`)}`;
    const n = (seen.get(base) || 0) + 1; seen.set(base, n);
    return { ...m, id: `${base}_${n}` };
  });
}

/** "2026-11-27 21:00 ~ 2026-11-28 07:00" → [시작ms, 끝ms] (못 읽으면 null) */
export function planRangeOf(planDate) {
  const ms = String(planDate || '').match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})/g);
  if (!ms || !ms.length) return null;
  const at = (s) => { const m = s.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})/); return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime(); };
  const a = at(ms[0]); const b = ms[1] ? at(ms[1]) : a + 24 * 3600000;
  return [a, Math.max(a, b)];
}
/** 그 시각에 그 배가 작업 중인 항차 — 일정 안에 드는 항차가 먼저, 없으면 일정 앞뒤 pad 안에서 일정에 가장 가까운 것(5.29 감사 하-4) · 없으면 null */
export function kakaoVoyageAt(list, ship, ts, padH = 12) {
  const pad = padH * 3600000;
  const cand = [];
  for (const v of list || []) {
    if (!v || !v.info || String(v.info.vsl || '').toUpperCase() !== ship) continue;
    const r = planRangeOf(v.info.planDate);
    if (!r) continue;
    const gap = ts < r[0] ? r[0] - ts : ts > r[1] ? ts - r[1] : 0;
    if (gap <= pad) cand.push({ v, gap, d: Math.abs(ts - r[0]) });
  }
  cand.sort((a, b) => a.gap - b.gap || a.d - b.d);
  return cand.length ? cand[0].v : null;
}

const yymd = (ymd) => { const [y, m, d] = ymd.split('-'); return `${String(y).slice(2)}년 ${+m}월 ${+d}일`; };
const nz = (o) => (o && Object.keys(o).length ? o : null);   // 빈 묶음은 null 로 — RTDB 는 {} 를 저장하지 않아 되읽기가 어긋난다(5.29 감사 중-4)

/** 선사 방 글 한 개 → 물량 예보 쓰기 계획(대수가 없으면 null). cur = 지금 예보(같은 회차 앞 계획이 반영된 값). */
export function kakaoForecastPlanOf(room, msg, list, nowMs, curOf = null) {
  const text = `${yymd(msg.ymd)}\n[${msg.who}] [${msg.hm}] ${msg.body}`;
  const fc = parseCargoForecast(text);
  const total = (fc.vans.full || 0) + (fc.vans.empty || 0) + (fc.vans.luggage || 0);
  if (!total) return null;
  if (!fc.vsl || fc.guessedVsl) fc.vsl = room.ship;          // 방이 배를 정한다
  if (String(fc.vsl).toUpperCase() !== room.ship) return { note: `예보 배 ${fc.vsl} 가 방(${room.title}=${room.ship})과 다름 — 넣지 않음`, msg, done: true };
  if (!fc.date) fc.date = msg.ymd;
  const ships = (list || []).filter((v) => v && v.info && String(v.info.vsl || '').toUpperCase() === room.ship);
  //  항차번호가 있으면 그것으로, 없으면 «그날 일정이 시작하는» 항차 또는 «그 시각이 일정 안» 인 항차만 — 여유를 두어 지난 항차를 고르지 않는다(5.29 감사 상-3).
  let match = fc.voy ? forecastMatchOf(ships, { voy: fc.voy }) : null;
  if (!match && !fc.voy) match = ships.find((v) => String(v.info.planDate || '').startsWith(msg.ymd)) || kakaoVoyageAt(ships, room.ship, msg.ts, 0);
  //  하루 전에 오는 예보 — 글 시각 뒤 36시간 안에 시작하는 그 배 항차 가운데 가장 먼저 시작하는 것(5.29 재감사 중-B).
  if (!match && !fc.voy) {
    const nx = ships.map((v) => ({ v, r: planRangeOf(v.info.planDate) })).filter((x) => x.r && x.r[0] > msg.ts && x.r[0] - msg.ts <= 36 * 3600000).sort((a, b) => a.r[0] - b.r[0]);
    if (nx.length) match = nx[0].v;
  }
  if (!match) return { note: `예보 ${fc.voy || msg.ymd} ${msg.hm} — 맞는 ${room.ship} 항차가 아직 없음(등록되면 다시 봄)`, msg, wait: true };
  const cur = (curOf ? curOf(match) : (match.info && match.info.forecast)) || {};
  if (cur.kakaoAt && Number(cur.kakaoAt) > msg.ts) return { note: `예보 ${match.key} — 더 늦은 카톡 예보가 이미 있음`, msg, done: true };
  if (cur.kakaoId === msg.id) return { note: `예보 ${match.key} — 같은 글 이미 넣음`, msg, done: true };
  const mode = fc.mode || 'loading';
  const base = `voyages/${match.key}`;
  const patch = {};
  const f = `${base}/info/forecast`;
  //  자식 경로로 쓴다 — CLL 메일이 넣은 긴급·수화물 컨(urgentCns·luggageCns·luggageSeals)과 그림(image)은 그대로 둔다(수집기 merge.py 와 같은 얕은 병합).
  Object.assign(patch, {
    [`${f}/voy`]: fc.voy || cur.voy || null, [`${f}/mode`]: mode,
    [`${f}/full`]: nz(fc.full), [`${f}/empty`]: nz(fc.empty), [`${f}/luggage`]: nz(fc.luggage),
    [`${f}/teu`]: fc.teu || null, [`${f}/calc`]: fc.calc, [`${f}/vans`]: fc.vans, [`${f}/summary`]: fc.summary || null,
    [`${f}/lolo`]: fc.lolo || null,
    [`${f}/raw`]: text, [`${f}/at`]: nowMs, [`${f}/by`]: '수집기(카톡)',
    [`${f}/kakaoAt`]: msg.ts, [`${f}/kakaoId`]: msg.id, [`${f}/kakaoRoom`]: room.title,
  });
  if (fc.urgentCns && fc.urgentCns.length) patch[`${f}/urgentCns`] = fc.urgentCns;
  if (fc.luggageCns && fc.luggageCns.length) patch[`${f}/luggageCns`] = fc.luggageCns;
  if (fc.luggageSeals && Object.keys(fc.luggageSeals).length) patch[`${f}/luggageSeals`] = fc.luggageSeals;
  //  홈 붙여넣기와 같은 칸 채우기(1.42·1.43-01) — 값이 있는 칸은 덮지 않는다. 섹션이 없으면 만든다.
  const slot = mode === 'loading' ? 'voy_l' : 'voy_d';
  const sec = mode === 'loading' ? 'loading' : 'discharge';
  if (fc.voy && !(match.info || {})[slot]) patch[`${base}/info/${slot}`] = fc.voy;
  if ((match.info[slot] || fc.voy) && !(match.has || {})[sec]) patch[`${base}/${sec}/_created`] = nowMs;
  return { key: match.key, patch, said: `${match.key} 예보 ${total}대(풀 ${fc.vans.full || 0} · 엠티 ${fc.vans.empty || 0})`, msg, kakaoAt: msg.ts, kakaoId: msg.id, done: true };
}

const DONE_VERB = { discharge_start: 'start', loading_start: 'start', discharge_done: 'done', loading_done: 'done' };
const cleanWho = (w) => String(w || '').replace(/^그린마린\s*/, '').replace(/\s*(부장|과장|차장|대리|주임|수석)$/, '').trim();
//  일어난 일을 알리는 글만 — 물음·조건·예정·다짐은 자동으로 적지 않는다(5.29 감사 상-1 · 미르 전달 보고 workReportParse 의 NEG/ASK 와 같은 뜻).
const NOT_CLAIM = /\?|나요|까요|ㄹ까|할까|했니|됐나|했나|언제|예정|이따|나중|곧\s|곧$|하면|나면|되면|끝나면|전에|후에|하겠|할게|할께|할\s*거|하려|해야|해도|아직|안\s*(됐|했|끝)|못\s*(했|함)/;
export function isKakaoClaim(body) { return !NOT_CLAIM.test(String(body || '')); }

/** 검수사 방 글 → 작업 시작·종료 쓰기 계획. 이미 앱에 있으면(같은 호기·같은 동작) 건드리지 않는다. 중단·재개·해치는 줄로만 보인다. */
export function kakaoWorkPlanOf(voy, msgs, nowMs) {
  const key = voy.key;
  const rows = [];
  //  글마다 따로 읽는다 — 같은 분에 두 사람이 보내도 보낸 사람·아이디가 섞이지 않는다(5.29 감사 중-3).
  for (const m of msgs) {
    //  호기만 달랑 온 글(«2호기»)은 바로 앞 2분 안의 호기 없는 보고에 물려준다(파서와 같은 규칙 — 글마다 따로 읽어도 · 재감사 하-A).
    const eq = /^\s*(\d)\s*호기\s*[.]?\s*$/.exec(m.body);
    if (eq) { const pv = rows.length ? rows[rows.length - 1] : null; if (pv && !pv.it.equip && Math.abs(m.ts - pv.m.ts) <= 120000) pv.it.equip = `${eq[1]}호기`; continue; }
    const { items } = parseKakaoWorkLog(`${yymd(m.ymd)}\n[${m.who}] [${m.hm}] ${m.body}`, {});
    for (const it of items) rows.push({ it, m });
  }
  rows.sort((a, b) => a.it.ts - b.it.ts);
  const diff = diffAgainstReports(rows.map((x) => x.it), voy.reports || {}, (b) => parseInt(b, 10), voy.reports_deleted || null);
  let aw = JSON.parse(JSON.stringify(voy.activeWork || {}));
  const patch = {}, said = [], notes = [];
  const done = new Set();   // 이 회차에 적은 (호기|동작) — 같은 회차에 같은 보고 두 번 금지(5.29 감사 중-1)
  const laterDone = (equip, mode, ts) => Object.values(voy.reports || {}).some((x) => x && x.type === 'work_status' && x.equip === equip && x.action === `${mode}_done` && Number(x.ts) >= ts)
    || diff.some((x, j) => x.equip === equip && x.action === `${mode}_done` && x.ts >= ts && isKakaoClaim(rows[j].m.body));   // 물음 글의 완료는 세지 않는다(재감사 하-B)
  let lastKey = 0;
  diff.forEach((r, i) => {
    const m = rows[i].m;
    if (r.kind !== 'work_status' || !DONE_VERB[r.action]) return;
    const tag = `${key} ${r.equip || '호기?'} ${r.action} «${String(m.body).split('\n')[0].slice(0, 30)}»`;
    if (!isKakaoClaim(m.body)) { notes.push(`${tag} — 물음·예정 글이라 적지 않음`); return; }
    if (r.ts > m.ts + 60000 || r.ts > nowMs) { notes.push(`${tag} — 보낸 시각보다 뒤의 시각이라 적지 않음`); return; }
    if (r.dup) { notes.push(`${tag} — 앱에 이미 있음`); return; }
    if (r.replaces) { notes.push(`${tag} — 앱 기록과 시각이 다름(앱 ${new Date(r.prevTs).toTimeString().slice(0, 5)} · 카톡 ${new Date(r.ts).toTimeString().slice(0, 5)}) — 수집기는 옮기지 않음`); return; }
    if (!r.equip) { notes.push(`${tag} — 호기가 없어 적지 않음`); return; }
    const k2 = `${r.equip}|${r.action}`;
    if (done.has(k2)) { notes.push(`${tag} — 같은 회차에 이미 적음`); return; }
    const verb = DONE_VERB[r.action];
    //  시작인데 그 뒤 완료가 이미 있으면(앱 또는 이 회차) 보고만 넣고 «진행 중» 은 살리지 않는다(5.29 감사 상-2).
    const closed = verb === 'start' && laterDone(r.equip, r.mode, r.ts);
    const p = { kind: 'status', equip: r.equip, mode: r.mode, verb, reason: '', raw: r.raw };
    const plan = planMirWorkReport(p, { voyageKey: key, voyage: voy, activeWork: closed ? {} : aw, inspectors: {}, relayBy: '카톡', nowMs: r.ts });
    if (plan.ask) { notes.push(`${tag} — 적지 않음: ${plan.ask.replace(/🐱/g, '').trim()}`); return; }
    for (const w of plan.writes || []) {
      if (w.aw) {
        if (closed) continue;
        const { equip, mode, val } = w.aw;
        patch[`activeWork/${key}/${equip}/${mode}`] = val === undefined ? null : val;
        aw = { ...aw, [equip]: { ...(aw[equip] || {}), [mode]: val === undefined ? null : val } };
      } else if (w.report) {
        if (closed && w.report.action !== r.action) continue;   // 다른 작업을 «중단» 으로 바꾸는 곁가지도 넣지 않는다
        let ts = Math.max(r.ts, lastKey + 1);
        while ((voy.reports || {})[ts] || patch[`voyages/${key}/reports/${ts}`]) ts += 1;
        lastKey = ts;
        const by = cleanWho(m.who) || w.report.by || '';
        patch[`voyages/${key}/reports/${ts}`] = { ...w.report, by, via: 'kakao', relayBy: '카톡', kakaoId: m.id || '', ...(r.sentTs ? { sentTs: r.sentTs } : {}), ts, created_at: new Date(ts).toISOString() };
      }
    }
    done.add(k2);
    said.push(`${key} ${r.equip} ${r.action} ${new Date(r.ts).toTimeString().slice(0, 5)}`);
  });
  return { patch, said, notes };
}

/**
 * 한 회차 계획 — 수집기 kakao_helper 가 부른다.
 * input = { nowMs, rooms:[{ title, text }], seen:{ [방 제목]: [msgId…] }, voyages:[{ key, info, has:{loading,discharge}, reports, reports_deleted, activeWork }], firstRunHours }
 * 돌려줌 = { patch:{경로:값}, said:[…], notes:[…], seen:{ [방 제목]: [msgId…] }, rooms:[{ title, id, ship, kind, total, fresh }] }
 *   seen 에는 처리가 끝난 글만 넣는다 — 맞는 항차가 아직 없는 글은 48시간 동안 다음 회차에 다시 본다(5.29 감사 상-3).
 */
const WAIT_H = 48;
export function kakaoPlan(input) {
  const nowMs = Number(input && input.nowMs) || Date.now();
  const list = (input && input.voyages) || [];
  const seenIn = (input && input.seen) || {};
  const firstH = Number(input && input.firstRunHours) || 36;
  const patch = {}, said = [], notes = [], seenOut = {}, roomsOut = [];
  const fcCands = [];
  const waitIds = new Map();   // 방 제목 → Set(다시 볼 글)
  const wait = (sk, m) => { if (m.ts >= nowMs - WAIT_H * 3600000) { if (!waitIds.has(sk)) waitIds.set(sk, new Set()); waitIds.get(sk).add(m.id); } };
  const allIds = new Map();
  for (const rw of (input && input.rooms) || []) {
    const room = kakaoRoomOf(rw.title);
    if (!room) { notes.push(`모르는 방 «${rw.title}» — 읽지 않음`); continue; }
    const sk = room.title;   // 본 글 기억은 방 제목마다(일조·일조선사는 같은 배지만 다른 방 — 한 칸에 섞으면 서로 덮는다)
    const all = kakaoMessagesWithIds(rw.text || '', { baseDate: new Date(nowMs) });
    //  날짜 전환선 앞 글은 날짜가 짐작이다 — 자동으로는 쓰지 않는다(5.29 감사 중-8 · 다음 복사본에 전환선과 함께 오면 그때 쓴다).
    const msgs = all.filter((m) => m.dated);
    allIds.set(sk, msgs.map((m) => m.id));
    const had = new Set(seenIn[sk] || []);
    const first = !seenIn[sk];
    //  처음 읽는 방은 최근 것만(기본 36시간) — 지난 대화를 통째로 다시 적지 않는다.
    const fresh = msgs.filter((m) => !had.has(m.id) && (!first || m.ts >= nowMs - firstH * 3600000) && m.ts <= nowMs + 10 * 60000);
    const ro = { title: rw.title, id: room.id, ship: room.ship, kind: room.kind, total: msgs.length, fresh: fresh.length, waiting: 0 };
    roomsOut.push(ro);
    if (!fresh.length) continue;
    // ① 배 화면 줄
    for (const m of fresh) {
      if (isKakaoNoise(m.body)) continue;
      const v = kakaoVoyageAt(list, room.ship, m.ts);
      if (!v) { wait(sk, m); continue; }
      patch[`voyages/${v.key}/kakao/${m.id}`] = { room: room.title, kind: room.kind, who: m.who, at: m.ts, body: m.body.slice(0, 400) };
    }
    // ② 선사 방 — 물량 예보(모든 방을 모은 뒤 글 시각 순서로 — 5.29 감사 중-6)
    if (room.kind === 'line') for (const m of fresh) fcCands.push({ room, m, sk });
    // ③ 검수사 방 — 작업 시작·종료(항차별로 묶어서)
    if (room.kind === 'crew') {
      const byVoy = new Map();
      for (const m of fresh) {
        const v = kakaoVoyageAt(list, room.ship, m.ts);
        if (!v) { wait(sk, m); continue; }
        if (!byVoy.has(v.key)) byVoy.set(v.key, { v, msgs: [] });
        byVoy.get(v.key).msgs.push(m);
      }
      for (const { v, msgs: ms } of byVoy.values()) {
        const wp = kakaoWorkPlanOf(v, ms, nowMs);
        Object.assign(patch, wp.patch); said.push(...wp.said); notes.push(...wp.notes);
      }
    }
  }
  fcCands.sort((a, b) => a.m.ts - b.m.ts);
  const fcNow = new Map();   // 항차 키 → 이 회차에 계획한 예보(kakaoAt·kakaoId)
  for (const { room, m, sk } of fcCands) {
    const fp = kakaoForecastPlanOf(room, m, list, nowMs, (v) => ({ ...((v.info && v.info.forecast) || {}), ...(fcNow.get(v.key) || {}) }));
    if (!fp) continue;
    if (fp.patch) { Object.assign(patch, fp.patch); said.push(fp.said); fcNow.set(fp.key, { kakaoAt: fp.kakaoAt, kakaoId: fp.kakaoId }); }
    if (fp.note) notes.push(fp.note);
    if (fp.wait) wait(sk, m);
  }
  for (const ro of roomsOut) ro.waiting = (waitIds.get(ro.title) || new Set()).size;   // 수집기는 기다리는 글이 있는 방을 복사본이 그대로여도 다음 회차에 다시 넘긴다
  for (const [sk, ids] of allIds) {
    const w = waitIds.get(sk) || new Set();
    seenOut[sk] = Array.from(new Set([...(seenIn[sk] || []), ...ids.filter((id) => !w.has(id))])).slice(-3000);
  }
  return { patch, said, notes, seen: seenOut, rooms: roomsOut };
}

/** 배 화면 카톡 줄 — voyage.kakao 를 최신순으로(사진·삭제 줄은 애초에 안 들어온다) */
export function kakaoLinesOf(voyage, max = 40) {
  return Object.entries((voyage && voyage.kakao) || {})
    .map(([id, v]) => ({ id, ...(v || {}) }))
    .filter((x) => x && x.at && x.body)
    .sort((a, b) => b.at - a.at)
    .slice(0, max);
}
