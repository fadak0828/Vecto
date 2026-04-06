# Changelog

좌표.to의 모든 변경 사항이 여기에 기록됩니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)을 따르며, 버전은 [SemVer](https://semver.org/lang/ko/)를 따릅니다.

## [0.3.0] - 2026-04-06

### Changed
- **무료 URL 만료 30일 → 7일** — 무료 URL의 유효기간을 단축. 더 빠른 회전, 명확한 무료↔유료 funnel. 서버(`/api/shorten`), 만료 페이지(`/go/[slug]`), 홈 카드, /pricing 비교 표, /terms 약관까지 한 번에 정렬.
- **유료 하위 링크 20개 → 무제한** — 프리미엄 네임스페이스에서 만들 수 있는 하위 링크 개수 제한 제거. 이름 하나 사면 마음대로 쓸 수 있도록. 대시보드/설정 카운터를 `N/20` → `N개`로 변경.
- **Hero 입력 미리보기에 typing rotation 추가** — 빈 입력란에서 `오픈채팅` → `청첩장` → `이력서` → `메뉴판` 4개 한국 사용자 use case가 type/delete 사이클로 순환. 입력 시작 즉시 멈춤. `prefers-reduced-motion: reduce` 사용자에게는 정적 폴백.
- **Premium 카드 비대칭 재디자인 (5/12 + 7/12)** — 홈의 두 티어 선택 섹션을 균등 50/50에서 비대칭 editorial split으로. 무료 카드는 보조(왼쪽 41%), 프리미엄 카드는 dominant(오른쪽 59%, 다크 fill). DESIGN.md "Asymmetric Editorial" 방향과 정렬, TODOS.md F-I 항목 해소.
- **프리미엄 카드 hierarchy 재구성** — h3가 product label(`내 이름 좌표`) 대신 실제 URL 예시(`좌표.to/[내이름]`)가 됨. 매거진 표지 에너지. 가치 제안(`사람들에게 기억되는 나만의 주소.`)은 볼드, 가격 단서(`월 ₩742부터 · 12개월 ₩8,900`)는 흐림.
- **카피 톤을 매거진 헤더로 punching** — `한글로 기억되는 짧은 주소, 좌표.to` → `이름이 곧 주소.`. `길고 복잡한 URL을... 말로 불러줄 수 있고` → `말로 부르고, 한 번에 기억합니다.`. 6곳 이상에서 explanatory 문장을 confident 한 줄 선언으로 교체. 마침표로 끊기, 군더더기 단어 제거.
- **`홍길동` → `[내이름]` 전체 치환** — 90년대 관공서 양식 톤 제거. body 카피에서는 brackets로 placeholder syntax 명시(`좌표.to/[내이름]`), 입력란 placeholder는 brackets 없이(`내이름`).
- **`영구` 워딩 8곳 제거** — 구독 모델인데 "영구 URL"이라고 자칭하던 거 모두 정직하게 수정. `영구 주소` → `전용 주소`, `영구 URL` → `전용 주소`, `기간권 동안 영구` → `구독 동안 유지`. 약관까지 일관성.
- **모바일 nav 버튼 디자인 개선** — `bg-surface-lowest` (white-on-white로 거의 안 보임)에서 `bg-surface-container` (#ededed) + `font-medium` + `inline-flex justify-center`로. 라벨도 `이름 예약하기` → `이름 예약`로 짧게 잘라서 flex-1 wrap 방지.
- **Hero 글래스 카드 입력란 가시성 강화** — 슬러그/URL 입력란 배경을 `surface-lowest`(흰색)에서 `surface-container`(#ededed) + `inset 1px ghost border`로. 글래스 카드 안에서 입력란이 시각적으로 분리됨.
- **슬러그 placeholder rotation 동기화** — 입력란 placeholder가 hero live preview의 rotation index를 따라 함께 변함. 라이브 미리보기에 `청첩장`이 뜨면 placeholder도 `청첩장`.

### Added
- **`text-base font-bold` value prop styling on premium card** — 카피의 가치 제안 줄이 명확히 강조됨.
- **Hero 입력 미리보기 깜빡 커서** — 한글 typing animation 옆에 `|` 커서 (opacity 0.4) 깜빡임.

### Fixed
- **모바일 톱 nav가 깨지던 버그** — `globals.css`의 `nav a { display: inline-flex }`가 unlayered 상태였음. Tailwind v4의 `.hidden`이 `@layer utilities` 안에 있어서 cascade 규칙상 unlayered 룰이 utilities를 이김 → `hidden sm:inline`이 무효화 → 4개 데스크탑 nav 링크가 모바일에서도 모두 표시되어 로그인 버튼 잘림 + 중복 nav. 모든 globals 룰을 `@layer base`로 이동해서 cascade 정렬.
- **Focus outline radius mismatch** — `*:focus-visible { border-radius: 4px }`가 입력란의 실제 `rounded-xl` (12px) 모양과 어긋나는 outline을 그리고 있었음. hardcoded radius 제거 → 모던 브라우저는 outline이 element의 자연 border-radius를 자동으로 따름. 슬러그 입력 wrapper는 `:focus-within` ring을 사용해 wrapper 모양 그대로 hugging.
- **Hero typing animation이 모바일에서 글래스 카드 우측 패딩을 넘어가던 버그** — `text-2xl` 고정이라 313-375px 뷰포트에서 `좌표.to/go/메뉴판|`가 카드 가장자리에 닿거나 잘림. `text-xl sm:text-2xl`로 responsive scale + `whitespace-nowrap` + 부모 `overflow-hidden` 안전장치.
- **/reserve 페이지의 모바일 패딩 과도** — `p-8 sm:p-16`이 모바일에 32px 좌우 padding을 강제. `p-6 sm:p-16`로 정렬.

## [0.2.1] - 2026-04-06

### Changed
- **로그인/이름 예약 페이지 전면 리디자인** — 가운데 정렬된 좁은 폼에서 비대칭 에디토리얼 레이아웃으로. 브랜드 워드마크 좌상단, 큰 Manrope 헤드라인 + 본문은 좌측 7컬럼, 글래스 폼 카드는 우측 5컬럼에 띄움. DESIGN.md "Asymmetric Editorial / 비대칭 마진" 방향에 맞춤.
- **카드 elevation을 Whisper Shadow로 통일** — `--shadow-whisper` / `--shadow-whisper-strong` CSS 변수 도입 (블러 32-64px, 4-6% 투명도, 다크 틸-그레이 틴트). 홈의 글래스 폼, TypeCard, FeatureCard, 다크 프로필 카드 모두 적용. 톤 레이어링이 살아남.
- **로그인 완료 화면에서 📧 이모지 제거** — DESIGN.md AI Slop 블랙리스트 위반. eyebrow + Manrope 헤드라인 + 본문 + 백 링크의 에디토리얼 레이아웃으로 교체.
- **H1 줄바꿈 처리** — 수동 `<br>` 제거하고 `text-wrap: balance` 사용. 뷰포트별로 자동 균형 잡힘.
- **하드코딩 컬러 제거** — 강조 TypeCard 체크 아이콘의 `#76d6d5` (팔레트 외부) → `var(--surface-lowest)`. 사이트 전체에서 팔레트 외 컬러 0개.

### Fixed
- **Korean text wrap 회귀 방지** — `text-wrap: balance`가 한글을 글자 단위로 끊는 문제 (짧은 → 짧 / 은, 좌표 → 좌 / 표). body에 `word-break: keep-all` + `overflow-wrap: break-word` 추가. 한글 사이트 표준 처리.
- **푸터/본문 링크가 44px로 강제되던 버그** — `globals.css`의 `min-height: 44px`가 모든 `<a>`에 적용돼서 푸터 "이용약관", "개인정보 처리방침" 같은 텍스트 링크가 44px 높이로 부풀어 있었음. 폼 컨트롤과 nav/header 링크에만 적용되도록 스코프 좁힘.

## [0.2.0] - 2026-04-06

### Added
- **결제 연동 (PortOne)** — 좌표.to/내이름 영구 URL 구매 가능
  - 3개월 (₩2,900) / 6개월 (₩4,900, best value) / 12개월 (₩8,900) 기간권
  - PortOne V2 SDK + webhook 서명 검증
  - 결제 완료 페이지 + polling + 수동 확인 안전망
  - 7일 이내 전액 환불
- **만료 관리 시스템** — 자동 상태 전이 (active → expired) + 30일 grace period
  - Vercel Cron으로 매일 실행
  - 7일 전 만료 알림 이메일 (Resend)
- **payments 테이블** — 결제 이력 + 멱등성 (portone_payment_id UNIQUE)
- **결제 상태 UI** — 대시보드에 활성/만료/갱신 표시

### Changed
- **가격 페이지 전면 리디자인** — 3개월/6개월/12개월 패키지 + 체크아웃 플로우
- **네임스페이스 claim 플로우** — claim 후 결제 페이지로 자동 이동
- **CSP 정책** — PortOne SDK 도메인 (cdn.portone.io, *.portone.io) 허용
- **`namespaces.tier` 컬럼 제거** — `payment_status` (free/active/expired) + `paid_until`로 통합
- **`namespaces.owner_id` UNIQUE 제약** — 사용자당 1 namespace 강제

### Fixed
- **vitest.config.ts** — Vitest 4 호환을 위해 `environmentMatchGlobs` 제거
