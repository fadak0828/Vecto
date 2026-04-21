/**
 * /go/:slug 단축 URL 경유지는 검색 인덱스에서 완전히 제외되어야 한다.
 *
 * Why: 경유지가 인덱싱되면 (1) 스팸 리다이렉트 경유지로 오인받아 브랜드
 * 신뢰가 추락하고, (2) target_url 이 좌표.to 의 PageRank 를 빌려가며,
 * (3) 수만 개의 무의미한 URL 이 GSC 에 쌓인다.
 *
 * 방어선은 세 겹:
 *  1. robots.txt 의 Disallow (크롤 자체를 막음)
 *  2. 응답 헤더의 X-Robots-Tag (직접 접근 시)
 *  3. nofollow + nosnippet (실수로 인덱싱돼도 PageRank + 스니펫 차단)
 */
import { describe, it, expect } from "vitest";
import { NOINDEX_HEADERS } from "@/app/go/[slug]/route";

describe("/go/:slug noindex 헤더", () => {
  it("noindex 를 포함한다", () => {
    expect(NOINDEX_HEADERS["X-Robots-Tag"]).toContain("noindex");
  });

  it("nofollow 를 포함한다 (PageRank 유출 차단)", () => {
    expect(NOINDEX_HEADERS["X-Robots-Tag"]).toContain("nofollow");
  });

  it("nosnippet 을 포함한다 (실수 인덱싱 시 target_url 노출 차단)", () => {
    expect(NOINDEX_HEADERS["X-Robots-Tag"]).toContain("nosnippet");
  });

  it("세 디렉티브를 한 헤더에 쉼표로 묶는다 (Google 표준 파싱)", () => {
    expect(NOINDEX_HEADERS["X-Robots-Tag"]).toBe(
      "noindex, nofollow, nosnippet",
    );
  });
});
