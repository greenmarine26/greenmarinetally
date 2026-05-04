import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowDown, ArrowUp, Upload, Search as SearchIcon, ListChecks, MapPin,
  AlertCircle, Plus, FileSpreadsheet, FileText, X, RotateCcw, Download, Camera,
  BarChart3, FileCheck
} from 'lucide-react';
import {
  parseBAPLIE, parseAscFile, parseListExcel, parseXrayList,
  isoToLabel, isoCategory, formatWt, fmtPos
} from '../utils.js';
import {
  fbSaveEdiContainers, fbSaveListRecords, fbSaveXrayList,
  fbCompleteContainer, fbCancelComplete, fbToggleXray,
  fbUpdateRecordSeal, fbUpdateVoyageInfo, fbSaveSectionData,
  fbSaveShipStructure, fbGetShipStructure, fbAddShipVoyage, fbAddShipStats
} from '../firebase.js';
import { extractShipInfo, analyzeShipStructure, compareStructures } from '../shipStructure.js';
import ContainerList from '../components/ContainerList.jsx';
import ValidationBox from '../components/ValidationBox.jsx';
import SearchPanel from '../components/SearchPanel.jsx';
import BayPlan from '../components/BayPlan.jsx';
import StatsTab from '../components/StatsTab.jsx';
import ReportTab from '../components/ReportTab.jsx';
import ContainerDetailModal from '../components/ContainerDetailModal.jsx';
import DiagnosticsPanel from '../components/DiagnosticsPanel.jsx';
import { runDiagnostics } from '../diagnostics.js';
import { exportSectionToCSV } from '../components/CSVExport.jsx';

export default function VoyagePage({ voyageKey, voyage, inspector, inspectors, onGoHome, onModeChange }) {
  // 양하/선적 모드 — 둘 다 있으면 토글, 하나만 있으면 자동
  const hasDis = !!voyage?.discharge;
  const hasLoa = !!voyage?.loading;
  const initMode = voyage?.info?.mode || (hasDis ? 'discharge' : 'loading');
  const [mode, setMode] = useState(initMode);
  const [tab, setTab] = useState('list');
  const [detailC, setDetailC] = useState(null); // 컨테이너 상세 모달
  const [shipLib, setShipLib] = useState(null); // M3.0: 선박 라이브러리 (AI 컨텍스트용)
  // M3.5.4: 자동 진단 state (메인 컴포넌트에 두어야 useMemo에서 접근 가능)
  const [diagAutoSpeak, setDiagAutoSpeak] = useState(true);
  const [diagDismissed, setDiagDismissed] = useState(false);

  useEffect(() => { onModeChange?.(mode); }, [mode]);

  // M3.0: 항차 IMO로 선박 라이브러리 로드 (AI에게 이전 항차 패턴 컨텍스트 제공)
  useEffect(() => {
    const imo = voyage?.info?.imo;
    if (!imo) { setShipLib(null); return; }
    let cancelled = false;
    fbGetShipStructure(imo).then(data => {
      if (!cancelled) setShipLib(data);
    }).catch(() => { if (!cancelled) setShipLib(null); });
    return () => { cancelled = true; };
  }, [voyage?.info?.imo]);

  if (!voyage) {
    return (
      <div className="max-w-3xl mx-auto px-3 py-10 text-center">
        <div className="text-slate-400">항차를 찾을 수 없습니다</div>
        <button onClick={onGoHome} className="mt-4 px-4 py-2 bg-slate-800 rounded text-sm">홈으로</button>
      </div>
    );
  }

  const sec = voyage[mode] || {};
  const ediMap = sec.ediContainers || {};
  const recMap = sec.records || {};
  const xrayMap = sec.xrayList || {};
  const xraySeals = sec.xraySeals || {};
  const compMap = sec.completed || {};

  // 평택 대상 (양하=POD, 선적=POL)
  const isPtk = (c) => {
    if (!c) return false;
    if (mode === 'discharge') {
      const pod = (c.pod || '').toUpperCase();
      return pod === 'PTK' || pod === 'KRPTK' || pod.endsWith('PTK');
    } else {
      const pol = (c.pol || '').toUpperCase();
      return pol === 'PTK' || pol === 'KRPTK' || pol.endsWith('PTK');
    }
  };

  // 표시용 컨테이너 (EDI 평택 + 리스트 병합)
  // 핵심 원칙: records가 EDI를 덮어쓰지만, records의 빈 값(0, '', null, undefined)은 EDI 보존
  const containers = useMemo(() => {
    const merged = {};
    Object.values(ediMap).forEach(c => { if (isPtk(c)) merged[c.cn] = { ...c, _src: 'edi' }; });
    Object.values(recMap).forEach(r => {
      const ediBase = merged[r.cn] || {};
      const safeR = {};
      // records의 값이 비어있지 않을 때만 사용 (EDI 데이터 보존)
      Object.keys(r).forEach(k => {
        const v = r[k];
        // 의미있는 값만 채택 (빈 값/0/null이면 EDI 값 유지)
        if (v !== '' && v !== 0 && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)) {
          safeR[k] = v;
        }
      });
      merged[r.cn] = { ...ediBase, ...safeR, _src: merged[r.cn] ? 'both' : 'list' };
    });
    return Object.values(merged).sort((a, b) => {
      // 베이/위치 순 정렬
      const ka = `${a.bay || 'zz'}-${a.row || 'zz'}-${a.tier || 'zz'}`;
      const kb = `${b.bay || 'zz'}-${b.row || 'zz'}-${b.tier || 'zz'}`;
      return ka.localeCompare(kb);
    });
  }, [ediMap, recMap, mode]);

  // M3.5.4: 자동 진단 (containers/recMap/xrayMap 변경 시 재계산)
  const diagAlerts = useMemo(() => {
    if (!containers || containers.length === 0) return [];
    if (diagDismissed) return [];
    // 평택 화물만 필터된 ediMap 만들기
    const ediPtkObj = {};
    Object.values(ediMap || {}).forEach(c => {
      const pol = (c.pol || '').toUpperCase();
      const pod = (c.pod || '').toUpperCase();
      if (mode === 'discharge' && (pod === 'KRPTK' || pod.endsWith('PTK'))) {
        ediPtkObj[c.cn] = c;
      } else if (mode === 'loading' && (pol === 'KRPTK' || pol.endsWith('PTK'))) {
        ediPtkObj[c.cn] = c;
      }
    });
    return runDiagnostics({
      ediContainers: ediPtkObj,
      listRecords: recMap,
      xrayList: xrayMap,
      mode,
      carrier: voyage?.info?.carrier || '',
    });
  }, [containers, ediMap, recMap, xrayMap, mode, diagDismissed, voyage]);

  return (
    <div className="max-w-6xl mx-auto px-3 py-2">
      {/* 모드 탭 (둘 다 있을 때만) */}
      {hasDis && hasLoa && (
        <div className="flex gap-1 mb-3 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <button
            onClick={() => setMode('discharge')}
            className={`flex-1 py-2 rounded text-sm font-bold flex items-center justify-center gap-1.5 transition ${
              mode === 'discharge' ? 'bg-blue-700 text-blue-100' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <ArrowDown className="w-4 h-4"/>양하
          </button>
          <button
            onClick={() => setMode('loading')}
            className={`flex-1 py-2 rounded text-sm font-bold flex items-center justify-center gap-1.5 transition ${
              mode === 'loading' ? 'bg-amber-700 text-amber-100' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <ArrowUp className="w-4 h-4"/>선적
          </button>
        </div>
      )}
      {!hasDis && !hasLoa && <ModeSetup voyageKey={voyageKey} />}

      {/* 모드 라벨 (한 모드만 있을 때) */}
      {(hasDis !== hasLoa) && (
        <div className="mb-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-black ${
            mode === 'discharge' ? 'bg-blue-900/50 text-blue-200' : 'bg-amber-900/50 text-amber-200'
          }`}>
            {mode === 'discharge' ? <><ArrowDown className="w-3 h-3"/>양하</> : <><ArrowUp className="w-3 h-3"/>선적</>}
          </span>
        </div>
      )}

      {/* 탭 네비게이션 */}
      <nav className="bg-slate-900 border border-slate-800 rounded-lg flex mb-3 overflow-x-auto">
        {[
          { k: 'list', t: mode === 'discharge' ? '양하' : '선적', i: ListChecks },
          { k: 'search', t: '검색 🎤', i: SearchIcon },
          { k: 'bay', t: '베이', i: MapPin },
          { k: 'stats', t: '통계', i: BarChart3 },
          { k: 'report', t: '보고서', i: FileCheck },
          { k: 'data', t: '자료', i: Upload },
        ].map(({ k, t, i: Icon }) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 px-2 py-2.5 text-[11px] font-bold flex items-center justify-center gap-1 border-b-2 whitespace-nowrap ${
              tab === k ? 'border-amber-400 text-amber-300 bg-slate-800/30' : 'border-transparent text-slate-400'
            }`}>
            <Icon className="w-3.5 h-3.5"/>{t}
          </button>
        ))}
      </nav>

      {/* M3.5.4: 자동 진단 경고 패널 (모든 탭 위에 표시) */}
      {diagAlerts.length > 0 && (
        <div className="mb-3">
          <DiagnosticsPanel
            alerts={diagAlerts}
            autoSpeak={diagAutoSpeak}
            onToggleSpeak={() => setDiagAutoSpeak(v => !v)}
            onDismiss={() => setDiagDismissed(true)}
          />
        </div>
      )}

      {/* 탭 본문 */}
      {tab === 'list' && (
        <ListTab
          voyageKey={voyageKey} mode={mode}
          containers={containers} ediMap={ediMap} recMap={recMap}
          xrayMap={xrayMap} xraySeals={xraySeals} compMap={compMap}
          inspector={inspector}
          onOpenContainer={(c) => setDetailC(c)}
        />
      )}
      {tab === 'search' && (
        <SearchPanel
          voyage={voyage}
          voyageKey={voyageKey}
          inspector={inspector}
          onOpenContainer={(c) => setDetailC(c)}
          shipLib={shipLib}
        />
      )}
      {tab === 'bay' && (
        <BayPlan
          containers={containers} compMap={compMap} xrayMap={xrayMap} mode={mode}
          onOpenContainer={(c) => setDetailC(c)}
        />
      )}
      {tab === 'stats' && (
        <StatsTab containers={containers} compMap={compMap} xrayMap={xrayMap} mode={mode}/>
      )}
      {tab === 'report' && (
        <ReportTab
          voyageKey={voyageKey} mode={mode} voyageInfo={voyage.info}
          containers={containers} compMap={compMap} xrayMap={xrayMap} xraySeals={xraySeals}
        />
      )}
      {tab === 'data' && (
        <DataTab voyageKey={voyageKey} mode={mode} voyage={voyage} setMode={setMode} />
      )}

      {/* 컨테이너 상세 모달 */}
      {detailC && (() => {
        // 검색에서 온 경우 _mode 사용, 아니면 현재 mode
        const cMode = detailC._mode || mode;
        const cSec = voyage[cMode] || {};
        return (
          <ContainerDetailModal
            c={detailC}
            comp={cSec.completed?.[detailC.cn]}
            isXray={cMode === 'discharge' && !!(cSec.xrayList?.[detailC.cn])}
            xraySeal={cSec.xraySeals?.[detailC.cn] || null}
            mode={cMode}
            voyageKey={voyageKey}
            voyageInfo={voyage.info}
            inspector={inspector}
            onClose={() => setDetailC(null)}
          />
        );
      })()}
    </div>
  );
}

// === 리스트 탭 ===
function ListTab({ voyageKey, mode, containers, ediMap, recMap, xrayMap, xraySeals, compMap, inspector, onOpenContainer }) {
  const [filter, setFilter] = useState('all'); // all | done | undone | xray
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let arr = containers;
    if (filter === 'done') arr = arr.filter(c => compMap[c.cn]);
    else if (filter === 'undone') arr = arr.filter(c => !compMap[c.cn]);
    else if (filter === 'xray') arr = arr.filter(c => xrayMap[c.cn]);
    if (search) {
      const q = search.toUpperCase();
      arr = arr.filter(c => c.cn?.includes(q) || c.l4?.includes(q) || c.bay?.includes(q));
    }
    return arr;
  }, [containers, filter, search, compMap, xrayMap]);

  const stats = useMemo(() => ({
    total: containers.length,
    done: containers.filter(c => compMap[c.cn]).length,
    xray: mode === 'discharge' ? containers.filter(c => xrayMap[c.cn]).length : 0,
  }), [containers, compMap, xrayMap, mode]);

  const handleExport = () => {
    exportSectionToCSV(voyageKey, mode, containers, compMap, xrayMap, xraySeals);
  };

  return (
    <div className="space-y-3">
      <ValidationBox
        ediContainers={Object.values(ediMap)}
        records={Object.values(recMap)}
        mode={mode}
      />

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"/>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value.toUpperCase())}
            placeholder="끝4자리 / 컨번호 / 베이"
            className="w-full bg-slate-800 border border-slate-700 rounded pl-8 pr-2 py-1.5 text-sm mono focus:outline-none focus:border-amber-500"
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"><X className="w-4 h-4"/></button>}
        </div>
        <button
          onClick={handleExport}
          className="bg-emerald-900/50 hover:bg-emerald-800 border border-emerald-700/40 text-emerald-200 px-2 py-1.5 rounded text-xs font-bold flex items-center gap-1"
          title="CSV 내보내기"
        >
          <Download className="w-3.5 h-3.5"/>CSV
        </button>
      </div>

      <div className="flex gap-1 flex-wrap text-[11px]">
        {[
          { k: 'all', t: `전체 ${stats.total}` },
          { k: 'undone', t: `미완 ${stats.total - stats.done}` },
          { k: 'done', t: `완료 ${stats.done}` },
          ...(mode === 'discharge' ? [{ k: 'xray', t: `🔍 X-RAY ${stats.xray}` }] : []),
        ].map(({ k, t }) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-2.5 py-1 rounded font-bold ${
              filter === k ? 'bg-amber-700 text-amber-100' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}>{t}</button>
        ))}
      </div>

      <ContainerList
        list={filtered}
        compMap={compMap}
        xrayMap={xrayMap}
        xraySeals={xraySeals}
        mode={mode}
        voyageKey={voyageKey}
        inspector={inspector}
        onOpenContainer={onOpenContainer}
      />
    </div>
  );
}

// 옛 BayTab 제거 (BayPlan 컴포넌트로 대체됨)

// === 자료 탭 ===
function DataTab({ voyageKey, mode, voyage, setMode }) {
  const [status, setStatus] = useState('');
  const ediRef = useRef(null);
  const listRef = useRef(null);
  const cameraRef = useRef(null);
  const xrayRef = useRef(null);
  const sec = voyage[mode] || {};

  const handleEdiUpload = async (files) => {
    if (!files || files.length === 0) return;
    setStatus(`${files.length}개 파일 처리 중...`);
    const results = [];
    let allCns = {};
    let shipInfo = null;          // EDI에서 추출한 선박 정보
    let allEdiContainers = [];    // 베이 분석용 (평택 필터 X 전체)
    let prevStruct = null;        // 기존 학습된 구조

    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        const isAsc = /\.asc$/i.test(file.name) || /^\$604/.test(text.slice(0, 10));
        const r = isAsc ? parseAscFile(text) : parseBAPLIE(text);
        const total = r.containers.length;

        // 선박 정보 추출 (BAPLIE만, 첫 파일에서)
        if (!isAsc && !shipInfo) {
          shipInfo = extractShipInfo(text);
          if (shipInfo) {
            // 학습된 선박 구조 조회
            try {
              prevStruct = await fbGetShipStructure(shipInfo.imo);
              if (prevStruct?.structure) {
                results.push(`📚 학습된 선박: ${shipInfo.name} (IMO ${shipInfo.imo}) — 이전 분석 ${prevStruct.voyages ? Object.keys(prevStruct.voyages).length : 0}개 항차`);
              } else {
                results.push(`🆕 새 선박: ${shipInfo.name} (IMO ${shipInfo.imo})`);
              }
            } catch (e) {}
          }
        }

        // 베이 분석용 전체 컨테이너 누적
        allEdiContainers.push(...r.containers);

        // 평택 필터
        const ptk = r.containers.filter(c => {
          if (mode === 'discharge') return (c.pod || '').toUpperCase().endsWith('PTK');
          return (c.pol || '').toUpperCase().endsWith('PTK');
        });
        ptk.forEach(c => { allCns[c.cn] = c; });
        results.push(`✅ ${file.name}: 평택 ${ptk.length}대 (전체 ${total})`);
        // 항차 정보 자동 보완
        if (r.vsl && r.voy) {
          await fbUpdateVoyageInfo(voyageKey, {
            etd: r.etd || voyage.info.etd || '',
            carrier: r.carrier || voyage.info.carrier || '',
          });
        }
      } catch (e) {
        results.push(`❌ ${file.name}: ${e.message}`);
      }
    }

    if (Object.keys(allCns).length > 0) {
      const existing = sec.ediContainers || {};
      await fbSaveEdiContainers(voyageKey, mode, { ...existing, ...allCns });
    }

    // 선박 구조 분석 + 저장 (전체 컨테이너 기반, 평택 필터 X)
    if (shipInfo && allEdiContainers.length > 0) {
      try {
        const newStruct = analyzeShipStructure(allEdiContainers);
        const cmp = compareStructures(prevStruct?.structure, newStruct);
        if (cmp.isFirst) {
          results.push(`📊 선박 구조 학습: 베이 ${newStruct.bay_count}개, 짝꿍 ${Object.keys(newStruct.pairs).length / 2}쌍, 단독 ${newStruct.singles.length}개`);
        } else if (cmp.hasChanges) {
          results.push(`📊 선박 구조 업데이트: ${cmp.changes.join(' / ')}`);
        } else {
          results.push(`📊 선박 구조 일치 (이전 분석과 동일)`);
        }
        // 저장
        await fbSaveShipStructure(shipInfo.imo, {
          imo: shipInfo.imo,
          name: shipInfo.name,
          structure: newStruct,
        });
        await fbAddShipVoyage(shipInfo.imo, voyageKey, {
          voy: shipInfo.voyage,
          vsl: shipInfo.name,
          mode,
          container_count: allEdiContainers.length,
          ptk_count: Object.keys(allCns).length,
        });
        await fbAddShipStats(shipInfo.imo, {
          [mode]: Object.keys(allCns).length,
        });
      } catch (e) {
        console.error('Ship structure save failed:', e);
      }
    }

    setStatus(results.join('\n') + `\n\n총 평택 대상: ${Object.keys(allCns).length}대`);
    if (ediRef.current) ediRef.current.value = '';
  };

  const handleListUpload = async (files) => {
    if (!files || files.length === 0) return;
    setStatus(`${files.length}개 파일 처리 중...`);
    const results = [];
    let cnMap = { ...(sec.records || {}) };
    let added = 0;

    // M3.5.3: PDF/사진 자동 분기 (mixerUpload 모듈 활용)
    const { detectFileType, extractPdfText, parsePdfContainers, ocrImageContainers } = await import('../mixerUpload.js');
    const { GEMINI_API_KEY } = await import('../gemini.js');

    for (const file of Array.from(files)) {
      try {
        const ftype = await detectFileType(file);
        let records = [];

        if (ftype === 'pdf') {
          // PDF 처리
          setStatus(`📄 ${file.name} PDF 분석 중...`);
          const text = await extractPdfText(file);
          const parsed = parsePdfContainers(text);
          records = Object.values(parsed.containers || {});
          if (records.length === 0) {
            results.push(`❌ ${file.name}: PDF에서 컨번호 인식 실패`);
            continue;
          }
        } else if (ftype === 'image') {
          // 사진 OCR
          setStatus(`📷 ${file.name} 사진 분석 중 (Gemini Vision)...`);
          if (!GEMINI_API_KEY) {
            results.push(`❌ ${file.name}: Gemini API 키 없음`);
            continue;
          }
          try {
            const parsed = await ocrImageContainers(file, GEMINI_API_KEY);
            records = Object.values(parsed.containers || {});
            if (records.length === 0) {
              results.push(`❌ ${file.name}: 사진에서 컨번호 인식 실패 (선명한 사진 권장)`);
              continue;
            }
          } catch (e) {
            results.push(`❌ ${file.name} 사진 OCR 실패: ${e.message}`);
            continue;
          }
        } else {
          // 엑셀/CSV (기존 로직)
          const buf = await file.arrayBuffer();
          const parseResult = await parseListExcel(buf);
          records = parseResult.records || [];
          if (records.length === 0) {
            if (/cbf|booking|bkg|confirm/i.test(file.name)) {
              results.push(`ℹ️ ${file.name}: 예약 양식 (Booking) — 컨번호 없음, 정상`);
            } else {
              results.push(`❌ ${file.name}: 컨번호 인식 실패 (양식 확인 필요)`);
            }
            continue;
          }
        }

        // 공통: cnMap에 병합
        for (const r of records) {
          if (!r.cn) continue;
          if (!cnMap[r.cn]) added++;
          cnMap[r.cn] = { ...cnMap[r.cn], ...r };
        }
        const typeLabel = ftype === 'pdf' ? '📄 PDF' : ftype === 'image' ? '📷 사진' : '📊 엑셀';
        results.push(`✅ ${typeLabel} ${file.name}: +${records.length}대`);
      } catch (e) {
        results.push(`❌ ${file.name}: ${e.message}`);
      }
    }
    await fbSaveListRecords(voyageKey, mode, cnMap);
    setStatus(results.join('\n') + `\n\n전체 ${Object.keys(cnMap).length}대 (신규 ${added})`);
    if (listRef.current) listRef.current.value = '';
  };

  const handleXrayUpload = async (files) => {
    if (!files || files.length === 0 || mode !== 'discharge') return;
    setStatus(`${files.length}개 파일 처리 중...`);
    let cnObj = { ...(sec.xrayList || {}) };
    let added = 0;
    for (const file of Array.from(files)) {
      try {
        const buf = await file.arrayBuffer();
        const { containers } = await parseXrayList(buf);
        containers.forEach(cn => {
          if (!cnObj[cn]) { cnObj[cn] = { at: Date.now() }; added++; }
        });
      } catch (e) {}
    }
    await fbSaveXrayList(voyageKey, cnObj);
    setStatus(`✅ X-RAY: +${added}대 (전체 ${Object.keys(cnObj).length}대)`);
    if (xrayRef.current) xrayRef.current.value = '';
  };

  // 양하/선적 섹션 추가 (다른 모드)
  const otherMode = mode === 'discharge' ? 'loading' : 'discharge';
  const hasOther = !!voyage[otherMode];

  return (
    <div className="space-y-3">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
        <div className="text-sm font-bold mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400"/>
          1. EDI / ASC (필수)
        </div>
        <input ref={ediRef} type="file" multiple accept="*/*"
          onChange={e => handleEdiUpload(e.target.files)}
          className="text-xs text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-blue-700 file:text-blue-100 file:font-bold file:cursor-pointer"/>
        <div className="text-[10px] text-slate-500 mt-1">
          현재 EDI 컨테이너: {Object.keys(sec.ediContainers || {}).length}대
          <br/>지원: .edi .asc .txt (확장자 무관, 내용으로 판별)
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
        <div className="text-sm font-bold mb-2 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400"/>
          2. {mode === 'discharge' ? '양하' : '선적'} 리스트
        </div>
        <div className="flex items-center gap-2 mb-2">
          <input ref={listRef} type="file" multiple
            accept="*/*"
            onChange={e => handleListUpload(e.target.files)}
            className="flex-1 text-xs text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-emerald-700 file:text-emerald-100 file:font-bold file:cursor-pointer"/>
          <button
            onClick={() => cameraRef.current?.click()}
            className="bg-purple-700 hover:bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 flex-shrink-0"
            title="카메라로 종이 리스트 촬영"
          >
            <Camera className="w-3.5 h-3.5"/>📷
          </button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment"
            onChange={e => { handleListUpload(e.target.files); if (cameraRef.current) cameraRef.current.value = ''; }}
            className="hidden"/>
        </div>
        <div className="text-[10px] text-slate-500">
          현재 리스트: {Object.keys(sec.records || {}).length}대
          <br/>📊 엑셀 (.xls .xlsx .csv) · 📄 PDF · 📷 사진 (자동 인식)
        </div>
      </div>

      {mode === 'discharge' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="text-sm font-bold mb-2 flex items-center gap-2">
            🔍 3. X-RAY 리스트 (양하만)
          </div>
          <input ref={xrayRef} type="file" multiple
            accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*"
            onChange={e => handleXrayUpload(e.target.files)}
            className="text-xs text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-purple-700 file:text-purple-100 file:font-bold file:cursor-pointer"/>
          <div className="text-[10px] text-slate-500 mt-1">
            현재 X-RAY: {Object.keys(sec.xrayList || {}).length}대
            <br/>지원: .xls .xlsx
          </div>
        </div>
      )}

      {!hasOther && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-2">이 항차에 {otherMode === 'discharge' ? '양하' : '선적'} 작업이 같이 있나요?</div>
          <button
            onClick={async () => {
              await fbUpdateVoyageInfo(voyageKey, {});
              await fbSaveSectionData(voyageKey, otherMode, { _created: Date.now() });
              setMode(otherMode);
            }}
            className={`w-full py-2 rounded text-sm font-bold ${
              otherMode === 'discharge'
                ? 'bg-blue-900/50 hover:bg-blue-800 text-blue-100 border border-blue-700/40'
                : 'bg-amber-900/50 hover:bg-amber-800 text-amber-100 border border-amber-700/40'
            }`}
          >
            + {otherMode === 'discharge' ? '양하' : '선적'} 섹션 추가
          </button>
        </div>
      )}

      {status && (
        <pre className="bg-slate-950 border border-slate-800 rounded p-2 text-[11px] text-slate-300 whitespace-pre-wrap mono">
{status}
        </pre>
      )}
    </div>
  );
}

function ModeSetup({ voyageKey }) {
  return (
    <div className="bg-amber-900/30 border border-amber-800 rounded-lg p-4 text-center mb-3">
      <div className="text-amber-200 text-sm mb-2">자료를 업로드해주세요</div>
      <div className="text-[11px] text-amber-300/70">자료 탭에서 EDI/ASC 파일부터 시작하세요</div>
    </div>
  );
}
