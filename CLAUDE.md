@AGENTS.md

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Testing
- Run: `bun x vitest run` (~1.5s, 365 tests)
- Test directory: `tests/`
- See TESTING.md for conventions
- 새 함수 → 테스트 작성, 버그 수정 → 회귀 테스트 작성
- 기존 테스트를 깨뜨리는 코드 커밋 금지

## Package manager
- **bun-only.** `bun.lock` is the source of truth.
- Install: `bun add <pkg>` (NEVER `npm install` — would create stale package-lock.json drift)
- CI also uses bun (`.github/workflows/test.yml`)
- `package-lock.json` is gitignored — do not regenerate it

## Environment Variables
- **Source of truth:** `.env.example` — copy to `.env.local` for development.
- **Production:** Vercel 대시보드 > Settings > Environment Variables.
- **Three groups:**
  - **Supabase** — DB/auth/storage. `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용.
  - **PortOne 결제** — `NEXT_PUBLIC_PORTONE_STORE_ID`, `NEXT_PUBLIC_PORTONE_CHANNEL_KEY`, `PORTONE_API_SECRET`, `PORTONE_WEBHOOK_SECRET`. 라이브 키는 PortOne 어드민에서 사업자 인증 + PG 계약 완료 후 발급.
  - **사업자 정보** — `NEXT_PUBLIC_BUSINESS_*` 7개. 전자상거래법 footer/약관/결제 표시 의무. 빈 값일 때 placeholder("등록 진행 중")로 노출되어 사이트는 깨지지 않음. 실제 운영 전에 반드시 채울 것.
- **헬퍼:** `src/lib/business-info.ts` — `businessInfo` 객체 + `isBusinessInfoComplete()` 검사 함수.

## Deploy Configuration
- **Platform:** Vercel (auto-detected from `vercel.json`)
- **Production URL:** https://좌표.to (punycode: `https://xn--h25b29s.to`)
- **Vercel default URL:** https://vecto.vercel.app
- **Auto-deploy:** Vercel deploys on merge to `main`. PR previews on every push.
- **Cron:** `/api/cron/expire` daily at 03:00 UTC (configured in `vercel.json`)
- **Health check:** `curl -sf https://xn--h25b29s.to` should return 200 + Next.js HTML
- **Manual deploy:** none — Vercel handles everything via git integration

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
