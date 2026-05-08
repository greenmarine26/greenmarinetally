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
import { extractShipInfo, analyzeShipStructure, compareStructures, augmentStructureWithBayDict, isShipInBayDict } from '../shipStructure.js';
import ContainerList from '../components/ContainerList.jsx';
import ValidationBox from '../components/ValidationBox.jsx';
import SearchPanel from '../components/SearchPanel.jsx';
import BayPlan from '../components/BayPlan.jsx';
import StatsTab from '../components/StatsTab.jsx';
import BayDictVerifyWidget from '../components/BayDictVerifyWidget.jsx';
import BayDictStatusWidget from '../components/BayDictStatusWidget.jsx';
import ReportTab from '../components/ReportTab.jsx';
import ContainerDetailModal from '../components/ContainerDetailModal.jsx';
import WorkReportModal from '../components/WorkReportModal.jsx';
import { getEquipNumber } from '../utils.js';
import DiagnosticsPanel from '../components/DiagnosticsPanel.jsx';
import ConflictReviewModal from '../components/ConflictReviewModal.jsx';
import ChoiceModal, { useChoice } from '../components/ChoiceModal.jsx';
import ShipPolicyModal from '../components/ShipPolicyModal.jsx';
import EmptySealReportButton from '../components/EmptySealReport.jsx';
import { runDiagnostics } from '../diagnostics.js';
import { matchShipPolicy, applyPolicyToContainer, fbSubscribeShipPolicies } from '../shipPolicies.js';
import { db } from '../firebase.js';
import { exportSectionToCSV } from '../components/CSVExport.jsx';

export default function VoyagePage({ voyageKey, voyage, inspector, inspectors, onGoHome, onModeChange }) {
  // 양하/선적 모드 — 둘 다 있으면 토글, 하나만 있으면 자동
  const hasDis = !!voyage?.discharge;
  const hasLoa = !!voyage?.loading;
  const initMode = voyage?.info?.mode || (hasDis ? 'discharge' : 'loading');
  const [mode, setMode] = useState(initMode);
  const [tab, setTab] = useState('list');
  const [detailC, setDetailC] = useState(null); // 컨테이너 상세 모달
  const [showWorkReport, setShowWorkReport] = useState(false);  // M3.5.6: 작업 보고 모달
  const [shipLib, setShipLib] = useState(null); // M3.0: 선박 라이브러리 (AI 컨텍스트용)
  // M3.5.4: 자동 진단 state (메인 컴포넌트에 두어야 useMemo에서 접근 가능)
  const [diagAutoSpeak, setDiagAutoSpeak] = useState(true);
  const [diagDismissed, setDiagDismissed] = useState(false);
  // M3.5.5: 선박 엠티 실 정책
  const [extraPolicies, setExtraPolicies] = useState({});
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyAsked, setPolicyAsked] = useState(false);

  // 선박 정책 Firebase 구독
  useEffect(() => {
    const unsub = fbSubscribeShipPolicies(db, (data) => setExtraPolicies(data || {}));
    return () => { try { unsub && unsub(); } catch (e) {} };
  }, []);

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

  // M3.89: 베이플랜 전용 - 전체 EDI 컨테이너 (isPtk 필터 X)
  //   원칙: 베이플랜은 선박 적부도 = 모든 화물 표시. 평택 화물 0대 베이도 누락 X
  //   기존 containers는 평택만 (검색/통계/검수용)
  //   베이플랜에만 이 allEdiContainers 전달 → 어떤 EDI 와도 베이 누락 X
  const allEdiContainers = useMemo(() => {
    const merged = {};
    Object.values(ediMap).forEach(c => { merged[c.cn] = { ...c, _src: 'edi' }; });
    // recMap에서 EDI에 없는 컨도 포함 (참고용)
    Object.values(recMap).forEach(r => {
      if (!merged[r.cn]) {
        merged[r.cn] = { ...r, _src: 'list' };
      } else {
        // EDI 매칭된 컨은 sl 보강만
        const safeR = {};
        if (r.sl) safeR.sl = r.sl;
        if (r.sl_orig) safeR.sl_orig = r.sl_orig;
        if (r.wt && !merged[r.cn].wt) safeR.wt = r.wt;
        merged[r.cn] = { ...merged[r.cn], ...safeR };
      }
    });
    return Object.values(merged);
  }, [ediMap, recMap]);

  // 표시용 컨테이너 (EDI 평택 + 리스트 병합)
  // M3.5.4-fix2: EDI = 단일 진실 원칙 강화
  //   - 리스트는 sl/wt 같은 보강 필드만 채울 수 있음
  //   - ISO, rf, fe, dg, bay/row/tier 등 핵심 필드는 EDI 절대 우선
  //   - 리스트가 EDI 리퍼를 일반 컨으로 덮어쓰는 사고 방지
  const containers = useMemo(() => {
    const merged = {};
    Object.values(ediMap).forEach(c => { if (isPtk(c)) merged[c.cn] = { ...c, _src: 'edi' }; });

    // 리스트가 채울 수 있는 필드 (보강 정보만)
    // EDI 핵심 필드(iso, rf, fr, ot, tk, dg, fe, bay, row, tier, pol, pod 등)는 제외
    const ALLOWED_LIST_FIELDS = new Set([
      'sl', 'sl_orig', 'sl_history', 'wt',
      'bl', 'sh', 'gi', 'op',  // B/L, Shipper, Gross Index, Operator
      'tmp',  // 온도는 리스트가 보강 가능 (단, 비어있을 때만)
    ]);

    Object.values(recMap).forEach(r => {
      const ediBase = merged[r.cn];
      const safeR = {};
      Object.keys(r).forEach(k => {
        const v = r[k];
        // 의미있는 값만
        if (v === '' || v === null || v === undefined) return;
        if (Array.isArray(v) && v.length === 0) return;

        if (ediBase) {
          // EDI 매칭됨 → 핵심 필드는 보호, 보강 필드만 허용
          if (!ALLOWED_LIST_FIELDS.has(k)) return;  // 핵심 필드 무시
          // tmp는 EDI에 이미 있으면 덮어쓰지 않음 (EDI가 진실)
          if (k === 'tmp' && ediBase.tmp && !ediBase.tmp_missing) return;
          // wt는 EDI 값이 0일 때만 채움
          if (k === 'wt' && parseInt(ediBase.wt, 10) > 0) return;
          safeR[k] = v;
        } else {
          // EDI에 없는 컨번호 → 리스트만 있는 항목 (참고용으로 허용)
          if (v !== 0) safeR[k] = v;
        }
      });
      merged[r.cn] = { ...(ediBase || {}), ...safeR, _src: ediBase ? 'both' : 'list' };
    });
    return Object.values(merged).sort((a, b) => {
      const ka = `${a.bay || 'zz'}-${a.row || 'zz'}-${a.tier || 'zz'}`;
      const kb = `${b.bay || 'zz'}-${b.row || 'zz'}-${b.tier || 'zz'}`;
      return ka.localeCompare(kb);
    });
  }, [ediMap, recMap, mode]);

  // M3.5.5: 선박 정책 매칭 (DEFAULT + Firebase extra)
  const shipPolicy = useMemo(() => {
    const vsl = voyage?.info?.vsl || '';
    return matchShipPolicy(vsl, extraPolicies);
  }, [voyage, extraPolicies]);

  // M3.5.5: 정책 적용 대상 컨테이너 (sealMode 표시용)
  const sealTargets = useMemo(() => {
    if (!shipPolicy) return { byCn: {}, list: [] };
    const byCn = {};
    const list = [];
    (containers || []).forEach(c => {
      const sm = applyPolicyToContainer(shipPolicy, c);
      if (sm) {
        byCn[c.cn] = sm;
        list.push({ ...c, _sealMode: sm });
      }
    });
    return { byCn, list };
  }, [shipPolicy, containers]);

  // 새 선박 정책 묻기 (한 번만)
  useEffect(() => {
    if (policyAsked) return;
    if (!voyage?.info?.vsl) return;
    if (shipPolicy) return;  // 이미 매칭됨
    const hasEdi = (containers || []).length > 0;
    if (hasEdi) {
      setShowPolicyModal(true);
      setPolicyAsked(true);
    }
  }, [voyage, shipPolicy, policyAsked, containers]);

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
      sealPolicy: shipPolicy,  // M3.5.5
    });
  }, [containers, ediMap, recMap, xrayMap, mode, diagDismissed, voyage, shipPolicy]);

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

      {/* M3.5.6: 작업 보고 큰 버튼 */}
      <button onClick={() => setShowWorkReport(true)}
        className="w-full mb-3 py-3 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-lg">
        📤 작업 보고 (시작/중단/완료/해치/콘박스)
      </button>

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

      {/* M3.5.5: 선박 엠티 실 정책 배너 + 보고서 */}
      {shipPolicy && sealTargets.list.length > 0 && (
        <div className="mb-3 space-y-2">
          <div className={`rounded-lg p-3 border-2 flex items-center justify-between gap-2 ${
            shipPolicy.mode === 'attach'
              ? 'bg-red-950/30 border-red-700/50'
              : 'bg-cyan-950/30 border-cyan-700/50'
          }`}>
            <div className="flex items-center gap-2 flex-1">
              <span className={`text-xl ${shipPolicy.mode === 'attach' ? 'text-red-400' : 'text-cyan-400'}`}>🔧</span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-black ${shipPolicy.mode === 'attach' ? 'text-red-200' : 'text-cyan-200'}`}>
                  {shipPolicy.name || voyage?.info?.vsl} · {shipPolicy.label}
                </div>
                <div className="text-[10px] text-slate-400">
                  대상 {sealTargets.list.length}대 · 완료 {sealTargets.list.filter(c => c.eseal).length}대 · 남음 {sealTargets.list.filter(c => !c.eseal).length}대
                </div>
              </div>
            </div>
            <button onClick={() => setShowPolicyModal(true)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold text-slate-300">
              정책 변경
            </button>
          </div>

          {/* 엠티 실 보고서 */}
          <EmptySealReportButton
            vsl={voyage?.info?.vsl || ''}
            voy={voyage?.info?.voy || voyage?.info?.voy_l || voyage?.info?.voy_d || ''}
            loadDate={voyage?.info?.loadDate || ''}
            containers={sealTargets.list}
            mode={mode}
            sealMode={shipPolicy.mode}
          />
        </div>
      )}

      {/* M3.5.5: 선박 정책 배너 (엠티 실 작업 모드일 때) */}
      {shipPolicy && sealTargets.list.length > 0 && (
        <div className="mb-3">
          <SealPolicyBanner
            policy={shipPolicy}
            targets={sealTargets.list}
            voyage={voyage}
          />
        </div>
      )}

      {/* M3.5.4: 자동 진단 경고 패널 */}
      {diagAlerts.length > 0 && (
        <div className="mb-3">
          <DiagnosticsPanel
            alerts={diagAlerts}
            autoSpeak={diagAutoSpeak}
            onToggleSpeak={() => setDiagAutoSpeak(v => !v)}
            onDismiss={() => setDiagDismissed(true)}
            onOpenContainer={(cn) => {
              const c = (containers || []).find(x => x.cn === cn);
              if (c) setDetailC(c);
            }}
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
        <div className="space-y-2">
          <BayDictStatusWidget
            shipImo={voyage?.info?.imo}
            shipName={voyage?.info?.vsl}
            ediContainerCount={allEdiContainers.length}
          />
          <BayPlan
            containers={allEdiContainers} compMap={compMap} xrayMap={xrayMap} mode={mode}
            onOpenContainer={(c) => setDetailC(c)}
          />
        </div>
      )}
      {tab === 'stats' && (
        <div className="space-y-3">
          <BayDictVerifyWidget
            shipInfo={voyage?.info ? { imo: voyage.info.imo, name: voyage.info.vsl } : null}
            ediContainers={Object.values(ediMap)}
          />
          <StatsTab containers={containers} compMap={compMap} xrayMap={xrayMap} mode={mode}/>
        </div>
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
        // M3.87: 위치 수정 충돌 검사용 - 같은 모드 전체 컨테이너 머지
        const ediMap = cSec.ediContainers || {};
        const recMap = cSec.records || {};
        const compMap = cSec.completed || {};
        const allCnSet = new Set([...Object.keys(ediMap), ...Object.keys(recMap)]);
        const allContainersForMode = [...allCnSet].map(cn => {
          const e = ediMap[cn] || {};
          const r = recMap[cn] || {};
          return { ...e, ...Object.fromEntries(Object.entries(r).filter(([k,vv]) => vv !== '' && vv != null)), cn, _comp: compMap[cn] || null };
        });
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
            sealMode={sealTargets.byCn[detailC.cn] || null}
            onClose={() => setDetailC(null)}
            allContainers={allContainersForMode}
          />
        );
      })()}

      {/* M3.5.5: 새 선박 정책 등록 모달 */}
      <ShipPolicyModal
        open={showPolicyModal}
        vsl={voyage?.info?.vsl || ''}
        code={voyage?.info?.imo || ''}
        inspector={inspector}
        onSaved={() => { /* Firebase 구독으로 자동 반영 */ }}
        onClose={() => setShowPolicyModal(false)}
      />

      {/* M3.5.6: 작업 보고 모달 (양하/선적/해치/콘박스 + 카톡 공유) */}
      <WorkReportModal
        open={showWorkReport}
        voyageKey={voyageKey}
        voyage={voyage}
        lastEquip={getEquipNumber()}
        onClose={() => setShowWorkReport(false)}
      />
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
  // M3.5.4-fix2: 업로드 충돌 검토 모달
  const [conflictData, setConflictData] = useState(null);
  // M3.74: prompt() 대체 - 카드형 3택 모달
  const [choiceState, askChoice] = useChoice();
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

        // M4.3 ★ 진짜 베이 누락 root cause fix
        //   이전 버그: 이 EDI 업로드 경로(VoyagePage 자체 업로드)에 평택 필터가 살아있었음
        //   M3.91 fix는 MixerUploadModal에만 적용 → 이 경로는 여전히 평택 297대만 저장
        //   증상: 사용자님 보고 "새 EDI 업로드해도 297대만 보임" — 진짜 원인이 여기였음
        //   수정: 모든 컨 저장 + _mode 태그로 구분 (discharge/loading/transit)
        let ptkCount = 0;
        r.containers.forEach(c => {
          const podPtk = (c.pod || '').toUpperCase().endsWith('PTK');
          const polPtk = (c.pol || '').toUpperCase().endsWith('PTK');
          let containerMode;
          if (mode === 'discharge') {
            // 양하 모드: 평택 양하면 'discharge', 아니면 'transit'
            if (podPtk) { containerMode = 'discharge'; ptkCount++; }
            else containerMode = 'transit';
          } else {
            // 선적 모드: 평택 선적이면 'loading', 아니면 'transit'
            if (polPtk) { containerMode = 'loading'; ptkCount++; }
            else containerMode = 'transit';
          }
          // M3.5.5: 컨번호 없는 엠티는 위치를 키로 사용
          const key = c.cn && c.cn.length === 11 ? c.cn : `__SLOT_${c.bay}_${c.row}_${c.tier}`;
          allCns[key] = { ...c, _slotKey: key, _mode: containerMode };
        });
        results.push(`✅ ${file.name}: 평택 ${ptkCount}대 (전체 ${total}, 통과 ${total - ptkCount}대 포함 저장)`);
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
      const existingCount = Object.keys(existing).length;
      const newCount = Object.keys(allCns).length;

      // M3.5.4-fix2: 기존 EDI 데이터 있으면 사용자에게 처리 방식 묻기
      // M3.74: window.prompt() → ChoiceModal (풀 너비 카드 버튼)
      if (existingCount > 0) {
        const overlap = Object.keys(allCns).filter(cn => existing[cn]).length;
        const onlyNew = newCount - overlap;
        const choice = await askChoice({
          title: '기존 EDI 데이터 처리',
          description:
            `기존 EDI: ${existingCount}대\n` +
            `새로 업로드: ${newCount}대 (중복 ${overlap}대, 신규 ${onlyNew}대)\n\n` +
            `어떻게 할까요?`,
          options: [
            {
              key: '1',
              label: '🔄 교체',
              desc: '기존 모두 삭제 후 새 것만',
              recommended: true,  // 같은 EDI 다시 올릴 때가 가장 흔함
            },
            {
              key: '2',
              label: '📥 추가 병합',
              desc: '중복은 새 값으로 덮어쓰기',
            },
            {
              key: '3',
              label: '➕ 신규만 추가',
              desc: '중복은 기존 유지',
            },
          ],
        });
        if (!choice) {
          setStatus('취소됨');
          if (ediRef.current) ediRef.current.value = '';
          return;
        }
        if (choice === '1') {
          // 교체: 기존 완전 삭제 후 새 것만
          await fbSaveEdiContainers(voyageKey, mode, allCns);
          results.push(`🔄 교체 완료: ${existingCount}대 → ${newCount}대`);
        } else if (choice === '2') {
          await fbSaveEdiContainers(voyageKey, mode, { ...existing, ...allCns });
          results.push(`📥 병합: 기존 ${existingCount}대 + 신규 ${onlyNew}대 (중복 ${overlap}대 덮어씀)`);
        } else if (choice === '3') {
          // 신규만 추가
          const onlyNewObj = {};
          Object.entries(allCns).forEach(([cn, c]) => {
            if (!existing[cn]) onlyNewObj[cn] = c;
          });
          await fbSaveEdiContainers(voyageKey, mode, { ...existing, ...onlyNewObj });
          results.push(`➕ 신규만 추가: ${Object.keys(onlyNewObj).length}대 (기존 ${existingCount}대 유지)`);
        }
      } else {
        // 기존 데이터 없으면 그냥 저장
        await fbSaveEdiContainers(voyageKey, mode, allCns);
      }
    }

    // 선박 구조 분석 + 저장 (전체 컨테이너 기반, 평택 필터 X)
    if (shipInfo && allEdiContainers.length > 0) {
      try {
        const baseStruct = analyzeShipStructure(allEdiContainers);

        // M3.90: 베이사전(.def 파일 기반) 자동 매칭
        const newStruct = augmentStructureWithBayDict(baseStruct, shipInfo.imo, shipInfo.name);
        if (newStruct.bayDictApplied) {
          results.push(`📚 베이사전 매칭: ${shipInfo.name} (${shipInfo.imo}) - .def 데이터 적용됨`);
        }

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

    // M3.5.4-fix2: 기존 리스트 데이터 있으면 사용자에게 묻기
    // M3.74: window.prompt() → ChoiceModal
    const existing = sec.records || {};
    const existingCount = Object.keys(existing).length;
    let startMap = { ...existing };
    let skipExisting = false;
    if (existingCount > 0) {
      const choice = await askChoice({
        title: '기존 리스트 데이터 처리',
        description: `기존 리스트: ${existingCount}대\n\n어떻게 할까요?`,
        options: [
          {
            key: '1',
            label: '🔄 교체',
            desc: '기존 모두 삭제 후 새 것만',
            recommended: true,
          },
          {
            key: '2',
            label: '📥 추가 병합',
            desc: '중복은 새 값으로 덮어쓰기',
          },
          {
            key: '3',
            label: '➕ 신규만 추가',
            desc: '중복은 기존 유지',
          },
        ],
      });
      if (!choice) {
        setStatus('취소됨');
        if (listRef.current) listRef.current.value = '';
        return;
      }
      if (choice === '1') {
        startMap = {};  // 교체: 기존 비우고 시작
      }
      // 신규만 모드는 cn별 처리 시 기존 값 보존
      skipExisting = choice === '3';
    }

    setStatus(`${files.length}개 파일 처리 중...`);
    const results = [];
    let cnMap = startMap;
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

        // 공통: cnMap에 병합 (skipExisting이면 기존 컨번호는 건너뜀)
        for (const r of records) {
          if (!r.cn) continue;
          if (cnMap[r.cn]) {
            if (skipExisting) continue;  // 신규만 모드 → 기존 유지
            cnMap[r.cn] = { ...cnMap[r.cn], ...r };
          } else {
            added++;
            cnMap[r.cn] = r;
          }
        }
        const typeLabel = ftype === 'pdf' ? '📄 PDF' : ftype === 'image' ? '📷 사진' : '📊 엑셀';
        results.push(`✅ ${typeLabel} ${file.name}: +${records.length}대`);
      } catch (e) {
        results.push(`❌ ${file.name}: ${e.message}`);
      }
    }

    // M3.5.4-fix2: 충돌 검출 — EDI vs 리스트 비교
    const ediMap = sec.ediContainers || {};
    const newRecords = {};
    Object.values(cnMap).forEach(r => {
      // 신규 업로드된 것만 비교 (기존 records에 없던 것)
      if (r.cn) newRecords[r.cn] = r;
    });

    const unmatched = [];      // EDI에 없는 컨번호
    const weightDiffs = [];    // 무게 차이 1톤 이상
    const sealDiffs = [];      // 실번호 불일치

    Object.values(newRecords).forEach(r => {
      const ediC = ediMap[r.cn];
      if (!ediC) {
        // EDI에 없는 컨 (단, 기존에 records로 있던 것은 이미 처리된 거니 신규만)
        const wasInRecords = (sec.records || {})[r.cn];
        if (!wasInRecords) {
          unmatched.push({ cn: r.cn, sl: r.sl || '', wt: r.wt || 0, iso: r.iso || '', fe: r.fe || '' });
        }
        return;
      }
      // 무게 차이
      const ediW = parseInt(ediC.wt, 10) || 0;
      const lrW = parseInt(r.wt, 10) || 0;
      if (ediW > 0 && lrW > 0 && Math.abs(ediW - lrW) >= 1000) {
        weightDiffs.push({ cn: r.cn, ediW, listW: lrW });
      }
      // 실번호 불일치 (EDI에 sl 있고 리스트에도 있는데 다름)
      const ediSl = String(ediC.sl || '').trim();
      const lrSl = String(r.sl || '').trim();
      if (ediSl && lrSl && ediSl !== lrSl) {
        sealDiffs.push({ cn: r.cn, ediSl, listSl: lrSl });
      }
    });

    const totalConflicts = unmatched.length + weightDiffs.length + sealDiffs.length;

    if (totalConflicts > 0) {
      // 충돌 있음 → 모달로 검수원에게 확인
      setStatus(results.join('\n') + `\n\n⚠️ 검토 필요 ${totalConflicts}건 — 확인 후 저장`);
      setConflictData({
        cnMap,             // 임시 저장 (적용 시 사용)
        results,
        added,
        conflicts: { unmatched, weightDiffs, sealDiffs },
      });
      if (listRef.current) listRef.current.value = '';
      return;
    }

    // 충돌 없음 → 그대로 저장
    await fbSaveListRecords(voyageKey, mode, cnMap);
    setStatus(results.join('\n') + `\n\n전체 ${Object.keys(cnMap).length}대 (신규 ${added})`);
    if (listRef.current) listRef.current.value = '';
  };

  // M3.5.4-fix2: 충돌 검토 결과 적용
  const applyConflictResolution = async (resolution) => {
    if (!conflictData) return;
    const { cnMap, results, added } = conflictData;
    const ediMap = sec.ediContainers || {};
    const finalMap = { ...cnMap };

    // 1. EDI에 없는 컨: ignore면 제거, add면 유지
    resolution.unmatchedActions.forEach(a => {
      if (a.action === 'ignore') {
        delete finalMap[a.cn];
      }
      // add는 그대로 두면 됨 (이미 cnMap에 있음)
    });

    // 2. 무게: 'edi' 선택 시 EDI 무게로, 'list'면 리스트 무게 그대로
    resolution.weightActions.forEach(a => {
      if (a.action === 'edi' && finalMap[a.cn]) {
        finalMap[a.cn].wt = a.ediW;
      }
      // list는 그대로 (이미 리스트 값)
    });

    // 3. 실번호: 'edi' 선택 시 EDI 실번호로
    resolution.sealActions.forEach(a => {
      if (a.action === 'edi' && finalMap[a.cn]) {
        finalMap[a.cn].sl = a.ediSl;
      }
    });

    await fbSaveListRecords(voyageKey, mode, finalMap);
    const ignoredCount = resolution.unmatchedActions.filter(a => a.action === 'ignore').length;
    setStatus(results.join('\n') + `\n\n✅ 저장 완료 — 전체 ${Object.keys(finalMap).length}대${ignoredCount > 0 ? ` (무시 ${ignoredCount}대)` : ''}`);
    setConflictData(null);
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

      {/* M3.5.4-fix2: 충돌 검토 모달 */}
      <ConflictReviewModal
        open={!!conflictData}
        conflicts={conflictData?.conflicts}
        onClose={() => {
          setConflictData(null);
          setStatus(prev => prev + '\n\n❌ 저장 취소됨');
        }}
        onResolve={applyConflictResolution}
      />

      {/* M3.74: prompt() 대체 - EDI/리스트 업로드 충돌 처리 */}
      <ChoiceModal {...choiceState} />
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

// M3.5.5: 엠티 실 작업 정책 배너
function SealPolicyBanner({ policy, targets, voyage }) {
  const total = targets.length;
  const done = targets.filter(c => c.eseal).length;
  const pending = total - done;
  const isAttach = policy.mode === 'attach';

  return (
    <div className={`border-2 rounded-xl p-3 ${
      isAttach
        ? 'border-red-600 bg-red-950/30'
        : 'border-cyan-600 bg-cyan-950/30'
    }`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{isAttach ? '🔧' : '🔍'}</span>
          <div>
            <div className="font-black text-base">
              {isAttach ? '엠티 실 부착 작업' : '엠티 실 확인 작업'}
            </div>
            <div className="text-[11px] text-slate-400">{policy.label}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-black ${pending === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {done} / {total}
          </div>
          {pending > 0 && (
            <div className="text-[10px] text-amber-300 font-bold animate-pulse">
              {pending}대 남음
            </div>
          )}
        </div>
      </div>
      <EmptySealReportButton voyage={voyage} sealTargets={targets} sealMode={policy.mode}/>
    </div>
  );
}
