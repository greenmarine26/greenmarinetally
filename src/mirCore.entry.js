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
} from './nlSearch.js';
import { mirKnowledge } from './data/mirKnowledge.js';
import { coneAnswer, coneBriefing, isConeQuery, CONE_QA_HELP } from './coneKnowledge.js';

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
  const q = String(query || '').trim();
  if (!q) return null;
  const c = ctx || {};
  const app = c.app || 'tally';
  const cs = c.containers || [];

  let parsed = null;
  try { parsed = parseNaturalQuery(q); } catch (e) { parsed = null; }

  /* ① 콘 이야기는 콘 지식이 먼저 본다.
       콘 계산은 검수앱 미르가 **전혀 모르는** 콘앱만의 지식이라 순서가 이래야 한다.
       콘앱이 아니어도 `cone` 자료가 있고 콘을 물으면 답한다 — 검수앱에서도 콘을 물을 수 있게. */
  if (c.cone && (app === 'cone' || isConeQuery(q))) {
    try {
      if (parsed && parsed.briefingQuery) {
        const b = coneBriefing(c.cone);
        if (b) return b;
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

  /* ④ 용어 292선 · 실무지식 43개 — «22G1이 뭐야», «코너캐스팅».
       ⚠ 검수앱은 이것을 화면마다 따로 부르고 있다(GlobalSearchPage:758 · SearchPanel:1135 — **같은 줄이 두 벌**).
         여기로 모아 두면 2단계에서 그 두 화면이 `answerOne` 을 부르는 순간 한 벌이 된다.
       조회 질문을 가로채지 않도록 **기본 경로가 답을 못 냈을 때만** 본다(`parsed.asking` 게이트는 검수앱과 동일). */
  if (!(parsed && parsed.asking)) {
    try {
      const k = mirKnowledge(q);
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
export { mirKnowledge };
