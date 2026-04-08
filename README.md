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
│   ├── slugs — sublink, click_count
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
- `/[namespace]/[sub]` — sublink redirect (0초 즉시)
- `/pricing` — 단일 SKU ₩2,900/월 결제
- `/payment/complete` — 결제 후 verify polling
- `/auth/login` — 이메일 OTP 로그인
- `/terms`, `/privacy` — 법적 문서 (사업자 정보 포함)

## Testing

```bash
bun x vitest run                 # ~250ms, 136 tests
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
