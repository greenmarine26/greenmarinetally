// 미르 얼굴 인형 한 벌 — 검수사 원본 그림 위에 눈·입·눈물·땀만 덧그려 기분대로 움직이는 SVG 문자열과 CSS (검수앱 MirFace.jsx · 콘앱 cone.html 이 같은 것을 쓴다)
/* ★ TallyOne 3.57 / ConeOne 2.53 (검수사 2026-09-22 «원하는게 움직임 입니다» → 시안 확인 «이걸로 해주세요»)
   - 얼굴은 검수사가 주신 그림(mir-face.png, 192×192) 그대로다. 그 위에 원본 눈 자리(왼 58,107 · 오른 119,107 · 반지름 13.5)에
     같은 화풍의 눈(홍채·동공·눈꺼풀)을 덧그리고, 입은 원본 웃는 입을 두되 다른 입일 때만 살구색으로 덮고 다시 그린다.
   - 기분 클래스 `mood-<key>`(mir.js [mirMood] 의 key: basic·happy·sad·anxious·hungry·full·bored)가 붙으면 CSS 가 부위를 움직인다.
   - React 도 PNG 도 import 하지 않는다 — 콘앱 번들(mir-core, png 로더 없음)에도 실려야 하기 때문이다. 얼굴 URL 은 부르는 쪽이 넘긴다.
   ⚠ 이 파일이 두 앱의 유일한 인형이다. 검수앱 index.css 나 cone.html 에 같은 규칙을 또 적지 않는다(3.56 의 두 벌 CSS 는 이 판에서 걷었다). */

export const MIR_MOOD_KEYS = ['basic', 'happy', 'sad', 'anxious', 'hungry', 'full', 'bored'];

/** 기분 인형 SVG 문자열. faceUrl = 원본 그림 URL(검수앱은 번들 자산, 콘앱은 파일 안 data URL). id 는 한 화면에 여럿 그릴 때 clipPath 충돌을 막는 접미사. */
export function mirFaceSvg(mood, size, faceUrl, id = '') {
  const k = MIR_MOOD_KEYS.includes(mood) ? mood : 'basic';
  const n = Number(size) || 0;   // 숫자만 문자열에 넣는다(감사 권고 — 나중에 prop 으로 열려도 주입 길이 없게)
  const sz = n > 0 ? ` width="${n}" height="${n}"` : '';
  const u = `${k}${id ? '-' + id : ''}`;
  return `<svg class="mir mood-${k}" viewBox="0 0 192 192"${sz} role="img" aria-label="미르" data-mood="${k}">
<defs><clipPath id="mirEyeL-${u}"><circle cx="58" cy="107" r="13.5"/></clipPath><clipPath id="mirEyeR-${u}"><circle cx="119" cy="107" r="13.5"/></clipPath><clipPath id="mirRound-${u}"><circle cx="96" cy="96" r="96"/></clipPath></defs>
<g clip-path="url(#mirRound-${u})"><rect width="192" height="192" fill="#f7f8fa"/>
<g class="body" style="transform-origin:96px 192px"><g class="head" style="transform-origin:96px 130px">
<image href="${faceUrl}" x="0" y="0" width="192" height="192"/>
<ellipse class="cheek" cx="38" cy="128" rx="10" ry="5.5" fill="#f4a3a3"/><ellipse class="cheek" cx="140" cy="128" rx="10" ry="5.5" fill="#f4a3a3"/>
<g clip-path="url(#mirEyeL-${u})"><circle cx="58" cy="107" r="13.5" fill="#f1bb40"/><g class="pupil" style="transform-origin:58px 107px"><ellipse cx="58" cy="108" rx="5.6" ry="8.6" fill="#1e150d"/><circle cx="55" cy="103" r="2.4" fill="#fff"/><circle cx="61" cy="111" r="1.1" fill="#fff" opacity=".8"/></g><rect class="lid lid-l" x="42" y="78" width="32" height="15" fill="#cbb090" style="transform-origin:58px 93px"/></g>
<g clip-path="url(#mirEyeR-${u})"><circle cx="119" cy="107" r="13.5" fill="#f1bb40"/><g class="pupil" style="transform-origin:119px 107px"><ellipse cx="119" cy="108" rx="5.6" ry="8.6" fill="#1e150d"/><circle cx="116" cy="103" r="2.4" fill="#fff"/><circle cx="122" cy="111" r="1.1" fill="#fff" opacity=".8"/></g><rect class="lid lid-r" x="103" y="78" width="32" height="15" fill="#897964" style="transform-origin:119px 93px"/></g>
<circle cx="58" cy="107" r="13.5" fill="none" stroke="#2a1e14" stroke-width="2.2"/><circle cx="119" cy="107" r="13.5" fill="none" stroke="#2a1e14" stroke-width="2.2"/>
<path class="lid-arc" d="M47 110 Q58 99 69 110 M108 110 Q119 99 130 110" stroke="#2a1e14" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<g class="mouth-sad"><ellipse cx="89" cy="143" rx="14" ry="6.5" fill="#f7f1e8"/><path d="M80 147 Q89 140 98 147" stroke="#2a1e14" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>
<g class="mouth-wavy"><ellipse cx="89" cy="143" rx="14" ry="6.5" fill="#f7f1e8"/><path d="M78 144 L82 140 L86 144 L90 140 L94 144 L98 140 L102 144" stroke="#2a1e14" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
<g class="mouth-open"><ellipse cx="89" cy="143" rx="14" ry="6.5" fill="#f7f1e8"/><ellipse cx="89" cy="144" rx="8" ry="6.2" fill="#7a2e3a"/><ellipse class="tongue" cx="89" cy="147.5" rx="4.6" ry="3" fill="#ef8a9d"/></g>
<path class="drool" d="M97 145 q4 6 0 13 q-3 -5 0 -13 Z" fill="#8fc8ff" style="transform-origin:97px 145px"/>
<path class="tear tear-l" d="M55 122 q5 8 0 14 q-5 -6 0 -14 Z" fill="#7fbfff" style="transform-origin:55px 122px"/><path class="tear tear-r" d="M122 122 q5 8 0 14 q-5 -6 0 -14 Z" fill="#7fbfff" style="transform-origin:122px 122px"/>
<path class="sweat sweat-1" d="M143 84 q6 9 0 16 q-6 -7 0 -16 Z" fill="#8fc8ff" style="transform-origin:143px 84px"/><path class="sweat sweat-2" d="M34 88 q6 9 0 16 q-6 -7 0 -16 Z" fill="#8fc8ff" style="transform-origin:34px 88px"/>
</g></g>
<g class="spark" style="transform-origin:26px 48px"><path d="M26 38 L29 46 L37 48 L29 50 L26 58 L23 50 L15 48 L23 46 Z" fill="#ffd84d"/></g><g class="spark spark-2" style="transform-origin:170px 40px"><path d="M170 32 L172 38 L178 40 L172 42 L170 48 L168 42 L162 40 L168 38 Z" fill="#ffd84d"/></g>
<path class="heart" d="M160 100 c-4 -8 -14 -2 -8 6 l8 8 l8 -8 c6 -8 -4 -14 -8 -6 Z" fill="#ff6f8f"/>
<text class="zz zz-1" x="146" y="66" font-size="13" font-weight="900" fill="#6f8cff" font-family="sans-serif">z</text><text class="zz zz-2" x="156" y="52" font-size="17" font-weight="900" fill="#6f8cff" font-family="sans-serif">Z</text><text class="zz zz-3" x="166" y="38" font-size="21" font-weight="900" fill="#6f8cff" font-family="sans-serif">Z</text>
</g></svg>`;
}

/** 인형을 움직이는 CSS 한 벌. 검수앱은 MirFace.jsx 가, 콘앱은 coneMoodStart 가 <style id="mirFaceCss"> 로 한 번 넣는다. */
export const MIR_FACE_CSS = `
.mir{overflow:visible;display:block}
.mir .lid{transition:transform .25s}
.mir .tear,.mir .sweat,.mir .zz,.mir .heart,.mir .drool,.mir .spark,.mir .cheek,.mir .tongue,.mir .mouth-open,.mir .mouth-sad,.mir .mouth-wavy,.mir .lid-arc{opacity:0}
.mir.mood-basic .lid{animation:mirBlink 4.2s infinite}
@keyframes mirBlink{0%,92%,100%{transform:translateY(0)}95%{transform:translateY(29px)}}
.mir.mood-happy .body{animation:mirHop .5s ease-in-out infinite}
.mir.mood-happy .mouth-open,.mir.mood-happy .cheek{opacity:1}
.mir.mood-happy .spark{opacity:1;animation:mirTwinkle 1s infinite alternate}
.mir.mood-happy .spark-2{animation-delay:.4s}
.mir.mood-happy .heart{opacity:1;animation:mirFloatUp 1.6s ease-out infinite}
@keyframes mirHop{0%,100%{transform:translateY(0)}45%{transform:translateY(-9px) scale(1.03,.97)}}
@keyframes mirTwinkle{from{transform:scale(.6);opacity:.4}to{transform:scale(1.1);opacity:1}}
@keyframes mirFloatUp{0%{transform:translateY(0);opacity:0}20%{opacity:1}100%{transform:translateY(-34px);opacity:0}}
.mir.mood-sad .lid-l{transform:translateY(12px) rotate(-12deg)}.mir.mood-sad .lid-r{transform:translateY(12px) rotate(12deg)}
.mir.mood-sad .mouth-sad{opacity:1}
.mir.mood-sad .tear{opacity:1;animation:mirTear 1.8s ease-in infinite}.mir.mood-sad .tear-r{animation-delay:.9s}
.mir.mood-sad .head{animation:mirDroop 2.6s ease-in-out infinite}
@keyframes mirTear{0%{transform:translateY(0) scale(.6);opacity:0}15%{opacity:1;transform:translateY(2px) scale(1)}100%{transform:translateY(34px) scale(1);opacity:0}}
@keyframes mirDroop{0%,100%{transform:rotate(0)}50%{transform:rotate(-5deg) translateY(3px)}}
.mir.mood-anxious .pupil{animation:mirDart 1.1s steps(1) infinite}
.mir.mood-anxious .lid-l{transform:translateY(6px) rotate(10deg)}.mir.mood-anxious .lid-r{transform:translateY(6px) rotate(-10deg)}
.mir.mood-anxious .mouth-wavy{opacity:1;animation:mirTremble .18s infinite alternate}
.mir.mood-anxious .sweat{opacity:1;animation:mirSweat 1.4s ease-in infinite}.mir.mood-anxious .sweat-2{animation-delay:.6s}
.mir.mood-anxious .head{animation:mirShiver .28s infinite alternate}
@keyframes mirDart{0%{transform:translateX(-5px)}50%{transform:translateX(5px)}100%{transform:translateX(-5px)}}
@keyframes mirTremble{from{transform:translateX(-1px)}to{transform:translateX(1px)}}
@keyframes mirSweat{0%{transform:translateY(0) scale(.5);opacity:0}20%{opacity:1;transform:scale(1)}100%{transform:translateY(28px);opacity:0}}
@keyframes mirShiver{from{transform:translateX(-1.2px) rotate(-1deg)}to{transform:translateX(1.2px) rotate(1deg)}}
.mir.mood-hungry .mouth-open,.mir.mood-hungry .tongue{opacity:1}
.mir.mood-hungry .drool{opacity:1;animation:mirDrool 2.2s ease-in infinite}
.mir.mood-hungry .pupil{transform:translate(3px,2px) scale(1.2)}
.mir.mood-hungry .body{animation:mirRumble 1.3s ease-in-out infinite}
.mir.mood-hungry .cheek{opacity:.7}
@keyframes mirDrool{0%{transform:scaleY(.2);opacity:.6}70%{transform:scaleY(1);opacity:1}100%{transform:scaleY(1.2) translateY(6px);opacity:0}}
@keyframes mirRumble{0%,100%{transform:scale(1)}30%{transform:scale(1.04,.96)}45%{transform:scale(.98,1.02)}60%{transform:scale(1.03,.97)}}
.mir.mood-full .lid{transform:translateY(29px)}.mir.mood-full .lid-arc,.mir.mood-full .cheek{opacity:1}
.mir.mood-full .heart{opacity:1;animation:mirFloatUp 2.6s ease-out infinite}
.mir.mood-full .body{animation:mirSway 3s ease-in-out infinite}
@keyframes mirSway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
.mir.mood-bored .lid{transform:translateY(15px)}
.mir.mood-bored .head{animation:mirNod 3.4s ease-in-out infinite}
.mir.mood-bored .zz{opacity:1;animation:mirZz 2.4s ease-out infinite}.mir.mood-bored .zz-2{animation-delay:.8s}.mir.mood-bored .zz-3{animation-delay:1.6s}
.mir.mood-bored .mouth-open{animation:mirYawn 6s infinite}
@keyframes mirNod{0%,60%,100%{transform:rotate(0)}72%{transform:rotate(9deg) translateY(3px)}84%{transform:rotate(5deg) translateY(1px)}}
@keyframes mirZz{0%{transform:translate(0,0) scale(.6);opacity:0}20%{opacity:1}100%{transform:translate(14px,-30px) scale(1.2);opacity:0}}
@keyframes mirYawn{0%,70%,100%{opacity:0}78%,92%{opacity:1}}
@media (prefers-reduced-motion: reduce){.mir *{animation:none !important}}
`;

/** 문서에 인형 CSS 를 한 번만 넣는다. 서버 렌더·jsdom 등 document 가 없으면 조용히 넘어가지 않고 false 를 돌려준다. */
export function ensureMirFaceCss(doc) {
  const d = doc || (typeof document !== 'undefined' ? document : null);
  if (!d || !d.head) return false;
  if (d.getElementById('mirFaceCss')) return true;
  const st = d.createElement('style'); st.id = 'mirFaceCss'; st.textContent = MIR_FACE_CSS; d.head.appendChild(st);
  return true;
}
