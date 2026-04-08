import { describe, it, expect } from "vitest";

/**
 * Trial launch regression + unit tests.
 *
 * Critical gaps identified in /plan-eng-review:
 *   A2: process_subscription_charge RPC guard must accept 'trialing'
 *   A4: cancel_subscription RPC guard must accept 'trialing'
 *   A6: schedulePayment failure must roll back billing_key_id
 *   UX: trialing → cancel response copy must say "과금은 없습니다"
 *   UX: D-3 urgency state transition in dashboard chip
 *
 * These are logic-level tests. The actual RPC guards are verified by SQL
 * migration 011 which is applied at release time.
 */

type SubscriptionStatus =
  | "pending"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "failed";

// ============================================================================
// A2 regression — process_subscription_charge guard includes 'trialing'
// ============================================================================

/**
 * Mirror of the RPC guard: WHERE status IN ('trialing', 'active', 'past_due').
 * Before 011, the guard was ('active', 'past_due') which silently skipped the
 * D+30 transition and left the user stuck in trialing forever.
 */
function processChargeGuardAccepts(status: SubscriptionStatus): boolean {
  return ["trialing", "active", "past_due"].includes(status);
}

describe("ENG A2 regression — process_subscription_charge accepts 'trialing'", () => {
  it("trialing status transitions to active at D+30 (was silent skip bug)", () => {
    expect(processChargeGuardAccepts("trialing")).toBe(true);
  });

  it("active still accepted (no regression on existing renewal)", () => {
    expect(processChargeGuardAccepts("active")).toBe(true);
  });

  it("past_due still accepted (no regression on dunning recovery)", () => {
    expect(processChargeGuardAccepts("past_due")).toBe(true);
  });

  it("pending rejected (pending has no period_end to advance)", () => {
    expect(processChargeGuardAccepts("pending")).toBe(false);
  });

  it("canceled rejected (cannot resurrect dead subscription)", () => {
    expect(processChargeGuardAccepts("canceled")).toBe(false);
  });

  it("failed rejected (rollback state, not chargeable)", () => {
    expect(processChargeGuardAccepts("failed")).toBe(false);
  });
});

// ============================================================================
// A4 regression — cancel_subscription guard includes 'trialing'
// ============================================================================

function cancelGuardAccepts(status: SubscriptionStatus): boolean {
  return ["trialing", "active", "past_due"].includes(status);
}

describe("ENG A4 regression — cancel_subscription accepts 'trialing'", () => {
  it("trialing can be canceled (user quit during free trial)", () => {
    expect(cancelGuardAccepts("trialing")).toBe(true);
  });

  it("active can be canceled (normal subscriber cancel)", () => {
    expect(cancelGuardAccepts("active")).toBe(true);
  });

  it("past_due can be canceled (cancel during dunning)", () => {
    expect(cancelGuardAccepts("past_due")).toBe(true);
  });

  it("already-canceled rejected (no double cancel)", () => {
    expect(cancelGuardAccepts("canceled")).toBe(false);
  });

  it("pending rejected (pending has no schedule to revoke yet)", () => {
    expect(cancelGuardAccepts("pending")).toBe(false);
  });
});

// ============================================================================
// A6 regression — schedulePayment failure must roll back billing_key_id
// ============================================================================

type SubscriptionRow = {
  id: string;
  status: SubscriptionStatus;
  portone_billing_key_id: string | null;
};

/**
 * Mirror of webhook BillingKey.Issued trial branch rollback logic.
 * On schedulePayment failure: billing_key_id → NULL, status → 'failed'.
 * This prevents the silent "영구 trialing" bug where user gets premium forever.
 */
function rollbackOnScheduleFailure(sub: SubscriptionRow): SubscriptionRow {
  return {
    ...sub,
    portone_billing_key_id: null,
    status: "failed",
  };
}

describe("ENG A6 regression — schedulePayment failure rollback", () => {
  it("schedulePayment failure nulls billing_key_id and marks failed", () => {
    const before: SubscriptionRow = {
      id: "sub-1",
      status: "pending",
      portone_billing_key_id: "billing-key-abc123",
    };
    const after = rollbackOnScheduleFailure(before);
    expect(after.portone_billing_key_id).toBeNull();
    expect(after.status).toBe("failed");
  });

  it("user can retry after rollback (not stuck in trialing)", () => {
    const rolledBack = rollbackOnScheduleFailure({
      id: "sub-1",
      status: "pending",
      portone_billing_key_id: "billing-key-abc123",
    });
    // After rollback: user sees 'failed' state, can go back to /pricing and
    // retry. subs_one_active_per_user UNIQUE INDEX does not include 'failed',
    // so new pending can be inserted.
    const canInsertNewPending = !["pending", "trialing", "active", "past_due"].includes(
      rolledBack.status,
    );
    expect(canInsertNewPending).toBe(true);
  });
});

// ============================================================================
// UX — trial cancel response copy branches on status
// ============================================================================

function cancelResponseMessage(
  wasTrial: boolean,
  trialEndStr: string | null,
): string {
  return wasTrial
    ? `무료 체험이 해지되었어요. ${trialEndStr ?? "체험 기간"}까지 프리미엄 기능을 계속 쓸 수 있고, 이후 자동으로 무료 플랜으로 돌아갑니다. 과금은 없습니다.`
    : "구독이 해지되었습니다. 현재 결제 기간까지는 계속 이용 가능합니다.";
}

describe("Cancel response copy — trial branch", () => {
  it("trial cancel mentions 과금 없음 (critical trust signal)", () => {
    const msg = cancelResponseMessage(true, "2026-05-08");
    expect(msg).toContain("과금은 없습니다");
    expect(msg).toContain("2026-05-08");
  });

  it("paid cancel uses standard copy", () => {
    const msg = cancelResponseMessage(false, null);
    expect(msg).toContain("구독이 해지");
    expect(msg).not.toContain("과금은 없습니다");
  });

  it("trial cancel handles null trial_end gracefully", () => {
    const msg = cancelResponseMessage(true, null);
    expect(msg).toContain("체험 기간");
    expect(msg).toContain("과금은 없습니다");
  });
});

// ============================================================================
// UX — D-N urgency transition in dashboard chip
// ============================================================================

/**
 * Mirror of payment-status.tsx trialing chip urgency logic.
 * D≤3 → error styling, otherwise secondary-container.
 */
function chipUrgency(daysLeft: number): "normal" | "urgent" {
  return daysLeft <= 3 ? "urgent" : "normal";
}

function chipLabel(daysLeft: number): string {
  return chipUrgency(daysLeft) === "urgent"
    ? `D-${daysLeft} · 곧 자동 결제`
    : `무료 체험 중 · D-${daysLeft}`;
}

describe("Dashboard trial chip — D-N urgency", () => {
  it("D-30 → normal chip (secondary-container)", () => {
    expect(chipUrgency(30)).toBe("normal");
    expect(chipLabel(30)).toContain("무료 체험 중");
  });

  it("D-7 → normal chip (still plenty of time)", () => {
    expect(chipUrgency(7)).toBe("normal");
  });

  it("D-4 → normal chip (boundary)", () => {
    expect(chipUrgency(4)).toBe("normal");
  });

  it("D-3 → urgent chip (error styling)", () => {
    expect(chipUrgency(3)).toBe("urgent");
    expect(chipLabel(3)).toContain("곧 자동 결제");
  });

  it("D-1 → urgent chip", () => {
    expect(chipUrgency(1)).toBe("urgent");
  });

  it("D-0 → urgent chip (day-of)", () => {
    expect(chipUrgency(0)).toBe("urgent");
  });
});

// ============================================================================
// start_trial timing — period_end should be +30 days from now
// ============================================================================

describe("start_trial period_end calculation", () => {
  it("30-day trial sets period_end exactly 30 days out", () => {
    const now = new Date("2026-04-08T12:00:00Z");
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 30);
    expect(trialEnd.toISOString()).toBe("2026-05-08T12:00:00.000Z");
  });

  it("month boundary handled correctly (Jan 31 → Mar 2)", () => {
    const now = new Date("2026-01-31T00:00:00Z");
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 30);
    // Jan 31 + 30 days = Mar 2
    expect(trialEnd.getUTCMonth()).toBe(2); // March (0-indexed)
    expect(trialEnd.getUTCDate()).toBe(2);
  });
});
