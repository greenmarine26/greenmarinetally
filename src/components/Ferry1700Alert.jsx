// 카페리 17:00 주간 작업보고 알림 창 — 갱별 규격표·음성, 검수원은 카톡 보고 · 수석은 작업 중 카페리 모아 보기 (3.63)
//   검수사 2026-09-27 «그 보고를 자동으로 음성과 함께 시간이 도래하면 화면에 띄워줄수 있나요. 대상은 TNJP OBWH RZOR 3척입니다» ·
//   «두군데 검수앱 수석대쉬보드에 뜨게 해주고 검수앱 작업중인 검수원에 카톡보고 버튼추가» · «갱별보고여야함» · «갱별 규격표까지».
//   계산은 전부 utils 한 벌(ferry1700Due · buildGangShiftReport) — 여기는 그림·음성·하루 한 번만 맡는다.
//   ⚠ 앱이 켜져 있어야 뜬다(푸시 아님). 17:00~17:29 에 앱을 열면 그때 뜬다. 기기마다 하루 한 번 — 닫으면 그날은 다시 안 뜬다.
//   ★ 3.64 보관 — 검수사 «놓쳐서 작업 보고를 못했을떄 17시 기준으로 갱별 작업 보고 자료가 남아 있어야 합니다. 사라지는 시점은 작업 완료 되면 같이 사라지면 됩니다» ·
//     «익일까지 작업하게 되면 전날 주간과 야간작업 자료 즉 두건을 보관해야 합니다». 마감(17:00 · 05:30)이 지난 보고는 «📋 보고 보관 N» 단추로 남고
//     (utils.ferryReportCuts — 작업 완료면 빈 목록), 작업 보고 창의 주야간 화면에서도 연다(window 이벤트 'ferry1700Open').
//     마감 5분 안에 작업 중인 폰이 **그 보고 자체**(갱별 표·호기 표)를 항차 정보 info.shiftReports/{YYYY-MM-DD_주간|야간} 에 한 번 적는다 — 누가 언제 열어도
//     그 마감에 본 숫자 그대로다(2차 시뮬 지적: 다시 세면 17:00 뒤 실적이 갱 나눔을 바꿨다 — 2739E 대수만→규격표, 2747E 잔여 98/79→103/74).
//     적힌 보고가 없을 때만 지금 자료로 다시 세고 그 사실을 밝힌다.
//   ★ 5.21 — 검수사 2026-11-22 «작업보고 5분전 부터 호기별로 보여줬으면 합니다» · «5분전부터 실시간으로 보여주다가 정각에 멈추면 됩니다» ·
//     «멈춘상태에서 그대로 보고 할건지 수정보고 할건지를 정하고 수정보고한다고 하면 각 셀에 수정기능을 넣어주면 됩니다 합산은 자동계산으로» · «제가 만든표에 실시간으로 보여주면 됩니다».
//     창은 마감 5분 전(16:55 · 05:25)에 뜨고(utils.ferryShiftDue) 정각에 그 값에서 멈춘다. 멈춘 뒤 [그대로 보고]·[수정 보고]. 표는 검수사 양식(20·40·45·T × F·E·T).
//     고친 칸은 info.shiftReports/{열쇠}/edit 에 따로 적는다(앱이 센 보고는 그대로) — 화면·카톡·보관은 utils.applyShiftEdit 한 벌로 얹어 본다.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { buildGangShiftReport, ferryShiftDue, ferryReportCuts, crewCraneNo, getEquipNumber, applyShiftEdit, shiftSideCells, shiftCellsTotal, shiftSideShown } from '../utils.js';
import { canWorkNow } from '../workChoice.js';   // 3.64: 조회만은 항차 정보에 쓰지 않는다
import { fbUpdateVoyageInfo } from '../firebase.js';
import { ymdKST } from '../meToday.js';   // KST 날짜 한 벌(workChoice 하루 만료와 같은 것)
import { getShipBayDictData } from '../shipStructure.js';
import { buildBayPagesFromSummary } from '../cargoPlanCore.js';
import { shareText, buildFerry1700Message } from '../kakaoShare.js';
import { speak } from '../voice.js';

//  기록 열쇠는 창 종류(수석·검수원)를 가리지 않는다 — 작업 중인 수석이 대시보드에서 닫은 배를 다른 화면이 또 띄우고 또 읽지 않게(감사 지적).
const _key = (kind) => `gm_f1700_${kind}_${ymdKST()}`;
//  마감 직후의 호기 표 — 적힌 보고가 없을 때 다시 세는 값을 마감 시각에 맞게. ① 적힌 보고의 호기 표(info.shiftReports/{열쇠}.qcWork)
//    ② 이 기기가 마감 직후 굳힌 것 ③ 없으면 null(지금 값 + 섞인 대수 안내).
//  4.77: 저장하는 호기 표(qcWork)가 3호기 실 LOLO 몫으로 보정한 파생값이면(termDisDone 이 붙음) 보고에 qcWorkFix:true 를 남겨 터미널 원값이 아님을 표시한다.
const _qcFixed = (qw) => !!qw && typeof qw === 'object' && Object.values(qw).some((q) => q && q.termDisDone != null);
const SNAP_WITHIN_MS = 3 * 60000;
//  적는 때 — 마감 +3분 ~ +8분. 터미널 실적 시각은 분 단위로 내려 오고 그 분의 실적은 1분쯤 뒤에 들어온다 — 마감 직후에 적으면
//    마지막 분이 빠진 값이 모든 기기에 굳는다(감사 실측 RZOR R104E 17:00:05 에 적으면 양하 99·77, 참값 102·74). 그 전에는 지금 자료로 센다.
const WRITE_FROM_MS = 3 * 60000;
const WRITE_UNTIL_MS = 8 * 60000;
//  적어 둔 보고의 모양 검사 — 맞지 않으면(옛 판·손상·손으로 고침) 쓰지 않고 다시 센다(창 하나 때문에 앱 전체가 깨지지 않게 — 감사 지적).
const _num = (x) => typeof x === 'number' && Number.isFinite(x);
function _sideOk(r) {
  if (!r || typeof r !== 'object') return false;
  if (r.none || r.excluded) return true;
  if (!r.total || !_num(r.total.total) || !_num(r.doneTotal) || !_num(r.remainTotal) || !r.basis) return false;
  if (r.countsOnly) return true;
  const t = r.tbl;
  return !!(t && ['s20', 's40', 's45'].every((k) => t[k] && _num(t[k].F) && _num(t[k].E)) && _num(r.total.F) && _num(r.total.E));
}
export function ferryRepShapeOk(rep) {
  if (!rep || typeof rep !== 'object' || !_num(rep.cutMs) || !rep.ship || !_sideOk(rep.ship.discharge) || !_sideOk(rep.ship.loading)) return false;
  if (rep.gangs != null && !Array.isArray(rep.gangs)) return false;
  return (rep.gangs || []).every((g) => g && _num(g.no) && _sideOk(g.discharge) && _sideOk(g.loading));
}
//  적어 둔 보고 — 마감 시각까지 맞고 모양이 맞아야 쓴다(열쇠만 같고 다른 마감이면 버린다). 빠진 칸은 채워서 돌려준다(RTDB 는 빈 배열·0 아닌 null 을 지운다).
function _storedOf(v, cutKey, cutMs) {
  const x = v && v.info && v.info.shiftReports && cutKey && v.info.shiftReports[cutKey];
  if (!x || !x.rep || Number(x.rep.cutMs) !== Number(cutMs) || !ferryRepShapeOk(x.rep)) return null;
  const u = x.rep.unknown || {};
  return { ...x, rep: { ...x.rep, gangs: x.rep.gangs || [], why: x.rep.why || '', postCut: _num(x.rep.postCut) ? x.rep.postCut : 0,
    unknown: { discharge: _num(u.discharge) ? u.discharge : 0, loading: _num(u.loading) ? u.loading : 0 } } };
}
function _editOf(v, cutKey) {
  const e = v && v.info && v.info.shiftReports && cutKey && v.info.shiftReports[cutKey] && v.info.shiftReports[cutKey].edit;
  return e && typeof e === 'object' && e.sides && typeof e.sides === 'object' ? e : null;
}
function _qcSnapOf(key, v, now, cutMs, cutKey) {
  const k = `gm_f1700_qc_${cutKey || ymdKST()}_${key}`;
  try {
    const raw = localStorage.getItem(k);
    if (raw) return JSON.parse(raw);
    const qw = v && v.info && v.info.qcWork;
    if (qw && now >= cutMs && now - cutMs <= SNAP_WITHIN_MS) { const sn = { at: now, qcWork: qw, ...(_qcFixed(qw) ? { qcWorkFix: true } : {}) }; localStorage.setItem(k, JSON.stringify(sn)); return sn; }
  } catch (e) { console.warn('[3.63] 호기 표 굳히기 실패 — 지금 값으로 냅니다', e); }
  return null;
}
function _readSet(k) {
  try { return new Set(JSON.parse(localStorage.getItem(k) || '[]')); }
  catch (e) { console.warn('[3.63] 17시 보고 기록 읽기 실패 — 처음 보는 것으로 칩니다', e); return new Set(); }
}
function _addAll(k, vals) {
  try { const s = _readSet(k); vals.forEach((v) => s.add(v)); localStorage.setItem(k, JSON.stringify([...s])); }
  catch (e) { console.warn('[3.63] 17시 보고 기록 쓰기 실패 — 이 기기에서 다시 뜰 수 있습니다', e); }
}

//  ★ 3.66 — 한 마감의 보고 한 건(한 벌) — 17시 창·보고 보관·주야간 작업보고 화면이 같이 쓴다(2차 감사 — 주야간 화면이 마감 뒤에 지금 자료로 따로 세면
//    같은 화면 안에서 보관 창과 갱 숫자가 갈린다). 적어 둔 보고(info.shiftReports)가 있으면 그것(모든 기기 같은 숫자), 없으면 마감 시각으로 다시 센다
//    (recomputed — 마감 +8분이 지났으면 «다시 센 값»이라고 밝힌다). 종전 Ferry1700AlertInner.repOf 본문을 그대로 옮겼다.
export function ferryCutItem(k, v, cut, now) {
  const st = _storedOf(v, cut.key, cut.cutMs);
  const rp = st ? st.rep : buildGangShiftReport(v, ferryPagesOf(v, k), now, { shift: cut.shift, cutMs: cut.cutMs, qcSnap: _qcSnapOf(k, v, now, cut.cutMs, cut.key) });
  const ed = _editOf(v, cut.key);   // 5.21: 수정 보고(고친 칸) — 앱이 센 보고(base) 위에 얹는다
  return { key: k, cutKey: cut.key, cutMs: cut.cutMs, info: (v && v.info) || {}, rep: ed ? applyShiftEdit(rp, ed) : rp, base: rp, edit: ed, stored: !!st, storedAt: st ? st.at : 0, recomputed: !st && now - cut.cutMs > WRITE_UNTIL_MS };
}
//  그 배의 «장(해치)» 목록 — 보드(ChiefDashboard boardPages)와 같은 길(getShipBayDictData → buildBayPagesFromSummary).
export function ferryPagesOf(voyage, key) {
  try {
    const i = (voyage && voyage.info) || {};
    const d = getShipBayDictData(i.imo, i.vsl, { vslCode: String(key || '').split('_')[0], callsign: i.callsign || '', vslFull: i.vslFull || i.vsl || '' });
    return d && d.bayDef && d.bayDef.baysSummary ? (buildBayPagesFromSummary(d.bayDef) || null) : null;
  } catch (e) { console.warn('[3.63] 베이사전 장 목록 실패 — 해치 묶기는 폴백으로 갑니다', e); return null; }
}
const _voyLabel = (info) => {
  const d = info && info.voy_d, l = info && info.voy_l;
  return d && l && d !== l ? `${d}/${l}` : (d || l || (info && info.voy) || '');
};
const _side = (label, r) => {
  if (!r || r.none) return '';
  if (r.excluded) return `${label}${label === '선적' ? '은' : '는'} 작업 완료`;
  return `${label} ${r.basis} ${r.total.total}대`;
};
const _hm = (ms) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
//  음성 — 검수원은 내 갱만, 수석은 배마다 갱 전부. 숫자는 세 자리 이하라 그대로 읽힌다.
export function ferry1700Speech(items, myNo = 0, shift = '주간') {
  const parts = [];
  for (const { vsl, rep } of items) {
    const gangs = (rep.gangs || []).filter((g) => !myNo || g.no === myNo);
    if (!gangs.length) { parts.push(`${vsl} ${[_side('양하', rep.ship.discharge), _side('선적', rep.ship.loading)].filter(Boolean).join(', ')}`); continue; }
    const gl = gangs.map((g) => { const t = [_side('양하', g.discharge), _side('선적', g.loading)].filter(Boolean).join(', '); return t ? `${g.no}호기 ${t}` : ''; }).filter(Boolean);
    if (gl.length) parts.push(`${vsl} ${gl.join('. ')}${(!rep.perGang || rep.doneUnsure) && rep.postCut > 0 ? `. 호기 대수는 ${_hm(rep.qcAt)} 터미널 값` : ''}`);
    else parts.push(`${vsl} ${[_side('양하', rep.ship.discharge), _side('선적', rep.ship.loading)].filter(Boolean).join(', ') || '보고할 것 없음'}`);
  }
  return `${shift === '야간' ? '야간' : '주간'} 작업보고 시간입니다. ${parts.join('. ')}입니다.`;
}

//  5.21: 표는 검수사 양식 — 줄 20·40·45·T, 칸 F·E·T. cells 가 오면 수정 중(칸마다 입력 · 합계는 자동).
const _SZ = [['20', 's20'], ['40', 's40'], ['45', 's45']];
//  ★ 5.21 — 보고할 것이 없는 쪽은 그리지 않는다. 검수사 2026-11-22 22:30 «양하나 선적중 작업량이 남아있지 않거나 작업이 시작되지 않은 자료는 없어도 됩니다 …
//    선적이 모두 0이면 없어도 된다 … 양하가 완료된 갱은 양하는 없어도 되고 선적만 보여주면 됩니다». 끝난 쪽(보고 제외) · 아직 시작 안 한 쪽(0대)이 그것 — 화면·카톡 한 벌(shiftSideShown).
function SideTable({ label, rep, cells = null, onCell = null }) {
  if (!rep || rep.none) return null;
  const editing = !!cells && !!onCell && !rep.excluded;
  if (!editing && !shiftSideShown(rep)) return null;
  const base = editing ? cells : (rep.tbl || (rep.est && rep.est.tbl) || null);
  const tot = base ? shiftCellsTotal(base) : null;
  const inp = (k, fe) => (
    <input type="number" inputMode="numeric" min="0" max="9999" value={String(cells[k][fe])} data-cell={`${k}${fe}`}
      onFocus={(e) => e.target.select()} onChange={(e) => onCell(k, fe, e.target.value)}
      className="w-12 py-0.5 text-center rounded bg-ink-800 border border-teal-500 text-dim-100 tabular-nums" />
  );
  return (
    <div className="bg-ink-900 border border-line rounded-pill p-2" data-side={label}>
      <div className="text-xs font-bold text-dim-100 mb-1 flex items-center justify-between">
        <span>{label}{rep.edited && !editing ? ' ✏' : ''}</span>
        {!rep.excluded && <span className="text-2xs text-teal-300">{rep.basis} 기준 (완료 {rep.doneTotal} · 잔여 {rep.remainTotal})</span>}
      </div>
      {rep.excluded ? (
        <div className="text-xxs text-dim-400 text-center py-1">{rep.reason}</div>
      ) : !base ? (
        <div className="text-center py-1"><span className="text-lg font-bold text-dim-100 tabular-nums">{rep.total.total}</span>
          <span className="text-2xs text-dim-400"> 대 · 터미널 호기 집계(규격표 없음)</span></div>
      ) : (
        <table className="w-full text-xxs tabular-nums">
          <thead><tr className="text-dim-300 border-b border-line"><th className="text-left py-1"></th><th>F</th><th>E</th><th>T</th></tr></thead>
          <tbody className="text-dim-100">
            {_SZ.map(([nm, k]) => (
              <tr key={nm} className="border-b border-line">
                <td className="text-left py-1 text-dim-200">{nm}</td>
                <td className="text-center">{editing ? inp(k, 'F') : base[k].F}</td><td className="text-center">{editing ? inp(k, 'E') : base[k].E}</td><td className="text-center font-bold">{Number(base[k].F) + Number(base[k].E)}</td>
              </tr>
            ))}
            <tr className="text-teal-300 font-bold">
              <td className="text-left py-1">T</td>
              <td className="text-center">{tot.F}</td><td className="text-center">{tot.E}</td><td className="text-center">{tot.total}</td>
            </tr>
          </tbody>
        </table>
      )}
      {!rep.excluded && base && editing && tot.total !== rep.total.total && <div className="text-2xs text-amber-200/80 mt-1">앱이 센 {rep.basis} {rep.total.total}대 · 고친 표 {tot.total}대</div>}
      {!rep.excluded && !editing && rep.edited && <div className="text-2xs text-amber-200/80 mt-1">✏ 수정 보고 값{rep.editBy ? ` — ${rep.editBy}` : ''}{rep.editAt ? ` ${_hm(rep.editAt)}` : ''} · 앱이 센 값 {rep.appTotal}대</div>}
      {!rep.excluded && !editing && !rep.edited && rep.countsOnly && rep.est && <div className="text-2xs text-amber-200/80 mt-1">⚠ 호기를 따라 붙인 표가 터미널 호기 집계({rep.total.total}대)와 맞지 않습니다 — 표 {tot.total}대. 확인하고 틀리면 수정 보고해 주세요.</div>}
    </div>
  );
}

function GangCard({ g, mine, qcLabel = '', cells = null, onCell = null }) {
  const q = g.qcNow || {};
  const n = (x) => (_num(x) ? x : '-');
  return (
    <div className={`rounded-pill p-2 space-y-1.5 border ${mine ? 'border-teal-400 bg-teal-950/30' : 'border-line bg-ink-850'}`} data-gang={g.no}>
      <div className="text-sm font-bold text-dim-100 flex items-center gap-2">
        <span>🏗 {g.no}호기</span>
        {mine && <span className="text-2xs px-1.5 py-0.5 rounded bg-teal-700 text-white">내 갱</span>}
        <span className="ml-auto text-2xs font-normal text-dim-400">터미널{qcLabel} {g.qc || ''} 양 {n(q.disDone)}/{n(q.disRest)} · 선 {n(q.lodDone)}/{n(q.lodRest)}</span>
      </div>
      {!cells && !shiftSideShown(g.discharge) && !shiftSideShown(g.loading) && <div className="text-xxs text-dim-400 text-center py-1" data-gang-empty="1">보고할 것 없음</div>}
      <SideTable label="양하" rep={g.discharge} cells={cells && cells.discharge} onCell={onCell && ((k, fe, v) => onCell('discharge', k, fe, v))} />
      <SideTable label="선적" rep={g.loading} cells={cells && cells.loading} onCell={onCell && ((k, fe, v) => onCell('loading', k, fe, v))} />
    </div>
  );
}

export function ferryCutLabel(rep) {
  const d = new Date(rep.shift === '야간' ? rep.cutMs - 86400000 : rep.cutMs);
  const md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return rep.shift === '야간' ? `${md} 야간 · 익일 05:30 마감` : `${md} 주간 · 17:00 마감`;
}
//  3.66: export — 주야간 작업보고 화면(WorkReportModal)도 같은 호기 카드를 그린다. shipAlways — 갱으로 나뉘어도 배 전체 합계를 아래에 같이(검수사 «갱별 + 배 전체 합계»).
export function VoyageBlock({ item, myNo, onKakao = null, shipAlways = false, onEdit = null, editing = null, onCell = null, onSend = null, onCancel = null, busy = false, err = '' }) {
  const { info, rep } = item;
  const gangs = (rep.gangs || []).slice().sort((a, b) => (a.no === myNo ? -1 : b.no === myNo ? 1 : a.no - b.no));
  const es = editing ? editing.sides : null;   // 5.21: 수정 중인 칸 — {g<호기>|ship: {discharge, loading}}
  return (
    <div className="space-y-2" data-f1700={item.key}>
      <div className="text-sm font-bold text-amber-300 flex items-center gap-2 flex-wrap">
        <span>{info.vsl} {_voyLabel(info)}</span>
        {item.archive && <span className="text-2xs font-normal px-1.5 py-0.5 rounded bg-ink-800 border border-line text-dim-200">{ferryCutLabel(rep)}</span>}
      </div>
      {rep.edit && !editing && [rep.ship.discharge, rep.ship.loading].concat(...(rep.gangs || []).map((g) => [g.discharge, g.loading])).some((r) => r && r.edited) && <div className="text-2xs text-amber-200/80" data-f1700-edited="1">✏ 수정 보고한 값입니다{rep.edit.by ? ` — ${rep.edit.by}` : ''}{rep.edit.at ? ` ${_hm(rep.edit.at)}` : ''}. ✏ 표시가 고친 표입니다.</div>}
      {editing && <div className="text-2xs text-teal-300">칸을 눌러 숫자를 고치세요. 합계(T)는 자동으로 다시 더합니다.</div>}
      {item.recomputed && <div className="text-2xs text-amber-200/80">⚠ 마감 때 적어 둔 보고가 없어 지금 자료로 다시 센 값입니다 — 배 전체는 같고 갱 숫자는 조금 다를 수 있습니다.</div>}
      {rep.why && <div className="text-2xs text-amber-200/80">⚠ {rep.why}</div>}
      {rep.perGang && rep.side && <div className="text-2xs text-dim-400">{rep.side === 'starboard' ? '우현' : '좌현'} 접안 기준 · 선수 {rep.bow}호기 — 방향이 다르면 수석에게 알려 주세요.</div>}
      {rep.postCut > 0 && (!rep.perGang || rep.doneUnsure) && <div className="text-2xs text-dim-400">터미널 호기 집계는 {_hm(rep.qcAt)} 값이라 {rep.shift === '야간' ? '05:30' : '17:00'} 뒤 {rep.postCut}대가 섞여 있습니다.</div>}
      {gangs.map((g) => <GangCard key={g.no} g={g} mine={!!myNo && g.no === myNo} cells={es && es['g' + g.no]} onCell={es && es['g' + g.no] && onCell ? ((m, k, fe, v) => onCell('g' + g.no, m, k, fe, v)) : null} qcLabel={rep.doneUnsure && _num(rep.qcAt) ? `(${_hm(rep.qcAt)})` : (item.stored ? `(${_hm(item.storedAt)})` : (item.recomputed && rep.perGang ? '(지금)' : ''))} />)}
      {(shipAlways || !rep.perGang || !gangs.length || rep.shipTable) && (   /* 3.66-02: 대수만 나가는 갱이 있으면 배 전체 규격표를 같이 */
        <div className="space-y-1.5" data-f1700-ship="1">
          <div className="text-2xs text-dim-300">{rep.perGang && gangs.length ? '배 전체 합계' : '배 전체'}</div>
          <SideTable label="양하" rep={rep.ship.discharge} cells={es && es.ship && es.ship.discharge} onCell={es && es.ship && onCell ? ((k, fe, v) => onCell('ship', 'discharge', k, fe, v)) : null} />
          <SideTable label="선적" rep={rep.ship.loading} cells={es && es.ship && es.ship.loading} onCell={es && es.ship && onCell ? ((k, fe, v) => onCell('ship', 'loading', k, fe, v)) : null} />
        </div>
      )}
      {rep.perGang && (rep.unknown.discharge + rep.unknown.loading) > 0 && (
        <div className="text-2xs text-dim-400">자리를 몰라 갱에 못 넣은 컨 양하 {rep.unknown.discharge} · 선적 {rep.unknown.loading}대(배 전체 합에는 들어 있습니다).</div>
      )}
      {err && <div className="text-xs text-red-300" data-f1700-err="1">⚠ {err}</div>}
      {editing ? (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onSend} disabled={busy} data-f1700-send="1" className="py-2 rounded-pill font-bold text-sm bg-yellow-400 text-black disabled:opacity-50">{busy ? '저장 중…' : '✏ 수정 보고 보내기'}</button>
          <button onClick={onCancel} disabled={busy} className="py-2 rounded-pill font-bold text-sm bg-ink-800 border border-line text-dim-100">수정 취소</button>
        </div>
      ) : (onKakao || onEdit) ? (
        <div className={onKakao && onEdit ? 'grid grid-cols-2 gap-2' : ''}>
          {onKakao && <button onClick={onKakao} data-f1700-asis="1" className="w-full py-2 rounded-pill font-bold text-sm bg-yellow-400 text-black">💬 그대로 카톡 보고{item.mineIn ? ` (${myNo}호기)` : ''}</button>}
          {onEdit && <button onClick={onEdit} data-f1700-edit="1" className="w-full py-2 rounded-pill font-bold text-sm bg-ink-800 border border-teal-500 text-teal-200">✏ 수정 보고</button>}
        </div>
      ) : null}
    </div>
  );
}

//  audience 'chief' — 작업 중인 대상 카페리 전부(보기만) · 'inspector' — voyageKey 한 척 + 카톡 보고(내 갱).
//  창 하나가 깨져도 앱 전체가 오류 화면이 되지 않게 이 창만 감싼다(감사 지적 — App 최상위에 붙어 있다).
class Ferry1700Boundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { console.warn('[3.64] 17시 보고 창 오류 — 이 창만 숨깁니다', err); }
  render() { return this.state.err ? null : this.props.children; }
}
export default function Ferry1700Alert(props) {
  return <Ferry1700Boundary><Ferry1700AlertInner {...props} /></Ferry1700Boundary>;
}
function Ferry1700AlertInner({ voyages, audience = 'inspector', voyageKey = '', nowOverride = 0, inspector = '' }) {
  const [now, setNow] = useState(() => nowOverride || Date.now());
  const [, setClosedTick] = useState(0);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [edit, setEdit] = useState(null);     // 5.21: 수정 중 — { id: «항차|마감 열쇠», sides }
  const [editBusy, setEditBusy] = useState(false);
  const [editErr, setEditErr] = useState('');
  const closedRef = useRef(new Set());   // 기록 쓰기가 막힌 기기에서도 이 화면에서는 다시 안 뜨게
  const wroteRef = useRef(new Set());    // 이 기기가 이미 적은(또는 적으려 한) 호기 표 열쇠
  const [equip, setEquip] = useState(() => getEquipNumber());
  useEffect(() => {
    if (nowOverride) return undefined;
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 15000);
    const onVis = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVis);
    const onEq = () => setEquip(getEquipNumber());
    window.addEventListener('equipChanged', onEq);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('equipChanged', onEq); };
  }, [nowOverride]);
  //  작업 보고 창의 주야간 화면이 «보관한 보고 열기»를 누르면 연다(창이 두 벌이 되지 않게 이 한 곳에서만 그린다).
  useEffect(() => {
    const onOpen = (e) => setArchiveOpen((e && e.detail && e.detail.voyageKey) || true);   // 항차를 주면 그 배만(작업 보고 창이 연 배)
    window.addEventListener('ferry1700Open', onOpen);
    return () => window.removeEventListener('ferry1700Open', onOpen);
  }, []);
  const minute = Math.floor(now / 60000);
  //  지난 기록은 치운다(열쇠가 날마다 쌓이지 않게 — 재감사 권장). 닫음·읽음은 오늘 것만, 호기 표는 나흘 넘은 것만.
  useEffect(() => {
    try {
      const today = `_${ymdKST()}`;
      const old = Date.now() - 4 * 86400000;
      Object.keys(localStorage).filter((k) => k.startsWith('gm_f1700_')).forEach((k) => {
        if (k.startsWith('gm_f1700_qc_')) { const m = /(\d{4})-(\d{2})-(\d{2})/.exec(k); if (!m || new Date(+m[1], +m[2] - 1, +m[3]).getTime() < old) localStorage.removeItem(k); }
        else if (!k.includes(today)) localStorage.removeItem(k);
      });
    } catch (e) { console.warn('[3.63] 지난 17시 보고 기록 치우기 실패(무해)', e); }
  }, []);
  const keys = audience === 'chief' ? Object.keys(voyages || {}) : (voyageKey ? [voyageKey] : []);
  const myNo = audience === 'inspector' ? crewCraneNo(equip) : 0;
  //  보고 한 건 — 적어 둔 것이 있으면 그것(모든 기기 같은 숫자), 없으면 지금 자료로 센다(recomputed — 마감 5분 안이면 그것이 곧 마감 값이라 표시 안 함).
  const repOf = (k, v, cut) => {
    const it = ferryCutItem(k, v, cut, now);   // 3.66: 본문을 한 벌로 옮김(같은 값)
    return { ...it, mineIn: !!myNo && audience === 'inspector' && (it.rep.gangs || []).some((g) => g.no === myNo) };
  };
  //  5.21: 마감 5분 전부터 뜬다(utils.ferryShiftDue) — 마감 전(pre)은 실시간, 마감 뒤는 그 마감 값에서 멈춘다. 닫음 기록은 «항차|마감|앞·뒤» 라 5분 전에 닫아도 정각 창은 다시 뜬다.
  const dueCuts = useMemo(() => {
    const o = {};
    for (const k of keys) { const v = voyages && voyages[k]; if (!v) continue; const c = ferryShiftDue(v, now, k); if (c) o[k] = c; }
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voyages, audience, voyageKey, now]);
  const closeIdOf = (k) => `${k}|${dueCuts[k].key}|${dueCuts[k].pre ? 'pre' : 'cut'}`;
  const dismissed = _readSet(_key('closed'));
  const showKeys = Object.keys(dueCuts).sort().filter((k) => !dismissed.has(closeIdOf(k)) && !closedRef.current.has(closeIdOf(k)));
  const items = useMemo(() => showKeys.map((k) => ({ ...repOf(k, voyages[k], dueCuts[k]), pre: dueCuts[k].pre, closeId: closeIdOf(k) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showKeys.map((k) => closeIdOf(k)).join('|'), voyages, minute, myNo]);
  //  보관 — 지난 마감마다 한 건(최신이 위). 작업이 끝난 배는 utils 가 빈 목록을 준다.
  const cutsByKey = useMemo(() => {
    const out = [];
    for (const k of keys) { const v = voyages && voyages[k]; if (!v) continue; for (const c of ferryReportCuts(v, now, k)) out.push({ k, c }); }
    return out.sort((a, b) => b.c.cutMs - a.c.cutMs || (a.k < b.k ? -1 : 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voyages, audience, voyageKey, minute]);
  //  마감 +3~+8분에 작업 중인 폰이 그 보고(갱별 표 + 그 시각 호기 표)를 항차 정보에 한 번 적는다 — 없을 때만(PATCH 한 칸, 조회만은 안 적는다).
  //    창에 보인 것과 같은 계산(repOf)을 그대로 적는다 — 적힌 뒤에는 모든 기기가 이것을 본다.
  useEffect(() => {
    if (!canWorkNow()) return;
    for (const { k, c } of cutsByKey) {
      const v = voyages[k]; const qw = v && v.info && v.info.qcWork;
      if (!qw || now - c.cutMs < WRITE_FROM_MS || now - c.cutMs > WRITE_UNTIL_MS) continue;
      if (_storedOf(v, c.key, c.cutMs) || wroteRef.current.has(`${k}|${c.key}`)) continue;
      wroteRef.current.add(`${k}|${c.key}`);
      let rp = null;
      //  RTDB 에 못 들어가는 null·NaN 은 뺀다
      try { rp = JSON.parse(JSON.stringify(repOf(k, v, c).base, (kk, vv) => (vv === null || (typeof vv === 'number' && !Number.isFinite(vv)) ? undefined : vv))); } catch (e) { console.warn('[3.64] 마감 보고 만들기 실패 — 적지 않습니다', k, c.key, e); continue; }
      //  5.21: 칸마다 적는다 — 통째로 적으면 먼저 들어온 수정 보고(edit)를 지운다.
      fbUpdateVoyageInfo(k, { [`shiftReports/${c.key}/at`]: now, [`shiftReports/${c.key}/qcWork`]: qw, ...(_qcFixed(qw) ? { [`shiftReports/${c.key}/qcWorkFix`]: true } : {}), [`shiftReports/${c.key}/rep`]: rp })
        .catch((e) => console.warn('[3.64] 마감 보고 적기 실패 — 다른 기기가 적거나 나중에 다시 셉니다', k, c.key, e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cutsByKey, voyages, now]);
  const archive = useMemo(() => {
    if (!archiveOpen) return [];
    const list = typeof archiveOpen === 'string'
      ? ferryReportCuts((voyages || {})[archiveOpen], now, archiveOpen).map((c) => ({ k: archiveOpen, c }))
      : cutsByKey;
    return list.filter(({ k }) => voyages && voyages[k]).map(({ k, c }) => ({ ...repOf(k, voyages[k], c), archive: true }));
  },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [archiveOpen, cutsByKey, voyages, minute, myNo]);
  //  음성 — 이 기기에서 오늘 처음 뜬 창(5분 전 · 정각 따로)이 있을 때 한 번.
  const spokeRef = useRef('');
  const shiftNow = items.length ? (items[0].rep.shift === '야간' ? '야간' : '주간') : '주간';
  useEffect(() => {
    if (!items.length) return;
    const sk = _key('spoken');
    const spoken = _readSet(sk);
    const fresh = items.filter((it) => !spoken.has(it.closeId));
    const sig = items.map((it) => it.closeId).join('|');
    if (!fresh.length || spokeRef.current === sig) return;
    spokeRef.current = sig;
    _addAll(sk, fresh.map((it) => it.closeId));
    if (fresh.every((it) => it.pre)) { speak(`${shiftNow} 작업보고 5분 전입니다. 호기별 표를 확인해 주세요.`, { priority: 'high' }); return; }
    const cutFresh = fresh.filter((it) => !it.pre);
    const mn = myNo && cutFresh.some((it) => (it.rep.gangs || []).some((g) => g.no === myNo)) ? myNo : 0;   // 내 호기가 그 배 갱에 없으면 갱 전부를 읽는다
    speak(ferry1700Speech(cutFresh.map((it) => ({ vsl: it.info.vsl || it.key.split('_')[0], rep: it.rep })), mn, shiftNow), { priority: 'high' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, audience, myNo]);
  const kakaoOf = (it) => async () => {
    const msg = buildFerry1700Message({ vsl: it.info.vsl || it.key.split('_')[0], voy: _voyLabel(it.info), rep: it.rep, gangNos: it.mineIn ? [myNo] : null, recomputed: !!it.recomputed });
    await shareText(msg, it.rep.shift === '야간' ? '야간 작업보고' : '주간 작업보고');
  };
  //  5.21 수정 보고 — 멈춘 보고의 칸을 고쳐 보낸다. 고칠 수 있는 사람 = 그 배 작업자 · 수석 화면(조회만은 보기만).
  const canEdit = audience === 'chief' || canWorkNow();
  const idOf = (it) => `${it.key}|${it.cutKey}`;
  const startEdit = (it) => () => {
    const sides = {};
    const live = (r) => !!r && !r.none && !r.excluded;
    for (const g of (it.rep.gangs || [])) { const o = {}; for (const m of ['discharge', 'loading']) if (live(g[m]) && shiftSideShown(g[m])) o[m] = shiftSideCells(g[m]); if (Object.keys(o).length) sides['g' + g.no] = o; }
    if (!(it.rep.gangs || []).length) { const o = {}; for (const m of ['discharge', 'loading']) if (live(it.rep.ship[m]) && shiftSideShown(it.rep.ship[m])) o[m] = shiftSideCells(it.rep.ship[m]); if (Object.keys(o).length) sides.ship = o; }
    if (!Object.keys(sides).length) return;   // 고칠 표가 없다(단추도 안 보인다 — hasEditable)
    setEditErr(''); setEdit({ id: idOf(it), key: it.key, sides, touched: {} });
  };
  const setCell = (sk, m, k, fe, val) => setEdit((e) => {
    if (!e || !e.sides[sk] || !e.sides[sk][m]) return e;
    const n = Math.max(0, Math.min(9999, Math.floor(Number(String(val).replace(/[^0-9]/g, '')) || 0)));
    return { ...e, touched: { ...(e.touched || {}), [`${sk}|${m}`]: true }, sides: { ...e.sides, [sk]: { ...e.sides[sk], [m]: { ...e.sides[sk][m], [k]: { ...e.sides[sk][m][k], [fe]: n } } } } };
  });
  const sendEdit = (it) => async () => {
    if (!edit || edit.id !== idOf(it) || editBusy) return;
    //  사람이 손댄 쪽만, 그리고 앱이 센 표와 달라진 것만 적는다(대수만 나갔던 갱은 손댔으면 같아도 적는다 — 사람이 표를 확정한 것).
    //    ⚠ 감사 — 손대지 않은 대수만 갱까지 0대 표로 적어 «5호기 양하 잔여 0대» 가 나갔다(RZOR). 쪽마다 by·at 을 같이 적는다(두 사람이 각자 제 갱을 고쳐도 서로 지우지 않게).
    const at0 = Date.now(), by0 = String(inspector || '');
    const sides = {}, patch = {}, gone = [];
    for (const [sk, o] of Object.entries(edit.sides)) {
      const pick = (rp) => (sk === 'ship' ? rp.ship : ((rp.gangs || []).find((g) => 'g' + g.no === sk) || {}));
      for (const m of Object.keys(o)) {
        if (!(edit.touched || {})[`${sk}|${m}`]) continue;
        const b0 = pick(it.base)[m] || {}, c0 = pick(it.rep)[m] || {};
        const cells = shiftSideCells({ tbl: o[m] });
        const same = (r) => JSON.stringify(shiftSideCells(r)) === JSON.stringify(cells);
        //  ⚠ 재감사 — 앱 값으로 되돌리면 저장된 수정을 지운다(종전엔 건너뛰어 옛 수정값이 그대로 나갔다). 지금 보이는 값과 같으면 그대로 둔다.
        if (!b0.countsOnly && same(b0)) { if (c0.edited) { patch[`shiftReports/${it.cutKey}/edit/sides/${sk}/${m}`] = null; gone.push([sk, m]); } continue; }
        if (c0.edited && same(c0)) continue;
        sides[sk] = sides[sk] || {}; sides[sk][m] = { ...cells, by: by0, at: at0 };
        patch[`shiftReports/${it.cutKey}/edit/sides/${sk}/${m}`] = sides[sk][m];
      }
    }
    const share = async (rp) => {
      const msg = buildFerry1700Message({ vsl: it.info.vsl || it.key.split('_')[0], voy: _voyLabel(it.info), rep: rp, gangNos: it.mineIn ? [myNo] : null, recomputed: !!it.recomputed });
      await shareText(msg, rp.shift === '야간' ? '야간 작업보고' : '주간 작업보고');
    };
    if (!Object.keys(patch).length) { setEdit(null); await share(it.rep); return; }   // 고친 칸이 없다 — 지금 보이는 그대로 보고
    patch[`shiftReports/${it.cutKey}/edit/by`] = by0; patch[`shiftReports/${it.cutKey}/edit/at`] = at0;
    setEditBusy(true); setEditErr('');
    try { await fbUpdateVoyageInfo(it.key, patch); }
    catch (e) { console.warn('[5.21] 수정 보고 저장 실패', it.key, it.cutKey, e); setEditBusy(false); setEditErr('수정한 표를 저장하지 못했습니다. 신호를 확인하고 다시 눌러 주세요 — 아직 보고되지 않았습니다.'); return; }
    setEditBusy(false); setEdit(null);
    //  먼저 저장돼 있던 다른 사람의 수정 위에 내 것을 얹어 보낸다
    const prev = (it.edit && it.edit.sides) || {};
    const merged = {}; for (const [sk, o] of Object.entries(prev)) merged[sk] = { ...o };
    for (const [sk, m] of gone) if (merged[sk]) delete merged[sk][m];
    for (const [sk, o] of Object.entries(sides)) merged[sk] = { ...(merged[sk] || {}), ...o };
    await share(applyShiftEdit(it.base, { by: by0, at: at0, sides: merged }));
  };
  const hasEditable = (it) => ((it.rep.gangs || []).length
    ? it.rep.gangs.some((g) => shiftSideShown(g.discharge) || shiftSideShown(g.loading))
    : (shiftSideShown(it.rep.ship.discharge) || shiftSideShown(it.rep.ship.loading)));
  const blockProps = (it) => {
    if (it.pre) return {};   // 마감 전에는 보기만 — 정각에 멈춘 뒤 고른다
    const on = edit && edit.id === idOf(it);
    return { onKakao: audience === 'inspector' ? kakaoOf(it) : null, onEdit: canEdit && hasEditable(it) ? startEdit(it) : null, editing: on ? edit : null, onCell: on ? setCell : null, onSend: sendEdit(it), onCancel: () => { setEdit(null); setEditErr(''); }, busy: editBusy, err: on ? editErr : '' };
  };
  //  감사 — 수정 중에 창 시간(마감 뒤 30분)이 끝나면 입력이 날아간 것처럼 보인다 → 그 배의 보관 창으로 이어 준다(입력은 그대로).
  useEffect(() => { if (edit && edit.key && !items.length && !archiveOpen) setArchiveOpen(edit.key); }, [edit, items.length, archiveOpen]);
  //  ① 보고 창(마감 5분 전 ~ 마감 뒤 30분 · 안 닫음)
  if (items.length) {
    const close = () => { items.forEach((it) => closedRef.current.add(it.closeId)); _addAll(_key('closed'), items.map((it) => it.closeId)); setEdit(null); setClosedTick((t) => t + 1); };
    const mineIn = items[0].mineIn;
    const pre = items.every((it) => it.pre);
    const cutMs0 = items[0].cutMs;
    const cutHm = shiftNow === '야간' ? '05:30' : '17:00';
    const left = Math.max(1, Math.ceil((cutMs0 - now) / 60000));
    //  폰이 손대기 전의 음성을 막을 수 있다 — 다시 듣기 단추(검사: 감사 지적 «그날은 끝내 안 읽는다»).
    const replay = () => speak(pre ? `${shiftNow} 작업보고 ${left}분 전입니다. 호기별 표를 확인해 주세요.` : ferry1700Speech(items.map((it) => ({ vsl: it.info.vsl || it.key.split('_')[0], rep: it.rep })), mineIn ? myNo : 0, shiftNow), { priority: 'high' });
    return (
      <div className="fixed inset-0 z-[85] bg-black/70 flex items-end sm:items-center justify-center p-2" role="dialog" aria-label={`${shiftNow} 작업보고 ${cutHm}`} data-f1700-pre={pre ? '1' : '0'}>
        <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-ink-900 border border-amber-500 rounded-card p-3 space-y-3">
          <div className="text-base font-bold text-amber-300 text-center">
            📋 {audience === 'chief' ? `카페리 ${shiftNow} 작업보고 · ${cutHm} · 작업 중 ${items.length}척` : `${shiftNow} 작업보고 · ${cutHm}`}
          </div>
          <div className={`text-xs font-bold text-center rounded-pill py-1 ${pre ? 'bg-teal-900/60 text-teal-200' : 'bg-amber-900/50 text-amber-200'}`} data-f1700-state="1">
            {pre ? `⏱ 마감 ${left}분 전 · 실시간 — ${cutHm} 정각에 멈춥니다` : `⏸ ${cutHm} 마감 값에서 멈췄습니다 — 그대로 보고하거나 수정 보고하세요`}
          </div>
          {items.map((it) => <VoyageBlock key={it.key} item={it} myNo={myNo} {...blockProps(it)} />)}
          <div className="text-2xs text-dim-400 text-center">💡 갱마다 적은 쪽(작업량/잔여)을 기준으로 냅니다. 규격표는 컨이 끝난 시각과 선내위치로 호기를 따라 붙인 값(잔여는 선수 호기부터 터미널 호기별 잔여 대수로 나눈 값)이고, 호기 옆 숫자는 터미널이 주는 호기별 합계입니다. 틀린 칸은 멈춘 뒤 «수정 보고» 로 고쳐 보냅니다. 닫아도 작업이 끝날 때까지 «📋 보고 보관» 에 남습니다.</div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={replay} className="py-2.5 rounded-pill font-bold text-sm bg-ink-800 border border-line text-dim-100">🔊 다시 듣기</button>
            <button onClick={close} className="py-2.5 rounded-pill font-bold text-sm bg-ink-800 border border-line text-dim-100">닫기</button>
          </div>
        </div>
      </div>
    );
  }
  //  ② 보관 창(단추·주야간 화면에서 연다) — 음성 없음
  if (archiveOpen) {
    return (
      <div className="fixed inset-0 z-[85] bg-black/70 flex items-end sm:items-center justify-center p-2" role="dialog" aria-label="작업보고 보관">
        <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-ink-900 border border-amber-500 rounded-card p-3 space-y-3">
          <div className="text-base font-bold text-amber-300 text-center">📋 보고 보관 · {archive.length}건</div>
          <div className="text-2xs text-dim-400 text-center">17:00(주간)·05:30(야간) 마감마다 한 건 — 그 마감 시각 기준 값입니다. 작업이 끝나면 같이 사라집니다.</div>
          {archive.length ? archive.map((it) => (
            <div key={`${it.key}|${it.cutKey}`} className="border-t border-line pt-2">
              <VoyageBlock item={it} myNo={myNo} {...blockProps(it)} onKakao={audience === 'inspector' ? kakaoOf(it) : null} />
            </div>
          )) : <div className="text-xs text-dim-300 text-center py-4">보관한 보고가 없습니다 — 아직 마감(17:00·05:30)이 안 지났거나 작업이 끝났습니다.</div>}
          <button onClick={() => { setEdit(null); setEditErr(''); setArchiveOpen(false); }} className="w-full py-2.5 rounded-pill font-bold text-sm bg-ink-800 border border-line text-dim-100">닫기</button>
        </div>
      </div>
    );
  }
  //  ③ 보관 단추 — 보관한 보고가 있을 때만(작업이 끝나면 같이 사라진다)
  if (!cutsByKey.length) return null;
  return (
    <button onClick={() => setArchiveOpen(true)} data-f1700-chip="1"
      className="fixed left-3 bottom-5 z-40 px-3 py-2 rounded-full text-xs font-bold bg-amber-600 text-black border border-amber-300 shadow-lg shadow-black/40"
      style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}>{/* 4.87-10: bottom-5 + 아이폰 아래 막대 */}
      📋 보고 보관 {cutsByKey.length}
    </button>
  );
}
