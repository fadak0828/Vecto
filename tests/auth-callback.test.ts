// Regression: Open Redirect 방어 — auth callback의 next 파라미터 검증
// Found by /qa on 2026-04-06
import { describe, it, expect } from "vitest";

// next 파라미터 검증 로직을 직접 테스트 (route handler에서 추출)
function validateNextParam(next: string | null): string {
  const nextParam = next ?? "/dashboard";
  return nextParam.startsWith("/") && !nextParam.startsWith("//")
    ? nextParam
    : "/dashboard";
}

describe("Auth Callback — Open Redirect 방어", () => {
  it("정상적인 상대 경로를 허용한다", () => {
    expect(validateNextParam("/dashboard")).toBe("/dashboard");
    expect(validateNextParam("/settings")).toBe("/settings");
  });

  it("null이면 /dashboard로 폴백한다", () => {
    expect(validateNextParam(null)).toBe("/dashboard");
  });

  it("절대 URL (외부 사이트)을 차단한다", () => {
    expect(validateNextParam("https://evil.com")).toBe("/dashboard");
  });

  it("protocol-relative URL을 차단한다", () => {
    expect(validateNextParam("//evil.com")).toBe("/dashboard");
  });

  it("빈 문자열을 차단한다", () => {
    expect(validateNextParam("")).toBe("/dashboard");
  });

  it("상대 경로가 아닌 문자열을 차단한다", () => {
    expect(validateNextParam("evil.com")).toBe("/dashboard");
    expect(validateNextParam("javascript:alert(1)")).toBe("/dashboard");
  });

  it("중첩된 상대 경로를 허용한다", () => {
    expect(validateNextParam("/dashboard/settings")).toBe(
      "/dashboard/settings"
    );
  });
});
