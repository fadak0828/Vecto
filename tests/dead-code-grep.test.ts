// Regression: 이메일 OTP 로그인 잔재가 src/ 트리에 남아있지 않은지 확인
// Phase 1a (OAuth 마이그레이션) 이후 회귀 안전망
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const SRC_DIR = resolve(__dirname, "../src");
const SELF = "tests/dead-code-grep.test.ts";

function grepSrc(pattern: string): string[] {
  try {
    // execFileSync with argv array — no shell interpolation, so patterns
    // containing quotes, $, backticks, or backslashes cannot inject shell.
    const out = execFileSync(
      "grep",
      ["-RIl", "--exclude-dir=node_modules", "-F", pattern, SRC_DIR],
      { encoding: "utf8" }
    );
    return out
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((p) => !p.endsWith(SELF));
  } catch {
    // grep returns non-zero when no matches found
    return [];
  }
}

describe("Dead code grep — 이메일 OTP 잔재", () => {
  it("signInWithOtp 호출이 src/ 트리에 없다", () => {
    const matches = grepSrc("signInWithOtp");
    expect(matches).toEqual([]);
  });

  it("verifyOtp 호출이 src/ 트리에 없다", () => {
    const matches = grepSrc("verifyOtp");
    expect(matches).toEqual([]);
  });

  it('"6자리 인증 코드" 문구가 src/ 트리에 없다', () => {
    const matches = grepSrc("6자리 인증 코드");
    expect(matches).toEqual([]);
  });

  it('"로그인 링크 받기" 문구가 src/ 트리에 없다', () => {
    const matches = grepSrc("로그인 링크 받기");
    expect(matches).toEqual([]);
  });

  it('"로그인 링크 전송 완료" 문구가 src/ 트리에 없다', () => {
    const matches = grepSrc("로그인 링크 전송 완료");
    expect(matches).toEqual([]);
  });
});
