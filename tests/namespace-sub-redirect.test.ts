/**
 * Bot detection + share preview HTML for /:namespace/:sub route.
 *
 * Regression guard for "좌표.to 브랜드 이미지가 타겟 썸네일 대신 노출되는" 버그.
 * 카카오톡/페북이 302를 안 따라갈 때 서브링크 프리뷰에 좌표.to 루트의
 * opengraph-image가 삽입되던 걸, 저장된 og_* 필드를 담은 HTML로 교체해서
 * 해결한다.
 */
import { describe, it, expect } from "vitest";
import { BOT_UA_REGEX, sharePreviewHtml } from "@/app/[namespace]/[sub]/route";

describe("BOT_UA_REGEX", () => {
  it("detects KakaoTalk link preview bot", () => {
    expect(
      BOT_UA_REGEX.test("kakaotalk-scrap/1.0 (+https://devtalk.kakao.com/)"),
    ).toBe(true);
    expect(BOT_UA_REGEX.test("KakaoTalk/10.1.0 (Mobile; iOS 17.0)")).toBe(true);
  });

  it("detects major social crawlers", () => {
    const uas = [
      "facebookexternalhit/1.1",
      "Twitterbot/1.0",
      "Slackbot-LinkExpanding 1.0",
      "Discordbot/2.0",
      "TelegramBot (like TwitterBot)",
      "LinkedInBot/1.0",
      "WhatsApp/2.0",
      "Mozilla/5.0 (compatible; Googlebot/2.1)",
      "Mozilla/5.0 (compatible; bingbot/2.0)",
      "Mozilla/5.0 (compatible; Applebot/0.1)",
    ];
    for (const ua of uas) {
      expect(BOT_UA_REGEX.test(ua)).toBe(true);
    }
  });

  it("does NOT match common human browsers", () => {
    const humans = [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Version/17.2 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    ];
    for (const ua of humans) {
      expect(BOT_UA_REGEX.test(ua)).toBe(false);
    }
  });

  it("does NOT match empty user-agent", () => {
    expect(BOT_UA_REGEX.test("")).toBe(false);
  });
});

describe("sharePreviewHtml", () => {
  const baseOpts = {
    targetUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    nsName: "fadak",
    subSlug: "노션",
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    ogSiteName: null,
  };

  it("uses og_title as the primary title when present", () => {
    const html = sharePreviewHtml({
      ...baseOpts,
      ogTitle: "Rick Astley - Never Gonna Give You Up",
    });
    expect(html).toContain(
      '<meta property="og:title" content="Rick Astley - Never Gonna Give You Up">',
    );
    expect(html).toContain(
      '<meta name="twitter:title" content="Rick Astley - Never Gonna Give You Up">',
    );
  });

  it("falls back to ns/sub when og_title missing", () => {
    const html = sharePreviewHtml(baseOpts);
    expect(html).toContain('<meta property="og:title" content="fadak/노션">');
  });

  it("og:url points to the TARGET URL, not 좌표.to", () => {
    const html = sharePreviewHtml({
      ...baseOpts,
      ogTitle: "YouTube",
    });
    expect(html).toContain(
      '<meta property="og:url" content="https://www.youtube.com/watch?v=dQw4w9WgXcQ">',
    );
    // Must NOT contain a 좌표.to og:url that would override the target.
    expect(html).not.toMatch(/property="og:url"\s+content="https?:\/\/[^"]*좌표\.to/);
  });

  it("includes og:image and twitter summary_large_image when og_image set", () => {
    const html = sharePreviewHtml({
      ...baseOpts,
      ogImage: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    });
    expect(html).toContain(
      '<meta property="og:image" content="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg">',
    );
    expect(html).toContain(
      '<meta name="twitter:card" content="summary_large_image">',
    );
  });

  it("falls back to twitter:card summary when og_image missing", () => {
    const html = sharePreviewHtml(baseOpts);
    expect(html).toContain('<meta name="twitter:card" content="summary">');
    expect(html).not.toContain("summary_large_image");
  });

  it("includes og:description when provided", () => {
    const html = sharePreviewHtml({
      ...baseOpts,
      ogDescription: "최고의 링크 단축",
    });
    expect(html).toContain(
      '<meta property="og:description" content="최고의 링크 단축">',
    );
    expect(html).toContain('<meta name="description" content="최고의 링크 단축">');
  });

  it("always includes meta refresh to target for human browsers", () => {
    const html = sharePreviewHtml(baseOpts);
    expect(html).toContain(
      '<meta http-equiv="refresh" content="0;url=https://www.youtube.com/watch?v=dQw4w9WgXcQ">',
    );
  });

  it("escapes HTML in target URL and title (XSS guard)", () => {
    const html = sharePreviewHtml({
      ...baseOpts,
      targetUrl: 'https://evil.example/"><script>alert(1)</script>',
      ogTitle: '<img src=x onerror=alert(2)>',
    });
    // Raw opening tags must be escaped — no live <script> or <img in the output.
    expect(html).not.toContain("<script>alert");
    expect(html).not.toMatch(/<img[^>]+onerror/);
    // Must escape to &lt; etc.
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img");
  });

  it("does NOT emit the 좌표.to root opengraph-image (regression: brand image override)", () => {
    // The core bug: /opengraph-image.tsx auto-applied by Next's file convention
    // when there's no explicit og:image. The HTML must set og:image itself (or
    // omit it and let the bot show no preview) so Next's auto-fallback never
    // injects the root brand image for sublink share previews.
    const html = sharePreviewHtml(baseOpts);
    expect(html).not.toContain("좌표.to");
    expect(html).not.toContain("opengraph-image");
  });
});
