/**
 * JSON-LD 구조화 데이터가 Google Rich Results 의 기본 요구사항을 만족하는지
 * 검증. Rich Results Test 에 제출하기 전 CI 단계에서 한 번 걸러준다.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { JsonLd } from "@/components/json-ld";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

function extractPayload(): {
  "@context": string;
  "@graph": Array<Record<string, unknown>>;
} {
  const html = renderToStaticMarkup(<JsonLd />);
  const match = html.match(
    /<script type="application\/ld\+json">([\s\S]+?)<\/script>/,
  );
  if (!match) throw new Error("JSON-LD script tag not found");
  // \u003c 이스케이프를 다시 "<" 로 복원해 파싱
  const json = match[1].replace(/\\u003c/g, "<");
  return JSON.parse(json);
}

describe("JsonLd", () => {
  it("@graph 에 Organization, WebSite, SoftwareApplication 세 가지 타입이 있다", () => {
    const payload = extractPayload();
    const types = payload["@graph"].map((g) => g["@type"]);
    expect(types).toEqual(
      expect.arrayContaining([
        "Organization",
        "WebSite",
        "SoftwareApplication",
      ]),
    );
  });

  it("Organization 은 logo, url 을 갖는다", () => {
    const org = extractPayload()["@graph"].find(
      (g) => g["@type"] === "Organization",
    );
    expect(org).toBeDefined();
    expect(org?.url).toBe(SITE_URL);
    expect(org?.logo).toContain("/icon.png");
  });

  it("WebSite 는 ko-KR inLanguage 를 쓴다", () => {
    const website = extractPayload()["@graph"].find(
      (g) => g["@type"] === "WebSite",
    );
    expect(website?.inLanguage).toBe("ko-KR");
    expect(website?.name).toBe(SITE_NAME);
  });

  it("SoftwareApplication 은 KRW 무료 Offer 를 선언한다", () => {
    const app = extractPayload()["@graph"].find(
      (g) => g["@type"] === "SoftwareApplication",
    );
    const offers = app?.offers as Record<string, string>;
    expect(offers?.price).toBe("0");
    expect(offers?.priceCurrency).toBe("KRW");
  });

  it("</script> 시퀀스를 이스케이프해 script 태그 주입을 막는다", () => {
    const html = renderToStaticMarkup(<JsonLd />);
    // 순수 JSON 영역(inner text) 에 "</script>" 가 raw 로 나오면 안 됨
    const match = html.match(
      /<script type="application\/ld\+json">([\s\S]+?)<\/script>/,
    );
    const inner = match?.[1] ?? "";
    expect(inner).not.toContain("</script>");
  });
});
