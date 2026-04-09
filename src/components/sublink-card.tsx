/**
 * SublinkCard — Editorial Card (방향 A, 80x80)
 *
 * 서버 컴포넌트. 순수 presentational. "use client" 금지 — PublicProfileView가
 * 서버에서 렌더되므로 SublinkCard도 서버 호환이어야 한다.
 *
 * 설계 기준: fadak-main-sublink-detail-og-plan-20260409 + DESIGN.md.
 *
 * 가드레일 (AI slop 금지):
 *   - rounded-full 금지 (썸네일은 카드와 같은 rounded-2xl)
 *   - 보더 금지 (No-Line Rule)
 *   - 썸네일 hover scale/blur 금지
 *   - 썸네일 위 그라디언트 오버레이 금지
 *   - og_description 카드에 절대 표시 금지 (상세 모달 전용)
 *
 * og_image 트러스트 계약: og-fetcher가 수집 시점에 reachable 여부를
 * 검증했다고 가정하고 그대로 <img>로 렌더한다. Dead link는 브라우저의
 * 기본 broken icon을 노출한다. 서버 컴포넌트라 onError JS 핸들러를
 * 붙일 수 없다. TODO: next/image remotePatterns + 폴백 프록시로 교체.
 */

export type SublinkCardLink = {
  slug: string;
  target_url: string;
  og_title: string | null;
  og_image: string | null;
  /** 카드에는 절대 표시하지 않는다 — prop으로 받기만 하고 drop. 상세 모달 전용. */
  og_description?: string | null;
  og_site_name?: string | null;
};

export type SublinkCardProps = {
  link: SublinkCardLink;
  /** slug 메타 러닝헤드용 ("좌표.to/{namespaceName}/{slug}") */
  namespaceName: string;
  variant: "live" | "preview";
};

export function SublinkCard({ link, namespaceName, variant }: SublinkCardProps) {
  const isPreview = variant === "preview";

  // 사이즈 토큰 — 구조는 동일하고 사이즈만 축소 (드리프트 방지 원칙).
  const sz = {
    padding: isPreview ? "p-2.5" : "p-4",
    gap: isPreview ? "gap-2.5" : "gap-4",
    // 썸네일: live 80x80, preview 56x56. 모바일 72x72는 live 한정.
    thumb: isPreview ? "w-14 h-14" : "w-[72px] h-[72px] sm:w-20 sm:h-20",
    thumbInitialFont: isPreview
      ? "text-base"
      : "text-xl sm:text-2xl",
    titleFont: isPreview ? "text-xs" : "text-sm sm:text-base",
    slugMetaFont: isPreview ? "text-[9px]" : "text-[10px]",
    slugMetaMt: "mt-1.5",
  };

  const title = link.og_title ?? null;
  const slugMeta = `좌표.to/${namespaceName}/${link.slug}`;

  // 이니셜 박스에 표시할 글자 — title이 있으면 title[0], 없으면 slug[0].
  const initialChar = (title && title.trim().length > 0
    ? title.trim()[0]
    : link.slug[0]) ?? "•";

  const Thumbnail = (
    <>
      {link.og_image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={link.og_image}
          alt=""
          className={`${sz.thumb} rounded-2xl object-cover shrink-0`}
          style={{ background: "var(--surface-container)" }}
        />
      ) : (
        <div
          aria-hidden="true"
          className={`${sz.thumb} rounded-2xl shrink-0 flex items-center justify-center text-white font-bold ${sz.thumbInitialFont}`}
          style={{
            background:
              "linear-gradient(135deg, var(--primary), var(--primary-container))",
          }}
        >
          {initialChar}
        </div>
      )}
    </>
  );

  const TextStack = (
    <div className="flex-1 min-w-0 flex flex-col justify-center">
      {title && (
        <p
          className={`${sz.titleFont} font-medium line-clamp-2`}
          style={{
            color: "var(--on-background)",
            lineHeight: 1.5,
            fontFamily: "Plus Jakarta Sans, sans-serif",
          }}
        >
          {title}
        </p>
      )}
      <p
        className={`${sz.slugMetaFont} ${title ? sz.slugMetaMt : ""} uppercase tracking-wider font-medium truncate`}
        style={{
          color: "var(--on-surface-variant)",
          fontFeatureSettings: '"tnum"',
          fontFamily: "Manrope, sans-serif",
        }}
      >
        {slugMeta}
      </p>
    </div>
  );

  const Arrow = (
    <span
      className="ml-auto shrink-0 text-xs"
      style={{ color: "var(--on-surface-variant)" }}
      aria-hidden="true"
    >
      →
    </span>
  );

  const baseClass = `flex items-center ${sz.gap} ${sz.padding} rounded-2xl`;
  const baseStyle = {
    background: "var(--surface-lowest)",
    boxShadow: "0 2px 32px rgba(0,0,0,0.03)",
  } as const;

  const ariaLabel = `${title ?? link.slug} 링크로 이동`;

  if (isPreview) {
    return (
      <div className={baseClass} style={baseStyle} data-testid="sublink-card">
        {Thumbnail}
        {TextStack}
        {Arrow}
      </div>
    );
  }

  return (
    <a
      href={link.target_url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      data-testid="sublink-card"
      className={`${baseClass} transition-all hover:translate-y-[-2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
      style={{
        ...baseStyle,
        // focus-visible 색상은 Tailwind arbitrary로 넣지 않고 inline으로 둬서
        // 테마 변수 연동을 유지.
        outlineColor: "var(--primary)",
      }}
    >
      {Thumbnail}
      {TextStack}
      {Arrow}
    </a>
  );
}
