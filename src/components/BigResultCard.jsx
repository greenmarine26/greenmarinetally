// 결과 카드 (실번호 거대 + 직접 완료 + 리퍼 온도 Full만)
import React, { useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import { equipGateText, canWorkNow, workGateText } from '../workChoice.js';   // 3.51: 호기 없음 안내 + «조회만은 보기만» 게이트
import { Check, RotateCcw, Snowflake, AlertTriangle, AlertOctagon, MapPin } from 'lucide-react';
import { isoToLabel, fmtPos, isReeferContainer, reeferTempExempt, buildMovePath, describeMovePath, effectivePos, getEquipNumber, canCompleteContainer, loadingNoPosAsk, loadingSlotOf } from '../utils.js';
import { inspectionSealOf, formatWt, isoShown } from '../utils.js';   // ★ 4.27 한 화면 카드(look='work') — 자동 가이드 카드와 같은 실번호 값·무게·규격 글자   // 3.2-01: 통과분 문지기   // 1.50: 지나온 자리 · 1.55: 지금 작업 중인 칸
import { NUM_INPUT_PROPS } from '../inputUtils.js';
import { fbCompleteContainer, fbCancelComplete, fbReassignContainerPosition } from '../firebase.js';
import { speakDone, speak } from '../voice.js';
import { getBayPairs } from '../twin.js';
import ConfirmModal, { useConfirm } from './ConfirmModal.jsx';
import ChoiceModal, { useChoice } from './ChoiceModal.jsx';   // TallyOne 1.53: 취소는 뜻이 둘 — 갈래를 고르게 한다.
import PositionEditModal from './PositionEditModal.jsx';
import RestoreOrigButton from './RestoreOrigButton.jsx';   // V9.51: 원래 자리로 되돌리기
import { gradeSwap, confirmTextOf, GRADE_STYLE } from '../swapGrade.js';   // V9.53: 바꿔도 되는지 등급

//  ★ 4.27 — look='work': 한 화면 틀(WorkFrame)의 카드. 자동 가이드 카드와 같은 모양(번호 끝 4자리 크게 · 자리 상자 · 데크/홀드 · 출발→도착 · 칩 · 실)이고
//    확인·위치·누락 단추는 카드 밖 아래 칸에 있다 — 부르는 쪽(TwinSearch)이 ref 로 이 카드의 종전 함수(handleComplete·위치 수정 창·handleMissing)를 그대로 부른다.
//    검수사 2026-10-15 08:46 «수동은 카드 두장 전에 조회창 앞뒤 두개를 보여주고 2개다 컨번을 입력하면 카드 두장을 보여주고 자동과 같은 화면으로 전환».
const BigResultCard = forwardRef(function BigResultCard({ c, onOpen, onAfterComplete, voyageKey, inspector, label, labelColor = 'amber', allContainers = [], onReplace = null, look = '',
  // TallyOne 1.48: 검수원이 고른 작업 구역·단, 그리고 트윈 화면에서 이미 고른 짝꿍 컨.
  //   종전엔 이 셋을 PositionEditModal 로 안 내려서, 모달이 전체 베이를 다시 묻고 뒤 컨도 다시 물었다.
  workGroup = null, workTier = null, twinPartner = null,
  // TallyOne 1.49: 자리 격자의 진실원(완료분 포함 전체). 없으면 allContainers 로 폴백.
  slotSource = null,
  // TallyOne 1.49-01: **베이 짝 판정을 두 벌로 두지 않는다.**
  //   아래 자체 계산은 선박 베이사전(imo·vsl)을 못 읽어 23↔25 · 3↔5 · 11↔13 짝을 놓쳤다.
  //   그 결과 1.48 작업 구역 게이트가 23·25 홀드 자리를 통째로 걸러 「남은 자리가 없습니다」가 떴다
  //   (실측 2026-08-11, 24번 홀드 싱글 TBJU2403485). 부르는 쪽이 쓰는 그 벌을 그대로 받는다.
  bayPairsIn = null,
  // TallyOne 2.03: 항차 photos(데미지 사진 포함) — 있으면 이 컨의 데미지 기록·사진을 카드에 띄운다.
  voyagePhotos = null,
  // TallyOne 3.75: 트윈 앞 카드 — 위치 수정 모달이 트윈 지정을 처음부터 켜고, 뒤 컨 저장 결과를 트윈 화면에 알린다.
  autoTwin = false, onTwinSaved = null }, ref) {
  // V9.50: onReplace — '컨테이너 번호 수정(다른 컨이 옴)'으로 **실제 온 컨**을 그 자리에 배정하면
  //   이 카드가 그 컨으로 바뀌어야 한다. 종전엔 배정만 되고 카드는 계획 컨 그대로여서
  //   화면상 아무 일도 안 일어난 것처럼 보였다(사용자 지적 2026-08-03: 트윈 뒤 카드가 안 바뀜).
  const isDone = !!c._comp;
  const slOrig = c.sl_orig != null ? c.sl_orig : c.sl;
  const sealError = c.sl && slOrig && c.sl !== slOrig;
  const isReefer = isReeferContainer(c);
  const hasTmp = c.tmp != null && String(c.tmp).trim() !== '';
  // 리퍼 + 온도 있으면 무조건 표시 (Empty + 온도는 현장에 없음)
  // 온도 자체가 Full의 증거 - F/E 데이터가 잘못되어 있어도 온도 표시
  const showTmp = isReefer && hasTmp;

  // M3.74: confirm() → ConfirmModal
  const [confirmState, askConfirm] = useConfirm();
  const [choiceState, askChoice] = useChoice();
  // 2.03: 이 컨의 데미지 기록(예약 승격분 + 작업 중 보고분 전부) — photos 에서 컨번호로 골라낸다
  const [dmgView, setDmgView] = useState(null);
  const dmgList = useMemo(() => {
    if (!voyagePhotos || !c?.cn) return [];
    const C = String(c.cn).toUpperCase().replace(/\s/g, '');
    return Object.values(voyagePhotos)
      .filter((p) => p && (p.type === 'damage' || p.type === 'mailPhoto') && String(p.cn || '').toUpperCase().replace(/\s/g, '') === C)
      .sort((a, b) => (a.ts || 0) - (b.ts || 0));   // 2.05: 메일 사진(씰 위치·FR 고정)도 함께
  }, [voyagePhotos, c]);
  // 알림 전용(선택지 없음) — 문구·방식은 ContainerList·ContainerDetailModal 과 같은 벌을 쓴다.
  const notify = (title, message) => askConfirm({ title, message, confirmLabel: '확인', cancelLabel: '닫기', onConfirm: () => {} });
  const [posTarget, setPosTarget] = useState(null);   // V7.94-10: 위치 선택창 대상 컨 (c 또는 번호수정으로 고른 실제 컨)
  //  ★ 4.23-01 2차: 선적확인 한 번에 저장될 자리 한 벌(자동 가이드 카드·컨 상세·리스트와 같은 자리·같은 낱말). 규격 다른 맞교환이면 확인 대신 위치 지정(배정 후 바로 선적확인 켬).
  const ls = useMemo(() => (c && c._mode === 'loading' && !c._comp ? loadingSlotOf(c) : null), [c]);
  const [posAlso, setPosAlso] = useState(false);
  //  ★ 4.27 — 한 화면 틀의 📍 위치 틀림: 칸을 고르면 그 자리로 확인(자동 가이드와 같은 defaultAlsoComplete) · 앞만이면 트윈 지정을 처음부터 켜지 않는다.
  const [posDone, setPosDone] = useState(false);
  const [posNoTwin, setPosNoTwin] = useState(false);
  // V8.70: 출발지(계획 위치) 기준 트윈 짝꿍 자동 계산 제거 — 싱글 자리 배정에 유령 짝꿍이 붙어
  //   존재하지 않는 자리에 무단 배정·완료되던 원인. 트윈 배정은 PositionEditModal 안에서
  //   도착지(배정 자리) 기준 + 검수사의 "트윈 지정"으로만 이뤄진다.
  const posEditBayPairs = useMemo(() => {
    if (bayPairsIn && Object.keys(bayPairsIn).length) return bayPairsIn;   // 1.49-01: 부르는 쪽 판정 우선
    try { return getBayPairs(allContainers.filter(x => x._mode === c?._mode)); } catch { return null; }
  }, [allContainers, c, bayPairsIn]);

  // TallyOne 1.55: **지금 작업 중인 칸.** 검수사 확정 2026-08-12 —
  //   *"EDI가 실어라 한대로 실었습니다. 이게 액츄얼 작업입니다."*
  //   자리는 계획대로 전부 찬다. 바뀌는 것은 그 칸에 걸린 번호뿐이다.
  //   그래서 「번호 수정」으로 실제 온 컨을 고르면 기본 칸은 **그 컨의 계획 자리가 아니라 이 칸**이어야 한다.
  //   종전엔 모달이 고른 컨 자신의 계획 자리로 열려, 쌍마다 헛클릭이 두 번씩 났다(실측 2026-08-12).
  const cardPos = useMemo(() => effectivePos(c), [c]);

  // M3.87: 위치 수정 모달 (선적 모드)
  // V7.94-10: 컨테이너 번호 수정 — 다른 컨이 왔을 때: 실제 컨 검색·선택 → [위치 선택] → 남은 자리 창
  const [cnFixOpen, setCnFixOpen] = useState(false);
  const [cnFixQuery, setCnFixQuery] = useState('');
  const [cnFixPick, setCnFixPick] = useState(null);
  const cnFixMatches = useMemo(() => {
    const q = cnFixQuery.replace(/\s/g, '').toUpperCase();
    if (q.length < 3) return [];
    // V8.71: 완료 기록된 컨도 후보 포함(뒤 정렬 + ⚠배지) — 실물이 눈앞이면 그 완료는 오선적 기록일 확률이 높다.
    return allContainers.filter(x => x && x._mode === c._mode && x.cn !== c.cn &&
      (x.cn.includes(q) || (x.l4 || x.cn.slice(-4)).includes(q)))
      .sort((a, b) => (!!a._comp) - (!!b._comp)).slice(0, 6);
  }, [cnFixQuery, allContainers, c]);
  const isLoading = c._mode === 'loading';
  // V9.53: 실제 온 컨을 이 자리에 넣을 때 — 얼마나 세게 물어볼지. 판정은 swapGrade.js 한 벌.
  const swapG = useMemo(() => (cnFixPick ? gradeSwap(cnFixPick, c, posEditBayPairs || {}) : null),
                        [cnFixPick, c, posEditBayPairs]);

  const labelMap = {
    amber: 'bg-amber-700 text-amber-50',
    cyan: 'bg-cyan-700 text-cyan-50',
  };

  // V7.99-16: 누락 완료 — 신고 리스트엔 있으나 선박에 없는 컨. 'missing' flag로 완료 기록.
  const handleMissing = async (e) => {
    e.stopPropagation();
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    askConfirm({
      title: '누락 처리',
      message: `${c.cn}\n선박에 없는 컨테이너로 기록하고 완료합니다.\n(양하신고 점검에 '누락'으로 잡힙니다)`,
      confirmLabel: '누락 완료',
      cancelLabel: '취소',
      onConfirm: async () => {
        if (!canWorkNow()) { alert(workGateText('완료')); return; }   // 3.51: 조회만은 보기만
        await fbCompleteContainer(voyageKey, c._mode, c.cn, inspector, 'missing', '선박에 없음', getEquipNumber());
        speak(`${(c.cn || '').slice(-4)} 누락 처리`, { conversational: true });
        if (onAfterComplete) setTimeout(() => onAfterComplete(c), 500);
      },
    });
  };

  const handleComplete = async (e) => {
    e.stopPropagation();
    if (!inspector) { alert('검수원을 먼저 선택하세요'); return; }
    const isDischarge = c._mode === 'discharge';
    const verb = isDischarge ? '양하확인' : '선적확인';
    if (isDone) {
      // TallyOne 1.53: **취소에는 뜻이 둘인데 종전엔 하나만 물었다.**
      //   검수사 확정 2026-08-12 — *"트윈으로 두 대를 들었으면, 앞 컨 기록이 틀렸다고
      //   뒤 컨이 배에서 내려오지는 않는다. 실물은 실려 있다."*
      //   그런데 여기서는 무조건 미완료로 되돌려, **배에 실려 있는 컨이 마감에서 안 실린 것으로 세어졌다.**
      //   그리고 반환값에서 ok:false 를 버려 **실패해도 검수사는 취소된 줄 알았다.**
      //   갈래·문구는 ContainerDetailModal·ContainerList 와 같은 벌을 쓴다(잣대를 하나로).
      const pick = await askChoice({
        title: `${verb} 취소`,
        description: `${c.cn}\n왜 취소합니까? 실물이 배에 실렸는지에 따라 마감 숫자가 달라집니다.`,
        options: [
          { key: 'notLoaded', label: '잘못 눌렀다 (실물 안 실림)', desc: `${verb}을 지우고 계획 자리로 되돌립니다.`, recommended: true },
          { key: 'wrongSlot', label: '실렸는데 자리가 틀렸다', desc: '실물은 배에 있습니다. 완료는 그대로 두고 자리만 비웁니다.' },
        ],
      });
      if (!pick) return;
      if (!canWorkNow()) { alert(workGateText('완료 취소')); return; }   // 3.51: 조회만은 보기만 — 조용히 사라지지 않게 먼저 말한다
      const r = await fbCancelComplete(voyageKey, c._mode, c.cn, { reason: pick });
      if (!r || r.ok === false) {
        notify('취소하지 못했습니다', `${c.cn}\n신호를 확인하고 다시 눌러 주세요.\n${r?.error || ''}`);
      } else if (r.keptCompleted) {
        notify('자리만 비웠습니다', `${c.cn}\n${verb}은 그대로 둡니다(실물은 배에 있음).\n실제 자리를 지정해 주세요.`);
      } else if (r.origOccupied) {
        // V8.80: 취소 = 위치 원복. 원자리가 점유돼 있으면 미배정으로 두고 알린다.
        notify('자리를 비웠습니다', `원래 자리에 ${r.origOccupied}가 있어 자리를 비웠습니다.\n자리를 지정해 주세요.`);
      }
    } else {
      // V8.09-06: XRAY 대상은 XRAY 실번호(seal) 입력 전까지 양하확인 차단.
      if (isDischarge && c._xray && !String(c._xraySeal?.seal || '').trim()) {
        alert(`XRAY 실번호를 먼저 입력하세요.\n${c.cn?.slice(-4)}은 XRAY 대상으로 실번호 입력 전까지 양하확인할 수 없습니다.`);
        return;
      }
      // 1.56: 갱(호기) 없이 완료 금지 — 갱 없는 완료는 그 갱 인원의 인건비 근거가 없다(검수사 확정).
      //   가이드 화면만 갱을 강제하고 나머지 경로는 조용히 통과하던 것을 막는다(독립 재검증).
      if (!canWorkNow()) { alert(workGateText('완료')); return; }   // 3.51: 조회만은 보기만
      if (!getEquipNumber()) { alert(equipGateText()); return; }
      //  3.2-01: 통과분은 완료할 수 없다 — 카드가 어느 길로 왔든 여기서 한 번 더(감사 P1-2).
      if (!canCompleteContainer(c, c._mode)) { alert(`평택 ${isDischarge ? '양하' : '선적'} 대상이 아닙니다 (${isDischarge ? 'POD ' + (c.pod || '?') : 'POL ' + (c.pol || '?')}) — 통과화물은 ${verb}할 수 없습니다.`); return; }
      if (ls && ls.kind === 'swapWarn') { setPosAlso(true); setPosTarget(c); return; }   // 4.23-01 2차: 규격·풀엠티·항구가 다른 맞교환 — 앱이 자리를 정하지 않는다(실린 칸 지정)
      { const _np = loadingNoPosAsk(c, c._mode); if (_np && !window.confirm(_np)) return; }   // 3.58-05: 자리 없는 선적 완료
      await fbCompleteContainer(voyageKey, c._mode, c.cn, inspector, 'normal', '', getEquipNumber());
      speakDone(c);
      // 완료 후 자동 비우기 콜백
      if (onAfterComplete) {
        setTimeout(() => onAfterComplete(c), 500);
      }
    }
  };

  // ★ 4.27 — 두 모양(종전 큰 카드 · 한 화면 카드)이 같은 창·같은 물음을 쓰도록 한 벌로 꺼내 둔다.
  const dmgViewEl = (<>
      {dmgView && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-3 gap-2" onClick={(e) => { e.stopPropagation(); setDmgView(null); }}>
          {[dmgView.data, dmgView.detailPhoto].filter(Boolean).map((src, i) => (
            <img key={i} src={src} alt="" className="max-h-[42vh] max-w-full rounded-pill border border-line-strong" />
          ))}
          <div className="fixed-white text-xs2 font-bold text-center">
            {c.cn} — {(dmgView.damageParts || []).join(' & ')} {(dmgView.damageTypes || []).join(' & ')}{dmgView.dims ? ` (${dmgView.dims})` : ''}{dmgView.note ? ` · ${dmgView.note}` : ''}
            <br/>화면을 누르면 닫힙니다
          </div>
        </div>
      )}
  </>);
  const modalsEl = (<>
      <ConfirmModal {...confirmState} />
      <ChoiceModal {...choiceState} />
  </>);
  const posModalEl = (<>
      <PositionEditModal
        open={!!posTarget}
        container={posAlso ? { ...(posTarget || c), bay: '', row: '', tier: '' } : (posTarget || c)}   /* 4.23-01 2차: 규격 다른 맞교환 — 앱이 짐작한 칸을 미리 고르지 않는다 */
        allContainers={allContainers}
        onClose={() => { setPosTarget(null); setPosAlso(false); setPosDone(false); setPosNoTwin(false); }}
        defaultAlsoComplete={posAlso || posDone}   /* ★ 4.27 한 화면 틀 📍 위치 틀림 — 칸을 고르면 그 자리로 확인(자동 가이드와 같다) */
        shipCode={String(voyageKey || '').split('_')[0]}   /* 4.26-02: «자료에 없는 자리» 물음이 베이매트릭스를 본다 */
        workBay={posAlso ? (c.bay || null) : null}
        onSave={async (newBay, newRow, newTier, opts) => {
          if (!inspector) { alert('검수원을 먼저 선택하세요'); return { ok: false }; }
          // V8.71: 수동 위치 지정 — 밀려나는 컨은 미배정 (자동 재배정 금지, 사용자 확정)
          const _t = posTarget || c;
          // V9.52: 자리 교환 — 밀려난 계획 컨은 이 컨(_t)의 옛 계획 자리로 옮겨 대기시킨다.
          //   (종전 'unassign' → 미배정 떠돌이 발생. 지침 현장 규칙으로 복귀)
          // TallyOne 1.54: `actualWork` 는 **시퀀스 여부가 아니다** — 자연어 탭의 자동/수동 모드에서 온 값이다.
          //   시퀀스는 항차 속성(`info.seqFull`)이고 firebase 가 그것으로 판정한다(검수사 정정 2026-08-12).
          //   `opts` 는 모달이 되물어 받아온 `{ seqConfirmed:true }` — 그대로 흘려보낸다(안 넘기면 조용한 실패).
          const result = await fbReassignContainerPosition(voyageKey, c._mode, _t.cn, newBay, newRow, newTier, inspector, { actualWork: true, ...(opts || {}) });
          // V9.50: 다른 컨이 와서 그 자리에 배정했다면 카드를 그 컨으로 갈아 끼운다.
          //   (같은 컨의 단순 위치 이동이면 갈아 끼울 것이 없다)
          if (result && result.ok !== false && _t.cn !== c.cn && onReplace) {
            onReplace({ ..._t, bay: String(parseInt(newBay, 10)), row: newRow, tier: newTier });
          }
          return result;
        }}
        bayPairs={posEditBayPairs}
        workGroup={posAlso ? null : workGroup}   /* 4.23-01 2차: 규격 다른 맞교환의 실린 칸은 작업 묶음 밖일 수 있다 — 가이드의 [실린 칸 지정] 과 같이 베이를 안 가린다 */
        workTier={posAlso ? null : workTier}
        defaultPartner={posNoTwin ? null : twinPartner}
        autoTwin={autoTwin && !posNoTwin}   /* ★ 4.27: «앞만» 은 트윈 지정을 켜지 않는다 */
        onTwinSaved={onTwinSaved ? (info) => onTwinSaved({ ...info, frontCn: (posTarget || c).cn }) : null}
        /* 1.55: 기본 칸은 **지금 작업 중인 칸**(이 카드의 컨이 있는 칸)이다 — 고른 컨의 계획 자리가 아니다. */
        defaultPos={cardPos}
        slotSource={slotSource}
        onSavePartner={async (cn, b2, r2, t2, opts) => fbReassignContainerPosition(voyageKey, c._mode, cn, b2, r2, t2, inspector, { actualWork: true, ...(opts || {}) })}   /* V9.52: 자리 교환 · 1.54: 시퀀스 확인 통과 */
        onCompleteBoth={async (cns) => {
          //  3.2-01: 짝꿍이 통과분이면 둘 다 안 찍는다(감사 P1-2).
          const _src = slotSource || allContainers || [];
          const _bad = cns.map(cn => _src.find(x => x && x.cn === cn)).filter(o => o && !canCompleteContainer(o, c._mode));
          if (_bad.length) { alert(`평택 작업 대상이 아닙니다 — 통과화물 ${_bad.map(o => o.cn?.slice(-4)).join(', ')}은 확인할 수 없습니다.`); return; }
          if (!canWorkNow()) { alert(workGateText('완료')); return; }   // 3.51: 조회만은 보기만
          if (!getEquipNumber()) { alert(equipGateText()); return; }   // ★ 4.27 감사 하-4: 📍 위치 틀림으로 확인할 때도 호기 없이 완료 금지(카드 [확인] 과 같은 문지기)
          for (const cn of cns) await fbCompleteContainer(voyageKey, c._mode, cn, inspector, 'normal', '', getEquipNumber());
          // V8.70: 자동 선적확인에도 완료 음성·화면 정리 — 무음이라 "처리 안 된 줄" 오해하던 문제.
          cns.forEach((cn2, i) => setTimeout(() => speakDone({ cn: cn2 }), i * 900));
          if (onAfterComplete) setTimeout(() => onAfterComplete(c), 600);
        }}
      />
  </>);
  //  ★ 4.27 — 한 화면 틀(TwinSearch)이 카드 밖 아래 칸 단추로 이 카드의 종전 함수를 부른다(판정·저장·물음은 종전 그대로).
  const _noEvt = { stopPropagation() {} };
  useImperativeHandle(ref, () => ({
    complete: () => handleComplete(_noEvt),
    missing: () => handleMissing(_noEvt),
    //  위치 틀림은 칸을 고르면 곧 확인까지 간다 — 자리를 쓰기 전에 문지기(조회만·호기)를 먼저 본다(2차 시뮬 하-1: 창 안의 확인 단계에서 막으면 자리만 옮겨지고 완료는 안 찍힌 채 남는다).
    openPos: ({ twin = true } = {}) => {
      if (!canWorkNow()) { alert(workGateText('완료')); return; }
      if (!getEquipNumber()) { alert(equipGateText()); return; }
      setPosNoTwin(!twin); setPosDone(true); setPosTarget(c);
    },
    isDone,
  }));

  //  ★ 4.27 — 한 화면 카드(look='work'). 자동 가이드 카드(GuidedWorkPanel.renderCon)와 같은 모양·같은 값(실번호 inspectionSealOf · 규격 tp/isoToLabel · 무게 formatWt).
  //    단추는 카드 밖(아래 칸)에 있다. 카드를 누르면 종전처럼 컨 상세(XRAY 실번호 입력 포함)가 열린다.
  if (look === 'work') {
    const _warn = !!(ls && ls.kind === 'swapWarn');
    const _bn = parseInt(c.bay, 10);
    const _pos = _bn > 0 && c.row && c.tier ? `${_bn}-${c.row}-${c.tier}` : '';
    const _deck = parseInt(c.tier, 10) >= 80;
    const _empty = String(c.fe || '').toUpperCase() === 'E';
    const _seal = inspectionSealOf(c);
    const chip = 'gw-chip font-bold';
    const amber = labelColor !== 'cyan';
    return (
      <div data-twin-card={label || ''} data-twin-cn={c.cn}
        className={`rounded-pill border-2 p-2.5 ${isDone ? 'border-emerald-600 bg-emerald-950/30' : sealError ? 'border-red-600 bg-red-950/30' : amber ? 'border-amber-600 bg-amber-950/30' : 'border-cyan-600 bg-cyan-950/30'}`}>
        {dmgList.length > 0 && (
          <button onClick={() => setDmgView(dmgList[0])} className="mb-1 text-xxs font-black text-orange-300">📷 사진 {dmgList.length}건 — 누르면 크게</button>
        )}
        {dmgViewEl}
        {ls && ls.plan && (ls.kind === 'swap' || ls.kind === 'swapWarn') && (
          <div className={`text-2xs font-bold mb-1 ${ls.kind === 'swap' ? 'text-sky-300' : 'text-orange-300'}`}>
            {ls.kind === 'swap'
              ? `🔄 맞교환 자리 — 계획 칸(${ls.plan})${ls.byCn ? `에 ${String(ls.byCn).slice(-4)} 이(가) 실렸습니다` : '은 다른 컨이 차지했습니다'}`
              : `⚠ 계획 칸(${ls.plan})은 ${ls.byCn ? `${String(ls.byCn).slice(-4)} 이(가)` : '다른 컨이'} 차지했습니다 — 규격·풀엠티·항구가 달라 앱이 자리를 정하지 않습니다. 📍 위치 틀림으로 실린 칸을 지정하세요`}
          </div>
        )}
        <button onClick={onOpen} className="w-full text-left">
          {label && <span className={`mr-1 align-middle text-2xs font-black px-1.5 py-0.5 rounded ${labelMap[labelColor] || labelMap.amber}`}>{label}</span>}
          <span className="mono font-bold text-dim-100 gw-cn-a">{String(c.cn || '').slice(0, -4)}</span>
          <span className="mono font-black text-emerald-300 gw-cn-b">{String(c.cn || '').slice(-4)}</span>
          {isDone && <span className="ml-1.5 align-middle bg-emerald-700 text-emerald-100 text-2xs px-1.5 py-0.5 rounded font-black">✓완료</span>}
        </button>
        {(c.deckPos || _pos || _warn) && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
            {_warn ? <span className="text-orange-300 mono font-bold text-base">자리 미정</span>
              : <span className="mono font-black text-dim-100 bg-ink-800 border border-line-strong gw-pos">{c.deckPos || _pos}</span>}
            {!c.deckPos && _pos && <span className={`font-bold text-base ${_deck ? 'text-sky-300' : 'text-amber-300'}`}>{_deck ? '데크' : '홀드'}</span>}
            {(c.pol || c.pod) && <span className="mono font-bold text-teal-300 text-lg">{c.pol || '?'} → {c.pod || '?'}</span>}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1 mt-1.5 mono">
          <span className={`${chip} bg-ink-800 text-dim-100`}>{c.tp || isoToLabel(c.iso) || isoShown(c.iso)}</span>
          <span className={`${chip} bg-ink-800 ${_empty ? 'text-dim-300' : 'text-emerald-300'}`}>{_empty ? 'EMPTY' : 'FULL'}{c.wt ? ` ${formatWt(c.wt)}` : ''}</span>
          {c.op && <span className={`${chip} bg-ink-800 text-dim-200`}>{c.op}</span>}
          {c._xray && <span className={`${chip} bg-fuchsia-700 text-fuchsia-100`}>★ X-RAY</span>}
          {showTmp && <span className={`${chip} bg-sky-700 text-sky-100`}><Snowflake className="w-3 h-3 inline"/> 리퍼 {c.tmp}°C</span>}
          {!showTmp && isReefer && c.fe !== 'E' && !c.rfdry && !reeferTempExempt(c) && <span className={`${chip} bg-red-700 text-white`}>리퍼 온도 미입력</span>}
          {c.mkcon && <span className={`${chip} bg-ink-700 text-dim-100`}>제작컨</span>}
          {c.dg && <span className={`${chip} bg-red-700 text-red-100`}>DG{c.un ? ` UN${c.un}` : ''}</span>}
          {c.fr && <span className={`${chip} bg-orange-700 text-orange-100`}>FR</span>}
          {c.ot && <span className={`${chip} bg-yellow-700 text-yellow-100`}>O/T</span>}
          {c.tk && <span className={`${chip} bg-pink-700 text-pink-100`}>TK</span>}
          {c.lolo && <span className={`${chip} bg-lime-700 text-lime-50`}>🏗갠트리</span>}
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-line flex items-center gap-1.5" data-twin-seal={_seal || ''}>
          <span className="text-xxs text-dim-400 flex-shrink-0">{_seal && !String(c.sl || '').trim() ? '엠티실:' : '실:'}</span>
          <span className={`mono font-bold text-base ${sealError ? 'text-red-300' : _seal ? 'text-cyan-300' : _empty ? 'text-dim-300' : 'text-amber-400'}`}>{_seal || (_empty ? '엠티 · 실 없음' : '⚠ 미입력')}</span>
          {sealError && <span className="bg-red-700 text-red-50 text-3xs px-1.5 py-0.5 rounded font-black flex items-center gap-0.5"><AlertOctagon className="w-2.5 h-2.5"/>실오류 · 원 {slOrig}</span>}
        </div>
        {c._xray && (
          <div className="mt-1 text-xxs font-bold flex items-center gap-1.5" data-twin-xray={c._xraySeal?.seal || ''}>
            <span className="text-fuchsia-400">XRAY:</span>
            <span className={`mono text-sm ${c._xraySeal?.seal ? 'text-fuchsia-200' : 'text-amber-400'}`}>{c._xraySeal?.seal || '미입력 — 카드를 눌러 넣기'}{c._xraySeal?.eseal ? ` / E:${c._xraySeal.eseal}` : ''}</span>
          </div>
        )}
        {modalsEl}
        {posModalEl}
      </div>
    );
  }

  return (
    <div className={`bg-ink-900 border-2 rounded-btn p-3 ${
      sealError ? 'border-red-600 bg-red-950/30' :
      isDone ? 'border-emerald-600 bg-emerald-950/30' :
      c._xray ? 'border-purple-600 bg-purple-950/20' :
      'border-amber-600 bg-amber-950/10'
    }`}>
      {/* 2.03 (검수사 확정 «지정된 컨번호를 조회하면 사진을 띄울수 있나요?» — 예약분·작업 중 기록분 다):
          데미지 기록이 있으면 카드 맨 위에 주황 띠 + 썸네일. 탭하면 크게. */}
      {dmgList.length > 0 && (
        <div className="mb-2 bg-orange-950/50 border border-orange-700 rounded-pill p-2">
          <div className="text-xxs font-black text-orange-300 mb-1">📷 {dmgList.some((p) => p.type === 'damage') ? '데미지·' : ''}사진 {dmgList.length}건 — 탭하면 크게 (씰 위치·고정 상태·데미지)</div>
          <div className="flex gap-1.5 flex-wrap">
            {dmgList.map((p) => (
              <button key={p.ts} onClick={() => setDmgView(p)} className="text-left">
                {p.data ? <img src={p.data} alt="" className="w-14 h-14 object-cover rounded border border-orange-700" /> : <span className="text-2xs text-orange-200 underline">기록 보기</span>}
              </button>
            ))}
          </div>
          <div className="text-2xs text-orange-200/90 mt-1">
            {dmgList.map((p) => p.type === 'mailPhoto' ? (p.label || '메일 사진') : [(p.damageParts || []).join('&'), (p.damageTypes || []).join('&'), p.promotedFrom ? '(예약분)' : ''].filter(Boolean).join(' ')).join(' · ')}
          </div>
        </div>
      )}
      {dmgViewEl}
      <button onClick={onOpen} className="w-full text-left">
        {/* M3.86: 라벨/모드 배지만 한 줄에 (컨번호는 다음 줄에 크게) */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {label && <span className={`${labelMap[labelColor]} px-2 py-0.5 rounded text-2xs font-black`}>{label}</span>}
          <span className={`px-2 py-0.5 rounded text-2xs font-black ${
            c._mode === 'discharge' ? 'bg-blue-900 text-blue-200'
            : c._mode === 'loading' ? 'bg-amber-900 text-amber-200'
            : 'bg-ink-750 text-dim-200'
          }`}>
            {c._mode === 'discharge' ? '양하'
              : c._mode === 'loading' ? '선적'
              : '중계'}
          </span>
          {isDone && <span className="bg-emerald-700 text-emerald-100 text-2xs px-1.5 py-0.5 rounded font-black">✓완료</span>}
        </div>
        {/* M3.86: 컨번호 한 줄 별도, 크게 표시 (끝4 + 전체 컨번호) */}
        <div className="flex items-baseline gap-2 mb-3 px-1">
          <span className="text-3xl font-black text-amber-300 mono">{c.l4 || c.cn?.slice(-4)}</span>
          <span className="text-lg sm:text-xl font-bold mono text-dim-100 truncate flex-1">{c.cn}</span>
        </div>

        {/* 1순위: 실번호 거대 + 반짝임 */}
        <div className={`bg-ink-950 rounded-pill p-3 mb-2 border-2 ${sealError ? 'border-red-500' : c.sl ? 'border-amber-700/50' : 'border-line'}`}>
          <div className="text-2xs text-dim-400 font-bold uppercase mb-1 flex items-center justify-between">
            <span>실번호 (Seal No)</span>
            {sealError && (
              <span className="bg-red-700 text-red-50 text-3xs px-1.5 py-0.5 rounded font-black animate-pulse flex items-center gap-0.5">
                <AlertOctagon className="w-2.5 h-2.5"/>실오류
              </span>
            )}
          </div>
          {sealError ? (
            <div>
              <div className="text-2xs text-dim-400">원: <span className="text-dim-300 line-through mono">{slOrig}</span></div>
              <div className="text-3xl sm:text-4xl font-black mono text-red-300 tracking-wider text-center py-1 animate-pulse"
                style={{ textShadow: '0 0 20px rgba(248, 113, 113, 0.6)' }}>
                {c.sl}
              </div>
            </div>
          ) : (c.sl && (c.fe !== 'E' || c.sl.length >= 5)) ? (
            // 풀(또는 미정)일 때만 sl 표시. 엠티+짧은 sl(<5자)은 잘못된 데이터로 간주
            <div className="text-4xl sm:text-5xl font-black mono text-amber-300 tracking-wider text-center py-1 animate-pulse"
              style={{ textShadow: '0 0 20px rgba(251, 191, 36, 0.6)' }}>
              {c.sl}
            </div>
          ) : (c.fe === 'E' && c.eseal && String(c.eseal).trim().length >= 4) ? (
            // V9.20-02: 엠티실 — 엠티에도 실이 붙는 선박(26353W LYG 실측). eseal을 크게, 청록으로 구분.
            <div>
              <div className="text-2xs text-cyan-500 font-bold text-center">📦 엠티실 (Empty Seal)</div>
              <div className="text-4xl sm:text-5xl font-black mono text-cyan-300 tracking-wider text-center py-1 animate-pulse"
                style={{ textShadow: '0 0 20px rgba(34, 211, 238, 0.6)' }}>
                {String(c.eseal).trim()}
              </div>
            </div>
          ) : c.fe === 'E' ? (
            // M3.88: 엠티 컨테이너는 실번호 없는 게 정상 → 엠티 표시
            // M3.88.1: 엠티에 짧은/이상 sl이 들어있어도 무시 ("1", "TJM" 같은 잘못된 데이터)
            <div className="text-3xl font-black mono text-dim-200 text-center py-2 bg-ink-800/40 rounded">
              📦 엠티 (실번호 없음 정상)
              {c.sl && c.sl.length < 5 && (
                <div className="text-2xs text-dim-400 italic mt-1">
                  (데이터 sl="{c.sl}" 무시 - 의심값)
                </div>
              )}
            </div>
          ) : (
            <div className="text-2xl font-bold mono text-dim-500 italic text-center py-2">
              ⚠ 실번호 미입력
            </div>
          )}
        </div>

        {/* 2순위: X-RAY */}
        {c._xray && (
          <div className="bg-purple-950 border-2 border-purple-500 rounded-pill p-2.5 mb-2 animate-pulse">
            <div className="text-center font-black text-lg text-purple-200 flex items-center justify-center gap-2">
              🔍 X-RAY 대상
            </div>
            {c._xraySeal?.seal && (
              <div className="text-center text-purple-300 mono text-sm mt-1">
                세관: {c._xraySeal.seal}
                {c._xraySeal.eseal && <span className="text-cyan-300"> / 전자: {c._xraySeal.eseal}</span>}
              </div>
            )}
          </div>
        )}

        {/* 3순위: 특수화물 */}
        {(isReefer || c.dg || c.fr || c.ot || c.tk) && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {showTmp && <span className="bg-cyan-600 text-cyan-50 px-2 py-1 rounded font-black text-sm flex items-center gap-1"><Snowflake className="w-3.5 h-3.5"/>RF {c.tmp}°C</span>}
            {/* M3.75: 엠티 리퍼는 정상 - 경고 X */}
            {!showTmp && isReefer && c.fe === 'E' && (
              <span className="bg-cyan-800/60 text-cyan-200 px-2 py-1 rounded font-bold text-sm flex items-center gap-1">
                <Snowflake className="w-3.5 h-3.5"/>
                리퍼 엠티
              </span>
            )}
            {c.mkcon && (
              /* V9.23: 제작컨테이너 — 컨 자체가 상품(빈 컨). 리퍼드라이와 별도 분류 */
              <span className="bg-purple-800 text-purple-100 px-2 py-1 rounded font-black text-sm flex items-center gap-1 border-2 border-purple-400">
                🏭 제작컨 (컨 자체가 상품)
              </span>
            )}
            {!showTmp && isReefer && c.fe !== 'E' && c.rfdry && (
              /* V9.20-03: 리퍼드라이(넌플러그) — 온도 없음이 정상 */
              <span className="bg-teal-800 text-teal-100 px-2 py-1 rounded font-black text-sm flex items-center gap-1 border-2 border-teal-500">
                <Snowflake className="w-3.5 h-3.5"/>🔌 리퍼드라이 (넌플러그)
              </span>
            )}
            {!showTmp && isReefer && c.fe !== 'E' && reeferTempExempt(c) === 'lugg' && (
              /* 3.70-01: 수화물 — 온도 대상이 아니다(RZOR 수화물 리퍼 42항차 온도 기록 0, 검수사 2026-09-30) */
              <span className="bg-violet-800 text-violet-100 px-2 py-1 rounded font-black text-sm flex items-center gap-1 border-2 border-violet-400">
                <Snowflake className="w-3.5 h-3.5"/>🧳 수화물 (온도 대상 아님)
              </span>
            )}
            {!showTmp && isReefer && c.fe !== 'E' && !reeferTempExempt(c) && (
              <span className="bg-red-700 text-white px-2 py-1 rounded font-black text-sm flex items-center gap-1 animate-pulse border-2 border-red-400">
                <Snowflake className="w-3.5 h-3.5"/>
                <AlertTriangle className="w-3 h-3"/>
                리퍼 · 온도 미입력 ⚠️
              </span>
            )}
            {c.dg && <span className="bg-red-600 text-red-50 px-2 py-1 rounded font-black text-sm flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5"/>DG{c.un ? ` UN${c.un}` : ''}</span>}
            {c.fr && <span className="bg-orange-600 text-orange-50 px-2 py-1 rounded font-black text-sm">FR (Flat Rack)</span>}
            {c.ot && <span className="bg-yellow-600 text-yellow-50 px-2 py-1 rounded font-black text-sm">OT (Open Top)</span>}
            {c.tk && <span className="bg-pink-600 text-pink-50 px-2 py-1 rounded font-black text-sm">TK (Tank)</span>}
          </div>
        )}

        {/* 부가 정보 */}
        <div className="flex items-center gap-2 text-xxs mono flex-wrap text-dim-300 pt-2 border-t border-line">
          {(c.bay || c.deckPos) && (ls && ls.kind === 'swapWarn'
            ? <span className="text-orange-300 font-bold">자리 미정</span>
            : <span className="text-amber-300 font-bold">{fmtPos(c)}</span>)}
          {/* V9.56: RO/RO 겸용선(RZOR) — 갠트리(落地) 작업분인지 한눈에. 크레인 검수 대상이 이것뿐이다. */}
          {c.lolo && <span className="px-1.5 py-0.5 rounded bg-lime-700 text-lime-50 text-2xs font-black">🏗갠트리</span>}
          {c.dbl && <span className="px-1.5 py-0.5 rounded bg-amber-700 text-amber-50 text-2xs font-black">⇅2단</span>}
          {/* ★ 4.23-01 2차: 맞교환 자리는 «수정됨»이 아니다(아직 저장 전) — 가이드 카드와 같은 낱말 «맞교환 자리» · 규격 다른 맞교환은 «자리 미정» */}
          {ls && (ls.kind === 'swap' || ls.kind === 'swapWarn') && ls.plan && (
            <span className={`ml-1 px-1 rounded text-2xs font-bold ${ls.kind === 'swap' ? 'bg-sky-900 text-sky-200' : 'bg-orange-900 text-orange-200'}`}>
              {ls.kind === 'swap'
                ? `🔄 맞교환 자리 · 계획 칸 ${ls.plan}${ls.byCn ? `에 ${String(ls.byCn).slice(-4)} 이(가) 실렸습니다` : '은 다른 컨이 차지했습니다'}`
                : `⚠ 계획 칸 ${ls.plan} 은 ${ls.byCn ? `${String(ls.byCn).slice(-4)} 이(가)` : '다른 컨이'} 차지했습니다 — 이 컨은 규격·풀엠티·항구가 달라 앱이 자리를 정하지 않습니다. 실제 실린 칸을 지정하세요 (${ls.warn})`}
            </span>
          )}
          {!(ls && (ls.kind === 'swap' || ls.kind === 'swapWarn')) && c.bay_orig !== undefined && ((c.bay || '') !== (c.bay_orig || '') || (c.row || '') !== (c.row_orig || '') || (c.tier || '') !== (c.tier_orig || '')) && (
            <span className="ml-1 px-1 rounded bg-indigo-900 text-indigo-200 text-2xs font-bold">
              📍수정됨 · 원래 {c.bay_orig ? `${String(parseInt(c.bay_orig, 10)).padStart(2, '0')}-${c.row_orig}-${c.tier_orig}` : '자리 없음'}
            </span>
          )}
          <span>{isoToLabel(c.iso) || c.tp || ''}</span>
          <span className={c.fe === 'F' ? 'text-rose-400' : ''}>{c.fe || '?'}</span>
          {c.op && <span className="bg-ink-800 px-1 py-0.5 rounded">{c.op}</span>}
          {c.pol && <span>POL {c.pol}</span>}
          {c.pod && <span>POD {c.pod}</span>}
        </div>
      </button>

      {/* 완료 버튼 (직접 누르면 검색창 자동 비워짐) */}
      <button onClick={handleComplete}
        className={`w-full mt-3 py-3 rounded-pill font-black text-base flex items-center justify-center gap-1.5 ${
          isDone
            ? 'bg-rose-800 hover:bg-rose-700 text-rose-100'
            : 'bg-emerald-700 hover:bg-emerald-600 text-emerald-100'
        }`}>
        {isDone
          ? <><RotateCcw className="w-5 h-5"/>{c._mode === 'discharge' ? '양하확인 취소' : '선적확인 취소'}</>
          : (ls && ls.kind === 'swapWarn'
            ? <><MapPin className="w-5 h-5"/>실린 칸 지정</>
            : <><Check className="w-5 h-5"/>{c._mode === 'discharge' ? '양하확인' : '선적확인'}</>)
        }
      </button>

      {/* V7.99-16: 양하 모드 — 선박에 없는 컨(누락) 처리. V8.09-17: 양하 전용 — 선적엔 위치/번호수정이 따로 있어 누락 버튼이 뜨면 안 됨(메모1). */}
      {!isLoading && !isDone && c._mode === 'discharge' && (
        <button onClick={handleMissing}
          className="w-full mt-2 py-2.5 rounded-pill font-black text-sm bg-ink-800 hover:bg-rose-900 text-rose-300 border border-rose-800 flex items-center justify-center gap-1.5">
          🚫 선박에 없음 (누락 처리)
        </button>
      )}

      {/* ── TallyOne 1.55: **주 경로는 「컨테이너 번호 수정」이다.** ──────────────
          검수사 확정 2026-08-12 — *"EDI가 실어라 한대로 실었습니다. 이게 액츄얼 작업입니다."*
          335대 전수 대조(계획 칸 335 : 실제 칸 335, 안 찬 칸 0, 계획에 없는 칸 0) —
          바뀐 것은 **173칸의 번호뿐**이었다. 액츄얼에서 검수원이 하는 일은 번호를 바꾸는 것이고,
          위치를 지정할 일은 애초에 없다.
          그런데 종전 화면은 「수동 배정 — 위치 지정」을 위에 크게 걸어 놨다. 작업자가 335대를 전부
          그 버튼으로 처리해 `unassign` 182줄 · 카고플랜 173칸 덮어쓰기 · 칸 소멸 · 베이 잠김이 파생됐다.
          → 번호 수정을 위로 올려 강조하고, 위치 지정은 **접이식 예외**로 내린다. */}
      {/* 1.55-02: 완료된 카드에서는 숨긴다 — 완료 컨 자리에 새 번호를 얹으면 실물 1대에 완료 2건이 남는다(독립 재검증 P0-3). 완료 기록이 틀렸으면 [선적확인 취소]가 먼저다. */}
      {isLoading && !isDone && !cnFixOpen && (
        <button onClick={() => { setCnFixOpen(true); setCnFixQuery(''); setCnFixPick(null); }}
          className="w-full mt-2 py-3.5 rounded-pill font-black text-base bg-cyan-700 hover:bg-cyan-600 text-white border-2 border-cyan-400 flex items-center justify-center gap-1.5">
          <RotateCcw className="w-5 h-5"/>컨테이너 번호 수정 (다른 컨이 옴)
        </button>
      )}
      {isLoading && !isDone && cnFixOpen && (
        <div className="mt-2 bg-ink-900 border border-cyan-800 rounded-pill p-2 space-y-2">
          <div className="text-xxs text-cyan-300 font-bold">실제 온 컨테이너 번호 (끝 4자리 이상)</div>
          {cnFixPick ? (
            <>
              <div className="flex items-center justify-between bg-cyan-950/50 border border-cyan-700 rounded px-2 py-2">
                <div>
                  <div className="mono text-sm font-bold text-cyan-200">{cnFixPick.cn}</div>
                  <div className="text-2xs mono text-dim-300">
                    계획 {cnFixPick.bay ? `${parseInt(cnFixPick.bay, 10)}-${cnFixPick.row}-${cnFixPick.tier}` : '자리 없음'} · {cnFixPick.pod || '-'} · {cnFixPick.fe === 'E' ? '엠티' : '풀'}
                  </div>
                </div>
                <button onClick={() => setCnFixPick(null)} className="text-xxs text-dim-300 px-1.5">✕</button>
              </div>
              {/* V9.53: 등급별 안내 — 엠티·같은포트는 그냥 진행, 다른 베이/다른 포트는 강하게 확인 */}
              {swapG && (
                <div className={`rounded-pill border px-2.5 py-2 text-xxs font-bold leading-snug ${GRADE_STYLE[swapG.level].box} ${GRADE_STYLE[swapG.level].text}`}>
                  {GRADE_STYLE[swapG.level].icon} {swapG.reason}
                  {swapG.level === 'strong' && <div className="mt-0.5 font-normal opacity-90">누르면 한 번 더 확인합니다.</div>}
                </div>
              )}
              <button onClick={() => {
                  // 1.53: 네이티브 confirm() 은 브라우저가 페이지 밖에 그리는 창이라
                  //   뜨는 순간 렌더러가 멈춰 앱이 통째로 굳는다(실측 2026-08-12, 작업 30분 정지). 앱 안 모달로 묻는다.
                  const t = confirmTextOf(swapG, cnFixPick, c);
                  const go = () => { setPosTarget(cnFixPick); setCnFixOpen(false); };
                  if (!t) { go(); return; }
                  askConfirm({
                    title: '이 자리에 넣습니까',
                    message: t,
                    danger: swapG?.level === 'strong',
                    confirmLabel: '진행', cancelLabel: '취소',
                    onConfirm: go,
                  });
                }}
                className={`w-full py-2.5 rounded-pill font-black text-sm text-white flex items-center justify-center gap-1.5 ${
                  swapG?.level === 'strong' ? 'bg-rose-700 hover:bg-rose-600' : 'bg-cyan-700 hover:bg-cyan-600'}`}>
                <MapPin className="w-4 h-4"/>위치 선택 →
              </button>
            </>
          ) : (
            <>
              <input autoFocus value={cnFixQuery} onChange={e => setCnFixQuery(e.target.value)} {...NUM_INPUT_PROPS}
                placeholder="예: 1234 또는 SKLU1972626"
                className="w-full bg-ink-800 border border-line rounded px-2 py-2 text-sm mono text-dim-100"/>
              {cnFixMatches.map(x => (
                <button key={x.cn} onClick={() => {
                    // 1.53: confirm() → 앱 안 모달 (렌더러 정지 제거).
                    if (!x._comp) { setCnFixPick(x); return; }
                    askConfirm({
                      title: '이미 완료로 기록된 컨',
                      danger: true,
                      message: `${x.cn?.slice(-4)}는 이미 선적확인으로 기록된 컨입니다.\n실물이 눈앞에 있다면 앞선 기록이 오선적일 수 있습니다. 계속할까요?`,
                      confirmLabel: '계속', cancelLabel: '취소',
                      onConfirm: () => setCnFixPick(x),
                    });
                  }}
                  className="w-full flex justify-between items-center bg-ink-800 hover:bg-cyan-900 rounded px-2 py-1.5 text-xs">
                  <span className="mono font-bold text-dim-100">{x.cn}</span>
                  <span className="mono text-dim-300">
                    {x._comp && <span className="mr-1 px-1 rounded bg-rose-800 text-rose-200 font-bold">⚠ 완료기록</span>}
                    {x.bay ? `${parseInt(x.bay, 10)}-${x.row}-${x.tier}` : '자리 없음'} · {x.pod || '-'}
                  </span>
                </button>
              ))}
              {cnFixQuery.length >= 3 && cnFixMatches.length === 0 &&
                <div className="text-xxs text-dim-400 text-center">남은 작업분에 일치하는 컨이 없습니다.</div>}
            </>
          )}
          <button onClick={() => setCnFixOpen(false)} className="w-full text-xxs text-dim-300 py-1">닫기</button>
        </div>
      )}

      {/* M3.87: 선적 모드 - 위치 수정 (위치 다른 자리로 보내거나 미배정 처리)
          1.55: **예외 경로다.** 접어 두고 문구는 SearchPanel 과 한 벌로 맞춘다
          (SearchPanel:1642·2032 「계획에 없는 칸에 실렸습니다 — 위치 지정」). */}
      {isLoading && (
        <details className="mt-2 bg-ink-800 border border-line-strong rounded-pill">
          {/* 1.56-05: 검수사 지적 — "작아서 잘 안 보이고 옅은 회색이라 누르라고 되어 있는 건지 구분이 안 감. 위치 수정 버튼임을 알려야 함." */}
          <summary className="px-3 py-2.5 text-sm2 font-bold text-dim-100 cursor-pointer select-none hover:bg-ink-750 rounded-pill">
            📍 위치 지정 — 계획에 없는 칸에 실렸을 때 <span className="text-dim-300 font-normal">▼ 눌러서 열기</span>
          </summary>
          <div className="px-2 pb-2">
            <button onClick={() => {
                // TallyOne 1.28-01: **여기서 미리 미배정하지 않는다.**
                //   V8.80 은 자리 지정 전에 fbUnassignContainer 로 위치를 비웠다. 그러면 바로 뒤 onSave 가 부르는
                //   fbReassignContainerPosition 이 이 컨의 **옛 자리를 못 읽는다**(이미 ''). 그 함수의 자리 교환 분기
                //   `aOldBay && aOldRow && aOldTier` 가 절대 참이 될 수 없어, 자리를 뺏긴 컨이 매번 미배정 떠돌이가 됐다.
                //   → V9.52 가 되살린 자리 교환이 **이 경로에서만 100% 무력화**돼 있었다.
                //   실측(NSDC_2607N 선적 188대): 떠돌이 9대, 그중 7대가 이미 선적완료를 찍은 컨.
                //   이력도 그대로다 — `TGBU6406311 22/05/86 → //` 다음 `KMTU9448587 22/03/86 → //`.
                //   자리를 비우는 일은 fbReassignContainerPosition 이 한다(뺏긴 컨은 이 컨의 옛 자리로 간다).
                //   ※ V8.80 의 취지("계획 위치에 묶이지 않는다")는 자리 선택 UI 기본값 문제이지 DB를 비울 이유가 아니다.
                setPosTarget(c);
              }}
              className="w-full py-2.5 rounded-pill font-bold text-xs bg-ink-800 hover:bg-amber-900 text-amber-300 border border-amber-800/70 flex items-center justify-center gap-1.5">
              <MapPin className="w-4 h-4"/>{isDone ? '위치 수정 (같은 컨, 자리만 변경)' : `계획에 없는 칸에 실렸습니다 — 위치 지정${(ls && ls.plan) ? ` (계획 ${ls.plan})` : (c.bay ? ` (계획 ${fmtPos(c)})` : '')}`}
            </button>
          </div>
        </details>
      )}

      {/* M3.74: confirm() → ConfirmModal · 1.53: 취소 갈래는 ChoiceModal */}
      {modalsEl}

      {/* TallyOne 1.50: **지나온 자리.** 검수사 확정 2026-08-11 — *"이력을 남겨야 오류를 찾기 쉽습니다."*
          결과만 남아 있으면 왜 여기 왔는지 되짚을 수가 없다. 오늘 없는 중복 2곳·샌 3대·겹친 두 대가
          전부 "언제 무엇이 어디로 갔나"만 있으면 바로 나오는 것들이었다. */}
      {(() => {
        const path = buildMovePath(c);
        if (!path.length) return null;
        return (
          <details className="mt-2 bg-ink-900 border border-line rounded">
            <summary className="px-2 py-1.5 text-xxs font-bold text-dim-300 cursor-pointer">
              📍 지나온 자리 {path.length}번 — 눌러서 보기
            </summary>
            <div className="px-2 pb-2 text-xxs text-dim-200 whitespace-pre-line leading-relaxed">
              {describeMovePath(c, isDone)}
            </div>
          </details>
        );
      })()}

      {/* V9.51: 미배정된 컨을 계획 자리로 되돌린다 — 밀려난 컨의 유일한 출구였다 */}
      {!isDone && (
        <div className="mt-2">
          <RestoreOrigButton c={c} allContainers={allContainers} voyageKey={voyageKey}
            inspector={inspector} mode={c._mode} onDone={() => { if (onAfterComplete) setTimeout(() => onAfterComplete(c), 400); }} />
        </div>
      )}

      {/* M3.87: 위치 수정 모달 */}
      {posModalEl}
    </div>
  );
});
export default BigResultCard;
