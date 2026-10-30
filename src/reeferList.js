// 수석 리퍼 온도 리스트 — 리스트(EDI)·셋팅·실제 세 온도를 A4 세로 한 장(좌우 두 줄)으로 인쇄하고 엑셀로 받는다(4.57)
//
// 왜 (검수사 2026-10-30) — «마감을 짓기전에 인계용 자료가 필요한데 그것이 부족합니다» · «수석 검수사용 리퍼 리스트를 출력할곳이 없습니다. 엑셀 저장도 없고요»
//   «리스트 온도와 자료받은 것의 셋팅온도 실제온도 3가지가 적힌 리스트가 필요 합니다»
//   «저장한 사람은 자료에 남기는건 상관없는데 출력이나 엑셀 자료에는 체크 하면 넣고 체크 안하면 넣지않게»
//   «굳이 가로로 할 필요가 없습니다. 세로 한장에 넣을수 있으면 가장 좋습니다 · 온도 자릿수도 소수점 한자리로»
//   «사인 자리는 수기 사인 · 이름 없는 빈자리 · 갯수와 상관없이 사인자리는 항상 고정»
//
// 규칙
//   · 리스트 = 지금 DB 에 저장된 값이다(모달에서 고치는 중인 값이 아니다). 확인자·확인 시각은 자료에 늘 남고, 출력·엑셀에는 체크했을 때만 나간다.
//   · 온도는 전부 소수점 한 자리(-20 → -20.0). 숫자로 못 읽는 값은 원문 그대로.
//   · 대수를 반씩 나눠 좌우 줄 수를 맞춘다(홀수면 왼쪽이 한 줄 많다). 확인 시각을 넣으면 폭이 모자라 한 줄 배치(쪽당 40대).
//   · 서명란은 쪽 맨 아래 고정 — CHIEF CHECKER · CHIEF OFFICER 두 줄, 이름 없음(마감텔리·카고플랜과 같은 자리).
//   · ⚠ 이 파일의 HTML 은 템플릿 문자열이다 — 안에 백틱을 쓰지 않는다.
import { isReeferContainer, reeferTempExempt, effectivePos } from './utils.js';

/** 점검 대상 = 풀 리퍼만(ReeferMemoModal 과 같은 한 벌 — 버튼 숫자·모달 줄 수·이 리스트 줄 수가 같아야 한다). */
export const isReeferTarget = (c) => {
  const rf = isReeferContainer(c);
  if (!rf) return false;
  if (reeferTempExempt(c)) return false;
  return c.fe === 'F' || !c.fe;
};

/** 온도를 숫자로 읽는다(견줄 때만 쓴다). 단위·유니코드 음수부호를 허용하고 못 읽으면 null. */
export function tempNum(v) {
  let t = String(v ?? '').trim()
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xFEE0))   // 전각 숫자
    .replace(/[−–—]/g, '-').replace(/^([-+])\s+/, '$1');
  t = t.replace(/\s*(?:℃|°\s*[Cc]?|[Cc]|도)$/, '').trim();   // 단위는 끝에서만 허용한다(«1C8» 이 18 로 읽히면 안 된다)
  t = t.replace(/^([-+]?\d+),(\d+)$/, '$1.$2').replace(/^([-+]?)\./, '$10.');   // «18,5» «-.5»
  const m = t.match(/^[-+]?\d+(?:\.\d+)?$/);   // EDI 는 «+1» 처럼 + 를 붙여 오기도 한다
  return m ? Number(m[0]) : null;
}

/** 소수점 한 자리로 — 숫자가 아니면 원문 그대로, 비었으면 빈 문자열. */
export function temp1(v) {
  if (v == null || String(v).trim() === '') return '';
  const n = tempNum(v);
  if (n === null) return String(v).trim();
  const s = n.toFixed(1);
  return s === '-0.0' ? '0.0' : s;
}

//  위치 — 서류(tallyReport.buildRF)와 같은 한 벌: 실적(bay_actual) > 검수원이 정한 자리 > 계획. 덱플랜 좌표(RZOR deckPos)·pos 는 fmtPos 처럼 우선한다.
const _pos = (c) => {
  if (!c) return '';
  const p = effectivePos(c);
  if (p.inStorage) return '';
  if (p.src === 'actual' || p.src === 'assign') return [p.bay, p.row, p.tier].map((x) => String(x).padStart(2, '0')).join('-');
  if (c.deckPos) return String(c.deckPos);
  if (c.pos) return String(c.pos);
  if (!p.bay) return '';
  return [p.bay, p.row || '00', p.tier || '00'].map((x) => String(x).padStart(2, '0')).join('-');
};

/** 확인 시각을 «MM-DD HH:mm»(한국시각)로. */
export function fmtAt(ms) {
  const n = Number(ms);
  if (!n) return '';
  const d = new Date(n + 9 * 3600 * 1000);
  const p = (x) => String(x).padStart(2, '0');
  return `${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** 목록 한 벌 — 위치순(위치 없는 컨은 맨 뒤), 같으면 컨번호순. */
export function reeferListRows(containers) {
  const rows = (containers || []).filter(isReeferTarget).map((c) => ({
    cn: c.cn || '',
    iso: c.tp || c.iso_carrier || c.iso || '',
    pos: _pos(c),
    tmp: c.tmp,
    set: (c.rfSet != null && String(c.rfSet).trim() !== '') ? c.rfSet : c.tmp,   // 서류·reeferTempOf 와 같이: 셋팅은 rfSet, 없으면 리스트 온도
    act: c.rfSrc === 'list' ? '' : c.rfAct,   // 「전부 리스트대로」로 베낀 값은 잰 값이 아니다(2026-09-07 DXQD)
    by: c.rfCheckedBy || '',
    at: c.rfCheckedAt || 0,
  }));
  rows.sort((a, b) => ((a.pos || '￿') + a.cn).localeCompare((b.pos || '￿') + b.cn));
  return rows;
}

/** 어긋난 칸 — 리스트와 셋팅이 다르다(0.05 초과) · 실제가 셋팅과 3도 이상 벌어졌다. 숫자로 못 읽으면 판정하지 않는다. */
export function reeferRowFlags(r) {
  const l = tempNum(r.tmp); const s = tempNum(r.set); const a = tempNum(r.act);
  const d1 = (x, y) => Math.round((x - y) * 10) / 10;   // 화면 소수 한 자리와 같은 눈금(부동소수점 경계 3.0 이 빠지지 않게)
  return {
    setBad: l !== null && s !== null && d1(l, s) !== 0,
    actBad: s !== null && a !== null && Math.abs(d1(a, s)) >= 3,
  };
}

const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const PER_TWO = 80;   // 쪽당 대수 — 좌우 두 줄(40+40)
const PER_ONE = 40;   // 확인 시각을 넣으면 한 줄 배치

/** 쪽마다 한 장씩 — 옵션 {by, at, hi}. */
export function generateReeferListPages(rows, head = {}, o = {}) {
  const by = !!o.by; const at = !!o.at; const hi = o.hi !== false;
  const two = !at;
  const PER = two ? PER_TWO : PER_ONE;
  const np = Math.max(1, Math.ceil(rows.length / PER));
  const title = `리퍼 컨테이너 온도 확인표 · ${_esc(head.name || '')}${head.voy ? ' ' + _esc(head.voy) : ''}${head.modeLabel ? ' ' + _esc(head.modeLabel) : ''}`;
  const thead = `<thead><tr><th class="c-no">순번</th><th class="c-cn">컨테이너</th><th class="c-iso">규격</th><th class="c-pos">위치</th><th class="c-t">리스트<br>온도</th><th class="c-t">셋팅<br>온도</th><th class="c-t">실제<br>온도</th>${by ? '<th class="c-by">확인자</th>' : ''}${at ? '<th class="c-at">확인 시각</th>' : ''}</tr></thead>`;
  const tbl = (rs, base, cls) => `<table class="${cls}">${thead}<tbody>${rs.map((r, i) => {
    const f = hi ? reeferRowFlags(r) : { setBad: false, actBad: false };
    return `<tr${f.setBad || f.actBad ? ' class="bad"' : ''}><td class="n">${base + i + 1}</td><td class="cn">${_esc(r.cn)}</td><td>${_esc(r.iso)}</td><td class="n">${_esc(r.pos)}</td><td class="n">${_esc(temp1(r.tmp))}</td><td class="n${f.setBad ? ' hit' : ''}">${_esc(temp1(r.set))}</td><td class="n${f.actBad ? ' hit' : ''}">${_esc(temp1(r.act))}</td>${by ? `<td>${_esc(r.by)}</td>` : ''}${at ? `<td class="n">${_esc(fmtAt(r.at))}</td>` : ''}</tr>`;
  }).join('')}</tbody></table>`;
  let h = '';
  for (let p = 0; p < np; p += 1) {
    const pg = rows.slice(p * PER, (p + 1) * PER); const base = p * PER;
    const half = Math.ceil(pg.length / 2);
    const lines = two ? half : pg.length;
    const rh = Math.min(8, Math.floor(((240 - 9) / lines) * 10) / 10);   // mm — 쪽 높이를 채우되 너무 늘어지지 않게
    const body = two
      ? `<div class="cols">${tbl(pg.slice(0, half), base, 'two')}${pg.length > half ? tbl(pg.slice(half), base + half, 'two') : ''}</div>`
      : `<div class="one">${tbl(pg, base, 'one')}</div>`;
    h += `<div class="page" style="--rh:${rh}mm"><div class="ph"><h2>${title}</h2><div class="meta">${_esc(head.corp || '평택항 그린마린 검수')} · ${_esc(head.date || '')} 출력 · 온도 ℃<br>붉은 줄 = 리스트≠셋팅 또는 실제−셋팅 3℃ 이상 · ${p + 1} / ${np}쪽</div></div>${body}<div class="sign"><div class="ln l">CHIEF CHECKER</div><div class="ln r">CHIEF OFFICER</div></div></div>`;
  }
  return h;
}

/** 인쇄 창 전체 문서 — 위쪽 줄에 확인자·시각 체크와 인쇄·엑셀·닫기. 체크는 부모가 걸어 다시 그린다(openReeferListPrint). */
export function generateReeferListHTML(rows, head = {}, o = {}) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>리퍼 온도 확인표</title>
<style>
@page { size: A4 portrait; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; background: #e5e7eb; font-family: 'Malgun Gothic','맑은 고딕',sans-serif; color: #111; }
.actions { position: sticky; top: 0; z-index: 100; background: #1e293b; padding: 8px; display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; }
.actions label { color: #fff; font-size: 13px; display: flex; gap: 6px; align-items: center; cursor: pointer; }
.actions input { width: 17px; height: 17px; }
.actions .sp { flex: 1; }
.actions button { padding: 9px 14px; font-size: 13px; font-weight: 700; border: none; border-radius: 6px; cursor: pointer; color: #fff; }
.btn-print { background: #0369a1; } .btn-excel { background: #15803d; } .btn-close { background: #475569; }
#pages { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 12px 0; }
.page { width: 210mm; height: 296mm; padding: 9mm 8mm; background: #fff; display: flex; flex-direction: column; overflow: hidden; page-break-after: always; break-after: page; }
.page:last-child { page-break-after: auto; break-after: auto; }
.ph { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 0.6mm solid #111; padding-bottom: 2mm; margin-bottom: 3mm; flex: none; }
.ph h2 { font-size: 13pt; margin: 0; }
.ph .meta { font-size: 7.5pt; line-height: 1.5; text-align: right; color: #333; }
.cols { display: flex; gap: 4mm; align-items: flex-start; }
.cols table { flex: 1; min-width: 0; }
.one { display: flex; }
.one table { flex: 1; }
table { border-collapse: collapse; table-layout: fixed; font-size: 8pt; }
th, td { border: 0.25mm solid #666; padding: 0 1mm; text-align: center; white-space: nowrap; overflow: hidden; }
th { background: #e9edf1; font-weight: 700; font-size: 7.5pt; height: 9mm; }
td { height: var(--rh, 5.8mm); }
td.n { font-family: Consolas,'Courier New',monospace; }
td.cn { font-family: Consolas,'Courier New',monospace; text-align: left; letter-spacing: 0.02em; }
.c-no { width: 7%; } .c-cn { width: 22%; } .c-iso { width: 9%; } .c-pos { width: 15%; } .c-t { width: 11%; } .c-by { width: 15%; } .c-at { width: 17%; }
.one .c-no { width: 6%; } .one .c-cn { width: 17%; } .one .c-iso { width: 8%; } .one .c-pos { width: 12%; } .one .c-t { width: 10%; } .one .c-by { width: 11%; } .one .c-at { width: 16%; }
tr.bad td { background: #fde8e6; color: #b42318; font-weight: 700; }
tr.bad td.hit { outline: 0.5mm solid #b42318; outline-offset: -0.5mm; }
.sign { position: relative; height: 18mm; margin-top: auto; flex: none; }
.sign .ln { position: absolute; bottom: 1mm; width: 40mm; border-top: 0.3mm solid #000; text-align: center; font-size: 8pt; font-weight: 700; padding-top: 1.5mm; }
.sign .l { left: 13mm; } .sign .r { left: 64mm; }
@media print { .no-print { display: none !important; } body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; } #pages { display: block; padding: 0; } }
</style></head><body>
<div class="actions no-print">
  <label><input type="checkbox" id="rfBy"${o.by ? ' checked' : ''}> 확인한 사람 넣기</label>
  <label><input type="checkbox" id="rfAt"${o.at ? ' checked' : ''}> 확인 시각 넣기</label>
  <label><input type="checkbox" id="rfHi"${o.hi === false ? '' : ' checked'}> 차이 나는 줄 강조</label>
  <span class="sp"></span>
  <button class="btn-print" onclick="window.print()">PDF 저장 / 인쇄</button>
  <button class="btn-excel" onclick="window.__exportReeferXlsx &amp;&amp; window.__exportReeferXlsx()">📊 엑셀 받기</button>
  <button class="btn-close" onclick="window.close()">닫기</button>
</div>
<div id="pages">${generateReeferListPages(rows, head, o)}</div></body></html>`;
}

/** 새 창으로 연다 — 확인자·시각·강조 체크가 바뀌면 같은 창에서 다시 그리고, 엑셀도 그 체크대로 만든다. */
export function openReeferListPrint(rows, head = {}) {
  const w = window.open('', '_blank', 'width=900,height=1200');
  if (!w) { alert('팝업 차단을 해제해주세요'); return; }
  const o = { by: false, at: false, hi: true };
  w.document.write(generateReeferListHTML(rows, head, o));
  w.document.close();
  const redraw = () => {
    o.by = !!w.document.getElementById('rfBy')?.checked;
    o.at = !!w.document.getElementById('rfAt')?.checked;
    o.hi = !!w.document.getElementById('rfHi')?.checked;
    const box = w.document.getElementById('pages');
    if (box) box.innerHTML = generateReeferListPages(rows, head, o);
  };
  ['rfBy', 'rfAt', 'rfHi'].forEach((id) => w.document.getElementById(id)?.addEventListener('change', redraw));
  //  진짜 엑셀(.xlsx) — exceljs 는 1MB 라 누를 때만 동적 import(검수 리스트·X-RAY 와 같은 방식).
  w.__exportReeferXlsx = async function () {
    try {
      const { generateReeferExcel } = await import('./tallyExcel.js');
      await generateReeferExcel(rows, head, { by: o.by, at: o.at, hi: o.hi });
    } catch (e) {
      //  조용히 실패하지 않는다 — 눌렀는데 아무 일도 안 나면 검수사는 앱을 의심한다.
      try { w.alert('엑셀을 만들지 못했습니다 — ' + (e && e.message ? e.message : e)); }
      catch (e2) { alert('엑셀을 만들지 못했습니다 — ' + (e && e.message ? e.message : e)); }
    }
  };
}
