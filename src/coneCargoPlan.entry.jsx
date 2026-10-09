// 콘앱(cone.html)에서 검수앱 본체 카고플랜 V2를 그대로 띄우는 번들 진입점 (V7.45)
//   본체 PrintableCargoPlanV2 + cargoPlanCore + 베이사전(.def 내장 포함)을 React째 번들.
//   콘앱은 window.ConeCargoPlan.open(props) 한 줄로 본체와 100% 동일한 카고플랜을 연다.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import PrintableCargoPlanV2 from './components/PrintableCargoPlanV2.jsx';
import CargoDuoPills from './components/CargoDuoPills.jsx';   // ConeOne 2.60: 양하|선적 전환 단추(빈 쪽 안내 화면에서도 쓴다)
import { parseBAPLIE, parseAscFile, normalizeBay, isoToLabel, isPyeongtaekPort, computeShiftingMap, loadEdiIsDeparture, applySwapFix, swapFixList, normPortCode, applyCatosPos, applyAutoSwap, craneBaysByTime, isFlatRackContainer, restowMapFromDoc, shiftEvidenceCore, predictedShiftingForDisplay, setLaneRoutes} from './utils.js';   // 4.16: 예측 시프팅(종이 ◇)도 한 벌 — 항로 사전은 콘앱이 받아 넣는다   // ConeOne 2.44: 자리 판정도 한 벌   // TallyOne 2.89: 맞교환도 한 벌   // V9.05-03: 콘앱 파서 통합용 + ConeOne 1.2: 격자 파생용 + ConeOne 2.1-01: 시프팅 정본
// ConeOne 1.2: 베이뷰 격자 단일 소스 — 검수앱 BayPlan이 쓰는 바로 그 모듈들을 임포트해 재사용
import { getShipBayDictData } from './shipStructure.js';
import { isLoloShipByPolicy } from './shipPolicies.js';   // ConeOne 1.2-01: LOLO 판정 통합
import { enrichBayDef } from './bayDictAutoEnrich.js';
import { isUserOwnedBayDict } from './utils.js';   // TallyOne 1.11-01: 정본 판정 단일 소스
import { buildEmptyBayRenderData, buildBayGrid, buildBayPagesFromSummary, buildPosMap } from './cargoPlanCore.js';   // ★ ConeOne 2.4: 격자·짝은 cargoPlanCore 한 벌
import { extractShipMetaFromVoyage } from './shipMatrixBuilder.js';
import { pickCarrierOp } from './utils.js';   // TallyOne 3.66-01 · ConeOne 2.55-02: 선사 고르기 한 벌
import { shipOpMapper } from './data/tallyFormats.js';   // 같은 판: 그 배 마감텔리 코드로 읽기 한 벌

let _root = null;
let _host = null;

function close(opts) {
  try { if (_root) _root.unmount(); } catch (e) {}
  if (_host && _host.parentNode) _host.parentNode.removeChild(_host);
  _root = null; _host = null;
  unlockOrientation();   // ConeOne 2.60: 첫 화면(양하|선적)이 걸어 둔 가로 잠금은 닫을 때 반드시 푼다 — 콘 계산기는 세로
  const o = opts || {};   // 단추의 onClick 으로 불리면 이벤트가 들어온다 — 아래 두 키는 없으니 그냥 지나간다
  if (!o.keepGuard) dropBackGuard(!o.fromPop);
}

//  ★ ConeOne 2.60 감사(R4) — 폰 «뒤로가기» 로 첫 화면(양하|선적)이 닫히게 한다. 안 하면 안드로이드 뒤로가기가 도면이 아니라 콘앱을 나간다.
//    베이뷰 전체화면(cone.html)과 같은 방식 — 열 때 history 한 칸을 쌓고, 뒤로가기(popstate)면 닫는다. 단추로 닫으면 쌓은 칸을 되감는다.
let _pushed = false;
let _popFn = null;
function dropBackGuard(rewind) {
  if (_popFn) { window.removeEventListener('popstate', _popFn); _popFn = null; }
  if (_pushed) {
    _pushed = false;
    if (rewind) {
      try { if (window.history.state && window.history.state.coneDuo) window.history.back(); }
      catch (e) { console.debug('[콘앱 2.60] 뒤로가기 칸 되감기 건너뜀:', e && e.message); }
    }
  }
}
function raiseBackGuard() {
  if (_pushed) return;
  try {
    window.history.pushState({ coneDuo: 1 }, '');
    _pushed = true;
    _popFn = () => close({ fromPop: true });
    window.addEventListener('popstate', _popFn);
  } catch (e) { console.debug('[콘앱 2.60] 뒤로가기 칸 쌓기 실패 — 뒤로가기는 앱을 나갈 수 있습니다:', e && e.message); }
}

//  ★ ConeOne 2.60 — 가로 잠금(best effort). 설치형 앱·전체화면에서만 허용되고 나머지 브라우저는 거절한다 —
//    거절돼도 화면은 V2 가 «세로면 도면을 90도 돌려 가로로 펴는» 길로 간다(둘 중 하나는 늘 된다). 거절 이유는 콘솔에만 남긴다(검수사 화면에 띄울 일이 아니다).
function lockLandscape() {
  try {
    const so = (typeof window !== 'undefined' && window.screen) ? window.screen.orientation : null;
    if (so && typeof so.lock === 'function') {
      const r = so.lock('landscape');
      if (r && typeof r.catch === 'function') r.catch((e) => console.debug('[콘앱 2.60] 가로 잠금은 이 기기에서 안 됩니다 — 도면을 돌려 가로로 폅니다:', e && e.message));
    }
  } catch (e) { console.debug('[콘앱 2.60] 가로 잠금 호출 실패 — 도면을 돌려 가로로 폅니다:', e && e.message); }
}
function unlockOrientation() {
  try {
    const so = (typeof window !== 'undefined' && window.screen) ? window.screen.orientation : null;
    if (so && typeof so.unlock === 'function') so.unlock();
  } catch (e) { console.debug('[콘앱 2.60] 가로 잠금 풀기 건너뜀(걸린 적 없음):', e && e.message); }
}

//  ★ TallyOne 3.66-01 · ConeOne 2.55-02 — **선사는 그 배 마감텔리 코드로**(검수사 2026-09-28 «모든 선사기준은 마감 텔리로 해야 합니다»).
//    콘앱 카고플랜 별첨은 리스트(records) 선사를 그대로(EDI 에만 있는 컨은 선사 없이) 찍어, 검수앱이 배별 사전으로 바꿔 읽는
//    CKC·SHI·SNK·NSS 같은 값이 여기서만 남았다(3.51-02 이 남긴 숙제 «콘앱은 아직 SOC 로 답한다»). 별첨 병합(cone.html)은 pickCarrierOp 로 고르고,
//    ⇒ 검수앱 카고플랜이 지나는 것과 **같은 매퍼**(shipOpMapper)를 여기 한 곳에서 씌운다. 배 약자는 항차 키 앞(voyageInfo.code).
function _opFixProps(props) {
  const code = String((props && props.voyageInfo && (props.voyageInfo.code || props.voyageInfo.vsl)) || '').toUpperCase();
  const all = [...((props && props.containers) || []), ...((props && props.legendContainers) || [])];
  const sp = shipOpMapper(code, all.map((c) => c && c.op));
  const fix = (arr) => (Array.isArray(arr) ? arr.map((c) => ((c && c.op) ? { ...c, op: sp(c.op) } : c)) : arr);
  return { ...props, containers: fix(props && props.containers), legendContainers: fix(props && props.legendContainers) };
}

function open(props) {
  close();
  props = _opFixProps(props || {});
  _host = document.createElement('div');
  document.body.appendChild(_host);
  _root = createRoot(_host);
  _root.render(
    //  ★ 3.33 — 콘앱 카고플랜은 **줄을 통째로 뒤집어** 낮은 베이부터 높은 베이로 간다(선수가 왼쪽).
    //    검수사 확정 2026-09-08 «콘앱은 검수 카고플랜을 뒤집은 형태» · «우측으로» · «낮은베이부터 높은베이로».
    //    검수앱은 `cargoPlanCore.autoPageLayout` 이 «큰 번호 좌측»(도면 규칙)이라 그 반대다.
    //    ⚠ `flipBays` 를 앞에 두고 props 를 뒤에 편다 — 콘앱이 넘기는 8개 키에 `flipBays` 가 없으므로
    //      지금은 언제나 켜진다. 훗날 호출부가 그 키를 넣으면 호출부가 이긴다(끄고 싶을 때의 문이다).
    <PrintableCargoPlanV2 flipBays {...props} onClose={close} />
  );
}

//  ★ ConeOne 2.60 — **콘앱 첫 화면: 양하(왼쪽 쪽)·선적(오른쪽 쪽) 카고플랜을 한 화면에서 좌우로 넘긴다.**
//    검수사 2026-10-04 «카고플랜 (양하, 선적)화면은 반드시 가로모드 상태로 보여줘야 합니다» · 닫으면 콘 계산기.
//    카고플랜 본체(V2)는 한 번에 한 쪽만 그린다(싱글턴 질의 `.cpv2-overlay .cpv2-page` 가 둘이면 맞춤·회전이 엉킨다) —
//    쪽을 넘기면 다른 쪽 props 로 다시 세운다. 세로로 들고 있으면 V2 가 도면을 90도 돌려 가로로 펴므로,
//    이 파일의 «쪽 넘기기» 방향도 같이 돈다(화면 위로 밀면 도면의 왼쪽 → 다음 쪽).
function useWinSize() {
  const [s, setS] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const f = () => setS({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', f); window.addEventListener('orientationchange', f);
    return () => { window.removeEventListener('resize', f); window.removeEventListener('orientationchange', f); };
  }, []);
  return s;
}

//  한 쪽이 비었을 때 — «선적 자료 없음» 한 줄. 글자는 도면과 같은 가로 틀(세로면 90도)로 놓고,
//  단추 묶음은 돌리지 않고 도면 쪽과 같은 자리에 둔다(PrintableCargoPlanV2 의 duo 자리와 한 벌 — 쪽을 넘겨도 단추가 안 움직인다).
//  ⚠ 돌린 틀 안에 단추를 두면 세로 화면에서 오른쪽 아래로 가 미르 고양이에 닫기가 가려진다(실측).
function DuoEmpty({ label, duo, onClose }) {
  const { w, h } = useWinSize();
  const portrait = h > w;
  const W = Math.max(w, h), H = Math.min(w, h);
  const frame = { position: 'fixed', width: W, height: H, left: (w - W) / 2, top: (h - H) / 2, transformOrigin: 'center', transform: portrait ? 'rotate(90deg)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const barPos = portrait ? { top: 8, right: 8 } : { bottom: 8, right: 68 };
  return createPortal(
    <div className="cpv2-duo-empty" style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#475569', overflow: 'hidden' }}>
      <div style={frame}>
        <div style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700 }}>{label}</div>
      </div>
      <div className="cpv2-noprint" style={{ position: 'fixed', ...barPos, display: 'flex', gap: 6 }}>
        <CargoDuoPills duo={duo} />
        <button type="button" onClick={onClose} style={{ padding: '6px 10px', background: '#37474f', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>✕ 닫기</button>
      </div>
    </div>,
    document.body
  );
}

//  ★ 감사(R3) — 도면 그리기가 죽으면 React 18 은 루트를 통째로 내려 화면은 사라지지만 close() 가 안 불려 가로 잠금·isOpen 이 남는다.
//    그래서 죽으면 스스로 닫고(잠금·뒤로가기 칸 정리) 콘솔에 남기고 한 줄 알린다. 콘앱엔 tailwind 가 없어 검수앱 ErrorBoundary 화면은 못 쓴다.
class DuoBoundary extends React.Component {
  constructor(props) { super(props); this.state = { dead: false }; }
  static getDerivedStateFromError() { return { dead: true }; }
  componentDidCatch(err, info) {
    console.error('[콘앱 2.60] 카고플랜 첫 화면 렌더 오류 — 닫고 콘 계산기로 돌아갑니다:', err, info && info.componentStack);
    const msg = String((err && err.message) || err || '');
    setTimeout(() => { try { this.props.onClose(); } catch (e) { console.error('[콘앱 2.60] 오류 뒤 닫기 실패:', e); } try { alert('카고플랜을 그리다 오류가 났습니다. 콘 계산기로 돌아갑니다.\n' + msg); } catch (e) { console.debug('[콘앱 2.60] 알림창을 못 띄웠습니다(오류는 위 콘솔에 남김):', e && e.message); } }, 0);
  }
  render() { return this.state.dead ? null : this.props.children; }
}

function DuoHost({ data, onClose }) {
  const [mode, setMode] = useState(data.start || 'discharge');
  const [dir, setDir] = useState(0);
  const modeRef = useRef(mode); modeRef.current = mode;
  const win = useWinSize();
  const pick = useCallback((m) => {
    if (m === modeRef.current) return;
    setDir(m === 'loading' ? 1 : -1);
    setMode(m);
  }, []);
  //  좌우(세로로 들면 상하) 밀기 — 손가락 하나·충분히 길고 한 방향일 때만. 확대해서 도면을 끌고 있으면(스크롤 여지가 있으면) 넘기지 않는다.
  useEffect(() => {
    let st = null;
    //  확대해서 도면이 화면보다 커졌으면(밀기 방향 길이가 화면 이상) 손가락은 도면을 끄는 중이다 — 쪽을 넘기지 않는다.
    //  ⚠ 겹을 가진 스크롤 길이(scrollWidth)로 재지 않는다 — 인쇄용 요소 때문에 맞춤 상태에서도 화면보다 길게 나온다(실측 SWMM 1836 ↔ 844).
    const zoomedAlong = (portrait) => {
      const pg = document.querySelector('.cpv2-overlay .cpv2-page');
      if (!pg) return !document.querySelector('.cpv2-duo-empty, .cpv2-overlay-fallback');   // 도면이 없어도 «자료 없음» 화면이면 확대 중이 아니다 — 밀어서 돌아올 수 있어야 한다
      const r = pg.getBoundingClientRect();
      return (portrait ? r.height : r.width) > (portrait ? window.innerHeight : window.innerWidth) - 4;
    };
    const onStart = (e) => {
      if (!e.touches || e.touches.length !== 1) { st = null; return; }
      if (e.target && e.target.closest && e.target.closest('button, input, textarea, select, #mirSheet')) { st = null; return; }   // 단추 · 입력창 · 미르 시트 안의 동작은 도면을 넘기지 않는다
      st = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    //  밀기가 시작되면 브라우저 기본 동작(뒤로 가기 스와이프·당겨서 새로고침)을 끊는다 — 안 끊으면 오른쪽 밀기에 콘앱이 통째로 나간다(실측 about:blank).
    //  overscroll-behavior 만으로는 이 화면에서 안 막혔다 — 스크롤이 시작되기 전(취소 가능한 동안)에 판정해 preventDefault 한다. 확대해서 끄는 중이면 건드리지 않는다.
    const onMove = (e) => {
      if (!e.touches || e.touches.length > 1) { st = null; return; }
      if (!st || !e.touches[0]) return;
      const portrait = window.innerHeight > window.innerWidth;
      const dx = e.touches[0].clientX - st.x, dy = e.touches[0].clientY - st.y;
      const along = portrait ? dy : dx, across = portrait ? dx : dy;
      if (Math.abs(along) > 6 && Math.abs(along) > Math.abs(across) && !zoomedAlong(portrait) && e.cancelable) e.preventDefault();
    };
    const onEnd = (e) => {
      if (!st) return;
      const t = e.changedTouches && e.changedTouches[0];
      const s0 = st; st = null;
      if (!t) return;
      const dx = t.clientX - s0.x, dy = t.clientY - s0.y;
      const portrait = window.innerHeight > window.innerWidth;
      const along = portrait ? dy : dx, across = portrait ? dx : dy;
      if (Math.abs(along) < 70 || Math.abs(along) < Math.abs(across) * 1.8) return;
      if (zoomedAlong(portrait)) return;
      pick(along < 0 ? 'loading' : 'discharge');
    };
    document.addEventListener('touchstart', onStart, { capture: true, passive: true });
    document.addEventListener('touchmove', onMove, { capture: true, passive: false });
    document.addEventListener('touchend', onEnd, { capture: true, passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart, { capture: true });
      document.removeEventListener('touchmove', onMove, { capture: true });
      document.removeEventListener('touchend', onEnd, { capture: true });
    };
  }, [pick]);
  //  PC 에서는 ← → 키로도 넘긴다.
  useEffect(() => {
    const k = (e) => {
      const t = e.target;
      if (t && ((t.tagName && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) || t.isContentEditable)) return;   // 미르 입력창에서 커서를 옮길 때 도면이 넘어가지 않게
      if (e.key === 'ArrowRight') pick('loading'); else if (e.key === 'ArrowLeft') pick('discharge');
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [pick]);
  const tabs = [
    { mode: 'discharge', label: `양하 ${data.counts && data.counts.discharge != null ? data.counts.discharge : ''}`.trim() },
    { mode: 'loading', label: `선적 ${data.counts && data.counts.loading != null ? data.counts.loading : ''}`.trim() },
  ];
  const duo = { mode, tabs, onPick: pick };
  const props = mode === 'discharge' ? data.discharge : data.loading;
  const portrait = win.h > win.w;
  //  ⚠ overscroll-behavior — 쪽을 넘기는 밀기(오른쪽으로 밀기·세로로 들었을 땐 아래로 밀기)가 브라우저 «뒤로 가기»·«당겨서 새로고침» 으로 먹히면 콘앱이 통째로 사라진다(실측: 오른쪽 밀기에 about:blank 로 나갔다).
  //    첫 화면이 떠 있는 동안만 막는다(닫으면 이 style 이 같이 없어진다).
  const slide = `html,body{overscroll-behavior:none}.cpv2-overlay{overscroll-behavior:none;animation:cpDuoIn .2s ease-out backwards}@keyframes cpDuoIn{from{opacity:0;transform:translate(${portrait ? 0 : dir * 40}px,${portrait ? dir * 40 : 0}px)}to{opacity:1;transform:none}}`;
  return (
    <>
      <style>{slide}</style>
      {props
        ? <PrintableCargoPlanV2 key={mode} flipBays {...props} duo={duo} onClose={onClose} />
        : <DuoEmpty key={mode} label={mode === 'loading' ? '선적 자료 없음' : '양하 자료 없음'} duo={duo} onClose={onClose} />}
    </>
  );
}

//  양하·선적 한 쌍으로 연다. data = { discharge: props|null, loading: props|null, start, counts:{discharge,loading} }
function openDuo(data) {
  close({ keepGuard: true });   // 이미 떠 있던 첫 화면을 치우되 뒤로가기 칸은 이어 쓴다(되감기와 새로 쌓기가 엇갈리지 않게)
  data = data || {};
  const fix = (p) => (p ? _opFixProps(p) : null);
  const d = { ...data, discharge: fix(data.discharge), loading: fix(data.loading) };
  if (!d.discharge && !d.loading) return false;
  if (!d.start) d.start = d.discharge ? 'discharge' : 'loading';
  _host = document.createElement('div');
  document.body.appendChild(_host);
  _root = createRoot(_host);
  lockLandscape();
  raiseBackGuard();
  _root.render(<DuoBoundary onClose={close}><DuoHost data={d} onClose={close} /></DuoBoundary>);
  return true;
}

function isOpen() { return !!_root; }

window.ConeCargoPlan = { open, openDuo, close, isOpen };

// V9.05-03: 파서 단일 소스 통합 — 콘앱(cone.html)이 본체 parseBAPLIE/parseAscFile을 그대로 쓰도록 노출.
//   콘앱 내부 약식 파서의 Full/Empty 미인식(실측: EQD 상태 +5/+4 안 읽음)·ISO 불일치 해소.
//   숫자코드 BAPLIE(CASP)·IFCSUM(RIZHAO)도 parseBAPLIE가 내부 라우팅하므로 콘앱에서 그대로 처리됨.
// ConeOne 1.9 (검수사 확정 2026-08-23) — **판정도 같이 내보낸다.**
//   검수사: *«그럼 같은 파서야만 하는데 파서가 틀리다는 이야기 인가요?»*
//   파서는 이미 같았다. 갈린 것은 **파서 뒤의 판정**이다 — 번들이 파서 둘만 내보내서
//   콘앱은 평택 여부를 자기 정규식 `/(PTK|PYT|PYOTM|PYO)$/` 로 판정할 수밖에 없었다.
//   그래서 `PTK02`(부두번호, 실측 407건)·`PYEONGTAEK` 철자를 **평택이 아니라고** 봤다
//   — TallyOne 1.11 이 511건 오판을 고친 그 수정이 콘앱에는 안 넘어간 것이다.
//   ⚠ 콘앱에서 이 판정은 **7곳**에서 쓰인다(평택분 집계·양하/선적 갈래·시프팅). 시프팅만의 문제가 아니었다.
// ConeOne 2.1-01 (검수사 실측 2026-08-23) — **시프팅 판정도 같이 내보낸다.**
//   검수사: *«콘앱에서는 양하베이도 아닌데 시프팅이 표기 됩니다. 파서에 뭔가 오염이 된듯합니다»*
//   파서는 멀쩡했다. 콘앱이 **정본의 1차 체(통과화물)까지만** 복사해 두고 그 뒤 체 둘을 안 했다.
//   실측 MCSN 632N — 콘앱 5대(베이 6·3대 + 베이 99·2대)인데 평택 작업이 있는 홀드 베이는
//   17 18 19 25 26 27 34 35 뿐이라 **다섯 대 전부 허수**였고 정본은 0대다.
//   1.9 때 파서·평택판정을 합치면서 **시프팅만 빠뜨렸다** — 같은 처방을 여기에도 적용한다.
// TallyOne 2.89 — **맞교환(swapFix)도 같이 내보낸다.** 검수앱이 두 컨 자리 기록을 맞바꾸면
//   콘앱 시프팅도 같은 겹침을 봐야 한다 — 안 그러면 «콘앱 66 · 검수앱 95»(2.5 사고)가 재발한다.
// ★ ConeOne 2.44 (검수사 2026-09-09 «검수앱은 빈칸없이 선적이 되는데 콘앱은 실시간 저장이 계획된 컨으로 지정 되는것 같습니다») —
//   **자리 판정도 같이 내보낸다.** 검수앱은 구독 콜백에서 `applyCatosPos`(터미널 자리) 다음에 `applyAutoSwap`(3.13 —
//   밀려난 계획 컨을 비운 자리로 맞교환)을 돌려 «검은곳이나 흰곳» 과 겹침을 0 으로 만든다(검수사 확정 2026-09-06).
//   콘앱은 보관소를 따로 읽는 독립 화면이라 그 덧칠을 못 받아 **계획 자리에 그대로** 그렸다 —
//   실측 STSE 2669E 선적(계획 426·실적 295) — 콘앱만 59대가 검수앱과 다른 칸이었고 그 59대가 그대로 겹침 59칸이었다(20번 30 · 16번 15 · 24번 9 · 4번 5).
//   1.9(파서·평택판정)·2.23(시프팅)과 같은 처방이다 — 판정 두 벌 금지(규범 §4-4).
// ★ ConeOne 2.46 (검수사 2026-09-09 «콘앱이 동방의 갱호기를 못찾는이유 다른클로드가 갱호기를 지정했는데 반영이 안되는 이유?») —
//   **호기↔베이 판정도 같이 내보낸다.** 동방 termWork 에는 `equip`(호기)이 아예 없어(실측 OBWH 2735E 52건 전부)
//   콘앱은 «베이 14» 처럼 해치 이름으로 칸을 갈랐다(2.28). 검수앱은 3.38 에서 그 자리를 풀었다 —
//   **크레인 하나는 같은 시각에 두 베이를 못 한다**는 규칙으로 시각 바구니를 갈라 호기를 되살린다(`craneBaysByTime`).
//   그 함수가 `utils.js` 에 있는데 콘앱 번들이 안 내보내 콘앱은 그 답을 못 봤다(실측 — cone.html·번들에 이름 0건).
//   ⇒ 콘앱이 **같은 함수**를 부른다. 콘앱이 제 규칙을 새로 만들면 두 화면이 또 갈린다(규범 §4-4).
window.ConeParse = { parseBAPLIE, parseAscFile, isPyeongtaekPort, normPortCode, computeShiftingMap, loadEdiIsDeparture, applySwapFix, swapFixList, applyCatosPos, applyAutoSwap, craneBaysByTime, isFlatRackContainer, restowMapFromDoc, pickCarrierOp, shiftEvidenceCore, predictedShiftingForDisplay, setLaneRoutes };   // 4.16: 확정 지도가 빈 배의 예측 시프팅(카고플랜 ◇ — 확정 아님)   // 4.13: 시프팅 근거·상태(미확정/확정/불일치)도 한 벌 — 카고플랜 머리(콘앱은 머리 상태만)와 검수앱 미르 답이 부른다
//   // 3.66-01: 리스트 선사가 EDI 선사를 덮는 자리도 한 벌(cone.html 별첨 병합)   // 3.44: 선사 시프팅 목록 판정도 한 벌   // 2.41: 항구 코드 정규화도 한 벌로(콘앱 short 가 쓴다)

// ConeOne 1.2-01: LOLO 판정 단일 소스 — 검수앱 선박정책(lolo 플래그, RZOR 전용)을 콘앱에 노출.
window.ConeShipPolicy = { isLolo: isLoloShipByPolicy };

// ═══════════════════════════════════════════════════════════════════
// ConeOne 1.2: 콘앱 베이뷰 격자 파생 — 검수앱 BayPlan.jsx 규칙 그대로 (단일 소스)
//   목적: 콘앱 베이뷰가 검수앱 베이플랜과 같은 모양(존재 칸·X 그림자·숨김)이 되도록,
//   BayPlan.jsx의 격자 파생 로직을 행 번호 주석과 함께 재구성해 노출한다.
//   (BayPlan.jsx는 JSX/useMemo에 얽혀 함수 추출이 불가 — 규칙별 원본 행 번호를 주석으로 대응)
//   반환: { pages: [ { title, evenBay, oddBay, mode:'coord'|'flex', ... } ] }
// ═══════════════════════════════════════════════════════════════════
export function buildConeBayGrid(containers, shipInfo) {
  shipInfo = shipInfo || {};
  const shipImo = shipInfo.imo || '';
  const shipName = shipInfo.name || '';
  containers = Array.isArray(containers) ? containers : [];

  // BayPlan.jsx 232-235: _vslCode — 빌더와 동일 코드 신원 (voyage info 기반)
  let _vslCode = '';
  try { _vslCode = extractShipMetaFromVoyage({ info: shipInfo.voyageInfo || null })?.code || ''; } catch (e) { _vslCode = ''; }

  // BayPlan.jsx 115-127: bayGroups — 키를 정규화된 정수 문자열로 통일
  const bayGroups = {};
  containers.forEach(c => {
    if (!c.bay) return;
    const key = normalizeBay(c.bay);
    if (!key) return;
    if (!bayGroups[key]) bayGroups[key] = [];
    bayGroups[key].push(c);
  });

  // BayPlan.jsx 171-199: globalRowRange — 좌우 균형 (전 베이 통일, 데크/홀드 분리)
  const globalRowRange = (() => {
    let deckLeft = 0, deckRight = 0, deckHas00 = false;
    let holdLeft = 0, holdRight = 0, holdHas00 = false;
    for (const c of containers) {
      if (!c.row || !c.tier) continue;
      const n = parseInt(c.row);
      const tier = parseInt(c.tier || 0);
      if (!tier) continue;
      const isDeck = tier >= 80;
      if (n === 0) {
        if (isDeck) deckHas00 = true; else holdHas00 = true;
        continue;
      }
      if (isDeck) {
        if (n % 2 === 0) deckLeft = Math.max(deckLeft, n);
        else deckRight = Math.max(deckRight, n);
      } else {
        if (n % 2 === 0) holdLeft = Math.max(holdLeft, n);
        else holdRight = Math.max(holdRight, n);
      }
    }
    return {
      maxLeft: Math.max(deckLeft, holdLeft),
      maxRight: Math.max(deckRight, holdRight),
      has00: deckHas00 || holdHas00,
      deck: { maxLeft: deckLeft, maxRight: deckRight, has00: deckHas00 },
      hold: { maxLeft: holdLeft, maxRight: holdRight, has00: holdHas00 },
    };
  })();

  // BayPlan.jsx 204-211: globalTiers — 선박 전체 tier 풀
  const globalTiers = (() => {
    const ts = new Set();
    for (const c of containers) { if (c.tier) ts.add(c.tier); }
    return Array.from(ts);
  })();

  // BayPlan.jsx 222-229: ediBayCount — 현재 EDI 실제 베이 수
  const ediBayCount = (() => {
    const s = new Set();
    for (const c of containers) {
      const n = parseInt(c.bay, 10);
      if (Number.isFinite(n) && n > 0) s.add(n);
    }
    return s.size;
  })();

  // BayPlan.jsx 244·269: 사전 조회 — getShipBayDictData (검수앱과 동일 인자)
  let dict = null;
  if (shipImo || shipName) {
    try { dict = getShipBayDictData(shipImo, shipName, { ediBayCount, vslCode: _vslCode, callsign: (shipInfo.voyageInfo && shipInfo.voyageInfo.callsign) || '', vslFull: shipName || '' }); }
    catch (e) { console.warn('[ConeOne 1.2] 베이사전 조회 실패 — EDI 폴백', e); dict = null; }
  }

  // BayPlan.jsx 240-262: dictBayList — baysSummary 우선, 유령 bayList 미사용
  const dictBayList = (() => {
    if (!dict || !dict.bayDef) return null;
    const summary = dict.bayDef.baysSummary;
    let list = null;
    if (Array.isArray(summary) && summary.length > 0) {
      const sBays = summary
        .map(b => (b.bayNo != null ? b.bayNo : b.bay))
        .filter(x => x != null && String(x).trim() !== '');
      if (sBays.length > 0) list = sBays;
    }
    if (!list) return null;
    if (list.length < 2) return null;
    const ints = list.map(b => parseInt(b, 10)).filter(n => Number.isFinite(n) && n > 0);
    if (ints.length < 2) return null;
    return [...new Set(ints)].sort((a, b) => a - b);
  })();

  // BayPlan.jsx 268-287: dictBaysSummary — enrichBayDef 보강 (source='user'면 차단)
  const dictBaysSummary = (() => {
    if (!dict || !dict.bayDef || !dict.bayDef.baysSummary) return {};
    const m = {};
    try {
      // TallyOne 1.11-01: 정본 판정은 조회 경로(source)가 아니라 항목 안쪽(isUserOwnedBayDict). Firebase 경유 정본이 자동 사전 취급되던 결함.
      const enrichedEntry = enrichBayDef({ bayDef: dict.bayDef }, dict._v5Matrix, containers, isUserOwnedBayDict(dict) ? 'user' : dict.source);
      enrichedEntry.bayDef.baysSummary.forEach(b => { m[parseInt(b.bayNo, 10)] = b; });
    } catch (e) { console.warn('[ConeOne 1.2] 베이사전 보강 실패', e); return {}; }
    return m;
  })();

  // ★ ConeOne 2.4: 격자 한 벌(buildBayGrid)·짝 한 벌(buildBayPagesFromSummary)에 넘길 전체 bayDef.
  const dictBayDefObj = (() => {
    if (!dict || !dict.bayDef || !dict.bayDef.baysSummary) return null;
    try {
      const _isUser = isUserOwnedBayDict(dict);
      const enrichedEntry = enrichBayDef({ bayDef: dict.bayDef }, dict._v5Matrix, containers, _isUser ? 'user' : dict.source);
      return { ...enrichedEntry.bayDef, source: dict.source, _userOwned: _isUser, code: dict.code || '' };
    } catch (e) { console.warn('[ConeOne 2.4] bayDef 구성 실패', e); return null; }
  })();

  // BayPlan.jsx 289-300: globalGridCols — 전 베이 최대 그리드 폭 (베이 간 정렬 기준)
  const globalGridCols = (() => {
    let w = 1;
    for (const k in dictBaysSummary) {
      const e = dictBaysSummary[k];
      if (!e) continue;
      const dc = Array.isArray(e.deckCells) && e.deckCells.length ? Math.max(...e.deckCells.map(n => parseInt(n) || 0)) : 0;
      const hc = Array.isArray(e.holdCells) && e.holdCells.length ? Math.max(...e.holdCells.map(n => parseInt(n) || 0)) : 0;
      w = Math.max(w, parseInt(e.rowCount) || 0, dc, hc);
    }
    const r = globalRowRange;
    const lenOf = (g) => (g ? Math.ceil((g.maxLeft || 0) / 2) + Math.ceil((g.maxRight || 0) / 2) + (g.has00 ? 1 : 0) : 0);
    w = Math.max(w, lenOf(r?.deck), lenOf(r?.hold));
    return w;
  })();

  // BayPlan.jsx 302-395: pages — .def(사전) 우선, 없으면 EDI 폴백 페어링
  const pages = (() => {
    const dispBay = (n) => n >= 100 ? String(n) : String(n).padStart(2, '0');
    const keyBay = (n) => String(n);
    let bayInts;
    let usingDictBays = false;
    if (dictBayList && dictBayList.length > 0) {
      bayInts = [...dictBayList];
      usingDictBays = true;
    } else {
      const bays = Object.keys(bayGroups);
      bayInts = bays.map(b => parseInt(b, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
    }
    if (bayInts.length === 0) return [];
    const out = [];
    const usedOddBays = new Set();
    if (usingDictBays) {
      // ★ ConeOne 2.4: 짝 짓기는 cargoPlanCore.autoPairBays 한 벌(buildBayPagesFromSummary).
      //   종전 이 자리의 복사본은 2.55-03 가드(쓰인 홀수 재사용 금지)가 없어 SWTD 에서 (32)33 을 만들었다.
      const corePages = dictBayDefObj ? buildBayPagesFromSummary(dictBayDefObj) : null;
      if (corePages && corePages.length > 0) {
        for (const p of corePages) {
          if (p.even != null && p.odd != null) {
            out.push({ title: `BAY (${dispBay(p.even)})${dispBay(p.odd)}`, evenBay: keyBay(p.even), oddBay: keyBay(p.odd) });
            usedOddBays.add(keyBay(p.odd));
          } else if (p.even != null) {
            out.push({ title: `BAY ${dispBay(p.even)}`, evenBay: keyBay(p.even), oddBay: null, isStandalone: !!p.isStandalone });
          } else {
            out.push({ title: `BAY ${dispBay(p.odd)}`, evenBay: null, oddBay: keyBay(p.odd) });
          }
        }
      }
    } else {
      const maxBay = Math.max(...bayInts);
      for (let n = 1; n <= maxBay; n++) {
        if (n % 2 === 0) {
          const evenKey = keyBay(n);
          const oddKey = keyBay(n + 1);
          const evenDisp = dispBay(n);
          const oddDisp = dispBay(n + 1);
          const oddInRange = (n + 1) <= maxBay;
          out.push({
            title: oddInRange ? `BAY (${evenDisp})${oddDisp}` : `BAY ${evenDisp}`,
            evenBay: evenKey,
            oddBay: oddInRange ? oddKey : null,
          });
          if (oddInRange) usedOddBays.add(oddKey);
        } else {
          const oddKey = keyBay(n);
          if (!usedOddBays.has(oddKey)) {
            out.push({ title: `BAY ${dispBay(n)}`, evenBay: null, oddBay: oddKey });
          }
        }
      }
    }
    return out;
  })();

  // ── 페이지별 격자 (BayPlan.jsx BayPage 파생부) ──────────────────────
  const outPages = pages.map(page => {
    // BayPlan.jsx 996-998: 페이지 컨테이너
    const evenContainers = page.evenBay ? (bayGroups[page.evenBay] || []) : [];
    const oddContainers = page.oddBay ? (bayGroups[page.oddBay] || []) : [];
    const allContainers = [...evenContainers, ...oddContainers];

    // BayPlan.jsx 1003-1036: xMarks — 단독 홀수 페이지에서 인접 짝수 베이 40/45ft 그림자
    const xMarks = (() => {
      const marks = new Set();
      if (!page.oddBay || page.evenBay) return marks;
      const occupied = new Set();
      for (const c of allContainers) {
        if (c.row && c.tier) occupied.add(`${c.row}-${c.tier}`);
      }
      const isLongContainer = (c) => {
        const iso = c.iso || '';
        const lbl = (isoToLabel ? isoToLabel(iso) : '') || '';
        if (lbl.startsWith('20')) return false;
        if (/^2/.test(iso)) return false;
        return true;
      };
      const oddN = parseInt(page.oddBay, 10);
      for (const adjEven of [oddN - 1, oddN + 1]) {
        if (adjEven <= 0) continue;
        for (const c of (bayGroups[String(adjEven)] || [])) {
          if (!c.row || !c.tier) continue;
          if (!isLongContainer(c)) continue;
          const xKey = `${c.row}-${c.tier}`;
          if (occupied.has(xKey)) continue;
          marks.add(xKey);
        }
      }
      return marks;
    })();

    // BayPlan.jsx 1041-1067: pageRange — 페이지 단위 deck/hold row 범위
    const pageRange = (() => {
      let deckLeft = 0, deckRight = 0, deckHas00 = false;
      let holdLeft = 0, holdRight = 0, holdHas00 = false;
      for (const c of allContainers) {
        if (!c.row || !c.tier) continue;
        const n = parseInt(c.row);
        const tier = parseInt(c.tier);
        if (!tier) continue;
        const isDeck = tier >= 80;
        if (n === 0) {
          if (isDeck) deckHas00 = true; else holdHas00 = true;
          continue;
        }
        if (isDeck) {
          if (n % 2 === 0) deckLeft = Math.max(deckLeft, n);
          else deckRight = Math.max(deckRight, n);
        } else {
          if (n % 2 === 0) holdLeft = Math.max(holdLeft, n);
          else holdRight = Math.max(holdRight, n);
        }
      }
      return {
        deck: { maxLeft: deckLeft, maxRight: deckRight, has00: deckHas00 },
        hold: { maxLeft: holdLeft, maxRight: holdRight, has00: holdHas00 },
      };
    })();

    // BayPlan.jsx 1070-1077: buildPageRows
    const buildPageRows = (range) => {
      const ml = range?.maxLeft || 0, mr = range?.maxRight || 0;
      if (!ml && !mr) return [];
      const left = []; for (let n = ml; n >= 2; n -= 2) left.push(String(n).padStart(2, '0'));
      const right = []; for (let n = 1; n <= mr; n += 2) right.push(String(n).padStart(2, '0'));
      return range.has00 ? [...left, '00', ...right] : [...left, ...right];
    };

    // BayPlan.jsx 1094-1148: pageBayDictGrid — 사전 기반 페이지 그리드 (flex 폴백용)
    const pageBayDictGrid = (() => {
      const bays = [page.evenBay, page.oddBay].filter(bn => bn != null);
      if (bays.length === 0) return null;
      let deckMaxCells = 0, holdMaxCells = 0;
      let pageRowCount = 0;
      let pageHasZero = false;
      let deckAlign = 'center', holdAlign = 'center';
      let deckPadLeft = 0, deckPadRight = 0;
      let holdPadLeft = 0, holdPadRight = 0;
      let foundAny = false;
      bays.forEach(bn => {
        const db = dictBaysSummary[parseInt(bn, 10)];
        if (!db) return;
        foundAny = true;
        if (Array.isArray(db.deckCells) && db.deckCells.length > 0) {
          const mDeck = Math.max(...db.deckCells.map(n => parseInt(n) || 0));
          if (mDeck > deckMaxCells) deckMaxCells = mDeck;
        }
        if (Array.isArray(db.holdCells) && db.holdCells.length > 0) {
          const mHold = Math.max(...db.holdCells.map(n => parseInt(n) || 0));
          if (mHold > holdMaxCells) holdMaxCells = mHold;
        }
        if (typeof db.rowCount === 'number' && db.rowCount > pageRowCount) {
          pageRowCount = db.rowCount;
        }
        if (db.hasZero) pageHasZero = true;
        if (db.deckAlign) deckAlign = db.deckAlign;
        if (db.holdAlign) holdAlign = db.holdAlign;
        if (typeof db.deckPadLeft === 'number') deckPadLeft = db.deckPadLeft;
        if (typeof db.deckPadRight === 'number') deckPadRight = db.deckPadRight;
        if (typeof db.holdPadLeft === 'number') holdPadLeft = db.holdPadLeft;
        if (typeof db.holdPadRight === 'number') holdPadRight = db.holdPadRight;
      });
      if (!foundAny) return null;
      const gridCells = Math.max(deckMaxCells, holdMaxCells, pageRowCount);
      if (gridCells === 0) return null;
      return {
        gridCells,
        hasZero: pageHasZero,
        deckCells: deckMaxCells || gridCells,
        holdCells: holdMaxCells || gridCells,
        deckAlign, holdAlign,
        deckPadLeft, deckPadRight,
        holdPadLeft, holdPadRight,
      };
    })();

    // BayPlan.jsx 1152-1218: pageMatrixRender — buildEmptyBayRenderData (매트릭스와 100% 동일)
    const pageMatrixRender = (() => {
      const evenBn = page.evenBay != null ? parseInt(page.evenBay, 10) : null;
      const oddBn = page.oddBay != null ? parseInt(page.oddBay, 10) : null;
      const primaryBn = evenBn != null ? evenBn : oddBn;
      if (primaryBn == null) return null;
      const isPair = evenBn != null && oddBn != null;
      const bayKey = isPair
        ? `(${String(evenBn).padStart(2, '0')})${String(oddBn).padStart(2, '0')}`
        : String(primaryBn).padStart(2, '0');

      // ★ ConeOne 2.4: 격자는 cargoPlanCore.buildBayGrid 한 벌 — «자료만 받고 그림은 베이매트릭스대로».
      //   종전엔 짝 박스 entry 를 짝수 키로 찾아(매트릭스는 홀수 키 저장) EDI 폴백 격자가 그려졌다.
      if (dictBayDefObj) {
        try {
          const g = buildBayGrid(dictBayDefObj, bayKey, { posMap: buildPosMap(allContainers) });
          if (g) return g;
        } catch (e) { console.warn('[ConeOne 2.4] buildBayGrid 실패 — EDI 폴백', bayKey, e); }
      }

      // 사전에 이 베이가 없으면 EDI 실데이터로 단면 골격 생성 (신선박·미등록 베이 폴백)
      let entry = null;
      {
        if (!allContainers || allContainers.length === 0) return null;
        const deckTierSet = new Set(), holdTierSet = new Set();
        const deckRowsByTier = {}, holdRowsByTier = {};
        let dHas0 = false, hHas0 = false;
        for (const c of allContainers) {
          if (!c.row || !c.tier) continue;
          const t = parseInt(c.tier, 10);
          if (!t) continue;
          const isDeck = t >= 80;
          const isZero = parseInt(c.row, 10) === 0;
          if (isDeck) {
            deckTierSet.add(t);
            (deckRowsByTier[t] = deckRowsByTier[t] || new Set()).add(c.row);
            if (isZero) dHas0 = true;
          } else {
            holdTierSet.add(t);
            (holdRowsByTier[t] = holdRowsByTier[t] || new Set()).add(c.row);
            if (isZero) hHas0 = true;
          }
        }
        const deckTiers = [...deckTierSet].sort((a, b) => b - a);
        const holdTiers = [...holdTierSet].sort((a, b) => b - a);
        const deckCells = deckTiers.map(t => [...(deckRowsByTier[t] || [])].filter(r => parseInt(r, 10) !== 0).length);
        const holdCells = holdTiers.map(t => [...(holdRowsByTier[t] || [])].filter(r => parseInt(r, 10) !== 0).length);
        entry = {
          bayNo: String(primaryBn).padStart(2, '0'),
          deckTiers, holdTiers, deckCells, holdCells,
          deckHasZero: dHas0, holdHasZero: hHas0, hasZero: dHas0 || hHas0,
        };
      }

      // BayPlan.jsx 1199-1211: 매트릭스 명시값 우선 → EDI 폴백 판정
      const ediHasDeck = pageRange.deck.maxLeft > 0 || pageRange.deck.maxRight > 0 || pageRange.deck.has00;
      const ediHasHold = pageRange.hold.maxLeft > 0 || pageRange.hold.maxRight > 0 || pageRange.hold.has00;
      const matrixDeckZero = (entry.deckHasZero != null) ? entry.deckHasZero : (entry.hasZero != null ? entry.hasZero : null);
      const matrixHoldZero = (entry.holdHasZero != null) ? entry.holdHasZero : (entry.hasZero != null ? entry.hasZero : null);
      const effEntry = {
        ...entry,
        deckHasZero: matrixDeckZero != null ? matrixDeckZero : (ediHasDeck ? pageRange.deck.has00 : false),
        holdHasZero: matrixHoldZero != null ? matrixHoldZero : (ediHasHold ? pageRange.hold.has00 : false),
      };
      try {
        return buildEmptyBayRenderData(effEntry, bayKey, isPair);
      } catch (e) {
        console.warn('[ConeOne 1.2] 베이 매트릭스 렌더 실패', bayKey, e);
        return null;
      }
    })();

    // BayPlan.jsx 1694-1701: hatchCount
    let hatchCount = 1;
    // ★ ConeOne 2.4: 해치 수는 격자 한 벌의 hatchCount — 짝수 우선·0 허용(카고플랜과 동일).
    if (pageMatrixRender && typeof pageMatrixRender.hatchCount === 'number') {
      hatchCount = pageMatrixRender.hatchCount;
    } else for (const bn of [page.evenBay, page.oddBay]) {
      if (bn == null) continue;
      const db = dictBaysSummary[parseInt(bn, 10)];
      if (db && db.hatchCount) { hatchCount = Math.max(1, Math.min(3, db.hatchCount)); break; }
    }

    // BayPlan.jsx 1221-1250: pageCoordLayout — 좌표 기반 (active 셀만 그림)
    const pageCoordLayout = (() => {
      if (!pageMatrixRender) return null;
      const deckRows = pageMatrixRender.deckRows.filter(r => !r.invisible);
      const holdRows = pageMatrixRender.holdRows.filter(r => !r.invisible);
      // ★ ConeOne 2.4: 축은 격자 한 벌의 rowPos 그대로 — 차단열(blockedCells)도 «자리»는 남긴다.
      //   active 만 모으면 차단열이 접혀 좌우 블록이 붙는다(SWTD 09베이 00·01 — 검수앱 2.56-01 과 같은 수리).
      const deckAxis = deckRows.length > 0 ? (pageMatrixRender.deckRowPos || []).slice() : [];
      // 홀드 단이 하나도 없으면(데크 전용 베이) 축도 비운다 — 라벨만 홀로 찍히지 않게.
      const holdAxis = holdRows.length > 0 ? (pageMatrixRender.holdRowPos || []).slice() : [];
      const deckRowX = {}; deckAxis.forEach((r, i) => { deckRowX[r] = i; });
      const holdRowX = {}; holdAxis.forEach((r, i) => { holdRowX[r] = i; });
      const nCols = Math.max(deckAxis.length, holdAxis.length, globalGridCols || 0);
      const deckOff = (nCols - deckAxis.length) / 2;
      const holdOff = (nCols - holdAxis.length) / 2;
      return { deckRows, holdRows, deckAxis, holdAxis, deckRowX, holdRowX, deckOff, holdOff, nCols };
    })();

    if (pageCoordLayout) {
      // 좌표 모드 — active 셀 + «차단 자리에 실컨」(사전 오설정 안전장치)만 그린다. 차단 빈자리는 비움.
      const _cellCns = new Set();
      for (const c of allContainers) {
        if (c.row == null || c.tier == null) continue;
        _cellCns.add(String(c.row).padStart(2, '0') + '-' + String(c.tier).padStart(2, '0'));
      }
      const packRows = (rows, axis) => rows.map(tr => {
        const tier2 = String(tr.tier).padStart(2, '0');
        return {
          tier: tier2,
          rows: tr.cells.map((c, ci) => {
            const lbl = c.rowLbl != null ? c.rowLbl : axis[ci];
            if (lbl == null) return null;
            if (c.active || (c.blocked && _cellCns.has(lbl + '-' + tier2))) return lbl;
            return null;
          }).filter(x => x != null),
        };
      });
      return {
        title: page.title, evenBay: page.evenBay, oddBay: page.oddBay,
        mode: 'coord',
        nCols: pageCoordLayout.nCols,
        deckAxis: pageCoordLayout.deckAxis, holdAxis: pageCoordLayout.holdAxis,
        deckOff: pageCoordLayout.deckOff, holdOff: pageCoordLayout.holdOff,
        deckRows: packRows(pageCoordLayout.deckRows, pageCoordLayout.deckAxis),
        holdRows: packRows(pageCoordLayout.holdRows, pageCoordLayout.holdAxis),
        xMarks: Array.from(xMarks),
        hatchCount,
      };
    }

    // ── flex 폴백 (BayPlan.jsx 1252-1377): 사전·컨테이너 모두 없을 때의 직사각 골격 ──
    // BayPlan.jsx 1252-1262: buildGridRowsFromCells
    const buildGridRowsFromCells = (cells, hasZero) => {
      if (!cells || cells === 0) return [];
      const nonZero = hasZero ? Math.max(0, cells - 1) : cells;
      const leftCount = Math.ceil(nonZero / 2);
      const rightCount = nonZero - leftCount;
      const left = [];
      for (let i = leftCount; i >= 1; i--) left.push(String(i * 2).padStart(2, '0'));
      const right = [];
      for (let i = 1; i <= rightCount; i++) right.push(String(i * 2 - 1).padStart(2, '0'));
      return hasZero ? [...left, '00', ...right] : [...left, ...right];
    };
    // BayPlan.jsx 1267-1281: sliceWithAlign
    const sliceWithAlign = (gridRowsArr, ownCells, align, padLeftAdj, padRightAdj) => {
      const grid = gridRowsArr.length;
      if (ownCells >= grid) return [...gridRowsArr];
      const remain = grid - ownCells;
      let padLeft = Math.floor(remain / 2);
      let padRight = remain - padLeft;
      if (align === 'left') { padLeft = 0; padRight = remain; }
      else if (align === 'right') { padLeft = remain; padRight = 0; }
      padLeft = Math.max(0, Math.min(grid, padLeft + (padLeftAdj || 0)));
      padRight = Math.max(0, Math.min(grid - padLeft, padRight + (padRightAdj || 0)));
      const ownStart = padLeft;
      const ownEnd = grid - padRight;
      return gridRowsArr.map((r, i) => (i >= ownStart && i < ownEnd) ? r : null);
    };
    // BayPlan.jsx 1283-1301: 최종 row 배열 (사전 그리드+align 또는 EDI 폴백)
    const voyDeck = globalRowRange?.deck || pageRange.deck;
    const voyHold = globalRowRange?.hold || pageRange.hold;
    const baseDeckRowsArr = buildPageRows(voyDeck);
    const baseHoldRowsArr = buildPageRows(voyHold);
    const gridRowsArr = pageBayDictGrid
      ? buildGridRowsFromCells(pageBayDictGrid.gridCells, pageBayDictGrid.hasZero)
      : null;
    const deckRowsArr = pageBayDictGrid && gridRowsArr
      ? sliceWithAlign(gridRowsArr, pageBayDictGrid.deckCells, pageBayDictGrid.deckAlign,
                       pageBayDictGrid.deckPadLeft, pageBayDictGrid.deckPadRight)
      : baseDeckRowsArr;
    const holdRowsArr = pageBayDictGrid && gridRowsArr
      ? sliceWithAlign(gridRowsArr, pageBayDictGrid.holdCells, pageBayDictGrid.holdAlign,
                       pageBayDictGrid.holdPadLeft, pageBayDictGrid.holdPadRight)
      : baseHoldRowsArr;
    // BayPlan.jsx 1341-1360: pageBayDictTiers — 사전 tier 정밀 적용
    const pageBayDictTiers = (() => {
      const deck = new Set();
      const hold = new Set();
      [page.evenBay, page.oddBay].forEach(bn => {
        if (bn == null) return;
        const db = dictBaysSummary[parseInt(bn, 10)];
        if (!db) return;
        (db.deckTiersLocal || db.deckTiers || []).forEach(t => deck.add(String(t).padStart(2, '0')));
        (db.holdTiersLocal || db.holdTiers || []).forEach(t => hold.add(String(t).padStart(2, '0')));
      });
      return { deck, hold };
    })();
    // BayPlan.jsx 1362-1377: allTiers → deck/hold 분리 + 상하 패딩
    const hasDictTiers = pageBayDictTiers.deck.size > 0 || pageBayDictTiers.hold.size > 0;
    const allTiers = hasDictTiers
      ? Array.from(new Set([
          ...pageBayDictTiers.deck,
          ...pageBayDictTiers.hold,
          ...allContainers.map(c => c.tier).filter(Boolean),
          ...Array.from(xMarks).map(k => k.split('-')[1])
        ]))
      : Array.from(new Set([
          ...globalTiers,
          ...allContainers.map(c => c.tier).filter(Boolean),
          ...Array.from(xMarks).map(k => k.split('-')[1])
        ]));
    const deckTiers = allTiers.filter(t => parseInt(t) >= 80).sort((a, b) => parseInt(b) - parseInt(a));
    const holdTiers = allTiers.filter(t => parseInt(t) < 80).sort((a, b) => parseInt(b) - parseInt(a));
    const tierMax = Math.max(deckTiers.length, holdTiers.length);
    const deckTiersPadded = [...Array(tierMax - deckTiers.length).fill(null), ...deckTiers];
    const holdTiersPadded = [...holdTiers, ...Array(tierMax - holdTiers.length).fill(null)];

    return {
      title: page.title, evenBay: page.evenBay, oddBay: page.oddBay,
      mode: 'flex',
      deckRowsArr, holdRowsArr,
      deckTiersPadded, holdTiersPadded,
      xMarks: Array.from(xMarks),
      hatchCount,
    };
  });

  return { pages: outPages };
}

// ConeOne 1.2: 콘앱 베이뷰가 검수앱 베이플랜과 같은 격자를 쓰도록 노출.
//   cone.html 베이뷰는 이 결과(pages)의 칸만 그린다 — 없는 칸은 아예 안 그림, X 그림자는 검수앱과 동일.
window.ConeBayGrid = { buildGrid: buildConeBayGrid, ver: 'ConeOne 1.2' };

