// 구독 결제 상태 판정 (isPaidSubscription) 회귀 테스트.
//
// 배경: 대시보드 ClickStats 가 isPaid 를 prop 으로 받아 잠금 카드 vs 실제
// 통계를 분기. 이전 로직은 인라인으로 `status === "active" || "canceled"` 만
// 검사 → 'pending' (결제 시작 후 미완료) 사용자가 무료인데 isPaid=false 는
// 정상이지만, 'canceled' + 기간 만료 사용자도 isPaid=true 로 잘못 판정하는
// 문제가 있었다. 이 테스트는 6가지 상태 모두를 검증해 추후 회귀 방지.
import { describe, it, expect } from "vitest";
import {
  isPaidSubscription,
  type ServerSubscription,
} from "@/lib/server/user-namespace";

function sub(
  partial: Partial<ServerSubscription> & {
    status: ServerSubscription["status"];
  },
): ServerSubscription {
  return {
    id: "sub_x",
    current_period_end: null,
    past_due_since: null,
    failed_charge_count: 0,
    ...partial,
  };
}

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

describe("isPaidSubscription", () => {
  it("subscription 이 null 이면 false (무료 사용자)", () => {
    expect(isPaidSubscription(null)).toBe(false);
  });

  it("status='pending' 은 false (결제 시작했으나 미완료)", () => {
    // 사용자 보고 핵심 케이스: 결제 폼 열고 닫으면 pending row 가 남는데,
    // 이전 dashboard 로직은 이를 active 와 동일 취급해서 잘못된 "프리미엄
    // 이용 중" 노출. 명시적으로 false.
    expect(
      isPaidSubscription(sub({ status: "pending", current_period_end: FUTURE })),
    ).toBe(false);
  });

  it("status='active' 은 true", () => {
    expect(
      isPaidSubscription(sub({ status: "active", current_period_end: FUTURE })),
    ).toBe(true);
  });

  it("status='trialing' 은 true (무료 체험 중에도 프리미엄 혜택 노출)", () => {
    expect(
      isPaidSubscription(sub({ status: "trialing", current_period_end: FUTURE })),
    ).toBe(true);
  });

  it("status='past_due' 는 false (결제 실패 — 혜택 차단)", () => {
    expect(
      isPaidSubscription(sub({ status: "past_due", current_period_end: FUTURE })),
    ).toBe(false);
  });

  it("status='failed' 는 false", () => {
    expect(isPaidSubscription(sub({ status: "failed" }))).toBe(false);
  });

  it("status='canceled' + period_end 미래 → true (해지 신청했지만 기간 남음)", () => {
    expect(
      isPaidSubscription(
        sub({ status: "canceled", current_period_end: FUTURE }),
      ),
    ).toBe(true);
  });

  it("status='canceled' + period_end 경과 → false (만료)", () => {
    // 회귀: 이전 로직은 canceled 면 무조건 true 라 만료 후에도 통계가 보였음.
    expect(
      isPaidSubscription(sub({ status: "canceled", current_period_end: PAST })),
    ).toBe(false);
  });

  it("status='canceled' + period_end null → false (방어적 기본값)", () => {
    expect(
      isPaidSubscription(
        sub({ status: "canceled", current_period_end: null }),
      ),
    ).toBe(false);
  });
});
