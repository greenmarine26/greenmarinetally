// 5.00 새 판 첫 안내 — «화면 고르기» 1안·2안·3안을 하루 한 번만 짧게 보여 준다. 고르거나 «이대로 쓰기»를 누르면 다시 뜨지 않고, ✕ 는 그날만 닫는다.
//   검수사 2026-11-12 «전 검수사들에게 그중 원하는 화면으로 셋팅해서 사용하라고 하겠습니다» — 처음 연 사람이 어디서 고르는지 알게 한다.
//   ⚠ App 트리 밖 작은 뿌리 하나(main.jsx 가 부른다) — 화면 흐름(로그인·홈·작업)은 건드리지 않는다. 닫으면 언마운트된다.
//   5.00 감사 — 로그인 화면·열린 창(모달)이 있으면 뜨지 않고 기다린다 · 화면 위쪽(머리띠 밑)에 띄워 작업 화면 바닥 확인 단추를 덮지 않는다 ·
//     저장소(localStorage)가 막힌 기기는 sessionStorage → 메모리 순으로 «그 세션 한 번»만 뜬다.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { X } from 'lucide-react';
import { SKINS, getSkin, applySkin } from '../skin.js';

export const SKIN_INTRO_DAY = 'master_skin_intro_day_v1';
export const SKIN_CHOSEN = 'master_skin_chosen_v1';
const kstDay = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const _mem = {};
//  저장 — localStorage 가 막히면 sessionStorage, 그것도 막히면 이 탭의 메모리(그 세션 한 번)
const _get = (k) => { for (const st of ['localStorage', 'sessionStorage']) { try { const v = window[st].getItem(k); if (v != null) return v; } catch (e) { /* 다음 저장소 */ } } return k in _mem ? _mem[k] : null; };
const _set = (k, v) => { _mem[k] = v; for (const st of ['localStorage', 'sessionStorage']) { try { window[st].setItem(k, v); return true; } catch (e) { /* 다음 저장소 */ } } console.warn('[화면 고르기] 저장소가 막혀 이 화면에서만 기억합니다.'); return false; };

//  골랐다는 표시 — 설정 창에서 골라도 같은 표시를 남긴다(안내가 다시 뜨지 않게).
export function markSkinChosen() { _set(SKIN_CHOSEN, '1'); }
export function shouldShowSkinIntro() { return _get(SKIN_CHOSEN) !== '1' && _get(SKIN_INTRO_DAY) !== kstDay(); }
//  띄워도 되는 때 — 로그인 뒤 앱 본문이 있고, 로그인·작업 선박 고르기 화면이 아니고, 열린 창(전체 화면을 덮는 fixed)이 없을 때
export function skinIntroCanShow(doc = document) {
  if (!doc.querySelector('[data-app-main]')) return false;
  if (doc.querySelector('[data-login-choice]') || /#\/login/.test(String((doc.defaultView || window).location.hash || ''))) return false;
  return ![...doc.querySelectorAll('.fixed.inset-0, [role="dialog"]')].some((el) => !el.closest('[data-skin-intro-host]') && el.getBoundingClientRect().height > 0);
}

export function SkinIntro({ onDone, onClose }) {
  const [cur, setCur] = useState(getSkin);
  const pick = (n) => { setCur(applySkin(n)); };
  const done = () => { markSkinChosen(); onDone(); };
  return (
    <div className="fixed inset-x-0 z-[90] px-3" style={{ top: 'calc(var(--hdr-h, 56px) + 8px)' }} role="dialog" aria-label="화면 고르기 안내" data-skin-intro="1">
      <div className="mx-auto max-w-md bg-ink-850 border border-line-strong rounded-card shadow-lg p-4">
        <div className="flex items-start gap-2">
          <div className="text-base font-bold text-dim-100 flex-1">TallyOne 5.00 — 화면을 고를 수 있습니다</div>
          <button type="button" onClick={onClose || onDone} aria-label="오늘은 닫기" className="shrink-0 p-1 -mr-1 text-dim-300" data-skin-intro-close="1"><X className="w-5 h-5"/></button>
        </div>
        <div className="text-xs text-dim-300 mt-1">눌러 보면 바로 바뀝니다. 나중에도 메뉴(⋮) › 화면 · 소리 · 글자에서 바꿉니다.</div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {SKINS.map((s) => (
            <button key={s.n} onClick={() => pick(s.n)} aria-pressed={cur === s.n} data-skin-pick={s.n}
              className={`rounded-btn border px-2 py-2 text-left ${cur === s.n ? 'border-act bg-act/10' : 'border-line-strong bg-ink-800'}`} style={{ minHeight: 'var(--tap)' }}>
              <span className="flex gap-0.5 mb-1" aria-hidden="true">{s.sw.map((c, i) => <span key={i} className="inline-block w-3 h-3 rounded-full border border-line-strong" style={{ background: c }}/>)}</span>
              <span className={`block text-xs font-bold ${cur === s.n ? 'text-act' : 'text-dim-100'}`}>{s.label}</span>
            </button>
          ))}
        </div>
        <button onClick={done} className="mt-3 w-full rounded-btn bg-act text-act-on font-bold text-sm" style={{ minHeight: 'var(--tap)' }} data-skin-intro-done="1">이대로 쓰기</button>
      </div>
    </div>
  );
}

//  띄울 때가 올 때까지(로그인 뒤 · 창이 닫힌 뒤) 3초마다 본다 — 30분 넘게 못 띄우면 그날은 접는다(다음 날 다시).
export function mountSkinIntro() {
  if (typeof document === 'undefined' || !shouldShowSkinIntro()) return;
  let tries = 0;
  const tick = () => {
    if (!shouldShowSkinIntro()) return;
    if (!skinIntroCanShow()) { if (++tries < 600) setTimeout(tick, 3000); else _set(SKIN_INTRO_DAY, kstDay()); return; }   // 30분 넘게 못 띄우면 그날은 접는다(날짜를 적는다)
    _set(SKIN_INTRO_DAY, kstDay());   // 하루 한 번 — 띄운 날을 먼저 적는다(새로고침마다 다시 뜨지 않게)
    const host = document.createElement('div');
    host.setAttribute('data-skin-intro-host', '1');
    document.body.appendChild(host);
    const root = createRoot(host);
    //  안내가 떠 있는 동안 다른 창(모달)이 열리면 안내를 숨겨 그 창을 가리지 않는다 — 창이 닫히면 다시 보인다(1초마다 본다).
    const iv = setInterval(() => { host.style.display = skinIntroCanShow() ? '' : 'none'; }, 1000);
    const close = () => { clearInterval(iv); root.unmount(); host.remove(); };
    root.render(<SkinIntro onDone={close} onClose={close} />);
  };
  tick();
}
