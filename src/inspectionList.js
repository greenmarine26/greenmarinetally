// M5.26: 검수 리스트 (M3.86에서 작업했던 inspectionList.js 복구)
// 양식 명세 (메모리):
//   - A4 세로, 여백 상하좌우 0.4cm
//   - 좌우 2단, 페이지당 140대 (단당 70줄)
//   - 컬럼: 순번/컨번호/실번호/규격/F/E/비고
//   - 정렬: 20풀 → 20엠티 → 20특수 → 40풀 → 40엠티 → 40특수
//   - 색상: 풀=흰색 / 엠티=#e5e5e5 / 리퍼=#cce6ff / FR=#d4edda / OT=#fff3cd / TK=#ffe5d0
//   - 시트1=전체, 시트2=특수화물 별첨

import { openPrintWindow } from './printHelper.js';
import { shipOpMapper } from './data/tallyFormats.js';
import { isoToLabel, isoToCustomsSpec, isFlatRackContainer, overDims} from './utils.js';   // 2.07: VGM 리스트 TYPE 표기
const COLOR = {
  //  ★ 3.45 — X-RAY 대상 줄은 노랗게(검수사 2026-09-14 «xray 실번호가 입력되면 검수리스트에 기입해주고
  //    그대상컨테이너 줄을 노란색으로 색칠해 주세요» · 확정 «X-RAY 대상 줄 전부» · «노랑이 기존 색을 이긴다»).
  //    OT 연노랑(#fff3cd)보다 진하게 — 흑백 인쇄에서도 갈린다.
  xray: '#ffe066',
  full: '#ffffff',
  empty: '#e5e5e5',
  reefer: '#cce6ff',
  fr: '#d4edda',
  ot: '#fff3cd',
  tk: '#ffe5d0',
};

// 컨테이너 타입 판별 (ISO 6346 표준)
//   ISO 4글자 코드: [크기][높이][종류1][종류2]
//   예: 22G1 = 20' 일반 GP, 42G1 = 40' 일반, 22R1 = 20' 리퍼, 45R1 = 45' 리퍼
//        42PF = 40' 플랫폼(FR), 22UT = 20' Open Top, 22T0 = 20' Tank
//   첫 자리 = 길이: 1/2=20', 3=30', 4=40', 9=45'(40ft 슬롯)
//   셋째 자리 = 종류: G=GP(일반) / R=리퍼 / P=Platform(FR) / U=OT / T=Tank / B=Bulk / S=Special
// ⚠️ M5.28 fix: iso.includes('P')는 GP의 P까지 잡아서 22GP/42GP 일반 컨테이너를 FR로 오분류함
// M5.59: 선사 매핑 통일 (voucher와 동일) — LIST/BL/EDI 코드 → voucher 약어
const CARRIER_MAP = {
  'DJSC': 'DJS', 'NSSL': 'NSL', 'HASL': 'HAS', 'SNKO': 'SKR',
  'HSLI': 'HSL', 'JEON': 'HSL',
  // M5.68 — 4자 → 3자 (voucher와 동일)
  'DWIC': 'DWS', 'EASK': 'EAS', 'TJMS': 'TJM', 'WDFC': 'WDF', 'SCLK': 'SIT',
};
function normalizeCarrier(c) {
  // M5.68 — 3자 강제 (voucher와 통일)
  const to3 = (s) => String(s || '').slice(0, 3).toUpperCase();

  // M5.79: 부킹 슬롯 가드
  const isBooking = c.isBooking === true || c.pendingCn === true ||
                    (typeof c.cn === 'string' && c.cn.startsWith('__BOOK_'));

  if (c.op) {
    const op = String(c.op).toUpperCase().trim();
    if (CARRIER_MAP[op]) return CARRIER_MAP[op];
    if (op) return to3(op);
  }
  if (c.bl && c.bl.length >= 4) {
    const blp = String(c.bl).slice(0, 4).toUpperCase();
    if (CARRIER_MAP[blp]) return CARRIER_MAP[blp];
  }
  if (!isBooking && c.cn && c.cn.length >= 3) return c.cn.slice(0, 3).toUpperCase();
  return '?';
}


//  isoToLabel 이 내는 라벨 끝 두 자 → 종류. VH(통풍컨)는 터미널이 DC 로 다룬다(utils 주석).
const _LABEL_TYPE = { DC: 'normal', HC: 'normal', VH: 'normal', RF: 'reefer', RH: 'reefer', FR: 'fr', OT: 'ot', TK: 'tk' };
function getContainerCategory(c) {
  const iso = String(c.iso || '').toUpperCase().trim();
  const first = iso[0] || '';
  const third = iso[2] || '';

  // 길이: 첫 자리 기준 (4/9 = 40ft 슬롯, 1/2 = 20ft)
  let len = 20;
  if (first === '4' || first === '9') len = 40;
  else if (first === '1' || first === '2') len = 20;
  else if (c.cn && /^[A-Z]{4}\d{7}$/.test(c.cn)) {
    // ISO 없으면 cn 끝자리로 추정 (옛 호환)
    len = parseInt(c.cn[10]) >= 4 ? 40 : 20;
  }

  //  ★ 3.45 — 종류도 **규격 칸과 같은 해석기**(isoToLabel)를 쓴다.
  //    ⚠ 종전엔 ISO 셋째 글자만 봐서 숫자 ISO 를 못 읽었다 — 4530·453E(40피트 HC 리퍼)와
  //      2270(탱크)이 «일반» 이었다. 3.45 가 규격 칸에 «45RE»·«22TN» 이라고 적기 시작하면서
  //      같은 종이에 «리퍼다»(규격)와 «리퍼가 아니다»(흰 줄·특수화물 별첨 없음)가 나란히 찍혔다(재감사 실측 94대).
  //    셋째 글자 규칙은 해석기가 모르는 표기(DC20 류)에서만 물러서서 쓴다.
  const _lab2 = String(isoToLabel(iso) || '').slice(-2);
  let type = _LABEL_TYPE[_lab2]
          || (third === 'R' ? 'reefer' : third === 'P' ? 'fr' : third === 'U' ? 'ot' : third === 'T' ? 'tk' : 'normal');
  //  ★ 3.45 — FR 판정은 저장소의 **한 벌**(3.43-03 utils.isFlatRackContainer)을 따른다.
  //    ⚠ 그것이 FR 이라고 답하는 4261·4363·436E 를 검수 리스트만 «42GP»(일반) 라고 적고
  //      흰 줄에 특수화물 별첨에서도 뺐다(4차 감사 실측 9대). 3.44 는 «40» 이라 GP 라고 주장하지는 않았다.
  if (type !== 'fr' && isFlatRackContainer(c)) type = 'fr';

  // 리퍼 우선 판별 (EDI에 리퍼 플래그/실제 온도값 있으면 ISO와 무관하게 reefer)
  const hasTmpVal = (c.tmp != null && String(c.tmp).trim() !== '') || (c.temp != null && String(c.temp).trim() !== '');
  if (c.reefer === true || hasTmpVal) type = 'reefer';

  const fe = String(c.fe || '').toUpperCase() === 'F' ? 'F' : 'E';
  return { len, type, fe };
}

//  ★ 3.60: 검수 리스트 정렬·순번 한 벌 — 종이·CSV 가 같은 순서를 쓴다.
//    검수사 2026-09-24 «선사를 없애고 규격 f/e 일반/특수알파벳순» · «넘버링은 20풀 따로 20엠티 따로 특수화물 따로 40도 마찬가지»
//    묶음 = 길이(20 / 40 — 45 는 40) × [일반 풀 · 일반 엠티 · 특수]. 묶음 안에서는 규격 → F/E → 컨번호 알파벳순. 순번은 묶음마다 1부터.
//  특수 = 별첨(시트2)과 같은 판정(리퍼·FR·OT·탱크·위험물·규격초과).
function _isSpecialCargo(c) {
  const { type } = getContainerCategory(c);
  return type !== 'normal' || !!(c.dg || c.oog || c.fr || c.ot || c.tk);
}
function _inspGroup(c) {
  const { len, fe } = getContainerCategory(c);
  const k = _isSpecialCargo(c) ? 2 : (fe === 'F' ? 0 : 1);
  return (len === 20 ? 0 : 10) + k;
}
function inspSortCmp(a, b) {
  const ga = _inspGroup(a), gb = _inspGroup(b);
  if (ga !== gb) return ga - gb;
  const sa = _specOf(a), sb = _specOf(b);
  if (sa !== sb) return sa < sb ? -1 : 1;
  const fa = String(a.fe || '').toUpperCase() === 'F' ? 0 : 1, fb = String(b.fe || '').toUpperCase() === 'F' ? 0 : 1;
  if (fa !== fb) return fa - fb;
  return String(a.cn || '').localeCompare(String(b.cn || ''));
}
//  정렬된 목록에 묶음별 순번을 매긴다.
function inspNumber(sorted) {
  let g = null, n = 0;
  return sorted.map(c => { const k = _inspGroup(c); if (k !== g) { g = k; n = 0; } return ++n; });
}


function getRowColor(c, noFlag) {
  //  ★ 3.45 — X-RAY 가 규격색을 이긴다. 규격은 «규격» 칸에서 보고, 색은 «지금 할 일»을 가리킨다.
  //    별첨(noFlag)은 성질만 적는 표라 여기서도 뺀다(★XRAY 표기를 빼는 것과 같은 규칙 2.92-01).
  if (c && c._xray && !noFlag) return COLOR.xray;
  const { type, fe } = getContainerCategory(c);
  if (type === 'reefer') return COLOR.reefer;
  if (type === 'fr') return COLOR.fr;
  if (type === 'ot') return COLOR.ot;
  if (type === 'tk') return COLOR.tk;
  return fe === 'E' ? COLOR.empty : COLOR.full;
}

//  ★ 3.45 — 이스케이프 한 벌. 종전엔 봉인번호만 «꺾쇠를 지우는» 방식이라
//    실봉인 «A&B-123» 이 «AB-123» 으로 찍혔다 — 없는 번호를 적는 셈이다(§5-3 신원 칸은 지어내지 않는다).
const _esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

//  ★ 3.45 — **비고 폭 셈법 한 벌.** 화면 축소 등급과 페이지 배분이 같은 자를 쓴다.
//    ⚠ 초판은 등급을 `_plain.length`(한글도 1자)로 매겨, 60줄 아래 _noteWeight 의 «한글 두 폭» 셈법과 갈렸다.
//    ⚠ 초판은 m4 를 넘는 비고를 nowrap+overflow:hidden 으로 **조용히 잘랐다** —
//      검수사 2026-09-14 «DG와 중복이 될경우 동적 축소로 둘다 표기 되어야 합니다» 를 정면으로 깬다.
//      그래서 m4 로도 안 되면 m5(줄바꿈)로 넘겨 **한 글자도 잃지 않고**, 늘어난 줄은 배분기가 센다.
//  ⚠ × (U+00D7) 은 0x2000 아래인데 한글 글꼴에서 **전각**으로 그려진다 — 실치수 «10914×3340×3150mm» 가
//    이것 때문에 좁게 계산돼 잘렸다(재감사 크로뮴 실측). 별·마름모·℃ 는 0x2000 위라 이미 전각이다.
//  ⚠ 전각은 반각의 **두 배가 아니라 1.5배**다(크로뮴 A4 실측 — 비고 칸 36.8mm 에 7pt 로 ASCII 21자 · 한글 14자).
//    그래서 반각 2 · 전각 3 으로 센다. 종전 1:2 셈법은 ASCII 를 7폭이나 낙관해 두 줄 될 것을 한 줄로 봤다.
const _memoW = (txt) => { let w = 0; for (const ch of txt) { const c = ch.charCodeAt(0); w += (c > 0x2000 || c === 0xD7) ? 3 : 2; } return w; };
//  한 줄에 드는 폭단위 — 7pt(기본) · 6pt(m2). 비고 칸 35% ≈ 35.3mm 에서 크로뮴 **A4 실폭(763px)** 실측.
//  ⚠ 1280px 기본 뷰포트로 재면 1.68배 넓은 자가 된다(4차 감사 — 그 때문에 실번호 41칸 침범을 «0» 이라고 봤다).
//  ⚠ **6pt 아래로는 안 줄인다.** 이 저장소는 X-RAY 확인서에서 «6pt 는 선내 조명에 장갑 낀 손으로 못 읽는다» 고
//    확정했다(generateXrayListHTML 주석). 더 줄이는 대신 **줄을 바꾼다** — 작게 만드는 것보다 낫다.
const MEMO_FIT = [13, 16];   // 3.60: 세 단(비고 18%)에서 크로뮴 A4 실측 — 7pt 한 줄 13폭단위(«-20.0℃»=13 한 줄) · 6pt 16(«치수 미신고»=17 은 6pt 에서도 두 줄)
const _memoFit = (plain) => {
  const w = _memoW(plain);
  for (let i = 0; i < MEMO_FIT.length; i++) if (w <= MEMO_FIT[i]) return { cls: i ? ` m${i + 1}` : '', lines: 1 };
  return { cls: ' m2', lines: Math.max(1, Math.ceil(w / MEMO_FIT[MEMO_FIT.length - 1])) };
};
//  연막검사가 «내가 예상한 줄수» 와 «브라우저가 그린 줄수» 를 맞대 볼 수 있게 내보낸다 —
//  이 예상이 틀리면 단·페이지 배분이 어긋나 종이가 한 장 더 나온다.
export const memoFitOf = (plain) => _memoFit(String(plain || ''));

//  ★ 3.45 — **규격은 이 함수 한 곳에서만 정한다.** 종이와 인쇄창 CSV 가 각자 계산하면 반드시 갈린다 —
//    재감사 실측에서 폴백 행(빈 ISO·DCHC 류)이 종이 «40» · 엑셀 «빈칸» 으로 어긋났다.
const _specOf = (c) => {
  const s0 = isoToCustomsSpec(c && c.iso, c && c._xrayIso);
  //  ⚠ 규격이 «일반(GP)» 이라는데 FR 한 벌이 «FR» 이라고 하면 규격을 고쳐 적지 않는다 —
  //    같은 종이에 «일반» 과 «특수화물 별첨» 이 같이 나가면 검수사가 둘 중 뭘 믿어야 할지 모른다.
  if (s0) return (/GP$/.test(s0) && isFlatRackContainer(c)) ? s0.slice(0, 2) + 'PF' : s0;
  const { len, type } = getContainerCategory(c);
  return `${len}${type === 'normal' ? '' : type === 'reefer' ? 'R' : type === 'fr' ? 'F' : type === 'ot' ? 'O' : 'T'}`;
};

//  ★ 3.60: FR·OT 비고 한 벌(종이·CSV) — 초과치수가 있으면 «오버 L+… cm», 실치수가 있고 초과가 없으면 «인게이지»,
//    치수가 하나도 없으면 «치수 미신고»(모르는 것을 인게이지라고 지어내지 않는다).
function _shapeNote(c) {
  const _d = [];
  if (c.ovl) _d.push(`L+${c.ovl}`);
  if (c.ovw) _d.push(`W+${c.ovw}`);
  if (c.ovh) _d.push(`H+${c.ovh}`);
  if (!_d.length) { const _o = overDims(c); if (_o && _o.over) _d.push(..._o.short); }
  if (_d.length) return `오버 ${_d.join(' ')}cm`;
  if (c.cgL || c.cgW || c.cgH) return '인게이지';
  return '치수 미신고';
}

//  ★ 3.60 (검수사 2026-09-24 «그냥 20.0 온도기호») — 온도는 숫자 소수 한 자리 + ℃ 로만(예 -20.0℃). «T-20C» 같은 원문 표기를 그대로 찍지 않는다.
//    숫자를 못 읽으면 원문을 그대로 둔다(지어내지 않는다).
function _fmtTemp(v) {
  //  감사 지적 — 유니코드 마이너스(−)·대시(–—)와 «- 20» 처럼 띄운 부호도 영하로 읽는다(부호를 잃으면 냉동 리퍼가 +20℃ 로 나간다).
  const t = String(v == null ? '' : v).trim().replace(/[\u2212\u2012\u2013\u2014\uFE63\uFF0D]/g, '-');
  if (!t) return '';
  const m0 = t.match(/([-+])?\s*(\d+(?:\.\d+)?)/);
  const m = m0 ? [`${m0[1] === '-' ? '-' : ''}${m0[2]}`] : null;
  if (!m) return t;
  return `${Number(m[0]).toFixed(1)}℃`;
}

// 단일 줄 HTML
function renderRow(c, idx, opts) {
  const _noFlag = !!(opts && opts.noFlag);   // 2.92-01: 별첨 — 성질 아닌 표기(X-RAY·긴급) 제외
  const bg = getRowColor(c, _noFlag);
  const { len, type } = getContainerCategory(c);
  //  ★ 3.45 — 규격은 **세관 리스트와 같은 표기**(검수사 2026-09-14 «규격은 세관리스트껄로 맞추시면 될듯합니다»).
  //    세관 리스트 실측 — 45GP · 22GP · 44GP · 42RE 처럼 **ISO 4자리 그대로**다(검수업체컨테이너목록조회).
  //    종전 자체 계산은 45GP(40피트 하이큐빅)와 42GP(40피트 일반)를 둘 다 «40» 으로 찍어 구분이 사라졌다.
  //    ISO 가 없거나 4자리가 아닌 행(부킹 자리·숫자 ISO 등)만 종전 계산으로 물러선다.
  //    ⚠ 초판은 문을 «4자리에 글자 하나» 로 열어 내부 공컨 마커(220E·450E·453E·45GE)와
//      선사 약어(40HE)가 종이로 샜다 — 문은 utils.isoToCustomsSpec 한 벌이 지킨다.
  const spec = _specOf(c);
  const fe = (c.fe || '').toUpperCase() === 'F' ? 'F' : 'E';
  //  ★ 3.53-10 — **실번호를 자르지 않는다.** 검수사 2026-09-21 «검수리스트에서 셀 자리수 부족으로 실번호 잘림현상 해결바람»
  //    (ATPR 2642E — 실번호 SINOKOR011526 이 종이에 «SINOKOR011» 로 나갔다). M5.52 가 선사 칸 공간을 위해 10자로 잘랐는데
  //    검수는 실번호로 실물을 맞추는 일이라 뒷자리를 잃으면 종이가 거짓이 된다. 칸을 넓히고(실번호 16→18%, 컨번호 19→17%) 10자 넘으면 6pt 로 줄인다 — 줄바꿈은 장당 줄수를 깨므로 안 쓴다.
  const sl = String(c.sl || '').trim();
  const _slCls = sl.length > 13 ? ' s3' : sl.length > 10 ? ' s2' : sl.length > 8 ? ' s1' : '';   // 3.60: 9~10자 7.5pt · 11자부터 6pt   // 3.60: 세 단 — 9자부터 6pt(10자 실번호가 8pt 로 칸을 넘었다, 크로뮴 실측)
  // M5.79: 부킹 슬롯이면 컨번호 빈 칸 (검수원이 손으로 채울 자리)
  const isBooking = c.isBooking === true || c.pendingCn === true ||
                    (typeof c.cn === 'string' && c.cn.startsWith('__BOOK_'));
  const cn = isBooking ? '' : (c.cn || '');
  // 비고: X-RAY ★ + 리퍼 온도 + 기타 표시
  const notes = [];
  if (isBooking) notes.push('<span style="color:#b45309;font-weight:bold">📝대기</span>');
  //  ★ 3.45 — 세관봉인 실번호를 ★XRAY 옆에 적는다(검수사 확정 «비고 칸에 ★XRAY 옆에»).
  //    번호가 아직 없으면 표식만 — 없는 것을 지어내지 않는다.
  if (c._xray && !_noFlag) {
    //  ⚠ 이름은 _xraySealNo — SearchPanel·mirCtx 는 같은 이름 _xraySeal 에 **레코드 객체**를 담는다.
//      거기에 문자열을 넣으면 mirFacts 의 x.seal.seal 이 undefined 가 되어 «커트씰 없음» 이라고 거짓말한다.
    const _xs = _esc(String(c._xraySealNo || '').trim());
    notes.push(`<span style="color:#dc2626;font-weight:bold">★XRAY${_xs ? ' ' + _xs : ''}</span>`);
  }
  // M6.94.18: 온도 필드는 c.tmp (CSVExport·diagnostics와 동일). 기존 c.temp는 비어서 표기 안 됐음.
  //   XRAY 대상이 리퍼면 ★XRAY + 온도 둘 다 비고에 표기 (선상 체크용).
  //   c.tmp는 소스에 따라 "-18"(단위 없음) 또는 "-18.0℃"(단위 포함) → 중복 방지.
  let reeferTmp = (c.tmp != null && String(c.tmp).trim() !== '') ? String(c.tmp).trim()
                : (c.temp != null && String(c.temp).trim() !== '') ? String(c.temp).trim() : null;
  if (type === 'reefer') notes.push(reeferTmp != null ? _fmtTemp(reeferTmp) : '온도 미신고');   // 3.60: 온도가 없으면 «치수 미신고» 처럼 없다고 적는다(감사 지적 — 빈칸이면 리퍼인지도 눈에 안 띈다)
  /* ★ 2.91 (검수사 «FR 폭 길이 높이 다 표기 해줘야 함») — FR 은 치수가 곧 작업 정보다.
       초과분(DIM)만 적던 것을 **폭·길이·높이 세 칸**으로 바꾼다. 없는 값은 «-» 로 자리를 남긴다
       (§2-0-D — 조용히 없애지 않는다). 치수가 하나도 없으면 «치수 미신고»라고 말한다(§0-Y-2). */
  //  ★ 3.60 (검수사 2026-09-24 «규격에 42ut 이렇게 표시하면 비고에 ot라고 표시 안해도 됩니다. 리퍼도 마찬가지 온도만 표기
  //    fr도 마찬가지 오버 또는 인게이지») — 종류는 규격 칸이 말한다. 비고엔 FR·OT 는 오버(초과치수)/인게이지만, 리퍼는 온도만, TK 는 없음.
  if (type === 'fr' || c.fr || type === 'ot' || c.ot) {
    notes.push(`<span style="color:#166534;font-weight:bold">${_shapeNote(c)}</span>`);
  }
  // TallyOne 2.00 (검수사 지시 2026-08-20 «검수용 리스트에 DG(클래스·유엔넘버)·리퍼온도·OOG(높이 폭)·특수화물 다 기록»):
  //   DG — 클래스·UN·포장등급 (nlSearch specialDetailLines 와 같은 필드 dgc/un/pg. TNJP 26360E 실측: cl.9 UN3480)
  // TallyOne 2.00-03 (검수사 지시 «DG 표기는 */**** 형식으로»): 클래스/UN 만 — 예 «9/3480». 번호 없으면 DG 로 폴백
  if (c.dg) notes.push(`<span style="color:#b91c1c;font-weight:bold">${(c.dgc || c.un) ? [c.dgc, c.un].filter(Boolean).join('/') : 'DG'}${c.pg ? ' PG' + c.pg : ''}</span>`);
  //   OOG — EDI DIM 초과 치수(cm, 1.84-04 가 담은 ovh/ovw/ovl), 없으면 치수 엑셀 실치수 폭×높이(mm)
  /*  2.91-03: OOG 는 **FR·OT 가 아닌 컨**이 규격을 넘겼을 때만 적는다(검수사 확정 — FR·OT 자체가
      규격외 표기라 같이 적으면 이중표기다). FR·OT 는 위에서 제 치수를 이미 달고 나갔다. */
  const _isSpecShape = (type === 'fr' || c.fr || type === 'ot' || c.ot);
  if (!_isSpecShape) {
    const _ov = [];
    if (c.ovh) _ov.push(`H+${c.ovh}`);
    if (c.ovw) _ov.push(`W+${c.ovw}`);
    if (c.ovl) _ov.push(`L+${c.ovl}`);
    //  2.25: 선사가 DIM 을 안 적어도 실치수가 있으면 앱이 판정한다(단위 cm — 위 신고분과 같게).
    if (!_ov.length) { const _o = overDims(c); if (_o && _o.over) _ov.push(..._o.short); }
    if (_ov.length) notes.push(`<span style="color:#92400e;font-weight:bold">OOG ${_ov.join(' ')}cm</span>`);
    else if (c.oog && type === 'normal') notes.push('<span style="color:#92400e;font-weight:bold">OOG</span>');
  }
  if ((c.cgW || c.cgH) && !_isSpecShape) notes.push(`${c.cgW || '?'}×${c.cgH || '?'}mm`);   // 2.91-03: FR·OT 는 제 줄에 이미 치수가 있다
  /* ★ 2.91 (검수사 «긴급화물등 특수 표기 빠진게 보임») — 긴급(▲)·수화물은 카고플랜·베이플랜에는
       그려지는데 **검수용 리스트에만 없었다.** 자료에 있는 것을 안 적은 것이다(§0-Y-2). */
  if ((c._urgent || c.urgent) && !_noFlag) notes.push('<span style="color:#b91c1c;font-weight:bold">▲긴급</span>');
  if (c._lugg || c.lugg) notes.push('<span style="color:#6d28d9;font-weight:bold">수화물</span>');
  if (c._shift) notes.push('<span style="color:#1d4ed8;font-weight:bold">◆시프팅</span>');
  const note = notes.join(' ');
  //  ★ 3.45 — 글자 수(태그 뺀 실제 길이)로 축소 등급. DG·XRAY·OOG 가 겹쳐도 둘 다 남는다.
  const _plain = note.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ');
  const _memoCls = _memoFit(_plain).cls;
  return `<tr style="background:${bg}">
    <td class="no">${idx}</td>
    <td class="cn">${cn}</td>
    <td class="sl${_slCls}">${_esc(sl)}</td>
    <td>${spec}</td>
    <td>${fe}</td>
    <td class="memo${_memoCls}">${note}</td>
  </tr>`;
}

const PER_COL = 50;   // 3.60: 좌·중·우 세 단 × 50줄(검수사 2026-09-24 «50줄로 3단화면이면 어떤가요?») — 종전 좌·우 두 단 × 75줄
const COLS_PER_PAGE = 3;
//  3.29: PER_PAGE(150 고정)와 옛 renderPage(75/75 고정 자르기)는 걷어 냈다 —
//    renderPage 는 3.28 에서도 호출부가 0 이었고, 남겨 두면 옛 규칙이 파일에 있는 채로
//    «150 고정 자르기가 남지 않았다» 검사가 통과한다. 단 배분은 아래 packCols 한 벌이다.

//  ★ 3.29 — **«75행/단»은 비고가 한 줄일 때만 참이다.**
//    비고 칸은 31%(≈31.1mm)인데 FR 은 최악 «FR L+120 W+80 H+150cm 12192×2438×2896mm 9/3480 PG2 ▲긴급 ◆시프팅»
//    처럼 길어져 7pt 로 세 줄이 된다(행 3.4mm → 7.4mm). 특수화물 별첨은 **전 행이 특수화물**이라
//    75행이 평균 두 줄 = 가용의 1.57배였다(2026-09-08 실측).
//  ⇒ 단을 «행 수»가 아니라 **«차지하는 줄 수»**로 채운다. 한 줄도 안 자르고, 넘치면 페이지가 늘어난다.
const _noteWeight = (rowHtml) => {
  const tds = String(rowHtml).match(/<td[^>]*>[\s\S]*?<\/td>/g) || [];
  //  ★ 3.45 — F/E 가 한 칸이 되어 비고는 **6번째**다(tds[5]). 초판은 tds[6](선사)를 세고 있었다.
  const note = tds[5] || '';
  const txt = note.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ').trim();
  return _memoFit(txt).lines;                                  // 축소 등급과 같은 자로 센다
};
const packCols = (rows, perCol = PER_COL) => {
  const cols = []; let cur = [], w = 0;
  for (const r of rows) {
    const L = _noteWeight(r);
    if (w + L > perCol && cur.length) { cols.push(cur); cur = []; w = 0; }
    cur.push(r); w += L;
  }
  if (cur.length) cols.push(cur);
  return cols;
};
const packPages = (rows, perCol = PER_COL) => {
  const cols = packCols(rows, perCol); const pages = [];
  for (let i = 0; i < cols.length; i += COLS_PER_PAGE) pages.push(Array.from({ length: COLS_PER_PAGE }, (_, k) => cols[i + k] || []));
  return pages;
};

// 메인: 검수 리스트 HTML 생성

/** 3.31: 배별 선사 별칭을 **입구에서 한 번** 씌워 c.op 에 박아 둔다.
 *  정렬·순번·인쇄·CSV 가 각자 normalizeCarrier 를 부르므로, 여기서 한 벌로 정해 두면
 *  아래 어느 경로로 가도 같은 선사가 나온다(규범 §4-4). normalizeCarrier 는 c.op 가
 *  있으면 그것을 쓰므로 두 번 돌려도 값이 안 바뀐다. */
function withShipOp(containers, voyageInfo) {
  const list = Array.isArray(containers) ? containers : Object.values(containers || {});
  const sp = shipOpMapper(String(voyageInfo?.vsl || '').toUpperCase(), list.map((c) => c && c.op));
  return list.map((c) => {
    const op = sp(normalizeCarrier(c));
    return (op && op !== '?' && op !== c.op) ? { ...c, op } : c;
  });
}

export function generateInspectionListHTML(containers, mode, voyageInfo, shiftingList = []) {
  const list = withShipOp(containers, voyageInfo);
  if (list.length === 0) return '<p>컨테이너 없음</p>';

  //  ★ 3.60 (검수사 2026-09-24 «규격별로 알파벳순» → «선사를 없애고 규격 f/e 일반/특수알파벳순» → «넘버링은 20풀 따로 20엠티 따로 특수화물 따로 40도 마찬가지»)
  //    정렬·순번은 inspSortCmp·inspNumber 한 벌(CSV 도 같은 것). 선사 칸은 종이에서 뺐다.
  list.sort(inspSortCmp);
  { const _n = inspNumber(list); list.forEach((c, i) => { c._lineIdx = _n[i]; }); }

  // 시트1: 전체 (페이지당 150대씩 — 좌 75 + 우 75)
  //  3.29: 150 고정으로 자르지 않는다 — 비고가 긴 행이 자리를 더 먹으므로 «줄 수»로 채운다.
  const allPages = packPages(list.map(c => renderRow(c, c._lineIdx)));   // 3.60: 묶음별 순번
  // sheet1Pages는 아래 renderPageWithHdr로 계산 (헤더 포함)

  // 시트2 대상 필터: 리퍼/FR/OT/TK + X-RAY 대상 일반 화물
  const special = list.filter(c => {
    /* ★ 2.92-01 (검수사 확정 2026-08-31) — *«XRAY, 긴급화물은 특수 화물이 아닙니다.
         거기에 기록할 필요가 없습니다»* — 별첨은 **화물의 성질**이 특수한 것만 모은다
         (리퍼·FR·OT·탱크·위험물·규격초과). X-RAY 는 세관 검사 지정이고 긴급은 처리 순서라
         둘 다 성질이 아니다 — 각자 제 서류(X-RAY 확인서·긴급 안내)가 따로 있다.
       ⚠ 본문(시트1) 표기는 그대로 둔다 — 거기서는 알아야 할 정보다. */
    return _isSpecialCargo(c);
  });

  let sheet2Html = special.length > 0 ? 'PENDING' : '';  // 아래에서 헤더 있는 버전으로 생성

  const modeKo = mode === 'discharge' ? '양하' : '선적';
  const vsl = voyageInfo?.vsl || '';
  // V9.57: 항차 표기를 모드별 필드 우선으로 — 양하 인쇄는 voy_d, 선적 인쇄는 voy_l.
  //   한쪽 섹션 삭제 시 info.voy가 남은 쪽으로 재기입되는 수정(HomePage performDelete)과 정합.
  //   종전엔 info.voy(생성 당시 모드의 항차)가 먼저라 양하/선적 항차가 다른 배에서 반대쪽 번호가 찍혔다.
  const voy = (mode === 'discharge'
    ? (voyageInfo?.voy_d || voyageInfo?.voy || voyageInfo?.voy_l)
    : (voyageInfo?.voy_l || voyageInfo?.voy || voyageInfo?.voy_d)) || '';
  // 날짜: 2026.05.11 형식
  const d = new Date();
  const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

  // M5.29: 각 페이지 상단 헤더 (좌: 선박명 / 중: 항차 / 우: 날짜+페이지) — cover page 제거
  // 페이지 헤더 렌더링을 위해 renderPage에 정보 전달 필요 → 메인 함수에서 직접 조립
  const renderPageWithHdr = (pair, pageNum, totalPages) => {
    const colsOf = Array.isArray(pair[0]) ? pair : [pair.slice(0, PER_COL), pair.slice(PER_COL, PER_COL * 2), pair.slice(PER_COL * 2)];
    const col = (rs) => `<table class="ilist">
      <colgroup><col style="width:7%"><col style="width:31%"><col style="width:25%"><col style="width:14%"><col style="width:5%"><col style="width:18%"></colgroup><thead><tr><th>#</th><th>컨번호</th><th>실번호</th><th>규격</th><th style="font-size:5.5pt">F/E</th><th>비고</th></tr></thead>
      <tbody>${rs.join('')}</tbody>
    </table>`;
    return `<div class="ipage">
      <div class="phdr">
        <div class="phdr-l">${vsl}</div>
        <div class="phdr-c">${voy} <span class="modetag">${modeKo}</span></div>
        <div class="phdr-r">${dateStr} · ${pageNum}/${totalPages}</div>
      </div>
      <div class="icols">
        ${colsOf.map((rs) => `<div class="icol">${col(rs)}</div>`).join('')}
      </div>
    </div>`;
  };

  const sheet1Pages = allPages.map((rows, i) => renderPageWithHdr(rows, i + 1, allPages.length)).join('');

  // 시트2 페이지도 헤더 포함 (전체 페이지 수는 시트1+시트2 합산하여 표기 가능하나, 별첨이라 별도 카운트)
  if (sheet2Html) {
    //  3.29: 별첨은 **전 행이 특수화물**이라 비고가 길다 — 여기가 넘침이 가장 컸다.
    const sheet2PagesList = packPages(special.map((c, j) => renderRow(c, j + 1, { noFlag: true })));   // 2.92-01: 별첨엔 X-RAY·긴급 안 적는다(검수사 «특수 화물이 아닙니다»)
    sheet2Html = `<div class="ititle">[별첨] 특수화물·X-RAY (${special.length}대)</div>` +
      sheet2PagesList.map((rows, i) => renderPageWithHdr(rows, i + 1, sheet2PagesList.length)).join('');
  }

  // [별첨2] 시프팅(재적부) — **평택 작업에 방해가 되어 옮기는 화물**, 양하·선적 공통.
  //   1.76-05: 구 문구 «통과화물 위치 이동» 폐기 — 정의는 «통과화물이냐»가 아니라 «방해가 되느냐»다
  //   (검수사 확정 2026-08-15, 정본 ★앱_통합지침서.md §5-1B). 좌표만 달라진 통과화물은 서류 차이다.
  let shiftHtml = '';
  if (Array.isArray(shiftingList) && shiftingList.length > 0) {
    const rows = shiftingList.map((c, i) => `<tr>
      <td>${i + 1}</td><td class="cn">${c.cn || ''}</td><td>${c.iso || ''}</td><td>${c.pod || ''}</td>
      <td class="cn">${c.from || ''}</td><td class="cn">${c.to || ''}</td><td></td></tr>`).join('');
    shiftHtml = `<div class="ititle">[별첨2] ◆ 시프팅(재적부) ${shiftingList.length}대 — 평택 작업에 걸려 옮기는 화물 (양하·선적 공통, 1대=크레인 2모브)</div>
      <div class="ipage"><table class="ilist" style="max-width:120mm;margin:0 auto;">
      <!--  ★ 3.45 — 이 표엔 colgroup 이 없어, table-layout:fixed 아래서 7칸이 **균등분할**돼
            컨테이너번호 칸이 30mm→17mm 로 줄었다(재감사 실측). 3.44 의 내용폭 비율을 그대로 적어 둔다. -->
      <colgroup><col style="width:6%"><col style="width:23%"><col style="width:10%"><col style="width:13%"><col style="width:20%"><col style="width:20%"><col style="width:8%"></colgroup>
      <tr><th>No</th><th>컨테이너</th><th>규격</th><th>POD</th><th>전 위치</th><th>후 위치</th><th>확인</th></tr>
      ${rows}</table></div>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>검수 리스트 ${modeKo} - ${vsl} ${voy}</title>
<style>
@page { size: A4 portrait; margin: 0.4cm; }
body { font-family: 'Malgun Gothic', sans-serif; margin: 0; padding: 0; color: #000; font-size: 9pt; }
.actions { position: sticky; top: 0; background: #1e293b; padding: 8px; display: flex; gap: 8px; z-index: 100; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
.actions button { flex: 1; padding: 10px; font-size: 14px; font-weight: bold; border: none; border-radius: 6px; cursor: pointer; }
.btn-print { background: #0369a1; color: white; }
.btn-print:hover { background: #075985; }
.btn-excel { background: #15803d; color: white; }
.btn-excel:hover { background: #166534; }
.btn-close { background: #475569; color: white; }
.btn-close:hover { background: #334155; }
.content { padding: 4mm; }
/* M5.30: 페이지 헤더 컴팩트화 — 75행 보장 위해 padding 최소화 */
.phdr { display: flex; align-items: center; padding: 0.5mm 2mm; border-bottom: 1pt solid #333; margin-bottom: 1mm; font-size: 8.5pt; }
.phdr-l { flex: 1; font-weight: bold; font-size: 10pt; text-align: left; }
.phdr-c { flex: 1; font-weight: bold; font-size: 9pt; text-align: center; }
.phdr-r { flex: 1; text-align: right; font-size: 8pt; color: #555; }
.modetag { background: #fde68a; padding: 0px 5px; border-radius: 2px; font-size: 7.5pt; margin-left: 3px; }
.ititle { font-weight: bold; text-align: center; padding: 4px 0; font-size: 10pt; page-break-before: always; }
.ipage { page-break-after: always; }
.ipage:last-child { page-break-after: auto; }
.icols { display: flex; gap: 1.5mm; }
.icol { flex: 1; min-width: 0; }
/* M5.30: 행 컴팩트 — 75행/단 보장 (이전 7.5pt + 1px padding으로 72행만 들어감) */
table.ilist { width: 100%; border-collapse: collapse; font-size: 9pt; table-layout: fixed; }   /* 3.45: fixed 라야 colgroup 폭이 실제로 먹는다 */
table.ilist th, table.ilist td { border: 0.5pt solid #333; padding: 0 1px; text-align: center; line-height: 1.0; height: 5.2mm; }
table.ilist th { background: #ddd; font-size: 7pt; font-weight: bold; height: 4mm; white-space: nowrap; letter-spacing: -0.3px; }
table.ilist td.no { font-size: 6.5pt; letter-spacing: -0.4px; }   /* 3.60: 순번이 세 자리(100~)가 되어도 칸 안에 */
table.ilist td.cn { font-family: monospace; font-size: 9pt; letter-spacing: -0.5px; }
/*  ★ 3.45 — 비고가 겹칠 때(검수사 2026-09-14 «DG와 중복이 될경우 동적 축소로 둘다 표기 되어야 합니다»).
    표식이 늘수록 글자만 줄여 **한 줄에 둘 다** 남긴다 — 줄바꿈이나 잘림으로 하나를 잃지 않는다. */
/*  ★ 3.45 — 비고는 **잘리지 않는다**(검수사 «DG와 중복이 될경우 동적 축소로 둘다 표기 되어야 합니다»).
    ⚠ nowrap+overflow:hidden 은 글자폭 모델이 조금만 낙관해도 뒤를 **조용히 지운다** —
      재감사 크로뮴 실측에서 OOG 실치수 6건이 m2 칸에서 15~24px 잘렸다. 그래서 숨기지 않고 줄을 바꾼다.
      등급(m2~m5)은 «한 줄에 담으려는 노력» 이고, 못 담으면 줄이 늘 뿐 한 글자도 안 잃는다. */
table.ilist td.memo { white-space: normal; overflow-wrap: anywhere; text-align: left; padding: 0 1.5px; font-size: 7pt; }
table.ilist td.memo.m2 { font-size: 6pt; letter-spacing: -0.2px; }   /* 3.45: 바닥은 6pt — 더 줄이지 않고 줄을 바꾼다 */
/*  ★ 3.53-10 — 실번호도 잘리지 않는다. 10자 넘으면 6pt(바닥). 줄은 안 바꾼다(장당 줄수가 깨진다) — 15자까지 칸 안, 그보다 길면 숨기지 않고 옆 칸 위로 보인다(실측 최대 14자·보관 17자 1건). */
table.ilist td.sl { white-space: nowrap; letter-spacing: -0.2px; }   /* 줄을 바꾸면 장당 줄수(고정)가 깨져 A4 를 넘친다 — 칸을 넓히고(16→18%, 컨번호 19→17%) 글자를 줄인다 */
table.ilist td.sl.s1 { font-size: 7.5pt; letter-spacing: -0.4px; }
table.ilist td.sl.s2 { font-size: 6pt; letter-spacing: -0.4px; }
table.ilist td.sl.s3 { font-size: 6pt; letter-spacing: -0.4px; white-space: normal; word-break: break-all; }   /* 3.60: 14자 이상(SINOKOR01152612) — 6pt 아래로는 안 줄인다(X-RAY 확인서 규칙). 세 단은 줄 높이 5.2mm 에 6pt 두 줄이 들어가 줄을 바꿔도 행이 안 늘어난다 */
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .actions { display: none; }
  .content { padding: 0; }
}
</style>
</head><body>
<div class="actions no-print">
  <button class="btn-print" onclick="window.print()">🖨 인쇄 / PDF 저장</button>
  <button class="btn-excel" onclick="window.__exportExcel()">📊 엑셀 다운로드</button>
  <button class="btn-close" onclick="window.close()">✕ 닫기</button>
</div>
<div class="content">
${sheet1Pages}
${sheet2Html}
${shiftHtml}
</div>
</body></html>`;
}

// 새 창에서 인쇄 가능한 HTML 열기
// TallyOne 2.07 (검수사 확정 2026-08-21 «선박별로 만들어 놨다가 요청시 제출할수 있게»):
//   본선(선장)이 마감 무렵 «Please provide the VGM list for {항차} KRPTK» 로 요구하는
//   평택 선적분 VGM(검증총중량) 리스트 — 실사례: SWSP SAWASDEE SPICA 2608S.
//   컨별 무게(wt — EDI/선사리스트 신고값, kg)로 영문 제출용 표를 만든다. 무게 없는 컨은 공란+경고.
export function generateVgmListHTML(containers, voyageInfo) {
  const vsl = String(voyageInfo?.vsl || '').toUpperCase();
  const voy = voyageInfo?.voy_l || voyageInfo?.voy || '';
  const today = new Date().toISOString().slice(0, 10);
  const rows = [...containers].sort((a, b) => String(a.cn).localeCompare(String(b.cn)));
  let total = 0, missing = 0;
  const trs = rows.map((c, i) => {
    const w = parseInt(c.wt, 10);
    const ok = Number.isFinite(w) && w > 0;
    if (ok) total += w; else missing++;
    return `<tr><td>${i + 1}</td><td class="mono">${c.cn || ''}</td><td>${isoToLabel(c.iso) || c.iso || ''}</td>` +
      `<td>${c.fe || ''}</td><td class="num">${ok ? w.toLocaleString() : '<span class="warn">—</span>'}</td></tr>`;
  }).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>VGM LIST ${vsl} ${voy}</title><style>
    body{font-family:'Malgun Gothic',sans-serif;font-size:11px;margin:24px;color:#111}
    h1{font-size:16px;margin:0 0 2px} .sub{color:#555;margin-bottom:12px}
    table{border-collapse:collapse;width:100%} th,td{border:1px solid #999;padding:3px 6px;text-align:center}
    th{background:#eee} .mono{font-family:Consolas,monospace} .num{text-align:right}
    .warn{color:#b91c1c;font-weight:bold} tfoot td{font-weight:bold;background:#f5f5f5}
    @media print{body{margin:8mm}}
  </style></head><body>
    <h1>VGM LIST — M/V ${vsl} VOY ${voy}</h1>
    <div class="sub">POL: KRPTK (PYEONGTAEK) · DATE: ${today} · TOTAL ${rows.length} UNITS` +
    (missing ? ` · <span class="warn">⚠ ${missing} unit(s) without VGM</span>` : '') + `</div>
    <table><thead><tr><th>NO</th><th>CONTAINER NO</th><th>TYPE</th><th>F/E</th><th>VGM (KG)</th></tr></thead>
    <tbody>${trs}</tbody>
    <tfoot><tr><td colspan="4">TOTAL ${rows.length} UNITS</td><td class="num">${total.toLocaleString()} KG</td></tr></tfoot>
    </table></body></html>`;
}
/** X-RAY 세관봉인 확인서 HTML — 2.26-02.
 *
 *  ⚠ **인쇄는 별도 문서로 연다.** 2.26 은 앱 화면 안에 `.xr-print` 를 두고
 *    `@media print { body > *:not(.xr-print){display:none} }` 로 가렸는데,
 *    그 블록은 body 직계가 아니라 React 트리(`#root`) 안이라 **부모가 숨으면 같이 숨는다.**
 *    미리보기가 통째로 **검은 화면**으로 나왔다(검수사 실측 2026-08-24).
 *    ★ 이 사고는 저장소에 이미 있었다 — planedit V9.12 «인쇄 백지 — CARGO_V2_CSS 의
 *      `body>*:not(.cpv2-overlay)` 규칙이 #root 를 숨기던 문제». 같은 함정을 새로 짜서 또 밟았다.
 *    ⇒ 검수 리스트·VGM 과 **같은 벌**을 쓴다 — 문자열로 문서를 만들어 새 창에 쓴다. 앱 CSS 와 안 싸운다.
 *
 *  머리 여섯 칸은 **기존 출력물 그대로다**(검수사 «출력물이 기존자료에서 빠진게 없어야 합니다»).
 *  값이 없는 칸은 손글씨용 밑줄로 — 백지로 뽑아 현장에서 적는 쓰임을 위해서다. */
export function generateXrayListHTML(rows, head = {}, perPage = 20) {
  const esc = _esc;   // 3.45: 이스케이프 규칙은 모듈 한 곳(_esc)에 있다 — 종전 지역 정의는 그 진부분집합이었다
  const n = Math.max(1, Math.ceil(rows.length / perPage));
  const per = Math.ceil(rows.length / n) || 1;          // 균등 분할 — 40대는 20+20
  //  ★ 폰트 자동조절 — 시안 표 그대로(10대 9.5pt/pad8 · 20대 8pt/pad5).
  //    시안의 «30대 6.5pt · 40대+ 6pt» 구간은 **쓰지 않는다** — 검수사 확정
  //    *«최소 크기가 넘어가면 2장이 되면 됩니다»* 로, 6pt 는 선내 조명에 장갑 낀 손으로 못 읽는다.
  //    한 장에 20대까지만 담으므로 여기 오는 `per` 는 언제나 20 이하다.
  //    ⚠ **장당 대수로 정한다** — 전체 대수로 하면 21대(11+10)에서 장마다 글씨가 달라진다.
  const cfg = per <= 10 ? { f: 9.5, p: 8 } : { f: 8, p: 5 };
  const pages = Array.from({ length: n }, (_, i) => rows.slice(i * per, (i + 1) * per));
  const BLANK = '<span class="bl"></span>';
  const body = pages.map((pg, pi) => `
    <div class="pg">
      <div class="ti"><b>${esc(head.name || '')} XRAY리스트</b><span class="pn">${
        esc(head.sub || '')}${head.sub && n > 1 ? ' · ' : ''}${n > 1 ? `${pi + 1} / ${n} 장` : ''}</span></div>
      <table class="hd">
        <tr><th>항차/항공편명</th><td>${esc(head.voy)}</td><th>운항선사</th><td colspan="3">${esc(head.carrier)}</td></tr>
        <tr><th>입항일자</th><td>${esc(head.eta)}</td><th>양륙항</th><td colspan="3">${esc(head.pod)}</td></tr>
        <tr><th>선박명</th><td>${esc(head.name)}</td><th>선박 호출부호</th><td>${esc(head.callsign)}</td><th>MRN</th><td>${esc(head.mrn) || '&nbsp;'}</td></tr>
      </table>
      <table class="ls">
        <thead><tr>
          <th class="w4">No.</th><th class="w15">컨테이너번호</th><th class="w13">선사SEAL NO</th>
          <th class="w12">화물구분</th><th class="w8">규격</th><th class="w12">선내위치</th>
          <th class="w20">부착 세관봉인번호</th><th class="w16">봉인자</th>
        </tr></thead>
        <tbody>${pg.map((r, i) => `<tr>
          <td>${pi * per + i + 1}</td><td class="b">${esc(r.cn)}</td><td>${esc(r.seal)}</td>
          <td>${esc(r.kind)}</td><td>${esc(r.iso)}</td><td>${esc(r.pos)}</td>
          <td>${r.cSeal ? esc(r.cSeal) : BLANK}</td><td>${r.sealer ? esc(r.sealer) : BLANK}</td>
        </tr>`).join('')}</tbody>
      </table>
      <div class="ft">GREEN MARINE CO., LTD.</div>
    </div>`).join('');
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<title>${esc(head.name || '')} XRAY리스트</title><style>
/*  여백은 시안 기준 그대로 — 좌우 1.8cm · 상 1.9cm · 하 1cm (검수사 TXT·시안 @page 일치) */
@page { size: A4 landscape; margin-top:1.9cm; margin-left:1.8cm; margin-right:1.8cm; margin-bottom:1cm; }
body { font-family:'Malgun Gothic',sans-serif; margin:0; padding:12px; color:#000; background:#fff; font-size:${cfg.f}pt; }
/*  검수사 확정 2026-08-24 — 회사명은 **용지 맨 아래**에 붙어야 한다. 표 바로 밑에 두면
    행 수에 따라 위아래로 움직여 서류마다 자리가 달라진다(2대짜리와 20대짜리가 다르게 나온다).
    ⇒ 쪽마다 내용 높이를 확보하고 바닥글을 아래로 밀어붙인다.
      A4 가로 높이 21cm − 상 1.9cm − 하 1cm = **18.1cm** 가 한 쪽의 내용 높이다.
      세로 flex 에서 margin-top:auto 가 남는 공간을 전부 위로 밀어 바닥에 붙인다. */
.pg { page-break-after: always; min-height: 18.1cm; display: flex; flex-direction: column; }
.pg:last-child { page-break-after: auto; }
.ti { font-size:13pt; margin-bottom:5px; display:flex; justify-content:space-between; align-items:flex-end; }
.pn { font-size:8pt; font-weight:400; }
table { width:100%; border-collapse:collapse; }
/*  검수사 확정 2026-08-24 — 머리표에 MRN 이 너무 작아 보인다. 리스트와 같은 폭으로 늘려 놓으니
    여섯 칸이 균등하게 쪼개져 MRN 값칸이 눌렸다. 기존 샘플은 머리표가 리스트보다 좁다.
    ⇒ 폭을 줄이고 table-layout:auto 로 내용에 맞게 잡는다. 라벨은 줄바꿈 금지.
    ⚠ 이 주석은 템플릿 문자열 안이다 — 백틱을 쓰면 문자열이 끊긴다(지침서 2026-08-13 실측). */
.hd { width:64%; margin-bottom:6px; table-layout:auto; }
.hd th { white-space:nowrap; padding-left:8px; padding-right:8px; }
.hd td { white-space:nowrap; padding-left:10px; padding-right:10px; }
th,td { border:1px solid #333; padding:${cfg.p}px 3px; text-align:center; }
th { background:#eee; font-weight:700; }
/*  검수사 확정 2026-08-24: **출력양식은 전부 중앙정렬.** 머리 표 값칸도 예외 없다. */
.b { font-weight:700; }
.bl { display:block; min-height:13px; border-bottom:1px solid #999; }
/*  검수사 지시 2026-08-24 — 출력물 좌측 하단의 about:blank 자리를 회사명으로.
    ⚠ about:blank 은 **브라우저가 찍는 그 탭의 주소**다(내용이 아니라 주소). 새 창을 빈 주소로 열어
      문서를 써 넣는 방식이라 주소가 없고, 그래서 브라우저가 그렇게 적는다. 그 자리는 페이지에서 못 바꾼다.
    ⇒ 우리 바닥글을 쪽마다 직접 찍는다. 브라우저 머리글·바닥글은 인쇄 설정에서 끄면 사라진다. */
.ft { margin-top:auto; padding-top:6px; text-align:center; font-size:7pt; letter-spacing:0.06em; color:#333; }
.w4{width:4%}.w8{width:8%}.w12{width:12%}.w13{width:13%}.w15{width:15%}.w16{width:16%}.w20{width:20%}
/*  검수사 확정 2026-08-24 — 출력은 PDF 가 기본이지만 인쇄도 되고 엑셀로도 받아져야 한다.
    검수 리스트·VGM 과 같은 벌이다 — 새 창 위에 버튼을 두고, 인쇄할 때만 숨긴다. */
.actions { position:sticky; top:0; background:#1e293b; padding:8px; display:flex; gap:8px; z-index:100; margin:-12px -12px 10px; }
.actions button { flex:1; padding:10px; font-size:13px; font-weight:700; border:none; border-radius:6px; cursor:pointer; color:#fff; }
.btn-print { background:#0369a1; } .btn-excel { background:#15803d; } .btn-close { background:#475569; }
@media print { .no-print { display:none !important; }
  body { -webkit-print-color-adjust:exact; print-color-adjust:exact; padding:0; } }
</style></head><body>
<div class="actions no-print">
  <button class="btn-print" onclick="window.print()">PDF 저장 / 인쇄</button>
  <button class="btn-excel" onclick="window.__exportXrayXlsx &amp;&amp; window.__exportXrayXlsx()">📊 엑셀 받기</button>
  <button class="btn-close" onclick="window.close()">닫기</button>
</div>${body}</body></html>`;
}

export function openXrayListPrint(rows, head, perPage = 20) {
  const w = window.open('', '_blank', 'width=1200,height=900');
  if (!w) { alert('팝업 차단을 해제해주세요'); return; }
  w.document.write(generateXrayListHTML(rows, head, perPage));
  w.document.close();
  /*  ★ 2.41 — **진짜 엑셀(.xlsx)** 로 내보낸다.
      검수사 확정 *«진짜 엑셀로 받아져야 합니다. 양식이 중요 하니까요»* · *«폰트는 굴림체 10입니다»*
      종전 CSV 는 글자만 담는 텍스트라 폰트도 서식도 못 실었다 — 이름만 「엑셀」이었다.
      ⚠ 열 구성은 인쇄물과 **다르다**(검수사 실물 샘플 기준). tallyExcel.generateXrayExcel 주석 참조.
      ⚠ exceljs 는 1MB 라 **누를 때만** 동적 import 한다(마감 텔리와 같은 방식). */
  w.__exportXrayXlsx = async function () {
    try {
      const { generateXrayExcel } = await import('./tallyExcel.js');
      await generateXrayExcel(rows, head);
    } catch (e) {
      //  조용히 실패하지 않는다(3금지 ③) — 눌렀는데 아무 일도 안 나면 검수사는 앱을 의심한다.
      try { w.alert('엑셀을 만들지 못했습니다 — ' + (e && e.message ? e.message : e)); }
      catch (e2) { alert('엑셀을 만들지 못했습니다 — ' + (e && e.message ? e.message : e)); }
    }
  };
}

export function openVgmListPrint(containers, voyageInfo) {
  const w = window.open('', '_blank', 'width=900,height=1200');
  if (!w) { alert('팝업 차단을 해제해주세요'); return; }
  w.document.write(generateVgmListHTML(containers, voyageInfo));
  w.document.close();
}

export function openInspectionListPrint(containers, mode, voyageInfo, shiftingList = []) {
  containers = withShipOp(containers, voyageInfo);   // 3.31: CSV 도 화면과 같은 선사로
  const html = generateInspectionListHTML(containers, mode, voyageInfo, shiftingList);
  const w = window.open('', '_blank', 'width=900,height=1200');
  if (!w) {
    alert('팝업 차단을 해제해주세요');
    return;
  }
  w.document.write(html);
  w.document.close();
  // M6.71: 엑셀 export 함수 새 창에 주입
  const sortedConts = [...containers].sort(inspSortCmp);   // 3.60: 종이와 같은 순서(종전 비교식은 객체끼리 빼서 NaN — 사실상 정렬이 안 됐다)
  const vsl = voyageInfo?.vsl || voyageInfo?.vslFull || 'VESSEL';
  // V9.57: CSV 파일명 항차도 모드별 필드 우선(위 generateInspectionListHTML과 동일 기준)
  const voy = (mode === 'discharge'
    ? (voyageInfo?.voy_d || voyageInfo?.voy || voyageInfo?.voy_l)
    : (voyageInfo?.voy_l || voyageInfo?.voy || voyageInfo?.voy_d)) || '';
  const modeKo = mode === 'discharge' ? '양하' : '선적';
  const dateStr = new Date().toISOString().slice(0, 10);
  w.__inspectionData = { containers: sortedConts, vsl, voy, modeKo, dateStr };
  w.__exportExcel = function() {
    const d = w.__inspectionData;
    // 엑셀 호환 양식 — CSV (UTF-8 BOM + 한글 헤더)
    let csv = '\uFEFF';
    csv += '순번,컨테이너번호,실번호,규격,F/E,선사,비고\n';
    const _no = inspNumber(d.containers);   // 3.60: 종이와 같은 묶음별 순번
    d.containers.forEach((c, i) => {
      const cn = (c.cn || '').replace(/,/g, '');
      const seal = String(c.sl || c.seal || '').replace(/,/g, '');   // TallyOne 2.00: 실번호 필드는 sl — seal 만 봐서 CSV 실번호가 늘 비었다
      //  ★ 3.45 — 종이와 같은 규격·F/E 를 쓴다. 종전엔 규격이 iso 날것(4510)이고
//    F/E 기본값이 종이(E)와 반대(F)여서 같은 배를 종이와 엑셀이 다르게 적었다.
      const iso = _specOf(c).replace(/,/g, '');
      const fe = (c.fe || '').toUpperCase() === 'F' ? 'F' : 'E';
      const op = normalizeCarrier(c);
      const cat = getContainerCategory(c);
      const memo = [];
      if (c.dg) memo.push(`${(c.dgc || c.un) ? [c.dgc, c.un].filter(Boolean).join('/') : 'DG'}${c.pg ? ' PG' + c.pg : ''}`);   // TallyOne 2.00-03: «9/3480» 형식(클래스/UN만)
      const _t = (c.tmp != null && String(c.tmp).trim() !== '') ? c.tmp : c.temp;   // TallyOne 2.00: 온도 필드는 tmp (temp 만 봐서 늘 비었다)
      if (cat.type === 'reefer') memo.push(_t != null && String(_t).trim() !== '' ? _fmtTemp(_t) : '온도 미신고');   // 3.60: 온도만(종이와 같은 표기)
      //  ★ 3.45 — 인쇄물과 같은 표기를 CSV 에도(한쪽만 고치면 종이와 엑셀이 갈린다).
      if (c._xray) memo.push('XRAY' + (String(c._xraySealNo || '').trim() ? ' ' + String(c._xraySealNo).trim().replace(/,/g, '') : ''));
      const _ov = [];
      if (c.ovh) _ov.push('H+' + c.ovh);
      if (c.ovw) _ov.push('W+' + c.ovw);
      if (c.ovl) _ov.push('L+' + c.ovl);
      if (!_ov.length) { const _o = overDims(c); if (_o && _o.over) _ov.push(..._o.short); }   // 2.25
      const _shape = cat.type === 'fr' || c.fr || cat.type === 'ot' || c.ot;
      if (_shape) memo.push(_shapeNote(c));   // 3.60: 종이와 같은 오버/인게이지
      else if (_ov.length) memo.push('OOG ' + _ov.join(' ') + 'cm');   // TallyOne 2.00
      csv += `${_no[i]},${cn},${seal},${iso},${fe},${op},${memo.join(' ')}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = w.document.createElement('a');
    a.href = url;
    a.download = `검수리스트_${d.vsl}_${d.voy}_${d.modeKo}_${d.dateStr}.csv`;
    w.document.body.appendChild(a);
    a.click();
    w.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  // 자동 인쇄 시 사용자가 당황할 수 있어 자동 호출 X. 직접 Ctrl+P
}
