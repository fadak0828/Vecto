import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "요금제 — 좌표.to",
  description: "좌표.to 무료 및 프리미엄 플랜 비교. 나만의 디지털 아이덴티티를 시작하세요.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--surface)" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-8 py-5 max-w-5xl mx-auto">
        <a
          href="/"
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          좌표.to
        </a>
        <div className="flex items-center gap-3 sm:gap-6">
          <a
            href="/dashboard"
            className="text-sm hover:opacity-70 transition-opacity hidden sm:inline"
            style={{ color: "var(--on-surface-variant)" }}
          >
            대시보드
          </a>
          <a
            href="/reserve"
            className="text-sm hover:opacity-70 transition-opacity hidden sm:inline"
            style={{ color: "var(--on-surface-variant)" }}
          >
            이름 예약하기
          </a>
          <a
            href="/auth/login"
            className="text-sm px-4 py-2 rounded-full transition-opacity hover:opacity-90"
            style={{ background: "var(--on-background)", color: "var(--surface-lowest)" }}
          >
            로그인
          </a>
        </div>
      </nav>

      <main className="px-6 sm:px-8 pt-8 sm:pt-16 pb-20 max-w-5xl mx-auto">
        {/* Hero */}
        <section className="mb-12 sm:mb-20 max-w-3xl">
          <h1
            className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-4 sm:mb-6"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            당신의 정체성,
            <br />
            <span style={{ color: "var(--primary)" }}>정확한 위치에.</span>
          </h1>
          <p
            className="text-base sm:text-lg max-w-2xl"
            style={{ color: "var(--on-surface-variant)", lineHeight: 1.8 }}
          >
            당신의 디지털 발자취에 맞는 플랜을 선택하세요.
            단순한 리다이렉트부터 풀스케일 디지털 아이덴티티 관리까지.
          </p>
        </section>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          {/* Free Plan */}
          <div
            className="lg:col-span-5 rounded-3xl p-8 sm:p-10 flex flex-col justify-between"
            style={{
              background: "var(--surface-lowest)",
              boxShadow: "0 32px 64px -12px rgba(0,101,101,0.06)",
            }}
          >
            <div>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <span
                    className="text-xs font-bold uppercase tracking-widest block mb-2"
                    style={{ color: "var(--on-surface-variant)" }}
                  >
                    입문용
                  </span>
                  <h2
                    className="text-3xl font-bold"
                    style={{ fontFamily: "Manrope, sans-serif" }}
                  >
                    무료
                  </h2>
                </div>
                <div className="text-right">
                  <span
                    className="text-4xl font-extrabold"
                    style={{ fontFamily: "Manrope, sans-serif" }}
                  >
                    ₩0
                  </span>
                  <p className="text-xs mt-1" style={{ color: "var(--on-surface-variant)" }}>
                    평생 무료
                  </p>
                </div>
              </div>
              <ul className="space-y-5 mb-10">
                <PricingFeature included text="좌표.to/go/단축URL" />
                <PricingFeature included text="기본 클릭 분석" />
                <PricingFeature included text="하루 10개 생성" />
                <PricingFeature text="커스텀 네임 링크" />
                <PricingFeature text="프로필 페이지" />
              </ul>
            </div>
            <a
              href="/"
              className="block w-full py-4 rounded-xl text-center font-bold transition-opacity hover:opacity-90"
              style={{
                border: "2px solid var(--surface-highest)",
                color: "var(--on-background)",
              }}
            >
              무료로 시작하기
            </a>
          </div>

          {/* Premium Plan */}
          <div
            className="lg:col-span-7 relative rounded-3xl p-8 sm:p-12 flex flex-col justify-between overflow-hidden"
            style={{
              background: "var(--on-background)",
              color: "var(--surface-lowest)",
              boxShadow: "0 32px 64px -12px rgba(0,101,101,0.06)",
            }}
          >
            {/* Decorative blur */}
            <div
              className="absolute -top-24 -right-24 w-64 h-64 blur-[100px]"
              style={{ background: "var(--primary)", opacity: 0.2 }}
            />
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-8 sm:mb-10 gap-4">
                <div>
                  <span
                    className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4"
                    style={{ background: "rgba(0,101,101,0.3)", color: "#76d6d5" }}
                  >
                    가장 인기 있는 플랜
                  </span>
                  <h2
                    className="text-3xl sm:text-4xl font-extrabold"
                    style={{ fontFamily: "Manrope, sans-serif" }}
                  >
                    프리미엄 (개인용)
                  </h2>
                </div>
                <div className="sm:text-right">
                  <span
                    className="text-4xl sm:text-5xl font-extrabold"
                    style={{ fontFamily: "Manrope, sans-serif", color: "#76d6d5" }}
                  >
                    ₩12,000
                  </span>
                  <p className="text-sm mt-1 opacity-50">월 단위 결제</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-x-10 gap-y-5 mb-10 sm:mb-14">
                <PremiumFeature title="좌표.to/본인이름" desc="커스텀 아이덴티티 링크" />
                <PremiumFeature title="디지털 명함" desc="NFC 및 QR 코드 호환" />
                <PremiumFeature title="링크 허브" desc="큐레이션된 링크 컬렉션" />
                <PremiumFeature title="고급 분석 시스템" desc="인구 통계 및 유입 경로" />
                <PremiumFeature title="무제한 서브도메인" desc="blog.좌표.to/이름" />
              </div>
            </div>

            <div className="relative z-10">
              <a
                href="/reserve"
                className="block w-full py-5 sm:py-6 rounded-xl text-center font-extrabold text-lg sm:text-xl text-white transition-opacity hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
                  boxShadow: "0 32px 64px -12px rgba(0,101,101,0.06)",
                }}
              >
                프리미엄 시작하기
              </a>
              <p className="text-center text-xs mt-4 opacity-50">
                30일 이내 환불 보장
              </p>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <section className="mt-20 sm:mt-32">
          <h3
            className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-12"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            기능 상세 비교
          </h3>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left" style={{ borderSpacing: "0 12px", borderCollapse: "separate" }}>
              <thead>
                <tr>
                  <th
                    className="px-6 sm:px-8 pb-4 text-xs font-bold uppercase tracking-widest"
                    style={{ color: "var(--on-surface-variant)" }}
                  >
                    핵심 기능
                  </th>
                  <th
                    className="px-6 sm:px-8 pb-4 text-xs font-bold uppercase tracking-widest"
                    style={{ color: "var(--on-surface-variant)" }}
                  >
                    무료
                  </th>
                  <th
                    className="px-6 sm:px-8 pb-4 text-xs font-bold uppercase tracking-widest"
                    style={{ color: "var(--primary)" }}
                  >
                    프리미엄
                  </th>
                </tr>
              </thead>
              <tbody>
                <ComparisonRow label="URL 구조" free="좌표.to/go/..." premium="좌표.to/[YourName]" even />
                <ComparisonRow label="분석 범위" free="최근 7일" premium="영구 기록 보존" />
                <ComparisonRow label="하위 링크" free="—" premium="20개" even />
                <ComparisonRow label="프로필 페이지" free="—" premium="완전 커스텀" />
                <ComparisonRow label="지원 등급" free="커뮤니티 지원" premium="우선 지원" even />
              </tbody>
            </table>
          </div>
        </section>

        {/* Why Premium */}
        <section className="mt-20 sm:mt-32 max-w-3xl">
          <h4
            className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-6"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            왜 프리미엄인가요?
          </h4>
          <p
            className="text-base sm:text-lg mb-8"
            style={{ color: "var(--on-surface-variant)", lineHeight: 1.8 }}
          >
            퍼스널 브랜딩은 자신만의 장소에서 시작됩니다.
            &ldquo;좌표.to/이름&rdquo;은 단순한 링크가 아닙니다.
            디지털 환경에서 당신의 소유권을 나타내는 강력한 선언입니다.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="px-6 sm:px-8 py-8 sm:py-12"
        style={{ background: "var(--surface-low)" }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 max-w-5xl mx-auto">
          <span
            className="font-bold tracking-tight"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            좌표.to
          </span>
          <div className="flex gap-6 text-sm" style={{ color: "var(--on-surface-variant)" }}>
            <a href="/terms" className="hover:opacity-70 transition-opacity">이용약관</a>
            <a href="/privacy" className="hover:opacity-70 transition-opacity">개인정보 처리방침</a>
          </div>
          <span className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
            © 2026 좌표.to
          </span>
        </div>
      </footer>
    </div>
  );
}

function PricingFeature({ text, included }: { text: string; included?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <span
        className="text-sm"
        style={{ color: included ? "var(--primary)" : "var(--outline-variant)" }}
      >
        {included ? "✓" : "✕"}
      </span>
      <span
        className="font-medium"
        style={{
          color: included ? "var(--on-surface)" : "var(--outline-variant)",
          textDecoration: included ? "none" : "line-through",
        }}
      >
        {text}
      </span>
    </li>
  );
}

function PremiumFeature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <span style={{ color: "#76d6d5" }}>✓</span>
      <div>
        <span className="font-bold text-base sm:text-lg">{title}</span>
        <span className="block text-xs opacity-50">{desc}</span>
      </div>
    </div>
  );
}

function ComparisonRow({
  label,
  free,
  premium,
  even,
}: {
  label: string;
  free: string;
  premium: string;
  even?: boolean;
}) {
  return (
    <tr>
      <td
        className="px-6 sm:px-8 py-5 rounded-l-xl font-medium"
        style={{ background: even ? "var(--surface-low)" : "var(--surface-lowest)" }}
      >
        {label}
      </td>
      <td
        className="px-6 sm:px-8 py-5"
        style={{
          background: even ? "var(--surface-low)" : "var(--surface-lowest)",
          color: "var(--on-surface-variant)",
        }}
      >
        {free}
      </td>
      <td
        className="px-6 sm:px-8 py-5 rounded-r-xl font-bold"
        style={{
          background: even ? "var(--surface-low)" : "var(--surface-lowest)",
          color: "var(--primary)",
        }}
      >
        {premium}
      </td>
    </tr>
  );
}
