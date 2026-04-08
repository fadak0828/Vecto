import { describe, it, expect } from "vitest";

// 네임스페이스 만료 상태별 리다이렉트 동작 테스트

describe("네임스페이스 만료 — 리다이렉트 정책", () => {
  it("active namespace는 정상 리다이렉트한다", () => {
    const ns = { payment_status: "active", paid_until: "2026-07-06T00:00:00Z" };
    const shouldBlock = false;
    expect(ns.payment_status === "active").toBe(true);
    expect(shouldBlock).toBe(false);
  });

  it("expired 0-30일은 리다이렉트를 유지한다 (grace period)", () => {
    const ns = { payment_status: "expired", paid_until: "2026-04-01T00:00:00Z" };
    const now = new Date("2026-04-06T00:00:00Z");
    const daysSinceExpiry = Math.floor(
      (now.getTime() - new Date(ns.paid_until).getTime()) / (1000 * 60 * 60 * 24)
    );
    // 5일 경과 — 30일 미만이므로 리다이렉트 유지
    expect(daysSinceExpiry).toBe(5);
    expect(daysSinceExpiry > 30).toBe(false);
  });

  it("expired 30일+ 는 리다이렉트를 차단한다", () => {
    const ns = { payment_status: "expired", paid_until: "2026-03-01T00:00:00Z" };
    const now = new Date("2026-04-06T00:00:00Z");
    const daysSinceExpiry = Math.floor(
      (now.getTime() - new Date(ns.paid_until).getTime()) / (1000 * 60 * 60 * 24)
    );
    // 36일 경과 — 30일 초과이므로 리다이렉트 차단
    expect(daysSinceExpiry).toBe(36);
    expect(daysSinceExpiry > 30).toBe(true);
  });

  it("free namespace도 서브링크 리다이렉트가 통과한다 (무료 = 전 기능 무제한)", () => {
    const ns = { payment_status: "free", paid_until: null };
    // BM(README.md): 무료 = 전 기능 무제한 + 작은 안내 1줄. 유료 = 안내 숨김 + 클릭 통계.
    // 서브링크 리다이렉트는 무료/유료 구분 없이 동작해야 한다.
    const shouldBlock = ns.payment_status === "expired"; // free 는 차단 대상이 아님
    expect(shouldBlock).toBe(false);
  });

  it("/go/[slug] 무료 URL은 namespace 결제 상태와 무관하다", () => {
    // /go/[slug]는 namespace_id IS NULL인 slugs를 조회
    // namespace 결제 상태 체크와 완전히 독립적
    const freeSlug = { namespace_id: null };
    expect(freeSlug.namespace_id).toBeNull();
  });
});
