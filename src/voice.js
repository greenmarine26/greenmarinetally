// 한국어 음성 출력 유틸 (V37 핵심 디테일)
// - 숫자: 공/일/이/삼/사/오/육/칠/팔/구
// - 알파벳: 에이/비/씨/디/이/에프/지/에이치/아이/제이/케이/엘/엠/엔/오/피/큐/알/에스/티/유/브이/더블유/엑스/와이/지

const NUM_KO = ['공', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const ALPHA_KO = {
  A: '에이', B: '비', C: '씨', D: '디', E: '이', F: '에프', G: '지',
  H: '에이치', I: '아이', J: '제이', K: '케이', L: '엘', M: '엠',
  N: '엔', O: '오', P: '피', Q: '큐', R: '알', S: '에스', T: '티',
  U: '유', V: '브이', W: '더블유', X: '엑스', Y: '와이', Z: '지',
};

export function spellKo(text) {
  if (!text) return '';
  return String(text).toUpperCase().split('').map(ch => {
    if (/\d/.test(ch)) return NUM_KO[parseInt(ch)];
    if (ALPHA_KO[ch]) return ALPHA_KO[ch];
    return ch;
  }).join(' ');
}

let lastSpeak = 0;
export function speak(text, opts = {}) {
  if (!text) return;
  // 너무 빠른 연속 호출 방지 (200ms 디바운스)
  const now = Date.now();
  if (now - lastSpeak < 200 && !opts.urgent) return;
  lastSpeak = now;
  try {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = opts.rate || 1.3;
    u.pitch = opts.pitch || 1.0;
    u.volume = opts.volume || 1.0;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

// 컨테이너 한 글자씩 + 위치 + 추가 정보
export function speakContainer(c, extras = {}) {
  if (!c) return;
  const last4 = c.l4 || c.cn?.slice(-4) || '';
  const parts = [spellKo(last4)];
  if (c.bay) parts.push(`${parseInt(c.bay)} 베이 ${parseInt(c.row)} 열 ${parseInt(c.tier)} 단`);
  if (extras.xray) parts.push('엑스레이');
  if (c.rf) parts.push(`리퍼${c.tmp ? ' ' + c.tmp + '도' : ''}`);
  if (c.dg) parts.push('위험물');
  if (extras.suffix) parts.push(extras.suffix);
  speak(parts.join(', '));
}

export function speakDone(c) {
  const last4 = c.l4 || c.cn?.slice(-4) || '';
  speak(`${spellKo(last4)} 완료`, { rate: 1.5 });
}

export function stopSpeak() {
  try { window.speechSynthesis.cancel(); } catch {}
}
