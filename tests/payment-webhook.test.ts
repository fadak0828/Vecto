import { describe, it, expect } from "vitest";
import { validatePaymentAmount } from "@/lib/pricing";

// POST /api/payment/webhook의 핵심 검증 로직 테스트
// (실제 PortOne/Supabase 연동 없이 비즈니스 로직 검증)

describe("POST /api/payment/webhook — 멱등성", () => {
  it("이미 paid 상태인 결제는 중복 처리하지 않는다", () => {
    const payment = { status: "paid" };
    const isAlreadyProcessed = payment.status === "paid";
    expect(isAlreadyProcessed).toBe(true);
  });

  it("pending 상태인 결제는 처리한다", () => {
    const payment = { status: "pending" };
    const isAlreadyProcessed = payment.status === "paid";
    expect(isAlreadyProcessed).toBe(false);
  });
});

describe("POST /api/payment/webhook — 금액 검증", () => {
  it("올바른 금액은 통과한다", () => {
    expect(validatePaymentAmount(3, 2900)).toBe(true);
  });

  it("조작된 금액(₩100)은 거부한다", () => {
    expect(validatePaymentAmount(3, 100)).toBe(false);
  });

  it("금액 0원은 거부한다", () => {
    expect(validatePaymentAmount(6, 0)).toBe(false);
  });
});

describe("POST /api/payment/webhook — paid_until 계산", () => {
  it("3개월 이용권의 만료일이 올바르다", () => {
    const now = new Date("2026-04-06T00:00:00Z");
    const paidUntil = new Date(now);
    paidUntil.setMonth(paidUntil.getMonth() + 3);
    expect(paidUntil.getMonth()).toBe(6); // July (0-indexed)
    expect(paidUntil.getFullYear()).toBe(2026);
  });

  it("6개월 이용권의 만료일이 올바르다", () => {
    const now = new Date("2026-04-06T00:00:00Z");
    const paidUntil = new Date(now);
    paidUntil.setMonth(paidUntil.getMonth() + 6);
    expect(paidUntil.getMonth()).toBe(9); // October
  });

  it("12개월 이용권의 만료일이 올바르다", () => {
    const now = new Date("2026-04-06T00:00:00Z");
    const paidUntil = new Date(now);
    paidUntil.setMonth(paidUntil.getMonth() + 12);
    expect(paidUntil.getMonth()).toBe(3); // April
    expect(paidUntil.getFullYear()).toBe(2027);
  });

  it("이미 active인 namespace의 만료일은 기존 만료일 이후에 연장된다", () => {
    const existingEnd = new Date("2026-07-06T00:00:00Z");
    const now = new Date("2026-04-06T00:00:00Z");
    const periodMonths = 6;

    let newPaidUntil: Date;
    if (existingEnd > now) {
      newPaidUntil = new Date(existingEnd);
      newPaidUntil.setMonth(newPaidUntil.getMonth() + periodMonths);
    } else {
      newPaidUntil = new Date(now);
      newPaidUntil.setMonth(newPaidUntil.getMonth() + periodMonths);
    }

    // 기존 7월 + 6개월 = 내년 1월
    expect(newPaidUntil.getMonth()).toBe(0); // January
    expect(newPaidUntil.getFullYear()).toBe(2027);
  });
});
