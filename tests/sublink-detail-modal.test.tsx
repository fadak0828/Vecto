// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import {
  SublinkDetailModal,
  type SublinkDetailModalLink,
} from "@/components/sublink-detail-modal";

// Mock qrcode — homepage 패턴과 동일하게 default export 사용.
const toDataURLMock = vi.fn().mockResolvedValue("data:image/png;base64,mocked");
vi.mock("qrcode", () => ({
  default: { toDataURL: toDataURLMock },
}));

function baseLink(overrides: Partial<SublinkDetailModalLink> = {}): SublinkDetailModalLink {
  return {
    id: "slug-1",
    slug: "노션",
    target_url: "https://www.notion.so/page",
    og_title: null,
    og_description: null,
    og_image: null,
    og_fetch_error: null,
    ...overrides,
  };
}

// navigator.clipboard mock (jsdom에 기본 구현 없음)
const writeTextMock = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(globalThis.navigator, "clipboard", {
  value: { writeText: writeTextMock },
  configurable: true,
});

beforeEach(() => {
  toDataURLMock.mockClear();
  writeTextMock.mockClear();
});

describe("SublinkDetailModal", () => {
  it("does NOT render when open=false", () => {
    const { container } = render(
      <SublinkDetailModal
        open={false}
        onClose={() => {}}
        link={baseLink()}
        namespaceName="fadak"
      />
    );
    expect(container.querySelector('[data-testid="sublink-detail-modal"]')).toBeNull();
  });

  it("renders when open=true", () => {
    const { container } = render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink()}
        namespaceName="fadak"
      />
    );
    expect(container.querySelector('[data-testid="sublink-detail-modal"]')).not.toBeNull();
  });

  it("displays the full 좌표.to URL prominently", () => {
    const { getByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink({ slug: "노션" })}
        namespaceName="fadak"
      />
    );
    expect(getByTestId("sublink-modal-url").textContent).toBe("좌표.to/fadak/노션");
  });

  it("calls qrcode.toDataURL with the full URL and homepage options", async () => {
    render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink({ slug: "노션" })}
        namespaceName="fadak"
      />
    );
    await waitFor(() => expect(toDataURLMock).toHaveBeenCalled());
    const [url, opts] = toDataURLMock.mock.calls[0];
    expect(url).toBe("https://좌표.to/fadak/노션");
    expect(opts).toMatchObject({
      margin: 1,
      width: 480,
      color: { dark: "#1a1c1c", light: "#00000000" },
    });
  });

  it("renders QR image after toDataURL resolves", async () => {
    const { findByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink()}
        namespaceName="fadak"
      />
    );
    const img = (await findByTestId("sublink-modal-qr")) as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("data:image/png;base64,mocked");
  });

  it("copy button writes the URL to clipboard", async () => {
    const { getByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink({ slug: "노션" })}
        namespaceName="fadak"
      />
    );
    fireEvent.click(getByTestId("sublink-modal-copy"));
    await waitFor(() => expect(writeTextMock).toHaveBeenCalledOnce());
    expect(writeTextMock).toHaveBeenCalledWith("https://좌표.to/fadak/노션");
  });

  it("copy button shows '복사됨' toast after click", async () => {
    const { getByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink()}
        namespaceName="fadak"
      />
    );
    const btn = getByTestId("sublink-modal-copy");
    expect(btn.textContent).toBe("URL 복사");
    fireEvent.click(btn);
    await waitFor(() => expect(btn.textContent).toBe("복사됨"));
  });

  it("ESC key calls onClose", () => {
    const onClose = vi.fn();
    render(
      <SublinkDetailModal
        open={true}
        onClose={onClose}
        link={baseLink()}
        namespaceName="fadak"
      />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("background click calls onClose", () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={onClose}
        link={baseLink()}
        namespaceName="fadak"
      />
    );
    fireEvent.click(getByTestId("sublink-detail-modal"));
    expect(onClose).toHaveBeenCalled();
  });

  it("click inside card does NOT call onClose (stopPropagation)", () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={onClose}
        link={baseLink()}
        namespaceName="fadak"
      />
    );
    fireEvent.click(getByTestId("sublink-detail-card"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("'다시 가져오기' button shown when onRefreshOG provided", () => {
    const { getByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink({ og_fetch_error: "timeout" })}
        namespaceName="fadak"
        onRefreshOG={vi.fn().mockResolvedValue(undefined)}
      />
    );
    expect(getByTestId("sublink-modal-refresh")).toBeTruthy();
  });

  it("'다시 가져오기' calls onRefreshOG with link.id", async () => {
    const onRefreshOG = vi.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink({ id: "abc-123" })}
        namespaceName="fadak"
        onRefreshOG={onRefreshOG}
      />
    );
    await act(async () => {
      fireEvent.click(getByTestId("sublink-modal-refresh"));
    });
    expect(onRefreshOG).toHaveBeenCalledWith("abc-123");
  });

  it("og_description IS shown in modal (unlike the card)", () => {
    const description = "이것은 설명입니다";
    const { getByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink({ og_description: description })}
        namespaceName="fadak"
      />
    );
    expect(getByTestId("sublink-modal-og-description").textContent).toBe(description);
  });

  it("og_fetch_error shows error message", () => {
    const { getByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink({ og_fetch_error: "timeout" })}
        namespaceName="fadak"
      />
    );
    expect(getByTestId("sublink-modal-og-error").textContent).toContain("timeout");
  });

  it("focus returns to close button on open", async () => {
    const { getByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink()}
        namespaceName="fadak"
      />
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(getByTestId("sublink-modal-close"))
    );
  });
});
