// 믹서 업로드 시스템 (M3.5)
// EDI/엑셀/PDF/사진 한 곳에 던지면 자동 분류 → EDI 기준으로 데이터 병합
//
// 원칙:
//   - EDI = 단일 진실 (위치/POL/POD/컨번호)
//   - 다른 파일 = 보강 정보 (실번호/무게/X-RAY 플래그)
//   - 충돌 시 검수원에게 확인
//
// 결과: { ediResults, listResults, xrayResults, ocrResults, summary, warnings }
import {
  parseBAPLIE, parseAscFile, parseListExcel, parseXrayList, loadSheetJS,
  isoToLabel, normalizeBay,
} from './utils.js';
import { extractShipInfo } from './shipStructure.js';
// M4.4: CASP .def 파서
import { analyzeDefFile, analysisToBayDictEntry } from './defParser.js';
import { addToUserBayDict } from './data/userBayDict.js';

// ─── 파일 종류 자동 판별 ───
// 결과: 'edi' | 'asc' | 'excel' | 'csv' | 'pdf' | 'image' | 'def' | 'unknown'
// M4.4: 'def' (CASP SHIP DEFINE FILE) 추가
export async function detectFileType(file) {
  const name = (file.name || '').toLowerCase();
  const ext = name.split('.').pop();

  if (ext === 'edi') return 'edi';
  if (ext === 'asc') return 'asc';
  if (ext === 'def') return 'def';   // M4.4: CASP 선박 정의 파일
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  if (['csv', 'tsv'].includes(ext)) return 'csv';
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'bmp', 'gif'].includes(ext)) return 'image';

  // 매직바이트로 판별
  const buf = await file.slice(0, 4096).arrayBuffer();
  const bytes = new Uint8Array(buf);

  // M4.4: CASP SHIP DEFINE FILE 매직 검사 (확장자 누락 대비)
  // "CASP SHIP DEFINE FILE" = 21바이트 ASCII
  if (bytes.length >= 21) {
    let isCasp = true;
    const magic = 'CASP SHIP DEFINE FILE';
    for (let i = 0; i < magic.length; i++) {
      if (bytes[i] !== magic.charCodeAt(i)) { isCasp = false; break; }
    }
    if (isCasp) return 'def';
  }

  // PDF: %PDF
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'pdf';
  // ZIP (xlsx)
  if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) return 'excel';
  // 옛날 xls
  if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) return 'excel';
  // JPEG
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image';
  // PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image';

  // 텍스트로 시도
  try {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    // M4.1: BAPLIE / IFCSUM 자동 판별
    //   BAPLIE = 적부도 (베이 위치 포함)
    //   IFCSUM = 컨테이너 명세서 (일부 선사가 BAPLIE 없이 이것만 전송)
    if (/UNH\+\d+\+BAPLIE/i.test(text)) return 'edi';
    if (/UNH\+\d+\+IFCSUM/i.test(text)) return 'edi-ifcsum';
    if (/UN[BH]\+/i.test(text) && /TDT\+/i.test(text)) return 'edi';
    if (/BAPLIE/i.test(text)) return 'edi';
    if (/IFCSUM/i.test(text)) return 'edi-ifcsum';
    if (/^[A-Z]{4}\d{7}\s/m.test(text)) return 'asc';
    if (text.includes(',') && /^[A-Z]{4}\d{7}/m.test(text)) return 'csv';
  } catch (e) {}

  return 'unknown';
}

// ─── PDF.js 동적 로드 ───
let _pdfjsPromise = null;
async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  if (_pdfjsPromise) return _pdfjsPromise;
  _pdfjsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('pdfjsLib not found'));
      }
    };
    script.onerror = () => reject(new Error('PDF.js 로드 실패'));
    document.head.appendChild(script);
  });
  return _pdfjsPromise;
}

// ─── PDF에서 텍스트 추출 ───
export async function extractPdfText(file) {
  const pdfjsLib = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const allLines = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items.map(it => ({
      text: it.str, x: it.transform[4], y: Math.round(it.transform[5]),
    }));
    // y좌표로 줄 그룹핑
    const lineMap = {};
    items.forEach(it => {
      const yKey = String(it.y);
      if (!lineMap[yKey]) lineMap[yKey] = [];
      lineMap[yKey].push(it);
    });
    const lines = Object.keys(lineMap)
      .sort((a, b) => parseFloat(b) - parseFloat(a))
      .map(y => lineMap[y].sort((a, b) => a.x - b.x).map(it => it.text).join(' ').trim())
      .filter(l => l);
    allLines.push(...lines);
  }
  return allLines.join('\n');
}

// ─── PDF 텍스트에서 컨테이너 리스트 파싱 ───
// 동진해운 양식 검증 완료, 다른 선사도 컬럼 패턴 비슷하면 작동
// 결과: { vsl, voy, pol, pod, mode, containers: { cn: {cn, sl, wt, iso, fe, pol, pod} } }
export function parsePdfContainers(text) {
  const result = { vsl: '', voy: '', pol: '', pod: '', mode: null, containers: {} };
  const fullText = text;

  // 헤더 추출
  const vslMatch = fullText.match(/Vessel\s*Voyage\s*[:\-]?\s*([A-Z][A-Z\s&]+?)\s*\(([A-Z0-9]+)\)/i);
  if (vslMatch) {
    result.vsl = vslMatch[1].trim();
    result.voy = vslMatch[2].trim();
  }
  const polMatch = fullText.match(/POL\s*[:\-]?\s*([A-Z]{5})/);
  const podMatch = fullText.match(/POD\s*[:\-]?\s*([A-Z]{5})/);
  if (polMatch) result.pol = polMatch[1];
  if (podMatch) result.pod = podMatch[1];

  // 모드 판정
  if (result.pol === 'KRPTK') result.mode = 'loading';
  else if (result.pod === 'KRPTK') result.mode = 'discharge';

  // 컨테이너 행 추출
  // 패턴: "1 BEAU4688310 D5 0 3,890 0 DJSCPTK260000659 KRPTK KRPTK KRINC KRINC ..."
  // 또는: 시작에 No. 없이 "BEAU4688310 D5 ..."
  const lines = text.split('\n');
  const cnPattern = /\b([A-Z]{4}\d{7})\b/g;

  lines.forEach(line => {
    if (!line || line.length < 20) return;
    // 헤더/푸터 라인 제외
    if (/Container\s*Load\s*List|Container\s*No|Vessel\s*Voyage|Date\s*:|Page\s*:|GRAND\s*TOTAL|Weight\s*TTL/i.test(line)) return;

    const cnMatches = [...line.matchAll(cnPattern)];
    if (cnMatches.length === 0) return;

    // 첫 컨테이너 번호 사용 (한 줄에 여러 개 있으면 B/L 등)
    const cn = cnMatches[0][1];
    if (result.containers[cn]) return; // 중복 방지

    // 무게 추출 (콤마 포함 가능): "3,890" 또는 "12,345"
    const wtMatches = [...line.matchAll(/\b(\d{1,3}(?:,\d{3})+|\d{3,5})\b/g)];
    let wt = null;
    if (wtMatches.length > 0) {
      // 가장 큰 수치 (보통 Gross Weight)
      const weights = wtMatches.map(m => parseInt(m[1].replace(/,/g, ''), 10)).filter(n => n >= 1000 && n <= 50000);
      if (weights.length > 0) wt = Math.max(...weights);
    }

    // 타입 추출: D5/D2/R5/F5 등 또는 22G1/45G1
    let iso = '';
    const typeMatch = line.match(/\b([DRFT][2-9])\b/);  // D5, D2, R5, F5
    if (typeMatch) {
      const t = typeMatch[1];
      if (t === 'D5') iso = '45GP';
      else if (t === 'D2' || t === 'D4') iso = '22GP';
      else if (t === 'R5') iso = '45R1';
      else if (t === 'R2' || t === 'R4') iso = '22R1';
      else if (t === 'F5') iso = '45PF';  // FR
    } else {
      const isoMatch = line.match(/\b(\d{2}[A-Z]\d|[24]5G[1P])\b/);
      if (isoMatch) iso = isoMatch[1];
    }

    // POL/POD 추출 (라인 자체에서)
    const polLineMatch = line.match(/\b([A-Z]{2}[A-Z]{3})\b.*?\b([A-Z]{2}[A-Z]{3})\b/);
    let cnPol = result.pol, cnPod = result.pod;
    if (polLineMatch) {
      // 마지막 두 5자리 코드 = 보통 POL/POD
      const allPorts = [...line.matchAll(/\b([A-Z]{2}[A-Z]{3})\b/g)].map(m => m[1]);
      if (allPorts.length >= 2) {
        cnPol = allPorts[allPorts.length - 2] || cnPol;
        cnPod = allPorts[allPorts.length - 1] || cnPod;
      }
    }

    // F/E 판정 (Empty 컨테이너는 보통 무게 4000kg 이하)
    let fe = 'F';
    if (wt && wt < 5000) fe = 'E';

    result.containers[cn] = {
      cn,
      sl: '',  // PDF에서 실번호는 보통 비어있음
      wt: wt || 0,
      iso,
      fe,
      pol: cnPol || '',
      pod: cnPod || '',
      _source: 'pdf',
    };
  });

  return result;
}

// ─── 이미지 OCR (Gemini Vision) ───
// M3.5.2: 자동 축소 (1600px) + FileReader base64 (UI 안 막힘)
async function compressImage(file, maxDim = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      // JPEG 90% 품질 (OCR에 충분, 크기 50~70% 절감)
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('이미지 압축 실패'));
      }, 'image/jpeg', 0.9);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지 로드 실패'));
    };
    img.src = url;
  });
}

async function blobToBase64(blob) {
  // M3.5.2: FileReader 사용 (메인 스레드 안 막힘, 큰 이미지에서 spread 스택 오버플로우 방지)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function ocrImageContainers(file, geminiApiKey) {
  if (!geminiApiKey) throw new Error('Gemini API 키 없음');

  // 자동 축소 (4032×3024 → 1600×1200 정도, OCR 정확도 유지)
  let imageBlob;
  try {
    imageBlob = await compressImage(file, 1600);
  } catch (e) {
    // 압축 실패 시 원본 사용
    imageBlob = file;
  }

  const base64 = await blobToBase64(imageBlob);
  const mimeType = 'image/jpeg';

  const prompt = `이 이미지는 컨테이너 적재 리스트(양하 또는 선적용)입니다.
표 형태로 컨테이너 정보가 적혀있습니다.

다음 JSON 형식으로 응답하세요. JSON만 출력. 다른 설명 없음:
{
  "vsl": "선박명 (있으면)",
  "voy": "항차번호 (있으면)",
  "pol": "POL 코드 (있으면, 예: KRPTK)",
  "pod": "POD 코드 (있으면)",
  "containers": [
    {"cn": "컨테이너번호 4자영문+7자숫자", "sl": "실번호", "wt": 무게kg숫자, "iso": "타입 D5/22G1 등", "fe": "F 또는 E"},
    ...
  ]
}

규칙:
- 컨테이너번호는 정확히 4자 영문 + 7자 숫자 (예: BEAU4688310)
- 실번호(seal)는 보통 6~10자 숫자/영문 (없으면 빈 문자열)
- 무게는 kg 단위 정수 (콤마 제거)
- iso 타입: D5(45GP), D2(22GP), R5(45R1), R2(22R1), F5(45PF) 등
- fe: 무게 5000kg 미만이면 "E", 이상이면 "F"
- 인식 못한 컬럼은 빈 문자열 또는 0
- 손글씨 메모는 무시하고 인쇄된 표 데이터만 추출
- 행 번호(1, 2, 3...)는 무시`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API 오류 ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // JSON 추출
  let json;
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('JSON 못 찾음');
    json = JSON.parse(m[0]);
  } catch (e) {
    throw new Error(`OCR 결과 파싱 실패: ${e.message}\n응답: ${text.slice(0, 200)}`);
  }

  // 정규화
  const result = {
    vsl: json.vsl || '',
    voy: json.voy || '',
    pol: json.pol || '',
    pod: json.pod || '',
    mode: null,
    containers: {},
  };
  if (result.pol === 'KRPTK') result.mode = 'loading';
  else if (result.pod === 'KRPTK') result.mode = 'discharge';

  (json.containers || []).forEach(c => {
    if (!c.cn || !/^[A-Z]{4}\d{7}$/i.test(c.cn)) return;
    const cn = c.cn.toUpperCase();
    result.containers[cn] = {
      cn,
      sl: c.sl || '',
      wt: parseInt(c.wt, 10) || 0,
      iso: c.iso || '',
      fe: c.fe || (parseInt(c.wt, 10) < 5000 ? 'E' : 'F'),
      pol: result.pol,
      pod: result.pod,
      _source: 'ocr',
    };
  });

  return result;
}

// M3.5.2: 모달 열 때 호출 → PDF.js/SheetJS 미리 다운로드
//   첫 PDF/엑셀 처리 시 CDN 다운로드 대기 시간 제거 (~2초 절감)
export function preloadLibraries() {
  // 비동기로 실행 (await X) - 백그라운드에서 로드
  loadPdfJs().catch(() => {});
  // SheetJS는 utils.js에서 처리하지만 미리 호출
  if (!window.XLSX) {
    import('./utils.js').then(m => m.loadSheetJS && m.loadSheetJS().catch(() => {}));
  }
}

// ─── 통합 파일 처리 ───
// 파일 한 개 → 종류 판별 → 적절한 파서로 처리
// 결과: { type, role, data, error }
//   type: 'edi' | 'asc' | 'excel' | 'pdf' | 'image' 등
//   role: 'edi-base' | 'list' | 'xray' | 'unknown' (어느 역할인지)
//   data: 파서 결과
export async function processSingleFile(file, options = {}) {
  const { geminiApiKey } = options;
  const type = await detectFileType(file);
  const out = { type, role: 'unknown', data: null, error: null, fileName: file.name };

  try {
    switch (type) {
      case 'edi': {
        const text = await file.text();
        const data = parseBAPLIE(text);
        const ship = extractShipInfo(text);
        if (ship) data._ship = ship;
        out.role = 'edi-base';
        out.data = data;
        break;
      }
      case 'edi-ifcsum': {
        // M4.1: IFCSUM 양식 (일부 선사가 BAPLIE 없이 이것만 전송)
        // BAPLIE 파서로 시도. 컨테이너 정보(EQD, NAD, MEA, FTX)는 동일 형식이라 일부 추출 가능.
        // 단, LOC(베이 위치)는 IFCSUM에 없을 수 있어 위치 정보 누락 가능.
        const text = await file.text();
        const data = parseBAPLIE(text);
        const ship = extractShipInfo(text);
        if (ship) data._ship = ship;
        out.role = 'edi-base';
        out.data = data;
        // 경고 표시용 플래그
        out._ifcsum = true;
        out._warning = 'IFCSUM 양식 - BAPLIE 파서로 처리됨. 베이 위치 정보 누락 가능 (베이사전 매칭으로 보강).';
        break;
      }
      case 'def': {
        // M4.4: CASP SHIP DEFINE FILE — 선박 구조 정의 파일
        // 컨테이너 데이터는 없음, 베이사전(userBayDict)에 등록만 수행
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const analysis = analyzeDefFile(bytes);
        const entry = analysisToBayDictEntry(analysis, file.name);
        const saved = addToUserBayDict(entry);
        out.role = 'shipdef';   // 컨테이너 머지에서 제외
        out.data = {
          analysis,
          entry,
          saved,
          summary: {
            vessel: analysis.header.vesselName,
            identifier: analysis.header.identifier,
            version: analysis.header.version,
            created: analysis.header.created,
            bayCount: analysis.bayCount,
            sectionCount: analysis.structure.sectionCount,
            trios: analysis.structure.trios.length,
            standalone: analysis.structure.standalone.length,
            cellCodes: analysis.cellCodeDistribution,
          },
        };
        if (analysis.warning) out._warning = analysis.warning;
        break;
      }
      case 'asc': {
        const text = await file.text();
        out.role = 'edi-base';
        out.data = parseAscFile(text);
        break;
      }
      case 'excel': {
        const buf = await file.arrayBuffer();
        // 자동 판별: X-RAY인지 일반 리스트인지 (이름 패턴)
        const fname = (file.name || '').toLowerCase();
        if (/x[\s\-_]*ray|xray|엑스레이/i.test(fname)) {
          out.role = 'xray';
          out.data = await parseXrayList(buf);
        } else {
          out.role = 'list';
          out.data = await parseListExcel(buf);
        }
        break;
      }
      case 'csv': {
        const text = await file.text();
        // CSV는 일단 리스트로 처리
        out.role = 'list';
        // CSV → 임시 워크북 → parseListExcel 재활용 어려우니 직접 처리
        out.data = parseCsvList(text);
        break;
      }
      case 'pdf': {
        const text = await extractPdfText(file);
        const parsed = parsePdfContainers(text);
        out.role = 'list';
        out.data = parsed;
        break;
      }
      case 'image': {
        if (!geminiApiKey) {
          out.error = '이미지 분석을 위해 Gemini API 키가 필요합니다';
          break;
        }
        const parsed = await ocrImageContainers(file, geminiApiKey);
        out.role = 'list';
        out.data = parsed;
        break;
      }
      default:
        out.error = '인식할 수 없는 파일 형식';
    }
  } catch (e) {
    out.error = e.message || String(e);
  }

  return out;
}

// 간단 CSV 파서 (컨번호 기반)
function parseCsvList(text) {
  const result = { vsl: '', voy: '', pol: '', pod: '', mode: null, containers: {} };
  const lines = text.split(/\r?\n/);
  // 헤더 찾기 (Container, CN, 컨테이너 등)
  let cnIdx = -1, slIdx = -1, wtIdx = -1;
  let dataStart = 0;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const cells = lines[i].split(/[,\t]/).map(c => c.trim().toLowerCase());
    cells.forEach((c, idx) => {
      if (cnIdx < 0 && /container|cn|컨/.test(c)) cnIdx = idx;
      if (slIdx < 0 && /seal|실/.test(c)) slIdx = idx;
      if (wtIdx < 0 && /weight|무게|중량/.test(c)) wtIdx = idx;
    });
    if (cnIdx >= 0) { dataStart = i + 1; break; }
  }
  if (cnIdx < 0) return result;
  for (let i = dataStart; i < lines.length; i++) {
    const cells = lines[i].split(/[,\t]/).map(c => c.trim());
    const cn = (cells[cnIdx] || '').toUpperCase();
    if (!/^[A-Z]{4}\d{7}$/.test(cn)) continue;
    result.containers[cn] = {
      cn,
      sl: slIdx >= 0 ? (cells[slIdx] || '') : '',
      wt: wtIdx >= 0 ? parseInt((cells[wtIdx] || '').replace(/[^\d]/g, ''), 10) || 0 : 0,
      iso: '', fe: '', pol: '', pod: '',
      _source: 'csv',
    };
  }
  return result;
}

// ─── EDI 기반 데이터 병합 ───
// EDI 컨테이너에 리스트/PDF/OCR 결과를 보강
// 결과: { merged, conflicts, unmatched }
//   merged: { cn → { cn, ...EDI필드, sl, wt(보강), _xray, ... } }
//   conflicts: [{ cn, field, ediVal, otherVal, source }] - 검수원 확인용
//   unmatched: { cn → {info} } - 리스트엔 있는데 EDI에 없는 것
export function mergeWithEdi(ediContainers, listResults, xrayResults, ocrResults) {
  const merged = { ...ediContainers };
  const conflicts = [];
  const unmatched = {};

  // 1. 리스트 데이터 (실번호/무게 보강)
  Object.values(listResults || {}).forEach(c => {
    if (!c.cn) return;
    const cn = c.cn.toUpperCase();
    if (merged[cn]) {
      // EDI에 있음 → 보강
      const ediC = merged[cn];
      // 실번호: EDI에 없으면 추가 (이미 있으면 충돌 검사)
      if (c.sl) {
        if (!ediC.sl) ediC.sl = c.sl;
        else if (ediC.sl !== c.sl) {
          conflicts.push({ cn, field: 'sl', ediVal: ediC.sl, otherVal: c.sl, source: c._source || 'list' });
        }
      }
      // 무게: 차이 큰 경우만 충돌
      if (c.wt && c.wt > 0) {
        const ediW = parseInt(ediC.wt, 10) || 0;
        if (ediW === 0) ediC.wt = c.wt;
        else if (Math.abs(ediW - c.wt) > 1000) {
          conflicts.push({ cn, field: 'wt', ediVal: ediW, otherVal: c.wt, source: c._source || 'list' });
        }
      }
    } else {
      // EDI에 없음 → unmatched
      unmatched[cn] = c;
    }
  });

  // 2. X-RAY 플래그 추가
  Object.keys(xrayResults || {}).forEach(cn => {
    const cnU = cn.toUpperCase();
    if (merged[cnU]) merged[cnU]._xray = true;
    else {
      // EDI에 없는 X-RAY 컨 — 일단 unmatched에 표시
      unmatched[cnU] = { ...(unmatched[cnU] || {}), cn: cnU, _xray: true };
    }
  });

  // 3. OCR 결과 (사진) - 실번호/무게 우선 보강 (현장 종이 = 최신)
  Object.values(ocrResults || {}).forEach(c => {
    if (!c.cn) return;
    const cn = c.cn.toUpperCase();
    if (merged[cn]) {
      const ediC = merged[cn];
      if (c.sl && c.sl !== ediC.sl) {
        if (!ediC.sl) ediC.sl = c.sl;
        else conflicts.push({ cn, field: 'sl', ediVal: ediC.sl, otherVal: c.sl, source: 'ocr' });
      }
      if (c.wt && c.wt > 0) {
        const ediW = parseInt(ediC.wt, 10) || 0;
        if (ediW === 0) ediC.wt = c.wt;
        else if (Math.abs(ediW - c.wt) > 1000) {
          conflicts.push({ cn, field: 'wt', ediVal: ediW, otherVal: c.wt, source: 'ocr' });
        }
      }
    } else {
      unmatched[cn] = { ...(unmatched[cn] || {}), ...c };
    }
  });

  return { merged, conflicts, unmatched };
}

// ─── 항차 매칭 ───
// EDI에서 추출한 vsl/voy + 기존 항차 목록 → 매칭 결과
// 결과: { matched: voyageKey | null, candidates: [...], suggestion: 'create-new' | 'merge' | 'ask' }
export function matchVoyage(ediVsl, ediVoy, existingVoyages) {
  const vslU = (ediVsl || '').toUpperCase().trim();
  const voyU = (ediVoy || '').toUpperCase().trim();
  if (!vslU) return { matched: null, candidates: [], suggestion: 'create-new' };

  const candidates = [];
  Object.entries(existingVoyages || {}).forEach(([key, v]) => {
    if (!v?.info) return;
    const evsl = (v.info.vsl || '').toUpperCase();
    const evoy = (v.info.voy || '').toUpperCase();
    const evoyD = (v.info.voy_d || '').toUpperCase();
    const evoyL = (v.info.voy_l || '').toUpperCase();

    // 선박명 일치 검사 (정확 또는 포함)
    const vslMatch = evsl === vslU ||
      evsl.replace(/\s+/g, '') === vslU.replace(/\s+/g, '') ||
      evsl.includes(vslU) || vslU.includes(evsl);

    if (!vslMatch) return;

    // 항차번호 검사
    const voyMatch = voyU && (evoy === voyU || evoyD === voyU || evoyL === voyU);
    const similarVoy = voyU && (
      // 끝 글자만 다른 경우 (2608N vs 2608S)
      (evoy && evoy.length === voyU.length && evoy.slice(0, -1) === voyU.slice(0, -1)) ||
      (evoyD && evoyD.length === voyU.length && evoyD.slice(0, -1) === voyU.slice(0, -1)) ||
      (evoyL && evoyL.length === voyU.length && evoyL.slice(0, -1) === voyU.slice(0, -1))
    );

    candidates.push({ key, voyage: v, vslMatch, voyMatch, similarVoy });
  });

  // 정확 일치
  const exact = candidates.find(c => c.voyMatch);
  if (exact) return { matched: exact.key, candidates, suggestion: 'merge' };

  // 비슷한 번호 (양하/선적 분리 가능성)
  const similar = candidates.find(c => c.similarVoy);
  if (similar) return { matched: null, candidates, suggestion: 'ask' };

  // 선박명만 일치
  if (candidates.length > 0) return { matched: null, candidates, suggestion: 'ask' };

  return { matched: null, candidates: [], suggestion: 'create-new' };
}
