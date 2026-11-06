// 소유자 전용 — 막힌 사람의 접속시도와 콘앱 사용빈도를 보고 열어줄지·계속할지 정하는 화면(관리앱 «🚪 접속 기록»)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fbGetAccessLog, fbCleanupAccessLog, fbSetStaffOff, fbSubscribeStaffOff } from '../firebase.js';
import { summarizeAccess } from '../accessLog.js';
import { activityDayKey } from '../activityLog.js';

//  4.69 — 검수사 2026-11-06 18:06 «접속시도가 많으면 사용하고픈 마음이 있다고 보고 열어줄지 말지 결정하는데 이용» ·
//         «콘앱도 사용빈도를 몰라 지속여부를 결정» · 18:07 «로그관리는 제 개인 메뉴에» · 18:48 «클로드와 제꺼는 제외».
//  ⚠ 구독하지 않는다 — 펼칠 때 한 번(최근 30일) 읽는다. 소유자·클로드 기기와 이름은 summarizeAccess 가 뺀다.
//  ⚠ 기록은 4.69 를 올린 날부터 쌓인다(그 전 시도는 기록이 없다).
const DAYS = 30;
const dayKeys = () => Array.from({ length: DAYS }, (_, i) => activityDayKey(Date.now() - i * 86400000));
const fmtAt = (at) => {
  if (!at) return '-';
  const d = new Date(at); const p = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fmtDay = (k) => `${Number(k.slice(2, 4))}/${Number(k.slice(4, 6))}`;

export default function AccessLogPanel({ by }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [off, setOff] = useState({});
  const [msg, setMsg] = useState('');

  useEffect(() => fbSubscribeStaffOff(setOff), []);

  const load = useCallback(async () => {
    setBusy(true); setErr('');
    try {
      setRows(await fbGetAccessLog(dayKeys(), by));
      fbCleanupAccessLog(60).catch((e) => console.warn('[접속기록] 정리 실패(무해)', e));
    } catch (e) {
      console.warn('[접속기록] 읽기 실패', e);
      setErr(String((e && e.message) || e));
    }
    setBusy(false);
  }, [by]);
  useEffect(() => { load(); }, [load]);

  const sum = useMemo(() => summarizeAccess(rows || []), [rows]);

  const turnOn = async (name) => {
    if (!window.confirm(`${name} 님의 접근을 켭니다(온).\n\n· 바로 로그인해서 쓸 수 있게 됩니다.\n· 다시 막으려면 인원 관리에서 끄면 됩니다.`)) return;
    setMsg('');
    const r = await fbSetStaffOff(by, name, false);
    setMsg(r && r.ok ? `${name} 님 접근을 켰습니다.` : '저장 실패 — 네트워크를 확인하세요.');
  };

  const maxDev = Math.max(1, ...sum.coneByDay.map((d) => d.devices));
  return (
    <div className="space-y-2" data-accesslog="1">
      <div className="rounded-btn border border-line bg-ink-900 px-3 py-2 text-xs2 text-dim-200 space-y-1">
        <div>최근 {DAYS}일 기록입니다. 소유자·클로드는 집계에서 뺍니다. 기록은 4.69 를 올린 날부터 쌓입니다.</div>
        <button type="button" onClick={load} disabled={busy}
          className="text-xxs px-3 rounded-pill bg-ink-800 hover:bg-ink-750 text-dim-100 border border-line-strong font-bold disabled:opacity-50" style={{ minHeight: 36 }}>
          {busy ? '읽는 중…' : '🔄 새로 고침'}
        </button>
      </div>
      {err && <div className="rounded-btn border px-3 py-2 text-xs2 bg-red-950/40 border-red-800/60 text-red-200">접속 기록을 읽지 못했습니다 — {err}</div>}
      {msg && <div className="rounded-btn border border-line bg-ink-900 px-3 py-2 text-xs2 text-dim-100">{msg}</div>}
      {rows && (
        <>
          <div className="rounded-btn border border-line bg-ink-900 px-3 py-2 space-y-1" data-accesslog-denied="1">
            <div className="text-sm2 font-bold text-dim-100">🔒 막힌 뒤 접속시도 — 모두 {sum.deniedTotal}회</div>
            {sum.denied.length === 0
              ? <div className="text-xs2 text-dim-300">아직 시도한 사람이 없습니다.</div>
              : sum.denied.map((o) => (
                <div key={o.name} className="flex items-center gap-2 text-xs2 text-dim-200 border-t border-line pt-1" data-accesslog-row={o.name}>
                  <div className="min-w-0 flex-1">
                    <b className="text-dim-100">{o.name}</b> · {o.total}회 · {o.dayCount}일 · 기기 {o.devCount}대
                    <div className="text-dim-400">처음 {fmtAt(o.first)} · 마지막 {fmtAt(o.last)}</div>
                  </div>
                  {off[o.name]
                    ? <button type="button" onClick={() => turnOn(o.name)} className="text-xxs px-3 rounded-pill bg-emerald-900 text-emerald-100 font-bold shrink-0" style={{ minHeight: 36 }}>ON 으로</button>
                    : <span className="text-xxs text-dim-400 shrink-0">이미 켜짐</span>}
                </div>
              ))}
          </div>
          <div className="rounded-btn border border-line bg-ink-900 px-3 py-2 space-y-1" data-accesslog-cone="1">
            <div className="text-sm2 font-bold text-dim-100">📱 콘앱 사용 — 기기 {sum.coneDevices}대</div>
            {sum.coneDevices === 0
              ? <div className="text-xs2 text-dim-300">아직 기록이 없습니다. 콘앱을 연 기기가 하루 첫 실행마다 한 번 남깁니다.</div>
              : (
                <>
                  <div className="text-xs2 text-dim-200">쓴 날 수 — 하루뿐 {sum.coneOnce}대 · 2~3일 {sum.coneFew}대 · 4일 이상 {sum.coneMany}대</div>
                  {sum.coneByDay.map((d) => (
                    <div key={d.day} className="flex items-center gap-2 text-xs2 text-dim-200">
                      <span className="w-10 shrink-0 text-dim-400">{fmtDay(d.day)}</span>
                      <span className="h-2 rounded bg-sky-700" style={{ width: `${Math.max(6, Math.round((d.devices / maxDev) * 70))}%` }} />
                      <span>{d.devices}대</span>
                    </div>
                  ))}
                </>
              )}
          </div>
        </>
      )}
    </div>
  );
}
