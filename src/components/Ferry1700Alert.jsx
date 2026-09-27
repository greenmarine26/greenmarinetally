// 카페리 17:00 주간 작업보고 알림 창 — 갱별 규격표·음성, 검수원은 카톡 보고 · 수석은 작업 중 카페리 모아 보기 (3.63)
//   검수사 2026-09-27 «그 보고를 자동으로 음성과 함께 시간이 도래하면 화면에 띄워줄수 있나요. 대상은 TNJP OBWH RZOR 3척입니다» ·
//   «두군데 검수앱 수석대쉬보드에 뜨게 해주고 검수앱 작업중인 검수원에 카톡보고 버튼추가» · «갱별보고여야함» · «갱별 규격표까지».
//   계산은 전부 utils 한 벌(ferry1700Due · buildGangShiftReport) — 여기는 그림·음성·하루 한 번만 맡는다.
//   ⚠ 앱이 켜져 있어야 뜬다(푸시 아님). 17:00~17:29 에 앱을 열면 그때 뜬다. 기기마다 하루 한 번 — 닫으면 그날은 다시 안 뜬다.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { buildGangShiftReport, ferry1700Due, crewCraneNo, getEquipNumber, shiftCutMs } from '../utils.js';
import { ymdKST } from '../meToday.js';   // KST 날짜 한 벌(workChoice 하루 만료와 같은 것)
import { getShipBayDictData } from '../shipStructure.js';
import { buildBayPagesFromSummary } from '../cargoPlanCore.js';
import { shareText, buildFerry1700Message } from '../kakaoShare.js';
import { speak } from '../voice.js';

//  기록 열쇠는 창 종류(수석·검수원)를 가리지 않는다 — 작업 중인 수석이 대시보드에서 닫은 배를 다른 화면이 또 띄우고 또 읽지 않게(감사 지적).
const _key = (kind) => `gm_f1700_${kind}_${ymdKST()}`;
//  17:00 직후 이 기기가 본 호기 표를 굳혀 둔다 — 대수만 내는 배(RZOR)의 숫자가 17:00 에 맞게(나중에 열면 지금 값 + 섞인 대수 안내).
const SNAP_WITHIN_MS = 3 * 60000;
function _qcSnapOf(key, v, now, cutMs) {
  const k = `gm_f1700_qc_${ymdKST()}_${key}`;
  try {
    const raw = localStorage.getItem(k);
    if (raw) return JSON.parse(raw);
    const qw = v && v.info && v.info.qcWork;
    if (qw && now >= cutMs && now - cutMs <= SNAP_WITHIN_MS) { const sn = { at: now, qcWork: qw }; localStorage.setItem(k, JSON.stringify(sn)); return sn; }
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
export function ferry1700Speech(items, myNo = 0) {
  const parts = [];
  for (const { vsl, rep } of items) {
    const gangs = (rep.gangs || []).filter((g) => !myNo || g.no === myNo);
    if (!gangs.length) { parts.push(`${vsl} ${[_side('양하', rep.ship.discharge), _side('선적', rep.ship.loading)].filter(Boolean).join(', ')}`); continue; }
    const gl = gangs.map((g) => { const t = [_side('양하', g.discharge), _side('선적', g.loading)].filter(Boolean).join(', '); return t ? `${g.no}호기 ${t}` : ''; }).filter(Boolean);
    if (gl.length) parts.push(`${vsl} ${gl.join('. ')}${!rep.perGang && rep.postCut > 0 ? `. 호기 대수는 ${_hm(rep.qcAt)} 터미널 값` : ''}`);
    else parts.push(`${vsl} ${[_side('양하', rep.ship.discharge), _side('선적', rep.ship.loading)].filter(Boolean).join(', ') || '보고할 것 없음'}`);
  }
  return `주간 작업보고 시간입니다. ${parts.join('. ')}입니다.`;
}

function SideTable({ label, rep }) {
  if (!rep || rep.none) return null;
  return (
    <div className="bg-ink-900 border border-line rounded-pill p-2">
      <div className="text-xs font-bold text-dim-100 mb-1 flex items-center justify-between">
        <span>{label}</span>
        {!rep.excluded && <span className="text-2xs text-teal-300">{rep.basis} 기준 (완료 {rep.doneTotal} · 잔여 {rep.remainTotal})</span>}
      </div>
      {rep.excluded ? (
        <div className="text-xxs text-dim-400 text-center py-1">{rep.reason}</div>
      ) : rep.countsOnly ? (
        <div className="text-center py-1"><span className="text-lg font-bold text-dim-100 tabular-nums">{rep.total.total}</span>
          <span className="text-2xs text-dim-400"> 대 · 터미널 호기 집계(규격표 없음)</span></div>
      ) : (
        <table className="w-full text-xxs tabular-nums">
          <thead><tr className="text-dim-300 border-b border-line"><th className="text-left py-1">규격</th><th>F</th><th>E</th><th>TOTAL</th></tr></thead>
          <tbody className="text-dim-100">
            {[['20ft', rep.tbl.s20], ['40ft', rep.tbl.s40], ['45ft', rep.tbl.s45]].map(([nm, o]) => (
              <tr key={nm} className="border-b border-line">
                <td className="text-left py-1 text-dim-200">{nm}</td>
                <td className="text-center">{o.F}</td><td className="text-center">{o.E}</td><td className="text-center font-bold">{o.F + o.E}</td>
              </tr>
            ))}
            <tr className="text-teal-300 font-bold">
              <td className="text-left py-1">풀엠티토탈</td>
              <td className="text-center">{rep.total.F}</td><td className="text-center">{rep.total.E}</td><td className="text-center">{rep.total.total}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

function GangCard({ g, mine }) {
  const q = g.qcNow || {};
  return (
    <div className={`rounded-pill p-2 space-y-1.5 border ${mine ? 'border-teal-400 bg-teal-950/30' : 'border-line bg-ink-850'}`} data-gang={g.no}>
      <div className="text-sm font-bold text-dim-100 flex items-center gap-2">
        <span>🏗 {g.no}호기</span>
        {mine && <span className="text-2xs px-1.5 py-0.5 rounded bg-teal-700 text-white">내 갱</span>}
        <span className="ml-auto text-2xs font-normal text-dim-400">터미널 {g.qc} 양 {q.disDone}/{q.disRest} · 선 {q.lodDone}/{q.lodRest}</span>
      </div>
      <SideTable label="양하" rep={g.discharge} />
      <SideTable label="선적" rep={g.loading} />
    </div>
  );
}

function VoyageBlock({ item, myNo }) {
  const { info, rep } = item;
  const gangs = (rep.gangs || []).slice().sort((a, b) => (a.no === myNo ? -1 : b.no === myNo ? 1 : a.no - b.no));
  return (
    <div className="space-y-2" data-f1700={item.key}>
      <div className="text-sm font-bold text-amber-300">{info.vsl} {_voyLabel(info)}</div>
      {rep.why && <div className="text-2xs text-amber-200/80">⚠ {rep.why}</div>}
      {rep.perGang && rep.side && <div className="text-2xs text-dim-400">{rep.side === 'starboard' ? '우현' : '좌현'} 접안 기준 · 선수 {rep.bow}호기 — 방향이 다르면 수석에게 알려 주세요.</div>}
      {rep.postCut > 0 && !rep.perGang && <div className="text-2xs text-dim-400">터미널 호기 집계는 {_hm(rep.qcAt)} 값이라 17:00 뒤 {rep.postCut}대가 섞여 있습니다.</div>}
      {gangs.map((g) => <GangCard key={g.no} g={g} mine={!!myNo && g.no === myNo} />)}
      {(!rep.perGang || !gangs.length) && (
        <div className="space-y-1.5">
          <div className="text-2xs text-dim-300">배 전체</div>
          <SideTable label="양하" rep={rep.ship.discharge} />
          <SideTable label="선적" rep={rep.ship.loading} />
        </div>
      )}
      {rep.perGang && (rep.unknown.discharge + rep.unknown.loading) > 0 && (
        <div className="text-2xs text-dim-400">자리를 몰라 갱에 못 넣은 컨 양하 {rep.unknown.discharge} · 선적 {rep.unknown.loading}대(배 전체 합에는 들어 있습니다).</div>
      )}
    </div>
  );
}

//  audience 'chief' — 작업 중인 대상 카페리 전부(보기만) · 'inspector' — voyageKey 한 척 + 카톡 보고(내 갱).
export default function Ferry1700Alert({ voyages, audience = 'inspector', voyageKey = '', nowOverride = 0 }) {
  const [now, setNow] = useState(() => nowOverride || Date.now());
  const [, setClosedTick] = useState(0);
  const closedRef = useRef(new Set());   // 기록 쓰기가 막힌 기기에서도 이 화면에서는 다시 안 뜨게
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
  const minute = Math.floor(now / 60000);
  //  지난날 기록은 치운다(열쇠가 날마다 쌓이지 않게 — 재감사 권장). 오늘 날짜가 든 열쇠만 남긴다.
  useEffect(() => {
    try {
      const today = `_${ymdKST()}`;
      Object.keys(localStorage).filter((k) => k.startsWith('gm_f1700_') && !k.includes(today)).forEach((k) => localStorage.removeItem(k));
    } catch (e) { console.warn('[3.63] 지난 17시 보고 기록 치우기 실패(무해)', e); }
  }, []);
  const dueKeys = useMemo(() => {
    const keys = audience === 'chief' ? Object.keys(voyages || {}) : (voyageKey ? [voyageKey] : []);
    return keys.filter((k) => voyages && voyages[k] && ferry1700Due(voyages[k], now, k)).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voyages, audience, voyageKey, minute]);
  const dismissed = _readSet(_key('closed'));
  const showKeys = dueKeys.filter((k) => !dismissed.has(k) && !closedRef.current.has(k));
  const items = useMemo(() => showKeys.map((k) => {
    const v = voyages[k];
    const cutMs = shiftCutMs('주간', now);
    return { key: k, info: v.info || {}, rep: buildGangShiftReport(v, ferryPagesOf(v, k), now, { qcSnap: _qcSnapOf(k, v, now, cutMs) }) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [showKeys.join('|'), voyages, minute]);
  const myNo = audience === 'inspector' ? crewCraneNo(equip) : 0;
  //  음성 — 이 기기에서 오늘 처음 뜬 배가 있을 때 한 번.
  const spokeRef = useRef('');
  useEffect(() => {
    if (!items.length) return;
    const sk = _key('spoken');
    const spoken = _readSet(sk);
    const fresh = items.filter((it) => !spoken.has(it.key));
    const sig = items.map((it) => it.key).join('|');
    if (!fresh.length || spokeRef.current === sig) return;
    spokeRef.current = sig;
    _addAll(sk, fresh.map((it) => it.key));
    const mn = myNo && fresh.some((it) => (it.rep.gangs || []).some((g) => g.no === myNo)) ? myNo : 0;   // 내 호기가 그 배 갱에 없으면 갱 전부를 읽는다
    speak(ferry1700Speech(fresh.map((it) => ({ vsl: it.info.vsl || it.key.split('_')[0], rep: it.rep })), mn), { priority: 'high' });
  }, [items, audience, myNo]);
  if (!items.length) return null;
  const close = () => { items.forEach((it) => closedRef.current.add(it.key)); _addAll(_key('closed'), items.map((it) => it.key)); setClosedTick((t) => t + 1); };
  const mineIn = !!myNo && audience === 'inspector' && (items[0].rep.gangs || []).some((g) => g.no === myNo);
  //  폰이 손대기 전의 음성을 막을 수 있다 — 다시 듣기 단추(검사: 감사 지적 «그날은 끝내 안 읽는다»).
  const replay = () => speak(ferry1700Speech(items.map((it) => ({ vsl: it.info.vsl || it.key.split('_')[0], rep: it.rep })), mineIn ? myNo : 0), { priority: 'high' });
  const sendKakao = async () => {
    const it = items[0];
    const msg = buildFerry1700Message({ vsl: it.info.vsl || it.key.split('_')[0], voy: _voyLabel(it.info), rep: it.rep, gangNos: mineIn ? [myNo] : null });
    await shareText(msg, '주간 작업보고');
  };
  return (
    <div className="fixed inset-0 z-[85] bg-black/70 flex items-end sm:items-center justify-center p-2" role="dialog" aria-label="주간 작업보고 17:00">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-ink-900 border border-amber-500 rounded-card p-3 space-y-3">
        <div className="text-base font-bold text-amber-300 text-center">
          📋 {audience === 'chief' ? `카페리 주간 작업보고 · 17:00 · 작업 중 ${items.length}척` : '주간 작업보고 · 17:00'}
        </div>
        {items.map((it) => <VoyageBlock key={it.key} item={it} myNo={myNo} />)}
        <div className="text-2xs text-dim-400 text-center">💡 갱마다 적은 쪽(작업량/잔여)을 기준으로 냅니다. 규격표는 선내위치로 호기를 붙인 값이고, 호기 옆 숫자는 터미널이 주는 호기별 합계입니다.</div>
        <div className="grid grid-cols-2 gap-2">
          {audience === 'inspector' ? (
            <button onClick={sendKakao} className="py-2.5 rounded-pill font-bold text-sm bg-yellow-400 text-black">💬 카톡 보고{mineIn ? ` (${myNo}호기)` : ''}</button>
          ) : (
            <button onClick={replay} className="py-2.5 rounded-pill font-bold text-sm bg-ink-800 border border-line text-dim-100">🔊 다시 듣기</button>
          )}
          <button onClick={close} className="py-2.5 rounded-pill font-bold text-sm bg-ink-800 border border-line text-dim-100">닫기</button>
        </div>
        {audience === 'inspector' && <button onClick={replay} className="w-full py-2 rounded-pill text-xs bg-ink-850 border border-line text-dim-200">🔊 다시 듣기</button>}
      </div>
    </div>
  );
}
