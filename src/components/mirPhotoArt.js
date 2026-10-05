// 미르 실사 한 벌 — 기분별 얼굴(스프라이트 한 장)·전신 자세 이름과 움직임 CSS (검수앱 MirFace·MirFab 과 콘앱 cone.html 이 같은 것을 쓴다)
/* ★ TallyOne 4.07 / ConeOne 2.63 (검수사 2026-10-05 «미르를 두발로 서게 하고 안전조끼를 입히면 훨씬 보기 좋을것입니다» · «팔이 없는게 아니고 안전조끼가 잘못 입혀진것임»
   → 실사 미르 20장 Mir_20_clean_nose.zip 제공 → «네 올리고 다음꺼 진행해주세요»)
   - 얼굴(FAB·시트 머리·검색 아바타)은 스프라이트 한 장(mirPhotoData.js, 112px 12칸)에서 칸만 바꿔 보인다 — 코드에 박아 두어 신호가 약해도 얼굴은 뜬다.
   - 전신(시트 위에 서 있는 미르)은 public/mir_art/pNN.webp 파일이다. 장식이라 못 받으면 조용히 안 보일 뿐 질문·답에는 영향이 없다(onerror).
   - 기분 키는 mir.js [mirMood] 의 11가지 + 답을 생각하는 중(think) 한 가지다. 판정은 mir.js 한 벌이고 여기는 그림만 고른다(콘앱도 같은 규칙).
   - 사진이라 눈·입은 움직이지 않는다. 기분마다 몸짓(통통·떨림·흔들·끄덕)만 CSS 로 준다. 표정은 사진 안에 있다.
   ⚠ 원본 zip 의 파일 이름은 5번부터 내용과 어긋난다(예 05_sad_gentle = 놀란 눈, 10_hungry = 클립보드, 11_full_satisfied = 접힌 귀). 그림은 번호가 아니라 **실제 내용**으로 골랐다:
     01 기본 · 02 기쁨 · 03 화남 · 04 도시락 먹는 중 · 05 초조(놀란 눈) · 06 배부름(눈 감고 배) · 07 슬픔(축 처진 귀) · 08 배고픔(올려다보며 배) · 09 휴식(머그잔) · 10 클립보드+펜 ·
     11 지루함(접힌 귀) · 12 지루함 옆눈 · 13 취미(헤드폰+폰) · 14 손 흔들기 · 15 기지개 · 16 상자(미사용) · 17 걷기(미사용) · 18 만세 · 19 작업 준비(클립보드) · 20 턱 괴고 생각.
   ⚠ 이 파일은 React 도 이미지 파일도 import 하지 않는다 — 콘앱 번들(mir-core)에도 실려야 하기 때문이다(스프라이트는 데이터 문자열 모듈). */
import { MIR_SPRITE } from './mirPhotoData.js';

/** 스프라이트 칸 순서(4열×3행). mirPhotoData.js 의 그림 순서와 같아야 한다 — 연막검사가 본다. */
export const MIR_PHOTO_KEYS = ['basic', 'happy', 'sad', 'anxious', 'angry', 'hungry', 'full', 'bored', 'rest', 'hobby', 'prep', 'think'];
const COLS = 4, ROWS = 3;

/** 기분 → 전신 사진 번호(여럿이면 시트를 열 때마다 하나를 고른다). 번호는 public/mir_art/pNN.webp. */
export const MIR_POSES = { basic: [1], happy: [2, 14, 18], sad: [7], anxious: [5], angry: [3], hungry: [8], full: [6, 4], bored: [11, 12], rest: [9, 15], hobby: [13], prep: [19, 10], think: [20] };

/** 모르는 기분은 기본으로(조용히 비우지 않는다). */
export function mirPhotoKey(mood) { return MIR_PHOTO_KEYS.includes(mood) ? mood : 'basic'; }

/** 얼굴 한 칸 HTML. still=true 면 움직임 없이(검색창 옆 작은 아바타). 숫자만 문자열에 넣는다. */
export function mirPhotoHtml(mood, size, still = false) {
  const k = mirPhotoKey(mood);
  const n = Number(size) || 0;
  const st = n > 0 ? ` style="width:${n}px;height:${n}px"` : '';
  //  정지 아바타(검색창 옆)는 옆 글자가 «미르 …» 라 따로 읽히지 않게 숨기고, 버튼·시트 머리의 얼굴만 «미르» 로 읽힌다(감사 N3).
  const a11y = still ? 'aria-hidden="true"' : 'role="img" aria-label="미르"';
  return `<span class="mirp mood-${k}${still ? ' mirp-still' : ''}"${st} ${a11y} data-mood="${k}"><span class="mirp-img mirp-m-${k}"></span></span>`;
}

/** 기분에 맞는 전신 사진 번호. seed 가 같으면 같은 자세다(시트가 열려 있는 동안 자세가 흔들리지 않게). */
export function mirPoseNo(mood, seed = 0) {
  const list = MIR_POSES[mirPhotoKey(mood)];
  const s = Math.abs(Math.floor(Number(seed) || 0));
  return list[s % list.length];
}

/** 전신 사진 URL. base 는 파일 폴더(문서 기준 상대 경로 — 검수앱·콘앱 모두 루트의 mir_art/). */
export function mirHeroSrc(mood, seed = 0, base = './mir_art/') {
  const b = String(base).replace(/[^A-Za-z0-9_./-]/g, '');
  return `${b}p${String(mirPoseNo(mood, seed)).padStart(2, '0')}.webp`;
}

/** 전신 사진 HTML(콘앱용). 못 받으면 숨긴다 — 장식이다. */
export function mirHeroHtml(mood, seed = 0, base = './mir_art/', height = 160) {
  const k = mirPhotoKey(mood);
  const h = Number(height) || 160;
  return `<img class="mirp-hero mood-${k}" src="${mirHeroSrc(k, seed, base)}" alt="미르" draggable="false" style="height:${h}px" onerror="this.style.visibility='hidden'">`;
}

function _pos(i) {
  const x = ((i % COLS) / (COLS - 1) * 100).toFixed(4).replace(/\.?0+$/, '');
  const y = (Math.floor(i / COLS) / (ROWS - 1) * 100).toFixed(4).replace(/\.?0+$/, '');
  return `${x || 0}% ${y || 0}%`;
}

/** 기분마다 몸짓(퍼센트 단위라 44px 에서도 120px 에서도 같은 비율로 움직인다). */
export const MIR_PHOTO_CSS = `
.mirp{display:inline-block;position:relative;overflow:hidden;border-radius:50%;background:#f7f8fa;line-height:0;vertical-align:middle;flex:none;animation:mirpPop .35s ease-out}
.mirp-img{position:absolute;left:0;top:0;width:100%;height:100%;background-image:url("${MIR_SPRITE}");background-repeat:no-repeat;background-size:${COLS * 100}% ${ROWS * 100}%;transform-origin:50% 100%}
${MIR_PHOTO_KEYS.map((k, i) => `.mirp-m-${k}{background-position:${_pos(i)}}`).join('\n')}
@keyframes mirpPop{0%{transform:scale(.82);opacity:.2}60%{transform:scale(1.07);opacity:1}100%{transform:scale(1)}}
.mirp.mood-basic .mirp-img,.mirp.mood-rest .mirp-img{animation:mirpBreathe 4.2s ease-in-out infinite}
.mirp.mood-happy .mirp-img{animation:mirpHop .6s ease-in-out infinite}
.mirp.mood-sad .mirp-img{animation:mirpDroop 3s ease-in-out infinite}
.mirp.mood-anxious .mirp-img{animation:mirpShiver .28s infinite alternate}
.mirp.mood-angry .mirp-img{animation:mirpRage .12s infinite alternate}
.mirp.mood-hungry .mirp-img{animation:mirpRumble 1.3s ease-in-out infinite}
.mirp.mood-full .mirp-img{animation:mirpSway 3s ease-in-out infinite}
.mirp.mood-bored .mirp-img{animation:mirpNod 3.4s ease-in-out infinite}
.mirp.mood-hobby .mirp-img{animation:mirpBob 1.2s ease-in-out infinite}
.mirp.mood-prep .mirp-img,.mirp.mood-think .mirp-img{animation:mirpTilt 3s ease-in-out infinite}
.mirp.mood-think .mirp-img{animation-duration:1.5s}
@keyframes mirpBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
@keyframes mirpHop{0%,100%{transform:translateY(0)}45%{transform:translateY(-7%) scale(1.03,.97)}}
@keyframes mirpDroop{0%,100%{transform:rotate(0)}50%{transform:rotate(-4deg) translateY(3%)}}
@keyframes mirpShiver{from{transform:translateX(-1.5%) rotate(-1deg)}to{transform:translateX(1.5%) rotate(1deg)}}
@keyframes mirpRage{from{transform:translateX(-1.2%) rotate(-1.2deg)}to{transform:translateX(1.2%) rotate(1.2deg)}}
@keyframes mirpRumble{0%,100%{transform:scale(1)}30%{transform:scale(1.05,.96)}45%{transform:scale(.98,1.03)}60%{transform:scale(1.04,.97)}}
@keyframes mirpSway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
@keyframes mirpNod{0%,60%,100%{transform:rotate(0)}72%{transform:rotate(7deg) translateY(3%)}84%{transform:rotate(4deg) translateY(1%)}}
@keyframes mirpBob{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
@keyframes mirpTilt{0%,100%{transform:rotate(0)}50%{transform:rotate(-4deg) translateY(1%)}}
.mirp-hero{display:block;width:auto;max-width:none;transform-origin:50% 100%;pointer-events:none;user-select:none;-webkit-user-select:none;filter:drop-shadow(0 3px 4px rgba(0,0,0,.5));animation:mirpHeroIn .4s ease-out,mirpHeroBreathe 4.2s ease-in-out .4s infinite}
.mirp-hero.mood-happy{animation:mirpHeroIn .4s ease-out,mirpHeroHop .8s ease-in-out .4s infinite}
.mirp-hero.mood-hobby{animation:mirpHeroIn .4s ease-out,mirpHeroBob 1.4s ease-in-out .4s infinite}
.mirp-hero.mood-angry,.mirp-hero.mood-anxious{animation:mirpHeroIn .4s ease-out,mirpHeroShiver .22s infinite alternate .4s}
.mirp-hero.mood-sad{animation:mirpHeroIn .4s ease-out,mirpHeroDroop 3.2s ease-in-out .4s infinite}
.mirp-hero.mood-hungry{animation:mirpHeroIn .4s ease-out,mirpHeroRumble 1.4s ease-in-out .4s infinite}
@keyframes mirpHeroIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes mirpHeroBreathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.012,1.022)}}
@keyframes mirpHeroHop{0%,100%{transform:translateY(0)}45%{transform:translateY(-6px) scale(1.02,.98)}}
@keyframes mirpHeroBob{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
@keyframes mirpHeroShiver{from{transform:translateX(-1.5px) rotate(-.5deg)}to{transform:translateX(1.5px) rotate(.5deg)}}
@keyframes mirpHeroDroop{0%,100%{transform:rotate(0)}50%{transform:rotate(-1.5deg) translateY(2px)}}
@keyframes mirpHeroRumble{0%,100%{transform:scale(1)}30%{transform:scale(1.03,.98)}45%{transform:scale(.99,1.015)}60%{transform:scale(1.025,.985)}}
.mirp-still,.mirp-still .mirp-img{animation:none !important}
@media (prefers-reduced-motion: reduce){.mirp,.mirp *,.mirp-hero{animation:none !important}}
`;

/** 문서에 실사 CSS 를 한 번만 넣는다. document 가 없으면 조용히 넘어가지 않고 false 를 돌려준다. */
export function ensureMirPhotoCss(doc) {
  const d = doc || (typeof document !== 'undefined' ? document : null);
  if (!d || !d.head) return false;
  if (d.getElementById('mirPhotoCss')) return true;
  const st = d.createElement('style'); st.id = 'mirPhotoCss'; st.textContent = MIR_PHOTO_CSS; d.head.appendChild(st);
  return true;
}
