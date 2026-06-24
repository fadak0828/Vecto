# 좌표.to

한국어로 된 짧고 의미있는 URL — Linktree 스타일 link-in-bio 서비스. 무료 = 전 기능 무제한 + 작은 안내 1줄, 유료 ₩2,900/월 = 안내 숨김 + 클릭 통계.

**Live:** https://좌표.to (punycode: https://xn--h25b29s.to)
**Stack:** Next.js 15 (App Router), Supabase (Auth + Postgres + RLS), PortOne V2 (PG), Vercel.

## Getting Started

```bash
bun install
cp .env.example .env.local       # 환경변수 채우기
bun run dev                      # http://localhost:3000
```

`.env.local` 의 세 그룹:
- **Supabase** — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (서버 전용)
- **PortOne** — `NEXT_PUBLIC_PORTONE_STORE_ID`, `NEXT_PUBLIC_PORTONE_CHANNEL_KEY`, `PORTONE_API_SECRET`, `PORTONE_WEBHOOK_SECRET`
- **사업자 정보** — `NEXT_PUBLIC_BUSINESS_*` 7개 (전자상거래법 표시 의무)

`CLAUDE.md` 의 Environment Variables 섹션에 출처와 의미가 자세히 적혀 있습니다.

## Architecture

```
좌표.to (Next.js App Router)
├── 사용자 세션 → Supabase Auth (Google OAuth)
├── 데이터 → Supabase Postgres (RLS)
│   ├── namespaces — 사용자별 1개, payment_status, paid_until
│   ├── slugs — sublink, click_count, og_title/description/image/site_name (OG 메타)
│   ├── payments — pending/paid/refunding/refunded
│   └── subscriptions — pending/active/past_due/canceled/failed (009)
├── 결제 → PortOne V2 (빌링키 정기결제 ₩2,900/월)
│   ├── /api/payment/prepare — pending payment + sub
│   ├── /api/payment/webhook — Transaction.* + BillingKey.* events
│   ├── /api/payment/verify — webhook fallback
│   ├── /api/payment/refund — 7d 전액 환불 (구독 charge 거부)
│   ├── /api/subscription/cancel — atomic IDOR + PortOne unschedule
│   └── /api/cron/expire — 일일 cron, past_due > 14d → cancel
└── 배포 → Vercel (auto-deploy on main, daily cron 03:00 UTC)
```

## Routes

- `/` — 홈, 무료 단축 + namespace teaser
- `/dashboard` — 인증 후 대시보드 (namespace claim, sublink 관리, 구독 상태)
- `/[namespace]` — 공개 프로필 (free 사용자도 보임 + 안내 1줄)
- `/[namespace]/[sub]` — sublink redirect (일반 브라우저는 0초 302 → 목적지; 카카오톡/페북 등 크롤러는 목적지의 OG 메타가 담긴 HTML로 응답해서 공유 프리뷰에 실제 사이트 썸네일이 뜨게 함)
- `/pricing` — 단일 SKU ₩2,900/월 결제
- `/payment/complete` — 결제 후 verify polling
- `/auth/login` — Google OAuth 로그인
- `/terms`, `/privacy` — 법적 문서 (사업자 정보 포함)

### 주소창 접두어 방식 단축 (`만들기.좌표.to`)

`https://만들기.좌표.to/https://www.naver.com` 처럼 `/` 뒤에 원본 URL 을 붙여
접속하면 즉시 단축 URL 을 생성하고 `https://좌표.to/go/<slug>` 로 302
리다이렉트한다.

- **호스트 한정** — `만들기.좌표.to` (punycode `xn--ok0b30kwpe.xn--h25b29s.to`)
  에서만 동작. 그래야 기존 `/go/*`, `/[namespace]/*` 리다이렉트와 충돌하지 않음.
- **흐름** — `proxy.ts` 가 raw `request.url` (디코딩 안 함) 에서 원본 URL 을 잘라
  `x-prefix-original-url` 헤더에 담아 `/api/prefix` 로 rewrite → 검증 후
  `createShortUrl()` (`/api/shorten` 과 동일 로직) 호출.
- **raw 보존** — 프레임워크가 파싱한 pathname 대신 raw URL 문자열을 직접 잘라
  쿼리스트링까지 보존. 원본 전체에 `decodeURIComponent()` 를 적용하지 않아
  `%EB..`, `%2F`, `%3F` 인코딩이 그대로 유지됨 (Base64 불필요).
- **허용 스킴** — `http://`, `https://` 만. `javascript:`/`data:`/`file:`/`ftp:`
  등은 거부.
- **제한** — IP 기준 10개/일·30개/월 rate limit, 원본 URL 최대 2048자.
- **SSRF 안전** — 원본 URL 을 서버에서 자동 조회하지 않음. 저장·리다이렉트
  용도로만 처리.
- **`#fragment` 미지원** — 브라우저가 fragment 를 서버로 전송하지 않으므로 이
  방식으로는 보존 불가 (구조적 제약).
- **프록시 주의** — Vercel 은 raw request URI 를 그대로 전달한다. Nginx/Cloudflare
  앞단에 둘 경우 경로의 인코딩·중복 슬래시를 정규화하지 않도록 설정해야 한다
  (Nginx 는 `location` 정규화 회피, CF 는 "Normalize incoming URLs" 비활성화).
  Next 자체가 `//`→`/` 308 정규화를 하므로 선두 스킴(`https:/`)은 코드가 복원하되,
  원본 경로 *내부* 의 `//` 는 복원되지 않는 제약이 있다.

## Testing

```bash
bun x vitest run                 # ~1.5s, 365 tests
```

상세 컨벤션은 `TESTING.md` 참고.

## Design System

`DESIGN.md` 가 단일 출처. Deep Mint & Charcoal 팔레트, Manrope + Plus Jakarta Sans + Pretendard Variable, asymmetric editorial layout, no-line rule, tonal layering.

## Skill routing

이 저장소는 [gstack](https://github.com/garrytan/gstack) skill 워크플로우를 사용합니다. `CLAUDE.md` 의 Skill routing 섹션 참고.

주요 명령:
- `/autoplan` — CEO + Design + Eng review pipeline
- `/ship` — 테스트 + 리뷰 + commit + PR + doc sync
- `/qa` — 라이브 사이트 QA + 자동 fix
- `/run-sql` — Supabase Postgres 직접 SQL 실행

## Deploy

- **Platform:** Vercel (auto-deploy on merge to `main`)
- **Production:** https://좌표.to
- **Cron:** `/api/cron/expire` daily 03:00 UTC
- **Health:** `curl -sf https://xn--h25b29s.to`
