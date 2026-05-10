// 사용자 매뉴얼 (M3.2 → M5.0: 영어회화집 흡수)
// 검수원 초보 사용자를 위한 인앱 도움말
// 카테고리 탭으로 구성, 실제 사용 예시 50+개
import React, { useState } from 'react';
import { X, Search, MessageCircle, Mic, Container, Anchor, Truck, AlertTriangle, MapPin, Settings, Check, Languages } from 'lucide-react';
import ContainerPhrasebook from './ContainerPhrasebook.jsx';

const TABS = [
  { id: 'basic',    label: '기본',     icon: Search },
  { id: 'count',    label: '개수',     icon: Container },
  { id: 'progress', label: '진행',     icon: Check },
  { id: 'bay',      label: '베이',     icon: MapPin },
  { id: 'capacity', label: '용량',     icon: Container },
  { id: 'port',     label: '항구',     icon: Anchor },
  { id: 'special',  label: '특수화물', icon: AlertTriangle },
  { id: 'voice',    label: '음성',     icon: Mic },
  { id: 'ai',       label: 'AI 질문',  icon: MessageCircle },
  { id: 'twin',     label: '트윈',     icon: Truck },
  { id: 'tips',     label: '팁',       icon: Settings },
  { id: 'english',  label: '영어회화', icon: Languages },  // M5.0: 헤더에서 흡수
];

const CONTENT = {
  basic: [
    {
      title: '🔍 기본 검색 — 컨번호 끝 4자리',
      examples: [
        { q: '4777', a: '컨번호 끝 4자리가 4777인 컨테이너 1개 표시 (실번호/위치/X-RAY 자동 표시)' },
        { q: '777',  a: '끝 3자리가 777인 컨 검색 (여러 개면 리스트)' },
        { q: '47',   a: '끝 2자리 매칭 (좁히려면 더 입력)' },
      ],
    },
    {
      title: '🔍 컨번호 + 추가 조건',
      examples: [
        { q: '4777 풀',         a: '4777 중 Full만' },
        { q: '4777 위치',       a: '4777의 위치(베이-row-tier) 답변' },
        { q: '4777 어디',       a: '위와 동일' },
      ],
    },
    {
      title: '⚙️ 검색 결과 종류',
      examples: [
        { q: '결과 1개',        a: '🟡 큰 카드(BigResultCard) — 실번호 거대 표시 + 검수완료 버튼' },
        { q: '결과 여러 개',    a: '작은 카드 리스트 (탭하면 상세)' },
        { q: '통계 질문',       a: '🔵 시안색 큰 숫자 카드 (몇 대)' },
        { q: '베이/항구/구역',  a: '🟢 에메랄드색 즉답 카드 (M3.2 신규)' },
        { q: '자유 질문',       a: '🟣 보라색 AI 카드 (Gemini 호출)' },
      ],
    },
  ],

  count: [
    {
      title: '📊 사이즈/상태별 카운트',
      examples: [
        { q: '20피트 몇대',       a: '20피트 컨 총수' },
        { q: '20풀 몇대',         a: '20피트 Full만' },
        { q: '20엠티 몇대',       a: '20피트 Empty만' },
        { q: '40피트 몇대',       a: '40피트 컨 총수' },
        { q: '45피트 몇대',       a: '45피트 컨 총수' },
        { q: '40풀 몇대',         a: '40피트 Full만' },
        { q: '40엠티 몇대',       a: '40피트 Empty만' },
        { q: '풀 몇대',           a: '전체 Full' },
        { q: '엠티 몇대',         a: '전체 Empty' },
      ],
    },
    {
      title: '📊 특수화물 카운트',
      examples: [
        { q: '리퍼 몇대',         a: '리퍼(RF) 컨 수' },
        { q: '위험물 몇대',       a: 'DG 컨 수' },
        { q: 'XRAY 몇대',         a: 'X-RAY 대상 수' },
        { q: 'FR 몇대',           a: '플랫랙 수' },
        { q: 'OT 몇대',           a: '오픈탑 수' },
        { q: '탱크 몇대',         a: '탱크 수' },
      ],
    },
    {
      title: '📊 모드별 (M3.2 신규)',
      examples: [
        { q: '양하 몇대',         a: '양하 모드 전체' },
        { q: '선적 몇대',         a: '선적 모드 전체' },
        { q: '양하 리퍼 몇대',    a: '양하 중 리퍼만' },
        { q: '선적 위험물 몇대',  a: '선적 중 DG만' },
      ],
    },
  ],

  bay: [
    {
      title: '📍 베이 단독 질문 (M3.2 신규)',
      examples: [
        { q: '16번 베이',         a: '16번 베이 통계 카드 (총수/F·E/갑판·창내/총중량/특수화물)' },
        { q: '베이 16',           a: '동일' },
        { q: '20번베이',          a: '동일' },
        { q: '100번 베이',        a: '큰 베이도 동일' },
        { q: '1번 베이',          a: '한 자리 베이도 인식' },
      ],
    },
    {
      title: '📍 베이 + 조건 결합 (M3.2 신규)',
      examples: [
        { q: '16번 베이 풀 몇대',     a: '16번 베이 Full 카운트' },
        { q: '20번 베이 위험물',      a: '20번 베이 DG 컨 리스트' },
        { q: '16번 베이 갑판',        a: '16번 베이 중 tier≥80' },
        { q: '20번 베이 창내',        a: '20번 베이 중 tier<80' },
        { q: '16번 베이 무게 합',     a: '16번 베이 총중량 합계' },
        { q: '16번 베이 위치',        a: '16번 베이 컨들의 위치 리스트' },
        { q: '16번 베이 리퍼',        a: '16번 베이 리퍼만' },
      ],
    },
    {
      title: '📐 단수/바닥/꼭대기 (M3.3 신규)',
      examples: [
        { q: '16번 베이 몇단 쌓았어', a: 'row별 최소/최대/평균 단수 + 가장 높이 쌓인 tier' },
        { q: '몇단 쌓았지',           a: '전체 베이 단수 분석 + TOP 10' },
        { q: '바닥에 몇개 있어',      a: '각 row의 최저 tier 컨 수' },
        { q: '홀드 바닥에 몇개',      a: '홀드(tier<80) 바닥' },
        { q: '갑판 꼭대기 몇대',      a: '갑판(tier≥80) 가장 높이 쌓인 컨' },
        { q: '꼭대기 어디',           a: '베이/row별 최고 tier 컨 위치' },
      ],
    },
    {
      title: '📊 베이별 분포 (M3.3 신규)',
      examples: [
        { q: '베이별 갯수',           a: '모든 베이 분포 (베이당 컨 수, F/E, 완료수)' },
        { q: '베이마다 몇대',         a: '동일' },
        { q: '베이별 풀 분포',        a: '베이별 Full만 분포' },
      ],
    },
    {
      title: '📦 자리 뺏긴 컨 이동 (M4.9f 신규, 선적 모드 전용)',
      examples: [
        { q: '언제 보임',            a: '선적 모드 + 다른 컨이 자기 계획 자리를 점유한 컨이 있을 때, 베이 탭 상단에 노란 박스 자동 표시' },
        { q: '1) 카드 우측 [📦 이동]', a: '눌러서 이동 모드 진입 → 카드 노랑 하이라이트(선택중)' },
        { q: '2) 안내 바 등장',       a: '화면 상단 큰 노란 바: "본위치 NN/NN/NN → 빈 셀을 누르세요"' },
        { q: '3) 빈 셀 누르기',       a: '베이 그리드에서 노랑 테두리 + 📦+ 마크가 뜬 빈 셀 클릭 → 그 자리로 저장' },
        { q: '40ft/20ft 자동 매칭',   a: '본위치가 짝수 베이(40ft)면 짝수 빈 셀만, 홀수(20ft)면 홀수 빈 셀만 활성화' },
        { q: '다른 베이로 옮기려면',  a: '베이 페이지를 스크롤하거나 베이 점프(▼)로 이동 — 노란 안내 바는 유지됨' },
        { q: '취소',                  a: '안내 바 우측 [취소] 버튼, 또는 [📦 이동] 버튼 한 번 더 누름' },
        { q: '직접 입력 경로 (기존)', a: '카드 본문(왼쪽 큰 영역) 클릭 → 컨테이너 모달 → "수정 위치 입력" — 베이/열/단 수동 입력' },
      ],
    },
  ],

  capacity: [
    {
      title: '📦 베이 적재 용량 (M3.3 신규)',
      examples: [
        { q: '28번 베이에 몇개 실을 수 있어', a: '베이 적재 분석 + 짝꿍 베이 (트윈) + 합산' },
        { q: '20번 베이 용량',                a: '동일' },
        { q: '16번 베이 수용 가능',           a: '동일' },
        { q: '실을 수 있어',                  a: '전체 빈 슬롯 + TOP 10 베이' },
      ],
    },
    {
      title: '🟢 빈자리 (M3.3 신규)',
      examples: [
        { q: '빈자리 어디',           a: '전체 빈 슬롯 분포' },
        { q: '16번 베이 빈자리',      a: '특정 베이 빈 슬롯' },
        { q: '바닥 빈자리는',         a: '각 row의 최저 tier 중 비어있는 곳' },
        { q: '홀드 바닥 빈자리',      a: '홀드 바닥의 빈 슬롯' },
      ],
    },
    {
      title: '⚠️ 용량 답변 주의사항',
      examples: [
        { q: '슬롯 수 기준',  a: '"이번 항차에 컨이 적재된 적 있는 위치" 기준 (도면 X)' },
        { q: '짝꿍 베이',     a: '짝수 베이는 양옆 홀수와 트윈 가능 → 합산 표시' },
        { q: '실제 도면 용량', a: '선박 도면 별도 확인 필요 (경고 메시지 포함)' },
      ],
    },
  ],

  progress: [
    {
      title: '✅ 완료 작업 (M3.3 신규)',
      examples: [
        { q: '선적 완료 몇대',         a: '선적 모드 완료 / 전체 + 진행률' },
        { q: '양하 완료',              a: '양하 모드 완료 분석' },
        { q: '18번 베이 들어갔지',    a: '18번 베이 완료 컨 + 비율' },
        { q: '18번 베이 실은',         a: '동일' },
        { q: '몇개 쌓았어',            a: '쌓은(완료) 컨 수' },
        { q: '오늘 끝낸 거',           a: '완료된 컨 (전체 모드)' },
      ],
    },
    {
      title: '⏳ 미완료 작업 (M3.3 신규)',
      examples: [
        { q: '양하분 몇개 남았어',     a: '양하 미완료 / 전체 + 비율' },
        { q: '몇개 더 들어가야 돼',    a: '전체 미완료 (남은 작업)' },
        { q: '선적 더 해야',           a: '선적 미완료' },
        { q: '얼마나 남았어',          a: '전체 남은 작업' },
        { q: '미완료 컨',              a: '동일' },
        { q: '18번 베이 남았어',       a: '18번 베이 미완료' },
      ],
    },
    {
      title: '🎯 조건 결합 진행 상황',
      examples: [
        { q: '리퍼 남은 거',           a: '리퍼 미완료' },
        { q: '갑판 양하 남은',         a: '갑판 + 양하 미완료' },
        { q: '대련발 들어간 거',       a: '대련 출발 완료된 것' },
        { q: '위험물 남은',            a: '위험물 미완료' },
        { q: '홀드 바닥에 몇개 남았어', a: '홀드 + 바닥 미완료 (M3.3 복합)' },
      ],
    },
    {
      title: '📊 답변 형식',
      examples: [
        { q: '진행률 표시',            a: '"완료 N대 / 전체 N대 (XX%)" 형식' },
        { q: '미리보기',               a: '결과 처음 10대 위치 표시' },
        { q: '전체 컨텍스트',          a: '같은 조건의 전체 N대를 분모로 비교' },
      ],
    },
  ],

  port: [
    {
      title: '🌐 한국어 항구명으로 검색 (M3.2 신규)',
      examples: [
        { q: '대련에서 온 컨',        a: 'POL=CNDLC' },
        { q: '대련 발 양하',          a: 'POL=CNDLC, 양하 모드' },
        { q: '청도행 몇대',           a: 'POD=CNQDG' },
        { q: '청도 가는 컨',          a: '동일' },
        { q: '위해 출발',             a: 'POL=CNWEI' },
        { q: '상해행 위치',           a: 'POD=CNSHA 컨 위치 리스트' },
        { q: '평택 양하',             a: 'POD=KRPTK + 양하' },
      ],
    },
    {
      title: '🌐 항구명만 (양쪽 모두 검색)',
      examples: [
        { q: '대련',                  a: 'POL 또는 POD에 CNDLC 있는 컨' },
        { q: '청도',                  a: '동일하게 CNQDG' },
      ],
    },
    {
      title: '🌐 영문 코드도 가능',
      examples: [
        { q: 'CNDLC 몇대',            a: '대련 = CNDLC 직접 입력' },
        { q: 'PTK 양하',              a: '평택 줄임' },
        { q: 'KRPTK 행',              a: '평택행 (POD)' },
      ],
    },
    {
      title: '🌐 지원 항구 목록',
      examples: [
        { q: '한국',  a: '평택 인천 부산 광양 울산 여수 군산 목포' },
        { q: '중국',  a: '대련 청도 위해 상해 천진 닝보 연태 연운항 하문 광주 심천' },
        { q: '일본',  a: '도쿄 요코하마 오사카 나고야 고베 하카타' },
        { q: '동남아', a: '카오슝 싱가포르 호치민 하이퐁 방콕 클랑 마닐라 자카르타' },
        { q: '미주/유럽', a: '엘에이(LA) 롱비치 뉴욕 시애틀 함부르크 로테르담' },
      ],
    },
  ],

  special: [
    {
      title: '❄️ 리퍼 (온도 검색)',
      examples: [
        { q: '리퍼',                  a: '리퍼 전체' },
        { q: '리퍼 영하 18도',        a: '-18°C' },
        { q: '리퍼 -25도',            a: '-25°C' },
        { q: '리퍼 마이너스 20도',    a: '-20°C' },
        { q: '리퍼 영상 5도',         a: '+5°C' },
        { q: '리퍼 0도',              a: '0°C' },
        { q: '리퍼 어디',             a: '리퍼 컨 위치 리스트' },
      ],
    },
    {
      title: '☢️ 위험물 (DG)',
      examples: [
        { q: '위험물',                a: 'DG 전체' },
        { q: '위험물 어디',           a: 'DG 위치 리스트' },
        { q: '클래스 3',              a: 'DG class 3 (인화성 액체)' },
        { q: '클래스 9',              a: 'DG class 9 (기타)' },
        { q: '3급 위험물',            a: 'class 3과 동일' },
        { q: 'UN1234',                a: '특정 UN 번호' },
        { q: 'UN 3082',               a: '동일 (공백 OK)' },
      ],
    },
    {
      title: '🚧 X-RAY',
      examples: [
        { q: 'XRAY 몇대',             a: 'X-RAY 대상 수 (양하만)' },
        { q: '엑스레이',              a: '동일' },
        { q: 'XRAY 위치',             a: 'X-RAY 컨 위치 리스트' },
      ],
    },
    {
      title: '📦 기타 특수화물',
      examples: [
        { q: 'FR',     a: '플랫랙' },
        { q: 'OT',     a: '오픈탑' },
        { q: '탱크',   a: '탱크' },
        { q: 'OOG',    a: 'Out Of Gauge (FR/OT 포함)' },
      ],
    },
  ],

  voice: [
    {
      title: '🎤 음성 검색',
      examples: [
        { q: '🎤 버튼 누르고 "사칠칠칠"', a: '"4777" 인식 → 자동 검색' },
        { q: '🎤 "공일오공"',              a: '"0150" 인식' },
        { q: '🎤 "이십번 베이"',           a: '"20번 베이" 인식' },
        { q: '🎤 "리퍼 몇 대"',           a: '리퍼 카운트 즉답' },
      ],
    },
    {
      title: '🔊 음성 답변 (자동)',
      examples: [
        { q: '결과 1개',          a: '컨번호+위치+실번호+특수정보 음성 안내' },
        { q: '통계',              a: '"20피트 풀 47대" 식으로 안내' },
        { q: '베이 답변 (M3.2)',  a: '"16번 베이 24대, Full 18 Empty 4..." 자동' },
        { q: '좌표 (M3.1)',       a: '"16-01-86" → "십육번 베이 공일에 팔육"' },
      ],
    },
    {
      title: '🔊 음성 ON/OFF',
      examples: [
        { q: '검색창 오른쪽 🔊',   a: '탭하면 음성 안내 OFF (🔇로 변함)' },
        { q: '한 번 더 탭',        a: '다시 ON' },
      ],
    },
  ],

  ai: [
    {
      title: '🤖 AI 질문 버튼 (Gemini)',
      examples: [
        { q: 'AI 버튼 표시 조건', a: '4글자 이상 입력 + 통계 키워드("몇대") 아닐 때' },
        { q: '호출 방식',         a: '검수원이 명시적으로 ★AI★ 버튼 탭할 때만 (자동 호출 X)' },
        { q: '비용',              a: '무료 (분당 15회, 일 1500회)' },
      ],
    },
    {
      title: '🤖 AI에 적합한 질문 (정말 자유 형식)',
      examples: [
        { q: '이 선박 평소 양하 몇 대?',          a: '선박 라이브러리 평균' },
        { q: '위험물 3/1234와 5/2468 트윈 가능?', a: 'IMDG 격리 판단' },
        { q: '검수 마무리에 대한 조언',           a: 'AI 자유 답변' },
      ],
    },
    {
      title: '⚠️ AI보다 즉답이 더 정확한 경우',
      examples: [
        { q: '20피트 몇대',       a: '→ 즉답 카드 (AI 호출 X)' },
        { q: '16번 베이',         a: '→ 즉답 카드 (M3.2)' },
        { q: '대련에서 온 컨',    a: '→ 즉답 카드 (M3.2)' },
        { q: '갑판 위험물',       a: '→ 즉답 카드 (M3.2)' },
        { q: '리퍼 영하 18도',    a: '→ 즉답 카드' },
      ],
    },
  ],

  twin: [
    {
      title: '🚛 트윈 모드 (20피트 두 개)',
      examples: [
        { q: '검색창 위 [트윈] 탭', a: '트윈 모드로 전환' },
        { q: '앞 컨 4자리 입력',    a: '자동으로 짝꿍 컨 찾아줌 (M2.5: 베이 자동 분석)' },
        { q: '예: 003 베이 컨 입력', a: '001 베이가 짝꿍 자동 추천' },
        { q: '둘 다 표시되면',      a: '같이 검수완료 처리 가능' },
      ],
    },
    {
      title: '🚛 트윈 짝꿍 알고리즘 (M2.5)',
      examples: [
        { q: '짝수 베이 있음',  a: '양옆 홀수 베이가 짝꿍' },
        { q: '짝수 베이 없음',  a: '통로 → 단독 처리 (트윈 X)' },
        { q: '이미 완료된 컨',  a: '짝 후보에서 자동 제외' },
      ],
    },
  ],

  tips: [
    {
      title: '🆕 M5.17 변경 사항 (2026-05) — 베이 화면 한 페이지 스크롤',
      examples: [
        { q: '베이 끼리 겹치지 않게 스냅', a: '베이 화면 스크롤 시 한 베이가 정확히 화면에 맞춰서 멈춤. 손가락 떼면 자동으로 가장 가까운 베이로 스냅. 이전: 두 베이가 조금씩 겹쳐서 표시됨' },
        { q: 'CSS scroll-snap',           a: '브라우저 기본 기능 사용. 부드럽게 동작하면서 메모리/배터리 영향 없음' },
      ],
    },
    {
      title: '🆕 M5.16 변경 사항 (2026-05) — 카고플랜 특수화물/X-RAY',
      examples: [
        { q: '카고플랜 인쇄 — 특수화물 표시', a: '베이 메인화면 [인쇄] → 카고 플랜에서 셀 안 글자가 강화됨. R(리퍼), r(엠티 리퍼), D(DG), F(FR), A(OT/Awkward), T(TK), E(엠티) — 각 셀 배경색도 종류별로 구분' },
        { q: '카고플랜 X-RAY 표시',         a: '평택 양하 X-RAY 대상 컨테이너는 노란 배경 + 우상단 ★ 마커. 이전엔 인쇄에 X-RAY 정보 빠져있었음' },
        { q: '범례 강화',                    a: '카고플랜 좌하단 범례에 Empty/Reefer/DG/FR/OT/TK/X-RAY 모두 추가됨' },
        { q: '베이 화면(BayPlan)',          a: '기존부터 X-RAY(보라 셀+ring), 특수화물(좌측 컬러바+우상단 큰 심볼) 표시되어 있음. 이번엔 변경 X' },
      ],
    },
    {
      title: '🆕 M5.15 변경 사항 (2026-05) — ATRP 매칭 fix',
      examples: [
        { q: '✅ ATRP / ATPR 같은 선박 인식', a: '평택항 일부 시스템 EDI에 ATRP 코드로 들어와도 ATPR(ATLANTIC PIONEER) 베이사전이 매칭됨. URL ATRP_2623E 같은 항차도 정상 매칭' },
        { q: '메인 화면 vs 인쇄 베이 불일치', a: 'M5.14까지 ATRP 코드는 매칭 실패 → 메인 화면은 EDI 폴백 패턴으로 잘못 표시. M5.15부터 두 화면 모두 정확한 21개 베이로 통일' },
      ],
    },
    {
      title: '🆕 M5.14 변경 사항 (2026-05) — PDF로 정확히 정정',
      examples: [
        { q: '✅ TMPZ 정정 → 21개',     a: '이전: 19개. PDF STOWAGE INSTRUCTION 검증 결과 BAY 5, 7도 정상 베이로 확인됨 (자동 추출에서 노이즈 처리됐던 케이스). 이제 ✅ 검증 배지' },
        { q: '✅ DJCT/S639 정정 → 22개', a: '이전: 71개 (잘못). PDF STOWAGE INSTRUCTION 검증 결과 일반 컨선 22개 베이가 정확. 80베이까지 가는 대형선이 아니었음. 이제 ✅ 검증 배지' },
        { q: '🟠 검토필요 배지 사라짐', a: 'M5.13의 needs-review 배지 → M5.14에서 모두 verified로 격상. PDF로 영구 검증' },
      ],
    },
    {
      title: '🆕 M5.13 변경 사항 (2026-05) — 4척 추가',
      examples: [
        { q: '✅ DPRT (PEGASUS PROTO)',           a: 'CASP 6.50, 29개 베이. 정확하게 추출됨' },
        { q: '✅ XTPG (XIN TAI PING)',            a: 'CASP 6.10, 20개 베이. delta=144 시퀀스로 정확하게 추출됨' },
        { q: '⚠️ DJCT/S639 (DONGJIN CONTINENTAL)', a: 'CASP 6.30, 71개 베이로 추출됨 (대형선 의심). 베이사전 위젯에 ⚠️ 검토필요 배지 표시 — 검수 시 실제 베이와 다르면 알려주세요' },
        { q: '⚠️ TMPZ (TIANHAI PINGZE)',          a: 'CASP 6.10, 19개 베이로 frequency 기반 추측. ⚠️ 검토필요 배지 표시. 정확한 베이 리스트 알려주시면 다음 hotfix에서 정정' },
        { q: '🟠 검토필요 배지',                   a: '자동 추출 정확도 낮은 선박. 베이사전 위젯에 표시됨. 작업 시 베이가 잘못되어 보이면 즉시 알려주세요' },
      ],
    },
    {
      title: '🆕 M5.12 변경 사항 (2026-05) — ATPR 추가',
      examples: [
        { q: 'ATPR ATLANTIC PIONEER 등록', a: 'CASP 6.10 형식의 ATPR.def 분석해 v2 사전에 추가. 21개 베이 (선원건물 17-18 통로). 매칭 키: 코드 ATPR 또는 콜사인 D5RR5' },
        { q: '다른 미등록 선박 추가 방법', a: '자료 탭에서 EDI 업로드 시 .def 파일 같이 끌어 놓으면 자동으로 사용자 사전(localStorage)에 등록 → 그 기기에서 즉시 매칭. 영구 등록 원하시면 .def 파일 보내주세요' },
      ],
    },
    {
      title: '🆕 M5.11 변경 사항 (2026-05) — 베이사전 매칭 강화 + 자료 재처리',
      examples: [
        { q: '🔄 EDI 자료 재처리',     a: '자료 탭 → EDI 카드에 [🔄 EDI 원본으로 자료 재처리] 버튼. 앱 업데이트 후 자료 재업로드 없이 새 로직으로 EDI 다시 파싱. 검수 입력(실번호/사진/완료/X-RAY)은 보존' },
        { q: '💾 EDI 원본 자동 보관',  a: '모든 EDI 업로드 시 원본 텍스트가 Firebase에 보관됨. 미래 앱 업데이트 시 [🔄 재처리]로 즉시 적용 가능' },
        { q: '📚 베이사전 매칭 강화',  a: 'IMO + 콜사인 + 4글자 코드 + 선박명 fuzzy 4가지 매칭 시도. 기존엔 선박명 fuzzy만 시도해서 자주 실패하던 문제 해결' },
        { q: '📚 베이사전 진단 표시',  a: '베이 탭 상단 베이사전 위젯 펼치면 어떤 키로 매칭됐는지(IMO/콜사인/이름) 표시. 매칭 실패 시 명확한 안내' },
      ],
    },
    {
      title: '🆕 M5.1 변경 사항 (2026-05) — 마감 점검 + 보관함',
      examples: [
        { q: '🏁 작업 마감 점검',     a: '항차 진입 시 [📤 작업 보고] 옆 [🏁 마감 점검] 버튼. 미완 항목(미완료/리퍼/ISO403/X-RAY/자리뺏긴/풀씰 미입력)을 한 화면에 표시. 항목 클릭 시 해당 탭으로 자동 점프' },
        { q: '🏁 모두 0이면',         a: '큰 ✅ "마감 가능" 화면 — 안전하게 작업 종료 OK' },
        { q: '📦 보관함 (선적 전용)', a: '베이 탭 상단에 자동 표시 — bay_actual="__STG__" 로 마킹된 컨들 모음. 자리 뺏긴 컨, 잘못 적치된 컨 임시 보관용' },
        { q: '📦 보관함 → 베이 그리드', a: '카드 우측 [📦 이동] 버튼 → 안내 바 → 빈 셀 클릭 (자리 뺏긴 컨과 같은 흐름)' },
        { q: '📦 보관함 일괄 복원',   a: '헤더 [↻ 일괄 복원] → 모든 보관 컨이 계획 위치로 돌아감 (확인 모달)' },
        { q: '🔲 영역 선택 (PC + 선적 전용)', a: '베이 탭 컨트롤 바 [🔲 선택] 토글 → 컨 셀 여러 개 클릭 → 파란 ring으로 선택 표시' },
        { q: '🔲 → 보관함으로',       a: '선택 진행 바의 [📦 보관함으로] 버튼 → 선택분 한 번에 보관함으로 이동' },
        { q: '베이사전 fix',          a: '"BAY 01" 중복 표시 버그 수정 (dictBayList 중복 제거)' },
      ],
    },
    {
      title: '🆕 M5.0 변경 사항 (2026-05)',
      examples: [
        { q: '항차 진입 즉시',          a: '진행률 + 리퍼/X-RAY/ISO403/자리뺏긴 등 주의 항목이 한 카드에 요약 표시 (통계 탭 안 가도 됨)' },
        { q: '탭 명칭 정리',            a: '"검색 🎤" → "🎤 자연어", "보고서" → "결과", "자료" → "업로드"' },
        { q: '베이 컨트롤 바',          a: '줌 그룹 컴팩트화 (3버튼 합침), 인쇄 2개 → [🖨️ 인쇄 ▾] 드롭다운 1개' },
        { q: '영어회화집 위치 변경',    a: '헤더 [🌐 Languages] 버튼 제거 → 도움말의 [영어회화] 탭에서 열기' },
        { q: '죽은 코드 정리',          a: 'MixerUploadModal 삭제 (번들 -27KB) — 사용자 인터페이스에는 영향 없음' },
        { q: '계속 사용 가능',          a: 'M4.9f의 자리 뺏긴 컨 [📦 이동] → 빈 셀 클릭 그대로' },
      ],
    },
    {
      title: '💡 빠른 검수 팁',
      examples: [
        { q: '4자리 입력 → 자동 음성', a: '음성 안내 ON 상태에서 결과 자동 안내 (눈 안 봐도 됨)' },
        { q: '🎤 음성 검색',          a: '키 입력 없이 손에 컨테이너 들고 검색' },
        { q: '검수완료 버튼',         a: '결과 카드의 ✅ 버튼 탭 → 즉시 완료 처리' },
        { q: '컨번호 끝 4자리만',     a: '한국 모든 검수 표준 — 더 길게 칠 필요 없음' },
      ],
    },
    {
      title: '💡 데이터/통계 검토',
      examples: [
        { q: '베이별 무게',           a: '"16번 베이 무게 합" — 즉답 (M3.2)' },
        { q: '항구별 컨 수',          a: '"대련", "청도행" 등 — 즉답 (M3.2)' },
        { q: '구역별',                a: '"갑판 풀 몇대", "창내 위험물" — 즉답 (M3.2)' },
        { q: 'CSV 내보내기',          a: '리스트 탭 → CSV 다운로드 (결재용/세관용)' },
      ],
    },
    {
      title: '💡 안전/위험물',
      examples: [
        { q: '클래스별 확인',         a: '"클래스 3", "클래스 9" 즉답 (M3.2)' },
        { q: '특정 UN',               a: '"UN1234" 즉답 (M3.2)' },
        { q: '트윈 가부 (위험물)',    a: 'AI에 "3/1234와 5/2468 트윈 가능?" → IMDG 격리 판단' },
      ],
    },
    {
      title: '💡 문제 해결',
      examples: [
        { q: '결과 없음',             a: '검색어 너무 좁게 잡힘 → 조건 줄이거나 음성 다시 시도' },
        { q: '베이그림 어긋남',       a: 'M3.1에서 정수 기반 페어링 → 자동 호환' },
        { q: '음성 인식 안됨',        a: '마이크 권한 확인 / 한 번에 한 단어씩 또박또박' },
        { q: 'AI 오류',               a: '"네트워크 오류" 또는 "API 오류" 표시 — 분당 15회 한도 가능' },
      ],
    },
    // M3.5.6: 카톡 작업 보고 매뉴얼
    {
      title: '📐 ISO 규격 표기 통일 (M3.6)',
      examples: [
        { q: '문제 사례',             a: '같은 컨테이너인데 EDI는 "45G0", ASC는 "40HC" — 둘 다 같은 40피트 Hi-Cube' },
        { q: 'ISO 6346 표준',         a: '4자리 코드: 첫자리=길이(2/4/L), 둘째자리=높이(0,2 표준 / 5,6 Hi-Cube), 셋째자리=타입' },
        { q: '핵심 함정',             a: '"45G0"의 4와 5는 "40피트 + Hi-Cube"라는 뜻이지 45피트가 아닙니다' },
        { q: '자동 변환 (M3.6)',      a: '20G0=20DC, 42G0=40DC, 45G0=40HC, 45R0=40RF, L5G0=45HC' },
        { q: '45피트 현실',           a: '45피트는 GP/HC(드라이)만 존재. 45피트 리퍼/FR/OT/TK 없음' },
        { q: '알 수 없는 표기',       a: '⚠️ 처음 보는 표기 = 빨간 배너 + 음성 경고 + 사진 촬영 유도' },
        { q: '대응',                  a: '검수원이 [📷 사진 촬영] → 카톡 자동 발송 → 1항사 확인' },
      ],
    },
    {
      title: '👋 로그인/로그아웃 인사 (M3.6 신규)',
      examples: [
        { q: '자동 로그인 X',         a: '매번 앱 켜면 검수원 선택 화면 (강제 로그인) - 의식적 출퇴근 체크' },
        { q: '로그인 인사',           a: '검수원 선택 직후: 시간대 + 날씨 + 예보 안내 + 음성' },
        { q: '날씨 정보 출처',        a: 'Open-Meteo (평택항 좌표). 인증키 X, 무료, 회사 인계 안전' },
        { q: '근무 시간대 예보 (M3.68)', a: '접속 시점부터 9시간 후까지 3시간 간격 4개 슬롯. 기온 + 비/강풍 정보' },
        { q: '예보 멘트',             a: '"3시간 후 비 시작", "기온 10도 변화", "평온한 날씨" 등 자연어 안내' },
        { q: '시간대 분류',           a: '새벽/오전/점심/오후/저녁/야간 6단계' },
        { q: '날씨 알림',             a: '강풍 12m/s↑, 호우 5mm↑, 천둥, 눈, 안개, 더위 30°C↑, 추위 0°C↓' },
        { q: '로그아웃',              a: '헤더 [🚪 LogOut] 보라 버튼 → 작업 시간/날씨/시간대 마무리 인사' },
        { q: '음성 출력',             a: '한국어 TTS (밝고 청아한 톤). 인사 + 날씨 + 근무 시간 예보' },
      ],
    },
    {
      title: '🌐 검수 영어 회화집 (M3.6 강화)',
      examples: [
        { q: '시작 위치',             a: '헤더 우측의 [🌐 Languages] 버튼 (파란색)' },
        { q: '카테고리 13개',         a: '승선/사다리, 양하, 선적, 출항/시간, 컨테이너/실, 손상/불일치, 위치/베이, 리퍼, 특수화물, 크레인, X-RAY/세관, 안전, 마무리/사인' },
        { q: '두 가지 표현 타입',     a: 'p = 단일 문장 (직접 말하기) / q = 선원 질문 + 답변 옵션 (외국 선원이 물어볼 때 답하기)' },
        { q: '음성 들려주기',         a: '각 표현 [▶] 버튼 → 영어 발음 자동 재생 (TTS)' },
        { q: '검색',                  a: '한글/영어 검색창 → 즉시 필터링' },
        { q: '즐겨찾기',              a: '⭐ 별표 → 자주 쓰는 표현 모음' },
        { q: '재생 속도/음성 선택',   a: '⚙️ 설정 → 0.5x ~ 1.5x, 영어 음성 종류 선택' },
        { q: '활용 시나리오',         a: '외국 선원/도선사 만나면 즉시 표현 찾아 들려주기. 답변 옵션으로 즉시 응답 가능' },
      ],
    },
    {
      title: '📤 카톡 작업 보고 (M3.5.6 신규)',
      examples: [
        { q: '시작 위치',             a: '항차 페이지 상단 큰 버튼 [📤 작업 보고] 탭' },
        { q: '새 작업 시작',          a: '[▶ 새 작업 시작] → 장비(1~4호기) + 양하/선적 선택 → [시작] → 카톡 단톡방 선택 → 자동 발송' },
        { q: '한 장비 양하/선적 동시', a: '1호기 양하 진행 중 → 다시 [시작] → 1호기+선적 → 양하 그대로, 선적 새로 시작' },
        { q: '중단',                  a: '진행 중 카드의 [⏸ 중단] → 사유 입력 → 카톡 발송' },
        { q: '재개',                  a: '중단 상태 카드의 [▶ 재개] → 카톡 발송' },
        { q: '완료',                  a: '진행 중 카드의 [✅ 완료] → 확인 → 카톡 발송' },
        { q: '해치커버',              a: '[📤 작업 보고] → [해치커버] → 장비 + OPEN/CLOSE + 베이 입력 (1, 3, 5)' },
        { q: '콘박스',                a: '[📤 작업 보고] → [콘박스] → 장비 + 20자/40자 + 1~3개' },
      ],
    },
    {
      title: '📷 사진 보고 (실오류/데미지)',
      examples: [
        { q: '시작 위치',             a: '컨테이너 모달 (검수 화면) 안의 [📷 실오류] 또는 [📷 데미지] 버튼' },
        { q: '실오류',                a: '사진 촬영 → 기존실/발견실 입력 → [전송] → 사진+메시지 합성 후 카톡' },
        { q: '데미지',                a: '사진 촬영 → 종류 다중 선택(DENTED 등) → 부위 다중 선택(LEFT SIDE 등) → 추가 설명' },
        { q: '사진 합성 (M3.5.6-fix)', a: '사진 위에 정보 자동 자막 → 한 장에 모든 정보. 카톡 단톡방 한 번만 선택' },
        { q: '데미지 종류 16개',      a: 'DENTED, BENT, BULGED, PUSHED IN, HOLE, TORN, CUT, SCRATCH, CRACKED, BROKEN, LOOSE, MISSING, RUST, DIRTY, WET, CONTAMINATED' },
        { q: '데미지 부위 13개',      a: 'ROOF, FLOOR, LEFT/RIGHT SIDE, FRONT/BACK END, DOOR HANDLE/LATCH/HINGE/GASKET, CORNER POST, LOCK ROD, SEAL' },
      ],
    },
    {
      title: '🏗 장비 번호 (1~4호기)',
      examples: [
        { q: '헤더 표시',             a: '헤더 우측의 [🏗 1호기] 버튼 — 현재 장비 표시' },
        { q: '변경',                  a: '헤더 [🏗 N호기] 탭 → 장비 모달 → 다른 장비 선택' },
        { q: '작업 시작 시 선택',     a: '[새 작업 시작] 화면에서 장비 + 양하/선적 한 번에 선택' },
        { q: '카톡 메시지에 자동 포함', a: '모든 보고 메시지 맨 위에 [🏗 1호기] 자동 표시' },
        { q: '저장 위치',             a: '폰별로 저장 (localStorage) — 폰마다 한 번만 설정' },
      ],
    },
    {
      title: '📊 수석검수 — 작업 보고 모니터링',
      examples: [
        { q: '대시보드 진입',         a: '홈 → "수석검수" 검수원 선택 → 대시보드' },
        { q: '장비별 통계',           a: '오늘 1~4호기 각각의 작업 보고 건수 (실시간)' },
        { q: '최근 보고 30건',        a: '시간순 카톡 메시지 그대로 표시 (실시간 갱신)' },
        { q: '개별 보고 삭제',        a: '각 보고 우측 🗑 버튼 (잘못된 보고 정리용)' },
        { q: '전체 삭제 (테스트용)',  a: '[전체 삭제] 버튼 → 모든 항차의 보고/사진/활성 작업 일괄 삭제 (수석만)' },
      ],
    },
    {
      title: '🔧 카톡 발송이 안 될 때',
      examples: [
        { q: 'Android Chrome',        a: 'Web Share API 정상 작동 — 단톡방 선택 → 전송' },
        { q: 'iPhone Safari',         a: '정상 작동 (iOS 15+)' },
        { q: 'PC',                    a: '클립보드 자동 복사 → 카톡에 붙여넣기 (Ctrl+V)' },
        { q: '사진 + 텍스트',         a: '사진 위에 텍스트 합성되어 한 장으로 발송 (M3.5.6-fix)' },
        { q: '단톡방 미리 추가',      a: '카톡 [공유] 메뉴에 자주 쓰는 단톡방 등록 → 빠른 선택' },
      ],
    },
  ],
};

export default function HelpModal({ open, onClose }) {
  const [tab, setTab] = useState('basic');
  const [phraseOpen, setPhraseOpen] = useState(false);  // M5.0: 영어회화집 모달
  if (!open) return null;

  const sections = CONTENT[tab] || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full sm:max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-950">
          <div>
            <div className="text-lg font-black text-amber-300">📖 사용 매뉴얼</div>
            <div className="text-[11px] text-slate-400">평택항 검수앱 · 초보 검수원용</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-slate-300"/>
          </button>
        </div>

        {/* 탭 (가로 스크롤) */}
        <div className="flex gap-1 overflow-x-auto px-2 py-2 border-b border-slate-700 bg-slate-900/80 scrollbar-hide">
          {TABS.map(T => {
            const Icon = T.icon;
            return (
              <button key={T.id} onClick={() => setTab(T.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition ${
                  tab === T.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}>
                <Icon className="w-3.5 h-3.5"/>
                {T.label}
              </button>
            );
          })}
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          {/* M5.0: 영어회화 탭 — ContainerPhrasebook 안내 + 큰 버튼으로 모달 열기 */}
          {tab === 'english' ? (
            <div className="bg-blue-950/40 border-2 border-blue-700/50 rounded-lg p-6 text-center space-y-4">
              <div className="text-5xl">🌐</div>
              <div>
                <div className="text-xl font-black text-blue-200 mb-2">검수 영어 회화집</div>
                <div className="text-sm text-blue-300/80 leading-relaxed">
                  외국 선원/도선사 만났을 때 즉시 사용하는 검수 표현 모음<br/>
                  카테고리 13개 · 음성 재생 · 즐겨찾기 · 답변 옵션 제공
                </div>
              </div>
              <button onClick={() => setPhraseOpen(true)}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black rounded-lg text-base shadow-lg flex items-center justify-center gap-2">
                <Languages className="w-5 h-5"/>
                회화집 열기
              </button>
              <div className="text-[11px] text-blue-400/70">
                M5.0부터 헤더의 별도 [🌐 Languages] 버튼은 도움말 안으로 통합되었습니다
              </div>
            </div>
          ) : (
            sections.map((sec, si) => (
              <div key={si} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                <div className="text-base font-black text-amber-200 mb-2">{sec.title}</div>
                <div className="space-y-1.5">
                  {sec.examples.map((ex, ei) => (
                    <div key={ei} className="grid grid-cols-1 sm:grid-cols-5 gap-2 py-1.5 border-b border-slate-700/50 last:border-0">
                      <code className="sm:col-span-2 text-xs sm:text-sm font-bold mono text-cyan-300 bg-slate-950/60 px-2 py-1 rounded break-all">
                        {ex.q}
                      </code>
                      <div className="sm:col-span-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {ex.a}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 푸터 */}
        <div className="px-4 py-2 border-t border-slate-700 bg-slate-950 text-[10px] text-slate-500 text-center">
          M5.0 · 즉답이 안 되는 자유 질문은 ★AI 버튼★ 탭하면 Gemini 호출
        </div>
      </div>

      {/* M5.0: 영어회화집 (도움말 안에서 호출) */}
      <ContainerPhrasebook open={phraseOpen} onClose={() => setPhraseOpen(false)}/>
    </div>
  );
}
