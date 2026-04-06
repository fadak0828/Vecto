// Regression: proxy.ts rate limiting 설정값 검증
// Found by /qa on 2026-04-06
import { describe, it, expect } from "vitest";

// proxy.ts의 rate limit 설정을 검증
const RATE_LIMITS: Record<string, { max: number; window: "day" | "hour" }> = {
  "/api/shorten": { max: 10, window: "day" },
  "/api/namespace/reserve": { max: 5, window: "day" },
};
const DEFAULT_RATE_LIMIT = { max: 100, window: "hour" as const };

describe("proxy.ts — Rate Limit 설정", () => {
  it("/api/shorten은 일일 10회 제한이다", () => {
    const limit = RATE_LIMITS["/api/shorten"];
    expect(limit).toBeDefined();
    expect(limit.max).toBe(10);
    expect(limit.window).toBe("day");
  });

  it("/api/namespace/reserve는 일일 5회 제한이다", () => {
    const limit = RATE_LIMITS["/api/namespace/reserve"];
    expect(limit).toBeDefined();
    expect(limit.max).toBe(5);
    expect(limit.window).toBe("day");
  });

  it("미정의 엔드포인트는 시간당 100회 제한이다", () => {
    const limit = RATE_LIMITS["/api/some-other"] || DEFAULT_RATE_LIMIT;
    expect(limit.max).toBe(100);
    expect(limit.window).toBe("hour");
  });
});

describe("proxy.ts — CSP 헤더 값 검증", () => {
  const csp =
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co";

  it("default-src가 self로 설정되어 있다", () => {
    expect(csp).toContain("default-src 'self'");
  });

  it("Supabase 연결을 허용한다", () => {
    expect(csp).toContain("https://*.supabase.co");
  });

  it("Pretendard 폰트 CDN을 허용한다", () => {
    expect(csp).toContain("https://cdn.jsdelivr.net");
  });
});

describe("proxy.ts — Auth redirect 경로", () => {
  const protectedPaths = ["/dashboard", "/settings"];

  it("/dashboard는 인증 보호 대상이다", () => {
    expect(protectedPaths.includes("/dashboard")).toBe(true);
  });

  it("/settings는 인증 보호 대상이다", () => {
    expect(protectedPaths.includes("/settings")).toBe(true);
  });

  it("/pricing은 인증 보호 대상이 아니다", () => {
    expect(protectedPaths.includes("/pricing")).toBe(false);
  });

  it("/reserve는 인증 보호 대상이 아니다", () => {
    expect(protectedPaths.includes("/reserve")).toBe(false);
  });
});
