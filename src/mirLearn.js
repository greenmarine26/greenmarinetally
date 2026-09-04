// 미르 자체 학습 — 못 알아들은 말을 «이어진 말»에서 배우고(즉석), 배운 사전(mir_lexicon)으로 되써서 다시 읽는다 (TallyOne 3.0, TASK-2026-012)
//
// 검수사 확정 2026-09-02
//   *«미르… 인공지능은 아닌데 인공지능에 가깝게 만들 수 있나요?»* · *«비용은 인공지능을 사용할 때 들어갑니다.»*(API 안 씀)
//   *«자체 학습 기능이죠»* · *«한번 답 못한 걸 다음에는 반복 안 하게»*
//   *«가르치기도 자동으로 되나요? 하루를 결산해서 미르가 답 못한 걸 모아서 클로드가 알려주는 것입니다.»*
//
// 실측(RTDB activity_log 8월, 검수사·검수원 110문)
//   08-29 20:45 «MCSC 카고플랜» 못 알아들음 → 61초 뒤 «MCSC 양하 카고플랜» 답함 — 세 번 반복, 21:39 또 실패.
//   08-14 06:00 «실번호?» 못 알아들음 → 22초 뒤 «브리핑» — 관계없는 말(겹치는 낱말 0) → 배우면 안 된다.
//
// 세 층
//   ① 즉석  못 알아들은 말을 3분 기억 → 같은 폰에서 이어진 말이 답을 얻고 **낱말이 절반 이상 겹치면** «앞말 = 뒷말» 별칭을 배운다.
//   ② 결산  못 알아들은 말은 mir_misses/{날짜} 에 쌓이고(App.jsx 가 'gm-mir-miss' 이벤트를 받아 씀), 매일 클로드가 열어
//           별칭·뜻풀이를 mir_lexicon 에 써 준다(예약 작업). 새 인텐트가 필요한 것은 인계함으로.
//   ③ 되쓰기 parseNaturalQuery 가 **못 알아듣는 말일 때만** 사전을 보고 되써서 한 번 더 읽는다 — 알아듣는 말은 안 건드린다.
//
// 사전 mir_lexicon/{키} = { kind:'alias', from:원문, to:성공한 말(슬롯화), by, at, auto } | { kind:'def', term, def, by, at }
//   키 = 정규화(대문자·문장부호 제거·조사/청유 어미 제거·«보여줘» 류 제거·선박코드/컨번호/숫자 → {ship}/{cn}/{n}·띄어쓰기 제거)
//   ⇒ «MCSC 카고플랜» 을 배우면 «XTPG 카고 플랜 보여줘» 도 같은 키.
//
// ⚠ 이 파일은 순수 함수만 — Firebase 를 직접 부르지 않는다(nlSearch 는 콘앱 번들에도 들어간다).
//   쓰기는 window.__mirLexiconWrite (App.jsx 가 심음), 읽기는 window.__mirLexicon.

const PARTICLE = /(이야|인가요|인지|인가|입니까|이죠|하나요|할까요|할까|나요|에서|으로|이|가|은|는|을|를|의|에|로|도|요|야|죠|네|까)$/;
const STOP = new Set(['보여줘', '보여', '알려줘', '알려', '해줘', '해', '줘', '주세요', '좀', '미르야', '미르', '봐줘', '봐', '좀요', '해봐', '해주세요']);
const SLOT_RE = { ship: /^[A-Z]{4}$/, cn: /^[A-Z]{4}\d{7}$/, n: /^\d+$/ };

export function mirTokens(q) {
  //  ⚠ RTDB 키 금지 문자(. # $ / [ ])도 여기서 지운다 — 감사 지적: 폰 키와 저장 키가 다르면 배운 것이 다음 구독에 사라진다.
  return String(q || '').toUpperCase().replace(/[?？!.,~·…()\[\]"'«»#$/]/g, ' ').trim().split(/\s+/).filter(Boolean)
    .filter((t) => !STOP.has(t)).map((t) => (t.length > 1 ? (t.replace(PARTICLE, '') || t) : t));
}
export function mirSlot(t) {
  if (SLOT_RE.cn.test(t)) return '{cn}';
  if (SLOT_RE.ship.test(t)) return '{ship}';
  if (SLOT_RE.n.test(t)) return '{n}';
  return t;
}
/** 사전 키 — 슬롯은 경계로 남기고 나머지는 붙여 쓴다(«카고 플랜»=«카고플랜»). */
export function mirKey(q) {
  return mirTokens(q).map(mirSlot).map((t) => (t.startsWith('{') ? ' ' + t + ' ' : t)).join('').replace(/\s+/g, ' ').trim();
}
function _slotsOf(q) {
  return mirTokens(q).filter((t) => t !== mirSlot(t));
}
function _lex() {
  try { return (typeof window !== 'undefined' && window.__mirLexicon) || {}; } catch (e) { return {}; }
}
/** 배운 별칭이 있으면 되쓴 문장을 돌려준다(슬롯은 지금 말의 값으로 채움). 없으면 null. */
export function mirRewrite(q) {
  const k = mirKey(q);
  if (!k) return null;
  const e = _lex()[k];
  if (!e || e.kind !== 'alias' || !e.to) return null;
  const sl = _slotsOf(q);
  let i = 0;
  const out = String(e.to).replace(/\{(ship|cn|n)\}/g, () => sl[i++] || '');
  return out.trim() || null;
}
/** 배운 뜻풀이가 있으면 돌려준다(«천정 뭐야» → term 키로). */
export function mirLearnedDef(q) {
  const k = mirKey(String(q || '').replace(/(이|가)?\s*(뭐야|뭐예요|무엇|뜻|이란|란|무슨 말|뭔가요|뭐죠|뭔데)\s*[?？]*$/u, ''));
  if (!k) return null;
  const e = _lex()[k];
  return (e && e.kind === 'def' && e.def) ? String(e.def) : null;
}

// ── 즉석 학습 ──────────────────────────────────────────────────────────────
const WINDOW_MS = 3 * 60 * 1000;
let _pending = null;                   // { q, key, toks:Set, at }
let _lastMissAt = {};                  // 같은 말 10분 안 재기록 방지(이벤트)

/** 답을 내보낼 때 한 번 부른다. missed=못 알아들음. 배우면 안내 한 줄을 돌려준다(아니면 ''). */
export function mirObserve(q, missed, meta = {}) {
  const text = String(q || '').trim();
  if (text.length < 2) return '';
  const now = Date.now();
  const key = mirKey(text);
  if (missed) {
    if (!key) return '';
    _pending = { q: text, key, toks: new Set(mirTokens(text).filter((t) => t === mirSlot(t))), at: now };
    //  결산용 기록 — 같은 말은 10분에 한 번만
    if (!_lastMissAt[key] || now - _lastMissAt[key] > 10 * 60 * 1000) {
      _lastMissAt[key] = now;
      try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gm-mir-miss', { detail: { q: text, key, at: now, ...meta } }));
        }
      } catch (e) { /* 이벤트 미지원 — 결산 기록만 빠진다, 즉석 학습은 그대로 */ }
    }
    return '';
  }
  //  ★ 3.7-06 — **잡담이 받은 말은 앞말의 «정답»이 아니다.**
  //    잡담을 «알아들었다»로 세면서(nlSearch 3.7-06) 학습 분기가 열렸다. 그대로 두면
  //    «밥은?»(못 알아들음) → «밥 먹었어»(잡담이 받음) 로 `밥` → «밥 먹었어» 가 사전에 굳는다(감사 실측).
  //    사전은 전역 노드라 한 폰의 오염이 전 기기로 퍼진다 — 검수사가 방금 걷어낸 것과 같은 종류다.
  //    ⇒ 짝을 짓지 않고 기다리던 말만 버린다.
  if (meta.smallTalk) { _pending = null; return ''; }
  //  알아들은 말 — 직전에 못 알아들은 말이 있으면 짝을 본다
  const p = _pending;
  if (!p || now - p.at > WINDOW_MS) { _pending = null; return ''; }
  _pending = null;
  if (key === p.key) return '';
  const toks = mirTokens(text).filter((t) => t === mirSlot(t));
  const overlap = toks.filter((t) => p.toks.has(t)).length;
  const need = Math.max(1, Math.ceil(p.toks.size * 0.5));
  if (overlap < need) return '';
  const entry = { kind: 'alias', from: p.q, to: mirTokens(text).map(mirSlot).join(' '), ok: text, by: meta.who || '', at: now, auto: true, hits: 0 };
  try { if (typeof window !== 'undefined') { if (!window.__mirLexicon) window.__mirLexicon = {}; window.__mirLexicon[p.key] = entry; } } catch (e) { /* 창 없음(시험) */ }   // 제자리 갱신 — 구독이 오기 전에도 이 폰은 바로 안다
  try { if (typeof window !== 'undefined' && typeof window.__mirLexiconWrite === 'function') window.__mirLexiconWrite(p.key, entry); }
  catch (e) { console.warn('[미르 학습] 사전 쓰기 실패', e); }
  return `(«${p.q}»는 «${text}» 뜻으로 배웠어요 — 다음엔 바로 답할게요)`;
}
/** 시험용 — 기억 초기화 */
export function _mirReset() { _pending = null; _lastMissAt = {}; }
