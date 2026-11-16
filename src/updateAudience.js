// 업데이트 알림(배너) 대상 판정 — 판 설명(APP_NOTE) 맨 앞의 «[수석]» 표지가 있으면 부수석 이상에게만 알림을 보인다.
//   검수사 2026-11-16 22:02 «수석자료 수정시는 업데이트 알림을 부수석이상에게만 보이게 하세요».
//   표지는 build.sh 가 sw.js NOTE 로 그대로 옮기고, 배너(UpdatePrompt)가 여기서 떼어 읽는다. 앱은 알림 없이도 다음 접속 때 새 판을 받는다(네트워크 우선).
export const CHIEF_ONLY_MARK = '[수석]';

/** APP_NOTE 한 줄을 { chiefOnly, text } 로 가른다 — text 는 표지를 뗀 화면용 글. */
export function splitNoteAudience(note) {
  const s = String(note || '').trim();
  if (s.startsWith(CHIEF_ONLY_MARK)) return { chiefOnly: true, text: s.slice(CHIEF_ONLY_MARK.length).trim() };
  return { chiefOnly: false, text: s };
}

/** 이 사람에게 그 알림을 보여도 되는가 — 수석 전용 알림은 수석검수·부수석·테스터·소유자만. isChief/isOwner 는 호출부가 넘긴다(순환 import 방지). */
export function canSeeUpdateNote(note, { isChief = false, isOwner = false } = {}) {
  const a = splitNoteAudience(note);
  return !a.chiefOnly || !!isChief || !!isOwner;
}
