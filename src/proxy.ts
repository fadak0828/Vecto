import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isMakerHost, extractOriginalUrl } from "@/lib/prefix-url";

/**
 * Next.js 16 Proxy (구 middleware)
 *
 * 0. 만들기.좌표.to 호스트 → 주소창 접두어 방식 단축 URL 생성으로 rewrite
 * 1. CSP 헤더 추가
 * 2. POST 요청 rate limiting (Supabase 기반)
 * 3. /dashboard, /settings 인증 체크
 */

const RATE_LIMITS: Record<string, { max: number; window: "day" | "hour" }> = {
  "/api/shorten": { max: 10, window: "day" },
  "/api/namespace/reserve": { max: 5, window: "day" },
};
const DEFAULT_RATE_LIMIT = { max: 100, window: "hour" as const };

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 0. 주소창 접두어 방식 (만들기.좌표.to 호스트 전용) ───────────────────
  // 이 호스트에서만 실행해 기존 단축 URL 리다이렉트 경로와 충돌을 막는다.
  // request.url(디코딩 안 된 raw 문자열)에서 원본 URL 을 추출해 헤더에 담아
  // /api/prefix 로 rewrite 한다. pathname 은 쿼리를 잃으므로 쓰지 않는다.
  if (isMakerHost(request.headers.get("host"))) {
    const original = extractOriginalUrl(request.url);
    const url = request.nextUrl.clone();
    url.pathname = "/api/prefix";
    url.search = "";
    const headers = new Headers(request.headers);
    if (original) {
      headers.set("x-prefix-original-url", original);
    } else {
      headers.delete("x-prefix-original-url");
    }
    return NextResponse.rewrite(url, { request: { headers } });
  }

  // 접두어 호스트가 아니면, 기존 matcher 대상 경로(/api/*, /dashboard,
  // /settings)에만 아래 로직을 적용한다. 그 외 경로는 손대지 않아 broaden 된
  // matcher 가 다른 라우트의 동작(CSP, OG 이미지 등)을 바꾸지 않게 한다.
  const isApi = pathname.startsWith("/api/");
  const isProtected = pathname === "/dashboard" || pathname === "/settings";
  if (!isApi && !isProtected) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // CSP 헤더
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.portone.io; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://api.portone.io https://us.i.posthog.com https://us-assets.i.posthog.com; frame-src https://*.portone.io"
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");

  // /dashboard, /settings 인증 체크
  if (pathname === "/dashboard" || pathname === "/settings") {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  // POST rate limiting
  if (request.method === "POST" && pathname.startsWith("/api/")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const limit = RATE_LIMITS[pathname] || DEFAULT_RATE_LIMIT;

    // Supabase 기반 rate limit 체크 (Edge runtime에서 DB 호출)
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options);
              });
            },
          },
        }
      );

      const today = new Date().toISOString().split("T")[0];

      const query = supabase
        .from("rate_limits")
        .select("*", { count: "exact", head: true })
        .eq("ip", ip)
        .eq("endpoint", pathname);

      // day 윈도우: window_date 기준, hour 윈도우: window_start 기준
      if (limit.window === "day") {
        query.eq("window_date", today);
      } else {
        query.gte("window_start", new Date(Date.now() - 60 * 60 * 1000).toISOString());
      }

      const { count } = await query;

      if ((count ?? 0) >= limit.max) {
        return NextResponse.json(
          {
            error: "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
            retry_after: limit.window === "day" ? "tomorrow" : "1 hour",
          },
          { status: 429 }
        );
      }

      // 카운트 기록
      await supabase.from("rate_limits").insert({
        ip,
        endpoint: pathname,
        window_date: today,
        window_start: new Date().toISOString(),
      });
    } catch {
      // rate limit 체크 실패해도 요청은 통과시킴 (가용성 우선)
    }
  }

  return response;
}

// 만들기.좌표.to 의 임의 경로(`/https://...`)를 가로채려면 모든 경로에서
// proxy 가 돌아야 한다. 정적 자산은 제외해 오버헤드를 줄이고, 위 함수에서
// 호스트/경로로 carve-out 하므로 다른 라우트 동작은 그대로 유지된다.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
