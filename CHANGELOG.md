# Changelog

좌표.to의 모든 변경 사항이 여기에 기록됩니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)을 따르며, 버전은 [SemVer](https://semver.org/lang/ko/)를 따릅니다.

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
