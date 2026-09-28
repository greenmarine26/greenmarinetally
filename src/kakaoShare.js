// 작업 보고 카톡 공유 헬퍼 (M3.5.6-fix)
// Web Share API + 사진 위에 자막 합성
import { formatHatchBays } from './utils.js';   // 2.98-12: 해치 보고 베이 표기 «17 (18)19» 한 벌

// 텍스트 메시지 공유
export async function shareText(message, title = '검수 보고') {
  if (navigator.share) {
    try {
      await navigator.share({ title, text: message });
      return { method: 'share', success: true };
    } catch (e) {
      if (e.name === 'AbortError') return { method: 'share', success: false, cancelled: true };
    }
  }
  try {
    await navigator.clipboard.writeText(message);
    alert('📋 메시지가 클립보드에 복사되었습니다.\n카톡에 붙여넣기(Ctrl+V) 하세요.\n\n' + message);
    return { method: 'clipboard', success: true };
  } catch (e) {
    alert('아래 메시지를 카톡에 복사하세요:\n\n' + message);
    return { method: 'alert', success: true };
  }
}

// M3.5.6-fix: 사진 위에 정보 자막 합성 후 공유
//
// TallyOne 1.8-08 — **카톡에서 사진이 깨지던 원인** (검수사 신고 2026-08-04, 갤럭시)
//   M5.77 에서 호출부(PhotoReportModal)가 사진 2장을 **배열**로 넘기게 바뀌었는데
//   이 함수는 blob 하나만 받도록 그대로였다. 그래서:
//     URL.createObjectURL([blob, blob])  → TypeError → catch → composedBlob = 배열
//     new File([[blob, blob]], 'report.jpg', {type:'image/jpeg'})
//   File 생성자는 내부 배열을 BlobPart 로 못 보고 **문자열로 변환**한다.
//   결과: 카톡에 간 것은 `"[object Blob],[object Blob]"` 40바이트 텍스트를 담은 report.jpg.
//   당연히 이미지로 안 열려 깨진 아이콘만 보였다.
//   → 배열·단일 둘 다 받고, **장마다 따로 합성해 files 에 나란히 담는다.**
//
// ⚠ 합성 실패 시 원본을 `image/jpeg` 로 **타입 위조하지 않는다**(3금지 3번 — 조용히 실패 금지).
//   원본 타입 그대로 보내고 무엇이 실패했는지 로그에 남긴다.
export async function shareWithPhoto(message, photos, title = '검수 보고') {
  const list = (Array.isArray(photos) ? photos : [photos]).filter(Boolean);
  console.log('[shareWithPhoto] 시작', { title, count: list.length, sizes: list.map(b => b?.size) });

  const files = [];
  let composeFail = 0;
  for (let i = 0; i < list.length; i++) {
    let b = list[i];
    try {
      b = await composePhotoWithCaption(list[i], message);
    } catch (e) {
      composeFail += 1;
      console.error(`[shareWithPhoto] ${i + 1}번째 사진 합성 실패 — 원본 사용:`, e);
      b = list[i];
    }
    const ext = (b?.type === 'image/png') ? 'png' : 'jpg';
    files.push(new File([b], `report${list.length > 1 ? i + 1 : ''}.${ext}`,
      { type: b?.type || 'image/jpeg' }));
  }
  console.log('[shareWithPhoto] 파일 준비:', files.map(f => `${f.name} ${f.size}B ${f.type}`),
    composeFail ? `(합성 실패 ${composeFail}장)` : '');

  // navigator.share 미지원 (PC 등)
  if (!navigator.share) {
    console.log('[shareWithPhoto] navigator.share 미지원 - 클립보드 폴백');
    return shareText(message, title);
  }

  try {
    if (files.length && navigator.canShare) {
      // 자막을 사진에 이미 넣었으므로 text 는 넣지 않는다 — 카톡이 텍스트를 우선 처리하면
      //   사진이 첨부로 안 붙는다(검수사 실측: 글자는 안 가고 이미지만 갔다).
      const shareData = { title, files };
      const canShareFile = navigator.canShare(shareData);
      console.log('[shareWithPhoto] canShare(파일):', canShareFile);
      if (canShareFile) {
        await navigator.share(shareData);
        console.log('[shareWithPhoto] 파일 공유 성공');
        return { method: 'share-with-file', success: true, files: files.length };
      }
    }
    // 파일 공유 안 되면 텍스트만이라도
    console.log('[shareWithPhoto] 파일 공유 불가 - 텍스트만 공유');
    try { await navigator.clipboard.writeText(message); } catch { /* 무시 */ }
    await navigator.share({ title, text: message });
    return { method: 'share-text-only', success: true };
  } catch (e) {
    if (e.name === 'AbortError') {
      console.log('[shareWithPhoto] 사용자 취소');
      return { method: 'share', cancelled: true };
    }
    console.error('[shareWithPhoto] 공유 오류:', e);
    return shareText(message, title);
  }
}

// Canvas로 사진 위에 자막 합성 (M3.5.6-fix2: 모바일 안정성 강화)
async function composePhotoWithCaption(photoBlob, message) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(photoBlob);
    const img = new Image();
    img.onload = () => {
      try {
        // 모바일 메모리 보호 - 최대 1080px (큰 사진은 자동 축소)
        const MAX_W = 1080;
        const ratio = img.width > MAX_W ? MAX_W / img.width : 1;
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        console.log('[composePhoto] 원본:', img.width, 'x', img.height, '→ 합성:', w, 'x', h);

        const lines = (message || '').split('\n').filter(l => l.trim());
        // 폰트 크기 = 사진 너비 비례 (작은 사진은 작게, 큰 사진은 크게)
        const baseFont = Math.max(18, Math.round(w / 35));
        const headerFont = Math.round(baseFont * 1.2);
        const lineHeight = Math.round(baseFont * 1.5);
        const padding = Math.round(baseFont * 0.8);
        const captionH = lines.length * lineHeight + padding * 2;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h + captionH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('canvas context 실패'));
          return;
        }

        // 배경 흰색
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 사진
        ctx.drawImage(img, 0, 0, w, h);

        // 자막 배경 (어두운 색)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, h, w, captionH);

        // 자막 위 강조 라인
        ctx.fillStyle = '#10b981';
        ctx.fillRect(0, h, w, Math.max(3, Math.round(baseFont / 6)));

        ctx.textBaseline = 'top';
        let y = h + padding;
        lines.forEach((line, i) => {
          if (i === 0) {
            ctx.font = `bold ${headerFont}px -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`;
            ctx.fillStyle = '#fbbf24';
          } else {
            ctx.font = `bold ${baseFont}px -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`;
            ctx.fillStyle = '#ffffff';
          }
          ctx.fillText(line, padding, y);
          y += lineHeight;
        });

        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl);
          if (blob) {
            console.log('[composePhoto] 합성 완료:', blob.size, 'bytes');
            resolve(blob);
          } else {
            reject(new Error('toBlob 실패'));
          }
        }, 'image/jpeg', 0.85);
      } catch (e) {
        URL.revokeObjectURL(objectUrl);
        reject(e);
      }
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(objectUrl);
      console.error('[composePhoto] 이미지 로드 실패', e);
      reject(new Error('이미지 로드 실패'));
    };
    img.src = objectUrl;
  });
}

// 메시지 빌더 - 모두 장비 맨 앞
export function buildWorkStatusMessage({ vsl, voy, action, time, reason, equip }) {
  const labels = {
    discharge_start: '🟢 양하 시작',
    discharge_pause: '⏸ 양하 중단',
    discharge_done: '✅ 양하 완료',
    loading_start: '🟢 선적 시작',
    loading_pause: '⏸ 선적 중단',
    loading_done: '✅ 선적 완료',
  };
  const lines = [];
  if (equip) lines.push(`🏗 ${equip}`);
  lines.push(`📍 ${vsl || ''} ${voy || ''}`.trim());
  lines.push(`${labels[action] || action}`);
  lines.push(`시각: ${formatTime(time)}`);
  if (reason) lines.push(`사유: ${reason}`);
  return lines.join('\n');
}

export function buildHatchMessage({ vsl, voy, bays, action, time, equip, panelCount }) {
  const verb = action === 'open' ? '🔓 해치커버 OPEN' : '🔒 해치커버 CLOSE';
  // 2.98-12: 현장 표기 그대로 «21 (22)23» — (작은 짝수)(큰 홀수) 도메인 불변.
  const bayList = formatHatchBays(bays) || (bays || []).join(', ');
  const lines = [];
  if (equip) lines.push(`🏗 ${equip}`);
  lines.push(`📍 ${vsl || ''} ${voy || ''}`.trim());
  lines.push(verb);
  lines.push(`베이: ${bayList}`);
  // V7.94-22: 해치커버 장수 = 매트릭스 hatchCount 합 (panelCount). 없으면 베이 개수 폴백(구 동작).
  const panels = (typeof panelCount === 'number' && panelCount > 0) ? panelCount : (bays || []).length;
  lines.push(`총 ${panels}장`);
  lines.push(`시각: ${formatTime(time)}`);
  return lines.join('\n');
}

export function buildConBoxMessage({ vsl, voy, type, count, time, equip }) {
  const lines = [];
  if (equip) lines.push(`🏗 ${equip}`);
  lines.push(`📍 ${vsl || ''} ${voy || ''}`.trim());
  lines.push(`📦 콘박스 ${type}자 ${count}개`);
  lines.push(`시각: ${formatTime(time)}`);
  return lines.join('\n');
}

export function buildSealErrorMessage({ vsl, voy, cn, sealOrig, sealNew, time, equip, note }) {
  const lines = [];
  if (equip) lines.push(`🏗 ${equip}`);
  lines.push(`📍 ${vsl || ''} ${voy || ''}`.trim());
  lines.push(`🚨 실오류`);
  lines.push(`컨번호: ${cn || ''}`);
  if (sealOrig) lines.push(`기존실: ${sealOrig}`);
  if (sealNew) lines.push(`발견실: ${sealNew}`);
  lines.push(`시각: ${formatTime(time)}`);
  if (note) lines.push(`비고: ${note}`);
  return lines.join('\n');
}

export function buildDamageMessage({ vsl, voy, cn, types, parts, note, time, equip }) {
  const lines = [];
  if (equip) lines.push(`🏗 ${equip}`);
  lines.push(`📍 ${vsl || ''} ${voy || ''}`.trim());
  lines.push(`⚠️ DAMAGE`);
  lines.push(`컨번호: ${cn || ''}`);
  if (types && types.length > 0) lines.push(`종류: ${types.join(', ')}`);
  if (parts && parts.length > 0) lines.push(`부위: ${parts.join(', ')}`);
  if (note) lines.push(`설명: ${note}`);
  lines.push(`시각: ${formatTime(time)}`);
  return lines.join('\n');
}

function formatTime(t) {
  const d = t instanceof Date ? t : new Date(t || Date.now());
  return d.toLocaleString('ko-KR', {
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: false
  });
}

// 데미지 종류
export const DAMAGE_TYPES = [
  { code: 'DENTED', label: 'DENTED (찌그러짐)' },
  { code: 'BENT', label: 'BENT (휘어짐)' },
  { code: 'BULGED', label: 'BULGED (튀어나옴)' },
  { code: 'PUSHED IN', label: 'PUSHED IN (밀려들어감)' },
  { code: 'HOLE', label: 'HOLE (구멍)' },
  { code: 'TORN', label: 'TORN (찢어짐)' },
  { code: 'CUT', label: 'CUT (베임)' },
  { code: 'SCRATCH', label: 'SCRATCH (긁힘)' },
  { code: 'CRACKED', label: 'CRACKED (균열)' },
  { code: 'BROKEN', label: 'BROKEN (파손)' },
  { code: 'LOOSE', label: 'LOOSE (헐거움)' },
  { code: 'MISSING', label: 'MISSING (결손)' },
  { code: 'RUST', label: 'RUST (부식)' },
  { code: 'DIRTY', label: 'DIRTY (오염)' },
  { code: 'WET', label: 'WET (젖음)' },
  { code: 'CONTAMINATED', label: 'CONTAMINATED (오염물)' },
];

export const DAMAGE_PARTS = [
  { code: 'ROOF', label: 'ROOF (지붕)' },
  { code: 'FLOOR', label: 'FLOOR (바닥)' },
  { code: 'LEFT SIDE', label: 'LEFT SIDE (좌측)' },
  { code: 'RIGHT SIDE', label: 'RIGHT SIDE (우측)' },
  { code: 'FRONT END', label: 'FRONT END (전면)' },
  { code: 'BACK END/DOOR', label: 'BACK END (후면/도어)' },
  { code: 'DOOR HANDLE', label: 'DOOR HANDLE (도어 핸들)' },
  { code: 'DOOR LATCH', label: 'DOOR LATCH (도어 잠금)' },
  { code: 'DOOR HINGE', label: 'DOOR HINGE (도어 경첩)' },
  { code: 'DOOR GASKET', label: 'DOOR GASKET (도어 가스켓)' },
  { code: 'CORNER POST', label: 'CORNER POST (코너기둥)' },
  { code: 'LOCK ROD', label: 'LOCK ROD (잠금봉)' },
  { code: 'SEAL', label: 'SEAL (봉인)' },
];

//  ★ 3.63 — 카페리 17:00 주간 작업보고(갱별) 카톡 글. rep = utils.buildGangShiftReport 의 결과 한 벌(화면·음성과 같은 값).
//    gangNos 가 있으면 그 호기만(검수원 폰 — 내 갱), 비면 갱 전부. 갱별 규격표가 없는 배(대수만)는 배 전체 규격표를 뒤에 붙인다.
//    형식은 검수사가 본 미리보기(2026-09-27 «네» · «갱별 규격표까지») 그대로 — 📍 배 항차 / 📋 제목 / 🏗 호기 / ■ 양하·선적 / 규격 줄 / 시각.
export function buildFerry1700Message({ vsl, voy, rep, gangNos = null, recomputed = false }) {
  const _night = rep && rep.shift === '야간';   // 3.64: 보관한 야간(05:30 마감) 보고도 같은 글 모양
  const L = [`📍 ${vsl || ''} ${voy || ''}`.trim(), _night ? '📋 야간 작업보고 (05:30 마감)' : '📋 주간 작업보고 (17:00 마감)'];
  const side = (label, r, withTable = true) => {
    if (!r || r.none) return;
    if (r.excluded) { L.push(`■ ${label} — 작업 완료`); return; }
    L.push(`■ ${label} — ${r.basis} ${r.total.total}대 (완료 ${r.doneTotal} · 잔여 ${r.remainTotal})`);
    if (!withTable || r.countsOnly || !r.tbl) return;
    for (const [nm, o] of [['20ft', r.tbl.s20], ['40ft', r.tbl.s40], ['45ft', r.tbl.s45]]) L.push(`  ${nm}  F ${o.F} · E ${o.E}`);
    L.push(`  계  F ${r.total.F} · E ${r.total.E}`);
  };
  const all = (rep && rep.gangs) || [];
  const gangs = gangNos && gangNos.length ? all.filter((g) => gangNos.includes(g.no)) : all;
  if (!gangs.length) { side('양하', rep && rep.ship && rep.ship.discharge); side('선적', rep && rep.ship && rep.ship.loading); }
  else {
    for (const g of gangs) { L.push(`🏗 ${g.no}호기`); side('양하', g.discharge); side('선적', g.loading); }
    if (!rep.perGang || rep.shipTable || (rep.doneUnsure && rep.postCut > 0)) {   // 3.66-02: 대수만 갱이 섞이면 배 전체 표 · 이유
      const q = new Date(rep.qcAt || Date.now());
      const _tail = rep.postCut > 0 ? ` — 터미널 호기 집계 대수 ${String(q.getHours()).padStart(2, '0')}:${String(q.getMinutes()).padStart(2, '0')} 값, ${_night ? '05:30' : '17:00'} 뒤 ${rep.postCut}대 포함` : ' — 터미널 호기 집계 대수';
      //  3.66-03: 괄호는 실제로 나간 모양대로 — 표가 하나도 없으면 «없음», 대수만 갱이 섞이면 «대수만 나간 갱은», 표만 있으면(마감 뒤 섞임 안내뿐) 호기 집계 시각만(감사 — remainOff·전부 완료에도 «작업량 기준 갱은»)
      const _live = (r) => r && !r.none && !r.excluded;
      const _hasTbl = gangs.some((g) => [g.discharge, g.loading].some((r) => _live(r) && !r.countsOnly && r.tbl));
      const _hasCnt = gangs.some((g) => [g.discharge, g.loading].some((r) => _live(r) && r.countsOnly));
      const _t2 = _tail.replace(' — 터미널 호기 집계 대수', '');
      const _paren = !rep.perGang || !_hasTbl ? `(갱별 규격표 없음${_tail})` : (_hasCnt ? `(대수만 나간 갱은 터미널 호기 집계 대수${_t2})` : (rep.postCut > 0 ? `(터미널 호기 집계${_t2})` : ''));
      if (_paren) L.push(_paren);
      L.push('▶ 배 전체'); side('양하', rep.ship.discharge); side('선적', rep.ship.loading);
    }
  }
  if (recomputed) L.push('(마감 때 적어 둔 보고가 없어 지금 자료로 다시 센 값 — 갱 숫자는 조금 다를 수 있음)');   // 3.64: 화면 안내와 같은 말
  const d = new Date((rep && rep.cutMs) || Date.now());
  L.push(`시각: ${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${_night ? '05:30' : '17:00'}`);
  return L.join('\n');
}
