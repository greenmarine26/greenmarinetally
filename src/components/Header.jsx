import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
// TallyOne 1.0 (K4): 미사용 아이콘 임포트 제거(Cloud·RefreshCw·Power) + 보조기능 아이콘 추가
// TallyOne 1.1: 클로드에게 메모 아이콘(NotebookPen) 추가
import { CloudOff, Home, HelpCircle, Truck, LogOut, Key, MoreVertical, Users, Wrench, DoorOpen, NotebookPen, Camera, Sun } from 'lucide-react';
import { exitApp } from '../backHandler.js';
import { isChief , isTester} from '../staffList.js';       // TallyOne 1.0: 상단 역할 표시(검수사/수석/소유자)
import { isOwnerName } from '../adminGuard.js';
import { APP_VERSION } from '../utils.js';   // 1.29-01: 헤더에 판 번호 상시 표시
import HelpModal from './HelpModal.jsx';
//  2.29: 앱 로고 — 검수사가 만들어 준 Tally_One 배지(흰 바탕 지우고 둥근 사각으로 잘라 낸 것).
//    src/assets 에 두고 import 하는 이유는 vite 가 해시를 붙여 주기 때문 —
//    판을 올리면 파일 이름이 바뀌어 **옛 로고가 캐시에 남지 않는다.**
import logoUrl from '../assets/logo-tallyone.png';
import GeminiKeyModal from './GeminiKeyModal.jsx';
import { getMirConfig } from '../mir.js';   // 3.43: 공용 키(검수사 부담)가 있으면 🔑 빨간 점·«설정 필요»를 띄우지 않는다
import ClaudeMemoModal from './ClaudeMemoModal.jsx';   // TallyOne 1.1: 클로드에게 메모 모달
import PendingDamageModal from './PendingDamageModal.jsx';   // TallyOne 2.03: 데미지 예약(자료 도착 전 사전 등록)
import ConfirmModal, { useConfirm } from './ConfirmModal.jsx';
import { getEquipNumber, setEquipNumber, _storage, SK, getPierFromBerth, equipNumbersForPier } from '../utils.js';
import DisplaySettingsModal from './DisplaySettingsModal.jsx';   // 2.40: 화면 밝기·소리
import DictMissingChip from './DictMissingChip.jsx';   // 4.19: 베이사전에 없는 배 «사전에 없음»(§7.8-⑬)

//  4.23 2차 — 머리띠 칸 재기(useLayoutEffect · 서버 그리기에서는 useEffect)
const _useIsoLayout = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function Header({ version, inspector, online, route, voyages, onChangeInspector, onGoHome, onLogout, onOpenStaffManager, onOpenAux, workChoice = null, onChangeWork = null }) {   // 3.50 workChoice — 로그인 뒤 고른 «작업자(선박·호기) / 조회만» · onChangeWork — 다시 고르기
  const cur = route.name === 'voyage' ? voyages[route.voyageKey] : null;
  const info = cur?.info;
  // V8.10: 현재 항차 부두 기준 장비 목록. 항차 없으면 1~5 전체.
  const equipNumbers = equipNumbersForPier(getPierFromBerth(info?.berth || ''));
  const [helpOpen, setHelpOpen] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);   // M6.14d: Gemini 키 설정 모달
  const [memoOpen, setMemoOpen] = useState(false); // TallyOne 1.1: 클로드에게 메모 모달 (HelpModal과 같은 Header 내부 state 패턴)
  const [dmgResvOpen, setDmgResvOpen] = useState(false); // TallyOne 2.03: 데미지 예약 모달
  // M5.0: 영어회화집은 HelpModal 안의 [영어회화] 탭으로 이동 (헤더에서 별도 버튼 제거)
  const [equipOpen, setEquipOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);   // V9.15: 부가 버튼 4개(도움말·키·인원·종료)를 ⋯ 메뉴로 — 선박명 자리 확보
  const [dispOpen, setDispOpen] = useState(false);   // 2.40: 화면·소리 설정
  const [equipNo, setEquipNoState] = useState(getEquipNumber());
  // M3.74: confirm() → ConfirmModal
  const [confirmState, askConfirm] = useConfirm();
  // M6.14d: 사용자 키 미설정 시 경고 (헤더 키 버튼 점멸). 3.43: 공용 키가 있으면 경고 없음 — 모달은 초록인데 헤더만 빨간 어긋남(감사 지적).
  const [sharedKey, setSharedKey] = useState(null);   // null=아직 모름(경고 안 띄움 — 첫 읽기 1초 동안 빨간 점이 깜빡이지 않게)
  useEffect(() => { let alive = true; getMirConfig().then((c) => { if (alive) setSharedKey(!!(c && c.sharedKey)); }).catch(() => { if (alive) setSharedKey(false); }); return () => { alive = false; }; }, [keyOpen]);
  const hasUserKey = !!_storage.get(SK.geminiKey) || sharedKey !== false;

  // TallyOne 1.0 (K3·B-7): 로그아웃/앱 종료 2메뉴 분리 — 둘 다 확인 단계를 먼저 밟는다.
  //   종전에는 onLogout이 확인 없이 곧장 서버에 로그아웃을 마킹했다(B-7).
  const handleLogoutClick = () => {
    askConfirm({
      title: '로그아웃',
      message: `${inspector || '검수원'} 님, 로그아웃할까요?\n\n작업 기록은 그대로 남습니다.`,
      confirmLabel: '로그아웃',
      cancelLabel: '취소',
      onConfirm: () => onLogout && onLogout(),
    });
  };
  const handleExitClick = () => {
    askConfirm({
      title: '앱 종료',
      message: 'TallyOne 검수앱을 종료하시겠습니까?\n\n(완전 종료는 폰 홈 버튼이나 앱 스위처에서 닫아주세요)',
      confirmLabel: '종료',
      cancelLabel: '취소',
      onConfirm: () => exitApp(),
    });
  };
  // TallyOne 1.0 (K4): 현재 역할 표시 — 소유자 > 수석 > 검수사
  const roleLabel = !inspector ? '' : isOwnerName(inspector) ? '소유자' : isTester(inspector) ? '테스터' : isChief(inspector) ? '수석' : '검수사';   // 1.79: 테스터 호칭 분리

  //  ★ 3.36 (감사 지적) — **헤더 배지도 호기 바뀜을 듣는다.** 종전엔 첫 그림 때 한 번만 잡아,
  //    시작보고 창에서 호기를 고르면 컨에는 새 호기가 박히는데 **배지는 옛 호기 그대로**였다.
  //    (`GuidedWorkPanel`·`SearchPanel` 은 이미 듣고 있었다 — 셋째 값만 남아 있었던 것이다.)
  useEffect(() => {
    const onEq = (e) => setEquipNoState((e && e.detail) || getEquipNumber());
    window.addEventListener('equipChanged', onEq);
    return () => window.removeEventListener('equipChanged', onEq);
  }, []);

  const handleSelectEquip = (num) => {
    setEquipNumber(num);
    setEquipNoState(num);
    setEquipOpen(false);
    window.dispatchEvent(new CustomEvent('equipChanged', { detail: num }));
  };

  //  ★ 4.23 머리띠 — 폰과 컴은 **배치가 다르다**(검수사 A1 «항목이 다른게 아니고 디자인 구성 배치가 달라야 합니다» · A4 «폰은 아이콘 크기를 맞추면 한줄이면 될껄»).
  //    폰(<640px) — 로고 · [선박명 / 판 번호] · 같은 높이 단추(조회만 🔍 · 호기 🚛 · 변경 · 이름 · ⋮). «TallyOne» 글자·역할 줄은 숨기고(로고가 이름 역할),
  //      호기를 안 고르면 🚛 아이콘만(깜빡임), 이름은 줄여 쓴다. 판 번호는 **절대 안 잘린다**(제목 칸 최소 폭 = 판 번호 폭) — 4.22-04 까지는 폰 조회만 로그인에서 제목이 «T.» 로 잘렸다.
  //    컴 — 로고 · [선박명 항차 · 선사 / 판 번호](홈은 «TallyOne 4.23» / 그린마린 검수팀 전용) · 글자 단추 그대로.
  //    판 번호는 머리띠에 **한 번, 크게**(검수사 «버전 확인을 하려도 버튼을 누르는건 불편합니다» · «상기 화면에도 버전을 크게 표기 바랍니다»).
  //    ⋮ 메뉴 줄·바닥글에 따로 적던 판 번호는 뺐다(한 화면에 3~4번). 로그인 화면 제목의 큰 판 번호는 그대로다.
  //    단추 높이는 글자 모드를 따른다(--tap-chip: 보통 40 · 크게 44).
  const verShort = String(APP_VERSION || '').replace(/^TallyOne\s*/, '');
  const voyLabel = info ? String((route?.mode === 'loading' ? (info.voy_l || info.voy_d) : (info.voy_d || info.voy_l)) || info.voy || '') : '';   // V8.82: 모드 따라 항차 — 양하=voy_d, 선적=voy_l
  const verMinW = `calc(var(${info ? '--fs-xs2' : '--fs-base'}) * ${(Math.max(4, verShort.length) * 0.62).toFixed(2)})`;   // 판 번호(고정폭 글꼴)가 다 들어가는 폭
  //  4.23 2차 — 제목 칸 최소 폭 = «판 번호» 와 «선박 코드 4자» 중 큰 쪽(감사 — 360px 크게 조회만+호기에서 «K…» 로 잘렸다).
  //    선박 코드 폭은 그 글자를 직접 잰다(KBTR 49px · SWMM 66px — 크게 모드). 상한 3.7em = 가장 넓은 코드 SWMM(3.66em)이 들어가는 폭 —
  //    선박명이 코드가 아닌 긴 이름이면(실데이터 info.vsl 은 4자 코드다) 그 폭까지만 지키고 나머지는 «…».
  const vslRef = useRef(null);
  const [vslMinPx, setVslMinPx] = useState(0);   // 선박 코드가 다 들어가는 폭(잰 값 · 최대 3.7글자) — 재기 전에는 3.7em
  _useIsoLayout(() => {
    const vs = vslRef.current; if (!vs) return undefined;
    const put = () => { const px = Math.ceil(Math.min(vs.scrollWidth, (parseFloat(getComputedStyle(vs).fontSize) || 16) * 3.7)); setVslMinPx((v) => (v === px ? v : px)); };
    put();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(put); ro.observe(vs);
    return () => ro.disconnect();
  }, [info && info.vsl]);
  const titleMinW = info ? `max(${verMinW}, ${vslMinPx > 0 ? `${vslMinPx}px` : 'calc(var(--fs-base) * 3.7)'})` : verMinW;
  const chipH = 'h-[var(--tap-chip)] min-w-[var(--tap-chip)]';
  const whoLabel = `${inspector || '검수원'}${roleLabel ? ' · ' + roleLabel : ''} — 누르면 작업자 바꾸기`;
  //  4.23 2차(감사·2차 시뮬) — 폰 항차 번호는 **다 들어갈 때만** 보인다. 반쯤 줄인 «2…» 는 다른 번호로 읽힌다.
  //    판 번호 옆 남는 폭(줄 폭 − 판 번호 − 사이 6)과 항차 글자 폭을 직접 잰다(글자 모드·폭·선박마다 다르다).
  //    안 들어가면 폭 0 으로 접고 안 보이게 — 접어도 글자 폭(scrollWidth)은 잴 수 있어 자리가 생기면 다시 편다.
  const voyRef = useRef(null);
  const [voyFits, setVoyFits] = useState(true);
  _useIsoLayout(() => {
    const el = voyRef.current; const row = el && el.parentElement; if (!el || !row) return undefined;
    const check = () => {
      const ver = row.querySelector('[data-hdr-version]');
      if (!ver || getComputedStyle(el).display === 'none') return;   // 컴(sm 이상)은 첫 줄에 항차 · 선사
      const room = row.clientWidth - ver.getBoundingClientRect().width - 6;
      const f = el.scrollWidth <= room + 0.5;
      setVoyFits((v) => (v === f ? v : f));
    };
    check();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(check); ro.observe(row); ro.observe(el);
    return () => ro.disconnect();
  }, [voyLabel]);
  //  4.23 2차 — 이름도 «다 들어갈 때만»(400px 이상). 한 글자만 남긴 «클…» 은 동그라미(첫 글자)와 같은 말이라 쓸모가 없다.
  //    안 들어가면(또는 폰 항차 번호를 밀어내면) 이름 칸 폭을 0 으로 접어 동그라미만 남기고, 제목 칸에 그만큼 여유가 생기면 다시 편다
  //    (이름은 늘 title·aria-label 에). 우선순위 — 선박 코드·판 번호 > 항차 > 이름.
  const titleRef = useRef(null);
  const nameRef = useRef(null);
  const [nameOn, setNameOn] = useState(true);
  _useIsoLayout(() => {
    const tt = titleRef.current, nm = nameRef.current; if (!tt || !nm) return undefined;
    const check = () => {
      const wrap = nm.parentElement, btn = nm.closest('button');
      if (!wrap || !btn || getComputedStyle(wrap).display === 'none') { setNameOn(true); return; }   // 400px 미만 — CSS 가 이미 숨겼다
      const want = Math.min(nm.scrollWidth, (parseFloat(getComputedStyle(nm).fontSize) || 12) * 4.2);   // 이름 칸이 원래 가질 폭(최대 4.2글자)
      //  폰 항차 번호 칸(판 번호 옆) — 이름보다 먼저다(우선순위 «선박 코드·판 번호 > 항차 > 이름», 감사 권고). 컴은 첫 줄이라 무관.
      const voy = tt.querySelector('[data-hdr-voy]');
      const voyOn = !!(voy && (voy.textContent || '').trim() && getComputedStyle(voy).display !== 'none');
      if (!wrap.classList.contains('max-w-0')) {   // 펴져 있다 — 이름이 다 들어갔고 항차도 안 접혔나
        setNameOn(nm.clientWidth + 1 >= want && !(voyOn && voy.classList.contains('max-w-0')));
        return;
      }
      //  접혀 있다 — 펴면 단추가 «왼 4 + 동그라미 24 + 사이 6 + 이름 + 오른 8 + 테두리 2» 가 된다. 그만큼 제목 칸에 여유가 있어야 편다.
      const need = (44 + want) - btn.getBoundingClientRect().width;
      //  제목 칸 최소 폭 — 계산값이 px 로 안 풀리는 브라우저면 판 번호·선박 코드 칸을 직접 잰다(0 으로 두면 폈다 접었다를 되풀이한다)
      const mw = getComputedStyle(tt).minWidth;
      const ver = tt.querySelector('[data-hdr-version]'), vs = tt.querySelector('[data-hdr-vsl]');
      const minPx = /^[\d.]+px$/.test(mw) ? parseFloat(mw)
        : Math.max(ver ? ver.getBoundingClientRect().width : 0, vs ? Math.min(vs.scrollWidth, (parseFloat(getComputedStyle(vs).fontSize) || 16) * 3.7) : 0);
      let room = tt.clientWidth - minPx;   // 이름을 펴면 제목 칸이 내줄 수 있는 폭
      if (voyOn && ver) room = Math.min(room, tt.clientWidth - (ver.getBoundingClientRect().width + 6 + voy.scrollWidth));   // 펴도 항차 번호가 다 들어가야
      setNameOn(room >= need + 1);
    };
    check();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(check); ro.observe(tt); ro.observe(nm);
    const voyEl = tt.querySelector('[data-hdr-voy]'); if (voyEl) ro.observe(voyEl);   // 항차 칸이 접히면 이름이 물러난다
    return () => ro.disconnect();
  }, [inspector, voyLabel]);
  //  4.23 2차 — 머리띠 실제 높이를 --hdr-h 로 내보낸다. 항차 독·수석 공지 띠(sticky)가 이 높이 바로 밑에 붙는다
  //    (종전 top-[52px] 고정 — 4.23 머리띠는 보통 53 · 크게 57 · 컴 61 이고, 오프라인 띠가 붙으면 더 커진다).
  const hdrRef = useRef(null);
  _useIsoLayout(() => {
    const el = hdrRef.current; if (!el) return undefined;
    const put = () => { try { document.documentElement.style.setProperty('--hdr-h', `${Math.round(el.getBoundingClientRect().height)}px`); } catch (e) { /* 그리기만 못 맞춘다 — 기본 52px */ } };
    put();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(put); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header ref={hdrRef} className="bg-ink-900 border-b border-line sticky top-0 z-40" data-app-header="1">
      <div className="max-w-6xl mx-auto px-2 py-1.5 sm:px-3 sm:py-2 flex items-center gap-1 min-[400px]:gap-1.5 sm:gap-2" data-hdr-row="1">
        {/* 2.29-01: 로고를 **왼쪽 큰 자리**로 올린다 — 검수사 «너무 작아서 안보여요»
            → «로고를 홈화면 버튼으로 사용해주셔도 됩니다»(승인).
            ⇒ 홈이 아닐 때는 **그것이 곧 홈 버튼**이다(모서리에 🏠 배지). 4.23: 폰은 40px · 컴 44px. */}
        {route.name !== 'home' ? (
          <button onClick={onGoHome} title="홈으로 (항차 선택 화면)"
            className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-btn flex-shrink-0 hover:brightness-110 active:brightness-95 transition">
            <img src={logoUrl} alt="홈으로" draggable="false" className="w-10 h-10 sm:w-11 sm:h-11 rounded-btn select-none"/>
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-md bg-blue-600 border border-blue-300/60 flex items-center justify-center">
              <Home className="w-2.5 h-2.5 text-white"/>
            </span>
          </button>
        ) : (
          <img src={logoUrl} alt="TallyOne" draggable="false"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-btn flex-shrink-0 select-none"/>
        )}

        <div ref={titleRef} className="min-w-0 flex-1" style={{ minWidth: titleMinW }} data-hdr-title="1">
          {info ? (
            <>
              {/* 작업 화면 — 선박명(크게) · 컴은 항차·선사를 옆에.
                  4.23 2차: «사전에 없음» 딱지는 컴에서만 — 폰 머리띠에서는 선박 코드를 밀어내 «K…» 로 만든다(같은 딱지가 항차 목록 카드·베이플랜 머리에 있다). */}
              <div className="flex items-center gap-1.5 min-w-0 leading-tight">
                <span ref={vslRef} className="font-black text-base leading-tight text-dim-100 truncate min-w-0" data-hdr-vsl="1">{info.vsl}</span>
                <span className="hidden sm:inline text-sm2 leading-tight font-bold text-dim-300 truncate min-w-0">{voyLabel}{info.carrier ? ` · ${info.carrier}` : ''}</span>
                <DictMissingChip info={info} className="shrink-0 hidden sm:inline" />
              </div>
              {/* 판 번호(안 잘림) · 폰은 그 뒤에 항차 — 다 들어갈 때만(반쯤 잘린 «2…» 는 숨긴다) */}
              <div className="flex items-baseline gap-1.5 min-w-0 leading-tight">
                <span className="mono font-black text-xs2 sm:text-sm2 leading-tight text-act-soft whitespace-nowrap shrink-0" data-hdr-version="1" title={APP_VERSION}>{verShort}</span>
                <span ref={voyRef} data-hdr-voy="1" aria-hidden={voyFits ? undefined : 'true'}
                  className={`sm:hidden text-2xs leading-tight font-bold text-dim-400 whitespace-nowrap overflow-hidden min-w-0 ${voyFits ? '' : 'invisible max-w-0'}`}>{voyLabel}</span>
              </div>
            </>
          ) : (
            <>
              <div className="font-black leading-tight whitespace-nowrap" data-hdr-version="1" title={APP_VERSION}>
                <span className="hidden sm:inline text-sm2 leading-tight text-dim-100">TallyOne </span>
                <span className="mono text-base sm:text-sm2 leading-tight text-act-soft">{verShort}</span>
              </div>
              <div className="hidden sm:block text-2xs text-dim-400 truncate leading-tight">그린마린 검수팀 전용</div>
            </>
          )}
        </div>

        {/* V9.15: 상시 노출은 호기·이름, 도움말·키·인원 관리·로그아웃은 ⋮ 메뉴로. 오프라인은 헤더 아래 빨간 띠(하단 렌더).
            4.23: 단추 높이 한 벌(--tap-chip) — 폰에서 한 줄에 같은 크기로 선다. 이름 단추만 줄어든다(판 번호 자리를 먼저 지킨다). */}
        <div className="flex items-center gap-1 min-[400px]:gap-1.5 min-w-0" data-hdr-right="1">
          {/*  ★ 3.51 (검수사 «조회만으로 로그인해도 모든 기능 장비 지정등을 사용하게 해야만») — 조회만도 **호기 단추를 그대로 쓴다**(화면을 그 호기 관점으로 보려고).
               그 앞에 [🔍 조회만] 칩이 서서 «보기만 된다» 를 알리고, 누르면 작업자(선박·호기)로 바꾼다. 작업자면 칩 없이 호기 단추 + 작은 [변경].
               4.23: 폰은 «🔍 조회» 로 줄인다(같은 칩·같은 동작). 2차: 360px 미만은 🔍 만(뜻은 title·aria-label). */}
          {workChoice && workChoice.mode === 'view' && (
            <button onClick={() => onChangeWork && onChangeWork()} title="조회만 — 보기만 됩니다(완료·보고가 기록되지 않습니다). 누르면 작업자(선박·호기)로 전환" data-work-mode="view"
              aria-label="조회만 — 누르면 작업자로 전환"
              className={`${chipH} shrink-0 px-1.5 sm:px-2.5 rounded-pill text-sm font-bold flex items-center justify-center gap-1 bg-ink-800 text-sky-200 border border-sky-700 whitespace-nowrap`}>
              <span aria-hidden="true">🔍</span><span className="sm:hidden max-[359px]:hidden">조회</span><span className="hidden sm:inline">조회만</span>
            </button>
          )}
          {(
          /* M3.5.6: 장비 번호 빠른 변경 · 4.23: 호기를 안 골랐으면 폰은 🚛 아이콘만(깜빡임) · 2차: 400px 미만은 고른 호기면 «1호기» 글자만(🚛 빼고 — 선박 코드 자리를 지킨다) */
          <button
            onClick={() => setEquipOpen(true)}
            title={equipNo ? `장비 ${equipNo} — 누르면 바꿉니다` : '장비 번호 변경 — 아직 안 골랐습니다'}
            aria-label={equipNo ? `장비 ${equipNo}` : '장비 번호 고르기'}
            data-equip-btn="1"
            data-work-mode={workChoice && workChoice.mode === 'work' ? 'work' : ''}
            className={`${chipH} shrink-0 rounded-pill text-sm font-bold flex items-center justify-center gap-1 whitespace-nowrap ${
              equipNo
                ? 'px-2 bg-st-lod text-ink-950 border border-st-lodHi'
                : 'px-0 sm:px-2 bg-ink-800 text-st-lodHi border border-st-lod/70 animate-pulse'
            }`}
          >
            <Truck className={`w-4 h-4 shrink-0 ${equipNo ? 'max-[399px]:hidden' : ''}`}/>
            {equipNo ? <span>{equipNo}</span> : <span className="hidden sm:inline">장비?</span>}
          </button>
          )}
          {workChoice && workChoice.mode === 'work' && onChangeWork && (
            <button onClick={onChangeWork} title={`작업 선박 ${(voyages && voyages[workChoice.voyageKey] && voyages[workChoice.voyageKey].info && voyages[workChoice.voyageKey].info.vsl) || workChoice.voyageKey || ''} — 누르면 선박·호기를 다시 고릅니다`}
              data-work-change="1" className="h-[var(--tap-chip)] shrink-0 px-1.5 rounded-pill text-2xs font-bold bg-ink-800 text-dim-300 border border-line whitespace-nowrap">변경</button>
          )}
          {/*  4.23 2차(감사 — 360px 에서 이름 «클로드» 가 단추 밖 ⋮ 밑으로 33px 흘러넘쳤다. 4.22-04 는 단추 안이었다):
               400px 미만 폰은 **이름 글자를 먼저 숨기고 동그라미(첫 글자)만** — 이름·역할은 title·aria-label 로. 그 이상은 이름이 단추 폭을 따라 «…» 로 준다. */}
          <button
            onClick={onChangeInspector}
            title={whoLabel}
            aria-label={whoLabel}
            data-hdr-namebtn="1"
            className={`h-[var(--tap-chip)] min-w-[var(--tap-chip)] max-[399px]:w-[var(--tap-chip)] max-[399px]:shrink-0 bg-ink-800 border border-line ${nameOn ? 'pl-1 pr-2' : 'px-0 shrink-0'} max-[399px]:px-0 rounded-pill text-xs flex items-center justify-center overflow-hidden active:bg-ink-750`}
          >
            <span className="w-6 h-6 shrink-0 bg-st-lodHi rounded-full flex items-center justify-center text-ink-950 text-xxs font-black" aria-hidden="true">
              {(inspector && inspector[0]) || '?'}
            </span>
            {/* TallyOne 1.0 (K4): 이름 아래 현재 역할 표시 · 4.23: 폰은 역할 줄을 숨긴다(이름 한 줄) */}
            <span className={`max-[399px]:hidden flex flex-col items-start leading-tight min-w-0 overflow-hidden ${nameOn ? 'ml-1.5 max-w-[4.2em]' : 'max-w-0'}`} aria-hidden="true">
              <span ref={nameRef} className="font-bold text-dim-100 max-w-full truncate" data-hdr-name="1">{inspector || '검수원'}</span>
              {roleLabel && <span className="hidden sm:block text-3xs text-dim-300 whitespace-nowrap">{roleLabel}</span>}
            </span>
          </button>
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen(v => !v)}
              title="메뉴 (도움말·설정)"
              aria-label="메뉴"
              className="w-[var(--tap-chip)] h-[var(--tap-chip)] flex items-center justify-center rounded-pill bg-ink-800 hover:bg-ink-750 active:bg-ink-700 border border-line-strong relative"
            >
              <MoreVertical className="w-5 h-5 text-dim-200"/>
              {!hasUserKey && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-st-bad animate-pulse"/>}
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}/>
                <div className="absolute right-0 top-full mt-1 z-50 w-[calc(var(--fs-sm)*16)] max-w-[calc(100vw-16px)] bg-ink-850 border border-line-strong rounded-card shadow-card overflow-hidden" data-hdr-menu="1">
                  <button onClick={() => { setMenuOpen(false); setHelpOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 text-left hover:bg-ink-750 active:bg-ink-700" style={{ minHeight: 48 }}>
                    <HelpCircle className="w-5 h-5 text-st-lodHi shrink-0"/>
                    <span className="text-sm text-dim-100 font-bold">사용 매뉴얼</span>
                  </button>
                  {/* 2.40: 화면 밝기·소리 — 검수사 «사무실 컴에서 너무 어둡고 캄캄합니다» · 4.23: 글자 «보통 / 크게»도 이 창에서(노안) */}
                  <button onClick={() => { setMenuOpen(false); setDispOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 text-left hover:bg-ink-750 active:bg-ink-700" style={{ minHeight: 48 }}>
                    <Sun className="w-5 h-5 text-st-lodHi shrink-0"/>
                    <span className="text-sm text-dim-100 font-bold">화면 · 소리 · 글자</span>
                  </button>
                  <button onClick={() => { setMenuOpen(false); setKeyOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 text-left hover:bg-ink-750 active:bg-ink-700" style={{ minHeight: 48 }}>
                    <Key className={`w-5 h-5 shrink-0 ${hasUserKey ? 'text-emerald-300' : 'text-red-300'}`}/>
                    <span className="text-sm text-dim-100 font-bold">AI 검색 키</span>
                    {!hasUserKey && <span className="ml-auto text-2xs text-red-300 font-bold">설정 필요</span>}
                  </button>
                  {/* TallyOne 1.1: 클로드에게 메모 — 발견한 문제·요청을 claude_inbox로 보낸다 (전 화면 접근) */}
                  <button onClick={() => { setMenuOpen(false); setMemoOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 text-left hover:bg-ink-750 active:bg-ink-700" style={{ minHeight: 48 }}>
                    <NotebookPen className="w-5 h-5 text-violet-300 shrink-0"/>
                    <span className="text-sm text-dim-100 font-bold">📝 개발 요청 · 미르에게 원함</span>
                  </button>
                  {/* TallyOne 2.03: 데미지 예약 — 자료 도착 전 컨번호로 사전 등록 (전 화면 접근) */}
                  <button onClick={() => { setMenuOpen(false); setDmgResvOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 text-left hover:bg-ink-750 active:bg-ink-700" style={{ minHeight: 48 }}>
                    <Camera className="w-5 h-5 text-st-lod shrink-0"/>
                    <span className="text-sm text-dim-100 font-bold">📷 데미지 예약</span>
                  </button>
                  {/* TallyOne 1.0 (K4): 보조기능(#/aux) 진입 — 건강 점검·맛집 수첩 등 */}
                  {onOpenAux && (
                    <button onClick={() => { setMenuOpen(false); onOpenAux(); }}
                      className="w-full flex items-center gap-3 px-4 text-left hover:bg-ink-750 active:bg-ink-700" style={{ minHeight: 48 }}>
                      <Wrench className="w-5 h-5 text-sky-300 shrink-0"/>
                      <span className="text-sm text-dim-100 font-bold">보조기능</span>
                    </button>
                  )}
                  {onOpenStaffManager && (
                    <button onClick={() => { setMenuOpen(false); onOpenStaffManager(); }}
                      className="w-full flex items-center gap-3 px-4 text-left hover:bg-ink-750 active:bg-ink-700" style={{ minHeight: 48 }}>
                      <Users className="w-5 h-5 text-st-lodHi shrink-0"/>
                      <span className="text-sm text-dim-100 font-bold">인원 관리</span>
                    </button>
                  )}
                  <div className="border-t border-line"/>
                  {/* TallyOne 1.0 (K3): 로그아웃/앱 종료 2메뉴 분리 — 각각 확인 후 실행 */}
                  {onLogout && (
                    <button onClick={() => { setMenuOpen(false); handleLogoutClick(); }}
                      className="w-full flex items-center gap-3 px-4 text-left hover:bg-red-950/40 active:bg-red-950/60" style={{ minHeight: 48 }}>
                      <LogOut className="w-5 h-5 text-red-300 shrink-0"/>
                      <span className="text-sm text-red-200 font-bold">로그아웃</span>
                    </button>
                  )}
                  <button onClick={() => { setMenuOpen(false); handleExitClick(); }}
                    className="w-full flex items-center gap-3 px-4 text-left hover:bg-red-950/40 active:bg-red-950/60" style={{ minHeight: 48 }}>
                    <DoorOpen className="w-5 h-5 text-red-300 shrink-0"/>
                    <span className="text-sm text-red-200 font-bold">앱 종료</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {/* V9.15: 오프라인은 14px 아이콘 대신 놓칠 수 없는 띠로 */}
      {!online && (
        <div className="bg-st-bad/80 text-white text-xs2 font-bold text-center py-1">
          <CloudOff className="w-3.5 h-3.5 inline mr-1 -mt-0.5"/>오프라인 — 연결이 돌아올 때까지 이 화면을 닫거나 새로고침하지 마세요(저장이 사라집니다)
        </div>
      )}
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} inspector={inspector}/>
      {/* M6.14d: Gemini API 키 설정 모달 */}
      {keyOpen && <GeminiKeyModal onClose={() => setKeyOpen(false)} />}
      {/* TallyOne 1.1: 클로드에게 메모 — Header가 이미 받는 props로 자동 첨부 정보 구성 (route 없으면 모달이 해시 파싱 폴백) */}
      {memoOpen && (
        <ClaudeMemoModal
          inspector={inspector}
          route={route}
          appVersion={version}
          onClose={() => setMemoOpen(false)}
        />
      )}
      {/* TallyOne 2.03: 데미지 예약 */}
      {dmgResvOpen && <PendingDamageModal inspector={inspector} onClose={() => setDmgResvOpen(false)} />}
      {/* M5.0: ContainerPhrasebook은 HelpModal 안에서 호출됨 */}

      {/* M3.5.6: 장비 번호 선택 모달 */}
      {equipOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setEquipOpen(false)}>
          <div className="bg-ink-900 border border-st-lod rounded-card shadow-card w-full max-w-sm p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-5 h-5 text-st-lod"/>
              <span className="font-bold text-st-lodHi">장비 번호 선택</span>
            </div>
            <div className="text-xxs text-dim-300 mb-3">현재 작업 중인 장비를 선택하세요. 작업 보고에 자동 포함됩니다.</div>
            <div className="grid grid-cols-2 gap-2">
              {equipNumbers.map(num => (
                <button key={num} onClick={() => handleSelectEquip(num)}
                  className={`py-4 rounded-btn font-black text-lg ${
                    equipNo === num ? 'bg-st-lod text-ink-950 border-2 border-st-lodHi' : 'bg-ink-800 text-dim-200 hover:bg-ink-750'
                  }`}>
                  {num}
                </button>
              ))}
            </div>
            {equipNo && (
              <button onClick={() => handleSelectEquip('')}
                className="w-full mt-2 py-2 bg-ink-750 hover:bg-ink-700 text-dim-200 rounded-pill text-xs">
                장비 번호 해제
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2.40: 화면 밝기·소리 — 기기마다 따로 기억한다 */}
      <DisplaySettingsModal open={dispOpen} onClose={() => setDispOpen(false)} />

      {/* M3.74: confirm() → ConfirmModal */}
      <ConfirmModal {...confirmState} />
    </header>
  );
}
