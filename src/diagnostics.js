// 자동 진단/경고 시스템 (M3.5.4)
// 자료 업로드 후 자동 호출 → 이상 징후 검출 → 경고 객체 배열 반환
//
// 경고 종류:
//   🔴 critical: 리퍼 온도 미입력, 위험물 정보 누락, IMDG 격리 위반
//   🟡 warning:  카운트 차이, 무게 큰 차이
//   🔵 info:     실번호 불일치, X-RAY 매칭 안됨
//
// 결과 형식:
//   [
//     { level: 'critical'|'warning'|'info', code, msg, voice, count, details },
//     ...
//   ]

import { isoToLabel } from './utils.js';

// 평택 화물만 필터 (KRPTK 양하 또는 선적)
function filterPyeongtaek(containers, mode) {
  return Object.values(containers).filter(c => {
    if (mode === 'discharge') {
      const pod = (c.pod || '').toUpperCase();
      return pod === 'KRPTK' || pod.endsWith('PTK');
    } else if (mode === 'loading') {
      const pol = (c.pol || '').toUpperCase();
      return pol === 'KRPTK' || pol.endsWith('PTK');
    }
    return true;
  });
}

// 리퍼 컨테이너 추출 (rf 플래그 또는 ISO에 R)
function extractReefers(containers) {
  return containers.filter(c => c.rf || (c.iso && c.iso[2] === 'R'));
}

// 위험물 컨테이너 추출
function extractDg(containers) {
  return containers.filter(c => c.dg);
}

// ─── 메인 진단 함수 ───
// 인자:
//   ediContainers: { cn → {...} }  (EDI 파싱 결과, 평택 분만 필터된 상태 추천)
//   listRecords:   { cn → {sl, wt, ...} }
//   xrayList:      { cn → {} }
//   mode:          'discharge' | 'loading'
//   carrier:       선사 코드 (TDT에서)
// 결과: 경고 배열
export function runDiagnostics({ ediContainers, listRecords, xrayList, mode, carrier }) {
  const alerts = [];
  const ediArr = Object.values(ediContainers || {});
  const ediPtk = filterPyeongtaek(ediContainers || {}, mode);
  const ediCount = ediPtk.length;
  const listCount = Object.keys(listRecords || {}).length;
  const carrierLabel = carrier ? `${carrier}` : '';

  // ─── 🔴 1. 리퍼 온도 미입력 ───
  const reefers = extractReefers(ediPtk);
  if (reefers.length > 0) {
    const missingTmp = reefers.filter(c => {
      if (c.tmp_missing) return true;
      const t = String(c.tmp || '').trim();
      if (!t || t === '0' || t === '0.0') return true;
      return false;
    });
    if (missingTmp.length > 0) {
      alerts.push({
        level: 'critical',
        code: 'reefer_no_temp',
        msg: `리퍼 ${reefers.length}대 중 ${missingTmp.length}대 온도 미입력`,
        voice: `리퍼 ${reefers.length}대 중 ${missingTmp.length}대 온도 미입력입니다. 현장 확인 필요`,
        count: missingTmp.length,
        details: missingTmp.map(c => ({ cn: c.cn, bay: c.bay, row: c.row, tier: c.tier })),
      });
    }
  }

  // ─── 🔴 2. 위험물 정보 누락 ───
  const dgs = extractDg(ediPtk);
  if (dgs.length > 0) {
    const noClass = dgs.filter(c => !c.dgc);
    const noUn = dgs.filter(c => !c.un);
    if (noClass.length > 0) {
      alerts.push({
        level: 'critical',
        code: 'dg_no_class',
        msg: `위험물 ${dgs.length}대 중 ${noClass.length}대 클래스 정보 없음`,
        voice: `위험물 ${noClass.length}대 클래스 정보 누락입니다. 확인 필요`,
        count: noClass.length,
        details: noClass.map(c => ({ cn: c.cn, bay: c.bay, row: c.row, tier: c.tier })),
      });
    }
    if (noUn.length > 0) {
      alerts.push({
        level: 'warning',
        code: 'dg_no_un',
        msg: `위험물 ${noUn.length}대 UN 번호 미입력`,
        voice: `위험물 ${noUn.length}대 UN 번호 미입력입니다`,
        count: noUn.length,
        details: noUn.map(c => ({ cn: c.cn })),
      });
    }
  }

  // ─── 🔴 3. IMDG 격리 위반 (간이 검사) ───
  // 같은 슬롯/인접 슬롯에 격리 필요 클래스가 있는지
  // 격리 규정: 1↔여러, 4.1↔5, 5.1↔3 등 — 단순 동일 베이 내 클래스 3+5 인접만 검사
  if (dgs.length >= 2) {
    const baySlots = {};
    dgs.forEach(c => {
      const key = `${c.bay}-${c.row}`;
      if (!baySlots[key]) baySlots[key] = [];
      baySlots[key].push(c);
    });
    const violations = [];
    Object.entries(baySlots).forEach(([key, list]) => {
      if (list.length < 2) return;
      const classes = new Set(list.map(c => String(c.dgc || '').split('.')[0]));
      // 위험한 조합 (간이): 1+others, 3+5, 4+5, 3+4
      const hasDangerous =
        (classes.has('1') && classes.size > 1) ||
        (classes.has('3') && classes.has('5')) ||
        (classes.has('4') && classes.has('5')) ||
        (classes.has('3') && classes.has('4'));
      if (hasDangerous) {
        violations.push({ key, classes: [...classes].join('+'), list });
      }
    });
    if (violations.length > 0) {
      alerts.push({
        level: 'critical',
        code: 'imdg_violation',
        msg: `IMDG 격리 의심: ${violations.length}건`,
        voice: `위험물 격리 위반 의심 ${violations.length}건. 즉시 확인 필요`,
        count: violations.length,
        details: violations.map(v => ({
          location: v.key,
          classes: v.classes,
          containers: v.list.map(c => c.cn),
        })),
      });
    }
  }

  // ─── 🟡 4. EDI vs 리스트 카운트 차이 ───
  if (ediCount > 0 && listCount > 0) {
    const diff = ediCount - listCount;
    const carrierStr = carrierLabel ? ` ${carrierLabel}` : '';
    if (diff > 0) {
      // 리스트 부족
      alerts.push({
        level: 'warning',
        code: 'list_short',
        msg: `EDI ${ediCount}대 중 리스트 ${listCount}대 (${diff}개 부족)`,
        voice: `${carrierStr ? carrierStr + ' ' : ''}EDI ${ediCount}개인데 리스트는 ${listCount}개입니다. ${diff}개 부족합니다. 리스트 보완 필요`,
        count: diff,
        details: { ediCount, listCount, diff },
      });
    } else if (diff < 0) {
      // 리스트 초과 (EDI에 없는 컨이 리스트에 있음)
      const ediCns = new Set(ediArr.map(c => c.cn));
      const extraCns = Object.keys(listRecords).filter(cn => !ediCns.has(cn));
      alerts.push({
        level: 'warning',
        code: 'list_extra',
        msg: `리스트가 EDI보다 ${-diff}개 많음`,
        voice: `리스트가 EDI보다 ${-diff}개 많습니다. EDI에 없는 컨테이너가 있습니다. 확인 필요`,
        count: -diff,
        details: { extraCns: extraCns.slice(0, 20) },
      });
    }
  }

  // ─── 🟡 5. 무게 큰 차이 (1톤 이상) ───
  const wtDiffs = [];
  ediPtk.forEach(c => {
    const lr = listRecords?.[c.cn];
    if (!lr) return;
    const ediW = parseInt(c.wt, 10) || 0;
    const lrW = parseInt(lr.wt, 10) || 0;
    if (ediW > 0 && lrW > 0 && Math.abs(ediW - lrW) >= 1000) {
      wtDiffs.push({
        cn: c.cn,
        ediW, lrW,
        diff: lrW - ediW,
      });
    }
  });
  if (wtDiffs.length > 0) {
    alerts.push({
      level: 'warning',
      code: 'weight_diff',
      msg: `무게 차이 ${wtDiffs.length}건 (1톤 이상)`,
      voice: `무게 차이 ${wtDiffs.length}건 발생. 확인 필요`,
      count: wtDiffs.length,
      details: wtDiffs.slice(0, 20),
    });
  }

  // ─── 🔵 6. 실번호 불일치 ───
  const slDiffs = [];
  ediPtk.forEach(c => {
    const lr = listRecords?.[c.cn];
    if (!lr || !lr.sl || !c.sl) return;
    if (String(c.sl).trim() !== String(lr.sl).trim()) {
      slDiffs.push({ cn: c.cn, ediSl: c.sl, lrSl: lr.sl });
    }
  });
  if (slDiffs.length > 0) {
    alerts.push({
      level: 'info',
      code: 'seal_diff',
      msg: `실번호 불일치 ${slDiffs.length}건`,
      voice: '',  // info 레벨은 음성 없음
      count: slDiffs.length,
      details: slDiffs.slice(0, 20),
    });
  }

  // ─── 🔵 7. X-RAY 매칭 (양하만) ───
  if (mode === 'discharge' && xrayList && Object.keys(xrayList).length > 0) {
    const xrayCns = Object.keys(xrayList);
    const ediCns = new Set(ediArr.map(c => c.cn));
    const noLocation = xrayCns.filter(cn => !ediCns.has(cn));
    if (noLocation.length > 0) {
      alerts.push({
        level: 'info',
        code: 'xray_no_location',
        msg: `X-RAY ${xrayCns.length}대 중 ${noLocation.length}대 EDI 매칭 안됨`,
        voice: '',
        count: noLocation.length,
        details: noLocation,
      });
    }
  }

  // 정렬: critical → warning → info
  const order = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => (order[a.level] - order[b.level]));

  return alerts;
}

// ─── 음성 안내문 빌드 ───
// 자동 음성용: critical + warning만 (info는 화면만)
// 짧고 우선순위순으로
export function buildVoiceMessage(alerts) {
  if (!alerts || alerts.length === 0) {
    return '데이터 정상 확인되었습니다';
  }
  const speakable = alerts.filter(a => a.voice && (a.level === 'critical' || a.level === 'warning'));
  if (speakable.length === 0) {
    // info만 있는 경우는 짧게
    return `${alerts.length}건 정보 확인. 화면에서 상세 보기`;
  }
  // 첫 3개까지만 음성 (그 이상은 화면 보라고)
  const lines = speakable.slice(0, 3).map(a => a.voice);
  if (speakable.length > 3) {
    lines.push(`그 외 ${speakable.length - 3}건은 화면에서 확인`);
  }
  return lines.join('. ');
}

// 경고 카운트 요약 (화면 배지용)
export function summarizeAlerts(alerts) {
  const summary = { critical: 0, warning: 0, info: 0 };
  (alerts || []).forEach(a => {
    summary[a.level] = (summary[a.level] || 0) + 1;
  });
  return summary;
}
