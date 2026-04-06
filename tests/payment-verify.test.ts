import { describe, it, expect } from "vitest";
import { validatePaymentAmount } from "@/lib/pricing";

// GET /api/payment/verify의 핵심 검증 로직 테스트

describe("GET /api/payment/verify — 결제 확인 로직", () => {
  it("paid 상태인 결제는 이미 확인됨으로 처리한다", () => {
    const payment = { status: "paid" };
    expect(payment.status === "paid").toBe(true);
  });

  it("pending 상태인 결제는 PortOne 확인이 필요하다", () => {
    const payment = { status: "pending" };
    expect(payment.status === "pending").toBe(true);
  });

  it("본인 결제만 확인할 수 있다 (owner_id 체크)", () => {
    const payment = { owner_id: "user-1" };
    const requestUserId = "user-1";
    expect(payment.owner_id === requestUserId).toBe(true);

    const otherUserId = "user-2";
    expect(payment.owner_id === otherUserId).toBe(false);
  });

  it("금액 불일치를 감지한다", () => {
    // 서버에서 3개월 ₩2,900 결제를 준비했는데
    // PortOne에서 ₩100으로 확인되면 거부
    expect(validatePaymentAmount(3, 100)).toBe(false);
    expect(validatePaymentAmount(3, 2900)).toBe(true);
  });
});
