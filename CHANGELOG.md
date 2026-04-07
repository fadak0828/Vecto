# Changelog

좌표.to의 모든 변경 사항이 여기에 기록됩니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)을 따르며, 버전은 [SemVer](https://semver.org/lang/ko/)를 따릅니다.

## [0.5.0] - 2026-04-07

### Added
- **프리미엄 혜택 시각화 컴포넌트 3종** (`premium-previews.tsx`) — 텍스트 설명 대신 인라인 SVG + CSS 애니메이션으로 혜택을 직접 보여줌. 브라우저 주소창 스타일 pill (`NamespacePillPreview`), 프로필 페이지 축소 목업 (`ProfileCardPreview`), 7일 클릭 차트 (`ClickChartPreview`). 외부 이미지/라이브러리 0개. `motion-safe:` prefix + globals.css reduced-motion으로 접근성 처리.
- **홈 결과 카드 업그레이드 유도** — 무료 단축링크 생성 직후 "이 링크는 7일 후 만료됩니다" + 네임스페이스 pill 미리보기 + "영구적인 주소 만들기 →" 카드 표시. 휘발성을 체감한 순간에 영구 주소를 제안.
- **대시보드 claim 화면 라이브 미리보기** — 이름을 타이핑하는 동안 `NamespacePillPreview`가 실시간으로 `좌표.to/[입력값]`을 보여줌. 하단에 `ProfileCardPreview` + `ClickChartPreview`로 구매 후 모습 미리 확인.
- **PaymentStatus 무료 플랜 업셀 강화** — 한 줄 텍스트에서 3종 시각화 미리보기 + "월 약 ₩740부터 시작 →" CTA로 확장. 가격은 `PLANS` 배열에서 동적 산출.

### Changed
- **Pricing 구매 카드 순서 재배치** — 기존 순서(제목 → 5개 feature → 가격 → 결제 버튼)에서 가격+결제 버튼을 최상단으로 이동. 모바일 첫 화면 안에 결제 버튼이 항상 보임. 데스크톱 sticky 카드도 fold 안에 버튼 수납.
- **홈 CTA 가격 강조** — 초록 그라디언트 배경의 "약 ₩740" 숫자를 `--primary-light` (#76d6d5) 틸로 표시해 시인성 강화.
- **Premium Features 섹션 배경 분리** — 위 섹션과 같은 `--surface` 회색이었던 배경을 `--surface-lowest` 흰색으로 변경해 시각적 구분 명확화.

## [0.4.0] - 2026-04-07

### Added
- **단축 링크에 QR 코드 자동 생성** — 생성 결과 카드에 즉시 스캔 가능한 QR 표시. 강사가 강의 화면에서 학생 폰으로 1탭 공유. `qrcode` 라이브러리(50KB) lazy import로 hero LCP 영향 0. 클라이언트 사이드 생성 → 서버 비용 0. QR 클릭 시 PNG 이미지가 클립보드로 (카톡/슬랙에 paste). 미지원 브라우저는 URL 텍스트로 graceful fallback.
- **PC 데스크톱 라이브 ghost preview** — 1024px+ 화면에서 폼 오른쪽에 결과 패널이 항상 표시됨. 사용자가 슬러그를 타이핑하는 즉시 우측에 URL + QR이 미리 렌더링되어 "내가 만들고 있다"는 즉각적 시각 피드백. 생성 클릭 시 같은 자리에서 ghost → real로 자연스럽게 전환. 비어있던 700px 우측 공간이 이제 데모 영역.
- **단축 링크 클릭 = 복사** — 결과 URL 텍스트를 클릭하면 클립보드 복사 (별도 복사 버튼 제거). hover 시 미세한 background tint로 affordance 신호. 키보드 접근성 위해 button + aria-label.
- **프리미엄 가치 진술 카드 6개** — pricing 페이지의 방어적 "무료 vs 프리미엄" 비교 표 제거. 대신 "프리미엄으로 얻는 것" 섹션에 카드 6개: 내 이름이 곧 주소 / 하위 링크 무제한 / 프로필 페이지 자동 생성 / 클릭 분석 대시보드 / 만료 신경 쓰지 않기 / 발음할 수 있는 URL. 비교 table 대신 가치 statement, 아래 헤드라인: "짧은 주소가 아니라, 기억되는 주소."

### Changed
- **단축 링크 생성 속도 ~3x 개선** — `/api/shorten`이 생성 전 4번의 sequential SELECT (daily count, monthly count, namespace 충돌, slug 충돌)로 한국→Vercel→Supabase 왕복을 5번 함. `Promise.all`로 병렬화하여 round-trip 5번 → 2번. 한국 사용자 체감 약 1초 단축.
- **결과 카드 표시 포맷에서 `https://` 제거** — 코드베이스 다른 모든 곳(홈 라이브 프리뷰, 대시보드 sublink 목록, pricing 페이지)이 이미 `좌표.to/...` 형태로 표시 중인데 결과 카드 한 곳만 풀 URL이었음. 일관성 + 한글 브랜딩 강조. 클립보드 복사는 풀 URL 그대로 (브라우저 호환성 유지).
- **결과 카드 글씨 키움 + QR 사이즈 키움** — URL 텍스트 14px → 20-24px (text-xl/2xl, Manrope bold). QR 다운로드 버튼 제거하고 QR 자체가 클릭 가능한 큰 영역으로. 모바일에서 카드 너비 가득(≈290px), PC에서 288px. Whisper Shadow + 흰 padding 카드.
- **Pricing 모바일 reorder** — 모바일에서 hero 바로 아래에 결제 카드(프리미엄 이용권 + 결제하기 버튼)를 배치. plan selector(3/6/12개월)는 그 아래로. 사용자가 첫 화면에서 바로 결제 가능. 데스크톱은 기존 좌우 split 유지.
- **월 가격 우선 hierarchy** — pricing 페이지 전체를 monthly-first로. 각 plan 카드에서 월 가격이 큰 글씨, 총액이 작게. Purchase card도 동일. Hero "월 990원부터" → "월 약 740원부터" (실제 최저 monthlyPrice와 정합).
- **월 가격 표시 약 X원으로 깔끔하게** — 967원/817원/742원처럼 끝자리 지저분한 숫자 대신 10단위로 내림(`Math.floor(p/10)*10`) + "약" prefix. 약 960원 / 약 810원 / 약 740원. 항상 실제보다 낮게(under-represent) → 사용자 친화 + 정직(총 결제 라인은 정확 금액 그대로).

### Fixed
- **모든 페이지 nav 수직 정렬 버그** — `globals.css`의 `nav a { display: inline-flex; align-items: center }` 룰을 Tailwind의 `sm:inline` 클래스가 덮어써서 텍스트가 44px 터치 타겟 박스 위쪽에 붙던 버그. 홈/pricing/dashboard nav 모두 `hidden sm:inline-flex`로 교체. 픽셀 단위 정렬 검증됨.
- **Pricing hero "월 990원부터" 가격 정합성** — 실제 최저 monthlyPrice는 742원인데 hero는 990원으로 표시되던 텍스트 mismatch 수정.

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
