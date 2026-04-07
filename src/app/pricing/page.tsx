"use client";

import { useState } from "react";
import { PLANS, roughMonthly, type Plan } from "@/lib/pricing";

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
    <div className="flex-1" style={{ background: "var(--surface)" }}>
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

      <main className="px-6 sm:px-8 pt-6 sm:pt-12 lg:pt-6 pb-20 max-w-5xl mx-auto">
        {/* Hero — compact on mobile so purchase card lands high; tighter spacing on lg so the whole purchase card fits above the fold */}
        <section className="mb-6 sm:mb-16 lg:mb-6 max-w-3xl">
          <h1
            className="text-2xl sm:text-5xl md:text-6xl lg:text-5xl font-extrabold tracking-tight leading-tight mb-2 sm:mb-6 lg:mb-3"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            월 <span style={{ color: "var(--primary)" }}>약 740원</span>부터.
          </h1>
          <p
            className="text-sm sm:text-lg lg:text-base max-w-2xl"
            style={{ color: "var(--on-surface-variant)", lineHeight: 1.7 }}
          >
            좌표.to/내이름 — 말로 전달할 수 있는 전용 주소.
            <span className="hidden sm:inline lg:hidden">
              <br />
              강의실에서 프로젝터에 띄우면 모두가 바로 입력합니다.
            </span>
          </p>
        </section>

        {/* Plan Selector — mobile: purchase card first; desktop: plans left, purchase right */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:items-start">
          {/* Plans */}
          <div className="order-2 lg:order-none lg:col-span-7 space-y-4">
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
                              ? "var(--primary-light)"
                              : "white",
                        }}
                      >
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-sm mt-1"
                    style={{ opacity: 0.6 }}
                  >
                    총 ₩{plan.price.toLocaleString()} 결제
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-baseline gap-1 justify-end">
                    <span
                      className="text-sm font-medium"
                      style={{ opacity: 0.6 }}
                    >
                      약
                    </span>
                    <span
                      className="text-3xl sm:text-4xl font-extrabold leading-none"
                      style={{ fontFamily: "Manrope, sans-serif" }}
                    >
                      ₩{roughMonthly(plan.monthlyPrice).toLocaleString()}
                    </span>
                    <span className="text-sm font-medium" style={{ opacity: 0.7 }}>
                      / 월
                    </span>
                  </div>
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
            className="order-1 lg:order-none lg:col-span-5 p-6 sm:p-8 lg:p-6 rounded-2xl lg:sticky lg:top-6"
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
              className="text-sm mb-5 lg:mb-4"
              style={{ color: "var(--on-surface-variant)" }}
            >
              좌표.to/내이름 {selectedPlan.label} 이용
            </p>

            <div
              className="py-5 lg:py-4 mb-5 lg:mb-4"
              style={{
                borderTop: "1px solid var(--surface-container)",
                borderBottom: "1px solid var(--surface-container)",
              }}
            >
              <div className="flex items-baseline gap-1.5">
                <span
                  className="text-base font-medium"
                  style={{ color: "var(--on-surface-variant)", opacity: 0.7 }}
                >
                  약
                </span>
                <span
                  className="text-4xl sm:text-5xl font-extrabold"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                >
                  ₩{roughMonthly(selectedPlan.monthlyPrice).toLocaleString()}
                </span>
                <span
                  className="text-base font-medium"
                  style={{ color: "var(--on-surface-variant)" }}
                >
                  / 월
                </span>
              </div>
              <p
                className="text-xs mt-2"
                style={{ color: "var(--on-surface-variant)" }}
              >
                {selectedPlan.label} 총{" "}
                <span className="font-bold">
                  ₩{selectedPlan.price.toLocaleString()}
                </span>{" "}
                결제
              </p>
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
              className="text-center text-xs mt-4 leading-relaxed"
              style={{ color: "var(--on-surface-variant)" }}
            >
              결제 후 7일 이내 미사용 시 전액 환불.
              <br />
              환불 문의: support@xn--h25b29s.to
            </p>

            <div
              className="mt-5 lg:mt-4 pt-5 lg:pt-4 space-y-2.5 lg:space-y-2"
              style={{ borderTop: "1px solid var(--surface-container)" }}
            >
              <Feature text="좌표.to/내이름 전용 주소" />
              <Feature text="프로필 페이지 (소개 + 아바타)" />
              <Feature text="하위 링크 무제한" />
              <Feature text="클릭 통계 (7일 분석)" />
              <Feature text="커스텀 디지털 명함" />
            </div>

            <p
              className="text-center text-xs mt-5"
              style={{ color: "var(--on-surface-variant)" }}
            >
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

        {/* Premium benefits — value statements, not comparison */}
        <section className="mt-20 sm:mt-32">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--primary)" }}
          >
            프리미엄으로 얻는 것
          </p>
          <h3
            className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-4 sm:mb-6"
            style={{ fontFamily: "Manrope, sans-serif", textWrap: "balance" }}
          >
            짧은 주소가 아니라,
            <br />
            기억되는 주소.
          </h3>
          <p
            className="text-base sm:text-lg max-w-2xl mb-8 sm:mb-12"
            style={{ color: "var(--on-surface-variant)", lineHeight: 1.8 }}
          >
            좌표.to/내이름은 명함, 강의 슬라이드, 인스타 바이오 어디에나 어울립니다.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BenefitCard
              title="내 이름이 곧 주소"
              desc="좌표.to/내이름. 사람들이 한 번 보면 잊지 않습니다. 명함 대신, 슬랙 프로필 대신, 한 줄로."
            />
            <BenefitCard
              title="하위 링크 무제한"
              desc="/노션, /유튜브, /깃허브... 원하는 만큼 추가하세요. 모든 링크를 한 곳에 모읍니다."
            />
            <BenefitCard
              title="프로필 페이지 자동 생성"
              desc="소개 + 아바타로 나만의 랜딩 페이지가 완성됩니다. 디지털 명함, 끝."
            />
            <BenefitCard
              title="클릭 분석 대시보드"
              desc="누가 언제 어디서 클릭했는지 한눈에. 강의 후기, 마케팅 효과를 데이터로."
            />
            <BenefitCard
              title="만료 신경 쓰지 않기"
              desc="구독하는 동안 주소는 영원히 당신의 것. 7일 만료 없이 계속 사용하세요."
            />
            <BenefitCard
              title="발음할 수 있는 URL"
              desc="bit.ly/3jAzD9F를 전화로 불러본 적 있나요? 좌표.to/홍길동은 한 번에 통합니다."
            />
          </div>
        </section>
      </main>
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

function BenefitCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div
      className="rounded-2xl p-6 sm:p-7 transition-all hover:translate-x-0.5"
      style={{
        background: "var(--surface-lowest)",
        boxShadow: "var(--shadow-whisper)",
      }}
    >
      <h4
        className="text-lg sm:text-xl font-bold mb-2 break-keep"
        style={{
          fontFamily: "Manrope, sans-serif",
          color: "var(--on-background)",
        }}
      >
        {title}
      </h4>
      <p
        className="text-sm sm:text-base break-keep"
        style={{ color: "var(--on-surface-variant)", lineHeight: 1.7 }}
      >
        {desc}
      </p>
    </div>
  );
}
