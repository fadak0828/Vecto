# Changelog

좌표.to의 모든 변경 사항이 여기에 기록됩니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)을 따르며, 버전은 [SemVer](https://semver.org/lang/ko/)를 따릅니다.

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
