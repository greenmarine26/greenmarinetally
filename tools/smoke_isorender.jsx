// 3.6 화면 연막검사 진입점 — 초과 컨 입력창에 검산 알림이 실제로 그려지는지 본다.
import React from 'react';
import { createRoot } from 'react-dom/client';
import ExtraContainerModal from '../src/components/ExtraContainerModal.jsx';
import fx from './fixtures/iso_cns.json';

//  good = 실제 번호 · typo = 마지막 자리만 틀린 번호 · partial = 아직 치는 중
const good = fx.cns[0];
const typo = good.slice(0, 10) + String((Number(good[10]) + 1) % 10);
const which = window.__SMOKE_WHICH || 'good';
const value = which === 'typo' ? typo : which === 'partial' ? '4777' : good;
window.__SMOKE_EXPECT = { good, typo };

function Harness() {
  //  모달은 자기 상태로 입력을 받으므로, 렌더 뒤 input 에 값을 넣어 change 를 일으킨다.
  React.useEffect(() => {
    const el = document.querySelector('input');
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, []);
  return React.createElement(ExtraContainerModal, { open: true, mode: 'discharge', onClose: () => {}, onSave: async () => {} });
}
createRoot(document.getElementById('root')).render(React.createElement(Harness));
