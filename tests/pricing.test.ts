import { describe, it, expect } from "vitest";
import { PLANS, getPlan, validatePaymentAmount } from "@/lib/pricing";

describe("PLANS 상수", () => {
  it("3개 플랜이 정의되어 있다 (3, 6, 12개월)", () => {
    expect(PLANS).toHaveLength(3);
    expect(PLANS.map((p) => p.periodMonths)).toEqual([3, 6, 12]);
  });

  it("가격이 올바르다 (VAT 포함)", () => {
    expect(PLANS[0].price).toBe(2900);
    expect(PLANS[1].price).toBe(4900);
    expect(PLANS[2].price).toBe(8900);
  });

  it("6개월 플랜에 best value 배지가 있다", () => {
    expect(PLANS[1].badge).toBe("best value");
  });
});

describe("getPlan", () => {
  it("유효한 기간을 반환한다", () => {
    expect(getPlan(3)?.price).toBe(2900);
    expect(getPlan(6)?.price).toBe(4900);
    expect(getPlan(12)?.price).toBe(8900);
  });

  it("유효하지 않은 기간에 null을 반환한다", () => {
    expect(getPlan(1)).toBeNull();
    expect(getPlan(7)).toBeNull();
    expect(getPlan(99)).toBeNull();
  });
});

describe("validatePaymentAmount", () => {
  it("올바른 금액을 통과시킨다", () => {
    expect(validatePaymentAmount(3, 2900)).toBe(true);
    expect(validatePaymentAmount(6, 4900)).toBe(true);
    expect(validatePaymentAmount(12, 8900)).toBe(true);
  });

  it("조작된 금액을 거부한다", () => {
    expect(validatePaymentAmount(3, 100)).toBe(false);
    expect(validatePaymentAmount(6, 0)).toBe(false);
    expect(validatePaymentAmount(12, 1)).toBe(false);
  });

  it("존재하지 않는 기간을 거부한다", () => {
    expect(validatePaymentAmount(1, 2900)).toBe(false);
  });
});
