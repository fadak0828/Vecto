import { businessInfo } from "@/lib/business-info";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * JSON-LD 구조화 데이터.
 *
 * 세 가지 schema.org 타입을 한 번에 주입:
 *  1. Organization  — SERP 사이드카드 + 네이버/구글 브랜드 엔티티
 *  2. WebSite       — SearchAction 선언 (브라우저 주소창 검색 통합)
 *  3. SoftwareApplication — 앱 카테고리/가격 노출
 *
 * 서버 컴포넌트에서 렌더해 초기 HTML 에 그대로 박힌다. Google 의 Rich
 * Results Test 로 검증 가능. `dangerouslySetInnerHTML` 를 쓰는 건 스펙상
 * `<script type="application/ld+json">` 내부 텍스트가 이스케이프되지 않은
 * JSON 이어야 하기 때문이다.
 */
export function JsonLd() {
  const graph = [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: businessInfo.name || SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.png`,
      email: businessInfo.email,
      ...(businessInfo.address && { address: businessInfo.address }),
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: "한글로 짧고 의미있는 URL 을 3초 안에.",
      inLanguage: "ko-KR",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#application`,
      name: SITE_NAME,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "KRW",
      },
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ];

  const payload = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return (
    <script
      type="application/ld+json"
      // JSON 직렬화 + </script> 종료 회피를 위한 슬래시 이스케이프
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(payload).replace(/</g, "\\u003c"),
      }}
    />
  );
}
