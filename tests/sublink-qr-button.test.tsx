// @vitest-environment jsdom
/**
 * SublinkQRButton tests — 공개 프로필 페이지에서 서브링크 옆에 붙는 QR 버튼.
 * 재사용하는 SublinkDetailModal 자체는 sublink-detail-modal.test.tsx에서 커버됨.
 * 여기서는 trigger + wiring만 검증한다 (모달 렌더/미렌더, refresh 미노출 등).
 */
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { SublinkQRButton } from "@/components/sublink-qr-button";

// SublinkDetailModal 내부의 qrcode lazy import를 mocked.
vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mocked"),
  },
}));

describe("SublinkQRButton", () => {
  const baseProps = {
    slug: "노션",
    targetUrl: "https://www.notion.so/page",
    namespaceName: "fadak",
  };

  it("renders the trigger button with an accessible label referencing the slug", () => {
    const { container } = render(<SublinkQRButton {...baseProps} />);
    const btn = container.querySelector('[data-testid="sublink-qr-button"]');
    expect(btn).not.toBeNull();
    expect(btn?.getAttribute("aria-label")).toContain("노션");
    expect(btn?.getAttribute("aria-label")).toMatch(/QR/i);
  });

  it("modal is NOT rendered before the button is clicked", () => {
    const { container } = render(<SublinkQRButton {...baseProps} />);
    expect(
      container.querySelector('[data-testid="sublink-detail-modal"]'),
    ).toBeNull();
  });

  it("clicking the button opens the modal", () => {
    const { container } = render(<SublinkQRButton {...baseProps} />);
    const btn = container.querySelector(
      '[data-testid="sublink-qr-button"]',
    ) as HTMLButtonElement;
    fireEvent.click(btn);
    expect(
      container.querySelector('[data-testid="sublink-detail-modal"]'),
    ).not.toBeNull();
  });

  it("modal shows the full 좌표.to URL for the sublink", () => {
    const { container } = render(<SublinkQRButton {...baseProps} />);
    fireEvent.click(
      container.querySelector('[data-testid="sublink-qr-button"]')!,
    );
    const url = container.querySelector('[data-testid="sublink-modal-url"]');
    expect(url?.textContent).toContain("좌표.to/fadak/노션");
  });

  it("does NOT render the refresh-og button (visitor-facing: no refresh permission)", () => {
    const { container } = render(<SublinkQRButton {...baseProps} />);
    fireEvent.click(
      container.querySelector('[data-testid="sublink-qr-button"]')!,
    );
    expect(
      container.querySelector('[data-testid="sublink-modal-refresh"]'),
    ).toBeNull();
  });

  it("does NOT render og_fetch_error to visitors (internal leak guard)", () => {
    // SublinkQRButton always passes og_fetch_error=null to the modal, so even
    // if the owner's fetch failed, visitors never see the raw error tag.
    const { container } = render(
      <SublinkQRButton {...baseProps} ogTitle="제목" />,
    );
    fireEvent.click(
      container.querySelector('[data-testid="sublink-qr-button"]')!,
    );
    expect(
      container.querySelector('[data-testid="sublink-modal-og-error"]'),
    ).toBeNull();
  });

  it("passes og_title/og_description/og_image through to the modal when provided", () => {
    const { container } = render(
      <SublinkQRButton
        {...baseProps}
        ogTitle="노션 강의자료"
        ogDescription="수업 참고 링크입니다"
        ogImage="https://example.com/og.png"
      />,
    );
    fireEvent.click(
      container.querySelector('[data-testid="sublink-qr-button"]')!,
    );
    const og = container.querySelector('[data-testid="sublink-modal-og"]');
    expect(og).not.toBeNull();
    expect(og?.textContent).toContain("노션 강의자료");
    expect(og?.textContent).toContain("수업 참고 링크입니다");
  });

  it("does NOT use rounded-full on the trigger (AI slop regression guard)", () => {
    const { container } = render(<SublinkQRButton {...baseProps} />);
    const btn = container.querySelector('[data-testid="sublink-qr-button"]');
    expect(btn?.className).not.toContain("rounded-full");
  });

  it("trigger is type=button (prevents accidental form submission)", () => {
    const { container } = render(<SublinkQRButton {...baseProps} />);
    const btn = container.querySelector('[data-testid="sublink-qr-button"]');
    expect(btn?.getAttribute("type")).toBe("button");
  });
});
