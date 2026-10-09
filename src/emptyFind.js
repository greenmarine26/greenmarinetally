// 머스크 엠티 찾기 — PCTC EDI(실번호 엠티)와 머스크 BAPLIE 를 도착항×규격으로 대조하는 순수 판정 모듈(수석 대시보드·연막검사 공용)
import { isReeferCheckSkipped, isVirtualCn, isBookingSlot } from './utils.js';
import { isoShown } from './utils.js';   // 4.21: 내부 풀·엠티 표식을 정본 규격 글자로 보여 준다

// 규격 묶음 — 앞 두 자리 + RF/GP (수집기 emptylist._spec_key 와 같은 규칙. 45R1·45RE 는 같은 묶음)
export function specKey(iso) {
  const s = String(iso || '').toUpperCase();
  if (s.length < 3) return '??';
  return s.slice(0, 2) + ('RH'.includes(s[2]) ? 'RF' : 'GP');
}

// 머스크 항차 판정 — 리퍼 체크 면제와 같은 선사 기준 한 벌(info.carrier·사전 carrier)
export function isMaerskVoyage(info, dictCarrier) {
  return isReeferCheckSkipped(info, null, dictCarrier);
}

// 보관소 EDI 에서 실번호 엠티만 — 풀·가상번호(DUME·CASP)·부킹 빈자리 제외. 수집기 emptylist._rows_from 과 같은 규칙.
export function realEmptyRows(ediMap) {
  const out = [];
  Object.values(ediMap || {}).forEach((c) => {
    if (!c || typeof c !== 'object') return;
    const cn = String(c.cn || '').toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z]{4}\d{7}$/.test(cn) || isVirtualCn(cn) || c.isBooking || isBookingSlot(c)) return;
    if (String(c.fe || '').toUpperCase() !== 'E') return;
    if (c.pol && String(c.pol).trim().toUpperCase() !== 'KRPTK') return;   // 수집기 emptylist._rows_from 과 같은 규칙(평택 선적 EDI 의 POL 은 KRPTK)
    out.push({ cn, iso: c.iso || c.iso_orig_parsed || '', pod: String(c.pod || c.npod || '').toUpperCase(), op: c.op || '' });
  });
  return out.sort((a, b) => (a.cn < b.cn ? -1 : a.cn > b.cn ? 1 : 0));
}

export function groupBy(rows) {
  const out = {};
  rows.forEach((r) => { const k = `${r.pod || '?'}|${specKey(r.iso)}`; out[k] = (out[k] || 0) + 1; });
  return out;
}

// PCTC 쪽과 BAPLIE 쪽을 «도착항|규격» 으로 맞대어 표로 — 다른 줄은 diff:true
export function compareBy(pctcBy, bapBy) {
  const keys = Array.from(new Set([...Object.keys(pctcBy || {}), ...Object.keys(bapBy || {})])).sort();
  return keys.map((k) => {
    const [pod, spec] = k.split('|');
    const p = (pctcBy || {})[k] || 0, b = (bapBy || {})[k] || 0;
    return { pod, spec, pctc: p, bap: b, diff: p !== b };
  });
}

export const STATUS_LABEL = {
  official: ['정본', '머스크 EMPTY LOAD LIST 가 와 있습니다 — 정본이 우선입니다.'],
  temp_ok: ['임시', 'PCTC EDI 로 만든 임시 리스트가 폴더에 있습니다.'],
  temp_made: ['임시', '방금 PCTC EDI 로 임시 리스트를 만들었습니다.'],
  no_folder: ['폴더 없음', '항차 폴더를 못 찾아 만들지 않았습니다.'],
  no_real_edi: ['없음', 'EDI 의 엠티가 가상번호뿐이라 만들 수 없습니다.'],
  no_empties: ['없음', 'EDI 에 엠티가 없습니다.'],
  write_fail: ['실패', '파일 쓰기에 실패했습니다.'],
};

// 대시보드가 그리는 머스크 선적 항차 카드 목록. dictAll = ship_bay_dict_v3(코드→{carrier}).
export function maerskEmptyCards(voyages, dictAll) {
  const cards = [];
  Object.entries(voyages || {}).forEach(([vk, v]) => {
    const info = v?.info || {};
    const sec = v?.loading;
    if (!sec || info.loadingDone) return;
    const code = String(vk).split('_')[0].toUpperCase();
    const dc = dictAll?.[code]?.carrier || dictAll?.[String(info.vsl || '').toUpperCase()]?.carrier || '';
    if (!isMaerskVoyage(info, dc)) return;
    const find = info.emptyFind || null;
    const rows = realEmptyRows(sec.ediContainers);
    if (!find && !rows.length && !Object.keys(sec.ediContainers || {}).length) return;
    const by = groupBy(rows);
    // 수집기가 센 값(find.pctc.by)이 있으면 그것, 없으면 앱이 보관소 EDI 에서 직접 센 값
    const pctcBy = find?.pctc?.by || by;
    const bapBy = find?.bap?.by || null;
    const bySpec = {};
    rows.forEach((r) => { (bySpec[r.iso || '??'] = bySpec[r.iso || '??'] || []).push(r.cn); });
    cards.push({
      vk, vsl: info.vsl || code, voy: info.voy_l || info.voy || '',
      status: find?.status || '', file: find?.file || '', official: !!find?.official,
      rows, bySpec, nPctc: rows.length, nBap: find?.bap?.n ?? null,
      table: bapBy ? compareBy(pctcBy, bapBy) : null,
      at: find?.at || 0,
    });
  });
  return cards.sort((a, b) => (a.vk < b.vk ? -1 : 1));
}

// 인쇄·CSV — 규격별로 모아 번호를 한 줄씩
export function emptyCsv(card) {
  const L = ['번호,컨번호,규격,도착항'];
  card.rows.forEach((r, i) => L.push(`${i + 1},${r.cn},${isoShown(r.iso)},${r.pod}`));
  return '﻿' + L.join('\r\n') + '\r\n';
}
