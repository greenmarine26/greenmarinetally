// 공통 유틸리티 — V39 (2026.05.05 / M3.6)
export const APP_VERSION = 'M3.6.1';

// 변경점:
//   - parseBAPLIE: NAD+CA+ 처리 추가 (V37은 NAD+CF만), LOC+76(환적) 처리,
//                  TDT 캐리어 추출, ISO 4500/4200/2500/2200 등 4자리 숫자 코드 매핑,
//                  EQD status 4/5 → F/E 매핑 강화
//   - isoToLabel/isoToPdfLabel: 4자리 숫자 ISO 코드(4500=40HC GP 등) 처리
//   - parseAscFile: 코멘트 라인(***) 무시, NAD 다음 KRPTK 붙은 확장 라인 처리
//   - parseListExcel: 헤더 키워드 대폭 확장(cntno/cont no/cnt#/cntr#/loading list 등),
//                     실번호 키워드 확장(seal#/봉인/sealno1 등), 빈 행 건너뛰기 강화,
//                     fallback 모드 정확도 개선
// V37 출력 필드 100% 호환 (App.jsx 무수정)

export const _storage = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  remove: (k) => { try { localStorage.removeItem(k); return true; } catch { return false; } },
};

export const SK = {
  inspectors: 'master_inspectors_v1',
  activeInspector: 'master_active_inspector_v1',
  dischargeVoyages: 'discharge_voyages_v1',
  dischargeActive: 'discharge_active_v1',
  dischargeCompleted: 'discharge_completed_v1',
  dischargeXray: 'discharge_xray_v1',
  dischargeXraySeals: 'discharge_xray_seals_v1',
  loadingVoyages: 'loading_voyages_v1',
  loadingActive: 'loading_active_v1',
  loadingCompleted: 'loading_completed_v1',
};

// === Helpers ===
// M3.1: bay 정규화 — EDI는 BBBRRTT 7자리지만 검수원 표시는 ##-##-## 형식
// "016" → "16", "001" → "1", "100" → "100" (3자리 베이는 보존)
export const normalizeBay = (b) => {
  if (b === null || b === undefined || b === '') return '';
  const s = String(b).trim();
  const n = parseInt(s, 10);
  return isNaN(n) ? '' : String(n);
};

// 위치 표시: 베이는 정규화(앞 0 제거), row/tier는 원본 2자리 유지
export const fmtPos = (c) => {
  if (!c || !c.bay) return '';
  return `${normalizeBay(c.bay)}-${c.row || ''}-${c.tier || ''}`;
};

// M3.1: 한국어 음성 읽기 헬퍼 — "16-01-86" → "십육번 베이 공일에 팔육"
// 베이 = 한국어 정수 (16 → 십육), row/tier = 자릿수별 (01 → 공일, 86 → 팔육)
const KR_DIGIT = ['공','일','이','삼','사','오','육','칠','팔','구'];
const sinoKorean = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '';
  if (n === 0) return '공';
  if (n < 10) return KR_DIGIT[n];
  if (n < 20) return n === 10 ? '십' : '십' + KR_DIGIT[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const r = n % 10;
    return KR_DIGIT[t] + '십' + (r === 0 ? '' : KR_DIGIT[r]);
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return (h === 1 ? '백' : KR_DIGIT[h] + '백') + (rest === 0 ? '' : sinoKorean(rest));
  }
  return String(n);
};
const spellDigits = (s) => {
  if (!s) return '';
  return String(s).split('').map(d => {
    const n = parseInt(d, 10);
    return isNaN(n) ? d : KR_DIGIT[n];
  }).join('');
};
// 위치를 한국어 음성으로 ("십육번 베이 공일에 팔육")
export const spellPos = (c) => {
  if (!c || !c.bay) return '';
  const bayN = parseInt(normalizeBay(c.bay), 10);
  if (isNaN(bayN)) return '';
  return `${sinoKorean(bayN)}번 베이 ${spellDigits(c.row)}에 ${spellDigits(c.tier)}`;
};
// 좌표 문자열("16-01-86")을 음성용으로 변환 (AI 답변 후처리에 사용)
export const spellPosString = (str) => {
  if (!str) return '';
  // "16-01-86" 또는 "016-01-86" 패턴 매칭
  return String(str).replace(/(\d{1,3})-(\d{2})-(\d{2})/g, (m, b, r, t) => {
    const bayN = parseInt(b, 10);
    if (isNaN(bayN)) return m;
    return `${sinoKorean(bayN)}번 베이 ${spellDigits(r)}에 ${spellDigits(t)}`;
  });
};

export const formatWt = (wt) => {
  if (!wt) return '0kg';
  if (wt > 1000) return `${(wt/1000).toFixed(1)}t`;
  return `${wt}kg`;
};

export const isoToLabel = (iso) => {
  if (!iso) return '';
  const p = String(iso).toUpperCase().trim().replace(/\s+/g, '');

  // M3.6: ISO 6346 정확 해석
  // 첫 자리: 길이 (2=20ft, 4=40ft, L=45ft)
  // 둘째 자리: 높이 (0,2=8'6"표준, 5=9'6"Hi-Cube)
  // 셋째 자리: 타입 (G=GP, R=Reefer, P=Platform/FR, U=OT, T=Tank, B=Bulk)
  //
  // 주의:
  //   45G0/45G1 = 40피트 Hi-Cube (45가 45피트 아님!)
  //   45R0/45R1 = 40피트 Hi-Cube Reefer
  //   L5G0/L5G1 = 45피트 GP
  //   L5R0/L5R1 = 45피트 Reefer

  // === 45피트 컨테이너 (첫 자리 = L) ===
  // 현실: 45피트는 GP/HC(드라이)만 존재. 리퍼/FR/OT/TK 컨테이너는 없음.
  // 잘못된 표기(L5R 등)도 45HC로 처리 (검수원이 현장에서 실물 재확인)
  if (/^L[0-9]/.test(p) || /^L[GRPUT]/.test(p)) {
    return '45HC';   // L5G0, L5G1, L5HC 등 = 45피트 드라이
  }

  // === 40피트 Hi-Cube (4500-4699 숫자 + 45GX/45RX 알파벳) ===
  // 4500=40HC, 4582=40RF, 4583=40FR, 4590=40OT
  if (/^45[0-9][0-9]$/.test(p)) {
    if (/^458[3-4]$/.test(p)) return '40FR';   // 4583/4584 = FR (먼저 좁은 범위)
    if (/^458[25]$/.test(p)) return '40RF';    // 4582/4585 = RF
    if (/^459/.test(p)) return '40OT';
    return '40HC';   // 4500, 4510, 4530 등
  }
  // === 46XX (4로 시작 = 40피트, 잘못된 표기) ===
  // M3.6: ISO 6346 표준상 4XXX는 무조건 40피트. 45피트는 L 시작이어야 함.
  if (/^46/.test(p)) {
    return '40HC';
  }
  // 알파벳 형식: 4로 시작하면 무조건 40피트
  //   45RF/45HC/45GP (신표기) → 모두 40피트 (4=40ft 원칙)
  //   45R0/45R1/45G0/45G1 (ISO 6346) → 40HC/40RF
  if (/^45RF/.test(p)) return '40RF';
  if (/^45HC/.test(p)) return '40HC';
  if (/^45GP/.test(p)) return '40HC';
  if (/^45[GRPU]/.test(p)) {
    if (/^45P/.test(p)) return '40FR';
    if (/^45U/.test(p)) return '40OT';
    if (/^45R/.test(p)) return '40RF';
    return '40HC';
  }

  // === V38 신규: 4자리 숫자 ISO 코드 (4200, 4210, 2200, 2280 등) ===
  if (/^42[0-9][0-9]$/.test(p)) {
    if (/^428[3-4]$/.test(p)) return '40FR';   // 4283/4284 먼저 (좁은 범위)
    if (/^428[25]$/.test(p)) return '40RF';
    return '40DC';
  }
  if (/^25[0-9][0-9]$/.test(p)) return '20DC';   // 25xx (20HC) = 20DC fallback
  if (/^22[0-9][0-9]$/.test(p)) {
    if (/^228[3-4]$/.test(p)) return '20FR';   // 2283/2284 = FR (먼저 좁은 범위)
    if (/^228[25]$/.test(p)) return '20RF';    // 2282/2285 = RF
    return '20DC';
  }

  // === 알파벳 형식 - 40피트 Standard Height ===
  if (/^40HR/.test(p)) return '40RF';
  if (/^4[24]R/.test(p)) return '40RF';
  if (/^40R/.test(p)) return '40RF';
  if (/^40F[PR]/.test(p)) return '40FR';
  if (/^4[24]P/.test(p)) return '40FR';
  if (/^4[24]O/.test(p)) return '40OT';
  if (/^40O/.test(p)) return '40OT';
  if (/^4[24]U/.test(p)) return '40OT';
  if (/^40T/.test(p)) return '40TK';
  if (/^4[24]T/.test(p)) return '40TK';
  if (/^40HC/.test(p)) return '40HC';
  if (/^4[24]H/.test(p)) return '40HC';
  if (/^43/.test(p)) return '40HC';
  if (/^40[DG]/.test(p)) return '40DC';
  if (/^4[24][G][P0-9]/.test(p)) return '40DC';

  if (/^20R/.test(p)) return '20RF';
  if (/^2[02][R]/.test(p)) return '20RF';
  if (/^20F[PR]/.test(p)) return '20FR';
  if (/^2[02][P]/.test(p)) return '20FR';
  if (/^20O/.test(p)) return '20OT';
  if (/^2[02][U]/.test(p)) return '20OT';
  if (/^20T/.test(p)) return '20TK';
  if (/^2[02][T]/.test(p)) return '20TK';
  if (/^20[GD]/.test(p)) return '20DC';
  if (/^2[02][G][P0-9]/.test(p)) return '20DC';

  // fallback
  if (p[0] === '4') {
    const t = p[2];
    if (t === 'R') return '40RF';
    if (t === 'P' || t === 'F') return '40FR';
    if (t === 'O' || t === 'U') return '40OT';
    if (t === 'T') return '40TK';
    if (t === 'H') return '40HC';
    if (t === 'G' || t === 'D') return '40DC';
    if (t === '0') return '40HC';   // V38: 4500 → 40HC fallback
    return '40' + (t || '?');
  }
  if (p[0] === '2') {
    const t = p[2];
    if (t === 'R') return '20RF';
    if (t === 'P' || t === 'F') return '20FR';
    if (t === 'O' || t === 'U') return '20OT';
    if (t === 'T') return '20TK';
    if (t === 'G' || t === 'D') return '20DC';
    if (t === '0') return '20DC';
    return '20' + (t || '?');
  }
  // M3.6: 알 수 없는 표기 → 그대로 반환 (UI에서 ⚠️ 마킹 + 사진 보고 유도)
  return p;
};

// M3.6: ISO 코드가 알려진 규격으로 변환되는지 확인
// 변환 안 되거나 ?가 포함되면 "미지" 표기 → 검수원이 현장 확인 + 사진 필요
export const isUnknownIso = (iso) => {
  if (!iso) return false;
  const label = isoToLabel(iso);
  if (!label) return true;
  // 정상 변환된 라벨 화이트리스트
  const known = new Set([
    '20DC', '20HC', '20RF', '20FR', '20OT', '20TK',
    '40DC', '40HC', '40RF', '40FR', '40OT', '40TK',
    '45HC', '45GP'
  ]);
  if (known.has(label)) return false;
  // ?가 포함되거나 알 수 없는 길이/타입
  if (label.includes('?')) return true;
  // 라벨이 정확한 형식 (XXYY, XX 길이 + YY 타입)이 아니면 미지
  if (!/^(20|40|45)[A-Z]{2}$/.test(label)) return true;
  return false;
};

export const isoToPdfLabel = (iso, tp) => {
  if (tp && tp.length >= 3) return tp.toUpperCase().trim();
  const lbl = isoToLabel(iso);
  if (!lbl) return '';
  if (lbl === '20DC') return 'DC20';
  if (lbl === '40DC') return 'DC40';
  if (lbl === '40HC') return 'DCHC';
  if (lbl === '20RF') return 'RF20';
  if (lbl === '40RF') return 'RFHC';
  if (lbl === '20TK') return 'TK20';
  if (lbl === '40TK') return 'TK40';
  if (lbl === '20FR') return 'FR20';
  if (lbl === '40FR') return 'FR40';
  if (lbl === '20OT') return 'OT20';
  if (lbl === '40OT') return 'OT40';
  return lbl;
};

export const isoCategory = (iso) => {
  const lbl = isoToLabel(iso);
  if (!lbl) return '?';
  if (lbl === '20DC' || lbl === '20GP') return '20DC';
  if (lbl === '40DC' || lbl === '40GP') return '40DC';
  if (lbl === '40HC') return '40HC';
  if (lbl.endsWith('RF')) return 'RF';
  if (lbl.endsWith('TK')) return 'TK';
  if (lbl.endsWith('FR')) return 'FR';
  if (lbl.endsWith('OT')) return 'OT';
  return lbl;
};

// === BAPLIE EDI Parser (V38 강화) ===
// 표준 EDIFACT D.95B SMDG22.
// V38 변경: NAD+CA 추가, LOC+76 처리, TDT carrier, 4자리 숫자 ISO 매핑,
//           status 4=Empty/5=Full 매핑 강화 (현장 BAPLIE 통상)
export function parseBAPLIE(ediText) {
  const result = {
    vsl: '', voy: '', pol: '', etd: '', eta: '',
    carrier: '',                       // V38 신규
    containers: [], errors: [],
  };
  const text = ediText.replace(/\r?\n/g, '');
  const segments = text.split("'").filter(s => s.length > 0);
  let cur = null;

  for (const seg of segments) {
    if (seg.startsWith('TDT+')) {
      // TDT+20+0521W+++CKL:172:20+++BSDU:103:11:XIN TAI PING
      const parts = seg.split('+');
      result.voy = parts[2] || '';
      // carrier (5번째 element의 첫 token)
      if (parts[5]) {
        const cc = parts[5].split(':')[0];
        if (cc) result.carrier = cc;
      }
      // 선박명: 마지막 element의 마지막 영문 token
      const lastField = parts[parts.length - 1] || '';
      const subTokens = lastField.split(':');
      for (let i = subTokens.length - 1; i >= 0; i--) {
        const t = subTokens[i].trim().replace(/['"]/g, '');
        if (t && !/^\d+$/.test(t) && /[A-Z]/.test(t)) { result.vsl = t; break; }
      }
    } else if (seg.startsWith('LOC+5+') && !cur) {
      result.pol = seg.substring(6).split(':')[0];
    } else if (seg.startsWith('DTM+178:') || seg.startsWith('DTM+136:')) {
      const v = seg.split(':')[1];
      if (v) result.etd = v.substring(0, 8);
    } else if (seg.startsWith('LOC+147+')) {
      if (cur) result.containers.push(cur);
      const slot = seg.substring(8).split(':')[0];
      cur = {
        cn: '', l4: '', iso: '', tp: '', fe: 'F',
        pol: '', pod: '', npod: '',           // npod = next POD (LOC+76)
        wt: 0, wtt: '',
        bay: '', row: '', tier: '',
        op: '',
        dg: false, dgc: '', un: '',
        rf: false, tk: false, oog: false,
        sl: '', sh: '', bl: '',
        tmp: '',
        st: '',                                // V38: raw status code
      };
      // 위치는 보통 7자리(BBBRRTT) 또는 6자리(BBRRTT)
      // M3.1: bay는 정규화해서 저장 (앞 0 제거, "016"→"16", "001"→"1")
      if (slot.length >= 7) {
        cur.bay = normalizeBay(slot.substring(0, 3));
        cur.row = slot.substring(3, 5);
        cur.tier = slot.substring(5, 7);
      } else if (slot.length === 6) {
        cur.bay = normalizeBay(slot.substring(0, 2));
        cur.row = slot.substring(2, 4);
        cur.tier = slot.substring(4, 6);
      }
    } else if (cur && seg.startsWith('EQD+CN+')) {
      const parts = seg.split('+');
      cur.cn = (parts[2] || '').replace(/[\s\-]/g, '').toUpperCase().trim();
      cur.l4 = cur.cn.slice(-4);
      const isoField = parts[3] || '';
      cur.iso = (isoField.split(':')[0] || '').toUpperCase();

      // 특수화물 자동 감지 (ISO 3번째/4번째 글자)
      if (cur.iso.length >= 3) {
        const t = cur.iso[2];
        if (t === 'R') cur.rf = true;
        if (t === 'U' || t === 'O') cur.oog = true;
        if (t === 'T' || (t >= '7' && t <= '9')) cur.tk = true;
        if (t === 'P' || t === 'F') cur.oog = true;   // FR
      }
      // 4자리 숫자 코드 (4582 등) reefer
      if (/^[24]58[2-5]$/.test(cur.iso)) cur.rf = true;
      if (/^[24]59/.test(cur.iso)) cur.oog = true;

      // status — V37 raw element 5
      const rawStatus = (parts[5] || '').trim();
      cur.st = rawStatus;
      // BAPLIE EDIFACT 표준 (실측 검증):
      //  5 = Full (Loaded) — 8~28톤
      //  4 = Empty — 컨 자체 무게만 (3.8톤 등)
      // 명시적 'F'/'E' 우선
      if (rawStatus === 'F') cur.fe = 'F';
      else if (rawStatus === 'E') cur.fe = 'E';
      else if (rawStatus === '5') cur.fe = 'F';   // 5 = Full
      else if (rawStatus === '4') cur.fe = 'E';   // 4 = Empty
      else cur.fe = 'F'; // 기본 Full

      // 화면 표시용 tp
      if (cur.iso.startsWith('22')) cur.tp = "20'GP";
      else if (cur.iso.startsWith('25')) cur.tp = "20'HC";
      else if (cur.iso.startsWith('42') || cur.iso.startsWith('44')) cur.tp = "40'GP";
      else if (cur.iso.startsWith('45')) cur.tp = "40'HC";
      else if (/^458[2-5]$/.test(cur.iso)) cur.tp = "40'RF";
      else if (/^228[2-5]$/.test(cur.iso)) cur.tp = "20'RF";
    } else if (cur && seg.startsWith('LOC+9+')) {
      cur.pol = seg.substring(6).split(':')[0];
    } else if (cur && seg.startsWith('LOC+11+')) {
      cur.pod = seg.substring(7).split(':')[0];
    } else if (cur && seg.startsWith('LOC+76+')) {
      // V38 신규: 환적/추가 POL
      cur.npod = seg.substring(7).split(':')[0];
    } else if (cur && seg.startsWith('MEA+')) {
      // MEA+WT++KGM:2100  또는  MEA+VGM++KGM:17272
      const parts = seg.split(':');
      const last = parts[parts.length - 1];
      const num = parseInt(last);
      if (!isNaN(num) && num > 100) {
        // VGM 우선 (실측), 없으면 WT
        const isVGM = seg.includes('VGM');
        if (isVGM || !cur.wt) {
          cur.wt = num;
          cur.wtt = isVGM ? 'VGM' : 'WT';
        }
      }
    } else if (cur && (seg.startsWith('TMP+2+') || seg.startsWith('TMP+'))) {
      const v = seg.substring(6).split(':')[0];
      if (v) {
        // 정규화: "-018" → "-18", "000" → "0", "-02.5" → "-2.5"
        let norm = v.trim();
        const m = norm.match(/^([+-]?)0*(\d+(?:\.\d+)?)$/);
        if (m) norm = (m[1] || '') + m[2];

        // M3.6: 0°C는 실제 온도 (신선 채소, 의약품 등 0도 운반 화물 존재)
        //   - 검수원이 직접 입력한 0도와 EDI 0도 모두 그대로 0°C로 인식
        //   - 진짜 미입력은 빈 값(공백)인 경우만
        cur.rf = true;
        cur.tmp = norm;  // "0"이든 "-18"이든 그대로
      } else {
        // TMP 세그먼트는 있는데 값이 진짜 비어있는 경우만 미입력
        cur.rf = true;
        cur.tmp = '';
        cur.tmp_missing = true;
      }
    } else if (cur && seg.startsWith('RNG+5+')) {
      const parts = seg.split(':');
      if (parts.length >= 3) {
        cur.tmp = parts[2] + (parts[3] ? '~' + parts[3] : '');
        cur.rf = true;
      }
    } else if (cur && seg.startsWith('DGS+IMD+')) {
      cur.dg = true;
      const parts = seg.split('+');
      cur.dgc = parts[2] || '';
      cur.un = parts[3] || '';
    } else if (cur && seg.startsWith('DIM+')) {
      cur.oog = true;
    } else if (cur && seg.startsWith('FTX+AAY+++')) {
      cur.op = seg.substring(10).substring(0, 5).trim();
    } else if (cur && (seg.startsWith('NAD+CF+') || seg.startsWith('NAD+CA+'))) {
      // V38: CF (Container Forwarder) + CA (Carrier) 둘 다 op로 매핑
      // NAD+CA+CLL:172:20  → CLL
      const code = seg.substring(7).split(':')[0];
      if (code && !cur.op) cur.op = code;
    } else if (cur && seg.startsWith('RFF+BM:')) {
      // BL 참조
      cur.bl = seg.substring(7);
    }
  }
  if (cur) result.containers.push(cur);

  // 무게 기반 F/E 검증 (현장 경험: 20피트 Empty ≈ 2.2t, 40피트 Empty ≈ 3.8t)
  // status 코드와 무게가 충돌하면 무게 우선 (현장 실측)
  for (const c of result.containers) {
    if (c.wt > 0) {
      const is20 = c.iso && (c.iso.startsWith('22') || c.iso.startsWith('25'));
      const is40 = c.iso && (c.iso.startsWith('42') || c.iso.startsWith('44') || c.iso.startsWith('45'));
      if (is20 && c.wt <= 2500) c.fe = 'E';
      else if (is40 && c.wt <= 4500) c.fe = 'E';
      else if (c.wt > 5000) c.fe = 'F';
    }
  }

  if (!result.vsl) result.errors.push('선박명을 인식하지 못했습니다.');
  if (result.containers.length === 0) result.errors.push('컨테이너를 찾지 못했습니다.');
  return result;
}

// === ASC Parser (V38 보조) ===
// 사용자 지침: ASC 는 참조용 (현장 표준은 EDI). EDI 의 검증/보완 용도로만 사용.
// V38: 코멘트 라인(***) 무시, NAD 다음 KRPTK 붙은 확장 라인(환적) 처리
export function parseAscFile(text) {
  const lines = text.split(/\r?\n/);
  const containers = [];
  let vsl = '', voy = '';

  for (const ln of lines) {
    if (ln.startsWith('$604')) {
      const parts = ln.substring(4).split('/');
      if (parts.length >= 3) {
        vsl = (parts[1] || '').trim();
        voy = (parts[2] || '').trim();
      }
      break;
    }
  }

  for (const line of lines) {
    if (line.length < 50) continue;
    if (line.startsWith('$')) continue;
    if (line.trimStart().startsWith('***')) continue;   // V38: 코멘트 무시

    const slot = line.substring(0, 6).trim();
    if (!/^\d{6}$/.test(slot)) continue;
    const cn = line.substring(7, 18).replace(/[\s\-]/g, '').toUpperCase();
    // M3.5.5: 컨번호 빈 라인(선적 엠티)도 허용 — F/E와 POL/POD 정보는 유효
    //   엠티 실 부착 작업에서는 컨번호 없는 엠티 슬롯도 표시 대상
    const hasCn = /^[A-Z]{4}\d{7}$/.test(cn);
    if (cn && !hasCn) continue;  // 컨번호가 있는데 형식 이상이면 스킵

    const bay = normalizeBay(slot.substring(0, 2));
    const row = slot.substring(2, 4);
    const tier = slot.substring(4, 6);
    // V38: NAD 위치 19~21 (3글자 표준), 그 다음 추가 KRPTK 5자가 있을 수도
    const nad = line.substring(19, 22).trim();
    const ext = line.substring(22, 27);                 // 공백 또는 KRPTK (확장)
    let op = nad;

    const typeBlock = line.substring(44, 54).trim();
    let tp = '', iso = '', fe = 'F', wt = 0;

    let m1 = typeBlock.match(/^([A-Z]{2}\d{2})(\d{3})([FE])/);
    let m2 = typeBlock.match(/^(\d{2}[A-Z]{2})(\d{3})([FE])/);
    let m4 = typeBlock.match(/^([A-Z]{4})(\d{3})([FE])/);

    if (m1) {
      tp = m1[1]; iso = m1[2] + 'GP'; fe = m1[3];
      if (tp.startsWith('TK')) iso = '22T6';
      if (tp.startsWith('RF')) iso = tp.endsWith('20') ? '22R5' : '45R1';
      if (tp.startsWith('DC') && tp.endsWith('20')) iso = '22GP';
      if (tp.startsWith('DC') && tp.endsWith('40')) iso = '42GP';
      if (tp === 'HC40') iso = '45GP';
      const wtMatch = line.substring(54, 100).match(/(\d{5})/);
      wt = wtMatch ? parseInt(wtMatch[1]) : 0;
    } else if (m4) {
      tp = m4[1];
      fe = m4[3];
      if (tp === 'DCHC') iso = '45GP';
      else if (tp === 'RFHC') iso = '45R1';
      else if (tp === 'RFHQ') iso = '45R1';
      else if (tp === 'DCDC') iso = '42GP';
      else iso = tp;
      const wtMatch = line.substring(54, 100).match(/(\d{5})/);
      if (wtMatch) wt = parseInt(wtMatch[1]);
      else wt = parseInt(m4[2]) * 100;
    } else if (m2) {
      iso = m2[1];
      wt = parseInt(m2[2]) * 100;
      fe = m2[3];
      tp = iso;
    }

    // POL/POD — 끝 10자리가 가장 안정적 (POL5+POD5)
    let pol = '', pod = '';
    const tail = line.replace(/\u0000/g, '').trim();
    const polPodEnd = tail.match(/([A-Z]{5})([A-Z]{5})$/);
    if (polPodEnd) {
      pol = polPodEnd[1]; pod = polPodEnd[2];
    } else {
      // fallback A: 첫 6자가 영문 = POL3+POD3
      const first6 = line.substring(27, 33);
      if (/^[A-Z]{6}$/.test(first6)) {
        pol = first6.substring(0, 3);
        pod = first6.substring(3, 6);
      } else {
        // fallback B: POL5+공백+POD5
        const posBlock = line.substring(27, 44);
        const m_polpod = posBlock.match(/^([A-Z]{5})\s+([A-Z]{5})/);
        if (m_polpod) { pol = m_polpod[1]; pod = m_polpod[2]; }
      }
    }

    // 무게 기반 F/E 검증
    let feFinal = fe;
    if (wt > 0) {
      const is20 = (tp && (tp.endsWith('20') || tp === 'DC20' || tp === 'RF20' || tp === 'TK20'))
                || (iso && iso.startsWith('22'));
      const is40 = (tp && (tp.endsWith('40') || tp === 'DC40' || tp === 'RF40' || tp === 'HC40'))
                || (iso && (iso.startsWith('42') || iso.startsWith('44') || iso.startsWith('45')));
      if (is20 && wt <= 2500) feFinal = 'E';
      else if (is40 && wt <= 4500) feFinal = 'E';
      else if (wt > 5000) feFinal = 'F';
    }

    containers.push({
      cn, bay, row, tier, iso, tp,
      fe: feFinal,
      wt, op, pol, pod,
      dg: false, dgc: '', un: '',
      rf: (tp && tp.startsWith('RF')) || (iso && iso[2] === 'R'),
      tk: (tp && tp.startsWith('TK')) || (iso && iso[2] === 'T'),
      oog: false,
      sl: '', sh: '', bl: '', tmp: '',
    });
  }
  return { vsl, voy, containers };
}

// === SheetJS Loader ===
export async function loadSheetJS() {
  if (window.XLSX) return window.XLSX;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return window.XLSX;
}

// === V38 신규: 시트 범위(!ref) 보정 ===
// 일부 회사 시스템이 만든 .xlsx 는 sheet1.xml 안에 dimension(!ref)을
// 잘못 적어둠 (예: 실제 66행인데 A1:Y5로 표기).
// SheetJS는 그 범위만 출력해서 데이터가 누락됨.
// → 실제 셀 키들로부터 범위를 재계산해서 강제 보정.
function fixSheetRange(ws, XLSX) {
  if (!ws) return ws;
  const keys = Object.keys(ws).filter(k => k[0] !== '!');
  if (keys.length === 0) return ws;
  let maxR = 0, maxC = 0;
  for (const k of keys) {
    const m = k.match(/^([A-Z]+)(\d+)$/);
    if (!m) continue;
    const col = m[1].split('').reduce((a, c) => a * 26 + (c.charCodeAt(0) - 64), 0) - 1;
    const row = parseInt(m[2]) - 1;
    if (row > maxR) maxR = row;
    if (col > maxC) maxC = col;
  }
  const realRef = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
  if (ws['!ref']) {
    try {
      const d = XLSX.utils.decode_range(ws['!ref']);
      if (d.e.r < maxR || d.e.c < maxC) ws['!ref'] = realRef;
    } catch { ws['!ref'] = realRef; }
  } else {
    ws['!ref'] = realRef;
  }
  return ws;
}

// === 양하 / 선적 리스트 Excel Parser (V38 대폭 강화) ===
// 9개 파일 양식 검증 완료:
//   - VSL/VYG/CNTNO/SEAL (마스터 양식)
//   - Container/SEAL (PCCR)
//   - CNTR NO/Seal No (TCL)
//   - Container No/Seal No (JBA, KRPTK)
//   - CONTAINER No./SEAL No. (CLL)
//   - CNTR NO./SEAL (SITC)
//   - Container No. (병합셀 양식)
export async function parseListExcel(arrayBuffer) {
  const XLSX = await loadSheetJS();
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const records = [];
  const seen = new Set();

  // 컨번호 헤더 패턴 (V38 확장 + M3.5.6 중국어/한국어 보강)
  const CN_HEAD = [
    /^container$/, /^containerno$/, /container\s*no/, /^containerno\.?$/,
    /^cntr$/, /^cntrno$/, /cntr\s*no/, /^cntrno\.?$/,
    /^cnt$/, /^cntno$/, /cnt\s*no/, /^cntno\.?$/,
    /^cntno$/, /^cntr#$/, /^cont(ainer)?#$/,
    /컨테이너.*번호/, /^컨테이너$/, /^콘테이너/,
    /^c\/?no$/, /^cont(ainer)?\.?\s*no\.?$/,
    /container.*number/, /^container\s*#/,
    /^cntrno\.$/, /^cntr\s*no\.$/,
    /^箱号$/, /^货柜号$/,  // M3.5.6: 중국어 (VGM 등)
    /^cntno$/i, /^cntr\.?no\.?$/i,
  ];
  // 실번호 헤더 패턴 (V38 확장)
  const SL_HEAD = [
    /^seal$/, /^sealno$/, /seal\s*no/, /^seal\s*no\.?$/,
    /^seal#$/, /^seal\s*number/, /^seal\.?\s*no\.?\s*1?$/,
    /^실번호/, /^실$/, /^봉인/, /봉인.*번호/, /^seal#?\d?$/,
  ];

  for (const sheetName of wb.SheetNames) {
    const ws = fixSheetRange(wb.Sheets[sheetName], XLSX);   // V38: !ref 보정
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

    // 1단계: 헤더 행 찾기 (50줄까지, 한 행에 컨번호 키워드가 있는 셀이 1개라도 있으면 OK)
    let headerRow = -1, headers = null;
    for (let i = 0; i < Math.min(50, grid.length); i++) {
      const row = (grid[i] || []).map(s =>
        String(s || '').trim().toLowerCase().replace(/\.+$/, '').replace(/\s+/g, ' ')
      );
      const hasCN = row.some(c => CN_HEAD.some(p => p.test(c)));
      if (hasCN) {
        headerRow = i;
        headers = (grid[i] || []).map(s => String(s || '').trim());
        break;
      }
    }

    // 2단계: 헤더 못 찾으면 fallback (모든 셀에서 컨번호 패턴 스캔)
    if (headerRow < 0) {
      for (const row of grid) {
        if (!row) continue;
        for (let ci = 0; ci < row.length; ci++) {
          const cellRaw = String(row[ci] || '');
          const cell = cellRaw.replace(/[\s\-]/g, '').toUpperCase();
          const m = cell.match(/^([A-Z]{4}\d{6,7})$/);
          if (m && !seen.has(m[1])) {
            seen.add(m[1]);
            const cn = m[1];
            const allCells = row.map(v => String(v || '').trim());

            // 실번호: 컨번호 옆 (1~5 컬럼 안)
            let sl = '';
            for (let j = ci + 1; j < Math.min(ci + 6, allCells.length); j++) {
              const v = allCells[j].replace(/[\s\-]/g, '');
              if (/^[A-Z]{0,6}\d{4,}$/i.test(v) && v.length >= 5 && v !== cn) {
                sl = v.toUpperCase();
                break;
              }
            }
            // 무게
            let wt = 0;
            for (const v of allCells) {
              const n = parseInt(String(v).replace(/[,\s]/g, ''));
              if (!isNaN(n) && n >= 1000 && n <= 50000) { wt = n; break; }
            }
            // ISO
            let iso = '';
            for (const v of allCells) {
              const t = String(v).trim().toUpperCase();
              if (/^\d{2}[A-Z]\d$|^\d{2}[A-Z]{2}$|^\d{4}$/.test(t)) { iso = t; break; }
            }
            // POL/POD
            let pol = '', pod = '';
            for (const v of allCells) {
              const p = String(v).trim().toUpperCase();
              if (/^[A-Z]{5}$/.test(p) && p !== cn.slice(0, 4)) {
                if (!pol) pol = p;
                else if (!pod && p !== pol) { pod = p; break; }
              }
            }
            records.push({
              cn, l4: cn.slice(-4), sl, sl_orig: sl, wt, iso, pol, pod,
              op: '', bl: '', sh: '', gi: '',
              fe: '', dg: false, rf: false, fr: false, ot: false, tk: false, tmp: ''
            });
            break;
          }
        }
      }
      continue;
    }

    // 헤더 키워드로 컬럼 인덱스 찾기
    const findCol = (patterns) => {
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i].toLowerCase().replace(/\.+$/, '').replace(/\s+/g, ' ').trim();
        if (!h) continue;
        for (const p of patterns) if (p.test(h)) return i;
      }
      return -1;
    };

    const cn_i = findCol(CN_HEAD);
    const sl_i = findCol(SL_HEAD);
    const bl_i = findCol([/^b\/?l/, /^bl\s*no/, /^m-?b\/?l/, /master.*b\/?l/, /^b\/?l\s*no\.?$/, /^blno$/]);
    const wt_i = findCol([/gross.*wt|t\.?wgt|total.*wt|^weight|^wgt|^g\.?weight|^t\.?weight/, /무게/, /중량/, /^kg/, /^kgs/]);
    const sh_i = findCol([/shipper|forward|화주|consignor/]);
    const gi_i = findCol([/gate.*in/, /반입/]);
    const pol_i = findCol([/^pol$|load.*port|loading.*port/, /적재항/, /선적항/, /^lp$|^lwharf$/]);
    const pod_i = findCol([/^pod$|dis.*port|dis.*cy|discharge|destination/, /최종항/, /양하항/, /도착항/, /^dp$|^dlv$/]);
    const fe_i = findCol([/^f\/?e$|^full\/?empty$|^fe$|^full\/empty$|^l\/?s$|^l\/s$/, /^적공$/, /^empty\/full$/, /^f\/m$/, /soc.*[ef]|[ef].*soc|soc\/e\/f|e\/f|status/]);
    const type_i = findCol([/^type$|^cntr.*type|^iso|^tysz$|^szty$/, /^타입$/, /^컨.*규격/, /^kind$/]);
    const size_i = findCol([/^size$|^sz$|^len$|^length$/, /^사이즈$/, /^규격$/]);
    const op_i = findCol([/^op$|^operator|^carrier|^line|^oper$|^soc.*line/, /^선사/, /선사부호/]);
    const dg_i = findCol([/^dg$|hazmat|imdg/, /위험물/]);
    const tmp_i = findCol([/^temp|^temperature|^reefer/, /온도/, /냉장/]);

    if (cn_i < 0) continue;

    // 데이터 행 처리 (헤더 다음부터, 빈 행 자동 건너뛰기)
    // V38: 병합셀로 컨번호 컬럼이 한 칸 어긋난 경우 ±2 컬럼까지 탐색
    for (let i = headerRow + 1; i < grid.length; i++) {
      const row = grid[i] || [];
      let cn = String(row[cn_i] || '').replace(/[\s\-]/g, '').toUpperCase();
      let cnColActual = cn_i;
      if (!/^[A-Z]{4}\d{6,7}$/.test(cn)) {
        // 같은 행에서 ±2 컬럼까지 시도
        for (const off of [-1, 1, -2, 2]) {
          const c = cn_i + off;
          if (c < 0 || c >= row.length) continue;
          const tryCn = String(row[c] || '').replace(/[\s\-]/g, '').toUpperCase();
          if (/^[A-Z]{4}\d{6,7}$/.test(tryCn)) {
            cn = tryCn;
            cnColActual = c;
            break;
          }
        }
      }
      if (!/^[A-Z]{4}\d{6,7}$/.test(cn)) continue;
      if (seen.has(cn)) continue;
      seen.add(cn);

      // F/E 추출 (V38.5: SIZE/TYPE/F/E 세 컬럼 종합)
      // 1순위: 명시적 F/E 컬럼
      // 2순위: TYPE 컬럼 끝 글자 (예: "20DCF", "40HCE", "22GPE")
      // 3순위: SIZE 컬럼 끝 글자 (예: "20F", "40E")
      // 4순위: 무게 기반 추정
      let fe = '';
      if (fe_i >= 0) {
        const feRaw = String(row[fe_i] || '').trim().toUpperCase();
        if (feRaw === 'F' || feRaw === 'FULL' || feRaw === 'L' || feRaw === 'LOADED') fe = 'F';
        else if (feRaw === 'E' || feRaw === 'EMPTY' || feRaw === 'MT' || feRaw === 'M') fe = 'E';
      }
      // TYPE 끝 글자
      if (!fe && type_i >= 0) {
        const tRaw = String(row[type_i] || '').trim().toUpperCase().replace(/[\s\-]/g, '');
        // "20DCF", "40HCE", "22GPF", "DCHC035F" 등
        if (/^([A-Z]{2}\d{2}|[A-Z]{2,4}|\d{2}[A-Z]{2,3}|\d{4})\d{0,3}([FE])$/.test(tRaw)) {
          fe = tRaw.slice(-1);
        }
      }
      // SIZE 끝 글자
      if (!fe && size_i >= 0) {
        const sRaw = String(row[size_i] || '').trim().toUpperCase().replace(/[\s\-]/g, '');
        // "20F", "40E", "20FT-F"
        if (/^(20|40|45)(FT)?([FE])$/.test(sRaw)) {
          fe = sRaw.slice(-1);
        }
      }
      // M3.5.6: 무게 기반 추정 (VGM 파일처럼 F/E 컬럼 없는 경우)
      // VGM은 적컨만 신고하므로 무게가 컨테이너 자체 무게(타이어웨이트)보다 크면 Full
      if (!fe && wt_i >= 0) {
        const wgt = parseFloat(String(row[wt_i] || '').replace(/,/g, ''));
        if (!isNaN(wgt) && wgt > 0) {
          // 20피트 빈 컨 약 2.3톤, 40피트 약 3.8톤, 45피트 약 4.8톤
          // 무게가 5톤 초과면 Full로 판정 (안전 마진)
          // 단, 너무 작은 무게(VGM 신고 안한 빈 컨일 수도)는 미정으로 둠
          if (wgt > 5000) fe = 'F';
        }
      }

      // 타입
      let iso = '';
      let isoRaw = type_i >= 0 ? String(row[type_i] || '').trim().toUpperCase() : '';
      isoRaw = isoRaw.replace(/[\s\-]/g, '');
      if (/^\d{2}[A-Z]\d$|^\d{2}[A-Z]{2}$|^\d{4}$/.test(isoRaw)) iso = isoRaw;
      else if (/20.*DC|20.*GP/.test(isoRaw)) iso = '22GP';
      else if (/40.*HC/.test(isoRaw)) iso = '45GP';
      else if (/40.*DC|40.*GP/.test(isoRaw)) iso = '42GP';
      else if (/RF|REEFER/.test(isoRaw)) iso = isoRaw.includes('20') ? '22R5' : '45R1';
      else if (/TK|TANK/.test(isoRaw)) iso = '22T6';

      const dgVal = dg_i >= 0 ? String(row[dg_i] || '').trim() : '';
      const isDg = dgVal && /^(Y|YES|TRUE|1|DG|HAZ)/i.test(dgVal);

      let tmpValRaw = tmp_i >= 0 ? String(row[tmp_i] || '').trim() : '';
      // M3.6: 0°C는 실제 온도 (신선 채소, 의약품 등)
      // 진짜 미입력은 빈 값/"-" 만
      let tmpVal = tmpValRaw;
      let tmpMissing = false;
      if (tmpValRaw === '' || tmpValRaw === '-') {
        tmpVal = '';
        tmpMissing = true;
      } else {
        // "0", "0.0", "+0", "-0", "000" 모두 정규화 → 그대로 0°C
        const m = tmpValRaw.match(/^([+-]?)0*(\d+(?:\.\d+)?)$/);
        if (m) tmpVal = (m[1] || '') + m[2];
      }
      const isoUpper = (iso || isoRaw || '').toUpperCase();
      // 특수화물 태그 (45ft 영역 4[5689] 포함, 예: 46P3=45FR)
      // 리퍼 판정: ISO 기준 우선, 온도가 진짜 있으면 + 표기
      const isRf = (tmpVal && tmpVal !== '-') || /^[24][245689]R/.test(isoUpper) || /^[24]0R/.test(isoUpper) || /^[24]58[2-5]$/.test(isoUpper);
      const isFr = /^[24][0245689]P/.test(isoUpper) || /^[24]0F[PR]/.test(isoUpper) || /^45P/.test(isoUpper);
      const isOt = /^[24][0245689]U/.test(isoUpper) || /^[24]0O/.test(isoUpper) || /^4[5689]O/.test(isoUpper);
      const isTk = /^[24][0245689]T/.test(isoUpper);

      // 실번호: 헤더로 못 찾으면 같은 행에서 자동 탐색 (V38: 병합셀 대응)
      let sl = '';
      if (sl_i >= 0) {
        sl = String(row[sl_i] || '').trim();
        // 빈 값이면 ±2 컬럼도 시도
        if (!sl) {
          for (const off of [-1, 1, -2, 2]) {
            const c = sl_i + off;
            if (c < 0 || c >= row.length || c === cnColActual) continue;
            const v = String(row[c] || '').trim();
            if (v && v.toUpperCase() !== cn) { sl = v; break; }
          }
        }
      }
      if (!sl) {
        // 컨번호 옆 5칸 탐색
        for (let j = cnColActual + 1; j < Math.min(cnColActual + 6, row.length); j++) {
          const v = String(row[j] || '').replace(/[\s\-]/g, '');
          if (/^[A-Z]{0,6}\d{4,}$/i.test(v) && v.length >= 5 && v.toUpperCase() !== cn) {
            sl = v.toUpperCase();
            break;
          }
        }
      }

      records.push({
        cn, l4: cn.slice(-4),
        sl,
        sl_orig: sl,
        bl: bl_i >= 0 ? String(row[bl_i] || '').trim() : '',
        sh: sh_i >= 0 ? String(row[sh_i] || '').trim() : '',
        gi: gi_i >= 0 ? String(row[gi_i] || '').trim() : '',
        wt: wt_i >= 0 ? (parseInt(String(row[wt_i] || '').replace(/[,\s]/g, '')) || 0) : 0,
        pol: pol_i >= 0 ? String(row[pol_i] || '').trim() : '',
        pod: pod_i >= 0 ? String(row[pod_i] || '').trim() : '',
        fe,
        iso,
        op: op_i >= 0 ? String(row[op_i] || '').trim() : '',
        dg: isDg,
        rf: isRf,
        fr: isFr,
        ot: isOt,
        tk: isTk,
        tmp: tmpVal,
        tmp_missing: tmpMissing && isRf,  // 리퍼인데 온도 미입력
      });
    }
  }
  // V38.5: 무게 기반 F/E 검증 (4순위) — 위에서 못 잡은 경우
  // 20피트 Empty ≈ 2.2t, 40피트 Empty ≈ 3.8t (현장 실측)
  for (const r of records) {
    if (r.fe) continue; // 이미 F/E 결정됨
    if (r.wt > 0) {
      const is20 = r.iso && (r.iso.startsWith('22') || r.iso.startsWith('25'));
      const is40 = r.iso && (r.iso.startsWith('42') || r.iso.startsWith('44') || r.iso.startsWith('45'));
      if (is20 && r.wt <= 2500) r.fe = 'E';
      else if (is40 && r.wt <= 4500) r.fe = 'E';
      else if (r.wt > 5000) r.fe = 'F';
    }
  }
  return { records };
}

// === X-RAY Parser ===
export async function parseXrayList(arrayBuffer) {
  const XLSX = await loadSheetJS();
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const containers = new Set();
  for (const sheetName of wb.SheetNames) {
    const ws = fixSheetRange(wb.Sheets[sheetName], XLSX);   // V38: !ref 보정
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    for (const row of grid) {
      for (const cell of (row || [])) {
        const text = String(cell || '').replace(/[\s\-]/g, '').toUpperCase();
        const m = text.match(/([A-Z]{4}\d{6,7})/);
        if (m) containers.add(m[1]);
      }
    }
  }
  return { containers: Array.from(containers) };
}

// === POD 색깔 ===
export const podColorMap = {
  'CNTAG': { bg: 'bg-blue-600', text: 'text-blue-50' },
  'CNNTG': { bg: 'bg-green-600', text: 'text-green-50' },
  'CNSHA': { bg: 'bg-purple-600', text: 'text-purple-50' },
  'CNNGB': { bg: 'bg-pink-600', text: 'text-pink-50' },
  'CNQZH': { bg: 'bg-cyan-600', text: 'text-cyan-50' },
  'HKHKG': { bg: 'bg-indigo-600', text: 'text-indigo-50' },
  'JPHKT': { bg: 'bg-rose-600', text: 'text-rose-50' },
  'JPYOK': { bg: 'bg-teal-600', text: 'text-teal-50' },
  'KRPUS': { bg: 'bg-yellow-600', text: 'text-yellow-50' },
};

// M3.5.6: 장비 번호 (localStorage)
export function getEquipNumber() {
  try {
    return localStorage.getItem('gm_equip_no') || '';
  } catch (e) { return ''; }
}

export function setEquipNumber(num) {
  try {
    if (num) localStorage.setItem('gm_equip_no', num);
    else localStorage.removeItem('gm_equip_no');
  } catch (e) {}
}
