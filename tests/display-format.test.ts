// Display format helper — strips https:// for visual consistency with the rest
// of the codebase. Clipboard copy still uses the full URL elsewhere.
import { describe, it, expect } from "vitest";

function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

describe("stripScheme", () => {
  it("removes https:// prefix", () => {
    expect(stripScheme("https://좌표.to/go/오늘강의")).toBe(
      "좌표.to/go/오늘강의"
    );
  });

  it("removes http:// prefix", () => {
    expect(stripScheme("http://example.com")).toBe("example.com");
  });

  it("leaves a scheme-less URL alone", () => {
    expect(stripScheme("좌표.to/go/abc")).toBe("좌표.to/go/abc");
  });

  it("does not touch a different scheme", () => {
    expect(stripScheme("ftp://example.com")).toBe("ftp://example.com");
  });

  it("does not touch http inside the path", () => {
    expect(stripScheme("https://좌표.to/go/http")).toBe("좌표.to/go/http");
  });

  it("handles empty string", () => {
    expect(stripScheme("")).toBe("");
  });
});
