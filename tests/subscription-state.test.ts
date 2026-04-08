import { describe, it, expect } from "vitest";

/**
 * Subscription state machine tests.
 *
 * These test the LOGIC of the 5-state subscription lifecycle as enforced by
 * the webhook branching and payment-status component. DB-level RPC tests
 * (process_subscription_charge idempotency, cancel_subscription RPC) live in
 * integration tests — here we test the decision logic only.
 *
 * Covers UX-3 (renewal success), UX-4 (renewal failure → past_due),
 * UX-6 (cancel in-period), UX-8 (refund subscription guard),
 * UX-12 (idempotency decision).
 */

type SubscriptionStatus =
  | "pending"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "failed";

type SubState = {
  status: SubscriptionStatus;
  current_period_end: Date | null;
  past_due_since: Date | null;
};

/**
 * Mirror of payment-status.tsx state determination logic.
 * Returns one of 6 user-visible states (trialing added for launch event).
 */
function deriveUserVisibleState(
  sub: SubState | null,
  now: Date,
):
  | "free"
  | "trialing"
  | "active"
  | "canceled_in_period"
  | "past_due"
  | "expired" {
  if (!sub) return "free";
  if (sub.status === "failed") return "expired";
  if (sub.status === "past_due") return "past_due";
  if (sub.status === "canceled") {
    if (sub.current_period_end && sub.current_period_end > now) {
      return "canceled_in_period";
    }
    return "expired";
  }
  if (sub.status === "trialing") return "trialing";
  return "active";
}

const NOW = new Date("2026-04-10T00:00:00Z");
const FUTURE = new Date("2026-05-10T00:00:00Z");
const PAST = new Date("2026-03-10T00:00:00Z");

describe("Subscription state derivation (UX-1, UX-3, UX-4, UX-6)", () => {
  it("no subscription → free", () => {
    expect(deriveUserVisibleState(null, NOW)).toBe("free");
  });

  it("active → active (UX-3 renewal success result)", () => {
    expect(
      deriveUserVisibleState(
        { status: "active", current_period_end: FUTURE, past_due_since: null },
        NOW,
      ),
    ).toBe("active");
  });

  it("past_due → past_due (UX-4 renewal failure result)", () => {
    expect(
      deriveUserVisibleState(
        {
          status: "past_due",
          current_period_end: PAST,
          past_due_since: PAST,
        },
        NOW,
      ),
    ).toBe("past_due");
  });

  it("canceled + period_end in future → canceled_in_period (UX-6)", () => {
    expect(
      deriveUserVisibleState(
        {
          status: "canceled",
          current_period_end: FUTURE,
          past_due_since: null,
        },
        NOW,
      ),
    ).toBe("canceled_in_period");
  });

  it("canceled + period_end in past → expired", () => {
    expect(
      deriveUserVisibleState(
        { status: "canceled", current_period_end: PAST, past_due_since: null },
        NOW,
      ),
    ).toBe("expired");
  });

  it("failed (BillingKey.Failed rollback) → expired", () => {
    expect(
      deriveUserVisibleState(
        { status: "failed", current_period_end: null, past_due_since: null },
        NOW,
      ),
    ).toBe("expired");
  });

  it("period_end null + active → active (race: RPC not yet run)", () => {
    expect(
      deriveUserVisibleState(
        { status: "active", current_period_end: null, past_due_since: null },
        NOW,
      ),
    ).toBe("active");
  });

  it("trialing + period_end in future → trialing (launch event 1개월 무료)", () => {
    expect(
      deriveUserVisibleState(
        {
          status: "trialing",
          current_period_end: FUTURE,
          past_due_since: null,
        },
        NOW,
      ),
    ).toBe("trialing");
  });
});

describe("Refund subscription guard (UX-8, ENG-C2)", () => {
  /**
   * Mirror of refund/route.ts guard:
   *   if (payment.subscription_id) return 400
   */
  function isRefundAllowed(payment: {
    subscription_id: string | null;
    status: string;
  }): boolean {
    if (payment.subscription_id) return false;
    return payment.status === "paid";
  }

  it("subscription charge (subscription_id set) → refund blocked", () => {
    expect(
      isRefundAllowed({ subscription_id: "sub-uuid", status: "paid" }),
    ).toBe(false);
  });

  it("legacy period-pack (subscription_id null) → refund allowed", () => {
    expect(isRefundAllowed({ subscription_id: null, status: "paid" })).toBe(
      true,
    );
  });

  it("non-paid status → refund blocked even without subscription", () => {
    expect(
      isRefundAllowed({ subscription_id: null, status: "pending" }),
    ).toBe(false);
    expect(
      isRefundAllowed({ subscription_id: null, status: "refunded" }),
    ).toBe(false);
  });
});

describe("Webhook first-charge vs recurring branching (UX-3, UX-12)", () => {
  /**
   * Mirror of webhook/route.ts decision:
   *   if payment found in DB + no scheduleId → first charge
   *   if payment NOT in DB + scheduleId + billingKey → recurring
   *   same paymentId already paid → idempotent (return "Already processed")
   */
  type Branch = "first_charge" | "recurring" | "idempotent" | "unknown";

  function decideBranch(ctx: {
    paymentInDb: { status: "pending" | "paid" } | null;
    portonePayment: { scheduleId?: string; billingKey?: string };
  }): Branch {
    if (ctx.paymentInDb) {
      if (ctx.paymentInDb.status === "paid") return "idempotent";
      return "first_charge";
    }
    if (ctx.portonePayment.scheduleId && ctx.portonePayment.billingKey) {
      return "recurring";
    }
    return "unknown";
  }

  it("DB에 pending payment + scheduleId 없음 → first charge", () => {
    expect(
      decideBranch({
        paymentInDb: { status: "pending" },
        portonePayment: { billingKey: "bk_123" },
      }),
    ).toBe("first_charge");
  });

  it("DB에 없음 + scheduleId + billingKey → recurring", () => {
    expect(
      decideBranch({
        paymentInDb: null,
        portonePayment: { scheduleId: "sch_123", billingKey: "bk_123" },
      }),
    ).toBe("recurring");
  });

  it("DB에 이미 paid → idempotent (UX-12)", () => {
    expect(
      decideBranch({
        paymentInDb: { status: "paid" },
        portonePayment: { scheduleId: "sch_123", billingKey: "bk_123" },
      }),
    ).toBe("idempotent");
  });

  it("알 수 없는 paymentId (DB 없음 + scheduleId 없음) → unknown", () => {
    expect(
      decideBranch({
        paymentInDb: null,
        portonePayment: {},
      }),
    ).toBe("unknown");
  });
});

describe("Promo banner visibility (D-C1 regression, UX-1)", () => {
  /**
   * Mirror of [namespace]/page.tsx rendering logic:
   *   isPaid = payment_status==='active' && paid_until > now
   *   !isPaid → render promo banner
   */
  function shouldShowPromoBanner(ns: {
    payment_status: string;
    paid_until: string | null;
  }): boolean {
    const isPaid =
      ns.payment_status === "active" &&
      ns.paid_until !== null &&
      new Date(ns.paid_until) > new Date(NOW);
    return !isPaid;
  }

  it("free user → promo banner 표시", () => {
    expect(shouldShowPromoBanner({ payment_status: "free", paid_until: null })).toBe(
      true,
    );
  });

  it("active + paid_until 미래 → banner 숨김", () => {
    expect(
      shouldShowPromoBanner({
        payment_status: "active",
        paid_until: FUTURE.toISOString(),
      }),
    ).toBe(false);
  });

  it("active + paid_until 과거 → banner 표시 (만료)", () => {
    expect(
      shouldShowPromoBanner({
        payment_status: "active",
        paid_until: PAST.toISOString(),
      }),
    ).toBe(true);
  });

  it("expired status → banner 표시", () => {
    expect(
      shouldShowPromoBanner({
        payment_status: "expired",
        paid_until: PAST.toISOString(),
      }),
    ).toBe(true);
  });
});

describe("past_due days-until-auto-cancel calculation (UX-9)", () => {
  /**
   * Mirror of cron/expire logic: past_due_since + 14d → cancel.
   */
  function daysUntilAutoCancel(
    pastDueSince: Date,
    now: Date,
    graceDays = 14,
  ): number {
    const elapsedMs = now.getTime() - pastDueSince.getTime();
    const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
    return graceDays - elapsedDays;
  }

  it("past_due 시작 직후 → 14일 남음", () => {
    const pastDue = new Date(NOW.getTime());
    expect(daysUntilAutoCancel(pastDue, NOW)).toBe(14);
  });

  it("past_due 5일 경과 → 9일 남음", () => {
    const pastDue = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000);
    expect(daysUntilAutoCancel(pastDue, NOW)).toBe(9);
  });

  it("past_due 14일 초과 → 0 또는 음수 (cron이 취소 대상)", () => {
    const pastDue = new Date(NOW.getTime() - 15 * 24 * 60 * 60 * 1000);
    expect(daysUntilAutoCancel(pastDue, NOW)).toBeLessThanOrEqual(0);
  });
});
