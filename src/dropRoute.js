// 자료 센터 «등록 한 칸» — 한꺼번에 놓은 파일을 EDI·리스트·X-RAY 세 갈래로 나누는 순수 함수 (TallyOne 4.34)
//  분류의 한 벌은 mailboxFs.suggestTarget(파일 이름 추천)이다 — 새 분류기를 또 만들지 않는다. 사진(jpg·png)만 이름으로 안 읽혀 리스트 칸으로 보낸다.
import { suggestTarget } from './mailboxFs.js';

const RE_PHOTO = /\.(jpe?g|png|heic|webp)$/i;

/** files: File[] · mode: 'discharge'|'loading' → { edi, list, xray, skipped:[{name, why}] } (원본 File 객체 그대로) */
export function splitDroppedFiles(files, mode) {
  const out = { edi: [], list: [], xray: [], skipped: [] };
  for (const f of Array.from(files || [])) {
    const name = String((f && f.name) || '');
    let t = suggestTarget(name);
    if (!t && RE_PHOTO.test(name)) t = 'list';
    if (!t) { out.skipped.push({ name, why: '종류를 읽지 못했습니다 — 아래 EDI·세관 리스트·X-RAY 칸에서 직접 올려 주세요' }); continue; }
    if (t === 'xray' && mode !== 'discharge') { out.skipped.push({ name, why: 'X-RAY 목록은 양하에만 올립니다' }); continue; }
    out[t].push(f);
  }
  return out;
}

/** 나눈 결과를 사람이 읽을 한 줄들로 */
export function describeSplit(sp) {
  const rows = [];
  if (sp.edi.length) rows.push(`EDI 칸 ${sp.edi.length}개 — ${sp.edi.map((f) => f.name).join(', ')}`);
  if (sp.list.length) rows.push(`세관·선사 리스트 칸 ${sp.list.length}개 — ${sp.list.map((f) => f.name).join(', ')}`);
  if (sp.xray.length) rows.push(`X-RAY 칸 ${sp.xray.length}개 — ${sp.xray.map((f) => f.name).join(', ')}`);
  sp.skipped.forEach((s) => rows.push(`건너뜀 ${s.name} — ${s.why}`));
  return rows;
}
