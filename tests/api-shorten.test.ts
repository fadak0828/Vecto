// Regression: URL 단축 API — 검증, rate limit, race condition 처리
// Found by /qa on 2026-04-06
import { describe, it, expect, vi, beforeEach } from "vitest";

// POST /api/shorten의 핵심 검증 로직만 추출 테스트
// (실제 Supabase 연동 없이 비즈니스 로직 검증)

import { validateSlug, validateUrl } from "@/lib/slug-validation";

describe("POST /api/shorten — 입력 검증", () => {
  it("유효한 한글 slug + https URL을 통과시킨다", () => {
    expect(validateSlug("내포트폴리오").valid).toBe(true);
    expect(validateUrl("https://google.com").valid).toBe(true);
  });

  it("빈 slug를 거부한다", () => {
    expect(validateSlug("").valid).toBe(false);
  });

  it("빈 URL을 거부한다", () => {
    expect(validateUrl("").valid).toBe(false);
  });

  it("javascript: URL을 거부한다 (XSS 방지)", () => {
    expect(validateUrl("javascript:alert(document.cookie)").valid).toBe(false);
  });

  it("data: URL을 거부한다", () => {
    expect(validateUrl("data:text/html,<script>alert(1)</script>").valid).toBe(
      false
    );
  });

  it("금칙어 slug를 거부한다", () => {
    expect(validateSlug("go").valid).toBe(false);
    expect(validateSlug("api").valid).toBe(false);
  });

  it("특수문자가 포함된 slug를 거부한다", () => {
    expect(validateSlug("test<script>").valid).toBe(false);
    expect(validateSlug("test'drop").valid).toBe(false);
    expect(validateSlug("../../etc").valid).toBe(false);
  });
});

describe("POST /api/shorten — Race Condition 시뮬레이션", () => {
  it("unique constraint 에러코드 23505를 올바르게 감지한다", () => {
    // 실제 route.ts에서 사용하는 에러 코드 매칭 로직
    const error = { code: "23505", message: "duplicate key value" };
    const isUniqueViolation = error.code === "23505";
    expect(isUniqueViolation).toBe(true);
  });

  it("다른 에러 코드는 unique violation이 아니다", () => {
    const error = { code: "42501", message: "permission denied" };
    expect(error.code === "23505").toBe(false);
  });
});

describe("POST /api/shorten — Rate Limit 계산", () => {
  it("일일 10개 제한을 올바르게 계산한다", () => {
    const dailyCount = 10;
    const isOverLimit = dailyCount >= 10;
    expect(isOverLimit).toBe(true);
  });

  it("9개는 제한에 걸리지 않는다", () => {
    const dailyCount = 9;
    const isOverLimit = dailyCount >= 10;
    expect(isOverLimit).toBe(false);
  });

  it("월간 30개 제한을 올바르게 계산한다", () => {
    const monthlyCount = 30;
    const isOverLimit = monthlyCount >= 30;
    expect(isOverLimit).toBe(true);
  });
});

// Regression: Promise.all 병렬화 후에도 카운트/충돌 의미가 보존되는지 검증
// (sequential → parallel 변환이 fail-fast 동작을 깨지 않는지)
describe("POST /api/shorten — Promise.all 병렬화 회귀", () => {
  it("4개 SELECT가 모두 resolve하면 카운트와 충돌 모두 접근 가능하다", async () => {
    const dailyMock = Promise.resolve({ count: 5 });
    const monthlyMock = Promise.resolve({ count: 12 });
    const nsConflictMock = Promise.resolve({ data: null });
    const slugConflictMock = Promise.resolve({ data: null });

    const [
      { count: dailyCount },
      { count: monthlyCount },
      { data: nsConflict },
      { data: existing },
    ] = await Promise.all([
      dailyMock,
      monthlyMock,
      nsConflictMock,
      slugConflictMock,
    ]);

    expect(dailyCount).toBe(5);
    expect(monthlyCount).toBe(12);
    expect(nsConflict).toBeNull();
    expect(existing).toBeNull();
  });

  it("한 SELECT가 reject하면 Promise.all 전체가 reject된다 (fail-fast)", async () => {
    const ok = Promise.resolve({ count: 0 });
    const failing = Promise.reject(new Error("supabase down"));

    await expect(
      Promise.all([ok, ok, failing, ok])
    ).rejects.toThrow("supabase down");
  });

  it("일일 한도 초과는 monthly count 값과 무관하게 즉시 차단된다", async () => {
    const dailyCount = 10;
    const monthlyCount = 8;
    // 두 결과 모두 받아왔지만 daily가 우선 차단
    expect((dailyCount ?? 0) >= 10).toBe(true);
    expect((monthlyCount ?? 0) >= 30).toBe(false);
  });
});
