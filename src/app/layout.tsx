import type { Metadata } from "next";
import { Manrope, Plus_Jakarta_Sans } from "next/font/google";
import localFont from "next/font/local";
import { SiteFooter } from "@/components/site-footer";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";

/**
 * 폰트 자체 호스팅 (next/font).
 *
 * 이전(v0.10.x) 에는 layout.tsx 에서 <link rel="stylesheet"> 로 fonts.googleapis.com
 * 과 cdn.jsdelivr.net 을 직접 불렀다. 두 개의 렌더-블로킹 CSS + 그 뒤의 woff2
 * 파일 요청이 매 페이지 FCP 를 100~400ms 늦추고 있었다.
 *
 * next/font 는:
 *   - 빌드타임에 폰트를 다운로드해 정적 자산으로 번들
 *   - <link rel="preload"> 를 자동 주입
 *   - `size-adjust` + fallback metric 을 계산해 layout shift 를 0 에 가깝게 유지
 *
 * 세 폰트 모두 CSS variable 로 노출해 globals.css 와 인라인 스타일이 참조한다.
 */
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
});

// Pretendard 는 Google Fonts 에 없어 public CDN(jsdelivr) 에서 직접 호스팅
// 되고 있었다. 여기서는 단일 variable woff2 를 번들에 포함시켜 자체 호스팅.
// weight 범위는 Pretendard variable 의 wght axis 원본 값 (45~920).
const pretendard = localFont({
  src: "../fonts/PretendardVariable.woff2",
  display: "swap",
  variable: "--font-pretendard",
  weight: "45 920",
  style: "normal",
});

/**
 * 루트 metadata.
 *
 * `metadataBase` 가 있어야 하위 페이지의 상대경로 OG 이미지/canonical 이
 * 절대 URL 로 풀린다. 유니코드 URL 이지만 `URL` 생성자가 punycode 로
 * 정규화한다 (네트워크 레이어). 실제 canonical 링크는 `buildMetadata`
 * (src/lib/seo.ts) 가 유니코드 문자열로 직접 주입.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "좌표.to — 짧고 의미있는 한글 URL",
    template: "%s — 좌표.to",
  },
  description:
    "한글로 된 짧고 의미있는 URL을 만드세요. 좌표.to/go/오늘강의 처럼 누구나 기억하고 입력할 수 있는 주소.",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "좌표.to — 짧고 의미있는 한글 URL",
    description:
      "한글로 된 짧고 의미있는 URL을 만드세요. 강의실, 명함, 전단지에서 바로 쓸 수 있습니다.",
    url: SITE_URL,
    siteName: "좌표.to",
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "좌표.to — 짧고 의미있는 한글 URL",
    description:
      "한글로 된 짧고 의미있는 URL을 만드세요. 강의실, 명함, 전단지에서 바로 쓸 수 있습니다.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${manrope.variable} ${jakarta.variable} ${pretendard.variable} h-full antialiased`}
    >
      <body
        className="min-h-screen flex flex-col"
        style={{ background: "var(--surface)" }}
      >
        <JsonLd />
        <main className="flex-1 flex flex-col">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
