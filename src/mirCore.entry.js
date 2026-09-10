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
   ★ 3.41 / 2.48 — 2단계 완성: 검수앱 세 화면·떠 있는 미르·콘앱이 전부 `src/mirAnswer.js` 의 `answerOne()` 을 부른다.

   ── 크기
   ⛔ `export * from utils.js` 로 싸면 **xlsx 엑셀 라이브러리 1,219KB** 가 딸려온다(실측).
     미르와 아무 상관 없다. 그래서 **쓰는 것만 골라 내보낸다.** 633KB → gzip 160KB.
     (지금 콘앱이 이미 받고 있는 카고플랜 번들이 1,781KB다.) */

import { parseNaturalQuery, applyNLFilter, generateLocalAnswer, generateBriefing } from './nlSearch.js';
import { mirKnowledge } from './data/mirKnowledge.js';
import { mirTone, mirSmallTalk } from './mirChat.js';
/* ★ 2.17 — 미르 목소리. 검수사 *«콘앱의 미르는 말을 못합니다. 검수앱의 미르 목소리도 이쁜데»*
     ⛔ 새로 만들지 않는다 — 새로 만들면 **목소리가 달라진다.** 검수앱과 같은 voice.js 한 벌을 싣는다.
     (ko-KR · pitch 1.08 — «살짝 높여 덜 무뚝뚝하게» 가 그 파일에 적힌 뜻이다.) */
import { speak, stopSpeak } from './voice.js';
/* ★ 2.19 — 화면 밝기 4단계·소리. 검수사 *«미르는 화면 밝기도 4단계로 조절도 할줄 압니다»*
     ⛔ 새로 만들지 않는다 — 검수앱과 **같은 runDeviceCmd 한 벌**을 쓴다(단계·문구가 갈리면 안 된다). */
import { runDeviceCmd } from './utils.js';
import { coneAnswer, coneBriefing, isConeQuery, CONE_QA_HELP } from './coneKnowledge.js';
import { parseViewCommand, pickVoyageKey } from './planCommand.js';

/* 2.87-02: parseViewCommand 는 src/planCommand.js 한 벌로 옮겼다 — 검수앱 화면들과 같은 판정을 쓰기 위해서다.
   콘앱 번들은 여기서 그대로 다시 내보낸다(부르는 이름은 그대로). */

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
 *
 * ★ 3.41 / 2.48 — **2단계 완성.** 답 고르기는 `src/mirAnswer.js` 한 벌로 옮겼다. 검수앱 세 화면·떠 있는 미르가
 *   같은 함수를 부르므로 «어디서 물어도 같은 답»이다(검수사 «미르를 하나로 만들고 싶습니다»). 이 파일은 콘앱 번들 진입점으로만 남는다.
 */
export { answerOne, answerOneRaw } from './mirAnswer.js';
export { askMir, askMirModel, getMirConfig, isWeakAnswer, mirLeftover, MIR_CATALOG } from './mirModel.js';   // 3.42 판 B: 콘앱도 같은 모델 창구(공용 키·문지기)

// 콘앱이 부르는 이름
export { parseNaturalQuery, applyNLFilter, generateLocalAnswer, generateBriefing };
export { parseViewCommand, pickVoyageKey };
export { coneAnswer, coneBriefing, isConeQuery, CONE_QA_HELP };
export { mirKnowledge, mirTone, mirSmallTalk };
export { speak, stopSpeak, runDeviceCmd };
