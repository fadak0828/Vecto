import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Next.js metadata file — 빌드 시점에 /robots.txt 로 정적 서빙된다.
 *
 * Disallow 대상:
 *   /go/*        — 단축 URL 리다이렉트. 응답 자체에도 X-Robots-Tag 헤더가
 *                   있지만 robots.txt 로 크롤 요청 자체를 줄여 크롤 예산을
 *                   다른 공개 페이지에 쓰도록 유도.
 *   /api/*       — JSON API. 절대 인덱싱되면 안 됨.
 *   /auth/*      — 로그인 / OAuth 콜백. SSR 플래시 방지.
 *   /dashboard   — 인증 사용자만의 공간.
 *   /settings    — 인증 사용자만의 공간.
 *   /payment     — 결제 플로우. 민감한 쿼리 파라미터 포함.
 *   /reserve     — 예약 플로우 (내부용).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/go/",
          "/api/",
          "/auth/",
          "/dashboard",
          "/dashboard/",
          "/settings",
          "/settings/",
          "/payment",
          "/payment/",
          "/reserve",
          "/reserve/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
