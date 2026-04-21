import { describe, it, expect } from "vitest";
import robots from "@/app/robots";
import { SITE_URL } from "@/lib/seo";

describe("/robots.txt", () => {
  const result = robots();
  const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;

  it("루트는 Allow", () => {
    expect(rule.allow).toBe("/");
  });

  it("/go/ 를 Disallow 한다 (X-Robots-Tag 와 이중 방어)", () => {
    expect(rule.disallow).toContain("/go/");
  });

  it("/api/ 를 Disallow 한다", () => {
    expect(rule.disallow).toContain("/api/");
  });

  it("사용자 전용 라우트를 전부 Disallow 한다", () => {
    expect(rule.disallow).toEqual(
      expect.arrayContaining([
        "/dashboard",
        "/dashboard/",
        "/settings",
        "/settings/",
        "/payment",
        "/payment/",
        "/auth/",
      ]),
    );
  });

  it("sitemap 을 정확한 절대 URL 로 가리킨다", () => {
    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it("host 는 유니코드 도메인", () => {
    expect(result.host).toBe(SITE_URL);
  });
});
