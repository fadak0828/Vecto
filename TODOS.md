# TODOS — 좌표.to

## 다음 작업 (우선순위순)

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

### 디자인 리뷰 후속 (v0.2.1 PR에서 deferred)
- **F-H** 404/네임스페이스 not-found 페이지 — 가운데 정렬 + `?` 아이콘-인-서클. 같은 비대칭 에디토리얼 트리트먼트 적용 필요. (`src/app/[namespace]/page.tsx`)
- **F-I** 홈 hero 아래 2컬럼 대칭 feature grid — DESIGN.md 비대칭 에디토리얼과 충돌. 60/40 스플릿으로 강조 카드를 더 크게 분리하는 방향 검토. (`src/app/page.tsx:291-304`)
- **F-J** 본문 헤딩에 `text-wrap: pretty` 적용 — 한국어 orphan 입자 방지 폴리시
- **F-K** `prefers-reduced-motion` 처리 — 모든 `transition-*`이 무조건 적용됨. DESIGN.md "intentional motion" 원칙
- **F-L** nav 탭 타깃 width — `min-height` 대신 `padding`으로 처리해 자연 너비 확보

### 장기 개선
- HTML route handler를 React 컴포넌트로 전환 (XSS 근본 원인 제거)
- Dashboard/Settings 공통 컴포넌트 추출 (코드 중복 제거)
- click_logs retention 정책 (오래된 로그 자동 정리)
- 타임존 처리 개선 (UTC → 사용자 로컬)
