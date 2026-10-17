// 카고플랜 인쇄 직전 «같이 작업하는 분» 질문 창과, 짝 이름 한 벌 저장·한 장 더 찍기(복제 인쇄)를 모은 공용 모듈 (TallyOne 4.32)
import React, { useState } from 'react';
import { allStaffNames, HIDDEN_STAFF } from './staffList.js';

const KEY = 'tally_partner_name';

//  짝 이름은 이 기기에만 저장한다(검수사 «수기로… 그 사람으로 로그인해야만 하기 때문») — 카고플랜 질문 창과 X-RAY 탭이 같은 값을 쓴다.
export function getPartnerName() {
  try { return String(localStorage.getItem(KEY) || '').trim(); } catch (e) { return ''; }
}
export function setPartnerName(v) {
  try { localStorage.setItem(KEY, String(v || '').trim()); } catch (e) { /* 저장 불가 환경 — 이번 화면에만 적용 */ }
}

//  짝 후보 명단 — 숨은 계정(클로드)과 로그인한 본인은 뺀다.
export function partnerChoices(me) {
  let all = [];
  try { all = allStaffNames(); } catch (e) { all = []; }
  const hide = new Set([...(HIDDEN_STAFF || []), String(me || '')]);
  return all.filter((n) => n && !hide.has(n));
}

//  인쇄 직전 질문 창 — 확인하면 onDone({ names:[나, 짝|''], solo }) . 이름이 비어 있어도 2장째는 나간다(빈칸 장).
export function WorkerPrintDialog({ me, onDone, onCancel }) {
  const [mine, setMine] = useState(String(me || ''));
  const [partner, setPartner] = useState(getPartnerName());
  const [solo, setSolo] = useState(false);
  const go = () => {
    const p = partner.trim();
    if (p) setPartnerName(p);
    onDone({ names: solo ? [mine.trim()] : [mine.trim(), p], solo });
  };
  const box = { position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
  const card = { background: '#fff', color: '#111', borderRadius: 10, padding: 18, width: 'min(420px, 100%)', fontSize: 14 };
  const inp = { flex: 1, minWidth: 0, border: '1px solid #999', borderRadius: 6, padding: '9px 10px', font: 'inherit' };
  return (
    <div className="cpv2-noprint" style={box} role="dialog" aria-label="작업자 이름" data-testid="worker-dialog">
      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>같이 작업하는 분은 어느 분입니까?</div>
        <div style={{ color: '#555', fontSize: 12, marginBottom: 10 }}>이름을 모르시면 입력하지 말고 그냥 <b>출력</b>을 눌러 주세요. 이름 자리가 비어 있는 카고플랜이 한 장 더 나옵니다.</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
          <label style={{ minWidth: 28, color: '#555' }}>나</label>
          <input data-testid="wk-me" value={mine} onChange={(e) => setMine(e.target.value)} style={inp} placeholder="내 이름" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
          <label style={{ minWidth: 28, color: '#555' }}>짝</label>
          <input data-testid="wk-partner" list="wk-staff" value={partner} disabled={solo} onChange={(e) => setPartner(e.target.value)} style={inp} placeholder="이름을 고르거나 입력" />
          <datalist id="wk-staff">{partnerChoices(mine).map((n) => <option key={n} value={n} />)}</datalist>
        </div>
        <label style={{ display: 'block', margin: '8px 0 12px', fontSize: 13 }}>
          <input data-testid="wk-solo" type="checkbox" checked={solo} onChange={(e) => setSolo(e.target.checked)} /> 혼자 작업합니다 (1장만)
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button data-testid="wk-go" onClick={go} style={{ flex: 1, padding: 11, background: '#1565c0', color: '#fff', border: 0, borderRadius: 8, fontWeight: 700, cursor: 'pointer', font: 'inherit' }}>출력</button>
          <button data-testid="wk-cancel" onClick={onCancel} style={{ padding: '11px 16px', background: '#eee', color: '#111', border: 0, borderRadius: 8, cursor: 'pointer', font: 'inherit' }}>취소</button>
        </div>
      </div>
    </div>
  );
}

//  머리줄 «# ____ , 이름» — 갱 번호는 수기로 쓰는 빈칸이다. 이름이 비면 밑줄 빈칸으로 둔다.
export function WorkerHeadMark({ name }) {
  const n = String(name || '').trim();
  const line = { display: 'inline-block', borderBottom: '1px solid #111', minWidth: 28, height: '1em', verticalAlign: 'baseline' };
  return (
    <span className="cpv2-wk" style={{ marginLeft: 10, whiteSpace: 'nowrap' }}>
      # <span style={line} /> ,&nbsp;
      <b className={`cpv2-wk-name${n ? '' : ' cpv2-wk-empty'}`} style={n ? undefined : { ...line, minWidth: 64 }}>{n}</b>
    </span>
  );
}

//  인쇄할 때만 «같은 장»을 이름만 바꿔 복제해 뒤에 붙인다 — 한 번의 인쇄 창에 여러 장이 나온다.
//  getNames() 는 [나, 짝…] — 0번째는 화면 원본(이미 그려져 있음)이고 1번째부터 복제한다.
export function installClonePrint(getWrap, getNames) {
  const made = [];
  const before = () => {
    const wrap = getWrap();
    const names = getNames() || [];
    if (!wrap || names.length < 2) return;
    let anchor = wrap;
    names.slice(1).forEach((nm) => {
      const c = wrap.cloneNode(true);
      c.setAttribute('data-wk-clone', '1');
      c.style.breakBefore = 'page'; c.style.pageBreakBefore = 'always';
      const el = c.querySelector('.cpv2-wk-name');
      if (el) {
        const t = String(nm || '').trim();
        el.textContent = t;
        if (!t) { el.className = 'cpv2-wk-name cpv2-wk-empty'; el.style.display = 'inline-block'; el.style.borderBottom = '1px solid #111'; el.style.minWidth = '64px'; el.style.height = '1em'; }
        else { el.className = 'cpv2-wk-name'; el.style.display = ''; el.style.borderBottom = ''; el.style.minWidth = ''; el.style.height = ''; }
      }
      anchor.after(c); made.push(c); anchor = c;
    });
  };
  const after = () => { while (made.length) { const c = made.pop(); if (c && c.parentNode) c.parentNode.removeChild(c); } };
  window.addEventListener('beforeprint', before);
  window.addEventListener('afterprint', after);
  return () => { window.removeEventListener('beforeprint', before); window.removeEventListener('afterprint', after); after(); };
}
