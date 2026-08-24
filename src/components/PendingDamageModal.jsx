// 데미지 예약 모달 (TallyOne 2.03) — 자료가 오기 전에 컨번호로 데미지를 미리 걸어 둔다.
//   검수사 확정 2026-08-20: 카톡으로 «명일 양하 DSYU0070126 데미지» 사진을 받았는데 아무 자료도
//   도착하지 않아 컨 카드를 열 수 없었다 — «예약기능이 있어야 할것 같습니다».
//   저장: pendingDamage/{CN}/{ts} (firebase.js). 자료가 도착해 그 컨이 항차에 나타나면
//   VoyagePage 가 photos 로 승격 → CARGO DAMAGE REPORT·조회 사진에 자동 반영.
//   사진은 갤러리 첨부 가능(카톡에서 저장한 사진) — 촬영 전용이 아니다. 보관용은 1600px 축소.
import React, { useState, useEffect } from 'react';
import { X, Camera, Send, Trash2, CalendarClock } from 'lucide-react';
import { DAMAGE_TYPES, DAMAGE_PARTS } from '../kakaoShare.js';
import { fbAddPendingDamage, fbGetPendingDamage, fbDeletePendingDamage } from '../firebase.js';

const CN_RE = /^[A-Z]{4}\d{7}$/;

export default function PendingDamageModal({ inspector = '', onClose }) {
  const [cn, setCn] = useState('');
  const [photo1, setPhoto1] = useState(null);   // { blob, url } — 필수 (카톡으로 받은 사진 등)
  const [photo2, setPhoto2] = useState(null);   // 선택
  const [types, setTypes] = useState([]);
  const [parts, setParts] = useState([]);
  const [points, setPoints] = useState('1');
  const [dimW, setDimW] = useState(''); const [dimH, setDimH] = useState(''); const [dimD, setDimD] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);
  const [list, setList] = useState([]);         // 예약 목록 (waiting + promoted)

  const refresh = async () => {
    try {
      const all = await fbGetPendingDamage();
      const rows = [];
      Object.entries(all || {}).forEach(([c, m]) => Object.values(m || {}).forEach((e) => { if (e && e.ts) rows.push(e); }));
      rows.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      setList(rows);
    } catch (e) { /* 목록 실패해도 입력은 가능 */ }
  };
  useEffect(() => { refresh(); }, []);

  const pick = (setter) => (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setter({ blob: f, url: URL.createObjectURL(f) });
    e.target.value = '';
  };
  const toggle = (arr, setArr, code) => setArr(arr.includes(code) ? arr.filter((x) => x !== code) : [...arr, code]);

  const handleSave = async () => {
    const C = cn.toUpperCase().replace(/\s/g, '');
    if (!CN_RE.test(C)) { alert('컨테이너 번호 11자리를 확인하세요 — 예: DSYU0070126'); return; }
    if (!photo1) { alert('데미지 사진을 1장 이상 첨부하세요 (갤러리에서 골라도 됩니다)'); return; }
    if (types.length === 0) { alert('데미지 종류를 1개 이상 선택하세요'); return; }
    setSending(true);
    try {
      const toB64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('파일 읽기 실패')); r.readAsDataURL(blob); });
      const shrink = async (blob) => { try { const { compressForReport } = await import('../mixerUpload.js'); return await compressForReport(blob, 1600); } catch (e) { return blob; } };
      const dims = [dimW, dimH, dimD].some((x) => String(x).trim()) ? `${dimW || '?'} x ${dimH || '?'} x ${dimD || '?'}` : null;
      await fbAddPendingDamage(C, {
        data: await toB64(await shrink(photo1.blob)),
        detailPhoto: photo2 ? await toB64(await shrink(photo2.blob)) : null,
        photoKind: 'cn',
        damageTypes: types, damageParts: parts,
        points: String(points).trim() || null, dims,
        note: String(note).trim(), by: inspector || '',
      });
      setNotice({ tone: 'ok', msg: `${C} 예약됐습니다 — 자료가 도착해 이 컨이 항차에 나타나면 자동으로 데미지 기록에 붙습니다.` });
      setCn(''); setPhoto1(null); setPhoto2(null); setTypes([]); setParts([]); setPoints('1'); setDimW(''); setDimH(''); setDimD(''); setNote('');
      refresh();
    } catch (e) {
      setNotice({ tone: 'err', msg: '저장 실패 — 연결을 확인하고 다시 시도하세요: ' + (e?.message || e) });
    }
    setSending(false);
  };

  const chip = (on) => `px-2 py-1.5 rounded-pill text-xxs font-bold border ${on ? 'bg-orange-700 border-orange-500 text-white' : 'bg-ink-800 border-line text-dim-300'}`;

  return (
    <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-ink-900 border-2 border-orange-700/60 rounded-card w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-ink-900 border-b border-line px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-orange-300" />
            <div className="font-black text-base text-orange-200">📷 데미지 예약</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-ink-750 rounded-pill" aria-label="닫기"><X className="w-5 h-5 text-dim-300" /></button>
        </div>

        <div className="p-4 space-y-3">
          <div className="text-xxs text-dim-300 leading-relaxed">
            자료가 오기 전에 컨번호로 데미지를 미리 걸어 둡니다. 자료가 도착해 그 컨이 항차에 나타나면
            자동으로 데미지 기록에 붙고, CARGO DAMAGE REPORT와 조회 사진에도 실립니다.
          </div>

          <input value={cn} onChange={(e) => setCn(e.target.value.toUpperCase())} placeholder="컨테이너 번호 — DSYU0070126"
            className="w-full bg-ink-800 border-2 border-line focus:border-orange-500 focus:outline-none rounded-btn px-3 py-2.5 text-base mono text-center text-dim-100 placeholder-dim-400" />

          <div className="grid grid-cols-2 gap-2">
            {[[photo1, setPhoto1, '데미지 사진 (필수)'], [photo2, setPhoto2, '추가 사진 (선택)']].map(([p, setP, lbl], i) => (
              <div key={i} className="space-y-1">
                <div className="text-2xs font-black text-orange-300/80">{lbl}</div>
                {p ? (
                  <div className="relative">
                    <img src={p.url} alt="" className="w-full h-28 object-cover rounded-pill border border-line" />
                    <button onClick={() => setP(null)} className="absolute top-1 right-1 bg-black/70 rounded-full p-1"><X className="w-4 h-4 text-white" /></button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <label className="flex-1 h-14 rounded-pill bg-ink-800 border border-line-strong flex flex-col items-center justify-center text-2xs text-dim-200 font-bold cursor-pointer">
                      <Camera className="w-4 h-4 mb-0.5" />촬영
                      <input type="file" accept="image/*" capture="environment" onChange={pick(setP)} className="hidden" />
                    </label>
                    <label className="flex-1 h-14 rounded-pill bg-ink-800 border border-line-strong flex flex-col items-center justify-center text-2xs text-dim-200 font-bold cursor-pointer">
                      🖼 갤러리
                      <input type="file" accept="image/*" onChange={pick(setP)} className="hidden" />
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            <div className="text-2xs font-black text-orange-300/80 mb-1">데미지 종류 (복수 선택)</div>
            <div className="flex flex-wrap gap-1">{DAMAGE_TYPES.map((t) => (
              <button key={t.code} onClick={() => toggle(types, setTypes, t.code)} className={chip(types.includes(t.code))}>{t.label}</button>))}</div>
          </div>
          <div>
            <div className="text-2xs font-black text-orange-300/80 mb-1">부위 (복수 선택)</div>
            <div className="flex flex-wrap gap-1">{DAMAGE_PARTS.map((t) => (
              <button key={t.code} onClick={() => toggle(parts, setParts, t.code)} className={chip(parts.includes(t.code))}>{t.label}</button>))}</div>
          </div>

          <div className="flex items-center gap-2 text-xxs text-dim-200">
            <span className="font-bold">POINT</span>
            <input value={points} onChange={(e) => setPoints(e.target.value.replace(/\D/g, ''))} className="w-12 bg-ink-800 border border-line rounded px-2 py-1.5 text-center mono" />
            <span className="font-bold ml-2">치수(cm)</span>
            {[[dimW, setDimW, 'W'], [dimH, setDimH, 'H'], [dimD, setDimD, 'D']].map(([v, setV, ph]) => (
              <input key={ph} value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, ''))} placeholder={ph} className="w-12 bg-ink-800 border border-line rounded px-1 py-1.5 text-center mono placeholder-dim-500" />
            ))}
          </div>

          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="메모 — 예: 터미널 동민님 카톡 접수, 명일 양하분"
            className="w-full bg-ink-800 border border-line rounded-btn px-3 py-2 text-sm text-dim-100 placeholder-dim-400 resize-y" />

          {notice && (
            <div className={`text-xxs rounded-pill px-3 py-2 font-bold ${notice.tone === 'ok' ? 'bg-emerald-900/40 text-emerald-200' : 'bg-red-900/40 text-red-200'}`}>{notice.msg}</div>
          )}

          <button onClick={handleSave} disabled={sending}
            className="w-full h-12 rounded-btn bg-orange-700 hover:bg-orange-600 disabled:bg-ink-800 disabled:text-dim-400 text-white text-sm font-black flex items-center justify-center gap-2">
            <Send className="w-4 h-4" />{sending ? '저장 중…' : '예약 저장'}
          </button>

          {list.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-line">
              <div className="text-2xs font-black text-dim-300">예약 목록 ({list.length}건)</div>
              {list.map((e) => (
                <div key={`${e.cn}_${e.ts}`} className="flex items-center gap-2 bg-ink-800/60 border border-line rounded-pill px-2 py-1.5">
                  {e.data ? <img src={e.data} alt="" className="w-10 h-10 object-cover rounded" /> : null}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs2 mono font-bold text-dim-100">{e.cn}</div>
                    <div className="text-2xs text-dim-300 truncate">{(e.damageTypes || []).join(' ')} {(e.damageParts || []).join(' ')}</div>
                    <div className={`text-2xs font-bold ${e.status === 'promoted' ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {e.status === 'promoted' ? `✅ 반영됨 — ${e.promotedTo || ''}` : '⏳ 자료 대기 중'}
                    </div>
                  </div>
                  {e.status !== 'promoted' && (
                    <button onClick={async () => { if (confirm(`${e.cn} 예약을 지울까요?`)) { await fbDeletePendingDamage(e.cn, e.ts); refresh(); } }}
                      className="p-1.5 text-red-400 hover:bg-ink-750 rounded"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
