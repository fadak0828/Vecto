// POST /api/slugs/:id/refresh-og 테스트.
import { describe, it, expect, beforeEach, vi } from "vitest";

type User = { id: string } | null;
let mockUser: User = { id: "user-1" };

interface MockQueryResult {
  data?: unknown;
  error?: { code?: string; message?: string } | null;
}

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
  chain.then = function (
    onFulfilled: (v: MockQueryResult) => unknown,
    onRejected?: (e: unknown) => unknown,
  ) {
    if (mode === "delete") {
      try {
        return Promise.resolve(dequeue(`${table}:delete`)).then(
          onFulfilled,
          onRejected,
        );
      } catch (e) {
        return Promise.reject(e).then(onFulfilled, onRejected);
      }
    }
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

let ogResult: import("@/lib/og-fetcher").OGResult = {
  ok: true,
  title: "Fresh",
  description: "new desc",
  image: "https://cdn.example.com/new.png",
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
    title: "Fresh",
    description: "new desc",
    image: "https://cdn.example.com/new.png",
    site_name: "site",
  };
});

import type { NextRequest } from "next/server";
function makeRequest(): NextRequest {
  return {
    json: async () => ({}),
    headers: new Headers(),
  } as unknown as NextRequest;
}

describe("POST /api/slugs/:id/refresh-og", () => {
  it("미인증 → 401", async () => {
    mockUser = null;
    const { POST } = await import("@/app/api/slugs/[id]/refresh-og/route");
    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "slug-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("slug 없음 → 403", async () => {
    enqueue("slugs:select", { data: null, error: null });
    const { POST } = await import("@/app/api/slugs/[id]/refresh-og/route");
    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(403);
  });

  it("namespace_id null (무료 링크) → 403", async () => {
    enqueue("slugs:select", {
      data: { id: "slug-1", namespace_id: null, target_url: "https://example.com" },
      error: null,
    });
    const { POST } = await import("@/app/api/slugs/[id]/refresh-og/route");
    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "slug-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("타 오너 → 403", async () => {
    enqueue("slugs:select", {
      data: {
        id: "slug-1",
        namespace_id: "ns-1",
        target_url: "https://example.com",
      },
      error: null,
    });
    enqueue("namespaces:select", {
      data: { owner_id: "other-user" },
      error: null,
    });
    const { POST } = await import("@/app/api/slugs/[id]/refresh-og/route");
    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "slug-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("성공 → og_* 갱신 + og_fetched_at 세팅", async () => {
    enqueue("slugs:select", {
      data: {
        id: "slug-1",
        namespace_id: "ns-1",
        target_url: "https://example.com",
      },
      error: null,
    });
    enqueue("namespaces:select", {
      data: { owner_id: "user-1" },
      error: null,
    });
    enqueue("slugs:update", {
      data: {
        id: "slug-1",
        slug: "test",
        target_url: "https://example.com",
        namespace_id: "ns-1",
        og_title: "Fresh",
        og_description: "new desc",
        og_image: "https://cdn.example.com/new.png",
        og_site_name: "site",
        og_fetched_at: "2026-04-09T00:00:00Z",
        og_fetch_error: null,
      },
      error: null,
    });
    const { POST } = await import("@/app/api/slugs/[id]/refresh-og/route");
    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "slug-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.og_title).toBe("Fresh");
    expect(body.og_fetch_error).toBeNull();
    expect(body.og_fetched_at).toBeTruthy();
  });

  it("재수집 실패 → og_fetch_error 업데이트", async () => {
    enqueue("slugs:select", {
      data: {
        id: "slug-1",
        namespace_id: "ns-1",
        target_url: "https://example.com",
      },
      error: null,
    });
    enqueue("namespaces:select", {
      data: { owner_id: "user-1" },
      error: null,
    });
    ogResult = { ok: false, error: "http_5xx" };
    enqueue("slugs:update", {
      data: {
        id: "slug-1",
        slug: "test",
        target_url: "https://example.com",
        namespace_id: "ns-1",
        og_title: "OldStale",
        og_description: null,
        og_image: null,
        og_site_name: null,
        og_fetched_at: "2026-04-09T00:00:00Z",
        og_fetch_error: "http_5xx",
      },
      error: null,
    });
    const { POST } = await import("@/app/api/slugs/[id]/refresh-og/route");
    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "slug-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.og_fetch_error).toBe("http_5xx");
    // 기존 og_title은 보존되어야 함
    expect(body.og_title).toBe("OldStale");
  });
});
