// 세관 «적하목록 검수예정 목록»(UNI-PASS InspectCheckList.xls) 파서·매처 — 선박명+항차로 양하 MRN(끝자리 I)과 서류 상태를 찾는다
/* ★ TallyOne 3.59 (검수사 2026-09-23 «이부분 추가도 검토하세요» · «이서류는 수석은 관여 하지 않습니다 검수원이 할일입니다»)
   왜 — SWTD 9014E 처럼 PORT-MIS 에 출항(E) 신고만 있는 배는 양하 MRN 이 어디에도 없어 X-RAY 서류가 «MRN 을 못 찾았습니다» 로 멈췄다.
        세관 검수예정 목록에는 그 번호(26SNKO3436I)가 있다. 실측 2026-09-23 파일 19줄 × 진행 항차 14척 → 11척 번호를 찾음(앱에 있던 건 2척).
   읽는 순서(XrayTab) — 항차 손입력 → 이 목록(양하만) → PORT-MIS. 이 목록은 선적(E) 번호를 주지 않는다.
   맞추는 법 — 선박 풀네임(베이매트릭스 신원 한 벌 shipIdentityOf, 공백 무시)이 **통째로 같고** 항차가 앞 0 을 뗀 채 같을 것.
        항차 칸이 빈 줄(실측 XINQUNDAO)은 그 이름의 빈 줄이 하나뿐이고 ETA 가 작업일 3일 안일 때만 쓴다. */
import { shipIdentityOf } from './portMisMatch.js';

const HEAD = { MRN: 'mrn', '선박명': 'vessel', '항차': 'voy', ETA: 'eta', POD: 'pod', '상이내역유무': 'diff', '적하목록': 'manifest', '하선신고': 'landing', '이상보고': 'issue' };
export const normName = (s) => String(s || '').toUpperCase().replace(/[\s　\-_.]/g, '');
export const normVoy = (s) => String(s || '').toUpperCase().replace(/\s/g, '').replace(/^0+/, '');

/** 시트 행 배열(첫 줄 머리) → [{mrn, vessel, voy, eta, pod, diff, manifest, landing, issue}]. 머리 이름으로 칸을 찾는다(열 순서가 바뀌어도). */
export function parseInspectCheckRows(rows) {
  const all = (rows || []).map((r) => (r || []).map((x) => String(x == null ? '' : x).trim()));
  const hi = all.findIndex((r) => r.includes('MRN') && r.includes('선박명'));
  if (hi < 0) throw new Error('검수예정 목록 파일이 아닙니다 — 머리에 «MRN»·«선박명» 칸이 없습니다.');
  const idx = {}; all[hi].forEach((h, i) => { if (HEAD[h]) idx[HEAD[h]] = i; });
  const out = [];
  for (const r of all.slice(hi + 1)) {
    const mrn = String(r[idx.mrn] || '').toUpperCase().replace(/\s/g, '');
    if (!/^[0-9]{2}[A-Z0-9]{6,12}$/.test(mrn)) continue;
    const o = { mrn };
    for (const k of Object.keys(HEAD).map((h) => HEAD[h])) if (k !== 'mrn') o[k] = idx[k] != null ? String(r[idx[k]] || '') : '';
    out.push(o);
  }
  return out;
}

/** 저장된 목록(inspect_checklist, MRN 키) 중 이 항차의 양하 줄. 없으면 null. */
export function matchInspectCheck(list, info) {
  const rows = Object.values(list || {}).filter((r) => r && r.mrn && String(r.mrn).toUpperCase().endsWith('I'));
  const id = shipIdentityOf(info || {});
  const nm = normName(id.name || (info && info.vslFull));
  if (!nm || nm.length < 5) return null;
  const same = rows.filter((r) => normName(r.vessel) === nm);
  if (!same.length) return null;
  const vs = [info && info.voy_d, info && info.voy].map(normVoy).filter(Boolean);
  const hit = same.filter((r) => r.voy && vs.includes(normVoy(r.voy)));
  if (hit.length) return hit.sort((a, b) => String(b.eta || '').localeCompare(String(a.eta || '')))[0];
  //  항차 칸이 빈 줄(실측 XINQUNDAO 26NOLS638EI) — 그 이름의 빈 줄이 하나뿐이고 ETA 가 이 항차 작업일과 3일 안일 때만(지난 항차 2637E 를 붙이지 않게).
  const blank = same.filter((r) => !r.voy);
  if (blank.length !== 1) return null;
  const d = (x) => { const m = String(x || '').match(/(\d{4})[-.]?(\d{2})[-.]?(\d{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; };
  const e = d(blank[0].eta), p = d((info && (info.planDate || info.eta)) || '');
  return Number.isFinite(e) && Number.isFinite(p) && Math.abs(e - p) <= 3 * 86400000 ? blank[0] : null;
}

/** 서류 상태 한 줄 — «적하목록 선별마감 · 하선신고 제출완료 · 이상보고 미입력». */
export function inspectStatusText(r) {
  if (!r) return '';
  return [['적하목록', r.manifest], ['하선신고', r.landing], ['이상보고', r.issue]].filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(' · ');
}
