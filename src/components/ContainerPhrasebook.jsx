import React, { useState, useEffect, useMemo, useRef } from 'react';

// ============================================================================
// 데이터: 컨테이너 검수 영어 회화집 (양하 + 선적)
// ============================================================================
const PHRASE_DATA = [
  {
    id: 'greet',
    label: '인사/승선',
    icon: '👋',
    items: [
      { ko: '안녕하세요. 검수원입니다.', en: "Good morning. I am the tally officer." },
      { ko: '양하 작업 때문에 승선했습니다.', en: "I'm boarding for the discharge operation." },
      { ko: '선적 작업 때문에 승선했습니다.', en: "I'm boarding for the loading operation." },
      { ko: '1등 항해사를 뵐 수 있을까요?', en: "May I see the Chief Officer, please?" },
      { ko: '선장님을 만날 수 있을까요?', en: "May I see the Captain, please?" },
      { ko: '본선 사무실은 어디입니까?', en: "Where is the ship's office?" },
      { ko: '안전모와 안전화 갖췄습니다.', en: "I have my helmet and safety shoes." },
      { ko: '한국어 하실 수 있나요?', en: "Do you speak Korean?" },
      { ko: '천천히 말씀해 주세요.', en: "Could you speak slowly, please?" },
      { ko: '다시 한 번 말씀해 주시겠어요?', en: "Could you say that again, please?" },
      { ko: '글로 적어 주시겠어요?', en: "Could you write it down, please?" },
    ],
  },
  {
    id: 'discharge',
    label: '양하 작업',
    icon: '⬇️',
    items: [
      { ko: '언제 양하를 시작합니까?', en: "When will you start discharging?" },
      { ko: '어느 베이부터 작업합니까?', en: "Which bay will you start with?" },
      { ko: '베이플랜을 받을 수 있을까요?', en: "Could I have the bay plan, please?" },
      { ko: 'BAPLIE EDI 파일을 보내주실 수 있나요?', en: "Could you send me the BAPLIE EDI file?" },
      { ko: '양하 리스트를 주십시오.', en: "Please give me the discharge list." },
      { ko: '적하목록이 있습니까?', en: "Do you have the cargo manifest?" },
      { ko: '총 몇 본 양하합니까?', en: "How many boxes will be discharged in total?" },
      { ko: '양하 순서를 알려주세요.', en: "Please tell me the discharge sequence." },
      { ko: '갑판 먼저 합니까, 선창 먼저 합니까?', en: "Will you discharge the deck first, or the hold first?" },
      { ko: '양하 완료됐습니다.', en: "Discharging is completed." },
      { ko: '잔량이 있습니까?', en: "Are there any remaining containers?" },
    ],
  },
  {
    id: 'loading',
    label: '선적 작업',
    icon: '⬆️',
    items: [
      { ko: '언제 선적을 시작합니까?', en: "When will you start loading?" },
      { ko: '선적 계획서를 받을 수 있을까요?', en: "Could I have the loading plan?" },
      { ko: '선적 순서를 알려주세요.', en: "Please tell me the loading sequence." },
      { ko: '총 몇 본 선적합니까?', en: "How many boxes will be loaded in total?" },
      { ko: '어느 베이에 적재합니까?', en: "Which bay will it be loaded into?" },
      { ko: '이 컨테이너의 위치는 어디입니까?', en: "Where is the stowage position for this container?" },
      { ko: '양하지(POD)별로 분리해서 적재해 주세요.', en: "Please segregate the stowage by POD." },
      { ko: '환적 화물은 따로 적재합니까?', en: "Will the transshipment cargo be stowed separately?" },
      { ko: '중량 분포는 괜찮습니까?', en: "Is the weight distribution okay?" },
      { ko: '본선 안정성에 문제 없습니까?', en: "Is there any issue with the vessel's stability?" },
      { ko: '리퍼는 전원 공급되는 위치에 적재해 주세요.', en: "Please stow the reefers at the power-supplied positions." },
      { ko: '위험물은 격리 규정에 따라 적재해야 합니다.', en: "Dangerous goods must be stowed according to segregation rules." },
      { ko: '라싱(고박) 확인해 주세요.', en: "Please check the lashing." },
      { ko: '추가 라싱이 필요합니다.', en: "Additional lashing is required." },
      { ko: '선적 완료됐습니다.', en: "Loading is completed." },
      { ko: '출항 시간이 언제입니까?', en: "What is the departure time?" },
      { ko: '안전한 항해 되십시오.', en: "Have a safe voyage." },
    ],
  },
  {
    id: 'container',
    label: '컨테이너/실',
    icon: '📦',
    items: [
      { ko: '컨테이너 번호 확인하겠습니다.', en: "Let me check the container number." },
      { ko: '끝자리 네 자리만 불러주세요.', en: "Please give me the last four digits only." },
      { ko: '실 번호가 무엇입니까?', en: "What is the seal number?" },
      { ko: '실이 없습니다.', en: "The seal is missing." },
      { ko: '실이 손상됐습니다.', en: "The seal is broken." },
      { ko: '실 번호가 서류와 다릅니다.', en: "The seal number doesn't match the document." },
      { ko: '사진 찍어두겠습니다.', en: "I'll take a picture for the record." },
      { ko: '다시 한 번 확인 부탁드립니다.', en: "Could you please double-check?" },
      { ko: '엠티 컨테이너에 실이 달려 있습니다.', en: "There is a seal on this empty container." },
      { ko: '풀 컨테이너에 실이 없습니다.', en: "This full container has no seal." },
    ],
  },
  {
    id: 'damage',
    label: '손상/불일치',
    icon: '⚠️',
    items: [
      { ko: '컨테이너가 손상됐습니다.', en: "The container is damaged." },
      { ko: '어디가 손상됐습니까?', en: "Where is the damage?" },
      { ko: '좌측면이 찌그러졌습니다.', en: "The left side is dented." },
      { ko: '우측면에 구멍이 있습니다.', en: "There is a hole on the right side." },
      { ko: '천장이 손상됐습니다.', en: "The roof is damaged." },
      { ko: '바닥에 균열이 있습니다.', en: "There is a crack on the floor." },
      { ko: '문이 안 닫힙니다.', en: "The door won't close." },
      { ko: '문짝이 휘어져 있습니다.', en: "The door panel is bent." },
      { ko: '화물이 새고 있습니다.', en: "The cargo is leaking." },
      { ko: '손상 보고서를 작성해야 합니다.', en: "We need to make a damage report." },
      { ko: 'EIR을 발급해 주세요.', en: "Please issue an EIR." },
      { ko: '본선 책임입니까, 터미널 책임입니까?', en: "Is this the vessel's responsibility, or the terminal's?" },
      { ko: '서류와 실물이 다릅니다.', en: "The document and the actual cargo don't match." },
      { ko: '이 컨테이너는 리스트에 없습니다.', en: "This container is not on the list." },
      { ko: 'ISO 코드가 다릅니다.', en: "The ISO code is different." },
      { ko: '본선에서 확인 부탁드립니다.', en: "Please verify on board." },
      { ko: '회사에 보고해야 합니다.', en: "I need to report this to my company." },
      { ko: '양하 보류하겠습니다.', en: "We will hold the discharge." },
    ],
  },
  {
    id: 'location',
    label: '위치/베이',
    icon: '📍',
    items: [
      { ko: '그 컨테이너는 어디에 있습니까?', en: "Where is that container located?" },
      { ko: '베이, 로우, 티어를 알려주세요.', en: "Please tell me the bay, row, and tier." },
      { ko: '갑판상에 있습니다.', en: "It's on deck." },
      { ko: '선창 안에 있습니다.', en: "It's in the hold." },
      { ko: '좌현쪽에 있습니다.', en: "It's on the port side." },
      { ko: '우현쪽에 있습니다.', en: "It's on the starboard side." },
      { ko: '중앙에 있습니다.', en: "It's at the center." },
      { ko: '선수쪽입니다.', en: "It's toward the bow." },
      { ko: '선미쪽입니다.', en: "It's toward the stern." },
      { ko: '20피트 짝꿍 슬롯입니다.', en: "This is a twin slot for two 20-footers." },
      { ko: '40피트 슬롯 위에 있습니다.', en: "It's on the 40-foot slot." },
    ],
  },
  {
    id: 'reefer',
    label: '리퍼',
    icon: '❄️',
    items: [
      { ko: '리퍼 몇 대 있습니까?', en: "How many reefers are on board?" },
      { ko: '설정 온도가 몇 도입니까?', en: "What is the set temperature?" },
      { ko: '영하 18도입니다.', en: "Minus eighteen degrees Celsius." },
      { ko: '영하 25도입니다.', en: "Minus twenty-five degrees Celsius." },
      { ko: '플러스 4도입니다.', en: "Plus four degrees Celsius." },
      { ko: '온도 기록을 받을 수 있을까요?', en: "Could I get the temperature log?" },
      { ko: '전원이 꺼져 있습니다.', en: "The power is off." },
      { ko: '플러그가 빠져 있습니다.', en: "The plug is disconnected." },
      { ko: '알람이 울리고 있습니다.', en: "The alarm is on." },
      { ko: '실제 온도가 설정값과 다릅니다.', en: "The actual temperature differs from the set point." },
      { ko: 'PTI 점검 결과 이상 없습니까?', en: "Are there any issues with the PTI result?" },
      { ko: '이 리퍼는 온도가 입력되지 않았습니다.', en: "The temperature for this reefer is not entered." },
      { ko: '온도를 알려주십시오.', en: "Please tell me the temperature." },
    ],
  },
  {
    id: 'special',
    label: '특수화물',
    icon: '🛢️',
    items: [
      { ko: '플랫랙 화물이 규격을 초과합니다.', en: "The flat rack cargo is over-dimensional." },
      { ko: '오버폭/오버하이트입니까?', en: "Is it over-width or over-height?" },
      { ko: '치수를 알려주세요.', en: "Please tell me the dimensions." },
      { ko: '오픈탑은 타폴린으로 덮여 있습니까?', en: "Is the open top covered with a tarpaulin?" },
      { ko: '라싱 상태가 어떻습니까?', en: "How is the lashing condition?" },
      { ko: '라싱이 풀려 있습니다.', en: "The lashing is loose." },
      { ko: '추가 고박이 필요합니다.', en: "Additional lashing is required." },
      { ko: '위험물 IMDG 클래스가 무엇입니까?', en: "What is the IMDG class?" },
      { ko: 'UN 번호가 무엇입니까?', en: "What is the UN number?" },
      { ko: '위험물은 격리해야 합니다.', en: "Dangerous goods must be segregated." },
      { ko: 'MSDS가 있습니까?', en: "Do you have the MSDS?" },
      { ko: '화기 엄금입니다.', en: "No open flames allowed." },
    ],
  },
  {
    id: 'crane',
    label: '크레인 작업',
    icon: '🏗️',
    items: [
      { ko: '시간당 작업량이 어떻습니까?', en: "What is the productivity per hour?" },
      { ko: '시간당 25무브입니다.', en: "Twenty-five moves per hour." },
      { ko: '크레인이 고장났습니다.', en: "The crane has broken down." },
      { ko: '작업 중지하겠습니다.', en: "We will stop the operation." },
      { ko: '잠시 대기해 주세요.', en: "Please stand by for a moment." },
      { ko: '작업 재개합니다.', en: "We are resuming the operation." },
      { ko: '비 때문에 작업 중단합니다.', en: "Operation is suspended due to rain." },
      { ko: '바람 때문에 작업 중단합니다.', en: "Operation is suspended due to wind." },
      { ko: '다음 작업은 언제 시작합니까?', en: "When will the next operation start?" },
      { ko: '갠트리 위치를 옮겨주세요.', en: "Please move the gantry position." },
    ],
  },
  {
    id: 'xray',
    label: 'X-RAY/세관',
    icon: '🔍',
    items: [
      { ko: '이 컨테이너는 X-RAY 대상입니다.', en: "This container is subject to X-RAY inspection." },
      { ko: 'X-RAY 컨테이너는 몇 대입니까?', en: "How many containers need X-RAY?" },
      { ko: '별도로 적치해 주세요.', en: "Please stack them separately." },
      { ko: '세관 검사가 필요합니다.', en: "Customs inspection is required." },
      { ko: '검사 후 반출됩니다.', en: "It will be released after inspection." },
      { ko: '검역 대상 컨테이너입니다.', en: "This is subject to quarantine inspection." },
    ],
  },
  {
    id: 'safety',
    label: '안전',
    icon: '🦺',
    items: [
      { ko: '위험합니다! 비키세요!', en: "Watch out! Stand back!" },
      { ko: '위에서 작업 중입니다.', en: "Work is in progress overhead." },
      { ko: '안전모를 착용하세요.', en: "Please wear your helmet." },
      { ko: '통로를 막지 마세요.', en: "Please don't block the passage." },
      { ko: '여기는 출입 금지 구역입니다.', en: "This is a restricted area." },
      { ko: '비상시 어디로 대피합니까?', en: "Where is the muster station in case of emergency?" },
      { ko: '사고가 났습니다.', en: "There has been an accident." },
      { ko: '응급처치가 필요합니다.', en: "We need first aid." },
      { ko: '병원에 가야 합니다.', en: "We need to go to the hospital." },
      { ko: '구조 요청 부탁드립니다.', en: "Please call for help." },
    ],
  },
  {
    id: 'closing',
    label: '마무리',
    icon: '✅',
    items: [
      { ko: '양하 완료됐습니다.', en: "Discharging is completed." },
      { ko: '선적 완료됐습니다.', en: "Loading is completed." },
      { ko: '총 몇 본 작업했습니까?', en: "How many boxes were handled in total?" },
      { ko: '리포트에 사인 부탁드립니다.', en: "Please sign the report." },
      { ko: '손상 컨테이너 목록입니다.', en: "This is the list of damaged containers." },
      { ko: '미양하 컨테이너 목록입니다.', en: "This is the list of remaining containers." },
      { ko: '수고하셨습니다.', en: "Thank you for your hard work." },
      { ko: '안전한 항해 되십시오.', en: "Have a safe voyage." },
      { ko: '다음에 또 뵙겠습니다.', en: "See you next time." },
    ],
  },
];

// ============================================================================
// 음성 합성 훅
// ============================================================================
function useSpeech() {
  const [voices, setVoices] = useState([]);
  const [supported, setSupported] = useState(true);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSupported(false);
      return;
    }
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      const en = all.filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
      setVoices(en);
      if (en.length > 0 && !selectedVoiceURI) {
        // 미국 영어 우선, 없으면 영국, 없으면 첫 번째
        const usVoice = en.find((v) => v.lang.toLowerCase().startsWith('en-us'));
        const gbVoice = en.find((v) => v.lang.toLowerCase().startsWith('en-gb'));
        setSelectedVoiceURI((usVoice || gbVoice || en[0]).voiceURI);
      }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
    // eslint-disable-next-line
  }, []);

  const speak = (text, rate = 1.0) => {
    if (!supported) {
      alert('이 브라우저는 음성 출력을 지원하지 않습니다. 크롬 또는 사파리 최신 버전을 이용해 주세요.');
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = rate;
    utter.pitch = 1.0;
    utter.volume = 1.0;
    const voice = voices.find((v) => v.voiceURI === selectedVoiceURI);
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  };

  const stop = () => {
    if (supported) window.speechSynthesis.cancel();
  };

  return { speak, stop, voices, supported, selectedVoiceURI, setSelectedVoiceURI };
}

// ============================================================================
// 메인 컴포넌트 (M3.5.6: 검수앱 통합 - 모달로 사용)
// ============================================================================
export default function ContainerPhrasebook({ open = true, onClose }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [rate, setRate] = useState(1.0);
  const [favorites, setFavorites] = useState(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const { speak, stop, voices, supported, selectedVoiceURI, setSelectedVoiceURI } = useSpeech();

  const handleSpeak = (id, text) => {
    setPlayingId(id);
    speak(text, rate);
    // 대략적인 재생 시간 추정
    const estMs = Math.max(1500, text.length * 80 / rate);
    setTimeout(() => setPlayingId(null), estMs);
  };

  const handleStop = () => {
    stop();
    setPlayingId(null);
  };

  const toggleFav = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 모든 항목에 고유 ID 부여 + 카테고리 메타 포함
  const allItems = useMemo(() => {
    const list = [];
    PHRASE_DATA.forEach((cat) => {
      cat.items.forEach((item, idx) => {
        list.push({
          ...item,
          id: `${cat.id}-${idx}`,
          categoryId: cat.id,
          categoryLabel: cat.label,
          categoryIcon: cat.icon,
        });
      });
    });
    return list;
  }, []);

  const filteredItems = useMemo(() => {
    let items = allItems;
    if (activeCategory === 'fav') {
      items = items.filter((i) => favorites.has(i.id));
    } else if (activeCategory !== 'all') {
      items = items.filter((i) => i.categoryId === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (i) => i.ko.toLowerCase().includes(q) || i.en.toLowerCase().includes(q)
      );
    }
    return items;
  }, [allItems, activeCategory, search, favorites]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 overflow-y-auto" onClick={onClose}>
    <div className="min-h-screen bg-slate-900 text-slate-100" onClick={e => e.stopPropagation()} style={{ fontFamily: "'-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Pretendard', system-ui, sans-serif" }}>
      {/* M3.5.6: 닫기 버튼 (검수앱 모달용) */}
      {onClose && (
        <button onClick={onClose}
          className="fixed top-2 right-2 z-50 w-10 h-10 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-slate-300 text-xl font-bold shadow-lg">
          ×
        </button>
      )}
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-20 bg-slate-900 border-b-2 border-yellow-500/40 shadow-lg">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs tracking-widest text-yellow-400 font-bold">PYEONGTAEK PORT · TALLY</div>
              <h1 className="text-lg font-black text-slate-50">컨테이너 검수 영어 회화</h1>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-11 h-11 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-yellow-400 text-xl"
              aria-label="설정"
            >
              ⚙
            </button>
          </div>

          {/* 검색 */}
          <div className="relative mb-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="한국어 또는 영어로 검색..."
              className="w-full h-12 px-4 pr-10 bg-slate-800 border-2 border-slate-700 focus:border-yellow-500 focus:outline-none rounded-lg text-base text-slate-100 placeholder-slate-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>

          {/* 설정 패널 */}
          {showSettings && (
            <div className="mb-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
              {/* 음성 속도 */}
              <div className="mb-3">
                <div className="text-xs font-bold text-yellow-400 mb-2 tracking-wider">재생 속도</div>
                <div className="flex gap-2">
                  {[
                    { v: 0.7, l: '느리게' },
                    { v: 0.85, l: '약간 느리게' },
                    { v: 1.0, l: '보통' },
                    { v: 1.15, l: '빠르게' },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => setRate(opt.v)}
                      className={`flex-1 h-10 text-xs font-semibold rounded-md transition-colors ${
                        rate === opt.v
                          ? 'bg-yellow-500 text-slate-900'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
              {/* 음성 선택 */}
              {voices.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-yellow-400 mb-2 tracking-wider">
                    음성 선택 ({voices.length}개 사용 가능)
                  </div>
                  <select
                    value={selectedVoiceURI}
                    onChange={(e) => setSelectedVoiceURI(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-100"
                  >
                    {voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {!supported && (
                <div className="mt-2 p-2 bg-red-900/40 border border-red-700 rounded text-xs text-red-200">
                  이 브라우저는 음성 합성을 지원하지 않습니다. Chrome 또는 Safari 최신 버전을 사용해 주세요.
                </div>
              )}
            </div>
          )}

          {/* 카테고리 칩 (가로 스크롤) */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
            <CategoryChip
              active={activeCategory === 'all'}
              onClick={() => setActiveCategory('all')}
              label="전체"
              icon="📋"
              count={allItems.length}
            />
            <CategoryChip
              active={activeCategory === 'fav'}
              onClick={() => setActiveCategory('fav')}
              label="즐겨찾기"
              icon="⭐"
              count={favorites.size}
            />
            {PHRASE_DATA.map((cat) => (
              <CategoryChip
                key={cat.id}
                active={activeCategory === cat.id}
                onClick={() => setActiveCategory(cat.id)}
                label={cat.label}
                icon={cat.icon}
                count={cat.items.length}
              />
            ))}
          </div>
        </div>
      </header>

      {/* 결과 카운트 */}
      <div className="px-4 pt-3 pb-1 text-xs text-slate-400">
        {filteredItems.length}개 문장
        {activeCategory === 'fav' && favorites.size === 0 && (
          <span className="ml-2 text-slate-500">— ⭐ 별 아이콘을 눌러 즐겨찾기에 추가</span>
        )}
      </div>

      {/* 문장 카드 리스트 */}
      <main className="px-4 pb-32 pt-2 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            <div className="text-5xl mb-3">🔎</div>
            <div className="text-sm">검색 결과가 없습니다.</div>
          </div>
        ) : (
          filteredItems.map((item) => (
            <PhraseCard
              key={item.id}
              item={item}
              isFav={favorites.has(item.id)}
              isPlaying={playingId === item.id}
              onSpeak={() => handleSpeak(item.id, item.en)}
              onToggleFav={() => toggleFav(item.id)}
              showCategory={activeCategory === 'all' || activeCategory === 'fav'}
            />
          ))
        )}
      </main>

      {/* 하단 정지 버튼 (재생 중일 때만) */}
      {playingId && (
        <div className="fixed bottom-4 left-4 right-4 z-30">
          <button
            onClick={handleStop}
            className="w-full h-14 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl shadow-2xl flex items-center justify-center gap-2 text-base"
          >
            <span className="text-xl">⏹</span> 재생 중지
          </button>
        </div>
      )}
    </div>
    </div>
  );
}

// ============================================================================
// 카테고리 칩
// ============================================================================
function CategoryChip({ active, onClick, label, icon, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 h-10 px-3 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
        active
          ? 'bg-yellow-500 text-slate-900 shadow-md shadow-yellow-500/30'
          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      <span
        className={`text-xs px-1.5 py-0.5 rounded ${
          active ? 'bg-slate-900/20 text-slate-900' : 'bg-slate-900 text-slate-400'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

// ============================================================================
// 문장 카드
// ============================================================================
function PhraseCard({ item, isFav, isPlaying, onSpeak, onToggleFav, showCategory }) {
  return (
    <div
      className={`bg-slate-800 rounded-xl border-2 overflow-hidden transition-all ${
        isPlaying ? 'border-yellow-500 shadow-lg shadow-yellow-500/20' : 'border-slate-700'
      }`}
    >
      <div className="p-4">
        {/* 상단: 카테고리 + 즐겨찾기 */}
        <div className="flex items-start justify-between mb-2">
          {showCategory ? (
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <span>{item.categoryIcon}</span>
              <span>{item.categoryLabel}</span>
            </div>
          ) : (
            <div />
          )}
          <button
            onClick={onToggleFav}
            className="-mt-1 -mr-1 w-9 h-9 flex items-center justify-center text-xl"
            aria-label="즐겨찾기"
          >
            <span className={isFav ? 'text-yellow-400' : 'text-slate-600'}>★</span>
          </button>
        </div>

        {/* 한국어 */}
        <div className="text-base text-slate-100 mb-2 leading-snug font-medium">{item.ko}</div>

        {/* 영어 */}
        <div className="text-base text-yellow-300/90 mb-3 leading-snug" style={{ fontFamily: "'Charter', 'Georgia', serif" }}>
          {item.en}
        </div>

        {/* 재생 버튼 (큰 버튼) */}
        <button
          onClick={onSpeak}
          className={`w-full h-14 rounded-lg font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 ${
            isPlaying
              ? 'bg-yellow-500 text-slate-900 animate-pulse'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-100 border-2 border-slate-600 hover:border-yellow-500/50'
          }`}
        >
          <span className="text-xl">{isPlaying ? '🔊' : '▶'}</span>
          <span>{isPlaying ? '재생 중...' : '들려주기'}</span>
        </button>
      </div>
    </div>
  );
}
