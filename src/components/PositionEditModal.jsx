// M3.87: 컨테이너 위치 변경 모달 (선적 모드 전용)
//   - bay/row/tier 직접 입력 + 충돌 검사 + 풀/엠티 차별 확인
//   - 빈 입력 = 미배정 (선적대상으로 분류)
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, AlertTriangle, MapPin } from 'lucide-react';
import { bayParityError, seqFullConfirmText, buildSlotUniverse, buildOccupancy } from '../utils.js';   // V9.27: 물리 불가 좌표 차단 · 1.54: 시퀀스 되묻기 문구(한 벌) · 1.55: 칸·점유는 utils 한 벌
import { gradeSwap, confirmTextOf, GRADE_STYLE, bayGroupCenter } from '../swapGrade.js';   // V9.53: 바꿔도 되는지 등급(판정 한 벌) · 1.48: 작업 구역 판정도 같은 벌
import { rowOrderRank } from '../cargoPlanCore.js';   // 1.48: 자리 격자를 종이 베이플랜과 같은 열 순서로
import ConfirmModal, { useConfirm } from './ConfirmModal.jsx';   // 1.53: 브라우저 confirm() 은 렌더러를 통째로 멈춘다

export default function PositionEditModal({
  open,
  container,
  allContainers = [],
  onClose,
  // TallyOne 1.54: 네 번째 인자 `opts` 가 늘었다 — 시퀀스 항차에서 검수사가 "그래도 넣는다"고
  //   답하면 `{ seqConfirmed:true }` 를 그대로 firebase 로 흘려보내야 한다. 안 넘기면 되물음이
  //   무한히 되풀이되고 **아무 일도 안 일어난다**(조용한 실패).
  onSave,  // async (newBay, newRow, newTier, opts) => { ok, displaced, displacedWasCompleted, displacedToStorage, needConfirm }
  // V8.70: 트윈은 도착지(배정 자리) 기준 — 짝꿍 베이에 같은 row·tier 자리가 플랜에 실재할 때만
  //   "트윈 지정" 토글이 나타나고, 뒤 컨은 검수사가 직접 입력·선택한다 (출발지 기준 자동 추측 폐지).
  bayPairs = null,           // { '21': '23', ... } — 짝꿍 베이 매핑
  onSavePartner = null,      // async (cn, bay, row, tier, opts) => { ok }   // 1.54: opts 추가(위와 같은 이유)
  onCompleteBoth = null,     // async (cns[]) => void — 배정 후 선적확인
  workBay = null,            // V7.94-20: 현재 작업 중인 베이 — 미배정 컨 재배정 시 자동 선택 (전체 베이 재선택 불필요)
  workTier = null,           // V7.94-24: 작업 중인 단 — 'hold' | 'deck'. 있으면 그 단의 빈자리만 표시 (홀드 작업 중엔 홀드 자리만)
  // TallyOne 1.48: 검수원이 이미 고른 **작업 구역**(베이 그룹 대표 번호). 있으면 그 그룹 베이의 자리만 보여준다.
  //   지적 2026-08-11 — *"21번 작업이면 21번 안해도 되는 작업을 했습니다."*
  //   19·20·21 홀드를 골라놓고도 모달이 B3~B25 열두 개를 매번 다시 물어, 한 쌍마다 두 번씩 헛클릭했다.
  //   ⚠ 게이트 먼저 — workGroup 이 없으면 종전대로 전체를 보여준다(회귀 없음).
  workGroup = null,
  // TallyOne 1.48: 트윈 화면에서 이미 고른 뒤(짝꿍) 컨. 「트윈 지정」을 켜면 그대로 물려받는다.
  //   종전엔 바깥에서 고른 값이 안 넘어와 모달에서 끝4자리를 **한 번 더** 입력해야 했다.
  defaultPartner = null,
  // TallyOne 1.49: **자리 격자의 진실원.** 완료분까지 든 항차 전체 컨 목록.
  //   종전엔 자리를 "지금 컨이 있는 곳"에서 역산해, 컨이 떠나면 **자리 자체가 사라졌다.**
  //   실측 2026-08-11(16번 홀드 8쌍): 진짜 빈 자리를 못 골라 5번을 직접 입력으로 쳐야 했고,
  //   짝꿍 자리가 비면 「트윈 지정」이 통째로 없어져 트윈 작업을 한 대씩 두 번 넣었다.
  //   ⚠ 없으면 종전대로 allContainers 를 쓴다(회귀 없음).
  slotSource = null,
  // TallyOne 1.55: **지금 작업 중인 칸.** 부르는 쪽(BigResultCard)이 카드의 컨이 있는 칸을 내려준다.
  //   검수사 확정 2026-08-12 — 액츄얼에서 하는 일은 **칸의 번호를 바꾸는 것**이다.
  //   그래서 「번호 수정」으로 실제 온 컨을 고르면 기본 칸은 그 컨의 계획 자리가 아니라 **이 칸**이어야 한다.
  //   ⚠ 없으면 종전대로 컨 자신의 자리로 연다(회귀 없음).
  defaultPos = null,
}) {
  const [bay, setBay] = useState('');
  const [row, setRow] = useState('');
  const [tier, setTier] = useState('');
  const [step, setStep] = useState('input');  // 'input' | 'confirm' | 'saving'
  const [confirmState, askConfirm] = useConfirm();   // 1.53
  const [errMsg, setErrMsg] = useState('');
  const [manualOpen, setManualOpen] = useState(false);   // 직접 입력 접기 (기본: 슬롯 선택)
  const [twinOn, setTwinOn] = useState(false);           // V8.70: 검수사가 켜는 "트윈 지정"
  const [partnerQuery, setPartnerQuery] = useState('');  // V8.70: 뒤(짝꿍) 컨 검색어
  const [partnerPick, setPartnerPick] = useState(null);  // V8.70: 뒤(짝꿍) 컨 선택
  // TallyOne 1.46: 기본을 **끔**으로 (검수사 지적 2026-08-11).
  //   원문 — *"여기서 변경을 누르면 **위치수정만 저장되고 트윈 모드 화면으로 가야 하는데**
  //   선적 처리가 됩니다."*
  //   위치 지정 단계에서 선적까지 찍히면 트윈 흐름이 깨진다 — 자리를 잡은 뒤 트윈 화면으로 돌아가
  //   앞·뒤 두 대를 **한 번에** 찍어야 한다. 필요하면 검수원이 이 자리에서 켜면 된다.
  const [alsoComplete, setAlsoComplete] = useState(false);// 배정 후 바로 선적확인 (기본 끔)

  useEffect(() => {
    if (open && container) {
      // TallyOne 1.55: 기본 칸은 **지금 작업 중인 칸**이다(defaultPos).
      //   종전엔 무조건 `container` 자신의 계획 자리로 열려, 번호 수정으로 실제 온 컨을 고르면
      //   엉뚱한 베이가 펼쳐졌다 — 쌍마다 헛클릭이 두 번씩 났다(실측 2026-08-12).
      //   ⚠ 그 칸의 주인이 이 컨 자신이면 종전과 같은 값이므로 바뀌는 것이 없다.
      const _bn = parseInt(defaultPos?.bay, 10);
      const dp = (defaultPos && Number.isFinite(_bn) && defaultPos.row && defaultPos.tier)
        ? { bay: String(_bn), row: String(defaultPos.row).padStart(2, '0'), tier: String(defaultPos.tier).padStart(2, '0') }
        : null;
      const ownerCn = dp ? (occupancy.get(`${dp.bay}/${dp.row}/${dp.tier}`) || {}).cn : null;
      const useDp = !!dp && ownerCn !== container.cn;
      setBay(useDp ? dp.bay : (container.bay || ''));
      setRow(useDp ? dp.row : (container.row || ''));
      setTier(useDp ? dp.tier : (container.tier || ''));
      setStep('input');
      setErrMsg('');
      setManualOpen(false);
      setTwinOn(false); setPartnerQuery(''); setPartnerPick(null);
      setAlsoComplete(false);   // 1.46: 열 때마다 끔 — 위치 저장과 선적확인을 분리
      setPickedSlotCn(null);
      // V7.94-20: 미배정 컨(위치 없음)인데 현재 작업 베이가 있으면 그 베이 자동 선택 — 전체 베이 재선택 단계 생략
      //   1.55: 작업 중인 칸을 받았으면 그 베이를 편다 — 베이를 다시 고르게 하지 않는다.
      const wb = useDp ? dp.bay
        : (container.bay ? null : (workBay != null ? String(parseInt(workBay, 10)) : null));
      setPickBay(wb);
    }
    // ⚠ 의존성은 [open, container] 그대로다. defaultPos·occupancy 는 부모가 다시 그릴 때마다
    //   새 객체로 오므로 여기에 넣으면 **검수원이 고르던 값이 매번 초기화된다.**
  }, [open, container]);

  // V7.94-11: 베이 먼저 선택 → 그 베이 자리만 표시 (전체 노출은 오선적 유발 — 사용자 지적)
  //   완료된 자리도 보여주되 선택 불가(비활성) — 베이 전체 그림 파악용
  const is20 = (c) => String(c?.tp || '').startsWith('20') || String(c?.iso || '')[0] === '2';
  const [pickBay, setPickBay] = useState(null);

  // ── TallyOne 1.55: **칸과 점유는 utils.js 한 벌로 낸다.** ────────────────
  //   종전 이 모달은 1.49판 자체 구현을 들고 있었고, 점유를 `c.bay` 만 보고 판정했다.
  //   화면 전체는 `effectivePos()`(실체 자리 우선)로 보는데 여기만 계획 자리로 봐서,
  //   같은 배에서 이 모달과 SearchPanel 의 칸 수가 어긋났다.
  //   → 칸 목록은 buildSlotUniverse, 점유는 buildOccupancy 로 통일한다(판정을 두 벌로 두지 않는다).
  //   ⚠ 격자의 배치·모양은 그대로다 — 바꾼 것은 데이터 출처뿐이다.
  //   반환 모양이 바뀌었다: 배열 → **베이별 객체** `{ '11': [{bay,row,tier}, ...] }`.
  const slotUniverse = useMemo(() => {
    if (!open || !container) return {};
    const src = (Array.isArray(slotSource) && slotSource.length) ? slotSource : allContainers;
    const targetIs20 = is20(container);
    // 상위(VoyagePage)가 실체 자리를 c.bay 로 승격시켜 놓은 목록이 온다 — 계획 좌표는 _bay_planned 에 있다.
    //   계획 좌표를 _edi_* 로 되살려 같이 넘긴다. 그래야 컨이 옮겨 가도 **계획 칸이 남는다**(SearchPanel 과 같은 벌).
    const planView = src.map(c => (c && c._bay_planned
      ? { ...c, _edi_bay: c._bay_planned, _edi_row: c._row_planned, _edi_tier: c._tier_planned }
      : c));
    /* ★ 2.89-03 (검수사 2026-08-30 «직접입력 말고 수동에서도 빈 좌표 선택이 되어야 합니다») —
         `_ptk !== false` 가 시프팅(_shift) 행의 칸을 우주에서 버려, 재선적 칸뿐인 베이(B38 데크)는
         «남은 자리가 없습니다 — 직접 입력을 사용하세요» 로 떨어졌다. 큐·목록과 같은 규칙으로 넓힌다
         (_ptk || _shift — 1.76-05 원칙 «입력 쪽에서만 넓힌다»). */
    return buildSlotUniverse([...src, ...planView],
      c => c._mode === container._mode && (c._ptk !== false || c._shift) && is20(c) === targetIs20);
  }, [open, container, slotSource, allContainers]);

  // 1.55: 지금 그 칸에 실제로 있는 컨 — 키는 `bay/row/tier`, 값은 `{ cn, done }`.
  //   같은 칸에 둘이 걸리면 완료된 쪽이 이긴다(실물이 이름표를 이긴다).
  const occupancy = useMemo(() => {
    if (!container) return new Map();
    const src = (Array.isArray(slotSource) && slotSource.length) ? slotSource : allContainers;
    return buildOccupancy(src.filter(c => c && c._mode === container._mode), c => !!c._comp);
  }, [container, slotSource, allContainers]);

  const allSlots = useMemo(() => {
    if (!open || !container) return [];
    // V7.94-24: 작업 단(workTier)이 지정되면 그 단(홀드 tier<80 / 데크 tier>=80)의 자리만 — 홀드 작업 중엔 홀드 빈자리만 보이게
    const tierMatch = (t) => {
      if (!workTier) return true;
      const ti = parseInt(t, 10);
      return workTier === 'hold' ? ti < 80 : ti >= 80;
    };
    // 1.48: 작업 구역 게이트 — 검수원이 고른 그룹(19·20·21 등)의 베이만. 판정은 bayGroupCenter 한 벌.
    const groupMatch = (b) => {
      if (workGroup == null) return true;
      const ctr = bayGroupCenter(b, bayPairs || {});
      return ctr != null && String(ctr) === String(parseInt(workGroup, 10));
    };
    // 1.55: 칸 상태는 **세 갈래**다 — SearchPanel 과 똑같은 잣대를 쓴다.
    //   done  — 그 칸에 완료된 컨이 실제로 있다(선택 불가, ✓)
    //   named — 완료는 아니고 **이름표만** 걸려 있다(계획 주인의 실물은 아직 창고에 있다). 선택 가능
    //   empty — 진짜 빈 칸. 선택 가능
    //   ⚠ 20/40 갈래는 이제 slotUniverse 를 만들 때 걸렀다(위 targetIs20 필터).
    const out = [];
    Object.keys(slotUniverse).forEach(b => {
      if (!groupMatch(b)) return;
      slotUniverse[b].forEach(sl => {
        if (!tierMatch(sl.tier)) return;
        const occ = occupancy.get(`${b}/${sl.row}/${sl.tier}`);
        const mine = !!(occ && occ.cn === container.cn);
        out.push({
          bay: b, row: sl.row, tier: sl.tier,
          cn: (occ && !mine) ? occ.cn : null,
          done: !!(occ && !mine && occ.done),
          named: !!(occ && !mine && !occ.done),
          self: mine,                       // 1.49: 지금 이 컨이 있는 자리 — 제자리에서 트윈만 걸 때 쓴다
        });
      });
    });
    return out.sort((a, b) => (parseInt(a.bay, 10) - parseInt(b.bay, 10)) ||
      (parseInt(a.tier, 10) - parseInt(b.tier, 10)) || (parseInt(a.row, 10) - parseInt(b.row, 10)));
  }, [open, container, slotUniverse, occupancy, workTier, workGroup, bayPairs]);
  const slotsByBay = useMemo(() => {
    const m = {};
    allSlots.forEach(s => { (m[s.bay] = m[s.bay] || []).push(s); });
    return m;
  }, [allSlots]);
  const remainingSlots = useMemo(() => allSlots.filter(s => !s.done), [allSlots]);

  // 1.48: 고를 베이가 하나뿐이면 묻지 않는다 — 베이 선택 단계를 통째로 건너뛴다.
  //   (16번 홀드처럼 그룹 안에서 홀드가 한 베이에만 있는 경우가 흔하다)
  //   ⚠ 열 때 한 번만 — 「← 베이 다시 선택」을 눌렀는데 곧바로 도로 들어가면 그 버튼이 죽는다.
  const autoPickedRef = useRef(false);
  useEffect(() => { if (!open) autoPickedRef.current = false; }, [open]);
  useEffect(() => {
    if (!open || pickBay || autoPickedRef.current) return;
    const bays = Object.keys(slotsByBay).filter(b => slotsByBay[b].some(s => !s.done));
    if (bays.length === 1) { autoPickedRef.current = true; setPickBay(bays[0]); }
  }, [open, slotsByBay, pickBay]);

  // 슬롯 탭: 위치 세팅 + 트윈이면 짝꿍 자리 자동 계산 → 바로 확인 단계
  const [pickedSlotCn, setPickedSlotCn] = useState(null);   // 선택 자리의 원래 계획 컨 (POD 구역 판정용)
  const pickSlot = (s) => {
    setBay(s.bay); setRow(s.row); setTier(s.tier);
    setPickedSlotCn(s.cn || null);
    // V8.70: 짝꿍 자동 배치 제거 — 트윈은 확인 단계에서 검수사가 "트윈 지정"으로만 켠다.
    setTwinOn(false); setPartnerQuery(''); setPartnerPick(null);
    setErrMsg('');
    setStep('confirm');
  };

  // V8.70: 도착지 기준 짝꿍 자리 — 배정 자리의 짝꿍 베이에 같은 row·tier 자리가 플랜에 실재하는지.
  //   실재하지 않으면(싱글 자리) 트윈 지정 자체가 불가 — 유령 자리 원천 차단.
  const pairSlot = useMemo(() => {
    if (!open || !container || !bay || !row || !tier || !bayPairs) return null;
    const pBay = bayPairs[String(parseInt(bay, 10))];
    if (!pBay) return null;
    const rowPad = String(row).padStart(2, '0');
    const tierPad = String(tier).padStart(2, '0');
    // 1.49: 컨이 실재하는지가 아니라 **자리가 실재하는지**로 판단한다.
    //   종전엔 짝꿍 자리 컨이 다른 데로 옮겨가면 트윈 지정이 화면에서 사라졌다(실측 2026-08-11).
    const pb = String(parseInt(pBay, 10));
    const exists = (slotUniverse[pb] || []).some(s => s.row === rowPad && s.tier === tierPad);
    if (!exists) return null;
    const occ = occupancy.get(`${pb}/${rowPad}/${tierPad}`);
    return { bay: pb, row: rowPad, tier: tierPad, slotCn: occ ? occ.cn : null, slotDone: !!(occ && occ.done) };
  }, [open, container, bay, row, tier, bayPairs, slotUniverse, occupancy]);

  // V8.70: 뒤(짝꿍) 컨 후보 — 선박 전체 미완료에서 검색, 다른 베이 계획분은 경고 배지.
  const partnerMatches = useMemo(() => {
    const q = partnerQuery.replace(/\s/g, '').toUpperCase();
    if (q.length < 3 || !container) return [];
    // V8.71: 완료 기록 컨도 후보 포함(뒤 정렬 + ⚠배지) — 오선적 기록 교정 경로.
    return allContainers.filter(x => x && x._mode === container._mode &&
      x.cn !== container.cn &&
      (x.cn.includes(q) || (x.l4 || x.cn.slice(-4)).includes(q)))
      .sort((a, b) => (!!a._comp) - (!!b._comp)).slice(0, 6);
  }, [partnerQuery, allContainers, container]);

  // TallyOne 1.53: 자리 주인은 같은 작업(양하/선적) 안에서만 찾는다.
  //   양하가 끝난 자리는 실물이 비어 있는데, 싱글 조회의 allContainers 는 두 모드를 한 배열에 담아
  //   (SearchPanel: ['discharge','loading'].forEach) 이미 내려간 양하 컨이 자리 주인으로 잡혔다.
  //   격자(occupancy)는 이미 _mode 게이트가 있어 빈 칸으로 그렸는데 판정만 달라 확인창이 떴다 — 잣대를 맞춘다.
  //   _mode 가 없는 배열(단일 모드로 이미 걸러 내려온 경로)은 그대로 통과시킨다.
  const sameMode = (x) => !x?._mode || !container?._mode || x._mode === container._mode;

  // 충돌 검사: 같은 자리에 있는 다른 컨
  const conflict = useMemo(() => {
    if (!bay || !row || !tier) return null;
    const bayInt = String(parseInt(bay, 10));
    const rowPad = String(row).padStart(2, '0');
    const tierPad = String(tier).padStart(2, '0');
    return allContainers.find(c => {
      if (!c || c.cn === container?.cn || !sameMode(c)) return false;
      const cBay = c.bay ? String(parseInt(c.bay, 10)) : '';
      return cBay === bayInt && c.row === rowPad && c.tier === tierPad;
    }) || null;
  }, [bay, row, tier, allContainers, container]);

  // V7.94-10: 경고 — ① 다른 베이에서 옮겨오는 컨 ② EDI 계획상 그 자리 목적지(POD) 구역 이탈
  const findByCn = (cn) => cn ? allContainers.find(x => x?.cn === cn && sameMode(x)) : null;
  const findAtPos = (b, r, t) => allContainers.find(x => x && x.cn !== container?.cn && x.bay && sameMode(x) &&
    String(parseInt(x.bay, 10)) === String(parseInt(b, 10)) && x.row === String(r).padStart(2, '0') && x.tier === String(t).padStart(2, '0'));
  const bayWarn = useMemo(() => {
    if ((!bay && !row && !tier) || !container?.bay || !bay) return false;
    return String(parseInt(container.bay, 10)) !== String(parseInt(bay, 10));
  }, [container, bay, row, tier]);
  const podWarn = useMemo(() => {
    if ((!bay && !row && !tier) || !container?.pod) return null;
    const slotCon = findByCn(pickedSlotCn) || (bay && row && tier ? findAtPos(bay, row, tier) : null) || conflict;
    if (slotCon?.pod && slotCon.pod !== container.pod) return { zonePod: slotCon.pod, myPod: container.pod };
    return null;
  }, [pickedSlotCn, bay, row, tier, conflict, container, allContainers]);
  const partnerPodWarn = useMemo(() => {
    if (!twinOn || !partnerPick?.pod || !pairSlot) return null;
    const slotCon = findAtPos(pairSlot.bay, pairSlot.row, pairSlot.tier);
    if (slotCon && slotCon.cn !== partnerPick.cn && slotCon.pod && slotCon.pod !== partnerPick.pod)
      return { zonePod: slotCon.pod, myPod: partnerPick.pod };
    return null;
  }, [twinOn, partnerPick, pairSlot, allContainers]);


  // V9.53: 이 자리에 있던 컨과 비교해 **얼마나 세게 물어볼지**. 판정은 swapGrade.js 한 벌.
  //   엠티+같은포트=통과 · 풀+같은베이=간단 · 다른베이/다른포트/특수컨=강한 확인.
  const swapG = useMemo(() => {
    if (!container || !bay || !row || !tier) return null;
    const slotCon = findByCn(pickedSlotCn) || findAtPos(bay, row, tier) || conflict;
    if (!slotCon || slotCon.cn === container.cn) return null;
    return gradeSwap(container, slotCon, bayPairs || {});
  }, [container, bay, row, tier, pickedSlotCn, conflict, allContainers, bayPairs]);

  if (!open || !container) return null;

  const isFull = container.fe === 'F';
  const isCompleted = !!container._comp;
  const isUnassign = !bay && !row && !tier;

  const validate = () => {
    if (isUnassign) return '';
    const bn = parseInt(bay, 10);
    if (!Number.isFinite(bn) || bn < 1 || bn > 999) return 'Bay는 1~999 숫자';
    if (!/^\d{1,2}$/.test(row)) return 'Row는 1~2자리 숫자';
    if (!/^\d{1,2}$/.test(tier)) return 'Tier는 1~2자리 숫자';
    return '';
  };

  const handleNext = () => {
    const err = validate();
    if (err) { setErrMsg(err); return; }
    setErrMsg('');
    setStep('confirm');
  };

  const handleConfirm = async () => {
    // V8.70: 트윈 지정을 켰으면 뒤 컨을 고르기 전엔 확정 불가.
    if (twinOn && !partnerPick) { setErrMsg('트윈 지정: 뒤(짝꿍) 컨테이너를 선택하세요'); return; }
    // V9.27: 물리 불가 좌표 원천 차단 — 40/45ft를 홀수 베이에 (경고 아닌 차단)
    const _pe = bayParityError(container, bay);
    if (_pe) { setErrMsg('⛔ ' + _pe.replace(/\n/g, ' ')); setStep('input'); return; }
    // V9.53: 강한 등급(다른 베이 풀 · 다른 포트 · 특수컨)이면 한 번 더 묻는다.
    // TallyOne 1.53: 브라우저 confirm() 은 렌더러를 통째로 멈춘다 — 검수원에게는 "앱이 굳은" 것으로 보인다.
    //   실측 2026-08-12: 이 자리에서 앱이 30분 멈췄다(대화상자가 떠 있었다). 앱 안 모달로 바꾼다.
    const slotCon = findByCn(pickedSlotCn) || findAtPos(bay, row, tier) || conflict;
    const t0 = confirmTextOf(swapG, container, slotCon);
    if (t0) {
      askConfirm({
        title: '자리를 바꿉니다',
        message: t0,
        confirmLabel: '바꾸기',
        danger: true,
        // 1.54: **await 하지 않는다.** doConfirm 이 시퀀스 되묻기 모달을 다시 열 수 있는데,
        //   useConfirm 은 onConfirm 을 await 한 뒤 finally 로 창을 닫는다 — 새 창까지 같이 닫힌다.
        onConfirm: () => { doConfirm(); },
        onCancel: () => setStep('input'),
      });
      return;
    }
    await doConfirm();
  };

  // TallyOne 1.54: **밀려난 컨이 어디로 갔는지 사실대로 말한다.** (검수사 확정 2026-08-12)
  //   원문 — *"계획된 자리가 다른 컨으로 선적이 되었다면 그걸로 끝입니다. 그냥 몸만 창고로 가면 됩니다."*
  //   종전 문구는 `swappedTo` 가 없으면 무조건 *"미배정으로 이동했습니다"* 였다. 1.54 부터
  //   예약분은 **계획을 그대로 둔 채 몸만 창고로** 가므로 그 말은 틀렸다 — 계획 자리는 그대로 있다.
  const _posTxt = (p) => (p && p.bay ? `${String(parseInt(p.bay, 10)).padStart(2, '0')}-${p.row}-${p.tier}` : '');
  const _planTxt = (r) => {
    const src = allContainers.find(x => x.cn === r.displaced) || {};
    const pb = src._bay_planned || src.bay || src.bay_orig || '';
    const pr = src._row_planned || src.row || src.row_orig || '';
    const pt = src._tier_planned || src.tier || src.tier_orig || '';
    return (pb && pr && pt) ? `${String(parseInt(pb, 10)).padStart(2, '0')}-${pr}-${pt}` : '';
  };
  const noticeOf = (r) => {
    if (!r || !r.displaced) return '';
    if (r.displacedToStorage) {
      const pl = _planTxt(r);
      // 2.94: 검수앱은 창고를 안 쓴다 — 밀려난 컨은 «계획 자리를 내주고 자리 미정»이다(2.93 과 한 문장).
      return `🏷 ${r.displaced}는 계획 자리${pl ? ` ${pl}` : ''} 를 내줬습니다 — 아직 안 실렸습니다.\n자리를 다시 정해 주세요.`;
    }
    if (r.displacedWasCompleted) {
      // V8.70: 밀려난 컨이 이미 선적확인된 컨이면 완료는 유지됨 — 검수사에게 알림만.
      const to = _posTxt(r.swappedTo) || '미배정';
      return `⚠ ${r.displaced}는 이미 선적확인된 컨입니다.\n완료는 유지한 채 자리만 ${to}(으)로 이동했습니다.\n오선적이었다면 그 번호로 검색해 취소·수정하세요.`;
    }
    if (r.displacedUnassigned) return `${r.displaced}는 자리를 잃고 미배정이 됐습니다 — 자리를 정해 주세요.`;
    return '';
  };

  // 뒤(짝꿍) 컨 배정 + 마무리. 1.54: 뒤 컨도 시퀀스 되묻기에 걸릴 수 있어 따로 뗐다
  //   (앞 컨은 이미 들어갔으므로 앞부터 다시 하면 안 된다).
  // 1.56: 트윈이 반만 저장되는 것을 막는다(독립 재검증 P1-4) — 뒤 컨이 실패·취소되면 앞 컨을 원자리로 되돌린다.
  //   되돌릴 원자리가 없으면(원래 미배정) 사실을 숨기지 않고 붉게 알린다.
  const _rollbackFront = async (origPos) => {
    try {
      if (origPos && origPos.bay && origPos.row && origPos.tier) {
        const rb = await onSave(origPos.bay, origPos.row, origPos.tier, { seqConfirmed: true });
        if (rb && rb.ok !== false) return '앞 컨은 원래 자리로 되돌렸습니다.';
      }
    } catch { /* 아래 경고 문구로 흡수 */ }
    return '⚠ 앞 컨은 이미 새 자리에 저장된 상태입니다 — 앞 컨 자리를 확인하세요.';
  };
  const finishPartner = async (opts = null, origPos = null) => {
    setStep('saving');
    try {
      // V8.70: 트윈 지정 — 검수사가 고른 뒤 컨을 짝꿍 자리(실재 검증됨)로 배정.
      if (twinOn && partnerPick && pairSlot && onSavePartner) {
        const r2 = await onSavePartner(partnerPick.cn, pairSlot.bay, pairSlot.row, pairSlot.tier, opts);
        if (r2 && r2.ok === false && r2.needConfirm === 'seqFull') {
          setStep('input');
          askConfirm({
            title: '뒤 컨 자리가 시퀀스 자리입니다',
            message: seqFullConfirmText(r2),
            confirmLabel: '그래도 넣는다',
            danger: true,
            onConfirm: () => { finishPartner({ ...(opts || {}), seqConfirmed: true }, origPos); },
            onCancel: async () => { const m = await _rollbackFront(origPos); setErrMsg(`뒤 컨 배정을 취소했습니다 — 트윈이 반만 저장되지 않게 멈췄습니다. ${m}`); setStep('input'); },
          });
          return;
        }
        if (r2 && r2.ok === false) {
          // 1.56: 종전엔 여기서 그냥 지나가 **완료까지 두 대가 찍혔다** — 뒤 배정 실패가 조용히 삼켜졌다.
          const m = await _rollbackFront(origPos);
          setErrMsg(`뒤 컨 자리 배정 실패 — 선적확인은 찍지 않았습니다. ${m}\n${r2?.error || ''}`);
          setStep('input');
          return;
        }
        const n2 = noticeOf(r2);
        if (n2) alert(n2);
      }
      if (alsoComplete && !isUnassign && !isCompleted && onCompleteBoth) {
        const cns = [container.cn];
        if (twinOn && partnerPick) cns.push(partnerPick.cn);
        await onCompleteBoth(cns);
      }
      onClose();
    } catch (e) {
      const m = await _rollbackFront(origPos);
      setErrMsg(`${e?.message || String(e)}\n${m}`);
      setStep('input');
    }
  };

  const doConfirm = async (opts = null) => {
    setStep('saving');
    try {
      const r = row ? String(row).padStart(2, '0') : '';
      const t = tier ? String(tier).padStart(2, '0') : '';
      // 1.56: 이 배 자료에 없는 자리 확인 — TBJU2326007 19-08-06 분실 실사고의 그 경로(직접 입력).
      const _bb = String(parseInt(bay, 10));
      const _exists = (slotUniverse[_bb] || []).some(s => s.row === r && s.tier === t);
      if (!isUnassign && bay && r && t && !_exists && !opts?.slotConfirmed) {
        setStep('input');
        askConfirm({
          title: '이 배 자료에 없는 자리입니다',
          message: `B${_bb} ${r}-${t} 는 이 배의 알려진 칸에 없습니다.\n(B${_bb}에 있는 열: ${[...new Set((slotUniverse[_bb] || []).map(s => s.row))].sort().join(' ') || '없음'})\n분실 사고가 났던 경로입니다 — 시프팅·특수 적재가 확실할 때만 계속하세요.`,
          confirmLabel: '특수 적재 — 그래도 저장',
          danger: true,
          onConfirm: () => { doConfirm({ ...(opts || {}), slotConfirmed: true }); },
          onCancel: () => setStep('input'),
        });
        return;
      }
      const result = await onSave(bay, r, t, opts);
      // 1.54: 시퀀스 항차 — firebase 가 **아무것도 쓰지 않고** 되물으라고 돌아섰다.
      //   안 받으면 조용한 실패다 — 시퀀스 항차에서 자리 지정이 통째로 먹통이 된다.
      //   ⛔ 네이티브 confirm() 을 쓰지 않는다(뜨는 순간 앱이 통째로 멈춘다 — 실측 30분 정지).
      if (result && result.ok === false && result.needConfirm === 'seqFull') {
        setStep('input');
        askConfirm({
          title: '시퀀스 자리입니다',
          message: seqFullConfirmText(result),
          confirmLabel: '그래도 넣는다',
          danger: true,
          onConfirm: () => { doConfirm({ ...(opts || {}), seqConfirmed: true }); },
          onCancel: () => setStep('input'),
        });
        return;
      }
      if (!result?.ok) { setErrMsg('저장 실패'); setStep('input'); return; }
      const n1 = noticeOf(result);
      if (n1) alert(n1);
    } catch (e) {
      setErrMsg(e?.message || String(e));
      setStep('input');
      return;
    }
    await finishPartner(opts, (container.bay
      ? { bay: String(parseInt(container.bay, 10)), row: container.row || '', tier: container.tier || '' }
      : null));
  };

  const oldPosLabel = container.bay
    ? `${String(parseInt(container.bay, 10)).padStart(2, '0')}-${container.row}-${container.tier}`
    : '미배정';
  const newPosLabel = isUnassign
    ? '미배정 (선적대상)'
    : `${String(parseInt(bay, 10) || 0).padStart(2, '0')}-${String(row).padStart(2,'0')}-${String(tier).padStart(2,'0')}`;

  const borderClr = step === 'confirm' && isFull ? 'border-rose-600' : 'border-amber-700';
  const headTxtClr = step === 'confirm' && isFull ? 'text-rose-300' : 'text-amber-300';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3" onClick={onClose}>
      <div className={`bg-ink-900 border-2 ${borderClr} rounded-btn max-w-md w-full max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-line">
          <div className="flex items-center gap-2">
            <MapPin className={`w-5 h-5 ${headTxtClr}`}/>
            <h2 className={`text-lg font-black ${headTxtClr}`}>위치 수정</h2>
          </div>
          <button onClick={onClose} className="text-dim-300 hover:text-dim-100"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-4 border-b border-line">
          <div className="text-2xl font-black mono text-amber-300">{container.l4 || container.cn?.slice(-4)}</div>
          <div className="text-base font-bold mono text-dim-100 mb-2">{container.cn}</div>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className={`px-2 py-1 rounded font-black ${isFull ? 'bg-rose-700 text-rose-50' : 'bg-ink-750 text-dim-200'}`}>
              {isFull ? '풀 (F)' : container.fe === 'E' ? '엠티 (E)' : '미정'}
            </span>
            {container.iso && <span className="bg-ink-800 text-dim-200 px-2 py-1 rounded mono">{container.iso}</span>}
            {isCompleted && <span className="bg-emerald-700 text-emerald-50 px-2 py-1 rounded font-black">✓ 선적 완료</span>}
          </div>
          <div className="mt-2 text-sm text-dim-300">
            현재 위치: <span className="text-amber-300 mono font-bold">{oldPosLabel}</span>
          </div>
        </div>

        {step === 'input' && (
          <div className="p-4 space-y-3">
            {/* V7.94-09: 남은 자리 선택 (기본) — 탭 한 번으로 배정 */}
            {remainingSlots.length > 0 && !pickBay && (
              <div className="space-y-2">
                <div className="text-xs text-amber-300 font-bold">
                  📍 선적할 베이를 먼저 선택하세요
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.keys(slotsByBay).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).map(b => {
                    const remain = slotsByBay[b].filter(s => !s.done).length;
                    return (
                      <button key={b} onClick={() => remain > 0 && setPickBay(b)} disabled={remain === 0}
                        className={`py-2.5 rounded-pill border font-black ${remain > 0 ? 'bg-ink-800 hover:bg-amber-800 border-line-strong hover:border-amber-500 text-dim-100' : 'bg-ink-900 border-line text-dim-500'}`}>
                        <div className="mono text-base">B{b}</div>
                        <div className="text-2xs font-bold text-dim-300">남은 {remain}자리</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {pickBay && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-amber-300 font-bold">📍 BAY {pickBay} — 자리 선택 — 왼쪽이 단, 가로가 열 (종이 베이플랜과 같은 배치)</div>
                  <button onClick={() => setPickBay(null)} className="text-xxs text-dim-300 px-2 py-1 border border-line rounded">← 베이 다시 선택</button>
                </div>
                <div className="max-h-56 overflow-y-auto pr-1 space-y-1">
                  {/* TallyOne 1.48: **종이 베이플랜과 같은 배치로 그린다.**
                      종전엔 6개씩 줄바꿈되는 나열이라 단이 줄 중간에서 끊겼다. 검수원은 손에 든 종이와
                      대조하며 누르는데 모양이 달라 자리를 눈으로 못 찾았다(실측 2026-08-11, 19·21 홀드 18쌍).
                      위가 높은 단, 왼쪽에 단 번호, 가로가 열(06 04 02 00 01 03 05 07).
                      열 순서 규약은 getRowPositions 한 벌을 비교자로 옮긴 rowOrderRank 를 쓴다.

                      칸 세 갈래는 그대로 (TallyOne 1.33, 검수사 지적 2026-08-09):
                        ✓회색 = 완료된 컨이 실제로 있다(입실) — 선택 불가          [done]
                        흐림  = 이름표만 걸렸다(실물은 창고) — 누를 수 있고 끝4자리를 보여준다  [named]
                        밝음  = 진짜 빈 칸                                          [empty]
                      1.55: 판정은 SearchPanel 과 같은 벌(buildOccupancy)로 낸다. */}
                  {(() => {
                    const list = slotsByBay[pickBay] || [];
                    const tiers = [...new Set(list.map(s => s.tier))].sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
                    const cell = (s) => s.self ? (
                      // 1.49: 지금 이 컨이 있는 자리 — 자리는 그대로 두고 트윈만 걸고 싶을 때 여기를 누른다.
                      <button key={`${s.bay}-${s.row}-${s.tier}`} onClick={() => pickSlot(s)}
                        title="지금 이 컨이 있는 자리 — 그대로 두고 트윈만 걸 수 있습니다"
                        className="px-2.5 py-2 rounded-pill bg-cyan-950 hover:bg-cyan-900 border-2 border-cyan-500 mono text-sm2 font-black text-cyan-200 flex flex-col items-center leading-tight">
                        <span>{s.row}</span>
                        <span className="text-3xs text-cyan-400">지금</span>
                      </button>
                    ) : s.done ? (
                      <span key={`${s.bay}-${s.row}-${s.tier}`}
                        className="px-2.5 py-2 rounded-pill bg-ink-900 border border-line mono text-sm font-bold text-dim-500 cursor-not-allowed">
                        ✓{s.row}
                      </span>
                    ) : s.named ? (
                      <button key={`${s.bay}-${s.row}-${s.tier}`} onClick={() => pickSlot(s)}
                        title={`${s.cn} 의 이름표가 걸린 칸입니다 — 실물은 아직 안 실렸습니다`}
                        className="px-2.5 py-2 rounded-pill bg-ink-900/70 hover:bg-amber-900 border border-line border-dashed hover:border-amber-500 mono text-sm2 font-bold text-dim-300 flex flex-col items-center leading-tight">
                        <span>{s.row}</span>
                        <span className="text-3xs text-dim-400">{String(s.cn).slice(-4)}</span>
                      </button>
                    ) : (
                      <button key={`${s.bay}-${s.row}-${s.tier}`} onClick={() => pickSlot(s)}
                        className="px-2.5 py-2 rounded-pill bg-ink-800 hover:bg-amber-800 border-2 border-amber-600 hover:border-amber-400 mono text-sm font-bold text-amber-100">
                        {s.row}
                      </button>
                    );
                    return tiers.map(t => (
                      <div key={t} className="flex items-start gap-1.5">
                        <span className="mono text-2xs font-black text-dim-400 w-5 shrink-0 pt-2.5">{t}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {list.filter(s => s.tier === t)
                               .sort((a, b) => rowOrderRank(a.row) - rowOrderRank(b.row))
                               .map(cell)}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
            <button onClick={() => setManualOpen(v => !v)}
              className="w-full py-1.5 text-xxs text-dim-300 hover:text-dim-100 border border-dashed border-line rounded">
              {manualOpen ? '▲ 직접 입력 닫기' : '▼ 직접 입력 / 미배정 처리'}
            </button>
            {manualOpen && (<>
            <div className="text-xs text-dim-300">새 위치 (Bay-Row-Tier). 모두 비우면 미배정 처리(선적대상).</div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-2xs text-dim-400 font-bold">BAY</label>
                <input type="text" inputMode="numeric" value={bay}
                  onChange={e => setBay(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
                  placeholder="14"
                  className="w-full px-3 py-3 bg-ink-800 border border-line rounded text-2xl font-black mono text-amber-200 text-center"/>
              </div>
              <div>
                <label className="text-2xs text-dim-400 font-bold">ROW</label>
                <input type="text" inputMode="numeric" value={row}
                  onChange={e => setRow(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                  placeholder="00"
                  className="w-full px-3 py-3 bg-ink-800 border border-line rounded text-2xl font-black mono text-amber-200 text-center"/>
              </div>
              <div>
                <label className="text-2xs text-dim-400 font-bold">TIER</label>
                <input type="text" inputMode="numeric" value={tier}
                  onChange={e => setTier(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                  placeholder="02"
                  className="w-full px-3 py-3 bg-ink-800 border border-line rounded text-2xl font-black mono text-amber-200 text-center"/>
              </div>
            </div>
            {conflict && (
              <div className="bg-orange-950/40 border-2 border-orange-700 rounded-pill p-3">
                <div className="text-orange-300 font-black text-sm flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4"/>이미 배정된 자리
                </div>
                <div className="mt-1 text-xs text-orange-200">
                  {/* 1.55: F/E 잣대는 이 파일 한 벌 — `fe === 'F'` 만 풀이다(firebase.js `isFullCn` 과 같다).
                      빈 값(`fe:''`)은 **풀이 아닐 뿐 엠티도 아니다** — 위 머리글(423행)처럼 '미정'이라 말한다.
                      종전엔 여기서만 빈 값을 '엠티'라 단정해, 같은 화면이 같은 컨을 다르게 불렀다. */}
                  <span className="mono font-black">{conflict.cn}</span> ({conflict.fe === 'F' ? '풀' : conflict.fe === 'E' ? '엠티' : '미정'})이 거기 있습니다.
                </div>
                {/* TallyOne 1.55: **사실대로 고친다.** 종전 문구 *"미배정 (선적대상으로 분류)"* 는 거짓이다 —
                    1.54 부터 밀려나는 컨은 미배정이 아니라 **창고**로 간다(`bay_actual='__STG__'`,
                    실측 2026-08-12 DWSU3001185). 계획 자리는 그대로 남는다.
                    검수사 개념 — *"애초부터 컨테이너는 창고에 있었습니다. 분명 이름만 빌려줬던 것입니다."*
                    자리를 뺏는 것이 아니라 **이름을 빌려주고 몸은 창고에 그대로** 있는 것이다. */}
                <div className="mt-1 text-2xs text-orange-300 leading-relaxed">
                  → 확인하면 그 컨은 <b>계획 자리를 내주고 「자리 미정」</b>이 됩니다 — 아직 안 실린 컨입니다.
                  <br/>(이미 선적확인된 컨이면 완료는 그대로 두고 자리만 옮깁니다.)
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={onClose}
                className="flex-1 py-3 bg-ink-800 hover:bg-ink-750 text-dim-200 font-bold rounded">
                취소
              </button>
              <button onClick={handleNext}
                className="flex-1 py-3 bg-amber-700 hover:bg-amber-600 text-amber-50 font-black rounded">
                다음 →
              </button>
            </div>
            </>)}
            {errMsg && <div className="text-red-400 text-sm font-bold">{errMsg}</div>}
            {remainingSlots.length === 0 && !manualOpen && (
              <div className="text-xs text-dim-400 text-center py-2">남은 자리가 없습니다 — 직접 입력을 사용하세요.</div>
            )}
          </div>
        )}

        {step === 'confirm' && (
          <div className="p-4 space-y-3">
            {isFull ? (
              <div className="bg-rose-950 border-4 border-rose-600 rounded-pill p-4 animate-pulse">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-6 h-6 text-rose-300"/>
                  <div className="text-rose-200 font-black text-lg">풀 컨테이너 위치 변경</div>
                </div>
                <div className="text-rose-100 text-sm">
                  풀 컨테이너입니다. 변경 시 화물 처리에 영향이 있을 수 있습니다.
                </div>
                <div className="text-rose-200 font-black mt-2">정말 변경하시겠습니까?</div>
              </div>
            ) : (
              <div className="bg-ink-800 border border-line rounded-pill p-3">
                <div className="text-dim-100 text-sm">
                  {isCompleted ? '이미 선적 완료된 컨테이너입니다. 위치를 변경하시겠습니까?' : '위치를 변경하시겠습니까?'}
                </div>
              </div>
            )}

            {/* V9.53: 등급 안내 — 엠티·같은포트는 초록(그냥 진행), 특수컨·다른베이는 빨강 */}
            {swapG && (
              <div className={`rounded-pill border-2 p-3 ${GRADE_STYLE[swapG.level].box}`}>
                <div className={`font-black text-sm ${GRADE_STYLE[swapG.level].text}`}>
                  {GRADE_STYLE[swapG.level].icon} {swapG.reason}
                </div>
                {swapG.level === 'strong' && (
                  <div className="mt-1 text-xxs text-rose-200/90">확정 전에 한 번 더 확인합니다.</div>
                )}
              </div>
            )}
            {bayWarn && swapG?.level !== 'ok' && (
              <div className="bg-amber-950/60 border-2 border-amber-600 rounded-pill p-3">
                <div className="text-amber-300 font-black text-sm flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4"/>다른 베이에서 오는 컨테이너
                </div>
                <div className="mt-1 text-xs text-amber-200">
                  계획 베이 <span className="mono font-black">{String(parseInt(container.bay, 10))}</span> → 선적 베이 <span className="mono font-black">{String(parseInt(bay, 10))}</span> — 베이를 건너 이동합니다. 맞는지 확인하세요.
                </div>
              </div>
            )}
            {podWarn && (
              <div className="bg-rose-950/70 border-2 border-rose-600 rounded-pill p-3 animate-pulse">
                <div className="text-rose-300 font-black text-sm flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4"/>목적지 구역 이탈!
                </div>
                <div className="mt-1 text-xs text-rose-200">
                  이 자리는 EDI 계획상 <span className="mono font-black">{podWarn.zonePod}</span> 구역인데,
                  이 컨테이너의 목적지는 <span className="mono font-black">{podWarn.myPod}</span>입니다.
                </div>
              </div>
            )}
            {partnerPodWarn && (
              <div className="bg-rose-950/70 border-2 border-rose-600 rounded-pill p-3">
                <div className="text-rose-300 font-black text-sm flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4"/>트윈 짝꿍 — 목적지 구역 이탈
                </div>
                <div className="mt-1 text-xs text-rose-200">
                  짝꿍 자리는 <span className="mono font-black">{partnerPodWarn.zonePod}</span> 구역, 짝꿍 컨 목적지는 <span className="mono font-black">{partnerPodWarn.myPod}</span>.
                </div>
              </div>
            )}
            <div className="bg-ink-950 border border-line rounded-pill p-3 space-y-2">
              <div className="text-xs text-dim-300">변경 내용</div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-dim-400 mono">{oldPosLabel}</span>
                <span className="text-amber-400 text-xl">→</span>
                <span className={`mono font-black text-lg ${isUnassign ? 'text-orange-300' : 'text-emerald-300'}`}>{newPosLabel}</span>
              </div>
              {/* V8.70: 트윈 지정 — 짝꿍 자리가 플랜에 실재할 때만 노출. 뒤 컨은 검수사가 직접 선택. */}
              {!isUnassign && !isCompleted && pairSlot && onSavePartner && (
                <div className="border-t border-line pt-2 space-y-1.5">
                  <button onClick={() => {
                      const next = !twinOn;
                      setTwinOn(next); setPartnerQuery(''); setErrMsg('');
                      // 1.48: 트윈 화면에서 이미 고른 뒤 컨이 있으면 그대로 물려받는다 — 두 번 입력하지 않는다.
                      const inherit = next && defaultPartner && defaultPartner.cn && defaultPartner.cn !== container?.cn
                        ? allContainers.find(x => x && x.cn === defaultPartner.cn && x._mode === container._mode) || defaultPartner
                        : null;
                      setPartnerPick(inherit);
                    }}
                    className={`w-full flex items-center gap-2 rounded-pill border px-2.5 py-2 text-xs font-bold ${twinOn ? 'bg-cyan-950 border-cyan-700 text-cyan-300' : 'bg-ink-900 border-line text-dim-400'}`}>
                    <span className={`w-3.5 h-3.5 rounded ${twinOn ? 'bg-cyan-400' : 'bg-ink-700'}`}/>
                    트윈 지정 — 뒤 컨을 짝꿍 자리 {pairSlot.bay}-{pairSlot.row}-{pairSlot.tier}에 함께 배정 — {twinOn ? '켬' : '끔'}
                  </button>
                  {twinOn && pairSlot.slotDone && (
                    <div className="text-xxs text-orange-300">⚠ 짝꿍 자리는 이미 선적확인된 자리입니다. 확정 시 그 컨 처리를 확인하세요.</div>
                  )}
                  {twinOn && (partnerPick ? (
                    <div className="flex items-center justify-between bg-cyan-950/50 border border-cyan-700 rounded px-2 py-2">
                      <div>
                        <div className="mono text-sm font-bold text-cyan-200">{partnerPick.cn}</div>
                        <div className="text-2xs mono text-dim-300">
                          계획 {partnerPick.bay ? `${parseInt(partnerPick.bay, 10)}-${partnerPick.row}-${partnerPick.tier}` : '미배정'} · {partnerPick.pod || '-'}
                          {partnerPick.bay && String(parseInt(partnerPick.bay, 10)) !== pairSlot.bay &&
                            <span className="ml-1 px-1 rounded bg-amber-800 text-amber-200 font-bold">⚠ 다른 베이</span>}
                        </div>
                      </div>
                      <button onClick={() => setPartnerPick(null)} className="text-xxs text-dim-300 px-1.5">✕</button>
                    </div>
                  ) : (
                    <>
                      <input autoFocus value={partnerQuery} onChange={e => setPartnerQuery(e.target.value)}
                        placeholder="뒤(짝꿍) 컨 끝 4자리 이상" inputMode="numeric" autoComplete="off"
                        className="w-full bg-ink-800 border border-line rounded px-2 py-2 text-sm mono text-dim-100"/>
                      {partnerMatches.map(x => (
                        <button key={x.cn} onClick={() => {
                            // 1.53: 네이티브 confirm 금지 — 앱이 멈춘다.
                            if (x._comp) {
                              askConfirm({
                                title: '이미 선적확인된 컨입니다',
                                message: `${x.cn?.slice(-4)}는 이미 선적확인으로 기록된 컨입니다.\n실물이 눈앞에 있다면 앞선 기록이 오선적일 수 있습니다. 계속할까요?`,
                                confirmLabel: '계속',
                                danger: true,
                                onConfirm: () => setPartnerPick(x),
                              });
                              return;
                            }
                            setPartnerPick(x);
                          }}
                          className="w-full flex justify-between items-center bg-ink-800 hover:bg-cyan-900 rounded px-2 py-1.5 text-xs">
                          <span className="mono font-bold text-dim-100">{x.cn}</span>
                          <span className="mono text-dim-300">
                            {x._comp && <span className="mr-1 px-1 rounded bg-rose-800 text-rose-200 font-bold">⚠ 완료기록</span>}
                            {x.bay ? `${parseInt(x.bay, 10)}-${x.row}-${x.tier}` : '미배정'} · {x.pod || '-'}
                          </span>
                        </button>
                      ))}
                      {partnerQuery.length >= 3 && partnerMatches.length === 0 &&
                        <div className="text-xxs text-dim-400 text-center">일치하는 컨이 없습니다.</div>}
                    </>
                  ))}
                </div>
              )}
              {!isUnassign && !isCompleted && onCompleteBoth && (
                <button onClick={() => setAlsoComplete(v => !v)}
                  className={`w-full flex items-center gap-2 rounded-pill border px-2.5 py-2 text-xs font-bold ${alsoComplete ? 'bg-emerald-950 border-emerald-700 text-emerald-300' : 'bg-ink-900 border-line text-dim-400'}`}>
                  <span className={`w-3.5 h-3.5 rounded ${alsoComplete ? 'bg-emerald-400' : 'bg-ink-700'}`}/>
                  배정 후 바로 선적확인 {twinOn && partnerPick ? '(트윈 둘 다)' : ''} — {alsoComplete ? '켬' : '끔'}
                </button>
              )}
              {conflict && (
                <div className="text-xxs text-orange-300 mt-2">
                  {/* 2.93: 확인창과 **같은 문장**을 쓴다. 종전엔 이 줄이 "실물은 창고에",
                      확인창이 "원래 자리로 옮겨집니다" 라 서로 달랐다(검수사 지적 2026-08-31). */}
                  ⚠ {conflict.cn} → 계획 자리를 내주고 「자리 미정」이 됩니다 (아직 안 실린 컨입니다)
                </div>
              )}
            </div>

            {errMsg && <div className="text-red-400 text-sm font-bold">{errMsg}</div>}

            <div className="flex gap-2 pt-2">
              <button onClick={() => setStep('input')}
                className="flex-1 py-3 bg-ink-800 hover:bg-ink-750 text-dim-200 font-bold rounded">
                ← 돌아가기
              </button>
              <button onClick={handleConfirm}
                className={`flex-1 py-3 font-black rounded ${
                  isFull ? 'bg-rose-700 hover:bg-rose-600 text-rose-50' : 'bg-emerald-700 hover:bg-emerald-600 text-emerald-50'
                }`}>
                {isFull ? '⚠ 변경 확정' : '변경 확정'}
              </button>
            </div>
          </div>
        )}

        {step === 'saving' && (
          <div className="p-8 text-center text-dim-300">
            <div className="animate-pulse text-lg">저장 중...</div>
          </div>
        )}
      </div>
      <ConfirmModal {...confirmState} />
    </div>
  );
}
