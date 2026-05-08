import { createClient } from "@/lib/supabase-server";
import { LogoutButton } from "./logout-button";

/**
 * 공통 상단 nav (Server Component).
 *
 * Supabase 세션을 읽어 로그인 상태에 맞는 버튼을 노출한다:
 *   - 로그인 됨: [프리미엄] [대시보드] [로그아웃]
 *   - 비로그인:   [프리미엄] [로그인]
 *
 * 이전(v0.15.x): 홈/`/pricing` 가 자체 nav 를 그리면서 인증 상태를 무시하고
 * 항상 "로그인" 버튼을 노출 → 로그인된 사용자가 홈으로 와도 nav 에 "로그인"이
 * 떠있는 버그. /auth/login 자체는 redirect 가 있어 깨지진 않지만 사용자
 * 혼란 + 로그아웃 진입점이 대시보드에만 있는 문제도 같이 발생.
 *
 * `transparent` prop: 페이지 배경이 grad/이미지일 때 nav 를 투명하게.
 */
export async function SiteNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="flex items-center justify-between px-6 sm:px-8 py-5 max-w-5xl mx-auto">
      <a
        href="/"
        className="text-xl font-bold tracking-tight"
        style={{ fontFamily: "var(--font-manrope), sans-serif" }}
      >
        좌표.to
      </a>
      <div className="flex items-center gap-3 sm:gap-6">
        <a
          href="/pricing"
          className="text-sm hover:opacity-70 transition-opacity hidden sm:inline-flex sm:items-center sm:px-2 sm:py-3"
          style={{ color: "var(--on-surface-variant)" }}
        >
          프리미엄
        </a>
        {user ? (
          <>
            <a
              href="/dashboard"
              className="text-sm px-4 py-2 rounded-full transition-opacity hover:opacity-90"
              style={{
                background: "var(--on-background)",
                color: "var(--surface-lowest)",
              }}
            >
              대시보드
            </a>
            <LogoutButton />
          </>
        ) : (
          <a
            href="/auth/login"
            className="text-sm px-4 py-2 rounded-full transition-opacity hover:opacity-90"
            style={{
              background: "var(--on-background)",
              color: "var(--surface-lowest)",
            }}
          >
            로그인
          </a>
        )}
      </div>
    </nav>
  );
}
