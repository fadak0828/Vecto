# Design System — 좌표.to

## Product Context
- **What this is:** 한글로 된 짧고 의미있는 URL 단축 서비스
- **Who it's for:** 한국의 교육자, 강사, 프리랜서, 오프라인 행사 진행자
- **Space/industry:** URL 단축 + 개인 브랜딩 (한국 시장 특화)
- **Project type:** 웹 앱 (URL 단축 + 개인 네임스페이스 + 프로필 페이지)

## Aesthetic Direction
- **Direction:** Editorial/Magazine
- **Decoration level:** Intentional (한글 URL 미리보기가 시각적 앵커)
- **Mood:** 조용하지만 자신감 있는. 한글이 주인공이고 나머지는 배경. 교육자가 전문적으로 느끼는 도구.
- **Reference sites:** dub.co (미니멀 대시보드), linktree (프로필 개념)

## Typography
- **Display/Hero:** Pretendard Variable 700-900 (44-60px) — 한국어 최적 가변폰트, 큰 사이즈에서 한글이 아름다움
- **Body:** Pretendard Variable 400 (16px base) — 동일 폰트로 일관성, 무게 조절로 위계
- **UI/Labels:** Pretendard Variable 500 (14px) — same as body
- **Data/Tables:** Geist Mono (tabular-nums 지원) — URL 표시, 통계
- **Code:** Geist Mono
- **Loading:** CDN `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css`
- **Scale:** 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 44 / 60 px

## Color
- **Approach:** Restrained (1 accent + warm neutrals, 한글이 눈에 띄어야 함)
- **Primary/Accent:** #0F766E (teal-700) — 신뢰, 안정, URL 서비스에 적합
- **Accent light:** #CCFBF1 (teal-100) — 성공 배경, 강조 배경
- **Accent hover:** #0D9488 (teal-600) — 호버/인터랙션 상태
- **Surface:** #FFFFFF — 카드, 입력 필드
- **Background:** #FAFAF9 (stone-50) — 따뜻한 페이지 배경
- **Foreground:** #1C1917 (stone-900) — 주요 텍스트
- **Muted:** #78716C (stone-500) — 보조 텍스트, 플레이스홀더
- **Border:** #E7E5E4 (stone-200) — 구분선, 입력 필드 테두리
- **Semantic:**
  - Success: #CCFBF1 bg / #0F766E text
  - Error: #FEF2F2 bg / #B91C1C text
  - Warning: #FFFBEB bg / #92400E text
  - Info: #EFF6FF bg / #1D4ED8 text
- **Dark mode:** 추후 (MVP에서는 라이트 모드만)

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)

## Layout
- **Approach:** Grid-disciplined
- **Alignment:** 좌측 정렬 기본 (editorial 느낌, 한국 서비스와 차별화)
- **Max content width:** 768px (max-w-3xl)
- **Grid:** 모바일 1col / sm(640px) 2-3col
- **Border radius:** sm(8px) md(12px) lg(16px) full(9999px)

## Motion
- **Approach:** Minimal-functional
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms)
- **사용처:** 폼 포커스 링, 복사 확인 피드백, 버튼 호버/활성

## Component Patterns
- **Input fields:** rounded-xl, surface bg, stone-200 border, teal focus ring
- **Primary button:** foreground bg, white text, rounded-xl, active:scale-[0.98]
- **Secondary button:** surface bg, stone-200 border, rounded-lg
- **Cards:** surface bg, stone-200 border, rounded-xl, shadow-sm
- **Success state:** accent-light bg, teal-200 border
- **Error state:** red-50 bg, red-100 border

## CSS Variables
```css
:root {
  --background: #FAFAF9;
  --foreground: #1C1917;
  --surface: #FFFFFF;
  --accent: #0F766E;
  --accent-light: #CCFBF1;
  --accent-hover: #0D9488;
  --muted: #78716C;
  --border: #E7E5E4;
}
```

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | Initial design system | /design-consultation, 경쟁사 조사(dub.co, linktree) 기반 |
| 2026-04-06 | Teal accent (#0F766E) | 신뢰감, URL 서비스 전통(Bitly도 초록계열), 한글과 대비 좋음 |
| 2026-04-06 | 좌측 정렬 기본 | 한국 서비스와 차별화, editorial 느낌, 가독성 우수 |
| 2026-04-06 | Pretendard only | 한국어 전용 최적 폰트, 가변폰트로 무게 조절만으로 위계 |
