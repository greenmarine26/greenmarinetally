// EDI와 리스트의 대수 차이를 미르가 스스로 진단한다 — «몇 대 다르다»가 아니라 «어느 컨이 왜» (2.35)
//   검수사 실측 2026-08-24: KBTR 2605E 양하가 40피트 1대 어긋났다. 원인은 앱이 아니라 **EDI가 옛 판**이었다 —
//   BAPLIE 헤더 `LOC+61+KRINC`(다음 기항 인천) = 셰코우 출항본. 그 컨(SKHU6414758)은 리스트에
//   `tsport: KRINC` 로 찍힌 **인천 환적분**이라 셰코우 출항 시점 적부도에는 실려 있지 않다.
//   ⇒ 인천 출항본 EDI가 오면 저절로 맞는다. 검수사가 헤매지 않도록 미르가 이걸 설명한다.
//   ⚠ 진단만 한다 — 숫자를 고치거나 자료를 만들지 않는다. 리스트가 정본이라는 판단도 하지 않는다.
import { isPyeongtaekPort } from './utils.js';

const S = (x) => String(x || '').trim().toUpperCase();
// 40ft 계열(4·L·9 시작) / 20ft(2 시작) — utils.isoToLabel 과 같은 앞자리 규칙
export function sizeOf(iso) {
  const c = S(iso).slice(0, 1);
  if (c === '4' || c === 'L' || c === '9') return '40ft';
  if (c === '2') return '20ft';
  return '기타';
}

/** EDI 원문 헤더에서 다음 기항(LOC+61)과 출발항(LOC+5)을 읽는다. 없으면 null. */
export function ediLegOf(rawText) {
  const t = String(rawText || '');
  const nx = t.match(/LOC\+61\+([A-Z]{5})/);
  const fr = t.match(/LOC\+5\+([A-Z]{5})/);
  return { nextPort: nx ? nx[1] : null, fromPort: fr ? fr[1] : null };
}

/**
 * 양하 기준 EDI ↔ 리스트 대조.
 * @returns {null | {gap, onlyList[], onlyEdi[], ediPtk, listTotal, bySize, tsHint}}
 *   둘 중 하나라도 비어 있으면 null(대조 자체가 성립 안 함 — 미도착 안내는 기존 경로 몫).
 */
export function diffEdiList(sec, rawText) {
  const edi = sec?.ediContainers, list = sec?.records;
  if (!edi || !list) return null;
  const eKeys = Object.keys(edi), lKeys = Object.keys(list);
  if (!eKeys.length || !lKeys.length) return null;

  // 평택분만 — 통과화물이 섞이면 숫자가 통째로 틀어진다(지침서 9.2-② 패턴)
  const ePtk = {};
  for (const k of eKeys) if (isPyeongtaekPort(edi[k]?.pod)) ePtk[k] = edi[k];
  const lPtk = {};
  for (const k of lKeys) if (!list[k]?.pod || isPyeongtaekPort(list[k].pod)) lPtk[k] = list[k];

  const onlyList = Object.keys(lPtk).filter((k) => !ePtk[k]);
  const onlyEdi = Object.keys(ePtk).filter((k) => !lPtk[k]);
  if (!onlyList.length && !onlyEdi.length) return null;

  // 리스트에만 있는 것 중 «환적항이 적힌» 것 — 이번 판 EDI가 모를 수밖에 없는 이유
  const leg = ediLegOf(rawText);
  const tsHint = onlyList
    .map((k) => ({ cn: k, ts: S(lPtk[k]?.tsport) }))
    .filter((x) => x.ts && x.ts !== 'KRPTK');

  const bySize = {};
  for (const k of onlyList) { const s = sizeOf(lPtk[k]?.iso); bySize[s] = (bySize[s] || 0) + 1; }
  for (const k of onlyEdi) { const s = sizeOf(ePtk[k]?.iso); bySize[s] = (bySize[s] || 0) - 1; }

  return {
    gap: onlyList.length - onlyEdi.length,
    onlyList, onlyEdi, bySize, tsHint, leg,
    ediPtk: Object.keys(ePtk).length,
    listTotal: Object.keys(lPtk).length,
    detail: (cn) => lPtk[cn] || ePtk[cn] || null,
  };
}

/** 미르 답변 문장 — 데이터가 말하게 두고, 단정은 근거가 있을 때만. */
export function explainEdiGap(d, vsl) {
  if (!d) return null;
  const L = [];
  const nm = vsl ? `${vsl} ` : '';
  L.push(`📋 ${nm}양하 — EDI ${d.ediPtk}대 · 리스트 ${d.listTotal}대 (평택분 기준)`);
  const sz = Object.entries(d.bySize).filter(([, n]) => n !== 0)
    .map(([s, n]) => `${s} ${n > 0 ? '+' : ''}${n}대`).join(' · ');
  if (sz) L.push(`차이: ${sz}`);
  L.push('');

  if (d.onlyList.length) {
    L.push(`▸ 리스트에만 있는 컨 ${d.onlyList.length}대 (EDI가 아직 모름)`);
    d.onlyList.slice(0, 8).forEach((cn) => {
      const c = d.detail(cn) || {};
      const ts = S(c.tsport);
      L.push(`  · ${cn} ${c.iso || ''}${c.pol ? ` · 출발 ${c.pol}` : ''}${ts ? ` · 환적 ${ts}` : ''}${c.sl ? ` · 씰 ${c.sl}` : ''}`);
    });
    if (d.onlyList.length > 8) L.push(`  … 외 ${d.onlyList.length - 8}대`);
  }
  if (d.onlyEdi.length) {
    L.push(`▸ EDI에만 있는 컨 ${d.onlyEdi.length}대 (리스트가 아직 모름)`);
    d.onlyEdi.slice(0, 8).forEach((cn) => {
      const c = d.detail(cn) || {};
      L.push(`  · ${cn} ${c.iso || ''}${c.bay ? ` · ${c.bay}-${c.row}-${c.tier}` : ''}`);
    });
  }

  // 원인 설명 — 환적 힌트와 EDI 판(다음 기항)이 맞아떨어질 때만 단정한다.
  const nx = d.leg?.nextPort;
  const tsPorts = [...new Set(d.tsHint.map((x) => x.ts))];
  L.push('');
  if (tsPorts.length && nx && tsPorts.includes(nx)) {
    L.push(`💡 지금 EDI는 ${d.leg.fromPort || '출발항'} 출항본이에요 — 다음 기항이 ${nx}라, `
      + `${nx}에서 환적해 평택으로 오는 컨은 아직 이 적부도에 없어요. `
      + `${nx} 출항본 EDI가 오면 저절로 맞아요.`);
    L.push('그때까지는 리스트 대수가 실물에 가깝고, 위 컨은 선내 위치가 없어 현장 확인이 필요해요.');
  } else if (tsPorts.length) {
    L.push(`💡 리스트에만 있는 컨에 환적항(${tsPorts.join('·')})이 적혀 있어요 — 환적분이라 이번 판 EDI에 없을 수 있어요.`);
  } else {
    L.push('💡 환적 표시가 없어서 원인이 하나로 안 잡혀요. 새 EDI가 오면 다시 대조해 볼게요 — '
      + '그래도 남으면 리스트 오타나 커트분일 수 있으니 컨번호를 실물과 맞춰 보세요.');
  }
  return L.join('\n');
}
