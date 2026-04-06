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

### 결제 연동 (Stripe)
- 네임스페이스 구매 체크아웃 플로우
- 예약 → 구매 전환 흐름
- 결제 상태에 따른 namespace tier 관리

### namespace squatting 방지
- 봇에 의한 대량 이름 예약 방지
- CAPTCHA 또는 이메일 인증 추가

### 장기 개선
- HTML route handler를 React 컴포넌트로 전환 (XSS 근본 원인 제거)
- Dashboard/Settings 공통 컴포넌트 추출 (코드 중복 제거)
- click_logs retention 정책 (오래된 로그 자동 정리)
- 타임존 처리 개선 (UTC → 사용자 로컬)
