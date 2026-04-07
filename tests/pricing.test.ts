import { describe, it, expect } from "vitest";
import {
  MONTHLY_PRICE,
  MONTHLY_SUPPLY_PRICE,
  MONTHLY_VAT,
  MONTHLY_LABEL,
  CURRENCY,
  validateSubscriptionAmount,
  validateLegacyPaymentAmount,
  validatePaymentAmount,
  splitPrice,
} from "@/lib/pricing";

describe("Single SKU 상수", () => {
  it("월 가격이 ₩2,900", () => {
    expect(MONTHLY_PRICE).toBe(2900);
  });

  it("공급가 + VAT = 총액", () => {
    expect(MONTHLY_SUPPLY_PRICE + MONTHLY_VAT).toBe(MONTHLY_PRICE);
  });

  it("라벨과 통화 고정", () => {
    expect(MONTHLY_LABEL).toBe("월 구독");
    expect(CURRENCY).toBe("KRW");
  });
});

describe("validateSubscriptionAmount", () => {
  it("정확한 월 가격만 허용", () => {
    expect(validateSubscriptionAmount(2900)).toBe(true);
  });

  it("다른 금액 거부", () => {
    expect(validateSubscriptionAmount(2800)).toBe(false);
    expect(validateSubscriptionAmount(3000)).toBe(false);
    expect(validateSubscriptionAmount(0)).toBe(false);
    expect(validateSubscriptionAmount(-2900)).toBe(false);
  });
});

describe("validateLegacyPaymentAmount (in-flight 호환)", () => {
  it("3/6/12개월 가격 체크", () => {
    expect(validateLegacyPaymentAmount(3, 2900)).toBe(true);
    expect(validateLegacyPaymentAmount(6, 4900)).toBe(true);
    expect(validateLegacyPaymentAmount(12, 8900)).toBe(true);
  });

  it("잘못된 금액 거부", () => {
    expect(validateLegacyPaymentAmount(3, 2800)).toBe(false);
    expect(validateLegacyPaymentAmount(6, 5000)).toBe(false);
  });

  it("새로운 구독 period_months=1 은 레거시 체크에서 false", () => {
    expect(validateLegacyPaymentAmount(1, 2900)).toBe(false);
  });
});

describe("validatePaymentAmount (통합)", () => {
  it("period_months=1 → 구독 검증", () => {
    expect(validatePaymentAmount(1, 2900)).toBe(true);
    expect(validatePaymentAmount(1, 2800)).toBe(false);
  });

  it("period_months=3/6/12 → 레거시 검증", () => {
    expect(validatePaymentAmount(3, 2900)).toBe(true);
    expect(validatePaymentAmount(6, 4900)).toBe(true);
    expect(validatePaymentAmount(12, 8900)).toBe(true);
  });

  it("존재하지 않는 기간 거부", () => {
    expect(validatePaymentAmount(2, 2900)).toBe(false);
    expect(validatePaymentAmount(24, 29000)).toBe(false);
  });
});

describe("splitPrice", () => {
  it("VAT 10% 기준으로 공급가와 부가세 분리", () => {
    const { supply, vat } = splitPrice(2900);
    expect(supply + vat).toBe(2900);
    expect(supply).toBe(2636);
    expect(vat).toBe(264);
  });
});
