"use client";

import { useState } from "react";
import { MONTHLY_PRICE } from "@/lib/pricing";
import { businessInfo } from "@/lib/business-info";

/**
 * /pricing — Single SKU Freemium 가격 페이지 (D-H3 rewrite).
 *
 * Flow (card billing key + server-initiated first charge):
 * 1. POST /api/payment/prepare → paymentId, subscriptionId, amount
 * 2. PortOne.requestIssueBillingKey (card) → 빌링키 발급
 * 3. BillingKey.Issued webhook → 서버가 PortOne API로 첫 ₩2,900 charge
 * 4. Transaction.Paid webhook → start_subscription RPC → 대시보드 이동
 */
export default function PricingPage() {
  const [loading, setLoading] = useState<
    "idle" | "preparing" | "billing_key" | "first_charge"
  >("idle");
  const [error, setError] = useState("");

  async function handleSubscribe() {
    setError("");
    setLoading("preparing");

    try {
      const res = await fetch("/api/payment/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
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
        setLoading("idle");
        return;
      }

      const { paymentId } = await res.json();

      setLoading("billing_key");

      // PortOne V2 billing key 발급 (카드). 서버가 BillingKey.Issued webhook 수신 후
      // PortOne API로 첫 ₩2,900 charge → Transaction.Paid webhook → start_subscription.
      // issueId + customer.customerId에 paymentId 양쪽 매핑 → webhook이 PortOne API로
      // billingKey 조회 시 둘 중 하나로 우리 pending payment 찾을 수 있음.
      const PortOne = await import("@portone/browser-sdk/v2");
      const response = await PortOne.requestIssueBillingKey({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        billingKeyMethod: "CARD",
        issueId: paymentId,
        issueName: "좌표.to 프리미엄 구독",
        displayAmount: MONTHLY_PRICE,
        currency: "KRW",
        customer: { customerId: paymentId },
      });

      if (response?.code) {
        if (response.code === "FAILURE_TYPE_PG") {
          setError("카드 등록이 취소되었습니다.");
        } else {
          setError(response.message || "카드 등록 중 오류가 발생했습니다.");
        }
        setLoading("idle");
        return;
      }

      setLoading("first_charge");
      // 결제 완료 페이지 — verify가 비동기로 첫 charge 완료 대기
      window.location.href = `/payment/complete?paymentId=${paymentId}`;
    } catch {
      setError("결제 처리 중 오류가 발생했습니다.");
      setLoading("idle");
    }
  }

  const monthly = MONTHLY_PRICE.toLocaleString();
  const busy = loading !== "idle";
  const stageLabel =
    loading === "preparing"
      ? "결제 준비 중…"
      : loading === "billing_key"
        ? "안전하게 카드 등록 중…"
        : loading === "first_charge"
          ? "첫 결제 처리 중…"
          : "";

  return (
    <div className="flex-1" style={{ background: "var(--surface)" }}>
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

      <main className="px-6 sm:px-8 pt-6 sm:pt-12 pb-20 max-w-md mx-auto">
        {/* Hero */}
        <section className="mb-8 text-center">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--primary)" }}
          >
            좌표.to 프리미엄
          </p>
          <h1
            className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-3 break-keep"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            월{" "}
            <span
              className="price-display"
              style={{ color: "var(--primary)" }}
            >
              ₩{monthly}
            </span>
          </h1>
          <p
            className="text-sm sm:text-base break-keep"
            style={{ color: "var(--on-surface-variant)", lineHeight: 1.7 }}
          >
            매월 자동결제, 언제든 한 번에 해지.
          </p>
        </section>

        {/* Subscribe card */}
        <div
          className="p-6 sm:p-8 rounded-2xl mb-8"
          style={{
            background: "var(--surface-lowest)",
            boxShadow: "0 8px 48px rgba(0,0,0,0.06)",
          }}
        >
          <div
            className="pb-5 mb-5"
            style={{ borderBottom: "1px solid var(--surface-container)" }}
          >
            <div className="flex items-baseline gap-1.5 justify-center">
              <span className="price-display text-4xl sm:text-5xl font-extrabold">
                ₩{monthly}
              </span>
              <span
                className="text-base font-medium"
                style={{ color: "var(--on-surface-variant)" }}
              >
                / 월
              </span>
            </div>
          </div>

          <button
            onClick={handleSubscribe}
            disabled={busy}
            className="w-full py-4 rounded-xl font-bold text-lg text-white transition-opacity hover:opacity-90 disabled:opacity-70"
            style={{
              background:
                "linear-gradient(135deg, var(--primary), var(--primary-container))",
              minHeight: 56,
            }}
            aria-live="polite"
          >
            {busy ? stageLabel : "구독 시작하기"}
          </button>

          {error && (
            <p
              className="text-sm mt-3 text-center break-keep"
              style={{ color: "var(--error)" }}
              role="alert"
            >
              {error}
            </p>
          )}

          <div
            className="mt-5 pt-5 space-y-2.5"
            style={{ borderTop: "1px solid var(--surface-container)" }}
          >
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
        <div
          className="p-5 rounded-2xl"
          style={{ background: "var(--surface-low)" }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: "var(--on-surface-variant)" }}
          >
            무료 플랜
          </p>
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
        </div>
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
