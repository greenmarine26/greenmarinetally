// 터미널(PCTC·동방)이 올린 본선 작업 현황을 화면 표 모양으로 바꾸는 순수 함수 — 수석 실시간 보드와 콘앱 실시간 화면이 같은 값을 보이게 하는 한 벌.
//
// ★ TallyOne 4.03 / ConeOne 2.61 — 검수사 2026-10-04 16:20
//   «수석대쉬보드의 실시간 작업 현황과 콘앱의 실시간 작업 현황이 검수사가 찍지 않으면 안보일 경우
//    PCTC의 선박별 본선 작업 현황과 동방의 선박별 본선작업 현황을 보여줄수 있게 해주세요»
//   (같은 날 16:40 «네 그대로 해주세요» — 시안 «터미널 본선 현황 시안»)
//
// 읽는 자료(수집기 MailPilot 이 쓴다 — 이 파일은 읽기만 한다)
//   PCTC  info.termStat = { src:'PCTC', berth:'7B', atw, etb, etd, at(ms), dis:{tot,done,rest}, lod:{tot,done,rest},
//                           gc:{'101':{disTot,disRest,lodTot,lodRest}, …} }              (vesselstatus.py · 약 1분 주기 PUT)
//   동방  info.qcWork   = { QC103:{qc,total,disDone,disRest,lodDone,lodRest}, … }        (pnctpull.py · 받은 시각 없음)
//         + info.planDis · planLod · berth · workStartAt
//
// 규칙(검수사 확정)
//   · 숫자는 터미널이 말한 그대로 보인다 — 앱이 다시 거르거나 더하지 않는다(합계 칸만 보이는 칸들의 합).
//   · GC별 칸은 터미널 화면과 같이 «잔여량» 만 보인다. gc.*Tot 은 뜻이 확인되지 않아 **칸으로 쓰지 않는다**
//     (실측 MCSC GC101 lodTot 0 ↔ lodRest 150 — Tot 이 «총량» 이 아니다). 줄을 둘지 말지(그 GC 가 이 배 일에 들었나)만 네 값 중 하나라도 0 보다 큰지로 가린다.
//   · PCTC 는 자료 받은 시각(at)을 보이고, 잔여가 남았는데 3시간 넘게 안 갱신되면 stale. 동방 자료엔 시각이 없어 stale 를 말하지 않는다.
//   · 동방 합이 평택 계획(planDis·planLod)을 5% 넘게 웃돌면 overPlan — 타 항 하역분이 섞였을 수 있다(3.22 실측 ATPR 2640E 376 ↔ 계획 260).
//   · 미르 «언제 끝나» 계산(nlSearch.termProgressOf)·완료 기록·isWorkingNow 는 건드리지 않는다. 이 함수는 표시용이다.
//
// 돌려주는 값: null(보일 것이 없음) 또는
//   { src:'PCTC'|'PNCT', label:'PCTC 7B'|'동방 14번선석', at, atText, startText, etdText, stale, overPlan, planDis, planLod,
//     total, done, rest, pct, rows:[{key,label,dis,lod,sum}], gc:[{gc,dis,lod,sum}], qc:[{qc,total,disDone,lodDone,disRest,lodRest}], qcSum:{…} }

const STALE_MS = 3 * 3600 * 1000;
const OVER_PLAN = 1.05;

const num = (x) => { const v = Number(x); return Number.isFinite(v) && v > 0 ? Math.round(v) : 0; };

//  «YYYY-MM-DD HH:MM»·«YYYY/MM/DD HH:MM» 문자열 → 한국시각 (월-일, 시:분). 모양이 다르면 null.
function parseKst(v) {
  if (!v) return null;
  const m = String(v).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{2})/);
  if (!m) return null;
  const p2 = (s) => String(s).padStart(2, '0');
  return { ymd: m[1] + '-' + p2(m[2]) + '-' + p2(m[3]), md: p2(m[2]) + '-' + p2(m[3]), hm: p2(m[4]) + ':' + m[5] };
}
function kstParts(ms) {
  const d = new Date(ms + 9 * 3600 * 1000);
  const p2 = (n) => String(n).padStart(2, '0');
  return { ymd: d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()), hm: p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()) };
}
//  오늘 날짜면 시:분만, 다른 날이면 «월-일 시:분».
function clockText(v, now) {
  const t = parseKst(v);
  if (!t) return '';
  return t.ymd === kstParts(now).ymd ? t.hm : t.md + ' ' + t.hm;
}

function berthLabel(src, berth) {
  const b = String(berth || '').trim();
  if (src === 'PCTC') return b ? 'PCTC ' + b : 'PCTC';
  const m = b.match(/(\d+)\s*번\s*선석/);
  return '동방' + (m ? ' ' + m[1] + '번선석' : b ? ' ' + b : '');
}

export function termBoardOf(info, now = Date.now()) {
  if (!info || typeof info !== 'object') return null;
  const ts = info.termStat;

  // ── PCTC — 본선작업현황
  if (ts && typeof ts === 'object' && ts.dis && ts.lod) {
    const dis = { tot: num(ts.dis.tot), done: num(ts.dis.done), rest: num(ts.dis.rest) };
    const lod = { tot: num(ts.lod.tot), done: num(ts.lod.done), rest: num(ts.lod.rest) };
    const total = dis.tot + lod.tot;
    if (!(total > 0)) return null;
    const done = dis.done + lod.done, rest = dis.rest + lod.rest;
    const at = Number(ts.at) > 0 ? Number(ts.at) : 0;
    const gcObj = ts.gc && typeof ts.gc === 'object' ? ts.gc : {};
    const gc = Object.keys(gcObj).filter((k) => gcObj[k] && typeof gcObj[k] === 'object')
      .map((k) => {
        const g = gcObj[k];
        const any = num(g.disTot) + num(g.disRest) + num(g.lodTot) + num(g.lodRest) > 0;
        return { gc: String(k), any, dis: num(g.disRest), lod: num(g.lodRest), sum: num(g.disRest) + num(g.lodRest) };
      })
      .filter((g) => g.any)
      .sort((a, b) => (Number(a.gc) || 0) - (Number(b.gc) || 0) || (a.gc < b.gc ? -1 : 1))
      .map(({ gc: k, dis: d, lod: l, sum }) => ({ gc: k, dis: d, lod: l, sum }));
    return {
      src: 'PCTC',
      label: berthLabel('PCTC', ts.berth || info.berth),
      at,
      atText: at ? (kstParts(at).ymd === kstParts(now).ymd ? kstParts(at).hm : kstParts(at).ymd.slice(5) + ' ' + kstParts(at).hm) : '',   // 어제 받은 자료가 오늘 것처럼 보이지 않게 날짜가 다르면 월-일을 붙인다
      startText: clockText(ts.atw || info.workStartAt, now),
      etdText: clockText(ts.etd, now),
      stale: !!(at && rest > 0 && now - at > STALE_MS),
      overPlan: false,
      planDis: num(info.planDis), planLod: num(info.planLod),
      total, done, rest, pct: Math.round((done * 100) / total),
      rows: [
        { key: 'tot', label: '작업량', dis: dis.tot, lod: lod.tot, sum: total },
        { key: 'done', label: '완료량', dis: dis.done, lod: lod.done, sum: done },
        { key: 'rest', label: '잔여량', dis: dis.rest, lod: lod.rest, sum: rest },
      ],
      gc, qc: [], qcSum: null,
    };
  }

  // ── 동방 — 본선 작업 현황(QC별)
  const qw = info.qcWork;
  if (qw && typeof qw === 'object') {
    const qc = Object.keys(qw).filter((k) => qw[k] && typeof qw[k] === 'object')
      .map((k) => {
        const q = qw[k];
        const disDone = num(q.disDone), disRest = num(q.disRest), lodDone = num(q.lodDone), lodRest = num(q.lodRest);
        return { qc: String(q.qc || k), total: num(q.total) || disDone + disRest + lodDone + lodRest, disDone, lodDone, disRest, lodRest };
      })
      .sort((a, b) => (a.qc < b.qc ? -1 : a.qc > b.qc ? 1 : 0));
    if (!qc.length) return null;
    const qcSum = qc.reduce((a, q) => ({ total: a.total + q.total, disDone: a.disDone + q.disDone, lodDone: a.lodDone + q.lodDone, disRest: a.disRest + q.disRest, lodRest: a.lodRest + q.lodRest }),
      { total: 0, disDone: 0, lodDone: 0, disRest: 0, lodRest: 0 });
    const total = qcSum.disDone + qcSum.disRest + qcSum.lodDone + qcSum.lodRest;
    if (!(total > 0)) return null;
    const done = qcSum.disDone + qcSum.lodDone, rest = qcSum.disRest + qcSum.lodRest;
    const planDis = num(info.planDis), planLod = num(info.planLod);
    const overPlan = (planDis > 0 && qcSum.disDone + qcSum.disRest > planDis * OVER_PLAN) || (planLod > 0 && qcSum.lodDone + qcSum.lodRest > planLod * OVER_PLAN);
    return {
      src: 'PNCT',
      label: berthLabel('PNCT', info.berth),
      at: 0, atText: '',
      startText: clockText(info.workStartAt, now),
      etdText: '',
      stale: false,
      overPlan,
      planDis, planLod,
      total, done, rest, pct: Math.round((done * 100) / total),
      rows: [], gc: [], qc, qcSum,
    };
  }
  return null;
}

//  ★ 4.05 — 항차 목록 카드에 «터미널이 말한 완료·잔여»를 참고 숫자로 보인다(검수사 2026-10-05 «1개 단위로 실시간으로 맞추긴 힘듭니다. 하지만 어느정도는 맞아야 한다»).
//    컨별 터미널 실적은 받지 않으므로(MailPilot 2.40-01 · 검수사 2026-10-03) 카드의 완료 수는 검수사가 누른 것뿐이다 — 그 옆에 같은 표(termBoardOf)의 양하·적하 합계를 따로 보인다.
//    완료 기록·남음 계산·미르는 건드리지 않는다. 숫자는 termBoardOf 가 만든 그대로(동방 QC 합계 · PCTC 본선작업현황) — 계산이 두 벌이 되지 않게 여기서 한 번만 꺼낸다.
//    돌려주는 값: null 또는 { src, dis:{done,rest}, lod:{done,rest}, overPlan, at }
export function termAggOf(info, now = Date.now()) {
  const b = termBoardOf(info, now);
  if (!b) return null;
  if (b.src === 'PCTC') {
    const d = b.rows.find((r) => r.key === 'done'), r = b.rows.find((x) => x.key === 'rest');
    if (!d || !r) return null;
    return { src: 'PCTC', dis: { done: d.dis, rest: r.dis }, lod: { done: d.lod, rest: r.lod }, overPlan: false, at: b.at };
  }
  const q = b.qcSum;
  if (!q) return null;
  return { src: 'PNCT', dis: { done: q.disDone, rest: q.disRest }, lod: { done: q.lodDone, rest: q.lodRest }, overPlan: !!b.overPlan, at: 0 };
}

// ── 화면 그리기 — 수석 보드(React)와 콘앱(순수 HTML)이 **같은 문자열**을 쓴다(그림이 두 벌이 되지 않게). 색은 부모 글자색을 따른다(콘앱 밝기 4단계·수석 어두운 판 모두).
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cell = (n) => (n === 0 ? '<td class="tbx-z">0</td>' : '<td>' + n + '</td>');

export const TERM_BOARD_CSS = `
.tbx{display:flex;flex-direction:column;gap:6px;min-width:0;border:1px solid rgba(128,140,155,.38);border-radius:8px;padding:8px;font-size:12px;line-height:1.45;text-align:left;font-weight:400;}
.tbx *{box-sizing:border-box;}
.tbx-top{display:flex;flex-wrap:wrap;gap:4px 6px;align-items:center;}
.tbx-top b{font-size:13px;}
.tbx-tag{font-size:10.5px;padding:1px 6px;border-radius:4px;background:rgba(128,140,155,.28);}
.tbx-tag.tbx-warn{background:transparent;border:1px solid #d99a2b;color:#d99a2b;}
.tbx-meta,.tbx-note{font-size:11px;opacity:.72;}
.tbx-bar{height:6px;border-radius:3px;background:rgba(128,140,155,.3);overflow:hidden;}
.tbx-bar i{display:block;height:100%;background:#2fb3d9;}
.tbx-barline{display:flex;justify-content:space-between;font-size:11px;opacity:.78;font-variant-numeric:tabular-nums;}
.tbx-tw{overflow-x:auto;touch-action:pan-x pan-y;}
.tbx table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums;font-size:12px;}
.tbx th,.tbx td{padding:3px 6px;text-align:right;white-space:nowrap;border-bottom:1px solid rgba(128,140,155,.28);}
.tbx th{font-weight:500;opacity:.72;}
.tbx th:first-child,.tbx td:first-child{text-align:left;}
.tbx tr.tbx-sum td{font-weight:700;border-bottom:0;}
.tbx td.tbx-z{opacity:.5;}
`;

//  한 번만 <style> 로 넣는다(수석 보드는 컴포넌트가, 콘앱은 그리기 직전에 부른다).
export function ensureTermBoardCss(doc) {
  const d = doc || (typeof document !== 'undefined' ? document : null);
  if (!d || !d.head || d.getElementById('tbxCss')) return;
  const st = d.createElement('style');
  st.id = 'tbxCss';
  st.textContent = TERM_BOARD_CSS;
  d.head.appendChild(st);
}

//  표 HTML. 보일 것이 없으면 '' (호출부는 그때 종전 화면을 그대로 둔다).
export function termBoardHtml(info, now = Date.now()) {
  const b = termBoardOf(info, now);
  if (!b) return '';
  const tags = '<span class="tbx-tag">' + esc(b.label) + '</span><span class="tbx-tag">검수원 입력 아님</span>'
    + (b.stale ? '<span class="tbx-tag tbx-warn">낡은 자료</span>' : '')
    + (b.overPlan ? '<span class="tbx-tag tbx-warn">계획보다 큼, 타 항 하역분 포함 가능</span>' : '');
  const top = '<div class="tbx-top"><b>터미널 본선 현황</b>' + tags + '</div>';

  if (b.src === 'PCTC') {
    const meta = [b.atText ? b.atText + ' 기준' : '', b.startText ? '작업시작 ' + b.startText : '', b.etdText ? '출항예정 ' + b.etdText : ''].filter(Boolean).join(' · ');
    const rowsHtml = b.rows.map((r) => '<tr' + (r.key === 'rest' ? ' class="tbx-sum"' : '') + '><td>' + r.label + '</td>' + cell(r.dis) + cell(r.lod) + cell(r.sum) + '</tr>').join('');
    const gcHtml = b.gc.length
      ? '<div class="tbx-tw"><table><tr><th>GC별 잔여</th><th>양하</th><th>적하</th><th>합계</th></tr>'
        + b.gc.map((g) => '<tr><td>GC' + esc(g.gc) + '</td>' + cell(g.dis) + cell(g.lod) + cell(g.sum) + '</tr>').join('') + '</table></div>'
      : '';
    return '<div class="tbx" data-src="PCTC">' + top
      + (meta ? '<div class="tbx-meta">' + esc(meta) + '</div>' : '')
      + '<div><div class="tbx-bar"><i style="width:' + b.pct + '%"></i></div><div class="tbx-barline"><span>완료 ' + b.done + ' / ' + b.total + '</span><span>' + b.pct + '%</span></div></div>'
      + '<div class="tbx-tw"><table><tr><th></th><th>양하</th><th>적하</th><th>합계</th></tr>' + rowsHtml + '</table></div>'
      + gcHtml + '</div>';
  }

  const meta = [b.startText ? '작업시작 ' + b.startText : '', '받은 시각 표시 없음'].filter(Boolean).join(' · ');
  const qcHtml = b.qc.map((q) => '<tr><td>' + esc(q.qc) + '</td><td>' + q.total + '</td>' + cell(q.disDone) + cell(q.lodDone) + cell(q.disRest) + cell(q.lodRest) + '</tr>').join('');
  const s = b.qcSum;
  const plan = b.planDis > 0 || b.planLod > 0 ? '<div class="tbx-note">평택 계획 양하 ' + b.planDis + ' · 적하 ' + b.planLod + '</div>' : '';
  return '<div class="tbx" data-src="PNCT">' + top
    + '<div class="tbx-meta">' + esc(meta) + '</div>'
    + '<div class="tbx-tw"><table><tr><th>QC</th><th>총작업량</th><th>완료 양하</th><th>완료 적하</th><th>잔여 양하</th><th>잔여 적하</th></tr>' + qcHtml
    + '<tr class="tbx-sum"><td>합계</td><td>' + s.total + '</td>' + cell(s.disDone) + cell(s.lodDone) + cell(s.disRest) + cell(s.lodRest) + '</tr></table></div>'
    + plan + '</div>';
}
