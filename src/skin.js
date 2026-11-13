// 화면 고르기(TallyOne 5.00) — 1안 어두운 고대비 · 2안 밝은 간결 · 3안 큰 글자 현장. <html data-skin="N"> 하나로 CSS 변수만 갈린다(화면 코드는 한 벌).
//
//   검수사 2026-11-12 20:33 «화면 디자인은 심플했으면 좋겠습니다. 시인성이 뛰어나야 하고 보기도 좋아야 합니다 … 화면마다 조금씩 이질감이 들어서 입니다.»
//   20:40 «화면을 고르는것도 1안 2안 3안이 있다면 다 넣었으면 합니다. 사용자가 원하는 화면을 사용할수 있게요.»
//   20:43 «클로드가 최선을 다해 만들어 주시면 전 검수사들에게 그중 원하는 화면으로 셋팅해서 사용하라고 하겠습니다»
//
//   ⚠ 값(색·글자·단추 높이)은 여기서 만들지 않는다 — src/index.css 의 :root[data-skin="N"] 이 유일한 출처다.
//   ⚠ 기기마다 따로다(localStorage) — 밝기·글자 모드(2.40·4.23)와 같은 규칙. 한 폰을 여럿이 쓰면 마지막에 고른 안이 남는다.
//   ⚠ 밝기·글자와의 관계 —
//      1안 = 종전 화면(밝기 1~3단계는 그대로 고를 수 있다. 4단계 «사무실»은 2안이 맡는다).
//      2안 = 밝기 4(흰 바탕 — brightLight.css 의 팔레트 뒤집기를 그대로 쓴다)를 화면에만 걸고 저장값은 안 건드린다.
//      3안 = 글자 «크게»를 화면에만 걸고 그보다 한 단계 더 키운다. 저장된 밝기·글자 값은 안 건드린다 — 다른 안으로 돌아가면 종전 값이 그대로 돌아온다.
import { getBrightness, getTextSize } from './utils.js';

export const SKIN_KEY = 'master_skin_v1';
export const SKINS = [
  { n: 1, label: '1안 어두운 고대비', hint: '지금 화면과 가장 비슷 · 배 안 · 야간', sw: ['#060a14', '#151f32', '#f1f5f9', '#7cf1c2'] },
  { n: 2, label: '2안 밝은 간결',     hint: '흰 바탕 · 그림자 없음 · 사무실 · 낮',   sw: ['#eef2f7', '#ffffff', '#0b1220', '#06603f'] },
  { n: 3, label: '3안 큰 글자 현장',   hint: '글자 · 단추 가장 큼 · 검정 바탕 · 노안', sw: ['#000000', '#141820', '#ffffff', '#7cf1c2'] },
];

const _get = () => { try { return localStorage.getItem(SKIN_KEY); } catch (e) { return null; } };
const _set = (v) => { try { localStorage.setItem(SKIN_KEY, String(v)); return true; } catch (e) { return false; } };

//  처음인 기기 — 종전에 밝기 4(사무실 흰 바탕)를 쓰던 기기는 2안, 나머지는 1안(지금 화면과 가장 가까운 안).
export function getSkin() {
  const n = parseInt(_get(), 10);
  if (n >= 1 && n <= 3) return n;
  return getBrightness() === 4 ? 2 : 1;
}

//  화면에 거는 곳은 여기 한 곳뿐이다. 밝기·글자 저장값은 읽기만 한다.
export function applySkin(n) {
  const v = [1, 2, 3].includes(parseInt(n, 10)) ? parseInt(n, 10) : 1;
  try {
    const de = typeof document !== 'undefined' ? document.documentElement : null;
    if (de) {
      de.setAttribute('data-skin', String(v));
      const b = getBrightness();
      if (v === 2) de.setAttribute('data-bright', '4');
      else if (v === 3) de.removeAttribute('data-bright');
      else if (b >= 2 && b <= 3) de.setAttribute('data-bright', String(b));
      else de.removeAttribute('data-bright');   // 1안에서 저장값이 4(사무실)면 1단계로 그린다 — 흰 바탕은 2안이 맡는다
      if (v === 3 || getTextSize() === 2) de.setAttribute('data-text', 'large');
      else de.removeAttribute('data-text');
    }
  } catch (e) { console.warn('[화면 고르기] 화면에 걸지 못했습니다.', e); }
  if (!_set(v)) console.warn('[화면 고르기] 저장 실패 — 이번 세션만 적용됩니다.');
  return v;
}
