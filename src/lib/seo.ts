import type { Metadata } from "next";

/**
 * 사이트 정식 URL.
 *
 * 유니코드 도메인을 canonical 로 쓰는 이유: 브랜드 검색어(`좌표.to`) 와
 * SERP 표기를 일치시켜 브랜드 매칭 우위를 확보한다. Google 은 2015+ 부터
 * 유니코드 URL 을 정식 인덱싱 대상으로 처리한다.
 *
 * 네트워크 레이어: 브라우저가 IDN 을 DNS 조회 전 punycode
 * (`xn--h25b29s.to`) 로 변환하므로 Host 헤더는 항상 punycode 다.
 * Vercel 의 primary domain 308 redirect 가 `xn--h25b29s.to` → `좌표.to`
 * 정규화를 담당한다 (별도 middleware 불필요).
 */
export const SITE_URL = "https://좌표.to";

export const SITE_NAME = "좌표.to";

const DEFAULT_DESCRIPTION =
  "Bitly 는 bit.ly/3xK9p2, 좌표.to 는 좌표.to/강남맛집. 한글로 짧고 의미있는 URL 을 3초 안에.";

type BuildMetadataInput = {
  /** 페이지 타이틀. ` — 좌표.to` 접미사는 자동 추가. */
  title?: string;
  /** 페이지 description. 누락 시 기본 카피 사용. */
  description?: string;
  /** canonical path. `/pricing` 처럼 슬래시로 시작. */
  path?: string;
  /** 해당 페이지를 인덱싱 금지할지 여부. */
  noindex?: boolean;
};

/**
 * 페이지별 metadata 를 일관된 형태로 생성한다.
 *
 * `layout.tsx` 가 `metadataBase` 를 셋업하므로 canonical/openGraph URL 은
 * 상대 경로만 줘도 되지만, 명시적 절대 URL 이 디버깅/검증에 유리하다.
 */
export function buildMetadata(input: BuildMetadataInput = {}): Metadata {
  const { title, description = DEFAULT_DESCRIPTION, path = "/", noindex } = input;

  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — 짧고 의미있는 한글 URL`;
  const canonicalUrl = `${SITE_URL}${path}`;

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      type: "website",
      locale: "ko_KR",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
    robots: noindex
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
  };
}
