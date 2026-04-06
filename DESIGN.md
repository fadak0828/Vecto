# Design System — 좌표.to

## Product Context
- **What this is:** 한글로 된 짧고 의미있는 URL 단축 서비스
- **Who it's for:** 한국의 교육자, 강사, 프리랜서, 크리에이터, 소상공인
- **Project type:** 웹 앱 (URL 단축 + 개인 네임스페이스 + 프로필 페이지)

## Creative North Star
**"The Digital Curator."** URL 관리를 하이엔드 에디토리얼 경험으로. 한글의 기하학적 아름다움을 살리고, 비대칭 레이아웃과 톤 깊이로 프리미엄 느낌.

## Aesthetic Direction
- **Direction:** High-End Editorial
- **Decoration level:** Intentional (글래스모피즘, 톤 레이어링)
- **Mood:** 프리미엄, 권위있지만 친근한. 잡지 표지 같은 타이포그래피.

## Colors — Deep Mint & Charcoal

### Core Palette
- **Primary:** #006565 (deep mint)
- **Primary Container:** #008080 (teal)
- **On Background:** #1a1c1c (charcoal, #000 금지)
- **On Surface:** #1a1c1c
- **On Surface Variant:** #444746
- **Outline Variant:** #bdc9c8
- **Surface:** #f9f9f9
- **Surface Container Lowest:** #ffffff
- **Surface Container Low:** #f3f3f3
- **Surface Container:** #ededed
- **Surface Container High:** #e8e8e8
- **Surface Container Highest:** #e2e2e2
- **Secondary Container:** #e2dfde
- **On Secondary Container:** #1c1b1b
- **Error:** #ba1a1a
- **On Error:** #ffffff

### Rules
- **No-Line Rule:** 1px 보더로 섹션 구분 금지. 배경색 톤 차이로만 구분.
- **No Pure Black:** #000000 사용 금지. 항상 #1a1c1c (charcoal) 사용.
- **Ghost Border:** 접근성을 위해 보더가 필요한 경우 outline_variant를 15% 투명도로.

### Glass & Gradient
- 플로팅 요소: surface-container-lowest 80% 투명도 + backdrop-blur(12-20px)
- CTA 버튼: primary → primary_container 135도 그라디언트

### CSS Variables
```css
:root {
  --primary: #006565;
  --primary-container: #008080;
  --on-background: #1a1c1c;
  --on-surface: #1a1c1c;
  --on-surface-variant: #444746;
  --outline-variant: #bdc9c8;
  --surface: #f9f9f9;
  --surface-lowest: #ffffff;
  --surface-low: #f3f3f3;
  --surface-container: #ededed;
  --surface-high: #e8e8e8;
  --surface-highest: #e2e2e2;
  --secondary-container: #e2dfde;
  --error: #ba1a1a;
}
```

## Typography
- **Display/Hero:** Manrope 700-800 (매거진 헤더 느낌, 큰 사이즈)
- **Headline/Title:** Manrope (영문) + Plus Jakarta Sans (한국어, Bold)
- **Body/Labels:** Plus Jakarta Sans 400-500 (줄 간격 1.6-1.8 필수, 한글 가독성)
- **Loading:**
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet"/>
  ```
- **Scale:** 12 / 14 / 16 / 18 / 22 / 28 / 36 / 45 / 57 px

## Spacing
- **Base unit:** 4px
- **Density:** Spacious (에디토리얼 느낌을 위해 넓은 여백)
- **Scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 px
- **한국어 텍스트:** line-height 1.6-1.8 필수

## Layout
- **Approach:** Asymmetric Editorial
- **Grid:** 비대칭 마진 (왼쪽 마진을 더 크게 해서 에디토리얼 느낌)
- **Max content width:** 1024px
- **Border radius:** md(12px) xl(16px) 2xl(24px) full(9999px)

## Elevation & Depth — Tonal Layering
- **원칙:** UI를 고급 종이 층으로 취급. 전통적 그림자 대신 톤 레이어링.
- **Ambient Shadow (Whisper Shadow):** blur 32-64px, opacity 4-6%, tinted dark teal-grey
- **Ghost Border:** outline_variant 15% opacity (접근성 필요 시만)
- **CSS 변수 (globals.css):**
  - `--shadow-whisper` — 일반 카드 elevation
  - `--shadow-whisper-strong` — hero glass card, 강조 카드, dark profile card

## Korean Text Wrapping
- **원칙:** 한글은 글자 단위가 아닌 단어 단위로 줄바꿈해야 함. `text-wrap: balance`와 함께 쓸 때는 반드시 `word-break: keep-all`도 적용 (그렇지 않으면 "짧은" → "짧" / "은"처럼 단어가 깨짐).
- **globals.css:** body에 `word-break: keep-all` + `overflow-wrap: break-word` 전역 설정.

## Motion
- **Approach:** Intentional
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(100ms) short(200ms) medium(350ms)

## Components

### Input Fields
- surface-container-lowest 배경
- 포커스 시 primary 색상 + Whisper Shadow 글로우
- radius: xl (16px)

### Buttons
- **Primary (Dark):** on-background (#1a1c1c) 배경, surface 텍스트. 라이트 캔버스 위의 다크 버튼.
- **CTA (Mint):** primary → primary-container 135도 그라디언트
- **Ghost:** on-surface-variant 텍스트, 배경 없음. 호버 시 surface-container-high

### Cards & Lists
- **구분선 금지.** spacing(24px+) 또는 톤 차이로 구분.
- 비대칭 그리드로 큐레이션된 갤러리 느낌.

### Chips
- secondary-container 배경 + on-secondary-container 텍스트
- rounded-full

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | Deep Mint & Charcoal 팔레트 | stitch 디자인 시스템 적용 |
| 2026-04-06 | Manrope + Plus Jakarta Sans | 에디토리얼 타이포, 한글 가독성 |
| 2026-04-06 | No-Line, Tonal Layering | 프리미엄 느낌, 보더 없는 디자인 |
| 2026-04-06 | Glassmorphism for floating elements | 깊이감 + 모던 |
