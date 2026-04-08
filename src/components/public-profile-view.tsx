import Link from "next/link";
import { ProfilePromoBanner } from "@/components/profile-promo-banner";

/**
 * PublicProfileView — 공개 프로필 페이지 렌더링의 단일 진실 공급원.
 *
 * /[namespace]/page.tsx (실제 공개 페이지) 와
 * /settings/page.tsx (폰 프레임 실시간 보기) 양쪽에서 이 컴포넌트를 사용한다.
 * 이렇게 하면 프리뷰와 실제 페이지가 구조적으로 drift할 수 없다.
 *
 * 디자인 기준: DESIGN.md — High-End Editorial, left-aligned,
 * no cover gradient, Whisper Shadow, 한국어 line-height 1.6-1.8.
 *
 * 서버/클라이언트 양쪽에서 쓸 수 있도록 "use client" 붙이지 않는다.
 * 순수 presentational 컴포넌트 — state/effect/훅 없음.
 */

type Link = { slug: string; target_url: string };

export type PublicProfileViewProps = {
  displayName: string;
  namespaceName: string;
  bio: string | null;
  avatarUrl: string | null;
  links: Link[];
  isPaid: boolean;
  isExpired?: boolean;
  /**
   * "live" — 실제 공개 페이지 (링크 클릭 가능, target="_blank")
   * "preview" — 설정의 미리보기 (링크 클릭 불가, 호버 없음, 스케일 다운)
   */
  variant?: "live" | "preview";
};

export function PublicProfileView({
  displayName,
  namespaceName,
  bio,
  avatarUrl,
  links,
  isPaid,
  isExpired = false,
  variant = "live",
}: PublicProfileViewProps) {
  const isPreview = variant === "preview";

  // 프리뷰에서는 모든 사이즈를 축소해서 300px 폰 프레임에 맞춘다.
  // 구조(layout, alignment, element order)는 절대 변하지 않는다 — 드리프트 방지.
  const sz = {
    containerPx: isPreview ? "px-4 pt-8 pb-8" : "px-6 pt-16 pb-16",
    avatarSize: isPreview ? "w-14 h-14" : "w-20 h-20",
    avatarGap: isPreview ? "gap-3 mb-3" : "gap-5 mb-4",
    avatarFont: isPreview ? "text-xl" : "text-3xl",
    nameFont: isPreview ? "text-base" : "text-2xl",
    slugFont: isPreview ? "text-[10px]" : "text-xs",
    bioFont: isPreview ? "text-xs" : "text-base",
    bioMt: isPreview ? "mt-1.5" : "mt-2",
    headerMb: isPreview ? "mb-5" : "mb-8",
    linkPad: isPreview ? "p-3" : "p-4",
    linkFont: isPreview ? "text-xs" : "text-base",
    linkSpacing: isPreview ? "space-y-2" : "space-y-3",
    footerMt: isPreview ? "mt-8" : "mt-16",
    footerFont: isPreview ? "text-[10px]" : "text-xs",
  };

  return (
    <main
      className="flex-1 w-full"
      style={{ background: "var(--surface)" }}
      data-testid="public-profile-view"
      data-variant={variant}
    >
      <div className={`w-full mx-auto ${sz.containerPx} ${isPreview ? "" : "max-w-lg"}`}>
        {/* Profile header — left-aligned, editorial */}
        <div className={sz.headerMb}>
          <div className={`flex items-center ${sz.avatarGap}`}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                className={`${sz.avatarSize} rounded-full object-cover shrink-0`}
                style={{ border: "3px solid var(--primary)" }}
              />
            ) : (
              <div
                className={`${sz.avatarSize} rounded-full text-white flex items-center justify-center shrink-0 ${sz.avatarFont} font-bold`}
                style={{
                  background:
                    "linear-gradient(135deg, var(--primary), var(--primary-container))",
                }}
              >
                {displayName[0]}
              </div>
            )}
            <div className="min-w-0">
              <h1
                className={`${sz.nameFont} font-bold truncate`}
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                {displayName}
              </h1>
              <p
                className={`${sz.slugFont} mt-1 truncate`}
                style={{
                  color: "var(--on-surface-variant)",
                  fontFamily: "Manrope, sans-serif",
                  fontFeatureSettings: '"tnum"',
                }}
              >
                좌표.to/{namespaceName}
              </p>
            </div>
          </div>
          {bio && (
            <p
              className={`${sz.bioMt} ${sz.bioFont}`}
              style={{ color: "var(--on-surface-variant)", lineHeight: 1.7 }}
            >
              {bio}
            </p>
          )}
        </div>

        {/* Promo banner — free users only. 프리뷰에서도 동일하게 보인다. */}
        {!isPaid && !isPreview && <ProfilePromoBanner />}
        {!isPaid && isPreview && (
          <div
            className="mb-5 p-2.5 rounded-lg"
            style={{ background: "var(--surface-lowest)" }}
          >
            <p
              className="text-[10px] text-center"
              style={{ color: "var(--on-surface-variant)" }}
            >
              프로모 배너 영역
            </p>
          </div>
        )}

        {/* 만료 배너 */}
        {isExpired && (
          <div
            className={`${isPreview ? "p-2.5 mb-4" : "p-4 mb-6"} rounded-xl`}
            style={{ background: "rgba(186,26,26,0.06)" }}
          >
            <p
              className={isPreview ? "text-[10px]" : "text-sm"}
              style={{ color: "var(--error)" }}
            >
              이 프로필의 이용권이 만료되었습니다. 일부 기능이 제한될 수 있습니다.
            </p>
          </div>
        )}

        {/* Links */}
        {links.length === 0 ? (
          <div
            className={`${isPreview ? "py-6" : "py-10"} rounded-2xl`}
            style={{ background: "var(--surface-lowest)" }}
          >
            <p
              className={`font-medium text-center ${
                isPreview ? "text-xs" : "text-base"
              }`}
            >
              아직 등록된 링크가 없습니다
            </p>
          </div>
        ) : (
          <div className={sz.linkSpacing}>
            {links.map((link) =>
              isPreview ? (
                <div
                  key={link.slug}
                  className={`flex items-center gap-3 ${sz.linkPad} rounded-xl`}
                  style={{
                    background: "var(--surface-lowest)",
                    boxShadow: "0 2px 32px rgba(0,0,0,0.03)",
                  }}
                >
                  <span className={`font-medium ${sz.linkFont} truncate`}>
                    {link.slug}
                  </span>
                  <span
                    className="ml-auto text-xs shrink-0"
                    style={{ color: "var(--on-surface-variant)" }}
                  >
                    →
                  </span>
                </div>
              ) : (
                <a
                  key={link.slug}
                  href={link.target_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 ${sz.linkPad} rounded-xl transition-all hover:translate-y-[-2px]`}
                  style={{
                    background: "var(--surface-lowest)",
                    boxShadow: "0 2px 32px rgba(0,0,0,0.03)",
                  }}
                >
                  <span className={`font-medium ${sz.linkFont}`}>{link.slug}</span>
                  <span
                    className="ml-auto text-xs"
                    style={{ color: "var(--on-surface-variant)" }}
                  >
                    →
                  </span>
                </a>
              )
            )}
          </div>
        )}

        <div className={sz.footerMt}>
          {isPreview ? (
            <span
              className={sz.footerFont}
              style={{ color: "var(--on-surface-variant)" }}
            >
              좌표.to에서 나만의 좌표 만들기
            </span>
          ) : (
            <Link
              href="/"
              className={sz.footerFont}
              style={{ color: "var(--on-surface-variant)" }}
            >
              좌표.to에서 나만의 좌표 만들기
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
