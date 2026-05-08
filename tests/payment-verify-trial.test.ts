// GET /api/payment/verify — 무료 체험(trial) 단락 회귀 테스트.
//
// 사용자 보고 버그: "1개월 무료로 시작하기" 결제 후 /payment/complete 페이지가
// "결제 확인이 지연되고 있습니다" 로 끝남.
//
// 원인: trial flow 는 PortOne 에서 빌링키만 발급하고 실제 charge 는 30일 후로
// schedule. 따라서 payment.status 는 영원히 'pending', PortOne 결제도 PAID 가
// 안 됨. /payment/complete 가 30초 폴링 후 timeout.
//
// Fix: BillingKey.Issued webhook 이 이미 subscription 을 'trialing' 으로 전환했으므로,
// verify 는 payment.subscription_id 의 status 가 trialing/active 면 'paid' 응답.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

let mockUser: { id: string } | null = { id: "user-1" };

type MockResult = { data?: unknown; error?: unknown };
const queues: Record<string, MockResult[]> = {};
function enqueue(key: string, r: MockResult) {
  (queues[key] ??= []).push(r);
}
function dequeue(key: string): MockResult {
  return queues[key]?.shift() ?? { data: null, error: null };
}

function makeChain(table: string) {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.maybeSingle = async () => dequeue(`${table}:select`);
  chain.single = async () => dequeue(`${table}:select`);
  return chain;
}

const fromMock = vi.fn((table: string) => makeChain(table));

vi.mock("@/lib/supabase-server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: mockUser } }),
    },
  }),
}));

const getPortOnePaymentMock = vi.fn();

vi.mock("@/lib/portone", () => ({
  getServiceSupabase: () => ({ from: fromMock }),
  getPortOnePayment: (id: string) => getPortOnePaymentMock(id),
}));

beforeEach(() => {
  mockUser = { id: "user-1" };
  for (const k of Object.keys(queues)) delete queues[k];
  getPortOnePaymentMock.mockReset();
});

function makeRequest(paymentId: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/payment/verify?paymentId=${paymentId}`,
    { method: "GET" },
  );
}

describe("GET /api/payment/verify — trial 단락", () => {
  it("subscription.status='trialing' 이면 PortOne 호출 없이 'paid' 응답", async () => {
    enqueue("payments:select", {
      data: {
        id: "pay-1",
        owner_id: "user-1",
        subscription_id: "sub-1",
        status: "pending",
        period_months: 1,
        amount: 2900,
        namespace_id: "ns-1",
      },
      error: null,
    });
    enqueue("subscriptions:select", {
      data: {
        status: "trialing",
        current_period_end: "2026-06-08T00:00:00Z",
      },
      error: null,
    });

    const { GET } = await import("@/app/api/payment/verify/route");
    const res = await GET(makeRequest("jw_abc"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("paid");
    expect(body.message).toContain("무료 체험");
    // 단락 처리: PortOne API 호출 없어야 함
    expect(getPortOnePaymentMock).not.toHaveBeenCalled();
  });

  it("subscription.status='active' (이미 활성화된 경우) 도 'paid' 응답", async () => {
    enqueue("payments:select", {
      data: {
        id: "pay-2",
        owner_id: "user-1",
        subscription_id: "sub-2",
        status: "pending",
        period_months: 1,
        amount: 2900,
        namespace_id: "ns-1",
      },
      error: null,
    });
    enqueue("subscriptions:select", {
      data: {
        status: "active",
        current_period_end: "2026-06-08T00:00:00Z",
      },
      error: null,
    });

    const { GET } = await import("@/app/api/payment/verify/route");
    const res = await GET(makeRequest("jw_xyz"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("paid");
    expect(getPortOnePaymentMock).not.toHaveBeenCalled();
  });

  it("subscription 이 아직 'pending' 이면 PortOne 폴 진입 (webhook 미도착)", async () => {
    enqueue("payments:select", {
      data: {
        id: "pay-3",
        owner_id: "user-1",
        subscription_id: "sub-3",
        status: "pending",
        period_months: 1,
        amount: 2900,
        namespace_id: "ns-1",
      },
      error: null,
    });
    enqueue("subscriptions:select", {
      data: { status: "pending", current_period_end: null },
      error: null,
    });
    // PortOne 도 아직 결제 미확인 → 'pending' 응답 시뮬레이션
    getPortOnePaymentMock.mockResolvedValue({ status: "READY" });

    const { GET } = await import("@/app/api/payment/verify/route");
    const res = await GET(makeRequest("jw_pending"));
    const body = await res.json();
    expect(body.status).toBe("pending");
    // subscription 이 pending 이라 단락 안 되고 PortOne 폴 진입했는지 확인
    expect(getPortOnePaymentMock).toHaveBeenCalledWith("jw_pending");
  });
});
