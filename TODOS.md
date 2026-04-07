# TODOS — 좌표.to

## 다음 작업 (우선순위순)

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

### 장기 개선
- HTML route handler를 React 컴포넌트로 전환 (XSS 근본 원인 제거)
- Dashboard/Settings 공통 컴포넌트 추출 (코드 중복 제거)
- click_logs retention 정책 (오래된 로그 자동 정리)
- 타임존 처리 개선 (UTC → 사용자 로컬)
