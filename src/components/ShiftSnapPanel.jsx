// 수석(소유자) 전용 — 06:30·17:30 에 읽어 둔 터미널 실적(카토스·동방)을 앱 완료와 맞대 보고, 승인 단추로 완료에 반영하는 화면
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fbGetTermSnapshot, fbApplyTermSnapshot, fbRequestTermSnapshot } from '../firebase.js';
import { snapApplyEntries, snapBasisOf } from '../utils.js';

//  4.11 — 검수사 2026-10-07 21:42 «전 근무자가 어디 까지 했는지 정확히 알수가 없습니다. 그래서 아침 6시30분 저녁 5시30분 두차례만 읽어서 적용 시켰으면 합니다.»
//         21:47 «자동완료는 막아두고 제가 승인하면 완료처리가 되는 조건» · 22:05 «자동으로 읽어서 승인을 버튼을 누르면 적용되게 해주세요».
//  ⚠ 이 화면은 구독하지 않는다 — 열 때 한 번 읽고([새로 고침]으로 다시), 일반 검수원 폰은 이 자료를 받지 않는다.
//  ⚠ 반영은 completed 에 «추가만» 한다(검수원이 앱에서 찍은 컨은 건너뜀). 자동 완료는 그대로 잠겨 있다.
const MODE_LABEL = { discharge: '양하', loading: '선적' };
const pad = (n) => String(n).padStart(2, '0');
const hm = (ms) => {
  const n = Number(ms);
  if (!n) return '—';
  const d = new Date(n);
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const ago = (ms, now) => {
  const m = Math.max(0, Math.round((now - Number(ms)) / 60000));
  if (!Number(ms)) return '';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  return `${h}시간 ${m % 60}분 전`;
};

//  «작업 중인데 읽어 둔 자료가 없는 배» 를 가리는 시작 판정 — 수집기(catos._targets·shiftsnap)와 같은 뜻: 작업 시작 시각이 있거나, 작업 중 상태이고 계획 시작 1시간 전을 지났거나, 동방 호기 표에 실적이 보인다.
const startedOf = (info, now) => {
  if (!info || info.inspectorDone || String(info.terminalStatus || '').toLowerCase() === 'departed') return false;
  if (info.workStartAt) return true;
  const qc = info.qcWork && typeof info.qcWork === 'object' ? Object.values(info.qcWork) : [];
  if (qc.some((q) => Number((q || {}).disDone || 0) + Number((q || {}).lodDone || 0) > 0)) return true;
  if (String(info.terminalStatus || '').toLowerCase() !== 'working') return false;
  const m = String(info.planDate || '').split('~')[0].match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return true;
  const ps = Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+09:00`);   // 계획 시각은 평택(KST) 시각이다
  return !Number.isFinite(ps) || ps - 3600 * 1000 <= now;
};

export default function ShiftSnapPanel({ voyages, by }) {
  const [data, setData] = useState(null);       // null = 읽는 중
  const [err, setErr] = useState('');
  const [busyKey, setBusyKey] = useState(null);
  const [confirmKey, setConfirmKey] = useState(null);
  const [notice, setNotice] = useState(null);
  const [reqBusy, setReqBusy] = useState(false);
  const now = Date.now();

  const load = useCallback(async () => {
    setData(null);
    try {
      setData(await fbGetTermSnapshot(by));
      setErr('');
    } catch (e) {
      setErr(e?.message || String(e));   // 조용히 비우지 않는다 — 읽지 못했다고 화면에 말한다
      setData({});
    }
  }, [by]);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const out = [];
    for (const [vk, node] of Object.entries(data || {})) {
      if (vk.startsWith('_') || !node || typeof node !== 'object') continue;
      const v = (voyages || {})[vk];
      if (!v) continue;                       // 앱에 없는 항차는 반영할 곳이 없다
      const info = v.info || {};
      for (const mode of ['discharge', 'loading']) {
        const snap = node[mode];
        if (!snap || typeof snap !== 'object') continue;
        const comp = (v[mode] && v[mode].completed) || {};
        out.push({
          key: `${vk}|${mode}`, vk, mode, snap,
          vsl: info.vsl || vk.split('_')[0],
          voy: (mode === 'discharge' ? info.voy_d : info.voy_l) || '',
          appDone: Object.keys(comp).length,
          applyN: snapApplyEntries(snap, comp).length,
          basis: snapBasisOf(snap),
        });
      }
    }
    return out.sort((a, b) => a.vk.localeCompare(b.vk) || (a.mode === 'discharge' ? -1 : 1));
  }, [data, voyages]);

  const st = data && data._status && typeof data._status === 'object' ? data._status : null;
  const fails = st && Array.isArray(st.fail) ? st.fail : [];
  const failN = st ? Math.max(fails.length, (Number(st.n) || 0) - (Number(st.okN) || 0)) : 0;   // _status.fail 은 40건에서 잘린다 — 건수는 n-okN 으로도 센다
  //  수집기가 놓친 슬롯(꺼져 있었음) — 마지막 읽기보다 나중에 놓쳤으면 알린다
  const missed = data && data._missed && typeof data._missed === 'object' && Number(data._missed.at) > Number((st && st.at) || 0) ? data._missed : null;
  //  작업 중인데 읽어 둔 자료가 없는 배 — 수집기가 기항을 못 맞췄거나 아직 읽기 전이다(조용히 목록에서 빠지지 않게 이름을 보인다)
  const noSnap = useMemo(() => {
    if (!data || err) return [];
    const out = [];
    for (const [vk, v] of Object.entries(voyages || {})) {
      const info = (v && v.info) || {};
      const hasMode = ['discharge', 'loading'].some((m) => v && v[m] && typeof v[m] === 'object');
      const sn = data[vk];
      const has = sn && typeof sn === 'object' && (sn.discharge || sn.loading);
      if (hasMode && !has && startedOf(info, Date.now())) out.push(`${info.vsl || vk.split('_')[0]} ${info.voy_d || info.voy_l || ''}`.trim());
    }
    return out.sort();
  }, [data, voyages, err]);

  const doApply = async (row) => {
    setBusyKey(row.key);
    try {
      const res = await fbApplyTermSnapshot(row.vk, row.mode, by);
      setNotice(res.applied > 0
        ? { kind: 'ok', text: `🏗 ${row.vsl} ${MODE_LABEL[row.mode]} ${res.applied}대를 완료로 반영했습니다${res.basis === 'plan' ? ' — 동방 계획 기준 표식이 남았습니다(완료 확정 아님)' : ''}. 검수원이 앱에서 찍은 컨은 건드리지 않았습니다.` }
        : { kind: 'warn', text: `반영할 것이 없습니다 — ${row.vsl} ${MODE_LABEL[row.mode]} 터미널 완료가 전부 앱 완료와 같습니다.` });
    } catch (e) {
      setNotice({ kind: 'err', text: `반영 실패(${row.vsl} ${MODE_LABEL[row.mode]}) — ${e?.message || e}` });   // 조용한 실패 금지
    }
    setBusyKey(null);
    setConfirmKey(null);
  };

  const doRequest = async () => {
    setReqBusy(true);
    try {
      await fbRequestTermSnapshot(by);
      setNotice({ kind: 'ok', text: '다시 읽기를 요청했습니다 — 수집기가 1~2분 안에 읽습니다. 잠시 뒤 [새로 고침]을 눌러 주세요.' });
    } catch (e) {
      setNotice({ kind: 'err', text: `다시 읽기 요청 실패 — ${e?.message || e}` });
    }
    setReqBusy(false);
  };

  const noticeCls = (k) => (k === 'err' ? 'bg-red-950/40 border-red-800/60 text-red-200'
    : k === 'warn' ? 'bg-amber-950/30 border-amber-800/50 text-amber-200' : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200');

  return (
    <div className="space-y-2">
      <div className="rounded-btn border border-line bg-ink-900 px-3 py-2 text-xs2 text-dim-200 space-y-1">
        <div>매일 <b className="text-dim-100">06:30 · 17:30</b> 에 수집기가 작업 중인 배의 터미널 실적(PCTC PDA 입력 · 동방 PNCT)을 읽어 둡니다. 외부 현황 사이트 집계는 읽지 않습니다.</div>
        <div>아래 [반영]을 눌러야만 완료로 들어갑니다 — 자동으로는 아무것도 들어가지 않고, 검수원이 앱에서 찍은 컨은 건드리지 않습니다.</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={load} disabled={data === null}
          className="text-xxs px-3 rounded-pill bg-ink-800 hover:bg-ink-750 text-dim-100 border border-line-strong font-bold disabled:opacity-50" style={{ minHeight: 36 }}>
          {data === null ? '읽는 중…' : '🔄 새로 고침'}
        </button>
        <button onClick={doRequest} disabled={reqBusy}
          className="text-xxs px-3 rounded-pill bg-sky-900/40 hover:bg-sky-800/60 text-sky-200 border border-sky-700/50 font-bold disabled:opacity-50" style={{ minHeight: 36 }}
          title="자동으로 읽는 것을 기다리지 않고 수집기에게 지금 한 번 읽으라고 요청합니다">
          {reqBusy ? '요청 중…' : '📡 지금 다시 읽기'}
        </button>
      </div>

      {err && <div className="rounded-btn border px-3 py-2 text-xs2 bg-red-950/40 border-red-800/60 text-red-200">스냅샷을 읽지 못했습니다 — {err}</div>}
      {notice && <div className={`rounded-btn border px-3 py-2 text-xs2 ${noticeCls(notice.kind)}`}>{notice.text}</div>}

      {data !== null && !err && (
        st ? (
          <div className={`rounded-btn border px-3 py-2 text-xs2 ${st.ok ? 'bg-ink-900 border-line text-dim-200' : 'bg-red-950/30 border-red-800/50 text-red-200'}`}>
            <div className="font-bold">
              {st.slot === 'manual' ? '마지막 읽기: 수동 요청' : `마지막 읽기: ${st.slot} 슬롯`} · {hm(st.at)} ({ago(st.at, now)})
              {' '}· 성공 {st.okN}건{failN ? ` · 못 읽음 ${failN}건` : ''}{st.final ? '' : ' · 실패분 다시 읽는 중(5분마다 최대 60분)'}
            </div>
            {fails.length > 0 && (
              <ul className="mt-1 space-y-0.5 list-disc pl-4">
                {fails.map((f, i) => (
                  <li key={i}>{f.vk === '*' ? '전체' : `${f.vk} ${MODE_LABEL[f.mode] || ''}`} — {f.why}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="rounded-btn border border-line bg-ink-900 px-3 py-2 text-xs2 text-dim-300">아직 읽은 기록이 없습니다 — 06:30 · 17:30 에 자동으로 읽습니다. 지금 읽으려면 [지금 다시 읽기]를 눌러 주세요.</div>
        )
      )}

      {missed && (
        <div className="rounded-btn border px-3 py-2 text-xs2 bg-amber-950/30 border-amber-800/50 text-amber-200">
          ⚠ {missed.slot} 슬롯은 수집기가 꺼져 있어 읽지 못했습니다({hm(missed.at)} 확인). 필요하면 [지금 다시 읽기]를 눌러 주세요.
        </div>
      )}
      {noSnap.length > 0 && (
        <div className="rounded-btn border px-3 py-2 text-xs2 bg-amber-950/30 border-amber-800/50 text-amber-200">
          ⚠ 작업 중인데 읽어 둔 자료가 없는 배 — {noSnap.join(' · ')} (수집기가 터미널 기항을 못 맞췄거나 아직 읽기 전입니다)
        </div>
      )}

      {data !== null && !err && rows.length === 0 && st && (
        <div className="text-xs2 text-dim-300 px-1">읽어 둔 작업 선박이 없습니다(작업 중인 배가 없었거나, 위에 «못 읽음»으로 적힌 경우).</div>
      )}

      {rows.map((r) => {
        const old = Number(r.snap.readAt) && now - Number(r.snap.readAt) > 14 * 3600 * 1000;
        return (
          <div key={r.key} className="rounded-btn border border-line bg-ink-900 px-3 py-2 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm2 font-bold text-dim-100">{r.vsl} {r.voy}</span>
              <span className="text-xs2 font-bold text-dim-100">{MODE_LABEL[r.mode]}</span>
              <span className={`text-2xs px-2 py-0.5 rounded-pill border ${r.basis.tone === 'warn' ? 'bg-amber-950/40 border-amber-700/50 text-amber-200' : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'}`}>{r.basis.label}</span>
            </div>
            <div className="text-xs2 text-dim-200">
              터미널 완료 <b className="text-dim-100">{r.snap.done || 0}</b>/{r.snap.n || 0}
              {' '}· 앱 완료 <b className="text-dim-100">{r.appDone}</b>
              {' '}· 반영 가능 <b className="text-amber-200">{r.applyN}</b>대
            </div>
            <div className={`text-2xs ${old ? 'text-amber-300' : 'text-dim-400'}`}>
              읽은 시각 {hm(r.snap.readAt)} ({ago(r.snap.readAt, now)}){r.snap.last ? ` · 터미널 마지막 작업 ${hm(r.snap.last)}` : ''}{old ? ' · 낡았을 수 있습니다 — [지금 다시 읽기]' : ''}
            </div>
            {r.snap.basis === 'plan' && (
              <div className="text-2xs text-amber-300">
                ⚠ 동방 선적은 동방 계획에 따라 실립니다 — 완료로 확정된 것이 아닙니다. 이어서 작업하려고 반영하면 «계획 기준» 표식이 남고, 마무리는 «🏁 마감적용» 메뉴에서 마감텔리 선적 EDI 기준으로 합니다.
              </div>
            )}
            {r.applyN > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {confirmKey === r.key ? (
                  <>
                    <span className="text-2xs text-amber-300">터미널 {MODE_LABEL[r.mode]} {r.applyN}대를 완료로 반영?{r.snap.basis === 'plan' ? ' (동방 계획 기준)' : ''}</span>
                    <button onClick={() => doApply(r)} disabled={busyKey === r.key} style={{ minHeight: 36 }}
                      className="text-xxs px-3 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold disabled:opacity-50">
                      {busyKey === r.key ? '반영 중…' : '예'}
                    </button>
                    <button onClick={() => setConfirmKey(null)} style={{ minHeight: 36 }}
                      className="text-xxs px-3 rounded bg-ink-750 hover:bg-ink-700 text-dim-100">취소</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmKey(r.key)} style={{ minHeight: 36 }}
                    className="text-xxs px-3 rounded-pill bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 border border-amber-700/50 font-bold"
                    title="이 시각에 읽어 둔 터미널 완료 중 앱에 완료가 안 찍힌 컨을 완료로 — 검수원 기록은 덮지 않음">
                    🏗 {MODE_LABEL[r.mode]} 반영 {r.applyN}대
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
