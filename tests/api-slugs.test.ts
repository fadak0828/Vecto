// POST /api/slugs + DELETE /api/slugs/:id 통합 테스트.
// Supabase 클라이언트와 og-fetcher를 vi.mock으로 주입한다.
//
// 성능 리팩터 (2026-04-10): POST /api/slugs 는 OG fetch 를 `next/server` 의
// `after()` 로 백그라운드에서 실행한다. 응답은 OG 필드가 null 인 row 를 즉시
// 돌려줌. 테스트 환경에서는 `after` 를 no-op 으로 스텁하고, 백그라운드 실행
// 자체는 별도 테스트(`executes background after() callback`) 로 검증한다.
import { describe, it, expect, beforeEach, vi } from "vitest";

// `after()` 캡처 — 백그라운드 콜백이 등록되는지 검증하기 위해 배열에 쌓음.
const afterCallbacks: Array<() => unknown | Promise<unknown>> = [];
vi.mock("next/server", async () => {
  const actual =
    await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    after: (fn: () => unknown | Promise<unknown>) => {
      afterCallbacks.push(fn);
    },
  };
});

// ---- Mock state ----

type User = { id: string } | null;
let mockUser: User = { id: "user-1" };

interface MockQueryResult {
  data?: unknown;
  error?: { code?: string; message?: string } | null;
  count?: number | null;
}

// 호출별 응답 큐 — from(table)+mode 튜플 키
const queues: Record<string, MockQueryResult[]> = {};
function enqueue(key: string, r: MockQueryResult) {
  (queues[key] ??= []).push(r);
}
function dequeue(key: string): MockQueryResult {
  const q = queues[key];
  if (!q || q.length === 0) throw new Error(`mock 큐 비어있음: ${key}`);
  return q.shift()!;
}

function makeChain(table: string) {
  let mode: "select" | "insert" | "update" | "delete" = "select";
  let isHeadCount = false;
  const chain: Record<string, unknown> = {};
  chain.select = (_cols?: string, opts?: { count?: string; head?: boolean }) => {
    if (opts?.head) isHeadCount = true;
    return chain;
  };
  chain.insert = () => {
    mode = "insert";
    return chain;
  };
  chain.update = () => {
    mode = "update";
    return chain;
  };
  chain.delete = () => {
    mode = "delete";
    return chain;
  };
  chain.eq = () => chain;
  chain.is = () => chain;
  chain.gte = () => chain;
  chain.maybeSingle = async () => dequeue(`${table}:select`);
  chain.single = async () => dequeue(`${table}:${mode}`);
  // DELETE/UPDATE chain: handler does `await supabase.from("slugs").delete().eq(...)`
  // or `.update(...).eq(...)` without .single(), so the chain must be thenable
  // for those modes. INSERT/SELECT still resolve via single/maybeSingle.
  // HEAD count query (`.select(_, {count, head: true})`) also awaits the chain
  // directly → dequeue from `${table}:count`.
  chain.then = function (
    onFulfilled: (v: MockQueryResult) => unknown,
    onRejected?: (e: unknown) => unknown,
  ) {
    if (mode === "delete" || mode === "update") {
      try {
        const v = dequeue(`${table}:${mode}`);
        return Promise.resolve(v).then(onFulfilled, onRejected);
      } catch (e) {
        return Promise.reject(e).then(onFulfilled, onRejected);
      }
    }
    if (mode === "select" && isHeadCount) {
      try {
        const v = dequeue(`${table}:count`);
        return Promise.resolve(v).then(onFulfilled, onRejected);
      } catch (e) {
        return Promise.reject(e).then(onFulfilled, onRejected);
      }
    }
    // select/insert are only resolved via maybeSingle/single
    return Promise.resolve(chain as unknown as MockQueryResult).then(
      onFulfilled,
      onRejected,
    );
  };
  return chain;
}

const fromMock = vi.fn((table: string) => makeChain(table));

vi.mock("@/lib/supabase-server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: mockUser } }),
    },
    from: fromMock,
  }),
}));

// og-fetcher mock — 테스트에서 덮어쓸 수 있는 레퍼런스
let ogResult: import("@/lib/og-fetcher").OGResult = {
  ok: true,
  title: "Mocked OG",
  description: "desc",
  image: "https://cdn.example.com/img.png",
  site_name: "site",
};
vi.mock("@/lib/og-fetcher", () => ({
  fetchOG: async () => ogResult,
}));

beforeEach(() => {
  mockUser = { id: "user-1" };
  for (const k of Object.keys(queues)) delete queues[k];
  afterCallbacks.length = 0;
  ogResult = {
    ok: true,
    title: "Mocked OG",
    description: "desc",
    image: "https://cdn.example.com/img.png",
    site_name: "site",
  };
});

// ---- Helpers ----
import type { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
    headers: new Headers(),
  } as unknown as NextRequest;
}

// ---- POST /api/slugs ----

describe("POST /api/slugs", () => {
  it("미인증 → 401", async () => {
    mockUser = null;
    const { POST } = await import("@/app/api/slugs/route");
    const res = await POST(
      makeRequest({
        slug: "test",
        target_url: "https://example.com",
        namespace_id: "ns-1",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("잘못된 slug → 400", async () => {
    const { POST } = await import("@/app/api/slugs/route");
    const res = await POST(
      makeRequest({
        slug: "bad slug!!",
        target_url: "https://example.com",
        namespace_id: "ns-1",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("잘못된 URL → 400", async () => {
    const { POST } = await import("@/app/api/slugs/route");
    const res = await POST(
      makeRequest({
        slug: "test",
        target_url: "javascript:alert(1)",
        namespace_id: "ns-1",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("namespace_id 누락 → 400", async () => {
    const { POST } = await import("@/app/api/slugs/route");
    const res = await POST(
      makeRequest({
        slug: "test",
        target_url: "https://example.com",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("타 네임스페이스에 삽입 시도 → 403", async () => {
    // Promise.all 로 ns 체크 + 중복 slug 체크가 병렬 실행 → 두 큐 모두 필요.
    enqueue("namespaces:select", {
      data: { id: "ns-1", owner_id: "other-user" },
      error: null,
    });
    enqueue("slugs:select", { data: null, error: null });
    const { POST } = await import("@/app/api/slugs/route");
    const res = await POST(
      makeRequest({
        slug: "test",
        target_url: "https://example.com",
        namespace_id: "ns-1",
      }),
    );
    expect(res.status).toBe(403);
  });

  it("네임스페이스 없음 → 403", async () => {
    enqueue("namespaces:select", { data: null, error: null });
    enqueue("slugs:select", { data: null, error: null });
    const { POST } = await import("@/app/api/slugs/route");
    const res = await POST(
      makeRequest({
        slug: "test",
        target_url: "https://example.com",
        namespace_id: "ns-missing",
      }),
    );
    expect(res.status).toBe(403);
  });

  it("중복 slug → 409", async () => {
    enqueue("namespaces:select", {
      data: { id: "ns-1", owner_id: "user-1" },
      error: null,
    });
    enqueue("slugs:select", { data: { id: "existing-id" }, error: null });
    const { POST } = await import("@/app/api/slugs/route");
    const res = await POST(
      makeRequest({
        slug: "test",
        target_url: "https://example.com",
        namespace_id: "ns-1",
      }),
    );
    expect(res.status).toBe(409);
  });

  it("성공 → 200 + og_* 필드 null (OG 는 after() 로 백그라운드 fetch)", async () => {
    enqueue("namespaces:select", {
      data: { id: "ns-1", owner_id: "user-1" },
      error: null,
    });
    enqueue("slugs:select", { data: null, error: null });
    enqueue("slugs:insert", {
      data: {
        id: "new-slug-id",
        slug: "test",
        target_url: "https://example.com",
        namespace_id: "ns-1",
        og_title: null,
        og_description: null,
        og_image: null,
        og_site_name: null,
        og_fetched_at: null,
        og_fetch_error: null,
      },
      error: null,
    });
    enqueue("slugs:count", { data: null, error: null, count: 1 } as MockQueryResult);
    const { POST } = await import("@/app/api/slugs/route");
    const res = await POST(
      makeRequest({
        slug: "test",
        target_url: "https://example.com",
        namespace_id: "ns-1",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    // 링크 생성 응답은 OG 필드가 전부 null — 사용자는 응답을 기다리지 않고
    // 잠시 후 router.refresh() 로 OG 메타데이터를 받는다.
    expect(body.og_title).toBeNull();
    expect(body.og_image).toBeNull();
    expect(body.og_fetched_at).toBeNull();
    expect(body.og_fetch_error).toBeNull();
    // 백그라운드 콜백이 정확히 1번 등록되어야 함.
    expect(afterCallbacks).toHaveLength(1);
  });

  it("성공 → 백그라운드 after() 가 OG 를 fetch 해서 slugs.update 호출", async () => {
    enqueue("namespaces:select", {
      data: { id: "ns-1", owner_id: "user-1" },
      error: null,
    });
    enqueue("slugs:select", { data: null, error: null });
    enqueue("slugs:insert", {
      data: {
        id: "bg-slug-id",
        slug: "bg",
        target_url: "https://example.com",
        namespace_id: "ns-1",
        og_title: null,
        og_description: null,
        og_image: null,
        og_site_name: null,
        og_fetched_at: null,
        og_fetch_error: null,
      },
      error: null,
    });
    enqueue("slugs:count", { data: null, error: null, count: 2 } as MockQueryResult);
    const { POST } = await import("@/app/api/slugs/route");
    const res = await POST(
      makeRequest({
        slug: "bg",
        target_url: "https://example.com",
        namespace_id: "ns-1",
      }),
    );
    expect(res.status).toBe(200);
    // 백그라운드 콜백 수동 실행 (after mock 이 콜백을 보관만 함).
    // 이 호출 안에서 supabase.from("slugs").update(...) 가 호출됨 → 큐에 응답 필요.
    enqueue("slugs:update", { data: null, error: null });
    await afterCallbacks[0]();
    // after 내부에서 update 가 정상 리졸브되었는지 확인 — 큐에서 하나 빠졌으면 OK.
    expect(queues["slugs:update"]?.length ?? 0).toBe(0);
  });

  it("OG fetch 실패 → 백그라운드 update 가 og_fetch_error 기록", async () => {
    enqueue("namespaces:select", {
      data: { id: "ns-1", owner_id: "user-1" },
      error: null,
    });
    enqueue("slugs:select", { data: null, error: null });
    enqueue("slugs:insert", {
      data: {
        id: "fail-slug-id",
        slug: "fail",
        target_url: "https://slow.example",
        namespace_id: "ns-1",
        og_title: null,
        og_description: null,
        og_image: null,
        og_site_name: null,
        og_fetched_at: null,
        og_fetch_error: null,
      },
      error: null,
    });
    enqueue("slugs:count", { data: null, error: null, count: 3 } as MockQueryResult);
    ogResult = { ok: false, error: "timeout" };
    const { POST } = await import("@/app/api/slugs/route");
    const res = await POST(
      makeRequest({
        slug: "fail",
        target_url: "https://slow.example",
        namespace_id: "ns-1",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    // 즉시 응답에는 실패 정보가 없음 — 백그라운드 update 전까지는 "대기 중"
    expect(body.og_fetch_error).toBeNull();
    // 백그라운드 실행 후 update 가 호출되어야 함.
    enqueue("slugs:update", { data: null, error: null });
    await afterCallbacks[0]();
    expect(queues["slugs:update"]?.length ?? 0).toBe(0);
  });

  it("insert 시 23505 → 409 (race condition)", async () => {
    enqueue("namespaces:select", {
      data: { id: "ns-1", owner_id: "user-1" },
      error: null,
    });
    enqueue("slugs:select", { data: null, error: null });
    enqueue("slugs:insert", {
      data: null,
      error: { code: "23505", message: "duplicate" },
    });
    const { POST } = await import("@/app/api/slugs/route");
    const res = await POST(
      makeRequest({
        slug: "test",
        target_url: "https://example.com",
        namespace_id: "ns-1",
      }),
    );
    expect(res.status).toBe(409);
  });
});

// ---- DELETE /api/slugs/:id ----

describe("DELETE /api/slugs/:id", () => {
  it("미인증 → 401", async () => {
    mockUser = null;
    const { DELETE } = await import("@/app/api/slugs/[id]/route");
    const res = await DELETE(makeRequest({}), {
      params: Promise.resolve({ id: "slug-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("slug 없음 → 403", async () => {
    enqueue("slugs:select", { data: null, error: null });
    const { DELETE } = await import("@/app/api/slugs/[id]/route");
    const res = await DELETE(makeRequest({}), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(403);
  });

  it("namespace_id null인 slug → 403 (무료 링크는 이 엔드포인트 금지)", async () => {
    enqueue("slugs:select", {
      data: { id: "slug-1", namespace_id: null },
      error: null,
    });
    const { DELETE } = await import("@/app/api/slugs/[id]/route");
    const res = await DELETE(makeRequest({}), {
      params: Promise.resolve({ id: "slug-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("타 오너 → 403", async () => {
    enqueue("slugs:select", {
      data: { id: "slug-1", namespace_id: "ns-1" },
      error: null,
    });
    enqueue("namespaces:select", {
      data: { owner_id: "other-user" },
      error: null,
    });
    const { DELETE } = await import("@/app/api/slugs/[id]/route");
    const res = await DELETE(makeRequest({}), {
      params: Promise.resolve({ id: "slug-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("성공 → 200", async () => {
    enqueue("slugs:select", {
      data: { id: "slug-1", namespace_id: "ns-1" },
      error: null,
    });
    enqueue("namespaces:select", {
      data: { owner_id: "user-1" },
      error: null,
    });
    enqueue("slugs:delete", { data: null, error: null });
    const { DELETE } = await import("@/app/api/slugs/[id]/route");
    const res = await DELETE(makeRequest({}), {
      params: Promise.resolve({ id: "slug-1" }),
    });
    expect(res.status).toBe(200);
  });
});
