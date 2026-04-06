# Testing — 좌표.to

## Philosophy

100% 테스트 커버리지가 목표입니다. 테스트는 빠르게 움직이면서도 안전하게 배포할 수 있게 해줍니다.
테스트 없는 코딩은 안전벨트 없이 운전하는 것과 같습니다.

## Framework

- **Vitest** v4 — 빠른 테스트 러너 (92ms에 52개 테스트)
- **@testing-library/react** — 컴포넌트 테스트 (jsdom 환경)
- **Node environment** — 순수 로직 테스트 (기본값)

## 테스트 실행

```bash
npm test              # 전체 테스트 실행
npm run test:watch    # 파일 변경 시 자동 재실행
npm run test:coverage # 커버리지 리포트
```

## 테스트 구조

```
tests/
├── html-escape.test.ts       # XSS 방어 유틸
├── slug-validation.test.ts   # 슬러그/URL 검증
├── auth-callback.test.ts     # Open redirect 방어
├── api-shorten.test.ts       # URL 단축 API 로직
└── proxy-rate-limit.test.ts  # Rate limiting + CSP + auth 경로
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
