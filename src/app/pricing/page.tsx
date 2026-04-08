"use client";

import { useState } from "react";
import { MONTHLY_PRICE } from "@/lib/pricing";
import { businessInfo } from "@/lib/business-info";
import {
  buildBillingKeyArgs,
  billingCancelMessage,
  type PayMethod,
} from "@/lib/portone-billing";

/**
 * /pricing — Single SKU Freemium 가격 페이지.
 *
 * Flow (billing key + server-initiated first charge):
 * 1. POST /api/payment/prepare → paymentId, subscriptionId, amount
 * 2. PortOne.requestIssueBillingKey → 빌링키 발급 (카카오페이 or 카드)
 * 3. BillingKey.Issued webhook → 서버가 PortOne API로 첫 ₩2,900 charge
 * 4. Transaction.Paid webhook → start_subscription RPC → 대시보드 이동
 *
 * 카카오페이가 기본 (한국 사용자 진입장벽 최소). 카드 직접입력은 fallback 링크.
 */
export default function PricingPage() {
  const [loading, setLoading] = useState<
    "idle" | "preparing" | "billing_key" | "first_charge"
  >("idle");
  const [activeMethod, setActiveMethod] = useState<PayMethod | null>(null);
  const [error, setError] = useState("");

  // 카카오페이 채널키 미설정 시 버튼 자동 비활성화 → 사용자에게 즉시 신호.
  // NEXT_PUBLIC_* 는 빌드 타임 인라인이므로 빈 문자열/undefined 양쪽 체크.
  const kakaopayChannelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_KAKAOPAY;
  const kakaopayEnabled = !!kakaopayChannelKey && kakaopayChannelKey.length > 0;

  async function handleSubscribe(method: PayMethod) {
    // Re-entry guard — 이미 진행 중이면 무시. 모바일에서 빠른 더블탭/메서드 전환으로
    // 두 개의 pending payment row가 생기는 것을 방지.
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
      // issueId + customer.customerId에 paymentId 양쪽 매핑 → webhook이 PortOne API로
      // billingKey 조회 시 둘 중 하나로 우리 pending payment 찾을 수 있음.
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
        // PC는 IFRAME 으로 모달 UX 유지. 카드 + 카카오 양쪽 모두 동일한 창 정책.
        windowType: { mobile: "REDIRECTION", pc: "IFRAME" },
        // customer.fullName 은 KPN 등 일부 PG 의 빌링키 발급 필수 필드.
        // 누락 시 issue-prepare/v2 가 ParsePgRawResponseFailed 로 400.
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

      setLoading("first_charge");
      // 결제 완료 페이지 — verify가 비동기로 첫 charge 완료 대기
      window.location.href = `/payment/complete?paymentId=${paymentId}`;
    } catch (err) {
      // 프로덕션 디버깅용 — kakaopay 실패 시 sentry/console에서 확인.
      console.error("[pricing] handleSubscribe error:", err);
      setError("결제 처리 중 오류가 발생했습니다.");
      setLoading("idle");
      setActiveMethod(null);
    }
  }

  const monthly = MONTHLY_PRICE.toLocaleString();
  const busy = loading !== "idle";
  const stageLabel =
    loading === "preparing"
      ? "결제 준비 중…"
      : loading === "billing_key"
        ? activeMethod === "kakaopay"
          ? "카카오페이로 이동 중…"
          : "안전하게 카드 등록 중…"
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
        {/* Hero — semantic h1 is the product, not the price.
            Price lives in the subscribe card where the CTA is. */}
        <section className="mb-8 text-center">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--primary)" }}
          >
            Premium
          </p>
          <h1
            className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-3 break-keep"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            좌표.to 프리미엄
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

          {kakaopayEnabled && (
            <>
              <button
                onClick={() => handleSubscribe("kakaopay")}
                disabled={busy}
                className="w-full py-4 rounded-xl font-bold text-lg transition-opacity hover:opacity-90 disabled:opacity-70 flex items-center justify-center gap-2"
                // Kakao 브랜드 컴플라이언스: #FEE500 배경 + #191919 텍스트는
                // 카카오 디벨로퍼스 가이드라인의 필수 색상. DESIGN.md "No Pure Black" 규칙
                // (#1a1c1c)에서 의도적으로 벗어남 — 카카오페이 인지도 = 사용자 신뢰 = 전환율.
                // Brand yellow + text do the recognition work; decorative emoji removed.
                style={{
                  background: "#FEE500",
                  color: "#191919",
                  minHeight: 56,
                }}
              >
                {busy && activeMethod === "kakaopay"
                  ? stageLabel
                  : "카카오페이로 시작하기"}
              </button>

              <p
                className="text-center text-xs mt-2.5 break-keep"
                style={{ color: "var(--on-surface-variant)" }}
              >
                카카오톡 인증 한 번이면 끝 · 카드번호 입력 없음
              </p>
            </>
          )}

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => handleSubscribe("card")}
              disabled={busy}
              className="text-sm underline-offset-2 hover:underline disabled:opacity-50"
              style={{ color: "var(--on-surface-variant)" }}
            >
              {busy && activeMethod === "card"
                ? stageLabel
                : "신용/체크카드로 결제하기"}
            </button>
          </div>

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
