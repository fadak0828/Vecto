# TODOS — 좌표.to

## 다음 작업 (우선순위순)

### 🛡️ v0.10.0 서브링크 OG/QR 후속 — 보안 follow-up (2026-04-09 adversarial review)

- **OG-SEC-1. DNS rebinding 방어** — `src/lib/og-fetcher.ts`의 `assertPublicHost`는 한 번만 resolve하고 undici가 다시 resolve한다. 공격자가 제어하는 DNS 서버가 TTL=0으로 첫 번째 쿼리에 `8.8.8.8`, 두 번째에 `169.254.169.254`를 반환하면 SSRF 우회 가능. 해결: `undici.Agent({ connect: { lookup } })`로 resolve된 IP를 pin하거나, 직접 IP로 연결 + `Host:` 헤더 수동 설정. 우선순위 P1.
- **OG-SEC-2. slugs 테이블 RLS 강화** — `supabase/001_init.sql`의 `with check (true)` 정책이 너무 느슨하다. 앱 레이어에서만 ownership 체크. API route bypass (직접 PostgREST 호출) 시 타 사용자 namespace에 slug 삽입 가능. 해결: `with check (auth.uid() = owner_id AND EXISTS (...))`. 우선순위 P1.
- **OG-SEC-3. `/api/slugs` 및 `/api/slugs/:id/refresh-og` rate limiting** — 현재 없음. refresh-og는 임의 URL을 2초 timeout으로 fetch하므로 좌표.to IP를 반사기로 쓸 수 있는 DoS 증폭기. 해결: 기존 `rate_limits` 테이블 재사용, 유저당 `POST /api/slugs` 10/분, refresh-og 5/분. 우선순위 P2.
- **OG-SEC-4. `[namespace]/[sub]` 공유 프리뷰 응답에 CSP + X-Frame-Options 헤더** — 봇 응답 HTML이 프레임 가능하고 CSP가 없다. 해결: `Content-Security-Policy: default-src 'none'; img-src *; style-src 'unsafe-inline'` + `X-Frame-Options: DENY`. 우선순위 P3.
- **OG-SEC-5. SublinkDetailModal focus trap** — 현재 tab 키가 모달 밖으로 탈출. a11y 위반. 해결: `focus-trap-react` 추가하거나 직접 구현 (Tab 이벤트를 modal root에서 캐치해 loop). 우선순위 P2.
- **OG-SEC-6. Naver/Daum UA 오탐** — `BOT_UA_REGEX`가 `"naver"`, `"daum"` 부분 문자열을 매칭. Whale 브라우저(`Naver` 포함) 사용자가 bot HTML 받아서 meta-refresh 느리게 보임. 해결: `Yeti` (Naver 크롤러), `Daumoa` (Daum 크롤러) 명확한 토큰으로 교체. 우선순위 P3.
- **OG-SEC-7. `og_image` 2048자 CHECK 여유 부족** — CloudFront signed URL 등은 3KB 넘을 수 있음. legitimate 이미지가 silently 버려진다. 해결: CHECK를 8192로 올리거나 `/api/image-proxy` 추가. 우선순위 P3.
- **OG-SEC-8. `next/image` remotePatterns** — 현재 og_image를 raw `<img>`로 렌더. LCP 손해. 해결: `next.config.ts`에 와일드카드 remotePatterns 추가 또는 이미지 프록시 라우트. 우선순위 P3.
- **OG-SEC-9. 백그라운드 OG refresh cron** — 오래된 slug의 OG 데이터를 주기적으로 갱신. 현재는 수동 "다시 가져오기" 버튼만 있음. 해결: Vercel Cron + `/api/cron/refresh-stale-og`. 우선순위 P4.


### 🚨 Single SKU Freemium 런칭 전 필수 — v0.7.0 (2026-04-08 구현 완료, 마이그레이션 + 런칭 대기)

- **DB-1. `/run-sql` 또는 Supabase Dashboard에서 `supabase/009_subscriptions.sql` 실행** — subscriptions 테이블 + 4개 RPC + payments.subscription_id FK + subscriptions_public view + 008 grace user Option B backfill 포함 (autoplan ENG-C1/C5/C4/H1/H2/M2 fixes)
- **DB-1b. 008 grace 사용자에게 안내 이메일 발송** — 009 마이그레이션에서 payment_status='active' → 'free' 로 전환됨. 대상 목록은 수동 SQL로 추출 후 Resend broadcast.
- **PG-1. PortOne 어드민에서 빌링키 결제 활성화 확인** — PG 확답에 포함되었으나 실제 채널 설정 확인 필요. 빌링키 발급 권한 + 월 정기결제 ₩2,900 설정.
- **PG-2. Webhook endpoint 재등록** — 기존 `Transaction.Paid` + `Transaction.Cancelled` 외에 `BillingKey.Issued`, `BillingKey.Failed`, `Transaction.Failed` 추가 필수.
- **ENV-1. Vercel + .env.local에 사업자 정보 7개 ENV 채우기** (`NEXT_PUBLIC_BUSINESS_*`)
- **ENV-2. PortOne 라이브 키 4개 ENV 주입**
- **QA-1. Sandbox e2e** — 가입 → 구독 시작 → 빌링키 발급 → 첫 charge → (14일 past_due 시뮬) → 해지 → expire
- **QA-2. Refund subscription guard** — /api/payment/refund 호출 시 subscription_id 있으면 400 반환 확인
- **QA-3. Cancel IDOR** — user A가 user B sub 취소 시도 → 404 (RPC 내부 WHERE user_id 가드)
- **QA-4. Billing key leak CI guard** — `grep -r "portone_billing_key_id" src/app/api/**/route.ts` 응답 body에 노출되지 않는지 확인 (현재 confirmed clean)
- **QA-5. Cron `expire` race vs subscription renewal (P2 follow-up)** — adversarial review C5: 03:00 UTC cron 실행 시점에 PortOne 갱신 webhook이 아직 안 와서 active 구독 namespace가 일시적으로 expired로 flap 가능. 작은 윈도우(분 단위)지만 cleanup: cron의 첫 UPDATE에 `AND id NOT IN (SELECT namespace_id FROM subscriptions WHERE status='active')` 추가 필요.
- **QA-6. ENG-H5 observability** — 구조적 JSON 로그 포맷 통일 + daily digest 이메일 (active/past_due/canceled 카운트, past_due > 5% 알림). 첫 결제 webhook signature failure counter.

### 🚨 라이브 결제 활성화 (Phase A 행정 — 사용자 직접) — v0.6.0 후속
- **A0. PortOne 어드민 가입** + 사업자 정보 입력 + "구매안전서비스 이용 확인증" PDF 다운로드 (https://admin.portone.io)
- **A1. 통신판매업 신고** (정부24 → 사업자등록증 + 구매안전서비스 확인증 첨부, 처리 3~7영업일)
- **A2. PortOne 어드민에 통신판매업 신고증 업로드** + 사업자 명의 정산계좌 등록
- **A3. PG 계약** (PortOne 어드민 → 토스페이먼츠 권장, 심사 5~10영업일)

### 🚨 라이브 결제 활성화 (Phase C 코드 + 검증) — A1~A3 끝난 후
- **C0. Vercel + .env.local에 사업자 정보 7개 ENV 채우기** (`NEXT_PUBLIC_BUSINESS_*`). 비어 있으면 footer가 placeholder로 표시되지만 PG 심사 통과 안 됨.
- **C1. PortOne 라이브 키 4개 ENV 주입** (`NEXT_PUBLIC_PORTONE_STORE_ID`, `NEXT_PUBLIC_PORTONE_CHANNEL_KEY`, `PORTONE_API_SECRET`, `PORTONE_WEBHOOK_SECRET`)
- **C2. PortOne 어드민에서 webhook endpoint 등록** (`https://xn--h25b29s.to/api/payment/webhook`, 이벤트 `Transaction.Paid` + `Transaction.Cancelled`) → 발급된 시크릿을 `PORTONE_WEBHOOK_SECRET`에 주입
- **C3. 소액 실결제 검증** — 본인 카드로 3개월 최저가 결제 → webhook 도달 + DB `payments.status="paid"` + `namespaces.payment_status="active"` + 대시보드 "프리미엄 활성" 표시 5단계 확인
- **C4. 환불 검증** — `/api/payment/refund` 호출 → PortOne 어드민 환불 처리 확인 + DB `payments.status="refunded"` 확인
- **C5. `isBusinessInfoComplete()` wire-up** — `src/lib/business-info.ts`에 정의만 되어 있음. 라이브 활성화 직전 build-time guard 또는 dev banner로 연결 (production에서 사업자 정보 누락 시 build fail)
- **C6. 사업자 주소 확정 후 terms 제9조 (분쟁 해결) 관할법원 명시 검토** — 현재 "민사소송법에서 정한 관할 법원"으로 안전하게 표현 중. 사업자 주소지가 정해지면 명시 가능.


### ~~자동 테스트 구축~~ ✅ Fixed on main, 2026-04-06
- ~~escapeHtml 유닛 테스트~~ → 8개 테스트
- ~~validateSlug / validateUrl 유닛 테스트~~ → 16개 테스트
- ~~API route 로직 테스트 (shorten 검증, race condition)~~ → 10개 테스트
- ~~proxy.ts rate limiting + CSP + auth 경로 테스트~~ → 8개 테스트
- ~~Open redirect 방어 테스트~~ → 7개 테스트
- ~~CI 파이프라인 (GitHub Actions)~~ → push/PR마다 자동 실행
- E2E 테스트 (삭제 UI 롤백 등) → 미구현, 추후 Playwright 도입 시

### 프로덕션 모니터링
- 에러 추적 (Sentry 또는 유사)
- 가동시간 모니터링
- click_logs 증가율 알림
- rate_limits 테이블 정리 cron

### ~~법적 페이지~~ ✅ Fixed by /qa on main, 2026-04-06
- ~~이용약관 (`/terms`)~~ → 구현 완료
- ~~개인정보처리방침 (`/privacy`)~~ → 구현 완료
- ~~가격 페이지의 약관 링크 연결~~ → `#` → `/terms`, `/privacy`로 수정

### ~~결제 연동 (PortOne)~~ ✅ Fixed on main, 2026-04-06
- ~~네임스페이스 구매 체크아웃 플로우~~ → PortOne V2 SDK + 기간권(3/6/12개월)
- ~~결제 webhook + 수동 확인 안전망~~ → /api/payment/webhook + /api/payment/verify
- ~~만료 관리 cron~~ → Vercel Cron + /api/cron/expire
- ~~알림 이메일~~ → Resend (7일 전 만료 경고)
- ~~환불 API~~ → /api/payment/refund (7일 이내)
- ~~가격 페이지 리디자인~~ → 3/6/12개월 패키지
- E2E 테스트: 결제 플로우 (PortOne 테스트 모드) → 미구현, Playwright 도입 시
- 관리자 대시보드 (결제 이력 조회, 수동 환불 처리) → 추후
- /reserve 페이지 제거 또는 pricing으로 리다이렉트 → 추후

### namespace squatting 방지
- 봇에 의한 대량 이름 예약 방지
- CAPTCHA 또는 이메일 인증 추가

### 결제 시스템 P2 개선 (adversarial review 후속, v0.2.0 PR)
- /api/payment/verify rate limit (PortOne API 호출 보호)
- /api/payment/refund 일할 환불 (현재는 7일 이내 전액만)
- 환불 reconciliation cron (refunding 상태로 멈춘 결제 복구)
- click_count 증가를 fire-and-forget → waitUntil로 변경
- 만료 알림 horizon: grandfather 사용자에게 30일 전 알림 추가
- 타임존: 만료 계산을 KST 기준으로 (현재 UTC)

### 디자인 리뷰 후속
- **F-H** 404/네임스페이스 not-found 페이지 — 가운데 정렬 + `?` 아이콘-인-서클. 같은 비대칭 에디토리얼 트리트먼트 적용 필요. (`src/app/[namespace]/page.tsx`)
- ~~**F-I** 홈 hero 아래 2컬럼 대칭 feature grid → 60/40 split~~ ✅ **Completed:** v0.3.0 (2026-04-06) — 5/12 + 7/12 비대칭 split with premium dominant. Premium 카드 hierarchy 재구성 (URL 헤드라인 + 볼드 가치 제안 + 가격 단서).
- **F-J** 본문 헤딩에 `text-wrap: pretty` 적용 — 한국어 orphan 입자 방지 폴리시
- **F-K** `prefers-reduced-motion` 처리 — partially addressed in v0.3.0 (hero typing rotation respects it). 나머지 모든 `transition-*` 전역 처리 필요.
- **F-L** nav 탭 타깃 width — partially addressed in v0.3.0 (룰을 `@layer base`로 옮겨서 cascade 정렬). `min-height` 대신 `padding` 전환은 미진행.

### v0.4.0 follow-up (QR + perf + pricing PR에서 deferred)
- **대시보드 sublink 항목별 QR** — 대시보드 링크 목록에 QR 모달 추가 (현재는 홈 결과 카드만 QR)
- **/settings 페이지 sublink QR** — 동일하게 follow-up
- **QR 색상/로고 커스터마이징** — 프리미엄 사용자가 brand color로 QR 칠할 수 있게
- **QR sharing API (Web Share API)** — 모바일 native share sheet 통합
- **Postgres RPC for shorten** — `Promise.all` 옵션 A 측정 후 더 빠르면 옵션 B로 전환 (1 round-trip)
- **roughMonthly 디스플레이 — pricing/payment-prepare/webhook 정합성** — 사용자에게 표시되는 약 X원과 실제 결제 정확 금액의 onboarding 메시지 일관성 점검

### OAuth 마이그레이션 follow-up (v0.8.0 Phase 1a 이후)
- **Phase 1b — 카카오 소셜 로그인 추가**
  - What: 카카오 OAuth를 두 번째 프로바이더로 추가 (Supabase 내장).
  - Why: 한국 일반 사용자 주 도달 채널. 구글 단독으로는 도달이 좁음.
  - Cons: 카카오 비즈 앱 심사 필요(1~3 영업일). `account_email` 스코프는 비즈 앱 통과 후에만 받을 수 있음. 심사 신청에 사업자등록증명원 제출 필요.
  - Depends on: 카카오 비즈 앱 심사 통과.
  - Trigger: 의존성 해소 즉시.
- **Phase 2 — 네이버 Custom OIDC**
  - What: 네이버를 세 번째 프로바이더로 추가. Supabase 내장 지원 없으므로 custom OIDC 경로 구축 (`src/app/api/auth/naver/callback/route.ts` + `src/lib/naver-oauth.ts`).
  - Cons: custom JWT 서명, 네이버 디벨로퍼 심사, 회귀 표면적 2배, 혁신 토큰 추가 소비.
  - Depends on: Phase 1b 머지 완료 + "네이버로 로그인 가능한가요?" 문의 N건 이상 시장 신호.
- **Cron 갱신 알림 의존성 코멘트 + 장기 대안**
  - What: `src/app/api/cron/expire/route.ts:77` 부근에 "OAuth 이후 `auth.users.email`이 null일 수 있음. 카카오 비즈 미심사 상태에서는 email null 사용자는 알림 미수신" 코멘트 추가. 장기적으로 앱 내 알림, 카카오톡 비즈메시지 등 대체 채널 검토.
  - Depends on: Phase 1b 시작 시점.
- **OAuth signup rate-limiting**
  - What: OTP는 Supabase 메일 발송 쿼터로 IP별 계정 생성에 자연스러운 ceiling이 있었음. OAuth는 무한 생성 가능. `src/proxy.ts`의 IP 제한은 `/api/* POST`만 대상이라 `/auth/callback GET`에는 적용 X.
  - Depends on: 사용자 수 1k+ 도달 시 우선순위 상승.
- **OAuth consent screen IDN 표시 개선** — Google consent 화면이 `xn--h25b29s.to` punycode로 노출되어 사용자 인식 떨어짐. Google authorized domain feature는 IDN 비지원. 우회책 검토.
- **Google branding compliance audit** — 현재 plain 한국어 "Google로 계속하기" 버튼 사용 (다크 배경). Google brand 가이드라인 100% 미준수. 추후 OAuth client 심사 시 영향 가능. 공식 white Sign-in button으로 교체 옵션 재평가.
- **인앱 브라우저 UA 패턴 재점검 (v0.8.3 이후)** — `src/lib/in-app-browser.ts`의 감지 패턴(KAKAOTALK, FBAN/FBAV, Instagram, Line, Barcelona(Threads), NAVER(inapp, Daum, `; wv)`) 은 2024-2026 UA 기준. 각 앱이 UA 포맷을 바꾸면 감지가 깨질 수 있음. 실제 환경에서 "Google 요청 세부정보" 에러 재보고되면 즉시 UA 샘플 수집해서 `tests/in-app-browser.test.ts`에 추가. 분기별로 대표 앱 최신 UA 한 번씩 샘플링.
- **인앱 우회 성공률 관측** — 현재 로깅 없음. Phase 1b 이후 analytics 도입 시, 인앱 감지 카드 노출 횟수 + "Chrome으로 열기" 클릭 전환율 + "그래도 여기서 시도하기" 폴백 사용률을 측정해서 실제 사용자 행동 파악. 데이터 기반으로 카피/버튼 위치 개선 가능.

### 장기 개선
- HTML route handler를 React 컴포넌트로 전환 (XSS 근본 원인 제거)
- Dashboard/Settings 공통 컴포넌트 추출 (코드 중복 제거)
- click_logs retention 정책 (오래된 로그 자동 정리)
- 타임존 처리 개선 (UTC → 사용자 로컬)
