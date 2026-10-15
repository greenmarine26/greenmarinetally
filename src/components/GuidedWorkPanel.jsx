// 가이드 작업 패널 (V7.94) — 앱이 크레인 순서대로 다음 컨테이너를 예측 제시, 검수사는 확인/수정만
// 흐름: 장비(호기) 결정 → 접안 방향(좌/우현, 확인 후 저장) → 베이 그룹 결정 → 예측 카드
// 설정 칩(장비·접안·베이)은 항상 표시 — 탭하면 해당 단계로 돌아가 변경 (접안 변경은 재확인)
// 수정 3연속 = 플랜대로 진행되지 않음 → 4.26-02 부터는 말없이 수동으로 넘기지 않고 묻는다(자동 그대로 · 순서 바꾸기 · 수동)
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Check, Pencil, Hand, Link2, ChevronLeft, Volume2, VolumeX, AlertTriangle, Snowflake, Loader2, Anchor, Construction } from 'lucide-react';
import { buildGuidedQueue, availableCardsOf, conClassOf, cardMatchesPref } from '../guidedQueue.js';
import { getBayPairs, findTwinCandidate } from '../twin.js';
import { bayGroupCenter } from '../swapGrade.js';   // TallyOne 1.8-09: 해치 그룹 계산 단일 소스
import { getShipBayDictData } from '../shipStructure.js';
import { buildGangShift, gangName } from '../chiefAnswers.js';   // 2.80-02: «몇 호기 화물인가» 안내 — 계산은 한 벌
import { NUM_INPUT_PROPS } from '../inputUtils.js';
import ConfirmModal, { useConfirm } from './ConfirmModal.jsx';   // TallyOne 1.53: 경고는 앱 안에서 띄운다.
import { useHatchCountConfirm } from './HatchCountConfirm.jsx';   // 4.10: 해치 보고 직전 장수 확인
import { fbHoldContainers, fbReleaseHold, fbSnoozeHold, fbCompleteContainer, fbCompleteContainersAtomic, fbUpdateVoyageInfo, fbUpdateRecordSeal, fbSetXraySeal, fbReassignContainerPosition, fbAddWorkReport, fbSetInspectorActivity, fbPickIso, fbSetWorkOrder } from '../firebase.js';   // ★ 3.47: 규격 3자 확정
import { workOrderOf, workOrderText, togglePref, ORDER_PREF_KEYS, ORDER_PREF_LABEL, ALL_EQUIP_KEY } from '../workOrder.js';   // 4.09: 양하 순서 조건 한 벌(호기별 기억)
import { canWorkNow, workGateText } from '../workChoice.js';   // 3.51: 조회만은 쓰지 않는다 — 보기만
import EsealVoiceBar from './EsealVoiceBar.jsx';   // 3.71: ATPR 위해행 엠티 선적 — 엠티실 뒷 세 자리를 음성으로
import { speak, spellKo } from '../voice.js';
import { isoToLabel, hatchPanelDetailOf, hatchReportTs, isoConflictOf, ISO_SRC_NAME, getEquipNumber, setEquipNumber, formatWt, getPierFromBerth, equipNumbersForPier, seqFullConfirmText , isHatchSkipShipInfo, dupSealMap, dupSealPartners, predictShiftingFromVoyage, shiftingTruthCheck, buildOccupancy, posKey, berthSideOf } from '../utils.js';   // 2.89-03: 점유 판정 한 벌   // 1.54: 시퀀스 되묻기 문구는 한 벌만 둔다   // 1.76-05: 실번호 중복 판정 단일 소스
import { isoShown } from '../utils.js';   // 4.21: 내부 풀·엠티 표식을 정본 규격 글자로 보여 준다
import { inspectionSealOf, isFullReefer, applySpecialMarks, tagForecastMarks } from '../utils.js';   // 4.26 작업 카드: 실번호 칸(검수리스트와 한 벌) · 풀 리퍼만 ❄ · 수화물·제작컨·긴급 표시(목록 입구와 한 벌)
import { activeHeldOf } from '../utils.js';   // 4.26-02: 지금 걸린 보류 한 벌(완료된 컨은 뺀다 — 미르·갱 배분 답과 같은 목록)
import { loadingSlotOf, guideTwinOf } from '../utils.js';   // 4.23-01 2차(guideTwinOf 는 3차 — 맞교환 자리는 트윈 짝 짐작 안 함): 선적확인 한 번에 저장될 자리 한 벌(맞교환 자리·규격 다른 맞교환)
import PositionEditModal from './PositionEditModal.jsx';   // 4.23-01 2차: 규격 다른 맞교환은 확인 대신 위치 지정(있는 흐름 그대로)
import { buildHatchMessage, shareText } from '../kakaoShare.js';
import { TWIN_MAX_TOTAL_KG, TWIN_CAUTION_TOTAL_KG, twinDiffLimit, twinWtOf } from '../nlSearch.js';

const AUTO_MANUAL_THRESHOLD = 3;   // 수정 연속 N회 → 순서를 묻는다(4.26-02 — 종전 수동 전환)
// TallyOne 1.57: 같은 부류가 몇 대 연속되면 그 흐름으로 보는가 (검수사 확정 2026-08-13 — 3대).
//   2대면 층 순서상 우연히 붙은 것과 구분이 안 되고, 4대면 작은 베이에서 끝날 때까지 안 걸린다.
const STREAM_STREAK = 3;
// V8.50: 갈림 부류 라벨 (streamPref 키 → 표시·음성)
const PREF_LABEL = { F: '풀', E: '엠티', RF: '리퍼', GEN: '일반', '40': '40피트', '20': '20피트' };

// V9.12(2026-07-27): 양하 홀드까지 끝났을 때 "해치커버 닫을까요?"를 물을지 판정.
//   사용자 확정 — 선적 여부를 확인해서 **선적이 없을 때만** 묻는다.
//     · 그 베이 그룹에 평택 선적분이 있으면(완료·미완료 무관) 묻지 않는다 → 닫는 건 선적 흐름이 맡는다.
//     · 선적 자료(위치 있는 선적 컨)가 아예 없으면 = 모름 → 묻지 않는다.
//       (종전에는 '선적 EDI 미도착'이 '선적 없음'으로 읽혀 닫자고 물었다 — 그 구멍을 막는다.)
//
// ★ 1.82-01 (검수사 메모 2026-08-18 04:56): *"홀드에 선적될 화물이 있는데 커버 클로징 멘트 나옴"*
//   종전 판정에 구멍이 셋 있었다. 셋 다 «닫자고 잘못 묻는» 방향이라 현장에서 그대로 드러났다.
//   ① holdDone 이 `some(완료 1대)` 였다 — 배너는 «홀드 작업이 끝났습니다» 인데 조건은 «홀드를 시작했다».
//      → 그 그룹 홀드의 평택 양하 **잔여 0** 이라야 끝이다.
//   ② loadingHere 가 `_ptk` 를 요구했다 — 자리만 있고 POL 이 안 채워진 선적(가상 EDI·플랜 자리)이
//      «선적 없음» 으로 읽혔다. 선적 섹션에 올라온 컨은 수집기가 이미 평택분만 올린 것이라 _ptk 를 따질 필요가 없다.
//   ③ 베이 짝을 사전에서만 봤다 — 베이사전이 없는 배는 홀수 베이(21)가 짝(20)과 다른 그룹으로 계산돼
//      같은 해치에 실을 화물을 못 봤다. 인접 베이(±1)는 같은 커버로 본다(사전이 있으면 사전이 이긴다).
//   ④ 자리를 모르는 선적이 남아 있으면(리스트만 와서 bay 미상) 어디 실릴지 모르는 것 → 묻지 않는다.
//   ⛔ 판정이 애매하면 **묻지 않는 쪽**으로 기운다 — 검수사 확정 «모를 때는 묻지 않는다».
//      되물음은 성가심이지만, 실을 게 남았는데 닫는 것은 사고다.
export function shouldAskHatchClose(allContainers, group, centerOf) {
  const list = Array.isArray(allContainers) ? allContainers : [];
  const isHold = (c) => parseInt(c.tier, 10) < 80;
  // ③ 인접 베이(±1)도 같은 커버로 본다 — 사전이 있으면 centerOf 가 이미 맞춘다.
  const here = (c) => {
    const ctr = centerOf(c.bay);
    if (ctr === group) return true;
    const b = parseInt(c.bay, 10);
    return Number.isFinite(b) && Math.abs(b - group) <= 1;
  };
  // ① 이 그룹 홀드의 평택 양하가 **전부** 끝났는가 (한 대라도 남으면 아직 아니다)
  const holdD = list.filter(c => c._mode === 'discharge' && c._ptk && here(c) && isHold(c));
  if (!holdD.length || holdD.some(c => !c._comp)) return false;
  // 선적 자료를 아는가 — 자리 있는 선적 컨이 하나도 없으면 «모름»
  const loadPlaced = list.filter(c => c._mode === 'loading' && centerOf(c.bay) != null);
  if (!loadPlaced.length) return false;
  // ④ 자리 모르는 선적이 남아 있으면 어디 실릴지 모른다 → 묻지 않는다
  if (list.some(c => c._mode === 'loading' && !c._comp && centerOf(c.bay) == null)) return false;
  // ② 이 그룹에 선적이 있으면 묻지 않는다 (_ptk 를 요구하지 않는다 — 자리만 있는 컨 포함)
  if (loadPlaced.some(here)) return false;
  return true;                                     // 선적 자료가 있고, 이 그룹엔 선적 없음 → 묻는다
}

//  4.25-02 — «다른 갱» 물음을 이미 한 장(항차·모드·장·두 호기). 모듈에 두어 탭을 옮기거나 자동↔수동을 바꿔도 앱을 다시 열기 전까지는 다시 묻지 않는다(감사 기록 — 컴포넌트에 두면 다시 그려질 때마다 물었다).
const _askedGang = new Set();

export default function GuidedWorkPanel({ voyage, voyageKey, inspector, allContainers, workFilter, onSwitchManual, onOpenContainer, onPlaceUnassigned = null, slotGroups = null, workCtx = null, compact = false, suppressBayActivity = false, hatchAuto = false }) {   // 3.49 hatchAuto — 베이뷰 따라가기: 커버 여닫음을 터미널 실적으로 판정해 자동 기록하므로 «오픈→홀드 진행 / 클로즈» 물음을 띄우지 않는다(검수원 수동 보고는 그대로 남는다)   // 3.48 suppressBayActivity — 베이뷰 «따라가기»: 터미널이 준 베이를 «사람이 고른 자리»로 올리지 않는다   // 3.48 compact — 베이뷰 위 칸(폰 1/3): 설정 줄·«다음 예정» 을 접고 지금 컨 카드와 확인만 남긴다(동작은 같다)   // V9.28 · 1.95: slotGroups — 수동(빈 칸) 계산 한 벌을 받아 병기(검수사 «자동보다 수동이 우선함»)
  const mode = workFilter;                                  // 'discharge' | 'loading'
  const shipImo = voyage?.info?.imo || '';
  const shipName = voyage?.info?.vsl || '';
  // V8.09-17 (메모4)→V8.10: 해치커버 계산·보고를 하지 않는 선박들.
  //   TMPZ는 해치가 자동(유압식)이고, TNJP·RZOR·OBWH도 해치커버 계산 대상이 아니다(사용자 확정 2026-06-19).
  //   네 선박은 해치 대신 주야간 작업갯수를 기록한다(작업보고 WorkReportModal의 주야간 보고). vsl/vslFull 어디든 매칭되면 해치 프롬프트·계산·보고를 건너뛴다.
  const isHatchSkipShip = isHatchSkipShipInfo(voyage?.info);   // 1.56-06: 단일 소스(utils) — ATPR 추가(자동 해치, 검수사 확정 2026-08-12)
  //  3.40: 접안 현측은 utils 한 벌로 읽는다 — 수집기가 적는 한글('좌현'·'우현')과 앱이 적는 영문을
  //    같은 답으로 만든다(검수사 «선박이 좌현으로 고정됨 바꿔도 다시바뀜»). 모르는 값은 ''(접안?) 이다.
  const berthSide = berthSideOf(voyage?.info);              // 'starboard'(우현) | 'port'(좌현) | ''(모름)
  //  ★ 3.3 (김성일 메모 2026-09-03 «양하순서 추가 해상부터»): 양하 로우 순서 — 'land'(기본, 육상→해상) | 'sea'(해상→육상).
  //  ★ 4.09: 로우 방향과 부류 조건(20부터·리퍼부터…)을 **호기별로** 항차 info.workOrder 에 기억한다 — 읽기는 아래 workOrderOf(호기 칸 → 전체 칸 → 옛 seqRowFrom).
  // V8.10: 부두별 장비 목록. PCTC 1~4호기, PNCT 1~5호기(여객석 RORO 1대 추가). 부두 미상이면 1~5 전체.
  const equipNumbers = equipNumbersForPier(getPierFromBerth(voyage?.info?.berth || ''));

  // 장비(호기) — 헤더와 동일한 localStorage 공유 + equipChanged 이벤트 동기화
  const [equip, setEquip] = useState(getEquipNumber());
  const [equipStep, setEquipStep] = useState(() => !getEquipNumber());   // V7.94-23: 장비 미선택 시에만 선택 화면. 이미 있으면 건너뜀(로그인·선박선택 직후 1회만, 교체는 헤더 🏗 탭)
  useEffect(() => {
    const h = (e) => setEquip(e.detail || getEquipNumber());
    window.addEventListener('equipChanged', h);
    return () => window.removeEventListener('equipChanged', h);
  }, []);
  const pickEquip = (num) => {
    setEquipNumber(num);
    setEquip(num);
    window.dispatchEvent(new CustomEvent('equipChanged', { detail: num }));
    setEquipStep(false);
  };
  //  ★ 4.09 — 지금 이 호기에 걸린 양하 순서. 양하만 쓴다(선적은 로우 방향·부류 조건이 없다).
  const wo = workOrderOf(voyage?.info, equip);
  const rowFrom = wo.rowFrom;
  const orderPrefs = mode === 'discharge' ? wo.prefs : null;
  const orderKey = orderPrefs ? orderPrefs.join(',') : '';   // useMemo 의존성은 문자열로(배열은 매번 새것이라)
  const [orderOpen, setOrderOpen] = useState(false);

  //  2.90 (검수사 «수동작업 크레인 지정해서 작업하다 자동가이드로 넘어가면 재지정하게 한다 …
  //    자동이든 수동이든 이중지정은 피한다») — 베이·단 선택을 부모(SearchPanel) 한 벌(workCtx)로 올린다.
  //    작업 맥락(호기·베이·단)은 모드가 아니라 작업에 붙는다 — 모드를 오가도 안 사라진다.
  //    workCtx 가 없으면 종전 로컬 상태 그대로(단독 사용 보호). 갱(호기)은 이미 localStorage 한 벌이다.
  //    ⚠ 수동 전용 값은 걸러 받는다 — 미지정 그룹(center -1)·'none' 단은 자동에 없는 개념이다.
  const [_locGroup, _setLocGroup] = useState(null);
  const [_locTier, _setLocTier] = useState(null);
  const selectedGroup = workCtx ? ((workCtx.bay != null && workCtx.bay > 0) ? workCtx.bay : null) : _locGroup; // 그룹 center 베이 번호
  const setSelectedGroup = workCtx ? workCtx.setBay : _setLocGroup;
  const selectedTier = workCtx ? (workCtx.tier === 'none' ? null : workCtx.tier) : _locTier;   // V7.99-8 (메모6): 'hold'|'deck' — 검수사가 누른 작업 단
  const setSelectedTier = workCtx ? workCtx.setTier : _setLocTier;
  // V8.50: 갈림 선택 — 검수사(또는 무언 적응)가 고른 부류 스트림. null = 기본 층 순서.
  const [streamPref, setStreamPref] = useState(null);
  //  ★ 3.77 — 양하 «베이 먼저»: 트윈이 무게로 싱글이 될 때 한쪽 베이(33 또는 35)를 먼저 몰아 내리는 흐름. null = 짝 번갈아(기본).
  const [bayFirst, setBayFirst] = useState(null);
  const singleBaysRef = useRef([]);   // 최근 «짝이 남은 채 혼자 내린» 컨의 베이(최대 2개) — 같은 베이 연속이면 자동으로 베이 먼저
  const [fixOpen, setFixOpen] = useState(false);
  //  ★ 2.80 «자리 확인» 모드 (검수사 확정 2026-08-28) — 엠티 선적에서 계획과 다른 것은 예외가 아니라 정상이다.
  //    실측 STSE 2666W: 선적 456대 중 엠티 367대, 그중 262대(71%)가 계획 자리와 달랐다. 그런데 그것은
  //    «맞바꿈»이 아니라 **줄줄이 밀린 사슬**(최장 76대)이었다 — 손에 잡히는 엠티를 그냥 실은 것.
  //    ⇒ «이 컨을 어디에»가 아니라 **«이 자리에 무엇을»** 로 묻는다. PCTC PDA(Apron Checker)와 같은 방향이고,
  //      앱은 거기에 규격·F/E 맞는 후보를 띄워 주므로 손이 더 적다.
  //    끄고 켤 수 있다 — 풀 선적은 계획대로 들어가므로(실측 89대 중 0대 어긋남) 종전 방식이 낫다.
  const [slotMode, setSlotMode] = useState(false);
  const [slotUserSet, setSlotUserSet] = useState(false);   // 검수사가 직접 끄고 켠 뒤에는 자동 판단을 멈춘다
  const [fixQuery, setFixQuery] = useState('');
  // V7.94-08: 트윈 수정 — 앞/뒤 두 컨 번호 동시 수정 (사용자 메모 ⑤)
  const [fixQuery2, setFixQuery2] = useState('');
  const [fixPickFront, setFixPickFront] = useState(null);
  const [fixPickBack, setFixPickBack] = useState(null);
  //  ★ 4.26 — 트윈 수정 칸에서 보일 쪽. 'front'(앞만 다름) · 'back'(뒤만 다름) · null(둘 다 다름 — 종전처럼 두 칸). 검수사 2026-10-14 10:33 «앞이 다름 뒤가 다름 그럼 둘다 다름은?»
  const [fixSide, setFixSide] = useState(null);
  // V7.94-08: 홀드 선적 완료 → 다음 베이 선택 프롬프트 (사용자 메모 ②)
  const [deckPromptDone, setDeckPromptDone] = useState(false);
  // V7.94-16: 해치커버 프롬프트 (사용자 요구 — 베이 데크/홀드 완료 시 해치 액션 선택창)
  // V7.99-9 (메모10): 로컬 state만 쓰면 자동→수동→자동 전환 시 GuidedWorkPanel이 언마운트·재마운트되어
  //   플래그가 false로 초기화 → 이미 처리한 해치 프롬프트가 또 떠 다시 눌러야 다음 진행됨.
  //   해결: voyage.info.hatchDone({"discharge_12":"open"...})에 영속 기록하고, 로컬 OR 영속으로 판정.
  const [hatchOpenDone, setHatchOpenDone] = useState(false);    // 양하: 데크 완료 → 오픈 프롬프트 처리됨(로컬 즉시반영)
  const [hatchCloseDone, setHatchCloseDone] = useState(false);  // 홀드 완료 → 클로즈 보고 발송됨(로컬 즉시반영)
  const [hatchBusy, setHatchBusy] = useState(false);
  const [consecFix, setConsecFix] = useState(0);
  const [busy, setBusy] = useState(false);
  //  ★ 2.75: 보류·해제·싱글 전환
  const [resumeCns, setResumeCns] = useState([]);   // 해제 직후 한 번 맨 앞으로 끌어올릴 컨
  const gwHeadRef = useRef(null);   // 4.26: 카드 화면 머리 줄 — 장·단을 고르면 카드가 화면 위로 오게 스크롤
  const gwChipsRef = useRef(null);  // 4.26: 장 칩 줄 — 지금 장 칩이 보이게 가로 스크롤
  const [pulled, setPulled] = useState(null);   // 4.26: «다음 예정» 줄로 올릴 때 넣은 resumeCns 배열 그 자체(띠 표시용 — 해제·한 대씩 등 다른 길이 resumeCns 를 새로 정하면 같은 배열이 아니라 띠가 사라진다)
  const [holdOpen, setHoldOpen] = useState(false);  // 사유 고르는 칸 열림
  const [holdNote, setHoldNote] = useState('');     // 직접 입력 사유
  const [holdList, setHoldList] = useState(false);  // «⏸ 보류 N대» 줄 펼침
  const [singleMode, setSingleMode] = useState(false);  // 트윈을 한 대씩
  const [voiceOn, setVoiceOn] = useState(true);
  // V7.94-05: 카드 내 실번호/XRAY 번호 인라인 입력 (검수사가 카드에서 바로 확인·입력)
  const [editSealCn, setEditSealCn] = useState(null);
  const [sealVal, setSealVal] = useState('');
  const [editXCn, setEditXCn] = useState(null);
  const [xVal, setXVal] = useState('');
  const [xEVal, setXEVal] = useState('');

  // TallyOne 1.53: **네이티브 confirm() 을 앱 안 모달로 바꾼다.**
  //   검수사 지적 2026-08-12 — *"경고를 왜 앱용으로 안 띄우고 피씨용으로 띄우냐."*
  //   confirm() 은 브라우저가 페이지 밖에 그리는 창이라, 뜨는 순간 렌더러가 멈춰 **앱이 통째로 굳는다.**
  //   실측(선적 335대) — 이것 때문에 작업이 30분 정지했고 「⇅ 앞뒤 맞교환」에서도 같은 이유로 두 번 얼었다.
  //   ⚠ confirm() 은 동기 반환이라 그대로는 못 바꾼다. ask() 로 **기다릴 수 있는 물음**을 만들어
  //     `if (!(await ask(...))) return;` 한 줄로 갈아끼운다(ChoiceModal 의 useChoice 와 같은 방식).
  //   ⚠ alert() 는 toast.js 가 전역으로 가로채 논블로킹 토스트로 나가므로 그대로 둔다.
  const [confirmState, askConfirm] = useConfirm();
  const [hatchCountEl, askHatchCount] = useHatchCountConfirm();   // 4.10: 해치 오픈·클로즈 보고 직전에 «총 N장» 을 보이고 고르게 한다
  const ask = (opts) => new Promise((resolve) => {
    askConfirm({ ...opts, onConfirm: () => resolve(true), onCancel: () => resolve(false) });
  });
  //  ★ 4.25-02 — 두 단추가 둘 다 일을 하는 물음(«내 갱 그대로» 대 «○호기로 바꾼다» · «이 한 대만» 대 «짝도 확인»).
  //    ✕ 는 어느 쪽도 아니다(null) — 종전 ask 는 ✕ 를 [취소] 단추와 같게 받아, 닫기만 해도 둘째 단추의 일을 했다.
  const askPick = (opts) => new Promise((resolve) => {
    askConfirm({ ...opts, onConfirm: () => resolve('confirm'), onCancel: () => resolve('cancel'), onClose: () => resolve(null) });
  });
  // 알림 전용(선택지 없음) — 문구·방식은 ContainerList·ContainerDetailModal 과 같은 벌을 쓴다.
  const notify = (title, message) => askConfirm({ title, message, confirmLabel: '확인', cancelLabel: '닫기', onConfirm: () => {} });

  // V8.09-16 (사용자 보고 2026-06-18): 실번호 중복 입력 차단. 같은 항차·같은 모드 안에서
  //   같은 실번호를 서로 다른 컨에 입력하면 막는다. 예외: '0000'(실 부족 표기)은 중복 허용.
  //   일반 실(c.sl)·XRAY 실(c._xraySeal.seal) 각각 자기 종류끼리만 비교한다.
  const dupSealOwner = (val, selfCn, kind) => {
    const v = String(val || '').trim();
    if (!v || v === '0000') return null;   // 빈값·0000은 검사 제외
    for (const o of allContainers) {
      if (!o || o.cn === selfCn || o._mode !== mode) continue;
      const ov = kind === 'xray'
        ? String(o._xraySeal?.seal || '').trim()
        : String(o.sl || '').trim();
      if (ov && ov === v) return o.cn;
    }
    return null;
  };

  const saveSeal = async (c) => {
    //  4.26 (재감사 하-B): 실번호 칸이 엠티실을 보여 주며 열렸는데(sl 비어 있음) 고치지 않고 [저장] 하면 쓰지 않고 닫는다 — 안 그러면 sl·이력이 생겨, 뒤에 엠티실 리스트가 고쳐 들어와도 검수리스트가 옛 값을 읽는다.
    if (!String(c.sl || '').trim() && sealVal.trim() && sealVal.trim() === inspectionSealOf(c)) { setEditSealCn(null); setSealVal(''); return; }
    const dup = dupSealOwner(sealVal, c.cn, 'normal');
    if (dup) { alert(`실번호 중복입니다.\n${sealVal.trim()} 은(는) 이미 ${dup.slice(-4)} 컨에 입력돼 있습니다.\n(실 부족이면 0000으로 입력하세요.)`); return; }
    await fbUpdateRecordSeal(voyageKey, mode, c.cn, sealVal.trim(), inspector);
    setEditSealCn(null); setSealVal('');
  };
  const saveXSeal = async (c) => {
    const dup = dupSealOwner(xVal, c.cn, 'xray');
    if (dup) { alert(`XRAY 실번호 중복입니다.\n${xVal.trim()} 은(는) 이미 ${dup.slice(-4)} 컨에 입력돼 있습니다.\n(실 부족이면 0000으로 입력하세요.)`); return; }
    await fbSetXraySeal(voyageKey, c.cn, xVal.trim(), xEVal.trim(), inspector);
    setEditXCn(null); setXVal(''); setXEVal('');
  };
  //  ★ 4.25-02 (모의 작업 MCAP 2호기 seq47 · OBWH 11대 — 가이드 밖에서 온 X-RAY 컨은 «XRAY 실번호를 먼저 입력하세요» 경고만 뜨고
  //    수정 칸·큰 카드에 입력칸이 없어 리스트 탭으로 6~13번 눌러 돌아가야 했다): 막는 자리에서 **그 컨의 XRAY 입력칸을 바로 연다.**
  //    카드에 있는 컨이면 카드 안 칸이, 카드 밖 컨(수정으로 고른 컨)이면 카드 아래 같은 모양의 칸이 열린다(xrayEditRow 한 벌).
  //    입력 자판은 종전대로 숫자(검수사 확정 2026-06-18 — 실측 XRAY 실 OBWH 2763E 28대·STMJ 2659E 6대 전부 숫자 여섯 자리).
  const needXray = (cn, listTxt = '') => {
    const src = allContainers.find(x => x.cn === cn && x._mode === mode) || {};
    setEditXCn(cn); setXVal(src._xraySeal?.seal || ''); setXEVal(src._xraySeal?.eseal || '');
    alert(`XRAY 실번호를 먼저 입력하세요.\n${listTxt || String(cn || '').slice(-4)}은 XRAY 대상입니다 — 열린 칸에 넣고 [XRAY 저장] 뒤 다시 누르세요.`);
  };

  //  ★ 3.47 — **규격이 자료마다 다른 컨은 여기서 실물을 보고 확정한다.**
  //    검수사 2026-09-14 «불일치가 나온다면 이들은 실물을 보기전에는 확정할수 없습니다. 그러므로
  //    알림을 띄우고 그컨테이너가 **양하 되거나 선적될때** 세개중에 어느것이 맞는지 선택할수 있어야 합니다.»
  //    ⚠ 판정은 만들지 않는다 — utils 의 isoConflictOf 한 벌을 부른다(진단 패널과 같은 답).
  //    ⚠ EDI 자리는 **EDI 제 칸(`iso_edi`)만** 본다. `c.iso` 는 화면마다 병합 규칙이 달라
  //      어느 자료의 값인지 모른다 — 그것을 EDI 라고 띄웠다가 틀린 값이 확정될 뻔했다(감사 지적).
  //      제 칸이 없으면 EDI 자리는 **비운다.** 모르는 것을 지어내지 않는다.
  //    ⚠ **고르기 전이라고 완료를 막지 않는다**(검수사 통보 2026-09-14) — 「미확정」만 보인다.
  const isoPickOf = (c) => c ? isoConflictOf(c.iso_edi || '', c) : null;
  const savePickIso = async (c, src) => {
    if (!c || !src || busy) return;
    if (!inspector) { alert('검수원을 먼저 선택하세요.'); return; }   // §5-3 신원 칸을 빈칸으로 남기지 않는다
    setBusy(true);
    try {
      await fbPickIso(voyageKey, mode, c.cn, src.k, src.iso, src.label, inspector);   // 원문이 아니라 **정규화한 ISO**
      try { speak(`${c.cn.slice(-4)} 규격 ${src.spec} 확정했습니다.`, { conversational: true }); } catch { /* 소리 꺼짐 */ }
    } catch (e) {
      //  §4-3 조용히 실패하지 않는다 — 안 저장됐는데 단추만 다시 켜지면 확정한 줄 안다.
      alert(`규격 확정을 저장하지 못했습니다. 다시 눌러 주세요.\n(${(e && e.message) || e})`);
    } finally { setBusy(false); }
  };

  // 접안 방향 저장 — 오선택 방지: 확인 후 저장
  const pickBerth = async (side) => {
    if (!canWorkNow()) { alert(workGateText('작업 설정 변경')); return; }   // 3.51: 조회만은 보기만 — 남의 작업 큐를 바꾸지 않는다
    const label = side === 'starboard' ? '우현' : '좌현';
    const seaRows = side === 'starboard' ? '짝수' : '홀수';
    // 1.53: window.confirm → 앱 안 모달 (렌더러 정지 제거).
    const ok = await ask({
      title: '접안 방향 저장',
      message: `접안 방향을 [${label} 접안]으로 저장합니다.\n(${seaRows} 로우가 해상쪽)\n\n양하/선적 순서가 모두 이 기준으로 계산됩니다. 맞습니까?`,
      confirmLabel: '맞습니다', cancelLabel: '취소',
    });
    if (!ok) return;
    // V9.57(I8): fire-and-forget 저장 실패가 조용히 사라지던 것 — 실패를 알린다
    //  3.40: 검수사가 고른 것은 `berthSidePick` 에도 적는다 — 수집기는 `berthSide` 만 덮으므로
    //    이 칸이 있어야 «바꿔도 다시 바뀌는» 일이 안 난다(utils.berthSideOf 가 이것을 먼저 본다).
    fbUpdateVoyageInfo(voyageKey, { berthSide: side, berthSidePick: side })
      .catch(e => { console.warn('[V9.57] 접안 방향 저장 실패', e); alert('접안 방향 저장에 실패했습니다. 네트워크 확인 후 다시 선택해 주세요.'); });
  };
  //  ★ 4.09: 양하 순서 조건 저장 — 로우 방향·부류 조건 모두 항차 info.workOrder/{호기} 한 칸에 적는다(PATCH, 다른 호기는 그대로).
  //    종전 3.3 의 «⇄ 육상부터/해상부터» 항차 단위 저장(seqRowFrom)은 읽기만 남는다 — 호기 칸이 없으면 그 값이 로우 방향이다.
  const saveWorkOrder = async (next) => {
    if (!canWorkNow()) { alert(workGateText('작업 설정 변경')); return false; }   // 3.51: 조회만은 보기만 — 남의 작업 큐를 바꾸지 않는다
    try { await fbSetWorkOrder(voyageKey, equip, next, inspector); return true; }
    catch (e) { console.warn('[4.09] 양하 순서 저장 실패', e); alert('양하 순서 저장에 실패했습니다. 네트워크 확인 후 다시 눌러 주세요.'); return false; }
  };
  const pickRow = (r) => { if (r !== rowFrom) saveWorkOrder({ rowFrom: r, prefs: wo.prefs }); };
  const pickPref = (k) => saveWorkOrder({ rowFrom, prefs: togglePref(wo.prefs, k) });
  const resetWorkOrder = async () => {
    if (!canWorkNow()) { alert(workGateText('작업 설정 변경')); return; }
    const ok = await ask({
      title: '양하 순서를 기본으로',
      message: `${equip || '이 항차'} 의 양하 순서 조건을 지우고 기본(육상부터 · 부류 조건 없음)으로 돌립니다.\n기사가 바뀌었을 때 쓰십시오. 맞습니까?`,
      confirmLabel: '맞습니다', cancelLabel: '취소',
    });
    if (!ok) return;
    //  호기 칸을 지우면 «전체» 칸이나 옛 항차 단위 seqRowFrom 이 다시 읽힌다 — 그런 칸이 남아 있으면 지워서는 기본으로 안 돌아오므로 기본값을 이 호기 칸에 적어 둔다.
    const fallbackLeft = voyage?.info?.seqRowFrom === 'sea' || (!!equip && !!voyage?.info?.workOrder?.[ALL_EQUIP_KEY]);
    await saveWorkOrder(fallbackLeft ? { rowFrom: 'land', prefs: [] } : null);
  };
  const changeBerth = async () => {
    if (!canWorkNow()) { alert(workGateText('작업 설정 변경')); return; }   // 3.51: 조회만은 보기만 — 남의 작업 큐를 바꾸지 않는다
    // 1.53: window.confirm → 앱 안 모달.
    const ok = await ask({
      title: '접안 방향 변경',
      message: '접안 방향을 변경하면 작업 순서(육상↔해상)가 뒤집힙니다.\n변경 화면으로 이동할까요?',
      confirmLabel: '변경', cancelLabel: '취소', danger: true,
    });
    if (!ok) return;
    //  3.40: 검수사가 고른 칸도 같이 비운다 — 하나만 비우면 그 값이 남아 «다시 묻기» 가 안 된다.
    fbUpdateVoyageInfo(voyageKey, { berthSide: '', berthSidePick: '' })
      .catch(e => { console.warn('[V9.57] 접안 방향 초기화 실패', e); alert('접안 방향 초기화에 실패했습니다. 네트워크 확인 후 다시 시도해 주세요.'); });  // V9.57(I8)
    setSelectedGroup(null);
  };

  // 모드 작업분 (평택분 + 시프팅, 미완료)
  //   1.76-05: `_ptk` 만 보던 것을 `_ptk || _shift` 로 넓혔다 — 검수사 메모 2026-08-16
  //   *"시프팅 화물이 양하대상에 목록에 안보임. 순서에서도 빠짐."* 시프팅은 크레인이 두 번 드는
  //   실작업인데 큐 생성기에 **도달조차 못 했다.**
  //   ⚠ 넓히는 것은 **큐 입력 여기뿐**이다. `_shift` 컨의 `_ptk` 는 false 로 두어
  //     집계·마감텔리·수석 대시보드는 종전 그대로 둔다(검수사 확정 «카운트는 섞지 않는다»).
  const _isWork = (c) => !!(c._ptk || c._shift);
  /* ★ 2.89-03 (검수사 2026-08-30 «수동이 한걸 자동이 모릅니다. 자동은 수동을 무시합니다») —
       수동(번호 수정·직접 입력)이 계획 칸을 **다른 실컨으로 채워 완료**해도 계획 컨은 완료가 아니라서,
       자동 큐가 이미 찬 칸을 또 내밀었다(실측 MCSC 38번 82단 — 5660 실은 칸에 계획컨 1603 재제시).
       칸이 완료 실물로 찼으면 그 칸의 계획 컨은 이름을 빌려준 것(§5-Y-B) — 남은 작업이 아니다.
       점유 판정은 buildOccupancy·posKey 한 벌(수동 SearchPanel 273행과 동일 소스). */
  const _occDone = useMemo(
    () => buildOccupancy(allContainers.filter(c => c._mode === mode), (c) => !!c._comp),
    [allContainers, mode]
  );
  const remaining = useMemo(
    () => allContainers.filter(c => {
      if (!(c._mode === mode && _isWork(c) && !c._comp && c.bay && c.row && c.tier)) return false;
      const o = _occDone.get(posKey(c));
      return !(o && o.done && o.cn !== c.cn);   // 완료 실물이 찬 칸의 계획 컨 제외
    }),
    [allContainers, mode, _occDone]
  );
  const modeAll = useMemo(
    () => allContainers.filter(c => c._mode === mode && _isWork(c) && c.bay),
    [allContainers, mode]
  );

  const bayPairs = useMemo(() => getBayPairs(modeAll, shipImo, shipName), [modeAll, shipImo, shipName]);

  // 베이 → 그룹 center (홀수+짝꿍은 사이 짝수가 center, 단독 홀수는 자기 자신)
  // TallyOne 1.8-09: 계산을 swapGrade.bayGroupCenter 로 단일화.
  //   수동 해치 보고(WorkReportModal)가 같은 그룹 키를 찍어야 자동 유도가 그걸 알아본다.
  //   두 곳이 각자 계산하면 반드시 갈라진다.
  const groupCenterOf = (bayStr) => bayGroupCenter(bayStr, bayPairs);

  // V7.99-9 (메모10): 해치 처리 영속 상태 — voyage.info.hatchDone["{mode}_{center}"] = 'open'|'close'
  //   모드 전환으로 재마운트돼도 voyage prop은 유지되므로 프롬프트가 다시 안 뜬다.
  /* ★ 2.88 (검수사 지시 2026-08-30) — **커버는 배에 하나뿐이다. 모드로 가르지 않는다.**
       검수사 — *«수동 보고를 하면 자동가이드 사용시 커버가 열린줄도 닫힌줄도 모른단 겁니다»*
     실측 MCSC 633N — 15:28 에 **선적 작업 중** 38번 커버를 닫았는데 장비(4호기)가 양하로 잡혀
     `discharge_38` 로 저장됐다. 선적 화면은 `loading_38` 을 찾으니 없다. 그래서 닫은 커버를
     열린 것으로 알고 데크를 못 열었다(검수사 메모 «데크 선적해야 하는데 데크에 안보인다»).
     ⇒ 키에서 모드를 뺀다. 옛 키는 읽기에서만 받아 준다(이미 쌓인 기록을 버리지 않는다). */
  const hatchKeyOf = (center) => String(center);
  /*  reports 는 시간순 사실이다 — **마지막 보고가 곧 지금 상태**다. */
  const lastHatchAction = (center) => {
    const reps = voyage?.reports;
    if (!reps) return null;
    let act = null, bestTs = -1;
    for (const r of Object.values(reps)) {
      if (!r || r.type !== 'hatch') continue;
      const bs = Array.isArray(r.bays) ? r.bays : [];
      if (!bs.some((b) => groupCenterOf(b) === center)) continue;
      const ts = hatchReportTs(r);   // 3.49: 자동 기록은 적힌 때가 아니라 사건 시각 — 나중에 적힌 옛 열림이 수동 닫힘을 덮지 않게(2차 감사)
      if (ts >= bestTs) { bestTs = ts; act = r.action; }
    }
    return act;
  };
  const isHatchDoneSaved = (center, action) => {
    if (center == null) return false;
    //  ① 보고 기록(시간순 마지막)이 진실이다
    const last = lastHatchAction(center);
    if (last) return last === action;
    //  ② 보고가 없으면 표시를 본다 — 새 키(모드 없음) → 옛 키(모드별) 순
    const hd = voyage?.info?.hatchDone || {};
    const v = hd[String(center)] ?? hd[`loading_${center}`] ?? hd[`discharge_${center}`];
    if (v === action) return true;
    // TallyOne 1.8-10: **보고 기록으로 소급 인식**한다.
    //   검수사 지적 2026-08-05 — "닫았는데 또 닫았다는 이야기인데 맞질 않습니다."
    //   1.8-09 는 앞으로의 수동 보고만 hatchDone 에 찍는다. 그러면 이미 보낸 옛 보고
    //   (04:15·04:58 베이 18 CLOSE 등)는 여전히 되묻고, 거기서 누르면 **카톡이 또 나가**
    //   이미 닫은 커버를 또 닫았다고 보고하게 된다. 이중 보고가 되물음보다 나쁘다.
    //   → hatchDone 은 빠른 표시일 뿐이고 **reports 가 진실**이다. 둘 다 본다.
    //   ⚠ 옛 기록엔 mode 가 없다. 있으면 대조하고, 없으면 action+그룹만 맞으면 인정한다 —
    //     잘못 인정해도 결과는 '안 물어봄'이고 필요하면 수동 보고로 언제든 보낼 수 있다.
    const reps = voyage?.reports;
    if (reps) {
      for (const r of Object.values(reps)) {
        if (!r || r.type !== 'hatch' || r.action !== action) continue;
        //  2.88: r.mode 로 거르지 않는다 — 커버는 배의 상태 하나다. 이 줄이 위 사고의 자리였다.
        const bs = Array.isArray(r.bays) ? r.bays : [];
        if (bs.some(b => groupCenterOf(b) === center)) return true;
      }
    }
    return false;
  };
  const markHatchDone = async (center, action) => {
    if (!canWorkNow()) { alert(workGateText('해치 완료 표시')); return; }   // 3.51: 조회만은 보기만 — 남의 작업 큐를 바꾸지 않는다
    if (center == null) return;
    const prev = voyage?.info?.hatchDone || {};
    // V9.57(I8): 빈 catch로 조용히 실패하던 것 — 저장 안 되면 모드 전환 때 프롬프트가 또 뜬다. 알린다.
    try { await fbUpdateVoyageInfo(voyageKey, { hatchDone: { ...prev, [hatchKeyOf(center)]: action } }); }
    catch (e) {
      console.warn('[V9.57] 해치 처리 상태 저장 실패', e);
      alert('해치 처리 상태 저장에 실패했습니다.\n(저장 안 되면 모드 전환 시 해치 안내가 다시 뜰 수 있습니다.)');
    }
  };

  // 그룹 목록 (남은 작업이 있는 그룹만) — V7.94-23: 홀드/데크 잔여 구분
  // V7.99-8 (메모6): 단(홀드/데크) 선택 버튼에 규격별(20FT/40FT) 내역 표시용 집계 추가.
  const groups = useMemo(() => {
    const is40 = (c) => { const f = String(c.iso || '')[0]; return f === '4' || f === 'L' || f === '9' || String(c.tp || '').includes('40'); };
    const map = {};
    for (const c of remaining) {
      const center = groupCenterOf(c.bay);
      if (center == null) continue;
      const g = (map[center] ||= { center, bays: new Set(), count: 0, deck: 0, hold: 0, deck20: 0, deck40: 0, hold20: 0, hold40: 0 });
      g.bays.add(parseInt(c.bay, 10));
      g.count++;
      const isDeck = parseInt(c.tier, 10) >= 80, big = is40(c);
      if (isDeck) { g.deck++; if (big) g.deck40++; else g.deck20++; }
      else { g.hold++; if (big) g.hold40++; else g.hold20++; }
    }
    return Object.values(map).sort((a, b) => a.center - b.center);
  }, [remaining, bayPairs]);
  //  ★ 4.26-02 (모의 작업 OBWH 1호기 — «B5·6·7» 이 6번 베이를 끝내자 «B5·7» 로 바뀌어 다른 묶음처럼 보였다) — 묶음 이름은 그 묶음의 **전체 작업분**(완료 포함)으로 짓는다.
  //    대수·단 집계(위 groups)는 종전대로 남은 컨이다. 이름만 고정한다(해치 보고 키·묶음 center 는 손대지 않는다).
  const groupBaysAll = useMemo(() => {
    const m = new Map();
    for (const c of modeAll) {
      const center = groupCenterOf(c.bay);
      const b = parseInt(c.bay, 10);
      if (center == null || !Number.isFinite(b)) continue;
      if (!m.has(center)) m.set(center, new Set());
      m.get(center).add(b);
    }
    return m;
  }, [modeAll, bayPairs]);
  const groupLbl = (center, g) => {
    const set = groupBaysAll.get(center) || g?.bays;
    return set && set.size ? [...set].sort((a, b) => a - b).join('·') : String(center);
  };

  //  2.90: 물려받은 베이가 이쪽 묶음 center 와 안 맞으면(짝 계산 입력 차이) 그 베이를 품은 묶음으로
  //    옮겨 앉는다. 품은 묶음도 없으면 비운다 — 이쪽 모집단에 그 베이 일이 없는 것이라 게이트가 다시 묻는다.
  //  ⚠ 2.90(감사 지적): 이 정리는 «물려받은 값 1회»만 한다(아래 ref 로 무장해제). groups 는 remaining
  //    으로만 만들어서, 어느 그룹의 마지막 컨을 끝내면 그 그룹이 목록에서 사라진다 — 그 순간을 «이탈»로
  //    오판해 비우면 방금 뜬 «양하 완료! 해치커버 클로즈» 카드가 한 프레임에 사라진다(소진 ≠ 이탈).
  const _snapArmedRef = useRef(true);   // 마운트 = 물려받는 순간
  useEffect(() => {
    if (selectedGroup == null || !groups.length) return;
    if (!_snapArmedRef.current) return;
    _snapArmedRef.current = false;
    if (groups.some((g) => g.center === selectedGroup)) return;
    const host = groups.find((g) => g.bays && g.bays.has(parseInt(selectedGroup, 10)));
    if (host) setSelectedGroup(host.center); else setSelectedGroup(null);
  }, [selectedGroup, groups]);

  // ── TallyOne 1.55: **베이 묶음을 바꿀 때 갱(호기)을 되묻는다.** (검수사 확정 2026-08-12)
  //   원문 — *"카톡 내용을 보면 장비를 바꿔서 해야 하는데 4호기로 다함.
  //           이걸로 제출하면 2호기에서 작업한 인원은 그날 인건비를 받지 못함."*
  //   현장에서는 두 갱이 **동시에** 다른 베이를 잡는다(2호기 4·8·12번 / 4호기 16·20·24번).
  //   그런데 앱은 베이 묶음을 바꿔도 갱을 안 물어, 4호기 상태 그대로 2호기 담당 베이를 받아 적었다.
  //   근거는 둘뿐이다 — ① 작업 보고(`voyages/{key}/reports` 의 `equip`+`bays`)
  //                    ② 완료 기록(`completed/{cn}.equip`, 1.55 부터 쌓인다).
  //   근거가 없으면(그 베이 첫 작업) **묻지 않는다.** 추측으로 묻기 시작하면 곧 아무도 안 읽는다.
  const priorEquipOf = (center) => {
    if (center == null) return null;
    let best = null;                       // { equip, at }
    const take = (eq, at) => {
      const e = String(eq || '').trim();
      if (!e) return;
      const t = Number(at) || 0;
      if (!best || t > best.at) best = { equip: e, at: t };
    };
    const reps = voyage?.reports;
    if (reps) {
      for (const r of Object.values(reps)) {
        if (!r || !r.equip) continue;
        if (r.mode && r.mode !== mode) continue;
        const bs = Array.isArray(r.bays) ? r.bays : [];
        if (!bs.some(b => groupCenterOf(b) === center)) continue;   // 베이를 모르는 보고는 근거가 아니다
        take(r.equip, r.ts);
      }
    }
    for (const c of allContainers) {
      if (!c || c._mode !== mode || !c._comp || !c._comp.equip) continue;
      if (groupCenterOf(c.bay) !== center) continue;
      take(c._comp.equip, c._comp.at);
    }
    return best;
  };

  // 베이 묶음 선택 — 다른 갱이 이미 작업한 베이면 앱 안 모달로 되묻는다.
  //   ⛔ window.confirm 은 쓰지 않는다(1.54 에서 검수 흐름의 네이티브 창을 전부 걷어냈다 — 뜨는 순간 앱이 굳는다).
  //  ★ 4.25-02 (모의 작업 MCAP 2호기 — 한 장 고를 때마다 이 창이 떴고, 큰 초록 단추가 «○호기로 바꾼다» 라 3~5번 남의 호기로 넘어갔다 · 검수사 2026-10-13 00:53 «전부 클로드 안대로 수정»):
  //    큰 단추(기본) = **지금 내 갱 그대로**, 바꾸기는 회색 단추로만. ✕ 로 닫아도 그대로다. 같은 장·같은 두 호기면 이 화면에서 한 번만 묻는다.
  //    한 장을 두 호기가 나눠 하는 것은 흔한 일이다(공유 장) — 묻는 까닭은 «호기를 잘못 고른 채 시작했는지» 한 번 보게 하는 것뿐이다.
  const pickGroup = async (g) => {
    if (!g) return;
    const prior = priorEquipOf(g.center);
    const _gk = prior ? `${voyageKey}|${inspector || ''}|${mode}|${g.center}|${prior.equip}|${equip}` : '';   // 검수원도 열쇠에(같은 창 다음 사람은 다시 묻는다 — 재감사 하)
    if (prior && equip && prior.equip !== equip && !_askedGang.has(_gk)) {
      const bayLbl = `B${groupLbl(g.center, g)}`;   // 4.26-02: 묶음 이름 한 벌
      const pick = await askPick({
        title: '이 베이는 다른 갱도 작업했습니다',
        message: `${bayLbl}는 ${prior.equip}가 작업했습니다.\n지금 내 갱은 ${equip}입니다.\n같은 장을 나눠 하는 것이면 [${equip} 그대로] — 이 베이 작업이 ${equip} 실적으로 올라갑니다.\n호기를 잘못 고른 것이면 [${prior.equip}로 바꾼다].`,
        confirmLabel: `${equip} 그대로`,
        cancelLabel: `${prior.equip}로 바꾼다`,
      });
      _askedGang.add(_gk);
      if (pick === 'cancel') pickEquip(prior.equip);   // 헤더·작업 보고와 한 벌(localStorage + equipChanged)로 같이 바뀐다
    }
    setSelectedGroup(g.center); setConsecFix(0); setDeckPromptDone(false); setFixOpen(false);
  };

  //  ★ 2.75 **양하 불가(보류)** — 검수사 실측 2026-08-27, 자동 가이드가 그날 세 번 멈췄다.
  //    *«콘이 잠겨 있어서 다음 컨테이너를 양하 하다 보니 자동가이드 멈추고»* — 멈추면 수동으로 가야 했고
  //    수동으로 가면 순서 안내를 잃는다. ⇒ 못 하는 한 대만 빼고 큐는 계속 돈다.
  //    ⚠ 보류는 **완료가 아니다** — 대수·인건비 집계에 안 섞인다(별도 노드 `held`).
  const HOLD_ASK_AFTER = 3;          // 검수사 확정: *«보통은 컨테이너 3-5개 다른거 작업하고 있으면 라싱인력이 옵니다»*
  const HOLD_LONG_MS = 60 * 60000;   // 검수사 확정: *«콘 잠김은 길어야 1시간이내입니다»* — 넘으면 매 카드마다 묻는다
  const HOLD_REASONS = ['콘 잠김', '트윈 무게 초과', '컨 홀 불량(스프레더 안착 불가)'];
  const held = useMemo(() => activeHeldOf(voyage, mode), [voyage, mode]);   // 4.26-02: 실린(완료된) 컨의 보류는 뺀다 — 종전엔 실어도 «보류 12대» 로 남았다(모의 작업 MCAP 3호기)
  const heldSet = useMemo(() => new Set(held.map((x) => x.cn)), [held]);
  //  ★ 4.26-02 (모의 작업 MCAP 3호기 — 2호기가 건 보류가 3호기 화면에 [해제] 와 함께 떴다): 보류는 항차에 하나다(콘이 잠기면 누구에게나 잠긴 것 — 노드는 그대로).
  //    줄은 «이 장» 과 «다른 장» 으로 나눠 보이고, 다른 장 보류를 풀 때는 누가 무슨 까닭으로 건 것인지 한 번 묻는다. 자리(베이-열-단)도 붙인다.
  const heldSplit = useMemo(() => {
    const byCn = new Map(allContainers.filter((c) => c._mode === mode).map((c) => [String(c.cn || '').toUpperCase(), c]));
    const mine = [], other = [];
    for (const h of held) {
      const c = byCn.get(h.cn);
      const pos = c && c.bay && c.row && c.tier ? `${parseInt(c.bay, 10)}-${c.row}-${c.tier}` : '';
      const here = selectedGroup == null || (!!c && groupCenterOf(c.bay) === selectedGroup);
      (here ? mine : other).push({ ...h, _pos: pos });
    }
    return { mine, other };
  }, [held, allContainers, mode, selectedGroup, bayPairs]);
  //  이 모드의 완료 대수 — «몇 대 지났나»의 기준(새로고침해도 같은 수가 나온다).
  const doneN = useMemo(() => allContainers.filter((c) => c._mode === mode && c._ptk && c._comp).length,
    [allContainers, mode]);
  //  되묻기 차례 — **콘 잠김만** 묻는다. 홀 불량·무게 초과는 기다린다고 풀리는 게 아니다.
  const holdDue = useMemo(() => {
    const now = Date.now();
    for (const h of held) {
      if (!/콘/.test(h.reason)) continue;
      const need = (now - (h.at || now) > HOLD_LONG_MS) ? 0 : HOLD_ASK_AFTER;
      if (doneN - (h.doneAt || 0) >= need) return h;
    }
    return null;
  }, [held, doneN]);
  const holdGroupOf = (h) => (h?.group ? String(h.group).split(',') : [h?.cn]).filter(Boolean);

  // 선택 그룹의 예측 큐 — V7.99-8 (메모6): 선택된 단(selectedTier)만 큐에 (홀드 작업=홀드만/데크 작업=데크만)
  const queue = useMemo(() => {
    if (selectedGroup == null) return [];
    let targets = remaining.filter(c => groupCenterOf(c.bay) === selectedGroup);
    if (selectedTier === 'deck') targets = targets.filter(c => parseInt(c.tier, 10) >= 80);
    else if (selectedTier === 'hold') targets = targets.filter(c => parseInt(c.tier, 10) < 80);
    //  ★ 2.75: 보류한 컨은 큐에서 뺀다 — 단, 되묻기 차례가 된 것은 다시 넣고 맨 앞으로 끌어온다.
    const dueCns = holdDue ? holdGroupOf(holdDue).map(x => String(x).toUpperCase()) : [];
    targets = targets.filter(c => {
      const cn = String(c.cn || '').toUpperCase();
      return !heldSet.has(cn) || dueCns.includes(cn);
    });
    const dueHere = dueCns.filter((cn) => targets.some((c) => String(c.cn || '').toUpperCase() === cn));
    return buildGuidedQueue({
      containers: targets, mode,
      evenRowsSeaSide: berthSide === 'starboard',           // 우현 접안 = 짝수 로우 해상쪽
      //  4.23-01 3차(재감사 중-2): 맞교환 자리 컨은 칸으로 짝을 짐작하지 않는다 — 트윈 조회(SearchPanel autoMate)와 같은 규칙(utils.guideTwinOf)
      findTwin: guideTwinOf((t, all, used) => findTwinCandidate(t, all, used, shipImo, shipName)),
      streamPref,                                           // V8.50: 갈림 선택 부류
      //  4.26 (감사·2차 시뮬 중-1): 되묻기 컨이 **이 큐에 있을 때만** 그것이 맨 앞을 차지한다. 종전엔 다른 장·다른 호기의 콘 잠김 보류가 되묻기 차례가 되면
      //    (이 큐엔 없어 아무것도 안 올리면서) 해제·한 대씩 남은 짝(4.08-02)·한 대만 남은 컨(4.25-02)·다음 예정 줄의 «맨 앞» 을 전부 지웠다.
      frontCns: dueHere.length ? dueHere : (resumeCns.length ? resumeCns : null),   // 2.75: 해제·되묻기는 맨 앞
      rowFrom,                                              // 3.3: 양하 «해상부터» (4.09: 호기별)
      orderPrefs,                                           // 4.09: 양하 부류 조건(리퍼부터·20부터…) — 호기별로 기억한 것
      bayFirst,                                             // 3.77: 양하·선적 «베이 먼저»
      planAll: modeAll,                                     // 3.72-01: 선적 도착항 순위는 완료한 컨을 포함한 전체 계획으로 잰다(진행 중 순위가 안 뒤집히게)
    });
  }, [remaining, modeAll, selectedGroup, selectedTier, mode, berthSide, bayPairs, shipImo, shipName, streamPref, heldSet, holdDue, resumeCns, rowFrom, orderKey, bayFirst]);

  const card = queue[0] || null;
  //  4.25-02 (2차 시뮬 하): XRAY 입력칸은 그 카드에서만 — 카드가 넘어가면 닫는다(카드 밖 수정 컨의 칸이 다음 카드 아래에 남아 있었다).
  useEffect(() => { setEditXCn(null); setXVal(''); setXEVal(''); }, [card?.main?.cn, card?.twin?.cn]);

  //  2.80: 선적 + 지금 카드가 엠티면 «자리 확인» 모드를 스스로 켠다(검수사가 직접 만진 뒤에는 그 뜻을 지킨다).
  //    풀로 넘어가면 도로 끈다 — 풀은 계획대로 들어간다(실측).
  useEffect(() => {
    if (slotUserSet || mode !== 'loading' || !card?.main) return;
    const isEmpty = String(card.main.fe || '').toUpperCase() === 'E';
    setSlotMode(isEmpty);
  }, [card, mode, slotUserSet]);

  // V8.50: 갈림 감지 — 지금 바로 내릴 수 있는 카드들에 부류가 섞여 있으면 선택 버튼 제시 (양하만).
  //   1.57: 선적에도 건다. 종전엔 양하 전용이라 선적은 고정 순서(20싱글→트윈→40)밖에 안 나왔다.
  const availCards = useMemo(() => availableCardsOf(queue, mode === 'loading' ? 'below' : 'above'), [queue, mode]);   // ★ 4.26-04: 선적은 선적 판정(아래 먼저) — 순서를 당기는 pullStreamForward(…,'below') 와 같은 판정
  const forkChips = useMemo(() => {
    if (availCards.length < 2) return null;
    const cnt = { F: 0, E: 0, RF: 0, GEN: 0, '40': 0, '20': 0 };
    for (const cd of availCards) {
      const k = conClassOf(cd.main);
      const size = cd.twin ? '20' : k.size;
      cnt[k.fe]++; cnt[size]++;
      if (k.fe === 'F') cnt[k.rf ? 'RF' : 'GEN']++;
    }
    const chips = [];
    if (cnt.F && cnt.E) chips.push(['F', cnt.F], ['E', cnt.E]);
    if (cnt.GEN && cnt.RF) chips.push(['GEN', cnt.GEN], ['RF', cnt.RF]);
    if (cnt['40'] && cnt['20']) chips.push(['40', cnt['40']], ['20', cnt['20']]);
    return chips.length ? chips : null;
  }, [availCards, mode]);

  //  ★ 4.09: 부류 조건(orderKey)이 바뀌면 — 이 기기에서 눌렀든 다른 폰이 바꿨든 — 갈림 칩(일시 «○ 우선 중»)을 끈다.
  //    안 끄면 방금 정한 조건 위에 옛 흐름이 남아 첫 카드가 창의 «1. ○○부터» 와 어긋난다. 저장 응답이 아니라 값이 바뀐 때 끄므로 로컬 반영과 같이 움직인다.
  useEffect(() => { setStreamPref(null); }, [orderKey]);

  // V8.50: 선택 부류가 소진되면 자동 해제 — 기본 층 순서로 복귀.
  useEffect(() => {
    if (!streamPref) return;
    if (!queue.some(cd => cardMatchesPref(cd, streamPref))) setStreamPref(null);
  }, [queue, streamPref]);

  //  ★ 3.77: 고른 베이가 소진되면 자동 해제 — 남은 짝은 다시 트윈으로.
  useEffect(() => {
    if (bayFirst == null) return;
    if (!queue.some(cd => [cd.main, cd.twin].some(x => x && parseInt(x.bay, 10) === bayFirst))) setBayFirst(null);
  }, [queue, bayFirst]);

  // ★ TallyOne 1.57: 흐름 감지 — 실제로 처리한 컨 3대가 연속 같은 부류면 그 흐름으로 바꾼다.
  //   검수사 원문 2026-08-13: "일단 모든 컨테이너를 기본 컨테이너 취급을 하고 같은 순서로 …
  //     그렇게 하다가 혼재 되어 있을때 연속으로 리퍼(또는 20피트) 먼저 양하를 하는것 같으면
  //     그 순서를 감지 하고 방식을 바꿉니다."
  //   V8.50 의 무언 적응(예측과 1대만 달라도 즉시 재앵커)을 대체한다 — 1대는 우연일 수 있다.
  //   ⓐ 혼재일 때만 본다(forkChips 가 없으면 갈림이 아니다) — 안 그러면 층 순서상 우연히 붙은
  //      3대에도 계속 흐름이 잡힌다.
  //   ⓑ EDI 순번(`eseq`)대로 오름차순 진행 중이면 바꾸지 않는다.
  //      검수사 원문: "단 연속으로 EDI대로 선적할때는 그게 우선입니다."
  //   ⓒ 리퍼는 풀일 때만 리퍼로 센다 — "리퍼 엠티는 일반 엠티랑 같습니다."
  const recentRef = useRef([]);
  const noteWorked = (c, alone = false) => {
    if (!c) return;
    //  ★ 3.77: 짝이 남은 채 혼자 내린 컨(alone)이 같은 베이로 두 번 연속이면 «그 베이 먼저»로 바꾼다(기사가 한쪽 베이를 몰아 내리는 날).
    {
      if (alone) {
        const b = parseInt(c.bay, 10);
        singleBaysRef.current = [...singleBaysRef.current, b].slice(-2);
        const sb = singleBaysRef.current;
        if (sb.length === 2 && sb[0] === sb[1] && bayFirst !== b) { setBayFirst(b); speak(`${b}번 베이 먼저로 바꿉니다`); }
      } else singleBaysRef.current = [];
    }
    const k = conClassOf(c);
    const eseq = Number.isFinite(c.eseq) ? c.eseq : null;
    recentRef.current = [...recentRef.current, { fe: k.fe, rf: k.rf, size: k.size, eseq }].slice(-STREAM_STREAK);
    const r = recentRef.current;
    if (r.length < STREAM_STREAK) return;
    if (!forkChips) return;                                   // ⓐ 혼재가 아니면 감지하지 않는다
    if (orderKey) return;                                     // 4.09: 검수사가 기사의 방법을 정해 두었으면 그 방법이 이긴다 — 3대 연속 감지로 바꾸지 않는다
    const sq = r.map(x => x.eseq);
    if (sq.every(v => v != null) && sq.every((v, i) => i === 0 || v > sq[i - 1])) return;   // ⓑ EDI 순번대로면 유지
    let next = null;                                          // 좁은 부류부터 본다
    if (r.every(x => x.fe === 'F' && x.rf)) next = 'RF';
    else if (r.every(x => x.fe === 'F' && !x.rf)) next = 'GEN';
    else if (r.every(x => x.fe === 'E')) next = 'E';
    else if (r.every(x => x.size === '20')) next = '20';
    else if (r.every(x => x.size === '40')) next = '40';
    if (next && next !== streamPref) { setStreamPref(next); speak(`${PREF_LABEL[next]} 흐름으로 바꿉니다`); }
  };

  // 1.76-05: 실(봉인)번호 중복 — 지금 카드의 컨이 **다른 컨과 같은 실번호**를 달고 있으면 알린다.
  //   검수사 신고 2026-08-16 «MAMP 실번호 중복이 있었는데 알림없음 0570668».
  //   PH0570668 이 MNBU3256200·MNBU4383895 두 대에 함께 들어간 채 둘 다 검수 완료됐다.
  //   판정기(dupSealOwner)는 **손으로 실을 칠 때만** 돌았다 — 리스트가 실어 온 중복은 발동할 자리가 없었다.
  //   판정은 utils.dupSealMap 한 벌(목록 배지·챗봇 답변과 같은 것). 카드가 뜰 때마다 본다.
  const modeDupSeals = useMemo(
    () => dupSealMap(allContainers.filter(c => c && c._mode === mode)),
    [allContainers, mode]);
  const sealDupWarn = useMemo(() => {
    if (!card) return [];
    const out = [];
    for (const [c, lab] of [[card.main, card.twin ? '앞' : ''], [card.twin, '뒤']]) {
      if (!c) continue;
      const partners = dupSealPartners(c, modeDupSeals);
      if (partners.length) out.push({ cn: c.cn, lab, seal: String(c.sl || c.eseal || '').trim(), partners });
    }
    return out;
  }, [card, modeDupSeals]);

  // V7.99-6 (메모3): 트윈 카드 무게 점검 — 합계 55톤 초과 = 싱글 권유, 무게차 부두한계 초과 = 수평 주의.
  //   nlSearch의 검증된 상수 재사용. 부두는 voyage.info.pier(미상이면 보수적 14톤).
  //   ★ 4.08-02: 무게는 갱이 드는 총중량(nlSearch.twinWtOf — EDI 총중량 먼저) · 경보뿐이다(완료를 막지 않는다 — 검수사 2026-10-07).
  const twinWtWarn = useMemo(() => {
    if (!card?.twin) return null;
    const wa = twinWtOf(card.main), wb = twinWtOf(card.twin);
    if (!wa || !wb) return { noWt: true };
    const total = wa + wb, diff = Math.abs(wa - wb);
    const limit = twinDiffLimit(voyage?.info?.pier);
    if (total > TWIN_MAX_TOTAL_KG) return { over: true, total, diff };
    if (diff > limit) return { imbal: true, total, diff, limit };
    if (total > TWIN_CAUTION_TOTAL_KG) return { heavy: true, total, diff };   // 50~55톤 — 한계 근처 주의
    return null;
  }, [card, voyage]);

  //  ★ 4.26 — 작업 카드 표시칩 재료. 이 패널의 목록(SearchPanel.allContainers)은 항차 화면 목록과 따로 병합돼 긴급·수화물·제작컨 표식이 없다 —
  //    판정을 새로 만들지 않고 목록 입구 함수 한 벌로 카드 컨에만 찍는다(긴급 = tagForecastMarks · 수화물·제작컨 = applySpecialMarks — 항차 화면 리스트·컨 상세와 같은 값).
  const _urgSet = useMemo(
    () => new Set(Array.isArray(voyage?.info?.forecast?.urgentCns) ? voyage.info.forecast.urgentCns : []), [voyage?.info?.forecast]);
  const markOf = (c) => {
    if (!c) return c;
    const a = (applySpecialMarks(voyage, [c]) || [])[0] || c;
    return (tagForecastMarks([a], _urgSet, null, null, null) || [])[0] || a;
  };

  const groupDone = useMemo(() => {
    if (selectedGroup == null) return 0;
    return allContainers.filter(c => c._mode === mode && c._ptk && c._comp && groupCenterOf(c.bay) === selectedGroup).length;
  }, [allContainers, mode, selectedGroup, bayPairs]);
  const groupTotal = groupDone + (selectedGroup == null ? 0 : remaining.filter(c => groupCenterOf(c.bay) === selectedGroup).length);
  //  ★ 4.25-02 (모의 작업 MCAP 2호기 «B22 31/63 선적 완료!» · OBWH 1호기 데크만 끝났는데 «이 베이 그룹 양하 완료!»): 큐가 비어도 그 묶음에 남은 컨이 있으면 «완료» 라 하지 않는다.
  //    남은 것 = 위 groupTotal 과 같은 remaining 한 벌(머리 «B○ 그룹 — n/N대» 와 같은 수). 왜 큐에 없는지(보류 · 다른 단)만 나눠 말한다.
  const groupLeft = useMemo(() => {
    if (selectedGroup == null) return { n: 0, held: 0, other: 0 };
    const rest = remaining.filter(c => groupCenterOf(c.bay) === selectedGroup);
    const held = rest.filter(c => heldSet.has(String(c.cn || '').toUpperCase())).length;
    const other = rest.length - held;
    return { n: rest.length, held, other };
  }, [remaining, selectedGroup, heldSet, bayPairs]);

  // V7.99-8 (메모6): 현재 작업 위치(호기·베이·홀드/데크·잔여 컨번호 리스트)를 inspector 활동에 기록 →
  //   수석이 베이상세에서 "N호기 · 20번 홀드 · 남은 N개"를 보고 그 화면을 연다.
  //   작업 단 = 검수사가 명시적으로 누른 selectedTier(자동판단 아님 — 수석에게 의도를 전달하려면 검수사가 눌러야 함).
  const tierRemainConts = useMemo(() => {
    if (selectedGroup == null || !selectedTier) return [];
    return remaining.filter(c => groupCenterOf(c.bay) === selectedGroup &&
      (selectedTier === 'deck' ? parseInt(c.tier, 10) >= 80 : parseInt(c.tier, 10) < 80));
  }, [remaining, selectedGroup, selectedTier, bayPairs]);
  const tierRemainList = useMemo(() => tierRemainConts.map(c => c.cn), [tierRemainConts]);
  const bayLabelOf = (center) => {
    const bays = groupBaysOf(center);
    if (bays.length === 0) return center != null ? String(center).padStart(2, '0') : '';
    if (bays.length === 1) return bays[0];
    return `${bays[0]}-${bays[bays.length - 1]}`;  // 예: 19-21
  };
  useEffect(() => {
    if (!inspector) return;
    if (selectedGroup == null || !selectedTier || suppressBayActivity) {
      // 베이/단 미선택 = 위치 정보 클리어(항차·모드는 유지) · 3.48 따라가기도 클리어(터미널 추론을 사람 자리로 되먹이지 않는다)
      fbSetInspectorActivity(inspector, voyageKey, mode).catch(e => console.warn('[V9.57] 활동 위치 클리어 실패', e));  // V9.57(I8): 무음 catch → 로그
      return;
    }
    fbSetInspectorActivity(inspector, voyageKey, mode, {
      equip, bayLabel: bayLabelOf(selectedGroup), tier: selectedTier, remain: tierRemainList.length, auto: true,
    }).catch(e => console.warn('[V9.57] 활동 위치 보고 실패', e));  // V9.57(I8): 무음 catch → 로그
  }, [inspector, voyageKey, mode, equip, selectedGroup, selectedTier, tierRemainList.length, suppressBayActivity]);

  // 카드/선택지 음성 안내는 프롬프트 조건(deckDonePromptD 등) 정의 이후로 이동 — 아래 참조.
  const lastSpokenRef = useRef('');

  // V8.09-06 (사용자 보고 2026-06-18): XRAY 대상은 XRAY 실번호(seal) 입력 전까지 양하확인 차단.
  //   기존엔 검증 없이 바로 완료돼, 실 체결 후 실번호 미입력인데도 양하확인됨.
  //   기준: 양하(discharge)에서 c._xray=true인데 c._xraySeal.seal이 비면 차단(공백도 미입력 취급).
  //   미입력 카드를 alert로 알리고 완료 중단. (선적/비XRAY는 영향 없음.)
  const xraySealMissing = (c) => mode === 'discharge' && c?._xray &&
    !String(c?._xraySeal?.seal || '').trim();
  const blockIfXrayMissing = () => {
    const miss = [];
    if (card?.main && xraySealMissing(card.main)) miss.push(card.main);
    if (card?.twin && xraySealMissing(card.twin)) miss.push(card.twin);
    if (miss.length) {
      needXray(miss[0].cn, miss.map((x) => x.l4 || x.cn?.slice(-4)).join(', '));   // 4.25-02: 경고만이 아니라 첫 컨의 입력칸을 연다
      return true;
    }
    return false;
  };

  //  ★ 4.23-01 2차 — 카드 컨 중 규격·풀엠티·항구가 다른 맞교환(3.13 _assign_warn) 컨. 있으면 큰 확인 단추가 그 자리를 확인하지 않고 위치 지정을 연다.
  const [posFor, setPosFor] = useState(null);
  const warnOf = (cd) => (mode === 'loading' && cd ? [cd.main, cd.twin].filter(Boolean).find((x) => loadingSlotOf(x).kind === 'swapWarn') || null : null);
  // 확인 (트윈은 둘 다 한 번에)
  const handleConfirm = async () => {
    if (!card || busy) return;
    if (!canWorkNow()) { alert(workGateText('완료')); return; }   // 3.51: 조회만은 보기만
    if (blockIfXrayMissing()) return;   // V8.09-06: XRAY 실번호 미입력 차단
    //  ★ 4.23-01 2차: 규격·풀엠티·항구가 다른 맞교환이면 앱이 자리를 정하지 않는다 — 확인 대신 위치 지정을 연다(배정 후 바로 선적확인 켬).
    const _w = warnOf(card);
    if (_w) { setPosFor(_w); return; }
    setBusy(true);
    try {
      // V8.71: 트윈 완료 2건을 멀티패스 한 번에 — 한 대만 먼저 선적되는 틈 제거.
      // TallyOne 1.55: **완료에 갱(호기)을 남긴다.** 검수사 원문 —
      //   *"장비를 바꿔서 해야 하는데 4호기로 다함. 이걸로 제출하면 2호기에서 작업한 인원은 그날 인건비를 받지 못함."*
      //   이 화면이 갱을 아는 유일한 곳이다(헤더와 localStorage 한 벌 공유). 안 넘기면 기록에 갱이 없다.
      if (card.twin) await fbCompleteContainersAtomic(voyageKey, mode, [card.main.cn, card.twin.cn], inspector, equip);
      else await fbCompleteContainer(voyageKey, mode, card.main.cn, inspector, 'normal', '', equip);
      noteWorked(card.main);   // 1.57: 예측대로 친 것도 흐름 감지에 넣는다(감지 기준은 '실제로 무엇을 쳤나'다)
      setResumeCns([]); setSingleMode(false);   // 2.75: 한 장 넘겼으니 맨 앞 고정도 푼다
      setConsecFix(0);
      setFixOpen(false); setFixQuery('');
    } finally { setBusy(false); }
  };

  //  ★ 2.75 — **한 대만 내린다(싱글).** 검수사 실측: *«무게 때문에 싱글로 작업하니 자동가이드 사용불가»*.
  //    어느 쪽을 먼저 내릴지는 **캐빈이 정한다** — 검수사 확정 *«캐빈결정. 보통은 갱을 피해서 먼쪽부터»*.
  //    앱은 순서를 정하지 않고 두 대를 나란히 놓고 고르게 한다. 고른 한 대만 완료되고 나머지는 다음 카드로.
  const handleConfirmOne = async (which) => {
    if (!card?.twin || busy) return;
    if (!canWorkNow()) { alert(workGateText('완료')); return; }   // 3.51: 조회만은 보기만
    if (blockIfXrayMissing()) return;
    const one = which === 'twin' ? card.twin : card.main;
    const mate = which === 'twin' ? card.main : card.twin;   // 4.08-02: 남은 짝
    if (mode === 'loading' && loadingSlotOf(one).kind === 'swapWarn') { setPosFor(one); return; }   // 4.23-01 2차: 규격 다른 맞교환은 위치 지정으로
    setBusy(true);
    try {
      await fbCompleteContainer(voyageKey, mode, one.cn, inspector, 'normal', '', equip);
      noteWorked(one, true);
      //  ★ 4.08-02 (검수사 2026-10-07 «하나 처리하면 하나가 사라져 베이에서 직접처리해야 하는 경우»): 짝이 남으면 짝 없는 홀드 20피트(싱글)가 되어 큐 맨 끝으로 밀렸다
      //    (STSE 2677E 실데이터 — 베이 11~13 홀드 6/10장 · 19~21 6/16장). 한 대만 내렸으면 남은 짝을 **바로 다음 카드**로 올린다(홀드·데크 모두).
      //    순서를 정하는 것이 아니라 «짝이 끝나기 전에 다른 카드로 넘어가지 않게» 앞에 두는 것뿐이다 — 다른 컨을 먼저 하려면 [수정]으로 가면 된다.
      setConsecFix(0); setFixOpen(false); setFixQuery(''); setSingleMode(false); setResumeCns(mate && mate.cn ? [mate.cn] : []);
    } finally { setBusy(false); }
  };

  //  ⏸ 양하 불가 — 트윈이면 두 대가 한 몸으로 보류된다(짝만 남으면 큐가 짝 없는 20ft 로 잘못 낸다).
  const doHold = async (reason) => {
    if (!card || busy || !reason) return;
    const cns = [card.main.cn].concat(card.twin ? [card.twin.cn] : []);
    setBusy(true);
    try {
      await fbHoldContainers(voyageKey, mode, cns, reason, inspector, equip, doneN);
      setHoldOpen(false); setHoldNote(''); setSingleMode(false); setResumeCns([]);
      try { speak(`${reason}. 보류했습니다. 다음 컨테이너로 갑니다.`, { conversational: true }); } catch { /* 소리 꺼짐 */ }
    } finally { setBusy(false); }
  };

  //  ▶ 해제 — 검수사가 [해제]를 눌렀거나 되묻기에 «예»라고 답했을 때. 그 컨이 **바로 앞 순서로** 온다.
  const doRelease = async (h, front = true) => {
    if (!h || busy) return;
    const cns = holdGroupOf(h);
    setBusy(true);
    try {
      await fbReleaseHold(voyageKey, mode, cns);
      if (front) setResumeCns(cns.map((x) => String(x).toUpperCase()));   // 4.26-02: 다른 장 보류를 풀면 내 카드 «맨 앞» 을 건드리지 않는다(그 컨은 내 큐에 없다)
      setHoldList(false);
    } finally { setBusy(false); }
  };
  //  4.26-02: 다른 장(남의 호기)의 보류 — 누가 건 것인지 보이고 한 번 묻는다. 큰 단추는 [그대로].
  const releaseOther = async (h) => {
    if (!h || busy) return;
    const who = [h.equip, h.by].filter(Boolean).join(' ');
    const pick = await askPick({   // ✕ 는 아무것도 안 함(null) — ask 는 ✕ 를 둘째 단추(해제)로 받는다
      title: '다른 장의 보류입니다',
      message: `${h.cn}${h._pos ? ` (${h._pos})` : ''}\n보류 사유 «${h.reason}»${who ? ` · 건 사람 ${who}` : ''}\n풀면 그 컨이 그 장 작업 순서에 다시 들어갑니다.`,   // 감사 하-2: 이름 뒤 조사(가/이)를 쓰지 않는 꼴
      confirmLabel: '그대로 둔다', cancelLabel: '해제',
    });
    if (pick === 'cancel') doRelease(h, false);
  };

  //  «아직» — 지금 완료 대수를 기준점으로 다시 잡는다(3대 더 지나야 또 묻는다).
  const doSnooze = async (h) => {
    if (!h || busy) return;
    setBusy(true);
    try { await fbSnoozeHold(voyageKey, mode, holdGroupOf(h), doneN); } finally { setBusy(false); }
  };

  // 수정: 실제 나온 컨을 입력 → 그 컨을 완료 처리, 예측 컨은 큐에 남음
  // V8.70: 크로스베이 체인시프트 감안 — 그룹·단 제한을 "필터"에서 "정렬 우선순위"로 완화.
  //   (구 V7.99-8: 현재 단으로만 좁힘 → 다른 베이 계획 컨이 실제로 오면 후보 0건, 현장 진행 불가.)
  //   자기 카드의 반대편 컨도 후보 허용(앞뒤 얽힘: 뒤 예측 컨이 앞 자리에 오는 경우) — 그 칸 자신의 컨만 제외.
  //  ★ 2.80-02 (검수사 확정 2026-08-28) — **다른 베이 화물이면 몇 번 베이·몇 호기 것인지 말한다.**
  //    검수사 원문: *«34번 데크를 선적중인데 18번 데크에 갈 컨테이너 번호가 앱에 입력되면
  //      18번 베이 화물이고 몇번갱이 실어야 될 화물입니다 라고 알려줘야 합니다. PDA는 그렇게 알려줍니다.
  //      우리앱은 갱은 모르지만 베이는 압니다 … 내가 4호기일 때는 3호기로 가게 하라고 안내를 해야 합니다.»*
  //    ⇒ 베이는 컨이 갖고 있고, 갱은 2.62 갱 배분(buildGangShift)이 이미 계산해 둔다. 둘을 잇기만 하면 된다.
  //      갱 배분이 없는 배(사전 미비·갱 수 미정)면 베이만 말한다 — 모르면 «모른다», 지어내지 않는다.
  const gangByBay = useMemo(() => {
    try {
      const gs = buildGangShift(voyage, getShipBayDictData(shipImo, shipName)?.bayDef || null);
      if (!gs || gs.askGangs || !Array.isArray(gs.strip)) return null;
      const m = {};
      for (const g of gs.strip) {
        const found = (gs.gangs || []).find((x) => x.no === g.gang);
        for (const b of (g.members || [])) m[parseInt(b, 10)] = found ? gangName(found) : '';
      }
      return Object.keys(m).length ? m : null;
    } catch (e) { return null; }
  }, [voyage, shipImo, shipName]);

  //  이 컨이 지금 작업 중인 베이 그룹 밖이면 «어디 화물인지» 한 줄로 만든다.
  const otherBayNote = (c) => {
    if (!c || !c.bay) return '';
    const bn = parseInt(c.bay, 10);
    if (!Number.isFinite(bn)) return '';
    if (selectedGroup != null && groupCenterOf(c.bay) === selectedGroup) {
      //  같은 베이 그룹인데 단(홀드/데크)이 다르면 그것만 짚는다.
      const isDeck = parseInt(c.tier, 10) >= 80;
      if (selectedTier === 'deck' && !isDeck) return `${bn}번 홀드 화물입니다`;
      if (selectedTier === 'hold' && isDeck) return `${bn}번 데크 화물입니다`;
      return '';
    }
    const tierTxt = parseInt(c.tier, 10) >= 80 ? '데크' : '홀드';
    const g = gangByBay ? gangByBay[bn] : null;
    if (g && equip && g !== equip) return `${bn}번 ${tierTxt} 화물입니다 — ${g}로 보내십시오`;
    if (g) return `${bn}번 ${tierTxt} 화물입니다 (${g} 구간)`;
    return `${bn}번 ${tierTxt} 화물입니다`;
  };

  const inWorkTier = (c) => {
    if (selectedGroup != null && groupCenterOf(c.bay) !== selectedGroup) return false;
    if (selectedTier === 'deck') return parseInt(c.tier, 10) >= 80;
    if (selectedTier === 'hold') return parseInt(c.tier, 10) < 80;
    return true;
  };
  const matchFor = (q0, excludeCns) => {
    const q = q0.replace(/\s/g, '').toUpperCase();
    if (q.length < 3) return [];
    const ex = new Set((Array.isArray(excludeCns) ? excludeCns : [excludeCns]).filter(Boolean));
    // V8.71: 완료로 기록된 컨도 후보에 포함 — 실물이 눈앞에 있으면 그 완료는 오선적 기록일 확률이 높다(사용자 확정).
    //   렌더에서 ⚠완료 배지 + 선택 시 확인. 정렬은 미완료 우선.
    const hits = modeAll.filter(c => !ex.has(c.cn) &&
      (c.cn.includes(q) || (c.l4 || c.cn.slice(-4)).includes(q)));
    // 정렬: 현재 카드 자리 > 현재 그룹·단 > 그 외(렌더에서 ⚠ 다른 베이 표시). 완료분은 항상 뒤.
    const pos = card?.main?.pos || (card?.main ? `${card.main.bay}-${card.main.row}-${card.main.tier}` : '');
    const rankOf = (c) => (c._comp ? 10 : 0) + (`${parseInt(c.bay,10)}-${c.row}-${c.tier}` === pos ? 0 : (inWorkTier(c) ? 1 : 2));
    return hits.sort((a, b) => rankOf(a) - rankOf(b)).slice(0, 6);
  };
  // V8.71: 완료 컨을 실제 온 컨으로 지정할 때 확인 — 오선적 기록 안내.
  //   1.53: confirm() → 앱 안 모달. 부르는 쪽이 `await` 하도록 async 로 바뀌었다.
  const confirmIfDone = async (c) => !c?._comp || await ask({
    title: '이미 완료로 기록된 컨',
    danger: true,
    message: `${c.cn?.slice(-4)}는 이미 선적확인으로 기록된 컨입니다.\n실물이 지금 눈앞에 있다면 앞선 기록이 오선적일 수 있습니다.\n이 자리로 옮기고 진행할까요? (완료 기록은 유지)`,
    confirmLabel: '진행', cancelLabel: '취소',
  });
  const fixMatches = useMemo(() => matchFor(fixQuery, [fixPickBack?.cn, card?.main?.cn]), [fixQuery, remaining, card, fixPickBack]);
  const fixMatches2 = useMemo(() => matchFor(fixQuery2, [fixPickFront?.cn, card?.twin?.cn]), [fixQuery2, remaining, card, fixPickFront]);

  // V7.94-08: 미배정(위치 빠진) 컨 — 수정으로 밀려난 컨테이너 추적 표시 (사용자 메모 ④)
  /*  ★ 2.98-08 — **큐에서 걸러낸 컨을 여기서 받는다** (검수사 확정 2026-08-31, STSE 2666W 실적용 시뮬).
        `remaining`(233행)은 «완료 실물이 찬 칸의 계획 컨»을 큐에서 뺀다 — **그 판정은 옳다.**
        검수사 확정 — *«모든 선적 자리는 비어 있다. 계획은 보여 주는 것이고 확정은 실물이 실려야 확정이다.
        다만 풀과 특수화물은 예외다.»*
        문제는 뺀 **다음**이었다. 아무 데도 안 내놓아 베이 목록이 비고 「남은 선적 작업이 없습니다」로 끝났다.
        실측(STSE 2666W, 456대) — 자동 가이드는 「없습니다」인데 실제 미완 **8대**. 검수원은 그대로 마감한다.
        수동(SearchPanel:305)은 **같은 판정을 하고도 버리지 않는다** — noBay 그룹으로 옮겨 재배정시킨다.
        자동만 버렸다. ⇒ 좌표 없는 컨과 «계획 자리를 내준 컨»을 **한 그물**로 받는다.
      ⚠ 이름표만 걸린 칸은 여기 안 온다(`o.done` 이 참일 때만). 아직 실리지 않은 계획 컨은 큐에 그대로 남는다. */
  const unassigned = useMemo(
    () => allContainers.filter(c => {
      //  2.98-11: 잣대를 큐(`remaining`)와 같은 `_isWork` 로 맞춘다 — 종전 `c._ptk` 는 시프팅(`_shift`)을 놓쳤다.
      //    큐는 `_ptk || _shift` 로 받는데 이 그물만 `_ptk` 라, 시프팅 컨의 칸이 완료 실물로 차면
      //    큐에서도 빠지고 여기서도 안 잡혀 **2.98-08 이 고친 것과 똑같은 구멍**이 한 부류 옆에 남아 있었다.
      //    (현 21항차는 시프팅 0대라 노출은 없었다. 시프팅 있는 배가 오면 그대로 재발한다.)
      if (!(c._mode === mode && _isWork(c) && !c._comp)) return false;
      if (!c.bay || !c.row || !c.tier) return true;            // 종전: 적부 좌표가 없다
      const o = _occDone.get(posKey(c));
      return !!(o && o.done && o.cn !== c.cn);                 // 2.98-08: 완료 실물이 그 칸을 차지했다
    }),
    [allContainers, mode, _occDone]
  );
  //  2.98-08: 두 부류를 갈라 문구를 정확히 낸다 — 「좌표 없음」과 「자리 내줌」은 검수원이 할 일이 다르다.
  const unassignedTaken = useMemo(
    () => unassigned.filter(c => c.bay && c.row && c.tier).length,
    [unassigned]
  );
  const [showUnassigned, setShowUnassigned] = useState(false);

  // V7.94-16: 그룹(베이) 변경 시 프롬프트 플래그 리셋
  // 1.57: 베이 그룹·단이 바뀌면 최근 처리분(recentRef)도 비운다 — 앞 베이의 흐름을 끌고 오지 않게.
  //  2.90: 물려받은 선택(workCtx)으로 마운트될 때는 지우지 않는다 — 마운트 직후 이 effect 가 한 번 돌아
  //    수동에서 고른 단(selectedTier)을 지우던 것이 «전환하면 재지정» 의 한 축이었다. 진짜 그룹 변경만 지운다.
  const _prevGroupRef = useRef(selectedGroup);
  //  3.48 베이뷰 — 덮개가 프리셋(workCtx.presetSeq)으로 베이·단을 **같이** 넣은 그룹 변경은 단을 지우지 않는다.
  //    감사 실측 — 따라가기 중 크레인이 (16)17 로 옮겨 가자 이 효과가 방금 넣은 단을 지워 위 칸이 «작업할 단을 선택하세요» 로 되돌아갔다(띠는 데크인데).
  const _prevPresetRef = useRef(workCtx ? (workCtx.presetSeq || 0) : 0);
  useEffect(() => {
    if (_prevGroupRef.current === selectedGroup) return;
    _prevGroupRef.current = selectedGroup;
    const byPreset = !!workCtx && (workCtx.presetSeq || 0) !== _prevPresetRef.current;
    _prevPresetRef.current = workCtx ? (workCtx.presetSeq || 0) : 0;
    setDeckPromptDone(false); setHatchOpenDone(false); setHatchCloseDone(false); if (!byPreset) setSelectedTier(null); setStreamPref(null); setBayFirst(null); singleBaysRef.current = []; recentRef.current = [];
  }, [selectedGroup]);
  useEffect(() => { _prevPresetRef.current = workCtx ? (workCtx.presetSeq || 0) : 0; }, [workCtx ? workCtx.presetSeq : 0]);   // 3.48: 단만 바뀐 프리셋도 기준을 맞춰 둔다(다음 «진짜» 그룹 변경이 프리셋으로 오해되지 않게)
  useEffect(() => { setStreamPref(null); recentRef.current = []; }, [selectedTier]);
  //  4.26 (감사 하): «다음 예정» 줄로 올린 카드는 그 장·단에서만 — 장·단·모드를 바꾸면 내린다(돌아왔을 때 예전에 올린 카드가 다시 맨 앞에 서지 않게). 해제·한 대씩이 정한 맨 앞(다른 배열)은 그대로 둔다.
  useEffect(() => { if (!pulled) return; setResumeCns((r) => (r === pulled ? [] : r)); setPulled(null); }, [selectedGroup, selectedTier, mode]);   // eslint-disable-line react-hooks/exhaustive-deps
  //  4.26 — 장·단을 고르면(탭을 옮겨 돌아온 때 포함) 카드 머리를 화면 위로(설계 §0 «스크롤 없이 확인까지» — 항차 화면 위쪽 칸들 때문에 확인 단추가 화면 아래 1,300px 쯤이었다).
  //    카드 머리가 이미 화면 위쪽(45% 안)에 있으면 움직이지 않는다. 카드가 바뀔 때마다가 아니라 장·단·모드가 바뀔 때만. 베이뷰 위 칸(compact)은 안 한다.
  const _hasCard = !!(selectedGroup != null && selectedTier);
  useEffect(() => {
    if (compact || !_hasCard) return;
    const el = gwHeadRef.current;
    if (!el || typeof el.getBoundingClientRect !== 'function' || typeof window === 'undefined') return;
    const r = el.getBoundingClientRect();
    if (r.top > (window.innerHeight || 0) * 0.45 && typeof el.scrollIntoView === 'function') { try { el.scrollIntoView({ block: 'start' }); } catch (e) { /* 옛 브라우저 */ } }
  }, [selectedGroup, selectedTier, mode, compact, _hasCard]);
  //  4.26 (2차 시뮬 하-4): 장 칩 줄은 가로 스크롤 — 지금 장 칩이 첫 화면에 보이게 그 칩 쪽으로 민다.
  useEffect(() => {
    const row = gwChipsRef.current;
    if (!row) return;
    const cur = row.querySelector('[data-gw-cur="1"]');
    if (cur && typeof cur.offsetLeft === 'number') row.scrollLeft = Math.max(0, cur.offsetLeft - 12);
  }, [selectedGroup, selectedTier, compact]);
  useEffect(() => { setBayFirst(null); singleBaysRef.current = []; }, [selectedTier, mode]);   // 3.77: 단·모드가 바뀌면 «베이 먼저» 도 푼다   // V8.50: 단 변경 시 스트림 리셋

  // V7.94-16: 그룹의 실제 베이 번호들 (해치 보고 표기용)
  // V7.99-6 (메모5): holdOnly=true면 홀드(t<80)에 평택 작업분이 있는 베이만.
  //   해치커버는 홀드 접근을 위한 물리 작업이므로, 데크만 평택분이고 홀드가 전부
  //   통과화물인 베이는 평택에서 열지 않는다(포트 무시하고 전부 오픈하던 버그).
  const groupBaysOf = (center, holdOnly = false) => {
    const set = new Set();
    allContainers.forEach(c => {
      if (c._mode === mode && c._ptk && groupCenterOf(c.bay) === center) {
        if (holdOnly && parseInt(c.tier, 10) >= 80) return;  // 데크분 제외
        const b = parseInt(c.bay, 10);
        if (Number.isFinite(b)) set.add(String(b).padStart(2, '0'));
      }
    });
    return [...set].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  };

  // V7.94-16: 해치커버 보고 발송 (가이드 흐름 통합 — WorkReportModal 해치 보고와 동일 형식)
  // V7.94-22: 그룹 베이들의 해치커버 장수 (매트릭스 hatchCount). 사전 없으면 0 → 메시지에서 베이 개수 폴백.
  // V7.99-6 (메모1): 같은 해치 묶음(트리오: 11·12·13 같은 페어 그룹)은 한 패널을 공유하므로
  //   베이별 hatchCount를 단순 합산하면 중복(2+2+2=6)된다. 같은 groupCenter끼리는 대표값(최댓값)을,
  //   서로 다른 그룹끼리만 합산한다.
  /* ★ 2.88-01 (검수사 지시 2026-08-30) — **사전 장수가 아니라 «지금 열 수 있는 장수»다.**
       검수사 — *«커버의 개념은 단 한개라도 해당 데크위에 화물이 있으면 열지 못한다.
       단 해치커버별 로우범위를 인지해야 하고 그 범위 밖에 화물이 있다면 열고 닫을수 있다»*
       *«그런데 앱 자동은 3장을 엽니다 무조건 3장»* · *«그걸 오늘 다 무시했습니다»*
     실측 MCSC 633N — 38번은 3장 중 **1장**(양옆은 통과화물 80대가 얹혀 있다), 34번은 **2장**.
     ⚠ 판정은 utils.hatchOpenableFor 한 벌이다 — 커버 로우 범위를 아는 _panelOf 를 그대로 쓴다.
       구하지 못하면(사전 없음·자료 없음) 종전대로 사전 합산으로 돌아간다. */
  //  3.49: 장수 셈은 utils.hatchPanelCountOf 한 벌(자동 판정 기록·알림 배너도 같은 수를 쓴다). 본문은 그대로 옮겼다.
  //  4.10: 보고 직전 확인 창을 넣으면서 이 줄의 `hatchPanelsOf` 는 sendHatchReport 안의 `hatchPanelDetailOf`(같은 계산, 장별 내용까지) 로 바뀌었다.

  // TallyOne 1.8-18: **끝난 모드에서는 유도 해치 보고를 걸지 않는다.**
  //
  // 왜 (STMJ 2643E 2026-08-05 실사건)
  //   양하는 02:16 에 끝났는데, 08:19:08~08:21:07 사이 다른 검수사가 로그인한 2분 동안
  //   08:19:54 `open 05,06,07` · 08:20:25 `open 01,03` 두 건이 찍혔다. 그 커버들은 이미
  //   02:28·03:17 에 닫힌 것이라 타임시트가 "닫고 다시 연 채로 출항"으로 나왔다 — 불가능한 서류다.
  //
  // 왜 걸렸나 — 프롬프트가 **남은 컨테이너 수**만 본다. 그런데 검수원이 앱으로 일일이 체크하지 않아
  //   `remaining` 이 늘 남아 있다(검수사 확정: "검수원이 이 앱을 사용 안 한다는 이야기입니다").
  //   그래서 작업이 끝난 뒤에 들어와도 앱은 "아직 홀드가 남았다"고 믿고 오픈을 권했다.
  //
  // 그래서 판단 근거를 하나 더 둔다 — **완료 보고**. 이건 사람이 명시적으로 누른 것이라 믿을 수 있다.
  const modeFinished = useMemo(() => {
    const inf = voyage?.info || {};
    if (inf.inspectorDone) return true;
    if (mode === 'discharge' && inf.dischargeDone) return true;
    if (mode === 'loading' && inf.loadingDone) return true;
    for (const r of Object.values(voyage?.reports || {})) {
      if (r && r.type === 'work_status' && String(r.action) === `${mode}_done`) return true;
    }
    return false;
  }, [voyage, mode]);

  // TallyOne 1.8-19: **데크에 화물이 얹혀 있으면 그 커버는 열리지 않는다.**
  //
  // 검수사 2026-08-05: "화물이 있는 상태에서 커버를 연다고 열리면 안되니까요"
  //   물리 사실이다. 커버 위에 컨테이너가 한 대라도 있으면 크레인이 패널을 못 든다.
  //
  // ⚠ 종전엔 `deckRemain` 을 **평택분(_ptk)만** 셌다. 그래서 **통과화물**이 데크에 얹혀 있으면
  //   실제로는 못 여는데 앱은 "데크 비었다"고 보고 오픈을 권했다. 통과화물은 평택에서 손대지
  //   않으니 영영 안 빠진다 — 그 커버는 이 항차 내내 못 연다.
  //   (평택분 필터를 안 걸어 오집계하던 9.2-② 패턴의 **거울상**이다. 카운트엔 평택분만,
  //    물리 판단엔 배에 실제로 있는 것 전부.)
  //
  // 지금 데크에 있는 것 —
  //   양하: 아직 안 내린 것(평택분 미완료) + 통과화물 전부
  //   선적: 이미 실은 것(평택분 완료)     + 통과화물 전부
  const deckBlockers = (center) => {
    if (center == null) return [];
    return allContainers.filter((c) => {
      if (groupCenterOf(c.bay) !== center) return false;
      if (parseInt(c.tier, 10) < 80) return false;          // 홀드는 커버 아래다
      if (!c._ptk) return true;                             // 통과화물 — 늘 배 위에 있다
      if (c._mode !== mode) return false;
      return mode === 'discharge' ? !c._comp : !!c._comp;
    });
  };

  //  4.10: **반환값** — true = 보고를 냈다 · false = 취소·실패(아무것도 저장하지 않는다) · 'skip' = 열 홀드가 없어 보고할 것이 없다(종전처럼 «처리됨» 표시는 한다).
  //    종전엔 값이 없어서 «그래도 보고/취소» 에서 취소를 눌러도 부르는 쪽이 «열렸다» 표시를 저장했다(보고는 없는데 hatchDone 만 남음).
  const sendHatchReport = async (action) => {
    if (hatchBusy) return false;
    setHatchBusy(true);
    try {
      const bays = groupBaysOf(selectedGroup, true);  // V7.99-6: 홀드 평택분 베이만 (메모5)
      if (bays.length === 0) return 'skip';  // 열 홀드 없으면 보고 안 함 (finally에서 busy 해제)
      // 1.8-19: 데크에 화물이 얹혀 있으면 오픈은 물리적으로 불가능하다.
      //   자료가 틀렸을 수도 있으니 조용히 막지 않고, 무엇이 막고 있는지 보여 주고 묻는다.
      if (action === 'open') {
        const blk = deckBlockers(selectedGroup);
        if (blk.length) {
          const where = [...new Set(blk.map((c) => `${c.bay}/${c.row}/${c.tier}`))].slice(0, 6).join('  ');
          const thru = blk.filter((c) => !c._ptk).length;
          // 1.53: window.confirm → 앱 안 모달.
          const ok = await ask({
            title: '커버 위에 화물이 있습니다',
            danger: true,
            message: `이 베이 데크에 컨테이너 ${blk.length}대가 남아 있습니다`   // 4.26-02: 장(패널)을 가리지 않은 수라 «이 커버 위» 라 단정하지 않는다 — 장마다 위 화물은 다음 장수 확인 창
              + (thru ? ` (통과화물 ${thru}대 포함)` : '') + '.\n'
              + '여는 장 위에 화물이 얹혀 있으면 그 커버는 열 수 없습니다.\n\n' + where + '\n\n'
              + '자료가 틀렸다면 그래도 보고할 수 있습니다. 보고할까요?',
            confirmLabel: '그래도 보고', cancelLabel: '취소',
          });
          if (!ok) return false;
        }
      }
      // 1.8-18: 끝난 모드면 조용히 막지 않고 **사람에게 묻는다** — 진짜 뒤늦은 보고일 수도 있다.
      if (modeFinished) {
        // 1.53: window.confirm → 앱 안 모달.
        const ok = await ask({
          title: '이미 완료된 작업입니다',
          danger: true,
          message: `${mode === 'discharge' ? '양하' : '선적'}는 이미 완료 처리되었습니다.\n`
            + `그래도 해치커버 ${action === 'open' ? '오픈' : '클로즈'} 보고를 남길까요?\n\n`
            + '(실수로 눌렀다면 「취소」 — 마감 서류 타임시트에 그대로 실립니다)',
          confirmLabel: '그래도 보고', cancelLabel: '취소',
        });
        if (!ok) return false;
      }
      // 4.10 (검수사 2026-10-07 «보고 직전에 커버 장수를 맞는지 확인하고 보고 … 무심코 보고 했다가 6장 오픈을 보고 했으니까요»)
      //   보고 직전에 항상 베이·앱이 센 장수·장별 홀드 평택 대수를 보이고 고르게 한다. 취소하면 아무것도 저장·공유하지 않는다.
      const countDetail = hatchPanelDetailOf(voyage, mode, bays, getShipBayDictData(shipImo, shipName), groupCenterOf);
      const chosenCount = await askHatchCount({ action, bays, detail: countDetail, initial: countDetail.count });
      if (chosenCount == null) return false;
      const voy = mode === 'discharge'
        ? (voyage?.info?.voy_d || voyage?.info?.voy || '')
        : (voyage?.info?.voy_l || voyage?.info?.voy || '');
      const panelCount = chosenCount;   // 4.10: 검수사가 확인해 고른 장수(앱이 센 값이 기본)
      const message = buildHatchMessage({ vsl: shipName, voy, bays, action, time: Date.now(), equip, panelCount });
      // V9.57(I8): DB 기록 실패를 삼키고 카톡만 나가던 것 — 수석 대시보드엔 보고가 없는데
      //   카톡엔 있는 불일치가 생겼다. 재시도 1회 후에도 실패면 공유 진행 여부를 묻는다.
      let dbOk = false;
      try { await fbAddWorkReport(voyageKey, { type: 'hatch', action, mode, bays, equip, panelCount, message }); dbOk = true; }
      catch (e1) {
        if (e1 && e1.viewOnly) { alert(e1.message); return false; }   // 3.51: 조회만은 보기만 — 카톡도 내보내지 않는다
        console.warn('[V9.57] 해치 보고 DB 기록 실패 — 1회 재시도', e1);
        try { await fbAddWorkReport(voyageKey, { type: 'hatch', action, mode, bays, equip, panelCount, message }); dbOk = true; }
        catch (e2) { console.warn('[V9.57] 해치 보고 DB 기록 재시도 실패', e2); }
      }
      if (!dbOk) {
        // 1.53: window.confirm → 앱 안 모달.
        const goOn = await ask({
          title: '해치 보고 DB 기록 실패',
          danger: true,
          message: '해치 보고 DB 기록에 실패했습니다 (재시도 포함).\n수석 대시보드에는 이 보고가 남지 않습니다.\n\n카톡 공유만 진행할까요?',
          confirmLabel: '카톡만 진행', cancelLabel: '취소',
        });
        if (!goOn) return false;  // finally에서 busy 해제
      }
      await shareText(message, '해치커버');
      return true;
    } finally { setHatchBusy(false); }
  };

  // V7.94-16: 양하 — 베이 데크 완료 → [해치커버 오픈 → 홀드 진행] / [다른 데크 이동] (사용자 요구)
  const deckDonePromptD = useMemo(() => {
    if (hatchAuto) return false;        // 3.49: 따라가기 — 커버는 터미널 실적으로 자동 판정·기록(SearchPanel)
    if (isHatchSkipShip) return false;  // V8.10: TMPZ·TNJP·RZOR·OBWH 해치 계산/보고 안 함
    if (modeFinished) return false;   // 1.8-18: 끝난 모드엔 권하지 않는다
    if (mode !== 'discharge' || hatchOpenDone || isHatchDoneSaved(selectedGroup, 'open') || selectedGroup == null) return false;
    const groupRemain = remaining.filter(c => groupCenterOf(c.bay) === selectedGroup);
    const deckRemain = groupRemain.filter(c => parseInt(c.tier, 10) >= 80).length;
    // ⛔ 1.8-19 의 «화물이 얹힌 커버는 권하지 않는다» 게이트를 뗐다 (1.76-05).
    //   검수사 신고 2026-08-16 «MAMP 홀드 작업시 해치커버 오픈 알림없음». 실측 —
    //   34(33/35) 그룹 데크에 통과화물이 얹혀 있어 오픈 배너도 음성도 나오지 않았다.
    //   deckRemain === 0 이 이미 «평택 데크분은 다 내렸다»를 요구하므로, 이 게이트에 걸리는 것은
    //   사실상 **통과화물뿐**이다. 그런데 통과화물은 평택에서 안 내리므로 **영원히 안 없어진다**
    //   = 그 그룹은 영구 무음이었다. 커버 위 통과화물은 오히려 알려야 하는 것이다(= 시프팅).
    //   배너는 띄우고 문구를 갈라 «치우고 열라»고 말한다. 오판 방지 확인 모달은 sendHatchReport 에 그대로 있다.
    const holdRemain = groupRemain.filter(c => parseInt(c.tier, 10) < 80).length;
    // ⛔ deckDone > 0 도 뗐다 (1.76-05) — 그 그룹 **평택 데크분이 애초에 0**(데크가 전부 통과화물)이면
    //   «내린 것»이 없어 배너가 안 떴다. 그런데 홀드 버튼은 평택 잔여만 보고 바로 열려서,
    //   커버 안내를 한 번도 못 본 채 홀드로 들어갔다. 홀드에 평택 작업이 남았으면 커버는 열어야 한다.
    return deckRemain === 0 && holdRemain > 0;
  }, [mode, hatchOpenDone, selectedGroup, remaining, allContainers, bayPairs, voyage, modeFinished, hatchAuto]);

  // 1.76-05: 커버 위에서 **치워야 하는 것**만 고른다.
  //   ⚠ deckBlockers 는 베이 그룹 통째다. 커버는 그룹 하나가 아니라 `hatchCount` 장의 패널로 갈리므로
  //     (§5-1B) 그룹의 통과화물을 전부 «치워야 한다»고 말하면 **안 여는 패널 위의 것까지 지목**하게 된다.
  //     검수사 원문 2026-08-14 MAMP 26번 — *"지금 있는 곳은 중간 커버를 열지 않음."*
  //   → 패널 판정이 들어 있는 시프팅 예측(predictShiftingFromVoyage)과 교집합만 쓴다.
  //     예측을 못 내면(사전·항로 미상) 그룹 전체를 보수적으로 보여 주되 근사임을 문구에 밝힌다.
  const coverInfo = useMemo(() => {
    if (!deckDonePromptD) return { list: [], approx: false, doubt: false };
    const blockers = deckBlockers(selectedGroup);
    if (!blockers.length) return { list: [], approx: false, doubt: false };
    let pred = null, doubt = false;
    try {
      const vsl = String(voyage?.info?.vsl || '').toUpperCase();
      const de = (typeof window !== 'undefined' && window.__fbShipBayDict) ? window.__fbShipBayDict[vsl] : null;
      pred = predictShiftingFromVoyage(voyage, de || undefined);
      // ★ 2.08-15 (검수사 확정 2026-08-23): 배정목록 이적이 **확정 0** 이면 «치워야 열린다»가 아니라
      //   «커버 영역 확인»으로 낮춘다 — *"그래도 의심은 지우지 말고 커버영역 알림을 띄워주세요."*
      const tc = shiftingTruthCheck(voyage, Object.keys(pred || {}).length);
      if (tc && !tc.pending && tc.truth === 0) doubt = true;
    } catch (e) { pred = null; }
    const keys = pred ? Object.keys(pred) : [];
    if (!keys.length) return { list: blockers, approx: true, doubt };
    const set = new Set(keys);
    const hit = blockers.filter(c => set.has(c.cn));
    return hit.length ? { list: hit, approx: false, doubt } : { list: [], approx: false, doubt: false };
  }, [deckDonePromptD, selectedGroup, allContainers, bayPairs, mode, voyage]);

  // V7.94-16: 양하 — 그룹 홀드까지 완료 시 클로즈 제안 조건 (그룹 완료 화면에서 사용)
  // V8.09-05 (사용자 보고 2026-06-18): 같은 베이 그룹에 선적할 평택분이 남아 있으면 닫지 않는다.
  //   현장 순서 = 양하 끝 → (그 홀드에 실을 게 있으면) 선적 먼저 → 선적까지 끝나야 해치 클로즈.
  // V9.12 (사용자 확정 2026-07-27): "선적 여부 확인 후 선적이 없을 때만 질문. 모를 때·있을 때는 묻지 않는다."
  //   종전 구멍 — 선적 EDI가 아직 안 온 상태(=모름)가 loadRemain=0으로 읽혀 닫자고 물었다.
  //   판정은 shouldAskHatchClose()에 모아 두었다(순수 함수 — 시뮬 검증용).
  const holdWorkedD = useMemo(() => {
    if (isHatchSkipShip) return false;  // V8.10: 해치 클로즈 제안 안 함
    if (modeFinished) return false;   // 1.8-18
    if (mode !== 'discharge' || selectedGroup == null) return false;
    return shouldAskHatchClose(allContainers, selectedGroup, groupCenterOf);
  }, [mode, selectedGroup, allContainers, bayPairs, modeFinished]);

  // V7.94-08: 홀드 선적 완료 → 데크 진입 전 베이 선택 프롬프트 조건 (사용자 메모 ②)
  const holdDonePrompt = useMemo(() => {
    if (hatchAuto) return false;        // 3.49: 따라가기 — 자동 판정
    if (isHatchSkipShip) return false;  // V8.10: 해치 닫기 제안 안 함
    if (modeFinished) return false;   // 1.8-18
    if (mode !== 'loading' || deckPromptDone || selectedGroup == null) return false;
    const groupRemain = remaining.filter(c => groupCenterOf(c.bay) === selectedGroup);
    if (groupRemain.length === 0) return false;
    const holdRemain = groupRemain.filter(c => parseInt(c.tier, 10) < 80).length;
    const deckDone = allContainers.filter(c => c._mode === mode && c._ptk && c._comp &&
      groupCenterOf(c.bay) === selectedGroup && parseInt(c.tier, 10) >= 80).length;
    return holdRemain === 0 && deckDone === 0 && groupDone > 0;
  }, [mode, deckPromptDone, selectedGroup, remaining, allContainers, groupDone, bayPairs, modeFinished, hatchAuto]);

  // V8.09-15 (사용자 점검 2026-06-18): 해치커버/베이 선택 갈림길 음성 처리.
  //   ① 선택 배너가 떠 있는 동안에는 "다음 컨테이너" 음성을 막는다(어디로 갈지 미정인데 앞서 말하던 버그).
  //   ② 대신 선택지 자체를 음성으로 읽어준다(문구 1가). ③ 12초 무응답이면 1회 반복, 선택/배너 사라지면 즉시 멈춤.
  //   prompt 종류: 'deckD'(양하 데크완료→홀드) / 'holdL'(선적 홀드완료→데크) / 'holdCloseD'(양하 홀드완료→닫기).
  const choicePrompt = useMemo(() => {
    // 1.76-05: `&& card` 를 뗐다 — 데크를 다 내리는 **그 순간** 큐가 비어 card 가 null 이 되고
    //   음성 안내도 같이 사라졌다. 홀드가 남아 있으면 커버 안내는 나와야 한다.
    if (deckDonePromptD) return 'deckD';
    if (holdDonePrompt && card) return 'holdL';
    if (!hatchAuto && mode === 'discharge' && holdWorkedD && !hatchCloseDone && !isHatchDoneSaved(selectedGroup, 'close') && !card) return 'holdCloseD';   // 3.49: 따라가기면 자동 판정
    return null;
  }, [deckDonePromptD, holdDonePrompt, holdWorkedD, hatchCloseDone, selectedGroup, mode, card, hatchAuto]);

  const CHOICE_VOICE = {
    deckD: '데크 양하 완료. 해치커버를 열까요, 다른 데크로 갈까요.',
    holdL: '홀드 선적 완료. 해치커버를 닫을까요, 다른 베이 홀드로 갈까요.',
    holdCloseD: '홀드 작업 끝. 해치커버를 닫을까요.',
  };

  // 선택지 음성 — 배너가 떠 있는 동안 읽고, 12초마다 1회 반복(무응답 대비). 선택/사라짐 시 정지.
  const lastChoiceRef = useRef('');
  useEffect(() => {
    if (!choicePrompt || !voiceOn) { lastChoiceRef.current = ''; return; }
    if (lastChoiceRef.current !== choicePrompt) {
      lastChoiceRef.current = choicePrompt;
      speak(CHOICE_VOICE[choicePrompt]);
    }
    const t = setInterval(() => { speak(CHOICE_VOICE[choicePrompt]); }, 12000);
    return () => clearInterval(t);
  }, [choicePrompt, voiceOn]);

  // 다음 컨테이너 음성 — 단, 선택 배너가 떠 있으면 말하지 않는다(choicePrompt 가드).
  useEffect(() => {
    if (!card || !voiceOn || choicePrompt) return;
    const key = card.main.cn + (card.twin?.cn || '');
    if (lastSpokenRef.current === key) return;
    lastSpokenRef.current = key;
    const parts = [`다음, ${spellKo(card.main.l4 || card.main.cn.slice(-4))}`];
    if (card.twin) parts.push(`트윈 ${spellKo(card.twin.l4 || card.twin.cn.slice(-4))}`);
    if (card.main._xray || card.twin?._xray) parts.push('엑스레이');
    speak(parts.join(', '));
  }, [card, voiceOn, choicePrompt]);

  // TallyOne 1.54: **자리 배정 한 번 — 시퀀스 항차면 되묻고 다시 부른다.**
  //   `fbReassignContainerPosition` 이 `{ ok:false, needConfirm:'seqFull' }` 로 돌아서면 **DB에 아무것도 안 썼다.**
  //   그때 호출부가 안 물으면 시퀀스 항차에서 **아무 일도 안 일어난다**(조용한 실패) — 그러고도
  //   선적확인만 찍히면 그림과 기록이 갈린다. 그래서 자리부터 확실히 잡고 완료를 찍는다.
  //   ⛔ 네이티브 confirm() 은 쓰지 않는다 — 뜨는 순간 앱이 통째로 멈춘다(실측 30분 정지).
  //   돌려주는 값: 성공하면 결과 객체, 검수사가 취소했거나 실패하면 null.
  const reassignAsk = async (cn, b, r, t, opts, failMsg = '', cancelMsg = '') => {   // 4.26-03(감사 하-2): cancelMsg — 앞 컨은 이미 넣었는데 뒤 컨 물음에서 취소하면 말없이 끝나지 않게   // 4.26-02: failMsg — 앞 컨은 이미 선적확인된 두 번째 재배정(엇갈림 남은 컨)은 공용 «선적확인은 찍지 않았습니다» 가 틀린 말이다
    let res = await fbReassignContainerPosition(voyageKey, mode, cn, b, r, t, inspector, opts || undefined);
    if (res && res.ok === false && res.needConfirm === 'seqFull') {
      const ok = await ask({
        title: '시퀀스 자리입니다',
        message: seqFullConfirmText(res),
        confirmLabel: '그래도 넣는다', cancelLabel: '취소',
      });
      if (!ok) { if (cancelMsg) notify('뒤 컨은 넣지 않았습니다', cancelMsg); return null; }
      res = await fbReassignContainerPosition(voyageKey, mode, cn, b, r, t, inspector,
        { ...(opts || {}), seqConfirmed: true });
    }
    if (!res || res.ok === false) {
      //  4.26-02(감사 하-3): failMsg 알림(엇갈림 남은 컨 — 앞 컨은 이미 선적확인)은 닫을 때까지 기다린다 — 곧바로 이어지는 «순서가 3번 연속» 물음이 같은 창을 덮어 못 보았다.
      if (failMsg) { await new Promise((r) => askConfirm({ title: '자리를 넣지 못했습니다', message: failMsg, confirmLabel: '확인', cancelLabel: '닫기', onConfirm: r, onCancel: r, onClose: r })); return null; }
      notify('자리를 넣지 못했습니다', `${String(cn).slice(-4)} — 신호를 확인하고 다시 해 주세요.\n선적확인은 찍지 않았습니다.`);
      return null;
    }
    return res;
  };

  // 수정 1대 적용: 선적이면 실제 컨을 예측 슬롯 위치로 재배정(그 자리 예측 컨은 자동 미배정+완료취소 — 이중 수정 방지) 후 완료
  //   1.54: 자리 배정이 안 되면 **완료를 찍지 않는다.** 돌려주는 값이 false 면 부르는 쪽이 멈춘다.
  const applyFixOne = async (actual, slot, opts = null) => {   // 4.25-02 opts.swap === false — 맞바꿈 안 함(트윈 한 대만에서 풀·엠티가 섞인 칸)
    if (mode === 'loading') {
      //  ★ 2.80-01 (검수사 실사용 보고 2026-08-28 21:0x) — **밀려난 계획 컨은 창고가 아니라 «온 컨의 옛 자리»로 간다.**
      //    실측 사고: 28-07-82(계획 SKHU6475028)에 4172 를 넣자 5028 이 `planTaken` 으로 **창고**로 갔다.
      //    검수사 — *«5028은 화면에서 사라져야 합니다. 8847 자리로 가서 대기 하고 있어야 합니다.
      //      그런데도 아직도 화면에 남아 있어 그자리가 빈자리로 보이는것이고 그래서 4172를 눌렀더니
      //      엉뚱한곳에 들어 가 있습니다.»*
      //    ⇒ 자리 확인 모드에서 다른 컨을 넣는 것은 **두 컨의 자리 맞바꿈**이다(현장 뜻). `swapWith` 로 못 박는다.
      //      이것이 없으면 밀려난 컨이 계획 자리를 든 채 창고로 떠 큐·그림에 유령으로 남는다.
      //    ⚠ 맞바꿈은 «온 컨이 원래 자리를 갖고 있을 때»만 성립한다 — 미배정·창고에서 온 컨은 종전대로.
      //  4.26-03(감사 하-5): 풀과 엠티는 서로 바뀌지 않는다(검수사 2026-10-14 «다만 풀이 풀끼리만 바뀌는거지 엠티와 풀이 서로 바뀌지는 않습니다») —
      //    고른 컨과 이 칸 계획 컨의 풀·엠티가 둘 다 있고 다르면 맞바꾸지 않는다. 그때는 맞바꿈 없이 자리 게이트로 가서 «⚠ 풀과 엠티는 서로 바뀌지 않습니다» 를 묻는다.
      const _fe = (x) => String((x && x.fe) || '').trim().toUpperCase();
      const feMix = !!_fe(actual) && !!_fe(slot) && (_fe(actual) === 'E') !== (_fe(slot) === 'E');
      const canSwap = slotMode && !(opts && opts.swap === false) && !!actual.bay && !!actual.row && !!actual.tier
        && String(actual.bay_actual ?? '') !== '__STG__' && !feMix;
      const r = await reassignAsk(actual.cn, slot.bay, slot.row, slot.tier,
        canSwap ? { swapWith: slot.cn, actualWork: true } : (slotMode ? { actualWork: true } : undefined));   // 4.26-03(2차 시뮬 하-1): 자리 확인에서 풀·엠티가 달라 안 맞바꿔도 이동 사유는 «실제 실린 자리(actual)» 그대로
      if (!r) return false;
    }
    if (!canWorkNow()) { alert(workGateText('완료')); return false; }   // 3.51: 조회만은 보기만
    await fbCompleteContainer(voyageKey, mode, actual.cn, inspector, 'normal', '', equip);   // 1.55: 갱(호기)
    return true;
  };

  // V8.09-17 (메모6): 트윈 앞뒤 맞교환 — 선적 시 앞/뒤 위치가 바뀌어 들어가는 경우가 많아,
  //   버튼 한 번으로 두 컨의 자리만 맞바꾼다. 완료 처리는 안 함(위치만 교환).
  //   fbReassign이 swap을 지원: 앞 컨을 뒤 자리로 보내면 자리를 뺏긴 뒤 컨이 앞 자리로 자동 이동.
  const swapTwinPos = async () => {
    if (busy || !card?.main || !card?.twin) return;   // V8.25: 양하·선적 모두 허용
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    const a = card.main, b = card.twin;
    // 1.53: 여기 confirm() 이 실제로 두 번 앱을 얼렸다(실측 2026-08-12). 앱 안 모달로 묻는다.
    const ok = await ask({
      title: '앞뒤 맞교환',
      message: `앞뒤 위치를 맞바꿉니다.\n앞 ${a.cn.slice(-4)} ↔ 뒤 ${b.cn.slice(-4)}\n(자리만 교환, 완료 처리는 안 됨)`,
      confirmLabel: '맞바꾼다', cancelLabel: '취소',
    });
    if (!ok) return;
    setBusy(true);
    try {
      // 앞 컨을 뒤 자리로 → 자리를 뺏긴 뒤 컨이 앞 자리로 간다.
      //
      // TallyOne 1.53: **교환은 검수사의 뜻이므로 옛 규칙을 명시로 넘긴다.**
      //   fbReassignContainerPosition 의 기본이 1.53-02 에서 바뀌었다 — 밀려난 컨은 이제
      //   '뺏은 컨의 옛 자리'가 아니라 **자기 계획 자리(없으면 미배정)** 로 간다.
      //   (실측 2026-08-12 선적: TBJU2387722 가 07-07-06 → 07-07-04 → 11-02-06 → 11-07-06 으로 세 번 튕겼다.
      //    검수사 확정 — *"컨테이너는 자리를 옮기는 것이지 빈자리를 찾아가는 것이 아니다."*)
      //   그 기본은 **앱이 자리를 추측할 때** 맞는 규칙이고, 여기는 검수사가 **교환을 지시한** 경로다.
      //   → `swapWith` 로 "이 컨과 맞바꾼다"를 못 박는다. 안 넘기면 뒤 컨이 앞 자리 대신
      //     자기 계획 자리나 미배정으로 가버려, 검수사가 시킨 교환이 교환이 아니게 된다.
      //   → `actualWork` 도 함께 준다. 뒤 컨은 아직 선적확인 전(계획만 있는 상태)이라 이것이 없으면
      //     1.31/1.47 게이트가 그 자리를 '주인 있는 예약'으로 보고 **아무도 밀어내지 않는다** —
      //     뒤 컨이 그대로 남아 한 칸에 두 대가 된다(2026-08-11 맞교환 증상).
      //   ⚠ TallyOne 1.54 정정 — `actualWork` 는 **시퀀스 여부가 아니다.** 위 1.47 주석이 자동/수동 모드를
      //     시퀀스/액츄얼로 읽었는데, 검수사가 2026-08-12 정정했다:
      //     *"선적을 하기 전에 묻습니다. 풀 컨테이너 시퀀스 작업인지 아닌지를."* — **항차 속성**(`info.seqFull`)이다.
      //     1.54 부터 선적 판정은 firebase 가 `info.seqFull` 로 하고, `actualWork` 는 양하 게이트와
      //     이동 사유 표기에만 쓰인다. 이 경로는 `swapWith` 가 있어 되묻지 않는다(검수사가 이미 확인했다).
      const r = await fbReassignContainerPosition(voyageKey, mode, a.cn, b.bay, b.row, b.tier, inspector,
        { swapWith: b.cn, actualWork: true });
      // 조용히 실패하지 않는다 — 안 바뀐 것을 모르면 그림에서 한 칸에 두 대가 된다.
      if (!r || r.ok === false) {
        notify('맞바꾸지 못했습니다', `앞 ${a.cn.slice(-4)} ↔ 뒤 ${b.cn.slice(-4)}\n신호를 확인하고 다시 눌러 주세요.`);
      } else if (r.displaced !== b.cn) {
        notify('앞 컨만 옮겼습니다', `뒤 ${b.cn.slice(-4)}는 그 자리 주인이 아니어서 옮기지 않았습니다.\n두 컨의 위치를 확인하세요.`);
      } else {
        speak('앞뒤 위치를 맞바꿨습니다');
      }
    } finally { setBusy(false); }
  };

  const afterFix = () => {
    //  2.80: «자리 확인» 모드에서는 계획과 다른 것이 정상이다 — 수정 횟수로 세지 않고 수동 전환도 안 한다.
    //    (종전엔 3연속이면 자동 가이드가 꺼져, 엠티 구간에서 세 대마다 베이·단을 다시 골라야 했다.)
    if (slotMode) {
      setFixQuery(''); setFixQuery2(''); setFixPickFront(null); setFixPickBack(null); setFixSide(null);   // 4.26: 다음 트윈 카드가 앞 카드의 «앞만/뒤만» 칸으로 열리지 않게
      setConsecFix(0);
      return;
    }
    const n = consecFix + 1;
    setConsecFix(n);
    setFixOpen(false); setFixQuery(''); setFixQuery2(''); setFixPickFront(null); setFixPickBack(null);
    if (n >= AUTO_MANUAL_THRESHOLD) {
      //  ★ 4.26-02 (모의 작업 — OBWH 1호기 11회 · MCAP 4호기: 기사는 «한 열을 세로로», 앱은 «층 먼저» 라 세 번 고치면 2.6초 토스트 뒤 가이드가 꺼져 베이·단을 다시 골랐다):
      //    말없이 수동으로 넘기지 않는다. 큰 단추는 [자동 그대로], 회색은 양하 [순서 바꾸기 ⚙](4.09 순서 창) · 선적 [수동으로]. ✕ 도 그대로다.
      //    세는 수는 물은 뒤 0 으로 — 다시 세 번 다르면 또 묻는다.
      setConsecFix(0);
      try { speak('순서가 계속 다릅니다'); } catch { /* 소리 꺼짐 */ }
      askPick({
        title: `순서가 ${AUTO_MANUAL_THRESHOLD}번 연속 달랐습니다`,
        message: mode === 'discharge'
          ? `기사 작업 순서가 앱 순서(${workOrderText(wo)})와 다릅니다.\n[순서 바꾸기]에서 해상부터·리퍼부터 같은 조건을 고르면 가이드가 그 순서로 내밉니다.\n먼저 올 컨이 «다음 예정» 줄에 있으면 그 줄을 눌러도 됩니다.\n수동으로 가려면 맨 아래 [수동 모드로 전환].`
          : `실제로 실은 컨이 앱 순서와 계속 다릅니다.\n먼저 실을 컨이 «다음 예정» 줄에 있으면 그 줄을 누르면 카드로 올라옵니다.`,
        confirmLabel: '자동 그대로',
        cancelLabel: mode === 'discharge' ? '순서 바꾸기 ⚙' : '수동으로',
      }).then((pick) => {
        if (pick !== 'cancel') return;
        if (mode === 'discharge') setOrderOpen(true); else onSwitchManual?.();
      });
    }
  };

  // V8.09-06: fix 경로용 — 실제 배정될 컨(actual)의 XRAY 실번호 검증.
  //   actual은 검색결과 객체라 _xray/_xraySeal가 없을 수 있어 allContainers에서 원본을 찾아 확인.
  const xrayMissingByCn = (cn) => {
    if (mode !== 'discharge' || !cn) return false;
    const src = allContainers.find(x => x.cn === cn && x._mode === mode) || {};
    if (!src._xray) return false;
    return !String(src._xraySeal?.seal || '').trim();
  };

  //  ★ 2.80-02: 다른 베이 화물이면 그 자리에서 막고 «어디로 가야 하는지» 말한다(검수사 확정 — PDA 와 같은 안내).
  //    그래도 실었다면 **현장 절차를 그대로 띄운다.** 검수사 확정 2026-08-28 —
  //      *«이미 실수로 실었을때 입니다. 포트가 같다면 통제실에 무전을 합니다. 18번베이 컨테이너를 선적했다고
  //        알려주고 컨번호를 불러줘야 합니다. 그러면 저희 베이에 남을 1개의 컨테이너를 그쪽 베이로 보내줍니다.»*
  //    ⇒ 그 무전이 곧 **자리 맞바꿈**이다 — 앱이 하는 swapWith 와 같은 일이라 총량이 맞는다.
  //    ⚠ POD 가 다르면 맞바꿈이 성립하지 않는다(그 배에서 내릴 항이 다르다) — 그때는 세게 경고한다.
  //  4.25-02: 단독 수정(handleFixPick)과 트윈 «이 한 대만»(applyTwinFixOne)이 같이 부르게 함수로 뺐다(감사·2차 시뮬 — 트윈 한 대만에 이 안내가 없어 CNSHD 컨이 CNTAO 칸에 경고 없이 실렸다). 넣지 말라면 false.
  const askIfAway = async (c, slotC, slotPos) => {
    const away = otherBayNote(c);
    if (!away) return true;
    const samePod = String(c.pod || '').toUpperCase() === String(slotC.pod || '').toUpperCase();
    const guide = samePod
      ? `이미 실었다면 통제실에 무전하십시오.\n«${parseInt(c.bay, 10)}번 베이 ${c.cn} 를 실었다» 고 알리고 컨번호를 불러 주면,\n이 베이에 남을 컨 한 대를 그쪽으로 보내 줍니다.\n\n[그래도 넣는다] 를 누르면 앱도 두 자리를 맞바꿔 둡니다.`
      : `⛔ 양하항이 다릅니다 — 여기는 ${slotC.pod || '?'}, 그 컨은 ${c.pod || '?'} 입니다.\n맞바꿔 담을 수 없으니 통제실에 먼저 무전해 확인하십시오.`;
    return ask({
      title: '이 자리 화물이 아닙니다',
      message: `${c.cn.slice(-4)} 는 ${away}.\n지금 자리는 ${slotPos} 입니다.\n\n${guide}`,
      confirmLabel: '그래도 넣는다', cancelLabel: '취소',
    });
  };

  // 단독 카드 수정: 실제 온 컨 1대
  const handleFixPick = async (c) => {
    if (busy || !card) return;
    if (xrayMissingByCn(c.cn)) {   // V8.09-06: 실제 컨이 XRAY 대상인데 실번호 미입력이면 차단
      needXray(c.cn);   // 4.25-02: 그 컨의 입력칸을 연다(카드 밖 컨이면 카드 아래)
      return;
    }
    if (!(await askIfAway(c, card.main, card.pos))) return;   // 2.80-02 다른 베이·다른 양하항 안내(4.25-02 — 트윈 «이 한 대만» 과 한 벌)
    if (!(await confirmIfDone(c))) return;   // V8.71: 완료 기록된 컨이면 오선적 안내 후 진행 (1.53: 모달이라 await)
    setBusy(true);
    let done = false;
    try {
      done = await applyFixOne(c, card.main);
    } finally { setBusy(false); }
    if (!done) return;   // 1.54: 자리를 못 넣었으면(시퀀스 되묻기 취소 포함) 수정으로 세지 않는다
    //  3.77: 짝 자리의 컨이 짝을 남기고 혼자 나갔으면 «싱글»로 센다(카드 밖 다른 컨 선택도 같은 판정)
    //  (카드 안 두 컨 중 하나를 골랐거나, 고른 컨에게 짝 자리 컨이 남아 있을 때만 — 짝이 없는 40ft·다른 베이 선택은 세지 않는다)
    const _alone = (!!card.twin && (c.cn === card.main.cn || c.cn === card.twin.cn))
      || !!findTwinCandidate(c, remaining.filter(x => x.cn !== c.cn), new Set(), shipImo, shipName);
    noteWorked(c, _alone);   // 1.57: 실제 처리한 컨을 흐름 감지에 넣는다
    afterFix();
  };

  //  ★ 4.25-02 — 트윈 카드에서 **한 대만** 왔을 때: 고른 실제 컨 한 대를 그 자리(앞=card.main · 뒤=card.twin 자리)로 확인하고, 카드의 남은 컨은 큐에 남겨 바로 다음 카드로 올린다.
  //    한 대 확인의 길은 단독 카드 수정(handleFixPick → applyFixOne)과 같은 한 벌이다 — XRAY·다른 베이·다른 양하항 안내(askIfAway)·완료 기록 확인이 같다.
  //    남은 컨을 다음 카드로 올리는 것은 2.75 «한 대씩»(handleConfirmOne · 4.08-02)과 같은 규칙(resumeCns)이다.
  //    · 엇갈림 — 카드의 다른 쪽 컨을 이 칸에 골랐으면(앞뒤가 바뀌어 옴) 남는 것은 이 칸의 예측 컨이다(감사·2차 시뮬 «○○○○ 은 다음 카드에 남습니다» 를 못 지킴).
  //    · 선적 맞바꿈(2.80-01 자리 확인)은 고른 컨과 이 칸 계획 컨이 **둘 다 엠티**일 때만 — slotMode 는 앞 컨의 풀·엠티로만 켜져, 섞인 트윈에서 풀 계획 컨이 남의 칸으로 옮겨지면 안 된다(감사 하).
  const applyTwinFixOne = async (side) => {
    if (busy || !card || !card.twin) return;
    const pick = side === 'front' ? fixPickFront : fixPickBack;
    const slot = side === 'front' ? card.main : card.twin;
    const mate = side === 'front' ? card.twin : card.main;   // 다른 쪽 예측 컨
    if (!pick) return;
    const tangled = pick.cn === mate.cn;   // 카드의 다른 쪽 컨을 이 칸에 골랐다(앞뒤가 바뀌어 옴)
    const rest = tangled ? slot : mate;   // 남아서 다음 카드로 갈 카드 컨
    if (xrayMissingByCn(pick.cn)) { needXray(pick.cn); return; }
    if (!(await askIfAway(pick, slot, `${parseInt(slot.bay, 10)}-${slot.row}-${slot.tier}`))) return;
    if (!(await confirmIfDone(pick))) return;
    const _E = (x) => String((x && x.fe) || '').toUpperCase() === 'E';
    setBusy(true);
    let done = false;
    try { done = await applyFixOne(pick, slot, { swap: !tangled && _E(pick) && _E(slot) }); }
    catch (e) {
      if (e && e.viewOnly) { alert(e.message); return; }
      alert(`확인 중 오류 — 다시 시도하세요.\n(${e?.message || e})`);
      return;
    } finally { setBusy(false); }
    if (!done) return;
    //  3.77 «혼자 내림» 판정은 단독 수정(handleFixPick)과 같은 셈 — 카드 안 컨이거나 짝 자리 컨이 남아 있을 때만(짝 없는 40ft·다른 베이 컨은 세지 않는다)
    const _alone = (pick.cn === card.main.cn || pick.cn === card.twin.cn)
      || !!findTwinCandidate(pick, remaining.filter(x => x.cn !== pick.cn), new Set(), shipImo, shipName);
    noteWorked(pick, _alone);
    //  선적 엇갈림 — 고른 컨(카드의 다른 쪽 컨)이 이 칸에 실렸으니 남은 이 칸 계획 컨은 비워진 저쪽 칸으로 옮겨 둔다(회색 [도 확인] 길과 같은 두 번째 재배정, 완료는 안 함).
    //    안 옮기면 계획 칸을 내줘 «자리 없음» 으로 가 «다음 카드에 남습니다» 를 못 지켰다(재감사 하 — 엠티 1037 · 풀 9509). 못 옮기면 종전대로 🅿 배치 목록에 남는다.
    if (mode === 'loading' && tangled && rest && mate.bay && mate.row && mate.tier) {
      try { await reassignAsk(rest.cn, mate.bay, mate.row, mate.tier, undefined, `${String(rest.cn).slice(-4)} 를 비워진 칸(${parseInt(mate.bay, 10)}-${mate.row}-${mate.tier})으로 옮기지 못했습니다 — 🅿 자리 없음 목록에 남습니다.\n고른 ${String(pick.cn).slice(-4)} 는 이미 선적확인됐습니다.`); } catch (e) { console.warn('[4.25-02] 엇갈림 남은 컨 옮기기 실패 — 자리 없음 목록에 남는다', e); }
    }
    afterFix();
    if (rest && rest.cn && rest.cn !== pick.cn) setResumeCns([rest.cn]);
  };

  // 트윈 카드 수정: 앞/뒤 동시 — 바뀐 슬롯은 재배정+완료, 안 바뀐 슬롯은 예측 컨 그대로 완료
  const handleTwinFixApply = async () => {
    if (busy || !card || !card.twin) return;
    if (!fixPickFront && !fixPickBack) { alert('수정할 컨테이너를 선택하세요. (한쪽만 바뀌었으면 그쪽만 선택)'); return; }
    //  4.25-02: 아래에서 «엇갈림» 이면 비운 쪽을 채우므로 상태 대신 이 두 값으로 끝까지 간다.
    let pf = fixPickFront, pb = fixPickBack;
    // V8.70: 한쪽만 선택하고 적용하면 나머지는 "예측대로" 완료된다 — 실물이 정말 예측 컨인지 확인.
    //   (둘 다 틀렸는데 한쪽만 수정·적용 → 남은 쪽이 허위 완료되던 함정.)
    //  ★ 4.25-02 (모의 작업 OBWH 2호기 13대 · 1호기 seq7 — 트윈 카드인데 20피트가 한 대만 나왔다): 종전 물음은 [맞습니다](= 남은 쪽도 예측대로 완료)와 [취소]뿐이라
    //    한 대만 왔을 때 길이 없었다 — 맞습니다를 누르면 안 온 컨이 거짓 완료되고, 취소면 막다른 길. 이제 큰 단추가 **[이 한 대만]**(고른 컨만 확인, 남은 쪽은 다음 카드로) 이고
    //    남은 쪽도 실제로 왔을 때만 회색 [짝도 확인] 을 누른다. ✕ 는 아무것도 안 한다.
    if (!pf || !pb) {
      const sideName = !pf ? '앞' : '뒤';
      const pick = pf || pb;
      //  엇갈림 — 카드의 다른 쪽 컨을 이 칸에 골랐다(앞뒤가 바뀌어 옴). 그때 «같이 왔는지» 물을 컨은 카드에 남은 다른 한 대다(감사·2차 시뮬 — «3791 도 왔습니까 … 3791 은 다음 카드에 남습니다» 자기모순).
      const tangled = pick.cn === card.main.cn || pick.cn === card.twin.cn;
      const other = tangled ? [card.main, card.twin].find((x) => x.cn !== pick.cn) : (!pf ? card.main : card.twin);
      const o4 = String(other.cn || '').slice(-4), p4 = String(pick.cn || '').slice(-4);
      const how = await askPick({
        title: tangled ? `${o4} 도 왔습니까` : `${sideName}쪽 ${o4} 도 왔습니까`,
        message: tangled
          ? `카드의 ${p4} 가 ${sideName === '앞' ? '뒤' : '앞'} 자리로 왔습니다(앞뒤가 바뀜).\n남은 ${o4} 은?\n— 한 대만 왔으면(싱글) [싱글 — 이 한 대만] (${o4} 은 다음 카드에 남습니다)\n— ${o4} 도 ${sideName} 자리로 왔으면 [${o4} 도 확인] (두 대 자리를 맞바꿔 확인)`
          : `고른 컨 ${p4} 를 ${sideName === '앞' ? '뒤' : '앞'} 자리로 확인합니다.\n${sideName} 자리 예측 컨 ${o4} 은?\n— 한 대만 왔으면(싱글) [싱글 — 이 한 대만] (${o4} 은 다음 카드에 남습니다)\n— ${o4} 도 그대로 왔으면 [${o4} 도 확인]\n— ${sideName}쪽도 다른 컨이면 ✕ 로 닫고 ${sideName}쪽도 고르세요.`,
        confirmLabel: '싱글 — 이 한 대만', cancelLabel: `${o4} 도 확인`,   // 4.26: 검수사 2026-10-14 10:35 «한대만 오면 싱글작업입니다» — 카드의 [싱글로 한 대씩] 과 같은 말
      });
      if (!how) { if (fixSide) setFixSide(null); return; }   // 4.26: ✕ = «그쪽도 다른 컨» — 한쪽만 보이던 칸을 두 칸으로 편다(물음이 «○쪽도 고르세요» 라 한다)
      //  한 대만 — 남기는 쪽은 완료하지 않으므로 아래 «맞교환 자리 미정» 막음(_keepW)을 거치지 않는다(감사 하 — 막으면 한 대만 왔을 때 길이 다시 막힌다).
      if (how === 'confirm') { await applyTwinFixOne(pf ? 'front' : 'back'); return; }
      //  둘 다 왔다 — 엇갈림이면 남은 카드 컨이 비운 칸으로 왔다(앞뒤 맞바꿈). 종전엔 같은 컨을 두 번 확인하고 다른 하나를 빠뜨렸다.
      if (tangled) { if (pf) pb = other; else pf = other; }
    }
    //  ★ 4.23-01 2차: 고치지 않은 쪽이 규격·풀엠티·항구가 다른 맞교환이면 «예측대로» 완료하지 않는다 — 그 칸은 앱이 정하지 않는다(큰 확인 단추와 같은 기준 · 위치 지정으로).
    if (mode === 'loading') {
      const _keepW = [!pf && card.main, !pb && card.twin].filter(Boolean).find((x) => loadingSlotOf(x).kind === 'swapWarn');
      if (_keepW) { notify('실린 칸을 먼저 지정하세요', `${_keepW.cn.slice(-4)} 는 규격·풀엠티·항구가 다른 맞교환이라 앱이 자리를 정하지 않습니다.\n그쪽도 실제 온 컨을 고르거나, [📍 실린 칸 지정] 으로 실린 칸을 먼저 넣어 주세요.`); return; }
    }
    //  4.25-02 (2차 시뮬 재검 하): 둘 다 확인하는 길에도 카드 밖 컨이면 단독 수정·한 대만과 같은 «이 자리 화물이 아닙니다» 를 먼저 묻는다(종전부터 없던 안내 — CNSHD 컨이 CNTAO 칸에 경고 없이 실렸다).
    const _cardCn = new Set([card.main.cn, card.twin.cn]);
    if (pf && !_cardCn.has(pf.cn) && !(await askIfAway(pf, card.main, card.pos))) return;
    if (pb && !_cardCn.has(pb.cn) && !(await askIfAway(pb, card.twin, `${parseInt(card.twin.bay, 10)}-${card.twin.row}-${card.twin.tier}`))) return;
    // V8.09-06: XRAY 실번호 검증 — 바뀐 쪽은 실제 컨, 안 바뀐 쪽은 예측 컨 기준.
    const frontCn = pf ? pf.cn : card.main.cn;
    const backCn = pb ? pb.cn : card.twin.cn;
    const frontMiss = pf ? xrayMissingByCn(frontCn) : xraySealMissing(card.main);
    const backMiss = pb ? xrayMissingByCn(backCn) : xraySealMissing(card.twin);
    if (frontMiss || backMiss) {
      const miss = [frontMiss && frontCn?.slice(-4), backMiss && backCn?.slice(-4)].filter(Boolean);
      needXray(frontMiss ? frontCn : backCn, miss.join(', '));   // 4.25-02: 경고만이 아니라 첫 컨의 입력칸을 연다
      return;
    }
    // V8.71 (1.53: 모달이라 await — 한쪽씩 차례로 묻는다)
    if (pf && !(await confirmIfDone(pf))) return;
    if (pb && !(await confirmIfDone(pb))) return;
    setBusy(true);
    // V8.71: 원자화 — 재배정(위치)을 앞·뒤 모두 끝낸 뒤에만 완료를 찍는다.
    //   (구: 앞 재배정+완료 → 뒤 재배정+완료 순서라, 뒤가 중간에 실패하면 앞 한 대만 선적된 채 멈춤 — 현장 보고 2026-07-08.)
    try {
      if (mode === 'loading') {
        // 1.54: 시퀀스 항차면 여기서 되묻는다. 취소되면 **선적확인을 찍지 않고** 멈춘다
        //   (자리는 안 들어갔는데 완료만 찍히는 것이 가장 나쁘다 — 그림과 기록이 갈린다).
        if (pf && !(await reassignAsk(pf.cn, card.main.bay, card.main.row, card.main.tier))) { setBusy(false); return; }
        //  4.26-03(감사 하-2): 앞 컨을 이미 넣었으면 뒤 컨 물음 취소·실패를 말없이 넘기지 않는다(전체 시퀀스가 기본이 되어 답 없는 항차에서도 뜬다).
        const _half = pf ? `앞 컨 ${pf.cn.slice(-4)} 은(는) ${parseInt(card.main.bay, 10)}-${card.main.row}-${card.main.tier} 에 넣었습니다.\n뒤 컨 ${pb ? pb.cn.slice(-4) : ''} 은(는) 넣지 않았고 선적확인은 두 대 모두 찍지 않았습니다.\n뒤 컨 자리를 다시 정하거나, 앞 컨을 조회 → 큰 카드 «📍 위치 지정» 으로 되돌리세요.` : '';
        if (pb && !(await reassignAsk(pb.cn, card.twin.bay, card.twin.row, card.twin.tier, undefined, _half, _half))) { setBusy(false); return; }
      }
      await fbCompleteContainersAtomic(voyageKey, mode,
        [frontCn, backCn], inspector, equip);   // 1.55: 갱(호기)
    } catch (e) {
      if (e && e.viewOnly) { alert(e.message); setBusy(false); return; }   // 3.51: 조회만은 보기만
      alert(`수정 적용 중 오류 — 선적확인은 찍지 않았습니다. 다시 시도하세요.\n(${e?.message || e})`);
      setBusy(false);
      return;
    } finally { setBusy(false); }
    noteWorked(pf || pb);   // 1.57: 실제 처리한 컨을 흐름 감지에 넣는다
    afterFix();
  };

  if (mode !== 'discharge' && mode !== 'loading') return null;

  // ── 설정 칩 바: 장비·접안·베이 — 항상 표시, 탭하면 변경 ──
  const SettingsBar = ({ hideOrder = false }) => (
    <div className="flex gap-1.5 text-xxs">
      <button onClick={() => setEquipStep(true)}
        className="flex items-center gap-1 px-2 py-1.5 rounded-pill bg-ink-800 border border-line text-amber-300 font-bold hover:bg-ink-750">
        <Construction className="w-3.5 h-3.5"/>{equip || '장비?'}
      </button>
      <button onClick={changeBerth} disabled={!berthSide}
        className="flex items-center gap-1 px-2 py-1.5 rounded-pill bg-ink-800 border border-line text-sky-300 font-bold hover:bg-ink-750 disabled:opacity-40">
        <Anchor className="w-3.5 h-3.5"/>{berthSide ? (berthSide === 'starboard' ? '우현 접안' : '좌현 접안') : '접안?'}
      </button>
      {/* 3.3: 양하 로우 순서 — 케빈이 해상부터 내리면 여기서 바꾼다. 선적은 무관(해상→육상 고정).
          4.09: 누르면 «양하 순서» 창이 열린다 — 로우 방향과 풀·엠티·일반·리퍼·20·40부터를 겹쳐 고르고 호기별로 항차에 기억한다. */}
      {mode === 'discharge' && !hideOrder && (
        <button onClick={() => setOrderOpen((v) => !v)} disabled={!berthSide}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-pill bg-ink-800 border border-line font-bold hover:bg-ink-750 disabled:opacity-40 ${rowFrom === 'sea' ? 'text-orange-300 border-orange-700/60' : 'text-teal-300'}`}>
          ⇄ {rowFrom === 'sea' ? '해상부터' : '육상부터'}{wo.prefs.length ? ` +${wo.prefs.length}` : ''}
        </button>
      )}
      {selectedGroup != null && (
        <button onClick={() => setSelectedGroup(null)}
          className="flex items-center gap-1 px-2 py-1.5 rounded-pill bg-ink-800 border border-line text-violet-300 font-bold hover:bg-ink-750">
          B{selectedGroup} 변경
        </button>
      )}
    </div>
  );


  //  ★ 4.09 — «양하 순서» 창. 기사의 작업 방법을 호기별로 정한다(검수사 «장비 기사의 작업 방법이 틀려서 입니다»).
  //    고르는 즉시 저장하고(다시 누르면 해제) 같은 호기를 쓰는 모든 화면·미르가 같은 순서를 따른다. 번호 = 우선순위(먼저 누른 것이 먼저).
  const orderSheet = () => (
    <div className="bg-ink-900 border-2 border-teal-700 rounded-pill p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-teal-300">양하 순서 — {equip || '호기 미지정'}</div>
        <button onClick={() => setOrderOpen(false)} className="px-2 py-1 rounded text-xs text-dim-300 hover:text-teal-300">닫기</button>
      </div>
      <div className="text-xxs text-dim-300 leading-snug">
        기사의 작업 방법에 맞춥니다. {equip ? `${equip}` : '이 항차'}를 쓰는 모든 검수원 화면과 미르가 같은 순서를 따릅니다.
        위에 컨이 남은 칸은 앞당기지 않고, 데크가 홀드보다 먼저입니다.
      </div>
      <div>
        <div className="text-2xs font-bold text-dim-200 mb-1">로우</div>
        <div className="flex gap-1.5">
          {[['land', '육상부터'], ['sea', '해상부터']].map(([k, l]) => (
            <button key={k} onClick={() => pickRow(k)}
              className={`flex-1 py-2 rounded-pill border text-xs font-bold ${rowFrom === k ? 'bg-teal-700 border-teal-500 text-white' : 'bg-ink-800 border-line text-dim-200 hover:bg-ink-750'}`}>{l}</button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-2xs font-bold text-dim-200 mb-1">먼저 내릴 것 — 먼저 누른 것이 우선입니다</div>
        <div className="grid grid-cols-3 gap-1.5">
          {ORDER_PREF_KEYS.map((k) => {
            const n = wo.prefs.indexOf(k);
            return (
              <button key={k} onClick={() => pickPref(k)}
                className={`py-2 rounded-pill border text-xs font-bold ${n >= 0 ? 'bg-violet-700 border-violet-500 text-white' : 'bg-ink-800 border-line text-dim-200 hover:bg-ink-750'}`}>
                {n >= 0 ? `${n + 1}. ` : ''}{ORDER_PREF_LABEL[k]}부터
              </button>
            );
          })}
        </div>
        <div className="text-3xs text-dim-400 leading-snug mt-1">20↔40 · 풀↔엠티 · 일반↔리퍼 · 엠티↔일반·리퍼는 함께 못 겁니다(새로 누른 쪽으로 바뀝니다). 내릴 수 있는 칸에서만 앞당기고, 갈림 칩이 켜져 있으면 그것이 먼저입니다.</div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xxs text-dim-400 min-w-0">
          지금 <span className="text-dim-100 font-bold">{workOrderText(wo)}</span>
          {wo.by ? ` · ${wo.by} ${wo.at ? new Date(wo.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}` : ''}
        </div>
        <button onClick={resetWorkOrder}
          className="shrink-0 px-3 py-1.5 rounded-pill border border-amber-700 bg-ink-800 text-xs font-bold text-amber-300 hover:bg-ink-750">기본으로</button>
      </div>
    </div>
  );

  // ── 1단계: 장비(호기) 결정 ──
  if (equipStep) {
    return (
      <div className="bg-ink-900 border-2 border-amber-700 rounded-pill p-4 space-y-3">
        <div className="text-sm font-bold text-amber-300 text-center flex items-center justify-center gap-1.5">
          <Construction className="w-4 h-4"/>작업 장비(호기)를 선택하세요
        </div>
        <div className="text-xxs text-dim-300 text-center">헤더의 🏗 장비 표시·작업 보고와 공유됩니다.</div>
        <div className="grid grid-cols-2 gap-2">
          {equipNumbers.map(num => (
            <button key={num} onClick={() => pickEquip(num)}
              className={`py-4 rounded-pill border font-bold text-base ${
                equip === num ? 'bg-amber-700 border-amber-500 text-white' : 'bg-ink-800 border-line text-dim-100 hover:bg-amber-900'
              }`}>
              🏗 {num}
            </button>
          ))}
        </div>
        {equip && (
          <button onClick={() => setEquipStep(false)} className="w-full text-xxs text-dim-300 py-1 hover:text-amber-300">
            현재 {equip} 유지하고 닫기
          </button>
        )}
      </div>
    );
  }

  // ── 2단계: 접안 방향 결정 (확인 후 저장 — 오선택 방지) ──
  if (!berthSide) {
    return (
      <div className="space-y-2">
        {!compact && <SettingsBar/>}
        <div className="bg-ink-900 border-2 border-violet-700 rounded-pill p-4 space-y-3">
          <div className="text-sm font-bold text-violet-300 text-center flex items-center justify-center gap-1.5">
            <Anchor className="w-4 h-4"/>접안 방향을 선택하세요
          </div>
          <div className="text-xxs text-dim-300 text-center">크레인 작업 순서(육상↔해상)의 기준입니다. 선택 후 확인을 한 번 더 묻습니다.</div>
          <div className="flex gap-2">
            <button onClick={() => pickBerth('port')}
              className="flex-1 py-5 rounded-pill bg-ink-800 hover:bg-violet-800 border border-line font-bold text-base text-dim-100">
              좌현 접안<div className="text-2xs font-normal text-dim-300 mt-1">홀수 로우가 해상쪽</div>
            </button>
            <button onClick={() => pickBerth('starboard')}
              className="flex-1 py-5 rounded-pill bg-ink-800 hover:bg-violet-800 border border-line font-bold text-base text-dim-100">
              우현 접안<div className="text-2xs font-normal text-dim-300 mt-1">짝수 로우가 해상쪽</div>
            </button>
          </div>
        </div>
        {/* 1.53: 확인창은 앱 안에서 뜬다 — 이 화면에서도 접안 변경 등을 묻는다. */}
        <ConfirmModal {...confirmState} />
        {hatchCountEl}
      </div>
    );
  }

  // ── 3단계: 베이 그룹 결정 ──
  if (selectedGroup == null) {
    return (
      <div className="space-y-2">
        {!compact && <SettingsBar/>}
        {!compact && mode === 'discharge' && orderOpen && orderSheet()}
        <div className="bg-ink-900 border border-line rounded-pill p-3 space-y-2">
          <div className="text-sm font-bold text-violet-300">작업할 베이를 선택하세요</div>
          {groups.length === 0 && unassigned.length === 0 && <div className="text-xs text-dim-400 text-center py-4">남은 {mode === 'discharge' ? '양하' : '선적'} 작업이 없습니다.</div>}
          {/* V9.23-08: 좌표 없는 컨은 어느 베이 묶음에도 안 들어간다. 여기서 안 보여 주면
              "대기 N대"인데 고를 베이가 없어 작업이 막힌다(2658W 신고). */}
          {unassigned.length > 0 && (
            <button onClick={() => setShowUnassigned(v => !v)}
              className="w-full py-3 rounded-pill bg-amber-950/60 hover:bg-amber-800 border border-amber-600 text-amber-100">
              <div className="font-bold text-base">⚠ 자리 없음 {unassigned.length}대{unassignedTaken > 0 ? '·계획 자리 내줌' : ''}</div>
              {/* 2.98-08: ⚠ 수동(SearchPanel:578)과 **문구가 다르다** — 수동은 «빈 칸을 골라 자리를 정해 주세요»,
                  여기는 «실제로 실은 자리에서 넣어 주세요». 동작은 둘 다 같은 🅿 배치로 간다.
                  일부러 다르게 뒀다: 빈 칸을 찾아 넣는 것은 검수사 확정 위반이다 —
                  *«컨테이너는 자리를 옮기는 것이지 빈자리를 찾아가는 것이 아니다»*.
                  ⇒ **다음 판에서 수동 문구를 이쪽으로 맞춘다.** 두 화면이 다르게 말하면 검수원이 갈린다. */}
              <div className="text-2xs text-amber-300">{unassignedTaken > 0
                ? `계획 자리 내줌 ${unassignedTaken}대 — 그 칸엔 다른 컨이 실렸습니다. 실제로 실은 자리에서 넣어 주세요`
                : '리스트엔 있는데 적부 좌표가 없습니다'} — 눌러서 목록 보기</div>
            </button>
          )}
          {unassigned.length > 0 && showUnassigned && (
            <div className="space-y-1">
              {unassigned.map(c => (
                <div key={c.cn} className="flex items-center gap-1.5">
                  <button onClick={() => onOpenContainer?.(c)}
                    className="flex-1 flex justify-between items-center bg-ink-900 border border-line rounded px-2 py-1.5 text-xs">
                    <span className="mono font-bold text-dim-100">{c.cn}</span>
                    <span className="text-2xs text-amber-400">조회</span>
                  </button>
                  {onPlaceUnassigned && (
                    <button onClick={() => onPlaceUnassigned(c)}
                      className="px-3 py-1.5 rounded bg-lime-800 hover:bg-lime-700 border border-lime-600 text-lime-100 text-xs font-black">🅿 배치</button>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {groups.map(g => (
              <button key={g.center} onClick={() => { pickGroup(g); }}
                className="py-3 rounded-pill bg-ink-800 hover:bg-violet-800 border border-line text-dim-100">
                <div className="font-bold text-base">B{groupLbl(g.center, g)}</div>
                {/* 1.95: 빈 칸(수동 기준·정본)을 앞에, 컨 머릿수를 뒤에 — 계산은 SearchPanel manualGroups 한 벌 */}
                <div className="text-2xs text-dim-300">
                  {(() => { const s = slotGroups && slotGroups.find(x => x.center === g.center); return s ? `빈 칸 ${s.count} · ` : ''; })()}남은 컨 {g.count}대
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-0.5 text-2xs font-bold">
                  {g.deck > 0 && <span className="text-sky-300">데크 {g.deck}</span>}
                  {g.deck > 0 && g.hold > 0 && <span className="text-dim-500">·</span>}
                  {g.hold > 0 && <span className="text-amber-300">홀드 {g.hold}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
        {/* 1.53: 확인창은 앱 안에서 뜬다 — 이 화면에서도 접안 변경 등을 묻는다. */}
        <ConfirmModal {...confirmState} />
        {hatchCountEl}
      </div>
    );
  }

  // ── 3.5단계: 작업 단(홀드/데크) 선택 (V7.99-8 메모6) ──
  //   검수사가 누른 단이 ① 수석에게 작업 위치 전달 ② 큐를 그 단만 표시 ③ 다른컨 수정 후보를 그 단으로 좁힘.
  if (selectedTier == null) {
    const g = groups.find(x => x.center === selectedGroup);
    const bayLbl = `B${groupLbl(selectedGroup, g)}`;   // 4.26-02: 묶음 이름 한 벌(전체 작업분)
    // #5 (V8.45): 자동 양하는 정상 작업(데크→홀드) 전제. 그 베이 데크가 남았으면 홀드 비활성 —
    //   커버 위 데크를 다 내려야 그 아래 홀드에 접근하기 때문. 커버 부분개방 등 예외 상황은 수동 몫(자동은 대처 못 함).
    const deckFirstBlock = mode === 'discharge' && !!g && g.deck > 0;
    return (
      <div className="space-y-2">
        {!compact && <SettingsBar/>}
        {!compact && mode === 'discharge' && orderOpen && orderSheet()}
        <div className="bg-ink-900 border border-line rounded-pill p-3 space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedGroup(null)} className="flex items-center gap-1 text-xs text-dim-300 hover:text-violet-300">
              <ChevronLeft className="w-4 h-4"/>베이
            </button>
            <div className="text-sm font-bold text-violet-300">{bayLbl} — 작업할 단을 선택하세요</div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button disabled={!g || g.deck === 0} onClick={() => setSelectedTier('deck')}
              className={`py-4 rounded-pill border text-left px-4 ${!g || g.deck === 0 ? 'bg-ink-800/40 border-line text-dim-500' : 'bg-sky-950/40 border-sky-700 hover:bg-sky-900/50 text-sky-100'}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-base">🔵 데크 {g ? g.deck : 0}개</span>
                <span className="text-xs mono text-sky-300">20FT:{g ? g.deck20 : 0} / 40FT:{g ? g.deck40 : 0}</span>
              </div>
            </button>
            <button disabled={!g || g.hold === 0 || deckFirstBlock} onClick={() => setSelectedTier('hold')}
              className={`py-4 rounded-pill border text-left px-4 ${!g || g.hold === 0 || deckFirstBlock ? 'bg-ink-800/40 border-line text-dim-500' : 'bg-amber-950/40 border-amber-700 hover:bg-amber-900/50 text-amber-100'}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-base">🟠 홀드 {g ? g.hold : 0}개</span>
                <span className="text-xs mono text-amber-300">20FT:{g ? g.hold20 : 0} / 40FT:{g ? g.hold40 : 0}</span>
              </div>
              {deckFirstBlock && g.hold > 0 && <div className="text-2xs text-rose-300 font-bold mt-1">데크 {g.deck}개 먼저 양하 — 커버 아래 (자동)</div>}
            </button>
          </div>
        </div>
        {/* 1.53: 확인창은 앱 안에서 뜬다 — 이 화면에서도 접안 변경 등을 묻는다. */}
        <ConfirmModal {...confirmState} />
        {hatchCountEl}
      </div>
    );
  }

  // ── 4단계: 예측 카드 (V7.94-05: 기본 정보 전부 표시 — 실번호 확인·XRAY 번호 입력·규격 확인) ──
  //  ★ 4.25-02 — XRAY 입력칸 한 벌(카드 안 · 카드 밖 수정 컨 둘 다 이 모양). 종전엔 카드 안에만 있었다.
  const xrayEditRow = (c) => (
    <div className="space-y-1">
      <div className="flex gap-1.5">
        <input autoFocus value={xVal} onChange={e => setXVal(e.target.value)} {...NUM_INPUT_PROPS}
          placeholder="XRAY 실번호" className="flex-1 min-w-0 bg-ink-800 border border-fuchsia-600 rounded px-2 py-1 text-sm mono text-dim-100"/>
        <input value={xEVal} onChange={e => setXEVal(e.target.value)} {...NUM_INPUT_PROPS}
          onKeyDown={e => { if (e.key === 'Enter') saveXSeal(c); }}
          placeholder="E-실(선택)" className="w-24 bg-ink-800 border border-line-strong rounded px-2 py-1 text-sm mono text-dim-100"/>
      </div>
      <div className="flex gap-1.5">
        <button onClick={() => saveXSeal(c)} className="flex-1 py-1 rounded bg-fuchsia-700 text-white text-xs font-bold">XRAY 저장</button>
        <button onClick={() => { setEditXCn(null); setXVal(''); setXEVal(''); }} className="px-2 rounded bg-ink-800 text-dim-300 text-xs">취소</button>
      </div>
    </div>
  );
  //  ★ 4.26 — **작업 카드 위계**(화면 개편 판 F · 모의 작업장 설계 proposal_work §2 — 검수사 2026-10-13 00:53 «전부 클로드 안대로 수정하고 배포»).
  //    읽는 순서 = 크기 순서: 끝 4자리(36·크게 40) > 앞 7자리(28·31) > 자리 상자(24·26) > 데크·홀드 · 출발→도착 > 칩 한 줄 > 실번호.
  //    종전엔 자리가 머리 오른쪽 10px 이었다. 동작은 그대로다 — 컨번호를 누르면 컨 상세, 실번호·XRAY·규격 고르기 칸도 종전 그 함수들이다.
  //    베이뷰 위 칸(compact)은 1/3 화면이라 종전 크기를 쓴다. data-gw-* 는 회귀 검사가 읽는 자리다.
  const renderCon = (c, label, color) => {
    const _warn = mode === 'loading' && loadingSlotOf(c).kind === 'swapWarn';
    const _pos = `${parseInt(c.bay, 10)}-${c.row}-${c.tier}`;
    const _deck = parseInt(c.tier, 10) >= 80;
    const m = markOf(c);
    const _empty = String(c.fe || '').toUpperCase() === 'E';
    const _seal = inspectionSealOf(c);   // 검수리스트 실번호 칸과 같은 값(4.25-02 — 엠티는 엠티실)
    const chip = 'gw-chip font-bold';
    return (
    <div data-gw-card={label} data-gw-cn={c.cn} data-gw-pos={_warn ? '' : _pos}
      className={`rounded-pill border-2 p-3 ${color === 'amber' ? 'border-amber-600 bg-amber-950/30' : 'border-cyan-600 bg-cyan-950/30'}`}>
      <div className="flex items-center justify-between text-2xs mb-1">
        <span className={`font-bold ${color === 'amber' ? 'text-amber-400' : 'text-cyan-400'}`}>{label}</span>
        {_warn && <span className="text-orange-300 mono font-bold">자리 미정</span>}
      </div>
      {/*  ★ 4.23-01 — 이 칸은 «맞교환 자리»다(3.13 자동 맞교환 — 이 컨의 계획 칸에 다른 컨이 실려, 그 컨이 비운 계획 칸으로 옮겨 보인다).
            근거 — 검수사 확정(3.13) «밀려난 계획 컨을 어떻게 둘지 → 속성 같으면 비운 자리로 자동 맞교환». 같은 뜻을 앱 글이 이미 말한다(검수사 말이 아니다) —
            이 화면 «이 자리 화물이 아닙니다» 창(2.80-02) «[그래도 넣는다] 를 누르면 앱도 두 자리를 맞바꿔 둡니다» · 매뉴얼 자리 확인 절 «다른 컨을 넣었다면 그 컨은 온 컨이 있던 옛 자리로 가서 기다립니다».
            [선적확인] 을 누르면 이 칸이 실린 자리로 저장된다(firebase._markLoadedPos — 4.23-01). 낱말·자리는 utils.loadingSlotOf 한 벌(큰 카드·컨 상세·리스트와 같다).
            ★ 4.23-01 2차 — 규격·풀엠티·항구가 다르면(3.13 _assign_warn) 앱이 자리를 정하지 않는다: 머리는 «자리 미정», 확인 단추는 위치 지정을 연다. */}
      {(() => {
        const ls = mode === 'loading' ? loadingSlotOf(c) : null;
        if (!ls || !ls.plan || (ls.kind !== 'swap' && ls.kind !== 'swapWarn')) return null;
        const who = ls.byCn ? String(ls.byCn).slice(-4) : '';
        return ls.kind === 'swap' ? (
          <div className="text-2xs font-bold mb-1 text-sky-300">
            🔄 맞교환 자리 — 계획 칸({ls.plan}){who ? `에 ${who} 이(가) 실렸습니다` : '은 다른 컨이 차지했습니다'}
          </div>
        ) : (
          <div className="text-2xs font-bold mb-1 text-orange-300">
            ⚠ 계획 칸({ls.plan})은 {who ? `${who} 이(가)` : '다른 컨이'} 차지했습니다 — 이 컨은 규격·풀엠티·항구가 달라 앱이 자리를 정하지 않습니다. 실제 실린 칸을 지정하세요
            <span className="block font-normal text-orange-200">비는 칸 {ls.pos} · {ls.warn}</span>
          </div>
        );
      })()}
      <button onClick={() => onOpenContainer?.(c)} className="w-full text-left">
        <span className={`mono font-bold text-dim-100 ${compact ? 'text-xl' : 'gw-cn-a'}`}>{c.cn.slice(0, -4)}</span>
        <span className={`mono font-black text-emerald-300 ${compact ? 'text-3xl' : 'gw-cn-b'}`}>{c.cn.slice(-4)}</span>
      </button>
      {/* 4.26 자리 줄 — 자리 상자 · 데크/홀드 · 출발 → 도착(맞교환 «자리 미정» 이면 상자 없음 — 머리와 아래 경고가 말한다) */}
      {!_warn && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
          <span className={`mono font-black text-dim-100 bg-ink-800 border border-line-strong ${compact ? 'text-base px-1.5 rounded' : 'gw-pos'}`}>{_pos}</span>
          <span className={`font-bold ${_deck ? 'text-sky-300' : 'text-amber-300'} ${compact ? 'text-xs' : 'text-base'}`}>{_deck ? '데크' : '홀드'}</span>
          {(c.pol || c.pod) && <span className={`mono font-bold text-teal-300 ${compact ? 'text-xs' : 'text-lg'}`}>{c.pol || '?'} → {c.pod || '?'}</span>}
        </div>
      )}
      {/* 4.26 칩 한 줄 — 규격 · 풀/엠티·무게 · 선사 · 특수 표시(수화물·긴급·X-RAY·풀 리퍼·제작컨·DG·FR·O/T·OOG·시프팅·추가분) */}
      <div className="flex flex-wrap items-center gap-1 mt-1.5 mono">
        <span className={`${chip} bg-ink-800 text-dim-100`}>{c.tp || isoToLabel(c.iso) || isoShown(c.iso)}</span>
        <span className={`${chip} bg-ink-800 ${_empty ? 'text-dim-300' : 'text-emerald-300'}`}>{_empty ? 'EMPTY' : 'FULL'}{c.wt ? ` ${formatWt(c.wt)}` : ''}</span>
        {c.op && <span className={`${chip} bg-ink-800 text-dim-200`}>{c.op}</span>}
        {m.lugg && <span className={`${chip} bg-violet-700 text-violet-50`}>🧳 수화물</span>}
        {m.urgent && <span className={`${chip} bg-rose-600 text-rose-50`}>▲ 긴급</span>}
        {c._xray && <span className={`${chip} bg-fuchsia-700 text-fuchsia-100`}>★ X-RAY</span>}
        {isFullReefer(m) && <span className={`${chip} bg-sky-700 text-sky-100`}><Snowflake className="w-3 h-3 inline"/> 리퍼{c.tmp ? ` ${c.tmp}` : ''}</span>}
        {m.mkcon && <span className={`${chip} bg-ink-700 text-dim-100`}>제작컨</span>}
        {c.dg && <span className={`${chip} bg-red-700 text-red-100`}>DG</span>}
        {c.fr && <span className={`${chip} bg-orange-700 text-orange-100`}>FR</span>}
        {c.ot && <span className={`${chip} bg-yellow-700 text-yellow-100`}>O/T</span>}
        {c.oog && <span className={`${chip} bg-rose-700 text-rose-100`}>OOG</span>}
        {c._shift && <span className={`${chip} bg-indigo-700 text-indigo-100`}>◆ 시프팅</span>}
        {c._extraOfList && <span className={`${chip} bg-lime-800 text-lime-100`}>＋ 추가분</span>}
      </div>
      {/* 실번호 — 확인·수정. 4.26: 검수리스트와 같은 값(inspectionSealOf — 엠티는 엠티실). 엠티에 실이 없으면 경고가 아니라 «엠티 · 실 없음». 고치는 칸은 종전대로 sl. */}
      <div className="mt-1.5 pt-1.5 border-t border-line">
        {editSealCn === c.cn ? (
          <div className="flex gap-1.5">
            <input autoFocus value={sealVal} onChange={e => setSealVal(e.target.value)} {...NUM_INPUT_PROPS}
              onKeyDown={e => { if (e.key === 'Enter') saveSeal(c); }}
              placeholder="실번호 입력" className="flex-1 min-w-0 bg-ink-800 border border-amber-600 rounded px-2 py-1 text-sm mono text-dim-100"/>
            <button onClick={() => saveSeal(c)} className="px-2.5 rounded bg-emerald-700 text-white text-xs font-bold">저장</button>
            <button onClick={() => { setEditSealCn(null); setSealVal(''); }} className="px-2 rounded bg-ink-800 text-dim-300 text-xs">취소</button>
          </div>
        ) : (
          <button onClick={() => { setEditSealCn(c.cn); setSealVal(c.sl || _seal || ''); }} className="w-full flex items-center gap-1.5 text-left" data-gw-seal={_seal || ''}>
            <span className="text-xxs text-dim-400 flex-shrink-0">{_seal && !String(c.sl || '').trim() ? '엠티실:' : '실:'}</span>
            <span className={`mono font-bold ${compact ? 'text-sm' : 'text-base'} ${_seal ? 'text-cyan-300' : _empty ? 'text-dim-300' : 'text-amber-400'}`}>{_seal || (_empty ? '엠티 · 실 없음' : '⚠ 미입력')}</span>
            <Pencil className="w-3 h-3 text-dim-400"/>
          </button>
        )}
      </div>
      {/*  ★ 3.47 — 규격 3자 불일치. 실물을 보고 고른다(검수사 «세개중에 어느것이 맞는지 선택»).
           고르기 전에도 완료는 막지 않는다 — 「미확정」만 보인다. */}
      {(() => {
        const srcs = isoPickOf(c);
        if (!srcs) return c.iso_pick ? (
          <div className="mt-1.5 text-xxs text-emerald-400">규격 확정 — {ISO_SRC_NAME[c.iso_pick] || c.iso_pick} 것 {c.iso_pick_label || ''}</div>
        ) : null;
        return (
          <div className="mt-1.5 pt-1.5 border-t border-amber-700/60">
            {/* 4.25-01 (검수사 2026-10-14 «뭔가 확인이 안될떄는 터미널의 규격을 따릅니다»): 확인 전에는 터미널(EDI) 규격 — 컨 상세와 같은 말. */}
            <div className="text-xxs font-bold text-amber-300">⚠ 규격이 자료마다 다름{srcs.some(x => x.k === 'edi') ? ` — 터미널(EDI) ${srcs.find(x => x.k === 'edi').spec} 을 따릅니다` : ' — 미확정'}</div>
            <div className="text-3xs text-dim-300 leading-snug mt-0.5">{srcs.some(x => x.k === 'edi') ? '실물이 다르면 맞는 것을 누르세요.' : '실물을 보고 맞는 것을 누르세요.'}</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {srcs.map(x => (
                <button key={x.k} onClick={() => savePickIso(c, x)} disabled={busy}
                  className="px-2 py-1 rounded bg-ink-800 border border-amber-600 text-2xs mono font-bold text-amber-200 active:bg-amber-900 disabled:opacity-50">
                  {x.name} <span className="text-dim-100">{x.spec}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })()}
      {/* XRAY 번호 — 대상만 표시·입력 */}
      {c._xray && (
        <div className="mt-1.5">
          {editXCn === c.cn ? xrayEditRow(c) : (
            <button onClick={() => { setEditXCn(c.cn); setXVal(c._xraySeal?.seal || ''); setXEVal(c._xraySeal?.eseal || ''); }} className="w-full flex items-center gap-1.5 text-left">
              <span className="text-xxs text-fuchsia-400 font-bold flex-shrink-0">XRAY:</span>
              <span className={`mono text-sm font-bold ${c._xraySeal?.seal ? 'text-fuchsia-200' : 'text-amber-400'}`}>{c._xraySeal?.seal || '미입력'}{c._xraySeal?.eseal ? ` / E:${c._xraySeal.eseal}` : ''}</span>
              <Pencil className="w-3 h-3 text-dim-400"/>
            </button>
          )}
        </div>
      )}
    </div>
    );
  };

  //  ★ 4.26 — 예외 줄. 종전엔 확인 단추 아래에 «싱글로 한 대씩» · «⏸ 지금 양하 불가» · «📍 자리 확인 방식으로» · «다른 컨테이너가 나옴» 이 한 줄씩 쌓여 확인 단추가 화면 아래로 밀렸다(모의 작업장 — 단을 고르면 확인 단추 y≈1,400).
  //    같은 일을 하는 단추를 한 줄(44px · 크게 48px)로 모은다. 누르면 종전 그 칸이 아래에 열린다 — 하는 일은 한 줄도 안 바뀐다.
  //    트윈은 «앞만 다름 · 뒤만 다름 · 둘 다 다름»(검수사 2026-10-14 10:33 «앞이 다름 뒤가 다름 그럼 둘다 다름은?») + «싱글로 한 대씩 · 보류».
  const closeFix = () => {
    setFixOpen(false); setFixQuery(''); setFixQuery2(''); setFixPickFront(null); setFixPickBack(null); setFixSide(null);
    //  4.26-02 (4.25-02 기록만): 수정 칸이 닫히면 카드 밖 컨(수정으로 고른 컨)의 XRAY 칸도 닫는다 — 다시 열면 치다 만 값이 남아 있었다. 카드 안 컨의 칸은 그대로.
    if (editXCn && editXCn !== card?.main?.cn && editXCn !== card?.twin?.cn) { setEditXCn(null); setXVal(''); setXEVal(''); }
  };
  const openFix = (side) => {
    if (fixOpen && fixSide === side) { closeFix(); return; }   // 같은 단추를 다시 누르면 닫는다
    setFixQuery(''); setFixQuery2(''); setFixPickFront(null); setFixPickBack(null);
    setFixSide(side); setFixOpen(true); setHoldOpen(false); setSingleMode(false);
  };
  const xrayTargets = card ? [card.main, card.twin].filter((x) => x && x._xray) : [];
  const openCardXray = () => {
    const t = xrayTargets.find((x) => !String(x._xraySeal?.seal || '').trim()) || xrayTargets[0];
    if (!t) return;
    if (editXCn === t.cn) { setEditXCn(null); setXVal(''); setXEVal(''); return; }
    setEditXCn(t.cn); setXVal(t._xraySeal?.seal || ''); setXEVal(t._xraySeal?.eseal || '');
  };
  const exBtn = (key, text, onClick, on = false, tone = 'amber') => (
    <button key={key} data-gw-ex={key} onClick={onClick} disabled={busy}
      className={`gw-ex flex-1 min-w-0 px-1 rounded-pill font-bold border truncate disabled:opacity-50 ${on
        ? (tone === 'rose' ? 'bg-rose-800 border-rose-500 text-white' : tone === 'sky' ? 'bg-sky-700 border-sky-500 text-white' : tone === 'fuchsia' ? 'bg-fuchsia-800 border-fuchsia-500 text-white' : 'bg-amber-700 border-amber-500 text-white')
        : (tone === 'rose' ? 'bg-ink-800 border-line text-rose-300 hover:bg-rose-900' : tone === 'sky' ? 'bg-ink-800 border-line text-sky-300 hover:bg-sky-900' : tone === 'skyhint' ? 'bg-sky-950 border-sky-500 text-sky-200 hover:bg-sky-900' : tone === 'fuchsia' ? 'bg-ink-800 border-line text-fuchsia-300 hover:bg-fuchsia-900' : 'bg-ink-800 border-line text-amber-300 hover:bg-amber-900')}`}>
      {text}
    </button>
  );
  //  다음 예정 줄을 누르면 그 컨이 든 카드를 맨 앞으로(2.75 해제·4.08-02 한 대씩과 같은 resumeCns — 순서 규칙은 안 건드리고 그 카드만 끌어올린다). 확인은 카드의 큰 단추로 한다(줄 한 번에 완료되지 않게).
  //  잘못 눌러 카드가 바뀐 줄 모르고 확인하는 일이 없게, 올린 카드에는 «다음 예정에서 올린 카드 — [원래 순서로]» 띠가 붙는다(pulled).
  const bringFront = (q) => { if (!q || !q.main) return; const arr = [q.main.cn]; setResumeCns(arr); setPulled(arr); closeFix(); setHoldOpen(false); setSingleMode(false); };
  const pulledOn = !!(card && pulled && resumeCns === pulled && (card.main.cn === pulled[0] || card.twin?.cn === pulled[0]));
  //  되묻기(«⏸ 보류했던 컨테이너입니다 — 이제 됩니까?») 카드가 맨 앞이면 줄로 올리지 못한다(되묻기가 먼저) — 줄을 잠그고 까닭을 적는다(감사·2차 시뮬 중-1 — 눌러도 아무 일이 없었다).
  const dueOnCard = !!(holdDue && card && holdGroupOf(holdDue).some((x) => { const u = String(x).toUpperCase(); return String(card.main.cn).toUpperCase() === u || (card.twin && String(card.twin.cn).toUpperCase() === u); }));

  return (
    <div className="space-y-2">
      {!compact && <SettingsBar hideOrder/>}
      <div ref={gwHeadRef} style={{ scrollMarginTop: 'calc(var(--hdr-h, 52px) + var(--dock-h, 68px) + 12px)' }} className="flex items-center justify-between bg-ink-900 border border-line rounded-pill px-2 py-1.5">
        <button onClick={() => setSelectedGroup(null)} className="flex items-center gap-1 text-xs text-dim-300 hover:text-violet-300">
          <ChevronLeft className="w-4 h-4"/>베이 선택
        </button>
        {/* 4.26 — 머리는 «남은 수» 로만 말한다(설계 §4 — «B22 31/63» 처럼 묶음 전체 완료/합계를 섞은 숫자는 데크만 하는 중에 헷갈렸다). 남은 = 이 묶음·이 단(보류 포함) — 수석에게 보내는 활동 위치 «남은 N개» 와 같은 수. */}
        <div className="text-sm font-bold text-violet-300" data-gw-head="1">
          B{groupLbl(selectedGroup, groups.find((x) => x.center === selectedGroup))} {selectedTier === 'deck' ? '데크' : selectedTier === 'hold' ? '홀드' : ''} — 남은 {tierRemainConts.length}대
        </div>
        <button onClick={() => setVoiceOn(v => !v)} className="text-dim-300 hover:text-violet-300">
          {voiceOn ? <Volume2 className="w-4 h-4"/> : <VolumeX className="w-4 h-4"/>}
        </button>
      </div>
      <div className="h-1.5 bg-ink-800 rounded overflow-hidden">
        <div className="h-full bg-violet-600 transition-all" style={{ width: `${groupTotal ? (groupDone / groupTotal) * 100 : 0}%` }}/>
      </div>

      {/* ★ 4.26 — 장 칩 한 줄(설계 §1 «내 장 고르기»). 다른 장은 한 번 눌러 그 장으로(단 고르기로 간다 — «다른 갱» 물음도 종전 pickGroup 그대로), 지금 장은 누르면 단(데크⇄홀드)을 다시 고른다. 베이뷰 위 칸(compact)은 접는다. */}
      {!compact && groups.length > 0 && (
        <div ref={gwChipsRef} className="flex gap-1.5 overflow-x-auto pb-0.5" data-gw-groups="1">
          {groups.map((g) => {
            const cur = g.center === selectedGroup;
            return (
              <button key={g.center} data-gw-group={g.center} data-gw-cur={cur ? '1' : undefined} disabled={busy}
                onClick={() => { if (cur) { closeFix(); setSelectedTier(null); } else pickGroup(g); }}
                className={`gw-ex shrink-0 px-3 rounded-pill border font-bold whitespace-nowrap disabled:opacity-50 ${cur ? 'bg-violet-800 border-violet-500 text-white' : 'bg-ink-800 border-line text-dim-200 hover:bg-ink-750'}`}>
                B{groupLbl(g.center, g)}{' '}
                <span className={cur ? 'font-normal text-violet-100' : 'font-normal text-dim-400'}>{cur ? `${selectedTier === 'deck' ? '데크' : selectedTier === 'hold' ? '홀드' : ''} ⇄` : g.count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ★ 4.09 — 양하 순서 한 줄(폰 베이뷰 포함). 누르면 «양하 순서» 창이 열린다. */}
      {mode === 'discharge' && (
        <button onClick={() => setOrderOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 bg-ink-900 border border-line rounded-pill px-2 py-1.5 text-left hover:bg-ink-850">
          <span className="min-w-0 truncate text-2xs text-dim-300">순서 <span className={`font-bold ${(wo.prefs.length || rowFrom === 'sea') ? 'text-orange-300' : 'text-teal-300'}`}>{workOrderText(wo)}</span></span>
          <span className="shrink-0 text-xxs text-dim-400">{orderOpen ? '닫기' : '바꾸기 ⚙'}</span>
        </button>
      )}
      {mode === 'discharge' && orderOpen && orderSheet()}

      {/* ★ 2.75 — ⏸ 보류 줄. 검수사가 먼저 풀렸으면 되묻기를 기다릴 것 없이 여기서 [해제] 하면
          그 컨이 바로 앞 순서로 온다(검수사 확정 «해제 탭만 있으면 될듯»). */}
      {/* 4.26-02: «이 장» 보류가 머리 · 다른 장 보류는 흐린 줄로 따로(누르면 펼침) — 다른 장 [해제] 는 누가 건 것인지 묻는다. */}
      {held.length > 0 && (() => {
        const top = heldSplit.mine[0] || heldSplit.other[0];
        const onlyOther = !heldSplit.mine.length;
        const row = (h, other) => (
          <div key={h.cn} className={`flex items-center justify-between gap-2 rounded-pill px-3 py-2 ${other ? 'bg-ink-900/60' : 'bg-ink-900'}`} data-held-row={other ? 'other' : 'mine'}>
            <div className="min-w-0">
              <div className="mono text-sm text-dim-100 truncate">{h.cn}{h._pos ? <span className="text-xxs text-dim-400"> {h._pos}</span> : null}</div>
              <div className="text-xxs text-amber-300">{h.reason} · {Math.max(1, Math.round((Date.now() - (h.at || 0)) / 60000))}분째{h.equip ? ` · ${h.equip}` : ''}{h.by ? ` ${h.by}` : ''}</div>
            </div>
            {other ? (
              <button onClick={() => releaseOther(h)} disabled={busy}
                className="shrink-0 px-3 py-1.5 rounded-pill text-xs font-bold bg-ink-800 border border-line text-dim-200 hover:bg-ink-750 disabled:opacity-50">해제…</button>
            ) : (
              <button onClick={() => doRelease(h)} disabled={busy}
                className="shrink-0 px-3 py-1.5 rounded-pill text-xs font-bold bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white">해제</button>
            )}
          </div>
        );
        return (
          <div className={`${onlyOther ? 'bg-ink-900 border-line' : 'bg-amber-950 border-amber-700'} border rounded-xl`} data-held-strip="1">
            <button onClick={() => setHoldList(v => !v)} className="w-full flex items-center justify-between px-3 py-2">
              <span className={`text-sm font-bold ${onlyOther ? 'text-dim-300' : 'text-amber-200'}`}>
                {onlyOther ? `⏸ 다른 장 보류 ${heldSplit.other.length}대` : `⏸ 보류 ${heldSplit.mine.length}대`}
                {!onlyOther && heldSplit.other.length ? <span className="text-xxs font-normal text-dim-300"> · 다른 장 {heldSplit.other.length}대</span> : null}
              </span>
              <span className="text-xxs text-amber-300">
                {top.reason}{(onlyOther ? heldSplit.other.length : heldSplit.mine.length) > 1 ? ` 외 ${(onlyOther ? heldSplit.other.length : heldSplit.mine.length) - 1}` : ''} · {Math.max(1, Math.round((Date.now() - (top.at || 0)) / 60000))}분째
                {(Date.now() - (top.at || 0) > HOLD_LONG_MS) && <span className="text-rose-300"> · ⏱ 1시간 넘음</span>}
              </span>
            </button>
            {holdList && (
              <div className="px-2 pb-2 space-y-1">
                {heldSplit.mine.map((h) => row(h, false))}
                {heldSplit.other.length > 0 && <div className="text-2xs text-dim-400 px-1 pt-1">다른 장 — 누가 건 것인지 보고 푸십시오</div>}
                {heldSplit.other.map((h) => row(h, true))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ★ 3.77 — 양하 «베이 먼저»: 무게로 싱글이 된 트윈을 한쪽 베이부터 몰아 내리는 중. 누르면 트윈으로 복귀. */}
      {card && bayFirst != null && (
        <div className="flex flex-wrap items-center gap-1 bg-ink-900 border border-sky-700 rounded-pill px-2 py-1.5">
          <span className="text-2xs font-bold text-sky-300">{bayFirst}번 베이 먼저 중 — 남은 쌍은 한 대씩</span>
          <button onClick={() => { setBayFirst(null); singleBaysRef.current = []; }}
            className="px-2 py-1 rounded text-xxs font-bold border bg-ink-800 border-amber-700 text-amber-300 hover:bg-ink-750">
            트윈으로 복귀
          </button>
        </div>
      )}

      {/* V8.50: 갈림 — 지금 내릴 수 있는 컨에 부류 혼재 시 선택 버튼 (기사 흐름 따라가기) */}
      {card && (forkChips || streamPref) && (
        <div className="flex flex-wrap items-center gap-1 bg-ink-900 border border-line rounded-pill px-2 py-1.5">
          <span className={`text-2xs font-bold mr-0.5 ${streamPref ? 'text-violet-300' : 'text-dim-400'}`}>
            {streamPref ? `${PREF_LABEL[streamPref]} 우선 중` : '갈림'}
          </span>
          {(forkChips || []).map(([k, n]) => (
            <button key={k} onClick={() => setStreamPref(p => (p === k ? null : k))}
              className={`px-2 py-1 rounded text-xxs font-bold border ${streamPref === k
                ? 'bg-violet-700 border-violet-500 text-white'
                : 'bg-ink-800 border-line text-dim-200 hover:bg-ink-750'}`}>
              {PREF_LABEL[k]}부터 {n}
            </button>
          ))}
          {streamPref && (
            <button onClick={() => setStreamPref(null)}
              className="px-2 py-1 rounded text-xxs font-bold border bg-ink-800 border-amber-700 text-amber-300 hover:bg-ink-750">
              순서대로
            </button>
          )}
        </div>
      )}

      {/* 1.76-05: 종전 `deckDonePromptD && card` — 데크를 다 내린 **그 순간** 큐가 비어 card 가 null 이 되고
            아래 `!card` 분기(「이 베이 그룹 양하 완료!」)로 떨어져, 홀드가 남았는데도 오픈 배너에 도달할 수
            없었다. 실측 MAMP 631N — 34 데크를 09:16 에 끝내고 홀드는 11:10 에야 시작했다. */}
      {deckDonePromptD ? (
        <div className="bg-amber-950/50 border-2 border-amber-600 rounded-pill p-4 text-center space-y-3">
          <div className="font-bold text-amber-200">⚓ 이 베이 데크 양하 완료!</div>
          {coverInfo.list.length > 0 && coverInfo.doubt ? (
            /* 2.08-15: 배정목록 이적 확정 0 — 대수에서는 뺐지만 «커버 영역»은 알린다(검수사 지시). */
            <div className="text-xxs text-amber-100 bg-amber-950/50 border border-amber-700 rounded px-2 py-1.5 space-y-0.5">
              <div className="font-bold">🔍 커버 영역 확인 {coverInfo.list.length}대 — 배정목록 이적은 <b>확정 0모브</b>입니다</div>
              <div className="mono text-2xs text-amber-300">
                {[...new Set(coverInfo.list.map(c => `${parseInt(c.bay, 10)}-${c.row}-${c.tier}`))].slice(0, 8).join('  ')}
                {coverInfo.list.length > 8 ? ' …' : ''}
              </div>
              <div className="text-2xs text-amber-200/80">커버가 이 자리를 무는지 보십시오. 물면 치우고 <b>베이매트릭스에 그 베이 커버 경계</b>를 저장해 주십시오 — 다음 항차부터 앱이 맞춥니다.</div>
            </div>
          ) : coverInfo.list.length > 0 && coverInfo.approx ? (
            /* ★ 4.26-02 (모의 작업 MCAP 3호기 B34 — 시프팅 예측을 못 낸 배에서 «28대 — 치워야 열립니다» 라 했는데 실제 시프팅은 다른 베이 5대뿐이었다):
                 예측이 없으면 어느 장 위인지 모른다 — 단정하지 않고 «확인» 으로 말한다(붉은 경보 아님). 장마다 위 화물 수는 오픈 보고의 장수 확인 창이 보인다. */
            <div className="text-xxs text-amber-100 bg-amber-950/50 border border-amber-700 rounded px-2 py-1.5 space-y-0.5" data-cover-approx="1">
              <div className="font-bold">🔍 데크에 통과화물 {coverInfo.list.length}대 — 어느 장 위인지 앱이 모릅니다</div>
              <div className="mono text-2xs text-amber-300">
                {[...new Set(coverInfo.list.map(c => `${parseInt(c.bay, 10)}-${c.row}-${c.tier}`))].slice(0, 8).join('  ')}
                {coverInfo.list.length > 8 ? ' …' : ''}
              </div>
              <div className="text-2xs text-amber-200/80">여는 장 위에 있으면 치워야 열립니다(시프팅). 안 여는 장 위 화물은 그대로 둡니다.</div>
            </div>
          ) : coverInfo.list.length > 0 ? (
            <div className="text-xxs text-rose-200 bg-rose-950/50 border border-rose-800 rounded px-2 py-1.5 space-y-0.5">
              <div className="font-bold">⚠ 커버 위에 통과화물 {coverInfo.list.length}대 — 치워야 열립니다 (시프팅)</div>
              <div className="mono text-2xs text-rose-300">
                {[...new Set(coverInfo.list.map(c => `${parseInt(c.bay, 10)}-${c.row}-${c.tier}`))].slice(0, 8).join('  ')}
                {coverInfo.list.length > 8 ? ' …' : ''}
              </div>
            </div>
          ) : (
            <div className="text-xxs text-dim-300">홀드를 하려면 해치커버를 열어야 합니다. 다음 작업을 선택하세요.</div>
          )}
          <div className="flex gap-2">
            <button disabled={hatchBusy} onClick={async () => { if ((await sendHatchReport('open')) === false) return; setHatchOpenDone(true); markHatchDone(selectedGroup, 'open'); }}
              className="flex-1 py-3 rounded-pill bg-amber-700 hover:bg-amber-600 text-white font-bold text-sm">🔓 해치커버 오픈 → 홀드 진행</button>
            <button onClick={() => setSelectedGroup(null)}
              className="flex-1 py-3 rounded-pill bg-ink-800 hover:bg-ink-750 border border-line-strong text-dim-100 font-bold text-sm">다른 데크로 이동</button>
          </div>
        </div>
      ) : holdDonePrompt && card ? (
        <div className="bg-sky-950/50 border-2 border-sky-600 rounded-pill p-4 text-center space-y-3">
          <div className="font-bold text-sky-200">⚓ 이 베이 홀드 선적 완료!</div>
          <div className="text-xxs text-dim-300">데크를 하려면 해치커버를 닫아야 합니다. 다음 작업을 선택하세요.</div>
          <div className="flex gap-2">
            <button disabled={hatchBusy} onClick={async () => { if ((await sendHatchReport('close')) === false) return; setDeckPromptDone(true); markHatchDone(selectedGroup, 'close'); }}
              className="flex-1 py-3 rounded-pill bg-sky-700 hover:bg-sky-600 text-white font-bold text-sm">🔒 해치커버 클로즈 → 데크 계속</button>
            <button onClick={() => { setSelectedGroup(null); setDeckPromptDone(false); }}
              className="flex-1 py-3 rounded-pill bg-ink-800 hover:bg-ink-750 border border-line-strong text-dim-100 font-bold text-sm">다른 베이 홀드 이동</button>
          </div>
        </div>
      ) : !card ? (
        <div className={`${groupLeft.n === 0 ? 'bg-emerald-950/40 border-emerald-700' : 'bg-amber-950/30 border-amber-700'} border rounded-pill p-6 text-center`}>
          {groupLeft.n === 0 && <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2"/>}{/* 4.25-02: 남은 컨이 있으면 완료처럼 보이지 않게(초록·✓ 없음) */}
          {groupLeft.n === 0 ? (
            <div className="font-bold text-emerald-300">이 베이 그룹 {mode === 'discharge' ? '양하' : '선적'} 완료!</div>
          ) : (
            <div data-group-left="1">
              <div className="font-bold text-amber-300">{selectedTier === 'deck' ? '데크' : selectedTier === 'hold' ? '홀드' : '이 단'}에서 지금 할 컨이 없습니다</div>
              <div className="text-xxs text-dim-300 mt-1">이 베이 그룹에 남은 {groupLeft.n}대{groupLeft.held ? ` · 보류 ${groupLeft.held}대` : ''}{groupLeft.other ? ` · ${selectedTier ? '다른 단' : '큐 밖'} ${groupLeft.other}대` : ''}</div>
            </div>
          )}
          {!hatchAuto && mode === 'discharge' && holdWorkedD && !hatchCloseDone && !isHatchDoneSaved(selectedGroup, 'close') ? (   // 3.49: 따라가기면 자동 판정이 적는다 — 버튼까지 숨겨 이중 보고를 막는다(감사 지적)
            <div className="mt-3 space-y-2">
              <div className="text-xxs text-dim-300">홀드 작업이 끝났습니다. 해치커버를 닫을까요?</div>
              <div className="flex gap-2 justify-center">
                <button disabled={hatchBusy} onClick={async () => { if ((await sendHatchReport('close')) === false) return; setHatchCloseDone(true); markHatchDone(selectedGroup, 'close'); }}
                  className="flex-1 py-3 rounded-pill bg-sky-700 hover:bg-sky-600 text-white font-bold text-sm">🔒 해치커버 클로즈</button>
                <button onClick={() => setSelectedGroup(null)}
                  className="flex-1 py-3 rounded-pill bg-ink-800 hover:bg-ink-750 border border-line-strong text-dim-100 font-bold text-sm">다른 베이 홀드 이동</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setSelectedGroup(null)} className="mt-3 px-4 py-2 rounded bg-ink-800 hover:bg-ink-750 text-sm text-dim-100">다른 베이 선택</button>
          )}
        </div>
      ) : (
        <>
          <div className="text-xxs text-center text-dim-300">
            다음 예측 <span className="text-violet-300 font-bold">{groupDone + 1}번째</span>
            {card.single && <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-800 text-amber-100 font-bold">싱글모드 구간</span>}
          </div>
          {/* 4.26 — «다음 예정» 줄을 눌러 올린 카드면 띠를 붙인다(잘못 눌렀으면 [원래 순서로]). */}
          {pulledOn && (
            <div className="flex items-center justify-between gap-2 bg-violet-950/60 border border-violet-600 rounded-pill px-3 py-1.5" data-gw-pulled="1">
              <span className="text-xs font-bold text-violet-200">↑ 다음 예정에서 올린 카드입니다</span>
              <button onClick={() => { setResumeCns([]); setPulled(null); }} disabled={busy}
                className="shrink-0 px-2.5 py-1 rounded-pill border border-violet-500 bg-ink-800 text-xs font-bold text-violet-200 disabled:opacity-50">원래 순서로</button>
            </div>
          )}
          {renderCon(card.main, card.twin ? '앞' : '단독', 'amber')}
          {card.twin && (
            <>
              <div className="flex items-center gap-2 px-2">
                <div className="flex-1 border-t border-line"/>
                <div className="text-2xs text-dim-400 font-bold flex items-center gap-1"><Link2 className="w-3 h-3"/>트윈 짝꿍</div>
                <button onClick={swapTwinPos} disabled={busy}
                  className="text-2xs font-bold px-2 py-0.5 rounded bg-indigo-800 hover:bg-indigo-700 text-indigo-100 disabled:opacity-50 flex items-center gap-1">
                  ⇅ 앞뒤 맞교환
                </button>
                <div className="flex-1 border-t border-line"/>
              </div>
              {renderCon(card.twin, '뒤', 'cyan')}
            </>
          )}

          {sealDupWarn.length > 0 && (
            <div className="rounded-pill px-3 py-2 text-sm font-bold flex items-start gap-2 bg-rose-950/60 border border-rose-700 text-rose-200">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5"/>
              <div className="space-y-0.5 text-left">
                {sealDupWarn.map(d => (
                  <div key={d.cn}>
                    🔒 실번호 중복 — {d.lab ? `${d.lab} ` : ''}{(d.cn || '').slice(-4)} 의 실 <span className="mono">{d.seal}</span> 이(가)
                    {' '}<span className="mono">{d.partners.map(x => (x || '').slice(-4)).join('·')}</span> 와 같습니다. 양쪽 다 실물 확인.
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ★ 4.08-02 — 경보뿐이다. 55톤 초과는 «싱글 권유» 이고 들 수 있으면 트윈으로 한다(검수사 2026-10-07 «무게가 55톤을 초과하면 싱글 작업을 권유 하되 들수 있으면 트윈작업을 합니다»). */}
          {twinWtWarn && (twinWtWarn.over || twinWtWarn.imbal || twinWtWarn.heavy) && (
            <div className={`rounded-pill px-3 py-2 text-sm font-bold flex items-start gap-2 ${twinWtWarn.over ? 'bg-rose-950/60 border border-rose-700 text-rose-200' : 'bg-amber-950/60 border border-amber-700 text-amber-200'}`}>
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5"/>
              {twinWtWarn.over ? (
                <span>⚠️ 총중량(EDI) 합계 {formatWt(twinWtWarn.total)} (55톤 초과) — 싱글 작업을 권합니다. 들 수 있으면 트윈으로 하십시오.</span>
              ) : twinWtWarn.imbal ? (
                <span>⚠️ 총중량(EDI) 무게차 {formatWt(twinWtWarn.diff)} (한계 {formatWt(twinWtWarn.limit)} 초과) — 수평 주의, 트윈 주의</span>
              ) : (
                <span>⚠️ 총중량(EDI) 합계 {formatWt(twinWtWarn.total)} (50톤 넘음) — 한계 근처입니다. 확인하고 트윈 하십시오.</span>
              )}
            </div>
          )}

          {/* ★ 2.75 — **되묻기.** 검수사 확정: 콘은 «3-5개 다른거 작업하고 있으면 라싱인력이 온다».
              그래서 검수사가 목록을 열 것 없이 앱이 먼저 꺼낸다. 1시간 넘으면 매 카드마다 묻는다. */}
          {holdDue && (String(card.main.cn).toUpperCase() === String(holdDue.cn).toUpperCase()
            || (card.twin && String(card.twin.cn).toUpperCase() === String(holdDue.cn).toUpperCase())) && (
            <div className="bg-amber-950 border border-amber-600 rounded-xl p-2.5 space-y-2">
              <div className="text-sm font-bold text-amber-200">
                ⏸ 보류했던 컨테이너입니다 — {holdDue.reason}
                {(Date.now() - (holdDue.at || 0) > HOLD_LONG_MS) && <span className="text-rose-300"> · ⏱ 1시간 넘음</span>}
              </div>
              <div className="text-xxs text-amber-300">{Math.max(1, Math.round((Date.now() - (holdDue.at || 0)) / 60000))}분째 · 그동안 {Math.max(0, doneN - (holdDue.doneAt || 0))}대 했습니다. 이제 됩니까?</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => doRelease(holdDue)} disabled={busy}
                  className="py-2.5 rounded-pill font-bold text-sm bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white">예, 지금 합니다</button>
                <button onClick={() => doSnooze(holdDue)} disabled={busy}
                  className="py-2.5 rounded-pill font-bold text-sm bg-ink-800 hover:bg-ink-700 disabled:opacity-50 text-amber-300">아직 — 나중에 다시</button>
              </div>
            </div>
          )}

          {/* ★ 2.75 — 트윈을 한 대씩. ★ 4.08-02 — 55톤 초과여도 «트윈 한 번에» 는 잠그지 않는다(2.75 잠금을 풀었다 — 검수사 2026-10-07 «강제 싱글 전환은 안됩니다»). */}
          {/* ★ 3.71 — ATPR 위해행 엠티 선적: 컨번호를 부른 뒤 엠티실 뒷 세 자리를 듣는다(다른 배·다른 POD 는 그리지 않는다) */}
          <EsealVoiceBar voyage={voyage} voyageKey={voyageKey} inspector={inspector} card={card} mode={mode} voiceOn={voiceOn} />

          {card.twin && singleMode ? (
            <div className="bg-ink-900 border border-sky-700 rounded-xl p-2.5 space-y-2">
              <div className="text-xxs text-sky-300 font-bold">싱글 — 한 대씩. 온 쪽을 누르면 그 한 대만 확인되고 남은 한 대는 다음 카드입니다 (보통 캐빈에서 먼 쪽부터, 갱을 피해서 — 어느 쪽인지는 캐빈이 정합니다)</div>
              {[['main', card.main], ['twin', card.twin]].map(([k, c]) => (
                <button key={k} onClick={() => handleConfirmOne(k)} disabled={busy}
                  className="w-full py-3 rounded-pill font-bold text-sm bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white flex items-center justify-between px-4">
                  <span className="mono">{c.cn}</span>
                  <span className="text-xxs opacity-80">{mode === 'loading' && loadingSlotOf(c).kind === 'swapWarn' ? '자리 미정' : `${c.bay}-${c.row}-${c.tier}`}{c.wt ? ` · ${formatWt(c.wt)}` : ' · 무게 미상'}</span>
                  <span>{mode === 'loading' && loadingSlotOf(c).kind === 'swapWarn' ? '실린 칸 지정' : '이것부터'}</span>{/* 4.23-01 2차: 규격·풀엠티·항구가 다른 맞교환은 칸을 앱이 정하지 않는다 — 누르면 위치 지정(handleConfirmOne) */}
                </button>
              ))}
              {(
                <div className="grid grid-cols-2 gap-2">
                  {[card.main, card.twin].map((c) => (
                    <button key={c.cn} onClick={() => { setBayFirst(parseInt(c.bay, 10)); setSingleMode(false); }} disabled={busy}
                      className="py-2 rounded-pill text-xxs font-bold bg-sky-800 hover:bg-sky-700 disabled:opacity-50 text-white">
                      {parseInt(c.bay, 10)}번 베이 먼저 (남은 쌍 모두 한 대씩)
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setSingleMode(false)} className="w-full py-2 rounded-pill text-xxs bg-ink-800 text-dim-300">트윈으로 돌아가기</button>
            </div>
          ) : (
            warnOf(card) ? (
              <button onClick={handleConfirm} disabled={busy}
                className="gw-go w-full rounded-pill font-bold bg-orange-700 hover:bg-orange-600 disabled:opacity-50 text-white flex items-center justify-center gap-2">
                📍 실린 칸 지정 — {String(warnOf(card).cn).slice(-4)}
              </button>
            ) : (
            <button onClick={handleConfirm} disabled={busy}
              className="gw-go w-full rounded-pill font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center gap-2">
              {busy ? <Loader2 className="w-5 h-5 animate-spin"/> : <Check className="w-6 h-6"/>}
              {card.twin ? `트윈 한 번에 ${mode === 'discharge' ? '양하' : '선적'}확인` : `${mode === 'discharge' ? '양하' : '선적'}확인`}
            </button>
            )
          )}

          {/* ★ 4.26 예외 줄 — 단독: [다른 컨] (선적 [다른 칸]) [⏸ 보류] [★ XRAY] · 트윈: [앞만 다름] [뒤만 다름] [둘 다 다름] / [싱글로 한 대씩] [⏸ 보류] [★ XRAY].
                 XRAY 단추는 카드에 X-RAY 대상이 있을 때만(누르면 카드 안 그 컨의 XRAY 칸 — 카드 밖 컨은 막는 자리에서 4.25-02 needXray 가 연다).
                 선적 엠티 «자리 확인» 칸이 열려 있으면 그 칸이 «다른 컨» 이라 단추를 따로 두지 않는다. */}
          {card.twin ? (
            <div className="space-y-1.5" data-gw-exrow="twin">
              <div className="flex gap-1.5">
                {exBtn('front', '앞만 다름', () => openFix('front'), fixOpen && fixSide === 'front')}
                {exBtn('back', '뒤만 다름', () => openFix('back'), fixOpen && fixSide === 'back')}
                {exBtn('both', '둘 다 다름', () => openFix(null), fixOpen && fixSide == null)}
              </div>
              <div className="flex gap-1.5">
                {exBtn('single', '싱글로 한 대씩', () => { if (singleMode) { setSingleMode(false); return; } closeFix(); setHoldOpen(false); setSingleMode(true); }, singleMode, twinWtWarn?.over && !singleMode ? 'skyhint' : 'sky')}
                {exBtn('hold', '⏸ 보류', () => { if (holdOpen) { setHoldOpen(false); setHoldNote(''); return; } closeFix(); setSingleMode(false); setHoldOpen(true); }, holdOpen, 'rose')}
                {xrayTargets.length > 0 && exBtn('xray', '★ XRAY', openCardXray, xrayTargets.some((x) => x.cn === editXCn), 'fuchsia')}
              </div>
            </div>
          ) : (
            <div className="flex gap-1.5" data-gw-exrow="single">
              {!slotMode && exBtn('fix', '다른 컨', () => openFix(null), fixOpen)}
              {exBtn('hold', '⏸ 보류', () => { if (holdOpen) { setHoldOpen(false); setHoldNote(''); return; } closeFix(); setHoldOpen(true); }, holdOpen, 'rose')}
              {xrayTargets.length > 0 && exBtn('xray', '★ XRAY', openCardXray, xrayTargets.some((x) => x.cn === editXCn), 'fuchsia')}
            </div>
          )}
          {/* ★ 4.26 선적 — 이 컨을 계획과 다른 칸에 실었다(위치 지정 창 — 4.23-01 2차 «실린 칸 지정» 과 같은 창·같은 저장). 감사·2차 시뮬 중-3: «다른 컨» 과 한 글자 차이라 줄에서 빼 따로 둔다.
               엠티 «자리 확인» 중에는 숨긴다(그때 계획 컨은 참고일 뿐 — 실은 컨 번호를 자리 확인 칸에 넣는다). */}
          {mode === 'loading' && !card.twin && !slotMode && !warnOf(card) && (
            <button data-gw-ex="slot" onClick={() => { closeFix(); setHoldOpen(false); setPosFor(card.main); }} disabled={busy}
              className="gw-ex w-full rounded-pill font-bold border bg-ink-800 border-sky-800 text-sky-300 hover:bg-sky-900 disabled:opacity-50">
              📍 이 컨을 다른 칸에 실음 — {String(card.main.cn).slice(-4)}
            </button>
          )}

          {/* ★ 2.75 — ⏸ 양하 불가. 못 하는 한 대만 빼고 큐는 계속 돈다(멈추면 수동으로 가야 했다). 4.26: 여는 단추는 예외 줄의 [⏸ 보류]. */}
          {holdOpen && (
            <div className="bg-ink-900 border border-rose-800 rounded-xl p-2.5 space-y-2" data-gw-hold="1">
              <div className="text-xxs text-rose-300 font-bold">⏸ 지금 {mode === 'discharge' ? '양하' : '선적'} 불가 — 왜 못 합니까? (기록에 남습니다 — 완료로는 안 셉니다. 고르면 다음 컨테이너로)</div>
              {HOLD_REASONS.map((r) => (
                <button key={r} onClick={() => doHold(r)} disabled={busy}
                  className="w-full py-2.5 rounded-pill font-bold text-sm bg-ink-800 hover:bg-rose-800 disabled:opacity-50 text-dim-100">{r}</button>
              ))}
              <div className="flex gap-2">
                <input value={holdNote} onChange={e => setHoldNote(e.target.value)} placeholder="직접 적기"
                  className="flex-1 bg-ink-800 border border-line rounded px-2 py-2 text-sm text-dim-100"/>
                <button onClick={() => doHold(holdNote.trim())} disabled={busy || !holdNote.trim()}
                  className="px-3 rounded-pill text-sm font-bold bg-rose-800 disabled:opacity-40 text-white">보류</button>
              </div>
              <button onClick={() => { setHoldOpen(false); setHoldNote(''); }} className="w-full py-2 rounded-pill text-xxs bg-ink-800 text-dim-300">취소</button>
            </div>
          )}

          {/* ★ 4.25-02 — 카드 밖 컨(수정으로 고른 실제 컨)의 XRAY 입력칸. 카드 안 컨은 카드 안 칸이 열린다. */}
          {editXCn && editXCn !== card.main.cn && editXCn !== card.twin?.cn && (fixOpen || (slotMode && !card.twin)) && (
            <div className="bg-ink-900 border border-fuchsia-700 rounded-xl p-2.5 space-y-1.5" data-xray-out="1">
              <div className="text-xxs font-bold text-fuchsia-300">XRAY 실번호 — <span className="mono text-dim-100">{editXCn}</span></div>
              {xrayEditRow(allContainers.find(x => x.cn === editXCn && x._mode === mode) || { cn: editXCn })}
            </div>
          )}

          {/* ★ 2.80 «자리 확인» — 이 자리에 실제로 무엇을 실었는지 묻는다. 엠티 선적의 기본 경로.
              계획 컨은 «참고»로만 보이고, 다른 컨을 넣어도 «수정»이 아니라 정상 입력이다. */}
          {slotMode && !card.twin && (
            <div className="bg-ink-900 border border-sky-700 rounded-xl p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xxs text-sky-300 font-bold">이 자리에 실제로 실은 컨테이너</span>
                <span className="text-2xs text-dim-400">{card.pos}</span>
              </div>
              <div className="text-2xs text-dim-400">
                계획: <span className="mono text-dim-300">{card.main.cn}</span> — 이 컨이 아니어도 그냥 넣으세요
              </div>
              <input autoFocus value={fixQuery} onChange={e => setFixQuery(e.target.value)}
                placeholder="끝 4자리"
                inputMode="numeric" autoComplete="off"
                className="w-full bg-ink-800 border border-sky-800 rounded px-2 py-2.5 text-base mono text-dim-100 text-center tracking-widest"/>
              {fixMatches.length > 1 && (
                <div className="text-xxs text-rose-300 font-bold bg-rose-950/40 border border-rose-800 rounded px-2 py-1 text-center">
                  ⚠️ 끝자리 같은 컨 {fixMatches.length}대 — 위치 확인 후 선택
                </div>
              )}
              {fixMatches.map(c => {
                const sameSpec = String(c.fe || '') === String(card.main.fe || '')
                  && String(c.iso || '').slice(0, 2) === String(card.main.iso || '').slice(0, 2);
                return (
                  <button key={c.cn} onClick={() => handleFixPick(c)} disabled={busy}
                    className={`w-full flex justify-between items-center rounded px-2 py-2 text-xs ${sameSpec ? 'bg-emerald-950/50 border border-emerald-700 hover:bg-emerald-900' : 'bg-ink-800 border border-line hover:bg-amber-900'}`}>
                    <span className="mono font-bold text-dim-100">{c.cn}</span>
                    <span className="mono text-2xs text-dim-300">
                      {c._comp && <span className="mr-1 px-1 rounded bg-rose-800 text-rose-200 font-bold">⚠ 완료기록</span>}
                      {!sameSpec && <span className="mr-1 px-1 rounded bg-amber-800 text-amber-200 font-bold">규격 다름</span>}
                      {c.bay ? `${parseInt(c.bay, 10)}-${c.row}-${c.tier}` : '자리 없음'}
                    </span>
                  </button>
                );
              })}
              {fixQuery.length >= 3 && fixMatches.length === 0 && (
                <div className="text-xxs text-dim-400 text-center py-1">남은 작업분에 그 번호가 없습니다</div>
              )}
              <button onClick={() => { setSlotMode(false); setSlotUserSet(true); setFixQuery(''); }}
                className="w-full text-2xs text-dim-400 py-1">계획대로 확인하는 방식으로 돌아가기</button>
            </div>
          )}

          {/* 4.26: 여는 단추는 예외 줄 — 단독 [다른 컨] · 트윈 [앞만 다름]·[뒤만 다름]·[둘 다 다름]. 칸 안은 종전 그대로(트윈은 고른 쪽만 보인다). */}
          {(slotMode && !card.twin) || !fixOpen ? null : !card.twin ? (
            <div className="bg-ink-900 border border-amber-700 rounded-pill p-2 space-y-2">
              <div className="text-xxs text-amber-300 font-bold">실제 나온 컨테이너 번호 (끝 4자리 이상){mode === 'loading' && <span className="text-dim-400 font-normal"> · 이 자리({card.pos})로 배정되고 예측 컨은 자리를 비움</span>}</div>
              <input autoFocus value={fixQuery} onChange={e => setFixQuery(e.target.value)}
                placeholder="예: 1234 또는 SKLU1972626"
                inputMode="numeric" autoComplete="off"
                className="w-full bg-ink-800 border border-line rounded px-2 py-2 text-sm mono text-dim-100"/>
              {/* V7.99-8 (메모6): 4자리를 안 쳐도 이 단의 남은 리스트에서 바로 선택 — 끝4자리 오타 오양하 방지 */}
              {fixQuery.length < 3 && tierRemainConts.length > 0 && (
                <div className="space-y-1">
                  <div className="text-2xs text-dim-400">또는 이 {selectedTier === 'deck' ? '데크' : '홀드'} 남은 컨에서 선택 ({tierRemainConts.filter(c => c.cn !== card?.main?.cn).length}대)</div>
                  <div className="max-h-44 overflow-y-auto space-y-1">
                    {tierRemainConts.filter(c => c.cn !== card?.main?.cn && c.cn !== card?.twin?.cn).map(c => (
                      <button key={c.cn} onClick={() => handleFixPick(c)} disabled={busy}
                        className="w-full flex justify-between items-center bg-ink-800 hover:bg-amber-900 rounded px-2 py-1.5 text-xs">
                        <span className="mono font-bold text-dim-100">{c.cn}</span>
                        <span className="mono text-dim-300">{c.bay ? `${parseInt(c.bay, 10)}-${c.row}-${c.tier}` : '자리 없음'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {fixMatches.length > 1 && (
                <div className="text-xxs text-rose-300 font-bold bg-rose-950/40 border border-rose-800 rounded px-2 py-1 text-center">
                  ⚠️ 끝자리 같은 컨 {fixMatches.length}대 — 위치(Bay-Row-Tier) 확인 후 선택
                </div>
              )}
              {fixMatches.map(c => (
                <button key={c.cn} onClick={() => handleFixPick(c)} disabled={busy}
                  className="w-full flex justify-between items-center bg-ink-800 hover:bg-amber-900 rounded px-2 py-1.5 text-xs">
                  <span className="mono font-bold text-dim-100">{c.cn}</span>
                  <span className={`mono font-bold ${fixMatches.length > 1 ? 'text-rose-300' : 'text-dim-300'}`}>
                    {c._comp && <span className="mr-1 px-1 rounded bg-rose-800 text-rose-200 font-bold">⚠ 완료기록</span>}
                    {!inWorkTier(c) && <span className="mr-1 px-1 rounded bg-amber-800 text-amber-200 font-bold">⚠ 다른 베이</span>}
                    {c.bay ? `${parseInt(c.bay, 10)}-${c.row}-${c.tier}` : '자리 없음'}
                  </span>
                </button>
              ))}
              {fixQuery.length >= 3 && fixMatches.length === 0 && <div className="text-xxs text-dim-400 text-center">남은 작업분에 일치하는 컨이 없습니다.</div>}
              <button onClick={() => { setFixOpen(false); setFixQuery(''); }} className="w-full text-xxs text-dim-300 py-1">닫기</button>
            </div>
          ) : (
            <div className="bg-ink-900 border border-amber-700 rounded-pill p-2 space-y-2">
              <div className="text-xxs text-amber-300 font-bold" data-gw-fixhead={fixSide || 'both'}>
                {fixSide === 'front' ? '앞만 다름 — 앞 자리에 실제 온 컨을 고르세요 (뒤는 고른 뒤에 묻습니다)'
                  : fixSide === 'back' ? '뒤만 다름 — 뒤 자리에 실제 온 컨을 고르세요 (앞은 고른 뒤에 묻습니다)'
                  : '둘 다 다름 — 앞·뒤 자리에 실제 온 컨을 각각 고르세요 (한쪽만 고르면 다른 쪽을 묻습니다)'}
              </div>
              {/* 4.26: [앞만 다름]·[뒤만 다름] 이면 그쪽 칸만 보인다 — 고른 뒤의 물음·적용은 종전 handleTwinFixApply 그대로(✕ 로 닫으면 두 칸으로 편다). */}
              {[
                { k: 'front', label: `앞 (${card.pos})`, q: fixQuery, setQ: setFixQuery, pick: fixPickFront, setPick: setFixPickFront, matches: fixMatches },
                { k: 'back', label: `뒤 (${parseInt(card.twin.bay, 10)}-${card.twin.row}-${card.twin.tier})`, q: fixQuery2, setQ: setFixQuery2, pick: fixPickBack, setPick: setFixPickBack, matches: fixMatches2 },
              ].filter((s) => !fixSide || s.k === fixSide).map((s) => (
                <div key={s.label} className="border border-line rounded p-1.5 space-y-1">
                  <div className="text-2xs text-dim-300 font-bold">{s.label}</div>
                  {s.pick ? (
                    <div className="flex items-center justify-between bg-amber-950/50 border border-amber-700 rounded px-2 py-1.5">
                      <span className="mono text-sm font-bold text-amber-200">{s.pick.cn}</span>
                      <button onClick={() => s.setPick(null)} className="text-xxs text-dim-300 px-1.5">✕ 취소</button>
                    </div>
                  ) : (
                    <>
                      <input value={s.q} onChange={e => s.setQ(e.target.value)}
                        placeholder="실제 온 컨 끝 4자리 이상"
                        inputMode="numeric" autoComplete="off"
                        className="w-full bg-ink-800 border border-line rounded px-2 py-1.5 text-sm mono text-dim-100"/>
                      {s.matches.map(c => (
                        <button key={c.cn} onClick={() => { s.setPick(c); s.setQ(''); }} disabled={busy}
                          className="w-full flex justify-between items-center bg-ink-800 hover:bg-amber-900 rounded px-2 py-1.5 text-xs">
                          <span className="mono font-bold text-dim-100">{c.cn}</span>
                          <span className="mono text-dim-300">
                            {c._comp && <span className="mr-1 px-1 rounded bg-rose-800 text-rose-200 font-bold">⚠ 완료기록</span>}
                            {!inWorkTier(c) && <span className="mr-1 px-1 rounded bg-amber-800 text-amber-200 font-bold">⚠ 다른 베이</span>}
                            {c.bay ? `${parseInt(c.bay, 10)}-${c.row}-${c.tier}` : '자리 없음'}
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              ))}
              <button onClick={handleTwinFixApply} disabled={busy || (!fixPickFront && !fixPickBack)}
                className="w-full py-2.5 rounded-pill font-bold text-sm bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white flex items-center justify-center gap-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
                선택한 수정 적용{fixPickFront && fixPickBack ? ' (두 대 확인)' : ' (다른 쪽은 묻습니다)'}
              </button>
              <button onClick={closeFix} className="w-full text-xxs text-dim-300 py-1">닫기</button>
            </div>
          )}

          {/* 2.80: 껐다가 다시 켜는 길 — 없으면 검수사가 한 번 끄고 영영 못 돌아온다(2-0-D). 4.26: 예외 줄 아래 작은 줄로(수정 칸이 단추 바로 밑에 열리게). */}
          {mode === 'loading' && !slotMode && !card.twin && (
            <button onClick={() => { setSlotMode(true); setSlotUserSet(true); closeFix(); }}
              className="w-full py-2 rounded-pill font-bold text-xxs bg-ink-800 hover:bg-sky-900 text-sky-300">
              📍 자리 확인 방식으로 — 이 자리에 실은 번호만 넣기
            </button>
          )}

          {consecFix > 0 && (
            <div className="text-xxs text-amber-400 text-center flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3"/>연속 수정 {consecFix}회 — {AUTO_MANUAL_THRESHOLD}회면 순서를 묻습니다
            </div>
          )}

          {/* 다음 예정 미리보기 — 3.48: 베이뷰(compact)에서는 접는다(아래 칸 그림이 다음 자리를 보여 준다) */}
          {/* 4.26 — 줄 44px(크게 48) · 끝 4자리 굵게. 줄을 누르면 그 컨이 위 카드로 올라온다(bringFront — 확인은 카드의 큰 단추로, 줄 한 번에 완료되지 않게). */}
          {!compact && queue.length > 1 && (
            <div className="bg-ink-900 border border-line rounded-pill p-2" data-gw-next="1">
              <div className="text-xs text-dim-300 font-bold mb-1">다음 예정</div>
              {queue.slice(1, 5).map((q, i) => {
                const _np = mode === 'loading' && loadingSlotOf(q.main).kind === 'swapWarn' ? '자리 미정' : `${parseInt(q.main.bay, 10)}-${q.main.row}-${q.main.tier}`;   // 4.23-01 2차: 규격 다른 맞교환은 칸을 앱이 정하지 않는다(카드 머리와 같은 말)
                return (
                  <button key={q.main.cn} onClick={() => bringFront(q)} disabled={busy || dueOnCard}
                    data-gw-next-cn={q.main.cn} data-gw-next-twin={q.twin ? q.twin.cn : ''} data-gw-next-pos={_np}
                    className="gw-next w-full flex items-center gap-2 pl-1 pr-11 text-left border-b border-line last:border-0 hover:bg-ink-850 disabled:opacity-50">{/* 4.26 (2차 시뮬 하-C): 오른쪽 44px 는 화면 고정 TOP 단추 자리 — «먼저 ▲» 가 그 밑에 깔리지 않게 */}
                    <span className="text-xs text-dim-400 w-6 shrink-0">{groupDone + 2 + i}.</span>
                    <span className="mono text-sm text-dim-200 flex-1 min-w-0 truncate">{q.main.cn.slice(0, -4)}<b className="text-emerald-300">{q.main.cn.slice(-4)}</b>{q.twin ? ` +${q.twin.l4 || q.twin.cn.slice(-4)}` : ''}</span>
                    <span className="mono text-xs text-dim-300 shrink-0">{_np}{q.single ? ' 싱글' : ''}</span>
                    <span className="text-2xs font-bold text-violet-300 shrink-0">먼저 ▲</span>
                  </button>
                );
              })}
              <div className="text-3xs text-dim-500 mt-1">{dueOnCard ? '⏸ 보류했던 컨 물음(이제 됩니까?)이 떠 있는 동안은 줄이 잠깁니다 — [예, 지금 합니다] 를 누르거나 [⏸ 보류] 로 다시 빼면 누를 수 있습니다(1시간 넘은 콘 잠김은 [아직] 뒤에도 바로 다시 묻습니다).' : '이 컨이 먼저 오면 줄을 누르세요 — 위 카드로 올라옵니다(확인은 카드에서).'}</div>
            </div>
          )}
        </>
      )}

      {unassigned.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-700 rounded-pill p-2">
          <button onClick={() => setShowUnassigned(v => !v)} className="w-full flex items-center justify-center gap-1.5 text-xs2 font-bold text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5"/>자리 없음 {unassigned.length}대{unassignedTaken > 0 ? '·계획 자리 내줌' : ''} {showUnassigned ? '▲' : '▼'}
          </button>
          {showUnassigned && (
            <div className="mt-1.5 space-y-1">
              {unassigned.map(c => (
                <div key={c.cn} className="flex items-center gap-1.5">
                  <button onClick={() => onOpenContainer?.(c)}
                    className="flex-1 flex justify-between items-center bg-ink-900 rounded px-2 py-1.5 text-xs">
                    <span className="mono font-bold text-dim-100">{c.cn}</span>
                    <span className="text-2xs text-amber-400">조회</span>
                  </button>
                  {onPlaceUnassigned && (
                    <button onClick={() => onPlaceUnassigned(c)}
                      className="px-3 py-1.5 rounded bg-lime-800 hover:bg-lime-700 border border-lime-600 text-lime-100 text-xs font-black">🅿 배치</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <button onClick={onSwitchManual}
        className="w-full py-2.5 rounded-pill font-bold text-sm bg-ink-800 hover:bg-ink-750 text-dim-200 flex items-center justify-center gap-2 border border-line">
        <Hand className="w-4 h-4"/>수동 모드로 전환
      </button>

      {/* 1.53: 확인창은 앱 안에서 뜬다. 네이티브 confirm() 은 렌더러를 멈춰 앱을 굳혔다. */}
      <ConfirmModal {...confirmState} />
      {hatchCountEl}{/* 4.10: 해치 보고 직전 장수 확인 창 */}
      {/*  ★ 4.23-01 2차 — 규격·풀엠티·항구가 다른 맞교환 컨의 «실린 칸 지정». 큰 카드(BigResultCard)와 같은 위치 지정 창·같은 저장 함수다(새 경로 없음).
            앱이 짐작한 칸을 미리 고르지 않는다 — 그 칸이 있는 베이를 펴 둘 뿐이다(자리 칸을 비운 사본으로 연다). 배정 후 바로 선적확인은 켠 채로 연다. */}
      {posFor && (
        <PositionEditModal
          open={!!posFor}
          container={loadingSlotOf(posFor).kind === 'swapWarn' ? { ...posFor, bay: '', row: '', tier: '' } : posFor}   // 4.26(감사·2차 시뮬 상-1): 빈칸 사본은 «자리 미정»(4.23-01 2차) 때만 — 일반 카드 [다른 칸] 은 지금 자리 그대로(빈칸이면 같은 베이 이동도 «다른 베이» 강한 물음 · «자리 없음 →» 문구가 됐다)
          allContainers={allContainers}
          slotSource={allContainers}
          bayPairs={bayPairs}
          workBay={posFor.bay || null}
          defaultAlsoComplete
          shipCode={voyage?.info?.vsl || String(voyageKey || '').split('_')[0]}   /* 4.26-02: «자료에 없는 자리» 물음이 베이매트릭스를 본다 */
          onClose={() => setPosFor(null)}
          onSave={async (b, r, t, opts) => fbReassignContainerPosition(voyageKey, mode, posFor.cn, b, r, t, inspector, { actualWork: true, ...(opts || {}) })}
          onSavePartner={async (cn, b2, r2, t2, opts) => fbReassignContainerPosition(voyageKey, mode, cn, b2, r2, t2, inspector, { actualWork: true, ...(opts || {}) })}
          onCompleteBoth={async (cns) => {
            if (!canWorkNow()) { alert(workGateText('완료')); return; }
            for (const cn of cns) await fbCompleteContainer(voyageKey, mode, cn, inspector, 'normal', '', equip);
            noteWorked(posFor);
            setResumeCns([]); setSingleMode(false); setConsecFix(0); setFixOpen(false); setFixQuery('');
          }}
        />
      )}
    </div>
  );
}
