import { describe, it, expect } from "vitest";
import { getPlan, validatePaymentAmount } from "@/lib/pricing";

// POST /api/payment/prepare의 핵심 검증 로직 테스트
// (실제 Supabase/인증 연동 없이 비즈니스 로직 검증)

describe("POST /api/payment/prepare — 입력 검증", () => {
  it("유효한 기간(3개월)으로 플랜을 조회할 수 있다", () => {
    const plan = getPlan(3);
    expect(plan).not.toBeNull();
    expect(plan!.price).toBe(2900);
    expect(plan!.label).toBe("3개월");
  });

  it("유효한 기간(6개월)으로 플랜을 조회할 수 있다", () => {
    const plan = getPlan(6);
    expect(plan).not.toBeNull();
    expect(plan!.price).toBe(4900);
    expect(plan!.badge).toBe("best value");
  });

  it("유효한 기간(12개월)으로 플랜을 조회할 수 있다", () => {
    const plan = getPlan(12);
    expect(plan).not.toBeNull();
    expect(plan!.price).toBe(8900);
  });

  it("잘못된 기간(1, 2, 7, 24개월 등)을 거부한다", () => {
    expect(getPlan(1)).toBeNull();
    expect(getPlan(2)).toBeNull();
    expect(getPlan(7)).toBeNull();
    expect(getPlan(24)).toBeNull();
  });

  it("paymentId 형식이 올바르다", () => {
    const nsName = "홍길동";
    const paymentId = `jwapyo_${nsName}_${Date.now()}`;
    expect(paymentId).toMatch(/^jwapyo_홍길동_\d+$/);
  });

  it("orderName이 올바르게 생성된다", () => {
    const plan = getPlan(6);
    const nsName = "홍길동";
    const orderName = `좌표.to/${nsName} ${plan!.label} 이용권`;
    expect(orderName).toBe("좌표.to/홍길동 6개월 이용권");
  });
});
