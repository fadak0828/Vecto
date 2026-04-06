// Regression: XSS 방어 — escapeHtml이 모든 위험 문자를 이스케이프하는지 검증
// Found by /qa on 2026-04-06
import { describe, it, expect } from "vitest";
import { escapeHtml } from "@/lib/html-escape";

describe("escapeHtml", () => {
  it("XSS 스크립트 태그를 이스케이프한다", () => {
    const input = '"><script>alert(1)</script>';
    const result = escapeHtml(input);
    expect(result).not.toContain("<script>");
    expect(result).toBe("&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("앰퍼샌드를 이스케이프한다", () => {
    expect(escapeHtml("a&b")).toBe("a&amp;b");
  });

  it("꺾쇠괄호를 이스케이프한다", () => {
    expect(escapeHtml("<div>")).toBe("&lt;div&gt;");
  });

  it("큰따옴표를 이스케이프한다", () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
  });

  it("작은따옴표를 이스케이프한다", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("한글은 변환하지 않는다", () => {
    expect(escapeHtml("좌표를 찾을 수 없습니다")).toBe(
      "좌표를 찾을 수 없습니다"
    );
  });

  it("빈 문자열을 처리한다", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("모든 위험 문자가 포함된 복합 입력을 처리한다", () => {
    const input = `<img src="x" onerror='alert(1)' & more>`;
    const result = escapeHtml(input);
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
    expect(result).not.toContain('"');
    expect(result).not.toContain("'");
  });
});
