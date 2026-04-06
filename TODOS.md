# TODOS — 좌표.to

## 다음 작업 (우선순위순)

### 자동 테스트 구축
- escapeHtml 유닛 테스트
- validateSlug / validateUrl 유닛 테스트
- API route 통합 테스트 (shorten, stats, reserve)
- proxy.ts rate limiting 테스트
- 삭제 에러 핸들링 + UI 롤백 E2E 테스트
- **Why:** 현재 테스트 코드 제로. 회귀 안전망 없음.

### 프로덕션 모니터링
- 에러 추적 (Sentry 또는 유사)
- 가동시간 모니터링
- click_logs 증가율 알림
- rate_limits 테이블 정리 cron

### 법적 페이지
- 이용약관 (`/terms`)
- 개인정보처리방침 (`/privacy`)
- 가격 페이지의 약관 링크 연결

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
