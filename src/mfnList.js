// MFN 목록 — 터미널엔 있고 메일 양하 리스트엔 없는 컨(화물은 있으나 적하목록 없음)을 마감텔리 양식으로 인쇄·PDF·엑셀로 내보낸다(4.58)
//
// 왜 (검수사 2026-10-31) — «278대가 양하분 맞는거 같습니다. 다만 34대분은 주의 대상으로 다렌과 텐진이 목적지 였다는걸 표기 바랍니다. 나중에 확정이 되면 정상적으로 돌리는게 맞고요» ·
//   «MFN리스트를 만들고 앱에 컨 상세카드에 그걸 표기하기 바랍니다.» · «MFN표기를 누르면 엑셀또는 PDF로 출력하거나 다운 받을수 있게 해주세요» · «목록 정리도 마감텔리를 찾아보고 같게 만들어 주시면 됩니다.»
//
// 자료 — 수집기가 터미널 이동지시(MOVINS)와 Baplie 로 만들어 올린다: voyages/{선박}_{항차}/discharge/mfnList = { items:{컨:{cn,iso,fe,wt,pol,pod,dest,han,reload,tmp}}, n, ptk, list, src, at }.
//   앱은 읽기만 한다. 양하 유닛 한 벌(utils.ptkDischargeUnitsOf)이 같은 items 를 평택 양하분에 합친다(U.mfn) — 이 파일은 «출력» 만 맡는다.
// 양식 — 마감텔리 SHIFTING 시트 머리·표(NO · CON'T NO · TYPE · F/E · W/T · OPR · POL · POD …)와 Act. Cntr-Seal 하단(규격별 집계 · 서명줄)을 따른다. 엑셀은 tallyExcel.generateMfnExcel.
// ⚠ 이 파일의 HTML 은 템플릿 문자열이다 — 안에 백틱을 쓰지 않는다(reeferList.js 와 같다).
import { ptkDischargeUnitsOf, mfnItemsOf, mfnReloadItemsOf, MFN_RELOAD_COUNTS, MFN_RELOAD_PENDING, mfnDestKo, mfnIsChinaDest, MFN_LABEL, isoToLabel } from './utils.js';
import { tallySizeCol } from './tallyReport.js';
import { canOpenChief } from './staffList.js';
import { isOwnerName } from './adminGuard.js';
import { isAdminUser } from './workChoice.js';

/** 수석 양식을 보는가 — PrintHubModal(4.31)이 수석 자료를 가르는 판정과 같은 식(새 역할 판정을 만들지 않는다). */
export function mfnChiefView(inspector) {
  try { return canOpenChief(inspector, isOwnerName(inspector)) || isAdminUser(inspector); } catch (e) { console.warn('[MFN] 수석 판정 실패 — 일반 양식으로 연다', e); return false; }
}

/** 일반 양식의 한 장 배치(검수사 2026-10-31 08:05) — 왼쪽 본문은 보통 크기 표(입력용), 오른쪽은 가로 5cm 고정 오려붙임 띠(영수증처럼 노트에 붙여 제출).
 *  띠는 줄 수에 맞춰 줄 간격이 줄지만 글자는 6pt 아래로 내려가지 않는다 — 그래도 한 장을 넘으면 stripFits=false(경고를 띄운다. 2열로 나누지 않는다). */
export const MFN_STRIP_MM = 50;          // 띠 가로 5cm
export const MFN_STRIP_MIN_PT = 6;       // 눈으로 읽을 수 있는 최소 글자
export const MFN_PAGE_BODY_MM = 277;     // A4 세로 297 - 여백 20
export function mfnFieldLayout(rows) {
  const list = rows || [];
  const china = list.filter((x) => x.china);
  const ptk = list.filter((x) => !x.china);
  const n = list.length;
  const bodyLines = n + (china.length ? 1 : 0) + (ptk.length ? 1 : 0) + 1;   // 구역 제목 줄·표 머리 줄 포함
  const bodyAvail = MFN_PAGE_BODY_MM - 34;                                   // 위쪽 제목·선명·요약 줄
  const bodyRowMm = Math.min(6.5, bodyAvail / Math.max(bodyLines, 1));
  const bodyFontPt = Math.max(5, Math.min(10, bodyRowMm * 1.6));
  const stripLines = n + 3;                                                  // 띠 맨 위 두 줄 + 절취 표시 줄
  const stripRowMm = Math.min(3.6, MFN_PAGE_BODY_MM / Math.max(stripLines, 1));
  const stripFontPt = Math.min(7, stripRowMm * 2.4);
  const stripFits = stripFontPt >= MFN_STRIP_MIN_PT - 0.001;
  const bodyFits = bodyRowMm * bodyLines <= bodyAvail + 0.001 && bodyFontPt >= MFN_STRIP_MIN_PT;
  return { china, ptk, n, bodyLines, bodyRowMm, bodyFontPt, stripLines, stripRowMm, stripFontPt, stripFits, bodyFits, stripWidthMm: MFN_STRIP_MM, stripHeightMm: stripRowMm * stripLines, fits: stripFits && bodyFits };
}

/** 비고 한 칸 — 중국행은 «다롄행(통과화물) 주의», 재적재는 «재적재». 둘 다면 « / » 로 잇는다. */
export function mfnRemark(it) {
  const parts = ['MFN'];   // 4.58: OS-IN REMARKS 와 같은 말
  if (mfnIsChinaDest(it && it.dest)) parts.push(`${mfnDestKo(it.dest)}행(통과화물) 주의`);
  if (it && it.reload) parts.push(MFN_RELOAD_PENDING);   // 4.59-01: 세는 동안 재적재 항목은 «양하 확인 전» 주석
  return parts.join(' / ');
}

/** 목록 한 벌 — 컨번호순. 수집기가 안 준 칸은 비운다(지어내지 않는다 · 선사 OPR 은 MOVINS 에 없어 비는 게 정상). */
export function mfnListRows(mfnList) {
  const it = mfnList && typeof mfnList === 'object' && mfnList.items && typeof mfnList.items === 'object' ? mfnList.items : {};
  const rows = [];
  for (const [k, x] of Object.entries(it)) {
    if (!x || (x.reload && !MFN_RELOAD_COUNTS)) continue;   // 4.59-01: MFN_RELOAD_COUNTS=false 면 재적재는 양하가 아니라 시프팅 — 목록에 안 넣는다
    const cn = String(x.cn || k || '').trim();
    if (!cn || cn.startsWith('_')) continue;
    const iso = String(x.iso || '').trim();
    const col = iso ? tallySizeCol({ iso, cn }) : '';   // '20' · '40' · 'HC' · '45' — 마감텔리 규격 4분류
    const fe = String(x.fe || '').toUpperCase() === 'E' ? 'E' : (String(x.fe || '').toUpperCase() === 'F' ? 'F' : '');
    rows.push({
      cn, iso, type: iso ? (isoToLabel(iso) || iso) : '', col, len: col === '20' ? '20' : (col ? '40' : ''), fe,
      wt: Number(x.wt) > 0 ? Number(x.wt) : null, op: String(x.op || '').trim(),
      pol: String(x.pol || '').trim(), pod: String(x.pod || '').trim(), dest: String(x.dest || '').trim(),
      han: String(x.han || '').trim(), reload: !!x.reload, china: mfnIsChinaDest(x.dest), tmp: x.tmp == null ? null : x.tmp,
      remark: mfnRemark(x),
    });
  }
  rows.sort((a, b) => a.cn.localeCompare(b.cn));
  return rows;
}

/** 규격별 집계 — 20FT / 40FT(HC·45 포함)의 FULL·EMPTY (Act. Cntr-Seal 하단 꼴). 규격을 모르는 컨은 unknown 으로 따로 센다. */
export function mfnTally(rows) {
  const t = { f20: 0, e20: 0, f40: 0, e40: 0, unknown: 0, total: 0 };
  for (const r of rows || []) {
    t.total += 1;
    if (!r.len || !r.fe) { t.unknown += 1; continue; }
    t[(r.fe === 'F' ? 'f' : 'e') + r.len] += 1;
  }
  return t;
}

/** 중국행·평택행·재적재 대수 — 머리 한 줄과 진단이 같은 말을 쓴다. */
export function mfnCounts(rows) {
  const r = rows || [];
  return { n: r.length, china: r.filter((x) => x.china).length, ptk: r.filter((x) => !x.china).length, reload: r.filter((x) => x.reload).length };
}

/** 합계 옆 한 줄 — «터미널 278 = 리스트 234 + MFN 44». 터미널 수(ptk)·리스트 수는 수집기가 올린 값이다(없으면 쓰지 않는다). */
export function mfnSumLine(head, n) {
  const ptk = Number(head && head.ptk) || 0;
  const list = Number(head && head.list) || 0;
  const ex = Number(head && head.extra) || 0;
  //  4.59-01 — 앱이 센 값에 EDI 전용 추가분이 같이 들면 «앱 279 = 리스트 234 + 추가분 1 + MFN 44»(터미널 수와 섞어 부르지 않는다). 추가분이 없으면 종전 «터미널 278 = 리스트 234 + MFN 44».
  if (ptk > 0 && list > 0 && ex > 0) return `앱 ${ptk} = 리스트 ${list} + 추가분 ${ex} + MFN ${n}`;
  if (ptk > 0 && list > 0) return `터미널 ${ptk} = 리스트 ${list} + MFN ${n}`;
  return `MFN ${n}대`;
}

/** OS-IN(CARGO OVERAGE & SHORTAGE REPORT)과 같은 합계 말 — MANIFESTED 234 · DISCHARGED 278 · OVER 44. 리스트 수를 모르면 빈 글. */
export function mfnOsLine(head, n) {
  const list = (Number(head && head.list) || 0) + (Number(head && head.extra) || 0);   // 4.59-01: 4.20 추가분은 마감텔리 OS-IN 에서 MANIFESTED 로 센다
  return list > 0 ? `MANIFESTED ${list} · DISCHARGED ${list + n} · OVER ${n}` : '';
}

/** 출력 한 벌의 재료 — 호출 세 곳(컨 상세·주의 박스·출력 센터)이 같은 머리를 만든다. voyageInfo 는 항차 info. */
export function mfnPackOf(mfnList, voyageKey, voyageInfo, voyage) {
  //  머리의 «터미널 278 = 리스트 234 + MFN 44» 는 수집기가 올린 스냅샷(mfnList.ptk·list)이 아니라 앱이 지금 계산한 값(양하 유닛 한 벌)을 쓴다 — 화면(홈 카드·전체 칩)과 어긋나지 않게. voyage 가 없을 때만 스냅샷.
  let appPtk = 0, appList = 0, appExtra = 0, keepSet = null;
  const reloadOut = MFN_RELOAD_COUNTS ? 0 : Object.values((mfnList && mfnList.items) || {}).filter((x) => x && x.reload).length;   // 4.59-01: 양하에서 뺀 재적재 대수(한 줄 참고)
  //  재감사 수리 — 출력도 «지금 앱이 계산한 U.mfn 에 든 컨만 MFN». 머스크 개정 리스트로 MFN 컨이 리스트에 들어가면 U.mfn 에서 빠지므로 행 0 · 머리에 MFN 말 없음. basis edi(리스트 없음)는 mfnList.items 그대로.
  if (voyage) { try { const U = ptkDischargeUnitsOf(voyage); if (U.basis !== 'edi') { keepSet = U.mfn; appPtk = U.set.size; appExtra = U.extra ? U.extra.size : 0; appList = U.set.size - U.mfn.size - appExtra; } } catch (e) { console.warn('[MFN] 앱 양하 유닛 계산 실패 — 수집기 스냅샷 수로 대신한다', e); } }
  const rows = mfnListRows(mfnList).filter((r) => !keepSet || keepSet.has(r.cn));
  const vk = String(voyageKey || '');
  const info = voyageInfo || {};
  const head = {
    code: vk.split('_')[0] || '',
    name: info.vslFull || info.vslName || info.vsl || vk.split('_')[0] || '',
    voy: info.voy_d || info.voy || vk.split('_').slice(1).join('_'),
    date: new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10),
    arr: String(info.ata || info.eta || info.planDate || '').slice(0, 10),   // 입항(양하)일 — 접안 계획 시작일. 세관 신고용 열
    vv: [info.vslFull || info.vslName || info.vsl || vk.split('_')[0] || '', info.voy_d || info.voy || vk.split('_').slice(1).join('_')].filter(Boolean).join(' '),
    extra: keepSet ? appExtra : 0, reloadOut, reloadIn: rows.filter((x) => x.reload).length,
    ptk: keepSet ? appPtk : (Number(mfnList && mfnList.ptk) || 0), list: keepSet ? appList : (Number(mfnList && mfnList.list) || 0), src: (mfnList && mfnList.src) || '',
  };
  return { rows, head };
}

const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const _fmtWt = (n) => (n ? Number(n).toLocaleString('en-US') : '');

/** 인쇄 창 전체 문서 — 가로 A4, 마감텔리 SHIFTING 머리 · 표 · 규격별 집계 · 서명줄. 위쪽 줄에 인쇄(PDF 저장)·엑셀·닫기. */
export function generateMfnListHTML(rows, head = {}, opts = {}) {
  const t = mfnTally(rows);
  const c = mfnCounts(rows);
  const body = (rows || []).map((r, i) => `<tr${r.china ? ' class="cn-warn"' : ''}><td>${i + 1}</td><td class="cn">${_esc(r.cn)}</td><td>${_esc(r.type)}</td><td>${_esc(r.fe)}</td><td class="n">${_esc(_fmtWt(r.wt))}</td><td>${_esc(r.pol)}</td><td>${_esc(head.vv || '')}</td><td>${_esc(head.arr || '')}</td><td>${_esc(r.pod)}</td><td>${_esc(r.dest)}</td><td>${r.reload ? 'Y' : ''}</td><td class="rm">${_esc(r.remark)}</td></tr>`).join('');
  const sub = [c.china ? `중국행 ${c.china}대 주의` : '', c.ptk ? `평택행 ${c.ptk}대` : '', ].filter(Boolean).join(' · ');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>MFN LIST</title>
<style>
@page { size: A4 landscape; margin: 10mm; }
* { box-sizing: border-box; }
body { margin: 0; background: #e5e7eb; font-family: Arial, 'Malgun Gothic', '맑은 고딕', sans-serif; color: #111; }
.actions { position: sticky; top: 0; z-index: 100; background: #1e293b; padding: 8px; display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; }
.actions .sp { flex: 1; }
.actions button { padding: 9px 14px; font-size: 13px; font-weight: 700; border: none; border-radius: 6px; cursor: pointer; color: #fff; }
.btn-print { background: #0369a1; } .btn-excel { background: #15803d; } .btn-close { background: #475569; }
.sheet { width: 277mm; margin: 12px auto; padding: 8mm 8mm 10mm; background: #fff; }
.co { font-size: 12pt; font-weight: 700; } .city { font-size: 10pt; }
h1 { font-size: 14pt; margin: 4mm 0 3mm; }
.info { display: flex; flex-wrap: wrap; gap: 1mm 12mm; font-size: 10pt; font-weight: 700; margin-bottom: 3mm; }
table { border-collapse: collapse; width: 100%; table-layout: fixed; font-size: 10pt; }
th, td { border: 0.25mm solid #000; padding: 1mm 1mm; text-align: center; vertical-align: middle; overflow: hidden; }
th { font-weight: 700; background: #f3f4f6; }
thead { display: table-header-group; } tr { break-inside: avoid; page-break-inside: avoid; }
td.cn { font-family: Consolas, 'Courier New', monospace; } td.n { font-family: Consolas, 'Courier New', monospace; } td.rm { text-align: left; }
tr.cn-warn td { background: #fff6d6; }
.w-no { width: 4%; } .w-cn { width: 12%; } .w-ty { width: 6%; } .w-fe { width: 4%; } .w-wt { width: 7%; } .w-pl { width: 6%; } .w-vs { width: 12%; } .w-ar { width: 8%; } .w-pd { width: 7%; } .w-dt { width: 8%; } .w-rl { width: 5%; }
td.rm { white-space: normal; }
.tally { margin-top: 5mm; width: 90mm; break-inside: avoid; } .tally td, .tally th { font-size: 10pt; }
.sumline { margin-top: 3mm; font-size: 10pt; font-weight: 700; } .note { margin-top: 1.5mm; font-size: 8.5pt; color: #333; }
.sign { position: relative; height: 22mm; margin-top: 8mm; break-inside: avoid; }
.sign .ln { position: absolute; bottom: 2mm; width: 60mm; border-top: 0.3mm solid #000; text-align: center; font-size: 10pt; font-weight: 700; padding-top: 1.5mm; }
.sign .l { left: 10mm; } .sign .r { right: 10mm; }
@media print { .no-print { display: none !important; } body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .sheet { width: auto; margin: 0; padding: 0; } }
</style></head><body>
<div class="actions no-print">
  <span style="color:#fff;font-size:13px;font-weight:700">MFN 목록 ${(rows || []).length}대</span>
  <span class="sp"></span>
  ${opts.toggle ? '<button class="btn-close" onclick="window.__switchMfn &amp;&amp; window.__switchMfn(\'field\')">일반 양식으로 보기</button>' : ''}
  <button class="btn-print" onclick="window.print()">PDF 저장 / 인쇄</button>
  <button class="btn-excel" onclick="window.__exportMfnXlsx &amp;&amp; window.__exportMfnXlsx()">엑셀 저장</button>
  <button class="btn-close" onclick="window.close()">닫기</button>
</div>
<div class="sheet">
  <div class="co">GREEN MARINE CO., LTD.</div><div class="city">PYEONGTAEK, KOREA</div>
  <h1>MFN LIST (화물은 있으나 적하목록 없음)</h1>
  <div class="info"><span>M/V : ${_esc(head.name || '')}</span><span>VOY : ${_esc(head.voy || '')}</span><span>DATE : ${_esc(head.date || '')}</span><span>입항(양하) : ${_esc(head.arr || '')}</span><span>PORT : PYEONGTAEK</span></div>
  <table><thead><tr><th class="w-no">NO</th><th class="w-cn">CON'T NO</th><th class="w-ty">TYPE</th><th class="w-fe">F/E</th><th class="w-wt">W/T</th><th class="w-pl">POL</th><th class="w-vs">선명·항차</th><th class="w-ar">입항(양하)일</th><th class="w-pd">POD(터미널)</th><th class="w-dt">원래 POD(Baplie)</th><th class="w-rl">재적재</th><th>REMARKS</th></tr></thead>
  <tbody>${body || '<tr><td colspan="12">NIL</td></tr>'}</tbody></table>
  <table class="tally"><thead><tr><th></th><th>FULL</th><th>EMPTY</th></tr></thead><tbody>
    <tr><th>20FT</th><td>${t.f20 || ''}</td><td>${t.e20 || ''}</td></tr>
    <tr><th>40FT</th><td>${t.f40 || ''}</td><td>${t.e40 || ''}</td></tr>
    <tr><th>TOTAL</th><td colspan="2">${t.total}</td></tr></tbody></table>
  <div class="sumline">${mfnOsLine(head, t.total) ? _esc(mfnOsLine(head, t.total)) + ' — ' : ''}${_esc(mfnSumLine(head, t.total))}${sub ? ' (' + _esc(sub) + ')' : ''}${head.reloadOut ? ' · 재적재 ' + head.reloadOut + '대는 양하에서 뺌' : ''}${head.reloadIn ? ' · 재적재 예정 ' + head.reloadIn + '대 포함(양하 확인 전)' : ''}</div>
  <div class="note">${_esc(MFN_LABEL)}. 40FT 는 HC·45 를 포함합니다.${t.unknown ? ' 규격·F/E 를 모르는 ' + t.unknown + '대는 집계에서 빠집니다.' : ''} 중국행은 원래 목적지가 다롄·톈진(통과화물)이었던 컨으로, 확정되면 정상 양하로 돌립니다.</div>
  <div class="sign"><div class="ln l">CHIEF CHECKER</div><div class="ln r">CHIEF OFFICER</div></div>
</div></body></html>`;
}

/** 일반 검수사 양식 — A4 세로 한 장. 왼쪽 본문(MFN 단독 표, 입력용) + 오른쪽 가로 5cm 오려붙임 띠(컨번호·규격·F/E). 서명줄·OS 표 용어 없음. */
export function generateMfnFieldHTML(rows, head = {}, opts = {}) {
  const L = mfnFieldLayout(rows);
  const c = mfnCounts(rows);
  const ordered = [...L.china, ...L.ptk];
  const tag = (r) => (r.china ? `${mfnDestKo(r.dest)}행 주의` : '') + (r.reload ? `${r.china ? ' · ' : ''}${MFN_RELOAD_PENDING}` : '');
  const grp = (txt, cls) => `<tr class="grp ${cls}"><td colspan="7">${_esc(txt)}</td></tr>`;
  let k = 0;
  const line = (r) => { k += 1; return `<tr class="${r.china ? 'cn-warn' : ''}"><td>${k}</td><td class="cn">${_esc(r.cn)}</td><td>${_esc(r.type)}</td><td>${_esc(r.fe)}</td><td>${_esc(r.pol)}</td><td>${_esc(r.dest)}</td><td class="rm">${_esc(tag(r))}</td></tr>`; };
  const body = (L.china.length ? grp(`중국행 주의 ${L.china.length}대 — 원래 목적지 다롄·톈진 (확정되면 정상 양하로 돌립니다)`, 'g-cn') + L.china.map(line).join('') : '')
    + (L.ptk.length ? grp(`평택행 ${L.ptk.length}대`, 'g-pt') + L.ptk.map(line).join('') : '');
  const strip = ordered.map((r) => `<tr><td class="s1">${_esc(r.cn)}</td><td class="s2">${_esc(r.type)}</td><td class="s3">${_esc(r.fe)}</td></tr>`).join('');
  const sumTxt = `MFN ${c.n}대 (${mfnSumLine(head, c.n)})` + (head.reloadOut ? ` · 재적재 ${head.reloadOut}대는 양하에서 뺌` : '') + (head.reloadIn ? ` · 재적재 예정 ${head.reloadIn}대 포함(양하 확인 전)` : '');
  const warn = L.stripFits ? '' : `<div class="warn no-print">경고 — MFN ${c.n}대는 띠를 최소 글자(${MFN_STRIP_MIN_PT}pt)로 줄여도 한 장에 다 들어가지 않습니다. 띠는 2열로 나누지 않으니 출력 전에 확인하세요.</div>`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>MFN 목록</title>
<style>
@page { size: A4 portrait; margin: 10mm; }
* { box-sizing: border-box; }
body { margin: 0; background: #e5e7eb; font-family: Arial, 'Malgun Gothic', '맑은 고딕', sans-serif; color: #111; }
.actions { position: sticky; top: 0; z-index: 100; background: #1e293b; padding: 8px; display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; }
.actions .sp { flex: 1; }
.actions button { padding: 9px 14px; font-size: 13px; font-weight: 700; border: none; border-radius: 6px; cursor: pointer; color: #fff; }
.btn-print { background: #0369a1; } .btn-excel { background: #15803d; } .btn-close { background: #475569; }
.warn { background: #fecaca; color: #7f1d1d; font-weight: 700; padding: 6px 10px; font-size: 13px; }
.sheet { width: 190mm; height: 277mm; margin: 12px auto; padding: 0; background: #fff; display: flex; gap: 6mm; align-items: flex-start; overflow: hidden; }
.main { width: ${190 - MFN_STRIP_MM - 6}mm; flex: none; }
h1 { font-size: 13pt; margin: 0 0 1.5mm; } .info { font-size: 10pt; font-weight: 700; margin-bottom: 1.5mm; } .info span { margin-right: 4mm; }
.sum { font-size: 10.5pt; font-weight: 800; padding: 1mm 2mm; border: 0.4mm solid #000; margin-bottom: 2mm; }
table.m { border-collapse: collapse; width: 100%; table-layout: fixed; font-size: ${L.bodyFontPt.toFixed(1)}pt; }
table.m th, table.m td { border: 0.25mm solid #000; padding: 0 0.6mm; height: ${L.bodyRowMm.toFixed(2)}mm; text-align: center; vertical-align: middle; overflow: hidden; white-space: nowrap; line-height: 1.05; }
table.m th { font-weight: 700; background: #f3f4f6; }
.w1 { width: 5%; } .w2 { width: 19%; } .w3 { width: 9%; } .w4 { width: 5%; } .w5 { width: 11%; } .w6 { width: 14%; } .w7 { width: 37%; }
td.cn { font-family: Consolas, 'Courier New', monospace; font-weight: 700; } td.rm { text-align: left; font-size: 0.9em; }
tr.grp td { text-align: left; font-weight: 800; background: #e5e7eb; } tr.g-cn td { background: #fde68a; color: #92400e; }
tr.cn-warn td { background: #fff6d6; }
.foot { margin-top: 1.5mm; font-size: 8pt; color: #333; }
.cutwrap { width: ${MFN_STRIP_MM}mm; flex: none; }
.cutlab { font-size: 7pt; color: #555; height: ${L.stripRowMm.toFixed(2)}mm; line-height: ${L.stripRowMm.toFixed(2)}mm; white-space: nowrap; }
.strip { width: ${MFN_STRIP_MM}mm; border: 0.3mm dashed #000; padding: 0; }
.strip .top { font-size: ${L.stripFontPt.toFixed(1)}pt; font-weight: 700; line-height: ${L.stripRowMm.toFixed(2)}mm; height: ${(L.stripRowMm * 2).toFixed(2)}mm; padding: 0 1mm; overflow: hidden; white-space: nowrap; border-bottom: 0.2mm solid #000; }
.strip table { border-collapse: collapse; width: 100%; table-layout: fixed; font-size: ${L.stripFontPt.toFixed(1)}pt; }
.strip td { padding: 0 1mm; height: ${L.stripRowMm.toFixed(2)}mm; line-height: ${L.stripRowMm.toFixed(2)}mm; overflow: hidden; white-space: nowrap; text-align: left; }
.strip td.s1 { width: 52%; font-family: Consolas, 'Courier New', monospace; font-weight: 700; } .strip td.s2 { width: 30%; } .strip td.s3 { width: 18%; text-align: center; }
@media print { .no-print { display: none !important; } body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .sheet { margin: 0; } }
</style></head><body>
<div class="actions no-print">
  <span style="color:#fff;font-size:13px;font-weight:700">MFN 목록 ${c.n}대 (일반 양식 — 오른쪽 띠는 오려서 노트에 붙입니다)</span>
  <span class="sp"></span>
  ${opts.toggle ? '<button class="btn-close" onclick="window.__switchMfn &amp;&amp; window.__switchMfn(\'chief\')">수석 양식으로 보기</button>' : ''}
  <button class="btn-print" onclick="window.print()">PDF 저장 / 인쇄</button>
  <button class="btn-excel" onclick="window.__exportMfnXlsx &amp;&amp; window.__exportMfnXlsx()">엑셀 저장</button>
  <button class="btn-close" onclick="window.close()">닫기</button>
</div>
${warn}
<div class="sheet" data-mfn-form="field">
  <div class="main">
    <h1>MFN 목록 (화물은 있으나 적하목록 없음)</h1>
    <div class="info"><span>${_esc(head.vv || head.name || '')}</span><span>입항(양하) ${_esc(head.arr || '')}</span><span>출력 ${_esc(head.date || '')}</span></div>
    <div class="sum">${_esc(sumTxt)}</div>
    <table class="m"><thead><tr><th class="w1">NO</th><th class="w2">컨번호</th><th class="w3">규격</th><th class="w4">F/E</th><th class="w5">출발지</th><th class="w6">원래 목적지</th><th class="w7">비고</th></tr></thead><tbody>${body}</tbody></table>
    <div class="foot">${_esc(MFN_LABEL)}.${c.reload ? ' 재적재 예정 ' + c.reload + '대 포함(양하 확인 전).' : ''} 입력할 때는 이 표를 보고, 오른쪽 띠는 잘라 노트에 붙여 제출합니다.</div>
  </div>
  <div class="cutwrap" data-mfn-strip="1">
    <div class="cutlab">&#9986; ----- 오려서 노트에 붙이세요 -----</div>
    <div class="strip"><div class="top">${_esc(head.vv || head.name || '')} · ${_esc(head.arr || '')}<br>MFN ${c.n}대</div><table><tbody>${strip}</tbody></table></div>
  </div>
</div></body></html>`;
}

/** 새 창으로 연다 — 인쇄(PDF 저장)와 엑셀 저장. form 은 'chief'(마감텔리 양식) 또는 'field'(일반 한 장). 실패는 alert 로 알린다(조용히 실패하지 않는다). */
export function openMfnListPrint(rows, head = {}, form = 'chief', toggle = false) {
  if (!rows || !rows.length) { alert('MFN 목록이 비어 있습니다'); return; }
  const w = window.open('', '_blank', 'width=1200,height=900');
  if (!w) { alert('팝업 차단을 해제해주세요'); return; }
  let cur = form === 'field' ? 'field' : 'chief';
  const draw = () => {
    w.document.open();
    w.document.write(cur === 'field' ? generateMfnFieldHTML(rows, head, { toggle }) : generateMfnListHTML(rows, head, { toggle }));
    w.document.close();
  };
  w.__switchMfn = (f) => { cur = f === 'field' ? 'field' : 'chief'; draw(); };
  w.__exportMfnXlsx = async function () {
    try {
      const { generateMfnExcel } = await import('./tallyExcel.js');
      await generateMfnExcel(rows, head, { form: cur });
    } catch (e) {
      try { w.alert('엑셀을 만들지 못했습니다 — ' + (e && e.message ? e.message : e)); }
      catch (e2) { alert('엑셀을 만들지 못했습니다 — ' + (e && e.message ? e.message : e)); }
    }
  };
  draw();
}

/** 세 진입점(컨 상세 · 주의 박스 · 출력 센터)이 부르는 한 벌 — 수석(mfnChiefView)은 마감텔리 양식(일반 양식으로 창 안 전환 가능), 그 밖은 일반 한 장. */
export function openMfnList(mfnList, voyageKey, voyageInfo, inspector, voyage) {
  //  basis==='edi'(양하 리스트 없는 항차)에서 mfnList 가 올라와도 컨 상세 MFN 배지·출력은 뜬다(의도) — 대수 합산(U.mfn)은 그 항차에서 안 하지만 터미널이 준 MFN 목록 자체는 세관 신고에 쓸 수 있는 자료라 가리지 않는다. 이때 머리 수는 수집기 스냅샷으로 간다.
  const { rows, head } = mfnPackOf(mfnList, voyageKey, voyageInfo, voyage);
  const chief = mfnChiefView(inspector);
  openMfnListPrint(rows, head, chief ? 'chief' : 'field', chief);
}

export { mfnItemsOf };
