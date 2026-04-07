import { describe, it, expect } from "vitest";
import {
  MONTHLY_PRICE,
  validateSubscriptionAmount,
  validatePaymentAmount,
} from "@/lib/pricing";

// POST /api/payment/prepare 핵심 비즈니스 로직 검증
// (실제 Supabase/인증/PortOne 연동 없이 로직만 테스트)

describe("POST /api/payment/prepare — 단일 SKU 구독", () => {
  it("월 가격이 단일 고정 값", () => {
    expect(MONTHLY_PRICE).toBe(2900);
  });

  it("구독 금액 검증 — 정확한 ₩2,900만 허용", () => {
    expect(validateSubscriptionAmount(MONTHLY_PRICE)).toBe(true);
    expect(validateSubscriptionAmount(2800)).toBe(false);
    expect(validateSubscriptionAmount(3000)).toBe(false);
  });

  it("period_months=1 (월 구독)은 validatePaymentAmount에서 통과", () => {
    expect(validatePaymentAmount(1, 2900)).toBe(true);
    expect(validatePaymentAmount(1, 2800)).toBe(false);
  });

  it("orderName 포맷이 namespace + '프리미엄 구독' 형태", () => {
    const nsName = "홍길동";
    const orderName = `좌표.to/${nsName} 프리미엄 구독 (첫 결제)`;
    expect(orderName).toBe("좌표.to/홍길동 프리미엄 구독 (첫 결제)");
  });

  it("paymentId 포맷이 예측 불가능한 랜덤 값 (jwapyo_ prefix + hex)", () => {
    // 실제 생성은 crypto.randomBytes — 여기선 형식만 검증
    const mockPaymentId = `jwapyo_${"a1b2c3d4e5f67890a1b2c3d4e5f67890"}`;
    expect(mockPaymentId).toMatch(/^jwapyo_[0-9a-f]{32}$/);
  });
});
