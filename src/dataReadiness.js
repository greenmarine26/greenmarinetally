// 항차별 작업 자료가 다 왔는지 판정한다 — 빠진 것을 이름으로 알린다
//
// 왜 있나 (2026-08-13 검수사 지시).
//   *"자료는 양하나 선적자료가 다 준비 되었는지, 빠졌다면 뭐가 어느 선사 자료가 비었음을 알리고…
//     없는 자료를 말해주면 되는 식입니다."*  → 수석 대시보드에 올린다(검수사 확정).
//
// 검수사 확정 자료 목록 — EDI 또는 ASC · 양하/선적 리스트(CDL/CLL) · VGM.
//   ⚠ VGM 은 **따로 오지 않는다.** `Baplie_MCCCGOVGM.edi` `CLL Data_vgm.xls` 처럼 EDI·CLL 에 얹혀 오고,
//     파일 안에는 VGM 전용 세그먼트가 없이 일반 중량(`MEA+WT`)만 있다(2026-08-13 실측 42건).
//     그래서 파일명으로 판정하면 틀린다. 검수사 지시대로 **파일 안 중량이 채워졌는지**로 본다
//     — 곧 `무게 미기재 N대`가 VGM 미반영을 대신한다.
//
// ⛔ 마감자료(타임시트·실선적 EDI·DEP.TALLY·FINAL WORKING)는 여기서 안 본다.
//    검수사: *"마감자료는 작업을 하면 저절로 생김."*

/** 무게가 비었는가 — '', 0, '0.0', null 을 모두 미기재로 본다 */
function _noWeight(c) {
  const w = c && (c.weight ?? c.wt ?? c.grossWeight);
  const s = String(w ?? '').trim();
  return s === '' || Number(s) === 0;
}

function _asList(x) {
  if (Array.isArray(x)) return x;
  if (x && typeof x === 'object') return Object.values(x);
  return [];
}

/**
 * 한 항차의 한 모드(양하/선적)를 판정한다.
 * @returns {{state:'ready'|'noEdi'|'noList'|'noWeight', label:string, missing:string, edi:number, list:number, wt0:number}}
 */
export function judgeMode(modeData) {
  const cs = _asList(modeData?.ediContainers);
  const rec = _asList(modeData?.records);
  const edi = cs.length;
  const list = rec.length;
  const wt0 = cs.filter(_noWeight).length;

  if (!edi && !list) return { state: 'noEdi', label: '자료 없음', missing: 'EDI/ASC, 리스트', edi, list, wt0 };
  if (!edi)          return { state: 'noEdi', label: 'EDI 없음', missing: 'EDI/ASC', edi, list, wt0 };
  if (!list)         return { state: 'noList', label: '리스트 없음', missing: '양하/선적 리스트', edi, list, wt0 };
  if (wt0)           return { state: 'noWeight', label: `무게 미기재 ${wt0}대`, missing: `무게(VGM) ${wt0}대`, edi, list, wt0 };
  return { state: 'ready', label: '준비완료', missing: '', edi, list, wt0 };
}

/**
 * 활성 항차 전체를 훑어 자료 현황을 만든다.
 * @param voyages  { key: voyage }
 * @param bayDict  베이사전 — 항차 info.carrier 가 비었을 때 선사를 여기서 보강한다
 */
export function buildReadiness(voyages, bayDict = null) {
  const rows = [];
  Object.entries(voyages || {}).forEach(([key, v]) => {
    const info = v?.info || {};
    const code = String(info.vsl || key.split('_')[0] || '').toUpperCase();
    // 선사 — 항차에 없으면 베이사전에서. 2026-08-13 실측: 활성 항차 다수가 carrier 비어 있다.
    const carrier = String(info.carrier || bayDict?.[code]?.carrier || '').trim().toUpperCase();
    [['discharge', '양하'], ['loading', '선적']].forEach(([m, kr]) => {
      if (!v?.[m]) return;
      const j = judgeMode(v[m]);
      rows.push({
        key, mode: m, modeKr: kr, code,
        ship: info.vslFull || info.vsl || code,
        voy: (m === 'discharge' ? info.voy_d : info.voy_l) || info.voy || '',
        carrier: carrier || '',
        ...j,
      });
    });
  });
  rows.sort((a, b) => (a.state === 'ready') - (b.state === 'ready') || a.key.localeCompare(b.key));

  const short = rows.filter(r => r.state !== 'ready');
  // 선사별로 묶는다 — 검수사: "어느 선사 자료가 비었음을 알리고"
  const byCarrier = {};
  short.forEach(r => {
    const c = r.carrier || '(선사 미상)';
    (byCarrier[c] = byCarrier[c] || []).push(r);
  });
  return {
    rows, short, byCarrier,
    total: rows.length,
    readyCount: rows.length - short.length,
    noCarrier: short.filter(r => !r.carrier).length,
  };
}

/** 자연어 답변용 문장 — 첫 줄이 음성으로 읽히므로 결론을 먼저 놓는다 */
export function describeReadiness(rd) {
  if (!rd || !rd.total) return '작업 자료가 올라온 항차가 없습니다.';
  const L = [];
  if (!rd.short.length) {
    L.push(`✅ ${rd.total}개 작업 전부 준비완료입니다.`);
    return L.join('\n');
  }
  L.push(`⚠ ${rd.total}개 작업 중 ${rd.short.length}개가 자료 부족입니다. (준비완료 ${rd.readyCount})`);
  L.push('');
  rd.short.forEach(r => {
    L.push(`  ${r.code} ${r.voy || ''} ${r.modeKr} — ${r.missing}${r.carrier ? ` (${r.carrier})` : ''}`);
  });
  const cs = Object.entries(rd.byCarrier).sort((a, b) => b[1].length - a[1].length);
  if (cs.length) {
    L.push('', '선사별');
    cs.forEach(([c, v]) => L.push(`  ${c} ${v.length}건 — ${v.map(r => `${r.code} ${r.modeKr}`).join(', ')}`));
  }
  if (rd.noCarrier) {
    L.push('', `※ ${rd.noCarrier}건은 선사가 기록돼 있지 않습니다 — 베이매트릭스에서 선사를 채우면 선사별로 묶입니다.`);
  }
  return L.join('\n');
}
