// 카톡/공유 헬퍼 (M3.5.6)
// Web Share API로 폰의 공유창 자동 호출 → 검수원이 단톡방 선택 → 전송

// 텍스트 메시지 공유
export async function shareText(message, title = '검수 보고') {
  if (navigator.share) {
    try {
      await navigator.share({ title, text: message });
      return { method: 'share', success: true };
    } catch (e) {
      if (e.name === 'AbortError') return { method: 'share', success: false, cancelled: true };
      // 공유 실패 → 클립보드 폴백
    }
  }
  // PC 또는 미지원 → 클립보드 복사
  try {
    await navigator.clipboard.writeText(message);
    alert('📋 메시지가 클립보드에 복사되었습니다.\n카톡에 붙여넣기(Ctrl+V) 하세요.\n\n' + message);
    return { method: 'clipboard', success: true };
  } catch (e) {
    // 클립보드도 실패 → 그냥 alert로 보여주기
    alert('아래 메시지를 카톡에 복사하세요:\n\n' + message);
    return { method: 'alert', success: true };
  }
}

// 사진 + 텍스트 공유
export async function shareWithPhoto(message, photoBlob, title = '검수 보고') {
  if (!navigator.share) {
    return shareText(message, title);
  }
  try {
    // 파일 공유 시도
    if (photoBlob && navigator.canShare) {
      const file = new File([photoBlob], 'damage.jpg', { type: 'image/jpeg' });
      const shareData = { title, text: message, files: [file] };
      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return { method: 'share-with-file', success: true };
      }
    }
    // 파일 못 보내면 텍스트만
    await navigator.share({ title, text: message });
    return { method: 'share-text-only', success: true, photoSeparate: true };
  } catch (e) {
    if (e.name === 'AbortError') return { method: 'share', cancelled: true };
    return shareText(message, title);
  }
}

// 메시지 템플릿 — 작업 상태
export function buildWorkStatusMessage({ vsl, voy, action, time, reason, equip }) {
  // action: 'discharge_start', 'discharge_pause', 'discharge_done', 'load_start', ...
  const labels = {
    discharge_start: '🟢 양하 시작',
    discharge_pause: '⏸ 양하 중단',
    discharge_done: '✅ 양하 완료',
    load_start: '🟢 선적 시작',
    load_pause: '⏸ 선적 중단',
    load_done: '✅ 선적 완료',
  };
  const lines = [
    `📍 ${vsl || ''} ${voy || ''}`.trim(),
    `${labels[action] || action}`,
    `시각: ${formatTime(time)}`,
  ];
  if (reason) lines.push(`사유: ${reason}`);
  if (equip) lines.push(equip);
  return lines.join('\n');
}

// 해치커버 메시지
export function buildHatchMessage({ vsl, voy, bays, action, time, equip }) {
  // action: 'open' | 'close'
  const verb = action === 'open' ? '🔓 해치커버 OPEN' : '🔒 해치커버 CLOSE';
  const bayList = (bays || []).join(', ');
  const lines = [
    `📍 ${vsl || ''} ${voy || ''}`.trim(),
    verb,
    `베이: ${bayList}`,
    `총 ${(bays || []).length}장`,
    `시각: ${formatTime(time)}`,
  ];
  if (equip) lines.push(equip);
  return lines.join('\n');
}

// 콘박스 메시지
export function buildConBoxMessage({ vsl, voy, type, count, time, equip }) {
  // type: '20', '40' | count: 1, 2
  const lines = [
    `📍 ${vsl || ''} ${voy || ''}`.trim(),
    `📦 콘박스 ${type}자 ${count}개`,
    `시각: ${formatTime(time)}`,
  ];
  if (equip) lines.push(equip);
  return lines.join('\n');
}

// 실오류 사진 메시지
export function buildSealErrorMessage({ vsl, voy, cn, sealOrig, sealNew, time, equip, note }) {
  const lines = [
    `📍 ${vsl || ''} ${voy || ''}`.trim(),
    `🚨 실오류`,
    `컨번호: ${cn || ''}`,
  ];
  if (sealOrig) lines.push(`기존실: ${sealOrig}`);
  if (sealNew) lines.push(`발견실: ${sealNew}`);
  lines.push(`시각: ${formatTime(time)}`);
  if (note) lines.push(`비고: ${note}`);
  if (equip) lines.push(equip);
  return lines.join('\n');
}

// 데미지 메시지
export function buildDamageMessage({ vsl, voy, cn, types, parts, note, time, equip }) {
  const lines = [
    `📍 ${vsl || ''} ${voy || ''}`.trim(),
    `⚠️ DAMAGE`,
    `컨번호: ${cn || ''}`,
  ];
  if (types && types.length > 0) lines.push(`종류: ${types.join(', ')}`);
  if (parts && parts.length > 0) lines.push(`부위: ${parts.join(', ')}`);
  if (note) lines.push(`설명: ${note}`);
  lines.push(`시각: ${formatTime(time)}`);
  if (equip) lines.push(equip);
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

// 데미지 종류 (영문 표준 + 한글)
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

// 데미지 부위
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

// 장비 번호
export const EQUIPMENT_NUMBERS = ['1호기', '2호기', '3호기', '4호기'];
