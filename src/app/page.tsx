import {
  ClickChartPreview,
  NamespacePillPreview,
  ProfileCardPreview,
  RotatingSlug,
} from "@/components/premium-previews";
import { HeroInteractive } from "./_components/HeroInteractive";

/**
 * 랜딩 페이지.
 *
 * 성능 리팩터 (2026-04-10):
 *   이전(v0.10.x) 에는 전체 816줄이 "use client" 였다. 대부분은 정적 마케팅
 *   컨텐츠이고, 실제 인터랙션은 hero 의 폼 + 애니메이션 + QR 미리보기뿐. 이제는
 *   이 파일이 server component 로 SSR 되고 hero 만 HeroInteractive (client
 *   island) 에서 하이드레이트.
 *
 *   기대 효과:
 *     - FCP ~800~1500ms → ~200~400ms
 *     - 검색 엔진 크롤러에 정적 HTML 로 즉시 노출
 *     - 폰트도 next/font 로 self-host → 렌더 블로킹 외부 CDN 제거 (병목 1)
 */
export default function Home() {
  return (
    <div className="flex-1" style={{ background: "var(--surface)" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-8 py-5 max-w-5xl mx-auto">
        <span
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-manrope), sans-serif" }}
        >
          좌표.to
        </span>
        <div className="flex items-center gap-3 sm:gap-6">
          <a
            href="/pricing"
            className="text-sm hover:opacity-70 transition-opacity hidden sm:inline-flex sm:items-center sm:px-2 sm:py-3"
            style={{ color: "var(--on-surface-variant)" }}
          >
            프리미엄
          </a>
          <a
            href="/auth/login"
            className="text-sm px-4 py-2 rounded-full transition-opacity hover:opacity-90"
            style={{
              background: "var(--on-background)",
              color: "var(--surface-lowest)",
            }}
          >
            로그인
          </a>
        </div>
      </nav>

      {/* Hero — client island */}
      <HeroInteractive />

      {/* Mobile-only nav links */}
      <nav className="flex sm:hidden gap-2 px-6 pb-6">
        <a
          href="/pricing"
          className="flex-1 inline-flex items-center justify-center text-sm font-medium py-3 rounded-xl transition-opacity hover:opacity-90"
          style={{
            background: "var(--surface-container)",
            color: "var(--on-surface)",
          }}
        >
          프리미엄
        </a>
      </nav>

      {/* Premium Features — visual previews instead of text cards.
          RotatingSlug / NamespacePillPreview / ProfileCardPreview /
          ClickChartPreview 는 각자 "use client" 이므로 server component 인
          이 페이지에서 직접 참조해도 자동으로 client island 가 됨. */}
      <section
        className="px-6 sm:px-8 py-12 sm:py-20"
        style={{ background: "var(--surface-lowest)" }}
      >
        <div className="max-w-5xl mx-auto">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--primary)" }}
          >
            이렇게 만들어집니다
          </p>
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-3 sm:mb-4 break-keep"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              textWrap: "balance",
            }}
          >
            한번에 기억되는
            <br />
            나만의 주소를 만드세요.
          </h2>
          <p
            className="text-base sm:text-lg max-w-2xl mb-8 sm:mb-10"
            style={{ color: "var(--on-surface-variant)", lineHeight: 1.8 }}
          >
            텍스트 설명보다 한 번 보는 게 빠릅니다.
          </p>

          {/* 1. Namespace pill — rotating slug, browser-bar style */}
          <div className="mb-8 max-w-md">
            <NamespacePillPreview hideCursor wide>
              <RotatingSlug
                words={[
                  "내이름",
                  "우리가게",
                  "행사이름",
                  "포트폴리오",
                  "강의실",
                ]}
              />
            </NamespacePillPreview>
            <p
              className="text-sm mt-3"
              style={{ color: "var(--on-surface-variant)" }}
            >
              <strong style={{ color: "var(--on-background)" }}>
                전용 주소
              </strong>{" "}
              · 명함, 강의 슬라이드, SNS 어디에나.
            </p>
          </div>

          {/* 2. Profile + Chart — 2 col grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <ProfileCardPreview displayName="홍길동" />
              <p
                className="text-sm mt-3"
                style={{ color: "var(--on-surface-variant)" }}
              >
                <strong style={{ color: "var(--on-background)" }}>
                  프로필 페이지
                </strong>{" "}
                · 모든 링크를 한곳에 모읍니다.
              </p>
            </div>
            <div>
              <ClickChartPreview />
              <p
                className="text-sm mt-3"
                style={{ color: "var(--on-surface-variant)" }}
              >
                <strong style={{ color: "var(--on-background)" }}>
                  클릭 분석
                </strong>{" "}
                · 누가 언제 들어왔는지 한눈에.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA — free signup primary, premium soft mention */}
      <section
        className="px-6 sm:px-8 py-12 sm:py-20"
        style={{
          background:
            "linear-gradient(135deg, var(--primary), var(--primary-container))",
        }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-4 break-keep"
            style={{ fontFamily: "var(--font-manrope), sans-serif" }}
          >
            내 이름, 내 주소.
            <br />
            지금 바로 시작하세요.
          </h2>
          <p
            className="text-white/85 mb-8 break-keep"
            style={{ lineHeight: 1.7 }}
          >
            전 기능 무제한 무료. 카드 등록 없이 좌표.to/내이름 영구 보관.
          </p>
          <div className="flex justify-center">
            <a
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-base shadow-lg hover:scale-[1.02] transition-transform"
              style={{
                background: "var(--surface-lowest)",
                color: "var(--on-background)",
              }}
            >
              내 좌표 만들기 →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
