import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Next.js metadata file — 빌드 시점에 /sitemap.xml 로 정적 서빙된다.
 *
 * 의도적으로 **정적 공개 라우트만** 포함.
 *  - 홈, 가격, 법률 페이지는 인덱싱 대상
 *  - 공개 서브링크(/[namespace]/[slug]) 는 별도 설계가 필요하므로 이 sitemap
 *    에서는 제외. 사용자가 수만 개의 서브링크를 생성하면 크롤 예산이 터지고
 *    스팸 리스크도 올라간다. 인덱싱 전략이 명확해진 뒤에 동적 sitemap 추가.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
