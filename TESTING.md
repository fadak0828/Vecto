# Testing — 좌표.to

## Philosophy

100% 테스트 커버리지가 목표입니다. 테스트는 빠르게 움직이면서도 안전하게 배포할 수 있게 해줍니다.
테스트 없는 코딩은 안전벨트 없이 운전하는 것과 같습니다.

## Framework

- **Vitest** v4 — 빠른 테스트 러너 (~1.5초에 365개 테스트)
- **@testing-library/react** — 컴포넌트 테스트 (jsdom 환경 — `// @vitest-environment jsdom` 주석 + `tests/**.test.tsx` 파일)
- **Node environment** — 순수 로직/API 테스트 (기본값)

## 테스트 실행

**bun-only 프로젝트.** `npm test`는 쓰지 않습니다.

```bash
bun x vitest run           # 전체 테스트 실행
bun x vitest               # 파일 변경 시 자동 재실행 (watch)
bun x vitest run --coverage # 커버리지 리포트
```

## 테스트 구조 (주요 파일)

```
tests/
├── html-escape.test.ts              # XSS 방어 유틸
├── slug-validation.test.ts          # 슬러그/URL 검증
├── auth-callback.test.ts            # Open redirect 방어
├── api-shorten.test.ts              # 무료 URL 단축 API
├── api-slugs.test.ts                # POST /api/slugs (auth + OG 수집)
├── api-slugs-refresh-og.test.ts     # POST /api/slugs/:id/refresh-og
├── og-fetcher.test.ts               # OG 수집 + SSRF 가드 (octal/dword/NAT64/6to4 포함)
├── namespace-sub-redirect.test.ts   # 봇 UA 감지 + 공유 프리뷰 HTML
├── sublink-card.test.tsx            # Editorial 카드 계층 + AI slop 가드
├── sublink-detail-modal.test.tsx    # QR 모달 + 복사 + 이미지로 저장
├── sublink-qr-button.test.tsx       # 공개 프로필 QR 트리거 (포털)
├── public-profile-parity.test.ts    # live/preview 드리프트 방지 계약
├── payment-* / subscription-* / trial-*  # 결제/구독/트라이얼
└── proxy-rate-limit.test.ts         # Rate limiting + CSP + auth 경로
```

## 컨벤션

- 파일명: `*.test.ts` (순수 로직), `*.component.test.tsx` (컴포넌트)
- 테스트 디렉토리: `tests/`
- describe/it 구조, 한국어 테스트 설명
- 회귀 테스트에는 원인 주석 포함:
  ```typescript
  // Regression: ISSUE-NNN — {무엇이 깨졌는지}
  // Found by /qa on {날짜}
  ```

## 테스트 작성 규칙

- 새 함수를 만들면 → 해당 함수의 테스트를 작성
- 버그를 수정하면 → 그 버그를 재현하는 회귀 테스트를 작성
- 에러 핸들링을 추가하면 → 에러를 트리거하는 테스트를 작성
- 조건문(if/else)을 추가하면 → 양쪽 경로 모두 테스트
- 기존 테스트를 깨뜨리는 코드를 커밋하지 않기

## CI

GitHub Actions에서 push/PR마다 자동 실행 (`.github/workflows/test.yml`).
