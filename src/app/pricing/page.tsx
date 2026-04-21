import { notFound } from "next/navigation";
import { MONTHLY_PRICE } from "@/lib/pricing";
import { businessInfo } from "@/lib/business-info";
import { paymentsEnabled } from "@/lib/feature-flags";
import { buildMetadata } from "@/lib/seo";
import { CheckoutCard } from "./_components/CheckoutCard";

export const metadata = buildMetadata({
  title: "가격",
  description:
    "좌표.to 는 무료로 시작합니다. 한글 커스텀 슬러그와 네임스페이스가 필요하면 월 구독으로 확장하세요.",
  path: "/pricing",
  // 결제 연동 완료 전까지 /pricing 은 notFound() 로 막혀 있으므로 색인 대상 아님.
  noindex: !paymentsEnabled,
});

/**
 * /pricing — Single SKU Freemium 가격 페이지.
 *
 * 성능 리팩터 (2026-04-10):
 *   이전에는 전체 페이지가 "use client" 였다. 실제 client state 는 결제 버튼
 *   하나의 loading 상태뿐인데 341줄 전부가 JS 번들에 포함되고 있었다.
 *   이제는 page.tsx 가 server component 로 정적 마케팅 컨텐츠를 SSR 하고,
 *   결제 카드만 CheckoutCard 클라 island 로 분리.
 */
export default function PricingPage() {
  // 결제 연동 완료 전까지 /pricing 자체를 404로 막는다. UI만 감추는 것으로는
  // 직링크(네이버/구글 색인)로 들어온 사용자가 깨진 결제 버튼을 보게 된다.
  if (!paymentsEnabled) {
    notFound();
  }

  // 카카오페이 채널키 미설정 시 버튼 자동 비활성화 → 사용자에게 즉시 신호.
  // NEXT_PUBLIC_* 는 빌드 타임 인라인이므로 빈 문자열/undefined 양쪽 체크.
  const kakaopayChannelKey =
    process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_KAKAOPAY;
  const kakaopayEnabled =
    !!kakaopayChannelKey && kakaopayChannelKey.length > 0;

  const monthly = MONTHLY_PRICE.toLocaleString("ko-KR");

  // 런칭 위크 배너 — NEXT_PUBLIC_EVENT_END_AT (ISO8601) 미래이면 노출.
  const eventEndAt = process.env.NEXT_PUBLIC_EVENT_END_AT;
  const eventActive = !!eventEndAt && new Date(eventEndAt) > new Date();

  return (
    <div className="flex-1" style={{ background: "var(--surface)" }}>
      {eventActive && (
        <div
          role="banner"
          aria-label="런칭 이벤트 안내"
          className="w-full py-2.5 text-center text-xs sm:text-sm font-bold tracking-wide break-keep"
          style={{
            background:
              "linear-gradient(135deg, var(--primary), var(--primary-container))",
            color: "var(--surface-lowest)",
          }}
        >
          LAUNCH WEEK · 런칭 위크 한정, 첫 1개월 무료
        </div>
      )}
      <nav className="flex items-center justify-between px-6 sm:px-8 py-5 max-w-5xl mx-auto">
        <a
          href="/"
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-manrope), sans-serif" }}
        >
          좌표.to
        </a>
        <div className="flex items-center gap-3 sm:gap-6">
          <a
            href="/dashboard"
            className="text-sm hover:opacity-70 transition-opacity hidden sm:inline-flex"
            style={{ color: "var(--on-surface-variant)" }}
          >
            대시보드
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

      <main className="px-6 sm:px-8 pt-6 sm:pt-12 pb-20 max-w-md mx-auto">
        {/* Hero */}
        <section className="mb-8 text-center">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--primary)" }}
          >
            Premium
          </p>
          <h1
            className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-3 break-keep"
            style={{ fontFamily: "var(--font-manrope), sans-serif" }}
          >
            첫 1개월 무료
          </h1>
          <p
            className="text-sm sm:text-base break-keep"
            style={{ color: "var(--on-surface-variant)", lineHeight: 1.7 }}
          >
            이후 월{" "}
            <span className="price-display font-bold">₩{monthly}</span> 자동
            결제 · 언제든 1클릭 해지
          </p>
        </section>

        {/* Subscribe card — No-Line 원칙: 1px border 제거, 톤 블록만 사용. */}
        <div
          className="p-6 sm:p-8 rounded-2xl mb-8"
          style={{
            background: "var(--surface-lowest)",
            boxShadow: "0 8px 48px rgba(0,0,0,0.06)",
          }}
        >
          <CheckoutCard kakaopayEnabled={kakaopayEnabled} />

          {/* 톤 블록으로 구분 (No-Line 원칙) */}
          <div
            className="mt-6 -mx-6 sm:-mx-8 px-6 sm:px-8 py-5 space-y-2.5"
            style={{ background: "var(--surface-low)" }}
          >
            <h2
              className="text-xs font-bold uppercase tracking-widest mb-1"
              style={{ color: "var(--on-surface-variant)" }}
            >
              프리미엄에 포함된 것
            </h2>
            <Feature text="프로필 페이지 상단 안내 1줄 숨김" />
            <Feature text="클릭 통계 대시보드 (7일 분석)" />
            <Feature text="매월 자동갱신 · 언제든 해지" />
          </div>

          <p
            className="text-center text-xs mt-5 leading-relaxed break-keep"
            style={{ color: "var(--on-surface-variant)" }}
          >
            문의: {businessInfo.email} ·{" "}
            <a href="/terms" style={{ color: "var(--primary)" }}>
              이용약관
            </a>{" "}
            ·{" "}
            <a href="/privacy" style={{ color: "var(--primary)" }}>
              개인정보처리방침
            </a>
          </p>
        </div>

        {/* Free plan note */}
        <section
          className="p-5 rounded-2xl"
          style={{ background: "var(--surface-low)" }}
        >
          <h2
            className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: "var(--on-surface-variant)" }}
          >
            무료 플랜
          </h2>
          <p
            className="text-sm break-keep"
            style={{ color: "var(--on-surface-variant)", lineHeight: 1.7 }}
          >
            전 기능 무제한. 좌표.to/내이름 영구 보관. 프로필 페이지와 하위
            링크를 무제한으로 만드세요. 페이지 상단에 작은 좌표.to 안내 1줄이
            표시됩니다.
          </p>
          <a
            href="/dashboard"
            className="inline-block mt-3 text-sm font-semibold"
            style={{ color: "var(--primary)" }}
          >
            무료로 시작하기 →
          </a>
        </section>
      </main>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: "var(--primary)" }}>✓</span>
      <span className="text-sm break-keep">{text}</span>
    </div>
  );
}
