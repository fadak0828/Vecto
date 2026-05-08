"use client";

import { useState } from "react";
import { MONTHLY_PRICE } from "@/lib/pricing";
import {
  buildBillingKeyArgs,
  billingCancelMessage,
  type PayMethod,
} from "@/lib/portone-billing";

type Props = {
  kakaopayEnabled: boolean;
};

// 무료 체험 toggle. 미설정/"true" → trial flow, "false" → 즉시 결제.
// 동일한 NEXT_PUBLIC_PAYMENTS_TRIAL_ENABLED 가 서버측 webhook 에서도 읽힘.
const TRIAL_ENABLED =
  (process.env.NEXT_PUBLIC_PAYMENTS_TRIAL_ENABLED ?? "").trim().toLowerCase() !==
  "false";

/**
 * 결제 플로우 전용 client island.
 *
 * Server Component 인 pricing/page.tsx 는 정적 마케팅 컨텐츠 대부분을 SSR 로
 * 내보내고, 이 컴포넌트만 하이드레이트 → 클라 JS 번들에 useState + PortOne SDK
 * 만 포함.
 *
 * Flow (billing key + server-initiated first charge):
 * 1. POST /api/payment/prepare → paymentId, subscriptionId, amount
 * 2. PortOne.requestIssueBillingKey → 빌링키 발급 (카카오페이 or 카드)
 * 3. BillingKey.Issued webhook → 서버가 PortOne API로 첫 ₩2,900 charge
 * 4. Transaction.Paid webhook → start_subscription RPC → 대시보드 이동
 */
export function CheckoutCard({ kakaopayEnabled }: Props) {
  const [loading, setLoading] = useState<
    "idle" | "preparing" | "billing_key" | "scheduling"
  >("idle");
  const [activeMethod, setActiveMethod] = useState<PayMethod | null>(null);
  const [error, setError] = useState("");

  async function handleSubscribe(method: PayMethod) {
    // Re-entry guard — 이미 진행 중이면 무시. 모바일에서 빠른 더블탭/메서드
    // 전환으로 두 개의 pending payment row가 생기는 것을 방지.
    if (loading !== "idle") return;

    setError("");
    setActiveMethod(method);
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
        setActiveMethod(null);
        return;
      }

      const { paymentId, customerName } = await res.json();

      setLoading("billing_key");

      // PortOne V2 billing key 발급. 서버가 BillingKey.Issued webhook 수신 후
      // PortOne API로 첫 ₩2,900 charge → Transaction.Paid webhook → start_subscription.
      const PortOne = await import("@portone/browser-sdk/v2");

      const billingArgs = buildBillingKeyArgs(method, {
        card: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        kakaopay: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_KAKAOPAY!,
      });

      const response = await PortOne.requestIssueBillingKey({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        ...billingArgs,
        issueId: paymentId,
        issueName: "좌표.to 프리미엄 구독",
        displayAmount: MONTHLY_PRICE,
        currency: "KRW",
        // 모바일은 REDIRECTION 강제 — Mobile Safari는 await 이후 popup을 차단함.
        windowType: { mobile: "REDIRECTION", pc: "IFRAME" },
        customer: { customerId: paymentId, fullName: customerName },
      });

      if (response?.code) {
        if (response.code === "FAILURE_TYPE_PG") {
          setError(billingCancelMessage(method));
        } else {
          setError(response.message || "결제 등록 중 오류가 발생했습니다.");
        }
        setLoading("idle");
        setActiveMethod(null);
        return;
      }

      setLoading("scheduling");
      window.location.href = `/payment/complete?paymentId=${paymentId}`;
    } catch (err) {
      console.error("[pricing] handleSubscribe error:", err);
      setError("결제 처리 중 오류가 발생했습니다.");
      setLoading("idle");
      setActiveMethod(null);
    }
  }

  const busy = loading !== "idle";
  const stageLabel =
    loading === "preparing"
      ? "결제 준비 중…"
      : loading === "billing_key"
        ? activeMethod === "kakaopay"
          ? "카카오페이로 이동 중…"
          : "안전하게 카드 등록 중…"
        : loading === "scheduling"
          ? TRIAL_ENABLED
            ? "무료 체험 시작 중…"
            : "결제 진행 중…"
          : "";

  return (
    <>
      {kakaopayEnabled && (
        <>
          <button
            onClick={() => handleSubscribe("kakaopay")}
            disabled={busy}
            className="w-full py-4 rounded-xl font-bold text-lg transition-opacity hover:opacity-90 disabled:opacity-70 flex items-center justify-center gap-2"
            // Kakao 브랜드 컴플라이언스: #FEE500 + #191919 필수.
            style={{
              background: "#FEE500",
              color: "#191919",
              minHeight: 56,
            }}
          >
            {busy && activeMethod === "kakaopay"
              ? stageLabel
              : TRIAL_ENABLED
                ? "1개월 무료로 시작하기"
                : `월 ₩${MONTHLY_PRICE.toLocaleString("ko-KR")} 구독 시작`}
          </button>

          <p
            className="text-center text-xs mt-2.5 break-keep"
            style={{ color: "var(--on-surface-variant)" }}
          >
            {TRIAL_ENABLED
              ? "카카오톡 인증 한 번이면 끝 · 무료 체험 중 해지 시 과금 없음"
              : "카카오톡 인증 한 번이면 끝 · 언제든 해지 가능"}
          </p>
        </>
      )}

      {error && (
        <p
          className="text-sm mt-3 text-center break-keep"
          style={{ color: "var(--error)" }}
          role="alert"
        >
          {error}
        </p>
      )}
    </>
  );
}
