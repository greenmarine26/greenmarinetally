// 미르 답 고르기 한 벌 — 검수앱 세 화면·떠 있는 미르·콘앱이 전부 이 answerOne 하나를 부른다(어디서 물어도 같은 답).
/* ★ TallyOne 3.41 / ConeOne 2.48 (검수사 2026-09-10)
     «미르를 하나로 만들고 싶습니다» · «미르를 앱 어디에든 항상 띄워서 모든 질문을 받을수 있게 해주세요» ·
     «전 미르가 앱이 갖고 있는 자료를 막힘없이 답할 수 있느냐가 중요합니다»

   ── 왜 이 파일이 있나
   답을 고르는 자리가 **넷**이었다(관문 2 실측 2026-09-10) — 작업창 SearchPanel(1035~1241) · 양하선적 탭 카드
   VoyagePage(2786~2817) · 홈 GlobalSearchPage(325~805) · 콘앱 엔진 mirCore.entry(69~239).
   같은 질문이 화면마다 다르게 답했다 — 트윈은 작업창만, 해치커버는 홈만, 시프팅은 홈에서 자료가 안 들어가고,
   경고문 설명은 작업창만, 뜻 질문은 작업창 게이트(hasAnyCondition)에 막혔다.
   ⇒ 네 벌을 **여기 한 벌**로 내린다. 화면은 재료(ctx)만 싣고 답은 여기서 고른다(규범 §4-4 «같은 판정은 한 벌»).

   ── ctx 계약 (화면이 실을 수 있는 만큼 싣는다 · 없으면 그 갈래는 조용히 건너뛴다)
   { app:'tally'|'cone',
     // 항차 맥락
     voyageKey, voyage(info·discharge·loading·photos·reports 원본), info, containers(양하+선적 병합 · _mode·_ptk·_comp·_xray), mode,
     compMap, shiftMap, bayPairs|pairsMap, rfSkip, esealBrief|eseal, photos, terminalWork, pilotForecast, portMisData, weatherText,
     shipSpeed, carrierContacts, shipContacts, diagAlerts, inspector, isChief, handover:{note, finalized}, lastTopic, modeChoice,
     gangShift(n)·crewAnswer(cq)·gangBrief() 클로저(화면이 감싸 준다 — 없으면 여기서 voyage 로 만든다),
     // 전역 맥락(홈·수석·떠 있는 미르)
     voyages(전 항차), flat(전 항차 컨), shipCtx({key,info,v,has} — 질문 속 배), chiefData, heartbeat, ediPattern,
     // 동작
     execDevice(밝기·소리를 여기서 실행해도 되는 자리만 true), smallTalkLast(검수앱 true), cone:{rows…}(콘앱) }

   답을 못 내면 null. 화면은 null 이면 종전대로 카드·릴레이·안내를 낸다. */
import {
  parseNaturalQuery, applyNLFilter, generateLocalAnswer, generateBriefing, generateIntroAnswer, generateTimeAnswer,
  generateWakeAnswer, generatePilotAnswer, generateTwinCheckAnswer, generateHandover, generateFoodAnswer, answerAboutAlert,
  generateHowToAnswer, isRealtimeProgressQuery, formatTerminalWorkAnswer, formatAppTallyAnswer, needsModeChoice,
  generateContactAnswer, answerCraneCrew, crewSetText, answerHowCore, generateSealAuditAnswer, formatCarriers,
  describeQuery, hasAnyCondition, terminalWorkFor, voyageDoneAts, voyageReportSpan,
} from './nlSearch.js';
import { mirKnowledge } from './data/mirKnowledge.js';
import { mirLearnedDef } from './mirLearn.js';   // 3.42: 뜻 답이 사전에서 왔는지(약한 답 판정)
import { mirTone, mirSmallTalk } from './mirChat.js';
import { runDeviceCmd, resolveShipKey, sideCancelled, shiftingMapForDisplay, dropFilledBookingSlots, legendItemsOf, resolveCrewSides, isPtk } from './utils.js';
import { coneAnswer, coneBriefing, isConeQuery, CONE_QA_HELP } from './coneKnowledge.js';
import { judgeMode, buildReadiness, describeReadiness } from './dataReadiness.js';
import { diffEdiList, explainEdiGap } from './ediGap.js';
import {
  answerFeedback, answerCollector, answerTallyPending, answerArchiveStats, answerOverlaps, answerDataArrival, answerHatchStatus,
  answerGangSplit, answerTotalMoves, answerFirstStart, answerXrayShifts, answerShiftBriefing, isDataArrivalQuery,
  answerPlanOutlook, answerPlanOutlookBoth, isPlanOutlookQuery, outlookModeOf, answerShipSpeed, isSpeedQuery,
  answerShipOverview, buildGangShift, gangBriefLines, answerGangShift,
} from './chiefAnswers.js';
import { answerEntityFacts, answerVoyageFacts, entityHead } from './mirFacts.js';

const S = (v) => (v == null ? '' : String(v).trim());
const PROGRESS_RE = /진행|어디까지\s*(?:했|왔|됐)|얼마나\s*(?:했|됐)|몇\s*(?:프로|퍼)|퍼센트|다\s*했|끝났|몇\s*대\s*(?:했|됐)|현황(?!\s*판)/;
const READY_RE = /자료\s*(?:현황|다\s*있|준비|빠|없|부족|미도착|왔)|어느\s*(?:선박|배|선사)[^?]*(?:없|빠|안\s*왔)|안\s*온\s*자료|EDI\s*(?:없|왔|들어왔)|리스트\s*(?:없|왔|들어왔)|베이플랜\s*(?:없|왔)/;
const _bayDefOf = (vsl) => { try { const d = (typeof window !== 'undefined' && window.__fbShipBayDict) ? window.__fbShipBayDict[S(vsl).toUpperCase()] : null; return d ? (d.bayDef || d) : null; } catch (e) { return null; } };
const _fmtDT = (x) => { const m = String(x || '').match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/); return m ? `${parseInt(m[2], 10)}월 ${parseInt(m[3], 10)}일 ${m[4]}:${m[5]}` : null; };
const _pT = (x) => { const m = String(x || '').match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : null; };
function _shipsOnDay(voyages, off) {
  const now = new Date();
  const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + off).getTime();
  const d1 = d0 + 24 * 3600 * 1000;
  return Object.entries(voyages || {}).map(([k, v]) => {
    const seg = String(v?.info?.planDate || '').split('~');
    const a = _pT(seg[0]); const b = seg[1] ? _pT(seg[1]) : a;
    return { k, v, a, b: (b == null ? a : b) };
  }).filter((x) => x.a != null && x.a < d1 && x.b >= d0).sort((x, y) => x.a - y.a);
}

/** 항차 맥락을 한 모양으로 편다 — 화면이 voyage 만 실어도 info·vsl·컨·완료·클로저를 여기서 채운다. */
function _normalize(ctx) {
  const c = { ...(ctx || {}) };
  if (c.shipCtx && !c.voyage) {   // 홈·떠 있는 미르 — 질문 속 배를 항차 맥락으로 승격
    c.voyage = c.shipCtx.v || null; c.voyageKey = c.voyageKey || c.shipCtx.key || null;
    if (!c.containers && Array.isArray(c.flat)) c.containers = c.flat.filter((x) => x.voyageKey === c.shipCtx.key);
  }
  const v = c.voyage || null;
  if (!c.info) c.info = (v && v.info) || null;
  if (!c.vsl) c.vsl = S(c.info && c.info.vsl);
  if (!c.vslFull) c.vslFull = S(c.info && c.info.vslFull);
  if (c.pier == null) c.pier = S(c.info && c.info.pier);
  if (!c.containers) c.containers = [];
  //  ★ 감사 지적(치명 1) — 양하선적 탭 카드·콘앱 컨에는 `_ptk`·`_mode` 가 없다. 그대로 두면 진행 답(formatAppTallyAnswer 의 `_ptk` 필터)이
  //    풀 0 으로 «앱 검수 기록 없음» 거짓을 낸다. 판정은 utils.isPtk 한 벌(§4-4) — 여기서 한 번 찍고 아래 갈래 전부가 그것을 본다.
  {
    const mode0 = c.mode || 'discharge';
    let touched = false;
    const out = c.containers.map((x) => {
      if (!x || (x._ptk !== undefined && x._mode)) return x;
      const m = x._mode || x.mode || mode0;
      let ptk = x._ptk;
      if (ptk === undefined) { try { ptk = m === 'transit' ? false : isPtk({ ...x, _inList: x._inList != null ? x._inList : (x._src === 'list' || x._src === 'both') }, m); } catch (e) { ptk = true; } }
      touched = true;
      return { ...x, _mode: m, _ptk: ptk };
    });
    if (touched) c.containers = out;
  }
  if (!c.compMap && v) { try { c.compMap = { ...(((v.discharge || {}).completed) || {}), ...(((v.loading || {}).completed) || {}) }; } catch (e) { /* 없으면 없는 대로 */ } }
  if (!c.photos && v) c.photos = v.photos || null;
  if (!c.voyageDoneAts && v) { try { c.voyageDoneAts = voyageDoneAts(v); } catch (e) { /* */ } }
  if (!c.shiftMap && v && c.voyageKey) { try { c.shiftMap = shiftingMapForDisplay(c.voyageKey, v); } catch (e) { /* */ } }
  //  ⚠ 트윈 짝(bayPairs)·PORT-MIS 매처(matchPortMis)는 화면이 실어 준다 — twin.js·portMisMatch.js 를 여기서 import 하면
  //    베이사전 2.2MB 가 콘앱 번들에 딸려 온다(실측 747KB → 2.0MB). 콘앱은 둘 다 없는 채로 종전과 같다.
  if (c.pairsMap == null) c.pairsMap = c.bayPairs || null;
  c.matchPortMis = (typeof c.matchPortMis === 'function') ? c.matchPortMis : (() => null);
  //  3.24: 페이스 분모는 «검수 시작 보고»가 있으면 그것 — reports 는 info 밖이라 여기서 얹는다(작업창은 이걸 덮어써 잃고 있었다).
  if (c.info && v && !c.info.reportStartAt) { try { c.info = { ...c.info, ...voyageReportSpan(v) }; } catch (e) { /* */ } }
  if (!c.tw) { try { c.tw = terminalWorkFor(c.info || {}, c.terminalWork || {}); } catch (e) { c.tw = null; } }
  const de = _bayDefOf(c.vsl);
  if (!c.gangShift && v) c.gangShift = (n) => { try { return answerGangShift(v, de, { nGangs: n || null, tw: c.tw, compMap: c.compMap || null }); } catch (e) { return null; } };
  if (!c.crewAnswer && v) c.crewAnswer = (cq) => { try { return answerCraneCrew(v, cq); } catch (e) { console.warn('[미르] 호기 검수원 답 실패', e); return null; } };
  if (!c.gangBrief && v) c.gangBrief = () => { try { return gangBriefLines(buildGangShift(v, de, { tw: c.tw, compMap: c.compMap || null })); } catch (e) { return null; } };
  c._bayDef = de;
  return c;
}

/** 질문 하나에 답한다(말투 없음). 못 내면 null. */
/*  ★ 3.42 (판 B) — `ctx._trace` 를 주면 **어느 길에서 답이 나왔는지** 적어 준다(`_trace.via`).
      «잡아채는 길»(사용법 매뉴얼·현재 시각·되묻기·베이사전 타령·진행 잡답·지식 추측·콘 안내)은 규칙이 자신 없이 낸 답이라,
      mirModel.askMir 가 그때만 모델을 부른다(번역 → 규칙 재실행 → 자료 답). 그 밖의 답에는 모델이 끼지 않는다. */
export function answerOneRaw(query, ctx) {
  const q = S(query);
  if (!q || q.length < 2) return null;
  const c = _normalize(ctx);
  const _via = (v) => { if (c._trace && typeof c._trace === 'object') c._trace.via = v; };   // 3.42: 잡아채는 길 표시(판 B 문지기 재료)
  const app = c.app || 'tally';
  const cs = c.containers || [];
  const v = c.voyage || null;
  const info = c.info || {};
  const ship = c.vslFull || c.vsl || '';
  const hasShip = !!(v || c.vsl);
  const mode = c.mode || 'discharge';
  const modeKr = mode === 'loading' ? '선적' : '양하';

  //  ⓪ 잡담(콘앱 기준은 앞) — 검수앱은 뒤에서 본다(smallTalkLast). mirSmallTalk 은 업무 낱말 게이트가 있다.
  if (!c.smallTalkLast) { try { const st = mirSmallTalk(q); if (st) return st; } catch (e) { /* 잡담이 막혀도 일 이야기는 계속 */ } }

  let p = null;
  try { p = parseNaturalQuery(q); } catch (e) { p = null; }
  if (!p) return null;

  //  ① 콘 이야기 — 콘앱이면 콘 지식이 먼저. 단 검수 속성(끝네자리·온도·실번호·엑스레이…)을 물으면 검수 답이 우선이다
  //    (2.48 — 종전엔 콘앱에서 «베이»만 들어가면 콘 답이 전부 가로챘다. 관문 2 실측).
  //  ★ 3.43-01 — «진행» 을 묻는 말(«실제 진행 상황»·«얼마나 했어»)은 콘앱에서도 ⑥ 진행 두 갈래로 간다. 종전엔 nlSearch 가 «상황» 을
  //    briefingQuery 로도 세워 콘앱만 ①이 브리핑을 먼저 냈다 — 검수앱은 ⑥, 콘앱은 ① 로 **같은 말에 다른 답**(검수사 2026-09-11
  //    «검수앱과 콘앱에 공통되는 질문이라면 답은 같아야 합니다», 실측 KBTR 2606E). 판정은 ⑥의 _progressLike 와 같은 식 한 벌.
  const _progressLike = /진행|어디까지\s*(?:했|왔|됐)|얼마나\s*(?:했|됐)|몇\s*(?:프로|퍼)|퍼센트|다\s*했|끝났|몇\s*대\s*(?:했|됐)/.test(q)
    || (/현황(?!\s*판)/.test(q) && !hasAnyCondition(p));
  if (c.cone && (app === 'cone' ? (/콘/.test(q) || !(p.digits || p.entityAttr || p.factQuery || p.type || p.sealAuditQuery)) : isConeQuery(q))) {
    try {
      if (p.briefingQuery && !(_progressLike && !/자료|브리핑|요약/.test(q))) {
        const parts = [];
        for (const m of ['discharge', 'loading']) {
          const sub = cs.filter((x) => (m === 'loading' ? x._mode === 'loading' : x._mode !== 'loading'));
          if (!sub.length) continue;
          try {
            const b = generateBriefing(sub, m === 'loading' ? '선적' : '양하', m, c.pairsMap || null, c.pier || '',
              { rfSkip: !!c.rfSkip, eseal: m === 'loading' ? (c.esealBrief || c.eseal || null) : null, photos: c.photos || null, tw: c.tw || null,
                gang: c.gangBrief ? c.gangBrief() : null, cancelled: sideCancelled(info, m, c.tw), compMap: c.compMap || null, shiftMap: c.shiftMap || null });
            if (b) parts.push('【' + (m === 'loading' ? '선적' : '양하') + '】\n' + b);
          } catch (e) { /* 한쪽이 막혀도 다른 쪽은 낸다 */ }
        }
        const cb = coneBriefing(c.cone, { vsl: ship, shiftN: c.shiftN || 0 });
        if (cb) parts.push('【콘】\n' + cb);
        if (parts.length) return (ship ? ship + '\n' : '') + parts.join('\n\n');
      }
      //  3.43-01: 콘 낱말이 있을 때만 콘 계산 답 — 종전엔 콘앱에서 «얼마나 남았어»·«다 했어» 가 콘 «남는 곳(반납)»·«전체 가감» 으로
      //    가로채였다(감사 실측, 콘 작업표가 있을 때). 낱말 목록은 coneAnswer 의 작업표 없음 폴백과 같은 벌.
      //    «전체» 는 홀말일 때만 콘 총가감(도움말 예시) — «전체 진행 상황» 은 진행 답. 가져갈·돌려줄·회수·더 필요는 콘 브리핑 본문 어휘(재감사).
      if (isConeQuery(q) || /베이|모자|부족|남는|반납|가감|작업량|물량|가져|돌려|회수|챙겨|더\s*필요/.test(q) || /^(전체|전부)\s*[?!.~]*$/.test(String(q).trim())) { const a = coneAnswer(q, c.cone); if (a) return a; }
    } catch (e) { /* 콘 지식이 막혀도 미르는 계속 답한다 */ }
  }

  //  ②-1 화면 밝기·소리 — 실행은 허락된 자리(execDevice)만. 검수앱 화면은 useEffect 가 따로 실행한다(재렌더 반복 실행 금지).
  if (p.deviceCmd && c.execDevice) { try { const r = runDeviceCmd(p.deviceCmd); if (r) return r; } catch (e) { console.warn('[미르] 화면 조절 실패:', e); } }

  //  ②-2 경고 문장을 그대로 물은 것 — 검색 파서보다 앞(1.23 — «풀»·«5톤 이상»이 먼저 잡히면 엉뚱한 답).
  if (Array.isArray(c.diagAlerts) && c.diagAlerts.length) { try { const a = answerAboutAlert(q, c.diagAlerts); if (a) return a; } catch (e) { /* */ } }

  //  ②-3 선박 연락처 — howTo 보다 먼저(«메일주소 뭐야»의 '뭐야'가 기능 색인에 먹히면 안 된다).
  if (p.contactQuery) {
    if (c.shipContacts === undefined && c.limited) return null;   // 탭 카드 — 연락처를 안 싣는 자리, 작업 시작 탭으로 릴레이
    if (c.shipContacts === undefined || c.shipContacts === null) return '연락처를 불러오는 중입니다 — 잠시 후 다시 물어봐 주세요.';
    const cq = p.contactQuery;
    const rawCand = cq.code ? String(cq.code).toUpperCase() : '';
    const candNoSp = rawCand.replace(/\s+/g, '');
    const curCode = S(info.vsl).toUpperCase(), curFull = S(info.vslFull).toUpperCase();
    const isThis = hasShip && (!rawCand || candNoSp === curCode || (curFull && curFull.includes(rawCand)));
    if (isThis) {
      if (!curCode) return '이 항차에 선박 코드가 없어 연락처를 찾을 수 없습니다.';
      return generateContactAnswer(c.shipContacts[curCode] || null, ship || '이 배', cq.onboardOnly);
    }
    if (rawCand && !/\s/.test(rawCand)) return generateContactAnswer(c.shipContacts[candNoSp] || null, cq.code, cq.onboardOnly);
    return hasShip
      ? `${cq.code} — 지금 보는 배(${ship})가 아닙니다. 다른 배 연락처는 배 이름을 붙여 물어보세요.`
      : '어느 배 말씀인지 배 이름을 붙여 주시면 연락처를 찾아 드립니다. (예: "PCSZ 이메일")';
  }

  //  ③ 인사 — «미르야» 단독. 뒤에 일이 붙은 부름은 인사가 아니다.
  const _bareCall = p.mirCalled && !hasAnyCondition(p) && !p.factQuery && !p.briefingQuery && !p.progressQuery && !p.etaQuery && !p.introQuery && !p.shipIntroQuery && !p.timeQuery && !p.asking;
  if (p.mirHello || _bareCall) {
    //  2차 시뮬 지적 — «미르 점심 먹었어?»·«미르 점심은?» 은 인사가 아니라 잡담(3.7-06)이다. 부름만 있어도 잡담 그물이 먼저 받는다.
    try { const st = mirSmallTalk(q); if (st) return st; } catch (e) { /* */ }
    return hasShip
      ? '네, 미르예요 🐱 뭐 확인해 드릴까요?\n(예: "3426 온도" · "브리핑" · "얼마나 남았어" · "리퍼 몇 대" · "접안 현측")'
      : '네, 미르예요 🐱 뭐 확인해 드릴까요?\n(예: "미르야 OBWH 브리핑" · "오늘 작업 선박" · "KBTR 마감텔리 수치")';
  }

  //  ④ 수석 통계 — 배 이름 없이 묻는 것. 검수원에게는 수석 유도 한 줄(1.69-01).
  const Q = q;
  const chiefLike = /오답|미회신|피드백|수집기|하트비트|mailpilot/i.test(Q)
    || (/마감|텔리/.test(Q) && /(안\s*보|미발송|미생성|안\s*만|안\s*나간|빠진|남은|몇\s*건)/.test(Q))
    || /이번\s*달|지난\s*달|저번\s*달|월\s*(?:통계|실적|물량)|선사\s*순위|어제\s*실적|완료\s*항차/.test(Q)
    || READY_RE.test(Q);
  if (chiefLike && c.isChief === false && app !== 'cone') {
    //  1.69(검수사 확정): 자료현황류는 수석의 영역 — 항차 화면에서 물으면 그 항차의 유무만 한 줄, 그 밖은 수석 유도.
    if (v && READY_RE.test(Q)) {
      try {
        const L = [];
        [['discharge', '양하'], ['loading', '선적']].forEach(([md, kr]) => { if (!v[md]) return; const j = judgeMode(v[md]); L.push(`${kr} — ${j.state === 'ready' ? `준비완료 (EDI ${j.edi} · 리스트 ${j.list})` : j.label}`); });
        if (L.length) return `${L.join(' · ')}\n자세한 내용은 수석 검수사에게 문의하세요.`;
      } catch (e) { /* 아래 유도로 */ }
    }
    return '수석 전용 정보입니다. 자세한 내용은 수석 검수사에게 문의하세요.';
  }
  if (c.isChief && c.chiefData) {
    const cd = c.chiefData;
    const _err = (x, what) => (x && x.__error) ? `${what}를 읽지 못했습니다 — 네트워크 확인 후 다시 물어봐 주세요.` : null;
    if (/오답|미회신|피드백/.test(Q)) return _err(cd.feedback, '오답 리포트') || answerFeedback(cd.feedback ?? null);
    if (/수집기|메일\s*수집|하트비트|mailpilot/i.test(Q)) return answerCollector(c.heartbeat || null);
    if (/마감|텔리/.test(Q) && /(안\s*보|미발송|미생성|안\s*만|안\s*나간|빠진|남은|몇\s*건)/.test(Q)) return _err(cd.tallyPending, '마감 목록') || answerTallyPending(cd.tallyPending ?? null);
    if (/이번\s*달|월\s*(?:통계|실적|물량)|선사\s*순위/.test(Q) || /지난\s*달|저번\s*달/.test(Q)) {
      return _err(cd.archiveList, '보관소') || answerArchiveStats(Array.isArray(cd.archiveList) ? cd.archiveList : null,
        { bayDict: (typeof window !== 'undefined' && window.__fbShipBayDict) || {}, prevMonth: /지난\s*달|저번\s*달/.test(Q) });
    }
    if (/어제\s*실적|완료\s*(?:항차|된\s*배)/.test(Q)) {
      return _err(cd.archiveList, '보관소') || answerArchiveStats(Array.isArray(cd.archiveList) ? cd.archiveList : null, { kind: /어제/.test(Q) ? 'yesterday' : 'recent' });
    }
    if (/(?:배|선박|항차|작업|시간).{0,10}겹치|겹치는\s*(?:배|선박|항차|시간)/.test(Q) && !/끝\s*자리|끝자리|번호/.test(Q) && c.voyages) return answerOverlaps(c.voyages);
    if (/(보관|아카이브)/.test(Q) && /(몇|얼마|있어|있나|현황|목록|뭐)/.test(Q) && !c.shipCtx && !v) {
      const arch = cd.archiveList;
      if (arch === null || arch === undefined) return '보관소를 읽는 중이에요 — 잠시 후 다시 물어봐 주세요.';
      if (arch && arch.__error) return '보관소를 읽지 못했어요 — 네트워크 확인 후 다시 물어봐 주세요.';
      const list = Array.isArray(arch) ? arch : [];
      if (!list.length) return '보관소에 완료 저장된 항차가 아직 없어요.';
      const ships = new Set(list.map((a) => a.vsl));
      const sorted = list.slice().sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));
      const _t = (ms) => { if (!ms) return ''; const d = new Date(ms); return `${d.getMonth() + 1}/${d.getDate()}`; };
      const L = [`📦 보관소에 완료 항차 ${list.length}건이 있어요 (${ships.size}척).`];
      L.push(`가장 최근: ${_t(sorted[0].archivedAt)} ${String(sorted[0].voyageKey || '').replace('_', ' ')}`);
      L.push(`가장 오래된 것: ${_t(sorted[sorted.length - 1].archivedAt)} ${String(sorted[sorted.length - 1].voyageKey || '').replace('_', ' ')}`);
      L.push(''); L.push('최근 5항차');
      sorted.slice(0, 5).forEach((a) => L.push(`· ${_t(a.archivedAt)} ${String(a.voyageKey || '').replace('_', ' ')} — 양하 ${a.discharge_ptk ?? '?'} · 선적 ${a.loading_ptk ?? '?'}`));
      L.push(''); L.push('배 이름을 붙여 물으면 그 배 것만 짚어 드려요 — 예: «DXQD 완료됐어?»');
      return L.join('\n');
    }
  }

  //  ⑤ EDI↔리스트 대수 차이 — 배가 정해졌을 때만(2.35).
  if (v && /(안\s*맞|다르|차이|틀리|어긋|왜\s*(달라|다르))/.test(Q) && /(대수|갯수|개수|양하|선적|EDI|리스트|숫자)/i.test(Q)) {
    try {
      const _mode = /선적|LOLO|로딩/i.test(Q) ? 'loading' : 'discharge';
      const _sec = v[_mode];
      const _raw = (v[_mode] && v[_mode].raw && v[_mode].raw.edi && v[_mode].raw.edi.text) || (v.raw && v.raw.edi && v.raw.edi.text) || '';
      const _d = diffEdiList(_sec, _raw);
      if (_d) return explainEdiGap(_d, c.vsl);
      if (_sec && _sec.ediContainers && _sec.records) return `${c.vsl} ${_mode === 'loading' ? '선적' : '양하'} — EDI와 리스트가 딱 맞아요. 어긋나는 컨이 없어요 😺`;
    } catch (e) { /* 아래로 */ }
  }

  //  ⑥ 진행 — 두 갈래(1.69-02·2.55). 사람·호기·조건이 붙은 진행은 본체가 낸다.
  //  감사 지적(중 6·2차 시뮬 4) — «데미지 현황»·«선사 현황»·«수화물 현황»은 진행이 아니고, «시간당 몇 대 했어»는 페이스다.
  //  (_progressLike 는 ① 앞에서 한 번 계산한다 — 3.43-01, 콘앱 브리핑 가로채기와 한 벌)
  if (_progressLike && !/자료|브리핑|요약/.test(Q) && !p.crewQuery && !p.factQuery && !p.paceQuery
      && !p.dmgQuery && !p.carrierQuery && !p.luggQuery && !p.urgentQuery && !p.bayDistQuery && !p.sealAuditQuery
      && !p.digits && p.bay == null && !p.zone && !p.size && !p.fe && !p.type) {
    if (hasShip && cs.length) {
      _via('progress');   // 3.42: 조건 없는 진행 잡답 — «완료된 거 마지막 다섯 개»·«양하 끝난 시각» 이 여기로 떨어졌다(판 B 시뮬)
      const pool = dropFilledBookingSlots(cs);
      let _md = mode;
      if (!c.mode) _md = pool.some((x) => x._mode === 'loading') && !pool.some((x) => x._mode !== 'loading') ? 'loading' : 'discharge';
      try { return isRealtimeProgressQuery(Q) ? formatTerminalWorkAnswer(ship, c.tw, pool, _md) : formatAppTallyAnswer(ship, pool, c.tw, _md, info || null); } catch (e) { /* 아래로 */ }
    }
    if (!hasShip && c.isChief && c.chiefData) {   // 완료·보관된 배(1.69-06)
      const Q2 = Q.toUpperCase();
      const arch = c.chiefData.archiveList;
      if (Array.isArray(arch)) {
        const hits = arch.filter((a) => a && a.vsl && String(a.vsl).length >= 3 && Q2.includes(String(a.vsl).toUpperCase()));
        if (hits.length) {
          const h = hits.reduce((m, a) => (((a.archivedAt || 0) > (m.archivedAt || 0)) ? a : m));
          const t = h.archivedAt ? new Date(h.archivedAt) : null;
          const f = t ? `${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}` : '';
          const voy = String(h.voyageKey || '').split('_')[1] || '';
          return `✅ ${h.vsl}${voy ? ' ' + voy : ''} — ${f ? f + ' ' : ''}완료·보관됨 (수석 완료 저장 기준).\n평택분 양하 ${h.discharge_ptk ?? '?'} · 선적 ${h.loading_ptk ?? '?'} — 상세는 보관소에서.`;
        }
      } else if (arch === null || arch === undefined) { if (/[A-Z]{3,}/.test(Q2)) return '보관소 기록을 읽는 중입니다 — 잠시 후 다시 물어봐 주세요.'; }
      else if (arch && arch.__error) return '보관소를 읽지 못했습니다 — 네트워크 확인 후 다시 물어봐 주세요.';
    }
  }

  //  ⑦ 콜사인·IMO — 기능 설명보다 먼저(1.68).
  if (hasShip && /콜사인|호출\s*부호|\bIMO\b|아이엠오/i.test(Q)) {
    const d = ((typeof window !== 'undefined' && window.__fbShipBayDict) || {})[S(info.vsl).toUpperCase()] || {};
    const L = [];
    const csn = info.callsign || d.callsign; if (csn) L.push(`콜사인 ${csn}`);
    if (d.imo || info.imo) L.push(`IMO ${d.imo || info.imo}`);
    return L.length ? `${ship} — ${L.join(' · ')}` : `${ship} — 콜사인·IMO가 아직 등록 전입니다.`;
  }

  //  ⑧ 사람·호기 등록·조회 — 배가 있어야 한다.
  if (p.crewSet || p.crewQuery) {
    if (!v) return '어느 배 말씀인지 배 이름을 붙여 주세요 — 예: «OBWH 1호기 이인철 3호기 최관식» · «SWMM 김성일 몇 개 했어»';
    if (p.crewSet && app === 'cone') return '호기 검수원은 검수앱에서 적어 주세요 — 콘앱은 적는 손이 없어요.';   // 재감사: 콘앱엔 fbSetVoyageCraneCrew 가 없다
    if (p.crewSet) { try { return crewSetText(resolveCrewSides(p.crewSet, v), ship); } catch (e) { /* 본체로 */ } }
    if (p.crewQuery && c.crewAnswer) { try { const a = c.crewAnswer(p.crewQuery); if (a) return a; } catch (e) { /* 본체로 */ } }
  }

  //  ⑨ 배 지정 계산 — 자료 도착·해치·갱 분배·총 무브·최초 시작·X-RAY 조별·교대 브리핑·갱 배분(1.69·2.62) — 홈에만 있던 것을 어디서나.
  {
    const isArrivalQ = isDataArrivalQuery(Q);
    const isHatchQ = /해치|커버/.test(Q) && /(?:열|오픈|개방|닫|몇\s*장|실황|상태|어디|어때|됐)/.test(Q) && p.bay == null && !p.howToQuery;   // «해치 보고 어디서 해» 는 기능 위치 질문
    const isGangQ = /(?:갱|크레인).{0,14}(?:분배|나눠|나누|분할)|분배.{0,10}(?:갱|크레인)|(?:갱|크레인)\s*2\s*개/.test(Q);
    const isMoveQ = /무브/.test(Q) && /(?:몇|총|얼마)/.test(Q);
    const isFirstQ = /(?:최초|처음|어디서?\s*부터|몇\s*번\s*부터).{0,10}(?:양하|시작|해)|양하.{0,12}(?:어디부터|어디서\s*시작|시작\s*어디|몇\s*번\s*부터)/.test(Q);
    const isXrayShiftQ = /엑스레이|x[\s.\-]*ray|xray/i.test(Q) && /(?:조별|주간|야간|부착|몇\s*대\s*가능)/.test(Q);
    const isShiftBriefQ = /교대.{0,8}브리핑|브리핑.{0,8}교대|교대\s*준비|인수\s*브리핑/.test(Q);
    const anyCalc = isArrivalQ || isHatchQ || isGangQ || isMoveQ || isFirstQ || isXrayShiftQ || isShiftBriefQ;
    if (anyCalc && !v) return '어느 배 말씀인지 배 이름을 붙여 주시면 여기서 바로 계산합니다. (예: "HAYN 갱 2개로 분배")';
    if (v) {
      const _voy = { ...v, key: c.voyageKey || '', _key: c.voyageKey || '' };
      const de = c._bayDef;
      try {
        if (isArrivalQ) return answerDataArrival(_voy, ship);
        if (isHatchQ) return answerHatchStatus(_voy, de, ship) || answerVoyageFacts({ factQuery: 'hatch' }, c);
        if (isGangQ) return answerGangSplit(_voy, de, ship);
        if (isMoveQ) return answerTotalMoves(_voy, ship);
        if (isFirstQ) return answerFirstStart(_voy, de, ship);
        if (isXrayShiftQ) return answerXrayShifts(_voy, de, { shipName: ship, pier: info.pier });
        if (isShiftBriefQ) return answerShiftBriefing(_voy, de, { shipName: ship, voyages: c.voyages || null });
        //  3.42: «2호기 11:15 시작했어» 는 적는 말이다 — 종전엔 gangQuery(n:null) 가 같이 켜져 «베이사전이 필요해요» 가 답을 가로챘다(판 B 시뮬). 저장은 화면(부수효과)이 한다.
        if (p.startSet && Array.isArray(p.startSet.cranes) && p.startSet.cranes.length && app === 'cone') return '시작 시각은 검수앱(작업 시작 탭)에서 적어 주세요 — 콘앱은 적는 손이 없어요.';   // 감사: 콘앱엔 fbSetVoyageWorkStart 가 없다
        if (p.startSet && Array.isArray(p.startSet.cranes) && p.startSet.cranes.length) {
          const _fmt = (ms) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
          return `⏱ ${ship} ${p.startSet.cranes.map((x) => `${x.no}호기 ${_fmt(x.ms)}`).join(' · ')} 시작으로 적을게요 — 페이스·예상 완료를 그 시각부터 다시 계산해요.`;
        }
        if (p.gangQuery && c.gangShift) { const a = c.gangShift(p.gangQuery.n || null); if (a) { if (/베이사전이 필요/.test(a)) _via('gangDict'); return (hasShip && !c.mode ? `${ship}\n` : '') + a; } }
      } catch (e) { console.warn('[미르] 배 지정 계산 실패:', e); }
    }
  }

  //  ⑨-B ★ 창구 15건 — 개체(끝네자리+속성) · 항차 사실. 입출항·시각·본체보다 먼저 본다(값은 있는데 말이 없던 것들 — «접안 현측»이 입출항 갈래에 먹히면 안 된다).
  if (hasShip && !p.howToQuery) {
    try { const a = answerEntityFacts(p, c); if (a) return a; } catch (e) { console.warn('[미르 창구] 개체 답 실패:', e); }
    try { const a = answerVoyageFacts(p, c); if (a) return a; } catch (e) { console.warn('[미르 창구] 항차 답 실패:', e); }
  } else if (!hasShip && (p.entityAttr || p.factQuery)) {
    //  떠 있는 미르(카드 없음) — 끝네자리+속성이면 전 항차에서 그 컨을 찾아 배마다 답한다(«3426 온도» 를 홈에서 물어도).
    if (p.entityAttr && p.digits && c.countFallback && Array.isArray(c.flat) && c.voyages) {
      const d = String(p.digits).slice(-4);
      const byKey = new Map();
      for (const x of c.flat) { if (x && x.cn && String(x.cn).slice(-4) === d) { if (!byKey.has(x.voyageKey)) byKey.set(x.voyageKey, []); byKey.get(x.voyageKey).push(x); } }
      if (!byKey.size) return `끝네자리 ${d} — 지금 항차 어디에도 없어요.`;
      const parts = [];
      for (const [k, arr] of byKey) {
        const vv = c.voyages[k] || null;
        try { const a = answerEntityFacts(p, { containers: arr, voyage: vv, info: vv && vv.info, mode: c.mode }); if (a) parts.push(`【${(vv && vv.info && vv.info.vsl) || k}】\n${a}`); } catch (e) { /* 배 하나 실패해도 계속 */ }
      }
      if (parts.length) return parts.join('\n\n');
    }
    return '어느 배 말씀인지 배 이름을 붙여 주시면 바로 답합니다. (예: "KBTR 3426 온도" · "NSFR 접안 현측")';
  }

  //  ⑩ 브리핑 속 «N건» 후속 — 직전 주제가 실 점검·브리핑이면 그 상세(1.69-01).
  if (hasShip && /(?:\d+\s*건|그게|그거|저거|아까\s*(?:그|말한)\s*거?)\s*(?:이|가|은|는|이란)?\s*(?:뭐|뭔|무엇|무슨|내용|상세|자세)/.test(Q)) {
    const topic = p.sealAuditQuery ? 'seal' : c.lastTopic;
    if (topic === 'seal' || (topic === 'briefing' && /건/.test(Q))) return generateSealAuditAnswer(cs.filter((x) => x._mode === mode), modeKr);
  }

  //  ⑪ 뜻·방법 — 본체 한 벌(2.57-02·2.59-01). 홈은 조회 폴백이 없으니 못 찾으면 고백한다.
  if (p.asking === 'def') {
    try {
      const d = generateLocalAnswer(p, [], [], null);
      if (d) {
        //  3.42: 뜻풀이가 지식·사전이 아니라 **사용법 매뉴얼 추측**(generateHowToAnswer)에서 왔으면 약한 답 — «제일 무거운 컨 뭐야»가 «컨테이너 번호 수정» 매뉴얼로 잡혔다(판 B 시뮬)
        let strong = null; try { strong = mirKnowledge(q) || mirLearnedDef(q) || (p._learnedDef || null); } catch (e) { strong = null; }
        if (!strong) _via('howTo');
        return d;
      }
    } catch (e) { /* */ }
  }
  if (p.asking === 'how') {
    try { const h = answerHowCore(p); if (h) { try { if (mirKnowledge(Q) === h) _via('knowledge'); } catch (e) { /* */ } return h; } } catch (e) { /* */ }   // 3.43-02: 원장 답은 표시해 둔다(모델 번역이 덮지 않게)
    if (!hasShip) { _via('unlearned'); return '그 방법은 아직 못 배웠습니다 😿 지어내지 않을게요. 개발자에게 전달해 둘게요.'; }
  }
  //  3.43-02: 기능 사용법(howToQuery)도 **실무 지식(원장)이 먼저** — «씰 잘림 대처법» 이 색인의 「실번호 입력」 기능 설명으로 갔다(검수사 실측
  //    «씰 잘림(씰 파손) 대처법을 물었는데 씰번호 틀림을 알립니다»). answerHowCore(asking=how)와 같은 순서.
  if (p.howToQuery) {
    try { const k = mirKnowledge(Q); if (k) { _via('knowledge'); return k; } } catch (e) { /* 원장이 막혀도 색인은 답한다 */ }
    try { const a = generateHowToAnswer(Q, p, { isChief: !!c.isChief }); if (a) { _via('howTo'); return a; } } catch (e) { /* */ }
  }

  //  ⑫ 자료 현황 — 배가 있으면 그 배 한 줄(항차 화면) 또는 결론부터(홈), 없으면 전체 가로질러.
  if (READY_RE.test(Q) && app !== 'cone') {
    try {
      if (v && !c.voyages) {   // 항차 화면 — 유무 한 줄 + 수석 유도(1.69)
        const L = [];
        [['discharge', '양하'], ['loading', '선적']].forEach(([md, kr]) => { if (!v[md]) return; const j = judgeMode(v[md]); L.push(`${kr} — ${j.state === 'ready' ? `준비완료 (EDI ${j.edi} · 리스트 ${j.list})` : j.label}`); });
        if (L.length) return `${L.join(' · ')}\n자세한 내용은 수석 검수사에게 문의하세요.`;
      }
      if (c.voyages) {
        const rd = buildReadiness(c.voyages, (typeof window !== 'undefined' && window.__fbShipBayDict) || null);
        if (v && c.voyageKey) {
          const wantMode = /양하/.test(Q) ? 'discharge' : /선적/.test(Q) ? 'loading' : null;
          const mine = (rd.rows || []).filter((r) => r.key === c.voyageKey && (!wantMode || r.mode === wantMode));
          if (mine.length) {
            const lines = []; let allReady = true;
            mine.forEach((r) => {
              if (r.state === 'ready') { const cnt = r.edi && r.list && r.edi !== r.list ? ` (⚠ EDI ${r.edi} vs 리스트 ${r.list} — ${Math.abs(r.edi - r.list)}건 차이)` : ` — EDI ${r.edi || 0}건 = 리스트 ${r.list || 0}건`; if (r.edi && r.list && r.edi !== r.list) allReady = false; lines.push(`${r.modeKr}${cnt}`); }
              else { allReady = false; lines.push(`${r.modeKr} — ${r.label}${r.carrier ? ` (${r.carrier})` : ''}`); }
            });
            return (allReady ? `예. ${ship} 자료 준비돼 있습니다. 출력만 하면 됩니다.\n` : `⚠ ${ship} 자료가 아직입니다.\n`) + lines.join('\n');
          }
          return `${ship} — 등록만 있고 자료가 아직 안 왔습니다.`;
        }
        return describeReadiness(rd);
      }
    } catch (e) { /* 아래로 */ }
  }

  //  ⑬ 인계·맛집·자기소개·선박 소개.
  if (p.handoverQuery) {
    if (c.limited) return null;   // 양하선적 탭 카드 — 인계 메모 칸이 있는 작업 시작 탭으로 릴레이
    if (!hasShip) return '어느 배 말씀인지 배 이름을 붙여 주시면 인계서를 정리합니다.';
    const ptk = cs.filter((x) => x._ptk !== false);
    const h = c.handover || {};
    const body = generateHandover(ptk, { byInspector: c.inspector || '', shipName: ship, voyageLabel: S(info.voyNo) || S(info.voy), extraNote: h.finalized ? (h.note || '') : '', rfSkip: !!c.rfSkip });
    if (h.finalized) return `인계서 정리했어요. 다음 검수사에게 이 내용 전달하세요.\n\n${body}`;
    return `인계서 초안이에요. 특이사항이나 더 전달할 내용 있으면 아래에 적어 주세요. 없으면 그대로 두셔도 됩니다.\n\n${body}\n\n— 더 전달할 내용이 있으면 아래 칸에 적고 [인계 메모 추가]를 누르세요.`;
  }
  if (p.foodQuery) return generateFoodAnswer(p.foodQuery);
  if (p.introQuery) return generateIntroAnswer(ship);
  if (p.shipIntroQuery) {
    if (!hasShip) return '어느 배 말씀인지 배 이름을 붙여 주세요 — 예: «KBTR 이 배 뭐야»';
    const sid = (() => { try { return resolveShipKey(info.imo || info.callsign || S(info.vsl).toUpperCase().replace(/\s+/g, '')); } catch (e) { return ''; } })();
    const cached = sid && typeof window !== 'undefined' && window.__shipIntroCache && window.__shipIntroCache[sid];
    if (cached) return `🚢 ${ship}\n${cached}`;
    return '이 배의 정보가 아직 없습니다.\n항차 화면 아래 「🚢 이 배는?」 카드에서 [AI로 선박 정보 찾기]를 누르면 제원·선사·항로와 이름 유래를 정리해 드립니다.';
  }

  //  ⑭ 입출항·도선·기상·시각·날씨 — 입출항이 시각보다 먼저(«입항 시간 알려줘»는 timeQuery 에도 걸린다).
  if (p.schedQuery) {
    if (hasShip) {
      const pm = c.matchPortMis(c.portMisData || {}, info);
      if (pm) {
        const L = [`${ship || pm.vesselName || '이 선박'} — ` + [_fmtDT(pm.eta) ? `입항 ${_fmtDT(pm.eta)}` : null, _fmtDT(pm.etd) ? `출항 ${_fmtDT(pm.etd)}` : null].filter(Boolean).join(', ') + '.'];
        if (pm.pier || pm.berth) L.push(`부두: ${[pm.pier, pm.berth].filter(Boolean).join(' ')}`);
        if (pm.nextPort) L.push(`다음 항구: ${pm.nextPort}`);
        if (c.tw && c.tw.depEtd && String(c.tw.depEtd).slice(0, 16) !== String(pm.etd || '').slice(0, 16)) L.push(`⚠ 터미널 기준 출항 ${String(c.tw.depEtd).slice(5, 16)} — 신고(${_fmtDT(pm.etd) || '?'})와 다릅니다`);
        if (pm.port && pm.port !== '평택') L.push(`⚠ ${pm.port} 항만 데이터입니다.`);
        return L.join('\n');
      }
      if (S(info.planDate)) return `${ship} — 작업 계획 ${info.planDate} (PORT-MIS 신고는 아직).`;
      return '입출항 정보가 아직 없습니다. PORT-MIS 데이터가 수집되면 자동으로 답합니다.';
    }
  }
  if (p.pilotQuery && hasShip) return generatePilotAnswer(info || {}, (c.pilotForecast || {})[S(info.vsl).toUpperCase()] || null);
  if (p.wakeQuery) return generateWakeAnswer(hasShip ? (info || {}) : {});
  if (p.timeQuery && !p.factQuery) { _via('time'); return generateTimeAnswer(); }
  if (p.weatherQuery) {
    if (c.weatherText) return c.weatherText;
    if (c.limited) return null;   // 탭 카드 — 날씨를 안 받는 자리, 작업 시작 탭으로 릴레이
    return c.weatherPending ? '🌤 평택항 날씨 조회 중…' : '날씨는 항차 화면 [▶ 작업 시작] 탭이나 떠 있는 미르에게 물어 주세요.';
  }

  //  ⑮ 트윈 무게 점검 · 속도 · 계획 전망 · 자료 도착.
  if (p.twinCheckQuery && hasShip) {
    const m = p.mode || mode;
    const pool = cs.filter((x) => x._ptk !== false && x._mode === m && !x._comp);
    return generateTwinCheckAnswer(p, pool, c.pairsMap || {}, info.pier || '');
  }
  if (hasShip && isSpeedQuery(Q)) { try { const a = answerShipSpeed(v, c.shipSpeed, ship, c.terminalWork); if (a && !/못 불러왔/.test(a)) return a; } catch (e) { /* */ } }   // 2차 시뮬 5: 속도 자료가 없으면 본체 ETA 가 답한다
  if (hasShip && isPlanOutlookQuery(Q)) { try { const m = outlookModeOf(Q); const a = m ? answerPlanOutlook(v, m, ship) : answerPlanOutlookBoth(v, ship); if (a) return a; } catch (e) { /* */ } }

  //  ⑯ 관련 선사 · 브리핑 · 실 점검.
  if (p.carrierQuery && hasShip) { try { return `${ship}\n` + formatCarriers(legendItemsOf(cs.filter((x) => x._ptk !== false && (!c.mode || x._mode === mode))), { carrierContacts: c.carrierContacts }); } catch (e) { /* */ } }
  if (p.briefingQuery && hasShip) {
    const wantMode = c.mode ? c.mode : (p.mode || (/양하/.test(Q) ? 'discharge' : /선적/.test(Q) ? 'loading' : null));
    const parts = [];
    for (const [m, kr] of [['discharge', '양하'], ['loading', '선적']]) {
      if (wantMode && m !== wantMode) continue;
      //  ⚠ 평택분으로 미리 거르지 않는다 — generateBriefing 이 통과화물을 스스로 갈라 «🔁 통과화물이 작업 베이에 혼재 — 내리지 말 것» 을 낸다
      //    (2차 시뮬 실측 NSFR 2617N 통과 343대 — 미리 거르면 그 경고가 사라진다. 3.40 작업창·탭 카드는 모드 컨 전부를 넘겼다).
      const arr = dropFilledBookingSlots(cs.filter((x) => x._mode === m || x._mode === 'transit'));   // 통과분은 양쪽 다 넘긴다(_ptk false 라 집계엔 안 들고 «자리 주의»에만 쓴인다)
      if (!arr.filter((x) => x._ptk !== false).length) continue;
      try {
        const b = generateBriefing(arr, kr, m, c.pairsMap || null, c.pier || '', { rfSkip: !!c.rfSkip, eseal: m === 'loading' ? (c.esealBrief || c.eseal || null) : null, photos: c.photos || null, tw: c.tw || null, gang: c.gangBrief ? c.gangBrief() : null, cancelled: sideCancelled(info, m, c.tw), compMap: c.compMap || null, shiftMap: c.shiftMap || null });
        if (b) parts.push(c.mode ? b : `【${kr}】\n` + b);
      } catch (e) { console.warn('[미르] 브리핑 실패:', e); }
    }
    if (parts.length) return (c.mode ? '' : `${ship}\n`) + parts.join('\n\n');
    try { const ov = answerShipOverview(v, ship, c.matchPortMis(c.portMisData || {}, info), c.ediPattern || null); if (ov) return ov; } catch (e) { /* */ }
  }
  if (hasShip && (p.sealAuditQuery || /[실씰]\s*(?:번호\s*)?의심|실\s*점검|씰\s*점검/.test(Q))) return generateSealAuditAnswer(cs.filter((x) => c.mode ? x._mode === mode : true), c.mode ? modeKr : '양하·선적');

  //  ⑰ 홈(배 없음) — 실오류 선박 현황 · «우리 배?» · 오늘/내일 작업 선박 · 배 없는 브리핑.
  if (Array.isArray(c.flat) && /[실씰]\s*오류|실번호\s*(불일치|오류)/.test(Q)) {
    try {
      const rows = [];
      for (const x of c.flat) {
        if (!x || !x.cn) continue;
        const fix = x.sl_orig && x.sl && String(x.sl) !== String(x.sl_orig);
        const cf = Array.isArray(x.sl_conflict) && [...new Set(x.sl_conflict.map((h) => String(h.sl || '').trim().toUpperCase()))].length > 1;
        if (fix || cf) rows.push({ x, fix, cf });
      }
      if (!rows.length) return '실오류·실번호 불일치로 기록된 컨이 없습니다 (앱 기록 기준 — 현장 발견분은 실오류 보고로 남겨 주세요).';
      const byShip = new Map();
      for (const r of rows) { const k = r.x.voyageKey || '?'; if (!byShip.has(k)) byShip.set(k, []); byShip.get(k).push(r); }
      const L = [`⚠ 실오류·실번호 불일치 ${rows.length}건 — ${byShip.size}척`];
      for (const [k, arr] of byShip) { L.push(`【${k}】 ${arr.length}건`); arr.slice(0, 10).forEach(({ x, fix }) => L.push(`  ${x.cn} — ${fix ? `리스트 ${x.sl_orig} → 실물 ${x.sl}` : `불일치 ${[...new Set(x.sl_conflict.map((h) => String(h.sl || '').trim()))].join(' ↔ ')}`}`)); if (arr.length > 10) L.push(`  … 외 ${arr.length - 10}건`); }
      return L.join('\n');
    } catch (e) { /* */ }
  }
  if (c.voyages && /(우리|저희)\s*(가|는|도)?\s*(작업|검수)|작업\s*해야|검수\s*해야|우리\s*배/.test(Q)) {
    if (v) {
      try {
        const pmv = c.matchPortMis(c.portMisData || {}, info);
        const ov = answerShipOverview(v, ship, pmv, c.ediPattern || null);
        const detail = /양하|선적|하역만|어느\s*쪽/.test(Q) ? '\n양하·선적 구분 같은 자세한 것은 수석검수사에게 확인해 주세요.' : '';
        if (info.lane) return `이번 항차는 ${info.lane}입니다. 저희 작업 대상 선박입니다.${detail}\n\n${ov || ''}`.trim();
        if (info.planDis != null || info.planLod != null) return `저희 작업 대상 선박입니다 — 선석배정목록에 잡혀 있습니다. (항로는 다음 배정 수집 때 표시됩니다)${detail}\n\n${ov || ''}`.trim();
        if (pmv) return `입항 신고(PORT-MIS)는 있는데 선석배정에는 아직입니다 — 배정이 뜨면 확정입니다. 자세한 것은 수석검수사에게 확인해 주세요.\n\n${ov || ''}`.trim();
        return `⚠ 판단 유보 — ${ship} 항차 카드는 있지만(메일 자료로 생성) 선석배정·PORT-MIS 에는 안 잡혔습니다. 자세한 것은 수석검수사에게 확인해 주세요.\n\n${ov || ''}`.trim();
      } catch (e) { return `${ship} — 항차 목록에는 있습니다 (${c.voyageKey}). 자세한 것은 수석검수사에게 확인해 주세요.`; }
    }
    const tok = (Q.toUpperCase().match(/\b[A-Z]{3,5}\b/g) || []).filter((t) => !['PTK', 'PCTC', 'PNCT'].includes(t));
    if (tok.length) return `${tok[0]} — 지금 항차 목록·선석배정 자료에 없는 배입니다. 저희가 작업할 배로 잡혀 있지 않습니다.\n(배정목록·메일에 뜨면 수집기가 자동으로 항차 카드를 만듭니다 — 그때 다시 물으면 «네»라고 답합니다)`;
    return '어느 배 말씀인지 배 이름을 붙여 주세요 — 예: "PCSZ 우리가 작업해야해?"';
  }
  const dayOff = /모레/.test(Q) ? 2 : /내일|명일/.test(Q) ? 1 : 0;
  if (c.voyages && !v && /오늘|내일|명일|모레/.test(Q) && /작업|양하|선적|일정/.test(Q) && /선박|배|대상|뭐|뭔|몇|무슨/.test(Q)) {
    try {
      const ships = _shipsOnDay(c.voyages, dayOff);
      const lbl = dayOff === 2 ? '모레' : dayOff === 1 ? '내일' : '오늘';
      if (!ships.length) return `${lbl} 작업 예정으로 잡힌 선박이 없습니다 — 배정·도선이 아직이면 수집기가 잡는 대로 항차 카드에 뜹니다.`;
      const L = [`${lbl} 작업 선박 ${ships.length}척`];
      for (const { k, v: vv, a } of ships) {
        const i2 = vv?.info || {}; const t = new Date(a);
        const hh = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
        const amt = [i2.planDis != null && Number(i2.planDis) > 0 ? `양하 ${i2.planDis}` : null, i2.planLod != null && Number(i2.planLod) > 0 ? `선적 ${i2.planLod}` : null].filter(Boolean).join(' · ');
        const mark = (i2.planDis != null || i2.planLod != null) ? '' : ' ⚠배정 미확인 — 저희 항차가 아닐 수 있음';
        L.push(`${i2.vslFull || i2.vsl || k} — ${i2.pier || '?'} ${hh} 시작${amt ? ` (${amt})` : ''}${mark}`);
      }
      L.push(`\n«${lbl === '오늘' ? '' : lbl + ' '}브리핑» 이라고 하면 배별 상세까지 답합니다.`);
      return L.join('\n');
    } catch (e) { /* */ }
  }
  if (c.voyages && !v && p.briefingQuery) {
    try {
      const today = _shipsOnDay(c.voyages, dayOff);
      if (!today.length) {
        if (dayOff === 0 && _shipsOnDay(c.voyages, 1).length) return '오늘 작업할 선박이 없습니다. 내일 작업할 것을 브리핑할까요?';
        const lbl0 = dayOff === 2 ? '모레' : dayOff === 1 ? '내일' : '오늘·내일';
        return `${lbl0} 작업 예정으로 잡힌 선박이 없습니다 — 배정·도선이 잡히면 항차 카드에 뜹니다.\n배 이름을 붙이면 그 배 브리핑을 바로 합니다 (예: "TNJP 브리핑").`;
      }
      const parts = [`📋 ${dayOff === 2 ? '모레' : dayOff === 1 ? '내일' : '오늘'} 작업 선박 ${today.length}척 브리핑 — 배 이름을 붙이면 그 배만 자세히 (예: "${today[0].v?.info?.vsl || 'SWSP'} 브리핑")`];
      for (const { k, v: vv } of today) {
        const sh = vv?.info?.vslFull || vv?.info?.vsl || k;
        let blk = null;
        try { blk = answerShipOverview(vv, sh, c.matchPortMis(c.portMisData || {}, vv?.info || {}), c.ediPattern || null); } catch (e) { /* 배 하나 실패해도 계속 */ }
        if (!blk) continue;
        const lines = blk.split('\n').filter((l) => !l.startsWith('(컨테이너 상세'));
        try {
          const mine = dropFilledBookingSlots((c.flat || []).filter((x) => x.voyageKey === k && x._ptk));
          if (mine.length) {
            const n = (f) => mine.filter(f).length; const sp = [];
            const rfF = n((x) => x.rf && String(x.fe).toUpperCase() === 'F'); if (rfF) sp.push(`리퍼 ${rfF}`);
            const dg = n((x) => x.dg); if (dg) sp.push(`위험물 ${dg}`);
            const fr = n((x) => x.fr); if (fr) sp.push(`FR ${fr}`);
            const ot = n((x) => x.ot); if (ot) sp.push(`OT ${ot}`);
            const tk = n((x) => x.tk); if (tk) sp.push(`탱크 ${tk}`);
            const xr = n((x) => x._xray); if (xr) sp.push(`X-RAY ${xr}`);
            if (sp.length) lines.push(`특수: ${sp.join(' · ')}`);
          }
        } catch (e) { /* 특수 줄만 생략 */ }
        parts.push(`【${sh}】\n` + lines.join('\n'));
      }
      if (parts.length > 1) return parts.join('\n\n');
    } catch (e) { /* */ }
  }

  //  ⑲ 본체 — 조회·집계·특수화물·시프팅·페이스·ETA·용량·단수… (generateLocalAnswer 한 벌).
  if (hasAnyCondition(p) && (cs.length || p.asking)) {
    try {
      let results = applyNLFilter(cs, p);
      if (!p.digits) results = results.filter((x) => x._ptk !== false);
      if (needsModeChoice(p, results) && c.modeChoice === null) { _via('modeChoice'); return '양하인가요, 선적인가요? 🐱 아래 버튼으로 골라 주세요 — 잠시 뒤엔 둘 다 보여드릴게요.'; }
      const eff = (c.modeChoice && c.modeChoice !== 'both') ? { ...p, mode: c.modeChoice } : p;
      const effRes = (c.modeChoice && c.modeChoice !== 'both') ? results.filter((x) => (c.modeChoice === 'loading' ? x._mode === 'loading' : x._mode !== 'loading')) : results;
      const a = generateLocalAnswer(eff, effRes, cs.filter((x) => x._ptk !== false), {
        ...(c.manualCtx || null), mode: c.mode || null, bayPairs: c.bayPairs || c.pairsMap || null, selectedGroup: c.selectedGroup, selectedTier: c.selectedTier, shipLib: c.shipLib || null,
        gangShift: c.gangShift || null, crewAnswer: c.crewAnswer || null, voyage: v, carrierContacts: c.carrierContacts || null, shipSpeed: c.shipSpeed || null,
        vsl: c.vsl, vslFull: c.vslFull, pier: c.pier, info: info || null, voyageDoneAts: c.voyageDoneAts || null, terminalWork: c.terminalWork || null, tw: c.tw || null,
        photos: c.photos || null, shiftMap: c.shiftMap || null, compMap: c.compMap || null, bowStern: c.bowStern || null, gangs: info && info.gangs,
        who: c.inspector || '', inspector: c.inspector || '', voyageKey: c.voyageKey || '',
      });
      if (a) return a;
    } catch (e) { console.warn('[미르] 본체 답 실패:', e); }
    //  조건은 잡혔는데 어미가 없어 답이 안 나오는 말(«40피트 풀») — 결과를 세어 준다.
    //  ⚠ 카드 목록이 있는 화면(작업창·홈·탭 카드)에서는 null 이 답이다 — 글이 나가면 카드 65장이 숨는다(감사 치명 3). 콘앱·떠 있는 미르만 센다.
    try {
      if (cs.length && (app === 'cone' || c.countFallback)) {
        const r2 = applyNLFilter(cs, p).filter((x) => x._ptk !== false);
        let label = ''; try { label = describeQuery(p) || ''; } catch (e) { label = ''; }
        return '📊 ' + (label || '조회') + ': ' + r2.length + '대';
      }
    } catch (e) { /* */ }
  }

  //  ⑳ 배 없이 항차 맥락이 필요한 질문 — 어디에 배 이름을 붙이라고 안내(홈).
  if (!hasShip && p.digits && c.countFallback && Array.isArray(c.flat)) {
    //  떠 있는 미르(카드 없음) — 전 항차에서 끝네자리를 찾아 배·자리까지 한 줄씩(홈 통합검색 카드와 같은 재료 flat).
    const d = String(p.digits).slice(-4);
    const hits = c.flat.filter((x) => x && x.cn && String(x.cn).slice(-4) === d);
    if (!hits.length) return `끝네자리 ${d} — 지금 항차 어디에도 없어요.`;
    return hits.slice(0, 12).map((x) => `${x.vsl || ''} ${x.voy || ''} · ${entityHead(x)}${x._comp ? ' · 완료' : ''}`).join('\n') + (hits.length > 12 ? `\n… 외 ${hits.length - 12}대` : '');
  }
  if (!hasShip && (p.briefingQuery || p.sealAuditQuery || p.twinCheckQuery || p.etaQuery || p.paceQuery || p.customsReportQuery || p.schedQuery || p.pilotQuery || p.progressQuery || (c.countFallback && hasAnyCondition(p) && !p.asking))   /* 3.41-01: paceQuery — 조건이 되면서 홈이 컨 100대를 나열하던 것(감사) */) {
    return '어느 배 말씀인지 배 이름을 붙여 주시면 여기서 바로 답합니다. (예: "STSE 출항 몇 시" · "KBTR 리퍼 몇 대")';
  }

  //  ㉑ 잡담(검수앱은 여기서) → 용어·실무지식 → 콘앱 안내.
  if (c.smallTalkLast) { try { const st = mirSmallTalk(q); if (st) return st; } catch (e) { /* */ } }
  if (!p.asking) {
    try {
      let k = mirKnowledge(q);
      if (k) { _via('knowledge'); return k; }
      if (/^[가-힣A-Za-z0-9]{2,12}$/.test(q)) { try { k = mirKnowledge(q + '이 뭐야'); } catch (e) { k = null; } }
      if (k) { _via('knowledgeGuess'); return k; }
    } catch (e) { /* */ }
  }
  if (app === 'cone') { _via('coneHelp'); return CONE_QA_HELP; }
  return null;
}

/** 질문 하나에 답한다 — 미르 말투를 입혀서. 못 내면 null. */
export function answerOne(query, ctx) {
  const a = answerOneRaw(query, ctx);
  try { return a == null ? null : mirTone(a); } catch (e) { return a; }
}
