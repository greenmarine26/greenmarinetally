// 엠티실 제출 양식 «공컨테이너 씰체결 작업 리스트» 한 벌 — 현장 종이와 같은 모양(두 단 × 50줄, No·컨테이너번호·Size·Seal)에 앱에 기록된 여섯 자리 실을 채워 인쇄용 HTML 로 만든다
/* ★ TallyOne 3.60-01 (검수사 2026-09-24 «엠티실 양식없이 단순 정리 리스트만 보여줍니다») — 종전 카드의 [엠티실 정리 리스트]는 글자 목록(카톡용)뿐이었다.
   양식은 검수사가 찍어 보낸 ATPR 2643W 종이 그대로 — 40피트 장(HC 다음 RH)과 20피트 장(20' 다음 20'RF)을 따로, 규격 안은 컨번호순.
   ★ 3.60-07 (검수사 2026-09-24 «넘버링은 규격별 갯수를 파악하기 쉽게 보여주는것이 좋다»): 번호는 **규격(Size)마다 1부터** — 규격의 마지막 번호가 곧 그 규격 대수다.
   ⚠ 읽기만 한다(RTDB 쓰기 없음). 잔여 실 목록은 넘기면 끝 장에 붙이지만, 항차 화면은 넘기지 않는다(검수사 2026-09-24 «엠티실에서 잔여실은 표기 안합니다»). */
import { isoToLabel } from './utils.js';

const _esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

/** 종이 Size 칸 표기 — 40HC→HC · 40RH→RH · 40DC→40' · 20DC→20' · 20RF→20'RF · 그 밖(45HC 등)은 라벨 그대로 */
export function esealSizeOf(iso) {
  const l = String(isoToLabel(iso) || '').toUpperCase();
  const len = l.slice(0, 2), t = l.slice(2);
  if (len === '40') return t === 'HC' ? 'HC' : t === 'RH' ? 'RH' : t === 'DC' ? "40'" : `40'${t}`;
  if (len === '20') return t === 'DC' ? "20'" : `20'${t}`;
  return l || String(iso || '');
}
const _lenOf = (iso) => { const l = String(isoToLabel(iso) || ''); return l.startsWith('20') ? 20 : 40; };

/** 대상 컨·실 → 장 목록. rows = [{cn, iso, seal}] */
export function esealSheetPages(rows) {
  const rank = (s) => ['HC', 'RH', "40'"].indexOf(s) >= 0 ? ['HC', 'RH', "40'"].indexOf(s) : ["20'", "20'RF"].indexOf(s) >= 0 ? ["20'", "20'RF"].indexOf(s) : 9;
  const groups = [40, 20].map((len) => rows.filter((r) => _lenOf(r.iso) === len)
    .map((r) => ({ ...r, size: esealSizeOf(r.iso) }))
    .sort((a, b) => rank(a.size) - rank(b.size) || a.size.localeCompare(b.size) || String(a.cn).localeCompare(String(b.cn))))
    .filter((g) => g.length);
  const pages = [];
  for (const g of groups) {
    let prev = null, k = 0;
    const numbered = g.map((r) => { if (r.size !== prev) { prev = r.size; k = 0; } return { ...r, no: ++k }; });   // 3.60-07: 규격마다 1부터
    for (let i = 0; i < numbered.length; i += 100) pages.push(numbered.slice(i, i + 100));
  }
  return pages;
}

export function esealSheetHTML({ vsl = '', voy = '', pol = 'KRPTK', pod = '', date = '', rows = [], remain = [] }) {
  const pages = esealSheetPages(rows);
  const tbl = (list) => `<table><thead><tr><th class="n">No.</th><th>컨테이너번호</th><th class="z">Size</th><th class="s">Seal</th></tr></thead><tbody>${
    Array.from({ length: 50 }, (_, i) => list[i]).map((r) => (r ? `<tr><td class="n">${r.no}</td><td>${_esc(r.cn)}</td><td class="z">${_esc(r.size)}</td><td class="s">${_esc(r.seal || '')}</td></tr>` : '<tr><td class="n"></td><td></td><td class="z"></td><td class="s"></td></tr>')).join('')}</tbody></table>`;
  const head = `<div class="t">공컨테이너 씰체결 작업 리스트</div>
    <div class="m"><div><span>M/V :</span> <b>${_esc(vsl)}</b><br><span>Voy. :</span> <b>${_esc(voy)}</b></div><div><span>POL :</span> <b>${_esc(pol)}</b></div><div><span>Date :</span> <b>${_esc(date)}</b><br><span>POD :</span> <b>${_esc(pod)}</b></div></div>`;
  const body = pages.map((p) => `<div class="pg">${head}<div class="cols">${tbl(p.slice(0, 50))}${tbl(p.slice(50, 100))}</div><div class="f">부착 ${p.filter((r) => r.seal).length} / ${p.length}대</div></div>`).join('');
  const rem = remain.length ? `<div class="pg">${head}<div class="rt">잔여 실 ${remain.length}개 (배정 구간 중 부착되지 않은 실)</div><div class="rm">${remain.map((s) => `<span>${_esc(s)}</span>`).join('')}</div></div>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><title>공컨테이너 씰체결 작업 리스트 ${_esc(vsl)} ${_esc(voy)}</title><style>
@page { size: A4 portrait; margin: 8mm; }
body { font-family: 'Malgun Gothic', 'Noto Sans KR', sans-serif; margin: 0; color: #111; }
.pg { page-break-after: always; }
.pg:last-child { page-break-after: auto; }
.t { text-align: center; font-size: 15pt; font-weight: bold; text-decoration: underline; margin: 2mm 0 3mm; }
.m { display: flex; justify-content: space-between; align-items: flex-end; font-size: 9.5pt; margin-bottom: 2mm; }
.m span { color: #444; }
.cols { display: flex; gap: 0; }
table { border-collapse: collapse; width: 50%; font-size: 9.5pt; table-layout: fixed; }
th, td { border: 0.6pt solid #222; height: 4.5mm; padding: 0 1mm; text-align: center; white-space: nowrap; overflow: hidden; }
th { background: #ddd; font-weight: normal; }
td.n, th.n { width: 11%; background: #eee; }
th.z, td.z { width: 16%; }
th.s, td.s { width: 30%; font-weight: bold; }
.cols table + table { border-left: 1.4pt solid #000; }
.f { text-align: right; font-size: 8.5pt; margin-top: 1mm; }
.rt { font-size: 11pt; font-weight: bold; margin: 2mm 0; }
.rm { display: grid; grid-template-columns: repeat(8, 1fr); gap: 1mm 2mm; font-size: 9.5pt; font-family: monospace; }
</style></head><body>${body}${rem}</body></html>`;
}
