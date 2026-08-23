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
        ink:  { 950:'#080C1A', 900:'#0E1727', 850:'#121A2B', 800:'#1A2338', 750:'#1D2940', 700:'#232F4A' },
        line: { DEFAULT:'#22304B', soft:'#1E2B45', strong:'#2A3958', faint:'#24324E' },
        act:  { DEFAULT:'#00D18F', hi:'#00E89E', on:'#04120C', soft:'#7CF1C2' },
        dim:  { 100:'#9AA3B8', 200:'#8CA0C2', 300:'#7C8CA8', 400:'#6E7E9E', 500:'#5A6B8A' },
      },
      fontSize: {
        '3xs': ['9px',  { lineHeight:'1.2'  }],
        '2xs': ['10px', { lineHeight:'1.3'  }],
        'xxs': ['11px', { lineHeight:'1.4'  }],
        'xs2': ['12px', { lineHeight:'1.45' }],
        'sm2': ['13px', { lineHeight:'1.5'  }],
      },
      borderRadius: { card:'16px', btn:'18px', sheet:'32px', pill:'14px' },
      height:       { row:'64px', row2:'62px', cta:'60px', fld:'56px' },
      maxWidth:     { app:'1500px' },
    },
  },
  plugins: [],
};
