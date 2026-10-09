// M5.26: 통합 출력 허브 모달
// 양하/선적 탭 × 항목별 (검수 리스트 / 카고플랜 / 베이 상세) 출력
//   - 평택분만 (양하 mode = 평택 양하 대상, 선적 mode = 평택 선적 대상)
//   - 컨테이너는 이미 mode별로 분리되어 voyage.discharge / voyage.loading에 있음
import React, { useState, useMemo } from 'react';
import { X, ArrowDown, ArrowUp, Printer } from 'lucide-react';
import { openInspectionListPrint, openVgmListPrint } from '../inspectionList.js';
import { openWorkingReportPrint } from '../workingReport.js';
import PrintableCargoPlanV2, { SPECIAL_FILL } from './PrintableCargoPlanV2.jsx';
import PrintableDeckPlan, { deckPlanDate } from './PrintableDeckPlan.jsx';   // 4.04: RZOR 는 카고플랜 자리에 덱플랜이 열린다
import { buildRzorLoadingDeckPlan } from '../rzorDeckPredict.js';
import { exportCheckerPlanXlsx } from '../rzorPlanExcel.js';
import { exportCarrierPlanXlsx } from '../rzorPlanExcelCarrier.js';
import PrintableBayDetail from './PrintableBayDetail.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import { EDI_EMPTY_FILL_KEYS, ediCoreEmpty, isoPickOog, isPyeongtaekPort, computeShiftingMapCached, shiftEvidenceOf, shiftingListOf, fullEdiMapOf, tagForecastMarks, effectivePos, plausibleListWtKg, applySwapFix, swapFixList, dropFilledBookingSlots, pickCarrierOp, pickDischargePol } from '../utils.js';

import { shipOpMapper } from '../data/tallyFormats.js';
export default function PrintHubModal({ voyage, voyageKey, onClose, initialMode = 'discharge', isLolo = false, inspector = '', viewDeckPlan = null }) {   // 4.00: initialMode — 지금 보던 모드(양하/선적)로 연다(생략하면 종전처럼 양하)
  // M5.64: voucher 출력 전 입력값 (선적 항차 + BERTH)
  const [voucherLoadVoy, setVoucherLoadVoy] = useState(voyage?.loading?.info?.voy || '');
  const [voucherDischVoy, setVoucherDischVoy] = useState(voyage?.discharge?.info?.voy || '');
  const [voucherBerth, setVoucherBerth] = useState(voyage?.info?.berth || voyage?.discharge?.info?.berth || '');

  const [mode, setMode] = useState(initialMode === 'loading' ? 'loading' : 'discharge');  // 'discharge' | 'loading'
  const [printSub, setPrintSub] = useState(null);  // 'cargo' | 'detail' | null

  // M5.30-fix: 카고플랜/베이상세는 전체 컨테이너 (평택+통과), 검수리스트는 평택만
  //   원인: 카고플랜은 선박 적부도라 모든 화물 표시 필요. 평택 필터 X
  //         빈 슬롯도 베이사전 기준으로 표시 (영구 규칙 #30)
  const sec = voyage?.[mode] || {};
  const ediMap = sec.ediContainers || {};
  const recMap = sec.records || {};
  const compMap = sec.completed || {};
  const xrayMap = sec.xrayList || {};
  //  ★ 3.45 — X-RAY 세관봉인 실번호(검수사 2026-09-14 «xray 실번호가 입력되면 검수리스트에 기입»).
  //    종전엔 xrayList(대상 여부)만 읽어 실번호가 종이까지 갈 통로가 아예 없었다.
  const xraySealMap = sec.xraySeals || {};
  // V8.98-02: 카고플랜/베이상세는 선박 전체 적부도 — 수집기 등록 항차의 ediContainers엔 통과화물이 없어
  //   raw EDI 전문을 파싱해 전체 컨을 쓴다(저장본이 있는 키는 저장본 우선 — _slotKey 등 보존). raw 없으면 기존 그대로.
  // V9.07-03: 로직을 utils.fullEdiMapOf로 승격 — 편집기와 같은 소스를 쓴다
  const fullEdiMap = useMemo(() => applySwapFix(fullEdiMapOf(sec), swapFixList(voyage)),   // 2.89: 맞교환 겹침 — 인쇄물도 같은 한 벌
    [sec?.raw?.edi?.uploadedAt, sec?.raw?.edi?.sizeBytes, ediMap, voyage?.swapFix]);
  // V8.98-01: 쉬프팅(재적부) — raw EDI 원문 기반 대조 (ediContainers엔 통과화물 없음).
  //   uploadedAt 기준 메모 — 스냅샷마다 300KB 재파싱 방지.
  const shiftingMap = useMemo(
    () => computeShiftingMapCached(voyageKey, voyage),
    [voyage?.discharge?.raw?.edi?.uploadedAt, voyage?.loading?.raw?.edi?.uploadedAt,
     voyage?.discharge?.raw?.edi?.sizeBytes, voyage?.loading?.raw?.edi?.sizeBytes, voyageKey, voyage?.swapFix,
     voyage?.restowList?._meta?.at, voyage?.info?.berthShift]   // 4.12-04: 선사 서류·배정표 이적이 나중에 와도 다시 센다(계산 자체는 computeShiftingMapCached 가 내용 서명으로 한 번 더 지킨다)
  );
  //  ★ 4.13 — 카고플랜 머리 «쉬프팅 5 미확정/확정/불일치». 판정은 항차 화면·콘앱과 같은 utils.shiftEvidenceOf 한 벌이다.
  //    터미널이 작업을 시작해 배정표 이적(berthShift)이 나오면 바뀌어야 하므로 berthShift·terminalStatus 가 의존성이다.
  const shiftEvid = useMemo(
    () => shiftEvidenceOf(voyageKey, voyage, shiftingMap),
    [shiftingMap, voyageKey, voyage?.info?.berthShift, voyage?.info?.terminalStatus,
     voyage?.restowList?._meta?.mailAt, voyage?.restowList?._meta?.at,
     voyage?.discharge?.raw?.edi?.uploadedAt, voyage?.loading?.raw?.edi?.uploadedAt,
     voyage?.discharge?.raw?.edi?.sizeBytes, voyage?.loading?.raw?.edi?.sizeBytes]
  );

  const isPtk = (c) => {
    if (!c) return false;
    // M5.50: 리스트에 있는 컨테이너는 무조건 평택 화물로 인식
    //   (사용자가 평택에서 검수하는 모든 컨테이너 = 리스트 등록 = 검수 대상)
    //   EDI POL/POD가 KRPTK 아닌 환적 표기여도 리스트 등록되면 평택분
    if (c.cn && recMap[c.cn]) return true;
    // M6.94.25: 평택 판정 공용 함수 (KRPYOTM 등 변형 포함). POL/POD 비면 평택 간주.
    if (mode === 'discharge') {
      return !c.pod || isPyeongtaekPort(c.pod);
    } else {
      return !c.pol || isPyeongtaekPort(c.pol);
    }
  };

  // 머지 (모든 컨테이너)
  // M6.94.28: 리스트가 EDI 핵심 필드를 덮어쓰지 못하게 보호 (VoyagePage와 동일 원칙).
  //   원인: EMPTY 엑셀은 항구 컬럼이 목적지(CNDLC 등)인데 이게 pol로 파싱됨.
  //   기존엔 리스트 값이 EDI(pol=KRPTK)를 무조건 덮어 → 엠티의 pol이 CNDLC가 되어
  //   카고플랜 별첨의 평택 필터(pol includes PTK)에서 285대가 전부 빠지던 버그.
  //   EDI에 있는 컨은 위치/항구/규격 등 핵심 필드를 EDI 진실로 유지, 보강 필드만 리스트 허용.
  // TallyOne 1.55: **`bay/row/tier` 가 목록에 있는 것은 그대로 두는 것이 맞다.**
  //   1.55 부터 `ediContainers.bay/row/tier` 는 선사 계획이고 검수 중 안 바뀐다 —
  //   계획은 계획(EDI)이 이겨야 하므로 `records.bay` 가 이걸 덮으면 안 된다.
  //   ⚠ `bay_actual/row_actual/tier_actual` 은 이 목록에 **없다**(그대로 병합된다) —
  //     실적이 필요한 인쇄물은 아래 `getBayActual`/`effectivePos(c)` 로 읽으면 된다.
  const PROTECTED_EDI_FIELDS = new Set([
    'pol', 'pod', 'npod', 'fpod', 'bay', 'row', 'tier', 'pos',
    'iso', 'fe', 'rf', 'fr', 'ot', 'tk', 'dg', 'oog', 'voy', 'vsl',
  ]);
  const allCnSet = new Set([...Object.keys(fullEdiMap), ...Object.keys(recMap)]);
  const allContainersBase = [...allCnSet].map(cn => {
    const e = fullEdiMap[cn] || {};
    const r = recMap[cn] || {};
    const hasEdi = !!fullEdiMap[cn];
    const merged = { ...e };
    Object.entries(r).forEach(([k, v]) => {
      if (v === '' || v == null) return;
      //  ★ 3.47: **검수사가 실물을 보고 고른 규격은 EDI 를 이긴다** — 종이에도 그 값이 나가야 한다.
      //    감사 지적 2026-09-14 — SearchPanel 만 고치고 이 세 번째 병합 경로를 안 봤다. 그러면
      //    작업카드만 확정값을, 목록·베이플랜·검수리스트·VGM 은 EDI 값을 본다(바로 2.52-03 사고 재판).
      if (hasEdi && r.iso_pick && (k === 'iso' || k === 'rf' || k === 'fr' || k === 'ot' || k === 'tk')) { merged[k] = v; return; }
      // EDI에 있는 컨테이너는 핵심 필드를 리스트가 덮지 못함 (EDI가 진실)
      // TallyOne 2.00-01: 단, 특수화물 플래그는 EDI 의 false 가 «정보 없음»일 수 있다 — DGS 없는 EDI(연운항형)가
      //   리스트의 DG true 를 지워 검수 리스트·카고플랜에서 위험물 23대가 통째로 사라졌다(TNJP 26360E 실측).
      //   false→true 승격만 허용(반대 방향은 종전대로 EDI 보호). VoyagePage FLAG_FILL 과 같은 규칙.
      const _flagUp = (k === 'rf' || k === 'fr' || k === 'ot' || k === 'tk' || k === 'dg' || k === 'oog') && v === true && e[k] !== true;
      if (k === 'tmp_missing' && v === true && e.tmp) return;   // 2.05-05: 자료 온도가 있으면 «미기재» 마킹을 얹지 않는다
      //  3.52-01: 양하 PORT 칸은 «양하 직전 마지막 항구» — EDI POL 이 평택이면 되돌아온 화물이다(utils 한 벌).
      //    여기서 나오는 것이 **대외 문서**다 — 마감텔리와 같은 답을 내야 한다.
      //  3.53: 고른 POD 가 EDI 를 이긴다 — 검수 리스트·VGM 대수가 마감텔리와 같아야 한다.
      if (hasEdi && r.pod_pick && k === 'pod') { merged.pod = v; return; }
      if (k === 'pol' && hasEdi) {
        if (mode !== 'discharge' || !e.pol) return;
        const _dp = pickDischargePol(e.pol, v, e.pod);
        if (_dp !== e.pol) merged.pol = _dp;
        return;
      }
      //  3.60-13 (수정안 A): EDI 칸이 비어 있으면 리스트가 채운다(utils 한 벌 — 화면 본류 VoyagePage 와 같은 규칙). 종이도 화면과 같은 규격을 적는다.
      if (hasEdi && PROTECTED_EDI_FIELDS.has(k) && !_flagUp && !(EDI_EMPTY_FILL_KEYS.has(k) && ediCoreEmpty(e, k))) return;
      //  ★ 2.52-04 — **리스트 무게가 «빈칸/0» 이면 EDI 무게를 지우지 않는다.** 80행 가드는 `''`·null 만 걸러
      //    `0` 이 그대로 통과하고, `wt` 는 PROTECTED 목록에도 없어 EDI 27,600kg 이 0 으로 덮이고 있었다.
      //    ⚠ 나가는 곳이 하필 **대외 문서**다 — VGM LIST(inspectionList.js:350 `w > 0`)가 무게 칸에 «—» 를
      //      찍고 미기재로 센다. NSFR 2616N 은 140대 전부가 그렇게 나갈 뻔했다(전 항차 1,032대).
      //    ⚠ 2.52-03 이 VoyagePage 경로만 고치고 이 세 번째 병합 경로를 안 봤다 — 파급 검증의 구멍이었다.
      //    규칙은 그대로다(1.23 «무게는 리스트가 기준») — 리스트에 **값이 있을 때** 하는 말이다.
      //    0kg 컨테이너는 없다(타레만 2톤). 톤 보정도 VoyagePage 와 같은 벌로 건다.
      if (k === 'wt') { const _w = plausibleListWtKg(v); if (_w > 0) merged.wt = _w; return; }   // 4.08-02: 컨 하나 40톤 초과는 제외
      //  3.52: 선사는 «더 자세한 쪽»(utils 한 벌). 여기서 나오는 것이 **대외 문서**다 —
      //    검수 리스트·VGM·카고플랜 별첨1(선사별)·베이 상세. 위 100행 주석이 경고한 «세 번째 병합 경로» 가 이것이다.
      if (k === 'op') { merged.op = pickCarrierOp(v, e && e.op, voyage?.info?.vsl); return; }
      merged[k] = v;
    });
    if (hasEdi && r.iso_pick) merged.oog = isoPickOog(r, e.oog);   // 4.15 (§7.8-⑨ Fable 판정): 검수사가 고른 규격이면 규격초과(oog) 표식도 고른 규격을 따른다(utils.isoPickOog 한 벌 — 드라이로 골랐으면 OT·FR·규격초과 없음)
    // V8.86: 컨번호 없는 EDI 자리(배열 인덱스 키) → 배열 인덱스가 컨번호로 둔갑하지 않게 __SLOT_ 키 부여
    merged.cn = (hasEdi && !e.cn && !recMap[cn]) ? `__SLOT_${e.bay || ''}_${e.row || ''}_${e.tier || ''}_${cn}` : cn;
    if (hasEdi && !e.cn && !recMap[cn]) { merged.pendingCn = true; merged._slot = true; }
    merged._src = hasEdi ? (recMap[cn] ? 'both' : 'edi') : 'list';   // 3.26: 부킹 자리를 채우는 실번호(EDI 밖 리스트 행) 표식 — utils.bookingFillOf 가 본다
    merged._comp = compMap[cn] || null;
    // M6.94.29: 리스트(records) 등록 표식 — 카고플랜 별첨이 평택 판정에 사용.
    //   검수리스트와 동일 원칙: 리스트에 등록되면 무조건 평택분.
    //   EDI가 KRPTK로 증명하거나 리스트에 있으면 평택 → pol 값에만 의존하지 않음.
    if (recMap[cn]) merged._inList = true;
    if (xrayMap[cn]) {
      merged._xray = true;
      //  ⚠ 이름이 _xraySealNo 다 — SearchPanel·mirCtx 는 _xraySeal 에 **레코드 객체**를 담는다(같은 이름에 다른 것).
      merged._xraySealNo = String((xraySealMap[cn] || {}).seal || '').trim();   // 3.45: 없으면 빈 칸 — 지어내지 않는다
      //  3.60-15: XRAY 목록 규격(_xrayIso)은 검수리스트에 쓰지 않는다 — 검수리스트는 세관 적하목록 원문(iso_customs), XRAY 리스트는 제 글자(XrayTab).
    }
    return merged;
  });

  // TallyOne 1.10-01: 긴급/수화물 예보 마커 주입 — VoyagePage와 같은 게이트 규칙.
  //   forecast.mode가 현재 모드와 일치할 때만 적용(선적 예보 마커가 양하 인쇄물에 새지 않게).
  const _fc = voyage?.info?.forecast;
  // 2.08-09 (2.08-07·08 과 같은 구멍의 인쇄판): 컨번호 마커는 forecast.mode 게이트 없이 —
  //   tagForecastMarks 가 그 모드 컨 목록에 실재하는 컨만 찍으므로 오적용 없음.
  const urgentSet = new Set(Array.isArray(_fc?.urgentCns) ? _fc.urgentCns : []);
  const luggSet = new Set(Array.isArray(_fc?.luggageCns) ? _fc.luggageCns : []);
  //  3.37: 특수제작컨도 인쇄물에서 «제작컨» 으로 보이고 리퍼 온도 대상에서 빠진다 — 화면과 한 벌.
  const specSet = new Set((Array.isArray(_fc?.specialCns) ? _fc.specialCns : []).map(x => String(x || '').trim().toUpperCase()).filter(Boolean));
  const allContainers = tagForecastMarks(
    allContainersBase, urgentSet, luggSet, _fc?.luggageSeals || null, specSet);

  // M5.30-fix: 베이 단위 필터 — ★ 4.12-04 부터 **베이 상세에만** 걸린다(카고플랜은 아래 printContainers 처럼 선박 전체).
  //   평택 화물이 1개라도 있는 베이의 전체 슬롯 표시 (그 베이의 통과 화물 + 빈 슬롯 포함)
  //   사용자 명세: "평택분 화물이 하나라도 있다면 그 베이 전체 티어/로우를 다 보여줘야 함"
  //
  // TallyOne 1.55: **계획과 실적이 갈라졌다.** firebase 가 `ediContainers.bay/row/tier` 덮어쓰기를
  //   그만두면서 `c.bay` 는 이제 선사 계획 그대로고, 검수원이 지정한 자리는 `records.bay_actual` 에만 있다.
  //   그래서 인쇄물마다 **어느 쪽이 기준인지**를 따로 정한다.
  //     · 카고플랜(getBay)       = 계획. 칸(방)도 이름표도 안 변한다(검수사 확정 2026-08-12).
  //     · 베이 상세(getBayActual) = 실적. 그 칸에 실제로 무엇이 실렸는지 보는 현장 종이다.
  //   ⚠ 위 PROTECTED_EDI_FIELDS 가 `bay/row/tier` 를 막는 것은 **그대로 두는 것이 맞다** —
  //     계획은 계획(EDI)이 이긴다. `bay_actual` 은 막히지 않으므로 실적이 필요한 쪽은 effectivePos 로 읽는다.
  const getBay = (c) => {
    if (!c) return '';
    const b = c.bay || (c.pos ? String(c.pos).slice(0, 3) : '');
    if (!b) return '';
    return String(b).padStart(3, '0').slice(0, 3);
  };
  // 실적 자리 — 임시창고(`__` 로 시작)는 자리가 아니라 ''. effectivePos 가 그 판정의 단일 소스다.
  const getBayActual = (c) => {
    if (!c) return '';
    const p = effectivePos(c);
    if (p.inStorage) return '';
    const b = p.bay || (c.pos ? String(c.pos).slice(0, 3) : '');
    if (!b) return '';
    return String(b).padStart(3, '0').slice(0, 3);
  };

  // 베이 상세용 베이 set — 평택분이 있는 베이 + 시프팅 컨이 있는 베이(실적 자리 기준).
  //  ★ 4.12-04 — **시프팅 컨이 있는 베이도 작업 베이다.** 평택 화물이 0대여도 크레인이 들어 올리는 컨이 있는 베이는 현장 종이에 든다.
  //    ⚠ 베이를 고르는 데만 쓴다 — 검수 리스트·별첨 대수(isPtk)는 그대로다.
  const _isShiftCn = (c) => !!(c && c.cn && shiftingMap && shiftingMap[c.cn]);
  const ptkBaysActual = new Set();
  allContainers.forEach(c => {
    if (!isPtk(c) && !_isShiftCn(c)) return;
    const ba = getBayActual(c);
    if (ba && ba !== '000') ptkBaysActual.add(ba);
  });

  // 카고플랜용 — 계획 기준. ★ 4.12-04 — **선박 전체**(평택 + 통과 + 시프팅). 베이를 거르지 않는다.
  //   검수사 확정 2026-08-28(2.79-03) «타지역화물도 보여줘야 합니다. 선적시 빈곳을 찾기 위해서» — «베이는 절대 안 뺀다»(통과화물은 회색 칸만, 글자는 평택분만).
  //   검수사 2026-10-09 03:25 «표기는 평택분만 표기를 하고 나머지는 음영을 넣어서 보여주기로 한것일텐데 그래야 선적위치를 정할수 있다고».
  //   M5.32 부터 여기만 «평택 화물이 한 대라도 있는 베이»로 걸러, 평택분 0대인 베이의 통과화물(회색)이 통째로 빠져 꽉 찬 베이가 빈 베이처럼 그려졌다
  //   (MCAP 639N — 891대 중 491대 · 시프팅 ◆ 5칸도 같이 빠졌다). 항차 화면 카고플랜(VoyagePage allEdiContainers)·콘앱은 처음부터 전체를 그린다 — 한 기준으로 맞춘다.
  const printContainers = allContainers.filter(c => {
    const b = getBay(c);
    return b && b !== '000';
  });

  // 베이 상세용 — 실적 기준. 창고에 넣은 컨은 자리가 없으니 이 종이에서 빠진다(실물이 배에 없다).
  const detailContainers = allContainers.filter(c => {
    const b = getBayActual(c);
    return b && ptkBaysActual.has(b);
  });

  // 검수 리스트용 — 평택분만
  //  3.26: 부킹 자리(예상 EDI)를 실번호가 다 채웠으면 자리는 목록에서 뺀다(검수 리스트·VGM = 실번호). 별첨은 반대로
  //    자리(계획)를 세고 채운 실번호를 뺀다 — 칸(그림)과 같은 표. 둘 다 utils 한 벌(SWBT 2614N 316+316=632 사건).
  //  3.31: 인쇄 카고플랜 별첨1 선사 라벨도 마감텔리와 같은 벌이어야 한다(감사 지적) —
  //    이 화면은 제 목록을 따로 만들어 VoyagePage 의 별칭을 안 탄다.
  //  ⚠ 3.39-03 — 여기서 `voyageInfo` 를 쓰면 **화면이 열리자마자 죽는다.** 그 const 는 이 줄보다
  //    한참 아래(«const voyageInfo = voyage?.info || {};» 줄)에 있어 아직 만들어지지 않았고,
  //    `?.` 는 그 상태를 못 비켜 간다(TDZ —
  //    «Cannot access 'voyageInfo' before initialization»). 3.31 이 그렇게 넣어 출력 허브 전체가
  //    양하·선적 어느 쪽으로도 안 열렸다. 값은 어차피 같은 것이므로 `voyage?.info` 를 직접 읽는다.
  const _spOpP = shipOpMapper(String(voyage?.info?.vsl || '').toUpperCase(),
    allContainers.map((c) => c && c.op));
  const ptkAll = allContainers.filter(isPtk).map((c) => {
    const _o = c && c.op ? _spOpP(c.op) : null;
    return (_o && _o !== c.op) ? { ...c, op: _o } : c;
  });
  const ptkContainers = dropFilledBookingSlots(ptkAll);
  //  별첨은 ptkAll 을 그대로 넘긴다 — 자리/실번호 가르기(legendItemsOf)는 PrintableCargoPlanV2 한 곳에서만 한다(두 번 걸면 계획 밖 추가분이 사라진다 — 2차 감사).

  // M5.31: 베이상세용 row/tier 계산 (BayPlan과 동일 패턴)
  //   "빈 슬롯도 표시"를 위해 — 베이가 한 컨만 있어도 모든 tier/row 슬롯 표시
  //   1.55: 이 두 값은 베이 상세에만 넘어간다 — 그러니 **실적 자리**로 잰다.
  let maxLeft = 0, maxRight = 0;
  const tierSet = new Set();
  detailContainers.forEach(c => {
    const p = effectivePos(c);
    if (p.row) {
      const n = parseInt(p.row);
      if (n > 0) {
        if (n % 2 === 0) maxLeft = Math.max(maxLeft, n);
        else maxRight = Math.max(maxRight, n);
      }
    }
    if (p.tier) tierSet.add(p.tier);
  });
  const globalRowRange = { maxLeft, maxRight };
  const globalTiers = Array.from(tierSet);

  const voyageInfo = voyage?.info || {};
  const shipImo = voyageInfo.imo || '';
  const shipName = voyageInfo.vsl || '';

  const count = ptkContainers.length;        // 검수 리스트 카운트 (평택만)
  const allCount = allContainers.length;     // 카고플랜/베이상세 카운트 (전체)
  const modeKo = mode === 'discharge' ? '양하' : '선적';

  // 양하/선적 카운트 (탭 라벨용 — 평택만)
  // M5.51: 리스트 등록 컨테이너는 무조건 평택분 (isPtk와 동기화)
  const countMode = (m) => {
    const s = voyage?.[m] || {};
    const ed = s.ediContainers || {};
    const rc = s.records || {};
    //  3.26: 부킹 자리·실번호 중복 제거 한 벌(dropFilledBookingSlots) — 탭 라벨도 검수 리스트와 같은 수.
    const items = [];
    Object.entries(ed).forEach(([k, c]) => { if (c) items.push({ ...c, _src: rc[k] ? 'both' : 'edi', _inList: !!rc[k] }); });
    Object.keys(rc).forEach(cn => { if (!ed[cn]) items.push({ ...(rc[cn] || {}), cn, _src: 'list', _inList: true }); });
    return dropFilledBookingSlots(items).filter(c => {
      if (c._inList) return true;  // M5.51: 리스트에 있으면 무조건 평택
      const target = m === 'discharge' ? c.pod : c.pol;
      return !target || isPyeongtaekPort(target);
    }).length;
  };
  const dischargeCount = countMode('discharge');
  const loadingCount = countMode('loading');

  const handlePrintInspection = () => {
    if (count === 0) {
      alert(`${modeKo} 컨테이너가 없습니다`);
      return;
    }
    // V8.98-05: 쉬프팅 별첨 — 컨 정보 보강해 전달
    //  3.65: 항차 화면 목록과 같은 한 벌(utils.shiftingListOf) — 실제 칸(실은 자리·시각)이 같이 간다(감사 — 둘째 벌이었다).
    const _shiftList = shiftingListOf(shiftingMap, fullEdiMap, voyage);
    openInspectionListPrint(ptkContainers, mode, voyageInfo, _shiftList);
  };

  // 서브 모달 (카고플랜 V2/베이 상세) 표시 중이면 그것만
  // M6.93.11: V1 카고플랜 폐기 (사용자 결정). 'cargo' subroute → V2로 redirect.
  if (printSub === 'cargo') {
    // 호환성: 옛 'cargo' 경로 진입 시 V2로 전환
    setPrintSub('cargo-v2');
    return null;
  }
  if (printSub === 'cargo-v2') {
    //  ★ 4.04 — RZOR(RIZHAO ORIENT)는 베이 매트릭스가 아니라 덱플랜이다. 카고플랜을 누르면 선사 STOWAGE PLAN(양하) · 검수사 마감텔리 STOWAGE PLAN(선적) 종이가 열린다.
    //   검수사 2026-10-04 «RZOR도 카고플랜 출력 누르면 덱플랜이 위 PDF랑 똑같이 나오게 … 특수화물은 칼라 바탕색을 넣되 칼라 흑백 방식 카고플랜과 동일 … XRAY도 동일하게».
    //   덱플랜이 없으면(양하 선사 플랜 미도착) 종전 카고플랜이 열린다. 선적은 올린 마감텔리 플랜이 정본이고, 없으면 LOLO 탭과 같은 자동 덱플랜(buildRzorLoadingDeckPlan)이다.
    const _rzLike = isLolo || /RZOR|RIZHAO/i.test(`${voyage?.info?.vsl || ''} ${voyageKey || ''}`);
    const _upPlan = Array.isArray(sec.stowagePlan?.decks) && sec.stowagePlan.decks.length ? sec.stowagePlan : null;
    let rzDeckPlan = null;
    if (_rzLike) {
      if (_upPlan) rzDeckPlan = _upPlan;
      else if (mode === 'loading' && viewDeckPlan && mode === initialMode && Array.isArray(viewDeckPlan.decks) && viewDeckPlan.decks.length) rzDeckPlan = viewDeckPlan;   // 4.04: 화면(LOLO 탭)이 그리는 자동 덱플랜을 그대로 — 종이의 예측 자리와 화면이 한 벌
      else if (mode === 'loading') {
        try {
          rzDeckPlan = buildRzorLoadingDeckPlan({ containers: allContainers.filter((c) => c && c.cn && !c._slot && !String(c.cn).startsWith('__')),
            termWork: sec.termWork || {}, bayWork: sec.bayWork || null, assign: sec.stowagePlan?.assign || null, voy: voyage?.info?.voy_l || voyage?.info?.voy || '' });
        } catch (e) { console.warn('[4.04] RZOR 덱플랜 생성 실패 — 카고플랜으로 연다', e); }
      }
    }
    if (rzDeckPlan && Array.isArray(rzDeckPlan.decks) && rzDeckPlan.decks.length) {
      const _vslFull = String(voyageInfo.vslFull || 'RIZHAO ORIENT').toUpperCase();
      const _date = deckPlanDate(voyageInfo);
      //  Excel — 선적은 마감텔리 PLAN.xlsx 양식(화면 «STOWAGE PLAN 엑셀» 단추와 같은 함수), 양하는 선사 STOWAGE PLAN 모양(rzorPlanExcelCarrier)
      const _onExcel = mode === 'loading'
        ? () => exportCheckerPlanXlsx({ plan: rzDeckPlan, vsl: _vslFull, voy: voyageInfo.voy_l || voyageInfo.voy || (voyageKey || '').split('_').pop() || '', date: _date, inspector: inspector || '' })
        : () => exportCarrierPlanXlsx({ plan: rzDeckPlan, containers: allContainers, xrayMap, vsl: _vslFull, date: _date, fills: SPECIAL_FILL });
      return (
        <ErrorBoundary name="덱플랜 출력" onClose={() => setPrintSub(null)}>
          <PrintableDeckPlan
            plan={rzDeckPlan}
            containers={allContainers}
            xrayMap={xrayMap}
            termWork={sec.termWork || {}}
            voyageInfo={voyageInfo}
            mode={mode}
            inspector={inspector}
            onExcel={_onExcel}
            onClose={() => setPrintSub(null)}
          />
        </ErrorBoundary>
      );
    }
    return (
      <ErrorBoundary name="카고플랜" onClose={() => setPrintSub(null)}>
        <PrintableCargoPlanV2
          containers={printContainers}
          legendContainers={ptkAll}
          mode={mode}
          voyageInfo={voyageInfo}
          shipImo={shipImo}
          shipName={shipName}
          xrayMap={xrayMap}
          shiftingMap={shiftingMap}
          shiftStatus={shiftEvid.label}
          onClose={() => setPrintSub(null)}
        />
      </ErrorBoundary>
    );
  }
  if (printSub === 'detail') {
    return (
      <ErrorBoundary name="베이 상세 인쇄" onClose={() => setPrintSub(null)}>
        {/*  3.46: 컨에 이미 _xray·_xraySealNo 가 얹혀 있지만(위 merge), 지도도 같이 넘긴다 —
             붙이는 자리를 한 곳(PrintableBayDetail)으로 모으기 위해서다. */}
        <PrintableBayDetail
          containers={detailContainers}
          xrayMap={sec.xrayList || {}}
          xraySeals={sec.xraySeals || {}}
          mode={mode}
          voyageInfo={voyageInfo}
          voyageKey={voyageKey}
          shipImo={shipImo}
          shipName={shipName}
          globalRowRange={globalRowRange}
          globalTiers={globalTiers}
          onClose={() => setPrintSub(null)}
        />
      </ErrorBoundary>
    );
  }

  //  ★ 4.00 — 출력 센터. 독의 「🖨️ 출력」 단추와 베이 탭 도구줄의 「출력」 단추가 **이 한 곳**을 연다.
  //    화면 모양만 게임 메뉴처럼 바꿨다 — 단추·글자·동작(검수 리스트·카고플랜·베이 상세·VGM·작업 보고)은 그대로다.
  //    자주 뽑는 종이(검수 리스트·카고플랜·베이 상세)를 위에 두고, 손으로 적어 내는 작업 보고서는 아래로 내렸다.
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center">
      <div className="bg-ink-900 w-full sm:max-w-lg sm:rounded-sheet rounded-t-sheet max-h-[95vh] overflow-y-auto flex flex-col pop-in border-2 border-ink-700">
        {/* 헤더 + 양하/선적 전환 — 같이 붙어 내려오지 않게 한 덩어리로 고정 */}
        <div className="sticky top-0 z-10 bg-ink-900 rounded-t-sheet"
          style={{ backgroundImage: 'radial-gradient(110% 130% at 0% 0%, rgb(var(--st-lod) / .24), transparent 70%)' }}>
          <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
            <h2 className="text-lg font-black text-dim-100 flex items-center gap-3 min-w-0">
              <span className="print-ico" style={{ width: 44, height: 44, fontSize: 24, background: 'linear-gradient(180deg, #f59e0b, #b45309)' }}>🖨️</span>
              <span className="min-w-0">
                <span className="block leading-tight">검수 자료 출력</span>
                <span className="block text-xs2 font-bold text-dim-300 leading-tight mt-0.5">양하·선적 × 검수 리스트 · 카고플랜 · 베이 상세 · VGM · 작업 보고서</span>
              </span>
            </h2>
            <button onClick={onClose} className="p-2 rounded-pill border-2 border-ink-700 bg-ink-850 hover:bg-ink-750 shrink-0" aria-label="닫기">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-4 pb-3">
            <div className="seg">
              <button
                onClick={() => setMode('discharge')} aria-pressed={mode === 'discharge'}
                className={`seg-btn ${mode === 'discharge' ? 'on-dis' : ''}`}
              >
                <ArrowDown className="w-4 h-4" />
                양하 ({dischargeCount})
              </button>
              <button
                onClick={() => setMode('loading')} aria-pressed={mode === 'loading'}
                className={`seg-btn ${mode === 'loading' ? 'on-lod' : ''}`}
              >
                <ArrowUp className="w-4 h-4" />
                선적 ({loadingCount})
              </button>
            </div>
          </div>
        </div>

        {/* 항목 리스트 */}
        <div className="p-4 space-y-3">
          {count === 0 ? (
            <div className="text-center py-8 text-dim-300">
              <p className="text-3xl mb-2">📭</p>
              <p>이 모드에 컨테이너 자료가 없습니다</p>
              <p className="text-xs mt-1">[업로드] 탭에서 EDI/리스트를 올린 뒤 사용합니다</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-dim-300">
                {modeKo} <strong className="text-dim-100">{count}대</strong> · 평택항 {modeKo} 대상만 포함
              </p>

              {/* 1. 검수 리스트 */}
              <button onClick={handlePrintInspection} className="print-tile">
                <span className="print-ico" style={{ background: 'linear-gradient(180deg, #14b37d, #047857)' }}>📋</span>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-dim-100">검수 리스트</div>
                  <div className="text-xs2 text-dim-300 mt-0.5 leading-snug">
                    A4 세로 세 단 · 인쇄 창 위 단추로 장 나누기(이어서·20/40·풀/엠티·포트별) · 시트1(전체) + 시트2(특수화물 별첨)
                  </div>
                </div>
                <Printer className="w-5 h-5 text-dim-400 shrink-0" />
              </button>

              {/* 2. 카고플랜 (M6.93.11: V1 폐기, V2만 사용 - 사용자 결정 · 4.00: 화면 이름에서 «V2» 를 뗐다 — 개발 용어) */}
              <button onClick={() => setPrintSub('cargo-v2')} className="print-tile">
                <span className="print-ico" style={{ background: 'linear-gradient(180deg, #4f8ff7, #1d4ed8)' }}>📐</span>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-dim-100">카고플랜</div>
                  <div className="text-xs2 text-dim-300 mt-0.5 leading-snug">
                    표준 도면 양식 그대로 · 베이별 단면 · 별첨(선사별·특수화물)
                  </div>
                </div>
                <Printer className="w-5 h-5 text-dim-400 shrink-0" />
              </button>

              {/* 3. 베이 상세 */}
              <button onClick={() => setPrintSub('detail')} className="print-tile">
                <span className="print-ico" style={{ background: 'linear-gradient(180deg, #8b5cf6, #5b21b6)' }}>🚢</span>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-dim-100">베이 상세</div>
                  <div className="text-xs2 text-dim-300 mt-0.5 leading-snug">
                    베이별 슬롯 단위 컨테이너 위치 · 검수 현장용
                  </div>
                </div>
                <Printer className="w-5 h-5 text-dim-400 shrink-0" />
              </button>

              {/* 2.07: VGM 리스트 — 선적분만 의미 있음(본선 «VGM list for {voy} KRPTK» 요청 대응) */}
              {mode === 'loading' && (
                <button
                  onClick={() => {
                    if (!ptkContainers.length) { alert('선적 컨테이너가 없습니다'); return; }
                    openVgmListPrint(ptkContainers, voyageInfo);
                  }}
                  className="print-tile"
                >
                  <span className="print-ico" style={{ background: 'linear-gradient(180deg, #f59e0b, #b45309)' }}>⚖️</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-dim-100">VGM 리스트</div>
                    <div className="text-xs2 text-dim-300 mt-0.5 leading-snug">
                      평택 선적분 컨별 VGM(kg) · 본선 요청 시 제출용 (영문)
                    </div>
                  </div>
                  <Printer className="w-5 h-5 text-dim-400 shrink-0" />
                </button>
              )}
            </>
          )}

          {/* FINAL WORKING REPORT (VOUCHER) — 입력 폼 + 두 버튼. 손으로 적어 배에 내는 서류라 아래로 내렸다. */}
          <div className="quest-card space-y-2" style={{ borderColor: 'rgb(var(--st-lod) / .55)' }}>
            <div className="text-sm2 font-black text-amber-200 mb-1">📄 FINAL WORKING REPORT 출력</div>
            {/* 항차 + BERTH 입력 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-2xs text-dim-300 block mb-0.5">양하 항차</label>
                <input
                  type="text"
                  value={voucherDischVoy}
                  onChange={(e) => setVoucherDischVoy(e.target.value)}
                  placeholder="예: 0145N"
                  className="w-full bg-ink-850 border-2 border-line-strong rounded-pill px-3 py-2 text-sm text-dim-100"
                />
              </div>
              <div>
                <label className="text-2xs text-dim-300 block mb-0.5">선적 항차</label>
                <input
                  type="text"
                  value={voucherLoadVoy}
                  onChange={(e) => setVoucherLoadVoy(e.target.value)}
                  placeholder="예: 0146S"
                  className="w-full bg-ink-850 border-2 border-line-strong rounded-pill px-3 py-2 text-sm text-dim-100"
                />
              </div>
            </div>
            <div>
              <label className="text-2xs text-dim-300 block mb-0.5">BERTH</label>
              <input
                type="text"
                value={voucherBerth}
                onChange={(e) => setVoucherBerth(e.target.value)}
                placeholder="예: 6"
                className="w-full bg-ink-850 border-2 border-line-strong rounded-pill px-3 py-2 text-sm text-dim-100"
              />
            </div>
            {/* 출력 버튼 두 개 */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => openWorkingReportPrint(voyage, voyage?.info || {}, 'settlement', {
                  dischVoy: voucherDischVoy, loadVoy: voucherLoadVoy, berth: voucherBerth
                })}
                className="pop-btn pop-amber" style={{ flexDirection: 'column', gap: 0, minHeight: 56 }}
              >
                <span className="text-sm2">📄 결제용</span>
                <span className="text-2xs font-bold opacity-85">완료 가정</span>
              </button>
              <button
                onClick={() => openWorkingReportPrint(voyage, voyage?.info || {}, 'actual', {
                  dischVoy: voucherDischVoy, loadVoy: voucherLoadVoy, berth: voucherBerth
                })}
                className="pop-btn pop-blue" style={{ flexDirection: 'column', gap: 0, minHeight: 56 }}
              >
                <span className="text-sm2">📄 작업용</span>
                <span className="text-2xs font-bold opacity-85">진행 현황</span>
              </button>
            </div>
          </div>
        </div>

        {/* 하단 안내 */}
        <div className="p-4 border-t-2 border-ink-700 text-xs text-dim-400 leading-relaxed">
          출력을 누르면 미리보기가 뜹니다 — 검수 리스트·VGM·작업 보고서는 새 창, 카고플랜·베이 상세는 이 화면 위. 미리보기에서 인쇄하거나 PDF로 저장하세요(단추가 없는 창은 Ctrl+P).<br />
          💡 컬러 인쇄 권장 (특수화물 색상 구분)
        </div>
      </div>
    </div>
  );
}
