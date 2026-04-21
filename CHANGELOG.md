# Changelog

좌표.to의 모든 변경 사항이 여기에 기록됩니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)을 따르며, 버전은 [SemVer](https://semver.org/lang/ko/)를 따릅니다.

## [0.14.1] - 2026-04-22 — PostHog env 이름을 공식 규격에 맞춤

PostHog Cloud 대시보드가 제공하는 `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` 이름과 맞추기 위해 env 변수 이름 변경. Vercel 환경변수에 그대로 붙여넣을 수 있게 됨.

### Changed
- `NEXT_PUBLIC_POSTHOG_KEY` → **`NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`** (src/lib/analytics.ts, src/app/providers.tsx, .env.example, tests/analytics.test.ts).

## [0.14.0] - 2026-04-22 — PostHog 분석 + 퍼널 이벤트 (Lane B)

검색→클릭→단축→가입 퍼널의 **측정 레이어**. SEO 로 트래픽이 들어오기 시작하면 어느 단계에서 사람이 빠지는지 알아야 다음 개선을 할 수 있습니다. PostHog Cloud 무료 티어(월 1M events + 5k 세션리플레이) 를 깔고, 8 개의 타입 안전 이벤트를 코드에 심었습니다. UTM 은 첫 랜딩에서 sessionStorage 에 저장되어 `signup_completed` 이벤트에 attach — 광고 집행 시 어떤 캠페인이 실제 가입으로 이어지는지 추적 가능. `NEXT_PUBLIC_POSTHOG_KEY` 가 비면 트래킹은 전부 no-op 이라 키 발급 전 배포해도 안전. `autocapture: false` — 명시적 이벤트만 추적.

### Added
- **PostHog 통합** — `posthog-js` 설치, `src/app/providers.tsx` 에서 초기화. `autocapture: false` + `capture_pageview/pageleave: true`. `persistence: localStorage+cookie`. 서버/키 없음 시 안전하게 no-op.
- **타입 안전 이벤트 스키마** — `src/lib/analytics.ts`. 8 개 이벤트(`shorten_submitted`, `shorten_created`, `shorten_error`, `result_page_viewed`, `upsell_cta_clicked`, `signup_started`, `signup_completed`, `custom_slug_first_used`) 각각의 properties 를 generic 으로 enforcement — 잘못된 필드명 쓰면 타입 에러.
- **UTM 캡처** — `captureUtmFromLocation()` + `getStoredUtm()`. 첫 랜딩 시 `utm_source/medium/campaign/term/content` 5 종을 sessionStorage(`vecto.utm`)에 1 회만 저장 (덮어쓰지 않음). `signup_completed` 에 attach. 광고 CPC → 가입 CAC 측정 가능.
- **이벤트 발화 지점**:
  - 홈 단축 폼(`HeroInteractive.tsx`): 제출 시 `shorten_submitted`(`has_custom_slug`), 성공 시 `shorten_created`(`slug`, `is_anon`) + `result_page_viewed`, 실패 시 `shorten_error`(`code`, `http_status`).
  - OAuth 로그인(`GoogleSignInButton.tsx`): 클릭 시 `signup_started`(`provider: "google"`).
  - Auth 콜백(`/auth/callback/route.ts`): 성공 리다이렉트에 `?auth=success` 마커 추가 — 클라이언트 Providers 가 감지해 `signup_completed` + `identify(user.id)` 발화, sessionStorage UTM 을 properties 로 attach, 마커 URL 은 `history.replaceState` 로 제거.
  - 대시보드 슬러그 생성(`dashboard-client.tsx`): 응답의 `is_first_slug` 플래그를 받아 첫 번째일 때만 `custom_slug_first_used`(`slug_length`).
- **`/api/slugs` `is_first_slug` 응답 필드** — INSERT 직후 유저의 총 슬러그 수를 `{ count: "exact", head: true }` 로 HEAD 쿼리 (row 페이로드 없음 → 오버헤드 최소). `count === 1` 이면 첫 슬러그.
- **env placeholder** — `.env.example` 에 `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` 추가. 키 비면 no-op.

### Changed
- **Root layout** — `<Providers>` 클라이언트 래퍼가 `<main>` + `<SiteFooter>` 를 감쌈. PostHog init + UTM 캡처 + `?auth=success` 감지 전부 이 안에서 처리.

### Tests
- **`tests/analytics.test.ts`** (11 tests) — `extractUtm` 파싱, sessionStorage 1 회 저장/덮어쓰지 않음, `posthogEnabled()` 키 유무 분기, `track/identify/resetIdentity` no-op 안전성 + PostHog 있을 때 올바른 호출.
- **`tests/api-slugs.test.ts`** — 모의 Supabase 체인에 HEAD count 쿼리 지원 추가(`slugs:count` 큐). 성공 경로에 count 응답 enqueue.
- **`tests/auth-callback.test.ts`** — 리다이렉트 URL 의 `?auth=success` 마커 기대값 업데이트.

### Notes
- **배포 후 체크리스트:** (1) Vercel 환경변수에 `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` 추가, (2) PostHog 대시보드에서 8 개 이벤트 수신 확인, (3) 퍼널 대시보드 생성 (`shorten_submitted` → `shorten_created` → `signup_started` → `signup_completed` → `custom_slug_first_used`), (4) UTM 세그먼트 분해 검증.
- **설계 근거:** `~/.gstack/projects/fadak0828-Vecto/fadak-claude-eager-wescoff-cf6471-design-20260422-000704.md` — 8 개 이벤트 목록, `autocapture: false` 정책, UTM attach 타이밍 모두 design doc 의 "Resolved Decisions" 섹션에서 확정.
- **NOT in scope:** `upsell_cta_clicked` 발화 지점(Lane C 의 결과 페이지 업셀 CTA 가 아직 존재하지 않음 — 스키마만 정의), `paid_conversion` 이벤트(v0.12 의 결제 UI 숨김 플래그 중이므로 제외), PostHog 세션리플레이 설정, 퍼널/대시보드 프로비저닝.
- **다음 단계:** Lane C (홈 히어로 Before/After 강화 + 결과 페이지 업셀 CTA — `upsell_cta_clicked` 발화 지점 등장) 는 별도 PR.

## [0.13.0] - 2026-04-22 — SEO 기반공사 (Lane A)

검색엔진에 사이트가 존재한다는 사실 자체를 알리기 위한 기초 작업입니다. 지금까지는 `좌표.to` 로 검색해도 결과에 뜨지 않았습니다. 이제는 Google / Bing / 네이버가 사이트 구조를 읽을 수 있게 `robots.txt`, `sitemap.xml`, 메타 태그, 구조화 데이터(JSON-LD) 가 갖춰졌습니다. Bitly 와 링크트리가 차지한 "url 단축" 키워드 공간에 진입하기 위한 첫 단추입니다. 사용자 UI 는 그대로이고 전부 크롤러 대상 변경.

### Added
- **`/robots.txt` 동적 라우트** — `src/app/robots.ts`. `/go/`, `/api/`, `/auth/`, `/dashboard`, `/settings`, `/payment`, `/reserve` 를 Disallow. 크롤 예산을 공개 페이지에 쓰도록 유도하고, 단축 URL 경유지가 인덱싱되지 않게 막음.
- **`/sitemap.xml` 동적 라우트** — `src/app/sitemap.ts`. 홈, `/pricing`, `/privacy`, `/terms` 네 개의 정적 공개 라우트만 포함. 수만 개의 공개 서브링크(`/[namespace]/[slug]`)가 크롤 예산을 터뜨리지 못하게 의도적으로 제외.
- **JSON-LD 구조화 데이터** — `src/components/json-ld.tsx`. `Organization` + `WebSite` (SearchAction 포함) + `SoftwareApplication` 세 타입을 `@graph` 로 묶어 루트 레이아웃에 주입. Google Rich Results + 네이버 브랜드 엔티티 매칭 확보. `businessInfo` 재사용.
- **SEO 헬퍼** — `src/lib/seo.ts`. `SITE_URL` 상수 (유니코드 `https://좌표.to` — 브랜드 SERP 매칭 우위) + `buildMetadata({ title, description, path, noindex })` 헬퍼. 각 라우트가 동일한 형태로 title / description / canonical / openGraph / twitter / robots 메타를 선언.

### Changed
- **루트 레이아웃 (`src/app/layout.tsx`)** — `metadataBase: new URL(SITE_URL)` 추가. `title` 을 `default` + `template` 구조로 바꿔 하위 페이지가 자동으로 ` — 좌표.to` 접미사를 받도록. `alternates.canonical`, `twitter` 카드, `robots: { index: true, follow: true }` 명시. `<JsonLd />` 를 body 최상단에 삽입.
- **`/go/[slug]` 리다이렉트 라우트** — `X-Robots-Tag: noindex, nofollow, nosnippet` 헤더를 302 리다이렉트 + 400 / 404 / 410 모든 응답에 부착. 단축 URL 경유지가 SERP 에 뜨면 스팸 리다이렉트 경유지로 오인받아 브랜드 신뢰가 추락할 수 있는 리스크를 차단.
- **`/pricing`** — `buildMetadata` 헬퍼로 per-route metadata 선언. 결제 연동 전이므로 `noindex: !paymentsEnabled` 로 색인 보호.

### Tests
- 29 개 신규 테스트 추가 — `seo.test.ts`, `robots.test.ts`, `sitemap.test.ts`, `go-noindex.test.ts`, `json-ld.test.tsx`. 394 / 394 통과.

### Notes
- **배포 후 체크리스트:** (1) `curl -I https://좌표.to/go/test` 로 `X-Robots-Tag` 헤더 확인, (2) `/robots.txt` + `/sitemap.xml` 수동 검증, (3) Rich Results Test 제출, (4) GSC 도메인 소유권 등록, (5) Vercel primary domain 설정으로 `xn--h25b29s.to` → `좌표.to` 308 확인.
- **NOT in scope:** 콘텐츠 SEO (블로그 / 가이드), 네이버 최적화 별도 전략, 공개 서브링크 인덱싱 정책, OG 이미지 폰트 번들링 — 후속 PR 로 이월.
- **다음 단계:** Lane B (PostHog 무료 티어 + 8 이벤트 스키마 + UTM 캡처) 와 Lane C (홈 히어로 Before / After 강화) 는 별도 PR. 설계 결정 근거는 `~/.gstack/projects/fadak0828-Vecto/` 의 design doc 에 기록됨.

## [0.12.0] - 2026-04-21 — 결제 UI 일괄 숨김 (pre-launch gating)

PG 심사·계약이 끝나기 전에 사이트를 먼저 배포해 SEO 색인과 사전 작업을 쌓기 위한 조치입니다. 결제 연동에 의존하는 UI를 환경변수 `NEXT_PUBLIC_PAYMENTS_ENABLED` 하나로 일괄 토글합니다. 플래그를 켜지 않은 채 배포하면 `/pricing`, `/payment/*`는 404로 응답하고, 홈·푸터·히어로·대시보드·프로필·만료 이메일·만료 HTML에 있던 "프리미엄" / 가격 페이지 링크가 모두 사라집니다. 백엔드(결제 API, 웹훅, cron, Supabase 스키마)는 그대로 살아 있어서 PG 계약이 끝나는 시점에 ENV 값만 `"true"`로 바꿔 재배포하면 됩니다.

### Added
- **기능 플래그 헬퍼** — `src/lib/feature-flags.ts` 에 `paymentsEnabled` 하나만 노출. `NEXT_PUBLIC_PAYMENTS_ENABLED === "true"` 일 때만 결제 관련 UI를 렌더. 서버/클라 양쪽에서 import 가능.
- **`/payment` 라우트 그룹 레이아웃** — `src/app/payment/layout.tsx` 에서 플래그 검사 후 `notFound()`. 직접 링크/북마크로 들어와도 하위 client 페이지(/payment/complete)까지 한번에 차단.

### Changed
- **`/pricing` 페이지** — 플래그 OFF 시 `notFound()` 반환. SEO 크롤러가 "결제 안 되는 상점"으로 색인하지 못하게 404를 돌려줌.
- **홈/푸터 네비** — `src/app/page.tsx`, `src/components/site-footer.tsx`, `src/app/_components/HeroInteractive.tsx` 의 `/pricing` 링크·"프리미엄" 버튼을 플래그로 감쌈. Hero 업그레이드 프롬프트는 플래그 OFF 시 `/dashboard` 로 대체되고 CTA 문구도 "무료로 시작 →"으로 바뀜.
- **대시보드** — `PaymentStatus`, `ClickStats` lock card, "프리미엄으로 받는 것" 프리뷰 블록이 모두 플래그 뒤로 숨음. 결제 플로우가 없는 상태에서 구독 상태 뱃지나 블러 업셀이 노출되지 않음.
- **공개 프로필 프로모 배너** — `src/components/public-profile-view.tsx` 의 `ProfilePromoBanner` (무료 사용자 프로필 상단 안내 바) 가 플래그 OFF 시 완전히 사라짐.
- **만료 안내 이메일** — `src/app/api/cron/expire/route.ts` 의 "이용권 갱신하기" 버튼이 플래그 OFF 시 제거. 본문은 그대로 유지.
- **만료 네임스페이스 HTML** — `src/app/[namespace]/[sub]/route.ts` 의 만료 페이지 "이용권 갱신하기 →" 링크 조건부.
- **`.env.example`** — `NEXT_PUBLIC_PAYMENTS_ENABLED` 섹션 추가, 기본값 `"false"` 및 용도 설명.

### Notes
- 결제 API 라우트(`/api/payment/*`, `/api/subscription/cancel`, webhook), Vercel cron, Supabase 구독 테이블은 전부 살아 있음 — 백엔드 개발·내부 테스트 계속 가능.
- 플래그 끈 상태에서 "프리미엄"이라는 단어는 `/terms` 법적 본문에만 남음 (링크 없음). 법적 안전을 위해 그대로 둠.
- 플래그 켜는 순간 되돌리는 작업 없음 — ENV `"true"` 로 설정 후 재배포만.

## [0.11.0] - 2026-04-10 — 사이트 전반 속도 개선

사이트가 체감적으로 훨씬 빨라졌습니다. 첫 방문자가 처음 보는 랜딩 페이지는 이제 서버에서 HTML로 떨어집니다 (이전엔 빈 껍데기 + JS 번들 다운로드를 기다려야 했음). 폰트도 더 이상 외부 CDN (fonts.googleapis.com, jsdelivr) 을 두 번 건너뛰지 않고 빌드에 내장되어 첫 렌더부터 올바른 글꼴로 나옵니다. 로그인 후 대시보드와 설정 페이지는 브라우저에서 Supabase로 4번 왕복하던 것을 서버에서 한 번에 병렬로 가져와 로딩 스피너가 사라졌습니다. 링크를 추가할 때도 이전에는 목적지 사이트의 메타데이터를 기다리느라 최대 2초까지 버튼이 멈춰 있었는데, 이제는 즉시 응답하고 메타데이터는 백그라운드에서 채워집니다.

### Changed
- **랜딩 페이지 SSR 전환** — `src/app/page.tsx` (816줄) 이 서버 컴포넌트로 재작성되고 인터랙티브 영역 (폼, 타이핑 애니메이션, QR 미리보기) 만 `HeroInteractive` 클라이언트 아일랜드로 분리. 정적 마케팅 섹션은 서버에서 HTML로 즉시 도착. 첫 방문 FCP 가 크게 개선되고 검색 엔진 크롤러에게도 완성된 HTML 이 노출됨.
- **대시보드 SSR 전환** — `src/app/dashboard/page.tsx` 가 서버 컴포넌트. 기존 `loadData()` 의 4왕복 (auth → namespaces → slugs → subscriptions) 이 서버에서 `Promise.all` 로 병렬 실행되어 로딩 스피너 제거. 인터랙션 로직은 `dashboard-client.tsx` 로 분리되었고 mutation 후에는 `router.refresh()` + 낙관적 업데이트로 최신화.
- **설정 페이지 SSR 전환** — 대시보드와 동일 패턴. `settings/page.tsx` + `settings-client.tsx` 분리. 공유 서버 로더 `src/lib/server/user-namespace.ts` 를 `React.cache` 로 감싸 대시보드 ↔ 설정 이동 시 같은 요청 안에서는 중복 쿼리 없음.
- **가격표 SSR 분리** — `pricing/page.tsx` 가 서버 컴포넌트가 되고 PortOne 결제 플로우는 `CheckoutCard` 클라이언트 아일랜드로 분리 (341줄 → 서버 대부분 + 작은 섬).
- **링크 생성 API 비동기 OG fetch** — `POST /api/slugs` 가 네임스페이스 소유권 체크 + 중복 slug 체크를 `Promise.all` 로 병렬화하고, OG 메타데이터 fetch 는 `next/server` 의 `after()` 로 응답 이후 백그라운드에서 실행. 사용자는 링크 생성 버튼 누르고 500ms 이내에 응답받음 (이전: 500~2000ms, 타깃 URL 이 느리면 최대 2초).
- **공개 프로필 요청당 쿼리 중복 제거** — `src/app/[namespace]/page.tsx` 의 `generateMetadata` 와 페이지 렌더가 `React.cache` 로 감싼 `getNamespaceBundle(decoded)` 을 공유. 이전에는 `namespaces` 테이블을 같은 요청에서 두 번 쿼리하고 있었음.
- **폰트 자체 호스팅 (next/font)** — `src/app/layout.tsx` 가 `fonts.googleapis.com` 과 `cdn.jsdelivr.net` 의 외부 `<link>` 2개를 제거하고 Manrope / Plus Jakarta Sans (Google) + Pretendard Variable (로컬 woff2) 을 `next/font` 로 자체 호스팅. 렌더-블로킹 외부 CSS 요청 0건, layout shift 방지를 위한 fallback metrics 자동 주입. 21개 컴포넌트의 인라인 `fontFamily: "Manrope, sans-serif"` 를 `fontFamily: "var(--font-manrope), sans-serif"` 로 일괄 치환.
- **`slugs` 테이블 정렬 인덱스** — 새 마이그레이션 `supabase/013_slugs_created_at_index.sql` 로 `slugs_namespace_created_at_idx (namespace_id, created_at asc)` 부분 인덱스 추가. 대시보드/설정/공개 프로필이 공통으로 쓰는 `WHERE namespace_id = X ORDER BY created_at ASC` 쿼리가 memory sort 를 피함. 프로덕션 DB 에 이미 적용됨.

### Added
- **서버 전용 공유 로더** — `src/lib/server/user-namespace.ts` 에 `getUserNamespaceData()` 함수 추가. `React.cache` 로 감싸서 같은 요청 안에서 1회만 실행. 대시보드와 설정 페이지가 동일한 쿼리를 공유해 DRY 와 성능을 동시에 확보.
- **링크 추가 후 OG 지연 반영** — 대시보드/설정의 `handleAddLink` 가 링크 추가 직후 낙관적으로 리스트에 표시하고, 2초 후 한 번 더 `router.refresh()` 를 호출해 백그라운드 `after()` 가 채운 OG 메타데이터를 가져옴.

## [0.10.0] - 2026-04-09 — 서브링크 상세보기, QR 공유, OG 카드

프로필 페이지의 서브링크가 살아났습니다. 각 서브링크 옆의 QR 아이콘을 누르면 전체 URL과 큰 QR 코드가 뜨고, "이미지로 저장"으로 현장에서 바로 인쇄 가능한 PNG가 떨어집니다. 수업, 부스, 전단지에 쓰세요. 서브링크를 카카오톡이나 페이스북에 공유하면 좌표.to 브랜드 이미지가 아니라 **실제 목적지 사이트의 썸네일**이 나옵니다 (이전엔 엉뚱하게 좌표.to 로고가 떴음). 공개 프로필 카드에는 목적지의 이미지가 작은 썸네일로 붙어서 방문자가 클릭 전에 어떤 링크인지 한눈에 알 수 있습니다.

### Added
- **서브링크 상세 모달 + 큰 QR** — 공개 프로필 페이지에서 서브링크 카드 옆의 QR 아이콘을 누르면 전체 `좌표.to/{네임스페이스}/{slug}` URL과 320x320 스캔 가능한 QR이 모달로 뜹니다. "URL 복사"와 "이미지로 저장" 두 액션 제공. 포털 렌더링(`createPortal` → `document.body`)으로 조상 `transform` 스태킹 컨텍스트에서 탈출해서 어떤 페이지 구조에서도 떨림 없이 viewport 중앙 고정. ESC / 배경 클릭 / X 버튼으로 닫기.
- **이미지로 저장** — 모달의 ghost 버튼. 960x1200 portrait canvas에 타이틀 + 800x800 고해상도 QR + 좌표.to 캡션을 합성해 `좌표_{네임스페이스}_{slug}.png`로 다운로드. 흰 배경이라 프린트/SNS에 바로 쓸 수 있음. 한글 타이틀은 글자 단위 그리디 래핑 + 2줄 말줄임.
- **서브링크 OG 메타데이터 수집** — 대시보드/설정에서 서브링크를 생성하거나 목적지 URL을 바꾸면 백엔드가 2초 안에 목적지 페이지를 한 번 긁어서 `og:title`, `og:description`, `og:image`, `og:site_name`을 DB에 저장. 실패하면 "다시 가져오기" 버튼으로 수동 재시도 가능. 새 서버 라이브러리 `src/lib/og-fetcher.ts`가 native fetch + 정규식 파서로 의존성 없이 동작.
- **공유 프리뷰 HTML (봇 UA 감지)** — `GET /{네임스페이스}/{slug}`에 카카오톡/페북/트위터/슬랙 등 크롤러 UA로 요청이 오면 302 대신 `og:*` 메타가 채워진 HTML을 응답. `og:url`이 **목적지 URL**을 가리키므로 링크 프리뷰에 실제 타겟 사이트의 썸네일이 뜸 (이전엔 좌표.to 루트의 `opengraph-image.tsx`가 auto-fallback되어 브랜드 이미지가 대신 나오던 문제). 일반 브라우저는 그대로 302로 즉시 리다이렉트 — 사용자 지연 0.
- **Editorial sublink card** — 공개 프로필 페이지의 서브링크 리스트가 80x80 썸네일 카드로 업그레이드. slug가 primary headline (Plus Jakarta Sans bold), 좌표 경로는 uppercase tracking-wider 러닝헤드 메타. 썸네일이 없으면 이니셜 박스로 폴백 (primary → primary-container 135° 그라디언트, 아바타와 같은 패턴). DESIGN.md "High-End Editorial, No-Line, Tonal Layering" 준수. AI slop 체크리스트(rounded-full, colored-border, scale hover 등) 전부 회피.
- **`supabase/012_sublink_og_metadata.sql`** — `slugs` 테이블에 `og_title`(≤500), `og_description`(≤2000), `og_image`(≤2048), `og_site_name`(≤200), `og_fetched_at`, `og_fetch_error` 컬럼 추가. `char_length` CHECK 제약으로 DB 레벨 방어.
- **`POST /api/slugs` / `DELETE /api/slugs/:id` / `POST /api/slugs/:id/refresh-og`** — 서브링크 CRUD API. 기존 `/api/shorten`(무료/익명) 플로우는 건드리지 않고, 네임스페이스 오너 인증이 필요한 경로는 별도 엔드포인트로 분리. 모든 write에 2-step ownership 검증 (slug → namespace → `auth.uid() === owner_id`).

### Changed
- **대시보드 + 설정 페이지가 `/api/slugs` 경유** — 기존엔 Supabase 클라이언트에서 직접 insert/delete하던 것을 서버 라우트로 전환. OG 동기 fetch가 서버에서 돌아야 하기 때문. 에러 플로우와 UX는 기존과 동일.
- **`PublicProfileView` → `SublinkCard` 위임** — 카드 내부 렌더링을 공유 컴포넌트로 추출해서 `/[namespace]/page.tsx`(live)와 `/settings`(preview) 양쪽이 같은 마크업을 쓰도록 통일. `tests/public-profile-parity.test.ts`에 드리프트 방지 계약 추가.

### Fixed
- **SSRF 방어 강화** — `og-fetcher.ts`의 private IP 블록리스트가 IPv4 canonical form(`net.isIPv4`)만 허용. 이전엔 `http://0177.0.0.1/`(octal), `http://2130706433/`(dword), `http://0x7f.0.0.1/`(hex)이 regex 프리필터를 통과해서 undici가 `127.0.0.1`로 연결하는 취약점이 있었음. IPv6 블록리스트에 NAT64 (`64:ff9b::/96`), 6to4 (`2002::/16`), v4-mapped hex (`::ffff:7f00:1`), unspecified 추가. 레드팀 리뷰 후속.
- **DB CHECK 위반 DoS + 스키마 누출** — 악의적인 목적지 사이트가 900KB `og:description`을 내려주면 `POST /api/slugs`가 Postgres CHECK 위반으로 500을 내뱉고, 그 에러 응답에 DB 에러 메시지가 그대로 노출되던 문제. OG fetcher에서 사전 truncate + API에서 raw `error.message` echo 제거.
- **URL userinfo credential leak** — `http://user:pass@target/`를 서브링크로 등록하면 서버 fetch에 `Authorization: Basic` 헤더가 실려 upstream으로 크레덴셜이 새던 문제. redirect hop마다 `username`/`password` 리셋.
- **og_image Referer 누출** — 모달/카드의 `<img src={og_image}>`에 `referrerPolicy="no-referrer"` 추가. 악의적 목적지 사이트가 `og:image`를 트래킹 픽셀로 설정해 viewer의 좌표.to 세션 경로를 수집할 수 있던 경로 차단.
- **모달 떨림 버그** — `SublinkCard` wrapper에 `hover:translate-y` 클래스가 있었고 QR 버튼이 그 자식이라, 커서가 카드 hover 경계를 넘나들 때 `transform` 스태킹 컨텍스트가 토글되며 `position:fixed` 모달이 viewport가 아니라 카드 박스에 재앵커링되면서 backdrop blur가 깜빡이던 문제. 이중 방어로 해결: ① 모달을 `document.body`에 `createPortal`로 붙이고 ② hover/transition을 wrapper 밖 anchor로 이전해서 카드 wrapper가 아예 transform context를 만들지 않도록 함.
- **서브링크 공유 시 좌표.to 브랜드 이미지 override** — 카카오톡/페북이 302를 따라가지 않고 최초 URL의 메타만 긁는데, Next.js의 `opengraph-image.tsx` file convention이 auto-apply되어 모든 서브링크 공유에 좌표.to 루트 이미지가 나오던 문제. 봇 UA 감지 + 전용 HTML 응답으로 해결.

## [0.9.0] - 2026-04-08 — 첫 1개월 무료 체험 (런칭 이벤트)

이제 구독하면 첫 1개월은 공짜. 카드/카카오페이 등록만 하면 30일 동안 프리미엄 전 기능을 쓸 수 있고, 그 뒤에 월 ₩2,900이 자동 결제됩니다. 체험 중 해지하면 과금은 없어요. 런칭 위크 2주 동안은 `/pricing` 상단에 이벤트 배너가 뜨고, 그 뒤에는 카피 없이 상시 체험이 유지됩니다. Stripe/Netflix 방식 — 코드 경로 하나, 이벤트 gating은 환경변수 하나(`NEXT_PUBLIC_EVENT_END_AT`)로 분리.

구조 설계 근거: "영구 무료이용권 선착순 100명" 같은 수익화 직전 스타트업이 하면 안 되는 인센티브 대신, 빌링키 등록을 게이트로 둬서 deal hunter를 필터링하고 1개월 무료 → 월 결제로 conversion funnel을 자동 완성. 이벤트 종료 후에도 구독 경로 하나로 수렴.

### Added
- **Trialing 구독 상태** — `supabase/011_trial_launch.sql` 마이그레이션으로 `subscriptions.status` CHECK에 `'trialing'` 추가. `start_trial(sub_id, days)` RPC가 pending → trialing 전환과 `current_period_end = now + 30d`, `namespaces.paid_until = trial_end` 싱크를 원자적으로 처리. `subs_one_active_per_user` UNIQUE INDEX에도 trialing 포함해서 한 유저에 체험 + 유료 동시 금지.
- **PortOne `schedulePayment` 래퍼** — `src/lib/portone.ts`에 `schedulePayment({billingKey, paymentId, payAt, amount, orderName})` 추가. V2 `POST /payment-schedules/{paymentId}` 엔드포인트 호출, 5초 타임아웃, AbortController로 웹훅 timeout 방지. 빌링키 발급 직후 D+30 자동 결제 예약.
- **`start_trial` RPC + 런칭 funnel 뷰** — `start_trial` SQL 함수로 pending 구독을 trialing으로 atomic 전환. `launch_event_funnel_v1` 뷰가 `auth.users` + `subscriptions` + `payments` 조인해서 cohort 일자별 가입 → 빌링키 등록 → D+30 전환 → D+60 유지 4단 지표를 바로 쿼리 가능하게 제공. 외부 analytics SaaS 없이 Supabase 하나로 런칭 측정.
- **대시보드 Trial 인디케이터** — `PaymentStatus` 컴포넌트에 새 state. D-30 ~ D-4 는 `secondary-container` 배경 + "무료 체험 중 · D-N" chip, D-3 이하는 `--error` 솔리드 배경 + 흰 글씨 + "D-N · 곧 자동 결제" urgent chip + aria-live 안내. `aria-label="자동 결제까지 N일 남음"` 으로 스크린리더 대응.
- **런칭 위크 배너** — `/pricing` 상단에 `NEXT_PUBLIC_EVENT_END_AT` ISO 타임스탬프가 미래이면 자동 노출되는 full-width 배너. primary → primary-container 135° 그라디언트, "LAUNCH WEEK · 런칭 위크 한정, 첫 1개월 무료". 환경변수 미설정/과거면 조용히 사라짐 — 이벤트 종료 후 코드 배포 없이 배너만 철수.
- **Trial regression 테스트 스위트** — `tests/trial-launch.test.ts` 로 A2(process_subscription_charge 가드), A4(cancel_subscription 가드), A6(schedulePayment 실패 롤백) 세 개 silent-failure 버그 회귀 방어. trial cancel 응답 카피, D-N urgency 전환, 30일 boundary까지 20+ 케이스 커버.

### Changed
- **Webhook BillingKey.Issued — trial flow 전환** — `src/app/api/payment/webhook/route.ts`가 이제 빌링키 발급 직후 `chargeBillingKey(₩2,900)` 대신 `schedulePayment(+30d)` + `start_trial` RPC 를 호출. 실패 시 `portone_billing_key_id` NULL 롤백 + `status='failed'` 로 사용자가 `/pricing`에서 재시도 가능. 이전에는 schedule 실패 시 사용자가 영구 trialing에 갇히는 silent 버그 였음 (eng review A6).
- **`/pricing` 히어로 재작성** — "좌표.to 프리미엄"(브랜드명) 대신 "첫 1개월 무료"(오퍼)가 H1. 큰 ₩2,900 가격 디스플레이 제거(line 200-211 삭제), 서브헤드로 강등. CTA "카카오페이로 시작하기" → "1개월 무료로 시작하기". 신뢰 문구 "카카오톡 인증 한 번이면 끝 · **무료 체험 중 해지 시 과금 없음**" 으로 교체. DESIGN.md No-Line 원칙 위반 2건(1px border-bottom/top) 동시에 수정 — `surface-low` 톤 블록으로 features 섹션 구분.
- **`process_subscription_charge` / `cancel_subscription` RPC 가드 확장** — 두 RPC 모두 `WHERE status IN (...)` 에 `'trialing'` 포함. 이전에는 `('active', 'past_due')` 만 허용해서 D+30 scheduled charge가 도착해도 period가 안 넘어가고(A2), 체험 중 해지가 "찾을 수 없다" 에러를 내던(A4) silent 버그. 회귀 테스트 셋으로 방어.
- **체험 중 해지 응답 카피 분기** — `/api/subscription/cancel` 이 pre-check로 status를 확인하고, trialing 이었으면 "무료 체험이 해지되었어요. {trial_end}까지 프리미엄 기능을 계속 쓸 수 있고, 이후 자동으로 무료 플랜으로 돌아갑니다. **과금은 없습니다.**" 로 응답. 일반 해지 카피와 분리 — "과금은 없습니다" 신뢰 신호가 체험 해지에서 결정적.
- **D-7 만료 예정 이메일 trial 분기** — `/api/cron/expire` 가 namespace와 연결된 subscription status를 조인해서 `trialing`이면 "{namespace} 무료 체험이 N일 후 끝납니다" 제목 + "체험이 끝나면 월 ₩2,900이 자동 결제됩니다. 원치 않으시면 설정에서 1클릭으로 해지하실 수 있고, 그 경우 과금은 없습니다." 본문 + `/settings` CTA. 유료 만료 이메일과 분리.
- **`PaymentStatus` 컴포넌트 타입 확장** — `Subscription.status` 에 `'trialing'` 추가. 대시보드 페이지 타입도 동반 업데이트. State derivation 5-state → 6-state (trialing이 free와 active 사이).

## [0.8.4] - 2026-04-08 — 무료 사용자 서브링크 복구 + 프리뷰 드리프트 제거

두 개의 서로 다른 문제를 한 번에 정리. (1) 무료 사용자의 서브링크(`좌표.to/내이름/노션`)가 402 "아직 활성화되지 않은 좌표" 페이지로 차단되던 문제를 풀었습니다. README에 선언된 BM("무료 = 전 기능 무제한 + 작은 안내 1줄")과 v0.7 리팩터에서 이미 프로필 페이지 차단은 해제했는데 서브링크 리다이렉트 route 만 함께 풀리지 않았던 leftover. 지인에게 공유된 서브링크가 돌지 않는 건 네트워크 효과 파괴. (2) `/settings`의 실시간 보기(폰 프레임)가 실제 공개 페이지(`/[namespace]`)와 완전히 다른 Linktree-clone 마크업이었던 드리프트 버그. 사용자가 설정에서 본 것과 실제 공유 링크의 모습이 달랐음.

### Fixed
- **무료 네임스페이스 서브링크 통과** — `src/app/[namespace]/[sub]/route.ts` 의 `payment_status === "free"` 차단 블록 제거. free 네임스페이스도 active 와 동일하게 302 리다이렉트. `expired` 30일+ grace 만료 차단은 유지. 회귀 테스트 `tests/namespace-expiry.test.ts` 의 "free 차단" 케이스를 "free 통과"로 뒤집고 BM 근거를 주석에 박음. dead `unpaidHtml` 함수 정리.

### Changed
- **`PublicProfileView` 단일 진실 공급원** — 공개 프로필 렌더링을 `src/components/public-profile-view.tsx` 로 추출. `/[namespace]/page.tsx` 와 `/settings/page.tsx` 양쪽이 같은 컴포넌트를 import. `variant="live" | "preview"` 로 외형 축소만 제어하고 구조(요소 순서, 정렬, 레이아웃)는 공유. "use client" 없이 server/client 양쪽에서 쓸 수 있는 순수 presentational. 설정 페이지의 기존 Linktree-clone 마크업(gradient Cover + centered avatar + `mt-10 px-5 text-center`) 전부 삭제. `tests/public-profile-parity.test.ts` 로 구조 drift 재발을 정적 문자열 매칭으로 차단.

## [0.8.3] - 2026-04-08 — 인앱 브라우저 Google 로그인 차단 우회

카카오톡/인스타그램/페이스북/라인 등 **앱 내장 브라우저**에서 좌표.to 링크를 열어 Google로 로그인하려 하면 Google이 "요청 세부정보:" 에러를 띄우며 거부하던 문제 해결. Google의 2021년 `disallowed_useragent` 정책 때문에 우회가 아닌 외부 브라우저로 **탈출**시키는 것이 유일한 해법. 한국 사용자의 주된 진입 경로(카톡 공유 링크 → 카톡 인앱 브라우저)가 직격이어서 v0.8.0 Google OAuth 전환 이후 잠재적으로 많은 로그인 시도가 소리 없이 실패했을 가능성.

### Fixed
- **인앱 브라우저 감지 + 탈출 안내** — `/auth/login` 페이지가 KakaoTalk, KakaoStory, NAVER 인앱, Daum 앱, Instagram, Facebook(FBAN/FBAV), Line, Threads, 일반 Android WebView(`; wv)`) UA를 감지해서 Google 버튼 대신 안내 카드를 노출. Android는 "Chrome으로 열기" 버튼이 `intent://` 스킴으로 Chrome을 직접 띄우고(Chrome 미설치 시 `S.browser_fallback_url`로 폴백), iOS는 "링크 복사" + "⋯ 메뉴 → '다른 브라우저로 열기'" 안내. "그래도 여기서 시도하기" 폴백 링크로 사용자 주체성 보장(UA spoofer 사용자, 오탐 케이스). 감지 로직은 `src/lib/in-app-browser.ts`에 순수 함수로 분리해 23개 UA 단위 테스트로 회귀 방어.

## [0.8.2] - 2026-04-08 — 소셜 공유 OG 이미지

카카오톡, 슬랙, 트위터 같은 곳에 좌표.to 링크를 붙여넣을 때 뜨는 프리뷰 카드가 이제 브랜드 이미지로 나옵니다. 지금까지는 빈 카드 + URL 텍스트였는데, 앞으로는 "짧고 의미있는 한글 URL" 헤드라인 + deep mint 그라디언트 CTA가 보입니다.

### Added
- **Open Graph 이미지** — `/opengraph-image` 라우트에서 1200×630 PNG를 빌드 시점에 생성. Next.js 파일 컨벤션(`src/app/opengraph-image.tsx`)으로 모든 페이지에 자동 적용. Noto Sans KR을 빌드 시 Google Fonts에서 가져와 임베드해 한글 글리프 완전 지원. DESIGN.md 팔레트(#1a1c1c charcoal, #006565 → #008080 deep mint 그라디언트, surface 그라디언트 배경) 준수.

## [0.8.1] - 2026-04-08 — 디자인 감사 후속 수정

전체 앱 흐름(로그인, 결제 포함) 디자인 리뷰에서 나온 17개 이슈를 한 번에 정리. 사용자가 가장 먼저 보는 화면 — 홈, 로그인, 결제, 설정 — 의 계층 구조, 로딩 상태, 터치 타깃, 예약어 라우팅을 손봤습니다.

### Added
- **페이지 메타데이터** — `/dashboard`, `/settings`, `/payment/complete` 각각 전용 `<title>` + `robots: noindex`. 여러 탭 열어둔 사용자가 탭바에서 페이지를 구분할 수 있음. 인증 영역은 검색엔진 노출 차단.
- **대시보드 skeleton 로딩** — 느린 네트워크에서 빈 화면에 "로딩 중..." 텍스트만 떠 있던 자리가 실제 레이아웃을 미러링하는 skeleton으로 교체. 새 `.skeleton-shimmer` CSS 유틸 + `prefers-reduced-motion` 대응 + `aria-busy`/`aria-live` a11y.
- **예약 경로 alias** — `/login`, `/signup`, `/signin`, `/about`, `/help` 등을 타이핑한 사용자가 `[namespace]` 캐치올 대신 정식 경로(`/auth/login`, `/`)로 즉시 redirect. "이 좌표는 아직 주인이 없습니다" 거짓 약속 제거.
- **Footer 프리미엄 링크** — 모든 페이지 푸터에서 `/pricing`으로 바로 진입.

### Changed
- **`/pricing` hero** — H1을 가격("월 ₩2,900")에서 제품명("좌표.to 프리미엄")으로 승격. 스크린 리더가 "Heading 1: 2900원" 대신 제품명을 먼저 읽음. 중복 가격 표시 제거, 가격은 구독 카드에만 남김.
- **카카오페이 CTA** — 💬 말풍선 이모지 제거. 카카오 브랜드 옐로(#FEE500) + 텍스트만으로 브랜드 인지 유지.
- **`/payment/complete` 5개 상태** — checking, pending, delayed, paid, error가 이제 하나의 `PaymentLoadingShell` 컴포넌트를 공유. pending은 `(N/6) · 최대 30초 소요` 진행도 표시로 "지금 뭐 하는 중인지" 정직하게 안내. delayed 상태의 "결제 확인하기" 버튼에 busy guard 추가 — 연타해도 중복 verify API 호출 안 됨.
- **`/payment/complete` 지연 아이콘** — ⏳ 모래시계 이모지 제거, inline SVG 시계 아이콘으로 교체.
- **로그인 페이지 레이아웃** — 12-col 그리드에 `mx-auto + items-center` 추가, 와이드 뷰포트에서 h1과 Google 로그인 카드의 수직 중심축 정렬.
- **`/settings` H1** — 하드코딩된 `<br/>` 제거, `text-wrap: balance`로 뷰포트별 최적 줄바꿈.
- **`/pricing` 계층** — `프리미엄에 포함된 것`, `무료 플랜` 두 개의 h2 섹션 추가. flat 1-heading 페이지 → 구조 있는 스캔 가능한 페이지.
- **Footer 터치 타깃** — `이용약관`, `개인정보 처리방침`, `프리미엄` 링크 높이를 20px → 44px로 확대 (WCAG/Apple HIG 최소 기준 충족).
- **홈 hero 폼 input** — `slug`, `target_url`에 `name` + `aria-label` + `autoComplete` 추가. 스크린 리더 익명 textbox 문제 해결, 브라우저 자동완성 작동.

### Fixed
- **장식용 북마크 아이콘** — `NamespacePillPreview`의 가짜 브라우저 URL 바 안 별 아이콘이 `<button>` + `aria-hidden` 조합이라 touch target audit에 잡히던 문제. `<span>`으로 변경.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>

## [0.8.0] - 2026-04-08 — Google 로그인 (이메일 OTP 제거)

이메일로 6자리 인증 코드를 받아 입력하던 로그인이 "Google로 계속하기" 버튼 한 번으로 바뀝니다. 로그인 왕복 시간은 평균 5단계 → 3단계로 줄어들고, 한국 사용자 대부분이 이미 가진 구글 계정으로 비밀번호 없이 바로 들어올 수 있습니다. 카카오 로그인은 비즈 앱 심사 완료 후 다음 릴리스에 추가됩니다.

### Added
- **Google OAuth 로그인** — `/auth/login` 페이지 전체 재작성. Supabase 내장 Google 프로바이더 사용, PKCE 플로우. 서버 컴포넌트 + 내부 클라이언트 버튼 패턴으로 이미 로그인된 사용자는 깜빡임 없이 `/dashboard`로 즉시 이동.
- **`GoogleSignInButton` 클라이언트 컴포넌트** — `src/app/auth/login/_components/GoogleSignInButton.tsx`. 컬러 Google G 로고 SVG, 로딩 상태 스피너(keyframe 충돌 방지용 네임스페이스 `vecto-login-spin`), 에러 메시지 `role="alert"` + `aria-live="assertive"` a11y.
- **PIPA §15 별도 동의 UI** — 버튼 아래 수집·이용 문구 인라인 표시: "Google 로그인 시 이메일, 이름, 프로필 이미지를 수집·이용합니다." + [개인정보처리방침] 링크. 체크박스 없이 버튼 클릭이 명시적 동의로 간주되는 패턴.
- **`/privacy` 페이지 제3자 수집 섹션** — "4. 제3자로부터 수집하는 개인정보" 섹션 신설 (정보통신망법 §22 고지 의무). Google LLC로부터 제공받는 정보 명시. 기존 섹션 5~11 번호 재정렬.
- **Provider 에러 코드 전달** — 콜백 라우트가 `?error=access_denied` (사용자가 Google consent 취소) 같은 원본 에러 코드를 login 페이지로 그대로 전달. 로그인 페이지는 취소와 실패를 별도 한국어 메시지로 구분해 보여줌 ("로그인을 취소하셨습니다" vs "로그인에 실패했습니다").

### Changed
- **`/auth/login` 페이지 → 서버 컴포넌트** — 기존 `"use client"` → `async function` + `getUser()` 체크 + `redirect('/dashboard')`. `export const dynamic = "force-dynamic"` 명시로 정적 캐싱 방지. FOUC 0.
- **`/auth/callback` next 파라미터 검증 강화** — `startsWith("/")` 방식에서 `new URL()` 파싱으로 교체. 백슬래시/인코딩/whitespace 우회를 모두 차단하고, `parsed.origin !== request.origin` 이면 `/dashboard`로 폴백.
- **좌측 에디토리얼 카피** — "이메일 한 통으로 로그인합니다. 비밀번호 없이, 안전하게." → "Google 계정 하나로 이어집니다. 비밀번호 없이, 단 한 번의 클릭으로."

### Removed
- **이메일 OTP 로그인 경로 전체** — `signInWithOtp`, `verifyOtp`, 6자리 코드 입력 폼, `sent`/`code`/`verifyLoading` state, `로그인 링크 받기`/`로그인 링크 전송 완료`/`이메일을 확인하세요` 한국어 문구. `tests/dead-code-grep.test.ts`가 회귀를 잠금.
- **`src/app/privacy/page.tsx`의 `비밀번호 미저장 (이메일 OTP 방식 인증)`** → `Google OAuth 방식 인증`.

### Tests
- **`tests/auth-callback.test.ts` 재작성** — pure function 검사에서 실제 GET 라우트 핸들러 import + `@supabase/ssr` mock 으로 전환. code 누락 / exchange 성공 / exchange 실패 / provider error (access_denied, server_error) / next 파라미터 5종 (상대, protocol-relative, backslash, javascript:, 누락) 총 14 케이스.
- **`tests/auth-login.test.ts` 신설** — `mapLoginErrorParam` 5 케이스 + GoogleSignInButton 정적 contract 검사 (provider, redirectTo, PIPA 문구, disabled prop) + login page 서버 컴포넌트 패턴 검증.
- **`tests/dead-code-grep.test.ts` 신설 (회귀 안전망)** — `execFileSync` argv 배열로 shell injection 방어. 이메일 OTP 관련 5종 문자열이 `src/` 트리에 0건임을 지속 검증.
- **총 176 tests pass**, `bun x tsc --noEmit` clean.

### Migration notes
- Supabase 대시보드에서 Google 프로바이더 활성화 + Redirect URLs에 `https://xn--h25b29s.to/auth/callback` + `https://*.vercel.app/auth/callback` 등록 필요 (완료).
- "Allow same-email identity linking" 설정이 켜져 있으면 기존 이메일로 가입한 사용자가 동일 이메일의 Google 계정으로 로그인 시 `auth.users.id`가 유지되어 namespace/payments/subscriptions 그대로 상속. 본인 테스트 계정 2개 (송민우/파닭)로 사전 검증 권장.

### Deferred
- **Phase 1b 카카오 로그인** — 카카오 비즈 앱 심사 통과 + 사업자등록증명원 제출 후 별도 PR. `TODOS.md` 기록.
- **Phase 2 네이버 로그인** — Supabase 내장 미지원. Custom OIDC 경로. 시장 신호 본 다음 재평가.

## [0.7.3] - 2026-04-08 — 카카오페이 정기결제 (간편결제 빌링키)

카드번호 16자리 + 유효기간 + CVC + 비밀번호 + 생년월일을 일일이 치는 30초 짜리 진입장벽을 카카오톡 인증 한 번으로 줄였습니다. 한국 사용자에게 가장 익숙한 정기결제 방식이 기본 CTA가 되고, 카드 직접입력은 보조 옵션으로 남깁니다.

### Added
- **카카오페이 빌링키 발급** — `/pricing` 페이지에 "카카오페이로 시작하기" 메인 CTA 추가. PortOne `EASY_PAY` 채널 + `easyPayProvider: "KAKAOPAY"` 로 빌링키를 발급하고, 기존 webhook 핸들러가 그대로 첫 결제를 트리거합니다 (PG 무관 흐름이라 백엔드 변경 없음).
- **`src/lib/portone-billing.ts`** — `buildBillingKeyArgs(method, channels)` 순수 함수 + `billingCancelMessage(method)`. PortOne SDK union type 의 EASY_PAY/CARD 분기를 한 곳에서 관리하고 단위 테스트로 회귀를 막습니다 (11개 테스트).
- **카카오페이 채널키 환경변수** — `NEXT_PUBLIC_PORTONE_CHANNEL_KEY_KAKAOPAY` 추가. 빈 값이면 카카오페이 버튼이 자동으로 숨겨져 카드 결제만 노출 (실수로 배포해도 사이트가 깨지지 않음).
- **카드 결제 fallback 링크** — 카카오페이 메인 CTA 아래 작은 "신용/체크카드로 결제하기" 텍스트 링크. 카카오 계정이 없는 사용자도 이탈하지 않습니다.

### Changed
- **모바일 결제창 정책** — `windowType: { mobile: "REDIRECTION", pc: "IFRAME" }` 명시. Mobile Safari가 `await` 이후 popup을 차단하는 문제를 사전에 방지 (카드 + 카카오 양쪽 모두 적용).
- **결제 핸들러 re-entry guard** — `if (loading !== "idle") return` 으로 빠른 더블탭이나 메서드 전환 중 두 개의 pending payment row 가 생기는 것을 차단.
- **결제 에러 로깅** — `} catch (err) { console.error(...) }` 로 프로덕션에서 카카오페이 실패 원인을 추적 가능. 이전에는 catch 가 에러 객체를 통째로 삼켰음.

### Notes
- 실 운영 전에 PortOne 어드민에서 카카오페이 정기결제 채널 계약 + 채널키 발급이 선행되어야 합니다 (기존 카드 채널과 별개).
- 카카오 공식 로고 SVG 교체는 후속 작업으로 분리 (현재는 💬 이모지 placeholder).

## [0.7.2] - 2026-04-08 — Hotfix: paymentId 길이 + 운영 환경변수

v0.7.1 배포 직후 첫 결제를 시도하면서 발견한 두 가지 잔여 문제를 정리합니다. 이제 prepare → 빌링키 발급 → 첫 charge → start_subscription 까지 자동으로 끝까지 흐릅니다.

### Fixed
- **PortOne `chargeBillingKey` 400 INVALID_REQUEST (paymentId MAX_LENGTH 32)** — `prepare` 가 만들던 `jwapyo_` (7) + `randomBytes(16).hex` (32) = **39자** 가 PortOne 한도(32)를 넘겨, 빌링키 발급은 통과하지만 첫 charge 호출에서 거절. `jw_` (3) + `randomBytes(12).hex` (24) = **27자** 로 변경.
- **운영 `PORTONE_WEBHOOK_SECRET` 빈 값** — Vercel 프로덕션에 키만 등록되고 값이 비어있어 모든 PortOne 웹훅이 `Server config error` 500 으로 거절되던 상태. PortOne 어드민에서 시크릿 발급 후 Vercel 에 채움. 코드 변경은 없으나 회귀 방지를 위해 운영 체크리스트에 명시.

### Added
- **paymentId 길이 회귀 테스트** (`tests/payment-prepare.test.ts`) — `jw_` 프리픽스 + 24 hex 패턴 검증, prepare route 가 `randomBytes(16)` 패턴으로 회귀하지 않도록 가드.

## [0.7.1] - 2026-04-08 — Hotfix: 결제 흐름 복구

v0.7.0 출시 이후 단 한 명도 결제를 끝까지 마치지 못하던 두 가지 막힘을 해결합니다. 이제 카드 등록부터 첫 ₩2,900 결제까지 정상 동작합니다.

### Fixed
- **`POST /api/payment/prepare` 500 → 200** — `subscriptions.user_id` / `payments.owner_id` FK 가 비어 있는 `public.users` 를 가리키고 있어, 모든 구독 준비 호출이 FK 위반(23503) 으로 500을 반환하던 버그. `010_fix_user_fks.sql` 마이그레이션으로 두 FK 모두 `auth.users(id)` 로 옮기고 사용처 없는 `public.users` 테이블을 제거.
- **PortOne 빌링키 발급 400 (`ParsePgRawResponseFailed`)** — KPN PG 가 빌링키 발급 시 구매자 이름을 필수로 요구하는데 클라이언트가 `customer.fullName` 을 넘기지 않아 카드 등록 창이 뜨기 전에 실패하던 버그. prepare 응답에 `customerName` 을 추가하고 pricing 페이지가 이를 PortOne SDK 의 `customer.fullName` 으로 전달.
- **`/api/cron/expire` 갱신 안내 메일** — 같은 FK 원인으로 `public.users.email` 을 읽어 항상 빈 값이 나오던 조용한 버그. `supabase.auth.admin.getUserById` 로 교체. (실제 유료 사용자가 없어 영향은 없었음.)

### Added
- **`tests/payment-prepare.test.ts`** 회귀 테스트 3건 — 마이그레이션 010 의 FK 타겟 검증, prepare 응답의 `customerName` 필드 보장, pricing 페이지가 `customer.fullName` 을 전달하는지 검증.

## [0.7.0] - 2026-04-08 — Single SKU Freemium (Linktree-style)

PG 빌링키 확답 수신 후 전체 요금 모델 개편. 기존 3/6/12개월 기간권(period-pack)을 제거하고 월 ₩2,900 구독 단일 SKU + 무료 전 기능 무제한 + 무료 사용자 프로필에 작은 안내 1줄 표시. `/autoplan` 리뷰에서 찾은 ship-blocker 5개(RPC idempotency, RLS view bypass, refund loophole, resubscribe data loss, BillingKey 서명 검증) 모두 사전 수정.

### Added
- **009_subscriptions.sql 마이그레이션** (`supabase/009_subscriptions.sql`) — `subscriptions` 테이블(5-state: pending/active/past_due/canceled/failed), `payments.subscription_id` FK, 4개 RPC(`process_subscription_charge` idempotent, `start_subscription`, `cancel_subscription` atomic+IDOR, `expire_past_due_subscriptions` bulk), `subscriptions_public` view (`WITH (security_invoker=true)` RLS enforcement), 008 grace user backfill (Option B: 즉시 free + 이메일).
- **Profile promo banner** (`src/components/profile-promo-banner.tsx`) — 무료 사용자 프로필 페이지 상단에 표시되는 masthead 스타일 안내 바. 14px, `surface-container` 배경, mint dot accent, full-width bleed, `word-break: keep-all`. CTA "프리미엄 시작하기 →".
- **5-state `PaymentStatus` 컴포넌트 refactor** — 기존 free/active/expired 3-branch에서 5-state (무료/이용중/해지됨/결제확인필요/만료)로 확장. subscription 객체 props + optional cancel handler.
- **`ConfirmDialog` 컴포넌트** (`src/components/confirm-dialog.tsx`) — focus trap, Escape 닫기, Enter 확인, `aria-modal`/`aria-labelledby`, body scroll lock, WCAG 44×44 터치 타겟. 구독 해지 confirmation modal에 사용.
- **`POST /api/subscription/cancel`** — `cancel_subscription` RPC 경유 atomic IDOR-가드된 해지 엔드포인트 + PortOne 예약 취소.
- **PortOne helpers** (`src/lib/portone.ts`) — `chargeBillingKey` (첫/수동 charge), `revokeBillingKeySchedules`, `deleteBillingKey`. `getPortOnePayment` 반환 타입에 `scheduleId?`, `billingKey?` 필드 노출 (구독 갱신 charge 식별용).
- **Subscription 상태 머신 테스트** (`tests/subscription-state.test.ts`) — 21 vitest 케이스: 5-state 도출, refund subscription 가드 (ENG-C2), 웹훅 first-charge vs recurring 분기 (idempotent 경로 포함), promo banner 가시성 로직, past_due auto-cancel 타이머.

### Changed
- **`pricing.ts` 단순화** — `PLANS` 배열, `getPlan`, `roughMonthly` 제거. 대신 `MONTHLY_PRICE=2900` 상수 + `validateSubscriptionAmount` + `validateLegacyPaymentAmount` (in-flight period-pack 호환) + `splitPrice` (VAT 계산) export.
- **`/pricing` 페이지 single-hero 재설계** — 기존 12-col 비대칭 grid + 3장 기간권 카드 → `max-w-md` centered single card + 무료 플랜 안내 블록. `requestIssueBillingKey` (카드 빌링키) + 3-stage progress ("결제 준비 중" → "카드 등록 중" → "첫 결제 처리 중").
- **`/api/payment/prepare`** — period_months input 제거. 단일 구독 생성: pending subscription row + pending payment row를 원자적으로 insert. 이미 활성 구독이 있으면 409.
- **`/api/payment/webhook` 5-branch event routing** — `BillingKey.Ready`/`BillingKey.Issued`(→ `chargeBillingKey` 호출로 첫 charge 트리거)/`BillingKey.Failed`(→ sub 'failed' 전환)/`Transaction.Paid`(첫 charge OR recurring via `process_subscription_charge` RPC)/`Transaction.Failed`(→ past_due 전환 + failed_charge_count++).
- **`/api/payment/refund` — ENG-C2 loophole plug** — SELECT에 `subscription_id` 컬럼 추가, `if (payment.subscription_id) return 400`. 구독 charge 환불 우회 방지.
- **`/api/payment/verify`** — 첫 charge 경로에서 subscription 있으면 `start_subscription` RPC (ENG-C4: 기존 `paid_until` 보존).
- **`/api/cron/expire`** — past_due > 14일 → `expire_past_due_subscriptions` RPC bulk cancel 추가. N+1 방지.
- **`/[namespace]/page.tsx`** — `if (payment_status === 'free') notFound()` 삭제 (D-C1: plan-breaking bug). 무료 프로필도 정상 렌더 + `<ProfilePromoBanner>` 조건부 마운트.
- **`ClickStats` paid gate** (`src/components/click-stats.tsx`) — `isPaid` prop 추가. 무료 사용자에게는 blurred preview + "프리미엄에서 확인하세요" lock card. 유료 사용자만 실제 통계 fetch.
- **`/dashboard`** — subscription 상태 `subscriptions_public` view에서 JOIN, `PaymentStatus`에 subscription 객체 전달, `ConfirmDialog` 기반 해지 플로우. 무료 가입 시 pricing 리다이렉트 제거 (즉시 dashboard).

### Fixed (from /ship adversarial review — post-autoplan critical fixes)
- **C3 (silent billing key update failure):** `/api/payment/webhook` BillingKey.Issued handler — `updateError` was logged but not propagated, allowing first charge to fire against an unsaved billing key. Now returns 500 on update error so PortOne retries the webhook.
- **C4 (BillingKey.Issued/Failed correlation):** PortOne webhook payload contains only `{billingKey, storeId}` — no `issueId`. Replaced naive `data.issueId` lookup with `getBillingKey(billingKey)` API call to fetch full `IssuedBillingKeyInfo` and extract `issueId`/`customer.customerId` for correlation. New `getBillingKey` helper in `src/lib/portone.ts`. Pricing page now also passes `customer.customerId: paymentId` as belt-and-suspenders correlation.
- **C4b (staleness lockout):** `/api/payment/prepare` — pending subscriptions older than 15 minutes are now auto-cleaned before creating new ones, preventing permanent user lockout when `BillingKey.Failed` webhook can't correlate.
- **M2 (subscription stuck pending):** `/api/payment/webhook` Transaction.Paid first-charge handler — when `payment.status='paid'` AND `subscription_id` AND `subscription.status='pending'`, the recovery path now retries `start_subscription` RPC instead of returning early. Previously, if `start_subscription` failed once, retries silently no-op'd because the payment was already marked paid.

### Fixed (from /autoplan review — all critical fixes pre-shipped)
- **ENG-C1:** `process_subscription_charge` RPC idempotency — INSERT 이후 `IF NOT FOUND THEN RETURN;` 추가. PortOne webhook retry 시 `current_period_end` 중복 advance (double-billing) 방지.
- **ENG-C2:** Refund 엔드포인트 SELECT에 `subscription_id` 컬럼 추가 + guard. 구독 결제 환불 우회 loophole 차단.
- **ENG-C3:** PortOne V2 BillingKey 웹훅 서명 검증 — `@portone/server-sdk`의 `Webhook.verify`가 모든 이벤트 타입(Transaction.*, BillingKey.*)을 단일 discriminated union + 동일 서명 스키마로 처리함을 SDK 타입 정의로 확인. 별도 서명 방식 없음.
- **ENG-C4:** `start_subscription` RPC에서 기존 `namespaces.paid_until`이 미래면 거기부터 연장. Resubscribe-in-period 시나리오에서 paid-through 날짜 손실 방지.
- **ENG-C5:** `subscriptions_public` view에 `WITH (security_invoker=true)` 명시 + 명시적 `GRANT SELECT TO authenticated`. Anon 전체 구독 덤프 공격 차단.
- **ENG-H1:** `cancel_subscription` RPC atomic화 — 권한 체크(WHERE user_id) + status 전환 + billing_key 반환을 단일 트랜잭션.
- **ENG-H2:** Cron `expire_past_due_subscriptions` RPC bulk UPDATE + CTE JOIN. N+1 방지.
- **ENG-H4:** Subscription status에 `'failed'` 추가 (`BillingKey.Failed` rollback 대상). `subs_one_active_per_user` UNIQUE 인덱스에서 제외하여 재시도 허용.

## [0.6.0] - 2026-04-07

라이브 결제 활성화 준비 1단계: 사업자 정보를 사이트 전반에 노출하기 위한 ENV 기반 footer + 법적 표기. 행정(통신판매업 신고, PortOne 사업자 인증, PG 계약)이 끝나면 ENV 값만 채우고 즉시 라이브.

### Added
- **글로벌 사이트 footer** (`src/components/site-footer.tsx`) — 모든 페이지에 동일하게 노출되는 사업자 정보 블록 (상호, 대표, 사업자등록번호, 통신판매업 신고번호, 사업장 주소, 고객지원 연락처). `layout.tsx`에서 한 번 마운트, 6개 페이지에 흩어져 있던 인라인 footer 통합.
- **사업자 정보 헬퍼** (`src/lib/business-info.ts`) — `NEXT_PUBLIC_BUSINESS_*` 7개 ENV에서 trim된 값을 읽어 단일 객체로 노출. ENV 비어 있을 때 `email`은 기본값 폴백, 나머지는 빈 문자열 (호출부에서 placeholder 처리). `isBusinessInfoComplete()` 함수는 Phase C 라이브 활성화 직전 build-time guard용으로 정의만 해둠.
- **`.env.example`** — 신규. Supabase + PortOne(4) + 사업자 정보(7) ENV 변수 모두 placeholder로 정의. 주석으로 각 변수의 출처와 의미 설명. `.gitignore`에 `!.env.example` 예외 추가.
- **이용약관 제10조 (사업자 정보)** — `terms/page.tsx`에 사업자 7개 항목을 ENV에서 동적으로 표시.
- **개인정보 처리방침 보호책임자 성명** — 9조에 대표자명을 ENV에서 가져와 명시.
- **결제 직전 환불 정책 강화** (`pricing/page.tsx`) — 결제 버튼 아래 "결제 후 7일 이내 미사용 시 전액 환불 / 환불 문의 support@xn--h25b29s.to" 명시. 전자상거래법 구매 직전 고지 의무 충족.
- **Environment Variables 섹션** (`CLAUDE.md`) — 세 갈래 (Supabase / PortOne / 사업자 정보) ENV 변수의 출처, 사용처, 누락 시 동작 문서화.
- **business-info 단위 테스트** — `tests/business-info.test.ts` 8개 (전체 117개 그린).

### Changed
- **레이아웃 sticky footer 패턴 정착** — `layout.tsx`의 body를 `min-h-screen flex flex-col`로 변경, `<main flex-1>` 안에 children 래핑, footer를 sibling으로. 13개 페이지의 wrapper에서 `min-h-screen` → `flex-1`로 일괄 교체. 이전에는 페이지 wrapper의 `min-h-screen`이 viewport 전체를 차지하고 그 아래에 footer가 추가되어 짧은 페이지(/auth/login, /not-found, /error 등)에서도 항상 viewport보다 footer 높이만큼 스크롤이 생기는 문제가 있었음. 이제 짧은 페이지는 footer가 viewport 바닥에 flush로 붙고, 긴 페이지는 자연스럽게 스크롤됨.

### Fixed
- **6개 페이지의 인라인 footer 중복 제거** — `home`, `pricing`, `terms`, `privacy`, `dashboard`, `settings` 각각 다른 형태로 인라인된 footer JSX/함수를 모두 제거. 단일 `SiteFooter`로 일원화. 향후 footer 변경 시 한 곳만 고치면 전 사이트 반영.

## [0.5.1] - 2026-04-07

### Changed
- **데스크톱 nav 터치 타겟 44px 통과** — `요금제` 링크가 36×44로 WCAG 최소 미달이었음. 모든 텍스트 데스크톱 nav 링크에 `sm:px-2 sm:py-3` 추가. 시각적 변화 없이 hit area만 +8px.
- **Pricing 히어로 데스크톱에서 다시 큼직하게** — `lg:text-4xl`(36px) → `lg:text-5xl`(48px), 본문 `lg:text-sm`(14px) → `lg:text-base`(16px). 위계가 살아나서 매거진 표지 톤 회복. 결제 카드는 여전히 fold 안에 들어감.

### Fixed
- **Upgrade 카드 1px 보더 제거** — 무료 링크 생성 후 표시되는 영구 주소 유도 카드의 `border: 1px solid var(--surface-container)` 제거. DESIGN.md No-Line 규칙 준수. `shadow-whisper` → `shadow-whisper-strong`로 톤 레이어링만으로 카드가 떠 보이게.
- **하단 CTA 한글 line-height** — `1.5` → `1.7`. DESIGN.md 한글 본문 1.6-1.8 범위 floor 위반 해소.

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
