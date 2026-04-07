"use client";

import { MONTHLY_PRICE } from "@/lib/pricing";
import {
  ClickChartPreview,
  NamespacePillPreview,
  ProfileCardPreview,
} from "./premium-previews";

/**
 * 결제 상태 표시 컴포넌트 (5-state refactor — D-C3).
 *
 * user-visible states:
 *   1. 무료     — subscription IS NULL
 *   2. 이용 중 (auto)     — subscription.status='active'
 *   3. 이용 중 (해지됨)   — status='canceled' AND current_period_end > now
 *   4. 결제 확인 필요     — status='past_due'
 *   5. 만료                — status='canceled' AND current_period_end <= now
 *                           OR status='failed'
 */

type Subscription = {
  id: string;
  status: "pending" | "active" | "past_due" | "canceled" | "failed";
  current_period_end: string | null;
  past_due_since: string | null;
  failed_charge_count: number;
} | null;

export function PaymentStatus({
  subscription,
  namespaceSlug,
  displayName,
  onCancel,
}: {
  subscription: Subscription;
  namespaceSlug?: string;
  displayName?: string;
  onCancel?: () => void;
}) {
  // State 1: 무료 (no subscription)
  if (!subscription) {
    const monthly = MONTHLY_PRICE.toLocaleString();
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
          className="text-sm mb-5 break-keep"
          style={{ color: "var(--on-surface-variant)" }}
        >
          페이지 상단 안내 1줄을 숨기고 클릭 통계를 해제합니다.
        </p>

        <div className="mb-4">
          <NamespacePillPreview slug={namespaceSlug || "내이름"} />
          <p
            className="text-xs mt-2 break-keep"
            style={{ color: "var(--on-surface-variant)" }}
          >
            안내 1줄 제거 — 내 페이지가 깔끔해집니다.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <div>
            <ProfileCardPreview displayName={displayName || "홍길동"} />
            <p
              className="text-xs mt-2 break-keep"
              style={{ color: "var(--on-surface-variant)" }}
            >
              프로필 페이지 — 모든 링크를 한곳에.
            </p>
          </div>
          <div>
            <ClickChartPreview />
            <p
              className="text-xs mt-2 break-keep"
              style={{ color: "var(--on-surface-variant)" }}
            >
              클릭 통계 — 누가 언제 들어왔는지.
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
          월 <span className="price-display">₩{monthly}</span>으로 프리미엄 시작하기 →
        </a>
      </div>
    );
  }

  const now = new Date();
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end)
    : null;
  const periodEndStr = periodEnd
    ? periodEnd.toLocaleDateString("ko-KR")
    : "";
  const daysLeft = periodEnd
    ? Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // State 5: 만료 / failed
  if (
    subscription.status === "failed" ||
    (subscription.status === "canceled" &&
      periodEnd &&
      periodEnd <= now)
  ) {
    return (
      <div
        className="p-4 rounded-xl flex items-center justify-between"
        style={{ background: "var(--surface-low)" }}
      >
        <div>
          <span
            className="text-sm font-medium"
            style={{ color: "var(--on-surface-variant)" }}
          >
            구독 만료됨
          </span>
          <p
            className="text-xs mt-0.5 break-keep"
            style={{ color: "var(--on-surface-variant)" }}
          >
            프로필 페이지에 안내 1줄이 다시 표시되고 있습니다.
          </p>
        </div>
        <a
          href="/pricing"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white shrink-0"
          style={{ background: "var(--primary)" }}
        >
          다시 시작
        </a>
      </div>
    );
  }

  // State 4: past_due (결제 확인 필요)
  if (subscription.status === "past_due") {
    const failedCount = subscription.failed_charge_count ?? 0;
    const pastDueSince = subscription.past_due_since
      ? new Date(subscription.past_due_since)
      : null;
    const daysUntilAutoCancel = pastDueSince
      ? 14 -
        Math.floor(
          (now.getTime() - pastDueSince.getTime()) / (1000 * 60 * 60 * 24),
        )
      : null;

    return (
      <div
        className="p-4 rounded-xl"
        style={{ background: "rgba(186,26,26,0.06)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <span
              className="text-sm font-medium"
              style={{ color: "var(--error)" }}
            >
              결제 확인 필요
            </span>
            <p
              className="text-xs mt-0.5 break-keep"
              style={{ color: "var(--on-surface-variant)" }}
            >
              {failedCount > 0 && `${failedCount}번째 결제 시도 실패`}
              {daysUntilAutoCancel !== null &&
                daysUntilAutoCancel > 0 &&
                ` · ${daysUntilAutoCancel}일 뒤 자동 해지`}
            </p>
          </div>
          <a
            href="/pricing"
            className="px-4 py-2 rounded-lg text-sm font-medium text-white shrink-0"
            style={{ background: "var(--error)" }}
          >
            카드 변경
          </a>
        </div>
      </div>
    );
  }

  // State 3: canceled (in-period)
  if (subscription.status === "canceled" && periodEnd && periodEnd > now) {
    return (
      <div
        className="p-4 rounded-xl flex items-center justify-between gap-3"
        style={{ background: "var(--surface-low)" }}
      >
        <div>
          <span
            className="text-sm font-medium"
            style={{ color: "var(--on-surface-variant)" }}
          >
            해지됨
          </span>
          <p
            className="text-xs mt-0.5 break-keep"
            style={{ color: "var(--on-surface-variant)" }}
          >
            {periodEndStr}까지 이용 가능
            {daysLeft !== null && ` · ${daysLeft}일 남음`}
          </p>
        </div>
        <a
          href="/pricing"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white shrink-0"
          style={{ background: "var(--primary)" }}
        >
          구독 다시 시작
        </a>
      </div>
    );
  }

  // State 2: active (auto-renew)
  return (
    <div
      className="p-4 rounded-xl flex items-center justify-between gap-3"
      style={{ background: "rgba(0,101,101,0.04)" }}
    >
      <div>
        <span
          className="text-sm font-medium"
          style={{ color: "var(--primary)" }}
        >
          프리미엄 이용 중
        </span>
        <p
          className="text-xs mt-0.5 break-keep"
          style={{ color: "var(--on-surface-variant)" }}
        >
          {periodEndStr}까지 · 매월 자동갱신
        </p>
      </div>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm font-medium shrink-0 hover:opacity-80 transition-opacity"
          style={{
            background: "transparent",
            color: "var(--on-surface-variant)",
            border: "1px solid var(--outline-variant)",
          }}
        >
          해지
        </button>
      )}
    </div>
  );
}
