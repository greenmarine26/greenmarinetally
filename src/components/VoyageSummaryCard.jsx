// M5.0: 항차 요약 카드
//   진입 시 즉시 상황 파악 가능 — 통계 탭 가지 않아도 보임
//   표시: 모드별 진행률 / 리퍼·X-RAY·ISO403·자리뺏긴 등 주의 항목
//   각 항목은 클릭 시 해당 탭/필터로 점프 (옵션 — 일단 V1은 표시만)
import React, { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, Snowflake, Shield, MoveRight } from 'lucide-react';   // 1.24: Camera 제거 — 풀 리퍼 사진 칩 삭제로 미사용
import { isReeferContainer, isISO403, isISO403PhotoTaken, isPyeongtaekPort, effectivePos , shiftCnSetOf, progressOf} from '../utils.js';

export default function VoyageSummaryCard({ voyage, mode, voyageKey = '', reeferCheck = null }) {
  //  2.89-06: 시프팅은 평택 축에서 뺀다 — 재선적 기록이 리스트 등록 조건(recMap)에 걸려 총계·완료를 부풀렸다.
  const _shiftSet = shiftCnSetOf(voyageKey || (voyage?.info?.vsl || ''), voyage);
  const summary = useMemo(() => {
    const sec = voyage?.[mode] || {};
    const ediMap = sec.ediContainers || {};
    // 1.24: 이 항차의 덱플랜(비셀형 선박)에 실제 자리가 잡힌 컨 — 위치 판정에 쓴다.
    const deckPosCns = new Set();
    for (const d of (sec.stowagePlan?.decks || [])) {
      for (const sl of (d?.slots || [])) if (sl?.cn) deckPosCns.add(sl.cn);
    }
    const recMap = sec.records || {};
    const compMap = sec.completed || {};
    const xrayMap = sec.xrayList || {};

    // 머지 로직 (VoyagePage와 동일)
    const allCnSet = new Set([...Object.keys(ediMap), ...Object.keys(recMap)]);
    // V7.93-02: 평택분만 (7.1 — 양하=POD평택, 선적=POL평택). 현황 요약이 EDI 전체(통과화물 포함)를
    //   세어 목록(403)과 헤더(909)가 다르던 버그 (사용자 스크린샷 제보).
    const containers = [...allCnSet].map(cn => {
      const e = ediMap[cn] || {};
      const r = recMap[cn] || {};
      // V8.20-01 fix: 리스트(records)는 실번호/무게 등 보강만. POL/POD(항구)는 EDI가 단일 진실(7.1).
      //   리스트 POL이 EDI 평택 POL을 덮어 isPyeongtaekPort에서 탈락 → 현황요약 분모가 354 대신 265로 적게 나오던 버그.
      const rEnrich = Object.fromEntries(
        Object.entries(r).filter(([k, vv]) => vv !== '' && vv != null && k !== 'pol' && k !== 'pod')
      );
      const merged = { ...e, ...rEnrich, cn };
      if (!merged.pol && r.pol) merged.pol = r.pol;   // EDI에 POL 없을 때만 리스트 보강
      if (!merged.pod && r.pod) merged.pod = r.pod;
      return merged;
    }).filter(c => {
      if (_shiftSet.has(c.cn)) return false;   // 2.89-06: 시프팅은 자기 칸에서 센다
      if (mode === 'discharge') return isPyeongtaekPort(c.pod);
      // V8.86: 선적 — 리스트 등록 = 평택(별첨·베이와 동일 원칙, M6.94.34). NOLIST류 pol 공란 누락 방지.
      if (recMap[c.cn]) return true;
      return isPyeongtaekPort(c.pol);
    });

    // V8.86: 컨번호 없는 EDI '실제 자리'(터미널 PRE)는 항차수(분모)의 기준 — 자리수와 실컨수 중 큰 쪽.
    //   (자리는 배열 인덱스 키라 위 컨번호 병합에서 각각 세어지지만, 실컨과 이중계산되지 않게 분모를 재정의)
    const _slotN = Object.values(ediMap).filter(c => c && !c.cn &&
      (mode === 'discharge' ? isPyeongtaekPort(c.pod) : isPyeongtaekPort(c.pol))).length;
    const _realN = Math.max(containers.length - _slotN, 0);   // 자리 제외한 실컨(리스트) 수
    //  2.89-07: 분모 고정 — 리스트가 있으면 (리스트+시프팅)/(리스트완료+모브)를 progressOf 한 벌로.
    //    리스트 전(EDI·플랜 슬롯만)이면 종전 계산을 유지하되 시프팅·모브를 같은 규칙으로 더한다.
    const _prog = progressOf(sec, mode, _shiftSet);
    const _base0 = _slotN > 0 ? Math.max(_slotN, _realN) : containers.length;
    const _done0 = Object.keys(compMap).filter((cn) => !_shiftSet.has(cn)).length;
    const total = _prog.listTotal > 0 ? _prog.total : _base0 + _shiftSet.size;
    const done = _prog.listTotal > 0 ? _prog.done : _done0 + _prog.moves;
    // 2.08-02 (검수사 «전에 한번 수정한건 같습니다. 리퍼 엠티 알림건» — OBWH 선적 실측: 엠티 리퍼 26대가
    //   «리퍼 26대 · 위치미상26» 빨간 알림으로): 1.85-04 정책 «리퍼 전면 표시는 풀만»이 이 요약 카드에는
    //   빠져 있었다. 카운트·위치미상·온도X 전부 풀 리퍼 기준(F 또는 F/E 미상 — 조회·브리핑과 동일 판정).
    const reefers = containers.filter(c => isReeferContainer(c) && (c.fe === 'F' || c.fe === '' || c.fe == null));
    const reeferTempMissing = reefers.filter(c =>
      !c.rfdry && !c.mkcon && (c.fe === 'F' || c.fe === '' || c.fe == null) && (!c.tmp || String(c.tmp).trim() === '')
    );
    // V7.94-03: X-RAY 카운트 기준 통일 (사용자 제보 — 상단 0/3 vs 리스트 2 불일치)
    //   원인: 여기는 xrayList 원본 키 전부, 리스트(ListTab stats.xray)는 현재 컨테이너와 매칭분만.
    //   매칭 안 되는 키(오타/다른 항차 잔존)는 숨기지 않고 ⚠미매칭으로 드러냄 — 검사 누락 방지.
    const cnSet = new Set(containers.map(c => c.cn));
    const xrayKeys = mode === 'discharge' ? Object.keys(xrayMap) : [];
    const xrayCount = xrayKeys.filter(cn => cnSet.has(cn)).length;
    const xrayUnmatched = xrayKeys.filter(cn => !cnSet.has(cn));
    const xraySealed = mode === 'discharge'
      ? Object.entries(sec.xraySeals || {}).filter(([cn, v]) => v?.seal && cnSet.has(cn)).length
      : 0;
    const iso403Targets = containers.filter(isISO403);
    const iso403Pending = iso403Targets.filter(c => !isISO403PhotoTaken(c));

    // ── TallyOne 1.55: 칸(방)은 안 없어지고 이름표도 안 변한다 ──────────────
    //   검수사 확정 2026-08-12 — *"이름만 빌려줬다고 이야기 한걸 잊으면 안됩니다. 그자리는 빈자리입니다."*
    //   `c.bay` 가 진짜 계획이 된 뒤로 **계획 칸을 다른 컨이 쓰는 것은 정상**이다.
    //   ⚠ `bay_actual` 은 "실렸다"가 아니다 — 실렸는지는 `completed/{cn}` 하나로만 판단한다.
    //   (마감 점검 WorkClosingChecklist 와 같은 규칙 — 두 화면이 같은 숫자를 말해야 한다.)
    const _p2d = (x) => String(x ?? '').replace(/\D/g, '').padStart(2, '0').slice(-2);
    const _slotKey = (b, r, t) => `${_p2d(b)}-${_p2d(r)}-${_p2d(t)}`;

    // 그 칸에 **실물이 있다**고 말하는 컨 — 기준은 `completed` 하나다.
    //   `bay_actual` 은 검수원이 지정한 자리일 뿐 "실렸다"가 아니다. 이름표만 걸린 컨은 자리를 주장하지 않는다.
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
    // 사고 — 한 칸에 실물이 둘 (STSE 2658W 계열). 이것만 빨강이다.
    const dupPos = [..._claim.entries()].filter(([, v]) => v.length > 1);

    // 정상 — 이름표가 내려온 컨. 계획 칸에 다른 컨이 실렸고 자기는 아직 안 실렸다(실물은 창고).
    let nameOnly = 0;
    if (mode === 'loading') {
      containers.forEach(c => {
        if (compMap[c.cn]) return;
        const _p = effectivePos(c);
        if (_p.inStorage) return;                     // 창고에 넣어 둔 컨은 보관함이 따로 보여준다
        const planB = c._edi_bay !== undefined ? c._edi_bay : c.bay;
        const planR = c._edi_row !== undefined ? c._edi_row : c.row;
        const planT = c._edi_tier !== undefined ? c._edi_tier : c.tier;
        if (!planB || !planT) return;
        const k = _slotKey(planB, planR, planT);
        if (k.startsWith('00-')) return;
        // 검수원이 다른 칸을 정해 준 컨은 이름표가 내려온 게 아니라 옮겨 간 것이다(마감 점검과 같은 규칙).
        if (_p.bay && _p.tier && _slotKey(_p.bay, _p.row, _p.tier) !== k) return;
        const owners = _claim.get(k);
        if (owners && owners.some(cn => cn !== c.cn)) nameOnly++;
      });
    }

    return {
      total, done,
      pct: total ? Math.round(done / total * 100) : 0,
      reeferTotal: reefers.length,
      reeferTempMissing: reeferTempMissing.length,
      reeferDry: reefers.filter(c => c.rfdry).length,   // V9.20-03: 리퍼드라이(넌플러그)
      // V9.28-08: EDI에 위치가 없는 리퍼 (TMPZ 2023E 실측 — 선사 EDI가 리퍼 6대 누락, 냉동리스트에만 존재.
      //   카고플랜에 못 그리는 건 어쩔 수 없지만 숨기면 안 된다 — 검수원이 위치 미상임을 알아야 현장에서 찾는다)
      // 1.24: **덱플랜 위치도 위치다.** 비셀형(RZOR 등)은 bay/row/tier 를 안 쓰고
      //   `{mode}/stowagePlan` 의 덱 좌표(`D덱 2줄 20칸`)를 쓴다. 그걸 안 보고 `!c.bay` 로만 재서
      //   **덱에 다 있는 리퍼를 통째로 "위치미상" 으로 표시**했다(RZOR R084E 실측 16/16).
      //   검수사 지적 2026-08-07 — "위치도 덱 위치도 보면 알고 있습니다."
      reeferNoPos: reefers.filter(c => !c.bay && !c.bay_actual && !deckPosCns.has(c.cn)).length,
      madeCon: containers.filter(c => c.mkcon).length,  // V9.23: 제작컨테이너(컨 자체가 상품)
      xrayCount, xraySealed, xrayUnmatched,
      iso403Total: iso403Targets.length,
      iso403Pending: iso403Pending.length,
      nameOnly,   // 1.55: 이름표가 내려온 컨 — 사고가 아니라 정보
      dupPos,   // V9.24: [[자리키, [cn,...]], ...]
    };
  }, [voyage, mode]);

  if (summary.total === 0) return null;

  const modeLabel = mode === 'discharge' ? '양하' : '선적';
  const modeColor = mode === 'discharge' ? 'blue' : 'amber';

  return (
    <div className={`mb-3 rounded-btn border-2 overflow-hidden ${
      mode === 'discharge' ? 'border-blue-700/50 bg-blue-950/30' : 'border-amber-700/50 bg-amber-950/30'
    }`}>
      {/* 진행률 바 */}
      <div className={`px-4 py-3 ${mode === 'discharge' ? 'bg-blue-900/30' : 'bg-amber-900/30'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-5 h-5 ${mode === 'discharge' ? 'text-blue-300' : 'text-amber-300'}`}/>
            <span className={`font-black text-lg ${mode === 'discharge' ? 'text-blue-100' : 'text-amber-100'}`}>
              {modeLabel} {summary.done}/{summary.total}
            </span>
            <span className={`text-sm font-bold ${mode === 'discharge' ? 'text-blue-300' : 'text-amber-300'}`}>
              ({summary.pct}%)
            </span>
          </div>
          <span className="text-2xs text-dim-300 font-bold uppercase">현황 요약</span>
        </div>
        <div className="h-2 bg-ink-900/60 rounded-full overflow-hidden">
          <div className={`h-full transition-all ${
            summary.pct === 100 ? 'bg-emerald-500' : (mode === 'discharge' ? 'bg-blue-500' : 'bg-amber-500')
          }`}
            style={{ width: `${summary.pct}%` }}/>
        </div>
      </div>

      {/* 주의 항목 칩 — 0이면 숨김 */}
      <div className="px-3 py-2 flex flex-wrap gap-1.5">
        {summary.reeferTotal > 0 && (
          <Chip
            icon={Snowflake}
            color={summary.reeferTempMissing > 0 || summary.reeferNoPos > 0 ? 'red' : 'cyan'}
            label="리퍼"
            value={`${summary.reeferTotal}대${summary.reeferDry > 0 ? ` · 🔌드라이${summary.reeferDry}` : ''}${summary.madeCon > 0 ? ` · 🏭제작컨${summary.madeCon}` : ''}${summary.reeferNoPos > 0 ? ` · 📍위치미상${summary.reeferNoPos}` : ''}${summary.reeferTempMissing > 0 ? ` · ⚠${summary.reeferTempMissing} 온도X` : ''}`}
          />
        )}
        {/* 1.24: **풀 리퍼 사진 칩 삭제** — 바로 옆 「리퍼 확인」 칩과 같은 것을 두 번 말한다.
            검수사 지시 2026-08-07 — "사진찍는 문제는 옆에 확인 알림과 중복입니다. 사진 알림을 삭제 바랍니다."
            ⚠ 기능은 그대로다 — 촬영은 컨 상세의 [📷 풀 리퍼 사진 촬영] 에서 하고,
            빠뜨린 건 마감 점검(WorkClosingChecklist '풀 리퍼 사진 미촬영')이 잡는다. 요약줄에서만 뺀다. */}
        {/* TallyOne 1.15: **리퍼 온도 확인 유무** — 검수사 지시 2026-08-06 "풀리퍼 옆에 표기".
            리퍼는 선박을 고르면 앱이 확인 모달을 띄운다. 그때 확인을 했는지 여기서 바로 보이게 한다.
            누르면 다시 열린다 — 위에 있던 중복 배너를 지운 대신 이 칩이 진입점이다. */}
        {reeferCheck && (
          <Chip
            icon={Snowflake}
            color={reeferCheck.unchecked > 0 ? 'red' : 'emerald'}
            label="리퍼 확인"
            value={reeferCheck.unchecked > 0 ? `미확인 ${reeferCheck.unchecked}/${reeferCheck.total}` : `완료 ${reeferCheck.total}대 ✓`}
            onClick={reeferCheck.onOpen}
          />
        )}
        {summary.dupPos?.length > 0 && (
          <Chip
            icon={AlertTriangle}
            color="red"
            label="🔴 한 칸에 두 대"
            value={`${summary.dupPos.length}곳 — ${summary.dupPos.slice(0, 2).map(([k, v]) => `${k.replace(/-/g, '/')} ${v.join('·')}`).join(', ')}${summary.dupPos.length > 2 ? ' 외' : ''}`}
          />
        )}
        {/* 1.55: 「자리 뺏김」이 아니다 — 이름만 빌려준 것이고 그 자리는 빈자리다.
            실물은 아직 부두에서 차례를 기다린다 → 경고색(orange)이 아니라 정보색(blue). */}
        {mode === 'loading' && summary.nameOnly > 0 && (
          <Chip
            icon={MoveRight}
            color="blue"
            label="이름표가 내려온 컨"
            value={`${summary.nameOnly}대 — 실물은 창고`}
          />
        )}
        {/* TallyOne 1.15: **X-RAY 는 맨 뒤로** (검수사 지시 2026-08-06). 리퍼·사진이 앞, X-RAY 는 마지막. */}
        {(summary.xrayCount > 0 || summary.xrayUnmatched?.length > 0) && (
          <Chip
            icon={Shield}
            color={summary.xrayUnmatched?.length > 0 ? 'red' : 'purple'}
            label="X-RAY"
            value={`${summary.xraySealed}/${summary.xrayCount}${summary.xrayUnmatched?.length > 0 ? ` · ⚠${summary.xrayUnmatched.length} 미매칭` : ''}`}
          />
        )}
        {summary.reeferTotal === 0 && summary.xrayCount === 0 && summary.nameOnly === 0 && (   /* 1.24: iso403 칩 삭제분 제외 */
          <span className="text-xxs text-dim-400 px-2 py-1">특이 항목 없음</span>
        )}
      </div>
    </div>
  );
}

function Chip({ icon: Icon, color, label, value, onClick = null }) {
  const colorMap = {
    cyan:    'bg-cyan-900/40 border-cyan-700/40 text-cyan-200',
    red:     'bg-red-900/40 border-red-700/50 text-red-200 animate-pulse',
    purple:  'bg-purple-900/40 border-purple-700/40 text-purple-200',
    blue:    'bg-blue-900/40 border-blue-700/40 text-blue-200',
    emerald: 'bg-emerald-900/40 border-emerald-700/40 text-emerald-200',
    orange:  'bg-orange-900/40 border-orange-700/50 text-orange-200',
  };
  const cls = `inline-flex items-center gap-1 px-2 py-1 rounded border text-xxs font-bold ${colorMap[color] || colorMap.cyan}`;
  const body = (<>
    <Icon className="w-3 h-3"/>
    <span className="text-dim-200/80">{label}</span>
    <span className="mono">{value}</span>
  </>);
  // TallyOne 1.15: 누를 수 있는 칩 지원 — 리퍼 확인 칩이 온도 확인 화면을 다시 연다.
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} hover:brightness-125 active:scale-95 transition`}
        style={{ minHeight: 28 }}>{body}</button>
    );
  }
  return (
    <span className={cls}>{body}</span>
  );
}
