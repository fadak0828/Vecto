// POST /api/slugs + DELETE /api/slugs/:id 통합 테스트.
// Supabase 클라이언트와 og-fetcher를 vi.mock으로 주입한다.
import { describe, it, expect, beforeEach, vi } from "vitest";

// ---- Mock state ----

type User = { id: string } | null;
let mockUser: User = { id: "user-1" };

interface MockQueryResult {
  data?: unknown;
  error?: { code?: string; message?: string } | null;
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
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
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
  // DELETE chain: handler does `await supabase.from("slugs").delete().eq(...)`
  // which means the chain object itself must be thenable for delete mode.
  chain.then = function (
    onFulfilled: (v: MockQueryResult) => unknown,
    onRejected?: (e: unknown) => unknown,
  ) {
    if (mode === "delete") {
      try {
        const v = dequeue(`${table}:delete`);
        return Promise.resolve(v).then(onFulfilled, onRejected);
      } catch (e) {
        return Promise.reject(e).then(onFulfilled, onRejected);
      }
    }
    // select/insert/update are only resolved via maybeSingle/single
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
    enqueue("namespaces:select", {
      data: { id: "ns-1", owner_id: "other-user" },
      error: null,
    });
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

  it("성공 → 200 + og_* 필드 포함", async () => {
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
        og_title: "Mocked OG",
        og_description: "desc",
        og_image: "https://cdn.example.com/img.png",
        og_site_name: "site",
        og_fetched_at: "2026-04-09T00:00:00Z",
        og_fetch_error: null,
      },
      error: null,
    });
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
    expect(body.og_title).toBe("Mocked OG");
    expect(body.og_image).toBe("https://cdn.example.com/img.png");
    expect(body.og_fetch_error).toBeNull();
  });

  it("OG fetch 실패 → 200 + og_fetch_error='timeout' (silent 실패 금지)", async () => {
    enqueue("namespaces:select", {
      data: { id: "ns-1", owner_id: "user-1" },
      error: null,
    });
    enqueue("slugs:select", { data: null, error: null });
    ogResult = { ok: false, error: "timeout" };
    enqueue("slugs:insert", {
      data: {
        id: "new-id",
        slug: "test",
        target_url: "https://example.com",
        namespace_id: "ns-1",
        og_title: null,
        og_description: null,
        og_image: null,
        og_site_name: null,
        og_fetched_at: "2026-04-09T00:00:00Z",
        og_fetch_error: "timeout",
      },
      error: null,
    });
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
    expect(body.og_fetch_error).toBe("timeout");
    expect(body.og_title).toBeNull();
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
