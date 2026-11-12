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
//  4.64 — 3갱이면 셋째 분 이름도 이 기기에 한 칸 더 둔다(검수사 2026-11-05 06:53 «3갱인 경우 3명 이름이 출력이 되어야 하는데 2명만 되어있습니다»).
const KEY2 = 'tally_partner_name2';
export function getPartnerName2() {
  try { return String(localStorage.getItem(KEY2) || '').trim(); } catch (e) { return ''; }
}
export function setPartnerName2(v) {
  try { localStorage.setItem(KEY2, String(v || '').trim()); } catch (e) { /* 저장 불가 환경 — 이번 화면에만 적용 */ }
}

//  짝 후보 명단 — 숨은 계정(클로드)과 로그인한 본인은 뺀다.
export function partnerChoices(me) {
  let all = [];
  try { all = allStaffNames(); } catch (e) { all = []; }
  const hide = new Set([...(HIDDEN_STAFF || []), String(me || '')]);
  return all.filter((n) => n && !hide.has(n));
}

//  인쇄 직전 질문 창 — 확인하면 onDone({ names:[나, 짝|''], solo }) . 이름이 비어 있어도 2장째는 나간다(빈칸 장).
//  crew — 지금 근무 조에 등록된 호기별 근무자 이름(호기 순). 있으면 나를 뺀 앞의 두 분을 짝·셋째 칸에 미리 채운다(주야 교대마다 그 조 사람이 자동으로 들어온다).
export function WorkerPrintDialog({ me, crew, onDone, onCancel }) {
  const others = (Array.isArray(crew) ? crew : []).map((n) => String(n || '').trim()).filter((n, i, a) => n && n !== String(me || '').trim() && a.indexOf(n) === i);   // 4.64-01: 같은 사람이 두 호기에 있어도 한 번만
  const [mine, setMine] = useState(String(me || ''));
  const [partner, setPartner] = useState(others[0] || getPartnerName());
  const [partner2, setPartner2] = useState(others.length ? (others[1] || '') : getPartnerName2());   // 4.64-01: 조 등록이 있으면 그 조 사람만 — 예전에 적은 셋째가 다시 채워지지 않게
  const [solo, setSolo] = useState(false);
  const go = () => {
    const p = partner.trim();
    const p2 = partner2.trim();
    if (p) setPartnerName(p);
    if (p2) setPartnerName2(p2); else if (!solo) setPartnerName2('');   // 4.64-01: 셋째를 비웠으면 기억도 비운다
    //  셋째 이름이 있을 때만 세 번째 장을 낸다(둘이 하는 분은 종전과 같이 두 장).
    onDone({ names: solo ? [mine.trim()] : (p2 ? [mine.trim(), p, p2] : [mine.trim(), p]), solo });
  };
  const box = { position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
  const card = { background: '#fff', color: '#111', borderRadius: 10, padding: 18, width: 'min(420px, 100%)', fontSize: 14 };
  const inp = { flex: 1, minWidth: 0, border: '1px solid #999', borderRadius: 6, padding: '9px 10px', font: 'inherit' };
  return (
    <div className="cpv2-noprint" style={box} role="dialog" aria-label="작업자 이름" data-testid="worker-dialog">
      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>같이 작업하는 분은 어느 분입니까?</div>
        <div style={{ color: '#555', fontSize: 12, marginBottom: 10 }}>이름을 모르시면 입력하지 말고 그냥 <b>출력</b>을 눌러 주세요. 이름 자리가 비어 있는 양하/선적 PLAN이 한 장 더 나옵니다. 3갱이면 셋째 분까지 적으면 세 장이 나옵니다.</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
          <label style={{ minWidth: 28, color: '#555' }}>나</label>
          <input data-testid="wk-me" value={mine} onChange={(e) => setMine(e.target.value)} style={inp} placeholder="내 이름" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
          <label style={{ minWidth: 28, color: '#555' }}>짝</label>
          <input data-testid="wk-partner" list="wk-staff" value={partner} disabled={solo} onChange={(e) => setPartner(e.target.value)} style={inp} placeholder="이름을 고르거나 입력" />
          <datalist id="wk-staff">{partnerChoices(mine).map((n) => <option key={n} value={n} />)}</datalist>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
          <label style={{ minWidth: 28, color: '#555' }}>셋째</label>
          <input data-testid="wk-partner2" list="wk-staff" value={partner2} disabled={solo} onChange={(e) => setPartner2(e.target.value)} style={inp} placeholder="3갱일 때만 — 없으면 비워 둠" />
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
