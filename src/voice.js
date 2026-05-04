// V37 음성 함수 100% 이식 — 검증된 한 글자씩 한국어 발음
// 숫자: 공/일/이/삼/사/오/육/칠/팔/구
// 알파벳: 에이/비/씨/디/...
// M3.1: speak() 시 좌표 패턴(16-01-86)을 자동으로 한국어로 변환

import { spellPosString } from './utils.js';

const NUM_KO = ['공', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const ALPHA_KO = {
  A: '에이', B: '비', C: '씨', D: '디', E: '이', F: '에프', G: '지',
  H: '에이치', I: '아이', J: '제이', K: '케이', L: '엘', M: '엠',
  N: '엔', O: '오', P: '피', Q: '큐', R: '알', S: '에스', T: '티',
  U: '유', V: '브이', W: '더블유', X: '엑스', Y: '와이', Z: '지',
};

// 한 글자씩 한국어로 풀어 읽기 (공백으로 구분)
export function spellKo(text) {
  if (!text) return '';
  return String(text).toUpperCase().split('').map(ch => {
    if (/\d/.test(ch)) return NUM_KO[parseInt(ch)];
    if (ALPHA_KO[ch]) return ALPHA_KO[ch];
    return ch;
  }).join(' ');
}

// 음성 인식용: 한국어 숫자 → 아라비아
const KOR_DIGITS_RECOGNIZE = [
  ['영','0'],['공','0'],['일','1'],['이','2'],['삼','3'],['사','4'],
  ['오','5'],['육','6'],['칠','7'],['팔','8'],['구','9'],
  ['하나','1'],['둘','2'],['셋','3'],['넷','4'],['다섯','5'],
  ['여섯','6'],['일곱','7'],['여덟','8'],['아홉','9'],['열','']
];

export function parseSpokenDigits(text) {
  if (!text) return '';
  let s = text.toLowerCase();
  const ENG = [['zero','0'],['oh','0'],['one','1'],['two','2'],['three','3'],
               ['four','4'],['five','5'],['six','6'],['seven','7'],['eight','8'],['nine','9']];
  for (const [k, v] of ENG) s = s.split(k).join(v);
  s = s.replace(/\s+/g, '');
  const sorted = [...KOR_DIGITS_RECOGNIZE].sort((a,b) => b[0].length - a[0].length);
  for (const [k, v] of sorted) s = s.split(k).join(v);
  const matches = s.match(/\d+/g);
  if (!matches) return '';
  const allDigits = matches.join('');
  if (allDigits.length >= 4) return allDigits.slice(-4);
  return allDigits;
}

// 일반 텍스트 음성 (디바운스 X — V37처럼 즉시)
// M3.1: 좌표 패턴(16-01-86) 발견 시 "십육번 베이 공일에 팔육"으로 자동 변환
export function speak(text, opts = {}) {
  if (!text) return;
  try {
    if (window.speechSynthesis.speaking && !opts.append) {
      window.speechSynthesis.cancel();
    }
    // M3.1: 좌표 자동 한국어화 (AI 답변 등 자유 텍스트에서 좌표를 자연스럽게 읽기)
    const spoken = spellPosString(text);
    const u = new SpeechSynthesisUtterance(spoken);
    u.lang = 'ko-KR';
    u.rate = opts.rate || 1.3;
    u.pitch = opts.pitch || 1.0;
    u.volume = opts.volume || 1.0;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

// 컨테이너 음성 — V37 speakContainer 100% 이식
// 컨번호, 실번호, 위치, X-RAY 모두 안내
export function speakContainer(c, opts = {}) {
  if (!c) return;
  try {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    const cn = c.cn || '';
    const last4 = c.l4 || cn.slice(-4);
    const cnSpoken = spellKo(last4);

    const parts = [];

    // X-RAY 우선 안내
    if (opts.xray) {
      parts.push('엑스레이 대상');
    }

    // 컨번호 끝 4자리
    parts.push(cnSpoken);

    // 위치 (M3.1: 베이는 정수, row/tier는 자릿수별 발음)
    if (c.bay) {
      const bayN = parseInt(c.bay, 10);
      if (!isNaN(bayN)) parts.push(`${bayN}번 베이`);
      if (c.row) parts.push(spellKo(c.row) + '에');
      if (c.tier) parts.push(spellKo(c.tier));
    }

    // 실번호 (있으면)
    if (c.sl && c.sl.trim()) {
      parts.push(`실번호 ${spellKo(c.sl.trim())}`);
    }

    // 특수 화물
    if (c.dg) parts.push(`디지`);
    if (c.rf && c.tmp) parts.push(`리퍼 ${c.tmp}도`);
    else if (c.rf) parts.push('리퍼');
    if (c.fr) parts.push('에프알');
    if (c.ot) parts.push('오티');
    if (c.tk) parts.push('탱크');

    // POD (선적 모드일 때 유용)
    if (opts.suffix) parts.push(opts.suffix);

    const text = parts.join(', ');
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = opts.rate || 1.2;
    u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

// 검수 완료 — 짧고 빠르게
export function speakDone(c) {
  if (!c) return;
  const last4 = c.l4 || c.cn?.slice(-4) || '';
  speak(`${spellKo(last4)} 완료`, { rate: 1.5 });
}

// 오류 음성
export function speakError(text) {
  speak(text, { rate: 1.2, pitch: 0.9 });
}

export function stopSpeak() {
  try { window.speechSynthesis.cancel(); } catch {}
}
