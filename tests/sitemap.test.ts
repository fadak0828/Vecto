import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";
import { SITE_URL } from "@/lib/seo";

describe("/sitemap.xml", () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);

  it("홈 / 가격 / 법률 페이지만 포함한다", () => {
    expect(urls).toEqual([
      `${SITE_URL}/`,
      `${SITE_URL}/pricing`,
      `${SITE_URL}/privacy`,
      `${SITE_URL}/terms`,
    ]);
  });

  it("공개 서브링크(/[namespace]/[sub]) 를 포함하지 않는다 (크롤 예산 보호)", () => {
    for (const url of urls) {
      const path = url.replace(SITE_URL, "");
      // path 가 슬래시로 구분된 2개 이상의 세그먼트면 서브링크임.
      // /, /pricing → 세그먼트 1개. /foo/bar → 2개 → 차단 대상.
      const segments = path.split("/").filter(Boolean);
      expect(segments.length).toBeLessThanOrEqual(1);
    }
  });

  it("사용자 전용 라우트를 포함하지 않는다", () => {
    const forbidden = ["/dashboard", "/settings", "/payment", "/api", "/go"];
    for (const bad of forbidden) {
      expect(urls.some((u) => u.includes(bad))).toBe(false);
    }
  });

  it("홈의 priority 가 최고", () => {
    const home = entries.find((e) => e.url === `${SITE_URL}/`);
    expect(home?.priority).toBe(1.0);
  });

  it("모든 항목에 lastModified 가 있다", () => {
    for (const entry of entries) {
      expect(entry.lastModified).toBeDefined();
    }
  });
});
