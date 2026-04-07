// roughMonthly: rounds DOWN to nearest 10 for clean display.
// Always under-represents actual price (paired with "약" prefix in UI).
import { describe, it, expect } from "vitest";
import { roughMonthly, PLANS } from "@/lib/pricing";

describe("roughMonthly", () => {
  it("rounds down to nearest 10", () => {
    expect(roughMonthly(967)).toBe(960);
    expect(roughMonthly(817)).toBe(810);
    expect(roughMonthly(742)).toBe(740);
  });

  it("leaves exact tens alone", () => {
    expect(roughMonthly(1000)).toBe(1000);
    expect(roughMonthly(900)).toBe(900);
    expect(roughMonthly(10)).toBe(10);
  });

  it("never returns higher than the actual price (under-representation guarantee)", () => {
    for (const plan of PLANS) {
      expect(roughMonthly(plan.monthlyPrice)).toBeLessThanOrEqual(
        plan.monthlyPrice
      );
    }
  });

  it("stays within 10원 of the actual price", () => {
    for (const plan of PLANS) {
      const diff = plan.monthlyPrice - roughMonthly(plan.monthlyPrice);
      expect(diff).toBeGreaterThanOrEqual(0);
      expect(diff).toBeLessThan(10);
    }
  });

  it("handles zero and small values", () => {
    expect(roughMonthly(0)).toBe(0);
    expect(roughMonthly(5)).toBe(0);
    expect(roughMonthly(9)).toBe(0);
  });
});
