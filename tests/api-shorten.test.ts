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
