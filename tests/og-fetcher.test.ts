// OG fetcher 단위 테스트. SSRF 방어가 critical path.
// 모든 fetch/DNS 호출은 mocking — 실제 네트워크 호출 금지.
import { describe, it, expect, vi } from "vitest";
import { fetchOG, isPrivateIP, parseOGTags } from "@/lib/og-fetcher";

/** Helper: 정상 HTML body를 가진 Response mock */
function htmlResponse(html: string, init?: { status?: number; headers?: Record<string, string> }): Response {
  return new Response(html, {
    status: init?.status ?? 200,
    headers: { "content-type": "text/html; charset=utf-8", ...(init?.headers ?? {}) },
  });
}

/** Helper: 기본 public DNS mock */
const publicDns = async () => ({ address: "93.184.216.34", family: 4 });

describe("isPrivateIP", () => {
  it("IPv4 loopback 127.0.0.0/8 차단", () => {
    expect(isPrivateIP("127.0.0.1")).toBe(true);
    expect(isPrivateIP("127.255.255.254")).toBe(true);
  });

  it("IPv4 10.0.0.0/8 차단", () => {
    expect(isPrivateIP("10.0.0.1")).toBe(true);
    expect(isPrivateIP("10.255.0.1")).toBe(true);
  });

  it("IPv4 172.16.0.0/12 차단", () => {
    expect(isPrivateIP("172.16.0.1")).toBe(true);
    expect(isPrivateIP("172.31.255.255")).toBe(true);
    expect(isPrivateIP("172.15.0.1")).toBe(false); // 경계 바깥
    expect(isPrivateIP("172.32.0.1")).toBe(false);
  });

  it("IPv4 192.168.0.0/16 차단", () => {
    expect(isPrivateIP("192.168.0.1")).toBe(true);
  });

  it("IPv4 169.254.0.0/16 (AWS metadata) 차단", () => {
    expect(isPrivateIP("169.254.169.254")).toBe(true);
  });

  it("IPv6 ::1 차단", () => {
    expect(isPrivateIP("::1")).toBe(true);
  });

  it("IPv6 fc00::/7 ULA 차단", () => {
    expect(isPrivateIP("fc00::1")).toBe(true);
    expect(isPrivateIP("fd12:3456::1")).toBe(true);
  });

  it("IPv6 fe80::/10 link-local 차단", () => {
    expect(isPrivateIP("fe80::1")).toBe(true);
  });

  it("공개 IP는 허용", () => {
    expect(isPrivateIP("8.8.8.8")).toBe(false);
    expect(isPrivateIP("93.184.216.34")).toBe(false);
    expect(isPrivateIP("2001:4860:4860::8888")).toBe(false);
  });
});

describe("parseOGTags", () => {
  it("모든 og:* 태그 파싱", () => {
    const html = `
      <html><head>
      <meta property="og:title" content="Hello World">
      <meta property="og:description" content="A test page">
      <meta property="og:image" content="https://example.com/img.png">
      <meta property="og:site_name" content="Example">
      </head></html>
    `;
    const result = parseOGTags(html);
    expect(result.title).toBe("Hello World");
    expect(result.description).toBe("A test page");
    expect(result.image).toBe("https://example.com/img.png");
    expect(result.site_name).toBe("Example");
  });

  it("og:title 없으면 <title> 폴백", () => {
    const html = `<html><head><title>Fallback Title</title></head></html>`;
    const result = parseOGTags(html);
    expect(result.title).toBe("Fallback Title");
  });

  it("og:title이 있으면 <title>보다 우선", () => {
    const html = `
      <html><head>
      <title>Old Title</title>
      <meta property="og:title" content="New Title">
      </head></html>
    `;
    expect(parseOGTags(html).title).toBe("New Title");
  });

  it("HTML 엔티티 디코드", () => {
    const html = `<meta property="og:title" content="A &amp; B &#39;test&#39;">`;
    expect(parseOGTags(html).title).toBe("A & B 'test'");
  });

  it("malformed HTML에서도 매칭 가능한 건 추출", () => {
    const html = `<meta property='og:title' content='Loose'><title>ignored</title>`;
    expect(parseOGTags(html).title).toBe("Loose");
  });

  it("빈 content는 무시", () => {
    const html = `<meta property="og:title" content="">`;
    expect(parseOGTags(html).title).toBeUndefined();
  });
});

describe("fetchOG — SSRF 방어", () => {
  it("127.0.0.1 IP 리터럴 차단", async () => {
    const fetchMock = vi.fn();
    const result = await fetchOG("http://127.0.0.1/x", {
      fetchImpl: fetchMock as unknown as typeof fetch,
      dnsLookupImpl: publicDns,
    });
    expect(result).toEqual({ ok: false, error: "ssrf_blocked" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("10.0.0.1 IP 리터럴 차단", async () => {
    const result = await fetchOG("http://10.0.0.1/", {
      fetchImpl: vi.fn() as unknown as typeof fetch,
      dnsLookupImpl: publicDns,
    });
    expect(result).toEqual({ ok: false, error: "ssrf_blocked" });
  });

  it("169.254.169.254 (AWS metadata) 차단", async () => {
    const result = await fetchOG("http://169.254.169.254/latest/meta-data/", {
      fetchImpl: vi.fn() as unknown as typeof fetch,
      dnsLookupImpl: publicDns,
    });
    expect(result).toEqual({ ok: false, error: "ssrf_blocked" });
  });

  it("[::1] IPv6 loopback 차단", async () => {
    const result = await fetchOG("http://[::1]/", {
      fetchImpl: vi.fn() as unknown as typeof fetch,
      dnsLookupImpl: publicDns,
    });
    expect(result).toEqual({ ok: false, error: "ssrf_blocked" });
  });

  it("DNS 조회 결과가 private IP면 차단 (internal.example.com → 10.0.0.1)", async () => {
    const fetchMock = vi.fn();
    const result = await fetchOG("http://internal.example.com/", {
      fetchImpl: fetchMock as unknown as typeof fetch,
      dnsLookupImpl: async () => ({ address: "10.0.0.1", family: 4 }),
    });
    expect(result).toEqual({ ok: false, error: "ssrf_blocked" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("리다이렉트가 private IP로 향하면 차단 (TOCTOU)", async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (url: string) => {
      calls.push(url);
      if (url.startsWith("https://public.example.com")) {
        return new Response(null, {
          status: 302,
          headers: { location: "http://127.0.0.1/admin" },
        });
      }
      return htmlResponse("<html></html>");
    });

    // 두 홉 — 첫 홉은 공개(93.x), 두 번째는 IP 리터럴이므로 DNS 무관 바로 차단.
    const result = await fetchOG("https://public.example.com/", {
      fetchImpl: fetchMock as unknown as typeof fetch,
      dnsLookupImpl: publicDns,
    });

    expect(result).toEqual({ ok: false, error: "ssrf_blocked" });
    // 첫 홉만 호출되어야 함 — 두 번째 홉은 DNS 검증에서 차단
    expect(calls).toHaveLength(1);
  });

  it("DNS 조회 실패 → dns_fail", async () => {
    const result = await fetchOG("http://doesnotexist.example/", {
      fetchImpl: vi.fn() as unknown as typeof fetch,
      dnsLookupImpl: async () => {
        throw new Error("ENOTFOUND");
      },
    });
    expect(result).toEqual({ ok: false, error: "dns_fail" });
  });

  it("http:/https: 외 프로토콜 차단", async () => {
    const result = await fetchOG("file:///etc/passwd", {
      fetchImpl: vi.fn() as unknown as typeof fetch,
      dnsLookupImpl: publicDns,
    });
    expect(result).toEqual({ ok: false, error: "ssrf_blocked" });
  });
});

describe("fetchOG — HTTP 상태/에러 매핑", () => {
  it("2초 timeout AbortError → timeout", async () => {
    const fetchMock = vi.fn(async (_url, init?: RequestInit) => {
      // signal이 abort될 때까지 대기
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const e = new Error("aborted");
          (e as { name: string }).name = "AbortError";
          reject(e);
        });
      });
    });

    const result = await fetchOG("https://example.com/", {
      timeoutMs: 20,
      fetchImpl: fetchMock as unknown as typeof fetch,
      dnsLookupImpl: publicDns,
    });
    expect(result).toEqual({ ok: false, error: "timeout" });
  });

  it("4xx → http_4xx", async () => {
    const fetchMock = vi.fn(async () => new Response("nope", { status: 404 }));
    const result = await fetchOG("https://example.com/", {
      fetchImpl: fetchMock as unknown as typeof fetch,
      dnsLookupImpl: publicDns,
    });
    expect(result).toEqual({ ok: false, error: "http_4xx" });
  });

  it("5xx → http_5xx", async () => {
    const fetchMock = vi.fn(async () => new Response("boom", { status: 502 }));
    const result = await fetchOG("https://example.com/", {
      fetchImpl: fetchMock as unknown as typeof fetch,
      dnsLookupImpl: publicDns,
    });
    expect(result).toEqual({ ok: false, error: "http_5xx" });
  });

  it("body > maxBytes → too_large", async () => {
    // 스트리밍 가능한 큰 응답 mock
    const big = "x".repeat(2_000_000);
    const fetchMock = vi.fn(async () => htmlResponse(big));
    const result = await fetchOG("https://example.com/", {
      maxBytes: 1_000_000,
      fetchImpl: fetchMock as unknown as typeof fetch,
      dnsLookupImpl: publicDns,
    });
    expect(result).toEqual({ ok: false, error: "too_large" });
  });

  it("non-html content-type → parse_error", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("{}", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const result = await fetchOG("https://example.com/api.json", {
      fetchImpl: fetchMock as unknown as typeof fetch,
      dnsLookupImpl: publicDns,
    });
    expect(result).toEqual({ ok: false, error: "parse_error" });
  });
});

describe("fetchOG — happy paths", () => {
  it("og:* 정상 파싱 → ok:true", async () => {
    const fetchMock = vi.fn(async () =>
      htmlResponse(`
        <html><head>
        <meta property="og:title" content="Hello">
        <meta property="og:description" content="Description">
        <meta property="og:image" content="https://cdn.example.com/img.png">
        <meta property="og:site_name" content="Example Site">
        </head></html>
      `),
    );
    const result = await fetchOG("https://example.com/", {
      fetchImpl: fetchMock as unknown as typeof fetch,
      dnsLookupImpl: publicDns,
    });
    expect(result).toMatchObject({
      ok: true,
      title: "Hello",
      description: "Description",
      image: "https://cdn.example.com/img.png",
      site_name: "Example Site",
    });
  });

  it("og:* 없으면 <title> 폴백", async () => {
    const fetchMock = vi.fn(async () =>
      htmlResponse("<html><head><title>Just a title</title></head></html>"),
    );
    const result = await fetchOG("https://example.com/", {
      fetchImpl: fetchMock as unknown as typeof fetch,
      dnsLookupImpl: publicDns,
    });
    expect(result).toEqual({ ok: true, title: "Just a title" });
  });

  it("og:image 상대 URL → 절대 URL 변환", async () => {
    const fetchMock = vi.fn(async () =>
      htmlResponse(`
        <meta property="og:title" content="Rel">
        <meta property="og:image" content="/path/to/img.png">
      `),
    );
    const result = await fetchOG("https://example.com/post/123", {
      fetchImpl: fetchMock as unknown as typeof fetch,
      dnsLookupImpl: publicDns,
    });
    expect(result).toEqual({
      ok: true,
      title: "Rel",
      image: "https://example.com/path/to/img.png",
    });
  });

  it("파싱할 수 있는 것이 하나도 없으면 no_og_data", async () => {
    const fetchMock = vi.fn(async () => htmlResponse("<html><body>no head</body></html>"));
    const result = await fetchOG("https://example.com/", {
      fetchImpl: fetchMock as unknown as typeof fetch,
      dnsLookupImpl: publicDns,
    });
    expect(result).toEqual({ ok: false, error: "no_og_data" });
  });

  it("공개 호스트 리다이렉트는 추적", async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (url: string) => {
      calls.push(url);
      if (url === "https://example.com/") {
        return new Response(null, {
          status: 301,
          headers: { location: "https://example.com/final" },
        });
      }
      return htmlResponse(`<meta property="og:title" content="Final">`);
    });
    const result = await fetchOG("https://example.com/", {
      fetchImpl: fetchMock as unknown as typeof fetch,
      dnsLookupImpl: publicDns,
    });
    expect(result).toEqual({ ok: true, title: "Final" });
    expect(calls).toHaveLength(2);
  });
});
