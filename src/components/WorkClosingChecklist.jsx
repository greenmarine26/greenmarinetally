// M5.1 G: 작업 마감 체크리스트
//   배 내리기 전 마지막 점검 — 미완 항목을 한 화면에 모아서 보여줌
//   각 항목 클릭 시 모달 닫고 해당 탭/필터로 점프 (onJump 콜백)
//   모두 0이면 큰 ✅ 화면 (마감 가능)
import React, { useMemo } from 'react';
import { X, AlertTriangle, CheckCircle2, ChevronRight, Snowflake, Camera, Shield, MoveRight, Hash, Construction } from 'lucide-react';   // TallyOne 1.55: 갱(호기) 보고 점검
import { isReeferContainer, isISO403, isISO403PhotoTaken, isPyeongtaekPort, effectivePos } from '../utils.js';

export default function WorkClosingChecklist({ open, voyage, mode, onClose, onJump }) {
  const items = useMemo(() => {
    if (!voyage) return [];
    const sec = voyage[mode] || {};
    const ediMap = sec.ediContainers || {};
    const recMap = sec.records || {};
    const compMap = sec.completed || {};
    const xrayMap = sec.xrayList || {};
    const xraySeals = sec.xraySeals || {};

    const allCnSet = new Set([...Object.keys(ediMap), ...Object.keys(recMap)]);
    const containers = [...allCnSet].map(cn => {
      const e = ediMap[cn] || {};
      const r = recMap[cn] || {};
      // V8.20-01 fix: POL/POD는 EDI가 단일 진실(7.1). 리스트 POL이 EDI 평택 POL을 덮어
      //   isPyeongtaekPort 탈락 → 마감점검 total이 354 대신 265로 적게 나오던 버그(현황요약과 동일).
      const rEnrich = Object.fromEntries(
        Object.entries(r).filter(([k, vv]) => vv !== '' && vv != null && k !== 'pol' && k !== 'pod')
      );
      const merged = { ...e, ...rEnrich, cn };
      if (!merged.pol && r.pol) merged.pol = r.pol;
      if (!merged.pod && r.pod) merged.pod = r.pod;
      return merged;
    }).filter(c => mode === 'discharge' ? isPyeongtaekPort(c.pod) : isPyeongtaekPort(c.pol));   // V7.93-02: 평택분만 (7.1)

    const total = containers.length;
    const undone = containers.filter(c => !compMap[c.cn]);

    // 리퍼 온도 미입력 (Full만 — 엠티는 정상 가능)
    const reefers = containers.filter(isReeferContainer);
    const reeferTempMissing = reefers.filter(c =>
      !c.rfdry && !c.mkcon && (c.fe === 'F' || c.fe === '' || c.fe == null) && (!c.tmp || String(c.tmp).trim() === '')
    );

    // ISO403 사진 미촬영
    const iso403Pending = containers.filter(c => isISO403(c) && !isISO403PhotoTaken(c));

    // X-RAY 미처리 (양하 모드만)
    const xrayPending = mode === 'discharge'
      ? Object.keys(xrayMap).filter(cn => !xraySeals[cn]?.seal)
      : [];

    // ── TallyOne 1.55: 칸(방)은 안 없어지고 이름표도 안 변한다 ──────────────
    //   검수사 확정 2026-08-12 — *"이름만 빌려줬다고 이야기 한걸 잊으면 안됩니다.
    //   그자리는 빈자리라고 분명히 이야길 했습니다."*
    //   1.55 에서 firebase 가 `ediContainers.bay` 덮어쓰기를 그만두면서 `c.bay` 는 진짜 계획이 됐다.
    //   그래서 **이름표가 내려온 상태(계획 칸을 다른 컨이 쓰는 것)는 사고가 아니라 정상**이다.
    //   ⚠ 그리고 `bay_actual` 은 더 이상 "실렸다"는 뜻이 아니다 — 검수원이 지정한 자리일 뿐이다.
    //     실렸는지는 `completed/{cn}` 하나로만 판단한다.
    const _p2d = (x) => String(x ?? '').replace(/\D/g, '').padStart(2, '0').slice(-2);
    const _slotKey = (b, r, t) => `${_p2d(b)}-${_p2d(r)}-${_p2d(t)}`;

    // 1) 그 칸에 **실물이 있다**고 말하는 컨 — 기준은 `completed` 하나다.
    //    `bay_actual` 은 검수원이 지정한 자리일 뿐 "실렸다"는 뜻이 아니다(1.55 로 깨진 옛 암묵 규칙).
    //    계획 이름표만 걸린 컨은 여기 안 들어온다 — 그 자리는 빈자리다.
    const _claim = new Map();
    containers.forEach(c => {
      if (!compMap[c.cn]) return;                     // 안 실린 컨은 자리를 주장하지 않는다
      const _p = effectivePos(c);
      if (_p.inStorage) return;                       // 임시창고 = 자리 없음
      const b = _p.bay, r = _p.row, t = _p.tier;
      if (!b || !t) return;
      const k = _slotKey(b, r, t);
      if (k.startsWith('00-')) return;
      if (!_claim.has(k)) _claim.set(k, []);
      _claim.get(k).push(c.cn);
    });
    // 2) 사고 — 한 칸에 실물이 둘. 이것만 경고다(STSE 2658W 사고와 같은 계열).
    const dupPos = [..._claim.entries()].filter(([, v]) => v.length > 1);

    // 3) 정상 — **이름표가 내려온 컨**. 자기 계획 칸에 다른 컨이 이미 실렸고, 자기는 아직 안 실렸다.
    //    실물은 창고에서 자기 차례를 기다린다. 사고가 아니므로 경고가 아니라 정보로만 알린다.
    //    창고에 넣어 둔 컨(`__` 표식)은 이미 정리된 것이라 여기서 뺀다 — 보관함 화면이 따로 보여준다.
    let nameOnly = [];
    if (mode === 'loading') {
      nameOnly = containers.filter(c => {
        if (compMap[c.cn]) return false;              // 이미 실렸다
        const _p = effectivePos(c);
        if (_p.inStorage) return false;               // 창고에 넣어 둔 컨은 보관함이 따로 보여준다
        const planB = c._edi_bay !== undefined ? c._edi_bay : c.bay;
        const planR = c._edi_row !== undefined ? c._edi_row : c.row;
        const planT = c._edi_tier !== undefined ? c._edi_tier : c.tier;
        if (!planB || !planT) return false;
        const k = _slotKey(planB, planR, planT);
        if (k.startsWith('00-')) return false;
        // 검수원이 **다른 칸**을 정해 준 컨은 이름표가 내려온 게 아니라 옮겨 간 것이다.
        //   ⚠ `bay_actual` 이 계획과 같은 컨이 흔하다(완료 때 자리를 확정하며 같은 값을 쓴다) —
        //     그래서 `bay_actual` 유무로 거르면 안 되고 **칸이 달라졌는지**로 걸러야 한다.
        if (_p.bay && _p.tier && _slotKey(_p.bay, _p.row, _p.tier) !== k) return false;
        const owners = _claim.get(k);
        return !!(owners && owners.some(cn => cn !== c.cn));
      });
    }

    // ── TallyOne 1.55: 갱(호기) 보고 유무 — **인건비 근거** ────────────────
    //   검수사 원문 — *"장비를 바꿔서 해야 하는데 4호기로 다함. 이걸로 제출하면
    //   2호기에서 작업한 인원은 그날 인건비를 받지 못함."*
    //   실사고: 335대를 다 실었는데 그 항차 `reports` 의 선적 갱 기록이 0건인데도 마감 점검이 통과했다.
    //   근거는 둘뿐이다 — ① `voyages/{key}/reports` 의 `equip`(모드 일치) ② `completed/{cn}.equip`.
    const _repMode = (r) => {
      const act = String(r?.action || '');
      if (act.startsWith('discharge')) return 'discharge';
      if (act.startsWith('loading')) return 'loading';
      return r?.mode || '';
    };
    const equipReports = new Map();                   // 갱 → 보고 건수
    Object.values(voyage?.reports || {}).forEach(r => {
      const eq = String(r?.equip || '').trim();
      if (!eq) return;
      const rm = _repMode(r);
      if (rm && rm !== mode) return;                  // 모드가 적힌 보고는 모드가 맞아야 한다
      equipReports.set(eq, (equipReports.get(eq) || 0) + 1);
    });
    const equipDone = new Map();                      // 갱 → 완료 대수
    let doneNoEquip = 0;
    Object.keys(compMap).forEach(cn => {
      const eq = String(compMap[cn]?.equip || '').trim();
      if (eq) equipDone.set(eq, (equipDone.get(eq) || 0) + 1);
      else doneNoEquip += 1;
    });
    const doneN = Object.keys(compMap).length;
    const gangs = [...new Set([...equipReports.keys(), ...equipDone.keys()])].sort();
    // 갱이 여럿이면 **갱별 완료 대수**를 같이 보여 준다 — 인건비 산정의 근거가 되는 숫자다.
    const gangDoneTxt = gangs.map(g => `${g} ${equipDone.get(g) || 0}대`).join(' / ');

    // 실 미입력 (선적 — 풀씰)
    const sealMissingFull = mode === 'loading'
      ? containers.filter(c => c.fe === 'F' && !c.sl)
      : [];

    return [
      {
        id: 'undone',
        icon: Hash,
        label: '미완료 컨',
        count: undone.length,
        desc: `${total}대 중 ${undone.length}대 양/선적확인 안 됨`,
        color: undone.length > 0 ? 'amber' : 'emerald',
        jumpTo: { tab: 'list', filter: 'undone' },
      },
      {
        id: 'reefer',
        icon: Snowflake,
        label: '리퍼 온도 미입력 (Full)',
        count: reeferTempMissing.length,
        desc: reefers.length > 0
          ? `리퍼 ${reefers.length}대 중 ${reeferTempMissing.length}대 온도 X`
          : '리퍼 없음',
        color: reeferTempMissing.length > 0 ? 'red' : 'emerald',
        jumpTo: { tab: 'list', filter: 'reeferTemp' },   // V9.14: search는 컨번호 검색이라 '리퍼'가 안 걸렸다 — 전용 필터로
      },
      {
        id: 'iso403',
        icon: Camera,
        label: '풀 리퍼 사진 미촬영',
        count: iso403Pending.length,
        desc: iso403Pending.length > 0
          ? `의무 대상 중 ${iso403Pending.length}대 사진 X`
          : '모두 촬영 완료',
        color: iso403Pending.length > 0 ? 'blue' : 'emerald',
        jumpTo: { tab: 'bay' },  // 베이 탭의 ISO403 패널로
      },
      ...(mode === 'discharge' ? [{
        id: 'xray',
        icon: Shield,
        label: 'X-RAY 미처리',
        count: xrayPending.length,
        desc: Object.keys(xrayMap).length > 0
          ? `${Object.keys(xrayMap).length}대 중 ${xrayPending.length}대 처리 X`
          : 'X-RAY 없음',
        color: xrayPending.length > 0 ? 'purple' : 'emerald',
        jumpTo: { tab: 'list', filter: 'xray' },
      }] : []),
      ...(dupPos.length > 0 ? [{
        id: 'dupPos',
        icon: AlertTriangle,
        // 1.55: 한 칸에 **실물이 둘**일 때만 뜬다. 이름표만 걸린 컨은 여기 안 들어온다.
        label: '🔴 한 칸에 두 대 — 즉시 정리',
        count: dupPos.length,
        desc: dupPos.slice(0, 3).map(([k, v]) => `${k.replace(/-/g, '/')}: ${v.join(' · ')}`).join('  |  ') + (dupPos.length > 3 ? ` 외 ${dupPos.length - 3}곳` : ''),
        color: 'red',
        jumpTo: { tab: 'bay' },
      }] : []),
      ...(doneN > 0 ? [{
        // 1.55: 갱(호기) 근거가 없으면 그날 인건비 근거가 통째로 사라진다 — 반드시 띄운다.
        id: 'equipReport',
        icon: Construction,
        label: gangs.length === 0
          ? '🔴 갱(호기) 기록 없음 — 인건비 근거'
          : '갱(호기)별 작업 대수',
        count: gangs.length === 0 ? doneN : 0,
        desc: gangs.length === 0
          ? `${doneN}대 완료인데 ${mode === 'discharge' ? '양하' : '선적'} 갱 기록이 0건입니다. 이대로 제출하면 그 갱 인원이 인건비를 못 받습니다 — [작업 보고]에서 남기세요.`
          : (equipDone.size > 0
            ? `${gangDoneTxt}${doneNoEquip > 0 ? ` · 갱 미기록 ${doneNoEquip}대` : ''}`
            : `${gangs.join(' · ')} 작업 보고 있음 · 완료 ${doneN}대는 갱이 안 적혀 있습니다`),
        color: gangs.length === 0 ? 'red' : 'emerald',
        info: gangs.length > 0,             // 갱이 있으면 알림만 — 마감을 막지 않는다
        jumpTo: { tab: 'report' },
      }] : []),
      ...(mode === 'loading' ? [
        {
          // 1.55: 「자리 뺏김」이 아니다 — 이름만 빌려준 것이고 실물은 창고에서 차례를 기다린다.
          //   사고가 아니라 정상 상태이므로 `info`로 두어 「마감 가능」을 막지 않는다.
          id: 'nameOnly',
          icon: MoveRight,
          label: '이름표가 내려온 컨',
          count: nameOnly.length,
          desc: nameOnly.length > 0
            ? `${nameOnly.length}대 — 실물은 창고에 있습니다. 그 자리는 빈자리입니다.`
            : '없음',
          color: nameOnly.length > 0 ? 'blue' : 'emerald',
          info: true,
          jumpTo: { tab: 'bay' },
        },
        {
          id: 'sealMissing',
          icon: Shield,
          label: '풀씰 미입력',
          count: sealMissingFull.length,
          desc: sealMissingFull.length > 0
            ? `Full ${sealMissingFull.length}대 실번호 X`
            : '모두 입력됨',
          color: sealMissingFull.length > 0 ? 'amber' : 'emerald',
          jumpTo: { tab: 'list', filter: 'undone' },
        },
      ] : []),
    ];
  }, [voyage, mode]);

  if (!open) return null;

  // 1.55: `info` 항목(이름표가 내려온 컨 · 갱별 대수)은 **알림**이지 미해결이 아니다 — 마감을 막지 않는다.
  const pending = items.filter(it => it.count > 0 && !it.info);
  const allClear = pending.length === 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-950">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏁</span>
            <div>
              <div className="text-lg font-black text-amber-300">작업 마감 점검</div>
              <div className="text-[11px] text-slate-400">
                {mode === 'discharge' ? '양하' : '선적'} · 배 내리기 전 마지막 점검
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-slate-300"/>
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {allClear ? (
            <>
            <div className="bg-emerald-900/30 border-2 border-emerald-600 rounded-xl p-8 text-center">
              <div className="text-7xl mb-3">✅</div>
              <div className="text-2xl font-black text-emerald-200 mb-2">마감 가능</div>
              <div className="text-sm text-emerald-300/80 leading-relaxed">
                모든 점검 항목이 완료되었습니다.<br/>
                안전하게 작업을 마무리하세요.
              </div>
            </div>
            {/* 1.55: 마감이 가능해도 갱별 대수·이름표 안내는 계속 보인다 — 인건비 근거는 눈으로 확인해야 한다. */}
            {items.filter(it => it.info && (it.count > 0 || it.id === 'equipReport')).map(it => (
              <ChecklistItem key={it.id} item={it} onJump={onJump} onClose={onClose}/>
            ))}
            </>
          ) : (
            <>
              <div className="bg-amber-950/40 border border-amber-700/40 rounded-lg p-3 flex items-start gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5"/>
                <div className="text-sm text-amber-100 font-bold">
                  {pending.length}개 항목 미해결 — 항목을 누르면 해당 화면으로 이동합니다.
                </div>
              </div>
              {items.map(it => (
                <ChecklistItem key={it.id} item={it} onJump={onJump} onClose={onClose}/>
              ))}
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-4 py-2 border-t border-slate-700 bg-slate-950 text-[10px] text-slate-500 text-center">
          M5.1 · 검수 종료 전 최종 점검용 — 항목별 카운트는 실시간 갱신됩니다
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({ item, onJump, onClose }) {
  const Icon = item.icon;
  const colorMap = {
    emerald: { bg: 'bg-emerald-950/30', border: 'border-emerald-700/40', text: 'text-emerald-200', count: 'text-emerald-300' },
    amber:   { bg: 'bg-amber-950/40',   border: 'border-amber-700/50',   text: 'text-amber-200',   count: 'text-amber-300' },
    red:     { bg: 'bg-red-950/40',     border: 'border-red-700/50',     text: 'text-red-200',     count: 'text-red-300' },
    blue:    { bg: 'bg-blue-950/40',    border: 'border-blue-700/50',    text: 'text-blue-200',    count: 'text-blue-300' },
    purple:  { bg: 'bg-purple-950/40',  border: 'border-purple-700/50',  text: 'text-purple-200',  count: 'text-purple-300' },
    orange:  { bg: 'bg-orange-950/40',  border: 'border-orange-700/50',  text: 'text-orange-200',  count: 'text-orange-300' },
  };
  const c = colorMap[item.color] || colorMap.amber;
  const clickable = item.count > 0;

  const handleClick = () => {
    if (!clickable) return;
    onJump?.(item.jumpTo);
    onClose?.();
  };

  return (
    <button
      onClick={handleClick}
      disabled={!clickable}
      className={`w-full text-left ${c.bg} border-2 ${c.border} rounded-xl p-3 flex items-center gap-3 transition ${
        clickable ? 'hover:brightness-125 active:scale-[0.98] cursor-pointer' : 'opacity-60 cursor-default'
      }`}
    >
      <div className={`w-10 h-10 rounded-full bg-slate-900/60 flex items-center justify-center flex-shrink-0 ${c.text}`}>
        {item.count === 0 ? <CheckCircle2 className="w-6 h-6"/> : <Icon className="w-5 h-5"/>}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-black text-sm ${c.text}`}>{item.label}</div>
        <div className="text-[11px] text-slate-400 leading-tight mt-0.5">{item.desc}</div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className={`text-2xl font-black mono ${c.count}`}>{item.count}</span>
        {clickable && <ChevronRight className={`w-5 h-5 ${c.text} opacity-60`}/>}
      </div>
    </button>
  );
}
