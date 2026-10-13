/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin';
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
        //  ★ 2.40 — 색을 **hex 에서 CSS 변수로** 옮겼다 (검수사 «앱이 너무 어둡고 캄캄합니다»).
        //    실제 값은 `src/index.css` 의 :root / [data-bright="2|3|4"] 가 정한다.
        //    ⚠ **클래스는 한 글자도 안 바꿨다** — bg-ink-800 985회·text-dim-* 1,522회가 그대로 따라온다.
        //    ⚠ `<alpha-value>` 를 반드시 남긴다 — `bg-ink-800/60` 류가 **193회** 쓰인다. 빼면 그게 전부 죽는다.
        ink:  { 950:'rgb(var(--ink-950) / <alpha-value>)', 900:'rgb(var(--ink-900) / <alpha-value>)',
                850:'rgb(var(--ink-850) / <alpha-value>)', 800:'rgb(var(--ink-800) / <alpha-value>)',
                750:'rgb(var(--ink-750) / <alpha-value>)', 700:'rgb(var(--ink-700) / <alpha-value>)' },
        //  ⚠ line 만 형태가 다르다. 원래 alpha 가 박힌 문자열이라 Tailwind 가 opacity 변형을 못 붙인다
        //    (즉 `border-line/40` 25회는 **지금도 안 먹는다**). 여기서 형태를 바꾸면 안 먹던 것이
        //    갑자기 먹어 회귀가 된다 — 그대로 «안 먹는 채»로 변수만 갈아 끼운다.
        line: { DEFAULT:'rgb(var(--line-rgb) / var(--line-a))', soft:'rgb(var(--line-rgb) / var(--line-a-soft))',
                strong:'rgb(var(--line-rgb) / var(--line-a-strong))', faint:'rgb(var(--line-faint) / <alpha-value>)' },
        act:  { DEFAULT:'rgb(var(--act) / <alpha-value>)', hi:'rgb(var(--act-hi) / <alpha-value>)',
                dn:'rgb(var(--act-dn) / <alpha-value>)', on:'rgb(var(--act-on) / <alpha-value>)',
                soft:'rgb(var(--act-soft) / <alpha-value>)' },
        // 상태색 — 시안 V2 실측 (양하 파랑 / 선적 amber / 위험 빨강 / 수석 보라)
        //  ⚠ 상태색은 **밝은 화면에서 반대로 진해진다**(검수사 지적 — «색상을 진하게 하면 되는거 아닌가요»).
        //    배경만 밝히면 양하 파랑이 4.27:1 → 2.35:1 로 무너져 화면에서 사라진다(2.40 시뮬에서 잡았다).
        st:   { dis:'rgb(var(--st-dis) / <alpha-value>)', disHi:'rgb(var(--st-disHi) / <alpha-value>)',
                lod:'rgb(var(--st-lod) / <alpha-value>)', lodHi:'rgb(var(--st-lodHi) / <alpha-value>)',
                bad:'rgb(var(--st-bad) / <alpha-value>)', badHi:'rgb(var(--st-badHi) / <alpha-value>)',
                chief:'rgb(var(--st-chief) / <alpha-value>)' },
        //  ⚠ dim 은 **밝은 화면에서 순서가 뒤집힌다** — 100 이 주 글자라 라이트에서는 가장 진해야 한다.
        dim:  { 100:'rgb(var(--dim-100) / <alpha-value>)', 200:'rgb(var(--dim-200) / <alpha-value>)',
                300:'rgb(var(--dim-300) / <alpha-value>)', 400:'rgb(var(--dim-400) / <alpha-value>)',
                500:'rgb(var(--dim-500) / <alpha-value>)' },
      },
      //  ★ 4.23 — 글자 두 모드(보통·크게, 검수사 2026-10-12 «수석들이 노안이 심한 사람이 많습니다. 두가지 모드로 했으면 합니다»).
      //    색(2.40)과 같은 수법 — 값 대신 **CSS 변수**를 참조한다. 실제 값은 `src/index.css` 의 :root(보통) / :root[data-text="large"](크게)가 정한다.
      //    ⚠ 클래스는 한 글자도 안 바꿨다 — text-2xs 701회·text-xs 502회 …(2,6xx건)가 그대로 모드를 따라온다. 기본 키(xs·sm·base·lg…)도 여기서 덮는다.
      //    ⚠ 줄 높이 — 기본 키는 Tailwind 기본값(xs 1rem · sm 1.25rem …)을 **글자 크기에 대한 비율**로 옮겨 적었다. 보통 모드에서 px 가 4.22-04 와 똑같고(12×4/3=16)
      //      크게 모드에서 같은 비율로 커진다. 절대 길이(calc)라 자식에게 종전처럼 px 로 물려준다. 3xs~sm2 는 종전 그대로 단위 없는 비율.
      //    ⚠ 그림(FitBox 안 · 베이 격자)과 인쇄는 4.22-04 값에 고정된다 — index.css `.fs-keep` · `@media print`.
      fontSize: {
        '3xs': ['var(--fs-3xs)', { lineHeight:'1.2'  }],
        '2xs': ['var(--fs-2xs)', { lineHeight:'1.3'  }],
        'xxs': ['var(--fs-xxs)', { lineHeight:'1.4'  }],
        'xs2': ['var(--fs-xs2)', { lineHeight:'1.45' }],
        'sm2': ['var(--fs-sm2)', { lineHeight:'1.5'  }],
        'xs':   ['var(--fs-xs)',   { lineHeight:'calc(var(--fs-xs) * 4 / 3)'   }],   // Tailwind 기본 .75rem / 1rem
        'sm':   ['var(--fs-sm)',   { lineHeight:'calc(var(--fs-sm) * 10 / 7)'  }],   // .875rem / 1.25rem
        'base': ['var(--fs-base)', { lineHeight:'calc(var(--fs-base) * 1.5)'   }],   // 1rem / 1.5rem
        'lg':   ['var(--fs-lg)',   { lineHeight:'calc(var(--fs-lg) * 14 / 9)'  }],   // 1.125rem / 1.75rem
        'xl':   ['var(--fs-xl)',   { lineHeight:'calc(var(--fs-xl) * 1.4)'     }],   // 1.25rem / 1.75rem
        '2xl':  ['var(--fs-2xl)',  { lineHeight:'calc(var(--fs-2xl) * 4 / 3)'  }],   // 1.5rem / 2rem
        '3xl':  ['var(--fs-3xl)',  { lineHeight:'calc(var(--fs-3xl) * 1.2)'    }],   // 1.875rem / 2.25rem
        '4xl':  ['var(--fs-4xl)',  { lineHeight:'calc(var(--fs-4xl) * 10 / 9)' }],   // 2.25rem / 2.5rem
      },
      borderRadius: { card:'20px', btn:'18px', sheet:'32px', pill:'14px' },   // 시안 V2: 카드 20px radius
      height:       { row:'64px', row2:'62px', cta:'60px', fld:'56px' },
      maxWidth:     { app:'1500px' },
      boxShadow:    { card:'0 8px 32px rgba(0,0,0,0.28)' },   // 시안 V2
      transitionDuration: { 160:'160ms' },
    },
  },
  plugins: [
    //  ★ 4.23 — «크게» 모드에서만 거는 배치 `tx-lg:…`(예 tx-lg:whitespace-normal). 글자 크기는 변수가 알아서 바꾸므로 이것은
    //    «크게에서 한 줄이 넘칠 때 두 줄을 허용» 같은 배치 손질에만 쓴다. 보통 모드 화면은 이 접두가 붙은 클래스로 바뀌지 않는다.
    plugin(({ addVariant }) => { addVariant('tx-lg', ':root[data-text="large"] &'); }),
  ],
};
