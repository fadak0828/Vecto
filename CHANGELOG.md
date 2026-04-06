# Changelog

좌표.to의 모든 변경 사항이 여기에 기록됩니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)을 따르며, 버전은 [SemVer](https://semver.org/lang/ko/)를 따릅니다.

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
