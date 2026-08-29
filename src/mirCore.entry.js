// 미르 한 벌 — 검수앱 엔진에 콘 지식을 얹어 콘앱에도 상주시키는 번들 진입점
/* ★ ConeOne 2.13 / 미르 이식 1단계 (검수사 확정 2026-08-29)
     *«검수앱 미르에게 콘앱지식을 이식한후에 미르를 콘앱에 상주 시키는 방법이 좋다고 생각합니다.
       어차피 둘다 한곳에 있는 데이터를 사용할테니까요»*
     *«다만 어떤앱에서 질문을 받았느냐는것이 관건이죠?
       검수앱에서 브리핑해줘 하면 검수자료를 콘앱에서 브리핑해줘 하면 콘앱 자료를»*

   ── 왜 이 파일이 필요한가
   미르 엔진(`nlSearch.js`)은 질문을 **알아듣기는 하는데 답을 고르지는 않는다.**
   답을 고르는 판단이 검수앱 화면(`GlobalSearchPage` 79분기)에 흩어져 있어서,
   화면이 없는 콘앱은 그 판단을 통째로 쓸 수 없었다.
   실측 — «MCSC 콘 작업 브리핑 해줘» → `briefingQuery=true` 로 알아듣고도 답은 (없음).
          `generateBriefing` 을 직접 부르면 답은 멀쩡히 나온다. 끊긴 것은 **배선**이다.
   → 그 배선을 화면에서 **엔진 쪽으로 내린다**. 그것이 `answerOne()` 이다.

   ── 판정 두 벌 금지
   콘앱의 옛 `coneQaAnswer` 는 폴백으로만 남는다(번들 미로드 시). 정본은 `coneKnowledge.js` 한 벌이다.
   ⚠ 2단계에서 검수앱 두 화면도 `answerOne()` 을 부르게 하면 «어디서 물어도 같은 답» 이 완성된다.
     그때까지는 검수앱을 건드리지 않는다 — 현장에서 매일 쓰는 길이라 한 판에 같이 흔들지 않는다.

   ── 크기
   ⛔ `export * from utils.js` 로 싸면 **xlsx 엑셀 라이브러리 1,219KB** 가 딸려온다(실측).
     미르와 아무 상관 없다. 그래서 **쓰는 것만 골라 내보낸다.** 633KB → gzip 160KB.
     (지금 콘앱이 이미 받고 있는 카고플랜 번들이 1,781KB다.) */

import {
  parseNaturalQuery, applyNLFilter, generateLocalAnswer, generateBriefing,
  generateIntroAnswer, generateTimeAnswer, describeQuery, hasAnyCondition,
} from './nlSearch.js';
import { mirKnowledge } from './data/mirKnowledge.js';
import { mirTone, mirSmallTalk } from './mirChat.js';
/* ★ 2.17 — 미르 목소리. 검수사 *«콘앱의 미르는 말을 못합니다. 검수앱의 미르 목소리도 이쁜데»*
     ⛔ 새로 만들지 않는다 — 새로 만들면 **목소리가 달라진다.** 검수앱과 같은 voice.js 한 벌을 싣는다.
     (ko-KR · pitch 1.08 — «살짝 높여 덜 무뚝뚝하게» 가 그 파일에 적힌 뜻이다.) */
import { speak, stopSpeak } from './voice.js';
import { coneAnswer, coneBriefing, isConeQuery, CONE_QA_HELP } from './coneKnowledge.js';

/**
 * ★ 2.18 (검수사 요청 2026-08-29) — *«미르야 선적(양하)플랜 보여줘»* · *«미르야 선적(양하) 몇번 베이 보여줘»*
 *
 * 이것은 «답»이 아니라 «화면을 열어라»다. 그래서 엔진은 **무엇을 하라만 내고 실행하지 않는다** —
 * nlSearch.js 가 deviceCmd·startSet 을 다루는 방식 그대로다(그 파일 머리에 적혀 있다).
 * 화면 구조는 두 앱이 서로 다르니 **여는 일은 각 앱이 한다.** 해석만 한 벌로 둔다.
 *
 * 반환 { mode:'discharge'|'loading'|null, bay:number|null } · 명령이 아니면 null.
 */
export function parseViewCommand(query) {
  const t = String(query || '').trim();
  if (!t) return null;
  //  «보여줘/열어/띄워/가자/이동» 이 있어야 명령이다 — «5번 베이» 만 물으면 조회로 답해야 한다.
  if (!/보여|보자|열어|띄워|가\s*자|이동|가\s*줘|펼쳐/.test(t)) return null;

  const mode = /선적|싣|적하|로딩/.test(t) ? 'loading'
    : (/양하|내림|내리|디스차지/.test(t) ? 'discharge' : null);

  const m = t.match(/(\d{1,3})\s*(?:번)?\s*베이|베이\s*(\d{1,3})/);
  const bay = m ? parseInt(m[1] || m[2], 10) : null;

  //  «플랜/도면/베이플랜» 이거나 베이 번호가 있으면 화면을 여는 말로 본다.
  const wantsPlan = /플랜|플렌|도면|베이\s*플랜|계획도/.test(t) || bay != null;
  if (!wantsPlan) return null;
  return { mode, bay };
}

/** 콘앱 행 → 미르가 읽는 컨테이너 모양. 콘앱은 `reefer/temp`, 엔진은 `rf/tmp` 를 본다. */
export function toMirContainers(rows, mode) {
  return (rows || []).map((c) => {
    const o = Object.assign({}, c);
    if (o.rf == null && c.reefer != null) o.rf = c.reefer ? 1 : 0;
    if (o.tmp == null && c.temp != null) o.tmp = c.temp;
    if (!o._mode && mode) o._mode = mode;
    return o;
  });
}

/**
 * 질문 하나에 답한다. **어느 앱에서 물었는지가 답을 가른다.**
 *   ctx = { app:'cone'|'tally', containers, cone:{rows,dischRows,stowRows},
 *           mode, modeLabel, pier, opts, ... 나머지는 엔진 ctx 로 그대로 흘러간다 }
 * 답을 못 내면 null.
 */
export function answerOne(query, ctx) {
  const _a = _answerCore(query, ctx);
  /* 말투 출구 — 검수앱은 화면마다 `mirTone()` 으로 감싸고 있다(SearchPanel:1118 · VoyagePage:2582).
       콘앱 미르만 이게 없어 딱딱하게 답했다. 여기 한 자리로 모은다. */
  try { return _a == null ? null : mirTone(_a); } catch (e) { return _a; }
}

function _answerCore(query, ctx) {
  const q = String(query || '').trim();
  if (!q) return null;
  const c = ctx || {};
  const app = c.app || 'tally';
  const cs = c.containers || [];

  /* ⓪ 잡담 — «미르야 뭐 잘 먹어?» 같은 것. 검수사 *«미르는 자기가 뭘 잘 먹는지도 알고 있습니다»*
       ⚠ 이것을 안 실어서 콘앱 미르가 «기존 자연어 답 수준» 으로 보였다(2.13-02 에서 바로잡음).
         `mirSmallTalk` 은 자기 게이트를 갖고 있어 조회 질문을 가로채지 않는다. */
  try {
    const st = mirSmallTalk(q);
    if (st) return st;
  } catch (e) { /* 잡담이 막혀도 일 이야기는 계속한다 */ }

  let parsed = null;
  try { parsed = parseNaturalQuery(q); } catch (e) { parsed = null; }

  /* ① 콘 이야기는 콘 지식이 먼저 본다.
       콘 계산은 검수앱 미르가 **전혀 모르는** 콘앱만의 지식이라 순서가 이래야 한다.
       콘앱이 아니어도 `cone` 자료가 있고 콘을 물으면 답한다 — 검수앱에서도 콘을 물을 수 있게. */
  if (c.cone && (app === 'cone' || isConeQuery(q))) {
    try {
      if (parsed && parsed.briefingQuery) {
        /* ★ 2.16 — 콘앱 브리핑 = **검수 브리핑 + 콘 몫**.
             검수사가 검수앱 미르 브리핑을 보이며 *«미르는 정말 똑똑합니다»* —
             리퍼가 어느 베이인지, 통과화물이 작업 베이에 섞였는지는 **콘 작업에 그대로 필요하다.**
             그래서 검수앱 것(generateBriefing)을 그대로 부르고 콘 몫을 얹는다.
             ⛔ 새로 쓰지 않는다 — 새로 쓰면 그날부터 브리핑이 두 벌이 된다. */
        const parts = [];
        const cs2 = c.containers || [];
        for (const m of ['discharge', 'loading']) {
          const sub = cs2.filter((x) => (m === 'loading' ? x._mode === 'loading' : x._mode !== 'loading'));
          if (!sub.length) continue;
          try {
            const b = generateBriefing(sub, m === 'loading' ? '선적' : '양하', m, null, c.pier || '', c.opts || null);
            if (b) parts.push('【' + (m === 'loading' ? '선적' : '양하') + '】\n' + b);
          } catch (e) { /* 한쪽이 막혀도 다른 쪽은 낸다 */ }
        }
        const cb = coneBriefing(c.cone, { vsl: c.vslFull || c.vsl || '', shiftN: c.shiftN || 0 });
        if (cb) parts.push('【콘】\n' + cb);
        if (parts.length) {
          const head = (c.vslFull || c.vsl) ? (c.vslFull || c.vsl) + '\n' : '';
          return head + parts.join('\n\n');
        }
      }
      const a = coneAnswer(q, c.cone);
      if (a) return a;
    } catch (e) { /* 콘 지식이 막혀도 미르는 계속 답한다 */ }
  }

  /* ② 브리핑 — 검수 자료. 엔진이 «알아듣기만» 하던 자리를 여기서 이어 준다. */
  if (parsed && parsed.briefingQuery && cs.length) {
    try {
      const b = generateBriefing(cs, c.modeLabel || (c.mode === 'loading' ? '선적' : '양하'),
        c.mode || 'discharge', c.pairsMap || null, c.pier || '', c.opts || null);
      if (b) return b;
    } catch (e) { /* 아래 기본 경로로 */ }
  }

  /* ③ 기본 경로 — 조회·집계·용어·실무지식. 검수앱과 **같은 한 벌**이다. */
  try {
    const r = applyNLFilter(cs, parsed);
    const a = generateLocalAnswer(parsed, r, cs, c);
    if (a) return a;
  } catch (e) { /* 마지막 안내로 */ }

  /* ③-B 알아듣고도 답을 못 고르던 갈래들 — 검수앱 화면(GlobalSearchPage:290·730)이 따로 처리하던 것.
       검수사 *«인력들이 검수에게 묻는것이 많습니다. 기록하다 일일이 답해줘야 합니다. 그걸 미르가 해야 합니다»*
       — 현장에서 던지듯 묻는 말이 안내문으로 새면 결국 검수사에게 다시 묻게 된다. */
  if (parsed) {
    try {
      /* «미르야 안녕» 은 mirHello 가 아니라 mirCalled 로 잡힌다(실측).
         뒤에 일이 붙지 않은 부름만 인사로 받는다 — «미르야 브리핑» 을 가로채면 안 된다. */
      const _bareCall = parsed.mirCalled && !hasAnyCondition(parsed)
        && !parsed.briefingQuery && !parsed.progressQuery && !parsed.etaQuery
        && !parsed.introQuery && !parsed.shipIntroQuery && !parsed.timeQuery;
      if (parsed.mirHello || _bareCall) {
        return '네, 미르예요 🐱 뭐 확인해 드릴까요?\n(예: "5번 베이 콘" · "얼마나 남았어" · "리퍼 몇대" · "22G1이 뭐야")';
      }
      if (parsed.introQuery || parsed.shipIntroQuery) {
        const a = generateIntroAnswer(c.vslFull || c.vsl || '');
        if (a) return a;
      }
      if (parsed.timeQuery) {
        const a = generateTimeAnswer();
        if (a) return a;
      }
      /* 조건은 잡혔는데(«40피트 풀») 어미가 없어 답이 안 나오는 말 — 결과를 세어 준다.
         현장은 «40피트 풀 몇 대입니까»가 아니라 «40피트 풀»이라고 던진다. */
      if (hasAnyCondition(parsed) && cs.length) {
        const r2 = applyNLFilter(cs, parsed);
        if (r2 && r2.length >= 0) {
          let label = '';
          try { label = describeQuery(parsed) || ''; } catch (e2) { label = ''; }
          return '📊 ' + (label || '조회') + ': ' + r2.length + '대';
        }
      }
    } catch (e) { /* 아래로 */ }
  }

  /* ④ 용어 292선 · 실무지식 43개 — «22G1이 뭐야», «코너캐스팅».
       ⚠ 검수앱은 이것을 화면마다 따로 부르고 있다(GlobalSearchPage:758 · SearchPanel:1135 — **같은 줄이 두 벌**).
         여기로 모아 두면 2단계에서 그 두 화면이 `answerOne` 을 부르는 순간 한 벌이 된다.
       조회 질문을 가로채지 않도록 **기본 경로가 답을 못 냈을 때만** 본다(`parsed.asking` 게이트는 검수앱과 동일). */
  if (!(parsed && parsed.asking)) {
    try {
      let k = mirKnowledge(q);
      /* 낱말만 던진 말(«코너캐스팅»)도 뜻을 준다 — 현장은 «~이 뭐야»를 안 붙인다.
         2~12자 한글/영문 한 낱말일 때만 «이 뭐야»를 붙여 한 번 더 물어본다. */
      if (!k && /^[가-힣A-Za-z0-9]{2,12}$/.test(q)) {
        try { k = mirKnowledge(q + '이 뭐야'); } catch (e2) { k = null; }
      }
      if (k) return k;
    } catch (e) { /* 답안지가 막혀도 안내는 나간다 */ }
  }

  /* ⑤ 아무것도 못 답했을 때 — 콘앱에서는 콘 쪽 안내를 준다(그 자리에서 쓸 수 있는 말로). */
  if (app === 'cone') return CONE_QA_HELP;
  return null;
}

// 콘앱이 부르는 이름
export { parseNaturalQuery, applyNLFilter, generateLocalAnswer, generateBriefing };
export { coneAnswer, coneBriefing, isConeQuery, CONE_QA_HELP };
export { mirKnowledge, mirTone, mirSmallTalk };
export { speak, stopSpeak };
