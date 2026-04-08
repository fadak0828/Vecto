// /auth/callback 라우트 핸들러 테스트
// GET 핸들러를 직접 import 해서 호출, exchangeCodeForSession 은 mock.
// OAuth 코드 교환 경로 + open redirect 방어 + provider error 전달 모두 검증.
import { describe, it, expect, vi, beforeEach } from "vitest";

// ────────────────────────────────────────────────────────────
// 라우트 핸들러 직접 호출
// ────────────────────────────────────────────────────────────
const exchangeMock = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      exchangeCodeForSession: exchangeMock,
    },
  })),
}));

// env 변수가 없으면 createServerClient 호출에서 throw — 테스트용 더미 주입
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

function makeRequest(url: string) {
  // NextRequest 최소 shape — 라우트가 사용하는 nextUrl + cookies만 mock
  return {
    nextUrl: new URL(url),
    cookies: {
      getAll: () => [],
    },
  } as unknown as import("next/server").NextRequest;
}

describe("Auth Callback — GET 핸들러 (OAuth 코드 교환)", () => {
  beforeEach(() => {
    exchangeMock.mockReset();
  });

  it("code 누락 시 /auth/login?error=auth_failed 로 리다이렉트", async () => {
    const { GET } = await import("../src/app/auth/callback/route");
    const res = await GET(makeRequest("https://xn--h25b29s.to/auth/callback"));
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/auth/login");
    expect(loc).toContain("error=auth_failed");
    expect(exchangeMock).not.toHaveBeenCalled();
  });

  it("code 있고 exchange 성공 시 /dashboard 로 리다이렉트", async () => {
    exchangeMock.mockResolvedValueOnce({ error: null });
    const { GET } = await import("../src/app/auth/callback/route");
    const res = await GET(
      makeRequest("https://xn--h25b29s.to/auth/callback?code=oauth_xyz")
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://xn--h25b29s.to/dashboard");
    expect(exchangeMock).toHaveBeenCalledWith("oauth_xyz");
  });

  it("code 있고 exchange 실패 시 /auth/login?error=auth_failed 로 리다이렉트", async () => {
    exchangeMock.mockResolvedValueOnce({
      error: { message: "invalid grant" },
    });
    const { GET } = await import("../src/app/auth/callback/route");
    const res = await GET(
      makeRequest("https://xn--h25b29s.to/auth/callback?code=bad_code")
    );
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/auth/login");
    expect(loc).toContain("error=auth_failed");
    expect(exchangeMock).toHaveBeenCalledWith("bad_code");
  });

  it("code + next 파라미터 (정상 상대 경로) 사용", async () => {
    exchangeMock.mockResolvedValueOnce({ error: null });
    const { GET } = await import("../src/app/auth/callback/route");
    const res = await GET(
      makeRequest(
        "https://xn--h25b29s.to/auth/callback?code=ok&next=/settings"
      )
    );
    expect(res.headers.get("location")).toBe("https://xn--h25b29s.to/settings");
  });

  it("code + 악성 next 파라미터 (외부 URL)는 /dashboard 로 폴백", async () => {
    exchangeMock.mockResolvedValueOnce({ error: null });
    const { GET } = await import("../src/app/auth/callback/route");
    const res = await GET(
      makeRequest(
        "https://xn--h25b29s.to/auth/callback?code=ok&next=https://evil.com"
      )
    );
    expect(res.headers.get("location")).toBe("https://xn--h25b29s.to/dashboard");
  });

  it("provider error (access_denied) 만 있고 code 없음 → 원본 코드 전달", async () => {
    const { GET } = await import("../src/app/auth/callback/route");
    const res = await GET(
      makeRequest(
        "https://xn--h25b29s.to/auth/callback?error=access_denied&error_description=User+cancelled"
      )
    );
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/auth/login");
    expect(loc).toContain("error=access_denied");
    expect(loc).not.toContain("error=auth_failed");
    expect(exchangeMock).not.toHaveBeenCalled();
  });

  it("provider error (server_error) 만 있고 code 없음 → 원본 코드 전달", async () => {
    const { GET } = await import("../src/app/auth/callback/route");
    const res = await GET(
      makeRequest("https://xn--h25b29s.to/auth/callback?error=server_error")
    );
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("error=server_error");
  });
});

describe("Auth Callback — next 파라미터 강화 검증 (URL 파싱)", () => {
  it("상대 경로 정상 허용", async () => {
    exchangeMock.mockResolvedValueOnce({ error: null });
    const { GET } = await import("../src/app/auth/callback/route");
    const res = await GET(
      makeRequest(
        "https://xn--h25b29s.to/auth/callback?code=ok&next=/settings"
      )
    );
    expect(res.headers.get("location")).toBe("https://xn--h25b29s.to/settings");
  });

  it("protocol-relative //evil.com 차단", async () => {
    exchangeMock.mockResolvedValueOnce({ error: null });
    const { GET } = await import("../src/app/auth/callback/route");
    const res = await GET(
      makeRequest(
        "https://xn--h25b29s.to/auth/callback?code=ok&next=//evil.com"
      )
    );
    expect(res.headers.get("location")).toBe("https://xn--h25b29s.to/dashboard");
  });

  it("backslash 우회 /\\evil.com 차단", async () => {
    exchangeMock.mockResolvedValueOnce({ error: null });
    const { GET } = await import("../src/app/auth/callback/route");
    const res = await GET(
      makeRequest(
        "https://xn--h25b29s.to/auth/callback?code=ok&next=%2F%5Cevil.com"
      )
    );
    const loc = res.headers.get("location") ?? "";
    // origin 이 다르거나 /dashboard 폴백 둘 중 하나여야 함 (evil.com 호스트로 가면 안 됨)
    expect(loc).not.toContain("evil.com");
    expect(loc.startsWith("https://xn--h25b29s.to/")).toBe(true);
  });

  it("javascript: 스키마 차단", async () => {
    exchangeMock.mockResolvedValueOnce({ error: null });
    const { GET } = await import("../src/app/auth/callback/route");
    const res = await GET(
      makeRequest(
        "https://xn--h25b29s.to/auth/callback?code=ok&next=javascript%3Aalert(1)"
      )
    );
    expect(res.headers.get("location")).toBe("https://xn--h25b29s.to/dashboard");
  });

  it("next 누락 시 /dashboard 기본값", async () => {
    exchangeMock.mockResolvedValueOnce({ error: null });
    const { GET } = await import("../src/app/auth/callback/route");
    const res = await GET(
      makeRequest("https://xn--h25b29s.to/auth/callback?code=ok")
    );
    expect(res.headers.get("location")).toBe("https://xn--h25b29s.to/dashboard");
  });
});
