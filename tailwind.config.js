/** @type {import('tailwindcss').Config} */
// TallyOne 2.13 — 디자인 토큰 단일 소스 (검수사 확정 2026-08-23)
//   «반드시 컴용화면 폰용화면이 달라야 합니다. 항목이 다른게 아니고 디자인 구성 배치가 달라야 합니다.»
//   «어쩔수 없이 여백이 남으면 관련그림이나 부가 설명을 넣고, 폰은 아이콘 크기를 맞추면
//     한줄이면 될껄 크기가 틀려 다음줄을 만들기도 합니다.»
//
// ⚠ 이 파일이 생기기 전 실태(2026-08-23 전수) — 테두리 색 188종 · 배경 bg-slate-* 37종 ·
//   임의 글자 크기 14종(9~11px 에 1,114회 몰림) · 모서리 18종 · 아이콘 크기 19종.
//   한 파일 안에서 아이콘을 5~8종씩 섞어 써서 폰에서 한 줄에 안 담기고 다음 줄로 넘어갔다.
//   ⇒ 새 화면을 그릴 때는 **아래 토큰만 쓴다.** 임의값(bg-[#...] · text-[13px])을 새로 만들지 않는다.
export default {
  // V8.31: src/data 스캔 제외 — 1.2MB 단일라인 사전이 Tailwind 추출 정규식을 폭주시켜
  //   빌드가 수 분씩 걸리던 결함 수정 (data에는 Tailwind 클래스 없음 확인).
  content: ['./index.html', './src/**/*.{js,jsx}', '!./src/data/**'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 2.16 — 검수사 시안 V2(Tallyone-System-V2-Premium) 값으로 교체. 빈도까지 실측해서 맞췄다.
        ink:  { 950:'#060A14', 900:'#0F172A', 850:'#151F32', 800:'#1A2336', 750:'#1E293B', 700:'#232F4A' },
        line: { DEFAULT:'rgba(255,255,255,0.06)', soft:'rgba(255,255,255,0.04)', strong:'rgba(255,255,255,0.10)', faint:'#1E293B' },
        act:  { DEFAULT:'#00D18F', hi:'#00E89E', dn:'#00B87A', on:'#04120C', soft:'#7CF1C2' },
        // 상태색 — 시안 V2 실측 (양하 파랑 / 선적 amber / 위험 빨강 / 수석 보라)
        st:   { dis:'#3B82F6', disHi:'#60A5FA', lod:'#F59E0B', lodHi:'#FBBF24', bad:'#EF4444', badHi:'#FCA5A5', chief:'#8B5CF6' },
        dim:  { 100:'#F1F5F9', 200:'#8B9BB4', 300:'#7C8CA8', 400:'#6E7E9E', 500:'#475569' },
      },
      fontSize: {
        '3xs': ['9px',  { lineHeight:'1.2'  }],
        '2xs': ['10px', { lineHeight:'1.3'  }],
        'xxs': ['11px', { lineHeight:'1.4'  }],
        'xs2': ['12px', { lineHeight:'1.45' }],
        'sm2': ['13px', { lineHeight:'1.5'  }],
      },
      borderRadius: { card:'20px', btn:'18px', sheet:'32px', pill:'14px' },   // 시안 V2: 카드 20px radius
      height:       { row:'64px', row2:'62px', cta:'60px', fld:'56px' },
      maxWidth:     { app:'1500px' },
      boxShadow:    { card:'0 8px 32px rgba(0,0,0,0.28)' },   // 시안 V2
      transitionDuration: { 160:'160ms' },
    },
  },
  plugins: [],
};
