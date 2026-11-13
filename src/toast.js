// window.alert를 가로채 작업 흐름을 끊지 않는 토스트 알림으로 표시하는 전역 모듈
// 성공·안내는 초록·짧게, 실패·오류는 빨강·길게(탭으로 즉시 닫기). confirm/prompt는 건드리지 않음.

const DURATION_OK = 2600;    // 성공·안내: 잠깐 떴다 사라짐
const DURATION_ERR = 6000;   // 실패·오류: 더 오래 머물러 놓치지 않게

// 메시지에 실패 신호가 있으면 오류로 판정
function isError(msg) {
  const s = String(msg);
  return /실패|오류|에러|error|❌|⚠|없습니다|불가|권한이 없/i.test(s);
}

let containerEl = null;
function getContainer() {
  if (containerEl && document.body.contains(containerEl)) return containerEl;
  containerEl = document.createElement('div');
  containerEl.setAttribute('data-toast-root', '1');
  containerEl.style.cssText = [
    'position:fixed', 'left:50%', 'top:calc(var(--hdr-h, 56px) + 8px)', 'transform:translateX(-50%)',   // 4.87-10: 아래 가운데 → 머리띠 바로 밑(--hdr-h 는 아이폰 윗막대만큼 커진 머리띠 높이를 담는다)
    'z-index:2147483647', 'display:flex', 'flex-direction:column',
    'gap:8px', 'align-items:center', 'pointer-events:none',
    'max-width:92vw', 'width:max-content'
  ].join(';');
  document.body.appendChild(containerEl);
  return containerEl;
}

export function showToast(message, opts = {}) {
  const err = opts.error != null ? opts.error : isError(message);
  const root = getContainer();

  const el = document.createElement('div');
  el.textContent = String(message);
  el.setAttribute('data-toast', err ? 'err' : 'ok');   // 5.00: 화면 고르기 3안(큰 글자)이 글자를 키울 자리
  el.style.cssText = [
    'pointer-events:auto',
    'white-space:pre-line',          // 기존 alert의 \n 줄바꿈 유지
    'box-sizing:border-box',
    'max-width:92vw',
    'padding:13px 18px',
    'border-radius:12px',
    'font-size:15px', 'line-height:1.45', 'font-weight:600',
    'color:#fff',
    'box-shadow:0 6px 20px rgba(0,0,0,0.28)',
    'background:' + (err ? '#b91c1c' : '#047857'),   // 5.00: 흰 글자 대비 AA — 빨강 4.8→6.5 · 초록 3.3→5.5(종전 #16a34a 는 15px 흰 글자에 3.3:1)
    'opacity:0', 'transform:translateY(-8px)',   // 4.87-10: 위에서 내려온다
    'transition:opacity .18s ease, transform .18s ease',
    'cursor:pointer',
  ].join(';');

  // 탭하면 즉시 닫힘
  const remove = () => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px)';   // 4.87-10
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 200);
  };
  el.addEventListener('click', remove);

  root.appendChild(el);
  // 등장 애니메이션
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });

  setTimeout(remove, err ? DURATION_ERR : DURATION_OK);
}

// 기존 코드의 alert(...) 119곳을 한 줄도 안 고치고 토스트로 전환.
// confirm/prompt는 사용자 선택을 받아야 하므로 그대로 둔다.
export function installToastAlert() {
  if (typeof window === 'undefined') return;
  if (window.__toastInstalled) return;
  window.__toastInstalled = true;
  window.alert = function (msg) { showToast(msg); };
}
