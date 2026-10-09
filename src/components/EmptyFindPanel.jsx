// 수석 대시보드 «🔎 머스크 엠티 찾기» — 머스크 선적 항차마다 PCTC EDI 엠티·머스크 BAPLIE 엠티를 맞대 보이고 임시 리스트를 만들게 한다
import React, { useState, useEffect, useRef } from 'react';
import { maerskEmptyCards, emptyCsv, STATUS_LABEL } from '../emptyFind.js';
import { fbRequestEmptyMake, fbSubscribeProcessDone } from '../firebase.js';
import { downloadText } from '../loloReport.js';
import { isoShown } from '../utils.js';   // 4.20-01: 내부 풀·엠티 표식을 정본 규격 글자로 보여 준다

function EmptyFindCard({ c, inspector, canMake }) {
  const [open, setOpen] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [done, setDone] = useState(null);
  const [err, setErr] = useState('');
  const base = useRef(undefined);   // 처음 읽은 옛 답의 시각 — 기기 시계끼리 견주지 않고 «달라졌는가» 로 새 답을 가린다
  useEffect(() => {
    base.current = undefined; setDone(null); setWaiting(false);
    let off = null;
    try {
      off = fbSubscribeProcessDone(`${c.vk}__empty`, (d) => {
        const at = d && d.at ? d.at : 0;
        if (base.current === undefined) { base.current = at; return; }
        if (at !== base.current) { setDone(d); setWaiting(false); }
      });
    } catch (e) { setErr('결과를 읽지 못했습니다'); }
    return () => { try { off && off(); } catch (e) { /* 이미 끊김 */ } };
  }, [c.vk]);
  useEffect(() => {
    if (!waiting) return undefined;
    const t = setTimeout(() => { setWaiting(false); setErr('수집기가 90초 안에 답하지 않았습니다 — 수집기가 꺼져 있을 수 있습니다.'); }, 90000);
    return () => clearTimeout(t);
  }, [waiting]);
  const [label, hint] = STATUS_LABEL[c.status] || ['미확인', '수집기가 아직 이 항차를 보지 않았습니다. «지금 만들기» 를 누르면 바로 봅니다.'];
  const tone = c.status === 'official' ? 'text-emerald-300' : (c.status === 'temp_ok' || c.status === 'temp_made') ? 'text-amber-300' : 'text-red-300';
  const make = async () => {
    setErr(''); setDone(null);
    try { await fbRequestEmptyMake(c.vk, inspector || ''); setWaiting(true); } catch (e) { setErr(String(e?.message || e)); }
  };
  const specs = Object.entries(c.bySpec).sort();
  return (
    <div className="bg-ink-900 border border-line rounded-btn p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-bold text-dim-100">{c.vsl} {c.voy}</span>
        <span className={`text-xs font-bold ${tone}`}>리스트 {label}</span>
        <span className="text-xs text-dim-300">PCTC EDI 엠티 {c.nPctc}대{c.nBap != null ? ` · 머스크 BAPLIE 엠티 ${c.nBap}대` : ''}</span>
      </div>
      <div className="text-xxs text-dim-400 mt-1">{hint}</div>
      {c.table && (
        <table className="w-full text-xs mt-2">
          <thead><tr className="text-dim-400 text-left"><th>도착항</th><th>규격</th><th className="text-right">PCTC</th><th className="text-right">BAPLIE</th></tr></thead>
          <tbody>{c.table.map((r) => (
            <tr key={r.pod + r.spec} className={r.diff ? 'text-red-300 font-bold' : 'text-dim-200'}>
              <td>{r.pod}</td><td>{r.spec}</td><td className="text-right">{r.pctc}</td><td className="text-right">{r.bap}</td>
            </tr>))}
          </tbody>
        </table>
      )}
      <div className="flex gap-2 mt-2 flex-wrap">
        <button className="px-3 rounded-btn border border-line text-xs" style={{ minHeight: 44 }} onClick={() => setOpen(!open)}>
          {open ? '번호 접기' : `번호 보기 (${specs.map(([k, v]) => `${isoShown(k)} ${v.length}`).join(' · ') || '없음'})`}
        </button>
        {canMake && c.status !== 'official' && (
          <button className="px-3 rounded-btn border border-amber-700 text-amber-200 text-xs" style={{ minHeight: 44 }} onClick={make} disabled={waiting}>
            {waiting ? '수집기가 만드는 중…' : '지금 만들기'}
          </button>
        )}
        {c.rows.length > 0 && (
          <button className="px-3 rounded-btn border border-line text-xs" style={{ minHeight: 44 }}
            onClick={() => downloadText(`${c.vsl}-${c.voy} 엠티 찾기.csv`, emptyCsv(c))}>CSV</button>
        )}
        <button className="px-3 rounded-btn border border-line text-xs" style={{ minHeight: 44 }} onClick={() => window.print()}>인쇄</button>
      </div>
      {done && <div className={`text-xs mt-1 ${done.ok === false ? 'text-red-300' : 'text-emerald-300'}`}>{done.msg || (done.ok === false ? '실패' : '완료')}</div>}
      {err && <div className="text-xs mt-1 text-red-300">{err}</div>}
      {open && (
        <div className="mt-2 text-xs text-dim-200 space-y-1">
          {specs.map(([iso, cns]) => (<div key={iso}><b>{isoShown(iso)}</b> {cns.length}대 — <span className="break-all">{cns.join(' ')}</span></div>))}
        </div>
      )}
    </div>
  );
}

export default function EmptyFindPanel({ voyages, dictAll, inspector, canMake }) {
  const cards = maerskEmptyCards(voyages, dictAll);
  if (!cards.length) return <div className="text-xs text-dim-400 p-3">머스크 선적 항차가 없습니다.</div>;
  return <div className="space-y-2">{cards.map((c) => <EmptyFindCard key={c.vk} c={c} inspector={inspector} canMake={canMake} />)}</div>;
}
export { maerskEmptyCards };
