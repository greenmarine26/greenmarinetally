// 해치커버 자동 판정 사건을 작업 보고(reports)에 적는 한 벌 — 베이뷰 따라가기(자동 기록)와 알림 배너([보고])가 같이 쓴다. 검수원이 직접 보고한 것이 있으면 안 적는다.
//   검수사 2026-09-15 «검수원 입력이 있으면 그건 우선 적용이고 입력이 없다면 따라가기 모드가 아닌 경우엔 알림을 보내야 합니다» ·
//   «네 그렇게 입력해도 됩니다. 틀리면 마지막에 수석이 수정할테니까요» — 자동 기록은 auto:true 표식을 달고 수석 보드·타임시트에 그대로 실린다(시각은 eventTs = 공백 첫머리).
import { fbAddWorkReport } from './firebase.js';
import { buildHatchMessage, shareText } from './kakaoShare.js';

const pad2 = (n) => String(n).padStart(2, '0');
export const fmtHm = (ms) => { const d = new Date(ms); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };

/** 사건 → 카톡·보고 문장. 기존 buildHatchMessage(한 벌) 뒤에 «판정 근거» 한 줄만 붙인다. */
export function buildAutoHatchMessage(ev, { vsl, voy, equip, panelCount }) {
  const base = buildHatchMessage({ vsl, voy, bays: ev.bays, action: ev.action, time: ev.from, equip: ev.crane ? `${ev.crane}호기` : equip, panelCount });
  const how = ev.src === 'term' ? `터미널 실적 공백 ${fmtHm(ev.from)}~${fmtHm(ev.to)} (${ev.gapMin}분)` : `터미널 실적으로 추정 ${fmtHm(ev.from)}~${fmtHm(ev.to)}`;
  return `${base}\n판정: ${how}${ev.crane ? ` · ${ev.crane}호기` : ''} (자동)`;
}

/** 사건을 reports 에 적는다. 되돌리기는 수석 대시보드에서(검수사 «틀리면 마지막에 수석이 수정»). share=true 면 카톡 공유창까지 연다. */
export async function recordHatchEvent(voyageKey, ev, { vsl, voy, equip, panelCount, share = false, by = '' } = {}) {
  const message = buildAutoHatchMessage(ev, { vsl, voy, equip, panelCount });
  const ts = await fbAddWorkReport(voyageKey, {
    //  호기는 판정이 붙인 크레인이 먼저(실적이 말하는 것) — 못 붙인 추정 사건만 내 호기로 적는다(수석이 고칠 수 있게 src:'est' 가 같이 간다).
    type: 'hatch', action: ev.action, mode: ev.mode || '', bays: ev.bays.map((b) => pad2(b)), equip: ev.crane ? `${ev.crane}호기` : (equip || ''), panelCount: panelCount || 0,
    message, auto: true, eventTs: ev.from, eventEnd: ev.to, gapMin: ev.gapMin, src: ev.src, by: by || '',
  });
  if (share) await shareText(message, '해치커버');
  return ts;
}
