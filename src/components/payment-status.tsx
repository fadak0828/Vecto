"use client";

import { PLANS, roughMonthly } from "@/lib/pricing";
import {
  ClickChartPreview,
  NamespacePillPreview,
  ProfileCardPreview,
} from "./premium-previews";

/**
 * 결제 상태 표시 컴포넌트.
 * Dashboard에서 사용.
 */
export function PaymentStatus({
  paymentStatus,
  paidUntil,
  namespaceSlug,
  displayName,
}: {
  paymentStatus: string;
  paidUntil: string | null;
  namespaceSlug?: string;
  displayName?: string;
}) {
  if (paymentStatus === "free") {
    const cheapestPlan = PLANS.reduce((min, p) => p.monthlyPrice < min.monthlyPrice ? p : min, PLANS[0]);
    const cheapest = roughMonthly(cheapestPlan.monthlyPrice);
    return (
      <div
        className="p-5 sm:p-6 rounded-2xl"
        style={{
          background: "var(--surface-lowest)",
          boxShadow: "var(--shadow-whisper)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--primary)" }}
          >
            무료 플랜
          </span>
        </div>
        <h3
          className="text-lg sm:text-xl font-bold mb-1 break-keep"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          프리미엄으로 받을 수 있는 것
        </h3>
        <p
          className="text-sm mb-5"
          style={{ color: "var(--on-surface-variant)" }}
        >
          이름 하나로, 명함·강의 슬라이드·SNS 어디에나.
        </p>

        {/* 1. Namespace pill */}
        <div className="mb-4">
          <NamespacePillPreview slug={namespaceSlug || "내이름"} />
          <p
            className="text-xs mt-2"
            style={{ color: "var(--on-surface-variant)" }}
          >
            전용 주소 — 한 번 보면 잊지 않습니다.
          </p>
        </div>

        {/* 2. Profile + Chart side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <div>
            <ProfileCardPreview displayName={displayName || "홍길동"} />
            <p
              className="text-xs mt-2"
              style={{ color: "var(--on-surface-variant)" }}
            >
              프로필 페이지 — 모든 링크를 한곳에.
            </p>
          </div>
          <div>
            <ClickChartPreview />
            <p
              className="text-xs mt-2"
              style={{ color: "var(--on-surface-variant)" }}
            >
              클릭 분석 — 누가 언제 들어왔는지.
            </p>
          </div>
        </div>

        <a
          href="/pricing"
          className="block w-full text-center py-3.5 rounded-xl font-bold text-white transition-opacity hover:opacity-90"
          style={{
            background:
              "linear-gradient(135deg, var(--primary), var(--primary-container))",
          }}
        >
          월 약 {cheapest.toLocaleString()}원부터 시작 →
        </a>
      </div>
    );
  }

  if (paymentStatus === "expired") {
    return (
      <div
        className="p-4 rounded-xl flex items-center justify-between"
        style={{ background: "rgba(186,26,26,0.06)" }}
      >
        <div>
          <span className="text-sm font-medium" style={{ color: "var(--error)" }}>
            이용권 만료
          </span>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--on-surface-variant)" }}
          >
            {paidUntil
              ? `${new Date(paidUntil).toLocaleDateString("ko-KR")}에 만료됨`
              : "이용권이 만료되었습니다."}
            {" · "}30일 이내 갱신하지 않으면 리다이렉트가 중지됩니다.
          </p>
        </div>
        <a
          href="/pricing"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white shrink-0"
          style={{ background: "var(--error)" }}
        >
          갱신하기
        </a>
      </div>
    );
  }

  // active
  const daysLeft = paidUntil
    ? Math.ceil(
        (new Date(paidUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )
    : null;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 14;

  return (
    <div
      className="p-4 rounded-xl flex items-center justify-between"
      style={{
        background: isExpiringSoon
          ? "rgba(186,26,26,0.04)"
          : "rgba(0,101,101,0.04)",
      }}
    >
      <div>
        <span className="text-sm font-medium" style={{ color: "var(--primary)" }}>
          프리미엄 활성
        </span>
        <p
          className="text-xs mt-0.5"
          style={{ color: "var(--on-surface-variant)" }}
        >
          {paidUntil
            ? `${new Date(paidUntil).toLocaleDateString("ko-KR")}까지 이용 가능`
            : ""}
          {isExpiringSoon && ` · ${daysLeft}일 남음`}
        </p>
      </div>
      {isExpiringSoon && (
        <a
          href="/pricing"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white shrink-0"
          style={{ background: "var(--primary)" }}
        >
          연장하기
        </a>
      )}
    </div>
  );
}
