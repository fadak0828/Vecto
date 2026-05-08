// @vitest-environment jsdom
//
// PaymentStatus 6-state 렌더링 테스트. 핵심 회귀: 사용자가 결제 시작 후
// PortOne 창에서 이탈해 'pending' subscription 만 남은 경우, 이전 코드는
// 모든 분기를 빠져나가 마지막 fallthrough ("프리미엄 이용 중") 로 떨어져
// 잘못된 표시를 했다. 이제는 pending 도 무료 플랜 카드와 동일하게 처리.
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PaymentStatus } from "@/components/payment-status";

const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

function sub(
  status:
    | "pending"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "failed",
  current_period_end: string | null = FUTURE,
) {
  return {
    id: "sub_x",
    status,
    current_period_end,
    past_due_since: null,
    failed_charge_count: 0,
  };
}

describe("PaymentStatus", () => {
  it("subscription=null → 무료 플랜 업셀 카드", () => {
    const { getByText, queryByText } = render(
      <PaymentStatus subscription={null} />,
    );
    expect(getByText("무료 플랜")).toBeTruthy();
    expect(queryByText("프리미엄 이용 중")).toBeNull();
  });

  it("status='pending' 도 무료 플랜 카드 (회귀: 이전엔 '프리미엄 이용 중' 으로 잘못 표시됨)", () => {
    const { getByText, queryByText } = render(
      <PaymentStatus subscription={sub("pending")} />,
    );
    expect(getByText("무료 플랜")).toBeTruthy();
    expect(queryByText("프리미엄 이용 중")).toBeNull();
  });

  it("status='active' → '프리미엄 이용 중'", () => {
    const { getByText } = render(
      <PaymentStatus subscription={sub("active")} />,
    );
    expect(getByText("프리미엄 이용 중")).toBeTruthy();
  });

  it("status='trialing' → '무료 체험 중' 라벨", () => {
    const { container } = render(
      <PaymentStatus subscription={sub("trialing")} />,
    );
    expect(container.textContent).toMatch(/무료 체험|D-/);
  });

  it("status='past_due' → '결제 확인 필요'", () => {
    const { getByText } = render(
      <PaymentStatus subscription={sub("past_due")} />,
    );
    expect(getByText("결제 확인 필요")).toBeTruthy();
  });

  it("status='failed' → '구독 만료됨'", () => {
    const { getByText } = render(
      <PaymentStatus subscription={sub("failed")} />,
    );
    expect(getByText("구독 만료됨")).toBeTruthy();
  });
});
