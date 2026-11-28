// 미르에게 말로 전한 작업보고(양하·선적 시작/완료/중단/재개 · 해치커버 열림/닫힘 · 콘박스 · 보고 취소)를 읽는 한 벌 — import 없는 순수 모듈(nlSearch 가 부른다)
//   검수사 2026-11-18 «저는 작업보고 내용은 미르에게 전달하는 방식으로 하겠습니다. 그러니 관리자가 전달하는 내용은 미르가 앱에 정확히 적용시켜야 할것입니다»
//   읽기만 한다 — 기록은 firebase.fbApplyMirWorkWrites(쓰는 자리 한 곳)가 mirWorkReport.planMirWorkReport 로 한다.
//   ⚠ 잘못 읽으면 곧 기록이 된다 — 일어난 일을 알리는 끝맺음만 받는다(물음·부정·진행형·제안·예정은 null). 5.13 감사 상1·상2·상3.

const VERB_RES = [
  ['resume', /재개|다시\s*시작/],
  ['start', /시작|개시/],
  ['done', /완료|끝났|끝냄|끝/],
  ['pause', /중단|멈췄|멈춤|정지|스톱/],
];
//  일어난 일을 알리는 끝맺음 — 동사 바로 뒤에 이것만 있어야 받는다(«완료 안됐어»·«끝나가»·«시작 전이야»·«시작할까»·«재개 해도 돼» 는 못 지난다)
const DONE_TAIL = /^\s*(?:했어요|했어|했음|했습니다|했다|함|됨|됐어요|됐어|됐습니다|됐음|합니다|입니다|이에요|이야|예요|요|어요|어|음|다|임|했고|됐고)?\s*$/;
const NEG_RE = /안\s*(?:됐|했|끝|함|해)|못\s*(?:했|함|해)|아직|거의|곧|예정|전이|전에|이따|나중|할까|할래|해도|하면|해야|하려|할\s*거|할게|가요\?|나가|중이|중인지/;
const ASK_RE = /\?|(?:나|니|냐)(?:요)?\s*$|했나|했니|됐나|됐니|됐냐|했냐|언제|누구|어디|얼마|몇|맞아|알려|보여|어때|어떻게|뭐|왜|무슨|인가|일까|는지|ㄴ지/;
const TIME_RE = /\d{1,2}\s*시(?!작|간)(?:\s*\d{1,2}\s*분)?|\d{1,2}:\d{2}/g;   // 5.29-04 감사 상 3: «2시간» 은 시각이 아니다
const OPEN_PAST = /열었|열림|열렸|열어\s*놨|열어\s*둠|오픈\s*(?:했|함|됨)|open(?:ed)?/i;
const CLOSE_PAST = /닫았|닫힘|닫혔|닫음|닫아\s*놨|클로즈\s*(?:했|함|됨)|close(?:d)?/i;

function clean(t) {
  return String(t || '').replace(/^\s*미르야[\s,]*/, '').replace(/[!.~]+$/g, '').trim();
}

/** 말 → { kind:'status'|'hatch'|'conbox'|'cancel', … } 또는 null(작업보고가 아니다). */
export function parseMirWorkReport(text) {
  const t = clean(text);
  if (!t || t.length > 60) return null;
  //  보고 취소 — 보고를 가리키는 말만(«취소» 한 마디는 다른 대화·칩에서도 나온다 — 감사 상3)
  if (/^(?:방금\s*)?(?:미르\s*)?(?:작업\s*)?보고\s*(?:취소|지워\s*줘?|지워|삭제)(?:해\s*줘|해|요)?$/.test(t) || /^방금\s*(?:적은\s*)?(?:거|것|보고)\s*(?:취소|지워\s*줘?|지워)(?:해\s*줘|해|요)?$/.test(t)) return { kind: 'cancel', raw: t };
  if (ASK_RE.test(t) || NEG_RE.test(t)) return null;
  const eqm = /(?<!\d)([1-9])\s*호기/.exec(t);
  const equip = eqm ? `${eqm[1]}호기` : '';
  if (/콘\s*박스/.test(t)) {
    if (!/(?:내렸|올렸|했|줬|받았|나갔|들어갔|개\s*$|개요\s*$|개\s*(?:임|이야|예요)\s*$)/.test(t)) return null;
    const body = t.replace(/[1-9]\s*호기/g, ' ').replace(TIME_RE, ' ');
    const ty = /(20|40)\s*(?:자|피트|ft|FT|짜리)?/.exec(body);
    const n = /(\d{1,3})\s*개/.exec(body);
    return { kind: 'conbox', equip, type: ty ? ty[1] : '', count: n ? +n[1] : 0, raw: t };
  }
  if (/해치|커버/.test(t)) {
    const action = OPEN_PAST.test(t) ? 'open' : CLOSE_PAST.test(t) ? 'close' : '';
    if (!action) return null;   // «해치 열어»·«닫을까» 처럼 일어난 일이 아닌 말은 받지 않는다(감사 상2)
    const pc = /(\d{1,2})\s*장/.exec(t);
    const body = t.replace(/[1-9]\s*호기/g, ' ').replace(/\d{1,2}\s*장/g, ' ').replace(TIME_RE, ' ');
    const bays = [];
    for (const m of body.matchAll(/(\d{1,2})/g)) { const b = String(+m[1]); if (+m[1] >= 1 && +m[1] <= 99 && !bays.includes(b)) bays.push(b); }
    return { kind: 'hatch', equip, action, bays, panelCount: pc ? +pc[1] : 0, raw: t };
  }
  let verb = '', vm = null;
  for (const [v, re] of VERB_RES) { const m = re.exec(t); if (m) { verb = v; vm = m; break; } }
  if (!verb || !equip) return null;
  const mode = /선적|로딩|싣/.test(t) ? 'loading' : /양하|하역|내리/.test(t) ? 'discharge' : '';
  if (!mode && !/작업/.test(t)) return null;   // «1호기 끝» 같은 말은 작업보고로 단정하지 않는다
  if (verb === 'start' && /\d{1,2}\s*시(?!작|간)|\d{1,2}:\d{2}/.test(t)) return null;   // «1호기 09시 30분 시작» 은 시작 시각 기록(startSet) · 5.29-04 감사 상 2: 시각이 붙은 재개는 작업보고(재개)로 읽는다   // «1호기 09시 30분 시작» 은 시작 시각 기록(startSet)
  const tail = t.slice(vm.index + vm[0].length);
  let reason = '';
  if (verb === 'pause') {
    reason = tail.replace(/^[,·:\s]+/, '').replace(/^사유\s*/, '').replace(/\s*(?:했어요|했어|했음|해요|합니다|이야|이에요|예요|요|됨|됐어|으로|로|때문에|때문|상태)$/g, '').trim();
    if (!reason) {
      const pre = /(강풍|우천|비|안개|장비\s*고장|고장|식사|휴식|야드\s*적체|야드|대기)/.exec(t.slice(0, vm.index).replace(/[1-9]\s*호기/, ''));
      if (pre) reason = pre[1];
    }
    if (reason && !/^[가-힣A-Za-z0-9\s·,()]+$/.test(reason)) return null;
  } else if (!DONE_TAIL.test(tail)) return null;
  //  ★ 5.29-04 — 말에 붙은 시각(«15:45 4호기 작업중단»)과 함께 말한 호기 전부(«3호기 4호기 작업중단» — 검수사 2026-11-28 17:34 «3호기 4호기 둘다 작업중단입니다. 같은 시간에»).
  const tm = /(\d{1,2})\s*:\s*(\d{2})|(\d{1,2})\s*시(?!작|간)(?:\s*(\d{1,2})\s*분|\s*(반))?/.exec(t);
  const at = tm ? { hh: +(tm[1] != null ? tm[1] : tm[3]), mm: tm[2] != null ? +tm[2] : tm[4] != null ? +tm[4] : tm[5] ? 30 : 0 } : null;
  //  감사 중 3 — 동사 앞에 말한 호기만(«4호기 작업중단 3호기 고장» 의 3호기는 사유) · «105호기» 의 5 는 호기가 아니다
  //  재감사 3 — «3·4호기»·«3,4호기»·«3호기 4호기» 모두 두 호기(종전엔 4호기만 잡고 3호기가 조용히 빠졌다)
  const equips = [...new Set([...t.slice(0, vm.index).matchAll(/(?<!\d)((?:[1-9]\s*(?:[·,、/]|및|와|과|이랑|하고)\s*)*[1-9])\s*호기/g)].flatMap((m) => (m[1].match(/[1-9]/g) || []).map((d) => `${d}호기`)))];
  return { kind: 'status', equip, equips, mode, verb, reason, at: at && at.hh <= 23 && at.mm <= 59 ? at : null, raw: t };
}

/** RTDB 에 쓴 값과 읽은 값이 같은가 — RTDB 는 키를 이름순으로 돌려주고 null 칸을 빼고 돌려준다(5.13 감사 중-가). 미르 «보고 취소» 가 «미르가 쓴 그대로인가» 를 잴 때 쓴다. */
export function sameRtdbVal(a, b) {
  const norm = (v) => {
    if (v === null || v === undefined) return null;
    if (Array.isArray(v)) return v.map(norm);
    if (typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) { const x = norm(v[k]); if (x !== null) o[k] = x; } return Object.keys(o).length ? o : null; }
    return v;
  };
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}
