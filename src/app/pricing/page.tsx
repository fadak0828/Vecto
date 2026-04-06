"use client";

import { useState } from "react";
import { PLANS, type Plan } from "@/lib/pricing";

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[1]); // 6개월 기본 선택
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePurchase() {
    setLoading(true);
    setError("");

    try {
      // 1. 서버에서 paymentId 생성
      const res = await fetch("/api/payment/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period_months: selectedPlan.periodMonths }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 401) {
          window.location.href = "/auth/login";
          return;
        }
        if (res.status === 400 && data.error?.includes("네임스페이스")) {
          window.location.href = "/dashboard";
          return;
        }
        setError(data.error || "결제 준비 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      const { paymentId, amount, orderName } = await res.json();

      // 2. PortOne SDK 호출
      const PortOne = await import("@portone/browser-sdk/v2");
      const response = await PortOne.requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        paymentId,
        orderName,
        totalAmount: amount,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
      });

      if (response?.code) {
        // 사용자 취소 또는 에러
        if (response.code === "FAILURE_TYPE_PG") {
          setError("결제가 취소되었습니다.");
        } else {
          setError(response.message || "결제 중 오류가 발생했습니다.");
        }
        setLoading(false);
        return;
      }

      // 3. 결제 완료 페이지로 이동
      window.location.href = `/payment/complete?paymentId=${paymentId}`;
    } catch {
      setError("결제 처리 중 오류가 발생했습니다.");
      setLoading(false);
    }
  }

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

      <main className="px-6 sm:px-8 pt-8 sm:pt-16 pb-20 max-w-5xl mx-auto">
        {/* Hero */}
        <section className="mb-12 sm:mb-20 max-w-3xl">
          <h1
            className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-4 sm:mb-6"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            월 <span style={{ color: "var(--primary)" }}>990원</span>부터.
          </h1>
          <p
            className="text-base sm:text-lg max-w-2xl"
            style={{ color: "var(--on-surface-variant)", lineHeight: 1.8 }}
          >
            좌표.to/내이름 — 말로 전달할 수 있는 전용 주소.
            <br />
            강의실에서 프로젝터에 띄우면 모두가 바로 입력합니다.
          </p>
        </section>

        {/* Plan Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Plans */}
          <div className="lg:col-span-7 space-y-4">
            {PLANS.map((plan) => (
              <button
                key={plan.periodMonths}
                onClick={() => setSelectedPlan(plan)}
                className="w-full flex items-center gap-4 p-5 sm:p-6 rounded-2xl text-left transition-all"
                style={{
                  background:
                    selectedPlan.periodMonths === plan.periodMonths
                      ? "var(--on-background)"
                      : "var(--surface-lowest)",
                  color:
                    selectedPlan.periodMonths === plan.periodMonths
                      ? "var(--surface-lowest)"
                      : "var(--on-background)",
                  boxShadow: "0 2px 32px rgba(0,0,0,0.03)",
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-lg font-bold"
                      style={{ fontFamily: "Manrope, sans-serif" }}
                    >
                      {plan.label}
                    </span>
                    {plan.badge && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-bold uppercase"
                        style={{
                          background:
                            selectedPlan.periodMonths === plan.periodMonths
                              ? "rgba(0,101,101,0.3)"
                              : "var(--primary)",
                          color:
                            selectedPlan.periodMonths === plan.periodMonths
                              ? "#76d6d5"
                              : "white",
                        }}
                      >
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-sm mt-1"
                    style={{
                      opacity: 0.6,
                    }}
                  >
                    월 ₩{plan.monthlyPrice.toLocaleString()} 환산
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className="text-2xl font-extrabold"
                    style={{ fontFamily: "Manrope, sans-serif" }}
                  >
                    ₩{plan.price.toLocaleString()}
                  </span>
                </div>
              </button>
            ))}

            {/* Free plan note */}
            <div
              className="p-5 rounded-2xl"
              style={{ background: "var(--surface-low)" }}
            >
              <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
                <strong>무료 플랜</strong>도 있어요. 좌표.to/go/단축URL 형태로
                하루 10개, 7일 만료로 사용할 수 있습니다.{" "}
                <a href="/" style={{ color: "var(--primary)" }}>
                  무료로 시작하기 →
                </a>
              </p>
            </div>
          </div>

          {/* Purchase Card */}
          <div
            className="lg:col-span-5 p-6 sm:p-8 rounded-2xl sticky top-8"
            style={{
              background: "var(--surface-lowest)",
              boxShadow: "0 8px 48px rgba(0,0,0,0.06)",
            }}
          >
            <h3
              className="text-xl font-bold mb-1"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              프리미엄 이용권
            </h3>
            <p
              className="text-sm mb-6"
              style={{ color: "var(--on-surface-variant)" }}
            >
              좌표.to/내이름 {selectedPlan.label} 이용
            </p>

            <div className="space-y-3 mb-6">
              <Feature text="좌표.to/내이름 전용 주소" />
              <Feature text="프로필 페이지 (소개 + 아바타)" />
              <Feature text="하위 링크 무제한" />
              <Feature text="클릭 통계 (7일 분석)" />
              <Feature text="커스텀 디지털 명함" />
            </div>

            <div
              className="flex items-end justify-between py-4 mb-6"
              style={{
                borderTop: "1px solid var(--surface-container)",
                borderBottom: "1px solid var(--surface-container)",
              }}
            >
              <span className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
                총 결제 금액
              </span>
              <span
                className="text-3xl font-extrabold"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                ₩{selectedPlan.price.toLocaleString()}
              </span>
            </div>

            <button
              onClick={handlePurchase}
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary), var(--primary-container))",
              }}
            >
              {loading ? "결제 준비 중..." : "결제하기"}
            </button>

            {error && (
              <p
                className="text-sm mt-3 text-center"
                style={{ color: "var(--error)" }}
              >
                {error}
              </p>
            )}

            <p
              className="text-center text-xs mt-4"
              style={{ color: "var(--on-surface-variant)" }}
            >
              7일 이내 환불 보장 ·{" "}
              <a href="/terms" style={{ color: "var(--primary)" }}>
                이용약관
              </a>{" "}
              ·{" "}
              <a href="/privacy" style={{ color: "var(--primary)" }}>
                개인정보처리방침
              </a>
            </p>
          </div>
        </div>

        {/* Comparison Table */}
        <section className="mt-20 sm:mt-32">
          <h3
            className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-12"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            무료 vs 프리미엄
          </h3>
          <div className="overflow-x-auto -mx-6 px-6">
            <table
              className="w-full text-left"
              style={{ borderSpacing: "0 12px", borderCollapse: "separate" }}
            >
              <thead>
                <tr>
                  <th
                    className="px-6 sm:px-8 pb-4 text-xs font-bold uppercase tracking-widest"
                    style={{ color: "var(--on-surface-variant)" }}
                  >
                    기능
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
                <ComparisonRow
                  label="URL 구조"
                  free="좌표.to/go/..."
                  premium="좌표.to/내이름"
                  even
                />
                <ComparisonRow
                  label="만료"
                  free="7일"
                  premium="구독 동안 유지"
                />
                <ComparisonRow
                  label="하위 링크"
                  free="—"
                  premium="무제한"
                  even
                />
                <ComparisonRow
                  label="프로필 페이지"
                  free="—"
                  premium="소개 + 아바타"
                />
                <ComparisonRow
                  label="클릭 분석"
                  free="7일"
                  premium="7일 + 링크별 통계"
                  even
                />
                <ComparisonRow
                  label="가격"
                  free="₩0"
                  premium="월 ₩742~990"
                />
              </tbody>
            </table>
          </div>
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
          <div
            className="flex gap-6 text-sm"
            style={{ color: "var(--on-surface-variant)" }}
          >
            <a href="/terms" className="hover:opacity-70 transition-opacity">
              이용약관
            </a>
            <a href="/privacy" className="hover:opacity-70 transition-opacity">
              개인정보 처리방침
            </a>
          </div>
          <span className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
            © 2026 좌표.to
          </span>
        </div>
      </footer>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: "var(--primary)" }}>✓</span>
      <span className="text-sm">{text}</span>
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
        style={{
          background: even ? "var(--surface-low)" : "var(--surface-lowest)",
        }}
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
