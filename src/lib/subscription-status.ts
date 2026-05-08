/**
 * 구독 결제 상태 판정 — 클라이언트/서버 양쪽에서 안전하게 import 가능.
 *
 * `src/lib/server/user-namespace.ts` 는 next/headers 를 의존하므로 client
 * component 에서 import 하면 빌드가 깨진다 (Next.js / Turbopack 의 모듈
 * 트리 분석은 import 만 봐도 boundary 위반으로 판정). 이 파일은 server
 * 전용 코드를 끌어오지 않도록 의도적으로 분리.
 */

export type SubscriptionStatus =
  | "pending"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "failed";

export type SubscriptionLike = {
  status: SubscriptionStatus;
  current_period_end: string | null;
};

/**
 * 구독이 "유료 혜택을 누리는 상태" 인지 판정.
 *
 * - active / trialing: 명백히 유료
 * - canceled + period_end 가 미래: 해지 신청은 했지만 기간 남음 → 유료
 * - canceled + period_end 경과: 만료 → 무료
 * - pending / past_due / failed: 미완료 또는 결제 실패 → 무료
 *
 * 대시보드 ClickStats lock 표시 등 단일 boolean 판정이 필요한 곳에서 사용.
 * PaymentStatus 컴포넌트는 자체 6-state 머신을 쓰므로 이 함수에 의존하지 않음.
 */
export function isPaidSubscription(
  sub: SubscriptionLike | null,
): boolean {
  if (!sub) return false;
  if (sub.status === "active" || sub.status === "trialing") return true;
  if (sub.status === "canceled" && sub.current_period_end) {
    return new Date(sub.current_period_end) > new Date();
  }
  return false;
}
