import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next.js 16 Proxy (구 middleware)
 *
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
  const response = NextResponse.next();

  // CSP 헤더
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.portone.io; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://api.portone.io; frame-src https://*.portone.io"
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

export const config = {
  matcher: ["/api/:path*", "/dashboard", "/settings"],
};
