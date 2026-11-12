// 미르 부르는 길 한 벌(4.89) — 검색줄 «미르야» 부름(summonMirIfCalled)과 미르 시트(MirFab)의 여닫이·기분 상태를 잇는 작은 가게 (이름이 mir* 가 아닌 까닭 — src 의 mir*.js 는 엔진·콘앱 포장 둘뿐이라는 규칙 smoke_mirfile)
/* ★ TallyOne 4.89 — 미르는 화면에 얼굴 단추가 없다(떠 있는 얼굴도 머리띠 단추도 없다). 이미 있는 검색줄 🎤·⌨ 로 «미르야» 하면 시트가 올라온다(아래 summonMirIfCalled).
   - 판정은 여기 없다 — 호출어는 nlSearch.parseNaturalQuery 의 _mir 규칙 한 벌, 기분은 MirFab 이 mir.js [mirMood] 로 재서 시트 머리에 보인다.
   - setMirDock·setMirOpener 는 단독 연막 렌더의 제자리 단추(MirDockButton solo)가 쓴다. */

const BASIC = Object.freeze({ key: 'basic', label: '', why: '', badge: '' });
let _state = { ready: false, open: false, busy: false, mood: BASIC };
const _subs = new Set();
let _opener = null;

export function getMirDock() { return _state; }

export function setMirDock(patch) {   // 4.89: MirFab 만 부른다 — 기분·생각 중·열림·준비(로그인)
  const next = { ..._state, ...(patch || {}) };
  if (next.ready === _state.ready && next.open === _state.open && next.busy === _state.busy && next.mood === _state.mood) return;
  _state = next;
  for (const fn of [..._subs]) {
    try { fn(_state); } catch (e) { console.warn('[4.89 미르 자리] 단추 갱신 실패:', e); }
  }
}

export function subscribeMirDock(fn) {
  _subs.add(fn);
  return () => { _subs.delete(fn); };
}

//  MirFab 이 «시트 여닫기» 함수를 맡긴다. 지우려면 null.
export function setMirOpener(fn) { _opener = typeof fn === 'function' ? fn : null; }

//  단추가 부른다 — 열려 있으면 닫고 닫혀 있으면 연다. 여닫이가 없으면 false(단추는 그때 안 그려지므로 실제로는 안 온다).
export function toggleMirSheet(from = '') {
  if (!_opener) { console.warn('[4.89 미르 자리] 미르 시트가 아직 없습니다 —', from || '단추'); return false; }
  _opener(from);
  return true;
}

//  ★ 4.89 (검수사 2026-11-12 19:36 «미르를 숨기는것은 어떻습니까? 미르를 호출하면 나오는것으로 바꾸는것입니다. 마이크를 누르고 미르야 하면 … 무엇을 도와드릴까요 하며 나타나는것입니다»
//    · 19:38 «검색줄 마이크를 이용합니다. 새로 만드는거 부피만 커집니다. 있는걸 잘 사용하는것이 좋을것 같습니다»)
//    얼굴 단추는 없다. 이미 있는 검색줄(🎤 말·⌨ 글)이 받은 말이 호출어(nlSearch 의 _mir 규칙 한 벌 — parsed.mirCalled)로 시작하면 미르 시트를 부른다.
//    호출어만이면(parsed.mirHello) 인사 «무엇을 도와드릴까요?» 뒤 다시 듣고, 물음이 붙어 있으면 인사 없이 바로 답한다.
//    미르 시트(MirFab)가 없으면(로그인 전 · 단독 연막) false — 부른 쪽은 종전 검색 길로 간다. 호출어 없는 말은 늘 false(검색 그대로).
let _summoner = null;
export function setMirSummoner(fn) { _summoner = typeof fn === 'function' ? fn : null; }
export function summonMirIfCalled(text, parsed, from = '') {
  const t = String(text || '').trim();
  if (!t || !parsed || !parsed.mirCalled) return false;
  if (!_summoner) return false;
  try { return _summoner({ text: t, hello: !!parsed.mirHello, from }) !== false; }   // 4.89 감사 권장 5: 시트가 받지 않으면(로그인 전) false — 검색 길로
  catch (e) { console.warn('[4.89 미르 부르기] 시트를 못 열었습니다 — 검색 길로 갑니다:', from, e); return false; }
}
