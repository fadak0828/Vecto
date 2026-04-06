// Regression: 슬러그 검증 — 허용/거부 패턴이 올바르게 동작하는지 검증
// Found by /qa on 2026-04-06
import { describe, it, expect } from "vitest";
import { validateSlug, validateUrl } from "@/lib/slug-validation";

describe("validateSlug", () => {
  it("유효한 한글 슬러그를 허용한다", () => {
    expect(validateSlug("홍길동")).toEqual({ valid: true });
  });

  it("유효한 영문 슬러그를 허용한다", () => {
    expect(validateSlug("my-portfolio")).toEqual({ valid: true });
  });

  it("한글+영문 혼합을 허용한다", () => {
    expect(validateSlug("나의-blog")).toEqual({ valid: true });
  });

  it("빈 슬러그를 거부한다", () => {
    const result = validateSlug("");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("30자 초과 슬러그를 거부한다", () => {
    const long = "가".repeat(31);
    const result = validateSlug(long);
    expect(result.valid).toBe(false);
  });

  it("특수문자를 거부한다", () => {
    expect(validateSlug("hello world")).toEqual(
      expect.objectContaining({ valid: false })
    );
    expect(validateSlug("test@user")).toEqual(
      expect.objectContaining({ valid: false })
    );
    expect(validateSlug("test/path")).toEqual(
      expect.objectContaining({ valid: false })
    );
  });

  it("금칙어를 거부한다", () => {
    expect(validateSlug("admin").valid).toBe(false);
    expect(validateSlug("api").valid).toBe(false);
    expect(validateSlug("dashboard").valid).toBe(false);
    expect(validateSlug("settings").valid).toBe(false);
    expect(validateSlug("login").valid).toBe(false);
  });

  it("금칙어 대소문자를 구분하지 않는다", () => {
    expect(validateSlug("Admin").valid).toBe(false);
    expect(validateSlug("API").valid).toBe(false);
  });

  it("30자 경계값을 올바르게 처리한다", () => {
    const exactly30 = "가".repeat(30);
    expect(validateSlug(exactly30).valid).toBe(true);
  });
});

describe("validateUrl", () => {
  it("https URL을 허용한다", () => {
    expect(validateUrl("https://google.com")).toEqual({ valid: true });
  });

  it("http URL을 허용한다", () => {
    expect(validateUrl("http://example.com")).toEqual({ valid: true });
  });

  it("빈 URL을 거부한다", () => {
    expect(validateUrl("").valid).toBe(false);
  });

  it("프로토콜이 없는 URL을 거부한다", () => {
    expect(validateUrl("google.com").valid).toBe(false);
  });

  it("ftp 프로토콜을 거부한다", () => {
    expect(validateUrl("ftp://files.example.com").valid).toBe(false);
  });

  it("javascript: 프로토콜을 거부한다", () => {
    expect(validateUrl("javascript:alert(1)").valid).toBe(false);
  });
});
