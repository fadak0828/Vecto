import { describe, it, expect } from "vitest";
import { buildMetadata, SITE_URL, SITE_NAME } from "@/lib/seo";

describe("buildMetadata", () => {
  it("루트 기본 metadata를 생성한다", () => {
    const md = buildMetadata();
    expect(md.title).toBe(`${SITE_NAME} — 짧고 의미있는 한글 URL`);
    expect(md.alternates?.canonical).toBe(`${SITE_URL}/`);
    expect(md.openGraph?.locale).toBe("ko_KR");
    expect(md.robots).toEqual({ index: true, follow: true });
  });

  it("title에 사이트명 접미사를 붙인다", () => {
    const md = buildMetadata({ title: "가격" });
    expect(md.title).toBe(`가격 — ${SITE_NAME}`);
  });

  it("path로 canonical URL을 만든다", () => {
    const md = buildMetadata({ path: "/pricing" });
    expect(md.alternates?.canonical).toBe(`${SITE_URL}/pricing`);
  });

  it("description 커스텀", () => {
    const md = buildMetadata({ description: "테스트" });
    expect(md.description).toBe("테스트");
    expect(md.openGraph?.description).toBe("테스트");
    expect(md.twitter?.description).toBe("테스트");
  });

  it("noindex 옵션으로 robots를 뒤집는다", () => {
    const md = buildMetadata({ noindex: true });
    expect(md.robots).toEqual({ index: false, follow: false, nocache: true });
  });

  it("canonical URL은 유니코드 도메인을 유지한다", () => {
    const md = buildMetadata({ path: "/pricing" });
    // "좌표.to" 가 punycode (xn--h25b29s.to) 로 바뀌면 SERP 매칭 우위가 사라진다.
    expect(md.alternates?.canonical).toContain("좌표.to");
    expect(md.alternates?.canonical).not.toContain("xn--");
  });
});

describe("SITE_URL", () => {
  it("유니코드 도메인을 쓴다 (브랜드 SERP 매칭)", () => {
    expect(SITE_URL).toBe("https://좌표.to");
  });

  it("HTTPS 고정", () => {
    expect(SITE_URL.startsWith("https://")).toBe(true);
  });
});
